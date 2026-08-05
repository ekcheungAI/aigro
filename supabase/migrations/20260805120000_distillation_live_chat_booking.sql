-- AIGRO Distillation CMS, grounded instructor chat, and booking foundation.
-- This migration is deliberately additive: legacy columns remain during rollout,
-- but all new policies use auth.uid() ownership and account_access.

create extension if not exists vector with schema extensions;
create extension if not exists btree_gist with schema extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
create extension if not exists supabase_vault;

-- ---------------------------------------------------------------------------
-- Access control. profiles stays compatible with the current UI, while the
-- authoritative role/tier/expert relationship moves to this protected table.
-- ---------------------------------------------------------------------------

create table if not exists public.account_access (
  user_id uuid primary key references auth.users(id) on delete cascade,
  app_role text not null default 'member'
    check (app_role in ('member', 'expert', 'admin')),
  tier text not null default 'free'
    check (tier in ('free', 'pro', 'vip')),
  expert_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.account_access
  drop constraint if exists account_access_profile_fkey;
alter table public.account_access
  add constraint account_access_profile_fkey
  foreign key (user_id) references public.profiles(id) on delete cascade;

insert into public.account_access (user_id, app_role, tier)
select p.id,
  case when p.role = 'admin' then 'admin'
       when p.role = 'expert' then 'expert'
       else 'member' end,
  case when p.tier in ('free', 'pro', 'vip') then p.tier else 'free' end
from public.profiles p
on conflict (user_id) do nothing;

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.account_access
    where user_id = auth.uid() and app_role = 'admin'
  );
$$;

create or replace function public.protect_profile_access_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  access_row public.account_access%rowtype;
begin
  select * into access_row from public.account_access where user_id = new.id;
  if found then
    new.role := case access_row.app_role
      when 'admin' then 'admin'
      when 'expert' then 'expert'
      else coalesce(nullif(old.role, ''), 'free')
    end;
    new.tier := access_row.tier;
    if access_row.expert_id is null then
      new.expert_slug := null;
    else
      select slug into new.expert_slug from public.experts where id = access_row.expert_id;
    end if;
  elsif tg_op = 'INSERT' then
    new.role := 'free';
    new.tier := 'free';
    new.expert_slug := null;
  else
    new.role := old.role;
    new.tier := old.tier;
    new.expert_slug := old.expert_slug;
  end if;
  return new;
end;
$$;

create or replace function public.ensure_account_access()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.account_access (user_id, app_role, tier)
  values (new.id, 'member', 'free')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Experts and versioned personas.
-- ---------------------------------------------------------------------------

create table if not exists public.experts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  owner_user_id uuid unique references auth.users(id) on delete set null,
  display_name text not null,
  status text not null default 'draft'
    check (status in ('draft', 'active', 'suspended')),
  feature_flags jsonb not null default
    '{"cms_ingestion_enabled":false,"rag_enabled":false,"booking_enabled":false}'::jsonb,
  published_persona_version_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.account_access
  drop constraint if exists account_access_expert_id_fkey;
alter table public.account_access
  add constraint account_access_expert_id_fkey
  foreign key (expert_id) references public.experts(id) on delete set null;

insert into public.experts (slug, display_name, status)
values
  ('jimmy-lau', 'Jimmy Lau', 'active'),
  ('elvin-cheung', 'Elvin Cheung', 'active'),
  ('platform', 'AIGRO 編輯部', 'active')
on conflict (slug) do update set display_name = excluded.display_name;

update public.experts e
set owner_user_id = p.id
from public.profiles p
where p.expert_slug = e.slug and e.owner_user_id is null;

update public.account_access aa
set expert_id = e.id
from public.profiles p
join public.experts e on e.slug = p.expert_slug
where aa.user_id = p.id and aa.expert_id is null;

