/**
 * folder-indexer.js
 *
 * 文件夹索引器：监视本地目录并维护文件条目列表，供 fish-school 自动共享文件夹功能使用。
 *
 * - start() 首次同步全量扫描；之后 fs.watch(recursive) 事件经 300ms 防抖触发重扫，
 *   另有每 30s 一次的兜底全量 mtime/size 比对（Windows 深层 watch 不稳定）。
 * - 只在 mtime/size 变化时才重新读取文件头（最多 8KB）计算哈希和摘要。
 * - 所有文件读取都经过路径安全检查：realpath 必须在 root 内；拒绝绝对路径、`..`、
 *   含 `:` 的路径（盘符 / NTFS 备用数据流）；默认不跟随符号链接。
 *
 * 只依赖 Node.js 内置模块。
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const HEAD_BYTES = 8192;         // 快速哈希读取的文件头长度
const BINARY_SNIFF_BYTES = 512;  // 二进制检测范围：其中出现 0 字节即视为二进制
const EXCERPT_BYTES = 400;       // 摘要最多取前 400 字节
const DEBOUNCE_MS = 300;
const RECONCILE_MS = 30_000;
const IGNORE_FILE = '.fishschoolignore';
// Windows 文件系统大小写不敏感，忽略规则也按不敏感匹配，避免 SECRET.ENV 之类绕过
const RE_FLAGS = process.platform === 'win32' ? 'i' : '';

/** 内置忽略规则：任何一条命中即忽略，用户的 `!` 否定规则无法覆盖 */
const BUILTIN_IGNORE = [
  '.git/**',
  'node_modules/**',
  '.DS_Store',
  '*.log',
  '*.lock',
  'package-lock.json',
  '*.env',
  '*.key',
  '*.pem',
  '*.p12',
  '*.pfx',
  '*.crt',
  '*.cer',
  'Thumbs.db',
];

const notAllowed = () => new Error('path not allowed');

/** 转义正则特殊字符（* 和 ? 由调用方单独处理） */
function escapeRegex(s) {
  return s.replace(/[.+^${}()|[\]\\]/g, '\\$&');
}

/**
 * 把一条 gitignore 风格模式编译成规则对象 { negate, dirOnly, reSelf, reBelow }。
 * 支持的子集：
 *   !pattern  否定（取消忽略，只对用户规则有效）
 *   *.ext     任意深度下的 .ext 文件（不含 / 的模式在任意深度按名称匹配）
 *   dir/**    dir 目录下的所有内容（dir 不含 / 时可位于任意深度）
 *   dirname   任意深度上名为 dirname 的文件或目录（目录时连同其全部内容）
 *   /pattern  前导 / 锚定到 root；中间含 / 的模式也锚定到 root
 *   pattern/  只匹配目录
 * 通配符：** 可跨目录，* 和 ? 不跨 /。
 * 空行和 # 注释返回 null。
 */
function compileRule(raw) {
  let p = String(raw).trim();
  if (!p || p.startsWith('#')) return null;
  let negate = false;
  if (p.startsWith('!')) {
    negate = true;
    p = p.slice(1);
  }
  p = p.replace(/\\/g, '/');
  const dirOnly = p.endsWith('/');
  p = p.replace(/\/+$/, '');
  let anchored = p.startsWith('/');
  p = p.replace(/^\/+/, '');
  if (!p) return null;
  // "name/**" 中 name 不含 / 时视为任意深度的目录名，其他含 / 的模式锚定到 root
  if (!/^[^/]+\/\*\*$/.test(p) && p.includes('/')) anchored = true;

  let body = '';
  for (let i = 0; i < p.length; i++) {
    const c = p[i];
    if (c === '*' && p[i + 1] === '*') {
      // "**/" 匹配零个或多个目录；其他位置的 ** 匹配任意字符
      if (p[i + 2] === '/') { body += '(?:.*/)?'; i += 2; }
      else { body += '.*'; i += 1; }
    } else if (c === '*') body += '[^/]*';
    else if (c === '?') body += '[^/]';
    else body += escapeRegex(c);
  }
  const prefix = anchored ? '^' : '(?:^|/)';
  return {
    negate,
    dirOnly,
    reSelf: new RegExp(`${prefix}${body}$`, RE_FLAGS),       // 路径本身命中
    reBelow: new RegExp(`${prefix}${body}/.+$`, RE_FLAGS),   // 位于命中的目录之下
  };
}

/** 判断规则是否命中相对路径（/ 分隔）。命中的目录连带其下所有内容都算命中 */
function ruleMatches(rule, rel, isDir) {
  if (rule.reBelow.test(rel)) return true;
  return rule.reSelf.test(rel) && (!rule.dirOnly || isDir);
}

