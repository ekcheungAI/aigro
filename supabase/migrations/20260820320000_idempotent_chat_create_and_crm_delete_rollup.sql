-- A browser chooses and persists the conversation UUID before starting the
-- request. A durable tombstone closes both request orderings: delete waits for
-- an earlier create, while a delete that reaches the lock first prevents a
-- delayed create from inserting the conversation afterwards.

create table public.chat_conversation_tombstones (
  conversation_id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  deleted_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '45 days'),
  constraint chat_conversation_tombstones_retention_check
    check (expires_at > deleted_at)
);
create index chat_conversation_tombstones_expires_idx
on public.chat_conversation_tombstones(expires_at);
create index chat_conversation_tombstones_owner_expires_idx
on public.chat_conversation_tombstones(owner_id, expires_at);

comment on table public.chat_conversation_tombstones is
  'Owner-scoped delete intents retained longer than the 30-day browser chat lifetime.';

alter table public.chat_conversation_tombstones enable row level security;
revoke all on table public.chat_conversation_tombstones
from public, anon, authenticated;
grant select, insert, update, delete on table public.chat_conversation_tombstones
to service_role;

create or replace function public.purge_expired_chat_conversation_tombstones()
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  affected integer;
begin
  delete from public.chat_conversation_tombstones
  where expires_at <= now();
  get diagnostics affected = row_count;
  return affected;
end;
$$;

revoke all on function public.purge_expired_chat_conversation_tombstones()
from public, anon, authenticated;
grant execute on function public.purge_expired_chat_conversation_tombstones()
to service_role;

-- The earlier reversible-questions migration preserved text that could not be
-- assigned to an exact turn. Preserve the equivalent legacy CRM aggregates as
-- a separate base so the first new interaction cannot silently erase them.
alter table public.leads
  add column legacy_score_snapshot integer not null default 0,
  add column legacy_signals_snapshot text[] not null default '{}',
  add column legacy_crm_captured_at timestamptz;

-- Existing interaction deltas/signals are already represented by the current
-- lead aggregate captured below. Mark that exact generation so rollups add
-- only post-migration deltas while the legacy base remains active.
alter table public.lead_interactions
  add column included_in_legacy_crm_snapshot boolean;
update public.lead_interactions
set included_in_legacy_crm_snapshot = true;
alter table public.lead_interactions
  alter column included_in_legacy_crm_snapshot set default false,
  alter column included_in_legacy_crm_snapshot set not null;

update public.leads
set legacy_score_snapshot = coalesce(score, 0),
    legacy_signals_snapshot = coalesce(signals, '{}'),
    legacy_crm_captured_at = now()
where coalesce(score, 0) > 0
   or cardinality(coalesce(signals, '{}')) > 0;

do $$
begin
  perform cron.unschedule(jobid) from cron.job
  where jobname = 'aigro-purge-chat-conversation-tombstones';
  perform cron.schedule(
    'aigro-purge-chat-conversation-tombstones',
    '47 3 * * *',
    'select public.purge_expired_chat_conversation_tombstones()'
  );
end $$;

