// biome-ignore-all lint/suspicious/noUndeclaredEnvVars: Standalone, opt-in desktop diagnostic.
// Observer-effect control: raw CDP without Network vs the same run with Network enabled.
// Never launches against the original document or the user's ordinary desktop profile.
import assert from 'node:assert/strict';
import { execFile, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dependencies = process.env.HUANDENG_DIAGNOSTIC_DEPENDENCIES ?? root;
const require = createRequire(path.join(dependencies, 'packages/core/package.json'));
const { parse } = require('yaml');
const [sourceArgument, label, mode = 'runtime', countArgument = '50'] = process.argv.slice(2);
const iterations = Number(countArgument);
const traceMemory = process.argv.includes('--trace-memory');
const gcEvery = Number(
  process.argv.find((argument) => argument.startsWith('--gc-every='))?.split('=')[1] ?? 0,
);
assert.ok(
  sourceArgument && path.isAbsolute(sourceArgument),
  'Pass an absolute original .pptd path.',
);
assert.match(label ?? '', /^[a-zA-Z0-9_-]+$/);
assert.ok(['runtime', 'network'].includes(mode));
assert.ok(Number.isInteger(iterations) && iterations >= 1 && iterations <= 150);
assert.ok(Number.isInteger(gcEvery) && gcEvery >= 0 && gcEvery <= iterations);
const executable = process.env.HUANDENG_DESKTOP_EXE;
assert.ok(executable && path.isAbsolute(executable));
assert.equal(process.platform, 'win32', 'This diagnostic currently records Windows private bytes.');
const execute = promisify(execFile);
const sourceEntry = await fs.realpath(sourceArgument);
const sourceRoot = path.dirname(sourceEntry);
const evidence = path.join(root, '.verification/renderer-v08');
await fs.mkdir(evidence, { recursive: true });
const sandbox = await fs.mkdtemp(path.join(os.tmpdir(), 'huandeng-renderer-v08-'));
const projectRoot = path.join(sandbox, 'project');
const entry = path.join(projectRoot, path.basename(sourceEntry));
const profile = path.join(sandbox, 'profile');
const runtime = path.join(sandbox, 'runtime');
const output = path.join(evidence, `${label}.json`);
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const pathKey = (value) => path.resolve(value).toLowerCase();
let child;
let exitPromise;
let client;
let browser;
let traceStarted = false;
let originalFiles = [];
let originalHashes;
let processLog = '';
let serviceUrl;
let servicePid;
const report = {
  passed: false,
  timestamp: new Date().toISOString(),
  label,
  mode,
  iterations,
  traceMemory,
  gcEvery,
  executable,
  sourceEntry,
  copyEntry: entry,
  sandbox,
  node: process.version,
  methodology:
    'Fresh installed EXE, isolated userData/runtime and copied project. Direct CDP Runtime/Input/Performance/Memory; Network domain only in network mode. No Playwright, no renderer DevTools UI. Original files hashed before/after. Same actual GUI insert/Delete loop in both modes. Optional trace uses memory-infra only. Timings from this diagnostic are not substitutes for the established Playwright baseline.',
  samples: [],
  deletions: [],
  rendererErrors: [],
  network: { enabled: mode === 'network', requests: 0, responses: 0, encodedDataLength: 0 },
  traceDumps: [],
};

class CDP {
  constructor(socket) {
    this.socket = socket;
    this.sequence = 0;
    this.pending = new Map();
    this.events = new Map();
    socket.addEventListener('message', (event) => {
      const message = JSON.parse(String(event.data));
      if (message.id !== undefined) {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        clearTimeout(pending.timer);
        if (message.error) pending.reject(new Error(JSON.stringify(message.error)));
        else pending.resolve(message.result);
      } else {
        for (const listener of this.events.get(message.method) ?? []) listener(message.params);
      }
    });
    socket.addEventListener('close', () => {
      for (const pending of this.pending.values()) {
        clearTimeout(pending.timer);
        pending.reject(new Error('CDP connection closed.'));
      }
      this.pending.clear();
    });
  }

  static async connect(url) {
    const socket = new WebSocket(url);
    await new Promise((resolve, reject) => {
      socket.addEventListener('open', resolve, { once: true });
      socket.addEventListener('error', reject, { once: true });
    });
    return new CDP(socket);
  }

  send(method, params = {}, timeout = 30000) {
    const id = ++this.sequence;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`CDP timeout: ${method}`));
      }, timeout);
      this.pending.set(id, { resolve, reject, timer });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  on(name, listener) {
    const listeners = this.events.get(name) ?? new Set();
    listeners.add(listener);
    this.events.set(name, listeners);
    return () => listeners.delete(listener);
  }

  close() {
    this.socket.close();
  }
}

