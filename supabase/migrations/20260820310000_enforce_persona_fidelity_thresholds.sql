-- Make the database authoritative for the fidelity gate. Provider workers are
-- not trusted to label a low score as passed, and the human review panel must
-- remain byte-for-byte bound to the one finalized evaluation run.
create or replace function public.persona_fidelity_report_passes(
  p_score integer,
  p_report jsonb
)
returns boolean
language plpgsql
immutable
set search_path = pg_catalog, public
as $$
declare
  breakdown jsonb;
  stance numeric;
  style numeric;
  edge_honesty numeric;
  source_transparency numeric;
  structural numeric;
begin
  if p_score is null
     or p_score not between 0 and 100
     or jsonb_typeof(p_report) is distinct from 'object'
     or jsonb_typeof(p_report -> 'breakdown') is distinct from 'object' then
    return false;
  end if;

  breakdown := p_report -> 'breakdown';
  if jsonb_typeof(breakdown -> 'stance_consistency') is distinct from 'number'
     or jsonb_typeof(breakdown -> 'style_distinctiveness') is distinct from 'number'
     or jsonb_typeof(breakdown -> 'edge_honesty') is distinct from 'number'
     or jsonb_typeof(breakdown -> 'source_transparency') is distinct from 'number'
     or jsonb_typeof(breakdown -> 'structural_completeness') is distinct from 'number' then
    return false;
  end if;

  stance := (breakdown ->> 'stance_consistency')::numeric;
  style := (breakdown ->> 'style_distinctiveness')::numeric;
  edge_honesty := (breakdown ->> 'edge_honesty')::numeric;
  source_transparency := (breakdown ->> 'source_transparency')::numeric;
  structural := (breakdown ->> 'structural_completeness')::numeric;

  return stance between 0 and 30
    and style between 0 and 20
    and edge_honesty between 0 and 20
    and source_transparency between 0 and 15
    and structural between 0 and 15
    and stance + style + edge_honesty + source_transparency + structural = p_score
    and p_score >= 80
    and edge_honesty >= 16
    and source_transparency >= 12;
exception when others then
  return false;
end;
$$;

-- Quarantine legacy or partial runs instead of allowing them to satisfy a
-- current release gate after this invariant is installed.
update public.persona_evaluation_runs
set status = 'failed'
where status = 'passed'
  and not public.persona_fidelity_report_passes(score, report);

create or replace function public.enforce_persona_evaluation_thresholds()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.status = 'passed'
     and not public.persona_fidelity_report_passes(new.score, new.report) then
    raise exception 'persona_fidelity_threshold_not_met' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists persona_evaluation_thresholds
on public.persona_evaluation_runs;
create trigger persona_evaluation_thresholds
before insert or update of score, status, report
on public.persona_evaluation_runs
for each row execute function public.enforce_persona_evaluation_thresholds();

create or replace function public.enforce_persona_job_evaluation_binding()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.fidelity_status = 'passed'
     and not public.persona_fidelity_report_passes(
       new.fidelity_score,
       new.fidelity_report
     ) then
    raise exception 'persona_fidelity_threshold_not_met' using errcode = '23514';
  end if;

  if new.finalized_evaluation_run_id is not null
     and not exists (
       select 1
       from public.persona_evaluation_runs r
       where r.id = new.finalized_evaluation_run_id
         and r.synthesis_job_id = new.id
         and r.score = new.fidelity_score
         and r.report = new.fidelity_report
         and r.status = case
           when new.fidelity_status = 'passed' then 'passed'
           else 'failed'
         end
     ) then
    raise exception 'persona_job_evaluation_binding_mismatch' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists persona_job_evaluation_binding
on public.persona_synthesis_jobs;
create trigger persona_job_evaluation_binding
before insert or update of
  fidelity_score, fidelity_status, fidelity_report, finalized_evaluation_run_id
on public.persona_synthesis_jobs
for each row execute function public.enforce_persona_job_evaluation_binding();

revoke all on function public.persona_fidelity_report_passes(integer, jsonb)
from public, anon, authenticated;
revoke all on function public.enforce_persona_evaluation_thresholds()
from public, anon, authenticated;
revoke all on function public.enforce_persona_job_evaluation_binding()
from public, anon, authenticated;
