// biome-ignore-all lint/suspicious/noUndeclaredEnvVars: Opt-in, isolated desktop acceptance.
// Usage: HUANDENG_DESKTOP_EXE=<absolute candidate EXE> node scripts/soak-presentation-v08.mjs [label] [rounds=25]
// Synthetic data only. Raw CDP deliberately rejects the Network domain; no Playwright.
import assert from 'node:assert/strict';
import { execFile, spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [label = 'presentation-soak-25', roundsArgument = '25'] = process.argv.slice(2);
const rounds = Number(roundsArgument);
const executable = process.env.HUANDENG_DESKTOP_EXE;
assert.match(label, /^[a-zA-Z0-9_-]+$/);
assert.ok(Number.isInteger(rounds) && rounds >= 1 && rounds <= 50);
assert.ok(
  executable && path.isAbsolute(executable),
  'Set HUANDENG_DESKTOP_EXE to a candidate EXE.',
);
assert.equal(process.platform, 'win32', 'The process metrics in this harness are for Windows.');
const execute = promisify(execFile);
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const pathKey = (value) => path.resolve(value).toLowerCase();
const sandbox = await fs.mkdtemp(path.join(os.tmpdir(), 'huandeng-presentation-v08-'));
const projectRoot = path.join(sandbox, 'synthetic-project');
const entry = path.join(projectRoot, 'deck.pptd');
const profile = path.join(sandbox, 'profile');
const runtime = path.join(sandbox, 'runtime');
const evidence = path.join(root, '.verification/renderer-v08');
const output = path.join(evidence, `${label}.json`);
const ids = [randomUUID(), randomUUID(), randomUUID()];
const pagePaths = ['pages/opening.page', 'pages/evidence.page', 'pages/closing.page'];
const protectedPaths = ['deck.pptd', '.huandeng/project.json', ...pagePaths];
const stops = [480, 1020, 1280];
const objectGroup = 'huandeng-presentation-soak';
const methods = new Set();
let child;
let client;
let exitPromise;
let processLog = '';
let servicePid;
let baselineHashes;
let serviceUrl;
let view;
const report = {
  schemaVersion: 1,
  passed: false,
  timestamp: new Date().toISOString(),
  label,
  rounds,
  executable,
  sandbox,
  entry,
  node: process.version,
  networkEnabled: false,
  methodology:
    'Isolated installed EXE/profile/runtime and synthetic JSON-as-YAML PPTD. Three schema-2 pages; four occurrences A/B/A/C. Actual CDP Input clicks and keys exercise click/with/after, completion, rewind, repeated occurrence, notes preview, cross-page cancellation, and Escape during an active RAF before re-entry. No Network domain or Playwright. RAF wrapper holds only scalar pending metadata; old DOM is observed through WeakRef, never strong references. Process/heap/DOM metrics are diagnostic, not arbitrary RSS pass/fail thresholds. Natural idle, then one explicit final GC. All five source files are hashed throughout.',
  limitations: [
    'The RAF wrapper forwards the native callback timestamp unchanged and adds no frames, clock offsets, sleeps, or GC to playback. Its wrapper allocation and DOM identity lookup add diagnostic overhead; this run is not an animation latency/FPS benchmark.',
    'RAF counters include all window callbacks, not only the playback hook. Pending entries contain numeric/string metadata, never callbacks or DOM. An owner-change callback is an observation, not by itself evidence of a leak.',
    'WeakRefs observe presenter roots and sampled renderer/element DOM without retaining those nodes. Their bounded bookkeeping grows with the number of rounds. Collection of these nodes does not prove every application object or listener was released.',
    'One synthetic, image-free, bounded session cannot certify multi-hour sessions, video/GIF playback, or high-resolution assets. RSS/private-byte changes are reported without an arbitrary leak threshold.',
  ],
  fixture: { pageIds: ids, pagePaths, expectedStopsMs: stops, presentationId: 'soak-talk' },
  cycles: [],
  samples: [],
  rendererErrors: [],
  actionCounts: { mouseClicks: 0, keyPresses: 0 },
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
    assert.ok(!method.startsWith('Network.'), 'Network instrumentation is forbidden in this soak.');
    methods.add(method);
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
  }

  close() {
    this.socket.close();
  }
}

async function evaluate(expression) {
  const result = await client.send('Runtime.evaluate', {
    expression,
    objectGroup,
    returnByValue: true,
    awaitPromise: true,
  });
  if (result.exceptionDetails)
    throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
  return result.result.value;
}

