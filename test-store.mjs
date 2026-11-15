import { createStore } from './lib/store.js';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const dir = mkdtempSync(join(tmpdir(), 'store-test-'));
const store = createStore(dir);

// 1. identity
const me = store.identity();
console.assert(me.id && me.name, 'identity ok');
console.log('identity:', me.name, me.id.slice(0, 8));

// 2. saveKnowledge
const e = store.saveKnowledge({ summary: 'Test', content: 'Hello world', tags: 'a,b' });
console.assert(e.id && e.type === 'knowledge', 'saveKnowledge ok');
console.log('knowledge id:', e.id, 'col:', e.collectionId.slice(0,8));

// 3. saveConversation  
const c = store.saveConversation({ title: 'Chat', messages: [{ role:'user', text:'hi' }], isPublic: false });
console.assert(c.type === 'conversation', 'saveConversation ok');
console.log('conv id:', c.id, 'public:', c.isPublic);

// 4. collections
const cols = store.listCollections({ includePrivate: true });
console.log('collections:', cols.map(c => `${c.name}(${c.kind}/${c.visibility})`).join(', '));

// 5. search - private conv should be hidden in default search
const pub = store.search({ query: 'Chat', includePrivate: false });
const priv = store.search({ query: 'Chat', includePrivate: true });
console.assert(pub.length === 0 && priv.length === 1, `private filter: pub=${pub.length} priv=${priv.length}`);
console.log('private filter: PASS');

// 6. manifest
const m = store.getManifest({ since: 0 });
console.assert(m.rev > 0 && m.items.length > 0, 'manifest ok');
console.log('manifest: rev=', m.rev, 'items=', m.items.length, 'cols=', m.collections.length);

// 7. getItemContent
const content = store.getItemContent(e.id);
console.assert(content === 'Hello world', 'getItemContent ok');
console.log('content: PASS');

// 8. remove + tombstone
const revBefore = store.getGlobalRev();
store.remove(e.id);
const m2 = store.getManifest({ since: revBefore });
console.assert(m2.removed.length > 0, 'tombstone ok');
console.log('tombstone: removed.length=', m2.removed.length, 'PASS');

// 9. folder collection default private
const folderCol = store.createCollection({ kind: 'folder', name: 'My Folder' });
console.assert(folderCol.visibility === 'private', 'folder default private');
store.updateCollection(folderCol.id, { visibility: 'public' });
console.assert(store.getCollection(folderCol.id).visibility === 'public', 'updateCollection ok');
console.log('folder visibility: PASS');

// 10. upsertFileItem
const fi = store.upsertFileItem({ collectionId: folderCol.id, path: 'docs/test.md', size: 42, hash: 'abc', excerpt: 'test content' });
console.assert(fi.type === 'file' && fi.id.startsWith('f_'), 'upsertFileItem ok');
console.log('fileItem:', fi.id, 'path:', fi.path);

// 11. restart: create new store, check items persisted
const store2 = createStore(dir);
const items2 = store2.search({ includePrivate: true });
console.log('after restart: items=', items2.length, '(expect >=2)');
console.assert(items2.length >= 2, 'persistence ok');

rmSync(dir, { recursive: true });
console.log('\nALL PASS');
