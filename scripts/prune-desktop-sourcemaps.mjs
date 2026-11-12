import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export async function desktopSourceMapBytes(file) {
  if (!file.endsWith('.map') || /^(?:licen[sc]e|notice|copying)(?:\.|$)/i.test(path.basename(file)))
    return 0;
  const source = await fs.readFile(file);
  let value;
  try {
    value = JSON.parse(source.toString('utf8'));
  } catch {
    return 0;
  }
  return value?.version === 3 &&
    ((Array.isArray(value.sources) && typeof value.mappings === 'string') ||
      Array.isArray(value.sections))
    ? source.byteLength
    : 0;
}

export async function pruneDesktopSourceMaps(directory) {
  const application = await fs.realpath(path.resolve(directory));
  const relative = path.relative(path.join(repository, '.verification'), application);
  const parts = relative.split(path.sep);
  if (
    path.isAbsolute(relative) ||
    parts.length !== 3 ||
    !/^desktop-package-[\w-]+$/.test(parts[0]) ||
    parts[1] !== 'resources' ||
    parts[2] !== 'app'
  )
    throw new Error('Source-map pruning is restricted to an isolated desktop package stage.');
  const manifest = JSON.parse(await fs.readFile(path.join(application, 'package.json'), 'utf8'));
  if (manifest.name !== '@huandeng/desktop')
    throw new Error('The package stage is not a HUANDENG desktop application.');
  const candidates = [];
  async function collect(folder) {
    for (const entry of await fs.readdir(folder, { withFileTypes: true })) {
      if (entry.isSymbolicLink()) continue;
      const file = path.join(folder, entry.name);
      if (entry.isDirectory()) await collect(file);
      else if (entry.isFile()) {
        const bytes = await desktopSourceMapBytes(file);
        if (bytes) candidates.push({ file, bytes });
      }
    }
  }
  const modules = path.join(application, 'node_modules');
  if ((await fs.lstat(modules)).isSymbolicLink())
    throw new Error('The package stage node_modules must be a real directory.');
  await collect(modules);
  for (const { file } of candidates) await fs.unlink(file);
  return {
    files: candidates.length,
    bytes: candidates.reduce((total, item) => total + item.bytes, 0),
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  process.stdout.write(`${JSON.stringify(await pruneDesktopSourceMaps(process.argv[2]))}\n`);
