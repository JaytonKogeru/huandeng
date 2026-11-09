// biome-ignore-all lint/suspicious/noUndeclaredEnvVars: The audit selects an isolated packaged runtime and profile.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(root, 'packages/core/package.json'));
const { _electron: electron } = require('playwright');
const YAML = require('yaml');
const { values } = parseArgs({
  options: {
    entry: { type: 'string' },
    output: { type: 'string' },
    label: { type: 'string' },
    'edit-probe': { type: 'boolean', default: false },
  },
});
assert.ok(values.entry && path.isAbsolute(values.entry));
assert.ok(values.output && path.isAbsolute(values.output));
assert.match(values.label ?? '', /^[a-zA-Z0-9_-]+$/);
const executablePath = process.env.HUANDENG_DESKTOP_EXE;
assert.ok(executablePath);
const sourceEntry = await fs.realpath(values.entry);
const sourceRoot = path.dirname(sourceEntry);
const manifest = YAML.parse(await fs.readFile(sourceEntry, 'utf8'));
const metadata = JSON.parse(
  await fs.readFile(path.join(sourceRoot, '.huandeng/project.json'), 'utf8'),
);
const sources = [
  ...new Set([
    path.basename(sourceEntry),
    '.huandeng/project.json',
    ...manifest.pages,
    ...Object.values(metadata.slides ?? {})
      .map((item) => item.path)
      .filter(Boolean),
  ]),
];
async function hashes() {
  const result = {};
  for (const relative of sources) {
    const file = path.resolve(sourceRoot, relative);
    const inside = path.relative(sourceRoot, file);
    assert.ok(inside && !inside.startsWith('..') && !path.isAbsolute(inside));
    result[relative] = createHash('sha256')
      .update(await fs.readFile(file))
      .digest('hex');
  }
  return result;
}
const before = await hashes();
const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'huandeng-perf-v015-'));
const project = path.join(directory, 'project');
const entry = path.join(project, path.basename(sourceEntry));
const excluded = new Set(['Exports', '.git', 'node_modules', 'scripts', '.verification']);
await fs.cp(sourceRoot, project, {
  recursive: true,
  filter: (file) =>
    !path
      .relative(sourceRoot, file)
      .split(path.sep)
      .some((part) => excluded.has(part)),
});
await fs.mkdir(values.output, { recursive: true });
const report = {
  label: values.label,
  date: new Date().toISOString(),
  sourceEntry,
  directory,
  package: JSON.parse(
    await fs.readFile(path.join(path.dirname(executablePath), 'huandeng-build.json'), 'utf8'),
  ),
  environment: {
    cpus: os.cpus().length,
    cpu: os.cpus()[0].model,
    totalGiB: os.totalmem() / 2 ** 30,
    freeGiB: os.freemem() / 2 ** 30,
  },
  methodologyVersion: 2,
  methodology:
    'Fresh process/profile and project copy; filesystem cache is not cleared. Timings start and finish inside the renderer, from capture event to DOM condition plus two animation frames, not compositor presentation. Images are counted separately. Navigation/search plus optional reversible notes edits occur only in the copy; original sources are hashed before/after. Existing user applications remain running. No forced GC.',
  interactions: [],
  stages: [],
  requests: [],
  rendererErrors: [],
  editProbe: values['edit-probe'],
  saves: [],
  assetResponses: [],
  transactionResponses: [],
};
let app;
let page;
let cdp;
let failure;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function until(read, timeout = 120000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const result = await read();
    if (result) return result;
    await wait(50);
  }
  throw new Error('Audit condition timed out');
}
async function frame() {
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
}
async function sample(name) {
  const dom = await page.evaluate(() => ({
    nodes: document.querySelectorAll('*').length,
    pageRenderers: document.querySelectorAll('[data-pptd-page]').length,
    railRenderers: document.querySelectorAll('[data-hd-thumbnail] [data-pptd-page]').length,
    browserRenderers: document.querySelectorAll('[data-hd-browser-card] [data-pptd-page]').length,
    browserCards: document.querySelectorAll('[data-hd-browser-card]').length,
    images: document.images.length,
    pendingImages: [...document.images].filter((image) => !image.complete).length,
  }));
  const { metrics } = await cdp.send('Performance.getMetrics');
  const selected = metrics.filter((m) =>
    /^(JSHeapUsedSize|Nodes|TaskDuration|ScriptDuration|LayoutDuration|RecalcStyleDuration)$/.test(
      m.name,
    ),
  );
  const processes = await app.evaluate(({ app: electronApp }) =>
    electronApp.getAppMetrics().map((m) => ({
      type: m.type,
      workingSetKiB: m.memory.workingSetSize,
      privateBytesKiB: m.memory.privateBytes,
    })),
  );
  report.stages.push({
    name,
    dom,
    chromium: Object.fromEntries(selected.map((m) => [m.name, m.value])),
    processes,
  });
}
async function interaction(name, selector, condition, value) {
  await page.evaluate(
    ({ target, eventType, ready }) => {
      window.__auditAction = { start: null, end: null };
      const capture = (event) => {
        if (!event.target.closest(target)) return;
        window.__auditAction.start = performance.now();
        document.removeEventListener(eventType, capture, true);
        const poll = () => {
          const node = document.querySelector(ready.selector);
          if (node && (!ready.attribute || node.getAttribute(ready.attribute) === ready.value)) {
            requestAnimationFrame(() =>
              requestAnimationFrame(() => {
                window.__auditAction.end = performance.now();
              }),
            );
          } else requestAnimationFrame(poll);
        };
        requestAnimationFrame(poll);
      };
      document.addEventListener(eventType, capture, true);
    },
    { target: selector, eventType: value === undefined ? 'click' : 'input', ready: condition },
  );
  if (value === undefined) await page.locator(selector).click();
  else await page.locator(selector).fill(value);
  await page.waitForFunction(() => window.__auditAction.end !== null, null, { timeout: 30000 });
  report.interactions.push(
    await page.evaluate((action) => {
      const start = window.__auditAction.start;
      if (start === null) throw new Error('Input capture missing');
      const elapsedMs = window.__auditAction.end - start;
      const tasks = window.__auditLongTasks.filter(
        (task) => task.startTime >= start && task.startTime <= window.__auditAction.end,
      );
      return {
        name: action,
        elapsedMs,
        longTasks: tasks.length,
        maxLongTaskMs: Math.max(0, ...tasks.map((task) => task.duration)),
      };
    }, name),
  );
}
async function view(name) {
  await interaction(`view-${name}`, `[data-hd-workspace-view="${name}"]`, {
    selector: '[data-hd-slide-document]',
    attribute: 'data-hd-current-workspace-view',
    value: name,
  });
}
try {
  const env = {
    ...process.env,
    HUANDENG_DESKTOP_DATA_DIR: path.join(directory, 'profile'),
    HUANDENG_RUNTIME_DIR: path.join(directory, 'runtime'),
  };
  delete env.ELECTRON_RUN_AS_NODE;
  const start = performance.now();
  app = await electron.launch({
    executablePath,
    args: ['--entry', entry],
    cwd: root,
    env,
    timeout: 180000,
  });
  report.launchHandshakeMs = performance.now() - start;
  page = await until(() =>
    app
      .context()
      .pages()
      .find((candidate) => candidate.url().includes('/huandeng')),
  );
  page.on('pageerror', (error) => report.rendererErrors.push(error.message));
  const requests = new Map();
  page.on('request', (request) => requests.set(request, performance.now()));
  page.on('response', (response) => {
    const url = new URL(response.url());
    if (url.pathname.endsWith('/asset-preview') || url.pathname.endsWith('/asset')) {
      const headers = response.headers();
      report.assetResponses.push({
        kind: url.pathname.endsWith('/asset-preview') ? 'preview' : 'original',
        status: response.status(),
        responseHeadersMs:
          performance.now() - (requests.get(response.request()) ?? performance.now()),
        mode: headers['x-huandeng-preview'],
        reason: headers['x-huandeng-preview-reason'],
      });
    }
    if (url.pathname.endsWith('/transactions')) {
      report.transactionResponses.push({
        status: response.status(),
        responseHeadersMs:
          performance.now() - (requests.get(response.request()) ?? performance.now()),
      });
    }
    requests.delete(response.request());
  });
  page.on('requestfailed', (request) => requests.delete(request));
  await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()[0].setContentSize(1600, 1000),
  );
  await page.locator('[data-hd-editor-canvas] [data-pptd-page]').waitFor({ timeout: 180000 });
  await frame();
  report.canvasReadyMs = performance.now() - start;
  cdp = await page.context().newCDPSession(page);
  await cdp.send('Performance.enable');
  await page.evaluate(() => {
    window.__auditLongTasks = [];
    window.__auditObserver = new PerformanceObserver((list) => {
      window.__auditLongTasks.push(
        ...list
          .getEntries()
          .map((event) => ({ startTime: event.startTime, duration: event.duration })),
      );
    });
    window.__auditObserver.observe({ type: 'longtask', buffered: true });
  });
  const context = await page.evaluate(() => window.huandengDesktop.getContext());
  assert.equal(path.resolve(context.entryPath), path.resolve(entry));
  let snapshot;
  for (const endpoint of ['current', 'session', 'history']) {
    for (let index = 0; index < 3; index++) {
      const began = performance.now();
      const response = await fetch(`${context.serviceUrl}/__pptd/${endpoint}`, {
        signal: AbortSignal.timeout(60000),
      });
      const bytes = await response.arrayBuffer();
      assert.ok(response.ok, `${endpoint} HTTP ${response.status}`);
      report.requests.push({
        endpoint,
        elapsedMs: performance.now() - began,
        bytes: bytes.byteLength,
      });
      if (endpoint === 'current' && !snapshot) snapshot = JSON.parse(Buffer.from(bytes).toString());
    }
  }
  report.pageCount = snapshot.pages.length;
  report.objectCount = snapshot.pages.reduce((sum, p) => sum + p.data.elements.length, 0);
  await wait(1000);
  await sample('edit-initial');
  for (const index of [1, 5, 12, 20, 2, snapshot.pages.length - 1, 0].filter(
    (i) => i < snapshot.pages.length,
  )) {
    const id = snapshot.pages[index].pageId;
    await interaction('select-slide', `[data-hd-thumbnail="${id}"]`, {
      selector: '[data-hd-editor-canvas] [data-pptd-page]',
      attribute: 'data-pptd-page',
      value: id,
    });
  }
  await sample('edit-after-navigation');
  await view('browse');
  await wait(400);
  await sample('browse-first-screen');
  const scrollStart = await page.evaluate(() => performance.now());
  for (let pass = 0; pass < 2; pass++) {
    const geometry = await page.locator('[data-hd-browser-scroll]').evaluate((node) => ({
      height: node.clientHeight,
      max: node.scrollHeight - node.clientHeight,
    }));
    for (let top = 0; top <= geometry.max + geometry.height; top += geometry.height * 0.8) {
      await page.locator('[data-hd-browser-scroll]').evaluate(
        (node, offset) => {
          node.scrollTop = offset;
        },
        Math.min(top, geometry.max),
      );
      await wait(80);
      await frame();
    }
    await page.locator('[data-hd-browser-scroll]').evaluate((node) => {
      node.scrollTop = 0;
    });
    await wait(400);
    await sample(`browse-after-pass-${pass + 1}`);
  }
  report.scrollLongTasks = await page.evaluate(
    (start) => window.__auditLongTasks.filter((t) => t.startTime >= start),
    scrollStart,
  );
  if (values['edit-probe']) {
    const started = performance.now();
    while (
      performance.now() - started < 5000 &&
      (await page.evaluate(() => [...document.images].some((image) => !image.complete)))
    )
      await wait(100);
    report.imageDrainWaitMs = performance.now() - started;
    await sample('browse-after-image-wait');
  }
  await interaction(
    'search-no-result',
    '[data-hd-browser-search]',
    { selector: '[data-hd-browser-empty]' },
    '__audit_no_matching_slide__',
  );
  await interaction(
    'search-clear',
    '[data-hd-browser-search]',
    { selector: '[data-hd-browser-card]' },
    '',
  );
  for (let cycle = 0; cycle < 3; cycle++) {
    await view('notes');
    await view('edit');
    await view('browse');
  }
  await view('edit');
  if (values['edit-probe']) {
    await view('notes');
    const pageFile = path.join(project, snapshot.pages[0].path);
    const originalNotes = await page.locator('[data-hd-notes-editor]').inputValue();
    for (let index = 0; index < 4; index++) {
      const text =
        index % 2 ? originalNotes : `${originalNotes}\nSynthetic performance audit ${index}`;
      await interaction(
        'notes-input',
        '[data-hd-notes-editor]',
        { selector: '[data-hd-notes-editor]' },
        text,
      );
      const eventEpoch = await page.evaluate(
        () => performance.timeOrigin + window.__auditAction.start,
      );
      await until(
        async () => (YAML.parse(await fs.readFile(pageFile, 'utf8')).notes ?? '') === text,
        30000,
      );
      report.saves.push({
        inputToDiskMs: Date.now() - eventEpoch,
        pollingIntervalMs: 50,
        includesIntentionalDebounceMs: 700,
      });
      await wait(350);
    }
    assert.equal(YAML.parse(await fs.readFile(pageFile, 'utf8')).notes ?? '', originalNotes);
    await view('edit');
  }
  await wait(1000);
  await sample('edit-after-view-cycles');
  const idleBefore = await cdp.send('Performance.getMetrics');
  await wait(3000);
  const idleAfter = await cdp.send('Performance.getMetrics');
  report.idleTaskSeconds =
    idleAfter.metrics.find((m) => m.name === 'TaskDuration').value -
    idleBefore.metrics.find((m) => m.name === 'TaskDuration').value;
} catch (error) {
  failure = error;
  report.error = String(error.stack ?? error);
} finally {
  if (app)
    await app.close().catch((error) => {
      report.closeError = String(error);
    });
  report.originalSourcesUnchanged = JSON.stringify(await hashes()) === JSON.stringify(before);
  report.passed =
    !failure &&
    !report.closeError &&
    report.originalSourcesUnchanged &&
    !report.rendererErrors.length;
  await fs.writeFile(
    path.join(values.output, `${values.label}.json`),
    JSON.stringify(report, null, 2),
  );
  console.log(
    JSON.stringify({
      label: values.label,
      passed: report.passed,
      pages: report.pageCount,
      startupMs: report.canvasReadyMs,
      error: report.error,
      output: path.join(values.output, `${values.label}.json`),
    }),
  );
  if (!report.passed) process.exitCode = 1;
}
