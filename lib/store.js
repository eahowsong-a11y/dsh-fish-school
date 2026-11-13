// Fish School store v2.
//
// Layout under <storageDir>:
//   identity.json              this fish
//   collections/<id>.json      sharing units: manual | upload | folder | project
//   items/<id>.json            metadata of every shared entry (never the body)
//   knowledge/<id>.json        knowledge bodies (legacy format, still written)
//   conversations/<id>.json    conversation bodies with messages
//   blobs/<sha256>             bodies of files uploaded as a folder
//   removed.json               tombstones, so peers can drop deleted entries
//
// Everything lives in memory after startup; reads never touch the disk except
// for bodies. Every mutation bumps a global `rev`; peers sync with
// /manifest?since=<rev>, receiving changed items plus tombstones.
//
// Visibility: an item reaches the LAN only when the item is public AND its
// collection is manual or public. Folder / project / upload collections start
// private and flip with one switch.
import { randomUUID, createHash } from 'node:crypto';
import { hostname } from 'node:os';
import { join, basename } from 'node:path';
import {
  existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync, unlinkSync, renameSync,
} from 'node:fs';

const NAME_MAX = 40;
const EXCERPT_MAX = 400;
const TOMBSTONE_MAX = 5000;
export const KINDS = ['manual', 'upload', 'folder', 'project'];

export function normalizeName(value) {
  if (typeof value !== 'string') return undefined;
  const name = value.trim().replace(/\s+/g, ' ');
  return name.length >= 1 && name.length <= NAME_MAX ? name : undefined;
}

// Legacy `<ms>-<8hex>`, folder/upload files `f_<hex>`, project conversations `c_<hex>`.
export function validItemId(id) {
  return typeof id === 'string' && /^([0-9]+-[0-9a-f]{8}|[fc]_[0-9a-f]{12,40})$/.test(id);
}

export function validCollectionId(id) {
  return typeof id === 'string' && /^col_[0-9a-f]{8,32}$/.test(id);
}

export function splitTags(tags) {
  if (Array.isArray(tags)) return tags.map(String).map(t => t.trim()).filter(Boolean);
  if (typeof tags !== 'string') return [];
  return tags.split(',').map(t => t.trim()).filter(Boolean);
}

const sha256 = (data) => createHash('sha256').update(data).digest('hex');

export const fileItemId = (collectionId, relPath) => 'f_' + sha256(`${collectionId}\n${relPath}`).slice(0, 16);
export const sessionItemId = (sessionId) => 'c_' + sha256(String(sessionId)).slice(0, 16);
const newLegacyId = () => `${Date.now()}-${randomUUID().slice(0, 8)}`;
const newCollectionId = () => 'col_' + randomUUID().replace(/-/g, '').slice(0, 12);

export function excerptOf(text, max = EXCERPT_MAX) {
  const s = String(text ?? '').replace(/\r\n/g, '\n').trim();
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const nl = cut.lastIndexOf('\n');
  return (nl > max / 2 ? cut.slice(0, nl) : cut) + '…';
}