async function eventually(task, description, timeout = 15000, interval = 25) {
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
  throw new Error(`Timed out: ${description}`, { cause: lastError });
}

async function hashSources() {
  return Object.fromEntries(
    await Promise.all(
      protectedPaths.map(async (relative) => [
        relative,
        createHash('sha256')
          .update(await fs.readFile(path.join(projectRoot, relative)))
          .digest('hex'),
      ]),
    ),
  );
}

async function makeFixture() {
  await fs.mkdir(path.join(projectRoot, 'pages'), { recursive: true });
  await fs.mkdir(path.join(projectRoot, '.huandeng'), { recursive: true });
  await fs.mkdir(evidence, { recursive: true });
  await fs.mkdir(profile, { recursive: true });
  await fs.writeFile(
    path.join(profile, 'preferences.json'),
    JSON.stringify({ recentProjects: [], windowBounds: { width: 1616, height: 1094 } }),
  );
  // JSON is a YAML subset and avoids depending on a source-tree module at runtime.
  await fs.writeFile(
    entry,
    JSON.stringify({ title: 'HUANDENG 放映循环诊断', size: [960, 540], pages: pagePaths }, null, 2),
  );
  for (const [index, relative] of pagePaths.entries()) {
    const prefix = `page-${index}`;
    const target = (name) => `${prefix}-${name}`;
    const effect = (id, object, kind, trigger, durationMs, patch = {}) => ({
      id: `${prefix}-${id}`,
      targetId: target(object),
      kind,
      trigger,
      durationMs,
      delayMs: 0,
      ...patch,
    });
    await fs.writeFile(
      path.join(projectRoot, relative),
      JSON.stringify(
        {
          notes: `合成诊断页 ${index + 1}。此文件应在放映前后保持逐字节一致。`,
          soakFixture: true,
          transition: { schemaVersion: 1, kind: 'fade', durationMs: 90 },
          elements: [
            {
              elementId: target('title'),
              elementType: 'text',
              bounds: [60, 45, 820, 70],
              content: { text: `循环验收 ${index + 1} · 点击、并行、接续`, fontSize: 32 },
            },
            ...['a', 'arrow', 'b'].map((name, position) => ({
              elementId: target(name),
              elementType: 'shape',
              shapeName: name === 'arrow' ? 'ellipse' : 'rect',
              bounds: [90 + position * 260, 190, 140, 110],
              fill: { type: 'solid', color: ['#527f6e', '#c99a48', '#a6c7b7'][position] },
            })),
          ],
          timeline: {
            schemaVersion: 2,
            effects: [
              effect('enter-a', 'a', 'fade-in', 'click', 360, { label: '展示证据' }),
              effect('enter-arrow', 'arrow', 'fade-in', 'with-previous', 180, { delayMs: 40 }),
              effect('move-arrow', 'arrow', 'move', 'after-previous', 240, {
                delayMs: 20,
                dx: 35,
                dy: 25,
              }),
              effect('emphasize', 'a', 'pulse', 'click', 240, { label: '突出并替换' }),
              effect('exit-a', 'a', 'fade-out', 'with-previous', 240),
              effect('enter-b', 'b', 'fade-in', 'after-previous', 300),
              effect('move-b', 'b', 'move', 'click', 260, {
                dx: -50,
                dy: 30,
                label: '收束说明',
              }),
              effect('exit-arrow', 'arrow', 'disappear', 'with-previous', 0),
            ],
          },
        },
        null,
        2,
      ),
    );
  }
  const emptyStory = { purpose: '', audience: '', takeaway: '' };
  await fs.writeFile(
    path.join(projectRoot, '.huandeng/project.json'),
    JSON.stringify(
      {
        schemaVersion: 1,
        deckId: randomUUID(),
        entry: 'deck.pptd',
        slides: Object.fromEntries(
          ids.map((id, index) => [
            id,
            {
              shortCode: ['P8AA', 'P8BB', 'P8CC'][index],
              label: `S${index + 1}`,
              path: pagePaths[index],
              state: 'active',
            },
          ]),
        ),
        project: {
          schemaVersion: 1,
          mainStory: emptyStory,
          sections: [],
          presentations: [
            {
              id: 'soak-talk',
              title: '合成放映循环',
              story: emptyStory,
              items: [
                { id: 'opening', kind: 'page', pageId: ids[0] },
                { id: 'evidence', kind: 'page', pageId: ids[1] },
                {
                  id: 'reprise',
                  kind: 'page',
                  pageId: ids[0],
                  notes: '重复引用应重新从初态开始。',
                },
                { id: 'closing', kind: 'page', pageId: ids[2] },
              ],
            },
          ],
        },
      },
      null,
      2,
    ),
  );
  baselineHashes = await hashSources();
  report.sourceHashes = baselineHashes;
}

