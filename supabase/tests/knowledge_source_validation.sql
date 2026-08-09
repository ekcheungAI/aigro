begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

select ok(
  public.is_safe_knowledge_source_url('https://example.com/article', false),
  'ordinary public HTTPS knowledge URLs are accepted'
);
select isnt(
  public.is_safe_knowledge_source_url('http://example.com/article', false),
  true,
  'non-HTTPS knowledge URLs are rejected'
);
select isnt(
  public.is_safe_knowledge_source_url('https://user:pass@example.com/private', false),
  true,
  'credential-bearing URLs are rejected'
);
select isnt(
  public.is_safe_knowledge_source_url('https://192.168.1.20/private', false),
  true,
  'private network targets are rejected'
);
select ok(
  public.is_safe_knowledge_source_url('https://www.youtube.com/watch?v=abc', true),
  'supported YouTube URLs are accepted for transcript ingestion'
);
select isnt(
  public.is_safe_knowledge_source_url('https://example.com/not-youtube', true),
  true,
  'YouTube source type is restricted to the YouTube allow-list'
);
select isnt(
  has_function_privilege(
    'authenticated',
    'public.is_safe_knowledge_source_url(text,boolean)',
    'execute'
  ),
  true,
  'URL validation helper is not exposed as a browser RPC'
);

select * from finish();
rollback;
