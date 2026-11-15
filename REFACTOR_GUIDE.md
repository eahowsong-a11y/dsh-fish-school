# Fish School UI Refactor: Four-Panel Layout Implementation Guide

**Status**: Ready to implement | **Scope**: UI layer only (no backend changes needed)  
**Est. Lines Changed**: ~800 in `client.js`  
**Breaking Changes**: None (preserves all existing functionality)

---

## Architecture

### New Layout Structure

```
┌─────────────────────────────────────────────────────────────────┐
│ 🐟 Fish School | v2.3.0  [🖊️ Rename]  [📡 Status] [↻ Version] │
├────────────────┬──────────────────┬─────────────────┬───────────┤
│ 共享知识库    │ 我的共享       │ 共享设置       │ 鱼群成员  │
│ (Remote libs) │ (My collections)│ (Create/Edit) │ (Peers)   │
│                │                │                 │           │
│ 🔍 Search     │ 📊 Stats       │ ➕ New Share   │ ➕ Add    │
│                │                │                │ 🔍 Scan   │
│ [Fish Groups] │ [My Coll List] │ [Form + List] │ [Peer List]
│  └─ Folder 1  │  ├─ 📁 Folder │ [File Browser]│           │
│  └─ Project 1 │  └─ 🗂️ Project│              │           │
│                │                │               │           │
└────────────────┴──────────────────┴────────────────┴───────────┘
```

### State Management

```javascript
// Keep existing
- status, entries, error, refresh (from useSchool)
- edit, draft, saving, update, previewItem
- checkUpdate, rename, handleDelete, handleToggleVisibility
- addPeer, scanLan, removePeer

// Add new four-panel state
const [libGroups, setLibGroups] = useState([]);           // /library endpoint
const [libSearch, setLibSearch] = useState('');           // Search query
const [expandFish, setExpandFish] = useState(new Set());  // Expanded fish IDs
const [expandCols, setExpandCols] = useState(new Set());  // Expanded collection IDs
const [myCollections, setMyCollections] = useState([]); // /collections endpoint
const [browsePath, setBrowsePath] = useState('');       // Folder browser state
const [dirs, setDirs] = useState([]);                    // /fs/list results
const [newShare, setNewShare] = useState({              // Form for new collection
  kind: 'folder', name: '', path: '', visibility: 'private'
});
```

### Effects to Add

```javascript
// Load library (remote + local fish view)
useEffect(() => {
  (async () => {
    try {
      const data = await api('/library');
      setLibGroups(data.fish || []);
    } catch (e) { console.error(e); }
  })();
  
  // Poll every 5s
  const id = setInterval(async () => {
    try {
      const data = await api('/library');
      setLibGroups(data.fish || []);
    } catch (e) { }
  }, 5000);
  return () => clearInterval(id);
}, []);

// Load my collections
useEffect(() => {
  (async () => {
    try {
      const data = await api('/collections');
      setMyCollections(data.collections?.filter(c => !c.remote) || []);
    } catch (e) { console.error(e); }
  })();
}, []);

// Folder browser API call
const browseFolders = async (path = '') => {
  try {
    const data = await api('/fs/list?path=' + encodeURIComponent(path));
    setDirs(data.dirs || []);
    setBrowsePath(data.path || '');
  } catch (e) { alert(e.message); }
};
```

### New API Helpers

```javascript
// Create collection (already exists as POST /collections)
const createShare = async (share) => {
  try {
    await api('/collections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: share.kind,
        name: share.name,
        visibility: share.visibility,
        root: share.path ? { root: share.path } : null
      })
    });
    // Reload collections
    const data = await api('/collections');
    setMyCollections(data.collections?.filter(c => !c.remote) || []);
  } catch (e) { alert(t('loadFailed', { e: e.message })); }
};

// Update collection (visibility toggle, name edit, path change)
const updateShare = async (id, patch) => {
  try {
    await api('/collections/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...patch })
    });
    const data = await api('/collections');
    setMyCollections(data.collections?.filter(c => !c.remote) || []);
  } catch (e) { alert(e.message); }
};

// Delete collection (already exists as POST /collections/delete)
const deleteShare = async (id) => {
  if (!confirm(t('delete') + '?')) return;
  try {
    await api('/collections/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    const data = await api('/collections');
    setMyCollections(data.collections?.filter(c => !c.remote) || []);
  } catch (e) { alert(e.message); }
};
```

