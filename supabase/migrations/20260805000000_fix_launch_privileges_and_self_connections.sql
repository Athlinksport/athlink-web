-- Close launch blockers found by the disposable local three-user smoke test.
-- This migration is intentionally forward-only: previously deployed migrations
-- remain unchanged, and a remote application must stop for manual review rather
-- than silently deleting legacy self-connections.

do $$
declare
  self_connection_count bigint;
begin
  select count(*)
  into self_connection_count
  from public.connections
  where sender_id = receiver_id;

  if self_connection_count > 0 then
    raise exception using
      errcode = '23514',
      message = format(
        'Cannot add connections_sender_receiver_not_self: %s legacy self-connection row(s) exist. Review and resolve those rows before applying this migration.',
        self_connection_count
      );
  end if;
end
$$;

alter table public.connections
  add constraint connections_sender_receiver_not_self
  check (sender_id <> receiver_id)
  not valid;

alter table public.connections
  validate constraint connections_sender_receiver_not_self;

-- PostgREST still enforces PostgreSQL table privileges for service_role even
-- though that role bypasses RLS. Reset the audited application-table privileges
-- and restore only operations used by reviewed server-only administration paths.
revoke all on table
  public.profiles,
  public.user_sports,
  public.user_availability,
  public.connections,
  public.conversations,
  public.conversation_members,
  public.messages,
  public.message_reads,
  public.groups,
  public.group_members,
  public.group_posts,
  public.group_post_comments,
  public.group_post_likes,
  public.group_comment_likes,
  public.reports,
  public.admin_roles,
  public.user_suspensions,
  public.moderation_actions,
  public.user_blocks
from service_role;

-- Minimal report-queue context.
grant select on table public.profiles to service_role;
grant select, delete on table public.groups to service_role;
grant select, delete on table public.group_posts to service_role;
grant select, delete on table public.group_post_comments to service_role;
grant select on table public.messages to service_role;

-- Local/operational administrator bootstrap. Application requests still
-- authorize administrators through is_current_user_admin before admin actions.
grant insert on table public.admin_roles to service_role;

-- Suspension upsert/rollback and restore require the complete row-level DML set
-- below; no sequence privilege is needed because the key is an auth user UUID.
grant select, insert, update, delete
  on table public.user_suspensions
  to service_role;

-- Used only to roll back an audit row when a later report update fails.
grant delete on table public.moderation_actions to service_role;
