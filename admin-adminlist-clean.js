(() => {
  if (!/admin\.html(?:$|[?#])/.test(location.pathname + location.search + location.hash)) return;

  const style = document.createElement('style');
  style.id = 'admin-master-detail-style';
  style.textContent = `
    #ownerTools .admin-master-toolbar{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:16px}
    #ownerTools .admin-master-toolbar .top{margin:0;padding:0}
    #ownerTools .admin-create-toggle{flex:none}
    #ownerTools #adminForm{display:none;margin:0 0 18px;padding:18px;border:1px solid #294039;border-radius:16px;background:#0a1210}
    #ownerTools.create-open #adminForm{display:grid}
    #ownerTools #adminList{display:grid!important;gap:9px!important;margin-top:0!important;max-height:min(66vh,760px)!important;overflow:auto!important;padding:2px 4px 2px 0!important;scrollbar-gutter:stable}
    #ownerTools .admin-row{display:grid!important;grid-template-columns:44px minmax(0,1fr) auto!important;align-items:center!important;gap:14px!important;min-height:78px!important;margin:0!important;padding:13px 15px!important;border:1px solid #24372f!important;border-radius:15px!important;background:linear-gradient(145deg,#0d1613,#0a100e)!important}
    #ownerTools .admin-row:hover{border-color:#31594b!important;background:linear-gradient(145deg,#101c18,#0b1210)!important}
    #ownerTools .admin-avatar{position:static!important;width:42px!important;height:42px!important;margin:0!important}
    #ownerTools .admin-row>div:nth-child(2){grid-column:auto!important;min-width:0!important;padding:0!important}
    #ownerTools .admin-email,#ownerTools .admin-row .muted{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    #ownerTools .admin-row>.admin-actions,#ownerTools .admin-row .permission-row-editor,#ownerTools .admin-row .admin-access-wrap{display:none!important}
    #ownerTools .admin-manage-btn{min-width:116px;white-space:nowrap}
    #adminDetailScreen{display:none}
    #ownerTools.detail-open>.admin-master-toolbar,#ownerTools.detail-open>#adminForm,#ownerTools.detail-open>#adminMsg,#ownerTools.detail-open>#adminList{display:none!important}
    #ownerTools.detail-open #adminDetailScreen{display:block}
    #adminDetailScreen .detail-toolbar{display:flex;align-items:center;justify-content:space-between;gap:14px;padding-bottom:17px;margin-bottom:18px;border-bottom:1px solid #22372f}
    #adminDetailScreen .detail-title b{display:block;font-size:21px;color:#eef7f2}
    #adminDetailScreen .detail-title small{display:block;margin-top:5px;color:#768980;font-size:12px}
    #adminDetailScreen .detail-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-bottom:18px}
    #adminDetailScreen .detail-stat{padding:14px;border:1px solid #263a34;border-radius:13px;background:#0d1714}
    #adminDetailScreen .detail-stat small{display:block;color:#71827b;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.08em}
    #adminDetailScreen .detail-stat b{display:block;margin-top:6px;font-size:14px;overflow-wrap:anywhere}
    #adminDetailScreen .detail-section{padding:17px;margin-top:12px;border:1px solid #263a34;border-radius:15px;background:#0a1210}
    #adminDetailScreen .detail-section>h3{margin:0 0 5px;font-size:15px}
    #adminDetailScreen .detail-section>.muted{margin:0 0 14px}
    #adminDetailScreen .detail-actions .admin-actions{display:flex!important;justify-content:flex-start;flex-wrap:wrap;gap:9px}
    #adminDetailScreen .detail-actions .quota-editor{min-height:42px}
    #adminDetailScreen .permission-row-editor{display:block!important;margin:0!important;padding:0!important;border:0!important;background:transparent!important}
    #adminDetailScreen .permission-row-summary{display:none!important}
    #adminDetailScreen .permission-row-body{display:block!important;margin:0!important}
    #adminDetailScreen .permission-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:10px!important}
    #adminDetailScreen .permission-item{min-height:78px;padding:13px!important}
    #adminDetailScreen .permission-save{min-width:180px}
    @media(max-width:700px){
      #ownerTools .admin-master-toolbar,#adminDetailScreen .detail-toolbar{align-items:flex-start;flex-direction:column}
      #ownerTools .admin-create-toggle,#adminDetailScreen .detail-back{width:100%}
      #ownerTools .admin-row{grid-template-columns:40px minmax(0,1fr)!important}
      #ownerTools .admin-manage-btn{grid-column:2;width:100%}
      #adminDetailScreen .detail-summary,#adminDetailScreen .permission-grid{grid-template-columns:1fr!important}
    }
  `;
  document.head.appendChild(style);

  let detailScreen;
  let currentRow;
  let currentActions;
  let currentEditor;

  function ensureLayout() {
    const owner = document.getElementById('ownerTools');
    const existingToolbar = owner?.querySelector(':scope > .admin-master-toolbar');
    const top = existingToolbar?.querySelector('.top') || owner?.querySelector(':scope > .top');
    const form = document.getElementById('adminForm');
    const list = document.getElementById('adminList');
    if (!owner || !form || !list || (!existingToolbar && !top)) return null;

    if (!existingToolbar) {
      const toolbar = document.createElement('div');
      toolbar.className = 'admin-master-toolbar';
      top.parentNode.insertBefore(toolbar, top);
      toolbar.appendChild(top);
      const create = document.createElement('button');
      create.type = 'button';
      create.className = 'btn primary admin-create-toggle';
      create.textContent = '+ Tambah Admin';
      create.onclick = () => {
        owner.classList.toggle('create-open');
        create.textContent = owner.classList.contains('create-open') ? 'Tutup Form' : '+ Tambah Admin';
      };
      toolbar.appendChild(create);
      form.addEventListener('submit', () => {
        setTimeout(() => {
          owner.classList.remove('create-open');
          create.textContent = '+ Tambah Admin';
        }, 500);
      });
    }

    if (!detailScreen) {
      detailScreen = document.createElement('div');
      detailScreen.id = 'adminDetailScreen';
      detailScreen.innerHTML = `
        <div class="detail-toolbar">
          <div class="detail-title"><b id="adminDetailName">Detail Admin</b><small id="adminDetailEmail"></small></div>
          <button type="button" class="btn ghost detail-back">← Kembali ke Daftar Admin</button>
        </div>
        <div class="detail-summary" id="adminDetailSummary"></div>
        <section class="detail-section detail-actions"><h3>Pengaturan Akun</h3><p class="muted">Atur kuota lagu dan status akun admin.</p><div id="adminDetailActions"></div></section>
        <section class="detail-section"><h3>Hak Akses</h3><p class="muted">Pilih menu dan tindakan yang boleh digunakan admin ini.</p><div id="adminDetailPermissions"></div></section>`;
      list.parentNode.insertBefore(detailScreen, list);
      detailScreen.querySelector('.detail-back').onclick = closeDetail;
    }
    return owner;
  }

  function closeDetail() {
    const owner = document.getElementById('ownerTools');
    owner?.classList.remove('detail-open');
    if (currentRow?.isConnected) {
      if (currentActions) currentRow.appendChild(currentActions);
      if (currentEditor) currentRow.appendChild(currentEditor);
    }
    currentRow = null;
    currentActions = null;
    currentEditor = null;
    if (detailScreen) {
      document.getElementById('adminDetailActions').innerHTML = '';
      document.getElementById('adminDetailPermissions').innerHTML = '';
    }
  }

  function openDetail(row) {
    const owner = ensureLayout();
    if (!owner) return;
    const info = row.querySelector(':scope > div:nth-child(2)');
    const actions = row.querySelector(':scope > .admin-actions');
    const editor = row.querySelector('.permission-row-editor');
    const legacyWrap = row.querySelector('.admin-access-wrap');
    if (legacyWrap && editor) {
      legacyWrap.parentNode?.insertBefore(editor, legacyWrap);
      legacyWrap.remove();
    }
    const name = info?.querySelector('b')?.textContent || 'Admin';
    const email = info?.querySelector('.admin-email')?.textContent || '';
    const meta = info?.querySelector('.muted')?.textContent || '';
    const parts = meta.split('•').map(x => x.trim());

    document.getElementById('adminDetailName').textContent = name;
    document.getElementById('adminDetailEmail').textContent = email;
    document.getElementById('adminDetailSummary').innerHTML = `
      <div class="detail-stat"><small>Email</small><b>${escapeHtml(email || 'Belum tersedia')}</b></div>
      <div class="detail-stat"><small>Penggunaan</small><b>${escapeHtml(parts[0] || '—')}</b></div>
      <div class="detail-stat"><small>Status & Kuota</small><b>${escapeHtml(parts.slice(1).join(' • ') || '—')}</b></div>`;
    const actionTarget = document.getElementById('adminDetailActions');
    const permissionTarget = document.getElementById('adminDetailPermissions');
    currentRow = row;
    currentActions = actions;
    currentEditor = editor;
    actionTarget.innerHTML = '';
    permissionTarget.innerHTML = '';
    if (actions) actionTarget.appendChild(actions);
    if (editor) {
      editor.querySelector('.permission-row-body')?.classList.remove('hidden');
      permissionTarget.appendChild(editor);
    } else {
      permissionTarget.innerHTML = '<p class="muted">Memuat hak akses…</p>';
    }
    owner.classList.remove('create-open');
    owner.classList.add('detail-open');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function prepareRow(row) {
    const editors = [...row.querySelectorAll('.permission-row-editor')];
    editors.slice(1).forEach(editor => {
      const wrapper = editor.closest('.admin-access-wrap');
      if (wrapper) wrapper.remove();
      else editor.remove();
    });
    if (row.dataset.masterDetail === '1') return;
    const info = row.querySelector(':scope > div:nth-child(2)');
    const actions = row.querySelector(':scope > .admin-actions');
    const editor = row.querySelector('.permission-row-editor');
    if (!info || !actions || !editor) return;
    const legacyWrap = row.querySelector('.admin-access-wrap');
    if (legacyWrap) {
      row.appendChild(editor);
      legacyWrap.remove();
    }
    row.dataset.masterDetail = '1';
    row.dataset.dropdownReady = '1';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn ghost admin-manage-btn';
    button.textContent = 'Kelola Admin →';
    button.onclick = () => openDetail(row);
    row.appendChild(button);
  }

  function scan() {
    const owner = ensureLayout();
    const list = document.getElementById('adminList');
    if (!owner || !list) return;
    list.querySelectorAll(':scope > .admin-row').forEach(prepareRow);
  }

  function boot() {
    const list = document.getElementById('adminList');
    if (!list) return setTimeout(boot, 300);
    scan();
    new MutationObserver(scan).observe(list, {childList:true, subtree:true});
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', boot, {once:true})
    : boot();
})();
