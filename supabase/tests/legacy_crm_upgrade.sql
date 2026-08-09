begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

set local role postgres;

select has_column(
  'public', 'leads', 'legacy_questions_snapshot',
  'legacy CRM questions are retained in a reversible migration snapshot'
);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
) values (
  'b1000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'legacy-crm@test.local', '', now(),
  '{}', '{}', now(), now()
);

insert into public.experts (
  id, slug, display_name, status, verified, public_profile_enabled
) values (
  'b2000000-0000-0000-0000-000000000002',
  'legacy-crm-expert', 'Legacy CRM Expert', 'draft', false, false
);

insert into public.leads (
  id, user_id, owner_id, owner_is_anonymous, persona, expert_id,
  questions, legacy_questions_snapshot, legacy_questions_captured_at
) values (
  'b3000000-0000-0000-0000-000000000003',
  'b1000000-0000-0000-0000-000000000001',
  'b1000000-0000-0000-0000-000000000001', false,
  'legacy-crm-expert', 'b2000000-0000-0000-0000-000000000002',
  '["舊問題一","舊問題二"]'::jsonb,
  '["舊問題一","舊問題二"]'::jsonb, now()
);

select public.refresh_lead_questions(
  'b3000000-0000-0000-0000-000000000003'
);
select is(
  (select questions from public.leads
   where id = 'b3000000-0000-0000-0000-000000000003'),
  '["舊問題一","舊問題二"]'::jsonb,
  'refreshing a lead without durable interactions does not erase legacy CRM history'
);

insert into public.conversations (
  id, user_id, owner_id, anon_id, persona, expert_id, title
) values (
  'b4000000-0000-0000-0000-000000000004',
  'b1000000-0000-0000-0000-000000000001',
  'b1000000-0000-0000-0000-000000000001', null,
  'legacy-crm-expert', 'b2000000-0000-0000-0000-000000000002',
  'Legacy CRM deletion test'
);
delete from public.conversations
where id = 'b4000000-0000-0000-0000-000000000004';

select is(
  (select legacy_questions_snapshot from public.leads
   where id = 'b3000000-0000-0000-0000-000000000003'),
  '[]'::jsonb,
  'deleting a conversation clears unlinked legacy question snapshots conservatively'
);
select is(
  (select questions from public.leads
   where id = 'b3000000-0000-0000-0000-000000000003'),
  '[]'::jsonb,
  'the visible CRM summary is refreshed after legacy deletion cleanup'
);

select * from finish();
rollback;
