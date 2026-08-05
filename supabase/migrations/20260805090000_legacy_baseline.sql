-- Consolidated baseline for a fresh AIGRO Supabase project.
-- Replaces the former schema.sql + admin/v2/v3/v4 manual SQL sequence.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  name text not null default '',
  role text not null default 'free' check (role in ('free','founding','expert','admin')),
  tier text not null default 'free' check (tier in ('free','pro','vip')),
  persona text,
  interests text[] default '{}',
  goals text[] default '{}',
  company text,
  role_title text,
  team_size text,
  city text default '香港',
  social text,
  referral text,
  notifications jsonb default '{"daily":true,"weekly":true,"product":false}',
  expert_slug text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  kind text not null check (kind in ('mcp','expert','partner','newsletter','vip')),
  vertical text,
  role text,
  note text,
  source text default 'web',
  created_at timestamptz default now(),
  unique(email, kind, vertical)
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  anon_id text,
  persona text not null default 'platform',
  title text,
  created_at timestamptz default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.conversations(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  source text default 'kb',
  confidence numeric,
  citations jsonb default '[]',
  created_at timestamptz default now()
);

create table if not exists public.sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('rss','api','scraper')),
  domain text,
  endpoint text,
  vertical text not null default 'ai',
  lang text default 'en',
  weight numeric default 5,
  fetch_interval_minutes int default 120,
  status text default 'active' check (status in ('active','paused','pending','error')),
  last_fetched_at timestamptz,
  health text default 'ok' check (health in ('ok','warn','down')),
  created_at timestamptz default now()
);

create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references public.sources(id) on delete set null,
  title text not null,
  summary text,
  local_commentary text,
  original_url text,
  category text,
  tags text[] default '{}',
  score numeric,
  lang text default 'en',
  status text default 'pending' check (status in ('pending','reviewed','published','rejected')),
  placement text default 'normal' check (placement in ('normal','daily','featured')),
  fingerprint text unique,
  expert_slug text,
  published_at timestamptz,
  fetched_at timestamptz default now()
);
create index if not exists idx_items_status on public.items(status, published_at desc);
create index if not exists idx_items_category on public.items(category);
create index if not exists idx_items_expert_slug on public.items(expert_slug);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  anon_id text,
  persona text not null default 'platform',
  score numeric default 0,
  signals text[] default '{}',
  stage text default '新線索' check (stage in ('新線索','已接觸','跟進中','已轉化')),
  questions jsonb default '[]',
  analysis text,
  timeline jsonb default '[]',
  email text,
  last_activity_at timestamptz default now(),
  created_at timestamptz default now()
);

create table if not exists public.usage_logs (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  endpoint text,
  model text,
  input_tokens int,
  output_tokens int,
  tokens int,
  cost_usd numeric,
  latency_ms int,
  request_id text,
  status text not null default 'ok' check (status in ('ok', 'error')),
  error_message text,
  created_at timestamptz default now()
);

create table if not exists public.expert_knowledge (
  id uuid primary key default gen_random_uuid(),
  expert_slug text not null,
  kind text not null default 'note' check (kind in ('note','link','file','video','playbook')),
  title text not null,
  content text not null default '',
  url text,
  tags text[] default '{}',
  status text not null default 'active' check (status in ('active','archived')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.expert_profiles (
  slug text primary key,
  headline text default '',
  bio text default '',
  stats jsonb default '[]',
  socials jsonb default '[]',
  featured_ids text[] default '{}',
  updated_at timestamptz default now()
);

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;

create or replace function public.is_admin() returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

alter table public.profiles enable row level security;
alter table public.waitlist enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.leads enable row level security;
alter table public.items enable row level security;
alter table public.sources enable row level security;
alter table public.usage_logs enable row level security;
alter table public.expert_knowledge enable row level security;
alter table public.expert_profiles enable row level security;

create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_admin_read" on public.profiles for select using (public.is_admin());
create policy "profiles_admin_update" on public.profiles for update using (public.is_admin()) with check (public.is_admin());
create policy "waitlist_insert_all" on public.waitlist for insert with check (true);
create policy "waitlist_admin_read" on public.waitlist for select using (public.is_admin());
create policy "conv_owner_all" on public.conversations for all
  using (auth.uid() = user_id or anon_id is not null)
  with check (auth.uid() = user_id or anon_id is not null);
create policy "msg_owner_all" on public.messages for all
  using (exists (select 1 from public.conversations c where c.id = conversation_id and (c.user_id = auth.uid() or c.anon_id is not null)))
  with check (exists (select 1 from public.conversations c where c.id = conversation_id and (c.user_id = auth.uid() or c.anon_id is not null)));
create policy "conv_admin_read" on public.conversations for select using (public.is_admin());
create policy "msg_admin_read" on public.messages for select using (public.is_admin());
create policy "items_public_read" on public.items for select using (status = 'published');
create policy "items_admin_all" on public.items for all using (public.is_admin()) with check (public.is_admin());
create policy "sources_public_read" on public.sources for select using (status = 'active');
create policy "sources_admin_all" on public.sources for all using (public.is_admin()) with check (public.is_admin());
create policy "leads_insert_all" on public.leads for insert with check (true);
create policy "leads_owner_read" on public.leads for select using (auth.uid() = user_id);
create policy "leads_anon_update_own" on public.leads for update using (anon_id is not null) with check (anon_id is not null);
create policy "leads_admin_all" on public.leads for all using (public.is_admin()) with check (public.is_admin());
create policy "usage_admin_read" on public.usage_logs for select using (public.is_admin());
create policy "ek_expert_all_own" on public.expert_knowledge for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.expert_slug = expert_knowledge.expert_slug))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.expert_slug = expert_knowledge.expert_slug));
create policy "ek_admin_all" on public.expert_knowledge for all using (public.is_admin()) with check (public.is_admin());
create policy "ek_public_read_active" on public.expert_knowledge for select using (status = 'active');
create policy "ep_public_read" on public.expert_profiles for select using (true);
create policy "ep_expert_update_own" on public.expert_profiles for update
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.expert_slug = expert_profiles.slug))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.expert_slug = expert_profiles.slug));
create policy "ep_admin_all" on public.expert_profiles for all using (public.is_admin()) with check (public.is_admin());

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
for each row execute function public.touch_updated_at();

insert into public.expert_profiles (slug, headline, socials) values
  ('jimmy-lau', 'DotAI 聯合創辦人 · 香港 AI-First 與語境工程推動者',
   '[{"label":"dotai.hk","url":"https://dotai.hk"}]'),
  ('elvin-cheung', 'SuperBash 主辦人 · AIGRO 發起人 · AI 實戰 growth hacker',
   '[{"label":"YouTube","url":"https://www.youtube.com/@ekcheungAI"}]')
on conflict (slug) do nothing;

revoke all on public.usage_logs from anon, authenticated;
