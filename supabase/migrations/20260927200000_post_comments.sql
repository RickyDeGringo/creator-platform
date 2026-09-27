alter table public.users
  add column tiktok_url text,
  add column facebook_url text,
  add column x_url text,
  add column instagram_url text;

alter table public.users
  add constraint users_tiktok_https check (
    tiktok_url is null or (tiktok_url ~ '^https://' and char_length(tiktok_url) <= 200)
  ),
  add constraint users_facebook_https check (
    facebook_url is null or (facebook_url ~ '^https://' and char_length(facebook_url) <= 200)
  ),
  add constraint users_x_https check (
    x_url is null or (x_url ~ '^https://' and char_length(x_url) <= 200)
  ),
  add constraint users_instagram_https check (
    instagram_url is null or (instagram_url ~ '^https://' and char_length(instagram_url) <= 200)
  );

grant update (tiktok_url, facebook_url, x_url, instagram_url) on public.users to authenticated;

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

create index comments_post_idx on public.comments (post_id, created_at);
create index comments_page_idx on public.comments (page_id, created_at);

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

alter table public.comments enable row level security;

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

grant select on public.comments to anon, authenticated;
grant insert, delete on public.comments to authenticated;
