// biome-ignore-all lint/suspicious/noUndeclaredEnvVars: Acceptance selects an isolated candidate, profile and runtime.
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
assert.ok(executablePath, 'Set HUANDENG_DESKTOP_EXE to the candidate executable.');
const sandbox = await fs.mkdtemp(path.join(os.tmpdir(), 'huandeng-object-workspace-v010-'));
const project = path.join(sandbox, 'synthetic-project');
const entry = path.join(project, 'deck.pptd');
const profile = path.join(sandbox, 'profile');
const evidence = path.join(root, '.verification/object-workspace-v010', path.basename(sandbox));
const ids = [randomUUID(), randomUUID(), randomUUID()];
const pagePaths = ['pages/format.page', 'pages/layers.page', 'pages/drafts.page'];
const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
const redoKeys = process.platform === 'darwin' ? 'Meta+Shift+z' : 'Control+y';
const imagePath = 'media/evidence.svg';
const svg =
  '<svg xmlns="http://www.w3.org/2000/svg" width="180" height="120" viewBox="0 0 180 120"><rect width="180" height="120" rx="12" fill="#0f766e"/><circle cx="90" cy="60" r="34" fill="#fbbf24"/></svg>\n';
const plainText = 'A useful candidate\nNeeds evidence beyond affinity';
const shape = (elementId, bounds, color) => ({
  elementId,
  elementType: 'shape',
  shapeName: 'rect',
  bounds,
  fill: { type: 'solid', color },
});
const fixtures = [
  {
    title: 'Object formatting',
    elements: [
      {
        elementId: 'title',
        elementType: 'text',
        bounds: [44, 32, 860, 110],
        content: { text: plainText, style: '$body' },
      },
      {
        elementId: 'subtitle',
        elementType: 'text',
        bounds: [270, 185, 600, 72],
        content: {
          text: 'Keep the original wording · 保留原文',
          fontSize: 22,
          fontFamily: 'Arial',
          color: '#334155',
        },
      },
      {
        elementId: 'image',
        elementType: 'image',
        src: imagePath,
        bounds: [44, 185, 180, 120],
        fit: { mode: 'contain' },
      },
      shape('accent', [44, 365, 180, 80], '#c4d9d3'),
    ],
    notes: 'Synthetic acceptance notes. Preserve this sentence.',
  },
  {
    title: 'Layer order',
    elements: [
      shape('back-a', [35, 150, 120, 130], '#c4d9d3'),
      shape('back-b', [215, 150, 120, 130], '#a7c9c0'),
      {
        elementId: 'target',
        elementType: 'image',
        src: imagePath,
        bounds: [395, 150, 160, 130],
        fit: { mode: 'contain' },
      },
      shape('front-a', [615, 150, 120, 130], '#77ab9c'),
      shape('front-b', [795, 150, 120, 130], '#537f6d'),
    ],
    notes: 'Layer actions must preserve every object and its content.',
  },
  {
    title: 'Inspector drafts',
    elements: [
      {
        elementId: 'heading',
        elementType: 'text',
        bounds: [44, 30, 860, 60],
        content: { text: 'Draft state belongs to this slide', fontSize: 28, fontFamily: 'Arial' },
      },
      {
        elementId: 'chart',
        elementType: 'chart',
        bounds: [65, 125, 810, 330],
        data: {
          cols: ['Category', 'Value'],
          rows: [
            ['A', 2],
            ['B', 4],
          ],
        },
        series: [{ type: 'bar', encode: { x: 'Category', y: 'Value' } }],
      },
    ],
    notes: 'Chart and Story drafts should survive Inspector tab changes.',
  },
];

for (const folder of ['pages', 'media', '.huandeng'])
  await fs.mkdir(path.join(project, folder), { recursive: true });
await fs.mkdir(profile, { recursive: true });
await fs.mkdir(evidence, { recursive: true });
await fs.writeFile(path.join(profile, 'preferences.json'), JSON.stringify({ recentProjects: [] }));
await fs.writeFile(
  entry,
  YAML.stringify({
    title: 'HUANDENG object and workspace acceptance',
    size: [960, 540],
    pages: pagePaths,
    theme: {
      fontFamily: 'Arial',
      textStyles: { body: { fontFamily: 'Arial', fontSize: 20, color: '#111827' } },
    },
  }),
);
for (const [index, file] of pagePaths.entries())
  await fs.writeFile(path.join(project, file), YAML.stringify(fixtures[index]));
