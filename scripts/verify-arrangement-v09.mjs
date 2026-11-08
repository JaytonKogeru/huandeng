// biome-ignore-all lint/suspicious/noUndeclaredEnvVars: The isolated Electron acceptance process deliberately selects its executable, profile and runtime.
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

const sandbox = await fs.mkdtemp(path.join(os.tmpdir(), 'huandeng-arrangement-v09-'));
const projectRoot = path.join(sandbox, 'synthetic-project');
const entry = path.join(projectRoot, 'deck.pptd');
const profile = path.join(sandbox, 'profile');
const evidence = path.join(root, '.verification', 'arrangement-v09', path.basename(sandbox));
const reportPath = path.join(evidence, 'result.json');
const size = [1280, 720];
const names = ['shift', 'group', 'spacing', 'cancel', 'threshold', 'distribution'];
const ids = names.map(() => randomUUID());
const pagePaths = names.map((name) => `pages/${name}.page`);
const assetPath = 'media/synthetic-square.svg';
const shape = (elementId, bounds, color = '#537f6d') => ({
  elementId,
  elementType: 'shape',
  shapeName: 'rect',
  bounds,
  fill: { type: 'solid', color },
});
const fixtures = [
  [shape('moving', [100, 100, 100, 40]), shape('reference', [600, 103, 100, 40])],
  [
    shape('child-a', [100, 100, 40, 20]),
    shape('child-b', [180, 100, 40, 20], '#adccb9'),
    {
      elementId: 'group',
      elementType: 'group',
      bounds: [100, 100, 120, 20],
      children: ['child-a', 'child-b'],
    },
  ],
  [
    shape('left', [100, 50, 40, 40]),
    shape('right', [300, 50, 60, 40], '#adccb9'),
    {
      elementId: 'moving',
      elementType: 'text',
      bounds: [0, 50, 80, 40],
      content: { text: 'Text', fontSize: 18, fontFamily: 'Arial' },
    },
  ],
  [shape('moving', [100, 100, 100, 40])],
  [
    {
      elementId: 'moving',
      elementType: 'image',
      src: assetPath,
      bounds: [0, 100, 40, 40],
      fit: { mode: 'contain' },
    },
    shape('reference', [300, 300, 40, 40]),
  ],
  [
    shape('first', [60, 100, 40, 20]),
    shape('middle', [140, 100, 60, 20], '#adccb9'),
    shape('last', [360, 100, 80, 20], '#c99a48'),
  ],
].map((elements, index) => ({
  elements,
  notes: `Synthetic ${names[index]} acceptance fixture.`,
  arrangementFixture: true,
}));

for (const directory of ['pages', 'media', '.huandeng'])
  await fs.mkdir(path.join(projectRoot, directory), { recursive: true });
await fs.mkdir(profile, { recursive: true });
await fs.mkdir(evidence, { recursive: true });
await fs.writeFile(
  entry,
  YAML.stringify({
    title: 'HUANDENG arrangement acceptance — synthetic content',
    size,
    pages: pagePaths,
    theme: { fontFamily: 'Arial' },
  }),
);
for (const [index, file] of pagePaths.entries())
  await fs.writeFile(path.join(projectRoot, file), YAML.stringify(fixtures[index]));
