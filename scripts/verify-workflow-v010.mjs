// biome-ignore-all lint/suspicious/noUndeclaredEnvVars: Acceptance selects an isolated candidate, profile and runtime.
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
assert.ok(executablePath, 'Set HUANDENG_DESKTOP_EXE to the candidate executable.');
const sandbox = await fs.mkdtemp(path.join(os.tmpdir(), 'huandeng-workflow-v010-'));
const selectedPath = path.join(sandbox, 'Workflow-Acceptance.pptd');
const projectRoot = path.join(sandbox, 'Workflow-Acceptance');
const entry = path.join(projectRoot, 'deck.pptd');
const profile = path.join(sandbox, 'profile');
const evidence = path.join(root, '.verification/workflow-v010', path.basename(sandbox));
await fs.mkdir(profile, { recursive: true });
await fs.mkdir(evidence, { recursive: true });
await fs.writeFile(path.join(profile, 'preferences.json'), JSON.stringify({ recentProjects: [] }));
const env = {
  ...process.env,
  HUANDENG_DESKTOP_DATA_DIR: profile,
  HUANDENG_RUNTIME_DIR: path.join(sandbox, 'runtime'),
};
delete env.ELECTRON_RUN_AS_NODE;
const checks = [],
  screenshots = [],
  rendererErrors = [],
  exits = [],
  layouts = [];
let app, page, serviceUrl, sessionToken, identity, failure;
let processLog = '',
  launchCount = 0;
let ids = [],
  sectionId,
  presentationId,
  expectedProject;
const canvas = () => page.locator('[data-hd-editor-canvas]');
const project = () => page.locator('[data-hd-project-editor]');
const readProject = async () =>
  JSON.parse(await fs.readFile(path.join(projectRoot, '.huandeng/project.json'), 'utf8')).project;
