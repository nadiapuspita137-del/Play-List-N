(() => {
  // Tombol download khusus panel admin.
  // Admin/super admin boleh mengunduh SEMUA lagu yang tampil,
  // termasuk lagu yang ditandai Dilindungi.
  if (!/\/admin\.html(?:$|[?#])/.test(window.location.pathname + window.location.search + window.location.hash)) return;

  const localMediaUrl = (url) =>
    (url || '').replace(/^https:\/\/nadiapuspita137-del\.github\.io\/Play-List-N\//, '');

  const safeFileName = (value) =>
    String(value || 'lagu')
      .replace(/[\\/:*?"<>|]+/g, '-')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 150) || 'lagu';

  let adminDb = null;

  function getAdminDb() {
    if (adminDb) return adminDb;
    const cfg = window.SUPABASE_CONFIG;
    if (!cfg || !window.supabase) return null;
    adminDb = window.supabase.createClient(cfg.url, cfg.publishableKey, {
      auth: {
        storage: window.sessionStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    });
    return adminDb;
  }

  async function getAudioBlob(song) {
    if (Array.isArray(song.audio_parts) && song.audio_parts.length) {
      const responses = await Promise.all(
        song.audio_parts.map((part) => fetch(localMediaUrl(part))),
      );
      if (responses.some((response) => !response.ok)) {
        throw new Error('Ada bagian audio lama yang tidak dapat diambil.');
      }
      const buffers = await Promise.all(
        responses.map((response) => response.arrayBuffer()),
      );
      return new Blob(buffers, { type: 'audio/mpeg' });
    }

    if (!song.audio_url) throw new Error('File audio tidak tersedia.');
    const response = await fetch(song.audio_url);
    if (!response.ok) throw new Error('Gagal mengambil file audio.');
    return response.blob();
  }

  async function recordDownload(songId) {
    const db = getAdminDb();
    if (!db) return;
    try {
      await db.from('song_events').insert({
        song_id: String(songId),
        event_type: 'download',
        session_id: `admin-${sessionStorage.getItem('playlist_admin_session') || 'unknown'}`,
      });
    } catch (error) {
      console.warn('Statistik download admin gagal dicatat:', error);
    }
  }

  async function downloadSong(songId, button) {
    if (button.disabled) return;

    const db = getAdminDb();
    if (!db) {
      alert('Sistem database belum siap. Coba sebentar lagi.');
      return;
    }

    const original = button.innerHTML;
    button.disabled = true;
    button.innerHTML = 'Mengunduh…';

    try {
      // Tidak memakai pengecekan owner/allowed. Admin dapat mengunduh semua lagu
      // yang tampil di panel, termasuk baris yang bertuliskan "Dilindungi".
      const { data: song, error } = await db
        .from('songs')
        .select('id,title,artist,audio_url,audio_parts')
        .eq('id', songId)
        .maybeSingle();

      if (error) throw error;
      if (!song) throw new Error('Lagu tidak ditemukan atau akses ditolak.');

      const blob = await getAudioBlob(song);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${safeFileName(song.title)}${song.artist ? ` - ${safeFileName(song.artist)}` : ''}.mp3`;
      anchor.style.display = 'none';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30000);

      await recordDownload(song.id);
      button.innerHTML = '✓ Selesai';
      setTimeout(() => {
        button.innerHTML = original;
        button.disabled = false;
      }, 1200);
    } catch (error) {
      console.error('Download lagu gagal:', error);
      alert(`Download gagal: ${error.message || 'Terjadi kesalahan.'}`);
      button.innerHTML = original;
      button.disabled = false;
    }
  }

  function enhanceSongList() {
    document.querySelectorAll('#songList .song').forEach((row) => {
      const actions = row.querySelector('.actions');
      const songId = row.dataset.id;
      if (!actions || !songId || actions.querySelector('[data-admin-download]')) return;

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'btn ghost';
      button.dataset.adminDownload = '1';
      button.title = 'Download MP3';
      button.textContent = 'Download';
      button.addEventListener('click', () => downloadSong(songId, button));
      actions.appendChild(button);
    });
  }

  function init() {
    enhanceSongList();
    const list = document.getElementById('songList');
    if (!list) return setTimeout(init, 250);

    const observer = new MutationObserver(enhanceSongList);
    observer.observe(list, { childList: true, subtree: true });
  }

  // Jangan bergantung pada Supabase yang sudah selesai loading saat script ini
  // pertama kali dieksekusi. Database dibuat saat tombol benar-benar dipakai.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
