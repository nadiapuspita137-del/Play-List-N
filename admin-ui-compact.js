(() => {
  if (!/admin\.html(?:$|[?#])/.test(location.pathname + location.search + location.hash)) return;

  const css = document.createElement('style');
  css.id = 'admin-ui-compact-style';
  css.textContent = `
    /* Compact owner admin list */
    #ownerTools .admin-row {
      display: grid !important;
      grid-template-columns: 42px minmax(0,1fr) auto !important;
      align-items: center !important;
      min-height: 72px !important;
      margin: 0 0 8px !important;
      padding: 11px 13px !important;
      border-radius: 14px !important;
      background: #0b1210 !important;
    }

    #ownerTools #adminList {
      display: grid !important;
      gap: 0 !important;
      max-height: min(64vh, 700px) !important;
      overflow: auto !important;
      padding-right: 4px !important;
    }

    #ownerTools .permission-row-editor {
      display: none !important;
    }

    #ownerTools .admin-actions {
      display: flex !important;
      align-items: center !important;
      justify-content: flex-end !important;
      gap: 6px !important;
      flex-wrap: nowrap !important;
      min-width: max-content !important;
    }

    #ownerTools .quota-editor {
      min-height: 32px !important;
      padding: 4px 5px 4px 8px !important;
      border-radius: 9px !important;
      font-size: 10px !important;
    }

    #ownerTools .quota-editor input {
      width: 50px !important;
      height: 24px !important;
      padding: 3px 5px !important;
      font-size: 10px !important;
    }

    #ownerTools .admin-row .btn {
      min-height: 30px !important;
      padding: 7px 9px !important;
      border-radius: 8px !important;
      font-size: 10px !important;
      white-space: nowrap !important;
    }

    .admin-access-summary {
      display: flex;
      align-items: center;
      gap: 7px;
      margin-top: 5px;
      color: #71847a;
      font-size: 10px;
    }

    .admin-access-summary .dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #00dc7c;
      flex: none;
    }

    .admin-access-btn {
      margin-left: 4px;
      padding: 3px 7px;
      border: 1px solid #29443a;
      border-radius: 7px;
      background: #101b17;
      color: #9fe9c7;
      cursor: pointer;
      font-size: 9px;
      font-weight: 800;
    }

    .admin-access-btn:hover {
      background: #162720;
      border-color: #3b6a59;
    }

    #adminAccessModal {
      position: fixed;
      inset: 0;
      z-index: 9999;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 18px;
      background: rgba(0,0,0,.72);
      backdrop-filter: blur(7px);
    }

    #adminAccessModal.open { display: flex; }

    #adminAccessModal .access-dialog {
      width: min(680px, 100%);
      max-height: min(82vh, 760px);
      overflow: auto;
      padding: 20px;
      border: 1px solid #29443a;
      border-radius: 18px;
      background: linear-gradient(145deg,#111b18,#08100e);
      box-shadow: 0 30px 100px rgba(0,0,0,.58);
    }

    .access-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 14px;
    }

    .access-head h3 {
      margin: 0;
      font-size: 18px;
    }

    .access-head small {
      display: block;
      margin-top: 4px;
      color: #7e9188;
      font-size: 11px;
    }

    .access-close {
      width: 32px;
      height: 32px;
      border: 1px solid #2c4037;
      border-radius: 9px;
      background: #0c1411;
      color: #cbd7d2;
      cursor: pointer;
    }

    #adminAccessModal .permission-editor {
      margin-top: 0 !important;
      padding: 0 !important;
      border: 0 !important;
      background: transparent !important;
    }

    #adminAccessModal .permission-title {
      margin-bottom: 12px;
    }

    #adminAccessModal .permission-grid {
      display: grid;
      grid-template-columns: repeat(2,minmax(0,1fr));
      gap: 8px;
    }

    #adminAccessModal .permission-item {
      min-height: 66px;
      padding: 10px !important;
    }

    @media (max-width: 760px) {
      #ownerTools .admin-row {
        grid-template-columns: 38px minmax(0,1fr) !important;
      }

      #ownerTools .admin-actions {
        grid-column: 2;
        justify-content: flex-start !important;
        flex-wrap: wrap !important;
        min-width: 0 !important;
        margin-top: 8px;
      }

      #adminAccessModal .permission-grid {
        grid-template-columns: 1fr;
      }
    }
  `;
  document.head.appendChild(css);

  let modal = null;

  function ensureModal() {
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'adminAccessModal';
    modal.innerHTML = `
      <div class="access-dialog">
        <div class="access-head">
          <div>
            <h3>Hak Akses Admin</h3>
            <small id="accessAdminName">Atur permission admin</small>
          </div>
          <button class="access-close" type="button" aria-label="Tutup">×</button>
        </div>
        <div id="accessEditor"></div>
      </div>`;
    document.body.appendChild(modal);

    modal.querySelector('.access-close').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal();
    });
    return modal;
  }

  function closeModal() {
    modal?.classList.remove('open');
    const editor = document.getElementById('accessEditor');
    if (editor) editor.innerHTML = '';
  }

  function openEditor(row, editor) {
    const m = ensureModal();
    const target = document.getElementById('accessEditor');
    const name = row.querySelector('b')?.textContent || 'Admin';
    document.getElementById('accessAdminName').textContent = `${name} • ubah permission`;
    target.innerHTML = '';
    target.appendChild(editor);
    editor.style.display = 'block';
    m.classList.add('open');
  }

  function compactRow(row) {
    if (row.dataset.compactReady === '1') return;
    const editor = row.querySelector('.permission-row-editor');
    if (!editor) return;

    row.dataset.compactReady = '1';

    const checkboxes = [...editor.querySelectorAll('[data-permission]')];
    const active = checkboxes.filter((x) => x.checked).length;

    const info = row.querySelector('.admin-row > div:nth-child(2)');
    if (info && !info.querySelector('.admin-access-summary')) {
      const summary = document.createElement('div');
      summary.className = 'admin-access-summary';
      summary.innerHTML = `<span class="dot"></span><span>${active}/${checkboxes.length} akses aktif</span>`;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'admin-access-btn';
      btn.textContent = 'Atur';
      btn.addEventListener('click', () => openEditor(row, editor));
      summary.appendChild(btn);
      info.appendChild(summary);
    }

    // Do not leave the giant editor in the row.
    editor.style.display = 'none';
  }

  function scan() {
    document.querySelectorAll('#adminList .admin-row').forEach(compactRow);
  }

  function boot() {
    const list = document.getElementById('adminList');
    if (!list) {
      setTimeout(boot, 400);
      return;
    }
    scan();
    new MutationObserver(scan).observe(list, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