---

## Component Breakdown

### Panel 1: Knowledge Library (共享知识库)

**Features**:
- Tree view: Fish → Collections → Items
- Search across all fish/collections
- Expand/collapse fish groups and collections
- Item preview on click
- Reference copy for items
- Visibility indicator (🔒 for private)

**Key Lines of Code**:
```javascript
function KnowledgeLibraryPanel() {
  return h('div', { style: { flex: '0 0 33%', display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--dsw-alias-border-l1)' } },
    // Header
    h('div', { style: { padding: '12px 16px', borderBottom: '1px solid var(--dsw-alias-border-l1)', backgroundColor: 'var(--dsw-alias-bg-layer-1)' } },
      h('h3', { style: { fontSize: 13, fontWeight: 600, margin: 0, marginBottom: 8 } }, t('knowledge')),
      h('input', { 
        type: 'text', 
        placeholder: t('searchPlaceholder'), 
        value: libSearch, 
        onChange: (e) => setLibSearch(e.target.value),
        style: { width: '100%', padding: '6px 10px', fontSize: 12, borderRadius: 4, border: '1px solid var(--dsw-alias-border-l2)', boxSizing: 'border-box' }
      })
    ),
    // Content
    h('div', { style: { flex: 1, overflowY: 'auto', padding: '8px' } },
      libGroups.length === 0 
        ? h('div', { style: { textAlign: 'center', padding: '20px', color: 'var(--dsw-alias-label-secondary)', fontSize: 12 } }, t('loading'))
        : libGroups.map(fish => h('div', { key: fish.id, style: { marginBottom: 12 } },
            // Fish header (collapsible)
            h('div', { 
              onClick: () => {
                const s = new Set(expandFish);
                s.has(fish.id) ? s.delete(fish.id) : s.add(fish.id);
                setExpandFish(s);
              },
              style: { display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', backgroundColor: 'var(--dsw-alias-bg-layer-2)', borderRadius: 6, cursor: 'pointer', marginBottom: 4, fontSize: 12, fontWeight: 500 }
            },
              h('span', null, expandFish.has(fish.id) ? '▼' : '▶'),
              h('span', null, '🐟'),
              h('span', { style: { flex: 1 } }, fish.name, fish.self ? ' (' + t('you') + ')' : null),
              h('span', { style: { fontSize: 9, backgroundColor: fish.online ? 'var(--dsw-alias-state-success-primary)' : 'var(--dsw-alias-state-idle-primary)', color: '#fff', padding: '2px 6px', borderRadius: 3 } }, fish.online ? t('online') : t('offline'))
            ),
            // Collections (nested)
            expandFish.has(fish.id) && fish.collections?.map(col => h('div', { key: col.id, style: { marginLeft: 12, marginBottom: 6 } },
              h('div', { 
                onClick: () => {
                  const key = fish.id + '/' + col.id;
                  const s = new Set(expandCols);
                  s.has(key) ? s.delete(key) : s.add(key);
                  setExpandCols(s);
                },
                style: { display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', backgroundColor: 'var(--dsw-alias-bg-layer-1)', borderRadius: 4, cursor: 'pointer', fontSize: 11, marginBottom: 2 }
              },
                h('span', null, expandCols.has(fish.id + '/' + col.id) ? '▼' : '▶'),
                h('span', null, col.kind === 'folder' ? '📁' : col.kind === 'project' ? '🗂️' : '📄'),
                h('span', { style: { flex: 1 } }, col.name, h('span', { style: { color: 'var(--dsw-alias-label-secondary)', fontSize: 10 } }, ' · ' + (col.itemCount || 0)))
              ),
              col.visibility !== 'public' && h('span', { style: { fontSize: 9, color: 'var(--dsw-alias-state-warn-primary)' } }, '🔒 ' + t('private'))
            ))
          ))
    )
  );
}
```