async function evaluate(expression) {
  const value = await client.send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (value.exceptionDetails)
    throw new Error(value.exceptionDetails.exception?.description ?? value.exceptionDetails.text);
  return value.result.value;
}

async function eventually(task, timeout = 60000, interval = 20) {
  const deadline = performance.now() + timeout;
  let lastError;
  while (performance.now() < deadline) {
    if (child && child.exitCode !== null) throw new Error(`EXE exited: ${child.exitCode}`);
    try {
      const value = await task();
      if (value) return value;
    } catch (error) {
      lastError = error;
    }
    await wait(interval);
  }
  throw lastError ?? new Error('Diagnostic condition timed out.');
}

async function originalState() {
  const result = {};
  for (const relative of originalFiles) {
    const file = path.resolve(sourceRoot, relative);
    assert.ok(path.relative(sourceRoot, file) && !path.relative(sourceRoot, file).startsWith('..'));
    const bytes = await fs.readFile(file).catch((error) => {
      if (error.code === 'ENOENT') return null;
      throw error;
    });
    result[relative] = bytes === null ? null : createHash('sha256').update(bytes).digest('hex');
  }
  return result;
}

const shapeQuery = `Array.from(document.querySelectorAll('button')).find(button => /^(选择形状|添加矩形|形状)$/.test(button.getAttribute('aria-label') ?? button.textContent.trim()))`;

async function ready() {
  await eventually(() =>
    evaluate(`(() => { const b = ${shapeQuery}; return !!b && !b.disabled; })()`),
  );
}

async function clickExpression(expression, relative = null) {
  const point = await eventually(() =>
    evaluate(`(() => {
    const element = ${expression};
    if (!element) return null;
    const r = element.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    return {x:r.left + r.width * ${relative?.[0] ?? 0.5}, y:r.top + r.height * ${relative?.[1] ?? 0.5}};
  })()`),
  );
  await client.send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...point });
  await client.send('Input.dispatchMouseEvent', {
    type: 'mousePressed',
    button: 'left',
    clickCount: 1,
    ...point,
  });
  await client.send('Input.dispatchMouseEvent', {
    type: 'mouseReleased',
    button: 'left',
    clickCount: 1,
    ...point,
  });
}

