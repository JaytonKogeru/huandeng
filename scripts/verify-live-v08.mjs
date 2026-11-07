// biome-ignore-all lint/suspicious/noUndeclaredEnvVars: The isolated acceptance process selects its candidate executable, profile and runtime.
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
const sandbox = await fs.mkdtemp(path.join(os.tmpdir(), 'huandeng-live-v08-'));
const projectRoot = path.join(sandbox, 'synthetic-project');
const entry = path.join(projectRoot, 'deck.pptd');
const evidence = path.join(root, '.verification');
const reportPath = path.join(evidence, 'live-v08.json');
const ids = [randomUUID(), randomUUID(), randomUUID()];
const pagePaths = ['pages/authoring.page', 'pages/middle.page', 'pages/future.page'];
const emptyStory = { purpose: '', audience: '', takeaway: '' };
const project = {
  schemaVersion: 1,
  mainStory: emptyStory,
  sections: [],
  presentations: [
    {
      id: 'repeat-talk',
      title: '动画重复引用验收',
      story: emptyStory,
      items: [
        { id: 'opening', kind: 'page', pageId: ids[0] },
        { id: 'middle', kind: 'page', pageId: ids[1] },
        {
          id: 'return',
          kind: 'page',
          pageId: ids[0],
          notes: '同一个主页面再次出现时，动画从零开始。',
        },
      ],
    },
  ],
};
const buildEffects = [
  {
    id: 'figure-a',
    targetId: 'box',
    kind: 'fade-in',
    trigger: 'click',
    durationMs: 400,
    delayMs: 0,
    label: '展示 Figure A',
  },
  {
    id: 'arrow',
    targetId: 'member-a',
    kind: 'appear',
    trigger: 'click',
    durationMs: 0,
    delayMs: 0,
    label: '指出关键区域',
  },
  {
    id: 'figure-b',
    targetId: 'member-b',
    kind: 'fade-in',
    trigger: 'click',
    durationMs: 500,
    delayMs: 0,
    label: '展示 Figure B',
  },
  {
    id: 'exit-a',
    targetId: 'box',
    kind: 'fade-out',
    trigger: 'with-previous',
    durationMs: 500,
    delayMs: 0,
  },
  {
    id: 'move-b',
    targetId: 'member-b',
    kind: 'move',
    trigger: 'click',
    durationMs: 400,
    delayMs: 0,
    dx: 120,
    dy: 30,
    label: '移动并强调',
  },
  {
    id: 'pulse-b',
    targetId: 'member-b',
    kind: 'pulse',
    trigger: 'after-previous',
    durationMs: 400,
    delayMs: 0,
  },
  {
    id: 'exit-b',
    targetId: 'member-b',
    kind: 'disappear',
    trigger: 'click',
    durationMs: 0,
    delayMs: 0,
    label: '收束讨论',
  },
];
const elements = [
  {
    elementId: 'title',
    elementType: 'text',
    bounds: [60, 45, 800, 70],
    content: { text: '动画验收 · 合成内容', fontSize: 34 },
  },
  {
    elementId: 'box',
    elementType: 'shape',
    shapeName: 'rect',
    bounds: [80, 180, 160, 90],
    fill: { type: 'solid', color: '#527f6e' },
  },
  {
    elementId: 'member-a',
    elementType: 'shape',
    shapeName: 'ellipse',
    bounds: [400, 180, 70, 70],
    fill: { type: 'solid', color: '#9cc3b3' },
  },
  {
    elementId: 'member-b',
    elementType: 'shape',
    shapeName: 'rect',
    bounds: [490, 180, 70, 70],
    fill: { type: 'solid', color: '#c8dcce' },
  },
  {
    elementId: 'group',
    elementType: 'group',
    bounds: [400, 180, 160, 70],
    children: ['member-a', 'member-b'],
  },
];
await fs.mkdir(path.join(projectRoot, 'pages'), { recursive: true });
await fs.mkdir(path.join(projectRoot, '.huandeng'), { recursive: true });
await fs.mkdir(evidence, { recursive: true });
await fs.writeFile(
  entry,
  YAML.stringify({ title: 'HUANDENG 动画验收', size: [960, 540], pages: pagePaths }),
);
for (const [index, file] of pagePaths.entries()) {
  await fs.writeFile(
    path.join(projectRoot, file),
    YAML.stringify({
      elements: structuredClone(elements),
      notes: `合成动画页面 ${index + 1}`,
      animationFixture: true,
      ...(index === 0
        ? {
            timeline: { schemaVersion: 2, effects: buildEffects },
            transition: { schemaVersion: 1, kind: 'fade', durationMs: 240 },
          }
        : {}),
      ...(index === 2
        ? { timeline: { schemaVersion: 99, opaque: { preserve: ['future', 'animation'] } } }
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
            shortCode: ['A7AA', 'A7BB', 'A7CC'][index],
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
let reverseFrameIndex = 0;
const rendererErrors = [];
const processLog = [];
const mutations = [];
const screenshots = [];
const exits = [];
let application;
let page;
let serviceUrl;
let sessionToken;
let electronVersion;

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
  throw last ?? new Error('Timed out waiting for animation acceptance state.');
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
const panel = () => page.locator('[data-hd-timeline]');
const source = (index = 0) => fs.readFile(path.join(projectRoot, pagePaths[index]), 'utf8');
async function saved() {
  let stage = 'global save status';
  try {
    await eventually(async () =>
      (await page.locator('[data-hd-save-status]').innerText()).includes('已保存'),
    );
    stage = 'timeline save status';
    if (await panel().count())
      await eventually(
        async () => (await panel().locator('[aria-live="polite"]').innerText()) === '已保存',
      );
  } catch (error) {
    const state = await page
      .evaluate(() => ({
        globalStatus: document.querySelector('[data-hd-save-status]')?.textContent,
        timelineStatus: document.querySelector('[data-hd-timeline] [aria-live="polite"]')
          ?.textContent,
        alerts: Array.from(document.querySelectorAll('[role="alert"]')).map(
          (node) => node.textContent,
        ),
        previewTime: document
          .querySelector('[data-hd-editor-canvas] [data-hd-animation-time-ms]')
          ?.getAttribute('data-hd-animation-time-ms'),
      }))
      .catch(() => null);
    throw new Error(`Waiting for ${stage}: ${JSON.stringify(state)}`, { cause: error });
  }
}
async function capture(name) {
  await page.screenshot({ path: path.join(evidence, name), animations: 'disabled' });
  screenshots.push(name);
}
async function timeline(open) {
  const button = page.getByRole('button', { name: '动画', exact: true });
  if ((await button.getAttribute('aria-expanded')) !== String(open)) await button.click();
  await panel().waitFor({ state: open ? 'visible' : 'detached' });
}
async function baseMode() {
  const button = panel().getByRole('button', { name: '返回编辑', exact: true });
  if (await button.count()) await button.click();
  await eventually(async () => !(await canvas().locator('[data-hd-animation-time-ms]').count()));
}
async function mainPage(index = 0) {
  if (await panel().count()) {
    await baseMode();
    await timeline(false);
  }
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
    actor: 'live-v08-fixture',
    originClientId: 'live-v08-fixture',
    expected: {
      manifest: snapshot.manifestRevision,
      metadata: snapshot.metadataRevision,
      pages: Object.fromEntries(snapshot.pages.map((item) => [item.pageId, item.pageRevision])),
    },
    operations,
  });
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
      mutations.push({
        route: new URL(request.url()).pathname,
        body: request.postDataJSON(),
        at: Date.now(),
      });
  });
  await canvas().waitFor({ timeout: 120000 });
  const context = await page.evaluate(() => window.huandengDesktop.getContext());
  assert.equal(path.resolve(context.entryPath).toLowerCase(), path.resolve(entry).toLowerCase());
  serviceUrl = context.serviceUrl;
  sessionToken = (await api('/session')).sessionToken;
  electronVersion = await application.evaluate(() => process.versions.electron);
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
const presenter = () => page.locator('[data-hd-presenter]');
const surface = () => presenter().locator('[data-hd-presenter-slide]');
const clock = async () => Number(await presenter().getAttribute('data-hd-presenter-time'));
const opacity = (id) =>
  surface()
    .locator(`[data-hd-element-id="${id}"]`)
    .evaluate((node) => Number(getComputedStyle(node).opacity));
const atTime = (value) => eventually(async () => (await clock()) === value);
const occurrence = () => surface().getAttribute('data-hd-presenter-occurrence');
const clickSlide = () => surface().click({ position: { x: 150, y: 140 } });
let view;
let beforePlayback;
try {
  await launch();
  await page.getByLabel('当前演讲集合', { exact: true }).selectOption('repeat-talk');
  view = await api('/presentations/repeat-talk');
  await page.locator(`[data-hd-thumbnail-key="${view.pages[0].occurrenceId}"]`).click();
  beforePlayback = await source();
  await page.evaluate(() => {
    window.__hdFirstFrames = [];
    window.__hdWatchFrames = true;
    let last = null;
    const inspect = () => {
      if (!window.__hdWatchFrames) return;
      const stage = document.querySelector('[data-hd-presenter-slide]');
      const identity = stage?.getAttribute('data-hd-presenter-occurrence') ?? null;
      if (identity && identity !== last)
        window.__hdFirstFrames.push({
          identity,
          time: Number(
            document.querySelector('[data-hd-presenter]')?.getAttribute('data-hd-presenter-time'),
          ),
          boxOpacity: Number(
            getComputedStyle(stage.querySelector('[data-hd-element-id="box"]')).opacity,
          ),
        });
      last = identity;
      window.__hdFrameHandle = requestAnimationFrame(inspect);
    };
    window.__hdFrameHandle = requestAnimationFrame(inspect);
  });
  await canvas().focus();
  await page.keyboard.press('Shift+F5');
  await presenter().waitFor();
  await check('first paint has hidden entrance states and click-first controls', async () => {
    await atTime(0);
    assert.equal(await opacity('box'), 0);
    assert.equal(await opacity('member-a'), 0);
    assert.equal(await opacity('member-b'), 0);
    assert.equal(await presenter().locator('[data-hd-presenter-timeline]').count(), 0);
    assert.equal(await presenter().locator('[data-hd-presenter-notes]').count(), 0);
  });
  await check('physical slide click starts a fade; Enter finishes the current step', async () => {
    await clickSlide();
    await eventually(async () => (await clock()) > 20 && (await clock()) < 400);
    const value = await opacity('box');
    assert.ok(value > 0 && value < 1);
    await page.keyboard.press('Enter');
    await atTime(400);
    assert.equal(await opacity('box'), 1);
    assert.equal(await occurrence(), view.pages[0].occurrenceId);
    await surface().focus();
    await page.keyboard.press('Shift+F5');
    await atTime(0);
    assert.equal(await opacity('box'), 0);
    await clickSlide();
    await atTime(400);
  });
  await check(
    'reverse restores hidden state and instant appearance consumes one click',
    async () => {
      await page.keyboard.press('ArrowLeft');
      await atTime(0);
      assert.equal(await opacity('box'), 0);
      await clickSlide();
      await atTime(400);
      await clickSlide();
      await atTime(401);
      assert.equal(await opacity('member-a'), 1);
      assert.equal(await opacity('member-b'), 0);
    },
  );
  await check('with-previous reveals one figure while the other fades out', async () => {
    await page.keyboard.press(' ');
    await eventually(async () => (await clock()) > 430 && (await clock()) < 901);
    const a = await opacity('box');
    const b = await opacity('member-b');
    assert.ok(a > 0 && a < 1 && b > 0 && b < 1);
    await page.keyboard.press(' ');
    await atTime(901);
    assert.equal(await opacity('box'), 0);
    assert.equal(await opacity('member-b'), 1);
  });
  await check('blackout pauses motion; restoration does not consume a step', async () => {
    await page.keyboard.press('ArrowRight');
    await eventually(async () => (await clock()) > 920 && (await clock()) < 1301);
    await page.keyboard.press('b');
    await presenter().locator('[data-hd-presenter-blackout]').waitFor();
    await presenter().getByRole('button', { name: '动画播放控制', exact: true }).click();
    assert.equal(
      await presenter().getByRole('button', { name: '播放至下一提示点', exact: true }).isDisabled(),
      true,
    );
    assert.equal(await presenter().getByLabel('放映动画时间', { exact: true }).isDisabled(), true);
    await presenter().getByRole('button', { name: '动画播放控制', exact: true }).click();
    const paused = await clock();
    await surface().focus();
    await page.waitForTimeout(130);
    assert.equal(await clock(), paused);
    await page.keyboard.press('Enter');
    await presenter().locator('[data-hd-presenter-blackout]').waitFor({ state: 'detached' });
    assert.equal(await clock(), paused);
    await page.keyboard.press('Enter');
    await atTime(1701);
    assert.equal(
      await surface()
        .locator('[data-hd-element-id="member-b"]')
        .evaluate((node) => getComputedStyle(node).transform),
      'matrix(1, 0, 0, 1, 610, 210)',
    );
  });
  await check('key repeat is ignored; final disappearance requires its own click', async () => {
    await surface().dispatchEvent('keydown', { key: 'ArrowRight', repeat: true, bubbles: true });
    assert.equal(await clock(), 1701);
    await clickSlide();
    await atTime(1702);
    assert.equal(await opacity('member-b'), 0);
    assert.equal(await occurrence(), view.pages[0].occurrenceId);
    await clickSlide();
    await eventually(async () => (await occurrence()) === view.pages[1].occurrenceId);
  });
  await check('a new presentation clears blackout when restarting on another page', async () => {
    await surface().focus();
    await page.keyboard.press('b');
    await presenter().locator('[data-hd-presenter-blackout]').waitFor();
    await page.keyboard.press('F5');
    await eventually(async () => (await occurrence()) === view.pages[0].occurrenceId);
    await atTime(0);
    await presenter().locator('[data-hd-presenter-blackout]').waitFor({ state: 'detached' });
    await presenter().getByRole('button', { name: '动画播放控制', exact: true }).click();
    await presenter().getByLabel('放映动画时间', { exact: true }).focus();
    await page.keyboard.press('End');
    await atTime(1702);
    await presenter().getByRole('button', { name: '动画播放控制', exact: true }).click();
    await clickSlide();
    await eventually(async () => (await occurrence()) === view.pages[1].occurrenceId);
  });
  await check(
    'back restores final state; Home and a fresh toolbar presentation reset to the opening',
    async () => {
      reverseFrameIndex = await page.evaluate(() => window.__hdFirstFrames.length);
      await page.keyboard.press('ArrowLeft');
      await eventually(async () => (await occurrence()) === view.pages[0].occurrenceId);
      await atTime(1702);
      assert.equal(await opacity('member-b'), 0);
      await page.keyboard.press('ArrowLeft');
      await atTime(1701);
      assert.equal(await opacity('member-b'), 1);
      await page.keyboard.press('Shift+F5');
      await atTime(0);
      await clickSlide();
      await atTime(400);
      await presenter().getByRole('button', { name: '演讲者备注', exact: true }).click();
      await atTime(400);
      await presenter().getByRole('button', { name: '演讲者备注', exact: true }).click();
      await surface().focus();
      await page.keyboard.press('Home');
      await atTime(0);
      assert.equal(await opacity('box'), 0);
      await page.keyboard.press('Escape');
      await presenter().waitFor({ state: 'detached' });
      await page.getByRole('button', { name: '演示', exact: true }).click();
      await presenter().waitFor();
      await atTime(0);
      assert.equal(await opacity('box'), 0);
      await clickSlide();
      await atTime(400);
    },
  );
  await check('full screen survives page change; repeated occurrence starts hidden', async () => {
    await page.keyboard.press('Enter');
    await atTime(401);
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    await atTime(901);
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    await atTime(1701);
    await page.keyboard.press('Enter');
    await atTime(1702);
    await page.keyboard.press('Enter');
    await eventually(async () => (await occurrence()) === view.pages[1].occurrenceId);
    await page.keyboard.press('f');
    await eventually(() => page.evaluate(() => !!document.fullscreenElement));
    await clickSlide();
    await eventually(async () => (await occurrence()) === view.pages[2].occurrenceId);
    await atTime(0);
    assert.equal(await opacity('box'), 0);
    assert.equal(await page.evaluate(() => !!document.fullscreenElement), true);
    await page.keyboard.press('F1');
    await page.getByRole('dialog').waitFor();
    assert.equal(await page.evaluate(() => !!document.fullscreenElement), false);
    assert.equal(await page.getByRole('dialog').isVisible(), true);
    await page.keyboard.press('Escape');
    await page.getByRole('dialog').waitFor({ state: 'detached' });
    assert.equal(await presenter().count(), 1);

    await presenter().getByRole('button', { name: '演讲者备注', exact: true }).click();
    assert.match(
      await presenter().locator('[data-hd-presenter-note-text]').innerText(),
      /再次出现/,
    );
    await presenter().getByRole('button', { name: '演讲者备注', exact: true }).click();
    await surface().focus();
    await page.mouse.move(10, 10);
    await page.waitForTimeout(2500);
    await capture('live-v08-audience.png');
  });
  await check('controls do not write playback state into the document', async () => {
    await page.mouse.move(400, 300);
    await presenter().getByRole('button', { name: '动画播放控制', exact: true }).click();
    await presenter().getByLabel('放映动画时间', { exact: true }).waitFor();
    await presenter().getByRole('button', { name: '动画回到起点', exact: true }).click();
    await atTime(0);
    await presenter().getByRole('button', { name: '退出演示', exact: true }).click();
    await presenter().waitFor({ state: 'detached' });
    assert.equal(await source(), beforePlayback);
    assert.equal(mutations.length, 0);
  });
  await check('named-version builds stay exact after the live animation changes', async () => {
    const snapshot = await api('/session');
    const original = snapshot.pages.find((item) => item.pageId === ids[0]);
    const checkpoint = await api(`/pages/${ids[0]}/checkpoints`, {
      pageId: ids[0],
      requestId: randomUUID(),
      label: 'v08 点击演讲版本',
      expectedPageRevision: original.pageRevision,
      expectedMetadataRevision: snapshot.metadataRevision,
      actor: 'live-v08',
    });
    const withPin = structuredClone(project);
    withPin.presentations.push({
      id: 'pinned-talk',
      title: '固定动画版本',
      story: emptyStory,
      items: [{ id: 'pin', kind: 'page', pageId: ids[0], versionId: checkpoint.versionId }],
    });
    await postOperations([
      { op: 'project.replace', project: withPin },
      {
        op: 'page.timeline.set',
        pageId: ids[0],
        timeline: {
          schemaVersion: 2,
          effects: [{ ...buildEffects[0], kind: 'move', durationMs: 900, dx: 20, dy: 0 }],
        },
      },
    ]);
    await eventually(
      async () =>
        (await page
          .getByLabel('当前演讲集合', { exact: true })
          .locator('option[value="pinned-talk"]')
          .count()) === 1,
    );
    await page.getByLabel('当前演讲集合', { exact: true }).selectOption('pinned-talk');
    const pinned = await api('/presentations/pinned-talk');
    await page.locator(`[data-hd-thumbnail-key="${pinned.pages[0].occurrenceId}"]`).click();
    await canvas().focus();
    await page.keyboard.press('Shift+F5');
    await presenter().waitFor();
    await atTime(0);
    assert.equal(await opacity('box'), 0);
    await clickSlide();
    await atTime(400);
    assert.match(await presenter().locator('[data-hd-presenter-step-label]').innerText(), /1 \/ 5/);
    await page.keyboard.press('Escape');
    await presenter().waitFor({ state: 'detached' });
  });
  await check('unknown animation schema is reported without modifying the source', async () => {
    await mainPage(2);
    const before = await source(2);
    await canvas().focus();
    await page.keyboard.press('Shift+F5');
    await presenter().waitFor();
    await presenter().getByRole('alert').filter({ hasText: '动画无法播放' }).waitFor();
    await page.keyboard.press('Escape');
    await presenter().waitFor({ state: 'detached' });
    assert.equal(await source(2), before);
  });
  await check(
    'first sampled frames are correct across forward, reverse and repeated boundaries',
    async () => {
      const samples = await page.evaluate(() => {
        window.__hdWatchFrames = false;
        cancelAnimationFrame(window.__hdFrameHandle);
        return window.__hdFirstFrames;
      });
      assert.equal(samples[0].identity, view.pages[0].occurrenceId);
      assert.equal(samples[0].time, 0);
      assert.equal(samples[0].boxOpacity, 0);
      const returned = samples
        .slice(reverseFrameIndex)
        .find((item) => item.identity === view.pages[0].occurrenceId);
      assert.equal(returned.time, 1702);
      const repeated = samples.find((item) => item.identity === view.pages[2].occurrenceId);
      assert.equal(repeated.time, 0);
      assert.equal(repeated.boxOpacity, 0);
    },
  );
  assert.deepEqual(rendererErrors, []);
  assert.equal(await source(1), originals[1]);
  assert.equal(await source(2), originals[2]);
  await closeNormally();
  const report = {
    passed: true,
    timestamp: new Date().toISOString(),
    executablePath,
    electronVersion,
    syntheticOnly: true,
    checks,
    normalExits: exits,
    rendererErrors,
    screenshots,
    sandbox,
  };
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  process.stdout.write(JSON.stringify(report, null, 2));
} catch (error) {
  await page
    ?.screenshot({ path: path.join(evidence, 'live-v08-failure.png'), timeout: 10000 })
    .catch(() => {});
  const report = {
    passed: false,
    timestamp: new Date().toISOString(),
    executablePath,
    electronVersion,
    checks,
    normalExits: exits,
    rendererErrors,
    error: error.stack ?? String(error),
    processLog: processLog.join('').slice(-10000),
    sandbox,
  };
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  process.stderr.write(JSON.stringify(report, null, 2));
  process.exitCode = 1;
} finally {
  await application?.close().catch(() => {});
}
