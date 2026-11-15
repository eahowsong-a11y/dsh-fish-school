# Fish School 功能优化与扩展建议

## 当前已完成的优化 ✅

### 布局优化
- **紧凑的头部信息**：版本、端口、条目数、网络状态整合到标题栏，节省空间
- **简化用户信息卡片**：移除大型统计卡片，改为行内编辑
- **更多空间给核心功能**：知识库、共享、鱼群成员

### 核心功能
- ✅ 文件内容预览（问题 5）
- ✅ 按来源分类的 Tab（问题 4）
- ✅ 文件夹自动监控（问题 2）
- ✅ 项目会话自动同步（问题 3）
- ✅ 一键更新提示优化（问题 1）

---

## 短期优化建议（1-2周）

### 1. 搜索与筛选增强 🔍

**当前问题：**
- 只能在全部/手动/文件夹/项目 Tab 间切换
- 无法按关键词快速定位内容
- 无法按标签筛选

**建议实现：**
```javascript
// 在 LibraryPanel 添加搜索框
h('input', {
  style: { ...S.input, marginBottom: 12 },
  placeholder: t('searchPlaceholder'), // '搜索标题、路径、标签…'
  value: searchQuery,
  onChange: e => setSearchQuery(e.target.value)
})

// 前端过滤
const filteredItems = items.filter(item => {
  const text = [item.title, item.path, item.summary, ...(item.tags || [])].join(' ').toLowerCase();
  return text.includes(searchQuery.toLowerCase());
});
```

**优先级：高** - 内容多了以后，搜索是刚需

---

### 2. 标签管理系统 🏷️

**当前问题：**
- 标签是自由文本，容易出现 `javascript` / `JavaScript` / `JS` 这种重复
- 无法看到所有可用标签
- 无法点击标签快速筛选

**建议实现：**

#### 2.1 标签统计与展示
```javascript
// store.js 添加标签统计
function getTagStats() {
  const tagCounts = new Map();
  for (const item of items.values()) {
    for (const tag of item.tags || []) {
      const normalized = tag.trim().toLowerCase();
      tagCounts.set(normalized, (tagCounts.get(normalized) || 0) + 1);
    }
  }
  return [...tagCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([tag, count]) => ({ tag, count }));
}
```

#### 2.2 标签云组件
```javascript
function TagCloud({ tags, onSelectTag, selectedTag }) {
  return h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 } },
    tags.slice(0, 20).map(({ tag, count }) =>
      h('button', {
        key: tag,
        style: {
          ...S.tag,
          cursor: 'pointer',
          background: selectedTag === tag ? 'var(--dsw-alias-brand-primary)' : 'var(--dsw-alias-bg-layer-2)',
          color: selectedTag === tag ? '#fff' : 'var(--dsw-alias-label-secondary)',
        },
        onClick: () => onSelectTag(tag === selectedTag ? null : tag),
      }, tag, ' (', count, ')')
    )
  );
}
```

**优先级：中** - 内容超过 50 条后变得重要

---

### 3. 批量操作 ✅

**当前问题：**
- 只能逐个删除、切换可见性
- 清理过期内容很繁琐

**建议实现：**
- 添加"全选"/"反选"复选框
- 批量删除、批量设为私有/公开
- 批量导出为 JSON

```javascript
// 在 CollectionItems 添加批量选择模式
const [selectionMode, setSelectionMode] = useState(false);
const [selected, setSelected] = useState(new Set());

// 工具栏
h('div', { style: { display: 'flex', gap: 6, marginBottom: 8 } },
  h('button', { onClick: () => setSelectionMode(!selectionMode) }, 
    selectionMode ? t('cancelSelection') : t('selectMultiple')),
  selectionMode && selected.size > 0 && [
    h('button', { onClick: () => batchDelete(selected) }, t('deleteSelected') + ` (${selected.size})`),
    h('button', { onClick: () => batchSetVisibility(selected, true) }, t('makePublic')),
  ]
)
```

**优先级：中** - 管理大量内容时有用

---

### 4. 智能摘要生成 🤖

**当前问题：**
- 上传文件时需手动写标题和标签
- 分享对话时需要手动想标题

