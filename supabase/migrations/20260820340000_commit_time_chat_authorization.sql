-- A model response is private work-in-progress until the database confirms
-- that the exact persona and complete evidence lineage are still authorised.
-- The Edge Function binds that snapshot before provider work, then finalises
-- and persists under the same current-rights transaction before releasing any
-- answer bytes to the browser.

alter table public.chat_request_reservations
  add column evidence_snapshot jsonb,
  add column evidence_bound_at timestamptz;

alter table public.chat_request_reservations
  add constraint chat_request_reservations_evidence_snapshot_array
  check (
    evidence_snapshot is null
    or jsonb_typeof(evidence_snapshot) = 'array'
  );

comment on column public.chat_request_reservations.evidence_snapshot is
  'Exact current-retrieval plus transitive history lineage bound before provider generation.';

create or replace function public.reset_recycled_chat_request_evidence()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.status = 'processing' and (
    old.status is distinct from 'processing'
    or new.created_at is distinct from old.created_at
    or new.message_hash is distinct from old.message_hash
    or new.conversation_id is distinct from old.conversation_id
    or new.expert_id is distinct from old.expert_id
    or new.persona_version_id is distinct from old.persona_version_id
  ) then
    new.evidence_snapshot := null;
    new.evidence_bound_at := null;
  end if;
  return new;
end;
$$;

revoke all on function public.reset_recycled_chat_request_evidence()
from public, anon, authenticated;

drop trigger if exists chat_request_reservations_reset_evidence
on public.chat_request_reservations;
create trigger chat_request_reservations_reset_evidence
before update on public.chat_request_reservations
for each row execute function public.reset_recycled_chat_request_evidence();

create or replace function public.is_chat_revision_currently_authorized(
  p_expert_id uuid,
  p_revision_id uuid,
  p_require_persona_scope boolean default false
)
returns boolean
language sql
security definer
stable
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.knowledge_revisions kr
    join public.knowledge_sources ks
      on ks.id = kr.source_id
     and ks.expert_id = p_expert_id
    where kr.id = p_revision_id
      and kr.status = 'approved'
      and kr.approved_by is not null
      and kr.approved_at is not null
      and ks.published_revision_id = kr.id
      and ks.archived_at is null
      and ks.rights_status = 'granted'
      and ks.revoked_at is null
      and (ks.expires_at is null or ks.expires_at > now())
      and ks.rights_scope -> 'commercial_rag'
        is not distinct from 'true'::jsonb
      and (
        not p_require_persona_scope
        or ks.rights_scope -> 'persona_synthesis'
          is not distinct from 'true'::jsonb
      )
      and ks.rights_scope -> 'model_training'
        is not distinct from 'false'::jsonb
      and exists (
        select 1
        from public.knowledge_chunks kc
        where kc.revision_id = kr.id
          and kc.source_id = ks.id
          and kc.expert_id = p_expert_id
          and kc.embedding is not null
      )
  );
$$;

create or replace function public.is_chat_evidence_reference_authorized(
  p_expert_id uuid,
  p_reference jsonb
)
returns boolean
language plpgsql
security definer
stable
set search_path = pg_catalog, public
as $$
declare
  revision_text text;
  chunk_text text;
  target_revision_id uuid;
  target_chunk_id uuid;
  origin text;
begin
  if p_reference is null
     or jsonb_typeof(p_reference) is distinct from 'object' then
    return false;
  end if;
  origin := p_reference ->> 'lineage_origin';
  revision_text := p_reference ->> 'revision_id';
  if revision_text is null or revision_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;
  target_revision_id := revision_text::uuid;

  if origin = 'history' then
    if p_reference - array['lineage_origin', 'revision_id']::text[] <> '{}'::jsonb then
      return false;
    end if;
    return public.is_chat_revision_currently_authorized(
      p_expert_id, target_revision_id, false
    );
  end if;

  if origin is distinct from 'current'
     or p_reference - array[
       'chunk_id', 'lineage_origin', 'revision_id', 'similarity'
     ]::text[] <> '{}'::jsonb
     or jsonb_typeof(p_reference -> 'similarity') is distinct from 'number' then
    return false;
  end if;
  chunk_text := p_reference ->> 'chunk_id';
  if chunk_text is null or chunk_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;
  if (p_reference ->> 'similarity')::double precision < 0
     or (p_reference ->> 'similarity')::double precision > 1 then
    return false;
  end if;
  target_chunk_id := chunk_text::uuid;

  return public.is_chat_revision_currently_authorized(
    p_expert_id, target_revision_id, false
  ) and exists (
    select 1
    from public.knowledge_chunks kc
    join public.knowledge_revisions kr
      on kr.id = kc.revision_id and kr.source_id = kc.source_id
    join public.knowledge_sources ks
      on ks.id = kr.source_id and ks.expert_id = kc.expert_id
    where kc.id = target_chunk_id
      and kc.revision_id = target_revision_id
      and kc.expert_id = p_expert_id
      and kc.embedding is not null
  );
