-- Revalidate stored chat evidence against current publication and commercial
-- RAG rights before replaying it or sending old turns back to a model.

create or replace function public.chat_message_revision_lineage(
  p_message_id uuid
)
returns text[]
language sql
security definer
stable
set search_path = pg_catalog, public
as $$
  select coalesce(array_agg(distinct revision_id order by revision_id), '{}'::text[])
  from (
    select nullif(citation.value ->> 'revision_id', '') as revision_id
    from public.messages m
    cross join lateral jsonb_array_elements(
      case
        when jsonb_typeof(coalesce(m.citations, '[]'::jsonb)) = 'array'
          then coalesce(m.citations, '[]'::jsonb)
        else '[]'::jsonb
      end
    ) as citation(value)
    where m.id = p_message_id
    union all
    select nullif(retrieval.value ->> 'revision_id', '') as revision_id
    from public.messages m
    cross join lateral jsonb_array_elements(
      case
        when jsonb_typeof(m.retrieval) = 'array' then m.retrieval
        else '[]'::jsonb
      end
    ) as retrieval(value)
    where m.id = p_message_id
  ) stored_revision
  where revision_id is not null;
$$;

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
      -- Pre-migration rows did not record transitive history provenance. They
      -- are intentionally excluded rather than guessed safe.
      and m.provider_usage ->> 'rights_lineage_complete' = 'true'
      and jsonb_typeof(coalesce(m.citations, '[]'::jsonb)) = 'array'
      and jsonb_typeof(m.retrieval) = 'array'
      and (
        m.answer_basis = 'general'
        or jsonb_array_length(
          case
            when jsonb_typeof(coalesce(m.citations, '[]'::jsonb)) = 'array'
              then coalesce(m.citations, '[]'::jsonb)
            else '[]'::jsonb
          end
        ) + jsonb_array_length(
          case
            when jsonb_typeof(m.retrieval) = 'array' then m.retrieval
            else '[]'::jsonb
          end
        ) > 0
      )
      and not exists (
        select 1
        from (
          select citation.value as reference
          from jsonb_array_elements(
            case
              when jsonb_typeof(coalesce(m.citations, '[]'::jsonb)) = 'array'
                then coalesce(m.citations, '[]'::jsonb)
              else '[]'::jsonb
            end
          ) as citation(value)
          union all
          select retrieval.value as reference
          from jsonb_array_elements(
            case
              when jsonb_typeof(m.retrieval) = 'array' then m.retrieval
              else '[]'::jsonb
            end
          ) as retrieval(value)
        ) stored_reference
        where jsonb_typeof(stored_reference.reference) <> 'object'
          or nullif(stored_reference.reference ->> 'revision_id', '') is null
          or not exists (
            select 1
            from public.knowledge_revisions kr
            join public.knowledge_sources ks
              on ks.id = kr.source_id
             and ks.expert_id = p_expert_id
            where kr.id::text = stored_reference.reference ->> 'revision_id'
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
              and exists (
                select 1
                from public.knowledge_chunks kc
                where kc.revision_id = kr.id
                  and kc.source_id = ks.id
                  and kc.expert_id = p_expert_id
                  and kc.embedding is not null
              )
          )
      )
    from public.messages m
    join public.conversations c
      on c.id = m.conversation_id
     and c.expert_id = p_expert_id
    where m.id = p_message_id
  ), false);
$$;

create or replace function public.get_rights_safe_chat_replay(
  p_owner_id uuid,
  p_conversation_id uuid,
  p_expert_id uuid,
  p_request_id text,
  p_expected_question text
)
returns jsonb
language plpgsql
security definer
stable
set search_path = pg_catalog, public
as $$
declare
  question_row record;
  answer_row record;
