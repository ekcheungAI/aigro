-- Separate membership class from billing tier. New signups are founding
-- members while existing rows keep their previous free/founding display.

alter table public.account_access
  add column if not exists member_class text;

update public.account_access aa
set member_class = case
  when aa.app_role = 'member'
    and (p.role = 'founding' or aa.tier <> 'free') then 'founding'
  else 'free'
end
from public.profiles p
where p.id = aa.user_id
  and aa.member_class is null;

update public.account_access
set member_class = 'free'
where member_class is null;

alter table public.account_access
  alter column member_class set default 'founding',
  alter column member_class set not null;

alter table public.account_access
  drop constraint if exists account_access_member_class_check;
alter table public.account_access
  add constraint account_access_member_class_check
  check (member_class in ('free', 'founding'));

create or replace function public.ensure_account_access()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.account_access (user_id, app_role, member_class, tier)
  values (new.id, 'member', 'founding', 'free')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

revoke all on function public.ensure_account_access() from public, anon, authenticated;

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
      else access_row.member_class
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
      else new.member_class
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
after insert or update of app_role, member_class, tier, expert_id on public.account_access
for each row execute function public.sync_profile_from_account_access();

create or replace function public.audit_account_access_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if row(old.app_role, old.member_class, old.tier, old.expert_id)
     is distinct from row(new.app_role, new.member_class, new.tier, new.expert_id) then
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
        'old_member_class', old.member_class,
        'new_member_class', new.member_class,
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
after update of app_role, member_class, tier, expert_id on public.account_access
for each row execute function public.audit_account_access_change();
