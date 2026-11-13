/**
 * Fish School Plugin - Main Host Entry Point
 */

import { join } from 'node:path';
import { readFileSync, writeFileSync } from 'node:fs';
import { createStore } from './lib/store.js';
import { startNetwork } from './lib/network.js';

export const name = '@local/fish-school';

// The panel's HTTP routes live on the browser carrier, so activation must wait for it:
// without this the plugin can apply before webServer exists and register nothing.
export const inject = ['webServer', 'connection'];

// How long the panel reuses a peer scan before asking the school again.
const PANEL_REMOTE_TTL_MS = 8000;

// The real installed version: package.json is the single source of truth, so the
// panel can never drift from what npm packed (README used to hardcode it).
const PKG = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
const CURRENT_VERSION = String(PKG.version ?? '0.0.0');

// How long a successful "latest release" answer stays fresh.
const UPDATE_TTL_MS = 10 * 60 * 1000;

/** Compare dotted versions numerically; enough for x.y.z tags. */
function isNewer(candidate, current) {
  const a = String(candidate).split('.').map(n => parseInt(n, 10) || 0);
  const b = String(current).split('.').map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
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
      // The rendered blocks ARE what the model reads, so entries must be inlined here.
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
          // Special handling for conversation messages (role + text), not knowledge items
          if (it.role && typeof it.text === 'string') {
            lines.push(`\n[${it.role}] ${it.text.length > 2000 ? `${it.text.slice(0, 2000)}…` : it.text}`);
            continue;
          }
          const title = it.title ?? it.summary ?? '(untitled)';
          const head = [
            it.type ? `[${it.type}]` : '',
            title,
            it.author ? `— ${it.author}` : '',
          ].filter(Boolean).join(' ');
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
    async execute(args, execCtx) {
      try {
        return await execute(args, execCtx);
      } catch (err) {
        return { success: false, error: err.message };
      }
    },
  };
}

/** Extract text content blocks from a ContentBlock array */
function blocksToText(blocks) {
  if (!Array.isArray(blocks)) return '';
  return blocks
    .filter(b => b?.type === 'text' && b.text)
    .map(b => b.text)
    .join('');
}

