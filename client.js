// Fish School client: sidebar icon + main panel (my fish, knowledge library, peers, shares).
window.__ModuleLoader__.load({
  id: '@local/fish-school',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const { useState, useEffect, useCallback, useRef, useMemo } = React;
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
        preview: 'Preview', previewClose: 'Close', previewLoading: 'Loading…', previewError: 'Cannot load content',
        previewRendered: 'Rendered', previewRaw: 'Source',
        tabManual: 'Manual', tabFolder: 'Folders', tabProject: 'Projects',
        folderSyncHint: '🔄 Auto-sync changes', projectSyncHint: '🔄 Auto-sync sessions',
        updateRestart: 'Update complete! Please restart DSH or <a href="javascript:location.reload()" style="color:var(--dsw-alias-brand-primary);text-decoration:underline">reload this page</a>.',
        searchPlaceholder: 'Search title, path, tags…', searchClear: 'Clear',
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
        updateBtn: '一键更新', updating: '更新中…', updateDone: '更新完成！页面将自动刷新...',
        recentRefs: '最近引用', browseFish: '按鱼浏览', refBack: '← 全部鱼', refSearchPlaceholder: '搜索…',
        offline: '离线', shareManual: '手动', shareUpload: '上传', shareName: '名称', noShares: '还没有共享单元。',
        refNoMatch: '没有匹配项', refKeys: '↑↓ 选择 · Enter 插入 · Esc 关闭',
        preview: '预览', previewClose: '关闭', previewLoading: '加载中…', previewError: '无法加载内容',
        previewRendered: '渲染', previewRaw: '原文',
        tabManual: '手动发布', tabFolder: '文件夹', tabProject: '项目会话',
        folderSyncHint: '🔄 自动监控文件变化', projectSyncHint: '🔄 自动同步会话',
        updateRestart: '更新完成！页面即将刷新以加载新版本...',
        searchPlaceholder: '搜索标题、路径、标签…', searchClear: '清空',
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

    // ===== Markdown rendering (file preview) =====
    // Small self-contained renderer: headings, emphasis, inline code, fences,
    // lists (nested), blockquotes, tables, links, images and rules. No deps and
    // no raw HTML passthrough, so shared files cannot inject markup.
    const MD_CSS = `
.fs-md{font-size:13.5px;line-height:1.75;color:var(--dsw-alias-label-primary);word-wrap:break-word;overflow-wrap:anywhere}
.fs-md > :first-child{margin-top:0}
.fs-md > :last-child{margin-bottom:0}
.fs-md h1,.fs-md h2,.fs-md h3,.fs-md h4,.fs-md h5,.fs-md h6{margin:20px 0 10px;line-height:1.35;font-weight:650}
.fs-md h1{font-size:1.55em;padding-bottom:.3em;border-bottom:1px solid var(--dsw-alias-border-l1)}
.fs-md h2{font-size:1.3em;padding-bottom:.25em;border-bottom:1px solid var(--dsw-alias-border-l1)}
.fs-md h3{font-size:1.15em}
.fs-md h4{font-size:1.05em}
.fs-md h5,.fs-md h6{font-size:1em;color:var(--dsw-alias-label-secondary)}
.fs-md p{margin:10px 0;white-space:pre-wrap}
.fs-md a{color:var(--dsw-alias-brand-primary);text-decoration:underline}
.fs-md strong{font-weight:650}
.fs-md code{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:.9em;padding:1px 5px;border-radius:4px;background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l1)}
.fs-md pre{margin:12px 0;padding:12px 14px;border-radius:8px;overflow:auto;background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l1)}
.fs-md pre code{padding:0;border:none;background:none;font-size:12.5px;line-height:1.6;white-space:pre}
.fs-md ul,.fs-md ol{margin:10px 0;padding-left:26px}
.fs-md li{margin:4px 0}
.fs-md li > ul,.fs-md li > ol{margin:4px 0}
.fs-md blockquote{margin:12px 0;padding:6px 14px;border-left:3px solid color-mix(in srgb,var(--dsw-alias-brand-primary) 45%,transparent);background:color-mix(in srgb,var(--dsw-alias-brand-primary) 6%,transparent);color:var(--dsw-alias-label-secondary);border-radius:0 6px 6px 0}
.fs-md blockquote p{margin:4px 0}
.fs-md hr{border:none;border-top:1px solid var(--dsw-alias-border-l1);margin:18px 0}
.fs-md img{max-width:100%;border-radius:6px}
.fs-md .fs-md-tablewrap{overflow:auto;margin:12px 0}
.fs-md table{border-collapse:collapse;font-size:12.5px;min-width:60%}
.fs-md th,.fs-md td{border:1px solid var(--dsw-alias-border-l1);padding:6px 10px;text-align:left;vertical-align:top}
.fs-md th{background:var(--dsw-alias-bg-layer-2);font-weight:600}
.fs-md tr:nth-child(2n) td{background:color-mix(in srgb,var(--dsw-alias-bg-layer-2) 55%,transparent)}
`;

    function useMdStyles() {
      useEffect(() => {
        let el = document.getElementById('fs-md-css');
        if (!el) { el = document.createElement('style'); el.id = 'fs-md-css'; document.head.appendChild(el); }
        el.textContent = MD_CSS;
      }, []);
    }

    function mdSafeUrl(url) {
      const u = String(url ?? '').trim();
      return /^(https?:\/\/|mailto:|#|\/|\.{1,2}\/)/i.test(u) ? u : '';
    }

    function mdInline(text, kp) {
      const src = String(text ?? '');
      const re = /(\*\*\*[^*\n]+\*\*\*|`[^`\n]+`|\*\*[^*\n]+\*\*|__[^_\n]+__|~~[^~\n]+~~|\*[^*\n]+\*|_[^_\n]+_|!\[[^\]\n]*\]\([^)\n]+\)|\[[^\]\n]+\]\([^)\n]+\)|<https?:\/\/[^>\s]+>|https?:\/\/[^\s<>()]+)/g;
      const out = [];
      let last = 0, m, n = 0;
      while ((m = re.exec(src)) !== null) {
        if (m.index > last) out.push(src.slice(last, m.index));
        const tok = m[0];
        const key = kp + ':' + (n++);
        if (tok[0] === '`') {
          out.push(h('code', { key }, tok.slice(1, -1)));
        } else if (tok.startsWith('***')) {
          out.push(h('strong', { key }, h('em', null, mdInline(tok.slice(3, -3), key))));
        } else if (tok.startsWith('**') || tok.startsWith('__')) {
          out.push(h('strong', { key }, mdInline(tok.slice(2, -2), key)));
        } else if (tok.startsWith('~~')) {
          out.push(h('del', { key }, mdInline(tok.slice(2, -2), key)));
        } else if (tok[0] === '*' || tok[0] === '_') {
          out.push(h('em', { key }, mdInline(tok.slice(1, -1), key)));
        } else if (tok.startsWith('![')) {
          const mm = /^!\[([^\]]*)\]\(([^)]+)\)$/.exec(tok);
          const url = mdSafeUrl(mm?.[2]);
          out.push(url
            ? h('img', { key, src: url, alt: mm?.[1] ?? '', loading: 'lazy' })
            : h('span', { key }, mm?.[1] ?? ''));
        } else if (tok[0] === '[') {
          const mm = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(tok);
          const url = mdSafeUrl(mm?.[2]);
          out.push(url
            ? h('a', { key, href: url, target: '_blank', rel: 'noreferrer' }, mdInline(mm?.[1] ?? '', key))
            : h('span', { key }, mm?.[1] ?? tok));
        } else {
          const url = tok.replace(/^<|>$/g, '');
          out.push(h('a', { key, href: url, target: '_blank', rel: 'noreferrer' }, url));
        }
        last = m.index + tok.length;
      }
      if (last < src.length) out.push(src.slice(last));
      return out;
    }

    function mdSplitRow(line) {
      return String(line).trim().replace(/^\|/, '').replace(/\|$/, '').split(/(?<!\\)\|/).map(c => c.trim().replace(/\\\|/g, '|'));
    }

    const MD_BLOCK_START = /^(\s*(#{1,6})\s|\s*>|\s*(```|~~~)|\s*([-*+]|\d+[.)])\s)/;
    const MD_HR = /^\s{0,3}((\*\s*){3,}|(-\s*){3,}|(_\s*){3,})$/;
    const MD_LI = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;

    function mdRender(src) {
      const lines = String(src ?? '').replace(/\r\n?/g, '\n').replace(/\t/g, '    ').split('\n');
      const nodes = [];
      let i = 0, key = 0;
      const nextKey = () => 'md' + (key++);
      // Skip YAML/TOML frontmatter — it is metadata, not document body.
      if (lines[0]?.trim() === '---') {
        for (let j = 1; j < Math.min(lines.length, 80); j++) {
          if (/^(---|\.\.\.)\s*$/.test(lines[j])) {
            if (/^[\w-]+\s*:/m.test(lines.slice(1, j).join('\n'))) i = j + 1;
            break;
          }
        }
      }
      while (i < lines.length) {
        const line = lines[i];
        if (!line.trim()) { i++; continue; }

        // fenced code
        const fence = /^\s*(`{3,}|~{3,})\s*([^`\n]*)$/.exec(line);
        if (fence) {
          const info = (fence[2] || '').trim().split(/\s+/)[0];
          const close = new RegExp('^\\s*' + fence[1][0].repeat(3) + '\\s*$');
          const buf = [];
          i++;
          while (i < lines.length && !close.test(lines[i])) { buf.push(lines[i]); i++; }
          i++;
          nodes.push(h('pre', { key: nextKey() },
            h('code', { className: info ? 'language-' + info : '' }, buf.join('\n'))));
          continue;
        }

        // heading
        const hd = /^(#{1,6})\s+(.*?)\s*#*\s*$/.exec(line);
        if (hd) {
          const lvl = hd[1].length;
          nodes.push(h('h' + lvl, { key: nextKey() }, mdInline(hd[2], nextKey())));
          i++; continue;
        }

        // horizontal rule
        if (MD_HR.test(line)) { nodes.push(h('hr', { key: nextKey() })); i++; continue; }

        // blockquote
        if (/^\s{0,3}>/.test(line)) {
          const buf = [];
          while (i < lines.length && /^\s{0,3}>/.test(lines[i])) {
            buf.push(lines[i].replace(/^\s{0,3}>\s?/, ''));
            i++;
          }
          nodes.push(h('blockquote', { key: nextKey() }, mdRender(buf.join('\n'))));
          continue;
        }

        // table (header row + delimiter row)
        if (line.includes('|') && i + 1 < lines.length
          && /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(lines[i + 1])) {
          const head = mdSplitRow(line);
          const aligns = mdSplitRow(lines[i + 1]).map(c =>
            /^:-+:$/.test(c) ? 'center' : /^:-+$/.test(c) ? 'left' : /^-+:$/.test(c) ? 'right' : '');
          if (aligns.length !== head.length) { // not a table: fall through to a paragraph
          } else {
            i += 2;
            const rows = [];
            while (i < lines.length && lines[i].trim() && lines[i].includes('|')) {
              rows.push(mdSplitRow(lines[i]));
              i++;
            }
            const cell = (tag, text, ci, rk) => h(tag, {
              key: rk + ':' + ci,
              style: aligns[ci] ? { textAlign: aligns[ci] } : undefined,
            }, mdInline(text ?? '', rk + ':' + ci));
            nodes.push(h('div', { key: nextKey(), className: 'fs-md-tablewrap' },
              h('table', null,
                h('thead', null, h('tr', null, head.map((c, ci) => cell('th', c, ci, 'h')))),
                h('tbody', null, rows.map((r, ri) => h('tr', { key: 'r' + ri },
                  head.map((_, ci) => cell('td', r[ci], ci, 'r' + ri))))))));
            continue;
          }
        }

        // list (with nested indentation)
        const firstLi = MD_LI.exec(line);
        if (firstLi) {
          const baseIndent = firstLi[1].length;
          const ordered = /\d/.test(firstLi[2]);
          const items = [];
          while (i < lines.length) {
            const m = MD_LI.exec(lines[i]);
            if (m) {
              if (m[1].length < baseIndent) break;
              if (m[1].length === baseIndent && /\d/.test(m[2]) !== ordered) break; // <ul> vs <ol>
              if (m[1].length > baseIndent) {
                if (!items.length) break;
                // Collect the nested block up to the next item at <= baseIndent.
                const nested = [];
                let j = i;
                while (j < lines.length) {
                  const nm = MD_LI.exec(lines[j]);
                  if (nm && nm[1].length <= baseIndent) break;
                  if (!lines[j].trim()) {
                    // keep nested block together only while it continues
                    let k = j + 1;
                    while (k < lines.length && !lines[k].trim()) k++;
                    const km = MD_LI.exec(lines[k] ?? '');
                    if (!(km && km[1].length > baseIndent)) break;
                  }
                  nested.push(lines[j]);
                  j++;
                }
                items[items.length - 1].children = items[items.length - 1].children.concat(mdRender(nested.join('\n')));
                i = j;
                continue;
              }
              items.push({ text: m[3], children: [] });
              i++;
              continue;
            }
            if (!lines[i].trim()) {
              let j = i + 1;
              while (j < lines.length && !lines[j].trim()) j++;
              const nm = MD_LI.exec(lines[j] ?? '');
              if (nm && nm[1].length >= baseIndent) {
                if (nm[1].length === baseIndent && /\d/.test(nm[2]) !== ordered) break; // list kind changed
                i = j; continue;
              }
              break;
            }
            if (items.length && /^\s{2,}/.test(lines[i])) {
              items[items.length - 1].text += '\n' + lines[i].trim();
              i++;
              continue;
            }
            break;
          }
          nodes.push(h(ordered ? 'ol' : 'ul', { key: nextKey() },
            items.map((it, idx) => {
              const children = [];
              it.text.split('\n').forEach((ln, li2) => {
                if (li2) children.push(h('br', { key: 'br' + idx + '-' + li2 }));
                children.push(...mdInline(ln, 'li' + idx + '-' + li2));
              });
              return h('li', { key: 'i' + idx }, children, it.children);
            })));
          continue;
        }

        // paragraph
        const para = [line];
        i++;
        while (i < lines.length && lines[i].trim() && !MD_BLOCK_START.test(lines[i])
          && !MD_HR.test(lines[i]) && !MD_LI.test(lines[i])) {
          para.push(lines[i]);
          i++;
        }
        nodes.push(h('p', { key: nextKey() }, mdInline(para.join('\n'), nextKey())));
      }
      return nodes;
    }

    function mdLooksLike(text) {
      if (typeof text !== 'string' || !text.trim()) return false;
      const s = text.slice(0, 20000);
      let score = 0;
      // A lone "# comment" line is common in code and configs, so a heading
      // alone must not be enough: require one more structural marker.
      if (/^#{1,6}\s+\S/m.test(s)) score += 2;
      if (/^\s*```/m.test(s)) score += 1;
      if (/^[-*+]\s+\S/m.test(s)) score += 1;
      if (/^\d+[.)]\s+\S/m.test(s)) score += 1;
      if (/\[[^\]\n]+\]\([^)\n]+\)/.test(s)) score += 1;
      if (/^\s*\|.+\|\s*$/m.test(s)) score += 1;
      if (/^>\s+\S/m.test(s)) score += 1;
      if (/\*\*[^*\n]+\*\*/.test(s)) score += 1;
      return score >= 3;
    }

    function isMarkdownItem(item, data) {
      if (!item || item.type === 'conversation') return false;
      const names = [item.name, item.path, data?.item?.name, data?.item?.path, data?.item?.summary]
        .filter(v => typeof v === 'string' && v);
      for (const nm of names) {
        if (/\.(md|markdown|mdown|mdx)$/i.test(nm.trim())) return true;
      }
      return mdLooksLike(data?.content);
    }

    // Preview Modal Component
    function PreviewModal({ item, onClose, t }) {
      const [data, setData] = useState(null);
      const [loading, setLoading] = useState(true);
      const [raw, setRaw] = useState(false);
      useMdStyles();

      useEffect(() => {
        const fishId = item.remote ? item.authorId : '';
        api(`/item?id=${item.id}&fish=${fishId}`)
          .then(res => {
            setData(res);
            setLoading(false);
          })
          .catch(err => {
            setData({ error: err.message });
            setLoading(false);
          });
      }, [item]);

      const markdown = Boolean(data?.content) && isMarkdownItem(item, data);
      const showRendered = markdown && !raw;
      const bodyStyle = { maxHeight: '62vh', overflowY: 'auto', paddingRight: 6 };

      const renderContent = () => {
        if (loading) return h('div', { style: { textAlign: 'center', padding: 40 } }, t('previewLoading'));
        if (data?.error) return h('div', { style: { color: 'var(--dsw-alias-state-error-primary)', padding: 20 } }, t('previewError') + ': ' + data.error);

        if (data?.messages && Array.isArray(data.messages)) {
          return h('div', { style: bodyStyle },
            data.messages.map((msg, idx) =>
              h('div', { key: idx, style: { marginBottom: 16, padding: 12, background: 'var(--dsw-alias-bg-layer-2)', borderRadius: 8 } },
                h('div', { style: { fontSize: 11, ...S.muted, marginBottom: 6, textTransform: 'uppercase' } }, msg.role),
                h('pre', { style: { whiteSpace: 'pre-wrap', fontSize: 13, margin: 0, fontFamily: 'inherit' } }, msg.text)
              )
            )
          );
        }

        if (data?.content) {
          return h('div', { style: bodyStyle },
            showRendered
              ? h('div', { className: 'fs-md' }, mdRender(data.content))
              : h('pre', { style: { whiteSpace: 'pre-wrap', fontSize: 13, margin: 0 } }, data.content)
          );
        }

        return h('div', { style: { ...S.muted, padding: 20, textAlign: 'center' } }, t('noKnowledge'));
      };

      return h('div', {
        style: {
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.75)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 9999
        },
        onClick: onClose
      },
        h('div', {
          style: {
            background: 'var(--dsw-alias-bg-base)', borderRadius: 12,
            padding: 24, width: markdown ? 'min(900px, 92vw)' : 'min(720px, 90vw)',
            maxHeight: '88%', overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column',
          },
          onClick: e => e.stopPropagation()
        },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid var(--dsw-alias-border-l1)' } },
            h('span', { style: { fontSize: 20 } }, item.type === 'conversation' ? '💬' : item.type === 'file' ? '📎' : '📄'),
            h('h3', { style: { margin: 0, flex: 1, fontSize: 16, fontWeight: 600, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, itemTitle(item)),
            markdown && h('span', { style: { display: 'inline-flex', gap: 2, padding: 2, borderRadius: 6, background: 'var(--dsw-alias-bg-layer-2)', flexShrink: 0 } },
              h('button', {
                type: 'button', onClick: () => setRaw(false),
                style: { ...S.btnSmall, border: 'none', background: raw ? 'transparent' : 'var(--dsw-alias-bg-base)', color: raw ? 'var(--dsw-alias-label-secondary)' : 'var(--dsw-alias-label-primary)' },
              }, t('previewRendered')),
              h('button', {
                type: 'button', onClick: () => setRaw(true),
                style: { ...S.btnSmall, border: 'none', background: raw ? 'var(--dsw-alias-bg-base)' : 'transparent', color: raw ? 'var(--dsw-alias-label-primary)' : 'var(--dsw-alias-label-secondary)' },
              }, t('previewRaw'))),
            h('button', { style: { ...S.btn, padding: '4px 12px', flexShrink: 0 }, onClick: onClose }, t('previewClose'))
          ),
          h('div', { style: { fontSize: 12, ...S.muted, marginBottom: 12 } },
            item.author, item.path ? ` · ${item.path}` : '', item.messageCount ? ` · ${item.messageCount} msgs` : ''
          ),
          renderContent()
        )
      );
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
                  setUpdateMsg(t('updateRestart'));
                  setIsUpdating(false);
                  // 触发页面刷新以加载新版本
                  setTimeout(() => location.reload(), 1500);
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

    function CollectionItems({ t, fishId, colId, filter, myId, reloadKey, onDelete, onToggleVisibility, onPreview, colKind, searchQuery }) {
      const [list, setList] = useState({ items: [], cursor: null, done: false, busy: false, error: '' });
      const [start, setStart] = useState(0);
      const busyRef = useRef(false);
      
      // 根据新的 Tab 筛选逻辑过滤条目
      const filterBySource = (items) => {
        if (filter === 'all') return items;
        if (filter === 'manual') return items.filter(i => !colKind || colKind === 'manual');
        if (filter === 'folders') return items.filter(i => colKind === 'folder');
        if (filter === 'projects') return items.filter(i => colKind === 'project');
        return items;
      };
      
      // 搜索过滤
      const filterBySearch = (items) => {
        if (!searchQuery || !searchQuery.trim()) return items;
        const q = searchQuery.toLowerCase();
        return items.filter(item => {
          const searchableText = [
            item.title, item.summary, item.name, item.path, item.excerpt, item.author,
            ...(item.tags || [])
          ].filter(Boolean).join(' ').toLowerCase();
          return searchableText.includes(q);
        });
      };

      const loadPage = useCallback(async (cursor, reset) => {
        if (busyRef.current) return;
        busyRef.current = true;
        setList(p => ({ ...p, busy: true }));
        try {
          const q = new URLSearchParams({ fish: fishId, collection: colId, limit: '50' });
          if (cursor) q.set('cursor', cursor);
          const r = await api('/items?' + q.toString());
          setList(p => ({ items: (reset ? [] : p.items).concat(r.items || []), cursor: r.nextCursor || null,
            done: !r.nextCursor, busy: false, error: '' }));
        } catch (err) {
          setList(p => ({ ...p, busy: false, error: err.message }));
        } finally { busyRef.current = false; }
      }, [fishId, colId]);

      useEffect(() => { setStart(0); loadPage(null, true); }, [loadPage, reloadKey]);

      const shown = filterBySearch(filterBySource(list.items));
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
          h('button', { style: S.btnSmall, title: t('preview'), onClick: (e) => { e.stopPropagation(); onPreview?.(item); } }, '👁️'),
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


    function LibraryPanel({ t, filter, myId, onDelete, onToggleVisibility, onPreview }) {
      const [state] = useLibrary();
      const [collapsedFish, setCollapsedFish] = useState(new Set());
      const [collapsedCol, setCollapsedCol] = useState(new Set());
      const [reload, setReload] = useState(0);
      const [searchQuery, setSearchQuery] = useState('');
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

      // Filter groups and collections by search query
      const normalizedQuery = searchQuery.trim().toLowerCase();
      const matchesSearch = (text) => !normalizedQuery || String(text || '').toLowerCase().includes(normalizedQuery);
      
      const filteredGroups = normalizedQuery ? state.groups.map(fish => {
        const matchingCols = fish.collections.filter(col => 
          matchesSearch(col.name) || matchesSearch(col.kind)
        );
        return matchingCols.length > 0 ? { ...fish, collections: matchingCols } : null;
      }).filter(Boolean) : state.groups;

      return h('div', null,
        h('div', { style: { display: 'flex', gap: 6, marginBottom: 12, alignItems: 'center' } },
          h('input', {
            type: 'text',
            style: { ...S.input, flex: 1 },
            placeholder: t('searchPlaceholder'),
            value: searchQuery,
            onChange: e => setSearchQuery(e.target.value),
          }),
          searchQuery && h('button', {
            style: { ...S.btnSmall, padding: '6px 10px' },
            onClick: () => setSearchQuery(''),
          }, '✕ ' + t('searchClear'))
        ),
        filteredGroups.map(fish =>
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
                  col.kind === 'folder' && h('span', { style: { ...S.tag, fontSize: 9, color: 'var(--dsw-alias-state-success-primary)' }, title: t('folderSyncHint') }, '🔄'),
                  col.kind === 'project' && h('span', { style: { ...S.tag, fontSize: 9, color: 'var(--dsw-alias-state-success-primary)' }, title: t('projectSyncHint') }, '🔄'),
                  col.kind !== 'manual' && col.visibility !== 'public' && h('span', { style: { ...S.tag, fontSize: 10 } }, t('private'))
                ),
                !colShut(fish.id + '/' + col.id) && h(CollectionItems, {
                  t, fishId: fish.id, colId: col.id, filter, myId, reloadKey: reload,
                  onDelete: del, onToggleVisibility: vis, onPreview, colKind: col.kind,
                  searchQuery: normalizedQuery,
                })
              )
            )
          )
        )
      ));
    }


        // ---- 2.6.0 helpers: folder tree, folder picker, project picker ----
    const V3_KIND_LABEL = { folder: '共享文件夹', project: '共享会话', manual: '手动共享', upload: '手动共享' };
    const V3_KIND_ICON = { folder: '📁', project: '🗂️', manual: '✍️', upload: '✍️' };

    // Nest items by their relative path ("a/b/c.md" -> a > b > c.md).
    function v3Tree(items) {
      const root = { dirs: new Map(), files: [], count: 0 };
      for (const it of items) {
        const parts = it.type === 'file' ? String(it.path || '').replace(/\\/g, '/').split('/').filter(Boolean) : [];
        let node = root; node.count++;
        for (const seg of parts.slice(0, -1)) {
          if (!node.dirs.has(seg)) node.dirs.set(seg, { dirs: new Map(), files: [], count: 0 });
          node = node.dirs.get(seg); node.count++;
        }
        node.files.push(it);
      }
      return root;
    }

    function V3Dialog({ title, onClose, footer, children }) {
      useEffect(() => {
        const onKey = e => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
      }, [onClose]);
      return h('div', { className: 'fs3-mask', onClick: onClose },
        h('div', { className: 'fs3-dlg', onClick: e => e.stopPropagation() },
          h('div', { className: 'fs3-dlg-h' }, title,
            h('button', { className: 'fs3-btn', style: { marginLeft: 'auto', padding: '2px 8px' }, onClick: onClose }, '✕')),
          h('div', { className: 'fs3-dlg-b' }, children),
          footer && h('div', { className: 'fs3-dlg-f' }, footer)));
    }

    // Browse the local disk through GET /fs/list and return an absolute folder path.
    function V3FolderPicker({ initial, onPick, onClose }) {
      const [st, setSt] = useState({ path: '', parent: null, dirs: [], loading: true, error: '', truncated: false });
      const [typed, setTyped] = useState(initial || '');
      const go = useCallback(async p => {
        setSt(s => ({ ...s, loading: true, error: '' }));
        try {
          const d = await api('/fs/list?path=' + encodeURIComponent(p || ''));
          setSt({ path: d.path || '', parent: d.parent ?? null, dirs: d.dirs || [], loading: false, error: '', truncated: !!d.truncated });
          setTyped(d.path || '');
        } catch (err) { setSt(s => ({ ...s, loading: false, error: err.message })); }
      }, []);
      useEffect(() => { go(initial || ''); }, [go, initial]);
      return h(V3Dialog, {
        title: '📂 选择要共享的文件夹', onClose,
        footer: h(React.Fragment, null,
          h('span', { className: 'fs3-card-sub', style: { flex: 1, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, st.path || '请选择一个文件夹'),
          h('button', { className: 'fs3-btn', onClick: onClose }, '取消'),
          h('button', { className: 'fs3-btn primary', disabled: !st.path, onClick: () => onPick(st.path) }, '选择此文件夹')),
      },
        h('div', { style: { display: 'flex', gap: 6, marginBottom: 8 } },
          h('button', { className: 'fs3-btn', disabled: !st.path, title: '上一级', onClick: () => go(st.parent || '') }, '↑ 上一级'),
          h('button', { className: 'fs3-btn', onClick: () => go('') }, '🏠 常用位置'),
          h('input', { className: 'fs3-in', value: typed, placeholder: '输入路径后回车', onChange: e => setTyped(e.target.value),
            onKeyDown: e => { if (e.key === 'Enter') go(typed.trim()); } })),
        st.error ? h('div', { className: 'fs3-err' }, st.error)
        : st.loading ? h('div', { className: 'fs3-empty' }, '加载中…')
        : !st.dirs.length ? h('div', { className: 'fs3-empty' }, '这里没有子文件夹，可直接选择当前文件夹')
        : st.dirs.map(d => h('div', { key: d.path, className: 'fs3-row', title: d.path, onClick: () => go(d.path) },
            h('span', null, d.drive ? '💽' : d.shortcut ? '⭐' : '📁'), h('span', { style: { flex: 1 } }, d.name), h('span', { className: 'fs3-card-sub', style: { margin: 0 } }, '›'))),
        st.truncated && h('div', { className: 'fs3-card-sub' }, '只显示前 500 个子文件夹'));
    }

    // Pick a DSH workspace (cwd that has sessions) from GET /workspaces.
    function V3ProjectPicker({ onPick, onClose, onBrowse }) {
      const [st, setSt] = useState({ list: [], loading: true, error: '' });
      const [q, setQ] = useState('');
      useEffect(() => {
        api('/workspaces').then(d => setSt({ list: d.workspaces || [], loading: false, error: '' }))
          .catch(err => setSt({ list: [], loading: false, error: err.message }));
      }, []);
      const shown = st.list.filter(w => !q || w.cwd.toLowerCase().includes(q.toLowerCase()));
      return h(V3Dialog, {
        title: '🗂️ 选择 DSH 工作区', onClose,
        footer: h(React.Fragment, null,
          h('button', { className: 'fs3-btn', style: { marginRight: 'auto' }, onClick: onBrowse }, '📂 浏览其他文件夹…'),
          h('button', { className: 'fs3-btn', onClick: onClose }, '取消')),
      },
        h('input', { className: 'fs3-in', placeholder: '筛选工作区路径…', value: q, onChange: e => setQ(e.target.value), style: { marginBottom: 8 } }),
        st.error ? h('div', { className: 'fs3-err' }, st.error)
        : st.loading ? h('div', { className: 'fs3-empty' }, '加载中…')
        : !shown.length ? h('div', { className: 'fs3-empty' }, '没有找到包含会话的工作区')
        : shown.map(w => h('div', { key: w.cwd, className: 'fs3-row', title: w.cwd, onClick: () => onPick(w.cwd) },
            h('span', null, '🗂️'),
            h('span', { style: { flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' } }, w.cwd),
            h('span', { className: 'fs3-card-sub', style: { margin: 0 } }, w.sessions + ' 个会话'))));
    }


// ===================== v3 workspace (v2.6.1) - Tab 页布局 =====================
    const V3_TABS = [
      { id: 'library', icon: '📚', zh: '共享知识库', en: 'Shared library', color: '#4f8cff' },
      { id: 'mine', icon: '📤', zh: '我的共享', en: 'My shares', color: '#22a06b' },
      { id: 'settings', icon: '⚙️', zh: '共享设置', en: 'Share settings', color: '#e08a1e' },
      { id: 'members', icon: '👥', zh: '鱼群成员', en: 'Members', color: '#8b5cf6' },
    ];
    function useV3Text(t) {
      const zh = t('title') === '鱼群';
      return useCallback((tab) => (zh ? tab.zh : tab.en), [zh]);
    }
    function v3Hay(it) { return [it.title, it.summary, it.name, it.path, it.excerpt, ...(it.tags || [])].filter(Boolean).join(' ').toLowerCase(); }
    const v3Post = (path, body) => api(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body ?? {}) });
    function v3Ago(iso) {
      const ms = Date.now() - new Date(iso).getTime();
      if (!iso || !Number.isFinite(ms)) return '';
      const m = Math.round(ms / 60000);
      if (m < 1) return '刚刚';
      if (m < 60) return m + ' 分钟前';
      const hr = Math.round(m / 60);
      return hr < 24 ? hr + ' 小时前' : Math.round(hr / 24) + ' 天前';
    }
    function useFishTree(fishId, enabled, tick) {
      const [state, setState] = useState({ data: null, error: '', loading: false });
      useEffect(() => {
        if (!enabled) return undefined;
        let alive = true;
        const load = async () => {
          setState(s => ({ ...s, loading: !s.data }));
          try {
            const data = await api('/tree?fish=' + encodeURIComponent(fishId || ''));
            if (alive) setState({ data, error: '', loading: false });
          } catch (err) { if (alive) setState(s => ({ ...s, error: err.message, loading: false })); }
        };
        load();
        const id = setInterval(load, 15000);
        return () => { alive = false; clearInterval(id); };
      }, [fishId, enabled, tick]);
      return state;
    }

    const V3_CSS_V2 = `
.fs3{display:flex;flex-direction:column;height:100%;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-size:13px}
.fs3-top{display:flex;align-items:center;gap:12px;padding:14px 24px;border-bottom:1px solid var(--dsw-alias-border-l1)}
.fs3-top h1{font-size:18px;font-weight:600;margin:0}
.fs3-ver{font-size:14px;font-weight:600;padding:3px 10px;border-radius:999px;background:var(--dsw-alias-bg-layer-2);font-variant-numeric:tabular-nums}
.fs3-upd{display:flex;align-items:center;gap:8px;font-size:12.5px;color:var(--dsw-alias-label-secondary)}
.fs3-updbtn{display:inline-flex;align-items:center;gap:4px;padding:5px 13px;border-radius:999px;border:1px solid color-mix(in srgb,var(--dsw-alias-brand-primary) 32%,var(--dsw-alias-border-l1));background:color-mix(in srgb,var(--dsw-alias-brand-primary) 7%,transparent);color:color-mix(in srgb,var(--dsw-alias-brand-primary) 88%,var(--dsw-alias-label-primary));cursor:pointer;font:inherit;font-size:12px;font-weight:500;white-space:nowrap;font-variant-numeric:tabular-nums;transition:background .15s,border-color .15s}
.fs3-updbtn:hover:not(:disabled){background:color-mix(in srgb,var(--dsw-alias-brand-primary) 14%,transparent);border-color:color-mix(in srgb,var(--dsw-alias-brand-primary) 55%,transparent)}
.fs3-updbtn:disabled{opacity:.65;cursor:default}
.fs3-updbtn.new{border-color:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 55%,transparent);background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 14%,transparent);color:var(--dsw-alias-state-warn-primary);font-weight:600}
.fs3-updbtn.new:hover:not(:disabled){background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 22%,transparent)}
.fs3-tabs{display:flex;gap:6px;padding:12px 24px 0;border-bottom:1px solid var(--dsw-alias-border-l1)}
.fs3-tab{display:flex;align-items:center;gap:6px;padding:9px 18px;font-size:13px;cursor:pointer;border:1px solid color-mix(in srgb,var(--tab) 35%,var(--dsw-alias-border-l1));border-bottom:none;border-radius:8px 8px 0 0;background:color-mix(in srgb,var(--tab) 6%,transparent);color:var(--dsw-alias-label-secondary);margin-bottom:-1px}
.fs3-tab:hover{background:color-mix(in srgb,var(--tab) 12%,transparent)}
.fs3-tab.on{font-weight:600;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-base);border-color:color-mix(in srgb,var(--tab) 60%,transparent);box-shadow:inset 0 3px 0 var(--tab)}
.fs3-tab .n{font-size:11px;font-weight:400;padding:0 6px;border-radius:999px;background:color-mix(in srgb,var(--tab) 18%,transparent)}
.fs3-body{flex:1;min-height:0;overflow:auto;padding:16px 24px 24px;border-top:2px solid color-mix(in srgb,var(--tab) 45%,transparent)}
.fs3-bar{display:flex;align-items:center;gap:8px;margin-bottom:12px;flex-wrap:wrap}
.fs3-in{padding:7px 10px;border:1px solid var(--dsw-alias-border-l2);border-radius:6px;font-size:12.5px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);outline:none;box-sizing:border-box;min-width:0}
.fs3-in:focus{border-color:var(--dsw-alias-brand-primary)}
.fs3-btn{padding:6px 12px;border:1px solid var(--dsw-alias-border-l2);border-radius:6px;background:transparent;cursor:pointer;font-size:12.5px;color:var(--dsw-alias-label-primary);white-space:nowrap}
.fs3-btn:hover{background:var(--dsw-alias-bg-layer-2)}
.fs3-btn:disabled{opacity:.5;cursor:default}
.fs3-btn.primary{background:var(--dsw-alias-brand-primary);border-color:transparent;color:#fff}
.fs3-btn.danger{color:var(--dsw-alias-state-error-primary);border-color:color-mix(in srgb,var(--dsw-alias-state-error-primary) 40%,transparent)}
.fs3-btn.sm{padding:2px 7px;font-size:12px}
.fs3-row{display:flex;align-items:center;gap:8px;min-height:30px;padding:2px 8px;border-radius:6px;cursor:pointer;user-select:none}
.fs3-row:hover{background:var(--dsw-alias-bg-layer-2)}
.fs3-row .fs3-acts{display:none;gap:2px}
.fs3-row:hover .fs3-acts{display:flex}
.fs3-row.sel{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 12%,transparent)}
.fs3-card{border:1px solid var(--dsw-alias-border-l1);border-radius:8px;padding:10px 12px;margin:8px 0;background:var(--dsw-alias-bg-layer-1)}
.fs3-card-title{font-weight:600;font-size:13px;display:flex;align-items:center;gap:6px;min-width:0}
.fs3-card-sub{font-size:11.5px;color:var(--dsw-alias-label-secondary);margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.fs3-empty{text-align:center;color:var(--dsw-alias-label-secondary);padding:28px;font-size:12.5px;line-height:1.7}
.fs3-err{color:var(--dsw-alias-state-error-primary);font-size:12px;padding:6px 0}
.fs3-form{display:grid;grid-template-columns:72px 1fr;gap:8px 10px;align-items:center;max-width:680px;padding:14px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-layer-1);margin-bottom:16px}
.fs3-form label{font-size:12px;color:var(--dsw-alias-label-secondary)}
.fs3-seg{display:inline-flex;gap:2px;padding:2px;border-radius:7px;background:var(--dsw-alias-bg-layer-2)}
.fs3-seg button{border:none;background:transparent;padding:5px 12px;border-radius:5px;cursor:pointer;font-size:12.5px;color:var(--dsw-alias-label-secondary)}
.fs3-seg button.on{background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);box-shadow:0 1px 2px rgba(0,0,0,.18)}
.fs3-dot{width:7px;height:7px;border-radius:50%;background:var(--dsw-alias-state-idle-primary);flex-shrink:0}
.fs3-dot.on{background:var(--dsw-alias-state-success-primary)}
.fs3-mask{position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:9999}
.fs3-dlg{width:min(620px,92vw);max-height:78vh;display:flex;flex-direction:column;border-radius:12px;background:var(--dsw-alias-bg-base);border:1px solid var(--dsw-alias-border-l1);box-shadow:0 12px 40px rgba(0,0,0,.35)}
.fs3-dlg-h{display:flex;align-items:center;padding:14px 16px;font-weight:600;border-bottom:1px solid var(--dsw-alias-border-l1)}
.fs3-dlg-b{flex:1;min-height:180px;overflow:auto;padding:10px 14px}
.fs3-dlg-f{display:flex;gap:8px;align-items:center;justify-content:flex-end;padding:12px 16px;border-top:1px solid var(--dsw-alias-border-l1)}`;

    function useV3Styles2() {
      useEffect(() => {
        let el = document.getElementById('fs3-css-v2');
        if (!el) { el = document.createElement('style'); el.id = 'fs3-css-v2'; document.head.appendChild(el); }
        el.textContent = V3_CSS_V2;
      }, []);
    }

    // One combined pill in the header: version status and the check/update action.
    function V3UpdateBadge({ t, status, onUpdated }) {
      const [state, setState] = useState({
        phase: 'checking', available: false, current: status.version || '', latest: '', msg: '', err: '', progress: 0,
      });
      const updatingRef = useRef(false);

      const check = useCallback(async (force = false) => {
        if (updatingRef.current) return;
        setState(s => ({ ...s, phase: 'checking', msg: '', err: '' }));
        try {
          const d = await api('/check-update' + (force ? '?refresh=1' : ''));
          if (updatingRef.current) return;
          if (d?.error) { setState(s => ({ ...s, phase: 'idle', msg: d.error, err: 'check' })); return; }
          setState(s => ({ ...s, phase: 'idle', available: Boolean(d?.hasUpdate),
            current: d?.current || s.current, latest: d?.latest || '', msg: '', err: '' }));
        } catch (e) {
          if (!updatingRef.current) setState(s => ({ ...s, phase: 'idle', msg: e.message, err: 'check' }));
        }
      }, []);

      const update = useCallback(async () => {
        if (updatingRef.current) return;
        updatingRef.current = true;
        setState(s => ({ ...s, phase: 'updating', msg: '', err: '', progress: 0 }));
        try {
          await v3Post('/update', {});
          for (let i = 0; i < 60; i++) {
            const s = await api('/update/status').catch(() => null);
            if (s?.state === 'done') {
              updatingRef.current = false;
              setState(st => ({ ...st, phase: 'done', available: false, progress: 100, err: '',
                msg: '已更新到 v' + st.latest + '，正在刷新' }));
              onUpdated?.();
              setTimeout(() => location.reload(), 1200);
              return;
            }
            if (s?.state === 'error') {
              updatingRef.current = false;
              setState(st => ({ ...st, phase: 'idle', err: 'update',
                msg: '更新失败：' + (s.message || '未知错误') }));
              return;
            }
            setState(st => ({ ...st, progress: Math.round(((i + 1) / 60) * 100) }));
            await new Promise(r => setTimeout(r, 2000));
          }
          updatingRef.current = false;
          setState(s => ({ ...s, phase: 'idle', err: 'update', msg: '更新超时，请稍后重试' }));
        } catch (e) {
          updatingRef.current = false;
          setState(s => ({ ...s, phase: 'idle', err: 'update', msg: '更新失败：' + e.message }));
        }
      }, [onUpdated]);

      useEffect(() => { check(false); const id = setInterval(() => check(true), 180000); return () => clearInterval(id); }, [check]);

      const busy = state.phase === 'checking' || state.phase === 'updating';
      const current = state.current || status.version || '?';
      let label;
      if (state.phase === 'checking') label = '检查中…';
      else if (state.phase === 'updating') label = state.progress > 0 ? `更新中… ${state.progress}%` : '更新中…';
      else if (state.phase === 'done') label = '✅ ' + state.msg;
      else if (state.err === 'update') label = '⚠️ 更新失败 · 重试';
      else if (state.err === 'check' && !state.available) label = '⚠️ 检查失败 · 重试';
      else if (state.available) label = `⬆ 更新到 v${state.latest || '?'}`;
      else label = `✅ 已是最新版本 v${current} · 检查`;
      const title = state.msg || (state.available ? `点击更新到 v${state.latest}` : '点击重新检查更新');

      return h('div', { className: 'fs3-upd' },
        h('button', {
          type: 'button', title, disabled: busy,
          className: 'fs3-updbtn' + (state.available && !state.err && state.phase === 'idle' ? ' new' : ''),
          onClick: () => (state.available && state.phase === 'idle' ? update() : check(true)),
        }, label));
    }

    // fish → 共享文件夹 / 共享会话 / 手动共享 → share → nested subfolders → items.
    // Empty groups are hidden. With `selection`, rows show checkboxes for batch actions.
    function V3ShareTree({ data, q, self, onPreview, onChanged, selection, setSelection }) {
      const [open, setOpen] = useState(() => new Set());
      const toggle = k => setOpen(p => { const s = new Set(p); s.has(k) ? s.delete(k) : s.add(k); return s; });
      const isOpen = k => Boolean(q) || open.has(k);
      const fishName = data?.fish?.name ?? '';
      const items = (data?.items ?? []).filter(it => !q || v3Hay(it).includes(q));
      const byCol = new Map();
      for (const it of items) { if (!byCol.has(it.collectionId)) byCol.set(it.collectionId, []); byCol.get(it.collectionId).push(it); }
      const run = async fn => { try { await fn(); onChanged?.(); } catch (err) { alert(err.message); } };
      const pick = (ids, on) => setSelection?.(p => { const s = new Set(p); for (const id of ids) on ? s.add(id) : s.delete(id); return s; });
      const box = ids => selection && h('input', { type: 'checkbox', onClick: e => e.stopPropagation(),
        checked: ids.length > 0 && ids.every(id => selection.has(id)), onChange: e => pick(ids, e.target.checked) });

      const row = (depth, key, ids, icon, label, meta, onClick, actions, title) => h('div', {
        key, className: 'fs3-row' + (ids.length === 1 && selection?.has(ids[0]) ? ' sel' : ''), style: { paddingLeft: 8 + depth * 18 }, onClick, title: title || label,
      },
        box(ids), h('span', { style: { flexShrink: 0 } }, icon),
        h('span', { style: { flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, label),
        meta != null && meta !== '' && h('span', { className: 'fs3-card-sub', style: { margin: 0, flexShrink: 0 } }, meta),
        actions && h('span', { className: 'fs3-acts', onClick: e => e.stopPropagation() }, actions));

      const preview = it => onPreview({ ...it, author: fishName, authorId: data?.fish?.id, remote: !self });
      const leaf = (it, depth) => {
        const priv = it.effectivePublic === false || it.isPublic === false;
        const ref = '@' + fishName + '/' + it.type + '/' + it.id;
        const label = it.title || it.summary || it.name || String(it.path || '').split('/').pop() || it.id;
        const meta = (priv ? '🔒 ' : '') + (it.type === 'conversation' ? (it.messageCount ? it.messageCount + ' 条消息' : '') : v3Ago(it.updatedAt));
        return row(depth, it.id, [it.id], it.type === 'conversation' ? '💬' : '📄', label, meta, () => preview(it),
          h(React.Fragment, null,
            h('button', { className: 'fs3-btn sm', title: '预览', onClick: () => preview(it) }, '👁'),
            h('button', { className: 'fs3-btn sm', title: '复制引用 ' + ref, onClick: () => copyText(ref) }, '🔗'),
            self && h('button', { className: 'fs3-btn sm', title: priv ? '设为公开' : '设为私有',
              onClick: () => run(() => v3Post('/set-visibility', { id: it.id, isPublic: it.isPublic === false })) }, priv ? '🔓' : '🔒'),
            self && it.type !== 'file' && h('button', { className: 'fs3-btn sm danger', title: '删除',
              onClick: () => confirm('确定删除「' + label + '」？') && run(() => v3Post('/delete', { id: it.id })) }, '🗑')),
          it.path || label);
      };
      const idsOf = node => [...node.files.map(f => f.id), ...[...node.dirs.values()].flatMap(idsOf)];
      const dir = (node, depth, prefix) => [
        ...[...node.dirs.entries()].sort((a, b) => a[0].localeCompare(b[0], 'zh')).flatMap(([name, child]) => {
          const k = prefix + '/' + name;
          return [row(depth, k, idsOf(child), isOpen(k) ? '📂' : '📁', name, child.count, () => toggle(k)), ...(isOpen(k) ? dir(child, depth + 1, k) : [])];
        }),
        ...[...node.files].sort((a, b) => String(a.name || a.title || '').localeCompare(String(b.name || b.title || ''), 'zh')).map(it => leaf(it, depth)),
      ];

      const groups = ['folder', 'project', 'manual'].map(g => {
        const kinds = g === 'manual' ? ['manual', 'upload'] : [g];
        const cols = (data?.collections ?? []).filter(c => kinds.includes(c.kind)).map(c => ({ c, list: byCol.get(c.id) ?? [] })).filter(x => x.list.length);
        return { g, cols, ids: cols.flatMap(x => x.list.map(i => i.id)) };
      }).filter(x => x.ids.length);

      if (!groups.length) return h('div', { className: 'fs3-card-sub', style: { padding: '4px 34px 8px' } }, q ? '没有匹配项' : '还没有共享内容');
      return h('div', null, groups.flatMap(({ g, cols, ids }) => [
        row(1, g, ids, V3_KIND_ICON[g], V3_KIND_LABEL[g], ids.length, () => toggle(g)),
        ...(isOpen(g) ? cols.flatMap(({ c, list }) => {
          const ck = g + '/' + c.id;
          const priv = c.kind !== 'manual' && c.visibility !== 'public';
          return [row(2, ck, list.map(i => i.id), priv ? '🔒' : V3_KIND_ICON[c.kind], c.name, list.length, () => toggle(ck)),
            ...(isOpen(ck) ? (c.kind === 'folder' ? dir(v3Tree(list), 3, ck) : list.map(it => leaf(it, 3))) : [])];
        }) : []),
      ]));
    }

    // One fish card in a tree list; loads /tree only when expanded or searched.
    function V3FishBlock({ fish, q, self, tick, onPreview, onChanged, selection, setSelection }) {
      const [exp, setExp] = useState(!!self);
      const open = exp || Boolean(q);
      const { data, loading, error } = useFishTree(fish.id, open && (self || fish.online !== false), tick);
      if (q && data && !(data.items ?? []).some(it => v3Hay(it).includes(q))) return null;
      return h('div', { className: 'fs3-card', style: { padding: '6px 4px' } },
        h('div', { className: 'fs3-row', onClick: () => setExp(v => !v) },
          h('span', { style: { width: 12 } }, open ? '▾' : '▸'), h('span', null, '🐟'),
          h('span', { style: { fontWeight: 600, flex: 1 } }, fish.name, self ? '（我）' : ''),
          h('span', { className: 'fs3-dot' + (self || fish.online ? ' on' : '') }),
          h('span', { className: 'fs3-card-sub', style: { margin: 0 } }, self || fish.online ? '在线' : '离线')),
        open && (loading && !data ? h('div', { className: 'fs3-empty' }, '加载中…')
          : error && !data ? h('div', { className: 'fs3-err', style: { paddingLeft: 34 } }, error)
          : !self && fish.online === false && !data ? h('div', { className: 'fs3-card-sub', style: { padding: '4px 34px' } }, '这条鱼离线了')
          : h(V3ShareTree, { data, q, self, onPreview, onChanged, selection, setSelection })));
    }

    function V3LibraryTab({ libGroups, tick, onPreview }) {
      const [search, setSearch] = useState('');
      const q = search.trim().toLowerCase();
      return h('div', null,
        h('div', { className: 'fs3-bar' },
          h('input', { className: 'fs3-in', style: { flex: 1 }, placeholder: '搜索其他鱼共享的名称、路径、标签…', value: search, onChange: e => setSearch(e.target.value) })),
        libGroups.length === 0
          ? h('div', { className: 'fs3-empty' }, '还没有其他鱼。到「鱼群成员」添加 IP 或扫描局域网。')
          : libGroups.map(fish => h(V3FishBlock, { key: fish.id, fish, q, self: false, tick, onPreview })));
    }

    function V3MineTab({ me, tick, onPreview, onChanged }) {
      const [search, setSearch] = useState('');
      const [selection, setSelection] = useState(() => new Set());
      const [busy, setBusy] = useState(false);
      const q = search.trim().toLowerCase();
      const { data } = useFishTree(me.id, true, tick);
      const all = data?.items ?? [];
      const byId = new Map(all.map(i => [i.id, i]));
      const chosen = [...selection].filter(id => byId.has(id));
      // Folder files mirror the disk, so they can be hidden but not deleted one by one.
      const deletable = chosen.filter(id => byId.get(id).type !== 'file');
      const batch = async (fn, ids, ask) => {
        if (!ids.length || (ask && !confirm(ask))) return;
        setBusy(true);
        const fails = [];
        for (const id of ids) { try { await fn(id); } catch (err) { fails.push(err.message); } }
        setBusy(false); setSelection(new Set()); onChanged();
        if (fails.length) alert(fails.length + ' 项失败：' + fails[0]);
      };
      return h('div', null,
        h('div', { className: 'fs3-bar' },
          h('input', { className: 'fs3-in', style: { flex: 1 }, placeholder: '搜索我共享出去的内容…', value: search, onChange: e => setSearch(e.target.value) }),
          h('button', { className: 'fs3-btn', disabled: !all.length, onClick: () => setSelection(chosen.length === all.length ? new Set() : new Set(all.map(i => i.id))) },
            chosen.length === all.length && all.length ? '取消全选' : '全选')),
        chosen.length > 0 && h('div', { className: 'fs3-bar', style: { padding: '8px 12px', borderRadius: 8, background: 'var(--dsw-alias-bg-layer-2)' } },
          h('span', null, '已选 ', h('b', null, chosen.length), ' 项'),
          h('button', { className: 'fs3-btn', disabled: busy, onClick: () => batch(id => v3Post('/set-visibility', { id, isPublic: true }), chosen) }, '🔓 设为公开'),
          h('button', { className: 'fs3-btn', disabled: busy, onClick: () => batch(id => v3Post('/set-visibility', { id, isPublic: false }), chosen) }, '🔒 设为私有'),
          h('button', { className: 'fs3-btn danger', disabled: busy || !deletable.length,
            title: deletable.length < chosen.length ? '文件夹里的文件随磁盘同步，不能单独删除；可设为私有，或在「共享设置」里移除整个文件夹' : '',
            onClick: () => batch(id => v3Post('/delete', { id }), deletable, '确定删除选中的 ' + deletable.length + ' 项？') }, '🗑 删除 ' + deletable.length + ' 项'),
          h('button', { className: 'fs3-btn', style: { marginLeft: 'auto' }, onClick: () => setSelection(new Set()) }, '清除选择')),
        h(V3FishBlock, { fish: { id: me.id, name: me.name, online: true }, q, self: true, tick, onPreview, onChanged, selection, setSelection }));
    }

    function V3MembersTab({ status, onRefresh, onRenamed }) {
      const [addr, setAddr] = useState('');
      const [busy, setBusy] = useState(false);
      const [note, setNote] = useState('');
      const [editing, setEditing] = useState(false);
      const [name, setName] = useState(status.me.name);
      const run = async (fn) => { setBusy(true); setNote(''); try { await fn(); onRefresh(); } catch (err) { setNote('❌ ' + err.message); } finally { setBusy(false); } };
      const peers = [...(status.peers ?? [])].sort((a, b) => (b.online ? 1 : 0) - (a.online ? 1 : 0) || String(a.name).localeCompare(String(b.name), 'zh'));
      return h('div', { style: { maxWidth: 760 } },
        h('div', { className: 'fs3-card', style: { display: 'flex', alignItems: 'center', gap: 12 } },
          h('div', { style: { width: 40, height: 40, borderRadius: '50%', background: 'var(--dsw-alias-brand-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 } }, '🐟'),
          editing
            ? h('input', { className: 'fs3-in', style: { flex: 1 }, value: name, autoFocus: true, maxLength: 40, onChange: e => setName(e.target.value),
                onKeyDown: e => { if (e.key === 'Enter') run(async () => { await v3Post('/rename', { name: name.trim() }); setEditing(false); onRenamed(); }); if (e.key === 'Escape') setEditing(false); } })
            : h('div', { style: { flex: 1, minWidth: 0 } },
                h('div', { className: 'fs3-card-title' }, status.me.name, h('span', { className: 'fs3-card-sub', style: { margin: 0, fontWeight: 400 } }, '（我）')),
                h('div', { className: 'fs3-card-sub' }, 'ID ' + status.me.id.slice(0, 12) + '… · 端口 ' + status.port + (status.interfaces?.length ? ' · 已加入局域网组播' : ' · 未加入组播'))),
          editing
            ? h(React.Fragment, null,
                h('button', { className: 'fs3-btn primary', disabled: busy || !name.trim(), onClick: () => run(async () => { await v3Post('/rename', { name: name.trim() }); setEditing(false); onRenamed(); }) }, '保存'),
                h('button', { className: 'fs3-btn', onClick: () => { setEditing(false); setName(status.me.name); } }, '取消'))
            : h('button', { className: 'fs3-btn', onClick: () => setEditing(true) }, '✎ 改名')),
        h('div', { className: 'fs3-bar', style: { marginTop: 14 } },
          h('input', { className: 'fs3-in', style: { flex: 1 }, placeholder: '输入 IP 或 IP:端口 添加鱼', value: addr, onChange: e => setAddr(e.target.value),
            onKeyDown: e => { if (e.key === 'Enter' && addr.trim()) run(async () => { const r = await v3Post('/add-peer', { address: addr.trim() }); setAddr(''); setNote('✅ 已添加 ' + (r.peer?.name ?? addr)); }); } }),
          h('button', { className: 'fs3-btn primary', disabled: busy || !addr.trim(), onClick: () => run(async () => { const r = await v3Post('/add-peer', { address: addr.trim() }); setAddr(''); setNote('✅ 已添加 ' + (r.peer?.name ?? addr)); }) }, '➕ 添加'),
          h('button', { className: 'fs3-btn', disabled: busy, onClick: () => run(async () => { const r = await v3Post('/scan', {}); const n = r.found?.length ?? 0; setNote(n ? '✅ 找到 ' + n + ' 条鱼' : '本网段没有找到鱼'); }) }, busy ? '处理中…' : '📡 扫描局域网')),
        note && h('div', { className: 'fs3-card-sub', style: { margin: '0 0 8px' } }, note),
        h('div', { className: 'fs3-card-sub', style: { margin: '12px 0 4px' } }, '鱼群成员 ' + peers.length + ' · 在线 ' + peers.filter(p => p.online).length),
        peers.length === 0 ? h('div', { className: 'fs3-empty' }, '还没有其他鱼。同一局域网的鱼会自动发现，也可以在上面手动添加。')
        : peers.map(p => h('div', { key: p.id ?? p.address, className: 'fs3-card', style: { display: 'flex', alignItems: 'center', gap: 10, opacity: p.online ? 1 : .65 } },
            h('span', { className: 'fs3-dot' + (p.online ? ' on' : '') }),
            h('div', { style: { flex: 1, minWidth: 0 } },
              h('div', { className: 'fs3-card-title' }, p.name || p.address),
              h('div', { className: 'fs3-card-sub' }, p.address + ':' + p.port + ' · ' + (p.source === 'manual' ? '手动添加' : '自动发现') + (p.lastSeen ? ' · ' + v3Ago(p.lastSeen) + '活跃' : ''))),
            h('span', { className: 'fs3-card-sub', style: { margin: 0 } }, p.online ? '在线' : '离线'),
            h('button', { className: 'fs3-btn danger sm', disabled: busy, onClick: () => confirm('移除 ' + (p.name || p.address) + '？') && run(() => v3Post('/remove-peer', { address: p.address })) }, '移除'))));
    }

    function V3SettingsTab({ myCollections, myTreeTick, onChanged, status }) {
      const [seg, setSeg] = useState('folder');
      const [newForm, setNewForm] = useState(null);
      const [form, setForm] = useState({ name: '', path: '' });
      const [busy, setBusy] = useState(false);
      const [pickerMode, setPickerMode] = useState(null);
      const [workspaces, setWs] = useState([]);
      useEffect(() => { api('/workspaces').then(d => setWs(d.workspaces ?? [])).catch(() => {}); }, []);
      const cols = myCollections.filter(c => (seg === 'manual' && ['manual','upload'].includes(c.kind)) || c.kind === seg);
      const create = async () => {
        if (!form.name.trim() || (newForm !== 'manual' && !form.path.trim())) { alert('名称和路径必填'); return; }
        setBusy(true);
        try {
          await v3Post('/collections', { kind: newForm, name: form.name.trim(), root: form.path.trim(), visibility: 'public' });
          setForm({ name: '', path: '' }); setNewForm(null);
          onChanged();
        } catch (err) { alert(err.message); } finally { setBusy(false); }
      };
      const deleteCol = async (id) => {
        try {
          await v3Post('/collections/delete', { id });
          onChanged();
        } catch (err) { alert(err.message); }
      };
      const resyncCol = async (id) => {
        try {
          await v3Post('/collections/resync', { id });
          onChanged();
        } catch (err) { alert(err.message); }
      };
      return h('div', null,
        h('div', { className: 'fs3-bar', style: { justifyContent: 'space-between', alignItems: 'center' } },
          h('span', { style: { fontWeight: 600 } }, seg === 'folder' ? '📁 共享文件夹' : seg === 'project' ? '🗂️ 共享会话' : '✍️ 手动共享'),
          h('button', { className: 'fs3-btn primary', onClick: () => setNewForm(seg) }, '➕ 新建共享')),
        h('div', { className: 'fs3-seg', style: { marginBottom: 14 } },
          ['folder', 'project', 'manual'].map(s => h('button', { key: s, className: seg === s ? 'on' : '', onClick: () => { setSeg(s); setNewForm(null); } },
            s === 'folder' ? '📁 文件夹' : s === 'project' ? '🗂️ 项目' : '✍️ 手动'))),
        newForm && h('div', { className: 'fs3-form' },
          h('label', null, '名称'),
          h('input', { className: 'fs3-in', value: form.name, onChange: e => setForm(f => ({ ...f, name: e.target.value })), disabled: busy, placeholder: '给这个共享起个名字' }),
          newForm !== 'manual' && [
            h('label', { key: 'l' }, newForm === 'folder' ? '路径' : '工作区'),
            h('div', { key: 'inp', style: { display: 'flex', gap: 6 } },
              h('input', { className: 'fs3-in', value: form.path, onChange: e => setForm(f => ({ ...f, path: e.target.value })), disabled: busy, placeholder: newForm === 'folder' ? '本地文件夹路径' : '项目工作区路径', style: { flex: 1 } }),
              h('button', { className: 'fs3-btn', disabled: busy, onClick: () => setPickerMode(newForm) }, '浏览')),
          ],
          newForm === 'project' && workspaces.length > 0 && [
            h('label', { key: 'l', style: { gridColumn: '1 / -1' } }, '快捷工作区'),
            h('div', { key: 'btns', style: { gridColumn: '1 / -1', display: 'flex', gap: 4, flexWrap: 'wrap' } },
              workspaces.slice(0, 4).map(w => h('button', { key: w.cwd, className: 'fs3-btn sm', disabled: busy, onClick: () => setForm(f => ({ ...f, path: w.cwd })) }, w.name || w.cwd.split(/[\\/]/).pop()))),
          ],
          h('label', null, ''), h('div', { style: { display: 'flex', gap: 4, justifyContent: 'flex-end' } },
            h('button', { className: 'fs3-btn', disabled: busy, onClick: () => setNewForm(null) }, '取消'),
            h('button', { className: 'fs3-btn primary', disabled: busy || !form.name.trim() || (newForm !== 'manual' && !form.path.trim()), onClick: create }, newForm === 'folder' ? '新建文件夹共享' : newForm === 'project' ? '新建项目共享' : '新建手动共享'))),
        cols.length === 0
          ? h('div', { className: 'fs3-empty' }, '还没有' + (seg === 'folder' ? '共享文件夹。点上面「新建共享」按钮添加。' : seg === 'project' ? '共享会话。点上面「新建共享」按钮添加。' : '手动共享。在「我的共享」中选择项目后，也可点「新建共享」添加为手动共享。'))
          : cols.map(col => h('div', { key: col.id, className: 'fs3-card' },
              h('div', { className: 'fs3-card-title', style: { justifyContent: 'space-between' } },
                h('span', null, col.name, col.visibility !== 'public' ? ' 🔒' : ''),
                h('span', { className: 'fs3-card-sub', style: { margin: 0, fontWeight: 400 } }, col.kind === 'folder' ? '文件夹' : col.kind === 'project' ? '会话' : '手动')),
              h('div', { className: 'fs3-card-sub' }, col.source?.root || '…'),
              h('div', { style: { display: 'flex', gap: 4, marginTop: 8 } },
                h('button', { className: 'fs3-btn sm', onClick: () => resyncCol(col.id) }, '🔄 重新扫描'),
                h('button', { className: 'fs3-btn sm danger', onClick: () => confirm('确定删除「' + col.name + '」？') && deleteCol(col.id) }, '🗑 删除')))),
        pickerMode === 'folder' && h(V3FolderPicker, { initial: form.path, onPick: p => { setForm(f => ({ ...f, path: p })); setPickerMode(null); }, onClose: () => setPickerMode(null) }),
        pickerMode === 'project' && h(V3ProjectPicker, { onPick: p => { setForm(f => ({ ...f, path: p })); setPickerMode(null); }, onClose: () => setPickerMode(null), onBrowse: () => setPickerMode('folder') }));
    }

    function PanelV3({ t }) {
      const [{ status }, refresh] = useSchool();
      const [libGroups, setLibGroups] = useState([]);
      const [tab, setTab] = useState('library');
      const [tick, setTick] = useState(0);
      const myTreeState = useFishTree(status?.me?.id, true, tick);
      useV3Styles2();
      useEffect(() => {
        const load = () => api('/library').then(d => setLibGroups(d.fish?.filter(f => !f.self) || [])).catch(() => {});
        load();
        const id = setInterval(load, 10000);
        return () => clearInterval(id);
      }, []);
      const t3 = useV3Text(t);
      const [preview, setPreview] = useState(null);
      if (!status) return h('div', { style: S.page }, t('loading'));
      const tabColor = V3_TABS.find(x => x.id === tab)?.color || '#4f8cff';
      return h('div', { className: 'fs3', style: { '--tab': tabColor } },
        h('div', { className: 'fs3-top' },
          h('span', { style: { fontSize: 24 } }, '🐟'),
          h('h1', null, t('title')),
          h('span', { className: 'fs3-ver' }, 'v' + status.version),
          h('span', { className: 'fs3-ver', style: { marginLeft: 'auto' } }, (status.peers?.filter(p => p.online).length ?? 0) + 1, ' 在线'),
          h(V3UpdateBadge, { t, status, onUpdated: () => {} })),
        h('div', { className: 'fs3-tabs' },
          V3_TABS.map(tb => h('button', {
            key: tb.id, className: 'fs3-tab' + (tab === tb.id ? ' on' : ''), onClick: () => setTab(tb.id), style: { '--tab': tb.color },
          }, tb.icon, h('span', null, tb.zh), h('span', { className: 'n' }, tb.id === 'library' ? libGroups.length : tb.id === 'mine' ? myTreeState.data?.items?.length ?? 0 : '')))),
        h('div', { className: 'fs3-body' },
          tab === 'library' && h(V3LibraryTab, { libGroups, tick, onPreview: setPreview }),
          tab === 'mine' && h(V3MineTab, { me: status.me, tick, onPreview: setPreview, onChanged: () => setTick(t => t + 1) }),
          tab === 'settings' && h(V3SettingsTab, { myCollections: myTreeState.data?.collections ?? [], myTreeTick: tick, onChanged: () => setTick(t => t + 1), status }),
          tab === 'members' && h(V3MembersTab, { status, onRefresh: refresh, onRenamed: () => setTick(t => t + 1) })),
        preview && h(PreviewModal, { item: preview, onClose: () => setPreview(null), t }));
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
      const [previewItem, setPreviewItem] = useState(null);

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

      // 2.5.0: the four-column workspace replaces the tabbed page below.
      if (!window.__fishSchoolClassic) return h(PanelV3, { t });

      return h('div', { style: S.page },
        h('div', { style: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 } },
          h('div', null,
            h('h1', { style: { fontSize: 22, fontWeight: 600, margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 8 } }, 
              '🐟 ', t('title'),
              h('span', { style: { fontSize: 11, fontWeight: 400, ...S.muted, marginLeft: 4 } }, 'v', status.version)
            ),
            h('div', { style: { fontSize: 13, ...S.muted } }, t('subtitle'))
          ),
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, fontSize: 11, ...S.muted } },
            h('span', null, '🔌 :', status.port),
            h('span', null, '📦 ', status.knowledgeCount),
            status.interfaces?.length
              ? h('span', { style: { color: 'var(--dsw-alias-state-success-primary)' } }, '📡')
              : h('span', { style: { color: 'var(--dsw-alias-state-warn-primary)' }, title: 'LAN: 未加入组播' }, '📡')
          )
        ),

        h(VersionNotice, { t, status, update, onCheck: () => checkUpdate(true) }),

        h('div', { style: S.card },
          h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
              h('div', { style: { width: 32, height: 32, borderRadius: '50%', background: 'var(--dsw-alias-brand-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 } }, '🐟'),
              edit
                ? h('input', {
                    style: { ...S.input, width: 200 }, value: draft, disabled: saving, autoFocus: true,
                    placeholder: t('nameHint'),
                    onChange: e => setDraft(e.target.value),
                    onKeyDown: e => { if (e.key === 'Enter') rename(); if (e.key === 'Escape') setEdit(false); },
                  })
                : h('div', null,
                    h('div', { style: { fontWeight: 600, fontSize: 14 } }, status.me.name, ' ', h('span', { style: { ...S.muted, fontWeight: 400 } }, '(', t('you'), ')')),
                    h('div', { style: { fontSize: 10, ...S.muted } }, status.me.id.slice(0, 13), '…')
                  )
            ),
            h('div', { style: { display: 'flex', gap: 6 } },
              edit
                ? h(React.Fragment, null,
                    h('button', { style: { ...S.btn, background: 'var(--dsw-alias-brand-primary)', color: '#fff', border: 'none', fontSize: 12 },
                      disabled: saving || !draft.trim(), onClick: rename }, saving ? t('saving') : t('save')),
                    h('button', { style: { ...S.btn, fontSize: 12 }, disabled: saving, onClick: () => setEdit(false) }, t('cancel'))
                  )
                : h('button', { style: { ...S.btn, fontSize: 12 }, onClick: () => setEdit(true) }, t('rename'))
            )
          )
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
                  [['all', t('tabAll')], ['manual', '✍️ ' + t('tabManual')], ['folders', '📁 ' + t('tabFolder')], ['projects', '🗂️ ' + t('tabProject')]].map(([id, label]) =>
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
                h(LibraryPanel, { t, filter, myId, onDelete: handleDelete, onToggleVisibility: handleToggleVisibility, onPreview: setPreviewItem })
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