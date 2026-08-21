(() => {
  const DEFAULTS = {view_dashboard:true,view_statistics:true,view_songs:true,add_song:true,edit_song:true,delete_song:true,publish_song:true};
  const LABELS = {
    view_dashboard:['Beranda','Membuka dashboard dan ringkasan.'],
    view_statistics:['Statistik','Melihat statistik play dan download.'],
    view_songs:['Daftar Lagu','Melihat koleksi lagu miliknya.'],
    add_song:['Tambah Lagu','Mengunggah dan membuat lagu baru.'],
    edit_song:['Edit Lagu','Mengubah metadata, lirik, cover, dan audio.'],
    delete_song:['Hapus Lagu','Menghapus lagu miliknya.'],
    publish_song:['Publikasi Lagu','Mengubah lagu antara publik dan draft.'],
  };
  let db;
  let selectedId = null;

  const style = document.createElement('style');
  style.textContent = `
    .nested-admin-detail .admin-breadcrumb{display:flex;align-items:center;gap:8px;margin-bottom:18px;color:#71827b;font-size:12px;font-weight:800}
    .nested-admin-detail .admin-breadcrumb button{padding:0;border:0;background:none;color:#00dc7c;cursor:pointer;font-weight:850}.nested-admin-detail .admin-breadcrumb b{color:#dce7e2}
    .nested-admin-detail .detail-head{display:flex;align-items:flex-start;justify-content:space-between;gap:15px;padding-bottom:18px;margin-bottom:18px;border-bottom:1px solid #263a34}.nested-admin-detail .detail-head h2{margin:0 0 5px;font-size:24px}.nested-admin-detail .detail-head p{margin:0}
    .nested-admin-detail .detail-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-bottom:15px}.nested-admin-detail .detail-stat{padding:14px;border:1px solid #263a34;border-radius:13px;background:#0d1714}.nested-admin-detail .detail-stat small{display:block;color:#71827b;font-size:10px;font-weight:850;letter-spacing:.08em;text-transform:uppercase}.nested-admin-detail .detail-stat b{display:block;margin-top:6px;overflow-wrap:anywhere}
    .nested-admin-detail .detail-section{padding:17px;margin-top:12px;border:1px solid #263a34;border-radius:15px;background:#0a1210}.nested-admin-detail .detail-section h3{margin:0 0 5px;font-size:15px}.nested-admin-detail .detail-section>p{margin:0 0 14px}.nested-admin-detail .detail-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.nested-admin-detail .detail-field{display:grid;gap:7px;color:#b9c5c0;font-size:12px;font-weight:750}.nested-admin-detail .detail-field input,.nested-admin-detail .detail-field select{width:100%;padding:12px;border:1px solid #2a3b35;border-radius:11px;background:#080c0b;color:#fff;outline:0}
    .nested-admin-detail .detail-permissions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.nested-admin-detail .detail-permission{display:flex;align-items:flex-start;gap:10px;min-height:78px;padding:13px;border:1px solid #263a34;border-radius:12px;background:#0d1714;cursor:pointer}.nested-admin-detail .detail-permission:hover{border-color:#31594b}.nested-admin-detail .detail-permission input{margin-top:3px;accent-color:#00dc7c}.nested-admin-detail .detail-permission b{display:block;font-size:12px}.nested-admin-detail .detail-permission small{display:block;margin-top:4px;color:#82928c;font-size:11px;line-height:1.4}.nested-admin-detail .detail-footer{display:flex;justify-content:flex-end;gap:9px;margin-top:16px}
    @media(max-width:700px){.nested-admin-detail .detail-head{flex-direction:column}.nested-admin-detail .detail-head .btn{width:100%}.nested-admin-detail .detail-summary,.nested-admin-detail .detail-fields,.nested-admin-detail .detail-permissions{grid-template-columns:1fr}.nested-admin-detail .detail-footer{flex-direction:column}.nested-admin-detail .detail-footer .btn{width:100%}}
  `;
  document.head.appendChild(style);

  function ensureView() {
    let view = document.querySelector('.page-view[data-view="admin-detail"]');
    if (view) return view;
    const workspace = document.querySelector('.workspace-inner');
    if (!workspace) return null;
    view = document.createElement('section');
    view.className = 'card page-view nested-admin-detail';
    view.dataset.view = 'admin-detail';
    view.innerHTML = `
      <div class="admin-breadcrumb"><button type="button" data-admin-back>Kelola Admin</button><span>›</span><b id="nestedCrumbName">Detail Admin</b></div>
      <div id="nestedAdminLoading" class="notice">Memuat data admin…</div>
      <div id="nestedAdminError" class="notice hidden"></div>
      <form id="nestedAdminForm" class="hidden">
        <div class="detail-head"><div><h2 id="nestedAdminName">Detail Admin</h2><p id="nestedAdminEmail" class="muted"></p></div><button type="button" class="btn ghost" data-admin-back>← Kembali</button></div>
        <div class="detail-summary"><div class="detail-stat"><small>Status</small><b id="nestedStatus">—</b></div><div class="detail-stat"><small>Kuota Lagu</small><b id="nestedQuota">—</b></div><div class="detail-stat"><small>Lagu Digunakan</small><b id="nestedUsed">—</b></div></div>
        <section class="detail-section"><h3>Pengaturan Akun</h3><p class="muted">Ubah identitas, kuota, dan status akun admin.</p><div class="detail-fields"><label class="detail-field">Nama admin<input id="nestedDisplayName" required></label><label class="detail-field">Email<input id="nestedEmail" type="email" disabled></label><label class="detail-field">Kuota lagu<input id="nestedSongQuota" type="number" min="0" required></label><label class="detail-field">Status akun<select id="nestedIsActive"><option value="true">Aktif</option><option value="false">Nonaktif</option></select></label></div></section>
        <section class="detail-section"><h3>Hak Akses</h3><p class="muted">Pilih menu dan tindakan yang boleh digunakan admin ini.</p><div id="nestedPermissions" class="detail-permissions"></div></section>
        <div id="nestedMessage" class="notice hidden"></div><div class="detail-footer"><button type="button" class="btn ghost" data-admin-back>Batal</button><button id="nestedSave" class="btn primary" type="submit">Simpan Perubahan</button></div>
      </form>
      <form id="ownerPasswordForm" class="detail-section hidden">
        <h3>Atur Ulang Password</h3>
        <p class="muted">Khusus Owner untuk menetapkan password baru admin ini.</p>
        <input id="ownerPasswordUsername" name="username" type="hidden" autocomplete="username">
        <div class="detail-fields">
          <label class="detail-field">Password baru<input id="ownerAdminPassword" name="new-password" type="password" minlength="8" maxlength="72" autocomplete="new-password" required></label>
          <label class="detail-field">Konfirmasi password<input id="ownerAdminPasswordConfirm" name="confirm-password" type="password" minlength="8" maxlength="72" autocomplete="new-password" required></label>
        </div>
        <div id="ownerPasswordMessage" class="notice hidden" role="status" aria-live="polite" style="margin-top:12px"></div>
        <div class="detail-footer"><button id="ownerResetPassword" type="submit" class="btn danger">Ubah Password Admin</button></div>
      </form>`;
    workspace.appendChild(view);
    view.querySelectorAll('[data-admin-back]').forEach(button => button.addEventListener('click', showAdminList));
    view.querySelector('#nestedAdminForm').addEventListener('submit', saveAdmin);
    view.querySelector('#ownerPasswordForm').addEventListener('submit', resetAdminPassword);
    return view;
  }

  function activate(viewName) {
    document.querySelectorAll('.page-view').forEach(view => view.classList.toggle('active', view.dataset.view === viewName));
    document.querySelectorAll('.nav-item').forEach(item => item.classList.toggle('active', item.dataset.page === 'admins'));
    document.getElementById('adminView')?.classList.remove('menu-open');
    window.scrollTo({top:0,behavior:'smooth'});
  }

  function showAdminList() {
    selectedId = null;
    resetPasswordState();
    activate('admins');
    const label = document.getElementById('pageLabel');
    if (label) label.textContent = 'KELOLA ADMIN';
  }

  function message(text, bad=false) {
    const box = document.getElementById('nestedMessage');
    box.textContent = text;
    box.style.color = bad ? '#ff919b' : '#8fffc5';
    box.classList.remove('hidden');
  }

  function resetPasswordState() {
    document.getElementById('ownerPasswordForm')?.reset();
    const output = document.getElementById('ownerPasswordMessage');
    if (!output) return;
    output.textContent = '';
    output.classList.add('hidden');
  }

  window.openAdminDetail = async id => {
    const view = ensureView();
    if (!view || !id) return;
    selectedId = id;
    activate('admin-detail');
    document.getElementById('pageLabel').textContent = 'KELOLA ADMIN › DETAIL';
    document.getElementById('nestedAdminLoading').classList.remove('hidden');
    document.getElementById('nestedAdminError').classList.add('hidden');
    document.getElementById('nestedAdminForm').classList.add('hidden');
    document.getElementById('ownerPasswordForm').classList.add('hidden');
    resetPasswordState();
    try {
      if (!db) db = window.getPlaylistSupabaseClient?.();
      if (!db) throw new Error('Koneksi database belum siap. Muat ulang halaman.');
      const [{data,error},{count}] = await Promise.all([
        db.from('profiles').select('*').eq('id',id).eq('role','editor').maybeSingle(),
        db.from('songs').select('id',{count:'exact',head:true}).eq('owner_id',id),
      ]);
      if (error || !data) throw new Error(error?.message || 'Data admin tidak ditemukan.');
      render(data,count || 0);
    } catch (error) {
      document.getElementById('nestedAdminLoading').classList.add('hidden');
      const box = document.getElementById('nestedAdminError');
      box.textContent = error.message;
      box.style.color = '#ff919b';
      box.classList.remove('hidden');
    }
  };

  document.addEventListener('click', event => {
    const button = event.target.closest('[data-manage-admin]');
    if (!button) return;
    event.preventDefault();
    window.openAdminDetail(button.dataset.manageAdmin);
  });

  function render(profile, used) {
    const permissions = {...DEFAULTS,...(profile.permissions || {})};
    document.getElementById('nestedCrumbName').textContent = profile.display_name || 'Admin';
    document.getElementById('nestedAdminName').textContent = profile.display_name || 'Admin';
    document.getElementById('nestedAdminEmail').textContent = profile.email || 'Email belum tersedia';
    document.getElementById('ownerPasswordUsername').value = profile.email || '';
    document.getElementById('nestedDisplayName').value = profile.display_name || '';
    document.getElementById('nestedEmail').value = profile.email || '';
    document.getElementById('nestedSongQuota').value = profile.song_quota || 0;
    document.getElementById('nestedIsActive').value = String(profile.is_active);
    document.getElementById('nestedStatus').textContent = profile.is_active ? 'Aktif' : 'Nonaktif';
    document.getElementById('nestedQuota').textContent = profile.song_quota || 0;
    document.getElementById('nestedUsed').textContent = used;
    document.getElementById('nestedPermissions').innerHTML = Object.entries(LABELS).map(([key,[label,help]]) => `<label class="detail-permission"><input type="checkbox" data-nested-permission="${key}" ${permissions[key]?'checked':''}><span><b>${label}</b><small>${help}</small></span></label>`).join('');
    document.getElementById('nestedAdminLoading').classList.add('hidden');
    document.getElementById('nestedAdminForm').classList.remove('hidden');
    document.getElementById('ownerPasswordForm').classList.remove('hidden');
  }

  async function saveAdmin(event) {
    event.preventDefault();
    if (!selectedId) return;
    const quota = Number(document.getElementById('nestedSongQuota').value);
    if (!Number.isInteger(quota) || quota < 0) return message('Kuota harus berupa angka 0 atau lebih.',true);
    const permissions = {};
    Object.keys(LABELS).forEach(key => permissions[key] = !!document.querySelector(`[data-nested-permission="${key}"]`)?.checked);
    const button = document.getElementById('nestedSave');
    button.disabled = true;
    const {error} = await db.from('profiles').update({display_name:document.getElementById('nestedDisplayName').value.trim(),song_quota:quota,is_active:document.getElementById('nestedIsActive').value === 'true',permissions}).eq('id',selectedId);
    button.disabled = false;
    if (error) return message(error.message,true);
    document.getElementById('nestedStatus').textContent = document.getElementById('nestedIsActive').value === 'true' ? 'Aktif' : 'Nonaktif';
    document.getElementById('nestedQuota').textContent = quota;
    document.getElementById('nestedAdminName').textContent = document.getElementById('nestedDisplayName').value.trim() || 'Admin';
    document.getElementById('nestedCrumbName').textContent = document.getElementById('nestedAdminName').textContent;
    message('Perubahan admin berhasil disimpan.');
  }

  async function resetAdminPassword(event) {
    event.preventDefault();
    if (!selectedId || !db) return;
    const password = document.getElementById('ownerAdminPassword').value;
    const confirmation = document.getElementById('ownerAdminPasswordConfirm').value;
    const button = document.getElementById('ownerResetPassword');
    const output = document.getElementById('ownerPasswordMessage');
    output.classList.add('hidden');
    if (password.length < 8) {
      output.textContent = 'Password baru minimal terdiri dari 8 karakter.';
      output.style.color = '#ff919b';
      return output.classList.remove('hidden');
    }
    if (password.length > 72) {
      output.textContent = 'Password baru maksimal terdiri dari 72 karakter.';
      output.style.color = '#ff919b';
      return output.classList.remove('hidden');
    }
    if (password !== confirmation) {
      output.textContent = 'Konfirmasi password tidak sama.';
      output.style.color = '#ff919b';
      return output.classList.remove('hidden');
    }
    button.disabled = true;
    try {
      const {error} = await db.functions.invoke('admin-reset-password', {
        body: {target_user_id:selectedId,new_password:password},
      });
      if (error) {
        let detail = error.message || 'Password admin gagal diperbarui.';
        try {
          const response = await error.context?.json();
          if (response?.error) detail = response.error;
        } catch (_) {}
        throw new Error(detail);
      }
      document.getElementById('ownerAdminPassword').value = '';
      document.getElementById('ownerAdminPasswordConfirm').value = '';
      output.textContent = 'Password admin berhasil diperbarui.';
      output.style.color = '#8fffc5';
    } catch (error) {
      output.textContent = error.message || 'Password admin gagal diperbarui.';
      output.style.color = '#ff919b';
    } finally {
      button.disabled = false;
      output.classList.remove('hidden');
    }
  }

})();
