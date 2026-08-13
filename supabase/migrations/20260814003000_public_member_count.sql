-- Expose one non-identifying platform metric without granting anonymous access
-- to member profiles. The function returns only the aggregate row count.
create or replace function public.public_member_count()
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::bigint from public.profiles;
$$;

revoke all on function public.public_member_count() from public;
grant execute on function public.public_member_count() to anon, authenticated;
