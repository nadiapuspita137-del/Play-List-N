-- Security/performance hardening for Play List N.
-- Jalankan setelah:
--   1) supabase/upgrade_admin_system.sql
--   2) supabase/permissions_migration.sql
-- Jalankan sekali di Supabase SQL Editor.

-- 1. Index penting untuk query statistik dan daftar lagu.
create index if not exists idx_song_events_song_id
  on public.song_events(song_id);

create index if not exists idx_song_events_song_event_created
  on public.song_events(song_id, event_type, created_at desc);

create index if not exists idx_song_events_created_at
  on public.song_events(created_at desc);

create index if not exists idx_songs_owner_id
  on public.songs(owner_id);

create index if not exists idx_songs_sort_order
  on public.songs(sort_order);

create index if not exists idx_songs_active_sort_order
  on public.songs(is_active, sort_order);

-- 2. Validasi event statistik di level database.
-- Browser tetap boleh mencatat play/download tanpa login,
-- tetapi event harus menunjuk lagu yang benar dan tidak boleh dispam
-- berulang untuk song/session/type dalam jangka sangat pendek.
create or replace function public.can_record_song_event(
  p_song_id text,
  p_event_type text,
  p_session_id text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_song_id uuid;
  v_is_active boolean;
begin
  if p_event_type not in ('play', 'download') then
    return false;
  end if;

  if length(coalesce(p_session_id, '')) < 16
     or length(coalesce(p_session_id, '')) > 200 then
    return false;
  end if;

  begin
    v_song_id := p_song_id::uuid;
  exception when invalid_text_representation then
    return false;
  end;

  select is_active into v_is_active
  from public.songs
  where id = v_song_id;

  if not found then
    return false;
  end if;

  -- User publik hanya boleh mencatat aktivitas pada lagu publik.
  -- Staff/admin boleh mencatat download lagu protected yang memang terlihat
  -- dari panel admin.
  if not coalesce(v_is_active, false)
     and not public.is_staff() then
    return false;
  end if;

  -- Anti-spam sederhana: event identik dari session yang sama untuk lagu yang
  -- sama tidak boleh dicatat lebih dari sekali dalam 15 detik.
  if exists (
    select 1
    from public.song_events e
    where e.song_id = p_song_id
      and e.event_type = p_event_type
      and e.session_id = p_session_id
      and e.created_at > now() - interval '15 seconds'
  ) then
    return false;
  end if;

  return true;
end;
$$;

revoke all on function public.can_record_song_event(text, text, text) from public;

drop policy if exists "public adds events" on public.song_events;
drop policy if exists "validated song events" on public.song_events;

create policy "validated song events"
on public.song_events
for insert
with check (
  public.can_record_song_event(song_id, event_type, session_id)
);

-- 3. Trigger tambahan sebagai defense-in-depth.
-- Policy seharusnya menangkap insert normal, trigger tetap memblokir jalur
-- insert yang lolos dari asumsi policy di masa depan.
create or replace function public.validate_song_event_row()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.can_record_song_event(new.song_id, new.event_type, new.session_id) then
    raise exception 'Song event tidak valid atau terlalu sering dicatat';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_validate_song_event on public.song_events;
create trigger trg_validate_song_event
before insert on public.song_events
for each row
execute function public.validate_song_event_row();

-- 4. Izinkan client memanggil validasi sebagai helper tanpa membuka tabel.
grant execute on function public.can_record_song_event(text, text, text) to anon, authenticated;

-- Catatan penting:
-- Bucket audio/covers masih PUBLIC karena player publik saat ini mengakses
-- public URL secara langsung. Mengubah bucket menjadi PRIVATE sekarang akan
-- memutus playback existing. Migrasi ke signed URL harus dilakukan sebagai
-- pekerjaan terpisah, bersamaan dengan perubahan player publik.
