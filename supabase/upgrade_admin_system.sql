-- Upgrade role, kuota, kepemilikan lagu, dan statistik.
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists song_quota integer not null default 0 check(song_quota >= 0);
alter table public.profiles add column if not exists is_active boolean not null default true;
alter table public.profiles add constraint profiles_role_check check(role in ('super_admin','editor','viewer'));
alter table public.songs add column if not exists owner_id uuid references auth.users(id) on delete set null;

update public.profiles set role='super_admin', song_quota=999999 where role='admin';

create table if not exists public.song_events(
 id bigint generated always as identity primary key,
 song_id uuid references public.songs(id) on delete cascade,
 event_type text not null check(event_type in ('play','download')),
 session_id text,
 created_at timestamptz not null default now()
);
alter table public.song_events enable row level security;

create or replace function public.is_super_admin() returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from profiles where id=auth.uid() and role='super_admin' and is_active)
$$;
create or replace function public.is_staff() returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from profiles where id=auth.uid() and role in ('super_admin','editor') and is_active)
$$;
create or replace function public.can_add_song() returns boolean language sql stable security definer set search_path=public as $$
 select public.is_super_admin() or exists(select 1 from profiles p where p.id=auth.uid() and p.role='editor' and p.is_active and (select count(*) from songs s where s.owner_id=auth.uid()) < p.song_quota)
$$;

drop policy if exists "admin inserts songs" on songs; drop policy if exists "admin updates songs" on songs; drop policy if exists "admin deletes songs" on songs;
create policy "staff inserts owned songs" on songs for insert with check(public.can_add_song() and (public.is_super_admin() or owner_id=auth.uid()));
create policy "staff updates allowed songs" on songs for update using(public.is_super_admin() or owner_id=auth.uid()) with check(public.is_super_admin() or owner_id=auth.uid());
create policy "staff deletes allowed songs" on songs for delete using(public.is_super_admin() or owner_id=auth.uid());

drop policy if exists "user reads own profile" on profiles;
create policy "staff reads profiles" on profiles for select using(id=auth.uid() or public.is_super_admin());
create policy "owner inserts profiles" on profiles for insert with check(public.is_super_admin());
create policy "owner updates profiles" on profiles for update using(public.is_super_admin()) with check(public.is_super_admin());
create policy "public adds events" on song_events for insert with check(true);
create policy "staff reads events" on song_events for select using(public.is_staff());

drop policy if exists "admin uploads media" on storage.objects; drop policy if exists "admin updates media" on storage.objects; drop policy if exists "admin deletes media" on storage.objects;
create policy "staff uploads own media" on storage.objects for insert with check(bucket_id in ('audio','covers') and public.is_staff() and (public.is_super_admin() or (storage.foldername(name))[1]=auth.uid()::text));
create policy "staff updates own media" on storage.objects for update using(bucket_id in ('audio','covers') and (public.is_super_admin() or owner_id=auth.uid()));
create policy "staff deletes own media" on storage.objects for delete using(bucket_id in ('audio','covers') and (public.is_super_admin() or owner_id=auth.uid()));

create or replace view public.song_stats as select s.id,s.title,s.owner_id,count(*) filter(where e.event_type='play')::int plays,count(*) filter(where e.event_type='download')::int downloads from songs s left join song_events e on e.song_id=s.id group by s.id;
grant select on public.song_stats to authenticated;
