import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, test } from 'node:test';
import { buildDeepseekBundle } from '../../scripts/build-deepseek.mjs';
import { ProjectRoutes } from './lib/controller.mjs';
import {
  launcherEnvironment,
  normalizeConfig,
  projectServerName,
  projectTargets,
} from './lib/projects.mjs';

const roots = [];
afterEach(async () => {
  for (const root of roots.splice(0)) await fs.rm(root, { recursive: true, force: true });
});
const entry = path.resolve('example', 'deck.pptd');
const config = () => normalizeConfig({});
const noop = { warn() {} };

test('names stay stable across ordering, counts, Unicode and long prefix collisions', () => {
  const inputs = [
    'D:\\one\\slides\\deck.pptd',
    'D:\\two\\slides\\deck.pptd',
    'D:\\中文\\deck.pptd',
  ];
  const names = inputs.map((input) => projectServerName('h'.repeat(32), input, 'win32'));
  assert.equal(new Set(names).size, 3);
  assert.ok(names.every((name) => /^[A-Za-z0-9_-]{1,32}$/.test(name)));
  assert.deepEqual(
    [...inputs]
      .reverse()
      .map((input) => projectServerName('h'.repeat(32), input, 'win32'))
      .reverse(),
    names,
  );
  assert.equal(
    projectServerName('huandeng', inputs[0], 'win32'),
    projectServerName('huandeng', inputs[0].toUpperCase(), 'win32'),
  );
});

test('configuration rejects ambiguous routes and invalid poll bounds', () => {
  assert.throws(() => normalizeConfig({ entry, entries: [entry] }), /choose/);
  assert.throws(() => normalizeConfig({ entries: entry }), /array/);
  assert.throws(() => normalizeConfig({ entries: Array(65).fill(entry) }), /at most 64/);
  assert.throws(() => normalizeConfig({ entry: 'relative.pptd' }), /absolute/);
  assert.throws(() => normalizeConfig({ url: 'http://127.0.0.1:1234' }), /exactly one/);
  assert.throws(() => normalizeConfig({ refreshIntervalMs: 0 }), /range/);
  assert.throws(() => normalizeConfig({ bindAllOpen: 'false' }), /boolean/);
});

test('DSH-normalized empty entries retain automatic discovery and single-entry compatibility', async () => {
  const automatic = normalizeConfig({ entries: [], bindAllOpen: true });
  const targets = await projectTargets(automatic, async () => [
    { entry, url: 'http://127.0.0.1:1234' },
  ]);
  assert.equal(targets.length, 1);
  assert.equal(targets[0].entry, entry);
  assert.equal(targets[0].pinned, false);
  assert.deepEqual(normalizeConfig({ entry, entries: [] }).entries, [entry]);
  assert.deepEqual(normalizeConfig({ entry: '', entries: [] }).entries, []);
});

test('discovery and launcher share runtimeDir, explicit pinning and safe environment', async () => {
  const runtimeDir = path.resolve('custom-runtime');
  const selected = normalizeConfig({ entries: [entry], runtimeDir });
  const targets = await projectTargets(
    selected,
    async (env) => {
      assert.equal(env.HUANDENG_RUNTIME_DIR, runtimeDir);
      assert.equal(env.UNRELATED_SECRET, 'inherited-for-discovery-only');
      return [
        { entry, url: 'http://127.0.0.1:1234', epoch: 'one' },
        { entry: path.resolve('other', 'deck.pptd') },
      ];
    },
    {
      realpath: async (value) => value,
      environment: { UNRELATED_SECRET: 'inherited-for-discovery-only' },
    },
  );
  assert.equal(targets.length, 1);
  assert.equal(targets[0].epoch, 'one');
  assert.deepEqual(launcherEnvironment(selected, targets[0], false), {
    HUANDENG_ENTRY: entry,
    HUANDENG_RUNTIME_DIR: runtimeDir,
    HUANDENG_URL: 'http://127.0.0.1:1234',
  });
});

test('path aliases deduplicate, and empty discovery does not mount an ambiguous fallback', async () => {
  const selected = normalizeConfig({ entries: [entry, entry.toUpperCase()] });
  const targets = await projectTargets(selected, async () => [], {
    realpath: async (value) => value,
    platform: 'win32',
  });
  assert.equal(targets.length, 1);
  assert.deepEqual(await projectTargets(config(), async () => []), []);
  const single = await projectTargets(normalizeConfig({ bindAllOpen: false }), async () => {
    throw new Error('must not scan');
  });
  assert.equal(single[0].serverName, 'huandeng');
});

