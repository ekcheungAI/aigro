begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

set local role postgres;

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('61000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'super-admin@test.local', '', now(), '{}', '{}', now(), now()),
  ('62000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'admin@test.local', '', now(), '{}', '{}', now(), now()),
  ('63000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'member-super-test@test.local', '', now(), '{}', '{}', now(), now())
on conflict (id) do nothing;

insert into public.profiles (id, email, name) values
  ('61000000-0000-0000-0000-000000000001', 'super-admin@test.local', 'Super Admin'),
  ('62000000-0000-0000-0000-000000000002', 'admin@test.local', 'Admin'),
  ('63000000-0000-0000-0000-000000000003', 'member-super-test@test.local', 'Member')
on conflict (id) do nothing;

update public.account_access set app_role = 'super_admin'
where user_id = '61000000-0000-0000-0000-000000000001';
update public.account_access set app_role = 'admin'
where user_id = '62000000-0000-0000-0000-000000000002';

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"62000000-0000-0000-0000-000000000002","role":"authenticated"}', true);

update public.account_access set tier = 'vip'
where user_id = '63000000-0000-0000-0000-000000000003';
select is(
  (select tier from public.account_access where user_id = '63000000-0000-0000-0000-000000000003'),
  'vip',
  'admin can manage a member tier'
);

select throws_like(
  $$update public.account_access set app_role = 'admin'
    where user_id = '63000000-0000-0000-0000-000000000003'$$,
  '%row-level security policy%',
  'admin cannot promote a member to admin'
);

update public.account_access set tier = 'pro'
where user_id = '61000000-0000-0000-0000-000000000001';
select is(
  (select tier from public.account_access where user_id = '61000000-0000-0000-0000-000000000001'),
  'free',
  'admin cannot modify a super-admin row'
);

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"61000000-0000-0000-0000-000000000001","role":"authenticated"}', true);

select ok(public.is_super_admin(), 'super-admin helper recognizes platform owner');
select ok(public.is_admin(), 'super-admin inherits admin access');

update public.account_access set app_role = 'admin'
where user_id = '63000000-0000-0000-0000-000000000003';
select is(
  (select app_role from public.account_access where user_id = '63000000-0000-0000-0000-000000000003'),
  'admin',
  'super-admin can promote another user to admin'
);

select ok(
  exists (
    select 1 from public.audit_events
    where actor_id = '61000000-0000-0000-0000-000000000001'
      and entity_id = '63000000-0000-0000-0000-000000000003'
      and action = 'account_access.updated'
  ),
  'access changes create an audit event'
);

select throws_ok(
  $$update public.account_access set app_role = 'admin'
    where user_id = '61000000-0000-0000-0000-000000000001'$$,
  'P0001',
  'cannot_demote_current_super_admin',
  'a super-admin cannot demote their own account'
);

select * from finish();
rollback;
