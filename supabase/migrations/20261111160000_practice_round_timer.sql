create or replace function public.create_practice_room_with_timer(
  p_grade integer,
  p_category text,
  p_rounds integer,
  p_round_seconds integer
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  room_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not_signed_in';
  end if;

  if p_round_seconds is null or p_round_seconds not between 5 and 120 then
    raise exception 'bad_round_seconds';
  end if;

  room_id := public.create_practice_room(p_grade, p_category, p_rounds);

  update public.rooms
  set round_seconds = p_round_seconds
  where id = room_id
    and mode = 'practice';

  if not found then
    raise exception 'room_not_found';
  end if;

  return room_id;
end;
$$;

revoke all on function public.create_practice_room_with_timer(integer, text, integer, integer)
  from public, anon;
grant execute on function public.create_practice_room_with_timer(integer, text, integer, integer)
  to authenticated;

notify pgrst, 'reload schema';
