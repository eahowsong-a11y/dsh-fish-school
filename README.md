# 🐟 鱼群（Fish School）

局域网内多个 DeepSeek Harness 实例之间共享知识：把对话或资料发布到本机的「公共文件夹」，同一局域网里的其他鱼可以检索、引用，直接放进自己的对话上下文。

- 版本：以 `package.json` 为准（插件页顶部徽标与面板「我的鱼 → 版本」都读它，本文件不再硬编码）
- 依赖：无第三方依赖，只用 Node.js 内置模块
- 平台：DSH Web（桌面版 / 浏览器版均可）

## 它做什么

| 能力 | 说明 |
|---|---|
| 自动发现 | 双通道：UDP 组播 `239.255.37.77:37776`（快速、自动，但 Wi-Fi 常丢）+ **单播 HTTP 探活**（每 20 秒问一次 `/hello`，20 秒一次，3 次失败才移除） |
| 手动添加 | 面板「鱼群成员」里填 `IP` 或 `IP:端口` 直接加一条鱼，也可以一键「扫描局域网」扫本机 /24 |
| 地址簿 | 学到的地址写进 `peers.json`，重启后先探活再扫网段，不再依赖组播 |
| 两类共享内容 | 文件型知识（`knowledge`）与对话型（`conversation`，带完整消息） |
| 隐私 | 每条对话可设公开 / 私有；私有的不会出现在局域网接口里，只有本人面板可见 |
| 手动管理 | 面板里可改名、删除条目、切换公开状态 |
| 手动上传 | 面板「知识库」支持选择或拖入文本文件（≤1 MB），填标题标签后直接发布 |
| 引用 | 输入框左侧 🐟 → 选「全部鱼 / 我的 / 某条鱼」→ 点条目 → 把 `@鱼/类型/id` 插入消息 |
| 总结并上传 | 输入框左侧 🐟 → 「总结本次对话并发布」→ 自动把总结指令插入输入框，Agent 总结后调用工具发布 |
| 上传对话原文 | 输入框左侧 🐟 → 「上传本次对话原文」→ 直接发布完整对话，可设公开 / 私有 |
| 上下文自动读取 | Agent 看到引用 token 会自动调用 `fish_school_read` 取回正文，不需要用户粘贴 |

## Agent 工具

| 工具 | 作用 |
|---|---|
| `fish_school_publish(summary, content, tags?)` | 发布一条知识 |
| `fish_school_share_conversation(title, tags?, isPublic?)` | 把当前对话发布出去 |
| `fish_school_query(query, tags?, type?, fishName?, limit?)` | 关键词检索，可限类型 / 某条鱼 |
| `fish_school_list(limit?, tags?, type?, fishName?)` | 列出本机 + 所有在线鱼的条目 |
| `fish_school_read(refs, fishName?)` | 按 `@鱼/knowledge/<id>` 或 `@鱼/conversation/<id>` 取正文 |
| `fish_school_get_conversation(conversationId, fishName?)` | 取一条已分享对话的完整消息 |
| `fish_school_find_knowledge(fishName?, type?, limit?)` | 按作者浏览 |
| `fish_school_peers()` | 列出当前可达的鱼及其地址 |

另注册技能 `fish-school-knowledge`，内含使用说明。

## 界面

- **侧栏 🐟**：鱼群面板
  - 我的鱼：改名、看已加入的组播网卡（`LAN:` 那行）、条目数与端口
  - 知识库：上传区（选择或拖入文本文件）+ 全部 / 文件 / 对话三个标签页；自己的条目可删除、可切换公开状态；点条目名展开引用串
  - 鱼群成员：在线鱼列表，可「添加鱼」填 IP、「扫描局域网」、逐条「移除」；每条显示来源（multicast / manual / scan / saved）
- **输入框左侧 🐟**：三选一菜单
  - 引用知识或对话 → 插入 `@鱼/类型/id`
  - 总结本次对话并发布 → 插入总结指令，由 Agent 总结并调用 `fish_school_publish`
  - 上传本次对话原文 → 填标题（可留空）、标签、是否公开，直接发布完整对话

## 安装到另一台机器

三台机器以上建议用 Git；一两台直接拷目录即可。装完都要重启 DSH（或重新启用插件）。

### 方式 A：直接拷贝目录（最快，适合同办公室）

1. 把整个 `fish-school` 目录拷到对方机器上，**放在一个不会被移动或删除的位置**（插件是按路径 `link` 安装的）。
2. 在 DSH 里让 Agent 执行，或用插件管理界面从本地目录安装：

```
plugin_manager(action="install_bundle", target="D:\\tools\\fish-school", enabled=true)
```

看到 `"application": "applied"` 且没有 `warnings` 即成功。

