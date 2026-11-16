alter table public.profiles
  add column if not exists profile_picture_position text not null default 'center'
    check (
      profile_picture_position in (
        'top-left',
        'top',
        'top-right',
        'left',
        'center',
        'right',
        'bottom-left',
        'bottom',
        'bottom-right'
      )
    ),
  add column if not exists profile_picture_zoom integer not null default 100
    check (profile_picture_zoom between 100 and 200);

create or replace function public.update_my_profile_picture_crop(
  p_position text,
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

  if p_position is null or p_position not in (
    'top-left',
    'top',
    'top-right',
    'left',
    'center',
    'right',
    'bottom-left',
    'bottom',
    'bottom-right'
  ) or p_zoom is null or p_zoom not between 100 and 200 then
    raise exception 'invalid_profile_picture_crop';
  end if;

  update public.profiles
  set
    profile_picture_position = p_position,
    profile_picture_zoom = p_zoom
  where id = current_user_id;

  if not found then
    raise exception 'no_profile';
  end if;
end;
$$;

revoke all on function public.update_my_profile_picture_crop(text, integer)
  from public, anon;
grant execute on function public.update_my_profile_picture_crop(text, integer)
  to authenticated;

notify pgrst, 'reload schema';
