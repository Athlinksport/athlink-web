begin;
select plan(52);
select ok((select relrowsecurity from pg_class where oid='public.groups'::regclass), 'groups use RLS');
select ok((select relrowsecurity from pg_class where oid='public.group_members'::regclass), 'memberships use RLS');
select ok((select relrowsecurity from pg_class where oid='public.messages'::regclass), 'messages use RLS');
select ok((select relrowsecurity from pg_class where oid='public.message_reads'::regclass), 'read markers use RLS');
select ok((select relrowsecurity from pg_class where oid='public.user_blocks'::regclass), 'blocks use RLS');
select ok((select relrowsecurity from pg_class where oid='public.reports'::regclass), 'reports use RLS');
select ok((select relrowsecurity from pg_class where oid='public.admin_roles'::regclass), 'admin roles use RLS');
select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.user_blocks'::regclass
      and conname = 'user_blocks_not_self'
      and contype = 'c'
  ),
  'self-block prevention exists'
);
select function_privs_are('public', 'get_or_create_direct_conversation', array['uuid'], 'anon', array[]::text[], 'anonymous conversation creation denied');
select function_privs_are('public', 'is_current_user_admin', array[]::text[], 'anon', array[]::text[], 'anonymous admin check denied');
select function_privs_are('public', 'list_eligible_connection_profile_ids', array[]::text[], 'anon', array[]::text[], 'anonymous profile eligibility denied');
select table_privs_are('public', 'admin_roles', 'anon', array[]::text[], 'anonymous admin-role access denied');
select table_privs_are('public', 'moderation_actions', 'anon', array[]::text[], 'anonymous moderation-history access denied');
select table_privs_are('public', 'profiles', 'anon', array[]::text[], 'legacy anonymous profile-table privileges removed');
select table_privs_are('public', 'user_sports', 'anon', array[]::text[], 'legacy anonymous sports-table privileges removed');
select table_privs_are('public', 'user_availability', 'anon', array[]::text[], 'legacy anonymous availability-table privileges removed');
select table_privs_are('public', 'connections', 'anon', array[]::text[], 'legacy anonymous connection-table privileges removed');

select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.connections'::regclass
      and conname = 'connections_sender_receiver_not_self'
      and contype = 'c'
      and convalidated
  ),
  'validated self-connection constraint exists'
);

select table_privs_are('public', 'profiles', 'service_role', array['SELECT'], 'service role reads profile moderation context only');
select table_privs_are('public', 'user_sports', 'service_role', array[]::text[], 'service role has no user-sports table privileges');
select table_privs_are('public', 'user_availability', 'service_role', array[]::text[], 'service role has no availability table privileges');
select table_privs_are('public', 'connections', 'service_role', array[]::text[], 'service role has no connection table privileges');
select table_privs_are('public', 'conversations', 'service_role', array[]::text[], 'service role has no conversation table privileges');
select table_privs_are('public', 'conversation_members', 'service_role', array[]::text[], 'service role has no conversation-member table privileges');
select table_privs_are('public', 'message_reads', 'service_role', array[]::text[], 'service role has no message-read table privileges');
select table_privs_are('public', 'groups', 'service_role', array['SELECT','DELETE'], 'service role reads and deletes groups only');
select table_privs_are('public', 'group_members', 'service_role', array[]::text[], 'service role has no group-member table privileges');
select table_privs_are('public', 'group_posts', 'service_role', array['SELECT','DELETE'], 'service role reads and deletes group posts only');
select table_privs_are('public', 'group_post_comments', 'service_role', array['SELECT','DELETE'], 'service role reads and deletes group comments only');
select table_privs_are('public', 'group_post_likes', 'service_role', array[]::text[], 'service role has no group-post-like table privileges');
select table_privs_are('public', 'group_comment_likes', 'service_role', array[]::text[], 'service role has no group-comment-like table privileges');
select table_privs_are('public', 'reports', 'service_role', array[]::text[], 'service role has no report table privileges');
select table_privs_are('public', 'admin_roles', 'service_role', array['INSERT'], 'service role bootstraps administrators only');
select table_privs_are('public', 'user_suspensions', 'service_role', array['SELECT','INSERT','UPDATE','DELETE'], 'service role manages suspension rows');
select table_privs_are('public', 'moderation_actions', 'service_role', array['DELETE'], 'service role only rolls back moderation audit rows');
select table_privs_are('public', 'user_blocks', 'service_role', array[]::text[], 'service role has no block table privileges');
select table_privs_are('public', 'messages', 'service_role', array['SELECT'], 'service role reads message moderation context only');

select ok(
  not exists (
    select 1
    from pg_class relation
    cross join lateral aclexplode(coalesce(relation.relacl, acldefault('r', relation.relowner))) privilege
    where relation.oid = any (array[
      'public.profiles'::regclass,
      'public.user_sports'::regclass,
      'public.user_availability'::regclass,
      'public.connections'::regclass,
      'public.conversations'::regclass,
      'public.conversation_members'::regclass,
      'public.messages'::regclass,
      'public.message_reads'::regclass,
      'public.groups'::regclass,
      'public.group_members'::regclass,
      'public.group_posts'::regclass,
      'public.group_post_comments'::regclass,
      'public.group_post_likes'::regclass,
      'public.group_comment_likes'::regclass,
      'public.reports'::regclass,
      'public.admin_roles'::regclass,
      'public.user_suspensions'::regclass,
      'public.moderation_actions'::regclass,
      'public.user_blocks'::regclass
    ])
      and privilege.grantee = 0
  ),
  'PUBLIC has no privileges on audited application tables'
);

