begin;
create extension if not exists pgtap with schema extensions;
select plan(20);

set local role postgres;
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('91000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'invite-admin@test.local', '', now(), '{}', '{}', now(), now()),
  ('92000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'invited-owner@test.local', '', now(), '{}', '{}', now(), now()),
  ('93000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'wrong-owner@test.local', '', now(), '{}', '{}', now(), now()),
  ('94000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'unconfirmed-owner@test.local', '', null, '{}', '{}', now(), now())
on conflict (id) do nothing;

update public.account_access set app_role = 'super_admin'
where user_id = '91000000-0000-0000-0000-000000000001';

insert into public.experts (id, slug, display_name, status)
values
  ('95000000-0000-0000-0000-000000000005', 'invitation-expert-a', 'Invitation Expert A', 'draft'),
  ('96000000-0000-0000-0000-000000000006', 'invitation-expert-b', 'Invitation Expert B', 'draft');

create temporary table invitation_test_ids (
  name text primary key,
  invitation_id uuid not null
) on commit drop;
grant select, insert, update on invitation_test_ids to authenticated;

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"91000000-0000-0000-0000-000000000001","role":"authenticated","email":"invite-admin@test.local"}', true);

select lives_ok(
  $$insert into invitation_test_ids values (
    'confirmed',
    public.create_expert_invitation(
      '95000000-0000-0000-0000-000000000005', ' Invited-Owner@Test.Local '
    )
  )$$,
  'super-admin creates an exact-email instructor invitation'
);
select is(
  (select email from public.expert_invitations where id =
    (select invitation_id from invitation_test_ids where name = 'confirmed')),
  'invited-owner@test.local',
  'invitation email is normalized'
);
select is(
  (select invited_by from public.expert_invitations where id =
    (select invitation_id from invitation_test_ids where name = 'confirmed')),
  '91000000-0000-0000-0000-000000000001'::uuid,
  'invitation records the super-admin actor'
);
insert into invitation_test_ids
select 'original', invitation_id from invitation_test_ids where name = 'confirmed';
select lives_ok(
  $$update invitation_test_ids
    set invitation_id = public.create_expert_invitation(
      '95000000-0000-0000-0000-000000000005', 'invited-owner@test.local'
    ) where name = 'confirmed'$$,
  'a deliberate resend supersedes the pending invitation atomically'
);
select is(
  (select status from public.expert_invitations where id =
    (select invitation_id from invitation_test_ids where name = 'original')),
  'cancelled',
  'the superseded invitation token is cancelled'
);
select ok(
  (select status = 'pending' and id <>
      (select invitation_id from invitation_test_ids where name = 'original')
   from public.expert_invitations where id =
      (select invitation_id from invitation_test_ids where name = 'confirmed')),
  'resend creates one new pending invitation token'
);

select set_config('request.jwt.claims',
  '{"sub":"93000000-0000-0000-0000-000000000003","role":"authenticated","email":"wrong-owner@test.local"}', true);
select is(
  (select count(*) from public.list_my_expert_invitations()),
  0::bigint,
  'another email cannot discover the invitation'
);
select throws_ok(
  $$select public.accept_expert_invitation(
    (select invitation_id from invitation_test_ids where name = 'confirmed')
  )$$,
  '42501', 'invitation_email_mismatch',
  'another email cannot accept the invitation'
);
select throws_ok(
  $$select public.create_expert_invitation(
    '96000000-0000-0000-0000-000000000006', 'wrong-owner@test.local'
  )$$,
  '42501', 'super_admin_required',
  'ordinary members cannot create instructor invitations'
);

select set_config('request.jwt.claims',
  '{"sub":"92000000-0000-0000-0000-000000000002","role":"authenticated","email":"invited-owner@test.local"}', true);
select is(
  (select count(*) from public.list_my_expert_invitations()),
  1::bigint,
  'the exact confirmed email can list its invitation'
);
select is(
  public.accept_expert_invitation(
    (select invitation_id from invitation_test_ids where name = 'confirmed')
  ),
  '95000000-0000-0000-0000-000000000005'::uuid,
  'the exact confirmed email accepts the invitation'
);
select is(
  (select expert_id from public.account_access
   where user_id = '92000000-0000-0000-0000-000000000002'),
  '95000000-0000-0000-0000-000000000005'::uuid,
  'acceptance grants immutable instructor ownership'
);
select is(
  (select owner_user_id from public.experts
   where id = '95000000-0000-0000-0000-000000000005'),
  '92000000-0000-0000-0000-000000000002'::uuid,
  'the protected owner mirror is synchronized'
);
set local role postgres;
select ok(
  (select status = 'accepted' and revoked_at is null
   from public.expert_invitations where id =
    (select invitation_id from invitation_test_ids where name = 'confirmed')),
  'invitation becomes accepted without a stale revocation timestamp'
);
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"92000000-0000-0000-0000-000000000002","role":"authenticated","email":"invited-owner@test.local"}', true);
select throws_ok(
  $$select public.accept_expert_invitation(
    (select invitation_id from invitation_test_ids where name = 'confirmed')
  )$$,
  '23514', 'invitation_not_pending',
  'an accepted invitation cannot be replayed'
);
select ok(
  exists (
    select 1 from public.audit_events
    where action = 'expert.invitation_accepted'
      and expert_id = '95000000-0000-0000-0000-000000000005'
      and actor_id = '92000000-0000-0000-0000-000000000002'
  ),
  'acceptance writes an instructor-scoped audit event'
);

set local role postgres;
delete from auth.users
where id = '92000000-0000-0000-0000-000000000002';
select ok(
  (select status = 'accepted' and accepted_at is not null
      and accepted_user_id is null
   from public.expert_invitations
   where id = (select invitation_id from invitation_test_ids where name = 'confirmed')),
  'account deletion preserves immutable invitation history without blocking retention'
);

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"91000000-0000-0000-0000-000000000001","role":"authenticated","email":"invite-admin@test.local"}', true);
insert into invitation_test_ids values (
  'unconfirmed',
  public.create_expert_invitation(
    '96000000-0000-0000-0000-000000000006', 'unconfirmed-owner@test.local'
  )
);

select set_config('request.jwt.claims',
  '{"sub":"94000000-0000-0000-0000-000000000004","role":"authenticated","email":"unconfirmed-owner@test.local"}', true);
select throws_ok(
  $$select public.accept_expert_invitation(
    (select invitation_id from invitation_test_ids where name = 'unconfirmed')
  )$$,
  '42501', 'verified_email_required',
  'an unconfirmed account cannot accept an instructor invitation'
);
select isnt(
  has_function_privilege('authenticated', 'public.cancel_expert_invitation(uuid,text)', 'EXECUTE'),
  true,
  'browser clients cannot execute the service-only invitation rollback'
);

set local role postgres;
update auth.users
set email_confirmed_at = now()
where id = '94000000-0000-0000-0000-000000000004';
update public.expert_invitations
set expires_at = now() - interval '1 minute'
where id = (select invitation_id from invitation_test_ids where name = 'unconfirmed');
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"94000000-0000-0000-0000-000000000004","role":"authenticated","email":"unconfirmed-owner@test.local"}', true);
select throws_ok(
  $$select public.accept_expert_invitation(
    (select invitation_id from invitation_test_ids where name = 'unconfirmed')
  )$$,
  '23514', 'invitation_expired',
  'expired invitations cannot be accepted'
);

select * from finish();
rollback;
