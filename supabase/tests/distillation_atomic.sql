begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

set local role postgres;
insert into public.experts (id, slug, display_name, status)
values ('a1000000-0000-0000-0000-000000000001', 'atomic-worker-test', 'Atomic Worker Test', 'draft');

insert into public.knowledge_sources (
  id, expert_id, source_type, title, rights_status, rights_holder,
  rights_scope, rights_evidence_ref, authorized_at, expires_at
)
values
  ('a2000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', 'manual', 'Active source',
   'granted', 'Atomic test', '{"commercial_rag":true,"distillation":true,"persona_synthesis":true,"model_training":false}'::jsonb,
   'test:active', now(), null),
  ('a3000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000001', 'manual', 'Revoked source',
   'granted', 'Atomic test', '{"commercial_rag":true,"distillation":true,"persona_synthesis":true,"model_training":false}'::jsonb,
   'test:revoked', now(), null),
  ('a8000000-0000-0000-0000-000000000008', 'a1000000-0000-0000-0000-000000000001', 'manual', 'Expired source',
   'granted', 'Atomic test', '{"commercial_rag":true,"distillation":true,"persona_synthesis":true,"model_training":false}'::jsonb,
   'test:expired', now(), now() + interval '1 day'),
  ('ab000000-0000-0000-0000-000000000011', 'a1000000-0000-0000-0000-000000000001', 'manual', 'Concurrent duplicate source',
   'granted', 'Atomic test', '{"commercial_rag":true,"distillation":true,"persona_synthesis":true,"model_training":false}'::jsonb,
   'test:concurrent-duplicate', now(), null);
insert into public.knowledge_revisions (id, source_id, revision_no, raw_text, status)
values
  ('a4000000-0000-0000-0000-000000000004', 'a2000000-0000-0000-0000-000000000002', 1, 'Active content', 'processing'),
  ('a5000000-0000-0000-0000-000000000005', 'a3000000-0000-0000-0000-000000000003', 1, 'Revoked content', 'processing'),
  ('a9000000-0000-0000-0000-000000000009', 'a8000000-0000-0000-0000-000000000008', 1, 'Expired content', 'processing'),
  ('ac000000-0000-0000-0000-000000000012', 'ab000000-0000-0000-0000-000000000011', 1, 'Same content in flight', 'processing');
insert into public.distillation_jobs (id, revision_id, status, attempts, locked_by, locked_at)
values
  ('a6000000-0000-0000-0000-000000000006', 'a4000000-0000-0000-0000-000000000004', 'processing', 1, 'worker-test', now()),
  ('a7000000-0000-0000-0000-000000000007', 'a5000000-0000-0000-0000-000000000005', 'processing', 1, 'worker-test', now()),
  ('aa000000-0000-0000-0000-000000000010', 'a9000000-0000-0000-0000-000000000009', 'processing', 1, 'worker-test', now()),
  ('ad000000-0000-0000-0000-000000000013', 'ac000000-0000-0000-0000-000000000012', 'processing', 1, 'worker-concurrent', now());

select lives_ok(
  $$select public.complete_distillation_job(
    'a6000000-0000-0000-0000-000000000006', 'worker-test', 'Active extracted',
    '{"summary":"verified"}'::jsonb, 'atomic-hash-active',
    '{"extraction":"manual","embedding":"test"}'::jsonb,
    jsonb_build_array(jsonb_build_object(
      'chunk_index', 0,
      'content', 'Active extracted',
      'embedding', '[' || array_to_string(array_fill(0, array[1536]), ',') || ']',
      'citation_meta', jsonb_build_object('section', 'Test'),
      'token_count', 5
    ))
  )$$,
  'worker output commits through one atomic completion RPC'
);
select is(
  (select count(*) from public.knowledge_chunks
   where revision_id = 'a4000000-0000-0000-0000-000000000004'),
  1::bigint,
  'atomic completion stores the expected chunk'
);
select is(
  (select status from public.knowledge_revisions
   where id = 'a4000000-0000-0000-0000-000000000004'),
  'review',
  'atomic completion moves the revision to review'
);
select is(
  (select status from public.distillation_jobs
   where id = 'a6000000-0000-0000-0000-000000000006'),
  'complete',
  'atomic completion closes the exact worker lease'
);

select throws_ok(
  $$select public.complete_distillation_job(
    'ad000000-0000-0000-0000-000000000013', 'worker-concurrent', 'Active extracted',
    '{"summary":"duplicate"}'::jsonb, 'atomic-hash-active',
    '{"extraction":"manual","embedding":"test"}'::jsonb,
    jsonb_build_array(jsonb_build_object(
      'chunk_index', 0,
      'content', 'Active extracted',
      'embedding', '[' || array_to_string(array_fill(0, array[1536]), ',') || ']',
      'citation_meta', '{}'::jsonb,
      'token_count', 5
    ))
  )$$,
  '23505', 'knowledge_content_duplicate',
  'a second in-flight source cannot commit the same instructor content hash'
);
select is(
  (select status from public.knowledge_revisions where id = 'ac000000-0000-0000-0000-000000000012'),
  'processing',
  'duplicate rejection leaves the second revision under its worker lease'
);
select is(
  (select status from public.distillation_jobs where id = 'ad000000-0000-0000-0000-000000000013'),
  'processing',
  'duplicate rejection leaves the second job for atomic failure handling'
);
select is(
  (select count(*) from public.knowledge_chunks where revision_id = 'ac000000-0000-0000-0000-000000000012'),
  0::bigint,
  'duplicate completion persists no chunks'
);

update public.knowledge_sources
set rights_status = 'revoked', revoked_at = now()
where id = 'a3000000-0000-0000-0000-000000000003';
select throws_ok(
  $$select public.complete_distillation_job(
    'a7000000-0000-0000-0000-000000000007', 'worker-test', 'Must not persist',
    '{}'::jsonb, 'atomic-hash-revoked', '{}'::jsonb,
    jsonb_build_array(jsonb_build_object(
      'chunk_index', 0,
      'content', 'Must not persist',
      'embedding', '[' || array_to_string(array_fill(0, array[1536]), ',') || ']',
      'citation_meta', '{}'::jsonb,
      'token_count', 4
    ))
  )$$,
  '23514', 'knowledge_distillation_not_authorized',
  'revoked rights fail closed at the final transaction boundary'
);
select is(
  (select count(*) from public.knowledge_chunks
   where revision_id = 'a5000000-0000-0000-0000-000000000005'),
  0::bigint,
  'failed revoked completion retains no distilled chunk text'
);

update public.knowledge_sources
set expires_at = now() - interval '1 minute'
where id = 'a8000000-0000-0000-0000-000000000008';
select throws_ok(
  $$select public.complete_distillation_job(
    'aa000000-0000-0000-0000-000000000010', 'worker-test', 'Must not persist',
    '{}'::jsonb, 'atomic-hash-expired', '{}'::jsonb,
    jsonb_build_array(jsonb_build_object(
      'chunk_index', 0,
      'content', 'Must not persist',
      'embedding', '[' || array_to_string(array_fill(0, array[1536]), ',') || ']',
      'citation_meta', '{}'::jsonb,
      'token_count', 4
    ))
  )$$,
  '23514', 'knowledge_distillation_not_authorized',
  'expired rights fail closed at the final transaction boundary'
);
select is(
  (select count(*) from public.knowledge_chunks
   where revision_id = 'a9000000-0000-0000-0000-000000000009'),
  0::bigint,
  'failed expired completion retains no distilled chunk text'
);

select * from finish();
rollback;
