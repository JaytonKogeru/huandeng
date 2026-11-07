// biome-ignore-all lint/suspicious/noUndeclaredEnvVars: This desktop benchmark runs directly with Node, outside the Turbo task cache.
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(root, 'packages/core/package.json'));
const { _electron: electron } = require('playwright');
const { parse } = require('yaml');
const sourceEntryArgument = process.argv[2];
const label = process.argv[3];
const iterations = Number(process.argv[4] ?? 5);
const profileMemory = process.argv.slice(5).includes('--profile-memory');
const profileCpu = process.argv.slice(5).includes('--profile-cpu');
assert.ok(Number.isInteger(iterations) && iterations > 0 && iterations <= 50);
assert.ok(
  sourceEntryArgument && path.isAbsolute(sourceEntryArgument),
  'Pass an absolute original .pptd path and an evidence label.',
);
assert.match(label ?? '', /^[a-zA-Z0-9_-]+$/, 'Use a short filename-safe evidence label.');
const executablePath = process.env.HUANDENG_DESKTOP_EXE;
assert.ok(executablePath, 'Set HUANDENG_DESKTOP_EXE to the desktop executable.');
const sourceEntry = await fs.realpath(sourceEntryArgument);
const sourceRoot = path.dirname(sourceEntry);
const evidence = path.join(root, '.verification/performance-v07');
await fs.mkdir(evidence, { recursive: true });
const output = path.join(evidence, `${label}.json`);
const screenshot = path.join(evidence, `${label}.png`);
const sandbox = await fs.mkdtemp(path.join(os.tmpdir(), 'huandeng-editor-benchmark-'));
const deck = path.join(sandbox, 'project');
const entry = path.join(deck, path.basename(sourceEntry));
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const execute = promisify(execFile);
const pathKey = (value) =>
  process.platform === 'win32' ? path.resolve(value).toLowerCase() : path.resolve(value);
const processLog = [];
const rendererErrors = [];
const transactionFailures = [];
let application;
let page;
let originalBefore;
let originalFiles;
let serviceUrl;
let servicePid;
let memorySession;
const report = {
  passed: false,
  label,
  iterations,
  profileMemory,
  profileCpu,
  timestamp: new Date().toISOString(),
  platform: process.platform,
  node: process.version,
  executablePath,
  sourceEntry,
  copyEntry: entry,
  methodology:
    'Fresh Electron process with isolated profile/runtime and a copied project. OS filesystem cache is not cleared. Visual deletion is measured from the renderer keydown handler to a MutationObserver seeing removal. Persistence is observed by 10 ms file polling; acknowledgement is observed separately. Original manifest, page files and metadata are hashed before and after.',
  deleteSamples: [],
  memorySamples: [],
  rendererErrors,
  transactionFailures,
};

async function eventually(task, timeout = 60000, interval = 25) {
  const deadline = performance.now() + timeout;
  let lastError;
  while (performance.now() < deadline) {
    if (transactionFailures.length)
      throw new Error(
        `The document transaction failed: ${JSON.stringify(transactionFailures.at(-1))}`,
      );
    try {
      const value = await task();
      if (value) return value;
    } catch (error) {
      lastError = error;
    }
    await wait(interval);
  }
  throw lastError ?? new Error('Timed out waiting for the editor benchmark condition.');
}

function projectFile(relative) {
  const absolute = path.resolve(sourceRoot, relative);
  const rel = path.relative(sourceRoot, absolute);
  assert.ok(
    rel && !rel.startsWith('..') && !path.isAbsolute(rel),
    `Invalid project source path: ${relative}`,
  );
  return absolute;
}

