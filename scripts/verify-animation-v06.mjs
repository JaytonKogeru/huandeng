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
const sandbox = await fs.mkdtemp(path.join(os.tmpdir(), 'huandeng-animation-v06-'));
const projectRoot = path.join(sandbox, 'synthetic-project');
const entry = path.join(projectRoot, 'deck.pptd');
const evidence = path.join(root, '.verification');
const reportPath = path.join(evidence, 'animation-v06.json');
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
            shortCode: ['A6AA', 'A6BB', 'A6CC'][index],
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
let insertedId;

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
const object = (id) => canvas().locator(`[data-hd-element-id="${id}"]`);
const source = (index = 0) => fs.readFile(path.join(projectRoot, pagePaths[index]), 'utf8');
const disk = async (index = 0) => YAML.parse(await source(index));
const trackFor = async (targetId, property) =>
  (await disk()).timeline?.tracks.find(
    (track) => track.targetId === targetId && track.property === property,
  );
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
async function persisted(predicate, index = 0) {
  await eventually(async () => predicate(await disk(index)));
  await saved();
  assert.deepEqual((await api(`/pages/${ids[index]}`)).data, await disk(index));
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
async function selectKey(targetId, property, index) {
  const track = await trackFor(targetId, property);
  assert.ok(track, `Missing ${targetId}/${property} track`);
  const key = track.keyframes[index < 0 ? track.keyframes.length + index : index];
  await panel().locator(`[data-hd-keyframe="${key.id}"]`).click();
  await eventually(
    async () =>
      (await panel().getByLabel('时间（毫秒）', { exact: true }).inputValue()) ===
      String(key.timeMs),
  );
  return { track, key };
}
async function field(label, value) {
  const input = panel().getByLabel(label, { exact: true });
  await input.fill(String(value));
  await input.press('Enter');
  await saved();
}
async function seek(time) {
  const slider = panel().getByLabel('动画播放头（毫秒）', { exact: true });
  await slider.evaluate((node, value) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(node, String(value));
    node.dispatchEvent(new Event('input', { bubbles: true }));
    node.dispatchEvent(new Event('change', { bubbles: true }));
  }, time);
  await eventually(
    async () =>
      (await canvas().locator('[data-pptd-page]').getAttribute('data-hd-animation-time-ms')) ===
      String(time),
  );
}
async function postOperations(operations) {
  const snapshot = await api('/session');
  return api('/transactions', {
    requestId: randomUUID(),
    deckId: snapshot.deckId,
    actor: 'animation-v06-fixture',
    originClientId: 'animation-v06-fixture',
    expected: {
      manifest: snapshot.manifestRevision,
      metadata: snapshot.metadataRevision,
      pages: Object.fromEntries(snapshot.pages.map((item) => [item.pageId, item.pageRevision])),
    },
    operations,
  });
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

try {
  await launch();
  await mainPage();
  assert.equal((await api('/session')).writable, true);
  await check(
    'default insertion followed by an animation track survives saving/disabled transitions',
    async () => {
      const before = await disk();
      await page.getByRole('button', { name: '选择形状', exact: true }).click();
      await page.getByRole('menuitem', { name: '矩形', exact: true }).click();
      const layer = page.locator('[data-hd-insertion-layer="shape"]');
      await layer.waitFor();
      const box = await layer.boundingBox();
      assert.ok(box?.width > 0);
      await layer.click({ position: { x: box.width * 0.72, y: box.height * 0.7 } });
      await persisted((data) => data.elements.length === before.elements.length + 1);
      insertedId = (await disk()).elements.find(
        (element) => !before.elements.some((old) => old.elementId === element.elementId),
      ).elementId;
      await timeline(true);
      assert.equal(
        await panel().getByLabel('动画目标对象', { exact: true }).inputValue(),
        insertedId,
      );
      await panel().getByLabel('动画属性', { exact: true }).selectOption('rotation');
      await panel().getByRole('button', { name: '添加轨道', exact: true }).click();
      await persisted((data) =>
        data.timeline?.tracks.some(
          (track) => track.targetId === insertedId && track.property === 'rotation',
        ),
      );
      assert.equal((await trackFor(insertedId, 'rotation')).keyframes.length, 2);
      assert.equal(
        await panel().getByRole('button', { name: '添加轨道', exact: true }).isEnabled(),
        true,
      );
    },
  );

  await check(
    'multiple object tracks edit exact time, position, opacity and outgoing easing',
    async () => {
      await panel().getByLabel('动画目标对象', { exact: true }).selectOption('box');
      assert.equal(await panel().getByLabel('动画目标对象', { exact: true }).inputValue(), 'box');
      await panel().getByLabel('动画属性', { exact: true }).selectOption('x');
      await panel().getByRole('button', { name: '添加轨道', exact: true }).click();
      await persisted((data) =>
        data.timeline?.tracks.some((track) => track.targetId === 'box' && track.property === 'x'),
      );
      await selectKey('box', 'x', -1);
      await field('时间（毫秒）', 2000);
      await field('位置', 380);
      await selectKey('box', 'x', 0);
      await panel().getByLabel('关键帧缓动', { exact: true }).selectOption('linear');
      await persisted(
        (data) =>
          data.timeline.tracks.find((track) => track.targetId === 'box').keyframes[0].easing ===
          'linear',
      );
      await selectKey(insertedId, 'rotation', -1);
      await field('时间（毫秒）', 2000);
      await field('角度（°）', 90);
      await field('时长（秒）', 2);
      await panel().getByLabel('动画目标对象', { exact: true }).selectOption('title');
      await panel().getByLabel('动画属性', { exact: true }).selectOption('opacity');
      await panel().getByRole('button', { name: '添加轨道', exact: true }).click();
      await persisted((data) => data.timeline.tracks.length === 3);
      await field('不透明度（%）', 0);
      for (const easing of ['hold', 'linear', 'ease-in-out']) {
        await panel().getByLabel('关键帧缓动', { exact: true }).selectOption(easing);
        await persisted(
          (data) =>
            data.timeline.tracks.find((track) => track.property === 'opacity').keyframes[0]
              .easing === easing,
        );
      }
      const content = await disk();
      for (const original of elements)
        assert.deepEqual(
          content.elements.find((element) => element.elementId === original.elementId),
          original,
        );
      assert.equal((await trackFor('box', 'x')).keyframes[1].value, 380);
      assert.equal((await trackFor('title', 'opacity')).keyframes[0].value, 0);
    },
  );

  await check(
    'scrubbing and playback preserve base content; Escape returns to editing',
    async () => {
      const before = await source();
      const count = mutations.length;
      await seek(1000);
      const sampled = await object('box').evaluate((node) => ({
        transform: getComputedStyle(node).transform,
        width: getComputedStyle(node).width,
      }));
      assert.equal(sampled.transform, 'matrix(1, 0, 0, 1, 230, 180)');
      assert.equal(sampled.width, '160px');
      assert.equal(await object('title').evaluate((node) => getComputedStyle(node).opacity), '0.5');
      await panel().getByRole('button', { name: '播放动画', exact: true }).click();
      await eventually(
        async () =>
          Number(await panel().getByLabel('动画播放头（毫秒）', { exact: true }).inputValue()) >
          1000,
      );
      await panel().getByRole('button', { name: '暂停动画', exact: true }).click();
      await page.keyboard.press('Escape');
      await eventually(
        async () => !(await canvas().locator('[data-hd-animation-time-ms]').count()),
      );
      assert.equal(await object('box').evaluate((node) => getComputedStyle(node).left), '80px');
      assert.equal(await object('title').evaluate((node) => getComputedStyle(node).opacity), '1');
      assert.equal(await source(), before);
      assert.equal(mutations.length, count);
    },
  );

  await check('cue labels and times are editable, removable and persisted', async () => {
    await seek(800);
    await panel().getByRole('button', { name: '演讲步骤', exact: true }).click();
    await persisted((data) => data.timeline.cues?.length === 1);
    await field('步骤名称', '结果');
    await field('步骤时间（毫秒）', 700);
    await field('步骤时间（毫秒）', 800);
    await seek(2000);
    await panel().getByRole('button', { name: '演讲步骤', exact: true }).click();
    await persisted((data) => data.timeline.cues?.length === 2);
    await field('步骤名称', '收束');
    await panel().getByRole('button', { name: '删除步骤', exact: true }).click();
    await persisted((data) => data.timeline.cues?.length === 1);
    await panel().getByRole('button', { name: '演讲步骤', exact: true }).click();
    await persisted((data) => data.timeline.cues?.length === 2);
    await field('步骤名称', '收束');
    assert.deepEqual(
      (await disk()).timeline.cues.map(({ timeMs, label }) => ({ timeMs, label })),
      [
        { timeMs: 800, label: '结果' },
        { timeMs: 2000, label: '收束' },
      ],
    );
    await capture('animation-v06-timeline.png');
  });

  await check(
    'a lost response is recovered by the original request and acknowledges the matching timeline draft',
    async () => {
      await selectKey('box', 'x', -1);
      let lost;
      let injected = false;
      const pattern = '**/__pptd/transactions';
      const intercept = async (route) => {
        const body = route.request().postDataJSON();
        if (
          !injected &&
          body?.operations?.some((operation) => operation.op === 'page.timeline.set')
        ) {
          injected = true;
          const reply = await route.fetch();
          assert.ok(
            reply.ok(),
            'The synthetic request must commit before its response is dropped.',
          );
          lost = { body, receipt: await reply.json() };
          await route.abort('failed');
        } else await route.continue();
      };
      await page.route(pattern, intercept);
      try {
        const value = panel().getByLabel('位置', { exact: true });
        await value.fill('420');
        await value.press('Enter');
        await eventually(() => lost);
        await page.getByRole('button', { name: '重试同一次保存', exact: true }).waitFor();
        assert.equal((await trackFor('box', 'x')).keyframes[1].value, 420);
        await page.getByRole('button', { name: '重试同一次保存', exact: true }).click();
        await saved();
        const history = await api('/history');
        assert.equal(
          history.filter((operation) => operation.requestId === lost.body.requestId).length,
          1,
        );
        const repeats = mutations.filter(
          (request) => request.body?.requestId === lost.body.requestId,
        );
        assert.equal(repeats.length, 2);
        assert.deepEqual(repeats[0].body, repeats[1].body);
        assert.equal(
          (await api(`/pages/${ids[0]}`)).pageRevision,
          lost.receipt.newRevisions.pages[ids[0]],
        );
        await timeline(false);
        await timeline(true);
      } finally {
        await page.unroute(pattern, intercept);
      }
    },
  );

  await check(
    'keyframe drag is one transaction, Undo/Redo is complete, and Esc cancels a drag',
    async () => {
      const { track, key } = await selectKey('box', 'x', -1);
      const before = await disk();
      const historyBefore = (await api('/history')).length;
      const mutationBefore = mutations.length;
      const handleBox = await panel().locator(`[data-hd-keyframe="${key.id}"]`).boundingBox();
      const lane = await panel()
        .locator(`[data-hd-timeline-track="${track.id}"] [data-hd-timeline-lane]`)
        .boundingBox();
      assert.ok(handleBox && lane?.width > 30);
      await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(
        handleBox.x + handleBox.width / 2 - lane.width / 4,
        handleBox.y + handleBox.height / 2,
        { steps: 8 },
      );
      assert.deepEqual(await disk(), before);
      await page.mouse.up();
      await persisted(
        (data) =>
          data.timeline.tracks.find((item) => item.id === track.id).keyframes[1].timeMs < 1800,
      );
      const after = await disk();
      assert.equal(
        mutations.slice(mutationBefore).filter((item) => item.route.endsWith('/transactions'))
          .length,
        1,
      );
      assert.equal((await api('/history')).length, historyBefore + 1);
      await page.keyboard.press(`${modifier}+z`);
      await persisted((data) => JSON.stringify(data) === JSON.stringify(before));
      await menu('重做');
      await persisted((data) => JSON.stringify(data) === JSON.stringify(after));
      await menu('撤销');
      await persisted((data) => JSON.stringify(data) === JSON.stringify(before));
      const again = await panel().locator(`[data-hd-keyframe="${key.id}"]`).boundingBox();
      const cancelCount = mutations.length;
      await page.mouse.move(again.x + again.width / 2, again.y + again.height / 2);
      await page.mouse.down();
      await page.mouse.move(
        again.x + again.width / 2 - lane.width / 5,
        again.y + again.height / 2,
        { steps: 6 },
      );
      await page.keyboard.press('Escape');
      await page.mouse.up();
      await saved();
      assert.deepEqual(await disk(), before);
      assert.equal(mutations.length, cancelCount);
    },
  );

  await check('keyframe and track CRUD preserve unrelated tracks and base geometry', async () => {
    await selectKey('box', 'x', 0);
    await seek(1000);
    await panel().getByRole('button', { name: '添加关键帧', exact: true }).click();
    await persisted(
      (data) =>
        data.timeline.tracks.find((track) => track.targetId === 'box').keyframes.length === 3,
    );
    assert.equal((await trackFor('box', 'x')).keyframes[1].value, 250);
    await panel().getByRole('button', { name: '删除关键帧', exact: true }).click();
    await persisted(
      (data) =>
        data.timeline.tracks.find((track) => track.targetId === 'box').keyframes.length === 2,
    );
    await panel().getByLabel('动画目标对象', { exact: true }).selectOption('box');
    await panel().getByLabel('动画属性', { exact: true }).selectOption('scaleY');
    await panel().getByRole('button', { name: '添加轨道', exact: true }).click();
    await persisted((data) => data.timeline.tracks.length === 4);
    const track = await trackFor('box', 'scaleY');
    await panel()
      .locator(`[data-hd-timeline-track="${track.id}"]`)
      .getByRole('button', { name: /^删除轨道：/ })
      .click();
    await persisted((data) => data.timeline.tracks.length === 3);
    assert.equal((await disk()).elements.find((item) => item.elementId === 'box').bounds[0], 80);
  });

  await check(
    'duplicate key times and shortened duration keep unconfirmed input, support copying, and Escape discards only the field',
    async () => {
      await selectKey('box', 'x', -1);
      const before = await source();
      const count = mutations.length;
      const input = panel().getByLabel('时间（毫秒）', { exact: true });
      await input.fill('0');
      await input.press('Enter');
      await eventually(async () => (await input.getAttribute('aria-invalid')) === 'true');
      assert.equal(await source(), before);
      await panel().getByRole('button', { name: '复制动画草稿', exact: true }).click();
      const copied = await eventually(async () => {
        const payload = JSON.parse(
          await application.evaluate(({ clipboard }) => clipboard.readText()),
        );
        return payload.format === 'huandeng-animation-draft' ? payload : false;
      });
      assert.equal(copied.source.pageId, ids[0]);
      assert.equal(copied.pendingInputs['时间（毫秒）'], '0');
      assert.equal(
        copied.timeline.tracks.find((track) => track.targetId === 'box').keyframes[1].timeMs,
        2000,
      );
      assert.equal('elements' in copied, false);
      await input.press('Escape');
      await saved();
      assert.equal(await input.inputValue(), '2000');
      const duration = panel().getByLabel('时长（秒）', { exact: true });
      await duration.fill('0.5');
      await duration.press('Enter');
      await eventually(async () => (await duration.getAttribute('aria-invalid')) === 'true');
      await duration.press('Escape');
      await saved();
      assert.equal(await duration.inputValue(), '2');
      assert.equal(await source(), before);
      assert.equal(mutations.length, count);
    },
  );

  await check('timeline and cues survive a normal process close and reopen', async () => {
    const before = await source();
    const timelineBefore = (await disk()).timeline;
    await closeNormally();
    await launch();
    await mainPage();
    await timeline(true);
    assert.deepEqual((await disk()).timeline, timelineBefore);
    assert.equal(
      await panel().locator('[data-hd-timeline-track]').count(),
      timelineBefore.tracks.length,
    );
    assert.equal(await panel().getByLabel('时长（秒）', { exact: true }).inputValue(), '2');
    await seek(1000);
    assert.equal(
      await object('box').evaluate((node) => getComputedStyle(node).transform),
      'matrix(1, 0, 0, 1, 250, 180)',
    );
    assert.equal(await source(), before);
  });

  await check(
    '1024 by 768 dark reduced-motion layout keeps the timeline reachable and collapses back to the canvas',
    async () => {
      await baseMode();
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.getByRole('button', { name: /^(切换主题|Toggle theme)$/ }).click();
      await page.getByRole('menuitem', { name: /^(深色|Dark)$/ }).click();
      await application.evaluate(({ BrowserWindow }) => {
        const window = BrowserWindow.getAllWindows()[0];
        window.unmaximize();
        window.setMinimumSize(800, 600);
        window.setContentSize(1024, 768);
      });
      await page.waitForFunction(() => window.innerWidth === 1024 && window.innerHeight === 768);
      for (const name of ['收起项目导航', '收起对象属性']) {
        const button = page.getByRole('button', { name, exact: true });
        if (await button.count()) await button.click();
      }
      await page.getByRole('button', { name: '适合窗口', exact: true }).click();
      const layout = await page.evaluate(() => {
        const rect = document.querySelector('[data-hd-editor-canvas]').getBoundingClientRect();
        return {
          width: innerWidth,
          height: innerHeight,
          scrollWidth: document.documentElement.scrollWidth,
          dark: document.documentElement.classList.contains('dark'),
          reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
          canvas: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
          isolatedMinimumSizeOverride: true,
        };
      });
      assert.ok(layout.scrollWidth <= 1025);
      assert.ok(layout.canvas.width > 100 && layout.canvas.height > 40);
      assert.equal(layout.dark, true);
      assert.equal(layout.reducedMotion, true);
      assert.equal(
        await panel().getByRole('button', { name: '添加轨道', exact: true }).isVisible(),
        true,
      );
      layouts.push(layout);
      await capture('animation-v06-1024-dark-reduced-motion.png');
      await timeline(false);
      await page.getByRole('button', { name: '适合窗口', exact: true }).click();
      await eventually(
        async () => (await canvas().boundingBox()).height > layout.canvas.height + 50,
      );
      await capture('animation-v06-1024-canvas.png');
      await application.evaluate(({ BrowserWindow }) =>
        BrowserWindow.getAllWindows()[0].setContentSize(1600, 1000),
      );
      await page.waitForFunction(() => innerWidth === 1600 && innerHeight === 1000);
      for (const name of ['展开项目导航', '展开对象属性']) {
        const button = page.getByRole('button', { name, exact: true });
        if (await button.count()) await button.click();
      }
      await page.getByRole('button', { name: /^(切换主题|Toggle theme)$/ }).click();
      await page.getByRole('menuitem', { name: /^(浅色|Light)$/ }).click();
      await page.emulateMedia({ reducedMotion: 'no-preference' });
    },
  );

  await check(
    'future schemas remain statically readable and their animation data cannot be overwritten',
    async () => {
      await mainPage(2);
      await timeline(true);
      await panel()
        .getByText(/此时间线暂不能编辑/)
        .waitFor();
      assert.equal(
        await panel().getByRole('button', { name: '添加轨道', exact: true }).isDisabled(),
        true,
      );
      assert.equal(await panel().getByLabel('时长（秒）', { exact: true }).isDisabled(), true);
      await panel().getByRole('button', { name: '预览动画', exact: true }).click();
      assert.equal(await canvas().locator('[data-hd-animation-time-ms]').count(), 0);
      assert.equal(await object('box').evaluate((node) => getComputedStyle(node).left), '80px');
      assert.equal(await source(2), originals[2]);
    },
  );

  await check(
    'named-version references preview their archived timeline while authoring controls stay readonly',
    async () => {
      await mainPage();
      const snapshot = await api('/session');
      const sourcePage = snapshot.pages.find((item) => item.pageId === ids[0]);
      const checkpoint = await api(`/pages/${ids[0]}/checkpoints`, {
        pageId: ids[0],
        requestId: randomUUID(),
        label: '动画只读验收',
        expectedPageRevision: sourcePage.pageRevision,
        expectedMetadataRevision: snapshot.metadataRevision,
        actor: 'animation-v06-fixture',
      });
      const pinned = structuredClone(project);
      pinned.presentations.push({
        id: 'pinned-talk',
        title: '固定动画版本',
        story: emptyStory,
        items: [{ id: 'pinned', kind: 'page', pageId: ids[0], versionId: checkpoint.versionId }],
      });
      await postOperations([{ op: 'project.replace', project: pinned }]);
      await page.getByLabel('当前演讲集合', { exact: true }).selectOption('pinned-talk');
      const view = await api('/presentations/pinned-talk');
      await page.locator(`[data-hd-thumbnail-key="${view.pages[0].occurrenceId}"]`).click();
      await timeline(true);
      await eventually(
        async () =>
          await panel().getByRole('button', { name: '添加轨道', exact: true }).isDisabled(),
      );
      assert.equal(await panel().getByLabel('时长（秒）', { exact: true }).isDisabled(), true);
      const before = await source();
      const count = mutations.length;
      await seek(1000);
      assert.equal(
        await object('box').evaluate((node) => getComputedStyle(node).transform),
        'matrix(1, 0, 0, 1, 250, 180)',
      );
      await panel().locator('[data-hd-keyframe]').first().focus();
      await page.keyboard.press('Delete');
      assert.equal(await source(), before);
      assert.equal(mutations.length, count);
    },
  );

  await check(
    'presentation steps stop at cues, reverse deterministically, and reset repeated occurrences',
    async () => {
      await mainPage();
      await page.getByLabel('当前演讲集合', { exact: true }).selectOption('repeat-talk');
      const view = await api('/presentations/repeat-talk');
      assert.deepEqual(
        view.pages.map((item) => item.pageId),
        [ids[0], ids[1], ids[0]],
      );
      await page.locator(`[data-hd-thumbnail-key="${view.pages[0].occurrenceId}"]`).click();
      await canvas().focus();
      const before = await source();
      const count = mutations.length;
      await page.keyboard.press('Shift+F5');
      const presenter = page.locator('[data-hd-presenter]');
      await presenter.waitFor();
      const clock = presenter.getByLabel('放映动画时间', { exact: true });
      await eventually(async () => (await clock.inputValue()) === '0');
      await presenter.getByRole('button', { name: '下一步', exact: true }).click();
      await eventually(async () => (await clock.inputValue()) === '800');
      assert.equal(
        await presenter
          .locator('[data-hd-presenter-occurrence]')
          .getAttribute('data-hd-presenter-occurrence'),
        view.pages[0].occurrenceId,
      );
      await presenter.getByRole('button', { name: '上一步', exact: true }).click();
      assert.equal(await clock.inputValue(), '0');
      await presenter.getByRole('button', { name: '下一步', exact: true }).click();
      await presenter.getByRole('button', { name: '下一步', exact: true }).click();
      await eventually(async () => (await clock.inputValue()) === '800');
      await presenter.getByRole('button', { name: '下一步', exact: true }).click();
      await eventually(async () => (await clock.inputValue()) === '2000');
      await presenter.getByRole('button', { name: '下一步', exact: true }).click();
      await eventually(
        async () =>
          (await presenter
            .locator('[data-hd-presenter-slide]')
            .getAttribute('data-hd-presenter-slide')) === ids[1],
      );
      await presenter.getByRole('button', { name: '下一页', exact: true }).click();
      await eventually(
        async () =>
          (await presenter
            .locator('[data-hd-presenter-occurrence]')
            .getAttribute('data-hd-presenter-occurrence')) === view.pages[2].occurrenceId,
      );
      assert.notEqual(view.pages[0].occurrenceId, view.pages[2].occurrenceId);
      await eventually(async () => (await clock.inputValue()) === '0');
      await capture('animation-v06-presenter.png');
      await presenter.getByRole('button', { name: '退出演示', exact: true }).click();
      await presenter.waitFor({ state: 'detached' });
      assert.equal(await source(), before);
      assert.equal(mutations.length, count);
    },
  );

  await check(
    'a future schema arriving during editing preserves the old draft and unconfirmed input for copying',
    async () => {
      await mainPage();
      await timeline(true);
      await selectKey('box', 'x', -1);
      const before = await source();
      const data = await disk();
      const input = panel().getByLabel('时间（毫秒）', { exact: true });
      await input.fill('0');
      await input.press('Enter');
      await eventually(async () => (await input.getAttribute('aria-invalid')) === 'true');
      const future = YAML.stringify({
        ...data,
        timeline: { schemaVersion: 99, opaque: { external: true } },
      });
      await fs.writeFile(path.join(projectRoot, pagePaths[0]), future);
      await eventually(
        async () => (await api(`/pages/${ids[0]}`)).data.timeline.schemaVersion === 99,
      );
      await panel()
        .getByText(/此时间线暂不能编辑/)
        .waitFor();
      assert.equal(await input.inputValue(), '0');
      assert.equal(await input.isDisabled(), true);
      await panel().getByRole('button', { name: '复制动画草稿', exact: true }).click();
      const copied = await eventually(async () => {
        const payload = JSON.parse(
          await application.evaluate(({ clipboard }) => clipboard.readText()),
        );
        return payload.source?.pageId === ids[0] && payload.pendingInputs?.['时间（毫秒）'] === '0'
          ? payload
          : false;
      });
      assert.deepEqual(copied.timeline, data.timeline);
      assert.equal(await source(), future);
      await fs.writeFile(path.join(projectRoot, pagePaths[0]), before);
      await eventually(
        async () => (await api(`/pages/${ids[0]}`)).data.timeline.schemaVersion === 1,
      );
      await eventually(
        async () =>
          !(await panel()
            .getByText(/此时间线暂不能编辑/)
            .count()),
      );
      await panel().getByRole('button', { name: '还原已保存', exact: true }).click();
      await saved();
      assert.equal(await source(), before);
    },
  );

  await check(
    'external source-page removal retains the correct page draft until an explicit discard',
    async () => {
      await selectKey('box', 'x', -1);
      const input = panel().getByLabel('位置', { exact: true });
      await input.fill('777');
      await eventually(
        async () => (await panel().locator('[aria-live="polite"]').innerText()) === '未保存',
      );
      await postOperations([{ op: 'page.remove', pageId: ids[0] }]);
      await eventually(
        async () => !(await api('/session')).pages.some((item) => item.pageId === ids[0]),
      );
      await eventually(
        async () =>
          await panel().getByRole('button', { name: '添加轨道', exact: true }).isDisabled(),
      );
      assert.equal(
        await canvas().locator('[data-pptd-page]').getAttribute('data-pptd-page'),
        ids[0],
      );
      await panel().getByRole('button', { name: '复制动画草稿', exact: true }).click();
      const copied = await eventually(async () => {
        const payload = JSON.parse(
          await application.evaluate(({ clipboard }) => clipboard.readText()),
        );
        const raw = payload.pendingInputs?.位置;
        const value = payload.timeline?.tracks
          .find((track) => track.targetId === 'box' && track.property === 'x')
          ?.keyframes.at(-1)?.value;
        return payload.source?.pageId === ids[0] && (raw === '777' || value === 777)
          ? payload
          : false;
      });
      assert.equal(copied.source.pageId, ids[0]);
      await capture('animation-v06-retained-draft.png');
      await panel().getByRole('button', { name: '还原已保存', exact: true }).click();
      await eventually(
        async () =>
          (await canvas().locator('[data-pptd-page]').getAttribute('data-pptd-page')) !== ids[0],
      );
      await timeline(false);
      await saved();
      assert.equal(
        (await disk()).elements.find((element) => element.elementId === 'box').bounds[0],
        80,
      );
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
    sandbox,
    entry,
    syntheticOnly: true,
    checks,
    rendererErrors,
    normalExits: exits,
    screenshots,
    layouts,
    mutationCount: mutations.length,
    unchangedSiblingSha256: [1, 2].map((index) => ({
      path: pagePaths[index],
      sha256: createHash('sha256').update(originals[index]).digest('hex'),
    })),
  };
  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} catch (error) {
  await page
    ?.screenshot({ path: path.join(evidence, 'animation-v06-failure.png'), timeout: 10000 })
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
  await fs.writeFile(path.join(evidence, 'animation-v06-process.log'), processLog.join(''));
}