### Panel 2: My Shares (我的共享)

**Features**:
- List of my collections (folders, projects, manual)
- Item count, last sync time
- Quick actions (sync, visibility, delete)
- Summary stats

**Key Lines**:
```javascript
function MySharesPanel() {
  return h('div', { style: { flex: '0 0 25%', display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--dsw-alias-border-l1)' } },
    h('div', { style: { padding: '12px 16px', borderBottom: '1px solid var(--dsw-alias-border-l1)', backgroundColor: 'var(--dsw-alias-bg-layer-1)' } },
      h('h3', { style: { fontSize: 13, fontWeight: 600, margin: 0 } }, t('mySharesTitle')),
      h('div', { style: { fontSize: 10, color: 'var(--dsw-alias-label-secondary)', marginTop: 4 } }, myCollections.length + ' ' + t('items'))
    ),
    h('div', { style: { flex: 1, overflowY: 'auto', padding: '12px' } },
      myCollections.map(col => h('div', { key: col.id, style: { padding: '10px 12px', backgroundColor: 'var(--dsw-alias-bg-layer-2)', borderRadius: 6, marginBottom: 8, fontSize: 11 } },
        h('div', { style: { fontWeight: 600, marginBottom: 4 } }, (col.kind === 'folder' ? '📁' : col.kind === 'project' ? '🗂️' : '📄') + ' ' + col.name),
        h('div', { style: { fontSize: 10, color: 'var(--dsw-alias-label-secondary)', marginBottom: 6 } }, (col.stats?.items || 0) + ' items'),
        h('div', { style: { display: 'flex', gap: 4 } },
          h('button', { onClick: () => alert('Resync: ' + col.id), style: { flex: 1, padding: '3px 6px', fontSize: 10, borderRadius: 3, border: 'none', background: 'var(--dsw-alias-bg-layer-1)', cursor: 'pointer' } }, '↻'),
          h('button', { onClick: () => updateShare(col.id, { visibility: col.visibility === 'public' ? 'private' : 'public' }), style: { flex: 1, padding: '3px 6px', fontSize: 10, borderRadius: 3, border: 'none', background: 'var(--dsw-alias-bg-layer-1)', cursor: 'pointer' } }, col.visibility === 'public' ? '🔓' : '🔒'),
          h('button', { onClick: () => deleteShare(col.id), style: { flex: 1, padding: '3px 6px', fontSize: 10, borderRadius: 3, border: '1px solid var(--dsw-alias-state-error-primary)', color: 'var(--dsw-alias-state-error-primary)', background: 'transparent', cursor: 'pointer' } }, '🗑')
        )
      ))
    )
  );
}
```

### Panel 3: Share Settings (共享设置)

**Features**:
- Create new share (folder or project)
- Edit collection name/visibility/path
- Folder browser modal
- Delete collection

