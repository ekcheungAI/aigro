begin;
create extension if not exists pgtap with schema extensions;
select plan(18);

set local role postgres;
insert into public.experts (id, slug, display_name, status)
values ('ae000000-0000-0000-0000-000000000001', 'lease-state-test', 'Lease State Test', 'draft');
insert into public.knowledge_sources (
  id, expert_id, source_type, title, rights_status, rights_scope, authorized_at
) values (
  'ae100000-0000-0000-0000-000000000001',
  'ae000000-0000-0000-0000-000000000001', 'manual', 'Lease source', 'granted',
  '{"commercial_rag":true,"distillation":true,"persona_synthesis":true,"model_training":false}'::jsonb,
  now()
);
insert into public.knowledge_revisions (id, source_id, revision_no, status) values
  ('ae200000-0000-0000-0000-000000000002', 'ae100000-0000-0000-0000-000000000001', 1, 'queued'),
  ('ae300000-0000-0000-0000-000000000003', 'ae100000-0000-0000-0000-000000000001', 2, 'processing');
insert into public.distillation_jobs (
  id, revision_id, status, attempts, locked_by, locked_at
) values
  ('ae400000-0000-0000-0000-000000000004', 'ae200000-0000-0000-0000-000000000002', 'processing', 1, 'worker-a', now()),
  ('ae500000-0000-0000-0000-000000000005', 'ae300000-0000-0000-0000-000000000003', 'processing', 3, 'worker-terminal', now() - interval '20 minutes');

select ok(has_function_privilege(
  'service_role', 'public.start_distillation_job(uuid,text)', 'EXECUTE'
), 'service worker can start a distillation lease');
select ok(not has_function_privilege(
  'authenticated', 'public.start_distillation_job(uuid,text)', 'EXECUTE'
), 'browser role cannot start a distillation lease');
select ok(has_function_privilege(
  'service_role', 'public.advance_distillation_job_stage(uuid,text,text)', 'EXECUTE'
), 'service worker can advance a distillation stage');
select ok(not has_function_privilege(
  'authenticated', 'public.advance_distillation_job_stage(uuid,text,text)', 'EXECUTE'
), 'browser role cannot advance a distillation stage');

set local role service_role;
select is(
  public.start_distillation_job(
    'ae400000-0000-0000-0000-000000000004', 'worker-a'
  ),
  true,
  'current worker atomically starts its claimed job and revision'
);
set local role postgres;
select is(
  (select status from public.knowledge_revisions where id = 'ae200000-0000-0000-0000-000000000002'),
  'processing',
  'atomic start moves the claimed revision to processing'
);
select is(
  (select stage from public.distillation_jobs where id = 'ae400000-0000-0000-0000-000000000004'),
  'extract',
  'atomic start records the extraction stage'
);

update public.distillation_jobs
set locked_by = 'worker-b'
where id = 'ae400000-0000-0000-0000-000000000004';
set local role service_role;
select is(
  public.advance_distillation_job_stage(
    'ae400000-0000-0000-0000-000000000004', 'worker-a', 'distill'
  ),
  false,
  'stale worker A cannot write after worker B takes the lease'
);
set local role postgres;
select is(
  (select stage from public.distillation_jobs where id = 'ae400000-0000-0000-0000-000000000004'),
  'extract',
  'stale stage acknowledgement leaves the new lease state unchanged'
);
set local role service_role;
select is(
  public.advance_distillation_job_stage(
    'ae400000-0000-0000-0000-000000000004', 'worker-b', 'distill'
  ),
  true,
  'current worker B can advance its exact lease'
);
set local role postgres;
select is(
  (select stage from public.distillation_jobs where id = 'ae400000-0000-0000-0000-000000000004'),
  'distill',
  'current lease records the requested stage'
);

update public.distillation_jobs
set locked_at = now() - interval '20 minutes'
where id = 'ae400000-0000-0000-0000-000000000004';
set local role service_role;
select lives_ok(
  $$select public.requeue_stuck_distillation_jobs()$$,
  'lease expiry atomically reconciles stuck jobs and revisions'
);
set local role postgres;
select is(
  (select status from public.distillation_jobs where id = 'ae400000-0000-0000-0000-000000000004'),
  'retry',
  'expired retryable job returns to retry'
);
select is(
  (select status from public.knowledge_revisions where id = 'ae200000-0000-0000-0000-000000000002'),
  'queued',
  'expired retryable revision returns to queued'
);
select ok(
  (select locked_by is null and locked_at is null from public.distillation_jobs where id = 'ae400000-0000-0000-0000-000000000004'),
  'expired retryable lease is cleared'
);
select is(
  (select status from public.distillation_jobs where id = 'ae500000-0000-0000-0000-000000000005'),
  'failed',
  'expired terminal job closes after its third attempt'
);
select is(
  (select status from public.knowledge_revisions where id = 'ae300000-0000-0000-0000-000000000003'),
  'failed',
  'expired terminal revision closes with its job'
);
select ok(
  (select locked_by is null and locked_at is null from public.distillation_jobs where id = 'ae500000-0000-0000-0000-000000000005'),
  'expired terminal lease is cleared'
);

select * from finish();
rollback;
