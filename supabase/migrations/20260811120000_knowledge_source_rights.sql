-- Forward-only authorization metadata and fail-closed publication/retrieval gates.
alter table public.knowledge_sources
  add column if not exists rights_status text not null default 'unknown',
  add column if not exists rights_holder text,
  add column if not exists rights_scope jsonb not null default '{}'::jsonb,
  add column if not exists rights_evidence_ref text,
  add column if not exists authorized_at timestamptz,
  add column if not exists expires_at timestamptz,
  add column if not exists revoked_at timestamptz;

alter table public.knowledge_sources
  drop constraint if exists knowledge_sources_rights_status_check;
alter table public.knowledge_sources
  add constraint knowledge_sources_rights_status_check
  check (rights_status in ('unknown', 'requested', 'granted', 'restricted', 'revoked'));

create or replace function public.enforce_knowledge_publication_rights()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.published_revision_id is not null and (
    new.rights_status <> 'granted'
    or new.revoked_at is not null
    or (new.expires_at is not null and new.expires_at <= now())
  ) then
    raise exception 'knowledge_rights_not_granted';
  end if;
  if new.published_revision_id is not null and not exists (
    select 1 from public.knowledge_revisions kr
    where kr.id = new.published_revision_id and kr.source_id = new.id and kr.status = 'approved'
  ) then
    raise exception 'revision_not_approved';
  end if;
  return new;
end;
$$;

drop trigger if exists knowledge_sources_publication_rights on public.knowledge_sources;
create trigger knowledge_sources_publication_rights
before insert or update of published_revision_id
on public.knowledge_sources
for each row execute function public.enforce_knowledge_publication_rights();

create or replace function public.rollback_knowledge_source(
  p_source_id uuid,
  p_revision_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare source_row public.knowledge_sources%rowtype;
begin
  select * into source_row from public.knowledge_sources where id = p_source_id for update;
  if not found or not public.owns_expert(source_row.expert_id) then raise exception 'not_allowed'; end if;
  if source_row.rights_status <> 'granted'
     or source_row.revoked_at is not null
     or (source_row.expires_at is not null and source_row.expires_at <= now()) then
    raise exception 'knowledge_rights_not_granted';
  end if;
  if not exists (
    select 1 from public.knowledge_revisions
    where id = p_revision_id and source_id = p_source_id and status = 'approved'
  ) then raise exception 'revision_not_approved'; end if;
  update public.knowledge_sources set published_revision_id = p_revision_id, updated_at = now()
  where id = p_source_id;
  insert into public.audit_events (actor_id, expert_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), source_row.expert_id, 'knowledge.rollback', 'knowledge_source', p_source_id,
    jsonb_build_object('revision_id', p_revision_id));
end;
$$;

create or replace function public.review_knowledge_revision(
  p_revision_id uuid,
  p_decision text,
  p_notes text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  revision_row public.knowledge_revisions%rowtype;
  source_row public.knowledge_sources%rowtype;
begin
  select * into revision_row from public.knowledge_revisions where id = p_revision_id for update;
  if not found then raise exception 'revision_not_found'; end if;
  select * into source_row from public.knowledge_sources where id = revision_row.source_id;
  if not public.owns_expert(source_row.expert_id) then raise exception 'not_allowed'; end if;
  if revision_row.status not in ('review', 'approved', 'rejected') then raise exception 'revision_not_reviewable'; end if;
  if p_decision = 'approve' then
    if source_row.rights_status <> 'granted'
       or source_row.revoked_at is not null
       or (source_row.expires_at is not null and source_row.expires_at <= now()) then
      raise exception 'knowledge_rights_not_granted';
    end if;
    update public.knowledge_revisions
      set status = 'approved', approved_by = auth.uid(), approved_at = now(), error_message = null
      where id = p_revision_id;
    update public.knowledge_sources set published_revision_id = p_revision_id, updated_at = now()
      where id = revision_row.source_id;
  elsif p_decision = 'reject' then
    update public.knowledge_revisions set status = 'rejected', approved_by = auth.uid(), approved_at = now()
      where id = p_revision_id;
  else raise exception 'invalid_decision'; end if;
  insert into public.audit_events (actor_id, expert_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), source_row.expert_id, 'knowledge.' || p_decision, 'knowledge_revision', p_revision_id,
    jsonb_build_object('notes', p_notes, 'admin_on_behalf', public.is_admin()));
end;
$$;

create or replace function public.match_expert_knowledge(
  p_expert_id uuid,
  p_query_embedding extensions.halfvec(1536),
  p_match_count integer default 6,
  p_similarity_threshold double precision default 0.70
)
returns table (chunk_id uuid, revision_id uuid, source_id uuid, source_title text,
  source_url text, content text, citation_meta jsonb, similarity double precision)
language sql security definer stable
set search_path = pg_catalog, public, extensions
as $$
  select kc.id, kc.revision_id, ks.id, ks.title, ks.source_url, kc.content, kc.citation_meta,
    1 - (kc.embedding <=> p_query_embedding)
  from public.knowledge_chunks kc
  join public.knowledge_revisions kr on kr.id = kc.revision_id and kr.source_id = kc.source_id
  join public.knowledge_sources ks on ks.id = kr.source_id and ks.expert_id = kc.expert_id
  where kc.expert_id = p_expert_id and ks.expert_id = p_expert_id
    and ks.archived_at is null and ks.published_revision_id = kr.id and kr.status = 'approved'
    and ks.rights_status = 'granted' and ks.revoked_at is null
    and (ks.expires_at is null or ks.expires_at > now())
    and kc.embedding is not null
    and 1 - (kc.embedding <=> p_query_embedding) >= p_similarity_threshold
  order by kc.embedding <=> p_query_embedding
  limit least(greatest(p_match_count, 1), 12);
$$;

revoke all on function public.match_expert_knowledge(uuid, extensions.halfvec, integer, double precision)
from public, anon, authenticated;
grant execute on function public.match_expert_knowledge(uuid, extensions.halfvec, integer, double precision)
to service_role;
