-- Idempotent, service-only ingestion and completion gates for version-pinned expert corpora.

alter table public.knowledge_sources
  add column if not exists external_key text,
  add column if not exists source_meta jsonb not null default '{}'::jsonb;

create unique index if not exists knowledge_sources_expert_external_key_unique
  on public.knowledge_sources(expert_id, external_key)
  where external_key is not null;

alter table public.knowledge_revisions
  add column if not exists source_sha256 text,
  add column if not exists source_commit_sha text,
  add column if not exists source_file_path text,
  add column if not exists source_blob_url text,
  add column if not exists pack_retry_count integer not null default 0;

create unique index if not exists knowledge_revisions_source_commit_sha_unique
  on public.knowledge_revisions(source_id, source_commit_sha, source_sha256)
  where source_commit_sha is not null and source_sha256 is not null;

create or replace function public.upsert_authorized_knowledge_pack_chapter(
  p_expert_slug text,
  p_external_key text,
  p_title text,
  p_source_url text,
  p_raw_text text,
  p_source_sha256 text,
  p_source_meta jsonb,
  p_rights_holder text,
  p_rights_evidence_ref text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  target_expert public.experts%rowtype;
  target_source public.knowledge_sources%rowtype;
  target_revision public.knowledge_revisions%rowtype;
  next_revision integer;
begin
  if length(trim(coalesce(p_external_key, ''))) < 8
     or length(trim(coalesce(p_title, ''))) < 2
     or length(trim(coalesce(p_raw_text, ''))) < 20
     or p_source_sha256 !~ '^[a-f0-9]{64}$'
     or p_source_url !~ '^https://github\.com/jimmylau-DOTAI/growth-with-ai-guide/blob/[a-f0-9]{40}/'
     or p_source_meta->>'commit_sha' is null
     or p_source_meta->>'file_path' is null
     or length(trim(coalesce(p_rights_holder, ''))) < 2
     or length(trim(coalesce(p_rights_evidence_ref, ''))) < 4 then
    raise exception 'invalid_knowledge_pack_chapter';
  end if;
  select * into target_expert from public.experts where slug = p_expert_slug and status = 'active' for update;
  if not found then raise exception 'expert_not_found'; end if;

  select * into target_source from public.knowledge_sources
  where expert_id = target_expert.id and external_key = trim(p_external_key) for update;
  if not found then
    insert into public.knowledge_sources (
      expert_id, source_type, title, source_url, tags, external_key, source_meta,
      rights_status, rights_holder, rights_scope, rights_evidence_ref, authorized_at
    ) values (
      target_expert.id, 'manual', trim(p_title), trim(p_source_url),
      array['growth-with-ai-guide', 'jimmy-lau', 'stage-' || coalesce(p_source_meta->>'stage', 'root')],
      trim(p_external_key), coalesce(p_source_meta, '{}'::jsonb), 'granted', trim(p_rights_holder),
      jsonb_build_object('commercial_rag', true, 'distillation', true, 'persona_synthesis', true,
        'model_training', false, 'commit_sha', p_source_meta->>'commit_sha'),
      trim(p_rights_evidence_ref), now()
    ) returning * into target_source;
    insert into public.audit_events (expert_id, action, entity_type, entity_id, metadata)
    values (target_expert.id, 'knowledge_pack.rights_granted', 'knowledge_source', target_source.id,
      jsonb_build_object('rights_holder', p_rights_holder, 'rights_evidence_ref', p_rights_evidence_ref,
        'commit_sha', p_source_meta->>'commit_sha'));
  else
    if target_source.rights_status <> 'granted' or target_source.revoked_at is not null
       or (target_source.expires_at is not null and target_source.expires_at <= now())
       or target_source.rights_holder is distinct from trim(p_rights_holder)
       or target_source.rights_evidence_ref is distinct from trim(p_rights_evidence_ref) then
      raise exception 'knowledge_rights_change_requires_explicit_grant';
    end if;
    update public.knowledge_sources set title = trim(p_title), source_url = trim(p_source_url),
      source_meta = coalesce(p_source_meta, '{}'::jsonb), updated_at = now()
    where id = target_source.id returning * into target_source;
  end if;

  select * into target_revision from public.knowledge_revisions
  where source_id = target_source.id
    and source_commit_sha = p_source_meta->>'commit_sha'
    and source_sha256 = p_source_sha256;
  if found then
    if target_revision.status = 'failed' and target_revision.pack_retry_count < 2 then
      update public.knowledge_revisions set status = 'queued', error_message = null,
        pack_retry_count = pack_retry_count + 1 where id = target_revision.id returning * into target_revision;
      insert into public.distillation_jobs (revision_id, stage, status, attempts, next_retry_at,
        locked_at, locked_by, error_message)
      values (target_revision.id, 'extract', 'pending', 0, now(), null, null, null)
      on conflict (revision_id) do update set stage = 'extract', status = 'pending', attempts = 0,
        next_retry_at = now(), locked_at = null, locked_by = null, error_message = null;
      insert into public.audit_events (expert_id, action, entity_type, entity_id, metadata)
      values (target_expert.id, 'knowledge_pack.retried', 'knowledge_revision', target_revision.id,
        jsonb_build_object('retry_count', target_revision.pack_retry_count));
    end if;
    return jsonb_build_object('source_id', target_source.id, 'revision_id', target_revision.id,
      'status', target_revision.status, 'created', false);
  end if;

  select coalesce(max(revision_no), 0) + 1 into next_revision
  from public.knowledge_revisions where source_id = target_source.id;
  insert into public.knowledge_revisions (
    source_id, revision_no, raw_text, source_sha256, source_commit_sha, source_file_path, source_blob_url,
    provider_meta, status
  ) values (
    target_source.id, next_revision, trim(p_raw_text), p_source_sha256,
    p_source_meta->>'commit_sha', p_source_meta->>'file_path', trim(p_source_url),
    jsonb_build_object('knowledge_pack', p_source_meta), 'queued'
  ) returning * into target_revision;
  insert into public.distillation_jobs (revision_id) values (target_revision.id);
  insert into public.audit_events (expert_id, action, entity_type, entity_id, metadata)
  values (target_expert.id, 'knowledge_pack.chapter_queued', 'knowledge_revision', target_revision.id,
    jsonb_build_object('external_key', p_external_key, 'source_sha256', p_source_sha256,
      'rights_evidence_ref', p_rights_evidence_ref));
  return jsonb_build_object('source_id', target_source.id, 'revision_id', target_revision.id,
    'status', target_revision.status, 'created', true);
end;
$$;

create or replace function public.authorized_knowledge_pack_revision_state(p_revision_ids uuid[])
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
    'chunkCount', coalesce(c.chunk_count, 0),
    'distilled', kr.distilled_json is not null and kr.distilled_json <> '{}'::jsonb,
    'citationCommit', case when c.pinned then kr.source_commit_sha else null end,
    'citationPath', case when c.pinned then kr.source_file_path else null end
  ) order by kr.source_file_path), '[]'::jsonb)
  from public.knowledge_revisions kr
  join public.knowledge_sources ks on ks.id = kr.source_id
  left join lateral (
    select count(*)::integer as chunk_count,
      coalesce(bool_and(kc.citation_meta->>'commit_sha' = kr.source_commit_sha
        and kc.citation_meta->>'file_path' = kr.source_file_path), false) as pinned
    from public.knowledge_chunks kc where kc.revision_id = kr.id
  ) c on true
  where kr.id = any(coalesce(p_revision_ids, '{}'::uuid[]))
    and ks.rights_status = 'granted' and ks.revoked_at is null
    and (ks.expires_at is null or ks.expires_at > now());