test('late opens, close grace, failed scans and writer epochs reconcile only affected routes', async () => {
  let targets = [];
  let failure = false;
  const events = [];
  const routes = new ProjectRoutes({
    targets: async () => {
      if (failure) throw new Error('offline scan');
      return targets;
    },
    mount: (target) => {
      events.push('add:' + target.key + ':' + (target.epoch ?? ''));
      return {
        ready: Promise.resolve(),
        dispose: async () => {
          events.push('remove:' + target.key);
        },
      };
    },
    missingPolls: 2,
    logger: noop,
  });
  await routes.start();
  targets = [{ key: 'one', url: 'http://127.0.0.1:1', epoch: 'a' }];
  await routes.refresh();
  failure = true;
  await routes.refresh();
  failure = false;
  assert.equal(routes.snapshot().length, 1);
  targets.push({ key: 'two', url: 'http://127.0.0.1:2', epoch: 'a' });
  await routes.refresh();
  targets[0] = { ...targets[0], epoch: 'b' };
  await routes.refresh();
  targets = targets.slice(1);
  await routes.refresh();
  assert.equal(routes.snapshot().length, 2);
  await routes.refresh();
  assert.equal(routes.snapshot().length, 1);
  await routes.dispose();
  assert.deepEqual(events, [
    'add:one:a',
    'add:two:a',
    'remove:one',
    'add:one:b',
    'remove:one',
    'remove:two',
  ]);
});

test('refresh coalesces and disposal interrupts child readiness without late route creation', async () => {
  let resolveTargets;
  let mounts = 0;
  const routes = new ProjectRoutes({
    targets: () =>
      new Promise((resolve) => {
        resolveTargets = resolve;
      }),
    mount: () => {
      mounts++;
      return { dispose: async () => {} };
    },
    logger: noop,
  });
  const first = routes.refresh();
  assert.equal(routes.refresh(), first);
  const closing = routes.dispose();
  resolveTargets([{ key: 'late' }]);
  await Promise.all([first, closing]);
  assert.equal(mounts, 0);
  let ready;
  const started = new ProjectRoutes({
    targets: async () => [{ key: 'opening' }],
    mount: () => ({
      ready: new Promise((resolve) => {
        ready = resolve;
      }),
      dispose: async () => ready(),
    }),
    logger: noop,
  });
  const loading = started.refresh();
  await Promise.resolve();
  await started.dispose();
  await loading;
  assert.deepEqual(started.snapshot(), []);
});

test('failed startup is cleaned up and can retry; strict scan failure does not claim success', async () => {
  let calls = 0;
  let disposed = 0;
  const routes = new ProjectRoutes({
    targets: async () => [{ key: 'a' }],
    mount: () => ({
      ready: ++calls === 1 ? Promise.reject(new Error('not ready')) : Promise.resolve(),
      dispose: async () => {
        disposed++;
      },
    }),
    logger: noop,
  });
  await routes.refresh();
  assert.equal(routes.snapshot().length, 0);
  await routes.refresh();
  assert.equal(calls, 2);
  await routes.dispose();
  assert.equal(disposed, 2);
  const strict = new ProjectRoutes({
    targets: async () => {
      throw new Error('scan failed');
    },
    mount() {},
    strict: true,
    logger: noop,
  });
  await assert.rejects(strict.start(), /scan failed/);
  await strict.dispose();
});

test('native package is complete, relocatable, hashed and refuses overwrite', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'huandeng-dsh-package-'));
  roots.push(root);
  const result = await buildDeepseekBundle(root);
  const bundle = result.directory;
  const manifest = JSON.parse(await fs.readFile(path.join(bundle, 'package.json'), 'utf8'));
  assert.equal(manifest.name, 'huandeng');
  assert.equal(manifest.version, result.version);
  assert.equal(manifest.dsh.bundle.patch, './cordis.patch.yml');
  const integrity = JSON.parse(
    await fs.readFile(path.join(bundle, 'content-manifest.json'), 'utf8'),
  );
  for (const [file, sha256] of Object.entries(integrity.files))
    assert.equal(
      createHash('sha256')
        .update(await fs.readFile(path.join(bundle, file)))
        .digest('hex'),
      sha256,
      file,
    );
  assert.ok(integrity.files['vendor/LICENSE']);
  assert.ok(integrity.files['vendor/content-manifest.json']);
  assert.ok(integrity.files['locale/zh.json']);
  assert.ok(integrity.files['assets/icon.png']);
  assert.ok(!Object.keys(integrity.files).some((file) => file.includes('.app.json')));
  assert.ok((await fs.stat(path.join(bundle, 'assets/icon.png'))).size <= 262144);
  await assert.rejects(buildDeepseekBundle(root), /EEXIST/);
});
