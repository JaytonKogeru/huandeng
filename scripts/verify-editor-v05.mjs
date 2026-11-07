// biome-ignore-all lint/suspicious/noUndeclaredEnvVars: This real Electron acceptance script runs outside the Turbo task cache.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// HUANDENG_DESKTOP_EXE selects either the packaged app or Electron itself.
// With Electron, also set HUANDENG_DESKTOP_APP to packages/desktop.
// Every project, profile, preference and runtime write stays in this temporary sandbox.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(root, 'packages/core/package.json'));
const { _electron: electron } = require('playwright');
const YAML = require('yaml');
const executablePath = process.env.HUANDENG_DESKTOP_EXE;
if (!executablePath) throw new Error('Set HUANDENG_DESKTOP_EXE to the desktop executable.');
const sandbox = await fs.mkdtemp(path.join(os.tmpdir(), 'huandeng-editor-v05-'));
const deck = path.join(sandbox, 'synthetic-project');
const entry = path.join(deck, 'deck.pptd');
const evidence = path.join(root, '.verification');
const reportPath = path.join(evidence, 'editor-v05.json');
const pageSize = [960, 540];
const pageIds = [randomUUID(), randomUUID(), randomUUID()];
const shortCodes = ['K7M2', 'Q9R4', 'B6XA'];
const legacyLabels = ['S17', 'S3', 'S29'];
const pagePaths = ['pages/canvas.page', 'pages/identity.page', 'pages/notes.page'];
const titles = ['用内容组织一页。', '页面身份与页序分开。', '每一次编辑都能继续。'];
await fs.mkdir(path.join(deck, 'pages'), { recursive: true });
await fs.mkdir(path.join(deck, '.huandeng'), { recursive: true });
await fs.mkdir(evidence, { recursive: true });
await fs.writeFile(
  entry,
  YAML.stringify({
    title: '幻灯 · 编辑器验收',
    size: pageSize,
    pages: pagePaths,
    theme: { fontFamily: 'Arial' },
  }),
);
for (let index = 0; index < pagePaths.length; index++) {
  await fs.writeFile(
    path.join(deck, pagePaths[index]),
    YAML.stringify({
      elements: [
        {
          elementId: 'title',
          elementType: 'text',
          bounds: [52, 38, 850, 62],
          content: { text: titles[index], fontSize: 38, color: '#18372d', bold: true },
        },
        {
          elementId: 'subtitle',
          elementType: 'text',
          bounds: [55, 112, 820, 38],
          content: {
            text: 'HUANDENG  /  合成验收样例 · 不含研究数据',
            fontSize: 16,
            color: '#647064',
          },
        },
      ],
      notes: '仅供独立桌面验收；不读取或修改真实用户项目。',
      syntheticVerification: 'editor-v05',
    }),
  );
}
await fs.writeFile(
  path.join(deck, '.huandeng/project.json'),
  `${JSON.stringify(
    {
      schemaVersion: 1,
      deckId: randomUUID(),
      entry: 'deck.pptd',
      slides: Object.fromEntries(
        pageIds.map((id, index) => [
          id,
          {
            shortCode: shortCodes[index],
            label: legacyLabels[index],
            path: pagePaths[index],
            state: 'active',
          },
        ]),
      ),
    },
    null,
    2,
  )}\n`,
);
const launchEnv = {
  ...process.env,
  HUANDENG_DESKTOP_DATA_DIR: path.join(sandbox, 'profile'),
  HUANDENG_RUNTIME_DIR: path.join(sandbox, 'runtime'),
};
delete launchEnv.ELECTRON_RUN_AS_NODE;
const checks = [];
const screenshots = [];
const timings = [];
const rendererErrors = [];
const mutations = [];
const processLog = [];
const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const pathKey = (value) =>
  process.platform === 'win32' ? path.resolve(value).toLowerCase() : path.resolve(value);
let application;
let page;
let url;
let target;
let textId;
let startupMilliseconds;

async function eventually(fn, timeout = 30000) {
  const deadline = Date.now() + timeout;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const result = await fn();
      if (result) return result;
    } catch (error) {
      lastError = error;
    }
    await wait(100);
  }
  throw lastError ?? new Error('Timed out waiting for editor state.');
}

