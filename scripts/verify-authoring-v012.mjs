// biome-ignore-all lint/suspicious/noUndeclaredEnvVars: Acceptance selects an isolated candidate and profile.
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
assert.ok(executablePath, 'Set HUANDENG_DESKTOP_EXE to the candidate executable.');
const sandbox = await fs.mkdtemp(path.join(os.tmpdir(), 'huandeng-authoring-v012-'));
const projectRoot = path.join(sandbox, 'synthetic-project');
const profile = path.join(sandbox, 'profile');
const entry = path.join(projectRoot, 'deck.pptd');
const evidence = path.join(root, '.verification/authoring-v012', path.basename(sandbox));
const ids = Array.from({ length: 18 }, () => randomUUID());
const pagePaths = ids.map((_, index) => `pages/slide-${index + 1}.page`);
const sectionStarts = [0, 2, 6, 9, 12, 15];
const sectionIds = sectionStarts.map(() => randomUUID());
const sections = sectionStarts.map((start, index) => ({
  id: sectionIds[index],
  title: index === 0 ? 'Opening' : `Topic ${index}`,
  startPageId: ids[start],
  pageIds: ids.slice(start, sectionStarts[index + 1] ?? ids.length),
  story: { purpose: '', audience: '', takeaway: '' },
  ...(index === 0 ? { frontMatter: true } : {}),
}));
const fixtures = ids.map((_, index) => ({
  title: `Synthetic slide ${index + 1}`,
  elements: [
    {
      elementId: 'title',
      elementType: 'text',
      bounds: [48, 36, 864, 60],
      content: { text: `Synthetic slide ${index + 1}`, fontSize: 30, color: '#111827' },
    },
    {
      elementId: 'body',
      elementType: 'text',
      bounds: [48, 170, 850, 160],
      content: {
        text: '<span style="color:#112233;font-size:28px">Alpha <strong>target phrase</strong> omega.</span>',
        fontSize: 28,
        color: '#112233',
      },
    },
  ],
  notes: `Synthetic notes ${index + 1}.`,
}));
for (const folder of ['pages', '.huandeng'])
  await fs.mkdir(path.join(projectRoot, folder), { recursive: true });
