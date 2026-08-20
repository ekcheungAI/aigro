begin;
create extension if not exists pgtap with schema extensions;
select plan(36);

set local role postgres;
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('ae100000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'rights-owner@test.local', '', now(), '{}', '{}', now(), now()),
  ('ae100000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'rights-other@test.local', '', now(), '{}', '{}', now(), now());

insert into public.experts (id, slug, display_name, status, feature_flags)
values (
  'ae200000-0000-0000-0000-000000000001',
  'rights-test-expert', 'Rights Test Expert', 'active', '{"rag_enabled":true}'::jsonb
);
update public.experts
set verified = true, public_profile_enabled = true
where id = 'ae200000-0000-0000-0000-000000000001';
update public.account_access
set app_role = 'expert',
    expert_id = 'ae200000-0000-0000-0000-000000000001'
where user_id = 'ae100000-0000-0000-0000-000000000002';

insert into public.conversations (id, owner_id, persona, expert_id, title)
values (
  'ae300000-0000-0000-0000-000000000001',
  'ae100000-0000-0000-0000-000000000001',
  'rights-test-expert', 'ae200000-0000-0000-0000-000000000001', 'Rights-safe history'
);

insert into public.knowledge_sources (
  id, expert_id, source_type, title, rights_status, rights_scope,
  rights_holder, rights_evidence_ref, authorized_at
) values
  ('ae400000-0000-0000-0000-000000000001',
   'ae200000-0000-0000-0000-000000000001', 'manual', 'Citation source',
   'granted', '{"commercial_rag":true,"distillation":true,"persona_synthesis":true,"model_training":false}'::jsonb, 'Fixture owner', 'fixture:a', now()),
  ('ae400000-0000-0000-0000-000000000002',
   'ae200000-0000-0000-0000-000000000001', 'manual', 'Retrieval source',
   'granted', '{"commercial_rag":true,"distillation":true,"persona_synthesis":true,"model_training":false}'::jsonb, 'Fixture owner', 'fixture:b', now());

insert into public.knowledge_revisions (
  id, source_id, revision_no, raw_text, status, approved_by, approved_at
) values
  ('ae500000-0000-0000-0000-000000000001',
   'ae400000-0000-0000-0000-000000000001', 1, 'Citation source text', 'approved',
   'ae100000-0000-0000-0000-000000000001', now()),
  ('ae500000-0000-0000-0000-000000000002',
   'ae400000-0000-0000-0000-000000000002', 1, 'Retrieval source text', 'approved',
   'ae100000-0000-0000-0000-000000000001', now());

update public.knowledge_sources
set published_revision_id = case id
  when 'ae400000-0000-0000-0000-000000000001'::uuid
    then 'ae500000-0000-0000-0000-000000000001'::uuid
  else 'ae500000-0000-0000-0000-000000000002'::uuid
end
where id in (
  'ae400000-0000-0000-0000-000000000001',
  'ae400000-0000-0000-0000-000000000002'
);

insert into public.knowledge_chunks (
  id, revision_id, source_id, expert_id, chunk_index, content, embedding
) values
  ('ae510000-0000-0000-0000-000000000001',
   'ae500000-0000-0000-0000-000000000001',
   'ae400000-0000-0000-0000-000000000001',
   'ae200000-0000-0000-0000-000000000001', 0, 'Citation source chunk',
   array_fill(0.01::real, array[1536])::extensions.halfvec),
  ('ae510000-0000-0000-0000-000000000002',
   'ae500000-0000-0000-0000-000000000002',
   'ae400000-0000-0000-0000-000000000002',
   'ae200000-0000-0000-0000-000000000001', 0, 'Retrieval source chunk',
   array_fill(0.02::real, array[1536])::extensions.halfvec);

insert into public.expert_persona_versions (
  id, expert_id, version, greeting, persona_blueprint,
  source_revision_ids, status, published_at
) values (
  'ae520000-0000-0000-0000-000000000001',
  'ae200000-0000-0000-0000-000000000001', 1, 'Rights-safe persona',
  '{"fixture":"rights"}'::jsonb,
  array[
    'ae500000-0000-0000-0000-000000000001'::uuid,
    'ae500000-0000-0000-0000-000000000002'::uuid
  ],
  'published', now()
);
update public.experts
set published_persona_version_id = 'ae520000-0000-0000-0000-000000000001'
where id = 'ae200000-0000-0000-0000-000000000001';
insert into public.persona_evaluation_questions (
  expert_id, category, question, expected, source_revision_ids
)
select
  'ae200000-0000-0000-0000-000000000001',
  (array['known_stance', 'edge_honesty', 'voice', 'source_transparency'])[(g - 1) % 4 + 1],
  'Rights evaluation question ' || g,
  jsonb_build_object('criteria', 'Ground the answer in rights-safe evidence'),
  array[
    case when g % 2 = 0
      then 'ae500000-0000-0000-0000-000000000001'::uuid
      else 'ae500000-0000-0000-0000-000000000002'::uuid
    end
  ]
from generate_series(1, 25) g;
insert into public.persona_synthesis_jobs (
  id, expert_id, source_revision_ids, status, output_blueprint,
  reviewed_by, reviewed_at, review_notes, persona_version_id
) values (
  'ae530000-0000-0000-0000-000000000001',
  'ae200000-0000-0000-0000-000000000001',
  array[
    'ae500000-0000-0000-0000-000000000001'::uuid,
    'ae500000-0000-0000-0000-000000000002'::uuid
  ],
  'published', '{"fixture":"rights"}'::jsonb,
  'ae100000-0000-0000-0000-000000000002', now(),
  'Human-reviewed rights fixture',
  'ae520000-0000-0000-0000-000000000001'
);
insert into public.persona_evaluation_runs (
  id, synthesis_job_id, generator_model, evaluator_model, score, status,
  report, evaluation_set_hash, output_blueprint_hash
)
select
  'ae540000-0000-0000-0000-000000000001',
  'ae530000-0000-0000-0000-000000000001',
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
    'ae200000-0000-0000-0000-000000000001'
  )->>'hash',
  encode(extensions.digest(
    convert_to('{"fixture":"rights"}'::jsonb::text, 'UTF8'), 'sha256'
  ), 'hex')
from public.persona_evaluation_questions
where expert_id = 'ae200000-0000-0000-0000-000000000001' and active;
update public.persona_synthesis_jobs psj
set finalized_evaluation_run_id = 'ae540000-0000-0000-0000-000000000001',
    fidelity_score = per.score,
    fidelity_status = per.status,
    fidelity_report = per.report
from public.persona_evaluation_runs per
where psj.id = 'ae530000-0000-0000-0000-000000000001'
  and per.id = 'ae540000-0000-0000-0000-000000000001';
update public.expert_persona_versions epv
set fidelity_score = per.score,
    fidelity_status = per.status,
    fidelity_report = per.report
from public.persona_evaluation_runs per
where epv.id = 'ae520000-0000-0000-0000-000000000001'
  and per.id = 'ae540000-0000-0000-0000-000000000001';
select ok(
  public.is_expert_chat_ready('ae200000-0000-0000-0000-000000000001'),
  'rights replay fixture is a currently evaluated chat-ready persona'
);

-- Citation-only grounded round.
insert into public.chat_request_reservations (
  user_id, request_id, message_hash, conversation_id, expert_id,
  persona_version_id, status, locked_until
) values (
  'ae100000-0000-0000-0000-000000000001',
  'ae600000-0000-0000-0000-000000000001', repeat('1', 64),
  'ae300000-0000-0000-0000-000000000001',
  'ae200000-0000-0000-0000-000000000001',
  'ae520000-0000-0000-0000-000000000001', 'processing', now() + interval '5 minutes'
);
insert into public.messages (
  id, conversation_id, role, content, source, request_id, server_generated,
  turn_sequence
) values (
  'ae700000-0000-0000-0000-000000000001',
  'ae300000-0000-0000-0000-000000000001', 'user', 'citation question', 'user',
  'ae600000-0000-0000-0000-000000000001', true, 3
);
insert into public.messages (
  id, conversation_id, role, content, source, request_id, server_generated,
  answer_basis, coverage, citations, retrieval, provider_usage,
  persona_version_id, turn_sequence
) values (
  'ae700000-0000-0000-0000-000000000002',
  'ae300000-0000-0000-0000-000000000001', 'assistant', 'citation answer', 'kb',
  'ae600000-0000-0000-0000-000000000001', true, 'knowledge', 'high',
  '[{"revision_id":"ae500000-0000-0000-0000-000000000001","title":"Citation source"}]'::jsonb,
  '[]'::jsonb, '{"rights_lineage_complete":true}'::jsonb,
  'ae520000-0000-0000-0000-000000000001', 4
);

-- Retrieval-only grounded round.
insert into public.chat_request_reservations (
  user_id, request_id, message_hash, conversation_id, expert_id,
  persona_version_id, status, locked_until
) values (
  'ae100000-0000-0000-0000-000000000001',
  'ae600000-0000-0000-0000-000000000002', repeat('2', 64),
  'ae300000-0000-0000-0000-000000000001',
  'ae200000-0000-0000-0000-000000000001',
  'ae520000-0000-0000-0000-000000000001', 'processing', now() + interval '5 minutes'
);
insert into public.messages (
  id, conversation_id, role, content, source, request_id, server_generated,
  turn_sequence
) values (
  'ae700000-0000-0000-0000-000000000003',
  'ae300000-0000-0000-0000-000000000001', 'user', 'retrieval question', 'user',
  'ae600000-0000-0000-0000-000000000002', true, 5
);
insert into public.messages (
  id, conversation_id, role, content, source, request_id, server_generated,
  answer_basis, coverage, citations, retrieval, provider_usage,
  persona_version_id, turn_sequence
) values (
  'ae700000-0000-0000-0000-000000000004',
  'ae300000-0000-0000-0000-000000000001', 'assistant', 'retrieval answer', 'kb',
  'ae600000-0000-0000-0000-000000000002', true, 'knowledge', 'high', '[]'::jsonb,
  '[{"chunk_id":"ae510000-0000-0000-0000-000000000002","revision_id":"ae500000-0000-0000-0000-000000000002","similarity":0.9,"lineage_origin":"current"},
    {"revision_id":"ae500000-0000-0000-0000-000000000001","lineage_origin":"history"}]'::jsonb,
  '{"rights_lineage_complete":true}'::jsonb,
  'ae520000-0000-0000-0000-000000000001', 6
);