await fs.writeFile(path.join(project, imagePath), svg);
await fs.writeFile(
  path.join(project, 'media/source.json'),
  '{"synthetic":true,"purpose":"supporting file"}\n',
);
await fs.writeFile(
  path.join(project, 'media/analysis.py'),
  'print("synthetic supporting script; never executed")\n',
);
const importPath = path.join(sandbox, 'import-example.svg');
await fs.writeFile(importPath, svg.replace('#0f766e', '#2563eb'));
await fs.writeFile(
  path.join(project, '.huandeng/project.json'),
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
            shortCode: ['OBJ1', 'OBJ2', 'OBJ3'][index],
            label: `S${index + 1}`,
            path: pagePaths[index],
            state: 'active',
            ...(index === 0
              ? {
                  themeOverride: {
                    fontFamily: 'Arial',
                    textStyles: {
                      body: {
                        fontFamily: 'Arial',
                        fontSize: 28,
                        color: '#112233',
                        bold: false,
                        italic: false,
                        underline: false,
                      },
                    },
                  },
                }
              : {}),
          },
        ]),
      ),
    },
    null,
    2,
  ),
);

const env = {
  ...process.env,
  HUANDENG_DESKTOP_DATA_DIR: profile,
  HUANDENG_RUNTIME_DIR: path.join(sandbox, 'runtime'),
};
delete env.ELECTRON_RUN_AS_NODE;
const checks = [];
const screenshots = [];
const rendererErrors = [];
const exits = [];
const layouts = [];
const observations = [];
let app;
let page;
let serviceUrl;
let sessionToken;
let identity;
let processLog = '';
let transactionRequests = 0;
let failure;
let launchCount = 0;

async function eventually(read, timeout = 15000) {
  const end = Date.now() + timeout;
  let last;
  while (Date.now() < end) {
    try {
      const value = await read();
      if (value) return value;
    } catch (error) {
      last = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 75));
  }
  throw last ?? new Error('Timed out waiting for object/workspace state.');
}

async function check(name, action) {
  const started = Date.now();
  try {
    await action();
    checks.push({ name, passed: true, milliseconds: Date.now() - started });
    process.stdout.write(`PASS ${name}\n`);
  } catch (error) {
    checks.push({ name, passed: false, milliseconds: Date.now() - started, error: String(error) });
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
const inspector = () => page.locator('[data-hd-inspector]');
const tab = (id) => inspector().locator(`[data-hd-inspector-tab="${id}"]`);
const menu = () => page.locator('[data-hd-object-menu]:visible');
const notes = () => page.locator('[data-hd-notes-dock]:visible');
const disk = async (index) =>
  YAML.parse(await fs.readFile(path.join(project, pagePaths[index]), 'utf8'));
const clone = (value) => structuredClone(value);
const ordered = (data) => data.elements.map((element) => element.elementId);
const pathKey = (value) =>
  process.platform === 'win32' ? path.resolve(value).toLowerCase() : path.resolve(value);

async function saved() {
  await eventually(async () =>
    /^Saved(?:$|\s|·)/.test((await page.locator('[data-hd-save-status]').innerText()).trim()),
  );
}

async function persisted(index, expected) {
  await eventually(async () => {
    const data = await disk(index);
    if (typeof expected === 'function') expected(data);
    else assert.deepEqual(data, expected);
    assert.deepEqual((await api(`/pages/${ids[index]}`)).data, data);
    return true;
  });
  await saved();
}

async function signature() {
  return Object.fromEntries(
    await Promise.all(
      [
        'deck.pptd',
        '.huandeng/project.json',
        ...pagePaths,
        imagePath,
        'media/source.json',
        'media/analysis.py',
      ].map(async (file) => [
        file,
        createHash('sha256')
          .update(await fs.readFile(path.join(project, file)))
          .digest('hex'),
      ]),
    ),
  );
}

async function capture(name) {
  await page.screenshot({
    path: path.join(evidence, name),
    animations: 'disabled',
    timeout: 15000,
  });
  screenshots.push(name);
}

async function launch() {
  sessionToken = undefined;
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
  launchCount += 1;
  app.process().stderr?.on('data', (data) => {
    processLog = `${processLog}${data}`.slice(-12000);
  });
  page = await app.firstWindow();
  page.setDefaultTimeout(15000);
  page.on('pageerror', (error) => rendererErrors.push(error.message));
  page.on('request', (request) => {
    if (request.method() === 'POST' && /\/__pptd\/transactions$/.test(request.url()))
      transactionRequests += 1;
  });
  await canvas().waitFor({ timeout: 120000 });
  const context = await page.evaluate(() => window.huandengDesktop.getContext());
  assert.equal(pathKey(context.entryPath), pathKey(entry));
  serviceUrl = context.serviceUrl;
  const session = await api('/session');
  sessionToken = session.sessionToken;
  assert.equal(session.writable, true);
  assert.deepEqual(
    session.pages.map((item) => item.pageId),
    ids,
  );
  identity = await fs
    .readFile(path.join(path.dirname(executablePath), 'huandeng-build.json'), 'utf8')
    .then((value) => JSON.parse(value.replace(/^\uFEFF/, '')))
    .catch(() => null);
  await app.evaluate(({ BrowserWindow }) => {
    const window = BrowserWindow.getAllWindows()[0];
    if (window.isMinimized()) window.restore();
    if (window.isMaximized()) window.unmaximize();
    window.setContentSize(1600, 1000);
    window.show();
    window.focus();
  });
  await page.bringToFront();
  await saved();
}

async function closeNormally({ waitForSaved = true } = {}) {
  if (!app) return;
  if (waitForSaved) await saved();
  const current = app;
  const exit = new Promise((resolve) =>
    current.process().once('exit', (code, signal) => resolve({ code, signal })),
  );
  await current.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].close());
  let timer;
  try {
    const result = await Promise.race([
      exit,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('Candidate did not close normally.')), 20000);
      }),
    ]);
    exits.push({ launch: launchCount, ...result });
    assert.deepEqual(result, { code: 0, signal: null });
    app = undefined;
  } finally {
    clearTimeout(timer);
  }
}

