begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

set local role postgres;

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('71000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'invite-owner@test.local', '', now(), '{}', '{}', now(), now()),
  ('72000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'invite-admin@test.local', '', now(), '{}', '{}', now(), now()),
  ('73000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'invited-member@test.local', '', null, '{}', '{}', now(), now())
on conflict (id) do nothing;

insert into public.profiles (id, email, name) values
  ('71000000-0000-0000-0000-000000000001', 'invite-owner@test.local', 'Invite Owner'),
  ('72000000-0000-0000-0000-000000000002', 'invite-admin@test.local', 'Invite Admin')
on conflict (id) do nothing;

update public.account_access set app_role = 'super_admin'
where user_id = '71000000-0000-0000-0000-000000000001';
update public.account_access set app_role = 'admin'
where user_id = '72000000-0000-0000-0000-000000000002';

insert into public.invitations (
  email, name, invited_by, auth_user_id, member_class, tier,
  status, delivery_status, sent_at
) values (
  'invited-member@test.local', 'Invited Member',
  '71000000-0000-0000-0000-000000000001',
  '73000000-0000-0000-0000-000000000003',
  'founding', 'pro', 'sent', 'sent', now()
);

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"71000000-0000-0000-0000-000000000001","role":"authenticated"}', true);

select is((select count(*) from public.invitations), 1::bigint,
  'super-admin can read invitation records');

select throws_like(
  $$insert into public.invitations (email, name, invited_by)
    values ('blocked@test.local', 'Blocked', '71000000-0000-0000-0000-000000000001')$$,
  '%row-level security policy%',
  'browser clients cannot insert invitation records directly'
);

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"72000000-0000-0000-0000-000000000002","role":"authenticated"}', true);

select is((select count(*) from public.invitations), 0::bigint,
  'ordinary admins cannot read invitation records');

set local role postgres;
insert into public.profiles (
  id, email, name
) values (
  '73000000-0000-0000-0000-000000000003',
  'invited-member@test.local',
  'Invited Member'
);

select is(
  (select member_class from public.account_access
   where user_id = '73000000-0000-0000-0000-000000000003'),
  'founding',
  'accepting an invitation applies the invited membership class'
);

select is(
  (select tier from public.account_access
   where user_id = '73000000-0000-0000-0000-000000000003'),
  'pro',
  'accepting an invitation applies the invited billing tier'
);

select ok(
  exists (
    select 1 from public.invitations
    where auth_user_id = '73000000-0000-0000-0000-000000000003'
      and status = 'accepted'
      and accepted_at is not null
  ),
  'profile creation marks the invitation accepted'
);

select * from finish();
rollback;
