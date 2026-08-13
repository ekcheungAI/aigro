-- Founding membership is a recognition flag, not an authorization tier.
-- `account_access` remains member/free so early members do not silently gain
-- paid or administrative permissions.
alter table public.profiles
  add column if not exists founding_member boolean not null default false;

comment on column public.profiles.founding_member is
  'Server-assigned recognition for accounts created during AIGRO early access.';

create or replace function public.protect_founding_member_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Browser sessions may not self-assign or remove founding recognition.
  -- Internal auth provisioning runs without an end-user auth.uid().
  if (select auth.uid()) is not null then
    new.founding_member := case
      when tg_op = 'UPDATE' then old.founding_member
      else false
    end;
  end if;
  return new;
end;
$$;

revoke all on function public.protect_founding_member_status()
from public, anon, authenticated;

drop trigger if exists profiles_protect_founding_member on public.profiles;
create trigger profiles_protect_founding_member
before insert or update of founding_member on public.profiles
for each row execute function public.protect_founding_member_status();

-- All existing permanent accounts joined during early access.
update public.profiles p
set founding_member = true,
    updated_at = now()
where not p.founding_member
  and exists (
    select 1
    from auth.users u
    where u.id = p.id
      and u.email is not null
      and btrim(u.email) <> ''
      and not coalesce(u.is_anonymous, false)
  );

-- New email identities and anonymous-account upgrades receive the same
-- recognition. Existing recognition is never downgraded on later auth events.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  safe_name text;
begin
  if new.email is not null and btrim(new.email) <> '' then
    safe_name := coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
      nullif(split_part(new.email, '@', 1), ''),
      '會員'
    );
    insert into public.profiles (id, email, name, founding_member)
    values (
      new.id,
      lower(btrim(new.email)),
      left(safe_name, 120),
      not coalesce(new.is_anonymous, false)
    )
    on conflict (id) do update
    set email = excluded.email,
        name = case
          when btrim(public.profiles.name) = '' then excluded.name
          else public.profiles.name
        end,
        founding_member = public.profiles.founding_member or excluded.founding_member,
        updated_at = now();
  end if;

  update public.leads
  set user_id = case when coalesce(new.is_anonymous, false) then null else new.id end,
      owner_is_anonymous = coalesce(new.is_anonymous, false)
  where owner_id = new.id;
  return new;
end;
$$;

revoke all on function public.handle_new_auth_user()
from public, anon, authenticated;

drop trigger if exists on_auth_user_provision_profile on auth.users;
create trigger on_auth_user_provision_profile
after insert or update of email, is_anonymous on auth.users
for each row execute function public.handle_new_auth_user();
