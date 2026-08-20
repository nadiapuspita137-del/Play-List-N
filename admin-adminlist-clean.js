(() => {
  if (!/admin\.html(?:$|[?#])/.test(location.pathname + location.search + location.hash)) return;

  const style = document.createElement('style');
  style.id = 'admin-adminlist-clean-style';
  style.textContent = `
    #ownerTools .admin-list-head {
      display:grid;
      grid-template-columns:minmax(260px,1fr) 120px 110px 210px;
      align-items:center;
      gap:12px;
      padding:0 14px 8px;
      color:#60736a;
      font-size:10px;
      font-weight:850;
      letter-spacing:.08em;
      text-transform:uppercase;
    }
    #ownerTools #adminList {
      margin-top:0!important;
      display:grid!important;
      gap:6px!important;
      max-height:62vh!important;
      overflow:auto!important;
      padding:2px 4px 2px 0!important;
      scrollbar-gutter:stable;
    }
    #ownerTools .admin-row {
      display:grid!important;
      grid-template-columns:minmax(260px,1fr) 120px 110px 210px!important;
      align-items:center!important;
      gap:12px!important;
      min-height:66px!important;
      margin:0!important;
      padding:10px 14px!important;
      border:1px solid #22372f!important;
      border-radius:12px!important;
      background:#0b1210!important;
      box-shadow:none!important;
    }
    #ownerTools .admin-row:hover {
      background:#0e1714!important;
      border-color:#2d4a3f!important;
    }
    #ownerTools .admin-row > .admin-avatar { grid-column:1; grid-row:1; width:38px!important; height:38px!important; }
    #ownerTools .admin-row > div:nth-child(2) {
      grid-column:1; grid-row:1; padding-left:50px; min-width:0;
    }
    #ownerTools .admin-row > div:nth-child(2) > b { display:block; font-size:13px; color:#edf5f1; }
    #ownerTools .admin-email { font-size:11px!important; color:#7f9189!important; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    #ownerTools .admin-row > div:nth-child(2) > .muted { margin-top:3px; font-size:10px!important; color:#5f7068!important; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    #ownerTools .admin-row::after { content:""; display:none; }
    #ownerTools .admin-row > .admin-actions { grid-column:4; grid-row:1; display:grid!important; grid-template-columns:1fr auto; align-items:center; gap:6px!important; min-width:0; }
    #ownerTools .admin-actions .quota-editor { margin:0!important; min-width:0!important; width:100%; justify-content:flex-start; }
    #ownerTools .quota-editor input { width:48px!important; }
    #ownerTools .admin-actions > .btn { min-height:32px!important; padding:7px 9px!important; font-size:10px!important; }
    #ownerTools .admin-row > .admin-avatar + div::after { content:""; }
    #ownerTools .admin-access-col { grid-column:3; grid-row:1; }
    #ownerTools .admin-access-btn {
      width:100%; min-height:32px; padding:7px 10px; border:1px solid #29453a; border-radius:9px;
      background:#0f1a16; color:#a8e5c9; cursor:pointer; font-size:10px; font-weight:850;
    }
    #ownerTools .admin-access-btn:hover { background:#13231d; border-color:#3a6755; }
    #ownerTools .admin-access-menu {
      position:absolute; top:calc(100% + 6px); right:0; z-index:300; width:250px;
      display:none; padding:10px; border:1px solid #29453a; border-radius:12px;
      background:#0a1210; box-shadow:0 18px 55px rgba(0,0,0,.5);
    }
    #ownerTools .admin-access-menu.open { display:block; }
    #ownerTools .admin-access-menu .permission-row-editor { display:block!important; margin:0!important; padding:0!important; border:0!important; background:transparent!important; }
    #ownerTools .admin-access-menu .permission-title { display:none!important; }
    #ownerTools .admin-access-menu .permission-grid { display:grid; grid-template-columns:1fr; gap:5px; }
    #ownerTools .admin-access-menu .permission-item { min-height:0; padding:7px!important; border-radius:8px; }
    #ownerTools .admin-access-menu .permission-item small { display:none!important; }
    #ownerTools .admin-access-menu .permission-item b { font-size:10px; }
    #ownerTools .admin-access-menu .permission-save { width:100%; margin-top:8px; padding:8px 10px; font-size:10px; }
    #ownerTools .admin-access-wrap { position:relative; width:100%; }
    @media(max-width:900px){
      #ownerTools .admin-list-head { display:none; }
      #ownerTools .admin-row { grid-template-columns:minmax(0,1fr) auto!important; }
      #ownerTools .admin-row > .admin-actions { grid-column:2; grid-row:1; }
      #ownerTools .admin-row > .admin-access-col { grid-column:2; grid-row:2; }
      #ownerTools .admin-actions { grid-template-columns:1fr auto!important; }
      #ownerTools .admin-row > div:nth-child(2) { grid-column:1; }
    }
    @media(max-width:560px){
      #ownerTools .admin-row { grid-template-columns:1fr!important; gap:8px!important; }
      #ownerTools .admin-row > div:nth-child(2), #ownerTools .admin-row > .admin-actions, #ownerTools .admin-row > .admin-access-col { grid-column:1!important; grid-row:auto!important; padding-left:48px; }
      #ownerTools .admin-actions { width:100%; }
    }
  `;
  document.head.appendChild(style);

  function closeMenus(except = null) {
    document.querySelectorAll('.admin-access-menu.open').forEach(m => {
      if (m !== except) m.classList.remove('open');
    });
  }

  document.addEventListener('click', e => {
    const btn = e.target.closest('.admin-access-btn');
    if (btn) {
      e.preventDefault();
      e.stopPropagation();
      const menu = btn.parentElement.querySelector('.admin-access-menu');
      closeMenus(menu);
      menu.classList.toggle('open');
      return;
    }
    if (!e.target.closest('.admin-access-wrap')) closeMenus();
  });

  function compactRow(row) {
    if (row.dataset.cleanAdmin === '1') return;
    const originalEditor = row.querySelector('.permission-row-editor');
    const info = row.querySelector(':scope > div:nth-child(2)');
    const actions = row.querySelector(':scope > .admin-actions');
    if (!info || !actions) return;
    row.dataset.cleanAdmin = '1';

    const current = originalEditor ? [...originalEditor.querySelectorAll('[data-permission]')].filter(x => x.checked).length : 0;
    const total = originalEditor ? originalEditor.querySelectorAll('[data-permission]').length : 0;

    const accessCol = document.createElement('div');
    accessCol.className = 'admin-access-col';
    const wrap = document.createElement('div');
    wrap.className = 'admin-access-wrap';
    const accessBtn = document.createElement('button');
    accessBtn.type = 'button';
    accessBtn.className = 'admin-access-btn';
    accessBtn.textContent = `Hak Akses ${current}/${total}`;

    const menu = document.createElement('div');
    menu.className = 'admin-access-menu';
    if (originalEditor) {
      menu.appendChild(originalEditor);
      originalEditor.style.display = 'block';
      const save = originalEditor.querySelector('.permission-save');
      if (save) save.addEventListener('click', () => {
        setTimeout(() => {
          const checked = originalEditor.querySelectorAll('[data-permission]:checked').length;
          accessBtn.textContent = `Hak Akses ${checked}/${total}`;
          menu.classList.remove('open');
        }, 150);
      });
    }
    wrap.append(accessBtn, menu);
    accessCol.appendChild(wrap);
    row.insertBefore(accessCol, actions);
  }

  function addHeader(list) {
    if (!list || document.getElementById('adminListHeader')) return;
    const head = document.createElement('div');
    head.id = 'adminListHeader';
    head.className = 'admin-list-head';
    head.innerHTML = '<span>Admin</span><span>Lagu / Kuota</span><span>Akses</span><span>Aksi</span>';
    list.parentElement.insertBefore(head, list);
  }

  function scan() {
    const list = document.getElementById('adminList');
    if (!list) return;
    addHeader(list);
    list.querySelectorAll(':scope > .admin-row').forEach(compactRow);
  }

  function boot() {
    const list = document.getElementById('adminList');
    if (!list) return setTimeout(boot, 350);
    scan();
    new MutationObserver(scan).observe(list, { childList:true, subtree:true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
  else boot();
})();
