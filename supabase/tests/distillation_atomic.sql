begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

set local role postgres;
insert into public.experts (id, slug, display_name, status)
values ('a1000000-0000-0000-0000-000000000001', 'atomic-worker-test', 'Atomic Worker Test', 'draft');

insert into public.knowledge_sources (id, expert_id, source_type, title)
values
  ('a2000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', 'manual', 'Active source'),
  ('a3000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000001', 'manual', 'Revoked source');
insert into public.knowledge_revisions (id, source_id, revision_no, raw_text, status)
values
  ('a4000000-0000-0000-0000-000000000004', 'a2000000-0000-0000-0000-000000000002', 1, 'Active content', 'processing'),
  ('a5000000-0000-0000-0000-000000000005', 'a3000000-0000-0000-0000-000000000003', 1, 'Revoked content', 'processing');
insert into public.distillation_jobs (id, revision_id, status, attempts, locked_by, locked_at)
values
  ('a6000000-0000-0000-0000-000000000006', 'a4000000-0000-0000-0000-000000000004', 'processing', 1, 'worker-test', now()),
  ('a7000000-0000-0000-0000-000000000007', 'a5000000-0000-0000-0000-000000000005', 'processing', 1, 'worker-test', now());

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

update public.knowledge_sources
set archived_at = now()
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
  '23514', 'knowledge_source_archived',
  'archived consent fails closed at the final transaction boundary'
);
select is(
  (select count(*) from public.knowledge_chunks
   where revision_id = 'a5000000-0000-0000-0000-000000000005'),
  0::bigint,
  'failed archived completion retains no distilled chunk text'
);

select * from finish();
rollback;
