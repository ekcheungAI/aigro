-- Public chat citations must never reuse ingestion, storage, provider-signed,
-- or original-file URLs.  A separate owner-reviewed URL is the only clickable
-- destination; private sources retain their revision/section/page/time
-- locators without becoming public links.

alter table public.knowledge_sources
  add column if not exists public_citation_url text,
  add column if not exists public_citation_reviewed_by uuid
    references auth.users(id) on delete restrict,
  add column if not exists public_citation_reviewed_at timestamptz,
  add column if not exists public_citation_review_note text;

create index if not exists knowledge_sources_public_citation_reviewer_idx
  on public.knowledge_sources(public_citation_reviewed_by)
  where public_citation_reviewed_by is not null;

create or replace function public.normalize_public_citation_url(p_url text)
returns text
language plpgsql
immutable
security definer
set search_path = pg_catalog, public
as $$
declare
  normalized text := nullif(btrim(coalesce(p_url, '')), '');
  public_location text;
begin
  if normalized is null then
    return null;
  end if;
  if char_length(normalized) > 2048
     or normalized ~ '[[:space:][:cntrl:]]'
     or strpos(normalized, E'\\') > 0
     or normalized !~ '^https://'
     or normalized ~ '^https://[^/]*@'
     or not public.is_safe_knowledge_source_url(normalized, false) then
    raise exception 'unsafe_public_citation_url' using errcode = '22023';
  end if;

  -- A citation locator already has typed page/section/timestamp fields.  Drop
  -- every query and fragment so signed tokens, API keys and OAuth fragments
  -- cannot be copied into a browser-visible href.
  public_location := regexp_replace(normalized, '[?#].*$', '');
  if public_location = ''
     or not public.is_safe_knowledge_source_url(public_location, false) then
    raise exception 'unsafe_public_citation_url' using errcode = '22023';
  end if;
  return public_location;
end;
$$;

revoke all on function public.normalize_public_citation_url(text)
from public, anon, authenticated;
grant execute on function public.normalize_public_citation_url(text)
to service_role;

alter table public.knowledge_sources
  drop constraint if exists knowledge_sources_public_citation_reviewed_check;
alter table public.knowledge_sources
  add constraint knowledge_sources_public_citation_reviewed_check
  check (
    (
      public_citation_url is null
      and public_citation_reviewed_by is null
      and public_citation_reviewed_at is null
      and public_citation_review_note is null
    )
    or (
      public_citation_url is not null
      and public_citation_url = public.normalize_public_citation_url(public_citation_url)
      and public_citation_reviewed_by is not null
      and public_citation_reviewed_at is not null
      and char_length(btrim(coalesce(public_citation_review_note, ''))) >= 5
    )
  );

comment on column public.knowledge_sources.source_url is
  'Private server-side ingestion/fetch URL. Never use as a public chat citation.';
comment on column public.knowledge_sources.public_citation_url is
  'Explicit human-reviewed public HTTPS citation location; query and fragment removed.';

create or replace function public.set_knowledge_source_public_citation(
  p_source_id uuid,
  p_public_citation_url text,
  p_review_note text
)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  source_row public.knowledge_sources%rowtype;
  normalized_url text;
  normalized_note text := btrim(coalesce(p_review_note, ''));
  action_name text;
