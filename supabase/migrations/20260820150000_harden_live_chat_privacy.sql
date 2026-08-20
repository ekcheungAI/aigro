-- Make instructor-contact consent atomic, idempotent, and independent of the
-- lead's most recently persisted conversation. The caller must still own the
-- conversation used to establish or withdraw the consent scope.

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
  caller_id uuid := auth.uid();
  conversation_row public.conversations%rowtype;
  lead_row public.leads%rowtype;
  profile_id uuid;
  owner_is_anonymous boolean := false;
  normalized_email text := lower(btrim(coalesce(p_email, '')));
  should_audit boolean := false;
begin
  if caller_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  if normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'invalid_contact_email' using errcode = '22023';
  end if;

  select c.* into conversation_row
  from public.conversations c
  where c.id = p_conversation_id
    and c.owner_id = auth.uid()
    and c.expert_id is not null
  for share;
  if not found then
    raise exception 'conversation_not_found' using errcode = 'P0002';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(
    'aigro:lead-contact-consent:' || caller_id::text || ':' || conversation_row.expert_id::text,
    0
  ));

  select l.* into lead_row
  from public.leads l
  where l.owner_id = caller_id
    and l.expert_id = conversation_row.expert_id
  for update;

  if found then
    should_audit := lead_row.contact_consented_at is null
      or lead_row.contact_email is distinct from left(normalized_email, 320);
    update public.leads
    set contact_consented_at = coalesce(contact_consented_at, now()),
        contact_email = left(normalized_email, 320),
        last_activity_at = now()
    where id = lead_row.id
    returning * into lead_row;
  else
    select p.id, coalesce(u.is_anonymous, false)
    into profile_id, owner_is_anonymous
    from auth.users u
    left join public.profiles p on p.id = u.id
    where u.id = caller_id;

    insert into public.leads (
      user_id, owner_id, expert_id, persona, source_conversation_id,
      owner_is_anonymous, score, signals, questions, contact_consented_at,
      contact_email, last_activity_at
    ) values (
      profile_id, caller_id, conversation_row.expert_id, conversation_row.persona,
      conversation_row.id, owner_is_anonymous, 0, '{}'::text[], '[]'::jsonb,
      now(), left(normalized_email, 320), now()
    ) on conflict (owner_id, expert_id) do update set
      contact_consented_at = coalesce(public.leads.contact_consented_at, now()),
      contact_email = excluded.contact_email,
      last_activity_at = now()
    returning * into lead_row;
    should_audit := true;
  end if;

  if should_audit then
    insert into public.audit_events (
      actor_id, expert_id, action, entity_type, entity_id, metadata
    ) values (
      caller_id, conversation_row.expert_id, 'lead.contact_consented', 'lead', lead_row.id,
      jsonb_build_object('conversation_id', p_conversation_id)
    );
  end if;
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
declare
  caller_id uuid := auth.uid();
  conversation_row public.conversations%rowtype;
  lead_row public.leads%rowtype;
begin
  if caller_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  select c.* into conversation_row
  from public.conversations c
  where c.id = p_conversation_id
    and c.owner_id = auth.uid()
    and c.expert_id is not null
  for share;
  if not found then
    raise exception 'conversation_not_found' using errcode = 'P0002';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(
    'aigro:lead-contact-consent:' || caller_id::text || ':' || conversation_row.expert_id::text,
    0
  ));

  select l.* into lead_row
  from public.leads l
  where l.owner_id = caller_id
    and l.expert_id = conversation_row.expert_id
  for update;
  if not found then
    return;
  end if;
  if lead_row.contact_consented_at is null and lead_row.contact_email is null then
    return;
  end if;

  update public.leads
  set contact_consented_at = null,
      contact_email = null,
      last_activity_at = now()
  where id = lead_row.id;

  insert into public.audit_events (
    actor_id, expert_id, action, entity_type, entity_id, metadata
  ) values (
    caller_id, conversation_row.expert_id, 'lead.contact_consent_withdrawn', 'lead', lead_row.id,
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
