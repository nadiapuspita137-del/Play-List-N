(() => {
  if (!/admin\.html(?:$|[?#])/.test(location.pathname + location.search + location.hash)) return;

  const css = document.createElement('style');
  css.id = 'admin-adminlist-clean-style';
  css.textContent = `
    #ownerTools .admin-list-head {
      display: grid;
      grid-template-columns: minmax(280px, 1fr) 150px 150px 220px;
      align-items: center;
      gap: 14px;
      padding: 0 16px 9px;
      color: #60736a;
      font-size: 10px;
      font-weight: 850;
      letter-spacing: .08em;
      text-transform: uppercase;
    }

    #ownerTools #adminList {
      display: grid !important;
      gap: 7px !important;
      margin-top: 0 !important;
      max-height: min(64vh, 700px) !important;
      overflow: auto !important;
      padding: 2px 4px 2px 0 !important;
      scrollbar-gutter: stable;
    }

    #ownerTools .admin-row {
      display: grid !important;
      grid-template-columns: minmax(280px, 1fr) 150px 150px 220px !important;
      align-items: center !important;
      gap: 14px !important;
      min-height: 70px !important;
      margin: 0 !important;
      padding: 10px 16px !important;
      border: 1px solid #22372f !important;
      border-radius: 12px !important;
      background: #0b1210 !important;
      box-shadow: none !important;
    }

    #ownerTools .admin-row:hover {
      background: #0e1714 !important;
      border-color: #2d4a3f !important;
    }

    #ownerTools .admin-row > .admin-avatar {
      position: absolute;
      margin-left: 0;
      width: 38px !important;
      height: 38px !important;
    }

    #ownerTools .admin-row {
      position: relative;
    }

    #ownerTools .admin-row > div:nth-child(2) {
      grid-column: 1;
      min-width: 0;
      padding-left: 50px;
    }

    #ownerTools .admin-row > div:nth-child(2) > b {
      display: block;
      font-size: 13px;
      color: #edf5f1;
      line-height: 1.25;
    }

    #ownerTools .admin-email {
      margin-top: 3px !important;
      font-size: 11px !important;
      color: #7f9189 !important;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    #ownerTools .admin-row > div:nth-child(2) > .muted {
      margin-top: 4px;
      font-size: 10px !important;
      color: #5f7068 !important;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    #ownerTools .admin-row > .admin-actions {
      grid-column: 4;
      display: grid !important;
      grid-template-columns: 1fr auto;
      align-items: center;
      gap: 7px !important;
      min-width: 0;
    }

    #ownerTools .admin-actions .quota-editor {
      width: 100%;
      margin: 0 !important;
      min-width: 0 !important;
      justify-content: flex-start;
    }

    #ownerTools .quota-editor input {
      width: 54px !important;
    }

    #ownerTools .admin-actions > .btn {
      min-height: 32px !important;
      padding: 7px 10px !important;
      font-size: 10px !important;
      white-space: nowrap;
    }

    #ownerTools .admin-access-col {
      grid-column: 3;
    }

    #ownerTools .admin-access-button {
      width: 100%;
      min-height: 32px;
      padding: 7px 10px;
      border: 1px solid #29453a;
      border-radius: 9px;
      background: #0f1a16;
      color: #a8e5c9;
      cursor: pointer;
      font-size: 10px;
      font-weight: 850;
      white-space: nowrap;
    }

    #ownerTools .admin-access-button:hover {
      background: #13231d;
      border-color: #3a6755;
    }

    /* Editor permission selalu keluar dari row, masuk ke panel sendiri. */
    #ownerTools .permission-row-editor {
      display: none !important;
    }

    #adminAccessScreen {
      display: none;
      margin-top: 6px;
    }

    #adminAccessScreen.open {
      display: block;
    }

    #adminAccessScreen .access-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      padding-bottom: 16px;
      margin-bottom: 18px;
      border-bottom: 1px solid #22372f;
    }

    #adminAccessScreen .access-title {
      min-width: 0;
    }

    #adminAccessScreen .access-title b {
      display: block;
      font-size: 18px;
      color: #eef7f2;
    }

    #adminAccessScreen .access-title small {
      display: block;
      margin-top: 4px;
      color: #768980;
      font-size: 11px;
    }

    #adminAccessScreen .access-body {
      padding: 6px 0 2px;
    }

    #adminAccessScreen .permission-editor {
      margin-top: 0 !important;
      padding: 0 !important;
      border: 0 !important;
      background: transparent !important;
    }

    #adminAccessScreen .permission-grid {
      display: grid !important;
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      gap: 10px !important;
    }

    #adminAccessScreen .permission-item {
      min-height: 82px;
      padding: 14px !important;
      border: 1px solid #263a34;
      border-radius: 12px;
      background: #0d1714;
    }

    #adminAccessScreen .permission-item:hover {
      border-color: #31594b;
      background: #101c18;
    }

    #adminAccessScreen .permission-item b {
      display: block;
      font-size: 12px;
      color: #e3ece7;
    }

    #adminAccessScreen .permission-item small {
      display: block;
      margin-top: 4px;
      line-height: 1.4;
    }

    #adminAccessScreen .permission-save {
      margin-top: 14px;
      min-width: 150px;
    }

    #adminAccessScreen .access-back {
      flex: none;
    }

    @media (max-width: 900px) {
      #ownerTools .admin-list-head { display: none; }
      #ownerTools .admin-row {
        grid-template-columns: minmax(0, 1fr) auto !important;
      }
      #ownerTools .admin-row > div:nth-child(2) {
        grid-column: 1;
      }
      #ownerTools .admin-access-col {
        grid-column: 2;
      }
      #ownerTools .admin-row > .admin-actions {
        grid-column: 1 / -1;
        width: 100%;
        grid-template-columns: minmax(0, 1fr) auto;
      }
      #adminAccessScreen .permission-grid {
        grid-template-columns: 1fr !important;
      }
    }

    @media (max-width: 560px) {
      #ownerTools .admin-row {
        grid-template-columns: 1fr !important;
        gap: 9px !important;
      }
      #ownerTools .admin-row > div:nth-child(2),
      #ownerTools .admin-access-col,
      #ownerTools .admin-row > .admin-actions {
        grid-column: 1 !important;
      }
      #ownerTools .admin-access-col {
        width: 100%;
      }
      #ownerTools .admin-row > .admin-actions {
        grid-template-columns: minmax(0, 1fr) auto;
      }
      #adminAccessScreen .access-toolbar {
        align-items: flex-start;
        flex-direction: column;
      }
      #adminAccessScreen .access-back {
        width: 100%;
      }
    }
  `;
  document.head.appendChild(css);

  let accessScreen = null;
  let currentEditor = null;
  let currentAccessButton = null;

  function ensureAccessScreen() {
    if (accessScreen) return accessScreen;
    const ownerTools = document.getElementById('ownerTools');
    if (!ownerTools) return null;

    accessScreen = document.createElement('div');
    accessScreen.id = 'adminAccessScreen';
    accessScreen.innerHTML = `
      <div class="access-toolbar">
        <div class="access-title">
          <b id="adminAccessName">Hak Akses Admin</b>
          <small>Atur permission admin di panel terpisah.</small>
        </div>
        <button type="button" class="btn ghost access-back">← Kembali ke Daftar Admin</button>
      </div>
      <div class="access-body" id="adminAccessBody"></div>
    `;

    const list = document.getElementById('adminList');
    if (list?.parentElement) list.parentElement.insertBefore(accessScreen, list);
    else ownerTools.appendChild(accessScreen);

    accessScreen.querySelector('.access-back').addEventListener('click', closeAccessPanel);
    return accessScreen;
  }

  function openAccessPanel(row, editor, button) {
    const screen = ensureAccessScreen();
    if (!screen) return;

    const list = document.getElementById('adminList');
    const header = document.getElementById('adminListHeader');
    const name = row.querySelector('b')?.textContent || 'Admin';

    currentEditor = editor;
    currentAccessButton = button;

    document.getElementById('adminAccessName').textContent = `Hak Akses · ${name}`;
    const body = document.getElementById('adminAccessBody');
    body.innerHTML = '';
    body.appendChild(editor);
    editor.style.display = 'block';

    if (header) header.style.display = 'none';
    if (list) list.style.display = 'none';
    screen.classList.add('open');

    const save = editor.querySelector('.permission-save');
    if (save && !save.dataset.panelBound) {
      save.dataset.panelBound = '1';
      save.addEventListener('click', () => {
        setTimeout(() => {
          const checked = editor.querySelectorAll('[data-permission]:checked').length;
          const total = editor.querySelectorAll('[data-permission]').length;
          if (currentAccessButton) currentAccessButton.textContent = `Akses Admin ${checked}/${total}`;
          closeAccessPanel();
        }, 180);
      });
    }
  }

  function closeAccessPanel() {
    if (!accessScreen) return;
    const list = document.getElementById('adminList');
    const header = document.getElementById('adminListHeader');
    if (currentEditor) currentEditor.style.display = 'none';
    currentEditor = null;
    currentAccessButton = null;
    if (header) header.style.display = '';
    if (list) list.style.display = '';
    accessScreen.classList.remove('open');
  }

  function compactRow(row) {
    if (row.dataset.cleanAdmin === '1') return;
    const editor = row.querySelector('.permission-row-editor');
    const info = row.querySelector(':scope > div:nth-child(2)');
    const actions = row.querySelector(':scope > .admin-actions');
    if (!info || !actions || !editor) return;

    row.dataset.cleanAdmin = '1';

    const checks = [...editor.querySelectorAll('[data-permission]')];
    const active = checks.filter(x => x.checked).length;
    const total = checks.length;

    const accessCol = document.createElement('div');
    accessCol.className = 'admin-access-col';

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'admin-access-button';
    button.textContent = `Akses Admin ${active}/${total}`;
    button.addEventListener('click', () => openAccessPanel(row, editor, button));

    accessCol.appendChild(button);
    row.insertBefore(accessCol, actions);
    editor.style.display = 'none';
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
    ensureAccessScreen();
    addHeader(list);
    list.querySelectorAll(':scope > .admin-row').forEach(compactRow);
  }

  function boot() {
    const list = document.getElementById('adminList');
    if (!list) return setTimeout(boot, 350);
    scan();
    new MutationObserver(scan).observe(list, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
