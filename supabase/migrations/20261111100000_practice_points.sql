create table if not exists public.practice_point_awards (
  room_id uuid not null references public.rooms (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  points integer not null check (points >= 0),
  awarded_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

alter table public.practice_point_awards enable row level security;

create or replace function public.award_practice_points(p_room uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  room_mode text;
  room_status text;
  correct_answers integer;
  points_to_award integer;
  awarded_points integer;
begin
  if current_user_id is null then
    raise exception 'not_signed_in';
  end if;

  select mode, status
  into room_mode, room_status
  from public.rooms
  where id = p_room;

  if not found or room_mode <> 'practice' or room_status <> 'finished' then
    raise exception 'practice_game_not_finished';
  end if;

  select correct
  into correct_answers
  from public.room_players
  where room_id = p_room
    and user_id = current_user_id;

  if not found then
    raise exception 'not_in_room';
  end if;

  points_to_award := greatest(0, coalesce(correct_answers, 0)) * 10;

  insert into public.practice_point_awards (room_id, user_id, points)
  values (p_room, current_user_id, points_to_award)
  on conflict (room_id, user_id) do nothing;

  if not found then
    select points
    into awarded_points
    from public.practice_point_awards
    where room_id = p_room
      and user_id = current_user_id;

    return coalesce(awarded_points, 0);
  end if;

  update public.profiles
  set points = coalesce(points, 0) + points_to_award
  where id = current_user_id;

  if not found then
    raise exception 'no_profile';
  end if;

  return points_to_award;
end;
$$;

revoke all on function public.award_practice_points(uuid) from public, anon;
grant execute on function public.award_practice_points(uuid) to authenticated;

notify pgrst, 'reload schema';
