alter table public.profiles
  add column if not exists rank_points integer not null default 0;

create table if not exists public.ranked_point_history (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  points integer not null check (points > 0),
  awarded_at timestamptz not null default now()
);

create index if not exists ranked_point_history_user_awarded_at_idx
  on public.ranked_point_history (user_id, awarded_at desc);

alter table public.ranked_point_history enable row level security;
revoke all on public.ranked_point_history from public, anon, authenticated;

create or replace function public.track_ranked_point_history()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  points_earned integer;
begin
  if tg_op = 'INSERT' then
    points_earned := greatest(0, coalesce(new.rank_points, 0));
  else
    points_earned := greatest(
      0,
      coalesce(new.rank_points, 0) - coalesce(old.rank_points, 0)
    );
  end if;

  if points_earned > 0 then
    insert into public.ranked_point_history (user_id, points)
    values (new.id, points_earned);
  end if;

  return new;
end;
$$;

drop trigger if exists track_ranked_point_history on public.profiles;
create trigger track_ranked_point_history
  after insert or update of rank_points on public.profiles
  for each row
  execute function public.track_ranked_point_history();

create or replace function public.leaderboard(p_period text)
returns table (
  place bigint,
  user_id uuid,
  name text,
  avatar_id text,
  level integer,
  points bigint,
  games bigint,
  is_me boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'not_signed_in';
  end if;
  if p_period is null or p_period not in ('month', 'all') then
    raise exception 'invalid_leaderboard_period';
  end if;

  return query
  with selected_points as (
    select
      p.id,
      p.name,
      null::text as avatar_id,
      coalesce(p.xp, 0) as xp,
      case
        when p_period = 'all' then coalesce(p.rank_points, 0)::bigint
        else coalesce((
          select sum(h.points)
          from public.ranked_point_history h
          where h.user_id = p.id
            and h.awarded_at >= date_trunc('month', now())
        ), 0)::bigint
      end as points,
      case
        when p_period = 'all' then (
          select count(*)
          from public.ranked_point_history h
          where h.user_id = p.id
        )
        else (
          select count(*)
          from public.ranked_point_history h
          where h.user_id = p.id
            and h.awarded_at >= date_trunc('month', now())
        )
      end as games
    from public.profiles p
    where coalesce(p.role, 'student') = 'student'
  ),
  eligible as (
    select sp.*
    from selected_points sp
    where sp.points > 0
  ),
  numbered as (
    select
      row_number() over (order by e.points desc, e.id) as place,
      e.id as user_id,
      coalesce(nullif(btrim(e.name), ''), 'Player') as name,
      e.avatar_id,
      e.xp,
      e.points,
      e.games
    from eligible e
  ),
  visible as (
    select n.*
    from numbered n
    where n.place <= 50 or n.user_id = current_user_id
  ),
  levels as (
    select
      v.*,
      1 + (
        select count(*)::integer
        from generate_series(1, 1000) as levels(level_number)
        where v.xp >= (level_number * (100 + 25 * (level_number - 1)))
      ) as player_level
    from visible v
  )
  select
    l.place,
    l.user_id,
    l.name,
    l.avatar_id,
    l.player_level,
    l.points,
    l.games,
    l.user_id = current_user_id
  from levels l
  order by l.place;
end;
$$;

revoke all on function public.track_ranked_point_history() from public, anon, authenticated;
revoke all on function public.leaderboard(text) from public, anon;
grant execute on function public.leaderboard(text) to authenticated;

notify pgrst, 'reload schema';
