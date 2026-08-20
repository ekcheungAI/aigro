begin;
create extension if not exists pgtap with schema extensions;
select plan(32);

set local role postgres;
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  'de000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'persona-atomic@test.local', '', now(),
  '{}'::jsonb, '{}'::jsonb, now(), now()
) on conflict (id) do nothing;
insert into public.experts (id, slug, display_name, status)
values ('de100000-0000-0000-0000-000000000001', 'persona-atomic-test', 'Persona Atomic Test', 'draft');
insert into public.knowledge_sources (
  id, expert_id, source_type, title, rights_status, rights_holder,
  rights_scope, rights_evidence_ref, authorized_at
) values
  ('de200000-0000-0000-0000-000000000002', 'de100000-0000-0000-0000-000000000001', 'manual', 'Persona source one',
   'granted', 'Persona Atomic Test', '{"commercial_rag":true,"distillation":true,"persona_synthesis":true,"model_training":false}'::jsonb, 'test:persona-one', now()),
  ('de300000-0000-0000-0000-000000000003', 'de100000-0000-0000-0000-000000000001', 'manual', 'Persona source two',
   'granted', 'Persona Atomic Test', '{"commercial_rag":true,"distillation":true,"persona_synthesis":true,"model_training":false}'::jsonb, 'test:persona-two', now());
insert into public.knowledge_revisions (
  id, source_id, revision_no, status, approved_by, approved_at, distilled_json
) values
  ('de400000-0000-0000-0000-000000000004', 'de200000-0000-0000-0000-000000000002', 1, 'approved', 'de000000-0000-0000-0000-000000000001', now(), '{"summary":"one"}'::jsonb),
  ('de500000-0000-0000-0000-000000000005', 'de300000-0000-0000-0000-000000000003', 1, 'approved', 'de000000-0000-0000-0000-000000000001', now(), '{"summary":"two"}'::jsonb);
update public.knowledge_sources set published_revision_id = 'de400000-0000-0000-0000-000000000004'
where id = 'de200000-0000-0000-0000-000000000002';
update public.knowledge_sources set published_revision_id = 'de500000-0000-0000-0000-000000000005'
where id = 'de300000-0000-0000-0000-000000000003';
insert into public.knowledge_chunks (revision_id, expert_id, chunk_index, content, embedding) values
  ('de400000-0000-0000-0000-000000000004', 'de100000-0000-0000-0000-000000000001', 0, 'Persona evidence one', ('[' || array_to_string(array_fill(0, array[1536]), ',') || ']')::extensions.halfvec),
  ('de500000-0000-0000-0000-000000000005', 'de100000-0000-0000-0000-000000000001', 0, 'Persona evidence two', ('[' || array_to_string(array_fill(0, array[1536]), ',') || ']')::extensions.halfvec);
insert into public.persona_evaluation_questions (
  expert_id, category, question, expected, source_revision_ids
)
select
  'de100000-0000-0000-0000-000000000001',
  (array['known_stance', 'edge_honesty', 'voice', 'source_transparency'])[(g - 1) % 4 + 1],
  'Persona atomic question ' || g,
  jsonb_build_object('criteria', 'Use pinned persona evidence ' || g),
  array[case when g % 2 = 0
    then 'de400000-0000-0000-0000-000000000004'::uuid
    else 'de500000-0000-0000-0000-000000000005'::uuid end]
from generate_series(1, 25) g;
insert into public.persona_synthesis_jobs (
  id, expert_id, source_revision_ids, status, attempts, locked_by, locked_at
) values (
  'df100000-0000-0000-0000-000000000001', 'de100000-0000-0000-0000-000000000001',
  array['de400000-0000-0000-0000-000000000004'::uuid, 'de500000-0000-0000-0000-000000000005'::uuid],
  'processing', 1, 'persona-worker-current', now()
);

select is(
  length(public.get_persona_evaluation_set_snapshot('de100000-0000-0000-0000-000000000001')->>'hash'),
  64,
  'evaluation snapshot exposes a SHA-256 hash'
);

