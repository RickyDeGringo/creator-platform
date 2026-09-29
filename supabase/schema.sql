-- Creator platform schema
-- Run once in the Supabase SQL editor on an empty project.
--
-- Access model
--   * public.users mirrors auth.users (username + avatar only; email stays in auth).
--   * is_superadmin is set only by the auth trigger for richyfong@gmail.com,
--     or by the database owner. Signed-in users cannot change that column.
--   * Creating a creator page inserts the current user as owner.
--   * Owners and managers share the dashboard.
--   * palette and font are named design presets on the public page.
--   * links and icon_set are the public profile buttons. icon_set picks
--     logos, colour, line, bold, or letters.
--   * Owners add a manager with add_page_manager. The email must already
--     belong to an account; email stays in auth.users.
--   * Owners hand the page to a manager with transfer_page_ownership.
--     The previous owner becomes a manager. A page has one owner.
--   * list_page_staff is the public read of owner and manager usernames.
--   * Paid access lives in subscriptions. Clients cannot insert or update that table.
--   * Redeeming a code and manually granting access go through security-definer functions.
--   * get_page_feed is the public read path. Paywalled bodies, image URLs,
--     uploaded photos, and the goals attached to a post are returned only to
--     page members and to users whose subscription has not expired.
--     Everyone else gets the row with is_locked = true and empty content, so the UI
--     can render a blurred locked card without shipping the post to the browser.
--     image_count is still returned, so a locked photo can appear as a blurred
--     lock in the post strip without its URL.
--   * get_following_feed is the signed-in home feed: published posts from pages
--     the viewer follows, newest first, with the same lock stripping.
--     get_followed_creators counts posts that have no post_views row.
--     mark_posts_seen records those views. Clients cannot insert post_views.
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
  tiktok_url text,
  facebook_url text,
  x_url text,
  instagram_url text,
  is_superadmin boolean not null default false,
  created_at timestamptz not null default now(),
  constraint users_username_format check (username ~ '^[a-z0-9_]{3,30}$'),
  constraint users_username_unique unique (username),
  constraint users_tiktok_https check (
    tiktok_url is null or (tiktok_url ~ '^https://' and char_length(tiktok_url) <= 200)
  ),
  constraint users_facebook_https check (
    facebook_url is null or (facebook_url ~ '^https://' and char_length(facebook_url) <= 200)
  ),
  constraint users_x_https check (
    x_url is null or (x_url ~ '^https://' and char_length(x_url) <= 200)
  ),
  constraint users_instagram_https check (
    instagram_url is null or (instagram_url ~ '^https://' and char_length(instagram_url) <= 200)
  )
);

create or replace function public.page_links_ok(links jsonb)
returns boolean
language sql
immutable
as $$
  select
    jsonb_typeof(links) = 'object'
    and not exists (
      select 1
      from jsonb_each_text(links) as item(key, value)
      where item.key not in (
          'website', 'email', 'facebook', 'instagram', 'x', 'tiktok', 'youtube', 'twitch', 'kick',
          'discord', 'snapchat', 'whatsapp', 'telegram', 'threads', 'bluesky', 'linkedin', 'pinterest',
          'reddit', 'spotify', 'soundcloud', 'applemusic', 'bandcamp', 'patreon', 'kofi', 'onlyfans',
          'fansly', 'amazon'
        )
        or char_length(item.value) < 1
        or char_length(item.value) > 500
        or (
          case
            when item.key = 'email' then item.value !~ '^mailto:[^[:space:]]+@[^[:space:]]+$'
            else item.value !~ '^https://[^[:space:]]+$'
          end
        )
    );
$$;

revoke all on function public.page_links_ok(jsonb) from public;

create or replace function public.page_links_order_ok(link_order text[])
returns boolean
language sql
immutable
as $$
  select
    link_order is not null
    and not exists (
      select 1
      from unnest(link_order) as item(id)
      where item.id not in (
          'website', 'email', 'facebook', 'instagram', 'x', 'tiktok', 'youtube', 'twitch', 'kick',
          'discord', 'snapchat', 'whatsapp', 'telegram', 'threads', 'bluesky', 'linkedin', 'pinterest',
          'reddit', 'spotify', 'soundcloud', 'applemusic', 'bandcamp', 'patreon', 'kofi', 'onlyfans',
          'fansly', 'amazon'
        )
    )
    and coalesce(array_length(link_order, 1), 0) = (
      select count(distinct item.id)
      from unnest(link_order) as item(id)
    );
