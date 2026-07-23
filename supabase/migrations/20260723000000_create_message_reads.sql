-- Per-user message read markers.
--
-- A separate join table supports any number of conversation members without
-- changing the messages table. Clients should mark a message as read with an
-- idempotent upsert using onConflict: "message_id,user_id" and ignoreDuplicates.

create table public.message_reads (
  message_id uuid not null,
  user_id uuid not null,
  read_at timestamptz not null default now(),

  constraint message_reads_pkey primary key (message_id, user_id),
  constraint message_reads_message_id_fkey
    foreign key (message_id)
    references public.messages (id)
    on delete cascade,
  constraint message_reads_user_id_fkey
    foreign key (user_id)
    references auth.users (id)
    on delete cascade
);

-- The primary key is optimal for fetching all receipts for one message.
-- This reverse index supports per-user unread anti-joins and read history.
create index message_reads_user_id_message_id_idx
  on public.message_reads (user_id, message_id);

alter table public.message_reads enable row level security;

-- Conversation members may see receipts for messages in their conversations.
-- This supports future group-chat receipt lists without exposing other chats.
create policy "Conversation members can view message reads"
  on public.message_reads
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.messages as message
      inner join public.conversation_members as member
        on member.conversation_id = message.conversation_id
      where message.id = message_reads.message_id
        and member.user_id = (select auth.uid())
    )
  );

-- A user may only create their own marker, and only for a message in a
-- conversation of which they are currently a member.
create policy "Conversation members can mark messages read"
  on public.message_reads
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.messages as message
      inner join public.conversation_members as member
        on member.conversation_id = message.conversation_id
      where message.id = message_reads.message_id
        and member.user_id = (select auth.uid())
    )
  );

-- Keep read markers append-only for authenticated clients. The table owner and
-- service role retain their normal administrative access.
revoke all on table public.message_reads from anon;
grant select, insert on table public.message_reads to authenticated;
revoke update, delete, truncate, references, trigger
  on table public.message_reads
  from authenticated;

comment on table public.message_reads is
  'Immutable per-user read markers for conversation messages.';
comment on column public.message_reads.message_id is
  'Message that was read.';
comment on column public.message_reads.user_id is
  'Conversation member who read the message.';
comment on column public.message_reads.read_at is
  'First time the user marked the message as read.';
