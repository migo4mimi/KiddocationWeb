create table if not exists public.room_answer_confirmations (
  room_id uuid not null references public.rooms (id) on delete cascade,
  round integer not null check (round >= 0),
  user_id uuid not null references auth.users (id) on delete cascade,
  correct boolean not null,
  confirmed_at timestamptz not null default now(),
  primary key (room_id, round, user_id)
);

alter table public.room_answer_confirmations enable row level security;

create or replace function public.confirm_room_answer(
  p_room uuid,
  p_round integer,
  p_side text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  room_row public.rooms%rowtype;
  room_player_count integer;
  confirmation_count integer;
  answer_is_correct boolean;
  current_round integer;
  step_seconds integer;
  v_now timestamptz := clock_timestamp();
begin
  if current_user_id is null then
    raise exception 'not_signed_in';
  end if;

  select *
  into room_row
  from public.rooms
  where id = p_room
  for update;

  if not found then
    raise exception 'room_not_found';
  end if;

  if not exists (
    select 1
    from public.room_players
    where room_id = p_room
      and user_id = current_user_id
  ) then
    raise exception 'not_in_room';
  end if;

  select correct
  into answer_is_correct
  from public.room_answer_confirmations
  where room_id = p_room
    and round = p_round
    and user_id = current_user_id;

  if found then
    return answer_is_correct;
  end if;

  if room_row.status <> 'playing' then
    raise exception 'room_not_playing';
  end if;

  step_seconds := room_row.round_seconds + room_row.reveal_seconds;
  current_round := floor(
    extract(epoch from (v_now - room_row.started_at)) / step_seconds
  )::integer;

  if p_round <> current_round
    or p_round < 0
    or p_round >= room_row.total_rounds
  then
    raise exception 'round_not_current';
  end if;

  answer_is_correct := public.submit_answer(p_room, p_round, p_side);

  insert into public.room_answer_confirmations (
    room_id, round, user_id, correct
  )
  values (p_room, p_round, current_user_id, answer_is_correct);

  select count(*)
  into room_player_count
  from public.room_players
  where room_id = p_room;

  select count(*)
  into confirmation_count
  from public.room_answer_confirmations
  where room_id = p_room
    and round = p_round;

  if room_player_count > 0 and confirmation_count >= room_player_count then
    update public.rooms
    set started_at = v_now
      - make_interval(secs => (p_round + 1) * step_seconds)
    where id = p_room;
  end if;

  return answer_is_correct;
end;
$$;

revoke all on function public.confirm_room_answer(uuid, integer, text)
  from public, anon;
grant execute on function public.confirm_room_answer(uuid, integer, text)
  to authenticated;

notify pgrst, 'reload schema';
