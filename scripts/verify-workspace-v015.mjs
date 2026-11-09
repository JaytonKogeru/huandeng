// biome-ignore-all lint/suspicious/noUndeclaredEnvVars: Acceptance explicitly selects an isolated executable, profile and runtime.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createWorkspaceFixture } from './workspace-v015-fixture.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(root, 'packages/core/package.json'));
const { _electron: electron } = require('playwright');
const YAML = require('yaml');
const executablePath = process.env.HUANDENG_DESKTOP_EXE;
assert.ok(executablePath, 'Set HUANDENG_DESKTOP_EXE to the isolated candidate.');
const fixture = await createWorkspaceFixture(root, require);
const { directory, projectRoot, profile, evidence, entry, ids, pagePaths } = fixture;
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
let pinnedVersionId;
let spacing;
let guardedDialogs = [];
const originalPages = await Promise.all(
  pagePaths.map((p) => fs.readFile(path.join(projectRoot, p), 'utf8')),
);
async function eventually(read, timeout = 30000) {
  const end = Date.now() + timeout;
  let last;
  while (Date.now() < end) {
    try {
      const value = await read();
      if (value) return value;
    } catch (error) {
      last = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 80));
  }
  throw last ?? new Error('Timed out waiting for workspace acceptance state.');
}
async function check(name, action) {
  const start = Date.now();
  try {
    await action();
    checks.push({ name, passed: true, milliseconds: Date.now() - start });
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
    actor: 'Synthetic workspace acceptance',
    expected: {
      pages: Object.fromEntries(snapshot.pages.map((p) => [p.pageId, p.pageRevision])),
      manifest: snapshot.manifestRevision,
      metadata: snapshot.metadataRevision,
    },
    operations,
  });
}
async function disk(index) {
  return YAML.parse(await fs.readFile(path.join(projectRoot, pagePaths[index]), 'utf8'));
}
async function view(name) {
  const primary = name === 'outline' ? 'browse' : name;
  await page.locator(`[data-hd-workspace-view="${primary}"]`).click();
  await eventually(
    async () =>
      (await page
        .locator('[data-hd-slide-document]')
        .getAttribute('data-hd-current-workspace-view')) === primary,
  );
  if (primary === 'browse')
    await page
      .locator(
        `[data-hd-browser-display-option="${name === 'outline' ? 'outline' : 'thumbnails'}"]`,
      )
      .click();
}
async function select(index) {
  await eventually(
    async () => (await page.locator(`[data-hd-thumbnail="${ids[index]}"]`).count()) === 1,
  );
  await page.locator(`[data-hd-thumbnail="${ids[index]}"]`).click();
  await eventually(async () => (await api('/selection')).pageId === ids[index]);
}
async function capture(name) {
  await page.screenshot({ path: path.join(evidence, `${name}.png`), animations: 'disabled' });
  screenshots.push(name);
}
async function locale(value) {
  await page.evaluate((v) => window.huandengDesktop.setLocale(v), value);
  await eventually(() => page.evaluate((v) => document.documentElement.lang === v, value));
}
async function size(width, height) {
  await app.evaluate(
    ({ BrowserWindow }, s) => BrowserWindow.getAllWindows()[0].setContentSize(...s),
    [width, height],
  );
  await eventually(() => page.evaluate((w) => innerWidth === w, width));
}
async function nativeMenu(label) {
  await app.evaluate(({ Menu }, name) => {
    const found = Menu.getApplicationMenu()
      ?.items.flatMap((item) => item.submenu?.items ?? [])
      .find((item) => item.label === name);
    if (!found?.enabled || !found.click)
      throw new Error(`Native menu command unavailable: ${name}`);
    found.click();
  }, label);
}
async function show(origin, expected) {
  await page.locator('[data-hd-presentation-menu]').click();
  await page.locator(`[data-hd-present-from="${origin}"]`).click();
  await page.locator(`[data-hd-presenter-slide="${expected}"]`).waitFor();
}
async function exitShow() {
  await page.keyboard.press('Escape');
  await page.locator('[data-hd-presenter]').waitFor({ state: 'detached' });
}
async function assertPrimaryFit() {
  const outside = await page
    .locator('[data-hd-workspace-view], [data-hd-agent-connect], [data-hd-presentation-menu]')
    .evaluateAll((nodes) =>
      nodes
        .filter((n) => {
          const b = n.getBoundingClientRect();
          return (
            b.width &&
            b.height &&
            (b.left < -1 || b.right > innerWidth + 1 || b.bottom > innerHeight + 1)
          );
        })
        .map((n) => n.textContent),
    );
  assert.deepEqual(outside, []);
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
  const observe = (candidate) => candidate.on('pageerror', (e) => rendererErrors.push(e.message));
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
  await size(1600, 1000);
  await locale('en');
  await select(1);

  await check('Permanent Slides and actual native File menu close only file previews', async () => {
    await page.getByRole('button', { name: 'Project files', exact: true }).click();
    for (const file of ['docs/readme.md', 'docs/values.json'])
      await page.locator(`[data-hd-project-file="${file}"]`).click();
    assert.equal(await page.locator('[data-hd-document-tabs] [role="tab"]').count(), 3);
    await page.keyboard.press('ControlOrMeta+w');
    await eventually(
      async () => (await page.locator('[data-hd-document-tabs] [role="tab"]').count()) === 2,
    );
    await page.locator('[data-hd-document-tab="docs/readme.md"]').click();
    await nativeMenu('Close file preview');
    await eventually(
      async () => (await page.locator('[data-hd-document-tabs] [role="tab"]').count()) === 1,
    );
    await page.keyboard.press('ControlOrMeta+w');
    await nativeMenu('Close file preview');
    assert.equal(await page.locator('[data-hd-document-tab="slides"]').count(), 1);
    assert.equal(await page.locator('[data-hd-document-tab="slides"] button').count(), 0);
    assert.equal(
      (await shell.evaluate(() => window.huandengDesktop.getWorkspace())).projects.length,
      1,
    );
    await page.getByRole('button', { name: 'Slide thumbnails', exact: true }).click();
  });

  await check(
    'Local Browse representations preserve selection and independent sidebar preferences',
    async () => {
      const navigation = page.locator('.hd-navigation');
      const originalWidth = (await navigation.boundingBox()).width;
      await navigation.locator('[data-hd-panel-resizer]').press('ArrowRight');
      const width = (await navigation.boundingBox()).width;
      assert.equal(width, originalWidth + 16);
      const selection = await api('/selection');
      assert.equal(await page.locator('[data-hd-workspace-view]').count(), 3);
      assert.deepEqual(await page.locator('[data-hd-workspace-view]').allTextContents(), [
        'Normal',
        'Browse',
        'Notes page',
      ]);
      assert.equal(
        await page.locator('[data-hd-pages-outline], [data-hd-pages-thumbnails]').count(),
        0,
      );
      await page.locator('[data-hd-pages-view="thumbnails"]').waitFor();
      assert.equal(await page.locator('[data-hd-editor-canvas]').isVisible(), true);
      assert.equal(await page.locator('[data-hd-inspector]').isVisible(), true);
      await page.locator('[data-hd-editor-canvas]').focus();
      await page.keyboard.press('ControlOrMeta+a');
      await eventually(async () => (await api('/selection')).elementIds.length > 0);
      await page.keyboard.press('Escape');
      await view('browse');
      assert.equal(
        await page.locator('[data-hd-pages-view]').getAttribute('data-hd-pages-view'),
        'thumbnails',
      );
      assert.equal((await navigation.boundingBox()).width, width);
      await view('outline');
      await page.locator('[data-hd-browser-outline]').first().waitFor();
      assert.equal(await page.locator('[data-hd-editor-canvas]').count(), 0);
      assert.equal((await navigation.boundingBox()).width, width);
      await view('notes');
      await page.locator('[data-hd-workspace-view="browse"]').click();
      assert.equal(
        await page.locator('[data-hd-section-browser]').getAttribute('data-hd-browser-display'),
        'outline',
      );
      for (const [label, content] of [
        ['Project and Story', '[data-hd-project-editor]'],
        ['Project asset library', '[data-hd-asset-library]'],
        ['Project files', '[data-hd-project-tree]'],
      ]) {
        await page.getByRole('button', { name: label, exact: true }).click();
        await page.locator(content).waitFor({ state: 'visible' });
        assert.equal((await navigation.boundingBox()).width, width);
        assert.equal(await page.locator('[data-hd-section-browser]').isVisible(), true);
        await page.getByRole('button', { name: 'Slide thumbnails', exact: true }).click();
        assert.equal(
          await page.locator('[data-hd-pages-view]').getAttribute('data-hd-pages-view'),
          'thumbnails',
        );
        assert.equal((await navigation.boundingBox()).width, width);
      }
      await page.getByRole('button', { name: 'Project files', exact: true }).click();
      await page.locator('[data-hd-project-file="docs/readme.md"]').click();
      await page.locator('[data-hd-file-preview]').waitFor();
      await page.locator('[data-hd-document-tab="slides"]').click();
      assert.equal(
        await page
          .locator('[data-hd-slide-document]')
          .getAttribute('data-hd-current-workspace-view'),
        'browse',
      );
      for (const name of ['notes', 'outline', 'edit']) {
        await view(name);
        assert.equal((await navigation.boundingBox()).width, width);
        assert.equal(await page.locator('[data-hd-project-tree]').isVisible(), true);
        assert.equal((await api('/selection')).pageId, selection.pageId);
        assert.equal(await page.locator('[data-hd-document-tab="docs/readme.md"]').count(), 1);
      }
      await page.locator('[data-hd-document-tab="docs/readme.md"]').click();
      await nativeMenu('Close file preview');
      assert.equal(await page.locator('[data-hd-document-tab="slides"]').count(), 1);
      await page.getByRole('button', { name: 'Slide thumbnails', exact: true }).click();
      await page.getByRole('button', { name: 'Collapse properties panel', exact: true }).click();
      await page.getByRole('button', { name: 'Hide project navigation', exact: true }).click();
      for (const name of ['browse', 'outline', 'notes', 'edit']) {
        await view(name);
        assert.equal(await navigation.isVisible(), false);
        assert.equal(await page.locator('[data-hd-inspector]').isVisible(), false);
      }
      await page.getByRole('button', { name: 'Show project navigation', exact: true }).click();
      assert.equal((await navigation.boundingBox()).width, width);
      await navigation.locator('[data-hd-panel-resizer]').press('ArrowLeft');
      assert.equal((await navigation.boundingBox()).width, originalWidth);
      await page.getByRole('button', { name: 'Show object properties', exact: true }).click();
    },
  );

  await check(
    'Section browser renders two populated groups and unassigned slides; filter, collapse, select and real reorder',
    async () => {
      await view('browse');
      assert.equal(await page.locator('[data-hd-browser-card]').count(), 6);
      for (const [section, count] of [
        ['alpha-section', 2],
        ['beta-section', 3],
      ])
        assert.equal(
          await page
            .locator(`[data-hd-browser-group="section:${section}"] [data-hd-browser-card]`)
            .count(),
          count,
        );
      assert.ok(await page.locator('[data-hd-browser-group^="unassigned:"]').count());
      await page.locator(`[data-hd-workspace-preview="${ids[1]}"] [data-pptd-page]`).waitFor();
      const collapse = page.locator('[data-hd-browser-collapse="section:alpha-section"]');
      await collapse.click();
      assert.equal(await page.locator(`[data-hd-browser-card="${ids[1]}"]`).count(), 0);
      assert.equal(await page.locator('[data-hd-browser-move]:enabled').count(), 0);
      await page.locator('[data-hd-browser-search]').fill('Two sources');
      assert.equal(await page.locator('[data-hd-browser-card]').count(), 1);
      assert.equal(await collapse.isDisabled(), true);
      await page.locator('[data-hd-browser-search]').fill('no synthetic match');
      await page.locator('[data-hd-browser-empty]').waitFor();
      await page.locator('[data-hd-browser-search]').fill('');
      assert.equal(await collapse.getAttribute('aria-expanded'), 'false');
      await collapse.click();
      const selected = page.locator(`[data-hd-browser-select="${ids[2]}"]`);
      await selected.click();
      await eventually(async () => (await api('/selection')).pageId === ids[2]);
      await selected.press('Alt+ArrowUp');
      await eventually(async () => (await api('/current')).pages[1].pageId === ids[2]);
      await page
        .locator(`[data-hd-browser-card="${ids[2]}"] [data-hd-browser-move="down"]`)
        .click();
      await eventually(async () => (await api('/current')).pages[1].pageId === ids[1]);
      await page.locator(`[data-hd-browser-select="${ids[1]}"]`).press('Enter');
      await page.locator('[data-hd-editor-canvas]').waitFor();
      assert.equal(
        await page
          .locator('[data-hd-slide-document]')
          .getAttribute('data-hd-current-workspace-view'),
        'edit',
      );
      await eventually(() =>
        page.locator('[data-hd-editor-canvas]').evaluate((e) => e.contains(document.activeElement)),
      );
    },
  );

  await check(
    'Notes uses Chromium composition, blocks navigation, saves long exact text and survives all views',
    async () => {
      await view('notes');
      const notes = page.locator('[data-hd-notes-editor]');
      assert.equal(await notes.count(), 1);
      const longNotes = 'Authored notes · 原文保持\n'.repeat(100);
      await notes.fill(longNotes);
      await notes.press('ControlOrMeta+End');
      const cdp = await app.context().newCDPSession(page);
      await cdp.send('Input.imeSetComposition', {
        text: '中文组合',
        selectionStart: 4,
        selectionEnd: 4,
      });
      assert.equal(await page.locator('[data-hd-workspace-view="browse"]').isDisabled(), true);
      assert.equal(await page.locator('[data-hd-workspace-view="browse"]').isDisabled(), true);
      assert.equal(await page.locator('[data-hd-workspace-view="edit"]').isDisabled(), true);
      assert.equal(await page.locator('[data-hd-notes-next]').isDisabled(), true);
      await cdp.send('Input.insertText', { text: '中文组合' });
      await cdp.detach();
      const exact = await notes.inputValue();
      assert.equal(exact, `${longNotes}中文组合`);
      await notes.press('Backspace');
      await page.keyboard.insertText('合');
      assert.equal(await notes.inputValue(), exact);
      await eventually(async () => (await disk(1)).notes === exact);
      assert.equal(await notes.evaluate((e) => e.scrollHeight > e.clientHeight), true);
      await view('browse');
      await view('edit');
      await page.getByRole('button', { name: 'Notes', exact: true }).click();
      assert.equal(await page.locator('[data-hd-notes-editor]').count(), 1);
      assert.equal(await page.locator('[data-hd-notes-editor]').inputValue(), exact);
      await page.getByRole('button', { name: 'Notes', exact: true }).click();
      await view('notes');
      assert.equal(await notes.inputValue(), exact);
      assert.equal(await notes.count(), 1);
      await page.locator('[data-hd-notes-next]').click();
      await eventually(async () => (await api('/selection')).pageId === ids[2]);
      await page.locator('[data-hd-notes-previous]').click();
      await eventually(async () => (await api('/selection')).pageId === ids[1]);
      assert.equal(await notes.inputValue(), exact);
    },
  );

  await check(
    'Browse and Notes isolate object shortcuts and image paste/drop from the document',
    async () => {
      const before = (await api('/current')).pages.map((p) => [p.pageId, p.data.elements]);
      for (const name of ['browse', 'notes']) {
        await view(name);
        const surface = page.locator(
          name === 'browse' ? `[data-hd-browser-select="${ids[1]}"]` : '[data-hd-notes-next]',
        );
        await surface.focus();
        for (const key of ['Delete', 'Backspace', 'ControlOrMeta+a', 'ControlOrMeta+m', 't'])
          await page.keyboard.press(key);
        await page.evaluate(() => {
          const target = document.querySelector('[data-hd-section-browser], [data-hd-notes-page]');
          const data = new DataTransfer();
          data.items.add(
            new File([new Uint8Array([137, 80, 78, 71])], 'synthetic.png', { type: 'image/png' }),
          );
          target.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, clipboardData: data }));
          target.dispatchEvent(new DragEvent('drop', { bubbles: true, dataTransfer: data }));
        });
        assert.equal(await page.locator('[data-hd-editor-canvas]').count(), 0);
      }
      await view('edit');
      assert.deepEqual(
        (await api('/current')).pages.map((p) => [p.pageId, p.data.elements]),
        before,
      );
    },
  );

  await check(
    'Thumbnail slots stay six pixels through hover/focus and keep insertion drag targets',
    async () => {
      const slots = page.locator('[data-hd-insert-before], [data-hd-insert-after]');
      const first = slots.first();
      await first.scrollIntoViewIfNeeded();
      const before = await first.boundingBox();
      await first.hover();
      const hover = await first.boundingBox();
      await first.focus();
      const focus = await first.boundingBox();
      assert.equal(before.height, 6);
      assert.equal(hover.height, 6);
      assert.equal(focus.height, 6);
      spacing = await page.locator('[data-hd-thumbnail]').evaluateAll((nodes) =>
        nodes.slice(0, 3).map((n) => ({
          id: n.dataset.hdThumbnail,
          top: n.getBoundingClientRect().top,
          bottom: n.getBoundingClientRect().bottom,
        })),
      );
      assert.equal(spacing[2].top - spacing[1].bottom, 6);
      await capture('thumbnail-focused-slot-en');
      const transfer = await page.evaluateHandle(() => {
        const data = new DataTransfer();
        data.setData('application/huandeng-page', 'synthetic-drag-probe');
        return data;
      });
      await first.dispatchEvent('dragover', { dataTransfer: transfer });
      assert.equal(await first.getAttribute('data-hd-drop-active'), 'true');
      await capture('thumbnail-drag-target-en');
      await page.locator('[data-hd-thumbnail-scroll]').dispatchEvent('dragleave');
      await transfer.dispose();
      await view('outline');
      assert.equal((await slots.first().boundingBox()).height, 6);
      await slots.first().focus();
      await capture('outline-focused-slot-en');
      await view('edit');
    },
  );

  await check(
    'Animation chooses objects, saves two effects, guards drafts and changes actual show artwork per click',
    async () => {
      await select(1);
      await page.getByRole('button', { name: 'Animation', exact: true }).click();
      const builds = page.locator('[data-hd-builds]');
      await builds.getByLabel('Object to animate', { exact: true }).selectOption('figure-a');
      await page.getByRole('button', { name: 'Select this object on canvas', exact: true }).click();
      await eventually(async () => (await api('/selection')).elementIds.includes('figure-a'));
      for (const target of ['figure-a', 'figure-b']) {
        await builds.getByLabel('Object to animate', { exact: true }).selectOption(target);
        await builds.getByRole('button', { name: 'Add effect', exact: true }).click();
        await eventually(async () =>
          (await disk(1)).timeline?.effects.some((e) => e.targetId === target),
        );
      }
      const saved = await disk(1);
      assert.equal(saved.timeline.effects.length, 2);
      assert.deepEqual(
        saved.timeline.effects.map((e) => e.trigger),
        ['click', 'click'],
      );
      const duration = builds.getByLabel('Effect duration (s)', { exact: true });
      await duration.fill('0');
      await duration.press('Enter');
      await eventually(async () => (await duration.getAttribute('aria-invalid')) === 'true');
      assert.equal(await page.locator('[data-hd-workspace-view="notes"]').isDisabled(), true);
      assert.equal(await page.locator('[data-hd-workspace-view="browse"]').isDisabled(), true);
      assert.equal(await page.locator('[data-hd-presentation-menu]').isDisabled(), true);
      await capture('animation-draft-guard-en');
      await duration.press('Escape');
      await eventually(
        async () => !(await page.locator('[data-hd-workspace-view="notes"]').isDisabled()),
      );
      await capture('animation-saved-en');
      await builds.getByRole('button', { name: 'Preview steps', exact: true }).click();
      const canvas = page.locator('[data-hd-editor-canvas]');
      await eventually(
        async () =>
          (await canvas
            .locator('[data-hd-element-id="figure-a"]')
            .evaluate((e) => Number(getComputedStyle(e).opacity))) === 0,
      );
      await builds.getByRole('button', { name: 'Preview next step', exact: true }).click();
      await eventually(
        async () =>
          (await canvas
            .locator('[data-hd-element-id="figure-a"]')
            .evaluate((e) => Number(getComputedStyle(e).opacity))) === 1,
      );
      assert.equal(
        await canvas
          .locator('[data-hd-element-id="figure-b"]')
          .evaluate((e) => Number(getComputedStyle(e).opacity)),
        0,
      );
      await builds.getByRole('button', { name: 'Back to editing', exact: true }).click();
      await show('current', ids[1]);
      const slide = page.locator('[data-hd-presenter-slide]');
      const opacity = async (id) =>
        slide
          .locator(`[data-hd-element-id="${id}"]`)
          .evaluate((e) => Number(getComputedStyle(e).opacity));
      assert.equal(await opacity('figure-a'), 0);
      assert.equal(await opacity('figure-b'), 0);
      await slide.click({ position: { x: 30, y: 130 } });
      await eventually(async () => (await opacity('figure-a')) === 1);
      assert.equal(await opacity('figure-b'), 0);
      assert.equal(await slide.getAttribute('data-hd-presenter-slide'), ids[1]);
      await capture('show-first-click-en');
      await slide.click({ position: { x: 30, y: 130 } });
      await eventually(async () => (await opacity('figure-b')) === 1);
      assert.equal(await slide.getAttribute('data-hd-presenter-slide'), ids[1]);
      await capture('show-second-click-en');
      await exitShow();
      assert.deepEqual((await disk(1)).elements, saved.elements);
      await page.getByRole('button', { name: 'Animation', exact: true }).click();
    },
  );

  await check(
    'Beginning/current menu and F5 origins skip hidden pages and exit restores editing',
    async () => {
      await select(3);
      await show('beginning', ids[1]);
      await exitShow();
      await select(3);
      await show('current', ids[3]);
      await exitShow();
      await select(4);
      await page.keyboard.press('Shift+F5');
      await page.locator(`[data-hd-presenter-slide="${ids[5]}"]`).waitFor();
      await exitShow();
      await page.keyboard.press('F5');
      await page.locator(`[data-hd-presenter-slide="${ids[1]}"]`).waitFor();
      await exitShow();
      await select(1);
    },
  );

  await check(
    'Repeated/pinned browser occurrences select independently and preserve checkpoint artwork and notes',
    async () => {
      const snapshot = await api('/current');
      const target = snapshot.pages.find((p) => p.pageId === ids[1]);
      const checkpoint = await api(`/pages/${ids[1]}/checkpoints`, {
        pageId: ids[1],
        requestId: randomUUID(),
        label: 'Synthetic workspace baseline',
        expectedPageRevision: target.pageRevision,
        expectedMetadataRevision: snapshot.metadataRevision,
        actor: 'Synthetic acceptance',
      });
      pinnedVersionId = checkpoint.versionId;
      const project = structuredClone((await api('/current')).metadata.project);
      project.presentations[0].items.push({
        id: 'pinned-baseline',
        kind: 'page',
        pageId: ids[1],
        versionId: pinnedVersionId,
      });
      await apply([
        { op: 'project.replace', project },
        { op: 'page.notes.set', pageId: ids[1], text: 'Live notes after checkpoint · 原文' },
      ]);
      await page.locator('.hd-collection-select').selectOption('review-talk');
      await view('browse');
      assert.equal(await page.locator('[data-hd-browser-card]').count(), 3);
      assert.equal(await page.locator('[data-hd-browser-move]').count(), 0);
      for (const item of ['live-one', 'live-two', 'pinned-baseline']) {
        const occurrence = `review-talk:${item}:${ids[1]}`;
        await page.locator(`[data-hd-browser-select="${occurrence}"]`).click();
        await eventually(async () => (await api('/selection')).occurrenceId === occurrence);
        assert.equal(await page.locator('[data-hd-browser-card][data-selected="true"]').count(), 1);
      }
      assert.equal((await api('/selection')).versionId, pinnedVersionId);
      await capture('browser-pinned-en');
      await view('notes');
      assert.equal(await page.locator('[data-hd-notes-editor]').getAttribute('readonly'), '');
      assert.equal(
        await page.getByRole('button', { name: 'Edit notes', exact: true }).isDisabled(),
        true,
      );
      assert.equal(await page.locator('[data-hd-notes-editor]').inputValue(), target.data.notes);
      const pinnedSelection = await api('/selection');
      for (const name of ['outline', 'edit', 'browse', 'notes']) {
        await view(name);
        const selected = await api('/selection');
        for (const field of ['pageId', 'occurrenceId', 'versionId'])
          assert.equal(selected[field], pinnedSelection[field]);
        if (name === 'outline' || name === 'edit')
          assert.equal(await page.locator('[data-hd-thumbnail][aria-pressed="true"]').count(), 1);
      }
      await view('edit');
      assert.equal(
        await page.locator('[data-hd-editor-canvas] [data-hd-element-id]').count(),
        target.data.elements.length,
      );
      await page.keyboard.press('Shift+F5');
      await page.locator('[data-hd-presenter]').waitFor();
      assert.equal(
        await page
          .locator('[data-hd-presenter-slide]')
          .getAttribute('data-hd-presenter-occurrence'),
        `review-talk:pinned-baseline:${ids[1]}`,
      );
      await exitShow();
      await page.locator('.hd-collection-select').selectOption('');
      await select(1);
    },
  );

  await check(
    'Auxiliary Story draft blocks view switching, native Project close and window close until saved',
    async () => {
      await app.evaluate(({ dialog }) => {
        globalThis.__v015GuardDialogs = [];
        dialog.showMessageBox = async (...args) => {
          globalThis.__v015GuardDialogs.push(args.at(-1));
          return { response: 0, checkboxChecked: false };
        };
      });
      await page.getByRole('tab', { name: 'Story', exact: true }).click();
      const story = page.locator('[data-hd-story]');
      await story.getByRole('button', { name: 'Edit intent', exact: true }).click();
      await story
        .getByLabel('Slide authoring intent', { exact: true })
        .fill('Synthetic guarded Story draft');
      assert.equal(await page.locator('[data-hd-workspace-view="browse"]').isDisabled(), true);
      assert.equal(await page.locator('[data-hd-workspace-view="browse"]').isDisabled(), true);
      await nativeMenu('Close project');
      await eventually(
        async () => (await app.evaluate(() => globalThis.__v015GuardDialogs.length)) === 1,
      );
      assert.equal(
        (await shell.evaluate(() => window.huandengDesktop.getWorkspace())).projects.length,
        1,
      );
      await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].close());
      await eventually(
        async () => (await app.evaluate(() => globalThis.__v015GuardDialogs.length)) === 2,
      );
      guardedDialogs = await app.evaluate(() => globalThis.__v015GuardDialogs);
      for (const dialog of guardedDialogs) assert.match(dialog.detail, /draft/i);
      assert.equal(
        await story.getByLabel('Slide authoring intent', { exact: true }).inputValue(),
        'Synthetic guarded Story draft',
      );
      await story.getByRole('button', { name: 'Save changes', exact: true }).click();
      await eventually(
        async () =>
          (await api('/current')).metadata.slides[ids[1]].designIntent.purpose ===
          'Synthetic guarded Story draft',
      );
      await page.getByRole('tab', { name: 'Properties', exact: true }).click();
    },
  );

  await check(
    'Agent setup and native menu localize; writer labels preserve client-authored names',
    async () => {
      const snapshot = await api('/current');
      await api('/activity', {
        deckId: snapshot.deckId,
        requestId: randomUUID(),
        sessionId: 'synthetic-workspace',
        taskId: 'actor-preservation',
        actor: 'Shared writer',
        status: 'completed',
        summary: 'Synthetic client actor must stay verbatim',
        pageIds: [ids[1]],
      });
      await locale('zh-CN');
      const labels = await app.evaluate(({ Menu }) =>
        Menu.getApplicationMenu().items.flatMap(
          (item) => item.submenu?.items.map((child) => child.label) ?? [],
        ),
      );
      assert.ok(labels.includes('助手连接…'));
      assert.equal(
        await page
          .locator('[data-hd-agent-connect]')
          .evaluate((e) => e.nextElementSibling.hasAttribute('data-hd-open-activity')),
        true,
      );
      await page.locator('[data-hd-agent-connect]').click();
      const dialog = page.locator('[data-hd-agent-connection]');
      await dialog.waitFor();
      assert.ok((await dialog.innerText()).includes('助手连接'));
      await page.keyboard.press('Escape');
      await page.locator('[data-hd-open-activity]').click();
      const activity = page.getByTestId('project-activity');
      await eventually(async () => (await activity.innerText()).includes('共享写入器'));
      const client = activity
        .locator('article')
        .filter({ hasText: 'Synthetic client actor must stay verbatim' });
      assert.ok((await client.innerText()).includes('Shared writer'));
      assert.ok(!(await client.innerText()).includes('共享写入器'));
      await capture('activity-system-client-labels-zh-CN');
      await page.locator('[data-hd-open-activity]').click();
      await locale('en');
    },
  );
  await check(
    'Wide light and narrow dark Normal/Outline/Browser/Notes surfaces in both UI languages preserve authored bytes',
    async () => {
      const before = (await api('/current')).pages.map((p) => [p.pageId, p.data]);
      const workspaceBefore = await shell.evaluate(() => window.huandengDesktop.getWorkspace());
      for (const [width, height, appearance] of [
        [1600, 1000, 'light'],
        [1040, 800, 'dark'],
      ]) {
        await size(width, height);
        await app.evaluate(({ nativeTheme }, value) => {
          nativeTheme.themeSource = value;
        }, appearance);
        await page.emulateMedia({ colorScheme: appearance });
        await shell.emulateMedia({ colorScheme: appearance });
        for (const language of ['en', 'zh-CN']) {
          await locale(language);
          await eventually(() =>
            shell.evaluate((value) => document.documentElement.lang === value, language),
          );
          const chinese = language === 'zh-CN';
          assert.equal(
            await shell.locator('.project-strip').getAttribute('aria-label'),
            chinese ? '项目工作区' : 'Project workspace',
          );
          assert.equal(
            await shell.locator('#project-tabs').getAttribute('aria-label'),
            chinese ? '已打开的项目' : 'Open Projects',
          );
          assert.equal(
            await shell.locator('#workspace-open').getAttribute('aria-label'),
            chinese ? '打开项目' : 'Open Project',
          );
          assert.equal(
            await shell.locator('#workspace-open').getAttribute('title'),
            chinese ? '打开项目 · Ctrl+O' : 'Open Project · Ctrl+O',
          );
          const workspace = await shell.evaluate(() => window.huandengDesktop.getWorkspace());
          assert.equal(workspace.activeId, workspaceBefore.activeId);
          assert.deepEqual(
            workspace.projects.map(({ id, title, entryPath }) => ({ id, title, entryPath })),
            workspaceBefore.projects.map(({ id, title, entryPath }) => ({ id, title, entryPath })),
          );
          for (const project of workspace.projects) {
            const tab = shell.locator(`[data-project-id="${project.id}"]`);
            assert.equal(await tab.locator('.project-title').innerText(), project.title);
            assert.equal(await tab.getAttribute('title'), `${project.title}\n${project.entryPath}`);
            assert.equal(
              await tab.locator('.close').getAttribute('aria-label'),
              `${chinese ? '关闭项目' : 'Close Project'}: ${project.title}`,
            );
            assert.equal(
              await tab.locator('.close').getAttribute('title'),
              chinese ? '关闭项目' : 'Close Project',
            );
            assert.equal(
              await tab.getAttribute('aria-selected'),
              String(project.id === workspace.activeId),
            );
          }
          assert.equal(
            await page.locator('.hd-titlebar-actions [data-hd-agent-connect]').count(),
            1,
          );
          assert.equal(
            await page.locator('[data-hd-agent-connect]').innerText(),
            language === 'en' ? 'Agent setup' : '助手连接',
          );
          if (language === 'zh-CN')
            assert.equal(await page.locator('[data-hd-presentation-menu]').innerText(), '放映');
          for (const surface of ['edit', 'outline', 'browse', 'notes']) {
            await view(surface);
            await assertPrimaryFit();
            if (surface === 'browse')
              await page.locator('[data-hd-browser-size]').selectOption('small');
            await capture(`${surface}-${width}-${language}-${appearance}`);
            if (surface === 'edit') {
              await page
                .getByRole('button', {
                  name: language === 'en' ? 'Animation' : '动画',
                  exact: true,
                })
                .click();
              await capture(`animation-${width}-${language}-${appearance}`);
              await page
                .getByRole('button', {
                  name: language === 'en' ? 'Animation' : '动画',
                  exact: true,
                })
                .click();
            }
          }
        }
      }
      assert.deepEqual(
        (await api('/current')).pages.map((p) => [p.pageId, p.data]),
        before,
      );
      for (const index of [0, 2, 3, 4, 5])
        assert.equal(
          await fs.readFile(path.join(projectRoot, pagePaths[index]), 'utf8'),
          originalPages[index],
        );
    },
  );
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
  await fs.writeFile(
    path.join(evidence, 'report.json'),
    JSON.stringify(
      {
        passed: !failure,
        executablePath,
        developerApp: process.env.HUANDENG_DESKTOP_APP ?? null,
        fixture: directory,
        checks,
        screenshots,
        rendererErrors,
        pinnedVersionId,
        spacing,
        guardedDialogs,
        error: failure ? String(failure) : undefined,
      },
      null,
      2,
    ),
  );
  process.stdout.write(
    `${JSON.stringify({ passed: !failure, checks: checks.length, evidence }, null, 2)}\n`,
  );
  if (failure) process.exitCode = 1;
}
