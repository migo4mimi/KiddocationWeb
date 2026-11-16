alter table public.profiles
  add column if not exists points integer not null default 0;

alter table public.game_point_awards
  drop constraint if exists game_point_awards_points_per_correct_check;

alter table public.game_point_awards
  add constraint game_point_awards_points_per_correct_check
  check (points_per_correct between 1 and 10);

create or replace function public.award_game_points(p_room uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  room_mode text;
  room_status text;
  room_grade integer;
  correct_answers integer;
  points_to_award integer;
  already_awarded integer;
begin
  if current_user_id is null then
    raise exception 'not_signed_in';
  end if;

  select mode, status, grade
  into room_mode, room_status, room_grade
  from public.rooms
  where id = p_room;

  if not found then
    raise exception 'room_not_found';
  end if;

  if room_mode not in ('practice', 'ranked', 'custom') then
    raise exception 'unsupported_game_mode';
  end if;

  if room_status <> 'finished' then
    raise exception 'game_not_finished';
  end if;

  if room_grade is null or room_grade not between 1 and 6 then
    raise exception 'bad_grade';
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

  insert into public.game_point_awards (
    room_id, user_id, correct_answers, points_per_correct, points
  )
  values (
    p_room,
    current_user_id,
    greatest(0, coalesce(correct_answers, 0)),
    10,
    points_to_award
  )
  on conflict (room_id, user_id) do nothing;

  if not found then
    select points
    into already_awarded
    from public.game_point_awards
    where room_id = p_room
      and user_id = current_user_id;

    return coalesce(already_awarded, 0);
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

with inserted_awards as (
  insert into public.game_point_awards (
    room_id, user_id, correct_answers, points_per_correct, points
  )
  select
    rooms.id,
    players.user_id,
    greatest(0, coalesce(players.correct, 0)),
    10,
    greatest(0, coalesce(players.correct, 0)) * 10
  from public.rooms as rooms
  join public.room_players as players on players.room_id = rooms.id
  join public.profiles as profiles on profiles.id = players.user_id
  where rooms.status = 'finished'
    and rooms.mode in ('practice', 'ranked', 'custom')
  on conflict (room_id, user_id) do nothing
  returning user_id, points
),
totals as (
  select user_id, sum(points) as points
  from inserted_awards
  group by user_id
)
update public.profiles as profiles
set points = coalesce(profiles.points, 0) + totals.points
from totals
where profiles.id = totals.user_id;

revoke all on function public.award_game_points(uuid) from public, anon;
grant execute on function public.award_game_points(uuid) to authenticated;

notify pgrst, 'reload schema';
