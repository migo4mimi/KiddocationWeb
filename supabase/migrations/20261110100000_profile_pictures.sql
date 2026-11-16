alter table public.profiles
  add column if not exists profile_picture_path text;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'profile-pictures',
  'profile-pictures',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can read their own profile pictures"
  on storage.objects;
create policy "Users can read their own profile pictures"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'profile-pictures'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists "Users can upload their own profile pictures"
  on storage.objects;
create policy "Users can upload their own profile pictures"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'profile-pictures'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists "Users can update their own profile pictures"
  on storage.objects;
create policy "Users can update their own profile pictures"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'profile-pictures'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  )
  with check (
    bucket_id = 'profile-pictures'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists "Users can delete their own profile pictures"
  on storage.objects;
create policy "Users can delete their own profile pictures"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'profile-pictures'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create or replace function public.update_my_profile_picture(p_path text)
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

  if p_path is null
    or p_path !~ (
      '^' || current_user_id::text || '/[0-9a-f-]+\.(jpg|png|webp|gif)$'
    )
    or not exists (
      select 1
      from storage.objects
      where bucket_id = 'profile-pictures'
        and name = p_path
    )
  then
    raise exception 'invalid_profile_picture';
  end if;

  update public.profiles
  set profile_picture_path = p_path
  where id = current_user_id;

  if not found then
    raise exception 'no_profile';
  end if;
end;
$$;

revoke all on function public.update_my_profile_picture(text) from public, anon;
grant execute on function public.update_my_profile_picture(text) to authenticated;

notify pgrst, 'reload schema';
