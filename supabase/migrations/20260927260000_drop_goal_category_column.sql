-- The app now stores every tag on goal_categories.
-- Drop the old single-category column only after that app version is live.

drop trigger if exists goals_sync_category_tag on public.goals;
drop function if exists private.sync_goal_category_tag();

drop index if exists public.goals_category_idx;
alter table public.goals drop column if exists category_id;
