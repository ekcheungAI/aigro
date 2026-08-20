begin;
create extension if not exists pgtap with schema extensions;
select plan(26);

set local role postgres;
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  'c6100000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'citation-review@test.local', '', now(),
  '{}'::jsonb, '{}'::jsonb, now(), now()
) on conflict (id) do nothing;

insert into public.experts (
  id, slug, display_name, status, verified, public_profile_enabled,
  feature_flags
) values (
  'c6200000-0000-0000-0000-000000000002',
  'citation-review-expert', 'Citation Review Expert', 'active', true, true,
  '{"cms_ingestion_enabled":true,"rag_enabled":true}'::jsonb
);

update public.account_access
set app_role = 'expert',
    expert_id = 'c6200000-0000-0000-0000-000000000002'
where user_id = 'c6100000-0000-0000-0000-000000000001';

insert into public.knowledge_sources (
  id, expert_id, source_type, title, source_url, rights_status,
  rights_holder, rights_evidence_ref, rights_scope, authorized_at
) values (
  'c6300000-0000-0000-0000-000000000003',
  'c6200000-0000-0000-0000-000000000002',
  'url', 'Private fetch URL',
  'https://ingest.example.com/article?api_key=private#fetch-token',
  'granted', 'Citation Review Expert', 'contract:citation-review-001',
  '{"commercial_rag":true,"distillation":true,"persona_synthesis":true,"model_training":false}'::jsonb,
  now()
);

select is(
  public.normalize_public_citation_url(
    ' https://PUBLIC.example.com/article?X-Amz-Signature=secret#access_token '
  ),
  'https://PUBLIC.example.com/article',
  'public citation normalization strips the complete query and fragment'
);

select throws_ok(
  $$select public.normalize_public_citation_url('https://user:secret@example.com/article')$$,
  '22023', 'unsafe_public_citation_url',
  'public citation URLs reject userinfo credentials'
);

select throws_ok(
  $$select public.normalize_public_citation_url('https://127.0.0.1/private')$$,
  '22023', 'unsafe_public_citation_url',
  'public citation URLs reject non-public hosts'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'public.normalize_public_citation_url(text)',
    'execute'
  ),
  'the normalization helper is not a browser RPC'
);

