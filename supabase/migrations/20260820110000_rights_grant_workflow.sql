-- Owner-controlled rights grant/revoke workflow for generic knowledge sources.
-- Requires 20260811120000_knowledge_source_rights.sql first.

create or replace function public.enforce_persona_version_rights()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.status = 'published'
     and cardinality(coalesce(new.source_revision_ids, '{}'::uuid[])) > 0
     and exists (
       select 1
       from unnest(new.source_revision_ids) as requested(revision_id)
       left join public.knowledge_revisions kr on kr.id = requested.revision_id
       left join public.knowledge_sources ks on ks.id = kr.source_id
       where kr.id is null
          or ks.expert_id <> new.expert_id
          or kr.status <> 'approved'
          or ks.published_revision_id <> kr.id
          or ks.rights_status <> 'granted'
          or ks.revoked_at is not null
          or (ks.expires_at is not null and ks.expires_at <= now())
     ) then
    raise exception 'persona_sources_not_rights_authorized';
  end if;
  return new;
end;
$$;

drop trigger if exists persona_version_rights_gate
on public.expert_persona_versions;
create trigger persona_version_rights_gate
before insert or update of status, source_revision_ids
on public.expert_persona_versions
for each row execute function public.enforce_persona_version_rights();

create or replace function public.set_knowledge_source_rights(
  p_source_id uuid,
  p_rights_holder text,
  p_rights_evidence_ref text,
  p_rights_scope jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  source_row public.knowledge_sources%rowtype;
  input_scope jsonb := coalesce(p_rights_scope, '{}'::jsonb);
  scope jsonb := input_scope || '{"model_training":false}'::jsonb;
begin
  select * into source_row
  from public.knowledge_sources
  where id = p_source_id
  for update;
  if not found then raise exception 'knowledge_source_not_found' using errcode = 'P0002'; end if;
  if not public.owns_expert(source_row.expert_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if char_length(btrim(coalesce(p_rights_holder, ''))) < 2
     or char_length(btrim(coalesce(p_rights_evidence_ref, ''))) < 4
     or not (scope @> '{"commercial_rag":true,"distillation":true,"persona_synthesis":true}'::jsonb)
     or coalesce(input_scope -> 'model_training', 'false'::jsonb) is distinct from 'false'::jsonb then
    raise exception 'knowledge_rights_evidence_required' using errcode = '22023';
  end if;

  update public.knowledge_sources
  set rights_status = 'granted',
      rights_holder = left(btrim(p_rights_holder), 500),
      rights_scope = scope,
      rights_evidence_ref = left(btrim(p_rights_evidence_ref), 1000),
      authorized_at = coalesce(authorized_at, now()),
      revoked_at = null,
      updated_at = now()
  where id = p_source_id;

  insert into public.audit_events (
    actor_id, expert_id, action, entity_type, entity_id, metadata
  ) values (
    auth.uid(), source_row.expert_id, 'knowledge.rights_granted',
    'knowledge_source', p_source_id,
    jsonb_build_object(
      'rights_holder', left(btrim(p_rights_holder), 500),
      'rights_evidence_ref', left(btrim(p_rights_evidence_ref), 1000),
      'rights_scope', scope
    )
  );
end;
$$;

create or replace function public.revoke_knowledge_source_rights(
  p_source_id uuid,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare source_row public.knowledge_sources%rowtype;
begin
  select * into source_row
  from public.knowledge_sources
  where id = p_source_id
  for update;
  if not found then raise exception 'knowledge_source_not_found' using errcode = 'P0002'; end if;
  if not public.owns_expert(source_row.expert_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  update public.knowledge_sources
  set rights_status = 'revoked',
      revoked_at = now(),
      published_revision_id = null,
      updated_at = now()
  where id = p_source_id;

  insert into public.audit_events (
    actor_id, expert_id, action, entity_type, entity_id, metadata
  ) values (
    auth.uid(), source_row.expert_id, 'knowledge.rights_revoked',
    'knowledge_source', p_source_id,
    jsonb_build_object('reason', left(btrim(coalesce(p_reason, '')), 1000))
  );
end;
$$;

revoke all on function public.set_knowledge_source_rights(uuid, text, text, jsonb)
from public, anon, authenticated;
grant execute on function public.set_knowledge_source_rights(uuid, text, text, jsonb)
to authenticated;
revoke all on function public.revoke_knowledge_source_rights(uuid, text)
from public, anon, authenticated;
grant execute on function public.revoke_knowledge_source_rights(uuid, text)
to authenticated;
