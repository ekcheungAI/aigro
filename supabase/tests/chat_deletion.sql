begin;
create extension if not exists pgtap with schema extensions;
select plan(59);

set local role postgres;
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('ad100000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'delete-owner@test.local', '', now(), '{}', '{}', now(), now()),
  ('ad100000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'delete-other@test.local', '', now(), '{}', '{}', now(), now());

insert into public.experts (
  id, slug, display_name, status, feature_flags
) values (
  'ad200000-0000-0000-0000-000000000001',
  'delete-test-expert', 'Delete Test Expert', 'active', '{}'::jsonb
);

insert into public.conversations (
  id, owner_id, persona, expert_id, title
) values
  ('ad300000-0000-0000-0000-000000000001',
   'ad100000-0000-0000-0000-000000000001',
   'delete-test-expert', 'ad200000-0000-0000-0000-000000000001', 'First owned chat'),
  ('ad300000-0000-0000-0000-000000000002',
   'ad100000-0000-0000-0000-000000000001',
   'delete-test-expert', 'ad200000-0000-0000-0000-000000000001', 'Last owned chat'),
  ('ad300000-0000-0000-0000-000000000003',
   'ad100000-0000-0000-0000-000000000002',
   'delete-test-expert', 'ad200000-0000-0000-0000-000000000001', 'Other owner chat');

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"ad100000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);
select lives_ok(
  $$select public.consent_lead_contact(
    'ad300000-0000-0000-0000-000000000001', 'delete-owner@example.com'
  )$$,
  'test owner can establish contact consent'
);
select is(
  public.delete_chat_conversation('ad300000-0000-0000-0000-000000000001'),
  true,
  'owner can delete the first conversation'
);

set local role postgres;
select is(
  (select count(*) from public.conversations
   where id = 'ad300000-0000-0000-0000-000000000001'),
  0::bigint,
  'the first conversation is deleted'
);
select ok(
  (select contact_consented_at is not null and contact_email = 'delete-owner@example.com'
   from public.leads
   where owner_id = 'ad100000-0000-0000-0000-000000000001'
     and expert_id = 'ad200000-0000-0000-0000-000000000001'),
  'contact consent remains while another conversation with the expert exists'
);

set local role authenticated;
select is(
  public.delete_chat_conversation('ad300000-0000-0000-0000-000000000002'),
  true,
  'owner can delete the last conversation'
);

set local role postgres;
select is(
  (select count(*) from public.conversations
   where owner_id = 'ad100000-0000-0000-0000-000000000001'
     and expert_id = 'ad200000-0000-0000-0000-000000000001'),
  0::bigint,
  'no owned conversation with the expert remains'
);
select ok(
  (select contact_consented_at is null and contact_email is null
   from public.leads
   where owner_id = 'ad100000-0000-0000-0000-000000000001'
     and expert_id = 'ad200000-0000-0000-0000-000000000001'),
  'deleting the last conversation atomically clears contact consent'
);
select is(
  (select count(*) from public.audit_events
   where actor_id = 'ad100000-0000-0000-0000-000000000001'
     and action = 'lead.contact_consent_withdrawn'
     and metadata ->> 'reason' = 'last_conversation_deleted'),
  1::bigint,
  'automatic withdrawal is audited once'
);

set local role authenticated;
select is(
  public.delete_chat_conversation('ad300000-0000-0000-0000-000000000002'),
  true,
  'retrying an already committed deletion is successful'
);
select is(
  public.delete_chat_conversation('ad300000-0000-0000-0000-000000000003'),
  false,
  'one owner cannot delete another owner conversation'
);

set local role postgres;
select is(
  (select count(*) from public.conversations
   where id = 'ad300000-0000-0000-0000-000000000003'),
  1::bigint,
  'the other owner conversation remains intact'
);

insert into public.conversations (
  id, owner_id, persona, expert_id, title
) values (
  'ad300000-0000-0000-0000-000000000004',
  'ad100000-0000-0000-0000-000000000001',
  'delete-test-expert', 'ad200000-0000-0000-0000-000000000001',
  'Conversation removed outside the browser'
);

set local role authenticated;
select lives_ok(
  $$select public.consent_lead_contact(
    'ad300000-0000-0000-0000-000000000004', 'second-consent@example.com'
  )$$,
  'owner can consent again on a later conversation'
);

set local role postgres;
delete from public.conversations
where id = 'ad300000-0000-0000-0000-000000000004';
select ok(
  (select contact_consented_at is not null and contact_email is not null
   from public.leads
   where owner_id = 'ad100000-0000-0000-0000-000000000001'
     and expert_id = 'ad200000-0000-0000-0000-000000000001'),
  'the fixture has consent but no extant owned conversation'
);

set local role authenticated;
select lives_ok(
  $$select public.withdraw_lead_contact_consent_for_expert('delete-test-expert')$$,
  'account-scoped withdrawal works without an extant conversation'
);

set local role postgres;
select ok(
  (select contact_consented_at is null and contact_email is null
   from public.leads
   where owner_id = 'ad100000-0000-0000-0000-000000000001'
     and expert_id = 'ad200000-0000-0000-0000-000000000001'),
  'account-scoped withdrawal clears both contact fields'
);
select is(
  (select count(*) from public.audit_events
   where actor_id = 'ad100000-0000-0000-0000-000000000001'
     and action = 'lead.contact_consent_withdrawn'
     and metadata ->> 'reason' = 'account_request'),
  1::bigint,
  'account-scoped withdrawal is audited once'
);

set local role authenticated;
select lives_ok(
  $$select public.withdraw_lead_contact_consent_for_expert('delete-test-expert')$$,
  'account-scoped withdrawal is idempotent'
);

set local role postgres;
select is(
  (select count(*) from public.audit_events
   where actor_id = 'ad100000-0000-0000-0000-000000000001'
     and action = 'lead.contact_consent_withdrawn'
     and metadata ->> 'reason' = 'account_request'),
  1::bigint,
  'idempotent account withdrawal does not duplicate its audit event'
);

-- A committed create whose HTTP response was lost is recovered by retrying the
-- same browser-generated UUID. The fixture row represents the committed first
-- request; the RPC call below is the retry.
set local role postgres;
insert into public.conversations (
  id, owner_id, persona, expert_id, title
) values
  ('ad300000-0000-0000-0000-000000000005',
   'ad100000-0000-0000-0000-000000000001',
   'delete-test-expert', 'ad200000-0000-0000-0000-000000000001', 'Committed create'),
  ('ad300000-0000-0000-0000-000000000006',
   'ad100000-0000-0000-0000-000000000001',
   'delete-test-expert', 'ad200000-0000-0000-0000-000000000001', 'Remaining CRM chat');

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"ad100000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);
select is(
  public.create_chat_conversation_idempotent(
    'ad300000-0000-0000-0000-000000000005',
    'delete-test-expert', 'Ignored retry title'
  ),
  'ad300000-0000-0000-0000-000000000005'::uuid,
  'retry after a committed create returns the same client-generated UUID'
);
select throws_ok(
  $$select public.create_chat_conversation_idempotent(
    'ad300000-0000-0000-0000-000000000003',
    'delete-test-expert', 'Cross-owner collision'
  )$$,
  '23505', 'conversation_id_conflict',
  'a client UUID can never claim another owner conversation'
);

-- Exercise the opposite race ordering, not just create-then-delete. The
-- delete records its durable intent before any row exists, so the delayed
-- create cannot resurrect the conversation after deletion returned success.
select is(
  public.delete_chat_conversation('ad300000-0000-0000-0000-000000000007'),
  true,
  'delete-before-create records a successful owner-scoped delete intent'
);

set local role postgres;
select is(
  (select owner_id from public.chat_conversation_tombstones
   where conversation_id = 'ad300000-0000-0000-0000-000000000007'),
  'ad100000-0000-0000-0000-000000000001'::uuid,
  'delete-before-create persists the intended owner tombstone'
);
select ok(
  (select expires_at >= deleted_at + interval '30 days'
   from public.chat_conversation_tombstones
   where conversation_id = 'ad300000-0000-0000-0000-000000000007'),
  'tombstone retention outlives the browser chat retention window'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"ad100000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);
select throws_ok(
  $$select public.create_chat_conversation_idempotent(
    'ad300000-0000-0000-0000-000000000007',
    'delete-test-expert', 'Delayed create'
  )$$,
  'P0003', 'conversation_deleted',
  'a delayed create is rejected after delete won the UUID lock first'
);

set local role postgres;
select is(
  (select count(*) from public.conversations
   where id = 'ad300000-0000-0000-0000-000000000007'),
  0::bigint,
  'delete-before-create never leaves a resurrected conversation row'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"ad100000-0000-0000-0000-000000000002","role":"authenticated"}',
  true
);
select throws_ok(
  $$select public.create_chat_conversation_idempotent(
    'ad300000-0000-0000-0000-000000000007',
    'delete-test-expert', 'Other owner collision'
  )$$,
  '23505', 'conversation_id_conflict',
  'another owner cannot claim a tombstoned client UUID'
);
select is(
  public.delete_chat_conversation('ad300000-0000-0000-0000-000000000007'),
  false,
  'another owner cannot overwrite an existing delete intent'
);

set local role postgres;
insert into public.chat_conversation_tombstones (conversation_id, owner_id)
select gen_random_uuid(), 'ad100000-0000-0000-0000-000000000002'::uuid
from generate_series(1, 64);
select ok(
  to_regclass('public.chat_conversation_tombstones_expires_idx') is not null
  and to_regclass('public.chat_conversation_tombstones_owner_expires_idx') is not null,
  'tombstone cleanup and owner-cap lookups have supporting indexes'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"ad100000-0000-0000-0000-000000000002","role":"authenticated"}',
  true
);
select throws_ok(
  $$select public.delete_chat_conversation(
    'ad300000-0000-0000-0000-000000000008'
  )$$,
  'P0001', 'chat_tombstone_limit_reached',
  'an owner cannot create unbounded delete intents for unknown UUIDs'
);

set local role postgres;
select is(
  (select count(*) from public.chat_conversation_tombstones
   where owner_id = 'ad100000-0000-0000-0000-000000000002'
     and expires_at > now()),
  64::bigint,
  'a rejected unknown-UUID tombstone does not add an overflow row'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"ad100000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

set local role postgres;
update public.leads
set score = 25,
    signals = array['asked_question', '問價錢'],
    legacy_score_snapshot = 25,
    legacy_signals_snapshot = array['asked_question', '問價錢'],
    legacy_crm_captured_at = now()
where owner_id = 'ad100000-0000-0000-0000-000000000001'
  and expert_id = 'ad200000-0000-0000-0000-000000000001';

insert into public.messages (
  id, conversation_id, role, content, source, server_generated
) values
  ('ad400000-0000-0000-0000-000000000001',
   'ad300000-0000-0000-0000-000000000005', 'user', '價錢幾多？', 'user', true),
  ('ad400000-0000-0000-0000-000000000002',
   'ad300000-0000-0000-0000-000000000006', 'user', '想預約', 'user', true),
  ('ad400000-0000-0000-0000-000000000003',
   'ad300000-0000-0000-0000-000000000005', 'user', '舊價錢問題', 'user', true);

insert into public.lead_interactions (
  lead_id, expert_id, owner_id, conversation_id, message_id, question,
  signals, included_in_legacy_crm_snapshot
) values (
  (select id from public.leads
    where owner_id = 'ad100000-0000-0000-0000-000000000001'
      and expert_id = 'ad200000-0000-0000-0000-000000000001'),
  'ad200000-0000-0000-0000-000000000001',
  'ad100000-0000-0000-0000-000000000001',
  'ad300000-0000-0000-0000-000000000005',
  'ad400000-0000-0000-0000-000000000003', '舊價錢問題',
  array['asked_question', '問價錢'], true
);
update public.lead_interactions
set score_delta = 25
where message_id = 'ad400000-0000-0000-0000-000000000003';
select is(
  (select score from public.leads
   where owner_id = 'ad100000-0000-0000-0000-000000000001'
     and expert_id = 'ad200000-0000-0000-0000-000000000001'),
  25::numeric,
  'the legacy CRM baseline does not re-add an interaction delta it already contains'
);

insert into public.lead_interactions (
  lead_id, expert_id, owner_id, conversation_id, message_id, question, signals
) values (
  (select id from public.leads
   where owner_id = 'ad100000-0000-0000-0000-000000000001'
     and expert_id = 'ad200000-0000-0000-0000-000000000001'),
  'ad200000-0000-0000-0000-000000000001',
  'ad100000-0000-0000-0000-000000000001',
  'ad300000-0000-0000-0000-000000000005',
  'ad400000-0000-0000-0000-000000000001', '價錢幾多？',
  array['asked_question', '問價錢']
);
select is(
  (select score from public.leads
   where owner_id = 'ad100000-0000-0000-0000-000000000001'
     and expert_id = 'ad200000-0000-0000-0000-000000000001'),
  25::numeric,
  'a repeated post-baseline intent does not inflate the preserved CRM score'
);

insert into public.lead_interactions (
  lead_id, expert_id, owner_id, conversation_id, message_id, question, signals
) values (
  (select id from public.leads
    where owner_id = 'ad100000-0000-0000-0000-000000000001'
      and expert_id = 'ad200000-0000-0000-0000-000000000001'),
  'ad200000-0000-0000-0000-000000000001',
  'ad100000-0000-0000-0000-000000000001',
  'ad300000-0000-0000-0000-000000000006',
  'ad400000-0000-0000-0000-000000000002', '想預約',
  array['asked_question', '問預約']
);

select is(
  (select score from public.leads
   where owner_id = 'ad100000-0000-0000-0000-000000000001'
     and expert_id = 'ad200000-0000-0000-0000-000000000001'),
  45::numeric,
  'CRM score reflects the two distinct durable intent signals'
);
select ok(
  (select signals @> array['asked_question', '問價錢', '問預約']
      and cardinality(signals) = 3
   from public.leads
   where owner_id = 'ad100000-0000-0000-0000-000000000001'
     and expert_id = 'ad200000-0000-0000-0000-000000000001'),
  'CRM signals reflect both retained interactions before deletion'
);
select ok(
  (select questions @> '["價錢幾多？", "想預約"]'::jsonb
   from public.leads
   where owner_id = 'ad100000-0000-0000-0000-000000000001'
     and expert_id = 'ad200000-0000-0000-0000-000000000001'),
  'CRM questions reflect both durable interactions before deletion'
);

set local role authenticated;
select is(
  public.delete_chat_conversation('ad300000-0000-0000-0000-000000000005'),
  true,
  'the committed create target remains deletable by its persisted UUID'
);

set local role postgres;
select is(
  (select score from public.leads
   where owner_id = 'ad100000-0000-0000-0000-000000000001'
     and expert_id = 'ad200000-0000-0000-0000-000000000001'),
  25::numeric,
  'conversation cascade recomputes CRM score from the remaining interaction'
);
select ok(
  (select signals @> array['asked_question', '問預約']
      and not (signals @> array['問價錢'])
      and cardinality(signals) = 2
   from public.leads
   where owner_id = 'ad100000-0000-0000-0000-000000000001'
     and expert_id = 'ad200000-0000-0000-0000-000000000001'),
  'conversation cascade removes stale deleted-chat intent signals'
);
select is(
  (select count(*) from public.lead_interactions
   where owner_id = 'ad100000-0000-0000-0000-000000000001'
     and expert_id = 'ad200000-0000-0000-0000-000000000001'),
  1::bigint,
  'only the remaining conversation interaction survives'
);
select is(
  (select questions from public.leads
   where owner_id = 'ad100000-0000-0000-0000-000000000001'
     and expert_id = 'ad200000-0000-0000-0000-000000000001'),
  '["想預約"]'::jsonb,
  'conversation deletion removes the deleted question from CRM history'
);
select ok(
  (select legacy_crm_captured_at is null
      and legacy_score_snapshot = 0
      and legacy_signals_snapshot = '{}'::text[]
   from public.leads
   where owner_id = 'ad100000-0000-0000-0000-000000000001'
     and expert_id = 'ad200000-0000-0000-0000-000000000001'),
  'deleting a chat conservatively clears CRM aggregates that cannot be mapped to one conversation'
);
select ok(
  position(
    'aigro:chat-conversation:' in pg_get_functiondef(
      'public.create_chat_conversation_idempotent(uuid,text,text)'::regprocedure
    )
  ) > 0
  and position(
    'aigro:chat-conversation:' in pg_get_functiondef(
      'public.delete_chat_conversation(uuid)'::regprocedure
    )
  ) > 0,
  'create and delete serialize on the same conversation UUID lock'
);
select ok(
  position(
    'aigro:lead-score:' in pg_get_functiondef(
      'public.recompute_lead_crm_rollup(uuid)'::regprocedure
    )
  ) > 0
  and position(
    'aigro:lead-score:' in pg_get_functiondef(
      'public.delete_chat_conversation(uuid)'::regprocedure
    )
  ) > 0,
  'conversation deletion and interaction rollups share the CRM score lock'
);
select ok(
  position(
    'aigro:lead-contact-consent:' in pg_get_functiondef(
      'public.delete_chat_conversation(uuid)'::regprocedure
    )
  ) < position(
    'select l.* into lead_row' in pg_get_functiondef(
      'public.delete_chat_conversation(uuid)'::regprocedure
    )
  )
  and position(
    'select l.* into lead_row' in pg_get_functiondef(
      'public.delete_chat_conversation(uuid)'::regprocedure
    )
  ) < position(
    'aigro:lead-score:' in pg_get_functiondef(
      'public.delete_chat_conversation(uuid)'::regprocedure
    )
  ),
  'delete uses canonical consent advisory then lead row then score lock order'
);
select ok(
  position(
    'from public.leads l where l.id = p_lead_id for update' in pg_get_functiondef(
      'public.recompute_lead_crm_rollup(uuid)'::regprocedure
    )
  ) < position(
    'aigro:lead-score:' in pg_get_functiondef(
      'public.recompute_lead_crm_rollup(uuid)'::regprocedure
    )
  )
  and position(
    'refresh_lead_questions' in pg_get_functiondef(
      'public.recompute_lead_crm_rollup(uuid)'::regprocedure
    )
  ) > 0,
  'rollup locks the lead before score and refreshes reversible questions'
);
select ok(
  position(
    'select l.legacy_score_snapshot' in pg_get_functiondef(
      'public.normalize_lead_interaction_score()'::regprocedure
    )
  ) < position(
    'aigro:lead-score:' in pg_get_functiondef(
      'public.normalize_lead_interaction_score()'::regprocedure
    )
  ),
  'interaction normalization follows lead row then score lock ordering'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.create_chat_conversation_idempotent(uuid,text,text)', 'EXECUTE'
  ),
  'authenticated callers can execute idempotent chat create'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.create_chat_conversation_idempotent(uuid,text,text)', 'EXECUTE'
  ),
  'anonymous callers cannot execute idempotent chat create'
);
select ok(
  not has_function_privilege(
    'authenticated', 'public.create_chat_conversation(text,text)', 'EXECUTE'
  ),
  'authenticated callers cannot bypass tombstones through legacy chat create'
);
select ok(
  not has_table_privilege('authenticated', 'public.conversations', 'DELETE'),
  'authenticated callers cannot bypass tombstones through direct table deletion'
);
select ok(
  not has_table_privilege(
    'authenticated', 'public.chat_conversation_tombstones', 'SELECT'
  )
  and not has_table_privilege(
    'authenticated', 'public.chat_conversation_tombstones', 'INSERT'
  )
  and not has_table_privilege(
    'authenticated', 'public.chat_conversation_tombstones', 'UPDATE'
  )
  and not has_table_privilege(
    'authenticated', 'public.chat_conversation_tombstones', 'DELETE'
  ),
  'browser callers have no direct tombstone table privileges'
);
select is(
  (select relrowsecurity from pg_class
   where oid = 'public.chat_conversation_tombstones'::regclass),
  true,
  'tombstone table has RLS enabled as defense in depth'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.purge_expired_chat_conversation_tombstones()', 'EXECUTE'
  )
  and has_function_privilege(
    'service_role',
    'public.purge_expired_chat_conversation_tombstones()', 'EXECUTE'
  ),
  'only the service role can execute tombstone retention cleanup'
);
select is(
  (select count(*) from cron.job
   where jobname = 'aigro-purge-chat-conversation-tombstones'),
  1::bigint,
  'daily tombstone retention cleanup is scheduled exactly once'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"role":"authenticated"}', true);
select throws_ok(
  $$select public.delete_chat_conversation(
    'ad300000-0000-0000-0000-000000000003'
  )$$,
  '42501', 'authentication_required',
  'chat deletion requires an authenticated owner'
);

set local role postgres;
select ok(
  has_function_privilege(
    'authenticated', 'public.delete_chat_conversation(uuid)', 'EXECUTE'
  ),
  'authenticated callers can execute the delete RPC'
);
select ok(
  not has_function_privilege(
    'anon', 'public.delete_chat_conversation(uuid)', 'EXECUTE'
  ),
  'anonymous browser callers cannot execute the delete RPC'
);
select ok(
  has_function_privilege(
    'authenticated', 'public.withdraw_lead_contact_consent_for_expert(text)', 'EXECUTE'
  ),
  'authenticated callers can execute account-scoped withdrawal'
);
select ok(
  not has_function_privilege(
    'anon', 'public.withdraw_lead_contact_consent_for_expert(text)', 'EXECUTE'
  ),
  'anonymous browser callers cannot execute account-scoped withdrawal'
);

select * from finish();
rollback;
