-- Table RLS and Storage RLS are separate authorization layers. Post images are
-- private objects served through short-lived signed URLs after this policy
-- verifies that the caller can see the post's group.
update storage.buckets
set public = false
where id = 'group-post-images';

drop policy if exists "public read group media" on storage.objects;
create policy "public read group media"
on storage.objects
for select
using (bucket_id in ('group-avatars', 'group-covers'));

drop policy if exists "authorized read group post images" on storage.objects;
create policy "authorized read group post images"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'group-post-images'
  and array_length(string_to_array(storage.objects.name, '/'), 1) = 3
  and exists (
    select 1
    from public.group_posts p
    join public.groups g on g.id = p.group_id
    where public.group_post_image_path(p.image_url) = storage.objects.name
    and (string_to_array(storage.objects.name, '/'))[1] = p.author_id::text
    and (string_to_array(storage.objects.name, '/'))[2] = p.group_id::text
    and (
      g.privacy = 'public'
      or public.is_active_group_member(g.id)
    )
  )
);