$$;

revoke all on function public.page_links_order_ok(text[]) from public;

create table public.creator_pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  display_name text not null,
  bio text,
  cover_image text,
  paypal_link text,
  palette text not null default 'ember',
  font text not null default 'editorial',
  icon_set text not null default 'brand',
  links jsonb not null default '{}'::jsonb,
  links_order text[] not null default '{}',
  created_at timestamptz not null default now(),
  constraint creator_pages_slug_unique unique (slug),
  constraint creator_pages_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint creator_pages_display_name_length check (char_length(trim(display_name)) between 1 and 80),
  constraint creator_pages_paypal_link_https check (
    paypal_link is null or paypal_link ~ '^https://'
  ),
  constraint creator_pages_palette_known check (
    palette in ('ember', 'ink', 'paper', 'grove', 'tide', 'plum', 'dune', 'midnight')
  ),
  constraint creator_pages_font_known check (
    font in ('editorial', 'newsroom', 'story', 'gallery', 'studio', 'letterpress')
  ),
  constraint creator_pages_icon_set_known check (
    icon_set in ('brand', 'colour', 'line', 'solid', 'letters')
  ),
  constraint creator_pages_links_shape check (public.page_links_ok(links)),
  constraint creator_pages_links_order_shape check (public.page_links_order_ok(links_order))
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
  title text,
  content text,
  image_url text,
  is_paywalled boolean not null default false,
  is_draft boolean not null default false,
  created_at timestamptz not null default now(),
  constraint posts_title_length check (title is null or char_length(trim(title)) between 1 and 120),
  constraint posts_has_body check (
    (title is not null and char_length(trim(title)) > 0)
    or (content is not null and char_length(trim(content)) > 0)
    or (image_url is not null and char_length(trim(image_url)) > 0)
  )
);

