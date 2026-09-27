-- Wishlist categories set by page owners and managers.
-- A goal belongs to at most one category on the same page.

create table if not exists public.wishlist_categories (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.creator_pages (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  constraint wishlist_categories_name_length check (char_length(trim(name)) between 1 and 40)
);

create unique index if not exists wishlist_categories_page_name_key
  on public.wishlist_categories (page_id, lower(name));

create index if not exists wishlist_categories_page_idx
  on public.wishlist_categories (page_id, lower(name));

alter table public.goals
  add column if not exists category_id uuid references public.wishlist_categories (id) on delete set null;

create index if not exists goals_category_idx on public.goals (category_id);

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

drop trigger if exists wishlist_categories_guard on public.wishlist_categories;
create trigger wishlist_categories_guard
  before insert or update on public.wishlist_categories
  for each row execute function private.guard_wishlist_category();

drop trigger if exists wishlist_categories_page_immutable on public.wishlist_categories;
create trigger wishlist_categories_page_immutable
  before update on public.wishlist_categories
  for each row execute function private.prevent_page_move();

create or replace function private.guard_goal_category()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if new.category_id is null then
    return new;
  end if;

  if not exists (
    select 1
    from public.wishlist_categories c
    where c.id = new.category_id
      and c.page_id = new.page_id
  ) then
    raise exception 'category_page_mismatch' using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function private.guard_goal_category() from public, anon, authenticated;

drop trigger if exists goals_category_guard on public.goals;
create trigger goals_category_guard
  before insert or update of category_id, page_id on public.goals
  for each row execute function private.guard_goal_category();

alter table public.wishlist_categories enable row level security;

drop policy if exists wishlist_categories_select_public on public.wishlist_categories;
create policy wishlist_categories_select_public
  on public.wishlist_categories
  for select
  to anon, authenticated
  using (true);

drop policy if exists wishlist_categories_insert_staff on public.wishlist_categories;
create policy wishlist_categories_insert_staff
  on public.wishlist_categories
  for insert
  to authenticated
  with check (private.is_page_member(page_id, array['owner', 'manager']::public.page_role[]));

drop policy if exists wishlist_categories_update_staff on public.wishlist_categories;
create policy wishlist_categories_update_staff
  on public.wishlist_categories
  for update
  to authenticated
  using (private.is_page_member(page_id, array['owner', 'manager']::public.page_role[]))
  with check (private.is_page_member(page_id, array['owner', 'manager']::public.page_role[]));

drop policy if exists wishlist_categories_delete_staff on public.wishlist_categories;
create policy wishlist_categories_delete_staff
  on public.wishlist_categories
  for delete
  to authenticated
  using (private.is_page_member(page_id, array['owner', 'manager']::public.page_role[]));

grant select on public.wishlist_categories to anon, authenticated;
grant insert, update, delete on public.wishlist_categories to authenticated;