set local role service_role;
select is(
  public.complete_persona_synthesis_job(
    'df100000-0000-0000-0000-000000000001', 'persona-worker-current',
    'generator-test', 'evaluator-test',
    (select jsonb_agg(jsonb_build_object('question_id', question->>'id', 'answer', 'Grounded answer'))
     from jsonb_array_elements(public.get_persona_evaluation_set_snapshot('de100000-0000-0000-0000-000000000001')->'questions') question),
    86, 'passed',
    public.get_persona_evaluation_set_snapshot('de100000-0000-0000-0000-000000000001')->>'hash',
    '{"mental_models":[{"name":"Grounded model"}],"expression_dna":{"tone":["clear"]},"honest_boundaries":[{"boundary":"No fabrication"}]}'::jsonb,
    '{"source_count":2,"evidence_count":2}'::jsonb,
    '{"breakdown":{"stance_consistency":25,"style_distinctiveness":17,"edge_honesty":18,"source_transparency":13,"structural_completeness":13}}'::jsonb,
    86, 'passed', 'generator-test'
  ),
  true,
  'current lease completes evaluation run and persona job atomically'
);
set local role postgres;
select is((select count(*) from public.persona_evaluation_runs where synthesis_job_id = 'df100000-0000-0000-0000-000000000001'), 1::bigint, 'completion inserts exactly one evaluation run');
select is((select evaluation_set_hash from public.persona_evaluation_runs where synthesis_job_id = 'df100000-0000-0000-0000-000000000001'), public.get_persona_evaluation_set_snapshot('de100000-0000-0000-0000-000000000001')->>'hash', 'completion pins the evaluated set hash');
select is((select status from public.persona_synthesis_jobs where id = 'df100000-0000-0000-0000-000000000001'), 'review', 'completion moves the exact job to review');
select ok((select locked_by is null and locked_at is null from public.persona_synthesis_jobs where id = 'df100000-0000-0000-0000-000000000001'), 'completion releases the exact lease');
select is(
  (select finalized_evaluation_run_id from public.persona_synthesis_jobs where id = 'df100000-0000-0000-0000-000000000001'),
  (select id from public.persona_evaluation_runs where synthesis_job_id = 'df100000-0000-0000-0000-000000000001'),
  'completion binds the job to one authoritative evaluation run'
);
select is(
  (select output_blueprint_hash from public.persona_evaluation_runs where synthesis_job_id = 'df100000-0000-0000-0000-000000000001'),
  encode(extensions.digest(convert_to((select output_blueprint::text from public.persona_synthesis_jobs where id = 'df100000-0000-0000-0000-000000000001'), 'UTF8'), 'sha256'), 'hex'),
  'authoritative evaluation is bound to the finalized blueprint bytes'
);

set local role service_role;
select is(
  public.complete_persona_synthesis_job(
    'df100000-0000-0000-0000-000000000001', 'persona-worker-current',
    'generator-test', 'evaluator-test', '[]'::jsonb, 86, 'passed',
    public.get_persona_evaluation_set_snapshot('de100000-0000-0000-0000-000000000001')->>'hash',
    '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, 86, 'passed', 'generator-test'
  ),
  false,
  'completion ACK loss cannot replay after the lease closed'
);
set local role postgres;
select is((select count(*) from public.persona_evaluation_runs where synthesis_job_id = 'df100000-0000-0000-0000-000000000001'), 1::bigint, 'stale completion cannot duplicate the evaluation run');
select is((select status from public.persona_synthesis_jobs where id = 'df100000-0000-0000-0000-000000000001'), 'review', 'stale completion cannot regress reviewed output');

insert into public.expert_persona_versions (
  id, expert_id, version, greeting, persona_blueprint,
  status, published_at, source_revision_ids
) values (
  'df200000-0000-0000-0000-000000000002', 'de100000-0000-0000-0000-000000000001',
  1, 'Atomic persona',
  '{"mental_models":[{"name":"Grounded model"}],"expression_dna":{"tone":["clear"]},"honest_boundaries":[{"boundary":"No fabrication"}]}'::jsonb,
  'published', now(),
  array['de400000-0000-0000-0000-000000000004'::uuid, 'de500000-0000-0000-0000-000000000005'::uuid]
);
select throws_ok(
  $$update public.persona_synthesis_jobs
    set status = 'published', reviewed_by = 'de000000-0000-0000-0000-000000000001',
        reviewed_at = now(), persona_version_id = 'df200000-0000-0000-0000-000000000002'
    where id = 'df100000-0000-0000-0000-000000000001'$$,
  'P0001', 'persona_publication_requires_human_review',
  'persona publication rejects a status change without substantive review notes'
);
update public.persona_synthesis_jobs
set status = 'published', reviewed_by = 'de000000-0000-0000-0000-000000000001',
    reviewed_at = now(), review_notes = 'Approved by the persona atomicity test reviewer',
    persona_version_id = 'df200000-0000-0000-0000-000000000002'
