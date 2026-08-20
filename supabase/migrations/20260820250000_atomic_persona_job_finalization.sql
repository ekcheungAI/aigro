-- Persona evaluation persistence and job completion are one lease-scoped
-- transaction. The database revalidates the pinned corpus and exact evaluation
-- snapshot immediately before accepting provider output.
create or replace function public.complete_persona_synthesis_job(
  p_job_id uuid,
  p_worker_id text,
  p_generator_model text,
  p_evaluator_model text,
  p_probe_responses jsonb,
  p_score integer,
  p_evaluation_status text,
  p_evaluation_set_hash text,
  p_output_blueprint jsonb,
  p_evidence_manifest jsonb,
  p_fidelity_report jsonb,
  p_fidelity_score integer,
  p_fidelity_status text,
  p_model text
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  job_row public.persona_synthesis_jobs%rowtype;
  evaluation_snapshot jsonb;
  evaluation_questions jsonb;
  evaluation_count integer;
  authoritative_question_ids jsonb;
  authoritative_report jsonb;
  finalized_run_id uuid;
  blueprint_hash text;
begin
  if nullif(btrim(coalesce(p_worker_id, '')), '') is null then
    raise exception 'invalid_persona_completion_request' using errcode = '22023';
  end if;

  select * into job_row
  from public.persona_synthesis_jobs
  where id = p_job_id
  for update;

  if not found
     or job_row.status <> 'processing'
     or job_row.locked_by is distinct from left(p_worker_id, 120) then
    return false;
  end if;

  if exists (
    select 1
    from public.persona_evaluation_runs r
    where r.synthesis_job_id = job_row.id
  ) then
    raise exception 'persona_evaluation_history_ambiguous' using errcode = '23514';
  end if;

  -- Serialize completion against rights revocation. Both paths lock the source
  -- row, so a revocation cannot commit between validation and finalization.
  perform 1
  from public.knowledge_revisions kr
  join public.knowledge_sources ks on ks.id = kr.source_id
  where kr.id = any(job_row.source_revision_ids)
  order by ks.id, kr.id
  for update of ks, kr;

  if cardinality(job_row.source_revision_ids) < 2
     or (
       select count(distinct requested_revision_id)
       from unnest(job_row.source_revision_ids) requested_revision_id
     ) <> cardinality(job_row.source_revision_ids)
     or exists (
       select 1
       from unnest(job_row.source_revision_ids) requested_revision_id
       where not exists (
         select 1
         from public.knowledge_revisions kr
         join public.knowledge_sources ks on ks.id = kr.source_id
         where kr.id = requested_revision_id
           and ks.expert_id = job_row.expert_id
           and ks.published_revision_id = kr.id
           and ks.archived_at is null
           and kr.status = 'approved'
           and kr.approved_by is not null
           and kr.approved_at is not null
           and ks.rights_status = 'granted'
           and ks.revoked_at is null
           and (ks.expires_at is null or ks.expires_at > now())
           and ks.rights_scope -> 'persona_synthesis' is not distinct from 'true'::jsonb
           and exists (
             select 1
             from public.knowledge_chunks kc
             where kc.revision_id = kr.id
               and kc.expert_id = ks.expert_id
               and kc.embedding is not null
           )
       )
     ) then
    raise exception 'persona_source_snapshot_not_authorized' using errcode = '23514';
  end if;

  evaluation_snapshot := public.get_persona_evaluation_set_snapshot(job_row.expert_id);
  evaluation_questions := evaluation_snapshot -> 'questions';
  evaluation_count := coalesce((evaluation_snapshot ->> 'question_count')::integer, 0);

  if evaluation_count not between 25 and 50
     or jsonb_typeof(evaluation_questions) <> 'array'
     or exists (
       select 1
       from jsonb_array_elements(evaluation_questions) question
       where jsonb_typeof(question -> 'expected') <> 'object'
          or question -> 'expected' = '{}'::jsonb
          or jsonb_typeof(question -> 'source_revision_ids') <> 'array'
          or jsonb_array_length(question -> 'source_revision_ids') = 0
          or exists (
            select 1
            from jsonb_array_elements_text(question -> 'source_revision_ids') revision_id
            where not (revision_id::uuid = any(job_row.source_revision_ids))
          )
     ) then
    raise exception 'persona_evaluation_set_invalid' using errcode = '23514';
  end if;

  if p_evaluation_set_hash is distinct from evaluation_snapshot ->> 'hash' then
    raise exception 'persona_evaluation_set_changed' using errcode = '23514';
  end if;

  if p_score not between 0 and 100
     or p_fidelity_score is distinct from p_score
     or p_evaluation_status not in ('passed', 'failed')
     or p_fidelity_status not in ('passed', 'failed')
     or p_fidelity_status is distinct from p_evaluation_status
     or nullif(btrim(coalesce(p_generator_model, '')), '') is null
     or nullif(btrim(coalesce(p_evaluator_model, '')), '') is null
     or nullif(btrim(coalesce(p_model, '')), '') is null
     or jsonb_typeof(p_output_blueprint) is distinct from 'object'
     or p_output_blueprint = '{}'::jsonb
     or jsonb_typeof(p_evidence_manifest) is distinct from 'object'
     or jsonb_typeof(p_fidelity_report) is distinct from 'object'
     or jsonb_typeof(p_probe_responses) is distinct from 'array'
     or jsonb_array_length(p_probe_responses) <> evaluation_count
     or exists (
       select 1
       from jsonb_array_elements(p_probe_responses) response
       where jsonb_typeof(response) <> 'object'
          or nullif(btrim(response ->> 'question_id'), '') is null
          or nullif(btrim(response ->> 'answer'), '') is null
          or not exists (
            select 1
            from jsonb_array_elements(evaluation_questions) question
            where question ->> 'id' = response ->> 'question_id'
          )
     )
     or (
       select count(distinct response ->> 'question_id')
       from jsonb_array_elements(p_probe_responses) response
     ) <> evaluation_count then
    raise exception 'invalid_persona_completion_payload' using errcode = '22023';
  end if;

  select jsonb_agg(question ->> 'id' order by question ->> 'id')
  into authoritative_question_ids
  from jsonb_array_elements(evaluation_questions) question;

  authoritative_report := (p_fidelity_report - 'evaluation') || jsonb_build_object(
    'evaluation', jsonb_build_object(
      'question_count', evaluation_count,
      'question_ids', authoritative_question_ids,
      'response_count', jsonb_array_length(p_probe_responses),
      'evaluation_set_hash', p_evaluation_set_hash
    )
  );
  blueprint_hash := encode(
    extensions.digest(convert_to(p_output_blueprint::text, 'UTF8'), 'sha256'),
    'hex'
  );

  insert into public.persona_evaluation_runs (
    synthesis_job_id,
    generator_model,
    evaluator_model,
    probe_responses,
    score,
    status,
    report,
    evaluation_set_hash,
    output_blueprint_hash
  ) values (
    job_row.id,
    left(btrim(p_generator_model), 200),
    left(btrim(p_evaluator_model), 200),
    p_probe_responses,
    p_score,
    p_evaluation_status,
    authoritative_report,
    p_evaluation_set_hash,
    blueprint_hash
  ) returning id into finalized_run_id;

  update public.persona_synthesis_jobs
  set status = 'review',
      output_blueprint = p_output_blueprint,
      evidence_manifest = p_evidence_manifest,
      fidelity_report = authoritative_report,
      fidelity_score = p_fidelity_score,
      fidelity_status = p_fidelity_status,
      model = left(btrim(p_model), 200),
      locked_at = null,
      locked_by = null,
      error_message = null,
      finalized_evaluation_run_id = finalized_run_id,
      updated_at = now()
  where id = job_row.id;

  return true;
end;
$$;

create or replace function public.fail_persona_synthesis_job(
  p_job_id uuid,
  p_worker_id text,
  p_error_message text,
  p_retry boolean,
  p_next_retry_at timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  job_row public.persona_synthesis_jobs%rowtype;
  safe_error text := left(
    coalesce(nullif(btrim(p_error_message), ''), 'persona_synthesis_failed'),
    1000
  );
begin
  if nullif(btrim(coalesce(p_worker_id, '')), '') is null
     or p_retry is null then
    raise exception 'invalid_persona_failure_request' using errcode = '22023';
  end if;

  select * into job_row
  from public.persona_synthesis_jobs
  where id = p_job_id
  for update;

  if not found
     or job_row.status <> 'processing'
     or job_row.locked_by is distinct from left(p_worker_id, 120) then
    return false;
  end if;

  update public.persona_synthesis_jobs
  set status = case when p_retry then 'retry' else 'failed' end,
      next_retry_at = case
        when p_retry then greatest(
          coalesce(p_next_retry_at, now() + interval '1 minute'),
          now()
        )
        else next_retry_at
      end,
      locked_at = null,
      locked_by = null,
      error_message = safe_error,
      updated_at = now()
  where id = job_row.id;

  return true;
end;
$$;

revoke all on function public.complete_persona_synthesis_job(
  uuid, text, text, text, jsonb, integer, text, text,
  jsonb, jsonb, jsonb, integer, text, text
) from public, anon, authenticated;
grant execute on function public.complete_persona_synthesis_job(
  uuid, text, text, text, jsonb, integer, text, text,
  jsonb, jsonb, jsonb, integer, text, text
) to service_role;

revoke all on function public.fail_persona_synthesis_job(
  uuid, text, text, boolean, timestamptz
) from public, anon, authenticated;
grant execute on function public.fail_persona_synthesis_job(
  uuid, text, text, boolean, timestamptz
) to service_role;

-- Human persona review is an auditable decision, not a status-only toggle.
create or replace function public.review_persona_synthesis(
  p_job_id uuid,
  p_decision text,
  p_notes text default '',
  p_override_fidelity boolean default false
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  job public.persona_synthesis_jobs%rowtype;
  next_status text;
  normalized_notes text := btrim(coalesce(p_notes, ''));
  current_evaluation_hash text;
begin
  select * into job
  from public.persona_synthesis_jobs
  where id = p_job_id
  for update;

  if not found or not public.owns_expert(job.expert_id) then
    raise exception 'not_allowed';
  end if;
  if job.status <> 'review' then
    raise exception 'persona_job_not_in_review';
  end if;
  if p_decision not in ('approve', 'reject') then
    raise exception 'invalid_decision';
  end if;
  if char_length(normalized_notes) < 5 then
    raise exception 'persona_review_notes_required' using errcode = '22023';
  end if;

  if p_decision = 'approve' then
    current_evaluation_hash := public.get_persona_evaluation_set_snapshot(job.expert_id) ->> 'hash';
    if job.finalized_evaluation_run_id is null
       or (select count(*) from public.persona_evaluation_runs r where r.synthesis_job_id = job.id) <> 1
       or not exists (
         select 1
         from public.persona_evaluation_runs r
         where r.id = job.finalized_evaluation_run_id
           and r.synthesis_job_id = job.id
           and r.score = job.fidelity_score
           and r.status = case
             when job.fidelity_status = 'passed' then 'passed'
             else 'failed'
           end
           and r.evaluation_set_hash = current_evaluation_hash
           and r.output_blueprint_hash = encode(
             extensions.digest(convert_to(job.output_blueprint::text, 'UTF8'), 'sha256'),
             'hex'
           )
    ) then
      raise exception 'persona_evaluation_not_current' using errcode = '23514';
    end if;

    -- Keep the human decision linearizable with rights revocation too.
    perform 1
    from public.knowledge_revisions kr
    join public.knowledge_sources ks on ks.id = kr.source_id
    where kr.id = any(job.source_revision_ids)
    order by ks.id, kr.id
    for update of ks, kr;

    if cardinality(job.source_revision_ids) < 2
       or exists (
         select 1
         from unnest(job.source_revision_ids) requested_revision_id
         where not exists (
           select 1
           from public.knowledge_revisions kr
           join public.knowledge_sources ks on ks.id = kr.source_id
           where kr.id = requested_revision_id
             and ks.expert_id = job.expert_id
             and ks.published_revision_id = kr.id
             and ks.archived_at is null
             and kr.status = 'approved'
             and kr.approved_by is not null
             and kr.approved_at is not null
             and ks.rights_status = 'granted'
             and ks.revoked_at is null
             and (ks.expires_at is null or ks.expires_at > now())
             and ks.rights_scope -> 'persona_synthesis' is not distinct from 'true'::jsonb
             and exists (
               select 1
               from public.knowledge_chunks kc
               where kc.revision_id = kr.id
                 and kc.expert_id = ks.expert_id
                 and kc.embedding is not null
             )
         )
       ) then
      raise exception 'persona_source_snapshot_not_authorized' using errcode = '23514';
    end if;

    if job.fidelity_status <> 'passed'
       and not (p_override_fidelity and public.is_admin()) then
      raise exception 'persona_fidelity_gate_failed';
    end if;
  end if;

  next_status := case when p_decision = 'approve' then 'approved' else 'rejected' end;
  update public.persona_synthesis_jobs
  set status = next_status,
      fidelity_status = case
        when p_decision = 'approve'
         and fidelity_status <> 'passed'
         and p_override_fidelity
         and public.is_admin()
        then 'overridden'
        else fidelity_status
      end,
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      review_notes = normalized_notes,
      updated_at = now()
  where id = p_job_id;

  insert into public.audit_events (
    actor_id, expert_id, action, entity_type, entity_id, metadata
  ) values (
    auth.uid(), job.expert_id, 'persona.synthesis_' || next_status,
    'persona_synthesis_job', p_job_id,
    jsonb_build_object(
      'notes', normalized_notes,
      'fidelity_override', p_override_fidelity and public.is_admin(),
      'admin_on_behalf', public.is_admin(),
      'finalized_evaluation_run_id', job.finalized_evaluation_run_id
    )
  );
end;
$$;

revoke all on function public.review_persona_synthesis(uuid, text, text, boolean)
from public, anon;
grant execute on function public.review_persona_synthesis(uuid, text, text, boolean)
to authenticated;

create or replace function public.enforce_persona_publication_review()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if (new.status in ('approved', 'published') or new.persona_version_id is not null)
     and (
       new.reviewed_by is null
       or new.reviewed_at is null
       or char_length(btrim(coalesce(new.review_notes, ''))) < 5
     ) then
    raise exception 'persona_publication_requires_human_review';
  end if;
  return new;
end;
$$;

-- Rebind the existing release-hardening trigger so later edits cannot erase
-- the reviewer timestamp or notes without re-running the invariant.
drop trigger if exists persona_publication_requires_review
on public.persona_synthesis_jobs;
create trigger persona_publication_requires_review
before insert or update of status, persona_version_id, reviewed_by, reviewed_at, review_notes
on public.persona_synthesis_jobs
for each row execute function public.enforce_persona_publication_review();