async function processMetrics() {
  const script = `
$all = @(Get-CimInstance Win32_Process)
$owned = [System.Collections.Generic.HashSet[int]]::new()
[void]$owned.Add(${child.pid})
do {
  $added = $false
  foreach ($item in $all) {
    if ($owned.Contains([int]$item.ParentProcessId) -and $owned.Add([int]$item.ProcessId)) { $added = $true }
  }
} while ($added)
$result = @()
foreach ($item in $all) {
  if (-not $owned.Contains([int]$item.ProcessId)) { continue }
  $sample = Get-Process -Id $item.ProcessId -ErrorAction SilentlyContinue
  if (-not $sample) { continue }
  $kind = 'other'
  if ($item.ProcessId -eq ${child.pid}) { $kind = 'Browser' }
  elseif ($item.ProcessId -eq ${servicePid ?? -1}) { $kind = 'DocumentService' }
  elseif ($item.CommandLine -match '--type=renderer') { $kind = 'Tab' }
  elseif ($item.CommandLine -match '--type=gpu-process') { $kind = 'GPU' }
  elseif ($item.CommandLine -match '--type=utility') { $kind = 'Utility' }
  $result += [ordered]@{pid=[int]$item.ProcessId;parentPid=[int]$item.ParentProcessId;type=$kind;workingSetBytes=$sample.WorkingSet64;privateBytes=$sample.PrivateMemorySize64;handles=$sample.HandleCount}
}
ConvertTo-Json -InputObject $result -Compress
`;
  const { stdout } = await execute(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-Command', script],
    { windowsHide: true },
  );
  return JSON.parse(stdout);
}

async function sample(stage, dump = false) {
  const heap = await client.send('Runtime.getHeapUsage');
  const dom = await client.send('Memory.getDOMCounters');
  const { metrics } = await client.send('Performance.getMetrics');
  const mounted = await evaluate(
    `({nodes:document.querySelectorAll('*').length, renderers:document.querySelectorAll('[data-pptd-page]').length, canvasElements:document.querySelectorAll('[data-hd-editor-canvas] [data-hd-element-id]').length, width:innerWidth,height:innerHeight,dpr:devicePixelRatio})`,
  );
  const processes = await processMetrics();
  report.samples.push({
    stage,
    elapsedMs: performance.now() - report.startedMonotonic,
    heap,
    dom,
    mounted,
    processes,
    metrics: Object.fromEntries(
      metrics
        .filter((x) =>
          /^(JSHeapUsedSize|JSHeapTotalSize|Documents|LayoutObjects|Nodes|LayoutDuration|RecalcStyleDuration|ScriptDuration|TaskDuration)$/.test(
            x.name,
          ),
        )
        .map((x) => [x.name, x.value]),
    ),
  });
  if (dump && traceStarted) {
    const result = await browser.send('Tracing.requestMemoryDump', {
      deterministic: false,
      levelOfDetail: 'detailed',
    });
    report.traceDumps.push({ stage, ...result });
  }
  await fs.writeFile(output, JSON.stringify(report, null, 2));
  const tab = processes.find((item) => item.type === 'Tab');
  process.stdout.write(
    `${JSON.stringify({
      label,
      stage,
      rendererMiB: tab?.workingSetBytes / 1048576,
      privateMiB: tab?.privateBytes / 1048576,
      heapUsedMiB: heap.usedSize / 1048576,
      heapTotalMiB: heap.totalSize / 1048576,
      embedderMiB: heap.embedderHeapUsedSize / 1048576,
    })}\n`,
  );
}

async function stopTrace() {
  if (!traceStarted) return;
  const complete = new Promise((resolve) => {
    const remove = browser.on('Tracing.tracingComplete', (event) => {
      remove();
      resolve(event);
    });
  });
  await browser.send('Tracing.end');
  const result = await complete;
  const traceFile = path.join(evidence, `${label}.trace.json`);
  const handle = await fs.open(traceFile, 'w');
  try {
    while (true) {
      const block = await browser.send('IO.read', { handle: result.stream, size: 262144 });
      await handle.write(block.base64Encoded ? Buffer.from(block.data, 'base64') : block.data);
      if (block.eof) break;
    }
  } finally {
    await handle.close();
    await browser.send('IO.close', { handle: result.stream });
  }
  report.traceFile = traceFile;
  traceStarted = false;
}

