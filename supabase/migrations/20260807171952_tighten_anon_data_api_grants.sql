-- Production predates the migration-first setup and retained Supabase's broad
-- default grants for `anon`. RLS already denied private rows, but removing the
-- table privilege is a safer second boundary and keeps fresh/prod parity.
revoke all privileges on all tables in schema public from anon;

grant usage on schema public to anon;
grant select on public.items, public.sources, public.expert_profiles,
  public.experts, public.availability_rules, public.availability_exceptions
to anon;
grant insert on public.waitlist, public.leads to anon;
