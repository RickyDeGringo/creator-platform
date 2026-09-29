-- Home feed for people you follow, plus per-post seen state for unread badges.
-- Locked bodies stay on the server. is_locked is true when the viewer has not paid.

create table if not exists public.post_views (
  user_id uuid not null references public.users (id) on delete cascade,
  post_id uuid not null references public.posts (id) on delete cascade,
  seen_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

alter table public.post_views enable row level security;

drop policy if exists post_views_select_own on public.post_views;
create policy post_views_select_own
  on public.post_views
  for select
  to authenticated
  using (user_id = auth.uid());

revoke insert, update, delete on public.post_views from anon, authenticated;
grant select on public.post_views to authenticated;

create or replace function private.page_avatar_url(p_page_id uuid)
returns text
language sql
stable
set search_path = public, pg_catalog
as $$
  select coalesce(
    (
      select ci.url
      from public.cover_images ci
      where ci.page_id = p_page_id
      order by ci.sort_order
      limit 1
    ),
    (
      select c.cover_image
      from public.creator_pages c
      where c.id = p_page_id
        and c.cover_image ~ '^https://'
    )
  );
$$;

revoke all on function private.page_avatar_url(uuid) from public, anon, authenticated;

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

create or replace function public.get_following_feed(p_limit integer default 40)
returns table (
  id uuid,
  page_id uuid,
  slug text,
  display_name text,
  avatar_url text,
  paypal_link text,
  title text,
  content text,
  image_url text,
  images jsonb,
  goals jsonb,
  is_paywalled boolean,
  is_locked boolean,
  image_count integer,
  created_at timestamptz,
  is_unseen boolean
)
language sql
stable
security definer
set search_path = public, private, pg_catalog
as $$
  select
    p.id,
    p.page_id,
    c.slug,
    c.display_name,
    private.page_avatar_url(c.id) as avatar_url,
    c.paypal_link,
    case
      when p.is_paywalled = false or private.viewer_has_page_access(p.page_id)
        then p.title
      else null
    end as title,
    case
      when p.is_paywalled = false or private.viewer_has_page_access(p.page_id)
        then p.content
      else null
    end as content,
    case
      when p.is_paywalled = false or private.viewer_has_page_access(p.page_id)
        then p.image_url
      else null
    end as image_url,
    case
      when p.is_paywalled and not private.viewer_has_page_access(p.page_id) then '[]'::jsonb
      else coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'url', i.url,
              'width', i.width,
              'height', i.height
            )
            order by i.sort_order
          )
          from public.post_images i
          where i.post_id = p.id
        ),
        case
          when p.image_url is not null then jsonb_build_array(
            jsonb_build_object('url', p.image_url, 'width', null, 'height', null)
          )
          else '[]'::jsonb
        end
      )
    end as images,
    case
      when p.is_paywalled and not private.viewer_has_page_access(p.page_id) then '[]'::jsonb
      else coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'id', g.id,
              'title', g.title,
              'link', g.link,
              'image_url', g.image_url,
              'image_width', g.image_width,
              'image_height', g.image_height,
              'target_amount', g.target_amount,
              'current_amount_raised', g.current_amount_raised
            )
            order by pg.sort_order
          )
          from public.post_goals pg
          join public.goals g on g.id = pg.goal_id
          where pg.post_id = p.id
        ),
        '[]'::jsonb
      )
    end as goals,
    p.is_paywalled,
    (p.is_paywalled and not private.viewer_has_page_access(p.page_id)) as is_locked,
    case
      when exists (select 1 from public.post_images i where i.post_id = p.id)
        then (select count(*)::integer from public.post_images i where i.post_id = p.id)
      when p.image_url is not null then 1
      else 0
    end as image_count,
    p.created_at,
    not exists (
      select 1
      from public.post_views v
      where v.post_id = p.id
        and v.user_id = auth.uid()
    ) as is_unseen
  from public.posts p
  join public.followers f on f.page_id = p.page_id and f.user_id = auth.uid()
  join public.creator_pages c on c.id = p.page_id
  where auth.uid() is not null
    and p.is_draft = false
  order by p.created_at desc
  limit least(greatest(coalesce(p_limit, 40), 1), 60);
$$;

revoke all on function public.get_following_feed(integer) from public, anon;
grant execute on function public.get_following_feed(integer) to authenticated;

create or replace function public.mark_posts_seen(p_post_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if auth.uid() is null or p_post_ids is null then
    return;
  end if;

  insert into public.post_views (user_id, post_id)
  select auth.uid(), p.id
  from public.posts p
  join public.followers f on f.page_id = p.page_id and f.user_id = auth.uid()
  where p.id = any (p_post_ids[1:40])
    and p.is_draft = false
  on conflict (user_id, post_id) do nothing;
end;
$$;

revoke all on function public.mark_posts_seen(uuid[]) from public, anon;
grant execute on function public.mark_posts_seen(uuid[]) to authenticated;