-- General answer with no source references remains safe.
insert into public.chat_request_reservations (
  user_id, request_id, message_hash, conversation_id, expert_id,
  persona_version_id, status, locked_until
) values (
  'ae100000-0000-0000-0000-000000000001',
  'ae600000-0000-0000-0000-000000000003', repeat('3', 64),
  'ae300000-0000-0000-0000-000000000001',
  'ae200000-0000-0000-0000-000000000001',
  'ae520000-0000-0000-0000-000000000001', 'processing', now() + interval '5 minutes'
);
insert into public.messages (
  id, conversation_id, role, content, source, request_id, server_generated,
  turn_sequence
) values (
  'ae700000-0000-0000-0000-000000000005',
  'ae300000-0000-0000-0000-000000000001', 'user', 'general question', 'user',
  'ae600000-0000-0000-0000-000000000003', true, 1
);
insert into public.messages (
  id, conversation_id, role, content, source, request_id, server_generated,
  answer_basis, coverage, citations, retrieval, provider_usage,
  persona_version_id, turn_sequence
) values (
  'ae700000-0000-0000-0000-000000000006',
  'ae300000-0000-0000-0000-000000000001', 'assistant', 'general answer', 'llm',
  'ae600000-0000-0000-0000-000000000003', true, 'general', 'none', '[]'::jsonb, '[]'::jsonb,
  '{"rights_lineage_complete":true}'::jsonb,
  'ae520000-0000-0000-0000-000000000001', 2
);

