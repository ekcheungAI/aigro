-- Keep connector endpoints and future auth references out of browser-readable
-- public.sources. The Vercel admin proxy is the only writer for connectors.

create table if not exists public.source_connectors (
  source_id uuid primary key references public.sources(id) on delete cascade,
  endpoint text not null,
  auth_secret_ref text,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.source_connectors enable row level security;

-- Move existing feed URLs before revoking public.sources access. This is an
-- idempotent, one-way migration: connector secrets remain server-only and the
-- legacy column is cleared so a future grant cannot accidentally expose them.
insert into public.source_connectors (source_id, endpoint)
select id, endpoint
from public.sources
where endpoint is not null and btrim(endpoint) <> ''
on conflict (source_id) do nothing;

update public.sources
set endpoint = null
where endpoint is not null;

revoke all on public.source_connectors from anon, authenticated;
grant all on public.source_connectors to service_role;

-- Existing public joins only need these non-sensitive source fields. In
-- particular, endpoint must not be readable by anonymous or member clients.
revoke all on public.sources from anon, authenticated;
grant select (
  id,
  name,
  type,
  domain,
  vertical,
  lang,
  weight,
  fetch_interval_minutes,
  status,
  last_fetched_at,
  health,
  created_at
) on public.sources to anon, authenticated;

alter table public.sources drop constraint if exists sources_type_check;
alter table public.sources add constraint sources_type_check
  check (type in ('rss', 'api', 'scraper', 'mcp'));

create or replace function public.touch_source_connector_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists source_connectors_touch on public.source_connectors;
create trigger source_connectors_touch
before update on public.source_connectors
for each row execute function public.touch_source_connector_updated_at();
