import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';

const root = process.cwd();
const requireCore = createRequire(path.join(root, 'packages/core/package.json'));
const { build } = createRequire(requireCore.resolve('vite'))('esbuild');
await build({
  entryPoints: [path.join(root, 'packages/core/src/pptd/store.ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  packages: 'external',
  outfile: path.join(root, 'packages/core/.verification/v07-performance-store.mjs'),
});
const files = [
  'packages/core/src/pptd/store.ts',
  'packages/core/src/pptd/page-history.ts',
  'packages/core/src/pptd/persistence.ts',
  'packages/core/src/pptd/runtime-export.ts',
  'packages/core/src/vite/routes/pptd.ts',
  'packages/core/src/app/lib/pptd-document.ts',
  'packages/core/.verification/v07-performance-store.mjs',
  'scripts/diagnose-store-v07.mjs',
];
await fs.mkdir(path.join(root, '.verification/v07-performance'), { recursive: true });
const hashes = {};
for (const file of files)
  hashes[file] = createHash('sha256')
    .update(await fs.readFile(path.join(root, file)))
    .digest('hex');
await fs.writeFile(
  path.join(root, '.verification/v07-performance/source-binding.json'),
  JSON.stringify({ at: new Date().toISOString(), files: hashes }, null, 2),
);
console.log('Built isolated actual-source diagnostic; no product outputs changed.');