where id = 'df100000-0000-0000-0000-000000000001';
select has_trigger(
  'public', 'persona_synthesis_jobs', 'persona_publication_requires_review',
  'persona publication review trigger is attached'
);
select throws_ok(
  $$update public.persona_synthesis_jobs
    set review_notes = null
    where id = 'df100000-0000-0000-0000-000000000001'$$,
  'P0001', 'persona_publication_requires_human_review',
  'published persona review evidence cannot be cleared later'
);
select ok(
  public.has_current_passed_persona_evaluation(
    'de100000-0000-0000-0000-000000000001', 'df200000-0000-0000-0000-000000000002'
  ),
  'a freshly hashed passed evaluation is current'
);

insert into public.persona_evaluation_runs (
  synthesis_job_id, generator_model, evaluator_model, probe_responses,
  score, status, report, evaluation_set_hash, output_blueprint_hash
)
select
  synthesis_job_id, generator_model, evaluator_model, probe_responses,
  score, 'passed', report, evaluation_set_hash, output_blueprint_hash
from public.persona_evaluation_runs
where id = (
  select finalized_evaluation_run_id
  from public.persona_synthesis_jobs
  where id = 'df100000-0000-0000-0000-000000000001'
);
select isnt(
  public.has_current_passed_persona_evaluation(
    'de100000-0000-0000-0000-000000000001', 'df200000-0000-0000-0000-000000000002'
  ),
  true,
  'legacy duplicate evaluation history fails the release gate closed'
);
delete from public.persona_evaluation_runs
where synthesis_job_id = 'df100000-0000-0000-0000-000000000001'
  and id <> (
    select finalized_evaluation_run_id
    from public.persona_synthesis_jobs
    where id = 'df100000-0000-0000-0000-000000000001'
  );
select ok(
  public.has_current_passed_persona_evaluation(
    'de100000-0000-0000-0000-000000000001', 'df200000-0000-0000-0000-000000000002'
  ),
  'removing ambiguous legacy history restores the authoritative run gate'
);

insert into public.persona_synthesis_jobs (
  id, expert_id, source_revision_ids, status, attempts, locked_by, locked_at
) values (
  'df300000-0000-0000-0000-000000000003', 'de100000-0000-0000-0000-000000000001',
  array['de400000-0000-0000-0000-000000000004'::uuid, 'de500000-0000-0000-0000-000000000005'::uuid],
  'processing', 1, 'persona-worker-rights', now()
);
update public.knowledge_sources set rights_status = 'revoked', revoked_at = now()
where id = 'de300000-0000-0000-0000-000000000003';
set local role service_role;
select throws_ok(
  $$select public.complete_persona_synthesis_job(
    'df300000-0000-0000-0000-000000000003', 'persona-worker-rights',
    'generator-test', 'evaluator-test', '[]'::jsonb, 86, 'passed',
    public.get_persona_evaluation_set_snapshot('de100000-0000-0000-0000-000000000001')->>'hash',
    '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, 86, 'passed', 'generator-test'
  )$$,
  '23514', 'persona_source_snapshot_not_authorized',
  'completion fails closed after source rights are revoked'
);
set local role postgres;
select is((select count(*) from public.persona_evaluation_runs where synthesis_job_id = 'df300000-0000-0000-0000-000000000003'), 0::bigint, 'rights failure leaves no evaluation run');
select is((select status from public.persona_synthesis_jobs where id = 'df300000-0000-0000-0000-000000000003'), 'processing', 'rights failure leaves the lease for atomic failure handling');
update public.knowledge_sources
set rights_status = 'granted', revoked_at = null,
    published_revision_id = 'de500000-0000-0000-0000-000000000005'