$$;

create or replace function public.approve_authorized_knowledge_pack_revisions(
  p_expert_slug text,
  p_revision_ids uuid[]
)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare target_expert_id uuid; expected integer; eligible integer;
begin
  select id into target_expert_id from public.experts where slug = p_expert_slug and status = 'active';
  if target_expert_id is null then raise exception 'expert_not_found'; end if;
  expected := cardinality(coalesce(p_revision_ids, '{}'::uuid[]));
  if expected = 0 or expected <> (select count(distinct value) from unnest(p_revision_ids) as u(value)) then
    raise exception 'invalid_revision_set';
  end if;
  select count(*) into eligible
  from public.knowledge_revisions kr join public.knowledge_sources ks on ks.id = kr.source_id
  where kr.id = any(p_revision_ids) and ks.expert_id = target_expert_id
    and ks.rights_status = 'granted' and ks.revoked_at is null
    and (ks.expires_at is null or ks.expires_at > now())
    and kr.status in ('review', 'approved')
    and kr.distilled_json is not null and kr.distilled_json <> '{}'::jsonb
    and exists (
      select 1 from public.knowledge_chunks kc where kc.revision_id = kr.id
      group by kc.revision_id having count(*) > 0
        and bool_and(kc.citation_meta->>'commit_sha' = kr.source_commit_sha
          and kc.citation_meta->>'file_path' = kr.source_file_path)
    );
  if eligible <> expected then raise exception 'knowledge_pack_incomplete'; end if;
  update public.knowledge_revisions set status = 'approved', approved_at = coalesce(approved_at, now()), error_message = null
  where id = any(p_revision_ids) and status = 'review';
  update public.knowledge_sources ks set published_revision_id = kr.id, updated_at = now()
  from public.knowledge_revisions kr where kr.id = any(p_revision_ids) and kr.source_id = ks.id;
  insert into public.audit_events (expert_id, action, entity_type, metadata)
  values (target_expert_id, 'knowledge_pack.approved', 'knowledge_pack', jsonb_build_object('revision_ids', p_revision_ids));
  return expected;
