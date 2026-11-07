// biome-ignore-all lint/suspicious/noUndeclaredEnvVars: The isolated acceptance process selects its candidate executable, profile and runtime.
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
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
const sandbox = await fs.mkdtemp(path.join(os.tmpdir(), 'huandeng-builds-v08-'));
const projectRoot = path.join(sandbox, 'synthetic-project');
const entry = path.join(projectRoot, 'deck.pptd');
const evidence = path.join(root, '.verification');
const reportPath = path.join(evidence, 'builds-v08.json');
const ids = [randomUUID(), randomUUID(), randomUUID(), randomUUID()];
const pagePaths = [
  'pages/builds.page',
  'pages/legacy.page',
  'pages/future.page',
  'pages/untouched.page',
];
const emptyStory = { purpose: '', audience: '', takeaway: '' };
const project = {
  schemaVersion: 1,
  mainStory: emptyStory,
  sections: [],
  presentations: [
    {
      id: 'repeat-talk',
      title: '步骤编排验收',
      story: emptyStory,
      items: [
        { id: 'opening', kind: 'page', pageId: ids[0] },
        { id: 'middle', kind: 'page', pageId: ids[3] },
        { id: 'return', kind: 'page', pageId: ids[0], notes: '返回同一主页面。' },
      ],
    },
  ],
};
const elements = [
  {
    elementId: 'title',
    elementType: 'text',
    bounds: [60, 50, 840, 65],
    content: { text: '一页内容，逐步讲清', fontSize: 32 },
  },
  {
    elementId: 'figure-a',
    elementType: 'shape',
    name: 'Figure A',
    shapeName: 'rect',
    bounds: [80, 180, 220, 160],
    fill: { type: 'solid', color: '#527f6e' },
  },
  {
    elementId: 'figure-b',
    elementType: 'shape',
    name: 'Figure B',
    shapeName: 'rect',
    bounds: [550, 180, 220, 160],
    fill: { type: 'solid', color: '#a6c7b7' },
  },
  {
    elementId: 'arrow',
    elementType: 'shape',
    name: '关键区域',
    shapeName: 'ellipse',
    bounds: [385, 230, 60, 60],
    fill: { type: 'solid', color: '#c99a48' },
  },
];
const legacy = {
  schemaVersion: 1,
  durationMs: 1000,
  tracks: [
    {
      id: 'legacy-x',
      targetId: 'figure-a',
      property: 'x',
      keyframes: [
        { id: 'legacy-start', timeMs: 0, value: 80, easing: 'linear' },
        { id: 'legacy-end', timeMs: 1000, value: 160, easing: 'linear' },
      ],
    },
  ],
  cues: [{ id: 'legacy-cue', timeMs: 500, label: '旧演讲步骤' }],
};
await fs.mkdir(path.join(projectRoot, 'pages'), { recursive: true });
await fs.mkdir(path.join(projectRoot, '.huandeng'), { recursive: true });
await fs.mkdir(evidence, { recursive: true });
await fs.writeFile(
  entry,
  YAML.stringify({ title: 'HUANDENG 点击步骤与草稿验收', size: [960, 540], pages: pagePaths }),
);
for (const [index, file] of pagePaths.entries()) {
  await fs.writeFile(
    path.join(projectRoot, file),
    YAML.stringify({
      elements: structuredClone(elements),
      notes: `合成验收页 ${index + 1}`,
      buildFixture: true,
      ...(index === 1
        ? { timeline: legacy }
        : index === 2
          ? { timeline: { schemaVersion: 99, opaque: { keep: ['future', 'data'] } } }
          : {}),
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
      project,
      slides: Object.fromEntries(
        ids.map((id, index) => [
          id,
          {
            shortCode: ['B8AA', 'B8BB', 'B8CC', 'B8DD'][index],
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
const originals = await Promise.all(
  pagePaths.map((file) => fs.readFile(path.join(projectRoot, file), 'utf8')),
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
const mutations = [];
const screenshots = [];
const layouts = [];
const exits = [];
const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
let application;
let page;
let serviceUrl;
let sessionToken;
let electronVersion;
let buildIdentity;

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
  throw last ?? new Error('Timed out waiting for build authoring acceptance state.');
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
    signal: AbortSignal.timeout(15000),
  });
  const result = await response.json();
  assert.ok(response.ok && result.ok !== false, `${route}: ${JSON.stringify(result)}`);
  return result;
}
const canvas = () => page.locator('[data-hd-editor-canvas]');
const wrapper = () => page.locator('[data-hd-animation-panel]');
const builds = () => page.locator('[data-hd-builds]');
const timeline = () => page.locator('[data-hd-timeline]');
const object = (id) => canvas().locator(`[data-hd-element-id="${id}"]`);
const source = (index = 0) => fs.readFile(path.join(projectRoot, pagePaths[index]), 'utf8');
const disk = async (index = 0) => YAML.parse(await source(index));
async function saved() {
  await eventually(async () =>
    (await page.locator('[data-hd-save-status]').innerText()).includes('已保存'),
  );
  if (await wrapper().count())
    await eventually(
      async () =>
        !(await wrapper().getByText('保存中…', { exact: true }).count()) &&
        !(await wrapper().getByText('未保存', { exact: true }).count()),
    );
}
async function persisted(predicate, index = 0) {
  await eventually(async () => predicate(await disk(index)));
  await saved();
  assert.deepEqual((await api(`/pages/${ids[index]}`)).data, await disk(index));
}
async function capture(name) {
  await page.screenshot({ path: path.join(evidence, name), animations: 'disabled' });
  screenshots.push(name);
}
async function animation(open) {
  const button = page.getByRole('button', { name: '动画', exact: true });
  if ((await button.getAttribute('aria-expanded')) !== String(open)) await button.click();
  await wrapper().waitFor({ state: open ? 'visible' : 'detached' });
}
async function baseMode() {
  if (await wrapper().count()) {
    const button = wrapper().getByRole('button', { name: '返回编辑', exact: true });
    if (await button.count()) await button.click();
  }
  await eventually(async () => !(await canvas().locator('[data-hd-animation-time-ms]').count()));
}
async function mainPage(index = 0) {
  await baseMode();
  if (await wrapper().count()) await animation(false);
  await page.getByLabel('当前演讲集合', { exact: true }).selectOption('');
  await page.getByRole('button', { name: '页面缩略图', exact: true }).click();
  await page.locator(`[data-hd-thumbnail="${ids[index]}"]`).click();
  await eventually(
    async () =>
      (await canvas().locator('[data-pptd-page]').getAttribute('data-pptd-page')) === ids[index],
  );
}
async function field(label, value, scope = builds()) {
  const input = scope.getByLabel(label, { exact: true });
  await input.fill(String(value));
  await input.press('Enter');
  await saved();
}
async function selectEffect(id) {
  await builds().locator(`[data-hd-build-effect="${id}"]`).click();
  await eventually(
    async () =>
      (await builds().locator(`[data-hd-build-effect="${id}"]`).getAttribute('aria-pressed')) ===
      'true',
  );
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
async function postOperations(operations) {
  const snapshot = await api('/session');
  return api('/transactions', {
    requestId: randomUUID(),
    deckId: snapshot.deckId,
    actor: 'builds-v08-fixture',
    originClientId: 'builds-v08-fixture',
    expected: {
      manifest: snapshot.manifestRevision,
      metadata: snapshot.metadataRevision,
      pages: Object.fromEntries(snapshot.pages.map((item) => [item.pageId, item.pageRevision])),
    },
    operations,
  });
}
async function restoreSource(value, index = 0) {
  await fs.writeFile(path.join(projectRoot, pagePaths[index]), value);
  await eventually(
    async () =>
      JSON.stringify((await api(`/pages/${ids[index]}`)).data) ===
      JSON.stringify(YAML.parse(value)),
  );
}
async function launch() {
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
      mutations.push({ route: new URL(request.url()).pathname, at: Date.now() });
  });
  await canvas().waitFor({ timeout: 120000 });
  const context = await page.evaluate(() => window.huandengDesktop.getContext());
  assert.equal(path.resolve(context.entryPath).toLowerCase(), path.resolve(entry).toLowerCase());
  serviceUrl = context.serviceUrl;
  sessionToken = (await api('/session')).sessionToken;
  electronVersion = await application.evaluate(() => process.versions.electron);
  buildIdentity = await fs
    .readFile(path.join(path.dirname(executablePath), 'huandeng-build.json'), 'utf8')
    .then((value) => JSON.parse(value.replace(/^\uFEFF/, '')))
    .catch(() => null);
  await application.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()[0].setContentSize(1600, 1000),
  );
}
async function closeNormally() {
  await saved();
  const exited = new Promise((resolve) =>
    application.process().once('exit', (code, signal) => resolve({ code, signal })),
  );
  await application.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].close());
  const exit = await Promise.race([
    exited,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Candidate did not close normally.')), 20000),
    ),
  ]);
  exits.push(exit);
  assert.deepEqual(exit, { code: 0, signal: null });
  application = undefined;
}

try {
  await launch();
  await mainPage();
  assert.equal((await api('/session')).writable, true);
  await animation(true);

  await check(
    'new pages create a useful fade-in through object/effect controls without hand-made keyframes',
    async () => {
      await builds().waitFor();
      assert.equal(await timeline().count(), 0);
      await builds().getByLabel('添加动画的对象', { exact: true }).selectOption('figure-a');
      await builds().getByRole('button', { name: '添加效果', exact: true }).click();
      await persisted(
        (data) => data.timeline?.schemaVersion === 2 && data.timeline.effects.length === 1,
      );
      const effect = (await disk()).timeline.effects[0];
      assert.equal(effect.kind, 'fade-in');
      assert.equal(effect.targetId, 'figure-a');
      assert.equal(effect.trigger, 'click');
      assert.equal(effect.durationMs, 400);
      assert.deepEqual((await disk()).elements, elements);
      assert.equal('tracks' in (await disk()).timeline, false);
    },
  );

  await check(
    'multi-selection adds simultaneous effects and after-previous remains in the same click group',
    async () => {
      await object('figure-a').click();
      await object('figure-b').click({ modifiers: ['Shift'] });
      await eventually(
        async () =>
          (await builds().getByLabel('添加动画的对象', { exact: true }).inputValue()) ===
          '__huandeng_selection__',
      );
      await builds().getByLabel('添加的动画效果', { exact: true }).selectOption('pulse');
      await builds().getByRole('button', { name: '添加效果', exact: true }).click();
      await persisted((data) => data.timeline.effects.length === 3);
      const effects = (await disk()).timeline.effects;
      assert.deepEqual(
        effects.slice(1).map((effect) => effect.trigger),
        ['click', 'with-previous'],
      );
      assert.deepEqual(
        new Set(effects.slice(1).map((effect) => effect.targetId)),
        new Set(['figure-a', 'figure-b']),
      );
      assert.equal(await builds().locator('[data-hd-build-step]').count(), 2);
      await selectEffect(effects[2].id);
      await builds().getByLabel('效果触发方式', { exact: true }).selectOption('after-previous');
      await persisted((data) => data.timeline.effects[2].trigger === 'after-previous');
      assert.equal(await builds().locator('[data-hd-build-step]').count(), 2);
    },
  );

  await check(
    'whole-click groups reorder and deleting their head preserves the remaining click with Undo',
    async () => {
      const before = (await disk()).timeline;
      await builds().getByRole('button', { name: '步骤 2 上移', exact: true }).click();
      await persisted((data) => data.timeline.effects[0].id === before.effects[1].id);
      assert.deepEqual(
        (await disk()).timeline.effects.map((effect) => effect.id),
        [before.effects[1].id, before.effects[2].id, before.effects[0].id],
      );
      await builds().getByRole('button', { name: '步骤 1 下移', exact: true }).click();
      await persisted((data) => data.timeline.effects[0].id === before.effects[0].id);
      await selectEffect(before.effects[1].id);
      const row = builds()
        .locator(`[data-hd-build-effect="${before.effects[1].id}"]`)
        .locator('..');
      await row.getByRole('button', { name: /^删除效果：/ }).click();
      await persisted((data) => data.timeline.effects.length === 2);
      assert.equal((await disk()).timeline.effects[1].trigger, 'click');
      await menu('撤销');
      await persisted((data) => data.timeline.effects.length === 3);
      assert.deepEqual((await disk()).timeline, before);
    },
  );

  await check(
    'effect parameters preserve exact milliseconds and reject invalid precision without a write',
    async () => {
      const first = (await disk()).timeline.effects[0];
      await selectEffect(first.id);
      await field('效果时长（秒）', '1.25');
      await field('延迟（秒）', '0.075');
      await field('效果名称', '展示 Figure A');
      assert.equal((await disk()).timeline.effects[0].durationMs, 1250);
      assert.equal((await disk()).timeline.effects[0].delayMs, 75);
      const before = await source();
      const input = builds().getByLabel('效果时长（秒）', { exact: true });
      await input.fill('0.0001');
      await input.press('Enter');
      await eventually(async () => (await input.getAttribute('aria-invalid')) === 'true');
      assert.equal(await source(), before);
      await input.press('Escape');
      await saved();
      assert.equal(await input.inputValue(), '1.25');
      assert.equal(await source(), before);
    },
  );

  await check(
    'move effects use explicit displacement and instant effects retain zero duration',
    async () => {
      await builds().getByLabel('添加动画的对象', { exact: true }).selectOption('figure-b');
      await builds().getByLabel('添加的动画效果', { exact: true }).selectOption('move');
      await builds().getByRole('button', { name: '添加效果', exact: true }).click();
      await persisted((data) => data.timeline.effects.length === 4);
      await field('水平移动', '120');
      await field('垂直移动', '-30');
      assert.equal((await disk()).timeline.effects.at(-1).dx, 120);
      assert.equal((await disk()).timeline.effects.at(-1).dy, -30);
      await builds().getByLabel('添加动画的对象', { exact: true }).selectOption('arrow');
      await builds().getByLabel('添加的动画效果', { exact: true }).selectOption('appear');
      await builds().getByRole('button', { name: '添加效果', exact: true }).click();
      await persisted((data) => data.timeline.effects.length === 5);
      assert.equal((await disk()).timeline.effects.at(-1).durationMs, 0);
      assert.equal(await builds().getByLabel('效果时长（秒）', { exact: true }).count(), 0);
      assert.deepEqual((await disk()).elements, elements);
    },
  );

  await check(
    'step rehearsal starts hidden, advances by click and keyboard, and never writes the base layout',
    async () => {
      const before = await source();
      const mutationCount = mutations.length;
      await builds().getByRole('button', { name: '逐步预演', exact: true }).click();
      await eventually(
        async () =>
          (await object('figure-a').evaluate((node) => getComputedStyle(node).opacity)) === '0',
      );
      await builds().getByRole('button', { name: '预演下一步', exact: true }).click();
      await eventually(
        async () =>
          (await object('figure-a').evaluate((node) => getComputedStyle(node).opacity)) === '1',
      );
      await builds().getByRole('button', { name: '预演回到开场', exact: true }).click();
      await builds().focus();
      await page.keyboard.press('Enter');
      await page.keyboard.press('Enter');
      await eventually(
        async () =>
          (await object('figure-a').evaluate((node) => getComputedStyle(node).opacity)) === '1',
      );
      await page.keyboard.press('ArrowLeft');
      await eventually(
        async () =>
          (await object('figure-a').evaluate((node) => getComputedStyle(node).opacity)) === '0',
      );
      await capture('builds-v08-preview-1600.png');
      await baseMode();
      assert.equal(
        await object('figure-a').evaluate((node) => getComputedStyle(node).left),
        '80px',
      );
      assert.equal(await source(), before);
      assert.equal(mutations.length, mutationCount);
    },
  );

  await check(
    'page fade is saved independently from object effects with exact seconds',
    async () => {
      const animationBefore = (await disk()).timeline;
      const transition = page.locator('[data-hd-transition-editor]');
      await transition.getByLabel('换页效果', { exact: true }).selectOption('fade');
      await persisted((data) => data.transition?.kind === 'fade');
      await field('换页时长（秒）', '1.25', transition);
      await persisted((data) => data.transition.durationMs === 1250);
      assert.deepEqual((await disk()).timeline, animationBefore);
      await transition.getByLabel('换页效果', { exact: true }).selectOption('none');
      await persisted(
        (data) => data.transition.kind === 'none' && data.transition.durationMs === 0,
      );
      await transition.getByLabel('换页效果', { exact: true }).selectOption('fade');
      await persisted((data) => data.transition.kind === 'fade');
    },
  );

  await check(
    'a v1 document arriving during a dirty v2 input keeps the correct editor and recoverable draft',
    async () => {
      const before = await source();
      const authored = (await disk()).timeline;
      await selectEffect(authored.effects[0].id);
      const input = builds().getByLabel('效果时长（秒）', { exact: true });
      await input.fill('0');
      await input.press('Enter');
      await eventually(async () => (await input.getAttribute('aria-invalid')) === 'true');
      const external = YAML.stringify({ ...(await disk()), timeline: legacy });
      await restoreSource(external);
      await eventually(async () => await input.isDisabled());
      assert.equal(await wrapper().getAttribute('data-hd-animation-panel'), 'builds');
      assert.equal(await timeline().count(), 0);
      assert.equal(await input.inputValue(), '0');
      await builds().getByRole('button', { name: '复制动画草稿', exact: true }).click();
      const copied = await eventually(async () => {
        const payload = JSON.parse(
          await application.evaluate(({ clipboard }) => clipboard.readText()),
        );
        return payload.pendingInputs?.['效果时长（秒）'] === '0' ? payload : false;
      });
      assert.deepEqual(copied.timeline, authored);
      assert.equal(await source(), external);
      await builds().getByRole('button', { name: '还原已保存', exact: true }).click();
      await timeline().waitFor();
      assert.equal(await builds().count(), 0);
      await restoreSource(before);
      await builds().waitFor();
      await saved();
    },
  );

  await check(
    'a future schema preserves pending step input and cannot be overwritten',
    async () => {
      const before = await source();
      const authored = (await disk()).timeline;
      await selectEffect(authored.effects[0].id);
      const input = builds().getByLabel('效果时长（秒）', { exact: true });
      await input.fill('0');
      await input.press('Enter');
      await eventually(async () => (await input.getAttribute('aria-invalid')) === 'true');
      const external = YAML.stringify({
        ...(await disk()),
        timeline: { schemaVersion: 99, opaque: { external: true } },
      });
      await restoreSource(external);
      await eventually(async () => await input.isDisabled());
      assert.equal(await input.inputValue(), '0');
      await builds().getByRole('button', { name: '复制动画草稿', exact: true }).click();
      const copied = await eventually(async () => {
        const payload = JSON.parse(
          await application.evaluate(({ clipboard }) => clipboard.readText()),
        );
        return payload.pendingInputs?.['效果时长（秒）'] === '0' ? payload : false;
      });
      assert.deepEqual(copied.timeline, authored);
      assert.equal(await source(), external);
      await restoreSource(before);
      await builds().getByRole('button', { name: '还原已保存', exact: true }).click();
      await saved();
    },
  );

  await check(
    'dirty page-transition input prevents an external schema switch from unmounting its field',
    async () => {
      const before = await source();
      const transition = page.locator('[data-hd-transition-editor]');
      const input = transition.getByLabel('换页时长（秒）', { exact: true });
      await input.fill('0');
      await input.press('Enter');
      await eventually(async () => (await input.getAttribute('aria-invalid')) === 'true');
      const external = YAML.stringify({ ...(await disk()), timeline: legacy });
      await restoreSource(external);
      await eventually(async () => await input.isDisabled());
      assert.equal(await wrapper().getAttribute('data-hd-animation-panel'), 'builds');
      assert.equal(await input.inputValue(), '0');
      await transition.getByRole('button', { name: '复制换页草稿', exact: true }).click();
      const copied = await eventually(async () => {
        const payload = JSON.parse(
          await application.evaluate(({ clipboard }) => clipboard.readText()),
        );
        return payload.pendingInputs?.['换页时长（秒）'] === '0' ? payload : false;
      });
      assert.deepEqual(copied.transition, YAML.parse(before).transition);
      assert.equal(await source(), external);
      await transition.getByRole('button', { name: '还原换页', exact: true }).click();
      await timeline().waitFor();
      await restoreSource(before);
      await builds().waitFor();
      await saved();
    },
  );

  await check(
    'explicit conversion writes one keyframe model and Undo restores the authored effects',
    async () => {
      const before = await disk();
      await builds().getByRole('button', { name: '改用高级时间线', exact: true }).click();
      const dialog = page.getByRole('dialog');
      await dialog.getByRole('button', { name: '转换为关键帧', exact: true }).click();
      await timeline().waitFor();
      await persisted((data) => data.timeline.schemaVersion === 1);
      assert.ok((await disk()).timeline.tracks.length > 0);
      assert.equal('effects' in (await disk()).timeline, false);
      assert.deepEqual((await disk()).elements, before.elements);
      await menu('撤销');
      await builds().waitFor();
      await persisted((data) => data.timeline.schemaVersion === 2);
      assert.deepEqual((await disk()).timeline, before.timeline);
      assert.deepEqual((await disk()).transition, before.transition);
    },
  );

  await check(
    'v1 unconfirmed input survives an external v2 document until an explicit reset',
    async () => {
      const authored = (await disk()).timeline;
      await mainPage(1);
      await animation(true);
      await timeline().waitFor();
      await timeline().locator('[data-hd-keyframe="legacy-end"]').click();
      const input = timeline().getByLabel('时间（秒）', { exact: true });
      await input.fill('0');
      await input.press('Enter');
      await eventually(async () => (await input.getAttribute('aria-invalid')) === 'true');
      const external = YAML.stringify({ ...YAML.parse(originals[1]), timeline: authored });
      await restoreSource(external, 1);
      await eventually(async () => await input.isDisabled());
      assert.equal(await wrapper().getAttribute('data-hd-animation-panel'), 'timeline');
      assert.equal(await input.inputValue(), '0');
      await timeline().getByRole('button', { name: '复制动画草稿', exact: true }).click();
      const copied = await eventually(async () => {
        const payload = JSON.parse(
          await application.evaluate(({ clipboard }) => clipboard.readText()),
        );
        return payload.pendingInputs?.['时间（秒）'] === '0' ? payload : false;
      });
      assert.deepEqual(copied.timeline, legacy);
      assert.equal(await source(1), external);
      await timeline().getByRole('button', { name: '还原已保存', exact: true }).click();
      await builds().waitFor();
      await restoreSource(originals[1], 1);
      await timeline().waitFor();
      await saved();
      await mainPage();
      await animation(true);
    },
  );

  await check(
    'copying and deleting an animated object keeps its effect references consistent through Undo',
    async () => {
      await baseMode();
      await object('figure-a').click();
      const before = await disk();
      await page.keyboard.press(`${modifier}+d`);
      await persisted((data) => data.elements.length === before.elements.length + 1);
      const copy = (await disk()).elements.find(
        (element) => !before.elements.some((old) => old.elementId === element.elementId),
      );
      assert.ok(copy);
      const copiedEffects = (await disk()).timeline.effects.filter(
        (effect) => effect.targetId === copy.elementId,
      );
      assert.equal(
        copiedEffects.length,
        before.timeline.effects.filter((effect) => effect.targetId === 'figure-a').length,
      );
      await object(copy.elementId).focus();
      await page.keyboard.press('Delete');
      await persisted((data) => data.elements.length === before.elements.length);
      assert.equal(
        (await disk()).timeline.effects.some((effect) => effect.targetId === copy.elementId),
        false,
      );
      await menu('撤销');
      await persisted((data) => data.elements.length === before.elements.length + 1);
      assert.deepEqual(
        (await disk()).timeline.effects.filter((effect) => effect.targetId === copy.elementId),
        copiedEffects,
      );
      await menu('重做');
      await persisted((data) => data.elements.length === before.elements.length);
    },
  );

  await check(
    'compact rehearsal keeps a 260px fit canvas and restores hidden authoring fields without losing a draft',
    async () => {
      await baseMode();
      const firstEffect = (await disk()).timeline.effects[0];
      await selectEffect(firstEffect.id);
      const durationBefore = await builds()
        .getByLabel('效果时长（秒）', { exact: true })
        .inputValue();
      await builds().getByRole('button', { name: '展开步骤面板', exact: true }).click();
      const sourceBefore = await source();
      const transitionInput = page
        .locator('[data-hd-transition-editor]')
        .getByLabel('换页时长（秒）', { exact: true });
      await transitionInput.fill('0');
      await transitionInput.press('Enter');
      await eventually(async () => (await transitionInput.getAttribute('aria-invalid')) === 'true');
      await builds().getByRole('button', { name: '逐步预演', exact: true }).click();
      await page.locator('[data-hd-build-preview-navigation]').waitFor();
      await eventually(async () => !(await transitionInput.isVisible()));
      assert.equal(await transitionInput.count(), 1);
      assert.equal(await transitionInput.inputValue(), '0');
      await baseMode();
      await transitionInput.waitFor({ state: 'visible' });
      assert.equal(await transitionInput.inputValue(), '0');
      assert.equal(await transitionInput.getAttribute('aria-invalid'), 'true');
      await transitionInput.press('Escape');
      await saved();
      assert.equal(await source(), sourceBefore);
      await page.getByRole('button', { name: /^(切换主题|Toggle theme)$/ }).click();
      await page.getByRole('menuitem', { name: /^(深色|Dark)$/ }).click();
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await builds().getByRole('button', { name: '逐步预演', exact: true }).click();
      await eventually(
        async () => !(await page.locator('[data-hd-transition-editor]').isVisible()),
      );
      assert.equal(await builds().getByLabel('添加动画的对象', { exact: true }).isVisible(), false);
      assert.equal(await builds().getByLabel('效果时长（秒）', { exact: true }).isVisible(), false);
      assert.equal(await builds().getByLabel('效果时长（秒）', { exact: true }).count(), 1);
      assert.equal(
        await builds().getByRole('button', { name: '改用高级时间线', exact: true }).count(),
        0,
      );
      await builds().locator('[data-hd-build-preview-stop]').last().click();
      await eventually(
        async () =>
          (await object('arrow').evaluate((node) => getComputedStyle(node).opacity)) === '1',
      );
      await builds().getByRole('button', { name: '预演定位：开场画面', exact: true }).click();
      await eventually(
        async () =>
          (await object('arrow').evaluate((node) => getComputedStyle(node).opacity)) === '0',
      );
      for (const [width, height] of [
        [1280, 800],
        [1040, 680],
      ]) {
        await application.evaluate(
          ({ BrowserWindow }, size) => BrowserWindow.getAllWindows()[0].setContentSize(...size),
          [width, height],
        );
        await page.waitForFunction(
          ([w, h]) => innerWidth === w && innerHeight === h,
          [width, height],
        );
        if (width === 1040)
          await eventually(
            async () => (await canvas().locator('[data-osd-canvas]').boundingBox())?.height >= 260,
          );
        const layout = await page.evaluate(() => {
          const bounds = (selector) => {
            const rect = document.querySelector(selector)?.getBoundingClientRect();
            return rect
              ? {
                  x: rect.x,
                  y: rect.y,
                  width: rect.width,
                  height: rect.height,
                  right: rect.right,
                  bottom: rect.bottom,
                }
              : null;
          };
          return {
            width: innerWidth,
            height: innerHeight,
            documentWidth: document.documentElement.scrollWidth,
            panel: bounds('[data-hd-animation-panel]'),
            viewport: bounds('[data-hd-canvas-viewport]'),
            canvas: bounds('[data-hd-editor-canvas] [data-osd-canvas]'),
            dpr: devicePixelRatio,
          };
        });
        assert.ok(layout.panel && layout.viewport && layout.canvas);
        assert.ok(layout.documentWidth <= width + 1);
        assert.ok(layout.panel.bottom <= height + 1);
        if (width === 1040)
          assert.ok(
            layout.canvas.height >= 260,
            `Preview canvas is only ${layout.canvas.height}px high.`,
          );
        assert.ok(
          layout.canvas.y >= layout.viewport.y - 1 &&
            layout.canvas.bottom <= layout.viewport.bottom + 1,
        );
        assert.ok(
          layout.canvas.x >= layout.viewport.x - 1 &&
            layout.canvas.right <= layout.viewport.right + 1,
        );
        layouts.push(layout);
        await capture(`builds-v08-dark-${width}.png`);
      }
      await baseMode();
      assert.equal(
        await builds()
          .locator(`[data-hd-build-effect="${firstEffect.id}"]`)
          .getAttribute('aria-pressed'),
        'true',
      );
      assert.equal(
        await builds().getByLabel('效果时长（秒）', { exact: true }).inputValue(),
        durationBefore,
      );
      assert.equal(
        await builds()
          .getByRole('button', { name: '收拢步骤面板', exact: true })
          .getAttribute('aria-expanded'),
        'true',
      );
      assert.equal(await page.locator('[data-hd-transition-editor]').isVisible(), true);
      assert.equal(await source(), sourceBefore);
      await capture('builds-v08-authoring-restored-1040.png');
      await builds().getByRole('button', { name: '收拢步骤面板', exact: true }).click();
      await application.evaluate(({ BrowserWindow }) =>
        BrowserWindow.getAllWindows()[0].setContentSize(1600, 1000),
      );
      await page.emulateMedia({ reducedMotion: 'no-preference' });
    },
  );

  await check(
    'pinned versions expose their authored steps and page fade as read-only while rehearsal stays available',
    async () => {
      await baseMode();
      const snapshot = await api('/session');
      const sourcePage = snapshot.pages.find((item) => item.pageId === ids[0]);
      const checkpoint = await api(`/pages/${ids[0]}/checkpoints`, {
        pageId: ids[0],
        requestId: randomUUID(),
        label: '点击步骤版本',
        expectedPageRevision: sourcePage.pageRevision,
        expectedMetadataRevision: snapshot.metadataRevision,
        actor: 'builds-v08-fixture',
      });
      const pinned = structuredClone(project);
      pinned.presentations.push({
        id: 'pinned-talk',
        title: '固定步骤版本',
        story: emptyStory,
        items: [{ id: 'pinned', kind: 'page', pageId: ids[0], versionId: checkpoint.versionId }],
      });
      await postOperations([{ op: 'project.replace', project: pinned }]);
      await animation(false);
      await page.getByLabel('当前演讲集合', { exact: true }).selectOption('pinned-talk');
      const view = await api('/presentations/pinned-talk');
      await page.locator(`[data-hd-thumbnail-key="${view.pages[0].occurrenceId}"]`).click();
      await animation(true);
      await builds().waitFor();
      assert.equal(
        await builds().getByRole('button', { name: '添加效果', exact: true }).isDisabled(),
        true,
      );
      assert.equal(await page.getByLabel('换页效果', { exact: true }).isDisabled(), true);
      const before = await source();
      await builds().getByRole('button', { name: '逐步预演', exact: true }).click();
      await builds().getByRole('button', { name: '预演下一步', exact: true }).click();
      await eventually(
        async () =>
          (await object('figure-a').evaluate((node) => getComputedStyle(node).opacity)) === '1',
      );
      await baseMode();
      assert.equal(await source(), before);
      await mainPage();
    },
  );

  await check('normal close and reopen preserve the authored model and transition', async () => {
    const before = await source();
    await closeNormally();
    await launch();
    await mainPage();
    await animation(true);
    await builds().waitFor();
    assert.equal(await source(), before);
    assert.equal(
      await builds().locator('[data-hd-build-effect]').count(),
      (await disk()).timeline.effects.length,
    );
    assert.equal(await page.getByLabel('换页效果', { exact: true }).inputValue(), 'fade');
    await saved();
  });

  await mainPage(2);
  await animation(true);
  await builds().waitFor();
  assert.equal(
    await builds().getByRole('button', { name: '添加效果', exact: true }).isDisabled(),
    true,
  );
  assert.equal(await source(2), originals[2]);
  await mainPage();
  assert.deepEqual(rendererErrors, []);
  for (const index of [1, 2, 3]) assert.equal(await source(index), originals[index]);
  await closeNormally();
  const report = {
    passed: true,
    timestamp: new Date().toISOString(),
    executablePath,
    buildIdentity,
    electronVersion,
    sandbox,
    entry,
    syntheticOnly: true,
    checks,
    rendererErrors,
    normalExits: exits,
    screenshots,
    layouts,
    mutationCount: mutations.length,
    unchangedSiblingSha256: [1, 2, 3].map((index) => ({
      path: pagePaths[index],
      sha256: createHash('sha256').update(originals[index]).digest('hex'),
    })),
  };
  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} catch (error) {
  await page
    ?.screenshot({ path: path.join(evidence, 'builds-v08-failure.png'), timeout: 10000 })
    .catch(() => {});
  const report = {
    passed: false,
    timestamp: new Date().toISOString(),
    executablePath,
    buildIdentity,
    electronVersion,
    sandbox,
    entry,
    syntheticOnly: true,
    checks,
    rendererErrors,
    normalExits: exits,
    screenshots,
    layouts,
    error: error.stack ?? String(error),
    processLog: processLog.join('').slice(-12000),
  };
  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  process.stderr.write(`${JSON.stringify(report, null, 2)}\n`);
  process.exitCode = 1;
} finally {
  await application?.close().catch(() => {});
  await fs.writeFile(path.join(evidence, 'builds-v08-process.log'), processLog.join(''));
}
