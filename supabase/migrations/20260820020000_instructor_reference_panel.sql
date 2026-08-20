-- Owner/admin reference-file inventory for the Studio release gate.  Keep the
-- underlying source text private; this RPC exposes only provenance, rights and
-- pipeline metadata needed to review whether an expert can safely ship.
create or replace function public.get_expert_reference_files(p_expert_id uuid)
returns table (
  source_id uuid,
  source_type text,
  title text,
  source_url text,
  external_key text,
  source_updated_at timestamptz,
  archived_at timestamptz,
  rights_status text,
  rights_holder text,
  rights_evidence_ref text,
  rights_scope jsonb,
  rights_expires_at timestamptz,
  rights_revoked_at timestamptz,
  rights_valid boolean,
  revision_id uuid,
  revision_no integer,
  revision_status text,
  revision_created_at timestamptz,
  storage_path text,
  source_commit_sha text,
  source_file_path text,
  source_blob_url text,
  content_hash text,
  distilled boolean,
  human_reviewed boolean,
  chunk_count bigint,
  embedded_chunk_count bigint,
  job_stage text,
  job_status text,
  job_attempts integer,
  job_error text,
  is_published boolean
)
language plpgsql
security definer
stable
set search_path = pg_catalog, public
as $$
begin
  if not public.owns_expert(p_expert_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  return query
  select
    ks.id,
    ks.source_type,
    ks.title,
    ks.source_url,
    ks.external_key,
    ks.updated_at,
    ks.archived_at,
    ks.rights_status,
    ks.rights_holder,
    ks.rights_evidence_ref,
    ks.rights_scope,
    ks.expires_at,
    ks.revoked_at,
    (
      ks.rights_status = 'granted'
      and ks.revoked_at is null
      and (ks.expires_at is null or ks.expires_at > now())
      and ks.rights_scope @> '{"commercial_rag":true,"distillation":true,"persona_synthesis":true}'::jsonb
    ),
    kr.id,
    kr.revision_no,
    kr.status,
    kr.created_at,
    kr.storage_path,
    kr.source_commit_sha,
    kr.source_file_path,
    kr.source_blob_url,
    kr.content_hash,
    (kr.distilled_json is not null),
    (kr.approved_by is not null and kr.approved_at is not null),
    coalesce(kc.chunk_count, 0),
    coalesce(kc.embedded_chunk_count, 0),
    dj.stage,
    dj.status,
    dj.attempts,
    coalesce(dj.error_message, kr.error_message),
    (
      ks.published_revision_id = kr.id
      and kr.status = 'approved'
      and kr.approved_by is not null
      and kr.approved_at is not null
      and ks.archived_at is null
    )
  from public.knowledge_sources ks
  left join lateral (
    select candidate.*
    from public.knowledge_revisions candidate
    where candidate.source_id = ks.id
    order by candidate.revision_no desc, candidate.created_at desc
    limit 1
  ) kr on true
  left join lateral (
    select
      count(*)::bigint as chunk_count,
      count(*) filter (where chunk.embedding is not null)::bigint as embedded_chunk_count
    from public.knowledge_chunks chunk
    where chunk.revision_id = kr.id
      and chunk.expert_id = ks.expert_id
  ) kc on true
  left join public.distillation_jobs dj on dj.revision_id = kr.id
  where ks.expert_id = p_expert_id
  order by (ks.archived_at is not null), ks.updated_at desc, ks.title;
end;
$$;

revoke all on function public.get_expert_reference_files(uuid)
from public, anon, authenticated;
grant execute on function public.get_expert_reference_files(uuid) to authenticated;

-- Keep the operator release snapshot aligned with the real chat gate: sources
-- must have current rights and the published chunks must actually be embedded.
create or replace function public.get_expert_release_readiness(p_expert_id uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = pg_catalog, public
as $$
declare
  result jsonb;
begin
  if not public.owns_expert(p_expert_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'identity_verified', e.verified,
    'owner_assigned', exists (
      select 1 from public.account_access aa
      where aa.user_id = e.owner_user_id
        and aa.app_role = 'expert'
        and aa.expert_id = e.id
    ),
    'published_persona', exists (
      select 1 from public.expert_persona_versions epv
      where epv.id = e.published_persona_version_id
        and epv.expert_id = e.id
        and epv.status = 'published'
        and cardinality(epv.source_revision_ids) > 0
        and not exists (
          select 1
          from unnest(epv.source_revision_ids) persona_revision_id
          where not exists (
            select 1
            from public.knowledge_revisions persona_revision
            join public.knowledge_sources persona_source
              on persona_source.id = persona_revision.source_id
            where persona_revision.id = persona_revision_id
              and persona_source.expert_id = e.id
              and persona_source.published_revision_id = persona_revision.id
              and persona_revision.status = 'approved'
              and persona_revision.approved_by is not null
              and persona_revision.approved_at is not null
              and persona_source.archived_at is null
              and persona_source.rights_status = 'granted'
              and persona_source.revoked_at is null
              and (persona_source.expires_at is null or persona_source.expires_at > now())
              and persona_source.rights_scope -> 'commercial_rag' is not distinct from 'true'::jsonb
              and persona_source.rights_scope -> 'persona_synthesis' is not distinct from 'true'::jsonb
          )
        )
        and exists (
          select 1
          from public.persona_synthesis_jobs reviewed_job
          where reviewed_job.persona_version_id = epv.id
            and reviewed_job.expert_id = e.id
            and reviewed_job.status in ('approved', 'published')
            and reviewed_job.reviewed_by is not null
            and reviewed_job.reviewed_at is not null
        )
    ),
    'published_sources', (
      select count(*) from public.knowledge_sources ks
      join public.knowledge_revisions kr
        on kr.id = ks.published_revision_id and kr.source_id = ks.id
      where ks.expert_id = e.id
        and ks.archived_at is null
        and kr.status = 'approved'
        and kr.approved_by is not null
        and kr.approved_at is not null
        and ks.rights_status = 'granted'
        and ks.revoked_at is null
        and (ks.expires_at is null or ks.expires_at > now())
        and ks.rights_scope -> 'commercial_rag' is not distinct from 'true'::jsonb
        and exists (
          select 1
          from public.knowledge_chunks source_chunk
          where source_chunk.source_id = ks.id
            and source_chunk.revision_id = kr.id
            and source_chunk.expert_id = e.id
            and source_chunk.embedding is not null
        )
    ),
    'published_chunks', (
      select count(*) from public.knowledge_chunks kc
      join public.knowledge_sources ks
        on ks.id = kc.source_id and ks.expert_id = kc.expert_id
      join public.knowledge_revisions kr
        on kr.id = kc.revision_id and kr.source_id = ks.id
      where kc.expert_id = e.id
        and ks.archived_at is null
        and ks.published_revision_id = kc.revision_id
        and kr.status = 'approved'
        and kr.approved_by is not null
        and kr.approved_at is not null
        and ks.rights_status = 'granted'
        and ks.revoked_at is null
        and (ks.expires_at is null or ks.expires_at > now())
        and ks.rights_scope -> 'commercial_rag' is not distinct from 'true'::jsonb
        and kc.embedding is not null
    ),
    'evaluation_questions', (
      select count(*) from public.persona_evaluation_questions q
      where q.expert_id = e.id
        and q.active
        and jsonb_typeof(q.expected) = 'object'
        and q.expected <> '{}'::jsonb
        and cardinality(q.source_revision_ids) > 0
        and not exists (
          select 1 from unnest(q.source_revision_ids) question_revision_id
          where not exists (
            select 1
            from public.knowledge_revisions evidence_revision
            join public.knowledge_sources evidence_source
              on evidence_source.id = evidence_revision.source_id
            where evidence_revision.id = question_revision_id
              and evidence_source.expert_id = e.id
              and evidence_source.published_revision_id = evidence_revision.id
              and evidence_revision.status = 'approved'
              and evidence_revision.approved_by is not null
              and evidence_revision.approved_at is not null
              and evidence_source.archived_at is null
              and evidence_source.rights_status = 'granted'
              and evidence_source.revoked_at is null
              and (evidence_source.expires_at is null or evidence_source.expires_at > now())
              and evidence_source.rights_scope -> 'persona_synthesis' is not distinct from 'true'::jsonb
          )
        )
    ),
    'evaluation_question_total', (
      select count(*) from public.persona_evaluation_questions q
      where q.expert_id = e.id and q.active
    ),
    'evaluation_passed', public.has_current_passed_persona_evaluation(
      e.id, e.published_persona_version_id
    ),
    'pending_jobs', (
      (select count(*) from public.distillation_jobs dj
       join public.knowledge_revisions kr on kr.id = dj.revision_id
       join public.knowledge_sources ks on ks.id = kr.source_id
       where ks.expert_id = e.id and dj.status in ('pending', 'processing', 'retry'))
      +
      (select count(*) from public.persona_synthesis_jobs pj
       where pj.expert_id = e.id
         and pj.status in ('pending', 'processing', 'retry', 'review', 'approved'))
    ),
    'failed_jobs', (
      (select count(*) from public.distillation_jobs dj
       join public.knowledge_revisions kr on kr.id = dj.revision_id
       join public.knowledge_sources ks on ks.id = kr.source_id
       where ks.expert_id = e.id and dj.status = 'failed')
      +
      (select count(*) from public.persona_synthesis_jobs pj
       where pj.expert_id = e.id and pj.status = 'failed')
    ),
    'chat_ready', public.is_expert_chat_ready(e.id)
  ) into result
  from public.experts e
  where e.id = p_expert_id;

  if result is null then
    raise exception 'expert_not_found' using errcode = 'P0002';
  end if;

  return result || jsonb_build_object(
    'ready',
    coalesce((result ->> 'identity_verified')::boolean, false)
      and coalesce((result ->> 'owner_assigned')::boolean, false)
      and coalesce((result ->> 'published_persona')::boolean, false)
      and coalesce((result ->> 'published_sources')::integer, 0) >= 2
      and coalesce((result ->> 'published_chunks')::integer, 0) > 0
      and coalesce((result ->> 'evaluation_questions')::integer, 0) >= 25
      and coalesce((result ->> 'evaluation_question_total')::integer, 0)
        = coalesce((result ->> 'evaluation_questions')::integer, 0)
      and coalesce((result ->> 'evaluation_passed')::boolean, false)
      and coalesce((result ->> 'pending_jobs')::integer, 0) = 0
      and coalesce((result ->> 'failed_jobs')::integer, 0) = 0
  );
end;
$$;

revoke all on function public.get_expert_release_readiness(uuid)
from public, anon, authenticated;
grant execute on function public.get_expert_release_readiness(uuid) to authenticated;

-- Do not spend a provider call on an evaluation set that an operator has not
-- grounded in the same published corpus.  The worker repeats this validation,
-- but rejecting at queue time gives the Studio an immediate, actionable gate.
create or replace function public.queue_persona_synthesis(p_expert_id uuid)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  revision_ids uuid[];
  job_id uuid;
  evaluation_question_count integer;
  evaluation_question_total integer;
begin
  if not public.owns_expert(p_expert_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  perform 1 from public.experts where id = p_expert_id for update;
  if not found then
    raise exception 'expert_not_found' using errcode = 'P0002';
  end if;
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
  join public.knowledge_revisions kr
    on kr.id = ks.published_revision_id and kr.source_id = ks.id
  where ks.expert_id = p_expert_id
    and ks.archived_at is null
    and ks.rights_status = 'granted'
    and ks.revoked_at is null
    and (ks.expires_at is null or ks.expires_at > now())
    and ks.rights_scope -> 'persona_synthesis' is not distinct from 'true'::jsonb
    and kr.status = 'approved'
    and kr.approved_by is not null
    and kr.approved_at is not null;

  if coalesce(cardinality(revision_ids), 0) < 2 then
    raise exception 'persona_needs_two_published_sources' using errcode = '23514';
  end if;

  select count(*) into evaluation_question_total
  from public.persona_evaluation_questions q
  where q.expert_id = p_expert_id and q.active;

  select count(*) into evaluation_question_count
  from public.persona_evaluation_questions q
  where q.expert_id = p_expert_id
    and q.active
    and jsonb_typeof(q.expected) = 'object'
    and q.expected <> '{}'::jsonb
    and cardinality(q.source_revision_ids) > 0
    and not exists (
      select 1 from unnest(q.source_revision_ids) question_revision_id
      where not (question_revision_id = any(revision_ids))
    );

  if evaluation_question_count <> evaluation_question_total then
    raise exception 'persona_evaluation_set_invalid' using errcode = '23514';
  end if;
  if evaluation_question_count < 25 then
    raise exception 'persona_evaluation_set_incomplete' using errcode = '23514';
  end if;
  if evaluation_question_count > 50 then
    raise exception 'persona_evaluation_set_too_large' using errcode = '23514';
  end if;

  insert into public.persona_synthesis_jobs (
    expert_id, source_revision_ids, created_by, research_cutoff_at
  ) values (
    p_expert_id, revision_ids, auth.uid(), now()
  ) returning id into job_id;

  insert into public.audit_events (
    actor_id, expert_id, action, entity_type, entity_id, metadata
  ) values (
    auth.uid(), p_expert_id, 'persona.synthesis_queued',
    'persona_synthesis_job', job_id,
    jsonb_build_object(
      'source_revision_ids', revision_ids,
      'evaluation_question_count', evaluation_question_count
    )
  );
  return job_id;
end;
$$;

revoke all on function public.queue_persona_synthesis(uuid)
from public, anon, authenticated;
grant execute on function public.queue_persona_synthesis(uuid) to authenticated;

-- The public chat gate uses the same evidence-linked evaluation contract as
-- the queue and worker.  Invalid/legacy active questions can never pad the
-- minimum count or create a release false-green.
create or replace function public.is_expert_chat_ready(p_expert_id uuid)
returns boolean
language sql
security definer
stable
set search_path = pg_catalog, public
as $$
  select coalesce((select case when e.slug = 'platform' then false else
    e.status = 'active'
    and e.archived_at is null
    and e.public_profile_enabled
    and e.verified
    and exists (
      select 1 from public.account_access aa
      where aa.expert_id = e.id and aa.app_role = 'expert'
    )
    and coalesce((e.feature_flags ->> 'rag_enabled')::boolean, false)
    and e.published_persona_version_id is not null
    and exists (
      select 1 from public.expert_persona_versions epv
      where epv.id = e.published_persona_version_id
        and epv.expert_id = e.id
        and epv.status = 'published'
        and cardinality(epv.source_revision_ids) > 0
        and not exists (
          select 1
          from unnest(epv.source_revision_ids) persona_revision_id
          where not exists (
            select 1
            from public.knowledge_revisions persona_revision
            join public.knowledge_sources persona_source
              on persona_source.id = persona_revision.source_id
            where persona_revision.id = persona_revision_id
              and persona_source.expert_id = e.id
              and persona_source.published_revision_id = persona_revision.id
              and persona_revision.status = 'approved'
              and persona_revision.approved_by is not null
              and persona_revision.approved_at is not null
              and persona_source.archived_at is null
              and persona_source.rights_status = 'granted'
              and persona_source.revoked_at is null
              and (persona_source.expires_at is null or persona_source.expires_at > now())
              and persona_source.rights_scope -> 'commercial_rag' is not distinct from 'true'::jsonb
              and persona_source.rights_scope -> 'persona_synthesis' is not distinct from 'true'::jsonb
          )
        )
        and exists (
          select 1
          from public.persona_synthesis_jobs reviewed_job
          where reviewed_job.persona_version_id = epv.id
            and reviewed_job.expert_id = e.id
            and reviewed_job.status in ('approved', 'published')
            and reviewed_job.reviewed_by is not null
            and reviewed_job.reviewed_at is not null
        )
    )
    and 2 <= (
      select count(*) from public.knowledge_sources ks
      join public.knowledge_revisions kr
        on kr.id = ks.published_revision_id and kr.source_id = ks.id
      where ks.expert_id = e.id
        and ks.archived_at is null
        and kr.status = 'approved'
        and kr.approved_by is not null
        and kr.approved_at is not null
        and ks.rights_status = 'granted'
        and ks.revoked_at is null
        and (ks.expires_at is null or ks.expires_at > now())
        and ks.rights_scope -> 'commercial_rag' is not distinct from 'true'::jsonb
        and exists (
          select 1
          from public.knowledge_chunks source_chunk
          where source_chunk.source_id = ks.id
            and source_chunk.revision_id = kr.id
            and source_chunk.expert_id = e.id
            and source_chunk.embedding is not null
        )
    )
    and 25 <= (
      select count(*) from public.persona_evaluation_questions q
      where q.expert_id = e.id and q.active
    )
    and 50 >= (
      select count(*) from public.persona_evaluation_questions q
      where q.expert_id = e.id and q.active
    )
    and not exists (
      select 1
      from public.persona_evaluation_questions q
      where q.expert_id = e.id
        and q.active
        and (
          jsonb_typeof(q.expected) <> 'object'
          or q.expected = '{}'::jsonb
          or cardinality(q.source_revision_ids) = 0
          or exists (
            select 1 from unnest(q.source_revision_ids) question_revision_id
            where not exists (
              select 1
              from public.knowledge_revisions evidence_revision
              join public.knowledge_sources evidence_source
                on evidence_source.id = evidence_revision.source_id
              where evidence_revision.id = question_revision_id
                and evidence_source.expert_id = e.id
                and evidence_source.published_revision_id = evidence_revision.id
                and evidence_revision.status = 'approved'
                and evidence_revision.approved_by is not null
                and evidence_revision.approved_at is not null
                and evidence_source.archived_at is null
                and evidence_source.rights_status = 'granted'
                and evidence_source.revoked_at is null
                and (evidence_source.expires_at is null or evidence_source.expires_at > now())
                and evidence_source.rights_scope -> 'persona_synthesis' is not distinct from 'true'::jsonb
            )
          )
        )
    )
    and public.has_current_passed_persona_evaluation(
      e.id, e.published_persona_version_id
    )
  end from public.experts e where e.id = p_expert_id), false);
$$;

revoke all on function public.is_expert_chat_ready(uuid)
from public, anon, authenticated;
grant execute on function public.is_expert_chat_ready(uuid) to service_role;

-- Retrieval is itself an authorization boundary. Expert-level readiness must
-- never make a third source with a missing/false RAG scope retrievable.
create or replace function public.match_expert_knowledge(
  p_expert_id uuid,
  p_query_embedding extensions.halfvec(1536),
  p_match_count integer default 6,
  p_similarity_threshold double precision default 0.70
)
returns table (
  chunk_id uuid,
  revision_id uuid,
  source_id uuid,
  source_title text,
  source_url text,
  content text,
  citation_meta jsonb,
  similarity double precision
)
language sql
security definer
stable
set search_path = pg_catalog, public, extensions
as $$
  select
    kc.id,
    kc.revision_id,
    ks.id,
    ks.title,
    coalesce(kr.source_blob_url, ks.source_url),
    kc.content,
    kc.citation_meta,
    1 - (kc.embedding <=> p_query_embedding)
  from public.knowledge_chunks kc
  join public.knowledge_revisions kr
    on kr.id = kc.revision_id and kr.source_id = kc.source_id
  join public.knowledge_sources ks
    on ks.id = kr.source_id and ks.expert_id = kc.expert_id
  where kc.expert_id = p_expert_id
    and ks.expert_id = p_expert_id
    and ks.archived_at is null
    and ks.published_revision_id = kr.id
    and kr.status = 'approved'
    and kr.approved_by is not null
    and kr.approved_at is not null
    and ks.rights_status = 'granted'
    and ks.revoked_at is null
    and (ks.expires_at is null or ks.expires_at > now())
    and ks.rights_scope -> 'commercial_rag' is not distinct from 'true'::jsonb
    and kc.embedding is not null
    and 1 - (kc.embedding <=> p_query_embedding) >= p_similarity_threshold
  order by kc.embedding <=> p_query_embedding
  limit least(greatest(p_match_count, 1), 12);
$$;

revoke all on function public.match_expert_knowledge(
  uuid, extensions.halfvec, integer, double precision
) from public, anon, authenticated;
grant execute on function public.match_expert_knowledge(
  uuid, extensions.halfvec, integer, double precision
) to service_role;