async function clickExpression(expression, relative = [0.5, 0.5]) {
  const point = await eventually(
    () =>
      evaluate(`(() => {
        const element = ${expression};
        if (!element || element.disabled) return null;
        const r = element.getBoundingClientRect();
        return r.width && r.height ? {x:r.left+r.width*${relative[0]},y:r.top+r.height*${relative[1]}} : null;
      })()`),
    `click target: ${expression}`,
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
  report.actionCounts.mouseClicks++;
}

function clickButton(name) {
  return clickExpression(
    `Array.from(document.querySelectorAll('[data-hd-presenter] button')).find(element => element.getAttribute('aria-label') === ${JSON.stringify(name)})`,
  );
}

function clickSlide() {
  return clickExpression(`document.querySelector('[data-hd-presenter-slide]')`, [0.22, 0.25]);
}

async function press(key) {
  const definitions = {
    F5: ['F5', 116],
    Home: ['Home', 36],
    End: ['End', 35],
    Enter: ['Enter', 13],
    Escape: ['Escape', 27],
    ArrowLeft: ['ArrowLeft', 37],
    ArrowRight: ['ArrowRight', 39],
    ArrowDown: ['ArrowDown', 40],
    b: ['KeyB', 66],
  };
  const [code, virtualKey] = definitions[key];
  const common = { key, code, windowsVirtualKeyCode: virtualKey, nativeVirtualKeyCode: virtualKey };
  await client.send('Input.dispatchKeyEvent', { type: 'keyDown', ...common });
  await client.send('Input.dispatchKeyEvent', { type: 'keyUp', ...common });
  report.actionCounts.keyPresses++;
}

async function instrument() {
  await evaluate(`(() => {
    const request = window.requestAnimationFrame.bind(window);
    const cancel = window.cancelAnimationFrame.bind(window);
    const pending = new Map();
    const references = [];
    const seen = new WeakSet();
    const counters = {requested:0,executed:0,cancelled:0,maxPending:0,ownerChangedBeforeCallback:0,requestedActive:0,requestedInactive:0,executedActive:0,executedInactive:0};
    let cycle = 0;
    const identity = () => document.querySelector('[data-hd-presenter-slide]')?.getAttribute('data-hd-presenter-occurrence') ?? null;
    window.requestAnimationFrame = callback => {
      const owner = identity();
      const scheduledCycle = cycle;
      const id = request(clock => {
        pending.delete(id);
        counters.executed++;
        const currentOwner = identity();
        if (currentOwner) counters.executedActive++;
        else counters.executedInactive++;
        if (owner && owner !== currentOwner) counters.ownerChangedBeforeCallback++;
        callback(clock);
      });
      pending.set(id, {id,owner,cycle:scheduledCycle});
      counters.requested++;
      if (owner) counters.requestedActive++;
      else counters.requestedInactive++;
      counters.maxPending = Math.max(counters.maxPending,pending.size);
      return id;
    };
    window.cancelAnimationFrame = id => {
      if (pending.delete(id)) counters.cancelled++;
      cancel(id);
    };
    const remember = (node,kind) => {
      if (seen.has(node)) return;
      seen.add(node);
      references.push({ref:new WeakRef(node),kind,cycle});
    };
    window.__hdPresentationSoak = {
      setCycle(value) { cycle = value; },
      read() {
        const presenter = document.querySelector('[data-hd-presenter]');
        const surface = presenter?.querySelector('[data-hd-presenter-slide]');
        if (presenter) {
          remember(presenter,'presenter');
          for (const node of presenter.querySelectorAll('[data-pptd-page]')) remember(node,'renderer');
          for (const node of presenter.querySelectorAll('[data-hd-element-id]')) remember(node,'element');
        }
        const pageIds = selector => Array.from(document.querySelectorAll(selector)).map(node => node.getAttribute('data-pptd-page'));
        return {
          presenterRoots:document.querySelectorAll('[data-hd-presenter]').length,
          pageId:surface?.getAttribute('data-hd-presenter-slide') ?? null,
          occurrenceId:surface?.getAttribute('data-hd-presenter-occurrence') ?? null,
          timeMs:presenter ? Number(presenter.getAttribute('data-hd-presenter-time')) : null,
          step:presenter ? Number(presenter.getAttribute('data-hd-presenter-step')) : null,
          playing:presenter?.getAttribute('data-hd-presenter-playing') === 'true',
          blackout:!!document.querySelector('[data-hd-presenter-blackout]'),
          notes:!!document.querySelector('[data-hd-presenter-notes]'),
          currentRenderers:pageIds('[data-hd-presenter-slide] [data-pptd-page]'),
          nextRenderers:pageIds('[data-hd-presenter-next] [data-pptd-page]'),
          totalPresenterRenderers:document.querySelectorAll('[data-hd-presenter] [data-pptd-page]').length,
          mountedNodes:document.querySelectorAll('*').length,
          totalRenderers:document.querySelectorAll('[data-pptd-page]').length,
          animationErrors:document.querySelectorAll('[data-hd-animation-error]').length,
          raf:{...counters,pending:Array.from(pending.values())},
          width:innerWidth,height:innerHeight,dpr:devicePixelRatio,
        };
      },
      weakStats() {
        const result = {tracked:references.length,collected:0,connected:0,detachedAlive:0,byKind:{},survivors:[]};
        for (const item of references) {
          const node = item.ref.deref();
          const state = !node ? 'collected' : node.isConnected ? 'connected' : 'detachedAlive';
          result[state]++;
          const group = result.byKind[item.kind] ??= {tracked:0,collected:0,connected:0,detachedAlive:0};
          group.tracked++;
          group[state]++;
          if (node && result.survivors.length < 30) result.survivors.push({kind:item.kind,cycle:item.cycle,connected:node.isConnected});
        }
        return result;
      },
      dispose() { window.requestAnimationFrame = request; window.cancelAnimationFrame = cancel; }
    };
    return true;
  })()`);
}

const state = () => evaluate('window.__hdPresentationSoak.read()');

async function at(index, timeMs, notes) {
  const current = await eventually(async () => {
    const current = await state();
    return current.occurrenceId === view.pages[index].occurrenceId &&
      current.timeMs === timeMs &&
      !current.playing
      ? current
      : false;
  }, `occurrence ${index} at stopped time ${timeMs}`);
  assert.equal(current.presenterRoots, 1);
  assert.equal(current.animationErrors, 0);
  assert.equal(current.pageId, view.pages[index].pageId);
  assert.deepEqual(current.currentRenderers, [view.pages[index].pageId]);
  assert.equal(current.notes, notes);
  const expectedNext = notes && view.pages[index + 1] ? [view.pages[index + 1].pageId] : [];
  assert.deepEqual(current.nextRenderers, expectedNext);
  assert.equal(current.totalPresenterRenderers, 1 + expectedNext.length);
  return current;
}

async function inFlight(index, after = 0) {
  return eventually(async () => {
    const current = await state();
    return current.occurrenceId === view.pages[index].occurrenceId &&
      current.playing &&
      current.timeMs > after
      ? current
      : false;
  }, `occurrence ${index} in flight after ${after}`);
}

async function playAll(index, notes) {
  for (const stop of stops) {
    await clickSlide();
    await at(index, stop, notes);
  }
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

async function saveReport() {
  report.cdpMethods = [...methods].sort();
  await fs.writeFile(output, JSON.stringify(report, null, 2));
}

async function sample(stage) {
  const heap = await client.send('Runtime.getHeapUsage');
  const dom = await client.send('Memory.getDOMCounters');
  const { metrics } = await client.send('Performance.getMetrics');
  const mounted = await state();
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
        .filter((item) =>
          /^(JSHeapUsedSize|JSHeapTotalSize|Documents|LayoutObjects|Nodes|TaskDuration)$/.test(
            item.name,
          ),
        )
        .map((item) => [item.name, item.value]),
    ),
  });
  await saveReport();
  const tab = processes.find((item) => item.type === 'Tab');
  process.stdout.write(
    `${JSON.stringify({ stage, rendererMiB: tab?.workingSetBytes / 1048576, heapUsedMiB: heap.usedSize / 1048576, pendingRaf: mounted.raf.pending.length, presenterRenderers: mounted.totalPresenterRenderers })}\n`,
  );
}

