// LAN layer.
//
// Discovery has two paths:
//   1. UDP multicast announce (fast, automatic, but often dropped on Wi-Fi and
//      by client isolation — treat it as a bonus, never as the only signal).
//   2. Unicast HTTP health checks against a persisted address list (authoritative).
//
// Content is still read-only over HTTP: /hello for identity, /knowledge for data.
import { createServer } from 'node:http';
import { createSocket } from 'node:dgram';
import { connect } from 'node:net';
import { networkInterfaces } from 'node:os';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const VERSION = '2.0.0';
const ANNOUNCE_MS = 15000;
const EXPIRE_MS = 90000;       // six missed announces: Wi-Fi drops multicast routinely
const POLL_MS = 20000;         // unicast liveness check
const HELLO_TIMEOUT_MS = 1500;
const SCAN_TIMEOUT_MS = 300;
const MAX_MISSES = 3;
const MAX_SAVED = 64;

// Usable IPv4 interface addresses. Windows sends and joins multicast on the
// LOWEST-metric interface by default, which on developer machines is often a
// WSL / Hyper-V / VPN adapter rather than the real LAN — so both joining and
// sending have to name the interface explicitly.
function ipv4Interfaces() {
  const out = [];
  for (const addrs of Object.values(networkInterfaces())) {
    for (const a of addrs ?? []) {
      if (a.family !== 'IPv4' || a.internal) continue;
      if (a.address.startsWith('169.254.')) continue; // APIPA: not on a LAN
      out.push(a.address);
    }
  }
  return [...new Set(out)];
}

function tcpProbe(host, port) {
  return new Promise((resolve) => {
    const sock = connect({ host, port });
    const finish = (ok) => { try { sock.destroy(); } catch { /* already closed */ } resolve(ok); };
    sock.setTimeout(SCAN_TIMEOUT_MS);
    sock.once('connect', () => finish(true));
    sock.once('timeout', () => finish(false));
    sock.once('error', () => finish(false));
  });
}

