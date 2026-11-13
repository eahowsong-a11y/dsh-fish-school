// lib/project-sync.js — sync DSH sessions into a fish-school project collection.
//
// A "project" collection points at a workspace root directory. Any DSH session
// whose `cwd` starts with that root is automatically imported as a conversation
// item. Sessions that grow while DSH is running get re-imported on the next poll
// and update their messageCount and content.
//
// Session file format: multi-frame zstd JSONL, one JSON object per line.
//   Line 1: { type:'session', id, createdAt, cwd, agentPreset, ... }  (meta)
//   Later:  { type:'user/message',      data:{ content:[{type:'text',text}] } }
//           { type:'assistant/message', data:{ message:{ content:[{type:'text',text}] } } }
//           { type:'session/title',     data:{ title } }
//   Other types are skipped.
//
// Messages are extracted from every turn, skipping system messages and tool
// calls so the conversation body stays concise and readable.

import { listSessions, readSession } from './session-reader.js';
import { join } from 'node:path';
import { homedir } from 'node:os';

const DEFAULT_SESSIONS_ROOT = join(homedir(), '.dsh', 'sessions');
const DEFAULT_POLL_MS = 60_000;   // 60-second steady-state poll
const INITIAL_SCAN_MS = 5_000;    // 5-second initial delay (let plugin fully start)
const MAX_MESSAGES = 2000;        // cap per conversation

/** Extract clean { role, text } messages from a session's turns. */
function extractTurns(turns) {
  const messages = [];
  for (const t of turns) {
    try {
      if (t.type === 'user/message') {
        const blocks = t.data?.content;
        if (!Array.isArray(blocks)) continue;
        const text = blocks.filter(b => b.type === 'text').map(b => b.text ?? '').join('').trim();
        if (text) messages.push({ role: 'user', text });
      } else if (t.type === 'assistant/message') {
        const blocks = t.data?.message?.content;
        if (!Array.isArray(blocks)) continue;
        const text = blocks.filter(b => b.type === 'text').map(b => b.text ?? '').join('').trim();
        if (text) messages.push({ role: 'assistant', text });
      }
    } catch { /* skip bad turns */ }
  }
  return messages.slice(-MAX_MESSAGES);
}

/** Pick the last session/title value from turns, or fall back to meta.cwd. */
function extractTitle(turns, meta) {
  let title = '';
  for (const t of turns) {
    if (t.type === 'session/title' && t.data?.title) title = t.data.title;
  }
  return title || `会话 ${new Date(meta.createdAt ?? Date.now()).toLocaleString()}`;
}

/**
 * Create a project-sync manager.
 * @param {object} opts
 * @param {string} opts.collectionId  - which collection to sync into
 * @param {string} opts.root          - workspace root (sessions with cwd ⊇ root get imported)
 * @param {object} opts.store         - fish-school store instance
 * @param {string} [opts.sessionsRoot] - override ~/.dsh/sessions
 * @param {number} [opts.pollMs]      - poll interval in ms
 * @param {function} [opts.onChange]  - ({ state, done, total, failed }) => void
 * @param {object} [opts.logger]      - { info, warn }
 */
export function createProjectSync({ collectionId, root, store, sessionsRoot, pollMs, onChange, logger }) {
  if (!collectionId || !root || !store) throw new Error('collectionId, root, store are required');

  const sessions_root = sessionsRoot ?? DEFAULT_SESSIONS_ROOT;
  const interval = pollMs ?? DEFAULT_POLL_MS;
  const log = logger ?? { info: () => {}, warn: () => {} };

  let status = { state: 'idle', done: 0, total: 0, failed: 0, lastSyncAt: null, error: null, overLimit: false };
  let timer = null;
  let running = false;

  function emit(patch) {
    status = { ...status, ...patch };
    try { onChange?.(status); } catch {}
  }

  async function syncOnce() {
    if (running) return;
    running = true;
    emit({ state: 'scanning', error: null });
    try {
      const found = await listSessions(sessions_root, root);
      emit({ state: 'importing', total: found.length, done: 0, failed: 0 });
      let done = 0, failed = 0;
      for (const session of found) {
        try {
          const { meta, turns } = await readSession(session.filePath);
          const messages = extractTurns(turns);
          const title = extractTitle(turns, meta);
          store.upsertSessionItem({
            collectionId, sessionId: session.sessionId, title, messages,
            cwd: session.cwd ?? meta.cwd ?? root,
            createdAt: session.createdAt ? new Date(session.createdAt).toISOString() : undefined,
          });
          done++;
        } catch (err) {
          log.warn('project-sync: session %s failed: %s', session.sessionId, err.message);
          failed++;
        }
        if ((done + failed) % 10 === 0) emit({ done, failed });
      }
      store.recomputeStats(collectionId);
      emit({ state: 'idle', done, failed, total: found.length, lastSyncAt: new Date().toISOString() });
      log.info('project-sync: synced %d sessions (%d failed) for %s', done, failed, collectionId);
    } catch (err) {
      log.warn('project-sync: scan failed: %s', err.message);
      emit({ state: 'error', error: err.message });
    } finally { running = false; }
  }

  return {
    start() {
      clearTimeout(timer);
      // Initial scan after a short delay
      timer = setTimeout(() => {
        syncOnce();
        timer = setInterval(() => syncOnce(), interval);
      }, INITIAL_SCAN_MS);
    },
    stop() { clearInterval(timer); clearTimeout(timer); timer = null; },
    syncNow: syncOnce,
    getStatus: () => ({ ...status }),
  };
}
