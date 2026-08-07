-- The platform owner role inherits product entitlements without pretending to
-- be a paid subscriber. Billing tier remains independent and auditable.

-- SQL-created tables are not automatically exposed to the Data API in a fresh
-- project. Grants permit the browser roles to reach the tables; RLS remains the
-- authority for every row and denies operations without a matching policy.
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

grant select on public.items, public.sources, public.expert_profiles,
  public.experts, public.availability_rules, public.availability_exceptions
to anon;
grant insert on public.waitlist, public.leads to anon;

create or replace function public.create_booking(
  p_expert_slug text,
  p_starts_at timestamptz,
  p_source_conversation_id uuid default null,
  p_source_question text default null,
  p_member_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_expert public.experts%rowtype;
  access_row public.account_access%rowtype;
  booking_id uuid;
  p_ends_at timestamptz := p_starts_at + interval '45 minutes';
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  select * into target_expert from public.experts where slug = p_expert_slug and status = 'active';
  if not found or coalesce((target_expert.feature_flags->>'booking_enabled')::boolean, false) is false then
    raise exception 'booking_unavailable';
  end if;

  select * into access_row from public.account_access where user_id = auth.uid();
  if not found or (access_row.tier <> 'vip' and access_row.app_role <> 'super_admin') then
    raise exception 'vip_required';
  end if;
  if p_starts_at < now() + interval '24 hours' then raise exception 'booking_too_soon'; end if;

  -- The platform owner can test and operate booking workflows without consuming
  -- a member's once-per-month paid entitlement. Availability and overlap safety
  -- rules still apply.
  if access_row.app_role <> 'super_admin' and exists (
    select 1 from public.bookings
    where member_id = auth.uid()
      and status in ('requested', 'confirmed', 'completed')
      and date_trunc('month', starts_at at time zone 'Asia/Hong_Kong') =
          date_trunc('month', p_starts_at at time zone 'Asia/Hong_Kong')
  ) then raise exception 'monthly_entitlement_used'; end if;

  if not exists (
    select 1 from public.availability_rules ar
    where ar.expert_id = target_expert.id and ar.active
      and ar.weekday = extract(dow from p_starts_at at time zone ar.timezone)::smallint
      and (p_starts_at at time zone ar.timezone)::time >= ar.start_time
      and (p_ends_at at time zone ar.timezone)::time <= ar.end_time
  ) then raise exception 'outside_availability'; end if;
  if exists (
    select 1 from public.availability_exceptions ae
    where ae.expert_id = target_expert.id and ae.kind = 'blocked'
      and tstzrange(ae.starts_at, ae.ends_at, '[)') && tstzrange(p_starts_at, p_ends_at, '[)')
  ) then raise exception 'slot_blocked'; end if;

  insert into public.bookings (
    member_id, expert_id, source_conversation_id, source_question,
    starts_at, ends_at, member_note
  ) values (
    auth.uid(), target_expert.id, p_source_conversation_id,
    left(p_source_question, 1000), p_starts_at, p_ends_at, left(p_member_note, 2000)
  ) returning id into booking_id;

  insert into public.audit_events (actor_id, expert_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(), target_expert.id, 'booking.requested', 'booking', booking_id,
    jsonb_build_object('super_admin_entitlement', access_row.app_role = 'super_admin')
  );
  return booking_id;
exception when exclusion_violation then
  raise exception 'slot_taken';
end;
$$;

revoke all on function public.create_booking(text, timestamptz, uuid, text, text)
from public, anon;
grant execute on function public.create_booking(text, timestamptz, uuid, text, text)
to authenticated;