where id = 'de300000-0000-0000-0000-000000000003';
update public.persona_synthesis_jobs set status = 'failed', locked_by = null, locked_at = null
where id = 'df300000-0000-0000-0000-000000000003';

select set_config(
  'test.persona_old_hash',
  public.get_persona_evaluation_set_snapshot('de100000-0000-0000-0000-000000000001')->>'hash',
  true
);
update public.persona_evaluation_questions
set expected = expected || '{"changed":true}'::jsonb
where id = (
  select id from public.persona_evaluation_questions
  where expert_id = 'de100000-0000-0000-0000-000000000001'
  order by id limit 1
);
select isnt(
  public.has_current_passed_persona_evaluation(
    'de100000-0000-0000-0000-000000000001', 'df200000-0000-0000-0000-000000000002'
  ),
  true,
  'editing evaluation criteria invalidates the previous pass'
);
select isnt(
  public.get_persona_evaluation_set_snapshot('de100000-0000-0000-0000-000000000001')->>'hash',
  current_setting('test.persona_old_hash'),
  'in-place evaluation edits change the deterministic set hash'
);

insert into public.persona_synthesis_jobs (
  id, expert_id, source_revision_ids, status, attempts, locked_by, locked_at
) values (
  'df400000-0000-0000-0000-000000000004', 'de100000-0000-0000-0000-000000000001',
  array['de400000-0000-0000-0000-000000000004'::uuid, 'de500000-0000-0000-0000-000000000005'::uuid],
  'processing', 1, 'persona-worker-changed', now()
);
set local role service_role;
select throws_ok(
  $$select public.complete_persona_synthesis_job(
    'df400000-0000-0000-0000-000000000004', 'persona-worker-changed',
    'generator-test', 'evaluator-test', '[]'::jsonb, 86, 'passed',
    current_setting('test.persona_old_hash'),
    '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, 86, 'passed', 'generator-test'
  )$$,
  '23514', 'persona_evaluation_set_changed',
  'completion rejects output evaluated against stale criteria'
);
set local role postgres;
select is((select count(*) from public.persona_evaluation_runs where synthesis_job_id = 'df400000-0000-0000-0000-000000000004'), 0::bigint, 'stale evaluation output leaves no run');
select is((select status from public.persona_synthesis_jobs where id = 'df400000-0000-0000-0000-000000000004'), 'processing', 'stale evaluation output cannot overwrite the active lease');

set local role service_role;
select is(public.fail_persona_synthesis_job(
  'df400000-0000-0000-0000-000000000004', 'stale-worker', 'wrong lease', false, null
), false, 'stale worker cannot fail another persona lease');
set local role postgres;
select is((select status from public.persona_synthesis_jobs where id = 'df400000-0000-0000-0000-000000000004'), 'processing', 'wrong worker leaves persona job processing');

set local role service_role;
select is(public.fail_persona_synthesis_job(
  'df400000-0000-0000-0000-000000000004', 'persona-worker-changed',
  'persona_evaluation_set_changed', false, null
), true, 'current worker can atomically close a permanent persona failure');
set local role postgres;
select is((select status from public.persona_synthesis_jobs where id = 'df400000-0000-0000-0000-000000000004'), 'failed', 'atomic persona failure closes the exact job');
select ok((select locked_by is null and locked_at is null from public.persona_synthesis_jobs where id = 'df400000-0000-0000-0000-000000000004'), 'atomic persona failure releases the lease');

select ok(has_function_privilege(
  'service_role',
  'public.complete_persona_synthesis_job(uuid,text,text,text,jsonb,integer,text,text,jsonb,jsonb,jsonb,integer,text,text)',
  'EXECUTE'
), 'service role can execute atomic persona completion');
select ok(not has_function_privilege(
  'authenticated',
  'public.fail_persona_synthesis_job(uuid,text,text,boolean,timestamp with time zone)',
  'EXECUTE'
), 'browser role cannot execute persona failure finalization');

select * from finish();
rollback;