end;
$$;

create or replace function public.is_chat_evidence_snapshot_authorized(
  p_expert_id uuid,
  p_retrieval jsonb
)
returns boolean
language plpgsql
security definer
stable
set search_path = pg_catalog, public
as $$
declare
  reference jsonb;
  reference_count integer;
  distinct_reference_count integer;
begin
  if p_retrieval is null
     or jsonb_typeof(p_retrieval) is distinct from 'array'
     or jsonb_array_length(p_retrieval) > 256 then
    return false;
  end if;
  select count(*), count(distinct item.value::text)
  into reference_count, distinct_reference_count
  from jsonb_array_elements(p_retrieval) item(value);
  if reference_count <> distinct_reference_count then
    return false;
  end if;
  for reference in
    select item.value from jsonb_array_elements(p_retrieval) item(value)
  loop
    if not public.is_chat_evidence_reference_authorized(
      p_expert_id, reference
    ) then
      return false;
    end if;
  end loop;
  return true;
end;
$$;

create or replace function public.is_current_chat_persona_version_authorized(
  p_expert_id uuid,
  p_persona_version_id uuid
)
returns boolean
language sql
security definer
stable
set search_path = pg_catalog, public
as $$
  select coalesce((
    select
      e.published_persona_version_id = epv.id
      and epv.status = 'published'
      and cardinality(epv.source_revision_ids) > 0
      and public.is_expert_chat_ready(e.id)
      and public.has_current_passed_persona_evaluation(e.id, epv.id)
      and not exists (
        select 1
        from unnest(epv.source_revision_ids) source_revision_id
        where not public.is_chat_revision_currently_authorized(
          e.id, source_revision_id, true
        )
      )
    from public.experts e
    join public.expert_persona_versions epv
      on epv.id = p_persona_version_id
     and epv.expert_id = e.id
    where e.id = p_expert_id
  ), false);
$$;

-- Stored answers are safe only while their exact persona remains the current,
-- evaluated release and every citation/retrieval reference remains eligible.
create or replace function public.is_chat_message_retrieval_authorized(
  p_message_id uuid,
  p_expert_id uuid
)
returns boolean
language sql
security definer
stable
set search_path = pg_catalog, public
as $$
  select coalesce((
    select
      m.role = 'assistant'
      and m.server_generated
      and m.answer_basis in ('knowledge', 'general')
      and m.persona_version_id is not null
      and public.is_current_chat_persona_version_authorized(
        p_expert_id, m.persona_version_id
      )
      and m.provider_usage ->> 'rights_lineage_complete' = 'true'
      and jsonb_typeof(coalesce(m.citations, '[]'::jsonb)) = 'array'
      and jsonb_typeof(m.retrieval) = 'array'
      and (
        m.answer_basis = 'general'
        or jsonb_array_length(coalesce(m.citations, '[]'::jsonb))
          + jsonb_array_length(m.retrieval) > 0
      )
      and not exists (
        select 1
        from jsonb_array_elements(coalesce(m.citations, '[]'::jsonb))
          citation(value)
        where jsonb_typeof(citation.value) <> 'object'
          or coalesce(citation.value ->> 'revision_id', '')
            !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          or not public.is_chat_revision_currently_authorized(
            p_expert_id,
            (citation.value ->> 'revision_id')::uuid,
            false
          )
      )
      and not exists (
        select 1
        from jsonb_array_elements(m.retrieval) retrieval(value)
        where not public.is_chat_evidence_reference_authorized(
          p_expert_id, retrieval.value
        )
      )
    from public.messages m
    join public.conversations c
      on c.id = m.conversation_id
     and c.expert_id = p_expert_id
    where m.id = p_message_id
  ), false);