async function check(name, fn) {
  const start = Date.now();
  try {
    await fn();
    checks.push({ name, passed: true, milliseconds: Date.now() - start });
    process.stdout.write(`PASS ${name}\n`);
  } catch (error) {
    checks.push({ name, passed: false, milliseconds: Date.now() - start, error: String(error) });
    throw error;
  }
}

async function api(endpoint) {
  const response = await fetch(`${url}/__pptd${endpoint}`);
  const result = await response.json();
  assert.ok(response.ok && result.ok !== false, JSON.stringify(result));
  return result;
}

const canvas = () => page.locator('[data-hd-editor-canvas]');
const thumbnail = (id) => page.locator(`[data-hd-thumbnail=${JSON.stringify(id)}]`);
const elementNode = (id) => canvas().locator(`[data-hd-element-id=${JSON.stringify(id)}]`);
const sourcePage = async () => YAML.parse(await fs.readFile(path.join(deck, target.path), 'utf8'));

async function saved() {
  await eventually(async () =>
    (await page.locator('[data-hd-save-status]').innerText()).includes('已保存'),
  );
}

async function unchanged(before) {
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
  assert.deepEqual((await api(`/pages/${target.pageId}`)).data, before);
  assert.deepEqual(await sourcePage(), before);
}

async function chooseEllipse() {
  await page.getByRole('button', { name: '选择形状', exact: true }).click();
  await page.getByRole('menuitem', { name: '椭圆', exact: true }).click();
  await page.locator('[data-hd-insertion-layer="shape"]').waitFor();
}

async function coordinates(start, end) {
  const box = await page.locator('[data-hd-insertion-layer]').boundingBox();
  assert.ok(box && box.width > 0 && box.height > 0, 'The placement surface must be visible.');
  const point = ([x, y]) => ({
    x: box.x + (x / pageSize[0]) * box.width,
    y: box.y + (y / pageSize[1]) * box.height,
  });
  return { start: point(start), end: point(end) };
}

async function dragPlace(name, start, end, constrain = false) {
  const before = await sourcePage();
  const known = before.elements.map((element) => element.elementId);
  const points = await coordinates(start, end);
  if (constrain) await page.keyboard.down('Shift');
  let released;
  try {
    await page.mouse.move(points.start.x, points.start.y);
    await page.mouse.down();
    await page.mouse.move(points.end.x, points.end.y, { steps: 8 });
    await page.locator('[data-hd-insertion-preview]').waitFor();
    released = Date.now();
    await page.mouse.up();
  } finally {
    if (constrain) await page.keyboard.up('Shift');
  }
  await page.waitForFunction(
    (ids) =>
      Array.from(document.querySelectorAll('[data-hd-editor-canvas] [data-hd-element-id]')).some(
        (element) => !ids.includes(element.getAttribute('data-hd-element-id')),
      ),
    known,
  );
  const visualMilliseconds = Date.now() - released;
  const added = await eventually(async () => {
    const disk = await sourcePage();
    const current = await api(`/pages/${target.pageId}`);
    const newElements = disk.elements.filter((element) => !known.includes(element.elementId));
    if (!newElements.length) return false;
    assert.equal(newElements.length, 1, 'One gesture must create exactly one object.');
    assert.deepEqual(current.data, disk, 'The service and on-disk page must agree.');
    return newElements[0];
  });
  timings.push({ name, visualMilliseconds, persistedMilliseconds: Date.now() - released });
  await page.locator('[data-hd-insertion-layer]').waitFor({ state: 'detached' });
  return added;
}

function near(actual, expected, tolerance = 2) {
  assert.equal(actual.length, expected.length);
  for (let index = 0; index < expected.length; index++) {
    assert.ok(
      Math.abs(actual[index] - expected[index]) <= tolerance,
      `Coordinate ${index}: expected ${expected[index]} ± ${tolerance}, got ${actual[index]}.`,
    );
  }
}