```javascript
function ShareSettingsPanel() {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ kind: 'folder', name: '', path: '', visibility: 'private' });
  
  return h('div', { style: { flex: '0 0 25%', display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--dsw-alias-border-l1)' } },
    h('div', { style: { padding: '12px 16px', borderBottom: '1px solid var(--dsw-alias-border-l1)', backgroundColor: 'var(--dsw-alias-bg-layer-1)' } },
      h('h3', { style: { fontSize: 13, fontWeight: 600, margin: 0 } }, t('settingsTitle')),
      h('button', { 
        onClick: () => setShowForm(!showForm),
        style: { marginTop: 8, width: '100%', padding: '6px 10px', fontSize: 11, borderRadius: 4, border: 'none', backgroundColor: 'var(--dsw-alias-brand-primary)', color: '#fff', cursor: 'pointer', fontWeight: 500 }
      }, showForm ? t('cancel') : '➕ ' + t('newShare'))
    ),
    h('div', { style: { flex: 1, overflowY: 'auto', padding: '12px' } },
      showForm && h('div', { style: { backgroundColor: 'var(--dsw-alias-bg-layer-2)', padding: 12, borderRadius: 6, marginBottom: 12 } },
        // Form fields here...
        h('input', { type: 'text', placeholder: t('shareName'), value: form.name, onChange: (e) => setForm({...form, name: e.target.value}), style: { width: '100%', padding: '6px 10px', fontSize: 11, marginBottom: 8, borderRadius: 4, border: '1px solid var(--dsw-alias-border-l2)', boxSizing: 'border-box' } }),
        h('input', { type: 'text', placeholder: t('sharePath'), value: form.path, onChange: (e) => setForm({...form, path: e.target.value}), style: { width: '100%', padding: '6px 10px', fontSize: 11, marginBottom: 8, borderRadius: 4, border: '1px solid var(--dsw-alias-border-l2)', boxSizing: 'border-box' } }),
        h('button', { 
          onClick: () => { createShare(form); setShowForm(false); setForm({ kind: 'folder', name: '', path: '', visibility: 'private' }); },
          style: { width: '100%', padding: '6px 10px', fontSize: 11, borderRadius: 4, border: 'none', backgroundColor: 'var(--dsw-alias-brand-primary)', color: '#fff', cursor: 'pointer' }
        }, t('create'))
      ),
      // List my collections...
      myCollections.map(col => h('div', { key: col.id, style: { padding: '10px 12px', backgroundColor: 'var(--dsw-alias-bg-layer-2)', borderRadius: 6, marginBottom: 8, fontSize: 10 } },
        h('div', { style: { fontWeight: 600, marginBottom: 4 } }, col.name),
        h('div', { style: { fontSize: 9, color: 'var(--dsw-alias-label-secondary)', marginBottom: 6 } }, col.source?.root || '(no path)'),
        h('button', { onClick: () => deleteShare(col.id), style: { width: '100%', padding: '3px 6px', fontSize: 9, borderRadius: 3, border: '1px solid var(--dsw-alias-state-error-primary)', color: 'var(--dsw-alias-state-error-primary)', background: 'transparent', cursor: 'pointer' } }, t('delete'))
      ))
    )
  );
}
```

### Panel 4: Members (鱼群成员)

**Features**:
- List of peer fish with online status
- Add peer by IP
- Scan LAN
- Remove peer
- Item count per peer

