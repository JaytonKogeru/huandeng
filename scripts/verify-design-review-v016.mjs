// biome-ignore-all lint/suspicious/noUndeclaredEnvVars: Acceptance selects an isolated executable and profile.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createVisualReviewFixture } from './visual-review-fixture.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(root, 'packages/core/package.json'));
const { _electron: electron } = require('playwright');
const YAML = require('yaml');
const executablePath = process.env.HUANDENG_DESKTOP_EXE;
assert.ok(executablePath, 'Set HUANDENG_DESKTOP_EXE to the isolated candidate.');
const fixture = await createVisualReviewFixture(root, require, 'v016-design-');
const { directory, projectRoot, profile, evidence, entry, ids, pagePaths } = fixture;
const sourcePath = path.join(projectRoot, pagePaths[0]);
const source = YAML.parse(await fs.readFile(sourcePath, 'utf8'));
source.elements[0].bounds = [70, 35, 810, 65];
source.elements[0].content = {
  text: 'Captured reference 原文',
  fontSize: 38,
  fontFamily: 'Arial',
  color: '#123456',
  bold: true,
};
await fs.writeFile(sourcePath, YAML.stringify(source));
const env = {
  ...process.env,
  HUANDENG_DESKTOP_DATA_DIR: profile,
  HUANDENG_RUNTIME_DIR: path.join(directory, 'runtime'),
};
delete env.ELECTRON_RUN_AS_NODE;
const checks = [];
const screenshots = [];
const rendererErrors = [];
const rendererReads = [];
let app;
let page;
let context;
let token;
let failure;
let processLog = '';

