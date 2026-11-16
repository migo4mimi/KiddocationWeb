create table if not exists public.teacher_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null default '',
  email text not null default '',
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references auth.users (id) on delete set null
);

create index if not exists teacher_requests_status_created_at_idx
  on public.teacher_requests (status, created_at desc);

create unique index if not exists teacher_requests_one_pending_per_user_idx
  on public.teacher_requests (user_id)
  where status = 'pending';

alter table public.teacher_requests enable row level security;

grant select on public.teacher_requests to authenticated;

drop policy if exists "Users can read their own teacher requests"
  on public.teacher_requests;
create policy "Users can read their own teacher requests"
  on public.teacher_requests
  for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Admins can read all teacher requests"
  on public.teacher_requests;
create policy "Admins can read all teacher requests"
  on public.teacher_requests
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.role = 'admin'
    )
  );

create or replace function public.capture_teacher_signup_request()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.raw_user_meta_data ->> 'wants_teacher' = 'true' then
    insert into public.teacher_requests (user_id, name, email)
    values (
      new.id,
      coalesce(new.raw_user_meta_data ->> 'name', ''),
      coalesce(new.email, '')
    )
    on conflict (user_id) where status = 'pending' do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists capture_teacher_signup_request on auth.users;
create trigger capture_teacher_signup_request
  after insert on auth.users
  for each row
  execute function public.capture_teacher_signup_request();

insert into public.teacher_requests (user_id, name, email)
select
  users.id,
  coalesce(users.raw_user_meta_data ->> 'name', ''),
  coalesce(users.email, '')
from auth.users as users
left join public.profiles as profiles on profiles.id = users.id
where users.raw_user_meta_data ->> 'wants_teacher' = 'true'
  and coalesce(profiles.role, '') not in ('teacher', 'admin')
  and not exists (
    select 1
    from public.teacher_requests as requests
    where requests.user_id = users.id
  )
on conflict (user_id) where status = 'pending' do nothing;

create or replace function public.request_teacher_access()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  request_id uuid;
  display_name text;
  user_email text;
begin
  if current_user_id is null then
    raise exception 'not_signed_in';
  end if;

  if exists (
    select 1
    from public.profiles
    where id = current_user_id
      and role in ('admin', 'teacher')
  ) then
    raise exception 'already_staff';
  end if;

  select
    coalesce(profiles.name, users.raw_user_meta_data ->> 'name', ''),
    coalesce(users.email, '')
  into display_name, user_email
  from auth.users as users
  left join public.profiles as profiles on profiles.id = users.id
  where users.id = current_user_id;

  if not found then
    raise exception 'request_not_found';
  end if;

  insert into public.teacher_requests (user_id, name, email)
  values (current_user_id, display_name, user_email)
  returning id into request_id;

  return request_id;
exception
  when unique_violation then
    raise exception 'already_pending';
end;
$$;

create or replace function public.review_teacher_request(
  p_request uuid,
  p_approve boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  requested_user_id uuid;
  request_status text;
begin
  if not exists (
    select 1
    from public.profiles
    where id = current_user_id
      and role = 'admin'
  ) then
    raise exception 'not_admin';
  end if;

  select user_id, status
  into requested_user_id, request_status
  from public.teacher_requests
  where id = p_request
  for update;

  if not found then
    raise exception 'request_not_found';
  end if;

  if request_status <> 'pending' then
    raise exception 'already_decided';
  end if;

  if p_approve then
    update public.profiles
    set role = 'teacher'
    where id = requested_user_id;

    if not found then
      raise exception 'no_profile';
    end if;
  end if;

  update public.teacher_requests
  set
    status = case when p_approve then 'approved' else 'rejected' end,
    decided_at = now(),
    decided_by = current_user_id
  where id = p_request;
end;
$$;

create or replace function public.revoke_teacher(p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if not exists (
    select 1
    from public.profiles
    where id = current_user_id
      and role = 'admin'
  ) then
    raise exception 'not_admin';
  end if;

  if p_user = current_user_id then
    raise exception 'cannot_change_self';
  end if;

  update public.profiles
  set role = 'student'
  where id = p_user
    and role = 'teacher';

  if not found then
    raise exception 'not_a_teacher';
  end if;
end;
$$;

revoke all on function public.request_teacher_access() from public, anon;
revoke all on function public.review_teacher_request(uuid, boolean)
  from public, anon;
revoke all on function public.revoke_teacher(uuid) from public, anon;

grant execute on function public.request_teacher_access() to authenticated;
grant execute on function public.review_teacher_request(uuid, boolean)
  to authenticated;
grant execute on function public.revoke_teacher(uuid) to authenticated;

notify pgrst, 'reload schema';
