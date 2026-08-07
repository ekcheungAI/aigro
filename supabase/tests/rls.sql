begin;
create extension if not exists pgtap with schema extensions;
select plan(25);

set local role postgres;

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'expert@test.local', '', now(), '{}', '{}', now(), now()),
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'member@test.local', '', now(), '{}', '{}', now(), now())
on conflict (id) do nothing;

insert into public.profiles (id, email, name) values
  ('10000000-0000-0000-0000-000000000001', 'expert@test.local', 'Expert'),
  ('20000000-0000-0000-0000-000000000002', 'member@test.local', 'Member')
on conflict (id) do nothing;

update public.experts set owner_user_id = '10000000-0000-0000-0000-000000000001'
where slug = 'elvin-cheung';
update public.account_access aa set app_role = 'expert', expert_id = e.id
from public.experts e
where aa.user_id = '10000000-0000-0000-0000-000000000001'
  and e.slug = 'elvin-cheung';

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}', true);

update public.profiles set role = 'admin', tier = 'vip'
where id = '10000000-0000-0000-0000-000000000001';
select is(
  (select role from public.profiles where id = '10000000-0000-0000-0000-000000000001'),
  'expert',
  'profile update cannot self-promote an expert to admin'
);
select is(
  (select tier from public.profiles where id = '10000000-0000-0000-0000-000000000001'),
  'free',
  'profile update cannot self-promote membership tier'
);

insert into public.conversations (id, owner_id, user_id, persona, expert_id, title)
select '30000000-0000-0000-0000-000000000003', auth.uid(), auth.uid(), e.slug, e.id, 'private'
from public.experts e where e.slug = 'elvin-cheung';
insert into public.messages (conversation_id, role, content)
values ('30000000-0000-0000-0000-000000000003', 'user', 'private message');
select is((select count(*) from public.conversations), 1::bigint, 'owner can read own conversation');

insert into public.knowledge_sources (id, expert_id, source_type, title, created_by)
select '40000000-0000-0000-0000-000000000004', e.id, 'manual', 'private source', auth.uid()
from public.experts e where e.slug = 'elvin-cheung';
select is((select count(*) from public.knowledge_sources), 1::bigint, 'expert can read own raw source');

set local role postgres;
insert into public.persona_synthesis_jobs (expert_id, source_revision_ids, status)
select id, array[]::uuid[], 'failed' from public.experts where slug = 'elvin-cheung';
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
select is((select count(*) from public.persona_synthesis_jobs), 1::bigint,
  'expert can read own persona synthesis and fidelity record');

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"20000000-0000-0000-0000-000000000002","role":"authenticated"}', true);

select is((select count(*) from public.conversations), 0::bigint, 'another member cannot read private conversation');
select is((select count(*) from public.messages), 0::bigint, 'another member cannot read private messages');
select is((select count(*) from public.knowledge_sources), 0::bigint, 'another member cannot read expert raw sources');
select is((select count(*) from public.persona_synthesis_jobs), 0::bigint,
  'member cannot read an instructor persona synthesis evidence');

update public.account_access set app_role = 'admin' where user_id = auth.uid();
select is(
  (select app_role from public.account_access where user_id = auth.uid()),
  'member',
  'member cannot update protected account access'
);

set local role postgres;
insert into public.expert_knowledge (expert_slug, title, content, status)
values ('elvin-cheung', 'legacy secret', 'must stay private', 'active');
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select isnt(
  has_table_privilege('anon', 'public.expert_knowledge', 'select'),
  true,
  'legacy active knowledge is not exposed to anonymous Data API clients'
);
select isnt(
  has_table_privilege('anon', 'public.profiles', 'select'),
  true,
  'member profiles are not exposed to anonymous Data API clients'
);
select ok(
  has_table_privilege('anon', 'public.items', 'select'),
  'published intelligence remains reachable through its public RLS policy'
);
select lives_ok(
  $$select count(*) from public.items where status = 'published'$$,
  'anonymous intelligence query does not evaluate protected expert policies'
);
select is(
  (select roles::text from pg_policies
   where schemaname = 'public' and tablename = 'items' and policyname = 'items_public_read'),
  '{anon,authenticated}',
  'public intelligence policy is explicitly scoped to browser reader roles'
);
select is(
  (select roles::text from pg_policies
   where schemaname = 'public' and tablename = 'items' and policyname = 'items_expert_read_own'),
  '{authenticated}',
  'expert intelligence policy cannot run for the anon database role'
);
select isnt(
  has_function_privilege(
    'anon',
    'public.create_knowledge_source(text,text,text,text,text,text,text[])',
    'execute'
  ),
  true,
  'anonymous callers cannot execute the CMS creation RPC'
);
select isnt(
  has_function_privilege('anon', 'public.cancel_booking(uuid)', 'execute'),
  true,
  'anonymous callers cannot execute member booking mutations'
);
select isnt(
  has_function_privilege('anon', 'public.queue_persona_synthesis(uuid)', 'execute'),
  true,
  'anonymous callers cannot execute persona synthesis mutations'
);
select isnt(
  has_function_privilege('anon', 'public.notify_booking_change()', 'execute'),
  true,
  'trigger-only booking notifier is not exposed as an RPC'
);
select isnt(
  has_function_privilege(
    'anon',
    'public.list_available_slots(text,date,date)',
    'execute'
  ),
  true,
  'booking availability requires an authenticated anonymous or member session'
);
select isnt(
  has_function_privilege('anon', 'public.is_admin()', 'execute'),
  true,
  'anonymous callers cannot execute the admin capability helper'
);
select isnt(
  has_function_privilege('anon', 'public.is_super_admin()', 'execute'),
  true,
  'anonymous callers cannot execute the super-admin capability helper'
);
select isnt(
  has_function_privilege('anon', 'public.owns_expert(uuid)', 'execute'),
  true,
  'anonymous callers cannot execute the expert ownership helper'
);
select ok(
  coalesce(
    (select proconfig @> array['search_path=pg_catalog, public']
     from pg_proc
     where oid = 'public.touch_updated_at()'::regprocedure),
    false
  ),
  'updated-at trigger has an immutable search path'
);

select * from finish();
rollback;
