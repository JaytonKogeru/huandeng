import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { scientificReleaseSvg } from './release-science-fixture.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(root, 'packages/core/package.json'));
const { _electron: electron } = require('playwright');
const { unzipSync, strFromU8 } = require('fflate');
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');
const execute = promisify(execFile);
const executable = path.resolve(process.argv[2] ?? process.env.HUANDENG_DESKTOP_EXE ?? '');
assert.equal(process.platform, 'win32', 'This acceptance requires native Windows.');
assert.match(executable, /\.exe$/i, 'Pass the packaged HUANDENG executable.');
const applicationDirectory = path.dirname(executable);
const core = path.join(applicationDirectory, 'resources/app/node_modules/@open-slide/core');
const cliFile = path.join(core, 'huandeng.js');
const build = JSON.parse(
  await fs.readFile(path.join(applicationDirectory, 'huandeng-build.json'), 'utf8'),
);
assert.equal(build.product, 'HUANDENG Editor');
assert.equal(build.desktopProtocol, 2);
const evidence = path.join(root, '.verification', `windows-release-${randomUUID()}`);
await fs.mkdir(evidence, { recursive: true });
const profile = path.join(evidence, 'profile');
const runtime = path.join(evidence, 'runtime');
const environment = {
  ...process.env,
  HUANDENG_DESKTOP_DATA_DIR: profile,
  HUANDENG_RUNTIME_DIR: runtime,
};
delete environment.ELECTRON_RUN_AS_NODE;
delete environment.HUANDENG_URL;
delete environment.HUANDENG_DEV_SERVER;
const nodeEnvironment = { ...environment, ELECTRON_RUN_AS_NODE: '1' };
const checks = [];
let application;
let page;
let entry;
const report = {
  passed: false,
  productVersion: build.productVersion,
  sourceRevision: build.sourceRevision,
  checks,
};

async function cli(...arguments_) {
  const { stdout } = await execute(executable, [cliFile, ...arguments_], {
    cwd: evidence,
    env: nodeEnvironment,
    windowsHide: true,
    timeout: 90000,
    maxBuffer: 8 * 1024 * 1024,
  });
  return JSON.parse(stdout);
}
const activeCli = (...arguments_) => cli('--entry', entry, ...arguments_);

async function until(read, accepts, message, timeout = 30000) {
  const deadline = Date.now() + timeout;
  let value;
  while (Date.now() < deadline) {
    value = await read();
    if (accepts(value)) return value;
    await delay(150);
  }
  throw new Error(message);
}

