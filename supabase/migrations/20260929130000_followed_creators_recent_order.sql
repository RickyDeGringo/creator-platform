-- Order followed-creator avatars by latest published post, newest first.

create or replace function public.get_followed_creators()
returns table (
  id uuid,
  slug text,
  display_name text,
  avatar_url text,
  unseen_count integer
)
language sql
stable
security definer
set search_path = public, private, pg_catalog
as $$
  select
    c.id,
    c.slug,
    c.display_name,
    private.page_avatar_url(c.id) as avatar_url,
    (
      select count(*)::integer
      from public.posts p
      where p.page_id = c.id
        and p.is_draft = false
        and not exists (
          select 1
          from public.post_views v
          where v.post_id = p.id
            and v.user_id = auth.uid()
        )
    ) as unseen_count
  from public.followers f
  join public.creator_pages c on c.id = f.page_id
  where f.user_id = auth.uid()
  order by (
    select max(p.created_at)
    from public.posts p
    where p.page_id = c.id
      and p.is_draft = false
  ) desc nulls last,
  c.display_name asc;
$$;

revoke all on function public.get_followed_creators() from public, anon;
grant execute on function public.get_followed_creators() to authenticated;
