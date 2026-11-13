/**
 * Fish School Plugin v2.0 — Main Host Entry Point
 */
import { join } from 'node:path';
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { createStore } from './lib/store.js';
import { startNetwork } from './lib/network.js';
import { createFolderIndexer } from './lib/folder-indexer.js';
import { createProjectSync } from './lib/project-sync.js';
import { runUpdate } from './lib/updater.js';

export const name = '@local/fish-school';
export const inject = ['webServer', 'connection'];

const PKG = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
const CURRENT_VERSION = String(PKG.version ?? '0.0.0');
const UPDATE_TTL_MS = 10 * 60 * 1000;
const PANEL_REMOTE_TTL_MS = 8000;

function isNewer(candidate, current) {
  const a = String(candidate).split('.').map(n => parseInt(n, 10) || 0);
  const b = String(current).split('.').map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] ?? 0; const y = b[i] ?? 0;
    if (x !== y) return x > y;
  }
  return false;
}

function toolDef(name, description, params, execute) {
  return {
    name,
    description,
    parameters: { type: 'object', properties: params.properties, required: params.required ?? [] },
    output: {
      schema: { type: 'object' },
      render(args, value) {
        const lines = [];
        if (value?.message) lines.push(value.message);
        if (value?.success === false && value?.error) lines.push(`❌ ${value.error}`);
        const items = Array.isArray(value?.results) ? value.results
          : Array.isArray(value?.entries) ? value.entries
          : Array.isArray(value?.messages) ? value.messages : null;
        for (const it of items ?? []) {
          if (!it) continue;
          if (it.ok === false) { lines.push(`- ${it.ref ?? '?'}: ${it.error ?? 'failed'}`); continue; }
          if (it.role && typeof it.text === 'string') {
            lines.push(`\n[${it.role}] ${it.text.length > 2000 ? `${it.text.slice(0, 2000)}…` : it.text}`);
            continue;
          }
          const title = it.title ?? it.summary ?? '(untitled)';
          const head = [it.type ? `[${it.type}]` : '', title, it.author ? `— ${it.author}` : ''].filter(Boolean).join(' ');
          lines.push(`\n### ${head}`);
          if (it.tags?.length) lines.push(`tags: ${it.tags.join(', ')}`);
          if (it.author && it.type && it.id) lines.push(`reference: @${it.author}/${it.type}/${it.id}`);
          if (it.content) lines.push(String(it.content));
          else if (it.messageCount) lines.push(`(${it.messageCount} messages)`);
        }
        const text = lines.join('\n').trim();
        return [{ type: 'text', text: text || JSON.stringify(value) }];
      },
    },
    execute,
  };
}

function blocksToText(blocks) {
  if (!Array.isArray(blocks)) return String(blocks ?? '');
  return blocks.filter(b => b?.type === 'text').map(b => b.text ?? '').join('').trim();
}