**建议实现：**
```javascript
// 在上传文件时自动生成摘要
async function uploadWithSummary(file, content) {
  // 调用 LLM 生成摘要
  const prompt = `请为以下文件生成：
1. 一句话标题（10字以内）
2. 3-5个相关标签（英文，逗号分隔）

文件名：${file.name}
内容预览：
${content.slice(0, 1000)}

返回 JSON：{ "title": "...", "tags": "..." }`;
  
  const summary = await callLLM(prompt);
  return summary;
}
```

**集成方式：**
- 文件上传时显示"✨ 自动生成标题"按钮
- 后台调用当前 session 的 LLM
- 用户可以编辑 AI 生成的结果

**优先级：高** - 显著提升用户体验

---

## 中期功能扩展（1-2月）

### 5. 版本控制与历史记录 📜

**场景：**
- 知识条目被多次编辑
- 想恢复到之前的版本
- 想看谁什么时候修改了内容

**建议实现：**

#### store.js 添加版本表
```javascript
const versions = new Map(); // itemId -> [{ version, content, updatedAt, updatedBy }]

function saveVersion(itemId, content, author) {
  const history = versions.get(itemId) || [];
  history.push({
    version: history.length + 1,
    content,
    updatedAt: new Date().toISOString(),
    updatedBy: author,
  });
  versions.set(itemId, history.slice(-10)); // 只保留最近 10 个版本
}
```

#### 前端展示
- 预览模态框添加"历史"Tab
- 显示版本列表，支持对比和恢复

**优先级：低** - 多人协作时才重要

---

### 6. 协作编辑与评论 💬

**场景：**
- A 发布了知识，B 想补充内容
- 团队想在某个文档下讨论

**建议实现：**

#### 6.1 知识条目评论
```javascript
// 在 PreviewModal 底部添加评论区
function CommentSection({ itemId, comments, onAddComment }) {
  const [draft, setDraft] = useState('');
  return h('div', { style: { borderTop: '1px solid var(--dsw-alias-border-l1)', paddingTop: 12, marginTop: 12 } },
    h('h4', { style: { fontSize: 13, marginBottom: 8 } }, t('comments') + ` (${comments.length})`),
    comments.map(c =>
      h('div', { key: c.id, style: { marginBottom: 8, padding: 8, background: 'var(--dsw-alias-bg-layer-2)', borderRadius: 6 } },
        h('div', { style: { fontSize: 11, ...S.muted } }, c.author, ' · ', formatDate(c.createdAt)),
        h('div', { style: { fontSize: 12, marginTop: 4 } }, c.text)
      )
    ),
    h('textarea', {
      style: { ...S.input, width: '100%', minHeight: 60 },
      placeholder: t('addComment'),
      value: draft,
      onChange: e => setDraft(e.target.value),
    }),
    h('button', {
      style: { ...S.btn, marginTop: 6 },
      disabled: !draft.trim(),
      onClick: () => { onAddComment(draft); setDraft(''); }
    }, t('postComment'))
  );
}
```

#### 6.2 协作编辑（建议模式）
- 不是实时协同编辑（太复杂）
- 而是"提议修改"模式：
  - B 点击"建议修改"
  - 编辑内容并提交
  - A（原作者）收到通知，可以接受/拒绝

**优先级：低** - 适合团队规模 >5 人

---

### 7. 知识图谱与关联推荐 🕸️

**场景：**
- 查看某个知识时，推荐相关内容
- 发现知识之间的关联

**建议实现：**

#### 7.1 基于标签的关联
```javascript
function getRelatedItems(item, allItems, limit = 5) {
  const itemTags = new Set(item.tags || []);
  const scored = allItems
    .filter(i => i.id !== item.id)
    .map(i => {
      const commonTags = (i.tags || []).filter(t => itemTags.has(t)).length;
      return { item: i, score: commonTags };
    })
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
  return scored.map(s => s.item);
}
```

#### 7.2 在预览中显示
```javascript
// PreviewModal 底部添加"相关内容"
h('div', { style: { marginTop: 16, borderTop: '1px solid var(--dsw-alias-border-l1)', paddingTop: 12 } },
  h('h4', { style: { fontSize: 13, marginBottom: 8 } }, t('relatedContent')),
  relatedItems.map(item =>
    h('div', {
      key: item.id,
      style: { padding: 6, cursor: 'pointer', borderRadius: 4, marginBottom: 4 },
      onClick: () => setPreviewItem(item),
    }, '→ ', itemTitle(item))
  )
)
```

