-- Permission matrix untuk admin/editor.
-- Jalankan setelah supabase/upgrade_admin_system.sql di Supabase SQL Editor.

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

-- Editor lama mendapat semua akses agar perubahan ini backward-compatible.
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

-- Hanya Owner yang boleh mengubah permission editor.
drop policy if exists "owner updates editor permissions" on public.profiles;
create policy "owner updates editor permissions"
on public.profiles for update
using (public.is_super_admin())
with check (public.is_super_admin());

-- Batasi pembacaan lagu milik editor berdasarkan akses Daftar Lagu.
drop policy if exists "public reads active songs" on public.songs;
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

-- Tambah lagu.
drop policy if exists "staff inserts owned songs" on public.songs;
create policy "staff inserts owned songs"
on public.songs for insert
with check (
  public.can_add_song()
  and (public.is_super_admin() or owner_id = auth.uid())
);

-- Update policy mengizinkan edit atau publish; trigger di bawah memisahkan kedua hak tersebut.
drop policy if exists "staff updates allowed songs" on public.songs;
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

-- Pisahkan hak Edit dan Publikasi pada level database.
create or replace function public.enforce_song_permission_changes()
returns trigger
language plpgsql security definer set search_path = public
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

-- Hapus lagu.
drop policy if exists "staff deletes allowed songs" on public.songs;
create policy "staff deletes allowed songs"
on public.songs for delete
using (
  public.is_super_admin()
  or (owner_id = auth.uid() and public.has_permission('delete_song'))
);

-- Statistik hanya bisa dibaca editor jika diberi akses Statistik.
drop policy if exists "staff reads events" on public.song_events;
create policy "staff reads events"
on public.song_events for select
using (public.is_super_admin() or public.has_permission('view_statistics'));

-- Storage: upload membutuhkan Tambah Lagu, update membutuhkan Edit, delete membutuhkan Hapus.
drop policy if exists "staff uploads own media" on storage.objects;
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

drop policy if exists "staff updates own media" on storage.objects;
create policy "staff updates own media"
on storage.objects for update
using (
  bucket_id in ('audio','covers')
  and (public.is_super_admin() or (owner_id = auth.uid() and public.has_permission('edit_song')))
);

drop policy if exists "staff deletes own media" on storage.objects;
create policy "staff deletes own media"
on storage.objects for delete
using (
  bucket_id in ('audio','covers')
  and (public.is_super_admin() or (owner_id = auth.uid() and public.has_permission('delete_song')))
);