try {
  report.marker = JSON.parse(
    await fs.readFile(path.join(path.dirname(executable), 'huandeng-build.json'), 'utf8'),
  );
  const manifest = parse(await fs.readFile(sourceEntry, 'utf8'));
  assert.ok(
    Array.isArray(manifest.pages) && manifest.pages.every((item) => typeof item === 'string'),
  );
  const metadata = JSON.parse(
    (
      await fs.readFile(path.join(sourceRoot, '.huandeng/project.json'), 'utf8').catch((error) => {
        if (error.code === 'ENOENT') return '{}';
        throw error;
      })
    ).replace(/^\uFEFF/, ''),
  );
  originalFiles = [
    ...new Set([
      path.basename(sourceEntry),
      '.huandeng/project.json',
      ...manifest.pages,
      ...Object.values(metadata.slides ?? {}).map((item) => item.path),
    ]),
  ].sort();
  originalHashes = await originalState();
  report.originalHashes = originalHashes;
  const excluded = new Set(['Exports', '.git', 'node_modules', 'scripts', '.verification']);
  await fs.cp(sourceRoot, projectRoot, {
    recursive: true,
    dereference: true,
    filter: (file) =>
      !path
        .relative(sourceRoot, file)
        .split(path.sep)
        .some((part) => excluded.has(part)),
  });
  await fs.mkdir(profile, { recursive: true });
  await fs.writeFile(
    path.join(profile, 'preferences.json'),
    JSON.stringify({ recentProjects: [], windowBounds: { width: 1616, height: 1094 } }),
  );
  const env = { ...process.env, HUANDENG_DESKTOP_DATA_DIR: profile, HUANDENG_RUNTIME_DIR: runtime };
  delete env.ELECTRON_RUN_AS_NODE;
  report.startedMonotonic = performance.now();
  child = spawn(executable, ['--remote-debugging-port=0', '--entry', entry], {
    env,
    cwd: root,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  report.mainPid = child.pid;
  exitPromise = new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (code, signal) => resolve({ code, signal }));
  });
  child.stdout.on('data', (bytes) => {
    processLog = (processLog + bytes.toString()).slice(-32000);
  });
  child.stderr.on('data', (bytes) => {
    processLog = (processLog + bytes.toString()).slice(-32000);
  });
  const debugPort = await eventually(
    async () => {
      const match = /DevTools listening on ws:\/\/127\.0\.0\.1:(\d+)\//.exec(processLog);
      if (match) return Number(match[1]);
      const file = await fs
        .readFile(path.join(profile, 'DevToolsActivePort'), 'utf8')
        .catch(() => '');
      return /^\d+\n/.test(file) ? Number(file.split('\n')[0]) : false;
    },
    60000,
    100,
  );
  const browserInfo = await (await fetch(`http://127.0.0.1:${debugPort}/json/version`)).json();
  report.browser = browserInfo.Browser;
  report.userAgent = browserInfo['User-Agent'];
  const target = await eventually(async () => {
    const targets = await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json();
    return targets.find((item) => item.type === 'page');
  });
  client = await CDP.connect(target.webSocketDebuggerUrl);
  client.on('Runtime.exceptionThrown', (event) =>
    report.rendererErrors.push(
      event.exceptionDetails?.exception?.description ?? event.exceptionDetails?.text,
    ),
  );
  await client.send('Runtime.enable');
  await client.send('Performance.enable');
  if (mode === 'network') {
    client.on('Network.requestWillBeSent', () => report.network.requests++);
    client.on('Network.responseReceived', () => report.network.responses++);
    client.on(
      'Network.loadingFinished',
      (event) => (report.network.encodedDataLength += event.encodedDataLength ?? 0),
    );
    await client.send('Network.enable');
  }
  if (traceMemory) {
    browser = await CDP.connect(browserInfo.webSocketDebuggerUrl);
    await browser.send('Tracing.start', {
      transferMode: 'ReturnAsStream',
      traceConfig: {
        recordMode: 'recordAsMuchAsPossible',
        includedCategories: ['disabled-by-default-memory-infra'],
        excludedCategories: ['*'],
        memoryDumpConfig: { triggers: [] },
      },
    });
    traceStarted = true;
  }
  await eventually(() => evaluate(`!!document.querySelector('[data-hd-editor-canvas]')`), 180000);
  await ready();
  const context = await evaluate('window.huandengDesktop.getContext()');
  assert.equal(pathKey(context.entryPath), pathKey(entry));
  serviceUrl = context.serviceUrl;
  const discoveryFile = path.join(
    runtime,
    'sessions',
    `${createHash('sha256')
      .update(pathKey(await fs.realpath(entry)))
      .digest('hex')}.json`,
  );
  const discovery = JSON.parse(await fs.readFile(discoveryFile, 'utf8'));
  assert.equal(pathKey(discovery.entry), pathKey(entry));
  servicePid = discovery.pid;
  report.servicePid = servicePid;
  const response = await fetch(`${serviceUrl}/__pptd/session`);
  assert.ok(response.ok);
  const body = await response.text();
  report.initialSessionUtf8Bytes = Buffer.byteLength(body);
  const snapshot = JSON.parse(body);
  report.pageCount = snapshot.pages.length;
  const currentPageId = await evaluate(
    `document.querySelector('[data-hd-editor-canvas] [data-pptd-page]').getAttribute('data-pptd-page')`,
  );
  const active = snapshot.pages.find((item) => item.pageId === currentPageId);
  assert.ok(active);
  const pageFile = path.join(projectRoot, active.path);
  await wait(1500);
  await sample('settled', true);
  for (let iteration = 0; iteration < iterations; iteration++) {
    await ready();
    const beforeIds = await evaluate(
      `Array.from(document.querySelectorAll('[data-hd-editor-canvas] [data-hd-element-id]')).map(x => x.getAttribute('data-hd-element-id'))`,
    );
    await clickExpression(shapeQuery);
    await clickExpression(
      `Array.from(document.querySelectorAll('[role="menuitem"]')).find(x => x.textContent.trim() === '矩形')`,
    );
    await clickExpression(
      `document.querySelector('[data-hd-insertion-layer="shape"]')`,
      [0.4, 0.4],
    );
    const elementId = await eventually(() =>
      evaluate(
        `Array.from(document.querySelectorAll('[data-hd-editor-canvas] [data-hd-element-id]')).map(x => x.getAttribute('data-hd-element-id')).find(x => !${JSON.stringify(beforeIds)}.includes(x))`,
      ),
    );
    await eventually(async () => (await fs.readFile(pageFile, 'utf8')).includes(elementId));
    await ready();
    await eventually(() =>
      evaluate(`!!document.querySelector('[data-hd-selection="${elementId}"]')`),
    );
    await evaluate(`(() => {
      const canvas = document.querySelector('[data-hd-editor-canvas]');
      canvas.focus();
      const selector = '[data-hd-element-id="${elementId}"]';
      const sample = {keydownMs:null,keydownEpochMs:null,visualMs:null};
      window.__hdRendererDiagnostic = sample;
      const observer = new MutationObserver(() => { if (sample.keydownMs !== null && !canvas.querySelector(selector)) { sample.visualMs = performance.now() - sample.keydownMs; observer.disconnect(); } });
      observer.observe(canvas, {childList:true,subtree:true});
      const handler = event => { if (event.key === 'Delete') { sample.keydownMs = performance.now(); sample.keydownEpochMs = performance.timeOrigin + sample.keydownMs; window.removeEventListener('keydown',handler,true); } };
      window.addEventListener('keydown',handler,true);
      return document.activeElement === canvas;
    })()`);
    const persisted = eventually(
      async () => ((await fs.readFile(pageFile, 'utf8')).includes(elementId) ? false : Date.now()),
      60000,
      10,
    ).then(
      (value) => ({ value }),
      (error) => ({ error }),
    );
    await client.send('Input.dispatchKeyEvent', {
      type: 'keyDown',
      key: 'Delete',
      code: 'Delete',
      windowsVirtualKeyCode: 46,
      nativeVirtualKeyCode: 46,
    });
    await client.send('Input.dispatchKeyEvent', {
      type: 'keyUp',
      key: 'Delete',
      code: 'Delete',
      windowsVirtualKeyCode: 46,
      nativeVirtualKeyCode: 46,
    });
    await eventually(() => evaluate(`window.__hdRendererDiagnostic?.visualMs !== null`));
    const disk = await persisted;
    if (disk.error) throw disk.error;
    await ready();
    const acknowledgedAt = Date.now();
    const timing = await evaluate('window.__hdRendererDiagnostic');
    report.deletions.push({
      iteration: iteration + 1,
      visualMs: timing.visualMs,
      persistenceObservedMs: disk.value - timing.keydownEpochMs,
      acknowledgementObservedMs: acknowledgedAt - timing.keydownEpochMs,
    });
    if ((iteration + 1) % 10 === 0)
      await sample(`after-${iteration + 1}-pairs`, iteration + 1 === iterations);
    if (gcEvery && (iteration + 1) % gcEvery === 0) {
      await client.send('HeapProfiler.collectGarbage');
      await sample(`after-${iteration + 1}-pairs-explicit-gc`, true);
    }
  }
  if (iterations % 10 !== 0) await sample(`after-${iterations}-pairs`, true);
  await wait(15000);
  await sample('after-15s-idle', true);
  await client.send('HeapProfiler.collectGarbage');
  await sample('after-explicit-gc', true);
  if (mode === 'network') {
    await client.send('Network.disable');
    await client.send('HeapProfiler.collectGarbage');
    await sample('after-network-disable-and-gc', true);
  }
  await stopTrace();
  const afterResponse = await fetch(`${serviceUrl}/__pptd/current`);
  const after = await afterResponse.json();
  assert.equal(after.writable, true);
  assert.deepEqual(after.diagnostics, []);
  assert.equal(
    after.pages.find((item) => item.pageId === active.pageId).data.elements.length,
    active.data.elements.length,
  );
  assert.deepEqual(report.rendererErrors, []);
  report.passed = true;
} catch (error) {
  report.error = error.stack ?? String(error);
  process.exitCode = 1;
} finally {
  if (traceStarted)
    await stopTrace().catch((error) => {
      report.traceError = String(error);
    });
  if (child && child.exitCode === null) {
    const closed = await execute(
      'powershell.exe',
      [
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        `$owned = Get-Process -Id ${child.pid} -ErrorAction Stop; $owned.CloseMainWindow()`,
      ],
      { windowsHide: true },
    ).catch((error) => ({ stderr: String(error) }));
    report.closeWindow = closed.stdout?.trim() ?? closed.stderr;
    let exitTimer;
    const exit = await Promise.race([
      exitPromise,
      new Promise((resolve) => {
        exitTimer = setTimeout(() => resolve(null), 30000);
      }),
    ]).finally(() => clearTimeout(exitTimer));
    report.exit = exit;
    if (exit?.code !== 0 || exit?.signal !== null) {
      report.passed = false;
      process.exitCode = 1;
    }
  } else if (exitPromise) report.exit = await exitPromise;
  client?.close();
  browser?.close();
  if (originalHashes) {
    const after = await originalState();
    report.originalUnchanged = JSON.stringify(after) === JSON.stringify(originalHashes);
    report.originalFilesChecked = originalFiles.length;
    if (!report.originalUnchanged) {
      report.passed = false;
      process.exitCode = 1;
    }
  }
  report.processLog = processLog;
  await fs.writeFile(output, JSON.stringify(report, null, 2));
  process.stdout.write(
    `${JSON.stringify({
      passed: report.passed,
      label,
      output,
      exit: report.exit,
      originalUnchanged: report.originalUnchanged,
      error: report.error ?? null,
    })}\n`,
  );
}
