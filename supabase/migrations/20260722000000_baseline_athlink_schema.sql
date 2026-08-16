-- Athlink authoritative baseline.
--
-- This migration reconstructs the application schema that existed immediately
-- before 20260723000000_create_message_reads.sql. It contains schema and storage
-- configuration only: no auth users, profile rows, messages, or other user data.
--
-- The linked remote database already contains the equivalent baseline objects.
-- Do not push this migration remotely until a separate, reviewed task has:
--   1. verified exact remote equivalence,
--   2. backed up the remote database, and
--   3. marked only this baseline version as applied in remote migration history.

create extension if not exists pgcrypto;

-- Core athlete profiles.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  bio text,
  city_name text,
  country_name text,
  latitude double precision,
  longitude double precision,
  location_visibility text default 'city',
  languages text[] default '{}'::text[],
  gender text,
  pronouns text,
  looking_for text[] default '{}'::text[],
  communication_preferences text[] default '{}'::text[],
  search_radius_km integer default 10,
  social_group_size text,
  training_atmosphere text[] default '{}'::text[],
  planning_style text,
  activity_social_style text,
  competitiveness text,
  profile_visibility text default 'public',
  dating_enabled boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  birth_date date,
  avatar_url text
);

create table public.user_sports (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  sport_id text not null,
  sport_name text not null,
  category text,
  level text,
  goals text[] default '{}'::text[],
  preferred_intensity text,
  frequency text,
  is_primary boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.user_availability (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  time_period text not null,
  flexible boolean default false,
  created_at timestamptz default now(),
  unique (user_id, day_of_week, time_period)
);

-- Connection requests predate the repository migration chain.
create table public.connections (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null,
  receiver_id uuid not null,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  constraint connections_sender_id_receiver_id_key
    unique (sender_id, receiver_id),
  constraint connections_sender_id_fkey
    foreign key (sender_id) references auth.users(id) on delete cascade,
  constraint connections_receiver_id_fkey
    foreign key (receiver_id) references auth.users(id) on delete cascade,
  constraint connections_sender_profile_fkey
    foreign key (sender_id) references public.profiles(id) on delete cascade,
  constraint connections_receiver_profile_fkey
    foreign key (receiver_id) references public.profiles(id) on delete cascade
);

-- Legacy direct messaging shape. The 20260803000000 migration deliberately
-- adds participant-pair columns, timestamps, soft-deletion fields, indexes,
-- functions, policies, grants, triggers, and Realtime membership.
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  conversation_type text not null default 'direct'
    check (conversation_type in ('direct', 'group', 'room')),
  title text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  direct_key text
);

create unique index conversations_direct_key_unique
  on public.conversations (direct_key)
  where conversation_type = 'direct' and direct_key is not null;

create table public.conversation_members (
  conversation_id uuid not null
    references public.conversations(id) on delete cascade,
  user_id uuid not null
    references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (conversation_id, user_id),
  constraint conversation_members_user_profile_fkey
    foreign key (user_id) references public.profiles(id) on delete cascade
);

create function public.is_conversation_member(target_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.conversation_members
    where conversation_id = target_conversation_id
      and user_id = auth.uid()
  );
$$;

grant execute on function public.is_conversation_member(uuid) to authenticated;

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null
    references public.conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  content text not null check (char_length(trim(content)) > 0),
  created_at timestamptz not null default now(),
  is_deleted boolean not null default false
);

-- RLS and privileges captured from the linked schema for baseline objects.
alter table public.profiles enable row level security;
alter table public.user_sports enable row level security;
alter table public.user_availability enable row level security;
alter table public.connections enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;

create policy "Users can view their own profile"
on public.profiles for select to authenticated
using (auth.uid() = id);

create policy "Authenticated users can view public profiles"
on public.profiles for select to authenticated
using (auth.uid() = id or profile_visibility = 'public');

create policy "Users can create their own profile"
on public.profiles for insert to authenticated
with check (auth.uid() = id);

