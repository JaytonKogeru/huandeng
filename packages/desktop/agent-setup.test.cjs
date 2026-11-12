const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { afterEach, test } = require('node:test');
const { agentConfiguration, deepSeekRoute } = require('./agent-setup.cjs');

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
  const dshHome = path.join(root, 'dsh home');
  await fs.mkdir(scripts, { recursive: true });
  await fs.mkdir(path.dirname(cli), { recursive: true });
  await fs.mkdir(path.dirname(entryPath), { recursive: true });
  await fs.mkdir(dshHome, { recursive: true });
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
  return {
    applicationDirectory,
    pluginPath,
    cli,
    entryPath,
    executable: process.execPath,
    dshHome,
  };
}

async function installingProfile(dshHome, name, manifest, { files = true } = {}) {
  const directory = path.join(dshHome, 'profiles', name);
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(
    path.join(directory, 'package.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  if (files && manifest.dependencies?.huandeng) {
    const bundle = path.join(directory, 'node_modules', 'huandeng');
    await fs.mkdir(path.join(bundle, 'lib'), { recursive: true });
    await fs.mkdir(path.join(bundle, 'vendor', 'skills', 'huandeng-story'), { recursive: true });
    await fs.writeFile(path.join(bundle, 'package.json'), '{"name":"huandeng"}\n');
    await fs.writeFile(path.join(bundle, 'lib', 'index.mjs'), 'export const name = "huandeng";\n');
    await fs.writeFile(
      path.join(bundle, 'vendor', 'skills', 'huandeng-story', 'SKILL.md'),
      '# HUANDENG\n',
    );
  }
  return directory;
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
    assert.equal(result.route, null);
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

test('one DeepSeek request falls back to the connection file when no profile installed the bundle', async () => {
  const f = await fixture();
  const result = await agentConfiguration({ ...f, client: 'deepseek' });
  const value = JSON.parse(result.configuration);
  assert.equal(result.requestedClient, 'deepseek');
  assert.equal(result.client, 'deepseek');
  assert.equal(result.route, 'direct');
  assert.equal(value[0].insert[0].name, '@deepseek-ai/dsh-mcp-client');
  assert.equal(value[1].insert[0].name, '@deepseek-ai/dsh-skill-filesystem');
  assert.ok(value.every((row) => row.id === undefined));
});

test('one DeepSeek request reuses an installed bundle instead of adding a second route', async () => {
  const f = await fixture();
  await installingProfile(f.dshHome, 'desktop', {
    dependencies: {
      huandeng: 'link:D:/_Proj/Huandeng/dist/HUANDENG-Plugin-0.23.1-DeepSeek/huandeng',
    },
  });
  const result = await agentConfiguration({ ...f, client: 'deepseek' });
  const value = JSON.parse(result.configuration);
  assert.equal(result.client, 'deepseek-native');
  assert.equal(result.route, 'plugin');
  assert.equal(result.profile, 'desktop');
  assert.equal(value.length, 1);
  assert.equal(value[0].id, 'huandeng');
  assert.ok(!result.configuration.includes('dsh-mcp-client'));
});

test('the route ignores profiles that do not declare HUANDENG and unreadable manifests', async () => {
  const f = await fixture();
  await installingProfile(f.dshHome, 'web', { dependencies: { '@deepseek-ai/dsh': '0.2.2-rc.1' } });
  const broken = path.join(f.dshHome, 'profiles', 'broken');
  await fs.mkdir(broken, { recursive: true });
  await fs.writeFile(path.join(broken, 'package.json'), '{ not json');
  assert.deepEqual(await deepSeekRoute({ dshHome: f.dshHome }), {
    client: 'deepseek',
    route: 'direct',
    profile: null,
  });
});

test('a bundle in another DSH profile never activates the Desktop native route', async () => {
  const f = await fixture();
  await installingProfile(f.dshHome, 'archive', {
    dependencies: { huandeng: 'link:D:/old-plugin' },
  });
  await installingProfile(f.dshHome, 'desktop', {
    dependencies: { '@deepseek-ai/dsh': '0.2.2-rc.1' },
  });
  assert.deepEqual(await deepSeekRoute({ dshHome: f.dshHome }), {
    client: 'deepseek',
    route: 'direct',
    profile: null,
  });
});

test('a declared-but-uninstalled native bundle is not treated as installed', async () => {
  const f = await fixture();
  await installingProfile(
    f.dshHome,
    'desktop',
    {
      dependencies: { huandeng: 'link:D:/nonexistent' },
    },
    { files: false },
  );
  assert.equal((await deepSeekRoute({ dshHome: f.dshHome })).route, 'direct');
});

test('an incomplete native bundle is not treated as installed', async () => {
  const f = await fixture();
  const profile = await installingProfile(f.dshHome, 'desktop', {
    dependencies: { huandeng: '0.23.2' },
  });
  await fs.rm(path.join(profile, 'node_modules', 'huandeng', 'lib', 'index.mjs'));
  assert.equal((await deepSeekRoute({ dshHome: f.dshHome })).route, 'direct');
});

test('an explicitly selected headless profile never borrows the Desktop plugin', async () => {
  const f = await fixture();
  await installingProfile(f.dshHome, 'desktop', {
    dependencies: { huandeng: '0.23.2' },
  });
  assert.equal((await deepSeekRoute({ dshHome: f.dshHome, profile: 'headless' })).route, 'direct');
  await installingProfile(f.dshHome, 'headless', {
    dependencies: { huandeng: '0.23.2' },
  });
  assert.deepEqual(await deepSeekRoute({ dshHome: f.dshHome, profile: 'headless' }), {
    client: 'deepseek-native',
    route: 'plugin',
    profile: 'headless',
  });
});

test('desktop rejects unknown clients before attempting any configuration execution', async () => {
  await assert.rejects(agentConfiguration({ client: 'unknown' }), /Unsupported Agent client/);
  await assert.rejects(agentConfiguration({ client: 'deepseek-native' }), /Open a PPTD project/);
});