$$;

-- Lock every relation that contributes to readiness and evidence eligibility.
-- These locks are held by the finaliser until persist_chat_round completes, so
-- a concurrent revoke/unpublish cannot commit between validation and storage.
create or replace function public.lock_current_chat_authorization_state(
  p_expert_id uuid,
  p_persona_version_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  -- Active-question inserts change the evaluation-set hash but have no row to
  -- lock yet. SHARE blocks the editor's ROW EXCLUSIVE write until this short
  -- authorization transaction commits, closing that phantom-insert window.
  lock table public.persona_evaluation_questions in share mode;
  -- Publication locks its synthesis job before the expert row. Match that
  -- order so publication and chat finalization cannot deadlock each other.
  perform 1 from public.persona_synthesis_jobs psj
  where psj.expert_id = p_expert_id
  order by psj.id
  for share;
  perform 1 from public.experts e
  where e.id = p_expert_id for share;
  if not found then return false; end if;
  perform 1 from public.account_access aa
  where aa.expert_id = p_expert_id for share;
  perform 1 from public.expert_persona_versions epv
  where epv.id = p_persona_version_id
    and epv.expert_id = p_expert_id
  for share;
  if not found then return false; end if;
  perform 1
  from public.persona_evaluation_runs per
  join public.persona_synthesis_jobs psj on psj.id = per.synthesis_job_id
  where psj.expert_id = p_expert_id
  for share of per, psj;
  perform 1 from public.persona_evaluation_questions peq
  where peq.expert_id = p_expert_id and peq.active for share;
  perform 1 from public.knowledge_sources ks
  where ks.expert_id = p_expert_id for share;
  perform 1
  from public.knowledge_revisions kr
  join public.knowledge_sources ks on ks.id = kr.source_id
  where ks.expert_id = p_expert_id
  for share of kr, ks;
  perform 1 from public.knowledge_chunks kc
  where kc.expert_id = p_expert_id for share;

  return public.is_current_chat_persona_version_authorized(
    p_expert_id, p_persona_version_id
  );
end;
$$;

create or replace function public.bind_chat_request_evidence(
  p_owner_id uuid,
  p_request_id uuid,
  p_conversation_id uuid,
  p_expert_id uuid,
  p_persona_version_id uuid,
  p_retrieval jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  reservation_row public.chat_request_reservations%rowtype;
  expected_history text[];
  supplied_history text[];
begin
  perform pg_advisory_xact_lock(hashtextextended(
    'aigro:chat-conversation:' || p_conversation_id::text, 0
  ));
  perform 1 from public.conversations c
  where c.id = p_conversation_id
    and c.owner_id = p_owner_id
    and c.expert_id = p_expert_id
  for update;
  if not found then
    return jsonb_build_object('state', 'unavailable');
  end if;

  select r.* into reservation_row
  from public.chat_request_reservations r
  where r.user_id = p_owner_id
    and r.request_id = p_request_id
    and r.conversation_id = p_conversation_id
    and r.expert_id = p_expert_id
  for update;
  if not found
     or reservation_row.status <> 'processing'
     or reservation_row.locked_until <= now()
     or reservation_row.persona_version_id is distinct from p_persona_version_id then
    return jsonb_build_object('state', 'unavailable');
  end if;

  -- Keep lock acquisition and evidence evaluation in separate PL/pgSQL
  -- statements. SQL boolean subexpression order is not a locking guarantee.
  if public.lock_current_chat_authorization_state(
       p_expert_id, p_persona_version_id
     ) is not true then
    update public.chat_request_reservations
    set status = 'failed', locked_until = now(),
        error_code = 'authorization_changed', updated_at = now()
    where id = reservation_row.id;
    return jsonb_build_object('state', 'authorization_changed');
  end if;
  if public.is_chat_evidence_snapshot_authorized(
       p_expert_id, p_retrieval
     ) is not true then
    update public.chat_request_reservations
    set status = 'failed', locked_until = now(),
        error_code = 'authorization_changed', updated_at = now()
    where id = reservation_row.id;
    return jsonb_build_object('state', 'authorization_changed');
  end if;

  select coalesce(array_agg(distinct revision_id order by revision_id), '{}'::text[])
  into expected_history
  from (
    select history_revision.revision_id
    from public.get_rights_safe_chat_history(
      p_owner_id, p_conversation_id, p_expert_id, 8
    ) history_turn
    cross join lateral unnest(coalesce(history_turn.revision_ids, '{}'::text[]))
      history_revision(revision_id)
    where not exists (
      select 1
      from jsonb_array_elements(p_retrieval) current_reference(value)
      where current_reference.value ->> 'lineage_origin' = 'current'
        and current_reference.value ->> 'revision_id'
          = history_revision.revision_id
    )
  ) current_history;

  select coalesce(array_agg(distinct reference.value ->> 'revision_id'
    order by reference.value ->> 'revision_id'), '{}'::text[])
  into supplied_history
  from jsonb_array_elements(p_retrieval) reference(value)
  where reference.value ->> 'lineage_origin' = 'history';

  if supplied_history is distinct from expected_history then
    update public.chat_request_reservations
    set status = 'failed', locked_until = now(),
        error_code = 'history_lineage_changed', updated_at = now()
    where id = reservation_row.id;
    return jsonb_build_object('state', 'authorization_changed');
  end if;

  update public.chat_request_reservations
  set evidence_snapshot = p_retrieval,
      evidence_bound_at = now(),
      updated_at = now()
  where id = reservation_row.id;
  return jsonb_build_object('state', 'bound');
end;
$$;

create or replace function public.finalize_authorized_chat_round(
  p_owner_id uuid,
  p_conversation_id uuid,
  p_expert_id uuid,
  p_persona text,
  p_request_id uuid,
  p_question text,
  p_answer text,
  p_answer_basis text,
  p_coverage text,
  p_citations jsonb,
  p_persona_version_id uuid,
  p_retrieval jsonb,
  p_provider_usage jsonb default '{}'::jsonb,
  p_model text default null,
  p_latency_ms integer default null,
  p_provider_request_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  reservation_row public.chat_request_reservations%rowtype;
  assistant_id uuid;
  persisted_answer public.messages%rowtype;
  authorization_valid boolean := true;
  citation_count integer := 0;
  current_reference_count integer := 0;
begin
  perform pg_advisory_xact_lock(hashtextextended(
    'aigro:chat-conversation:' || p_conversation_id::text, 0
  ));
  perform 1 from public.conversations c
  join public.experts e on e.id = c.expert_id
  where c.id = p_conversation_id
    and c.owner_id = p_owner_id
    and c.expert_id = p_expert_id
    and c.persona = p_persona
    and e.slug = p_persona
  for update of c;
  if not found then
    return jsonb_build_object('state', 'unavailable');
  end if;

  select r.* into reservation_row
  from public.chat_request_reservations r
  where r.user_id = p_owner_id
    and r.request_id = p_request_id
    and r.conversation_id = p_conversation_id
    and r.expert_id = p_expert_id
  for update;
  if not found
     or reservation_row.status <> 'processing'
     or reservation_row.locked_until <= now()
     or reservation_row.persona_version_id is distinct from p_persona_version_id
     or reservation_row.evidence_bound_at is null
     or reservation_row.evidence_snapshot is distinct from p_retrieval
     or reservation_row.message_hash is distinct from encode(
       extensions.digest(convert_to(p_question, 'UTF8'), 'sha256'), 'hex'
     ) then
    return jsonb_build_object('state', 'unavailable');
  end if;

  authorization_valid := coalesce((
    char_length(btrim(coalesce(p_question, ''))) between 1 and 800
    and char_length(btrim(coalesce(p_answer, ''))) > 0
    and octet_length(p_answer) <= 49152
    and p_answer_basis in ('knowledge', 'general')
    and p_coverage in ('high', 'medium', 'none')
    and jsonb_typeof(p_citations) = 'array'
    and jsonb_array_length(p_citations) <= 12
    and jsonb_typeof(p_provider_usage) = 'object'
    and p_provider_usage -> 'rights_lineage_complete'
      is not distinct from 'true'::jsonb
  ), false);

  -- The lock statement must complete before either evidence predicate runs.
  if authorization_valid is true then
    authorization_valid := public.lock_current_chat_authorization_state(
      p_expert_id, p_persona_version_id
    ) is true;
  end if;
  if authorization_valid is true then
    authorization_valid := public.is_chat_evidence_snapshot_authorized(
      p_expert_id, p_retrieval
    ) is true;
  end if;

  if authorization_valid is true then
    citation_count := jsonb_array_length(p_citations);
    select count(*) into current_reference_count
    from jsonb_array_elements(p_retrieval) reference(value)
    where reference.value ->> 'lineage_origin' = 'current';

    authorization_valid := (
      (p_answer_basis = 'knowledge'
        and p_coverage in ('high', 'medium')
        and citation_count > 0
        and current_reference_count > 0)
      or
      (p_answer_basis = 'general'
        and p_coverage = 'none'
        and citation_count = 0)
    ) and not exists (
      select 1
      from jsonb_array_elements(p_citations) citation(value)
      where jsonb_typeof(citation.value) <> 'object'
        or coalesce(citation.value ->> 'marker', '') !~ '^S[1-9][0-9]*$'
        or coalesce(citation.value ->> 'revision_id', '')
          !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        or not exists (
          select 1
          from jsonb_array_elements(p_retrieval) reference(value)
          where reference.value ->> 'lineage_origin' = 'current'
            and reference.value ->> 'revision_id'
              = citation.value ->> 'revision_id'
        )
    ) and citation_count = (
      select count(distinct citation.value ->> 'marker')
      from jsonb_array_elements(p_citations) citation(value)
    );
  end if;

  if authorization_valid is not true then
    update public.chat_request_reservations
    set status = 'failed', locked_until = now(),
        error_code = 'authorization_changed', updated_at = now()
    where id = reservation_row.id;
    return jsonb_build_object('state', 'authorization_changed');
  end if;

  assistant_id := public.persist_chat_round(
    p_owner_id, p_conversation_id, p_expert_id, p_persona,
    p_request_id::text, p_question, p_answer, p_answer_basis, p_coverage,
    p_citations, p_persona_version_id, p_retrieval, p_provider_usage,
    p_model, p_latency_ms, p_provider_request_id
  );

  -- The citation privacy trigger runs inside persist_chat_round. Read back the
  -- inserted row in this same transaction and return only that authoritative,
  -- trigger-sanitized payload; the Edge worker must not release its pre-commit
  -- citation URLs after a concurrent citation review change.
  select m.* into persisted_answer
  from public.messages m
  where m.id = assistant_id
    and m.conversation_id = p_conversation_id
    and m.request_id = p_request_id::text
    and m.role = 'assistant'
    and m.server_generated;
  if not found then
    raise exception 'persisted_chat_answer_missing' using errcode = 'P0002';
  end if;
  return jsonb_build_object(
    'state', 'committed',
    'message_id', persisted_answer.id,
    'answer', persisted_answer.content,
    'citations', coalesce(persisted_answer.citations, '[]'::jsonb),
    'answer_basis', persisted_answer.answer_basis,
    'coverage', persisted_answer.coverage
  );
end;
$$;

-- Browser dashboards receive only paired turns whose assistant answer passes
-- current persona + evidence validation. Content from revoked/retired rounds is
-- omitted rather than exposed through PostgREST table reads.
create or replace function public.get_rights_safe_engagement(
  p_expert_id uuid default null
)
returns jsonb
language plpgsql
security definer
stable
set search_path = pg_catalog, public
as $$
declare
  caller_id uuid := auth.uid();
  conversation_payload jsonb;
  message_payload jsonb;
begin
  if caller_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  if p_expert_id is null then
    if not public.is_admin() then
      raise exception 'not_allowed' using errcode = '42501';
    end if;
  elsif not public.is_admin() and not public.owns_expert(p_expert_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  with selected_conversations as materialized (
    select c.id, c.user_id, c.anon_id, c.persona, c.expert_id,
      c.title, c.created_at
    from public.conversations c
    where p_expert_id is null or c.expert_id = p_expert_id
    order by c.created_at desc
    limit 500
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id,
    'user_id', c.user_id,
    'anon_id', c.anon_id,
    'persona', c.persona,
    'expert_id', c.expert_id,
    'title', c.title,
    'created_at', c.created_at
  ) order by c.created_at desc), '[]'::jsonb)
  into conversation_payload
  from selected_conversations c;

  with selected_conversations as materialized (
    select c.id, c.expert_id
    from public.conversations c
    where p_expert_id is null or c.expert_id = p_expert_id
    order by c.created_at desc
    limit 500
  ), authorized_assistants as materialized (
    select assistant.id, assistant.conversation_id, assistant.request_id
    from public.messages assistant
    join selected_conversations c on c.id = assistant.conversation_id
    where assistant.role = 'assistant'
      and assistant.server_generated
      and public.is_chat_message_retrieval_authorized(
        assistant.id, c.expert_id
      )
  ), paired_messages as materialized (
    select m.*
    from public.messages m
    join authorized_assistants assistant
      on assistant.conversation_id = m.conversation_id
     and assistant.request_id = m.request_id
    where m.server_generated and m.role in ('user', 'assistant')
    order by m.created_at desc
    limit 2000
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', m.id,
    'conversation_id', m.conversation_id,
    'role', m.role,
    'content', m.content,
    'source', m.source,
    'answer_basis', m.answer_basis,
    'coverage', m.coverage,
    'created_at', m.created_at
  ) order by m.created_at asc), '[]'::jsonb)
  into message_payload
  from paired_messages m;

  return jsonb_build_object(
    'conversations', conversation_payload,
    'messages', message_payload
  );
