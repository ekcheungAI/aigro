begin;
create extension if not exists pgtap with schema extensions;
select plan(19);

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

insert into public.leads (id, user_id, owner_id, expert_id, persona, score)
select
  '64000000-0000-0000-0000-000000000004',
  '63000000-0000-0000-0000-000000000003',
  '63000000-0000-0000-0000-000000000003',
  e.id, e.slug, 25
from public.experts e where e.slug = 'elvin-cheung';

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"62000000-0000-0000-0000-000000000002","role":"authenticated"}', true);

set local role postgres;
update public.leads
set next_follow_up_at = '2026-08-25 09:30:00+00'::timestamptz
where id = '64000000-0000-0000-0000-000000000004';
set local role authenticated;

select lives_ok(
  $$select public.update_lead_stage(
    '64000000-0000-0000-0000-000000000004', '跟進中'
  )$$,
  'admin can move a CRM lead through the audited workflow'
);
select is(
  (select next_follow_up_at from public.leads where id = '64000000-0000-0000-0000-000000000004'),
  '2026-08-25 09:30:00+00'::timestamptz,
  'stage-only CRM updates preserve an existing follow-up date'
);
select is(
  (select stage from public.leads where id = '64000000-0000-0000-0000-000000000004'),
  '跟進中',
  'CRM workflow persists the new lead stage'
);
select ok(
  exists (
    select 1 from public.audit_events
    where actor_id = '62000000-0000-0000-0000-000000000002'
      and entity_id = '64000000-0000-0000-0000-000000000004'
      and action = 'lead.stage_updated'
  ),
  'CRM stage change writes an audit event'
);

update public.account_access set tier = 'vip'
where user_id = '63000000-0000-0000-0000-000000000003';
select is(
  (select tier from public.account_access where user_id = '63000000-0000-0000-0000-000000000003'),
  'free',
  'ordinary admin cannot directly mutate protected member tiers'
);

select throws_ok(
  $$select public.upsert_admin_expert(
    null, 'rollback-expert', 'Rollback Expert', 'Rollback Expert', '',
    '測試導師', '只會存在 transaction 內', '#466A5E', array['測試'],
    '測試定位', '測試頭銜', false, '[]'::jsonb, array['審慎']
  )$$,
  '42501', 'super_admin_required_to_create_expert',
  'ordinary admin cannot create an orphan instructor draft'
);
select is(
  (select status from public.experts where slug = 'rollback-expert'),
  null::text,
  'rejected instructor creation leaves no draft behind'
);
select is(
  (select count(*) from public.audit_events
    where actor_id = '62000000-0000-0000-0000-000000000002'
      and action = 'expert.created'
      and metadata ->> 'slug' = 'rollback-expert'),
  0::bigint,
  'rejected instructor creation writes no false creation audit event'
);

update public.account_access set app_role = 'admin'
where user_id = '63000000-0000-0000-0000-000000000003';
select is(
  (select app_role from public.account_access
   where user_id = '63000000-0000-0000-0000-000000000003'),
  'member',
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

select lives_ok(
  $$select public.get_backend_readiness()$$,
  'super-admin can read the non-secret backend readiness report'
);
select ok(
  (public.get_backend_readiness() -> 'vault') ? 'project_url',
  'readiness reports Vault configuration presence without exposing values'
);

set local role postgres;
update public.experts
set feature_flags = feature_flags || '{"booking_enabled":true}'::jsonb
where slug = 'elvin-cheung';
insert into public.availability_rules (
  expert_id, weekday, start_time, end_time, timezone, slot_minutes
)
select id,
  extract(dow from (date_trunc('day', now() + interval '7 days') + interval '10 hours') at time zone 'UTC')::smallint,
  '09:00', '17:00', 'UTC', 45
from public.experts where slug = 'elvin-cheung';

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"61000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
select lives_ok(
  $$select public.create_booking(
    'elvin-cheung', date_trunc('day', now() + interval '7 days') + interval '10 hours'
  )$$,
  'free-tier super-admin inherits VIP booking entitlement'
);
select is(
  (select tier from public.account_access
   where user_id = '61000000-0000-0000-0000-000000000001'),
  'free',
  'full platform access does not rewrite billing tier'
);

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
