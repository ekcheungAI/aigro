-- AIGRO Persona Compiler
-- Adapts the evidence-led parts of Nuwa into an authorised, versioned instructor
-- workflow. Persona synthesis never bypasses published knowledge or human review.

alter table public.expert_persona_versions
  add column if not exists persona_blueprint jsonb not null default '{}'::jsonb,
  add column if not exists evidence_manifest jsonb not null default '{}'::jsonb,
  add column if not exists source_revision_ids uuid[] not null default '{}'::uuid[],
  add column if not exists research_cutoff_at timestamptz,
  add column if not exists fidelity_report jsonb not null default '{}'::jsonb,
  add column if not exists fidelity_score integer,
  add column if not exists fidelity_status text not null default 'not_run';

alter table public.expert_persona_versions
  drop constraint if exists expert_persona_versions_fidelity_score_check;
alter table public.expert_persona_versions
  add constraint expert_persona_versions_fidelity_score_check
  check (fidelity_score is null or fidelity_score between 0 and 100);
alter table public.expert_persona_versions
  drop constraint if exists expert_persona_versions_fidelity_status_check;
alter table public.expert_persona_versions
  add constraint expert_persona_versions_fidelity_status_check
  check (fidelity_status in ('not_run', 'passed', 'failed', 'overridden'));

