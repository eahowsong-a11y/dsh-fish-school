// lib/updater.js — one-click self-update for the fish-school plugin.
//
// Workflow:
//   1. Caller supplies the asset download URL (from /check-update).
//   2. Download the .tgz with redirect support.
//   3. Gunzip → parse POSIX tar → extract files under package/.
//   4. Locate the plugin's own install directory (from import.meta.url).
//   5. Write new files over the old ones (atomic per-file rename).
//   6. Patch integrity + version in both pnpm lockfiles.
//
// The plugin cannot hot-reload itself. The caller should return
// `restartRequired: true` and prompt the user to restart DSH.

import { createHash } from 'node:crypto';
import { createGunzip } from 'node:zlib';
import { createWriteStream, existsSync, mkdirSync, renameSync, writeFileSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, basename, resolve } from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import { get as httpsGet } from 'node:https';
import { get as httpGet } from 'node:http';

const PKG_NAME = '@local/fish-school';
const MAX_DOWNLOAD_BYTES = 10 * 1024 * 1024; // 10 MB safety cap

/** Follow up to 5 HTTP/HTTPS redirects and resolve with the response. */
async function fetchRedirect(url, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    const attempt = (u, hops) => {
      const lib = u.startsWith('https') ? httpsGet : httpGet;
      lib(u, { headers: { 'User-Agent': 'dsh-fish-school-updater' } }, res => {
        if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
          if (hops >= maxRedirects) return reject(new Error('Too many redirects'));
          res.resume();
          return attempt(new URL(res.headers.location, u).href, hops + 1);
        }
        resolve(res);
      }).on('error', reject);
    };
    attempt(url, 0);
  });
}

/** Download a URL to a Buffer, enforcing MAX_DOWNLOAD_BYTES. */
async function downloadBuffer(url, onProgress) {
  const res = await fetchRedirect(url);
  if (res.statusCode !== 200) throw new Error(`Download failed: HTTP ${res.statusCode}`);
  const total = parseInt(res.headers['content-length'] ?? '0', 10);
  return new Promise((resolve, reject) => {
    const chunks = [];
    let received = 0;
    res.on('data', chunk => {
      received += chunk.length;
      if (received > MAX_DOWNLOAD_BYTES) return reject(new Error('Download exceeds 10 MB safety cap'));
      chunks.push(chunk);
      if (total) onProgress?.({ received, total });
    });
    res.on('end', () => resolve(Buffer.concat(chunks)));
    res.on('error', reject);
  });
}

/** Minimal synchronous POSIX tar reader on a Buffer. Yields { path, data } entries. */
function* parseTar(buf) {
  let offset = 0;
  while (offset + 512 <= buf.length) {
    const name = buf.slice(offset, offset + 100).toString('utf8').replace(/\0.*$/, '');
    if (!name) break; // end-of-archive
    const sizeOctal = buf.slice(offset + 124, offset + 136).toString('utf8').replace(/\0.*$/, '').trim();
    const size = parseInt(sizeOctal, 8) || 0;
    const typeflag = buf.slice(offset + 156, offset + 157).toString('utf8').replace(/\0/, '');
    const prefix = buf.slice(offset + 345, offset + 500).toString('utf8').replace(/\0.*$/, '');
    const fullPath = (prefix ? prefix + '/' : '') + name;
    offset += 512; // skip header
    if (typeflag === '' || typeflag === '0') { // regular file
      if (size > 0) {
        yield { path: fullPath, data: buf.slice(offset, offset + size) };
      }
    }
    offset += Math.ceil(size / 512) * 512;
  }
}

/** Locate this plugin's own installed directory from import.meta.url. */
function findInstallDir() {
  try {
    const thisFile = fileURLToPath(import.meta.url);
    // This file is at <installDir>/lib/updater.js
    return resolve(dirname(thisFile), '..');
  } catch {
    return null;
  }
}

/**
 * The DSH profile dir: DSH_PROFILE_DIR when set, otherwise the nearest ancestor
 * of the install dir that holds both package.json and pnpm-lock.yaml (the pnpm
 * virtual store nests the plugin ~6 levels below it).
 */
function findProfileDir(installDir) {
  const env = process.env.DSH_PROFILE_DIR;
  if (env && existsSync(join(env, 'package.json'))) return env;
  let dir = installDir;
  for (let i = 0; i < 10; i++) {
    const up = dirname(dir);
    if (up === dir) break;
    dir = up;
    if (existsSync(join(dir, 'pnpm-lock.yaml')) && existsSync(join(dir, 'package.json'))) return dir;
  }
  return null;
}

