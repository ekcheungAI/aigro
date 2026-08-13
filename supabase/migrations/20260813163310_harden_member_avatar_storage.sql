drop policy if exists "member_avatars_insert_own" on storage.objects;
drop policy if exists "member_avatars_select_own" on storage.objects;
drop policy if exists "member_avatars_update_own" on storage.objects;
drop policy if exists "member_avatars_delete_own" on storage.objects;

create policy "member_avatars_insert_own" on storage.objects
for insert to authenticated with check (
  bucket_id = 'member-avatars'
  and name = (select auth.uid())::text || '/display-picture'
  and coalesce((select auth.jwt() ->> 'is_anonymous')::boolean, false) = false
  and exists (select 1 from public.profiles where id = (select auth.uid()))
);

create policy "member_avatars_select_own" on storage.objects
for select to authenticated using (
  bucket_id = 'member-avatars'
  and name = (select auth.uid())::text || '/display-picture'
  and coalesce((select auth.jwt() ->> 'is_anonymous')::boolean, false) = false
);

create policy "member_avatars_update_own" on storage.objects
for update to authenticated using (
  bucket_id = 'member-avatars'
  and name = (select auth.uid())::text || '/display-picture'
  and coalesce((select auth.jwt() ->> 'is_anonymous')::boolean, false) = false
) with check (
  bucket_id = 'member-avatars'
  and name = (select auth.uid())::text || '/display-picture'
  and coalesce((select auth.jwt() ->> 'is_anonymous')::boolean, false) = false
);

create policy "member_avatars_delete_own" on storage.objects
for delete to authenticated using (
  bucket_id = 'member-avatars'
  and name = (select auth.uid())::text || '/display-picture'
  and coalesce((select auth.jwt() ->> 'is_anonymous')::boolean, false) = false
);
