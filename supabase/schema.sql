-- Jalankan seluruh file ini sekali di Supabase SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'viewer' check (role in ('admin','viewer')),
  created_at timestamptz not null default now()
);

create table if not exists public.songs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  artist text not null default 'Unknown Artist',
  album text,
  genre text,
  year integer,
  audio_url text not null,
  audio_parts jsonb,
  audio_path text,
  cover_url text,
  cover_path text,
  duration_seconds integer not null default 0,
  lyrics_lrc text not null default '',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin') $$;

alter table public.profiles enable row level security;
alter table public.songs enable row level security;

drop policy if exists "public reads active songs" on public.songs;
create policy "public reads active songs" on public.songs for select using (is_active or public.is_admin());
drop policy if exists "admin inserts songs" on public.songs;
create policy "admin inserts songs" on public.songs for insert with check (public.is_admin());
drop policy if exists "admin updates songs" on public.songs;
create policy "admin updates songs" on public.songs for update using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin deletes songs" on public.songs;
create policy "admin deletes songs" on public.songs for delete using (public.is_admin());
drop policy if exists "user reads own profile" on public.profiles;
create policy "user reads own profile" on public.profiles for select using (id = auth.uid());

insert into storage.buckets (id,name,public) values ('audio','audio',true) on conflict (id) do update set public=true;
insert into storage.buckets (id,name,public) values ('covers','covers',true) on conflict (id) do update set public=true;
drop policy if exists "public reads media" on storage.objects;
create policy "public reads media" on storage.objects for select using (bucket_id in ('audio','covers'));
drop policy if exists "admin uploads media" on storage.objects;
create policy "admin uploads media" on storage.objects for insert with check (bucket_id in ('audio','covers') and public.is_admin());
drop policy if exists "admin updates media" on storage.objects;
create policy "admin updates media" on storage.objects for update using (bucket_id in ('audio','covers') and public.is_admin());
drop policy if exists "admin deletes media" on storage.objects;
create policy "admin deletes media" on storage.objects for delete using (bucket_id in ('audio','covers') and public.is_admin());

-- Setelah membuat user admin di Authentication > Users, jalankan:
-- insert into public.profiles (id, role) values ('UUID_USER_ADMIN', 'admin');
