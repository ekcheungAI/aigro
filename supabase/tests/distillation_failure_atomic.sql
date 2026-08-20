begin;
create extension if not exists pgtap with schema extensions;
select plan(21);

set local role postgres;
insert into public.experts (id, slug, display_name, status)
values ('b0000000-0000-0000-0000-000000000001', 'failure-rpc-test', 'Failure RPC Test', 'draft');
insert into public.knowledge_sources (id, expert_id, source_type, title)
values ('b1000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'manual', 'Failure source');
insert into public.knowledge_revisions (id, source_id, revision_no, status) values
  ('b2000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000001', 1, 'processing'),
  ('b3000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000001', 2, 'queued'),
  ('b4000000-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000001', 3, 'review'),
  ('b5000000-0000-0000-0000-000000000005', 'b1000000-0000-0000-0000-000000000001', 4, 'failed'),
  ('b6000000-0000-0000-0000-000000000006', 'b1000000-0000-0000-0000-000000000001', 5, 'processing');
insert into public.distillation_jobs (
  id, revision_id, status, attempts, locked_by, locked_at, error_message
) values
  ('c2000000-0000-0000-0000-000000000002', 'b2000000-0000-0000-0000-000000000002', 'processing', 1, 'worker-retry', now(), null),
  ('c3000000-0000-0000-0000-000000000003', 'b3000000-0000-0000-0000-000000000003', 'processing', 3, 'worker-terminal', now(), null),
  ('c4000000-0000-0000-0000-000000000004', 'b4000000-0000-0000-0000-000000000004', 'complete', 1, null, null, null),
  ('c5000000-0000-0000-0000-000000000005', 'b5000000-0000-0000-0000-000000000005', 'failed', 1, null, null, 'knowledge_rights_revoked'),
  ('c6000000-0000-0000-0000-000000000006', 'b6000000-0000-0000-0000-000000000006', 'processing', 1, 'other-worker', now(), null);

select ok(
  has_function_privilege(
    'service_role',
    'public.fail_distillation_job(uuid,text,text,boolean,timestamp with time zone)',
    'EXECUTE'
  ),
  'service worker can execute the atomic failure RPC'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.fail_distillation_job(uuid,text,text,boolean,timestamp with time zone)',
    'EXECUTE'
  ),
  'browser role cannot execute the failure RPC'
);

set local role service_role;
select is(
  public.fail_distillation_job(
    'c2000000-0000-0000-0000-000000000002', 'worker-retry', 'transient failure', true,
    now() + interval '2 minutes'
  ),
  true,
  'the current worker can atomically schedule a retry'
);
set local role postgres;
select is((select status from public.distillation_jobs where id = 'c2000000-0000-0000-0000-000000000002'), 'retry', 'retry changes the job state');
select ok((select locked_by is null and locked_at is null from public.distillation_jobs where id = 'c2000000-0000-0000-0000-000000000002'), 'retry releases the lease');
select is((select status from public.knowledge_revisions where id = 'b2000000-0000-0000-0000-000000000002'), 'queued', 'retry returns the revision to queued');
select is((select error_message from public.distillation_jobs where id = 'c2000000-0000-0000-0000-000000000002'), 'transient failure', 'retry records the bounded job error');
select is((select error_message from public.knowledge_revisions where id = 'b2000000-0000-0000-0000-000000000002'), 'transient failure', 'retry records the same revision error');

set local role service_role;
select is(
  public.fail_distillation_job(
    'c3000000-0000-0000-0000-000000000003', 'worker-terminal', 'attempts exhausted', false, null
  ),
  true,
  'the current worker can atomically record terminal failure'
);
set local role postgres;
select is((select status from public.distillation_jobs where id = 'c3000000-0000-0000-0000-000000000003'), 'failed', 'terminal failure closes the job');
select is((select status from public.knowledge_revisions where id = 'b3000000-0000-0000-0000-000000000003'), 'failed', 'terminal failure closes a still-queued revision');

set local role service_role;
select is(
  public.fail_distillation_job(
    'c4000000-0000-0000-0000-000000000004', 'worker-old', 'lost completion acknowledgement', true, now()
  ),
  false,
  'a completed job rejects a stale failure acknowledgement'
);
set local role postgres;
select is((select status from public.distillation_jobs where id = 'c4000000-0000-0000-0000-000000000004'), 'complete', 'ACK loss cannot regress a completed job');
select is((select status from public.knowledge_revisions where id = 'b4000000-0000-0000-0000-000000000004'), 'review', 'ACK loss cannot regress completed revision output');

set local role service_role;
select is(
  public.fail_distillation_job(
    'c5000000-0000-0000-0000-000000000005', 'worker-revoked', 'provider error after revoke', true, now()
  ),
  false,
  'a revoked job rejects the former worker failure acknowledgement'
);
set local role postgres;
select is((select error_message from public.distillation_jobs where id = 'c5000000-0000-0000-0000-000000000005'), 'knowledge_rights_revoked', 'concurrent revocation keeps the authoritative job error');
select is((select error_message from public.knowledge_revisions where id = 'b5000000-0000-0000-0000-000000000005'), null::text, 'concurrent revocation revision state is not overwritten');

set local role service_role;
select is(
  public.fail_distillation_job(
    'c6000000-0000-0000-0000-000000000006', 'stale-worker', 'wrong lease', false, null
  ),
  false,
  'a stale worker cannot finalize another active lease'
);
set local role postgres;
select is((select status from public.distillation_jobs where id = 'c6000000-0000-0000-0000-000000000006'), 'processing', 'wrong worker cannot change the active job');
select is((select locked_by from public.distillation_jobs where id = 'c6000000-0000-0000-0000-000000000006'), 'other-worker', 'wrong worker cannot clear the active lease');
select is((select status from public.knowledge_revisions where id = 'b6000000-0000-0000-0000-000000000006'), 'processing', 'wrong worker cannot change the active revision');

select * from finish();
rollback;
