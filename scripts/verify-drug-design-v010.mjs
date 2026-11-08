// biome-ignore-all lint/suspicious/noUndeclaredEnvVars: Acceptance uses an explicitly selected executable and isolated profile.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
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
const exportsRequested = process.argv.includes('--exports');
const source = path.join(root, 'examples/drug-design-v010');
const sandbox = await fs.mkdtemp(path.join(os.tmpdir(), 'huandeng-drug-design-v010-'));
const project = path.join(sandbox, 'drug-design');
const entry = path.join(project, 'deck.pptd');
const evidence = path.join(root, '.verification/drug-design-v010', path.basename(sandbox));
const manifest = YAML.parse(await fs.readFile(path.join(source, 'deck.pptd'), 'utf8'));
const sourceFiles = ['deck.pptd', '.huandeng/project.json', ...manifest.pages];
const checks = [];
const rendererErrors = [];
const screenshots = [];
const layouts = [];
const exports = [];
const exits = [];
const processLog = [];
let app;
let page;
let serviceUrl;
let token;
let identity;
let main;
let full;
let brief;

const normalize = (value) => value.replace(/\s+/g, ' ').trim();
const pathKey = (value) =>
  process.platform === 'win32' ? path.resolve(value).toLowerCase() : path.resolve(value);
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const sourceHashes = async (directory) =>
  Object.fromEntries(
    await Promise.all(
      sourceFiles.map(async (file) => [file, hash(await fs.readFile(path.join(directory, file)))]),
    ),
  );
const sourceBefore = await sourceHashes(source);
await fs.cp(source, project, { recursive: true });
await fs.mkdir(path.join(sandbox, 'profile'), { recursive: true });
await fs.writeFile(
  path.join(sandbox, 'profile/preferences.json'),
  JSON.stringify({ recentProjects: [] }),
);
await fs.mkdir(evidence, { recursive: true });
const copyBefore = await sourceHashes(project);

