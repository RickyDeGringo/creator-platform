-- Post titles, and drafts that stay off the public page until published.

alter table public.posts
  add column if not exists title text;

alter table public.posts
  add column if not exists is_draft boolean not null default false;

alter table public.posts drop constraint if exists posts_title_length;
alter table public.posts
  add constraint posts_title_length
  check (title is null or char_length(trim(title)) between 1 and 120);

alter table public.posts drop constraint if exists posts_has_body;
alter table public.posts
  add constraint posts_has_body
  check (
    (title is not null and char_length(trim(title)) > 0)
    or (content is not null and char_length(trim(content)) > 0)
    or (image_url is not null and char_length(trim(image_url)) > 0)
  );

drop function if exists public.get_page_feed(uuid, integer);

create function public.get_page_feed(
  p_page_id uuid,
  p_limit integer default 50
)
returns table (
  id uuid,
  page_id uuid,
  title text,
  content text,
  image_url text,
  images jsonb,
  goals jsonb,
  is_paywalled boolean,
  is_locked boolean,
  image_count integer,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public, private, pg_catalog
as $$
  select
    p.id,
    p.page_id,
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
    p.created_at
  from public.posts p
  where p.page_id = p_page_id
    and p.is_draft = false
  order by p.created_at desc
  limit least(greatest(coalesce(p_limit, 50), 1), 100);
$$;

revoke all on function public.get_page_feed(uuid, integer) from public;
grant execute on function public.get_page_feed(uuid, integer) to anon, authenticated;

drop policy if exists posts_select_visible on public.posts;
create policy posts_select_visible
  on public.posts
  for select
  to anon, authenticated
  using (
    private.is_page_member(page_id, array['owner', 'manager']::public.page_role[])
    or (
      is_draft = false
      and (
        is_paywalled = false
        or private.viewer_has_page_access(page_id)
      )
    )
  );
