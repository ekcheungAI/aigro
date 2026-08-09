-- Scale AIGRO to twenty isolated instructor workspaces, close browser write
-- paths that could poison chat/CRM data, and add a consented social-sync queue.
-- Provider credentials remain Edge Function secrets and never enter public rows.

-- ---------------------------------------------------------------------------
-- Instructor capacity, public projection and ownership invariants.
-- ---------------------------------------------------------------------------

alter table public.experts
  add column if not exists public_profile_enabled boolean not null default false,
  add column if not exists archived_at timestamptz;

-- Authorization and instructor ownership are master-admin controls. Retire the
-- earlier ordinary-admin write policies; otherwise account_access can bypass
-- the audited owner/invitation workflow with a direct REST update.
drop policy if exists account_access_admin_insert_member_expert
on public.account_access;
drop policy if exists account_access_admin_update_member_expert
on public.account_access;

update public.experts
set public_profile_enabled = true
where status = 'active' and coalesce(verified, false);

do $$
begin
  if (
    select count(*) from public.experts
    where slug <> 'platform' and archived_at is null
  ) > 20 then
    raise exception 'existing_instructor_count_exceeds_capacity'
      using errcode = '23514';
  end if;
end;
$$;

create or replace function public.enforce_instructor_capacity()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  instructor_count integer;
begin
  if tg_op = 'UPDATE' then
    if old.slug = 'platform' and new.slug is distinct from old.slug then
      raise exception 'platform_slug_immutable' using errcode = '23514';
    end if;
    if old.slug <> 'platform' and new.slug = 'platform' then
      raise exception 'platform_slug_reserved' using errcode = '23514';
    end if;
    if old.archived_at is not null and new.archived_at is null then
      perform pg_advisory_xact_lock(hashtextextended('aigro:instructor-capacity', 0));
      select count(*) into instructor_count
      from public.experts
      where slug <> 'platform' and archived_at is null and id <> old.id;
      if instructor_count >= 20 then
        raise exception 'instructor_capacity_reached' using errcode = 'P0001';
      end if;
    end if;
    -- Renaming or archiving one instructor does not consume a new seat.
    return new;
  end if;
  if new.slug = 'platform' then
    raise exception 'platform_slug_reserved' using errcode = '23514';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('aigro:instructor-capacity', 0));
  select count(*) into instructor_count
  from public.experts
  where slug <> 'platform' and archived_at is null;
  if instructor_count >= 20 then
    raise exception 'instructor_capacity_reached' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_instructor_capacity()
from public, anon, authenticated;

drop trigger if exists experts_enforce_capacity on public.experts;
create trigger experts_enforce_capacity
before insert or update of slug, archived_at on public.experts
for each row execute function public.enforce_instructor_capacity();

create or replace function public.protect_platform_expert_delete()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if old.slug = 'platform' then
    raise exception 'platform_expert_is_reserved' using errcode = '23514';
  end if;
  return old;
end;
$$;

revoke all on function public.protect_platform_expert_delete()
from public, anon, authenticated;
drop trigger if exists experts_protect_platform_delete on public.experts;
create trigger experts_protect_platform_delete
before delete on public.experts
for each row execute function public.protect_platform_expert_delete();

-- An instructor account can own one workspace and a workspace can have one
-- v1 owner. This keeps account_access as the authorization source while the
-- owner_user_id column remains a synchronized notification mirror.
-- Safely retire inconsistent legacy mirrors before enforcing the invariant.
update public.account_access
set expert_id = null
where app_role <> 'expert' and expert_id is not null;

update public.account_access
set app_role = 'member', expert_id = null
where app_role = 'expert' and expert_id is null;

do $$
begin
  if exists (
    select 1
    from public.account_access
    where app_role = 'expert' and expert_id is not null
    group by expert_id
    having count(*) > 1
  ) then
    raise exception 'duplicate_expert_owners_require_manual_reconciliation'
      using errcode = '23505';
  end if;
end;
$$;

create unique index if not exists account_access_one_owner_per_expert
on public.account_access(expert_id)
where app_role = 'expert' and expert_id is not null;

alter table public.account_access
  drop constraint if exists account_access_expert_role_consistency;
alter table public.account_access
  add constraint account_access_expert_role_consistency
  check ((app_role = 'expert') = (expert_id is not null));

create or replace function public.sync_expert_owner_mirror()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'DELETE' and old.app_role = 'expert' and old.expert_id is not null then
    update public.experts
    set owner_user_id = null
    where id = old.expert_id and owner_user_id = old.user_id;
  elsif tg_op = 'UPDATE'
     and old.app_role = 'expert'
     and old.expert_id is not null
     and row(new.app_role, new.expert_id) is distinct from row(old.app_role, old.expert_id) then
    update public.experts
    set owner_user_id = null
    where id = old.expert_id and owner_user_id = old.user_id;
  end if;

  if tg_op <> 'DELETE' and new.app_role = 'expert' and new.expert_id is not null then
    update public.experts
    set owner_user_id = new.user_id
    where id = new.expert_id;
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke all on function public.sync_expert_owner_mirror()
from public, anon, authenticated;

drop trigger if exists account_access_sync_expert_owner on public.account_access;
create trigger account_access_sync_expert_owner
after insert or delete or update of app_role, expert_id on public.account_access
for each row execute function public.sync_expert_owner_mirror();

-- Backfill the mirror from the protected authorization table.
update public.experts e
set owner_user_id = null
where owner_user_id is not null
  and not exists (
    select 1
    from public.account_access aa
    where aa.user_id = e.owner_user_id
      and aa.app_role = 'expert'
      and aa.expert_id = e.id
  );

update public.experts e
set owner_user_id = aa.user_id
from public.account_access aa
where aa.app_role = 'expert'
  and aa.expert_id = e.id
  and e.owner_user_id is distinct from aa.user_id;

create or replace function public.assign_expert_owner(
  p_expert_id uuid,
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  target_access public.account_access%rowtype;
  previous_owner uuid;
  previous_expert uuid;
  target_slug text;
begin
  if not public.is_super_admin() then
    raise exception 'super_admin_required' using errcode = '42501';
  end if;
  if p_expert_id is null or p_user_id is null then
    raise exception 'expert_and_user_required' using errcode = '22023';
  end if;

  select slug into target_slug from public.experts
  where id = p_expert_id and archived_at is null
  for update;
  if not found then raise exception 'expert_not_found' using errcode = 'P0002'; end if;
  if target_slug = 'platform' then
    raise exception 'platform_expert_is_reserved' using errcode = '23514';
  end if;
  select * into target_access
  from public.account_access
  where user_id = p_user_id
  for update;
  if not found then raise exception 'account_not_found' using errcode = 'P0002'; end if;
  if target_access.app_role in ('admin', 'super_admin') then
    raise exception 'admin_cannot_be_expert_owner' using errcode = '22023';
  end if;

  select owner_user_id into previous_owner
  from public.experts where id = p_expert_id;
  previous_expert := target_access.expert_id;

  if previous_owner is not null and previous_owner <> p_user_id then
    update public.account_access
    set app_role = 'member', expert_id = null
    where user_id = previous_owner
      and app_role = 'expert'
      and expert_id = p_expert_id;
  end if;

  if previous_expert is not null and previous_expert <> p_expert_id then
    update public.experts
    set owner_user_id = null
    where id = previous_expert and owner_user_id = p_user_id;
  end if;

  update public.account_access
  set app_role = 'expert', expert_id = p_expert_id
  where user_id = p_user_id;
  update public.experts
  set owner_user_id = p_user_id
  where id = p_expert_id;

  insert into public.audit_events (
    actor_id, expert_id, action, entity_type, entity_id, metadata
  ) values (
    auth.uid(), p_expert_id, 'expert.owner_assigned', 'expert', p_expert_id,
    jsonb_build_object(
      'user_id', p_user_id,
      'previous_owner_id', previous_owner,
      'previous_expert_id', previous_expert
    )
  );
end;
$$;

revoke all on function public.assign_expert_owner(uuid, uuid)
from public, anon, authenticated;
grant execute on function public.assign_expert_owner(uuid, uuid) to authenticated;

create or replace function public.assign_expert_owner_with_tier(
  p_expert_id uuid,
  p_user_id uuid,
  p_tier text
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if not public.is_super_admin() then
    raise exception 'super_admin_required' using errcode = '42501';
  end if;
  if p_tier not in ('free', 'pro', 'vip') then
    raise exception 'invalid_tier' using errcode = '22023';
  end if;
  perform public.assign_expert_owner(p_expert_id, p_user_id);
  update public.account_access
  set tier = p_tier
  where user_id = p_user_id;
end;
$$;

revoke all on function public.assign_expert_owner_with_tier(uuid, uuid, text)
from public, anon, authenticated;
grant execute on function public.assign_expert_owner_with_tier(uuid, uuid, text)
to authenticated;

create table if not exists public.expert_invitations (
  id uuid primary key default gen_random_uuid(),
  expert_id uuid not null references public.experts(id) on delete cascade,
  email text not null,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'revoked', 'expired', 'cancelled')),
  invited_by uuid references auth.users(id) on delete set null,
  accepted_user_id uuid references auth.users(id) on delete set null,
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  revoked_at timestamptz,
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (email = lower(btrim(email))),
  check (char_length(email) between 3 and 254)
);
create unique index if not exists expert_invitations_one_pending_expert_idx
on public.expert_invitations(expert_id)
where status = 'pending';
create index if not exists expert_invitations_email_status_idx
on public.expert_invitations(email, status, expires_at);

alter table public.expert_invitations
  drop constraint if exists expert_invitations_state_consistency;
alter table public.expert_invitations
  add constraint expert_invitations_state_consistency check (
    (status = 'pending' and accepted_at is null and accepted_user_id is null and revoked_at is null)
    or (status = 'accepted' and accepted_at is not null and revoked_at is null)
    or (status = 'revoked' and revoked_at is not null and accepted_at is null and accepted_user_id is null)
    or status in ('expired', 'cancelled')
  );

create or replace function public.revoke_pending_expert_invitations_on_owner()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.owner_user_id is not null
     and new.owner_user_id is distinct from old.owner_user_id then
    update public.expert_invitations
    set status = 'revoked', revoked_at = now(), updated_at = now()
    where expert_id = new.id and status = 'pending';
  end if;
  return new;
end;
$$;

revoke all on function public.revoke_pending_expert_invitations_on_owner()
from public, anon, authenticated;
drop trigger if exists experts_revoke_pending_invites_on_owner on public.experts;
create trigger experts_revoke_pending_invites_on_owner
after update of owner_user_id on public.experts
for each row execute function public.revoke_pending_expert_invitations_on_owner();

alter table public.expert_invitations enable row level security;
drop policy if exists expert_invitations_admin_read on public.expert_invitations;
create policy expert_invitations_admin_read on public.expert_invitations
for select to authenticated using (public.is_admin());
revoke all on public.expert_invitations from anon, authenticated;
grant select on public.expert_invitations to authenticated;
grant all on public.expert_invitations to service_role;