-- Malformed legacy citation must fail closed.
insert into public.chat_request_reservations (
  user_id, request_id, message_hash, conversation_id, expert_id,
  persona_version_id, status, locked_until
) values (
  'ae100000-0000-0000-0000-000000000001',
  'ae600000-0000-0000-0000-000000000004', repeat('4', 64),
  'ae300000-0000-0000-0000-000000000001',
  'ae200000-0000-0000-0000-000000000001',
  'ae520000-0000-0000-0000-000000000001', 'processing', now() + interval '5 minutes'
);
insert into public.messages (
  id, conversation_id, role, content, source, request_id, server_generated,
  turn_sequence
) values (
  'ae700000-0000-0000-0000-000000000007',
  'ae300000-0000-0000-0000-000000000001', 'user', 'malformed question', 'user',
  'ae600000-0000-0000-0000-000000000004', true, 7
);
insert into public.messages (
  id, conversation_id, role, content, source, request_id, server_generated,
  answer_basis, coverage, citations, retrieval, provider_usage,
  persona_version_id, turn_sequence
) values (
  'ae700000-0000-0000-0000-000000000008',
  'ae300000-0000-0000-0000-000000000001', 'assistant', 'malformed answer', 'kb',
  'ae600000-0000-0000-0000-000000000004', true, 'knowledge', 'high',
  '[{"title":"missing revision id"}]'::jsonb, '[]'::jsonb,
  '{"rights_lineage_complete":true}'::jsonb,
  'ae520000-0000-0000-0000-000000000001', 8
);

