(() => {
  let db = null;
  let profile = null;
  let ready = false;
  let songSortOrder = 'none';
  const DEFAULTS = {
    view_dashboard: true,
    view_statistics: true,
    view_songs: true,
    add_song: true,
    edit_song: true,
    delete_song: true,
    publish_song: true,
  };
  const LABELS = {
    view_dashboard: ['Beranda', 'Bisa membuka dashboard dan ringkasan.'],
    view_statistics: ['Statistik', 'Bisa melihat statistik play/download.'],
    view_songs: ['Daftar Lagu', 'Bisa melihat koleksi lagu miliknya.'],
    add_song: ['Tambah Lagu', 'Bisa mengunggah dan membuat lagu baru.'],
    edit_song: ['Edit Lagu', 'Bisa mengubah metadata, lirik, cover, dan audio.'],
    delete_song: ['Hapus Lagu', 'Bisa menghapus lagu miliknya.'],
    publish_song: ['Publikasi Lagu', 'Bisa mengubah lagu antara publik dan draft.'],
  };

  function permissionValue(key) {
    if (!profile || profile.role === 'super_admin') return true;
    return profile.permissions?.[key] === true;
  }

  async function init() {
    if (!window.SUPABASE_CONFIG || !window.supabase) return;
    db = supabase.createClient(window.SUPABASE_CONFIG.url, window.SUPABASE_CONFIG.publishableKey, {
      auth: { storage: window.sessionStorage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
    await syncProfile();
    setInterval(syncProfile, 5000);
    observeAdminList();
    installGuards();
    tryInstallSongFilter();
  }

  async function syncProfile() {
    const { data: { session } } = await db.auth.getSession();
    if (!session) return;
    const { data } = await db.from('profiles').select('id,role,permissions,is_active,display_name,email').eq('id', session.user.id).maybeSingle();
    if (!data) return;
    profile = { ...data, permissions: { ...DEFAULTS, ...(data.permissions || {}) } };
    ready = true;
    applyAccess();
    patchAdminCreationForm();
    patchAdminRows();
    tryInstallSongFilter();
  }

  function applyAccess() {
    if (!ready || !profile || profile.role === 'super_admin') return;
    const navMap = { dashboard: 'view_dashboard', statistics: 'view_statistics', 'song-form': 'add_song', songs: 'view_songs' };
    Object.entries(navMap).forEach(([page, permission]) => {
      document.querySelectorAll(`.nav-item[data-page="${page}"]`).forEach(el => el.classList.toggle('hidden', !permissionValue(permission)));
      document.querySelectorAll(`.page-view[data-view="${page}"]`).forEach(el => { if (!permissionValue(permission)) el.classList.remove('active'); });
    });
    if (!permissionValue('add_song')) document.querySelectorAll('[data-go="song-form"]').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('#migrateAudioBtn').forEach(el => el.classList.add('hidden'));
    patchSongActions();
    const firstAllowed = Object.entries(navMap).find(([, p]) => permissionValue(p));
    if (firstAllowed && !document.querySelector('.nav-item.active:not(.hidden)')) {
      const nav = document.querySelector(`.nav-item[data-page="${firstAllowed[0]}"]`);
      if (nav) nav.click();
    }
  }

  function installGuards() {
    document.addEventListener('click', e => {
      const nav = e.target.closest('.nav-item[data-page]');
      const go = e.target.closest('[data-go]');
      const page = nav?.dataset.page || go?.dataset.go;
      if (page === 'songs') setTimeout(() => tryInstallSongFilter(), 250);
      if (!page || !profile || profile.role === 'super_admin') return;
      const map = { dashboard: 'view_dashboard', statistics: 'view_statistics', 'song-form': 'add_song', songs: 'view_songs' };
      if (map[page] && !permissionValue(map[page])) {
        e.preventDefault();
        e.stopImmediatePropagation();
        alert('Akses menu ini belum diberikan oleh Owner.');
      }
    }, true);
  }

  function patchAdminCreationForm() {
    const form = document.getElementById('adminForm');
    if (!form || document.getElementById('newAdminPermissions')) return;
    const box = document.createElement('div');
    box.id = 'newAdminPermissions';
    box.className = 'permission-editor wide';
    box.innerHTML = `<div class="permission-title"><b>Akses admin</b><small>Pilih menu dan kemampuan yang boleh digunakan admin ini.</small></div><div class="permission-grid">${Object.entries(LABELS).map(([key, [label, help]]) => `<label class="permission-item"><input type="checkbox" data-new-permission="${key}" checked><span><b>${label}</b><small>${help}</small></span></label>`).join('')}</div>`;
    form.insertBefore(box, form.querySelector('button[type="submit"]') || form.lastElementChild);
    form.addEventListener('submit', async e => {
      e.preventDefault(); e.stopImmediatePropagation();
      if (!profile || profile.role !== 'super_admin') return;
      const secondary = supabase.createClient(window.SUPABASE_CONFIG.url, window.SUPABASE_CONFIG.publishableKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
      const permissions = {};
      Object.keys(LABELS).forEach(key => permissions[key] = !!form.querySelector(`[data-new-permission="${key}"]`)?.checked);
      const { data, error } = await secondary.auth.signUp({ email: document.getElementById('newAdminEmail').value, password: document.getElementById('newAdminPassword').value });
      if (error || !data.user) return showAdminPermissionMsg(error?.message || 'Gagal membuat akun.', true);
      const { error: profileError } = await db.from('profiles').insert({ id: data.user.id, role: 'editor', display_name: document.getElementById('newAdminName').value, email: document.getElementById('newAdminEmail').value.trim().toLowerCase(), song_quota: Number(document.getElementById('newAdminQuota').value), is_active: true, permissions });
      if (profileError) return showAdminPermissionMsg(profileError.message, true);
      showAdminPermissionMsg('Admin berhasil dibuat dengan akses yang dipilih.');
      form.reset(); form.querySelectorAll('[data-new-permission]').forEach(x => x.checked = true);
      if (typeof window.loadAdmins === 'function') window.loadAdmins();
    }, true);
  }

  function showAdminPermissionMsg(text, bad = false) {
    const el = document.getElementById('adminMsg');
    if (!el) return;
    el.textContent = text; el.style.color = bad ? '#ff919b' : '#8fffc5'; el.classList.remove('hidden');
  }

  function observeAdminList() {
    const target = document.getElementById('adminList');
    if (!target) { setTimeout(observeAdminList, 500); return; }
    new MutationObserver(() => patchAdminRows()).observe(target, { childList: true, subtree: true });
    patchAdminRows();
  }

  function patchAdminRows() {
    if (!profile || profile.role !== 'super_admin') return;
    document.querySelectorAll('#adminList .admin-row').forEach(row => {
      if (row.querySelector('.permission-editor') || row.dataset.permissionEditorState === 'loading') return;
      const input = row.querySelector('input[id^="quota-"]');
      const id = input?.id?.replace('quota-', '');
      if (!id) return;
      row.dataset.permissionEditorState = 'loading';
      loadEditorPermissions(row, id);
    });
  }

  async function loadEditorPermissions(row, id) {
    const { data } = await db.from('profiles').select('permissions').eq('id', id).maybeSingle();
    if (!row.isConnected || row.querySelector('.permission-editor')) {
      row.dataset.permissionEditorState = row.querySelector('.permission-editor') ? 'ready' : '';
      return;
    }
    const permissions = { ...DEFAULTS, ...(data?.permissions || {}) };
    const box = document.createElement('div');
    box.className = 'permission-editor permission-row-editor';
    box.innerHTML = `<div class="permission-row-summary"><div><b>Hak akses admin</b><small>${Object.entries(permissions).filter(([, value]) => value).length}/${Object.keys(LABELS).length} akses aktif</small></div><button type="button" class="btn ghost permission-toggle" aria-expanded="false">Atur Akses</button></div><div class="permission-row-body hidden"><div class="permission-title"><b>Hak akses</b><small>Owner bisa mengubah akses kapan saja.</small></div><div class="permission-grid">${Object.entries(LABELS).map(([key, [label, help]]) => `<label class="permission-item"><input type="checkbox" data-permission="${key}" ${permissions[key] ? 'checked' : ''}><span><b>${label}</b><small>${help}</small></span></label>`).join('')}</div><button type="button" class="btn primary permission-save">Simpan Akses</button></div>`;
    row.appendChild(box);
    row.dataset.permissionEditorState = 'ready';

    const toggle = box.querySelector('.permission-toggle');
    const body = box.querySelector('.permission-row-body');
    toggle.onclick = () => {
      const expanded = !body.classList.contains('hidden');
      body.classList.toggle('hidden', expanded);
      toggle.setAttribute('aria-expanded', String(!expanded));
      toggle.textContent = expanded ? 'Atur Akses' : 'Tutup';
    };

    box.querySelector('.permission-save').onclick = async () => {
      const next = {};
      Object.keys(LABELS).forEach(key => next[key] = !!box.querySelector(`[data-permission="${key}"]`)?.checked);
      const button = box.querySelector('.permission-save'); button.disabled = true;
      const { error } = await db.from('profiles').update({ permissions: next }).eq('id', id);
      button.disabled = false;
      if (error) return showAdminPermissionMsg(`Gagal menyimpan akses: ${error.message}`, true);
      const activeCount = Object.values(next).filter(Boolean).length;
      box.querySelector('.permission-row-summary small').textContent = `${activeCount}/${Object.keys(LABELS).length} akses aktif`;
      showAdminPermissionMsg('Hak akses admin berhasil diperbarui.');
      body.classList.add('hidden');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.textContent = 'Atur Akses';
    };
  }

  function patchSongActions() {
    if (!profile || profile.role === 'super_admin') return;
    document.querySelectorAll('#songList .song .actions button').forEach(button => {
      const onclick = button.getAttribute('onclick') || '';
      if (onclick.includes('editSong') && !permissionValue('edit_song')) button.classList.add('hidden');
      if (onclick.includes('deleteSong') && !permissionValue('delete_song')) button.classList.add('hidden');
      if (onclick.includes('toggleSong') && !permissionValue('publish_song')) button.classList.add('hidden');
    });
  }

  function getSongTitle(row) {
    const clone = row.cloneNode(true);
    clone.querySelectorAll('.actions, button, input, textarea, select, img').forEach(el => el.remove());
    return clone.textContent.replace(/\s+/g, ' ').trim();
  }

  function sortSongs(order) {
    const list = document.getElementById('songList');
    if (!list) return;
    const rows = Array.from(list.children).filter(el => el.classList.contains('song'));
    if (rows.length < 2) return;
    rows.sort((a, b) => {
      const result = getSongTitle(a).localeCompare(getSongTitle(b), 'id-ID', { numeric: true, sensitivity: 'base' });
      return order === 'za' ? -result : result;
    });
    const fragment = document.createDocumentFragment();
    rows.forEach(row => fragment.appendChild(row));
    list.appendChild(fragment);
  }

  function installSongFilter() {
    const list = document.getElementById('songList');
    if (!list || document.getElementById('songSortFilter')) return false;
    const wrapper = document.createElement('div');
    wrapper.id = 'songSortFilter'; wrapper.className = 'song-filter-bar';
    wrapper.innerHTML = `<span class="song-filter-label">Urutkan lagu</span><button type="button" class="btn ghost song-sort-btn active" data-sort="none">Tanpa filter</button><button type="button" class="btn ghost song-sort-btn" data-sort="az">A-Z</button><button type="button" class="btn ghost song-sort-btn" data-sort="za">Z-A</button>`;
    list.parentNode.insertBefore(wrapper, list);
    wrapper.addEventListener('click', e => {
      const button = e.target.closest('.song-sort-btn');
      if (!button) return;
      songSortOrder = button.dataset.sort;
      wrapper.querySelectorAll('.song-sort-btn').forEach(btn => btn.classList.toggle('active', btn === button));
      if (songSortOrder === 'az' || songSortOrder === 'za') sortSongs(songSortOrder);
    });
    return true;
  }

  function tryInstallSongFilter(attempt = 0) {
    if (installSongFilter() || attempt >= 10) return;
    setTimeout(() => tryInstallSongFilter(attempt + 1), 300);
  }

  const style = document.createElement('style');
  style.textContent = `.permission-editor{margin-top:10px;padding:11px;border:1px solid #294039;border-radius:14px;background:#0a1210}.permission-title{display:flex;flex-direction:column;gap:3px;margin-bottom:11px}.permission-title small,.permission-item small,.permission-row-summary small{color:#82928c;font-size:11px;font-weight:500}.permission-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.permission-item{display:flex;align-items:flex-start;gap:9px;padding:10px;border:1px solid #263a34;border-radius:11px;background:#0d1714;cursor:pointer}.permission-item input{margin-top:3px;accent-color:#00dc7c}.permission-item span{display:grid;gap:3px}.permission-save{margin-top:10px}.permission-row-editor{padding:8px 10px}.permission-row-summary{display:flex;align-items:center;justify-content:space-between;gap:10px}.permission-row-summary>div{display:flex;align-items:baseline;gap:8px;min-width:0}.permission-row-summary b{font-size:11px}.permission-row-summary small{white-space:nowrap}.permission-toggle{padding:7px 10px;font-size:10px;white-space:nowrap}.permission-row-body{margin-top:8px}.song-filter-bar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:0 0 12px;padding:10px 12px;border:1px solid #263a34;border-radius:13px;background:#0b1311}.song-filter-label{color:#91a29b;font-size:12px;font-weight:750;margin-right:2px}.song-filter-bar .song-sort-btn{padding:8px 13px;font-size:12px}.song-filter-bar .song-sort-btn.active{background:linear-gradient(135deg,#00ec84,#00b968);color:#03130b;border-color:transparent}@media(max-width:760px){.permission-grid{grid-template-columns:1fr}.permission-row-summary{align-items:flex-start}.permission-row-summary>div{flex-direction:column;gap:2px}.song-filter-bar{width:100%}.song-filter-bar .song-sort-btn{flex:1}}`;
  document.head.appendChild(style);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
