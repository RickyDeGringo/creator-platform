-- Named palette and font presets for a creator page.
-- Owners and managers update these from the dashboard.

alter table public.creator_pages
  add column if not exists palette text not null default 'ember';

alter table public.creator_pages
  add column if not exists font text not null default 'editorial';

alter table public.creator_pages drop constraint if exists creator_pages_palette_known;
alter table public.creator_pages
  add constraint creator_pages_palette_known
  check (palette in ('ember', 'ink', 'paper', 'grove', 'tide', 'plum', 'dune', 'midnight'));

alter table public.creator_pages drop constraint if exists creator_pages_font_known;
alter table public.creator_pages
  add constraint creator_pages_font_known
  check (font in ('editorial', 'newsroom', 'story', 'gallery', 'studio', 'letterpress'));