async function waitForElementPresence(id, present) {
  await eventually(async () => {
    const disk = await sourcePage();
    const remote = await api(`/pages/${target.pageId}`);
    assert.deepEqual(remote.data, disk);
    return disk.elements.some((element) => element.elementId === id) === present;
  });
  await elementNode(id).waitFor({ state: present ? 'visible' : 'detached' });
  await saved();
}

async function setTheme(dark) {
  await page.getByRole('button', { name: /^(切换主题|Toggle theme)$/ }).click();
  await page.getByRole('menuitem', { name: dark ? /^(深色|Dark)$/ : /^(浅色|Light)$/ }).click();
  await page.waitForFunction(
    (expected) => document.documentElement.classList.contains('dark') === expected,
    dark,
  );
}

async function resize(width, height) {
  await application.evaluate(
    ({ BrowserWindow }, size) => {
      const window = BrowserWindow.getAllWindows()[0];
      window.unmaximize();
      // The product minimum is 1040 px. Lower it only for this isolated responsive audit.
      window.setMinimumSize(800, 600);
      window.setContentSize(size.width, size.height);
    },
    { width, height },
  );
  await page.waitForFunction(
    (size) => window.innerWidth === size.width && window.innerHeight === size.height,
    { width, height },
  );
  await page.getByRole('button', { name: '适合窗口', exact: true }).click();
}

async function capture(name, width, height, dark) {
  await resize(width, height);
  await setTheme(dark);
  await page.keyboard.press('Escape');
  const layout = await page.evaluate(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
    scrollWidth: document.documentElement.scrollWidth,
    dark: document.documentElement.classList.contains('dark'),
    canvas: (() => {
      const rect = document
        .querySelector('[data-hd-editor-canvas] [data-pptd-page]')
        ?.getBoundingClientRect();
      return rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height } : null;
    })(),
  }));
  assert.ok(layout.scrollWidth <= width + 1, `Horizontal document overflow at ${width} px.`);
  assert.ok(layout.canvas?.width > 0, 'The canvas must remain visible.');
  for (const label of ['选择工具', '添加文本', '选择形状', '添加线条', '适合窗口']) {
    const box = await page.getByRole('button', { name: label, exact: true }).boundingBox();
    assert.ok(
      box && box.x >= 0 && box.x + box.width <= width + 1,
      `${label} is outside the viewport.`,
    );
  }
  await page.mouse.move(width / 2, height / 2);
  await page.getByRole('tooltip').waitFor({ state: 'hidden' });
  await page.screenshot({
    path: path.join(evidence, name),
    animations: 'disabled',
    timeout: 20000,
  });
  screenshots.push({
    file: name,
    ...layout,
    nativeContentSize: true,
    isolatedMinimumSizeOverride: true,
  });
}

