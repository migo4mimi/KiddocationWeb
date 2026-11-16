create or replace function public.search_players(p_query text)
returns table (user_id uuid, display_name text, relationship text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  search_text text := btrim(coalesce(p_query, ''));
begin
  if current_user_id is null then
    raise exception 'not_signed_in';
  end if;
  if length(search_text) < 2 then
    raise exception 'search_term_too_short';
  end if;

  return query
  select
    p.id,
    coalesce(nullif(btrim(p.name), ''), 'Player'),
    case
      when exists (
        select 1 from public.friendships f
        where f.user_low = least(current_user_id, p.id)
          and f.user_high = greatest(current_user_id, p.id)
      ) then 'friend'
      when exists (
        select 1 from public.friend_requests r
        where r.status = 'pending'
          and r.sender_id = current_user_id
          and r.recipient_id = p.id
      ) then 'request_sent'
      when exists (
        select 1 from public.friend_requests r
        where r.status = 'pending'
          and r.sender_id = p.id
          and r.recipient_id = current_user_id
      ) then 'request_received'
      else 'none'
    end
  from public.profiles p
  where p.id <> current_user_id
    and p.name ilike '%' || search_text || '%'
    and not exists (
      select 1 from public.user_blocks b
      where (b.blocker_id = current_user_id and b.blocked_id = p.id)
        or (b.blocker_id = p.id and b.blocked_id = current_user_id)
    )
  order by p.name, p.id
  limit 20;
end;
$$;

create or replace function public.send_friend_request(p_user_id uuid)
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
  if p_user_id is null or p_user_id = current_user_id then
    raise exception 'invalid_player';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      least(current_user_id::text, p_user_id::text)
        || ':' || greatest(current_user_id::text, p_user_id::text),
      0
    )
  );

  if not exists (
    select 1 from public.profiles p
    where p.id = current_user_id
  ) then
    raise exception 'no_profile';
  end if;
  if not exists (
    select 1 from public.profiles p
    where p.id = p_user_id
  ) then
    raise exception 'player_unavailable';
  end if;
  if exists (
    select 1 from public.user_blocks b
    where (b.blocker_id = current_user_id and b.blocked_id = p_user_id)
      or (b.blocker_id = p_user_id and b.blocked_id = current_user_id)
  ) then
    raise exception 'player_unavailable';
  end if;
  if exists (
    select 1 from public.friendships f
    where f.user_low = least(current_user_id, p_user_id)
      and f.user_high = greatest(current_user_id, p_user_id)
  ) then
    raise exception 'already_friends';
  end if;
  if exists (
    select 1 from public.friend_requests r
    where r.status = 'pending'
      and r.sender_id = p_user_id
      and r.recipient_id = current_user_id
  ) then
    raise exception 'request_received';
  end if;

  insert into public.friend_requests (sender_id, recipient_id)
  values (current_user_id, p_user_id);
exception
  when unique_violation then
    raise exception 'already_pending';
end;
$$;

revoke all on function public.search_players(text) from public, anon;
grant execute on function public.search_players(text) to authenticated;
revoke all on function public.send_friend_request(uuid) from public, anon;
grant execute on function public.send_friend_request(uuid) to authenticated;

notify pgrst, 'reload schema';
