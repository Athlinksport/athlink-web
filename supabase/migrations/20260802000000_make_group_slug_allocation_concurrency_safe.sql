-- Allocate group slugs inside the insert transaction. The unique constraint is
-- the final arbiter when concurrent requests choose the same candidate.
create or replace function public.create_group(
  group_name text,
  group_description text,
  group_sport text,
  group_country text,
  group_city text default null,
  group_privacy public.group_privacy default 'public',
  group_avatar_url text default null,
  group_cover_image_url text default null
)
returns public.groups
language plpgsql
security definer
set search_path = public
as $$
declare
  created public.groups;
  base_slug text;
  candidate_slug text;
  suffix integer := 1;
  attempt integer := 0;
  max_attempts constant integer := 100;
  violated_constraint text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  base_slug := trim(
    both '-' from regexp_replace(
      lower(unaccent(group_name)),
      '[^a-z0-9]+',
      '-',
      'g'
    )
  );
  if base_slug = '' then
    base_slug := 'group';
  end if;
  base_slug := left(base_slug, 88);

  loop
    attempt := attempt + 1;
    candidate_slug := case
      when suffix = 1 then base_slug
      else base_slug || '-' || suffix::text
    end;

    begin
      insert into public.groups(
        name,
        slug,
        description,
        sport,
        country,
        city,
        privacy,
        avatar_url,
        cover_image_url,
        owner_id
      )
      values (
        btrim(group_name),
        candidate_slug,
        btrim(group_description),
        btrim(group_sport),
        btrim(group_country),
        nullif(btrim(group_city), ''),
        group_privacy,
        group_avatar_url,
        group_cover_image_url,
        auth.uid()
      )
      returning * into created;

      exit;
    exception
      when unique_violation then
        get stacked diagnostics violated_constraint = constraint_name;
        if violated_constraint <> 'groups_slug_key' then
          raise;
        end if;
        if attempt >= max_attempts then
          raise exception using
            errcode = 'P0001',
            message = 'Unable to allocate a unique group slug';
        end if;
        suffix := suffix + 1;
    end;
  end loop;

  insert into public.group_members(group_id, user_id, role, status)
  values (
    created.id,
    auth.uid(),
    'owner'::public.group_role,
    'active'::public.group_membership_status
  );

  return created;
end
$$;

revoke all on function
  public.create_group(text,text,text,text,text,public.group_privacy,text,text)
from public, anon;

grant execute on function
  public.create_group(text,text,text,text,text,public.group_privacy,text,text)
to authenticated;
