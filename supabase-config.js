window.SUPABASE_CONFIG = {
  url: 'https://nagwpzkpxrbfxyuplclg.supabase.co',
  publishableKey: 'sb_publishable_94W120AdMfSw7Mp_8bS9_w_RnIbm467'
};

// Muat kontrol permission tambahan sebelum panel admin berjalan.
(() => {
  const script = document.createElement('script');
  script.src = 'admin-permissions.js';
  script.defer = true;
  document.head.appendChild(script);
})();
