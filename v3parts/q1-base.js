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
