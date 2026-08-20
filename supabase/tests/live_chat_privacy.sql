begin;
create extension if not exists pgtap with schema extensions;
select plan(19);

set local role postgres;
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('ac100000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'consent-owner@test.local', '', now(), '{}', '{}', now(), now()),
  ('ac100000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'other-owner@test.local', '', now(), '{}', '{}', now(), now());

insert into public.experts (
  id, slug, display_name, status, feature_flags
) values (
  'ac200000-0000-0000-0000-000000000001',
  'consent-test-expert', 'Consent Test Expert', 'active', '{}'::jsonb
);

insert into public.conversations (
  id, owner_id, persona, expert_id, title
) values
  ('ac300000-0000-0000-0000-000000000001',
   'ac100000-0000-0000-0000-000000000001',
   'consent-test-expert', 'ac200000-0000-0000-0000-000000000001', 'Older conversation'),
  ('ac300000-0000-0000-0000-000000000002',
   'ac100000-0000-0000-0000-000000000001',
   'consent-test-expert', 'ac200000-0000-0000-0000-000000000001', 'Current conversation'),
  ('ac300000-0000-0000-0000-000000000003',
   'ac100000-0000-0000-0000-000000000002',
   'consent-test-expert', 'ac200000-0000-0000-0000-000000000001', 'Another owner');

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"ac100000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

select lives_ok(
  $$select public.consent_lead_contact(
    'ac300000-0000-0000-0000-000000000001', ' Owner@Example.COM '
  )$$,
  'consent can create the owner/expert lead before the first chat round persists'
);

set local role postgres;
select is(
  (select count(*) from public.leads
   where owner_id = 'ac100000-0000-0000-0000-000000000001'
     and expert_id = 'ac200000-0000-0000-0000-000000000001'),
  1::bigint,
  'pre-persistence consent creates exactly one lead'
);
select is(
  (select contact_email from public.leads
   where owner_id = 'ac100000-0000-0000-0000-000000000001'
     and expert_id = 'ac200000-0000-0000-0000-000000000001'),
  'owner@example.com',
  'consent stores a normalized contact email'
);
select ok(
  (select contact_consented_at is not null from public.leads
   where owner_id = 'ac100000-0000-0000-0000-000000000001'
     and expert_id = 'ac200000-0000-0000-0000-000000000001'),
  'consent stores its timestamp'
);
select is(
  (select source_conversation_id from public.leads
   where owner_id = 'ac100000-0000-0000-0000-000000000001'
     and expert_id = 'ac200000-0000-0000-0000-000000000001'),
  'ac300000-0000-0000-0000-000000000001'::uuid,
  'the newly created lead keeps the consenting conversation provenance'
);

set local role authenticated;
select lives_ok(
  $$select public.consent_lead_contact(
    'ac300000-0000-0000-0000-000000000001', 'owner@example.com'
  )$$,
  'repeating identical consent is idempotent'
);

set local role postgres;
select is(
  (select count(*) from public.audit_events
   where actor_id = 'ac100000-0000-0000-0000-000000000001'
     and action = 'lead.contact_consented'),
  1::bigint,
  'repeating identical consent does not duplicate its audit event'
);

set local role authenticated;
select lives_ok(
  $$select public.consent_lead_contact(
    'ac300000-0000-0000-0000-000000000002', 'new-owner@example.com'
  )$$,
  'a current conversation updates consent even when the lead points at an older conversation'
);

set local role postgres;
select is(
  (select count(*) from public.leads
   where owner_id = 'ac100000-0000-0000-0000-000000000001'
     and expert_id = 'ac200000-0000-0000-0000-000000000001'),
  1::bigint,
  'a later conversation does not create a duplicate owner/expert lead'
);
select is(
  (select contact_email from public.leads
   where owner_id = 'ac100000-0000-0000-0000-000000000001'
     and expert_id = 'ac200000-0000-0000-0000-000000000001'),
  'new-owner@example.com',
  'the later conversation updates the stored contact email'
);
select is(
  (select source_conversation_id from public.leads
   where owner_id = 'ac100000-0000-0000-0000-000000000001'
     and expert_id = 'ac200000-0000-0000-0000-000000000001'),
  'ac300000-0000-0000-0000-000000000001'::uuid,
  'contact-only updates do not rewrite CRM conversation provenance'
);
select is(
  (select count(*) from public.audit_events
   where actor_id = 'ac100000-0000-0000-0000-000000000001'
     and action = 'lead.contact_consented'),
  2::bigint,
  'changing the contact email records one additional audit event'
);

set local role authenticated;
select lives_ok(
  $$select public.withdraw_lead_contact_consent(
    'ac300000-0000-0000-0000-000000000002'
  )$$,
  'consent can be withdrawn from another owned conversation with the same expert'
);

set local role postgres;
select ok(
  (select contact_consented_at is null and contact_email is null
   from public.leads
   where owner_id = 'ac100000-0000-0000-0000-000000000001'
     and expert_id = 'ac200000-0000-0000-0000-000000000001'),
  'withdrawal clears both consent fields'
);
select is(
  (select count(*) from public.audit_events
   where actor_id = 'ac100000-0000-0000-0000-000000000001'
     and action = 'lead.contact_consent_withdrawn'),
  1::bigint,
  'withdrawal records one audit event'
);

set local role authenticated;
select lives_ok(
  $$select public.withdraw_lead_contact_consent(
    'ac300000-0000-0000-0000-000000000002'
  )$$,
  'repeating withdrawal is idempotent'
);

set local role postgres;
select is(
  (select count(*) from public.audit_events
   where actor_id = 'ac100000-0000-0000-0000-000000000001'
     and action = 'lead.contact_consent_withdrawn'),
  1::bigint,
  'repeating withdrawal does not duplicate its audit event'
);

set local role authenticated;
select throws_ok(
  $$select public.consent_lead_contact(
    'ac300000-0000-0000-0000-000000000003', 'owner@example.com'
  )$$,
  'P0002', 'conversation_not_found',
  'one owner cannot consent through another owner conversation'
);
select throws_ok(
  $$select public.withdraw_lead_contact_consent(
    'ac300000-0000-0000-0000-000000000003'
  )$$,
  'P0002', 'conversation_not_found',
  'one owner cannot withdraw through another owner conversation'
);

select * from finish();
rollback;
