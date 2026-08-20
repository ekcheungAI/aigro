-- AIGRO Supabase v4 — MiniMax-M3 usage telemetry
-- Apply after schema.sql + admin-policies.sql + v2-policies.sql + v3-policies.sql.

alter table public.usage_logs enable row level security;

alter table public.usage_logs
  add column if not exists model text,
  add column if not exists input_tokens int,
  add column if not exists output_tokens int,
  add column if not exists latency_ms int,
  add column if not exists request_id text,
  add column if not exists status text not null default 'ok'
    check (status in ('ok', 'error')),
  add column if not exists error_message text;

create index if not exists idx_usage_logs_provider_created
  on public.usage_logs(provider, created_at desc);

-- No anon/authenticated policy: only server secret clients may write usage logs.
revoke all on public.usage_logs from anon, authenticated;
