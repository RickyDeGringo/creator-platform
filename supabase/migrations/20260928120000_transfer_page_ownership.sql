-- One owner per page. Ownership moves only from the current owner to a manager,
-- and the previous owner stays on the page as a manager.

create unique index if not exists page_members_one_owner
  on public.page_members (page_id)
  where role = 'owner';

create or replace function public.transfer_page_ownership(
  p_page_id uuid,
  p_user_id uuid
)
returns text
language plpgsql
security definer
set search_path = public, private, pg_catalog
as $$
declare
  v_username text;
  v_owner uuid;
  v_target_role public.page_role;
  v_updated integer;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if p_user_id is null or p_user_id = auth.uid() then
    raise exception 'not_a_manager' using errcode = '42501';
  end if;

  select user_id
  into v_owner
  from public.page_members
  where page_id = p_page_id
    and role = 'owner'
  for update;

  if v_owner is distinct from auth.uid() then
    raise exception 'transfer_forbidden' using errcode = '42501';
  end if;

  select role
  into v_target_role
  from public.page_members
  where page_id = p_page_id
    and user_id = p_user_id
  for update;

  if v_target_role is distinct from 'manager'::public.page_role then
    raise exception 'not_a_manager' using errcode = '42501';
  end if;

  select username
  into v_username
  from public.users
  where id = p_user_id;

  if v_username is null then
    raise exception 'profile_missing' using errcode = 'P0002';
  end if;

  update public.page_members
  set role = case user_id
    when auth.uid() then 'manager'::public.page_role
    else 'owner'::public.page_role
  end
  where page_id = p_page_id
    and user_id in (auth.uid(), p_user_id);

  get diagnostics v_updated = row_count;
  if v_updated <> 2 then
    raise exception 'not_a_manager' using errcode = '42501';
  end if;

  return v_username;
end;
$$;

revoke all on function public.transfer_page_ownership(uuid, uuid) from public, anon;
grant execute on function public.transfer_page_ownership(uuid, uuid) to authenticated;
