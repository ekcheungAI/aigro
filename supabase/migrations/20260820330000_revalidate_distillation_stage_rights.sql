-- Extraction can outlive a rights grant. Revalidate authorization immediately
-- before every provider-facing stage using the canonical source -> job ->
-- revision lock order shared by start, completion, and revocation.
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
  target_revision_id uuid;
  target_source_id uuid;
  source_row public.knowledge_sources%rowtype;
  job_row public.distillation_jobs%rowtype;
  revision_row public.knowledge_revisions%rowtype;
begin
  if p_stage not in ('distill', 'embed')
     or nullif(btrim(coalesce(p_worker_id, '')), '') is null then
    raise exception 'invalid_distillation_stage_request' using errcode = '22023';
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
  if not found then
    return false;
  end if;

  select * into job_row
  from public.distillation_jobs
  where id = p_job_id
  for update;
  select * into revision_row
  from public.knowledge_revisions
  where id = target_revision_id
  for update;

  if source_row.archived_at is not null
     or source_row.rights_status <> 'granted'
     or source_row.revoked_at is not null
     or (source_row.expires_at is not null and source_row.expires_at <= now())
     or source_row.rights_scope -> 'distillation' is distinct from 'true'::jsonb then
    raise exception 'knowledge_distillation_not_authorized' using errcode = '23514';
  end if;

  if job_row.id is null
     or job_row.revision_id is distinct from target_revision_id
     or job_row.status <> 'processing'
     or job_row.locked_by is distinct from left(p_worker_id, 120)
     or revision_row.id is null
     or revision_row.source_id is distinct from source_row.id
     or revision_row.status <> 'processing' then
    return false;
  end if;

  update public.distillation_jobs
  set stage = p_stage,
      updated_at = now()
  where id = job_row.id;
  return true;
end;
$$;

revoke all on function public.advance_distillation_job_stage(uuid, text, text)
from public, anon, authenticated;
grant execute on function public.advance_distillation_job_stage(uuid, text, text)
to service_role;