### 方式 B：Git 仓库（推荐，方便更新）

1. 在这个目录建仓库并推送：

```bash
cd fish-school
git init
git add .
git commit -m "fish school 1.1.0"
git remote add origin <你的仓库地址>
git push -u origin main
```

2. 对方安装：

```
plugin_manager(action="install_bundle", target="github:<你的账号>/fish-school", enabled=true)
```

以后你推新版本，对方 `remove_bundle` 再 `install_bundle` 即可升级。

### 方式 C：公司私有 npm registry

1. 把 `package.json` 的 `name` 改成真实 scope（如 `@yourteam/fish-school`），并**删掉 `"private": true`**。
2. `npm publish` 到内网 registry。
3. 对方：

```
plugin_manager(action="install_bundle", target="@yourteam/fish-school@1.1.0", enabled=true)
```

### 方式 D：.tgz 单文件

`npm pack` 会生成 `local-fish-school-1.1.0.tgz`，适合用 IM 传给对方。对方用 `file:` 前缀作为安装 spec。
（这条依赖 pnpm 对 `file:` 的处理，我没有实测过，优先用 A 或 B。）

## 更新版本

装过一次之后，升级**不需要先卸载**插件，只要让 `node_modules\@local\fish-school` 里的代码换成新的。下面两种方式都在 1.4.0 上实测过，区别是**要不要重启 DSH**：

| 方式 | 做什么 | 生效条件 |
|---|---|---|
| 标准模式 `.\update-local.ps1` | 替换 `C:\harper\fish.tgz` → `pnpm install` | **必须重启 DSH** |
| 热更新模式 `.\update-local.ps1 -Hot` | 把 tgz 里的文件原地覆盖进已安装目录 | 只重载插件，不用重启 |

### 为什么标准模式要重启

`pnpm install` 会重建 `node_modules\@local\fish-school` 这个目录。DSH 在启动时已经记下这个包的解析路径，目录一换，运行中的进程无法热替换，`set_bundle` 会返回：

```json
{"application":"restart-required","restartReason":"package-moved"}
```

这时候刷新页面没用，必须退出 DSH 再打开。**数据不受影响**：知识和对话存在 `%USERPROFILE%\.dsh\profiles\desktop\fish-school\`，跟插件代码分开。

热更新模式原地覆盖、目录不变，所以可以走 `设置 → 插件 → fish-school` 关闭再打开来重载。

### 发布新版本（维护者）

**推 tag 这一步已经自动化了**，合并到 `main` 时就会发版：

```bash
# 1. 改版本号（语义化版本），两处都要改
#    package.json 的 version
#    lib/network.js 的 VERSION 常量（/hello 上报给其他鱼的就是它）

# 2. 本地打包验证
pwsh build-and-pack.ps1        # 产出 dist/fish-<version>.tgz

# 3. 照常提 PR 并合并到 main —— 剩下交给 CI
```

合并后 `.github/workflows/release.yml` 会自动：读 `package.json` 的版本 → 若该版本还没有 Release，就创建 `v<version>` tag，跑语法检查、`npm pack`、重命名成 `fish-<version>.tgz` 挂到 Release 上。

几点行为需要知道：

- **版本号没变就什么也不做**：合并一个不涉及版本号的 PR，CI 会看到该版本已有 Release 直接跳过，不会重复发版。
- **tag 不存在但 Release 缺**（例如上次构建失败）：再次合并会自动补发，不会重复打 tag。
- **手动推 tag 仍然可用**，此时 tag 必须与 `package.json` 版本一致，否则工作流直接失败。
- 打 tag 与发版放在同一个工作流里是刻意的：用 `GITHUB_TOKEN` 推出的 tag **不会**触发其他工作流（GitHub 防递归），拆成两个工作流会永远发不出 Release。

### 已知环境问题

- **DSH 面板里的插件安装/升级在这台机器上跑不通**：`.dsh` 的插件管理器调用的是它自己记录的 pnpm 路径，那个 store link 曾经是空的（已修复）；修好后仍会因为 `@deepseek-ai/dsh-type-meta` 在公司内网 registry 上 404 而失败。所以升级请用上面的脚本或手敲 `pnpm install`，不要指望设置面板里的"安装"按钮。
- 脚本优先读 GitHub Release；没有 release 时自动回落到 `C:\harper\dsh-fish-school` 本地打包，所以没网也能自测。

## 装完怎么确认成功

对方机器上：

1. 工具列表出现 `fish_school_*` 共 6 个
2. 技能列表出现 `fish-school-knowledge`
3. 左侧栏出现 🐟，点开能看到「我的鱼」和知识库
4. 输入框左侧出现 🐟 引用按钮
5. 两边都在线时，各自的面板「鱼群成员」里能看到对方

**注意**：只装好 Host 半、路由没注册时，点开面板会显示 404。本版已通过 `export const inject = ['webServer', 'connection']` 保证启动顺序，不会再出现。

## 配置

改 `cordis.patch.yml` 里的 `config`：

```yaml
- insert:
    - id: fish-school
      name: '@local/fish-school'
      config:
        port: 37775                  # 局域网 HTTP 端口
        multicastAddress: '239.255.37.77'
        storageDir: ''               # 空 = $DSH_PROFILE_DIR/fish-school
        autoScan: true               # 启动后自动扫一次本网段
        peerAddresses: []            # 固定要连的地址，如 ['10.106.35.69']