async function readOptional(file) {
  try {
    return await fs.readFile(file);
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

async function sourceHashes() {
  const result = {};
  for (const relative of originalFiles) {
    const bytes = await readOptional(projectFile(relative));
    result[relative] = bytes === null ? null : createHash('sha256').update(bytes).digest('hex');
  }
  return result;
}

async function api(endpoint) {
  const response = await fetch(`${serviceUrl}/__pptd${endpoint}`);
  assert.ok(response.ok, `HTTP ${response.status}: ${endpoint}`);
  return response.json();
}

function shapeButton() {
  return page.getByRole('button', { name: /^(选择形状|添加矩形|形状)$/ });
}

async function waitUntilIdle() {
  return eventually(async () => await shapeButton().isEnabled(), 60000);
}

async function memorySample(stage) {
  let javascript = null;
  if (profileMemory) {
    if (!memorySession) {
      memorySession = await page.context().newCDPSession(page);
      await memorySession.send('Performance.enable');
    }
    const { metrics } = await memorySession.send('Performance.getMetrics');
    const selected = new Set([
      'JSHeapUsedSize',
      'JSHeapTotalSize',
      'Nodes',
      'Documents',
      'LayoutObjects',
      'TaskDuration',
      'ScriptDuration',
      'LayoutDuration',
      'RecalcStyleDuration',
      'LayoutCount',
      'RecalcStyleCount',
    ]);
    javascript = {
      source: 'Chromium DevTools Protocol',
      metrics: Object.fromEntries(
        metrics
          .filter((metric) => selected.has(metric.name))
          .map((metric) => [metric.name, metric.value]),
      ),
      dom: await memorySession.send('Memory.getDOMCounters'),
      imageResources: await page.evaluate(() => {
        const images = performance
          .getEntriesByType('resource')
          .filter((entry) => entry.initiatorType === 'img');
        return {
          entries: images.length,
          uniqueUrls: new Set(images.map((entry) => entry.name)).size,
        };
      }),
    };
  }
  const metrics = await application.evaluate(({ app }) =>
    app.getAppMetrics().map((metric) => ({
      pid: metric.pid,
      type: metric.type,
      serviceName: metric.serviceName ?? null,
      workingSetKiB: metric.memory.workingSetSize,
      peakWorkingSetKiB: metric.memory.peakWorkingSetSize,
      privateBytesKiB: metric.memory.privateBytes ?? null,
      cpuPercent: metric.cpu.percentCPUUsage,
    })),
  );
  let documentService = null;
  if (process.platform === 'win32') {
    assert.ok(Number.isSafeInteger(servicePid) && servicePid > 0);
    const { stdout } = await execute(
      'powershell.exe',
      [
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        `$sampleProcess=Get-Process -Id ${servicePid} -ErrorAction Stop; [ordered]@{ pid=$sampleProcess.Id; workingSetKiB=$sampleProcess.WorkingSet64 / 1024; privateBytesKiB=$sampleProcess.PrivateMemorySize64 / 1024 } | ConvertTo-Json -Compress`,
      ],
      { windowsHide: true },
    );
    documentService = { ...JSON.parse(stdout), source: 'Windows Get-Process' };
  }
  report.memorySamples.push({
    stage,
    javascript,
    metrics,
    documentService,
    rendererWorkingSetKiB: metrics
      .filter((metric) => metric.type === 'Tab')
      .reduce((sum, metric) => sum + metric.workingSetKiB, 0),
  });
}

async function domCounts() {
  return page.evaluate(() => ({
    totalNodes: document.querySelectorAll('*').length,
    thumbnails: document.querySelectorAll('[data-hd-thumbnail]').length,
    thumbnailRenderers: document.querySelectorAll('[data-hd-thumbnail] [data-pptd-page]').length,
    allPageRenderers: document.querySelectorAll('[data-pptd-page]').length,
    canvasElements: document.querySelectorAll('[data-hd-editor-canvas] [data-hd-element-id]')
      .length,
    pendingImages: Array.from(document.images).filter((image) => !image.complete).length,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio,
    },
  }));
}

function summarize(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return {
    count: values.length,
    minMs: sorted[0],
    medianMs: sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle],
    maxMs: sorted.at(-1),
  };
}

