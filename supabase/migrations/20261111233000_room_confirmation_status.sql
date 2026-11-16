create or replace function public.room_confirmation_status(
  p_room uuid,
  p_round integer
)
returns table (
  total_players integer,
  confirmed_players integer
)
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

  if p_round is null or p_round < 0 then
    raise exception 'bad_round';
  end if;

  if not exists (
    select 1
    from public.room_players
    where room_id = p_room
      and user_id = current_user_id
  ) then
    raise exception 'not_in_room';
  end if;

  return query
  select
    count(players.user_id)::integer,
    count(confirmations.user_id)::integer
  from public.room_players as players
  left join public.room_answer_confirmations as confirmations
    on confirmations.room_id = players.room_id
    and confirmations.round = p_round
    and confirmations.user_id = players.user_id
  where players.room_id = p_room;
end;
$$;

revoke all on function public.room_confirmation_status(uuid, integer)
  from public, anon;
grant execute on function public.room_confirmation_status(uuid, integer)
  to authenticated;

notify pgrst, 'reload schema';
