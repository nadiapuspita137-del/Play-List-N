(() => {
  if (!/admin\.html(?:$|[?#])/.test(location.pathname + location.search + location.hash)) return;

  const css = document.createElement('style');
  css.id = 'admin-ui-compact-style';
  css.textContent = `
    #ownerTools .admin-row {
      position: relative;
      display: grid !important;
      grid-template-columns: 42px minmax(0,1fr) auto !important;
      align-items: center !important;
      min-height: 72px !important;
      margin: 0 0 8px !important;
      padding: 11px 13px !important;
      border-radius: 14px !important;
      background: #0b1210 !important;
      overflow: visible !important;
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

    .admin-access-wrap {
      position: relative;
      display: inline-flex;
      align-items: center;
    }

    .admin-access-dropdown-btn {
      min-height: 30px;
      padding: 7px 10px;
      border: 1px solid #29443a;
      border-radius: 8px;
      background: #101b17;
      color: #9fe9c7;
      cursor: pointer;
      font-size: 10px;
      font-weight: 850;
      white-space: nowrap;
    }

    .admin-access-dropdown-btn:hover,
    .admin-access-wrap.open .admin-access-dropdown-btn {
      background: #162720;
      border-color: #3b6a59;
    }

    .admin-edit-btn {
      min-height: 30px;
      padding: 7px 10px;
      border-radius: 8px;
      background: #0f1a16;
      color: #a8e5c9;
      border: 1px solid #29453a;
      font-size: 10px;
      font-weight: 850;
      cursor: pointer;
    }

    .admin-edit-btn:hover { background: #13231d; border-color: #3a6755; }

    .admin-access-dropdown {
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      z-index: 200;
      width: 290px;
      max-height: 390px;
      overflow: auto;
      padding: 10px;
      border: 1px solid #2b453b;
      border-radius: 13px;
      background: #0b1411;
      box-shadow: 0 18px 60px rgba(0,0,0,.55);
      display: none;
    }

    .admin-access-wrap.open .admin-access-dropdown {
      display: block;
    }

    .admin-access-title {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 8px;
      padding: 2px 2px 7px;
      border-bottom: 1px solid #20362d;
    }

    .admin-access-title b {
      font-size: 11px;
      color: #d9e6e0;
    }

    .admin-access-title span {
      color: #71857c;
      font-size: 9px;
    }

    .admin-access-dropdown .permission-row-editor {
      display: block !important;
      margin: 0 !important;
      padding: 0 !important;
      border: 0 !important;
      background: transparent !important;
    }

    .admin-access-dropdown .permission-title {
      display: none !important;
    }

    .admin-access-dropdown .permission-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 6px;
    }

    .admin-access-dropdown .permission-item {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      min-height: 0;
      padding: 8px !important;
      border: 1px solid #20352c;
      border-radius: 9px;
      background: #0d1714;
    }

    .admin-access-dropdown .permission-item input {
      margin-top: 2px;
    }

    .admin-access-dropdown .permission-item b {
      display: block;
      font-size: 10px;
      color: #dce7e2;
    }

    .admin-access-dropdown .permission-item small {
      display: none;
    }

    .admin-access-dropdown .permission-save {
      width: 100%;
      margin-top: 8px;
      padding: 8px 10px;
      font-size: 10px;
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

      .admin-access-dropdown {
        left: 0;
        right: auto;
        width: min(290px, calc(100vw - 40px));
      }
    }
  `;
  document.head.appendChild(css);

  function closeAll(except = null) {
    document.querySelectorAll('.admin-access-wrap.open').forEach((wrap) => {
      if (wrap !== except) wrap.classList.remove('open');
    });
  }

  document.addEventListener('click', (e) => {
    const button = e.target.closest('.admin-access-dropdown-btn');
    if (button) {
      e.preventDefault();
      e.stopPropagation();
      const wrap = button.closest('.admin-access-wrap');
      const willOpen = !wrap.classList.contains('open');
      closeAll(wrap);
      wrap.classList.toggle('open', willOpen);
      return;
    }

    if (!e.target.closest('.admin-access-wrap')) closeAll();
  });

  function compactRow(row) {
    if (row.dataset.dropdownReady === '1') return;
    const editor = row.querySelector('.permission-row-editor');
    if (!editor) return;
    row.dataset.dropdownReady = '1';

    // hide inline editor to keep list clean; use central panel instead
    editor.style.display = 'none';

    const actions = row.querySelector('.admin-actions');
    const info = row.querySelector('.admin-row > div:nth-child(2)') || row;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'admin-edit-btn';
    btn.textContent = 'Edit';
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      if (typeof openAccessPanel === 'function') {
        openAccessPanel(row, editor, btn);
      } else {
        const id = row.dataset.adminId || row.dataset.userId || row.dataset.songId || null;
        if (id) window.location.href = `/admin/edit/${id}`;
        else alert('Editor tidak tersedia.');
      }
    });

    if (actions) actions.insertBefore(btn, actions.firstChild);
    else {
      const actionWrap = document.createElement('div');
      actionWrap.className = 'admin-actions';
      actionWrap.appendChild(btn);
      info.appendChild(actionWrap);
    }
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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
