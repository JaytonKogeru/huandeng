import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
if (process.argv[2] !== '--check') {
  process.stderr.write(
    'HUANDENG is distributed as a desktop release. npm publication is disabled.\nSee docs/RELEASE-POLICY.md.\n',
  );
  process.exitCode = 1;
} else {
  for (const name of ['core', 'cli', 'desktop']) {
    const manifest = JSON.parse(
      await fs.readFile(path.join(root, 'packages', name, 'package.json'), 'utf8'),
    );
    assert.equal(manifest.private, true, `${name} must not be publishable.`);
    assert.notEqual(manifest.publishConfig?.access, 'public', `${name} retains public publishing.`);
  }
  const manifest = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8'));
  assert.equal(manifest.private, true);
  assert.equal(manifest.scripts.release, 'node scripts/guard-product-publish.mjs');
  process.stdout.write('Product packages are private; npm release entry is blocked.\n');
}
