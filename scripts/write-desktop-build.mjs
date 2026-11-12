import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const stage = await fs.realpath(path.resolve(process.argv[2]));
const official = process.argv.includes('--official');
const relative = path.relative(path.join(root, '.verification'), stage);
if (!/^desktop-package-[\w-]+$/.test(relative))
  throw new Error('Build identity is restricted to an isolated desktop package stage.');
const json = async (file) => JSON.parse(await fs.readFile(path.join(root, file), 'utf8'));
const release = await json('packages/desktop/release.json');
const desktop = await json('packages/desktop/package.json');
const workspace = await json('package.json');
const git = (...args) =>
  execFileSync('git', ['-c', 'core.fsmonitor=false', '-C', root, ...args], {
    encoding: 'utf8',
    windowsHide: true,
  }).trim();
const sourceRevision = git('rev-parse', 'HEAD');
const sourceDirty = !!git('status', '--porcelain');
const expectedTag = `editor-v${release.version}`;
const tags = git('tag', '--points-at', 'HEAD').split(/\r?\n/);
if (official) {
  assert.equal(sourceDirty, false, 'Official builds require a clean checkout.');
  assert.ok(tags.includes(expectedTag), `Official build HEAD must carry ${expectedTag}`);
}
const electronVersion = (await fs.readFile(path.join(stage, 'version'), 'utf8')).trim();
assert.equal(
  electronVersion,
  desktop.devDependencies.electron,
  'Electron runtime does not match the lockfile input.',
);
const marker = {
  schemaVersion: 2,
  product: 'HUANDENG Editor',
  productVersion: release.version,
  desktopProtocol: 2,
  electronVersion,
  nodeLinker: 'hoisted',
  sourceRevision,
  sourceDirty,
  releaseTag: official ? expectedTag : null,
  channel: official ? 'release' : 'development',
  builtAt: new Date().toISOString(),
  nodeVersion: process.version,
  packageManager: workspace.packageManager,
  lockfileSha256: createHash('sha256')
    .update(await fs.readFile(path.join(root, 'pnpm-lock.yaml')))
    .digest('hex'),
  signing: 'unsigned',
};
await fs.writeFile(path.join(stage, 'huandeng-build.json'), `${JSON.stringify(marker, null, 2)}\n`);
const files = {};
async function scan(folder) {
  for (const entry of await fs.readdir(folder, { withFileTypes: true })) {
    const file = path.join(folder, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Manifest cannot include links: ${file}`);
    if (entry.isDirectory()) await scan(file);
    else if (entry.isFile()) {
      const relativeFile = path.relative(stage, file).replaceAll('\\', '/');
      if (relativeFile === 'huandeng-content.json') continue;
      const data = await fs.readFile(file);
      files[relativeFile] = {
        bytes: data.length,
        sha256: createHash('sha256').update(data).digest('hex'),
      };
    }
  }
}
await scan(stage);
const sortedFiles = Object.fromEntries(
  Object.entries(files).sort(([a], [b]) => a.localeCompare(b)),
);
await fs.writeFile(
  path.join(stage, 'huandeng-content.json'),
  `${JSON.stringify(
    { schemaVersion: 1, sourceRevision, productVersion: release.version, files: sortedFiles },
    null,
    2,
  )}\n`,
);
process.stdout.write(
  `${JSON.stringify({
    ...marker,
    fileCount: Object.keys(files).length,
    bytes: Object.values(files).reduce((sum, item) => sum + item.bytes, 0),
  })}\n`,
);