select ok(
  to_regprocedure('public.chat_message_revision_lineage(uuid)') is not null,
  'stored message lineage helper exists'
);
select ok(
  to_regprocedure('public.is_chat_message_retrieval_authorized(uuid,uuid)') is not null,
  'current-rights message validator exists'
);
select ok(
  to_regprocedure('public.get_rights_safe_chat_replay(uuid,uuid,uuid,text,text)') is not null,
  'rights-safe replay RPC exists'
);
select ok(
  to_regprocedure('public.get_rights_safe_chat_history(uuid,uuid,uuid,integer)') is not null,
  'rights-safe paired history RPC exists'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.get_rights_safe_chat_replay(uuid,uuid,uuid,text,text)', 'EXECUTE'
  ),
  'service role can validate replay'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.get_rights_safe_chat_replay(uuid,uuid,uuid,text,text)', 'EXECUTE'
  ),
  'authenticated browsers cannot call replay validator'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.get_rights_safe_chat_history(uuid,uuid,uuid,integer)', 'EXECUTE'
  ),
  'anonymous browsers cannot load service history'
);

select is(
  public.get_rights_safe_chat_replay(
    'ae100000-0000-0000-0000-000000000001',
    'ae300000-0000-0000-0000-000000000001',
    'ae200000-0000-0000-0000-000000000001',
    'ae600000-0000-0000-0000-000000000001', 'citation question'
  ) ->> 'state',
  'ready', 'a currently authorised citation answer can replay'
);
select is(
  public.get_rights_safe_chat_replay(
    'ae100000-0000-0000-0000-000000000001',
    'ae300000-0000-0000-0000-000000000001',
    'ae200000-0000-0000-0000-000000000001',
    'ae600000-0000-0000-0000-000000000001', 'citation question'
  ) #>> '{answer,content}',
  'citation answer', 'ready replay returns the stored answer'
);
select is(
  public.get_rights_safe_chat_replay(
    'ae100000-0000-0000-0000-000000000001',
    'ae300000-0000-0000-0000-000000000001',
    'ae200000-0000-0000-0000-000000000001',
    'ae600000-0000-0000-0000-000000000001', 'different question'
  ) ->> 'state',
  'payload_mismatch', 'replay keeps request-id payload binding'
);
select is(
  public.get_rights_safe_chat_replay(
    'ae100000-0000-0000-0000-000000000002',
    'ae300000-0000-0000-0000-000000000001',
    'ae200000-0000-0000-0000-000000000001',
    'ae600000-0000-0000-0000-000000000001', 'citation question'
  ) ->> 'state',
  'missing', 'replay does not expose another owner conversation'
);
select is(
  public.get_rights_safe_chat_replay(
    'ae100000-0000-0000-0000-000000000001',
    'ae300000-0000-0000-0000-000000000001',
    'ae200000-0000-0000-0000-000000000001',
    'ae600000-0000-0000-0000-000000000004', 'malformed question'
  ) ->> 'state',
  'sources_unavailable', 'a malformed stored citation fails closed'
);
select is(
  (select count(*) from public.get_rights_safe_chat_history(
    'ae100000-0000-0000-0000-000000000001',
    'ae300000-0000-0000-0000-000000000001',
    'ae200000-0000-0000-0000-000000000001', 8
  )),
  6::bigint, 'history initially contains three complete authorised pairs'
);
select is(
  (select revision_ids from public.get_rights_safe_chat_history(
    'ae100000-0000-0000-0000-000000000001',
    'ae300000-0000-0000-0000-000000000001',
    'ae200000-0000-0000-0000-000000000001', 8
  ) where content = 'retrieval answer'),
  array[
    'ae500000-0000-0000-0000-000000000001',
    'ae500000-0000-0000-0000-000000000002'
  ]::text[],
  'history returns the complete transitive revision lineage for persistence'
);
select is(
  (select count(*) from public.get_rights_safe_chat_history(
    'ae100000-0000-0000-0000-000000000001',
    'ae300000-0000-0000-0000-000000000001',
    'ae200000-0000-0000-0000-000000000001', 8
  ) where content like 'malformed%'),
  0::bigint, 'malformed assistant and its paired user turn are both filtered'
);

