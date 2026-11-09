'use strict';

const { spawn } = require('node:child_process');
const { createHash, randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const { createRequire } = require('node:module');
const os = require('node:os');
const path = require('node:path');
const { setTimeout: delay } = require('node:timers/promises');
const { inflateRawSync } = require('node:zlib');
const { pathKey } = require('./project.cjs');

function defaultConfigFile() {
  return path.join(
    process.env.LOCALAPPDATA ?? path.join(os.homedir(), '.local', 'state'),
    'Huandeng',
    'ShareBoxPublisher',
    'config.json',
  );
}

function validateConfig(input) {
  if (input?.schemaVersion !== 1 || !Array.isArray(input.projects))
    throw new Error('Invalid PPTX publisher configuration.');
  const entries = new Set();
  const destinations = new Set();
  const ids = new Set();
  const projects = input.projects.map((project) => {
    if (
      !project ||
      typeof project.id !== 'string' ||
      !/^[a-zA-Z0-9_-]{1,64}$/.test(project.id) ||
      ids.has(project.id)
    )
      throw new Error('Publisher Project IDs must be unique.');
    if (
      typeof project.entry !== 'string' ||
      !path.isAbsolute(project.entry) ||
      path.extname(project.entry).toLowerCase() !== '.pptd'
    )
      throw new Error('Each publisher Project needs an absolute PPTD entry.');
    if (
      typeof project.destination !== 'string' ||
      !path.isAbsolute(project.destination) ||
      path.extname(project.destination).toLowerCase() !== '.pptx'
    )
      throw new Error('Each publisher destination must be an absolute PPTX file.');
    const entry = path.resolve(project.entry);
    const destination = path.resolve(project.destination);
    if (entries.has(pathKey(entry)) || destinations.has(pathKey(destination)))
      throw new Error('Publisher entries and destinations must be unique.');
    const projectFile = path.join(
      path.dirname(entry),
      'Exports',
      `${path.basename(entry, path.extname(entry))}.pptx`,
    );
    if (pathKey(projectFile) === pathKey(destination))
      throw new Error('The shared copy must have a different path from the Project export.');
    entries.add(pathKey(entry));
    destinations.add(pathKey(destination));
    ids.add(project.id);
    return { id: project.id, entry, destination };
  });
  const quietMs = input.quietMs ?? 3000;
  if (!Number.isInteger(quietMs) || quietMs < 0 || quietMs > 300000)
    throw new Error('Invalid publisher quiet period.');
  for (const project of projects) {
    const output = path.join(
      path.dirname(project.entry),
      'Exports',
      `${path.basename(project.entry, path.extname(project.entry))}.pptx`,
    );
    if (destinations.has(pathKey(output)))
      throw new Error('A shared destination cannot overwrite another Project export.');
  }
  return { schemaVersion: 1, projects, quietMs };
}

async function coreLauncher() {
  for (const candidate of [
    path.join(__dirname, 'node_modules', '@open-slide', 'core', 'huandeng.js'),
    path.resolve(__dirname, '..', 'core', 'huandeng.js'),
  ]) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {}
  }
  throw new Error('The installed HUANDENG document runtime is missing.');
}

async function fingerprint(entry) {
  const root = await fs.realpath(path.dirname(entry));
  const files = new Set([await fs.realpath(entry)]);
  const launcher = await coreLauncher();
  const { parse } = createRequire(launcher)('yaml');
  const manifest = parse(await fs.readFile(entry, 'utf8'));
  if (!Array.isArray(manifest?.pages)) throw new Error('The PPTD Main Slides sequence is invalid.');
  const inside = (file) => {
    const relative = path.relative(root, file);
    return relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
  };
  for (const value of manifest.pages) {
    const relative = typeof value === 'string' ? value : value?.path;
    if (typeof relative !== 'string') throw new Error('The PPTD page path is invalid.');
    const file = await fs.realpath(path.resolve(root, relative));
    if (!inside(file)) throw new Error('The publisher cannot read a page outside its Project.');
    files.add(file);
  }
  const metadata = path.join(root, '.huandeng', 'project.json');
  try {
    await fs.access(metadata);
    files.add(metadata);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  async function scan(directory) {
    let entries;
    try {
      entries = await fs.readdir(directory, { withFileTypes: true });
    } catch (error) {
      if (error.code === 'ENOENT') return;
      throw error;
    }
    for (const item of entries) {
      if (item.name === '.huandeng-versions') continue;
      const file = path.join(directory, item.name);
      if (item.isSymbolicLink())
        throw new Error('The publisher cannot follow asset links outside its saved Project.');
      if (item.isDirectory()) await scan(file);
      else if (item.isFile()) files.add(file);
    }
  }
  await scan(path.join(root, 'media'));
  await scan(path.join(root, 'assets'));
  const hash = createHash('sha256');
  let newest = 0;
  for (const file of [...files].sort()) {
    const before = await fs.stat(file);
    hash.update(path.relative(root, file).replaceAll(path.sep, '/')).update('\0');
    const handle = await fs.open(file, 'r');
    try {
      for await (const chunk of handle.createReadStream({ autoClose: false })) hash.update(chunk);
    } finally {
      await handle.close();
    }
    const after = await fs.stat(file);
    if (before.size !== after.size || before.mtimeMs !== after.mtimeMs)
      throw new Error('Project changed while its saved content was being read.');
    newest = Math.max(newest, after.mtimeMs);
    hash.update('\0');
  }
  return { digest: hash.digest('hex'), newest, count: files.size };
}

const crcTable = Uint32Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});

