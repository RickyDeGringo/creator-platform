-- The links check treated any https URL as invalid because the pattern only matched the literal "https://".

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