async function mainPage(index) {
  await saved();
  await page.locator('.hd-collection-select').selectOption('');
  await page.getByRole('button', { name: 'Slide thumbnails', exact: true }).click();
  await page.locator(`[data-hd-thumbnail="${ids[index]}"]`).click();
  await canvas().locator(`[data-pptd-page="${ids[index]}"]`).waitFor();
}

async function selected(expected) {
  await eventually(async () => {
    const actual = await canvas()
      .locator('[data-hd-selection]')
      .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-hd-selection')).sort());
    assert.deepEqual(actual, [...expected].sort());
    return true;
  });
}

async function selectObject(id, additive = false) {
  await tab('layers').click();
  await inspector()
    .locator(`[data-hd-layer="${id}"]`)
    .click({ modifiers: additive ? ['Shift'] : [] });
  await canvas().locator(`[data-hd-selection="${id}"]`).waitFor();
}

async function dismissMenu() {
  if (await menu().count()) await page.keyboard.press('Escape');
  await page.locator('[data-hd-object-menu]').waitFor({ state: 'hidden' });
}

async function openMenu(id) {
  if (await menu().count()) await dismissMenu();
  await object(id).click({ button: 'right' });
  await menu().waitFor();
}

async function chooseMenu(id, label, submenu) {
  await openMenu(id);
  if (submenu)
    await menu()
      .getByRole('menuitem', { name: new RegExp(`^${submenu}(?:\\s|$)`) })
      .hover();
  await page
    .getByRole('menuitem', {
      name: new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\s|$)`),
    })
    .click();
  await page.locator('[data-hd-object-menu]').waitFor({ state: 'hidden' });
}

async function shortcut(keys) {
  await canvas().focus();
  await page.keyboard.press(keys);
}

async function undo(index, expected) {
  await shortcut(`${modifier}+z`);
  await persisted(index, expected);
}
async function redo(index, expected) {
  await shortcut(redoKeys);
  await persisted(index, expected);
}

async function resize(label, dx, dy) {
  const handle = page.getByRole('separator', { name: label, exact: true });
  const before = Number(await handle.getAttribute('aria-valuenow'));
  const bounds = await handle.boundingBox();
  assert.ok(
    bounds && bounds.width > 0 && bounds.height > 0,
    `Resize edge must have visible width and height: ${label}`,
  );
  const start = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  try {
    await page.mouse.move(start.x + dx, start.y + dy, { steps: 5 });
  } finally {
    await page.mouse.up();
  }
  const value = Number(await handle.getAttribute('aria-valuenow'));
  assert.notEqual(value, before, `${label} must respond to dragging its edge.`);
  layouts.push({ label, before, after: value });
  return value;
}

async function openSettings() {
  await page.getByRole('button', { name: 'Workspace settings', exact: true }).click();
  const settings = page.locator('[data-hd-workspace-settings]');
  await settings.waitFor();
  return settings;
}

try {
  await check('fresh profile defaults to English and keeps document text verbatim', async () => {
    await launch();
    assert.equal(await page.locator('html').getAttribute('lang'), 'en');
    assert.deepEqual(
      await page
        .locator('.hd-navigation-tabs button')
        .allTextContents()
        .then((items) => items.slice(0, 4).map((item) => item.trim())),
      ['Project', 'Pages', 'Assets', 'Files'],
    );
    assert.match(
      (await page.locator('.hd-collection-select option:checked').innerText()).trim(),
      /^Main Slides\b/,
    );
    assert.ok((await canvas().innerText()).includes('保留原文'));
    const nativeMenus = await app.evaluate(({ Menu }) =>
      Menu.getApplicationMenu().items.map((item) => item.label),
    );
    assert.ok(
      nativeMenus.includes('File') && nativeMenus.includes('View'),
      JSON.stringify(nativeMenus),
    );
    const fontSize = await object('title')
      .locator('[data-hd-text-content]')
      .evaluate((node) => getComputedStyle(node).fontSize);
    assert.equal(fontSize, '28px', 'The page theme override must control the effective text size.');
    await capture('01-english-workspace.png');
  });

  await check(
    'right-click image selects it, exposes object actions and focuses Properties',
    async () => {
      const before = await signature();
      await selectObject('title');
      await openMenu('image');
      await selected(['image']);
      assert.equal(await menu().getByRole('menuitemcheckbox').count(), 0);
      for (const name of ['Copy', 'Cut', 'Paste', 'Duplicate', 'Arrange', 'Properties…', 'Delete'])
        assert.equal(
          await menu()
            .getByRole('menuitem', { name: new RegExp(`^${name}(?:\\s|$)`) })
            .count(),
          1,
        );
      await capture('02-image-menu.png');
      await menu()
        .getByRole('menuitem', { name: /^Properties…/ })
        .click();
      await page.locator('[data-hd-object-menu]').waitFor({ state: 'hidden' });
      await eventually(
        async () =>
          (await tab('properties').getAttribute('aria-selected')) === 'true' &&
          (await tab('properties').evaluate((node) => node === document.activeElement)),
      );
      assert.deepEqual(await signature(), before);
    },
  );

  await check('Bold Italic Underline use the same menu, keyboard and Undo/Redo state', async () => {
    for (const [flag, name, key, css, value] of [
      ['bold', 'Bold', 'b', 'fontWeight', '700'],
      ['italic', 'Italic', 'i', 'fontStyle', 'italic'],
      ['underline', 'Underline', 'u', 'textDecorationLine', 'underline'],
    ]) {
      const before = await disk(0);
      const after = clone(before);
      after.elements.find((item) => item.elementId === 'title').content[flag] = true;
      await openMenu('title');
      await menu()
        .getByRole('menuitemcheckbox', { name: new RegExp(`^${name}(?:\\s|$)`) })
        .click();
      await dismissMenu();
      await persisted(0, after);
      assert.equal(
        await object('title')
          .locator('[data-hd-text-content]')
          .evaluate((node, property) => getComputedStyle(node)[property], css),
        value,
      );
      await openMenu('title');
      assert.equal(
        await menu()
          .getByRole('menuitemcheckbox', { name: new RegExp(`^${name}(?:\\s|$)`) })
          .getAttribute('aria-checked'),
        'true',
      );
      await dismissMenu();
      await undo(0, before);
      await shortcut(`${modifier}+${key}`);
      await persisted(0, after);
      await undo(0, before);
      await redo(0, after);
      await undo(0, before);
    }
    assert.equal(
      (await disk(0)).elements.find((item) => item.elementId === 'title').content.text,
      plainText,
    );
  });

  await check(
    'text size uses effective page theme and color menu changes rendered text',
    async () => {
      const before = await disk(0);
      for (const [name, keys, size] of [
        ['Increase font size', `${modifier}+Shift+>`, 30],
        ['Decrease font size', `${modifier}+Shift+<`, 26],
      ]) {
        const after = clone(before);
        after.elements.find((item) => item.elementId === 'title').content.fontSize = size;
        await chooseMenu('title', name);
        await persisted(0, after);
        assert.equal(
          await object('title')
            .locator('[data-hd-text-content]')
            .evaluate((node) => getComputedStyle(node).fontSize),
          `${size}px`,
        );
        await undo(0, before);
        await shortcut(keys);
        await persisted(0, after);
        await undo(0, before);
      }
      const after = clone(before);
      after.elements.find((item) => item.elementId === 'title').content.color = '#0f766e';
      await chooseMenu('title', 'Teal', 'Text color');
      await persisted(0, after);
      assert.equal(
        await object('title')
          .locator('[data-hd-text-content]')
          .evaluate((node) => getComputedStyle(node).color),
        'rgb(15, 118, 110)',
      );
      await undo(0, before);
    },
  );

  await check(
    'right-click preserves multiselection and keyboard menu returns canvas focus',
    async () => {
      const before = await disk(0);
      await selectObject('title');
      await selectObject('subtitle', true);
      await openMenu('title');
      await selected(['title', 'subtitle']);
      const transactionsBefore = transactionRequests;
      await menu()
        .getByRole('menuitemcheckbox', { name: /^Bold(?:\s|$)/ })
        .click();
      await dismissMenu();
      const after = clone(before);
      for (const item of after.elements)
        if (['title', 'subtitle'].includes(item.elementId)) item.content.bold = true;
      await persisted(0, after);
      assert.equal(
        transactionRequests - transactionsBefore,
        1,
        'A multiselection format action must be one transaction.',
      );
      await undo(0, before);
      await selected(['title', 'subtitle']);
      await selectObject('title');
      await object('title').focus();
      await page.keyboard.press('Shift+F10');
      await menu().waitFor();
      await page.keyboard.press('ArrowDown');
      assert.equal(await menu().evaluate((node) => node.contains(document.activeElement)), true);
      await capture('03-keyboard-text-menu.png');
      await dismissMenu();
      await eventually(() => object('title').evaluate((node) => node === document.activeElement));
    },
  );

  await check(
    'all four image layer commands match keyboard actions and preserve source',
    async () => {
      await mainPage(1);
      const before = await disk(1);
      const cases = [
        ['Bring forward', `${modifier}+]`, ['back-a', 'back-b', 'front-a', 'target', 'front-b']],
        ['Send backward', `${modifier}+[`, ['back-a', 'target', 'back-b', 'front-a', 'front-b']],
        [
          'Bring to front',
          `${modifier}+Shift+]`,
          ['back-a', 'back-b', 'front-a', 'front-b', 'target'],
        ],
        [
          'Send to back',
          `${modifier}+Shift+[`,
          ['target', 'back-a', 'back-b', 'front-a', 'front-b'],
        ],
      ];
      for (const [label, keys, expected] of cases) {
        const after = {
          ...clone(before),
          elements: expected.map((id) =>
            clone(before.elements.find((item) => item.elementId === id)),
          ),
        };
        await chooseMenu('target', label, 'Arrange');
        await persisted(1, after);
        await selected(['target']);
        assert.deepEqual(
          await canvas()
            .locator('[data-pptd-page] > [data-hd-element-id]')
            .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-hd-element-id'))),
          expected,
        );
        await undo(1, before);
        await shortcut(keys);
        await persisted(1, after);
        await undo(1, before);
      }
      await tab('layers').click();
      await capture('04-layer-controls.png');
    },
  );

  await check(
    'Inspector tabs retain unsaved Story and chart drafts without document writes',
    async () => {
      await mainPage(2);
      const before = await signature();
      await selectObject('chart');
      await tab('properties').click();
      const chart = inspector().getByLabel('Chart data', { exact: true });
      const chartDraft = 'Category\tValue\nDraft retained\t9';
      await chart.fill(chartDraft);
      await tab('story').click();
      const story = inspector().locator('[data-hd-story]');
      await story.getByRole('button', { name: 'Edit intent', exact: true }).click();
      const storyDraft = 'Keep this Story draft while inspecting the slide.';
      await story.getByLabel('Slide authoring intent', { exact: true }).fill(storyDraft);
      await tab('layers').click();
      await tab('checks').click();
      assert.ok(
        (
          await inspector().getByRole('tabpanel', { name: 'Checks', exact: true }).innerText()
        ).includes('File, font and layout diagnostics'),
      );
      await tab('properties').click();
      assert.equal(await chart.inputValue(), chartDraft);
      await tab('story').click();
      assert.equal(
        await story.getByLabel('Slide authoring intent', { exact: true }).inputValue(),
        storyDraft,
      );
      await capture('05-story-draft.png');
      assert.deepEqual(await signature(), before);
      await tab('story').press('Home');
      assert.equal(await tab('properties').getAttribute('aria-selected'), 'true');
      await page.keyboard.press('ArrowRight');
      assert.equal(await tab('layers').getAttribute('aria-selected'), 'true');
      await page.keyboard.press('End');
      assert.equal(await tab('checks').getAttribute('aria-selected'), 'true');
      await tab('story').click();
      await story.getByRole('button', { name: 'Cancel intent changes', exact: true }).click();
      await tab('properties').click();
      await inspector().getByRole('button', { name: 'Reload current data', exact: true }).click();
      assert.deepEqual(await signature(), before);
      await saved();
    },
  );

  await check(
    'Notes resize, dock and preserve content while text inputs keep shortcut ownership',
    async () => {
      await mainPage(0);
      await selectObject('title');
      await page.getByRole('button', { name: 'Notes', exact: true }).click();
      await notes().waitFor();
      assert.equal(await notes().getAttribute('data-hd-notes-dock'), 'bottom');
      const height = await resize('Resize Notes height', 0, -72);
      await page
        .getByRole('separator', { name: 'Resize Notes height', exact: true })
        .press('ArrowUp');
      assert.equal(
        Number(
          await page
            .getByRole('separator', { name: 'Resize Notes height', exact: true })
            .getAttribute('aria-valuenow'),
        ),
        height + 16,
      );
      const before = await disk(0);
      const after = {
        ...clone(before),
        notes: 'Synthetic Notes edited through the workspace.\nKeep this text when docking.',
      };
      await notes().getByRole('textbox', { name: 'Speaker notes', exact: true }).fill(after.notes);
      await page.keyboard.press(`${modifier}+b`);
      await persisted(0, after);
      await notes().getByRole('button', { name: 'Dock Notes on right', exact: true }).click();
      await page.locator('[data-hd-notes-dock="right"]').waitFor();
      assert.equal(
        await notes().getByRole('textbox', { name: 'Speaker notes', exact: true }).inputValue(),
        after.notes,
      );
      assert.equal(await inspector().isVisible(), false);
      await resize('Resize Notes width', -64, 0);
      await capture('06-notes-right.png');
      await notes().getByRole('button', { name: 'Show Properties', exact: true }).click();
      assert.equal(await notes().count(), 0);
      assert.equal(await inspector().isVisible(), true);
      await page.getByRole('button', { name: 'Notes', exact: true }).click();
      assert.equal(
        await notes().getByRole('textbox', { name: 'Speaker notes', exact: true }).inputValue(),
        after.notes,
      );
      await notes().getByRole('button', { name: 'Dock Notes below', exact: true }).click();
      assert.equal(await notes().getAttribute('data-hd-notes-dock'), 'bottom');
      await notes().getByRole('button', { name: 'Hide Notes', exact: true }).click();
      await persisted(0, after);
    },
  );

  await check(
    'Assets defaults to images and supporting JSON/Python remain accessible in All files and Files',
    async () => {
      const before = await signature();
      await page.getByRole('button', { name: 'Project asset library', exact: true }).click();
      const assets = page.locator('[data-hd-asset-library]');
      await eventually(
        async () =>
          (await assets.getAttribute('aria-busy')) === 'false' &&
          (await assets.locator(`[data-hd-asset-path="${imagePath}"]`).count()) === 1,
      );
      assert.equal(
        await assets
          .getByRole('button', { name: 'Images', exact: true })
          .getAttribute('aria-pressed'),
        'true',
      );
      assert.equal(
        await assets.locator('[data-hd-asset-path$=".json"], [data-hd-asset-path$=".py"]').count(),
        0,
      );
      await assets.getByRole('button', { name: 'All files', exact: true }).click();
      await assets.locator('[data-hd-asset-path="media/source.json"]').waitFor();
      await assets.locator('[data-hd-asset-path="media/analysis.py"]').click();
      const detail = assets.locator('[data-hd-asset-detail="media/analysis.py"]');
      await detail.waitFor();
      assert.equal(
        await detail.getByRole('button', { name: 'Use on this slide', exact: true }).count(),
        0,
      );
      assert.ok((await assets.innerText()).includes('Documents and scripts are supporting files.'));
      await capture('07-supporting-files.png');
      await page.getByRole('button', { name: 'Project files', exact: true }).click();
      await page.locator('[data-hd-project-file="media/source.json"]').waitFor();
      await page.locator('[data-hd-project-file="media/analysis.py"]').click();
      assert.deepEqual(await signature(), before);
    },
  );

  await check(
    'image reuse and import place real editable objects and Undo restores the slide',
    async () => {
      await page.getByRole('button', { name: 'Project asset library', exact: true }).click();
      const assets = page.locator('[data-hd-asset-library]');
      await assets.locator(`[data-hd-asset-path="${imagePath}"]`).click();
      const before = await disk(0);
      await assets.getByRole('button', { name: 'Use on this slide', exact: true }).click();
      await persisted(0, (data) => {
        const added = data.elements.filter(
          (item) => !before.elements.some((old) => old.elementId === item.elementId),
        );
        assert.equal(added.length, 1);
        assert.equal(added[0].elementType, 'image');
        assert.equal(added[0].src, imagePath);
        assert.ok(added[0].bounds[2] > 0 && added[0].bounds[3] > 0);
      });
      await undo(0, before);
      const chooserPromise = page.waitForEvent('filechooser');
      await assets.getByRole('button', { name: 'Import and place', exact: true }).click();
      await (await chooserPromise).setFiles(importPath);
      let imported;
      await persisted(0, (data) => {
        const added = data.elements.filter(
          (item) => !before.elements.some((old) => old.elementId === item.elementId),
        );
        assert.equal(added.length, 1);
        imported = added[0];
        assert.equal(imported.elementType, 'image');
        assert.match(imported.src, /^media\//);
      });
      await fs.access(path.join(project, imported.src));
      await selected([imported.elementId]);
      await capture('08-imported-image.png');
      await undo(0, before);
    },
  );

  await check('dragging a library image onto the slide places it through the editor', async () => {
    const before = await disk(0);
    const asset = page.locator(`[data-hd-asset-path="${imagePath}"]`);
    await asset.scrollIntoViewIfNeeded();
    await asset.dragTo(canvas(), { targetPosition: { x: 200, y: 220 } });
    await persisted(0, (data) => {
      const added = data.elements.filter(
        (item) => !before.elements.some((old) => old.elementId === item.elementId),
      );
      assert.equal(added.length, 1);
      assert.equal(added[0].src, imagePath);
    });
    await undo(0, before);
  });

  await check(
    'panel edges collapse and resize; layout survives normal close and reopen',
    async () => {
      await resize('Resize Project navigation', 48, 0);
      await resize('Resize Inspector', -48, 0);
      await page.getByRole('button', { name: 'Hide project navigation', exact: true }).click();
      assert.equal(await page.locator('.hd-navigation').isVisible(), false);
      await page.getByRole('button', { name: 'Show project navigation', exact: true }).click();
      await inspector()
        .getByRole('button', { name: 'Collapse properties panel', exact: true })
        .click();
      assert.equal(await inspector().isVisible(), false);
      await page.getByRole('button', { name: 'Show object properties', exact: true }).click();
      await page.getByRole('button', { name: 'Notes', exact: true }).click();
      await notes().getByRole('button', { name: 'Dock Notes on right', exact: true }).click();
      const layout = await eventually(async () => {
        const value = await page.evaluate(() => window.huandengDesktop.getWorkspaceLayout());
        return value.notesOpen &&
          value.notesDock === 'right' &&
          value.navigationWidth > 288 &&
          value.inspectorWidth > 300
          ? value
          : null;
      });
      const before = await signature();
      await closeNormally();
      await launch();
      await page.locator('[data-hd-notes-dock="right"]').waitFor();
      assert.deepEqual(
        await page.evaluate(() => window.huandengDesktop.getWorkspaceLayout()),
        layout,
      );
      assert.equal(
        await notes().getByRole('textbox', { name: 'Speaker notes', exact: true }).inputValue(),
        (await disk(0)).notes,
      );
      assert.deepEqual(await signature(), before);
      layouts.push({ restored: layout });
    },
  );

  await check(
    'closing immediately after a Notes layout change preserves the latest dock and size',
    async () => {
      const before = await signature();
      await notes().getByRole('button', { name: 'Dock Notes below', exact: true }).click();
      const handle = page.getByRole('separator', { name: 'Resize Notes height', exact: true });
      const expectedHeight = Number(await handle.getAttribute('aria-valuenow')) + 16;
      await handle.press('ArrowUp');
      const closeStarted = Date.now();
      await closeNormally({ waitForSaved: false });
      await launch();
      await page.locator('[data-hd-notes-dock="bottom"]').waitFor();
      assert.equal(
        Number(
          await page
            .getByRole('separator', { name: 'Resize Notes height', exact: true })
            .getAttribute('aria-valuenow'),
        ),
        expectedHeight,
      );
      assert.equal(
        await notes().getByRole('textbox', { name: 'Speaker notes', exact: true }).inputValue(),
        (await disk(0)).notes,
      );
      assert.deepEqual(await signature(), before);
      observations.push({
        immediateLayoutClose: {
          closeStarted,
          expectedDock: 'bottom',
          expectedHeight,
          preferencePollingBeforeClose: false,
          documentSavePollingBeforeClose: false,
        },
      });
    },
  );

  await check('Settings resets layout and makes keyboard help available', async () => {
    const before = await signature();
    const settings = await openSettings();
    await settings.getByRole('button', { name: 'Reset workspace layout', exact: true }).click();
    await page.keyboard.press('Escape');
    await settings.waitFor({ state: 'hidden' });
    assert.equal(await notes().count(), 0);
    assert.equal(await inspector().isVisible(), true);
    assert.equal(await page.locator('.hd-navigation').isVisible(), true);
    assert.equal(
      Number(
        await page
          .getByRole('separator', { name: 'Resize Project navigation', exact: true })
          .getAttribute('aria-valuenow'),
      ),
      288,
    );
    assert.equal(
      Number(
        await page
          .getByRole('separator', { name: 'Resize Inspector', exact: true })
          .getAttribute('aria-valuenow'),
      ),
      300,
    );
    await (await openSettings()).getByRole('button', { name: /^Keyboard shortcuts/ }).click();
    const help = page.getByRole('dialog', { name: 'Keyboard shortcuts', exact: true });
    await help.waitFor();
    assert.ok((await help.innerText()).includes(process.platform === 'darwin' ? '⌘+B' : 'Ctrl+B'));
    assert.ok((await help.innerText()).includes('Shift+F10'));
    await page.keyboard.press('Escape');
    await help.waitFor({ state: 'hidden' });
    await canvas().focus();
    await page.keyboard.press('F1');
    await help.waitFor();
    await page.keyboard.press('Escape');
    await help.waitFor({ state: 'hidden' });
    assert.deepEqual(await signature(), before);
  });

  await check(
    'Chinese is optional and keeps Project, Pages, Assets, Files and core nouns in English',
    async () => {
      const before = await signature();
      await (await openSettings())
        .getByRole('button', { name: 'Interface language', exact: true })
        .click();
      await page.getByRole('menuitemradio', { name: '简体中文', exact: true }).click();
      await eventually(async () => (await page.locator('html').getAttribute('lang')) === 'zh-CN');
      await page.keyboard.press('Escape');
      assert.deepEqual(
        await page
          .locator('.hd-navigation-tabs button')
          .allTextContents()
          .then((items) => items.slice(0, 4).map((item) => item.trim())),
        ['Project', 'Pages', 'Assets', 'Files'],
      );
      assert.match(
        (await page.locator('.hd-collection-select option:checked').innerText()).trim(),
        /^Main Slides\b/,
      );
      for (const [id, noun] of [
        ['layers', 'Layers'],
        ['story', 'Story'],
        ['checks', 'Checks'],
      ])
        assert.equal((await tab(id).innerText()).trim(), noun);
      assert.ok((await page.locator('[data-hd-slide-identity]').innerText()).includes('Slide ID'));
      assert.ok((await canvas().innerText()).includes('保留原文'));
      await capture('09-chinese-core-nouns.png');
      await page.getByRole('button', { name: '工作区设置', exact: true }).click();
      await page
        .locator('[data-hd-workspace-settings]')
        .getByRole('button', { name: '界面语言', exact: true })
        .click();
      await page.getByRole('menuitemradio', { name: 'English', exact: true }).click();
      await eventually(async () => (await page.locator('html').getAttribute('lang')) === 'en');
      await page.keyboard.press('Escape');
      assert.deepEqual(await signature(), before);
    },
  );

  await check(
    'Agent setup explains configuration and the existing DC-WALT path without starting an Agent',
    async () => {
      const before = await signature();
      const transactionCount = transactionRequests;
      await page.getByRole('button', { name: 'Project and Story', exact: true }).click();
      assert.equal(
        (await page.locator('[data-hd-agent-connect]').innerText()).trim(),
        'Agent setup',
      );
      await page.locator('[data-hd-agent-connect]').click();
      const dialog = page.locator('[data-hd-agent-connection]');
      assert.equal(
        await dialog.getByLabel('Agent client', { exact: true }).inputValue(),
        'chatgpt',
      );
      const field = dialog.getByLabel('Setup instructions', { exact: true });
      await eventually(
        async () =>
          (await field.count()) &&
          (await field.inputValue()).includes('existing-authorized-workstation'),
      );
      const text = await dialog.innerText();
      assert.ok(text.includes('No reverse proxy, public endpoint or new tunnel is created.'));
      assert.ok(text.includes('it does not start or connect an Agent.'));
      assert.ok((await field.inputValue()).includes('ELECTRON_RUN_AS_NODE'));
      assert.equal(
        pathKey(await dialog.locator('[data-hd-agent-project]').innerText()),
        pathKey(entry),
      );
      assert.equal(
        await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length),
        1,
      );
      await capture('10-agent-setup.png');
      await page.keyboard.press('Escape');
      assert.equal(transactionRequests, transactionCount);
      assert.deepEqual(await signature(), before);
    },
  );

  await check(
    'final document remains readable and the isolated candidate closes normally',
    async () => {
      for (let index = 0; index < ids.length; index++)
        assert.deepEqual((await api(`/pages/${ids[index]}`)).data, await disk(index));
      assert.deepEqual(ordered(await disk(1)), ordered(fixtures[1]));
      assert.equal(
        (await disk(0)).elements.find((item) => item.elementId === 'title').content.text,
        plainText,
      );
      observations.push({ finalDocumentHashes: await signature(), transactionRequests });
      await capture('11-final-workspace.png');
      assert.deepEqual(rendererErrors, []);
      await closeNormally();
    },
  );
} catch (error) {
  failure = String(error.stack ?? error);
  process.stderr.write(`${failure}\n`);
  process.exitCode = 1;
  if (page && !page.isClosed()) await capture('failure.png').catch(() => {});
} finally {
  if (app) {
    try {
      await closeNormally();
    } catch (error) {
      observations.push({ cleanup: String(error) });
      await app.close().catch(() => {});
    }
  }
  const report = {
    passed: !process.exitCode,
    checks,
    rendererErrors,
    screenshots,
    exits,
    layouts,
    observations,
    identity,
    synthetic: true,
    sandbox,
    launchCount,
    failure,
    processLog,
  };
  const reportPath = path.join(evidence, 'acceptance.json');
  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(
    `${JSON.stringify({ passed: report.passed, checks: checks.length, report: reportPath })}\n`,
  );
}
