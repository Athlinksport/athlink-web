-- CASE expressions containing only string literals resolve to text in PL/pgSQL.
-- Cast join outcomes explicitly so they can be assigned to enum columns.
create or replace function public.join_group(target_group uuid)
returns public.group_members
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  target_privacy public.group_privacy;
  existing public.group_members;
  result public.group_members;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select privacy into target_privacy
  from public.groups
  where id = target_group;

  if not found then
    raise exception 'Group not found';
  end if;

  select * into existing
  from public.group_members
  where group_id = target_group
    and user_id = auth.uid();

  if existing.status = 'banned' then
    raise exception 'You cannot join this group' using errcode = '42501';
  end if;

  insert into public.group_members(group_id, user_id, role, status)
  values (
    target_group,
    auth.uid(),
    'member'::public.group_role,
    case
      when target_privacy = 'public' then 'active'::public.group_membership_status
      else 'pending'::public.group_membership_status
    end
  )
  on conflict (group_id, user_id) do update set
    status = case
      when group_members.status = 'banned' then group_members.status
      else excluded.status
    end,
    role = case
      when group_members.role = 'owner' then group_members.role
      else 'member'::public.group_role
    end,
    joined_at = case
      when excluded.status = 'active' then now()
      else group_members.joined_at
    end
  returning * into result;

  return result;
end
$$;

-- CREATE OR REPLACE preserves the owner and ACL, and these statements make the
-- intended callable roles explicit for fresh and existing deployments.
revoke all on function public.join_group(uuid) from public, anon;
grant execute on function public.join_group(uuid) to authenticated;
