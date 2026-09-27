-- Owners add an existing account as a manager by the email on auth.users.
-- Email is not copied into public.users.

create or replace function public.add_page_manager(
  p_page_id uuid,
  p_email text
)
returns text
language plpgsql
security definer
set search_path = public, private, pg_catalog
as $$
declare
  v_email text;
  v_user_id uuid;
  v_username text;
  v_role public.page_role;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if not private.is_page_member(p_page_id, array['owner']::public.page_role[]) then
    raise exception 'owner_only' using errcode = '42501';
  end if;

  v_email := lower(trim(p_email));
  if v_email is null
     or char_length(v_email) > 320
     or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'invalid_email' using errcode = '22023';
  end if;

  select id
  into v_user_id
  from auth.users
  where lower(email) = v_email;

  if v_user_id is null then
    raise exception 'email_not_found' using errcode = 'P0002';
  end if;

  select username
  into v_username
  from public.users
  where id = v_user_id;

  if v_username is null then
    raise exception 'profile_missing' using errcode = 'P0002';
  end if;

  select role
  into v_role
  from public.page_members
  where page_id = p_page_id
    and user_id = v_user_id;

  if v_role = 'owner' then
    raise exception 'already_owner' using errcode = 'P0001';
  end if;

  if v_role = 'manager' then
    raise exception 'already_manager' using errcode = 'P0001';
  end if;

  begin
    insert into public.page_members (page_id, user_id, role)
    values (p_page_id, v_user_id, 'manager');
  exception
    when unique_violation then
      raise exception 'already_manager' using errcode = 'P0001';
  end;

  return v_username;
end;
$$;

revoke all on function public.add_page_manager(uuid, text) from public, anon;
grant execute on function public.add_page_manager(uuid, text) to authenticated;
