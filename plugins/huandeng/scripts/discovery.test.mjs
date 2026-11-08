import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, test } from 'node:test';
import { discoverInstallation, discoverSessions, installationAt } from './discovery.mjs';
import { resolveRuntime } from './runtime.mjs';

const roots = [];
afterEach(async () =>
  Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true }))),
);
async function fixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'huandeng-discovery-'));
  roots.push(root);
  const app = path.join(root, 'Editor with spaces', 'resources', 'app');
  const cli = path.join(app, 'node_modules', '@open-slide', 'core', 'huandeng.js');
  await fs.mkdir(path.join(path.dirname(cli), 'dist', 'huandeng'), { recursive: true });
  await fs.writeFile(cli, '// fixture');
  await fs.writeFile(path.join(path.dirname(cli), 'dist', 'huandeng', 'bin.js'), '// fixture');
  await fs.writeFile(path.join(app, 'release.json'), '{"version":"0.12.0"}');
  const entry = path.join(root, 'Private science.pptd');
  await fs.writeFile(entry, 'pages: []');
  const state = path.join(root, 'state');
  await fs.mkdir(path.join(state, 'sessions'), { recursive: true });
  return { root, app, cli, entry, state, environment: { HUANDENG_RUNTIME_DIR: state } };
}
async function session(f, name, entry = f.entry, url = 'http://127.0.0.1:12345') {
  await fs.writeFile(
    path.join(f.state, 'sessions', `${name}.json`),
    JSON.stringify({ entry, url, epoch: 'test' }),
  );
}
function fetchFor(entry, extras = {}) {
  return async (url, options) => {
    assert.match(url, /^http:\/\/127\.0\.0\.1:/);
    assert.equal(options.redirect, 'error');
    return {
      ok: true,
      json: async () => ({
        entry,
        title: 'Synthetic',
        writable: true,
        desktopProtocol: 1,
        epoch: 'test',
        sessionToken: 'must-never-escape',
        ...extras,
      }),
    };
  };
}

test('copied plugins discover this installation and explicit bad paths never fall back', async () => {
  const f = await fixture();
  const settings = { running: [path.dirname(path.dirname(f.app))], locations: [] };
  const runtime = await resolveRuntime(
    { entry: f.entry },
    path.join(f.root, 'client-cache'),
    f.environment,
    settings,
  );
  assert.equal(runtime.cli, await fs.realpath(f.cli));
  assert.equal(runtime.discoveredBy, 'running-editor');
  await assert.rejects(
    resolveRuntime(
      { entry: f.entry, 'install-dir': path.join(f.root, 'absent') },
      path.join(f.root, 'cache'),
      f.environment,
      settings,
    ),
  );
  await assert.rejects(
    resolveRuntime(
      { entry: f.entry, cli: path.join(f.root, 'absent.js') },
      path.join(f.root, 'cache'),
      f.environment,
      settings,
    ),
  );
});

test('registered nonstandard installations remain machine-local and ambiguous running installs reject', async () => {
  const a = await fixture();
  const b = await fixture();
  await fs.writeFile(
    path.join(a.state, 'agent-runtime.json'),
    JSON.stringify({ schemaVersion: 1, application: a.app }),
  );
  const installed = await discoverInstallation(a.environment, { running: [], locations: [] });
  assert.equal(installed.cli, a.cli);
  assert.equal(installed.discoveredBy, 'registered-editor');
  await assert.rejects(
    discoverInstallation(a.environment, { running: [a.app, b.app], locations: [] }),
    /Several/,
  );
  await fs.rm(path.join(path.dirname(a.cli), 'dist', 'huandeng', 'bin.js'));
  await assert.rejects(installationAt(a.app), /complete/);
});

test('session discovery rejects remote, stale, mismatched and old-protocol records and redacts credentials', async () => {
  const f = await fixture();
  await session(f, 'a');
  await session(f, 'remote', f.entry, 'https://external.invalid');
  let calls = 0;
  const found = await discoverSessions(f.environment, {
    fetch: async (...args) => {
      calls++;
      return fetchFor(f.entry)(...args);
    },
  });
  assert.equal(calls, 1);
  assert.deepEqual(found, [
    { entry: f.entry, url: 'http://127.0.0.1:12345', title: 'Synthetic', writable: true },
  ]);
  assert.ok(!JSON.stringify(found).includes('must-never-escape'));
  assert.deepEqual(
    await discoverSessions(f.environment, { fetch: fetchFor(f.entry, { epoch: 'stale' }) }),
    [],
  );
  assert.deepEqual(
    await discoverSessions(f.environment, { fetch: fetchFor(f.entry, { desktopProtocol: 0 }) }),
    [],
  );
  const other = path.join(f.root, 'different.pptd');
  await fs.writeFile(other, 'pages: []');
  assert.deepEqual(await discoverSessions(f.environment, { fetch: fetchFor(other) }), []);
});

test('unique current Project pins once and multiple Projects require explicit selection', async () => {
  const f = await fixture();
  await session(f, 'a');
  const settings = { running: [f.app], locations: [], fetch: fetchFor(f.entry) };
  const runtime = await resolveRuntime({}, path.join(f.root, 'cache'), f.environment, settings);
  assert.equal(runtime.entry, f.entry);
  assert.equal(runtime.env.HUANDENG_ENTRY, f.entry);
  assert.equal(runtime.projectSource, 'unique-active-project');
  const other = path.join(f.root, 'second.pptd');
  await fs.writeFile(other, 'pages: []');
  await session(f, 'b', other, 'http://127.0.0.1:12346');
  settings.fetch = async (url, options) =>
    fetchFor(url.includes('12346') ? other : f.entry)(url, options);
  await assert.rejects(
    resolveRuntime({}, path.join(f.root, 'cache'), f.environment, settings),
    /Several HUANDENG Projects/,
  );
  const explicit = await resolveRuntime(
    { entry: f.entry },
    path.join(f.root, 'cache'),
    f.environment,
    settings,
  );
  assert.equal(explicit.entry, f.entry);
});
