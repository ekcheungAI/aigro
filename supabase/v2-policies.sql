-- RETIRED — DO NOT RUN.
--
-- This browser-policy snapshot predates migration-first auth.uid() ownership
-- and can reopen unsafe anonymous write paths. It is intentionally inert.
-- Apply only timestamped files in supabase/migrations/ through the Supabase CLI.

do $$
begin
  raise exception 'v2-policies.sql is retired; apply timestamped migrations only';
end
$$;