create table public.post_views (
  user_id uuid not null references public.users (id) on delete cascade,
  post_id uuid not null references public.posts (id) on delete cascade,
  seen_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  page_id uuid not null references public.creator_pages (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  parent_id uuid references public.comments (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  constraint comments_body_length check (char_length(trim(body)) between 1 and 1000)
);

create table public.post_reactions (
  post_id uuid not null references public.posts (id) on delete cascade,
  page_id uuid not null references public.creator_pages (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id, emoji),
  constraint post_reactions_emoji check (
    emoji in ('heart', 'fire', 'laugh', 'clap', 'wow', 'sparkle')
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

create table public.wishlist_categories (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.creator_pages (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  constraint wishlist_categories_name_length check (char_length(trim(name)) between 1 and 40)
);

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.creator_pages (id) on delete cascade,
  title text not null,
  description text,
  link text,
  image_url text,
  image_storage_path text,
  image_width integer,
  image_height integer,
  target_amount numeric(12, 2) not null,
  current_amount_raised numeric(12, 2) not null default 0,
  created_at timestamptz not null default now(),
  constraint goals_title_length check (char_length(trim(title)) between 1 and 120),
  constraint goals_target_positive check (target_amount > 0),
  constraint goals_raised_nonnegative check (current_amount_raised >= 0),
  constraint goals_link_https check (
    link is null or (link ~ '^https://' and char_length(link) <= 2000)
  ),
  constraint goals_image_https check (
    image_url is null or (image_url ~ '^https://' and char_length(image_url) <= 2000)
  ),
  constraint goals_image_dimensions check (
    (image_width is null and image_height is null)
    or (image_width between 1 and 4000 and image_height between 1 and 4000)
  ),
  constraint goals_image_path_shape check (
    image_storage_path is null
    or image_storage_path ~ '^[0-9a-f-]{36}/goals/[0-9a-f-]{36}\.webp$'
  )
);

create table public.goal_categories (
  goal_id uuid not null references public.goals (id) on delete cascade,
  category_id uuid not null references public.wishlist_categories (id) on delete cascade,
  primary key (goal_id, category_id)
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
create unique index page_members_one_owner
  on public.page_members (page_id)
  where role = 'owner';
create index followers_user_idx on public.followers (user_id);
create index post_views_post_idx on public.post_views (post_id);
create index subscriptions_user_idx on public.subscriptions (user_id);
create index posts_page_created_idx on public.posts (page_id, created_at desc);
create unique index wishlist_categories_page_name_key
  on public.wishlist_categories (page_id, lower(name));
create index wishlist_categories_page_idx on public.wishlist_categories (page_id, lower(name));
create index goals_page_created_idx on public.goals (page_id, created_at desc);
create index goal_categories_category_idx on public.goal_categories (category_id);
create index access_codes_page_created_idx on public.access_codes (page_id, created_at desc);
create index post_images_post_idx on public.post_images (post_id, sort_order);
create index cover_images_page_idx on public.cover_images (page_id, sort_order);
create index post_goals_post_idx on public.post_goals (post_id, sort_order);
create index post_goals_goal_idx on public.post_goals (goal_id);
create index comments_post_idx on public.comments (post_id, created_at);
create index comments_page_idx on public.comments (page_id, created_at);
create index post_reactions_page_idx on public.post_reactions (page_id, post_id);

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

create or replace function private.guard_wishlist_category()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_count integer;
begin
  new.name := regexp_replace(trim(new.name), '\s+', ' ', 'g');

  if tg_op = 'INSERT' then
    select count(*) into v_count
    from public.wishlist_categories
    where page_id = new.page_id;

    if v_count >= 24 then
      raise exception 'too_many_categories' using errcode = '54000';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function private.guard_wishlist_category() from public, anon, authenticated;

create trigger wishlist_categories_guard
  before insert or update on public.wishlist_categories
  for each row execute function private.guard_wishlist_category();

create trigger wishlist_categories_page_immutable
  before update on public.wishlist_categories
  for each row execute function private.prevent_page_move();

create or replace function private.guard_goal_category()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_goal_page uuid;
  v_category_page uuid;
  v_count integer;
begin
  select g.page_id into v_goal_page
  from public.goals g
  where g.id = new.goal_id;

  select c.page_id into v_category_page
  from public.wishlist_categories c
  where c.id = new.category_id;

  if v_goal_page is null or v_category_page is null or v_goal_page is distinct from v_category_page then
    raise exception 'category_page_mismatch' using errcode = '42501';
  end if;

  select count(*) into v_count
  from public.goal_categories
  where goal_id = new.goal_id;

  if v_count >= 8 then
    raise exception 'too_many_goal_tags' using errcode = '54000';
  end if;

  return new;
end;
$$;

revoke all on function private.guard_goal_category() from public, anon, authenticated;

create trigger goal_categories_guard
  before insert on public.goal_categories
  for each row execute function private.guard_goal_category();

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

revoke all on function private.guard_post_image() from public, anon, authenticated;
revoke all on function private.guard_post_goal() from public, anon, authenticated;
revoke all on function private.guard_cover_image() from public, anon, authenticated;

create or replace function private.guard_comment()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_catalog
as $$
declare
  v_paywalled boolean;
  v_parent_post uuid;
  v_parent_parent uuid;
  v_count integer;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  new.user_id := auth.uid();
  new.body := trim(new.body);

  select p.page_id, p.is_paywalled
  into new.page_id, v_paywalled
  from public.posts p
  where p.id = new.post_id;

  if new.page_id is null then
    raise exception 'post_locked' using errcode = '42501';
  end if;

  if not private.is_page_member(new.page_id, null)
     and not exists (
       select 1
       from public.followers f
       where f.page_id = new.page_id
         and f.user_id = auth.uid()
     ) then
    raise exception 'not_following' using errcode = '42501';
  end if;

  if v_paywalled and not private.viewer_has_page_access(new.page_id) then
    raise exception 'post_locked' using errcode = '42501';
  end if;

  if new.parent_id is not null then
    select c.post_id, c.parent_id
    into v_parent_post, v_parent_parent
    from public.comments c
    where c.id = new.parent_id;

    if v_parent_post is null or v_parent_post <> new.post_id or v_parent_parent is not null then
      raise exception 'comment_thread' using errcode = '42501';
    end if;
  end if;

  select count(*) into v_count
  from public.comments
  where post_id = new.post_id;

  if v_count >= 300 then
    raise exception 'too_many_comments' using errcode = '54000';
  end if;

  return new;
end;
$$;

create trigger comments_guard
  before insert on public.comments
  for each row execute function private.guard_comment();

revoke all on function private.guard_comment() from public, anon, authenticated;

create or replace function private.guard_reaction()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_catalog
as $$
declare
  v_paywalled boolean;
  v_count integer;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  new.user_id := auth.uid();

  select p.page_id, p.is_paywalled
  into new.page_id, v_paywalled
  from public.posts p
  where p.id = new.post_id;

  if new.page_id is null then
    raise exception 'react_locked' using errcode = '42501';
  end if;

  if not private.is_page_member(new.page_id, null)
     and not exists (
       select 1
       from public.followers f
       where f.page_id = new.page_id
         and f.user_id = auth.uid()
     ) then
    raise exception 'react_follow' using errcode = '42501';
  end if;

  if v_paywalled and not private.viewer_has_page_access(new.page_id) then
    raise exception 'react_locked' using errcode = '42501';
  end if;

  if new.emoji not in ('heart', 'fire', 'laugh', 'clap', 'wow', 'sparkle') then
    raise exception 'react_emoji' using errcode = '22023';
  end if;

  select count(*) into v_count
  from public.post_reactions
  where post_id = new.post_id;

  if v_count >= 1000 then
    raise exception 'too_many_reactions' using errcode = '54000';
  end if;

  return new;
end;
$$;

create trigger post_reactions_guard
  before insert on public.post_reactions
  for each row execute function private.guard_reaction();

revoke all on function private.guard_reaction() from public, anon, authenticated;

create or replace function public.reaction_totals(p_page_id uuid)
returns table (post_id uuid, emoji text, total bigint)
language sql
stable
security invoker
set search_path = public, pg_catalog
as $$
  select r.post_id, r.emoji, count(*)::bigint
  from public.post_reactions r
  where r.page_id = p_page_id
  group by r.post_id, r.emoji;
$$;

revoke all on function public.reaction_totals(uuid) from public;
grant execute on function public.reaction_totals(uuid) to anon, authenticated;

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

-- Looks up auth.users by email, then inserts a manager row. Owner only.
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

-- The caller must be the owner. The recipient must already be a manager.
-- Both role changes happen in one statement so the page keeps a single owner.
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

-- Public list of who runs a page. Usernames only; email stays in auth.users.
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

revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.protect_superadmin_flag() from public, anon, authenticated;
revoke all on function public.add_page_owner() from public, anon, authenticated;
revoke all on function public.protect_access_code() from public, anon, authenticated;

revoke all on function public.get_page_feed(uuid, integer) from public;
grant execute on function public.get_page_feed(uuid, integer) to anon, authenticated;

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

revoke all on function public.redeem_access_code(text) from public, anon;
grant execute on function public.redeem_access_code(text) to authenticated;

revoke all on function public.grant_page_access(uuid, text, integer) from public, anon;
grant execute on function public.grant_page_access(uuid, text, integer) to authenticated;

revoke all on function public.create_access_code(uuid, integer) from public, anon;
grant execute on function public.create_access_code(uuid, integer) to authenticated;

revoke all on function public.add_page_manager(uuid, text) from public, anon;
grant execute on function public.add_page_manager(uuid, text) to authenticated;

revoke all on function public.transfer_page_ownership(uuid, uuid) from public, anon;
grant execute on function public.transfer_page_ownership(uuid, uuid) to authenticated;

revoke all on function public.list_page_staff(uuid) from public;
grant execute on function public.list_page_staff(uuid) to anon, authenticated;

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
alter table public.wishlist_categories enable row level security;
alter table public.goal_categories enable row level security;
alter table public.post_images enable row level security;
alter table public.cover_images enable row level security;
alter table public.post_goals enable row level security;
alter table public.comments enable row level security;
alter table public.post_reactions enable row level security;
alter table public.post_views enable row level security;

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

create policy post_views_select_own
  on public.post_views
  for select
  to authenticated
  using (user_id = auth.uid());

-- Direct reads. Paywalled rows are visible to staff and active subscribers.
-- Drafts are visible to staff only. The public page should call get_page_feed
-- so locked posts still appear.
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

create policy comments_select_visible
  on public.comments
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

create policy comments_insert_follower
  on public.comments
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.posts p
      where p.id = post_id
        and p.page_id = page_id
        and (
          private.is_page_member(p.page_id, null)
          or exists (
            select 1
            from public.followers f
            where f.page_id = p.page_id
              and f.user_id = auth.uid()
          )
        )
        and (
          p.is_paywalled = false
          or private.viewer_has_page_access(p.page_id)
        )
    )
    and (
      parent_id is null
      or exists (
        select 1
        from public.comments parent
        where parent.id = parent_id
          and parent.post_id = post_id
          and parent.parent_id is null
      )
    )
  );

create policy comments_delete_author_or_staff
  on public.comments
  for delete
  to authenticated
  using (
    user_id = auth.uid()
    or private.is_page_member(page_id, array['owner', 'manager']::public.page_role[])
  );

create policy post_reactions_select_visible
  on public.post_reactions
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

create policy post_reactions_insert_follower
  on public.post_reactions
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.posts p
      where p.id = post_id
        and p.page_id = page_id
        and (
          private.is_page_member(p.page_id, null)
          or exists (
            select 1
            from public.followers f
            where f.page_id = p.page_id
              and f.user_id = auth.uid()
          )
        )
        and (
          p.is_paywalled = false
          or private.viewer_has_page_access(p.page_id)
        )
    )
  );

create policy post_reactions_delete_own
  on public.post_reactions
  for delete
  to authenticated
  using (user_id = auth.uid());

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

create policy wishlist_categories_select_public
  on public.wishlist_categories
  for select
  to anon, authenticated
  using (true);

create policy wishlist_categories_insert_staff
  on public.wishlist_categories
  for insert
  to authenticated
  with check (private.is_page_member(page_id, array['owner', 'manager']::public.page_role[]));

create policy wishlist_categories_update_staff
  on public.wishlist_categories
  for update
  to authenticated
  using (private.is_page_member(page_id, array['owner', 'manager']::public.page_role[]))
  with check (private.is_page_member(page_id, array['owner', 'manager']::public.page_role[]));

create policy wishlist_categories_delete_staff
  on public.wishlist_categories
  for delete
  to authenticated
  using (private.is_page_member(page_id, array['owner', 'manager']::public.page_role[]));

create policy goal_categories_select_public
  on public.goal_categories
  for select
  to anon, authenticated
  using (true);

create policy goal_categories_insert_staff
  on public.goal_categories
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.goals g
      where g.id = goal_id
        and private.is_page_member(g.page_id, array['owner', 'manager']::public.page_role[])
    )
  );

