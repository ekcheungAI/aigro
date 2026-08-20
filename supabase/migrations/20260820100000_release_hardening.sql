-- Release hardening: preserve CRM follow-up dates and close service-RPC grants.
-- Forward-only migration; do not edit an already-applied migration.

create or replace function public.update_lead_stage(p_lead_id uuid, p_stage text)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  existing_follow_up timestamptz;
begin
  -- Stage-only controls must not erase a date managed by the full CRM form.
  select next_follow_up_at
    into existing_follow_up
  from public.leads
  where id = p_lead_id;

  perform public.update_expert_lead(
    p_lead_id,
    p_stage,
    null,
    existing_follow_up
  );
end;
$$;

revoke all on function public.update_lead_stage(uuid, text)
from public, anon, authenticated;
grant execute on function public.update_lead_stage(uuid, text) to authenticated;

-- The pack publisher used to accept a job in `review` and publish it in the
-- same transaction. Require a persisted reviewer identity before a persona
-- version can be attached to a job, so a CLI flag cannot impersonate review.
create or replace function public.enforce_persona_publication_review()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.persona_version_id is not null
     and new.status in ('approved', 'published')
     and new.reviewed_by is null then
    raise exception 'persona_publication_requires_human_review';
  end if;
  return new;
end;
$$;

drop trigger if exists persona_publication_requires_review
on public.persona_synthesis_jobs;
create trigger persona_publication_requires_review
before insert or update of status, persona_version_id, reviewed_by
on public.persona_synthesis_jobs
for each row execute function public.enforce_persona_publication_review();

-- These functions are called by Edge workers with the service key only. A
-- publishable key must never be able to retrieve corpus rows or claim jobs.
revoke all on function public.match_expert_knowledge(
  uuid, extensions.halfvec, integer, double precision
) from public, anon, authenticated;
grant execute on function public.match_expert_knowledge(
  uuid, extensions.halfvec, integer, double precision
) to service_role;

revoke all on function public.claim_distillation_jobs(text, integer)
from public, anon, authenticated;
grant execute on function public.claim_distillation_jobs(text, integer)
to service_role;

revoke all on function public.claim_persona_synthesis_jobs(text, integer)
from public, anon, authenticated;
grant execute on function public.claim_persona_synthesis_jobs(text, integer)
to service_role;

revoke all on function public.get_authorized_persona_evidence(uuid, uuid[])
from public, anon, authenticated;
grant execute on function public.get_authorized_persona_evidence(uuid, uuid[])
to service_role;

revoke all on function public.get_authorized_persona_revision_ids(uuid, uuid[])
from public, anon, authenticated;
grant execute on function public.get_authorized_persona_revision_ids(uuid, uuid[])
to service_role;
