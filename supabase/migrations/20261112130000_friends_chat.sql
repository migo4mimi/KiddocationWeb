create table if not exists public.friend_requests (
  request_id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users (id) on delete cascade,
  recipient_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'cancelled', 'removed', 'blocked')),
  created_at timestamptz not null default now(),
  check (sender_id <> recipient_id)
);

create unique index if not exists friend_requests_one_pending_pair_idx
  on public.friend_requests (sender_id, recipient_id)
  where status = 'pending';

create index if not exists friend_requests_recipient_pending_idx
  on public.friend_requests (recipient_id, created_at desc)
  where status = 'pending';

create table if not exists public.friendships (
  user_low uuid not null references auth.users (id) on delete cascade,
  user_high uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_low, user_high),
  check (user_low < user_high)
);

create table if not exists public.user_blocks (
  blocker_id uuid not null references auth.users (id) on delete cascade,
  blocked_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users (id) on delete cascade,
  recipient_id uuid not null references auth.users (id) on delete cascade,
  body text not null check (length(btrim(body)) between 1 and 500),
  created_at timestamptz not null default now(),
  check (sender_id <> recipient_id)
);

create index if not exists chat_messages_conversation_idx
  on public.chat_messages (sender_id, recipient_id, created_at desc);
create index if not exists chat_messages_recipient_conversation_idx
  on public.chat_messages (recipient_id, sender_id, created_at desc);

create table if not exists public.chat_reports (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.chat_messages (id) on delete cascade,
  reporter_id uuid not null references auth.users (id) on delete cascade,
  reason text not null check (length(btrim(reason)) between 1 and 300),
  created_at timestamptz not null default now(),
  unique (message_id, reporter_id)
);

alter table public.friend_requests enable row level security;
alter table public.friendships enable row level security;
alter table public.user_blocks enable row level security;
alter table public.chat_messages enable row level security;
alter table public.chat_reports enable row level security;

revoke all on public.friend_requests, public.friendships, public.user_blocks,
  public.chat_messages, public.chat_reports from public, anon, authenticated;
grant select, insert on public.chat_messages to authenticated;

