-- Table privileges and RLS are separate authorization layers. The Groups tables
-- already have RLS enabled; these grants only make the policy-approved client
-- operations reachable through PostgREST.
--
-- Reset default privileges first so PUBLIC, anon, and authenticated cannot
-- retain operations outside the least-privilege matrix below.
revoke all on table
  public.groups,
  public.group_members,
  public.group_posts,
  public.group_post_comments,
  public.group_post_likes,
  public.group_comment_likes
from public, anon, authenticated;

-- Group creation and membership changes remain SECURITY DEFINER RPC workflows.
-- Owners delete groups directly; metadata/media URL updates stay column-scoped.
grant select, delete on table public.groups to authenticated;
grant update (name, slug, description, sport, city, country, privacy, cover_image_url, avatar_url)
  on table public.groups
  to authenticated;

-- Membership insertion, deletion, status changes, and role changes remain RPC-only.
grant select on table public.group_members to authenticated;

-- Authors create/delete posts directly; editable fields remain column-scoped.
grant select, insert, delete on table public.group_posts to authenticated;
grant update (content, image_url)
  on table public.group_posts
  to authenticated;

-- Authors create/delete comments directly; only comment content is editable.
grant select, insert, delete on table public.group_post_comments to authenticated;
grant update (content)
  on table public.group_post_comments
  to authenticated;

-- Likes are immutable join rows: clients may read, create, or remove their own.
grant select, insert, delete on table public.group_post_likes to authenticated;
grant select, insert, delete on table public.group_comment_likes to authenticated;
