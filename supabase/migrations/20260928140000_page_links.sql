-- Public profile links on a creator page, and which icon style draws them.

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
        or item.value !~ '^(https://|mailto:[^[:space:]]+@[^[:space:]]+)$'
    );
$$;

revoke all on function public.page_links_ok(jsonb) from public;

alter table public.creator_pages
  add column if not exists icon_set text not null default 'brand';

alter table public.creator_pages
  add column if not exists links jsonb not null default '{}'::jsonb;

alter table public.creator_pages drop constraint if exists creator_pages_icon_set_known;
alter table public.creator_pages
  add constraint creator_pages_icon_set_known
  check (icon_set in ('brand', 'fontawesome', 'bootstrap'));

alter table public.creator_pages drop constraint if exists creator_pages_links_shape;
alter table public.creator_pages
  add constraint creator_pages_links_shape
  check (public.page_links_ok(links));
