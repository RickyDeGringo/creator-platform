-- Adds the platform superadmin flag and locks it so signed-in users cannot grant it.
-- The auth trigger promotes richyfong@gmail.com when that account is created.

alter table public.users
  add column if not exists is_superadmin boolean not null default false;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_requested text;
  v_username text;
  v_superadmin boolean;
begin
  v_requested := lower(trim(coalesce(new.raw_user_meta_data ->> 'username', '')));
  v_superadmin := lower(coalesce(new.email, '')) = 'richyfong@gmail.com';

  if v_requested ~ '^[a-z0-9_]{3,30}$' then
    v_username := v_requested;
  else
    v_username := 'user_' || substr(replace(new.id::text, '-', ''), 1, 12);
  end if;

  begin
    insert into public.users (id, username, avatar_url, is_superadmin)
    values (new.id, v_username, new.raw_user_meta_data ->> 'avatar_url', v_superadmin);
  exception
    when unique_violation then
      insert into public.users (id, username, avatar_url, is_superadmin)
      values (
        new.id,
        'user_' || substr(replace(new.id::text, '-', ''), 1, 12),
        new.raw_user_meta_data ->> 'avatar_url',
        v_superadmin
      );
  end;

  return new;
end;
$$;

create or replace function public.protect_superadmin_flag()
returns trigger
language plpgsql
as $$
declare
  v_role text := current_user;
begin
  if tg_op = 'INSERT' then
    if new.is_superadmin and v_role not in ('postgres', 'supabase_admin', 'service_role') then
      new.is_superadmin := false;
    end if;
    return new;
  end if;

  if new.is_superadmin is distinct from old.is_superadmin
     and v_role not in ('postgres', 'supabase_admin', 'service_role') then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_superadmin_flag on public.users;
create trigger protect_superadmin_flag
  before insert or update on public.users
  for each row execute function public.protect_superadmin_flag();

revoke all on function public.protect_superadmin_flag() from public, anon, authenticated;

revoke insert, update on public.users from authenticated;
grant insert (id, username, avatar_url) on public.users to authenticated;
grant update (username, avatar_url) on public.users to authenticated;
