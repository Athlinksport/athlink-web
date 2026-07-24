-- Athlink groups vertical slice: schema, counters, secure workflows, RLS, and storage.
create extension if not exists pgcrypto;
create extension if not exists unaccent;

create schema if not exists groups_private;
revoke all on schema groups_private from public, anon, authenticated;

create type public.group_privacy as enum ('public', 'private');
create type public.group_role as enum ('owner', 'admin', 'moderator', 'member');
create type public.group_membership_status as enum ('active', 'pending', 'rejected', 'banned');

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 3 and 80),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' and char_length(slug) <= 100),
  description text not null check (char_length(btrim(description)) between 20 and 2000),
  sport text not null check (char_length(btrim(sport)) between 2 and 100),
  city text check (city is null or char_length(btrim(city)) between 1 and 100),
  country text not null check (char_length(btrim(country)) between 2 and 100),
  privacy public.group_privacy not null default 'public',
  cover_image_url text,
  avatar_url text,
  owner_id uuid not null references auth.users(id),
  member_count integer not null default 1 check (member_count >= 0),
  post_count integer not null default 0 check (post_count >= 0),
  last_activity_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.group_role not null default 'member',
  status public.group_membership_status not null default 'active',
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (group_id, user_id)
);

create table public.group_posts (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  content text not null check (char_length(btrim(content)) between 1 and 5000),
  image_url text,
  comment_count integer not null default 0 check (comment_count >= 0),
  like_count integer not null default 0 check (like_count >= 0),
  is_pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.group_post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.group_posts(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  parent_comment_id uuid references public.group_post_comments(id) on delete cascade,
  content text not null check (char_length(btrim(content)) between 1 and 2000),
  like_count integer not null default 0 check (like_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (parent_comment_id is null or parent_comment_id <> id)
);

create table public.group_post_likes (
  post_id uuid not null references public.group_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table public.group_comment_likes (
  comment_id uuid not null references public.group_post_comments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

create index groups_discovery_idx on public.groups (privacy, last_activity_at desc);
create index groups_sport_idx on public.groups (sport);
create index groups_location_idx on public.groups (country, city);
create index group_members_user_idx on public.group_members (user_id, status);
create index group_members_group_status_idx on public.group_members (group_id, status, joined_at);
create index group_posts_group_created_idx on public.group_posts (group_id, created_at desc);
create index group_comments_post_created_idx on public.group_post_comments (post_id, created_at desc);
create index group_comments_parent_idx on public.group_post_comments (parent_comment_id);

create function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger groups_updated before update on public.groups for each row execute function public.set_updated_at();
create trigger group_members_updated before update on public.group_members for each row execute function public.set_updated_at();
create trigger group_posts_updated before update on public.group_posts for each row execute function public.set_updated_at();
create trigger group_comments_updated before update on public.group_post_comments for each row execute function public.set_updated_at();

create function public.group_post_image_path(image_value text)
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
create function public.validate_group_post_image_path()
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
create trigger validate_group_post_image before insert or update of image_url, author_id, group_id
on public.group_posts for each row execute function public.validate_group_post_image_path();

create function groups_private.is_active_group_member(target_group uuid, target_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from group_members where group_id = target_group and user_id = target_user and status = 'active')
$$;
create function groups_private.group_member_role(target_group uuid, target_user uuid)
returns public.group_role language sql stable security definer set search_path = public as $$
  select role from group_members where group_id = target_group and user_id = target_user and status = 'active'
$$;
revoke all on function groups_private.is_active_group_member(uuid,uuid), groups_private.group_member_role(uuid,uuid) from public, anon, authenticated;

create function public.is_active_group_member(target_group uuid)
returns boolean language sql stable security definer set search_path = public, groups_private as $$
  select groups_private.is_active_group_member(target_group, (select auth.uid()))
$$;
create function public.group_member_role(target_group uuid)
returns public.group_role language sql stable security definer set search_path = public, groups_private as $$
  select groups_private.group_member_role(target_group, (select auth.uid()))
$$;
create function public.can_moderate_group(target_group uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(group_member_role(target_group) in ('owner','admin','moderator'), false)
$$;
create function public.can_manage_group(target_group uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(group_member_role(target_group) in ('owner','admin'), false)
$$;

create function public.make_group_slug(group_name text)
returns text language plpgsql volatile set search_path = public as $$
declare base text; candidate text; suffix integer := 1;
begin
  base := trim(both '-' from regexp_replace(lower(unaccent(group_name)), '[^a-z0-9]+', '-', 'g'));
  if base = '' then base := 'group'; end if;
  base := left(base, 88);
  candidate := base;
  while exists(select 1 from groups where slug = candidate) loop
    suffix := suffix + 1; candidate := base || '-' || suffix::text;
  end loop;
  return candidate;
end $$;

create function public.create_group(
  group_name text, group_description text, group_sport text, group_country text,
  group_city text default null, group_privacy public.group_privacy default 'public',
  group_avatar_url text default null, group_cover_image_url text default null
) returns public.groups language plpgsql security definer set search_path = public as $$
declare created public.groups;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  insert into groups(name, slug, description, sport, country, city, privacy, avatar_url, cover_image_url, owner_id)
  values (btrim(group_name), make_group_slug(group_name), btrim(group_description), btrim(group_sport),
    btrim(group_country), nullif(btrim(group_city), ''), group_privacy, group_avatar_url, group_cover_image_url, auth.uid())
  returning * into created;
  insert into group_members(group_id, user_id, role, status) values(created.id, auth.uid(), 'owner', 'active');
  return created;
end $$;

create function public.discover_groups(
  group_mode text default 'discover',
  search_query text default null,
  sport_filter text default null,
  city_filter text default null,
  country_filter text default null,
  privacy_filter public.group_privacy default null,
  sort_order text default 'active',
  page_limit integer default 18,
  page_offset integer default 0
) returns setof public.groups
language plpgsql stable security definer set search_path = public as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if group_mode not in ('discover', 'mine', 'pending') then
    raise exception 'Invalid group mode';
  end if;
  if sort_order not in ('active', 'members', 'newest') then
    raise exception 'Invalid sort order';
  end if;

  return query
  select g.*
  from groups g
  where
    (nullif(btrim(search_query), '') is null
      or g.name ilike '%' || btrim(search_query) || '%'
      or g.description ilike '%' || btrim(search_query) || '%')
    and (nullif(btrim(sport_filter), '') is null or g.sport = btrim(sport_filter))
    and (nullif(btrim(city_filter), '') is null or g.city ilike '%' || btrim(city_filter) || '%')
    and (nullif(btrim(country_filter), '') is null or g.country ilike '%' || btrim(country_filter) || '%')
    and (privacy_filter is null or g.privacy = privacy_filter)
    and (
      group_mode = 'discover'
      or exists (
        select 1
        from group_members gm
        where gm.group_id = g.id
          and gm.user_id = (select auth.uid())
          and gm.status = case
            when group_mode = 'mine' then 'active'::group_membership_status
            else 'pending'::group_membership_status
          end
      )
    )
  order by
    case when sort_order = 'active' then g.last_activity_at end desc nulls last,
    case when sort_order = 'members' then g.member_count end desc nulls last,
    case when sort_order = 'newest' then g.created_at end desc nulls last,
    g.id
  limit least(greatest(page_limit, 1), 50)
  offset greatest(page_offset, 0);
end $$;

create function public.join_group(target_group uuid) returns public.group_members
language plpgsql security definer set search_path = public as $$
declare target_privacy group_privacy; existing group_members; result group_members;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  select privacy into target_privacy from groups where id = target_group;
  if not found then raise exception 'Group not found'; end if;
  select * into existing from group_members where group_id = target_group and user_id = auth.uid();
  if existing.status = 'banned' then raise exception 'You cannot join this group' using errcode = '42501'; end if;
  insert into group_members(group_id, user_id, role, status)
  values(
    target_group,
    auth.uid(),
    'member'::public.group_role,
    case
      when target_privacy = 'public' then 'active'::public.group_membership_status
      else 'pending'::public.group_membership_status
    end
  )
  on conflict (group_id, user_id) do update set
    status = case when group_members.status = 'banned' then group_members.status else excluded.status end,
    role = case when group_members.role = 'owner' then group_members.role else 'member'::public.group_role end,
    joined_at = case when excluded.status = 'active' then now() else group_members.joined_at end
  returning * into result;
  return result;
end $$;

create function public.leave_group(target_group uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if exists(select 1 from groups where id = target_group and owner_id = auth.uid()) then
    raise exception 'Transfer ownership or delete the group before leaving';
  end if;
  delete from group_members where group_id = target_group and user_id = auth.uid();
end $$;

create function public.manage_group_member(target_group uuid, target_user uuid, action text, new_role group_role default null)
returns void language plpgsql security definer set search_path = public as $$
declare actor_role group_role; target_role group_role;
begin
  actor_role := group_member_role(target_group);
  select role into target_role from group_members where group_id = target_group and user_id = target_user;
  if actor_role not in ('owner','admin') then raise exception 'Not authorized' using errcode = '42501'; end if;
  if target_role = 'owner' or target_user = auth.uid() then raise exception 'This membership cannot be changed'; end if;
  if actor_role = 'admin' and target_role = 'admin' then raise exception 'Only the owner can manage admins'; end if;
  if action = 'approve' then update group_members set status='active', joined_at=now() where group_id=target_group and user_id=target_user and status='pending';
  elsif action = 'reject' then update group_members set status='rejected' where group_id=target_group and user_id=target_user and status='pending';
  elsif action = 'remove' then delete from group_members where group_id=target_group and user_id=target_user;
  elsif action = 'role' and new_role in ('admin','moderator','member') then
    if actor_role <> 'owner' and new_role = 'admin' then raise exception 'Only the owner can assign admins'; end if;
    update group_members set role=new_role where group_id=target_group and user_id=target_user and status='active';
  else raise exception 'Invalid membership action';
  end if;
end $$;

create function public.transfer_group_ownership(target_group uuid, target_user uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists(select 1 from groups where id=target_group and owner_id=auth.uid()) then raise exception 'Only the owner can transfer ownership' using errcode='42501'; end if;
  if not groups_private.is_active_group_member(target_group, target_user) then raise exception 'New owner must be an active member'; end if;
  update group_members set role='admin' where group_id=target_group and user_id=auth.uid();
  update group_members set role='owner' where group_id=target_group and user_id=target_user;
  update groups set owner_id=target_user where id=target_group;
end $$;

create function public.set_group_post_pinned(target_post uuid, pinned boolean) returns public.group_posts
language plpgsql security definer set search_path = public as $$
declare result public.group_posts; target_group uuid;
begin
  select group_id into target_group from group_posts where id=target_post;
  if not can_moderate_group(target_group) then raise exception 'Not authorized' using errcode='42501'; end if;
  update group_posts set is_pinned=pinned where id=target_post returning * into result;
  return result;
end $$;

create function public.validate_comment_parent() returns trigger language plpgsql set search_path = public as $$
declare parent_post uuid; parent_parent uuid;
begin
  if new.parent_comment_id is null then return new; end if;
  select post_id, parent_comment_id into parent_post, parent_parent from group_post_comments where id=new.parent_comment_id;
  if parent_post is distinct from new.post_id or parent_parent is not null then raise exception 'Replies may only be one level deep'; end if;
  return new;
end $$;
create trigger validate_comment_parent before insert or update of parent_comment_id on public.group_post_comments for each row execute function public.validate_comment_parent();

create function public.sync_group_counters() returns trigger language plpgsql security definer set search_path=public as $$
declare target uuid;
begin
  target := coalesce(new.group_id, old.group_id);
  update groups set
    member_count=(select count(*) from group_members where group_id=target and status='active'),
    post_count=(select count(*) from group_posts where group_id=target),
    last_activity_at=case when tg_table_name='group_posts' and tg_op='INSERT' then now() else last_activity_at end
  where id=target;
  return coalesce(new, old);
end $$;
create trigger sync_members after insert or update or delete on public.group_members for each row execute function public.sync_group_counters();
create trigger sync_posts after insert or delete on public.group_posts for each row execute function public.sync_group_counters();

create function public.sync_post_counters() returns trigger language plpgsql security definer set search_path=public as $$
declare target uuid; parent_group uuid;
begin
  target := case when tg_table_name='group_post_comments' then coalesce(new.post_id,old.post_id) else coalesce(new.post_id,old.post_id) end;
  update group_posts set
    comment_count=(select count(*) from group_post_comments where post_id=target),
    like_count=(select count(*) from group_post_likes where post_id=target)
  where id=target returning group_id into parent_group;
  update groups set last_activity_at=now() where id=parent_group;
  return coalesce(new,old);
end $$;
create trigger sync_comments after insert or delete on public.group_post_comments for each row execute function public.sync_post_counters();
create trigger sync_post_likes after insert or delete on public.group_post_likes for each row execute function public.sync_post_counters();

create function public.sync_comment_likes() returns trigger language plpgsql security definer set search_path=public as $$
declare target uuid;
begin target:=coalesce(new.comment_id,old.comment_id);
update group_post_comments set like_count=(select count(*) from group_comment_likes where comment_id=target) where id=target;
return coalesce(new,old); end $$;
create trigger sync_comment_likes after insert or delete on public.group_comment_likes for each row execute function public.sync_comment_likes();

alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_posts enable row level security;
alter table public.group_post_comments enable row level security;
alter table public.group_post_likes enable row level security;
alter table public.group_comment_likes enable row level security;

-- Private group metadata is discoverable to signed-in athletes so they can request
-- membership; posts and member details remain restricted to active members.
create policy "visible groups" on public.groups for select to authenticated using (auth.uid() is not null);
create policy "managers update groups" on public.groups for update to authenticated using (can_manage_group(id)) with check (can_manage_group(id));
create policy "owners delete groups" on public.groups for delete to authenticated using (owner_id=auth.uid());

create policy "visible memberships" on public.group_members for select to authenticated using (
  user_id=auth.uid() or can_manage_group(group_id) or
  (status='active' and exists(select 1 from groups g where g.id=group_id and (g.privacy='public' or is_active_group_member(g.id))))
);
create policy "users delete own non-owner membership" on public.group_members for delete to authenticated using (user_id=auth.uid() and role<>'owner');

create policy "visible group posts" on public.group_posts for select to authenticated using (
  exists(select 1 from groups g where g.id=group_id and (g.privacy='public' or is_active_group_member(g.id)))
);
create policy "members create posts" on public.group_posts for insert to authenticated with check (author_id=auth.uid() and is_active_group_member(group_id));
create policy "authors update posts" on public.group_posts for update to authenticated using (author_id=auth.uid())
with check (author_id=auth.uid());
create policy "authors and moderators delete posts" on public.group_posts for delete to authenticated using (author_id=auth.uid() or can_moderate_group(group_id));

create policy "visible comments" on public.group_post_comments for select to authenticated using (
  exists(select 1 from group_posts p join groups g on g.id=p.group_id where p.id=post_id and (g.privacy='public' or is_active_group_member(g.id)))
);
create policy "members create comments" on public.group_post_comments for insert to authenticated with check (
  author_id=auth.uid() and exists(select 1 from group_posts p where p.id=post_id and is_active_group_member(p.group_id))
);
create policy "authors update comments" on public.group_post_comments for update to authenticated using (author_id=auth.uid())
with check (author_id=auth.uid());
create policy "authors and moderators delete comments" on public.group_post_comments for delete to authenticated using (
  author_id=auth.uid() or exists(select 1 from group_posts p where p.id=post_id and can_moderate_group(p.group_id))
);

create policy "visible post likes" on public.group_post_likes for select to authenticated using (
  exists(select 1 from group_posts p join groups g on g.id=p.group_id where p.id=post_id and (g.privacy='public' or is_active_group_member(g.id)))
);
create policy "users create own post likes" on public.group_post_likes for insert to authenticated with check (
  user_id=auth.uid() and exists(select 1 from group_posts p where p.id=post_id and is_active_group_member(p.group_id))
);
create policy "users delete own post likes" on public.group_post_likes for delete to authenticated using (user_id=auth.uid());
create policy "visible comment likes" on public.group_comment_likes for select to authenticated using (
  exists(select 1 from group_post_comments c join group_posts p on p.id=c.post_id join groups g on g.id=p.group_id where c.id=comment_id and (g.privacy='public' or is_active_group_member(g.id)))
);
create policy "users create own comment likes" on public.group_comment_likes for insert to authenticated with check (
  user_id=auth.uid() and exists(select 1 from group_post_comments c join group_posts p on p.id=c.post_id where c.id=comment_id and is_active_group_member(p.group_id))
);
create policy "users delete own comment likes" on public.group_comment_likes for delete to authenticated using (user_id=auth.uid());

revoke all on function
  public.create_group(text,text,text,text,text,public.group_privacy,text,text),
  public.discover_groups(text,text,text,text,text,public.group_privacy,text,integer,integer),
  public.join_group(uuid),
  public.leave_group(uuid),
  public.manage_group_member(uuid,uuid,text,public.group_role),
  public.transfer_group_ownership(uuid,uuid),
  public.set_group_post_pinned(uuid,boolean),
  public.is_active_group_member(uuid),
  public.group_member_role(uuid),
  public.can_moderate_group(uuid),
  public.can_manage_group(uuid),
  public.group_post_image_path(text)
from public, anon;
grant execute on function
  public.create_group(text,text,text,text,text,public.group_privacy,text,text),
  public.discover_groups(text,text,text,text,text,public.group_privacy,text,integer,integer),
  public.join_group(uuid),
  public.leave_group(uuid),
  public.manage_group_member(uuid,uuid,text,public.group_role),
  public.transfer_group_ownership(uuid,uuid),
  public.set_group_post_pinned(uuid,boolean),
  public.is_active_group_member(uuid),
  public.group_member_role(uuid),
  public.can_moderate_group(uuid),
  public.can_manage_group(uuid),
  public.group_post_image_path(text)
to authenticated;

-- Table privileges and RLS are separate authorization layers. Grant only the
-- operations used directly by browser clients; RLS still authorizes every row.
-- Ownership, relationships, roles, statuses, and counters remain RPC/trigger-only.
revoke all on table
  public.groups,
  public.group_members,
  public.group_posts,
  public.group_post_comments,
  public.group_post_likes,
  public.group_comment_likes
from public, anon, authenticated;

grant select, delete on table public.groups to authenticated;
grant update (name, slug, description, sport, city, country, privacy, cover_image_url, avatar_url) on public.groups to authenticated;

grant select on table public.group_members to authenticated;

grant select, insert, delete on table public.group_posts to authenticated;
grant update (content, image_url) on public.group_posts to authenticated;

grant select, insert, delete on table public.group_post_comments to authenticated;
grant update (content) on public.group_post_comments to authenticated;

grant select, insert, delete on table public.group_post_likes to authenticated;
grant select, insert, delete on table public.group_comment_likes to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
('group-avatars','group-avatars',true,8388608,array['image/jpeg','image/png','image/webp','image/gif']),
('group-covers','group-covers',true,8388608,array['image/jpeg','image/png','image/webp','image/gif']),
('group-post-images','group-post-images',false,8388608,array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do nothing;

create policy "public read group media" on storage.objects for select using (bucket_id in ('group-avatars','group-covers'));
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
create policy "users stage authorized group media" on storage.objects for insert to authenticated with check (
  array_length(storage.foldername(storage.objects.name), 1) = 2
  and (storage.foldername(storage.objects.name))[1] = auth.uid()::text
  and (
    (
      bucket_id in ('group-avatars', 'group-covers')
      and exists (
        select 1 from public.groups g
        where g.id::text = (storage.foldername(storage.objects.name))[2]
          and g.owner_id = auth.uid()
      )
    )
    or (
      bucket_id = 'group-post-images'
      and exists (
        select 1 from public.group_members gm
        where gm.group_id::text = (storage.foldername(storage.objects.name))[2]
          and gm.user_id = auth.uid()
          and gm.status = 'active'
      )
    )
  )
);
create policy "users update own group media" on storage.objects for update to authenticated using (
  bucket_id in ('group-avatars','group-covers','group-post-images') and owner_id=auth.uid()::text
) with check (
  owner_id = auth.uid()::text
  and array_length(storage.foldername(storage.objects.name), 1) = 2
  and (storage.foldername(storage.objects.name))[1] = auth.uid()::text
  and (
    (
      bucket_id in ('group-avatars', 'group-covers')
      and exists (
        select 1 from public.groups g
        where g.id::text = (storage.foldername(storage.objects.name))[2]
          and g.owner_id = auth.uid()
      )
    )
    or (
      bucket_id = 'group-post-images'
      and exists (
        select 1 from public.group_members gm
        where gm.group_id::text = (storage.foldername(storage.objects.name))[2]
          and gm.user_id = auth.uid()
          and gm.status = 'active'
      )
    )
  )
);
alter publication supabase_realtime add table public.group_posts, public.group_post_comments, public.group_members;