create table if not exists public.expert_persona_versions (
  id uuid primary key default gen_random_uuid(),
  expert_id uuid not null references public.experts(id) on delete cascade,
  version integer not null,
  greeting text not null default '',
  voice_rules jsonb not null default '{}'::jsonb,
  boundaries jsonb not null default '[]'::jsonb,
  sample_dialogues jsonb not null default '[]'::jsonb,
  status text not null default 'draft'
    check (status in ('draft', 'published', 'retired')),
  created_by uuid references auth.users(id) on delete set null,
  approved_by uuid references auth.users(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  unique (expert_id, version)
);

alter table public.experts
  drop constraint if exists experts_published_persona_version_id_fkey;
alter table public.experts
  add constraint experts_published_persona_version_id_fkey
  foreign key (published_persona_version_id)
  references public.expert_persona_versions(id) on delete set null;

create or replace function public.owns_expert(target_expert_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.is_admin() or exists (
    select 1 from public.account_access
    where user_id = auth.uid()
      and app_role = 'expert'
      and expert_id = target_expert_id
  );
$$;

-- Keep legacy profile access fields as read-only compatibility mirrors.
drop trigger if exists profiles_protect_access_fields on public.profiles;
create trigger profiles_protect_access_fields
before insert or update on public.profiles
for each row execute function public.protect_profile_access_fields();
drop trigger if exists profiles_ensure_account_access on public.profiles;
create trigger profiles_ensure_account_access
after insert on public.profiles
for each row execute function public.ensure_account_access();

-- ---------------------------------------------------------------------------
-- Secure ownership for conversations, messages, and leads.
-- ---------------------------------------------------------------------------

alter table public.conversations
  add column if not exists owner_id uuid references auth.users(id) on delete cascade,
  add column if not exists expert_id uuid references public.experts(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now();

update public.conversations c
set owner_id = c.user_id
where c.owner_id is null and c.user_id is not null;

update public.conversations c
set expert_id = e.id
from public.experts e
where c.expert_id is null and e.slug = c.persona;

alter table public.messages
  add column if not exists request_id text,
  add column if not exists answer_basis text
    check (answer_basis is null or answer_basis in ('knowledge', 'general')),
  add column if not exists coverage text
    check (coverage is null or coverage in ('high', 'medium', 'none')),
  add column if not exists persona_version_id uuid
    references public.expert_persona_versions(id) on delete set null,
  add column if not exists retrieval jsonb not null default '[]'::jsonb,
  add column if not exists provider_usage jsonb not null default '{}'::jsonb;

create unique index if not exists messages_request_role_unique
on public.messages(conversation_id, request_id, role);

alter table public.leads
  add column if not exists owner_id uuid references auth.users(id) on delete cascade;

update public.leads set owner_id = user_id
where owner_id is null and user_id is not null;

drop index if exists public.leads_owner_persona_unique;
create unique index leads_owner_persona_unique
on public.leads(owner_id, persona);

create table if not exists public.chat_rate_limits (
  user_id uuid not null references auth.users(id) on delete cascade,
  window_start timestamptz not null,
  request_count integer not null default 0,
  primary key (user_id, window_start)
);

-- Remove the unsafe legacy ownership policies.
drop policy if exists "conv_owner_all" on public.conversations;
drop policy if exists "msg_owner_all" on public.messages;
drop policy if exists "leads_insert_all" on public.leads;
drop policy if exists "leads_owner_read" on public.leads;
drop policy if exists "leads_anon_update_own" on public.leads;

create policy "conversations_owner_all_v5" on public.conversations
for all to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "messages_owner_all_v5" on public.messages
for all to authenticated
using (exists (
  select 1 from public.conversations c
  where c.id = conversation_id and c.owner_id = auth.uid()
))
with check (exists (
  select 1 from public.conversations c
  where c.id = conversation_id and c.owner_id = auth.uid()
));

create policy "leads_owner_all_v5" on public.leads
for all to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Distillation CMS.
-- ---------------------------------------------------------------------------

create table if not exists public.knowledge_sources (
  id uuid primary key default gen_random_uuid(),
  expert_id uuid not null references public.experts(id) on delete cascade,
  source_type text not null check (source_type in ('manual', 'url', 'pdf', 'youtube')),
  title text not null,
  source_url text,
  tags text[] not null default '{}',
  published_revision_id uuid,
  archived_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.knowledge_revisions (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.knowledge_sources(id) on delete cascade,
  revision_no integer not null,
  raw_text text,
  storage_path text,
  extracted_text text,
  distilled_json jsonb,
  content_hash text,
  status text not null default 'queued'
    check (status in ('queued', 'processing', 'review', 'approved', 'rejected', 'failed', 'archived')),
  provider_meta jsonb not null default '{}'::jsonb,
  error_message text,
  created_by uuid references auth.users(id) on delete set null,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  unique (source_id, revision_no)
);

alter table public.knowledge_sources
  drop constraint if exists knowledge_sources_published_revision_id_fkey;
alter table public.knowledge_sources
  add constraint knowledge_sources_published_revision_id_fkey
  foreign key (published_revision_id)
  references public.knowledge_revisions(id) on delete set null;

create table if not exists public.knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  revision_id uuid not null references public.knowledge_revisions(id) on delete cascade,
  expert_id uuid not null references public.experts(id) on delete cascade,
  chunk_index integer not null,
  content text not null,
  embedding extensions.halfvec(1536),
  citation_meta jsonb not null default '{}'::jsonb,
  token_count integer,
  created_at timestamptz not null default now(),
  unique (revision_id, chunk_index)
);

create index if not exists knowledge_chunks_embedding_hnsw
on public.knowledge_chunks
using hnsw (embedding extensions.halfvec_cosine_ops)
with (m = 16, ef_construction = 64);

create index if not exists knowledge_chunks_expert_revision_idx
on public.knowledge_chunks(expert_id, revision_id, chunk_index);

create table if not exists public.distillation_jobs (
  id uuid primary key default gen_random_uuid(),
  revision_id uuid not null unique references public.knowledge_revisions(id) on delete cascade,
  stage text not null default 'extract'
    check (stage in ('extract', 'distill', 'embed', 'complete')),
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'retry', 'complete', 'failed')),
  attempts integer not null default 0 check (attempts between 0 and 3),
  next_retry_at timestamptz not null default now(),
  locked_at timestamptz,
  locked_by text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists distillation_jobs_claim_idx
on public.distillation_jobs(status, next_retry_at, created_at);

create table if not exists public.audit_events (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  expert_id uuid references public.experts(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.knowledge_gaps (
  id uuid primary key default gen_random_uuid(),
  expert_id uuid not null references public.experts(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete set null,
  message_id uuid references public.messages(id) on delete set null,
  question text not null,
  status text not null default 'open'
    check (status in ('open', 'resolved', 'dismissed')),
  resolved_by_source_id uuid references public.knowledge_sources(id) on delete set null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'expert-kb',
  'expert-kb',
  false,
  26214400,
  array['application/pdf', 'text/plain', 'text/markdown']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- Booking.
-- ---------------------------------------------------------------------------

create table if not exists public.availability_rules (
  id uuid primary key default gen_random_uuid(),
  expert_id uuid not null references public.experts(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  timezone text not null default 'Asia/Hong_Kong',
  slot_minutes integer not null default 45 check (slot_minutes between 15 and 240),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check (start_time < end_time)
);

create table if not exists public.availability_exceptions (
  id uuid primary key default gen_random_uuid(),
  expert_id uuid not null references public.experts(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  kind text not null check (kind in ('available', 'blocked')),
  note text,
  created_at timestamptz not null default now(),
  check (starts_at < ends_at)
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references auth.users(id) on delete cascade,
  expert_id uuid not null references public.experts(id) on delete cascade,
  source_conversation_id uuid references public.conversations(id) on delete set null,
  source_question text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'requested'
    check (status in ('requested', 'confirmed', 'declined', 'completed',
      'cancelled_member', 'cancelled_expert', 'no_show')),
  meeting_url text,
  member_note text,
  expert_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (starts_at < ends_at)
);

alter table public.bookings
  drop constraint if exists bookings_expert_no_overlap;
alter table public.bookings
  add constraint bookings_expert_no_overlap
  exclude using gist (
    expert_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (status in ('requested', 'confirmed'));

-- ---------------------------------------------------------------------------
-- RPCs: CMS enqueue/review, retrieval, job claiming, and booking.
-- ---------------------------------------------------------------------------

create or replace function public.create_knowledge_source(
  p_expert_slug text,
  p_source_type text,
  p_title text,
  p_source_url text default null,
  p_raw_text text default null,
  p_storage_path text default null,
  p_tags text[] default '{}'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_expert public.experts%rowtype;
  new_source public.knowledge_sources%rowtype;
  new_revision public.knowledge_revisions%rowtype;
begin
  select * into target_expert from public.experts where slug = p_expert_slug;
  if not found or not public.owns_expert(target_expert.id) then
    raise exception 'not_allowed';
  end if;
  if coalesce((target_expert.feature_flags->>'cms_ingestion_enabled')::boolean, false) is false
     and not public.is_admin() then
    raise exception 'cms_ingestion_disabled';
  end if;
  if p_source_type not in ('manual', 'url', 'pdf', 'youtube') then
    raise exception 'invalid_source_type';
  end if;
  if length(trim(p_title)) < 2 then raise exception 'invalid_title'; end if;
  if p_source_type = 'manual' and length(trim(coalesce(p_raw_text, ''))) < 20 then
    raise exception 'manual_text_too_short';
  end if;
  if p_source_type in ('url', 'youtube') and p_source_url is null then
    raise exception 'source_url_required';
  end if;
  if p_source_type = 'pdf' and p_storage_path is null then
    raise exception 'storage_path_required';
  end if;

  insert into public.knowledge_sources (
    expert_id, source_type, title, source_url, tags, created_by
  ) values (
    target_expert.id, p_source_type, trim(p_title), nullif(trim(p_source_url), ''),
    coalesce(p_tags, '{}'), auth.uid()
  ) returning * into new_source;

  insert into public.knowledge_revisions (
    source_id, revision_no, raw_text, storage_path, created_by
  ) values (
    new_source.id, 1, nullif(trim(p_raw_text), ''), p_storage_path, auth.uid()
  ) returning * into new_revision;

  insert into public.distillation_jobs (revision_id) values (new_revision.id);
  insert into public.audit_events (actor_id, expert_id, action, entity_type, entity_id)
  values (auth.uid(), target_expert.id, 'knowledge.created', 'knowledge_revision', new_revision.id);

  return jsonb_build_object('source_id', new_source.id, 'revision_id', new_revision.id);
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
  if revision_row.status not in ('review', 'approved', 'rejected') then
    raise exception 'revision_not_reviewable';
  end if;
  if p_decision = 'approve' then
    update public.knowledge_revisions
      set status = 'approved', approved_by = auth.uid(), approved_at = now(), error_message = null
      where id = p_revision_id;
    update public.knowledge_sources set published_revision_id = p_revision_id, updated_at = now()
      where id = revision_row.source_id;
  elsif p_decision = 'reject' then
    update public.knowledge_revisions
      set status = 'rejected', approved_by = auth.uid(), approved_at = now()
      where id = p_revision_id;
  else
    raise exception 'invalid_decision';
  end if;
  insert into public.audit_events (
    actor_id, expert_id, action, entity_type, entity_id, metadata
  ) values (
    auth.uid(), source_row.expert_id, 'knowledge.' || p_decision,
    'knowledge_revision', p_revision_id,
    jsonb_build_object('notes', p_notes, 'admin_on_behalf', public.is_admin())
  );
end;
$$;

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

create or replace function public.publish_persona_version(
  p_expert_id uuid,
  p_greeting text,
  p_voice_rules jsonb,
  p_boundaries jsonb,
  p_sample_dialogues jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  next_version integer;
  persona_id uuid;
begin
  if not public.owns_expert(p_expert_id) then raise exception 'not_allowed'; end if;
  select coalesce(max(version), 0) + 1 into next_version
  from public.expert_persona_versions where expert_id = p_expert_id;
  update public.expert_persona_versions set status = 'retired'
  where expert_id = p_expert_id and status = 'published';
  insert into public.expert_persona_versions (
    expert_id, version, greeting, voice_rules, boundaries, sample_dialogues,
    status, created_by, approved_by, published_at
  ) values (
    p_expert_id, next_version, coalesce(p_greeting, ''), coalesce(p_voice_rules, '{}'::jsonb),
    coalesce(p_boundaries, '[]'::jsonb), coalesce(p_sample_dialogues, '[]'::jsonb),
    'published', auth.uid(), auth.uid(), now()
  ) returning id into persona_id;
  update public.experts set published_persona_version_id = persona_id where id = p_expert_id;
  insert into public.audit_events (actor_id, expert_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), p_expert_id, 'persona.published', 'expert_persona_version', persona_id,
    jsonb_build_object('version', next_version, 'admin_on_behalf', public.is_admin()));
  return persona_id;
end;
$$;

create or replace function public.match_expert_knowledge(
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
  source_url text,
  content text,
  citation_meta jsonb,
  similarity double precision
)
language sql
security definer
stable
set search_path = public, extensions
as $$
  select kc.id, kc.revision_id, ks.id, ks.title, ks.source_url, kc.content,
    kc.citation_meta,
    1 - (kc.embedding <=> p_query_embedding) as similarity
  from public.knowledge_chunks kc
  join public.knowledge_revisions kr on kr.id = kc.revision_id
  join public.knowledge_sources ks on ks.id = kr.source_id
  where kc.expert_id = p_expert_id
    and ks.published_revision_id = kr.id
    and kr.status = 'approved'
    and kc.embedding is not null
    and 1 - (kc.embedding <=> p_query_embedding) >= p_similarity_threshold
  order by kc.embedding <=> p_query_embedding
  limit least(greatest(p_match_count, 1), 12);
$$;

create or replace function public.claim_distillation_jobs(
  p_worker_id text,
  p_limit integer default 1
)
returns setof public.distillation_jobs
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with picked as (
    select id from public.distillation_jobs
    where status in ('pending', 'retry')
      and attempts < 3
      and next_retry_at <= now()
    order by created_at
    for update skip locked
    limit least(greatest(p_limit, 1), 5)
  )
  update public.distillation_jobs j
  set status = 'processing', attempts = attempts + 1,
      locked_at = now(), locked_by = p_worker_id, updated_at = now()
  from picked where j.id = picked.id
  returning j.*;
end;
$$;

create or replace function public.check_chat_rate_limit(
  p_user_id uuid,
  p_limit integer default 12
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  bucket timestamptz := date_trunc('minute', now());
  current_count integer;
begin
  if p_user_id is null then return false; end if;
  insert into public.chat_rate_limits (user_id, window_start, request_count)
  values (p_user_id, bucket, 1)
  on conflict (user_id, window_start)
  do update set request_count = public.chat_rate_limits.request_count + 1
  returning request_count into current_count;
  delete from public.chat_rate_limits where window_start < now() - interval '10 minutes';
  return current_count <= least(greatest(p_limit, 1), 120);
end;
$$;

create or replace function public.requeue_stuck_distillation_jobs()
returns void
language sql
security definer
set search_path = public
as $$
  update public.distillation_jobs
  set status = case when attempts >= 3 then 'failed' else 'retry' end,
      next_retry_at = now(), locked_at = null, locked_by = null,
      error_message = coalesce(error_message, 'Worker lease expired')
  where status = 'processing' and locked_at < now() - interval '15 minutes';
$$;

create or replace function public.purge_expired_anonymous_chats()
returns integer
language plpgsql
security definer
set search_path = public, auth
as $$
declare deleted_count integer;
begin
  delete from public.conversations c
  using auth.users u
  where c.owner_id = u.id
    and u.is_anonymous = true
    and c.created_at < now() - interval '30 days';
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

create or replace function public.invoke_knowledge_worker()
returns bigint
language plpgsql
security definer
set search_path = public, vault, net
as $$
declare
  project_url text;
  worker_secret text;
  request_id bigint;
begin
  select decrypted_secret into project_url
  from vault.decrypted_secrets where name = 'project_url' limit 1;
  select decrypted_secret into worker_secret
  from vault.decrypted_secrets where name = 'knowledge_worker_secret' limit 1;
  if project_url is null or worker_secret is null then return null; end if;
  select net.http_post(
    url := rtrim(project_url, '/') || '/functions/v1/knowledge-worker',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-worker-secret', worker_secret
    ),
    body := '{}'::jsonb
  ) into request_id;
  return request_id;
end;
$$;

create or replace function public.notify_distillation_worker()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.invoke_knowledge_worker();
  return null;
end;
$$;

create or replace function public.notify_booking_change()
returns trigger
language plpgsql
security definer
set search_path = public, vault, net
as $$
declare
  project_url text;
  webhook_secret text;
begin
  if tg_op = 'UPDATE' and old.status = new.status
     and coalesce(old.meeting_url, '') = coalesce(new.meeting_url, '') then
    return new;
  end if;
  select decrypted_secret into project_url
  from vault.decrypted_secrets where name = 'project_url' limit 1;
  select decrypted_secret into webhook_secret
  from vault.decrypted_secrets where name = 'booking_webhook_secret' limit 1;
  if project_url is not null and webhook_secret is not null then
    perform net.http_post(
      url := rtrim(project_url, '/') || '/functions/v1/booking-notify',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-webhook-secret', webhook_secret
      ),
      body := jsonb_build_object(
        'type', tg_op,
        'table', 'bookings',
        'record', to_jsonb(new),
        'old_record', case when tg_op = 'UPDATE' then to_jsonb(old) else null end
      )
    );
  end if;
  return new;
end;
$$;

create or replace function public.create_booking(
  p_expert_slug text,
  p_starts_at timestamptz,
  p_source_conversation_id uuid default null,
  p_source_question text default null,
  p_member_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_expert public.experts%rowtype;
  access_row public.account_access%rowtype;
  booking_id uuid;
  p_ends_at timestamptz := p_starts_at + interval '45 minutes';
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  select * into target_expert from public.experts where slug = p_expert_slug and status = 'active';
  if not found or coalesce((target_expert.feature_flags->>'booking_enabled')::boolean, false) is false then
    raise exception 'booking_unavailable';
  end if;
  select * into access_row from public.account_access where user_id = auth.uid();
  if not found or access_row.tier <> 'vip' then raise exception 'vip_required'; end if;
  if p_starts_at < now() + interval '24 hours' then raise exception 'booking_too_soon'; end if;
  if exists (
    select 1 from public.bookings
    where member_id = auth.uid()
      and status in ('requested', 'confirmed', 'completed')
      and date_trunc('month', starts_at at time zone 'Asia/Hong_Kong') =
          date_trunc('month', p_starts_at at time zone 'Asia/Hong_Kong')
  ) then raise exception 'monthly_entitlement_used'; end if;
  if not exists (
    select 1 from public.availability_rules ar
    where ar.expert_id = target_expert.id and ar.active
      and ar.weekday = extract(dow from p_starts_at at time zone ar.timezone)::smallint
      and (p_starts_at at time zone ar.timezone)::time >= ar.start_time
      and (p_ends_at at time zone ar.timezone)::time <= ar.end_time
  ) then raise exception 'outside_availability'; end if;
  if exists (
    select 1 from public.availability_exceptions ae
    where ae.expert_id = target_expert.id and ae.kind = 'blocked'
      and tstzrange(ae.starts_at, ae.ends_at, '[)') && tstzrange(p_starts_at, p_ends_at, '[)')
  ) then raise exception 'slot_blocked'; end if;

  insert into public.bookings (
    member_id, expert_id, source_conversation_id, source_question,
    starts_at, ends_at, member_note
  ) values (
    auth.uid(), target_expert.id, p_source_conversation_id,
    left(p_source_question, 1000), p_starts_at, p_ends_at, left(p_member_note, 2000)
  ) returning id into booking_id;

  insert into public.audit_events (actor_id, expert_id, action, entity_type, entity_id)
  values (auth.uid(), target_expert.id, 'booking.requested', 'booking', booking_id);
  return booking_id;
exception when exclusion_violation then
  raise exception 'slot_taken';
end;
$$;

create or replace function public.list_available_slots(
  p_expert_slug text,
  p_from_date date default current_date,
  p_to_date date default current_date + 30
)
returns table (starts_at timestamptz, ends_at timestamptz)
language sql
security definer
stable
set search_path = public
as $$
  with target as (
    select id from public.experts
    where slug = p_expert_slug and status = 'active'
      and coalesce((feature_flags->>'booking_enabled')::boolean, false)
  ), generated as (
    select slot as starts_at,
      slot + make_interval(mins => ar.slot_minutes) as ends_at,
      ar.expert_id
    from target t
    join public.availability_rules ar on ar.expert_id = t.id and ar.active
    cross join generate_series(
      greatest(p_from_date, current_date),
      least(p_to_date, current_date + 60),
      interval '1 day'
    ) day
    cross join lateral generate_series(
      (day::date + ar.start_time) at time zone ar.timezone,
      ((day::date + ar.end_time) at time zone ar.timezone) - make_interval(mins => ar.slot_minutes),
      make_interval(mins => ar.slot_minutes)
    ) slot
    where extract(dow from day)::smallint = ar.weekday
  )
  select g.starts_at, g.ends_at
  from generated g
  where g.starts_at >= now() + interval '24 hours'
    and not exists (
      select 1 from public.bookings b
      where b.expert_id = g.expert_id and b.status in ('requested', 'confirmed')
        and tstzrange(b.starts_at, b.ends_at, '[)') && tstzrange(g.starts_at, g.ends_at, '[)')
    )
    and not exists (
      select 1 from public.availability_exceptions ae
      where ae.expert_id = g.expert_id and ae.kind = 'blocked'
        and tstzrange(ae.starts_at, ae.ends_at, '[)') && tstzrange(g.starts_at, g.ends_at, '[)')
    )
  order by g.starts_at
  limit 200;
$$;

create or replace function public.update_booking_status(
  p_booking_id uuid,
  p_status text,
  p_meeting_url text default null,
  p_expert_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare booking_row public.bookings%rowtype;
begin
  select * into booking_row from public.bookings where id = p_booking_id for update;
  if not found or not public.owns_expert(booking_row.expert_id) then raise exception 'not_allowed'; end if;
  if p_status not in ('confirmed', 'declined', 'completed', 'cancelled_expert', 'no_show') then
    raise exception 'invalid_status';
  end if;
  if (p_status = 'confirmed' and booking_row.status not in ('requested', 'confirmed'))
     or (p_status = 'declined' and booking_row.status <> 'requested')
     or (p_status in ('completed', 'no_show') and booking_row.status <> 'confirmed')
     or (p_status = 'cancelled_expert' and booking_row.status not in ('requested', 'confirmed')) then
    raise exception 'invalid_transition';
  end if;
  if p_status = 'confirmed' and nullif(trim(p_meeting_url), '') is null then
    raise exception 'meeting_url_required';
  end if;
  if nullif(trim(p_meeting_url), '') is not null
     and trim(p_meeting_url) !~* '^https://[^[:space:]]+$' then
    raise exception 'invalid_meeting_url';
  end if;
  update public.bookings set
    status = p_status,
    meeting_url = coalesce(nullif(trim(p_meeting_url), ''), meeting_url),
    expert_note = nullif(trim(p_expert_note), ''),
    updated_at = now()
  where id = p_booking_id;
  insert into public.audit_events (actor_id, expert_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), booking_row.expert_id, 'booking.' || p_status, 'booking', p_booking_id,
    jsonb_build_object('admin_on_behalf', public.is_admin()));
end;
$$;

create or replace function public.cancel_booking(p_booking_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare booking_row public.bookings%rowtype;
begin
  select * into booking_row from public.bookings where id = p_booking_id for update;
  if not found or booking_row.member_id <> auth.uid() then raise exception 'not_allowed'; end if;
  if booking_row.status not in ('requested', 'confirmed') then raise exception 'not_cancellable'; end if;
  if booking_row.starts_at < now() + interval '48 hours' then raise exception 'cancellation_window_closed'; end if;
  update public.bookings set status = 'cancelled_member', updated_at = now() where id = p_booking_id;
  insert into public.audit_events (actor_id, expert_id, action, entity_type, entity_id)
  values (auth.uid(), booking_row.expert_id, 'booking.cancelled_member', 'booking', p_booking_id);
end;
$$;

create or replace function public.reschedule_booking(
  p_booking_id uuid,
  p_starts_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  booking_row public.bookings%rowtype;
  p_ends_at timestamptz := p_starts_at + interval '45 minutes';
begin
  select * into booking_row from public.bookings where id = p_booking_id for update;
  if not found or booking_row.member_id <> auth.uid() then raise exception 'not_allowed'; end if;
  if booking_row.status not in ('requested', 'confirmed') then raise exception 'not_reschedulable'; end if;
  if booking_row.starts_at < now() + interval '48 hours' then raise exception 'reschedule_window_closed'; end if;
  if p_starts_at < now() + interval '24 hours' then raise exception 'booking_too_soon'; end if;
  if not exists (
    select 1 from public.availability_rules ar
    where ar.expert_id = booking_row.expert_id and ar.active
      and ar.weekday = extract(dow from p_starts_at at time zone ar.timezone)::smallint
      and (p_starts_at at time zone ar.timezone)::time >= ar.start_time
      and (p_ends_at at time zone ar.timezone)::time <= ar.end_time
  ) then raise exception 'outside_availability'; end if;
  if exists (
    select 1 from public.availability_exceptions ae
    where ae.expert_id = booking_row.expert_id and ae.kind = 'blocked'
      and tstzrange(ae.starts_at, ae.ends_at, '[)') && tstzrange(p_starts_at, p_ends_at, '[)')
  ) then raise exception 'slot_blocked'; end if;

  update public.bookings
  set starts_at = p_starts_at, ends_at = p_ends_at, status = 'requested',
      meeting_url = null, updated_at = now()
  where id = p_booking_id;
  insert into public.audit_events (actor_id, expert_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), booking_row.expert_id, 'booking.rescheduled', 'booking', p_booking_id,
    jsonb_build_object('old_starts_at', booking_row.starts_at, 'new_starts_at', p_starts_at));
exception when exclusion_violation then
  raise exception 'slot_taken';
end;
$$;

-- Persist a completed chat turn as one database transaction. The Edge Function
-- calls this only after the provider stream finishes, so a failed generation
-- cannot leave a user-only half turn behind. The advisory lock also makes a
-- repeated request_id idempotent while two requests are in flight.
create or replace function public.persist_chat_round(
  p_owner_id uuid,
  p_conversation_id uuid,
  p_expert_id uuid,
  p_persona text,
  p_request_id text,
  p_question text,
  p_answer text,
  p_answer_basis text,
  p_coverage text,
  p_citations jsonb default '[]'::jsonb,
  p_persona_version_id uuid default null,
  p_retrieval jsonb default '[]'::jsonb,
  p_provider_usage jsonb default '{}'::jsonb,
  p_model text default null,
  p_latency_ms integer default null,
  p_provider_request_id text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  assistant_id uuid;
begin
  if p_answer_basis not in ('knowledge', 'general') then raise exception 'invalid_answer_basis'; end if;
  if p_coverage not in ('high', 'medium', 'none') then raise exception 'invalid_coverage'; end if;
  if not exists (
    select 1 from public.conversations c
    where c.id = p_conversation_id
      and c.owner_id = p_owner_id
      and c.expert_id = p_expert_id
      and c.persona = p_persona
  ) then raise exception 'conversation_mismatch'; end if;

  perform pg_advisory_xact_lock(hashtextextended(p_conversation_id::text || ':' || p_request_id, 0));
  select id into assistant_id from public.messages
  where conversation_id = p_conversation_id and request_id = p_request_id and role = 'assistant';
  if found then return assistant_id; end if;

  insert into public.messages (
    conversation_id, role, content, source, request_id
  ) values (
    p_conversation_id, 'user', left(p_question, 800), 'user', p_request_id
  );

  insert into public.messages (
    conversation_id, role, content, source, citations, request_id,
    answer_basis, coverage, persona_version_id, retrieval, provider_usage
  ) values (
    p_conversation_id, 'assistant', p_answer,
    case when p_answer_basis = 'knowledge' then 'kb' else 'llm' end,
    coalesce(p_citations, '[]'::jsonb), p_request_id, p_answer_basis,
    p_coverage, p_persona_version_id, coalesce(p_retrieval, '[]'::jsonb),
    coalesce(p_provider_usage, '{}'::jsonb)
  ) returning id into assistant_id;

  update public.conversations
  set updated_at = now(), title = coalesce(nullif(title, ''), left(p_question, 80))
  where id = p_conversation_id;

  insert into public.leads (
    user_id, owner_id, persona, score, signals, questions, last_activity_at
  ) values (
    p_owner_id, p_owner_id, p_persona, 5, array['asked_question'],
    jsonb_build_array(left(p_question, 800)), now()
  ) on conflict (owner_id, persona) do update set
    score = coalesce(public.leads.score, 0) + 5,
    signals = array(select distinct unnest(coalesce(public.leads.signals, '{}') || array['asked_question'])),
    questions = coalesce(public.leads.questions, '[]'::jsonb) || jsonb_build_array(left(p_question, 800)),
    last_activity_at = now();

  if p_coverage = 'none' and p_persona <> 'platform' then
    insert into public.knowledge_gaps (expert_id, conversation_id, message_id, question)
    values (p_expert_id, p_conversation_id, assistant_id, left(p_question, 800));
  end if;

  insert into public.usage_logs (
    provider, endpoint, model, input_tokens, output_tokens, tokens,
    latency_ms, request_id, status
  ) values (
    'minimax', '/chat/completions', p_model,
    nullif(p_provider_usage->>'prompt_tokens', '')::integer,
    nullif(p_provider_usage->>'completion_tokens', '')::integer,
    nullif(p_provider_usage->>'total_tokens', '')::integer,
    p_latency_ms, p_provider_request_id, 'ok'
  );

  return assistant_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS and grants.
-- ---------------------------------------------------------------------------

alter table public.account_access enable row level security;
alter table public.experts enable row level security;
alter table public.expert_persona_versions enable row level security;
alter table public.knowledge_sources enable row level security;
alter table public.knowledge_revisions enable row level security;
alter table public.knowledge_chunks enable row level security;
alter table public.distillation_jobs enable row level security;
alter table public.audit_events enable row level security;
alter table public.knowledge_gaps enable row level security;
alter table public.availability_rules enable row level security;
alter table public.availability_exceptions enable row level security;
alter table public.bookings enable row level security;
alter table public.chat_rate_limits enable row level security;

create policy "account_access_read_own" on public.account_access
for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "account_access_admin_all" on public.account_access
for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "experts_public_active" on public.experts
for select using (status = 'active' or public.owns_expert(id));
create policy "experts_admin_all" on public.experts
for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "persona_owner_all" on public.expert_persona_versions
for all to authenticated using (public.owns_expert(expert_id)) with check (public.owns_expert(expert_id));

create policy "knowledge_sources_owner_all" on public.knowledge_sources
for all to authenticated using (public.owns_expert(expert_id)) with check (public.owns_expert(expert_id));
create policy "knowledge_revisions_owner_all" on public.knowledge_revisions
for all to authenticated using (exists (
  select 1 from public.knowledge_sources s where s.id = source_id and public.owns_expert(s.expert_id)
)) with check (exists (
  select 1 from public.knowledge_sources s where s.id = source_id and public.owns_expert(s.expert_id)
));
create policy "knowledge_chunks_owner_read" on public.knowledge_chunks
for select to authenticated using (public.owns_expert(expert_id));
create policy "distillation_jobs_owner_read" on public.distillation_jobs
for select to authenticated using (exists (
  select 1 from public.knowledge_revisions r
  join public.knowledge_sources s on s.id = r.source_id
  where r.id = revision_id and public.owns_expert(s.expert_id)
));
create policy "audit_owner_read" on public.audit_events
for select to authenticated using (expert_id is not null and public.owns_expert(expert_id));
create policy "knowledge_gaps_owner_all" on public.knowledge_gaps
for all to authenticated using (public.owns_expert(expert_id)) with check (public.owns_expert(expert_id));

create policy "availability_public_read" on public.availability_rules
for select using (active and exists (select 1 from public.experts e where e.id = expert_id and e.status = 'active'));
create policy "availability_owner_all" on public.availability_rules
for all to authenticated using (public.owns_expert(expert_id)) with check (public.owns_expert(expert_id));
create policy "exceptions_public_available" on public.availability_exceptions
for select using (kind = 'available');
create policy "exceptions_owner_all" on public.availability_exceptions
for all to authenticated using (public.owns_expert(expert_id)) with check (public.owns_expert(expert_id));
create policy "bookings_member_read" on public.bookings
for select to authenticated using (member_id = auth.uid());
create policy "bookings_expert_read" on public.bookings
for select to authenticated using (public.owns_expert(expert_id));
create policy "bookings_expert_update" on public.bookings
for update to authenticated using (public.owns_expert(expert_id)) with check (public.owns_expert(expert_id));

drop policy if exists "ek_public_read_active" on public.expert_knowledge;

drop policy if exists "expert_kb_upload_own" on storage.objects;
drop policy if exists "expert_kb_read_own" on storage.objects;
drop policy if exists "expert_kb_delete_own" on storage.objects;
create policy "expert_kb_upload_own" on storage.objects
for insert to authenticated with check (
  bucket_id = 'expert-kb'
  and exists (
    select 1 from public.experts e
    where e.slug = (storage.foldername(name))[1] and public.owns_expert(e.id)
  )
);
create policy "expert_kb_read_own" on storage.objects
for select to authenticated using (
  bucket_id = 'expert-kb'
  and exists (
    select 1 from public.experts e
    where e.slug = (storage.foldername(name))[1] and public.owns_expert(e.id)
  )
);
create policy "expert_kb_delete_own" on storage.objects
for delete to authenticated using (
  bucket_id = 'expert-kb'
  and exists (
    select 1 from public.experts e
    where e.slug = (storage.foldername(name))[1] and public.owns_expert(e.id)
  )
);

grant execute on function public.create_knowledge_source(text, text, text, text, text, text, text[]) to authenticated;
grant execute on function public.review_knowledge_revision(uuid, text, text) to authenticated;
grant execute on function public.rollback_knowledge_source(uuid, uuid) to authenticated;
grant execute on function public.publish_persona_version(uuid, text, jsonb, jsonb, jsonb) to authenticated;
grant execute on function public.create_booking(text, timestamptz, uuid, text, text) to authenticated;
grant execute on function public.cancel_booking(uuid) to authenticated;
grant execute on function public.reschedule_booking(uuid, timestamptz) to authenticated;
grant execute on function public.list_available_slots(text, date, date) to authenticated;
grant execute on function public.update_booking_status(uuid, text, text, text) to authenticated;
revoke all on function public.match_expert_knowledge(uuid, extensions.halfvec, integer, double precision) from public, anon, authenticated;
grant execute on function public.match_expert_knowledge(uuid, extensions.halfvec, integer, double precision) to service_role;
revoke all on function public.claim_distillation_jobs(text, integer) from public, anon, authenticated;
grant execute on function public.claim_distillation_jobs(text, integer) to service_role;
revoke all on function public.check_chat_rate_limit(uuid, integer) from public, anon, authenticated;
grant execute on function public.check_chat_rate_limit(uuid, integer) to service_role;
revoke all on function public.requeue_stuck_distillation_jobs() from public, anon, authenticated;
grant execute on function public.requeue_stuck_distillation_jobs() to service_role;
revoke all on function public.purge_expired_anonymous_chats() from public, anon, authenticated;
grant execute on function public.purge_expired_anonymous_chats() to service_role;
revoke all on function public.invoke_knowledge_worker() from public, anon, authenticated;
grant execute on function public.invoke_knowledge_worker() to service_role;
revoke all on function public.persist_chat_round(uuid, uuid, uuid, text, text, text, text, text, text, jsonb, uuid, jsonb, jsonb, text, integer, text) from public, anon, authenticated;
grant execute on function public.persist_chat_round(uuid, uuid, uuid, text, text, text, text, text, text, jsonb, uuid, jsonb, jsonb, text, integer, text) to service_role;

do $$
begin
  perform cron.unschedule(jobid) from cron.job
  where jobname in (
    'aigro-run-distillation-worker',
    'aigro-requeue-stuck-distillation',
    'aigro-purge-anonymous-chats'
  );
  perform cron.schedule(
    'aigro-run-distillation-worker',
    '* * * * *',
    'select public.invoke_knowledge_worker()'
  );
  perform cron.schedule(
    'aigro-requeue-stuck-distillation',
    '* * * * *',
    'select public.requeue_stuck_distillation_jobs()'
  );
  perform cron.schedule(
    'aigro-purge-anonymous-chats',
    '17 3 * * *',
    'select public.purge_expired_anonymous_chats()'
  );
end $$;

-- Touch triggers.
drop trigger if exists account_access_touch on public.account_access;
create trigger account_access_touch before update on public.account_access
for each row execute function public.touch_updated_at();
drop trigger if exists experts_touch on public.experts;
create trigger experts_touch before update on public.experts
for each row execute function public.touch_updated_at();
drop trigger if exists knowledge_sources_touch on public.knowledge_sources;
create trigger knowledge_sources_touch before update on public.knowledge_sources
for each row execute function public.touch_updated_at();
drop trigger if exists distillation_jobs_touch on public.distillation_jobs;
create trigger distillation_jobs_touch before update on public.distillation_jobs
for each row execute function public.touch_updated_at();
drop trigger if exists bookings_touch on public.bookings;
create trigger bookings_touch before update on public.bookings
for each row execute function public.touch_updated_at();
drop trigger if exists bookings_notify on public.bookings;
create trigger bookings_notify
after insert or update on public.bookings
for each row execute function public.notify_booking_change();
drop trigger if exists distillation_jobs_invoke_worker on public.distillation_jobs;
create trigger distillation_jobs_invoke_worker
after insert on public.distillation_jobs
for each statement execute function public.notify_distillation_worker();