try {
  const started = Date.now();
  application = await electron.launch({
    executablePath,
    args: [
      ...(process.env.HUANDENG_DESKTOP_APP ? [process.env.HUANDENG_DESKTOP_APP] : []),
      '--entry',
      entry,
    ],
    cwd: root,
    env: launchEnv,
    timeout: 120000,
  });
  application.process().stderr?.on('data', (bytes) => processLog.push(String(bytes)));
  page = await application.firstWindow();
  page.setDefaultTimeout(15000);
  page.on('pageerror', (error) => rendererErrors.push(error.message));
  page.on('request', (request) => {
    if (request.method() === 'POST' && /\/__pptd\/(transactions|undo|redo)$/.test(request.url()))
      mutations.push({ url: new URL(request.url()).pathname, timestamp: Date.now() });
  });
  await canvas().waitFor({ timeout: 120000 });
  startupMilliseconds = Date.now() - started;
  const context = await page.evaluate(() => window.huandengDesktop.getContext());
  assert.equal(pathKey(context.entryPath), pathKey(entry));
  url = context.serviceUrl;
  const initial = await api('/session');
  assert.equal(pathKey(initial.entry), pathKey(entry));
  assert.equal(initial.pages.length, 3);
  target = initial.pages.find((item) => item.pageId === pageIds[0]);
  assert.ok(target, 'The isolated synthetic fixture must be the opened project.');
  await resize(1600, 1000);
  await setTheme(false);
  await page.getByRole('button', { name: '页面缩略图', exact: true }).click();
  await thumbnail(target.pageId).click();

  await check(
    'choosing text or a shape does not create an object; Escape also cancels an active drag',
    async () => {
      const before = await sourcePage();
      const beforeMutations = mutations.length;
      await page.getByRole('button', { name: '添加文本', exact: true }).click();
      await page.locator('[data-hd-insertion-layer="text"]').waitFor();
      await unchanged(before);
      await page.keyboard.press('Escape');
      await page.locator('[data-hd-insertion-layer]').waitFor({ state: 'detached' });
      await chooseEllipse();
      await unchanged(before);
      const points = await coordinates([100, 190], [330, 330]);
      await page.mouse.move(points.start.x, points.start.y);
      await page.mouse.down();
      await page.mouse.move(points.end.x, points.end.y, { steps: 6 });
      await page.locator('[data-hd-insertion-preview]').waitFor();
      await page.keyboard.press('Escape');
      await page.mouse.up();
      await page.locator('[data-hd-insertion-layer]').waitFor({ state: 'detached' });
      await unchanged(before);
      assert.equal(
        mutations.length,
        beforeMutations,
        'Tool choice and cancellation must not send a transaction.',
      );
    },
  );

  await check(
    'ellipse placement uses drag coordinates and persists the selected shape',
    async () => {
      await chooseEllipse();
      const element = await dragPlace('ellipse', [100, 190], [330, 330]);
      assert.equal(element.elementType, 'shape');
      assert.equal(element.shapeName, 'ellipse');
      near(element.bounds, [100, 190, 230, 140]);
      await saved();
    },
  );

  await check('reverse dragging normalizes the rectangle and Shift creates a circle', async () => {
    await chooseEllipse();
    const reverse = await dragPlace('reverse ellipse', [590, 330], [410, 210]);
    near(reverse.bounds, [410, 210, 180, 120]);
    await saved();
    await chooseEllipse();
    const circle = await dragPlace('reverse Shift circle', [830, 340], [730, 280], true);
    near(circle.bounds, [730, 240, 100, 100]);
    assert.ok(Math.abs(circle.bounds[2] - circle.bounds[3]) < 0.01);
    await saved();
  });

  await check('lines preserve reverse direction and Shift constrains the angle', async () => {
    await page.getByRole('button', { name: '添加线条', exact: true }).click();
    const reverse = await dragPlace('reverse line', [840, 400], [120, 400]);
    assert.equal(reverse.elementType, 'line');
    near(reverse.bounds, [120, 400, 720, 1]);
    const reversePoints = reverse.points
      .trim()
      .split(/[\s,]+/)
      .map(Number);
    near(reversePoints, [reverse.bounds[2], 0.5, 0, 0.5], 0.01);
    await saved();
    await page.getByRole('button', { name: '添加线条', exact: true }).click();
    const horizontal = await dragPlace('Shift line', [100, 440], [320, 480], true);
    assert.equal(horizontal.bounds[3], 1);
    const points = horizontal.points
      .trim()
      .split(/[\s,]+/)
      .map(Number);
    assert.ok(Math.abs(points[1] - points[3]) < 0.01, 'Shift should produce a horizontal line.');
    await saved();
  });

  await check(
    'text placement enters editing automatically and Backspace removes a character',
    async () => {
      await page.getByRole('button', { name: '添加文本', exact: true }).click();
      const element = await dragPlace('text', [405, 420], [850, 478]);
      textId = element.elementId;
      near(element.bounds, [405, 420, 445, 58]);
      const editor = page.locator('[data-hd-inline-editor]');
      await editor.waitFor();
      await eventually(() => editor.evaluate((node) => document.activeElement === node));
      // Typing must replace the selected initial placeholder without a second click.
      await page.keyboard.insertText('Canvas XYZ');
      await page.keyboard.press('Backspace');
      assert.equal(await editor.innerText(), 'Canvas XY');
      assert.equal(await elementNode(textId).count(), 1);
      await page.keyboard.press(`${modifier}+Enter`);
      await editor.waitFor({ state: 'detached' });
      await saved();
      const persisted = (await sourcePage()).elements.find((item) => item.elementId === textId);
      assert.equal(persisted.content.text, 'Canvas XY');
      assert.equal(persisted.elementType, 'text');
    },
  );

  await check('object Delete, Undo and Redo change the real page file', async () => {
    await elementNode(textId).click();
    await canvas().focus();
    const started = Date.now();
    await page.keyboard.press('Delete');
    await elementNode(textId).waitFor({ state: 'detached' });
    const visualMilliseconds = Date.now() - started;
    await waitForElementPresence(textId, false);
    timings.push({
      name: 'delete',
      visualMilliseconds,
      persistedMilliseconds: Date.now() - started,
    });
    await page.keyboard.press(`${modifier}+z`);
    await waitForElementPresence(textId, true);
    assert.equal(
      (await sourcePage()).elements.find((item) => item.elementId === textId).content.text,
      'Canvas XY',
    );
    await page.keyboard.press(`${modifier}+Shift+z`);
    await waitForElementPresence(textId, false);
    await page.keyboard.press(`${modifier}+z`);
    await waitForElementPresence(textId, true);
  });

  await check(
    'shortCode is primary, old S aliases remain searchable and copy yields the shortCode',
    async () => {
      const search = page.getByRole('textbox', { name: '搜索页面编号或标题', exact: true });
      const sibling = initial.pages.find((item) => item.pageId === pageIds[1]);
      await search.fill(sibling.shortCode.toLowerCase());
      await eventually(async () => (await page.locator('[data-hd-thumbnail]').count()) === 1);
      const match = thumbnail(sibling.pageId);
      assert.match(await match.getAttribute('aria-label'), /第 2 页 · Q9R4/);
      assert.ok((await match.innerText()).includes('Q9R4'));
      assert.ok(
        !(await match.innerText()).includes('S3'),
        'Legacy aliases should not replace the primary shortCode.',
      );
      await search.fill(sibling.metadata.label.toLowerCase());
      await eventually(async () => (await page.locator('[data-hd-thumbnail]').count()) === 1);
      await match.click({ button: 'right' });
      await page.getByRole('menuitem', { name: '复制页面短码', exact: true }).click();
      await eventually(
        async () =>
          (await application.evaluate(({ clipboard }) => clipboard.readText())) ===
          sibling.shortCode,
      );
      await search.fill('');
      await eventually(async () => (await page.locator('[data-hd-thumbnail]').count()) === 3);
      await thumbnail(target.pageId).click();
    },
  );

  await check(
    'light and dark editor layouts remain visible at desktop and compact sizes',
    async () => {
      await saved();
      await capture('editor-v05-1600x1000.png', 1600, 1000, false);
      await capture('editor-v05-1024x768.png', 1024, 768, false);
      await capture('editor-v05-dark.png', 1600, 1000, true);
    },
  );
  assert.deepEqual(rendererErrors, []);
  const report = {
    passed: true,
    timestamp: new Date().toISOString(),
    platform: process.platform,
    node: process.version,
    electron: await application.evaluate(() => process.versions.electron),
    executablePath,
    entry,
    sandbox,
    syntheticOnly: true,
    startupMilliseconds,
    checks,
    timings,
    mutations,
    rendererErrors,
    screenshots,
  };
  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} catch (error) {
  const report = {
    passed: false,
    timestamp: new Date().toISOString(),
    entry,
    sandbox,
    syntheticOnly: true,
    startupMilliseconds,
    checks,
    timings,
    mutations,
    screenshots,
    error: error.stack ?? String(error),
    rendererErrors,
    processLog: processLog.join('').slice(-12000),
  };
  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  await page
    ?.screenshot({ path: path.join(evidence, 'editor-v05-failure.png'), timeout: 12000 })
    .catch(() => {});
  process.stderr.write(`${JSON.stringify(report, null, 2)}\n`);
  process.exitCode = 1;
} finally {
  await application?.close().catch(() => {});
  await fs.writeFile(path.join(evidence, 'editor-v05-process.log'), processLog.join(''));
}
