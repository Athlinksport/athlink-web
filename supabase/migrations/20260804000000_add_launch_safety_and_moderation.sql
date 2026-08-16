-- Forward-only launch safety controls. Existing group and room visibility policies remain intact.
create schema if not exists moderation_private;
revoke all on schema moderation_private from public, anon, authenticated;

create type public.report_target_type as enum ('user', 'group', 'post', 'comment', 'message');
create type public.report_reason as enum ('harassment', 'hate', 'threats', 'spam', 'fraud', 'impersonation', 'sexual_content', 'unsafe_activity', 'other');
create type public.report_status as enum ('unresolved', 'reviewing', 'resolved', 'dismissed');
create type public.moderation_action_type as enum ('report_status', 'user_suspend', 'user_restore', 'content_hide', 'content_restore');

create table public.user_blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint user_blocks_not_self check (blocker_id <> blocked_id),
  constraint user_blocks_pair_unique unique (blocker_id, blocked_id)
);
create index user_blocks_blocked_idx on public.user_blocks (blocked_id, blocker_id);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references auth.users(id) on delete set null,
  target_type public.report_target_type not null,
  target_id uuid not null,
  reason public.report_reason not null,
  details text,
  status public.report_status not null default 'unresolved',
  moderation_note text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reports_details_length check (details is null or char_length(details) <= 500),
  constraint reports_note_length check (moderation_note is null or char_length(moderation_note) <= 2000)
);
create unique index reports_open_duplicate_idx on public.reports (reporter_id, target_type, target_id)
  where status in ('unresolved', 'reviewing');
create index reports_queue_idx on public.reports (status, target_type, created_at desc, id desc);

create table public.admin_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  granted_at timestamptz not null default now(),
  granted_by uuid references auth.users(id) on delete set null
);

create table public.user_suspensions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  reason text not null check (char_length(reason) between 1 and 1000),
  suspended_at timestamptz not null default now(),
  suspended_by uuid not null references auth.users(id) on delete restrict
);

create table public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references auth.users(id) on delete set null,
  action public.moderation_action_type not null,
  target_type public.report_target_type not null,
  target_id uuid not null,
  report_id uuid references public.reports(id) on delete set null,
  note text check (note is null or char_length(note) <= 2000),
  created_at timestamptz not null default now()
);
create index moderation_actions_target_idx on public.moderation_actions (target_type, target_id, created_at desc);

create table moderation_private.rate_limits (
  actor_id uuid not null,
  action text not null,
  window_start timestamptz not null,
  attempts integer not null default 1,
  primary key (actor_id, action, window_start)
);
revoke all on table moderation_private.rate_limits from public, anon, authenticated;

create function moderation_private.is_admin(target_user uuid)
returns boolean language sql stable security definer set search_path = ''
as $$ select exists(select 1 from public.admin_roles where user_id = target_user) $$;
revoke all on function moderation_private.is_admin(uuid) from public, anon, authenticated;

create function public.is_current_user_admin()
returns boolean language sql stable security definer set search_path = ''
as $$ select auth.uid() is not null and moderation_private.is_admin(auth.uid()) $$;
revoke all on function public.is_current_user_admin() from public, anon;
grant execute on function public.is_current_user_admin() to authenticated;