select ok(
  has_function_privilege(
    'authenticated',
    'public.set_knowledge_source_public_citation(uuid,text,text)',
    'execute'
  ),
  'authenticated owners can use the reviewed citation workflow'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"c6100000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

select throws_ok(
  $$select public.set_knowledge_source_public_citation(
    'c6300000-0000-0000-0000-000000000003',
    'https://public.example.com/article',
    'no'
  )$$,
  '22023', 'public_citation_review_note_required',
  'a human review note is mandatory'
);

select lives_ok(
  $$select public.set_knowledge_source_public_citation(
    'c6300000-0000-0000-0000-000000000003',
    'https://public.example.com/article?signature=secret#token',
    'Checked the canonical public article'
  )$$,
  'an owner can approve a separate public citation URL'
);

set local role postgres;
select is(
  (select public_citation_url from public.knowledge_sources
   where id = 'c6300000-0000-0000-0000-000000000003'),
  'https://public.example.com/article',
  'the stored public URL contains no query or fragment'
);

select is(
  (select public_citation_reviewed_by from public.knowledge_sources
   where id = 'c6300000-0000-0000-0000-000000000003'),
  'c6100000-0000-0000-0000-000000000001'::uuid,
  'the workflow records the human reviewer'
);

select ok(
  (select public_citation_reviewed_at is not null
   from public.knowledge_sources
   where id = 'c6300000-0000-0000-0000-000000000003'),
  'the workflow records the review time'
);

select is(
  (select public_citation_review_note from public.knowledge_sources
   where id = 'c6300000-0000-0000-0000-000000000003'),
  'Checked the canonical public article',
  'the workflow records the review rationale'
);

select is(
  (select source_url from public.knowledge_sources
   where id = 'c6300000-0000-0000-0000-000000000003'),
  'https://ingest.example.com/article?api_key=private#fetch-token',
  'the private fetch URL remains separate for server ingestion'
);

insert into public.knowledge_revisions (
  id, source_id, revision_no, raw_text, extracted_text, distilled_json,
  status, approved_by, approved_at
) values (
  'c6400000-0000-0000-0000-000000000004',
  'c6300000-0000-0000-0000-000000000003',
  1, 'Reviewed source text', 'Reviewed source text',
  '{"summary":"Reviewed source summary long enough","claims":[{"claim":"Reviewed claim","evidence":"Reviewed evidence"}],"methods":["Method"],"boundaries":["Boundary"],"suggested_questions":["What is reviewed?"]}'::jsonb,
  'approved', 'c6100000-0000-0000-0000-000000000001', now()
);
update public.knowledge_sources
set published_revision_id = 'c6400000-0000-0000-0000-000000000004'
where id = 'c6300000-0000-0000-0000-000000000003';
insert into public.knowledge_chunks (
  id, revision_id, expert_id, chunk_index, content, embedding, citation_meta
) values (
  'c6500000-0000-0000-0000-000000000005',
  'c6400000-0000-0000-0000-000000000004',
  'c6200000-0000-0000-0000-000000000002',
  0, 'Reviewed source chunk',
  array_fill(0.01::real, array[1536])::extensions.halfvec,
  '{"section":"Reviewed section"}'::jsonb
);

-- Replay is now deliberately stricter than the citation sanitizer: it will
-- only return a round generated by the exact current, evaluated persona. Seed
-- a second independent source and a complete release fixture so this suite
-- exercises citation privacy through the real replay authorization boundary.
insert into public.knowledge_sources (
  id, expert_id, source_type, title, rights_status, rights_holder,
  rights_evidence_ref, rights_scope, authorized_at
) values (
  'c6310000-0000-0000-0000-000000000003',
  'c6200000-0000-0000-0000-000000000002',
  'manual', 'Persona support source', 'granted', 'Citation Review Expert',
  'contract:citation-review-002',
  '{"commercial_rag":true,"distillation":true,"persona_synthesis":true,"model_training":false}'::jsonb,
  now()
);
insert into public.knowledge_revisions (
  id, source_id, revision_no, raw_text, extracted_text, status,
  approved_by, approved_at
) values (
  'c6410000-0000-0000-0000-000000000004',
  'c6310000-0000-0000-0000-000000000003', 1,
  'Persona support source text', 'Persona support source text', 'approved',
  'c6100000-0000-0000-0000-000000000001', now()
);
update public.knowledge_sources
set published_revision_id = 'c6410000-0000-0000-0000-000000000004'
where id = 'c6310000-0000-0000-0000-000000000003';
insert into public.knowledge_chunks (
  id, revision_id, expert_id, chunk_index, content, embedding
) values (
  'c6510000-0000-0000-0000-000000000005',
  'c6410000-0000-0000-0000-000000000004',
  'c6200000-0000-0000-0000-000000000002', 0,
  'Persona support source chunk',
  array_fill(0.02::real, array[1536])::extensions.halfvec
);

insert into public.expert_persona_versions (
  id, expert_id, version, greeting, persona_blueprint,
  source_revision_ids, status, published_at
) values (
  'c6520000-0000-0000-0000-000000000005',
  'c6200000-0000-0000-0000-000000000002', 1,
  'Citation-safe persona', '{"fixture":"citation"}'::jsonb,
  array[
    'c6400000-0000-0000-0000-000000000004'::uuid,
    'c6410000-0000-0000-0000-000000000004'::uuid
  ],
  'published', now()
);
update public.experts
set published_persona_version_id = 'c6520000-0000-0000-0000-000000000005'
where id = 'c6200000-0000-0000-0000-000000000002';
insert into public.persona_evaluation_questions (
  expert_id, category, question, expected, source_revision_ids
)
select
  'c6200000-0000-0000-0000-000000000002',
  (array['known_stance', 'edge_honesty', 'voice', 'source_transparency'])[(g - 1) % 4 + 1],
  'Citation evaluation question ' || g,
  jsonb_build_object('criteria', 'Keep citations public and rights-safe'),
  array[
    case when g % 2 = 0
      then 'c6400000-0000-0000-0000-000000000004'::uuid
      else 'c6410000-0000-0000-0000-000000000004'::uuid
    end
  ]
from generate_series(1, 25) g;
insert into public.persona_synthesis_jobs (
  id, expert_id, source_revision_ids, status, output_blueprint,
  reviewed_by, reviewed_at, review_notes, persona_version_id
) values (
  'c6530000-0000-0000-0000-000000000005',
  'c6200000-0000-0000-0000-000000000002',
  array[
    'c6400000-0000-0000-0000-000000000004'::uuid,
    'c6410000-0000-0000-0000-000000000004'::uuid
  ],
  'published', '{"fixture":"citation"}'::jsonb,
  'c6100000-0000-0000-0000-000000000001', now(),
  'Human-reviewed citation privacy fixture',
  'c6520000-0000-0000-0000-000000000005'
);
insert into public.persona_evaluation_runs (
  id, synthesis_job_id, generator_model, evaluator_model, score, status,
  report, evaluation_set_hash, output_blueprint_hash
)
select
  'c6540000-0000-0000-0000-000000000005',
  'c6530000-0000-0000-0000-000000000005',
  'test-generator', 'test-evaluator', 95, 'passed',
  jsonb_build_object(
    'breakdown', jsonb_build_object(
      'stance_consistency', 29,
      'style_distinctiveness', 19,
      'edge_honesty', 19,
      'source_transparency', 14,
      'structural_completeness', 14
    ),
    'evaluation', jsonb_build_object(
      'question_count', count(*),
      'question_ids', jsonb_agg(id::text order by id),
      'response_count', count(*)
    )
  ),
  public.get_persona_evaluation_set_snapshot(
    'c6200000-0000-0000-0000-000000000002'
  )->>'hash',
  encode(extensions.digest(
    convert_to('{"fixture":"citation"}'::jsonb::text, 'UTF8'), 'sha256'
  ), 'hex')
from public.persona_evaluation_questions
where expert_id = 'c6200000-0000-0000-0000-000000000002' and active;
update public.persona_synthesis_jobs psj
set finalized_evaluation_run_id = 'c6540000-0000-0000-0000-000000000005',
    fidelity_score = per.score,
    fidelity_status = per.status,
    fidelity_report = per.report
from public.persona_evaluation_runs per
where psj.id = 'c6530000-0000-0000-0000-000000000005'
  and per.id = 'c6540000-0000-0000-0000-000000000005';
update public.expert_persona_versions epv
set fidelity_score = per.score,
    fidelity_status = per.status,
    fidelity_report = per.report
from public.persona_evaluation_runs per
where epv.id = 'c6520000-0000-0000-0000-000000000005'
  and per.id = 'c6540000-0000-0000-0000-000000000005';

insert into public.conversations (
  id, owner_id, persona, expert_id, title
) values (
  'c6600000-0000-0000-0000-000000000006',
  'c6100000-0000-0000-0000-000000000001',
  'citation-review-expert',
  'c6200000-0000-0000-0000-000000000002',
  'Citation privacy replay'
);
insert into public.chat_request_reservations (
  user_id, request_id, message_hash, conversation_id, expert_id,
  persona_version_id, status, locked_until
) values (
  'c6100000-0000-0000-0000-000000000001',
  'c6700000-0000-0000-0000-000000000007',
  repeat('7', 64),
  'c6600000-0000-0000-0000-000000000006',
  'c6200000-0000-0000-0000-000000000002',
  'c6520000-0000-0000-0000-000000000005',
  'processing',
  now() + interval '5 minutes'
);
insert into public.messages (
  id, conversation_id, role, content, source, request_id, server_generated,
  turn_sequence
) values (
  'c6800000-0000-0000-0000-000000000008',
  'c6600000-0000-0000-0000-000000000006',
  'user', 'citation privacy question', 'user',
  'c6700000-0000-0000-0000-000000000007', true, 1
);
insert into public.messages (
  id, conversation_id, role, content, source, request_id, server_generated,
  answer_basis, coverage, citations, retrieval, provider_usage,
  persona_version_id, turn_sequence
) values (
  'c6900000-0000-0000-0000-000000000009',
  'c6600000-0000-0000-0000-000000000006',
  'assistant', 'citation privacy answer', 'kb',
  'c6700000-0000-0000-0000-000000000007', true,
  'knowledge', 'high',
  '[{"revision_id":"c6400000-0000-0000-0000-000000000004","title":"Private fetch URL","href":"https://storage.example.com/private.pdf?X-Amz-Signature=secret#token","signed_url":"https://storage.example.com/private.pdf?token=secret","source_url":"https://ingest.example.com/article?api_key=private","storage_path":"expert/private.pdf","page":4}]'::jsonb,
  '[]'::jsonb,
  '{"rights_lineage_complete":true}'::jsonb,
  'c6520000-0000-0000-0000-000000000005',
  2
);

select is(
  (
    select citations -> 0
    from public.messages
    where id = 'c6900000-0000-0000-0000-000000000009'
  ),
  '{"revision_id":"c6400000-0000-0000-0000-000000000004","title":"Private fetch URL","href":"https://public.example.com/article","page":4}'::jsonb,
  'the persistence trigger removes signed/private URL keys before storage'
);

select is(
  (
    select public_citation_url
    from public.match_expert_knowledge(
      'c6200000-0000-0000-0000-000000000002',
      array_fill(0.01::real, array[1536])::extensions.halfvec,
      6,
      -1
    )
    where revision_id = 'c6400000-0000-0000-0000-000000000004'
    limit 1
  ),
  'https://public.example.com/article',
  'retrieval returns the reviewed public URL instead of the private fetch URL'
);

select is(
  public.get_rights_safe_chat_replay(
    'c6100000-0000-0000-0000-000000000001',
    'c6600000-0000-0000-0000-000000000006',
    'c6200000-0000-0000-0000-000000000002',
    'c6700000-0000-0000-0000-000000000007',
    'citation privacy question'
  ) #> '{answer,citations,0}',
  '{"revision_id":"c6400000-0000-0000-0000-000000000004","title":"Private fetch URL","href":"https://public.example.com/article","page":4}'::jsonb,
  'replay discards stored signed/private URL keys and preserves only reviewed href plus locator'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'public.match_expert_knowledge(uuid,extensions.halfvec,integer,double precision)',
    'execute'
  ),
  'knowledge retrieval remains service-only'
);

