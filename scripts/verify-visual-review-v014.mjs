// biome-ignore-all lint/suspicious/noUndeclaredEnvVars: Candidate executable and app are explicitly supplied for isolated acceptance.
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { createVisualReviewFixture } from './visual-review-fixture.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(root, 'packages/core/package.json'));
const { _electron: electron } = require('playwright');
const executablePath = process.env.HUANDENG_DESKTOP_EXE;
assert.ok(executablePath, 'Set HUANDENG_DESKTOP_EXE to the candidate executable.');
const fixture = await createVisualReviewFixture(root, require);
const { directory, projectRoot, profile, evidence, entry, ids } = fixture;
const env = {
  ...process.env,
  HUANDENG_DESKTOP_DATA_DIR: profile,
  HUANDENG_RUNTIME_DIR: path.join(directory, 'runtime'),
};
delete env.ELECTRON_RUN_AS_NODE;
const checks = [];
const screenshots = [];
const rendererErrors = [];
let app;
let page;
let shell;
let failure;
let processLog = '';
let operationId;
let newObjectId;
let pinnedVersionId;
const sourceHashes = new Map();
const siblingHashes = new Map();
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
for (const name of ['source-a.svg', 'source-b.svg'])
  sourceHashes.set(name, hash(await fs.readFile(path.join(projectRoot, 'assets', name))));
for (const name of [fixture.pagePaths[0], fixture.pagePaths[2]])
  siblingHashes.set(name, hash(await fs.readFile(path.join(projectRoot, name))));