async function launch() {
  report.marker = JSON.parse(
    await fs.readFile(path.join(path.dirname(executable), 'huandeng-build.json'), 'utf8'),
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
  child.stdout.on('data', (bytes) => (processLog = (processLog + bytes.toString()).slice(-32000)));
  child.stderr.on('data', (bytes) => (processLog = (processLog + bytes.toString()).slice(-32000)));
  const debugPort = await eventually(
    async () => {
      const match = /DevTools listening on ws:\/\/127\.0\.0\.1:(\d+)\//.exec(processLog);
      if (match) return Number(match[1]);
      const file = await fs
        .readFile(path.join(profile, 'DevToolsActivePort'), 'utf8')
        .catch(() => '');
      return /^\d+\n/.test(file) ? Number(file.split('\n')[0]) : false;
    },
    'isolated remote debugging port',
    60000,
    100,
  );
  const browserInfo = await (await fetch(`http://127.0.0.1:${debugPort}/json/version`)).json();
  report.browser = browserInfo.Browser;
  report.userAgent = browserInfo['User-Agent'];
  const target = await eventually(async () => {
    const targets = await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json();
    return targets.find((item) => item.type === 'page');
  }, 'renderer CDP target');
  client = await CDP.connect(target.webSocketDebuggerUrl);
  client.on('Runtime.exceptionThrown', (event) =>
    report.rendererErrors.push(
      event.exceptionDetails?.exception?.description ?? event.exceptionDetails?.text,
    ),
  );
  await client.send('Runtime.enable');
  await client.send('Performance.enable');
  await eventually(
    () => evaluate(`!!document.querySelector('[data-hd-editor-canvas]')`),
    'editor ready',
    180000,
  );
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
  const response = await fetch(`${serviceUrl}/__pptd/presentations/soak-talk`);
  assert.ok(response.ok);
  view = await response.json();
  assert.deepEqual(
    view.pages.map((page) => page.pageId),
    [ids[0], ids[1], ids[0], ids[2]],
  );
  assert.equal(new Set(view.pages.map((page) => page.occurrenceId)).size, 4);
  report.fixture.occurrences = view.pages.map((page) => ({
    pageId: page.pageId,
    occurrenceId: page.occurrenceId,
  }));
  await evaluate(`document.querySelector('select[aria-label="当前演讲集合"]').focus()`);
  await press('End');
  await press('Enter');
  await eventually(
    () =>
      evaluate(
        `new URLSearchParams(location.search).get('presentation') === 'soak-talk' && document.querySelector('[data-hd-editor-canvas] [data-pptd-page]')?.getAttribute('data-pptd-page') === ${JSON.stringify(ids[0])}`,
      ),
    'select synthetic presentation',
  );
  await evaluate(`document.querySelector('[data-hd-editor-canvas]').focus()`);
  await instrument();
  await wait(1500);
  assert.deepEqual(
    await hashSources(),
    baselineHashes,
    'Opening a prepared deck must not rewrite it.',
  );
}

async function cycle(round) {
  const start = performance.now();
  await evaluate(`window.__hdPresentationSoak.setCycle(${round})`);
  await press('F5');
  await at(0, 0, false);
  await clickButton('演讲者备注');
  await at(0, 0, true);
  if (round === 1 || round === rounds) await sample(`round-${round}-active-with-next`);
  await clickSlide();
  await at(0, stops[0], true);
  await press('ArrowRight');
  await inFlight(0, stops[0]);
  await press('b');
  const paused = await eventually(async () => {
    const current = await state();
    return current.blackout && !current.playing ? current : false;
  }, 'blackout pauses playback');
  await wait(80);
  assert.equal((await state()).timeMs, paused.timeMs);
  await clickExpression(`document.querySelector('[data-hd-presenter-blackout]')`);
  const restored = await state();
  assert.equal(restored.blackout, false);
  assert.equal(restored.timeMs, paused.timeMs, 'Restoring blackout must not consume a build.');
  await press('ArrowRight');
  await at(0, stops[1], true);
  await press('ArrowLeft');
  await at(0, stops[0], true);
  await clickSlide();
  await at(0, stops[1], true);
  await clickButton('下一步');
  await inFlight(0, stops[1]);
  await clickButton('下一步');
  await at(0, stops[2], true);
  await clickButton('下一步');
  await at(1, 0, true);
  if (round % 5 === 0) {
    await clickSlide();
    await inFlight(1);
    await press('Home');
    await at(0, 0, true);
    await wait(120);
    await at(0, 0, true);
    await playAll(0, true);
    await clickButton('下一步');
    await at(1, 0, true);
  }
  await clickButton('演讲者备注');
  await at(1, 0, false);
  await playAll(1, false);
  await clickButton('下一步');
  await at(2, 0, false);
  await press('ArrowLeft');
  await at(1, stops[2], false);
  await clickButton('下一步');
  await at(2, 0, false);
  await playAll(2, false);
  await clickButton('下一步');
  await at(3, 0, false);
  await clickButton('演讲者备注');
  await at(3, 0, true);
  await clickSlide();
  const beforeExit = await inFlight(3);
  assert.ok(beforeExit.timeMs < stops[0], 'Exit must exercise an unfinished animation.');
  await press('Escape');
  const afterExit = await eventually(
    async () => {
      const current = await state();
      return current.presenterRoots === 0 && current.raf.pending.length === 0 ? current : false;
    },
    'presenter unmount and all RAF callbacks quiescent',
    3000,
  );
  assert.equal(afterExit.totalPresenterRenderers, 0);
  assert.deepEqual(
    await hashSources(),
    baselineHashes,
    `Round ${round} must not write source bytes.`,
  );
  report.cycles.push({
    round,
    elapsedMs: performance.now() - start,
    sourceBytesUnchanged: true,
    repeatedOccurrenceReset: true,
    backwardsPageAtEnd: true,
    crossPageAbort: round % 5 === 0,
    exitDuringAnimationMs: beforeExit.timeMs,
    afterExit,
  });
  if (round === 1 || round % 5 === 0 || round === rounds) await sample(`after-${round}-rounds`);
  else await saveReport();
}

try {
  await makeFixture();
  await launch();
  await sample('editor-settled');
  for (let round = 1; round <= rounds; round++) await cycle(round);
  await wait(15000);
  await sample('after-15s-natural-idle');
  report.weakBeforeGC = await evaluate('window.__hdPresentationSoak.weakStats()');
  await client.send('Runtime.releaseObjectGroup', { objectGroup });
  // The prior WeakRef dereferences have left their JS job before this one explicit GC.
  await client.send('HeapProfiler.collectGarbage');
  await sample('after-final-explicit-gc');
  report.weakAfterGC = await evaluate('window.__hdPresentationSoak.weakStats()');
  assert.equal(report.weakAfterGC.connected, 0, 'No presentation DOM should remain mounted.');
  assert.equal(report.weakAfterGC.detachedAlive, 0, 'Old presentation DOM must be collectable.');
  const response = await fetch(`${serviceUrl}/__pptd/current`);
  assert.ok(response.ok);
  const current = await response.json();
  assert.equal(current.writable, true);
  assert.deepEqual(current.diagnostics, []);
  assert.deepEqual(report.rendererErrors, []);
  report.passed = true;
} catch (error) {
  report.error = error.stack ?? String(error);
  if (client) report.failureState = await state().catch(() => null);
  process.exitCode = 1;
} finally {
  if (client) await evaluate('window.__hdPresentationSoak?.dispose()').catch(() => {});
  if (child && child.exitCode === null) {
    const close = await execute(
      'powershell.exe',
      [
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        `$owned = Get-Process -Id ${child.pid} -ErrorAction Stop; $owned.CloseMainWindow()`,
      ],
      { windowsHide: true },
    ).catch((error) => ({ stderr: String(error) }));
    report.closeWindow = close.stdout?.trim() ?? close.stderr;
    let exitTimer;
    report.exit = await Promise.race([
      exitPromise,
      new Promise((resolve) => {
        exitTimer = setTimeout(() => resolve(null), 30000);
      }),
    ]).finally(() => clearTimeout(exitTimer));
  } else if (exitPromise) report.exit = await exitPromise;
  if (child && (report.exit?.code !== 0 || report.exit?.signal !== null)) {
    report.passed = false;
    process.exitCode = 1;
  }
  client?.close();
  if (baselineHashes) {
    report.finalSourceHashes = await hashSources();
    report.sourceBytesUnchanged =
      JSON.stringify(report.finalSourceHashes) === JSON.stringify(baselineHashes);
    if (!report.sourceBytesUnchanged) {
      report.passed = false;
      process.exitCode = 1;
    }
  }
  report.processLog = processLog;
  await fs.mkdir(evidence, { recursive: true });
  await saveReport();
  process.stdout.write(
    `${JSON.stringify({ passed: report.passed, completedRounds: report.cycles.length, output, exit: report.exit, sourceBytesUnchanged: report.sourceBytesUnchanged, error: report.error ?? null })}\n`,
  );
}
