window.SUPABASE_CONFIG = {
  url: 'https://nagwpzkpxrbfxyuplclg.supabase.co',
  publishableKey: 'sb_publishable_94W120AdMfSw7Mp_8bS9_w_RnIbm467'
};

// Satu instance Supabase per halaman agar Auth tidak berebut storage/session.
(() => {
  let sharedClient = null;

  window.getPlaylistSupabaseClient = () => {
    if (sharedClient) return sharedClient;
    const cfg = window.SUPABASE_CONFIG;
    if (!cfg?.url || !cfg?.publishableKey || !window.supabase?.createClient) return null;
    sharedClient = window.supabase.createClient(cfg.url, cfg.publishableKey, {
      auth: {
        storage: window.sessionStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      global: { headers: { 'x-client-info': 'playlist-web' } },
    });
    return sharedClient;
  };

  // Membuat akun tanpa membuat GoTrueClient kedua dan tanpa mengganti sesi Owner.
  window.createAuthUserWithoutSession = async ({ email, password }) => {
    const cfg = window.SUPABASE_CONFIG;
    try {
      const response = await fetch(`${cfg.url}/auth/v1/signup`, {
        method: 'POST',
        headers: {
          apikey: cfg.publishableKey,
          Authorization: `Bearer ${cfg.publishableKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error_description || payload.msg || payload.message || payload.error || 'Gagal membuat akun.');
      }
      const user = payload.user || (payload.id ? payload : null);
      if (!user?.id) throw new Error('Akun dibuat tetapi data pengguna tidak diterima.');
      return { data: { user }, error: null };
    } catch (error) {
      return { data: { user: null }, error };
    }
  };
})();

// Muat kontrol permission dan penyempurnaan panel admin.
(() => {
  if (!/(^|\/)admin\.html$/.test(window.location.pathname)) return;
  const scripts = [
    'admin-permissions.js?v=8',
    'admin-quota-fix.js',
    'admin-uploader.js?v=2',
    'admin-download.js?v=2'
  ];
  scripts.forEach((src) => {
    const script = document.createElement('script');
    script.src = src;
    script.defer = true;
    document.head.appendChild(script);
  });
})();
