begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

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
    'CMS 未有答案時點算？', '我未有足夠已發佈資料，建議預約真人導師。',
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
  'CMS 未有答案時點算？', 'duplicate should be ignored',
  'general', 'none'
);
select is(
  (select count(*) from public.messages where conversation_id = '53000000-0000-0000-0000-000000000003' and role = 'assistant'),
  1::bigint,
  'replayed request id is idempotent'
);
select is((select count(*) from public.leads where owner_id = '51000000-0000-0000-0000-000000000001'), 1::bigint,
  'chat transaction updates the owner lead');
select is((select count(*) from public.knowledge_gaps where conversation_id = '53000000-0000-0000-0000-000000000003'), 1::bigint,
  'no-coverage expert answer creates one knowledge gap');
select isnt(
  has_function_privilege('authenticated', 'public.persist_chat_round(uuid,uuid,uuid,text,text,text,text,text,text,jsonb,uuid,jsonb,jsonb,text,integer,text)', 'EXECUTE'),
  true,
  'browser role cannot call server-only chat persistence RPC'
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
