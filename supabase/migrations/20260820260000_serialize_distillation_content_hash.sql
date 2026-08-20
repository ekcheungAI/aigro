-- Serialize completion by instructor and content hash, then repeat the
-- duplicate lookup inside the authoritative transaction. Two workers that
-- both passed an earlier client-side lookup cannot create two corpus sources.
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
  if nullif(btrim(coalesce(p_content_hash, '')), '') is null then
    raise exception 'invalid_distillation_content_hash' using errcode = '22023';
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

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      source_row.expert_id::text || ':' || btrim(p_content_hash),
      0
    )
  );
  if exists (
    select 1
    from public.knowledge_revisions other_revision
    join public.knowledge_sources other_source
      on other_source.id = other_revision.source_id
    where other_source.expert_id = source_row.expert_id
      and other_revision.source_id <> source_row.id
      and other_revision.content_hash = p_content_hash
  ) then
    raise exception 'knowledge_content_duplicate' using errcode = '23505';
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

create or replace function public.start_distillation_job(
  p_job_id uuid,
  p_worker_id text
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  target_revision_id uuid;
  target_source_id uuid;
  source_row public.knowledge_sources%rowtype;
  job_row public.distillation_jobs%rowtype;
  revision_row public.knowledge_revisions%rowtype;
begin
  if nullif(btrim(coalesce(p_worker_id, '')), '') is null then
    raise exception 'invalid_distillation_start_request' using errcode = '22023';
  end if;

  select dj.revision_id, kr.source_id
  into target_revision_id, target_source_id
  from public.distillation_jobs dj
  join public.knowledge_revisions kr on kr.id = dj.revision_id
  where dj.id = p_job_id;
  if target_revision_id is null or target_source_id is null then
    return false;
  end if;

  select * into source_row
  from public.knowledge_sources
  where id = target_source_id
  for update;
  select * into job_row
  from public.distillation_jobs
  where id = p_job_id
  for update;
  select * into revision_row
  from public.knowledge_revisions
  where id = target_revision_id
  for update;

  if job_row.status <> 'processing'
     or job_row.locked_by is distinct from left(p_worker_id, 120)
     or revision_row.id is null
     or revision_row.source_id <> source_row.id
     or revision_row.status not in ('queued', 'processing') then
    return false;
  end if;
  if source_row.archived_at is not null
     or source_row.rights_status <> 'granted'
     or source_row.revoked_at is not null
     or (source_row.expires_at is not null and source_row.expires_at <= now())
     or source_row.rights_scope -> 'distillation' is distinct from 'true'::jsonb then
    raise exception 'knowledge_distillation_not_authorized' using errcode = '23514';
  end if;

  update public.knowledge_revisions
  set status = 'processing', error_message = null
  where id = revision_row.id;
  update public.distillation_jobs
  set stage = 'extract', error_message = null, updated_at = now()
  where id = job_row.id;
  return true;
end;
$$;

create or replace function public.advance_distillation_job_stage(
  p_job_id uuid,
  p_worker_id text,
  p_stage text
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  job_row public.distillation_jobs%rowtype;
  revision_status text;
begin
  if p_stage not in ('distill', 'embed')
     or nullif(btrim(coalesce(p_worker_id, '')), '') is null then
    raise exception 'invalid_distillation_stage_request' using errcode = '22023';
  end if;

  select * into job_row
  from public.distillation_jobs
  where id = p_job_id
  for update;
  if not found
     or job_row.status <> 'processing'
     or job_row.locked_by is distinct from left(p_worker_id, 120) then
    return false;
  end if;

  select status into revision_status
  from public.knowledge_revisions
  where id = job_row.revision_id
  for update;
  if revision_status is distinct from 'processing' then
    return false;
  end if;

  update public.distillation_jobs
  set stage = p_stage, updated_at = now()
  where id = job_row.id;
  return true;
end;
$$;

create or replace function public.requeue_stuck_distillation_jobs()
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  stuck_job public.distillation_jobs%rowtype;
  retry_job boolean;
  lease_error constant text := 'Worker lease expired';
begin
  for stuck_job in
    select *
    from public.distillation_jobs
    where status = 'processing'
      and locked_at < now() - interval '15 minutes'
    order by locked_at, id
    for update skip locked
  loop
    retry_job := stuck_job.attempts < 3;

    update public.knowledge_revisions
    set status = case when retry_job then 'queued' else 'failed' end,
        error_message = coalesce(error_message, lease_error)
    where id = stuck_job.revision_id
      and status = 'processing';

    update public.distillation_jobs
    set status = case when retry_job then 'retry' else 'failed' end,
        next_retry_at = case when retry_job then now() else next_retry_at end,
        locked_at = null,
        locked_by = null,
        error_message = coalesce(error_message, lease_error),
        updated_at = now()
    where id = stuck_job.id
      and status = 'processing';
  end loop;
end;
$$;

revoke all on function public.start_distillation_job(uuid, text)
from public, anon, authenticated;
grant execute on function public.start_distillation_job(uuid, text)
to service_role;

revoke all on function public.advance_distillation_job_stage(uuid, text, text)
from public, anon, authenticated;
grant execute on function public.advance_distillation_job_stage(uuid, text, text)
to service_role;

revoke all on function public.requeue_stuck_distillation_jobs()
from public, anon, authenticated;
grant execute on function public.requeue_stuck_distillation_jobs()
to service_role;
