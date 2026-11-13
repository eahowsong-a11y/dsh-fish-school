# fish-school 2.0 API 契约

所有面板路由都在 DSH webServer 上，前缀 `/fish-school/v1`，需经 `connection.requestRejection` 鉴权（前端用现有 `api(path, init)` 即可）。
局域网路由在插件自己的 HTTP 服务（端口 37775）上，无鉴权，只读，只返回公开内容。

## 通用对象

```ts
Collection {
  id: string            // col_xxxxxxxxxxxx
  kind: 'manual' | 'folder' | 'project' | 'upload'
  name: string
  visibility: 'public' | 'private'   // folder/project 默认 private
  source?: { root: string }          // 仅本机返回，局域网接口不含
  stats: { items: number, bytes: number, updatedAt: string }
  author: string, authorId: string
  createdAt: string, updatedAt: string, rev: number
  sync?: SyncStatus                  // 仅本机 folder/project
}

SyncStatus {
  state: 'idle' | 'scanning' | 'importing' | 'error'
  total: number, done: number, failed: number
  lastSyncAt: string | null, error: string | null
  overLimit?: boolean
}

Item {
  id: string            // 旧格式 <ms>-<8hex>；文件 f_<12hex>；项目对话 c_<12hex>
  type: 'knowledge' | 'conversation' | 'file'
  collectionId: string
  summary?: string      // knowledge
  title?: string        // conversation
  name?: string, path?: string   // file（path 用 / 分隔，相对集合根）
  excerpt: string       // ≤400 字符
  tags: string[]
  size?: number, messageCount?: number
  isPublic: boolean
  author: string, authorId: string
  createdAt: string, updatedAt: string, rev: number
  // 面板合并后附加：
  remote?: boolean, peerId?: string, peerName?: string, peerAddress?: string
}
```

## 可见性规则

条目对局域网可见 ⇔ `item.isPublic !== false` **且**（集合 `kind==='manual'` **或** 集合 `visibility==='public'`）。

- folder / project / upload 集合创建时 `visibility='private'`，面板一个开关切 `public`，集合内全部条目随之对外可见/不可见
- 集合内单条仍可单独设 `isPublic:false`（例如项目里某个对话不想公开），集合公开时它仍隐藏
- 面板接口里的 Item 额外带 `effectivePublic: boolean`，前端用它显示「私有」徽标

## 面板路由

| 方法 | 路径 | 请求 | 响应 |
|---|---|---|---|
| GET | `/status` | | `{ me, port, version, pendingVersion?, updateRepo, knowledgeCount, peers[], interfaces[], storageDir }` |
| GET | `/library` | `?q=&type=&limit=` | `{ fish: FishGroup[] }` 见下 |
| GET | `/items` | `?fish=<fishId>&collection=<id>&q=&type=&cursor=&limit=50` | `{ items: Item[], nextCursor: string|null, total: number }` |
| GET | `/item` | `?id=&fish=<fishId>` | `{ item: Item, content?: string, messages?: {role,text}[] }` |
| GET | `/knowledge` | 兼容旧版 | `{ entries: Item[] }`（扁平，含远端） |
| GET | `/collections` | | `{ collections: Collection[] }`（仅本机，含私有、含 sync） |
| POST | `/collections` | `{ kind:'folder'|'project'|'upload', name, root?, visibility? }` | `{ collection }` |
| POST | `/collections/update` | `{ id, name?, visibility? }` | `{ collection }` |
| POST | `/collections/delete` | `{ id }` | `{ ok }` |
| POST | `/collections/resync` | `{ id }` | `{ ok }` |
| GET | `/fs/list` | `?path=`（空=列驱动器/常用目录） | `{ path, parent, dirs: {name,path}[] }` |
| GET | `/workspaces` | | `{ workspaces: {cwd, sessions, lastAt}[] }` 来自 DSH 会话 |
| POST | `/upload` | `{ name, text, summary?, tags?, size?, mime?, collectionId?, path? }` | `{ entry }` |
| POST | `/delete` | `{ id }` | `{ ok }` |
| POST | `/set-visibility` | `{ id, isPublic }` | `{ ok }` |
| GET | `/check-update` | `?refresh=1` | `{ current, latest, hasUpdate, releaseUrl, assetUrl, assetName, pendingVersion?, error? }` |
| POST | `/update` | `{}` | `{ ok, from, to, restartRequired: true, steps: string[] }` 或 `{ error }` |
| GET | `/update/status` | | `{ state:'idle'|'downloading'|'installing'|'done'|'error', progress, message, to }` |
| 其余 | `/rename` `/add-peer` `/remove-peer` `/scan` `/share-session` | 不变 | |

### FishGroup（`/library`）

```ts
FishGroup {
  id: string, name: string, self: boolean
  online: boolean, version?: string, lastSyncAt?: string
  itemCount: number
  collections: (Collection & { itemCount: number })[]   // 按 updatedAt 降序
}
```

`/library` 只给分组和计数，**不含条目**；条目用 `/items` 按需分页拉（`fish` + `collection`）。
带 `q` 时 `/library` 的计数是命中数，`/items?q=` 返回命中条目。

## 局域网路由（端口 37775）

| 路径 | 说明 |
|---|---|
| `/hello` | `{ fish, app, version, port, schema: 2, caps: ['manifest','item','blob'] }` |
| `/manifest?since=<rev>&limit=500` | `{ rev, collections[], items[], removed: {id,rev}[], hasMore }`，items 不含正文，excerpt ≤160 |
| `/item/:id` | `{ fish, item, content?, messages? }` 仅公开 |
| `/blob/:id` | 文件原始字节（`f_` 条目），仅公开 |
| `/knowledge`、`/knowledge/:id` | 旧版兼容，保持不变 |
