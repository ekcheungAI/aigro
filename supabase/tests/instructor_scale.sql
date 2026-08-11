begin;
create extension if not exists pgtap with schema extensions;
select plan(47);

set local role postgres;

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('81000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'scale-admin@test.local', '', now(), '{}', '{}', now(), now()),
  ('82000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'scale-owner-a@test.local', '', now(), '{}', '{}', now(), now()),
  ('83000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'scale-owner-b@test.local', '', now(), '{}', '{}', now(), now()),
  ('84000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'scale-member@test.local', '', now(), '{}', '{}', now(), now())
on conflict (id) do nothing;

update public.account_access set app_role = 'super_admin'
where user_id = '81000000-0000-0000-0000-000000000001';

insert into public.experts (id, slug, display_name, status, verified, public_profile_enabled)
values
  ('85000000-0000-0000-0000-000000000005', 'scale-expert-a', 'Scale Expert A', 'active', true, true),
  ('86000000-0000-0000-0000-000000000006', 'scale-expert-b', 'Scale Expert B', 'active', true, true);

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"81000000-0000-0000-0000-000000000001","role":"authenticated"}', true);

select lives_ok(
  $$select public.assign_expert_owner(
    '85000000-0000-0000-0000-000000000005',
    '82000000-0000-0000-0000-000000000002'
  )$$,
  'super-admin can atomically assign an instructor owner'
);
select lives_ok(
  $$select public.assign_expert_owner(
    '86000000-0000-0000-0000-000000000006',
    '83000000-0000-0000-0000-000000000003'
  )$$,
  'a second instructor receives a distinct owner'
);
select is(
  (select owner_user_id from public.experts where id = '85000000-0000-0000-0000-000000000005'),
  '82000000-0000-0000-0000-000000000002'::uuid,
  'expert owner mirror is synchronized'
);
select is(
  (select expert_id from public.account_access where user_id = '82000000-0000-0000-0000-000000000002'),
  '85000000-0000-0000-0000-000000000005'::uuid,
  'account access points at the same instructor'
);

set local role postgres;
select lives_ok(
  $$insert into public.experts (slug, display_name, status)
    select 'capacity-seat-' || g, 'Capacity Seat ' || g, 'draft'
    from generate_series(
      1,
      greatest(0, 20 - (select count(*)::integer from public.experts where slug <> 'platform'))
    ) g$$,
  'database accepts instructor seats up to the platform limit'
);
select is(
  (select count(*) from public.experts where slug <> 'platform'),
  20::bigint,
  'the configured instructor capacity is exactly twenty'
);
select throws_ok(
  $$insert into public.experts (slug, display_name, status)
    values ('capacity-seat-21', 'Capacity Seat 21', 'draft')$$,
  'P0001', 'instructor_capacity_reached',
  'a twenty-first instructor is rejected under concurrent-safe database enforcement'
);
select throws_ok(
  $$update public.experts set slug = 'platform-seat' where slug = 'platform'$$,
  '23514', 'platform_slug_immutable',
  'the reserved platform row cannot be renamed to bypass instructor capacity'
);
select throws_ok(
  $$delete from public.experts where slug = 'platform'$$,
  '23514', 'platform_expert_is_reserved',
  'the reserved platform row cannot be deleted'
);
select throws_like(
  $$update public.account_access
    set app_role = 'expert', expert_id = null
    where user_id = '84000000-0000-0000-0000-000000000004'$$,
  '%account_access_expert_role_consistency%',
  'database role consistency rejects an expert without a workspace'
);

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"81000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
select throws_ok(
  $$select public.assign_expert_owner(
    (select id from public.experts where slug = 'platform'),
    '84000000-0000-0000-0000-000000000004'
  )$$,
  '23514', 'platform_expert_is_reserved',
  'the master admin cannot assign the reserved platform persona to an instructor'
);
select lives_ok(
  $$select public.archive_unused_expert_draft(
    (select id from public.experts where slug = 'capacity-seat-1')
  )$$,
  'master admin can archive an unused draft and release its seat'
);
select is(
  (select count(*) from public.experts
   where slug <> 'platform' and archived_at is null),
  19::bigint,
  'archived drafts do not consume an instructor seat'
);
set local role postgres;
select lives_ok(
  $$insert into public.experts (slug, display_name, status)
    values ('capacity-replacement', 'Capacity Replacement', 'draft')$$,
  'a released instructor seat can be reused'
);
select is(
  (select count(*) from public.experts
   where slug <> 'platform' and archived_at is null),
  20::bigint,
  'seat reuse still preserves the twenty-instructor cap'
);

insert into public.expert_persona_versions (
  id, expert_id, version, greeting, status, published_at
) values (
  '85100000-0000-0000-0000-000000000005',
  '85000000-0000-0000-0000-000000000005', 1, 'Hello', 'published', now()
);
update public.experts
set published_persona_version_id = '85100000-0000-0000-0000-000000000005',
    feature_flags = feature_flags || '{"rag_enabled":true}'::jsonb
where id = '85000000-0000-0000-0000-000000000005';
insert into public.knowledge_sources (
  id, expert_id, source_type, title, rights_status, authorized_at
) values (
  '85200000-0000-0000-0000-000000000005',
  '85000000-0000-0000-0000-000000000005', 'manual', 'Scale source', 'granted', now()
);
insert into public.knowledge_revisions (
  id, source_id, revision_no, extracted_text, status, approved_at
) values (
  '85300000-0000-0000-0000-000000000005',
  '85200000-0000-0000-0000-000000000005', 1, 'Approved evidence', 'approved', now()
);
update public.knowledge_sources
set published_revision_id = '85300000-0000-0000-0000-000000000005'
where id = '85200000-0000-0000-0000-000000000005';
insert into public.knowledge_chunks (
  revision_id, expert_id, chunk_index, content, embedding
) values (
  '85300000-0000-0000-0000-000000000005',
  '85000000-0000-0000-0000-000000000005', 0, 'Approved evidence',
  ('[' || array_to_string(array_fill(0, array[1536]), ',') || ']')::extensions.halfvec
);
insert into public.knowledge_sources (
  id, expert_id, source_type, title, rights_status, authorized_at
) values (
  '85400000-0000-0000-0000-000000000005',
  '85000000-0000-0000-0000-000000000005', 'manual', 'Scale source two', 'granted', now()
);
insert into public.knowledge_revisions (
  id, source_id, revision_no, extracted_text, status, approved_at
) values (
  '85500000-0000-0000-0000-000000000005',
  '85400000-0000-0000-0000-000000000005', 1, 'Second approved evidence', 'approved', now()
);
update public.knowledge_sources
set published_revision_id = '85500000-0000-0000-0000-000000000005'
where id = '85400000-0000-0000-0000-000000000005';
insert into public.knowledge_chunks (
  revision_id, expert_id, chunk_index, content, embedding
) values (
  '85500000-0000-0000-0000-000000000005',
  '85000000-0000-0000-0000-000000000005', 0, 'Second approved evidence',
  ('[' || array_to_string(array_fill(0, array[1536]), ',') || ']')::extensions.halfvec
);
insert into public.persona_evaluation_questions (
  expert_id, category, question
)
select
  '85000000-0000-0000-0000-000000000005',
  (array['known_stance', 'edge_honesty', 'voice', 'source_transparency'])[(g - 1) % 4 + 1],
  'Scale evaluation question ' || g
from generate_series(1, 25) g;
insert into public.persona_synthesis_jobs (
  id, expert_id, source_revision_ids, status, fidelity_status,
  persona_version_id
) values (
  '85600000-0000-0000-0000-000000000005',
  '85000000-0000-0000-0000-000000000005',
  array[
    '85300000-0000-0000-0000-000000000005'::uuid,
    '85500000-0000-0000-0000-000000000005'::uuid
  ],
  'published', 'passed', '85100000-0000-0000-0000-000000000005'
);
insert into public.persona_evaluation_runs (
  id, synthesis_job_id, generator_model, evaluator_model, score, status, report
)
select
  '85700000-0000-0000-0000-000000000005',
  '85600000-0000-0000-0000-000000000005',
  'test-generator', 'test-evaluator', 95, 'passed',
  jsonb_build_object(
    'evaluation', jsonb_build_object(
      'question_count', count(*),
      'question_ids', jsonb_agg(id::text order by id),
      'response_count', count(*)
    )
  )
from public.persona_evaluation_questions
where expert_id = '85000000-0000-0000-0000-000000000005' and active;

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"84000000-0000-0000-0000-000000000004","role":"authenticated"}', true);

select throws_ok(
  $$select public.create_chat_conversation('scale-expert-b', 'Not ready')$$,
  'P0002', 'instructor_not_available',
  'member cannot create a conversation for an instructor that failed the chat release gate'
);
select ok(
  public.create_chat_conversation('scale-expert-a', 'Scale chat') is not null,
  'member creates a server-routed instructor conversation'
);
select is(
  (select expert_id from public.conversations
   where owner_id = '84000000-0000-0000-0000-000000000004'
   order by created_at desc limit 1),
  '85000000-0000-0000-0000-000000000005'::uuid,
  'conversation routing uses the immutable instructor id'
);
update public.conversations
set expert_id = '86000000-0000-0000-0000-000000000006'
where owner_id = '84000000-0000-0000-0000-000000000004';
select is(
  (select expert_id from public.conversations
   where owner_id = '84000000-0000-0000-0000-000000000004'
   order by created_at desc limit 1),
  '85000000-0000-0000-0000-000000000005'::uuid,
  'member cannot move a conversation to another instructor'
);
select throws_like(
  $$insert into public.messages (conversation_id, role, content)
    select id, 'assistant', 'fabricated assistant answer'
    from public.conversations
    where owner_id = '84000000-0000-0000-0000-000000000004'
    order by created_at desc limit 1$$,
  '%row-level security policy%',
  'member cannot fabricate an assistant message'
);

set local role postgres;
do $$
begin
  perform public.reserve_chat_request(
    '84000000-0000-0000-0000-000000000004',
    '87000000-0000-0000-0000-000000000007',
    (select id from public.conversations
     where owner_id = '84000000-0000-0000-0000-000000000004'
     order by created_at desc limit 1),
    '85000000-0000-0000-0000-000000000005',
    encode(extensions.digest(convert_to('我想預約，請問價錢？', 'UTF8'), 'sha256'), 'hex')
  );
end;
$$;
select throws_ok(
  $$select public.reserve_chat_request(
    '84000000-0000-0000-0000-000000000004',
    '87000000-0000-0000-0000-000000000007',
    (select id from public.conversations
     where owner_id = '84000000-0000-0000-0000-000000000004'
     order by created_at desc limit 1),
    '85000000-0000-0000-0000-000000000005',
    encode(extensions.digest(convert_to('different payload', 'UTF8'), 'sha256'), 'hex')
  )$$,
  '23514', 'request_id_payload_mismatch',
  'one request id cannot be replayed with a different message payload'
);
select is(
  public.reserve_chat_request(
    '84000000-0000-0000-0000-000000000004',
    '87100000-0000-0000-0000-000000000007',
    (select id from public.conversations
     where owner_id = '84000000-0000-0000-0000-000000000004'
     order by created_at desc limit 1),
    '85000000-0000-0000-0000-000000000005',
    encode(extensions.digest(convert_to('parallel question', 'UTF8'), 'sha256'), 'hex')
  ) ->> 'state',
  'conversation_in_progress',
  'a second request cannot generate concurrently against the same conversation history'
);
select ok(
  public.persist_chat_round(
    '84000000-0000-0000-0000-000000000004',
    (select id from public.conversations
     where owner_id = '84000000-0000-0000-0000-000000000004'
     order by created_at desc limit 1),
    '85000000-0000-0000-0000-000000000005',
    'scale-expert-a', '87000000-0000-0000-0000-000000000007',
    '我想預約，請問價錢？', '可以先了解你嘅需要。', 'general', 'none'
  ) is not null,
  'server persists the completed instructor round'
);
select is(
  public.reserve_chat_request(
    '84000000-0000-0000-0000-000000000004',
    '87200000-0000-0000-0000-000000000007',
    (select id from public.conversations
     where owner_id = '84000000-0000-0000-0000-000000000004'
     order by created_at desc limit 1),
    '85000000-0000-0000-0000-000000000005',
    encode(extensions.digest(convert_to('next question', 'UTF8'), 'sha256'), 'hex')
  ) ->> 'state',
  'reserved',
  'the next turn can reserve after the prior turn commits'
);
select is(
  (select expert_id from public.leads
   where owner_id = '84000000-0000-0000-0000-000000000004'),
  '85000000-0000-0000-0000-000000000005'::uuid,
  'CRM lead is normalized to immutable instructor id'
);
select set_config(
  'test.scale_lead_id',
  (select id::text from public.leads
   where owner_id = '84000000-0000-0000-0000-000000000004'),
  true
);

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"84000000-0000-0000-0000-000000000004","role":"authenticated"}', true);
update public.leads set score = 100, stage = '已轉化';
set local role postgres;
select results_eq(
  $$select score, stage from public.leads
    where owner_id = '84000000-0000-0000-0000-000000000004'$$,
  $$values (45::numeric, '新線索'::text)$$,
  'member browser write cannot inflate the stored CRM score or stage'
);

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"82000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
select is((select count(*) from public.leads), 1::bigint,
  'instructor A sees their own CRM lead');
select lives_ok(
  $$select public.update_expert_lead(
    (select id from public.leads limit 1), '跟進中', '已安排跟進', now() + interval '2 days'
  )$$,
  'instructor A can update their own CRM through the audited RPC'
);
select is((select count(*) from public.lead_notes), 1::bigint,
  'CRM note is append-only and visible to the owning instructor');

select set_config('request.jwt.claims',
  '{"sub":"83000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
select is((select count(*) from public.leads), 0::bigint,
  'instructor B cannot read instructor A CRM');
select throws_ok(
  $$select public.update_expert_lead(
    current_setting('test.scale_lead_id')::uuid,
    '已轉化', null, null
  )$$,
  '42501', 'not_allowed',
  'instructor B cannot mutate instructor A CRM'
);

select set_config('request.jwt.claims',
  '{"sub":"82000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
select ok(
  public.upsert_social_connection(
    '85000000-0000-0000-0000-000000000005', 'tiktok', '@scale-a', true
  ) is not null,
  'instructor can explicitly consent to daily public social sync'
);
select is(
  (select consent_status from public.social_connections where expert_id = '85000000-0000-0000-0000-000000000005'),
  'active',
  'social consent is stored as active'
);
select ok(
  (select consented_at is not null from public.social_connections
   where expert_id = '85000000-0000-0000-0000-000000000005'),
  'social consent records its timestamp'
);

select set_config('request.jwt.claims',
  '{"sub":"83000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
select is((select count(*) from public.social_connections), 0::bigint,
  'another instructor cannot read social connection metadata');
select isnt(
  has_function_privilege('authenticated', 'public.claim_social_sync_jobs(text,integer)', 'EXECUTE'),
  true,
  'browser clients cannot claim internal social jobs'
);

set local role postgres;
update public.experts
set feature_flags = feature_flags || '{"social_sync_enabled":true}'::jsonb
where id = '85000000-0000-0000-0000-000000000005';
select lives_ok(
  $$select public.queue_due_social_syncs(current_date)$$,
  'one shared dispatcher can queue consented daily social syncs'
);
select is((select count(*) from public.social_sync_jobs), 1::bigint,
  'dispatcher creates one idempotent job per connection and day');
select lives_ok(
  $$select public.queue_due_social_syncs(current_date)$$,
  'rerunning the daily dispatcher is idempotent'
);
select is((select count(*) from public.social_sync_jobs), 1::bigint,
  'idempotent dispatch does not duplicate provider work');
select throws_ok(
  $$select * from public.claim_social_sync_jobs('scale-worker', 2)$$,
  '22023', 'social_sync_claim_limit_must_be_one',
  'the social worker cannot bypass the global one-job-per-invocation limit'
);

select ok(
  exists (
    select 1 from public.list_public_instructors()
    where slug = 'scale-expert-a' and public_profile_enabled and chat_ready
  ),
  'sanitized public directory includes active profiles and truthful chat readiness'
);
update public.knowledge_sources set rights_status = 'revoked', revoked_at = now()
where id = '85200000-0000-0000-0000-000000000005';
select is(public.is_expert_chat_ready('85000000-0000-0000-0000-000000000005'), false,
  'chat readiness fails immediately when a corpus grant is revoked');

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"81000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
select lives_ok(
  $$select public.archive_expert_workspace(
    '86000000-0000-0000-0000-000000000006'
  )$$,
  'master admin can offboard an established instructor workspace without deleting private history'
);
select ok(
  (select archived_at is not null and owner_user_id is null
      and status = 'suspended' and not public_profile_enabled
   from public.experts where id = '86000000-0000-0000-0000-000000000006')
  and (select app_role = 'member' and expert_id is null
       from public.account_access where user_id = '83000000-0000-0000-0000-000000000003'),
  'offboarding removes public access, feature ownership and the occupied seat'
);
select lives_ok(
  $$select public.restore_expert_workspace(
    '86000000-0000-0000-0000-000000000006'
  )$$,
  'master admin can restore an archived workspace when capacity allows'
);
select ok(
  (select archived_at is null and owner_user_id is null and status = 'draft'
      and not public_profile_enabled
      and feature_flags = '{"cms_ingestion_enabled":false,"rag_enabled":false,"booking_enabled":false,"persona_compiler_enabled":false,"social_sync_enabled":false}'::jsonb
   from public.experts where id = '86000000-0000-0000-0000-000000000006'),
  'restored workspace is private, ownerless and fail-closed until it passes onboarding again'
);

select * from finish();
rollback;