async function eventually(read, timeout = 30000) {
  const end = Date.now() + timeout;
  let last;
  while (Date.now() < end) {
    try {
      const result = await read();
      if (result) return result;
    } catch (error) {
      last = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 80));
  }
  throw last ?? new Error('Timed out waiting for visual review UI.');
}
async function check(name, action) {
  const started = Date.now();
  try {
    await action();
    checks.push({ name, passed: true, milliseconds: Date.now() - started });
    process.stdout.write(`PASS ${name}\n`);
  } catch (error) {
    checks.push({ name, passed: false, error: String(error) });
    throw error;
  }
}
async function api(route, body) {
  const context = await page.evaluate(() => window.huandengDesktop.getContext());
  const session = await fetch(`${context.serviceUrl}/__pptd/session`).then((r) => r.json());
  const response = await fetch(`${context.serviceUrl}/__pptd${route}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'content-type': 'application/json', 'x-huandeng-token': session.sessionToken },
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
    actor: 'synthetic-review-agent',
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
  const width = await shell.evaluate(() => window.innerWidth);
  await shell.screenshot({
    path: path.join(evidence, `${name}-project-strip.png`),
    clip: { x: 0, y: 0, width, height: 42 },
  });
  screenshots.push(name);
}
async function setSize(width, height) {
  await app.evaluate(
    ({ BrowserWindow }, size) => BrowserWindow.getAllWindows()[0].setContentSize(...size),
    [width, height],
  );
  await eventually(() => page.evaluate((w) => window.innerWidth === w, width));
}
async function setLocale(locale) {
  await page.evaluate((value) => window.huandengDesktop.setLocale(value), locale);
  await eventually(() => page.evaluate((value) => document.documentElement.lang === value, locale));
}
async function assertFit(locator) {
  const failures = await locator.evaluateAll((elements) =>
    elements
      .filter((e) => {
        const r = e.getBoundingClientRect();
        return (
          r.width > 0 &&
          r.height > 0 &&
          (r.left < -1 || r.top < -1 || r.right > innerWidth + 1 || r.bottom > innerHeight + 1)
        );
      })
      .map((e) => ({
        text: e.textContent?.slice(0, 80),
        tag: e.tagName,
        rect: e.getBoundingClientRect().toJSON(),
      })),
  );
  assert.deepEqual(failures, [], 'Primary controls fit the viewport');
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
  const observe = (candidate) =>
    candidate.on('pageerror', (error) => rendererErrors.push(error.message));
  app.context().on('page', observe);
  for (const candidate of app.context().pages()) observe(candidate);
  shell = await eventually(() =>
    app
      .context()
      .pages()
      .find((p) => p.url().endsWith('/workspace-shell.html')),
  );
  page = await eventually(
    () =>
      app
        .context()
        .pages()
        .find((p) => p.url().includes('/huandeng')),
    120000,
  );
  page.setDefaultTimeout(20000);
  await page.locator('[data-hd-editor-canvas]').waitFor({ timeout: 60000 });
  await setSize(1600, 1000);
  await setLocale('en');
  await page.locator(`[data-hd-thumbnail="${ids[1]}"]`).click();

  await check('Real checkpoint and repeated live/pinned references establish scope', async () => {
    const before = await api('/current');
    const target = before.pages.find((p) => p.pageId === ids[1]);
    const version = await api(`/pages/${ids[1]}/checkpoints`, {
      pageId: ids[1],
      requestId: randomUUID(),
      label: 'Synthetic baseline',
      expectedPageRevision: target.pageRevision,
      expectedMetadataRevision: before.metadataRevision,
      actor: 'synthetic-review-agent',
    });
    pinnedVersionId = version.versionId;
    const project = structuredClone((await api('/current')).metadata.project);
    project.presentations[0].items.push({
      id: 'pinned-baseline',
      kind: 'page',
      pageId: ids[1],
      versionId: pinnedVersionId,
    });
    await apply([{ op: 'project.replace', project }]);
    await eventually(async () =>
      /Live references: 2.*Pinned references: 1/.test(
        await page.locator('[data-hd-page-scope]').innerText(),
      ),
    );
  });

  await check(
    'Visual source selection and composed preview do not write; Add saves the exact visible geometry',
    async () => {
      const before = await api('/current');
      const base = before.pages.find((p) => p.pageId === ids[1]);
      await page.getByRole('tab', { name: 'Layout', exact: true }).click();
      await page.locator('[data-hd-layout-recipe="two-evidence-figures"]').click();
      for (const [slot, source] of [
        ['left', 'source-a.svg'],
        ['right', 'source-b.svg'],
      ]) {
        await page.locator(`[data-hd-layout-source="${slot}"]`).click();
        await page.locator(`[data-hd-layout-asset="assets/${source}"]`).click();
      }
      await page
        .locator('[data-hd-layout-caption="leftCaption"]')
        .fill('Source A · original labels');
      await page
        .locator('[data-hd-layout-caption="rightCaption"]')
        .fill('Source B · original labels');
      await page.locator('[data-hd-layout-preview-open]').click();
      const preview = page.locator('[data-hd-layout-preview]');
      await preview.waitFor();
      assert.equal(
        await preview.locator('[data-hd-element-id]').count(),
        base.data.elements.length + 4,
      );
      assert.equal(await preview.locator('[data-hd-element-id="existing-note"]').count(), 1);
      const geometry = await preview.locator('[data-hd-element-id]').evaluateAll((elements) =>
        elements.map((e) => ({
          id: e.getAttribute('data-hd-element-id'),
          bounds: ['left', 'top', 'width', 'height'].map((key) => Number.parseFloat(e.style[key])),
        })),
      );
      const unchanged = await api('/current');
      assert.equal(unchanged.metadataRevision, before.metadataRevision);
      assert.equal(
        unchanged.pages.find((p) => p.pageId === ids[1]).pageRevision,
        base.pageRevision,
      );
      await capture('layout-preview-1600-en');
      const response = page.waitForResponse(
        (r) => r.url().endsWith('/__pptd/transactions') && r.request().method() === 'POST',
      );
      await page.locator('[data-hd-layout-add]').last().click();
      const receipt = await (await response).json();
      assert.equal(receipt.ok, true);
      operationId = receipt.operationId;
      const saved = (await api('/current')).pages.find((p) => p.pageId === ids[1]);
      assert.deepEqual(
        saved.data.elements.map((e) => ({ id: e.elementId, bounds: e.bounds })),
        geometry,
      );
      assert.deepEqual(saved.data.elements.slice(0, base.data.elements.length), base.data.elements);
      newObjectId = saved.data.elements[base.data.elements.length].elementId;
      const review = await api(`/reviews/${operationId}?pageId=${ids[1]}`);
      assert.deepEqual(review.before.page.data, base.data);
      assert.deepEqual(review.after.page.data, saved.data);
      await page.keyboard.press('Escape');
    },
  );

  await check(
    'Activity opens exact receipt, rendered sides, changed-object highlight and current-object navigation',
    async () => {
      await page.locator('[data-hd-open-activity]').click();
      await page.locator(`[data-hd-review-operation="${operationId}"]`).first().click();
      const dialog = page.locator('[data-hd-operation-review]');
      await dialog
        .locator('[data-hd-review-canvas="after"] [data-hd-element-id]')
        .first()
        .waitFor();
      assert.equal(await dialog.getAttribute('data-hd-operation-review'), operationId);
      assert.equal(
        await dialog.locator('[data-hd-review-assets="current-project"]').isVisible(),
        true,
      );
      assert.match(
        await dialog.locator('[data-hd-review-scope]').innerText(),
        /Live references: 2/,
      );
      assert.match(
        await dialog.locator('[data-hd-review-scope]').innerText(),
        /Pinned references: 1/,
      );
      await dialog.locator('[data-hd-review-side="before"]').click();
      assert.equal(await dialog.locator('[data-hd-review-canvas] [data-hd-element-id]').count(), 2);
      await dialog.locator('[data-hd-review-side="after"]').click();
      assert.equal(await dialog.locator('[data-hd-review-canvas] [data-hd-element-id]').count(), 6);
      await dialog.locator(`[data-hd-review-change="${newObjectId}"]`).click();
      assert.equal(
        await dialog.locator(`[data-hd-review-highlight="${newObjectId}"]`).isVisible(),
        true,
      );
      await capture('operation-review-1600-en');
      await dialog.locator('[data-hd-review-navigate-object]').click();
      await eventually(async () => (await api('/selection')).elementIds.includes(newObjectId));
      assert.equal(await dialog.count(), 0);
    },
  );

  await check(
    'Client claim remains distinct and opens the exact saved operation after subsequent edits',
    async () => {
      const snapshot = await api('/current');
      await api('/activity', {
        deckId: snapshot.deckId,
        requestId: randomUUID(),
        sessionId: 'synthetic-review-session',
        taskId: 'synthetic-review-task',
        actor: 'Synthetic Agent',
        status: 'completed',
        summary: 'Layout saved and checked',
        pageIds: [ids[1]],
        operationIds: [operationId],
      });
      await apply([
        {
          op: 'page.notes.set',
          pageId: ids[1],
          text: 'Later notes must not replace historical review.',
        },
      ]);
      const activity = page.getByTestId('project-activity');
      const report = activity.locator('article').filter({ hasText: 'Layout saved and checked' });
      await report.waitFor();
      assert.match(await report.innerText(), /Client report/);
      await report.locator(`[data-hd-review-operation="${operationId}"]`).click();
      await page.locator('[data-hd-review-canvas="after"] [data-hd-element-id]').first().waitFor();
      const review = await api(`/reviews/${operationId}?pageId=${ids[1]}`);
      assert.equal(
        review.after.page.data.notes,
        'Synthetic review notes. No private research content.',
      );
      await page.keyboard.press('Escape');
    },
  );

  await check('Late review response cannot replace a newly selected operation', async () => {
    const first = await apply([
      { op: 'page.notes.set', pageId: ids[1], text: 'Delayed first operation' },
    ]);
    const second = await apply([
      { op: 'page.notes.set', pageId: ids[1], text: 'Current second operation' },
    ]);
    const firstReview = await api(`/reviews/${first.operationId}`);
    let release;
    let intercepted = false;
    const gate = new Promise((resolve) => {
      release = resolve;
    });
    const pattern = `**/__pptd/reviews/${first.operationId}*`;
    await page.route(pattern, async (route) => {
      intercepted = true;
      await gate;
      await route
        .fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(firstReview),
        })
        .catch(() => {});
    });
    try {
      await page.locator(`[data-hd-review-operation="${first.operationId}"]`).first().click();
      await eventually(() => intercepted, 10000);
      await page.keyboard.press('Escape');
      await page.locator(`[data-hd-review-operation="${second.operationId}"]`).first().click();
      await page.locator('[data-hd-review-canvas="after"] [data-hd-element-id]').first().waitFor();
      release();
      await page.evaluate(
        () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
      );
      assert.equal(
        await page.locator('[data-hd-operation-review]').getAttribute('data-hd-operation-review'),
        second.operationId,
      );
      const notes = page
        .locator('[data-hd-operation-review] details')
        .filter({ hasText: 'Speaker notes' });
      await notes.locator('summary').click();
      assert.match(await notes.innerText(), /Current second operation/);
      await page.keyboard.press('Escape');
    } finally {
      release();
      await page.unroute(pattern);
    }
  });

  await check(
    'Wide/narrow English/Chinese and dark appearance keep primary controls usable',
    async () => {
      for (const [width, height, locale, appearance] of [
        [1600, 1000, 'zh-CN', 'light'],
        [1040, 800, 'en', 'light'],
        [1040, 800, 'zh-CN', 'dark'],
      ]) {
        await setSize(width, height);
        await setLocale(locale);
        await app.evaluate(({ nativeTheme }, value) => {
          nativeTheme.themeSource = value;
        }, appearance);
        // Playwright overrides the renderer color scheme independently of nativeTheme.
        await page.emulateMedia({ colorScheme: appearance });
        await shell.emulateMedia({ colorScheme: appearance });
        await eventually(() =>
          page.evaluate(
            (value) => document.documentElement.classList.contains('dark') === (value === 'dark'),
            appearance,
          ),
        );
        await assertFit(
          page.locator('[data-hd-open-activity], .hd-collection-select, [data-hd-save-status]'),
        );
        await capture(`workspace-${width}-${locale}-${appearance}`);
        await page.locator(`[data-hd-review-operation="${operationId}"]`).first().click();
        await page
          .locator('[data-hd-review-canvas="after"] [data-hd-element-id]')
          .first()
          .waitFor();
        await assertFit(
          page.locator(
            '[data-hd-review-side], [data-hd-review-navigate-page], [data-hd-review-assets]',
          ),
        );
        await capture(`review-${width}-${locale}-${appearance}`);
        await page.keyboard.press('Escape');
      }
      await setSize(1600, 1000);
      await setLocale('en');
      await page.emulateMedia({ colorScheme: 'light' });
      await shell.emulateMedia({ colorScheme: 'light' });
      await app.evaluate(({ nativeTheme }) => {
        nativeTheme.themeSource = 'light';
      });
    },
  );

  await check('Pinned artwork stays at the baseline and layout creation is disabled', async () => {
    const before = await api('/current');
    await page.locator('.hd-collection-select').selectOption('review-talk');
    await page.locator(`[data-hd-thumbnail-key="review-talk:pinned-baseline:${ids[1]}"]`).click();
    await eventually(async () => (await api('/selection')).versionId === pinnedVersionId);
    assert.equal(await page.locator('[data-hd-editor-canvas] [data-hd-element-id]').count(), 2);
    await page.getByRole('tab', { name: 'Layout', exact: true }).click();
    assert.equal(await page.locator('[data-hd-layout-preview-open]').isDisabled(), true);
    assert.equal((await api('/current')).metadataRevision, before.metadataRevision);
    await capture('pinned-layout-1600-en');
    await page.locator('.hd-collection-select').selectOption('');
    await eventually(
      async () => (await page.locator(`[data-hd-thumbnail="${ids[1]}"]`).count()) === 1,
    );
    await page.locator(`[data-hd-thumbnail="${ids[1]}"]`).click();
  });

  await check(
    'Agent setup separates generated instructions from the observed client report',
    async () => {
      await page.locator('.hd-navigation-tabs button').first().click();
      await page.locator('[data-hd-agent-connect]').click();
      const dialog = page.locator('[data-hd-agent-connection]');
      await dialog.locator('[data-hd-agent-setup-ready]').waitFor();
      await eventually(async () =>
        (await dialog.locator('[data-hd-agent-report]').innerText()).includes('Synthetic Agent'),
      );
      assert.match(
        await dialog.locator('[data-hd-agent-report]').innerText(),
        /not a live connection or execution check/,
      );
      assert.equal(await dialog.locator('[data-hd-copy-agent-config]').isEnabled(), true);
      await capture('agent-setup-evidence-1600-en');
      await page.keyboard.press('Escape');
    },
  );

  await check(
    'Candidate CLI review and stdio protocol expose the same exact operation',
    async () => {
      const appDirectory =
        process.env.HUANDENG_DESKTOP_APP ??
        path.join(path.dirname(executablePath), 'resources', 'app');
      const cli = path.join(appDirectory, 'node_modules', '@open-slide', 'core', 'huandeng.js');
      const plugin = process.env.HUANDENG_DESKTOP_APP
        ? path.join(root, 'plugins', 'huandeng')
        : path.join(appDirectory, 'plugins', 'huandeng');
      const execute = promisify(execFile);
      const settings = {
        cwd: root,
        env: { ...env, ELECTRON_RUN_AS_NODE: '1' },
        windowsHide: true,
        timeout: 45000,
        maxBuffer: 4 * 1024 * 1024,
      };
      const result = await execute(
        executablePath,
        [cli, '--entry', entry, 'review', operationId, '--page', ids[1]],
        settings,
      );
      const review = JSON.parse(result.stdout);
      assert.equal(review.operationId, operationId);
      assert.equal(review.after.page.data.elements.length, 6);
      const protocol = await execute(
        executablePath,
        [path.join(plugin, 'scripts', 'doctor.mjs'), '--entry', entry, '--cli', cli],
        settings,
      );
      const doctor = JSON.parse(protocol.stdout);
      assert.equal(doctor.protocolVerified, true);
      assert.equal(doctor.modelTaskVerified, false);
      assert.equal(doctor.operationReviewSupported, true);
      assert.equal(doctor.toolCount, 21);
      await fs.writeFile(path.join(evidence, 'protocol.json'), JSON.stringify(doctor, null, 2));
    },
  );

  await check('Original figure bytes and unrelated pages remain intact', async () => {
    for (const [name, original] of sourceHashes)
      assert.equal(hash(await fs.readFile(path.join(projectRoot, 'assets', name))), original);
    for (const [name, original] of siblingHashes)
      assert.equal(hash(await fs.readFile(path.join(projectRoot, name))), original);
    assert.equal((await api('/current')).pages.length, 3);
  });
  await check('No renderer exceptions', async () => assert.deepEqual(rendererErrors, []));
} catch (error) {
  failure = error;
  process.stderr.write(`${error.stack ?? error}\n`);
  if (page) {
    await page.screenshot({ path: path.join(evidence, 'failure.png') }).catch(() => {});
    await fs.writeFile(
      path.join(evidence, 'failure-ui.txt'),
      await page
        .locator('body')
        .innerText()
        .catch(() => ''),
    );
  }
} finally {
  if (app) await app.close().catch(() => {});
  await fs.writeFile(path.join(evidence, 'process.log'), processLog);
  const report = {
    passed: !failure,
    executablePath,
    developerApp: process.env.HUANDENG_DESKTOP_APP ?? null,
    fixture: directory,
    checks,
    screenshots,
    rendererErrors,
    operationId,
    newObjectId,
    pinnedVersionId,
  };
  await fs.writeFile(path.join(evidence, 'report.json'), JSON.stringify(report, null, 2));
  process.stdout.write(
    `${JSON.stringify({ passed: report.passed, checks: checks.length, evidence }, null, 2)}\n`,
  );
  if (failure) process.exitCode = 1;
}
