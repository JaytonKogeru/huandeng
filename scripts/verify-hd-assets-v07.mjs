// biome-ignore-all lint/suspicious/noUndeclaredEnvVars: Explicit isolated desktop acceptance environment.
// Synthetic-only acceptance. Never accepts an existing project path.
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { deflateSync } from 'node:zlib';

const root = process.cwd();
const require = createRequire(path.join(root, 'packages/core/package.json'));
const { _electron: electron } = require('playwright');
const execute = promisify(execFile);
const noEncoder = process.argv.includes('--without-encoder');
const prepareOnly = process.argv.includes('--prepare-only');
const executablePath = process.env.HUANDENG_DESKTOP_EXE;
if (!prepareOnly && !executablePath)
  throw new Error('Set HUANDENG_DESKTOP_EXE to the isolated candidate executable.');
const sandbox = await fs.mkdtemp(path.join(os.tmpdir(), 'huandeng-hd-v07-'));
const project = path.join(sandbox, 'synthetic-project');
const entry = path.join(project, 'deck.pptd');
const evidence = path.join(root, '.verification/v07-performance');
await fs.mkdir(path.join(project, 'media'), { recursive: true });
await fs.mkdir(path.join(project, 'pages'));
await fs.mkdir(path.join(project, '.huandeng'));
await fs.mkdir(evidence, { recursive: true });
const label = noEncoder ? 'no-encoder' : 'with-encoder';
const reportPath = path.join(evidence, `hd-assets-v07-${label}.json`);
const hash = (bytes) => `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
const table = Array.from({ length: 256 }, (_, n) => {
  let crc = n;
  for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  return crc >>> 0;
});
function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type), data]);
  let crc = 0xffffffff;
  for (const byte of body) crc = (crc >>> 8) ^ table[(crc ^ byte) & 255];
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const check = Buffer.alloc(4);
  check.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
  return Buffer.concat([length, body, check]);
}
function png(variant) {
  const width = 3840,
    height = 2160,
    stride = width * 4 + 1;
  const raw = Buffer.alloc(stride * height);
  let random = (variant + 1) * 73687;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const i = y * stride + 1 + x * 4;
      random = (Math.imul(random, 1664525) + 1013904223) >>> 0;
      raw[i] = y < 256 ? random & 255 : (Math.floor(x / 32) * 13 + variant * 17) & 255;
      raw[i + 1] = y < 256 ? (random >>> 8) & 255 : (Math.floor(y / 24) * 11 + variant * 7) & 255;
      raw[i + 2] =
        y < 256
          ? (random >>> 16) & 255
          : (Math.floor(x / 128) + Math.floor(y / 128)) % 2
            ? 210
            : 45;
      raw[i + 3] = x < 48 && y < 48 ? 0 : 255;
    }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([
    Buffer.from('89504e470d0a1a0a', 'hex'),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 3 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
function pad(bytes, target) {
  const padding = Buffer.alloc(target - bytes.length - 12, 32);
  padding.write('padding\0');
  return Buffer.concat([
    bytes.subarray(0, bytes.length - 12),
    chunk('tEXt', padding),
    bytes.subarray(bytes.length - 12),
  ]);
}
const ids = Array.from({ length: 30 }, (_, i) => `hd-page-${i}`);
const pages = ids.map((_, i) => `pages/${i}.page`);
const originals = {};
const firstRaw = png(0),
  replacementRaw = png(1000);
const paddedLength = Math.max(firstRaw.length, replacementRaw.length) + 4096;
const first = pad(firstRaw, paddedLength),
  replacement = pad(replacementRaw, paddedLength);
for (let index = 0; index < 30; index++) {
  const source = `media/image-${String(index).padStart(2, '0')}.png`;
  const bytes = index === 0 ? first : png(index);
  await fs.writeFile(path.join(project, source), bytes);
  originals[source] = { revision: hash(bytes), bytes: bytes.length };
  await fs.writeFile(
    path.join(project, pages[index]),
    JSON.stringify({
      elements: [
        {
          elementId: 'title',
          elementType: 'text',
          bounds: [32, 28, 860, 60],
          content: { text: `高清素材验收 · ${index + 1} / 30`, fontSize: 28 },
        },
        {
          elementId: 'unique-image',
          elementType: 'image',
          src: source,
          bounds: [32, 116, 660, 371.25],
          fit: { mode: 'contain' },
        },
        {
          elementId: 'shared-image',
          elementType: 'image',
          src: 'media/shared.png',
          bounds: [720, 280, 208, 117],
          fit: { mode: 'contain' },
        },
      ],
      notes: 'Synthetic acceptance fixture only.',
    }),
  );
  if ((index + 1) % 10 === 0) process.stdout.write(`Prepared ${index + 1}/30 synthetic 4K pages\n`);
}
await fs.writeFile(path.join(project, 'media/shared.png'), first);
originals['media/shared.png'] = { revision: hash(first), bytes: first.length };
await fs.writeFile(
  entry,
  JSON.stringify({ title: '高清素材验收 · 30 页独立 4K 图与跨页复用', size: [960, 540], pages }),
);
await fs.writeFile(
  path.join(project, '.huandeng/project.json'),
  JSON.stringify({
    schemaVersion: 1,
    deckId: 'hd-acceptance-v07',
    entry: 'deck.pptd',
    slides: Object.fromEntries(
      ids.map((id, i) => [
        id,
        {
          path: pages[i],
          shortCode: `H${String(i).padStart(3, '0')}`,
          label: `S${i + 1}`,
          state: 'active',
        },
      ]),
    ),
  }),
);
const report = {
  passed: false,
  at: new Date().toISOString(),
  executablePath,
  sandbox,
  entry,
  syntheticOnly: true,
  mode: label,
  fixture: {
    pages: 30,
    unique4kImages: 30,
    width: 3840,
    height: 2160,
    sharedUses: 30,
    totalSourceBytes: Object.values(originals).reduce((n, x) => n + x.bytes, 0),
  },
  checks: [],
  memory: [],
  requests: [],
  rendererErrors: [],
  pageTimes: [],
  sourceHashesBefore: structuredClone(originals),
};
if (prepareOnly) {
  await fs.writeFile(
    path.join(evidence, 'hd-assets-v07-fixture.json'),
    JSON.stringify(report, null, 2),
  );
  process.stdout.write(
    `${JSON.stringify({ prepared: true, entry, sandbox, ...report.fixture })}\n`,
  );
  process.exit(0);
}

const launchEnv = {
  ...process.env,
  HUANDENG_DESKTOP_DATA_DIR: path.join(sandbox, 'profile'),
  HUANDENG_RUNTIME_DIR: path.join(sandbox, 'runtime'),
};
delete launchEnv.ELECTRON_RUN_AS_NODE;
if (noEncoder) launchEnv.HUANDENG_FFMPEG = path.join(sandbox, 'intentionally-absent-ffmpeg.exe');
let application, page, serviceUrl, servicePid, sessionToken, cdp;
const resourceTasks = new Set();
async function until(task, timeout = 30000) {
  const end = Date.now() + timeout;
  let last;
  while (Date.now() < end) {
    try {
      if (await task()) return;
    } catch (error) {
      last = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw last ?? new Error('Acceptance state did not settle.');
}
async function check(name, task) {
  const start = performance.now();
  await task();
  report.checks.push({ name, passed: true, ms: performance.now() - start });
  process.stdout.write(`PASS ${name}\n`);
}
async function api(route, body) {
  const response = await fetch(`${serviceUrl}/__pptd${route}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'content-type': 'application/json', 'x-huandeng-token': sessionToken ?? '' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const value = await response.json();
  assert.ok(response.ok, `${route}: ${JSON.stringify(value)}`);
  if (value.sessionToken) sessionToken = value.sessionToken;
  return value;
}
const canvas = () => page.locator('[data-hd-editor-canvas]');
async function select(index) {
  const start = performance.now();
  await page.locator(`[data-hd-thumbnail="${ids[index]}"]`).click();
  await until(
    async () =>
      (await canvas().locator('[data-pptd-page]').first().getAttribute('data-pptd-page')) ===
      ids[index],
  );
  await until(() =>
    canvas()
      .locator('img')
      .evaluateAll(
        (images) =>
          images.length >= 2 &&
          images.every(
            (img) => img.complete && img.naturalWidth === 3840 && img.naturalHeight === 2160,
          ),
      ),
  );
  report.pageTimes.push({ index, ms: performance.now() - start });
}
async function memory(stage) {
  const metrics = (await cdp.send('Performance.getMetrics')).metrics;
  const app = await application.evaluate(({ app }) =>
    app.getAppMetrics().map((item) => ({ pid: item.pid, type: item.type, memory: item.memory })),
  );
  let service = null;
  if (process.platform === 'win32') {
    const { stdout } = await execute(
      'powershell.exe',
      [
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        `$hdProcess=Get-Process -Id ${servicePid} -ErrorAction Stop; [ordered]@{pid=$hdProcess.Id;workingSetBytes=$hdProcess.WorkingSet64;privateBytes=$hdProcess.PrivateMemorySize64}|ConvertTo-Json -Compress`,
      ],
      { windowsHide: true },
    );
    service = JSON.parse(stdout);
  }
  report.memory.push({
    stage,
    js: Object.fromEntries(
      metrics
        .filter((item) => ['JSHeapUsedSize', 'JSHeapTotalSize'].includes(item.name))
        .map((item) => [item.name, item.value]),
    ),
    dom: await cdp.send('Memory.getDOMCounters'),
    app,
    service,
    mounted: await page.evaluate(() => ({
      previews: document.querySelectorAll('[data-hd-preview-mounted]').length,
      renderers: document.querySelectorAll('[data-pptd-page]').length,
      images: document.querySelectorAll('img').length,
    })),
  });
}