create or replace function public.create_chat_conversation_idempotent(
  p_conversation_id uuid,
  p_persona_slug text,
  p_title text default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  caller_id uuid := auth.uid();
  target_expert public.experts%rowtype;
  existing_conversation public.conversations%rowtype;
  tombstone_owner_id uuid;
  profile_id uuid;
begin
  if caller_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  if p_conversation_id is null then
    raise exception 'conversation_id_required' using errcode = '23502';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(
    'aigro:chat-conversation:' || p_conversation_id::text,
    0
  ));

  select t.owner_id into tombstone_owner_id
  from public.chat_conversation_tombstones t
  where t.conversation_id = p_conversation_id
  for update;
  if found then
    if tombstone_owner_id = caller_id then
      raise exception 'conversation_deleted' using errcode = 'P0003';
    end if;
    raise exception 'conversation_id_conflict' using errcode = '23505';
  end if;

  select c.* into existing_conversation
  from public.conversations c
  where c.id = p_conversation_id
  for update;
  if found then
    if existing_conversation.owner_id = caller_id
       and existing_conversation.persona = p_persona_slug
       and exists (
         select 1
         from public.experts e
         where e.id = existing_conversation.expert_id
           and e.slug = p_persona_slug
       ) then
      return existing_conversation.id;
    end if;
    raise exception 'conversation_id_conflict' using errcode = '23505';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('aigro:empty-chat:' || caller_id::text, 0)
  );
  if (
    select count(*)
    from public.conversations c
    where c.owner_id = caller_id
      and c.created_at >= now() - interval '24 hours'
      and not exists (
        select 1 from public.messages m where m.conversation_id = c.id
      )
  ) >= 5 then
    raise exception 'empty_conversation_limit_reached' using errcode = 'P0001';
  end if;

  select * into target_expert
  from public.experts
  where slug = p_persona_slug
    and status = 'active'
    and public.is_expert_chat_ready(id);
  if not found then
    raise exception 'instructor_not_available' using errcode = 'P0002';
  end if;
  select id into profile_id from public.profiles where id = caller_id;

  insert into public.conversations (
    id, owner_id, user_id, anon_id, persona, expert_id, title
  ) values (
    p_conversation_id, caller_id, profile_id, null, target_expert.slug,
    target_expert.id, nullif(left(btrim(coalesce(p_title, '')), 120), '')
  );
  return p_conversation_id;
end;
$$;

revoke all on function public.create_chat_conversation_idempotent(uuid, text, text)
from public, anon, authenticated;
grant execute on function public.create_chat_conversation_idempotent(uuid, text, text)
to authenticated;

-- The legacy server-generated UUID path cannot participate in the tombstone
-- state machine and must not remain available to browser callers.
revoke all on function public.create_chat_conversation(text, text)
from public, anon, authenticated;

-- Direct browser mutations could bypass the state machine as well. Reads stay
-- available under existing RLS; service workers retain their table access.
revoke insert, update, delete on table public.conversations
from public, anon, authenticated;

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
  tombstone_owner_id uuid;
  affected_lead_id uuid;
begin
  if caller_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  if p_conversation_id is null then
    raise exception 'conversation_id_required' using errcode = '23502';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(
    'aigro:chat-conversation:' || p_conversation_id::text,
    0
  ));

  select c.* into conversation_row
  from public.conversations c
  where c.id = p_conversation_id
  for update;
  if found and conversation_row.owner_id <> caller_id then
    return false;
  end if;

  select t.owner_id into tombstone_owner_id
  from public.chat_conversation_tombstones t
  where t.conversation_id = p_conversation_id
  for update;
  if found and tombstone_owner_id <> caller_id then
    return false;
  end if;
  if not found then
    if conversation_row.id is null then
      -- Unknown UUID deletion is necessary for delete-before-create safety,
      -- but anonymous-auth callers must not be able to grow this table without
      -- bound. Serialize each owner's live-count check to close cap races.
      perform pg_advisory_xact_lock(hashtextextended(
        'aigro:chat-tombstone-owner:' || caller_id::text,
        0
      ));
      if (
        select count(*)
        from public.chat_conversation_tombstones t
        where t.owner_id = caller_id
          and t.expires_at > now()
      ) >= 64 then
        raise exception 'chat_tombstone_limit_reached' using errcode = 'P0001';
      end if;
    end if;
    insert into public.chat_conversation_tombstones (
      conversation_id, owner_id
    ) values (
      p_conversation_id, caller_id
    );
  else
    update public.chat_conversation_tombstones
    set expires_at = greatest(expires_at, now() + interval '45 days')
    where conversation_id = p_conversation_id
      and owner_id = caller_id;
  end if;

  if conversation_row.id is null then
    return true;
  end if;

  if conversation_row.expert_id is not null then
    -- Canonical CRM lock order is consent advisory -> lead row -> score
    -- advisory. persist_chat_round already owns the lead row before its score
    -- trigger, so the two paths cannot form lead/score lock inversion.
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
      affected_lead_id := lead_row.id;
      perform pg_advisory_xact_lock(hashtextextended(
        'aigro:lead-score:' || affected_lead_id::text,
        0
      ));
      -- Historical aggregates cannot be assigned safely to one old chat.
      -- Once any conversation is deleted, clear them conservatively before
      -- the cascade rebuilds projections from the remaining durable rows.
      update public.leads
      set legacy_score_snapshot = 0,
          legacy_signals_snapshot = '{}',
          legacy_crm_captured_at = null
      where id = affected_lead_id;
    end if;
  end if;

  delete from public.conversations
  where id = conversation_row.id
    and owner_id = caller_id;

  if conversation_row.expert_id is not null and not exists (
    select 1 from public.conversations c
    where c.owner_id = caller_id
      and c.expert_id = conversation_row.expert_id
  ) then
    update public.leads
    set contact_consented_at = null,
        contact_email = null,
        last_activity_at = now()
    where id = affected_lead_id
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

