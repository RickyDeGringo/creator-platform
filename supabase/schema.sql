-- Creator platform schema
-- Run once in the Supabase SQL editor on an empty project.
--
-- Access model
--   * public.users mirrors auth.users (username + avatar only; email stays in auth).
--   * is_superadmin is set only by the auth trigger for richyfong@gmail.com,
--     or by the database owner. Signed-in users cannot change that column.
--   * Creating a creator page inserts the current user as owner.
--   * Owners and managers share the dashboard.
--   * Paid access lives in subscriptions. Clients cannot insert or update that table.
--   * Redeeming a code and manually granting access go through security-definer functions.
--   * get_page_feed is the public read path. Paywalled bodies, image URLs,
--     uploaded photos, and the goals attached to a post are returned only to
--     page members and to users whose subscription has not expired.
--     Everyone else gets the row with is_locked = true and empty content, so the UI
--     can render a blurred locked card without shipping the post to the browser.
--   * Uploaded photos are stored as WebP in the public post-media bucket.
--     Paths are unguessable. Locked posts never receive those URLs.

create extension if not exists pgcrypto;

create schema if not exists private;

grant usage on schema public to anon, authenticated;
grant usage on schema private to anon, authenticated;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'page_role' and typnamespace = 'public'::regnamespace) then
    create type public.page_role as enum ('owner', 'manager');
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  avatar_url text,
  is_superadmin boolean not null default false,
  created_at timestamptz not null default now(),
  constraint users_username_format check (username ~ '^[a-z0-9_]{3,30}$'),
  constraint users_username_unique unique (username)
);

create table public.creator_pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  display_name text not null,
  bio text,
  cover_image text,
  paypal_link text,
  created_at timestamptz not null default now(),
  constraint creator_pages_slug_unique unique (slug),
  constraint creator_pages_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint creator_pages_display_name_length check (char_length(trim(display_name)) between 1 and 80),
  constraint creator_pages_paypal_link_https check (
    paypal_link is null or paypal_link ~ '^https://'
  )
);

