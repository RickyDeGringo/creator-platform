-- Uploaded post photos, per-goal shop links, and goals attached to posts.
-- Uploaded files live in the public post-media bucket as unguessable WebP paths.
-- get_page_feed still withholds photo URLs and attached goals on locked posts.

alter table public.goals
  add column if not exists link text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'goals_link_https') then
    alter table public.goals
      add constraint goals_link_https check (
        link is null or (link ~ '^https://' and char_length(link) <= 2000)
      );
  end if;
end
$$;

create table if not exists public.post_images (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  page_id uuid not null references public.creator_pages (id) on delete cascade,
  url text not null,
  storage_path text,
  width integer,
  height integer,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint post_images_url_https check (url ~ '^https://' and char_length(url) <= 2000),
  constraint post_images_dimensions check (
    (width is null and height is null)
    or (width between 1 and 4000 and height between 1 and 4000)
  ),
  constraint post_images_sort check (sort_order between 0 and 7),
  constraint post_images_path_shape check (
    storage_path is null
    or storage_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.webp$'
  )
);

create table if not exists public.post_goals (
  post_id uuid not null references public.posts (id) on delete cascade,
  goal_id uuid not null references public.goals (id) on delete cascade,
  sort_order integer not null default 0,
  primary key (post_id, goal_id),
  constraint post_goals_sort check (sort_order between 0 and 7)
);

create index if not exists post_images_post_idx on public.post_images (post_id, sort_order);
create index if not exists post_goals_post_idx on public.post_goals (post_id, sort_order);
create index if not exists post_goals_goal_idx on public.post_goals (goal_id);

create or replace function private.guard_post_image()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_page_id uuid;
  v_count integer;
begin
  select p.page_id into v_page_id
  from public.posts p
  where p.id = new.post_id;

  if v_page_id is null or v_page_id is distinct from new.page_id then
    raise exception 'image_page_mismatch' using errcode = '42501';
  end if;

  if new.storage_path is not null
     and new.storage_path !~ ('^' || new.page_id::text || '/[0-9a-f-]{36}\.webp$') then
    raise exception 'invalid_image_path' using errcode = '42501';
  end if;

  select count(*) into v_count
  from public.post_images
  where post_id = new.post_id;

  if v_count >= 5 then
    raise exception 'too_many_images' using errcode = '54000';
  end if;

  return new;
end;
$$;

create or replace function private.guard_post_goal()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_count integer;
begin
  if not exists (
    select 1
    from public.posts p
    join public.goals g on g.id = new.goal_id and g.page_id = p.page_id
    where p.id = new.post_id
  ) then
    raise exception 'goal_page_mismatch' using errcode = '42501';
  end if;

  select count(*) into v_count
  from public.post_goals
  where post_id = new.post_id;

  if v_count >= 6 then
    raise exception 'too_many_goals' using errcode = '54000';
  end if;

  return new;
end;
$$;

drop trigger if exists post_images_guard on public.post_images;
create trigger post_images_guard
  before insert on public.post_images
  for each row execute function private.guard_post_image();

drop trigger if exists post_goals_guard on public.post_goals;
create trigger post_goals_guard
  before insert on public.post_goals
  for each row execute function private.guard_post_goal();

revoke all on function private.guard_post_image() from public, anon, authenticated;
revoke all on function private.guard_post_goal() from public, anon, authenticated;

create or replace function private.storage_page_id(object_name text)
returns uuid
language sql
stable
set search_path = pg_catalog, storage
as $$
  select case
    when (storage.foldername(object_name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then (storage.foldername(object_name))[1]::uuid
    else null
  end;
$$;

grant execute on function private.storage_page_id(text) to anon, authenticated;

drop function if exists public.get_page_feed(uuid, integer);

create function public.get_page_feed(
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

revoke all on function public.get_page_feed(uuid, integer) from public;
grant execute on function public.get_page_feed(uuid, integer) to anon, authenticated;

alter table public.post_images enable row level security;
alter table public.post_goals enable row level security;

drop policy if exists post_images_select_visible on public.post_images;
create policy post_images_select_visible
  on public.post_images
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.posts p
      where p.id = post_id
        and (
          p.is_paywalled = false
          or private.viewer_has_page_access(p.page_id)
        )
    )
  );

drop policy if exists post_images_insert_staff on public.post_images;
create policy post_images_insert_staff
  on public.post_images
  for insert
  to authenticated
  with check (private.is_page_member(page_id, array['owner', 'manager']::public.page_role[]));

drop policy if exists post_images_delete_staff on public.post_images;
create policy post_images_delete_staff
  on public.post_images
  for delete
  to authenticated
  using (private.is_page_member(page_id, array['owner', 'manager']::public.page_role[]));

drop policy if exists post_goals_select_visible on public.post_goals;
create policy post_goals_select_visible
  on public.post_goals
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.posts p
      where p.id = post_id
        and (
          p.is_paywalled = false
          or private.viewer_has_page_access(p.page_id)
        )
    )
  );

drop policy if exists post_goals_insert_staff on public.post_goals;
create policy post_goals_insert_staff
  on public.post_goals
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.posts p
      where p.id = post_id
        and private.is_page_member(p.page_id, array['owner', 'manager']::public.page_role[])
    )
  );

drop policy if exists post_goals_delete_staff on public.post_goals;
create policy post_goals_delete_staff
  on public.post_goals
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.posts p
      where p.id = post_id
        and private.is_page_member(p.page_id, array['owner', 'manager']::public.page_role[])
    )
  );

grant select on public.post_images to anon, authenticated;
grant insert, delete on public.post_images to authenticated;
grant select on public.post_goals to anon, authenticated;
grant insert, delete on public.post_goals to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('post-media', 'post-media', true, 5242880, array['image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists post_media_public_read on storage.objects;
create policy post_media_public_read
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'post-media');

drop policy if exists post_media_staff_insert on storage.objects;
create policy post_media_staff_insert
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'post-media'
    and private.is_page_member(
      private.storage_page_id(name),
      array['owner', 'manager']::public.page_role[]
    )
  );

drop policy if exists post_media_staff_delete on storage.objects;
create policy post_media_staff_delete
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'post-media'
    and private.is_page_member(
      private.storage_page_id(name),
      array['owner', 'manager']::public.page_role[]
    )
  );
