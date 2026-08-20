-- The service runner may import and drive jobs, but it cannot impersonate the
-- human knowledge/persona decisions made in Admin Studio.

create or replace function public.authorized_knowledge_pack_revision_state(
  p_revision_ids uuid[]
)
returns jsonb
language sql
security definer
stable
set search_path = pg_catalog, public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'path', kr.source_file_path,
    'revisionId', kr.id,
    'status', kr.status,
    'humanReviewed', kr.approved_by is not null and kr.approved_at is not null,
    'chunkCount', coalesce(c.chunk_count, 0),
    'distilled', kr.distilled_json is not null and kr.distilled_json <> '{}'::jsonb,
    'citationCommit', case when c.pinned then kr.source_commit_sha else null end,
    'citationPath', case when c.pinned then kr.source_file_path else null end
  ) order by kr.source_file_path), '[]'::jsonb)
  from public.knowledge_revisions kr
  join public.knowledge_sources ks on ks.id = kr.source_id
  left join lateral (
    select
      count(*) filter (where kc.embedding is not null)::integer as chunk_count,
      coalesce(bool_and(
        kc.embedding is not null
        and kc.citation_meta->>'commit_sha' = kr.source_commit_sha
        and kc.citation_meta->>'file_path' = kr.source_file_path
      ), false) as pinned
    from public.knowledge_chunks kc
    where kc.revision_id = kr.id
  ) c on true
  where kr.id = any(coalesce(p_revision_ids, '{}'::uuid[]))
    and ks.archived_at is null
    and ks.rights_status = 'granted'
    and ks.revoked_at is null
    and (ks.expires_at is null or ks.expires_at > now())
    and ks.rights_scope @> '{"commercial_rag":true,"distillation":true,"persona_synthesis":true}'::jsonb;
$$;

