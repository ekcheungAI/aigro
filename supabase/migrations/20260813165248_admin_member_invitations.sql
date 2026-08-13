-- Server-generated member invitations with super-admin-only visibility.
-- Auth links are deliberately not persisted: they are short-lived credentials.

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null check (
    email = lower(trim(email))
    and length(email) between 3 and 320
    and position('@' in email) > 1
  ),
  name text not null check (length(trim(name)) between 1 and 80),
  invited_by uuid not null references auth.users(id) on delete restrict,
  auth_user_id uuid references auth.users(id) on delete set null,
  member_class text not null default 'founding'
    check (member_class in ('free', 'founding')),
  tier text not null default 'free'
    check (tier in ('free', 'pro', 'vip')),
  personal_message text check (personal_message is null or length(personal_message) <= 1000),
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'delivered', 'accepted', 'expired', 'revoked', 'failed')),
  delivery_status text not null default 'queued'
    check (delivery_status in ('queued', 'sent', 'delivered', 'delayed', 'opened', 'clicked', 'bounced', 'complained', 'failed')),
  provider_message_id text unique,
  last_error_code text,
  send_count integer not null default 0 check (send_count >= 0),
  last_sent_at timestamptz,
  sent_at timestamptz,
  delivered_at timestamptz,
  accepted_at timestamptz,
  expires_at timestamptz not null default (now() + interval '1 hour'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index invitations_active_email_unique
on public.invitations (lower(email))
where status in ('pending', 'sent', 'delivered');

create index invitations_recent_idx
on public.invitations (created_at desc);

create index invitations_auth_user_idx
on public.invitations (auth_user_id)
where auth_user_id is not null;

alter table public.invitations enable row level security;

revoke all on table public.invitations from public, anon, authenticated;
grant select on table public.invitations to authenticated;
grant all on table public.invitations to service_role;

create policy "invitations_super_admin_read"
on public.invitations
for select
to authenticated
using ((select public.is_super_admin()));

drop trigger if exists invitations_touch on public.invitations;
create trigger invitations_touch
before update on public.invitations
for each row execute function public.touch_updated_at();

create or replace function public.apply_accepted_invitation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  invitation_row public.invitations%rowtype;
begin
  select * into invitation_row
  from public.invitations
  where (
      auth_user_id = new.id
      or (auth_user_id is null and lower(email) = lower(new.email))
    )
    and status in ('pending', 'sent', 'delivered')
  order by created_at desc
  limit 1
  for update;

  if not found then
    return new;
  end if;

  insert into public.account_access (
    user_id, app_role, member_class, tier
  ) values (
    new.id, 'member', invitation_row.member_class, invitation_row.tier
  )
  on conflict (user_id) do update
  set member_class = excluded.member_class,
      tier = excluded.tier,
      updated_at = now()
  where public.account_access.app_role = 'member';

  update public.invitations
  set auth_user_id = new.id,
      status = 'accepted',
      accepted_at = coalesce(accepted_at, now()),
      last_error_code = null
  where id = invitation_row.id;

  insert into public.audit_events (
    actor_id, action, entity_type, entity_id, metadata
  ) values (
    invitation_row.invited_by,
    'invitation.accepted',
    'invitation',
    invitation_row.id,
    jsonb_build_object('user_id', new.id)
  );

  return new;
end;
$$;

revoke all on function public.apply_accepted_invitation() from public, anon, authenticated;

drop trigger if exists profiles_apply_accepted_invitation on public.profiles;
create trigger profiles_apply_accepted_invitation
after insert on public.profiles
for each row execute function public.apply_accepted_invitation();
