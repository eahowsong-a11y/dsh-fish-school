    // One fish card in a tree list; loads /tree only when expanded or searched.
    function V3FishBlock({ fish, q, self, tick, onPreview, onChanged, selection, setSelection }) {
      const [exp, setExp] = useState(!!self);
      const open = exp || Boolean(q);
      const { data, loading, error } = useFishTree(fish.id, open && (self || fish.online !== false), tick);
      if (q && data && !(data.items ?? []).some(it => v3Hay(it).includes(q))) return null;
      return h('div', { className: 'fs3-card', style: { padding: '6px 4px' } },
        h('div', { className: 'fs3-row', onClick: () => setExp(v => !v) },
          h('span', { style: { width: 12 } }, open ? '▾' : '▸'), h('span', null, '🐟'),
          h('span', { style: { fontWeight: 600, flex: 1 } }, fish.name, self ? '（我）' : ''),
          h('span', { className: 'fs3-dot' + (self || fish.online ? ' on' : '') }),
          h('span', { className: 'fs3-card-sub', style: { margin: 0 } }, self || fish.online ? '在线' : '离线')),
        open && (loading && !data ? h('div', { className: 'fs3-empty' }, '加载中…')
          : error && !data ? h('div', { className: 'fs3-err', style: { paddingLeft: 34 } }, error)
          : !self && fish.online === false && !data ? h('div', { className: 'fs3-card-sub', style: { padding: '4px 34px' } }, '这条鱼离线了')
          : h(V3ShareTree, { data, q, self, onPreview, onChanged, selection, setSelection })));
    }

    function V3LibraryTab({ libGroups, tick, onPreview }) {
      const [search, setSearch] = useState('');
      const q = search.trim().toLowerCase();
      return h('div', null,
        h('div', { className: 'fs3-bar' },
          h('input', { className: 'fs3-in', style: { flex: 1 }, placeholder: '搜索其他鱼共享的名称、路径、标签…', value: search, onChange: e => setSearch(e.target.value) })),
        libGroups.length === 0
          ? h('div', { className: 'fs3-empty' }, '还没有其他鱼。到「鱼群成员」添加 IP 或扫描局域网。')
          : libGroups.map(fish => h(V3FishBlock, { key: fish.id, fish, q, self: false, tick, onPreview })));
    }

    function V3MineTab({ me, tick, onPreview, onChanged }) {
      const [search, setSearch] = useState('');
      const [selection, setSelection] = useState(() => new Set());
      const [busy, setBusy] = useState(false);
      const q = search.trim().toLowerCase();
      const { data } = useFishTree(me.id, true, tick);
      const all = data?.items ?? [];
      const byId = new Map(all.map(i => [i.id, i]));
      const chosen = [...selection].filter(id => byId.has(id));
      // Folder files mirror the disk, so they can be hidden but not deleted one by one.
      const deletable = chosen.filter(id => byId.get(id).type !== 'file');
      const batch = async (fn, ids, ask) => {
        if (!ids.length || (ask && !confirm(ask))) return;
        setBusy(true);
        const fails = [];
        for (const id of ids) { try { await fn(id); } catch (err) { fails.push(err.message); } }
        setBusy(false); setSelection(new Set()); onChanged();
        if (fails.length) alert(fails.length + ' 项失败：' + fails[0]);
      };
      return h('div', null,
        h('div', { className: 'fs3-bar' },
          h('input', { className: 'fs3-in', style: { flex: 1 }, placeholder: '搜索我共享出去的内容…', value: search, onChange: e => setSearch(e.target.value) }),
          h('button', { className: 'fs3-btn', disabled: !all.length, onClick: () => setSelection(chosen.length === all.length ? new Set() : new Set(all.map(i => i.id))) },
            chosen.length === all.length && all.length ? '取消全选' : '全选')),
        chosen.length > 0 && h('div', { className: 'fs3-bar', style: { padding: '8px 12px', borderRadius: 8, background: 'var(--dsw-alias-bg-layer-2)' } },
          h('span', null, '已选 ', h('b', null, chosen.length), ' 项'),
          h('button', { className: 'fs3-btn', disabled: busy, onClick: () => batch(id => v3Post('/set-visibility', { id, isPublic: true }), chosen) }, '🔓 设为公开'),
          h('button', { className: 'fs3-btn', disabled: busy, onClick: () => batch(id => v3Post('/set-visibility', { id, isPublic: false }), chosen) }, '🔒 设为私有'),
          h('button', { className: 'fs3-btn danger', disabled: busy || !deletable.length,
            title: deletable.length < chosen.length ? '文件夹里的文件随磁盘同步，不能单独删除；可设为私有，或在「共享设置」里移除整个文件夹' : '',
            onClick: () => batch(id => v3Post('/delete', { id }), deletable, '确定删除选中的 ' + deletable.length + ' 项？') }, '🗑 删除 ' + deletable.length + ' 项'),
          h('button', { className: 'fs3-btn', style: { marginLeft: 'auto' }, onClick: () => setSelection(new Set()) }, '清除选择')),
        h(V3FishBlock, { fish: { id: me.id, name: me.name, online: true }, q, self: true, tick, onPreview, onChanged, selection, setSelection }));
    }

    function V3MembersTab({ status, onRefresh, onRenamed }) {
      const [addr, setAddr] = useState('');
      const [busy, setBusy] = useState(false);
      const [note, setNote] = useState('');
      const [editing, setEditing] = useState(false);
      const [name, setName] = useState(status.me.name);
      const run = async (fn) => { setBusy(true); setNote(''); try { await fn(); onRefresh(); } catch (err) { setNote('❌ ' + err.message); } finally { setBusy(false); } };
      const peers = [...(status.peers ?? [])].sort((a, b) => (b.online ? 1 : 0) - (a.online ? 1 : 0) || String(a.name).localeCompare(String(b.name), 'zh'));
      return h('div', { style: { maxWidth: 760 } },
        h('div', { className: 'fs3-card', style: { display: 'flex', alignItems: 'center', gap: 12 } },
          h('div', { style: { width: 40, height: 40, borderRadius: '50%', background: 'var(--dsw-alias-brand-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 } }, '🐟'),
          editing
            ? h('input', { className: 'fs3-in', style: { flex: 1 }, value: name, autoFocus: true, maxLength: 40, onChange: e => setName(e.target.value),
                onKeyDown: e => { if (e.key === 'Enter') run(async () => { await v3Post('/rename', { name: name.trim() }); setEditing(false); onRenamed(); }); if (e.key === 'Escape') setEditing(false); } })
            : h('div', { style: { flex: 1, minWidth: 0 } },
                h('div', { className: 'fs3-card-title' }, status.me.name, h('span', { className: 'fs3-card-sub', style: { margin: 0, fontWeight: 400 } }, '（我）')),
                h('div', { className: 'fs3-card-sub' }, 'ID ' + status.me.id.slice(0, 12) + '… · 端口 ' + status.port + (status.interfaces?.length ? ' · 已加入局域网组播' : ' · 未加入组播'))),
          editing
            ? h(React.Fragment, null,
                h('button', { className: 'fs3-btn primary', disabled: busy || !name.trim(), onClick: () => run(async () => { await v3Post('/rename', { name: name.trim() }); setEditing(false); onRenamed(); }) }, '保存'),
                h('button', { className: 'fs3-btn', onClick: () => { setEditing(false); setName(status.me.name); } }, '取消'))
            : h('button', { className: 'fs3-btn', onClick: () => setEditing(true) }, '✎ 改名')),
        h('div', { className: 'fs3-bar', style: { marginTop: 14 } },
          h('input', { className: 'fs3-in', style: { flex: 1 }, placeholder: '输入 IP 或 IP:端口 添加鱼', value: addr, onChange: e => setAddr(e.target.value),
            onKeyDown: e => { if (e.key === 'Enter' && addr.trim()) run(async () => { const r = await v3Post('/add-peer', { address: addr.trim() }); setAddr(''); setNote('✅ 已添加 ' + (r.peer?.name ?? addr)); }); } }),
          h('button', { className: 'fs3-btn primary', disabled: busy || !addr.trim(), onClick: () => run(async () => { const r = await v3Post('/add-peer', { address: addr.trim() }); setAddr(''); setNote('✅ 已添加 ' + (r.peer?.name ?? addr)); }) }, '➕ 添加'),
          h('button', { className: 'fs3-btn', disabled: busy, onClick: () => run(async () => { const r = await v3Post('/scan', {}); const n = r.found?.length ?? 0; setNote(n ? '✅ 找到 ' + n + ' 条鱼' : '本网段没有找到鱼'); }) }, busy ? '处理中…' : '📡 扫描局域网')),
        note && h('div', { className: 'fs3-card-sub', style: { margin: '0 0 8px' } }, note),
        h('div', { className: 'fs3-card-sub', style: { margin: '12px 0 4px' } }, '鱼群成员 ' + peers.length + ' · 在线 ' + peers.filter(p => p.online).length),
        peers.length === 0 ? h('div', { className: 'fs3-empty' }, '还没有其他鱼。同一局域网的鱼会自动发现，也可以在上面手动添加。')
        : peers.map(p => h('div', { key: p.id ?? p.address, className: 'fs3-card', style: { display: 'flex', alignItems: 'center', gap: 10, opacity: p.online ? 1 : .65 } },
            h('span', { className: 'fs3-dot' + (p.online ? ' on' : '') }),
            h('div', { style: { flex: 1, minWidth: 0 } },
              h('div', { className: 'fs3-card-title' }, p.name || p.address),
              h('div', { className: 'fs3-card-sub' }, p.address + ':' + p.port + ' · ' + (p.source === 'manual' ? '手动添加' : '自动发现') + (p.lastSeen ? ' · ' + v3Ago(p.lastSeen) + '活跃' : ''))),
            h('span', { className: 'fs3-card-sub', style: { margin: 0 } }, p.online ? '在线' : '离线'),
            h('button', { className: 'fs3-btn danger sm', disabled: busy, onClick: () => confirm('移除 ' + (p.name || p.address) + '？') && run(() => v3Post('/remove-peer', { address: p.address })) }, '移除'))));
    }
