import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {...corsHeaders, 'Content-Type': 'application/json'},
  });
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', {headers: corsHeaders});
  if (request.method !== 'POST') return json({error: 'Metode tidak diizinkan.'}, 405);

  try {
    const authorization = request.headers.get('Authorization');
    if (!authorization?.startsWith('Bearer ')) return json({error: 'Sesi Owner tidak ditemukan.'}, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) return json({error: 'Konfigurasi server belum lengkap.'}, 500);

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {persistSession: false, autoRefreshToken: false},
    });
    const token = authorization.slice('Bearer '.length);
    const {data: {user}, error: userError} = await admin.auth.getUser(token);
    if (userError || !user) return json({error: 'Sesi Owner tidak valid.'}, 401);

    const {data: owner} = await admin
      .from('profiles')
      .select('id,role,is_active')
      .eq('id', user.id)
      .maybeSingle();
    if (owner?.role !== 'super_admin' || !owner.is_active) {
      return json({error: 'Hanya Owner aktif yang boleh mengubah password admin.'}, 403);
    }

    const body = await request.json();
    const targetUserId = String(body?.target_user_id || '');
    const newPassword = String(body?.new_password || '');
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(targetUserId)) {
      return json({error: 'ID admin tidak valid.'}, 400);
    }
    if (newPassword.length < 8 || newPassword.length > 72) {
      return json({error: 'Password harus terdiri dari 8 sampai 72 karakter.'}, 400);
    }
    if (targetUserId === user.id) {
      return json({error: 'Gunakan menu Ubah Password untuk akun Owner sendiri.'}, 400);
    }

    const {data: target} = await admin
      .from('profiles')
      .select('id,role')
      .eq('id', targetUserId)
      .maybeSingle();
    if (!target || !['editor', 'viewer'].includes(target.role)) {
      return json({error: 'Akun Admin/Petugas tidak ditemukan.'}, 404);
    }

    const {error: updateError} = await admin.auth.admin.updateUserById(targetUserId, {
      password: newPassword,
    });
    if (updateError) return json({error: 'Password admin gagal diperbarui.'}, 400);

    await admin
      .from('profiles')
      .update({current_session_token: null})
      .eq('id', targetUserId);

    return json({success: true});
  } catch (_) {
    return json({error: 'Terjadi kesalahan saat memperbarui password admin.'}, 500);
  }
});