end;
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
declare target_expert_id uuid; job_id uuid; expected integer; eligible integer;
begin
  select id into target_expert_id from public.experts where slug = p_expert_slug and status = 'active' for update;
  if target_expert_id is null then raise exception 'expert_not_found'; end if;
  expected := cardinality(coalesce(p_revision_ids, '{}'::uuid[]));
  if expected <> (select count(distinct value) from unnest(p_revision_ids) as u(value)) then
    raise exception 'invalid_revision_set';
  end if;
  select count(*) into eligible from public.knowledge_revisions kr
  join public.knowledge_sources ks on ks.id = kr.source_id
  where kr.id = any(p_revision_ids) and kr.status = 'approved'
    and ks.expert_id = target_expert_id and ks.published_revision_id = kr.id
    and ks.rights_status = 'granted' and ks.revoked_at is null
    and (ks.expires_at is null or ks.expires_at > now());
  if expected < 2 or eligible <> expected then raise exception 'knowledge_pack_incomplete'; end if;
  select id into job_id from public.persona_synthesis_jobs
  where expert_id = target_expert_id and source_revision_ids = p_revision_ids
    and status in ('pending', 'processing', 'retry', 'review', 'approved')
  order by created_at desc limit 1;
  if job_id is not null then return job_id; end if;
  insert into public.persona_synthesis_jobs (expert_id, source_revision_ids, research_cutoff_at)
  values (target_expert_id, p_revision_ids, now()) returning id into job_id;
  return job_id;
end;
$$;

create or replace function public.authorized_knowledge_pack_persona_state(p_job_id uuid)
returns jsonb
language sql
security definer
stable
set search_path = pg_catalog, public
as $$
  select jsonb_build_object(
    'jobId', j.id,
    'status', case when e.published_persona_version_id = j.persona_version_id and j.persona_version_id is not null then 'published' else j.status end,
    'fidelityStatus', j.fidelity_status,
    'sourceRevisionIds', j.source_revision_ids,
    'personaVersionId', j.persona_version_id
  )
  from public.persona_synthesis_jobs j join public.experts e on e.id = j.expert_id
  where j.id = p_job_id;
$$;

