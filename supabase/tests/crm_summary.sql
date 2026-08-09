begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

set local role postgres;

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('91000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'crm-owner-a@test.local', '', now(), '{}', '{}', now(), now()),
  ('92000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'crm-owner-b@test.local', '', now(), '{}', '{}', now(), now()),
  ('93000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'crm-member@test.local', '', now(), '{}', '{}', now(), now()),
  ('94000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'crm-super-admin@test.local', '', now(), '{}', '{}', now(), now()),
  ('95000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'crm-lead-a@test.local', '', now(), '{}', '{}', now(), now()),
  ('96000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'crm-lead-b@test.local', '', now(), '{}', '{}', now(), now())
on conflict (id) do nothing;

insert into public.experts (
  id, slug, display_name, status, verified, public_profile_enabled
) values
  ('97000000-0000-0000-0000-000000000007', 'crm-summary-expert-a',
   'CRM Summary Expert A', 'active', true, true),
  ('98000000-0000-0000-0000-000000000008', 'crm-summary-expert-b',
   'CRM Summary Expert B', 'active', true, true);

update public.account_access
set app_role = 'expert', expert_id = '97000000-0000-0000-0000-000000000007'
where user_id = '91000000-0000-0000-0000-000000000001';
update public.account_access
set app_role = 'expert', expert_id = '98000000-0000-0000-0000-000000000008'
where user_id = '92000000-0000-0000-0000-000000000002';
update public.account_access
set app_role = 'super_admin'
where user_id = '94000000-0000-0000-0000-000000000004';

insert into public.conversations (
  id, owner_id, user_id, persona, expert_id, title
) values
  ('97100000-0000-0000-0000-000000000001',
   '95000000-0000-0000-0000-000000000005',
   '95000000-0000-0000-0000-000000000005',
   'crm-summary-expert-a', '97000000-0000-0000-0000-000000000007', 'A1'),
  ('97100000-0000-0000-0000-000000000002',
   '96000000-0000-0000-0000-000000000006',
   '96000000-0000-0000-0000-000000000006',
   'crm-summary-expert-a', '97000000-0000-0000-0000-000000000007', 'A2'),
  ('97100000-0000-0000-0000-000000000003',
   '93000000-0000-0000-0000-000000000003',
   '93000000-0000-0000-0000-000000000003',
   'crm-summary-expert-a', '97000000-0000-0000-0000-000000000007', 'A3'),
  ('98100000-0000-0000-0000-000000000001',
   '93000000-0000-0000-0000-000000000003',
   '93000000-0000-0000-0000-000000000003',
   'crm-summary-expert-b', '98000000-0000-0000-0000-000000000008', 'B1');

insert into public.leads (
  id, user_id, owner_id, expert_id, persona, score, stage
) values
  ('97200000-0000-0000-0000-000000000001',
   '95000000-0000-0000-0000-000000000005',
   '95000000-0000-0000-0000-000000000005',
   '97000000-0000-0000-0000-000000000007', 'crm-summary-expert-a', 85, '跟進中'),
  ('97200000-0000-0000-0000-000000000002',
   '96000000-0000-0000-0000-000000000006',
   '96000000-0000-0000-0000-000000000006',
   '97000000-0000-0000-0000-000000000007', 'crm-summary-expert-a', 35, '已轉化'),
  ('98200000-0000-0000-0000-000000000001',
   '93000000-0000-0000-0000-000000000003',
   '93000000-0000-0000-0000-000000000003',
   '98000000-0000-0000-0000-000000000008', 'crm-summary-expert-b', 90, '新線索');

select ok(
  has_function_privilege(
    'authenticated', 'public.get_expert_crm_summary(uuid)', 'EXECUTE'
  ),
  'authenticated users can invoke the ownership-checked CRM summary RPC'
);
select ok(
  not has_function_privilege(
    'anon', 'public.get_expert_crm_summary(uuid)', 'EXECUTE'
  ),
  'anonymous callers cannot invoke the CRM summary RPC'
);
select ok(
  not has_function_privilege(
    'anon', 'public.get_admin_crm_summary()', 'EXECUTE'
  ),
  'anonymous callers cannot invoke the global admin CRM summary RPC'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"91000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);
select results_eq(
  $$select conversation_count, lead_count, high_intent_count,
           following_up_count, converted_count
    from public.get_expert_crm_summary(
      '97000000-0000-0000-0000-000000000007'
    )$$,
  $$values (3::bigint, 2::bigint, 1::bigint, 1::bigint, 1::bigint)$$,
  'instructor owner receives exact totals for only their workspace'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"92000000-0000-0000-0000-000000000002","role":"authenticated"}',
  true
);
select throws_ok(
  $$select * from public.get_expert_crm_summary(
    '97000000-0000-0000-0000-000000000007'
  )$$,
  '42501', 'not_allowed',
  'another instructor cannot inspect this workspace summary'
);
select results_eq(
  $$select conversation_count, lead_count, high_intent_count,
           following_up_count, converted_count
    from public.get_expert_crm_summary(
      '98000000-0000-0000-0000-000000000008'
    )$$,
  $$values (1::bigint, 1::bigint, 1::bigint, 0::bigint, 0::bigint)$$,
  'second instructor receives only their own workspace totals'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"93000000-0000-0000-0000-000000000003","role":"authenticated"}',
  true
);
select throws_ok(
  $$select * from public.get_expert_crm_summary(
    '97000000-0000-0000-0000-000000000007'
  )$$,
  '42501', 'not_allowed',
  'ordinary member cannot inspect an instructor CRM summary'
);
select throws_ok(
  $$select * from public.get_admin_crm_summary()$$,
  '42501', 'admin_required',
  'ordinary member cannot inspect global CRM totals'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"94000000-0000-0000-0000-000000000004","role":"authenticated"}',
  true
);
select results_eq(
  $$select conversation_count, lead_count, high_intent_count,
           following_up_count, converted_count
    from public.get_expert_crm_summary(
      '97000000-0000-0000-0000-000000000007'
    )$$,
  $$values (3::bigint, 2::bigint, 1::bigint, 1::bigint, 1::bigint)$$,
  'super admin can inspect an instructor CRM summary without bypassing the RPC'
);
select results_eq(
  $$select lead_count, high_intent_count, week_new_count, new_count,
           contacted_count, following_up_count, converted_count
    from public.get_admin_crm_summary()$$,
  $$values (3::bigint, 2::bigint, 3::bigint, 1::bigint,
            0::bigint, 1::bigint, 1::bigint)$$,
  'super admin receives exact global stage and intent totals'
);

select * from finish();
rollback;