```javascript
function MembersPanel() {
  return h('div', { style: { flex: '0 0 17%', display: 'flex', flexDirection: 'column' } },
    h('div', { style: { padding: '12px 16px', borderBottom: '1px solid var(--dsw-alias-border-l1)', backgroundColor: 'var(--dsw-alias-bg-layer-1)' } },
      h('h3', { style: { fontSize: 13, fontWeight: 600, margin: 0 } }, t('peers') + ' (' + status?.peers?.length + ')')
    ),
    h('div', { style: { flex: 1, overflowY: 'auto', padding: '12px' } },
      h('div', { style: { display: 'flex', gap: 6, marginBottom: 12 } },
        h('button', { onClick: () => setPeerAdding(!peerAdding), style: { flex: 1, padding: '6px 10px', fontSize: 10, borderRadius: 4, border: '1px solid var(--dsw-alias-border-l2)', background: 'transparent', cursor: 'pointer' } }, '➕'),
        h('button', { onClick: scanLan, disabled: peerBusy, style: { flex: 1, padding: '6px 10px', fontSize: 10, borderRadius: 4, border: '1px solid var(--dsw-alias-border-l2)', background: 'transparent', cursor: 'pointer' } }, '🔍')
      ),
      peerAdding && h('div', { style: { display: 'flex', gap: 4, marginBottom: 10 } },
        h('input', { type: 'text', placeholder: 'IP:port', value: peerAddr, onChange: (e) => setPeerAddr(e.target.value), style: { flex: 1, padding: '4px 8px', fontSize: 10, borderRadius: 4, border: '1px solid var(--dsw-alias-border-l2)', boxSizing: 'border-box' } }),
        h('button', { onClick: async () => { if(peerAddr) await addPeer(); setPeerAdding(false); }, style: { padding: '4px 8px', fontSize: 10, borderRadius: 4, border: 'none', background: 'var(--dsw-alias-brand-primary)', color: '#fff', cursor: 'pointer' } }, t('save'))
      ),
      status?.peers?.map(peer => h('div', { key: peer.id, style: { padding: '8px 10px', backgroundColor: 'var(--dsw-alias-bg-layer-2)', borderRadius: 6, marginBottom: 6, fontSize: 10 } },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 } },
          h('div', { style: { width: 16, height: 16, borderRadius: '50%', backgroundColor: peer.online ? 'var(--dsw-alias-state-success-primary)' : 'var(--dsw-alias-state-idle-primary)' } }),
          h('span', { style: { fontWeight: 600, flex: 1 } }, peer.name),
          h('button', { onClick: () => removePeer(peer.address), style: { padding: '2px 4px', fontSize: 9, border: 'none', background: 'transparent', color: 'var(--dsw-alias-state-error-primary)', cursor: 'pointer' } }, '✕')
        ),
        h('div', { style: { fontSize: 9, color: 'var(--dsw-alias-label-secondary)' } }, peer.address + ':' + peer.port)
      ))
    )
  );
}
```

---

## Integration Steps

1. **Backup current client.js**
   ```bash
   cp client.js client.js.bak-2.3.0
   ```

2. **Add new helper functions before Panel (around line 1033)**
   - PanelBox component
   - TreeNode renderer
   - Four new panel functions above

3. **Replace Panel function return statement (line 1316-1457)**
   - Keep all existing state and callbacks
   - Change return to render four panels in flex container
   - Each panel is ~50-100 lines

4. **Build and hot-reload**
   ```bash
   pwsh build-and-pack.ps1
   pwsh update-local.ps1 -Hot
   ```

5. **Test**
   - Verify library loads and expands
   - Test my shares panel
   - Create/edit/delete collections via settings
   - Manage peers

---

## Styling Notes

All panels use existing DSH CSS variables:
- `var(--dsw-alias-bg-base)` — main background
- `var(--dsw-alias-bg-layer-1)` — headers, cards
- `var(--dsw-alias-bg-layer-2)` — input fields, rows
- `var(--dsw-alias-border-l1)`, `--dsw-alias-border-l2)` — borders
- `var(--dsw-alias-label-primary)`, `--secondary` — text
- `var(--dsw-alias-brand-primary)` — buttons
- `var(--dsw-alias-state-success-primary)`, `--idle-primary)`, `--error-primary)` — status

No external CSS framework needed. Keep inline styles for flex/layout, use DSH tokens for colors.

---

## Known Limitations (Phase 2)

- ❌ Folder browser modal not yet integrated (can paste path manually)
- ❌ Project workspace picker not yet integrated
- ❌ Resync button not yet wired to `/collections/resync`
- ❌ Folder upload component kept for backward compat but UI hidden

These can be added as follow-up PRs once core layout is stable.

---

## Testing Checklist

- [ ] All four panels render without errors
- [ ] Library tab shows remote + local collections
- [ ] Search filters collections in library
- [ ] Expand/collapse fish and collections
- [ ] My Shares shows local collections only
- [ ] Can create collection via Share Settings form
- [ ] Can edit collection name/visibility
- [ ] Can delete collection with confirmation
- [ ] Members panel lists peers with online status
- [ ] Can add peer by IP and scan LAN
- [ ] Preview still works via previewItem state
- [ ] Reference insertion still works
- [ ] Responsive layout on narrow screens

---

**Next**: Follow integration steps above. Questions? Check client.js existing patterns around useCallback, api() calls, and state management.