async function eventually(read, timeout = 15000) {
  const deadline = Date.now() + timeout;
  let failure;
  while (Date.now() < deadline) {
    try {
      const result = await read();
      if (result) return result;
    } catch (error) {
      failure = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw failure ?? new Error('Timed out waiting for the expected editor state.');
}

async function api(route, body) {
  const response = await fetch(`${serviceUrl}/__pptd${route}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      'content-type': 'application/json',
      ...(token ? { 'x-huandeng-token': token } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(body === undefined ? 15000 : 120000),
  });
  const result = await response.json();
  assert.ok(response.ok, `${route}: ${JSON.stringify(result)}`);
  return result;
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

async function launch() {
  const env = {
    ...process.env,
    HUANDENG_DESKTOP_DATA_DIR: path.join(sandbox, 'profile'),
    HUANDENG_RUNTIME_DIR: path.join(sandbox, 'runtime'),
  };
  delete env.ELECTRON_RUN_AS_NODE;
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
  app.process().stdout?.on('data', (bytes) => processLog.push(`[stdout] ${bytes}`));
  app.process().stderr?.on('data', (bytes) => processLog.push(`[stderr] ${bytes}`));
  page = await app.firstWindow();
  page.setDefaultTimeout(15000);
  page.on('pageerror', (error) => rendererErrors.push(error.message));
  await page.locator('[data-hd-editor-canvas]').waitFor({ timeout: 120000 });
  const context = await page.evaluate(() => window.huandengDesktop.getContext());
  assert.equal(pathKey(context.entryPath), pathKey(entry));
  serviceUrl = context.serviceUrl;
  const session = await api('/session');
  token = session.sessionToken;
  assert.equal(pathKey(session.entry), pathKey(entry));
  await app.evaluate(({ BrowserWindow }) => {
    const window = BrowserWindow.getAllWindows()[0];
    window.restore();
    window.setContentSize(1600, 1000);
    window.show();
    window.focus();
  });
  identity = await fs
    .readFile(path.join(path.dirname(executablePath), 'huandeng-build.json'), 'utf8')
    .then((value) => JSON.parse(value.replace(/^\uFEFF/, '')))
    .catch(() => null);
}

async function closeNormally() {
  const current = app;
  if (!current) return;
  const exit = new Promise((resolve) =>
    current.process().once('exit', (code, signal) => resolve({ code, signal })),
  );
  await current.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].close());
  let timer;
  try {
    const result = await Promise.race([
      exit,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('Isolated app did not close normally.')), 20000);
      }),
    ]);
    exits.push(result);
    assert.deepEqual(result, { code: 0, signal: null });
    app = undefined;
  } finally {
    clearTimeout(timer);
  }
}

async function collection(id, expected) {
  await page.locator('.hd-collection-select').selectOption(id ?? '');
  await page.getByRole('button', { name: 'Slide thumbnails', exact: true }).click();
  await eventually(async () => {
    const ids = await page
      .locator('[data-hd-thumbnail]')
      .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-hd-thumbnail')));
    return ids.length === expected.length && ids.every((value, index) => value === expected[index]);
  });
  await page.locator('[data-hd-thumbnail]').first().click();
  await page.locator(`[data-hd-editor-canvas] [data-pptd-page="${expected[0]}"]`).waitFor();
}

async function screenshot(name, locator = page) {
  await locator.screenshot({
    path: path.join(evidence, name),
    animations: 'disabled',
    timeout: 15000,
  });
  screenshots.push(name);
}

async function renderPresentation(snapshot, capture) {
  const expected = snapshot.pages;
  await collection(
    snapshot.presentationId,
    expected.map((slide) => slide.pageId),
  );
  await page.locator('[data-hd-editor-canvas]').focus();
  await page.keyboard.press('F5');
  await page.locator('[data-hd-presenter]').waitFor();
  for (const [index, slide] of expected.entries()) {
    const surface = page.locator(`[data-hd-presenter-slide="${slide.pageId}"]`);
    await surface.waitFor();
    assert.equal(await surface.getAttribute('data-hd-presenter-occurrence'), slide.occurrenceId);
    const frame = surface.locator('[data-pptd-page]');
    await frame.waitFor();
    await page.evaluate(async () => {
      await document.fonts.ready;
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    });
    assert.equal(
      await frame
        .locator('[data-hd-unsupported="true"], [data-hd-formula-error], [data-hd-loading]')
        .count(),
      0,
    );
    assert.equal(
      normalize(await frame.locator('[data-hd-element-id="title"]').innerText()),
      normalize(slide.data.title),
    );
    if (capture) {
      const measured = await frame.evaluate((canvas) => {
        const frameBounds = canvas.getBoundingClientRect();
        const overflow = [];
        for (const content of canvas.querySelectorAll('[data-hd-text-content]')) {
          const owner = content.closest('[data-hd-element-id]');
          const textBounds = content.getBoundingClientRect();
          const bounds = owner.getBoundingClientRect();
          if (
            textBounds.bottom > bounds.bottom + 2 ||
            textBounds.right > bounds.right + 2 ||
            content.scrollWidth > content.clientWidth + 2
          ) {
            overflow.push({
              elementId: owner.getAttribute('data-hd-element-id'),
              text: content.textContent,
              height: textBounds.height,
              ownerHeight: bounds.height,
            });
          }
        }
        return { width: frameBounds.width, height: frameBounds.height, overflow };
      });
      layouts.push({ pageId: slide.pageId, shortCode: slide.shortCode, ...measured });
      assert.ok(measured.width > 500 && measured.height > 250, JSON.stringify(measured));
      assert.deepEqual(
        measured.overflow,
        [],
        `${slide.shortCode}: text exceeds its authored bounds`,
      );
      await screenshot(`${slide.shortCode}-slide.png`, frame);
    }
    if (index === 0 && capture) {
      await page.locator('[data-hd-presenter-notes-toggle]').click();
      const note = page.locator('[data-hd-presenter-note-text]');
      await note.waitFor();
      assert.equal(normalize(await note.innerText()), normalize(slide.data.notes));
      await screenshot('presenter-with-sources.png');
      await page.locator('[data-hd-presenter-notes-toggle]').click();
    }
    if (index < expected.length - 1) {
      await surface.focus();
      await page.keyboard.press('ArrowRight');
    }
  }
  const lastId = expected.at(-1).pageId;
  await page.locator(`[data-hd-presenter-slide="${lastId}"]`).focus();
  await page.keyboard.press('ArrowRight');
  assert.equal(
    await page.locator('[data-hd-presenter-slide]').getAttribute('data-hd-presenter-slide'),
    lastId,
  );
  await page.keyboard.press('Escape');
  await page.locator('[data-hd-presenter]').waitFor({ state: 'detached' });
}

async function pdfFromUi(snapshot, name) {
  await collection(
    snapshot.presentationId,
    snapshot.pages.map((slide) => slide.pageId),
  );
  await page.locator('[data-hd-export]').click();
  const dialog = page.locator('[data-hd-export-dialog]');
  await dialog.getByLabel('Export format', { exact: true }).selectOption('pdf');
  const range = dialog.getByLabel('Export range', { exact: true });
  assert.equal(await range.inputValue(), 'collection');
  const rangeLabel = await range.locator('option:checked').innerText();
  assert.ok(
    rangeLabel.includes(snapshot.title) && rangeLabel.includes(String(snapshot.pages.length)),
    rangeLabel,
  );
  const pending = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === '/__pptd/export' &&
      response.request().method() === 'POST',
    { timeout: 120000 },
  );
  await dialog.getByRole('button', { name: /^(Start export|Export again)$/ }).click();
  const response = await pending;
  const result = await response.json();
  assert.ok(response.ok(), JSON.stringify(result));
  assert.equal(result.report.complete, true);
  assert.deepEqual(
    result.report.pages.map((slide) => slide.pageId),
    snapshot.pages.map((slide) => slide.pageId),
  );
  await dialog.locator('[data-hd-export-result]').waitFor();
  await eventually(async () =>
    (await dialog.locator('[data-hd-export-result]').innerText()).includes(result.fileName),
  );
  const bytes = await fs.readFile(result.file);
  assert.equal(bytes.subarray(0, 4).toString(), '%PDF');
  const physicalPages = [...bytes.toString('latin1').matchAll(/\/Type\s*\/Page\b/g)].length;
  assert.equal(physicalPages, snapshot.pages.length);
  const destination = path.join(evidence, name);
  await fs.writeFile(destination, bytes);
  exports.push({
    format: 'pdf',
    presentationId: snapshot.presentationId,
    pages: physicalPages,
    file: destination,
    report: result.report,
  });
  await screenshot(`${snapshot.presentationId}-export.png`);
  await page.keyboard.press('Escape');
  await dialog.waitFor({ state: 'detached' });
}

try {
  await check('fresh profile opens the native example in English', async () => {
    await launch();
    await eventually(async () => (await page.locator('html').getAttribute('lang')) === 'en');
    main = await api('/session');
    assert.equal(main.pages.length, 10);
    assert.deepEqual(main.size, [960, 540]);
    assert.equal(main.metadata.project.sections.length, 3);
    assert.equal(main.metadata.project.presentations.length, 2);
    assert.deepEqual(
      main.diagnostics.filter((diagnostic) => diagnostic.severity === 'error'),
      [],
    );
    for (const slide of main.pages) {
      assert.ok(slide.data.notes.includes('Sources\n'));
      assert.ok(slide.data.elements.some((element) => element.elementId === 'slide-id'));
    }
    await screenshot('editor-main-slides.png');
  });
  await check('saved Presentations resolve ten and five stable Main Slide references', async () => {
    full = await api('/presentations/drug-design-overview');
    brief = await api('/presentations/drug-design-briefing');
    assert.deepEqual(
      full.pages.map((slide) => slide.pageId),
      main.pages.map((slide) => slide.pageId),
    );
    assert.deepEqual(
      brief.pages.map((slide) => slide.pageId),
      [0, 2, 6, 7, 9].map((index) => main.pages[index].pageId),
    );
    assert.equal(new Set(full.pages.map((slide) => slide.occurrenceId)).size, 10);
    assert.equal(new Set(brief.pages.map((slide) => slide.occurrenceId)).size, 5);
  });
  await check(
    'all ten slides present in order with readable native objects and source notes',
    async () => {
      await renderPresentation(full, true);
    },
  );
  await check('the five-slide briefing follows its own order using the same slides', async () => {
    await renderPresentation(brief, false);
  });
  if (exportsRequested) {
    await check('native renderer exports ten complete PNG pages', async () => {
      for (const slide of full.pages) {
        const result = await api('/render', {
          pageId: slide.pageId,
          occurrenceId: slide.occurrenceId,
          presentationId: full.presentationId,
        });
        assert.equal(result.report.complete, true);
        assert.equal(result.report.pages.length, 1);
        assert.equal(result.report.pages[0].pageId, slide.pageId);
        const bytes = await fs.readFile(result.file);
        assert.equal(bytes.subarray(1, 4).toString(), 'PNG');
        assert.equal(bytes.readUInt32BE(16), 1920);
        assert.equal(bytes.readUInt32BE(20), 1080);
        const destination = path.join(evidence, `${slide.shortCode}-export.png`);
        await fs.writeFile(destination, bytes);
        exports.push({ format: 'png', pageId: slide.pageId, file: destination });
      }
    });
    await check(
      'the Export dialog delivers PDFs for the ten-slide and five-slide collections',
      async () => {
        await pdfFromUi(full, 'Drug-Design-full.pdf');
        await pdfFromUi(brief, 'Drug-Design-briefing.pdf');
      },
    );
  }
  await check(
    'browsing and export leave canonical pages and project structure unchanged',
    async () => {
      await collection(
        null,
        main.pages.map((slide) => slide.pageId),
      );
      assert.deepEqual(await sourceHashes(project), copyBefore);
      assert.deepEqual(await sourceHashes(source), sourceBefore);
    },
  );
  await check(
    'the saved project and both Presentations survive normal close and reopen',
    async () => {
      await closeNormally();
      await launch();
      const reopened = await api('/session');
      assert.deepEqual(
        reopened.pages.map((slide) => slide.pageId),
        main.pages.map((slide) => slide.pageId),
      );
      assert.deepEqual(reopened.metadata.project, main.metadata.project);
      await collection(
        brief.presentationId,
        brief.pages.map((slide) => slide.pageId),
      );
      await screenshot('editor-briefing-reopened.png');
      await closeNormally();
    },
  );
  assert.deepEqual(rendererErrors, []);
} catch (error) {
  process.exitCode = 1;
  processLog.push(`[harness] ${error.stack ?? error}\n`);
  process.stderr.write(`${error.stack ?? error}\n`);
  await page
    ?.screenshot({ path: path.join(evidence, 'failure.png'), timeout: 5000 })
    .catch(() => {});
} finally {
  if (app) {
    try {
      await closeNormally();
    } catch (error) {
      process.exitCode = 1;
      processLog.push(`[close] ${error}\n`);
      await app?.close().catch(() => {});
    }
  }
  const report = {
    passed: !process.exitCode && rendererErrors.length === 0,
    timestamp: new Date().toISOString(),
    executablePath,
    identity,
    sandbox,
    evidence,
    checks,
    rendererErrors,
    exits,
    layouts,
    screenshots,
    exportsRequested,
    exports,
    sourceFiles,
    visualReview:
      'Captured slides require author inspection. Passing geometry checks is not visual approval.',
  };
  await fs.writeFile(path.join(evidence, 'process.log'), processLog.join(''));
  await fs.writeFile(
    path.join(evidence, 'acceptance.json'),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  process.stdout.write(
    `${JSON.stringify({ passed: report.passed, checks: checks.length, report: path.join(evidence, 'acceptance.json') })}\n`,
  );
}
