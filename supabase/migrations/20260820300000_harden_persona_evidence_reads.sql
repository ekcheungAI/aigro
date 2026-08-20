-- Provider-bound persona evidence must be authorized at read time, not only
-- rejected later at completion. This prevents stale jobs from disclosing a
-- source after its human approval, scope, publication, or embeddings change.
create or replace function public.get_authorized_persona_evidence(
  p_expert_id uuid,
  p_revision_ids uuid[]
)
returns table (
  revision_id uuid,
  source_id uuid,
  distilled_json jsonb,
  source_title text,
  source_type text,
  tags text[],
  chunk_id uuid,
  content text,
  citation_meta jsonb
)
language sql
security definer
stable
set search_path = pg_catalog, public
as $$
  with authorized as (
    select
      kr.id as revision_id,
      ks.id as source_id,
      kr.distilled_json,
      ks.title as source_title,
      ks.source_type,
      ks.tags,
      kc.id as chunk_id,
      kc.content,
      kc.citation_meta,
      row_number() over (partition by kr.id order by kc.chunk_index) as chunk_rank
    from public.knowledge_revisions kr
    join public.knowledge_sources ks
      on ks.id = kr.source_id
     and ks.expert_id = p_expert_id
    join public.knowledge_chunks kc
      on kc.revision_id = kr.id
     and kc.source_id = ks.id
     and kc.expert_id = p_expert_id
    where kr.id = any(coalesce(p_revision_ids, '{}'::uuid[]))
      and kr.status = 'approved'
      and kr.approved_by is not null
      and kr.approved_at is not null
      and ks.published_revision_id = kr.id
      and ks.archived_at is null
      and ks.rights_status = 'granted'
      and ks.revoked_at is null
      and (ks.expires_at is null or ks.expires_at > now())
      and ks.rights_scope @> '{"commercial_rag":true,"distillation":true,"persona_synthesis":true}'::jsonb
      and kc.embedding is not null
  )
  select
    authorized.revision_id,
    authorized.source_id,
    authorized.distilled_json,
    authorized.source_title,
    authorized.source_type,
    authorized.tags,
    authorized.chunk_id,
    authorized.content,
    authorized.citation_meta
  from authorized
  order by authorized.chunk_rank, authorized.revision_id
  limit 500;
$$;

create or replace function public.get_authorized_persona_revision_ids(
  p_expert_id uuid,
  p_revision_ids uuid[]
)
returns table (revision_id uuid)
language sql
security definer
stable
set search_path = pg_catalog, public
as $$
  select kr.id
  from public.knowledge_revisions kr
  join public.knowledge_sources ks
    on ks.id = kr.source_id
   and ks.expert_id = p_expert_id
  where kr.id = any(coalesce(p_revision_ids, '{}'::uuid[]))
    and kr.status = 'approved'
    and kr.approved_by is not null
    and kr.approved_at is not null
    and ks.published_revision_id = kr.id
    and ks.archived_at is null
    and ks.rights_status = 'granted'
    and ks.revoked_at is null
    and (ks.expires_at is null or ks.expires_at > now())
    and ks.rights_scope @> '{"commercial_rag":true,"distillation":true,"persona_synthesis":true}'::jsonb
    and exists (
      select 1
      from public.knowledge_chunks kc
      where kc.revision_id = kr.id
        and kc.source_id = ks.id
        and kc.expert_id = p_expert_id
        and kc.embedding is not null
    )
  order by kr.id;
$$;

revoke all on function public.get_authorized_persona_evidence(uuid, uuid[])
from public, anon, authenticated;
grant execute on function public.get_authorized_persona_evidence(uuid, uuid[])
to service_role;

revoke all on function public.get_authorized_persona_revision_ids(uuid, uuid[])
from public, anon, authenticated;
grant execute on function public.get_authorized_persona_revision_ids(uuid, uuid[])
to service_role;
