    // ---- 2.6.0 helpers: folder tree, folder picker, project picker ----
    const V3_KIND_LABEL = { folder: '共享文件夹', project: '共享会话', manual: '手动共享', upload: '手动共享' };
    const V3_KIND_ICON = { folder: '📁', project: '🗂️', manual: '✍️', upload: '✍️' };

    // Nest items by their relative path ("a/b/c.md" -> a > b > c.md).
    function v3Tree(items) {
      const root = { dirs: new Map(), files: [], count: 0 };
      for (const it of items) {
        const parts = it.type === 'file' ? String(it.path || '').replace(/\\/g, '/').split('/').filter(Boolean) : [];
        let node = root; node.count++;
        for (const seg of parts.slice(0, -1)) {
          if (!node.dirs.has(seg)) node.dirs.set(seg, { dirs: new Map(), files: [], count: 0 });
          node = node.dirs.get(seg); node.count++;
        }
        node.files.push(it);
      }
      return root;
    }

    function V3Dialog({ title, onClose, footer, children }) {
      useEffect(() => {
        const onKey = e => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
      }, [onClose]);
      return h('div', { className: 'fs3-mask', onClick: onClose },
        h('div', { className: 'fs3-dlg', onClick: e => e.stopPropagation() },
          h('div', { className: 'fs3-dlg-h' }, title,
            h('button', { className: 'fs3-btn', style: { marginLeft: 'auto', padding: '2px 8px' }, onClick: onClose }, '✕')),
          h('div', { className: 'fs3-dlg-b' }, children),
          footer && h('div', { className: 'fs3-dlg-f' }, footer)));
    }

    // Browse the local disk through GET /fs/list and return an absolute folder path.
    function V3FolderPicker({ initial, onPick, onClose }) {
      const [st, setSt] = useState({ path: '', parent: null, dirs: [], loading: true, error: '', truncated: false });
      const [typed, setTyped] = useState(initial || '');
      const go = useCallback(async p => {
        setSt(s => ({ ...s, loading: true, error: '' }));
        try {
          const d = await api('/fs/list?path=' + encodeURIComponent(p || ''));
          setSt({ path: d.path || '', parent: d.parent ?? null, dirs: d.dirs || [], loading: false, error: '', truncated: !!d.truncated });
          setTyped(d.path || '');
        } catch (err) { setSt(s => ({ ...s, loading: false, error: err.message })); }
      }, []);
      useEffect(() => { go(initial || ''); }, [go, initial]);
      return h(V3Dialog, {
        title: '📂 选择要共享的文件夹', onClose,
        footer: h(React.Fragment, null,
          h('span', { className: 'fs3-card-sub', style: { flex: 1, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, st.path || '请选择一个文件夹'),
          h('button', { className: 'fs3-btn', onClick: onClose }, '取消'),
          h('button', { className: 'fs3-btn primary', disabled: !st.path, onClick: () => onPick(st.path) }, '选择此文件夹')),
      },
        h('div', { style: { display: 'flex', gap: 6, marginBottom: 8 } },
          h('button', { className: 'fs3-btn', disabled: !st.path, title: '上一级', onClick: () => go(st.parent || '') }, '↑ 上一级'),
          h('button', { className: 'fs3-btn', onClick: () => go('') }, '🏠 常用位置'),
          h('input', { className: 'fs3-in', value: typed, placeholder: '输入路径后回车', onChange: e => setTyped(e.target.value),
            onKeyDown: e => { if (e.key === 'Enter') go(typed.trim()); } })),
        st.error ? h('div', { className: 'fs3-err' }, st.error)
        : st.loading ? h('div', { className: 'fs3-empty' }, '加载中…')
        : !st.dirs.length ? h('div', { className: 'fs3-empty' }, '这里没有子文件夹，可直接选择当前文件夹')
        : st.dirs.map(d => h('div', { key: d.path, className: 'fs3-row', title: d.path, onClick: () => go(d.path) },
            h('span', null, d.drive ? '💽' : d.shortcut ? '⭐' : '📁'), h('span', { style: { flex: 1 } }, d.name), h('span', { className: 'fs3-card-sub', style: { margin: 0 } }, '›'))),
        st.truncated && h('div', { className: 'fs3-card-sub' }, '只显示前 500 个子文件夹'));
    }

    // Pick a DSH workspace (cwd that has sessions) from GET /workspaces.
    function V3ProjectPicker({ onPick, onClose, onBrowse }) {
      const [st, setSt] = useState({ list: [], loading: true, error: '' });
      const [q, setQ] = useState('');
      useEffect(() => {
        api('/workspaces').then(d => setSt({ list: d.workspaces || [], loading: false, error: '' }))
          .catch(err => setSt({ list: [], loading: false, error: err.message }));
      }, []);
      const shown = st.list.filter(w => !q || w.cwd.toLowerCase().includes(q.toLowerCase()));
      return h(V3Dialog, {
        title: '🗂️ 选择 DSH 工作区', onClose,
        footer: h(React.Fragment, null,
          h('button', { className: 'fs3-btn', style: { marginRight: 'auto' }, onClick: onBrowse }, '📂 浏览其他文件夹…'),
          h('button', { className: 'fs3-btn', onClick: onClose }, '取消')),
      },
        h('input', { className: 'fs3-in', placeholder: '筛选工作区路径…', value: q, onChange: e => setQ(e.target.value), style: { marginBottom: 8 } }),
        st.error ? h('div', { className: 'fs3-err' }, st.error)
        : st.loading ? h('div', { className: 'fs3-empty' }, '加载中…')
        : !shown.length ? h('div', { className: 'fs3-empty' }, '没有找到包含会话的工作区')
        : shown.map(w => h('div', { key: w.cwd, className: 'fs3-row', title: w.cwd, onClick: () => onPick(w.cwd) },
            h('span', null, '🗂️'),
            h('span', { style: { flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' } }, w.cwd),
            h('span', { className: 'fs3-card-sub', style: { margin: 0 } }, w.sessions + ' 个会话'))));
    }