select ok(
  (
    select 'public_citation_url' = any(p.proargnames)
      and not ('source_url' = any(p.proargnames))
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'match_expert_knowledge'
      and p.pronargs = 4
  ),
  'retrieval names only the reviewed URL in its result contract'
);

insert into public.chat_request_reservations (
  user_id, request_id, message_hash, conversation_id, expert_id,
  persona_version_id, status, locked_until
) values (
  'c6100000-0000-0000-0000-000000000001',
  'c6710000-0000-0000-0000-000000000007',
  encode(extensions.digest(
    convert_to('citation changed during generation', 'UTF8'), 'sha256'
  ), 'hex'),
  'c6600000-0000-0000-0000-000000000006',
  'c6200000-0000-0000-0000-000000000002',
  'c6520000-0000-0000-0000-000000000005',
  'processing', now() + interval '5 minutes'
);
select is(
  public.bind_chat_request_evidence(
    'c6100000-0000-0000-0000-000000000001',
    'c6710000-0000-0000-0000-000000000007',
    'c6600000-0000-0000-0000-000000000006',
    'c6200000-0000-0000-0000-000000000002',
    'c6520000-0000-0000-0000-000000000005',
    '[{"chunk_id":"c6500000-0000-0000-0000-000000000005","revision_id":"c6400000-0000-0000-0000-000000000004","similarity":0.95,"lineage_origin":"current"}]'::jsonb
  ) ->> 'state',
  'bound',
  'generation binds the exact evidence before a citation review can change'
);