-- CRM score and intent signals are projections of remaining durable
-- interactions. Cascading conversation deletion must recompute them too.
create or replace function public.normalize_lead_interaction_score()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  prior_interaction_count integer;
  prior_intent_count integer;
  next_intent_count integer;
  legacy_score integer;
  legacy_signals text[];
begin
  -- Every interaction writer uses lead row -> score advisory ordering.
  select l.legacy_score_snapshot, l.legacy_signals_snapshot
  into legacy_score, legacy_signals
  from public.leads l
  where l.id = new.lead_id
  for update;
  perform pg_advisory_xact_lock(
    hashtextextended('aigro:lead-score:' || new.lead_id::text, 0)
  );

  select
    ((select count(*)::integer
     from public.lead_interactions li
     where li.lead_id = new.lead_id)
     + case when coalesce(legacy_score, 0) > 0
                  or cardinality(coalesce(legacy_signals, '{}')) > 0
         then 1 else 0 end),
    (select count(distinct prior.signal)::integer
     from (
       select interaction_signal.signal
       from public.lead_interactions li
       cross join lateral unnest(coalesce(li.signals, '{}'::text[]))
         as interaction_signal(signal)
       where li.lead_id = new.lead_id
       union
       select legacy_signal.signal
       from unnest(coalesce(legacy_signals, '{}'::text[]))
         as legacy_signal(signal)
     ) prior
     where prior.signal <> 'asked_question')
  into prior_interaction_count, prior_intent_count;

  select count(distinct signal)::integer
  into next_intent_count
  from (
    select prior.signal
    from (
      select interaction_signal.signal
      from public.lead_interactions li
      cross join lateral unnest(coalesce(li.signals, '{}'::text[]))
        as interaction_signal(signal)
      where li.lead_id = new.lead_id
      union
      select legacy_signal.signal
      from unnest(coalesce(legacy_signals, '{}'::text[]))
        as legacy_signal(signal)
    ) prior
    where prior.signal <> 'asked_question'
    union
    select current_signal.signal
    from unnest(coalesce(new.signals, '{}'::text[])) as current_signal(signal)
    where current_signal.signal <> 'asked_question'
  ) intents;

  new.score_delta := least(
    100,
    case when prior_interaction_count = 0 then 5 else 0 end
      + greatest(0, next_intent_count - coalesce(prior_intent_count, 0)) * 20
  );
  return new;
end;
$$;

revoke all on function public.normalize_lead_interaction_score()
from public, anon, authenticated;

