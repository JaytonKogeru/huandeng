// biome-ignore-all lint/suspicious/noUndeclaredEnvVars: This acceptance run isolates its desktop profile, Projects and writer runtime.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(root, 'packages/core/package.json'));
const { _electron: electron } = require('playwright');
const { initializeProject } = require(
  path.join(root, 'packages/core/src/pptd/project-initialize.cjs'),
);
const directory = await fs.mkdtemp(path.join(root, '.verification', 'project-tabs-v022-'));
const profile = path.join(directory, 'profile');
await fs.mkdir(profile);
const names = [
  'Atlas research',
  'Binder design',
  'Coastal observations',
  'DNA discussion',
  'Enzyme evidence',
  'Field notes',
  'Genome review',
  'Human context',
];
const projects = [];
for (const [index, title] of names.entries()) {
  const project = await initializeProject(path.join(directory, `project-${index + 1}`), { title });
  projects.push({ entryPath: project.entry, readOnly: false });
}
const preferencesFile = path.join(profile, 'preferences.json');
await fs.writeFile(
  preferencesFile,
  JSON.stringify({
    recentProjects: [],
    openProjects: projects,
    lastProject: projects[1].entryPath,
    uiLocale: 'en',
    snapping: false,
    retainedMarker: 'untouched preference',
    windowBounds: { width: 1440, height: 920 },
  }),
);
const executablePath =
  process.env.HUANDENG_DESKTOP_EXE ||
  path.join(root, 'packages/desktop/node_modules/electron/dist/electron.exe');
const applicationPath = process.env.HUANDENG_DESKTOP_EXE
  ? process.env.HUANDENG_DESKTOP_APP
  : path.join(root, 'packages/desktop');
