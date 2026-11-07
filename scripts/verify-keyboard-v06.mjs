// biome-ignore-all lint/suspicious/noUndeclaredEnvVars: The isolated Electron acceptance process deliberately selects its executable, profile and runtime.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(root, 'packages/core/package.json'));
const { _electron: electron } = require('playwright');
const YAML = require('yaml');
const executablePath = process.env.HUANDENG_DESKTOP_EXE;
if (!executablePath)
  throw new Error('Set HUANDENG_DESKTOP_EXE to the isolated candidate executable.');
const sandbox = await fs.mkdtemp(path.join(os.tmpdir(), 'huandeng-keyboard-v06-'));
const projectRoot = path.join(sandbox, 'synthetic-project');
const entry = path.join(projectRoot, 'deck.pptd');
const evidence = path.join(root, '.verification');
const reportPath = path.join(evidence, 'keyboard-v06.json');
const ids = [randomUUID(), randomUUID(), randomUUID()];
const pagePaths = ['pages/one.page', 'pages/two.page', 'pages/three.page'];
const emptyStory = { purpose: '', audience: '', takeaway: '' };
const project = {
  schemaVersion: 1,
  mainStory: emptyStory,
  sections: [],
  presentations: [
    {
      id: 'repeat-talk',
      title: '重复页面验收',
      story: emptyStory,
      items: [
        { id: 'opening', kind: 'page', pageId: ids[0] },
        { id: 'middle', kind: 'page', pageId: ids[1] },
        { id: 'return', kind: 'page', pageId: ids[0], notes: '同一页的第二次出现。' },
      ],
    },
  ],
};
const elements = [
  {
    elementId: 'title',
    elementType: 'text',
    bounds: [60, 45, 800, 70],
    content: { text: '键盘验收 · 合成内容', fontSize: 34 },
  },
  {
    elementId: 'free',
    elementType: 'shape',
    shapeName: 'rect',
    bounds: [75, 180, 160, 90],
    fill: { type: 'solid', color: '#527f6e' },
  },
  {
    elementId: 'child-a',
    elementType: 'shape',
    shapeName: 'rect',
    bounds: [330, 180, 80, 90],
    fill: { type: 'solid', color: '#9cc3b3' },
  },
  {
    elementId: 'child-b',
    elementType: 'shape',
    shapeName: 'rect',
    bounds: [430, 180, 80, 90],
    fill: { type: 'solid', color: '#c8dcce' },
  },
  {
    elementId: 'group',
    elementType: 'group',
    bounds: [330, 180, 180, 90],
    children: ['child-a', 'child-b'],
  },
  {
    elementId: 'table',
    elementType: 'table',
    bounds: [60, 335, 520, 135],
    rows: [
      [{ text: '项目' }, { text: '值' }],
      [{ text: 'A' }, { text: '12' }],
    ],
    columnWidths: [0.5, 0.5],
  },
];
await fs.mkdir(path.join(projectRoot, 'pages'), { recursive: true });
await fs.mkdir(path.join(projectRoot, '.huandeng'), { recursive: true });
await fs.mkdir(evidence, { recursive: true });
await fs.writeFile(
  entry,
  YAML.stringify({
    title: 'HUANDENG 键盘验收',
    size: [960, 540],
    pages: pagePaths,
    theme: { fontFamily: 'Arial' },
  }),
);
for (const [index, file] of pagePaths.entries())
  await fs.writeFile(
    path.join(projectRoot, file),
    YAML.stringify({
      elements: structuredClone(elements),
      notes: `合成页面 ${index + 1}`,
      keyboardFixture: true,
    }),
  );
