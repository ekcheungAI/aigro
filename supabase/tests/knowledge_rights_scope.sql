begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

set local role postgres;
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  'bd000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'rights-scope@test.local', '', now(),
  '{}'::jsonb, '{}'::jsonb, now(), now()
) on conflict (id) do nothing;
insert into public.experts (id, slug, display_name, status)
values ('bd100000-0000-0000-0000-000000000001', 'rights-scope-test', 'Rights Scope Test', 'draft');
insert into public.knowledge_sources (id, expert_id, source_type, title)
values ('bd200000-0000-0000-0000-000000000002', 'bd100000-0000-0000-0000-000000000001', 'manual', 'Rights scope source');
select is(
  (select rights_scope -> 'model_training' from public.knowledge_sources where id = 'bd200000-0000-0000-0000-000000000002'),
  'false'::jsonb,
  'direct inserts default to an exact model-training opt-out'
);
select throws_like(
  $$update public.knowledge_sources
    set rights_scope = '{"model_training":true}'::jsonb
    where id = 'bd200000-0000-0000-0000-000000000002'$$,
  '%knowledge_sources_model_training_opt_out%',
  'direct privileged writes cannot enable model training'
);

set local role service_role;
select throws_like(
  $$update public.knowledge_sources
    set rights_scope = '{"model_training":true}'::jsonb
    where id = 'bd200000-0000-0000-0000-000000000002'$$,
  '%knowledge_sources_model_training_opt_out%',
  'service writes cannot enable model training'
);
select throws_like(
  $$update public.knowledge_sources
    set rights_scope = '{"model_training":"false"}'::jsonb
    where id = 'bd200000-0000-0000-0000-000000000002'$$,
  '%knowledge_sources_model_training_opt_out%',
  'service writes cannot store string false as training consent'
);
select throws_like(
  $$update public.knowledge_sources
    set rights_scope = '{"model_training":null}'::jsonb
    where id = 'bd200000-0000-0000-0000-000000000002'$$,
  '%knowledge_sources_model_training_opt_out%',
  'service writes cannot store null training consent'
);
select throws_like(
  $$update public.knowledge_sources
    set rights_scope = '{"commercial_rag":true}'::jsonb
    where id = 'bd200000-0000-0000-0000-000000000002'$$,
  '%knowledge_sources_model_training_opt_out%',
  'service writes cannot omit the explicit training opt-out'
);
set local role postgres;
select is(
  (select rights_scope -> 'model_training' from public.knowledge_sources where id = 'bd200000-0000-0000-0000-000000000002'),
  'false'::jsonb,
  'failed direct writes preserve the normalized training opt-out'
);
update public.account_access set app_role = 'admin'
where user_id = 'bd000000-0000-0000-0000-000000000001';

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"bd000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

select throws_ok(
  $$select public.set_knowledge_source_rights(
    'bd200000-0000-0000-0000-000000000002', 'Rights Holder', 'contract:scope-true',
    '{"commercial_rag":true,"distillation":true,"persona_synthesis":true,"model_training":true}'::jsonb
  )$$,
  '22023', 'knowledge_rights_evidence_required',
  'boolean true model-training scope is rejected'
);
select throws_ok(
  $$select public.set_knowledge_source_rights(
    'bd200000-0000-0000-0000-000000000002', 'Rights Holder', 'contract:scope-number',
    '{"commercial_rag":true,"distillation":true,"persona_synthesis":true,"model_training":1}'::jsonb
  )$$,
  '22023', 'knowledge_rights_evidence_required',
  'numeric model-training scope is rejected'
);
select throws_ok(
  $$select public.set_knowledge_source_rights(
    'bd200000-0000-0000-0000-000000000002', 'Rights Holder', 'contract:scope-string',
    '{"commercial_rag":true,"distillation":true,"persona_synthesis":true,"model_training":"yes"}'::jsonb
  )$$,
  '22023', 'knowledge_rights_evidence_required',
  'string model-training scope is rejected'
);
select throws_ok(
  $$select public.set_knowledge_source_rights(
    'bd200000-0000-0000-0000-000000000002', 'Rights Holder', 'contract:scope-null',
    '{"commercial_rag":true,"distillation":true,"persona_synthesis":true,"model_training":null}'::jsonb
  )$$,
  '22023', 'knowledge_rights_evidence_required',
  'null model-training scope is rejected'
);
select throws_ok(
  $$select public.set_knowledge_source_rights(
    'bd200000-0000-0000-0000-000000000002', 'Rights Holder', 'contract:scope-false-string',
    '{"commercial_rag":true,"distillation":true,"persona_synthesis":true,"model_training":"false"}'::jsonb
  )$$,
  '22023', 'knowledge_rights_evidence_required',
  'string false is not accepted as boolean false'
);

select lives_ok(
  $$select public.set_knowledge_source_rights(
    'bd200000-0000-0000-0000-000000000002', 'Rights Holder', 'contract:scope-omitted',
    '{"commercial_rag":true,"distillation":true,"persona_synthesis":true}'::jsonb
  )$$,
  'omitted model-training scope is normalized safely'
);
set local role postgres;
select is(
  (select rights_scope -> 'model_training' from public.knowledge_sources where id = 'bd200000-0000-0000-0000-000000000002'),
  'false'::jsonb,
  'stored rights always contain boolean model_training false'
);
select is(
  (select metadata #> '{rights_scope,model_training}'
   from public.audit_events
   where entity_id = 'bd200000-0000-0000-0000-000000000002'
     and action = 'knowledge.rights_granted'
   order by created_at desc limit 1),
  'false'::jsonb,
  'rights audit always records boolean model_training false'
);

set local role authenticated;
select lives_ok(
  $$select public.set_knowledge_source_rights(
    'bd200000-0000-0000-0000-000000000002', 'Rights Holder', 'contract:scope-false',
    '{"commercial_rag":true,"distillation":true,"persona_synthesis":true,"model_training":false}'::jsonb
  )$$,
  'explicit boolean model_training false is accepted'
);

select * from finish();
rollback;
