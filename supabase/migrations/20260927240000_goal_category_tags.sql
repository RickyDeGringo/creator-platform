-- A wishlist goal can wear several tags. Existing single-category links move across.

create table if not exists public.goal_categories (
  goal_id uuid not null references public.goals (id) on delete cascade,
  category_id uuid not null references public.wishlist_categories (id) on delete cascade,
  primary key (goal_id, category_id)
);

create index if not exists goal_categories_category_idx on public.goal_categories (category_id);

insert into public.goal_categories (goal_id, category_id)
select id, category_id
from public.goals
where category_id is not null
on conflict do nothing;

drop trigger if exists goals_category_guard on public.goals;

-- Keep the single category column in step with tags until that column is removed.
-- Saves from the previous app still land on the goal as one tag.
create or replace function private.sync_goal_category_tag()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  delete from public.goal_categories where goal_id = new.id;

  if new.category_id is not null then
    insert into public.goal_categories (goal_id, category_id)
    values (new.id, new.category_id);
  end if;

  return new;
end;
$$;

revoke all on function private.sync_goal_category_tag() from public, anon, authenticated;

drop trigger if exists goals_sync_category_tag on public.goals;
create trigger goals_sync_category_tag
  after insert or update of category_id on public.goals
  for each row execute function private.sync_goal_category_tag();

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

drop trigger if exists goal_categories_guard on public.goal_categories;
create trigger goal_categories_guard
  before insert on public.goal_categories
  for each row execute function private.guard_goal_category();

alter table public.goal_categories enable row level security;

drop policy if exists goal_categories_select_public on public.goal_categories;
create policy goal_categories_select_public
  on public.goal_categories
  for select
  to anon, authenticated
  using (true);

drop policy if exists goal_categories_insert_staff on public.goal_categories;
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

drop policy if exists goal_categories_delete_staff on public.goal_categories;
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

grant select on public.goal_categories to anon, authenticated;
grant insert, delete on public.goal_categories to authenticated;
