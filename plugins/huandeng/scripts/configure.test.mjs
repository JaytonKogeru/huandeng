import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, test } from 'node:test';
import { configuration } from './configure.mjs';
import { resolveRuntime } from './runtime.mjs';

const roots = [];
afterEach(async () =>
  Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true }))),
);

async function fixture(layout = 'repository') {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'huandeng-plugin-'));
  roots.push(root);
  const plugin = path.join(root, 'plugins', 'huandeng');
  const cli = path.join(
    root,
    layout === 'repository'
      ? 'packages/core/huandeng.js'
      : 'node_modules/@open-slide/core/huandeng.js',
  );
  const entry = path.join(root, 'A project 欢登.pptd');
  await fs.mkdir(path.dirname(cli), { recursive: true });
  await fs.writeFile(cli, '// synthetic runtime');
  await fs.writeFile(entry, 'pages: []');
  return { root, plugin, cli, entry };
}

test('finds the adjacent repository and installed runtimes without source-checkout assumptions', async () => {
  for (const layout of ['repository', 'installed']) {
    const fixtureValue = await fixture(layout);
    const runtime = await resolveRuntime({ entry: fixtureValue.entry }, fixtureValue.plugin, {});
    assert.equal(runtime.cli, await fs.realpath(fixtureValue.cli));
    assert.equal(runtime.entry, await fs.realpath(fixtureValue.entry));
  }
});

test('prints client-native fragments with Unicode/space paths and only intended environment values', async () => {
  const f = await fixture('installed');
  const runtime = await resolveRuntime({ entry: f.entry }, f.plugin, {
    ELECTRON_RUN_AS_NODE: '1',
    UNRELATED_SECRET: 'must not appear',
  });
  const native = JSON.parse(configuration('claude', runtime));
  assert.equal(native.mcpServers.huandeng.env.ELECTRON_RUN_AS_NODE, '1');
  assert.equal(native.mcpServers.huandeng.env.HUANDENG_ENTRY, runtime.entry);
  const patch = JSON.parse(configuration('deepseek', runtime));
  assert.equal(patch[0].insert[0].name, '@deepseek-ai/dsh-mcp-client');
  assert.equal(patch[0].insert[0].config.transport, 'stdio');
  assert.deepEqual(patch[1].config.customSkillDirs, [path.join(f.plugin, 'skills')]);
  for (const client of ['codex', 'claude', 'deepseek', 'chatgpt', 'mcp']) {
    const output = configuration(client, runtime);
    assert.ok(!output.includes('must not appear'));
    assert.ok(!output.includes('UNRELATED_SECRET'));
    assert.ok(output.includes('ELECTRON_RUN_AS_NODE'));
  }
  const chatgpt = JSON.parse(configuration('chatgpt', runtime));
  assert.deepEqual(chatgpt.arguments.context, [runtime.cli, '--entry', runtime.entry, 'inspect']);
});

test('does not silently redirect missing runtimes or accept nonlocal credential-bearing origins', async () => {
  const f = await fixture();
  await assert.rejects(
    resolveRuntime({ entry: f.entry, cli: path.join(f.root, 'missing.js') }, f.plugin, {}),
  );
  await assert.rejects(
    resolveRuntime({ entry: f.entry, url: 'https://public.invalid' }, f.plugin, {}),
    /loopback/,
  );
  await assert.rejects(
    resolveRuntime({ entry: f.entry, url: 'http://user:password@127.0.0.1:4850' }, f.plugin, {}),
    /loopback/,
  );
  const runtime = await resolveRuntime(
    { entry: f.entry, url: 'http://127.0.0.1:4850', 'runtime-dir': f.root },
    f.plugin,
    {},
  );
  assert.equal(runtime.env.HUANDENG_URL, 'http://127.0.0.1:4850');
  assert.equal(runtime.env.HUANDENG_RUNTIME_DIR, f.root);
});
