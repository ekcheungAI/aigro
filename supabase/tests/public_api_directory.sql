begin;
create extension if not exists pgtap with schema extensions;
select plan(31);

set local role postgres;

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  (
    '86100000-0000-4000-8000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'api-member@test.local', '', now(),
    '{}'::jsonb, '{}'::jsonb, now(), now()
  ),
  (
    '86200000-0000-4000-8000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'api-admin@test.local', '', now(),
    '{}'::jsonb, '{}'::jsonb, now(), now()
  )
on conflict (id) do nothing;

insert into public.profiles (id, email, name) values
  ('86100000-0000-4000-8000-000000000001', 'api-member@test.local', 'API Member'),
  ('86200000-0000-4000-8000-000000000002', 'api-admin@test.local', 'API Admin')
on conflict (id) do nothing;

update public.account_access
set app_role = 'admin'
where user_id = '86200000-0000-4000-8000-000000000002';

insert into public.api_directory_entries (
  id, name, description_en, editorial_summary_zh_hk, category, auth_type,
  https_supported, cors_status, docs_url, source_kind, source_key,
  review_state, last_reviewed_at, status
) values
  (
    '86300000-0000-4000-8000-000000000003', 'Draft Secret', 'draft', '',
    'Test', 'No', true, 'yes', 'https://draft.example.test/docs',
    'manual', 'manual:test-draft', 'upstream_listed', null, 'draft'
  ),
  (
    '86400000-0000-4000-8000-000000000004', 'Hidden Secret', 'hidden', '已下架測試內容。',
    'Test', 'No', true, 'yes', 'https://hidden.example.test/docs',
    'manual', 'manual:test-hidden', 'aigro_reviewed', date '2026-08-20', 'hidden'
  );

set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

