import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const auditAction = 'admin_password_reset';

type AdminClient = ReturnType<typeof createClient>;
type AuditStatus = 'started' | 'success' | 'failure';

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {...corsHeaders, 'Content-Type': 'application/json'},
  });
}

async function insertAudit(
  admin: AdminClient,
  requestId: string,
  actorUserId: string,
  targetUserId: string,
) {
  return admin.from('admin_security_audit').insert({
    request_id: requestId,
    action: auditAction,
    status: 'started' satisfies AuditStatus,
    reason_code: 'request_accepted',
    actor_user_id: actorUserId,
    target_user_id: targetUserId,
  });
}

async function finishAudit(
  admin: AdminClient,
  requestId: string,
  status: Exclude<AuditStatus, 'started'>,
  reasonCode: string,
) {
  const payload = {
    status,
    reason_code: reasonCode,
    completed_at: new Date().toISOString(),
  };
  const firstAttempt = await admin
    .from('admin_security_audit')
    .update(payload)
    .eq('request_id', requestId);
  if (!firstAttempt.error) return true;

  // Satu percobaan ulang agar audit tidak tertinggal berstatus "started"
  // akibat gangguan jaringan singkat.
  const secondAttempt = await admin
    .from('admin_security_audit')
    .update(payload)
    .eq('request_id', requestId);
  return !secondAttempt.error;
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', {headers: corsHeaders});
  if (request.method !== 'POST') return json({error: 'Metode tidak diizinkan.'}, 405);

  const requestId = crypto.randomUUID();
  let admin: AdminClient | null = null;
  let auditStarted = false;

  try {
    const authorization = request.headers.get('Authorization');
    if (!authorization?.startsWith('Bearer ')) {
      return json({error: 'Sesi Owner tidak ditemukan.'}, 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) {
      return json({error: 'Konfigurasi server belum lengkap.'}, 500);
    }

    admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {persistSession: false, autoRefreshToken: false},
    });
    const token = authorization.slice('Bearer '.length);
    const {data: {user}, error: userError} = await admin.auth.getUser(token);
    if (userError || !user) return json({error: 'Sesi Owner tidak valid.'}, 401);

    const {data: owner, error: ownerError} = await admin
      .from('profiles')
      .select('id,role,is_active')
      .eq('id', user.id)
      .maybeSingle();
    if (ownerError || owner?.role !== 'super_admin' || !owner.is_active) {
      return json({error: 'Hanya Owner aktif yang boleh mengubah password admin.'}, 403);
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch (_) {
      return json({error: 'Data permintaan tidak valid.'}, 400);
    }

    const targetUserId = String(body.target_user_id || '');
    const newPassword = String(body.new_password || '');
    if (!uuidPattern.test(targetUserId)) {
      return json({error: 'ID admin tidak valid.'}, 400);
    }
    if (newPassword.length < 8 || newPassword.length > 72) {
      return json({error: 'Password harus terdiri dari 8 sampai 72 karakter.'}, 400);
    }
    if (targetUserId === user.id) {
      return json({error: 'Gunakan menu Ubah Password untuk akun Owner sendiri.'}, 400);
    }

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const {count: recentAttempts, error: rateLimitError} = await admin
      .from('admin_security_audit')
      .select('id', {count: 'exact', head: true})
      .eq('actor_user_id', user.id)
      .eq('action', auditAction)
      .gte('created_at', fiveMinutesAgo);
    if (rateLimitError) {
      return json({error: 'Audit keamanan belum siap. Jalankan migrasi audit terlebih dahulu.'}, 503);
    }
    if ((recentAttempts || 0) >= 5) {
      return json({error: 'Terlalu banyak percobaan. Tunggu 5 menit lalu coba lagi.'}, 429);
    }

    const {data: target, error: targetError} = await admin
      .from('profiles')
      .select('id,role')
      .eq('id', targetUserId)
      .maybeSingle();
    if (targetError || !target || !['editor', 'viewer'].includes(target.role)) {
      return json({error: 'Akun Admin/Petugas tidak ditemukan.'}, 404);
    }

    const {error: auditError} = await insertAudit(admin, requestId, user.id, targetUserId);
    if (auditError) {
      return json({error: 'Audit keamanan gagal dibuat. Password tidak diubah.'}, 503);
    }
    auditStarted = true;

    // Hentikan sesi panel target lebih dulu. Jika langkah ini gagal, password
    // sengaja tidak diubah agar hasil operasi tidak setengah jalan.
    const {data: resetProfile, error: sessionResetError} = await admin
      .from('profiles')
      .update({
        current_session_token: null,
        last_session_reset_at: new Date().toISOString(),
      })
      .eq('id', targetUserId)
      .select('id')
      .maybeSingle();
    if (sessionResetError || !resetProfile) {
      await finishAudit(admin, requestId, 'failure', 'panel_session_reset_failed');
      return json({error: 'Sesi panel admin gagal dihentikan. Password tidak diubah.'}, 500);
    }

    const {error: updateError} = await admin.auth.admin.updateUserById(targetUserId, {
      password: newPassword,
    });
    if (updateError) {
      await finishAudit(admin, requestId, 'failure', 'auth_password_update_failed');
      return json({error: 'Password admin gagal diperbarui. Sesi panel telah dihentikan.'}, 400);
    }

    const auditRecorded = await finishAudit(
      admin,
      requestId,
      'success',
      'password_updated_session_reset',
    );
    return json({
      success: true,
      session_reset: true,
      audit_recorded: auditRecorded,
      request_id: requestId,
    });
  } catch (_) {
    if (admin && auditStarted) {
      await finishAudit(admin, requestId, 'failure', 'unexpected_error');
    }
    return json({error: 'Terjadi kesalahan saat memperbarui password admin.'}, 500);
  }
});
