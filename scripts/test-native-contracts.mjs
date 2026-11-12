import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const files = [];
for (const folder of ['packages/desktop', 'plugins/huandeng/scripts']) {
  for (const file of await fs.readdir(path.join(root, folder))) {
    if (/\.test\.(?:cjs|mjs)$/.test(file)) files.push(path.join(root, folder, file));
  }
}
files.push(path.join(root, 'scripts/release-tools.test.mjs'));
files.sort();
if (!files.length) throw new Error('Native client contracts were not found.');
const result = spawnSync(process.execPath, ['--test', ...files], { cwd: root, stdio: 'inherit' });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
