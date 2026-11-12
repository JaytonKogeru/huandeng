import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export async function verifyReplaceableBuild(directory) {
  const root = await fs.realpath(directory);
  const build = JSON.parse(await fs.readFile(path.join(root, 'huandeng-build.json'), 'utf8'));
  const manifest = JSON.parse(await fs.readFile(path.join(root, 'huandeng-content.json'), 'utf8'));
  assert.equal(build.product, 'HUANDENG Editor');
  assert.equal(manifest.schemaVersion, 1);
  assert.equal(manifest.productVersion, build.productVersion);
  assert.ok(manifest.files && typeof manifest.files === 'object' && !Array.isArray(manifest.files));
  const expected = new Set(Object.keys(manifest.files));
  assert.ok(expected.has('HUANDENG Editor.exe'));
  async function inspect(folder) {
    for (const item of await fs.readdir(folder, { withFileTypes: true })) {
      const file = path.join(folder, item.name);
      assert.equal(item.isSymbolicLink(), false, 'Refusing to replace a build containing links.');
      if (item.isDirectory()) await inspect(file);
      else {
        const relative = path.relative(root, file).replaceAll('\\', '/');
        if (relative === 'huandeng-content.json') continue;
        assert.ok(expected.delete(relative), `Unowned file would be removed: ${relative}`);
        const data = await fs.readFile(file);
        const identity = manifest.files[relative];
        assert.equal(data.length, identity.bytes, `Modified application file: ${relative}`);
        assert.equal(
          createHash('sha256').update(data).digest('hex'),
          identity.sha256,
          `Modified application file: ${relative}`,
        );
      }
    }
  }
  await inspect(root);
  assert.equal(expected.size, 0, 'Application files are missing; choose a new output directory.');
  return { replaceable: true, files: Object.keys(manifest.files).length };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.stdout.write(
    `${JSON.stringify(await verifyReplaceableBuild(path.resolve(process.argv[2])))}\n`,
  );
}
