-- FINAL permission migration for current Play List N schema.
-- Prerequisite: supabase/upgrade_admin_system.sql must already be applied.
-- Current schema discovered from Supabase:
--   profiles.id = uuid
--   songs.id = uuid
--   songs.owner_id = uuid
--   storage.objects.owner_id = text
--   song_events.song_id = text

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

update public.profiles
set permissions = jsonb_build_object(
  'view_dashboard', true,
  'view_statistics', true,
  'view_songs', true,
  'add_song', true,
  'edit_song', true,
  'delete_song', true,
  'publish_song', true
)
where role = 'editor';

create or replace function public.has_permission(p_permission text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.is_super_admin()
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'editor'
        and p.is_active
        and coalesce((p.permissions ->> p_permission)::boolean, false)
    )
$$;

-- Remove policy variants created by earlier migrations so stale expressions do not survive.
do $$
declare
  r record;
begin
  for r in
    select schemaname, tablename, policyname
    from pg_policies
    where (schemaname = 'public' and tablename in ('profiles','songs','song_events'))
       or (schemaname = 'storage' and tablename = 'objects'
           and policyname in (
             'public reads media',
             'admin uploads media',
             'admin updates media',
             'admin deletes media',
             'staff uploads own media',
             'staff updates own media',
             'staff deletes own media'
           ))
  loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- Profiles
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

-- Songs
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
  or (owner_id = auth.uid() and public.has_permission('delete_song'))
);

-- Song events. song_events.song_id is TEXT, so explicitly cast the UUID song id to text.
create policy "staff reads events"
on public.song_events for select
using (public.is_super_admin() or public.has_permission('view_statistics'));

create policy "validated song events"
on public.song_events for insert
with check (
  event_type in ('play','download')
  and exists (
    select 1
    from public.songs s
    where s.id::text = song_events.song_id
  )
);

-- Storage objects.owner_id is TEXT in the current Supabase schema.
create policy "public reads media"
on storage.objects for select
using (bucket_id in ('audio','covers'));

create policy "staff uploads own media"
on storage.objects for insert
with check (
  bucket_id in ('audio','covers')
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
  bucket_id in ('audio','covers')
  and (
    public.is_super_admin()
    or (owner_id = auth.uid()::text and public.has_permission('edit_song'))
  )
);

create policy "staff deletes own media"
on storage.objects for delete
using (
  bucket_id in ('audio','covers')
  and (
    public.is_super_admin()
    or (owner_id = auth.uid()::text and public.has_permission('delete_song'))
  )
);

-- DB-level separation between edit and publish.
create or replace function public.enforce_song_permission_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_super_admin() then
    return new;
  end if;

  if new.owner_id is distinct from old.owner_id then
    raise exception 'Anda tidak boleh memindahkan kepemilikan lagu';
  end if;

  if new.is_active is distinct from old.is_active
     and not public.has_permission('publish_song') then
    raise exception 'Anda tidak memiliki izin untuk mempublikasikan atau menjadikan draft lagu';
  end if;

  if (
    new.title is distinct from old.title
    or new.artist is distinct from old.artist
    or new.album is distinct from old.album
    or new.genre is distinct from old.genre
    or new.year is distinct from old.year
    or new.audio_url is distinct from old.audio_url
    or new.audio_parts is distinct from old.audio_parts
    or new.audio_path is distinct from old.audio_path
    or new.cover_url is distinct from old.cover_url
    or new.cover_path is distinct from old.cover_path
    or new.duration_seconds is distinct from old.duration_seconds
    or new.lyrics_lrc is distinct from old.lyrics_lrc
    or new.sort_order is distinct from old.sort_order
  ) and not public.has_permission('edit_song') then
    raise exception 'Anda tidak memiliki izin untuk mengedit lagu';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_song_permission_changes on public.songs;
create trigger trg_enforce_song_permission_changes
before update on public.songs
for each row execute function public.enforce_song_permission_changes();
