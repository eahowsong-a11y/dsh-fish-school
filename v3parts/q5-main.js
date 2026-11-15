    function V3SettingsTab({ myCollections, myTreeTick, onChanged, status }) {
      const [seg, setSeg] = useState('folder');
      const [newForm, setNewForm] = useState(null);
      const [form, setForm] = useState({ name: '', path: '' });
      const [busy, setBusy] = useState(false);
      const [pickerMode, setPickerMode] = useState(null);
      const [workspaces, setWs] = useState([]);
      useEffect(() => { api('/workspaces').then(d => setWs(d.workspaces ?? [])).catch(() => {}); }, []);
      const cols = myCollections.filter(c => (seg === 'manual' && ['manual','upload'].includes(c.kind)) || c.kind === seg);
      const create = async () => {
        if (!form.name.trim() || (newForm !== 'manual' && !form.path.trim())) { alert('名称和路径必填'); return; }
        setBusy(true);
        try {
          await v3Post('/collections', { kind: newForm, name: form.name.trim(), root: form.path.trim(), visibility: 'public' });
          setForm({ name: '', path: '' }); setNewForm(null);
          onChanged();
        } catch (err) { alert(err.message); } finally { setBusy(false); }
      };
      const deleteCol = async (id) => {
        try {
          await v3Post('/collections/delete', { id });
          onChanged();
        } catch (err) { alert(err.message); }
      };
      const resyncCol = async (id) => {
        try {
          await v3Post('/collections/resync', { id });
          onChanged();
        } catch (err) { alert(err.message); }
      };
      return h('div', null,
        h('div', { className: 'fs3-bar', style: { justifyContent: 'space-between', alignItems: 'center' } },
          h('span', { style: { fontWeight: 600 } }, seg === 'folder' ? '📁 共享文件夹' : seg === 'project' ? '🗂️ 共享会话' : '✍️ 手动共享'),
          h('button', { className: 'fs3-btn primary', onClick: () => setNewForm(seg) }, '➕ 新建共享')),
        h('div', { className: 'fs3-seg', style: { marginBottom: 14 } },
          ['folder', 'project', 'manual'].map(s => h('button', { key: s, className: seg === s ? 'on' : '', onClick: () => { setSeg(s); setNewForm(null); } },
            s === 'folder' ? '📁 文件夹' : s === 'project' ? '🗂️ 项目' : '✍️ 手动'))),
        newForm && h('div', { className: 'fs3-form' },
          h('label', null, '名称'),
          h('input', { className: 'fs3-in', value: form.name, onChange: e => setForm(f => ({ ...f, name: e.target.value })), disabled: busy, placeholder: '给这个共享起个名字' }),
          newForm !== 'manual' && [
            h('label', { key: 'l' }, newForm === 'folder' ? '路径' : '工作区'),
            h('div', { key: 'inp', style: { display: 'flex', gap: 6 } },
              h('input', { className: 'fs3-in', value: form.path, onChange: e => setForm(f => ({ ...f, path: e.target.value })), disabled: busy, placeholder: newForm === 'folder' ? '本地文件夹路径' : '项目工作区路径', style: { flex: 1 } }),
              h('button', { className: 'fs3-btn', disabled: busy, onClick: () => setPickerMode(newForm) }, '浏览')),
          ],
          newForm === 'project' && workspaces.length > 0 && [
            h('label', { key: 'l', style: { gridColumn: '1 / -1' } }, '快捷工作区'),
            h('div', { key: 'btns', style: { gridColumn: '1 / -1', display: 'flex', gap: 4, flexWrap: 'wrap' } },
              workspaces.slice(0, 4).map(w => h('button', { key: w.cwd, className: 'fs3-btn sm', disabled: busy, onClick: () => setForm(f => ({ ...f, path: w.cwd })) }, w.name || w.cwd.split(/[\\/]/).pop()))),
          ],
          h('label', null, ''), h('div', { style: { display: 'flex', gap: 4, justifyContent: 'flex-end' } },
            h('button', { className: 'fs3-btn', disabled: busy, onClick: () => setNewForm(null) }, '取消'),
            h('button', { className: 'fs3-btn primary', disabled: busy || !form.name.trim() || (newForm !== 'manual' && !form.path.trim()), onClick: create }, newForm === 'folder' ? '新建文件夹共享' : newForm === 'project' ? '新建项目共享' : '新建手动共享'))),
        cols.length === 0
          ? h('div', { className: 'fs3-empty' }, '还没有' + (seg === 'folder' ? '共享文件夹。点上面「新建共享」按钮添加。' : seg === 'project' ? '共享会话。点上面「新建共享」按钮添加。' : '手动共享。在「我的共享」中选择项目后，也可点「新建共享」添加为手动共享。'))
          : cols.map(col => h('div', { key: col.id, className: 'fs3-card' },
              h('div', { className: 'fs3-card-title', style: { justifyContent: 'space-between' } },
                h('span', null, col.name, col.visibility !== 'public' ? ' 🔒' : ''),
                h('span', { className: 'fs3-card-sub', style: { margin: 0, fontWeight: 400 } }, col.kind === 'folder' ? '文件夹' : col.kind === 'project' ? '会话' : '手动')),
              h('div', { className: 'fs3-card-sub' }, col.source?.root || '…'),
              h('div', { style: { display: 'flex', gap: 4, marginTop: 8 } },
                h('button', { className: 'fs3-btn sm', onClick: () => resyncCol(col.id) }, '🔄 重新扫描'),
                h('button', { className: 'fs3-btn sm danger', onClick: () => confirm('确定删除「' + col.name + '」？') && deleteCol(col.id) }, '🗑 删除')))),
        pickerMode === 'folder' && h(V3FolderPicker, { initial: form.path, onPick: p => { setForm(f => ({ ...f, path: p })); setPickerMode(null); }, onClose: () => setPickerMode(null) }),
        pickerMode === 'project' && h(V3ProjectPicker, { onPick: p => { setForm(f => ({ ...f, path: p })); setPickerMode(null); }, onClose: () => setPickerMode(null), onBrowse: () => setPickerMode('folder') }));
    }

    function PanelV3({ t }) {
      const [{ status }, refresh] = useSchool();
      const [libGroups, setLibGroups] = useState([]);
      const [tab, setTab] = useState('library');
      const [tick, setTick] = useState(0);
      const myTreeState = useFishTree(status?.me?.id, true, tick);
      useV3Styles2();
      useEffect(() => {
        const load = () => api('/library').then(d => setLibGroups(d.fish?.filter(f => !f.self) || [])).catch(() => {});
        load();
        const id = setInterval(load, 10000);
        return () => clearInterval(id);
      }, []);
      if (!status) return h('div', { style: S.page }, t('loading'));
      const tabColor = V3_TABS.find(x => x.id === tab)?.color || '#4f8cff';
      const t3 = useV3Text(t);
      return h('div', { className: 'fs3', style: { '--tab': tabColor } },
        h('div', { className: 'fs3-top' },
          h('span', { style: { fontSize: 24 } }, '🐟'),
          h('h1', null, t('title')),
          h('span', { className: 'fs3-ver' }, 'v' + status.version),
          h('span', { className: 'fs3-ver', style: { marginLeft: 'auto' } }, (status.peers?.filter(p => p.online).length ?? 0) + 1, ' 在线'),
          h(V3UpdateBadge, { t, status, onUpdated: () => {} })),
        h('div', { className: 'fs3-tabs' },
          V3_TABS.map(tb => h('button', {
            key: tb.id, className: 'fs3-tab' + (tab === tb.id ? ' on' : ''), onClick: () => setTab(tb.id), style: { '--tab': tb.color },
          }, tb.icon, h('span', null, tb.zh), h('span', { className: 'n' }, tb.id === 'library' ? libGroups.length : tb.id === 'mine' ? myTreeState.data?.items?.length ?? 0 : '')))),
        h('div', { className: 'fs3-body' },
          tab === 'library' && h(V3LibraryTab, { libGroups, tick, onPreview: () => {} }),
          tab === 'mine' && h(V3MineTab, { me: status.me, tick, onPreview: () => {}, onChanged: () => setTick(t => t + 1) }),
          tab === 'settings' && h(V3SettingsTab, { myCollections: myTreeState.data?.collections ?? [], myTreeTick: tick, onChanged: () => setTick(t => t + 1), status }),
          tab === 'members' && h(V3MembersTab, { status, onRefresh: refresh, onRenamed: () => setTick(t => t + 1) })));
    }