await fs.mkdir(profile, { recursive: true });
await fs.mkdir(evidence, { recursive: true });
await fs.writeFile(path.join(profile, 'preferences.json'), JSON.stringify({ recentProjects: [] }));
await fs.writeFile(
  entry,
  YAML.stringify({
    title: 'HUANDENG Section and selection acceptance',
    size: [960, 540],
    pages: pagePaths,
    theme: { fontFamily: 'Arial' },
  }),
);
for (const [index, file] of pagePaths.entries())
  await fs.writeFile(path.join(projectRoot, file), YAML.stringify(fixtures[index]));
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
        sections,
        presentations: [],
      },
      slides: Object.fromEntries(
        ids.map((id, index) => [
          id,
          {
            shortCode: `T${String(index + 1).padStart(3, '0')}`,
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
const env = {
  ...process.env,
  HUANDENG_DESKTOP_DATA_DIR: profile,
  HUANDENG_RUNTIME_DIR: path.join(sandbox, 'runtime'),
};
delete env.ELECTRON_RUN_AS_NODE;
const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
const redo = process.platform === 'darwin' ? 'Meta+Shift+z' : 'Control+y';
const checks = [];
const screenshots = [];
const rendererErrors = [];
const observations = [];
const exits = [];
let launchCount = 0;
let identity;
let app;
let page;
let serviceUrl;
let sessionToken;
let failure;
let processLog = '';
let expectedOrder = [...ids];
const canvas = () => page.locator('[data-hd-editor-canvas]');
const rail = () => page.locator('[data-hd-thumbnail-scroll]');
const thumbnail = (id) => page.locator(`[data-hd-thumbnail="${id}"]`);
const toggle = (id) => page.locator(`[data-hd-section-toggle="${id}"]`);
const editor = () => page.locator('[data-hd-inline-editor]');
const readProject = async () =>
  JSON.parse(await fs.readFile(path.join(projectRoot, '.huandeng/project.json'), 'utf8')).project;
async function eventually(read, timeout = 20000) {
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
  throw last ?? new Error('Timed out waiting for v012 authoring state.');
}
async function check(name, action) {
  const started = Date.now();
  try {
    await action();
    checks.push({ name, passed: true, milliseconds: Date.now() - started });
    process.stdout.write(`PASS ${name}\n`);
  } catch (error) {
    checks.push({ name, passed: false, error: String(error) });
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
async function saved() {
  await eventually(async () =>
    /^Saved(?:$|\s|·)/.test((await page.locator('[data-hd-save-status]').innerText()).trim()),
  );
}
async function capture(name) {
  await page.screenshot({
    path: path.join(evidence, name),
    animations: 'disabled',
    mask: [page.locator('[data-hd-project-root]')],
    maskColor: '#e5e7eb',
  });
  screenshots.push(name);
}
async function launch() {
  launchCount += 1;
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
  app.process().stderr?.on('data', (data) => {
    processLog = `${processLog}${data}`.slice(-12000);
  });
  const currentIdentity = await fs
    .readFile(path.join(path.dirname(executablePath), 'huandeng-build.json'), 'utf8')
    .then(JSON.parse)
    .catch((error) => {
      if (process.env.HUANDENG_DESKTOP_APP && error.code === 'ENOENT') return null;
      throw error;
    });
  if (launchCount > 1) assert.deepEqual(currentIdentity, identity);
  identity = currentIdentity;
  page = await app.firstWindow();
  page.setDefaultTimeout(15000);
  page.on('pageerror', (error) => rendererErrors.push(error.message));
  await canvas().waitFor({ timeout: 120000 });
  const context = await page.evaluate(() => window.huandengDesktop.getContext());
  assert.equal(path.resolve(context.entryPath).toLowerCase(), path.resolve(entry).toLowerCase());
  serviceUrl = context.serviceUrl;
  const session = await api('/session');
  sessionToken = session.sessionToken;
  assert.deepEqual(
    session.pages.map((item) => item.pageId),
    expectedOrder,
  );
  await app.evaluate(({ BrowserWindow }) => {
    const window = BrowserWindow.getAllWindows()[0];
    if (window.isMaximized()) window.unmaximize();
    window.setContentSize(1600, 1000);
    window.show();
    window.focus();
  });
  await page.bringToFront();
  await page.getByRole('button', { name: 'Slide thumbnails', exact: true }).click();
  await saved();
}
async function closeNormally() {
  await saved();
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
    assert.deepEqual(result, { code: 0, signal: null });
    exits.push({ launch: launchCount, ...result });
    app = undefined;
  } finally {
    clearTimeout(timer);
  }
}
async function undoDocument() {
  await canvas().focus();
  await page.keyboard.press(`${modifier}+z`);
  await saved();
}
async function selectMain(index) {
  await thumbnail(ids[index]).click();
  await canvas().locator(`[data-pptd-page="${ids[index]}"]`).waitFor();
}
async function selectPhrase() {
  return editor().evaluate((root) => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    let text = '';
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      nodes.push({ node, start: text.length });
      text += node.textContent;
    }
    const start = text.indexOf('target phrase');
    if (start < 0) throw new Error('Target phrase missing');
    const point = (position) => {
      const entry =
        nodes.find(
          (item) => position >= item.start && position <= item.start + item.node.textContent.length,
        ) ?? nodes.at(-1);
      return [entry.node, position - entry.start];
    };
    const range = document.createRange();
    range.setStart(...point(start));
    range.setEnd(...point(start + 'target phrase'.length));
    root.focus();
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    const rect = range.getBoundingClientRect();
    return { x: rect.left + Math.min(30, rect.width / 2), y: rect.top + rect.height / 2 };
  });
}
async function formatPhrase(submenu, item) {
  const point = await selectPhrase();
  await page.mouse.click(point.x, point.y, { button: 'right' });
  const menu = page.locator('[data-hd-inline-menu]:visible');
  await menu.waitFor();
  await menu.getByText(submenu, { exact: true }).hover();
  await page
    .locator('[data-hd-inline-format-ui][data-slot="context-menu-sub-content"]:visible')
    .getByRole('menuitem', { name: item, exact: true })
    .click();
  await editor().waitFor();
}
async function textStyles(target = editor()) {
  return target.evaluate((root) => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const values = [];
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const style = getComputedStyle(node.parentElement);
      let highlight = 'rgba(0, 0, 0, 0)';
      for (
        let parent = node.parentElement;
        parent && root.contains(parent);
        parent = parent.parentElement
      ) {
        const color = getComputedStyle(parent).backgroundColor;
        if (color !== 'rgba(0, 0, 0, 0)' && color !== 'transparent') {
          highlight = color;
          break;
        }
      }
      values.push({
        text: node.textContent,
        color: style.color,
        weight: style.fontWeight,
        highlight,
      });
    }
    return values;
  });
}

try {
  await launch();
  await check('Section 00 and sequential topic numbers expose stable Section IDs', async () => {
    for (const [index, id] of sectionIds.entries()) {
      assert.equal(await toggle(id).getAttribute('data-hd-section-position'), String(index));
      assert.match(
        await toggle(id).innerText(),
        new RegExp(`Section ${String(index).padStart(2, '0')}`),
      );
      assert.ok((await toggle(id).getAttribute('title')).includes(id));
    }
    await page.getByRole('button', { name: 'Project and Story', exact: true }).click();
    const first = page.locator(`[data-hd-project-section="${sectionIds[0]}"]`);
    assert.equal(
      await first
        .getByRole('checkbox', { name: 'Front matter (Section 00)', exact: true })
        .isChecked(),
      true,
    );
    await first.getByRole('button', { name: 'Copy Section ID', exact: true }).click();
    await eventually(async () => (await first.getByRole('status').innerText()).includes('copied'));
    await page.getByRole('button', { name: 'Slide thumbnails', exact: true }).click();
  });
  await check(
    'folding and unfolding a later Section preserves its viewport anchor and selected Slide',
    async () => {
      await selectMain(0);
      await toggle(sectionIds[3]).evaluate((node) => node.scrollIntoView({ block: 'center' }));
      const before = await toggle(sectionIds[3]).boundingBox();
      const scroll = await rail().evaluate((node) => node.scrollTop);
      assert.ok(scroll > 500);
      await toggle(sectionIds[3]).click();
      assert.ok(Math.abs((await toggle(sectionIds[3]).boundingBox()).y - before.y) < 3);
      assert.equal(await thumbnail(ids[0]).getAttribute('aria-pressed'), 'true');
      assert.equal(await thumbnail(ids[10]).count(), 0);
      await toggle(sectionIds[3]).click();
      assert.ok(Math.abs((await toggle(sectionIds[3]).boundingBox()).y - before.y) < 3);
      await capture('01-section-anchor.png');
    },
  );
  await check(
    'gap Create Section splits existing Slides with one saved action and Undo/Redo',
    async () => {
      const gap = page.locator(`[data-hd-insert-before="${ids[4]}"]`);
      await gap.click({ button: 'right' });
      await page.getByRole('menuitem', { name: 'Create Section here', exact: true }).click();
      const dialog = page.locator('[data-hd-create-section]');
      await dialog
        .getByRole('textbox', { name: 'Section name', exact: true })
        .fill('Inserted topic');
      assert.match(
        await dialog.locator('[data-hd-new-section-range]').innerText(),
        /Positions 5–6/,
      );
      await dialog.getByRole('button', { name: 'Create Section', exact: true }).click();
      const inserted = await eventually(async () =>
        (await readProject()).sections.find((item) => item.title === 'Inserted topic'),
      );
      assert.equal(inserted.startPageId, ids[4]);
      assert.deepEqual(
        (await api('/session')).pages.map((item) => item.pageId),
        ids,
      );
      await toggle(inserted.id).waitFor();
      await capture('02-created-section.png');
      await undoDocument();
      await eventually(
        async () => !(await readProject()).sections.some((item) => item.id === inserted.id),
      );
      await canvas().focus();
      await page.keyboard.press(redo);
      await saved();
      await eventually(async () =>
        (await readProject()).sections.some((item) => item.id === inserted.id),
      );
      await undoDocument();
      await eventually(async () => (await readProject()).sections.length === sections.length);
    },
  );
  await check('native thumbnail drag supports the upper half and exact page gaps', async () => {
    await thumbnail(ids[5]).dragTo(thumbnail(ids[3]), { targetPosition: { x: 40, y: 8 } });
    expectedOrder = [ids[0], ids[1], ids[2], ids[5], ids[3], ids[4], ...ids.slice(6)];
    await eventually(
      async () =>
        JSON.stringify((await api('/session')).pages.map((item) => item.pageId)) ===
        JSON.stringify(expectedOrder),
    );
    await undoDocument();
    expectedOrder = [...ids];
    await eventually(
      async () =>
        JSON.stringify((await api('/session')).pages.map((item) => item.pageId)) ===
        JSON.stringify(ids),
    );
    await thumbnail(ids[5]).dragTo(page.locator(`[data-hd-insert-before="${ids[3]}"]`));
    expectedOrder = [ids[0], ids[1], ids[2], ids[5], ids[3], ids[4], ...ids.slice(6)];
    await eventually(
      async () =>
        JSON.stringify((await api('/session')).pages.map((item) => item.pageId)) ===
        JSON.stringify(expectedOrder),
    );
    await capture('03-dragged-before-target.png');
    await undoDocument();
    expectedOrder = [...ids];
    await eventually(
      async () =>
        JSON.stringify((await api('/session')).pages.map((item) => item.pageId)) ===
        JSON.stringify(ids),
    );
  });
  await check(
    'dragging near the rail edge scrolls while retaining the actual hidden Section boundary',
    async () => {
      await toggle(sectionIds[2]).click();
      const gap = page.locator(`[data-hd-insert-before="${ids[9]}"]`);
      assert.equal(await gap.getAttribute('data-hd-insert-after'), ids[8]);
      await thumbnail(ids[4]).dragTo(gap);
      expectedOrder = [...ids.slice(0, 4), ...ids.slice(5, 9), ids[4], ...ids.slice(9)];
      await eventually(
        async () =>
          JSON.stringify((await api('/session')).pages.map((item) => item.pageId)) ===
          JSON.stringify(expectedOrder),
      );
      await undoDocument();
      expectedOrder = [...ids];
      await eventually(
        async () =>
          JSON.stringify((await api('/session')).pages.map((item) => item.pageId)) ===
          JSON.stringify(ids),
      );
      await toggle(sectionIds[2]).click();
      await thumbnail(ids[3]).scrollIntoViewIfNeeded();
      const source = await thumbnail(ids[3]).boundingBox();
      const target = await rail().boundingBox();
      await page.mouse.move(source.x + source.width / 2, source.y + 25);
      await page.mouse.down();
      await page.mouse.move(source.x + source.width / 2 + 8, source.y + 35, { steps: 5 });
      const before = await rail().evaluate((node) => node.scrollTop);
      await page.mouse.move(target.x + target.width / 2, target.y + target.height - 8, {
        steps: 20,
      });
      await eventually(
        async () => (await rail().evaluate((node) => node.scrollTop)) > before + 100,
        5000,
      );
      await page.keyboard.press('Escape');
      await page.mouse.up();
    },
  );
  await check(
    'selection color and highlight preserve other text, semantic bold and native Undo',
    async () => {
      await selectMain(0);
      await canvas().locator('[data-hd-element-id="body"]').dblclick();
      await editor().waitFor();
      await formatPhrase('Text color', 'Red');
      let styles = await textStyles();
      assert.ok(
        styles
          .filter((item) => item.text.includes('target'))
          .every((item) => item.color === 'rgb(220, 38, 38)' && Number(item.weight) >= 600),
      );
      assert.ok(
        styles
          .filter((item) => /Alpha|omega/.test(item.text))
          .every((item) => item.color === 'rgb(17, 34, 51)'),
      );
      await editor().press(`${modifier}+z`);
      await eventually(async () =>
        (await textStyles()).every((item) => item.color === 'rgb(17, 34, 51)'),
      );
      await editor().press(redo);
      await eventually(async () =>
        (await textStyles()).some(
          (item) => item.text.includes('target') && item.color === 'rgb(220, 38, 38)',
        ),
      );
      await formatPhrase('Highlight', 'Yellow');
      styles = await textStyles();
      assert.ok(
        styles
          .filter((item) => item.text.includes('target'))
          .every((item) => item.highlight === 'rgb(255, 245, 157)'),
      );
      assert.ok(
        styles
          .filter((item) => /Alpha|omega/.test(item.text))
          .every((item) => item.highlight === 'rgba(0, 0, 0, 0)'),
      );
      await editor().press(`${modifier}+z`);
      await eventually(async () =>
        (await textStyles()).every((item) => item.highlight === 'rgba(0, 0, 0, 0)'),
      );
      await editor().press(redo);
      await eventually(async () =>
        (await textStyles()).some((item) => item.highlight === 'rgb(255, 245, 157)'),
      );
      await capture('04-selected-text-color-highlight.png');
      await editor().press('Escape');
      await saved();
      const written = YAML.parse(await fs.readFile(path.join(projectRoot, pagePaths[0]), 'utf8'));
      assert.equal(written.elements[0].content.text, fixtures[0].elements[0].content.text);
      assert.equal(written.elements[1].content.color, '#112233');
      assert.match(written.elements[1].content.text, /background-color/);
      assert.match(written.elements[1].content.text, /<strong(?:\s[^>]*)?>/);
      const rendered = await textStyles(canvas().locator('[data-hd-element-id="body"]'));
      assert.ok(
        rendered.some(
          (item) =>
            item.text.includes('target') &&
            item.color === 'rgb(220, 38, 38)' &&
            item.highlight === 'rgb(255, 245, 157)' &&
            Number(item.weight) >= 600,
        ),
      );
      assert.ok(
        rendered
          .filter((item) => /Alpha|omega/.test(item.text))
          .every(
            (item) => item.color === 'rgb(17, 34, 51)' && item.highlight === 'rgba(0, 0, 0, 0)',
          ),
      );
      await capture('04-saved-text-color-highlight.png');
    },
  );
  await check(
    'Ctrl+wheel zooms the canvas, preserves browser scale and leaves Shift scrolling available',
    async () => {
      await page.getByRole('button', { name: 'Fit to window', exact: true }).click();
      const viewport = page.locator('[data-hd-canvas-viewport]');
      const slide = canvas().locator('[data-osd-canvas]');
      const before = await slide.boundingBox();
      await viewport.hover();
      await page.keyboard.down(modifier);
      await page.mouse.wheel(0, -220);
      await page.keyboard.up(modifier);
      await eventually(async () => (await slide.boundingBox()).width > before.width * 1.3);
      assert.equal(
        await app.evaluate(({ BrowserWindow }) =>
          BrowserWindow.getAllWindows()[0].webContents.getZoomFactor(),
        ),
        1,
      );
      await viewport.evaluate((node) => {
        node.scrollLeft = 0;
      });
      await viewport.hover();
      await page.keyboard.down('Shift');
      await page.mouse.wheel(0, 240);
      await page.keyboard.up('Shift');
      await eventually(async () => (await viewport.evaluate((node) => node.scrollLeft)) > 30);
      observations.push(
        await viewport.evaluate((node) => ({
          horizontalScroll: node.scrollLeft,
          scrollWidth: node.scrollWidth,
          viewportWidth: node.clientWidth,
        })),
      );
      await capture('05-canvas-zoom-scroll.png');
      await page.getByRole('button', { name: 'Fit to window', exact: true }).click();
    },
  );
  await check(
    'normal reopen retains Section IDs, numbering and saved range formatting',
    async () => {
      expectedOrder = (await api('/session')).pages.map((item) => item.pageId);
      const finalProject = await readProject();
      await closeNormally();
      await launch();
      assert.deepEqual(await readProject(), finalProject);
      assert.deepEqual(
        finalProject.sections.map((item) => item.id),
        sectionIds,
      );
      assert.equal(await toggle(sectionIds[0]).getAttribute('data-hd-section-position'), '0');
      await selectMain(0);
      assert.ok(
        (await textStyles(canvas().locator('[data-hd-element-id="body"]'))).some(
          (item) =>
            item.text.includes('target') &&
            item.color === 'rgb(220, 38, 38)' &&
            item.highlight === 'rgb(255, 245, 157)' &&
            Number(item.weight) >= 600,
        ),
      );
      await canvas().locator('[data-hd-element-id="body"]').dblclick();
      await editor().waitFor();
      assert.ok(
        (await textStyles()).some(
          (item) =>
            item.text.includes('target') &&
            item.color === 'rgb(220, 38, 38)' &&
            item.highlight === 'rgb(255, 245, 157)',
        ),
      );
      await editor().press('Escape');
      await saved();
      assert.deepEqual(rendererErrors, []);
      await capture('06-reopened.png');
      await closeNormally();
    },
  );
} catch (error) {
  failure = { message: error.message, stack: error.stack };
  if (page && !page.isClosed()) await capture('failure.png').catch(() => {});
} finally {
  const report = {
    harness: 'verify-authoring-v012',
    passed: !failure,
    executablePath: path.resolve(executablePath),
    desktopAppOverride: process.env.HUANDENG_DESKTOP_APP || null,
    identity,
    launchCount,
    exits,
    checks,
    screenshots,
    rendererErrors,
    observations,
    sandbox,
    entry,
    evidence,
    pageIds: ids,
    sectionIds,
    expectedOrder,
    failure,
    processLog,
  };
  await fs.writeFile(path.join(evidence, 'acceptance.json'), JSON.stringify(report, null, 2));
  process.stdout.write(
    `${JSON.stringify({ passed: report.passed, checks: checks.length, evidence, failure }, null, 2)}\n`,
  );
  if (failure) process.exitCode = 1;
  if (failure && app)
    await app.evaluate(({ app: isolatedApp }) => isolatedApp.exit(1)).catch(() => {});
}
