(() => {
  // Tombol download khusus panel admin.
  // Tidak ada pembatas owner di sini: semua lagu yang tampil di daftar admin
  // dapat diunduh, termasuk lagu berstatus "Dilindungi".

  const localMediaUrl = (url) =>
    (url || '').replace(
      /^https:\/\/nadiapuspita137-del\.github\.io\/Play-List-N\//,
      '',
    );

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
    if (!cfg || !window.supabase?.createClient) return null;
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
      alert('Database belum siap. Coba lagi sebentar.');
      return;
    }

    const original = button.textContent;
    button.disabled = true;
    button.textContent = 'Mengunduh…';

    try {
      // Sengaja tidak mengecek owner/allowed. Admin boleh download semua lagu.
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
      button.textContent = '✓ Selesai';
      setTimeout(() => {
        button.textContent = original;
        button.disabled = false;
      }, 1200);
    } catch (error) {
      console.error('Download lagu gagal:', error);
      alert(`Download gagal: ${error.message || 'Terjadi kesalahan.'}`);
      button.textContent = original;
      button.disabled = false;
    }
  }

  function addDownloadButtons() {
    const list = document.getElementById('songList');
    if (!list) return false;

    list.querySelectorAll('.song[data-id]').forEach((row) => {
      const actions = row.querySelector('.actions');
      const songId = row.getAttribute('data-id');
      if (!actions || !songId || actions.querySelector('[data-admin-download]')) return;

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'btn ghost admin-download-button';
      button.dataset.adminDownload = '1';
      button.title = 'Download MP3';
      button.textContent = 'Download';
      button.addEventListener('click', () => downloadSong(songId, button));
      actions.appendChild(button);
    });

    return true;
  }

  function start() {
    // render() milik admin.html mengosongkan dan membuat ulang songList,
    // jadi MutationObserver memastikan tombol selalu muncul setelah render/search.
    addDownloadButtons();
    const list = document.getElementById('songList');
    if (list && !list.dataset.downloadObserver) {
      list.dataset.downloadObserver = '1';
      new MutationObserver(addDownloadButtons).observe(list, {
        childList: true,
        subtree: true,
      });
    }
  }

  // Supabase-config memuat file ini secara defer. Tunggu DOM tanpa bergantung
  // pada urutan eksekusi script lain.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }

  // Fallback untuk kasus panel membuat #songList setelah login.
  const retry = setInterval(() => {
    if (document.getElementById('songList')) {
      start();
      clearInterval(retry);
    }
  }, 250);
  setTimeout(() => clearInterval(retry), 30000);
})();