await fs.writeFile(
  path.join(projectRoot, '.huandeng/project.json'),
  JSON.stringify(
    {
      schemaVersion: 1,
      deckId: randomUUID(),
      entry: 'deck.pptd',
      project,
      slides: Object.fromEntries(
        ids.map((id, index) => [
          id,
          {
            shortCode: ['K6AA', 'K6BB', 'K6CC'][index],
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

const launchEnv = {
  ...process.env,
  HUANDENG_DESKTOP_DATA_DIR: path.join(sandbox, 'profile'),
  HUANDENG_RUNTIME_DIR: path.join(sandbox, 'runtime'),
};
delete launchEnv.ELECTRON_RUN_AS_NODE;
const checks = [];
const rendererErrors = [];
const processLog = [];
let rendererTransactionRequests = 0;
const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
let application;
let page;
let serviceUrl;
let sessionToken;
let electronVersion;
let normalExit;

async function eventually(fn, timeout = 20000) {
  const deadline = Date.now() + timeout;
  let last;
  while (Date.now() < deadline) {
    try {
      const value = await fn();
      if (value) return value;
    } catch (error) {
      last = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 75));
  }
  throw last ?? new Error('Timed out waiting for keyboard acceptance state.');
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

async function api(route, body) {
  const response = await fetch(`${serviceUrl}/__pptd${route}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'content-type': 'application/json', 'x-huandeng-token': sessionToken ?? '' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const result = await response.json();
  assert.ok(response.ok && result.ok !== false, `${route}: ${JSON.stringify(result)}`);
  return result;
}

const canvas = () => page.locator('[data-hd-editor-canvas]');
const object = (id) => canvas().locator(`[data-hd-element-id="${id}"]`);
const disk = async (index = 0) =>
  YAML.parse(await fs.readFile(path.join(projectRoot, pagePaths[index]), 'utf8'));
const element = async (id) => (await disk()).elements.find((item) => item.elementId === id);
const activeId = () =>
  page.evaluate(() => document.activeElement?.getAttribute('data-hd-element-id'));
const selectedIds = () =>
  canvas()
    .locator('[data-hd-selection]')
    .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-hd-selection')));
async function saved() {
  await eventually(async () =>
    (await page.locator('[data-hd-save-status]').innerText()).includes('已保存'),
  );
}
async function persisted(id, predicate) {
  await eventually(async () => predicate(await element(id)));
  await saved();
  assert.deepEqual((await api(`/pages/${ids[0]}`)).data, await disk());
}
async function menu(label) {
  await application.evaluate(({ Menu }, name) => {
    const item = Menu.getApplicationMenu()
      ?.items.find((entry) => entry.label === '编辑')
      ?.submenu?.items.find((entry) => entry.label === name);
    if (!item?.click) throw new Error(`Native Edit command missing: ${name}`);
    item.click();
  }, label);
}
async function mainPage(index = 0) {
  await page.getByLabel('当前演讲集合', { exact: true }).selectOption('');
  await page.getByRole('button', { name: '页面缩略图', exact: true }).click();
  await page.locator(`[data-hd-thumbnail="${ids[index]}"]`).click();
  await eventually(
    async () =>
      (await canvas().locator('[data-pptd-page]').getAttribute('data-pptd-page')) === ids[index],
  );
}
async function postOperations(operations) {
  const snapshot = await api('/session');
  return api('/transactions', {
    requestId: randomUUID(),
    deckId: snapshot.deckId,
    actor: 'keyboard-v06-fixture',
    originClientId: 'keyboard-v06-fixture',
    expected: {
      manifest: snapshot.manifestRevision,
      metadata: snapshot.metadataRevision,
      pages: Object.fromEntries(snapshot.pages.map((item) => [item.pageId, item.pageRevision])),
    },
    operations,
  });
}

try {
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
  page.setDefaultTimeout(15000);
  page.on('pageerror', (error) => rendererErrors.push(error.message));
  page.on('request', (request) => {
    if (request.method() === 'POST' && /\/__pptd\/(transactions|undo|redo)$/.test(request.url()))
      rendererTransactionRequests++;
  });
  await canvas().waitFor({ timeout: 120000 });
  const context = await page.evaluate(() => window.huandengDesktop.getContext());
  assert.equal(path.resolve(context.entryPath).toLowerCase(), path.resolve(entry).toLowerCase());
  serviceUrl = context.serviceUrl;
  const initial = await api('/session');
  sessionToken = initial.sessionToken;
  assert.equal(initial.pages.length, 3);
  assert.equal(initial.writable, true);
  electronVersion = await application.evaluate(() => process.versions.electron);
  await application.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()[0].setContentSize(1600, 1000),
  );
  await mainPage();

  await check(
    'Tab visits top-level objects once, wraps, and Esc then Tab leaves the canvas',
    async () => {
      await canvas().focus();
      for (const id of ['title', 'free', 'group', 'table', 'title']) {
        await page.keyboard.press('Tab');
        assert.equal(await activeId(), id);
        assert.deepEqual(await selectedIds(), [id]);
      }
      assert.equal(await canvas().getAttribute('tabindex'), '0');
      assert.equal(await canvas().locator('[data-hd-element-id][tabindex="0"]').count(), 0);
      assert.equal(await canvas().locator('[data-hd-resize]:not([tabindex="-1"])').count(), 0);
      await page.keyboard.press('Shift+Tab');
      assert.equal(await activeId(), 'table');
      await page.keyboard.press('Escape');
      assert.deepEqual(await selectedIds(), []);
      await page.keyboard.press('Tab');
      assert.equal(
        await page.evaluate(() => !!document.activeElement?.closest('[data-hd-editor-canvas]')),
        false,
      );
      await object('title').focus();
      await canvas().focus();
      await page.keyboard.press('Enter');
      await page.locator('[data-hd-inline-editor]').waitFor();
      await page.keyboard.press('Escape');
      await page.locator('[data-hd-inline-editor]').waitFor({ state: 'detached' });
      await eventually(async () => (await activeId()) === 'title');
    },
  );

  await check(
    'Escape cancels actual object move and resize before mouse-up without creating a transaction',
    async () => {
      await saved();
      const original = await element('free');
      const beforeBytes = await fs.readFile(path.join(projectRoot, pagePaths[0]), 'utf8');
      const beforeHistory = (await api('/history')).length;
      const beforeRequests = rendererTransactionRequests;
      for (const kind of ['move', 'resize']) {
        await object('free').focus();
        const target =
          kind === 'move'
            ? object('free')
            : canvas().locator('[data-hd-selection="free"] [data-hd-resize="se"]');
        await target.waitFor({ state: 'visible' });
        const property = kind === 'move' ? 'left' : 'width';
        const value = () => object('free').evaluate((node, name) => node.style[name], property);
        const originalValue = await value();
        const box = await target.boundingBox();
        assert.ok(box, `${kind} target must be visible.`);
        const x = box.x + box.width / 2;
        const y = box.y + box.height / 2;
        await page.mouse.move(x, y);
        await page.mouse.down();
        try {
          await page.mouse.move(x + 40, y + 25, { steps: 4 });
          await eventually(async () => (await value()) !== originalValue);
          await page.keyboard.press('Escape');
          await eventually(async () => (await value()) === originalValue);
        } finally {
          await page.mouse.up();
        }
        await saved();
        assert.deepEqual(await element('free'), original);
        assert.deepEqual(await selectedIds(), ['free']);
      }
      // A cancellation must also leave no delayed request after the 700 ms autosave interval.
      await new Promise((resolve) => setTimeout(resolve, 850));
      assert.equal(rendererTransactionRequests, beforeRequests);
      assert.equal((await api('/history')).length, beforeHistory);
      assert.equal(await fs.readFile(path.join(projectRoot, pagePaths[0]), 'utf8'), beforeBytes);
    },
  );

  await check(
    'arrow, Shift arrow and a rapid repeat burst accumulate without lost document units',
    async () => {
      const before = (await element('free')).bounds;
      await object('free').focus();
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('Shift+ArrowDown');
      await object('free').evaluate((node) => {
        for (let index = 0; index < 25; index++)
          node.dispatchEvent(
            new KeyboardEvent('keydown', {
              key: 'ArrowRight',
              code: 'ArrowRight',
              repeat: true,
              bubbles: true,
              cancelable: true,
            }),
          );
      });
      await persisted(
        'free',
        (item) => item?.bounds[0] === before[0] + 26 && item.bounds[1] === before[1] + 10,
      );
      await menu('撤销');
      await persisted('free', (item) => JSON.stringify(item?.bounds) === JSON.stringify(before));
      await menu('重做');
      await persisted('free', (item) => item?.bounds[0] === before[0] + 26);
      await menu('撤销');
      await persisted('free', (item) => JSON.stringify(item?.bounds) === JSON.stringify(before));
    },
  );

  await check(
    'a selected group moves each member once and document undo restores all bounds',
    async () => {
      const before = await disk();
      await object('group').focus();
      await page.keyboard.press('ArrowDown');
      await persisted('group', (item) => item?.bounds[1] === 181);
      for (const id of ['group', 'child-a', 'child-b'])
        assert.equal((await element(id)).bounds[1], 181);
      assert.deepEqual(
        (await element('free')).bounds,
        before.elements.find((item) => item.elementId === 'free').bounds,
      );
      await menu('撤销');
      await eventually(async () => JSON.stringify(await disk()) === JSON.stringify(before));
    },
  );

  await check(
    'native Edit Copy, Cut and Paste operate on objects and preserve a single undo boundary',
    async () => {
      await object('free').focus();
      await menu('复制');
      await eventually(
        async () =>
          JSON.parse(await application.evaluate(({ clipboard }) => clipboard.readText()))
            .selectedIds?.[0] === 'free',
      );
      const before = await disk();
      await menu('剪切');
      await persisted('free', (item) => !item);
      assert.equal(
        await page.evaluate(() => document.activeElement?.hasAttribute('data-hd-editor-canvas')),
        true,
      );
      await menu('粘贴');
      await eventually(async () => (await disk()).elements.length === before.elements.length);
      await saved();
      const pasted = (await disk()).elements.find(
        (item) => !before.elements.some((old) => old.elementId === item.elementId),
      );
      assert.equal(pasted.elementType, 'shape');
      assert.notEqual(pasted.elementId, 'free');
      await menu('撤销');
      await eventually(async () => (await disk()).elements.length === before.elements.length - 1);
      await saved();
      await menu('撤销');
      await eventually(async () => JSON.stringify(await disk()) === JSON.stringify(before));
      await saved();
    },
  );

  await check(
    'layer click returns focus for immediate nudge; layer arrows navigate instead of moving objects',
    async () => {
      const before = (await element('free')).bounds;
      await page.locator('[data-hd-layer="free"]').click();
      await eventually(async () => (await activeId()) === 'free');
      await page.keyboard.press('ArrowRight');
      await persisted('free', (item) => item?.bounds[0] === before[0] + 1);
      await menu('撤销');
      await persisted('free', (item) => item?.bounds[0] === before[0]);
      await page.locator('[data-hd-layer="free"]').focus();
      await page.keyboard.press('ArrowUp');
      assert.equal(
        await page.evaluate(() => document.activeElement?.getAttribute('data-hd-layer')),
        'child-a',
      );
      assert.deepEqual((await element('free')).bounds, before);
      await page.keyboard.press('Enter');
      assert.equal(await activeId(), 'child-a');
    },
  );

  await check(
    'native text commands stay in the inline editor and IME Enter/Esc never end a candidate',
    async () => {
      await object('title').focus();
      await page.keyboard.press('Enter');
      const inline = page.locator('[data-hd-inline-editor]');
      await inline.waitFor();
      await menu('全选');
      assert.equal(
        await inline.evaluate((node) => node.contains(window.getSelection()?.anchorNode)),
        true,
      );
      await application.evaluate(({ clipboard }) => clipboard.writeText('原生文字剪贴板'));
      await menu('粘贴');
      await eventually(async () => (await inline.innerText()) === '原生文字剪贴板');
      await menu('撤销');
      await eventually(async () => (await inline.innerText()) === '键盘验收 · 合成内容');
      await persisted('title', (item) => item?.content.text === '键盘验收 · 合成内容');
      await inline.evaluate((node) => {
        node.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true, data: '' }));
        node.textContent = '输入法候选';
        node.dispatchEvent(
          new InputEvent('input', {
            bubbles: true,
            inputType: 'insertCompositionText',
            data: '输入法候选',
            isComposing: true,
          }),
        );
        for (const key of ['Enter', 'Escape', 'Delete'])
          node.dispatchEvent(
            new KeyboardEvent('keydown', {
              key,
              keyCode: 229,
              isComposing: true,
              bubbles: true,
              cancelable: true,
            }),
          );
      });
      assert.equal(await inline.count(), 1);
      assert.equal((await element('title')).content.text, '键盘验收 · 合成内容');
      await inline.evaluate((node) => {
        node.textContent = '输入法完成';
        node.dispatchEvent(
          new CompositionEvent('compositionend', { bubbles: true, data: '输入法完成' }),
        );
      });
      await page.keyboard.press('Escape');
      await inline.waitFor({ state: 'detached' });
      await eventually(async () => (await activeId()) === 'title');
      await persisted('title', (item) => item?.content.text === '输入法完成');
    },
  );

  await check(
    'property Ctrl+S commits the active field; Escape cancels, and table Tab stays in input editing',
    async () => {
      await object('free').focus();
      const x = page.getByLabel('X', { exact: true });
      await x.fill('222');
      await page.keyboard.press(`${modifier}+s`);
      await persisted('free', (item) => item?.bounds[0] === 222);
      await x.fill('500');
      await x.press('Escape');
      assert.equal((await element('free')).bounds[0], 222);
      await object('table').focus();
      const cell = page.getByLabel('R1 C1', { exact: true });
      await cell.fill('单元格完成');
      await cell.press('ArrowLeft');
      assert.equal(await cell.evaluate((node) => node === document.activeElement), true);
      await cell.press('Tab');
      await persisted('table', (item) => item?.rows[0][0].text === '单元格完成');
      assert.equal(
        await page.evaluate(() => !!document.activeElement?.closest('[data-hd-inspector]')),
        true,
      );
      assert.deepEqual(
        (await element('table')).bounds,
        elements.find((item) => item.elementId === 'table').bounds,
      );
    },
  );

  await check(
    'F1 help protects the document and F6 skips hidden panels while collapse expands the canvas',
    async () => {
      await object('free').focus();
      const before = await disk();
      await page.keyboard.press('F1');
      await page.getByRole('dialog').waitFor();
      await page.keyboard.press('Delete');
      await page.keyboard.press('PageDown');
      assert.deepEqual(await disk(), before);
      await page.getByRole('button', { name: '返回编辑器', exact: true }).click();
      await page.getByRole('dialog').waitFor({ state: 'hidden' });
      const width = (await canvas().boundingBox()).width;
      await page.getByRole('button', { name: '收起项目导航', exact: true }).click();
      await page.getByRole('button', { name: '收起对象属性', exact: true }).click();
      await eventually(async () => (await canvas().boundingBox()).width > width + 200);
      await canvas().focus();
      await page.keyboard.press('F6');
      assert.equal(
        await page.evaluate(() => document.activeElement?.getClientRects().length > 0),
        true,
      );
      await page.getByRole('button', { name: '展开项目导航', exact: true }).click();
      await page.getByRole('button', { name: '展开对象属性', exact: true }).click();
    },
  );

  await check(
    'thumbnail arrows, Home/End and Enter use one Tab entry and reach the canvas',
    async () => {
      await mainPage();
      const first = page.locator(`[data-hd-thumbnail="${ids[0]}"]`);
      await first.focus();
      assert.equal(await page.locator('[data-hd-thumbnail][tabindex="0"]').count(), 1);
      await page.keyboard.press('ArrowDown');
      assert.equal(
        await page.evaluate(() => document.activeElement?.getAttribute('data-hd-thumbnail')),
        ids[1],
      );
      await page.keyboard.press('End');
      assert.equal(
        await page.evaluate(() => document.activeElement?.getAttribute('data-hd-thumbnail')),
        ids[2],
      );
      await page.keyboard.press('Home');
      assert.equal(
        await page.evaluate(() => document.activeElement?.getAttribute('data-hd-thumbnail')),
        ids[0],
      );
      await page.keyboard.press('Enter');
      assert.equal(
        await page.evaluate(() => document.activeElement?.hasAttribute('data-hd-editor-canvas')),
        true,
      );
      await page.keyboard.press('PageDown');
      await eventually(async () => new URL(page.url()).searchParams.get('page') === ids[1]);
      assert.equal(
        await page.evaluate(() => document.activeElement?.hasAttribute('data-hd-editor-canvas')),
        true,
      );
    },
  );

  await check(
    'repeated occurrences remain individually navigable and presentation Home/End use occurrence order',
    async () => {
      await page.getByLabel('当前演讲集合', { exact: true }).selectOption('repeat-talk');
      const view = await api('/presentations/repeat-talk');
      assert.deepEqual(
        view.pages.map((item) => item.pageId),
        [ids[0], ids[1], ids[0]],
      );
      await eventually(async () => (await page.locator('[data-hd-thumbnail]').count()) === 3);
      await page.locator(`[data-hd-thumbnail-key="${view.pages[0].occurrenceId}"]`).focus();
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('ArrowDown');
      assert.equal(new URL(page.url()).searchParams.get('occurrence'), view.pages[2].occurrenceId);
      await page.keyboard.press('Enter');
      await page.keyboard.press('Shift+F5');
      await page.locator('[data-hd-presenter]').waitFor();
      assert.equal(
        await page.evaluate(() => document.activeElement?.hasAttribute('data-hd-presenter')),
        true,
      );
      await page.keyboard.press('Home');
      await eventually(
        async () =>
          new URL(page.url()).searchParams.get('occurrence') === view.pages[0].occurrenceId,
      );
      await page.keyboard.press('End');
      await eventually(
        async () =>
          new URL(page.url()).searchParams.get('occurrence') === view.pages[2].occurrenceId,
      );
      await page.keyboard.press('Tab');
      assert.equal(
        await page.evaluate(() => !!document.activeElement?.closest('[data-hd-presenter]')),
        true,
      );
      await page.keyboard.press('Escape');
      await page.locator('[data-hd-presenter]').waitFor({ state: 'detached' });
    },
  );

  await check(
    'pinned pages remain copyable and PageDown still navigates while their content is read-only',
    async () => {
      await mainPage();
      await saved();
      const snapshot = await api('/session');
      const source = snapshot.pages.find((item) => item.pageId === ids[0]);
      const version = await api(`/pages/${ids[0]}/checkpoints`, {
        pageId: ids[0],
        requestId: randomUUID(),
        label: '键盘只读验收',
        expectedPageRevision: source.pageRevision,
        expectedMetadataRevision: snapshot.metadataRevision,
        actor: 'keyboard-v06-fixture',
      });
      const pinned = structuredClone(project);
      pinned.presentations[0].items.splice(1, 0, {
        id: 'pinned',
        kind: 'page',
        pageId: ids[0],
        versionId: version.versionId,
      });
      await postOperations([{ op: 'project.replace', project: pinned }]);
      await page.getByLabel('当前演讲集合', { exact: true }).selectOption('repeat-talk');
      const view = await api('/presentations/repeat-talk');
      await page.locator(`[data-hd-thumbnail-key="${view.pages[1].occurrenceId}"]`).click();
      await object('title').focus();
      const before = await disk();
      await page.keyboard.press('Delete');
      await page.keyboard.press('ArrowRight');
      await menu('复制');
      await eventually(
        async () =>
          JSON.parse(await application.evaluate(({ clipboard }) => clipboard.readText()))
            .selectedIds?.[0] === 'title',
      );
      assert.deepEqual(await disk(), before);
      await page.keyboard.press('PageDown');
      await eventually(
        async () =>
          new URL(page.url()).searchParams.get('occurrence') === view.pages[2].occurrenceId,
      );
    },
  );

  await check(
    'timeline F6, preview Undo/Redo and Escape coexist with native presentation scrubber keys',
    async () => {
      await mainPage();
      await saved();
      const before = (await element('title')).bounds;
      await postOperations([
        {
          op: 'page.timeline.set',
          pageId: ids[0],
          timeline: {
            schemaVersion: 1,
            durationMs: 1000,
            tracks: [
              {
                id: 'keyboard-title-x',
                targetId: 'title',
                property: 'x',
                keyframes: [
                  { id: 'keyboard-start', timeMs: 0, value: before[0], easing: 'linear' },
                  { id: 'keyboard-end', timeMs: 1000, value: before[0] + 80, easing: 'linear' },
                ],
              },
            ],
          },
        },
      ]);
      await page.getByRole('button', { name: '动画', exact: true }).click();
      await page.locator('[data-hd-timeline]').waitFor();
      await eventually(
        async () => (await page.getByLabel('时长（秒）', { exact: true }).inputValue()) === '1',
      );
      await canvas().focus();
      await page.keyboard.press('F6');
      assert.equal(
        await page.evaluate(() => !!document.activeElement?.closest('[data-hd-timeline]')),
        true,
      );
      await page.keyboard.press('ArrowRight');
      await eventually(
        async () =>
          (await page.getByLabel('动画播放头（毫秒）', { exact: true }).inputValue()) === '10',
      );
      assert.deepEqual((await element('title')).bounds, before);
      await page.locator('[data-hd-keyframe="keyboard-end"]').click();
      const position = page.getByLabel('位置', { exact: true });
      await position.fill(String(before[0] + 120));
      await position.press('Enter');
      await eventually(
        async () => (await disk()).timeline.tracks[0].keyframes[1].value === before[0] + 120,
      );
      await page.locator('[data-hd-timeline]').getByText('已保存', { exact: true }).waitFor();
      await eventually(
        async () => (await page.locator('[data-hd-save-status] .animate-spin').count()) === 0,
      );
      const stop = page.getByRole('button', { name: '停止并回到起点', exact: true });
      await stop.focus();
      await page.keyboard.press(`${modifier}+z`);
      await eventually(
        async () => (await disk()).timeline.tracks[0].keyframes[1].value === before[0] + 80,
      );
      await saved();
      await stop.focus();
      await page.keyboard.press(`${modifier}+Shift+z`);
      await eventually(
        async () => (await disk()).timeline.tracks[0].keyframes[1].value === before[0] + 120,
      );
      await saved();
      await stop.focus();
      await page.keyboard.press(`${modifier}+z`);
      await eventually(
        async () => (await disk()).timeline.tracks[0].keyframes[1].value === before[0] + 80,
      );
      await saved();
      await page.getByRole('button', { name: '预览动画', exact: true }).click();
      await stop.focus();
      await page.keyboard.press('Escape');
      await page.getByRole('button', { name: '预览动画', exact: true }).waitFor();
      await eventually(
        async () =>
          (await canvas().locator('[data-pptd-page]').getAttribute('data-hd-animation-time-ms')) ===
          null,
      );
      assert.deepEqual((await element('title')).bounds, before);
      await page.getByRole('button', { name: '动画', exact: true }).click();
      await page.locator('[data-hd-timeline]').waitFor({ state: 'detached' });
      await object('title').focus();
      await page.keyboard.press('F5');
      await page.locator('[data-hd-presenter-timeline]').waitFor();
      const range = page.getByLabel('放映动画时间', { exact: true });
      let reachedRange = false;
      for (let index = 0; index < 8; index++) {
        await page.keyboard.press('Tab');
        assert.equal(
          await page.evaluate(() => !!document.activeElement?.closest('[data-hd-presenter]')),
          true,
        );
        if (await range.evaluate((node) => document.activeElement === node)) {
          reachedRange = true;
          break;
        }
      }
      assert.equal(
        reachedRange,
        true,
        'Every visible presentation control must be reachable by Tab.',
      );
      await page.keyboard.press('End');
      assert.equal(await range.inputValue(), '1000');
      assert.equal(new URL(page.url()).searchParams.get('page'), ids[0]);
      await page.keyboard.press('Escape');
      await page.locator('[data-hd-presenter]').waitFor({ state: 'detached' });
      assert.deepEqual((await element('title')).bounds, before);
    },
  );

  await check(
    'removing a focused object externally restores the canvas without moving other content',
    async () => {
      await mainPage();
      await object('free').focus();
      await postOperations([{ op: 'element.remove', pageId: ids[0], elementId: 'free' }]);
      await object('free').waitFor({ state: 'detached' });
      await eventually(
        async () =>
          await page.evaluate(() => document.activeElement?.hasAttribute('data-hd-editor-canvas')),
      );
      assert.deepEqual(await selectedIds(), []);
    },
  );

  assert.deepEqual(rendererErrors, []);
  await saved();
  await page.screenshot({ path: path.join(evidence, 'keyboard-v06.png'), animations: 'disabled' });
  const exited = new Promise((resolve) =>
    application.process().once('exit', (code, signal) => resolve({ code, signal })),
  );
  await application.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].close());
  normalExit = await Promise.race([
    exited,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Candidate did not close normally.')), 20000),
    ),
  ]);
  assert.deepEqual(normalExit, { code: 0, signal: null });
  application = undefined;
  const report = {
    passed: true,
    timestamp: new Date().toISOString(),
    executablePath,
    electronVersion,
    sandbox,
    entry,
    syntheticOnly: true,
    checks,
    rendererErrors,
    normalExit,
  };
  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} catch (error) {
  await page
    ?.screenshot({ path: path.join(evidence, 'keyboard-v06-failure.png'), timeout: 10000 })
    .catch(() => {});
  const report = {
    passed: false,
    timestamp: new Date().toISOString(),
    executablePath,
    electronVersion,
    sandbox,
    entry,
    syntheticOnly: true,
    checks,
    rendererErrors,
    normalExit,
    error: error.stack ?? String(error),
    processLog: processLog.join('').slice(-12000),
  };
  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  process.stderr.write(`${JSON.stringify(report, null, 2)}\n`);
  process.exitCode = 1;
} finally {
  await application?.close().catch(() => {});
  await fs.writeFile(path.join(evidence, 'keyboard-v06-process.log'), processLog.join(''));
}
