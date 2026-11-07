// biome-ignore-all lint/suspicious/noUndeclaredEnvVars: The isolated acceptance run selects its executable, runtime, browser and loopback port.
import assert from 'node:assert/strict';
import { execFileSync, fork } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(root, 'packages/core/package.json'));
const { chromium, _electron: electron } = require('playwright');
const YAML = require('yaml');
const executablePath = process.env.HUANDENG_DESKTOP_EXE;
const sandbox = await fs.mkdtemp(path.join(os.tmpdir(), 'huandeng-ui-v07-'));
const projectRoot = path.join(sandbox, 'synthetic-project');
const entry = path.join(projectRoot, 'deck.pptd');
const evidence = path.join(root, '.verification/v07-ui');
const reportPath = path.join(evidence, 'report.json');
const ids = [randomUUID(), randomUUID(), randomUUID()];
const pagePaths = ['pages/opening.page', 'pages/comparison.page', 'pages/closing.page'];
const projectTitle =
  '欢登工作台验证：从研究证据到清晰叙事 / Evidence Review, Authoring and Presentation Delivery';
const presentationTitle =
  '年度研究汇报 · 证据、讨论与下一步计划 / Annual Research Review and Decisions for the Next Stage';
const emptyStory = { purpose: '', audience: '', takeaway: '' };
const svg =
  '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="270" viewBox="0 0 480 270"><rect width="480" height="270" fill="#e4ece6"/><rect x="42" y="60" width="105" height="155" rx="8" fill="#325c49"/><rect x="185" y="100" width="105" height="115" rx="8" fill="#7fa18e"/><rect x="328" y="138" width="105" height="77" rx="8" fill="#afc5b6"/></svg>';
const timeline = {
  schemaVersion: 1,
  durationMs: 4000,
  tracks: [
    {
      id: 'move-x',
      targetId: 'moving-rect',
      property: 'x',
      keyframes: [
        { id: 'start', timeMs: 0, value: 80, easing: 'ease-in-out' },
        { id: 'end', timeMs: 4000, value: 540, easing: 'linear' },
      ],
    },
  ],
  cues: [
    { id: 'cue-first', timeMs: 1250, label: '第一步' },
    { id: 'cue-second', timeMs: 3000, label: '第二步' },
  ],
};
for (const directory of ['pages', 'assets', '.huandeng'])
  await fs.mkdir(path.join(projectRoot, directory), { recursive: true });
