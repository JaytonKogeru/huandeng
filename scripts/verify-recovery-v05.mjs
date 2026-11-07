// biome-ignore-all lint/suspicious/noUndeclaredEnvVars: This isolated Windows Electron acceptance runs outside the Turbo task cache.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
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
const desktopApp = process.env.HUANDENG_DESKTOP_APP;
if (process.platform !== 'win32') throw new Error('This acceptance requires Windows file sharing.');
if (!executablePath)
  throw new Error('Set HUANDENG_DESKTOP_EXE; with Electron also set HUANDENG_DESKTOP_APP.');

const sandbox = await fs.mkdtemp(path.join(os.tmpdir(), 'huandeng-recovery-v05-'));
const deck = path.join(sandbox, 'synthetic-project');
const entry = path.join(deck, 'deck.pptd');
const targetPath = path.join(deck, 'pages/001.page');
const siblingPath = path.join(deck, 'pages/002.page');
const pageId = randomUUID();
const siblingId = randomUUID();
const deckId = randomUUID();
const runtime = path.join(sandbox, 'runtime');
const evidence = path.join(root, '.verification/recovery-v05', path.basename(sandbox));
const reportPath = path.join(root, '.verification/recovery-v05.json');
const powershell = path.join(
  process.env.SystemRoot ?? 'C:\\Windows',
  'System32/WindowsPowerShell/v1.0/powershell.exe',
);
const launchEnv = {
  ...process.env,
  HUANDENG_DESKTOP_DATA_DIR: path.join(sandbox, 'profile'),
  HUANDENG_RUNTIME_DIR: runtime,
  LOCALAPPDATA: path.join(sandbox, 'local-appdata'),
  APPDATA: path.join(sandbox, 'appdata'),
};
delete launchEnv.ELECTRON_RUN_AS_NODE;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const hash = (value) => `sha256:${createHash('sha256').update(value).digest('hex')}`;
const pathKey = (value) => path.resolve(value).toLowerCase();
const checks = [];
const mutations = [];
const screenshots = [];
const rendererErrors = [];
const processLog = [];
const locks = new Set();
const responseTasks = new Set();
const cleanupErrors = [];
let application;
let page;
let url;
let token;
let stateDir;
let writer;
let siblingSource;
let electronVersion;
let failure;
let cleanupStarted = false;
let sandboxRemoved = false;

function bounded(promise, milliseconds, label) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`Timed out: ${label}`)), milliseconds);
    }),
  ]).finally(() => clearTimeout(timer));
}

async function eventually(callback, label, timeout = 15000) {
  const deadline = Date.now() + timeout;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const result = await callback();
      if (result) return result;
    } catch (error) {
      lastError = error;
    }
    await wait(50);
  }
  throw new Error(`${label}: ${lastError ? String(lastError) : 'condition was not reached'}`);
}

async function check(name, callback) {
  const started = Date.now();
  try {
    const details = await callback();
    checks.push({ name, passed: true, milliseconds: Date.now() - started, ...details });
    process.stdout.write(`PASS ${name}\n`);
  } catch (error) {
    checks.push({ name, passed: false, milliseconds: Date.now() - started, error: String(error) });
    throw error;
  }
}