create function public.is_blocked_between(other_user_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select auth.uid() is not null and exists (
    select 1 from public.user_blocks
    where (blocker_id = auth.uid() and blocked_id = other_user_id)
       or (blocker_id = other_user_id and blocked_id = auth.uid())
  )
$$;
revoke all on function public.is_blocked_between(uuid) from public, anon;
grant execute on function public.is_blocked_between(uuid) to authenticated;

create function public.list_eligible_connection_profile_ids()
returns table(id uuid) language sql stable security definer set search_path = '' as $$
  select profile.id from public.profiles profile
  where auth.uid() is not null
    and profile.id <> auth.uid()
    and profile.profile_visibility = 'public'
    and not exists (
      select 1 from public.user_suspensions
      where user_id = profile.id
    )
    and not exists (
      select 1 from public.user_blocks
      where (blocker_id=auth.uid() and blocked_id=profile.id)
         or (blocker_id=profile.id and blocked_id=auth.uid())
    )
$$;
revoke all on function public.list_eligible_connection_profile_ids() from public, anon;
grant execute on function public.list_eligible_connection_profile_ids() to authenticated;

create function moderation_private.consume_limit(actor uuid, action_name text, max_attempts int, window_seconds int)
returns void language plpgsql security definer set search_path = '' as $$
declare bucket timestamptz := to_timestamp(floor(extract(epoch from now()) / window_seconds) * window_seconds);
declare current_attempts int;
begin
  insert into moderation_private.rate_limits(actor_id, action, window_start, attempts)
  values(actor, action_name, bucket, 1)
  on conflict(actor_id, action, window_start) do update set attempts = moderation_private.rate_limits.attempts + 1
  returning attempts into current_attempts;
  if current_attempts > max_attempts then
    raise exception using errcode='P0001', message='Rate limit exceeded';
  end if;
end $$;
revoke all on function moderation_private.consume_limit(uuid,text,int,int) from public, anon, authenticated;

create function moderation_private.enforce_launch_safety()
returns trigger language plpgsql security definer set search_path = '' as $$
declare other_id uuid;
begin
  if exists (
    select 1 from public.user_suspensions
    where user_id = auth.uid()
  ) then
    raise exception using errcode='42501', message='Account suspended';
  end if;
  if auth.uid() is null or (
    tg_table_name <> 'groups'
    and coalesce((to_jsonb(new)->>'sender_id')::uuid, (to_jsonb(new)->>'reporter_id')::uuid, auth.uid()) <> auth.uid()
  ) then
    raise exception using errcode='42501', message='Caller ownership required';
  end if;
  if tg_table_name = 'connections' then
    other_id := (to_jsonb(new)->>'receiver_id')::uuid;
    if exists(select 1 from public.user_blocks where (blocker_id=auth.uid() and blocked_id=other_id) or (blocker_id=other_id and blocked_id=auth.uid())) then
      raise exception using errcode='42501', message='Connection blocked';
    end if;
    perform moderation_private.consume_limit(auth.uid(), 'connection', 20, 3600);
  elsif tg_table_name = 'messages' then
    select case when participant_low=auth.uid() then participant_high else participant_low end into other_id
    from public.conversations where id=(to_jsonb(new)->>'conversation_id')::uuid and auth.uid() in (participant_low, participant_high);
    if other_id is null or exists(select 1 from public.user_blocks where (blocker_id=auth.uid() and blocked_id=other_id) or (blocker_id=other_id and blocked_id=auth.uid())) then
      raise exception using errcode='42501', message='Messaging blocked';
    end if;
    perform moderation_private.consume_limit(auth.uid(), 'message', 60, 60);
  elsif tg_table_name = 'groups' then
    perform moderation_private.consume_limit(auth.uid(), 'group', 5, 86400);
  elsif tg_table_name = 'reports' then
    perform moderation_private.consume_limit(auth.uid(), 'report', 20, 3600);
  end if;
  return new;
end $$;
revoke all on function moderation_private.enforce_launch_safety() from public, anon, authenticated;

create trigger launch_safety_connections before insert on public.connections for each row execute function moderation_private.enforce_launch_safety();
create trigger launch_safety_messages before insert on public.messages for each row execute function moderation_private.enforce_launch_safety();
create trigger launch_safety_groups before insert on public.groups for each row execute function moderation_private.enforce_launch_safety();
create trigger launch_safety_reports before insert on public.reports for each row execute function moderation_private.enforce_launch_safety();

create or replace function public.get_or_create_direct_conversation(other_user_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare caller_id uuid := auth.uid(); low_id uuid; high_id uuid; conversation_id uuid;
begin
  if caller_id is null then raise exception using errcode='42501', message='Authentication required'; end if;
  if other_user_id is null or other_user_id=caller_id then raise exception using errcode='22023', message='You cannot message yourself'; end if;
  if exists(select 1 from public.user_suspensions where user_id in (caller_id, other_user_id)) then
    raise exception using errcode='42501', message='Messaging unavailable';
  end if;
  if exists(select 1 from public.user_blocks where (blocker_id=caller_id and blocked_id=other_user_id) or (blocker_id=other_user_id and blocked_id=caller_id)) then
    raise exception using errcode='42501', message='Messaging unavailable';
  end if;
  if not exists(select 1 from public.profiles where id=other_user_id) then raise exception using errcode='P0002', message='Athlete not found'; end if;
  if not exists(select 1 from public.connections where status='accepted' and ((sender_id=caller_id and receiver_id=other_user_id) or (sender_id=other_user_id and receiver_id=caller_id))) then
    raise exception using errcode='42501', message='Only connected athletes can start conversations';
  end if;
  perform moderation_private.consume_limit(caller_id, 'conversation', 20, 3600);
  low_id:=least(caller_id,other_user_id); high_id:=greatest(caller_id,other_user_id);
  insert into public.conversations(participant_low,participant_high) values(low_id,high_id)
    on conflict(participant_low,participant_high) do update set updated_at=public.conversations.updated_at returning id into conversation_id;
  insert into public.conversation_members(conversation_id,user_id) values(conversation_id,caller_id),(conversation_id,other_user_id) on conflict do nothing;
  return conversation_id;
end $$;

alter table public.user_blocks enable row level security;
alter table public.reports enable row level security;
alter table public.admin_roles enable row level security;
alter table public.user_suspensions enable row level security;
alter table public.moderation_actions enable row level security;

create policy "users view own blocks" on public.user_blocks for select to authenticated using (blocker_id=auth.uid());
create policy "users create own blocks" on public.user_blocks for insert to authenticated with check (blocker_id=auth.uid() and blocked_id<>auth.uid());
create policy "users remove own blocks" on public.user_blocks for delete to authenticated using (blocker_id=auth.uid());
create policy "reporters view own reports" on public.reports for select to authenticated using (reporter_id=auth.uid() or public.is_current_user_admin());
create policy "reporters create own reports" on public.reports for insert to authenticated with check (reporter_id=auth.uid() and status='unresolved' and reviewed_by is null and moderation_note is null);
create policy "admins update reports" on public.reports for update to authenticated using (public.is_current_user_admin()) with check (public.is_current_user_admin());
create policy "admins view own role" on public.admin_roles for select to authenticated using (user_id=auth.uid());
create policy "admins view suspensions" on public.user_suspensions for select to authenticated using (public.is_current_user_admin());
create policy "admins manage suspensions" on public.user_suspensions for all to authenticated using (public.is_current_user_admin()) with check (public.is_current_user_admin() and suspended_by=auth.uid());
create policy "admins view moderation actions" on public.moderation_actions for select to authenticated using (public.is_current_user_admin());
create policy "admins create moderation actions" on public.moderation_actions for insert to authenticated with check (public.is_current_user_admin() and admin_id=auth.uid());

revoke all on table public.user_blocks, public.reports, public.admin_roles, public.user_suspensions, public.moderation_actions from public, anon, authenticated;
grant select, insert, delete on public.user_blocks to authenticated;
grant select, insert on public.reports to authenticated;
grant update(status, moderation_note, reviewed_by, reviewed_at, updated_at) on public.reports to authenticated;
grant select on public.admin_roles to authenticated;
grant select, insert, update, delete on public.user_suspensions to authenticated;
grant select, insert on public.moderation_actions to authenticated;
revoke all on function public.get_or_create_direct_conversation(uuid) from public, anon;
grant execute on function public.get_or_create_direct_conversation(uuid) to authenticated;

-- Bootstrap the first administrator manually with a reviewed user UUID:
-- insert into public.admin_roles(user_id) values ('00000000-0000-0000-0000-000000000000');
