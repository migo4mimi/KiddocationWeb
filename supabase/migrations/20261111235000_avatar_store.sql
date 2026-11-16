alter table public.profiles
  add column if not exists points integer not null default 0;

alter table public.profiles
  add column if not exists avatar_id text not null default 'default';

alter table public.profiles
  add column if not exists owned_avatars text[] not null default array['default']::text[];

update public.profiles
set owned_avatars = array['default']::text[]
where owned_avatars is null;

update public.profiles
set owned_avatars = array_append(owned_avatars, avatar_id)
where avatar_id is not null
  and not (avatar_id = any(owned_avatars));

create table if not exists public.avatars (
  id text primary key,
  name text not null,
  price integer not null check (price >= 0),
  sort integer not null unique
);

alter table public.avatars enable row level security;
grant select on public.avatars to anon, authenticated;

drop policy if exists "Avatar catalog is publicly readable"
  on public.avatars;
create policy "Avatar catalog is publicly readable"
  on public.avatars
  for select
  to anon, authenticated
  using (true);

insert into public.avatars (id, name, price, sort)
values
  ('default', 'Rookie', 0, 0),
  ('striker', 'Red Striker', 150, 1),
  ('adventurer', 'Adventurer', 200, 2),
  ('sky', 'Sky Blue', 250, 3),
  ('cat', 'Screaming Cat', 300, 4),
  ('curly', 'Curly', 350, 5),
  ('runner', 'Blue Runner', 400, 6),
  ('forward', 'Red Forward', 450, 7),
  ('detective', 'Detective Pig', 600, 8)
on conflict (id) do update
set name = excluded.name,
    price = excluded.price,
    sort = excluded.sort;

create or replace function public.buy_avatar(p_avatar text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  avatar_price integer;
  current_points integer;
  current_owned text[];
begin
  if current_user_id is null then
    raise exception 'not_signed_in';
  end if;

  select price
  into avatar_price
  from public.avatars
  where id = p_avatar;

  if not found then
    raise exception 'avatar_not_found';
  end if;

  select coalesce(points, 0), owned_avatars
  into current_points, current_owned
  from public.profiles
  where id = current_user_id
  for update;

  if not found then
    raise exception 'no_profile';
  end if;

  current_owned := coalesce(current_owned, array['default']::text[]);

  if p_avatar = any(current_owned) then
    raise exception 'already_owned';
  end if;

  if current_points < avatar_price then
    raise exception 'not_enough_points';
  end if;

  update public.profiles
  set points = current_points - avatar_price,
      owned_avatars = array_append(current_owned, p_avatar)
  where id = current_user_id;

  return current_points - avatar_price;
end;
$$;

create or replace function public.equip_avatar(p_avatar text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  current_owned text[];
begin
  if current_user_id is null then
    raise exception 'not_signed_in';
  end if;

  if not exists (
    select 1
    from public.avatars
    where id = p_avatar
  ) then
    raise exception 'avatar_not_found';
  end if;

  select owned_avatars
  into current_owned
  from public.profiles
  where id = current_user_id
  for update;

  if not found then
    raise exception 'no_profile';
  end if;

  if not (p_avatar = any(coalesce(current_owned, array[]::text[]))) then
    raise exception 'not_owned';
  end if;

  update public.profiles
  set avatar_id = p_avatar
  where id = current_user_id;
end;
$$;

revoke all on function public.buy_avatar(text) from public, anon;
grant execute on function public.buy_avatar(text) to authenticated;
revoke all on function public.equip_avatar(text) from public, anon;
grant execute on function public.equip_avatar(text) to authenticated;

notify pgrst, 'reload schema';
