-- Bring the legacy direct-messaging tables under migration control without
-- replacing message_reads or get_unread_message_count().

alter table public.conversations
  add column if not exists participant_low uuid references public.profiles(id) on delete cascade,
  add column if not exists participant_high uuid references public.profiles(id) on delete cascade,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists last_message_at timestamptz;

with pairs as (
  select
    conversation_id,
    min(user_id::text)::uuid as participant_low,
    max(user_id::text)::uuid as participant_high
  from public.conversation_members
  group by conversation_id
  having count(*) = 2
)
update public.conversations as conversation
set
  participant_low = pair.participant_low,
  participant_high = pair.participant_high
from pairs as pair
where pair.conversation_id = conversation.id
  and (conversation.participant_low is null or conversation.participant_high is null);

update public.conversations as conversation
set last_message_at = latest.created_at
from (
  select conversation_id, max(created_at) as created_at
  from public.messages
  group by conversation_id
) as latest
where latest.conversation_id = conversation.id
  and conversation.last_message_at is null;

alter table public.conversations
  alter column participant_low set not null,
  alter column participant_high set not null,
  add constraint conversations_distinct_participants_check
    check (participant_low < participant_high);

create unique index conversations_direct_pair_key
  on public.conversations (participant_low, participant_high);
create index conversations_participant_low_last_message_idx
  on public.conversations (participant_low, last_message_at desc nulls last);
create index conversations_participant_high_last_message_idx
  on public.conversations (participant_high, last_message_at desc nulls last);
create index conversations_last_message_at_idx
  on public.conversations (last_message_at desc nulls last);

alter table public.messages
  add column if not exists edited_at timestamptz,
  add column if not exists deleted_at timestamptz,
  add constraint messages_content_length_check
    check (
      char_length(btrim(content)) between 1 and 4000
      or deleted_at is not null
    );

create index messages_conversation_page_idx
  on public.messages (conversation_id, created_at desc, id desc);
create index messages_unread_lookup_idx
  on public.messages (conversation_id, sender_id, created_at desc);

create or replace function public.touch_direct_conversation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.conversations
  set
    updated_at = now(),
    last_message_at = new.created_at
  where id = new.conversation_id;
  return new;
end;
$$;

create or replace function public.get_unread_message_count()
returns bigint
language sql
stable
security invoker
set search_path = ''
as $$
  select count(*)::bigint
  from public.messages as message
  join public.conversations as conversation on conversation.id = message.conversation_id
  where message.sender_id <> auth.uid()
    and message.deleted_at is null
    and auth.uid() in (conversation.participant_low, conversation.participant_high)
    and not exists (
      select 1
      from public.message_reads as message_read
      where message_read.message_id = message.id
        and message_read.user_id = auth.uid()
    );
$$;

drop trigger if exists messages_touch_direct_conversation on public.messages;
create trigger messages_touch_direct_conversation
after insert on public.messages
for each row execute function public.touch_direct_conversation();

