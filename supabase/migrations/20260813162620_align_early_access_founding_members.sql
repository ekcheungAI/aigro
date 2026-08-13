-- Use account_access.member_class as the single source of truth for founding
-- recognition. Billing tier and application role remain unchanged.
update public.account_access aa
set member_class = 'founding',
    updated_at = now()
from public.profiles p
join auth.users u on u.id = p.id
where aa.user_id = p.id
  and aa.app_role = 'member'
  and u.email is not null
  and btrim(u.email) <> ''
  and not coalesce(u.is_anonymous, false)
  and aa.member_class <> 'founding';

drop trigger if exists profiles_protect_founding_member on public.profiles;
drop function if exists public.protect_founding_member_status();
alter table public.profiles drop column if exists founding_member;

-- Preserve the current CRM identity synchronization while ensuring that both
-- brand-new email identities and upgraded anonymous accounts become founding
-- members. The account remains on the free billing tier.
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
    insert into public.profiles (id, email, name)
    values (new.id, lower(btrim(new.email)), left(safe_name, 120))
    on conflict (id) do update
    set email = excluded.email,
        name = case
          when btrim(public.profiles.name) = '' then excluded.name
          else public.profiles.name
        end,
        updated_at = now();

    if not coalesce(new.is_anonymous, false) then
      update public.account_access
      set member_class = 'founding',
          updated_at = now()
      where user_id = new.id
        and app_role = 'member'
        and member_class <> 'founding';
    end if;
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