const pathKey = (value) =>
  process.platform === 'win32' ? path.resolve(value).toLowerCase() : path.resolve(value);

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
  throw last ?? new Error('Timed out waiting for workflow acceptance state.');
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
async function saved() {
  await eventually(async () =>
    /^Saved(?:$|\s|·)/.test((await page.locator('[data-hd-save-status]').innerText()).trim()),
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
async function windowSize(width) {
  await app.evaluate(({ BrowserWindow }, size) => {
    const window = BrowserWindow.getAllWindows()[0];
    if (window.isMinimized()) window.restore();
    if (window.isMaximized()) window.unmaximize();
    window.setContentSize(size, 800);
    window.show();
    window.focus();
  }, width);
  await page.bringToFront();
  await eventually(async () => (await page.evaluate(() => window.innerWidth)) === width);
}
async function launchWelcome() {
  sessionToken = undefined;
  app = await electron.launch({
    executablePath,
    args: [
      ...(process.env.HUANDENG_DESKTOP_APP ? [process.env.HUANDENG_DESKTOP_APP] : []),
      '--welcome',
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
  await page.locator('#new-project').waitFor({ timeout: 120000 });
  await page.locator('body[data-locale-ready="true"]').waitFor();
}
async function editorReady() {
  await canvas().waitFor({ timeout: 120000 });
  const context = await page.evaluate(() => window.huandengDesktop.getContext());
  assert.equal(pathKey(context.entryPath), pathKey(entry));
  serviceUrl = context.serviceUrl;
  const session = await api('/session');
  sessionToken = session.sessionToken;
  assert.equal(session.writable, true);
  identity = await fs
    .readFile(path.join(path.dirname(executablePath), 'huandeng-build.json'), 'utf8')
    .then((value) => JSON.parse(value.replace(/^\uFEFF/, '')))
    .catch(() => null);
  await windowSize(1280);
  await saved();
}
async function closeNormally() {
  if (!app) return;
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
    exits.push({ launch: launchCount, ...result });
    assert.deepEqual(result, { code: 0, signal: null });
    app = undefined;
  } finally {
    clearTimeout(timer);
  }
}
async function mainSlide(index) {
  await saved();
  await page.locator('.hd-collection-select').selectOption('');
  await page.getByRole('button', { name: 'Slide thumbnails', exact: true }).click();
  await page.locator(`[data-hd-thumbnail="${ids[index]}"]`).click();
  await canvas().locator(`[data-pptd-page="${ids[index]}"]`).waitFor();
}
async function openProject() {
  await page.getByRole('button', { name: 'Project and Story', exact: true }).click();
  await project().waitFor();
}
async function saveProject(assertPersisted) {
  await project().getByRole('button', { name: 'Save project', exact: true }).click();
  await eventually(async () => {
    assertPersisted(await readProject());
    return true;
  });
  await eventually(
    async () =>
      !(await project().getByRole('button', { name: 'Save project', exact: true }).isEnabled()),
  );
  await saved();
}
async function locationIdentity() {
  return page.evaluate(() => {
    const url = new URL(window.location.href);
    const query = new URLSearchParams(
      url.hash.includes('?') ? url.hash.split('?').slice(1).join('?') : url.search,
    );
    return {
      page: query.get('page'),
      presentation: query.get('presentation'),
      occurrence: query.get('occurrence'),
      canvasPage: document
        .querySelector('[data-hd-editor-canvas] [data-pptd-page]')
        ?.getAttribute('data-pptd-page'),
    };
  });
}

try {
  await check(
    'Welcome creates a new writable Project through its real New Project button',
    async () => {
      await launchWelcome();
      assert.match(await page.locator('#new-project').innerText(), /New Project/i);
      await capture('01-welcome.png');
      await app.evaluate(({ dialog }, filePath) => {
        dialog.showSaveDialog = async () => ({ canceled: false, filePath });
      }, selectedPath);
      await page.locator('#new-project').click();
      await editorReady();
      assert.equal((await api('/session')).pages.length, 1);
      await fs.access(entry);
    },
  );
  await check('the Pages UI adds two Main Slides and retains their saved identities', async () => {
    await page.getByRole('button', { name: 'Slide thumbnails', exact: true }).click();
    for (const count of [2, 3]) {
      await page
        .getByRole('button', { name: /^(Add slide|New slide)$/ })
        .first()
        .click();
      await eventually(async () => (await api('/session')).pages.length === count);
      await saved();
    }
    ids = (await api('/session')).pages.map((item) => item.pageId);
    assert.equal(new Set(ids).size, 3);
    await mainSlide(1);
    const before = await locationIdentity();
    assert.equal(before.canvasPage, ids[1]);
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+s' : 'Control+s');
    await saved();
    assert.deepEqual(await locationIdentity(), before);
  });
  await check(
    'Section Start and End Positions save a continuous range without moving the current Main Slide',
    async () => {
      const before = await locationIdentity();
      await openProject();
      await project().getByRole('button', { name: 'New Section', exact: true }).click();
      const section = project().locator('[data-hd-project-section]').last();
      sectionId = await section.getAttribute('data-hd-project-section');
      await section
        .getByRole('textbox', { name: 'Section name', exact: true })
        .fill('Evidence route');
      // The wrapping labels also contain option text; target their stable input suffixes.
      await section.locator('select[id$="-start"]').selectOption(ids[0]);
      await section.locator('select[id$="-end"]').selectOption(ids[1]);
      await section.locator('[data-hd-set-section-range]').click();
      assert.match(await section.locator('[data-hd-section-range]').innerText(), /Positions 1–2/);
      await saveProject((data) => {
        assert.deepEqual(data.sections[0].range, { startPageId: ids[0], endPageId: ids[1] });
        assert.deepEqual(data.sections[0].pageIds, ids.slice(0, 2));
      });
      assert.deepEqual(await locationIdentity(), before);
      await capture('02-section-range.png');
    },
  );
  await check(
    'a new Presentation offers visual previews, individual slides, a Section and repeated slides',
    async () => {
      await project().getByRole('button', { name: 'New presentation', exact: true }).click();
      await project()
        .getByRole('textbox', { name: 'Presentation name', exact: true })
        .fill('Evidence walkthrough');
      assert.equal(
        await project()
          .locator('details')
          .filter({ has: page.getByText('Presentation Story', { exact: true }) })
          .getAttribute('open'),
        null,
      );
      const picker = project().locator('[data-hd-source-picker]');
      await picker.waitFor();
      const first = picker.locator(`[data-hd-add-main-slide="${ids[0]}"]`);
      assert.match(await first.innerText(), /Position 1/);
      assert.match(await first.innerText(), /Slide ID/);
      await first.hover();
      await page
        .locator('[data-slot="tooltip-content"]:visible')
        .filter({ has: page.locator(`[data-hd-project-preview="${ids[0]}"]`) })
        .waitFor();
      await capture('03-source-preview.png');
      await first.click();
      await picker.locator(`[data-hd-add-section="${sectionId}"]`).click();
      await first.click();
      await picker.locator(`[data-hd-add-main-slide="${ids[2]}"]`).click();
      assert.equal(await project().locator('[data-hd-presentation-item]').count(), 4);
      await saveProject((data) => {
        const presentation = data.presentations[0];
        presentationId = presentation.id;
        assert.equal(presentation.title, 'Evidence walkthrough');
        assert.deepEqual(
          presentation.items.map((item) => item.kind),
          ['page', 'section', 'page', 'page'],
        );
        assert.equal(presentation.items[0].pageId, ids[0]);
        assert.equal(presentation.items[2].pageId, ids[0]);
      });
    },
  );
  await check(
    'reorder and remove change the arrangement, then saving preserves the selected repeated occurrence',
    async () => {
      const rows = project().locator('[data-hd-presentation-item]');
      await rows
        .nth(2)
        .getByRole('button', { name: /^Move .* up$/ })
        .click();
      await rows
        .nth(3)
        .getByRole('button', { name: /^Remove / })
        .click();
      await saveProject((data) => {
        const items = data.presentations[0].items;
        assert.equal(items.length, 3);
        assert.deepEqual(
          items.map((item) => item.kind),
          ['page', 'page', 'section'],
        );
        assert.deepEqual(
          items.slice(0, 2).map((item) => item.pageId),
          [ids[0], ids[0]],
        );
      });
      const persisted = await readProject();
      const itemId = persisted.presentations[0].items[1].id;
      const occurrence = `${presentationId}:${itemId}:${ids[0]}`;
      await project().locator(`[data-hd-project-occurrence="${occurrence}"]`).click();
      await eventually(async () => (await locationIdentity()).occurrence === occurrence);
      const before = await locationIdentity();
      assert.equal(before.canvasPage, ids[0]);
      await project()
        .getByRole('textbox', { name: 'Presentation name', exact: true })
        .fill('Evidence walkthrough · saved');
      await saveProject((data) =>
        assert.equal(data.presentations[0].title, 'Evidence walkthrough · saved'),
      );
      assert.deepEqual(await locationIdentity(), before);
      expectedProject = await readProject();
      await capture('04-presentation-order.png');
    },
  );
  await check(
    'normal and compact windows show the same saved Project without document overflow',
    async () => {
      for (const width of [1280, 1040]) {
        await windowSize(width);
        const layout = await page.evaluate(() => ({
          width: window.innerWidth,
          scrollWidth: document.documentElement.scrollWidth,
          bodyWidth: document.body.scrollWidth,
          canvas: !!document.querySelector('[data-hd-editor-canvas]'),
        }));
        assert.equal(layout.canvas, true);
        assert.ok(layout.scrollWidth <= width + 1);
        assert.ok(layout.bodyWidth <= width + 1);
        layouts.push(layout);
        await capture(`05-workflow-${width}.png`);
      }
      assert.deepEqual(await readProject(), expectedProject);
    },
  );
  await check(
    'normal close and Welcome Open Project restore saved Sections and the repeated Presentation',
    async () => {
      await closeNormally();
      await launchWelcome();
      await app.evaluate(({ dialog }, filePath) => {
        dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [filePath] });
      }, entry);
      await page.locator('#open-project').click();
      await editorReady();
      assert.deepEqual(
        (await api('/session')).pages.map((item) => item.pageId),
        ids,
      );
      assert.deepEqual(await readProject(), expectedProject);
      await page.locator('.hd-collection-select').selectOption(presentationId);
      await openProject();
      assert.equal(
        await project()
          .getByRole('textbox', { name: 'Presentation name', exact: true })
          .inputValue(),
        'Evidence walkthrough · saved',
      );
      assert.equal(await project().locator('[data-hd-presentation-item]').count(), 3);
      assert.equal(await project().locator('[data-hd-project-occurrence]').count(), 4);
      await capture('06-reopened.png');
      await closeNormally();
      assert.deepEqual(rendererErrors, []);
    },
  );
} catch (error) {
  failure = { message: error.message, stack: error.stack };
  if (page && !page.isClosed()) await capture('failure.png').catch(() => {});
} finally {
  const report = {
    passed: !failure,
    checks,
    rendererErrors,
    exits,
    screenshots,
    layouts,
    identity,
    sandbox,
    entry,
    evidence,
    pageIds: ids,
    sectionId,
    presentationId,
    expectedProject,
    failure,
    processLog,
  };
  // Preserve the failure before cleanup: the real draft guard can correctly reject close.
  await fs.writeFile(path.join(evidence, 'acceptance.json'), JSON.stringify(report, null, 2));
  process.stdout.write(
    `${JSON.stringify({ passed: report.passed, checks: checks.length, evidence, failure }, null, 2)}\n`,
  );
  if (failure) process.exitCode = 1;
  if (failure && app) {
    const ownedProcess = app.process();
    const exit =
      ownedProcess.exitCode !== null
        ? Promise.resolve({ code: ownedProcess.exitCode, signal: ownedProcess.signalCode })
        : new Promise((resolve) =>
            ownedProcess.once('exit', (code, signal) => resolve({ code, signal })),
          );
    let timer;
    try {
      void app.evaluate(({ app: isolatedApp }) => isolatedApp.exit(1)).catch(() => {});
      report.failureCleanup = await Promise.race([
        exit,
        new Promise((resolve) => {
          timer = setTimeout(() => resolve({ timedOut: true }), 5000);
        }),
      ]);
      if (report.failureCleanup.timedOut) ownedProcess.kill();
    } finally {
      clearTimeout(timer);
    }
    await fs.writeFile(path.join(evidence, 'acceptance.json'), JSON.stringify(report, null, 2));
  }
}