create or replace function public.get_or_create_direct_conversation(other_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  low_id uuid;
  high_id uuid;
  conversation_id uuid;
begin
  if caller_id is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;
  if other_user_id is null or other_user_id = caller_id then
    raise exception using errcode = '22023', message = 'You cannot message yourself';
  end if;
  if not exists (select 1 from public.profiles where id = other_user_id) then
    raise exception using errcode = 'P0002', message = 'Athlete not found';
  end if;
  if not exists (
    select 1
    from public.connections
    where status = 'accepted'
      and (
        (sender_id = caller_id and receiver_id = other_user_id)
        or (sender_id = other_user_id and receiver_id = caller_id)
      )
  ) then
    raise exception using errcode = '42501', message = 'Only connected athletes can start conversations';
  end if;

  low_id := least(caller_id, other_user_id);
  high_id := greatest(caller_id, other_user_id);

  insert into public.conversations (participant_low, participant_high)
  values (low_id, high_id)
  on conflict (participant_low, participant_high)
  do update set updated_at = public.conversations.updated_at
  returning id into conversation_id;

  insert into public.conversation_members (conversation_id, user_id)
  values (conversation_id, caller_id), (conversation_id, other_user_id)
  on conflict do nothing;

  return conversation_id;
end;
$$;

create or replace function public.list_direct_conversations()
returns table (
  id uuid,
  participant_id uuid,
  participant_name text,
  participant_avatar_url text,
  participant_city text,
  participant_country text,
  last_message_id uuid,
  last_message_sender_id uuid,
  last_message_content text,
  last_message_created_at timestamptz,
  unread_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    conversation.id,
    participant.id,
    participant.display_name,
    participant.avatar_url,
    participant.city_name,
    participant.country_name,
    latest.id,
    latest.sender_id,
    case when latest.deleted_at is null then latest.content else 'Message deleted' end,
    latest.created_at,
    (
      select count(*)::bigint
      from public.messages as unread
      where unread.conversation_id = conversation.id
        and unread.sender_id <> auth.uid()
        and unread.deleted_at is null
        and not exists (
          select 1
          from public.message_reads as receipt
          where receipt.message_id = unread.id
            and receipt.user_id = auth.uid()
        )
    )
  from public.conversations as conversation
  join public.profiles as participant
    on participant.id = case
      when conversation.participant_low = auth.uid() then conversation.participant_high
      else conversation.participant_low
    end
  left join lateral (
    select message.*
    from public.messages as message
    where message.conversation_id = conversation.id
    order by message.created_at desc, message.id desc
    limit 1
  ) as latest on true
  where auth.uid() in (conversation.participant_low, conversation.participant_high)
  order by conversation.last_message_at desc nulls last, conversation.created_at desc;
$$;

create or replace function public.mark_direct_conversation_read(target_conversation_id uuid)
returns bigint
language plpgsql
security invoker
set search_path = ''
as $$
declare
  inserted_count bigint;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;
  if not exists (
    select 1
    from public.conversations
    where id = target_conversation_id
      and auth.uid() in (participant_low, participant_high)
  ) then
    raise exception using errcode = '42501', message = 'Conversation access denied';
  end if;

  insert into public.message_reads (message_id, user_id)
  select message.id, auth.uid()
  from public.messages as message
  where message.conversation_id = target_conversation_id
    and message.sender_id <> auth.uid()
    and message.deleted_at is null
  on conflict do nothing;

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;

do $$
declare policy_record record;
begin
  for policy_record in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('conversations', 'conversation_members', 'messages', 'message_reads')
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      policy_record.policyname,
      policy_record.schemaname,
      policy_record.tablename
    );
  end loop;
end;
$$;

create policy "participants view direct conversations"
on public.conversations for select to authenticated
using (auth.uid() in (participant_low, participant_high));

create policy "participants view direct members"
on public.conversation_members for select to authenticated
using (
  exists (
    select 1 from public.conversations
    where id = conversation_members.conversation_id
      and auth.uid() in (participant_low, participant_high)
  )
);

create policy "participants view direct messages"
on public.messages for select to authenticated
using (
  exists (
    select 1 from public.conversations
    where id = messages.conversation_id
      and auth.uid() in (participant_low, participant_high)
  )
);

create policy "participants send direct messages"
on public.messages for insert to authenticated
with check (
  sender_id = auth.uid()
  and deleted_at is null
  and edited_at is null
  and exists (
    select 1 from public.conversations
    where id = messages.conversation_id
      and auth.uid() in (participant_low, participant_high)
  )
);

create policy "participants view direct message reads"
on public.message_reads for select to authenticated
using (
  exists (
    select 1
    from public.messages
    join public.conversations on conversations.id = messages.conversation_id
    where messages.id = message_reads.message_id
      and auth.uid() in (conversations.participant_low, conversations.participant_high)
  )
);

create policy "users create own direct message reads"
on public.message_reads for insert to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.messages
    join public.conversations on conversations.id = messages.conversation_id
    where messages.id = message_reads.message_id
      and auth.uid() in (conversations.participant_low, conversations.participant_high)
  )
);

revoke all on table public.conversations, public.conversation_members, public.messages, public.message_reads
  from public, anon, authenticated;
grant select on table public.conversations, public.conversation_members to authenticated;
grant select, insert on table public.messages, public.message_reads to authenticated;

revoke all on function public.touch_direct_conversation() from public, anon, authenticated;
revoke all on function public.get_or_create_direct_conversation(uuid) from public, anon;
revoke all on function public.list_direct_conversations() from public, anon;
revoke all on function public.mark_direct_conversation_read(uuid) from public, anon;
revoke all on function public.get_unread_message_count() from public, anon;
grant execute on function public.get_or_create_direct_conversation(uuid) to authenticated;
grant execute on function public.list_direct_conversations() to authenticated;
grant execute on function public.mark_direct_conversation_read(uuid) to authenticated;
grant execute on function public.get_unread_message_count() to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'message_reads'
  ) then
    alter publication supabase_realtime add table public.message_reads;
  end if;
end;
$$;
