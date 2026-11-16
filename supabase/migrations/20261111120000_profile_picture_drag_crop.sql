alter table public.profiles
  add column if not exists profile_picture_offset_x double precision not null default 0
    check (profile_picture_offset_x between -10 and 10),
  add column if not exists profile_picture_offset_y double precision not null default 0
    check (profile_picture_offset_y between -10 and 10);

alter table public.profiles
  add column if not exists profile_picture_zoom integer not null default 100;

alter table public.profiles
  drop constraint if exists profiles_profile_picture_zoom_check;

alter table public.profiles
  add constraint profiles_profile_picture_zoom_check
    check (profile_picture_zoom between 100 and 300);

drop function if exists public.update_my_profile_picture_crop(
  double precision,
  double precision,
  integer
);
drop function if exists public.update_my_profile_picture_crop(text, integer);

create or replace function public.update_my_profile_picture_crop(
  p_path text,
  p_offset_x double precision,
  p_offset_y double precision,
  p_zoom integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'not_signed_in';
  end if;

  if p_offset_x is null
    or p_offset_x not between -10 and 10
    or p_offset_y is null
    or p_offset_y not between -10 and 10
    or p_zoom is null
    or p_zoom not between 100 and 300
  then
    raise exception 'invalid_profile_picture_crop';
  end if;

  if p_path is not null
    and (
      p_path !~ (
        '^' || current_user_id::text || '/[0-9a-f-]+\.(jpg|png|webp|gif)$'
      )
      or not exists (
        select 1
        from storage.objects
        where bucket_id = 'profile-pictures'
          and name = p_path
      )
    )
  then
    raise exception 'invalid_profile_picture';
  end if;

  update public.profiles
  set
    profile_picture_path = coalesce(p_path, profile_picture_path),
    profile_picture_offset_x = p_offset_x,
    profile_picture_offset_y = p_offset_y,
    profile_picture_zoom = p_zoom
  where id = current_user_id;

  if not found then
    raise exception 'no_profile';
  end if;
end;
$$;

revoke all on function public.update_my_profile_picture_crop(
  text,
  double precision,
  double precision,
  integer
) from public, anon;
grant execute on function public.update_my_profile_picture_crop(
  text,
  double precision,
  double precision,
  integer
) to authenticated;

notify pgrst, 'reload schema';
