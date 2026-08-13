-- Public social-proof metric. This function returns one aggregate number only;
-- no account rows, email addresses, roles, or profile fields are exposed.
create or replace function public.get_public_member_count()
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::bigint
  from auth.users u
  join public.profiles p on p.id = u.id
  where u.email is not null
    and btrim(u.email) <> ''
    and not coalesce(u.is_anonymous, false);
$$;

comment on function public.get_public_member_count() is
  'Returns the number of permanent registered AIGRO accounts with profiles.';

revoke all on function public.get_public_member_count()
from public, anon, authenticated;
grant execute on function public.get_public_member_count()
to anon, authenticated;