begin
  if auth.uid() is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  select * into source_row
  from public.knowledge_sources
  where id = p_source_id
  for update;
  if not found then
    raise exception 'knowledge_source_not_found' using errcode = 'P0002';
  end if;
  if not public.owns_expert(source_row.expert_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if char_length(normalized_note) < 5 then
    raise exception 'public_citation_review_note_required' using errcode = '22023';
  end if;

  normalized_url := public.normalize_public_citation_url(p_public_citation_url);
  action_name := case when normalized_url is null
    then 'knowledge.public_citation_cleared'
    else 'knowledge.public_citation_reviewed'
  end;

  update public.knowledge_sources
  set public_citation_url = normalized_url,
      public_citation_reviewed_by = case when normalized_url is null then null else auth.uid() end,
      public_citation_reviewed_at = case when normalized_url is null then null else now() end,
      public_citation_review_note = case when normalized_url is null then null else left(normalized_note, 1000) end,
      updated_at = now()
  where id = p_source_id;

  insert into public.audit_events (
    actor_id, expert_id, action, entity_type, entity_id, metadata
  ) values (
    auth.uid(), source_row.expert_id, action_name, 'knowledge_source', p_source_id,
    jsonb_build_object(
      'public_citation_url', normalized_url,
      'review_note', left(normalized_note, 1000)
    )
  );

  return normalized_url;
end;
$$;

revoke all on function public.set_knowledge_source_public_citation(uuid, text, text)
from public, anon, authenticated;
grant execute on function public.set_knowledge_source_public_citation(uuid, text, text)
to authenticated;

-- Change the provider retrieval contract itself so an Edge Function cannot
-- accidentally confuse private source locations with public citations.
drop function if exists public.match_expert_knowledge(
  uuid, extensions.halfvec, integer, double precision
);

create function public.match_expert_knowledge(
  p_expert_id uuid,
  p_query_embedding extensions.halfvec(1536),
  p_match_count integer default 6,
  p_similarity_threshold double precision default 0.70
)
returns table (
  chunk_id uuid,
  revision_id uuid,
  source_id uuid,
  source_title text,
  public_citation_url text,
  content text,
  citation_meta jsonb,
  similarity double precision
)
language sql
security definer
stable
set search_path = pg_catalog, public, extensions
as $$
  select
    kc.id,
    kc.revision_id,
    ks.id,
    ks.title,
    case
      when ks.public_citation_reviewed_by is not null
       and ks.public_citation_reviewed_at is not null
       and char_length(btrim(coalesce(ks.public_citation_review_note, ''))) >= 5
      then ks.public_citation_url
      else null
    end,
    kc.content,
    kc.citation_meta,
    1 - (kc.embedding <=> p_query_embedding)
  from public.knowledge_chunks kc
  join public.knowledge_revisions kr
    on kr.id = kc.revision_id and kr.source_id = kc.source_id
  join public.knowledge_sources ks
    on ks.id = kr.source_id and ks.expert_id = kc.expert_id
  where kc.expert_id = p_expert_id
    and ks.expert_id = p_expert_id
    and ks.archived_at is null
    and ks.published_revision_id = kr.id
    and kr.status = 'approved'
    and kr.approved_by is not null
    and kr.approved_at is not null
    and ks.rights_status = 'granted'
    and ks.revoked_at is null
    and (ks.expires_at is null or ks.expires_at > now())
    and ks.rights_scope -> 'commercial_rag' is not distinct from 'true'::jsonb
    and kc.embedding is not null
    and 1 - (kc.embedding <=> p_query_embedding) >= p_similarity_threshold
  order by kc.embedding <=> p_query_embedding
  limit least(greatest(p_match_count, 1), 12);
$$;

revoke all on function public.match_expert_knowledge(
  uuid, extensions.halfvec, integer, double precision
) from public, anon, authenticated;
grant execute on function public.match_expert_knowledge(
  uuid, extensions.halfvec, integer, double precision
) to service_role;

-- Owner/admin review inventory shows the private origin separately from the
-- explicitly reviewed public location.  This RPC remains owner-scoped.
drop function if exists public.get_expert_reference_files(uuid);

create function public.get_expert_reference_files(p_expert_id uuid)
returns table (
  source_id uuid,
  source_type text,
  title text,
  source_url text,
  public_citation_url text,
  public_citation_reviewed_by uuid,
  public_citation_reviewed_at timestamptz,
  public_citation_review_note text,
  public_citation_ready boolean,
  external_key text,
  source_updated_at timestamptz,
  archived_at timestamptz,
  rights_status text,
  rights_holder text,
  rights_evidence_ref text,
  rights_scope jsonb,
  rights_expires_at timestamptz,
  rights_revoked_at timestamptz,
  rights_valid boolean,
  revision_id uuid,
  revision_no integer,
  revision_status text,
  revision_created_at timestamptz,
  storage_path text,
  source_commit_sha text,
  source_file_path text,
  source_blob_url text,
  content_hash text,
  distilled boolean,
  human_reviewed boolean,
  chunk_count bigint,
  embedded_chunk_count bigint,
  job_stage text,
  job_status text,
  job_attempts integer,
  job_error text,
  is_published boolean
)
language plpgsql
security definer
stable
set search_path = pg_catalog, public
as $$
begin
  if not public.owns_expert(p_expert_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  return query
  select
    ks.id,
    ks.source_type,
    ks.title,
    ks.source_url,
    ks.public_citation_url,
    ks.public_citation_reviewed_by,
    ks.public_citation_reviewed_at,
    ks.public_citation_review_note,
    (
      ks.public_citation_url is not null
      and ks.public_citation_reviewed_by is not null
      and ks.public_citation_reviewed_at is not null
      and char_length(btrim(coalesce(ks.public_citation_review_note, ''))) >= 5
    ),
    ks.external_key,
    ks.updated_at,
    ks.archived_at,
    ks.rights_status,
    ks.rights_holder,
    ks.rights_evidence_ref,
    ks.rights_scope,
    ks.expires_at,
    ks.revoked_at,
    (
      ks.rights_status = 'granted'
      and ks.revoked_at is null
      and (ks.expires_at is null or ks.expires_at > now())
      and ks.rights_scope @> '{"commercial_rag":true,"distillation":true,"persona_synthesis":true}'::jsonb
    ),
    kr.id,
    kr.revision_no,
    kr.status,
    kr.created_at,
    kr.storage_path,
    kr.source_commit_sha,
    kr.source_file_path,
    kr.source_blob_url,
    kr.content_hash,
    (kr.distilled_json is not null),
    (kr.approved_by is not null and kr.approved_at is not null),
    coalesce(kc.chunk_count, 0),
    coalesce(kc.embedded_chunk_count, 0),
    dj.stage,
    dj.status,
    dj.attempts,
    coalesce(dj.error_message, kr.error_message),
    (
      ks.published_revision_id = kr.id
      and kr.status = 'approved'
      and kr.approved_by is not null
      and kr.approved_at is not null
      and ks.archived_at is null
    )
  from public.knowledge_sources ks
  left join lateral (
    select candidate.*
    from public.knowledge_revisions candidate
    where candidate.source_id = ks.id
    order by candidate.revision_no desc, candidate.created_at desc
    limit 1
  ) kr on true
  left join lateral (
    select
      count(*)::bigint as chunk_count,
      count(*) filter (where chunk.embedding is not null)::bigint as embedded_chunk_count
    from public.knowledge_chunks chunk
    where chunk.revision_id = kr.id
      and chunk.expert_id = ks.expert_id
  ) kc on true
  left join public.distillation_jobs dj on dj.revision_id = kr.id
  where ks.expert_id = p_expert_id
  order by (ks.archived_at is not null), ks.updated_at desc, ks.title;
end;
$$;

revoke all on function public.get_expert_reference_files(uuid)
from public, anon, authenticated;
grant execute on function public.get_expert_reference_files(uuid) to authenticated;

-- Whitelist the public citation payload at the persistence boundary. Unknown
-- fields are discarded rather than trying to enumerate every possible secret
-- URL key a provider or old client might have stored.
create or replace function public.sanitize_public_chat_citations(
  p_citations jsonb,
  p_expert_id uuid
)
returns jsonb
language sql
security definer
stable
set search_path = pg_catalog, public
as $$
  select coalesce(jsonb_agg(
    jsonb_strip_nulls(jsonb_build_object(
      'marker', citation.value -> 'marker',
      'title', citation.value -> 'title',
      'href', coalesce((
        select case
          when ks.public_citation_reviewed_by is not null
           and ks.public_citation_reviewed_at is not null
           and char_length(btrim(coalesce(ks.public_citation_review_note, ''))) >= 5
          then ks.public_citation_url
          else null
        end
        from public.knowledge_revisions kr
        join public.knowledge_sources ks on ks.id = kr.source_id
        where kr.id::text = citation.value ->> 'revision_id'
          and ks.expert_id = p_expert_id
          and ks.published_revision_id = kr.id
          and kr.status = 'approved'
          and kr.approved_by is not null
          and kr.approved_at is not null
          and ks.archived_at is null
          and ks.rights_status = 'granted'
          and ks.revoked_at is null
          and (ks.expires_at is null or ks.expires_at > now())
          and ks.rights_scope -> 'commercial_rag' is not distinct from 'true'::jsonb
          and exists (
            select 1
            from public.knowledge_chunks kc
            where kc.revision_id = kr.id
              and kc.source_id = ks.id
              and kc.expert_id = p_expert_id
              and kc.embedding is not null
          )
        limit 1
      ), ''),
      'excerpt', citation.value -> 'excerpt',
      'revision_id', citation.value -> 'revision_id',
      'section', citation.value -> 'section',
      'page', citation.value -> 'page',
      'start_seconds', citation.value -> 'start_seconds',
      'end_seconds', citation.value -> 'end_seconds'
    )) order by citation.ordinality
  ), '[]'::jsonb)
  from jsonb_array_elements(
    case
      when jsonb_typeof(coalesce(p_citations, '[]'::jsonb)) = 'array'
        then coalesce(p_citations, '[]'::jsonb)
      else '[]'::jsonb
    end
  ) with ordinality as citation(value, ordinality)
  where jsonb_typeof(citation.value) = 'object'
    and nullif(citation.value ->> 'revision_id', '') is not null;
$$;

revoke all on function public.sanitize_public_chat_citations(jsonb, uuid)
from public, anon, authenticated;
grant execute on function public.sanitize_public_chat_citations(jsonb, uuid)
to service_role;

-- Remove secrets already stored by older versions before any browser can read
-- those message rows through its owner-scoped RLS policy.
update public.messages m
set citations = case
  when m.role = 'assistant' and m.answer_basis = 'knowledge'
    then public.sanitize_public_chat_citations(m.citations, c.expert_id)
  else '[]'::jsonb
end
from public.conversations c
where c.id = m.conversation_id
  and m.citations is distinct from case
    when m.role = 'assistant' and m.answer_basis = 'knowledge'
      then public.sanitize_public_chat_citations(m.citations, c.expert_id)
    else '[]'::jsonb
  end;

create or replace function public.enforce_public_chat_citation_privacy()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  target_expert_id uuid;
begin
  if new.role <> 'assistant' or new.answer_basis <> 'knowledge' then
    new.citations := '[]'::jsonb;
    return new;
  end if;

  select c.expert_id into target_expert_id
  from public.conversations c
  where c.id = new.conversation_id;
  if target_expert_id is null then
    new.citations := '[]'::jsonb;
    return new;
  end if;

  new.citations := public.sanitize_public_chat_citations(
    new.citations,
    target_expert_id
  );
  return new;
end;
$$;

revoke all on function public.enforce_public_chat_citation_privacy()
from public, anon, authenticated;
drop trigger if exists messages_public_citation_privacy on public.messages;
create trigger messages_public_citation_privacy
before insert or update of citations, answer_basis, role, conversation_id
on public.messages
for each row execute function public.enforce_public_chat_citation_privacy();

-- Rebuild replay hrefs from the current reviewed source row. Old stored hrefs
-- are never trusted, even after the one-time cleanup above.
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
  safe_citations jsonb := '[]'::jsonb;
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

  if answer_row.answer_basis = 'knowledge' then
    safe_citations := public.sanitize_public_chat_citations(
      answer_row.citations,
      p_expert_id
    );
  end if;

  return jsonb_build_object(
    'state', 'ready',
    'answer', jsonb_build_object(
      'id', answer_row.id,
      'content', answer_row.content,
      'citations', safe_citations,
      'answer_basis', answer_row.answer_basis,
      'coverage', answer_row.coverage
    )
  );
end;
$$;

revoke all on function public.get_rights_safe_chat_replay(uuid, uuid, uuid, text, text)
from public, anon, authenticated;
grant execute on function public.get_rights_safe_chat_replay(uuid, uuid, uuid, text, text)
to service_role;