create or replace function public.publish_authorized_knowledge_pack_persona(
  p_job_id uuid,
  p_greeting text
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare job public.persona_synthesis_jobs%rowtype; persona_id uuid; next_version integer; eligible integer;
begin
  select * into job from public.persona_synthesis_jobs where id = p_job_id for update;
  if not found or job.status not in ('review', 'approved') then raise exception 'persona_job_not_reviewable'; end if;
  if job.fidelity_status <> 'passed' then raise exception 'persona_fidelity_gate_failed'; end if;
  if job.output_blueprint is null or job.output_blueprint = '{}'::jsonb then raise exception 'persona_blueprint_empty'; end if;
  perform 1 from public.experts where id = job.expert_id for update;
  select count(*) into eligible from public.knowledge_revisions kr
  join public.knowledge_sources ks on ks.id = kr.source_id
  where kr.id = any(job.source_revision_ids) and kr.status = 'approved'
    and ks.expert_id = job.expert_id and ks.published_revision_id = kr.id
    and ks.rights_status = 'granted' and ks.revoked_at is null
    and (ks.expires_at is null or ks.expires_at > now());
  if eligible <> cardinality(job.source_revision_ids) then raise exception 'knowledge_pack_incomplete'; end if;
  if job.persona_version_id is not null then
    if exists (
      select 1 from public.experts e join public.expert_persona_versions epv
        on epv.id = e.published_persona_version_id
      where e.id = job.expert_id and epv.id = job.persona_version_id and epv.status = 'published'
    ) then
      return job.persona_version_id;
    end if;
    update public.expert_persona_versions set status = 'retired'
      where expert_id = job.expert_id and status = 'published' and id <> job.persona_version_id;
    update public.expert_persona_versions set status = 'published', published_at = now()
      where id = job.persona_version_id and expert_id = job.expert_id;
    if not found then raise exception 'persona_version_unavailable'; end if;
    update public.experts set published_persona_version_id = job.persona_version_id,
      feature_flags = feature_flags || '{"persona_compiler_enabled":true,"rag_enabled":true}'::jsonb
      where id = job.expert_id;
    insert into public.audit_events (expert_id, action, entity_type, entity_id, metadata)
    values (job.expert_id, 'knowledge_pack.persona_republished', 'persona_version', job.persona_version_id,
      jsonb_build_object('job_id', p_job_id, 'source_revision_count', cardinality(job.source_revision_ids)));
    return job.persona_version_id;
  end if;
  select coalesce(max(version), 0) + 1 into next_version from public.expert_persona_versions where expert_id = job.expert_id;
  update public.expert_persona_versions set status = 'retired' where expert_id = job.expert_id and status = 'published';
  insert into public.expert_persona_versions (
    expert_id, version, greeting, voice_rules, boundaries, persona_blueprint, evidence_manifest,
    source_revision_ids, research_cutoff_at, fidelity_report, fidelity_score, fidelity_status,
    status, published_at
  ) values (
    job.expert_id, next_version, trim(coalesce(p_greeting, '')),
    coalesce(job.output_blueprint->'expression_dna', '{}'::jsonb),
    coalesce(job.output_blueprint->'honest_boundaries', '[]'::jsonb),
    job.output_blueprint, job.evidence_manifest, job.source_revision_ids, job.research_cutoff_at,
    job.fidelity_report, job.fidelity_score, job.fidelity_status, 'published', now()
  ) returning id into persona_id;
  update public.persona_synthesis_jobs set status = 'approved', persona_version_id = persona_id,
    reviewed_at = now(), updated_at = now() where id = p_job_id;
  update public.experts set published_persona_version_id = persona_id,
    feature_flags = feature_flags || '{"persona_compiler_enabled":true,"rag_enabled":true}'::jsonb
  where id = job.expert_id;
  insert into public.audit_events (expert_id, action, entity_type, entity_id, metadata)
  values (job.expert_id, 'knowledge_pack.persona_published', 'persona_version', persona_id,
    jsonb_build_object('job_id', p_job_id, 'source_revision_count', cardinality(job.source_revision_ids)));
  return persona_id;
end;
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
  with target as (select id, published_persona_version_id from public.experts where slug = p_expert_slug),
  sources as (
    select ks.*, kr.id as revision_id, kr.status as revision_status,
      kr.source_commit_sha, kr.source_file_path, kr.source_sha256
    from public.knowledge_sources ks join target t on t.id = ks.expert_id
    left join public.knowledge_revisions kr on kr.id = ks.published_revision_id
    where ks.external_key like 'growth-with-ai-guide:%' and kr.source_commit_sha = p_commit_sha
      and ks.rights_status = 'granted' and ks.revoked_at is null
      and (ks.expires_at is null or ks.expires_at > now())
  ), chunked as (
    select distinct kc.revision_id from public.knowledge_chunks kc join sources s on s.published_revision_id = kc.revision_id
  ), pinned as (
    select kc.revision_id from public.knowledge_chunks kc join sources s on s.revision_id = kc.revision_id
    group by kc.revision_id having bool_and(kc.citation_meta->>'commit_sha' = p_commit_sha
      and kc.citation_meta->>'file_path' = s.source_file_path)
  ), persona as (
    select epv.source_revision_ids from public.expert_persona_versions epv join target t on t.published_persona_version_id = epv.id
  )
  select jsonb_build_object(
    'sourceCount', (select count(*) from sources),
    'approvedRevisionCount', (select count(*) from sources where revision_status = 'approved'),
    'chunkedRevisionCount', (select count(*) from chunked),
    'pinnedCitationCount', (select count(*) from pinned),
    'publishedPersonaRevisionCount', coalesce((select cardinality(source_revision_ids) from persona), 0),
    'exactRevisionSet', coalesce((select source_revision_ids @> array(select revision_id from sources)
      and source_revision_ids <@ array(select revision_id from sources) from persona), false),
    'rightsValidCount', (select count(*) from sources where source_sha256 ~ '^[a-f0-9]{64}$')
  );
$$;

create or replace function public.match_expert_knowledge(
  p_expert_id uuid,
  p_query_embedding extensions.halfvec(1536),
  p_match_count integer default 6,
  p_similarity_threshold double precision default 0.70
)
returns table (chunk_id uuid, revision_id uuid, source_id uuid, source_title text,
  source_url text, content text, citation_meta jsonb, similarity double precision)
language sql security definer stable
set search_path = pg_catalog, public, extensions
as $$
  select kc.id, kc.revision_id, ks.id, ks.title, coalesce(kr.source_blob_url, ks.source_url),
    kc.content, kc.citation_meta, 1 - (kc.embedding <=> p_query_embedding)
  from public.knowledge_chunks kc
  join public.knowledge_revisions kr on kr.id = kc.revision_id and kr.source_id = kc.source_id
  join public.knowledge_sources ks on ks.id = kr.source_id and ks.expert_id = kc.expert_id
  where kc.expert_id = p_expert_id and ks.expert_id = p_expert_id
    and ks.archived_at is null and ks.published_revision_id = kr.id and kr.status = 'approved'
    and ks.rights_status = 'granted' and ks.revoked_at is null
    and (ks.expires_at is null or ks.expires_at > now()) and kc.embedding is not null
    and 1 - (kc.embedding <=> p_query_embedding) >= p_similarity_threshold
  order by kc.embedding <=> p_query_embedding
  limit least(greatest(p_match_count, 1), 12);
$$;

revoke all on function public.match_expert_knowledge(uuid, extensions.halfvec, integer, double precision)
from public, anon, authenticated;
grant execute on function public.match_expert_knowledge(uuid, extensions.halfvec, integer, double precision)
to service_role;

revoke all on function public.upsert_authorized_knowledge_pack_chapter(text,text,text,text,text,text,jsonb,text,text) from public, anon, authenticated;
grant execute on function public.upsert_authorized_knowledge_pack_chapter(text,text,text,text,text,text,jsonb,text,text) to service_role;
revoke all on function public.authorized_knowledge_pack_revision_state(uuid[]) from public, anon, authenticated;
grant execute on function public.authorized_knowledge_pack_revision_state(uuid[]) to service_role;
revoke all on function public.approve_authorized_knowledge_pack_revisions(text,uuid[]) from public, anon, authenticated;
grant execute on function public.approve_authorized_knowledge_pack_revisions(text,uuid[]) to service_role;
revoke all on function public.queue_authorized_knowledge_pack_persona(text,uuid[]) from public, anon, authenticated;
grant execute on function public.queue_authorized_knowledge_pack_persona(text,uuid[]) to service_role;
revoke all on function public.authorized_knowledge_pack_persona_state(uuid) from public, anon, authenticated;
grant execute on function public.authorized_knowledge_pack_persona_state(uuid) to service_role;
revoke all on function public.publish_authorized_knowledge_pack_persona(uuid,text) from public, anon, authenticated;
grant execute on function public.publish_authorized_knowledge_pack_persona(uuid,text) to service_role;
revoke all on function public.authorized_knowledge_pack_coverage(text,text) from public, anon, authenticated;
grant execute on function public.authorized_knowledge_pack_coverage(text,text) to service_role;
