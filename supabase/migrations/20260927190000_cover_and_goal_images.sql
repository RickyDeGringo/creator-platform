alter table public.goals
  add column image_url text,
  add column image_storage_path text,
  add column image_width integer,
  add column image_height integer;

alter table public.goals
  add constraint goals_image_https check (
    image_url is null or (image_url ~ '^https://' and char_length(image_url) <= 2000)
  ),
  add constraint goals_image_dimensions check (
    (image_width is null and image_height is null)
    or (image_width between 1 and 4000 and image_height between 1 and 4000)
  ),
  add constraint goals_image_path_shape check (
    image_storage_path is null
    or image_storage_path ~ '^[0-9a-f-]{36}/goals/[0-9a-f-]{36}\.webp$'
  );

create table public.cover_images (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.creator_pages (id) on delete cascade,
  url text not null,
  storage_path text,
  width integer,
  height integer,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint cover_images_url_https check (url ~ '^https://' and char_length(url) <= 2000),
  constraint cover_images_dimensions check (
    (width is null and height is null)
    or (width between 1 and 4000 and height between 1 and 4000)
  ),
  constraint cover_images_sort check (sort_order between 0 and 4),
  constraint cover_images_path_shape check (
    storage_path is null
    or storage_path ~ '^[0-9a-f-]{36}/cover/[0-9a-f-]{36}\.webp$'
  )
);

create index cover_images_page_idx on public.cover_images (page_id, sort_order);

insert into public.cover_images (page_id, url, sort_order)
select id, cover_image, 0
from public.creator_pages
where cover_image is not null
  and cover_image ~ '^https://'
  and char_length(cover_image) <= 2000;

create or replace function private.guard_cover_image()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_count integer;
begin
  if new.storage_path is not null
     and new.storage_path !~ ('^' || new.page_id::text || '/cover/[0-9a-f-]{36}\.webp$') then
    raise exception 'invalid_image_path' using errcode = '42501';
  end if;

  select count(*) into v_count
  from public.cover_images
  where page_id = new.page_id;

  if v_count >= 5 then
    raise exception 'too_many_covers' using errcode = '54000';
  end if;

  return new;
end;
$$;

create trigger cover_images_guard
  before insert on public.cover_images
  for each row execute function private.guard_cover_image();

revoke all on function private.guard_cover_image() from public, anon, authenticated;

alter table public.cover_images enable row level security;

create policy cover_images_select_public
  on public.cover_images
  for select
  to anon, authenticated
  using (true);

create policy cover_images_insert_staff
  on public.cover_images
  for insert
  to authenticated
  with check (private.is_page_member(page_id, array['owner', 'manager']::public.page_role[]));

create policy cover_images_delete_staff
  on public.cover_images
  for delete
  to authenticated
  using (private.is_page_member(page_id, array['owner', 'manager']::public.page_role[]));

grant select on public.cover_images to anon, authenticated;
grant insert, delete on public.cover_images to authenticated;

create or replace function public.get_page_feed(
  p_page_id uuid,
  p_limit integer default 50
)
returns table (
  id uuid,
  page_id uuid,
  content text,
  image_url text,
  images jsonb,
  goals jsonb,
  is_paywalled boolean,
  is_locked boolean,
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
    p.created_at
  from public.posts p
  where p.page_id = p_page_id
  order by p.created_at desc
  limit least(greatest(coalesce(p_limit, 50), 1), 100);
$$;
