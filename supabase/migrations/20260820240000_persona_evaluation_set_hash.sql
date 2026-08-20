-- Version the full active evaluation contract, not only its row ids. Any
-- in-place edit to a prompt, criteria, evidence pins, category, or timestamp
-- changes the hash and invalidates an older pass.
alter table public.persona_evaluation_runs
  add column if not exists evaluation_set_hash text,
  add column if not exists output_blueprint_hash text;

alter table public.persona_evaluation_runs
  add constraint persona_evaluation_runs_set_hash_check
  check (
    evaluation_set_hash is null
    or evaluation_set_hash ~ '^[0-9a-f]{64}$'
  );

alter table public.persona_evaluation_runs
  add constraint persona_evaluation_runs_blueprint_hash_check
  check (
    output_blueprint_hash is null
    or output_blueprint_hash ~ '^[0-9a-f]{64}$'
  );

-- A job explicitly names the one evaluation that belongs to its finalized
-- output. Legacy rows (including jobs with multiple historical runs) remain
-- unbound and therefore fail the release gate until they are resynthesized.
alter table public.persona_synthesis_jobs
  add column if not exists finalized_evaluation_run_id uuid;

alter table public.persona_synthesis_jobs
  add constraint persona_synthesis_jobs_finalized_evaluation_run_fkey
  foreign key (finalized_evaluation_run_id)
  references public.persona_evaluation_runs(id)
  on delete restrict;

create unique index persona_synthesis_jobs_finalized_evaluation_run_idx
on public.persona_synthesis_jobs(finalized_evaluation_run_id)
where finalized_evaluation_run_id is not null;

create or replace function public.get_persona_evaluation_set_snapshot(
  p_expert_id uuid
)
returns jsonb
language plpgsql
security definer
stable
set search_path = pg_catalog, public, extensions
as $$
declare
  questions jsonb;
begin
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', q.id::text,
        'category', q.category,
        'question', q.question,
        'expected', q.expected,
        'source_revision_ids', (
          select coalesce(
            jsonb_agg(revision_id::text order by revision_id::text),
            '[]'::jsonb
          )
          from unnest(q.source_revision_ids) as revision_id
        ),
        'updated_at', to_char(
          q.updated_at at time zone 'UTC',
          'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'
        )
      )
      order by q.id::text
    ),
    '[]'::jsonb
  ) into questions
  from public.persona_evaluation_questions q
  where q.expert_id = p_expert_id
    and q.active;

  return jsonb_build_object(
    'hash', encode(
      extensions.digest(convert_to(questions::text, 'UTF8'), 'sha256'),
      'hex'
    ),
    'question_count', jsonb_array_length(questions),
    'questions', questions
  );
end;
$$;

revoke all on function public.get_persona_evaluation_set_snapshot(uuid)
from public, anon, authenticated;
grant execute on function public.get_persona_evaluation_set_snapshot(uuid)
to service_role;

create or replace function public.has_current_passed_persona_evaluation(
  p_expert_id uuid,
  p_persona_version_id uuid
)
returns boolean
language sql
security definer
stable
set search_path = pg_catalog, public
as $$
  with current_snapshot as (
    select public.get_persona_evaluation_set_snapshot(p_expert_id) as value
  )
  select exists (
    select 1
    from public.persona_synthesis_jobs j
    join public.persona_evaluation_runs r
      on r.id = j.finalized_evaluation_run_id
     and r.synthesis_job_id = j.id
    join public.expert_persona_versions epv
      on epv.id = j.persona_version_id
     and epv.id = p_persona_version_id
     and epv.expert_id = p_expert_id
    cross join current_snapshot snapshot
    where j.expert_id = p_expert_id
      and j.persona_version_id = p_persona_version_id
      and r.status = 'passed'
      and (
        select count(*)
        from public.persona_evaluation_runs all_runs
        where all_runs.synthesis_job_id = j.id
      ) = 1
      and r.evaluation_set_hash is not null
      and r.evaluation_set_hash = snapshot.value ->> 'hash'
      and r.output_blueprint_hash is not null
      and r.output_blueprint_hash = encode(
        extensions.digest(convert_to(j.output_blueprint::text, 'UTF8'), 'sha256'),
        'hex'
      )
      and r.output_blueprint_hash = encode(
        extensions.digest(convert_to(epv.persona_blueprint::text, 'UTF8'), 'sha256'),
        'hex'
      )
      and jsonb_typeof(r.report #> '{evaluation,question_ids}') = 'array'
      and jsonb_array_length(r.report #> '{evaluation,question_ids}') >= 25
      and (r.report #>> '{evaluation,question_count}')::integer
        = jsonb_array_length(r.report #> '{evaluation,question_ids}')
      and (r.report #>> '{evaluation,response_count}')::integer
        = jsonb_array_length(r.report #> '{evaluation,question_ids}')
      and jsonb_array_length(r.report #> '{evaluation,question_ids}')
        = (snapshot.value ->> 'question_count')::integer
      and not exists (
        select 1
        from public.persona_evaluation_questions q
        where q.expert_id = p_expert_id
          and q.active
          and not ((r.report #> '{evaluation,question_ids}') ? q.id::text)
      )
  );
$$;

revoke all on function public.has_current_passed_persona_evaluation(uuid, uuid)
from public, anon, authenticated;
grant execute on function public.has_current_passed_persona_evaluation(uuid, uuid)
to service_role;