// `contentOf(item)` resolves an item's body ({ content } or { messages }); the
// host supplies it because folder files live on disk outside the store.
export function startNetwork({ store, config, logger, contentOf }) {
  const peers = new Map();  // multicast-learned: fish id -> { id, name, address, port, lastSeen }
  const known = new Map();  // unicast addresses: "ip:port" -> { address, port, id?, name?, source, lastSeen, misses }
  const discoveryPort = config.port + 1;
  const peersFile = join(config.storageDir, 'peers.json');

  // ---------- persisted address book ----------
  function loadKnown() {
    try {
      const data = JSON.parse(readFileSync(peersFile, 'utf8'));
      for (const p of Array.isArray(data?.peers) ? data.peers : []) {
        const address = typeof p?.address === 'string' ? p.address : '';
        if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(address)) continue;
        const port = Number(p.port) || config.port;
        known.set(`${address}:${port}`, {
          address, port,
          source: p.source === 'manual' ? 'manual' : 'saved',
          lastSeen: 0, misses: 0,
        });
      }
    } catch { /* first run */ }
  }

  function saveKnown() {
    try {
      const list = [...known.values()]
        .sort((a, b) => (b.lastSeen || 0) - (a.lastSeen || 0))
        .slice(0, MAX_SAVED)
        .map(p => ({ address: p.address, port: p.port, source: p.source }));
      writeFileSync(peersFile, JSON.stringify({ peers: list }, null, 2), 'utf8');
    } catch (err) {
      logger.warn('cannot save peers.json: %s', err.message);
    }
  }

  // ---------- HTTP: identity + read-only knowledge ----------
  const server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://local');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');

    if (req.method !== 'GET') {
      res.writeHead(405).end(JSON.stringify({ error: 'method not allowed' }));
      return;
    }

    // GET /hello — who am I (also the liveness probe other fish poll)
    if (url.pathname === '/hello') {
      res.writeHead(200).end(JSON.stringify({
        fish: store.identity(),
        app: 'fish-school',
        version: VERSION,
        port: config.port,
        schema: 2,
        caps: ['manifest', 'item', 'blob'],
      }));
      return;
    }

    // GET /manifest?since=<rev>&limit=500 — incremental metadata, no bodies
    if (url.pathname === '/manifest') {
      const since = Math.max(0, Number(url.searchParams.get('since')) || 0);
      const limit = Math.min(Math.max(1, Number(url.searchParams.get('limit')) || 500), 2000);
      const m = store.getManifest({ since, limit });
      const slim = it => ({ ...it, excerpt: String(it.excerpt ?? '').slice(0, 160) });
      res.writeHead(200).end(JSON.stringify({
        fish: store.identity(),
        rev: m.rev,
        collections: m.collections.map(({ source, ...c }) => c), // never leak local paths
        items: m.items.map(slim),
        removed: m.removed,
        hasMore: m.hasMore,
      }));
      return;
    }

    // GET /item/:id — one public entry with its body
    const itemMatch = url.pathname.match(/^\/item\/([0-9]+-[0-9a-f]{8}|[fc]_[0-9a-f]{12,40})$/);
    if (itemMatch) {
      const id = itemMatch[1];
      const item = store.getItem(id);
      if (!item || !store.effectivePublic(item)) { res.writeHead(404).end(JSON.stringify({ error: 'not found' })); return; }
      Promise.resolve(contentOf?.(item))
        .then(body => res.writeHead(200).end(JSON.stringify({ fish: store.identity(), item, ...(body ?? {}) })))
        .catch(err => res.writeHead(500).end(JSON.stringify({ error: err.message })));
      return;
    }

    // GET /knowledge — list / search
    if (url.pathname === '/knowledge') {
      const results = store.search({
        query: url.searchParams.get('q') ?? '',
        tags: url.searchParams.get('tags') ?? '',
        type: url.searchParams.get('type') ?? undefined,
        limit: Math.min(Number(url.searchParams.get('limit')) || 20, 100),
      });
      res.writeHead(200).end(JSON.stringify({ fish: store.identity(), results }));
      return;
    }

    // GET /knowledge/:id — one entry (public knowledge or conversation)
    const idMatch = url.pathname.match(/^\/knowledge\/([0-9]+-[0-9a-f]{8})$/);
    if (idMatch) {
      const id = idMatch[1];
      const entry = store.all().find(e => e.id === id);
      if (!entry) { res.writeHead(404).end(JSON.stringify({ error: 'not found' })); return; }
      if (entry.type === 'conversation') {
        const full = store.getConversation(id);
        res.writeHead(200).end(JSON.stringify({ fish: store.identity(), entry: full ?? entry }));
        return;
      }
      res.writeHead(200).end(JSON.stringify({ fish: store.identity(), entry }));
      return;
    }

    res.writeHead(404).end(JSON.stringify({ error: 'not found' }));
  });
  server.on('error', err => logger.warn('knowledge server error: %s', err.message));
  server.listen(config.port, '0.0.0.0');

  // ---------- unicast helpers ----------
  // /hello only exists from 1.3.0; older fish answer /knowledge?limit=1 and
  // carry the same identity in `fish`, so discovery works across mixed versions.
  async function hello(address, port) {
    const base = `http://${address}:${port}`;
    for (const path of ['/hello', '/knowledge?limit=1']) {
      try {
        const res = await fetch(base + path, { signal: AbortSignal.timeout(HELLO_TIMEOUT_MS) });
        if (!res.ok) continue;
        const body = await res.json();
        if (body?.fish?.id) {
          return {
            id: String(body.fish.id),
            name: String(body.fish.name ?? 'fish'),
            version: body.version,
          };
        }
      } catch { /* try the next probe */ }
    }
    return null;
  }

  function normalize(target) {
    const text = String(target ?? '').trim();
    if (!text) return null;
    const [host, portPart] = text.includes(':') ? text.split(':') : [text, ''];
    if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return null;
    return { address: host, port: Number(portPart) || config.port };
  }

  // Add an address, verify it immediately, and keep it in the address book.
  async function remember(target, source = 'manual') {
    const parsed = normalize(target);
    if (!parsed) throw new Error('Expected an address like 192.168.1.20');
    if (ipv4Interfaces().includes(parsed.address)) throw new Error('That address is this machine');
    const key = `${parsed.address}:${parsed.port}`;
    const entry = known.get(key) ?? { address: parsed.address, port: parsed.port, misses: 0, lastSeen: 0 };
    entry.source = source;
    known.set(key, entry);

    const who = await hello(parsed.address, parsed.port);
    if (who) {
      entry.id = who.id; entry.name = who.name;
      entry.lastSeen = Date.now(); entry.misses = 0;
    } else {
      entry.misses = MAX_MISSES;
    }
    saveKnown();
    return { ok: Boolean(who), peer: { ...entry } };
  }

  async function forget(target) {
    const parsed = normalize(target);
    if (!parsed) throw new Error('Expected an address like 192.168.1.20');
    const key = `${parsed.address}:${parsed.port}`;
    const entry = known.get(key);
    known.delete(key);
    if (entry?.id) peers.delete(entry.id);
    saveKnown();
    return { ok: true };
  }

  async function pollKnown() {
    await Promise.all([...known.values()].map(async (p) => {
      const who = await hello(p.address, p.port);
      if (who) {
        p.id = who.id; p.name = who.name;
        p.lastSeen = Date.now(); p.misses = 0;
      } else {
        p.misses += 1;
        if (p.misses >= MAX_MISSES && p.source !== 'manual') known.delete(`${p.address}:${p.port}`);
      }
    }));
  }

  // One pass over this host's /24s; finds fish-school servers even with no multicast.
  async function scan() {
    const mine = ipv4Interfaces();
    const bases = [...new Set(mine.map(ip => ip.split('.').slice(0, 3).join('.')))];
    const found = [];

    for (const base of bases) {
      const targets = Array.from({ length: 254 }, (_, i) => `${base}.${i + 1}`)
        .filter(ip => !mine.includes(ip));
      const reachable = (await Promise.all(targets.map(async ip =>
        (await tcpProbe(ip, config.port)) ? ip : null))).filter(Boolean);

      for (const ip of reachable) {
        const who = await hello(ip, config.port);
        if (!who) continue;
        const key = `${ip}:${config.port}`;
        const entry = known.get(key) ?? { address: ip, port: config.port, misses: 0, lastSeen: 0 };
        Object.assign(entry, { id: who.id, name: who.name, source: 'scan', lastSeen: Date.now(), misses: 0 });
        known.set(key, entry);
        found.push({ address: ip, port: config.port, name: who.name, id: who.id });
      }
    }
    if (found.length) saveKnown();
    return found;
  }

  // ---------- multicast ----------
  const socket = createSocket({ type: 'udp4', reuseAddr: true });
  let joined = false;
  const joinedOn = [];

  socket.on('error', err => logger.warn('discovery socket error: %s', err.message));
  socket.on('message', (msg, rinfo) => {
    let data;
    try { data = JSON.parse(msg.toString('utf8')); } catch { return; }
    if (data?.type !== 'fish-school/announce' || typeof data.id !== 'string') return;
    if (data.id === store.identity().id) return; // our own multicast loopback
    if (data.bye) { peers.delete(data.id); return; }

    peers.set(data.id, {
      id: data.id,
      name: typeof data.name === 'string' ? data.name.slice(0, 40) : 'fish',
      address: rinfo.address,
      port: Number(data.port) || config.port,
      lastSeen: Date.now(),
    });

    // Multicast gave us an address; keep polling it over unicast from now on.
    const key = `${rinfo.address}:${Number(data.port) || config.port}`;
    if (!known.has(key)) {
      known.set(key, {
        address: rinfo.address, port: Number(data.port) || config.port,
        id: data.id, name: String(data.name ?? 'fish'),
        source: 'multicast', lastSeen: Date.now(), misses: 0,
      });
      saveKnown();
    }
  });

  function announce(bye = false) {
    if (!joined) return;
    const { id, name } = store.identity();
    const payload = JSON.stringify({ type: 'fish-school/announce', id, name, port: config.port, bye });
    for (const address of joinedOn.length ? joinedOn : ['default']) {
      try {
        if (address !== 'default') socket.setMulticastInterface(address);
        socket.send(payload, discoveryPort, config.multicastAddress, () => {});
      } catch (err) {
        logger.warn('announce via %s failed: %s', address, err.message);
      }
    }
  }

  socket.bind(discoveryPort, () => {
    for (const address of ipv4Interfaces()) {
      try {
        socket.addMembership(config.multicastAddress, address);
        joinedOn.push(address);
      } catch (err) {
        logger.warn('join %s on %s failed: %s', config.multicastAddress, address, err.message);
      }
    }
    if (!joinedOn.length) {
      try {
        socket.addMembership(config.multicastAddress);
        joinedOn.push('default');
      } catch (err) {
        logger.warn('cannot join multicast group: %s', err.message);
        return;
      }
    }
    try {
      socket.setMulticastTTL(1); // stay inside the local network
    } catch (err) {
      logger.warn('cannot set multicast TTL: %s', err.message);
    }
    joined = true;
    logger.info('joined %s via %s', config.multicastAddress, joinedOn.join(', '));
    announce();
  });

  loadKnown();

  const announceTimer = setInterval(() => {
    announce();
    const now = Date.now();
    for (const [id, peer] of peers) if (now - peer.lastSeen > EXPIRE_MS) peers.delete(id);
  }, ANNOUNCE_MS);

  const pollTimer = setInterval(() => {
    pollKnown().catch(err => logger.warn('peer poll failed: %s', err.message));
  }, POLL_MS);

  // A cold start has an empty multicast table; probe the address book and, when
  // enabled, sweep the subnet once so discovery never depends on multicast.
  const bootTimer = setTimeout(() => {
    pollKnown()
      .then(() => (config.autoScan === false ? [] : scan()))
      .then(found => {
        if (found.length) logger.info('scan found %d fish: %s', found.length, found.map(f => `${f.name}@${f.address}`).join(', '));
      })
      .catch(err => logger.warn('boot discovery failed: %s', err.message));
  }, 1500);

  // ---------- public view ----------
  function listPeers() {
    const out = [];
    const seen = new Set();

    for (const peer of peers.values()) {
      if (seen.has(peer.id)) continue;
      seen.add(peer.id);
      out.push({
        id: peer.id, name: peer.name, address: peer.address, port: peer.port,
        source: 'multicast', online: true, lastSeen: peer.lastSeen,
      });
    }

    for (const p of known.values()) {
      const existing = p.id ? out.find(x => x.id === p.id) : undefined;
      if (existing) {
        // unicast wins: fresher address and liveness
        existing.address = p.address;
        existing.port = p.port;
        existing.source = p.source;
        existing.online = p.misses === 0;
        existing.lastSeen = Math.max(existing.lastSeen ?? 0, p.lastSeen ?? 0);
        continue;
      }
      out.push({
        id: p.id ?? `addr:${p.address}:${p.port}`,
        name: p.name ?? p.address,
        address: p.address,
        port: p.port,
        source: p.source,
        online: p.misses === 0 && Boolean(p.id),
        lastSeen: p.lastSeen,
      });
    }

    return out.sort((a, b) => String(a.name).localeCompare(String(b.name)));
  }

  // Ask every known fish; unreachable ones are reported, not fatal.
  async function searchPeers({ query = '', tags = '', type, limit = 10 } = {}) {
    const params = new URLSearchParams({ q: query, tags, limit: String(limit) });
    if (type) params.set('type', type);
    return Promise.all(listPeers().map(async peer => {
      try {
        const res = await fetch(`http://${peer.address}:${peer.port}/knowledge?${params}`,
          { signal: AbortSignal.timeout(3000) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = await res.json();
        const results = Array.isArray(body.results) ? body.results : [];
        const ownerId = body.fish?.id ?? peer.id;
        const ownerName = body.fish?.name ?? peer.name;
        return {
          peer,
          // Older peers report the name an entry was written under; if the peer
          // was renamed since, use its current name so the reference resolves.
          results: results.map(e => ({
            ...e,
            author: !e.authorId || e.authorId === ownerId ? ownerName : (e.author ?? ownerName),
            authorId: e.authorId ?? ownerId,
          })),
        };
      } catch (err) {
        return { peer, results: [], error: err.message };
      }
    }));
  }

  // Per-peer manifest cache: { rev, collections, items, fetchedAt }
  const manifestCache = new Map(); // peerId -> cache entry

  /**
   * Fetch /manifest from a peer (incremental or full). Returns null on error.
   * Schema-1 peers fallback to /knowledge for a flat list.
   */
  async function fetchPeerManifest(peer) {
    const key = peer.id ?? `${peer.address}:${peer.port}`;
    const cached = manifestCache.get(key);
    const since = cached?.rev ?? 0;
    // Try schema-2 endpoint first
    try {
      const url = `http://${peer.address}:${peer.port}/manifest?since=${since}&limit=500`;
      const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
      if (res.ok) {
        const body = await res.json();
        const ownerId = body.fish?.id ?? peer.id;
        const ownerName = body.fish?.name ?? peer.name;
        const norm = it => ({
          ...it,
          author: (!it.authorId || it.authorId === ownerId) ? ownerName : (it.author ?? ownerName),
          authorId: it.authorId ?? ownerId,
        });
        // Merge incremental update into cache
        const prev = cached ?? { collections: [], items: new Map() };
        for (const id of (body.removed ?? []).map(r => r.id ?? r)) prev.items.delete(id);
        for (const col of (body.collections ?? [])) prev.collections = [
          ...prev.collections.filter(c => c.id !== col.id), col,
        ];
        for (const it of (body.items ?? [])) prev.items.set(it.id, norm(it));
        const entry = { rev: body.rev ?? 0, collections: prev.collections, items: prev.items, fetchedAt: Date.now() };
        manifestCache.set(key, entry);
        return entry;
      }
    } catch { /* fall through */ }
    // Schema-1 fallback: /knowledge list
    try {
      const res = await fetch(`http://${peer.address}:${peer.port}/knowledge?limit=100`,
        { signal: AbortSignal.timeout(4000) });
      if (!res.ok) return null;
      const body = await res.json();
      const ownerId = body.fish?.id ?? peer.id;
      const ownerName = body.fish?.name ?? peer.name;
      const items = new Map();
      for (const it of (body.results ?? [])) {
        const norm = { ...it, author: (!it.authorId || it.authorId === ownerId) ? ownerName : (it.author ?? ownerName) };
        items.set(it.id, norm);
      }
      const entry = { rev: 0, collections: [], items, fetchedAt: Date.now() };
      manifestCache.set(key, entry);
      return entry;
    } catch { return null; }
  }

  async function getFromPeer(peer, id) {
    // Try v2 /item/:id first
    try {
      const res = await fetch(`http://${peer.address}:${peer.port}/item/${id}`,
        { signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        const body = await res.json();
        if (body.item) {
          const ownerId = body.fish?.id ?? peer.id;
          const ownerName = body.fish?.name ?? peer.name;
          const own = !body.item.authorId || body.item.authorId === ownerId;
          const item = { ...body.item, author: own ? ownerName : (body.item.author ?? ownerName) };
          return { ...item, content: body.content, messages: body.messages };
        }
      }
    } catch {}
    // Legacy fallback
    try {
      const res = await fetch(`http://${peer.address}:${peer.port}/knowledge/${id}`,
        { signal: AbortSignal.timeout(3000) });
      if (!res.ok) return null;
      const body = await res.json();
      const entry = body.entry;
      if (!entry) return null;
      const ownerId = body.fish?.id ?? peer.id;
      const ownerName = body.fish?.name ?? peer.name;
      const own = !entry.authorId || entry.authorId === ownerId;
      return { ...entry, author: own ? ownerName : (entry.author ?? ownerName) };
    } catch { return null; }
  }

  function getManifestCache(peerId) {
    return manifestCache.get(peerId) ?? null;
  }

  function findPeer(name) {
    return listPeers().find(p => p.name === name || p.id === name || p.address === name);
  }

  // Peers to ask for an entry owned by `owner`: the matching peer first, then
  // every other peer. A reference may carry a stale name (the owner renamed),
  // and entry ids are unique, so asking the rest is safe.
  function peersFor(owner) {
    const all = listPeers();
    const hit = owner ? findPeer(owner) : undefined;
    return hit ? [hit, ...all.filter(p => p.id !== hit.id)] : all;
  }

  function stop() {
    clearInterval(announceTimer);
    clearInterval(pollTimer);
    clearTimeout(bootTimer);
    try { announce(true); } catch { /* best effort */ }
    try { socket.close(); } catch { /* already closed */ }
    server.close();
  }

  return {
    listPeers,
    searchPeers,
    getManifestCache,
    fetchPeerManifest,
    getFromPeer,
    findPeer,
    peersFor,
    remember,
    forget,
    scan,
    pollKnown,
    interfaces: () => [...joinedOn],
    announce: () => announce(),
    stop,
  };
}
