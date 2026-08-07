-- AIGRO platform ownership and administrator separation.
--
-- `admin` can operate the product and manage member/expert access.
-- `super_admin` inherits admin access and is the only role allowed to manage
-- administrators. Auth-user lifecycle actions remain server-side only.

alter table public.account_access
  drop constraint if exists account_access_app_role_check;

alter table public.account_access
  add constraint account_access_app_role_check
  check (app_role in ('member', 'expert', 'admin', 'super_admin'));

create or replace function public.is_super_admin()
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.account_access
    where user_id = (select auth.uid())
      and app_role = 'super_admin'
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.account_access
    where user_id = (select auth.uid())
      and app_role in ('admin', 'super_admin')
  );
$$;

revoke all on function public.is_super_admin() from public, anon;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_super_admin() to authenticated;
-- Some legacy public policies call is_admin() without a TO clause. Anonymous
-- execution is safe (it always returns false without a uid) and avoids turning
-- those policies into permission errors.
grant execute on function public.is_admin() to anon, authenticated;

-- Keep the legacy profile columns as display-only mirrors. Authorization must
-- continue to use account_access. profiles.role intentionally maps a
-- super-admin to `admin` because the legacy column has no super-admin value.
create or replace function public.protect_profile_access_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  access_row public.account_access%rowtype;
begin
  select * into access_row
  from public.account_access
  where user_id = new.id;

  if found then
    new.role := case access_row.app_role
      when 'super_admin' then 'admin'
      when 'admin' then 'admin'
      when 'expert' then 'expert'
      else coalesce(nullif(old.role, ''), 'free')
    end;
    new.tier := access_row.tier;
    if access_row.expert_id is null then
      new.expert_slug := null;
    else
      select slug into new.expert_slug
      from public.experts
      where id = access_row.expert_id;
    end if;
  elsif tg_op = 'INSERT' then
    new.role := 'free';
    new.tier := 'free';
    new.expert_slug := null;
  else
    new.role := old.role;
    new.tier := old.tier;
    new.expert_slug := old.expert_slug;
  end if;
  return new;
end;
$$;

revoke all on function public.protect_profile_access_fields() from public, anon, authenticated;

create or replace function public.protect_super_admin_invariants()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  removing_super_admin boolean;
begin
  if old.app_role = 'super_admin' then
    removing_super_admin := tg_op = 'DELETE';
    if tg_op <> 'DELETE' then
      removing_super_admin := new.app_role <> 'super_admin';
    end if;
  else
    removing_super_admin := false;
  end if;

  if removing_super_admin then
    if (select auth.uid()) = old.user_id then
      raise exception 'cannot_demote_current_super_admin';
    end if;

    if (select count(*) from public.account_access where app_role = 'super_admin') <= 1 then
      raise exception 'cannot_remove_last_super_admin';
    end if;
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke all on function public.protect_super_admin_invariants() from public, anon, authenticated;

drop trigger if exists account_access_protect_super_admin on public.account_access;
create trigger account_access_protect_super_admin
before update or delete on public.account_access
for each row execute function public.protect_super_admin_invariants();

create or replace function public.sync_profile_from_account_access()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
  set role = case new.app_role
      when 'super_admin' then 'admin'
      when 'admin' then 'admin'
      when 'expert' then 'expert'
      else case when new.tier = 'free' then 'free' else 'founding' end
    end,
    tier = new.tier,
    expert_slug = (
      select slug from public.experts where id = new.expert_id
    )
  where id = new.user_id;
  return new;
end;
$$;

revoke all on function public.sync_profile_from_account_access() from public, anon, authenticated;

drop trigger if exists account_access_sync_profile on public.account_access;
create trigger account_access_sync_profile
after insert or update of app_role, tier, expert_id on public.account_access
for each row execute function public.sync_profile_from_account_access();

create or replace function public.audit_account_access_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if row(old.app_role, old.tier, old.expert_id)
     is distinct from row(new.app_role, new.tier, new.expert_id) then
    insert into public.audit_events (
      actor_id, action, entity_type, entity_id, metadata
    ) values (
      (select auth.uid()),
      'account_access.updated',
      'account_access',
      new.user_id,
      jsonb_build_object(
        'old_role', old.app_role,
        'new_role', new.app_role,
        'old_tier', old.tier,
        'new_tier', new.tier,
        'old_expert_id', old.expert_id,
        'new_expert_id', new.expert_id
      )
    );
  end if;
  return new;
end;
$$;

revoke all on function public.audit_account_access_change() from public, anon, authenticated;

drop trigger if exists account_access_audit_change on public.account_access;
create trigger account_access_audit_change
after update of app_role, tier, expert_id on public.account_access
for each row execute function public.audit_account_access_change();

-- Existing admins retain product administration, but they may only modify
-- member/expert rows and may not create or demote administrators.
drop policy if exists "account_access_admin_all" on public.account_access;

create policy "account_access_super_admin_all" on public.account_access
for all to authenticated
using ((select public.is_super_admin()))
with check ((select public.is_super_admin()));

create policy "account_access_admin_insert_member_expert" on public.account_access
for insert to authenticated
with check (
  (select public.is_admin())
  and app_role in ('member', 'expert')
);

create policy "account_access_admin_update_member_expert" on public.account_access
for update to authenticated
using (
  (select public.is_admin())
  and app_role in ('member', 'expert')
)
with check (
  (select public.is_admin())
  and app_role in ('member', 'expert')
);
