begin;
create extension if not exists pgtap with schema extensions;
select plan(18);

set local role postgres;
insert into public.experts (id, slug, display_name, status)
values ('f1000000-0000-0000-0000-000000000001', 'stage-rights-test', 'Stage Rights Test', 'draft');
insert into public.knowledge_sources (
  id, expert_id, source_type, title, rights_status, rights_scope, authorized_at
) values
  ('f2000000-0000-0000-0000-000000000002', 'f1000000-0000-0000-0000-000000000001', 'manual', 'Revoked between stages', 'granted',
   '{"commercial_rag":true,"distillation":true,"persona_synthesis":true,"model_training":false}'::jsonb, now()),
  ('f3000000-0000-0000-0000-000000000003', 'f1000000-0000-0000-0000-000000000001', 'manual', 'Expired between stages', 'granted',
   '{"commercial_rag":true,"distillation":true,"persona_synthesis":true,"model_training":false}'::jsonb, now()),
  ('f4000000-0000-0000-0000-000000000004', 'f1000000-0000-0000-0000-000000000001', 'manual', 'Scope changed between stages', 'granted',
   '{"commercial_rag":true,"distillation":true,"persona_synthesis":true,"model_training":false}'::jsonb, now());
insert into public.knowledge_revisions (id, source_id, revision_no, status) values
  ('f5000000-0000-0000-0000-000000000005', 'f2000000-0000-0000-0000-000000000002', 1, 'queued'),
  ('f6000000-0000-0000-0000-000000000006', 'f3000000-0000-0000-0000-000000000003', 1, 'queued'),
  ('f7000000-0000-0000-0000-000000000007', 'f4000000-0000-0000-0000-000000000004', 1, 'queued');
insert into public.distillation_jobs (
  id, revision_id, status, attempts, locked_by, locked_at
) values
  ('f8000000-0000-0000-0000-000000000008', 'f5000000-0000-0000-0000-000000000005', 'processing', 1, 'worker-revoke', now()),
  ('f9000000-0000-0000-0000-000000000009', 'f6000000-0000-0000-0000-000000000006', 'processing', 1, 'worker-expire', now()),
  ('fa000000-0000-0000-0000-000000000010', 'f7000000-0000-0000-0000-000000000007', 'processing', 1, 'worker-scope', now());

select ok(has_function_privilege(
  'service_role', 'public.advance_distillation_job_stage(uuid,text,text)', 'EXECUTE'
), 'service worker can execute the rights-safe stage transition');
select ok(not has_function_privilege(
  'authenticated', 'public.advance_distillation_job_stage(uuid,text,text)', 'EXECUTE'
), 'browser role cannot execute the rights-safe stage transition');

set local role service_role;
select is(public.start_distillation_job(
  'f8000000-0000-0000-0000-000000000008', 'worker-revoke'
), true, 'revocation fixture starts under a current grant');
select is(public.start_distillation_job(
  'f9000000-0000-0000-0000-000000000009', 'worker-expire'
), true, 'expiry fixture starts under a current grant');
select is(public.start_distillation_job(
  'fa000000-0000-0000-0000-000000000010', 'worker-scope'
), true, 'scope fixture starts under an exact boolean grant');

set local role postgres;
update public.knowledge_sources
set rights_status = 'revoked', revoked_at = now()
where id = 'f2000000-0000-0000-0000-000000000002';
set local role service_role;
select throws_ok(
  $$select public.advance_distillation_job_stage(
    'f8000000-0000-0000-0000-000000000008', 'worker-revoke', 'distill'
  )$$,
  '23514', 'knowledge_distillation_not_authorized',
  'revocation after extraction blocks the model-provider stage'
);
set local role postgres;
select is((select stage from public.distillation_jobs where id = 'f8000000-0000-0000-0000-000000000008'), 'extract', 'revoked stage remains at extract');
select is((select status from public.distillation_jobs where id = 'f8000000-0000-0000-0000-000000000008'), 'processing', 'denied revocation transition does not mutate the lease');

update public.knowledge_sources
set expires_at = now() - interval '1 minute'
where id = 'f3000000-0000-0000-0000-000000000003';
set local role service_role;
select throws_ok(
  $$select public.advance_distillation_job_stage(
    'f9000000-0000-0000-0000-000000000009', 'worker-expire', 'distill'
  )$$,
  '23514', 'knowledge_distillation_not_authorized',
  'expiry after extraction blocks the model-provider stage'
);
set local role postgres;
select is((select stage from public.distillation_jobs where id = 'f9000000-0000-0000-0000-000000000009'), 'extract', 'expired stage remains at extract');
select is((select status from public.distillation_jobs where id = 'f9000000-0000-0000-0000-000000000009'), 'processing', 'denied expiry transition does not mutate the lease');

update public.knowledge_sources
set rights_scope = rights_scope || '{"distillation":1}'::jsonb
where id = 'f4000000-0000-0000-0000-000000000004';
set local role service_role;
select throws_ok(
  $$select public.advance_distillation_job_stage(
    'fa000000-0000-0000-0000-000000000010', 'worker-scope', 'distill'
  )$$,
  '23514', 'knowledge_distillation_not_authorized',
  'a non-boolean distillation scope cannot authorize provider processing'
);
set local role postgres;
select is((select stage from public.distillation_jobs where id = 'fa000000-0000-0000-0000-000000000010'), 'extract', 'invalid-scope stage remains at extract');
select is((select status from public.distillation_jobs where id = 'fa000000-0000-0000-0000-000000000010'), 'processing', 'denied scope transition does not mutate the lease');

update public.knowledge_sources
set rights_scope = rights_scope || '{"distillation":true}'::jsonb
where id = 'f4000000-0000-0000-0000-000000000004';
set local role service_role;
select is(public.advance_distillation_job_stage(
  'fa000000-0000-0000-0000-000000000010', 'worker-scope', 'distill'
), true, 'restoring the exact grant allows the current lease to advance');
set local role postgres;
select is((select stage from public.distillation_jobs where id = 'fa000000-0000-0000-0000-000000000010'), 'distill', 'authorized current lease records distill');

update public.knowledge_sources
set expires_at = now() - interval '1 minute'
where id = 'f4000000-0000-0000-0000-000000000004';
set local role service_role;
select throws_ok(
  $$select public.advance_distillation_job_stage(
    'fa000000-0000-0000-0000-000000000010', 'worker-scope', 'embed'
  )$$,
  '23514', 'knowledge_distillation_not_authorized',
  'expiry before embedding blocks the next provider stage'
);
set local role postgres;
select is((select stage from public.distillation_jobs where id = 'fa000000-0000-0000-0000-000000000010'), 'distill', 'expired embedding transition preserves the last authorized stage');

select * from finish();
rollback;