create or replace function public.chat_message_is_allowed(p_body text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_body is not null
    and length(btrim(p_body)) between 1 and 500
    and p_body !~* '(https?://|www\.)'
    and p_body !~* '[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}'
    and p_body !~ '[0-9]([[:space:]().-]*[0-9]){8,}'
    and p_body !~* '\y(fuck|shit|bitch|asshole|bastard|damn|idiot|stupid|kill yourself)\y';
$$;

create or replace function public.can_chat_with(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_user is not null
    and p_user <> (select auth.uid())
    and exists (
      select 1
      from public.friendships as f
      where f.user_low = least((select auth.uid()), p_user)
        and f.user_high = greatest((select auth.uid()), p_user)
    )
    and not exists (
      select 1
      from public.user_blocks as b
      where (b.blocker_id = (select auth.uid()) and b.blocked_id = p_user)
        or (b.blocker_id = p_user and b.blocked_id = (select auth.uid()))
    );
$$;

drop policy if exists "Friends can read their messages" on public.chat_messages;
create policy "Friends can read their messages"
  on public.chat_messages for select to authenticated
  using (
    (sender_id = (select auth.uid()) and public.can_chat_with(recipient_id))
    or (recipient_id = (select auth.uid()) and public.can_chat_with(sender_id))
  );

drop policy if exists "Friends can send filtered messages" on public.chat_messages;
create policy "Friends can send filtered messages"
  on public.chat_messages for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and public.can_chat_with(recipient_id)
    and public.chat_message_is_allowed(body)
  );

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
  if not exists (
    select 1 from public.profiles p
    where p.id = current_user_id and p.role = 'student'
  ) then
    raise exception 'students_only';
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
    and p.role = 'student'
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

create or replace function public.list_my_friends()
returns table (user_id uuid, display_name text)
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

  return query
  select p.id, coalesce(nullif(btrim(p.name), ''), 'Player')
  from public.friendships f
  join public.profiles p
    on p.id = case when f.user_low = current_user_id then f.user_high else f.user_low end
  where f.user_low = current_user_id or f.user_high = current_user_id
  order by p.name, p.id;
end;
$$;

create or replace function public.list_friend_requests()
returns table (
  request_id uuid,
  user_id uuid,
  display_name text,
  direction text,
  created_at timestamptz
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

  return query
  select
    r.request_id,
    p.id,
    coalesce(nullif(btrim(p.name), ''), 'Player'),
    case when r.recipient_id = current_user_id then 'incoming' else 'outgoing' end,
    r.created_at
  from public.friend_requests r
  join public.profiles p
    on p.id = case when r.sender_id = current_user_id then r.recipient_id else r.sender_id end
  where r.status = 'pending'
    and (r.sender_id = current_user_id or r.recipient_id = current_user_id)
    and not exists (
      select 1 from public.user_blocks b
      where (b.blocker_id = current_user_id and b.blocked_id = p.id)
        or (b.blocker_id = p.id and b.blocked_id = current_user_id)
    )
  order by r.created_at desc;
end;
$$;

create or replace function public.list_my_blocks()
returns table (user_id uuid, display_name text)
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

  return query
  select p.id, coalesce(nullif(btrim(p.name), ''), 'Player')
  from public.user_blocks b
  join public.profiles p on p.id = b.blocked_id
  where b.blocker_id = current_user_id
  order by p.name, p.id;
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
    where p.id = current_user_id and p.role = 'student'
  ) or not exists (
    select 1 from public.profiles p
    where p.id = p_user_id and p.role = 'student'
  ) then
    raise exception 'students_only';
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

create or replace function public.accept_friend_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  requesting_user uuid;
begin
  if current_user_id is null then
    raise exception 'not_signed_in';
  end if;

  select r.sender_id into requesting_user
  from public.friend_requests r
  where r.request_id = p_request_id
    and r.recipient_id = current_user_id
    and r.status = 'pending'
  for update;
  if not found then
    raise exception 'request_not_found';
  end if;
  if exists (
    select 1 from public.user_blocks b
    where (b.blocker_id = current_user_id and b.blocked_id = requesting_user)
      or (b.blocker_id = requesting_user and b.blocked_id = current_user_id)
  ) then
    raise exception 'player_unavailable';
  end if;

  insert into public.friendships (user_low, user_high)
  values (least(current_user_id, requesting_user), greatest(current_user_id, requesting_user))
  on conflict do nothing;
  update public.friend_requests
  set status = 'accepted'
  where request_id = p_request_id;
end;
$$;

create or replace function public.decline_friend_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
begin
  update public.friend_requests
  set status = 'declined'
  where request_id = p_request_id
    and recipient_id = current_user_id
    and status = 'pending';
  if not found then
    raise exception 'request_not_found';
  end if;
end;
$$;

create or replace function public.cancel_friend_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
begin
  update public.friend_requests
  set status = 'cancelled'
  where request_id = p_request_id
    and sender_id = current_user_id
    and status = 'pending';
  if not found then
    raise exception 'request_not_found';
  end if;
end;
$$;

create or replace function public.remove_friend(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null or p_user_id is null or p_user_id = current_user_id then
    raise exception 'invalid_player';
  end if;

  delete from public.friendships
  where user_low = least(current_user_id, p_user_id)
    and user_high = greatest(current_user_id, p_user_id);
  if not found then
    raise exception 'not_friends';
  end if;
  update public.friend_requests
  set status = 'removed'
  where status = 'accepted'
    and ((sender_id = current_user_id and recipient_id = p_user_id)
      or (sender_id = p_user_id and recipient_id = current_user_id));
end;
$$;

create or replace function public.block_player(p_user_id uuid)
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
  if not exists (select 1 from public.profiles p where p.id = p_user_id) then
    raise exception 'player_not_found';
  end if;

  insert into public.user_blocks (blocker_id, blocked_id)
  values (current_user_id, p_user_id)
  on conflict do nothing;
  delete from public.friendships
  where user_low = least(current_user_id, p_user_id)
    and user_high = greatest(current_user_id, p_user_id);
  update public.friend_requests
  set status = 'blocked'
  where status in ('pending', 'accepted')
    and ((sender_id = current_user_id and recipient_id = p_user_id)
      or (sender_id = p_user_id and recipient_id = current_user_id));
end;
$$;

create or replace function public.unblock_player(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
begin
  delete from public.user_blocks
  where blocker_id = current_user_id and blocked_id = p_user_id;
  if not found then
    raise exception 'player_not_blocked';
  end if;
end;
$$;

create or replace function public.report_chat_message(p_message_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  cleaned_reason text := btrim(coalesce(p_reason, ''));
begin
  if current_user_id is null then
    raise exception 'not_signed_in';
  end if;
  if length(cleaned_reason) not between 1 and 300 then
    raise exception 'invalid_report_reason';
  end if;
  if not exists (
    select 1 from public.chat_messages m
    where m.id = p_message_id
      and m.recipient_id = current_user_id
      and m.sender_id <> current_user_id
  ) then
    raise exception 'message_not_found';
  end if;

  insert into public.chat_reports (message_id, reporter_id, reason)
  values (p_message_id, current_user_id, cleaned_reason)
  on conflict (message_id, reporter_id) do nothing;
end;
$$;

create or replace function public.list_chat_reports()
returns table (
  report_id uuid,
  message_id uuid,
  sender_id uuid,
  sender_name text,
  recipient_id uuid,
  reporter_id uuid,
  reporter_name text,
  body text,
  reason text,
  reported_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null or not exists (
    select 1
    from public.profiles p
    where p.id = current_user_id
      and p.role = 'admin'
  ) then
    raise exception 'not_admin';
  end if;

  return query
  select
    r.id,
    r.message_id,
    m.sender_id,
    coalesce(nullif(btrim(sender.name), ''), 'Player'),
    m.recipient_id,
    r.reporter_id,
    coalesce(nullif(btrim(reporter.name), ''), 'Player'),
    m.body,
    r.reason,
    r.created_at
  from public.chat_reports r
  join public.chat_messages m on m.id = r.message_id
  left join public.profiles sender on sender.id = m.sender_id
  left join public.profiles reporter on reporter.id = r.reporter_id
  order by r.created_at desc
  limit 200;
end;
$$;

revoke all on function public.chat_message_is_allowed(text) from public, anon;
revoke all on function public.can_chat_with(uuid) from public, anon;
revoke all on function public.search_players(text) from public, anon;
revoke all on function public.list_my_friends() from public, anon;
revoke all on function public.list_friend_requests() from public, anon;
revoke all on function public.list_my_blocks() from public, anon;
revoke all on function public.send_friend_request(uuid) from public, anon;
revoke all on function public.accept_friend_request(uuid) from public, anon;
revoke all on function public.decline_friend_request(uuid) from public, anon;
revoke all on function public.cancel_friend_request(uuid) from public, anon;
revoke all on function public.remove_friend(uuid) from public, anon;
revoke all on function public.block_player(uuid) from public, anon;
revoke all on function public.unblock_player(uuid) from public, anon;
revoke all on function public.report_chat_message(uuid, text) from public, anon;
revoke all on function public.list_chat_reports() from public, anon;

grant execute on function public.chat_message_is_allowed(text) to authenticated;
grant execute on function public.can_chat_with(uuid) to authenticated;
grant execute on function public.search_players(text) to authenticated;
grant execute on function public.list_my_friends() to authenticated;
grant execute on function public.list_friend_requests() to authenticated;
grant execute on function public.list_my_blocks() to authenticated;
grant execute on function public.send_friend_request(uuid) to authenticated;
grant execute on function public.accept_friend_request(uuid) to authenticated;
grant execute on function public.decline_friend_request(uuid) to authenticated;
grant execute on function public.cancel_friend_request(uuid) to authenticated;
grant execute on function public.remove_friend(uuid) to authenticated;
grant execute on function public.block_player(uuid) to authenticated;
grant execute on function public.unblock_player(uuid) to authenticated;
grant execute on function public.report_chat_message(uuid, text) to authenticated;
grant execute on function public.list_chat_reports() to authenticated;

notify pgrst, 'reload schema';