select ok(
  not exists (
    select 1
    from pg_class relation
    cross join lateral aclexplode(coalesce(relation.relacl, acldefault('r', relation.relowner))) privilege
    where relation.oid = any (array[
      'public.profiles'::regclass,
      'public.user_sports'::regclass,
      'public.user_availability'::regclass,
      'public.connections'::regclass,
      'public.conversations'::regclass,
      'public.conversation_members'::regclass,
      'public.messages'::regclass,
      'public.message_reads'::regclass,
      'public.groups'::regclass,
      'public.group_members'::regclass,
      'public.group_posts'::regclass,
      'public.group_post_comments'::regclass,
      'public.group_post_likes'::regclass,
      'public.group_comment_likes'::regclass,
      'public.reports'::regclass,
      'public.admin_roles'::regclass,
      'public.user_suspensions'::regclass,
      'public.moderation_actions'::regclass,
      'public.user_blocks'::regclass
    ])
      and privilege.grantee = (select oid from pg_roles where rolname = 'anon')
  ),
  'platform default ACLs grant anon no effective audited-table privileges'
);

select table_privs_are(
  'public',
  'profiles',
  'authenticated',
  array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER'],
  'authenticated profile privileges remain unchanged'
);
select table_privs_are(
  'public',
  'user_sports',
  'authenticated',
  array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER'],
  'authenticated sports privileges remain unchanged'
);
select table_privs_are(
  'public',
  'user_availability',
  'authenticated',
  array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER'],
  'authenticated availability privileges remain unchanged'
);
select table_privs_are(
  'public',
  'connections',
  'authenticated',
  array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER'],
  'authenticated connection privileges remain unchanged'
);
select table_privs_are(
  'public',
  'groups',
  'authenticated',
  array['SELECT','DELETE'],
  'authenticated group privileges remain unchanged'
);

insert into auth.users (id, email)
values
  ('00000000-0000-4000-8000-000000000001', 'launch-test-a@example.invalid'),
  ('00000000-0000-4000-8000-000000000002', 'launch-test-b@example.invalid'),
  ('00000000-0000-4000-8000-000000000003', 'launch-test-admin@example.invalid');

insert into public.profiles (id, display_name)
values
  ('00000000-0000-4000-8000-000000000001', 'Launch Test A'),
  ('00000000-0000-4000-8000-000000000002', 'Launch Test B'),
  ('00000000-0000-4000-8000-000000000003', 'Launch Test Admin');

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);

insert into public.groups (id, name, slug, description, sport, country, owner_id)
values
  ('10000000-0000-4000-8000-000000000001', 'Context Group', 'context-group', 'Disposable moderation context group.', 'Running', 'France', '00000000-0000-4000-8000-000000000001'),
  ('10000000-0000-4000-8000-000000000002', 'Removal Group', 'removal-group', 'Disposable moderation removal group.', 'Running', 'France', '00000000-0000-4000-8000-000000000001'),
  ('10000000-0000-4000-8000-000000000003', 'Account Group', 'account-group', 'Disposable account deletion group.', 'Running', 'France', '00000000-0000-4000-8000-000000000002');

insert into public.group_posts (id, group_id, author_id, content)
values (
  '20000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  'Disposable moderation context post.'
);

insert into public.group_post_comments (id, post_id, author_id, content)
values (
  '30000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000002',
  'Disposable moderation context comment.'
);

select set_config('request.jwt.claim.sub', '', true);

select throws_ok(
  $$
    set local role authenticated;
    select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
    insert into public.connections (sender_id, receiver_id)
    values ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001');
  $$,
  '23514',
  'new row for relation "connections" violates check constraint "connections_sender_receiver_not_self"',
  'self-connection insertion is rejected by the database constraint'
);

select throws_ok(
  $$
    set local role authenticated;
    select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);
    insert into public.connections (sender_id, receiver_id)
    values ('00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001');
  $$,
  '42501',
  'Caller ownership required',
  'normal user cannot spoof another connection sender'
);

select lives_ok(
  $$
    set local role service_role;
    insert into public.admin_roles (user_id, granted_by)
    values ('00000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000003');
    reset role;
  $$,
  'service role can bootstrap an administrator'
);

select lives_ok(
  $$
    set local role service_role;
    select id, display_name from public.profiles where id = '00000000-0000-4000-8000-000000000001';
    select id, name from public.groups where id = '10000000-0000-4000-8000-000000000001';
    select id, content from public.group_posts where id = '20000000-0000-4000-8000-000000000001';
    select id, content from public.group_post_comments where id = '30000000-0000-4000-8000-000000000001';
    select id, content from public.messages where false;
    reset role;
  $$,
  'service role can read only the moderation target context used by the API'
);

select lives_ok(
  $$
    set local role service_role;
    insert into public.user_suspensions (user_id, reason, suspended_by)
    values ('00000000-0000-4000-8000-000000000002', 'Disposable suspension', '00000000-0000-4000-8000-000000000003');
    update public.user_suspensions set reason = 'Disposable updated suspension'
    where user_id = '00000000-0000-4000-8000-000000000002';
    delete from public.user_suspensions
    where user_id = '00000000-0000-4000-8000-000000000002';
    reset role;
  $$,
  'service role can insert, update, and delete suspension records'
);

select lives_ok(
  $$
    set local role service_role;
    delete from public.group_post_comments
    where id = '30000000-0000-4000-8000-000000000001';
    reset role;
  $$,
  'service role can remove reported group content'
);

select lives_ok(
  $$
    set local role service_role;
    delete from public.groups
    where id = '10000000-0000-4000-8000-000000000003';
    reset role;
  $$,
  'service role can delete an owned group during account deletion'
);

select throws_ok(
  $$
    set local role service_role;
    select * from public.connections;
  $$,
  '42501',
  'permission denied for table connections',
  'service role cannot read unrelated connection data'
);
select * from finish();
rollback;
