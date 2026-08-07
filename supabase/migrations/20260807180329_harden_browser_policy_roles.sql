-- Keep public reads independent from protected member tables. Legacy policies
-- were created without a TO clause, so PostgreSQL evaluated expert-only SELECT
-- predicates for the `anon` role as well. Those predicates queried profiles,
-- whose table grant is intentionally private, and caused otherwise-public item
-- reads to fail with `permission denied for table profiles`.

alter policy availability_public_read on public.availability_rules
  to anon, authenticated;
alter policy exceptions_public_available on public.availability_exceptions
  to anon, authenticated;

alter policy ep_public_read on public.expert_profiles
  to anon, authenticated;
alter policy ep_admin_all on public.expert_profiles
  to authenticated;
drop policy if exists ep_expert_update_own on public.expert_profiles;
create policy ep_expert_update_own on public.expert_profiles
for update to authenticated
using (exists (
  select 1 from public.experts e
  where e.slug = expert_profiles.slug and public.owns_expert(e.id)
))
with check (exists (
  select 1 from public.experts e
  where e.slug = expert_profiles.slug and public.owns_expert(e.id)
));

drop policy if exists experts_public_active on public.experts;
create policy experts_public_active on public.experts
for select to anon, authenticated
using (status = 'active');

alter policy items_public_read on public.items
  to anon, authenticated;
alter policy items_admin_all on public.items
  to authenticated;
drop policy if exists items_expert_insert on public.items;
create policy items_expert_insert on public.items
for insert to authenticated
with check (
  status = 'pending'
  and expert_slug is not null
  and exists (
    select 1 from public.experts e
    where e.slug = items.expert_slug and public.owns_expert(e.id)
  )
);
drop policy if exists items_expert_read_own on public.items;
create policy items_expert_read_own on public.items
for select to authenticated
using (
  expert_slug is not null
  and exists (
    select 1 from public.experts e
    where e.slug = items.expert_slug and public.owns_expert(e.id)
  )
);
drop policy if exists items_expert_update_own on public.items;
create policy items_expert_update_own on public.items
for update to authenticated
using (
  expert_slug is not null
  and status in ('pending', 'rejected')
  and exists (
    select 1 from public.experts e
    where e.slug = items.expert_slug and public.owns_expert(e.id)
  )
)
with check (status in ('pending', 'rejected'));

alter policy sources_public_read on public.sources
  to anon, authenticated;
alter policy sources_admin_all on public.sources
  to authenticated;

alter policy conv_admin_read on public.conversations
  to authenticated;
drop policy if exists conv_expert_read_own on public.conversations;
create policy conv_expert_read_own on public.conversations
for select to authenticated
using (expert_id is not null and public.owns_expert(expert_id));

alter policy msg_admin_read on public.messages
  to authenticated;
alter policy leads_admin_all on public.leads
  to authenticated;
drop policy if exists leads_expert_read_own on public.leads;
create policy leads_expert_read_own on public.leads
for select to authenticated
using (exists (
  select 1 from public.experts e
  where e.slug = leads.persona and public.owns_expert(e.id)
));

alter policy profiles_admin_read on public.profiles to authenticated;
alter policy profiles_admin_update on public.profiles to authenticated;
alter policy profiles_insert_own on public.profiles to authenticated;
alter policy profiles_select_own on public.profiles to authenticated;
alter policy profiles_update_own on public.profiles to authenticated;

alter policy ek_admin_all on public.expert_knowledge to authenticated;
drop policy if exists ek_expert_all_own on public.expert_knowledge;
create policy ek_expert_all_own on public.expert_knowledge
for all to authenticated
using (exists (
  select 1 from public.experts e
  where e.slug = expert_knowledge.expert_slug and public.owns_expert(e.id)
))
with check (exists (
  select 1 from public.experts e
  where e.slug = expert_knowledge.expert_slug and public.owns_expert(e.id)
));

alter policy usage_admin_read on public.usage_logs to authenticated;
alter policy waitlist_admin_read on public.waitlist to authenticated;
alter policy waitlist_insert_all on public.waitlist to anon, authenticated;

-- Security-definer business mutations must never inherit PostgreSQL's default
-- EXECUTE grant to PUBLIC. Auth checks remain inside each function as defense
-- in depth, while the API surface is now explicit.
revoke all on function public.create_knowledge_source(text, text, text, text, text, text, text[])
  from public, anon;
revoke all on function public.review_knowledge_revision(uuid, text, text)
  from public, anon;
revoke all on function public.rollback_knowledge_source(uuid, uuid)
  from public, anon;
revoke all on function public.queue_persona_synthesis(uuid)
  from public, anon;
revoke all on function public.review_persona_synthesis(uuid, text, text, boolean)
  from public, anon;
revoke all on function public.publish_compiled_persona(uuid, text, jsonb)
  from public, anon;
revoke all on function public.cancel_booking(uuid)
  from public, anon;
revoke all on function public.reschedule_booking(uuid, timestamptz)
  from public, anon;
revoke all on function public.update_booking_status(uuid, text, text, text)
  from public, anon;
revoke all on function public.list_available_slots(text, date, date)
  from public, anon;

grant execute on function public.create_knowledge_source(text, text, text, text, text, text, text[])
  to authenticated;
grant execute on function public.review_knowledge_revision(uuid, text, text)
  to authenticated;
grant execute on function public.rollback_knowledge_source(uuid, uuid)
  to authenticated;
grant execute on function public.queue_persona_synthesis(uuid)
  to authenticated;
grant execute on function public.review_persona_synthesis(uuid, text, text, boolean)
  to authenticated;
grant execute on function public.publish_compiled_persona(uuid, text, jsonb)
  to authenticated;
grant execute on function public.cancel_booking(uuid)
  to authenticated;
grant execute on function public.reschedule_booking(uuid, timestamptz)
  to authenticated;
grant execute on function public.update_booking_status(uuid, text, text, text)
  to authenticated;
grant execute on function public.list_available_slots(text, date, date)
  to authenticated;

-- Trigger and event-trigger helpers are implementation details, not RPCs.
revoke all on function public.ensure_account_access() from public, anon, authenticated;
revoke all on function public.protect_profile_access_fields() from public, anon, authenticated;
revoke all on function public.notify_booking_change() from public, anon, authenticated;
revoke all on function public.notify_distillation_worker() from public, anon, authenticated;
revoke all on function public.notify_persona_compiler() from public, anon, authenticated;
revoke all on function public.audit_account_access_change() from public, anon, authenticated;
revoke all on function public.protect_super_admin_invariants() from public, anon, authenticated;
revoke all on function public.sync_profile_from_account_access() from public, anon, authenticated;
revoke all on function public.touch_updated_at() from public, anon, authenticated;

-- Some hosted projects have Supabase's RLS event-trigger helper while a fresh
-- local stack does not. Revoke it when present without making migrations
-- environment-dependent.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke all on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end $$;

revoke all on function public.is_admin() from anon;
revoke all on function public.is_super_admin() from anon;
revoke all on function public.owns_expert(uuid) from anon;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_super_admin() to authenticated;
grant execute on function public.owns_expert(uuid) to authenticated;
