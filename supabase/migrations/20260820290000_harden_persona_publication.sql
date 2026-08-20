-- Publication is the final trust boundary. Revalidate the exact human-reviewed
-- corpus and authoritative evaluation after taking the same source locks used
-- by rights revocation, immediately before creating an immutable persona.
create or replace function public.publish_compiled_persona(
  p_job_id uuid,
  p_greeting text,
  p_sample_dialogues jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  job public.persona_synthesis_jobs%rowtype;
  next_version integer;
  persona_id uuid;
  blueprint jsonb;
  evaluation_snapshot jsonb;
  evaluation_count integer;
  blueprint_hash text;
begin
  select * into job
  from public.persona_synthesis_jobs
  where id = p_job_id
  for update;

  if not found or not public.owns_expert(job.expert_id) then
    raise exception 'not_allowed';
  end if;
  if job.status <> 'approved' then
    raise exception 'persona_synthesis_not_approved';
  end if;
  if job.reviewed_by is null
     or job.reviewed_at is null
     or char_length(btrim(coalesce(job.review_notes, ''))) < 5 then
    raise exception 'persona_publication_requires_human_review' using errcode = '23514';
  end if;
  if job.fidelity_status <> 'passed' then
    raise exception 'persona_fidelity_gate_failed' using errcode = '23514';
  end if;
  if jsonb_typeof(job.output_blueprint) is distinct from 'object'
     or job.output_blueprint = '{}'::jsonb then
    raise exception 'persona_blueprint_empty' using errcode = '23514';
  end if;
  if char_length(btrim(coalesce(p_greeting, ''))) < 5 then
    raise exception 'persona_greeting_required' using errcode = '22023';
  end if;
  if jsonb_typeof(coalesce(p_sample_dialogues, '[]'::jsonb)) is distinct from 'array' then
    raise exception 'persona_sample_dialogues_invalid' using errcode = '22023';
  end if;

  perform 1
  from public.experts
  where id = job.expert_id
  for update;

  -- Serialize publication against rights changes and reject any partial,
  -- unreviewed, unembedded, expired, or no-longer-published source snapshot.
  perform 1
  from public.knowledge_revisions kr
  join public.knowledge_sources ks on ks.id = kr.source_id
  where kr.id = any(job.source_revision_ids)
  order by ks.id, kr.id
  for update of ks, kr;

  if cardinality(job.source_revision_ids) < 2
     or (
       select count(distinct requested_revision_id)
       from unnest(job.source_revision_ids) requested_revision_id
     ) <> cardinality(job.source_revision_ids)
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
           and ks.rights_scope @> '{"commercial_rag":true,"distillation":true,"persona_synthesis":true}'::jsonb
           and exists (
             select 1
             from public.knowledge_chunks kc
             where kc.revision_id = kr.id
               and kc.expert_id = job.expert_id
               and kc.embedding is not null
           )
       )
     ) then
    raise exception 'persona_source_snapshot_not_authorized' using errcode = '23514';
  end if;

  evaluation_snapshot := public.get_persona_evaluation_set_snapshot(job.expert_id);
  evaluation_count := coalesce((evaluation_snapshot ->> 'question_count')::integer, 0);
  blueprint_hash := encode(
    extensions.digest(convert_to(job.output_blueprint::text, 'UTF8'), 'sha256'),
    'hex'
  );

  if evaluation_count not between 25 and 50
     or job.finalized_evaluation_run_id is null
     or (select count(*) from public.persona_evaluation_runs r where r.synthesis_job_id = job.id) <> 1
     or not exists (
       select 1
       from public.persona_evaluation_runs r
       where r.id = job.finalized_evaluation_run_id
         and r.synthesis_job_id = job.id
         and r.status = 'passed'
         and r.evaluation_set_hash = evaluation_snapshot ->> 'hash'
         and r.output_blueprint_hash = blueprint_hash
         and jsonb_typeof(r.report #> '{evaluation,question_ids}') = 'array'
         and jsonb_array_length(r.report #> '{evaluation,question_ids}') = evaluation_count
         and (r.report #>> '{evaluation,question_count}')::integer = evaluation_count
         and (r.report #>> '{evaluation,response_count}')::integer = evaluation_count
         and not exists (
           select 1
           from public.persona_evaluation_questions q
           where q.expert_id = job.expert_id
             and q.active
             and not ((r.report #> '{evaluation,question_ids}') ? q.id::text)
         )
     ) then
    raise exception 'persona_evaluation_not_current' using errcode = '23514';
  end if;

  blueprint := job.output_blueprint;
  select coalesce(max(version), 0) + 1 into next_version
  from public.expert_persona_versions
  where expert_id = job.expert_id;

  update public.expert_persona_versions
  set status = 'retired'
  where expert_id = job.expert_id
    and status = 'published';

  insert into public.expert_persona_versions (
    expert_id, version, greeting, voice_rules, boundaries, sample_dialogues,
    persona_blueprint, evidence_manifest, source_revision_ids, research_cutoff_at,
    fidelity_report, fidelity_score, fidelity_status,
    status, created_by, approved_by, published_at
  ) values (
    job.expert_id, next_version, btrim(p_greeting),
    coalesce(blueprint -> 'expression_dna', '{}'::jsonb),
    coalesce(blueprint -> 'honest_boundaries', '[]'::jsonb),
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
  set status = 'published',
      persona_version_id = persona_id,
      updated_at = now()
  where id = job.id;

  insert into public.audit_events (
    actor_id, expert_id, action, entity_type, entity_id, metadata
  ) values (
    auth.uid(), job.expert_id, 'persona.compiled_published',
    'expert_persona_version', persona_id,
    jsonb_build_object(
      'version', next_version,
      'synthesis_job_id', job.id,
      'fidelity_score', job.fidelity_score,
      'fidelity_status', job.fidelity_status,
      'evaluation_run_id', job.finalized_evaluation_run_id,
      'evaluation_set_hash', evaluation_snapshot ->> 'hash',
      'admin_on_behalf', public.is_admin()
    )
  );

  return persona_id;
end;
$$;

revoke all on function public.publish_compiled_persona(uuid, text, jsonb)
from public, anon, service_role;
grant execute on function public.publish_compiled_persona(uuid, text, jsonb)
to authenticated;
