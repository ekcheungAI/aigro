-- AIGRO API Radar: curated public API catalogue (unique migration slot).
--
-- public-apis/public-apis is an upstream discovery source only. Imported rows
-- stay in draft until AIGRO adds a zh-HK editorial summary and explicitly
-- publishes them. Public callers read through narrow SECURITY DEFINER RPCs;
-- the underlying maintenance fields remain admin-only.

create table if not exists public.api_directory_entries (
  id uuid primary key default gen_random_uuid(),
  name text not null
    check (char_length(btrim(name)) between 1 and 120),
  description_en text not null default ''
    check (char_length(description_en) <= 800),
  editorial_summary_zh_hk text not null default ''
    check (char_length(editorial_summary_zh_hk) <= 800),
  category text not null
    check (char_length(btrim(category)) between 1 and 80),
  use_cases text[] not null default '{}'
    check (cardinality(use_cases) <= 8),
  auth_type text not null default 'No'
    check (char_length(btrim(auth_type)) between 1 and 80),
  https_supported boolean not null default true,
  cors_status text not null default 'unknown'
    check (cors_status in ('yes', 'no', 'unknown')),
  docs_url text not null
    check (
      docs_url ~ '^https://[^[:space:]]+$'
      and docs_url !~ '^https://[^/@]+:[^/@]+@'
    ),
  hk_relevance text not null default 'medium'
    check (hk_relevance in ('high', 'medium', 'low')),
  source_kind text not null default 'manual'
    check (source_kind in ('public-apis', 'manual', 'data-gov-hk')),
  source_key text not null unique
    check (char_length(btrim(source_key)) between 3 and 180),
  source_url text
    check (source_url is null or source_url ~ '^https://[^[:space:]]+$'),
  upstream_ref text,
  last_seen_at timestamptz,
  review_state text not null default 'upstream_listed'
    check (review_state in ('upstream_listed', 'aigro_reviewed', 'live_check_passed')),
  last_reviewed_at date,
  status text not null default 'draft'
    check (status in ('draft', 'published', 'hidden')),
  hidden_at timestamptz,
  hidden_by uuid references auth.users(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint api_directory_publication_requires_editorial_review check (
    status <> 'published'
    or (
      btrim(editorial_summary_zh_hk) <> ''
      and review_state <> 'upstream_listed'
      and last_reviewed_at is not null
    )
  ),
  constraint api_directory_hidden_metadata_consistent check (
    (status = 'hidden' and hidden_at is not null)
    or (status <> 'hidden' and hidden_at is null and hidden_by is null)
  ),
  constraint api_directory_upstream_provenance_required check (
    source_kind <> 'public-apis'
    or (source_url is not null and btrim(coalesce(upstream_ref, '')) <> '')
  )
);

comment on table public.api_directory_entries is
  'Curated API discovery catalogue; separate from operational ingestion sources.';
comment on column public.api_directory_entries.docs_url is
  'Official provider documentation URL, never an arbitrary API proxy target.';
comment on column public.api_directory_entries.source_url is
  'Catalogue provenance URL, distinct from the provider documentation URL.';

create index if not exists api_directory_public_idx
  on public.api_directory_entries(status, category, name);
create index if not exists api_directory_source_idx
  on public.api_directory_entries(source_kind, source_key);

-- Small deterministic launch set. public-apis rows retain the canonical URL
-- identity from the pinned commit even when AIGRO presents a more useful
-- official docs URL/category or corrects an upstream display-name typo.
-- CoinGecko is explicitly manual because its pinned upstream row is HTTP-only
-- and therefore rejected by the importer. This is not a live-health certification.
with curated_seed (
  name,
  description_en,
  editorial_summary_zh_hk,
  category,
  use_cases,
  auth_type,
  https_supported,
  cors_status,
  docs_url,
  hk_relevance,
  source_kind,
  source_identity_url,
  source_key_override
) as (
  values
    (
      'Hong Kong Observatory',
      'Hong Kong weather and climate open data.',
      '香港天文台官方開放資料入口，適合建立本地天氣提示、活動規劃同營運儀表板。',
      'Weather',
      array['本地天氣監測', '戶外活動規劃']::text[],
      'No', true, 'unknown',
      'https://www.hko.gov.hk/en/abouthko/opendata_intro.htm',
      'high',
      'public-apis', 'https://www.hko.gov.hk/en/abouthko/opendata_intro.htm', null
    ),
    (
      'Hong Kong GeoData Store',
      'Hong Kong geographic datasets and map services.',
      '香港政府地理數據平台，可用於地圖、選址、門店營運同本地城市資料分析。',
      'Government',
      array['香港選址分析', '地圖與門店營運']::text[],
      'No', true, 'unknown',
      'https://geodata.gov.hk/gs/',
      'high',
      'public-apis', 'https://geodata.gov.hk/gs', null
    ),
    (
      'CoinGecko',
      'Cryptocurrency prices, markets and metadata.',
      '提供加密資產價格同市場資料，適合市場研究、價格提示同投資內容原型。',
      'Cryptocurrency',
      array['市場研究', '價格監測']::text[],
      'No', true, 'yes',
      'https://www.coingecko.com/en/api',
      'medium',
      'manual', null, 'manual:curated:coingecko'
    ),
    (
      'Frankfurter',
      'Current and historical foreign exchange rates.',
      '簡潔嘅外匯匯率資料，適合 HKD 報價換算、跨境電商同財務儀表板原型。',
      'Currency Exchange',
      array['HKD 匯率換算', '跨境電商報價']::text[],
      'No', true, 'yes',
      'https://www.frankfurter.app/docs',
      'high',
      'public-apis', 'https://www.frankfurter.app/docs', null
    ),
    (
      'GitHub',
      'Repository, issue, pull request and developer platform data.',
      'GitHub 官方 REST API，適合建立開發者工具、開源情報追蹤同團隊自動化。',
      'Development',
      array['開源情報追蹤', '開發流程自動化']::text[],
      'OAuth', true, 'yes',
      'https://docs.github.com/en/rest',
      'medium',
      'public-apis', 'https://docs.github.com/en/free-pro-team@latest/rest', null
    ),
    (
      'Hugging Face',
      'Models, datasets and machine-learning platform APIs.',
      '可搜尋模型、資料集同使用推理服務，適合 AI 產品研究同原型驗證。',
      'Machine Learning',
      array['AI 模型研究', '推理原型']::text[],
      'apiKey', true, 'yes',
      'https://huggingface.co/docs/api-inference/index',
      'medium',
      'public-apis', 'https://huggingface.co', null
    ),
    (
      'Google Gemini',
      'Google Gemini model API documentation and developer platform.',
      'Google Gemini 開發者入口，適合文字、多模態同 agent 工作流原型；使用前要核對地區、配額同資料條款。',
      'Machine Learning',
      array['多模態原型', 'Agent 工作流']::text[],
      'apiKey', true, 'unknown',
      'https://ai.google.dev/gemini-api/docs',
      'medium',
      'public-apis', 'https://ai.google.dev/gemini-api/docs', null
    ),
    (
      'Mailchimp',
      'Marketing audience, campaign and automation APIs.',
      'Mailchimp 開發者平台，可連接受眾、活動同電郵自動化；處理會員資料前要先確認同意及私隱要求。',
      'Email',
      array['電郵自動化', '受眾同步']::text[],
      'apiKey', true, 'unknown',
      'https://mailchimp.com/developer/',
      'medium',
      'public-apis', 'https://mailchimp.com/developer', null
    ),
    (
      'REST Countries',
      'Country names, currencies, languages and geographic metadata.',
      '免 key 國家資料服務，適合表單、地區選擇器同國際化產品原型。',
      'Open Data',
      array['國際化表單', '地區資料原型']::text[],
      'No', true, 'yes',
      'https://restcountries.com/',
      'medium',
      'public-apis', 'https://restcountries.com', null
    ),
    (
      'Postman Echo',
      'Request and response test endpoints for API development.',
      '用嚟測試 HTTP request、header 同認證流程嘅開發工具，適合教學同整合除錯。',
      'Development',
      array['API 教學', '整合除錯']::text[],
      'No', true, 'unknown',
      'https://www.postman-echo.com/',
      'medium',
      'public-apis', 'https://www.postman-echo.com', null
    ),
    (
      'Unsplash',
      'Photo search and media metadata for applications.',
      '相片搜尋同媒體資料 API，適合內容工具同設計原型；正式使用要跟足顯示及署名條款。',
      'Photography',
      array['內容素材搜尋', '設計原型']::text[],
      'OAuth', true, 'unknown',
      'https://unsplash.com/developers',
      'medium',
      'public-apis', 'https://unsplash.com/developers', null
    ),
    (
      'GNews',
      'Search and retrieve news articles from multiple sources.',
      '新聞搜尋服務，適合媒體監測同研究原型；發布內容前要另外核對授權、額度同來源署名。',
      'News',
      array['媒體監測', '研究原型']::text[],
      'apiKey', true, 'yes',
      'https://gnews.io/',
      'medium',
      'public-apis', 'https://gnews.io', null
    )
)
insert into public.api_directory_entries (
  name,
  description_en,
  editorial_summary_zh_hk,
  category,
  use_cases,
  auth_type,
  https_supported,
  cors_status,
  docs_url,
  hk_relevance,
  source_kind,
  source_key,
  source_url,
  upstream_ref,
  last_seen_at,
  review_state,
  last_reviewed_at,
  status
)
select
  seed.name,
  seed.description_en,
  seed.editorial_summary_zh_hk,
  seed.category,
  seed.use_cases,
  seed.auth_type,
  seed.https_supported,
  seed.cors_status,
  seed.docs_url,
  seed.hk_relevance,
  seed.source_kind,
  case
    when seed.source_kind = 'public-apis' then
      'public-apis:' || encode(
        extensions.digest(
          convert_to(lower(seed.source_identity_url), 'UTF8'),
          'sha256'
        ),
        'hex'
      )
    else seed.source_key_override
  end,
  case
    when seed.source_kind = 'public-apis'
      then 'https://github.com/public-apis/public-apis'
    else null
  end,
  case
    when seed.source_kind = 'public-apis'
      then 'c045a2eb505f0f8b7992bb4af53cc020f25003fd'
    else null
  end,
  now(),
  'aigro_reviewed',
  date '2026-08-20',
  'published'
from curated_seed seed
on conflict (source_key) do nothing;

create or replace function public.normalize_api_directory_visibility()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.name := btrim(new.name);
  new.category := btrim(new.category);
  new.auth_type := btrim(new.auth_type);
  new.description_en := btrim(new.description_en);
  new.editorial_summary_zh_hk := btrim(new.editorial_summary_zh_hk);

  if new.status = 'hidden' then
    if tg_op = 'INSERT' or old.status is distinct from 'hidden' then
      new.hidden_at := coalesce(new.hidden_at, now());
      new.hidden_by := coalesce(new.hidden_by, auth.uid());
    end if;
  else
    new.hidden_at := null;
    new.hidden_by := null;
  end if;

  return new;
end;
$$;

revoke all on function public.normalize_api_directory_visibility()
from public, anon, authenticated;

drop trigger if exists api_directory_normalize_visibility
on public.api_directory_entries;
create trigger api_directory_normalize_visibility
before insert or update on public.api_directory_entries
for each row execute function public.normalize_api_directory_visibility();

drop trigger if exists api_directory_touch
on public.api_directory_entries;
create trigger api_directory_touch
before update on public.api_directory_entries
for each row execute function public.touch_updated_at();

create or replace function public.audit_api_directory_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  event_action text;
begin
  if tg_op = 'INSERT' then
    event_action := 'api_directory.added';
  elsif new.status = 'hidden' and old.status is distinct from 'hidden' then
    event_action := 'api_directory.hidden';
  elsif old.status = 'hidden' and new.status = 'published' then
    event_action := 'api_directory.restored';
  else
    event_action := 'api_directory.updated';
  end if;

  insert into public.audit_events (
    actor_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) values (
    auth.uid(),
    event_action,
    'api_directory_entry',
    new.id,
    jsonb_build_object(
      'name', new.name,
      'status', new.status,
      'source_kind', new.source_kind
    )
  );

  return new;
end;
$$;

revoke all on function public.audit_api_directory_change()
from public, anon, authenticated;

drop trigger if exists api_directory_audit_change
on public.api_directory_entries;
create trigger api_directory_audit_change
after insert or update on public.api_directory_entries
for each row execute function public.audit_api_directory_change();

alter table public.api_directory_entries enable row level security;

drop policy if exists api_directory_admin_select
on public.api_directory_entries;
create policy api_directory_admin_select
on public.api_directory_entries
for select to authenticated
using ((select public.is_admin()));

drop policy if exists api_directory_admin_insert
on public.api_directory_entries;
create policy api_directory_admin_insert
on public.api_directory_entries
for insert to authenticated
with check ((select public.is_admin()));

drop policy if exists api_directory_admin_update
on public.api_directory_entries;
create policy api_directory_admin_update
on public.api_directory_entries
for update to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

revoke all on table public.api_directory_entries
from public, anon, authenticated, service_role;
grant select, insert, update on table public.api_directory_entries
to authenticated;
grant select, insert, update on table public.api_directory_entries
to service_role;

create or replace function public.list_public_api_entries(
  p_query text default null,
  p_category text default null,
  p_auth_type text default null,
  p_cors_status text default null,
  p_https boolean default null,
  p_limit integer default 24,
  p_offset integer default 0
)
returns table (
  id uuid,
  name text,
  description_en text,
  editorial_summary_zh_hk text,
  category text,
  use_cases text[],
  auth_type text,
  https_supported boolean,
  cors_status text,
  docs_url text,
  hk_relevance text,
  source_kind text,
  source_url text,
  upstream_ref text,
  review_state text,
  last_reviewed_at date,
  updated_at timestamptz,
  total_count bigint
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  with filtered as (
    select
      entry.id,
      entry.name,
      entry.description_en,
      entry.editorial_summary_zh_hk,
      entry.category,
      entry.use_cases,
      entry.auth_type,
      entry.https_supported,
      entry.cors_status,
      entry.docs_url,
      entry.hk_relevance,
      entry.source_kind,
      entry.source_url,
      entry.upstream_ref,
      entry.review_state,
      entry.last_reviewed_at,
      entry.updated_at
    from public.api_directory_entries entry
    where entry.status = 'published'
      and entry.hidden_at is null
      and (
        p_query is null
        or btrim(p_query) = ''
        or entry.name ilike '%' || btrim(p_query) || '%'
        or entry.description_en ilike '%' || btrim(p_query) || '%'
        or entry.editorial_summary_zh_hk ilike '%' || btrim(p_query) || '%'
        or array_to_string(entry.use_cases, ' ') ilike '%' || btrim(p_query) || '%'
      )
      and (p_category is null or entry.category = p_category)
      and (p_auth_type is null or lower(entry.auth_type) = lower(p_auth_type))
      and (p_cors_status is null or entry.cors_status = p_cors_status)
      and (p_https is null or entry.https_supported = p_https)
  )
  select
    filtered.id,
    filtered.name,
    filtered.description_en,
    filtered.editorial_summary_zh_hk,
    filtered.category,
    filtered.use_cases,
    filtered.auth_type,
    filtered.https_supported,
    filtered.cors_status,
    filtered.docs_url,
    filtered.hk_relevance,
    filtered.source_kind,
    filtered.source_url,
    filtered.upstream_ref,
    filtered.review_state,
    filtered.last_reviewed_at,
    filtered.updated_at,
    count(*) over() as total_count
  from filtered
  order by
    case filtered.hk_relevance when 'high' then 0 when 'medium' then 1 else 2 end,
    filtered.name
  limit greatest(1, least(coalesce(p_limit, 24), 100))
  offset greatest(coalesce(p_offset, 0), 0);
$$;

create or replace function public.list_public_api_categories()
returns table (
  category text,
  entry_count bigint
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select entry.category, count(*)::bigint
  from public.api_directory_entries entry
  where entry.status = 'published'
    and entry.hidden_at is null
  group by entry.category
  order by entry.category;
$$;

revoke all on function public.list_public_api_entries(
  text, text, text, text, boolean, integer, integer
) from public, anon, authenticated;
grant execute on function public.list_public_api_entries(
  text, text, text, text, boolean, integer, integer
) to anon, authenticated;

revoke all on function public.list_public_api_categories()
from public, anon, authenticated;
grant execute on function public.list_public_api_categories()
to anon, authenticated;
