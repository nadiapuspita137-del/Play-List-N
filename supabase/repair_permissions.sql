-- Emergency repair for current Play List N database schema.
-- Run AFTER upgrade_admin_system.sql.
-- This file only resets permission policies. It intentionally avoids
-- the older migration's mixed-type expressions.

-- Drop all known old policies.
drop policy if exists "public reads active songs" on public.songs;
drop policy if exists "admin inserts songs" on public.songs;
drop policy if exists "admin updates songs" on public.songs;
drop policy if exists "admin deletes songs" on public.songs;
drop policy if exists "staff inserts owned songs" on public.songs;
drop policy if exists "staff updates allowed songs" on public.songs;
drop policy if exists "staff deletes allowed songs" on public.songs;

drop policy if exists "user reads own profile" on public.profiles;
drop policy if exists "staff reads profiles" on public.profiles;
drop policy if exists "owner reads all profiles" on public.profiles;
drop policy if exists "owner inserts profiles" on public.profiles;
drop policy if exists "owner updates profiles" on public.profiles;

drop policy if exists "public adds events" on public.song_events;
drop policy if exists "validated song events" on public.song_events;
drop policy if exists "staff reads events" on public.song_events;

drop policy if exists "public reads media" on storage.objects;
drop policy if exists "admin uploads media" on storage.objects;
drop policy if exists "admin updates media" on storage.objects;
drop policy if exists "admin deletes media" on storage.objects;
drop policy if exists "staff uploads own media" on storage.objects;
drop policy if exists "staff updates own media" on storage.objects;
drop policy if exists "staff deletes own media" on storage.objects;

-- Permission column/function.
alter table public.profiles
  add column if not exists permissions jsonb not null default jsonb_build_object(
    'view_dashboard', true,
    'view_statistics', true,
    'view_songs', true,
    'add_song', true,
    'edit_song', true,
    'delete_song', true,
    'publish_song', true
  );

create or replace function public.has_permission(p_permission text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_super_admin()
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'editor'
      and p.is_active
      and coalesce((p.permissions ->> p_permission)::boolean, false)
  );
$$;

-- Profiles: UUID = UUID.
create policy "user reads own profile"
on public.profiles for select
using (id = auth.uid());

create policy "owner reads all profiles"
on public.profiles for select
using (public.is_super_admin());

create policy "owner inserts profiles"
on public.profiles for insert
with check (public.is_super_admin());

create policy "owner updates profiles"
on public.profiles for update
using (public.is_super_admin())
with check (public.is_super_admin());

-- Songs: UUID = UUID.
create policy "public reads active songs"
on public.songs for select
using (
  is_active = true
  or (
    public.is_staff()
    and public.has_permission('view_songs')
    and (public.is_super_admin() or owner_id = auth.uid())
  )
);

create policy "staff inserts owned songs"
on public.songs for insert
with check (
  public.can_add_song()
  and (public.is_super_admin() or owner_id = auth.uid())
);

create policy "staff updates allowed songs"
on public.songs for update
using (
  public.is_super_admin()
  or (
    owner_id = auth.uid()
    and (public.has_permission('edit_song') or public.has_permission('publish_song'))
  )
)
with check (
  public.is_super_admin()
  or (
    owner_id = auth.uid()
    and (public.has_permission('edit_song') or public.has_permission('publish_song'))
  )
);

create policy "staff deletes allowed songs"
on public.songs for delete
using (
  public.is_super_admin()
  or (
    owner_id = auth.uid()
    and public.has_permission('delete_song')
  )
);

-- song_events.song_id is TEXT; compare TEXT to TEXT.
create policy "staff reads events"
on public.song_events for select
using (public.is_super_admin() or public.has_permission('view_statistics'));

create policy "validated song events"
on public.song_events for insert
with check (
  event_type in ('play', 'download')
  and exists (
    select 1
    from public.songs s
    where s.id::text = song_events.song_id
  )
);

-- storage.objects.owner_id is TEXT; auth.uid() is UUID.
-- Explicitly cast auth.uid() to TEXT here.
create policy "public reads media"
on storage.objects for select
using (bucket_id in ('audio', 'covers'));

create policy "staff uploads own media"
on storage.objects for insert
with check (
  bucket_id in ('audio', 'covers')
  and public.is_staff()
  and public.has_permission('add_song')
  and (
    public.is_super_admin()
    or (storage.foldername(name))[1] = auth.uid()::text
  )
);

create policy "staff updates own media"
on storage.objects for update
using (
  bucket_id in ('audio', 'covers')
  and (
    public.is_super_admin()
    or (owner_id = auth.uid()::text and public.has_permission('edit_song'))
  )
);

create policy "staff deletes own media"
on storage.objects for delete
using (
  bucket_id in ('audio', 'covers')
  and (
    public.is_super_admin()
    or (owner_id = auth.uid()::text and public.has_permission('delete_song'))
  )
);

select 'PERMISSIONS REPAIRED' as status;