function crc32(bytes) {
  let value = 0xffffffff;
  for (const byte of bytes) value = crcTable[(value ^ byte) & 255] ^ (value >>> 8);
  return (value ^ 0xffffffff) >>> 0;
}

function validatePptx(bytes, expectedSlides) {
  if (!Buffer.isBuffer(bytes) || bytes.length < 100 || bytes.length > 512 * 1024 * 1024)
    throw new Error('PPTX size is invalid.');
  let end = -1;
  for (let offset = bytes.length - 22; offset >= Math.max(0, bytes.length - 65557); offset--) {
    if (
      bytes.readUInt32LE(offset) === 0x06054b50 &&
      offset + 22 + bytes.readUInt16LE(offset + 20) === bytes.length
    ) {
      end = offset;
      break;
    }
  }
  if (end < 0 || bytes.readUInt16LE(end + 4) || bytes.readUInt16LE(end + 6))
    throw new Error('PPTX ZIP end is invalid.');
  const count = bytes.readUInt16LE(end + 10);
  const centralSize = bytes.readUInt32LE(end + 12);
  const centralOffset = bytes.readUInt32LE(end + 16);
  if (
    count === 65535 ||
    count !== bytes.readUInt16LE(end + 8) ||
    centralOffset + centralSize !== end
  )
    throw new Error('PPTX ZIP directory is invalid.');
  let offset = centralOffset;
  let expanded = 0;
  let slides = 0;
  let notes = 0;
  const names = new Set();
  const members = [];
  for (let index = 0; index < count; index++) {
    if (offset + 46 > end || bytes.readUInt32LE(offset) !== 0x02014b50)
      throw new Error('PPTX ZIP entry is invalid.');
    const flags = bytes.readUInt16LE(offset + 8);
    const method = bytes.readUInt16LE(offset + 10);
    const crc = bytes.readUInt32LE(offset + 16);
    const compressedSize = bytes.readUInt32LE(offset + 20);
    const size = bytes.readUInt32LE(offset + 24);
    const nameLength = bytes.readUInt16LE(offset + 28);
    const extraLength = bytes.readUInt16LE(offset + 30);
    const commentLength = bytes.readUInt16LE(offset + 32);
    const localOffset = bytes.readUInt32LE(offset + 42);
    if (offset + 46 + nameLength + extraLength + commentLength > end)
      throw new Error('PPTX ZIP entry is truncated.');
    const nameBytes = bytes.subarray(offset + 46, offset + 46 + nameLength);
    const name = nameBytes.toString('utf8');
    if (
      flags & 1 ||
      ![0, 8].includes(method) ||
      names.has(name) ||
      name.startsWith('/') ||
      name.includes('\\') ||
      name.split('/').includes('..')
    )
      throw new Error('PPTX ZIP member is unsupported.');
    expanded += size;
    if (
      expanded > 1024 * 1024 * 1024 ||
      localOffset + 30 > centralOffset ||
      bytes.readUInt32LE(localOffset) !== 0x04034b50
    )
      throw new Error('PPTX ZIP local entry is invalid.');
    const localNameLength = bytes.readUInt16LE(localOffset + 26);
    const localExtraLength = bytes.readUInt16LE(localOffset + 28);
    if (!bytes.subarray(localOffset + 30, localOffset + 30 + localNameLength).equals(nameBytes))
      throw new Error('PPTX ZIP member names disagree.');
    if (
      bytes.readUInt16LE(localOffset + 6) !== flags ||
      bytes.readUInt16LE(localOffset + 8) !== method
    )
      throw new Error('PPTX ZIP member headers disagree.');
    if (
      !(flags & 8) &&
      (bytes.readUInt32LE(localOffset + 14) !== crc ||
        bytes.readUInt32LE(localOffset + 18) !== compressedSize ||
        bytes.readUInt32LE(localOffset + 22) !== size)
    )
      throw new Error('PPTX ZIP member checksums or sizes disagree.');
    const dataOffset = localOffset + 30 + localNameLength + localExtraLength;
    if (dataOffset + compressedSize > centralOffset)
      throw new Error('PPTX ZIP content is truncated.');
    const compressed = bytes.subarray(dataOffset, dataOffset + compressedSize);
    const data =
      method === 0
        ? compressed
        : inflateRawSync(compressed, { maxOutputLength: Math.max(1, size) });
    if (data.length !== size || crc32(data) !== crc)
      throw new Error('PPTX ZIP content failed its checksum.');
    if (flags & 8) {
      const descriptor = dataOffset + compressedSize;
      const matches = (at) =>
        at + 12 <= centralOffset &&
        bytes.readUInt32LE(at) === crc &&
        bytes.readUInt32LE(at + 4) === compressedSize &&
        bytes.readUInt32LE(at + 8) === size;
      if (
        !matches(descriptor) &&
        !(
          descriptor + 4 <= centralOffset &&
          bytes.readUInt32LE(descriptor) === 0x08074b50 &&
          matches(descriptor + 4)
        )
      )
        throw new Error('PPTX ZIP data descriptor disagrees.');
    }
    names.add(name);
    members.push({ name: nameBytes, size, digest: createHash('sha256').update(data).digest() });
    if (/^ppt\/slides\/slide\d+\.xml$/.test(name)) slides++;
    if (/^ppt\/notesSlides\/notesSlide\d+\.xml$/.test(name)) notes++;
    offset += 46 + nameLength + extraLength + commentLength;
  }
  if (
    offset !== end ||
    !names.has('[Content_Types].xml') ||
    !names.has('_rels/.rels') ||
    !names.has('ppt/presentation.xml') ||
    !names.has('ppt/_rels/presentation.xml.rels') ||
    !slides ||
    notes > slides
  )
    throw new Error('PPTX presentation structure is incomplete.');
  if (expectedSlides !== undefined && slides !== expectedSlides)
    throw new Error('PPTX page count differs from the native export report.');
  // Include every exact member name and uncompressed payload. Framing the name
  // and size prevents ambiguity; sorting ignores only ZIP ordering/packaging.
  const content = createHash('sha256').update('HUANDENG-PPTX-content-v1\0');
  for (const member of members.sort((a, b) => Buffer.compare(a.name, b.name))) {
    const lengths = Buffer.alloc(8);
    lengths.writeUInt32LE(member.name.length, 0);
    lengths.writeUInt32LE(member.size, 4);
    content.update(lengths).update(member.name).update(member.digest);
  }
  return {
    slides,
    notes,
    bytes: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    contentSha256: content.digest('hex'),
  };
}

