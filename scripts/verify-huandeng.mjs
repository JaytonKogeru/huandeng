import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(root, 'packages/core/package.json'));
const { chromium } = require('playwright');
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');
const sandbox = await fs.mkdtemp(path.join(os.tmpdir(), 'huandeng-verify-'));
const deck = path.join(sandbox, 'studio');
await fs.cp(path.join(root, 'tests/fixtures/studio'), deck, { recursive: true });
const git = (args) =>
  execFileSync('git', ['-C', deck, ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
git(['init', '--quiet']);
git(['config', 'user.name', 'Huandeng Verification']);
git(['config', 'user.email', 'verification@example.invalid']);
await fs.writeFile(path.join(deck, '.gitignore'), 'Exports/\n');
git(['add', '--', 'deck.pptd', 'pages', 'media', '.huandeng', '.gitignore']);
git(['commit', '--quiet', '-m', 'Fixture baseline']);
const entry = path.join(deck, 'deck.pptd');
const port = Number(process.env.HUANDENG_VERIFY_PORT ?? 4869);
const url = `http://127.0.0.1:${port}`;
const evidence = path.join(root, '.verification');
await fs.mkdir(evidence, { recursive: true });
const log = [];
const child = spawn(
  process.execPath,
  [
    path.join(root, 'packages/core/huandeng.js'),
    'open',
    entry,
    '--port',
    String(port),
    '--no-browser',
  ],
  {
    cwd: root,
    env: { ...process.env, HUANDENG_RUNTIME_DIR: path.join(sandbox, 'runtime') },
    stdio: ['ignore', 'pipe', 'pipe'],
  },
);
child.stdout.on('data', (data) => log.push(String(data)));
child.stderr.on('data', (data) => log.push(String(data)));
const results = [];
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let token = '';
let browser;
let mcp;
async function api(endpoint, body) {
  const response = await fetch(`${url}/__pptd${endpoint}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'content-type': 'application/json', 'x-huandeng-token': token },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await response.json();
  if (!response.ok)
    throw Object.assign(new Error(data.message), { status: response.status, ...data });
  return data;
}
async function eventually(fn, timeout = 45000) {
  const until = Date.now() + timeout;
  let error;
  while (Date.now() < until) {
    try {
      const value = await fn();
      if (value) return value;
    } catch (issue) {
      error = issue;
    }
    await delay(200);
  }
  throw error ?? new Error('Timed out waiting for condition');
}
async function check(name, fn) {
  const started = Date.now();
  await fn();
  results.push({ name, passed: true, milliseconds: Date.now() - started });
  process.stdout.write(`PASS ${name}\n`);
}
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
async function sourceHashes() {
  const files = [
    'deck.pptd',
    '.huandeng/project.json',
    'pages/opening.page',
    'pages/evidence.page',
    'pages/identities.page',
  ];
  return Object.fromEntries(
    await Promise.all(
      files.map(async (name) => [name, hash(await fs.readFile(path.join(deck, name)))]),
    ),
  );
}
try {
  const session = await eventually(async () => {
    const snapshot = await api('/session');
    token = snapshot.sessionToken;
    return snapshot;
  });
  assert.equal(session.pages.length, 3);
  const executablePath = [
    process.env.HUANDENG_BROWSER,
    process.platform === 'win32'
      ? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
      : '/usr/bin/chromium',
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
  ].find((candidate) => candidate && existsSync(candidate));
  browser = await chromium.launch({
    ...(executablePath ? { executablePath } : {}),
    headless: true,
    args: process.platform === 'linux' ? ['--no-sandbox', '--disable-dev-shm-usage'] : [],
  });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  const browserErrors = [];
  page.on('pageerror', (error) => browserErrors.push(error.message));
  await page.goto(`${url}/huandeng`, { waitUntil: 'networkidle' });
  const canvas = page.locator('[data-hd-editor-canvas]');
  await canvas.waitFor();
  const first = session.pages[0];
  const other = session.pages[1];
  const request = {
    requestId: randomUUID(),
    deckId: session.deckId,
    actor: 'verification-agent',
    expected: { pages: { [first.pageId]: first.pageRevision } },
    operations: [
      {
        op: 'element.patch',
        pageId: first.pageId,
        elementId: 'title',
        set: { 'content.text': '有作者意图的幻灯。' },
      },
    ],
  };
  let receipt;
  await check('agent patch changes only its page and updates the open GUI', async () => {
    const before = await sourceHashes();
    receipt = await api('/transactions', request);
    const after = await sourceHashes();
    assert.deepEqual(
      Object.keys(before).filter((name) => before[name] !== after[name]),
      ['pages/opening.page'],
    );
    assert.match(
      await fs.readFile(path.join(deck, 'pages/opening.page'), 'utf8'),
      /Keep this comment/,
    );
    await eventually(async () =>
      (await canvas.locator('[data-hd-element-id="title"]').innerText()).includes('有作者意图'),
    );
  });
  await check('idempotent retry and stale same-page revision rejection', async () => {
    assert.equal((await api('/transactions', request)).operationId, receipt.operationId);
    await assert.rejects(
      api('/transactions', { ...request, requestId: randomUUID() }),
      (error) => error.code === 'REVISION_CONFLICT',
    );
  });
  await check('another page accepts its unchanged original revision', async () => {
    await api('/transactions', {
      ...request,
      requestId: randomUUID(),
      expected: { pages: { [other.pageId]: other.pageRevision } },
      operations: [
        { op: 'page.notes.set', pageId: other.pageId, text: 'Independent page edit verified.' },
      ],
    });
  });
  await check('GUI text edit saves and survives reload', async () => {
    await canvas.locator('[data-hd-element-id="title"]').dblclick();
    const editor = page.locator('[data-hd-inline-editor]');
    await editor.fill('人与 Agent，共用这一页。');
    await editor.press('Control+Enter');
    await eventually(
      async () =>
        (await api(`/pages/${first.pageId}`)).data.elements.find(
          (item) => item.elementId === 'title',
        ).content.text === '人与 Agent，共用这一页。',
    );
    await page.reload({ waitUntil: 'networkidle' });
    await eventually(async () =>
      (await canvas.locator('[data-hd-element-id="title"]').innerText()).includes('共用这一页'),
    );
  });
  await check('drag saves logical slide coordinates', async () => {
    const before = await api(`/pages/${first.pageId}`);
    const figure = canvas.locator('[data-hd-element-id="main-figure"]');
    const box = await figure.boundingBox();
    assert.ok(box);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 28, box.y + box.height / 2 + 14, { steps: 8 });
    await page.mouse.up();
    await eventually(async () => {
      const after = await api(`/pages/${first.pageId}`);
      return (
        after.data.elements.find((item) => item.elementId === 'main-figure').bounds[0] !==
        before.data.elements.find((item) => item.elementId === 'main-figure').bounds[0]
      );
    });
  });

  await check(
    'page reorder preserves identities, filenames and page bytes; undo restores order',
    async () => {
      const snapshot = await api('/session');
      const before = await sourceHashes();
      const moved = await api('/transactions', {
        requestId: randomUUID(),
        deckId: snapshot.deckId,
        actor: 'verification-agent',
        expected: { manifest: snapshot.manifestRevision },
        operations: [
          { op: 'page.move', pageId: first.pageId, afterPageId: snapshot.pages[2].pageId },
        ],
      });
      const after = await sourceHashes();
      assert.deepEqual(
        Object.keys(before).filter((name) => before[name] !== after[name]),
        ['deck.pptd'],
      );
      const reordered = await api('/session');
      assert.equal(reordered.pages[2].pageId, first.pageId);
      assert.equal(reordered.pages[2].shortCode, 'K7M2');
      await api('/undo', {
        operationId: moved.operationId,
        requestId: randomUUID(),
        actor: 'verification-agent',
      });
      assert.equal((await api('/session')).pages[0].pageId, first.pageId);
    },
  );
  await check('presenter notes and next-page preview follow stable page identities', async () => {
    await page.getByRole('button', { name: '演示', exact: true }).click();
    const presenter = page.locator('[data-hd-presenter]');
    await presenter.waitFor();
    assert.equal(await presenter.locator('[data-hd-presenter-notes]').count(), 0);
    await presenter.locator('[data-hd-presenter-notes-toggle]').click();
    assert.equal(
      await presenter.locator('[data-hd-presenter-notes]').getAttribute('data-hd-presenter-notes'),
      first.pageId,
    );
    assert.equal(
      await presenter.locator('[data-hd-presenter-next]').getAttribute('data-hd-presenter-next'),
      other.pageId,
    );
    assert.match(await presenter.locator('[data-hd-presenter-note-text]').innerText(), /开发样例/);
    await presenter.getByRole('button', { name: '下一页', exact: true }).click();
    await presenter.locator(`[data-hd-presenter-notes="${other.pageId}"]`).waitFor();
    assert.equal(
      await presenter.locator('[data-hd-presenter-notes]').getAttribute('data-hd-presenter-notes'),
      other.pageId,
    );
    assert.equal(
      await presenter.locator('[data-hd-presenter-note-text]').innerText(),
      (await api(`/pages/${other.pageId}`)).data.notes,
    );
    await presenter.getByRole('button', { name: '上一页', exact: true }).click();
    await presenter.locator(`[data-hd-presenter-notes="${first.pageId}"]`).waitFor();
    await presenter.getByRole('button', { name: '退出演示', exact: true }).click();
    await page.getByRole('button', { name: '演示', exact: true }).click();
    await presenter.waitFor();
    assert.equal(await presenter.locator('[data-hd-presenter-notes]').count(), 0);
    await presenter.getByRole('button', { name: '退出演示', exact: true }).click();
  });
  await check('explicit Git checkpoint commits only successful document saves', async () => {
    const before = git(['rev-parse', 'HEAD']);
    const result = await api('/checkpoint', { message: 'Verify document checkpoint' });
    assert.equal(result.status, 'committed', JSON.stringify(result));
    assert.equal(result.commit, git(['rev-parse', 'HEAD']));
    assert.notEqual(result.commit, before);
    assert.deepEqual(result.files.sort(), ['pages/evidence.page', 'pages/opening.page']);
    assert.equal(git(['status', '--porcelain=v1']), '');
  });
  await check('external file edits update the existing GUI', async () => {
    const file = path.join(deck, 'pages/opening.page');
    const source = await fs.readFile(file, 'utf8');
    await fs.writeFile(file, source.replace('人与 Agent，共用这一页。', '外部编辑，实时可见。'));
    await eventually(async () =>
      (await canvas.locator('[data-hd-element-id="title"]').innerText()).includes('实时可见'),
    );
  });
  await check('Git checkpoint defers after an external source change', async () => {
    const before = git(['rev-parse', 'HEAD']);
    const result = await api('/checkpoint', { message: 'Must not absorb external changes' });
    assert.equal(result.status, 'deferred');
    assert.equal(git(['rev-parse', 'HEAD']), before);
    assert.equal(git(['diff', '--cached', '--name-only']), '');
  });
  await check('same-path image changes refresh pixels without touching page YAML', async () => {
    const before = await api(`/pages/${first.pageId}`);
    const image = canvas.locator('[data-hd-element-id="main-figure"] img');
    const oldUrl = await image.getAttribute('src');
    await fs.copyFile(path.join(deck, 'media/detail.png'), path.join(deck, 'media/figure.png'));
    await eventually(async () => {
      const after = await api(`/pages/${first.pageId}`);
      return after.renderRevision !== before.renderRevision;
    });
    const after = await api(`/pages/${first.pageId}`);
    assert.equal(after.pageRevision, before.pageRevision);
    await eventually(
      async () =>
        (await image.getAttribute('src')) !== oldUrl &&
        (await image.evaluate((node) => node.complete && node.naturalWidth === 476)),
    );
  });
  await check(
    'MCP initializes, exposes eight tools and writes through the active session',
    async () => {
      mcp = new Client({ name: 'huandeng-verifier', version: '1.0.0' });
      await mcp.connect(
        new StdioClientTransport({
          command: process.execPath,
          args: [path.join(root, 'packages/core/huandeng.js'), '--url', url, 'mcp'],
          cwd: root,
          stderr: 'pipe',
        }),
      );
      const available = await mcp.listTools();
      assert.equal(available.tools.length, 8);
      const context = await mcp.callTool({ name: 'huandeng_context', arguments: {} });
      const parsed = JSON.parse(context.content.find((item) => item.type === 'text').text);
      assert.equal(parsed.deckId, session.deckId);
      const latest = await api(`/pages/${other.pageId}`);
      const result = await mcp.callTool({
        name: 'huandeng_apply',
        arguments: {
          transaction: {
            requestId: randomUUID(),
            deckId: session.deckId,
            actor: 'mcp-verification',
            expected: { pages: { [other.pageId]: latest.pageRevision } },
            operations: [
              {
                op: 'page.notes.set',
                pageId: other.pageId,
                text: 'Verified through Huandeng Plugin.',
              },
            ],
          },
        },
      });
      assert.notEqual(result.isError, true);
      assert.equal(
        (await api(`/pages/${other.pageId}`)).data.notes,
        'Verified through Huandeng Plugin.',
      );
    },
  );
  await check('PNG, editable PPTX and PDF export without source changes', async () => {
    const before = await sourceHashes();
    const png = await api('/render', { pageId: first.pageId });
    const pngBytes = Buffer.from(await (await fetch(url + png.url)).arrayBuffer());
    assert.equal(pngBytes.subarray(1, 4).toString(), 'PNG');
    await fs.writeFile(path.join(evidence, `render-${process.platform}.png`), pngBytes);
    const pptx = await api('/export', { format: 'pptx' });
    const pptxBytes = Buffer.from(await (await fetch(url + pptx.url)).arrayBuffer());
    const { unzipSync, strFromU8 } = require('fflate');
    const archive = unzipSync(pptxBytes);
    assert.match(strFromU8(archive['ppt/presentation.xml']), /cx="12192000"/);
    assert.match(strFromU8(archive['ppt/slides/slide1.xml']), /外部编辑，实时可见/);
    assert.equal(pptx.report.complete, true);
    const pdf = await api('/export', { format: 'pdf' });
    const pdfBytes = Buffer.from(await (await fetch(url + pdf.url)).arrayBuffer());
    assert.equal(pdfBytes.subarray(0, 4).toString(), '%PDF');
    assert.ok(pdfBytes.length > 3000);
    assert.deepEqual(await sourceHashes(), before);
    await fs.writeFile(path.join(evidence, `verified-${process.platform}.pptx`), pptxBytes);
    await fs.writeFile(path.join(evidence, `verified-${process.platform}.pdf`), pdfBytes);
  });
  await check('local API rejects cross-origin writes and asset path escape', async () => {
    const response = await fetch(`${url}/__pptd/transactions`, {
      method: 'POST',
      headers: { origin: 'https://untrusted.invalid', 'content-type': 'application/json' },
      body: '{}',
    });
    assert.equal(response.status, 403);
    await assert.rejects(api('/asset?path=../deck.pptd'));
  });
  await page.screenshot({
    path: path.join(evidence, `editor-${process.platform}.png`),
    fullPage: true,
  });
  assert.deepEqual(browserErrors, []);
  const report = {
    platform: process.platform,
    node: process.version,
    timestamp: new Date().toISOString(),
    entry,
    passed: true,
    checks: results,
    browserErrors,
  };
  await fs.writeFile(
    path.join(evidence, `integration-${process.platform}.json`),
    JSON.stringify(report, null, 2),
  );
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} catch (error) {
  const report = {
    platform: process.platform,
    passed: false,
    error: error.stack,
    checks: results,
    serverLog: log.join(''),
  };
  await fs.writeFile(
    path.join(evidence, `integration-${process.platform}.json`),
    JSON.stringify(report, null, 2),
  );
  process.stderr.write(`${JSON.stringify(report, null, 2)}\n`);
  process.exitCode = 1;
} finally {
  await mcp?.close().catch(() => {});
  await browser?.close();
  child.kill();
  await fs.writeFile(path.join(evidence, `server-${process.platform}.log`), log.join(''));
}