export function apply(ctx, config = {}) {
  config.port = config.port ?? 37775;
  config.multicastAddress = config.multicastAddress ?? '239.255.37.77';
  config.storageDir = config.storageDir || join(process.env.DSH_PROFILE_DIR || '.', 'fish-school');
  config.autoScan = config.autoScan !== false;
  config.peerAddresses = Array.isArray(config.peerAddresses) ? config.peerAddresses : [];
  config.updateRepo = typeof config.updateRepo === 'string' && config.updateRepo.includes('/')
    ? config.updateRepo : 'eahowsong-a11y/dsh-fish-school';

  const logger = ctx.logger('fish-school');
  const store = createStore(config.storageDir);

  // ---- Sync managers (folder indexers + project syncs) ----
  /** @type {Map<string, {indexer:any, status:object}>} */
  const folderMgrs = new Map();
  /** @type {Map<string, {sync:any, status:object}>} */
  const projectMgrs = new Map();

  function startFolderMgr(col) {
    if (folderMgrs.has(col.id)) return;
    const root = col.source?.root;
    if (!root || !existsSync(root)) {
      folderMgrs.set(col.id, { indexer: null, status: { state: 'error', error: 'Root path not found', done: 0, total: 0, failed: 0, lastSyncAt: null } });
      return;
    }
    const status = { state: 'idle', done: 0, total: 0, failed: 0, lastSyncAt: null, error: null, overLimit: false };
    const indexer = createFolderIndexer({
      root, logger,
      onChange: changes => {
        // Apply changes to store
        const added = changes.added ?? []; const modified = changes.modified ?? []; const removed = changes.removed ?? [];
        for (const it of [...added, ...modified]) store.upsertFileItem({ ...it, collectionId: col.id });
        for (const it of removed) store.removeFileItem(col.id, it.path ?? it);
        if (added.length || modified.length || removed.length) store.recomputeStats(col.id);
        status.lastSyncAt = new Date().toISOString();
        status.done = indexer.getStats().count;
      },
    });
    // Initial sync: bulk-load all items
    indexer.start();
    setTimeout(() => {
      const items = indexer.getItems();
      store.batchUpsertFileItems(col.id, items);
      const st = indexer.getStats();
      status.state = 'idle'; status.done = st.count; status.total = st.count; status.overLimit = st.overLimit ?? false;
      status.lastSyncAt = new Date().toISOString();
    }, 2000);
    folderMgrs.set(col.id, { indexer, status });
  }

  function startProjectMgr(col) {
    if (projectMgrs.has(col.id)) return;
    const root = col.source?.root;
    if (!root) {
      projectMgrs.set(col.id, { sync: null, status: { state: 'error', error: 'Root path not configured', done: 0, total: 0, failed: 0, lastSyncAt: null } });
      return;
    }
    const status = { state: 'idle', done: 0, total: 0, failed: 0, lastSyncAt: null, error: null };
    const sync = createProjectSync({
      collectionId: col.id, root, store, logger,
      onChange: s => Object.assign(status, s),
    });
    sync.start();
    projectMgrs.set(col.id, { sync, status });
  }

  function stopMgr(colId) {
    const fm = folderMgrs.get(colId);
    if (fm?.indexer) { try { fm.indexer.stop(); } catch {} folderMgrs.delete(colId); }
    const pm = projectMgrs.get(colId);
    if (pm?.sync) { try { pm.sync.stop(); } catch {} projectMgrs.delete(colId); }
  }

  function getSyncStatus(colId) {
    return folderMgrs.get(colId)?.status ?? projectMgrs.get(colId)?.status ?? null;
  }

  // Boot existing folder/project collections
  for (const col of store.listCollections({ includePrivate: true })) {
    if (col.kind === 'folder') startFolderMgr(col);
    else if (col.kind === 'project') startProjectMgr(col);
  }

  // ---- contentOf: resolve item body for the LAN server ----
  async function contentOf(item) {
    if (item.type === 'knowledge') {
      const c = store.getItemContent(item.id);
      return c != null ? { content: c } : null;
    }
    if (item.type === 'conversation') {
      const conv = store.getConversation(item.id);
      return conv ? { messages: conv.messages } : null;
    }
    if (item.type === 'file') {
      const fm = folderMgrs.get(item.collectionId);
      if (!fm?.indexer) return null;
      const text = await fm.indexer.readContent(item.path).catch(() => null);
      return text != null ? { content: text } : null;
    }
    return null;
  }

  const network = startNetwork({ store, config, logger, contentOf });
  for (const address of config.peerAddresses) {
    network.remember(address, 'manual').catch(err => logger.warn('seed peer %s: %s', address, err.message));
  }

  function extractMessages(agentId) {
    try {
      const sessions = ctx.get('sessions');
      if (!sessions) return [];
      const session = sessions.get(agentId);
      if (!session) return [];
      const messages = session.deriveMessages();
      const result = [];
      for (const msg of messages) {
        const text = blocksToText(msg.content);
        if (text && (msg.role === 'user' || msg.role === 'assistant')) result.push({ role: msg.role, text });
      }
      return result;
    } catch (err) { logger.warn('extractMessages failed: %s', err.message); return []; }
  }

  if (!ctx.get('webServer') || !ctx.get('connection')) {
    logger.warn('webServer/connection unavailable — panel routes not registered');
  } else {
    const webServer = ctx.get('webServer');
    const connection = ctx.get('connection');

    const send = (res, status, body) => {
      res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify(body));
    };

    async function readBody(req, maxBytes = 65536) {
      let raw = '';
      for await (const chunk of req) { raw += chunk; if (raw.length > maxBytes) throw new Error('Body too large'); }
      return JSON.parse(raw || '{}');
    }

    const auth = req => connection.requestRejection({ headers: req.headers });

    // Settings (sidebar toggle)
    const settingsFile = join(config.storageDir, 'settings.json');
    const SETTINGS_KEYS = new Set(['sidebarEnabled']);
    function readSettings() {
      try { const d = JSON.parse(readFileSync(settingsFile, 'utf8')); return { sidebarEnabled: d?.sidebarEnabled !== false }; }
      catch { return { sidebarEnabled: true }; }
    }
    let settings = readSettings();
    function writeSettings(patch) {
      const unknown = Object.keys(patch).filter(k => !SETTINGS_KEYS.has(k));
      if (unknown.length) throw new Error(`Unknown settings key(s): ${unknown.join(', ')}`);
      settings = { ...settings, ...patch };
      writeFileSync(settingsFile, JSON.stringify(settings, null, 2), 'utf8');
      return settings;
    }

    // ---- Update state ----
    let updateState = { state: 'idle', progress: 0, message: '', to: null, error: null };
    let updateCache = { at: 0, data: null };

    async function latestRelease(force) {
      if (!force && updateCache.data && Date.now() - updateCache.at < UPDATE_TTL_MS) return updateCache.data;
      const res = await fetch(`https://api.github.com/repos/${config.updateRepo}/releases/latest`,
        { headers: { accept: 'application/vnd.github+json', 'user-agent': 'dsh-fish-school' }, signal: AbortSignal.timeout(8000) });
      if (!res.ok) throw new Error(`GitHub 返回 ${res.status}`);
      const body = await res.json();
      const asset = (body.assets ?? []).find(a => /\.tgz$/i.test(String(a.name ?? '')));
      const data = { latest: String(body.tag_name ?? '').replace(/^v/, ''), publishedAt: body.published_at ?? '',
        releaseUrl: body.html_url ?? '', assetUrl: asset?.browser_download_url ?? '', assetName: asset?.name ?? '' };
      updateCache = { at: Date.now(), data };
      return data;
    }

    // Panel remote cache
    let panelRemoteCache = { at: 0, sets: [] };
    async function remoteEntriesForPanel(params) {
      const cacheable = !params.query;
      if (cacheable && Date.now() - panelRemoteCache.at < PANEL_REMOTE_TTL_MS) return panelRemoteCache.sets;
      try {
        const sets = await network.searchPeers(params);
        if (cacheable) panelRemoteCache = { at: Date.now(), sets };
        return sets;
      } catch (err) { logger.warn('panel peer search failed: %s', err.message); return []; }
    }

    // GET /status
    ctx.effect(() => webServer.register({ kind: 'exact', path: '/fish-school/v1/status',
      async handler(req, res) {
        const rej = auth(req); if (rej) return send(res, rej, { error: 'unauthorized' });
        if (req.method !== 'GET') return send(res, 405, { error: 'method not allowed' });
        try {
          const upd = updateCache.data;
          return send(res, 200, {
            me: store.identity(), port: config.port, storageDir: config.storageDir,
            version: CURRENT_VERSION, updateRepo: config.updateRepo,
            knowledgeCount: store.all().length, peers: network.listPeers(), interfaces: network.interfaces(),
            sidebarEnabled: settings.sidebarEnabled,
            pendingVersion: updateState.state === 'done' ? updateState.to : null,
            ...(upd ? { latestVersion: upd.latest } : {}),
          });
        } catch (err) { return send(res, 500, { error: err.message }); }
      },
    }));

    // GET /settings  POST /settings
    ctx.effect(() => webServer.register({ kind: 'exact', path: '/fish-school/v1/settings',
      async handler(req, res) {
        const rej = auth(req); if (rej) return send(res, rej, { error: 'unauthorized' });
        if (req.method === 'GET') return send(res, 200, settings);
        if (req.method === 'POST') {
          try { const b = await readBody(req); return send(res, 200, writeSettings(b)); }
          catch (err) { return send(res, 400, { error: err.message }); }
        }
        return send(res, 405, { error: 'method not allowed' });
      },
    }));

    // GET /check-update
    ctx.effect(() => webServer.register({ kind: 'exact', path: '/fish-school/v1/check-update',
      async handler(req, res) {
        const rej = auth(req); if (rej) return send(res, rej, { error: 'unauthorized' });
        if (req.method !== 'GET') return send(res, 405, { error: 'method not allowed' });
        const url = new URL(req.url ?? '/', 'http://local');
        const base = { current: CURRENT_VERSION, repo: config.updateRepo };
        try {
          const latest = await latestRelease(url.searchParams.get('refresh') === '1');
          return send(res, 200, { ...base, ...latest, hasUpdate: Boolean(latest.latest) && isNewer(latest.latest, CURRENT_VERSION) });
        } catch (err) { logger.warn('update check failed: %s', err.message); return send(res, 200, { ...base, error: err.message }); }
      },
    }));

    // POST /update — trigger self-update
    ctx.effect(() => webServer.register({ kind: 'exact', path: '/fish-school/v1/update',
      async handler(req, res) {
        const rej = auth(req); if (rej) return send(res, rej, { error: 'unauthorized' });
        if (req.method !== 'POST') return send(res, 405, { error: 'method not allowed' });
        if (updateState.state === 'downloading' || updateState.state === 'installing') return send(res, 200, updateState);
        try {
          const info = await latestRelease(false);
          if (!info?.assetUrl) return send(res, 400, { error: 'No asset URL available. Try checking for updates first.' });
          if (!isNewer(info.latest, CURRENT_VERSION)) return send(res, 200, { alreadyLatest: true, version: CURRENT_VERSION });
          updateState = { state: 'downloading', progress: 0, message: 'Downloading…', to: info.latest, error: null };
          send(res, 200, { ok: true, to: info.latest, restartRequired: true });
          runUpdate({
            assetUrl: info.assetUrl, targetVersion: info.latest,
            onProgress: p => { updateState.message = p.step; if (p.total) updateState.progress = Math.round((p.received / p.total) * 100); },
          }).then(r => { updateState = { state: 'done', progress: 100, message: `Updated to v${r.to}`, to: r.to, error: null }; })
            .catch(err => { updateState = { state: 'error', progress: 0, message: err.message, to: info.latest, error: err.message }; logger.warn('update failed: %s', err.message); });
        } catch (err) { return send(res, 500, { error: err.message }); }
      },
    }));

    // GET /update/status
    ctx.effect(() => webServer.register({ kind: 'exact', path: '/fish-school/v1/update/status',
      handler(req, res) {
        const rej = auth(req); if (rej) return send(res, rej, { error: 'unauthorized' });
        return send(res, 200, updateState);
      },
    }));

    // GET /library — grouped fish view
    ctx.effect(() => webServer.register({ kind: 'exact', path: '/fish-school/v1/library',
      async handler(req, res) {
        const rej = auth(req); if (rej) return send(res, rej, { error: 'unauthorized' });
        if (req.method !== 'GET') return send(res, 405, { error: 'method not allowed' });
        try {
          const me = store.identity();
          // Local fish group
          const localCols = store.listCollections({ includePrivate: true }).map(col => {
            let count = 0; for (const it of store.colMap.get(col.id) ? [] : []) count++;
            count = col.stats?.items ?? 0;
            return { ...col, itemCount: count, sync: getSyncStatus(col.id) };
          });
          const localGroup = { id: me.id, name: me.name, self: true, online: true,
            version: CURRENT_VERSION, collections: localCols, itemCount: localCols.reduce((s, c) => s + (c.itemCount || 0), 0) };
          // Remote fish groups
          const peers = network.listPeers();
          const remoteGroups = await Promise.all(peers.map(async peer => {
            const cache = network.getManifestCache(peer.id ?? `${peer.address}:${peer.port}`);
            // Trigger refresh if cache is stale (>30s)
            if (!cache || Date.now() - (cache.fetchedAt ?? 0) > 30000) {
              network.fetchPeerManifest(peer).catch(() => {});
            }
            const cols = new Map();
            if (cache) {
              for (const col of (cache.collections ?? [])) cols.set(col.id, { ...col, itemCount: 0, source: undefined });
              for (const it of (cache.items?.values?.() ?? [])) {
                const c = cols.get(it.collectionId); if (c) c.itemCount = (c.itemCount || 0) + 1;
              }
            }
            return {
              id: peer.id ?? `${peer.address}:${peer.port}`, name: peer.name, self: false,
              online: peer.online, version: peer.version,
              collections: [...cols.values()],
              itemCount: cache ? (cache.items?.size ?? 0) : 0,
            };
          }));
          return send(res, 200, { fish: [localGroup, ...remoteGroups] });
        } catch (err) { return send(res, 500, { error: err.message }); }
      },
    }));

    // GET /items — paginated items for a fish/collection
    ctx.effect(() => webServer.register({ kind: 'exact', path: '/fish-school/v1/items',
      async handler(req, res) {
        const rej = auth(req); if (rej) return send(res, rej, { error: 'unauthorized' });
        if (req.method !== 'GET') return send(res, 405, { error: 'method not allowed' });
        try {
          const url = new URL(req.url ?? '/', 'http://local');
          const fishId = url.searchParams.get('fish');
          const colId = url.searchParams.get('collection');
          const q = url.searchParams.get('q') ?? '';
          const type = url.searchParams.get('type') ?? undefined;
          const limit = Math.min(Number(url.searchParams.get('limit')) || 50, 200);
          const cursor = url.searchParams.get('cursor');
          const myId = store.identity().id;

          // Local items
          if (!fishId || fishId === myId || fishId === store.identity().name) {
            const items = store.search({ query: q, type, collection: colId, limit: limit + 1, includePrivate: true });
            const startIdx = cursor ? items.findIndex(i => i.id === cursor) + 1 : 0;
            const page = items.slice(startIdx, startIdx + limit);
            return send(res, 200, { items: page, nextCursor: page.length === limit ? page[page.length - 1]?.id : null, total: items.length });
          }

          // Remote items from manifest cache
          const peer = network.listPeers().find(p => p.id === fishId || p.name === fishId);
          if (!peer) return send(res, 404, { error: 'Fish not found' });
          const cache = network.getManifestCache(peer.id ?? `${peer.address}:${peer.port}`);
          if (!cache) { network.fetchPeerManifest(peer).catch(() => {}); return send(res, 200, { items: [], nextCursor: null, total: 0 }); }
          let items = [...(cache.items?.values?.() ?? [])];
          if (colId) items = items.filter(i => i.collectionId === colId);
          if (q) { const ql = q.toLowerCase(); items = items.filter(i => [i.summary, i.title, i.name, i.path, i.excerpt, i.author, ...(i.tags ?? [])].filter(Boolean).join(' ').toLowerCase().includes(ql)); }
          if (type) items = items.filter(i => i.type === type);
          items.sort((a, b) => String(b.updatedAt ?? b.createdAt ?? '').localeCompare(String(a.updatedAt ?? a.createdAt ?? '')));
          const startIdx = cursor ? items.findIndex(i => i.id === cursor) + 1 : 0;
          const page = items.slice(startIdx, startIdx + limit);
          return send(res, 200, { items: page, nextCursor: page.length === limit ? page[page.length - 1]?.id : null, total: items.length });
        } catch (err) { return send(res, 500, { error: err.message }); }
      },
    }));

    // GET /item — single item with content
    ctx.effect(() => webServer.register({ kind: 'exact', path: '/fish-school/v1/item',
      async handler(req, res) {
        const rej = auth(req); if (rej) return send(res, rej, { error: 'unauthorized' });
        if (req.method !== 'GET') return send(res, 405, { error: 'method not allowed' });
        const url = new URL(req.url ?? '/', 'http://local');
        const id = url.searchParams.get('id'); if (!id) return send(res, 400, { error: 'Missing id' });
        const fishId = url.searchParams.get('fish');
        try {
          const myId = store.identity().id;
          if (!fishId || fishId === myId || fishId === store.identity().name) {
            const item = store.getItem(id);
            if (!item) return send(res, 404, { error: 'Not found' });
            const body = await contentOf(item);
            return send(res, 200, { item, ...(body ?? {}) });
          }
          const peer = network.listPeers().find(p => p.id === fishId || p.name === fishId);
          if (!peer) return send(res, 404, { error: 'Fish not found' });
          const entry = await network.getFromPeer(peer, id);
          if (!entry) return send(res, 404, { error: 'Not found on peer' });
          return send(res, 200, { item: entry, content: entry.content, messages: entry.messages });
        } catch (err) { return send(res, 500, { error: err.message }); }
      },
    }));

    // GET /collections  POST /collections  POST /collections/update  POST /collections/delete  POST /collections/resync
    ctx.effect(() => webServer.register({ kind: 'exact', path: '/fish-school/v1/collections',
      async handler(req, res) {
        const rej = auth(req); if (rej) return send(res, rej, { error: 'unauthorized' });
        if (req.method === 'GET') {
          const cols = store.listCollections({ includePrivate: true }).map(c => ({ ...c, sync: getSyncStatus(c.id) }));
          return send(res, 200, { collections: cols });
        }
        if (req.method === 'POST') {
          try {
            const b = await readBody(req);
            const col = store.createCollection({ kind: b.kind, name: b.name, visibility: b.visibility, source: b.root ? { root: b.root } : null });
            if (col.kind === 'folder') startFolderMgr(col);
            else if (col.kind === 'project') startProjectMgr(col);
            return send(res, 200, { collection: { ...col, sync: getSyncStatus(col.id) } });
          } catch (err) { return send(res, 400, { error: err.message }); }
        }
        return send(res, 405, { error: 'method not allowed' });
      },
    }));

    ctx.effect(() => webServer.register({ kind: 'exact', path: '/fish-school/v1/collections/update',
      async handler(req, res) {
        const rej = auth(req); if (rej) return send(res, rej, { error: 'unauthorized' });
        if (req.method !== 'POST') return send(res, 405, { error: 'method not allowed' });
        try {
          const { id, ...patch } = await readBody(req);
          const col = store.updateCollection(id, patch);
          return send(res, 200, { collection: { ...col, sync: getSyncStatus(col.id) } });
        } catch (err) { return send(res, 400, { error: err.message }); }
      },
    }));

    ctx.effect(() => webServer.register({ kind: 'exact', path: '/fish-school/v1/collections/delete',
      async handler(req, res) {
        const rej = auth(req); if (rej) return send(res, rej, { error: 'unauthorized' });
        if (req.method !== 'POST') return send(res, 405, { error: 'method not allowed' });
        try { const { id } = await readBody(req); stopMgr(id); store.deleteCollection(id); return send(res, 200, { ok: true }); }
        catch (err) { return send(res, 400, { error: err.message }); }
      },
    }));

    ctx.effect(() => webServer.register({ kind: 'exact', path: '/fish-school/v1/collections/resync',
      async handler(req, res) {
        const rej = auth(req); if (rej) return send(res, rej, { error: 'unauthorized' });
        if (req.method !== 'POST') return send(res, 405, { error: 'method not allowed' });
        try {
          const { id } = await readBody(req);
          const pm = projectMgrs.get(id);
          if (pm?.sync) { pm.sync.syncNow().catch(() => {}); return send(res, 200, { ok: true }); }
          const fm = folderMgrs.get(id);
          if (fm?.indexer) {
            const items = fm.indexer.getItems();
            store.batchUpsertFileItems(id, items);
            fm.status.lastSyncAt = new Date().toISOString();
            return send(res, 200, { ok: true });
          }
          return send(res, 404, { error: 'No sync manager for this collection' });
        } catch (err) { return send(res, 400, { error: err.message }); }
      },
    }));

    // GET /fs/list — filesystem browser for folder/project path picker
    ctx.effect(() => webServer.register({ kind: 'exact', path: '/fish-school/v1/fs/list',
      async handler(req, res) {
        const rej = auth(req); if (rej) return send(res, rej, { error: 'unauthorized' });
        if (req.method !== 'GET') return send(res, 405, { error: 'method not allowed' });
        const url = new URL(req.url ?? '/', 'http://local');
        let reqPath = url.searchParams.get('path') ?? '';
        const { join: pathJoin, resolve: pathResolve, dirname, basename } = await import('node:path');
        const { readdirSync: rd, statSync } = await import('node:fs');
        try {
          if (!reqPath) {
            // List common root options
            const { homedir } = await import('node:os');
            const home = homedir();
            const roots = process.platform === 'win32'
              ? [home, pathJoin(home, 'Documents'), pathJoin(home, '.dsh'), 'C:\\', 'D:\\']
              : [home, '/home', '/Users', '/tmp'];
            return send(res, 200, { path: '', parent: null, dirs: roots.filter(existsSync).map(p => ({ name: basename(p) || p, path: p })) });
          }
          const abs = pathResolve(reqPath);
          const dirs = [];
          try {
            for (const name of rd(abs)) {
              const full = pathJoin(abs, name);
              try { if (statSync(full).isDirectory()) dirs.push({ name, path: full }); } catch {}
            }
          } catch {}
          dirs.sort((a, b) => a.name.localeCompare(b.name));
          return send(res, 200, { path: abs, parent: dirname(abs) === abs ? null : dirname(abs), dirs: dirs.slice(0, 200) });
        } catch (err) { return send(res, 400, { error: err.message }); }
      },
    }));

    // GET /workspaces — list DSH workspaces for project collection creation
    ctx.effect(() => webServer.register({ kind: 'exact', path: '/fish-school/v1/workspaces',
      async handler(req, res) {
        const rej = auth(req); if (rej) return send(res, rej, { error: 'unauthorized' });
        if (req.method !== 'GET') return send(res, 405, { error: 'method not allowed' });
        try {
          const { listSessions } = await import('./lib/session-reader.js');
          const { join: pj } = await import('node:path');
          const { homedir } = await import('node:os');
          const sessionsRoot = pj(homedir(), '.dsh', 'sessions');
          const sessions = await listSessions(sessionsRoot, null);
          const cwdMap = new Map();
          for (const s of sessions) {
            const cwd = s.cwd ?? ''; if (!cwd) continue;
            const entry = cwdMap.get(cwd) ?? { cwd, sessions: 0, lastAt: null };
            entry.sessions++;
            if (!entry.lastAt || s.createdAt > entry.lastAt) entry.lastAt = s.createdAt;
            cwdMap.set(cwd, entry);
          }
          const workspaces = [...cwdMap.values()].sort((a, b) => (b.lastAt ?? 0) - (a.lastAt ?? 0)).slice(0, 50);
          return send(res, 200, { workspaces });
        } catch (err) { return send(res, 500, { error: err.message }); }
      },
    }));

    // POST /rename, /delete, /set-visibility, /upload, /share-session, /add-peer, /remove-peer, /scan
    ctx.effect(() => webServer.register({ kind: 'exact', path: '/fish-school/v1/rename',
      async handler(req, res) {
        const rej = auth(req); if (rej) return send(res, rej, { error: 'unauthorized' });
        if (req.method !== 'POST') return send(res, 405, { error: 'method not allowed' });
        try { const b = await readBody(req); const identity = store.rename(b.name); network.announce(); return send(res, 200, { me: identity }); }
        catch (err) { return send(res, 400, { error: err.message }); }
      },
    }));

    ctx.effect(() => webServer.register({ kind: 'exact', path: '/fish-school/v1/delete',
      async handler(req, res) {
        const rej = auth(req); if (rej) return send(res, rej, { error: 'unauthorized' });
        if (req.method !== 'POST') return send(res, 405, { error: 'method not allowed' });
        try { const { id } = await readBody(req); if (!id) throw new Error('Missing id'); store.remove(id); return send(res, 200, { ok: true }); }
        catch (err) { return send(res, 400, { error: err.message }); }
      },
    }));

    ctx.effect(() => webServer.register({ kind: 'exact', path: '/fish-school/v1/set-visibility',
      async handler(req, res) {
        const rej = auth(req); if (rej) return send(res, rej, { error: 'unauthorized' });
        if (req.method !== 'POST') return send(res, 405, { error: 'method not allowed' });
        try { const { id, isPublic } = await readBody(req); store.setVisibility(id, isPublic); return send(res, 200, { ok: true }); }
        catch (err) { return send(res, 400, { error: err.message }); }
      },
    }));

    // POST /upload
    ctx.effect(() => webServer.register({ kind: 'exact', path: '/fish-school/v1/upload',
      async handler(req, res) {
        const rej = auth(req); if (rej) return send(res, rej, { error: 'unauthorized' });
        if (req.method !== 'POST') return send(res, 405, { error: 'method not allowed' });
        try {
          const b = await readBody(req, 4 * 1024 * 1024);
          const text = typeof b.text === 'string' ? b.text : '';
          const name = String(b.name ?? 'untitled');
          const summary = String(b.summary ?? '').trim() || name.replace(/\.[^.]+$/, '');
          const entry = store.saveKnowledge({
            summary, content: text, tags: b.tags,
            collectionId: b.collectionId,
            path: b.path,
            isPublic: b.isPublic !== false,
            sourceFile: { name, size: b.size ?? text.length, mime: b.mime ?? 'text/plain' },
          });
          return send(res, 200, { entry });
        } catch (err) { return send(res, 400, { error: err.message }); }
      },
    }));

    // POST /share-session
    ctx.effect(() => webServer.register({ kind: 'exact', path: '/fish-school/v1/share-session',
      async handler(req, res) {
        const rej = auth(req); if (rej) return send(res, rej, { error: 'unauthorized' });
        if (req.method !== 'POST') return send(res, 405, { error: 'method not allowed' });
        try {
          const b = await readBody(req);
          const agentId = b.sessionId;
          if (!agentId) throw new Error('Missing sessionId');
          const messages = extractMessages(agentId);
          const entry = store.saveConversation({ title: b.title, sessionId: agentId, messages, tags: b.tags, isPublic: b.isPublic !== false });
          return send(res, 200, { entry, messageCount: messages.length, peersCount: network.listPeers().length });
        } catch (err) { return send(res, 400, { error: err.message }); }
      },
    }));

    // POST /add-peer
    ctx.effect(() => webServer.register({ kind: 'exact', path: '/fish-school/v1/add-peer',
      async handler(req, res) {
        const rej = auth(req); if (rej) return send(res, rej, { error: 'unauthorized' });
        if (req.method !== 'POST') return send(res, 405, { error: 'method not allowed' });
        try { const b = await readBody(req); const result = await network.remember(b.address, 'manual'); return send(res, 200, result); }
        catch (err) { return send(res, 400, { error: err.message }); }
      },
    }));

    // POST /remove-peer
    ctx.effect(() => webServer.register({ kind: 'exact', path: '/fish-school/v1/remove-peer',
      async handler(req, res) {
        const rej = auth(req); if (rej) return send(res, rej, { error: 'unauthorized' });
        if (req.method !== 'POST') return send(res, 405, { error: 'method not allowed' });
        try { const b = await readBody(req); const result = await network.forget(b.address); return send(res, 200, result); }
        catch (err) { return send(res, 400, { error: err.message }); }
      },
    }));

    // POST /scan
    ctx.effect(() => webServer.register({ kind: 'exact', path: '/fish-school/v1/scan',
      async handler(req, res) {
        const rej = auth(req); if (rej) return send(res, rej, { error: 'unauthorized' });
        if (req.method !== 'POST') return send(res, 405, { error: 'method not allowed' });
        try { const found = await network.scan(); return send(res, 200, { found: found.length, peers: found }); }
        catch (err) { return send(res, 500, { error: err.message }); }
      },
    }));

    // GET /knowledge (backward compat — merged flat list for old clients and tools)
    ctx.effect(() => webServer.register({ kind: 'exact', path: '/fish-school/v1/knowledge',
      async handler(req, res) {
        const rej = auth(req); if (rej) return send(res, rej, { error: 'unauthorized' });
        if (req.method !== 'GET') return send(res, 405, { error: 'method not allowed' });
        try {
          const url = new URL(req.url ?? '/', 'http://local');
          const q = url.searchParams.get('q') ?? ''; const type = url.searchParams.get('type') ?? undefined;
          const tags = url.searchParams.get('tags') ?? undefined; const fishName = url.searchParams.get('fishName') ?? undefined;
          const limit = parseInt(url.searchParams.get('limit') ?? '50', 10);
          const local = store.search({ query: q, tags, type, limit, includePrivate: true }).map(e => ({ ...e, remote: false }));
          const sets = await remoteEntriesForPanel({ query: q, tags, type, limit });
          const remote = sets.flatMap(set => (set.results ?? []).map(e => ({ ...e, remote: true, peerName: set.peer?.name ?? e.author, peerAddress: set.peer?.address })));
          const seen = new Set();
          let entries = [...local, ...remote].filter(e => { const key = `${e.type}:${e.id}`; if (seen.has(key)) return false; seen.add(key); return true; });
          if (fishName) entries = entries.filter(e => e.author === fishName || e.peerName === fishName);
          entries = entries.sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? ''))).slice(0, limit);
          return send(res, 200, { entries });
        } catch (err) { return send(res, 500, { error: err.message }); }
      },
    }));

  } // end if webServer && connection

  // ---- Tools (registered even without webServer) ----
  const tools = ctx.get('tools');
  if (tools) {
    tools.register(toolDef('fish_school_read', 'Load the full content behind fish-school reference tokens',
      { properties: { refs: { type: 'string', description: 'Space or comma-separated @fish/type/id tokens' } }, required: ['refs'] },
      async ({ refs }, execCtx) => {
        const tokens = String(refs).split(/[\s,]+/).filter(Boolean);
        const results = await Promise.all(tokens.map(async ref => {
          const m = ref.match(/^@([^/]+)\/(knowledge|conversation|file)\/(.+)$/);
          if (!m) return { ref, ok: false, error: 'Invalid reference format' };
          const [, fish, type, id] = m;
          const myName = store.identity().name;
          if (fish === myName || fish === store.identity().id) {
            const item = store.getItem(id);
            if (!item) return { ref, ok: false, error: 'Not found' };
            const body = await contentOf(item);
            return { ...item, ...body, ref, ok: true };
          }
          const peer = network.peersFor(fish)[0];
          if (!peer) return { ref, ok: false, error: `Fish "${fish}" not found` };
          const entry = await network.getFromPeer(peer, id);
          return entry ? { ...entry, ref, ok: true } : { ref, ok: false, error: 'Not found on peer' };
        }));
        const loaded = results.filter(r => r.ok).length;
        return { success: true, results, message: `📖 Loaded ${loaded}/${tokens.length} reference(s)` };
      }
    ));

    tools.register(toolDef('fish_school_publish', 'Publish knowledge to the fish school so peers can find it',
      {
        properties: {
          summary: { type: 'string', description: 'One-line title / summary' },
          content: { type: 'string', description: 'Full content (Markdown, plain text, or JSON)' },
          tags: { type: 'string', description: 'Comma-separated tags' },
          isPublic: { type: 'boolean', description: 'Default true', default: true },
        },
        required: ['summary', 'content'],
      },
      async ({ summary, content, tags, isPublic = true }) => {
        const entry = store.saveKnowledge({ summary, content, tags, isPublic });
        const ref = `@${store.identity().name}/knowledge/${entry.id}`;
        return { success: true, id: entry.id, ref, peersCount: network.listPeers().length, message: `✅ Published "${summary}" (${ref})` };
      }
    ));

    tools.register(toolDef('fish_school_share_conversation', 'Share this conversation to the fish school',
      {
        properties: {
          title: { type: 'string', description: 'Conversation title' },
          tags: { type: 'string', description: 'Comma-separated tags' },
          isPublic: { type: 'boolean', description: 'Default true', default: true },
        },
        required: ['title'],
      },
      async ({ title, tags, isPublic = true }, execCtx) => {
        const agentId = execCtx?.agent?.id;
        if (!agentId) throw new Error('Cannot share: no agent context');
        const messages = extractMessages(agentId);
        const entry = store.saveConversation({ title, sessionId: agentId, messages, tags, isPublic });
        return { success: true, id: entry.id, isPublic: entry.isPublic, messageCount: messages.length, peersCount: network.listPeers().length,
          message: `✅ Shared "${title}" (${messages.length} messages, ID: ${entry.id})` };
      }
    ));

    tools.register(toolDef('fish_school_query', 'Query knowledge from the network using keywords, tags, or filter by specific fish or type',
      {
        properties: { query: { type: 'string', description: 'Search keywords' }, tags: { type: 'string' }, type: { type: 'string' }, fishName: { type: 'string' }, limit: { type: 'number', default: 10 } },
        required: ['query'],
      },
      async ({ query, tags, type, fishName, limit = 10 }) => {
        const local = store.search({ query, tags, type, limit });
        const remoteSet = await network.searchPeers({ query, tags, type, limit });
        const remote = remoteSet.flatMap(r => r.results);
        let combined = [...local, ...remote];
        if (fishName) combined = combined.filter(e => e.author === fishName);
        return { success: true, results: combined.slice(0, limit), count: combined.length };
      }
    ));

    tools.register(toolDef('fish_school_list', 'List recent entries from the network, optionally filtered',
      { properties: { limit: { type: 'number', default: 20 }, tags: { type: 'string' }, type: { type: 'string' }, fishName: { type: 'string' } } },
      async ({ limit = 20, tags, type, fishName }) => {
        const local = store.search({ tags, type, limit });
        const remoteSet = await network.searchPeers({ tags, type, limit });
        const remote = remoteSet.flatMap(r => r.results);
        let entries = [...local, ...remote];
        if (fishName) entries = entries.filter(e => e.author === fishName);
        entries = entries.slice(0, limit);
        return { success: true, entries: entries.map(e => ({ id: e.id, type: e.type, summary: e.summary ?? e.title, title: e.type === 'knowledge' ? e.summary : e.title, tags: e.tags ?? [], author: e.author ?? 'unknown' })), count: entries.length,
          message: `📚 ${entries.length} entr${entries.length === 1 ? 'y' : 'ies'} — ${local.length} local, ${remote.length} from peers` };
      }
    ));

    tools.register(toolDef('fish_school_get_conversation', 'Retrieve a shared conversation with its full context',
      { properties: { conversationId: { type: 'string', description: 'Conversation ID' }, fishName: { type: 'string' } }, required: ['conversationId'] },
      async ({ conversationId, fishName }) => {
        if (!fishName || fishName === store.identity().name) {
          const conv = store.getConversation(conversationId);
          if (conv) return { success: true, title: conv.title, author: conv.author, tags: conv.tags, messageCount: conv.messages?.length || 0, messages: conv.messages };
        }
        const peer = network.peersFor(fishName ?? '')[0];
        if (!peer) return { success: false, error: `Fish "${fishName}" not found` };
        const entry = await network.getFromPeer(peer, conversationId);
        if (!entry) return { success: false, error: 'Conversation not found' };
        return { success: true, title: entry.title, author: entry.author, messages: entry.messages ?? [] };
      }
    ));

    tools.register(toolDef('fish_school_find_knowledge', 'Find knowledge or conversation by fish name or ID',
      { properties: { fishName: { type: 'string' }, limit: { type: 'number', default: 10 }, type: { type: 'string' } } },
      async ({ fishName, limit = 10, type }) => {
        const local = store.search({ type, limit });
        if (!fishName || fishName === store.identity().name) return { success: true, entries: local };
        const peer = network.peersFor(fishName)[0];
        if (!peer) return { success: false, error: `Fish "${fishName}" not found` };
        const remoteSet = await network.searchPeers({ type, limit });
        const remote = (remoteSet.find(s => s.peer.id === peer.id || s.peer.name === fishName)?.results ?? []).slice(0, limit);
        return { success: true, entries: remote };
      }
    ));
  }

  // ---- Sidebar + system prompt ----
  const slots = ctx.get('slots');
  if (slots) {
    function createGate(register, initiallyVisible = true) {
      let ready = false; let wanted = initiallyVisible;
      let off = null;
      function sync() {
        if (ready && wanted && !off) off = register();
        if (off && (!ready || !wanted)) { off(); off = null; }
      }
      slots.on('available', () => { ready = true; sync(); });
      if (slots.available()) { ready = true; sync(); }
      return { show() { wanted = true; sync(); }, hide() { wanted = false; sync(); } };
    }

    const settingsFile = join(config.storageDir, 'settings.json');
    let sidebarEnabled = true;
    try { sidebarEnabled = JSON.parse(readFileSync(settingsFile, 'utf8'))?.sidebarEnabled !== false; } catch {}

    const sidebarGate = createGate(() => slots.register({
      kind: 'sidebar',
      name: '🐟 鱼群',
      panel: { plugin: '@local/fish-school', component: 'panel' },
    }), sidebarEnabled);
  }

  const systemPrompt = ctx.get('systemPrompt');
  if (systemPrompt) {
    ctx.effect(() => systemPrompt.section({
      id: 'fish-school',
      order: 50,
      text: `# Fish School (知识共享网络)

You have access to the Fish School tool suite for sharing knowledge across LAN DeepSeek Harness instances.

## Available Tools
- **fish_school_read**(refs): Load content behind @fish/type/id tokens
- **fish_school_publish**(summary, content, tags?, isPublic?): Publish knowledge
- **fish_school_share_conversation**(title, tags?, isPublic?): Share this conversation
- **fish_school_query**(query, tags?, type?, fishName?, limit?): Search the network
- **fish_school_list**(limit?, tags?, type?, fishName?): Browse recent entries
- **fish_school_get_conversation**(conversationId, fishName?): Load a conversation
- **fish_school_find_knowledge**(fishName?, type?, limit?): Browse by author

## Reference Tokens
When a message contains @fish/type/id, call fish_school_read with that token first.

Storage: ${config.storageDir}
`,
      invocation: { modelInvocable: true, userInvocable: true },
      provider: 'fish-school',
    }));
  }

  ctx.effect(() => () => {
    logger.info('Fish School 2.0 stopping…');
    for (const [id] of folderMgrs) stopMgr(id);
    for (const [id] of projectMgrs) stopMgr(id);
    network.stop();
  });

  logger.info('Fish School 2.0 started: %s, port %d', store.identity().name, config.port);
}