async function nativeExportOnce(entry) {
  const { startService, stopService } = require('./service.cjs');
  const service = await startService(entry);
  try {
    const launcher = await coreLauncher();
    const result = await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, [launcher, '--entry', entry, 'export', 'pptx'], {
        env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      let stdout = '',
        stderr = '',
        total = 0;
      const timer = setTimeout(() => {
        child.kill();
        reject(new Error('PPTX export exceeded its time limit.'));
      }, 300000);
      child.stdout.on('data', (chunk) => {
        total += chunk.length;
        if (total > 20_000_000) {
          child.kill();
          reject(new Error('PPTX export report exceeded its limit.'));
        } else stdout += chunk;
      });
      child.stderr.on('data', (chunk) => {
        stderr = `${stderr}${chunk}`.slice(-8000);
      });
      child.once('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
      child.once('close', (code) => {
        clearTimeout(timer);
        if (code === 0) {
          try {
            resolve(JSON.parse(stdout));
          } catch {
            reject(new Error('PPTX export returned an invalid report.'));
          }
        } else reject(new Error(`PPTX export failed: ${stderr.slice(-2000)}`));
      });
    });
    if (
      !result?.file ||
      !Array.isArray(result.report?.pages) ||
      !result.report.pages.length ||
      result.report.diagnostics?.some((item) => item.severity === 'error')
    )
      throw new Error('The native PPTX export did not complete successfully.');
    return result;
  } finally {
    await stopService(service);
  }
}

