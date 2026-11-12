import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { desktopRuntimeDependencies } from './desktop-runtime-dependencies.mjs';
import { productManifests, setProductVersion } from './set-product-version.mjs';
import { verifyReplaceableBuild } from './verify-replaceable-build.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('product publication cannot invoke an inherited npm publisher', () => {
  const guard = path.join(root, 'scripts/guard-product-publish.mjs');
  const check = spawnSync(process.execPath, [guard, '--check'], { encoding: 'utf8' });
  assert.equal(check.status, 0, check.stderr);
  const blocked = spawnSync(process.execPath, [guard], { encoding: 'utf8' });
  assert.equal(blocked.status, 1);
  assert.match(blocked.stderr, /npm publication is disabled/);
});

test('product version updates all native-client metadata and rejects inconsistent input', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'huandeng-version-'));
  try {
    for (const file of productManifests) {
      await fs.mkdir(path.dirname(path.join(directory, file)), { recursive: true });
      await fs.writeFile(
        path.join(directory, file),
        JSON.stringify({ version: '0.22.2', retained: file }),
      );
    }
    await assert.rejects(setProductVersion('0.23.0; publish', directory));
    assert.equal((await setProductVersion('0.23.0', directory)).previous, '0.22.2');
    for (const file of productManifests) {
      assert.deepEqual(JSON.parse(await fs.readFile(path.join(directory, file), 'utf8')), {
        version: '0.23.0',
        retained: file,
      });
    }
    const first = path.join(directory, productManifests[0]);
    await fs.writeFile(first, JSON.stringify({ version: '0.24.0' }));
    await assert.rejects(setProductVersion('0.25.0', directory), /disagree/);
    assert.equal(JSON.parse(await fs.readFile(first, 'utf8')).version, '0.24.0');
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test('desktop dependency graph retains scientific export while excluding browser-only duplicates', async () => {
  const { dependencies, files } = await desktopRuntimeDependencies(
    path.join(root, 'packages/core'),
  );
  for (const name of ['playwright', 'katex', 'fflate', '@modelcontextprotocol/sdk'])
    assert.ok(dependencies[name], name);
  for (const name of ['echarts', 'lucide-react', 'emoji-picker-react', 'shadcn'])
    assert.equal(dependencies[name], undefined, name);
  assert.ok(files.includes('dist/huandeng/bin.js'));
});

test('package replacement rejects personal additions and modified files before deletion', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'huandeng-replace-'));
  try {
    const data = new Map([
      ['HUANDENG Editor.exe', 'synthetic executable'],
      [
        'huandeng-build.json',
        JSON.stringify({ product: 'HUANDENG Editor', productVersion: '0.23.0' }),
      ],
    ]);
    const files = {};
    for (const [file, content] of data) {
      await fs.writeFile(path.join(directory, file), content);
      files[file] = {
        bytes: Buffer.byteLength(content),
        sha256: createHash('sha256').update(content).digest('hex'),
      };
    }
    await fs.writeFile(
      path.join(directory, 'huandeng-content.json'),
      JSON.stringify({ schemaVersion: 1, productVersion: '0.23.0', files }),
    );
    assert.equal((await verifyReplaceableBuild(directory)).replaceable, true);
    const personal = path.join(directory, 'Research.pptd');
    await fs.writeFile(personal, 'must remain');
    await assert.rejects(verifyReplaceableBuild(directory), /Unowned file/);
    assert.equal(await fs.readFile(personal, 'utf8'), 'must remain');
    await fs.rm(personal);
    await fs.writeFile(path.join(directory, 'HUANDENG Editor.exe'), 'modified executable');
    await assert.rejects(verifyReplaceableBuild(directory), /Modified application file/);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});
