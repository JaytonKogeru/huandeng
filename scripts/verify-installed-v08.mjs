// biome-ignore-all lint/suspicious/noUndeclaredEnvVars: Verifies an explicitly selected installation outside the Turbo cache.
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
const evidence = path.join(root, '.verification');
const output = path.join(evidence, 'installed-v08.json');
const rendererErrors = [];
const processLog = [];
const report = { passed: false, executablePath, syntheticOnly: true, rendererErrors };
const pathKey = (value) =>
  process.platform === 'win32' ? path.resolve(value).toLowerCase() : path.resolve(value);
const readJson = async (file) => JSON.parse(await fs.readFile(file, 'utf8'));
let application;
let page;
let sandbox;
let exited;
await fs.mkdir(evidence, { recursive: true });

try {
  assert.ok(executablePath && path.isAbsolute(executablePath), 'Set HUANDENG_DESKTOP_EXE.');
  const installed = path.dirname(executablePath);
  const release = await readJson(path.join(root, 'packages/desktop/release.json'));
  report.marker = await readJson(path.join(installed, 'huandeng-build.json'));
  const installedRelease = await readJson(path.join(installed, 'resources/app/release.json'));
  report.installedVersion = installedRelease.version;
  report.expectedVersion = release.version;
  assert.equal(report.marker.sourceDirty, false);
  assert.equal(report.marker.productVersion, release.version);
  assert.equal(report.installedVersion, release.version);
  sandbox = await fs.mkdtemp(path.join(os.tmpdir(), 'huandeng-installed-v08-'));
  const project = path.join(sandbox, 'studio');
  await fs.cp(path.join(root, 'tests/fixtures/studio'), project, { recursive: true });
  const entry = path.join(project, 'deck.pptd');
  const env = {
    ...process.env,
    HUANDENG_DESKTOP_DATA_DIR: path.join(sandbox, 'profile'),
    HUANDENG_RUNTIME_DIR: path.join(sandbox, 'runtime'),
  };
  delete env.ELECTRON_RUN_AS_NODE;
  application = await electron.launch({
    executablePath,
    args: ['--entry', entry],
    env,
    cwd: root,
    timeout: 90000,
  });
  const child = application.process();
  child.stdout?.on('data', (data) => processLog.push(`[stdout] ${data}`));
  child.stderr?.on('data', (data) => processLog.push(`[stderr] ${data}`));
  exited = new Promise((resolve) =>
    child.once('exit', (code, signal) => resolve({ code, signal })),
  );
  page = await application.firstWindow();
  page.on('pageerror', (error) => rendererErrors.push(error.message));
  await page.locator('[data-hd-editor-canvas]').waitFor({ timeout: 90000 });
  const context = await page.evaluate(() => window.huandengDesktop.getContext());
  assert.equal(pathKey(context.entryPath), pathKey(entry));
  const response = await fetch(`${context.serviceUrl}/__pptd/session`, {
    signal: AbortSignal.timeout(15000),
  });
  assert.equal(response.ok, true);
  assert.equal(response.headers.get('x-huandeng-runtime'), 'static');
  const session = await response.json();
  assert.equal(pathKey(session.entry), pathKey(entry));
  assert.equal(session.pages.length, 3);
  assert.equal(session.writable, true);
  report.context = { entryPath: context.entryPath, serviceUrl: context.serviceUrl };
  report.documentRuntime = 'static';
  report.syntheticPages = session.pages.length;
  report.writable = session.writable;
  const capabilities = await fetch(`${context.serviceUrl}/__pptd/video/capabilities`, {
    signal: AbortSignal.timeout(20000),
  });
  assert.equal(capabilities.ok, true);
  report.videoCapabilities = await capabilities.json();
  assert.equal(typeof report.videoCapabilities.available, 'boolean');
  if (report.videoCapabilities.available)
    assert.ok(report.videoCapabilities.formats.includes('mp4'));
  else assert.ok(report.videoCapabilities.message);
  report.electronVersion = await application.evaluate(() => process.versions.electron);
  report.about = await application.evaluate(({ Menu, dialog }) => {
    const original = dialog.showMessageBox;
    let options;
    dialog.showMessageBox = async (_window, value) => {
      options = value;
      return { response: 0, checkboxChecked: false };
    };
    try {
      const help = Menu.getApplicationMenu()?.items.find((item) => item.label === '帮助');
      const about = help?.submenu?.items.find((item) => item.label === '关于 HUANDENG Editor');
      if (!about) throw new Error('The installed About command is missing.');
      about.click();
      return options;
    } finally {
      dialog.showMessageBox = original;
    }
  });
  assert.equal(report.about?.message, `HUANDENG Editor ${release.version}`);
  report.aboutVerification =
    'Executed the real native Menu click handler; captured options with a temporary showMessageBox stub. No native-dialog screenshot.';
  report.screenshot = path.join(evidence, 'installed-v08.png');
  await page.screenshot({ path: report.screenshot, animations: 'disabled', timeout: 15000 });
  assert.deepEqual(rendererErrors, []);
  report.passed = true;
} catch (error) {
  report.error = error.stack ?? String(error);
  processLog.push(`[harness] ${report.error}\n`);
  await page
    ?.screenshot({ path: path.join(evidence, 'installed-v08-failure.png'), timeout: 5000 })
    .catch(() => {});
} finally {
  if (application) {
    let timer;
    try {
      const [, exit] = await Promise.race([
        Promise.all([application.close(), exited]),
        new Promise((_, reject) => {
          timer = setTimeout(
            () => reject(new Error('Installed app did not close normally.')),
            15000,
          );
        }),
      ]);
      report.normalExit = exit;
      assert.deepEqual(exit, { code: 0, signal: null });
    } catch (error) {
      report.passed = false;
      report.closeError = String(error);
      processLog.push(`[close] ${report.closeError}\n`);
      if (application.process().exitCode === null && application.process().signalCode === null)
        report.isolatedTestProcessTerminated = application.process().kill('SIGKILL');
    } finally {
      clearTimeout(timer);
    }
  }
  if (rendererErrors.length) report.passed = false;
  if (report.passed && sandbox)
    await fs
      .rm(sandbox, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 })
      .catch((error) => {
        report.cleanupError = String(error);
        report.retainedSandbox = sandbox;
      });
  else if (sandbox) report.retainedSandbox = sandbox;
  report.timestamp = new Date().toISOString();
  report.processLog = path.join(evidence, 'installed-v08-process.log');
  await fs.writeFile(report.processLog, processLog.join(''));
  await fs.writeFile(output, `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (!report.passed) process.exitCode = 1;
}