create table if not exists public.persona_synthesis_jobs (
  id uuid primary key default gen_random_uuid(),
  expert_id uuid not null references public.experts(id) on delete cascade,
  source_revision_ids uuid[] not null,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'retry', 'review', 'approved', 'rejected', 'published', 'failed')),
  output_blueprint jsonb not null default '{}'::jsonb,
  evidence_manifest jsonb not null default '{}'::jsonb,
  fidelity_report jsonb not null default '{}'::jsonb,
  fidelity_score integer check (fidelity_score is null or fidelity_score between 0 and 100),
  fidelity_status text not null default 'not_run'
    check (fidelity_status in ('not_run', 'passed', 'failed', 'overridden')),
  model text,
  research_cutoff_at timestamptz not null default now(),
  attempts integer not null default 0 check (attempts between 0 and 3),
  next_retry_at timestamptz not null default now(),
  locked_at timestamptz,
  locked_by text,
  error_message text,
  created_by uuid references auth.users(id) on delete set null,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  review_notes text,
  persona_version_id uuid references public.expert_persona_versions(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists persona_synthesis_jobs_one_active_idx
on public.persona_synthesis_jobs(expert_id)
where status in ('pending', 'processing', 'retry', 'review', 'approved');

create index if not exists persona_synthesis_jobs_claim_idx
on public.persona_synthesis_jobs(status, next_retry_at, created_at);

create table if not exists public.persona_evaluation_questions (
  id uuid primary key default gen_random_uuid(),
  expert_id uuid not null references public.experts(id) on delete cascade,
  category text not null
    check (category in ('known_stance', 'edge_honesty', 'voice', 'source_transparency')),
  question text not null,
  expected jsonb not null default '{}'::jsonb,
  source_revision_ids uuid[] not null default '{}'::uuid[],
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.persona_evaluation_runs (
  id uuid primary key default gen_random_uuid(),
  synthesis_job_id uuid not null references public.persona_synthesis_jobs(id) on delete cascade,
  generator_model text not null,
  evaluator_model text not null,
  probe_responses jsonb not null default '[]'::jsonb,
  score integer not null check (score between 0 and 100),
  status text not null check (status in ('passed', 'failed')),
  report jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.queue_persona_synthesis(p_expert_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  revision_ids uuid[];
  job_id uuid;
begin
  if not public.owns_expert(p_expert_id) then raise exception 'not_allowed'; end if;

  perform 1 from public.experts where id = p_expert_id for update;
  if exists (
    select 1 from public.persona_synthesis_jobs
    where expert_id = p_expert_id
      and status in ('pending', 'processing', 'retry', 'review', 'approved')
  ) then
    raise exception 'persona_synthesis_already_active';
  end if;

  select array_agg(kr.id order by kr.approved_at nulls last, kr.created_at)
  into revision_ids
  from public.knowledge_sources ks
  join public.knowledge_revisions kr on kr.id = ks.published_revision_id
  where ks.expert_id = p_expert_id
    and ks.archived_at is null
    and kr.status = 'approved';

  if coalesce(cardinality(revision_ids), 0) < 2 then
    raise exception 'persona_needs_two_published_sources';
  end if;

  insert into public.persona_synthesis_jobs (
    expert_id, source_revision_ids, created_by, research_cutoff_at
  ) values (p_expert_id, revision_ids, auth.uid(), now())
  returning id into job_id;

  insert into public.audit_events (actor_id, expert_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), p_expert_id, 'persona.synthesis_queued', 'persona_synthesis_job', job_id,
    jsonb_build_object('source_revision_ids', revision_ids));
  return job_id;
end;
$$;

create or replace function public.review_persona_synthesis(
  p_job_id uuid,
  p_decision text,
  p_notes text default '',
  p_override_fidelity boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  job public.persona_synthesis_jobs%rowtype;
  next_status text;
begin
  select * into job from public.persona_synthesis_jobs where id = p_job_id for update;
  if not found or not public.owns_expert(job.expert_id) then raise exception 'not_allowed'; end if;
  if job.status <> 'review' then raise exception 'persona_job_not_in_review'; end if;
  if p_decision not in ('approve', 'reject') then raise exception 'invalid_decision'; end if;
  if p_decision = 'approve' and job.fidelity_status <> 'passed' then
    if not (p_override_fidelity and public.is_admin()) then
      raise exception 'persona_fidelity_gate_failed';
    end if;
    update public.persona_synthesis_jobs set fidelity_status = 'overridden' where id = p_job_id;
  end if;

  next_status := case when p_decision = 'approve' then 'approved' else 'rejected' end;
  update public.persona_synthesis_jobs
  set status = next_status, reviewed_by = auth.uid(), reviewed_at = now(),
      review_notes = nullif(trim(p_notes), ''), updated_at = now()
  where id = p_job_id;

  insert into public.audit_events (actor_id, expert_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), job.expert_id, 'persona.synthesis_' || next_status,
    'persona_synthesis_job', p_job_id,
    jsonb_build_object('notes', p_notes, 'fidelity_override', p_override_fidelity and public.is_admin(),
      'admin_on_behalf', public.is_admin()));
end;
$$;

create or replace function public.publish_compiled_persona(
  p_job_id uuid,
  p_greeting text,
  p_sample_dialogues jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  job public.persona_synthesis_jobs%rowtype;
  next_version integer;
  persona_id uuid;
  blueprint jsonb;
begin
  select * into job from public.persona_synthesis_jobs where id = p_job_id for update;
  if not found or not public.owns_expert(job.expert_id) then raise exception 'not_allowed'; end if;
  if job.status <> 'approved' then raise exception 'persona_synthesis_not_approved'; end if;
  if job.fidelity_status not in ('passed', 'overridden') then raise exception 'persona_fidelity_gate_failed'; end if;
  if job.output_blueprint = '{}'::jsonb then raise exception 'persona_blueprint_empty'; end if;

  blueprint := job.output_blueprint;
  perform 1 from public.experts where id = job.expert_id for update;
  select coalesce(max(version), 0) + 1 into next_version
  from public.expert_persona_versions where expert_id = job.expert_id;

  update public.expert_persona_versions set status = 'retired'
  where expert_id = job.expert_id and status = 'published';

  insert into public.expert_persona_versions (
    expert_id, version, greeting, voice_rules, boundaries, sample_dialogues,
    persona_blueprint, evidence_manifest, source_revision_ids, research_cutoff_at,
    fidelity_report, fidelity_score, fidelity_status,
    status, created_by, approved_by, published_at
  ) values (
    job.expert_id, next_version, trim(coalesce(p_greeting, '')),
    coalesce(blueprint->'expression_dna', '{}'::jsonb),
    coalesce(blueprint->'honest_boundaries', '[]'::jsonb),
    coalesce(p_sample_dialogues, '[]'::jsonb),
    blueprint, job.evidence_manifest, job.source_revision_ids, job.research_cutoff_at,
    job.fidelity_report, job.fidelity_score, job.fidelity_status,
    'published', job.created_by, auth.uid(), now()
  ) returning id into persona_id;

  update public.experts
  set published_persona_version_id = persona_id,
      feature_flags = feature_flags || '{"persona_compiler_enabled":true}'::jsonb
  where id = job.expert_id;
  update public.persona_synthesis_jobs
  set status = 'published', persona_version_id = persona_id, updated_at = now()
  where id = p_job_id;

  insert into public.audit_events (actor_id, expert_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), job.expert_id, 'persona.compiled_published', 'expert_persona_version', persona_id,
    jsonb_build_object('version', next_version, 'synthesis_job_id', p_job_id,
      'fidelity_score', job.fidelity_score, 'fidelity_status', job.fidelity_status,
      'admin_on_behalf', public.is_admin()));
  return persona_id;
end;
$$;

create or replace function public.claim_persona_synthesis_jobs(
  p_worker_id text,
  p_limit integer default 1
)
returns setof public.persona_synthesis_jobs
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with picked as (
    select id from public.persona_synthesis_jobs
    where status in ('pending', 'retry')
      and attempts < 3 and next_retry_at <= now()
    order by created_at
    for update skip locked
    limit least(greatest(p_limit, 1), 3)
  )
  update public.persona_synthesis_jobs j
  set status = 'processing', attempts = attempts + 1,
      locked_at = now(), locked_by = p_worker_id, updated_at = now()
  from picked where j.id = picked.id
  returning j.*;
end;
$$;

create or replace function public.requeue_stuck_persona_synthesis_jobs()
returns void
language sql
security definer
set search_path = public
as $$
  update public.persona_synthesis_jobs
  set status = case when attempts >= 3 then 'failed' else 'retry' end,
      next_retry_at = now(), locked_at = null, locked_by = null,
      error_message = coalesce(error_message, 'Worker lease expired'), updated_at = now()
  where status = 'processing' and locked_at < now() - interval '20 minutes';
$$;

create or replace function public.invoke_persona_compiler()
returns bigint
language plpgsql
security definer
set search_path = public, vault, net
as $$
declare
  project_url text;
  worker_secret text;
  request_id bigint;
begin
  select decrypted_secret into project_url
  from vault.decrypted_secrets where name = 'project_url' limit 1;
  select decrypted_secret into worker_secret
  from vault.decrypted_secrets where name = 'persona_compiler_secret' limit 1;
  if project_url is null or worker_secret is null then return null; end if;
  select net.http_post(
    url := rtrim(project_url, '/') || '/functions/v1/persona-compiler',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-worker-secret', worker_secret),
    body := '{}'::jsonb
  ) into request_id;
  return request_id;
end;
$$;

create or replace function public.notify_persona_compiler()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.invoke_persona_compiler();
  return null;
end;
$$;

alter table public.persona_synthesis_jobs enable row level security;
alter table public.persona_evaluation_questions enable row level security;
alter table public.persona_evaluation_runs enable row level security;

create policy "persona_synthesis_owner_read" on public.persona_synthesis_jobs
for select to authenticated using (public.owns_expert(expert_id));
create policy "persona_evaluation_questions_owner_all" on public.persona_evaluation_questions
for all to authenticated using (public.owns_expert(expert_id)) with check (public.owns_expert(expert_id));
create policy "persona_evaluation_runs_owner_read" on public.persona_evaluation_runs
for select to authenticated using (exists (
  select 1 from public.persona_synthesis_jobs j
  where j.id = synthesis_job_id and public.owns_expert(j.expert_id)
));

grant execute on function public.queue_persona_synthesis(uuid) to authenticated;
grant execute on function public.review_persona_synthesis(uuid, text, text, boolean) to authenticated;
grant execute on function public.publish_compiled_persona(uuid, text, jsonb) to authenticated;
revoke execute on function public.publish_persona_version(uuid, text, jsonb, jsonb, jsonb)
from public, anon, authenticated;

revoke all on function public.claim_persona_synthesis_jobs(text, integer) from public, anon, authenticated;
grant execute on function public.claim_persona_synthesis_jobs(text, integer) to service_role;
revoke all on function public.requeue_stuck_persona_synthesis_jobs() from public, anon, authenticated;
grant execute on function public.requeue_stuck_persona_synthesis_jobs() to service_role;
revoke all on function public.invoke_persona_compiler() from public, anon, authenticated;
grant execute on function public.invoke_persona_compiler() to service_role;

drop trigger if exists persona_synthesis_jobs_touch on public.persona_synthesis_jobs;
create trigger persona_synthesis_jobs_touch before update on public.persona_synthesis_jobs
for each row execute function public.touch_updated_at();
drop trigger if exists persona_evaluation_questions_touch on public.persona_evaluation_questions;
create trigger persona_evaluation_questions_touch before update on public.persona_evaluation_questions
for each row execute function public.touch_updated_at();
drop trigger if exists persona_synthesis_jobs_invoke_worker on public.persona_synthesis_jobs;
create trigger persona_synthesis_jobs_invoke_worker
after insert on public.persona_synthesis_jobs
for each statement execute function public.notify_persona_compiler();

do $$
begin
  perform cron.unschedule(jobid) from cron.job
  where jobname in ('aigro-run-persona-compiler', 'aigro-requeue-stuck-persona-synthesis');
  perform cron.schedule(
    'aigro-run-persona-compiler', '* * * * *', 'select public.invoke_persona_compiler()'
  );
  perform cron.schedule(
    'aigro-requeue-stuck-persona-synthesis', '* * * * *',
    'select public.requeue_stuck_persona_synthesis_jobs()'
  );
end $$;
