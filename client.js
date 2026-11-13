// Fish School client: sidebar icon + main panel (my fish, knowledge library, peers).
window.__ModuleLoader__.load({
  id: '@local/fish-school',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const { useState, useEffect, useCallback } = React;
    const NS = 'fish-school';
    const API = '/fish-school/v1';

    const DICTS = {
      en: {
        title: 'Fish school', subtitle: 'Share knowledge across DeepSeek Harness instances on this network',
        me: 'My fish', you: 'You', peers: 'Fish in the school', noPeers: 'No other fish found yet. Enable Fish school on other machines on the same network.',
        rename: 'Rename', save: 'Save', cancel: 'Cancel', saving: 'Saving…', nameHint: '1–40 characters',
        knowledge: 'Knowledge library', noKnowledge: 'Nothing published yet.',
        tabAll: 'All', tabFiles: 'Files', tabConv: 'Conversations',
        port: 'Port', entries: 'Entries', online: 'Online',
        delete: 'Delete', makePublic: 'Make public', makePrivate: 'Make private', private: 'Private',
        loading: 'Loading…', loadFailed: 'Cannot reach Fish school: {e}',
        refHint: 'Reference: ',
        ref: 'Reference a fish or its knowledge', refAll: 'All fish', refMine: 'Mine',
        refEmpty: 'No shared knowledge to reference yet',
        refHint2: 'Click an entry to insert a reference into your message',
        refInserted: 'Added {ref}', refFailed: 'Could not insert — click into the message box first',
        refDone: 'Done',
      },
      zh: {
        title: '鱼群', subtitle: '在局域网内的 DeepSeek Harness 实例间共享知识',
        me: '我的鱼', you: '我', peers: '鱼群成员', noPeers: '还没有发现其他鱼。在同一局域网的其他机器上启用鱼群插件后会出现在这里。',
        rename: '改名', save: '保存', cancel: '取消', saving: '保存中…', nameHint: '1–40 个字符',
        knowledge: '知识库', noKnowledge: '还没有发布任何知识。',
        tabAll: '全部', tabFiles: '文件', tabConv: '对话',
        port: '端口', entries: '条目', online: '在线',
        delete: '删除', makePublic: '公开', makePrivate: '设为私有', private: '私有',
        loading: '加载中…', loadFailed: '无法连接鱼群服务：{e}',
        refHint: '引用：',
        ref: '引用某条鱼及其知识', refAll: '全部鱼', refMine: '我的',
        refEmpty: '还没有可引用的知识',
        refHint2: '点击条目，把引用插入你的消息',
        refInserted: '已插入 {ref}', refFailed: '插入失败：请先在输入框里点一下光标位置',
        refDone: '完成',
      },
    };

    const S = {
      page: { height: '100%', overflow: 'auto', padding: '28px 32px', boxSizing: 'border-box',
        color: 'var(--dsw-alias-label-primary)', background: 'var(--dsw-alias-bg-base)' },
      card: { background: 'var(--dsw-alias-bg-layer-1)', border: '1px solid var(--dsw-alias-border-l1)',
        borderRadius: 10, padding: 16, marginBottom: 16 },
      h2: { fontSize: 14, fontWeight: 600, margin: '0 0 12px' },
      muted: { color: 'var(--dsw-alias-label-secondary)', fontSize: 12 },
      btn: { padding: '5px 12px', fontSize: 13, borderRadius: 6, cursor: 'pointer',
        border: '1px solid var(--dsw-alias-border-l2)', background: 'transparent', color: 'var(--dsw-alias-label-primary)' },
      btnSmall: { padding: '3px 8px', fontSize: 11, borderRadius: 4, cursor: 'pointer',
        border: '1px solid var(--dsw-alias-border-l2)', background: 'transparent', color: 'var(--dsw-alias-label-secondary)' },
      btnDanger: { padding: '3px 8px', fontSize: 11, borderRadius: 4, cursor: 'pointer',
        border: '1px solid var(--dsw-alias-state-error-primary)', background: 'transparent', color: 'var(--dsw-alias-state-error-primary)' },
      input: { flex: 1, minWidth: 0, padding: '6px 10px', fontSize: 14, borderRadius: 6,
        border: '1px solid var(--dsw-alias-border-l2)', background: 'var(--dsw-alias-bg-layer-2)',
        color: 'var(--dsw-alias-label-primary)' },
      tag: { fontSize: 11, padding: '1px 6px', borderRadius: 4, marginRight: 4,
        background: 'var(--dsw-alias-bg-layer-2)', color: 'var(--dsw-alias-label-secondary)' },
    };

    async function api(path, init) {
      const res = await fetch(API + path, { credentials: 'same-origin', ...init });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
      return body;
    }

    function useSchool() {
      const [state, setState] = useState({ status: null, entries: [], error: null });
      const refresh = useCallback(async () => {
        try {
          const [status, knowledge] = await Promise.all([api('/status'), api('/knowledge')]);
          setState({ status, entries: knowledge.entries || [], error: null });
        } catch (err) {
          setState(prev => ({ ...prev, error: err.message }));
        }
      }, []);
      useEffect(() => {
        refresh();
        const id = setInterval(refresh, 5000);
        return () => clearInterval(id);
      }, [refresh]);
      return [state, refresh, setState];
    }

    // Copy to clipboard with fallback
    function copyText(text) {
      try { navigator.clipboard.writeText(text); } catch {
        const ta = document.createElement('textarea');
        ta.value = text; document.body.appendChild(ta); ta.select();
        document.execCommand('copy'); document.body.removeChild(ta);
      }
    }

    function EntryCard({ e, myId, t, onDelete, onToggleVisibility }) {
      const [expanded, setExpanded] = useState(false);
      const isConv = e.type === 'conversation';
      const isMine = e.authorId === myId;
      const ref = `@${e.author}/${e.type}/${e.id}`;

      return h('div', {
        style: { padding: '10px 12px', background: 'var(--dsw-alias-bg-layer-2)', borderRadius: 8, marginBottom: 8 },
      },
        h('div', { style: { display: 'flex', alignItems: 'flex-start', gap: 8 } },
          h('span', { style: { fontSize: 16, flexShrink: 0, marginTop: 1 } }, isConv ? '💬' : '📄'),
          h('div', { style: { flex: 1, minWidth: 0 } },
            h('div', {
              style: { fontWeight: 600, fontSize: 13, cursor: 'pointer', marginBottom: 3 },
              onClick: () => setExpanded(!expanded),
            }, isConv ? e.title : e.summary),
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' } },
              e.tags?.map(tag => h('span', { key: tag, style: S.tag }, tag)),
              !e.isPublic && h('span', { style: { ...S.tag, color: 'var(--dsw-alias-state-warn-primary)' } }, t('private'))
            ),
            h('div', { style: { fontSize: 11, ...S.muted, marginTop: 4 } },
              `${e.author} · `,
              isConv ? `${e.messageCount} msgs` : '',
              expanded && h('div', {
                style: { marginTop: 8, fontSize: 11, fontFamily: 'monospace',
                  padding: '4px 8px', borderRadius: 4, background: 'var(--dsw-alias-bg-base)',
                  display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' },
                onClick: () => copyText(ref),
                title: 'Click to copy reference',
              }, t('refHint'), h('code', null, ref), ' 📋')
            )
          ),
          isMine && h('div', { style: { display: 'flex', gap: 4, flexShrink: 0 } },
            isConv && h('button', {
              style: S.btnSmall,
              onClick: () => onToggleVisibility(e.id, !e.isPublic),
              title: e.isPublic ? t('makePrivate') : t('makePublic'),
            }, e.isPublic ? '🔒' : '🔓'),
            h('button', {
              style: S.btnDanger,
              onClick: () => onDelete(e.id),
              title: t('delete'),
            }, '🗑')
          )
        )
      );
    }

    function Panel({ t }) {
      const [{ status, entries, error }, refresh, setState] = useSchool();
      const [edit, setEdit] = useState(false);
      const [draft, setDraft] = useState('');
      const [saving, setSaving] = useState(false);
      const [tab, setTab] = useState('all');

      const rename = useCallback(async () => {
        setSaving(true);
        try {
          const { me } = await api('/rename', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: draft.trim() }),
          });
          setState(prev => prev.status ? { ...prev, status: { ...prev.status, me } } : prev);
          setEdit(false);
        } catch (err) {
          alert(t('loadFailed', { e: err.message }));
        } finally { setSaving(false); }
      }, [draft, setState, t]);

      const handleDelete = useCallback(async (id) => {
        if (!confirm(t('delete') + '?')) return;
        try {
          await api('/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
          setState(prev => ({ ...prev, entries: prev.entries.filter(e => e.id !== id) }));
        } catch (err) { alert(err.message); }
      }, [setState, t]);

      const handleToggleVisibility = useCallback(async (id, isPublic) => {
        try {
          await api('/set-visibility', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, isPublic }) });
          setState(prev => ({ ...prev, entries: prev.entries.map(e => e.id === id ? { ...e, isPublic } : e) }));
        } catch (err) { alert(err.message); }
      }, [setState]);

      useEffect(() => { if (status?.me) setDraft(status.me.name); }, [status]);

      if (!status) return h('div', { style: S.page }, error ? t('loadFailed', { e: error }) : t('loading'));

      const myId = status.me.id;
      const filtered = tab === 'all' ? entries : entries.filter(e => e.type === (tab === 'files' ? 'knowledge' : 'conversation'));

      return h('div', { style: S.page },
        // Header
        h('div', { style: { marginBottom: 24 } },
          h('h1', { style: { fontSize: 22, fontWeight: 600, margin: '0 0 4px' } }, '🐟 ', t('title')),
          h('div', { style: { fontSize: 13, ...S.muted } }, t('subtitle'))
        ),

        // My fish card
        h('div', { style: S.card },
          h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 } },
            h('h2', { style: S.h2 }, t('me')),
            !edit && h('button', { style: S.btn, onClick: () => setEdit(true) }, t('rename'))
          ),
          edit
            ? h('div', { style: { display: 'flex', gap: 6 } },
                h('input', {
                  style: S.input, value: draft, disabled: saving, autoFocus: true,
                  placeholder: t('nameHint'),
                  onChange: e => setDraft(e.target.value),
                  onKeyDown: e => { if (e.key === 'Enter') rename(); if (e.key === 'Escape') setEdit(false); },
                }),
                h('button', { style: { ...S.btn, background: 'var(--dsw-alias-brand-primary)', color: '#fff', border: 'none' },
                  disabled: saving || !draft.trim(), onClick: rename }, saving ? t('saving') : t('save')),
                h('button', { style: S.btn, disabled: saving, onClick: () => setEdit(false) }, t('cancel'))
              )
            : h('div', { style: { display: 'flex', alignItems: 'center', gap: 12 } },
                h('div', { style: { width: 40, height: 40, borderRadius: '50%', background: 'var(--dsw-alias-brand-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 } }, '🐟'),
                h('div', null,
                  h('div', { style: { fontWeight: 600, marginBottom: 2 } }, status.me.name, ' ', h('span', { style: S.muted }, '(', t('you'), ')')),
                  h('div', { style: { fontSize: 11, ...S.muted } }, status.me.id.slice(0, 13), '…'),
                  status.interfaces?.length
                    ? h('div', { style: { fontSize: 10.5, ...S.muted, marginTop: 2 } },
                        'LAN: ', status.interfaces.join(', '))
                    : h('div', { style: { fontSize: 10.5, color: 'var(--dsw-alias-state-warn-primary)', marginTop: 2 } },
                        'LAN: 未加入组播')
                )
              ),
          h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 } },
            h('div', { style: { padding: 10, background: 'var(--dsw-alias-bg-layer-2)', borderRadius: 8 } },
              h('div', { style: { fontSize: 10, textTransform: 'uppercase', marginBottom: 4, ...S.muted } }, t('entries')),
              h('div', { style: { fontSize: 18, fontWeight: 600 } }, status.knowledgeCount)
            ),
            h('div', { style: { padding: 10, background: 'var(--dsw-alias-bg-layer-2)', borderRadius: 8 } },
              h('div', { style: { fontSize: 10, textTransform: 'uppercase', marginBottom: 4, ...S.muted } }, t('port')),
              h('div', { style: { fontSize: 18, fontWeight: 600 } }, status.port)
            )
          )
        ),

        // Knowledge library card
        h('div', { style: S.card },
          h('h2', { style: S.h2 }, t('knowledge')),
          // Tab bar
          h('div', { style: { display: 'flex', gap: 6, marginBottom: 12 } },
            [['all', t('tabAll')], ['files', '📄 ' + t('tabFiles')], ['conversations', '💬 ' + t('tabConv')]].map(([id, label]) =>
              h('button', {
                key: id, onClick: () => setTab(id),
                style: { ...S.btn,
                  background: tab === id ? 'var(--dsw-alias-brand-primary)' : 'transparent',
                  color: tab === id ? '#fff' : 'var(--dsw-alias-label-primary)',
                  border: tab === id ? 'none' : '1px solid var(--dsw-alias-border-l2)',
                },
              }, label)
            )
          ),
          filtered.length
            ? filtered.map(e => h(EntryCard, { key: e.id, e, myId, t, onDelete: handleDelete, onToggleVisibility: handleToggleVisibility }))
            : h('div', { style: { padding: 20, textAlign: 'center', ...S.muted } }, t('noKnowledge'))
        ),

        // Peers card
        h('div', { style: S.card },
          h('h2', { style: S.h2 }, t('peers'), ' (', status.peers.length, ')'),
          status.peers.length
            ? h('div', null, status.peers.map(peer =>
                h('div', { key: peer.id, style: { display: 'flex', alignItems: 'center', gap: 10, padding: 8, background: 'var(--dsw-alias-bg-layer-2)', borderRadius: 8, marginBottom: 8 } },
                  h('div', { style: { width: 32, height: 32, borderRadius: '50%', background: 'var(--dsw-alias-state-success-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 } }, '🐟'),
                  h('div', { style: { flex: 1 } },
                    h('div', { style: { fontWeight: 600, fontSize: 13 } }, peer.name),
                    h('div', { style: { fontSize: 11, ...S.muted } }, peer.address, ':', peer.port)
                  ),
                  h('div', { style: { fontSize: 10, color: 'var(--dsw-alias-state-success-primary)' } }, t('online'))
                )
              ))
            : h('div', { style: { padding: 20, textAlign: 'center', ...S.muted } }, t('noPeers'))
        )
      );
    }

    // Composer control: pick the whole school or one fish, then an entry; inserts a reference token.
    function ReferenceButton({ inputActions, t }) {
      const [open, setOpen] = useState(false);
      const [data, setData] = useState({ status: null, entries: [] });
      const [scope, setScope] = useState('all');
      const [note, setNote] = useState('');
      const [busy, setBusy] = useState(false);
      const wrap = React.useRef(null);

      const load = useCallback(async () => {
        setBusy(true);
        try {
          const [status, knowledge] = await Promise.all([api('/status'), api('/knowledge?limit=100')]);
          setData({ status, entries: knowledge.entries || [] });
          setNote('');
        } catch (err) {
          setNote(err.message);
        } finally {
          setBusy(false);
        }
      }, []);

      useEffect(() => {
        if (!open) return undefined;
        load();
        const onDown = (ev) => {
          if (wrap.current && !wrap.current.contains(ev.target)) setOpen(false);
        };
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
      }, [open, load]);

      const insert = useCallback((entry) => {
        const token = `@${entry.author}/${entry.type}/${entry.id}`;
        try {
          const span = inputActions?.captureInsertion?.();
          const result = inputActions?.insertText?.(token + ' ', span);
          if (result === false) { setNote(t('refFailed')); return; }
          setNote(t('refInserted', { ref: token }));
        } catch (err) {
          setNote(err.message);
        }
      }, [inputActions, t]);

      const me = data.status?.me?.name;
      const peers = data.status?.peers || [];
      const scopes = ['all', 'mine', ...peers.map(p => p.name)];
      const entries = data.entries.filter(e => {
        if (scope === 'all') return true;
        if (scope === 'mine') return e.author === me;
        return e.author === scope;
      });

      return h('div', { ref: wrap, style: { position: 'relative', display: 'inline-flex' } },
        h('button', {
          type: 'button',
          onClick: () => setOpen(v => !v),
          title: t('ref'), 'aria-label': t('ref'),
          'aria-expanded': open ? 'true' : 'false',
          style: {
            width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: open ? 'var(--dsw-alias-bg-layer-2)' : 'transparent',
            color: open ? 'var(--dsw-alias-brand-primary)' : 'var(--dsw-alias-label-secondary)',
            border: 'none', borderRadius: 6, cursor: 'pointer', padding: 0, fontSize: 16,
          },
        }, '🐟'),

        open ? h('div', {
          style: {
            position: 'absolute', bottom: 'calc(100% + 8px)', left: 0, zIndex: 40,
            width: 420, maxWidth: '80vw', maxHeight: 360, overflow: 'auto',
            background: 'var(--dsw-alias-bg-overlay)',
            border: '1px solid var(--dsw-alias-border-l1)',
            borderRadius: 10, padding: 10,
            boxShadow: '0 10px 28px rgba(0,0,0,0.18)',
          },
        },
          h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 } },
            scopes.map(s => h('button', {
              key: s, type: 'button', onClick: () => setScope(s),
              style: {
                padding: '3px 8px', fontSize: 11, borderRadius: 999, cursor: 'pointer',
                border: '1px solid ' + (scope === s ? 'transparent' : 'var(--dsw-alias-border-l2)'),
                background: scope === s ? 'var(--dsw-alias-brand-primary)' : 'transparent',
                color: scope === s ? '#fff' : 'var(--dsw-alias-label-secondary)',
              },
            }, s === 'all' ? t('refAll') : s === 'mine' ? t('refMine') : s))
          ),

          busy
            ? h('div', { style: { padding: 16, textAlign: 'center', fontSize: 12, color: 'var(--dsw-alias-label-secondary)' } }, t('loading'))
            : entries.length === 0
              ? h('div', { style: { padding: 16, textAlign: 'center', fontSize: 12, color: 'var(--dsw-alias-label-secondary)' } }, t('refEmpty'))
              : h('div', null, entries.map(e => h('button', {
                  key: e.id, type: 'button', onClick: () => insert(e),
                  title: `@${e.author}/${e.type}/${e.id}`,
                  style: {
                    display: 'flex', alignItems: 'flex-start', gap: 8, width: '100%',
                    textAlign: 'left', padding: '7px 8px', marginBottom: 2,
                    background: 'transparent', border: 'none', borderRadius: 6,
                    cursor: 'pointer', color: 'var(--dsw-alias-label-primary)',
                  },
                },
                  h('span', { style: { flexShrink: 0, fontSize: 13 } }, e.type === 'knowledge' ? '📄' : '💬'),
                  h('span', { style: { minWidth: 0, flex: 1 } },
                    h('div', {
                      style: { fontSize: 12.5, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
                    }, e.type === 'knowledge' ? e.summary : e.title),
                    h('div', { style: { fontSize: 10.5, color: 'var(--dsw-alias-label-secondary)' } },
                      e.author, e.type === 'conversation' ? ` · ${e.messageCount ?? 0} msgs` : '')
                  )
                ))),

          h('div', {
            style: {
              marginTop: 6, paddingTop: 6, borderTop: '1px solid var(--dsw-alias-border-l1)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
            },
          },
            h('span', { style: { fontSize: 10.5, color: 'var(--dsw-alias-label-secondary)', flex: 1 } },
              note || t('refHint2')),
            h('button', {
              type: 'button', onClick: () => setOpen(false),
              style: {
                padding: '3px 10px', fontSize: 11, borderRadius: 4, cursor: 'pointer',
                border: '1px solid var(--dsw-alias-border-l2)', background: 'transparent',
                color: 'var(--dsw-alias-label-primary)',
              },
            }, t('refDone'))
          )
        ) : null
      );
    }

    function Icon({ size, active }) {
      return h('svg', { viewBox: '0 0 64 64', width: size, height: size, style: { display: 'block' } },
        h('g', { fill: active ? 'var(--dsw-alias-brand-primary)' : 'var(--dsw-alias-label-secondary)' },
          h('ellipse', { cx: 32, cy: 32, rx: 16, ry: 10, opacity: 0.9 }),
          h('path', { d: 'M 16 32 L 10 28 L 10 36 Z', opacity: 0.9 }),
          h('circle', { cx: 42, cy: 30, r: 2, fill: active ? '#fff' : 'var(--dsw-alias-bg-base)' }),
          h('ellipse', { cx: 20, cy: 20, rx: 10, ry: 6, opacity: 0.7 }),
          h('path', { d: 'M 10 20 L 6 17 L 6 23 Z', opacity: 0.7 }),
          h('ellipse', { cx: 44, cy: 44, rx: 10, ry: 6, opacity: 0.7 }),
          h('path', { d: 'M 34 44 L 30 41 L 30 47 Z', opacity: 0.7 })
        )
      );
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        const localeService = ctx.locale;
        localeService.register(NS, { en: DICTS.en, zh: DICTS.zh });
        const t = (key, vars) => {
          let s = localeService.bind(NS)(key);
          if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace('{' + k + '}', String(v));
          return s;
        };

        ctx.slots.inject('conversation.input.left', () =>
          ctx.slots.register(
            { name: 'conversation.input.left', id: 'fish-school-reference', order: 50 },
            (props) => h(ReferenceButton, { inputActions: props.inputActions, t })
          )
        );

        ctx.slots.inject('sidebar.panellist', () =>
          ctx.slots.register({ name: 'sidebar.panellist', id: NS, order: 15, label: () => t('title') },
            props => h(Icon, props))
        );

        ctx.slots.inject('main', () =>
          ctx.slots.register({ name: 'main', key: NS }, () => h(Panel, { t }))
        );
      },
    };
  },
});
