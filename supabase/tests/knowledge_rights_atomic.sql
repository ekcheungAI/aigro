begin;
create extension if not exists pgtap with schema extensions;
select plan(15);

set local role postgres;
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  'ab100000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'atomic-rights@test.local', '', now(),
  '{}'::jsonb, '{}'::jsonb, now(), now()
) on conflict (id) do nothing;

insert into public.experts (
  id, slug, display_name, status, feature_flags
) values (
  'ab200000-0000-0000-0000-000000000002',
  'atomic-rights-expert', 'Atomic Rights Expert', 'draft',
  '{"cms_ingestion_enabled":true}'::jsonb
);

update public.account_access
set app_role = 'admin'
where user_id = 'ab100000-0000-0000-0000-000000000001';

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"ab100000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

select lives_ok(
  $$select public.create_authorized_knowledge_source(
    p_expert_slug => 'atomic-rights-expert',
    p_source_type => 'manual',
    p_title => 'Atomic authorised source',
    p_rights_holder => 'Atomic Rights Expert',
    p_rights_evidence_ref => 'contract:atomic-rights-001',
    p_rights_scope => '{"commercial_rag":true,"distillation":true,"persona_synthesis":true,"model_training":false}'::jsonb,
    p_raw_text => 'This is a sufficiently long authorised source for atomic ingestion testing.'
  )$$,
  'owner/admin can create an authorised source atomically'
);

set local role postgres;
select is(
  (select rights_status from public.knowledge_sources where title = 'Atomic authorised source'),
  'granted',
  'atomic source is born with granted rights'
);
select ok(
  (select (rights_scope ->> 'distillation')::boolean from public.knowledge_sources where title = 'Atomic authorised source'),
  'atomic source records explicit distillation scope'
);
select is(
  (select count(*) from public.knowledge_revisions kr
   join public.knowledge_sources ks on ks.id = kr.source_id
   where ks.title = 'Atomic authorised source'),
  1::bigint,
  'atomic source creates exactly one revision'
);
select is(
  (select count(*) from public.distillation_jobs dj
   join public.knowledge_revisions kr on kr.id = dj.revision_id
   join public.knowledge_sources ks on ks.id = kr.source_id
   where ks.title = 'Atomic authorised source' and dj.status = 'pending'),
  1::bigint,
  'atomic source enqueues exactly one pending job'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.create_knowledge_source(text,text,text,text,text,text,text[])',
    'EXECUTE'
  ),
  'browser role cannot use the legacy rights-less enqueue RPC'
);
select ok(
  has_function_privilege(
    'authenticated',
    'public.create_authorized_knowledge_source(text,text,text,text,text,jsonb,text,text,text,text[],timestamp with time zone)',
    'EXECUTE'
  ),
  'browser role can execute only the atomic authorised RPC'
);

set local role authenticated;
select throws_ok(
  $$select public.create_authorized_knowledge_source(
    p_expert_slug => 'atomic-rights-expert',
    p_source_type => 'manual',
    p_title => 'Invalid atomic source',
    p_rights_holder => 'Atomic Rights Expert',
    p_rights_evidence_ref => 'contract:atomic-rights-invalid',
    p_rights_scope => '{"commercial_rag":true,"distillation":false,"persona_synthesis":true,"model_training":false}'::jsonb,
    p_raw_text => 'This source must never persist because its distillation grant is false.'
  )$$,
  '22023', 'knowledge_rights_evidence_required',
  'missing distillation permission rejects the whole transaction'
);

set local role postgres;
select is(
  (select count(*) from public.knowledge_sources where title = 'Invalid atomic source'),
  0::bigint,
  'a rejected grant leaves no orphan source'
);

set local role authenticated;
select throws_ok(
  $$select public.create_authorized_knowledge_source(
    p_expert_slug => 'atomic-rights-expert',
    p_source_type => 'manual',
    p_title => 'Forbidden model training source',
    p_rights_holder => 'Atomic Rights Expert',
    p_rights_evidence_ref => 'contract:atomic-rights-training',
    p_rights_scope => '{"commercial_rag":true,"distillation":true,"persona_synthesis":true,"model_training":true}'::jsonb,
    p_raw_text => 'This source must never persist because model training was requested.'
  )$$,
  '22023', 'knowledge_rights_evidence_required',
  'the controlled workflow rejects foundation-model training scope'
);

set local role postgres;
select is(
  (select count(*) from public.knowledge_sources where title = 'Forbidden model training source'),
  0::bigint,
  'forbidden training scope leaves no orphan source'
);

insert into public.knowledge_revisions (
  id, source_id, revision_no, raw_text, status
) values (
  'ab300000-0000-0000-0000-000000000003',
  (select id from public.knowledge_sources where title = 'Atomic authorised source'),
  2,
  'A retry-state revision used to verify rights revocation cancellation.',
  'queued'
);
insert into public.distillation_jobs (
  id, revision_id, status, attempts, next_retry_at
) values (
  'ab400000-0000-0000-0000-000000000004',
  'ab300000-0000-0000-0000-000000000003',
  'retry',
  1,
  now() + interval '5 minutes'
);

set local role authenticated;
select lives_ok(
  $$select public.revoke_knowledge_source_rights(
    (select id from public.knowledge_sources where title = 'Atomic authorised source'),
    'Atomic revocation test'
  )$$,
  'owner/admin can atomically revoke the source and queued work'
);

set local role postgres;
select is(
  (select rights_status from public.knowledge_sources where title = 'Atomic authorised source'),
  'revoked',
  'revocation records a terminal rights state'
);
select is(
  (select count(*) from public.distillation_jobs dj
   join public.knowledge_revisions kr on kr.id = dj.revision_id
   join public.knowledge_sources ks on ks.id = kr.source_id
   where ks.title = 'Atomic authorised source' and dj.status = 'failed'),
  2::bigint,
  'revocation cancels pending and retry distillation work'
);
select is(
  (select count(*) from public.knowledge_revisions kr
   join public.knowledge_sources ks on ks.id = kr.source_id
   where ks.title = 'Atomic authorised source' and kr.status = 'failed'),
  2::bigint,
  'revocation marks pending and retry revisions terminal'
);

select * from finish();
rollback;
