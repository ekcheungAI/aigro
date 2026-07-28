-- AIGRO Supabase v3 — 導師知識庫 + 專家公開檔案
-- 喺 SQL Editor 執行(需要先跑過 schema.sql + admin-policies.sql + v2-policies.sql)

-- ============ 1. EXPERT_KNOWLEDGE(導師上傳知識,分身 RAG 用) ============
create table if not exists public.expert_knowledge (
  id uuid primary key default gen_random_uuid(),
  expert_slug text not null,            -- jimmy-lau / elvin-cheung
  kind text not null default 'note' check (kind in ('note','link','file','video','playbook')),
  title text not null,
  content text not null default '',     -- 文字內容/摘要/重點(分身會讀呢段)
  url text,                             -- 原文/影片連結(如有)
  tags text[] default '{}',
  status text not null default 'active' check (status in ('active','archived')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_expert_knowledge_slug on public.expert_knowledge(expert_slug, status, created_at desc);

alter table public.expert_knowledge enable row level security;

-- 專家管理自己嘅知識庫
create policy "ek_expert_all_own" on public.expert_knowledge
  for all using (
    exists (select 1 from public.profiles p
            where p.id = auth.uid() and p.expert_slug = expert_knowledge.expert_slug)
  ) with check (
    exists (select 1 from public.profiles p
            where p.id = auth.uid() and p.expert_slug = expert_knowledge.expert_slug)
  );

-- admin 全權
create policy "ek_admin_all" on public.expert_knowledge
  for all using (public.is_admin()) with check (public.is_admin());

-- 公開讀 active(分身 RAG + 未來公開展示;敏感內容請用 archived)
create policy "ek_public_read_active" on public.expert_knowledge
  for select using (status = 'active');

-- ============ 2. EXPERT_PROFILES(專家公開檔案頁內容) ============
create table if not exists public.expert_profiles (
  slug text primary key,                -- jimmy-lau / elvin-cheung
  headline text default '',             -- 一句定位
  bio text default '',
  stats jsonb default '[]',             -- [{label, value}] 自訂亮點(真實數字)
  socials jsonb default '[]',           -- [{label, url}]
  featured_ids text[] default '{}',     -- 置頂情報 items.id(最多 3)
  updated_at timestamptz default now()
);

alter table public.expert_profiles enable row level security;

create policy "ep_public_read" on public.expert_profiles
  for select using (true);

create policy "ep_expert_update_own" on public.expert_profiles
  for update using (
    exists (select 1 from public.profiles p
            where p.id = auth.uid() and p.expert_slug = expert_profiles.slug)
  ) with check (
    exists (select 1 from public.profiles p
            where p.id = auth.uid() and p.expert_slug = expert_profiles.slug)
  );

create policy "ep_admin_all" on public.expert_profiles
  for all using (public.is_admin()) with check (public.is_admin());

-- 種子:兩位領航專家嘅初始檔案(內容係已核實嘅真實資料)
insert into public.expert_profiles (slug, headline, socials) values
  ('jimmy-lau', 'DotAI 聯合創辦人 · 香港 AI-First 與語境工程推動者',
   '[{"label":"dotai.hk","url":"https://dotai.hk"},{"label":"LinkedIn","url":"https://hk.linkedin.com/in/jimmy-lau-hk"}]'),
  ('elvin-cheung', 'SuperBash 主辦人 · Perskill / AIGRO 發起人 · AI 實戰 growth hacker',
   '[{"label":"YouTube","url":"https://www.youtube.com/@ekcheungAI"},{"label":"Instagram","url":"https://www.instagram.com/ekcheungai"},{"label":"X","url":"https://x.com/ekcheungAI"},{"label":"Threads","url":"https://www.threads.net/@ekcheungai"}]')
on conflict (slug) do nothing;
