/**
 * session-reader.js
 * 读取 DSH 会话文件：~/.dsh/sessions/<workspace-slug>/session-<uuid>/session.v4.jsonl.zstd
 *
 * 会话文件是多帧 zstd。Node 的 zlib.zstdDecompressSync 只解第一帧，
 * 因此这里扫描 magic 28 B5 2F FD，从每个 magic 偏移各解一帧，再拼接结果。
 * 只依赖 Node 内置模块。
 */
import { zstdDecompressSync } from 'node:zlib';
import { readFile, readdir, stat } from 'node:fs/promises';
import { join, normalize } from 'node:path';

const SESSION_FILE_NAME = 'session.v4.jsonl.zstd';

/**
 * 返回 buffer 中所有 zstd 帧 magic（28 B5 2F FD）的偏移。
 */
function findFrameOffsets(buf) {
  const offsets = [];
  for (let i = 0; i + 3 < buf.length; i++) {
    if (buf[i] === 0x28 && buf[i + 1] === 0xb5 && buf[i + 2] === 0x2f && buf[i + 3] === 0xfd) {
      offsets.push(i);
    }
  }
  return offsets;
}

/**
 * 从指定偏移解一帧。zstdDecompressSync 解完第一帧后忽略剩余字节。
 * 失败（坏帧，或压缩数据里碰巧出现的伪 magic）返回 null。
 */
function decodeFrameAt(buf, offset) {
  try {
    return zstdDecompressSync(buf.subarray(offset));
  } catch {
    return null;
  }
}

/**
 * 逐帧解压整个 buffer，拼接所有成功解出的帧。
 */
function decodeAllFrames(buf) {
  const chunks = [];
  for (const offset of findFrameOffsets(buf)) {
    const out = decodeFrameAt(buf, offset);
    if (out && out.length > 0) chunks.push(out);
  }
  return Buffer.concat(chunks);
}

/**
 * 把解压后的文本按换行拆分并 JSON.parse，坏行跳过。
 */
function parseJsonLines(text) {
  const objects = [];
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      objects.push(JSON.parse(trimmed));
    } catch {
      // 非 JSON 行（例如截断的末行）跳过
    }
  }
  return objects;
}

/**
 * 解码单个会话文件为 { meta, turns }。
 * meta: 首行 {type:'session', version, id, createdAt, cwd, agentPreset, ...}，找不到时为 null
 * turns: 其余行（原始对象），坏行跳过
 * 文件不存在或不可读时 throw，错误信息包含路径。
 */
export async function readSession(filePath) {
  let buf;
  try {
    buf = await readFile(filePath);
  } catch (err) {
    throw new Error(`readSession: cannot read ${filePath}: ${err.message}`, { cause: err });
  }

  const rows = parseJsonLines(decodeAllFrames(buf).toString('utf8'));

  // 首行是 session 元数据；若首行不是 session 类型，则 meta 为 null，全部视为 turn
  let meta = null;
  let turns = rows;
  if (rows.length > 0 && rows[0] && rows[0].type === 'session') {
    meta = rows[0];
    turns = rows.slice(1);
  }
  return { meta, turns };
}

/**
 * 只读会话元数据（不解完整文件），用于快速扫描。
 * 先试第一帧，若无效 session 行则解全部帧。
 * 找到 type:'session' 的行就返回，找不到返回 null。
 * 文件不存在或不可读返回 null。
 */
export async function readSessionMeta(filePath) {
  let buf;
  try {
    buf = await readFile(filePath);
  } catch {
    return null;
  }

  const offsets = findFrameOffsets(buf);
  if (offsets.length === 0) return null;

  // 先试第一帧
  const first = decodeFrameAt(buf, offsets[0]);
  if (first) {
    const rows = parseJsonLines(first.toString('utf8'));
    for (const row of rows) {
      if (row && row.type === 'session') return row;
    }
  }

  // 若第一帧无有效 session，全解
  try {
    const rows = parseJsonLines(decodeAllFrames(buf).toString('utf8'));
    for (const row of rows) {
      if (row && row.type === 'session') return row;
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * 扫描会话目录 sessionsRoot（通常 ~/.dsh/sessions），找所有 session.v4.jsonl.zstd 文件。
 * cwdFilter: 可选，标准化路径。仅返回 cwd 以 cwdFilter 开头的会话（大小写不敏感，Windows 路径标准化）。
 * 返回 [{ sessionId, cwd, createdAt, agentPreset, filePath, fileSize, fileMtime }, ...]
 * 按 createdAt 降序排列。
 * 单个文件错误不终止，继续扫描。
 */
export async function listSessions(sessionsRoot, cwdFilter) {
  const results = [];

  // 标准化并转小写以便比较
  const filterNorm = cwdFilter ? normalize(cwdFilter).toLowerCase() : null;

  /**
   * 递归遍历目录树，收集所有会话文件的元信息。
   */
  async function walk(dir) {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return; // 目录不存在或无权限
    }

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.name === SESSION_FILE_NAME) {
        // 读元信息；失败时记录 error 字段，不终止扫描
        const meta = await readSessionMeta(fullPath);
        if (!meta) {
          // 有 cwdFilter 时无法判断归属，跳过；无过滤时保留一条带 error 的记录
          if (!filterNorm) {
            results.push({
              sessionId: null, cwd: '', createdAt: null, agentPreset: '',
              filePath: fullPath, fileSize: 0, fileMtime: null,
              error: 'failed to read session meta',
            });
          }
          continue;
        }

        // 检查 cwdFilter（大小写不敏感）
        if (filterNorm) {
          const cwdNorm = meta.cwd ? normalize(meta.cwd).toLowerCase() : '';
          if (!cwdNorm.startsWith(filterNorm)) continue;
        }

        // 获取文件统计
        let fileSize = 0;
        let fileMtime = null;
        try {
          const stats = await stat(fullPath);
          fileSize = stats.size;
          fileMtime = stats.mtime;
        } catch {
          // 无权限或其他错误
        }

        results.push({
          sessionId: meta.id || 'unknown',
          cwd: meta.cwd || '',
          createdAt: meta.createdAt || '',
          agentPreset: meta.agentPreset || '',
          filePath: fullPath,
          fileSize,
          fileMtime
        });
      }
    }
  }

  await walk(sessionsRoot);

  // 按 createdAt 降序
  results.sort((a, b) => {
    const ta = new Date(a.createdAt).getTime() || 0;
    const tb = new Date(b.createdAt).getTime() || 0;
    return tb - ta;
  });

  return results;
}
