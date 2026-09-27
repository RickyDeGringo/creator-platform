-- Public read of the owner and managers on a page. Usernames only.

create or replace function public.list_page_staff(p_page_id uuid)
returns table (username text, role public.page_role)
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select u.username, pm.role
  from public.page_members pm
  join public.users u on u.id = pm.user_id
  where pm.page_id = p_page_id
  order by case pm.role when 'owner' then 0 else 1 end, u.username;
$$;

revoke all on function public.list_page_staff(uuid) from public;
grant execute on function public.list_page_staff(uuid) to anon, authenticated;