await fs.writeFile(
  path.join(projectRoot, assetPath),
  '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><rect width="40" height="40" fill="#537f6d"/><circle cx="20" cy="20" r="10" fill="#c99a48"/></svg>\n',
);
await fs.writeFile(
  path.join(projectRoot, '.huandeng/project.json'),
  JSON.stringify(
    {
      schemaVersion: 1,
      deckId: randomUUID(),
      entry: 'deck.pptd',
      project: {
        schemaVersion: 1,
        mainStory: { purpose: '', audience: '', takeaway: '' },
        sections: [],
        presentations: [],
      },
      slides: Object.fromEntries(
        ids.map((id, index) => [
          id,
          {
            shortCode: ['A9AA', 'A9BB', 'A9CC', 'A9DD', 'A9EE', 'A9FF'][index],
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
await fs.writeFile(
  path.join(profile, 'preferences.json'),
  JSON.stringify({ recentProjects: [], uiLocale: 'en', snapping: true }),
);

const launchEnv = {
  ...process.env,
  HUANDENG_DESKTOP_DATA_DIR: profile,
  HUANDENG_RUNTIME_DIR: path.join(sandbox, 'runtime'),
};
delete launchEnv.ELECTRON_RUN_AS_NODE;
const checks = [];
const rendererErrors = [];
const screenshots = [];
const layouts = [];
const observations = [];
const normalExits = [];
const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
let application;
let page;
let serviceUrl;
let sessionToken;
let electronVersion;
let buildIdentity;
let processLog = '';
let transactionRequests = 0;
let launchCount = 0;
let finalHashes;
let failure;

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
  throw last ?? new Error('Timed out waiting for arrangement acceptance state.');
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
  const result = await response.json();
  assert.ok(response.ok && result.ok !== false, `Read failed: ${route} (${response.status})`);
  return result;
}

const canvas = () => page.locator('[data-hd-editor-canvas]');
const object = (id) => canvas().locator(`[data-hd-element-id="${id}"]`);
const source = (index) => fs.readFile(path.join(projectRoot, pagePaths[index]), 'utf8');
const disk = async (index) => YAML.parse(await source(index));
const snapToggle = () => page.locator('[data-hd-snapping-toggle]');
const guideCount = () => canvas().locator('[data-hd-snap-guide], [data-hd-gap-guide]').count();

function near(actual, expected, message, tolerance = 0.02) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${message}: ${actual}, expected ${expected} ± ${tolerance}`,
  );
}

function assertBounds(data, expected) {
  for (const [id, bounds] of Object.entries(expected)) {
    const element = data.elements.find((item) => item.elementId === id);
    assert.ok(element, `Missing element: ${id}`);
    for (const [index, value] of bounds.entries())
      near(element.bounds[index], value, `${id}[${index}]`);
  }
}

async function saved() {
  await eventually(
    async () => (await page.locator('[data-hd-save-status]').innerText()).trim() === 'Saved',
  );
}

async function persisted(index, assertion) {
  await eventually(async () => {
    assertion(await disk(index));
    return true;
  });
  await saved();
  assert.deepEqual((await api(`/pages/${ids[index]}`)).data, await disk(index));
}

async function undoToInitial(index) {
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await persisted(index, (data) => assert.deepEqual(data, fixtures[index]));
}

async function mainPage(index) {
  await saved();
  await page.getByLabel('Current slide collection', { exact: true }).selectOption('');
  await page.getByRole('button', { name: 'Slide thumbnails', exact: true }).click();
  await page.locator(`[data-hd-thumbnail="${ids[index]}"]`).click();
  await eventually(
    async () =>
      (await canvas().locator('[data-pptd-page]').getAttribute('data-pptd-page')) === ids[index],
  );
}

async function selectObject(id, additive = false) {
  // Selecting through Layers avoids a second text click entering inline editing.
  await page.locator(`[data-hd-layer="${id}"]`).click({ modifiers: additive ? ['Shift'] : [] });
  await canvas().locator(`[data-hd-selection="${id}"]`).waitFor();
}

async function liveBounds(id) {
  return object(id).evaluate((node) =>
    ['left', 'top', 'width', 'height'].map((key) => Number.parseFloat(node.style[key])),
  );
}

async function scale() {
  const bounds = await canvas().locator('[data-pptd-page]').boundingBox();
  assert.ok(bounds && bounds.width > 0, 'The slide must be visible.');
  return bounds.width / size[0];
}

async function fitScale(target) {
  await page.getByRole('button', { name: 'Fit to window', exact: true }).click();
  if (target === 0.5) {
    // Keep the proven 100% window; a narrower window can change sidebar layout.
    await eventually(async () => {
      near(await scale(), 1, 'Fit scale before manual zoom', 0.002);
      return true;
    });
    for (let step = 1; step <= 5; step++) {
      await page.getByRole('button', { name: 'Zoom out', exact: true }).click();
      await eventually(async () => {
        near(await scale(), 1 - step / 10, 'Manual zoom scale', 0.002);
        return true;
      });
    }
    layouts.push({
      targetScale: target,
      actualScale: await scale(),
      control: 'Zoom out',
      clicks: 5,
    });
    return;
  }
  const available = await canvas().evaluate((node) => ({
    width: node.getBoundingClientRect().width,
    height: node.getBoundingClientRect().height,
    viewportWidth: innerWidth,
    viewportHeight: innerHeight,
  }));
  const requested = {
    width: Math.round(available.viewportWidth + size[0] * target - available.width),
    height: Math.round(
      available.viewportHeight + Math.max(0, size[1] * target + 24 - available.height),
    ),
  };
  await application.evaluate(({ BrowserWindow }, next) => {
    BrowserWindow.getAllWindows()[0].setContentSize(next.width, next.height);
  }, requested);
  await eventually(async () => {
    near(await scale(), target, 'Fit scale', 0.002);
    return true;
  });
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
  layouts.push({ targetScale: target, actualScale: await scale(), requested });
}

async function drag(id, dx, dy, { modifiers = [], during } = {}) {
  const bounds = await object(id).boundingBox();
  assert.ok(bounds, `The dragged object must be visible: ${id}`);
  const currentScale = await scale();
  const start = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
  await page.mouse.move(start.x, start.y);
  let pressed = false;
  try {
    for (const key of modifiers) await page.keyboard.down(key);
    await page.mouse.down();
    pressed = true;
    await page.mouse.move(start.x + dx * currentScale, start.y + dy * currentScale, { steps: 4 });
    await page.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
    );
    await during?.();
  } finally {
    if (pressed) await page.mouse.up();
    for (const key of [...modifiers].reverse()) await page.keyboard.up(key);
  }
  await eventually(async () => (await guideCount()) === 0);
}

async function setSnapping(enabled) {
  await eventually(async () => !(await snapToggle().isDisabled()));
  if ((await snapToggle().getAttribute('aria-pressed')) !== String(enabled))
    await snapToggle().click();
  await eventually(
    async () =>
      (await snapToggle().getAttribute('aria-pressed')) === String(enabled) &&
      (await canvas().getAttribute('data-hd-snapping')) === String(enabled) &&
      !(await snapToggle().isDisabled()),
  );
}

async function capture(name) {
  const file = `${name}.png`;
  await page.screenshot({
    path: path.join(evidence, file),
    animations: 'disabled',
    timeout: 15000,
  });
  screenshots.push(file);
}

async function sourceHashes() {
  return Promise.all(
    ['deck.pptd', ...pagePaths, assetPath].map(async (file) => ({
      path: file,
      sha256: createHash('sha256')
        .update(await fs.readFile(path.join(projectRoot, file)))
        .digest('hex'),
    })),
  );
}

async function launch() {
  sessionToken = undefined;
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
  launchCount += 1;
  application.process().stderr?.on('data', (data) => {
    processLog = `${processLog}${data}`.slice(-12000);
  });
  page = await application.firstWindow();
  page.setDefaultTimeout(15000);
  page.on('pageerror', (error) => rendererErrors.push(error.message));
  page.on('request', (request) => {
    if (request.method() === 'POST' && /\/__pptd\/transactions$/.test(request.url()))
      transactionRequests += 1;
  });
  await canvas().waitFor({ timeout: 120000 });
  const context = await page.evaluate(() => window.huandengDesktop.getContext());
  assert.equal(path.resolve(context.entryPath).toLowerCase(), path.resolve(entry).toLowerCase());
  serviceUrl = context.serviceUrl;
  const session = await api('/session');
  sessionToken = session.sessionToken;
  assert.equal(session.writable, true);
  electronVersion = await application.evaluate(() => process.versions.electron);
  buildIdentity = await fs
    .readFile(path.join(path.dirname(executablePath), 'huandeng-build.json'), 'utf8')
    .then((value) => JSON.parse(value.replace(/^\uFEFF/, '')))
    .catch(() => null);
  await application.evaluate(({ BrowserWindow }) => {
    const window = BrowserWindow.getAllWindows()[0];
    if (window.isMinimized()) window.restore();
    if (window.isMaximized()) window.unmaximize();
    window.setContentSize(1600, 1000);
    window.show();
    window.focus();
  });
  await page.bringToFront();
  await eventually(() => page.evaluate(() => document.documentElement.lang === 'en'));
  await saved();
}

async function closeNormally() {
  await saved();
  const exited = new Promise((resolve) =>
    application.process().once('exit', (code, signal) => resolve({ code, signal })),
  );
  await application.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].close());
  let timer;
  let exit;
  try {
    exit = await Promise.race([
      exited,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('Candidate did not close normally.')), 20000);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
  normalExits.push({ launch: launchCount, ...exit });
  assert.deepEqual(exit, { code: 0, signal: null });
  application = undefined;
  page = undefined;
}

try {
  await launch();
  await fitScale(1);
  await setSnapping(true);

  await check(
    'Shift held before pointer-down preserves selection and locks the other axis',
    async () => {
      await mainPage(0);
      await selectObject('moving');
      const before = transactionRequests;
      await drag('moving', 50, 2, {
        modifiers: ['Shift'],
        during: async () => {
          assertBounds(
            { elements: [{ elementId: 'moving', bounds: await liveBounds('moving') }] },
            { moving: [150, 100, 100, 40] },
          );
          assert.equal(await canvas().locator('[data-hd-snap-guide="y"]').count(), 0);
        },
      });
      await persisted(0, (data) => assertBounds(data, { moving: [150, 100, 100, 40] }));
      assert.equal(transactionRequests - before, 1, 'One drag commits one transaction.');
      assert.equal(await canvas().locator('[data-hd-selection="moving"]').count(), 1);
      await undoToInitial(0);
    },
  );

  await check(
    'A selected group moves without snapping to its own children and undoes together',
    async () => {
      await mainPage(1);
      await selectObject('group');
      await drag('group', 3, 30, { during: async () => assert.equal(await guideCount(), 0) });
      await persisted(1, (data) =>
        assertBounds(data, {
          group: [103, 130, 120, 20],
          'child-a': [103, 130, 40, 20],
          'child-b': [183, 130, 40, 20],
        }),
      );
      await undoToInitial(1);
    },
  );

  await check(
    'Text snaps to equal gaps; Alt and the local toggle both bypass all guides',
    async () => {
      await mainPage(2);
      await selectObject('moving');
      await drag('moving', 177, 0, {
        during: async () => {
          const distances = await canvas()
            .locator('[data-hd-gap-guide="x"]')
            .evaluateAll((nodes) =>
              nodes.map((node) => Number(node.getAttribute('data-hd-gap-distance'))),
            );
          assert.deepEqual(distances, [40, 40]);
          observations.push({ name: 'equal-gaps', distances, bounds: await liveBounds('moving') });
          await capture('equal-gaps');
        },
      });
      await persisted(2, (data) => assertBounds(data, { moving: [180, 50, 80, 40] }));
      await undoToInitial(2);
      await selectObject('moving');
      await drag('moving', 177, 0, {
        modifiers: ['Alt'],
        during: async () => assert.equal(await guideCount(), 0),
      });
      await persisted(2, (data) => assertBounds(data, { moving: [177, 50, 80, 40] }));
      await undoToInitial(2);
      await setSnapping(false);
      await selectObject('moving');
      await drag('moving', 177, 0, { during: async () => assert.equal(await guideCount(), 0) });
      await persisted(2, (data) => assertBounds(data, { moving: [177, 50, 80, 40] }));
      await undoToInitial(2);
      await setSnapping(true);
    },
  );

  await check(
    'Escape while the pointer is down restores the draft and leaves source bytes unchanged',
    async () => {
      await mainPage(3);
      await selectObject('moving');
      const original = await source(3);
      const before = transactionRequests;
      await drag('moving', 153, 87, {
        during: async () => {
          near((await liveBounds('moving'))[0], 253, 'Preview moves before cancellation');
          await page.keyboard.press('Escape');
        },
      });
      await persisted(3, (data) => assert.deepEqual(data, fixtures[3]));
      assert.deepEqual(await liveBounds('moving'), [100, 100, 100, 40]);
      assert.equal(await source(3), original);
      assert.equal(transactionRequests, before, 'Cancelled drag must not submit a transaction.');
    },
  );

  await check(
    'Image edge snapping uses the same five-screen-pixel threshold at 100% and 50%',
    async () => {
      await mainPage(4);
      await eventually(() =>
        object('moving')
          .locator('img')
          .evaluate((image) => image.complete && image.naturalWidth > 0),
      );
      for (const target of [1, 0.5]) {
        await fitScale(target);
        await selectObject('moving');
        const actualScale = await scale();
        const rawX = 260 - 4 / actualScale;
        await drag('moving', rawX, 0, {
          during: async () => {
            assert.equal(
              await canvas()
                .locator('[data-hd-snap-guide="x"][data-hd-guide-position="300"]')
                .count(),
              1,
            );
            observations.push({
              name: 'four-screen-pixels',
              actualScale,
              rawX,
              bounds: await liveBounds('moving'),
            });
          },
        });
        await persisted(4, (data) => assertBounds(data, { moving: [260, 100, 40, 40] }));
        await undoToInitial(4);
      }
      await selectObject('moving');
      const actualScale = await scale();
      const rawX = 260 - 7 / actualScale;
      await drag('moving', rawX, 0, { during: async () => assert.equal(await guideCount(), 0) });
      await persisted(4, (data) => assertBounds(data, { moving: [rawX, 100, 40, 40] }));
      observations.push({
        name: 'seven-screen-pixels-outside',
        actualScale,
        bounds: (await disk(4)).elements[0].bounds,
      });
      await undoToInitial(4);
      await fitScale(1);
    },
  );

  await check(
    'Unequal widths distribute by gaps; one Undo, Redo, save and normal reopen preserve the result',
    async () => {
      await mainPage(5);
      await selectObject('first');
      await selectObject('middle', true);
      await selectObject('last', true);
      const expected = {
        first: [60, 100, 40, 20],
        middle: [200, 100, 60, 20],
        last: [360, 100, 80, 20],
      };
      const before = transactionRequests;
      await page.locator('[data-hd-distribute="x"]').click();
      await persisted(5, (data) => assertBounds(data, expected));
      assert.equal(transactionRequests - before, 1, 'Distribution commits one transaction.');
      await undoToInitial(5);
      await page.getByRole('button', { name: 'Redo', exact: true }).click();
      await persisted(5, (data) => assertBounds(data, expected));
      await canvas().focus();
      await page.keyboard.press(`${modifier}+s`);
      await saved();
      await setSnapping(false);
      finalHashes = await sourceHashes();
      await capture('distributed-saved');
      await closeNormally();
      await launch();
      await mainPage(5);
      await eventually(
        async () =>
          (await snapToggle().getAttribute('aria-pressed')) === 'false' &&
          !(await snapToggle().isDisabled()),
      );
      assert.equal(await canvas().getAttribute('data-hd-snapping'), 'false');
      assert.deepEqual(await sourceHashes(), finalHashes);
      await persisted(5, (data) => assertBounds(data, expected));
      for (let index = 0; index < 5; index++) assert.deepEqual(await disk(index), fixtures[index]);
      await capture('reopened');
    },
  );

  assert.deepEqual(rendererErrors, []);
  await closeNormally();
} catch (error) {
  failure = error;
  await page
    ?.screenshot({ path: path.join(evidence, 'failure.png'), timeout: 10000 })
    .catch(() => {});
} finally {
  await application?.close().catch(() => {});
  const report = {
    passed: !failure,
    timestamp: new Date().toISOString(),
    executablePath,
    buildIdentity,
    electronVersion,
    sandbox,
    entry,
    syntheticOnly: true,
    checks,
    rendererErrors,
    normalExits,
    screenshots,
    layouts,
    observations,
    transactionRequests,
    sourceHashesAfterSave: finalHashes,
    ...(failure ? { error: failure.stack ?? String(failure), processLog } : {}),
  };
  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(
    `${JSON.stringify({ passed: report.passed, checks: checks.length, reportPath, normalExits })}\n`,
  );
  if (failure) {
    process.stderr.write(`${failure.stack ?? failure}\n`);
    process.exitCode = 1;
  }
}