await fs.mkdir(evidence, { recursive: true });
await fs.writeFile(path.join(projectRoot, 'assets/seed-art.svg'), svg);
const importedPath = path.join(sandbox, 'imported-ui.svg');
await fs.writeFile(importedPath, svg.replace('#325c49', '#375e87'));
await fs.writeFile(
  entry,
  YAML.stringify({
    title: projectTitle,
    size: [960, 540],
    pages: pagePaths,
    theme: { fontFamily: 'Arial' },
  }),
);
for (const [index, file] of pagePaths.entries()) {
  await fs.writeFile(
    path.join(projectRoot, file),
    YAML.stringify({
      elements: [
        {
          elementId: 'title',
          elementType: 'text',
          bounds: [64, 46, 820, 64],
          content: {
            text: ['让创作保持清晰', '比较与取舍', '下一步行动'][index],
            fontSize: 36,
            color: '#244334',
          },
        },
        {
          elementId: 'subtitle',
          elementType: 'text',
          bounds: [66, 119, 750, 44],
          content: { text: '合成验收内容 · 工作台、素材与动画', fontSize: 19, color: '#63756b' },
        },
        {
          elementId: 'moving-rect',
          elementType: 'shape',
          shapeName: 'rect',
          bounds: [80, 220, 175, 135],
          fill: { type: 'solid', color: '#3a7258' },
        },
        {
          elementId: 'seed-image',
          elementType: 'image',
          src: 'assets/seed-art.svg',
          bounds: [430, 215, 420, 236.25],
          fit: { mode: 'contain' },
        },
      ],
      notes: '用于界面验收的合成内容，不包含科研数据。',
      ...(index === 0 ? { timeline } : {}),
    }),
  );
}
await fs.writeFile(
  path.join(projectRoot, '.huandeng/project.json'),
  JSON.stringify(
    {
      schemaVersion: 1,
      deckId: randomUUID(),
      entry: 'deck.pptd',
      project: {
        schemaVersion: 1,
        mainStory: emptyStory,
        sections: [],
        presentations: [
          {
            id: 'long-talk',
            title: presentationTitle,
            story: emptyStory,
            items: [
              { id: 'opening', kind: 'page', pageId: ids[0] },
              { id: 'comparison', kind: 'page', pageId: ids[1] },
              { id: 'return', kind: 'page', pageId: ids[0] },
            ],
          },
        ],
      },
      slides: Object.fromEntries(
        ids.map((id, index) => [
          id,
          {
            shortCode: ['U7AA', 'U7BB', 'U7CC'][index],
            label: `S${index + 1}`,
            path: pagePaths[index],
            state: 'active',
          },
        ]),
      ),
    },
    null,
    2,
  ),
);
const originalSiblings = await Promise.all(
  pagePaths.slice(1).map((file) => fs.readFile(path.join(projectRoot, file))),
);
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const editorIndex = path.join(root, 'packages/core/dist/editor/huandeng.html');
const localBuildSha256 = existsSync(editorIndex) ? hash(await fs.readFile(editorIndex)) : null;
const launchEnv = {
  ...process.env,
  HUANDENG_DESKTOP_DATA_DIR: path.join(sandbox, 'profile'),
  HUANDENG_RUNTIME_DIR: path.join(sandbox, 'runtime'),
};
delete launchEnv.ELECTRON_RUN_AS_NODE;
const checks = [];
const screenshots = [];
const layouts = [];
const motion = [];
const rendererErrors = [];
const processLog = [];
let application;
let browser;
let child;
let page;
let serviceUrl;
let sessionToken;
let runtimeVersion;
let normalExit;
let failure;
let fixtureCheck;
const startupEvidence = {};
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function withTimeout(promise, milliseconds, message) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(message)), milliseconds);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
async function eventually(fn, timeout = 20000) {
  const until = Date.now() + timeout;
  let last;
  while (Date.now() < until) {
    try {
      const value = await fn();
      if (value) return value;
    } catch (error) {
      last = error;
    }
    await delay(75);
  }
  throw last ?? new Error('Timed out waiting for UI acceptance state.');
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
async function api(route) {
  const response = await fetch(`${serviceUrl}/__pptd${route}`, {
    headers: { 'x-huandeng-token': sessionToken ?? '' },
    signal: AbortSignal.timeout(15000),
  });
  const value = await response.json();
  assert.ok(response.ok && value.ok !== false, `${route}: ${JSON.stringify(value)}`);
  return value;
}
const source = () => fs.readFile(path.join(projectRoot, pagePaths[0]), 'utf8');
const disk = async () => YAML.parse(await source());
const panel = () => page.locator('[data-hd-timeline]');
const inspector = () => page.locator('[data-hd-inspector]');
async function saved() {
  await eventually(async () =>
    (await page.locator('[data-hd-save-status]').innerText()).includes('已保存'),
  );
}
async function resize(width, height) {
  if (application)
    await application.evaluate(
      ({ BrowserWindow }, size) =>
        BrowserWindow.getAllWindows()[0].setContentSize(size.width, size.height),
      { width, height },
    );
  else await page.setViewportSize({ width, height });
  await eventually(async () =>
    page.evaluate((size) => innerWidth === size.width && innerHeight === size.height, {
      width,
      height,
    }),
  );
  await page.evaluate(() => document.fonts.ready);
}
async function capture(name) {
  const file = path.join(evidence, `${name}.png`);
  await page.screenshot({ path: file, animations: 'disabled' });
  const viewport = await page.evaluate(() => ({
    width: innerWidth,
    height: innerHeight,
    devicePixelRatio,
  }));
  const bytes = await fs.readFile(file);
  screenshots.push({
    file: path.basename(file),
    sha256: hash(bytes),
    pixelWidth: bytes.readUInt32BE(16),
    pixelHeight: bytes.readUInt32BE(20),
    viewport,
  });
}
async function checkFittedPage(name) {
  await page.getByRole('button', { name: '适合窗口', exact: true }).click();
  let geometry;
  try {
    await eventually(async () => {
      geometry = await page.evaluate(() => {
        const canvas = document.querySelector('[data-hd-editor-canvas]');
        const viewport = document.querySelector('[data-hd-canvas-viewport]');
        const slide = canvas?.querySelector('[data-pptd-page]');
        if (!viewport || !slide || !viewport.closest('[data-hd-authoring-workspace]'))
          throw new Error('The actual canvas scroll viewport or rendered page is missing.');
        const viewBox = viewport.getBoundingClientRect();
        const slideBox = slide.getBoundingClientRect();
        const style = getComputedStyle(viewport);
        const visible = {
          left: Math.max(0, viewBox.left + viewport.clientLeft),
          top: Math.max(0, viewBox.top + viewport.clientTop),
          right: Math.min(innerWidth, viewBox.left + viewport.clientLeft + viewport.clientWidth),
          bottom: Math.min(innerHeight, viewBox.top + viewport.clientTop + viewport.clientHeight),
        };
        return {
          visible,
          slide: {
            left: slideBox.left,
            top: slideBox.top,
            right: slideBox.right,
            bottom: slideBox.bottom,
            width: slideBox.width,
            height: slideBox.height,
          },
          overflowY: style.overflowY,
          scrollTop: viewport.scrollTop,
          clientHeight: viewport.clientHeight,
          scrollHeight: viewport.scrollHeight,
          canvasHeight: canvas.getBoundingClientRect().height,
          availableContentHeight:
            viewport.clientHeight -
            Number.parseFloat(style.paddingTop) -
            Number.parseFloat(style.paddingBottom),
        };
      });
      const { slide, visible } = geometry;
      assert.ok(['auto', 'scroll'].includes(geometry.overflowY));
      assert.ok(slide.width > 0 && slide.height > 0);
      assert.ok(slide.left >= visible.left - 1, `${name}: slide is clipped on the left.`);
      assert.ok(slide.top >= visible.top - 1, `${name}: slide is clipped at the top.`);
      assert.ok(slide.right <= visible.right + 1, `${name}: slide is clipped on the right.`);
      assert.ok(slide.bottom <= visible.bottom + 1, `${name}: slide is clipped at the bottom.`);
      return true;
    }, 5000);
  } finally {
    layouts.push({ name: `fit-${name}`, ...geometry });
  }
}
async function layout(name) {
  const data = await page.evaluate(() => {
    const box = (element) => {
      if (!element?.getClientRects().length) return null;
      const rect = element.getBoundingClientRect();
      return {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        right: rect.right,
        bottom: rect.bottom,
      };
    };
    const header = document.querySelector('.hd-titlebar');
    const navigation = document.querySelector('.hd-navigation');
    const title = document.querySelector('[data-hd-document-title]');
    const collection = document.querySelector('[aria-label="当前演讲集合"]');
    return {
      viewport: { width: innerWidth, height: innerHeight, devicePixelRatio },
      documentWidth: document.documentElement.scrollWidth,
      header: box(header),
      title: {
        box: box(title),
        clientWidth: title.clientWidth,
        scrollWidth: title.scrollWidth,
        full: title.title,
      },
      collection: {
        box: box(collection),
        full: collection.title,
        fontSize: getComputedStyle(collection).fontSize,
      },
      controls: [...header.querySelectorAll('button, select')].map((element) => ({
        name: element.getAttribute('aria-label') || element.textContent.trim(),
        disabled: element.disabled,
        box: box(element),
      })),
      navigation: {
        box: box(navigation),
        scrollWidth: navigation.scrollWidth,
        clientWidth: navigation.clientWidth,
      },
      navigationButtons: [...document.querySelectorAll('.hd-navigation-tabs button')].map(
        (element) => ({ name: element.textContent.trim(), box: box(element) }),
      ),
      workspace: box(document.querySelector('main')),
      canvas: box(document.querySelector('[data-hd-editor-canvas]')),
      inspector: box(document.querySelector('[data-hd-inspector]')),
      reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
      dark: document.documentElement.classList.contains('dark'),
    };
  });
  layouts.push({ name, ...data });
  return data;
}
function checkLayout(data) {
  assert.ok(data.documentWidth <= data.viewport.width + 1, 'The document overflows horizontally.');
  assert.equal(data.header.height, 56);
  assert.ok(data.title.box.width >= 72, `Project title has only ${data.title.box.width}px.`);
  assert.ok(
    Math.abs(
      data.title.box.y +
        data.title.box.height / 2 -
        (data.collection.box.y + data.collection.box.height / 2),
    ) < 2,
    'Title and collection do not share a horizontal baseline.',
  );
  assert.equal(data.title.full, projectTitle);
  assert.equal(data.collection.full, presentationTitle);
  assert.ok(
    data.title.box.right <= data.collection.box.x + 1,
    'Project title overlaps the collection.',
  );
  for (const control of data.controls.filter((item) => item.box)) {
    assert.ok(
      control.box.x >= 0 && control.box.right <= data.viewport.width + 1,
      `Header control outside viewport: ${control.name}`,
    );
    assert.ok(
      control.box.y >= data.header.y && control.box.bottom <= data.header.bottom + 1,
      `Header control outside its row: ${control.name}`,
    );
  }
  const ordered = data.controls.filter((item) => item.box);
  for (let index = 1; index < ordered.length; index++)
    assert.ok(
      ordered[index - 1].box.right <= ordered[index].box.x + 1,
      `Header controls overlap: ${ordered[index - 1].name} / ${ordered[index].name}`,
    );
  for (const control of data.navigationButtons.filter((item) => item.box))
    assert.ok(
      control.box.x >= data.navigation.box.x && control.box.right <= data.navigation.box.right + 1,
      `Navigation tab overflows: ${control.name}`,
    );
}
async function theme(value) {
  await page.getByRole('button', { name: '切换主题', exact: true }).click();
  await page
    .getByRole('menuitem', { name: value === 'dark' ? '深色' : '浅色', exact: true })
    .click();
  await eventually(async () =>
    page.evaluate(
      (dark) => document.documentElement.classList.contains('dark') === dark,
      value === 'dark',
    ),
  );
}
async function launch() {
  if (executablePath) {
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
    application.process().stderr?.on('data', (data) => processLog.push(String(data)));
    page = await application.firstWindow();
    page.on('pageerror', (error) => rendererErrors.push(error.message));
    await page.locator('[data-hd-editor-canvas]').waitFor({ timeout: 120000 });
    const context = await page.evaluate(() => window.huandengDesktop.getContext());
    assert.equal(path.resolve(context.entryPath).toLowerCase(), path.resolve(entry).toLowerCase());
    serviceUrl = context.serviceUrl;
    runtimeVersion = await application.evaluate(() => ({
      electron: process.versions.electron,
      chrome: process.versions.chrome,
    }));
  } else {
    const port = Number(process.env.HUANDENG_UI_PORT ?? 4877);
    assert.ok(Number.isInteger(port) && port > 1024 && port <= 65535);
    const probe = net.createServer();
    await new Promise((resolve, reject) => {
      probe.once('error', reject);
      probe.listen(port, '127.0.0.1', resolve);
    });
    await new Promise((resolve) => probe.close(resolve));
    child = fork(
      path.join(root, 'packages/core/huandeng.js'),
      ['open', entry, '--port', String(port), '--no-browser'],
      { cwd: root, env: launchEnv, execArgv: [], stdio: ['ignore', 'pipe', 'pipe', 'ipc'] },
    );
    child.stdout.on('data', (data) => processLog.push(String(data)));
    child.stderr.on('data', (data) => processLog.push(String(data)));
    const ready = await withTimeout(
      new Promise((resolve, reject) => {
        child.on('message', (message) => {
          if (message?.type === 'huandeng:ready') resolve(message);
        });
        child.once('error', reject);
        child.once('exit', (code) => reject(new Error(`CLI exited before ready: ${code}`)));
      }),
      45000,
      'CLI did not become ready.',
    );
    serviceUrl = ready.url;
    const browserPath = [process.env.HUANDENG_BROWSER, '/usr/bin/chromium'].find(
      (candidate) => candidate && existsSync(candidate),
    );
    browser = await chromium.launch({
      ...(browserPath ? { executablePath: browserPath } : {}),
      headless: true,
      args: process.platform === 'linux' ? ['--no-sandbox', '--disable-dev-shm-usage'] : [],
    });
    runtimeVersion = { chromium: browser.version() };
    page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
    page.on('pageerror', (error) => rendererErrors.push(error.message));
    await page.goto(`${serviceUrl}/huandeng`, { waitUntil: 'networkidle' });
  }
  page.setDefaultTimeout(15000);
  await page.locator('[data-hd-editor-canvas]').waitFor();
  const initial = await api('/session');
  sessionToken = initial.sessionToken;
  assert.equal(initial.pages.length, 3);
  assert.equal(initial.writable, true);
}
async function closeNormally() {
  await saved();
  if (application) {
    const exited = new Promise((resolve) =>
      application.process().once('exit', (code, signal) => resolve({ code, signal })),
    );
    await application.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].close());
    normalExit = await withTimeout(exited, 20000, 'Candidate did not close normally.');
    application = undefined;
  } else {
    await browser.close();
    browser = undefined;
    const exited = new Promise((resolve) =>
      child.once('exit', (code, signal) => resolve({ code, signal })),
    );
    child.send({ type: 'huandeng:shutdown' });
    normalExit = await withTimeout(exited, 20000, 'CLI did not close normally.');
    child = undefined;
  }
  assert.deepEqual(normalExit, { code: 0, signal: null });
}

