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
const exe =
  process.env.HUANDENG_DESKTOP_EXE ??
  path.join(root, 'dist', 'HUANDENG-win32-x64', 'HUANDENG Editor.exe');
const sandbox = await fs.mkdtemp(path.join(os.tmpdir(), 'huandeng-science-e2e-'));
const deckRoot = path.join(sandbox, 'deck');
const entry = path.join(deckRoot, 'deck.pptd');
const outfile = path.join(root, '.verification', 'science-v03.png');
const evidencePath = path.join(deckRoot, 'pages', 'evidence.page');
const originalOpenPath = path.join(deckRoot, 'pages', 'opening.page');
let app;
let page;
const pageErrors = [];
async function eventually(test, limit = 35000) {
  const start = Date.now();
  while (Date.now() - start < limit) {
    try {
      const result = await test();
      if (result) return result;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('Timed out waiting for desktop scientific workflow.');
}
async function fileHash(p) {
  return createHash('sha256')
    .update(await fs.readFile(p))
    .digest('hex');
}
try {
  await fs.cp(path.join(root, 'tests/fixtures/studio'), deckRoot, { recursive: true });
  const source = await fs.readFile(evidencePath, 'utf8');
  const insertion = `${[
    '  - elementId: science-formula',
    '    elementType: text',
    '    bounds: [50, 80, 840, 55]',
    "    content: {text: '\\(E = mc^2\\)', fontSize: 27, color: '#122b61'}",
    '  - elementId: science-block-formula',
    '    elementType: text',
    '    bounds: [50, 148, 840, 58]',
    "    content: {text: '\\[\\frac{a}{b}=c\\]', fontSize: 26, color: '#122b61'}",
    '  - elementId: science-table',
    '    elementType: table',
    '    bounds: [52, 220, 680, 230]',
    '    columnWidths: [0.3333, 0.3333, 0.3334]',
    '    rowHeights: [0.45, 0.55]',
    '    rows:',
    '      - [{text: "Top merged", colSpan: 2, fill: "#dcebd9"}, {text: "Peer"}]',
    '      - [{text: "a"}, {text: "Cell original"}, {text: "c"}]',
  ].join('\n')}\n`;
  assert.ok(source.includes('\nnotes:'), 'source fixture missing notes marker');
  await fs.writeFile(evidencePath, source.replace('\nnotes:', `\n${insertion}notes:`));
  const originalOpenHash = await fileHash(originalOpenPath);
  const env = {
    ...process.env,
    HUANDENG_DESKTOP_DATA_DIR: path.join(sandbox, 'profile'),
    HUANDENG_RUNTIME_DIR: path.join(sandbox, 'runtime'),
  };
  delete env.ELECTRON_RUN_AS_NODE;
  app = await electron.launch({
    executablePath: exe,
    args: ['--entry', entry],
    cwd: root,
    env,
    timeout: 120000,
  });
  page = await app.firstWindow();
  const nativeTitle = await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()[0]?.getTitle(),
  );
  assert.ok(
    nativeTitle.startsWith('HUANDENG Editor'),
    'Window title must begin with the English product name',
  );
  assert.ok(!nativeTitle.includes('幻灯'), 'Product title must not use Chinese branding');
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.setDefaultTimeout(20000);
  await page.locator('[data-hd-editor-canvas]').waitFor({ timeout: 120000 });
  const context = await eventually(() => page.evaluate(() => window.huandengDesktop?.getContext()));
  const service = context.serviceUrl;
  const data = await (await fetch(`${service}/__pptd/session`)).json();
  const target = data.pages.find((item) => item.path.endsWith('evidence.page'));
  assert.ok(target, 'evidence page missing');
  await page.getByRole('button', { name: '页面缩略图', exact: true }).click();
  await page.locator(`[data-hd-thumbnail="${target.pageId}"]`).click();
  const table = page.locator('[data-hd-editor-canvas] [data-hd-table]').first();
  await table.waitFor();
  const merged = table.locator('[data-hd-table-cell="0:0"]');
  assert.equal(await merged.getAttribute('colspan'), '2');
  assert.equal(await table.locator('[data-hd-table-cell]').count(), 5);
  const formula = page.locator('[data-hd-editor-canvas] [data-hd-formula] math').first();
  await formula.waitFor();
  await page
    .locator(
      '[data-hd-editor-canvas] [data-hd-element-id="science-block-formula"] [data-hd-formula] math',
    )
    .waitFor();
  assert.ok(await formula.count(), 'MathML formula was not rendered');
  await page.locator('[data-hd-editor-canvas] [data-hd-element-id="science-table"]').click();
  const editor = page.getByLabel('R2 C2');
  await editor.waitFor();
  await editor.fill('Cell edited');
  await editor.press('Tab');
  await eventually(async () => (await fs.readFile(evidencePath, 'utf8')).includes('Cell edited'));
  // Finish the Inspector interaction before asking Electron to flush and close.
  await page.locator('[data-hd-editor-canvas] [data-hd-element-id="title"]').click();
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  assert.equal(
    await fileHash(originalOpenPath),
    originalOpenHash,
    'editing the table changed another slide',
  );
  assert.match(
    await fs.readFile(evidencePath, 'utf8'),
    /(?:"?colSpan"?):\s*2\b/,
    'merged cell span was lost',
  );
  assert.ok(
    (await fs.readFile(evidencePath, 'utf8')).includes('E = mc^2'),
    'LaTeX source text was lost',
  );
  for (const [format, route, payload] of [
    ['png', '/__pptd/render', { pageId: target.pageId }],
    ['pdf', '/__pptd/export', { format: 'pdf' }],
  ]) {
    const response = await fetch(service + route, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-huandeng-token': data.sessionToken },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    assert.ok(response.ok, `Export ${format} rejected: ${JSON.stringify(result)}`);
    assert.ok(result.file, `Export ${format} did not return file`);
    const bytes = await fs.readFile(result.file);
    assert.ok(bytes.length > 100, `Export ${format} was empty`);
    assert.equal(bytes.subarray(0, 4).toString('hex'), format === 'pdf' ? '25504446' : '89504e47');
    console.log('EXPORT_PASS', format, bytes.length, result.file);
  }
  await page.screenshot({ path: outfile, fullPage: true });
  assert.deepEqual(pageErrors, []);
  console.log(
    JSON.stringify(
      {
        passed: true,
        checks: [
          'table-grid-5-cells-and-merged-owner',
          'formula-mathml',
          'block-formula-mathml',
          'editable-cell-preserves-merges',
          'latex-source-preserved',
          'other-slide-bytes-unchanged',
          'png-export-signature',
          'pdf-export-signature',
        ],
        screenshot: outfile,
        rendererErrors: pageErrors,
      },
      null,
      2,
    ),
  );
} catch (error) {
  if (page)
    await page
      .screenshot({ path: path.join(root, '.verification', 'science-v03-failure.png') })
      .catch(() => {});
  console.error(error);
  process.exitCode = 1;
} finally {
  await app?.close().catch(() => {});
}
