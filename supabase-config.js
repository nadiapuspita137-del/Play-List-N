window.SUPABASE_CONFIG = {
  url: 'https://nagwpzkpxrbfxyuplclg.supabase.co',
  publishableKey: 'sb_publishable_94W120AdMfSw7Mp_8bS9_w_RnIbm467'
};

// Muat kontrol permission tambahan sebelum panel admin berjalan.
(() => {
  const scripts = ['admin-permissions.js', 'admin-quota-fix.js'];
  scripts.forEach((src) => {
    const script = document.createElement('script');
    script.src = src;
    script.defer = true;
    document.head.appendChild(script);
  });
})();