update public.knowledge_sources
set rights_scope = '{"commercial_rag":false,"model_training":false}'::jsonb
where id = 'ae400000-0000-0000-0000-000000000002';
select is(
  public.get_rights_safe_chat_replay(
    'ae100000-0000-0000-0000-000000000001',
    'ae300000-0000-0000-0000-000000000001',
    'ae200000-0000-0000-0000-000000000001',
    'ae600000-0000-0000-0000-000000000002', 'retrieval question'
  ) ->> 'state',
  'sources_unavailable', 'retrieval replay stops when commercial RAG scope is withdrawn'
);
select is(
  (select count(*) from public.get_rights_safe_chat_history(
    'ae100000-0000-0000-0000-000000000001',
    'ae300000-0000-0000-0000-000000000001',
    'ae200000-0000-0000-0000-000000000001', 8
  )),
  0::bigint,
  'persona evidence scope withdrawal removes every round, including general output'
);
select is(
  (select count(*) from public.get_rights_safe_chat_history(
    'ae100000-0000-0000-0000-000000000001',
    'ae300000-0000-0000-0000-000000000001',
    'ae200000-0000-0000-0000-000000000001', 8
  ) where content in ('retrieval question', 'retrieval answer')),
  0::bigint, 'neither side of a scope-revoked round reaches model history'
);

update public.knowledge_sources
set rights_scope = '{"commercial_rag":true,"distillation":true,"persona_synthesis":true,"model_training":false}'::jsonb
where id = 'ae400000-0000-0000-0000-000000000002';
select is(
  public.get_rights_safe_chat_replay(
    'ae100000-0000-0000-0000-000000000001',
    'ae300000-0000-0000-0000-000000000001',
    'ae200000-0000-0000-0000-000000000001',
    'ae600000-0000-0000-0000-000000000002', 'retrieval question'
  ) ->> 'state',
  'ready', 'restoring current commercial scope restores replay eligibility'
);

update public.knowledge_revisions
set approved_by = null
where id = 'ae500000-0000-0000-0000-000000000002';
select is(
  public.get_rights_safe_chat_replay(
    'ae100000-0000-0000-0000-000000000001',
    'ae300000-0000-0000-0000-000000000001',
    'ae200000-0000-0000-0000-000000000001',
    'ae600000-0000-0000-0000-000000000002', 'retrieval question'
  ) ->> 'state',
  'sources_unavailable', 'replay requires a recorded human approver'
);
update public.knowledge_revisions
set approved_by = 'ae100000-0000-0000-0000-000000000001'
where id = 'ae500000-0000-0000-0000-000000000002';

update public.knowledge_revisions
set approved_at = null
where id = 'ae500000-0000-0000-0000-000000000002';
select is(
  public.get_rights_safe_chat_replay(
    'ae100000-0000-0000-0000-000000000001',
    'ae300000-0000-0000-0000-000000000001',
    'ae200000-0000-0000-0000-000000000001',
    'ae600000-0000-0000-0000-000000000002', 'retrieval question'
  ) ->> 'state',
  'sources_unavailable', 'replay requires a recorded human approval time'
);
update public.knowledge_revisions
set approved_at = now()
where id = 'ae500000-0000-0000-0000-000000000002';

update public.knowledge_chunks
set embedding = null
where id = 'ae510000-0000-0000-0000-000000000002';
select is(
  public.get_rights_safe_chat_replay(
    'ae100000-0000-0000-0000-000000000001',
    'ae300000-0000-0000-0000-000000000001',
    'ae200000-0000-0000-0000-000000000001',
    'ae600000-0000-0000-0000-000000000002', 'retrieval question'
  ) ->> 'state',
  'sources_unavailable', 'replay requires a current embedded chunk'
);
update public.knowledge_chunks
set embedding = array_fill(0.02::real, array[1536])::extensions.halfvec
where id = 'ae510000-0000-0000-0000-000000000002';

