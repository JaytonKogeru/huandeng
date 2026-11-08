// biome-ignore-all lint/suspicious/noUndeclaredEnvVars: Acceptance selects an isolated candidate, profile and runtime.
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(root, 'packages/core/package.json'));
const { _electron: electron } = require('playwright');
const YAML = require('yaml');
const executablePath = process.env.HUANDENG_DESKTOP_EXE;
assert.ok(executablePath, 'Set HUANDENG_DESKTOP_EXE to the candidate executable.');
const sandbox = await fs.mkdtemp(path.join(os.tmpdir(), 'huandeng-editor-v09-'));
const project = path.join(sandbox, 'synthetic-project');
const entry = path.join(project, 'deck.pptd');
const evidence = path.join(root, '.verification/editor-v09', path.basename(sandbox));
await fs.mkdir(path.join(project, 'pages'), { recursive: true });
await fs.mkdir(evidence, { recursive: true });
await fs.mkdir(path.join(sandbox, 'profile'));
await fs.writeFile(
  path.join(sandbox, 'profile/preferences.json'),
  JSON.stringify({ uiLocale: 'zh-CN', recentProjects: [] }),
);
const content = '研究问题 · Keep original wording';
await fs.writeFile(
  entry,
  YAML.stringify({
    title: 'HUANDENG · Story workspace',
    size: [960, 540],
    pages: ['pages/question.page', 'pages/evidence.page'],
  }),
);
await fs.writeFile(
  path.join(project, 'pages/question.page'),
  YAML.stringify({
    elements: [
      {
        elementId: 'title',
        elementType: 'text',
        bounds: [64, 52, 830, 64],
        content: { text: content, fontSize: 30, color: '#233b3a' },
      },
      {
        elementId: 'figure',
        elementType: 'shape',
        name: 'Evidence',
        shapeName: 'rect',
        bounds: [64, 176, 350, 220],
        fill: { type: 'solid', color: '#537c70' },
      },
      {
        elementId: 'takeaway',
        elementType: 'text',
        bounds: [474, 180, 390, 180],
        content: {
          text: 'One source.\nTwo audiences.\nA clear sequence.',
          fontSize: 30,
          color: '#364a46',
        },
      },
    ],
    notes: 'Synthetic acceptance: reveal evidence, explain the result, then continue.',
    timeline: {
      schemaVersion: 2,
      effects: [
        {
          id: 'reveal',
          targetId: 'figure',
          kind: 'fade-in',
          trigger: 'click',
          durationMs: 120,
          delayMs: 0,
        },
      ],
    },
  }),
);
await fs.writeFile(
  path.join(project, 'pages/evidence.page'),
  YAML.stringify({ elements: [], notes: 'Second synthetic slide.' }),
);
const env = {
  ...process.env,
  HUANDENG_DESKTOP_DATA_DIR: path.join(sandbox, 'profile'),
  HUANDENG_RUNTIME_DIR: path.join(sandbox, 'runtime'),
};
delete env.ELECTRON_RUN_AS_NODE;
const checks = [],
  rendererErrors = [],
  exits = [],
  screenshots = [],
  layouts = [];
