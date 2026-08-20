-- Explicit contact handoff for instructor CRM. Consent is scoped to the
-- authenticated conversation owner and is reversible by the same owner.

alter table public.leads
  add column if not exists contact_email text;

create or replace function public.consent_lead_contact(
  p_conversation_id uuid,
  p_email text
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  lead_row public.leads%rowtype;
  normalized_email text := lower(btrim(coalesce(p_email, '')));
begin
  if normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'invalid_contact_email' using errcode = '22023';
  end if;
  select l.* into lead_row
  from public.leads l
  where l.source_conversation_id = p_conversation_id
    and l.owner_id = auth.uid()
  order by l.last_activity_at desc nulls last
  limit 1
  for update;
  if not found then raise exception 'lead_not_found' using errcode = 'P0002'; end if;

  update public.leads
  set contact_consented_at = coalesce(contact_consented_at, now()),
      contact_email = left(normalized_email, 320),
      last_activity_at = now()
  where id = lead_row.id;

  insert into public.audit_events (
    actor_id, expert_id, action, entity_type, entity_id, metadata
  ) values (
    auth.uid(), lead_row.expert_id, 'lead.contact_consented', 'lead', lead_row.id,
    jsonb_build_object('conversation_id', p_conversation_id)
  );
end;
$$;

create or replace function public.withdraw_lead_contact_consent(
  p_conversation_id uuid
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare lead_row public.leads%rowtype;
begin
  select l.* into lead_row
  from public.leads l
  where l.source_conversation_id = p_conversation_id
    and l.owner_id = auth.uid()
  order by l.last_activity_at desc nulls last
  limit 1
  for update;
  if not found then raise exception 'lead_not_found' using errcode = 'P0002'; end if;

  update public.leads
  set contact_consented_at = null,
      contact_email = null,
      last_activity_at = now()
  where id = lead_row.id;

  insert into public.audit_events (
    actor_id, expert_id, action, entity_type, entity_id, metadata
  ) values (
    auth.uid(), lead_row.expert_id, 'lead.contact_consent_withdrawn', 'lead', lead_row.id,
    jsonb_build_object('conversation_id', p_conversation_id)
  );
end;
$$;

revoke all on function public.consent_lead_contact(uuid, text)
from public, anon, authenticated;
grant execute on function public.consent_lead_contact(uuid, text) to authenticated;
revoke all on function public.withdraw_lead_contact_consent(uuid)
from public, anon, authenticated;
grant execute on function public.withdraw_lead_contact_consent(uuid) to authenticated;