async function eventually(read, timeout = 30000) {
  const end = Date.now() + timeout;
  let last;
  while (Date.now() < end) {
    try {
      if (await read()) return;
    } catch (error) {
      last = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 80));
  }
  throw last ?? new Error('Timed out waiting for design/review state.');
}
async function check(name, action) {
  try {
    await action();
    checks.push({ name, passed: true });
    process.stdout.write(`PASS ${name}\n`);
  } catch (error) {
    checks.push({ name, passed: false, error: String(error) });
    throw error;
  }
}
async function api(route, body) {
  const response = await fetch(`${context.serviceUrl}/__pptd${route}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'content-type': 'application/json', 'x-huandeng-token': token },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  });
  const result = await response.json();
  assert.ok(response.ok && result.ok !== false, JSON.stringify(result));
  return result;
}
async function apply(operations) {
  const snapshot = await api('/current');
  return api('/transactions', {
    requestId: randomUUID(),
    deckId: snapshot.deckId,
    actor: 'Synthetic design acceptance',
    expected: {
      pages: Object.fromEntries(snapshot.pages.map((p) => [p.pageId, p.pageRevision])),
      manifest: snapshot.manifestRevision,
      metadata: snapshot.metadataRevision,
    },
    operations,
  });
}
async function capture(name) {
  await page.screenshot({ path: path.join(evidence, `${name}.png`), animations: 'disabled' });
  screenshots.push(name);
}
async function locale(value) {
  await page.evaluate((v) => window.huandengDesktop.setLocale(v), value);
  await eventually(() => page.evaluate((v) => document.documentElement.lang === v, value));
}
async function bytes() {
  return Promise.all(
    [
      entry,
      ...pagePaths.map((file) => path.join(projectRoot, file)),
      path.join(projectRoot, '.huandeng/project.json'),
    ].map((file) => fs.readFile(file, 'utf8')),
  );
}
async function reviewState(value) {
  await eventually(
    async () =>
      (await page
        .locator('[data-hd-author-review-state]')
        .getAttribute('data-hd-author-review-state')) === value,
  );
}
async function recordSyntheticReview(renderRevision) {
  const file = path.join(projectRoot, '.huandeng/project.json');
  const metadata = JSON.parse(await fs.readFile(file, 'utf8'));
  metadata.slides[ids[1]].lastAuthorReview = renderRevision
    ? { renderRevision, legacy: 'Synthetic pre-existing record' }
    : { legacy: 'Synthetic record without revision' };
  await fs.writeFile(file, `${JSON.stringify(metadata, null, 2)}\n`);
}

try {
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
  for (const output of [app.process().stdout, app.process().stderr])
    output?.on('data', (chunk) => {
      processLog = `${processLog}${chunk}`.slice(-24000);
    });
  await eventually(async () => {
    page = app
      .context()
      .pages()
      .find((p) => p.url().includes('/huandeng'));
    return !!page;
  }, 120000);
  page.on('pageerror', (error) => rendererErrors.push(error.message));
  page.on('request', (request) => {
    const pathname = new URL(request.url()).pathname;
    if (pathname === '/__pptd/session' || pathname === '/__pptd/current')
      rendererReads.push(pathname);
  });
  page.setDefaultTimeout(20000);
  await page.locator('[data-hd-editor-canvas]').waitFor({ timeout: 60000 });
  await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()[0].setContentSize(1600, 1000),
  );
  await locale('en');
  context = await page.evaluate(() => window.huandengDesktop.getContext());
  token = (await fetch(`${context.serviceUrl}/__pptd/session`).then((r) => r.json())).sessionToken;
  await page.locator(`[data-hd-thumbnail="${ids[1]}"]`).click();
  await page.getByRole('tab', { name: 'Layout', exact: true }).click();
  await page.getByText('Match title style', { exact: true }).first().click();
  const panel = page.locator('[data-hd-title-layout]');
  const preview = page.locator('[data-hd-title-preview]');
  const before = await api('/current');
  const target = before.pages.find((p) => p.pageId === ids[1]);

  await check('Reference capture and full target preview perform no write', async () => {
    const original = await bytes();
    await panel.locator('[data-hd-title-reference-page]').selectOption(ids[0]);
    await panel.locator('[data-hd-title-reference-object]').selectOption('title');
    await panel.locator('[data-hd-title-target-object]').selectOption('title');
    assert.equal(await panel.locator('[data-hd-title-apply]').isDisabled(), true);
    assert.match(await panel.locator('[data-hd-title-captured-values]').innerText(), /38/);
    await panel.locator('[data-hd-title-preview-open]').click();
    await preview.locator('[data-hd-element-id="title"]').waitFor();
    assert.equal(await preview.getAttribute('data-hd-title-preview'), 'current');
    assert.equal(
      await preview.locator('[data-hd-element-id]').count(),
      target.data.elements.length,
    );
    assert.match(await preview.innerText(), /Two sources, one comparison/);
    assert.deepEqual(await bytes(), original);
    await capture('title-preview-en');
  });

  await check(
    'Apply saves prepared geometry and expected revisions; Undo restores target bytes',
    async () => {
      const original = await fs.readFile(path.join(projectRoot, pagePaths[1]), 'utf8');
      const geometry = await preview.locator('[data-hd-element-id]').evaluateAll((elements) =>
        elements.map((element) => ({
          id: element.getAttribute('data-hd-element-id'),
          bounds: ['left', 'top', 'width', 'height'].map((key) =>
            Number.parseFloat(element.style[key]),
          ),
        })),
      );
      const response = page.waitForResponse(
        (r) => r.url().endsWith('/__pptd/transactions') && r.request().method() === 'POST',
      );
      await page.locator('[data-hd-title-apply]').last().click();
      const received = await response;
      const request = received.request().postDataJSON();
      assert.equal((await received.json()).ok, true);
      assert.equal(request.expected.manifest, before.manifestRevision);
      assert.equal(request.expected.metadata, before.metadataRevision);
      assert.equal(request.operations.length, 1);
      assert.deepEqual(request.operations[0].set.bounds, [70, 35, 810, 65]);
      assert.equal(request.operations[0].set['content.fontSize'], 38);
      assert.equal(request.operations[0].set['content.color'], '#123456');
      const saved = (await api('/current')).pages.find((p) => p.pageId === ids[1]);
      assert.deepEqual(
        saved.data.elements.map((element) => ({ id: element.elementId, bounds: element.bounds })),
        geometry,
      );
      assert.equal(saved.data.elements[0].content.text, target.data.elements[0].content.text);
      assert.deepEqual(saved.data.elements.slice(1), target.data.elements.slice(1));
      assert.equal(saved.data.notes, target.data.notes);
      await page.getByRole('button', { name: 'Undo', exact: true }).click();
      await eventually(
        async () => (await fs.readFile(path.join(projectRoot, pagePaths[1]), 'utf8')) === original,
      );
    },
  );

  await check(
    'External target edit uses current through SSE and invalidates the visible preview',
    async () => {
      await panel.locator('[data-hd-title-preview-open]').click();
      await preview.locator('[data-hd-element-id="title"]').waitFor();
      await page.waitForTimeout(400);
      rendererReads.length = 0;
      await apply([
        {
          op: 'element.patch',
          pageId: ids[1],
          elementId: 'existing-note',
          set: { 'content.text': 'Contiguous external target edit' },
        },
      ]);
      await eventually(
        async () => (await preview.getAttribute('data-hd-title-preview')) === 'stale',
      );
      await eventually(async () =>
        (await page.locator('[data-hd-editor-canvas]').innerText()).includes(
          'Contiguous external target edit',
        ),
      );
      assert.ok(rendererReads.includes('/__pptd/current'), JSON.stringify(rendererReads));
      assert.equal(
        rendererReads.filter((url) => url === '/__pptd/session').length,
        0,
        JSON.stringify(rendererReads),
      );
      assert.equal(await page.locator('[data-hd-title-apply]').last().isDisabled(), true);
      await capture('title-preview-stale-en');
      await page.keyboard.press('Escape');
    },
  );

  await check('Reference edits retain captured values and expose stale indication', async () => {
    await apply([
      { op: 'element.patch', pageId: ids[0], elementId: 'title', set: { 'content.fontSize': 22 } },
    ]);
    await eventually(
      async () =>
        (await panel
          .locator('[data-hd-title-reference-state]')
          .getAttribute('data-hd-title-reference-state')) === 'stale',
    );
    assert.match(await panel.locator('[data-hd-title-captured-values]').innerText(), /38/);
    await locale('zh-CN');
    assert.match(await panel.innerText(), /参考已改变/);
    await capture('reference-stale-zh');
    await locale('en');
    await panel.getByRole('button', { name: 'Refresh reference style', exact: true }).click();
    assert.match(await panel.locator('[data-hd-title-captured-values]').innerText(), /22/);
    assert.equal(await panel.locator('[data-hd-title-apply]').isDisabled(), true);
  });

  await check(
    'Checks distinguishes saved and pending artwork across review states and languages',
    async () => {
      await page.getByRole('tab', { name: 'Checks', exact: true }).click();
      await reviewState('unverified');
      await capture('review-unverified-en');
      const current = (await api('/current')).pages.find((p) => p.pageId === ids[1]);
      await recordSyntheticReview(current.renderRevision);
      await reviewState('current');
      const evidencePanel = page.locator('[data-hd-author-review-state]');
      assert.match(await evidencePanel.innerText(), /Version match only/);
      assert.match(await evidencePanel.innerText(), /Occurrence order, notes and pinned versions/);
      await capture('review-current-en');
      await page.getByRole('tab', { name: 'Layers', exact: true }).click();
      await page.locator('[data-hd-layer="title"]').click();
      await page.getByRole('tab', { name: 'Checks', exact: true }).click();
      let release;
      const held = new Promise((resolve) => {
        release = resolve;
      });
      const routedTransactions = [];
      const holdTransaction = (route) => {
        const continuation = held.then(() => route.continue());
        routedTransactions.push(continuation);
        return continuation;
      };
      await page.route('**/__pptd/transactions', holdTransaction);
      try {
        await page.locator('[data-hd-editor-canvas]').focus();
        await page.keyboard.press('Delete');
        await reviewState('projected');
        assert.equal(
          await evidencePanel.getAttribute('data-hd-author-review-saved-state'),
          'current',
        );
        assert.match(await evidencePanel.innerText(), /Unsaved or pending artwork/);
        assert.doesNotMatch(await evidencePanel.innerText(), /Recorded version matches/);
        assert.equal(
          await page.locator('[data-hd-editor-canvas] [data-hd-element-id="title"]').count(),
          0,
        );
        assert.ok(
          (await api('/current')).pages
            .find((p) => p.pageId === ids[1])
            .data.elements.some((element) => element.elementId === 'title'),
        );
        await capture('review-projected-en');
        await locale('zh-CN');
        assert.match(await evidencePanel.innerText(), /审阅证据仅适用于已保存的基础版本/);
        await capture('review-projected-zh');
      } finally {
        release();
        await Promise.all(routedTransactions);
        await page.unroute('**/__pptd/transactions', holdTransaction);
      }
      await reviewState('stale');
      await locale('en');
      await page.getByRole('button', { name: 'Undo', exact: true }).click();
      await reviewState('current');
      await capture('review-restored-after-undo-en');
      await apply([
        {
          op: 'element.patch',
          pageId: ids[1],
          elementId: 'title',
          set: { 'content.fontSize': 27 },
        },
      ]);
      await reviewState('stale');
      await locale('zh-CN');
      assert.match(await evidencePanel.innerText(), /仅核对版本/);
      assert.match(await evidencePanel.innerText(), /放映顺序、演讲备注及固定版本/);
      await capture('review-stale-zh');
      await recordSyntheticReview(null);
      await reviewState('unverified');
      await capture('review-unverified-zh');
    },
  );
  await check('No renderer exceptions', async () => assert.deepEqual(rendererErrors, []));
} catch (error) {
  failure = error;
  process.stderr.write(`${error.stack ?? error}\n`);
  if (page) await page.screenshot({ path: path.join(evidence, 'failure.png') }).catch(() => {});
} finally {
  if (app) await app.close().catch(() => {});
  await fs.writeFile(path.join(evidence, 'process.log'), processLog);
  await fs.writeFile(
    path.join(evidence, 'report.json'),
    JSON.stringify(
      {
        passed: !failure,
        executablePath,
        fixture: directory,
        checks,
        screenshots,
        rendererErrors,
        rendererReads,
        error: failure ? String(failure) : undefined,
      },
      null,
      2,
    ),
  );
  process.stdout.write(
    `${JSON.stringify({ passed: !failure, checks: checks.length, evidence })}\n`,
  );
  if (failure) process.exitCode = 1;
}