async function editor(targetEntry = entry) {
  return until(
    async () => {
      for (const candidate of application.context().pages()) {
        if (!/^http:\/\/127\.0\.0\.1:\d+\/huandeng(?:[/?#]|$)/.test(candidate.url())) continue;
        const context = await candidate
          .evaluate(() => window.huandengDesktop.getContext())
          .catch(() => null);
        if (context?.entryPath === targetEntry) return candidate;
      }
    },
    Boolean,
    'The requested native Editor view did not open.',
    45000,
  );
}

async function start() {
  application = await electron.launch({
    executablePath: executable,
    args: ['--entry', entry],
    cwd: evidence,
    env: environment,
    timeout: 45000,
  });
  application.context().setDefaultTimeout(15000);
  page = await editor();
  await page.locator('[data-hd-editor-canvas]').waitFor({ state: 'visible' });
  const versions = await application.evaluate(() => ({
    electron: process.versions.electron,
    node: process.versions.node,
  }));
  assert.equal(versions.electron, build.electronVersion);
  report.runtime = versions;
}

async function close() {
  const current = application;
  if (!current) return;
  await current.close();
  application = undefined;
}

async function apply(operations) {
  const snapshot = await activeCli('inspect');
  const transaction = {
    requestId: randomUUID(),
    actor: 'windows-release-smoke',
    deckId: snapshot.deckId,
    expected: {
      pages: Object.fromEntries(snapshot.pages.map((slide) => [slide.pageId, slide.pageRevision])),
      manifest: snapshot.manifestRevision,
      metadata: snapshot.metadataRevision,
    },
    operations,
  };
  const file = path.join(evidence, `${transaction.requestId}.json`);
  await fs.writeFile(file, JSON.stringify(transaction));
  const preview = await activeCli('preview', file);
  assert.equal(preview.ok, true);
  const result = await activeCli('apply', file, '--preview-hash', preview.previewHash);
  assert.equal(result.ok, true);
  const duplicate = await activeCli('apply', file, '--preview-hash', preview.previewHash);
  assert.equal(duplicate.operationId, result.operationId);
  return result;
}

try {
  const project = await cli(
    'init',
    path.join(evidence, 'Synthetic science 验收'),
    '--title',
    'Scientific release acceptance',
  );
  entry = project.entry;
  const scienceSvg = await scientificReleaseSvg(core);
  await fs.writeFile(path.join(project.root, 'media/science.svg'), scienceSvg);
  await fs.writeFile(
    path.join(project.root, 'media/pixel.png'),
    Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aA1cAAAAASUVORK5CYII=',
      'base64',
    ),
  );
  await start();
  checks.push('The relocated native package opens a self-contained Unicode/space Project.');
  const snapshot = await activeCli('inspect');
  assert.equal(snapshot.pages.length, 1);
  const pageId = snapshot.pages[0].pageId;
  const context = await page.evaluate(() => window.huandengDesktop.getContext());
  assert.equal((await fetch(`${context.serviceUrl}/__pptd/health`)).status, 200);
  assert.ok([401, 403].includes((await fetch(`${context.serviceUrl}/__pptd/session`)).status));
  checks.push('Protocol 2 CLI authenticates; anonymous session reads are denied.');
  const elements = [
    {
      elementId: 'smoke-title',
      elementType: 'text',
      bounds: [35, 20, 860, 60],
      content: {
        text: 'Scientific release acceptance',
        fontSize: 30,
        fontFamily: 'Arial',
        bold: true,
      },
    },
    {
      elementId: 'smoke-equation',
      elementType: 'text',
      bounds: [35, 85, 850, 70],
      content: { text: '<p>Editable equation: \\(E = mc^2 + \\frac{1}{2}\\)</p>', fontSize: 24 },
    },
    {
      elementId: 'smoke-chart',
      elementType: 'chart',
      bounds: [35, 190, 480, 285],
      title: 'Synthetic measurements',
      data: {
        cols: ['sample', 'value'],
        rows: [
          ['A', 0],
          ['B', 4],
          ['C', -1],
        ],
      },
      series: [{ type: 'bar', name: 'Value', encode: { x: 'sample', y: 'value' } }],
    },
    {
      elementId: 'smoke-svg',
      elementType: 'image',
      bounds: [550, 190, 360, 200],
      src: 'media/science.svg',
    },
    {
      elementId: 'smoke-embedded-svg',
      elementType: 'image',
      bounds: [550, 405, 140, 80],
      src: `data:image/svg+xml;base64,${Buffer.from(scienceSvg).toString('base64')}`,
    },
    {
      elementId: 'smoke-png',
      elementType: 'image',
      bounds: [695, 405, 20, 20],
      src: 'media/pixel.png',
    },
    {
      elementId: 'smoke-shape',
      elementType: 'shape',
      shapeName: 'hexagon',
      bounds: [730, 405, 100, 80],
      fill: { type: 'solid', color: '#b8d5c9' },
    },
  ];
  const receipt = await apply([
    {
      op: 'page.notes.set',
      pageId,
      text: 'Synthetic data only. Original media and editable equations must survive packaging.',
    },
    ...elements.map((element) => ({ op: 'element.add', pageId, element })),
  ]);
  assert.ok(receipt.operationId);
  await page.locator('[data-hd-editor-canvas] .katex').first().waitFor({ state: 'visible' });
  await page.waitForFunction(() => {
    const images = [...document.querySelectorAll('[data-hd-editor-canvas] img')];
    return images.length >= 3 && images.every((image) => image.complete && image.naturalWidth > 0);
  });
  await page.evaluate(async () => document.fonts.ready);
  checks.push(
    'Packaged CLI preview/apply is idempotent; formula, chart, PNG and scientific file/data SVG with clips, masks, filters and an embedded font render.',
  );
  const shape = page.locator('[data-hd-editor-canvas] [data-hd-element-id="smoke-shape"]');
  await shape.click();
  await page.keyboard.press('Delete');
  const hasShape = async () =>
    (await activeCli('inspect', pageId)).data.elements.some(
      (element) => element.elementId === 'smoke-shape',
    );
  await until(hasShape, (value) => !value, 'UI Delete was not saved.');
  await page.keyboard.press('Control+z');
  await until(hasShape, Boolean, 'UI Undo was not saved.');
  await page.keyboard.press('Control+y');
  await until(hasShape, (value) => !value, 'UI Redo was not saved.');
  await page.keyboard.press('Control+z');
  await until(hasShape, Boolean, 'The final undo was not saved.');
  checks.push('Native keyboard editing, durable save, Undo and Redo succeed.');
  await page.screenshot({ path: path.join(evidence, 'science-editor.png') });
  const configuration = await page.evaluate(() =>
    window.huandengDesktop.getAgentConfiguration('chatgpt'),
  );
  assert.ok(configuration.pluginPath.startsWith(applicationDirectory));
  const connection = JSON.parse(configuration.configuration);
  assert.equal(connection.environment.HUANDENG_ENTRY, entry);
  assert.equal(connection.arguments.context[0], cliFile);
  assert.equal(connection.command, executable);
  checks.push('Agent setup resolves the relocated package and the selected Project.');

  const transport = new StdioClientTransport({
    command: executable,
    args: [cliFile, '--entry', entry, 'mcp'],
    env: nodeEnvironment,
    stderr: 'pipe',
    cwd: evidence,
  });
  const client = new Client(
    { name: 'windows-release-smoke', version: '1.0.0' },
    { capabilities: {} },
  );
  try {
    await client.connect(transport);
    assert.ok((await client.listTools()).tools.some((tool) => tool.name === 'huandeng_context'));
    const result = await client.callTool({ name: 'huandeng_context', arguments: {} });
    assert.notEqual(result.isError, true);
    const text = result.content
      .filter((item) => item.type === 'text')
      .map((item) => item.text)
      .join('\n');
    assert.ok(text.includes(snapshot.deckId));
  } finally {
    await client.close();
  }
  checks.push('The bundled MCP stdio server connects and reads the exact Project.');

  report.exports = {};
  for (const format of ['pdf', 'pptx']) {
    const exported = await activeCli('export', format);
    assert.ok(exported.file, 'The export did not return its saved artifact.');
    const bytes = await fs.readFile(exported.file);
    assert.ok(bytes.length > 1000);
    if (format === 'pdf') assert.equal(bytes.subarray(0, 5).toString(), '%PDF-');
    else {
      const files = unzipSync(bytes);
      const slide = strFromU8(files['ppt/slides/slide1.xml']);
      assert.match(slide, /<m:oMath/);
      assert.match(slide, /<c:chart/);
      assert.ok(Object.keys(files).some((name) => name.startsWith('ppt/media/')));
      assert.ok(Object.keys(files).some((name) => name.endsWith('.xlsx')));
    }
    await fs.copyFile(exported.file, path.join(evidence, `science.${format}`));
    report.exports[format] = { bytes: bytes.length, fileName: exported.fileName };
  }
  checks.push(
    'PDF and PPTX export succeed; PPTX retains editable Office math and a chart workbook.',
  );

  await application.evaluate(({ dialog }, directory) => {
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [directory] });
  }, evidence);
  await page.evaluate(() => {
    void window.huandengDesktop.newProject();
  });
  let modal = await until(
    () =>
      Promise.resolve(
        application
          .context()
          .pages()
          .find((candidate) => candidate.url().endsWith('/new-project.html')),
      ),
    Boolean,
    'New Project dialog did not open.',
  );
  await modal.locator('#project-name').fill('Cancelled project');
  await modal.locator('#browse').click();
  await modal.locator('#cancel').click();
  assert.equal(
    await fs.access(path.join(evidence, 'Cancelled project')).then(
      () => true,
      () => false,
    ),
    false,
  );
  await page.evaluate(() => {
    void window.huandengDesktop.newProject();
  });
  modal = await until(
    () =>
      Promise.resolve(
        application
          .context()
          .pages()
          .find((candidate) => candidate.url().endsWith('/new-project.html')),
      ),
    Boolean,
    'New Project dialog did not reopen.',
  );
  await modal.locator('#browse').click();
  await modal.locator('#project-name').fill('Native practice 练习');
  await modal.locator('input[value="guide"]').check();
  await modal.locator('#create').waitFor({ state: 'visible' });
  const nativeEntry = await until(
    () => modal.locator('#destination').textContent(),
    (value) => value?.includes('Native practice 练习'),
    'New Project destination was not updated.',
  );
  await modal.locator('#create').click();
  const practice = await editor(nativeEntry);
  await practice.locator('[data-hd-editor-canvas]').waitFor({ state: 'visible' });
  assert.equal((await cli('--entry', nativeEntry, 'inspect')).pages.length, 3);
  await practice.evaluate((target) => window.huandengDesktop.openRecent(target), entry);
  page = await editor();
  checks.push(
    'Native New Project cancel preserves the folder; the practice option creates three editable slides.',
  );

  await close();
  await start();
  const reopened = await activeCli('inspect', pageId);
  assert.equal(
    reopened.data.notes,
    'Synthetic data only. Original media and editable equations must survive packaging.',
  );
  assert.equal(reopened.data.elements.length, elements.length);
  assert.ok(reopened.data.elements.some((element) => element.elementId === 'smoke-shape'));
  checks.push('Normal close and reopen retain the saved page, notes and original assets.');
  await close();
  report.passed = true;
} catch (error) {
  report.error = String(error.message ?? error);
  if (page && !page.isClosed())
    await page.screenshot({ path: path.join(evidence, 'failure.png') }).catch(() => {});
  throw error;
} finally {
  await close().catch(() => {});
  await fs.writeFile(path.join(evidence, 'result.json'), `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(
    `${JSON.stringify({ passed: report.passed, evidence, checks: checks.length })}\n`,
  );
}
