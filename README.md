# 🐟 鱼群（Fish School）

局域网内多个 DeepSeek Harness 实例之间共享知识：把对话或资料发布到本机的「公共文件夹」，同一局域网里的其他鱼可以检索、引用，直接放进自己的对话上下文。

- 版本：1.1.0
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

## 许可

内部使用，未授权对外分发。
