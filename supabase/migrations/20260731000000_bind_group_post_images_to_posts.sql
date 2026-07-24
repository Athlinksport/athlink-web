-- Normalize legacy public/signed URLs to their object path, reject mismatched
-- post references at write time, and bind Storage reads to the post's actual
-- author and group path segments.
create or replace function public.group_post_image_path(image_value text)
returns text language sql immutable set search_path = pg_catalog as $$
  select case
    when image_value is null then null
    when position('/storage/v1/object/public/group-post-images/' in image_value) > 0 then
      split_part(split_part(image_value, '/storage/v1/object/public/group-post-images/', 2), '?', 1)
    when position('/storage/v1/object/sign/group-post-images/' in image_value) > 0 then
      split_part(split_part(image_value, '/storage/v1/object/sign/group-post-images/', 2), '?', 1)
    else split_part(image_value, '?', 1)
  end
$$;
revoke all on function public.group_post_image_path(text) from public, anon;
grant execute on function public.group_post_image_path(text) to authenticated;

create or replace function public.validate_group_post_image_path()
returns trigger language plpgsql set search_path = public, pg_catalog as $$
declare object_path text; path_segments text[];
begin
  if new.image_url is null then return new; end if;
  object_path := public.group_post_image_path(new.image_url);
  path_segments := string_to_array(object_path, '/');
  if array_length(path_segments, 1) is distinct from 3
    or path_segments[1] is distinct from new.author_id::text
    or path_segments[2] is distinct from new.group_id::text
    or nullif(path_segments[3], '') is null then
    raise exception 'Invalid group post image path' using errcode = '23514';
  end if;
  return new;
end $$;
drop trigger if exists validate_group_post_image on public.group_posts;
create trigger validate_group_post_image before insert or update of image_url, author_id, group_id
on public.group_posts for each row execute function public.validate_group_post_image_path();

drop policy if exists "authorized read group post images" on storage.objects;
create policy "authorized read group post images" on storage.objects for select to authenticated using (
  bucket_id = 'group-post-images'
  and array_length(string_to_array(storage.objects.name, '/'), 1) = 3
  and exists (
    select 1
    from public.group_posts p
    join public.groups g on g.id = p.group_id
    where public.group_post_image_path(p.image_url) = storage.objects.name
      and (string_to_array(storage.objects.name, '/'))[1] = p.author_id::text
      and (string_to_array(storage.objects.name, '/'))[2] = p.group_id::text
      and (g.privacy = 'public' or public.is_active_group_member(g.id))
  )
);