begin
  if not exists (
    select 1
    from public.conversations c
    where c.id = p_conversation_id
      and c.owner_id = p_owner_id
      and c.expert_id = p_expert_id
  ) then
    return jsonb_build_object('state', 'missing');
  end if;

  select m.id, m.content
  into question_row
  from public.messages m
  where m.conversation_id = p_conversation_id
    and m.request_id = p_request_id
    and m.role = 'user'
    and m.server_generated;

  select m.id, m.content, m.citations, m.answer_basis, m.coverage
  into answer_row
  from public.messages m
  where m.conversation_id = p_conversation_id
    and m.request_id = p_request_id
    and m.role = 'assistant'
    and m.server_generated;

  if not found then
    return jsonb_build_object('state', 'missing');
  end if;
  if question_row.id is null then
    return jsonb_build_object('state', 'sources_unavailable');
  end if;
  if question_row.content is distinct from p_expected_question then
    return jsonb_build_object('state', 'payload_mismatch');
  end if;
  if not public.is_chat_message_retrieval_authorized(answer_row.id, p_expert_id) then
    return jsonb_build_object('state', 'sources_unavailable');
  end if;

  return jsonb_build_object(
    'state', 'ready',
    'answer', jsonb_build_object(
      'id', answer_row.id,
      'content', answer_row.content,
      'citations', coalesce(answer_row.citations, '[]'::jsonb),
      'answer_basis', answer_row.answer_basis,
      'coverage', answer_row.coverage
    )
  );
end;
$$;

create or replace function public.get_rights_safe_chat_history(
  p_owner_id uuid,
  p_conversation_id uuid,
  p_expert_id uuid,
  p_message_limit integer default 8
)
returns table (
  role text,
  content text,
  turn_sequence bigint,
  revision_ids text[]
)
language plpgsql
security definer
stable
set search_path = pg_catalog, public
as $$
declare
  pair_limit integer := least(greatest(coalesce(p_message_limit, 8) / 2, 0), 10);
begin
  if pair_limit = 0 or not exists (
    select 1
    from public.conversations c
    where c.id = p_conversation_id
      and c.owner_id = p_owner_id
      and c.expert_id = p_expert_id
  ) then
    return;
  end if;

  return query
  with authorized_rounds as materialized (
    select
      user_message.id as user_message_id,
      assistant_message.id as assistant_message_id,
      assistant_message.turn_sequence as round_sequence,
      public.chat_message_revision_lineage(assistant_message.id) as revision_ids
    from public.messages assistant_message
    join public.messages user_message
      on user_message.conversation_id = assistant_message.conversation_id
     and user_message.request_id = assistant_message.request_id
     and user_message.role = 'user'
     and user_message.server_generated
    where assistant_message.conversation_id = p_conversation_id
      and assistant_message.role = 'assistant'
      and assistant_message.server_generated
      and assistant_message.request_id is not null
      and public.is_chat_message_retrieval_authorized(
        assistant_message.id,
        p_expert_id
      )
    order by assistant_message.turn_sequence desc
    limit pair_limit
  ), authorized_messages as (
    select
      authorized_rounds.user_message_id as message_id,
      authorized_rounds.revision_ids
    from authorized_rounds
    union all
    select
      authorized_rounds.assistant_message_id as message_id,
      authorized_rounds.revision_ids
    from authorized_rounds
  )
  select m.role::text, m.content, m.turn_sequence, authorized.revision_ids
  from public.messages m
  join authorized_messages authorized on authorized.message_id = m.id
  order by m.turn_sequence desc;
end;
$$;

revoke all on function public.chat_message_revision_lineage(uuid)
from public, anon, authenticated;
revoke all on function public.is_chat_message_retrieval_authorized(uuid, uuid)
from public, anon, authenticated;
revoke all on function public.get_rights_safe_chat_replay(uuid, uuid, uuid, text, text)
from public, anon, authenticated;
revoke all on function public.get_rights_safe_chat_history(uuid, uuid, uuid, integer)
from public, anon, authenticated;

grant execute on function public.chat_message_revision_lineage(uuid)
to service_role;
grant execute on function public.is_chat_message_retrieval_authorized(uuid, uuid)
to service_role;
grant execute on function public.get_rights_safe_chat_replay(uuid, uuid, uuid, text, text)
to service_role;
grant execute on function public.get_rights_safe_chat_history(uuid, uuid, uuid, integer)
to service_role;
