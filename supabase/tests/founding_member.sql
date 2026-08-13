begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

set local role postgres;

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  '64000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'new-founding@test.local', '', now(),
  '{}', '{}', now(), now()
);

insert into public.profiles (id, email, name) values (
  '64000000-0000-0000-0000-000000000004',
  'new-founding@test.local',
  'New Founding Member'
);

select is(
  (select member_class from public.account_access
   where user_id = '64000000-0000-0000-0000-000000000004'),
  'founding',
  'new account access defaults to founding member class'
);

select is(
  (select tier from public.account_access
   where user_id = '64000000-0000-0000-0000-000000000004'),
  'free',
  'founding class does not alter billing tier'
);

select is(
  (select role from public.profiles
   where id = '64000000-0000-0000-0000-000000000004'),
  'founding',
  'legacy profile mirror displays founding member'
);

select throws_ok(
  $$update public.account_access set member_class = 'invalid'
    where user_id = '64000000-0000-0000-0000-000000000004'$$,
  '23514',
  null,
  'member class only accepts free or founding'
);

select * from finish();
rollback;