let app, page, serviceUrl, baseline, identity;
async function eventually(fn, timeout = 15000) {
  const deadline = Date.now() + timeout;
  let error;
  while (Date.now() < deadline) {
    try {
      const value = await fn();
      if (value) return value;
    } catch (failure) {
      error = failure;
    }
    await new Promise((resolve) => setTimeout(resolve, 75));
  }
  throw error ?? new Error('Timed out waiting for editor state.');
}
async function check(name, fn) {
  const start = Date.now();
  try {
    await fn();
    checks.push({ name, passed: true, milliseconds: Date.now() - start });
    process.stdout.write(`PASS ${name}\n`);
  } catch (error) {
    checks.push({ name, passed: false, error: String(error) });
    throw error;
  }
}
async function documentState() {
  const response = await fetch(`${serviceUrl}/__pptd/session`);
  assert.ok(response.ok);
  const current = await response.json();
  const files = await Promise.all(
    ['deck.pptd', 'pages/question.page', 'pages/evidence.page'].map(async (file) => [
      file,
      createHash('sha256')
        .update(await fs.readFile(path.join(project, file)))
        .digest('hex'),
    ]),
  );
  return {
    files,
    metadata: current.metadataRevision,
    manifest: current.manifestRevision,
    pages: current.pages.map((item) => [item.pageId, item.pageRevision]),
  };
}
async function locale(value) {
  await page.evaluate((next) => window.huandengDesktop.setLocale(next), value);
  await eventually(async () => (await page.locator('html').getAttribute('lang')) === value);
}
async function capture(name) {
  await app.evaluate(({ BrowserWindow }) => {
    const win = BrowserWindow.getAllWindows()[0];
    win.restore();
    win.show();
    win.focus();
  });
  await page.screenshot({
    path: path.join(evidence, name),
    animations: 'disabled',
    timeout: 15000,
  });
  screenshots.push(name);
}
async function launch() {
  app = await electron.launch({
    executablePath,
    args: [
      ...(process.env.HUANDENG_DESKTOP_APP ? [process.env.HUANDENG_DESKTOP_APP] : []),
      '--entry',
      entry,
    ],
    cwd: root,
    env,
    timeout: 120000,
  });
  app.process().stderr?.resume();
  page = await app.firstWindow();
  page.setDefaultTimeout(15000);
  page.on('pageerror', (error) => rendererErrors.push(error.message));
  await page.locator('[data-hd-editor-canvas]').waitFor({ timeout: 120000 });
  serviceUrl = (await page.evaluate(() => window.huandengDesktop.getContext())).serviceUrl;
  identity = await fs
    .readFile(path.join(path.dirname(executablePath), 'huandeng-build.json'), 'utf8')
    .then((value) => JSON.parse(value.replace(/^\uFEFF/, '')))
    .catch(() => null);
  await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()[0].setContentSize(1280, 800),
  );
}
async function closeNormally() {
  const closed = new Promise((resolve) =>
    app.process().once('exit', (code, signal) => resolve({ code, signal })),
  );
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].close());
  let timer;
  const result = await Promise.race([
    closed,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('Candidate did not close normally.')), 20000);
    }),
  ]);
  clearTimeout(timer);
  exits.push(result);
  assert.deepEqual(result, { code: 0, signal: null });
  app = undefined;
}
try {
  await launch();
  baseline = await documentState();
  await check('language switch keeps content and selection and updates native menus', async () => {
    await page.locator('[data-hd-editor-canvas] [data-hd-element-id="title"]').click();
    await page.getByRole('button', { name: '界面语言', exact: true }).click();
    await page.getByRole('menuitemradio', { name: 'English', exact: true }).click();
    await page.getByRole('menu').waitFor({ state: 'detached' });
    await eventually(async () => (await page.locator('html').getAttribute('lang')) === 'en');
    assert.equal(await page.locator('[data-hd-selection="title"]').count(), 1);
    assert.ok((await page.locator('[data-hd-editor-canvas]').innerText()).includes(content));
    const menus = await app.evaluate(({ Menu }) =>
      Menu.getApplicationMenu().items.map((item) => item.label),
    );
    assert.ok(menus.includes('File') && menus.includes('View'), JSON.stringify(menus));
    await locale('zh-CN');
    assert.equal(await page.locator('[data-hd-selection="title"]').count(), 1);
    await locale('en');
    assert.deepEqual(await documentState(), baseline);
  });
  await check(
    'dirty Story and active input survive language switching without writes',
    async () => {
      await page.locator('[data-hd-editor-canvas]').focus();
      await page.keyboard.press('Escape');
      const story = page.locator('[data-hd-story]');
      await story.getByRole('button', { name: 'Edit intent', exact: true }).click();
      const draft = '保留用户草稿 · keep evidence exactly';
      await story.locator('textarea').first().fill(draft);
      await locale('zh-CN');
      assert.equal(await story.locator('textarea').first().inputValue(), draft);
      assert.equal(
        await story
          .locator('textarea')
          .first()
          .evaluate((node) => node === document.activeElement),
        true,
      );
      await locale('en');
      assert.equal(
        await story.getByLabel('Slide authoring intent', { exact: true }).inputValue(),
        draft,
      );
      assert.deepEqual(await documentState(), baseline);
      await story.getByRole('button', { name: 'Cancel intent changes', exact: true }).click();
    },
  );
  await check('English panels and narrow workspace remain usable', async () => {
    await app.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows()[0].setContentSize(1040, 680),
    );
    await page.getByRole('button', { name: 'Project asset library', exact: true }).click();
    const assets = await page.locator('[data-hd-asset-library]').innerText();
    assert.ok(!/[\u3400-\u9fff]/u.test(assets), `Untranslated asset UI: ${assets}`);
    await page.getByRole('button', { name: 'Animation', exact: true }).click();
    await page.locator('[data-hd-builds]').waitFor();
    await page.getByRole('button', { name: 'Keyboard help', exact: true }).click();
    assert.ok(
      !/[\u3400-\u9fff]/u.test(await page.getByRole('dialog').innerText()),
      'Untranslated keyboard help.',
    );
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Export', exact: true }).click();
    const exporting = page.locator('[data-hd-export-dialog]');
    await exporting.getByLabel('Export format', { exact: true }).waitFor();
    assert.ok(!/[\u3400-\u9fff]/u.test(await exporting.innerText()), 'Untranslated export UI.');
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Slide thumbnails', exact: true }).click();
    const layout = await page.evaluate(() => {
      const r = document.querySelector('[data-hd-editor-canvas]').getBoundingClientRect();
      return {
        width: innerWidth,
        height: innerHeight,
        scrollWidth: document.documentElement.scrollWidth,
        canvas: { width: r.width, height: r.height },
      };
    });
    const navigation = await page.locator('.hd-navigation-tabs').evaluate((node) => {
      const frame = node.getBoundingClientRect();
      return [...node.querySelectorAll('button')].map((button) => {
        const bounds = button.getBoundingClientRect();
        return {
          label: button.textContent,
          fits: bounds.left >= frame.left && bounds.right <= frame.right,
        };
      });
    });
    assert.ok(
      navigation.every((item) => item.fits),
      JSON.stringify(navigation),
    );
    layouts.push({ ...layout, navigation });
    assert.ok(layout.scrollWidth <= layout.width + 1, JSON.stringify(layout));
    assert.ok(layout.canvas.width > 250 && layout.canvas.height > 160, JSON.stringify(layout));
    await capture('english-workspace.png');
    await locale('zh-CN');
    await capture('chinese-workspace.png');
    await locale('en');
    await page.getByRole('button', { name: 'Animation', exact: true }).click();
    assert.deepEqual(await documentState(), baseline);
  });
  await check('bundled Agent setup generates four current-project configurations', async () => {
    await page.getByRole('button', { name: 'Project and Story', exact: true }).click();
    await page.locator('[data-hd-agent-connect]').click();
    const dialog = page.locator('[data-hd-agent-connection]');
    for (const client of ['deepseek', 'codex', 'claude', 'chatgpt']) {
      await dialog.getByLabel('Agent client', { exact: true }).selectOption(client);
      const field = dialog.getByLabel('Connection configuration', { exact: true });
      const marker = {
        codex: '[mcp_servers.huandeng]',
        deepseek: '@deepseek-ai/dsh-mcp-client',
        claude: 'mcpServers',
        chatgpt: 'existing-authorized-workstation',
      }[client];
      await eventually(
        async () => (await field.count()) && (await field.inputValue()).includes(marker),
      );
      const configuration = await field.inputValue();
      const setup = await page.evaluate(
        (name) => window.huandengDesktop.getAgentConfiguration(name),
        client,
      );
      assert.equal(setup.entryPath, entry);
      assert.equal(setup.configuration, configuration);
      assert.ok(configuration.includes('ELECTRON_RUN_AS_NODE'));
      await fs.access(path.join(setup.pluginPath, 'skills/huandeng-story/SKILL.md'));
      if (client !== 'codex') JSON.parse(configuration);
      if (client === 'deepseek') {
        const { stdout } = await promisify(execFile)(
          executablePath,
          [path.join(setup.pluginPath, 'scripts/doctor.mjs'), '--entry', entry],
          { env: { ...env, ELECTRON_RUN_AS_NODE: '1' }, timeout: 30000, windowsHide: true },
        );
        const doctor = JSON.parse(stdout);
        assert.equal(doctor.protocolVerified, true);
        assert.equal(doctor.server.version, '0.9.0');
        assert.equal(doctor.toolCount, 18);
        assert.equal(doctor.guides.length, 2);
        assert.equal(doctor.deck.title, 'HUANDENG · Story workspace');
        assert.equal(doctor.deck.writable, true);
        assert.equal(doctor.modelTaskVerified, false);
        await fs.writeFile(
          path.join(evidence, 'packaged-doctor.json'),
          JSON.stringify(doctor, null, 2),
        );
      }
    }
    await dialog.getByLabel('Agent client', { exact: true }).selectOption('deepseek');
    await dialog.getByLabel('Connection configuration', { exact: true }).waitFor();
    const copy = await dialog.locator('[data-hd-copy-agent-config]').boundingBox();
    const frame = await dialog.boundingBox();
    assert.ok(
      copy && frame && copy.y + copy.height <= frame.y + frame.height,
      'The Copy action must be visible without scrolling the dialog.',
    );
    await capture('agent-connection.png');
    await page.keyboard.press('Escape');
    assert.deepEqual(await documentState(), baseline);
  });
  await check('click builds reveal and rewind in a live show', async () => {
    await page.locator('[data-hd-editor-canvas]').focus();
    await page.keyboard.press('F5');
    const presenter = page.locator('[data-hd-presenter]');
    await presenter.waitFor();
    const figure = presenter.locator('[data-hd-element-id="figure"]').first();
    await eventually(
      async () => (await figure.evaluate((node) => getComputedStyle(node).opacity)) === '0',
    );
    await page.keyboard.press('ArrowRight');
    await eventually(
      async () => (await figure.evaluate((node) => getComputedStyle(node).opacity)) === '1',
    );
    await page.keyboard.press('ArrowLeft');
    await eventually(
      async () => (await figure.evaluate((node) => getComputedStyle(node).opacity)) === '0',
    );
    await page.keyboard.press('Escape');
    await presenter.waitFor({ state: 'detached' });
    assert.deepEqual(await documentState(), baseline);
  });
  await check(
    'desktop preferences persist through normal reopen and the welcome screen',
    async () => {
      const toggle = page.locator('[data-hd-snapping-toggle]');
      if ((await toggle.getAttribute('aria-pressed')) === 'true') await toggle.click();
      await eventually(async () => (await toggle.getAttribute('aria-pressed')) === 'false');
      await closeNormally();
      await launch();
      assert.equal(await page.locator('html').getAttribute('lang'), 'en');
      await eventually(
        async () =>
          (await page.locator('[data-hd-snapping-toggle]').getAttribute('aria-pressed')) ===
          'false',
      );
      assert.deepEqual(await documentState(), baseline);
      await page.evaluate(() => {
        void window.huandengDesktop.showHome();
      });
      await page.locator('body[data-locale-ready="true"]').waitFor();
      assert.equal(await page.locator('#ui-locale').inputValue(), 'en');
      assert.ok((await page.locator('#open-project').innerText()).includes('Open project'));
      await closeNormally();
    },
  );
  assert.deepEqual(rendererErrors, []);
} catch (error) {
  process.stderr.write(`${error.stack ?? error}\n`);
  process.exitCode = 1;
} finally {
  if (app) {
    try {
      await closeNormally();
    } catch {
      await app.close().catch(() => {});
    }
  }
  const report = {
    passed: !process.exitCode,
    checks,
    rendererErrors,
    exits,
    screenshots,
    layouts,
    identity,
    synthetic: true,
    sandbox,
  };
  await fs.writeFile(
    path.join(evidence, 'acceptance.json'),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  process.stdout.write(
    `${JSON.stringify({ passed: report.passed, checks: checks.length, report: path.join(evidence, 'acceptance.json') })}\n`,
  );
}
