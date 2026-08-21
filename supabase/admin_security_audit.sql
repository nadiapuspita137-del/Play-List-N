-- Jalankan setelah supabase/upgrade_admin_system.sql.
-- Audit ini hanya mencatat metadata operasi. Password, token sesi, alamat IP,
-- dan isi rahasia lain tidak pernah disimpan.

alter table public.profiles
  add column if not exists last_session_reset_at timestamptz;

create table if not exists public.admin_security_audit (
  id bigint generated always as identity primary key,
  request_id uuid not null unique,
  action text not null check (action in ('admin_password_reset')),
  status text not null check (status in ('started', 'success', 'failure')),
  reason_code text not null check (
    length(reason_code) between 3 and 64
    and reason_code ~ '^[a-z0-9_]+$'
  ),
  actor_user_id uuid,
  target_user_id uuid,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists admin_security_audit_actor_created_idx
  on public.admin_security_audit (actor_user_id, created_at desc);
create index if not exists admin_security_audit_target_created_idx
  on public.admin_security_audit (target_user_id, created_at desc);
create index if not exists admin_security_audit_status_created_idx
  on public.admin_security_audit (status, created_at desc);

alter table public.admin_security_audit enable row level security;

-- Edge Function memakai service-role dan tetap dapat menulis. Browser tidak
-- memperoleh izin INSERT/UPDATE/DELETE; Owner aktif hanya boleh membaca.
revoke all on table public.admin_security_audit from anon, authenticated;
grant select on table public.admin_security_audit to authenticated;

drop policy if exists "owner reads security audit" on public.admin_security_audit;
create policy "owner reads security audit"
  on public.admin_security_audit
  for select
  to authenticated
  using (public.is_super_admin());

comment on table public.admin_security_audit is
  'Audit perubahan keamanan admin tanpa password, token sesi, IP, atau rahasia mentah.';
comment on column public.admin_security_audit.reason_code is
  'Kode hasil aman untuk pencarian dan investigasi; bukan pesan error mentah.';
