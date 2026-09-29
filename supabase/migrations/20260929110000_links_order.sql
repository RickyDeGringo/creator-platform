-- Let creators choose the order profile links appear on their page.

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

alter table public.creator_pages
  add column if not exists links_order text[] not null default '{}';

alter table public.creator_pages drop constraint if exists creator_pages_links_order_shape;
alter table public.creator_pages
  add constraint creator_pages_links_order_shape
  check (public.page_links_order_ok(links_order));
