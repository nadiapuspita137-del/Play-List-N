-- Mencatat user yang menambahkan lagu secara otomatis.
-- Jalankan SEKALI di Supabase SQL Editor setelah upgrade_admin_system.sql.
-- Lagu lama yang owner_id-nya masih NULL tidak ditebak dan tetap ditampilkan sebagai belum tercatat.

create or replace function public.set_song_owner_on_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.owner_id is null then
    new.owner_id := auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_song_owner_on_insert on public.songs;
create trigger trg_set_song_owner_on_insert
before insert on public.songs
for each row
execute function public.set_song_owner_on_insert();
