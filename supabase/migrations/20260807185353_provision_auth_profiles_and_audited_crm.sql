-- Provision a durable public profile whenever an email identity is created or
-- an anonymous Auth user is upgraded. Access remains member/free regardless of
-- user-controlled metadata; the existing profile trigger creates account_access.

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  safe_name text;
begin
  if new.email is null or btrim(new.email) = '' then
    return new;
  end if;

  safe_name := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
    nullif(split_part(new.email, '@', 1), ''),
    '會員'
  );

  insert into public.profiles (id, email, name)
  values (new.id, lower(btrim(new.email)), left(safe_name, 120))
  on conflict (id) do update
  set email = excluded.email,
      name = case
        when btrim(public.profiles.name) = '' then excluded.name
        else public.profiles.name
      end,
      updated_at = now();

  return new;
end;
$$;

revoke all on function public.handle_new_auth_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_provision_profile on auth.users;
create trigger on_auth_user_provision_profile
after insert or update of email on auth.users
for each row
when (new.email is not null)
execute function public.handle_new_auth_user();

-- Backfill email identities that were created before this trigger existed.
insert into public.profiles (id, email, name)
select
  u.id,
  lower(btrim(u.email)),
  left(coalesce(
    nullif(btrim(u.raw_user_meta_data ->> 'name'), ''),
    nullif(split_part(u.email, '@', 1), ''),
    '會員'
  ), 120)
from auth.users u
where u.email is not null and btrim(u.email) <> ''
on conflict (id) do nothing;

