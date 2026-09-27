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

create index post_reactions_page_idx on public.post_reactions (page_id, post_id);

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

alter table public.post_reactions enable row level security;

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

grant select on public.post_reactions to anon, authenticated;
grant insert, delete on public.post_reactions to authenticated;
