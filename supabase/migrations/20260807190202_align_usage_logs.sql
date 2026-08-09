-- Production predates the consolidated baseline, so CREATE TABLE IF NOT EXISTS
-- did not add the chat telemetry columns to its older usage_logs table.

alter table public.usage_logs
  add column if not exists model text,
  add column if not exists input_tokens integer,
  add column if not exists output_tokens integer,
  add column if not exists latency_ms integer,
  add column if not exists request_id text,
  add column if not exists status text not null default 'ok',
  add column if not exists error_message text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.usage_logs'::regclass
      and conname = 'usage_logs_status_check'
  ) then
    alter table public.usage_logs
      add constraint usage_logs_status_check
      check (status in ('ok', 'error'));
  end if;
end;
$$;

create index if not exists usage_logs_request_id_idx
on public.usage_logs(request_id)
where request_id is not null;
