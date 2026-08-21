// Tampilkan siapa yang menambahkan setiap lagu di panel admin.
// Sumber identitas adalah songs.owner_id, lalu dicocokkan ke profiles.
(() => {
  let db = null;
  let installed = false;

  function getSongId(row) {
    const buttons = row.querySelectorAll('button[onclick]');
    for (const button of buttons) {
      const text = button.getAttribute('onclick') || '';
      const match = text.match(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i);
      if (match) return match[0];
    }
    return row.dataset.songId || null;
  }

  async function decorateSongs() {
    const list = document.getElementById('songList');
    if (!list || !db) return;
    const rows = Array.from(list.querySelectorAll('.song'));
    if (!rows.length) return;

    const rowMap = new Map();
    rows.forEach(row => {
      if (row.querySelector('.song-uploader')) return;
      const id = getSongId(row);
      if (id) rowMap.set(id, row);
    });
    if (!rowMap.size) return;

    const ids = [...rowMap.keys()];
    const { data: songs, error } = await db.from('songs').select('id,owner_id').in('id', ids);
    if (error || !songs) return;

    const ownerIds = [...new Set(songs.map(song => song.owner_id).filter(Boolean))];
    let profiles = [];
    if (ownerIds.length) {
      const result = await db.from('profiles').select('id,display_name,email').in('id', ownerIds);
      if (!result.error) profiles = result.data || [];
    }
    const profileMap = new Map(profiles.map(p => [p.id, p]));

    songs.forEach(song => {
      const row = rowMap.get(song.id);
      if (!row || row.querySelector('.song-uploader')) return;
      const profile = song.owner_id ? profileMap.get(song.owner_id) : null;
      const name = profile?.display_name || profile?.email || (song.owner_id ? 'User tidak ditemukan' : 'Belum tercatat');
      const shortId = song.owner_id ? `${song.owner_id.slice(0, 8)}...` : '-';
      const box = document.createElement('div');
      box.className = 'song-uploader';
      box.innerHTML = `<span>Ditambahkan oleh: <b>${escapeHtml(name)}</b></span><small>User ID: ${escapeHtml(shortId)}</small>`;
      const info = row.children[2] || row;
      info.appendChild(box);
    });
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  }

  function install() {
    if (installed) return true;
    db = window.getPlaylistSupabaseClient?.();
    if (!db) return false;
    installed = true;
    patchLoadSongs();
    setTimeout(decorateSongs, 900);
    return true;
  }

  function patchLoadSongs() {
    if (typeof window.loadSongs !== 'function' || window.__uploaderLoadSongsPatched) return;
    const original = window.loadSongs;
    window.loadSongs = async function (...args) {
      const result = await original.apply(this, args);
      setTimeout(decorateSongs, 50);
      return result;
    };
    window.__uploaderLoadSongsPatched = true;
  }

  function boot(attempt = 0) {
    if (install()) return;
    if (attempt < 20) setTimeout(() => boot(attempt + 1), 250);
  }

  const style = document.createElement('style');
  style.textContent = `.song-uploader{display:grid;gap:2px;margin-top:5px;color:#8fa29a;font-size:10px;font-weight:600}.song-uploader b{color:#bfead7}.song-uploader small{color:#667970;font-size:9px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}`;
  document.head.appendChild(style);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => boot());
  else boot();
})();
