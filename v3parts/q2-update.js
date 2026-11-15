    // Auto-check for updates on mount and periodically
    function V3UpdateBadge({ t, status, onUpdated }) {
      const [state, setState] = useState({ available: false, version: status.version, checking: false, msg: '', progress: 0 });
      
      const check = useCallback(async () => {
        setState(s => ({ ...s, checking: true, msg: '' }));
        try {
          const d = await api('/check-update');
          if (d.error) { setState(s => ({ ...s, checking: false, msg: d.error })); return; }
          setState(s => ({ ...s, available: d.hasUpdate, version: d.latest || d.current, checking: false }));
        } catch (e) { setState(s => ({ ...s, checking: false, msg: e.message })); }
      }, []);

      const update = useCallback(async () => {
        if (!state.available) return;
        setState(s => ({ ...s, checking: true, msg: '更新中…' }));
        try {
          await v3Post('/update', {});
          for (let i = 0; i < 60; i++) {
            const s = await api('/update/status').catch(() => null);
            if (s?.state === 'done') { setState(st => ({ ...st, available: false, progress: 100, msg: '已更新，页面即将刷新' })); setTimeout(() => location.reload(), 1000); return; }
            if (s?.state === 'error') { setState(st => ({ ...st, msg: '更新失败：' + s.message, checking: false })); return; }
            setState(st => ({ ...st, progress: Math.round(((i + 1) / 60) * 100) }));
            await new Promise(r => setTimeout(r, 2000));
          }
          setState(s => ({ ...s, checking: false, msg: '更新超时' }));
        } catch (e) { setState(s => ({ ...s, checking: false, msg: e.message })); }
      }, [state.available]);

      useEffect(() => { check(); const id = setInterval(check, 180000); return () => clearInterval(id); }, [check]);

      return h('div', { className: 'fs3-upd' },
        h('span', null, state.available ? '🆕 有新版本' : '✅ 已是最新版'),
        h('button', { className: 'fs3-btn sm' + (state.available ? '.primary' : ''), disabled: state.checking, onClick: () => state.available ? update() : check(), title: state.msg }, 
          state.checking ? '更新中…' : state.available ? '更新至 ' + state.version : '检查'),
        state.progress > 0 && state.progress < 100 && h('span', { style: { fontSize: 11, color: 'var(--dsw-alias-label-secondary)' } }, state.progress + '%'));
    }