-- Replace the first-pass flat +5 lead score with deterministic, server-side
-- intent scoring. This remains inside the atomic chat transaction and therefore
-- cannot drift from the messages that generated the CRM record.
create or replace function public.persist_chat_round(
  p_owner_id uuid,
  p_conversation_id uuid,
  p_expert_id uuid,
  p_persona text,
  p_request_id text,
  p_question text,
  p_answer text,
  p_answer_basis text,
  p_coverage text,
  p_citations jsonb default '[]'::jsonb,
  p_persona_version_id uuid default null,
  p_retrieval jsonb default '[]'::jsonb,
  p_provider_usage jsonb default '{}'::jsonb,
  p_model text default null,
  p_latency_ms integer default null,
  p_provider_request_id text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  assistant_id uuid;
  lead_delta integer := 5;
  detected_signals text[] := array['asked_question'];
begin
  if p_answer_basis not in ('knowledge', 'general') then raise exception 'invalid_answer_basis'; end if;
  if p_coverage not in ('high', 'medium', 'none') then raise exception 'invalid_coverage'; end if;
  if not exists (
    select 1 from public.conversations c
    where c.id = p_conversation_id
      and c.owner_id = p_owner_id
      and c.expert_id = p_expert_id
      and c.persona = p_persona
  ) then raise exception 'conversation_mismatch'; end if;

  perform pg_advisory_xact_lock(hashtextextended(p_conversation_id::text || ':' || p_request_id, 0));
  select id into assistant_id from public.messages
  where conversation_id = p_conversation_id and request_id = p_request_id and role = 'assistant';
  if found then return assistant_id; end if;

  if p_question ~* '(收費|價錢|幾錢|pricing|price|cost)' then
    lead_delta := lead_delta + 20;
    detected_signals := detected_signals || array['問價錢'];
  end if;
  if p_question ~* '(預約|booking|book|appointment|會面|見面)' then
    lead_delta := lead_delta + 20;
    detected_signals := detected_signals || array['問預約'];
  end if;
  if p_question ~* '(導入|合作|企業|公司|團隊|enterprise|company|team|合作)' then
    lead_delta := lead_delta + 20;
    detected_signals := detected_signals || array['問公司導入'];
  end if;

  insert into public.messages (
    conversation_id, role, content, source, request_id
  ) values (
    p_conversation_id, 'user', left(p_question, 800), 'user', p_request_id
  );

  insert into public.messages (
    conversation_id, role, content, source, citations, request_id,
    answer_basis, coverage, persona_version_id, retrieval, provider_usage
  ) values (
    p_conversation_id, 'assistant', p_answer,
    case when p_answer_basis = 'knowledge' then 'kb' else 'llm' end,
    coalesce(p_citations, '[]'::jsonb), p_request_id, p_answer_basis,
    p_coverage, p_persona_version_id, coalesce(p_retrieval, '[]'::jsonb),
    coalesce(p_provider_usage, '{}'::jsonb)
  ) returning id into assistant_id;

  update public.conversations
  set updated_at = now(), title = coalesce(nullif(title, ''), left(p_question, 80))
  where id = p_conversation_id;

  insert into public.leads (
    user_id, owner_id, persona, score, signals, questions, last_activity_at
  ) values (
    p_owner_id, p_owner_id, p_persona, least(100, lead_delta), detected_signals,
    jsonb_build_array(left(p_question, 800)), now()
  ) on conflict (owner_id, persona) do update set
    score = least(100, coalesce(public.leads.score, 0) + lead_delta),
    signals = array(
      select distinct unnest(coalesce(public.leads.signals, '{}') || detected_signals)
    ),
    questions = coalesce(public.leads.questions, '[]'::jsonb)
      || jsonb_build_array(left(p_question, 800)),
    last_activity_at = now();

  if p_coverage = 'none' and p_persona <> 'platform' then
    insert into public.knowledge_gaps (expert_id, conversation_id, message_id, question)
    values (p_expert_id, p_conversation_id, assistant_id, left(p_question, 800));
  end if;

  insert into public.usage_logs (
    provider, endpoint, model, input_tokens, output_tokens, tokens,
    latency_ms, request_id, status
  ) values (
    'minimax', '/chat/completions', p_model,
    nullif(p_provider_usage->>'prompt_tokens', '')::integer,
    nullif(p_provider_usage->>'completion_tokens', '')::integer,
    nullif(p_provider_usage->>'total_tokens', '')::integer,
    p_latency_ms, p_provider_request_id, 'ok'
  );

  return assistant_id;
end;
$$;

revoke all on function public.persist_chat_round(uuid, uuid, uuid, text, text, text, text, text, text, jsonb, uuid, jsonb, jsonb, text, integer, text) from public, anon, authenticated;
grant execute on function public.persist_chat_round(uuid, uuid, uuid, text, text, text, text, text, text, jsonb, uuid, jsonb, jsonb, text, integer, text) to service_role;

-- Admin CRM stage changes go through one audited server workflow instead of a
-- raw browser update that could lose timeline entries during concurrent edits.
create or replace function public.update_lead_stage(
  p_lead_id uuid,
  p_stage text
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  lead_row public.leads%rowtype;
begin
  if not public.is_admin() then
    raise exception 'not_allowed';
  end if;
  if p_stage not in ('新線索', '已接觸', '跟進中', '已轉化') then
    raise exception 'invalid_lead_stage';
  end if;

  select * into lead_row
  from public.leads
  where id = p_lead_id
  for update;
  if not found then
    raise exception 'lead_not_found';
  end if;

  update public.leads
  set stage = p_stage,
      timeline = coalesce(timeline, '[]'::jsonb) || jsonb_build_array(
        jsonb_build_object(
          'date', to_char(now() at time zone 'Asia/Hong_Kong', 'YYYY-MM-DD HH24:MI'),
          'label', '階段更新 — 移至' || p_stage,
          'actor_id', auth.uid()
        )
      ),
      last_activity_at = now()
  where id = p_lead_id;

  insert into public.audit_events (
    actor_id, action, entity_type, entity_id, metadata
  ) values (
    auth.uid(), 'lead.stage_updated', 'lead', p_lead_id,
    jsonb_build_object('old_stage', lead_row.stage, 'new_stage', p_stage)
  );
end;
$$;

revoke all on function public.update_lead_stage(uuid, text) from public, anon;
grant execute on function public.update_lead_stage(uuid, text) to authenticated;
