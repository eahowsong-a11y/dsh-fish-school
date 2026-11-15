    // fish → 共享文件夹 / 共享会话 / 手动共享 → share → nested subfolders → files/sessions.
    // Groups with no items are hidden, so empty categories never show up.
    function V3ShareTree({ data, q, self, onPreview, onChanged }) {
      const [open, setOpen] = useState(() => new Set());
      const toggle = k => setOpen(prev => { const s = new Set(prev); s.has(k) ? s.delete(k) : s.add(k); return s; });
      const isOpen = k => Boolean(q) || open.has(k);
      const fishName = data?.fish?.name ?? '';
      const items = (data?.items ?? []).filter(it => !q || v3Hay(it).includes(q));
      const byCol = new Map();
      for (const it of items) { if (!byCol.has(it.collectionId)) byCol.set(it.collectionId, []); byCol.get(it.collectionId).push(it); }
      const run = async fn => { try { await fn(); onChanged?.(); } catch (err) { alert(err.message); } };

      const row = (depth, key, icon, label, meta, onClick, actions) => h('div', {
        key, className: 'fs3-row', style: { paddingLeft: 8 + depth * 18 }, onClick, title: label,
      },
        h('span', { style: { flexShrink: 0 } }, icon),
        h('span', { style: { flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, label),
        meta != null && h('span', { className: 'fs3-card-sub', style: { margin: 0 } }, meta),
        actions && h('span', { className: 'fs3-acts', onClick: e => e.stopPropagation() }, actions));

      const leaf = (it, depth) => {
        const priv = it.effectivePublic === false || it.isPublic === false;
        const ref = '@' + fishName + '/' + it.type + '/' + it.id;
        const label = it.title || it.summary || it.name || String(it.path || '').split('/').pop() || it.id;
        return row(depth, it.id, it.type === 'conversation' ? '💬' : '📄', label,
          (priv ? '🔒 ' : '') + (it.messageCount ? it.messageCount + ' 条' : ''),
          () => onPreview({ ...it, author: fishName, authorId: data?.fish?.id, remote: !self }),
          h(React.Fragment, null,
            h('button', { className: 'fs3-btn', title: '预览', onClick: () => onPreview({ ...it, author: fishName, authorId: data?.fish?.id, remote: !self }) }, '👁'),
            h('button', { className: 'fs3-btn', title: '复制引用 ' + ref, onClick: () => copyText(ref) }, '🔗'),
            self && h('button', { className: 'fs3-btn', title: priv ? '设为公开' : '设为私有',
              onClick: () => run(() => v3Post('/set-visibility', { id: it.id, isPublic: it.isPublic === false })) }, priv ? '🔓' : '🔒'),
            self && it.type !== 'file' && h('button', { className: 'fs3-btn danger', title: '删除',
              onClick: () => confirm('确定删除「' + label + '」？') && run(() => v3Post('/delete', { id: it.id })) }, '🗑')));
      };

      const dir = (node, depth, prefix) => [
        ...[...node.dirs.entries()].sort((a, b) => a[0].localeCompare(b[0], 'zh')).flatMap(([name, child]) => {
          const k = prefix + '/' + name;
          return [row(depth, k, isOpen(k) ? '📂' : '📁', name, child.count, () => toggle(k)),
            ...(isOpen(k) ? dir(child, depth + 1, k) : [])];
        }),
        ...[...node.files].sort((a, b) => String(a.name || a.title || '').localeCompare(String(b.name || b.title || ''), 'zh')).map(it => leaf(it, depth)),
      ];

      const groups = ['folder', 'project', 'manual'].map(g => {
        const kinds = g === 'manual' ? ['manual', 'upload'] : [g];
        const cols = (data?.collections ?? []).filter(c => kinds.includes(c.kind)).map(c => ({ c, list: byCol.get(c.id) ?? [] })).filter(x => x.list.length);
        return { g, cols, count: cols.reduce((n, x) => n + x.list.length, 0) };
      }).filter(x => x.count > 0);

      if (!groups.length) return h('div', { className: 'fs3-card-sub', style: { padding: '4px 30px 8px' } }, q ? '没有匹配项' : '还没有共享内容');
      return h('div', null, groups.flatMap(({ g, cols, count }) => {
        const gk = g;
        return [row(1, gk, V3_KIND_ICON[g], V3_KIND_LABEL[g], count, () => toggle(gk)),
          ...(isOpen(gk) ? cols.flatMap(({ c, list }) => {
            const ck = gk + '/' + c.id;
            const priv = c.kind !== 'manual' && c.visibility !== 'public';
            return [row(2, ck, priv ? '🔒' : V3_KIND_ICON[c.kind], c.name, list.length, () => toggle(ck)),
              ...(isOpen(ck) ? (c.kind === 'folder' ? dir(v3Tree(list), 3, ck) : list.map(it => leaf(it, 3))) : [])];
          }) : [])];
      }));
    }

    // One fish in the library; loads its tree only when expanded or searched.
    function V3FishBlock({ fish, q, self, tick, onPreview, onChanged, defaultOpen }) {
      const [exp, setExp] = useState(!!defaultOpen);
      const open = exp || Boolean(q);
      const { data, loading, error } = useFishTree(fish.id, open && (self || fish.online !== false), tick);
      if (q && data && !(data.items ?? []).some(it => v3Hay(it).includes(q))) return null;
      return h('div', { className: 'fs3-card', style: { padding: '6px 4px' } },
        h('div', { className: 'fs3-row', onClick: () => setExp(v => !v) },
          h('span', null, open ? '▾' : '▸'), h('span', null, '🐟'),
          h('span', { style: { fontWeight: 600, flex: 1 } }, fish.name, self ? '（我）' : ''),
          h('span', { className: 'fs3-dot' + (self || fish.online ? ' on' : '') }),
          h('span', { className: 'fs3-card-sub', style: { margin: 0 } }, self || fish.online ? '在线' : '离线')),
        open && (loading && !data ? h('div', { className: 'fs3-empty' }, '加载中…')
          : error && !data ? h('div', { className: 'fs3-err' }, error)
          : !self && fish.online === false && !data ? h('div', { className: 'fs3-card-sub', style: { padding: '4px 30px' } }, '这条鱼离线了')
          : h(V3ShareTree, { data, q, self, onPreview, onChanged })));
    }
