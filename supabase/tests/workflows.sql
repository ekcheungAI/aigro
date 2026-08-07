begin;
create extension if not exists pgtap with schema extensions;
select plan(30);

set local role postgres;
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('51000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'one@test.local', '', now(), '{}', '{}', now(), now()),
  ('52000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'two@test.local', '', now(), '{}', '{}', now(), now())
on conflict (id) do nothing;
insert into public.profiles (id, email, name) values
  ('51000000-0000-0000-0000-000000000001', 'one@test.local', 'Member One'),
  ('52000000-0000-0000-0000-000000000002', 'two@test.local', 'Member Two')
on conflict (id) do nothing;
update public.account_access set tier = 'vip'
where user_id in (
  '51000000-0000-0000-0000-000000000001',
  '52000000-0000-0000-0000-000000000002'
);
update public.experts set feature_flags = feature_flags || '{"booking_enabled":true,"rag_enabled":true}'::jsonb
where slug = 'elvin-cheung';

insert into public.conversations (id, owner_id, user_id, expert_id, persona, title)
select '53000000-0000-0000-0000-000000000003',
  '51000000-0000-0000-0000-000000000001',
  '51000000-0000-0000-0000-000000000001', id, slug, 'Atomic chat'
from public.experts where slug = 'elvin-cheung';

select ok(
  public.persist_chat_round(
    '51000000-0000-0000-0000-000000000001',
    '53000000-0000-0000-0000-000000000003',
    (select id from public.experts where slug = 'elvin-cheung'),
    'elvin-cheung', '54000000-0000-0000-0000-000000000004',
    '我想預約，請問價錢？', '我未有足夠已發佈資料，建議預約真人導師。',
    'general', 'none', '[]'::jsonb, null, '[]'::jsonb,
    '{"prompt_tokens":10,"completion_tokens":12,"total_tokens":22}'::jsonb,
    'MiniMax-M3', 800, 'provider-request-1'
  ) is not null,
  'completed chat round is persisted'
);
select is(
  (select count(*) from public.messages where conversation_id = '53000000-0000-0000-0000-000000000003' and role = 'user'),
  1::bigint,
  'chat transaction stores one user message'
);

select public.persist_chat_round(
  '51000000-0000-0000-0000-000000000001',
  '53000000-0000-0000-0000-000000000003',
  (select id from public.experts where slug = 'elvin-cheung'),
  'elvin-cheung', '54000000-0000-0000-0000-000000000004',
  '我想預約，請問價錢？', 'duplicate should be ignored',
  'general', 'none'
);
select is(
  (select count(*) from public.messages where conversation_id = '53000000-0000-0000-0000-000000000003' and role = 'assistant'),
  1::bigint,
  'replayed request id is idempotent'
);
select is((select count(*) from public.leads where owner_id = '51000000-0000-0000-0000-000000000001'), 1::bigint,
  'chat transaction updates the owner lead');
select is(
  (select score from public.leads where owner_id = '51000000-0000-0000-0000-000000000001'),
  45::numeric,
  'chat CRM scoring adds booking and pricing intent once despite an idempotent replay'
);
select ok(
  (select signals @> array['問預約', '問價錢'] from public.leads
   where owner_id = '51000000-0000-0000-0000-000000000001'),
  'chat CRM record stores normalized high-intent signals'
);
select is((select count(*) from public.knowledge_gaps where conversation_id = '53000000-0000-0000-0000-000000000003'), 1::bigint,
  'no-coverage expert answer creates one knowledge gap');
select isnt(
  has_function_privilege('authenticated', 'public.persist_chat_round(uuid,uuid,uuid,text,text,text,text,text,text,jsonb,uuid,jsonb,jsonb,text,integer,text)', 'EXECUTE'),
  true,
  'browser role cannot call server-only chat persistence RPC'
);

-- Anonymous Auth owns data through owner_id without requiring a profile row.
set local role postgres;
insert into auth.users (
  id, instance_id, aud, role, encrypted_password,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  '56000000-0000-0000-0000-000000000006',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', '', '{}', '{}', now(), now()
);
insert into public.conversations (id, owner_id, user_id, expert_id, persona, title)
select '57000000-0000-0000-0000-000000000007',
  '56000000-0000-0000-0000-000000000006',
  '56000000-0000-0000-0000-000000000006', id, slug, 'Anonymous chat'
from public.experts where slug = 'elvin-cheung';
select ok(
  public.persist_chat_round(
    '56000000-0000-0000-0000-000000000006',
    '57000000-0000-0000-0000-000000000007',
    (select id from public.experts where slug = 'elvin-cheung'),
    'elvin-cheung', '58000000-0000-0000-0000-000000000008',
    '請問價錢？', '目前未能回答。', 'general', 'none'
  ) is not null,
  'anonymous Auth user can persist a completed chat round'
);
select is(
  (select user_id from public.conversations where id = '57000000-0000-0000-0000-000000000007'),
  null::uuid,
  'anonymous conversation keeps legacy profile user_id null'
);
select ok(
  exists (
    select 1 from public.leads
    where owner_id = '56000000-0000-0000-0000-000000000006'
      and user_id is null
  ),
  'anonymous CRM lead is owned by Auth uid without a profile foreign key'
);

set local role postgres;
insert into public.knowledge_sources (id, expert_id, source_type, title)
select '61000000-0000-0000-0000-000000000001', id, 'manual', 'Elvin published'
from public.experts where slug = 'elvin-cheung';
insert into public.knowledge_sources (id, expert_id, source_type, title)
select '62000000-0000-0000-0000-000000000002', id, 'manual', 'Jimmy published'
from public.experts where slug = 'jimmy-lau';
insert into public.knowledge_sources (id, expert_id, source_type, title)
select '63000000-0000-0000-0000-000000000003', id, 'manual', 'Elvin unapproved'
from public.experts where slug = 'elvin-cheung';
insert into public.knowledge_revisions (id, source_id, revision_no, status, content_hash) values
  ('71000000-0000-0000-0000-000000000001', '61000000-0000-0000-0000-000000000001', 1, 'approved', 'hash-elvin'),
  ('72000000-0000-0000-0000-000000000002', '62000000-0000-0000-0000-000000000002', 1, 'approved', 'hash-jimmy'),
  ('73000000-0000-0000-0000-000000000003', '63000000-0000-0000-0000-000000000003', 1, 'review', 'hash-unapproved');
update public.knowledge_sources set published_revision_id = '71000000-0000-0000-0000-000000000001'
where id = '61000000-0000-0000-0000-000000000001';
update public.knowledge_sources set published_revision_id = '72000000-0000-0000-0000-000000000002'
where id = '62000000-0000-0000-0000-000000000002';
insert into public.knowledge_chunks (revision_id, expert_id, chunk_index, content, embedding, citation_meta)
select '71000000-0000-0000-0000-000000000001', id, 0, 'Elvin only',
  ('[' || '1,' || repeat('0,', 1534) || '0]')::extensions.halfvec(1536), '{"page":3}'::jsonb
from public.experts where slug = 'elvin-cheung';
insert into public.knowledge_chunks (revision_id, expert_id, chunk_index, content, embedding)
select '72000000-0000-0000-0000-000000000002', id, 0, 'Jimmy only',
  ('[' || '1,' || repeat('0,', 1534) || '0]')::extensions.halfvec(1536)
from public.experts where slug = 'jimmy-lau';
insert into public.knowledge_chunks (revision_id, expert_id, chunk_index, content, embedding)
select '73000000-0000-0000-0000-000000000003', id, 0, 'Not published',
  ('[' || '1,' || repeat('0,', 1534) || '0]')::extensions.halfvec(1536)
from public.experts where slug = 'elvin-cheung';

select is(
  (select count(*) from public.match_expert_knowledge(
    (select id from public.experts where slug = 'elvin-cheung'),
    ('[' || '1,' || repeat('0,', 1534) || '0]')::extensions.halfvec(1536), 6, 0.70
  )), 1::bigint,
  'retrieval excludes an unapproved revision for the selected expert'
);
select is(
  (select revision_id from public.match_expert_knowledge(
    (select id from public.experts where slug = 'elvin-cheung'),
    ('[' || '1,' || repeat('0,', 1534) || '0]')::extensions.halfvec(1536), 6, 0.70
  ) limit 1), '71000000-0000-0000-0000-000000000001'::uuid,
  'retrieval returns the selected expert published revision'
);
select is(
  (select count(*) from public.match_expert_knowledge(
    (select id from public.experts where slug = 'jimmy-lau'),
    ('[' || '1,' || repeat('0,', 1534) || '0]')::extensions.halfvec(1536), 6, 0.70
  ) where content = 'Jimmy only'), 1::bigint,
  'retrieval does not leak another instructor content'
);

-- Persona Compiler: published evidence -> synthesis -> fidelity gate -> approval -> immutable publish.
insert into public.knowledge_sources (id, expert_id, source_type, title)
select '64000000-0000-0000-0000-000000000004', id, 'manual', 'Elvin second published'
from public.experts where slug = 'elvin-cheung';
insert into public.knowledge_revisions (id, source_id, revision_no, status, content_hash, approved_at) values
  ('74000000-0000-0000-0000-000000000004', '64000000-0000-0000-0000-000000000004', 1, 'approved', 'hash-elvin-two', now());
update public.knowledge_sources set published_revision_id = '74000000-0000-0000-0000-000000000004'
where id = '64000000-0000-0000-0000-000000000004';
update public.account_access set app_role = 'admin'
where user_id = '51000000-0000-0000-0000-000000000001';

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"51000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
select ok(
  public.queue_persona_synthesis((select id from public.experts where slug = 'elvin-cheung')) is not null,
  'expert or admin can queue persona synthesis from published knowledge'
);
select is(
  (select cardinality(source_revision_ids) from public.persona_synthesis_jobs
   where expert_id = (select id from public.experts where slug = 'elvin-cheung')),
  2,
  'persona synthesis snapshots only the two published approved revisions'
);

set local role postgres;
update public.persona_synthesis_jobs set
  status = 'review',
  output_blueprint = '{"mental_models":[{"name":"驗證優先"}],"expression_dna":{"tone":["直接"]},"honest_boundaries":[{"boundary":"唔虛構"}]}'::jsonb,
  evidence_manifest = '{"source_count":2,"evidence_count":4}'::jsonb,
  fidelity_report = '{"breakdown":{"edge_honesty":15,"source_transparency":14}}'::jsonb,
  fidelity_score = 84,
  fidelity_status = 'failed'
where expert_id = (select id from public.experts where slug = 'elvin-cheung');

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"51000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
select throws_ok(
  $$select public.review_persona_synthesis(
    (select id from public.persona_synthesis_jobs where expert_id = (select id from public.experts where slug = 'elvin-cheung')),
    'approve', 'should fail'
  )$$,
  'P0001', 'persona_fidelity_gate_failed',
  'failed fidelity cannot be approved without an explicit admin override'
);

set local role postgres;
update public.persona_synthesis_jobs set
  fidelity_report = '{"breakdown":{"stance_consistency":25,"style_distinctiveness":17,"edge_honesty":18,"source_transparency":13,"structural_completeness":12}}'::jsonb,
  fidelity_score = 85,
  fidelity_status = 'passed'
where expert_id = (select id from public.experts where slug = 'elvin-cheung');
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"51000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
select lives_ok(
  $$select public.review_persona_synthesis(
    (select id from public.persona_synthesis_jobs where expert_id = (select id from public.experts where slug = 'elvin-cheung')),
    'approve', 'verified in workflow test'
  )$$,
  'passed persona synthesis can receive human approval'
);
select ok(
  public.publish_compiled_persona(
    (select id from public.persona_synthesis_jobs where expert_id = (select id from public.experts where slug = 'elvin-cheung')),
    '你好，我係 Elvin 嘅授權 AI 導師。'
  ) is not null,
  'approved compiled persona can be published as an immutable version'
);
select is(
  (select fidelity_status from public.expert_persona_versions
   where id = (select published_persona_version_id from public.experts where slug = 'elvin-cheung')),
  'passed',
  'published persona preserves the fidelity gate result'
);
select is(
  (select persona_blueprint->'mental_models'->0->>'name' from public.expert_persona_versions
   where id = (select published_persona_version_id from public.experts where slug = 'elvin-cheung')),
  '驗證優先',
  'published persona preserves the reviewed blueprint'
);
select is(
  (select status from public.persona_synthesis_jobs
   where expert_id = (select id from public.experts where slug = 'elvin-cheung')),
  'published',
  'persona synthesis job records its terminal published state'
);
select isnt(
  has_function_privilege('authenticated', 'public.publish_persona_version(uuid,text,jsonb,jsonb,jsonb)', 'EXECUTE'),
  true,
  'browser roles cannot bypass Persona Compiler with the legacy publisher'
);

insert into public.availability_rules (expert_id, weekday, start_time, end_time, timezone, slot_minutes)
select id,
  extract(dow from (date_trunc('day', now() + interval '7 days') + interval '10 hours') at time zone 'UTC')::smallint,
  '09:00', '17:00', 'UTC', 45
from public.experts where slug = 'elvin-cheung';

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"51000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
select ok(
  public.create_booking(
    'elvin-cheung', date_trunc('day', now() + interval '7 days') + interval '10 hours'
  ) is not null,
  'VIP can request an available 45-minute slot'
);

select set_config('request.jwt.claims',
  '{"sub":"52000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
select throws_ok(
  $$select public.create_booking(
    'elvin-cheung', date_trunc('day', now() + interval '7 days') + interval '10 hours'
  )$$,
  'P0001', 'slot_taken',
  'exclusion constraint prevents two active bookings for one expert slot'
);

select set_config('request.jwt.claims',
  '{"sub":"51000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
select lives_ok(
  $$select public.reschedule_booking((
    select id from public.bookings
    where member_id = '51000000-0000-0000-0000-000000000001'
    order by created_at desc limit 1
  ), date_trunc('day', now() + interval '14 days') + interval '11 hours')$$,
  'member can reschedule outside the 48-hour window'
);
select is(
  (select starts_at from public.bookings
   where member_id = '51000000-0000-0000-0000-000000000001'
   order by created_at desc limit 1),
  date_trunc('day', now() + interval '14 days') + interval '11 hours',
  'reschedule stores the new start time'
);
select lives_ok(
  $$select public.cancel_booking((
    select id from public.bookings
    where member_id = '51000000-0000-0000-0000-000000000001'
    order by created_at desc limit 1
  ))$$,
  'member can cancel outside the 48-hour window'
);
select is(
  (select status from public.bookings
   where member_id = '51000000-0000-0000-0000-000000000001'
   order by created_at desc limit 1),
  'cancelled_member',
  'cancelled booking records member cancellation state'
);

set local role postgres;
insert into public.bookings (id, member_id, expert_id, starts_at, ends_at, status)
select '55000000-0000-0000-0000-000000000005',
  '51000000-0000-0000-0000-000000000001', id,
  now() + interval '36 hours', now() + interval '36 hours 45 minutes', 'requested'
from public.experts where slug = 'elvin-cheung';
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"51000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
select throws_ok(
  $$select public.cancel_booking('55000000-0000-0000-0000-000000000005')$$,
  'P0001', 'cancellation_window_closed',
  'member cannot cancel within 48 hours'
);

select * from finish();
rollback;