try {
  application = await electron.launch({
    executablePath,
    args: [
      ...(process.env.HUANDENG_DESKTOP_APP ? [process.env.HUANDENG_DESKTOP_APP] : []),
      '--entry',
      entry,
    ],
    cwd: root,
    env: launchEnv,
    timeout: 120000,
  });
  page = await application.firstWindow();
  page.setDefaultTimeout(30000);
  page.on('pageerror', (error) => report.rendererErrors.push(error.message));
  page.on('response', (response) => {
    if (!/\/__pptd\/asset(?:-preview)?\?/.test(response.url())) return;
    const task = response
      .allHeaders()
      .then((headers) =>
        report.requests.push({
          url: response.url(),
          status: response.status(),
          mode: headers['x-huandeng-preview'],
          reason: headers['x-huandeng-preview-reason'],
          contentLength: Number(headers['content-length'] ?? 0),
        }),
      )
      .catch(() => {});
    resourceTasks.add(task);
    void task.finally(() => resourceTasks.delete(task));
  });
  await canvas().waitFor({ timeout: 120000 });
  const context = await page.evaluate(() => window.huandengDesktop.getContext());
  assert.equal(path.resolve(context.entryPath).toLowerCase(), path.resolve(entry).toLowerCase());
  serviceUrl = context.serviceUrl;
  const canonical = await fs.realpath(entry);
  const discovery = JSON.parse(
    await fs.readFile(
      path.join(
        sandbox,
        'runtime/sessions',
        `${createHash('sha256')
          .update(process.platform === 'win32' ? canonical.toLowerCase() : canonical)
          .digest('hex')}.json`,
      ),
      'utf8',
    ),
  );
  servicePid = discovery.pid;
  const initial = await api('/session');
  assert.equal(initial.pages.length, 30);
  await application.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()[0].setContentSize(1600, 1000),
  );
  cdp = await page.context().newCDPSession(page);
  await cdp.send('Performance.enable');
  await select(0);
  await cdp.send('HeapProfiler.collectGarbage');
  await memory('settled-post-gc');
  await check(
    '30 distinct 4K pages sweep three times with original-size canvas images',
    async () => {
      for (let cycle = 0; cycle < 3; cycle++) {
        for (let index = 0; index < 30; index++) await select(index);
        await select(0);
        await cdp.send('HeapProfiler.collectGarbage');
        await memory(`cycle-${cycle + 1}-post-gc`);
        process.stdout.write(`Completed 4K sweep ${cycle + 1}/3\n`);
      }
    },
  );
  await check(
    'thumbnail requests are real and have the advertised derived or fallback dimensions',
    async () => {
      await until(async () => {
        const images = await page
          .locator('[data-hd-preview-mounted] img')
          .evaluateAll((items) =>
            items
              .filter((img) => img.complete && img.naturalWidth > 0)
              .map((img) => ({ width: img.naturalWidth, height: img.naturalHeight, src: img.src })),
          );
        assert.ok(images.length >= 2);
        assert.ok(images.every((img) => img.src.includes('/asset-preview?')));
        assert.ok(
          images.every((img) =>
            noEncoder ? img.width === 3840 : Math.max(img.width, img.height) <= 320,
          ),
        );
        report.thumbnailDimensions = images;
        return true;
      });
    },
  );
  await check(
    'asset grid uses previews while selected detail keeps original intrinsic dimensions',
    async () => {
      await page.getByRole('button', { name: '项目素材库', exact: true }).click();
      const library = page.locator('[data-hd-asset-library]');
      await library.waitFor();
      for (const source of [
        'media/image-00.png',
        'media/image-15.png',
        'media/image-29.png',
        'media/shared.png',
      ]) {
        const tile = library.locator(`[data-hd-asset-path="${source}"]`);
        await tile.scrollIntoViewIfNeeded();
        await tile.click();
        await until(() =>
          library
            .locator('[data-hd-asset-preview]')
            .evaluate(
              (img) => img.complete && img.naturalWidth === 3840 && img.naturalHeight === 2160,
            ),
        );
      }
      await page.screenshot({
        path: path.join(evidence, `hd-assets-v07-${label}.png`),
        animations: 'disabled',
      });
    },
  );
  await check(
    'same-length replacement with restored mtime never returns new bytes to an old content URL',
    async () => {
      const source = 'media/image-00.png',
        oldRevision = originals[source].revision;
      const file = path.join(project, source),
        previous = await fs.stat(file);
      assert.equal(replacement.length, previous.size);
      await fs.writeFile(file, replacement);
      await fs.utimes(file, previous.atime, previous.mtime);
      const oldUrl = `${serviceUrl}/__pptd/asset-preview?${new URLSearchParams({ path: source, revision: oldRevision, size: '320' })}`;
      assert.equal((await fetch(oldUrl)).status, 409);
      const fresh = await api('/session');
      const nextRevision = fresh.pages[0].assetRevisions[source];
      assert.equal(nextRevision, hash(replacement));
      const current = await fetch(
        `${serviceUrl}/__pptd/asset?${new URLSearchParams({ path: source, revision: nextRevision })}`,
      );
      assert.equal(current.status, 200);
      assert.equal(hash(Buffer.from(await current.arrayBuffer())), nextRevision);
      report.intentionalReplacement = {
        source,
        oldRevision,
        newRevision: nextRevision,
        bytes: replacement.length,
        restoredMtime: true,
      };
      originals[source].revision = nextRevision;
      assert.equal(
        (await fetch(`${serviceUrl}/__pptd/asset?path=media%2Fmissing.png`)).status,
        404,
      );
    },
  );
  await check('static export still receives original resources and produces a PNG', async () => {
    const result = await api('/render', { pageId: ids[0] });
    const response = await fetch(new URL(result.url, serviceUrl));
    assert.equal(response.status, 200);
    const bytes = Buffer.from(await response.arrayBuffer());
    assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    report.export = {
      bytes: bytes.length,
      width: bytes.readUInt32BE(16),
      height: bytes.readUInt32BE(20),
    };
  });
  await Promise.allSettled([...resourceTasks]);
  const previewRequests = report.requests.filter((item) => item.url.includes('/asset-preview?'));
  assert.ok(previewRequests.length > 0);
  if (noEncoder) {
    assert.ok(previewRequests.some((item) => item.reason === 'encoder-unavailable'));
    assert.ok(!previewRequests.some((item) => item.mode === 'derived'));
  } else assert.ok(previewRequests.some((item) => item.mode === 'derived'));
  await check(
    'all fixture sources keep expected hashes, including only the deliberate replacement',
    async () => {
      for (const [source, value] of Object.entries(originals))
        assert.equal(hash(await fs.readFile(path.join(project, source))), value.revision);
      report.sourceHashesAfter = structuredClone(originals);
    },
  );
  assert.deepEqual(report.rendererErrors, []);
  const exit = new Promise((resolve) =>
    application.process().once('exit', (code, signal) => resolve({ code, signal })),
  );
  await application.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].close());
  let closeTimer;
  try {
    report.normalExit = await Promise.race([
      exit,
      new Promise((_, reject) => {
        closeTimer = setTimeout(
          () => reject(new Error('Isolated editor did not close normally.')),
          20000,
        );
      }),
    ]);
  } finally {
    clearTimeout(closeTimer);
  }
  assert.deepEqual(report.normalExit, { code: 0, signal: null });
  application = undefined;
  report.passed = true;
} catch (error) {
  report.error = error.stack ?? String(error);
  process.exitCode = 1;
  await page
    ?.screenshot({
      path: path.join(evidence, `hd-assets-v07-${label}-failure.png`),
      timeout: 10000,
    })
    .catch(() => {});
} finally {
  await application?.close().catch(() => {});
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  process.stdout.write(
    `${JSON.stringify({
      passed: report.passed,
      checks: report.checks.length,
      reportPath,
      sandbox,
      error: report.error,
    })}\n`,
  );
}
