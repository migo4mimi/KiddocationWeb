alter table public.profiles
  add column if not exists streak_days integer not null default 0
    check (streak_days >= 0),
  add column if not exists streak_best_days integer not null default 0
    check (streak_best_days >= 0),
  add column if not exists streak_last_played_on date;

update public.profiles
set streak_best_days = greatest(streak_best_days, streak_days)
where streak_days > streak_best_days;

create table if not exists public.game_activity_awards (
  room_id uuid not null references public.rooms (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  activity_date date not null,
  primary key (room_id, user_id)
);

alter table public.game_activity_awards enable row level security;
revoke all on public.game_activity_awards from public, anon, authenticated;

create or replace function public.record_game_activity(
  p_room uuid,
  p_activity_date date
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  current_streak integer;
  last_played_on date;
  next_streak integer;
begin
  if current_user_id is null then
    raise exception 'not_signed_in';
  end if;
  if p_activity_date is null
    or p_activity_date < current_date - 1
    or p_activity_date > current_date + 1
  then
    raise exception 'invalid_activity_date';
  end if;
  if not exists (
    select 1
    from public.rooms r
    join public.room_players rp on rp.room_id = r.id
    where r.id = p_room
      and r.status = 'finished'
      and rp.user_id = current_user_id
  ) then
    raise exception 'finished_game_required';
  end if;

  select p.streak_days, p.streak_last_played_on
  into current_streak, last_played_on
  from public.profiles p
  where p.id = current_user_id
  for update;
  if not found then
    raise exception 'no_profile';
  end if;

  insert into public.game_activity_awards (room_id, user_id, activity_date)
  values (p_room, current_user_id, p_activity_date)
  on conflict (room_id, user_id) do nothing;

  if not found then
    return current_streak;
  end if;

  if last_played_on is null then
    next_streak := greatest(current_streak, 1);
  elsif p_activity_date <= last_played_on then
    next_streak := current_streak;
  elsif p_activity_date = last_played_on + 1 then
    next_streak := current_streak + 1;
  else
    next_streak := 1;
  end if;

  update public.profiles
  set
    streak_days = next_streak,
    streak_best_days = greatest(streak_best_days, next_streak),
    streak_last_played_on = greatest(
      coalesce(streak_last_played_on, p_activity_date),
      p_activity_date
    )
  where id = current_user_id;

  return next_streak;
end;
$$;

revoke all on function public.record_game_activity(uuid, date) from public, anon;
grant execute on function public.record_game_activity(uuid, date) to authenticated;

notify pgrst, 'reload schema';
