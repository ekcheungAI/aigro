-- Capability helpers are used inside authenticated RLS policies. Remove the
-- default PUBLIC execute grant so they cannot also be called as anonymous
-- Data API RPCs.
revoke all on function public.is_admin() from public, anon;
revoke all on function public.is_super_admin() from public, anon;
revoke all on function public.owns_expert(uuid) from public, anon;

grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_super_admin() to authenticated;
grant execute on function public.owns_expert(uuid) to authenticated;

-- Trigger functions must not resolve objects through a caller-controlled
-- search path.
alter function public.touch_updated_at()
  set search_path = pg_catalog, public;
