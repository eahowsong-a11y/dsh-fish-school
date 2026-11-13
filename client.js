// Fish School client: sidebar icon + main panel (my fish, knowledge library, peers, shares).
window.__ModuleLoader__.load({
  id: '@local/fish-school',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const { useState, useEffect, useCallback, useRef } = React;
    const NS = 'fish-school';
    const API = '/fish-school/v1';

    const DICTS = {
      en: {
        title: 'Fish school', subtitle: 'Share knowledge across DeepSeek Harness instances on this network',
        me: 'My fish', you: 'You', peers: 'Fish in the school', noPeers: 'No other fish found yet. Add one by IP, or scan the LAN.',
        peerAddrHint: 'IP or IP:port', peerAdd: 'Add fish', peerScan: 'Scan LAN', peerScanning: 'Scanning…',
        peerAdded: 'Added {name}', peerFound: 'Found {n} fish', peerNone: 'No fish found on this subnet', peerRemove: 'Remove',
        rename: 'Rename', save: 'Save', cancel: 'Cancel', saving: 'Saving…', nameHint: '1–40 characters',
        knowledge: 'Knowledge library', noKnowledge: 'Nothing published yet.',
        tabAll: 'All', tabFiles: 'Files', tabConv: 'Conversations',
        port: 'Port', entries: 'Entries', online: 'Online',
        delete: 'Delete', makePublic: 'Make public', makePrivate: 'Make private', private: 'Private',
        remote: 'Remote',
        version: 'Version', checkUpdate: 'Check', checkingUpdate: 'Checking…', upToDate: 'Up to date', updateAvailable: 'Update available', updateFailed: 'Cannot check',
        loading: 'Loading…', loadFailed: 'Cannot reach Fish school: {e}',
        refHint: 'Reference: ',
        ref: 'Reference a fish or its knowledge', refAll: 'All fish', refMine: 'Mine',
        refEmpty: 'No shared knowledge to reference yet',
        refHint2: 'Click an entry to insert a reference into your message',
        refInserted: 'Added {ref}', refFailed: 'Could not insert — click into the message box first',
        refDone: 'Done',
        uploadTitle: 'Upload a file', uploadChoose: 'Choose file', uploadDrop: 'or drop a file here',
        uploadHint: 'Text files only, up to 1 MB', uploadFieldSummary: 'Title', uploadFieldTags: 'Tags',
        uploadGo: 'Upload', uploadCancel: 'Cancel', uploadTooBig: 'File is larger than 1 MB',
        uploadBinary: 'That looks like a binary file — text only', uploadEmpty: 'File is empty',
        uploadDone: 'Uploaded: {name}',
        menuRef: 'Reference knowledge or a conversation', menuRefDesc: 'insert @fish/type/id into the message',
        menuSum: 'Summarize this conversation and publish', menuSumDesc: 'the agent writes the summary, then publishes it',
        menuShare: 'Share this conversation as-is', menuShareDesc: 'publish the full transcript, public or private',
        shareFieldTitle: 'Title', sharePublic: 'Public to the school', shareGo: 'Share',
        noSession: 'No conversation selected yet',
        settingsSubtitle: 'Show version and settings for Fish school.',
        sidebarEntry: 'Sidebar entry', sidebarEntryHint: 'Show Fish school under "Plugins" in the sidebar. The entry in Settings stays either way.',
        show: 'Show', hide: 'Hide',
        sidebarSaveFailed: 'Could not save: {e}',
        summarizePrompt: 'Summarize our conversation so far and publish it to the fish school:\n1) write 5-10 bullets covering the conclusions, decisions and reusable practices;\n2) then call fish_school_publish with a one-line summary, the full bullets as content, and comma-separated tags.',
        shares: 'Shares', newShare: 'New share', shareKind: 'Kind', shareFolder: 'Folder', shareProject: 'Project',
        sharePath: 'Path', sharePathHint: 'Absolute path, e.g. C:\\docs', shareVisibility: 'Visibility',
        sharePublicOpt: 'Public', sharePrivateOpt: 'Private (default)', shareCreate: 'Create', shareResync: 'Resync', shareDelete: 'Delete',
        syncScanning: 'Scanning…', syncImporting: 'Importing…', syncProgress: '{done}/{total}', syncDone: 'Synced', syncError: 'Error', syncOverLimit: 'Over limit',
        uploadFolder: 'Upload folder', uploadFolderDrop: 'or drop a folder', uploadFolderCount: '{n} files, {kb} KB',
        uploadFolderSkipped: '{n} skipped (binary / too large)', uploadFolderProgress: '{done}/{total} uploaded',
        updateBtn: 'Update', updating: 'Updating…', updateDone: 'Updated! Restart DSH to apply.',
        recentRefs: 'Recent references', browseFish: 'Browse by fish', refBack: '← All fish', refSearchPlaceholder: 'Search…',
        offline: 'Offline', shareManual: 'Manual', shareUpload: 'Upload', shareName: 'Name', noShares: 'No shares yet.',
        refNoMatch: 'No matches', refKeys: '↑↓ move · Enter insert · Esc close',
      },
      zh: {
        title: '鱼群', subtitle: '在局域网内的 DeepSeek Harness 实例间共享知识',
        me: '我的鱼', you: '我', peers: '鱼群成员', noPeers: '还没有发现其他鱼。可以填 IP 添加，或扫描局域网。',
        peerAddrHint: 'IP 或 IP:端口', peerAdd: '添加鱼', peerScan: '扫描局域网', peerScanning: '扫描中…',
        peerAdded: '已添加 {name}', peerFound: '找到 {n} 条鱼', peerNone: '本网段没找到鱼', peerRemove: '移除',
        rename: '改名', save: '保存', cancel: '取消', saving: '保存中…', nameHint: '1–40 个字符',
        knowledge: '知识库', noKnowledge: '还没有发布任何知识。',
        tabAll: '全部', tabFiles: '文件', tabConv: '对话',
        port: '端口', entries: '条目', online: '在线',
        delete: '删除', makePublic: '公开', makePrivate: '设为私有', private: '私有',
        remote: '远程',
        version: '版本', checkUpdate: '检查', checkingUpdate: '检查中…', upToDate: '已是最新', updateAvailable: '有可用更新', updateFailed: '无法检查',
        loading: '加载中…', loadFailed: '无法连接鱼群服务：{e}',
        refHint: '引用：',
        ref: '引用某条鱼及其知识', refAll: '全部鱼', refMine: '我的',
        refEmpty: '还没有可引用的知识',
        refHint2: '点击条目，把引用插入你的消息',
        refInserted: '已插入 {ref}', refFailed: '插入失败：请先在输入框里点一下光标位置',
        refDone: '完成',
        uploadTitle: '上传文件', uploadChoose: '选择文件', uploadDrop: '或把文件拖到这里',
        uploadHint: '仅支持文本文件，最大 1 MB', uploadFieldSummary: '标题', uploadFieldTags: '标签',
        uploadGo: '上传', uploadCancel: '取消', uploadTooBig: '文件超过 1 MB',
        uploadBinary: '这看起来是二进制文件，只支持文本', uploadEmpty: '文件是空的',
        uploadDone: '已上传：{name}',
        menuRef: '引用知识或对话', menuRefDesc: '把 @鱼/类型/id 插入消息',
        menuSum: '总结本次对话并发布', menuSumDesc: '由 Agent 写总结，再调用工具发布',
        menuShare: '上传本次对话原文', menuShareDesc: '直接分享完整对话，可设公开/私有',
        shareFieldTitle: '标题', sharePublic: '公开给鱼群', shareGo: '上传',
        noSession: '还没有选中对话',
        settingsSubtitle: '查看鱼群版本与设置。',
        sidebarEntry: '侧栏入口', sidebarEntryHint: '在侧栏「插件」下方显示鱼群。设置里的入口不变。',
        show: '显示', hide: '不显示',
        sidebarSaveFailed: '保存失败：{e}',
        summarizePrompt: '请总结我们刚才这段对话并发布到鱼群：\n1) 用 5-10 条要点写出结论、决策和可复用的做法；\n2) 然后调用 fish_school_publish 发布，summary 写一句话标题，content 放完整要点，tags 用逗号分隔。',
        shares: '共享', newShare: '新建共享单元', shareKind: '类型', shareFolder: '文件夹', shareProject: '对话项目',
        sharePath: '路径', sharePathHint: '绝对路径，例如 C:\\harper\\docs', shareVisibility: '可见性',
        sharePublicOpt: '公开', sharePrivateOpt: '私有（默认）', shareCreate: '创建', shareResync: '重新扫描', shareDelete: '删除',
        syncScanning: '扫描中…', syncImporting: '导入中…', syncProgress: '{done}/{total}', syncDone: '已同步', syncError: '出错', syncOverLimit: '超出上限',
        uploadFolder: '上传文件夹', uploadFolderDrop: '或拖入文件夹', uploadFolderCount: '{n} 个文件，{kb} KB',
        uploadFolderSkipped: '{n} 个已跳过（二进制/过大）', uploadFolderProgress: '{done}/{total} 已上传',
        updateBtn: '一键更新', updating: '更新中…', updateDone: '已更新！重启 DSH 生效。',
        recentRefs: '最近引用', browseFish: '按鱼浏览', refBack: '← 全部鱼', refSearchPlaceholder: '搜索…',
        offline: '离线', shareManual: '手动', shareUpload: '上传', shareName: '名称', noShares: '还没有共享单元。',
        refNoMatch: '没有匹配项', refKeys: '↑↓ 选择 · Enter 插入 · Esc 关闭',
      },
    };

    const S = {
      activeBtn: {
        background: 'var(--dsw-alias-bg-layer-2)', color: 'var(--dsw-alias-label-primary)',
        borderColor: 'var(--dsw-alias-border-l2)',
      },
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

    function useLibrary() {
      const [state, setState] = useState({ groups: [], error: null, loading: true });
      const refresh = useCallback(async () => {
        try {
          const data = await api('/library');
          setState({ groups: data.fish || [], error: null, loading: false });
        } catch (err) {
          setState(prev => ({ ...prev, error: err.message, loading: false }));
        }
      }, []);
      useEffect(() => {
        refresh();
        const id = setInterval(refresh, 5000);
        return () => clearInterval(id);
      }, [refresh]);
      return [state, refresh];
    }

    function copyText(text) {
      try { navigator.clipboard.writeText(text); } catch {
        const ta = document.createElement('textarea');
        ta.value = text; document.body.appendChild(ta); ta.select();
        document.execCommand('copy'); document.body.removeChild(ta);
      }
    }

    const activeBtn = S.activeBtn;

    function createGate(register, initiallyVisible = true) {
      let ready = false;
      let wanted = initiallyVisible;
      let retracted = false;
      let dispose = null;
      const apply = () => {
        if (!ready) return;
        const shouldShow = wanted && !retracted;
        if (shouldShow && dispose === null) {
          const off = register();
          dispose = typeof off === 'function' ? off : () => {};
          return;
        }
        if (!shouldShow && dispose !== null) {
          const stop = dispose;
          dispose = null;
          stop();
        }
      };
      return {
        available: () => { ready = true; apply(); },
        setVisible: (visible) => { wanted = Boolean(visible); apply(); },
        visible: () => dispose !== null,
        retire: () => { retracted = true; apply(); },
      };
    }

    function SettingsCard({ t, status, update, onCheck, sidebar, onToggleSidebar }) {
      const on = sidebar.enabled;
      return h('div', { style: { ...S.card, marginBottom: 0 } },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 } },
          h('span', { style: { fontWeight: 600, fontSize: 14 } }, t('title')),
          h('span', { style: { ...S.muted, fontVariantNumeric: 'tabular-nums' } },
            'v' + (status.version ?? '?')),
        ),
        h('div', { style: S.muted }, t('settingsSubtitle')),
        h(VersionNotice, { t, status, update, onCheck }),
        h('div', {
          style: { display: 'flex', alignItems: 'flex-start', gap: 12, marginTop: 14, paddingTop: 12,
            borderTop: '1px solid var(--dsw-alias-border-l1)' },
        },
          h('div', { style: { flex: 1, minWidth: 0 } },
            h('div', { style: { fontSize: 13, marginBottom: 3 } }, t('sidebarEntry')),
            h('div', { style: S.muted }, t('sidebarEntryHint')),
            sidebar.error && h('div', {
              style: { fontSize: 11.5, marginTop: 4, color: 'var(--dsw-alias-state-error-primary)' },
            }, t('sidebarSaveFailed', { e: sidebar.error })),
          ),
          h('div', { style: { display: 'flex', gap: 4, flexShrink: 0 } },
            h('button', {
              type: 'button', disabled: sidebar.busy,
              onClick: () => onToggleSidebar(false),
              style: { ...S.btn, fontSize: 12, ...(on ? {} : activeBtn) },
            }, t('hide')),
            h('button', {
              type: 'button', disabled: sidebar.busy,
              onClick: () => onToggleSidebar(true),
              style: { ...S.btn, fontSize: 12, ...(on ? activeBtn : {}) },
            }, t('show')),
          ),
        ),
      );
    }

    function VersionNotice({ t, status, update, onCheck }) {
      const [isUpdating, setIsUpdating] = useState(false);
      const [updateMsg, setUpdateMsg] = useState('');
      const d = update.data;
      const busy = update.busy;
      const hasUpdate = Boolean(d?.hasUpdate);
      const color = d?.error
        ? 'var(--dsw-alias-state-warn-primary)'
        : hasUpdate ? 'var(--dsw-alias-state-warn-primary)' : 'var(--dsw-alias-label-secondary)';
      const label = busy || (!d && !update.error)
        ? t('checkingUpdate')
        : d?.error ? `${t('updateFailed')}：${d.error}`
        : hasUpdate ? `${t('updateAvailable')} → v${d.latest}`
        : d?.latest ? `${t('upToDate')}（v${d.current}）`
        : t('updateFailed');

      const doUpdate = useCallback(async () => {
        if (isUpdating) return;
        setIsUpdating(true);
        setUpdateMsg('');
        try {
          await api('/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
          const pollUpdate = async () => {
            for (let i = 0; i < 30; i++) {
              try {
                const status = await api('/update/status');
                if (status.state === 'done') {
                  setUpdateMsg(t('updateDone'));
                  setIsUpdating(false);
                  return;
                } else if (status.state === 'error') {
                  setUpdateMsg(status.message || t('updateFailed'));
                  setIsUpdating(false);
                  return;
                }
              } catch (err) {}
              await new Promise(r => setTimeout(r, 2000));
            }
            setIsUpdating(false);
          };
          pollUpdate();
        } catch (err) {
          setUpdateMsg(err.message);
          setIsUpdating(false);
        }
      }, [isUpdating, t]);

      return h('div', {
        style: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 10,
          fontSize: 11.5, color },
      },
        h('span', null, label),
        hasUpdate && d.releaseUrl && h('a', {
          href: d.releaseUrl, target: '_blank', rel: 'noreferrer',
          style: { color: 'var(--dsw-alias-brand-primary)', textDecoration: 'underline' },
        }, 'Release'),
        hasUpdate && d.assetName && h('span', { style: S.muted }, d.assetName),
        hasUpdate && h('button', {
          style: { ...S.btnSmall, color: 'var(--dsw-alias-brand-primary)' },
          disabled: isUpdating, onClick: doUpdate
        }, isUpdating ? t('updating') : '⬇️ ' + t('updateBtn')),
        h('button', { style: S.btnSmall, disabled: busy, onClick: onCheck },
          busy ? t('checkingUpdate') : t('checkUpdate')),
        h('a', {
          href: `https://github.com/${status.updateRepo ?? ''}`, target: '_blank', rel: 'noreferrer',
          style: { ...S.muted, textDecoration: 'underline' },
        }, '@' + (status.updateRepo ?? '')),
        updateMsg && h('div', { style: { fontSize: 10.5, width: '100%', color: 'var(--dsw-alias-label-secondary)' } }, updateMsg)
      );
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
          h('span', { style: { fontSize: 16, flexShrink: 0, marginTop: 1 } },
            isConv ? '💬' : e.sourceFile ? '📎' : '📄'),
          h('div', { style: { flex: 1, minWidth: 0 } },
            h('div', {
              style: { fontWeight: 600, fontSize: 13, cursor: 'pointer', marginBottom: 3 },
              onClick: () => setExpanded(!expanded),
            }, isConv ? e.title : e.summary),
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' } },
              e.tags?.map(tag => h('span', { key: tag, style: S.tag }, tag)),
              e.remote && h('span', {
                style: { ...S.tag, color: 'var(--dsw-alias-state-success-primary)' },
                title: e.peerAddress ?? '',
              }, `${t('remote')} · ${e.peerName ?? e.author}`),
              !e.isPublic && h('span', { style: { ...S.tag, color: 'var(--dsw-alias-state-warn-primary)' } }, t('private'))
            ),
            h('div', { style: { fontSize: 11, ...S.muted, marginTop: 4 } },
              `${e.author} · `,
              isConv ? `${e.messageCount} msgs` : '',
              !isConv && e.sourceFile ? ` · ${e.sourceFile.name}` : '',
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

    function UploadCard({ t, onUploaded }) {
      const [file, setFile] = useState(null);
      const [summary, setSummary] = useState('');
      const [tags, setTags] = useState('');
      const [busy, setBusy] = useState(false);
      const [error, setError] = useState('');
      const [drag, setDrag] = useState(false);
      const [done, setDone] = useState('');
      const inputRef = useRef(null);
      const MAX = 1024 * 1024;

      const pick = useCallback(async (f) => {
        setError(''); setDone('');
        if (!f) return;
        if (f.size > MAX) { setError(t('uploadTooBig')); return; }
        let text;
        try { text = await f.text(); } catch (err) { setError(err.message); return; }
        if (text.includes('\u0000') || text.includes('\uFFFD')) { setError(t('uploadBinary')); return; }
        text = text.replace(/^\uFEFF/, '');
        if (!text.trim()) { setError(t('uploadEmpty')); return; }
        setFile({ name: f.name, size: f.size, mime: f.type || '', text });
        setSummary(f.name.replace(/\.[^.]+$/, ''));
      }, [t]);

      const upload = useCallback(async () => {
        if (!file) return;
        setBusy(true); setError('');
        try {
          await api('/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: file.name, size: file.size, mime: file.mime, text: file.text,
              summary: summary.trim() || file.name, tags,
            }),
          });
          const name = file.name;
          setFile(null); setSummary(''); setTags('');
          setDone(t('uploadDone', { name }));
          onUploaded();
        } catch (err) {
          setError(err.message);
        } finally { setBusy(false); }
      }, [file, summary, tags, onUploaded, t]);

      return h('div', { style: { marginBottom: 14 } },
        file
          ? h('div', { style: { padding: 12, background: 'var(--dsw-alias-bg-layer-2)', borderRadius: 8 } },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 } },
                h('span', { style: { fontSize: 16 } }, '📎'),
                h('div', { style: { minWidth: 0, flex: 1 } },
                  h('div', {
                    style: { fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
                  }, file.name),
                  h('div', { style: { fontSize: 11, ...S.muted } }, `${Math.max(1, Math.round(file.size / 1024))} KB`)
                ),
                h('button', {
                  style: S.btnSmall, disabled: busy,
                  onClick: () => { setFile(null); setError(''); },
                }, t('uploadCancel'))
              ),
              h('div', { style: { display: 'flex', gap: 6, marginBottom: 8 } },
                h('input', {
                  style: S.input, value: summary, disabled: busy, placeholder: t('uploadFieldSummary'),
                  onChange: e => setSummary(e.target.value),
                }),
                h('input', {
                  style: { ...S.input, flex: '0 0 170px' }, value: tags, disabled: busy,
                  placeholder: t('uploadFieldTags'),
                  onChange: e => setTags(e.target.value),
                })
              ),
              h('button', {
                style: { ...S.btn, background: 'var(--dsw-alias-brand-primary)', color: '#fff', border: 'none' },
                disabled: busy || !summary.trim(), onClick: upload,
              }, busy ? t('saving') : t('uploadGo'))
            )
          : h('div', {
              onDragOver: (e) => { e.preventDefault(); setDrag(true); },
              onDragLeave: () => setDrag(false),
              onDrop: (e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer?.files?.[0]); },
              style: {
                padding: '14px 12px', borderRadius: 8, textAlign: 'center',
                border: `1px dashed ${drag ? 'var(--dsw-alias-brand-primary)' : 'var(--dsw-alias-border-l2)'}`,
                background: drag ? 'var(--dsw-alias-bg-layer-2)' : 'transparent',
              },
            },
              h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, flexWrap: 'wrap' } },
                h('button', { style: S.btn, onClick: () => inputRef.current?.click() }, '📎 ' + t('uploadChoose')),
                h('span', { style: { fontSize: 12, ...S.muted } }, t('uploadDrop'))
              ),
              h('div', { style: { fontSize: 10.5, ...S.muted, marginTop: 6 } }, t('uploadHint')),
              h('input', {
                ref: inputRef, type: 'file', style: { display: 'none' },
                onChange: (e) => { pick(e.target.files?.[0]); e.target.value = ''; },
              })
            ),
        error ? h('div', { style: { fontSize: 11.5, color: 'var(--dsw-alias-state-error-primary)', marginTop: 6 } }, error) : null,
        done ? h('div', { style: { fontSize: 11.5, color: 'var(--dsw-alias-state-success-primary)', marginTop: 6 } }, done) : null
      );
    }

    // Folder upload: pick (webkitdirectory) or drop a folder, preview, then batch POST /upload.
    const FOLDER_MAX = 2 * 1024 * 1024;
    const SECRET_FILE = /(^|\/)\.env(\.|$)|\.(key|pem)$/i;

    function readEntryFiles(entry, out) {
      if (entry.isFile) {
        return new Promise(res => entry.file(f => { out.push({ file: f, path: entry.fullPath.replace(/^\//, '') }); res(); }, () => res()));
      }
      if (!entry.isDirectory) return Promise.resolve();
      const reader = entry.createReader();
      return new Promise(res => {
        const batch = () => reader.readEntries(async (list) => {
          if (!list.length) { res(); return; }
          for (const child of list) await readEntryFiles(child, out);
          batch();
        }, () => res());
        batch();
      });
    }

    function FolderUpload({ t, onUploaded, collectionId }) {
      const [preview, setPreview] = useState(null); // { files: [{file,path,text}], bytes, skipped }
      const [progress, setProgress] = useState(null); // { done, total, failed: [] }
      const [drag, setDrag] = useState(false);
      const ref = useRef(null);
      useEffect(() => { ref.current?.setAttribute('webkitdirectory', ''); }, [preview, progress]);

      const inspect = useCallback(async (list) => {
        setProgress(null);
        const files = []; let bytes = 0; let skipped = 0;
        for (const { file, path } of list) {
          if (file.size > FOLDER_MAX || SECRET_FILE.test(path)) { skipped++; continue; }
          let text;
          try { text = await file.text(); } catch { skipped++; continue; }
          if (text.includes('\u0000') || !text.trim()) { skipped++; continue; }
          files.push({ file, path, text: text.replace(/^\uFEFF/, '') }); bytes += file.size;
        }
        setPreview({ files, bytes, skipped });
      }, []);

      const onPick = (e) => {
        const list = Array.from(e.target.files || []).map(f => ({ file: f, path: f.webkitRelativePath || f.name }));
        e.target.value = '';
        if (list.length) inspect(list);
      };
      const onDrop = async (e) => {
        e.preventDefault(); setDrag(false);
        const entries = Array.from(e.dataTransfer?.items || []).map(i => i.webkitGetAsEntry?.()).filter(Boolean);
        const out = [];
        for (const entry of entries) await readEntryFiles(entry, out);
        if (out.length) inspect(out);
      };

      const upload = useCallback(async () => {
        const files = preview.files;
        const state = { done: 0, total: files.length, failed: [] };
        setPreview(null); setProgress({ ...state });
        for (const f of files) {
          try {
            await api('/upload', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: f.file.name, text: f.text, path: f.path, size: f.file.size,
                mime: f.file.type || '', ...(collectionId ? { collectionId } : {}) }),
            });
            state.done++;
          } catch (err) { state.failed.push(`${f.path}: ${err.message}`); }
          setProgress({ ...state, failed: [...state.failed] });
        }
        onUploaded?.();
      }, [preview, collectionId, onUploaded]);

      const running = progress && progress.done + progress.failed.length < progress.total;
      const brand = { ...S.btn, background: 'var(--dsw-alias-brand-primary)', color: '#fff', border: 'none' };
      return h('div', { style: { marginBottom: 14 } },
        preview
          ? h('div', { style: { padding: 12, background: 'var(--dsw-alias-bg-layer-2)', borderRadius: 8 } },
              h('div', { style: { fontSize: 13, fontWeight: 600 } }, '📁 ',
                t('uploadFolderCount', { n: preview.files.length, kb: Math.max(1, Math.round(preview.bytes / 1024)) })),
              preview.skipped ? h('div', { style: { ...S.muted, fontSize: 11, marginTop: 4 } }, t('uploadFolderSkipped', { n: preview.skipped })) : null,
              h('div', { style: { display: 'flex', gap: 6, marginTop: 8 } },
                h('button', { style: brand, disabled: !preview.files.length, onClick: upload }, t('uploadGo')),
                h('button', { style: S.btn, onClick: () => setPreview(null) }, t('cancel')))
            )
          : h('div', {
              onDragOver: (e) => { e.preventDefault(); setDrag(true); }, onDragLeave: () => setDrag(false), onDrop,
              style: { padding: '12px', borderRadius: 8, textAlign: 'center',
                border: `1px dashed ${drag ? 'var(--dsw-alias-brand-primary)' : 'var(--dsw-alias-border-l2)'}` },
            },
              h('button', { style: S.btn, disabled: running, onClick: () => ref.current?.click() }, '📁 ' + t('uploadFolder')),
              h('span', { style: { fontSize: 12, ...S.muted, marginLeft: 8 } }, t('uploadFolderDrop')),
              h('input', { ref, type: 'file', multiple: true, style: { display: 'none' }, onChange: onPick })
            ),
        progress ? h('div', { style: { marginTop: 8 } },
          h('div', { style: { height: 4, borderRadius: 2, background: 'var(--dsw-alias-bg-layer-2)', overflow: 'hidden' } },
            h('div', { style: { height: '100%', width: `${progress.total ? 100 * (progress.done + progress.failed.length) / progress.total : 100}%`,
              background: 'var(--dsw-alias-brand-primary)' } })),
          h('div', { style: { fontSize: 11, ...S.muted, marginTop: 4 } }, t('uploadFolderProgress', { done: progress.done, total: progress.total })),
          progress.failed.map(msg => h('div', { key: msg, style: { fontSize: 11, color: 'var(--dsw-alias-state-error-primary)' } }, msg))
        ) : null
      );
    }

    function SharesPanel({ t }) {
      const [collections, setCollections] = useState([]);
      const [error, setError] = useState('');
      const [loading, setLoading] = useState(true);
      const [showForm, setShowForm] = useState(false);
      const [kind, setKind] = useState('folder');
      const [name, setName] = useState('');
      const [path, setPath] = useState('');
      const [visibility, setVisibility] = useState('private');
      const [saving, setSaving] = useState(false);

      const loadCollections = useCallback(async () => {
        setLoading(true);
        try {
          const data = await api('/collections');
          setCollections(data.collections || []);
          setError('');
        } catch (err) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
      }, []);

      useEffect(() => {
        loadCollections();
      }, [loadCollections]);

      const createCollection = useCallback(async () => {
        if (!name.trim() || (kind !== 'upload' && !path.trim())) return;
        setSaving(true);
        try {
          const body = { kind, name: name.trim(), visibility };
          if (kind !== 'upload') body.root = path.trim();
          await api('/collections', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });
          setShowForm(false);
          setName(''); setPath(''); setKind('folder'); setVisibility('private');
          loadCollections();
        } catch (err) {
          setError(err.message);
        } finally {
          setSaving(false);
        }
      }, [kind, name, path, visibility, loadCollections]);

      const deleteCollection = useCallback(async (id) => {
        if (!confirm(t('delete') + '?')) return;
        try {
          await api('/collections/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id }),
          });
          loadCollections();
        } catch (err) {
          setError(err.message);
        }
      }, [t, loadCollections]);

      const toggleVisibility = useCallback(async (id, current) => {
        try {
          await api('/collections/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, visibility: current === 'public' ? 'private' : 'public' }),
          });
          loadCollections();
        } catch (err) {
          setError(err.message);
        }
      }, [loadCollections]);

      const resyncCollection = useCallback(async (id) => {
        try {
          await api('/collections/resync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id }),
          });
          loadCollections();
        } catch (err) {
          setError(err.message);
        }
      }, [loadCollections]);

      const getSyncBadge = (sync) => {
        if (!sync) return null;
        const { state, done, total } = sync;
        if (state === 'idle') return t('syncDone');
        if (state === 'scanning') return t('syncScanning');
        if (state === 'importing') return `${t('syncImporting')} ${t('syncProgress', { done, total })}`;
        if (state === 'error') return t('syncError');
        return null;
      };

      return h('div', { style: S.card },
        h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 } },
          h('h2', { style: { ...S.h2, margin: 0 } }, t('shares')),
          h('button', {
            style: S.btn, onClick: () => setShowForm(!showForm),
          }, showForm ? t('cancel') : '➕ ' + t('newShare'))
        ),

        showForm && h('div', { style: { padding: 12, background: 'var(--dsw-alias-bg-layer-2)', borderRadius: 8, marginBottom: 12 } },
          h('div', { style: { marginBottom: 10 } },
            h('div', { style: { fontSize: 12, marginBottom: 4 } }, t('shareKind')),
            h('div', { style: { display: 'flex', gap: 6 } },
              h('button', {
                type: 'button', disabled: saving,
                onClick: () => setKind('folder'),
                style: { ...S.btn, background: kind === 'folder' ? 'var(--dsw-alias-brand-primary)' : 'transparent',
                  color: kind === 'folder' ? '#fff' : 'var(--dsw-alias-label-primary)', border: 'none' },
              }, '📁 ' + t('shareFolder')),
              h('button', {
                type: 'button', disabled: saving,
                onClick: () => setKind('project'),
                style: { ...S.btn, background: kind === 'project' ? 'var(--dsw-alias-brand-primary)' : 'transparent',
                  color: kind === 'project' ? '#fff' : 'var(--dsw-alias-label-primary)', border: 'none' },
              }, '🗂️ ' + t('shareProject'))
            )
          ),
          h('input', {
            style: { ...S.input, width: '100%', boxSizing: 'border-box', marginBottom: 8 },
            placeholder: t('shareFieldTitle') + ' / ' + t('shareKind'),
            value: name, disabled: saving,
            onChange: e => setName(e.target.value),
          }),
          h('input', {
            style: { ...S.input, width: '100%', boxSizing: 'border-box', marginBottom: 8 },
            placeholder: t('sharePathHint'),
            value: path, disabled: saving,
            onChange: e => setPath(e.target.value),
          }),
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 } },
            h('label', { style: { display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 } },
              h('input', {
                type: 'radio', name: 'vis', checked: visibility === 'private', disabled: saving,
                onChange: () => setVisibility('private'),
              }),
              t('sharePrivateOpt')
            ),
            h('label', { style: { display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 } },
              h('input', {
                type: 'radio', name: 'vis', checked: visibility === 'public', disabled: saving,
                onChange: () => setVisibility('public'),
              }),
              t('sharePublicOpt')
            )
          ),
          h('button', {
            style: { ...S.btn, background: 'var(--dsw-alias-brand-primary)', color: '#fff', border: 'none', width: '100%' },
            disabled: saving || !name.trim() || !path.trim(), onClick: createCollection,
          }, saving ? t('saving') : t('shareCreate'))
        ),

        error && h('div', { style: { fontSize: 11.5, color: 'var(--dsw-alias-state-error-primary)', marginBottom: 8 } }, error),

        loading
          ? h('div', { style: { textAlign: 'center', padding: 20, ...S.muted } }, t('loading'))
          : collections.length === 0
            ? h('div', { style: { textAlign: 'center', padding: 20, ...S.muted } }, t('noKnowledge'))
            : h('div', null, collections.map(col =>
                h('div', { key: col.id, style: { padding: 10, background: 'var(--dsw-alias-bg-layer-2)', borderRadius: 8, marginBottom: 8 } },
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 } },
                    h('span', { style: { fontSize: 14 } }, col.kind === 'folder' ? '📁' : col.kind === 'project' ? '🗂️' : '📋'),
                    h('span', { style: { fontWeight: 600, fontSize: 12, flex: 1 } }, col.name, ' · ', col.stats?.items ?? 0),
                    h('span', { style: { ...S.tag, color: 'var(--dsw-alias-state-idle-primary)' } }, col.visibility || 'private')
                  ),
                  col.sync && h('div', { style: { fontSize: 11, ...S.muted, marginBottom: 6 } },
                    getSyncBadge(col.sync)
                  ),
                  h('div', { style: { display: 'flex', gap: 4 } },
                    col.sync && h('button', { style: S.btnSmall, onClick: () => resyncCollection(col.id) }, t('shareResync')),
                    h('button', {
                      style: S.btnSmall,
                      onClick: () => toggleVisibility(col.id, col.visibility),
                    }, col.visibility === 'public' ? '🔒 ' + t('makePrivate') : '🔓 ' + t('makePublic')),
                    h('button', { style: S.btnDanger, onClick: () => deleteCollection(col.id) }, t('shareDelete'))
                  )
                )
              ))
      );
    }

    // Items of one collection: pages of 50 from /items, rendered through a 20-row window.
    const ROW_H = 44;
    const WINDOW = 20;

    function itemTitle(item) {
      return item.title || item.summary || item.path || item.name || item.id;
    }

    function CollectionItems({ t, fishId, colId, filter, myId, reloadKey, onDelete, onToggleVisibility }) {
      const [list, setList] = useState({ items: [], cursor: null, done: false, busy: false, error: '' });
      const [start, setStart] = useState(0);
      const busyRef = useRef(false);
      const type = filter === 'conversations' ? 'conversation' : '';

      const loadPage = useCallback(async (cursor, reset) => {
        if (busyRef.current) return;
        busyRef.current = true;
        setList(p => ({ ...p, busy: true }));
        try {
          const q = new URLSearchParams({ fish: fishId, collection: colId, limit: '50' });
          if (type) q.set('type', type);
          if (cursor) q.set('cursor', cursor);
          const r = await api('/items?' + q.toString());
          setList(p => ({ items: (reset ? [] : p.items).concat(r.items || []), cursor: r.nextCursor || null,
            done: !r.nextCursor, busy: false, error: '' }));
        } catch (err) {
          setList(p => ({ ...p, busy: false, error: err.message }));
        } finally { busyRef.current = false; }
      }, [fishId, colId, type]);

      useEffect(() => { setStart(0); loadPage(null, true); }, [loadPage, reloadKey]);

      const shown = filter === 'files' ? list.items.filter(i => i.type !== 'conversation') : list.items;
      const onScroll = (e) => {
        const el = e.currentTarget;
        setStart(Math.max(0, Math.floor(el.scrollTop / ROW_H) - 2));
        if (!list.done && el.scrollTop + el.clientHeight > el.scrollHeight - ROW_H * 3) loadPage(list.cursor, false);
      };
      const end = Math.min(shown.length, start + WINDOW);

      const row = (item) => {
        const ref = `@${item.author}/${item.type}/${item.id}`;
        const mine = item.authorId === myId && !item.remote;
        return h('div', { key: item.id, style: { height: ROW_H, boxSizing: 'border-box', padding: '4px 8px', display: 'flex',
          alignItems: 'center', gap: 6, borderBottom: '1px solid var(--dsw-alias-border-l1)' } },
          h('span', { style: { flexShrink: 0 } }, item.type === 'conversation' ? '💬' : item.type === 'file' ? '📎' : '📄'),
          h('div', { style: { flex: 1, minWidth: 0, cursor: 'pointer' }, title: t('refHint') + ref, onClick: () => copyText(ref) },
            h('div', { style: { fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, itemTitle(item)),
            h('div', { style: { fontSize: 10.5, ...S.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } },
              item.author, item.messageCount ? ` · ${item.messageCount} msgs` : '', item.path ? ` · ${item.path}` : '')),
          (item.effectivePublic === false || item.isPublic === false) &&
            h('span', { style: { ...S.tag, color: 'var(--dsw-alias-state-warn-primary)' } }, t('private')),
          mine && h('button', { style: S.btnSmall, title: item.isPublic ? t('makePrivate') : t('makePublic'),
            onClick: () => onToggleVisibility(item.id, item.isPublic === false) }, item.isPublic === false ? '🔓' : '🔒'),
          mine && h('button', { style: S.btnDanger, title: t('delete'), onClick: () => onDelete(item.id) }, '🗑'));
      };

      if (list.error) return h('div', { style: { fontSize: 11.5, color: 'var(--dsw-alias-state-error-primary)', padding: 6 } }, list.error);
      if (!shown.length) return h('div', { style: { ...S.muted, padding: 8 } }, list.busy ? t('loading') : t('noKnowledge'));
      return h('div', { onScroll, style: { maxHeight: ROW_H * 8, overflowY: 'auto', marginBottom: 6,
        background: 'var(--dsw-alias-bg-base)', borderRadius: 6 } },
        h('div', { style: { height: start * ROW_H } }),
        shown.slice(start, end).map(row),
        h('div', { style: { height: (shown.length - end) * ROW_H } }),
        list.busy ? h('div', { style: { ...S.muted, padding: 6, textAlign: 'center' } }, t('loading')) : null);
    }


    function LibraryPanel({ t, filter, myId, onDelete, onToggleVisibility }) {
      const [state] = useLibrary();
      const [collapsedFish, setCollapsedFish] = useState(new Set());
      const [collapsedCol, setCollapsedCol] = useState(new Set());
      const [reload, setReload] = useState(0);
      const seen = useRef(new Set());

      useEffect(() => {
        const addFish = []; const addCol = [];
        for (const fish of state.groups) {
          const fk = 'f:' + fish.id;
          if (!seen.current.has(fk)) { seen.current.add(fk); if (!fish.self) addFish.push(fish.id); }
          for (const col of fish.collections || []) {
            const ck = 'c:' + fish.id + '/' + col.id;
            if (!seen.current.has(ck)) { seen.current.add(ck); addCol.push(fish.id + '/' + col.id); }
          }
        }
        if (addFish.length) setCollapsedFish(prev => new Set([...prev, ...addFish]));
        if (addCol.length) setCollapsedCol(prev => new Set([...prev, ...addCol]));
      }, [state.groups]);

      const toggle = (setter, id) => setter(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
      const fishShut = (fish) => collapsedFish.has(fish.id) || (!fish.self && !seen.current.has('f:' + fish.id));
      const colShut = (key) => collapsedCol.has(key) || !seen.current.has('c:' + key);
      const KIND_ICON = { folder: '📁', project: '🗂️', upload: '📋', manual: '📄' };

      if (state.loading) return h('div', { style: { ...S.muted, textAlign: 'center', padding: 16 } }, t('loading'));
      if (state.error && !state.groups.length) return h('div', { style: { fontSize: 11.5, color: 'var(--dsw-alias-state-error-primary)', padding: 8 } }, t('loadFailed', { e: state.error }));
      if (!state.groups.length) return h('div', { style: { padding: 20, textAlign: 'center', ...S.muted } }, t('noKnowledge'));

      // Run the Panel's handler (it confirms and calls the API), then reload the open lists.
      const after = (fn) => async (...args) => { await fn(...args); setReload(c => c + 1); };
      const del = after(onDelete);
      const vis = after(onToggleVisibility);

      return h('div', null, state.groups.map(fish =>
        h('div', { key: fish.id, style: { marginBottom: 16 } },
          h('div', {
            style: { padding: '8px 10px', background: 'var(--dsw-alias-bg-layer-2)', borderRadius: 8, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8 },
            onClick: () => toggle(setCollapsedFish, fish.id),
          },
            h('span', null, fishShut(fish) ? '▶' : '▼'),
            h('span', { style: { fontSize: 13, fontWeight: 600, flex: 1 } }, '🐟 ', fish.name,
              fish.self ? h('span', { style: S.muted }, ' (', t('you'), ')') : null, ' · ', fish.itemCount, ' ', t('entries')),
            h('span', { style: { ...S.tag, color: fish.online || fish.self ? 'var(--dsw-alias-state-success-primary)' : 'var(--dsw-alias-state-idle-primary)' } },
              fish.online || fish.self ? t('online') : t('offline'))
          ),
          !fishShut(fish) && h('div', { style: { marginTop: 8, marginLeft: 8 } },
            fish.collections && fish.collections.map(col =>
              h('div', { key: col.id, style: { marginBottom: 10 } },
                h('div', {
                  style: { padding: '6px 8px', background: 'var(--dsw-alias-bg-base)', borderRadius: 6, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, marginBottom: 4 },
                  onClick: () => toggle(setCollapsedCol, fish.id + '/' + col.id),
                },
                  h('span', null, colShut(fish.id + '/' + col.id) ? '▶' : '▼'),
                  h('span', { style: { fontSize: 11, flex: 1 } }, KIND_ICON[col.kind] || '📁', ' ', col.name, ' · ', col.itemCount, ' ', t('entries')),
                  col.kind !== 'manual' && col.visibility !== 'public' && h('span', { style: { ...S.tag, fontSize: 10 } }, t('private'))
                ),
                !colShut(fish.id + '/' + col.id) && h(CollectionItems, {
                  t, fishId: fish.id, colId: col.id, filter, myId, reloadKey: reload,
                  onDelete: del, onToggleVisibility: vis,
                })
              )
            )
          )
        )
      ));
    }

    function Panel({ t }) {
      const [{ status, entries, error }, refresh, setState] = useSchool();
      const [edit, setEdit] = useState(false);
      const [draft, setDraft] = useState('');
      const [saving, setSaving] = useState(false);
      const [tab, setTab] = useState('library');
      const [filter, setFilter] = useState('all');
      const [adding, setAdding] = useState(false);
      const [addAddr, setAddAddr] = useState('');
      const [peerBusy, setPeerBusy] = useState(false);
      const [peerNote, setPeerNote] = useState('');
      const [update, setUpdate] = useState({ busy: false, data: null });

      const checkUpdate = useCallback(async (force) => {
        setUpdate(prev => ({ ...prev, busy: true }));
        try {
          const data = await api('/check-update' + (force ? '?refresh=1' : ''));
          setUpdate({ busy: false, data });
        } catch (err) {
          setUpdate({ busy: false, data: { error: err.message } });
        }
      }, []);

      useEffect(() => { checkUpdate(false); }, [checkUpdate]);

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

      const addPeer = useCallback(async () => {
        const address = addAddr.trim();
        if (!address) return;
        setPeerBusy(true); setPeerNote('');
        try {
          const { peer } = await api('/add-peer', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address }),
          });
          setPeerNote(t('peerAdded', { name: peer.name ?? address }));
          setAddAddr(''); setAdding(false);
          refresh();
        } catch (err) { setPeerNote(err.message); }
        finally { setPeerBusy(false); }
      }, [addAddr, refresh, t]);

      const scanLan = useCallback(async () => {
        setPeerBusy(true); setPeerNote('');
        try {
          const { found } = await api('/scan', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
          });
          setPeerNote(found.length ? t('peerFound', { n: found.length }) : t('peerNone'));
          refresh();
        } catch (err) { setPeerNote(err.message); }
        finally { setPeerBusy(false); }
      }, [refresh, t]);

      const removePeer = useCallback(async (address) => {
        setPeerBusy(true); setPeerNote('');
        try {
          await api('/remove-peer', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address }),
          });
          refresh();
        } catch (err) { setPeerNote(err.message); }
        finally { setPeerBusy(false); }
      }, [refresh]);

      useEffect(() => { if (status?.me) setDraft(status.me.name); }, [status]);

      if (!status) return h('div', { style: S.page }, error ? t('loadFailed', { e: error }) : t('loading'));

      const myId = status.me.id;

      return h('div', { style: S.page },
        h('div', { style: { marginBottom: 24 } },
          h('h1', { style: { fontSize: 22, fontWeight: 600, margin: '0 0 4px' } }, '🐟 ', t('title')),
          h('div', { style: { fontSize: 13, ...S.muted } }, t('subtitle'))
        ),

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
          h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: 12 } },
            h('div', { style: { padding: 10, background: 'var(--dsw-alias-bg-layer-2)', borderRadius: 8 } },
              h('div', { style: { fontSize: 10, textTransform: 'uppercase', marginBottom: 4, ...S.muted } }, t('entries')),
              h('div', { style: { fontSize: 18, fontWeight: 600 } }, status.knowledgeCount)
            ),
            h('div', { style: { padding: 10, background: 'var(--dsw-alias-bg-layer-2)', borderRadius: 8 } },
              h('div', { style: { fontSize: 10, textTransform: 'uppercase', marginBottom: 4, ...S.muted } }, t('port')),
              h('div', { style: { fontSize: 18, fontWeight: 600 } }, status.port)
            ),
            h('div', { style: { padding: 10, background: 'var(--dsw-alias-bg-layer-2)', borderRadius: 8 } },
              h('div', { style: { fontSize: 10, textTransform: 'uppercase', marginBottom: 4, ...S.muted } }, t('version')),
              h('div', { style: { fontSize: 18, fontWeight: 600 } }, 'v', status.version ?? '—')
            )
          ),
          h(VersionNotice, { t, status, update, onCheck: () => checkUpdate(true) })
        ),

        h('div', { style: S.card },
          h('div', { style: { display: 'flex', gap: 6, marginBottom: 12 } },
            [['library', t('knowledge')], ['shares', t('shares')], ['peers', t('peers')]].map(([id, label]) =>
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

          tab === 'library'
            ? h('div', null,
                h(UploadCard, { t, onUploaded: refresh }),
                h(FolderUpload, { t, onUploaded: refresh }),
                h('div', { style: { display: 'flex', gap: 6, marginBottom: 12 } },
                  [['all', t('tabAll')], ['files', '📄 ' + t('tabFiles')], ['conversations', '💬 ' + t('tabConv')]].map(([id, label]) =>
                    h('button', {
                      key: id, onClick: () => setFilter(id),
                      style: { ...S.btn, fontSize: 11,
                        background: filter === id ? 'var(--dsw-alias-brand-primary)' : 'transparent',
                        color: filter === id ? '#fff' : 'var(--dsw-alias-label-primary)',
                        border: filter === id ? 'none' : '1px solid var(--dsw-alias-border-l2)',
                      },
                    }, label)
                  )
                ),
                h(LibraryPanel, { t, filter, myId, onDelete: handleDelete, onToggleVisibility: handleToggleVisibility })
              )
            : tab === 'shares'
              ? h('div', null,
                  h(FolderUpload, { t, onUploaded: refresh }),
                  h(SharesPanel, { t }))
              : h('div', null,
                  h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 8 } },
                    h('h2', { style: { ...S.h2, margin: 0 } }, t('peers'), ' (', status.peers.length, ')'),
                    h('div', { style: { display: 'flex', gap: 6, flexShrink: 0 } },
                      h('button', { style: S.btn, disabled: peerBusy, onClick: scanLan },
                        peerBusy ? t('peerScanning') : t('peerScan')),
                      h('button', {
                        style: S.btn, disabled: peerBusy,
                        onClick: () => { setAdding(v => !v); setPeerNote(''); },
                      }, t('peerAdd'))
                    )
                  ),

                  adding ? h('div', { style: { display: 'flex', gap: 6, marginBottom: 10 } },
                    h('input', {
                      style: S.input, value: addAddr, autoFocus: true, placeholder: t('peerAddrHint'),
                      onChange: e => setAddAddr(e.target.value),
                      onKeyDown: e => {
                        if (e.key === 'Enter') addPeer();
                        if (e.key === 'Escape') setAdding(false);
                      },
                    }),
                    h('button', {
                      style: { ...S.btn, background: 'var(--dsw-alias-brand-primary)', color: '#fff', border: 'none' },
                      disabled: peerBusy || !addAddr.trim(), onClick: addPeer,
                    }, t('save')),
                    h('button', { style: S.btn, onClick: () => setAdding(false) }, t('cancel'))
                  ) : null,

                  peerNote
                    ? h('div', { style: { fontSize: 11.5, ...S.muted, marginBottom: 8 } }, peerNote)
                    : null,

                  status.peers.length
                    ? h('div', null, status.peers.map(peer =>
                        h('div', { key: peer.id, style: { display: 'flex', alignItems: 'center', gap: 10, padding: 8, background: 'var(--dsw-alias-bg-layer-2)', borderRadius: 8, marginBottom: 8 } },
                          h('div', {
                            style: {
                              width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center',
                              justifyContent: 'center', fontSize: 16,
                              background: peer.online === false ? 'var(--dsw-alias-state-idle-primary)' : 'var(--dsw-alias-state-success-primary)',
                            },
                          }, '🐟'),
                          h('div', { style: { flex: 1, minWidth: 0 } },
                            h('div', { style: { fontWeight: 600, fontSize: 13 } }, peer.name),
                            h('div', { style: { fontSize: 11, ...S.muted } },
                              peer.address, ':', peer.port, peer.source ? ` · ${peer.source}` : '')
                          ),
                          h('button', {
                            style: S.btnSmall, disabled: peerBusy,
                            onClick: () => removePeer(peer.address),
                          }, t('peerRemove'))
                        )
                      ))
                    : h('div', { style: { padding: 20, textAlign: 'center', ...S.muted } }, t('noPeers'))
                )
        )
      );
    }

    function FishComposerButton({ inputActions, sessionId, t }) {
      const [open, setOpen] = useState(false);
      const [mode, setMode] = useState('menu'); // menu | pick | share | search
      const [data, setData] = useState({ status: null, entries: [], fish: [] });
      const [scope, setScope] = useState('all');
      const [note, setNote] = useState('');
      const [busy, setBusy] = useState(false);
      const [shareTitle, setShareTitle] = useState('');
      const [shareTags, setShareTags] = useState('');
      const [sharePublic, setSharePublic] = useState(true);
      const [sharing, setSharing] = useState(false);
      const [searchText, setSearchText] = useState('');
      const [searchResults, setSearchResults] = useState([]);
      const [recentRefs, setRecentRefs] = useState([]);
      const [currentFish, setCurrentFish] = useState(null);
      const [currentColl, setCurrentColl] = useState(null);
      const [collItems, setCollItems] = useState([]);
      const wrap = useRef(null);

      useEffect(() => {
        const stored = localStorage.getItem('fish-school-recent-refs');
        if (stored) {
          try {
            setRecentRefs(JSON.parse(stored).slice(0, 5));
          } catch {}
        }
      }, []);

      const addRecentRef = (ref) => {
        const recent = [ref, ...recentRefs.filter(r => r !== ref)].slice(0, 5);
        setRecentRefs(recent);
        localStorage.setItem('fish-school-recent-refs', JSON.stringify(recent));
      };

      const load = useCallback(async () => {
        setBusy(true);
        try {
          const [status, library] = await Promise.all([
            api('/status'),
            api('/library')
          ]);
          setData({ status, entries: [], fish: library.fish || [] });
          setNote('');
        } catch (err) {
          setNote(err.message);
        } finally {
          setBusy(false);
        }
      }, []);

      const search = useCallback(async (text) => {
        if (text.length < 2) {
          setSearchResults([]);
          return;
        }
        setBusy(true);
        try {
          const result = await api('/items?q=' + encodeURIComponent(text) + '&limit=20');
          setSearchResults(result.items || []);
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

      const loadColl = useCallback(async (fish, col) => {
        try {
          const res = await api('/items?fish=' + fish.id + '&collection=' + col.id + '&limit=50');
          setCollItems(res.items || []);
        } catch (err) {
          setNote(err.message);
        }
      }, []);

      const insert = useCallback((entry) => {
        const token = `@${entry.author}/${entry.type}/${entry.id}`;
        addRecentRef(token);
        try {
          const span = inputActions?.captureInsertion?.();
          const result = inputActions?.insertText?.(token + ' ', span);
          if (result === false) { setNote(t('refFailed')); return; }
          setNote(t('refInserted', { ref: token }));
        } catch (err) {
          setNote(err.message);
        }
      }, [inputActions, t]);

      const doSummarize = useCallback(() => {
        try {
          const span = inputActions?.captureInsertion?.();
          const result = inputActions?.insertText?.(t('summarizePrompt'), span);
          if (result === false) { setNote(t('refFailed')); setMode('menu'); return; }
          setOpen(false);
        } catch (err) {
          setNote(err.message);
          setMode('menu');
        }
      }, [inputActions, t]);

      const doShare = useCallback(async () => {
        if (!sessionId) return;
        setSharing(true); setNote('');
        try {
          const { entry } = await api('/share-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, title: shareTitle.trim(), tags: shareTags, isPublic: sharePublic }),
          });
          setNote(`✅ ${entry.title} · ${entry.messageCount} msgs`);
          setShareTitle(''); setShareTags('');
          setMode('menu');
        } catch (err) {
          setNote(err.message);
        } finally { setSharing(false); }
      }, [sessionId, shareTitle, shareTags, sharePublic]);

      const fishList = currentFish
        ? currentFish.collections || []
        : data.fish || [];

      return h('div', { ref: wrap, style: { position: 'relative', display: 'inline-flex' } },
        h('button', {
          type: 'button',
          onClick: () => { setOpen(v => !v); setMode('menu'); setNote(''); },
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
          mode === 'menu'
            ? h('div', null,
                h('div', { style: { fontSize: 11, color: 'var(--dsw-alias-label-secondary)', marginBottom: 6 } }, t('title')),
                [
                  ['pick', '📚', t('menuRef'), t('menuRefDesc')],
                  ['sum', '🧠', t('menuSum'), t('menuSumDesc')],
                  ['share', '💬', t('menuShare'), t('menuShareDesc')],
                ].map(([key, icon, label, desc]) => h('button', {
                  key, type: 'button',
                  onClick: () => {
                    if (key === 'sum') { doSummarize(); return; }
                    setNote('');
                    setSearchText('');
                    setCurrentFish(null);
                    setCurrentColl(null);
                    setSearchResults([]);
                    setMode(key);
                  },
                  style: {
                    display: 'flex', alignItems: 'flex-start', gap: 8, width: '100%',
                    textAlign: 'left', padding: '8px', marginBottom: 2,
                    background: 'transparent', border: 'none', borderRadius: 6,
                    cursor: 'pointer', color: 'var(--dsw-alias-label-primary)',
                  },
                },
                  h('span', { style: { fontSize: 14, flexShrink: 0 } }, icon),
                  h('span', { style: { minWidth: 0, flex: 1 } },
                    h('div', { style: { fontSize: 12.5, fontWeight: 500 } }, label),
                    h('div', { style: { fontSize: 10.5, color: 'var(--dsw-alias-label-secondary)' } }, desc)
                  )
                )),
                note ? h('div', { style: { marginTop: 6, paddingTop: 6, borderTop: '1px solid var(--dsw-alias-border-l1)', fontSize: 10.5, color: 'var(--dsw-alias-label-secondary)' } }, note) : null
              )
            : mode === 'share'
              ? h('div', null,
                  h('div', { style: { fontSize: 11, color: 'var(--dsw-alias-label-secondary)', marginBottom: 6 } }, t('menuShare')),
                  h('input', {
                    style: { ...S.input, width: '100%', boxSizing: 'border-box', marginBottom: 6 },
                    value: shareTitle, placeholder: t('shareFieldTitle'),
                    onChange: e => setShareTitle(e.target.value),
                  }),
                  h('input', {
                    style: { ...S.input, width: '100%', boxSizing: 'border-box', marginBottom: 8 },
                    value: shareTags, placeholder: t('uploadFieldTags'),
                    onChange: e => setShareTags(e.target.value),
                  }),
                  h('label', {
                    style: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, marginBottom: 8, color: 'var(--dsw-alias-label-primary)' },
                  },
                    h('input', { type: 'checkbox', checked: sharePublic, onChange: e => setSharePublic(e.target.checked) }),
                    t('sharePublic')
                  ),
                  !sessionId
                    ? h('div', { style: { fontSize: 11, color: 'var(--dsw-alias-state-warn-primary)', marginBottom: 8 } }, t('noSession'))
                    : null,
                  h('div', { style: { display: 'flex', gap: 6, alignItems: 'center' } },
                    h('button', {
                      type: 'button', onClick: doShare, disabled: sharing || !sessionId,
                      style: {
                        padding: '5px 12px', fontSize: 12, borderRadius: 6, border: 'none',
                        cursor: (sharing || !sessionId) ? 'not-allowed' : 'pointer',
                        background: 'var(--dsw-alias-brand-primary)', color: '#fff',
                        opacity: (sharing || !sessionId) ? 0.5 : 1,
                      },
                    }, sharing ? t('saving') : t('shareGo')),
                    h('button', {
                      type: 'button', onClick: () => { setMode('menu'); setNote(''); },
                      style: S.btnSmall,
                    }, t('cancel')),
                    h('span', { style: { fontSize: 10.5, color: 'var(--dsw-alias-label-secondary)', flex: 1 } }, note || '')
                  )
                )
              : h('div', null,
                  h('div', { style: { marginBottom: 8 } },
                    h('input', {
                      type: 'text', autoFocus: true,
                      style: { ...S.input, width: '100%', boxSizing: 'border-box' },
                      placeholder: t('refSearchPlaceholder'),
                      value: searchText,
                      onChange: e => {
                        setSearchText(e.target.value);
                        search(e.target.value);
                      },
                    })
                  ),

                  currentFish && h('div', { style: { fontSize: 11, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 } },
                    h('button', {
                      style: { ...S.btnSmall, border: 'none', cursor: 'pointer', color: 'var(--dsw-alias-brand-primary)' },
                      onClick: () => { setCurrentFish(null); setCurrentColl(null); }
                    }, t('refBack')),
                    '  ', currentFish.name
                  ),

                  currentColl && h('div', { style: { fontSize: 11, marginBottom: 8 } },
                    `${t('browseFish')}: ${currentFish.name} / ${currentColl.name}`
                  ),

                  searchText.length >= 2 && searchResults.length > 0
                    ? h('div', null, searchResults.slice(0, 15).map(item =>
                        h('button', {
                          key: item.id, type: 'button', onClick: () => insert(item),
                          style: {
                            display: 'flex', alignItems: 'flex-start', gap: 6, width: '100%',
                            textAlign: 'left', padding: '7px 8px', marginBottom: 2,
                            background: 'transparent', border: 'none', borderRadius: 6,
                            cursor: 'pointer', color: 'var(--dsw-alias-label-primary)', fontSize: 11,
                          },
                        },
                          h('span', { style: { flexShrink: 0 } },
                            item.type === 'conversation' ? '💬' : '📄'),
                          h('span', { style: { minWidth: 0, flex: 1 } },
                            h('div', { style: { fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } },
                              item.type === 'conversation' ? item.title : item.summary),
                            h('div', { style: { fontSize: 10, color: 'var(--dsw-alias-label-secondary)' } },
                              item.peerName ? item.peerName : item.author)
                          )
                        )
                      ))
                    : !searchText && currentColl && collItems.length > 0
                      ? h('div', null, collItems.slice(0, 15).map(item =>
                          h('button', {
                            key: item.id, type: 'button', onClick: () => insert(item),
                            style: {
                              display: 'flex', alignItems: 'flex-start', gap: 6, width: '100%',
                              textAlign: 'left', padding: '7px 8px', marginBottom: 2,
                              background: 'transparent', border: 'none', borderRadius: 6,
                              cursor: 'pointer', color: 'var(--dsw-alias-label-primary)', fontSize: 11,
                            },
                          },
                            h('span', { style: { flexShrink: 0 } }, item.type === 'conversation' ? '💬' : '📄'),
                            h('span', { style: { minWidth: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } },
                              item.type === 'conversation' ? item.title : item.summary)
                          )
                        ))
                    : !searchText && recentRefs.length > 0
                      ? h('div', null,
                          h('div', { style: { fontSize: 11, fontWeight: 500, marginBottom: 6, color: 'var(--dsw-alias-label-secondary)' } }, t('recentRefs')),
                          recentRefs.map(ref => h('div', {
                            key: ref, style: { fontSize: 10, padding: '4px 8px', marginBottom: 2, cursor: 'pointer',
                              background: 'var(--dsw-alias-bg-layer-2)', borderRadius: 4 },
                            onClick: () => {
                              try {
                                const span = inputActions?.captureInsertion?.();
                                inputActions?.insertText?.(ref + ' ', span);
                              } catch {}
                            }
                          }, ref))
                        )
                      : !searchText && !currentFish
                        ? h('div', null,
                            h('div', { style: { fontSize: 11, fontWeight: 500, marginBottom: 6, color: 'var(--dsw-alias-label-secondary)' } }, t('browseFish')),
                            fishList.slice(0, 10).map(fish => h('button', {
                              key: fish.id, type: 'button',
                              onClick: () => setCurrentFish(fish),
                              style: {
                                width: '100%', textAlign: 'left', padding: '6px 8px', marginBottom: 2,
                                background: 'transparent', border: 'none', borderRadius: 6,
                                cursor: 'pointer', color: 'var(--dsw-alias-label-primary)', fontSize: 11,
                              },
                            }, '🐟 ', fish.name, ' · ', fish.itemCount))
                          )
                        : currentFish && !currentColl
                          ? h('div', null, (currentFish.collections || []).slice(0, 10).map(col => h('button', {
                              key: col.id, type: 'button',
                              onClick: () => { setCurrentColl(col); loadColl(currentFish, col); },
                              style: {
                                width: '100%', textAlign: 'left', padding: '6px 8px', marginBottom: 2,
                                background: 'transparent', border: 'none', borderRadius: 6,
                                cursor: 'pointer', color: 'var(--dsw-alias-label-primary)', fontSize: 11,
                              },
                            }, '📁 ', col.name, ' · ', col.itemCount))
                          )
                          : null,

                  h('div', {
                    style: {
                      marginTop: 6, paddingTop: 6, borderTop: '1px solid var(--dsw-alias-border-l1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                    },
                  },
                    h('span', { style: { fontSize: 10.5, color: 'var(--dsw-alias-label-secondary)', flex: 1 } },
                      note || t('refHint2')),
                    h('button', {
                      type: 'button', onClick: () => { setMode('menu'); setNote(''); },
                      style: S.btnSmall,
                    }, t('cancel')),
                    h('button', {
                      type: 'button', onClick: () => setOpen(false),
                      style: {
                        padding: '3px 10px', fontSize: 11, borderRadius: 4, cursor: 'pointer',
                        border: '1px solid var(--dsw-alias-border-l2)', background: 'transparent',
                        color: 'var(--dsw-alias-label-primary)',
                      },
                    }, t('refDone'))
                  )
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
            (props) => h(FishComposerButton, { inputActions: props.inputActions, sessionId: props.sessionId, t })
          )
        );

        let layout = null;
        ctx.inject?.(['layout'], (scoped) => { layout = scoped.layout; });

        const sidebarGate = createGate(() => {
          const offRow = ctx.slots.register(
            { name: 'sidebar.panellist', id: NS, order: 15, label: () => t('title') },
            props => h(Icon, props));
          const offPanel = ctx.slots.register(
            { name: 'main', key: NS }, () => h(Panel, { t }));
          return () => {
            try {
              if (layout?.panelInfo?.getSnapshot?.().activePanelId === NS) layout.selectPanel(null);
            } catch { /* layout is optional */ }
            if (typeof offRow === 'function') offRow();
            if (typeof offPanel === 'function') offPanel();
          };
        }, false);

        const state = { enabled: true, busy: false, error: null };
        const listeners = new Set();
        const emit = () => { for (const fn of listeners) fn(); };
        const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
        const snapshot = () => ({ ...state });

        function applySidebar(enabled) {
          state.enabled = Boolean(enabled);
          sidebarGate.setVisible(state.enabled);
          emit();
        }

        async function loadSettings() {
          try {
            const settings = await api('/settings');
            applySidebar(settings.sidebarEnabled !== false);
          } catch (err) {
            console.warn('[fish-school] cannot read settings, showing the sidebar entry:', err.message);
            applySidebar(true);
          }
        }

        async function setSidebar(enabled) {
          state.busy = true; state.error = null; emit();
          const previous = state.enabled;
          applySidebar(enabled);
          try {
            const saved = await api('/settings', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sidebarEnabled: Boolean(enabled) }),
            });
            applySidebar(saved.sidebarEnabled !== false);
          } catch (err) {
            state.error = err.message;
            applySidebar(previous);
          } finally {
            state.busy = false; emit();
          }
        }

        ctx.slots.inject('sidebar.panellist', () => sidebarGate.available());
        loadSettings();

        function SettingsSection() {
          const [snap, setSnap] = useState(snapshot);
          const [status, setStatus] = useState({ version: null, updateRepo: null });
          const [update, setUpdate] = useState({ data: null, busy: false, error: null });
          useEffect(() => {
            const off = subscribe(() => setSnap(snapshot()));
            return off;
          }, []);
          useEffect(() => {
            let alive = true;
            api('/status').then(s => { if (alive) setStatus(s); }).catch(() => {});
            return () => { alive = false; };
          }, []);
          const check = useCallback(async (refresh = false) => {
            setUpdate(u => ({ ...u, busy: true, error: null }));
            try {
              const data = await api('/check-update' + (refresh ? '?refresh=1' : ''));
              setUpdate({ data, busy: false, error: data.error ?? null });
            } catch (err) {
              setUpdate({ data: null, busy: false, error: err.message });
            }
          }, []);
          useEffect(() => { check(false); }, [check]);
          return h(SettingsCard, {
            t, status, update,
            onCheck: () => check(true),
            sidebar: snap,
            onToggleSidebar: (enabled) => { setSidebar(enabled); },
          });
        }

        ctx.slots.inject('settings.section', () =>
          ctx.slots.register({
            name: 'settings.section', id: NS, order: 45, label: () => t('title'), locale: NS,
            inject: () => ({ t }),
          }, () => h(SettingsSection, null))
        );
      },
    };
  },
});

