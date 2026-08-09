-- RETIRED — DO NOT RUN.
--
-- This legacy policy bundle uses mutable slug ownership and is not compatible
-- with the current account_access/expert_id security model. It is inert by
-- design; apply only timestamped migrations through the Supabase CLI.

do $$
begin
  raise exception 'v3-policies.sql is retired; apply timestamped migrations only';
end
$$;