create table public.page_members (
  page_id uuid not null references public.creator_pages (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  role public.page_role not null,
  created_at timestamptz not null default now(),
  primary key (page_id, user_id)
);

create table public.followers (
  page_id uuid not null references public.creator_pages (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (page_id, user_id)
);

create table public.subscriptions (
  page_id uuid not null references public.creator_pages (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  expires_at timestamptz not null,
  primary key (page_id, user_id)
);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.creator_pages (id) on delete cascade,
  content text,
  image_url text,
  is_paywalled boolean not null default false,
  created_at timestamptz not null default now(),
  constraint posts_has_body check (
    (content is not null and char_length(trim(content)) > 0)
    or (image_url is not null and char_length(trim(image_url)) > 0)
  )
);

create table public.access_codes (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.creator_pages (id) on delete cascade,
  code_string text not null,
  duration_days integer not null,
  is_redeemed boolean not null default false,
  redeemed_by_user uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint access_codes_code_unique unique (code_string),
  constraint access_codes_code_format check (code_string ~ '^[A-Z0-9]{8,32}$'),
  constraint access_codes_duration check (duration_days in (7, 30, 90)),
  constraint access_codes_redemption_shape check (
    (is_redeemed = false and redeemed_by_user is null)
    or is_redeemed = true
  )
);

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.creator_pages (id) on delete cascade,
  title text not null,
  description text,
  link text,
  target_amount numeric(12, 2) not null,
  current_amount_raised numeric(12, 2) not null default 0,
  created_at timestamptz not null default now(),
  constraint goals_title_length check (char_length(trim(title)) between 1 and 120),
  constraint goals_target_positive check (target_amount > 0),
  constraint goals_raised_nonnegative check (current_amount_raised >= 0),
  constraint goals_link_https check (
    link is null or (link ~ '^https://' and char_length(link) <= 2000)
  )
);

create table public.post_images (
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

create table public.post_goals (
  post_id uuid not null references public.posts (id) on delete cascade,
  goal_id uuid not null references public.goals (id) on delete cascade,
  sort_order integer not null default 0,
  primary key (post_id, goal_id),
  constraint post_goals_sort check (sort_order between 0 and 7)
);

create index page_members_user_idx on public.page_members (user_id);
create index followers_user_idx on public.followers (user_id);
create index subscriptions_user_idx on public.subscriptions (user_id);
create index posts_page_created_idx on public.posts (page_id, created_at desc);
create index goals_page_created_idx on public.goals (page_id, created_at desc);
create index access_codes_page_created_idx on public.access_codes (page_id, created_at desc);
create index post_images_post_idx on public.post_images (post_id, sort_order);
create index post_goals_post_idx on public.post_goals (post_id, sort_order);
create index post_goals_goal_idx on public.post_goals (goal_id);

-- ---------------------------------------------------------------------------
-- Private helpers. Not exposed by the Data API (schema is not public).
-- Membership checks take no user id argument; they always use auth.uid().
-- ---------------------------------------------------------------------------

create or replace function private.is_page_member(
  p_page_id uuid,
  p_roles public.page_role[] default null
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select exists (
    select 1
    from public.page_members pm
    where pm.page_id = p_page_id
      and pm.user_id = auth.uid()
      and (p_roles is null or pm.role = any (p_roles))
  );
$$;

create or replace function private.has_active_subscription(p_page_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select exists (
    select 1
    from public.subscriptions s
    where s.page_id = p_page_id
      and s.user_id = auth.uid()
      and s.expires_at > now()
  );
$$;

create or replace function private.viewer_has_page_access(p_page_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, private, pg_catalog
as $$
  select
    private.is_page_member(p_page_id, null::public.page_role[])
    or private.has_active_subscription(p_page_id);
$$;

-- Extends an existing unexpired subscription, otherwise starts from now().
create or replace function private.extend_subscription(
  p_page_id uuid,
  p_user_id uuid,
  p_duration_days integer
)
returns timestamptz
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_expires timestamptz;
begin
  if p_duration_days not in (7, 30, 90) then
    raise exception 'invalid_duration' using errcode = '22023';
  end if;

  insert into public.subscriptions (page_id, user_id, expires_at)
  values (
    p_page_id,
    p_user_id,
    now() + make_interval(days => p_duration_days)
  )
  on conflict (page_id, user_id) do update
  set expires_at = greatest(public.subscriptions.expires_at, now())
                   + make_interval(days => p_duration_days)
  returning expires_at into v_expires;

  return v_expires;
end;
$$;

revoke all on function private.extend_subscription(uuid, uuid, integer) from public;
revoke all on function private.extend_subscription(uuid, uuid, integer) from anon, authenticated;

grant execute on function private.is_page_member(uuid, public.page_role[]) to anon, authenticated;
grant execute on function private.has_active_subscription(uuid) to anon, authenticated;
grant execute on function private.viewer_has_page_access(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Auth + page ownership triggers
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_requested text;
  v_username text;
begin
  v_requested := lower(trim(coalesce(new.raw_user_meta_data ->> 'username', '')));

  if v_requested ~ '^[a-z0-9_]{3,30}$' then
    v_username := v_requested;
  else
    v_username := 'user_' || substr(replace(new.id::text, '-', ''), 1, 12);
  end if;

  begin
    insert into public.users (id, username, avatar_url, is_superadmin)
    values (
      new.id,
      v_username,
      new.raw_user_meta_data ->> 'avatar_url',
      lower(coalesce(new.email, '')) = 'richyfong@gmail.com'
    );
  exception
    when unique_violation then
      insert into public.users (id, username, avatar_url, is_superadmin)
      values (
        new.id,
        'user_' || substr(replace(new.id::text, '-', ''), 1, 12),
        new.raw_user_meta_data ->> 'avatar_url',
        lower(coalesce(new.email, '')) = 'richyfong@gmail.com'
      );
  end;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Clients can update username and avatar. The superadmin flag stays put
-- unless the statement runs as the database owner or service role.
create or replace function public.protect_superadmin_flag()
returns trigger
language plpgsql
as $$
declare
  v_role text := current_user;
begin
  if tg_op = 'INSERT' then
    if new.is_superadmin and v_role not in ('postgres', 'supabase_admin', 'service_role') then
      new.is_superadmin := false;
    end if;
    return new;
  end if;

  if new.is_superadmin is distinct from old.is_superadmin
     and v_role not in ('postgres', 'supabase_admin', 'service_role') then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger protect_superadmin_flag
  before insert or update on public.users
  for each row execute function public.protect_superadmin_flag();

create or replace function public.add_page_owner()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  insert into public.page_members (page_id, user_id, role)
  values (new.id, auth.uid(), 'owner');

  return new;
end;
$$;

create trigger creator_pages_add_owner
  after insert on public.creator_pages
  for each row execute function public.add_page_owner();

create or replace function public.protect_access_code()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if new.page_id <> old.page_id
     or new.code_string <> old.code_string
     or new.duration_days <> old.duration_days
     or new.created_at <> old.created_at then
    raise exception 'access_code_immutable' using errcode = '42501';
  end if;

  if old.is_redeemed and (not new.is_redeemed or new.redeemed_by_user is distinct from old.redeemed_by_user) then
    raise exception 'access_code_already_redeemed' using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger access_codes_protect
  before update on public.access_codes
  for each row execute function public.protect_access_code();

create or replace function private.prevent_page_move()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if new.page_id is distinct from old.page_id then
    raise exception 'page_id_immutable' using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function private.prevent_page_move() from public, anon, authenticated;

create trigger posts_page_immutable
  before update on public.posts
  for each row execute function private.prevent_page_move();

create trigger goals_page_immutable
  before update on public.goals
  for each row execute function private.prevent_page_move();

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

create trigger post_images_guard
  before insert on public.post_images
  for each row execute function private.guard_post_image();

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

-- ---------------------------------------------------------------------------
-- RPC used by the app
-- ---------------------------------------------------------------------------

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

create or replace function public.redeem_access_code(p_code text)
returns timestamptz
language plpgsql
security definer
set search_path = public, private, pg_catalog
as $$
declare
  v_code public.access_codes%rowtype;
  v_expires timestamptz;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select *
  into v_code
  from public.access_codes
  where code_string = upper(trim(p_code))
  for update;

  if not found then
    raise exception 'invalid_code' using errcode = 'P0002';
  end if;

  if v_code.is_redeemed then
    raise exception 'code_already_redeemed' using errcode = 'P0001';
  end if;

  update public.access_codes
  set is_redeemed = true,
      redeemed_by_user = auth.uid()
  where id = v_code.id;

  v_expires := private.extend_subscription(v_code.page_id, auth.uid(), v_code.duration_days);
  return v_expires;
end;
$$;

create or replace function public.grant_page_access(
  p_page_id uuid,
  p_username text,
  p_duration_days integer
)
returns timestamptz
language plpgsql
security definer
set search_path = public, private, pg_catalog
as $$
declare
  v_user_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if not private.is_page_member(p_page_id, array['owner', 'manager']::public.page_role[]) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  if p_duration_days not in (7, 30, 90) then
    raise exception 'invalid_duration' using errcode = '22023';
  end if;

  select u.id
  into v_user_id
  from public.users u
  where u.username = lower(trim(p_username));

  if v_user_id is null then
    raise exception 'user_not_found' using errcode = 'P0002';
  end if;

  return private.extend_subscription(p_page_id, v_user_id, p_duration_days);
end;
$$;

create or replace function public.create_access_code(
  p_page_id uuid,
  p_duration_days integer
)
returns text
language plpgsql
security definer
set search_path = public, private, pg_catalog
as $$
declare
  v_code text;
  v_attempt integer := 0;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if not private.is_page_member(p_page_id, array['owner', 'manager']::public.page_role[]) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  if p_duration_days not in (7, 30, 90) then
    raise exception 'invalid_duration' using errcode = '22023';
  end if;

  loop
    v_attempt := v_attempt + 1;
    v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));

    begin
      insert into public.access_codes (page_id, code_string, duration_days)
      values (p_page_id, v_code, p_duration_days);
      return v_code;
    exception
      when unique_violation then
        if v_attempt >= 5 then
          raise exception 'code_generation_failed' using errcode = '23505';
        end if;
    end;
  end loop;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.protect_superadmin_flag() from public, anon, authenticated;
revoke all on function public.add_page_owner() from public, anon, authenticated;
revoke all on function public.protect_access_code() from public, anon, authenticated;

revoke all on function public.get_page_feed(uuid, integer) from public;
grant execute on function public.get_page_feed(uuid, integer) to anon, authenticated;

revoke all on function public.redeem_access_code(text) from public, anon;
grant execute on function public.redeem_access_code(text) to authenticated;

revoke all on function public.grant_page_access(uuid, text, integer) from public, anon;
grant execute on function public.grant_page_access(uuid, text, integer) to authenticated;

revoke all on function public.create_access_code(uuid, integer) from public, anon;
grant execute on function public.create_access_code(uuid, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.users enable row level security;
alter table public.creator_pages enable row level security;
alter table public.page_members enable row level security;
alter table public.followers enable row level security;
alter table public.subscriptions enable row level security;
alter table public.posts enable row level security;
alter table public.access_codes enable row level security;
alter table public.goals enable row level security;
alter table public.post_images enable row level security;
alter table public.post_goals enable row level security;

create policy users_select_public
  on public.users
  for select
  to anon, authenticated
  using (true);

create policy users_insert_own
  on public.users
  for insert
  to authenticated
  with check (id = auth.uid());

create policy users_update_own
  on public.users
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy creator_pages_select_public
  on public.creator_pages
  for select
  to anon, authenticated
  using (true);

create policy creator_pages_insert_authenticated
  on public.creator_pages
  for insert
  to authenticated
  with check (auth.uid() is not null);

create policy creator_pages_update_staff
  on public.creator_pages
  for update
  to authenticated
  using (private.is_page_member(id, array['owner', 'manager']::public.page_role[]))
  with check (private.is_page_member(id, array['owner', 'manager']::public.page_role[]));

create policy creator_pages_delete_owner
  on public.creator_pages
  for delete
  to authenticated
  using (private.is_page_member(id, array['owner']::public.page_role[]));

create policy page_members_select_own_or_staff
  on public.page_members
  for select
  to authenticated
  using (
    user_id = auth.uid()
    or private.is_page_member(page_id, null::public.page_role[])
  );

-- Owners may add managers. The owner row itself is inserted by add_page_owner().
create policy page_members_insert_manager
  on public.page_members
  for insert
  to authenticated
  with check (
    role = 'manager'
    and private.is_page_member(page_id, array['owner']::public.page_role[])
  );

create policy page_members_delete_manager
  on public.page_members
  for delete
  to authenticated
  using (
    role = 'manager'
    and private.is_page_member(page_id, array['owner']::public.page_role[])
  );

create policy followers_select_public
  on public.followers
  for select
  to anon, authenticated
  using (true);

create policy followers_insert_own
  on public.followers
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy followers_delete_own
  on public.followers
  for delete
  to authenticated
  using (user_id = auth.uid());

-- Direct reads. Paywalled rows are visible to staff and active subscribers.
-- The public page should call get_page_feed so locked posts still appear.
create policy posts_select_visible
  on public.posts
  for select
  to anon, authenticated
  using (
    is_paywalled = false
    or private.viewer_has_page_access(page_id)
  );

create policy posts_insert_staff
  on public.posts
  for insert
  to authenticated
  with check (private.is_page_member(page_id, array['owner', 'manager']::public.page_role[]));

create policy posts_update_staff
  on public.posts
  for update
  to authenticated
  using (private.is_page_member(page_id, array['owner', 'manager']::public.page_role[]))
  with check (private.is_page_member(page_id, array['owner', 'manager']::public.page_role[]));

create policy posts_delete_staff
  on public.posts
  for delete
  to authenticated
  using (private.is_page_member(page_id, array['owner', 'manager']::public.page_role[]));

create policy subscriptions_select_own_or_staff
  on public.subscriptions
  for select
  to authenticated
  using (
    user_id = auth.uid()
    or private.is_page_member(page_id, array['owner', 'manager']::public.page_role[])
  );

create policy access_codes_select_staff
  on public.access_codes
  for select
  to authenticated
  using (private.is_page_member(page_id, array['owner', 'manager']::public.page_role[]));

create policy access_codes_delete_unredeemed
  on public.access_codes
  for delete
  to authenticated
  using (
    is_redeemed = false
    and private.is_page_member(page_id, array['owner', 'manager']::public.page_role[])
  );

create policy goals_select_public
  on public.goals
  for select
  to anon, authenticated
  using (true);

create policy goals_insert_staff
  on public.goals
  for insert
  to authenticated
  with check (private.is_page_member(page_id, array['owner', 'manager']::public.page_role[]));

create policy goals_update_staff
  on public.goals
  for update
  to authenticated
  using (private.is_page_member(page_id, array['owner', 'manager']::public.page_role[]))
  with check (private.is_page_member(page_id, array['owner', 'manager']::public.page_role[]));

create policy goals_delete_staff
  on public.goals
  for delete
  to authenticated
  using (private.is_page_member(page_id, array['owner', 'manager']::public.page_role[]));

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

create policy post_images_insert_staff
  on public.post_images
  for insert
  to authenticated
  with check (private.is_page_member(page_id, array['owner', 'manager']::public.page_role[]));

create policy post_images_delete_staff
  on public.post_images
  for delete
  to authenticated
  using (private.is_page_member(page_id, array['owner', 'manager']::public.page_role[]));

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

-- ---------------------------------------------------------------------------
-- Grants. Subscriptions and access-code writes stay on the security-definer RPCs.
-- ---------------------------------------------------------------------------

grant select on public.users to anon, authenticated;
grant insert (id, username, avatar_url) on public.users to authenticated;
grant update (username, avatar_url) on public.users to authenticated;

grant select on public.creator_pages to anon, authenticated;
grant insert, update, delete on public.creator_pages to authenticated;

grant select, insert, delete on public.page_members to authenticated;

grant select on public.followers to anon, authenticated;
grant insert, delete on public.followers to authenticated;

grant select on public.posts to anon, authenticated;
grant insert, update, delete on public.posts to authenticated;

grant select, delete on public.access_codes to authenticated;

grant select on public.subscriptions to authenticated;

grant select on public.goals to anon, authenticated;
grant insert, update, delete on public.goals to authenticated;

grant select on public.post_images to anon, authenticated;
grant insert, delete on public.post_images to authenticated;

grant select on public.post_goals to anon, authenticated;
grant insert, delete on public.post_goals to authenticated;

revoke insert, update, delete on public.subscriptions from anon, authenticated;
revoke insert, update on public.access_codes from anon, authenticated;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant usage on schema private to service_role;
    grant all on all tables in schema public to service_role;
    grant all on all sequences in schema public to service_role;
    grant execute on all functions in schema public to service_role;
    grant execute on all functions in schema private to service_role;
  end if;
end
$$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('post-media', 'post-media', true, 5242880, array['image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy post_media_public_read
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'post-media');

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
