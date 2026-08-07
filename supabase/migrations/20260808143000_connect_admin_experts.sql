-- Persist the fields exposed by Master Admin > Experts and make create/edit
-- atomic with the public expert profile plus an audit event.

alter table public.experts
  add column if not exists name_en text,
  add column if not exists name_zh text,
  add column if not exists title text,
  add column if not exists bio text,
  add column if not exists brand_color text,
  add column if not exists specialties text[] not null default '{}',
  add column if not exists quote text,
  add column if not exists credential text,
  add column if not exists verified boolean not null default false,
  add column if not exists radar jsonb not null default '[]'::jsonb,
  add column if not exists traits text[] not null default '{}';

update public.experts
set verified = true
where slug in ('jimmy-lau', 'elvin-cheung');

insert into public.experts (
  slug, display_name, name_en, name_zh, title, specialties, status, verified
)
values
  ('invited-expert-1', '領航專家席', 'Coming Soon', '領航專家席',
   '領航專家邀請中', array['AI 實戰', '增長系統'], 'draft', false),
  ('invited-expert-2', '領航專家席', 'Coming Soon', '領航專家席',
   '領航專家邀請中', array['社群增長', '私域運營'], 'draft', false)
on conflict (slug) do nothing;

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
set search_path = public, pg_temp
as $$
declare
  target_id uuid;
  target_status text := case when coalesce(p_verified, false) then 'active' else 'draft' end;
begin
  if not public.is_admin() then
    raise exception 'admin_required' using errcode = '42501';
  end if;
  if trim(coalesce(p_display_name, '')) = '' then
    raise exception 'display_name_required' using errcode = '22023';
  end if;
  if coalesce(p_slug, '') !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception 'invalid_expert_slug' using errcode = '22023';
  end if;
  if jsonb_typeof(coalesce(p_radar, '[]'::jsonb)) <> 'array' then
    raise exception 'radar_must_be_array' using errcode = '22023';
  end if;

  if p_expert_id is null then
    insert into public.experts (
      slug, display_name, name_en, name_zh, title, bio, brand_color,
      specialties, quote, credential, verified, radar, traits, status
    ) values (
      p_slug, trim(p_display_name), nullif(trim(coalesce(p_name_en, '')), ''),
      nullif(trim(coalesce(p_name_zh, '')), ''), nullif(trim(coalesce(p_title, '')), ''),
      nullif(trim(coalesce(p_bio, '')), ''), nullif(trim(coalesce(p_brand_color, '')), ''),
      coalesce(p_specialties, '{}'), nullif(trim(coalesce(p_quote, '')), ''),
      nullif(trim(coalesce(p_credential, '')), ''), coalesce(p_verified, false),
      coalesce(p_radar, '[]'::jsonb), coalesce(p_traits, '{}'), target_status
    )
    returning id into target_id;
  else
    update public.experts
    set display_name = trim(p_display_name),
        name_en = nullif(trim(coalesce(p_name_en, '')), ''),
        name_zh = nullif(trim(coalesce(p_name_zh, '')), ''),
        title = nullif(trim(coalesce(p_title, '')), ''),
        bio = nullif(trim(coalesce(p_bio, '')), ''),
        brand_color = nullif(trim(coalesce(p_brand_color, '')), ''),
        specialties = coalesce(p_specialties, '{}'),
        quote = nullif(trim(coalesce(p_quote, '')), ''),
        credential = nullif(trim(coalesce(p_credential, '')), ''),
        verified = coalesce(p_verified, false),
        radar = coalesce(p_radar, '[]'::jsonb),
        traits = coalesce(p_traits, '{}'),
        status = target_status
    where id = p_expert_id and slug = p_slug
    returning id into target_id;
    if target_id is null then
      raise exception 'expert_not_found' using errcode = 'P0002';
    end if;
  end if;

  insert into public.expert_profiles (slug, headline, bio, updated_at)
  values (
    p_slug,
    nullif(trim(coalesce(p_title, '')), ''),
    nullif(trim(coalesce(p_bio, '')), ''),
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
      'verified', coalesce(p_verified, false)
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