create or replace function public.create_expert_invitation(
  p_expert_id uuid,
  p_email text
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  normalized_email text := lower(btrim(coalesce(p_email, '')));
  invitation_id uuid;
begin
  if not public.is_super_admin() then
    raise exception 'super_admin_required' using errcode = '42501';
  end if;
  if normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
     or char_length(normalized_email) > 254 then
    raise exception 'invalid_email' using errcode = '22023';
  end if;
  perform 1 from public.experts
  where id = p_expert_id and slug <> 'platform' and archived_at is null
  for update;
  if not found then raise exception 'expert_not_found' using errcode = 'P0002'; end if;
  if exists (
    select 1 from public.account_access
    where expert_id = p_expert_id and app_role = 'expert'
  ) then
    raise exception 'expert_already_owned' using errcode = '23505';
  end if;

  update public.expert_invitations
  set status = 'expired', updated_at = now()
  where expert_id = p_expert_id
    and status = 'pending'
    and expires_at <= now();
  -- A deliberate super-admin resend supersedes the previous pending link. The
  -- old token becomes unusable before the new provider invitation is issued.
  update public.expert_invitations
  set status = 'cancelled', failure_reason = 'superseded_by_resend',
      updated_at = now()
  where expert_id = p_expert_id and status = 'pending';

  insert into public.expert_invitations (
    expert_id, email, invited_by
  ) values (
    p_expert_id, normalized_email, auth.uid()
  ) returning id into invitation_id;
  insert into public.audit_events (
    actor_id, expert_id, action, entity_type, entity_id, metadata
  ) values (
    auth.uid(), p_expert_id, 'expert.invitation_created',
    'expert_invitation', invitation_id,
    jsonb_build_object('email_domain', split_part(normalized_email, '@', 2))
  );
  return invitation_id;
end;
$$;

create or replace function public.cancel_expert_invitation(
  p_invitation_id uuid,
  p_reason text default 'delivery_failed'
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  invitation_row public.expert_invitations%rowtype;
begin
  if auth.role() <> 'service_role' and not public.is_super_admin() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  select * into invitation_row from public.expert_invitations
  where id = p_invitation_id for update;
  if not found then return; end if;
  if invitation_row.status = 'pending' then
    update public.expert_invitations
    set status = 'cancelled', failure_reason = left(coalesce(p_reason, 'delivery_failed'), 120),
        updated_at = now()
    where id = p_invitation_id;
    insert into public.audit_events (
      actor_id, expert_id, action, entity_type, entity_id, metadata
    ) values (
      auth.uid(), invitation_row.expert_id, 'expert.invitation_cancelled',
      'expert_invitation', p_invitation_id,
      jsonb_build_object('reason', left(coalesce(p_reason, 'delivery_failed'), 120))
    );
  end if;
end;
$$;

create or replace function public.list_my_expert_invitations()
returns table (
  id uuid,
  expert_id uuid,
  expert_name text,
  expert_slug text,
  expires_at timestamptz
)
language sql
security definer
stable
set search_path = pg_catalog, public
as $$
  select i.id, i.expert_id, e.display_name, e.slug, i.expires_at
  from public.expert_invitations i
  join public.experts e on e.id = i.expert_id
  join auth.users u on u.id = auth.uid()
  where i.status = 'pending'
    and i.expires_at > now()
    and e.archived_at is null
    and u.email_confirmed_at is not null
    and i.email = lower(btrim(coalesce(u.email, '')))
  order by i.created_at desc;
$$;

create or replace function public.accept_expert_invitation(p_invitation_id uuid)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  caller_id uuid := auth.uid();
  caller_email text;
  invitation_row public.expert_invitations%rowtype;
  access_row public.account_access%rowtype;
begin
  if caller_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  select lower(btrim(coalesce(email, ''))) into caller_email
  from auth.users
  where id = caller_id and email_confirmed_at is not null;
  if not found or caller_email = '' then
    raise exception 'verified_email_required' using errcode = '42501';
  end if;
  select * into invitation_row from public.expert_invitations
  where id = p_invitation_id for update;
  if not found then raise exception 'invitation_not_found' using errcode = 'P0002'; end if;
  if invitation_row.status <> 'pending' then
    raise exception 'invitation_not_pending' using errcode = '23514';
  end if;
  if invitation_row.expires_at <= now() then
    -- Do not pretend an UPDATE survives the exception transaction. Expired
    -- rows are hidden from the recipient and are marked expired atomically by
    -- the next create/cleanup workflow.
    raise exception 'invitation_expired' using errcode = '23514';
  end if;
  if invitation_row.email <> caller_email then
    raise exception 'invitation_email_mismatch' using errcode = '42501';
  end if;
  perform 1 from public.experts
  where id = invitation_row.expert_id and archived_at is null
  for update;
  if not found then
    raise exception 'invitation_expert_unavailable' using errcode = '23514';
  end if;
  if exists (
    select 1 from public.account_access
    where expert_id = invitation_row.expert_id and app_role = 'expert'
  ) then
    raise exception 'expert_already_owned' using errcode = '23505';
  end if;
  select * into access_row from public.account_access
  where user_id = caller_id for update;
  if not found then raise exception 'account_access_missing' using errcode = 'P0002'; end if;
  if access_row.app_role in ('admin', 'super_admin') then
    raise exception 'admin_cannot_accept_expert_invitation' using errcode = '23514';
  end if;
  if access_row.app_role = 'expert' and access_row.expert_id is distinct from invitation_row.expert_id then
    raise exception 'user_already_owns_expert' using errcode = '23505';
  end if;

  -- Mark this invitation accepted before the account-access mirror trigger
  -- assigns the owner and revokes every *other* pending invitation.
  update public.expert_invitations
  set status = 'accepted', accepted_user_id = caller_id,
      accepted_at = now(), revoked_at = null, failure_reason = null,
      updated_at = now()
  where id = p_invitation_id;
  update public.account_access
  set app_role = 'expert', expert_id = invitation_row.expert_id
  where user_id = caller_id;
  update public.expert_invitations
  set status = 'revoked', revoked_at = now(), updated_at = now()
  where expert_id = invitation_row.expert_id
    and id <> p_invitation_id and status = 'pending';
  insert into public.audit_events (
    actor_id, expert_id, action, entity_type, entity_id, metadata
  ) values (
    caller_id, invitation_row.expert_id, 'expert.invitation_accepted',
    'expert_invitation', p_invitation_id, '{}'::jsonb
  );
  return invitation_row.expert_id;
end;
$$;

revoke all on function public.create_expert_invitation(uuid, text)
from public, anon, authenticated;
revoke all on function public.cancel_expert_invitation(uuid, text)
from public, anon, authenticated;
revoke all on function public.list_my_expert_invitations()
from public, anon, authenticated;
revoke all on function public.accept_expert_invitation(uuid)
from public, anon, authenticated;
grant execute on function public.create_expert_invitation(uuid, text) to authenticated;
grant execute on function public.cancel_expert_invitation(uuid, text) to service_role;
grant execute on function public.list_my_expert_invitations() to authenticated;
grant execute on function public.accept_expert_invitation(uuid) to authenticated;

drop trigger if exists expert_invitations_touch on public.expert_invitations;
create trigger expert_invitations_touch
before update on public.expert_invitations
for each row execute function public.touch_updated_at();

-- Public clients receive only an explicitly sanitized projection. Base expert
-- rows are visible only to their owner/admin, preventing exposure of owner UUID,
-- rollout flags and internal version pointers.
drop policy if exists experts_public_active on public.experts;
drop policy if exists experts_owner_read on public.experts;
create policy experts_owner_read on public.experts
for select to authenticated
using (public.owns_expert(id));

create or replace function public.has_current_passed_persona_evaluation(
  p_expert_id uuid,
  p_persona_version_id uuid
)
returns boolean
language sql
security definer
stable
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.persona_evaluation_runs r
    join public.persona_synthesis_jobs j on j.id = r.synthesis_job_id
    where j.expert_id = p_expert_id
      and j.persona_version_id = p_persona_version_id
      and r.status = 'passed'
      and jsonb_typeof(r.report #> '{evaluation,question_ids}') = 'array'
      and jsonb_array_length(r.report #> '{evaluation,question_ids}') >= 25
      and (r.report #>> '{evaluation,question_count}')::integer
        = jsonb_array_length(r.report #> '{evaluation,question_ids}')
      and (r.report #>> '{evaluation,response_count}')::integer
        = jsonb_array_length(r.report #> '{evaluation,question_ids}')
      and jsonb_array_length(r.report #> '{evaluation,question_ids}') = (
        select count(*)
        from public.persona_evaluation_questions current_q
        where current_q.expert_id = p_expert_id and current_q.active
      )
      and not exists (
        select 1
        from public.persona_evaluation_questions q
        where q.expert_id = p_expert_id
          and q.active
          and not ((r.report #> '{evaluation,question_ids}') ? q.id::text)
      )
  );
$$;

revoke all on function public.has_current_passed_persona_evaluation(uuid, uuid)
from public, anon, authenticated;
grant execute on function public.has_current_passed_persona_evaluation(uuid, uuid)
to service_role;

create or replace function public.is_expert_chat_ready(p_expert_id uuid)
returns boolean
language sql
security definer
stable
set search_path = pg_catalog, public
as $$
  select coalesce((
    select case
      -- The platform persona is served by the reviewed static FAQ engine. It is
      -- deliberately not routable through the instructor model until it has a
      -- published persona/corpus/evaluation release of its own.
      when e.slug = 'platform' then false
      else e.status = 'active'
        and e.archived_at is null
        and e.public_profile_enabled
        and e.verified
        and exists (
          select 1 from public.account_access aa
          where aa.expert_id = e.id and aa.app_role = 'expert'
        )
        and coalesce((e.feature_flags ->> 'rag_enabled')::boolean, false)
        and e.published_persona_version_id is not null
        and exists (
          select 1
          from public.expert_persona_versions epv
          where epv.id = e.published_persona_version_id
            and epv.expert_id = e.id
            and epv.status = 'published'
        )
        and exists (
          select 1
          from public.knowledge_sources ks
          join public.knowledge_revisions kr
            on kr.id = ks.published_revision_id
          join public.knowledge_chunks kc
            on kc.revision_id = kr.id and kc.expert_id = e.id
          where ks.expert_id = e.id
            and ks.archived_at is null
            and kr.status = 'approved'
            and kc.embedding is not null
        )
        and 2 <= (
          select count(*)
          from public.knowledge_sources ks
          join public.knowledge_revisions kr
            on kr.id = ks.published_revision_id and kr.source_id = ks.id
          where ks.expert_id = e.id
            and ks.archived_at is null
            and kr.status = 'approved'
        )
        and 25 <= (
          select count(*) from public.persona_evaluation_questions q
          where q.expert_id = e.id and q.active
        )
        and public.has_current_passed_persona_evaluation(
          e.id, e.published_persona_version_id
        )
    end
    from public.experts e
    where e.id = p_expert_id
  ), false);
$$;

revoke all on function public.is_expert_chat_ready(uuid)
from public, anon, authenticated;
grant execute on function public.is_expert_chat_ready(uuid) to service_role;

create or replace function public.list_public_instructors()
returns table (
  id uuid,
  slug text,
  display_name text,
  name_en text,
  name_zh text,
  title text,
  bio text,
  brand_color text,
  specialties text[],
  quote text,
  credential text,
  verified boolean,
  radar jsonb,
  traits text[],
  public_profile_enabled boolean,
  greeting text,
  chat_ready boolean
)
language sql
security definer
stable
set search_path = pg_catalog, public
as $$
  select
    e.id, e.slug, e.display_name, e.name_en, e.name_zh, e.title, e.bio,
    e.brand_color, e.specialties, e.quote, e.credential, e.verified,
    e.radar, e.traits, e.public_profile_enabled, epv.greeting,
    public.is_expert_chat_ready(e.id) as chat_ready
  from public.experts e
  left join public.expert_persona_versions epv
    on epv.id = e.published_persona_version_id
   and epv.expert_id = e.id
   and epv.status = 'published'
  where e.slug <> 'platform'
    and e.archived_at is null
    and e.status = 'active'
    and e.public_profile_enabled
  order by e.created_at;
$$;

revoke all on function public.list_public_instructors()
from public, anon, authenticated;
grant execute on function public.list_public_instructors() to anon, authenticated;

create or replace function public.is_public_expert(p_expert_id uuid)
returns boolean
language sql
security definer
stable
set search_path = pg_catalog, public
as $$
  select exists (
    select 1 from public.experts
    where id = p_expert_id
      and archived_at is null
      and status = 'active'
      and public_profile_enabled
  );
$$;

create or replace function public.is_public_expert_slug(p_slug text)
returns boolean
language sql
security definer
stable
set search_path = pg_catalog, public
as $$
  select exists (
    select 1 from public.experts
    where slug = p_slug
      and archived_at is null
      and status = 'active'
      and public_profile_enabled
  );
$$;

revoke all on function public.is_public_expert(uuid)
from public, anon, authenticated;
revoke all on function public.is_public_expert_slug(text)
from public, anon, authenticated;
grant execute on function public.is_public_expert(uuid) to anon, authenticated;
grant execute on function public.is_public_expert_slug(text) to anon, authenticated;

drop policy if exists ep_public_read on public.expert_profiles;
drop policy if exists ep_expert_read_own on public.expert_profiles;
drop policy if exists ep_admin_all on public.expert_profiles;
create policy ep_public_read on public.expert_profiles
for select to anon, authenticated
using (public.is_public_expert_slug(expert_profiles.slug));
create policy ep_expert_read_own on public.expert_profiles
for select to authenticated
using (exists (
  select 1 from public.experts e
  where e.slug = expert_profiles.slug and public.owns_expert(e.id)
));

drop policy if exists availability_public_read on public.availability_rules;
create policy availability_public_read on public.availability_rules
for select to anon, authenticated
using (active and public.is_public_expert(expert_id));
drop policy if exists exceptions_public_available on public.availability_exceptions;
create policy exceptions_public_available on public.availability_exceptions
for select to anon, authenticated
using (kind = 'available' and public.is_public_expert(expert_id));

-- Published instructor identity, persona and knowledge are immutable through
-- the Data API. Owners/admins retain read access and use audited RPCs for every
-- state transition.
drop policy if exists ek_public_read_active on public.expert_knowledge;
drop policy if exists ek_expert_all_own on public.expert_knowledge;
drop policy if exists ek_admin_all on public.expert_knowledge;
revoke all on public.expert_knowledge from anon, authenticated;
grant all on public.expert_knowledge to service_role;

drop policy if exists experts_admin_all on public.experts;
drop policy if exists persona_owner_all on public.expert_persona_versions;
drop policy if exists persona_owner_read on public.expert_persona_versions;
create policy persona_owner_read on public.expert_persona_versions
for select to authenticated using (public.owns_expert(expert_id));
drop policy if exists knowledge_sources_owner_all on public.knowledge_sources;
drop policy if exists knowledge_sources_owner_read on public.knowledge_sources;
create policy knowledge_sources_owner_read on public.knowledge_sources
for select to authenticated using (public.owns_expert(expert_id));
drop policy if exists knowledge_revisions_owner_all on public.knowledge_revisions;
drop policy if exists knowledge_revisions_owner_read on public.knowledge_revisions;
create policy knowledge_revisions_owner_read on public.knowledge_revisions
for select to authenticated using (exists (
  select 1 from public.knowledge_sources s
  where s.id = source_id and public.owns_expert(s.expert_id)
));
drop policy if exists knowledge_gaps_owner_all on public.knowledge_gaps;
drop policy if exists knowledge_gaps_owner_read on public.knowledge_gaps;
create policy knowledge_gaps_owner_read on public.knowledge_gaps
for select to authenticated using (public.owns_expert(expert_id));

-- Defense in depth: legacy migrations granted authenticated users broad table
-- privileges. RLS already denies these writes, but the CMS contract is clearer
-- and safer when browser roles do not possess DML privileges at all.
revoke insert, update, delete on public.expert_persona_versions
from anon, authenticated;
revoke insert, update, delete on public.knowledge_sources
from anon, authenticated;
revoke insert, update, delete on public.knowledge_revisions
from anon, authenticated;
revoke insert, update, delete on public.knowledge_chunks
from anon, authenticated;
revoke insert, update, delete on public.knowledge_gaps
from anon, authenticated;
grant select on public.expert_persona_versions, public.knowledge_sources,
  public.knowledge_revisions, public.knowledge_chunks, public.knowledge_gaps
to authenticated;
grant all on public.expert_persona_versions, public.knowledge_sources,
  public.knowledge_revisions, public.knowledge_chunks, public.knowledge_gaps
to service_role;

create or replace function public.is_safe_knowledge_source_url(
  p_url text,
  p_youtube boolean default false
)
returns boolean
language plpgsql
immutable
set search_path = pg_catalog
as $$
declare
  normalized text := btrim(coalesce(p_url, ''));
  host text;
begin
  if normalized = '' or char_length(normalized) > 2048
     or normalized !~ '^https://'
     or normalized ~ '^https://[^/]*@' then
    return false;
  end if;
  host := lower(substring(normalized from '^https://([^/:?#]+)'));
  if host is null or host = '' or host = 'localhost' or host like '%.local'
     or host like '%.internal' or host like '127.%' or host like '10.%'
     or host like '192.168.%' or host like '169.254.%'
     or host ~ '^172\.(1[6-9]|2[0-9]|3[01])\.'
     or host like '[%' or host = '0.0.0.0' then
    return false;
  end if;
  if p_youtube and host not in (
    'youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be'
  ) then
    return false;
  end if;
  return true;
end;
$$;
revoke all on function public.is_safe_knowledge_source_url(text, boolean)
from public, anon, authenticated;

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
set search_path = pg_catalog, public
as $$
declare
  target_expert public.experts%rowtype;
  new_source public.knowledge_sources%rowtype;
  new_revision public.knowledge_revisions%rowtype;
  normalized_url text := nullif(btrim(coalesce(p_source_url, '')), '');
begin
  select * into target_expert
  from public.experts
  where slug = p_expert_slug and archived_at is null;
  if not found or not public.owns_expert(target_expert.id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if coalesce((target_expert.feature_flags->>'cms_ingestion_enabled')::boolean, false) is false
     and not public.is_admin() then
    raise exception 'cms_ingestion_disabled' using errcode = '42501';
  end if;
  if p_source_type not in ('manual', 'url', 'pdf', 'youtube') then
    raise exception 'invalid_source_type' using errcode = '22023';
  end if;
  if char_length(btrim(coalesce(p_title, ''))) < 2 then
    raise exception 'invalid_title' using errcode = '22023';
  end if;
  if p_source_type = 'manual' and char_length(btrim(coalesce(p_raw_text, ''))) < 20 then
    raise exception 'manual_text_too_short' using errcode = '22023';
  end if;
  if p_source_type in ('url', 'youtube') and not public.is_safe_knowledge_source_url(
    normalized_url, p_source_type = 'youtube'
  ) then
    raise exception 'unsafe_source_url' using errcode = '22023';
  end if;
  if p_source_type = 'pdf' and (
    p_storage_path is null
    or p_storage_path like '/%'
    or p_storage_path like '%..%'
    or p_storage_path not like target_expert.slug || '/%'
  ) then
    raise exception 'invalid_storage_path' using errcode = '22023';
  end if;

  insert into public.knowledge_sources (
    expert_id, source_type, title, source_url, tags, created_by
  ) values (
    target_expert.id, p_source_type, btrim(p_title), normalized_url,
    coalesce(p_tags[1:20], '{}'), auth.uid()
  ) returning * into new_source;
  insert into public.knowledge_revisions (
    source_id, revision_no, raw_text, storage_path, created_by
  ) values (
    new_source.id, 1, nullif(btrim(coalesce(p_raw_text, '')), ''),
    nullif(btrim(coalesce(p_storage_path, '')), ''), auth.uid()
  ) returning * into new_revision;
  insert into public.distillation_jobs (revision_id) values (new_revision.id);
  insert into public.audit_events (
    actor_id, expert_id, action, entity_type, entity_id
  ) values (
    auth.uid(), target_expert.id, 'knowledge.created',
    'knowledge_revision', new_revision.id
  );
  return jsonb_build_object('source_id', new_source.id, 'revision_id', new_revision.id);
end;
$$;
revoke all on function public.create_knowledge_source(
  text, text, text, text, text, text, text[]
) from public, anon, authenticated;
grant execute on function public.create_knowledge_source(
  text, text, text, text, text, text, text[]
) to authenticated;

create or replace function public.set_knowledge_source_archived(
  p_source_id uuid,
  p_archived boolean
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  source_row public.knowledge_sources%rowtype;
begin
  select * into source_row from public.knowledge_sources
  where id = p_source_id for update;
  if not found then raise exception 'knowledge_source_not_found' using errcode = 'P0002'; end if;
  if not public.owns_expert(source_row.expert_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if not coalesce(p_archived, false)
     and source_row.archived_at is not null
     and 'social-sync' = any(coalesce(source_row.tags, '{}')) then
    raise exception 'social_source_requires_new_consent' using errcode = '23514';
  end if;
  update public.knowledge_sources
  set archived_at = case when coalesce(p_archived, false) then now() else null end,
      updated_at = now()
  where id = p_source_id;
  insert into public.audit_events (
    actor_id, expert_id, action, entity_type, entity_id, metadata
  ) values (
    auth.uid(), source_row.expert_id,
    case when coalesce(p_archived, false) then 'knowledge.source_archived'
         else 'knowledge.source_restored' end,
    'knowledge_source', p_source_id, '{}'::jsonb
  );
end;
$$;

create or replace function public.resolve_knowledge_gap(
  p_gap_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  gap_row public.knowledge_gaps%rowtype;
begin
  if p_status not in ('resolved', 'dismissed') then
    raise exception 'invalid_gap_status' using errcode = '22023';
  end if;
  select * into gap_row from public.knowledge_gaps where id = p_gap_id for update;
  if not found then raise exception 'knowledge_gap_not_found' using errcode = 'P0002'; end if;
  if not public.owns_expert(gap_row.expert_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  update public.knowledge_gaps
  set status = p_status, resolved_at = now()
  where id = p_gap_id;
  insert into public.audit_events (
    actor_id, expert_id, action, entity_type, entity_id, metadata
  ) values (
    auth.uid(), gap_row.expert_id, 'knowledge.gap_' || p_status,
    'knowledge_gap', p_gap_id, '{}'::jsonb
  );
end;
$$;

revoke all on function public.set_knowledge_source_archived(uuid, boolean)
from public, anon, authenticated;
revoke all on function public.resolve_knowledge_gap(uuid, text)
from public, anon, authenticated;
grant execute on function public.set_knowledge_source_archived(uuid, boolean)
to authenticated;
grant execute on function public.resolve_knowledge_gap(uuid, text)
to authenticated;

create or replace function public.get_public_instructor_stats(p_slug text)
returns table (
  conversations bigint,
  insights bigint,
  knowledge bigint
)
language sql
security definer
stable
set search_path = pg_catalog, public
as $$
  select
    (select count(*) from public.conversations c where c.expert_id = e.id),
    (select count(*) from public.items i
      where i.expert_slug = e.slug and i.status = 'published'),
    (select count(*) from public.knowledge_sources ks
      where ks.expert_id = e.id
        and ks.archived_at is null
        and ks.published_revision_id is not null)
  from public.experts e
  where e.slug = p_slug
    and e.status = 'active'
    and e.public_profile_enabled;
$$;

revoke all on function public.get_public_instructor_stats(text)
from public, anon, authenticated;
grant execute on function public.get_public_instructor_stats(text) to anon, authenticated;

create or replace function public.resolve_active_expert(p_slug text)
returns uuid
language sql
security definer
stable
set search_path = pg_catalog, public
as $$
  select id
  from public.experts
  where slug = p_slug
    and status = 'active'
    and (slug = 'platform' or public_profile_enabled)
  limit 1;
$$;

revoke all on function public.resolve_active_expert(text)
from public, anon, authenticated;
grant execute on function public.resolve_active_expert(text) to authenticated;

-- Enforce same-instructor/source links at the database boundary.
alter table public.expert_persona_versions
  drop constraint if exists expert_persona_versions_id_expert_unique;
alter table public.expert_persona_versions
  add constraint expert_persona_versions_id_expert_unique unique (id, expert_id);
alter table public.experts
  drop constraint if exists experts_published_persona_version_id_fkey;
alter table public.experts
  drop constraint if exists experts_published_persona_same_expert_fkey;
alter table public.experts
  add constraint experts_published_persona_same_expert_fkey
  foreign key (published_persona_version_id, id)
  references public.expert_persona_versions(id, expert_id)
  on delete set null (published_persona_version_id);

alter table public.knowledge_revisions
  drop constraint if exists knowledge_revisions_id_source_unique;
alter table public.knowledge_revisions
  add constraint knowledge_revisions_id_source_unique unique (id, source_id);
alter table public.knowledge_sources
  drop constraint if exists knowledge_sources_published_revision_id_fkey;
alter table public.knowledge_sources
  drop constraint if exists knowledge_sources_published_revision_same_source_fkey;
alter table public.knowledge_sources
  add constraint knowledge_sources_published_revision_same_source_fkey
  foreign key (published_revision_id, id)
  references public.knowledge_revisions(id, source_id)
  on delete set null (published_revision_id);

alter table public.knowledge_sources
  drop constraint if exists knowledge_sources_id_expert_unique;
alter table public.knowledge_sources
  add constraint knowledge_sources_id_expert_unique unique (id, expert_id);
alter table public.knowledge_chunks
  add column if not exists source_id uuid;
update public.knowledge_chunks kc
set source_id = kr.source_id
from public.knowledge_revisions kr
where kr.id = kc.revision_id and kc.source_id is null;

create or replace function public.set_knowledge_chunk_source()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  expected_source uuid;
  expected_expert uuid;
  source_archived_at timestamptz;
begin
  select kr.source_id, ks.expert_id, ks.archived_at
  into expected_source, expected_expert, source_archived_at
  from public.knowledge_revisions kr
  join public.knowledge_sources ks on ks.id = kr.source_id
  where kr.id = new.revision_id;
  if expected_source is null then
    raise exception 'knowledge_revision_not_found' using errcode = '23503';
  end if;
  if source_archived_at is not null then
    raise exception 'knowledge_source_archived' using errcode = '23514';
  end if;
  new.source_id := expected_source;
  if new.expert_id is distinct from expected_expert then
    raise exception 'knowledge_chunk_expert_mismatch' using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function public.set_knowledge_chunk_source()
from public, anon, authenticated;
drop trigger if exists knowledge_chunks_set_source on public.knowledge_chunks;
create trigger knowledge_chunks_set_source
before insert or update of revision_id, expert_id on public.knowledge_chunks
for each row execute function public.set_knowledge_chunk_source();

create or replace function public.prevent_archived_revision_resurrection()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if exists (
    select 1 from public.knowledge_sources
    where id = new.source_id and archived_at is not null
  ) and (
    new.status <> 'archived'
    or new.raw_text is not null
    or new.extracted_text is not null
    or new.distilled_json is not null
  ) then
    raise exception 'knowledge_source_archived' using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function public.prevent_archived_revision_resurrection()
from public, anon, authenticated;
drop trigger if exists knowledge_revisions_prevent_archived_resurrection
on public.knowledge_revisions;
create trigger knowledge_revisions_prevent_archived_resurrection
before update on public.knowledge_revisions
for each row execute function public.prevent_archived_revision_resurrection();

alter table public.knowledge_chunks
  alter column source_id set not null;
alter table public.knowledge_chunks
  drop constraint if exists knowledge_chunks_revision_source_fkey;
alter table public.knowledge_chunks
  add constraint knowledge_chunks_revision_source_fkey
  foreign key (revision_id, source_id)
  references public.knowledge_revisions(id, source_id)
  on delete cascade;
alter table public.knowledge_chunks
  drop constraint if exists knowledge_chunks_source_expert_fkey;
alter table public.knowledge_chunks
  add constraint knowledge_chunks_source_expert_fkey
  foreign key (source_id, expert_id)
  references public.knowledge_sources(id, expert_id)
  on delete cascade;

-- Persist worker output atomically while holding the source consent lock. A
-- revoked/archived source can therefore never be resurrected by an in-flight
-- provider request that finishes after consent was withdrawn.
create or replace function public.complete_distillation_job(
  p_job_id uuid,
  p_worker_id text,
  p_extracted_text text,
  p_distilled_json jsonb,
  p_content_hash text,
  p_provider_meta jsonb,
  p_chunks jsonb
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  target_revision_id uuid;
  target_source_id uuid;
  job_row public.distillation_jobs%rowtype;
  revision_row public.knowledge_revisions%rowtype;
  source_row public.knowledge_sources%rowtype;
begin
  if jsonb_typeof(coalesce(p_chunks, 'null'::jsonb)) <> 'array'
     or jsonb_array_length(p_chunks) not between 1 and 500 then
    raise exception 'invalid_distillation_chunks' using errcode = '22023';
  end if;

  select dj.revision_id, kr.source_id
  into target_revision_id, target_source_id
  from public.distillation_jobs dj
  join public.knowledge_revisions kr on kr.id = dj.revision_id
  where dj.id = p_job_id;
  if target_revision_id is null or target_source_id is null then
    raise exception 'distillation_job_not_found' using errcode = 'P0002';
  end if;

  -- Revoke locks the same source before cancelling its job, so both workflows
  -- use source -> job -> revision ordering and cannot deadlock each other.
  select * into source_row
  from public.knowledge_sources
  where id = target_source_id
  for update;
  select * into job_row
  from public.distillation_jobs
  where id = p_job_id
  for update;
  select * into revision_row
  from public.knowledge_revisions
  where id = target_revision_id
  for update;

  if source_row.archived_at is not null then
    raise exception 'knowledge_source_archived' using errcode = '23514';
  end if;
  if job_row.status <> 'processing'
     or job_row.locked_by is distinct from left(p_worker_id, 120) then
    raise exception 'distillation_job_lease_mismatch' using errcode = '55000';
  end if;
  if revision_row.source_id <> source_row.id
     or revision_row.status <> 'processing' then
    raise exception 'revision_not_eligible_for_completion' using errcode = '55000';
  end if;
  if exists (
    select 1
    from jsonb_to_recordset(p_chunks) as c(
      chunk_index integer,
      content text,
      embedding text,
      citation_meta jsonb,
      token_count integer
    )
    where c.chunk_index is null
      or c.chunk_index < 0
      or nullif(btrim(c.content), '') is null
      or nullif(btrim(c.embedding), '') is null
      or c.token_count is null
      or c.token_count < 1
  ) then
    raise exception 'invalid_distillation_chunk_payload' using errcode = '22023';
  end if;

  delete from public.knowledge_chunks
  where revision_id = revision_row.id;
  insert into public.knowledge_chunks (
    revision_id, source_id, expert_id, chunk_index, content, embedding,
    citation_meta, token_count
  )
  select
    revision_row.id, source_row.id, source_row.expert_id, c.chunk_index,
    c.content, c.embedding::extensions.halfvec(1536),
    coalesce(c.citation_meta, '{}'::jsonb), c.token_count
  from jsonb_to_recordset(p_chunks) as c(
    chunk_index integer,
    content text,
    embedding text,
    citation_meta jsonb,
    token_count integer
  );

  update public.knowledge_revisions
  set extracted_text = p_extracted_text,
      distilled_json = coalesce(p_distilled_json, '{}'::jsonb),
      content_hash = p_content_hash,
      status = 'review',
      provider_meta = coalesce(p_provider_meta, '{}'::jsonb),
      error_message = null
  where id = revision_row.id;
  update public.distillation_jobs
  set stage = 'complete', status = 'complete', error_message = null,
      locked_at = null, locked_by = null, updated_at = now()
  where id = job_row.id;
end;
$$;

revoke all on function public.complete_distillation_job(
  uuid, text, text, jsonb, text, jsonb, jsonb
) from public, anon, authenticated;
grant execute on function public.complete_distillation_job(
  uuid, text, text, jsonb, text, jsonb, jsonb
) to service_role;

-- Keep the existing Admin Experts RPC signature while persisting the new
-- public-profile switch. Chat readiness remains derived and cannot be faked by
-- this profile form.
create or replace function public.upsert_admin_expert(
  p_expert_id uuid,
  p_slug text,
  p_display_name text,
  p_name_en text,
  p_name_zh text,
  p_title text,
  p_bio text,
  p_brand_color text,
  p_specialties text[],
  p_quote text,
  p_credential text,
  p_verified boolean,
  p_radar jsonb,
  p_traits text[]
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  target_id uuid;
  target_status text;
begin
  if not public.is_admin() then
    raise exception 'admin_required' using errcode = '42501';
  end if;
  if p_expert_id is null and not public.is_super_admin() then
    raise exception 'super_admin_required_to_create_expert' using errcode = '42501';
  end if;
  if btrim(coalesce(p_display_name, '')) = '' then
    raise exception 'display_name_required' using errcode = '22023';
  end if;
  if coalesce(p_slug, '') !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception 'invalid_expert_slug' using errcode = '22023';
  end if;
  if p_slug = 'platform' then
    raise exception 'platform_expert_is_reserved' using errcode = '22023';
  end if;
  if jsonb_typeof(coalesce(p_radar, '[]'::jsonb)) <> 'array' then
    raise exception 'radar_must_be_array' using errcode = '22023';
  end if;

  if p_expert_id is null then
    insert into public.experts (
      slug, display_name, name_en, name_zh, title, bio, brand_color,
      specialties, quote, credential, verified, radar, traits, status,
      public_profile_enabled
    ) values (
      p_slug, btrim(p_display_name), nullif(btrim(coalesce(p_name_en, '')), ''),
      nullif(btrim(coalesce(p_name_zh, '')), ''), nullif(btrim(coalesce(p_title, '')), ''),
      nullif(btrim(coalesce(p_bio, '')), ''), nullif(btrim(coalesce(p_brand_color, '')), ''),
      coalesce(p_specialties, '{}'), nullif(btrim(coalesce(p_quote, '')), ''),
      nullif(btrim(coalesce(p_credential, '')), ''), coalesce(p_verified, false),
      coalesce(p_radar, '[]'::jsonb), coalesce(p_traits, '{}'), 'draft', false
    )
    returning id into target_id;
  else
    update public.experts
    set display_name = btrim(p_display_name),
        name_en = nullif(btrim(coalesce(p_name_en, '')), ''),
        name_zh = nullif(btrim(coalesce(p_name_zh, '')), ''),
        title = nullif(btrim(coalesce(p_title, '')), ''),
        bio = nullif(btrim(coalesce(p_bio, '')), ''),
        brand_color = nullif(btrim(coalesce(p_brand_color, '')), ''),
        specialties = coalesce(p_specialties, '{}'),
        quote = nullif(btrim(coalesce(p_quote, '')), ''),
        credential = nullif(btrim(coalesce(p_credential, '')), ''),
        verified = coalesce(p_verified, false),
        radar = coalesce(p_radar, '[]'::jsonb),
        traits = coalesce(p_traits, '{}'),
        status = case when coalesce(p_verified, false) then status else 'draft' end,
        public_profile_enabled = case
          when coalesce(p_verified, false) then public_profile_enabled
          else false
        end
    where id = p_expert_id and slug = p_slug and archived_at is null
    returning id into target_id;
    if target_id is null then
      raise exception 'expert_not_found' using errcode = 'P0002';
    end if;
  end if;

  select status into target_status from public.experts where id = target_id;

  insert into public.expert_profiles (slug, headline, bio, updated_at)
  values (
    p_slug,
    nullif(btrim(coalesce(p_title, '')), ''),
    nullif(btrim(coalesce(p_bio, '')), ''),
    now()
  )
  on conflict (slug) do update
  set headline = excluded.headline,
      bio = excluded.bio,
      updated_at = excluded.updated_at;

  insert into public.audit_events (
    actor_id, action, entity_type, entity_id, expert_id, metadata
  ) values (
    auth.uid(),
    case when p_expert_id is null then 'expert.created' else 'expert.updated' end,
    'expert', target_id, target_id,
    jsonb_build_object(
      'slug', p_slug,
      'status', target_status,
      'verified', coalesce(p_verified, false),
      'public_profile_enabled', (
        select public_profile_enabled from public.experts where id = target_id
      )
    )
  );

  return target_id;
end;
$$;

revoke all on function public.upsert_admin_expert(
  uuid, text, text, text, text, text, text, text, text[], text, text,
  boolean, jsonb, text[]
) from public, anon, authenticated;
grant execute on function public.upsert_admin_expert(
  uuid, text, text, text, text, text, text, text, text[], text, text,
  boolean, jsonb, text[]
) to authenticated;

create or replace function public.archive_unused_expert_draft(p_expert_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  target public.experts%rowtype;
begin
  if not public.is_super_admin() then
    raise exception 'super_admin_required' using errcode = '42501';
  end if;
  select * into target
  from public.experts
  where id = p_expert_id and slug <> 'platform'
  for update;
  if not found then raise exception 'expert_not_found' using errcode = 'P0002'; end if;
  if target.archived_at is not null then return; end if;
  if target.status not in ('draft', 'suspended') or target.owner_user_id is not null then
    raise exception 'only_unowned_draft_can_be_archived' using errcode = '23514';
  end if;
  if target.published_persona_version_id is not null
     or exists (select 1 from public.conversations where expert_id = target.id)
     or exists (select 1 from public.bookings where expert_id = target.id)
     or exists (
       select 1 from public.knowledge_sources
       where expert_id = target.id and archived_at is null
     ) then
    raise exception 'expert_draft_has_retained_data' using errcode = '23514';
  end if;

  update public.expert_invitations
  set status = 'cancelled', failure_reason = 'expert_draft_archived',
      updated_at = now()
  where expert_id = target.id and status = 'pending';
  update public.experts
  set archived_at = now(), public_profile_enabled = false,
      feature_flags = jsonb_build_object(
        'cms_ingestion_enabled', false,
        'rag_enabled', false,
        'booking_enabled', false,
        'persona_compiler_enabled', false,
        'social_sync_enabled', false
      ),
      updated_at = now()
  where id = target.id;
  insert into public.audit_events (
    actor_id, expert_id, action, entity_type, entity_id, metadata
  ) values (
    auth.uid(), target.id, 'expert.draft_archived', 'expert', target.id,
    jsonb_build_object('slug', target.slug, 'seat_released', true)
  );
end;
$$;

revoke all on function public.archive_unused_expert_draft(uuid)
from public, anon, authenticated;
grant execute on function public.archive_unused_expert_draft(uuid) to authenticated;

-- Identity verification and release are deliberately separate. A profile edit
-- cannot bypass owner, corpus, persona and evaluation gates.
create or replace function public.get_expert_release_readiness(p_expert_id uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = pg_catalog, public
as $$
declare
  result jsonb;
begin
  if not public.owns_expert(p_expert_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  select jsonb_build_object(
    'identity_verified', e.verified,
    'owner_assigned', exists (
      select 1 from public.account_access aa
      where aa.user_id = e.owner_user_id
        and aa.app_role = 'expert'
        and aa.expert_id = e.id
    ),
    'published_persona', exists (
      select 1 from public.expert_persona_versions epv
      where epv.id = e.published_persona_version_id
        and epv.expert_id = e.id
        and epv.status = 'published'
    ),
    'published_sources', (
      select count(*) from public.knowledge_sources ks
      join public.knowledge_revisions kr
        on kr.id = ks.published_revision_id and kr.source_id = ks.id
      where ks.expert_id = e.id
        and ks.archived_at is null
        and kr.status = 'approved'
    ),
    'published_chunks', (
      select count(*) from public.knowledge_chunks kc
      join public.knowledge_sources ks
        on ks.id = kc.source_id and ks.expert_id = kc.expert_id
      where kc.expert_id = e.id
        and ks.archived_at is null
        and ks.published_revision_id = kc.revision_id
    ),
    'evaluation_questions', (
      select count(*) from public.persona_evaluation_questions q
      where q.expert_id = e.id and q.active
    ),
    'evaluation_passed', public.has_current_passed_persona_evaluation(
      e.id, e.published_persona_version_id
    ),
    'pending_jobs', (
      (select count(*) from public.distillation_jobs dj
       join public.knowledge_revisions kr on kr.id = dj.revision_id
       join public.knowledge_sources ks on ks.id = kr.source_id
       where ks.expert_id = e.id and dj.status in ('pending', 'processing', 'retry'))
      +
      (select count(*) from public.persona_synthesis_jobs pj
       where pj.expert_id = e.id and pj.status in ('pending', 'processing', 'retry', 'review', 'approved'))
    )
  ) into result
  from public.experts e
  where e.id = p_expert_id;
  if result is null then raise exception 'expert_not_found' using errcode = 'P0002'; end if;
  return result || jsonb_build_object(
    'ready',
    coalesce((result ->> 'identity_verified')::boolean, false)
      and coalesce((result ->> 'owner_assigned')::boolean, false)
      and coalesce((result ->> 'published_persona')::boolean, false)
      and coalesce((result ->> 'published_sources')::integer, 0) >= 2
      and coalesce((result ->> 'published_chunks')::integer, 0) > 0
      and coalesce((result ->> 'evaluation_questions')::integer, 0) >= 25
      and coalesce((result ->> 'evaluation_passed')::boolean, false)
      and coalesce((result ->> 'pending_jobs')::integer, 0) = 0
  );
end;
$$;

create or replace function public.activate_expert(p_expert_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  readiness jsonb;
begin
  if not public.is_admin() then
    raise exception 'admin_required' using errcode = '42501';
  end if;
  perform 1 from public.experts
  where id = p_expert_id and archived_at is null
  for update;
  if not found then raise exception 'expert_not_found' using errcode = 'P0002'; end if;
  readiness := public.get_expert_release_readiness(p_expert_id);
  if not coalesce((readiness ->> 'ready')::boolean, false) then
    raise exception 'expert_release_gate_failed: %', readiness using errcode = '23514';
  end if;
  update public.experts
  set status = 'active', public_profile_enabled = true,
      feature_flags = feature_flags || '{"rag_enabled":true}'::jsonb,
      updated_at = now()
  where id = p_expert_id;
  insert into public.audit_events (
    actor_id, expert_id, action, entity_type, entity_id, metadata
  ) values (
    auth.uid(), p_expert_id, 'expert.activated', 'expert', p_expert_id, readiness
  );
end;
$$;

revoke all on function public.get_expert_release_readiness(uuid)
from public, anon, authenticated;
revoke all on function public.activate_expert(uuid)
from public, anon, authenticated;
grant execute on function public.get_expert_release_readiness(uuid) to authenticated;
grant execute on function public.activate_expert(uuid) to authenticated;

create or replace function public.set_expert_feature_flag(
  p_expert_id uuid,
  p_key text,
  p_enabled boolean
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  readiness jsonb;
begin
  if not public.is_admin() then
    raise exception 'admin_required' using errcode = '42501';
  end if;
  if p_key not in (
    'cms_ingestion_enabled', 'rag_enabled', 'booking_enabled',
    'persona_compiler_enabled', 'social_sync_enabled'
  ) then
    raise exception 'unsupported_feature_flag' using errcode = '22023';
  end if;
  perform 1 from public.experts
  where id = p_expert_id and archived_at is null
  for update;
  if not found then raise exception 'expert_not_found' using errcode = 'P0002'; end if;
  if p_key = 'rag_enabled' and coalesce(p_enabled, false) then
    readiness := public.get_expert_release_readiness(p_expert_id);
    if not coalesce((readiness ->> 'ready')::boolean, false) then
      raise exception 'expert_release_gate_failed' using errcode = '23514';
    end if;
  end if;
  update public.experts
  set feature_flags = jsonb_set(
        coalesce(feature_flags, '{}'::jsonb),
        array[p_key], to_jsonb(coalesce(p_enabled, false)), true
      ),
      updated_at = now()
  where id = p_expert_id;
  insert into public.audit_events (
    actor_id, expert_id, action, entity_type, entity_id, metadata
  ) values (
    auth.uid(), p_expert_id, 'expert.feature_flag_updated', 'expert', p_expert_id,
    jsonb_build_object('key', p_key, 'enabled', coalesce(p_enabled, false))
  );
end;
$$;

revoke all on function public.set_expert_feature_flag(uuid, text, boolean)
from public, anon, authenticated;
grant execute on function public.set_expert_feature_flag(uuid, text, boolean)
to authenticated;

create or replace function public.update_expert_public_profile(
  p_expert_id uuid,
  p_display_name text,
  p_title text,
  p_bio text,
  p_specialties text[],
  p_brand_color text,
  p_quote text,
  p_stats jsonb default '[]'::jsonb,
  p_socials jsonb default '[]'::jsonb,
  p_featured_ids uuid[] default '{}'::uuid[]
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  target_slug text;
begin
  if not public.owns_expert(p_expert_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if char_length(btrim(coalesce(p_display_name, ''))) not between 1 and 120 then
    raise exception 'invalid_display_name' using errcode = '22023';
  end if;
  if cardinality(coalesce(p_specialties, '{}')) > 10 then
    raise exception 'too_many_specialties' using errcode = '22023';
  end if;
  if coalesce(p_brand_color, '') !~ '^#[0-9A-Fa-f]{6}$' then
    raise exception 'invalid_brand_color' using errcode = '22023';
  end if;
  if jsonb_typeof(coalesce(p_stats, '[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(p_stats, '[]'::jsonb)) > 10 then
    raise exception 'invalid_profile_stats' using errcode = '22023';
  end if;
  if jsonb_typeof(coalesce(p_socials, '[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(p_socials, '[]'::jsonb)) > 10 then
    raise exception 'invalid_profile_socials' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_array_elements(coalesce(p_socials, '[]'::jsonb)) item
    where jsonb_typeof(item) <> 'object'
      or coalesce(item ->> 'url', '') !~ '^https://'
      or char_length(coalesce(item ->> 'url', '')) > 500
  ) then
    raise exception 'profile_social_urls_must_be_https' using errcode = '22023';
  end if;
  select slug into target_slug from public.experts
  where id = p_expert_id for update;
  if not found then raise exception 'expert_not_found' using errcode = 'P0002'; end if;

  update public.experts
  set display_name = btrim(p_display_name),
      name_en = btrim(p_display_name),
      name_zh = null,
      title = nullif(left(btrim(coalesce(p_title, '')), 200), ''),
      bio = nullif(left(btrim(coalesce(p_bio, '')), 5000), ''),
      specialties = coalesce(p_specialties, '{}'),
      brand_color = p_brand_color,
      quote = nullif(left(btrim(coalesce(p_quote, '')), 500), ''),
      updated_at = now()
  where id = p_expert_id;
  insert into public.expert_profiles (
    slug, headline, bio, stats, socials, featured_ids, updated_at
  ) values (
    target_slug, nullif(left(btrim(coalesce(p_title, '')), 200), ''),
    nullif(left(btrim(coalesce(p_bio, '')), 5000), ''),
    coalesce(p_stats, '[]'::jsonb), coalesce(p_socials, '[]'::jsonb),
    coalesce(p_featured_ids, '{}'), now()
  ) on conflict (slug) do update set
    headline = excluded.headline,
    bio = excluded.bio,
    stats = excluded.stats,
    socials = excluded.socials,
    featured_ids = excluded.featured_ids,
    updated_at = now();
  insert into public.audit_events (
    actor_id, expert_id, action, entity_type, entity_id, metadata
  ) values (
    auth.uid(), p_expert_id, 'expert.profile_updated', 'expert', p_expert_id,
    jsonb_build_object('slug', target_slug)
  );
end;
$$;

revoke all on function public.update_expert_public_profile(
  uuid, text, text, text, text[], text, text, jsonb, jsonb, uuid[]
) from public, anon, authenticated;
grant execute on function public.update_expert_public_profile(
  uuid, text, text, text, text[], text, text, jsonb, jsonb, uuid[]
) to authenticated;

-- ---------------------------------------------------------------------------
-- Server-routed conversations and immutable, instructor-scoped CRM.
-- ---------------------------------------------------------------------------

alter table public.messages
  add column if not exists server_generated boolean not null default false,
  add column if not exists turn_sequence bigint;

with ranked as (
  select id,
    row_number() over (
      partition by conversation_id
      order by created_at, case role when 'user' then 0 else 1 end, id
    ) as sequence_no
  from public.messages
)
update public.messages m
set turn_sequence = ranked.sequence_no
from ranked
where ranked.id = m.id and m.turn_sequence is null;

create or replace function public.assign_message_turn_sequence()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.conversation_id is null then
    raise exception 'message_conversation_required' using errcode = '23502';
  end if;
  perform pg_advisory_xact_lock(
    hashtextextended('aigro:conversation-sequence:' || new.conversation_id::text, 0)
  );
  if new.turn_sequence is null then
    select coalesce(max(turn_sequence), 0) + 1 into new.turn_sequence
    from public.messages
    where conversation_id = new.conversation_id;
  end if;
  return new;
end;
$$;

revoke all on function public.assign_message_turn_sequence()
from public, anon, authenticated;
drop trigger if exists messages_assign_turn_sequence on public.messages;
create trigger messages_assign_turn_sequence
before insert on public.messages
for each row execute function public.assign_message_turn_sequence();
alter table public.messages alter column turn_sequence set not null;
create unique index if not exists messages_conversation_turn_sequence_unique
on public.messages(conversation_id, turn_sequence);

alter table public.leads
  add column if not exists expert_id uuid references public.experts(id) on delete cascade,
  add column if not exists source_conversation_id uuid
    references public.conversations(id) on delete set null,
  add column if not exists last_message_id uuid
    references public.messages(id) on delete set null,
  add column if not exists next_follow_up_at timestamptz,
  add column if not exists contact_consented_at timestamptz,
  add column if not exists owner_is_anonymous boolean not null default false;

update public.leads l
set owner_is_anonymous = coalesce(u.is_anonymous, false)
from auth.users u
where u.id = l.owner_id
  and l.owner_is_anonymous is distinct from coalesce(u.is_anonymous, false);

-- Keep the CRM identity projection synchronized when an Anonymous Auth user is
-- upgraded to an email account, even before they send another chat turn.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  safe_name text;
begin
  if new.email is not null and btrim(new.email) <> '' then
    safe_name := coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
      nullif(split_part(new.email, '@', 1), ''),
      '會員'
    );
    insert into public.profiles (id, email, name)
    values (new.id, lower(btrim(new.email)), left(safe_name, 120))
    on conflict (id) do update
    set email = excluded.email,
        name = case
          when btrim(public.profiles.name) = '' then excluded.name
          else public.profiles.name
        end,
        updated_at = now();
  end if;

  update public.leads
  set user_id = case when coalesce(new.is_anonymous, false) then null else new.id end,
      owner_is_anonymous = coalesce(new.is_anonymous, false)
  where owner_id = new.id;
  return new;
end;
$$;
revoke all on function public.handle_new_auth_user()
from public, anon, authenticated;
drop trigger if exists on_auth_user_provision_profile on auth.users;
create trigger on_auth_user_provision_profile
after insert or update of email, is_anonymous on auth.users
for each row execute function public.handle_new_auth_user();

update public.leads l
set expert_id = e.id
from public.experts e
where l.expert_id is null and e.slug = l.persona;

update public.leads l
set questions = (
  select coalesce(jsonb_agg(value order by ordinality), '[]'::jsonb) as questions
  from jsonb_array_elements(coalesce(l.questions, '[]'::jsonb)) with ordinality
  where ordinality > greatest(jsonb_array_length(coalesce(l.questions, '[]'::jsonb)) - 100, 0)
)
where jsonb_array_length(coalesce(l.questions, '[]'::jsonb)) > 100;

-- Do not preserve legacy cross-workspace pointers. CRM links are advisory and
-- can be rebuilt from server-authored chat turns; authorization boundaries
-- must never be guessed during migration.
update public.leads l
set source_conversation_id = null, last_message_id = null
where source_conversation_id is not null
  and not exists (
    select 1
    from public.conversations c
    where c.id = l.source_conversation_id
      and c.expert_id is not distinct from l.expert_id
      and c.owner_id is not distinct from l.owner_id
  );

update public.leads l
set last_message_id = null
where last_message_id is not null
  and (
    source_conversation_id is null
    or not exists (
      select 1
      from public.messages m
      where m.id = l.last_message_id
        and m.conversation_id = l.source_conversation_id
        and m.server_generated
    )
  );

create or replace function public.enforce_lead_chat_scope()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  -- `conversations ... ON DELETE SET NULL` and
  -- `messages ... ON DELETE SET NULL` are separate FK actions. If the
  -- conversation action arrives first, clear the dependent message pointer in
  -- the same row update so the invariant stays valid throughout the cascade.
  if tg_op = 'UPDATE'
     and old.source_conversation_id is not null
     and new.source_conversation_id is null then
    new.last_message_id := null;
  end if;
  if new.source_conversation_id is not null and not exists (
    select 1
    from public.conversations c
    where c.id = new.source_conversation_id
      and c.expert_id is not distinct from new.expert_id
      and c.owner_id is not distinct from new.owner_id
  ) then
    raise exception 'lead_conversation_scope_mismatch' using errcode = '23514';
  end if;
  if new.last_message_id is not null and (
    new.source_conversation_id is null
    or not exists (
      select 1
      from public.messages m
      where m.id = new.last_message_id
        and m.conversation_id = new.source_conversation_id
        and m.server_generated
    )
  ) then
    raise exception 'lead_message_scope_mismatch' using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_lead_chat_scope()
from public, anon, authenticated;
drop trigger if exists leads_enforce_chat_scope on public.leads;
create trigger leads_enforce_chat_scope
before insert or update of owner_id, expert_id, source_conversation_id, last_message_id
on public.leads
for each row execute function public.enforce_lead_chat_scope();

drop index if exists public.leads_owner_persona_unique;
alter table public.leads
  drop constraint if exists leads_owner_expert_unique;
alter table public.leads
  add constraint leads_owner_expert_unique unique (owner_id, expert_id);
create index if not exists leads_expert_activity_idx
on public.leads(expert_id, last_activity_at desc);
create index if not exists leads_expert_stage_score_idx
on public.leads(expert_id, stage, score desc);

create table if not exists public.lead_notes (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  expert_id uuid not null references public.experts(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null,
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists lead_notes_lead_created_idx
on public.lead_notes(lead_id, created_at desc);
update public.lead_notes ln
set expert_id = l.expert_id
from public.leads l
where l.id = ln.lead_id and ln.expert_id is distinct from l.expert_id;
alter table public.leads
  drop constraint if exists leads_id_expert_unique;
alter table public.leads
  add constraint leads_id_expert_unique unique (id, expert_id);
alter table public.lead_notes
  drop constraint if exists lead_notes_lead_expert_fkey;
alter table public.lead_notes
  add constraint lead_notes_lead_expert_fkey
  foreign key (lead_id, expert_id)
  references public.leads(id, expert_id) on delete cascade;

-- Preserve the exact pre-migration CRM aggregate before moving new chat turns
-- to deletable, message-scoped interactions. Some legacy leads have question
-- summaries but no matching conversation/message rows, so a blanket rebuild
-- would otherwise destroy valid instructor CRM history.
alter table public.leads
  add column if not exists legacy_questions_snapshot jsonb not null default '[]'::jsonb,
  add column if not exists legacy_questions_captured_at timestamptz;
alter table public.leads
  drop constraint if exists leads_legacy_questions_snapshot_array;
alter table public.leads
  add constraint leads_legacy_questions_snapshot_array
  check (jsonb_typeof(legacy_questions_snapshot) = 'array');
update public.leads
set legacy_questions_snapshot = questions,
    legacy_questions_captured_at = coalesce(last_activity_at, created_at, now())
where legacy_questions_snapshot = '[]'::jsonb
  and jsonb_typeof(questions) = 'array'
  and jsonb_array_length(questions) > 0;

-- Per-turn CRM interactions keep raw questions attached to the conversation
-- and message that created them. Conversation deletion and the anonymous
-- retention job can therefore remove old text without deleting a newer lead.
create table if not exists public.lead_interactions (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null,
  expert_id uuid not null references public.experts(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  message_id uuid not null unique references public.messages(id) on delete cascade,
  question text not null check (char_length(btrim(question)) between 1 and 800),
  signals text[] not null default '{}',
  score_delta smallint not null default 0 check (score_delta between 0 and 100),
  occurred_at timestamptz not null default now(),
  constraint lead_interactions_lead_expert_fkey
    foreign key (lead_id, expert_id)
    references public.leads(id, expert_id) on delete cascade
);
create index if not exists lead_interactions_lead_occurred_idx
on public.lead_interactions(lead_id, occurred_at desc, id desc);
create index if not exists lead_interactions_owner_occurred_idx
on public.lead_interactions(owner_id, occurred_at desc);

create or replace function public.enforce_lead_interaction_scope()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if not exists (
    select 1 from public.leads l
    where l.id = new.lead_id and l.expert_id = new.expert_id
      and l.owner_id = new.owner_id
  ) or not exists (
    select 1 from public.conversations c
    where c.id = new.conversation_id and c.expert_id = new.expert_id
      and c.owner_id = new.owner_id
  ) or not exists (
    select 1 from public.messages m
    where m.id = new.message_id and m.conversation_id = new.conversation_id
      and m.role = 'user' and m.server_generated
  ) then
    raise exception 'lead_interaction_scope_mismatch' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function public.enforce_lead_interaction_scope()
from public, anon, authenticated;
drop trigger if exists lead_interactions_enforce_scope on public.lead_interactions;
create trigger lead_interactions_enforce_scope
before insert or update on public.lead_interactions
for each row execute function public.enforce_lead_interaction_scope();

create or replace function public.refresh_lead_questions(p_lead_id uuid)
returns void
language sql
security definer
set search_path = pg_catalog, public
as $$
  update public.leads l
  set questions = coalesce((
    select jsonb_agg(recent.question order by recent.occurred_at, recent.sort_key)
    from (
      select combined.question, combined.occurred_at, combined.sort_key
      from (
        select li.question, li.occurred_at, '1:' || li.id::text as sort_key
        from public.lead_interactions li
        where li.lead_id = p_lead_id
        union all
        select left(legacy.value #>> '{}', 800),
          coalesce(l.legacy_questions_captured_at, l.created_at, now()),
          '0:' || lpad(legacy.ordinality::text, 20, '0')
        from jsonb_array_elements(l.legacy_questions_snapshot)
          with ordinality as legacy(value, ordinality)
        where jsonb_typeof(legacy.value) = 'string'
          and nullif(btrim(legacy.value #>> '{}'), '') is not null
      ) combined
      order by combined.occurred_at desc, combined.sort_key desc
      limit 100
    ) recent
  ), '[]'::jsonb)
  where l.id = p_lead_id;
$$;
revoke all on function public.refresh_lead_questions(uuid)
from public, anon, authenticated;
grant execute on function public.refresh_lead_questions(uuid) to service_role;

-- Backfill any already-server-authored user turns and then merge them with the
-- reversible legacy snapshot. A lead is never blanked merely because its old
-- aggregate cannot be mapped to a durable message.
insert into public.lead_interactions (
  lead_id, expert_id, owner_id, conversation_id, message_id, question,
  occurred_at
)
select
  l.id, l.expert_id, l.owner_id, c.id, m.id, left(m.content, 800), m.created_at
from public.leads l
join public.conversations c
  on c.owner_id = l.owner_id and c.expert_id = l.expert_id
join public.messages m
  on m.conversation_id = c.id and m.role = 'user' and m.server_generated
where l.expert_id is not null and l.owner_id is not null
  and nullif(btrim(m.content), '') is not null
on conflict (message_id) do nothing;
select public.refresh_lead_questions(l.id) from public.leads l;

create or replace function public.refresh_lead_questions_after_interaction()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_lead_questions(old.lead_id);
    return old;
  end if;
  perform public.refresh_lead_questions(new.lead_id);
  if tg_op = 'UPDATE' and old.lead_id is distinct from new.lead_id then
    perform public.refresh_lead_questions(old.lead_id);
  end if;
  return new;
end;
$$;
revoke all on function public.refresh_lead_questions_after_interaction()
from public, anon, authenticated;
drop trigger if exists lead_interactions_refresh_questions on public.lead_interactions;
create trigger lead_interactions_refresh_questions
after insert or update or delete on public.lead_interactions
for each row execute function public.refresh_lead_questions_after_interaction();

-- Legacy aggregates cannot be mapped reliably to one old conversation. When a
-- member deletes any conversation for that instructor, clear the snapshot for
-- that owner/expert conservatively so the deletion cannot leave copied text.
create or replace function public.clear_legacy_lead_questions_after_conversation_delete()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  affected_lead_id uuid;
begin
  for affected_lead_id in
    update public.leads l
    set legacy_questions_snapshot = '[]'::jsonb,
        legacy_questions_captured_at = null
    where l.owner_id = old.owner_id
      and (
        (old.expert_id is not null and l.expert_id = old.expert_id)
        or (old.expert_id is null and l.persona = old.persona)
      )
      and l.legacy_questions_snapshot <> '[]'::jsonb
    returning l.id
  loop
    perform public.refresh_lead_questions(affected_lead_id);
  end loop;
  return old;
end;
$$;
revoke all on function public.clear_legacy_lead_questions_after_conversation_delete()
from public, anon, authenticated;
drop trigger if exists conversations_clear_legacy_lead_questions
on public.conversations;
create trigger conversations_clear_legacy_lead_questions
after delete on public.conversations
for each row execute function public.clear_legacy_lead_questions_after_conversation_delete();

alter table public.lead_interactions enable row level security;
drop policy if exists lead_interactions_expert_read on public.lead_interactions;
create policy lead_interactions_expert_read on public.lead_interactions
for select to authenticated using (public.owns_expert(expert_id));
revoke insert, update, delete on public.lead_interactions from anon, authenticated;
grant select on public.lead_interactions to authenticated;
grant all on public.lead_interactions to service_role;

alter table public.lead_notes enable row level security;
drop policy if exists lead_notes_expert_read on public.lead_notes;
create policy lead_notes_expert_read on public.lead_notes
for select to authenticated
using (public.owns_expert(expert_id));
revoke insert, update, delete on public.lead_notes from anon, authenticated;
grant select on public.lead_notes to authenticated;
grant all on public.lead_notes to service_role;

-- All browser-authored chat/CRM mutations are replaced by explicit workflows.
drop policy if exists conversations_owner_all_v5 on public.conversations;
drop policy if exists conversations_owner_read on public.conversations;
drop policy if exists conversations_owner_delete on public.conversations;
create policy conversations_owner_read on public.conversations
for select to authenticated
using (owner_id = auth.uid());
create policy conversations_owner_delete on public.conversations
for delete to authenticated
using (owner_id = auth.uid());

drop policy if exists messages_owner_all_v5 on public.messages;
drop policy if exists messages_owner_read on public.messages;
create policy messages_owner_read on public.messages
for select to authenticated
using (exists (
  select 1 from public.conversations c
  where c.id = conversation_id and c.owner_id = auth.uid()
));
drop policy if exists messages_expert_read_own on public.messages;
create policy messages_expert_read_own on public.messages
for select to authenticated
using (exists (
  select 1 from public.conversations c
  where c.id = conversation_id
    and c.expert_id is not null
    and public.owns_expert(c.expert_id)
));

drop policy if exists leads_owner_all_v5 on public.leads;
drop policy if exists leads_admin_all on public.leads;
drop policy if exists leads_expert_read_own on public.leads;
create policy leads_expert_read_own on public.leads
for select to authenticated
using (expert_id is not null and public.owns_expert(expert_id));

create or replace function public.create_chat_conversation(
  p_persona_slug text,
  p_title text default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  caller_id uuid := auth.uid();
  target_expert public.experts%rowtype;
  conversation_id uuid;
  profile_id uuid;
begin
  if caller_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(
    hashtextextended('aigro:empty-chat:' || caller_id::text, 0)
  );
  if (
    select count(*)
    from public.conversations c
    where c.owner_id = caller_id
      and c.created_at >= now() - interval '24 hours'
      and not exists (
        select 1 from public.messages m where m.conversation_id = c.id
      )
  ) >= 5 then
    raise exception 'empty_conversation_limit_reached' using errcode = 'P0001';
  end if;
  select * into target_expert
  from public.experts
  where slug = p_persona_slug
    and status = 'active'
    and public.is_expert_chat_ready(id);
  if not found then raise exception 'instructor_not_available' using errcode = 'P0002'; end if;
  select id into profile_id from public.profiles where id = caller_id;

  insert into public.conversations (
    owner_id, user_id, anon_id, persona, expert_id, title
  ) values (
    caller_id, profile_id, null, target_expert.slug, target_expert.id,
    nullif(left(btrim(coalesce(p_title, '')), 120), '')
  ) returning id into conversation_id;
  return conversation_id;
end;
$$;

revoke all on function public.create_chat_conversation(text, text)
from public, anon, authenticated;
grant execute on function public.create_chat_conversation(text, text) to authenticated;

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
set search_path = pg_catalog, public
as $$
declare
  assistant_id uuid;
  lead_delta integer := 5;
  detected_signals text[] := array['asked_question'];
  profile_id uuid;
  owner_is_anonymous boolean := false;
  effective_persona_version_id uuid;
  user_message_id uuid;
  crm_lead_id uuid;
begin
  if p_answer_basis not in ('knowledge', 'general') then raise exception 'invalid_answer_basis'; end if;
  if p_coverage not in ('high', 'medium', 'none') then raise exception 'invalid_coverage'; end if;
  if not exists (
    select 1 from public.conversations c
    join public.experts e on e.id = c.expert_id and e.slug = c.persona
    where c.id = p_conversation_id
      and c.owner_id = p_owner_id
      and c.expert_id = p_expert_id
      and c.persona = p_persona
  ) then raise exception 'conversation_mismatch'; end if;

  if p_persona_version_id is not null and not exists (
    select 1 from public.expert_persona_versions
    where id = p_persona_version_id and expert_id = p_expert_id
  ) then raise exception 'persona_version_mismatch'; end if;

  perform pg_advisory_xact_lock(hashtextextended(p_conversation_id::text || ':' || p_request_id, 0));
  select id into assistant_id from public.messages
  where conversation_id = p_conversation_id and request_id = p_request_id and role = 'assistant';
  if found then return assistant_id; end if;

  select r.persona_version_id into effective_persona_version_id
  from public.chat_request_reservations r
  where r.user_id = p_owner_id
    and r.request_id::text = p_request_id
    and r.conversation_id = p_conversation_id
    and r.expert_id = p_expert_id
    and r.message_hash = encode(
      extensions.digest(convert_to(p_question, 'UTF8'), 'sha256'), 'hex'
    )
    and r.status = 'processing'
    and r.locked_until > now()
  for update;
  if not found then
    raise exception 'active_chat_reservation_required' using errcode = '23514';
  end if;
  if p_persona_version_id is not null
     and p_persona_version_id is distinct from effective_persona_version_id then
    raise exception 'persona_version_mismatch' using errcode = '23514';
  end if;

  if p_question ~* '(收費|價錢|幾錢|pricing|price|cost)' then
    lead_delta := lead_delta + 20;
    detected_signals := detected_signals || array['問價錢'];
  end if;
  if p_question ~* '(預約|booking|book|appointment|會面|見面)' then
    lead_delta := lead_delta + 20;
    detected_signals := detected_signals || array['問預約'];
  end if;
  if p_question ~* '(導入|合作|企業|公司|團隊|enterprise|company|team)' then
    lead_delta := lead_delta + 20;
    detected_signals := detected_signals || array['問公司導入'];
  end if;

  insert into public.messages (
    conversation_id, role, content, source, request_id, server_generated
  ) values (
    p_conversation_id, 'user', left(p_question, 800), 'user', p_request_id, true
  ) returning id into user_message_id;

  insert into public.messages (
    conversation_id, role, content, source, citations, request_id,
    answer_basis, coverage, persona_version_id, retrieval, provider_usage,
    server_generated
  ) values (
    p_conversation_id, 'assistant', p_answer,
    case when p_answer_basis = 'knowledge' then 'kb' else 'llm' end,
    coalesce(p_citations, '[]'::jsonb), p_request_id, p_answer_basis,
    p_coverage, effective_persona_version_id, coalesce(p_retrieval, '[]'::jsonb),
    coalesce(p_provider_usage, '{}'::jsonb), true
  ) returning id into assistant_id;

  update public.conversations
  set updated_at = now(), title = coalesce(nullif(title, ''), left(p_question, 80))
  where id = p_conversation_id;

  select p.id, coalesce(u.is_anonymous, false)
  into profile_id, owner_is_anonymous
  from auth.users u
  left join public.profiles p on p.id = u.id
  where u.id = p_owner_id;
  insert into public.leads (
    user_id, owner_id, expert_id, persona, source_conversation_id,
    last_message_id, owner_is_anonymous, score, signals, questions,
    last_activity_at
  ) values (
    profile_id, p_owner_id, p_expert_id, p_persona, p_conversation_id,
    assistant_id, owner_is_anonymous, least(100, lead_delta), detected_signals,
    '[]'::jsonb, now()
  ) on conflict (owner_id, expert_id) do update set
    user_id = excluded.user_id,
    persona = excluded.persona,
    source_conversation_id = excluded.source_conversation_id,
    last_message_id = excluded.last_message_id,
    owner_is_anonymous = excluded.owner_is_anonymous,
    score = least(100, coalesce(public.leads.score, 0) + lead_delta),
    signals = array(
      select distinct unnest(coalesce(public.leads.signals, '{}') || detected_signals)
    ),
    last_activity_at = now()
  returning id into crm_lead_id;

  insert into public.lead_interactions (
    lead_id, expert_id, owner_id, conversation_id, message_id, question,
    signals, score_delta, occurred_at
  ) values (
    crm_lead_id, p_expert_id, p_owner_id, p_conversation_id, user_message_id,
    left(p_question, 800), detected_signals, least(100, lead_delta), now()
  );

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

revoke all on function public.persist_chat_round(
  uuid, uuid, uuid, text, text, text, text, text, text, jsonb, uuid, jsonb,
  jsonb, text, integer, text
) from public, anon, authenticated;
grant execute on function public.persist_chat_round(
  uuid, uuid, uuid, text, text, text, text, text, text, jsonb, uuid, jsonb,
  jsonb, text, integer, text
) to service_role;

-- Exact CRM totals are computed server-side so capped browser previews never
-- masquerade as complete workspace metrics. Authorization is checked before
-- the definer-owned aggregate can read across RLS-protected rows.
create or replace function public.get_expert_crm_summary(p_expert_id uuid)
returns table (
  conversation_count bigint,
  lead_count bigint,
  high_intent_count bigint,
  following_up_count bigint,
  converted_count bigint
)
language plpgsql
security definer
stable
set search_path = pg_catalog, public
as $$
begin
  if p_expert_id is null or not public.owns_expert(p_expert_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  return query
  select
    (
      select count(*)
      from public.conversations c
      where c.expert_id = p_expert_id
    ),
    count(*)::bigint,
    count(*) filter (where coalesce(l.score, 0) >= 70)::bigint,
    count(*) filter (where l.stage = '跟進中')::bigint,
    count(*) filter (where l.stage = '已轉化')::bigint
  from public.leads l
  where l.expert_id = p_expert_id;
end;
$$;

revoke all on function public.get_expert_crm_summary(uuid)
from public, anon, authenticated;
grant execute on function public.get_expert_crm_summary(uuid) to authenticated;

create or replace function public.get_admin_crm_summary()
returns table (
  lead_count bigint,
  high_intent_count bigint,
  week_new_count bigint,
  new_count bigint,
  contacted_count bigint,
  following_up_count bigint,
  converted_count bigint
)
language plpgsql
security definer
stable
set search_path = pg_catalog, public
as $$
begin
  if not public.is_admin() then
    raise exception 'admin_required' using errcode = '42501';
  end if;
  return query
  select
    count(*)::bigint,
    count(*) filter (where coalesce(l.score, 0) >= 70)::bigint,
    count(*) filter (where l.created_at >= now() - interval '7 days')::bigint,
    count(*) filter (where l.stage = '新線索')::bigint,
    count(*) filter (where l.stage = '已接觸')::bigint,
    count(*) filter (where l.stage = '跟進中')::bigint,
    count(*) filter (where l.stage = '已轉化')::bigint
  from public.leads l;
end;
$$;

revoke all on function public.get_admin_crm_summary()
from public, anon, authenticated;
grant execute on function public.get_admin_crm_summary() to authenticated;

create or replace function public.update_expert_lead(
  p_lead_id uuid,
  p_stage text,
  p_note text default null,
  p_next_follow_up_at timestamptz default null
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  lead_row public.leads%rowtype;
begin
  if p_stage not in ('新線索', '已接觸', '跟進中', '已轉化') then
    raise exception 'invalid_lead_stage' using errcode = '22023';
  end if;
  select * into lead_row
  from public.leads
  where id = p_lead_id
  for update;
  if not found then raise exception 'lead_not_found' using errcode = 'P0002'; end if;
  if lead_row.expert_id is null or not public.owns_expert(lead_row.expert_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  update public.leads
  set stage = p_stage,
      next_follow_up_at = p_next_follow_up_at,
      timeline = (
        case
          when jsonb_array_length(coalesce(timeline, '[]'::jsonb)) >= 100
            then coalesce(timeline, '[]'::jsonb) - 0
          else coalesce(timeline, '[]'::jsonb)
        end
      ) || jsonb_build_array(
        jsonb_build_object(
          'date', to_char(now() at time zone 'Asia/Hong_Kong', 'YYYY-MM-DD HH24:MI'),
          'label', '階段更新 — 移至' || p_stage,
          'actor_id', auth.uid()
        )
      ),
      last_activity_at = now()
  where id = p_lead_id;

  if nullif(btrim(coalesce(p_note, '')), '') is not null then
    insert into public.lead_notes (lead_id, expert_id, author_id, body)
    values (p_lead_id, lead_row.expert_id, auth.uid(), left(btrim(p_note), 2000));
  end if;

  insert into public.audit_events (
    actor_id, expert_id, action, entity_type, entity_id, metadata
  ) values (
    auth.uid(), lead_row.expert_id, 'lead.stage_updated', 'lead', p_lead_id,
    jsonb_build_object(
      'old_stage', lead_row.stage,
      'new_stage', p_stage,
      'next_follow_up_at', p_next_follow_up_at,
      'note_added', nullif(btrim(coalesce(p_note, '')), '') is not null
    )
  );
end;
$$;

revoke all on function public.update_expert_lead(uuid, text, text, timestamptz)
from public, anon, authenticated;
grant execute on function public.update_expert_lead(uuid, text, text, timestamptz)
to authenticated;

create or replace function public.update_lead_stage(p_lead_id uuid, p_stage text)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  perform public.update_expert_lead(p_lead_id, p_stage, null, null);
end;
$$;

revoke all on function public.update_lead_stage(uuid, text)
from public, anon, authenticated;
grant execute on function public.update_lead_stage(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Consented public social sync. TikHub is not OAuth: it may be selected only
-- for public TikTok/Instagram identifiers. YouTube is reserved for a future
-- official OAuth adapter and is never dispatched through TikHub.
-- ---------------------------------------------------------------------------

update public.experts
set feature_flags = feature_flags || '{"social_sync_enabled":false}'::jsonb
where not (feature_flags ? 'social_sync_enabled');

create table if not exists public.social_connections (
  id uuid primary key default gen_random_uuid(),
  expert_id uuid not null references public.experts(id) on delete cascade,
  platform text not null check (platform in ('tiktok', 'instagram', 'youtube')),
  source text not null check (source in ('tikhub_public', 'official_oauth')),
  account_identifier text not null,
  canonical_url text,
  provider_account_id text,
  consent_status text not null default 'active'
    check (consent_status in ('active', 'revoked')),
  consent_version text not null default '2026-08-10',
  consented_at timestamptz not null default now(),
  revoked_at timestamptz,
  use_for_distillation boolean not null default true,
  sync_enabled boolean not null default true,
  last_synced_at timestamptz,
  next_sync_at timestamptz not null default now(),
  last_error text,
  cursor text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (expert_id, platform),
  check (source <> 'tikhub_public' or platform in ('tiktok', 'instagram')),
  check (char_length(btrim(account_identifier)) between 2 and 300)
);

create table if not exists public.social_sync_jobs (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.social_connections(id) on delete cascade,
  expert_id uuid not null references public.experts(id) on delete cascade,
  sync_date date not null,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'retry', 'complete', 'failed', 'cancelled')),
  attempts integer not null default 0 check (attempts between 0 and 3),
  next_retry_at timestamptz not null default now(),
  locked_at timestamptz,
  locked_by text,
  provider_request_id text,
  fetched_count integer,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (connection_id, sync_date)
);
create index if not exists social_sync_jobs_claim_idx
on public.social_sync_jobs(status, next_retry_at, created_at);

create table if not exists public.social_sync_invocation_leases (
  lease_name text primary key check (lease_name = 'social-sync'),
  locked_by text,
  locked_until timestamptz,
  updated_at timestamptz not null default now(),
  check ((locked_by is null) = (locked_until is null))
);

create table if not exists public.social_content_items (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.social_connections(id) on delete cascade,
  expert_id uuid not null references public.experts(id) on delete cascade,
  platform text not null check (platform in ('tiktok', 'instagram')),
  provider_content_id text not null,
  canonical_url text not null,
  content_type text,
  title text,
  text_content text,
  thumbnail_url text,
  published_at timestamptz,
  public_metrics jsonb not null default '{}'::jsonb,
  provider_meta jsonb not null default '{}'::jsonb,
  knowledge_source_id uuid references public.knowledge_sources(id) on delete set null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (connection_id, provider_content_id)
);
create index if not exists social_content_expert_published_idx
on public.social_content_items(expert_id, published_at desc);

-- Normalize any pre-release rows before enforcing immutable connection scope.
update public.social_sync_jobs j
set expert_id = sc.expert_id
from public.social_connections sc
where sc.id = j.connection_id and j.expert_id is distinct from sc.expert_id;
update public.social_content_items sci
set expert_id = sc.expert_id, platform = sc.platform
from public.social_connections sc
where sc.id = sci.connection_id
  and (sci.expert_id is distinct from sc.expert_id
    or sci.platform is distinct from sc.platform);

alter table public.social_sync_jobs
  drop constraint if exists social_sync_jobs_connection_expert_fkey;
alter table public.social_content_items
  drop constraint if exists social_content_connection_scope_fkey;
alter table public.social_connections
  drop constraint if exists social_connections_id_expert_unique;
alter table public.social_connections
  drop constraint if exists social_connections_id_expert_platform_unique;
alter table public.social_connections
  add constraint social_connections_id_expert_unique unique (id, expert_id);
alter table public.social_connections
  add constraint social_connections_id_expert_platform_unique
  unique (id, expert_id, platform);
alter table public.social_sync_jobs
  add constraint social_sync_jobs_connection_expert_fkey
  foreign key (connection_id, expert_id)
  references public.social_connections(id, expert_id) on delete cascade;
alter table public.social_content_items
  add constraint social_content_connection_scope_fkey
  foreign key (connection_id, expert_id, platform)
  references public.social_connections(id, expert_id, platform) on delete cascade;

alter table public.social_connections enable row level security;
alter table public.social_sync_jobs enable row level security;
alter table public.social_sync_invocation_leases enable row level security;
alter table public.social_content_items enable row level security;

drop policy if exists social_connections_owner_read on public.social_connections;
create policy social_connections_owner_read on public.social_connections
for select to authenticated
using (public.owns_expert(expert_id));
drop policy if exists social_sync_jobs_owner_read on public.social_sync_jobs;
create policy social_sync_jobs_owner_read on public.social_sync_jobs
for select to authenticated
using (public.owns_expert(expert_id));
drop policy if exists social_content_owner_read on public.social_content_items;
create policy social_content_owner_read on public.social_content_items
for select to authenticated
using (public.owns_expert(expert_id));

revoke insert, update, delete on public.social_connections from anon, authenticated;
revoke insert, update, delete on public.social_sync_jobs from anon, authenticated;
revoke all on public.social_sync_invocation_leases from public, anon, authenticated;
revoke insert, update, delete on public.social_content_items from anon, authenticated;
grant select on public.social_connections, public.social_sync_jobs,
  public.social_content_items to authenticated;
grant all on public.social_connections, public.social_sync_jobs,
  public.social_content_items to service_role;
grant all on public.social_sync_invocation_leases to service_role;

create or replace function public.upsert_social_connection(
  p_expert_id uuid,
  p_platform text,
  p_account_identifier text,
  p_use_for_distillation boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  connection_id uuid;
  normalized_identifier text := btrim(coalesce(p_account_identifier, ''));
  selected_source text;
begin
  if not exists (
    select 1 from public.account_access
    where user_id = auth.uid()
      and app_role = 'expert'
      and expert_id = p_expert_id
  ) then
    raise exception 'instructor_consent_required' using errcode = '42501';
  end if;
  if p_platform = 'youtube' then
    raise exception 'youtube_requires_verified_oauth' using errcode = '22023';
  end if;
  if p_platform not in ('tiktok', 'instagram') then
    raise exception 'unsupported_social_platform' using errcode = '22023';
  end if;
  if char_length(normalized_identifier) not between 2 and 300 then
    raise exception 'invalid_account_identifier' using errcode = '22023';
  end if;
  if normalized_identifier ~* '(^|[?&])(cookie|session(id)?|password|access_?token|refresh_?token)='
     or normalized_identifier ~* '://[^/@:]+:[^/@]+@' then
    raise exception 'credentials_not_allowed' using errcode = '22023';
  end if;

  selected_source := 'tikhub_public';

  insert into public.social_connections (
    expert_id, platform, source, account_identifier, consent_status,
    consent_version, consented_at, revoked_at, use_for_distillation,
    sync_enabled, next_sync_at, last_error, provider_account_id,
    canonical_url, cursor, last_synced_at, created_by
  ) values (
    p_expert_id, p_platform, selected_source, normalized_identifier, 'active',
    '2026-08-10', now(), null, coalesce(p_use_for_distillation, true),
    true, now(), null, null, null, null, null, auth.uid()
  )
  on conflict (expert_id, platform) do update set
    source = excluded.source,
    account_identifier = excluded.account_identifier,
    consent_status = 'active',
    consent_version = excluded.consent_version,
    consented_at = now(),
    revoked_at = null,
    use_for_distillation = excluded.use_for_distillation,
    sync_enabled = excluded.sync_enabled,
    next_sync_at = now(),
    last_error = null,
    provider_account_id = null,
    canonical_url = null,
    cursor = null,
    last_synced_at = null,
    updated_at = now()
  returning id into connection_id;

  insert into public.audit_events (
    actor_id, expert_id, action, entity_type, entity_id, metadata
  ) values (
    auth.uid(), p_expert_id, 'social.connection_consented',
    'social_connection', connection_id,
    jsonb_build_object(
      'platform', p_platform,
      'source', selected_source,
      'consent_version', '2026-08-10',
      'use_for_distillation', coalesce(p_use_for_distillation, true),
      'youtube_sync_blocked', false
    )
  );
  return connection_id;
end;
$$;

revoke all on function public.upsert_social_connection(uuid, text, text, boolean)
from public, anon, authenticated;
grant execute on function public.upsert_social_connection(uuid, text, text, boolean)
to authenticated;

create or replace function public.revoke_social_connection(p_connection_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  connection_row public.social_connections%rowtype;
begin
  select * into connection_row
  from public.social_connections
  where id = p_connection_id
  for update;
  if not found then raise exception 'social_connection_not_found' using errcode = 'P0002'; end if;
  if not public.owns_expert(connection_row.expert_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  update public.social_connections
  set consent_status = 'revoked', revoked_at = now(), sync_enabled = false,
      provider_account_id = null, canonical_url = null, cursor = null,
      last_synced_at = null, last_error = null, updated_at = now()
  where id = p_connection_id;

  -- Use the same source -> job -> revision lock order as atomic distillation
  -- completion. If a provider call is in flight, revoke waits for its atomic
  -- write and then erases it; if revoke wins, completion fails closed.
  perform 1
  from public.knowledge_sources ks
  where ks.id in (
    select knowledge_source_id
    from public.social_content_items
    where connection_id = p_connection_id and knowledge_source_id is not null
  )
  order by ks.id
  for update;
  update public.social_sync_jobs
  set status = 'cancelled', locked_at = null, locked_by = null, updated_at = now()
  where connection_id = p_connection_id and status in ('pending', 'retry', 'processing');

  update public.distillation_jobs dj
  set status = 'failed', locked_at = null, locked_by = null,
      error_message = 'Source consent revoked', updated_at = now()
  where dj.revision_id in (
    select kr.id
    from public.knowledge_revisions kr
    join public.social_content_items sci on sci.knowledge_source_id = kr.source_id
    where sci.connection_id = p_connection_id
  ) and dj.status in ('pending', 'retry', 'processing');

  update public.knowledge_sources ks
  set archived_at = now(), updated_at = now()
  where ks.id in (
    select knowledge_source_id from public.social_content_items
    where connection_id = p_connection_id and knowledge_source_id is not null
  );
  delete from public.knowledge_chunks kc
  using public.knowledge_revisions kr, public.social_content_items sci
  where kc.revision_id = kr.id
    and kr.source_id = sci.knowledge_source_id
    and sci.connection_id = p_connection_id;
  update public.knowledge_revisions kr
  set raw_text = null, extracted_text = null, distilled_json = null,
      status = 'archived', error_message = 'Source consent revoked'
  where kr.source_id in (
    select knowledge_source_id from public.social_content_items
    where connection_id = p_connection_id and knowledge_source_id is not null
  );
  delete from public.social_content_items where connection_id = p_connection_id;

  insert into public.audit_events (
    actor_id, expert_id, action, entity_type, entity_id, metadata
  ) values (
    auth.uid(), connection_row.expert_id, 'social.connection_revoked',
    'social_connection', p_connection_id,
    jsonb_build_object('platform', connection_row.platform, 'content_deleted', true)
  );
end;
$$;

revoke all on function public.revoke_social_connection(uuid)
from public, anon, authenticated;
grant execute on function public.revoke_social_connection(uuid) to authenticated;

create or replace function public.archive_expert_workspace(p_expert_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  expert_row public.experts%rowtype;
  connection_row record;
begin
  if not public.is_super_admin() then
    raise exception 'super_admin_required' using errcode = '42501';
  end if;
  select * into expert_row
  from public.experts
  where id = p_expert_id and slug <> 'platform' and archived_at is null
  for update;
  if not found then raise exception 'expert_not_found' using errcode = 'P0002'; end if;
  if exists (
    select 1 from public.bookings
    where expert_id = p_expert_id
      and status in ('requested', 'confirmed')
      and ends_at > now()
  ) then
    raise exception 'future_bookings_require_resolution' using errcode = '23514';
  end if;

  update public.experts
  set archived_at = now(), status = 'suspended', verified = false,
      public_profile_enabled = false,
      feature_flags = jsonb_build_object(
        'cms_ingestion_enabled', false,
        'rag_enabled', false,
        'booking_enabled', false,
        'persona_compiler_enabled', false,
        'social_sync_enabled', false
      ),
      updated_at = now()
  where id = p_expert_id;

  update public.distillation_jobs dj
  set status = 'failed', locked_at = null, locked_by = null,
      error_message = 'Expert workspace archived', updated_at = now()
  where dj.status in ('pending', 'processing', 'retry')
    and exists (
      select 1
      from public.knowledge_revisions kr
      join public.knowledge_sources ks on ks.id = kr.source_id
      where kr.id = dj.revision_id and ks.expert_id = p_expert_id
    );
  update public.persona_synthesis_jobs
  set status = 'failed', locked_at = null, locked_by = null,
      error_message = 'Expert workspace archived', updated_at = now()
  where expert_id = p_expert_id and status in ('pending', 'processing', 'retry');

  for connection_row in
    select id from public.social_connections
    where expert_id = p_expert_id and consent_status = 'active'
    order by id
  loop
    perform public.revoke_social_connection(connection_row.id);
  end loop;

  update public.expert_invitations
  set status = 'revoked', revoked_at = now(), updated_at = now()
  where expert_id = p_expert_id and status = 'pending';
  update public.account_access
  set app_role = 'member', expert_id = null
  where expert_id = p_expert_id and app_role = 'expert';

  insert into public.audit_events (
    actor_id, expert_id, action, entity_type, entity_id, metadata
  ) values (
    auth.uid(), p_expert_id, 'expert.workspace_archived', 'expert', p_expert_id,
    jsonb_build_object('previous_status', expert_row.status, 'private_data_preserved', true)
  );
end;
$$;

create or replace function public.restore_expert_workspace(p_expert_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if not public.is_super_admin() then
    raise exception 'super_admin_required' using errcode = '42501';
  end if;
  perform 1
  from public.experts
  where id = p_expert_id and slug <> 'platform' and archived_at is not null
  for update;
  if not found then raise exception 'archived_expert_not_found' using errcode = 'P0002'; end if;

  -- The capacity trigger takes the same advisory lock as creation. Restored
  -- workspaces return as private drafts and require a new owner invitation and
  -- complete release evaluation before any feature can be enabled.
  update public.experts
  set archived_at = null, status = 'draft', verified = false,
      public_profile_enabled = false,
      feature_flags = jsonb_build_object(
        'cms_ingestion_enabled', false,
        'rag_enabled', false,
        'booking_enabled', false,
        'persona_compiler_enabled', false,
        'social_sync_enabled', false
      ),
      updated_at = now()
  where id = p_expert_id;
  insert into public.audit_events (
    actor_id, expert_id, action, entity_type, entity_id, metadata
  ) values (
    auth.uid(), p_expert_id, 'expert.workspace_restored', 'expert', p_expert_id,
    jsonb_build_object('status', 'draft', 'features_enabled', false)
  );
end;
$$;

revoke all on function public.archive_expert_workspace(uuid)
from public, anon, authenticated;
revoke all on function public.restore_expert_workspace(uuid)
from public, anon, authenticated;
grant execute on function public.archive_expert_workspace(uuid) to authenticated;
grant execute on function public.restore_expert_workspace(uuid) to authenticated;

create or replace function public.queue_due_social_syncs(
  p_sync_date date default current_date
)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  queued_count integer;
begin
  insert into public.social_sync_jobs (connection_id, expert_id, sync_date)
  select sc.id, sc.expert_id, p_sync_date
  from public.social_connections sc
  join public.experts e on e.id = sc.expert_id
  where e.status = 'active'
    and sc.consent_status = 'active'
    and sc.sync_enabled
    and sc.source = 'tikhub_public'
    and sc.platform in ('tiktok', 'instagram')
    and sc.next_sync_at <= now()
    and coalesce((e.feature_flags ->> 'social_sync_enabled')::boolean, false)
  on conflict (connection_id, sync_date) do nothing;
  get diagnostics queued_count = row_count;
  return queued_count;
end;
$$;

create or replace function public.acquire_social_sync_invocation_lease(
  p_worker_id text,
  p_lease_seconds integer default 120
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  acquired boolean;
  normalized_worker_id text := left(btrim(coalesce(p_worker_id, '')), 120);
  lease_seconds integer := least(greatest(coalesce(p_lease_seconds, 120), 30), 180);
begin
  if normalized_worker_id = '' then
    raise exception 'social_sync_worker_id_required' using errcode = '22023';
  end if;

  insert into public.social_sync_invocation_leases (
    lease_name, locked_by, locked_until, updated_at
  ) values (
    'social-sync', normalized_worker_id,
    now() + make_interval(secs => lease_seconds), now()
  )
  on conflict (lease_name) do update set
    locked_by = excluded.locked_by,
    locked_until = excluded.locked_until,
    updated_at = now()
  where public.social_sync_invocation_leases.locked_until is null
     or public.social_sync_invocation_leases.locked_until <= now()
     or public.social_sync_invocation_leases.locked_by = normalized_worker_id
  returning true into acquired;

  return coalesce(acquired, false);
end;
$$;

create or replace function public.release_social_sync_invocation_lease(
  p_worker_id text
)
returns void
language sql
security definer
set search_path = pg_catalog, public
as $$
  update public.social_sync_invocation_leases
  set locked_by = null, locked_until = null, updated_at = now()
  where lease_name = 'social-sync'
    and locked_by = left(btrim(coalesce(p_worker_id, '')), 120);
$$;

create or replace function public.claim_social_sync_jobs(
  p_worker_id text,
  p_limit integer default 1
)
returns setof public.social_sync_jobs
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if coalesce(p_limit, 1) <> 1 then
    raise exception 'social_sync_claim_limit_must_be_one' using errcode = '22023';
  end if;

  perform 1
  from public.social_sync_invocation_leases l
  where l.lease_name = 'social-sync'
    and l.locked_by = left(btrim(coalesce(p_worker_id, '')), 120)
    and l.locked_until > now()
  for update;
  if not found then
    raise exception 'social_sync_invocation_lease_required' using errcode = '55P03';
  end if;

  return query
  with picked as (
    select j.id
    from public.social_sync_jobs j
    join public.social_connections sc on sc.id = j.connection_id
    join public.experts e on e.id = sc.expert_id
    where j.status in ('pending', 'retry')
      and j.attempts < 3
      and j.next_retry_at <= now()
      and e.status = 'active'
      and coalesce((e.feature_flags ->> 'social_sync_enabled')::boolean, false)
      and sc.consent_status = 'active'
      and sc.sync_enabled
      and sc.source = 'tikhub_public'
      and sc.platform in ('tiktok', 'instagram')
    order by j.created_at
    for update of j skip locked
    limit 1
  )
  update public.social_sync_jobs j
  set status = 'processing', attempts = attempts + 1,
      locked_at = now(), locked_by = left(p_worker_id, 120), updated_at = now()
  from picked
  where j.id = picked.id
  returning j.*;
end;
$$;

create or replace function public.finish_social_sync_job(
  p_job_id uuid,
  p_worker_id text,
  p_success boolean,
  p_fetched_count integer default 0,
  p_provider_request_id text default null,
  p_cursor text default null,
  p_error_message text default null,
  p_retryable boolean default true
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  job_row public.social_sync_jobs%rowtype;
  target_connection_id uuid;
begin
  select connection_id into target_connection_id
  from public.social_sync_jobs where id = p_job_id;
  if not found then raise exception 'social_sync_job_not_found'; end if;
  -- Keep the same connection -> job lock order as consent revocation and the
  -- atomic success path, avoiding a revoke/worker deadlock.
  perform 1 from public.social_connections
  where id = target_connection_id for update;
  select * into job_row
  from public.social_sync_jobs
  where id = p_job_id
  for update;
  if not found then raise exception 'social_sync_job_not_found'; end if;
  if job_row.status <> 'processing' or job_row.locked_by <> left(p_worker_id, 120) then
    raise exception 'social_sync_job_lease_mismatch';
  end if;

  if p_success then
    update public.social_sync_jobs
    set status = 'complete', fetched_count = greatest(coalesce(p_fetched_count, 0), 0),
        provider_request_id = left(p_provider_request_id, 200), error_message = null,
        locked_at = null, locked_by = null, updated_at = now()
    where id = p_job_id;
    update public.social_connections
    set last_synced_at = now(), next_sync_at = now() + interval '24 hours',
        cursor = left(p_cursor, 2000), last_error = null, updated_at = now()
    where id = job_row.connection_id;
  else
    update public.social_sync_jobs
    set status = case
          when not coalesce(p_retryable, true) or attempts >= 3 then 'failed'
          else 'retry'
        end,
        next_retry_at = now() + make_interval(mins => least(60, 5 * attempts * attempts)),
        provider_request_id = left(p_provider_request_id, 200),
        error_message = left(coalesce(p_error_message, 'Provider request failed'), 500),
        locked_at = null, locked_by = null, updated_at = now()
    where id = p_job_id;
    update public.social_connections
    set last_error = left(coalesce(p_error_message, 'Provider request failed'), 500),
        updated_at = now()
    where id = job_row.connection_id;
  end if;
end;
$$;

create or replace function public.requeue_stuck_social_sync_jobs()
returns void
language sql
security definer
set search_path = pg_catalog, public
as $$
  update public.social_sync_jobs
  set status = case when attempts >= 3 then 'failed' else 'retry' end,
      next_retry_at = now(), locked_at = null, locked_by = null,
      error_message = coalesce(error_message, 'Worker lease expired'),
      updated_at = now()
  where status = 'processing' and locked_at < now() - interval '15 minutes';
$$;

create or replace function public.stage_social_content_for_distillation(p_item_id uuid)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  item_row public.social_content_items%rowtype;
  connection_row public.social_connections%rowtype;
  new_source_id uuid;
  new_revision_id uuid;
begin
  select * into item_row
  from public.social_content_items
  where id = p_item_id
  for update;
  if not found then raise exception 'social_content_not_found'; end if;
  if item_row.knowledge_source_id is not null then return item_row.knowledge_source_id; end if;
  select * into connection_row
  from public.social_connections
  where id = item_row.connection_id;
  if connection_row.consent_status <> 'active'
     or not connection_row.use_for_distillation
     or char_length(btrim(coalesce(item_row.text_content, ''))) < 20 then
    return null;
  end if;
  if not exists (
    select 1 from public.experts e
    where e.id = item_row.expert_id
      and coalesce((e.feature_flags ->> 'cms_ingestion_enabled')::boolean, false)
  ) then return null; end if;

  insert into public.knowledge_sources (
    expert_id, source_type, title, source_url, tags, created_by
  ) values (
    item_row.expert_id, 'manual',
    left(coalesce(nullif(item_row.title, ''), initcap(item_row.platform) || ' post'), 240),
    item_row.canonical_url,
    array['social-sync', item_row.platform], null
  ) returning id into new_source_id;
  insert into public.knowledge_revisions (
    source_id, revision_no, raw_text, provider_meta
  ) values (
    new_source_id, 1, item_row.text_content,
    jsonb_build_object(
      'social_content_id', item_row.id,
      'platform', item_row.platform,
      'provider_content_id', item_row.provider_content_id,
      'source', connection_row.source
    )
  ) returning id into new_revision_id;
  insert into public.distillation_jobs (revision_id) values (new_revision_id);
  update public.social_content_items
  set knowledge_source_id = new_source_id
  where id = item_row.id;
  insert into public.audit_events (
    actor_id, expert_id, action, entity_type, entity_id, metadata
  ) values (
    null, item_row.expert_id, 'social.content_staged',
    'knowledge_source', new_source_id,
    jsonb_build_object('social_content_id', item_row.id, 'revision_id', new_revision_id)
  );
  return new_source_id;
end;
$$;

create or replace function public.persist_social_sync_result(
  p_job_id uuid,
  p_worker_id text,
  p_connection_id uuid,
  p_expert_id uuid,
  p_provider_account_id text,
  p_canonical_url text,
  p_items jsonb,
  p_provider_request_id text default null,
  p_cursor text default null
)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  connection_row public.social_connections%rowtype;
  job_row public.social_sync_jobs%rowtype;
  item jsonb;
  saved_item_id uuid;
  saved_count integer := 0;
  item_platform text;
  item_content_id text;
  item_url text;
begin
  if jsonb_typeof(coalesce(p_items, '[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(p_items, '[]'::jsonb)) > 20 then
    raise exception 'invalid_social_result_items' using errcode = '22023';
  end if;

  -- Revocation and persistence both lock the connection first. Whichever wins
  -- determines the outcome without allowing fetched data to cross revocation.
  select * into connection_row
  from public.social_connections
  where id = p_connection_id
  for update;
  if not found then raise exception 'social_connection_not_found' using errcode = 'P0002'; end if;
  if connection_row.expert_id <> p_expert_id
     or connection_row.consent_status <> 'active'
     or not connection_row.sync_enabled
     or connection_row.source <> 'tikhub_public'
     or connection_row.platform not in ('tiktok', 'instagram') then
    raise exception 'social_connection_not_active' using errcode = '23514';
  end if;
  perform 1
  from public.experts e
  where e.id = connection_row.expert_id
    and e.status = 'active'
    and coalesce((e.feature_flags ->> 'social_sync_enabled')::boolean, false)
  for update;
  if not found then
    raise exception 'social_sync_expert_disabled' using errcode = '23514';
  end if;
  perform 1
  from public.social_sync_invocation_leases l
  where l.lease_name = 'social-sync'
    and l.locked_by = left(btrim(coalesce(p_worker_id, '')), 120)
    and l.locked_until > now()
  for update;
  if not found then
    raise exception 'social_sync_invocation_lease_expired' using errcode = '55P03';
  end if;

  select * into job_row
  from public.social_sync_jobs
  where id = p_job_id
  for update;
  if not found then raise exception 'social_sync_job_not_found' using errcode = 'P0002'; end if;
  if job_row.connection_id <> connection_row.id
     or job_row.expert_id <> connection_row.expert_id
     or job_row.status <> 'processing'
     or job_row.locked_by <> left(p_worker_id, 120) then
    raise exception 'social_sync_job_lease_mismatch' using errcode = '23514';
  end if;

  update public.social_connections
  set provider_account_id = left(nullif(btrim(p_provider_account_id), ''), 300),
      canonical_url = left(nullif(btrim(p_canonical_url), ''), 2000),
      updated_at = now()
  where id = connection_row.id;

  for item in select value from jsonb_array_elements(coalesce(p_items, '[]'::jsonb))
  loop
    item_platform := item ->> 'platform';
    item_content_id := btrim(coalesce(item ->> 'provider_content_id', ''));
    item_url := btrim(coalesce(item ->> 'canonical_url', ''));
    if item_platform <> connection_row.platform
       or char_length(item_content_id) not between 1 and 300
       or char_length(item_url) not between 8 and 2000
       or item_url !~ '^https://'
       or jsonb_typeof(coalesce(item -> 'public_metrics', '{}'::jsonb)) <> 'object'
       or jsonb_typeof(coalesce(item -> 'provider_meta', '{}'::jsonb)) <> 'object' then
      raise exception 'invalid_social_result_item' using errcode = '22023';
    end if;

    insert into public.social_content_items (
      connection_id, expert_id, platform, provider_content_id, canonical_url,
      content_type, title, text_content, thumbnail_url, published_at,
      public_metrics, provider_meta, last_seen_at
    ) values (
      connection_row.id, connection_row.expert_id, connection_row.platform,
      item_content_id, item_url, left(item ->> 'content_type', 80),
      left(item ->> 'title', 500), item ->> 'text_content',
      left(item ->> 'thumbnail_url', 2000),
      nullif(item ->> 'published_at', '')::timestamptz,
      coalesce(item -> 'public_metrics', '{}'::jsonb),
      coalesce(item -> 'provider_meta', '{}'::jsonb), now()
    )
    on conflict (connection_id, provider_content_id) do update set
      canonical_url = excluded.canonical_url,
      content_type = excluded.content_type,
      title = excluded.title,
      text_content = excluded.text_content,
      thumbnail_url = excluded.thumbnail_url,
      published_at = excluded.published_at,
      public_metrics = excluded.public_metrics,
      provider_meta = excluded.provider_meta,
      last_seen_at = now()
    returning id into saved_item_id;
    saved_count := saved_count + 1;
    if connection_row.use_for_distillation then
      perform public.stage_social_content_for_distillation(saved_item_id);
    end if;
  end loop;

  update public.social_sync_jobs
  set status = 'complete', fetched_count = saved_count,
      provider_request_id = left(p_provider_request_id, 200), error_message = null,
      locked_at = null, locked_by = null, updated_at = now()
  where id = job_row.id;
  update public.social_connections
  set last_synced_at = now(), next_sync_at = now() + interval '24 hours',
      cursor = left(p_cursor, 2000), last_error = null, updated_at = now()
  where id = connection_row.id;
  return saved_count;
end;
$$;

revoke all on function public.queue_due_social_syncs(date)
from public, anon, authenticated;
revoke all on function public.acquire_social_sync_invocation_lease(text, integer)
from public, anon, authenticated;
revoke all on function public.release_social_sync_invocation_lease(text)
from public, anon, authenticated;
revoke all on function public.claim_social_sync_jobs(text, integer)
from public, anon, authenticated;
revoke all on function public.finish_social_sync_job(uuid, text, boolean, integer, text, text, text, boolean)
from public, anon, authenticated;
revoke all on function public.requeue_stuck_social_sync_jobs()
from public, anon, authenticated;
revoke all on function public.stage_social_content_for_distillation(uuid)
from public, anon, authenticated;
revoke all on function public.persist_social_sync_result(
  uuid, text, uuid, uuid, text, text, jsonb, text, text
) from public, anon, authenticated;
grant execute on function public.queue_due_social_syncs(date) to service_role;
grant execute on function public.acquire_social_sync_invocation_lease(text, integer)
to service_role;
grant execute on function public.release_social_sync_invocation_lease(text)
to service_role;
grant execute on function public.claim_social_sync_jobs(text, integer) to service_role;
grant execute on function public.finish_social_sync_job(uuid, text, boolean, integer, text, text, text, boolean)
to service_role;
grant execute on function public.requeue_stuck_social_sync_jobs() to service_role;
grant execute on function public.stage_social_content_for_distillation(uuid) to service_role;
grant execute on function public.persist_social_sync_result(
  uuid, text, uuid, uuid, text, text, jsonb, text, text
) to service_role;

create or replace function public.invoke_social_sync_worker()
returns bigint
language plpgsql
security definer
set search_path = pg_catalog, public, vault, net
as $$
declare
  project_url text;
  worker_secret text;
  request_id bigint;
begin
  select decrypted_secret into project_url
  from vault.decrypted_secrets where name = 'project_url' limit 1;
  select decrypted_secret into worker_secret
  from vault.decrypted_secrets where name = 'social_sync_worker_secret' limit 1;
  if nullif(btrim(project_url), '') is null
     or nullif(btrim(worker_secret), '') is null then
    raise exception 'social_sync_dispatch_not_configured' using errcode = '55000';
  end if;
  select net.http_post(
    url := rtrim(btrim(project_url), '/') || '/functions/v1/social-sync-worker',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-worker-secret', btrim(worker_secret)
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 10000
  ) into request_id;
  if request_id is null then
    raise exception 'social_sync_dispatch_enqueue_failed' using errcode = '58000';
  end if;
  return request_id;
end;
$$;

create or replace function public.dispatch_social_sync()
returns bigint
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  perform public.requeue_stuck_social_sync_jobs();
  perform public.queue_due_social_syncs((now() at time zone 'Asia/Hong_Kong')::date);
  return public.invoke_social_sync_worker();
end;
$$;

revoke all on function public.invoke_social_sync_worker()
from public, anon, authenticated;
revoke all on function public.dispatch_social_sync()
from public, anon, authenticated;
grant execute on function public.invoke_social_sync_worker() to service_role;
grant execute on function public.dispatch_social_sync() to service_role;

do $$
begin
  perform cron.unschedule(jobid) from cron.job
  where jobname = 'aigro-social-sync-dispatch';
  perform cron.schedule(
    'aigro-social-sync-dispatch',
    '*/15 * * * *',
    'select public.dispatch_social_sync()'
  );
end $$;

drop trigger if exists social_connections_touch on public.social_connections;
create trigger social_connections_touch
before update on public.social_connections
for each row execute function public.touch_updated_at();
drop trigger if exists social_sync_jobs_touch on public.social_sync_jobs;
create trigger social_sync_jobs_touch
before update on public.social_sync_jobs
for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Retrieval revocation, request idempotency/quota and retention.
-- ---------------------------------------------------------------------------

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
set search_path = pg_catalog, public, extensions
as $$
  select kc.id, kc.revision_id, ks.id, ks.title, ks.source_url, kc.content,
    kc.citation_meta,
    1 - (kc.embedding <=> p_query_embedding) as similarity
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

create table if not exists public.chat_ip_rate_limits (
  ip_hash text not null check (ip_hash ~ '^[0-9a-f]{64}$'),
  window_start timestamptz not null,
  request_count integer not null default 0,
  primary key (ip_hash, window_start)
);
alter table public.chat_ip_rate_limits enable row level security;
revoke all on public.chat_ip_rate_limits from anon, authenticated;
grant all on public.chat_ip_rate_limits to service_role;

create or replace function public.check_chat_rate_limits(
  p_user_id uuid,
  p_ip_hash text,
  p_user_limit integer default 12,
  p_ip_limit integer default 60
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  bucket timestamptz := date_trunc('minute', now());
  user_count integer;
  ip_count integer;
begin
  if p_user_id is null or p_ip_hash !~ '^[0-9a-f]{64}$' then return false; end if;
  perform pg_advisory_xact_lock(hashtextextended('aigro:rate:user:' || p_user_id::text, 0));
  perform pg_advisory_xact_lock(hashtextextended('aigro:rate:ip:' || p_ip_hash, 0));
  insert into public.chat_rate_limits (user_id, window_start, request_count)
  values (p_user_id, bucket, 1)
  on conflict (user_id, window_start) do update
  set request_count = public.chat_rate_limits.request_count + 1
  returning request_count into user_count;
  insert into public.chat_ip_rate_limits (ip_hash, window_start, request_count)
  values (p_ip_hash, bucket, 1)
  on conflict (ip_hash, window_start) do update
  set request_count = public.chat_ip_rate_limits.request_count + 1
  returning request_count into ip_count;
  delete from public.chat_rate_limits where window_start < now() - interval '10 minutes';
  delete from public.chat_ip_rate_limits where window_start < now() - interval '10 minutes';
  return user_count <= least(greatest(coalesce(p_user_limit, 12), 1), 120)
    and ip_count <= least(greatest(coalesce(p_ip_limit, 60), 1), 600);
end;
$$;
revoke all on function public.check_chat_rate_limits(uuid, text, integer, integer)
from public, anon, authenticated;
grant execute on function public.check_chat_rate_limits(uuid, text, integer, integer)
to service_role;

create table if not exists public.chat_request_reservations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null,
  message_hash text not null check (message_hash ~ '^[0-9a-f]{64}$'),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  expert_id uuid not null references public.experts(id) on delete cascade,
  persona_version_id uuid references public.expert_persona_versions(id) on delete restrict,
  status text not null default 'processing'
    check (status in ('processing', 'completed', 'failed')),
  locked_until timestamptz not null default now() + interval '2 minutes',
  error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, request_id)
);
create index if not exists chat_request_daily_quota_idx
on public.chat_request_reservations(user_id, created_at)
where status in ('processing', 'completed');
create index if not exists chat_request_active_conversation_idx
on public.chat_request_reservations(conversation_id, locked_until)
where status = 'processing';
alter table public.chat_request_reservations enable row level security;
revoke all on public.chat_request_reservations from anon, authenticated;

create or replace function public.reserve_chat_request(
  p_user_id uuid,
  p_request_id uuid,
  p_conversation_id uuid,
  p_expert_id uuid,
  p_message_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  existing_row public.chat_request_reservations%rowtype;
  account_role text;
  account_tier text;
  anonymous_user boolean := false;
  daily_limit integer;
  monthly_limit integer;
  used_today integer;
  used_this_month integer;
  target_persona_version_id uuid;
begin
  if p_message_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid_message_hash' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.conversations
    where id = p_conversation_id
      and owner_id = p_user_id
      and expert_id = p_expert_id
  ) then raise exception 'conversation_mismatch'; end if;

  select published_persona_version_id into target_persona_version_id
  from public.experts
  where id = p_expert_id;
  if target_persona_version_id is null then
    raise exception 'persona_version_unavailable';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('aigro:chat-quota:' || p_user_id::text, 0)
  );

  update public.chat_request_reservations
  set status = 'failed', locked_until = now(), error_code = 'lease_expired',
      updated_at = now()
  where user_id = p_user_id and status = 'processing' and locked_until <= now();

  select * into existing_row
  from public.chat_request_reservations
  where user_id = p_user_id and request_id = p_request_id
  for update;
  if found then
    if existing_row.conversation_id <> p_conversation_id
       or existing_row.expert_id <> p_expert_id then
      raise exception 'request_id_scope_mismatch';
    end if;
    if existing_row.message_hash <> p_message_hash then
      raise exception 'request_id_payload_mismatch' using errcode = '23514';
    end if;
    if existing_row.status = 'completed' then
      return jsonb_build_object('state', 'replay', 'remaining', null);
    end if;
    if existing_row.status = 'processing' and existing_row.locked_until > now() then
      return jsonb_build_object('state', 'in_progress', 'remaining', null);
    end if;
  end if;

  update public.chat_request_reservations
  set status = 'failed', locked_until = now(), error_code = 'lease_expired',
      updated_at = now()
  where conversation_id = p_conversation_id
    and status = 'processing'
    and locked_until <= now();

  if exists (
    select 1
    from public.chat_request_reservations r
    where r.conversation_id = p_conversation_id
      and r.request_id <> p_request_id
      and r.status = 'processing'
      and r.locked_until > now()
  ) then
    return jsonb_build_object(
      'state', 'conversation_in_progress', 'remaining', null
    );
  end if;

  select aa.app_role, aa.tier, coalesce(u.is_anonymous, false)
  into account_role, account_tier, anonymous_user
  from auth.users u
  left join public.account_access aa on aa.user_id = u.id
  where u.id = p_user_id;
  if not found then raise exception 'user_not_found'; end if;

  daily_limit := case
    when account_role in ('admin', 'super_admin') then 1000
    when account_tier = 'vip' then 200
    when account_tier = 'pro' then 100
    when anonymous_user then 10
    else 20
  end;
  monthly_limit := case
    when account_role in ('admin', 'super_admin') then 25000
    when account_tier = 'vip' then 5000
    when account_tier = 'pro' then 2000
    when anonymous_user then 100
    else 400
  end;
  select count(*) into used_today
  from public.chat_request_reservations
  where user_id = p_user_id
    and status in ('processing', 'completed')
    and request_id <> p_request_id
    and created_at >= (
      date_trunc('day', now() at time zone 'Asia/Hong_Kong')
      at time zone 'Asia/Hong_Kong'
    );
  if used_today >= daily_limit then
    return jsonb_build_object(
      'state', 'quota_exceeded', 'scope', 'daily',
      'remaining', 0, 'limit', daily_limit
    );
  end if;
  select count(*) into used_this_month
  from public.chat_request_reservations
  where user_id = p_user_id
    and status in ('processing', 'completed')
    and request_id <> p_request_id
    and created_at >= date_trunc(
      'month', now() at time zone 'Asia/Hong_Kong'
    ) at time zone 'Asia/Hong_Kong';
  if used_this_month >= monthly_limit then
    return jsonb_build_object(
      'state', 'quota_exceeded', 'scope', 'monthly',
      'remaining', 0, 'limit', monthly_limit
    );
  end if;

  insert into public.chat_request_reservations (
    user_id, request_id, message_hash, conversation_id, expert_id, persona_version_id, status,
    locked_until, error_code
  ) values (
    p_user_id, p_request_id, p_message_hash, p_conversation_id, p_expert_id,
    target_persona_version_id, 'processing',
    now() + interval '2 minutes', null
  )
  on conflict (user_id, request_id) do update set
    status = 'processing',
    message_hash = excluded.message_hash,
    persona_version_id = excluded.persona_version_id,
    locked_until = now() + interval '2 minutes',
    error_code = null,
    created_at = now(),
    updated_at = now();
  return jsonb_build_object(
    'state', 'reserved',
    'remaining', greatest(daily_limit - used_today - 1, 0),
    'limit', daily_limit
  );
end;
$$;

create or replace function public.fail_chat_request(
  p_user_id uuid,
  p_request_id uuid,
  p_error_code text default 'provider_error'
)
returns void
language sql
security definer
set search_path = pg_catalog, public
as $$
  update public.chat_request_reservations
  set status = 'failed', locked_until = now(),
      error_code = left(coalesce(p_error_code, 'provider_error'), 80),
      updated_at = now()
  where user_id = p_user_id and request_id = p_request_id
    and status = 'processing';
$$;

revoke all on function public.reserve_chat_request(uuid, uuid, uuid, uuid, text)
from public, anon, authenticated;
revoke all on function public.fail_chat_request(uuid, uuid, text)
from public, anon, authenticated;
grant execute on function public.reserve_chat_request(uuid, uuid, uuid, uuid, text)
to service_role;
grant execute on function public.fail_chat_request(uuid, uuid, text) to service_role;

create or replace function public.enforce_assistant_chat_reservation()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.role = 'assistant' and new.server_generated then
    if new.request_id is null
       or new.request_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       or not exists (
         select 1
         from public.chat_request_reservations r
         join public.conversations c on c.id = r.conversation_id
         where r.request_id = new.request_id::uuid
           and r.conversation_id = new.conversation_id
           and r.user_id = c.owner_id
           and r.expert_id = c.expert_id
           and r.persona_version_id is not distinct from new.persona_version_id
           and r.status = 'processing'
           and r.locked_until > now()
       ) then
      raise exception 'assistant_message_without_active_reservation'
        using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_assistant_chat_reservation()
from public, anon, authenticated;
drop trigger if exists messages_enforce_chat_reservation on public.messages;
create trigger messages_enforce_chat_reservation
before insert on public.messages
for each row execute function public.enforce_assistant_chat_reservation();

-- Mark the reservation complete inside the same transaction as messages/CRM.
create or replace function public.complete_chat_request_reservation()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  owner_id uuid;
begin
  if new.role = 'assistant' and new.request_id is not null then
    select c.owner_id into owner_id
    from public.conversations c where c.id = new.conversation_id;
    update public.chat_request_reservations
    set status = 'completed', locked_until = now(), error_code = null, updated_at = now()
    where user_id = owner_id
      and request_id::text = new.request_id
      and conversation_id = new.conversation_id;
  end if;
  return new;
end;
$$;

revoke all on function public.complete_chat_request_reservation()
from public, anon, authenticated;
drop trigger if exists messages_complete_chat_reservation on public.messages;
create trigger messages_complete_chat_reservation
after insert on public.messages
for each row execute function public.complete_chat_request_reservation();

create or replace function public.purge_expired_anonymous_chats()
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  deleted_count integer;
  affected_lead_id uuid;
begin
  for affected_lead_id in
    update public.leads l
    set legacy_questions_snapshot = '[]'::jsonb,
        legacy_questions_captured_at = null
    from auth.users u
    where l.owner_id = u.id
      and u.is_anonymous = true
      and l.legacy_questions_captured_at < now() - interval '30 days'
      and l.legacy_questions_snapshot <> '[]'::jsonb
    returning l.id
  loop
    perform public.refresh_lead_questions(affected_lead_id);
  end loop;
  delete from public.knowledge_gaps kg
  using public.messages m, public.conversations c, auth.users u
  where kg.message_id = m.id
    and m.conversation_id = c.id
    and c.owner_id = u.id
    and u.is_anonymous = true
    and m.created_at < now() - interval '30 days';
  delete from public.messages m
  using public.conversations c, auth.users u
  where m.conversation_id = c.id
    and c.owner_id = u.id
    and u.is_anonymous = true
    and m.created_at < now() - interval '30 days';
  delete from public.knowledge_gaps kg
  using public.conversations c, auth.users u
  where kg.conversation_id = c.id
    and c.owner_id = u.id
    and u.is_anonymous = true
    and c.updated_at < now() - interval '30 days';
  delete from public.leads l
  using auth.users u
  where l.owner_id = u.id
    and u.is_anonymous = true
    and coalesce(l.last_activity_at, l.created_at) < now() - interval '30 days';
  delete from public.conversations c
  using auth.users u
  where c.owner_id = u.id
    and u.is_anonymous = true
    and c.updated_at < now() - interval '30 days';
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function public.purge_expired_anonymous_chats()
from public, anon, authenticated;
grant execute on function public.purge_expired_anonymous_chats() to service_role;

-- Extend the master-admin readiness snapshot with corrected pending statuses
-- and the consented social-sync path. Only presence/counts are returned.
create or replace function public.get_backend_readiness()
returns jsonb
language plpgsql
security definer
stable
set search_path = pg_catalog, public
as $$
begin
  if not public.is_admin() then
    raise exception 'admin_required' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'generated_at', now(),
    'workers', jsonb_build_object(
      'knowledge_cron', exists (
        select 1 from cron.job where jobname = 'aigro-run-distillation-worker' and active
      ),
      'persona_cron', exists (
        select 1 from cron.job where jobname = 'aigro-run-persona-compiler' and active
      ),
      'distillation_requeue_cron', exists (
        select 1 from cron.job where jobname = 'aigro-requeue-stuck-distillation' and active
      ),
      'persona_requeue_cron', exists (
        select 1 from cron.job where jobname = 'aigro-requeue-stuck-persona-synthesis' and active
      ),
      'anonymous_purge_cron', exists (
        select 1 from cron.job where jobname = 'aigro-purge-anonymous-chats' and active
      ),
      'social_cron', exists (
        select 1 from cron.job where jobname = 'aigro-social-sync-dispatch' and active
      )
    ),
    'vault', jsonb_build_object(
      'project_url', exists (select 1 from vault.secrets where name = 'project_url'),
      'knowledge_worker_secret', exists (
        select 1 from vault.secrets where name = 'knowledge_worker_secret'
      ),
      'persona_compiler_secret', exists (
        select 1 from vault.secrets where name = 'persona_compiler_secret'
      ),
      'booking_webhook_secret', exists (
        select 1 from vault.secrets where name = 'booking_webhook_secret'
      ),
      'social_sync_worker_secret', exists (
        select 1 from vault.secrets where name = 'social_sync_worker_secret'
      )
    ),
    'storage', jsonb_build_object(
      'private_expert_kb', exists (
        select 1 from storage.buckets where id = 'expert-kb' and public = false
      )
    ),
    'experts', jsonb_build_object(
      'total', (select count(*) from public.experts),
      'instructor_total', (
        select count(*) from public.experts
        where slug <> 'platform' and archived_at is null
      ),
      'seat_used', (
        select count(*) from public.experts
        where slug <> 'platform' and archived_at is null
      ),
      'seat_limit', 20,
      'archived', (
        select count(*) from public.experts
        where slug <> 'platform' and archived_at is not null
      ),
      'active', (
        select count(*) from public.experts
        where status = 'active' and archived_at is null
      ),
      'cms_enabled', (
        select count(*) from public.experts
        where archived_at is null
          and coalesce((feature_flags ->> 'cms_ingestion_enabled')::boolean, false)
      ),
      'rag_enabled', (
        select count(*) from public.experts
        where archived_at is null
          and coalesce((feature_flags ->> 'rag_enabled')::boolean, false)
      ),
      'booking_enabled', (
        select count(*) from public.experts
        where archived_at is null
          and coalesce((feature_flags ->> 'booking_enabled')::boolean, false)
      ),
      'social_sync_enabled', (
        select count(*) from public.experts
        where archived_at is null
          and coalesce((feature_flags ->> 'social_sync_enabled')::boolean, false)
      ),
      'published_persona', (
        select count(*) from public.experts
        where archived_at is null and published_persona_version_id is not null
      )
    ),
    'knowledge', jsonb_build_object(
      'sources', (select count(*) from public.knowledge_sources),
      'approved_revisions', (
        select count(*) from public.knowledge_revisions where status = 'approved'
      ),
      'published_sources', (
        select count(*) from public.knowledge_sources
        where published_revision_id is not null and archived_at is null
      ),
      'chunks', (select count(*) from public.knowledge_chunks),
      'queued_or_processing_jobs', (
        select count(*) from public.distillation_jobs
        where status in ('pending', 'processing', 'retry')
      ),
      'failed_jobs', (
        select count(*) from public.distillation_jobs where status = 'failed'
      )
    ),
    'persona', jsonb_build_object(
      'versions', (select count(*) from public.expert_persona_versions),
      'evaluation_questions', (
        select count(*) from public.persona_evaluation_questions where active
      ),
      'queued_or_processing_jobs', (
        select count(*) from public.persona_synthesis_jobs
        where status in ('pending', 'processing', 'retry', 'review', 'approved')
      ),
      'failed_jobs', (
        select count(*) from public.persona_synthesis_jobs where status = 'failed'
      )
    ),
    'booking', jsonb_build_object(
      'availability_rules', (select count(*) from public.availability_rules),
      'bookings', (select count(*) from public.bookings)
    ),
    'chat_crm', jsonb_build_object(
      'conversations', (select count(*) from public.conversations),
      'messages', (select count(*) from public.messages),
      'leads', (select count(*) from public.leads),
      'knowledge_gaps', (select count(*) from public.knowledge_gaps),
      'quota_reservations', (select count(*) from public.chat_request_reservations)
    ),
    'social', jsonb_build_object(
      'active_connections', (
        select count(*) from public.social_connections where consent_status = 'active'
      ),
      'eligible_connections', (
        select count(*)
        from public.social_connections sc
        join public.experts e on e.id = sc.expert_id
        where sc.consent_status = 'active'
          and sc.sync_enabled
          and sc.source = 'tikhub_public'
          and sc.platform in ('tiktok', 'instagram')
          and e.status = 'active'
          and e.archived_at is null
          and coalesce((e.feature_flags ->> 'social_sync_enabled')::boolean, false)
      ),
      'recent_successful_connections', (
        select count(*)
        from public.social_connections sc
        join public.experts e on e.id = sc.expert_id
        where sc.consent_status = 'active'
          and sc.sync_enabled
          and sc.source = 'tikhub_public'
          and sc.platform in ('tiktok', 'instagram')
          and sc.last_synced_at >= now() - interval '48 hours'
          and sc.last_error is null
          and e.status = 'active'
          and e.archived_at is null
          and coalesce((e.feature_flags ->> 'social_sync_enabled')::boolean, false)
      ),
      'active_errors', (
        select count(*)
        from public.social_connections sc
        join public.experts e on e.id = sc.expert_id
        where sc.consent_status = 'active'
          and sc.sync_enabled
          and sc.last_error is not null
          and e.status = 'active'
          and e.archived_at is null
          and coalesce((e.feature_flags ->> 'social_sync_enabled')::boolean, false)
      ),
      'completed_jobs', (
        select count(*) from public.social_sync_jobs where status = 'complete'
      ),
      'last_success_at', (
        select max(last_synced_at) from public.social_connections
        where consent_status = 'active' and last_error is null
      ),
      'queued_or_processing_jobs', (
        select count(*) from public.social_sync_jobs
        where status in ('pending', 'processing', 'retry')
      ),
      'failed_jobs', (
        select count(*) from public.social_sync_jobs where status = 'failed'
      ),
      'content_items', (select count(*) from public.social_content_items)
    )
  );
end;
$$;

revoke all on function public.get_backend_readiness()
from public, anon, authenticated;
grant execute on function public.get_backend_readiness() to authenticated;
