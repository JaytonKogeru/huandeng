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
const sandbox = await fs.mkdtemp(path.join(os.tmpdir(), 'huandeng-authoring-v0121-'));
const projectRoot = path.join(sandbox, 'synthetic-project');
const profile = path.join(sandbox, 'profile');
const entry = path.join(projectRoot, 'deck.pptd');
const evidence = path.join(root, '.verification/authoring-v0121', path.basename(sandbox));
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
const expectedOrder = [...ids];
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
  throw last ?? new Error('Timed out waiting for v0121 authoring state.');
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
async function api(route, body) {
  const response = await fetch(`${serviceUrl}/__pptd${route}`, {
    method: body ? 'POST' : 'GET',
    headers: { 'x-huandeng-token': sessionToken ?? '', 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(120000),
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
async function slideHidden(index) {
  return (await api(`/pages/${ids[index]}`)).metadata.hidden === true;
}
async function toggleVisibility(index, hidden) {
  await thumbnail(ids[index]).click({ button: 'right' });
  await page
    .getByRole('menuitem', { name: hidden ? 'Hide slide' : 'Show slide', exact: true })
    .click();
  await eventually(async () => (await slideHidden(index)) === hidden);
  await saved();
}
async function history(index) {
  await thumbnail(ids[index]).click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'View version history', exact: true }).click();
  const dialog = page.locator('[data-hd-page-history]');
  await dialog.waitFor();
  return dialog;
}
async function exportResult(format, includeHidden = false, pageId) {
  const result = await api(format === 'png' ? '/render' : '/export', {
    format,
    includeHidden,
    pageId,
  });
  assert.ok(result.url && result.report);
  const response = await fetch(`${serviceUrl}${result.url}`, {
    headers: { 'x-huandeng-token': sessionToken },
  });
  assert.ok(response.ok);
  const bytes = new Uint8Array(await response.arrayBuffer());
  assert.ok(bytes.length > 100);
  await fs.writeFile(
    path.join(evidence, `${format}-${includeHidden ? 'all' : 'visible'}.${format}`),
    bytes,
  );
  return result.report;
}
let checkpointId;
try {
  await launch();
  await check(
    'keyboard text selection has a readable blue background and preserves artwork',
    async () => {
      await selectMain(0);
      const before = (await api(`/pages/${ids[0]}`)).pageRevision;
      await canvas().locator('[data-hd-element-id="body"]').dblclick();
      await editor().waitFor();
      await editor().press(`${modifier}+Home`);
      await editor().press(`${modifier}+Shift+ArrowRight`);
      const selection = await editor().evaluate((node) => ({
        text: window.getSelection()?.toString(),
        background: getComputedStyle(node, '::selection').backgroundColor,
        color: getComputedStyle(node, '::selection').color,
      }));
      assert.ok(selection.text?.includes('Alpha'));
      assert.equal(selection.background, 'rgb(36, 95, 168)');
      assert.equal(selection.color, 'rgb(255, 255, 255)');
      observations.push({ selection });
      await capture('01-selected-text.png');
      await editor().press('Escape');
      await saved();
      assert.equal((await api(`/pages/${ids[0]}`)).pageRevision, before);
    },
  );
  await check(
    'folded Section shows its first Slide as a card stack and keeps the viewport anchor',
    async () => {
      await toggle(sectionIds[3]).evaluate((node) => node.scrollIntoView({ block: 'center' }));
      const before = await toggle(sectionIds[3]).boundingBox();
      assert.ok((await rail().evaluate((node) => node.scrollTop)) > 500);
      await toggle(sectionIds[3]).click();
      assert.ok(Math.abs((await toggle(sectionIds[3]).boundingBox()).y - before.y) < 3);
      assert.equal(await thumbnail(ids[0]).getAttribute('aria-pressed'), 'true');
      assert.equal(await thumbnail(ids[10]).count(), 0);
      const stack = page.locator(`[data-hd-section-stack="${sectionIds[3]}"]`);
      assert.equal(await stack.locator(`[data-hd-thumbnail-preview="${ids[9]}"]`).count(), 1);
      const layers = await stack.evaluate((node) =>
        ['::before', '::after'].map((p) => ({
          content: getComputedStyle(node, p).content,
          transform: getComputedStyle(node, p).transform,
        })),
      );
      assert.ok(layers.every((layer) => layer.content === '""' && layer.transform !== 'none'));
      assert.match(await toggle(sectionIds[3]).innerText(), /Section 03[\s\S]*3/);
      observations.push({ layers });
      await capture('02-folded-card-stack.png');
      await toggle(sectionIds[3]).click();
      assert.ok(Math.abs((await toggle(sectionIds[3]).boundingBox()).y - before.y) < 3);
    },
  );
  await check(
    'Create Section is available before an existing Section and at the end, with atomic cover Undo',
    async () => {
      const original = await readProject();
      for (const point of [
        { before: ids[6], after: ids[5], name: 'Inserted cover' },
        { before: null, after: ids.at(-1), name: 'Appended cover' },
      ]) {
        const gap = point.before
          ? page.locator(`[data-hd-insert-before="${point.before}"]`)
          : page.locator(`[data-hd-insert-after="${point.after}"][data-hd-insert-before=""]`);
        await gap.click({ button: 'right' });
        await page.getByRole('menuitem', { name: 'Create Section here', exact: true }).click();
        const dialog = page.locator('[data-hd-create-section]');
        await dialog.getByRole('textbox', { name: 'Section name', exact: true }).fill(point.name);
        assert.match(await dialog.innerText(), /Insert a Section cover here/);
        await dialog.getByRole('button', { name: 'Create Section', exact: true }).click();
        const added = await eventually(async () =>
          (await readProject()).sections.find((item) => item.title === point.name),
        );
        await saved();
        const snapshot = await api('/session');
        assert.equal(snapshot.pages.length, 19);
        const created = snapshot.pages.find((item) => item.pageId === added.startPageId);
        assert.ok(created && !ids.includes(created.pageId));
        const i = snapshot.pages.findIndex((item) => item.pageId === created.pageId);
        assert.equal(snapshot.pages[i - 1]?.pageId ?? null, point.after);
        assert.equal(snapshot.pages[i + 1]?.pageId ?? null, point.before);
        assert.deepEqual(
          (await readProject()).sections.filter((item) => item.id !== added.id),
          original.sections,
        );
        await capture(
          point.before ? '03-section-cover-before-boundary.png' : '04-section-cover-at-end.png',
        );
        await undoDocument();
        await eventually(async () => (await api('/session')).pages.length === 18);
        assert.deepEqual(await readProject(), original);
      }
    },
  );
  await check(
    'named page checkpoints appear in Page Version History and contain saved artwork',
    async () => {
      await selectMain(0);
      const dialog = await history(0);
      await dialog
        .getByRole('textbox', { name: 'Slide version name', exact: true })
        .fill('Acceptance before revision');
      await dialog.getByRole('button', { name: 'Save slide version', exact: true }).click();
      await eventually(async () =>
        (await api(`/pages/${ids[0]}/versions`)).some(
          (item) => item.summary === 'Acceptance before revision',
        ),
      );
      const versions = await api(`/pages/${ids[0]}/versions`);
      checkpointId = versions.find(
        (item) => item.summary === 'Acceptance before revision',
      ).versionId;
      assert.ok(checkpointId);
      assert.ok(await dialog.getByText('Acceptance before revision', { exact: true }).count());
      const version = await api(`/pages/${ids[0]}/versions/${checkpointId}`);
      assert.equal(version.page.pageId, ids[0]);
      assert.equal(version.page.data.notes, 'Synthetic notes 1.');
      await capture('05-page-history-checkpoint.png');
      await page.keyboard.press('Escape');
      await dialog.waitFor({ state: 'hidden' });
    },
  );
  await check(
    'Hide slide preserves editable pages and order, supports Undo, and skips hidden playback',
    async () => {
      const before = await api(`/pages/${ids[1]}`);
      await toggleVisibility(1, true);
      assert.equal(
        await thumbnail(ids[1]).getByLabel('Hidden from presentation', { exact: true }).count(),
        1,
      );
      assert.equal((await api(`/pages/${ids[1]}`)).pageRevision, before.pageRevision);
      assert.deepEqual(
        (await api('/session')).pages.map((item) => item.pageId),
        ids,
      );
      await undoDocument();
      await eventually(async () => !(await slideHidden(1)));
      await toggleVisibility(1, true);
      await selectMain(1);
      await page.getByRole('button', { name: 'Present', exact: true }).click();
      await page.locator(`[data-hd-presenter-slide="${ids[2]}"]`).waitFor();
      await page.keyboard.press('Home');
      await page.locator(`[data-hd-presenter-slide="${ids[0]}"]`).waitFor();
      await page.keyboard.press('ArrowRight');
      await page.locator(`[data-hd-presenter-slide="${ids[2]}"]`).waitFor();
      await page.keyboard.press('ArrowLeft');
      await page.locator(`[data-hd-presenter-slide="${ids[0]}"]`).waitFor();
      await page.keyboard.press('Escape');
      await page.locator('[data-hd-presenter]').waitFor({ state: 'hidden' });
      await selectMain(1);
      await capture('06-hidden-slide-retained.png');
    },
  );
  await check(
    'PDF and PPTX skip hidden slides by default and allow explicit inclusion; PNG still renders the hidden page',
    async () => {
      await page.getByRole('button', { name: 'Export', exact: true }).click();
      const dialog = page.locator('[data-hd-export-dialog]');
      const checkbox = dialog.getByRole('checkbox', {
        name: 'Include hidden slides (1)',
        exact: true,
      });
      assert.equal(await checkbox.isChecked(), false);
      await checkbox.check();
      assert.equal(await checkbox.isChecked(), true);
      await capture('07-hidden-export-option.png');
      await page.keyboard.press('Escape');
      await dialog.waitFor({ state: 'hidden' });
      for (const format of ['pptx', 'pdf']) {
        const visible = await exportResult(format);
        assert.deepEqual(
          visible.pages.map((item) => item.pageId),
          ids.filter((id) => id !== ids[1]),
        );
        const all = await exportResult(format, true);
        assert.deepEqual(
          all.pages.map((item) => item.pageId),
          ids,
        );
      }
      const png = await exportResult('png', false, ids[1]);
      assert.deepEqual(
        png.pages.map((item) => item.pageId),
        [ids[1]],
      );
      assert.deepEqual(
        (await api('/session')).pages.map((item) => item.pageId),
        ids,
      );
    },
  );
  await check(
    'normal reopen retains hidden state, checkpoints and Section structure; Show slide reverses hiding',
    async () => {
      const project = await readProject();
      await closeNormally();
      await launch();
      assert.deepEqual(await readProject(), project);
      assert.equal(await slideHidden(1), true);
      const versions = await api(`/pages/${ids[0]}/versions`);
      assert.ok(versions.some((item) => item.versionId === checkpointId));
      const dialog = await history(0);
      await eventually(
        async () => await dialog.getByText('Acceptance before revision', { exact: true }).count(),
      );
      await page.keyboard.press('Escape');
      await dialog.waitFor({ state: 'hidden' });
      await toggleVisibility(1, false);
      await selectMain(0);
      await page.getByRole('button', { name: 'Present', exact: true }).click();
      await page.locator(`[data-hd-presenter-slide="${ids[0]}"]`).waitFor();
      await page.keyboard.press('ArrowRight');
      await page.locator(`[data-hd-presenter-slide="${ids[1]}"]`).waitFor();
      await page.keyboard.press('Escape');
      await page.locator('[data-hd-presenter]').waitFor({ state: 'hidden' });
      assert.deepEqual(rendererErrors, []);
      await capture('08-reopened.png');
      await closeNormally();
    },
  );
} catch (error) {
  failure = { message: error.message, stack: error.stack };
  if (page && !page.isClosed()) await capture('failure.png').catch(() => {});
} finally {
  const report = {
    harness: 'verify-authoring-v0121',
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
