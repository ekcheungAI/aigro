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

-- Existing publication pointers predate explicit authorization and therefore fail closed.
update public.knowledge_sources ks
set published_revision_id = null, updated_at = now()
where ks.published_revision_id is not null
  and (
    ks.rights_status <> 'granted'
    or ks.revoked_at is not null
    or (ks.expires_at is not null and ks.expires_at <= now())
    or not exists (
      select 1 from public.knowledge_revisions kr
      where kr.id = ks.published_revision_id and kr.source_id = ks.id and kr.status = 'approved'
    )
  );

create or replace function public.enforce_knowledge_publication_rights()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.published_revision_id is not null and (
    new.rights_status <> 'granted'
    or new.revoked_at is not null
    or (new.expires_at is not null and new.expires_at <= now())
  ) then
    if tg_op = 'UPDATE'
       and old.published_revision_id is not null
       and new.published_revision_id = old.published_revision_id then
      new.published_revision_id := null;
    else
      raise exception 'knowledge_rights_not_granted';
    end if;
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
before insert or update of published_revision_id, rights_status, expires_at, revoked_at
on public.knowledge_sources
for each row execute function public.enforce_knowledge_publication_rights();

create or replace function public.unpublish_expired_knowledge_sources()
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare affected integer;
begin
  update public.knowledge_sources
  set published_revision_id = null, updated_at = now()
  where published_revision_id is not null
    and expires_at is not null
    and expires_at <= now();
  get diagnostics affected = row_count;
  return affected;
end;
$$;

revoke all on function public.unpublish_expired_knowledge_sources()
from public, anon, authenticated;
grant execute on function public.unpublish_expired_knowledge_sources() to service_role;

do $$
begin
  perform cron.unschedule(jobid) from cron.job
  where jobname = 'aigro-unpublish-expired-knowledge';
  perform cron.schedule(
    'aigro-unpublish-expired-knowledge',
    '* * * * *',
    'select public.unpublish_expired_knowledge_sources()'
  );
end $$;

create or replace function public.rollback_knowledge_source(
  p_source_id uuid,
  p_revision_id uuid
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
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
set search_path = pg_catalog, public
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

create or replace function public.queue_persona_synthesis(p_expert_id uuid)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare revision_ids uuid[]; job_id uuid;
begin
  if not public.owns_expert(p_expert_id) then raise exception 'not_allowed'; end if;
  perform 1 from public.experts where id = p_expert_id for update;
  if exists (
    select 1 from public.persona_synthesis_jobs
    where expert_id = p_expert_id and status in ('pending', 'processing', 'retry', 'review', 'approved')
  ) then raise exception 'persona_synthesis_already_active'; end if;

  select array_agg(kr.id order by kr.approved_at nulls last, kr.created_at)
  into revision_ids
  from public.knowledge_sources ks
  join public.knowledge_revisions kr
    on kr.id = ks.published_revision_id and kr.source_id = ks.id
  where ks.expert_id = p_expert_id
    and ks.archived_at is null
    and ks.rights_status = 'granted'
    and ks.revoked_at is null
    and (ks.expires_at is null or ks.expires_at > now())
    and kr.status = 'approved';
  if coalesce(cardinality(revision_ids), 0) < 2 then raise exception 'persona_needs_two_published_sources'; end if;

  insert into public.persona_synthesis_jobs (expert_id, source_revision_ids, created_by, research_cutoff_at)
  values (p_expert_id, revision_ids, auth.uid(), now()) returning id into job_id;
  insert into public.audit_events (actor_id, expert_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), p_expert_id, 'persona.synthesis_queued', 'persona_synthesis_job', job_id,
    jsonb_build_object('source_revision_ids', revision_ids));
  return job_id;
end;
$$;

create or replace function public.get_authorized_persona_evidence(
  p_expert_id uuid,
  p_revision_ids uuid[]
)
returns table (
  revision_id uuid, source_id uuid, distilled_json jsonb, source_title text,
  source_type text, tags text[], chunk_id uuid, content text, citation_meta jsonb
)
language sql
security definer
stable
set search_path = pg_catalog, public
as $$
  select kr.id, ks.id, kr.distilled_json, ks.title, ks.source_type, ks.tags,
    kc.id, kc.content, kc.citation_meta
  from public.knowledge_revisions kr
  join public.knowledge_sources ks
    on ks.id = kr.source_id and ks.expert_id = p_expert_id
  join public.knowledge_chunks kc
    on kc.revision_id = kr.id and kc.expert_id = p_expert_id
  where kr.id = any(p_revision_ids)
    and kr.status = 'approved'
    and ks.published_revision_id = kr.id
    and ks.archived_at is null
    and ks.rights_status = 'granted'
    and ks.revoked_at is null
    and (ks.expires_at is null or ks.expires_at > now())
  order by kr.id, kc.chunk_index
  limit 500;
$$;

revoke all on function public.get_authorized_persona_evidence(uuid, uuid[])
from public, anon, authenticated;
grant execute on function public.get_authorized_persona_evidence(uuid, uuid[]) to service_role;

create or replace function public.is_expert_chat_ready(p_expert_id uuid)
returns boolean
language sql
security definer
stable
set search_path = pg_catalog, public
as $$
  select coalesce((select case when e.slug = 'platform' then false else
    e.status = 'active' and e.archived_at is null and e.public_profile_enabled and e.verified
    and exists (select 1 from public.account_access aa where aa.expert_id = e.id and aa.app_role = 'expert')
    and coalesce((e.feature_flags ->> 'rag_enabled')::boolean, false)
    and e.published_persona_version_id is not null
    and exists (select 1 from public.expert_persona_versions epv
      where epv.id = e.published_persona_version_id and epv.expert_id = e.id and epv.status = 'published')
    and exists (
      select 1 from public.knowledge_sources ks
      join public.knowledge_revisions kr on kr.id = ks.published_revision_id and kr.source_id = ks.id
      join public.knowledge_chunks kc on kc.revision_id = kr.id and kc.expert_id = e.id
      where ks.expert_id = e.id and ks.archived_at is null and kr.status = 'approved'
        and ks.rights_status = 'granted' and ks.revoked_at is null
        and (ks.expires_at is null or ks.expires_at > now()) and kc.embedding is not null
    )
    and 2 <= (
      select count(*) from public.knowledge_sources ks
      join public.knowledge_revisions kr on kr.id = ks.published_revision_id and kr.source_id = ks.id
      where ks.expert_id = e.id and ks.archived_at is null and kr.status = 'approved'
        and ks.rights_status = 'granted' and ks.revoked_at is null
        and (ks.expires_at is null or ks.expires_at > now())
    )
    and 25 <= (select count(*) from public.persona_evaluation_questions q where q.expert_id = e.id and q.active)
    and public.has_current_passed_persona_evaluation(e.id, e.published_persona_version_id)
  end from public.experts e where e.id = p_expert_id), false);
$$;

revoke all on function public.is_expert_chat_ready(uuid) from public, anon, authenticated;
grant execute on function public.is_expert_chat_ready(uuid) to service_role;
