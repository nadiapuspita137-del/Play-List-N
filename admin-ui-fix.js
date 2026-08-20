(() => {
  if (!location.pathname.endsWith('/admin.html') && !location.pathname.endsWith('admin.html')) return;

  const style = document.createElement('style');
  style.id = 'admin-ui-fix-style';
  style.textContent = `
    /* Rapikan area Kelola Admin */
    #ownerTools[data-view="admins"] {
      max-width: 1120px;
    }

    #ownerTools #adminList {
      display: grid;
      gap: 10px;
      margin-top: 18px !important;
      max-height: min(62vh, 720px);
      overflow-y: auto;
      padding-right: 4px;
      scrollbar-gutter: stable;
    }

    #ownerTools #adminList::-webkit-scrollbar {
      width: 7px;
    }

    #ownerTools #adminList::-webkit-scrollbar-thumb {
      background: #2c4a40;
      border-radius: 999px;
    }

    #ownerTools .admin-row {
      display: grid;
      grid-template-columns: 44px minmax(220px, 1fr) auto;
      align-items: center;
      gap: 14px;
      margin: 0 !important;
      min-height: 78px;
      padding: 12px 14px;
      border: 1px solid #24372f;
      border-radius: 16px;
      background: linear-gradient(145deg, #0d1613, #0a100e);
      transition: border-color .18s ease, background .18s ease, transform .18s ease;
    }

    #ownerTools .admin-row:hover {
      border-color: #31594b;
      background: linear-gradient(145deg, #101c18, #0b1210);
      transform: translateY(-1px);
    }

    #ownerTools .admin-avatar {
      width: 42px;
      height: 42px;
      border-radius: 13px;
      background: #00dc7c12;
      border: 1px solid #00dc7c25;
      color: #00e786;
      font-size: 18px;
    }

    #ownerTools .admin-row > div:nth-child(2) {
      min-width: 0;
    }

    #ownerTools .admin-row > div:nth-child(2) > b {
      display: block;
      font-size: 14px;
      line-height: 1.25;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    #ownerTools .admin-email {
      margin-top: 3px;
      font-size: 11px;
      line-height: 1.35;
      color: #8fa39a;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    #ownerTools .admin-row > div:nth-child(2) .muted {
      margin-top: 5px;
      font-size: 10px;
      line-height: 1.25;
      color: #667a71;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    #ownerTools .admin-actions {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 7px;
      flex-wrap: nowrap;
      min-width: max-content;
    }

    #ownerTools .quota-editor {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      min-height: 34px;
      padding: 4px 5px 4px 9px;
      border: 1px solid #263e35;
      border-radius: 10px;
      background: #080d0b;
      color: #7f9389;
      font-size: 10px;
      white-space: nowrap;
    }

    #ownerTools .quota-editor input {
      width: 54px;
      height: 26px;
      padding: 4px 6px;
      border-radius: 7px;
      background: #111a17;
      border: 1px solid #2b4037;
      color: #fff;
      font-size: 11px;
    }

    #ownerTools .admin-row .btn {
      min-height: 32px;
      padding: 7px 10px;
      border-radius: 9px;
      font-size: 10px;
      line-height: 1;
      white-space: nowrap;
    }

    #ownerTools .admin-list-empty {
      padding: 28px 16px;
      text-align: center;
      border: 1px dashed #2b4037;
      border-radius: 15px;
      color: #71827b;
      background: #0a100e;
    }

    @media (max-width: 920px) {
      #ownerTools .admin-row {
        grid-template-columns: 42px minmax(0, 1fr);
        align-items: start;
      }

      #ownerTools .admin-actions {
        grid-column: 2;
        justify-content: flex-start;
        min-width: 0;
        flex-wrap: wrap;
      }
    }

    @media (max-width: 560px) {
      #ownerTools #adminList {
        max-height: none;
        overflow: visible;
      }

      #ownerTools .admin-row {
        grid-template-columns: 38px minmax(0, 1fr);
        gap: 10px;
        padding: 11px;
      }

      #ownerTools .admin-avatar {
        width: 38px;
        height: 38px;
      }

      #ownerTools .admin-actions > * {
        flex: 0 0 auto;
      }
    }
  `;
  document.head.appendChild(style);

  const polishEmptyState = () => {
    const list = document.getElementById('adminList');
    if (!list) return;
    const p = list.querySelector(':scope > p.muted');
    if (p) p.classList.add('admin-list-empty');
  };

  const list = document.getElementById('adminList');
  if (list) {
    new MutationObserver(polishEmptyState).observe(list, {
      childList: true,
      subtree: true,
    });
    polishEmptyState();
  } else {
    const retry = setInterval(() => {
      const target = document.getElementById('adminList');
      if (!target) return;
      clearInterval(retry);
      new MutationObserver(polishEmptyState).observe(target, {
        childList: true,
        subtree: true,
      });
      polishEmptyState();
    }, 250);
    setTimeout(() => clearInterval(retry), 30000);
  }
})();