export function apply(ctx, config = {}) {
  config.port = config.port ?? 37775;
  config.multicastAddress = config.multicastAddress ?? '239.255.37.77';
  config.storageDir = config.storageDir || join(process.env.DSH_PROFILE_DIR || '.', 'fish-school');
  config.autoScan = config.autoScan !== false;
  config.peerAddresses = Array.isArray(config.peerAddresses) ? config.peerAddresses : [];
  config.updateRepo = typeof config.updateRepo === 'string' && config.updateRepo.includes('/')
    ? config.updateRepo
    : 'eahowsong-a11y/dsh-fish-school';

  const logger = ctx.logger('fish-school');
  const store = createStore(config.storageDir);
  const network = startNetwork({ store, config, logger });

  for (const address of config.peerAddresses) {
    network.remember(address, 'manual')
      .catch(err => logger.warn('seed peer %s: %s', address, err.message));
  }

  /**
   * Extract conversation messages from a live session using the official API.
   * Returns simplified {role, text, time} objects safe to serialize.
   */
  function extractMessages(agentId) {
    try {
      const sessions = ctx.get('sessions');
      if (!sessions) return [];
      const session = sessions.get(agentId);
      if (!session) return [];

      // deriveMessages() gives us the canonical message list used by the LLM
      const messages = session.deriveMessages();
      const result = [];

      for (const msg of messages) {
        if (msg.role === 'user') {
          const text = blocksToText(msg.content);
          if (text) result.push({ role: 'user', text });
        } else if (msg.role === 'assistant') {
          const text = blocksToText(msg.content);
          if (text) result.push({ role: 'assistant', text });
        }
      }
      return result;
    } catch (err) {
      logger.warn('extractMessages failed: %s', err.message);
      return [];
    }
  }

  //===== Host API for the panel =====
  const webServer = ctx.get('webServer');
  const connection = ctx.get('connection');
  if (!webServer || !connection) {
    logger.warn('webServer/connection unavailable — panel routes not registered');
  }
  if (webServer && connection) {
    const send = (res, status, body) => {
      res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify(body));
    };

    // Sidebar visibility lives on the host, not in localStorage: the panel and the
    // settings card are two separate React trees, and a browser-local flag would make
    // them disagree after a refresh or on another browser.
    const settingsFile = join(config.storageDir, 'settings.json');
    function readSettings() {
      try {
        const data = JSON.parse(readFileSync(settingsFile, 'utf8'));
        return { sidebarEnabled: data?.sidebarEnabled !== false };
      } catch {
        return { sidebarEnabled: true };
      }
    }
    let settings = readSettings();
    function writeSettings(patch) {
      settings = { ...settings, ...patch };
      writeFileSync(settingsFile, JSON.stringify(settings, null, 2), 'utf8');
      return settings;
    }

    // GET /fish-school/v1/status
    ctx.effect(() => webServer.register({
      kind: 'exact', path: '/fish-school/v1/status',
      async handler(req, res) {
        const rejection = connection.requestRejection({ headers: req.headers });
        if (rejection) return send(res, rejection, { error: 'unauthorized' });
        if (req.method !== 'GET') return send(res, 405, { error: 'method not allowed' });
        try {
          return send(res, 200, {
            me: store.identity(),
            port: config.port,
            storageDir: config.storageDir,
            version: CURRENT_VERSION,
            updateRepo: config.updateRepo,
            knowledgeCount: store.all().length,
            peers: network.listPeers(),
            interfaces: network.interfaces(),
            sidebarEnabled: settings.sidebarEnabled,
          });
        } catch (err) { return send(res, 500, { error: err.message }); }
      },
    }));

    // GET /fish-school/v1/settings, POST to change one key.
    ctx.effect(() => webServer.register({
      kind: 'exact', path: '/fish-school/v1/settings',
      async handler(req, res) {
        const rejection = connection.requestRejection({ headers: req.headers });
        if (rejection) return send(res, rejection, { error: 'unauthorized' });
        if (req.method === 'GET') {
          return send(res, 200, { ...settings, version: CURRENT_VERSION });
        }
        if (req.method !== 'POST') return send(res, 405, { error: 'method not allowed' });
        try {
          let raw = '';
          for await (const chunk of req) { raw += chunk; if (raw.length > 4096) throw new Error('Body too large'); }
          const body = JSON.parse(raw || '{}');
          const patch = {};
          if ('sidebarEnabled' in body) patch.sidebarEnabled = Boolean(body.sidebarEnabled);
          if (!Object.keys(patch).length) throw new Error('No known setting in body');
          return send(res, 200, { ...writeSettings(patch), version: CURRENT_VERSION });
        } catch (err) { return send(res, 400, { error: err.message }); }
      },
    }));

    // GET /fish-school/v1/check-update — current vs latest published release.
    // DSH cannot check for updates on a `file:` dependency, so the panel asks GitHub
    // itself. Failures are reported as data, never as a broken panel.
    let updateCache = { at: 0, data: null };
    async function latestRelease(force) {
      if (!force && updateCache.data && Date.now() - updateCache.at < UPDATE_TTL_MS) {
        return updateCache.data;
      }
      const res = await fetch(`https://api.github.com/repos/${config.updateRepo}/releases/latest`, {
        headers: { accept: 'application/vnd.github+json', 'user-agent': 'dsh-fish-school' },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) throw new Error(`GitHub 返回 ${res.status}`);
      const body = await res.json();
      const asset = (body.assets ?? []).find(a => /\.tgz$/i.test(String(a.name ?? '')));
      const data = {
        latest: String(body.tag_name ?? '').replace(/^v/, ''),
        publishedAt: body.published_at ?? '',
        releaseUrl: body.html_url ?? '',
        assetUrl: asset?.browser_download_url ?? '',
        assetName: asset?.name ?? '',
      };
      updateCache = { at: Date.now(), data };
      return data;
    }

    ctx.effect(() => webServer.register({
      kind: 'exact', path: '/fish-school/v1/check-update',
      async handler(req, res) {
        const rejection = connection.requestRejection({ headers: req.headers });
        if (rejection) return send(res, rejection, { error: 'unauthorized' });
        if (req.method !== 'GET') return send(res, 405, { error: 'method not allowed' });
        const url = new URL(req.url ?? '/', 'http://local');
        const base = { current: CURRENT_VERSION, repo: config.updateRepo };
        try {
          const latest = await latestRelease(url.searchParams.get('refresh') === '1');
          return send(res, 200, {
            ...base,
            ...latest,
            hasUpdate: Boolean(latest.latest) && isNewer(latest.latest, CURRENT_VERSION),
          });
        } catch (err) {
          logger.warn('update check failed: %s', err.message);
          return send(res, 200, { ...base, error: err.message });
        }
      },
    }));

    // The panel is a knowledge browser, so it must show the whole school, not only
    // this machine's entries. Remote lookups are cached for a few seconds: the panel
    // polls every 5 s and probing an offline fish costs up to 3 s of timeout.
    let panelRemoteCache = { at: 0, sets: [] };
    async function remoteEntriesForPanel(params) {
      const cacheable = !params.query;
      if (cacheable && Date.now() - panelRemoteCache.at < PANEL_REMOTE_TTL_MS) {
        return panelRemoteCache.sets;
      }
      try {
        const sets = await network.searchPeers(params);
        if (cacheable) panelRemoteCache = { at: Date.now(), sets };
        return sets;
      } catch (err) {
        logger.warn('panel peer search failed: %s', err.message);
        return [];
      }
    }

    // GET /fish-school/v1/knowledge
    ctx.effect(() => webServer.register({
      kind: 'exact', path: '/fish-school/v1/knowledge',
      async handler(req, res) {
        const rejection = connection.requestRejection({ headers: req.headers });
        if (rejection) return send(res, rejection, { error: 'unauthorized' });
        if (req.method !== 'GET') return send(res, 405, { error: 'method not allowed' });
        try {
          const url = new URL(req.url ?? '/', 'http://local');
          const type = url.searchParams.get('type') ?? undefined;
          const tags = url.searchParams.get('tags') ?? undefined;
          const fishName = url.searchParams.get('fishName') ?? undefined;
          const q = url.searchParams.get('q') ?? '';
          const limit = parseInt(url.searchParams.get('limit') ?? '50', 10);
          // The owner's own panel sees private conversations so they can be re-published.
          const local = store.search({ query: q, tags, type, limit, includePrivate: true })
            .map(e => ({ ...e, remote: false }));
          // Peers only ever serve their public entries, so nothing private leaks here.
          const sets = await remoteEntriesForPanel({ query: q, tags, type, limit });
          const remote = sets.flatMap(set => (set.results ?? []).map(e => ({
            ...e,
            remote: true,
            peerName: set.peer?.name ?? e.author,
            peerAddress: set.peer?.address,
          })));
          // The same id can be reported by several fish; the local copy wins.
          const seen = new Set();
          let entries = [...local, ...remote].filter(e => {
            const key = `${e.type}:${e.id}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
          if (fishName) entries = entries.filter(e => e.author === fishName || e.peerName === fishName);
          entries = entries
            .sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? '')))
            .slice(0, limit);
          return send(res, 200, { entries });
        } catch (err) { return send(res, 500, { error: err.message }); }
      },
    }));

    // POST /fish-school/v1/rename
    ctx.effect(() => webServer.register({
      kind: 'exact', path: '/fish-school/v1/rename',
      async handler(req, res) {
        const rejection = connection.requestRejection({ headers: req.headers });
        if (rejection) return send(res, rejection, { error: 'unauthorized' });
        if (req.method !== 'POST') return send(res, 405, { error: 'method not allowed' });
        try {
          let raw = '';
          for await (const chunk of req) { raw += chunk; if (raw.length > 4096) throw new Error('Body too large'); }
          const identity = store.rename(JSON.parse(raw || '{}').name);
          network.announce();
          return send(res, 200, { me: identity });
        } catch (err) { return send(res, 400, { error: err.message }); }
      },
    }));

    // DELETE /fish-school/v1/knowledge/:id
    ctx.effect(() => webServer.register({
      kind: 'exact', path: '/fish-school/v1/delete',
      async handler(req, res) {
        const rejection = connection.requestRejection({ headers: req.headers });
        if (rejection) return send(res, rejection, { error: 'unauthorized' });
        if (req.method !== 'POST') return send(res, 405, { error: 'method not allowed' });
        try {
          let raw = '';
          for await (const chunk of req) { raw += chunk; }
          const { id } = JSON.parse(raw || '{}');
          if (!id) throw new Error('Missing id');
          store.remove(id);
          return send(res, 200, { ok: true });
        } catch (err) { return send(res, 400, { error: err.message }); }
      },
    }));

    // POST /fish-school/v1/set-visibility
    ctx.effect(() => webServer.register({
      kind: 'exact', path: '/fish-school/v1/set-visibility',
      async handler(req, res) {
        const rejection = connection.requestRejection({ headers: req.headers });
        if (rejection) return send(res, rejection, { error: 'unauthorized' });
        if (req.method !== 'POST') return send(res, 405, { error: 'method not allowed' });
        try {
          let raw = '';
          for await (const chunk of req) { raw += chunk; }
          const { id, isPublic } = JSON.parse(raw || '{}');
          if (!id) throw new Error('Missing id');
          store.setVisibility(id, Boolean(isPublic));
          return send(res, 200, { ok: true });
        } catch (err) { return send(res, 400, { error: err.message }); }
      },
    }));

    // POST /fish-school/v1/upload — publish a local text file as knowledge
    ctx.effect(() => webServer.register({
      kind: 'exact', path: '/fish-school/v1/upload',
      async handler(req, res) {
        const rejection = connection.requestRejection({ headers: req.headers });
        if (rejection) return send(res, rejection, { error: 'unauthorized' });
        if (req.method !== 'POST') return send(res, 405, { error: 'method not allowed' });
        try {
          let raw = '';
          for await (const chunk of req) {
            raw += chunk;
            if (raw.length > 2 * 1024 * 1024) throw new Error('File too large (max 1 MB of text)');
          }
          const body = JSON.parse(raw || '{}');
          const text = typeof body.text === 'string' ? body.text : '';
          if (!text.trim()) throw new Error('File is empty');
          if (text.length > 1024 * 1024) throw new Error('File too large (max 1 MB of text)');
          const name = String(body.name ?? 'uploaded.txt').slice(0, 200);
          const summary = typeof body.summary === 'string' && body.summary.trim() ? body.summary.trim() : name;
          const entry = store.saveKnowledge({
            summary,
            content: text,
            tags: body.tags,
            sourceFile: { name, size: Number(body.size) || text.length, mime: String(body.mime ?? '') },
          });
          return send(res, 200, { entry });
        } catch (err) { return send(res, 400, { error: err.message }); }
      },
    }));

    // POST /fish-school/v1/share-session — publish the current transcript without an LLM round trip
    ctx.effect(() => webServer.register({
      kind: 'exact', path: '/fish-school/v1/share-session',      async handler(req, res) {
        const rejection = connection.requestRejection({ headers: req.headers });
        if (rejection) return send(res, rejection, { error: 'unauthorized' });
        if (req.method !== 'POST') return send(res, 405, { error: 'method not allowed' });
        try {
          let raw = '';
          for await (const chunk of req) {
            raw += chunk;
            if (raw.length > 64 * 1024) throw new Error('Body too large');
          }
          const body = JSON.parse(raw || '{}');
          const sessionId = String(body.sessionId ?? '');
          if (!sessionId) throw new Error('Missing sessionId');
          if (!ctx.get('sessions')?.get(sessionId)) throw new Error('That conversation is not live');
          const messages = extractMessages(sessionId);
          if (!messages.length) throw new Error('Nothing to share yet');
          const title = typeof body.title === 'string' && body.title.trim()
            ? body.title.trim()
            : `Conversation ${new Date().toLocaleString()}`;
          const entry = store.saveConversation({
            title,
            sessionId,
            messages,
            tags: body.tags,
            isPublic: body.isPublic !== false,
          });
          return send(res, 200, {
            entry: { id: entry.id, title: entry.title, messageCount: messages.length, isPublic: entry.isPublic },
          });
        } catch (err) { return send(res, 400, { error: err.message }); }
      },
    }));

    // POST /fish-school/v1/add-peer — remember an address and verify it now
    ctx.effect(() => webServer.register({
      kind: 'exact', path: '/fish-school/v1/add-peer',
      async handler(req, res) {
        const rejection = connection.requestRejection({ headers: req.headers });
        if (rejection) return send(res, rejection, { error: 'unauthorized' });
        if (req.method !== 'POST') return send(res, 405, { error: 'method not allowed' });
        try {
          let raw = '';
          for await (const chunk of req) { raw += chunk; if (raw.length > 4096) throw new Error('Body too large'); }
          const { address } = JSON.parse(raw || '{}');
          const result = await network.remember(address, 'manual');
          if (!result.ok) return send(res, 404, { error: `No fish answered at ${address}` });
          return send(res, 200, result);
        } catch (err) { return send(res, 400, { error: err.message }); }
      },
    }));

    // POST /fish-school/v1/remove-peer
    ctx.effect(() => webServer.register({
      kind: 'exact', path: '/fish-school/v1/remove-peer',
      async handler(req, res) {
        const rejection = connection.requestRejection({ headers: req.headers });
        if (rejection) return send(res, rejection, { error: 'unauthorized' });
        if (req.method !== 'POST') return send(res, 405, { error: 'method not allowed' });
        try {
          let raw = '';
          for await (const chunk of req) { raw += chunk; if (raw.length > 4096) throw new Error('Body too large'); }
          await network.forget(JSON.parse(raw || '{}').address);
          return send(res, 200, { peers: network.listPeers() });
        } catch (err) { return send(res, 400, { error: err.message }); }
      },
    }));

    // POST /fish-school/v1/scan — sweep this host's /24s, no multicast needed
    ctx.effect(() => webServer.register({
      kind: 'exact', path: '/fish-school/v1/scan',
      async handler(req, res) {
        const rejection = connection.requestRejection({ headers: req.headers });
        if (rejection) return send(res, rejection, { error: 'unauthorized' });
        if (req.method !== 'POST') return send(res, 405, { error: 'method not allowed' });
        try {
          const found = await network.scan();
          return send(res, 200, { found, peers: network.listPeers() });
        } catch (err) { return send(res, 500, { error: err.message }); }
      },
    }));
  }

  //===== Agent Tools =====
  const tools = ctx.get('tools');
  if (tools) {
    tools.register(toolDef(
      'fish_school_publish',
      'Publish knowledge (file, snippet, summary) to the fish school network',
      {
        properties: {
          summary: { type: 'string', description: 'Brief summary of the knowledge' },
          content: { type: 'string', description: 'Full content to publish' },
          tags: { type: 'string', description: 'Tags for categorization (comma-separated)' },
        },
        required: ['summary', 'content'],
      },
      async ({ summary, content, tags }) => {
        const entry = store.saveKnowledge({ summary, content, tags });
        return {
          success: true,
          id: entry.id,
          peersCount: network.listPeers().length,
          message: `✅ Published knowledge (ID: ${entry.id}), ${network.listPeers().length} peer(s) will see it`,
        };
      }
    ));

    tools.register(toolDef(
      'fish_school_share_conversation',
      'Share current conversation to the fish school network',
      {
        properties: {
          title: { type: 'string', description: 'Conversation title' },
          tags: { type: 'string', description: 'Tags for categorization (comma-separated)' },
          isPublic: { type: 'boolean', description: 'Whether to make this public (default: true)', default: true },
        },
        required: ['title'],
      },
      async ({ title, tags, isPublic = true }, execCtx) => {
        const agentId = execCtx?.agent?.id;
        if (!agentId) throw new Error('Cannot share: no agent context');

        const messages = extractMessages(agentId);
        const entry = store.saveConversation({
          title,
          sessionId: agentId,
          messages,
          tags,
          isPublic,
        });

        return {
          success: true,
          id: entry.id,
          isPublic: entry.isPublic,
          messageCount: messages.length,
          peersCount: network.listPeers().length,
          message: `✅ Shared "${title}" (${messages.length} messages, ID: ${entry.id})`,
        };
      }
    ));

    tools.register(toolDef(
      'fish_school_query',
      'Query knowledge from the network using keywords, tags, or filter by specific fish or type',
      {
        properties: {
          query: { type: 'string', description: 'Search keywords' },
          tags: { type: 'string', description: 'Filter by tags (comma-separated)' },
          type: { type: 'string', description: 'Filter by type: knowledge or conversation' },
          fishName: { type: 'string', description: 'Filter by fish name (author)' },
          limit: { type: 'number', description: 'Maximum number of results', default: 10 },
        },
        required: ['query'],
      },
      async ({ query, tags, type, fishName, limit = 10 }) => {
        const local = store.search({ query, tags, type, limit });
        const remoteSet = await network.searchPeers({ query, tags, type, limit });
        const remote = remoteSet.flatMap(r => r.results);
        let combined = [...local, ...remote];
        if (fishName) combined = combined.filter(e => e.author === fishName);
        combined = combined.slice(0, limit);
        return { success: true, results: combined, count: combined.length };
      }
    ));

    tools.register(toolDef(
      'fish_school_list',
      'List recent entries from the network, optionally filtered',
      {
        properties: {
          limit: { type: 'number', description: 'Maximum number of entries', default: 20 },
          tags: { type: 'string', description: 'Filter by tags (comma-separated)' },
          type: { type: 'string', description: 'Filter by type: knowledge or conversation' },
          fishName: { type: 'string', description: 'Filter by fish name (author)' },
        },
      },
      async ({ limit = 20, tags, type, fishName }) => {
        const local = store.search({ tags, type, limit });
        const remoteSet = await network.searchPeers({ tags, type, limit });
        const remote = remoteSet.flatMap(r => r.results);
        let entries = [...local, ...remote];
        if (fishName) entries = entries.filter(e => e.author === fishName);
        entries = entries.slice(0, limit);
        return {
          success: true,
          entries: entries.map(e => ({
            id: e.id,
            type: e.type,
            summary: e.type === 'knowledge' ? e.summary : e.title,
            title: e.type === 'knowledge' ? e.summary : e.title,
            tags: e.tags ?? [],
            author: e.author ?? 'unknown',
          })),
          count: entries.length,
          message: `📚 ${entries.length} entr${entries.length === 1 ? 'y' : 'ies'} — ${local.length} local, ${remote.length} from peers`,
        };
      }
    ));

    tools.register(toolDef(
      'fish_school_get_conversation',
      'Retrieve a shared conversation with its full context',
      {
        properties: {
          conversationId: { type: 'string', description: 'Conversation ID to retrieve' },
          fishName: { type: 'string', description: 'Fish name (author) — omit for local, provide to fetch from a specific peer' },
        },
        required: ['conversationId'],
      },
      async ({ conversationId, fishName }) => {
        // Try local first
        if (!fishName || fishName === store.identity().name) {
          const conv = store.getConversation(conversationId);
          if (conv) {
            return {
              success: true,
              title: conv.title,
              author: conv.author,
              tags: conv.tags,
              messageCount: conv.messages?.length || 0,
              messages: conv.messages,
              createdAt: conv.createdAt,
              message: `📖 "${conv.title}" (${conv.messages?.length || 0} messages from ${conv.author})`,
            };
          }
        }

        // Ask the named peer first, then the rest: the name may be stale after a rename.
        for (const peer of network.peersFor(fishName)) {
          const entry = await network.getFromPeer(peer, conversationId);
          if (entry) {
            return {
              success: true,
              title: entry.title,
              author: entry.author ?? peer.name,
              tags: entry.tags,
              messageCount: entry.messages?.length || entry.messageCount || 0,
              messages: entry.messages,
              createdAt: entry.createdAt,
              message: `📖 "${entry.title}" (from ${entry.author ?? peer.name})`,
            };
          }
        }

        throw new Error('Conversation not found or not public');
      }
    ));

    tools.register(toolDef(
      'fish_school_find_knowledge',
      'Find knowledge or conversation by fish name or ID',
      {
        properties: {
          fishName: { type: 'string', description: 'Fish name to search' },
          type: { type: 'string', description: 'Filter by type: knowledge or conversation' },
          limit: { type: 'number', description: 'Maximum results', default: 10 },
        },
      },
      async ({ fishName, type, limit = 10 }) => {
        let results = store.all().filter(e => {
          if (fishName && e.author !== fishName) return false;
          if (type && e.type !== type) return false;
          return true;
        }).slice(0, limit);
        return {
          success: true,
          results,
          count: results.length,
          message: `🔍 Found ${results.length} item(s)`,
        };
      }
    ));
    tools.register(toolDef(
      'fish_school_read',
      'Load the full content behind fish-school reference tokens, so you can use another fish\'s knowledge or conversation as context',
      {
        properties: {
          refs: { type: 'string', description: 'Reference tokens or ids separated by spaces or commas, e.g. "@alice/knowledge/1794-1a2b3c4d"' },
          fishName: { type: 'string', description: 'Optional fish name to ask when a token carries no author' },
        },
        required: ['refs'],
      },
      async ({ refs, fishName }) => {
        const tokens = String(refs).split(/[\s,]+/).map(s => s.trim()).filter(Boolean).slice(0, 10);
        const mine = store.identity();
        const results = [];

        for (const token of tokens) {
          const parts = token.replace(/^@/, '').split('/').filter(Boolean);
          const id = parts[parts.length - 1] ?? '';
          const owner = parts.length >= 3 ? parts[0] : fishName;

          if (!/^[0-9]+-[0-9a-f]{8}$/.test(id)) {
            results.push({ ref: token, ok: false, error: 'Not a valid fish-school reference' });
            continue;
          }

          let entry = null;
          let source = mine.name;

          if (!owner || owner === mine.name) {
            entry = store.all().find(e => e.id === id) ?? null;
            if (entry?.type === 'conversation') entry = store.getConversation(id) ?? entry;
          }

          if (!entry) {
            for (const peer of network.peersFor(owner)) {
              const found = await network.getFromPeer(peer, id);
              if (found) { entry = found; source = peer.name; break; }
            }
          }

          if (!entry) {
            results.push({ ref: token, ok: false, error: 'Not found, or not shared publicly' });
            continue;
          }

          if (entry.type === 'conversation' || Array.isArray(entry.messages)) {
            const all = Array.isArray(entry.messages) ? entry.messages : [];
            const content = all.slice(-60)
              .map(m => `[${m.role}] ${String(m.text ?? '')}`)
              .join('\n');
            results.push({
              ref: token, ok: true, type: 'conversation',
              id: entry.id, title: entry.title ?? '(conversation)',
              author: entry.author ?? source, messageCount: all.length,
              tags: entry.tags ?? [],
              content: content.slice(0, 12000),
            });
          } else {
            results.push({
              ref: token, ok: true, type: 'knowledge',
              id: entry.id, title: entry.summary ?? '(knowledge)',
              author: entry.author ?? source,
              tags: entry.tags ?? [],
              content: String(entry.content ?? '').slice(0, 12000),
            });
          }
        }

        const okCount = results.filter(r => r.ok).length;
        return {
          success: okCount > 0,
          results,
          count: results.length,
          message: `📖 Loaded ${okCount}/${results.length} reference(s)`,
        };
      }
    ));

    tools.register(toolDef(
      'fish_school_peers',
      'List the fish currently reachable on this LAN, with their addresses',
      { properties: {} },
      async () => {
        const peers = network.listPeers();
        return {
          success: true,
          peers,
          count: peers.length,
          message: peers.length
            ? peers.map(p => `🐟 ${p.name} — ${p.address}:${p.port}${p.online === false ? ' (offline)' : ''}`).join('\n')
            : 'No fish reachable yet.',
        };
      }
    ));
  }

  //===== Prompt guidance for reference tokens =====
  const systemPrompt = ctx.get('systemPrompt');
  if (systemPrompt) {
    ctx.effect(() => systemPrompt.section({
      name: 'fish-school',
      order: 90,
      text: [
        '# Fish school references',
        'Knowledge is shared across DeepSeek Harness instances on this LAN.',
        'A user message may contain reference tokens of the form `@<fish>/knowledge/<id>` or `@<fish>/conversation/<id>`.',
        'When you see one, call `fish_school_read` with those tokens before answering, and never ask the user to paste the content.',
        '`fish_school_query` and `fish_school_list` search the whole school, or one fish with `fishName`.',
      ].join('\n'),
    }));
  }

  //===== Skill =====
  const skills = ctx.get('skills');
  if (skills) {
    const { id, name: fishName } = store.identity();
    const peersCount = network.listPeers().length;
    skills.register({
      name: 'fish-school-knowledge',
      description: 'Query and retrieve knowledge from the fish school network',
      whenToUse: 'Use when you need shared knowledge from other team members or DSH instances on the same local network',
      content: `# Fish School Knowledge Network

This fish ("${fishName}", ID ${id}) is connected to ${peersCount} peer(s).

## Available Tools

- **fish_school_query**(query, tags?, type?, fishName?, limit?): Search across the network
- **fish_school_list**(limit?, tags?, type?, fishName?): List recent entries from every fish
- **fish_school_read**(refs, fishName?): Load the content behind '@fish/knowledge/id' or '@fish/conversation/id' tokens
- **fish_school_publish**(summary, content, tags?): Share a knowledge file
- **fish_school_share_conversation**(title, tags?, isPublic?): Share this conversation
- **fish_school_get_conversation**(conversationId, fishName?): Load a shared conversation's full messages
- **fish_school_find_knowledge**(fishName?, type?, limit?): Browse by author

## Reference Examples

A user message may carry a reference token; load it with fish_school_read:
- fish_school_read(refs="@colleague-fish/knowledge/1794-1a2b3c4d")
- fish_school_read(refs="@colleague-fish/conversation/1794-1a2b3c4d, @other-fish/knowledge/1794-5e6f7a8b")
- fish_school_query(query="login tests", fishName="colleague-fish")
- fish_school_list(type="conversation", limit=5)

Storage: ${config.storageDir}
`,
      invocation: { modelInvocable: true, userInvocable: true },
      provider: 'fish-school',
    });
  }

  ctx.effect(() => () => {
    logger.info('Fish School stopping...');
    network.stop();
  });

  logger.info('Fish School started: %s, port %d', store.identity().name, config.port);
}