select lives_ok(
  $$select public.set_knowledge_source_public_citation(
    'c6300000-0000-0000-0000-000000000003', null,
    'Remove the public citation'
  )$$,
  'an owner can deliberately make a citation private and non-clickable'
);

set local role postgres;
create temporary table citation_finalize_result(payload jsonb) on commit drop;
insert into citation_finalize_result(payload)
select public.finalize_authorized_chat_round(
  'c6100000-0000-0000-0000-000000000001',
  'c6600000-0000-0000-0000-000000000006',
  'c6200000-0000-0000-0000-000000000002',
  'citation-review-expert',
  'c6710000-0000-0000-0000-000000000007',
  'citation changed during generation',
  'authoritative citation response',
  'knowledge', 'high',
  '[{"marker":"S1","revision_id":"c6400000-0000-0000-0000-000000000004","title":"Private fetch URL","href":"https://public.example.com/article"}]'::jsonb,
  'c6520000-0000-0000-0000-000000000005',
  '[{"chunk_id":"c6500000-0000-0000-0000-000000000005","revision_id":"c6400000-0000-0000-0000-000000000004","similarity":0.95,"lineage_origin":"current"}]'::jsonb,
  '{"rights_lineage_complete":true}'::jsonb,
  'test-model', 100, 'provider-citation-change'
);
select is(
  (select payload ->> 'state' from citation_finalize_result),
  'committed',
  'citation review changes do not invalidate otherwise-current source rights'
);
select is(
  (select payload #>> '{citations,0,href}' from citation_finalize_result),
  '',
  'finalizer returns the trigger-sanitized current citation instead of the stale local URL'
);
select is(
  (select citations #>> '{0,href}' from public.messages
   where request_id = 'c6710000-0000-0000-0000-000000000007'
     and role = 'assistant'),
  '',
  'the authoritative citation returned by finalizer matches the persisted assistant row'
);
select is(
  (
    select jsonb_build_array(
      public_citation_url,
      public_citation_reviewed_by,
      public_citation_reviewed_at
    )
    from public.knowledge_sources
    where id = 'c6300000-0000-0000-0000-000000000003'
  ),
  '[null,null,null]'::jsonb,
  'clearing the public citation removes all active review fields'
);

select is(
  (
    select public_citation_url
    from public.match_expert_knowledge(
      'c6200000-0000-0000-0000-000000000002',
      array_fill(0.01::real, array[1536])::extensions.halfvec,
      6,
      -1
    )
    where revision_id = 'c6400000-0000-0000-0000-000000000004'
    limit 1
  ),
  null::text,
  'a private source keeps its non-secret locator but has no clickable URL'
);

select is(
  public.get_rights_safe_chat_replay(
    'c6100000-0000-0000-0000-000000000001',
    'c6600000-0000-0000-0000-000000000006',
    'c6200000-0000-0000-0000-000000000002',
    'c6700000-0000-0000-0000-000000000007',
    'citation privacy question'
  ) #>> '{answer,citations,0,href}',
  '',
  'replay clears the href after the public citation review is removed'
);

select is(
  (
    select count(*)
    from public.audit_events
    where entity_id = 'c6300000-0000-0000-0000-000000000003'
      and action in ('knowledge.public_citation_reviewed', 'knowledge.public_citation_cleared')
  ),
  2::bigint,
  'review and clearing actions are audited'
);

select * from finish();
rollback;
