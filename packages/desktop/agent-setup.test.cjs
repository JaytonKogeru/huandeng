const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { afterEach, test } = require('node:test');
const { agentConfiguration } = require('./agent-setup.cjs');

const roots = [];
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })));
});

async function fixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'huandeng-agent-setup-'));
  roots.push(root);
  const applicationDirectory = path.join(root, 'Editor app');
  const pluginPath = path.join(applicationDirectory, 'plugins', 'huandeng');
  const scripts = path.join(pluginPath, 'scripts');
  const cli = path.join(applicationDirectory, 'node_modules', '@open-slide', 'core', 'huandeng.js');
  const entryPath = path.join(root, 'Project 研究', 'deck.pptd');
  await fs.mkdir(scripts, { recursive: true });
  await fs.mkdir(path.dirname(cli), { recursive: true });
  await fs.mkdir(path.dirname(entryPath), { recursive: true });
  for (const name of ['configure.mjs', 'runtime.mjs', 'discovery.mjs']) {
    await fs.copyFile(
      path.resolve(__dirname, '../../plugins/huandeng/scripts', name),
      path.join(scripts, name),
    );
  }
  await fs.writeFile(
    cli,
    'throw new Error("Configuration must not launch the writer or a model");\n',
  );
  await fs.writeFile(entryPath, 'title: Connection fixture\npages: []\n');
  return { applicationDirectory, pluginPath, cli, entryPath, executable: process.execPath };
}

test('desktop native DeepSeek setup generates only the existing plugin configuration', async () => {
  const f = await fixture();
  const original = await fs.readFile(f.entryPath, 'utf8');
  const previousUrl = process.env.HUANDENG_URL;
  process.env.HUANDENG_URL = 'http://127.0.0.1:1';
  try {
    const result = await agentConfiguration({ ...f, client: 'deepseek-native' });
    const value = JSON.parse(result.configuration);
    assert.equal(result.client, 'deepseek-native');
    assert.equal(result.entryPath, f.entryPath);
    assert.equal(result.pluginPath, f.pluginPath);
    assert.equal(value.length, 1);
    assert.equal(value[0].id, 'huandeng');
    assert.deepEqual(value[0].config.entries, [await fs.realpath(f.entryPath)]);
    assert.equal(value[0].config.cli, await fs.realpath(f.cli));
    assert.equal(value[0].config.url, undefined);
    assert.equal(value[0].insert, undefined);
    assert.ok(!result.configuration.includes('skill-filesystem'));
    assert.equal(await fs.readFile(f.entryPath, 'utf8'), original);
  } finally {
    if (previousUrl === undefined) delete process.env.HUANDENG_URL;
    else process.env.HUANDENG_URL = previousUrl;
  }
});

test('desktop retains the separate legacy DeepSeek patch route', async () => {
  const f = await fixture();
  const result = await agentConfiguration({ ...f, client: 'deepseek' });
  const value = JSON.parse(result.configuration);
  assert.equal(result.client, 'deepseek');
  assert.equal(value[0].insert[0].name, '@deepseek-ai/dsh-mcp-client');
  assert.equal(value[1].insert[0].name, '@deepseek-ai/dsh-skill-filesystem');
  assert.ok(value.every((row) => row.id === undefined));
});

test('desktop rejects unknown clients before attempting any configuration execution', async () => {
  await assert.rejects(agentConfiguration({ client: 'unknown' }), /Unsupported Agent client/);
  await assert.rejects(agentConfiguration({ client: 'deepseek-native' }), /Open a PPTD project/);
});