end;
$$;

revoke all on function public.is_chat_revision_currently_authorized(uuid, uuid, boolean)
from public, anon, authenticated;
revoke all on function public.is_chat_evidence_reference_authorized(uuid, jsonb)
from public, anon, authenticated;
revoke all on function public.is_chat_evidence_snapshot_authorized(uuid, jsonb)
from public, anon, authenticated;
revoke all on function public.is_current_chat_persona_version_authorized(uuid, uuid)
from public, anon, authenticated;
revoke all on function public.is_chat_message_retrieval_authorized(uuid, uuid)
from public, anon, authenticated;
revoke all on function public.lock_current_chat_authorization_state(uuid, uuid)
from public, anon, authenticated;
revoke all on function public.bind_chat_request_evidence(uuid, uuid, uuid, uuid, uuid, jsonb)
from public, anon, authenticated;
revoke all on function public.finalize_authorized_chat_round(
  uuid, uuid, uuid, text, uuid, text, text, text, text, jsonb, uuid,
  jsonb, jsonb, text, integer, text
) from public, anon, authenticated;
revoke all on function public.get_rights_safe_engagement(uuid)
from public, anon, authenticated;

grant execute on function public.bind_chat_request_evidence(
  uuid, uuid, uuid, uuid, uuid, jsonb
) to service_role;
grant execute on function public.finalize_authorized_chat_round(
  uuid, uuid, uuid, text, uuid, text, text, text, text, jsonb, uuid,
  jsonb, jsonb, text, integer, text
) to service_role;
grant execute on function public.get_rights_safe_engagement(uuid)
to authenticated;

-- The finaliser is now the only service-role persistence entry point.
revoke all on function public.persist_chat_round(
  uuid, uuid, uuid, text, text, text, text, text, text, jsonb, uuid,
  jsonb, jsonb, text, integer, text
) from public, anon, authenticated, service_role;

-- Direct message reads bypass current-rights revalidation, including old
-- signed citation metadata. All browser transcript access must use the safe RPC.
revoke select on table public.messages from public, anon, authenticated;
drop policy if exists msg_owner_all on public.messages;
drop policy if exists messages_owner_all_v5 on public.messages;
drop policy if exists messages_owner_read on public.messages;
drop policy if exists messages_expert_read_own on public.messages;
drop policy if exists msg_admin_read on public.messages;
