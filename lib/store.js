// Enhanced store: supports both file-based knowledge and shared conversations.
import { randomUUID } from 'node:crypto';
import { hostname } from 'node:os';
import { join } from 'node:path';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync, unlinkSync } from 'node:fs';

const NAME_MAX = 40;

export function normalizeName(value) {
  if (typeof value !== 'string') return undefined;
  const name = value.trim().replace(/\s+/g, ' ');
  return name.length >= 1 && name.length <= NAME_MAX ? name : undefined;
}

// Entry ids are generated as `<ms>-<8 hex>`; reject anything else to block path traversal.
function validId(id) {
  return typeof id === 'string' && /^[0-9]+-[0-9a-f]{8}$/.test(id);
}

function splitTags(tags) {
  if (Array.isArray(tags)) return tags.map(String).map(t => t.trim()).filter(Boolean);
  if (typeof tags !== 'string') return [];
  return tags.split(',').map(t => t.trim()).filter(Boolean);
}

export function createStore(rootDir) {
  const knowledgeDir = join(rootDir, 'knowledge');
  const conversationsDir = join(rootDir, 'conversations');
  const identityFile = join(rootDir, 'identity.json');
  mkdirSync(knowledgeDir, { recursive: true });
  mkdirSync(conversationsDir, { recursive: true });

  function readIdentity() {
    try {
      const data = JSON.parse(readFileSync(identityFile, 'utf8'));
      if (typeof data.id === 'string' && normalizeName(data.name)) return data;
    } catch {}
    const identity = { id: randomUUID(), name: normalizeName(hostname()) ?? 'fish' };
    writeFileSync(identityFile, JSON.stringify(identity, null, 2), 'utf8');
    return identity;
  }

  let identity = readIdentity();

  function rename(value) {
    const name = normalizeName(value);
    if (!name) throw new Error(`Name must be 1-${NAME_MAX} characters`);
    identity = { ...identity, name };
    writeFileSync(identityFile, JSON.stringify(identity, null, 2), 'utf8');
    return identity;
  }

  // Knowledge (file-based)
  function saveKnowledge({ summary, content, tags, sourceFile }) {
    const entry = {
      id: `${Date.now()}-${randomUUID().slice(0, 8)}`,
      type: 'knowledge',
      summary: String(summary).trim(),
      content: String(content),
      tags: splitTags(tags),
      author: identity.name,
      authorId: identity.id,
      createdAt: new Date().toISOString(),
    };
    if (sourceFile && typeof sourceFile.name === 'string' && sourceFile.name) {
      entry.sourceFile = {
        name: sourceFile.name.slice(0, 200),
        size: Number(sourceFile.size) || 0,
        mime: String(sourceFile.mime || ''),
      };
    }
    writeFileSync(join(knowledgeDir, `${entry.id}.json`), JSON.stringify(entry, null, 2), 'utf8');
    return entry;
  }

  // Conversation (session-based)
  function saveConversation({ title, sessionId, messages, tags, isPublic = true }) {
    const entry = {
      id: `${Date.now()}-${randomUUID().slice(0, 8)}`,
      type: 'conversation',
      title: String(title).trim(),
      sessionId: String(sessionId),
      messages: Array.isArray(messages) ? messages : [],
      tags: splitTags(tags),
      author: identity.name,
      authorId: identity.id,
      isPublic: Boolean(isPublic),
      createdAt: new Date().toISOString(),
    };
    writeFileSync(join(conversationsDir, `${entry.id}.json`), JSON.stringify(entry, null, 2), 'utf8');
    return entry;
  }

  function loadAll(includePrivate = false) {
    const entries = [];
    
    // Load knowledge
    for (const file of readdirSync(knowledgeDir)) {
      if (!file.endsWith('.json')) continue;
      try {
        const e = JSON.parse(readFileSync(join(knowledgeDir, file), 'utf8'));
        if (typeof e.summary === 'string' && typeof e.content === 'string') {
          entries.push({
            id: e.id ?? file.slice(0, -5),
            type: 'knowledge',
            summary: e.summary,
            content: e.content,
            tags: splitTags(e.tags),
            author: e.author ?? identity.name,
            authorId: e.authorId ?? identity.id,
            isPublic: true,
            sourceFile: e.sourceFile && typeof e.sourceFile.name === 'string' ? e.sourceFile : undefined,
            createdAt: e.createdAt ?? '',
          });
        }
      } catch {}
    }

    // Load conversations; private ones only for the owner's own panel
    for (const file of readdirSync(conversationsDir)) {
      if (!file.endsWith('.json')) continue;
      try {
        const e = JSON.parse(readFileSync(join(conversationsDir, file), 'utf8'));
        const isPublic = e.isPublic !== false;
        if ((isPublic || includePrivate) && typeof e.title === 'string') {
          entries.push({
            id: e.id ?? file.slice(0, -5),
            type: 'conversation',
            title: e.title,
            sessionId: e.sessionId,
            messageCount: Array.isArray(e.messages) ? e.messages.length : 0,
            tags: splitTags(e.tags),
            author: e.author ?? identity.name,
            authorId: e.authorId ?? identity.id,
            isPublic,
            createdAt: e.createdAt ?? '',
          });
        }
      } catch {}
    }

    return entries.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  }

  function getConversation(id) {
    if (!validId(id)) return null;
    try {
      const data = JSON.parse(readFileSync(join(conversationsDir, `${id}.json`), 'utf8'));
      if (data.isPublic === false) return null; // Private conversation
      return data;
    } catch {
      return null;
    }
  }

  function search({ query = '', tags, type, limit = 10, includePrivate = false } = {}) {
    const wanted = splitTags(tags).map(t => t.toLowerCase());
    const words = String(query).toLowerCase().split(/\s+/).filter(Boolean);
    const scored = [];
    
    for (const e of loadAll(includePrivate)) {
      // Filter by type if specified
      if (type && e.type !== type) continue;

      const entryTags = e.tags.map(t => t.toLowerCase());
      if (wanted.length && !wanted.some(t => entryTags.includes(t))) continue;
      
      let score = words.length ? 0 : 1;
      let missed = false;
      
      for (const w of words) {
        const searchText = e.type === 'knowledge' 
          ? `${e.summary} ${e.content}`.toLowerCase()
          : `${e.title}`.toLowerCase();
        
        const s = (searchText.includes(w) ? 10 : 0)
          + (entryTags.some(t => t.includes(w)) ? 5 : 0);
        
        if (s === 0) missed = true;
        score += s;
      }
      
      if (!missed) scored.push({ e, score });
    }
    
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, Math.max(1, Math.min(limit, 100))).map(s => s.e);
  }

  function remove(id) {
    if (!validId(id)) throw new Error('Invalid id');
    const kPath = join(knowledgeDir, `${id}.json`);
    const cPath = join(conversationsDir, `${id}.json`);
    if (existsSync(kPath)) { unlinkSync(kPath); return; }
    if (existsSync(cPath)) { unlinkSync(cPath); return; }
    throw new Error(`Entry ${id} not found`);
  }

  function setVisibility(id, isPublic) {
    if (!validId(id)) throw new Error('Invalid id');
    const cPath = join(conversationsDir, `${id}.json`);
    if (!existsSync(cPath)) throw new Error(`Conversation ${id} not found`);
    const data = JSON.parse(readFileSync(cPath, 'utf8'));
    data.isPublic = Boolean(isPublic);
    writeFileSync(cPath, JSON.stringify(data, null, 2), 'utf8');
  }

  return {
    identity: () => identity,
    rename,
    saveKnowledge,
    saveConversation,
    getConversation,
    all: loadAll,
    search,
    remove,
    setVisibility,
    splitTags,
  };
}
