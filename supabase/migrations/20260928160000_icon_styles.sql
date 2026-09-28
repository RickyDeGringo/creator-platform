-- Replace the near-identical brand-logo sets with styles a creator can tell apart.

update public.creator_pages
set icon_set = 'brand'
where icon_set in ('fontawesome', 'bootstrap');

alter table public.creator_pages drop constraint if exists creator_pages_icon_set_known;

alter table public.creator_pages
  add constraint creator_pages_icon_set_known
  check (icon_set in ('brand', 'colour', 'line', 'solid', 'letters'));
