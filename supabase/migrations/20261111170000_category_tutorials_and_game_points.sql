create table if not exists public.game_point_awards (
  room_id uuid not null references public.rooms (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  correct_answers integer not null check (correct_answers >= 0),
  points_per_correct integer not null check (points_per_correct between 1 and 3),
  points integer not null check (points >= 0),
  awarded_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

alter table public.game_point_awards enable row level security;

do $$
begin
  if to_regclass('public.practice_point_awards') is not null then
    execute $migration$
      insert into public.game_point_awards (
        room_id, user_id, correct_answers, points_per_correct, points, awarded_at
      )
      select
        awards.room_id,
        awards.user_id,
        coalesce(players.correct, 0),
        case
          when rooms.grade <= 2 then 1
          when rooms.grade <= 4 then 2
          else 3
        end,
        awards.points,
        awards.awarded_at
      from public.practice_point_awards as awards
      join public.rooms as rooms on rooms.id = awards.room_id
      left join public.room_players as players
        on players.room_id = awards.room_id
        and players.user_id = awards.user_id
      on conflict (room_id, user_id) do nothing
    $migration$;
  end if;
end;
$$;

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
  points_per_correct integer;
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

  points_per_correct := case
    when room_grade <= 2 then 1
    when room_grade <= 4 then 2
    else 3
  end;
  points_to_award := greatest(0, coalesce(correct_answers, 0)) * points_per_correct;

  insert into public.game_point_awards (
    room_id, user_id, correct_answers, points_per_correct, points
  )
  values (
    p_room,
    current_user_id,
    greatest(0, coalesce(correct_answers, 0)),
    points_per_correct,
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

create or replace function public.award_practice_points(p_room uuid)
returns integer
language sql
security definer
set search_path = ''
as $$
  select public.award_game_points(p_room);
$$;

revoke all on function public.award_game_points(uuid) from public, anon;
grant execute on function public.award_game_points(uuid) to authenticated;
revoke all on function public.award_practice_points(uuid) from public, anon;
grant execute on function public.award_practice_points(uuid) to authenticated;

notify pgrst, 'reload schema';