/**
 * 创建一个文件夹索引器。
 * @param {object} opts
 * @param {string} opts.root - 要监视的目录绝对路径
 * @param {string[]} [opts.ignore] - 额外的忽略模式（gitignore 语法子集）
 * @param {number} [opts.maxFiles=2000] - 最大文件数
 * @param {number} [opts.maxBytes=209715200] - 最大总字节数（200MB）
 * @param {number} [opts.textSizeLimit=2097152] - 单文件文本读取上限（2MB）
 * @param {boolean} [opts.followSymlinks=false] - 是否跟随符号链接
 * @param {function} [opts.onChange] - 变更回调 (changes) => void
 * @param {object} [opts.logger] - { info, warn } 接口
 * @returns {object} indexer
 */
export function createFolderIndexer(opts) {
  const {
    root,
    ignore = [],
    maxFiles = 2000,
    maxBytes = 209715200,
    textSizeLimit = 2097152,
    followSymlinks = false,
    onChange = null,
    logger = { info: () => {}, warn: () => {} },
  } = opts;

  if (!root) throw new Error('root is required');

  // 规范化 root：转 / 分隔，兼容 Windows
  const root_ = path.resolve(root);
  const root_norm = path.normalize(root_).replace(/\\/g, '/');

  // 检查 .fishschoolignore
  const ignorePath = path.join(root_, IGNORE_FILE);
  let userRules = [];
  if (fs.existsSync(ignorePath)) {
    const content = fs.readFileSync(ignorePath, 'utf-8');
    userRules = content
      .split(/\r?\n/)
      .map(compileRule)
      .filter(Boolean);
  }

  // 编译内置规则
  const builtinRules = BUILTIN_IGNORE.map(compileRule).filter(Boolean);

  // 编译用户追加规则
  const appendRules = ignore.map(compileRule).filter(Boolean);

  // 编译所有用户规则
  const userRulesAll = [...userRules, ...appendRules];

  // 索引状态
  const items = new Map();
  let watcher = null;
  let debounce = null;
  let interval = null;
  let totalBytes = 0;
  let overLimit = false;
  let lastUpdated = new Date().toISOString();

  /**
   * 判断相对路径（/ 分隔）是否应被忽略。
   * 内置规则先判断，命中即忽略，不可被否定；
   * 之后按顺序应用 .fishschoolignore 和 opts.ignore，后出现的规则覆盖前面的（gitignore 语义）。
   */
  function shouldIgnore(rel, isDir) {
    for (const rule of builtinRules) {
      if (ruleMatches(rule, rel, isDir)) return true;
    }
    let ignored = false;
    for (const rule of userRulesAll) {
      if (ruleMatches(rule, rel, isDir)) ignored = !rule.negate;
    }
    return ignored;
  }

  /** root 的真实路径（解析 junction / 8.3 短名等），用于包含关系判断 */
  function realRoot() {
    return fs.realpathSync.native(root_);
  }

  /** 判断 child 是否等于 parent 或位于 parent 之内（按路径段比较，Windows 不区分大小写） */
  function isInside(parent, child) {
    const rel = path.relative(parent, child);
    return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
  }

  /**
   * 路径安全检查，通过则返回可读取的真实绝对路径，否则抛出 'path not allowed'。
   * 1. 拒绝空路径、绝对路径、含 `..` 段的路径、含 `:` 的路径（盘符 / NTFS 备用数据流）
   * 2. 拒绝被忽略规则命中的路径（例如 .env、*.key 不能借 readContent 读出）
   * 3. realpath 解析后必须仍在 root 之内
   * 4. followSymlinks=false 时，路径上任何一段是符号链接或 junction 都拒绝
   */
  function resolveSafe(inputPath) {
    if (typeof inputPath !== 'string' || !inputPath) throw notAllowed();
    const rel = inputPath.replace(/\\/g, '/');
    if (rel.startsWith('/') || rel.includes(':') || rel.includes('\0')) throw notAllowed();
    const segs = rel.split('/');
    if (segs.some((s) => s === '..' || s === '.' || s === '')) throw notAllowed();
    if (shouldIgnore(rel, false)) throw notAllowed();

    const rootReal = realRoot();
    const candidate = path.join(rootReal, ...segs);
    let resolved;
    try {
      resolved = fs.realpathSync.native(candidate);
    } catch {
      throw notAllowed();
    }
    if (!isInside(rootReal, resolved)) throw notAllowed();
    // 不跟随链接时，真实路径必须与拼接路径一致（逐段 lstat 的等价做法）
    if (!followSymlinks && path.relative(candidate, resolved) !== '') throw notAllowed();
    return resolved;
  }

  /** 只读取文件头最多 HEAD_BYTES 字节，避免把大文件整个读入内存 */
  function readHead(filePath) {
    const fd = fs.openSync(filePath, 'r');
    try {
      const buf = Buffer.alloc(HEAD_BYTES);
      const n = fs.readSync(fd, buf, 0, HEAD_BYTES, 0);
      return buf.subarray(0, n);
    } finally {
      fs.closeSync(fd);
    }
  }

  /** 二进制检测：前 512 字节中出现 0 字节即视为二进制 */
  function isBinary(head) {
    return head.subarray(0, BINARY_SNIFF_BYTES).includes(0);
  }

  /** 快速哈希：首 8KB 的 sha256，取前 16 字节（32 个 hex 字符） */
  function computeHash(head) {
    return 'sha256:' + crypto.createHash('sha256').update(head).digest('hex').slice(0, 32);
  }

  /**
   * 摘要：前 400 字节按 UTF-8 解码。超过 400 字节时截断在最后一个换行符处，
   * 没有换行符则去掉末尾可能被截断的半个多字节字符。
   */
  function makeExcerpt(head) {
    if (head.length <= EXCERPT_BYTES) return head.toString('utf8');
    const slice = head.subarray(0, EXCERPT_BYTES);
    const nl = slice.lastIndexOf(0x0a);
    if (nl > 0) return slice.subarray(0, nl).toString('utf8');
    return slice.toString('utf8').replace(/\uFFFD+$/, '');
  }

  /**
   * 生成 Item ID：sha256(relpath) 的前 12 字符加前缀 f_。
   */
  function genId(rel) {
    const h = crypto.createHash('sha256').update(rel).digest('hex');
    return 'f_' + h.slice(0, 12);
  }

  /**
   * 根据扫描结果构建 Item。只读一次文件头。
   * old 存在时：内容（hash/size）变化才让 rev 自增；只有 mtime 变化时 rev 不变。
   * 读取失败（文件刚被删除、被占用等）返回 null。
   */
  function makeItem(entry, old) {
    let head;
    try {
      head = readHead(entry.fullPath);
    } catch (err) {
      logger.warn(`[folder-indexer] read failed: ${entry.rel}: ${err.message}`);
      return null;
    }
    const bin = isBinary(head);
    const hash = computeHash(head);
    const contentChanged = !old || old.hash !== hash || old.size !== entry.size;
    return {
      id: genId(entry.rel),
      type: 'file',
      path: entry.rel,
      name: path.posix.basename(entry.rel),
      size: entry.size,
      mtime: entry.mtime,
      hash,
      excerpt: bin ? '' : makeExcerpt(head),
      isBinary: bin,
      updatedAt: new Date().toISOString(),
      rev: old ? old.rev + (contentChanged ? 1 : 0) : 1,
    };
  }

  /**
   * 递归遍历目录，只 stat 不读内容，返回 { fullPath, rel, mtime, size } 数组。
   * 不在这里做 maxFiles/maxBytes 截断：上限在 fullScan 中只作用于"新增"，
   * 已索引项始终保留。遍历本身设一个硬上限（maxFiles 的 10 倍）防止超大目录拖垮进程。
   * 符号链接 / junction：followSymlinks=false 时跳过；为 true 时要求目标仍在 root 内，
   * 并用已访问真实路径集合防止链接成环。
   */
  function scan() {
    const list = [];
    const walkCap = Math.max(maxFiles * 10, 10000);
    const rootReal = realRoot();
    const visited = new Set([rootReal.toLowerCase()]);

    const walk = (dir) => {
      let ents;
      try {
        ents = fs.readdirSync(dir, { withFileTypes: true });
      } catch (err) {
        logger.warn(`[folder-indexer] readdir failed: ${dir}: ${err.message}`);
        return;
      }
      for (const ent of ents) {
        if (list.length >= walkCap) return;
        const fp = path.join(dir, ent.name);
        const rel = path.relative(root_, fp).replace(/\\/g, '/');
        let st;
        try {
          if (ent.isSymbolicLink()) {
            if (!followSymlinks) continue;
            const real = fs.realpathSync.native(fp);
            if (!isInside(rootReal, real)) continue;
            st = fs.statSync(real);
            if (st.isDirectory()) {
              if (visited.has(real.toLowerCase())) continue;
              visited.add(real.toLowerCase());
            }
          } else {
            st = fs.lstatSync(fp);
          }
        } catch {
          continue; // 断链或无权限
        }
        if (shouldIgnore(rel, st.isDirectory())) continue;
        if (st.isDirectory()) walk(fp);
        else if (st.isFile()) {
          list.push({ fullPath: fp, rel, mtime: st.mtime.toISOString(), size: st.size });
        }
      }
    };

    walk(root_);
    return list;
  }

  /**
   * 全量扫描：walk(root) 获得所有可访问文件，与 items 比较变更。
   * "新增"时检查 maxFiles/maxBytes 并设置 overLimit；
   * "删除"时取消 overLimit（重新有容量）；
   * "修改"时 hash/size 变化 rev++，否则 rev 保持；
   * 读取失败的条目从索引中删除。
   */
  function fullScan() {
    logger.info(`[folder-indexer] start scan`);
    const scanned = scan();
    const added = [];
    const modified = [];
    const removed = [];
    const seen = new Set();
    let tempBytes = totalBytes;
    let skipped = false; // 本轮是否有新文件因上限被跳过

    for (const entry of scanned) {
      seen.add(entry.rel);
      const old = items.get(entry.rel);

      if (!old) {
        // 新增：检查上限
        if (items.size >= maxFiles || tempBytes + entry.size > maxBytes) {
          skipped = true;
        } else {
          const item = makeItem(entry, null);
          if (item) {
            items.set(entry.rel, item);
            tempBytes += item.size;
            added.push(item);
          }
        }
      } else if (old.mtime !== entry.mtime || old.size !== entry.size) {
        const item = makeItem(entry, old);
        if (item) {
          tempBytes = tempBytes - old.size + item.size;
          items.set(entry.rel, item);
          modified.push(item);
        } else {
          // 读失败，删除旧的
          items.delete(entry.rel);
          tempBytes -= old.size;
          removed.push(old);
        }
      }
    }

    // 被删除的条目
    for (const [rel, item] of items) {
      if (!seen.has(rel)) {
        items.delete(rel);
        tempBytes -= item.size;
        removed.push(item);
      }
    }

    totalBytes = tempBytes;
    // 有新文件被跳过，或遍历触到硬上限，都视为超限
    overLimit = skipped || scanned.length >= Math.max(maxFiles * 10, 10000);
    lastUpdated = new Date().toISOString();
    logger.info(
      `[folder-indexer] scan complete: +${added.length} ~${modified.length} -${removed.length}, bytes=${totalBytes}, overLimit=${overLimit}`
    );

    if ((added.length || modified.length || removed.length) && onChange) {
      onChange({ added, modified, removed });
    }
  }

  /**
   * 文件系统变化回调（带防抖）。
   */
  function onFsChange() {
    if (debounce) clearTimeout(debounce);
    debounce = setTimeout(() => {
      fullScan();
    }, DEBOUNCE_MS);
  }

  /**
   * 启动索引器。
   * 1. 首次同步全量扫描
   * 2. fs.watch(recursive) 事件经 300ms 防抖触发重扫
   * 3. 每 30s 兜底重扫（Windows deep watch 不稳定）
   */
  function start() {
    logger.info(`[folder-indexer] start: ${root_}`);
    fullScan();

    try {
      watcher = fs.watch(root_, { recursive: true }, (eventType, filename) => {
        logger.info(`[folder-indexer] fs.watch: ${eventType} ${filename}`);
        onFsChange();
      });
    } catch (err) {
      logger.warn(`[folder-indexer] fs.watch failed: ${err.message}`);
    }

    interval = setInterval(() => {
      fullScan();
    }, RECONCILE_MS);
  }

  /**
   * 停止索引器。
   */
  function stop() {
    logger.info(`[folder-indexer] stop`);
    if (watcher) watcher.close();
    if (debounce) clearTimeout(debounce);
    if (interval) clearInterval(interval);
    watcher = debounce = interval = null;
  }

  /**
   * 返回当前所有条目。
   */
  function getItems() {
    return Array.from(items.values());
  }

  /**
   * 按相对路径获取条目。
   */
  function getItem(p) {
    return items.get(p.replace(/\\/g, '/')) || null;
  }

  /**
   * 读取文件内容（路径安全检查后）。
   */
  async function readContent(p) {
    const fullPath = resolveSafe(p);
    const st = fs.statSync(fullPath);
    if (st.size > textSizeLimit) {
      throw new Error(`File too large: ${st.size} > ${textSizeLimit}`);
    }
    return new Promise((res, rej) => {
      fs.readFile(fullPath, 'utf-8', (err, data) => {
        err ? rej(err) : res(data);
      });
    });
  }

  /**
   * 返回统计信息。
   */
  function getStats() {
    return {
      count: items.size,
      bytes: totalBytes,
      updatedAt: lastUpdated,
      overLimit,
    };
  }

  return { start, stop, getItems, getItem, readContent, getStats };
}