create policy goal_categories_delete_staff
  on public.goal_categories
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.goals g
      where g.id = goal_id
        and private.is_page_member(g.page_id, array['owner', 'manager']::public.page_role[])
    )
  );

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
grant update (username, avatar_url, tiktok_url, facebook_url, x_url, instagram_url) on public.users to authenticated;

grant select on public.creator_pages to anon, authenticated;
grant insert, update, delete on public.creator_pages to authenticated;

grant select, insert, delete on public.page_members to authenticated;

grant select on public.followers to anon, authenticated;
grant insert, delete on public.followers to authenticated;

grant select on public.post_views to authenticated;
revoke insert, update, delete on public.post_views from anon, authenticated;

grant select on public.comments to anon, authenticated;
grant insert, delete on public.comments to authenticated;

grant select on public.post_reactions to anon, authenticated;
grant insert, delete on public.post_reactions to authenticated;

grant select on public.posts to anon, authenticated;
grant insert, update, delete on public.posts to authenticated;

grant select, delete on public.access_codes to authenticated;

grant select on public.subscriptions to authenticated;

grant select on public.goals to anon, authenticated;
grant insert, update, delete on public.goals to authenticated;

grant select on public.wishlist_categories to anon, authenticated;
grant insert, update, delete on public.wishlist_categories to authenticated;

grant select on public.goal_categories to anon, authenticated;
grant insert, delete on public.goal_categories to authenticated;

grant select on public.cover_images to anon, authenticated;
grant insert, delete on public.cover_images to authenticated;

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