async function readOptional(file) {
  try {
    return await fs.readFile(file, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

async function writeReport() {
  await fs.mkdir(evidence, { recursive: true });
  const contents = `${JSON.stringify(
    {
      passed: !failure && checks.length === 6 && !cleanupErrors.length,
      timestamp: new Date().toISOString(),
      platform: process.platform,
      node: process.version,
      electron: electronVersion,
      executablePath,
      desktopApp,
      sandbox,
      sandboxRemoved,
      evidence,
      entry,
      stateDir,
      syntheticOnly: true,
      fault: 'Independent PowerShell FileStream(FileShare.Read) blocks replacement, not reads.',
      retryWindowMilliseconds: 2000,
      checks,
      mutations,
      screenshots,
      rendererErrors,
      error: failure?.stack ?? (failure ? String(failure) : undefined),
      cleanupErrors,
    },
    null,
    2,
  )}\n`;
  await fs.writeFile(path.join(evidence, 'result.json'), contents);
  await fs.writeFile(reportPath, contents);
}

function launchPowerShell(source, env) {
  const child = spawn(
    powershell,
    [
      '-NoLogo',
      '-NoProfile',
      '-NonInteractive',
      '-EncodedCommand',
      Buffer.from(source, 'utf16le').toString('base64'),
    ],
    { env: { ...launchEnv, ...env }, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] },
  );
  const status = { done: false, code: null, signal: null, error: null };
  child.stdout.on('data', (bytes) => processLog.push(`[PowerShell ${child.pid}] ${bytes}`));
  child.stderr.on('data', (bytes) => processLog.push(`[PowerShell ${child.pid}] ${bytes}`));
  const exited = new Promise((resolve) => {
    child.once('error', (error) => {
      Object.assign(status, { done: true, error: String(error) });
      resolve(status);
    });
    child.once('exit', (code, signal) => {
      Object.assign(status, { done: true, code, signal });
      resolve(status);
    });
  });
  return { child, status, exited };
}

async function holdTarget(label) {
  const directory = path.join(sandbox, 'locks', label);
  await fs.mkdir(directory, { recursive: true });
  const ready = path.join(directory, 'ready');
  const release = path.join(directory, 'release');
  const holder = launchPowerShell(
    `$ErrorActionPreference = 'Stop'
$stream = $null
try {
  $stream = [System.IO.File]::Open($env:HUANDENG_LOCK_TARGET, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::Read)
  [System.IO.File]::WriteAllText($env:HUANDENG_LOCK_READY, [string]$PID)
  $deadline = [DateTime]::UtcNow.AddSeconds(45)
  while (-not [System.IO.File]::Exists($env:HUANDENG_LOCK_RELEASE)) {
    if ([DateTime]::UtcNow -ge $deadline) { throw 'Synthetic lock exceeded its 45 second limit.' }
    Start-Sleep -Milliseconds 25
  }
} finally {
  if ($null -ne $stream) { $stream.Dispose() }
}`,
    {
      HUANDENG_LOCK_TARGET: targetPath,
      HUANDENG_LOCK_READY: ready,
      HUANDENG_LOCK_RELEASE: release,
    },
  );
  const lock = { ...holder, label, release };
  locks.add(lock);
  await eventually(async () => {
    if (lock.status.done)
      throw new Error(`Lock holder exited before readiness: ${JSON.stringify(lock.status)}`);
    return (await readOptional(ready)) === String(lock.child.pid);
  }, `PowerShell must hold ${label}`);
  assert.ok(await readOptional(targetPath), 'The held page must remain readable.');
  return lock;
}

async function releaseLock(lock) {
  await fs.writeFile(lock.release, 'release');
  const result = await bounded(lock.exited, 5000, `release ${lock.label}`);
  assert.equal(result.error, null);
  assert.equal(result.code, 0, `Lock holder ${lock.label} failed.`);
  locks.delete(lock);
}

async function request(endpoint, body) {
  const response = await fetch(`${url}/__pptd${endpoint}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers:
      body === undefined
        ? undefined
        : { 'content-type': 'application/json', 'x-huandeng-token': token },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  return { status: response.status, body: await response.json() };
}

async function api(endpoint, body) {
  const result = await request(endpoint, body);
  assert.ok(
    result.status >= 200 && result.status < 300 && result.body.ok !== false,
    JSON.stringify(result),
  );
  return result.body;
}

const pendingPath = () => path.join(stateDir, 'pending.json');
const receiptPath = (requestId) =>
  path.join(stateDir, 'receipts', `${hash(requestId).slice(7)}.json`);
const editor = () => page.getByRole('textbox', { name: '文本内容', exact: true });
const recovery = () => page.locator('[data-hd-recovery]');
const recoverButton = () => page.getByRole('button', { name: '恢复未完成保存', exact: true });

async function capture(name) {
  await page.mouse.move(400, 400);
  await page.screenshot({
    path: path.join(evidence, name),
    animations: 'disabled',
    timeout: 10000,
  });
  screenshots.push(name);
}

async function journalFor(trace) {
  return eventually(async () => {
    const source = await readOptional(pendingPath());
    if (!source) return false;
    const journal = JSON.parse(source);
    if (journal.record.requestId !== trace.requestId) return false;
    assert.deepEqual(journal.record.request, trace.body);
    return { source, journal };
  }, 'The original request must be durably journaled');
}

async function startEdit(text) {
  const start = mutations.length;
  await editor().fill(text);
  await page.keyboard.press('Control+s');
  return eventually(
    () => mutations.slice(start).find((item) => item.route === '/transactions'),
    'The UI must submit the edited page',
  );
}

async function completed(trace) {
  await eventually(() => trace.response !== undefined, `Response for ${trace.route}`);
  return trace.response;
}

async function saved(text) {
  await eventually(async () => {
    const source = await fs.readFile(targetPath, 'utf8');
    return (
      YAML.parse(source).elements.find((item) => item.elementId === 'title').content.text === text
    );
  }, 'The requested text must exist in the real page file');
  await eventually(
    async () => (await page.locator('[data-hd-save-status]').innerText()).includes('已保存'),
    'The editor must acknowledge the save',
  );
  assert.equal(await recovery().count(), 0, 'Recovery UI must disappear only after success.');
  assert.equal(
    await readOptional(pendingPath()),
    null,
    'A successful save must remove its journal.',
  );
  assert.equal(
    await fs.readFile(siblingPath, 'utf8'),
    siblingSource,
    'The unrelated synthetic page must remain untouched.',
  );
  const remote = await api(`/pages/${pageId}`);
  assert.deepEqual(remote.data, YAML.parse(await fs.readFile(targetPath, 'utf8')));
  return remote;
}

async function verifyReceipt(trace, journal) {
  const receipt = JSON.parse(await fs.readFile(receiptPath(trace.requestId), 'utf8'));
  assert.equal(receipt.result.requestId, trace.requestId);
  assert.equal(receipt.result.operationId, journal.record.operationId);
  assert.equal(receipt.requestHash, journal.record.requestHash);
  assert.deepEqual(receipt.result, journal.record.result);
  const targetChange = journal.record.files.find((item) => item.path === 'pages/001.page');
  assert.ok(targetChange);
  assert.equal(await fs.readFile(targetPath, 'utf8'), targetChange.after);
  const repeated = await api('/transactions', trace.body);
  assert.deepEqual(
    repeated,
    receipt.result,
    'Repeating the original request must return the original receipt.',
  );
  const history = await api('/history');
  const records = history.filter((item) => item.requestId === trace.requestId);
  assert.equal(records.length, 1, 'Recovery must not duplicate the history operation.');
  assert.equal(records[0].operationId, journal.record.operationId);
  await fs.writeFile(
    path.join(evidence, `${trace.requestId}-receipt.json`),
    `${JSON.stringify(receipt, null, 2)}\n`,
  );
  return receipt.result;
}

async function recoverPending() {
  const start = mutations.length;
  await recoverButton().click();
  const trace = await eventually(
    () => mutations.slice(start).find((item) => item.route === '/recover'),
    'The recovery button must call the recovery endpoint',
  );
  return { trace, response: await completed(trace) };
}

async function persistentFailure(text, label) {
  const before = await fs.readFile(targetPath, 'utf8');
  const lock = await holdTarget(label);
  const trace = await startEdit(text);
  const { source, journal } = await journalFor(trace);
  await page.locator('[data-hd-recovery="required"]').waitFor({ timeout: 20000 });
  const response = await completed(trace);
  assert.equal(response.body.error?.code ?? response.body.code, 'PENDING_RECOVERY');
  assert.ok(response.status >= 400);
  const details = response.body.error?.details ?? response.body.details;
  assert.ok(['EPERM', 'EACCES', 'EBUSY'].includes(details?.causeCode), JSON.stringify(response));
  assert.equal(details.syscall, 'rename');
  assert.ok(details.renameAttempts > 1 && details.renameWaitMs >= 1700);
  assert.ok(
    trace.finishedAt - trace.startedAt >= 1700,
    'The bounded retry window must run before recovery is required.',
  );
  assert.ok(
    trace.finishedAt - trace.startedAt < 15000,
    'An occupied page must not stall saving indefinitely.',
  );
  assert.equal(
    lock.status.done,
    false,
    'The independent handle must still be held when the UI reports recovery.',
  );
  assert.equal(
    await fs.readFile(targetPath, 'utf8'),
    before,
    'A failed replacement must not truncate or delete the old page.',
  );
  assert.equal(await readOptional(receiptPath(trace.requestId)), null);
  assert.equal(await editor().inputValue(), text, 'The unsaved edit must remain visible.');
  assert.equal(
    await page.locator('[data-hd-save-status]').getAttribute('data-hd-recovery-state'),
    'required',
  );
  assert.equal(await recoverButton().isEnabled(), true);
  assert.equal(
    mutations.filter((item) => item.route === '/recover').length,
    label === 'third-state' ? 1 : 0,
    'Recovery must require an explicit click.',
  );
  await fs.writeFile(path.join(evidence, `${label}-pending.json`), source);
  return { lock, trace, journal, before, pendingSource: source };
}

async function cleanup() {
  if (cleanupStarted) return;
  cleanupStarted = true;
  for (const lock of locks) {
    try {
      await fs.writeFile(lock.release, 'release');
      await bounded(lock.exited, 5000, `cleanup lock ${lock.label}`);
    } catch (error) {
      cleanupErrors.push(String(error));
      if (!lock.status.done) lock.child.kill();
      await bounded(lock.exited, 3000, `terminate lock ${lock.label}`).catch((error) =>
        cleanupErrors.push(String(error)),
      );
    }
  }
  if (application) {
    const child = application.process();
    await bounded(application.close(), 16000, 'close the isolated Electron instance').catch(
      async (error) => {
        processLog.push(`Cleanup: ${String(error)}\n`);
        if (child.exitCode !== null || child.signalCode !== null) return;
        const killer = spawn('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], {
          windowsHide: true,
          stdio: 'ignore',
        });
        await bounded(
          new Promise((resolve, reject) => {
            killer.once('error', reject);
            killer.once('exit', resolve);
          }),
          5000,
          'terminate the isolated Electron tree',
        ).catch((error) => {
          cleanupErrors.push(String(error));
          if (killer.exitCode === null && killer.signalCode === null) killer.kill();
        });
        if (child.exitCode === null && child.signalCode === null) child.kill();
        await eventually(
          () => child.exitCode !== null || child.signalCode !== null,
          'The owned Electron process must terminate',
          5000,
        ).catch((error) => cleanupErrors.push(String(error)));
      },
    );
  }
  if (writer?.pid && stateDir && (await readOptional(path.join(stateDir, 'writer.json')))) {
    const service = launchPowerShell(
      `$ErrorActionPreference = 'Stop'
$child = Get-CimInstance Win32_Process -Filter ('ProcessId=' + $env:HUANDENG_OWNED_SERVICE_PID)
if ($null -ne $child) {
  if (-not $child.CommandLine -or $child.CommandLine.IndexOf($env:HUANDENG_OWNED_ENTRY, [StringComparison]::OrdinalIgnoreCase) -lt 0) { throw 'Refusing to stop a process without this synthetic entry in its command line.' }
  Stop-Process -Id $child.ProcessId -Force
}`,
      { HUANDENG_OWNED_SERVICE_PID: String(writer.pid), HUANDENG_OWNED_ENTRY: entry },
    );
    await bounded(service.exited, 7000, 'clean up the owned document service')
      .then((result) => {
        if (result.code !== 0 || result.error)
          cleanupErrors.push(`Service cleanup: ${JSON.stringify(result)}`);
      })
      .catch((error) => {
        cleanupErrors.push(String(error));
        if (!service.status.done) service.child.kill();
      });
    await bounded(service.exited, 3000, 'finish the service cleanup process').catch((error) =>
      cleanupErrors.push(String(error)),
    );
  }
  await fs.writeFile(path.join(evidence, 'process.log'), processLog.join(''));
  if (!failure && !cleanupErrors.length) {
    await fs.rm(sandbox, { recursive: true, force: true, maxRetries: 8, retryDelay: 150 });
    sandboxRemoved = true;
  }
}

try {
  await fs.mkdir(path.join(deck, 'pages'), { recursive: true });
  await fs.mkdir(path.join(deck, '.huandeng'), { recursive: true });
  await fs.mkdir(evidence, { recursive: true });
  await fs.mkdir(launchEnv.LOCALAPPDATA, { recursive: true });
  await fs.mkdir(launchEnv.APPDATA, { recursive: true });
  await fs.writeFile(
    entry,
    YAML.stringify({
      title: '幻灯 · Windows 保存恢复验收',
      size: [960, 540],
      pages: ['pages/001.page', 'pages/002.page'],
    }),
  );
  const makePage = (text) => ({
    elements: [
      {
        elementId: 'title',
        elementType: 'text',
        bounds: [70, 100, 800, 100],
        content: { text, fontSize: 34, fontFamily: 'Arial', color: '#254d3c' },
      },
    ],
    notes: '独立合成保存恢复验收，不含真实项目内容。',
    syntheticVerification: 'recovery-v05',
  });
  await fs.writeFile(targetPath, YAML.stringify(makePage('等待可恢复的保存。')));
  siblingSource = YAML.stringify(makePage('这一页不应改变。'));
  await fs.writeFile(siblingPath, siblingSource);
  await fs.writeFile(
    path.join(deck, '.huandeng/project.json'),
    `${JSON.stringify(
      {
        schemaVersion: 1,
        deckId,
        entry: 'deck.pptd',
        slides: {
          [pageId]: { shortCode: 'R7M2', label: 'S1', path: 'pages/001.page', state: 'active' },
          [siblingId]: { shortCode: 'T9Q4', label: 'S2', path: 'pages/002.page', state: 'active' },
        },
      },
      null,
      2,
    )}\n`,
  );

  await check(
    'opens only the isolated synthetic project and identifies its owned writer',
    async () => {
      application = await electron.launch({
        executablePath,
        args: [...(desktopApp ? [desktopApp] : []), '--entry', entry],
        cwd: root,
        env: launchEnv,
        timeout: 120000,
      });
      application.process().stdout?.on('data', (bytes) => processLog.push(`[Electron] ${bytes}`));
      application.process().stderr?.on('data', (bytes) => processLog.push(`[Electron] ${bytes}`));
      page = await application.firstWindow();
      page.setDefaultTimeout(15000);
      page.on('pageerror', (error) => rendererErrors.push(error.message));
      const traces = new WeakMap();
      page.on('request', (event) => {
        const route = new URL(event.url()).pathname.replace(/^\/__pptd/, '');
        if (event.method() !== 'POST' || !['/transactions', '/recover'].includes(route)) return;
        const body = event.postDataJSON();
        const trace = { route, requestId: body?.requestId, body, startedAt: Date.now() };
        mutations.push(trace);
        traces.set(event, trace);
      });
      page.on('response', (event) => {
        const trace = traces.get(event.request());
        if (!trace) return;
        const task = event
          .json()
          .then((body) => {
            if (body && typeof body === 'object') delete body.sessionToken;
            trace.finishedAt = Date.now();
            trace.response = { status: event.status(), body };
          })
          .catch((error) => {
            trace.finishedAt = Date.now();
            trace.response = { status: event.status(), body: { parseError: String(error) } };
          });
        responseTasks.add(task);
        task.finally(() => responseTasks.delete(task));
      });
      await page.locator('[data-hd-editor-canvas]').waitFor({ timeout: 120000 });
      const context = await page.evaluate(() => window.huandengDesktop.getContext());
      assert.equal(pathKey(context.entryPath), pathKey(entry));
      url = context.serviceUrl;
      const session = await api('/session');
      token = session.sessionToken;
      assert.equal(pathKey(session.entry), pathKey(entry));
      assert.equal(session.deckId, deckId);
      assert.equal(session.pages.length, 2);
      const base = path.join(runtime, 'documents');
      for (const directory of await fs.readdir(base)) {
        const candidate = path.join(base, directory);
        const source = await readOptional(path.join(candidate, 'writer.json'));
        if (!source) continue;
        const owner = JSON.parse(source);
        if (pathKey(owner.root) === pathKey(await fs.realpath(deck))) {
          stateDir = candidate;
          writer = owner;
          break;
        }
      }
      assert.ok(
        stateDir && Number.isInteger(writer?.pid),
        'The writer must belong to this sandbox.',
      );
      electronVersion = await application.evaluate(() => process.versions.electron);
      await page.locator(`[data-hd-thumbnail=${JSON.stringify(pageId)}]`).click();
      await page.locator('[data-hd-editor-canvas] [data-hd-element-id="title"]').click();
      await editor().waitFor();
      return { pageId, writerPid: writer.pid };
    },
  );

  await check(
    'a temporary read-sharing handle releases and the original save succeeds without recovery',
    async () => {
      const before = await fs.readFile(targetPath, 'utf8');
      const lock = await holdTarget('transient');
      const trace = await startEdit('短暂占用释放后，原保存自动完成。');
      const { source, journal } = await journalFor(trace);
      await eventually(
        async () =>
          (await fs.readdir(path.dirname(targetPath))).some(
            (name) => name.startsWith('.001.page.huandeng-') && name.endsWith('.tmp'),
          ),
        'The real page replacement must be attempted',
      );
      const heldAt = Date.now();
      await wait(650);
      assert.equal(await fs.readFile(targetPath, 'utf8'), before);
      await releaseLock(lock);
      const heldMilliseconds = Date.now() - heldAt;
      await fs.writeFile(path.join(evidence, 'transient-pending.json'), source);
      const response = await completed(trace);
      assert.equal(response.status, 200, JSON.stringify(response));
      assert.equal(response.body.ok, true);
      assert.equal(mutations.filter((item) => item.route === '/recover').length, 0);
      await saved('短暂占用释放后，原保存自动完成。');
      const receipt = await verifyReceipt(trace, journal);
      return {
        heldMilliseconds,
        requestId: trace.requestId,
        operationId: receipt.operationId,
        originalResponse: response.status,
      };
    },
  );

  await check(
    'a longer file hold preserves the page and draft until explicit recovery returns the original receipt',
    async () => {
      const text = '持续占用解除后，显式恢复这次保存。';
      const { lock, trace, journal } = await persistentFailure(text, 'persistent');
      await capture('pending-recovery.png');
      await releaseLock(lock);
      const result = await recoverPending();
      assert.equal(result.response.status, 200, JSON.stringify(result.response));
      assert.equal(result.response.body.kind, 'pptd');
      await saved(text);
      const receipt = await verifyReceipt(trace, journal);
      assert.ok(
        mutations.filter(
          (item) => item.route === '/transactions' && item.requestId === trace.requestId,
        ).length >= 2,
        'The client must re-use the original request to retrieve its receipt.',
      );
      await capture('recovered.png');
      return {
        requestId: trace.requestId,
        operationId: receipt.operationId,
        recoveryResponse: result.response.status,
      };
    },
  );

  await check(
    'editing continues after recovery and creates one new persisted operation',
    async () => {
      const trace = await startEdit('恢复之后，可以继续正常编辑。');
      const response = await completed(trace);
      assert.equal(response.status, 200, JSON.stringify(response));
      await saved('恢复之后，可以继续正常编辑。');
      const history = await api('/history');
      assert.equal(history.filter((item) => item.requestId === trace.requestId).length, 1);
      return { requestId: trace.requestId, operationId: response.body.operationId };
    },
  );

  await check(
    'recovery refuses a third external state without changing it or losing the pending draft',
    async () => {
      const text = '第三态保护之后仍可恢复原请求。';
      const { lock, trace, journal, before, pendingSource } = await persistentFailure(
        text,
        'third-state',
      );
      await releaseLock(lock);
      const third = YAML.parse(before);
      third.elements[0].content.text = '第三方写入的合成内容，恢复不能覆盖。';
      const thirdSource = YAML.stringify(third);
      await fs.writeFile(targetPath, thirdSource);
      const refused = await recoverPending();
      assert.ok(refused.response.status >= 400);
      assert.equal(
        refused.response.body.error?.code ?? refused.response.body.code,
        'RECOVERY_REQUIRED',
      );
      await page.locator('[data-hd-recovery="required"]').waitFor();
      await eventually(
        async () =>
          (await recovery().innerText()).includes('文件或保存记录与预期不一致，恢复已停止'),
        'A rejected recovery must explain the file conflict, not repeat the file-lock advice',
        3000,
      );
      const refreshed = page.waitForResponse(
        (response) =>
          response.request().method() === 'GET' &&
          new URL(response.url()).pathname === '/__pptd/session',
      );
      await page.getByRole('button', { name: '检查最新状态', exact: true }).click();
      await (await refreshed).finished();
      await page.evaluate(
        () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
      );
      assert.ok(
        (await recovery().innerText()).includes('文件或保存记录与预期不一致，恢复已停止'),
        'Refreshing the session must preserve the rejected-recovery explanation',
      );
      assert.equal(await editor().inputValue(), text);
      assert.equal(await fs.readFile(targetPath, 'utf8'), thirdSource);
      assert.equal(await fs.readFile(pendingPath(), 'utf8'), pendingSource);
      assert.equal(await readOptional(receiptPath(trace.requestId)), null);
      await fs.writeFile(path.join(evidence, 'third-state-preserved.page'), thirdSource);
      await capture('third-state-refused.png');
      // Only the synthetic fixture is restored to its known before-state to finish cleanup through the UI.
      await fs.writeFile(targetPath, before);
      const resumed = await recoverPending();
      assert.equal(resumed.response.status, 200, JSON.stringify(resumed.response));
      await saved(text);
      const receipt = await verifyReceipt(trace, journal);
      return {
        requestId: trace.requestId,
        operationId: receipt.operationId,
        rejectedCode: 'RECOVERY_REQUIRED',
        thirdStateHash: hash(thirdSource),
        pendingHash: hash(pendingSource),
      };
    },
  );

  await check(
    'the recovered editor closes normally and releases its owned service and runtime session',
    async () => {
      assert.deepEqual(rendererErrors, []);
      await capture('final-saved.png');
      await fs.copyFile(targetPath, path.join(evidence, 'final-001.page'));
      const closed = application.waitForEvent('close', { timeout: 25000 });
      await application.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].close());
      await closed;
      await eventually(
        async () => (await readOptional(path.join(stateDir, 'writer.json'))) === null,
        'The writer lease must be released after normal close',
      );
      await eventually(async () => {
        try {
          return (await fs.readdir(path.join(runtime, 'sessions'))).length === 0;
        } catch (error) {
          if (error.code === 'ENOENT') return true;
          throw error;
        }
      }, 'The owned discovery session must be removed');
      await eventually(async () => {
        try {
          await fetch(`${url}/__pptd/session`, { signal: AbortSignal.timeout(1000) });
          return false;
        } catch {
          return true;
        }
      }, 'The owned local service must stop');
      application = undefined;
    },
  );
  await bounded(Promise.allSettled([...responseTasks]), 5000, 'finish response evidence');
  await writeReport();
} catch (error) {
  failure = error;
  process.exitCode = 1;
  await writeReport();
  if (page && !page.isClosed())
    await capture('failure.png').catch((error) =>
      processLog.push(`Failure screenshot: ${error}\n`),
    );
  if (stateDir) {
    const pending = await readOptional(pendingPath()).catch(() => null);
    if (pending) await fs.writeFile(path.join(evidence, 'failure-pending.json'), pending);
  }
  await fs.copyFile(targetPath, path.join(evidence, 'failure-001.page')).catch(() => {});
  process.stderr.write(
    `${error.stack ?? error}\nEvidence: ${reportPath}\nSynthetic sandbox preserved: ${sandbox}\n`,
  );
} finally {
  await cleanup().catch((error) => cleanupErrors.push(String(error)));
  if (cleanupErrors.length) process.exitCode = 1;
  await writeReport();
  process.stdout.write(
    `Recovery verification: ${failure || cleanupErrors.length ? 'FAIL' : 'PASS'}\nReport: ${reportPath}\n`,
  );
}