create or replace function public.queue_authorized_knowledge_pack_persona(
  p_expert_slug text,
  p_revision_ids uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  target_expert_id uuid;
  job_id uuid;
  expected integer;
  eligible integer;
  evaluation_total integer;
  evaluation_grounded integer;
begin
  select id into target_expert_id
  from public.experts
  where slug = p_expert_slug and status = 'active' and archived_at is null
  for update;
  if target_expert_id is null then
    raise exception 'expert_not_found' using errcode = 'P0002';
  end if;

  expected := cardinality(coalesce(p_revision_ids, '{}'::uuid[]));
  if expected < 2
     or expected <> (select count(distinct value) from unnest(p_revision_ids) as u(value)) then
    raise exception 'invalid_revision_set' using errcode = '22023';
  end if;

  select count(*) into eligible
  from public.knowledge_revisions kr
  join public.knowledge_sources ks on ks.id = kr.source_id
  where kr.id = any(p_revision_ids)
    and kr.status = 'approved'
    and kr.approved_by is not null
    and kr.approved_at is not null
    and ks.expert_id = target_expert_id
    and ks.published_revision_id = kr.id
    and ks.archived_at is null
    and ks.rights_status = 'granted'
    and ks.revoked_at is null
    and (ks.expires_at is null or ks.expires_at > now())
    and ks.rights_scope @> '{"commercial_rag":true,"distillation":true,"persona_synthesis":true}'::jsonb
    and exists (
      select 1 from public.knowledge_chunks kc
      where kc.revision_id = kr.id
        and kc.expert_id = target_expert_id
        and kc.embedding is not null
    );
  if eligible <> expected then
    raise exception 'knowledge_pack_requires_human_review' using errcode = '23514';
  end if;

  select count(*) into evaluation_total
  from public.persona_evaluation_questions q
  where q.expert_id = target_expert_id and q.active;
  select count(*) into evaluation_grounded
  from public.persona_evaluation_questions q
  where q.expert_id = target_expert_id
    and q.active
    and jsonb_typeof(q.expected) = 'object'
    and q.expected <> '{}'::jsonb
    and cardinality(q.source_revision_ids) > 0
    and not exists (
      select 1 from unnest(q.source_revision_ids) question_revision_id
      where not (question_revision_id = any(p_revision_ids))
    );
  if evaluation_total < 25 or evaluation_total > 50
     or evaluation_grounded <> evaluation_total then
    raise exception 'persona_evaluation_set_invalid' using errcode = '23514';
  end if;

  -- Reuse the exact reviewed/published job on verification reruns; never queue
  -- a second persona merely because the first one has already shipped.
  select j.id into job_id
  from public.persona_synthesis_jobs j
  join public.experts e on e.id = j.expert_id
  where j.expert_id = target_expert_id
    and j.source_revision_ids @> p_revision_ids
    and j.source_revision_ids <@ p_revision_ids
    and (
      j.status in ('pending', 'processing', 'retry', 'review', 'approved')
      or (
        j.status = 'published'
        and j.persona_version_id is not null
        and e.published_persona_version_id = j.persona_version_id
        and j.reviewed_by is not null
        and j.reviewed_at is not null
        and length(btrim(coalesce(j.review_notes, ''))) >= 5
        and public.has_current_passed_persona_evaluation(
          j.expert_id,
          j.persona_version_id
        )
      )
    )
  order by j.created_at desc
  limit 1;
  if job_id is not null then return job_id; end if;

  insert into public.persona_synthesis_jobs (
    expert_id, source_revision_ids, research_cutoff_at
  ) values (
    target_expert_id, p_revision_ids, now()
  ) returning id into job_id;
  return job_id;
end;
$$;

create or replace function public.authorized_knowledge_pack_persona_state(
  p_job_id uuid
)
returns jsonb
language sql
security definer
stable
set search_path = pg_catalog, public
as $$
  select jsonb_build_object(
    'jobId', j.id,
    'status', case
      when e.published_persona_version_id = j.persona_version_id
        and j.persona_version_id is not null then 'published'
      else j.status
    end,
    'fidelityStatus', j.fidelity_status,
    'sourceRevisionIds', j.source_revision_ids,
    'personaVersionId', j.persona_version_id,
    'humanReviewed', j.reviewed_by is not null
      and j.reviewed_at is not null
      and length(btrim(coalesce(j.review_notes, ''))) >= 5,
    'evaluationCurrent', case
      when j.persona_version_id is null then false
      else public.has_current_passed_persona_evaluation(j.expert_id, j.persona_version_id)
    end
  )
  from public.persona_synthesis_jobs j
  join public.experts e on e.id = j.expert_id
  where j.id = p_job_id;
$$;

create or replace function public.authorized_knowledge_pack_coverage(
  p_expert_slug text,
  p_commit_sha text
)
returns jsonb
language sql
security definer
stable
set search_path = pg_catalog, public
as $$
  with target as (
    select id, published_persona_version_id
    from public.experts
    where slug = p_expert_slug
  ), sources as (
    select
      ks.id,
      ks.published_revision_id,
      kr.id as revision_id,
      kr.status as revision_status,
      kr.approved_by,
      kr.approved_at,
      kr.source_commit_sha,
      kr.source_file_path,
      kr.source_sha256
    from public.knowledge_sources ks
    join target t on t.id = ks.expert_id
    join public.knowledge_revisions kr on kr.id = ks.published_revision_id
    where ks.external_key like 'growth-with-ai-guide:%'
      and kr.source_commit_sha = p_commit_sha
      and ks.archived_at is null
      and ks.rights_status = 'granted'
      and ks.revoked_at is null
      and (ks.expires_at is null or ks.expires_at > now())
      and ks.rights_scope @> '{"commercial_rag":true,"distillation":true,"persona_synthesis":true}'::jsonb
  ), chunked as (
    select distinct kc.revision_id
    from public.knowledge_chunks kc
    join sources s on s.revision_id = kc.revision_id
    where kc.embedding is not null
  ), pinned as (
    select kc.revision_id
    from public.knowledge_chunks kc
    join sources s on s.revision_id = kc.revision_id
    group by kc.revision_id
    having count(*) > 0
      and bool_and(
        kc.embedding is not null
        and kc.citation_meta->>'commit_sha' = p_commit_sha
        and kc.citation_meta->>'file_path' = s.source_file_path
      )
  ), persona as (
    select epv.source_revision_ids
    from public.expert_persona_versions epv
    join target t on t.published_persona_version_id = epv.id
    where epv.status = 'published'
  )
  select jsonb_build_object(
    'sourceCount', (select count(*) from sources),
    'approvedRevisionCount', (
      select count(*) from sources
      where revision_status = 'approved'
        and approved_by is not null
        and approved_at is not null
    ),
    'chunkedRevisionCount', (select count(*) from chunked),
    'pinnedCitationCount', (select count(*) from pinned),
    'publishedPersonaRevisionCount', coalesce(
      (select cardinality(source_revision_ids) from persona), 0
    ),
    'exactRevisionSet', coalesce((
      select source_revision_ids @> array(select revision_id from sources)
        and source_revision_ids <@ array(select revision_id from sources)
      from persona
    ), false),
    'rightsValidCount', (
      select count(*) from sources where source_sha256 ~ '^[a-f0-9]{64}$'
    )
  );
$$;

-- These legacy shortcuts mutated human-review state using a service identity.
-- Keep the functions for migration compatibility, but make them unreachable.
revoke all on function public.approve_authorized_knowledge_pack_revisions(
  text, uuid[]
) from public, anon, authenticated, service_role;
revoke all on function public.publish_authorized_knowledge_pack_persona(
  uuid, text
) from public, anon, authenticated, service_role;

revoke all on function public.authorized_knowledge_pack_revision_state(uuid[])
from public, anon, authenticated;
grant execute on function public.authorized_knowledge_pack_revision_state(uuid[])
to service_role;
revoke all on function public.queue_authorized_knowledge_pack_persona(text, uuid[])
from public, anon, authenticated;
grant execute on function public.queue_authorized_knowledge_pack_persona(text, uuid[])
to service_role;
revoke all on function public.authorized_knowledge_pack_persona_state(uuid)
from public, anon, authenticated;
grant execute on function public.authorized_knowledge_pack_persona_state(uuid)
to service_role;
revoke all on function public.authorized_knowledge_pack_coverage(text, text)
from public, anon, authenticated;
grant execute on function public.authorized_knowledge_pack_coverage(text, text)
to service_role;
