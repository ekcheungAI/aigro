-- Atomic, rights-authorized generic knowledge ingestion and worker fail-closed gates.
-- Timestamp follows the existing 20260820 release migrations in this worktree.

create or replace function public.create_authorized_knowledge_source(
  p_expert_slug text,
  p_source_type text,
  p_title text,
  p_rights_holder text,
  p_rights_evidence_ref text,
  p_rights_scope jsonb,
  p_source_url text default null,
  p_raw_text text default null,
  p_storage_path text default null,
  p_tags text[] default '{}',
  p_expires_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  target_expert public.experts%rowtype;
  new_source public.knowledge_sources%rowtype;
  new_revision public.knowledge_revisions%rowtype;
  new_job public.distillation_jobs%rowtype;
  normalized_url text := nullif(btrim(coalesce(p_source_url, '')), '');
  input_scope jsonb := coalesce(p_rights_scope, '{}'::jsonb);
  scope jsonb := input_scope || '{"model_training":false}'::jsonb;
begin
  select * into target_expert
  from public.experts
  where slug = p_expert_slug and archived_at is null;
  if not found or not public.owns_expert(target_expert.id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if coalesce((target_expert.feature_flags ->> 'cms_ingestion_enabled')::boolean, false) is false
     and not public.is_admin() then
    raise exception 'cms_ingestion_disabled' using errcode = '42501';
  end if;

  if p_source_type not in ('manual', 'url', 'pdf', 'youtube') then
    raise exception 'invalid_source_type' using errcode = '22023';
  end if;
  if char_length(btrim(coalesce(p_title, ''))) < 2 then
    raise exception 'invalid_title' using errcode = '22023';
  end if;
  if p_source_type = 'manual'
     and char_length(btrim(coalesce(p_raw_text, ''))) < 20 then
    raise exception 'manual_text_too_short' using errcode = '22023';
  end if;
  if p_source_type in ('url', 'youtube')
     and not public.is_safe_knowledge_source_url(
       normalized_url,
       p_source_type = 'youtube'
     ) then
    raise exception 'unsafe_source_url' using errcode = '22023';
  end if;
  if p_source_type = 'pdf' and (
    p_storage_path is null
    or p_storage_path like '/%'
    or p_storage_path like '%..%'
    or p_storage_path not like target_expert.slug || '/%'
  ) then
    raise exception 'invalid_storage_path' using errcode = '22023';
  end if;

  if char_length(btrim(coalesce(p_rights_holder, ''))) < 2
     or char_length(btrim(coalesce(p_rights_evidence_ref, ''))) < 4
     or not (scope @> '{"commercial_rag":true,"distillation":true,"persona_synthesis":true}'::jsonb)
     or coalesce(input_scope -> 'model_training', 'false'::jsonb) is distinct from 'false'::jsonb then
    raise exception 'knowledge_rights_evidence_required' using errcode = '22023';
  end if;
  if p_expires_at is not null and p_expires_at <= now() then
    raise exception 'knowledge_rights_expired' using errcode = '22023';
  end if;

  insert into public.knowledge_sources (
    expert_id,
    source_type,
    title,
    source_url,
    tags,
    rights_status,
    rights_holder,
    rights_scope,
    rights_evidence_ref,
    authorized_at,
    expires_at,
    created_by
  ) values (
    target_expert.id,
    p_source_type,
    btrim(p_title),
    normalized_url,
    coalesce(p_tags[1:20], '{}'),
    'granted',
    left(btrim(p_rights_holder), 500),
    scope,
    left(btrim(p_rights_evidence_ref), 1000),
    now(),
    p_expires_at,
    auth.uid()
  ) returning * into new_source;

  insert into public.knowledge_revisions (
    source_id,
    revision_no,
    raw_text,
    storage_path,
    created_by
  ) values (
    new_source.id,
    1,
    nullif(btrim(coalesce(p_raw_text, '')), ''),
    nullif(btrim(coalesce(p_storage_path, '')), ''),
    auth.uid()
  ) returning * into new_revision;

  insert into public.distillation_jobs (revision_id)
  values (new_revision.id)
  returning * into new_job;

  insert into public.audit_events (
    actor_id,
    expert_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) values
  (
    auth.uid(),
    target_expert.id,
    'knowledge.rights_granted',
    'knowledge_source',
    new_source.id,
    jsonb_build_object(
      'rights_holder', left(btrim(p_rights_holder), 500),
      'rights_evidence_ref', left(btrim(p_rights_evidence_ref), 1000),
      'rights_scope', scope,
      'expires_at', p_expires_at,
      'atomic_ingestion', true
    )
  ),
  (
    auth.uid(),
    target_expert.id,
    'knowledge.created',
    'knowledge_revision',
    new_revision.id,
    jsonb_build_object(
      'source_id', new_source.id,
      'job_id', new_job.id,
      'atomic_ingestion', true
    )
  );

  return jsonb_build_object(
    'source_id', new_source.id,
    'revision_id', new_revision.id,
    'job_id', new_job.id
  );
end;
$$;

-- Browser callers must not be able to enqueue a revision before rights exist.
revoke all on function public.create_knowledge_source(
  text, text, text, text, text, text, text[]
) from public, anon, authenticated;
grant execute on function public.create_knowledge_source(
  text, text, text, text, text, text, text[]
) to service_role;

revoke all on function public.create_authorized_knowledge_source(
  text, text, text, text, text, jsonb, text, text, text, text[], timestamptz
) from public, anon, authenticated;
grant execute on function public.create_authorized_knowledge_source(
  text, text, text, text, text, jsonb, text, text, text, text[], timestamptz
) to authenticated;

-- Rights withdrawal uses the same source -> job -> revision order as worker
-- completion. Active work becomes terminal and cannot be retried with stale
-- authorization.
create or replace function public.revoke_knowledge_source_rights(
  p_source_id uuid,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  source_row public.knowledge_sources%rowtype;
  cancelled_revision_ids uuid[] := '{}'::uuid[];
begin
  select * into source_row
  from public.knowledge_sources
  where id = p_source_id
  for update;
  if not found then
    raise exception 'knowledge_source_not_found' using errcode = 'P0002';
  end if;
  if not public.owns_expert(source_row.expert_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  update public.knowledge_sources
  set rights_status = 'revoked',
      revoked_at = now(),
      published_revision_id = null,
      updated_at = now()
  where id = p_source_id;

  with cancelled as (
    update public.distillation_jobs dj
    set status = 'failed',
        locked_at = null,
        locked_by = null,
        error_message = 'knowledge_rights_revoked',
        updated_at = now()
    from public.knowledge_revisions kr
    where kr.id = dj.revision_id
      and kr.source_id = p_source_id
      and dj.status in ('pending', 'retry', 'processing')
    returning dj.revision_id
  )
  select coalesce(array_agg(revision_id), '{}'::uuid[])
  into cancelled_revision_ids
  from cancelled;

  update public.knowledge_revisions
  set status = 'failed',
      error_message = 'knowledge_rights_revoked'
  where id = any(cancelled_revision_ids)
    and status in ('queued', 'processing');

  insert into public.audit_events (
    actor_id,
    expert_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) values (
    auth.uid(),
    source_row.expert_id,
    'knowledge.rights_revoked',
    'knowledge_source',
    p_source_id,
    jsonb_build_object(
      'reason', left(btrim(coalesce(p_reason, '')), 1000),
      'cancelled_job_count', cardinality(cancelled_revision_ids)
    )
  );
end;
$$;

revoke all on function public.revoke_knowledge_source_rights(uuid, text)
from public, anon, authenticated;
grant execute on function public.revoke_knowledge_source_rights(uuid, text)
to authenticated;

-- Persist worker output atomically only while the source still has an explicit,
-- current distillation grant. The source row is locked first so revocation and
-- completion are linearizable and use consistent lock ordering.
create or replace function public.complete_distillation_job(
  p_job_id uuid,
  p_worker_id text,
  p_extracted_text text,
  p_distilled_json jsonb,
  p_content_hash text,
  p_provider_meta jsonb,
  p_chunks jsonb
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  target_revision_id uuid;
  target_source_id uuid;
  job_row public.distillation_jobs%rowtype;
  revision_row public.knowledge_revisions%rowtype;
  source_row public.knowledge_sources%rowtype;
begin
  if jsonb_typeof(coalesce(p_chunks, 'null'::jsonb)) <> 'array'
     or jsonb_array_length(p_chunks) not between 1 and 500 then
    raise exception 'invalid_distillation_chunks' using errcode = '22023';
  end if;

  select dj.revision_id, kr.source_id
  into target_revision_id, target_source_id
  from public.distillation_jobs dj
  join public.knowledge_revisions kr on kr.id = dj.revision_id
  where dj.id = p_job_id;
  if target_revision_id is null or target_source_id is null then
    raise exception 'distillation_job_not_found' using errcode = 'P0002';
  end if;

  select * into source_row
  from public.knowledge_sources
  where id = target_source_id
  for update;
  if source_row.archived_at is not null then
    raise exception 'knowledge_source_archived' using errcode = '23514';
  end if;
  if source_row.rights_status <> 'granted'
     or source_row.revoked_at is not null
     or (source_row.expires_at is not null and source_row.expires_at <= now())
     or source_row.rights_scope -> 'distillation' is distinct from 'true'::jsonb then
    raise exception 'knowledge_distillation_not_authorized' using errcode = '23514';
  end if;

  select * into job_row
  from public.distillation_jobs
  where id = p_job_id
  for update;
  select * into revision_row
  from public.knowledge_revisions
  where id = target_revision_id
  for update;

  if job_row.status <> 'processing'
     or job_row.locked_by is distinct from left(p_worker_id, 120) then
    raise exception 'distillation_job_lease_mismatch' using errcode = '55000';
  end if;
  if revision_row.source_id <> source_row.id
     or revision_row.status <> 'processing' then
    raise exception 'revision_not_eligible_for_completion' using errcode = '55000';
  end if;
  if exists (
    select 1
    from jsonb_to_recordset(p_chunks) as c(
      chunk_index integer,
      content text,
      embedding text,
      citation_meta jsonb,
      token_count integer
    )
    where c.chunk_index is null
      or c.chunk_index < 0
      or nullif(btrim(c.content), '') is null
      or nullif(btrim(c.embedding), '') is null
      or c.token_count is null
      or c.token_count < 1
  ) then
    raise exception 'invalid_distillation_chunk_payload' using errcode = '22023';
  end if;

  delete from public.knowledge_chunks
  where revision_id = revision_row.id;
  insert into public.knowledge_chunks (
    revision_id,
    source_id,
    expert_id,
    chunk_index,
    content,
    embedding,
    citation_meta,
    token_count
  )
  select
    revision_row.id,
    source_row.id,
    source_row.expert_id,
    c.chunk_index,
    c.content,
    c.embedding::extensions.halfvec(1536),
    coalesce(c.citation_meta, '{}'::jsonb),
    c.token_count
  from jsonb_to_recordset(p_chunks) as c(
    chunk_index integer,
    content text,
    embedding text,
    citation_meta jsonb,
    token_count integer
  );

  update public.knowledge_revisions
  set extracted_text = p_extracted_text,
      distilled_json = coalesce(p_distilled_json, '{}'::jsonb),
      content_hash = p_content_hash,
      status = 'review',
      provider_meta = coalesce(p_provider_meta, '{}'::jsonb),
      error_message = null
  where id = revision_row.id;
  update public.distillation_jobs
  set stage = 'complete',
      status = 'complete',
      error_message = null,
      locked_at = null,
      locked_by = null,
      updated_at = now()
  where id = job_row.id;
end;
$$;

revoke all on function public.complete_distillation_job(
  uuid, text, text, jsonb, text, jsonb, jsonb
) from public, anon, authenticated;
grant execute on function public.complete_distillation_job(
  uuid, text, text, jsonb, text, jsonb, jsonb
) to service_role;
