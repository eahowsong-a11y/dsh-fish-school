    // fish → 共享文件夹 / 共享会话 / 手动共享 → share → nested subfolders → items.
    // Empty groups are hidden. With `selection`, rows show checkboxes for batch actions.
    function V3ShareTree({ data, q, self, onPreview, onChanged, selection, setSelection }) {
      const [open, setOpen] = useState(() => new Set());
      const toggle = k => setOpen(p => { const s = new Set(p); s.has(k) ? s.delete(k) : s.add(k); return s; });
      const isOpen = k => Boolean(q) || open.has(k);
      const fishName = data?.fish?.name ?? '';
      const items = (data?.items ?? []).filter(it => !q || v3Hay(it).includes(q));
      const byCol = new Map();
      for (const it of items) { if (!byCol.has(it.collectionId)) byCol.set(it.collectionId, []); byCol.get(it.collectionId).push(it); }
      const run = async fn => { try { await fn(); onChanged?.(); } catch (err) { alert(err.message); } };
      const pick = (ids, on) => setSelection?.(p => { const s = new Set(p); for (const id of ids) on ? s.add(id) : s.delete(id); return s; });
      const box = ids => selection && h('input', { type: 'checkbox', onClick: e => e.stopPropagation(),
        checked: ids.length > 0 && ids.every(id => selection.has(id)), onChange: e => pick(ids, e.target.checked) });

      const row = (depth, key, ids, icon, label, meta, onClick, actions, title) => h('div', {
        key, className: 'fs3-row' + (ids.length === 1 && selection?.has(ids[0]) ? ' sel' : ''), style: { paddingLeft: 8 + depth * 18 }, onClick, title: title || label,
      },
        box(ids), h('span', { style: { flexShrink: 0 } }, icon),
        h('span', { style: { flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, label),
        meta != null && meta !== '' && h('span', { className: 'fs3-card-sub', style: { margin: 0, flexShrink: 0 } }, meta),
        actions && h('span', { className: 'fs3-acts', onClick: e => e.stopPropagation() }, actions));

      const preview = it => onPreview({ ...it, author: fishName, authorId: data?.fish?.id, remote: !self });
      const leaf = (it, depth) => {
        const priv = it.effectivePublic === false || it.isPublic === false;
        const ref = '@' + fishName + '/' + it.type + '/' + it.id;
        const label = it.title || it.summary || it.name || String(it.path || '').split('/').pop() || it.id;
        const meta = (priv ? '🔒 ' : '') + (it.type === 'conversation' ? (it.messageCount ? it.messageCount + ' 条消息' : '') : v3Ago(it.updatedAt));
        return row(depth, it.id, [it.id], it.type === 'conversation' ? '💬' : '📄', label, meta, () => preview(it),
          h(React.Fragment, null,
            h('button', { className: 'fs3-btn sm', title: '预览', onClick: () => preview(it) }, '👁'),
            h('button', { className: 'fs3-btn sm', title: '复制引用 ' + ref, onClick: () => copyText(ref) }, '🔗'),
            self && h('button', { className: 'fs3-btn sm', title: priv ? '设为公开' : '设为私有',
              onClick: () => run(() => v3Post('/set-visibility', { id: it.id, isPublic: it.isPublic === false })) }, priv ? '🔓' : '🔒'),
            self && it.type !== 'file' && h('button', { className: 'fs3-btn sm danger', title: '删除',
              onClick: () => confirm('确定删除「' + label + '」？') && run(() => v3Post('/delete', { id: it.id })) }, '🗑')),
          it.path || label);
      };
      const idsOf = node => [...node.files.map(f => f.id), ...[...node.dirs.values()].flatMap(idsOf)];
      const dir = (node, depth, prefix) => [
        ...[...node.dirs.entries()].sort((a, b) => a[0].localeCompare(b[0], 'zh')).flatMap(([name, child]) => {
          const k = prefix + '/' + name;
          return [row(depth, k, idsOf(child), isOpen(k) ? '📂' : '📁', name, child.count, () => toggle(k)), ...(isOpen(k) ? dir(child, depth + 1, k) : [])];
        }),
        ...[...node.files].sort((a, b) => String(a.name || a.title || '').localeCompare(String(b.name || b.title || ''), 'zh')).map(it => leaf(it, depth)),
      ];

      const groups = ['folder', 'project', 'manual'].map(g => {
        const kinds = g === 'manual' ? ['manual', 'upload'] : [g];
        const cols = (data?.collections ?? []).filter(c => kinds.includes(c.kind)).map(c => ({ c, list: byCol.get(c.id) ?? [] })).filter(x => x.list.length);
        return { g, cols, ids: cols.flatMap(x => x.list.map(i => i.id)) };
      }).filter(x => x.ids.length);

      if (!groups.length) return h('div', { className: 'fs3-card-sub', style: { padding: '4px 34px 8px' } }, q ? '没有匹配项' : '还没有共享内容');
      return h('div', null, groups.flatMap(({ g, cols, ids }) => [
        row(1, g, ids, V3_KIND_ICON[g], V3_KIND_LABEL[g], ids.length, () => toggle(g)),
        ...(isOpen(g) ? cols.flatMap(({ c, list }) => {
          const ck = g + '/' + c.id;
          const priv = c.kind !== 'manual' && c.visibility !== 'public';
          return [row(2, ck, list.map(i => i.id), priv ? '🔒' : V3_KIND_ICON[c.kind], c.name, list.length, () => toggle(ck)),
            ...(isOpen(ck) ? (c.kind === 'folder' ? dir(v3Tree(list), 3, ck) : list.map(it => leaf(it, 3))) : [])];
        }) : []),
      ]));
    }