async function nativeExport(entry) {
  try {
    return await nativeExportOnce(entry);
  } catch (error) {
    if (
      !/fetch failed|ECONNREFUSED|ECONNRESET|ECONNABORTED|socket (?:hang up|closed)|No active Huandeng session|The operation was aborted/i.test(
        error.message,
      )
    )
      throw error;
    await delay(500);
    return nativeExportOnce(entry);
  }
}

async function atomicWrite(file, bytes, rename = fs.rename) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const stage = path.join(path.dirname(file), `.${path.basename(file)}.${randomUUID()}.tmp`);
  try {
    const handle = await fs.open(stage, 'wx');
    try {
      await handle.writeFile(bytes);
      await handle.sync();
    } finally {
      await handle.close();
    }
    for (let attempt = 0; ; attempt++) {
      try {
        await rename(stage, file);
        break;
      } catch (error) {
        if (!['EACCES', 'EPERM', 'EBUSY'].includes(error.code) || attempt === 3) throw error;
        await delay([100, 350, 1000][attempt]);
      }
    }
  } finally {
    await fs.rm(stage, { force: true }).catch(() => {});
  }
}

async function fileDigest(file) {
  try {
    return createHash('sha256')
      .update(await fs.readFile(file))
      .digest('hex');
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

async function publishProject(project, previous, options = {}) {
  const readFingerprint = options.fingerprint ?? fingerprint;
  const before = await readFingerprint(project.entry);
  if (!options.force && Date.now() - before.newest < (options.quietMs ?? 3000))
    return { ...previous, status: 'waiting', message: 'Waiting for saved changes to settle.' };
  const expectedFile = path.join(
    path.dirname(project.entry),
    'Exports',
    `${path.basename(project.entry, path.extname(project.entry))}.pptx`,
  );
  let result;
  const same =
    previous?.digest === before.digest &&
    previous.entry === project.entry &&
    previous.destination === project.destination;
  if (
    !options.force &&
    same &&
    previous.sha256 &&
    (await fileDigest(expectedFile)) === previous.sha256
  ) {
    if ((await fileDigest(project.destination)) === previous.sha256)
      return {
        ...previous,
        sharedSha256: previous.sha256,
        sharedBytes: previous.bytes,
        byteIdentical: true,
        status: 'current',
        message: 'Shared copy is current.',
      };
    let sharedBytes;
    try {
      sharedBytes = await fs.readFile(project.destination);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    if (sharedBytes) {
      let shared;
      try {
        shared = validatePptx(sharedBytes, previous.slides);
      } catch {
        /* A malformed shared package must follow the normal repair path. */
      }
      if (shared) {
        const canonical = validatePptx(await fs.readFile(expectedFile), previous.slides);
        if (canonical.sha256 !== previous.sha256)
          return {
            ...previous,
            status: 'waiting',
            message: 'Project PPTX changed during verification; shared copy was retained.',
          };
        if (canonical.contentSha256 === shared.contentSha256) {
          const after = await readFingerprint(project.entry);
          if (
            after.digest !== before.digest ||
            (await fileDigest(expectedFile)) !== canonical.sha256 ||
            (await fileDigest(project.destination)) !== shared.sha256
          )
            return {
              ...previous,
              status: 'waiting',
              message:
                'Project or shared PPTX changed during verification; shared copy was retained.',
            };
          return {
            ...previous,
            ...canonical,
            sharedSha256: shared.sha256,
            sharedBytes: shared.bytes,
            byteIdentical: false,
            status: 'current',
            message: 'Shared PPTX content is current; ZIP container metadata differs.',
          };
        }
      }
    }
    result = { file: expectedFile, report: { pages: Array.from({ length: previous.slides }) } };
  } else {
    result = await (options.exportDeck ?? nativeExport)(project.entry);
  }
  if (pathKey(result.file) !== pathKey(expectedFile))
    throw new Error('The native export did not write the configured Project output.');
  const bytes = await fs.readFile(result.file);
  const verified = validatePptx(bytes, result.report.pages.length);
  const after = await readFingerprint(project.entry);
  if (after.digest !== before.digest)
    return {
      ...previous,
      status: 'waiting',
      message: 'Project changed during export; shared copy was retained.',
    };
  await atomicWrite(project.destination, bytes, options.rename);
  if ((await fileDigest(project.destination)) !== verified.sha256)
    throw new Error('Shared PPTX verification failed.');
  return {
    entry: project.entry,
    destination: project.destination,
    projectFile: expectedFile,
    digest: before.digest,
    ...verified,
    sharedSha256: verified.sha256,
    sharedBytes: verified.bytes,
    byteIdentical: true,
    status: 'current',
    message: 'Project PPTX and shared copy are current.',
    publishedAt: new Date().toISOString(),
  };
}

async function readLock(file) {
  try {
    const stat = await fs.lstat(file);
    if (!stat.isDirectory() && !stat.isFile())
      throw new Error('Publisher lock has an unsupported file type.');
    const record = JSON.parse(
      await fs.readFile(stat.isDirectory() ? path.join(file, 'owner.json') : file, 'utf8'),
    );
    if (!Number.isInteger(record.pid) || record.pid < 1)
      throw new Error('Publisher lock has no valid process owner.');
    if (
      stat.isDirectory() &&
      (typeof record.owner !== 'string' || !/^[a-f0-9-]{36}$/i.test(record.owner))
    )
      throw new Error('Publisher lock has no valid ownership token.');
    return { ...record, legacy: stat.isFile() };
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

function ownerIsRunning(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code !== 'ESRCH';
  }
}

async function acquireLock(file) {
  const owner = randomUUID();
  const candidate = `${file}.${owner}.candidate`;
  const recovered = path.join(path.dirname(file), 'publisher-recovered-locks');
  let claimed = false;
  await fs.mkdir(candidate);
  try {
    const handle = await fs.open(path.join(candidate, 'owner.json'), 'wx');
    try {
      await handle.writeFile(
        JSON.stringify({ pid: process.pid, owner, startedAt: new Date().toISOString() }),
      );
      await handle.sync();
    } finally {
      await handle.close();
    }
    // Every visible lock is already nonempty. Atomic directory rename cannot
    // replace another nonempty lock, on either Windows or POSIX filesystems.
    for (let attempt = 0; attempt < 8; attempt++) {
      const existing = await readLock(file);
      if (existing?.legacy)
        throw new Error(
          'Publisher directory lock was replaced by a file; preserve it for recovery.',
        );
      try {
        await fs.rename(candidate, file);
        claimed = true;
        break;
      } catch (error) {
        const previous = await readLock(file);
        if (!previous) {
          if (['EEXIST', 'ENOTEMPTY', 'ENOENT', 'EACCES', 'EPERM'].includes(error.code)) continue;
          throw error;
        }
        if (ownerIsRunning(previous.pid)) return null;
        if (previous.legacy)
          throw new Error(
            'Publisher directory lock was replaced by a file; preserve it for recovery.',
          );
        await fs.mkdir(recovered, { recursive: true });
        const tombstone = path.join(recovered, previous.owner);
        try {
          await fs.rename(file, tombstone);
        } catch (reapError) {
          if (reapError.code === 'ENOENT') continue;
          const retired = await readLock(tombstone);
          if (retired?.owner !== previous.owner) throw reapError;
        }
        // Retain this nonempty tombstone. A contender that observed the same
        // dead owner can no longer move a later winner into this destination.
        // Removing tombstones while publishers run would reintroduce that race.
      }
    }
    if (!claimed) return null;
    return async () => {
      const current = await readLock(file);
      if (!current) return;
      if (current.legacy || current.owner !== owner)
        throw new Error('Publisher lock ownership changed unexpectedly; retain it for recovery.');
      const released = `${file}.${owner}.released`;
      await fs.rename(file, released);
      await fs.rm(released, { recursive: true, force: true });
    };
  } finally {
    if (!claimed) await fs.rm(candidate, { recursive: true, force: true });
  }
}

async function runPublisher(configFile = defaultConfigFile(), options = {}) {
  const config = validateConfig(JSON.parse(await fs.readFile(configFile, 'utf8')));
  const directory = path.dirname(configFile);
  // Never rename over the earlier file-lock namespace: Windows permits a
  // directory rename to replace a regular file. Deployment stops older task
  // versions before enabling this one; a remaining live older owner is busy.
  const legacy = await readLock(path.join(directory, 'publisher-v2.lock'));
  if (legacy) {
    if (ownerIsRunning(legacy.pid)) return { status: 'busy', results: [] };
    throw new Error(
      'A terminated older publisher left a legacy lock. Preserve it for explicit recovery after older publisher versions have stopped.',
    );
  }
  const release = await acquireLock(path.join(directory, 'publisher-v3.lock'));
  if (!release) return { status: 'busy', results: [] };
  const stateFile = path.join(directory, 'state-v2.json');
  let state = { schemaVersion: 1, projects: {} };
  try {
    try {
      state = JSON.parse(await fs.readFile(stateFile, 'utf8'));
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    if (state.schemaVersion !== 1 || !state.projects)
      throw new Error('Publisher state needs recovery.');
    const results = [];
    for (const project of config.projects) {
      if (
        options.entries?.length &&
        !options.entries.some((entry) => pathKey(entry) === pathKey(project.entry))
      )
        continue;
      const previous = state.projects[project.id];
      let result;
      try {
        result = await publishProject(project, previous, { ...options, quietMs: config.quietMs });
      } catch (error) {
        result = {
          ...previous,
          entry: project.entry,
          destination: project.destination,
          status: 'error',
          message: error.message,
        };
      }
      result.checkedAt = new Date().toISOString();
      state.projects[project.id] = result;
      results.push({ id: project.id, status: result.status, message: result.message });
      await atomicWrite(stateFile, `${JSON.stringify(state, null, 2)}\n`);
      if (
        result.status !== 'current' ||
        previous?.digest !== result.digest ||
        previous?.status !== result.status
      )
        await fs.appendFile(
          path.join(directory, 'publisher-v2.log'),
          `${result.checkedAt} ${project.id} ${result.status}: ${result.message}\n`,
        );
    }
    return {
      status: results.some((result) => result.status === 'error') ? 'error' : 'complete',
      results,
    };
  } finally {
    await release();
  }
}

function createPublisherScheduler(options = {}) {
  const configFile = options.configFile ?? defaultConfigFile();
  const pending = new Set();
  let timer;
  let disposed = false;
  async function flush() {
    clearTimeout(timer);
    if (disposed || !pending.size) return;
    const entries = [...pending];
    pending.clear();
    const config = validateConfig(JSON.parse(await fs.readFile(configFile, 'utf8')));
    const selected = entries.filter((entry) =>
      config.projects.some((project) => pathKey(project.entry) === pathKey(entry)),
    );
    if (!selected.length) return;
    const args = [
      __filename,
      '--config',
      configFile,
      ...selected.flatMap((entry) => ['--entry', entry]),
    ];
    const child = (options.spawn ?? spawn)(process.execPath, args, {
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
      windowsHide: true,
      detached: true,
      stdio: 'ignore',
    });
    child.on('error', options.onError ?? (() => {}));
    child.unref();
  }
  return {
    schedule(entry) {
      if (disposed) return;
      pending.add(entry);
      clearTimeout(timer);
      timer = setTimeout(() => {
        void flush().catch((error) => {
          if (error.code !== 'ENOENT') options.onError?.(error);
        });
      }, options.debounceMs ?? 10000);
      timer.unref?.();
    },
    flush,
    dispose() {
      disposed = true;
      clearTimeout(timer);
      pending.clear();
    },
  };
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const configIndex = args.indexOf('--config');
  const configFile = configIndex < 0 ? defaultConfigFile() : args[configIndex + 1];
  const entries = args.flatMap((arg, index) => (arg === '--entry' ? [args[index + 1]] : []));
  runPublisher(configFile, { force: args.includes('--force'), entries })
    .then((result) => {
      process.exitCode = result.status === 'error' ? 1 : 0;
    })
    .catch(async (error) => {
      try {
        await fs.appendFile(
          path.join(path.dirname(configFile), 'publisher-v2.log'),
          `${new Date().toISOString()} ERROR: ${error.message}\n`,
        );
      } catch {}
      process.exitCode = 1;
    });
}

module.exports = {
  defaultConfigFile,
  validateConfig,
  fingerprint,
  validatePptx,
  nativeExport,
  atomicWrite,
  publishProject,
  runPublisher,
  createPublisherScheduler,
};
