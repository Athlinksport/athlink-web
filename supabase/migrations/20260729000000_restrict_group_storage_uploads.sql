-- Storage object ownership and group authorization are separate checks.
-- Compare UUID columns as text so malformed path segments are denied safely
-- instead of raising an exception during a UUID cast.
drop policy if exists "users stage own group media" on storage.objects;
drop policy if exists "users stage authorized group media" on storage.objects;
create policy "users stage authorized group media"
on storage.objects
for insert
to authenticated
with check (
  array_length(storage.foldername(storage.objects.name), 1) = 2
  and (storage.foldername(storage.objects.name))[1] = auth.uid()::text
  and (
    (
      bucket_id in ('group-avatars', 'group-covers')
      and exists (
        select 1
        from public.groups g
        where g.id::text = (storage.foldername(storage.objects.name))[2]
          and g.owner_id = auth.uid()
      )
    )
    or (
      bucket_id = 'group-post-images'
      and exists (
        select 1
        from public.group_members gm
        where gm.group_id::text = (storage.foldername(storage.objects.name))[2]
          and gm.user_id = auth.uid()
          and gm.status = 'active'
      )
    )
  )
);

drop policy if exists "users update own group media" on storage.objects;
create policy "users update own group media"
on storage.objects
for update
to authenticated
using (
  bucket_id in ('group-avatars', 'group-covers', 'group-post-images')
  and owner_id = auth.uid()::text
)
with check (
  owner_id = auth.uid()::text
  and array_length(storage.foldername(storage.objects.name), 1) = 2
  and (storage.foldername(storage.objects.name))[1] = auth.uid()::text
  and (
    (
      bucket_id in ('group-avatars', 'group-covers')
      and exists (
        select 1
        from public.groups g
        where g.id::text = (storage.foldername(storage.objects.name))[2]
          and g.owner_id = auth.uid()
      )
    )
    or (
      bucket_id = 'group-post-images'
      and exists (
        select 1
        from public.group_members gm
        where gm.group_id::text = (storage.foldername(storage.objects.name))[2]
          and gm.user_id = auth.uid()
          and gm.status = 'active'
      )
    )
  )
);