const env = {
  ...process.env,
  HUANDENG_DESKTOP_DATA_DIR: profile,
  HUANDENG_RUNTIME_DIR: path.join(directory, 'runtime'),
};
delete env.ELECTRON_RUN_AS_NODE;
let app;
let shell;
let expectedOrder;
let expectedActive;
const checks = [];
const errors = [];
async function until(read, timeout = 60000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const value = await read();
    if (value) return value;
    await new Promise((resolve) => setTimeout(resolve, 60));
  }
  throw new Error('Timed out waiting for isolated desktop state.');
}
async function state() {
  return shell.evaluate(() => window.huandengDesktop.getWorkspace());
}
async function check(name, action) {
  await action();
  checks.push(name);
  console.log(`PASS ${name}`);
}
async function launch() {
  app = await electron.launch({
    executablePath,
    args: applicationPath
      ? [
          applicationPath,
          '--entry',
          JSON.parse(await fs.readFile(preferencesFile, 'utf8')).lastProject,
        ]
      : [],
    cwd: root,
    env,
    timeout: 120000,
  });
  app.context().on('page', (page) => page.on('pageerror', (error) => errors.push(error.message)));
  shell = await until(() =>
    app
      .context()
      .pages()
      .find((page) => page.url().endsWith('/workspace-shell.html')),
  );
  shell.setDefaultTimeout(15000);
  await until(async () => {
    const workspace = await state();
    return workspace.projects.length === projects.length && workspace.activeId;
  }, 180000);
  await until(
    async () =>
      (await views()).filter((view) => view.url.includes('/huandeng')).length === projects.length,
  );
}
async function views() {
  return app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()[0].contentView.children.map((view) => ({
      id: view.webContents.id,
      url: view.webContents.getURL(),
      bounds: view.getBounds(),
      visible: view.getVisible(),
    })),
  );
}
async function capture(name) {
  // Capture only this test window, including its native WebContentsViews, without stealing focus.
  const bytes = await app.evaluate(async ({ BrowserWindow, desktopCapturer }) => {
    const window = BrowserWindow.getAllWindows()[0];
    const { width, height } = window.getBounds();
    const sourceId = window.getMediaSourceId();
    const sources = await desktopCapturer.getSources({
      types: ['window'],
      thumbnailSize: { width, height },
      fetchWindowIcons: false,
    });
    const source = sources.find((item) => item.id === sourceId);
    if (!source || source.thumbnail.isEmpty())
      throw new Error('The isolated test window could not be captured.');
    return source.thumbnail.toPNG().toString('base64');
  });
  await fs.writeFile(path.join(directory, `${name}.png`), Buffer.from(bytes, 'base64'));
}
async function documentHashes() {
  return Promise.all(
    projects.map(async (project) => {
      const dir = path.dirname(project.entryPath);
      const pageFiles = (await fs.readdir(path.join(dir, 'pages')))
        .filter((file) => file.endsWith('.page'))
        .sort();
      const buffers = await Promise.all(
        [project.entryPath, ...pageFiles.map((file) => path.join(dir, 'pages', file))].map((file) =>
          fs.readFile(file),
        ),
      );
      return createHash('sha256').update(Buffer.concat(buffers)).digest('hex');
    }),
  );
}
async function reorderDrag(sourceId, targetId, after = false, during) {
  const source = shell.locator(`[data-project-id="${sourceId}"]`),
    target = shell.locator(`[data-project-id="${targetId}"]`);
  await source.scrollIntoViewIfNeeded();
  const a = await source.boundingBox();
  await target.scrollIntoViewIfNeeded();
  const b = await target.boundingBox();
  const isVertical = (await state()).tabLayout.orientation === 'vertical';
  await shell.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await shell.mouse.down();
  await shell.mouse.move(a.x + a.width / 2 + 10, a.y + a.height / 2 + (isVertical ? 10 : 0));
  const x = isVertical ? b.x + b.width / 2 : b.x + (after ? b.width - 5 : 5);
  const y = isVertical ? b.y + (after ? b.height - 5 : 5) : b.y + b.height / 2;
  await shell.mouse.move(x, y, { steps: 8 });
  await shell.mouse.move(x + 1, y + 1);
  await shell.locator('#tab-drop-indicator:not([hidden])').waitFor();
  if (during) await during();
  await shell.mouse.up();
  await shell.locator('#tab-drop-indicator').waitFor({ state: 'hidden' });
}
async function close() {
  if (!app) return;
  const closed = app.waitForEvent('close');
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].close());
  await closed;
  app = undefined;
}
try {
  await launch();
  const original = await state();
  const originalViews = await views();
  const hashes = await documentHashes();
  const activeUrl = originalViews.find(
    (view) => view.visible && view.url.includes('/huandeng'),
  ).url;
  const editor = app
    .context()
    .pages()
    .find((page) => page.url() === activeUrl);
  await editor.locator('[data-hd-editor-canvas]').waitFor();
  await check(
    'Horizontal native drag preserves active Project and survives a concurrent state report',
    async () => {
      const last = original.projects.at(-1).id,
        first = original.projects[0].id;
      await shell.evaluate((id) => {
        window.dragSource = document.querySelector(`[data-project-id="${id}"]`);
      }, last);
      await reorderDrag(last, first, false, async () => {
        await editor.evaluate(() => window.huandengDesktop.reportProjectState({ activity: true }));
        assert.equal(
          await shell.evaluate(
            (id) => document.querySelector(`[data-project-id="${id}"]`) === window.dragSource,
            last,
          ),
          true,
        );
        await capture('horizontal-drag');
      });
      await until(async () => (await state()).projects[0].id === last);
      assert.equal((await state()).activeId, original.activeId);
      assert.deepEqual(
        (await views()).map((view) => [view.id, view.url.split('?')[0]]),
        originalViews.map((view) => [view.id, view.url.split('?')[0]]),
      );
    },
  );
  await check(
    'Vertical layout updates every content view and is observed by Project renderers',
    async () => {
      await editor.evaluate(() => {
        window.observedTabLayout = null;
        window.huandengDesktop.onTabLayoutChanged((value) => {
          window.observedTabLayout = value;
        });
      });
      await shell.locator('#workspace-tab-layout').click();
      await until(async () => (await state()).tabLayout.orientation === 'vertical');
      await until(() =>
        editor.evaluate(() => window.observedTabLayout?.orientation === 'vertical'),
      );
      assert.ok((await views()).every((view) => view.bounds.x === 224 && view.bounds.y === 42));
      assert.equal(
        await shell.locator('#project-tabs').getAttribute('aria-orientation'),
        'vertical',
      );
      await capture('vertical-expanded');
    },
  );
  await check(
    'Vertical native drag and keyboard reordering leave the active Project unchanged',
    async () => {
      const before = await state();
      const first = before.projects[0].id;
      await reorderDrag(first, before.projects[3].id, true);
      await until(async () => (await state()).projects[3].id === first);
      const target = shell.locator(`[data-project-id="${first}"]`);
      await target.focus();
      await target.press('Alt+Shift+ArrowUp');
      await until(async () => (await state()).projects[2].id === first);
      assert.equal((await state()).activeId, before.activeId);
      assert.equal(await target.evaluate((node) => document.activeElement === node), true);
      await target.press('Home');
      await until(async () => (await state()).activeId === (await state()).projects[0].id);
      assert.equal(
        await shell
          .locator('[role="tab"][aria-selected="true"]')
          .evaluate((node) => document.activeElement === node),
        true,
      );
    },
  );
  await check('Changing layout during native drag cancels the pending reorder', async () => {
    const before = await state();
    const ids = before.projects.map((project) => project.id);
    await reorderDrag(ids[0], ids[3], true, async () => {
      await editor.evaluate(() =>
        window.huandengDesktop.setTabLayout({ orientation: 'horizontal' }),
      );
      await shell.locator('#tab-drop-indicator').waitFor({ state: 'hidden' });
    });
    assert.deepEqual(
      (await state()).projects.map((project) => project.id),
      ids,
    );
    await shell.evaluate(() => window.huandengDesktop.setTabLayout({ orientation: 'vertical' }));
  });
  await check(
    'Collapsed vertical rail remains labelled and fits the smaller native window',
    async () => {
      await shell.locator('#workspace-tab-collapse').click();
      await until(async () => (await state()).tabLayout.collapsed);
      assert.ok((await views()).every((view) => view.bounds.x === 52));
      await app.evaluate(({ BrowserWindow }) => {
        const window = BrowserWindow.getAllWindows()[0];
        window.setMinimumSize(900, 680);
        window.setContentSize(900, 680);
      });
      await until(async () =>
        (await views()).every((view) => view.bounds.width === 848 && view.bounds.height === 638),
      );
      const labels = await shell.locator('.project-tab').evaluateAll((nodes) =>
        nodes.map((node) => ({
          label: node.getAttribute('aria-label'),
          title: node.title,
          mark: node.querySelector('.project-mark').textContent,
          width: node.getBoundingClientRect().width,
        })),
      );
      assert.ok(
        labels.every(
          (item) => item.label && item.title.includes('deck.pptd') && item.mark && item.width <= 52,
        ),
      );
      await shell.evaluate(() => window.huandengDesktop.setLocale('zh-CN'));
      await shell.locator('#workspace-tab-collapse[title="展开垂直标签"]').waitFor();
      await capture('vertical-collapsed-zh');
    },
  );
  await check(
    'Presentation uses full native content bounds and restores the vertical rail',
    async () => {
      const active = await state();
      const activeView = (await views()).find(
        (view) => view.visible && view.url.includes('/huandeng'),
      );
      const activePage = app
        .context()
        .pages()
        .find((page) => page.url() === activeView.url);
      await activePage.keyboard.press('F5');
      await activePage.locator('[data-hd-presenter]').waitFor();
      await until(async () =>
        (await views()).every((view) => view.bounds.x === 0 && view.bounds.y === 0),
      );
      await activePage.keyboard.press('Escape');
      await activePage.locator('[data-hd-presenter]').waitFor({ state: 'detached' });
      await until(async () =>
        (await views()).every((view) => view.bounds.x === 52 && view.bounds.y === 42),
      );
      assert.equal((await state()).activeId, active.activeId);
      await shell.locator('#workspace-home').click();
      await until(async () => (await state()).activeId === null);
      assert.equal((await views()).find((view) => view.visible).bounds.x, 52);
      await shell.evaluate((id) => window.huandengDesktop.activateProject(id), active.activeId);
    },
  );
  await check('A failed preference write rolls back tab order and republishes it', async () => {
    const before = await state();
    const beforeIds = before.projects.map((project) => project.id);
    await shell.evaluate(() => {
      window.rollbackReports = [];
      window.huandengDesktop.onWorkspaceChanged((value) => window.rollbackReports.push(value));
    });
    const backup = `${preferencesFile}.test-backup`;
    await fs.rename(preferencesFile, backup);
    await fs.mkdir(preferencesFile);
    try {
      await assert.rejects(
        shell.evaluate(
          ([id, beforeId]) => window.huandengDesktop.moveProject(id, beforeId),
          [beforeIds.at(-1), beforeIds[0]],
        ),
      );
      assert.deepEqual(
        (await state()).projects.map((project) => project.id),
        beforeIds,
      );
      assert.equal((await state()).activeId, before.activeId);
      const rollback = await until(() => shell.evaluate(() => window.rollbackReports.at(-1)));
      assert.deepEqual(
        rollback.projects.map((project) => project.id),
        beforeIds,
      );
      assert.deepEqual(
        await shell
          .locator('.project-tab')
          .evaluateAll((nodes) => nodes.map((node) => node.dataset.projectId)),
        beforeIds,
      );
    } finally {
      await fs.rmdir(preferencesFile);
      await fs.rename(backup, preferencesFile);
    }
  });
  await check('Invalid updates are rejected and document content is untouched', async () => {
    await assert.rejects(
      shell.evaluate(() => window.huandengDesktop.setTabLayout({ orientation: 'diagonal' })),
    );
    await assert.rejects(editor.evaluate(() => window.huandengDesktop.moveProject('bad', null)));
    assert.deepEqual(await documentHashes(), hashes);
    assert.deepEqual(
      (await views()).map((view) => [view.id, view.url.split('?')[0]]),
      originalViews.map((view) => [view.id, view.url.split('?')[0]]),
    );
    const final = await state();
    expectedOrder = final.projects.map((project) => project.entryPath);
    expectedActive = final.projects.find((project) => project.id === final.activeId).entryPath;
    await close();
    const saved = JSON.parse(await fs.readFile(preferencesFile, 'utf8'));
    assert.deepEqual(
      saved.openProjects.map((project) => project.entryPath),
      expectedOrder,
    );
    assert.equal(saved.lastProject, expectedActive);
    assert.deepEqual(saved.projectTabs, { orientation: 'vertical', collapsed: true });
    assert.equal(saved.retainedMarker, 'untouched preference');
    assert.equal(saved.snapping, false);
  });
  await check(
    'Normal restart restores reordered Projects, active identity and tab layout',
    async () => {
      await launch();
      const restored = await state();
      assert.deepEqual(
        restored.projects.map((project) => project.entryPath),
        expectedOrder,
      );
      assert.equal(
        restored.projects.find((project) => project.id === restored.activeId).entryPath,
        expectedActive,
      );
      assert.deepEqual(restored.tabLayout, { orientation: 'vertical', collapsed: true });
      await capture('restored-collapsed-zh');
      await close();
    },
  );
  assert.deepEqual(errors, []);
  await fs.writeFile(
    path.join(directory, 'result.json'),
    JSON.stringify({ passed: true, checks, rendererErrors: errors }, null, 2),
  );
  console.log(JSON.stringify({ passed: true, directory, checks: checks.length }));
} catch (error) {
  if (app) await capture('failure').catch(() => {});
  await fs.writeFile(
    path.join(directory, 'result.json'),
    JSON.stringify(
      { passed: false, checks, error: String(error), rendererErrors: errors },
      null,
      2,
    ),
  );
  throw error;
} finally {
  await close().catch(() => {});
}
