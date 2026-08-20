-- Finalize a distillation failure only while the caller still owns the exact
-- processing lease. Job and revision state move together in one transaction,
-- so completion ACK loss or a concurrent rights revoke cannot be regressed by
-- a stale worker's catch handler.
create or replace function public.fail_distillation_job(
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
  job_row public.distillation_jobs%rowtype;
  revision_status text;
  safe_error text := left(
    coalesce(nullif(btrim(p_error_message), ''), 'distillation_failed'),
    1000
  );
begin
  if nullif(btrim(coalesce(p_worker_id, '')), '') is null
     or p_retry is null then
    raise exception 'invalid_distillation_failure_request' using errcode = '22023';
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

  if not found or revision_status not in ('queued', 'processing') then
    return false;
  end if;

  update public.distillation_jobs
  set status = case when p_retry then 'retry' else 'failed' end,
      next_retry_at = case
        when p_retry then greatest(
          coalesce(p_next_retry_at, now() + interval '1 minute'),
          now()
        )
        else next_retry_at
      end,
      error_message = safe_error,
      locked_at = null,
      locked_by = null,
      updated_at = now()
  where id = job_row.id;

  update public.knowledge_revisions
  set status = case when p_retry then 'queued' else 'failed' end,
      error_message = safe_error
  where id = job_row.revision_id;

  return true;
end;
$$;

revoke all on function public.fail_distillation_job(
  uuid, text, text, boolean, timestamptz
) from public, anon, authenticated;
grant execute on function public.fail_distillation_job(
  uuid, text, text, boolean, timestamptz
) to service_role;
