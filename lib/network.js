// LAN layer: UDP multicast presence + a read-only HTTP endpoint for public knowledge.
import { createServer } from 'node:http';
import { createSocket } from 'node:dgram';

const ANNOUNCE_MS = 15000;
const EXPIRE_MS = 45000;

export function startNetwork({ store, config, logger }) {
  const peers = new Map(); // id -> { id, name, address, port, lastSeen }
  const discoveryPort = config.port + 1;

  // Read-only public knowledge endpoint for other fish.
  const server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://local');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');

    if (req.method !== 'GET') {
      res.writeHead(405).end(JSON.stringify({ error: 'method not allowed' }));
      return;
    }

    // GET /knowledge  — list / search
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

    // GET /knowledge/:id  — single entry (knowledge or conversation, public only)
    const idMatch = url.pathname.match(/^\/knowledge\/([0-9]+-[0-9a-f]{8})$/);
    if (idMatch) {
      const id = idMatch[1];
      // Try knowledge first, then conversation
      const all = store.all();
      const entry = all.find(e => e.id === id);
      if (entry) {
        // For conversations, also try to get full messages
        if (entry.type === 'conversation') {
          const full = store.getConversation(id);
          if (full) {
            res.writeHead(200).end(JSON.stringify({ fish: store.identity(), entry: full }));
            return;
          }
        }
        res.writeHead(200).end(JSON.stringify({ fish: store.identity(), entry }));
      } else {
        res.writeHead(404).end(JSON.stringify({ error: 'not found' }));
      }
      return;
    }

    res.writeHead(404).end(JSON.stringify({ error: 'not found' }));
  });
  server.on('error', err => logger.warn('knowledge server error: %s', err.message));
  server.listen(config.port, '0.0.0.0');

  const socket = createSocket({ type: 'udp4', reuseAddr: true });
  let joined = false;
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
  });

  function announce(bye = false) {
    if (!joined) return;
    const { id, name } = store.identity();
    const payload = JSON.stringify({ type: 'fish-school/announce', id, name, port: config.port, bye });
    socket.send(payload, discoveryPort, config.multicastAddress, () => {});
  }

  socket.bind(discoveryPort, () => {
    try {
      socket.addMembership(config.multicastAddress);
      socket.setMulticastTTL(1); // stay inside the local network
      joined = true;
      announce();
    } catch (err) {
      logger.warn('cannot join multicast group: %s', err.message);
    }
  });

  const timer = setInterval(() => {
    announce();
    const now = Date.now();
    for (const [id, peer] of peers) if (now - peer.lastSeen > EXPIRE_MS) peers.delete(id);
  }, ANNOUNCE_MS);

  function listPeers() {
    return [...peers.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  // Ask every online fish; unreachable fish are reported, not fatal.
  async function searchPeers({ query = '', tags = '', type, limit = 10 } = {}) {
    const params = new URLSearchParams({ q: query, tags, limit: String(limit) });
    if (type) params.set('type', type);
    return Promise.all(listPeers().map(async peer => {
      try {
        const res = await fetch(`http://${peer.address}:${peer.port}/knowledge?${params}`,
          { signal: AbortSignal.timeout(3000) });
        const body = await res.json();
        const results = Array.isArray(body.results) ? body.results : [];
        return { peer, results: results.map(e => ({ ...e, author: e.author ?? peer.name, authorId: body.fish?.id })) };
      } catch (err) {
        return { peer, results: [], error: err.message };
      }
    }));
  }

  // Fetch a single entry (knowledge or conversation) from a specific peer.
  async function getFromPeer(peer, id) {
    try {
      const res = await fetch(`http://${peer.address}:${peer.port}/knowledge/${id}`,
        { signal: AbortSignal.timeout(3000) });
      const body = await res.json();
      return body.entry ?? null;
    } catch {
      return null;
    }
  }

  // Find a peer by name
  function findPeer(name) {
    for (const peer of peers.values()) {
      if (peer.name === name) return peer;
    }
    return undefined;
  }

  function stop() {
    clearInterval(timer);
    try { announce(true); } catch {}
    try { socket.close(); } catch {}
    server.close();
  }

  return { listPeers, searchPeers, getFromPeer, findPeer, announce: () => announce(), stop };
}