**优先级：中** - 知识库内容 >100 条时有价值

---

### 8. RSS/Webhook 集成 📡

**场景：**
- 自动抓取团队博客、技术文章
- 监控某个 GitHub repo 的 release notes
- 接收外部系统的通知

**建议实现：**

#### 8.1 RSS 订阅
```javascript
// index.js 添加 RSS 抓取定时任务
import Parser from 'rss-parser';

async function syncRSSFeed(feedUrl, collectionId) {
  const parser = new Parser();
  const feed = await parser.parseURL(feedUrl);
  
  for (const item of feed.items) {
    const existingItem = store.findByUrl(item.link);
    if (existingItem) continue; // 已存在
    
    store.saveKnowledge({
      summary: item.title,
      content: item.contentSnippet || item.content,
      tags: (item.categories || []).join(','),
      url: item.link,
      createdAt: new Date(item.pubDate).toISOString(),
      collectionId,
    });
  }
}

// 每小时检查一次
setInterval(() => {
  for (const col of store.listCollections({ kind: 'rss' })) {
    syncRSSFeed(col.source.feedUrl, col.id).catch(err => logger.warn('rss sync failed:', err));
  }
}, 60 * 60 * 1000);
```

#### 8.2 Webhook 接收
```javascript
// 添加 POST /webhook/:id 端点
ctx.effect(() => webServer.register({
  kind: 'exact',
  path: '/fish-school/v1/webhook/:id',
  async handler(req, res) {
    const webhookId = req.url.split('/').pop();
    const webhook = store.getWebhook(webhookId);
    if (!webhook) return send(res, 404, { error: 'Webhook not found' });
    
    const body = await readBody(req, 10 * 1024);
    
    // 根据配置转换 payload 为知识条目
    const item = transformWebhookPayload(webhook.transform, body);
    store.saveKnowledge(item);
    
    return send(res, 200, { ok: true });
  },
}));
```

**用例：**
- GitHub webhook：监听 release/issue/PR
- Slack incoming webhook：团队讨论记录
- Jenkins/CI：构建通知

**优先级：中** - 自动化内容收集

---

### 9. 导出与备份 💾

**当前问题：**
- 无法批量导出所有知识
- 无法迁移到其他实例

**建议实现：**

#### 9.1 导出为 JSON
```javascript
// 添加"导出全部"按钮
async function exportAll() {
  const data = {
    version: '2.1.0',
    exportedAt: new Date().toISOString(),
    fish: store.identity(),
    collections: store.listCollections({ includePrivate: true }),
    items: store.all().map(item => ({
      ...item,
      content: store.getItemContent(item.id),
    })),
  };
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `fish-school-export-${Date.now()}.json`;
  a.click();
}
```

#### 9.2 导入
```javascript
// 支持拖拽 JSON 文件导入
async function importFromJSON(file) {
  const text = await file.text();
  const data = JSON.parse(text);
  
  for (const item of data.items) {
    store.saveKnowledge({
      ...item,
      originalAuthor: data.fish.name,
      importedAt: new Date().toISOString(),
    });
  }
}
```

**优先级：高** - 数据安全和迁移需求

---

### 10. AI 问答接口 🧠

**场景：**
- 用户在对话中问："团队之前讨论过 XX 吗？"
- 自动检索鱼群知识库并回答

**建议实现：**

#### 10.1 语义搜索（可选，需要 Embedding）
```javascript
// 使用本地 LLM 生成 embedding
async function generateEmbedding(text) {
  // 调用 DSH 的 LLM API
  const response = await fetch('/api/embeddings', {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
  return response.json();
}

// 存储时生成 embedding
function saveWithEmbedding(item) {
  const embedding = await generateEmbedding(item.content);
  item.embedding = embedding;
  store.save(item);
}

// 搜索时计算相似度
function semanticSearch(query, topK = 5) {
  const queryEmbedding = await generateEmbedding(query);
  const items = store.all().map(item => ({
    ...item,
    similarity: cosineSimilarity(queryEmbedding, item.embedding),
  }));
  return items.sort((a, b) => b.similarity - a.similarity).slice(0, topK);
}
```