create or replace function public.recompute_lead_crm_rollup(p_lead_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  -- Match persist_chat_round's lock order. This also protects direct
  -- service-role interaction maintenance outside that RPC.
  perform 1 from public.leads l where l.id = p_lead_id for update;
  if not found then
    return;
  end if;
  perform pg_advisory_xact_lock(
    hashtextextended('aigro:lead-score:' || p_lead_id::text, 0)
  );
  with interaction_rollup as (
    select
      count(*)::integer as interaction_count,
      coalesce(sum(li.score_delta) filter (
        where not li.included_in_legacy_crm_snapshot
      ), 0)::integer as post_snapshot_score_delta,
      max(li.occurred_at) as last_interaction_at
    from public.lead_interactions li
    where li.lead_id = p_lead_id
  ), signal_rollup as (
    select
      count(distinct signal.value) filter (
        where signal.value is not null and signal.value <> 'asked_question'
      )::integer as intent_count,
      coalesce(
        array_agg(distinct signal.value order by signal.value)
          filter (where signal.value is not null),
        '{}'::text[]
      ) as signals,
      coalesce(
        array_agg(distinct signal.value order by signal.value)
          filter (
            where signal.value is not null
              and not li.included_in_legacy_crm_snapshot
          ),
        '{}'::text[]
      ) as post_snapshot_signals
    from public.lead_interactions li
    left join lateral unnest(coalesce(li.signals, '{}'::text[]))
      as signal(value) on true
    where li.lead_id = p_lead_id
  )
  update public.leads l
  set score = case
        when l.legacy_crm_captured_at is not null then least(
          100,
          l.legacy_score_snapshot + rollup.post_snapshot_score_delta
        )
        else least(
          100,
          case when rollup.interaction_count > 0 then 5 else 0 end
            + coalesce(signal_rollup.intent_count, 0) * 20
        )
      end,
      signals = array(
        select distinct merged.signal
        from unnest(
          case when l.legacy_crm_captured_at is not null
            then l.legacy_signals_snapshot || signal_rollup.post_snapshot_signals
            else signal_rollup.signals
          end
        ) as merged(signal)
        order by merged.signal
      ),
      last_activity_at = coalesce(rollup.last_interaction_at, l.created_at)
  from interaction_rollup rollup, signal_rollup
  where l.id = p_lead_id;
  perform public.refresh_lead_questions(p_lead_id);
end;
$$;

revoke all on function public.recompute_lead_crm_rollup(uuid)
from public, anon, authenticated;

create or replace function public.recompute_lead_score_from_interactions()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.recompute_lead_crm_rollup(old.lead_id);
    return old;
  end if;
  perform public.recompute_lead_crm_rollup(new.lead_id);
  if tg_op = 'UPDATE' and old.lead_id is distinct from new.lead_id then
    perform public.recompute_lead_crm_rollup(old.lead_id);
  end if;
  return new;
end;
$$;

revoke all on function public.recompute_lead_score_from_interactions()
from public, anon, authenticated;

drop trigger if exists lead_interactions_recompute_score
on public.lead_interactions;
create trigger lead_interactions_recompute_score
after insert or update or delete on public.lead_interactions
for each row execute function public.recompute_lead_score_from_interactions();

-- Service retention may delete conversations directly rather than through the
-- browser RPC. Extend the existing privacy trigger so those deletions also
-- discard unmappable legacy CRM aggregates and rebuild the remaining state.
create or replace function public.clear_legacy_lead_questions_after_conversation_delete()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  affected_lead_id uuid;
begin
  for affected_lead_id in
    update public.leads l
    set legacy_questions_snapshot = '[]'::jsonb,
        legacy_questions_captured_at = null,
        legacy_score_snapshot = 0,
        legacy_signals_snapshot = '{}',
        legacy_crm_captured_at = null
    where l.owner_id = old.owner_id
      and (
        (old.expert_id is not null and l.expert_id = old.expert_id)
        or (old.expert_id is null and l.persona = old.persona)
      )
      and (
        l.legacy_questions_snapshot <> '[]'::jsonb
        or l.legacy_crm_captured_at is not null
      )
    returning l.id
  loop
    perform public.recompute_lead_crm_rollup(affected_lead_id);
  end loop;
  return old;
end;
$$;

revoke all on function public.clear_legacy_lead_questions_after_conversation_delete()
from public, anon, authenticated;
