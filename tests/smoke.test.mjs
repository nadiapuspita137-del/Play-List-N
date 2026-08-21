import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {existsSync, readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const read = path => readFileSync(resolve(root, path), 'utf8');

const browserScripts = [
  'supabase-config.js',
  'admin-permissions.js',
  'admin-uploader.js',
  'admin-download.js',
  'admin-nested-detail.js',
];

const legacyScripts = [
  'admin-adminlist-clean.js',
  'admin-quota-fix.js',
  'admin-ui-compact.js',
  'admin-ui-fix.js',
];

function inlineScripts(html) {
  return [...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)]
    .filter(([, attributes, source]) => !/\bsrc\s*=/.test(attributes) && source.trim())
    .map(([, , source]) => source);
}

function localScriptSources(html) {
  return [...html.matchAll(/<script[^>]+src=["']([^"']+)["'][^>]*>/gi)]
    .map(([, source]) => source)
    .filter(source => !/^(?:https?:)?\/\//.test(source))
    .map(source => source.split('?')[0]);
}

test('entrypoint dan script aktif tersedia', () => {
  for (const path of ['index.html', 'admin.html', ...browserScripts]) {
    assert.equal(existsSync(resolve(root, path)), true, `${path} tidak ditemukan`);
  }
});

test('JavaScript browser dan inline HTML valid secara sintaks', () => {
  for (const path of browserScripts) {
    assert.doesNotThrow(() => new Function(read(path)), `${path} gagal diparse`);
  }
  for (const htmlPath of ['index.html', 'admin.html']) {
    inlineScripts(read(htmlPath)).forEach((source, index) => {
      assert.doesNotThrow(
        () => new Function(source),
        `${htmlPath} inline script ${index + 1} gagal diparse`,
      );
    });
  }
});

test('semua referensi script lokal menunjuk ke file yang ada', () => {
  for (const htmlPath of ['index.html', 'admin.html']) {
    for (const source of localScriptSources(read(htmlPath))) {
      assert.equal(existsSync(resolve(root, source)), true, `${htmlPath} memuat ${source} yang tidak ada`);
    }
  }

  const config = read('supabase-config.js');
  for (const script of ['admin-permissions.js', 'admin-uploader.js', 'admin-download.js']) {
    assert.match(config, new RegExp(`['"]${script.replace('.', '\\.')}\\?v=\\d+['"]`));
  }
});

test('script admin lama tidak kembali', () => {
  const activeSources = [read('admin.html'), read('supabase-config.js')].join('\n');
  for (const script of legacyScripts) {
    assert.equal(existsSync(resolve(root, script)), false, `${script} seharusnya sudah dihapus`);
    assert.equal(activeSources.includes(script), false, `${script} masih direferensikan`);
  }
});

test('panel admin memakai satu Supabase client bersama', () => {
  const config = read('supabase-config.js');
  const adminSources = [read('admin.html'), ...browserScripts.slice(1).map(read)].join('\n');
  assert.equal((config.match(/supabase\.createClient/g) || []).length, 1);
  assert.equal(adminSources.includes('supabase.createClient'), false);
  assert.match(config, /window\.getPlaylistSupabaseClient\s*=/);
  assert.match(read('admin.html'), /window\.getPlaylistSupabaseClient\(\)/);
});

test('nested admin detail tetap terhubung dan handler lama hilang', () => {
  const html = read('admin.html');
  const detail = read('admin-nested-detail.js');
  assert.match(html, /data-manage-admin=/);
  assert.match(detail, /closest\('\[data-manage-admin\]'\)/);
  assert.match(detail, /ownerPasswordForm'[)]\.addEventListener\('submit', resetAdminPassword\)/);
  assert.equal(html.includes('window.toggleAdmin ='), false);
  assert.equal(html.includes('window.updateAdminQuota ='), false);
});

test('daftar admin dimuat setelah data lagu tersedia', () => {
  const html = read('admin.html');
  const start = html.indexOf('async function showAdmin(user)');
  const end = html.indexOf('$("loginForm").onsubmit', start);
  const showAdmin = html.slice(start, end);
  assert.ok(start > -1 && end > start, 'fungsi showAdmin tidak ditemukan');
  assert.ok(showAdmin.indexOf('await loadSongs();') < showAdmin.indexOf('await loadAdmins();'));
});

test('secret service-role tidak berada di bundle browser', () => {
  const browserSources = [
    read('index.html'),
    read('admin.html'),
    ...browserScripts.map(read),
  ].join('\n');
  assert.equal(/SUPABASE_SERVICE_ROLE_KEY|serviceRoleKey|sb_secret_/i.test(browserSources), false);
});

test('Edge Function reset password valid dan menjaga urutan keamanan', () => {
  const path = resolve(root, 'supabase/functions/admin-reset-password/index.ts');
  const check = spawnSync(process.execPath, ['--experimental-strip-types', '--check', path], {
    encoding: 'utf8',
  });
  assert.equal(check.status, 0, check.stderr || check.stdout);

  const edge = read('supabase/functions/admin-reset-password/index.ts');
  const auditAt = edge.indexOf('insertAudit(admin, requestId');
  const sessionAt = edge.indexOf('current_session_token: null');
  const passwordAt = edge.indexOf('admin.auth.admin.updateUserById');
  assert.ok(auditAt > -1 && auditAt < sessionAt && sessionAt < passwordAt);
  assert.match(edge, /owner\?\.role !== 'super_admin'/);
  assert.match(edge, /'X-Function-Version': functionVersion/);
  assert.match(read('supabase/config.toml'), /verify_jwt\s*=\s*true/);
});

test('SQL audit memakai RLS dan grant service-role eksplisit', () => {
  const sql = read('supabase/admin_security_audit.sql');
  assert.match(sql, /alter table public\.admin_security_audit enable row level security/i);
  assert.match(sql, /revoke all on table public\.admin_security_audit from anon, authenticated/i);
  assert.match(sql, /using \(public\.is_super_admin\(\)\)/i);
  assert.match(sql, /grant select, insert, update on table public\.admin_security_audit to service_role/i);
  assert.match(sql, /grant usage, select on sequence public\.admin_security_audit_id_seq to service_role/i);
});

test('ID statis pada setiap halaman tidak duplikat', () => {
  for (const htmlPath of ['index.html', 'admin.html']) {
    const markup = read(htmlPath)
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '');
    const ids = [...markup.matchAll(/\bid=["']([^"']+)["']/gi)].map(([, id]) => id);
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
    assert.deepEqual([...new Set(duplicates)], [], `${htmlPath} memiliki ID duplikat`);
  }
});