#### 10.2 增强 fish_school_query 工具
- 当前是简单的关键词匹配
- 升级为语义搜索（如果有 embedding）
- 否则改用 BM25 算法（比简单 includes 好）

**优先级：中** - 显著提升搜索质量

---

## 长期愿景（3-6月）

### 11. 多租户与权限管理 🔐

**场景：**
- 公司有多个团队，不希望互相看到私有知识
- 某些知识只对特定成员可见

**建议实现：**
- 添加"团队"概念（team）
- 每个 fish 可以加入多个团队
- 知识可见性：public / team / private
- 细粒度权限：查看/编辑/删除

**优先级：低** - 适合企业场景

---

### 12. 移动端适配 📱

**当前问题：**
- 页面在手机上不够友好

**建议：**
- 使用响应式布局
- 侧边栏改为抽屉
- 优化触摸交互

---

### 13. 桌面通知与提醒 🔔

**场景：**
- 有人共享了新知识
- 有人评论了我的文档
- 监控的文件夹有新文件

**建议实现：**
```javascript
// 浏览器通知 API
function notifyNewKnowledge(item) {
  if (Notification.permission === 'granted') {
    new Notification('🐟 鱼群新知识', {
      body: `${item.author} 分享了：${item.title}`,
      icon: '/icon.svg',
    });
  }
}

// 定期轮询新内容
setInterval(() => {
  const lastCheckAt = localStorage.getItem('fish-school-last-check') || 0;
  const newItems = store.all().filter(i => new Date(i.createdAt) > new Date(lastCheckAt));
  newItems.forEach(notifyNewKnowledge);
  localStorage.setItem('fish-school-last-check', Date.now());
}, 60000);
```

---

## 优先级总结

### 立即实现（1-2周）
1. ⭐ **搜索与筛选** - 刚需
2. ⭐ **智能摘要生成** - 显著提升体验
3. ⭐ **导出与备份** - 数据安全

### 短期实现（1月内）
4. 🔸 **标签管理系统**
5. 🔸 **批量操作**
6. 🔸 **知识图谱与推荐**

### 中期实现（2-3月）
7. 🔹 **RSS/Webhook 集成** - 自动化
8. 🔹 **AI 问答接口** - 智能化
9. 🔹 **版本控制**

### 长期规划（3月+）
10. ◽ **协作编辑与评论**
11. ◽ **多租户权限**
12. ◽ **移动端适配**
13. ◽ **桌面通知**

---

## 技术债务与架构优化

### 1. 性能优化
- **虚拟滚动**：条目超过 100 个时卡顿 → 使用 react-window
- **分页加载**：后端已支持 cursor，前端需要无限滚动
- **索引优化**：store.js 的 search() 是全表扫描 → 建立倒排索引

### 2. 代码结构
- **组件拆分**：client.js 1700 行太长 → 拆成独立组件文件
- **状态管理**：多个 useState 难以维护 → 考虑 useReducer
- **类型安全**：纯 JS 易出错 → 迁移到 TypeScript

### 3. 测试覆盖
- **单元测试**：store.js / network.js 的核心逻辑
- **E2E 测试**：上传/共享/预览的完整流程
- **兼容性测试**：多台机器、不同网络环境

---

## 用户反馈收集

建议添加"反馈"按钮，收集：
1. 最常用的功能
2. 最希望改进的地方
3. 遇到的问题

可以通过以下方式收集：
- GitHub Issues
- 插件内弹出表单（提交到指定 webhook）
- 使用统计（埋点）

---

## 总结

Fish School 已经具备了一个知识共享系统的核心功能，当前最需要的改进是：

1. **搜索体验** - 让用户快速找到内容
2. **自动化** - 减少手动输入（AI 摘要、RSS 订阅）
3. **数据安全** - 导出备份、版本控制
4. **智能推荐** - 让知识更容易被发现

按照这个路线图，Fish School 可以从一个简单的文件共享工具，成长为一个强大的团队知识管理平台。
