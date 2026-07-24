create or replace function public.get_unread_message_count()
returns bigint
language sql
stable
security invoker
set search_path = ''
as $$
  select count(*)::bigint
  from public.messages as message
  where message.sender_id <> (select auth.uid())
    and exists (
      select 1
      from public.conversation_members as member
      where member.conversation_id = message.conversation_id
        and member.user_id = (select auth.uid())
    )
    and not exists (
      select 1
      from public.message_reads as message_read
      where message_read.message_id = message.id
        and message_read.user_id = (select auth.uid())
    );
$$;

revoke all on function public.get_unread_message_count() from public;
revoke all on function public.get_unread_message_count() from anon;
grant execute on function public.get_unread_message_count() to authenticated;
