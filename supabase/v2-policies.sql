-- AIGRO Supabase v2 Policies — 喺 SQL Editor 執行(需要先跑過 schema.sql + admin-policies.sql)
-- 1) Admin 可以升級會員(role/tier)
-- 2) 專家可以喺 Portal 發佈情報(items.expert_slug + insert/select policies)
-- 3) CRM leads 加 email(對話 capture 直接變可聯絡線索)

-- ============ 1. Admin 升級會員 ============
create policy "profiles_admin_update" on public.profiles
  for update using (public.is_admin()) with check (public.is_admin());

-- ============ 2. 專家發佈情報 ============
-- items 加 expert_slug(專家投稿標記;管道情報係 NULL)
alter table public.items add column if not exists expert_slug text;
create index if not exists idx_items_expert_slug on public.items(expert_slug);

-- 專家可以 insert 自己嘅投稿(強制 status='pending' + 自己 slug)
create policy "items_expert_insert" on public.items
  for insert with check (
    status = 'pending'
    and expert_slug is not null
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'expert'
        and p.expert_slug = items.expert_slug
    )
  );

-- 專家可以睇返自己嘅投稿(包括 pending/rejected;published 本來就公開)
create policy "items_expert_read_own" on public.items
  for select using (
    expert_slug is not null
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.expert_slug = items.expert_slug
    )
  );

-- 專家可以改返自己未發佈嘅投稿(修改/撤回;唔准自己發佈)
create policy "items_expert_update_own" on public.items
  for update using (
    expert_slug is not null
    and status in ('pending','rejected')
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.expert_slug = items.expert_slug
    )
  ) with check (
    status in ('pending','rejected')
  );

-- ============ 3. CRM leads 加 email ============
alter table public.leads add column if not exists email text;

-- 訪客留 email 時可以順便 update 返自己條 lead(anon owner)
create policy "leads_anon_update_own" on public.leads
  for update using (anon_id is not null) with check (anon_id is not null);

-- ============ 4. 專家睇自己 persona 嘅 leads(Portal CRM) ============
create policy "leads_expert_read_own" on public.leads
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.expert_slug is not null and p.expert_slug = leads.persona
    )
  );
