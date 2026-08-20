// Fix tampilan kuota Owner: daftar admin harus dihitung setelah daftar lagu selesai dimuat.
// Sebelumnya showAdmin() memanggil loadAdmins() lebih dulu saat `songs` masih kosong,
// sehingga semua admin terlihat memakai 0 lagu meskipun kuotanya sudah terpakai.
(() => {
  const install = () => {
    if (typeof window.loadSongs !== 'function') return false;
    if (window.__quotaLoadSongsPatched) return true;

    const originalLoadSongs = window.loadSongs;
    window.loadSongs = async function (...args) {
      const result = await originalLoadSongs.apply(this, args);
      if (typeof window.loadAdmins === 'function') {
        await window.loadAdmins();
      }
      return result;
    };

    window.__quotaLoadSongsPatched = true;

    // Pengaman kecil untuk kondisi login yang terjadi bersamaan dengan pemuatan script.
    setTimeout(() => {
      if (typeof window.loadAdmins === 'function') window.loadAdmins();
    }, 1200);

    return true;
  };

  if (install()) return;
  let attempts = 0;
  const timer = setInterval(() => {
    attempts += 1;
    if (install() || attempts >= 20) clearInterval(timer);
  }, 100);
})();
