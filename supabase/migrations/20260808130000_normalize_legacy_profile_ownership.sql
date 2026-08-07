-- Anonymous Auth identities have auth.users rows but intentionally no public
-- profile until they attach an email. owner_id remains authoritative; nullable
-- legacy user_id may only mirror the same owner when that profile exists.

create or replace function public.normalize_legacy_profile_user_id()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.user_id is distinct from new.owner_id
     or not exists (select 1 from public.profiles p where p.id = new.user_id) then
    new.user_id := null;
  end if;
  return new;
end;
$$;

revoke all on function public.normalize_legacy_profile_user_id() from public, anon, authenticated;

drop trigger if exists conversations_normalize_legacy_user_id on public.conversations;
create trigger conversations_normalize_legacy_user_id
before insert or update of user_id, owner_id on public.conversations
for each row execute function public.normalize_legacy_profile_user_id();

drop trigger if exists leads_normalize_legacy_user_id on public.leads;
create trigger leads_normalize_legacy_user_id
before insert or update of user_id, owner_id on public.leads
for each row execute function public.normalize_legacy_profile_user_id();
