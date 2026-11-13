// Client-side test for the sidebar entry gate.
// Loads client.js the way DSH's module loader does, hands it a fake `slots` service
// that records registrations and returns real disposers, then checks that the sidebar
// row can be retracted and mounted again at runtime — the thing that makes the switch
// work without a page reload.
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('./client.js', import.meta.url), 'utf8');

// --- fake React: enough for module init, no rendering happens here ---
const react = {
  createElement: (type, props, ...children) => ({ type, props, children }),
  useState: (initial) => [typeof initial === 'function' ? initial() : initial, () => {}],
  useEffect: () => {},
  useCallback: (fn) => fn,
  useRef: (v) => ({ current: v }),
  Fragment: 'fragment',
};

// --- capture the factory the way window.__ModuleLoader__.load would ---
let factory = null;
globalThis.window = {
  __ModuleLoader__: {
    load({ id, factory: f }) { factory = { id, f }; },
  },
};
new Function('window', source)(globalThis.window);
if (!factory) throw new Error('client.js did not register with __ModuleLoader__');

const plugin = factory.f((name) => {
  if (name === 'react') return react;
  throw new Error(`unexpected require(${name})`);
});

const checks = [];
const ok = (name, cond, detail = '') => {
  checks.push({ name, ok: !!cond });
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
};

// --- fake host services ---
const registered = new Map();   // "slot:id|key" -> { def, render, disposed }
let seq = 0;
const slots = {
  inject(name, cb) { cb(); return () => {}; },
  register(def, render) {
    const key = `${def.name}:${def.id ?? def.key}`;
    const token = `reg-${++seq}`;
    registered.set(key, { def, render, disposed: false, token });
    return () => { const cur = registered.get(key); if (cur?.token === token) cur.disposed = true; };
  },
};
const calls = [];
const settingsStore = { sidebarEnabled: true };
const locale = {
  register: () => {},
  bind: () => (key) => key,
};
let layoutSelection = 'fish-school';
const layout = {
  panelInfo: { getSnapshot: () => ({ activePanelId: layoutSelection }) },
  selectPanel: (id) => { calls.push(['selectPanel', id]); layoutSelection = id; },
};
const pending = [];
globalThis.fetch = async (path, init = {}) => {
  const method = init.method ?? 'GET';
  if (path === '/fish-school/v1/settings' && method === 'GET') {
    return { ok: true, json: async () => ({ sidebarEnabled: settingsStore.sidebarEnabled }) };
  }
  if (path === '/fish-school/v1/settings' && method === 'POST') {
    const body = JSON.parse(init.body);
    settingsStore.sidebarEnabled = body.sidebarEnabled !== false;
    pending.push(['post', body]);
    return { ok: true, json: async () => ({ sidebarEnabled: settingsStore.sidebarEnabled }) };
  }
  if (path === '/fish-school/v1/status') {
    return { ok: true, json: async () => ({ version: '1.7.0', updateRepo: 'o/r', sidebarEnabled: settingsStore.sidebarEnabled }) };
  }
  if (String(path).startsWith('/fish-school/v1/check-update')) {
    return { ok: true, json: async () => ({ current: '1.7.0', latest: '1.7.0', hasUpdate: false }) };
  }
  return { ok: false, status: 404, json: async () => ({ error: 'nope' }) };
};

const ctx = {
  slots, locale, inject: (names, cb) => { if (names.includes('layout')) cb({ layout }); },
};
plugin.apply(ctx);

const ROW = 'sidebar.panellist:fish-school';
const PANEL = 'main:fish-school';

await new Promise(r => setTimeout(r, 50));   // let loadSettings() settle

ok('sidebar row is mounted by default', registered.has(ROW) && !registered.get(ROW).disposed);
ok('sidebar panel is mounted with it', registered.has(PANEL) && !registered.get(PANEL).disposed);
ok('a settings section is registered', [...registered.keys()].some(k => k.startsWith('settings.section:')));

// The settings card is the only place the switch lives; drive it through the
// registered render function so the test does not reach into apply()'s closure.
const sectionKey = [...registered.keys()].find(k => k.startsWith('settings.section:'));
// The settings section render returns an element for SettingsSection; call it to get
// the SettingsCard element, then call that to inspect what the card actually draws.
const sectionEl = registered.get(sectionKey).render();
ok('settings card renders without a host', Boolean(sectionEl));
const cardEl = sectionEl.type(sectionEl.props);
ok('card receives the live sidebar snapshot', cardEl?.props?.sidebar?.enabled === true,
  JSON.stringify(cardEl?.props?.sidebar));

// Walk element trees without invoking component types: only real button hosts.
function collectButtons(node, out = []) {
  if (!node || typeof node !== 'object') return out;
  if (Array.isArray(node)) { for (const n of node) collectButtons(n, out); return out; }
  if (node.type === 'button' && typeof node.props?.onClick === 'function') out.push(node);
  for (const child of node.children ?? []) collectButtons(child, out);
  return out;
}
const buttons = collectButtons(cardEl.type(cardEl.props));
ok('settings card exposes the two switch buttons', buttons.length === 2, `buttons=${buttons.length}`);

// Drive the real handlers: hide, then show again.
buttons[0].props.onClick();
await new Promise(r => setTimeout(r, 50));

ok('hiding retracts the sidebar row', !registered.has(ROW) || registered.get(ROW).disposed);
ok('hiding retracts the panel too', !registered.has(PANEL) || registered.get(PANEL).disposed);
ok('hiding deselects the open fish panel', calls.some(c => c[0] === 'selectPanel' && c[1] === null),
  JSON.stringify(calls));
ok('hiding is saved to the host', settingsStore.sidebarEnabled === false);

const showBtn = buttons[1];
showBtn.props.onClick();
await new Promise(r => setTimeout(r, 50));

const row = registered.get(ROW);
ok('showing mounts the row again', Boolean(row) && !row.disposed);
ok('the re-mounted row carries the same id', row?.def.id === 'fish-school');
ok('showing is saved to the host', settingsStore.sidebarEnabled === true);

// A fresh apply() with the stored value must not mount a hidden entry.
settingsStore.sidebarEnabled = false;
let factory2 = null;
globalThis.window.__ModuleLoader__.load = ({ factory: f }) => { factory2 = f; };
new Function('window', source)(globalThis.window);
const plugin2 = factory2((name) => {
  if (name === 'react') return react;
  throw new Error(`unexpected require(${name})`);
});
registered.clear();
plugin2.apply(ctx);
await new Promise(r => setTimeout(r, 50));
ok('a refresh with the entry hidden never mounts it', !registered.has(ROW), [...registered.keys()].join(','));

const failed = checks.filter(c => !c.ok);
console.log(`\n${checks.length - failed.length}/${checks.length} passed`);
process.exit(failed.length ? 1 : 0);