select ok(
  not has_table_privilege('anon', 'public.api_directory_entries', 'select'),
  'anonymous callers cannot select the catalogue table directly'
);
select ok(
  not has_table_privilege('authenticated', 'public.api_directory_entries', 'delete'),
  'browser roles never receive destructive delete privilege'
);
select ok(
  not has_table_privilege('service_role', 'public.api_directory_entries', 'delete'),
  'the server-side importer cannot hard-delete catalogue entries'
);
select ok(
  has_function_privilege(
    'anon',
    'public.list_public_api_entries(text,text,text,text,boolean,integer,integer)',
    'execute'
  ),
  'anonymous callers can execute the narrow public list RPC'
);
select ok(
  has_function_privilege('anon', 'public.list_public_api_categories()', 'execute'),
  'anonymous callers can execute the public category RPC'
);
select ok(
  (select count(*) from public.list_public_api_entries(p_limit => 100)) >= 66,
  'the reviewed cross-category directory is publicly visible'
);
set local role postgres;
select is(
  (
    select source_key
    from public.api_directory_entries
    where name = 'Hong Kong GeoData Store'
  ),
  'public-apis:' || encode(
    extensions.digest(
      convert_to(lower('https://geodata.gov.hk/gs'), 'UTF8'),
      'sha256'
    ),
    'hex'
  ),
  'curated display fields retain the importer canonical upstream identity'
);
select is(
  (
    with expected_seed_identity(name, source_identity_url) as (
      values
        ('Hong Kong Observatory', 'https://www.hko.gov.hk/en/abouthko/opendata_intro.htm'),
        ('Hong Kong GeoData Store', 'https://geodata.gov.hk/gs'),
        ('Frankfurter', 'https://www.frankfurter.app/docs'),
        ('GitHub', 'https://docs.github.com/en/free-pro-team@latest/rest'),
        ('Hugging Face', 'https://huggingface.co'),
        ('Google Gemini', 'https://ai.google.dev/gemini-api/docs'),
        ('Mailchimp', 'https://mailchimp.com/developer'),
        ('REST Countries', 'https://restcountries.com'),
        ('Postman Echo', 'https://www.postman-echo.com'),
        ('Unsplash', 'https://unsplash.com/developers'),
        ('GNews', 'https://gnews.io'),
        ('Jikan', 'https://jikan.moe'),
        ('AniList', 'https://github.com/AniList/ApiV2-GraphQL-Docs'),
        ('Open Library', 'https://openlibrary.org/developers/api'),
        ('Google Books', 'https://developers.google.com/books'),
        ('Nager.Date', 'https://date.nager.at'),
        ('ExchangeRate-API', 'https://www.exchangerate-api.com'),
        ('Mapbox', 'https://docs.mapbox.com'),
        ('NASA', 'https://api.nasa.gov'),
        ('World Bank', 'https://datahelpdesk.worldbank.org/knowledgebase/topics/125589'),
        ('Spotify', 'https://beta.developer.spotify.com/documentation/web-api'),
        ('Discord', 'https://discord.com/developers/docs/intro'),
        ('Reddit', 'https://www.reddit.com/dev/api'),
        ('Slack', 'https://api.slack.com'),
        ('Telegram Bot', 'https://core.telegram.org/bots/api'),
        ('YouTube', 'https://developers.google.com/youtube'),
        ('Open-Meteo', 'https://open-meteo.com'),
        ('WeatherAPI', 'https://www.weatherapi.com'),
        ('Hacker News', 'https://github.com/HackerNews/API')
    )
    select count(*)
    from expected_seed_identity expected
    join public.api_directory_entries entry
      on entry.name = expected.name
     and entry.source_key = 'public-apis:' || encode(
       extensions.digest(
         convert_to(lower(expected.source_identity_url), 'UTF8'),
         'sha256'
       ),
       'hex'
     )
  ),
  29::bigint,
  'every public-apis launch seed is idempotent with the pinned importer identity'
);
select is(
  (
    select source_kind
    from public.api_directory_entries
    where name = 'Hong Kong Observatory'
  ),
  'public-apis',
  'the corrected HKO display name retains its misspelled upstream row identity'
);
select ok(
  (
    select source_url is null and upstream_ref is null
    from public.api_directory_entries
    where name = 'CoinGecko'
  ),
  'manually reviewed seeds do not claim pinned-import provenance'
);
select is(
  (
    select count(*)
    from public.api_directory_entries
    where name = any(array[
      'VirusTotal', 'Metropolitan Museum of Art', 'Auth0', 'Etherscan',
      'Trello', 'Dropbox', 'CircleCI', 'Cloudflare', 'Docker Hub',
      'JSONPlaceholder', 'Chinese Text Project', 'Notion', 'OpenAQ',
      'Alpha Vantage', 'FRED', 'Open Food Facts', 'openFDA', 'Adzuna',
      'Shields.io', 'Have I Been Pwned', 'eBay', 'OpenF1', 'RandomUser',
      'Google Cloud Natural Language', 'Open Charge Map',
      'Amadeus for Developers', 'Airtable', 'Asana', 'Google Drive',
      'Transport for London'
    ])
      and status = 'published'
      and review_state = 'aigro_reviewed'
      and last_reviewed_at = date '2026-08-22'
      and btrim(editorial_summary_zh_hk) <> ''
  ),
  30::bigint,
  'the quality expansion publishes all reviewed upstream selections'
);
select is(
  (
    select count(*)
    from public.api_directory_entries
    where source_key = any(array[
      'manual:curated:openai', 'manual:curated:anthropic',
      'manual:curated:stripe', 'manual:curated:twilio',
      'manual:curated:supabase', 'manual:curated:vercel'
    ])
      and status = 'published'
      and source_kind = 'manual'
      and source_url is null
      and upstream_ref is null
  ),
  6::bigint,
  'essential manual additions are published without false upstream provenance'
);
select ok(
  (select count(*) from public.list_public_api_categories()) >= 40,
  'the public directory covers at least forty useful categories'
);
set local role anon;
select is(
  (select count(*) from public.list_public_api_entries(p_query => 'Draft Secret')),
  0::bigint,
  'draft rows never leak through the public RPC'
);
select is(
  (select count(*) from public.list_public_api_entries(p_query => 'Hidden Secret')),
  0::bigint,
  'hidden rows never leak through the public RPC'
);
select ok(
  not (
    (select to_jsonb(entry) from public.list_public_api_entries(p_limit => 1) entry)
    ?| array['source_key', 'created_by', 'hidden_by', 'hidden_at', 'status']
  ),
  'public RPC rows omit private maintenance columns'
);
select is(
  (
    select count(*)
    from public.list_public_api_entries(
      p_query => 'Observatory',
      p_category => 'Weather',
      p_auth_type => 'No',
      p_cors_status => 'unknown',
      p_https => true
    )
  ),
  1::bigint,
  'public RPC applies search and structured filters together'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"86100000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);

select is(
  (select count(*) from public.api_directory_entries),
  0::bigint,
  'ordinary members cannot read admin catalogue rows directly'
);
select throws_like(
  $$insert into public.api_directory_entries (
      name, category, auth_type, docs_url, source_kind, source_key, status
    ) values (
      'Member Insert', 'Test', 'No', 'https://member.example.test/docs',
      'manual', 'manual:member-insert', 'draft'
    )$$,
  '%row-level security policy%',
  'ordinary members cannot add catalogue entries'
);

update public.api_directory_entries
set name = 'Member Changed Seed'
where id = (
  select id from public.list_public_api_entries(p_query => 'Hong Kong Observatory', p_limit => 1)
);

set local role postgres;
select is(
  (select name from public.api_directory_entries where docs_url = 'https://www.hko.gov.hk/en/abouthko/opendata_intro.htm'),
  'Hong Kong Observatory',
  'ordinary member updates affect no protected rows'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"86200000-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);

select lives_ok(
  $$insert into public.api_directory_entries (
      id, name, description_en, editorial_summary_zh_hk, category, use_cases,
      auth_type, https_supported, cors_status, docs_url, hk_relevance,
      source_kind, source_key, review_state, last_reviewed_at, status
    ) values (
      '86500000-0000-4000-8000-000000000005', 'Admin API', 'Admin test',
      '管理員新增嘅測試 API。', 'Development', array['管理測試'], 'No', true,
      'yes', 'https://admin-api.example.test/docs', 'medium', 'manual',
      'manual:admin-test', 'aigro_reviewed', date '2026-08-20', 'published'
    )$$,
  'admins can add a reviewed published entry'
);
select is(
  (select count(*) from public.api_directory_entries where id = '86500000-0000-4000-8000-000000000005'),
  1::bigint,
  'admin can read the row after insertion'
);
select lives_ok(
  $$update public.api_directory_entries
    set status = 'hidden'
    where id = '86500000-0000-4000-8000-000000000005'$$,
  'admin can soft-unpublish an entry'
);
select ok(
  (select hidden_at is not null and hidden_by = '86200000-0000-4000-8000-000000000002'
   from public.api_directory_entries where id = '86500000-0000-4000-8000-000000000005'),
  'soft-unpublish records when and who hid the entry'
);
select is(
  (select count(*) from public.list_public_api_entries(p_query => 'Admin API')),
  0::bigint,
  'soft-unpublished entry disappears from the public RPC immediately'
);
select ok(
  exists (
    select 1 from public.audit_events
    where actor_id = '86200000-0000-4000-8000-000000000002'
      and entity_id = '86500000-0000-4000-8000-000000000005'
      and action = 'api_directory.hidden'
  ),
  'soft-unpublish creates an audit event'
);
select lives_ok(
  $$update public.api_directory_entries
    set status = 'published'
    where id = '86500000-0000-4000-8000-000000000005'$$,
  'admin can restore a hidden entry'
);
select ok(
  (select hidden_at is null and hidden_by is null
   from public.api_directory_entries where id = '86500000-0000-4000-8000-000000000005'),
  'restore clears hidden maintenance fields'
);
select is(
  (select count(*) from public.list_public_api_entries(p_query => 'Admin API')),
  1::bigint,
  'restored entry returns to the public RPC'
);
select throws_like(
  $$delete from public.api_directory_entries
    where id = '86500000-0000-4000-8000-000000000005'$$,
  '%permission denied%',
  'even admins cannot hard-delete catalogue entries through browser grants'
);

set local role postgres;
select throws_like(
  $$insert into public.api_directory_entries (
      name, editorial_summary_zh_hk, category, auth_type, docs_url,
      source_kind, source_key, review_state, status
    ) values (
      'Unreviewed Published', '', 'Test', 'No',
      'https://unreviewed.example.test/docs', 'manual', 'manual:unreviewed',
      'upstream_listed', 'published'
    )$$,
  '%api_directory_publication_requires_editorial_review%',
  'database refuses to publish an entry without zh-HK editorial review'
);

select * from finish();
rollback;
