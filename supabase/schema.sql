-- AIGRO Supabase Schema v1 — 喺 Supabase SQL Editor 一次過執行
-- 次序:tables → indexes → RLS → seed

-- ============ 1. PROFILES(auth.users 延伸) ============
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
  expert_slug text,           -- 專家身份連結(jimmy-lau / elvin-cheung)
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============ 2. WAITLIST(所有名單統一) ============
create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  kind text not null check (kind in ('mcp','expert','partner','newsletter','vip')),
  vertical text,              -- mcp: ai/beauty/technology/finance/property/retail/other
  role text,                  -- builder 類型
  note text,                  -- partner/expert 申請備註
  source text default 'web',
  created_at timestamptz default now(),
  unique(email, kind, vertical)
);

-- ============ 3. 對話記錄 ============
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  anon_id text,               -- 未登入訪客
  persona text not null default 'platform',  -- platform / jimmy-lau / elvin-cheung
  title text,
  created_at timestamptz default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.conversations(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  source text default 'kb',   -- kb / llm / guardrail / scripted
  confidence numeric,
  citations jsonb default '[]',
  created_at timestamptz default now()
);

-- ============ 4. 情報管線 ============
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
  published_at timestamptz,
  fetched_at timestamptz default now()
);
create index if not exists idx_items_status on public.items(status, published_at desc);
create index if not exists idx_items_category on public.items(category);
create index if not exists idx_items_fingerprint on public.items(fingerprint);

-- ============ 5. CRM LEADS ============
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
  last_activity_at timestamptz default now(),
  created_at timestamptz default now()
);

-- ============ 6. 用量記錄 ============
create table if not exists public.usage_logs (
  id uuid primary key default gen_random_uuid(),
  provider text not null,      -- moonshot / firecrawl / openai
  endpoint text,
  tokens int,
  cost_usd numeric,
  created_at timestamptz default now()
);

-- ============ 7. RLS ============
alter table public.profiles enable row level security;
alter table public.waitlist enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.leads enable row level security;
alter table public.items enable row level security;
alter table public.sources enable row level security;

-- profiles: 自己讀寫自己
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);

-- waitlist: 任何人(含匿名)可 insert;讀取只限 service role
create policy "waitlist_insert_all" on public.waitlist for insert with check (true);

-- conversations/messages: 擁有者 + 匿名 owner(anon_id)讀寫
create policy "conv_owner_all" on public.conversations for all
  using (auth.uid() = user_id or anon_id is not null)
  with check (auth.uid() = user_id or anon_id is not null);
create policy "msg_owner_all" on public.messages for all
  using (exists (select 1 from public.conversations c where c.id = conversation_id and (c.user_id = auth.uid() or c.anon_id is not null)))
  with check (exists (select 1 from public.conversations c where c.id = conversation_id and (c.user_id = auth.uid() or c.anon_id is not null)));

-- items/sources: 公開讀 published;寫入只限 service role
create policy "items_public_read" on public.items for select using (status = 'published');
create policy "sources_public_read" on public.sources for select using (status = 'active');

-- leads: 擁有者讀;insert 公開(系統生成)
create policy "leads_insert_all" on public.leads for insert with check (true);
create policy "leads_owner_read" on public.leads for select using (auth.uid() = user_id);

-- ============ 8. updated_at trigger ============
create or replace function public.touch_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end $$ language plpgsql;
drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();

-- ============ 9. Seed:12 個 AI vertical 來源 ============
insert into public.sources (name, type, domain, endpoint, vertical, lang, weight) values
  ('OpenAI Blog','rss','openai.com','https://openai.com/blog/rss.xml','ai','en',9),
  ('Anthropic News','rss','anthropic.com','https://www.anthropic.com/news/rss.xml','ai','en',9),
  ('Google DeepMind','rss','deepmind.google','https://deepmind.google/blog/rss.xml','ai','en',8),
  ('HuggingFace Papers','api','huggingface.co','https://huggingface.co/papers','ai','en',7),
  ('TechCrunch AI','rss','techcrunch.com','https://techcrunch.com/category/artificial-intelligence/feed/','ai','en',6),
  ('The Decoder','rss','the-decoder.com','https://the-decoder.com/feed/','ai','en',6),
  ('36氪','rss','36kr.com','https://36kr.com/feed','ai','zh',7),
  ('量子位','rss','qbitai.com','https://www.qbitai.com/feed','ai','zh',8),
  ('數字生命卡茲克','scraper','mp.weixin.qq.com','firecrawl:kazike','ai','zh',8),
  ('IT之家','rss','ithome.com','https://www.ithome.com/rss/','ai','zh',5),
  ('Hacker News 熱門','api','news.ycombinator.com','https://hacker-news.firebaseio.com/v0/topstories.json','ai','en',6),
  ('X 精選帳號','api','x.com','tikhub:x-accounts','ai','en',7)
on conflict do nothing;