try {
  const manifest = parse(await fs.readFile(sourceEntry, 'utf8'));
  assert.ok(
    Array.isArray(manifest.pages) && manifest.pages.every((item) => typeof item === 'string'),
  );
  const metadataBytes = await readOptional(path.join(sourceRoot, '.huandeng/project.json'));
  const metadata = metadataBytes
    ? JSON.parse(metadataBytes.toString('utf8').replace(/^\uFEFF/, ''))
    : {};
  originalFiles = [
    ...new Set([
      path.basename(sourceEntry),
      '.huandeng/project.json',
      ...manifest.pages,
      ...Object.values(metadata.slides ?? {}).map((identity) => identity.path),
    ]),
  ].sort();
  originalBefore = await sourceHashes();
  report.originalHashes = originalBefore;
  const excluded = new Set(['Exports', '.git', 'node_modules', 'scripts', '.verification']);
  await fs.cp(sourceRoot, deck, {
    recursive: true,
    dereference: true,
    filter: (source) =>
      !path
        .relative(sourceRoot, source)
        .split(path.sep)
        .some((part) => excluded.has(part)),
  });
  const launchEnv = {
    ...process.env,
    HUANDENG_DESKTOP_DATA_DIR: path.join(sandbox, 'profile'),
    HUANDENG_RUNTIME_DIR: path.join(sandbox, 'runtime'),
  };
  delete launchEnv.ELECTRON_RUN_AS_NODE;
  const launchedAt = performance.now();
  application = await electron.launch({
    executablePath,
    args: [
      ...(process.env.HUANDENG_DESKTOP_APP ? [process.env.HUANDENG_DESKTOP_APP] : []),
      '--entry',
      entry,
    ],
    cwd: root,
    env: launchEnv,
    timeout: 180000,
  });
  report.launchHandshakeMs = performance.now() - launchedAt;
  application.process().stderr?.on('data', (bytes) => processLog.push(String(bytes)));
  page = await application.firstWindow({ timeout: 180000 });
  report.firstWindowMs = performance.now() - launchedAt;
  page.on('pageerror', (error) => rendererErrors.push(error.message));
  page.on('response', async (response) => {
    if (!response.url().endsWith('/__pptd/transactions') || response.ok()) return;
    transactionFailures.push({
      status: response.status(),
      body: await response.json().catch(() => null),
    });
  });
  page.setDefaultTimeout(60000);
  await application.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()[0]?.setContentSize(1600, 1000),
  );
  const canvas = page.locator('[data-hd-editor-canvas]');
  await canvas.waitFor({ state: 'visible', timeout: 180000 });
  await waitUntilIdle();
  await canvas.focus();
  assert.equal(await canvas.evaluate((element) => document.activeElement === element), true);
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
  report.canvasInteractiveMs = performance.now() - launchedAt;
  report.initialDom = await domCounts();
  const context = await page.evaluate(() => window.huandengDesktop.getContext());
  assert.equal(pathKey(context.entryPath), pathKey(entry));
  serviceUrl = context.serviceUrl;
  const sessionFile = path.join(
    sandbox,
    'runtime/sessions',
    `${createHash('sha256')
      .update(pathKey(await fs.realpath(entry)))
      .digest('hex')}.json`,
  );
  const discovery = JSON.parse(await fs.readFile(sessionFile, 'utf8'));
  assert.equal(pathKey(discovery.entry), pathKey(entry));
  assert.equal(discovery.url, serviceUrl);
  servicePid = discovery.pid;
  const snapshot = await api('/session');
  assert.equal(pathKey(snapshot.entry), pathKey(entry));
  report.pageCount = snapshot.pages.length;
  report.electron = await application.evaluate(() => process.versions.electron);
  await memorySample('interactive');
  await wait(1500);
  report.settledDom = await domCounts();
  await memorySample('settled');
  const activePageId = await canvas
    .locator('[data-pptd-page]')
    .first()
    .getAttribute('data-pptd-page');
  const activePage = snapshot.pages.find((item) => item.pageId === activePageId);
  assert.ok(activePage, 'The canvas should show a current Main Slide.');
  const pageFile = path.join(deck, activePage.path);
  const initialImageSources = await canvas
    .locator('img')
    .evaluateAll((images) => images.map((image) => image.src).sort());
  if (profileCpu) {
    memorySession ??= await page.context().newCDPSession(page);
    await memorySession.send('Performance.enable');
    await memorySession.send('Profiler.enable');
    await memorySession.send('Profiler.setSamplingInterval', { interval: 100 });
    await page.evaluate(() => {
      const setAttribute = Element.prototype.setAttribute;
      Element.prototype.setAttribute = function (name, value) {
        const sample = window.__huandengDeleteBenchmark;
        if (sample?.keydownMs == null || sample.visualMs !== null)
          return setAttribute.call(this, name, value);
        const start = performance.now();
        const result = setAttribute.call(this, name, value);
        const elapsed = performance.now() - start;
        if (elapsed > 0.5 && sample.attributeMutations.length < 50)
          sample.attributeMutations.push({
            name,
            value,
            elapsed,
            tag: this.tagName,
            className: this.getAttribute('class')?.slice(0, 250),
          });
        return result;
      };
    });
  }

  for (let iteration = 0; iteration < iterations; iteration++) {
    await waitUntilIdle();
    const beforeIds = await canvas
      .locator('[data-hd-element-id]')
      .evaluateAll((elements) =>
        elements.map((element) => element.getAttribute('data-hd-element-id')),
      );
    const button = shapeButton();
    const menu = await button.getAttribute('aria-haspopup');
    const insertStarted = performance.now();
    await button.click();
    if (menu) {
      await page.getByRole('menuitem', { name: '矩形', exact: true }).click();
      const layer = page.locator('[data-hd-insertion-layer="shape"]');
      await layer.waitFor({ state: 'visible' });
      const box = await layer.boundingBox();
      assert.ok(box && box.width > 0 && box.height > 0);
      await layer.click({
        position: {
          x: Math.min(box.width - 10, box.width * 0.4),
          y: Math.min(box.height - 10, box.height * 0.4),
        },
      });
    }
    const elementId = await eventually(async () => {
      const ids = await canvas
        .locator('[data-hd-element-id]')
        .evaluateAll((elements) =>
          elements.map((element) => element.getAttribute('data-hd-element-id')),
        );
      return ids.find((id) => id && !beforeIds.includes(id));
    });
    const insertionVisibleMs = performance.now() - insertStarted;
    await eventually(async () => (await fs.readFile(pageFile, 'utf8')).includes(elementId));
    await waitUntilIdle();
    await canvas
      .locator(`[data-hd-selection=${JSON.stringify(elementId)}]`)
      .waitFor({ state: 'attached' });
    await canvas.focus();
    await page.evaluate((id) => {
      const canvasElement = document.querySelector('[data-hd-editor-canvas]');
      const selector = `[data-hd-element-id="${CSS.escape(id)}"]`;
      if (!canvasElement?.querySelector(selector))
        throw new Error('Inserted object is not present before deletion.');
      const sample = {
        elementId: id,
        keydownMs: null,
        keydownEpochMs: null,
        visualMs: null,
        attributeMutations: [],
      };
      window.__huandengDeleteBenchmark = sample;
      const observer = new MutationObserver(() => {
        if (sample.keydownMs !== null && !canvasElement.querySelector(selector)) {
          sample.visualMs = performance.now() - sample.keydownMs;
          observer.disconnect();
        }
      });
      observer.observe(canvasElement, { childList: true, subtree: true });
      const keydown = (event) => {
        if (event.key !== 'Delete') return;
        sample.keydownMs = performance.now();
        sample.keydownEpochMs = performance.timeOrigin + sample.keydownMs;
        window.removeEventListener('keydown', keydown, true);
      };
      window.addEventListener('keydown', keydown, true);
    }, elementId);
    const persisted = eventually(
      async () => {
        if ((await fs.readFile(pageFile, 'utf8')).includes(elementId)) return false;
        return Date.now();
      },
      60000,
      10,
    ).then(
      (observedAt) => ({ observedAt, error: null }),
      (error) => ({ observedAt: null, error }),
    );
    const metricsBefore = profileCpu
      ? (await memorySession.send('Performance.getMetrics')).metrics
      : null;
    if (profileCpu) await memorySession.send('Profiler.start');
    await page.keyboard.press('Delete');
    await page.waitForFunction(
      () => typeof window.__huandengDeleteBenchmark?.visualMs === 'number',
      null,
      {
        timeout: 60000,
      },
    );
    let cpuProfile;
    let renderingMetrics;
    if (profileCpu) {
      const { profile } = await memorySession.send('Profiler.stop');
      cpuProfile = path.join(evidence, `${label}-delete-${iteration + 1}.cpuprofile`);
      await fs.writeFile(cpuProfile, JSON.stringify(profile));
      const after = (await memorySession.send('Performance.getMetrics')).metrics;
      renderingMetrics = Object.fromEntries(
        after
          .filter((metric) =>
            /^(TaskDuration|ScriptDuration|LayoutDuration|RecalcStyleDuration|LayoutCount|RecalcStyleCount)$/.test(
              metric.name,
            ),
          )
          .map((metric) => [
            metric.name,
            metric.value -
              (metricsBefore.find((before) => before.name === metric.name)?.value ?? 0),
          ]),
      );
    }
    const persistence = await persisted;
    if (persistence.error) throw persistence.error;
    const diskObservedEpochMs = persistence.observedAt;
    const timing = await page.evaluate(() => window.__huandengDeleteBenchmark);
    assert.equal(typeof timing.visualMs, 'number');
    await waitUntilIdle();
    const acknowledgedEpochMs = Date.now();
    const sample = {
      iteration: iteration + 1,
      elementId,
      insertionVisibleMs,
      visualMs: timing.visualMs,
      persistenceObservedMs: Math.max(0, diskObservedEpochMs - timing.keydownEpochMs),
      acknowledgementObservedMs: Math.max(0, acknowledgedEpochMs - timing.keydownEpochMs),
      filePollingIntervalMs: 10,
      ...(profileCpu
        ? { cpuProfile, renderingMetrics, attributeMutations: timing.attributeMutations }
        : {}),
    };
    report.deleteSamples.push(sample);
    if (profileMemory && (iteration + 1) % 10 === 0)
      await memorySample(`after-${iteration + 1}-pairs`);
    process.stdout.write(
      `${label}: deletion ${iteration + 1}/${iterations} ${JSON.stringify(sample)}\n`,
    );
  }
  report.summary = {
    visual: summarize(report.deleteSamples.map((sample) => sample.visualMs)),
    persistence: summarize(report.deleteSamples.map((sample) => sample.persistenceObservedMs)),
    acknowledgement: summarize(
      report.deleteSamples.map((sample) => sample.acknowledgementObservedMs),
    ),
  };
  report.finalDom = await domCounts();
  if (profileMemory) {
    const finalImageSources = await canvas
      .locator('img')
      .evaluateAll((images) => images.map((image) => image.src).sort());
    assert.deepEqual(
      finalImageSources,
      initialImageSources,
      'Unrelated object edits should preserve image resource identities.',
    );
    report.stableImageUrls = { images: initialImageSources.length, unchanged: true };
  }
  await memorySample(
    iterations === 5 ? 'after-five-insert-delete-pairs' : `after-${iterations}-insert-delete-pairs`,
  );
  if (profileMemory) {
    await memorySession.send('HeapProfiler.collectGarbage');
    await memorySample('after-explicit-garbage-collection');
  }
  await page.screenshot({ path: screenshot, timeout: 15000, animations: 'disabled' });
  report.screenshot = screenshot;
  assert.deepEqual(rendererErrors, []);
  report.passed = true;
} catch (error) {
  report.error = error.stack ?? String(error);
  await page
    ?.screenshot({ path: screenshot, timeout: 10000, animations: 'disabled' })
    .catch(() => {});
} finally {
  await fs.writeFile(output, `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(path.join(evidence, `${label}.log`), processLog.join(''));
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
      if (servicePid) {
        try {
          report.isolatedServiceTerminated = process.kill(servicePid, 'SIGTERM');
        } catch (error) {
          if (error.code !== 'ESRCH') report.serviceCleanupError = String(error);
        }
      }
    }
  }
  if (originalBefore) {
    try {
      const after = await sourceHashes();
      report.originalUnchanged = JSON.stringify(after) === JSON.stringify(originalBefore);
      if (!report.originalUnchanged) {
        report.passed = false;
        report.originalChangedFiles = originalFiles.filter(
          (file) => originalBefore[file] !== after[file],
        );
      }
    } catch (error) {
      report.passed = false;
      report.originalVerificationError = String(error);
    }
  } else report.originalUnchanged = null;
  await fs.writeFile(output, `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(path.join(evidence, `${label}.log`), processLog.join(''));
  if (report.passed)
    await fs
      .rm(sandbox, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 })
      .catch((error) => {
        process.stderr.write(`Temporary copy retained at ${sandbox}: ${String(error)}\n`);
      });
  else {
    report.retainedSandbox = sandbox;
    await fs.writeFile(output, `${JSON.stringify(report, null, 2)}\n`);
  }
  process.stdout.write(
    `${JSON.stringify({ ...report, originalHashes: undefined, output }, null, 2)}\n`,
  );
  if (!report.passed) process.exitCode = 1;
}