create policy "Users can update their own profile"
on public.profiles for update to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "Users can delete their own profile"
on public.profiles for delete to authenticated
using (auth.uid() = id);

create policy "Users can view their own sports"
on public.user_sports for select to authenticated
using (auth.uid() = user_id);

create policy "Authenticated users can view sports of public profiles"
on public.user_sports for select to authenticated
using (
  auth.uid() = user_id
  or exists (
    select 1 from public.profiles
    where profiles.id = user_sports.user_id
      and profiles.profile_visibility = 'public'
  )
);

create policy "Users can add their own sports"
on public.user_sports for insert to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own sports"
on public.user_sports for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own sports"
on public.user_sports for delete to authenticated
using (auth.uid() = user_id);

create policy "Users can view their own availability"
on public.user_availability for select to authenticated
using (auth.uid() = user_id);

create policy "Authenticated users can view availability of public profiles"
on public.user_availability for select to authenticated
using (
  auth.uid() = user_id
  or exists (
    select 1 from public.profiles
    where profiles.id = user_availability.user_id
      and profiles.profile_visibility = 'public'
  )
);

create policy "Users can add their own availability"
on public.user_availability for insert to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own availability"
on public.user_availability for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own availability"
on public.user_availability for delete to authenticated
using (auth.uid() = user_id);

create policy "Users can view their own connections"
on public.connections for select
using (auth.uid() = sender_id or auth.uid() = receiver_id);

create policy "Users can send connection requests"
on public.connections for insert
with check (auth.uid() = sender_id);

create policy "Receiver can update connection requests"
on public.connections for update
using (auth.uid() = receiver_id);

create policy "Participants can delete connections"
on public.connections for delete
using (auth.uid() = sender_id or auth.uid() = receiver_id);

-- These legacy messaging policies are replaced wholesale by
-- 20260803000000_secure_direct_messaging.sql.
create policy "Conversation members can view conversations"
on public.conversations for select to authenticated
using (
  exists (
    select 1 from public.conversation_members
    where conversation_id = conversations.id
      and user_id = auth.uid()
  )
);

create policy "Users can view their own conversation memberships"
on public.conversation_members for select to authenticated
using (user_id = auth.uid());

create policy "Conversation members can view messages"
on public.messages for select to authenticated
using (
  exists (
    select 1 from public.conversation_members
    where conversation_id = messages.conversation_id
      and user_id = auth.uid()
  )
);

create policy "Conversation members can send messages"
on public.messages for insert to authenticated
with check (
  sender_id = auth.uid()
  and exists (
    select 1 from public.conversation_members
    where conversation_id = messages.conversation_id
      and user_id = auth.uid()
  )
);

revoke all on table
  public.profiles,
  public.user_sports,
  public.user_availability,
  public.connections,
  public.conversations,
  public.conversation_members,
  public.messages
from public, anon, authenticated;

-- Reproduce the authoritative historical remote state exactly. These four
-- legacy tables granted anon only non-DML table-management privileges; anon
-- never received SELECT, INSERT, UPDATE, or DELETE here. The forward migration
-- 20260806000000_revoke_legacy_anon_privileges.sql intentionally removes these
-- historical grants, so the fully migrated database does not retain them.
grant references, trigger, truncate, maintain on table
  public.profiles,
  public.user_sports,
  public.user_availability,
  public.connections
to anon;

grant all on table
  public.profiles,
  public.user_sports,
  public.user_availability,
  public.connections
to authenticated;

grant select on table
  public.conversations,
  public.conversation_members
to authenticated;

grant select, insert on table public.messages to authenticated;
grant usage, select on sequence public.user_sports_id_seq to authenticated;
grant usage, select on sequence public.user_availability_id_seq to authenticated;

-- Original avatar storage configuration. Storage's system schema is provisioned
-- by the local Supabase stack; the baseline adds only Athlink-owned state.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "Give users access to own folder 1oj01fe_0"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