/** Update a single pnpm lockfile entry: integrity hash and version. */
function patchLockfile(lockPath, newIntegrity, newVersion) {
  if (!existsSync(lockPath)) return false;
  let text = readFileSync(lockPath, 'utf8');
  const lines = text.split('\n');
  let hit = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/^  '@local\/fish-school@file:/) && lines[i + 1]?.includes('resolution: {integrity:')) {
      hit = i; break;
    }
  }
  if (hit < 0) return false;
  // Swap only the integrity value; keep the tarball path and anything else as written.
  lines[hit + 1] = lines[hit + 1].replace(/integrity: [^,}]+/, `integrity: ${newIntegrity}`);
  if (lines[hit + 2]?.match(/^\s+version:/)) lines[hit + 2] = `    version: ${newVersion}`;
  writeFileSync(lockPath, lines.join('\n'), 'utf8');
  return true;
}

/**
 * Run the full self-update: download → extract → install → patch lockfiles.
 * @param {object} opts
 * @param {string}   opts.assetUrl     - direct URL to the .tgz asset
 * @param {string}   opts.targetVersion - e.g. "2.0.0"
 * @param {function} [opts.onProgress] - ({ step, received, total, pct }) => void
 * @returns {{ from, to, files, lockfilesPatched, restartRequired:true }}
 */
export async function runUpdate({ assetUrl, targetVersion, onProgress, installDir: dirOverride }) {
  if (!assetUrl) throw new Error('assetUrl is required');
  if (!/^https:\/\//.test(assetUrl)) throw new Error('assetUrl must be https');

  const step = (name, extra = {}) => onProgress?.({ step: name, ...extra });

  // 1. Download
  step('downloading');
  const tgzBuf = await downloadBuffer(assetUrl, p => step('downloading', p));

  // 2. Compute new integrity
  const newHash = createHash('sha512').update(tgzBuf).digest('base64');
  const newIntegrity = `sha512-${newHash}`;

  // 3. Gunzip + untar
  step('extracting');
  const tarBuf = await new Promise((resolve, reject) => {
    const gz = createGunzip();
    const chunks = [];
    gz.on('data', c => chunks.push(c));
    gz.on('end', () => resolve(Buffer.concat(chunks)));
    gz.on('error', reject);
    gz.end(tgzBuf);
  });

  // 4. Find install directory. Refuse to overwrite a source checkout: a real
  // install always lives under node_modules.
  const installDir = dirOverride ?? findInstallDir();
  if (!installDir) throw new Error('Cannot locate plugin install directory');
  if (!dirOverride && !/[\\/]node_modules[\\/]/.test(installDir)) {
    throw new Error(`Not an installed copy (${installDir}); refusing to overwrite source files`);
  }

  // Validate the package before touching anything.
  const entries = [...parseTar(tarBuf)];
  const pkgEntry = entries.find(e => e.path === 'package/package.json');
  if (!pkgEntry) throw new Error('Archive has no package/package.json');
  const pkg = JSON.parse(pkgEntry.data.toString('utf8'));
  if (pkg.name !== PKG_NAME) throw new Error(`Archive is ${pkg.name}, expected ${PKG_NAME}`);
  if (targetVersion && pkg.version !== targetVersion) {
    throw new Error(`Archive version ${pkg.version} does not match ${targetVersion}`);
  }
  targetVersion = pkg.version;

  // 5. Extract and write files
  step('installing', { dir: installDir });
  const written = [];
  for (const { path: tarPath, data } of entries) {
    // All files are under package/ in a npm tgz
    const relPath = tarPath.replace(/^package\//, '');
    if (!relPath || relPath.startsWith('../') || relPath.includes('/..')) continue;
    const dest = join(installDir, relPath);
    mkdirSync(dirname(dest), { recursive: true });
    // Atomic write
    const tmp = `${dest}.${Date.now()}.upd`;
    writeFileSync(tmp, data);
    renameSync(tmp, dest);
    written.push(relPath);
  }

  // 6. Patch lockfiles
  step('patching');
  const profileDir = findProfileDir(installDir);
  if (!profileDir) {
    step('done');
    return { from: PKG_NAME, to: targetVersion, files: written.length, lockfilesPatched: 0, restartRequired: true };
  }
  const lock1 = join(profileDir, 'pnpm-lock.yaml');
  const lock2 = join(profileDir, 'node_modules', '.pnpm', 'lock.yaml');
  const p1 = patchLockfile(lock1, newIntegrity, targetVersion);
  const p2 = patchLockfile(lock2, newIntegrity, targetVersion);

  // 7. Also update the source tgz if the dependency points to a local file
  try {
    const profPkgJson = JSON.parse(readFileSync(join(profileDir, 'package.json'), 'utf8'));
    const depSpec = profPkgJson.dependencies?.[PKG_NAME] ?? '';
    if (depSpec.startsWith('file:')) {
      const tgzPath = resolve(profileDir, depSpec.replace('file:', '').trim());
      if (existsSync(dirname(tgzPath))) writeFileSync(tgzPath, tgzBuf);
    }
  } catch { /* non-critical */ }

  step('done');
  return {
    from: PKG_NAME, to: targetVersion, files: written.length,
    lockfilesPatched: (p1 ? 1 : 0) + (p2 ? 1 : 0),
    restartRequired: true,
  };
}
