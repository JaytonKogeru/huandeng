import assert from 'node:assert/strict';
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
const directory = await fs.mkdtemp(path.join(root, '.verification', 'interface-theme-'));
const profile = path.join(directory, 'profile');
await fs.mkdir(profile);
const first = await initializeProject(path.join(directory, 'first'), { title: 'First project' });
const second = await initializeProject(path.join(directory, 'second'), { title: 'Second project' });
const preferencesFile = path.join(profile, 'preferences.json');
await fs.writeFile(
  preferencesFile,
  JSON.stringify({
    recentProjects: [],
    openProjects: [first, second].map((project) => ({
      entryPath: project.entry,
      readOnly: false,
    })),
    lastProject: first.entry,
    uiLocale: 'en',
    uiTheme: 'light',
    windowBounds: { width: 1280, height: 840 },
  }),
);
const exe =
  process.env.HUANDENG_DESKTOP_EXE ||
  path.join(root, 'packages/desktop/node_modules/electron/dist/electron.exe');
const appPath = process.env.HUANDENG_DESKTOP_EXE ? null : path.join(root, 'packages/desktop');
const env = {
  ...process.env,
  HUANDENG_DESKTOP_DATA_DIR: profile,
  HUANDENG_RUNTIME_DIR: path.join(directory, 'runtime'),
};
delete env.ELECTRON_RUN_AS_NODE;
let app;
const checks = [];
const errors = [];
const pass = (label) => {
  checks.push(label);
  console.log(`PASS ${label}`);
};
async function until(read, timeout = 60000) {
  const untilTime = Date.now() + timeout;
  while (Date.now() < untilTime) {
    const value = await read();
    if (value) return value;
    await new Promise((resolve) => setTimeout(resolve, 80));
  }
  throw new Error('Timed out waiting for UI or preference state');
}
async function launch() {
  app = await electron.launch({
    executablePath: exe,
    args: appPath ? [appPath, '--entry', first.entry] : [],
    cwd: root,
    env,
    timeout: 120000,
  });
  app.context().on('page', (page) => page.on('pageerror', (error) => errors.push(error.message)));
  const shell = await until(() =>
    app
      .context()
      .pages()
      .find((p) => p.url().endsWith('/workspace-shell.html')),
  );
  const pages = await until(() => {
    const editors = app
      .context()
      .pages()
      .filter((p) => /^http:\/\/127\.0\.0\.1:\d+\/huandeng/.test(p.url()));
    return editors.length === 2 ? editors : null;
  }, 120000);
  await Promise.all(
    pages.map((page) =>
      page.locator('[data-hd-editor-canvas]').waitFor({ state: 'attached', timeout: 120000 }),
    ),
  );
  return { shell, pages };
}
async function themeState(pages) {
  return Promise.all(
    pages.map((page) =>
      page.evaluate(() => ({
        theme: localStorage.getItem('theme'),
        dark: document.documentElement.classList.contains('dark'),
      })),
    ),
  );
}
async function close() {
  if (!app) return;
  const exit = app.waitForEvent('close');
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].close());
  await exit;
  app = null;
}
try {
  let { shell, pages } = await launch();
  assert.notEqual(new URL(pages[0].url()).origin, new URL(pages[1].url()).origin);
  await until(async () => (await themeState(pages)).every((x) => x.theme === 'light'));
  pass('Separate project origins start from one application theme');
  await pages[0].getByRole('button', { name: 'Workspace settings' }).click();
  await pages[0].getByRole('combobox', { name: 'Interface theme' }).selectOption('dark');
  await until(async () => (await themeState(pages)).every((x) => x.theme === 'dark' && x.dark));
  assert.equal(await shell.evaluate(() => window.huandengDesktop.getTheme()), 'dark');
  const native = await app.evaluate(({ nativeTheme }) => ({
    source: nativeTheme.themeSource,
    dark: nativeTheme.shouldUseDarkColors,
  }));
  assert.deepEqual(native, { source: 'dark', dark: true });
  await until(
    async () =>
      (await shell.evaluate(() => getComputedStyle(document.documentElement).backgroundColor)) ===
      'rgb(23, 25, 28)',
  );
  const home = app
    .context()
    .pages()
    .find((p) => p.url().endsWith('/welcome.html'));
  assert.ok(home);
  await until(
    async () =>
      (await home.evaluate(() => getComputedStyle(document.documentElement).backgroundColor)) ===
      'rgb(30, 34, 38)',
  );
  pass('Theme setting updates both projects, native shell and Home');

  await home.emulateMedia({ colorScheme: 'dark' });
  await shell.emulateMedia({ colorScheme: 'dark' });
  await pages[0].evaluate(() => window.huandengDesktop.setTheme('light'));
  await until(async () =>
    (await themeState(pages)).every((value) => value.theme === 'light' && !value.dark),
  );
  await until(
    async () =>
      (await home.evaluate(() => getComputedStyle(document.documentElement).backgroundColor)) ===
      'rgb(255, 255, 255)',
  );
  await until(
    async () =>
      (await shell.evaluate(() => getComputedStyle(document.documentElement).backgroundColor)) ===
      'rgb(236, 238, 240)',
  );
  pass('Explicit light theme overrides dark OS appearance in shell and Home');
  await pages[0].evaluate(() => window.huandengDesktop.setTheme('system'));
  await until(async () => (await themeState(pages)).every((value) => value.theme === 'system'));
  await until(
    async () =>
      (await home.evaluate(() => getComputedStyle(document.documentElement).backgroundColor)) ===
      'rgb(30, 34, 38)',
  );
  await home.emulateMedia({ colorScheme: 'light' });
  await shell.emulateMedia({ colorScheme: 'light' });
  await until(
    async () =>
      (await home.evaluate(() => getComputedStyle(document.documentElement).backgroundColor)) ===
      'rgb(255, 255, 255)',
  );
  pass('Follow system responds to appearance changes without changing the Project');
  await pages[0].evaluate(() => window.huandengDesktop.setTheme('dark'));
  await until(async () => (await themeState(pages)).every((value) => value.dark));

  const state = await shell.evaluate(() => window.huandengDesktop.getWorkspace());
  await shell.evaluate((id) => window.huandengDesktop.activateProject(id), state.projects[1].id);
  assert.deepEqual(
    (await themeState(pages)).map((x) => x.dark),
    [true, true],
  );
  pass('Switching active project never changes the interface theme');

  await pages[1].evaluate(() => localStorage.setItem('theme', 'light'));
  await pages[1].reload();
  await pages[1].locator('[data-hd-editor-canvas]').waitFor({ state: 'attached' });
  await until(async () => (await themeState([pages[1]]))[0].dark);
  assert.equal((await themeState([pages[1]]))[0].theme, 'dark');
  pass('A stale per-origin theme cannot override the desktop preference');
  const backup = `${preferencesFile}.test-backup`;
  await fs.rename(preferencesFile, backup);
  await fs.mkdir(preferencesFile);
  try {
    await assert.rejects(pages[1].evaluate(() => window.huandengDesktop.setTheme('light')));
    assert.equal(await pages[0].evaluate(() => window.huandengDesktop.getTheme()), 'dark');
    assert.deepEqual(
      (await themeState(pages)).map((x) => x.dark),
      [true, true],
    );
  } finally {
    await fs.rmdir(preferencesFile);
    await fs.rename(backup, preferencesFile);
  }
  pass('Failed preference write rolls back without broadcasting false theme');

  await close();
  ({ shell, pages } = await launch());
  await until(async () => (await themeState(pages)).every((x) => x.dark));
  assert.equal(await shell.evaluate(() => window.huandengDesktop.getTheme()), 'dark');
  assert.equal((await fs.readFile(preferencesFile, 'utf8')).includes('"uiTheme": "dark"'), true);
  pass('Application theme survives full restart');
  assert.deepEqual(errors, []);
  await fs.writeFile(
    path.join(directory, 'result.json'),
    JSON.stringify(
      {
        passed: true,
        checks,
        errors,
      },
      null,
      2,
    ),
  );
  console.log(JSON.stringify({ passed: true, directory, checks }));
} catch (error) {
  await fs.writeFile(
    path.join(directory, 'result.json'),
    JSON.stringify(
      {
        passed: false,
        checks,
        errors,
        error: String(error),
      },
      null,
      2,
    ),
  );
  throw error;
} finally {
  await close().catch(() => {});
}