```

数据落盘位置（默认）：

```
$DSH_PROFILE_DIR/fish-school/
├── identity.json         # 本机鱼的 id 与名字
├── knowledge/*.json      # 文件型知识
└── conversations/*.json  # 对话型知识（含 isPublic）
```

## 常见问题

**同一台机器起两个 DSH 实例**：第二个会因 37775 被占用而注册失败，改一个 `port`。

**互相看不见**，按顺序排查：

1. **先看 HTTP 通不通**。1.3.0 起发现不再只靠组播：每 20 秒对地址簿里的鱼发一次 `GET /hello`。打开面板 → 鱼群成员 → 「扫描局域网」，能扫到就说明 TCP 通路正常，问题只在组播。

2. **防火墙**。两台机器都要放行（管理员 PowerShell）：

```powershell
New-NetFirewallRule -DisplayName "DSH Fish School UDP" -Direction Inbound -Protocol UDP -LocalPort 37776 -Action Allow
New-NetFirewallRule -DisplayName "DSH Fish School TCP" -Direction Inbound -Protocol TCP -LocalPort 37775 -Action Allow
```

3. **多网卡**（1.1.1 起自动处理）。Windows 默认用 metric 最低的网卡收发组播；装了 WSL / Hyper-V / VPN 时那个"最低"往往是虚拟网卡。面板「我的鱼」下面 `LAN:` 那行显示实际加入的网卡地址，显示「未加入组播」就是没成功。

4. **组播被 AP 丢掉**。企业 Wi-Fi 经常不转发组播，或开了客户端隔离。这种情况组播永远不通，但单播 HTTP 通常没事 —— 用「添加鱼」填对方 IP，或「扫描局域网」，之后靠探活维持。

5. 两边必须都**重启过 DSH**，插件才算真正跑起来。

**重启后打不开面板**：1.1.0 已修（启动顺序）。若仍出现，检查 Host 日志里有没有 `webServer/connection unavailable`。

**对方改了名字但我这边还是旧的**：名字随心跳广播，最多 15 秒刷新；面板每 5 秒拉一次状态。

## 变更记录

**1.6.0** — 面板显示当前版本与可更新版本

DSH 插件页只能显示 `package.json` 里的版本徽标，对 `file:` 本地依赖也无法检查上游更新，所以这块由插件自己承担：

- `/fish-school/v1/status` 增加 `version` 与 `updateRepo`；
- 新增 `/fish-school/v1/check-update`：查 GitHub 最新 release，返回 `current` / `latest` / `hasUpdate` / `releaseUrl` / `assetUrl`，成功结果缓存 10 分钟，`?refresh=1` 可强制刷新；失败以 `error` 字段返回数据，不会让面板报错；
- 面板「我的鱼」卡片新增版本格子与一行更新提示：有新版时高亮并给出 Release 链接，正常时显示「已是最新」，失败时显示原因；旁边有「检查」按钮；
- README 里硬编码的「版本：1.1.0」已移除（一直没跟着发版更新），版本一律读 `package.json`。

**1.5.0** — 面板知识库合并远端条目

面板的 `/fish-school/v1/knowledge` 之前只调 `store.search()`，因此侧栏 🐟 的「知识库」永远只显示本机发布过的条目，别人共享的内容只能通过 Agent 工具（`fish_school_list` / `fish_school_query`）读到。现在该接口会同时调用 `network.searchPeers()` 合并全网的公开条目：

- 远端条目带 `remote: true`、`peerName`、`peerAddress`，面板显示「远程 · 鱼名」标签；
- 远端条目只读：删除和公开/私有开关只对自己的条目出现（沿用 `isMine` 判断）；
- 远端结果缓存 8 秒，避免面板每 5 秒轮询时反复探测离线鱼（单次超时 3 秒）；
- 私有对话仍然只在本人面板可见：对外的 `/knowledge` 接口一直不含私有条目，本次未改动该行为；
- 同一 id 被多条鱼报告时，本机条目优先。

## 许可

内部使用，未授权对外分发。