// Write via a temp file so a crash never leaves half a JSON behind.
function writeJson(file, data) {
  const tmp = `${file}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  renameSync(tmp, file);
}

function readJson(file) {
  try { return JSON.parse(readFileSync(file, 'utf8')); } catch { return undefined; }
}

function haystack(item) {
  return [item.summary, item.title, item.name, item.path, item.excerpt, item.author, ...(item.tags ?? [])]
    .filter(Boolean).join('\n').toLowerCase();
}

// Every whitespace-separated term must appear somewhere (AND search).
export function matches(item, { query, tags, type } = {}) {
  if (type && item.type !== type) return false;
  const wanted = splitTags(tags);
  if (wanted.length && !wanted.every(t => (item.tags ?? []).includes(t))) return false;
  const terms = String(query ?? '').toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return true;
  const hay = haystack(item);
  return terms.every(t => hay.includes(t));
}

const byNewest = (a, b) => String(b.updatedAt ?? b.createdAt ?? '').localeCompare(String(a.updatedAt ?? a.createdAt ?? ''));

export function createStore(rootDir) {
  const dirs = {
    knowledge: join(rootDir, 'knowledge'),
    conversations: join(rootDir, 'conversations'),
    collections: join(rootDir, 'collections'),
    items: join(rootDir, 'items'),
    blobs: join(rootDir, 'blobs'),
  };
  for (const d of Object.values(dirs)) mkdirSync(d, { recursive: true });

  const identityFile = join(rootDir, 'identity.json');
  const removedFile = join(rootDir, 'removed.json');

  // ---- Identity ----
  function readIdentity() {
    const d = readJson(identityFile);
    if (d?.id && normalizeName(d.name)) return d;
    const id = { id: randomUUID(), name: normalizeName(hostname()) ?? 'fish' };
    writeJson(identityFile, id);
    return id;
  }
  let identity = readIdentity();

  function rename(value) {
    const name = normalizeName(value);
    if (!name) throw new Error(`Name must be 1-${NAME_MAX} characters`);
    identity = { ...identity, name };
    writeJson(identityFile, identity);
    return identity;
  }

  // ---- Rev counter ----
  let _rev = 0;
  const bump = () => ++_rev;

  // ---- In-memory indexes ----
  /** @type {Map<string, object>} */
  const colMap = new Map();
  /** @type {Map<string, object>} */
  const itemMap = new Map();
  /** @type {{id:string, rev:number}[]} tombstones for removed/privatised items */
  let tombstones = [];

  // ---- Persistence helpers ----
  const colFile = id => join(dirs.collections, `${id}.json`);
  const itemFile = id => join(dirs.items, `${id}.json`);

  function saveCol(c) { writeJson(colFile(c.id), c); colMap.set(c.id, c); }
  function saveItem(i) { writeJson(itemFile(i.id), i); itemMap.set(i.id, i); }

  function addTombstone(id) {
    tombstones.push({ id, rev: _rev });
    if (tombstones.length > TOMBSTONE_MAX) tombstones = tombstones.slice(-TOMBSTONE_MAX);
    writeJson(removedFile, tombstones);
  }

  // ---- Collections ----
  function getOrMakeManual() {
    for (const c of colMap.values()) if (c.kind === 'manual' && c.authorId === identity.id) return c;
    const c = {
      id: newCollectionId(), kind: 'manual', name: '手动共享',
      visibility: 'public', source: null, tags: [],
      authorId: identity.id, author: identity.name,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      stats: { items: 0, bytes: 0, updatedAt: new Date().toISOString() }, rev: bump(),
    };
    saveCol(c);
    return c;
  }

  function createCollection({ kind = 'manual', name, visibility, source, tags } = {}) {
    const resolvedVis = visibility ?? (kind === 'manual' ? 'public' : 'private');
    const c = {
      id: newCollectionId(), kind: KINDS.includes(kind) ? kind : 'manual',
      name: String(name ?? 'Untitled').slice(0, 100).trim() || 'Untitled',
      visibility: resolvedVis === 'public' ? 'public' : 'private',
      source: source ?? null, tags: splitTags(tags),
      authorId: identity.id, author: identity.name,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      stats: { items: 0, bytes: 0, updatedAt: new Date().toISOString() }, rev: bump(),
    };
    saveCol(c);
    return c;
  }

  function updateCollection(id, patch) {
    if (!validCollectionId(id)) throw new Error('Invalid collection id');
    const c = colMap.get(id); if (!c) throw new Error('Collection not found');
    const wasPublic = c.visibility === 'public';
    if (patch.name !== undefined) c.name = String(patch.name).slice(0, 100).trim() || c.name;
    if (patch.visibility !== undefined) c.visibility = patch.visibility === 'public' ? 'public' : 'private';
    if (patch.tags !== undefined) c.tags = splitTags(patch.tags);
    if (patch.source !== undefined) c.source = patch.source;
    c.updatedAt = new Date().toISOString(); c.rev = bump();
    saveCol(c);
    // Propagate visibility change to items
    const nowPublic = c.visibility === 'public';
    if (wasPublic !== nowPublic && c.kind !== 'manual') {
      for (const item of itemMap.values()) {
        if (item.collectionId !== id) continue;
        if (!nowPublic) { addTombstone(item.id); } // privatised → remove from peers
        else { item.rev = bump(); saveItem(item); } // publicised → let peers sync
      }
    }
    return c;
  }

  function deleteCollection(id) {
    if (!validCollectionId(id)) throw new Error('Invalid collection id');
    const c = colMap.get(id); if (!c) throw new Error('Collection not found');
    for (const item of [...itemMap.values()]) {
      if (item.collectionId === id) { bump(); addTombstone(item.id); removeItemFiles(item); itemMap.delete(item.id); }
    }
    if (existsSync(colFile(id))) unlinkSync(colFile(id));
    colMap.delete(id);
  }

  const getCollection = id => colMap.get(id) ?? null;

  function listCollections({ includePrivate = false } = {}) {
    return [...colMap.values()]
      .filter(c => includePrivate || c.visibility === 'public' || c.kind === 'manual')
      .sort(byNewest);
  }

  // A collection's own visibility gates its items, except for the manual one.
  function effectivePublic(item) {
    if (item.isPublic === false) return false;
    const c = colMap.get(item.collectionId);
    if (!c) return true;
    return c.kind === 'manual' || c.visibility === 'public';
  }

  function recomputeStats(colId) {
    const c = colMap.get(colId);
    if (!c) return;
    let items = 0, bytes = 0;
    for (const i of itemMap.values()) if (i.collectionId === colId) { items++; bytes += i.size ?? 0; }
    c.stats = { items, bytes, updatedAt: new Date().toISOString() };
    c.updatedAt = c.stats.updatedAt;
    c.rev = bump();
    saveCol(c);
  }

  function removeItemFiles(item) {
    for (const f of [itemFile(item.id), join(dirs.knowledge, `${item.id}.json`), join(dirs.conversations, `${item.id}.json`)]) {
      if (existsSync(f)) try { unlinkSync(f); } catch { /* already gone */ }
    }
  }

  // Drop an item locally and leave a tombstone so peers drop it too.
  function dropItem(id, { stats = true } = {}) {
    const item = itemMap.get(id);
    if (!item) return false;
    removeItemFiles(item);
    itemMap.delete(id);
    bump();
    addTombstone(id);
    if (stats) recomputeStats(item.collectionId);
    return true;
  }

  function stamp(item) {
    const now = new Date().toISOString();
    return { ...item, author: identity.name, authorId: identity.id, updatedAt: now, rev: bump() };
  }

  // ---- Knowledge (manual publish, single upload, folder upload) ----
  function saveKnowledge({ summary, content, tags, sourceFile, collectionId, path, isPublic = true }) {
    const col = (collectionId && colMap.get(collectionId)) || getOrMakeManual();
    const text = String(content ?? '');
    const now = new Date().toISOString();
    // Folder uploads key on path, so re-uploading the same file updates it in place.
    const id = path ? fileItemId(col.id, path) : newLegacyId();
    const prev = itemMap.get(id);
    const file = sourceFile?.name
      ? { name: String(sourceFile.name).slice(0, 200), size: Number(sourceFile.size) || 0, mime: String(sourceFile.mime || '') }
      : undefined;
    const body = {
      id, type: 'knowledge', summary: String(summary ?? '').trim() || file?.name || path || 'Untitled',
      content: text, tags: splitTags(tags), author: identity.name, authorId: identity.id,
      createdAt: prev?.createdAt ?? now, ...(file ? { sourceFile: file } : {}),
    };
    writeJson(join(dirs.knowledge, `${id}.json`), body);
    const item = stamp({
      id, type: 'knowledge', collectionId: col.id, summary: body.summary,
      ...(path ? { path: String(path), name: basename(String(path)) } : {}),
      excerpt: excerptOf(text), tags: body.tags, size: Buffer.byteLength(text, 'utf8'),
      isPublic: Boolean(isPublic), createdAt: body.createdAt, ...(file ? { sourceFile: file } : {}),
    });
    saveItem(item);
    recomputeStats(col.id);
    return { ...body, ...item };
  }

  // ---- Conversations (manual share) ----
  function saveConversation({ title, sessionId, messages, tags, isPublic = true, collectionId }) {
    const col = (collectionId && colMap.get(collectionId)) || getOrMakeManual();
    const msgs = Array.isArray(messages) ? messages : [];
    const id = newLegacyId();
    const now = new Date().toISOString();
    const body = {
      id, type: 'conversation', title: String(title ?? '').trim() || 'Untitled',
      sessionId: String(sessionId ?? ''), messages: msgs, tags: splitTags(tags),
      author: identity.name, authorId: identity.id, isPublic: Boolean(isPublic), createdAt: now,
    };
    writeJson(join(dirs.conversations, `${id}.json`), body);
    const item = stamp({
      id, type: 'conversation', collectionId: col.id, title: body.title, sessionId: body.sessionId,
      excerpt: excerptOf(msgs.map(m => m.text ?? '').join('\n')), tags: body.tags,
      messageCount: msgs.length, isPublic: body.isPublic, createdAt: now,
    });
    saveItem(item);
    recomputeStats(col.id);
    return body;
  }

  // ---- File items (from folder/upload indexer) ----
  function upsertFileItem({ collectionId, path: relPath, name, size, mtime, hash, excerpt, isBinary }) {
    if (!validCollectionId(collectionId)) throw new Error('Invalid collection id');
    const col = colMap.get(collectionId); if (!col) throw new Error('Collection not found');
    const id = fileItemId(collectionId, relPath);
    const prev = itemMap.get(id);
    const now = new Date().toISOString();
    const item = {
      id, type: 'file', collectionId, path: relPath, name: name ?? basename(relPath),
      size: size ?? 0, mtime: mtime ?? now, hash: hash ?? '', excerpt: excerpt ?? '',
      isBinary: Boolean(isBinary), tags: [], isPublic: col.visibility === 'public',
      author: col.author ?? identity.name, authorId: col.authorId ?? identity.id,
      createdAt: prev?.createdAt ?? now, updatedAt: now, rev: bump(),
    };
    saveItem(item);
    return item;
  }

  function batchUpsertFileItems(collectionId, items) {
    for (const it of items) upsertFileItem({ ...it, collectionId });
    recomputeStats(collectionId);
  }

  function removeFileItem(collectionId, relPath) {
    const id = fileItemId(collectionId, relPath);
    dropItem(id, { stats: false });
  }

  function batchRemoveFileItems(collectionId, paths) {
    for (const p of paths) removeFileItem(collectionId, p);
    recomputeStats(collectionId);
  }

  // ---- Session/project items ----
  function upsertSessionItem({ collectionId, sessionId, title, messages, cwd, createdAt: at, isPublic }) {
    if (!validCollectionId(collectionId)) throw new Error('Invalid collection id');
    const col = colMap.get(collectionId); if (!col) throw new Error('Collection not found');
    const id = sessionItemId(sessionId);
    const prev = itemMap.get(id);
    const now = new Date().toISOString();
    const msgs = Array.isArray(messages) ? messages : [];
    const excerpt = excerptOf(msgs.slice(0, 3).map(m => m.text ?? '').join('\n'));
    const isPublicResolved = isPublic !== undefined ? Boolean(isPublic) : (col.visibility === 'public');
    const body = {
      id, type: 'conversation', collectionId, title: String(title ?? '').trim() || 'Untitled',
      sessionId: String(sessionId), cwd: String(cwd ?? ''), messages: msgs,
      tags: [], isPublic: isPublicResolved, author: identity.name, authorId: identity.id,
      createdAt: at ?? prev?.createdAt ?? now,
    };
    writeJson(join(dirs.conversations, `${id}.json`), body);
    const item = stamp({
      id, type: 'conversation', collectionId, title: body.title, sessionId: body.sessionId,
      cwd: body.cwd, excerpt, tags: [], messageCount: msgs.length, isPublic: isPublicResolved,
      createdAt: body.createdAt,
    });
    saveItem(item);
    return item;
  }

  // ---- Query ----
  function search({ query = '', tags = '', type, collection, limit = 50, includePrivate = false } = {}) {
    let results = [...itemMap.values()].filter(i => includePrivate || effectivePublic(i));
    if (collection) results = results.filter(i => i.collectionId === collection);
    results = results.filter(i => matches(i, { query, tags, type }));
    return results.sort(byNewest).slice(0, Math.min(limit, 500))
      .map(i => ({ ...i, author: i.authorId === identity.id ? identity.name : (i.author ?? identity.name) }));
  }

  function getManifest({ since = 0, limit = 500 } = {}) {
    const changed = [...itemMap.values()]
      .filter(i => effectivePublic(i) && i.rev > since)
      .sort((a, b) => a.rev - b.rev).slice(0, limit)
      .map(i => ({ ...i, author: i.authorId === identity.id ? identity.name : i.author }));
    const cols = [...colMap.values()]
      .filter(c => (c.visibility === 'public' || c.kind === 'manual') && c.rev > since);
    const removed = tombstones.filter(t => t.rev > since);
    return { rev: _rev, collections: cols, items: changed, removed, hasMore: changed.length === limit };
  }

  // ---- Content retrieval ----
  function getItemContent(id) {
    const item = itemMap.get(id);
    if (!item) {
      // Legacy fallback for old peers that never went through migration
      const kj = readJson(join(dirs.knowledge, `${id}.json`));
      if (kj) return kj.content ?? null;
      return null;
    }
    if (item.type === 'knowledge') {
      const kj = readJson(join(dirs.knowledge, `${id}.json`));
      return kj?.content ?? null;
    }
    if (item.type === 'conversation' || item.type === 'file') return null; // served separately
    return null;
  }

  function getConversation(id) {
    if (!validItemId(id)) return null;
    for (const p of [join(dirs.conversations, `${id}.json`), join(dirs.items, `${id}.json`)]) {
      const d = readJson(p);
      if (d?.messages) return d;
    }
    return null;
  }

  // ---- Mutations ----
  function remove(id) {
    if (!validItemId(id)) throw new Error('Invalid id');
    if (!dropItem(id)) {
      // Legacy-only entries (not in itemMap yet)
      const kp = join(dirs.knowledge, `${id}.json`);
      const cp = join(dirs.conversations, `${id}.json`);
      if (existsSync(kp)) { unlinkSync(kp); bump(); addTombstone(id); return; }
      if (existsSync(cp)) { unlinkSync(cp); bump(); addTombstone(id); return; }
      throw new Error(`Entry ${id} not found`);
    }
  }

  function setVisibility(id, isPublic) {
    if (!validItemId(id)) throw new Error('Invalid id');
    const item = itemMap.get(id);
    if (!item) {
      // Legacy conversation fallback
      const cp = join(dirs.conversations, `${id}.json`);
      if (!existsSync(cp)) throw new Error(`Entry ${id} not found`);
      const d = JSON.parse(readFileSync(cp, 'utf8'));
      d.isPublic = Boolean(isPublic);
      writeJson(cp, d);
      return;
    }
    const wasPublic = effectivePublic(item);
    item.isPublic = Boolean(isPublic);
    item.updatedAt = new Date().toISOString();
    item.rev = bump();
    saveItem(item);
    // Update conversation body if present
    const cp = join(dirs.conversations, `${id}.json`);
    if (existsSync(cp)) {
      try { const d = JSON.parse(readFileSync(cp, 'utf8')); d.isPublic = item.isPublic; writeJson(cp, d); } catch {}
    }
    if (wasPublic && !effectivePublic(item)) addTombstone(id); // went private → tombstone
  }

  // ---- All (backward-compat LAN route) ----
  function all() {
    return [...itemMap.values()].filter(i => effectivePublic(i)).map(i => ({
      ...i,
      author: i.authorId === identity.id ? identity.name : (i.author ?? ''),
      summary: i.summary ?? i.title ?? i.name ?? '',
    }));
  }

  // ---- Bootstrap ----
  function loadAll() {
    // Load collections
    try {
      for (const f of readdirSync(dirs.collections)) {
        if (!f.endsWith('.json')) continue;
        const c = readJson(join(dirs.collections, f));
        if (c && validCollectionId(c.id)) { colMap.set(c.id, c); _rev = Math.max(_rev, c.rev ?? 0); }
      }
    } catch {}
    // Load items
    try {
      for (const f of readdirSync(dirs.items)) {
        if (!f.endsWith('.json')) continue;
        const i = readJson(join(dirs.items, f));
        if (i && validItemId(i.id)) { itemMap.set(i.id, i); _rev = Math.max(_rev, i.rev ?? 0); }
      }
    } catch {}
    // Load tombstones
    try { tombstones = readJson(removedFile) ?? []; } catch {}
    // Migrate legacy knowledge not yet in itemMap
    const manual = getOrMakeManual();
    try {
      for (const f of readdirSync(dirs.knowledge)) {
        if (!f.endsWith('.json')) continue;
        const id = f.slice(0, -5);
        if (!id || itemMap.has(id)) continue; // Accept any legacy id
        const e = readJson(join(dirs.knowledge, f)); if (!e) continue;
        const text = e.content ?? '';
        const item = stamp({
          id, type: 'knowledge', collectionId: manual.id, summary: e.summary ?? '',
          excerpt: excerptOf(text), tags: e.tags ?? [], size: Buffer.byteLength(text, 'utf8'),
          isPublic: true, createdAt: e.createdAt ?? new Date().toISOString(),
          ...(e.sourceFile ? { sourceFile: e.sourceFile } : {}),
          author: e.author ?? identity.name, authorId: e.authorId ?? identity.id,
        });
        saveItem(item);
      }
    } catch {}
    // Migrate legacy conversations not yet in itemMap
    try {
      for (const f of readdirSync(dirs.conversations)) {
        if (!f.endsWith('.json')) continue;
        const id = f.slice(0, -5);
        if (!id || itemMap.has(id)) continue; // Accept any legacy id
        const e = readJson(join(dirs.conversations, f)); if (!e) continue;
        const msgs = Array.isArray(e.messages) ? e.messages : [];
        const item = stamp({
          id, type: 'conversation', collectionId: manual.id, title: e.title ?? '',
          excerpt: excerptOf(msgs.map(m => m.text ?? '').join('\n')), tags: e.tags ?? [],
          messageCount: msgs.length, isPublic: Boolean(e.isPublic !== false), sessionId: e.sessionId ?? '',
          createdAt: e.createdAt ?? new Date().toISOString(),
          author: e.author ?? identity.name, authorId: e.authorId ?? identity.id,
        });
        saveItem(item);
      }
    } catch {}
    // Recompute stats once after migration
    recomputeStats(manual.id);
  }

  loadAll();

  return {
    identity: () => identity, rename,
    createCollection, updateCollection, deleteCollection, getCollection, listCollections,
    recomputeStats,
    saveKnowledge, saveConversation, upsertFileItem, batchUpsertFileItems,
    removeFileItem, batchRemoveFileItems, upsertSessionItem,
    all, search, getManifest, getItemContent, getConversation, remove, setVisibility,
    getItem: id => itemMap.get(id) ?? null,
    effectivePublic,
    splitTags, fileItemId, sessionItemId, excerptOf, validItemId, validCollectionId,
    getGlobalRev: () => _rev,
    colMap, itemMap,  // read-only exposure for host routes
  };
}
