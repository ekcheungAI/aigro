-- Delete an owned chat through one idempotent server boundary. A retry after a
-- committed DELETE whose HTTP acknowledgement was lost returns true once the
-- row is already absent, while an existing conversation owned by someone else
-- is never changed and returns false.

create or replace function public.delete_chat_conversation(
  p_conversation_id uuid
)
returns boolean
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

  perform pg_advisory_xact_lock(hashtextextended(
    'aigro:delete-chat:' || p_conversation_id::text,
    0
  ));

  select c.* into conversation_row
  from public.conversations c
  where c.id = p_conversation_id
    and c.owner_id = caller_id
  for update;
  if not found then
    return not exists (
      select 1 from public.conversations where id = p_conversation_id
    );
  end if;

  if conversation_row.expert_id is not null then
    perform pg_advisory_xact_lock(hashtextextended(
      'aigro:lead-contact-consent:' || caller_id::text || ':' || conversation_row.expert_id::text,
      0
    ));
  end if;

  delete from public.conversations
  where id = conversation_row.id
    and owner_id = caller_id;

  -- A consent record must never become unreachable after its final chat is
  -- removed. Keep consent while another conversation with the expert remains;
  -- otherwise withdraw it in the same transaction as the deletion.
  if conversation_row.expert_id is not null and not exists (
    select 1 from public.conversations c
    where c.owner_id = caller_id
      and c.expert_id = conversation_row.expert_id
  ) then
    update public.leads
    set contact_consented_at = null,
        contact_email = null,
        last_activity_at = now()
    where owner_id = caller_id
      and expert_id = conversation_row.expert_id
      and (contact_consented_at is not null or contact_email is not null)
    returning * into lead_row;

    if found then
      insert into public.audit_events (
        actor_id, expert_id, action, entity_type, entity_id, metadata
      ) values (
        caller_id, conversation_row.expert_id, 'lead.contact_consent_withdrawn',
        'lead', lead_row.id,
        jsonb_build_object(
          'conversation_id', p_conversation_id,
          'reason', 'last_conversation_deleted'
        )
      );
    end if;
  end if;
  return true;
end;
$$;

revoke all on function public.delete_chat_conversation(uuid)
from public, anon, authenticated;
grant execute on function public.delete_chat_conversation(uuid) to authenticated;

-- Account-scoped withdrawal remains available even when the browser no longer
-- has a local session or every server conversation has already been removed.
create or replace function public.withdraw_lead_contact_consent_for_expert(
  p_expert_slug text
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  caller_id uuid := auth.uid();
  target_expert_id uuid;
  lead_row public.leads%rowtype;
begin
  if caller_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  select e.id into target_expert_id
  from public.experts e
  where e.slug = p_expert_slug;
  if not found then
    raise exception 'expert_not_found' using errcode = 'P0002';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(
    'aigro:lead-contact-consent:' || caller_id::text || ':' || target_expert_id::text,
    0
  ));

  update public.leads
  set contact_consented_at = null,
      contact_email = null,
      last_activity_at = now()
  where owner_id = caller_id
    and expert_id = target_expert_id
    and (contact_consented_at is not null or contact_email is not null)
  returning * into lead_row;

  if found then
    insert into public.audit_events (
      actor_id, expert_id, action, entity_type, entity_id, metadata
    ) values (
      caller_id, target_expert_id, 'lead.contact_consent_withdrawn',
      'lead', lead_row.id,
      jsonb_build_object('reason', 'account_request')
    );
  end if;
  return true;
end;
$$;

revoke all on function public.withdraw_lead_contact_consent_for_expert(text)
from public, anon, authenticated;
grant execute on function public.withdraw_lead_contact_consent_for_expert(text)
to authenticated;