update public.knowledge_sources
set archived_at = now()
where id = 'ae400000-0000-0000-0000-000000000002';
select is(
  public.get_rights_safe_chat_replay(
    'ae100000-0000-0000-0000-000000000001',
    'ae300000-0000-0000-0000-000000000001',
    'ae200000-0000-0000-0000-000000000001',
    'ae600000-0000-0000-0000-000000000002', 'retrieval question'
  ) ->> 'state',
  'sources_unavailable', 'archived sources cannot be replayed'
);
update public.knowledge_sources
set archived_at = null, published_revision_id = null
where id = 'ae400000-0000-0000-0000-000000000002';
select is(
  public.get_rights_safe_chat_replay(
    'ae100000-0000-0000-0000-000000000001',
    'ae300000-0000-0000-0000-000000000001',
    'ae200000-0000-0000-0000-000000000001',
    'ae600000-0000-0000-0000-000000000002', 'retrieval question'
  ) ->> 'state',
  'sources_unavailable', 'an unpublished revision cannot be replayed'
);
update public.knowledge_sources
set published_revision_id = 'ae500000-0000-0000-0000-000000000002'
where id = 'ae400000-0000-0000-0000-000000000002';

-- Round B persisted A's revision from model history. Revoking A therefore
-- invalidates both the direct A answer and the downstream B answer.
update public.knowledge_revisions
set status = 'archived'
where id = 'ae500000-0000-0000-0000-000000000001';
select is(
  public.get_rights_safe_chat_replay(
    'ae100000-0000-0000-0000-000000000001',
    'ae300000-0000-0000-0000-000000000001',
    'ae200000-0000-0000-0000-000000000001',
    'ae600000-0000-0000-0000-000000000001', 'citation question'
  ) ->> 'state',
  'sources_unavailable', 'citation replay stops when its revision is no longer approved'
);
select is(
  public.get_rights_safe_chat_replay(
    'ae100000-0000-0000-0000-000000000001',
    'ae300000-0000-0000-0000-000000000001',
    'ae200000-0000-0000-0000-000000000001',
    'ae600000-0000-0000-0000-000000000002', 'retrieval question'
  ) ->> 'state',
  'sources_unavailable', 'revoking A also blocks downstream answer B that inherited A'
);
select is(
  (select count(*) from public.get_rights_safe_chat_history(
    'ae100000-0000-0000-0000-000000000001',
    'ae300000-0000-0000-0000-000000000001',
    'ae200000-0000-0000-0000-000000000001', 8
  )),
  0::bigint,
  'revoking a current persona source also removes source-free persona output'
);
select is(
  (select count(*) from public.get_rights_safe_chat_history(
    'ae100000-0000-0000-0000-000000000001',
    'ae300000-0000-0000-0000-000000000001',
    'ae200000-0000-0000-0000-000000000001', 8
  ) where content in ('retrieval question', 'retrieval answer')),
  0::bigint, 'the downstream user and assistant pair are both filtered transitively'
);
select is(
  (select string_agg(content, '|' order by turn_sequence) from public.get_rights_safe_chat_history(
    'ae100000-0000-0000-0000-000000000001',
    'ae300000-0000-0000-0000-000000000001',
    'ae200000-0000-0000-0000-000000000001', 8
  )),
  null::text,
  'history cannot reuse a general answer from a persona with revoked evidence'
);
select is(
  public.get_rights_safe_chat_replay(
    'ae100000-0000-0000-0000-000000000001',
    'ae300000-0000-0000-0000-000000000001',
    'ae200000-0000-0000-0000-000000000001',
    'ae600000-0000-0000-0000-000000000003', 'general question'
  ) ->> 'state',
  'sources_unavailable',
  'a source-free answer still depends on its current persona evidence'
);
select is(
  (select count(*) from public.get_rights_safe_chat_history(
    'ae100000-0000-0000-0000-000000000002',
    'ae300000-0000-0000-0000-000000000001',
    'ae200000-0000-0000-0000-000000000001', 8
  )),
  0::bigint, 'history does not expose another owner conversation'
);
select is(
  (select count(*) from public.get_rights_safe_chat_history(
    'ae100000-0000-0000-0000-000000000001',
    'ae300000-0000-0000-0000-000000000001',
    'ae200000-0000-0000-0000-000000000001', 1
  )),
  0::bigint, 'history never returns a partial pair for an odd one-message limit'
);
select is(
  (select count(*) from public.get_rights_safe_chat_history(
    'ae100000-0000-0000-0000-000000000001',
    'ae300000-0000-0000-0000-000000000001',
    'ae200000-0000-0000-0000-000000000001', 2
  )),
  0::bigint, 'message limits cannot reintroduce an unauthorized persona pair'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.is_chat_message_retrieval_authorized(uuid,uuid)', 'EXECUTE'
  ),
  'browser roles cannot call the service-only message validator'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.chat_message_revision_lineage(uuid)', 'EXECUTE'
  ),
  'browser roles cannot call the service-only lineage helper'
);

select * from finish();
rollback;
