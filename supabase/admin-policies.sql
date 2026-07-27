-- AIGRO Admin RLS Policies — 喺 Supabase SQL Editor 一次過執行
-- 目的:俾已登入嘅 admin(profiles.role='admin')讀寫後台需要嘅表。
-- 前提:schema.sql 已執行;你自己已經喺網站 /login 用 magic link 登入過一次
--       (咁樣 profiles 先會有你嘅 row)。

-- ============ 1. is_admin() helper(security definer 繞過 RLS 自查) ============
create or replace function public.is_admin() returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer stable;

-- ============ 2. Admin 讀取 policies ============
-- profiles:admin 可以睇全部會員(AdminMembers)
create policy "profiles_admin_read" on public.profiles
  for select using (public.is_admin());

-- waitlist:admin 可以睇全部名單(AdminEmails / Dashboard)
create policy "waitlist_admin_read" on public.waitlist
  for select using (public.is_admin());

-- conversations/messages:admin 可以睇全部對話(AdminEngagement / Dashboard / Portal 專家統計)
create policy "conv_admin_read" on public.conversations
  for select using (public.is_admin());
create policy "msg_admin_read" on public.messages
  for select using (public.is_admin());

-- leads:admin 全權(AdminCRM / PortalLeads)
create policy "leads_admin_all" on public.leads
  for all using (public.is_admin()) with check (public.is_admin());

-- items:admin 可以睇 pending/rejected + 改 status(AdminContent 審核佇列)
create policy "items_admin_all" on public.items
  for all using (public.is_admin()) with check (public.is_admin());

-- sources:admin 可以管理來源(AdminSources)
create policy "sources_admin_all" on public.sources
  for all using (public.is_admin()) with check (public.is_admin());

-- usage_logs:admin 讀(成本監察)
create policy "usage_admin_read" on public.usage_logs
  for select using (public.is_admin());

-- ============ 3. 將你自己升級做 admin(改做你登入用嘅 email) ============
-- update public.profiles set role = 'admin' where email = 'you@example.com';

-- ============ 4. 專家讀取自己 persona 嘅對話(Portal 用,可選) ============
-- 專家(profiles.expert_slug 有值)可以睇自己 persona 嘅對話統計
create policy "conv_expert_read_own" on public.conversations
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.expert_slug is not null and p.expert_slug = persona
    )
  );
