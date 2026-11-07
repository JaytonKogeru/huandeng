// biome-ignore-all lint/suspicious/noUndeclaredEnvVars: Runs against an explicitly selected installed desktop outside the Turbo cache.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(root, 'packages/core/package.json'));
const { _electron: electron } = require('playwright');
const executablePath = process.env.HUANDENG_DESKTOP_EXE;
assert.ok(executablePath && path.isAbsolute(executablePath));
const installed = path.dirname(executablePath);
const marker = JSON.parse(await fs.readFile(path.join(installed, 'huandeng-build.json'), 'utf8'));
const release = JSON.parse(
  await fs.readFile(path.join(installed, 'resources/app/release.json'), 'utf8'),
);
assert.equal(marker.sourceDirty, false);
assert.equal(marker.productVersion, release.version);
const sandbox = await fs.mkdtemp(path.join(os.tmpdir(), 'huandeng-installed-'));
const project = path.join(sandbox, 'studio');
await fs.cp(path.join(root, 'tests/fixtures/studio'), project, { recursive: true });
const entry = path.join(project, 'deck.pptd');
const output = path.join(root, '.verification/installed-huandeng.json');
await fs.mkdir(path.dirname(output), { recursive: true });
const errors = [];
const report = { passed: false, timestamp: new Date().toISOString(), executablePath, marker };
const env = {
  ...process.env,
  HUANDENG_DESKTOP_DATA_DIR: path.join(sandbox, 'profile'),
  HUANDENG_RUNTIME_DIR: path.join(sandbox, 'runtime'),
};
delete env.ELECTRON_RUN_AS_NODE;
let application;
try {
  application = await electron.launch({
    executablePath,
    args: ['--entry', entry],
    env,
    cwd: root,
    timeout: 90000,
  });
  const page = await application.firstWindow();
  page.on('pageerror', (error) => errors.push(error.message));
  await page.locator('[data-hd-editor-canvas]').waitFor({ timeout: 90000 });
  const context = await page.evaluate(() => window.huandengDesktop.getContext());
  assert.equal(path.resolve(context.entryPath).toLowerCase(), entry.toLowerCase());
  const response = await fetch(`${context.serviceUrl}/__pptd/session`);
  assert.equal(response.headers.get('x-huandeng-runtime'), 'static');
  const session = await response.json();
  assert.equal(session.pages.length, 3);
  assert.equal(session.writable, true);
  report.window = await application.evaluate(({ BrowserWindow }) => {
    const window = BrowserWindow.getAllWindows()[0];
    return { title: window.getTitle(), visible: window.isVisible() };
  });
  assert.equal(report.window.visible, true);
  assert.match(report.window.title, /HUANDENG Editor/);
  report.about = await application.evaluate(({ Menu, dialog }) => {
    const original = dialog.showMessageBox;
    let options;
    dialog.showMessageBox = async (_window, value) => {
      options = value;
      return { response: 0, checkboxChecked: false };
    };
    try {
      const help = Menu.getApplicationMenu().items.find((item) => item.label === '帮助');
      const about = help?.submenu?.items.find((item) => item.label === '关于 HUANDENG Editor');
      if (!about) throw new Error('The installed About command is missing.');
      about.click();
      return options;
    } finally {
      dialog.showMessageBox = original;
    }
  });
  assert.equal(report.about.message, `HUANDENG Editor ${release.version}`);
  await page.mouse.move(10, 10);
  await page.screenshot({
    path: path.join(root, '.verification/installed-huandeng.png'),
    animations: 'disabled',
    timeout: 15000,
  });
  assert.deepEqual(errors, []);
  report.documentRuntime = 'static';
  report.syntheticPages = session.pages.length;
  report.aboutVerification =
    'Executed the real native menu command and captured its dialog options.';
  report.passed = true;
} catch (error) {
  report.error = error.stack ?? String(error);
} finally {
  report.rendererErrors = errors;
  await fs.writeFile(output, `${JSON.stringify(report, null, 2)}\n`);
  if (application) {
    let closeTimer;
    const closed = await Promise.race([
      application.close().then(
        () => true,
        (error) => {
          report.closeError = String(error);
          return false;
        },
      ),
      new Promise((resolve) => {
        closeTimer = setTimeout(() => resolve(false), 5000);
      }),
    ]);
    clearTimeout(closeTimer);
    if (!closed) {
      report.passed = false;
      report.closeTimedOut = true;
      report.isolatedTestProcessTerminated = application.process().kill('SIGKILL');
    }
  }
  if (report.passed)
    await fs.rm(sandbox, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  else report.retainedSandbox = sandbox;
  await fs.writeFile(output, `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (!report.passed) process.exitCode = 1;
}