try {
  fixtureCheck = JSON.parse(
    execFileSync(process.execPath, [path.join(root, 'packages/core/huandeng.js'), 'check', entry], {
      cwd: root,
      env: launchEnv,
      encoding: 'utf8',
      timeout: 30000,
      stdio: ['ignore', 'pipe', 'pipe'],
    }),
  );
  assert.equal(fixtureCheck.pageCount, 3);
  assert.deepEqual(fixtureCheck.diagnostics, []);
  if (process.argv.includes('--preflight')) {
    const preflight = { fixtureCheck, entry, syntheticOnly: true, browserStarted: false };
    await fs.writeFile(
      path.join(evidence, 'preflight.json'),
      `${JSON.stringify(preflight, null, 2)}\n`,
    );
    await new Promise((resolve) =>
      process.stdout.write(`${JSON.stringify(preflight, null, 2)}\n`, resolve),
    );
    process.exit(0);
  }
  await launch();
  await theme('light');
  await page.getByLabel('当前演讲集合', { exact: true }).selectOption('long-talk');
  await eventually(
    async () => new URL(page.url()).searchParams.get('presentation') === 'long-talk',
  );
  await eventually(async () => !(await page.locator('[data-hd-export]').isDisabled()));
  for (const [width, height] of [
    [1600, 1000],
    [1280, 800],
    [1040, 680],
  ]) {
    await check(
      `long project and presentation names remain usable at ${width}x${height}`,
      async () => {
        await resize(width, height);
        await checkFittedPage(`workspace-${width}`);
        await capture(`workspace-${width}`);
        checkLayout(await layout(`workspace-${width}`));
        assert.equal(await page.getByText('文档服务已连接', { exact: true }).count(), 0);
        assert.equal(await page.getByRole('button', { name: '保存页面', exact: true }).count(), 1);
      },
    );
  }
  await check('collection and header keyboard focus follow the visible order', async () => {
    const collection = page.getByLabel('当前演讲集合', { exact: true });
    await collection.focus();
    const before = await collection.boundingBox();
    await page.keyboard.press('Tab');
    const after = await page.evaluate(() => {
      const element = document.activeElement;
      const box = element.getBoundingClientRect();
      return { insideHeader: !!element.closest('.hd-titlebar'), x: box.x };
    });
    assert.ok(after.insideHeader && after.x >= before.x + before.width);
    await page.keyboard.press('Shift+Tab');
    assert.equal(await collection.evaluate((element) => element === document.activeElement), true);
    await page.keyboard.press('F6');
    assert.equal(
      await page.evaluate(() =>
        document.activeElement
          ?.closest('[data-hd-focus-region]')
          ?.getAttribute('data-hd-focus-region'),
      ),
      'navigation',
    );
    await page.keyboard.press('F6');
    assert.equal(
      await page.evaluate(() =>
        document.activeElement
          ?.closest('[data-hd-focus-region]')
          ?.getAttribute('data-hd-focus-region'),
      ),
      'tools',
    );
  });
  await page.getByLabel('当前演讲集合', { exact: true }).selectOption('');
  await eventually(async () => !new URL(page.url()).searchParams.has('presentation'));
  await check('asset entry opens the existing library and focuses its search', async () => {
    await page.locator('[data-hd-open-assets]').click();
    const search = page.locator('[data-hd-asset-library] input[type="search"]');
    await search.waitFor();
    await eventually(async () => search.evaluate((element) => element === document.activeElement));
    assert.equal(await page.getByLabel('新图片路径', { exact: true }).count(), 0);
    await search.fill('seed-art');
    const card = page.locator('[data-hd-asset-path="assets/seed-art.svg"]');
    await card.waitFor();
    await card.click();
    await page.getByRole('button', { name: '复用到当前页', exact: true }).waitFor();
    await capture('assets-1040');
    const state = await layout('assets-1040');
    assert.ok(
      state.navigation.scrollWidth <= state.navigation.clientWidth + 1,
      'Asset navigation overflows.',
    );
    const count = (await disk()).elements.length;
    await page.getByRole('button', { name: '复用到当前页', exact: true }).click();
    await eventually(async () => (await disk()).elements.length === count + 1);
    await saved();
  });
  await check(
    'device shortcut opens a real file chooser and preserves the imported ratio',
    async () => {
      const count = (await disk()).elements.length;
      const chooser = page.waitForEvent('filechooser');
      await page.locator('[data-hd-import-images]').click();
      await (await chooser).setFiles(importedPath);
      await eventually(async () => (await disk()).elements.length === count + 1);
      await saved();
      const added = (await disk()).elements.find((item) => item.sourceName === 'imported-ui.svg');
      assert.ok(added);
      assert.ok(Math.abs(added.bounds[2] / added.bounds[3] - 480 / 270) < 0.00001);
      assert.equal(await page.locator('[role="dialog"]').count(), 0);
      for (const expected of [count, count - 1]) {
        await page.getByRole('button', { name: '撤销', exact: true }).click();
        await eventually(async () => (await disk()).elements.length === expected);
        await saved();
      }
    },
  );
  await check('project overview enters arrangement with a native control focused', async () => {
    await page.getByRole('button', { name: '项目与故事', exact: true }).click();
    await page
      .locator('[data-hd-project-overview]')
      .getByRole('button', { name: '编排演讲', exact: true })
      .click();
    await eventually(async () =>
      page.evaluate(
        () =>
          !!document.activeElement?.closest('[data-hd-project-editor]') &&
          ['SELECT', 'BUTTON'].includes(document.activeElement.tagName),
      ),
    );
    await page.getByRole('button', { name: '页面缩略图', exact: true }).click();
  });
  await check(
    'preview releases the base inspector and returns selection without changing the page',
    async () => {
      await resize(1280, 800);
      await page.locator('[data-hd-editor-canvas] [data-hd-element-id="moving-rect"]').click();
      await page.getByRole('button', { name: '动画', exact: true }).click();
      await panel().waitFor();
      const beforeSource = await source();
      const beforeWidth = (await page.locator('main').boundingBox()).width;
      assert.equal(await inspector().isVisible(), true);
      await panel().getByRole('button', { name: '预览动画', exact: true }).click();
      await page.locator('[data-hd-preview-context]').waitFor();
      await eventually(async () => !(await inspector().isVisible()));
      const afterWidth = (await page.locator('main').boundingBox()).width;
      assert.ok(
        afterWidth - beforeWidth >= 250,
        `Preview released only ${afterWidth - beforeWidth}px.`,
      );
      assert.ok(
        (await page.locator('[data-hd-preview-context]').innerText()).includes('moving-rect'),
      );
      const scrubber = panel().getByLabel('动画播放头（秒）', { exact: true });
      await scrubber.focus();
      await scrubber.press('End');
      await checkFittedPage('preview-1280');
      await capture('preview-1280');
      await layout('preview-1280');
      await page.getByRole('button', { name: '返回基础编辑', exact: true }).click();
      await eventually(async () => inspector().isVisible());
      await eventually(async () =>
        page.evaluate(
          () => document.activeElement?.getAttribute('data-hd-element-id') === 'moving-rect',
        ),
      );
      assert.equal(await source(), beforeSource);
      assert.equal((await page.locator('main').boundingBox()).width, beforeWidth);
      await checkFittedPage('base-with-timeline-1280');
    },
  );
  await check('preview preserves a manually collapsed inspector', async () => {
    await page.getByRole('button', { name: '收起对象属性', exact: true }).click();
    await panel().getByRole('button', { name: '预览动画', exact: true }).click();
    await page.getByRole('button', { name: '返回基础编辑', exact: true }).click();
    await panel().getByRole('button', { name: '预览动画', exact: true }).waitFor();
    assert.equal(await inspector().isVisible(), false);
    await page.getByRole('button', { name: '展开对象属性', exact: true }).click();
    assert.equal(await inspector().isVisible(), true);
  });
  await check(
    'dark reduced-motion mode retains focus and usable timeline space at 1040',
    async () => {
      await resize(1040, 680);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await theme('dark');
      await page.getByLabel('当前演讲集合', { exact: true }).focus();
      const focus = await page.getByLabel('当前演讲集合', { exact: true }).evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          focused: element === document.activeElement,
          outlineStyle: style.outlineStyle,
          outlineWidth: style.outlineWidth,
          transitionDuration: style.transitionDuration,
        };
      });
      assert.equal(focus.focused, true);
      assert.notEqual(focus.outlineStyle, 'none');
      assert.ok(Number.parseFloat(focus.outlineWidth) >= 2);
      assert.equal(focus.transitionDuration, '0s');
      await panel().getByRole('button', { name: '预览动画', exact: true }).click();
      await page.locator('[data-hd-preview-context]').waitFor();
      await checkFittedPage('dark-reduced-preview-1040');
      await capture('dark-reduced-preview-1040');
      const state = await layout('dark-reduced-preview-1040');
      assert.equal(state.dark, true);
      assert.equal(state.reducedMotion, true);
      assert.ok(state.documentWidth <= state.viewport.width + 1);
      await page.getByRole('button', { name: '返回基础编辑', exact: true }).click();
      await panel().getByRole('button', { name: '预览动画', exact: true }).waitFor();
      await checkFittedPage('dark-base-with-timeline-1040');
      await page.getByRole('button', { name: '动画', exact: true }).click();
    },
  );
  await check(
    'MP4 export dialog displays scope and timing without overflow or focus escape',
    async () => {
      await page.getByLabel('当前演讲集合', { exact: true }).selectOption('long-talk');
      await eventually(async () => !(await page.locator('[data-hd-export]').isDisabled()));
      await page.locator('[data-hd-export]').click();
      const dialog = page.locator('[data-hd-export-dialog]');
      await dialog.waitFor();
      assert.equal(
        await page.evaluate(() => !!document.activeElement?.closest('[data-hd-export-dialog]')),
        true,
      );
      await dialog.getByLabel('导出格式', { exact: true }).selectOption('mp4');
      await dialog.locator('[data-hd-video-estimate]').waitFor();
      assert.ok((await dialog.locator('[data-hd-video-estimate]').innerText()).includes('3 页'));
      await dialog.getByLabel('导出范围', { exact: true }).selectOption('page');
      await eventually(async () =>
        (await dialog.locator('[data-hd-video-estimate]').innerText()).includes('1 页'),
      );
      await dialog.getByLabel('导出范围', { exact: true }).selectOption('collection');
      const geometry = await dialog.evaluate((element) => {
        const box = element.getBoundingClientRect();
        return {
          x: box.x,
          y: box.y,
          right: box.right,
          bottom: box.bottom,
          width: box.width,
          height: box.height,
          scrollWidth: element.scrollWidth,
          clientWidth: element.clientWidth,
          scrollHeight: element.scrollHeight,
          clientHeight: element.clientHeight,
          viewport: { width: innerWidth, height: innerHeight },
        };
      });
      layouts.push({ name: 'mp4-dialog-1040', ...geometry });
      await capture('export-mp4-1040');
      assert.ok(geometry.x >= 0 && geometry.right <= geometry.viewport.width + 1);
      assert.ok(geometry.y >= 0 && geometry.bottom <= geometry.viewport.height + 1);
      assert.ok(
        geometry.scrollWidth <= geometry.clientWidth + 1,
        'Export dialog overflows horizontally.',
      );
      await dialog.getByLabel('静态页停留（秒）', { exact: true }).fill('-1');
      assert.equal(
        await dialog.getByRole('button', { name: '开始导出', exact: true }).isDisabled(),
        true,
      );
      await dialog.getByLabel('静态页停留（秒）', { exact: true }).fill('3');
      await dialog.getByRole('button', { name: '关闭', exact: true }).click();
      await eventually(async () =>
        page.locator('[data-hd-export]').evaluate((element) => element === document.activeElement),
      );
    },
  );
  await check(
    'portal dialog respects reduced motion without losing centering or normal motion',
    async () => {
      const readMotion = (locator) =>
        locator.evaluate((element) => {
          const style = getComputedStyle(element);
          const box = element.getBoundingClientRect();
          return {
            transitionProperty: style.transitionProperty,
            transitionDuration: style.transitionDuration,
            durationsMs: style.transitionDuration
              .split(',')
              .map((value) => Number.parseFloat(value) * (value.trim().endsWith('ms') ? 1 : 1000)),
            scale: style.scale,
            translate: style.translate,
            transform: style.transform,
            transformIsIdentity:
              style.transform === 'none' || new DOMMatrixReadOnly(style.transform).isIdentity,
            active: element.matches(':active'),
            focused: element.matches(':focus-visible, :has(:focus-visible)'),
            inEditorSubtree: !!element.closest('.hd-editor'),
            box: { x: box.x, y: box.y, width: box.width, height: box.height },
            viewport: { width: innerWidth, height: innerHeight },
          };
        });
      const assertCentered = (state) => {
        assert.ok(
          Math.abs(state.box.x + state.box.width / 2 - state.viewport.width / 2) <= 1,
          'Dialog lost its horizontal centering.',
        );
        assert.ok(
          Math.abs(state.box.y + state.box.height / 2 - state.viewport.height / 2) <= 1,
          'Dialog lost its vertical centering.',
        );
      };
      const noScale = (value) =>
        value === 'none' || value.split(/\s+/).every((part) => Number(part) === 1);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.locator('[data-hd-export]').click();
      const dialog = page.locator('[data-hd-export-dialog]');
      await dialog.waitFor();
      const format = dialog.getByLabel('导出格式', { exact: true });
      await format.selectOption('mp4');
      await dialog.getByText('正在检查视频编码器…', { exact: true }).waitFor({ state: 'hidden' });
      await format.focus();
      await page.keyboard.press('Tab');
      await page.keyboard.press('Shift+Tab');
      const reduced = await readMotion(dialog);
      const overlay = await readMotion(page.locator('[data-slot="dialog-overlay"]'));
      motion.push({ name: 'reduced-portal', dialog: reduced, overlay });
      assert.equal(reduced.inEditorSubtree, false, 'This must exercise the body-level Portal.');
      assert.equal(reduced.transitionProperty, 'opacity');
      assert.ok(reduced.focused, 'Keyboard focus should be visibly inside the dialog.');
      assert.ok(reduced.durationsMs.every((value) => value === 0));
      assert.ok(noScale(reduced.scale), `Reduced-motion dialog scales: ${reduced.scale}`);
      assert.notEqual(reduced.translate, 'none', 'Dialog centering translate was removed.');
      assertCentered(reduced);
      assert.equal(overlay.transitionProperty, 'opacity');
      assert.ok(overlay.durationsMs.every((value) => value <= 80));
      await capture('export-mp4-reduced-1040');
      const close = dialog.getByRole('button', { name: '关闭', exact: true });
      const buttonBefore = await readMotion(close);
      await page.mouse.move(
        buttonBefore.box.x + buttonBefore.box.width / 2,
        buttonBefore.box.y + buttonBefore.box.height / 2,
      );
      await page.mouse.down();
      try {
        const pressed = await readMotion(close);
        motion.push({ name: 'reduced-portal-button', before: buttonBefore, pressed });
        assert.equal(pressed.active, true, 'Close button must be genuinely pressed.');
        assert.ok(pressed.durationsMs.every((value) => value === 0));
        assert.ok(noScale(pressed.scale));
        assert.ok(pressed.transformIsIdentity);
        assert.ok(
          pressed.translate === 'none' ||
            pressed.translate.split(/\s+/).every((value) => Number.parseFloat(value) === 0),
          `Reduced-motion button translates while pressed: ${pressed.translate}`,
        );
        assert.ok(Math.abs(pressed.box.x - buttonBefore.box.x) < 0.1);
        assert.ok(Math.abs(pressed.box.y - buttonBefore.box.y) < 0.1);
      } finally {
        await page.mouse.up();
      }
      await dialog.waitFor({ state: 'hidden' });
      await eventually(async () =>
        page.locator('[data-hd-export]').evaluate((element) => element === document.activeElement),
      );
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await page.locator('[data-hd-export]').click();
      await dialog.waitFor();
      const normal = await readMotion(dialog);
      motion.push({ name: 'normal-portal', dialog: normal });
      assert.ok(
        normal.transitionProperty
          .split(',')
          .map((value) => value.trim())
          .includes('scale'),
      );
      assert.ok(normal.durationsMs.some((value) => value >= 100));
      assertCentered(normal);
      await dialog.getByRole('button', { name: '关闭', exact: true }).click();
      await eventually(async () =>
        page.locator('[data-hd-export]').evaluate((element) => element === document.activeElement),
      );
      await page.emulateMedia({ reducedMotion: 'reduce' });
    },
  );
  assert.deepEqual(rendererErrors, []);
  for (const [index, original] of originalSiblings.entries())
    assert.equal(
      hash(await fs.readFile(path.join(projectRoot, pagePaths[index + 1]))),
      hash(original),
    );
  if (!executablePath)
    assert.equal(
      hash(await fs.readFile(editorIndex)),
      localBuildSha256,
      'Production build changed during acceptance.',
    );
  await closeNormally();
} catch (error) {
  failure =
    error instanceof Error
      ? { message: error.message, stack: error.stack }
      : { message: String(error) };
  if (page) {
    startupEvidence.url = page.url();
    try {
      startupEvidence.pageText = await page.locator('body').innerText({ timeout: 3000 });
    } catch (issue) {
      startupEvidence.pageReadError = String(issue);
    }
    if (!serviceUrl && executablePath) {
      try {
        const context = await withTimeout(
          page.evaluate(() => window.huandengDesktop?.getContext()),
          3000,
          'Desktop context read timed out.',
        );
        serviceUrl = context?.serviceUrl;
      } catch (issue) {
        startupEvidence.contextReadError = String(issue);
      }
    }
  }
  if (serviceUrl) {
    try {
      const response = await fetch(`${serviceUrl}/__pptd/session`, {
        headers: { 'x-huandeng-token': sessionToken ?? '' },
        signal: AbortSignal.timeout(3000),
      });
      const session = await response.json();
      delete session.sessionToken;
      startupEvidence.session = { status: response.status, body: session };
    } catch (issue) {
      startupEvidence.sessionReadError = String(issue);
    }
  }
  await page
    ?.screenshot({
      path: path.join(evidence, 'failure.png'),
      animations: 'disabled',
      timeout: 10000,
    })
    .catch(() => {});
} finally {
  await browser?.close().catch(() => {});
  if (child) {
    if (child.connected) child.send({ type: 'huandeng:shutdown' });
    else child.kill('SIGTERM');
  }
  await application?.close().catch(() => {});
  const report = {
    passed: !failure,
    timestamp: new Date().toISOString(),
    mode: executablePath ? 'isolated-electron' : `${process.platform}-production-browser`,
    platform: process.platform,
    executablePath,
    desktopApp: process.env.HUANDENG_DESKTOP_APP,
    runtimeVersion,
    localBuildSha256,
    syntheticOnly: true,
    windowsDpiValidated: false,
    fixtureCheck,
    startupEvidence,
    checks,
    layouts,
    motion,
    screenshots,
    rendererErrors,
    normalExit,
    failure,
    fixture: { sandbox, entry },
    processLog,
  };
  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(
    `${JSON.stringify({ passed: report.passed, checks: checks.length, failed: checks.filter((item) => !item.passed), report: reportPath, screenshots: screenshots.length, normalExit }, null, 2)}\n`,
  );
  if (failure) process.exitCode = 1;
}
