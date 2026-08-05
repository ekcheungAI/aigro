begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

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

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"20000000-0000-0000-0000-000000000002","role":"authenticated"}', true);

select is((select count(*) from public.conversations), 0::bigint, 'another member cannot read private conversation');
select is((select count(*) from public.messages), 0::bigint, 'another member cannot read private messages');
select is((select count(*) from public.knowledge_sources), 0::bigint, 'another member cannot read expert raw sources');

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
select is((select count(*) from public.expert_knowledge), 0::bigint, 'legacy active knowledge is no longer public');

select * from finish();
rollback;
