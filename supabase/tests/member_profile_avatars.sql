begin;
select plan(8);

select has_column('public', 'profiles', 'avatar_seed', 'profiles has avatar_seed');
select has_column('public', 'profiles', 'avatar_path', 'profiles has avatar_path');
select has_column('public', 'profiles', 'avatar_updated_at', 'profiles has avatar_updated_at');

select results_eq(
  $$select public, file_size_limit from storage.buckets where id = 'member-avatars'$$,
  $$values (true, 2097152::bigint)$$,
  'member avatars bucket is public and limited to 2 MB'
);

select results_eq(
  $$select allowed_mime_types from storage.buckets where id = 'member-avatars'$$,
  $$values (array['image/jpeg', 'image/png', 'image/webp']::text[])$$,
  'member avatars bucket restricts image formats'
);

select policies_are(
  'storage',
  'objects',
  array[
    'expert_kb_delete_own',
    'expert_kb_read_own',
    'expert_kb_upload_own',
    'member_avatars_delete_own',
    'member_avatars_insert_own',
    'member_avatars_select_own',
    'member_avatars_update_own'
  ],
  'storage object policies include owner-scoped avatar access'
);

select is(
  (select cmd from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'member_avatars_insert_own'),
  'INSERT',
  'avatar insert policy exists'
);

select is(
  (select cmd from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'member_avatars_update_own'),
  'UPDATE',
  'avatar update policy exists for upserts'
);

select * from finish();
rollback;
