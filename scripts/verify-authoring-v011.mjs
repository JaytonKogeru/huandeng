// biome-ignore-all lint/suspicious/noUndeclaredEnvVars: Acceptance selects an isolated candidate, profile and runtime.
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

// Document mutations use the visible editor. The service is read only here.
// The fixture, profile and runtime are isolated; clipboard tests copy synthetic text only.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(root, 'packages/core/package.json'));
const { _electron: electron } = require('playwright');
const YAML = require('yaml');
const executablePath = process.env.HUANDENG_DESKTOP_EXE;
assert.ok(executablePath, 'Set HUANDENG_DESKTOP_EXE to the candidate executable.');
const sandbox = await fs.mkdtemp(path.join(os.tmpdir(), 'huandeng-authoring-v011-'));
const projectRoot = path.join(sandbox, 'synthetic-project');
const entry = path.join(projectRoot, 'deck.pptd');
const profile = path.join(sandbox, 'profile');
const evidence = path.join(root, '.verification/authoring-v011', path.basename(sandbox));
const ids = Array.from({ length: 5 }, () => randomUUID());
const pagePaths = [
  'pages/opening.page',
  'pages/cover-a.page',
  'pages/detail-a.page',
  'pages/cover-b.page',
  'pages/detail-b.page',
];
const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
const imagePath = 'media/preview.png';
const sourceFiles = {
  'docs/notes.md':
    '# Synthetic file preview\n\nThis file is a source document.\n\n<script>window.__huandengPreviewExecuted = true</script>\n',
  'docs/data.json': '{\n  "synthetic": true,\n  "items": [1, 2, 3]\n}\n',
  'scripts/example.cmd':
    '@echo off\r\nrem Synthetic preview fixture. Never execute this file.\r\necho preview-only > "%~dp0preview-executed.txt"\r\n',
};
const titles = [
  'Opening reference',
  'Section Alpha cover',
  'Unique detail inside Alpha',
  'Section Beta cover',
  'Closing detail inside Beta',
];
const fixtures = titles.map((title, index) => ({
  title,
  elements: [
    {
      elementId: 'title',
      elementType: 'text',
      bounds: index === 2 ? [96, 112, 720, 82] : [44, 32, 860, 64],
      content: {
        text:
          index === 2
            ? '<span style="font-size:17px;font-family:Arial;color:#334155;font-weight:normal">Unique <strong>detail</strong> inside Alpha</span>'
            : title,
        fontSize: index === 0 ? 32 : 24,
        fontFamily: index === 0 ? 'Times New Roman' : 'Arial',
        color: index === 0 ? '#112233' : '#334155',
        bold: index === 0,
      },
    },
    {
      elementId: 'body',
      elementType: 'text',
      bounds: [44, 230, 720, 100],
      content: {
        text: `Synthetic content ${index + 1}. Keep this exact wording.`,
        fontSize: 20,
        fontFamily: 'Arial',
        color: '#334155',
      },
    },
    {
      elementId: 'marker',
      elementType: 'shape',
      shapeName: 'rect',
      bounds: [800, 360, 80, 80],
      fill: { type: 'solid', color: '#8ca49b' },
    },
  ],
  notes: `Synthetic notes for Slide ${index + 1}.`,
}));

function fixturePng() {
  const width = 32;
  const height = 24;
  const bytes = Buffer.alloc(height * (1 + width * 3));
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = y * (1 + width * 3) + 1 + x * 3;
      bytes.set(x < width / 2 ? [140, 164, 155] : [48, 60, 55], offset);
    }
  }
  const chunk = (type, data) => {
    const payload = Buffer.concat([Buffer.from(type), data]);
    let crc = 0xffffffff;
    for (const byte of payload) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
    const result = Buffer.alloc(data.length + 12);
    result.writeUInt32BE(data.length, 0);
    payload.copy(result, 4);
    result.writeUInt32BE((crc ^ 0xffffffff) >>> 0, result.length - 4);
    return result;
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 2;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(bytes)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

for (const folder of ['pages', 'media', 'docs', 'scripts', '.huandeng'])
  await fs.mkdir(path.join(projectRoot, folder), { recursive: true });
await fs.mkdir(profile, { recursive: true });
await fs.mkdir(evidence, { recursive: true });
await fs.writeFile(path.join(profile, 'preferences.json'), JSON.stringify({ recentProjects: [] }));
await fs.writeFile(
  entry,
  YAML.stringify({
    title: 'HUANDENG authoring acceptance',
    size: [960, 540],
    pages: pagePaths,
    theme: { fontFamily: 'Arial' },
  }),
);
for (const [index, file] of pagePaths.entries())
  await fs.writeFile(path.join(projectRoot, file), YAML.stringify(fixtures[index]));
for (const [file, text] of Object.entries(sourceFiles))
  await fs.writeFile(path.join(projectRoot, file), text);
await fs.writeFile(path.join(projectRoot, imagePath), fixturePng());
await fs.writeFile(
  path.join(projectRoot, '.huandeng/project.json'),
  JSON.stringify(
    {
      schemaVersion: 1,
      deckId: randomUUID(),
      entry: 'deck.pptd',
      project: {
        schemaVersion: 1,
        mainStory: { purpose: '', audience: '', takeaway: '' },
        sections: [],
        presentations: [],
      },
      slides: Object.fromEntries(
        ids.map((id, index) => [
          id,
          {
            shortCode: `TST${index + 1}`,
            label: `S${index + 1}`,
            path: pagePaths[index],
            state: 'active',
          },
        ]),
      ),
    },
    null,
    2,
  ),
);

const env = {
  ...process.env,
  HUANDENG_DESKTOP_DATA_DIR: profile,
  HUANDENG_RUNTIME_DIR: path.join(sandbox, 'runtime'),
};
delete env.ELECTRON_RUN_AS_NODE;
const checks = [];
const screenshots = [];
const rendererErrors = [];
const exits = [];
const observations = [];
let app;
let page;
let serviceUrl;
let sessionToken;
let identity;
let failure;
let processLog = '';
let launchCount = 0;
let transactionRequests = 0;
let documentWriteRequests = 0;
let sectionA;
let sectionB;
let presentationId;
let expectedProject;

const canvas = () => page.locator('[data-hd-editor-canvas]');
const project = () => page.locator('[data-hd-project-editor]');
const inspector = () => page.locator('[data-hd-inspector]');
const thumbnail = (id) => page.locator(`[data-hd-thumbnail="${id}"]`);
const sectionToggle = (id) => page.locator(`[data-hd-section-toggle="${id}"]`);
const metadata = async () =>
  JSON.parse(await fs.readFile(path.join(projectRoot, '.huandeng/project.json'), 'utf8'));
const readProject = async () => (await metadata()).project;
const disk = async (index) =>
  YAML.parse(await fs.readFile(path.join(projectRoot, pagePaths[index]), 'utf8'));
const pathKey = (value) =>
  process.platform === 'win32' ? path.resolve(value).toLowerCase() : path.resolve(value);

async function eventually(read, timeout = 20000) {
  const end = Date.now() + timeout;
  let last;
  while (Date.now() < end) {
    try {
      const value = await read();
      if (value) return value;
    } catch (error) {
      last = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 75));
  }
  throw last ?? new Error('Timed out waiting for authoring acceptance state.');
}

async function check(name, action) {
  const started = Date.now();
  try {
    await action();
    checks.push({ name, passed: true, milliseconds: Date.now() - started });
    process.stdout.write(`PASS ${name}\n`);
  } catch (error) {
    checks.push({ name, passed: false, milliseconds: Date.now() - started, error: String(error) });
    throw error;
  }
}

async function api(route) {
  const response = await fetch(`${serviceUrl}/__pptd${route}`, {
    headers: { 'x-huandeng-token': sessionToken ?? '' },
    signal: AbortSignal.timeout(15000),
  });
  const result = await response.json();
  assert.ok(response.ok && result.ok !== false, `Read failed: ${route} (${response.status})`);
  return result;
}

async function saved() {
  await eventually(async () =>
    /^Saved(?:$|\s|·)/.test((await page.locator('[data-hd-save-status]').innerText()).trim()),
  );
}

async function foreground() {
  await app.evaluate(({ BrowserWindow }) => {
    const window = BrowserWindow.getAllWindows()[0];
    if (window.isMinimized()) window.restore();
    if (window.isMaximized()) window.unmaximize();
    window.setContentSize(1600, 1000);
    window.show();
    window.focus();
  });
  await page.bringToFront();
}

async function capture(name) {
  await foreground();
  await page.screenshot({
    path: path.join(evidence, name),
    animations: 'disabled',
    timeout: 15000,
    mask: [page.locator('[data-hd-project-root]')],
    maskColor: '#e5e7eb',
  });
  screenshots.push(name);
}

async function signature(
  files = ['deck.pptd', ...pagePaths, imagePath, ...Object.keys(sourceFiles)],
) {
  return Object.fromEntries(
    await Promise.all(
      files.map(async (file) => [
        file,
        createHash('sha256')
          .update(await fs.readFile(path.join(projectRoot, file)))
          .digest('hex'),
      ]),
    ),
  );
}

async function launch(expectedPageIds = ids) {
  sessionToken = undefined;
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
  launchCount += 1;
  app.process().stderr?.on('data', (data) => {
    processLog = `${processLog}${data}`.slice(-12000);
  });
  page = await app.firstWindow();
  page.setDefaultTimeout(15000);
  page.on('pageerror', (error) => rendererErrors.push(error.message));
  page.on('request', (request) => {
    if (request.method() !== 'POST') return;
    if (/\/__pptd\/transactions$/.test(request.url())) transactionRequests += 1;
    if (/\/__pptd\/(transactions|undo|redo)$/.test(request.url())) documentWriteRequests += 1;
  });
  await canvas().waitFor({ timeout: 120000 });
  const context = await page.evaluate(() => window.huandengDesktop.getContext());
  assert.equal(pathKey(context.entryPath), pathKey(entry));
  serviceUrl = context.serviceUrl;
  const session = await api('/session');
  sessionToken = session.sessionToken;
  assert.equal(session.writable, true);
  assert.deepEqual(
    session.pages.map((item) => item.pageId),
    expectedPageIds,
  );
  identity = await fs
    .readFile(path.join(path.dirname(executablePath), 'huandeng-build.json'), 'utf8')
    .then((value) => JSON.parse(value.replace(/^\uFEFF/, '')))
    .catch(() => null);
  await foreground();
  await saved();
}

async function closeNormally() {
  if (!app) return;
  await saved();
  const current = app;
  const exit = new Promise((resolve) =>
    current.process().once('exit', (code, signal) => resolve({ code, signal })),
  );
  await current.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].close());
  let timer;
  try {
    const result = await Promise.race([
      exit,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('Candidate did not close normally.')), 20000);
      }),
    ]);
    exits.push({ launch: launchCount, ...result });
    assert.deepEqual(result, { code: 0, signal: null });
    app = undefined;
  } finally {
    clearTimeout(timer);
  }
}

async function pagesPanel() {
  await page.getByRole('button', { name: 'Slide thumbnails', exact: true }).click();
  await page.locator('[data-hd-thumbnail-scroll]').waitFor();
}

async function mainSlide(index) {
  await saved();
  await page.locator('.hd-collection-select').selectOption('');
  await pagesPanel();
  await page.getByRole('textbox', { name: 'Search slide codes or titles', exact: true }).fill('');
  const section = index === 1 || index === 2 ? sectionA : index >= 3 ? sectionB : null;
  if (section && (await sectionToggle(section).getAttribute('aria-expanded')) === 'false')
    await sectionToggle(section).click();
  await thumbnail(ids[index]).click();
  await canvas().locator(`[data-pptd-page="${ids[index]}"]`).waitFor();
}

async function openProject() {
  await page.getByRole('button', { name: 'Project and Story', exact: true }).click();
  await project().waitFor();
}

async function saveProject(assertPersisted) {
  await project().getByRole('button', { name: 'Save project', exact: true }).click();
  await eventually(async () => {
    assertPersisted(await readProject());
    return true;
  });
  await eventually(
    async () =>
      !(await project().getByRole('button', { name: 'Save project', exact: true }).isEnabled()),
  );
  await saved();
}

function assertSections(data) {
  assert.equal(data.sections.length, 2);
  const alpha = data.sections.find((section) => section.id === sectionA);
  const beta = data.sections.find((section) => section.id === sectionB);
  assert.equal(alpha.startPageId, ids[1]);
  assert.equal(beta.startPageId, ids[3]);
  assert.equal(alpha.range, undefined);
  assert.equal(beta.range, undefined);
  assert.deepEqual(alpha.pageIds, ids.slice(1, 3));
  assert.deepEqual(beta.pageIds, ids.slice(3));
}

async function undoToOriginalOrder() {
  await canvas().focus();
  await page.keyboard.press(`${modifier}+z`);
  await eventually(async () => {
    assert.deepEqual(
      (await api('/session')).pages.map((item) => item.pageId),
      ids,
    );
    assertSections(await readProject());
    return true;
  });
  await saved();
}

async function insertAndUndo({ after, before, index, activation }) {
  const gap = page.locator(
    `[data-hd-insert-after="${after ?? ''}"][data-hd-insert-before="${before ?? ''}"]`,
  );
  assert.equal(await gap.getAttribute('aria-label'), `Insert blank slide at Position ${index + 1}`);
  const beforeProject = await readProject();
  if (activation === 'context') {
    await gap.click({ button: 'right' });
    await page.getByRole('menuitem', { name: 'Insert blank slide here', exact: true }).click();
  } else if (activation === 'keyboard') {
    await gap.focus();
    await page.keyboard.press('Enter');
  } else await gap.click();
  const addedId = await eventually(async () => {
    const actual = (await api('/session')).pages.map((item) => item.pageId);
    assert.equal(actual.length, ids.length + 1);
    const added = actual.filter((id) => !ids.includes(id));
    assert.equal(added.length, 1);
    assert.deepEqual(actual, [...ids.slice(0, index), added[0], ...ids.slice(index)]);
    return added[0];
  });
  await saved();
  const added = await api(`/pages/${addedId}`);
  assert.deepEqual(added.data.elements, []);
  const during = await readProject();
  assert.equal(during.sections.find((section) => section.id === sectionA).startPageId, ids[1]);
  assert.equal(during.sections.find((section) => section.id === sectionB).startPageId, ids[3]);
  if (index === 3)
    assert.deepEqual(
      (await api('/story-briefing')).organization.sections.find(
        (section) => section.id === sectionA,
      ).pageIds,
      [ids[1], ids[2], addedId],
    );
  observations.push({ insertion: { index, after, before, addedId, activation } });
  await undoToOriginalOrder();
  assert.deepEqual(await readProject(), beforeProject);
}

async function openFile(file) {
  await page.getByRole('button', { name: 'Project files', exact: true }).click();
  await page.locator(`[data-hd-project-file="${file}"]`).click();
  const preview = page.locator(`[data-hd-file-preview="${file}"]`);
  await preview.waitFor();
  return preview;
}

async function persisted(index, expected) {
  await eventually(async () => {
    const data = await disk(index);
    if (typeof expected === 'function') expected(data);
    else assert.deepEqual(data, expected);
    assert.deepEqual((await api(`/pages/${ids[index]}`)).data, data);
    return true;
  });
  await saved();
}

async function renderedTitleFont() {
  return canvas()
    .locator('[data-hd-element-id="title"] [data-hd-text-content]')
    .evaluate((element) => {
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (node.textContent.includes('Unique ')) {
          const style = getComputedStyle(node.parentElement);
          return {
            fontSize: style.fontSize,
            fontFamily: style.fontFamily,
            fontWeight: style.fontWeight,
          };
        }
      }
      return null;
    });
}

async function nativePreviewCommands(preview) {
  await page.evaluate(() => {
    const host = window.huandengDesktop;
    if (!host?.onEditCommand || !host.editNative)
      throw new Error('The candidate must expose its native edit bridge.');
    window.__huandengAcceptanceNativeEvents = [];
    window.__huandengAcceptanceDisposeNative = host.onEditCommand((command) => {
      window.__huandengAcceptanceNativeEvents.push(command);
    });
  });
  const commands = [];
  try {
    for (const command of ['undo', 'copy', 'paste']) {
      assert.equal(
        await preview.evaluate((element) => element.contains(document.activeElement)),
        true,
      );
      const selected = await app.evaluate(({ Menu, BrowserWindow }, action) => {
        const label = { undo: 'Undo', copy: 'Copy', paste: 'Paste' }[action];
        const edit = Menu.getApplicationMenu()?.items.find(
          (item) => item.label.replaceAll('&', '') === 'Edit',
        );
        const item = edit?.submenu?.items.find((item) => item.label.replaceAll('&', '') === label);
        if (!item?.enabled) throw new Error(`The native Edit menu does not expose ${label}.`);
        item.click(item, BrowserWindow.getAllWindows()[0], {});
        return { action, label: item.label, accelerator: item.accelerator };
      }, command);
      await eventually(async () =>
        page.evaluate(
          (action) => window.__huandengAcceptanceNativeEvents.includes(action),
          command,
        ),
      );
      commands.push(selected);
    }
  } finally {
    await page.evaluate(() => {
      window.__huandengAcceptanceDisposeNative?.();
      delete window.__huandengAcceptanceDisposeNative;
      delete window.__huandengAcceptanceNativeEvents;
    });
  }
  observations.push({ nativePreviewCommands: commands });
}

const originalSignature = await signature();

try {
  await check(
    'a packaged candidate opens only the isolated five-Slide synthetic Project',
    async () => {
      await launch();
      assert.equal(await page.locator('html').getAttribute('lang'), 'en');
      assert.deepEqual(await signature(), originalSignature);
      await capture('01-main-slides.png');
    },
  );

  await check(
    'first-Slide Sections save stable cover IDs and derive membership from the next cover',
    async () => {
      await mainSlide(1);
      await openProject();
      await project().getByRole('button', { name: 'New Section', exact: true }).click();
      let section = project().locator('[data-hd-project-section]').last();
      sectionA = await section.getAttribute('data-hd-project-section');
      assert.equal(await section.locator('[data-hd-section-membership]').inputValue(), 'cover');
      await section
        .getByRole('textbox', { name: 'Section name', exact: true })
        .fill('Section Alpha');
      await section.locator('select[id$="-start"]').selectOption(ids[1]);
      await section.locator('[data-hd-set-section-start]').click();
      await saveProject((data) => {
        assert.equal(data.sections[0].startPageId, ids[1]);
        assert.deepEqual(data.sections[0].pageIds, ids.slice(1));
      });
      await project().getByRole('button', { name: 'New Section', exact: true }).click();
      section = project().locator('[data-hd-project-section]').last();
      sectionB = await section.getAttribute('data-hd-project-section');
      await section
        .getByRole('textbox', { name: 'Section name', exact: true })
        .fill('Section Beta');
      await section.locator('select[id$="-start"]').selectOption(ids[3]);
      await section.locator('[data-hd-set-section-start]').click();
      await saveProject(assertSections);
      expectedProject = await readProject();
      assert.deepEqual(await signature(), originalSignature);
      await capture('02-first-slide-sections.png');
    },
  );

  await check(
    'normal close and reopen restore cover Sections and every original Main Slide',
    async () => {
      await closeNormally();
      await launch();
      assert.deepEqual(await readProject(), expectedProject);
      await pagesPanel();
      await sectionToggle(sectionA).waitFor();
      await sectionToggle(sectionB).waitFor();
      assert.deepEqual(await signature(), originalSignature);
    },
  );

  await check(
    'collapse retains the cover, keeps the active child selected and search reveals hidden members',
    async () => {
      await mainSlide(2);
      await sectionToggle(sectionA).click();
      assert.equal(await sectionToggle(sectionA).getAttribute('aria-expanded'), 'false');
      assert.equal(await thumbnail(ids[1]).count(), 1);
      assert.equal(await thumbnail(ids[2]).count(), 0);
      assert.equal(
        await canvas().locator('[data-pptd-page]').getAttribute('data-pptd-page'),
        ids[2],
      );
      await page
        .locator('[data-hd-section-heading]')
        .filter({ has: sectionToggle(sectionA) })
        .getByText('Current Slide', { exact: true })
        .waitFor();
      const search = page.getByRole('textbox', {
        name: 'Search slide codes or titles',
        exact: true,
      });
      await search.fill('Unique detail inside Alpha');
      await thumbnail(ids[2]).waitFor();
      assert.equal(await thumbnail(ids[1]).count(), 1);
      assert.equal(await sectionToggle(sectionA).getAttribute('aria-expanded'), 'true');
      assert.equal(await sectionToggle(sectionA).isDisabled(), true);
      assert.equal(await page.locator('[data-hd-insert-before]').count(), 0);
      await search.fill('');
      await eventually(async () => (await thumbnail(ids[2]).count()) === 0);
      assert.equal(await sectionToggle(sectionA).getAttribute('aria-expanded'), 'false');
      await capture('03-collapsed-cover.png');
    },
  );

  await check(
    'right-click before a cover inserts at that exact boundary and Undo restores its anchor',
    async () => {
      await insertAndUndo({ after: ids[0], before: ids[1], index: 1, activation: 'context' });
      assert.deepEqual(await signature(), originalSignature);
    },
  );

  await check(
    'keyboard insertion after a collapsed Section uses its last hidden member, then Undo restores the group',
    async () => {
      assert.equal(await sectionToggle(sectionA).getAttribute('aria-expanded'), 'false');
      assert.equal(await thumbnail(ids[2]).count(), 0);
      await insertAndUndo({ after: ids[2], before: ids[3], index: 3, activation: 'keyboard' });
      assert.equal(await sectionToggle(sectionA).getAttribute('aria-expanded'), 'false');
      assert.deepEqual(await signature(), originalSignature);
    },
  );

  await check(
    'clicking the first gap inserts before the first Main Slide and Undo restores Position 1',
    async () => {
      await insertAndUndo({ after: null, before: ids[0], index: 0, activation: 'click' });
      assert.deepEqual(await signature(), originalSignature);
    },
  );

  await check(
    'an empty Presentation saves successfully and shows central guidance without a top warning banner',
    async () => {
      await openProject();
      await project().getByRole('button', { name: 'New presentation', exact: true }).click();
      await project()
        .getByRole('textbox', { name: 'Presentation name', exact: true })
        .fill('Synthetic walkthrough');
      await saveProject((data) => {
        assert.equal(data.presentations.length, 1);
        assert.deepEqual(data.presentations[0].items, []);
        presentationId = data.presentations[0].id;
      });
      const empty = page.locator('[data-hd-empty-collection]');
      await empty.waitFor();
      await empty.getByRole('heading', { name: 'Synthetic walkthrough', exact: true }).waitFor();
      assert.match(await empty.innerText(), /Add sections or slides/i);
      await empty.getByRole('button', { name: 'Organize presentation', exact: true }).waitFor();
      assert.equal(await page.locator('.hd-collection-select').inputValue(), presentationId);
      assert.equal(await page.locator('[data-hd-recovery]').count(), 0);
      assert.equal(await page.locator('[data-hd-shared-slide-notice]').count(), 0);
      assert.equal(await page.locator('[data-hd-pending-drafts]').count(), 0);
      assert.equal(await page.locator('[data-hd-export]').isDisabled(), true);
      assert.equal(
        await page.getByRole('button', { name: 'Present', exact: true }).isDisabled(),
        true,
      );
      await capture('04-empty-presentation.png');
    },
  );

  await check(
    'slide selection has coherent open/close labels and matching Minus/Plus icons',
    async () => {
      await page
        .locator('[data-hd-empty-collection]')
        .getByRole('button', { name: 'Organize presentation', exact: true })
        .click();
      const toggle = project().locator('[data-hd-open-source-picker]');
      assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
      assert.equal((await toggle.innerText()).trim(), 'Close slide selection');
      assert.equal(await toggle.locator('svg.lucide-minus').count(), 1);
      await toggle.click();
      assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
      assert.equal((await toggle.innerText()).trim(), 'Add slides or Sections');
      assert.equal(await toggle.locator('svg.lucide-plus').count(), 1);
      assert.equal(await project().locator('[data-hd-source-picker]').count(), 0);
      await toggle.click();
      const picker = project().locator('[data-hd-source-picker]');
      await picker.locator(`[data-hd-add-main-slide="${ids[1]}"]`).click();
      await picker.locator(`[data-hd-add-section="${sectionB}"]`).click();
      await saveProject((data) => {
        assert.deepEqual(
          data.presentations[0].items.map((item) => item.kind),
          ['page', 'section'],
        );
        assert.equal(data.presentations[0].items[0].pageId, ids[1]);
        assert.equal(data.presentations[0].items[1].sectionId, sectionB);
      });
      await canvas().waitFor();
    },
  );

  await check(
    'Delete Presentation is beside its name, is discardable before save and keeps all Main Slides',
    async () => {
      const before = await readProject();
      const identities = (await metadata()).slides;
      const title = project().getByRole('textbox', { name: 'Presentation name', exact: true });
      const remove = project().getByRole('button', { name: 'Delete Presentation', exact: true });
      await title.scrollIntoViewIfNeeded();
      const [titleBox, removeBox] = await Promise.all([title.boundingBox(), remove.boundingBox()]);
      assert.ok(
        titleBox && removeBox && Math.abs(removeBox.y - titleBox.y) < 80,
        'Delete must be next to the Presentation name.',
      );
      assert.ok(
        removeBox.y >= 0 && removeBox.y + removeBox.height <= 1000,
        'Delete must be visible with the name.',
      );
      await remove.click();
      await project()
        .getByText(/Presentation removed from the draft/)
        .waitFor();
      assert.deepEqual(
        await readProject(),
        before,
        'Removing a draft reference must not commit before Save project.',
      );
      await project().getByRole('button', { name: 'Discard draft', exact: true }).click();
      await project().locator('select[id$="-collection"]').selectOption(presentationId);
      assert.equal(
        await project()
          .getByRole('textbox', { name: 'Presentation name', exact: true })
          .inputValue(),
        'Synthetic walkthrough',
      );
      assert.equal(await project().locator('[data-hd-presentation-item]').count(), 2);
      await project().getByRole('button', { name: 'Delete Presentation', exact: true }).click();
      await saveProject((data) => {
        assert.equal(data.presentations.length, 0);
        assertSections(data);
      });
      assert.deepEqual(
        (await api('/session')).pages.map((item) => item.pageId),
        ids,
      );
      assert.deepEqual((await metadata()).slides, identities);
      assert.deepEqual(await signature(), originalSignature);
      assert.equal(await page.locator('.hd-collection-select').inputValue(), '');
      await capture('05-presentation-removed.png');
    },
  );

  await check(
    'Project drafts use a compact header review button that opens draft management',
    async () => {
      await openProject();
      const section = project().locator(`[data-hd-project-section="${sectionA}"]`);
      await section
        .getByRole('textbox', { name: 'Section name', exact: true })
        .fill('Section Alpha draft');
      const pending = page.locator('header [data-hd-pending-drafts]');
      await pending.waitFor();
      assert.equal(await pending.getAttribute('aria-label'), 'Review unsaved drafts');
      assert.match(await pending.innerText(), /^Drafts \(1\)$/);
      assert.equal(await pending.evaluate((element) => element.tagName), 'BUTTON');
      const size = await pending.boundingBox();
      assert.ok(
        size && size.height <= 40 && size.width < 180,
        'Draft notice must remain a compact header action.',
      );
      assert.equal(await page.locator('[data-hd-recovery]').count(), 0);
      await pending.click();
      const dialog = page.getByRole('dialog', { name: 'Unsaved drafts', exact: true });
      await dialog.waitFor();
      await dialog.getByRole('heading', { name: 'Project organization', exact: true }).waitFor();
      await dialog.getByRole('button', { name: 'View project draft', exact: true }).click();
      assert.equal(
        await section.getByRole('textbox', { name: 'Section name', exact: true }).inputValue(),
        'Section Alpha draft',
      );
      await project().getByRole('button', { name: 'Discard draft', exact: true }).click();
      await eventually(async () => (await page.locator('[data-hd-pending-drafts]').count()) === 0);
      assertSections(await readProject());
    },
  );

  await check(
    'Files previews images and inert source text; preview keyboard and native menu edits leave the document unchanged',
    async () => {
      await mainSlide(2);
      await inspector().locator('[data-hd-inspector-tab="layers"]').click();
      await inspector().locator('[data-hd-layer="title"]').click();
      await canvas().locator('[data-hd-selection="title"]').waitFor();
      const before = await signature();
      const beforeData = await disk(2);
      const beforeMetadata = await metadata();
      const requests = documentWriteRequests;
      // Seed known text, then copy through the UI. A failed Copy must never expose a prior clipboard.
      await app.evaluate(({ clipboard }) =>
        clipboard.writeText('Synthetic file-preview clipboard fixture.'),
      );
      const copyPanel = await openFile('docs/notes.md');
      const copySource = copyPanel.locator('[data-hd-file-text]');
      await copySource.focus();
      await page.keyboard.press(`${modifier}+a`);
      await page.keyboard.press(`${modifier}+c`);
      const preview = await openFile(imagePath);
      const image = preview.locator('[data-hd-file-image]');
      await image.waitFor();
      await eventually(async () =>
        image.evaluate(
          (element) =>
            element.complete && element.naturalWidth === 32 && element.naturalHeight === 24,
        ),
      );
      await preview.getByRole('button', { name: 'Actual size', exact: true }).click();
      await preview.getByRole('button', { name: 'Fit image', exact: true }).click();
      await image.click();
      assert.equal(
        await preview.evaluate((element) => element.contains(document.activeElement)),
        true,
      );
      for (const keys of ['Delete', `${modifier}+z`, `${modifier}+v`])
        await page.keyboard.press(keys);
      await nativePreviewCommands(preview);
      // Cover the edit client's debounce window before declaring the non-editing keys inert.
      const settleUntil = Date.now() + 1000;
      while (Date.now() < settleUntil) {
        assert.equal(documentWriteRequests, requests);
        assert.deepEqual((await api(`/pages/${ids[2]}`)).data, beforeData);
        assert.deepEqual(await metadata(), beforeMetadata);
        assert.deepEqual(
          (await api('/session')).pages.map((item) => item.pageId),
          ids,
        );
        await new Promise((resolve) => setTimeout(resolve, 75));
      }
      await canvas().locator('[data-hd-selection="title"]').waitFor();
      assert.equal(await inspector().isVisible(), false);
      assert.equal(
        await canvas().locator('[data-pptd-page]').getAttribute('data-pptd-page'),
        ids[2],
      );
      await capture('06-image-preview.png');
      await preview.getByRole('button', { name: 'Close file preview', exact: true }).click();
      await inspector().waitFor();
      for (const [file, text] of Object.entries(sourceFiles)) {
        const panel = await openFile(file);
        const source = panel.locator('[data-hd-file-text]');
        await source.waitFor();
        // Textarea values normalize CRLF; the on-disk byte hash is checked separately.
        assert.equal(await source.inputValue(), text.replaceAll('\r\n', '\n'));
        assert.equal(await source.evaluate((element) => element.readOnly), true);
        assert.match(await panel.innerText(), /Read-only/);
        assert.equal(
          await canvas().locator('[data-pptd-page]').getAttribute('data-pptd-page'),
          ids[2],
        );
        await source.focus();
        await page.keyboard.press('Escape');
        await panel.waitFor({ state: 'detached' });
        await inspector().waitFor();
      }
      assert.equal(await page.evaluate(() => window.__huandengPreviewExecuted), undefined);
      await assert.rejects(fs.access(path.join(projectRoot, 'scripts/preview-executed.txt')), {
        code: 'ENOENT',
      });
      assert.deepEqual(await signature(), before);
      assert.equal(
        documentWriteRequests,
        requests,
        'Supporting-file preview must not submit transactions or Undo/Redo.',
      );
    },
  );

  await check(
    'closing a file preview restores right-docked Notes with their existing content',
    async () => {
      await page.getByRole('button', { name: 'Notes', exact: true }).click();
      let notes = page.locator('[data-hd-notes-dock]:visible');
      await notes.waitFor();
      if ((await notes.getAttribute('data-hd-notes-dock')) === 'bottom')
        await notes.getByRole('button', { name: 'Dock Notes on right', exact: true }).click();
      notes = page.locator('[data-hd-notes-dock="right"]:visible');
      await notes.waitFor();
      assert.equal(
        await notes.getByRole('textbox', { name: 'Speaker notes', exact: true }).inputValue(),
        fixtures[2].notes,
      );
      const preview = await openFile('docs/notes.md');
      await preview.locator('[data-hd-file-text]').waitFor();
      assert.equal(await notes.isVisible(), false);
      await preview.getByRole('button', { name: 'Close file preview', exact: true }).click();
      await notes.waitFor();
      assert.equal(
        await notes.getByRole('textbox', { name: 'Speaker notes', exact: true }).inputValue(),
        fixtures[2].notes,
      );
      await notes.getByRole('button', { name: 'Show Properties', exact: true }).click();
      await inspector().waitFor();
      assert.deepEqual(await signature(), originalSignature);
    },
  );

  await check(
    'Quick Layout changes the chosen title and its actual inline-rendered font; one Undo restores the Slide',
    async () => {
      await mainSlide(2);
      await inspector().locator('[data-hd-inspector-tab="properties"]').click();
      const quick = inspector().locator('[data-hd-quick-layout]');
      assert.notEqual(
        await quick.getAttribute('open'),
        null,
        'Quick Layout should be visible without opening two disclosures.',
      );
      const layout = quick.locator('[data-hd-title-layout]');
      await layout.scrollIntoViewIfNeeded();
      await layout.locator('select[id$="-reference-slide"]').selectOption(ids[0]);
      await layout.locator('select[id$="-reference-title"]').selectOption('title');
      await layout.locator('select[id$="-target-title"]').selectOption('title');
      const before = await disk(2);
      const reference = await disk(0);
      const requests = transactionRequests;
      const renderedTitle = canvas().locator('[data-hd-element-id="title"] [data-hd-text-content]');
      assert.equal(
        (await renderedTitleFont()).fontSize,
        '17px',
        'The fixture must exercise an imported inline font override.',
      );
      assert.equal(
        (await renderedTitleFont()).fontWeight,
        '400',
        'The fixture must exercise a normal inline weight.',
      );
      await layout.getByRole('button', { name: 'Apply to chosen title', exact: true }).click();
      await persisted(2, (data) => {
        const source = reference.elements[0];
        const target = data.elements[0];
        assert.deepEqual(target.bounds, source.bounds);
        for (const field of ['fontFamily', 'fontSize', 'color', 'bold'])
          assert.deepEqual(target.content[field], source.content[field]);
        assert.equal(
          target.content.text.replace(/<[^>]*>/g, ''),
          before.elements[0].content.text.replace(/<[^>]*>/g, ''),
        );
        assert.deepEqual(data.elements.slice(1), before.elements.slice(1));
        assert.equal(data.title, before.title);
        assert.equal(data.notes, before.notes);
      });
      await eventually(async () => {
        const font = await renderedTitleFont();
        assert.equal(font.fontSize, '32px');
        assert.match(font.fontFamily, /Times New Roman/);
        assert.equal(
          font.fontWeight,
          '700',
          'Captured bold must replace the uniform normal CSS baseline.',
        );
        return true;
      });
      assert.equal(await renderedTitle.locator('strong').innerText(), 'detail');
      assert.deepEqual(await disk(0), reference);
      assert.equal(
        transactionRequests,
        requests + 1,
        'One title style action must be a single document transaction.',
      );
      await layout.getByRole('status').filter({ hasText: 'Title style applied.' }).waitFor();
      await capture('07-title-style.png');
      await canvas().focus();
      await page.keyboard.press(`${modifier}+z`);
      await persisted(2, before);
      await eventually(async () => {
        const font = await renderedTitleFont();
        return font.fontSize === '17px' && font.fontWeight === '400';
      });
      assert.deepEqual(await signature(), originalSignature);
    },
  );

  await check(
    'Inspector Font preset overrides an imported inline font and one Undo restores its content and rendering',
    async () => {
      await mainSlide(2);
      await inspector().locator('[data-hd-inspector-tab="layers"]').click();
      await inspector().locator('[data-hd-layer="title"]').click();
      await canvas().locator('[data-hd-selection="title"]').waitFor();
      await inspector().locator('[data-hd-inspector-tab="properties"]').click();
      const before = await disk(2);
      const beforeFont = await renderedTitleFont();
      assert.equal(beforeFont.fontSize, '17px');
      assert.match(beforeFont.fontFamily, /Arial/);
      const requests = transactionRequests;
      const preset = inspector().getByRole('combobox', { name: 'Font preset', exact: true });
      await preset.selectOption('Georgia');
      await persisted(2, (data) => {
        const target = data.elements[0];
        assert.equal(target.content.fontFamily, '"Georgia", serif');
        assert.equal(
          target.content.text.replace(/<[^>]*>/g, ''),
          before.elements[0].content.text.replace(/<[^>]*>/g, ''),
        );
        assert.deepEqual(target.bounds, before.elements[0].bounds);
        assert.equal(target.content.fontSize, before.elements[0].content.fontSize);
        assert.equal(target.content.color, before.elements[0].content.color);
        assert.deepEqual(data.elements.slice(1), before.elements.slice(1));
        assert.equal(data.title, before.title);
        assert.equal(data.notes, before.notes);
      });
      await eventually(async () => {
        const font = await renderedTitleFont();
        assert.match(font.fontFamily, /Georgia/);
        assert.equal(font.fontSize, beforeFont.fontSize);
        return true;
      });
      assert.equal(
        await canvas().locator('[data-hd-element-id="title"] strong').innerText(),
        'detail',
      );
      assert.equal(transactionRequests, requests + 1);
      await capture('08-inspector-font-preset.png');
      await canvas().focus();
      await page.keyboard.press(`${modifier}+z`);
      await persisted(2, before);
      await eventually(async () => {
        assert.deepEqual(await renderedTitleFont(), beforeFont);
        return true;
      });
      assert.deepEqual(await signature(), originalSignature);
    },
  );

  await check(
    'Settings groups document and open-source fonts and reports an honest local availability check',
    async () => {
      const before = await signature();
      const requests = transactionRequests;
      await page.getByRole('button', { name: 'Workspace settings', exact: true }).click();
      const settings = page.locator('[data-hd-workspace-settings]');
      const fonts = settings.locator('[data-hd-font-library]');
      await fonts.scrollIntoViewIfNeeded();
      const choices = fonts.locator('[data-hd-font-presets]');
      assert.deepEqual(
        await choices.locator('optgroup').evaluateAll((nodes) => nodes.map((node) => node.label)),
        ['Document fonts', 'Open-source fonts', 'Generic families'],
      );
      await choices.selectOption('Arial');
      await choices.selectOption('Times New Roman');
      assert.equal(
        await fonts.locator('[data-hd-font-status]').getAttribute('data-hd-font-status'),
        'unverified',
      );
      await fonts.getByRole('button', { name: 'Check local fonts', exact: true }).click();
      const message = await eventually(async () => {
        const text = (await fonts.getByRole('status').innerText()).trim();
        return /^(Local font list checked\.|Font access was not allowed\.|This environment cannot list local fonts\.|The local font check could not finish\.)/.test(
          text,
        )
          ? text
          : false;
      }, 30000);
      assert.doesNotMatch(
        message,
        /^The local font check could not finish/,
        'An internal local-font error is not a successful check.',
      );
      const availability = await fonts
        .locator('[data-hd-font-status]')
        .getAttribute('data-hd-font-status');
      if (message.startsWith('Local font list checked.'))
        assert.ok(['installed', 'loaded', 'missing'].includes(availability));
      else
        assert.ok(
          ['loaded', 'unverified'].includes(availability),
          'Denied or unsupported access must not report an unverified font as missing.',
        );
      observations.push({ fonts: { message, selectedFamily: 'Times New Roman', availability } });
      await choices.selectOption('Source Sans 3');
      assert.equal(
        await fonts
          .getByRole('link', { name: 'Font source and license', exact: true })
          .getAttribute('href'),
        'https://github.com/adobe-fonts/source-sans',
      );
      await capture('09-font-settings.png');
      await page.keyboard.press('Escape');
      await settings.waitFor({ state: 'detached' });
      assert.deepEqual(await signature(), before);
      assert.equal(transactionRequests, requests);
    },
  );

  await check(
    'normal reopen preserves Sections, original Main Slide content and supporting files without deleted Presentation references',
    async () => {
      expectedProject = await readProject();
      assertSections(expectedProject);
      assert.equal(expectedProject.presentations.length, 0);
      await closeNormally();
      await launch();
      assert.deepEqual(await readProject(), expectedProject);
      assert.deepEqual(await signature(), originalSignature);
      await pagesPanel();
      await sectionToggle(sectionA).waitFor();
      await sectionToggle(sectionB).waitFor();
      await capture('10-original-project-reopened.png');
      assert.deepEqual(rendererErrors, []);
      await closeNormally();
      assert.equal(exits.length, 3);
    },
  );

  await check(
    'two missing Section covers remain diagnosable, a half-repair is rejected by the writer, and the complete draft saves once',
    async () => {
      await launch();
      await mainSlide(0);
      for (const [index, cover] of [ids[1], ids[3]].entries()) {
        await thumbnail(cover).click({ button: 'right' });
        await page.getByRole('menuitem', { name: 'Remove slide', exact: true }).click();
        await eventually(
          async () => (await api('/session')).pages.length === ids.length - index - 1,
        );
        await saved();
      }
      const survivors = [ids[0], ids[2], ids[4]];
      assert.deepEqual(
        (await api('/session')).pages.map((item) => item.pageId),
        survivors,
      );
      const issue = page.locator('[data-hd-section-issue]');
      await issue.waitFor();
      assert.match(await issue.innerText(), /Section boundaries need attention/);
      for (const id of survivors)
        assert.equal(
          await thumbnail(id).count(),
          1,
          'Missing covers must not hide surviving Main Slides.',
        );
      await capture('11-missing-cover-diagnostics.png');
      await issue.getByRole('button', { name: 'Review Sections', exact: true }).click();
      await project().waitFor();
      const before = await readProject();
      assert.equal(before.sections.find((section) => section.id === sectionA).startPageId, ids[1]);
      assert.equal(before.sections.find((section) => section.id === sectionB).startPageId, ids[3]);
      const alpha = project().locator(`[data-hd-project-section="${sectionA}"]`);
      await alpha.locator('select[id$="-start"]').selectOption(ids[2]);
      await alpha.locator('[data-hd-set-section-start]').click();
      const save = project().getByRole('button', { name: 'Save project', exact: true });
      await eventually(async () => save.isEnabled());
      const [response] = await Promise.all([
        page.waitForResponse(
          (response) =>
            response.request().method() === 'POST' &&
            /\/__pptd\/transactions$/.test(response.url()),
        ),
        save.click(),
      ]);
      const rejection = await response.json();
      assert.equal(response.status(), 400);
      assert.equal(rejection.code, 'INVALID_REQUEST');
      assert.ok(
        rejection.details?.diagnostics?.some(
          (diagnostic) => diagnostic.code === 'SECTION_END_UNRESOLVED',
        ),
      );
      await project().getByRole('status').filter({ hasText: 'cannot determine its end' }).waitFor();
      await eventually(async () => save.isEnabled());
      assert.deepEqual(
        await readProject(),
        before,
        'A rejected intermediate repair must not write half a Section model.',
      );
      assert.equal(
        await alpha.locator('select[id$="-start"]').inputValue(),
        ids[2],
        'The first repair must remain in the local draft after the writer rejects Save.',
      );
      assert.equal(
        await alpha.locator('[data-hd-set-section-start]').isDisabled(),
        true,
        'The repaired first boundary must already belong to the retained draft.',
      );
      await project().getByRole('button', { name: 'Discard draft', exact: true }).waitFor();
      await page.locator('[data-hd-pending-drafts]').waitFor();
      const beta = project().locator(`[data-hd-project-section="${sectionB}"]`);
      await beta.locator('select[id$="-start"]').selectOption(ids[4]);
      await beta.locator('[data-hd-set-section-start]').click();
      const requests = transactionRequests;
      await saveProject((data) => {
        assert.equal(data.sections.length, 2);
        const repairedAlpha = data.sections.find((section) => section.id === sectionA);
        const repairedBeta = data.sections.find((section) => section.id === sectionB);
        assert.equal(repairedAlpha.startPageId, ids[2]);
        assert.equal(repairedBeta.startPageId, ids[4]);
        assert.deepEqual(repairedAlpha.pageIds, [ids[2]]);
        assert.deepEqual(repairedBeta.pageIds, [ids[4]]);
        assert.equal(data.presentations.length, 0);
      });
      assert.equal(
        transactionRequests,
        requests + 1,
        'The complete two-cover repair must commit with one Save project.',
      );
      expectedProject = await readProject();
      observations.push({
        missingCoverRepair: {
          removed: [ids[1], ids[3]],
          replacements: [ids[2], ids[4]],
          rejectedCode: rejection.code,
          diagnostics: rejection.details.diagnostics.map((diagnostic) => diagnostic.code),
        },
      });
      await pagesPanel();
      await issue.waitFor({ state: 'detached' });
      await sectionToggle(sectionA).waitFor();
      await sectionToggle(sectionB).waitFor();
      for (const id of survivors) assert.equal(await thumbnail(id).count(), 1);
      await capture('12-repaired-sections.png');
      await closeNormally();
    },
  );

  await check(
    'normal reopen restores repaired Section covers while preserving survivor content and the removed cover identities',
    async () => {
      const survivors = [ids[0], ids[2], ids[4]];
      await launch(survivors);
      assert.deepEqual(await readProject(), expectedProject);
      const current = await metadata();
      for (const id of [ids[1], ids[3]]) assert.equal(current.slides[id].state, 'tombstone');
      const preservedFiles = [
        pagePaths[0],
        pagePaths[2],
        pagePaths[4],
        imagePath,
        ...Object.keys(sourceFiles),
      ];
      assert.deepEqual(
        await signature(preservedFiles),
        Object.fromEntries(preservedFiles.map((file) => [file, originalSignature[file]])),
      );
      for (const index of [0, 2, 4])
        assert.deepEqual((await api(`/pages/${ids[index]}`)).data, await disk(index));
      await pagesPanel();
      assert.equal(await page.locator('[data-hd-section-issue]').count(), 0);
      await sectionToggle(sectionA).waitFor();
      await sectionToggle(sectionB).waitFor();
      await capture('13-repaired-project-reopened.png');
      assert.deepEqual(rendererErrors, []);
      await closeNormally();
      assert.equal(exits.length, 5);
    },
  );
} catch (error) {
  failure = { message: error.message, stack: error.stack };
  if (page && !page.isClosed()) await capture('failure.png').catch(() => {});
} finally {
  const report = {
    harness: 'verify-authoring-v011',
    executablePath: path.resolve(executablePath),
    desktopAppOverride: process.env.HUANDENG_DESKTOP_APP || null,
    screenshotRedactions: ['Project root path'],
    passed: !failure,
    checks,
    rendererErrors,
    exits,
    screenshots,
    observations,
    identity,
    sandbox,
    entry,
    evidence,
    pageIds: ids,
    sectionA,
    sectionB,
    presentationId,
    expectedProject,
    transactionRequests,
    documentWriteRequests,
    coverageNotes: [
      'Missing-cover repair checks an actual rejected writer response, retained draft, one successful complete Save, and normal reopen.',
      'Preview edits exercise keyboard input and the native Edit menu handlers through the installed desktop bridge.',
      'Clipboard coverage writes and copies synthetic text; it never reads the prior clipboard.',
      'The font check records actual access and availability; it does not install fonts.',
    ],
    failure,
    processLog,
  };
  // Preserve evidence before cleanup: an actual dirty-draft close guard may reject close.
  await fs.writeFile(path.join(evidence, 'acceptance.json'), JSON.stringify(report, null, 2));
  process.stdout.write(
    `${JSON.stringify({ passed: report.passed, checks: checks.length, evidence, failure }, null, 2)}\n`,
  );
  if (failure) process.exitCode = 1;
  if (failure && app) {
    const ownedProcess = app.process();
    const exit =
      ownedProcess.exitCode !== null
        ? Promise.resolve({ code: ownedProcess.exitCode, signal: ownedProcess.signalCode })
        : new Promise((resolve) =>
            ownedProcess.once('exit', (code, signal) => resolve({ code, signal })),
          );
    let timer;
    try {
      void app.evaluate(({ app: isolatedApp }) => isolatedApp.exit(1)).catch(() => {});
      report.failureCleanup = await Promise.race([
        exit,
        new Promise((resolve) => {
          timer = setTimeout(() => resolve({ timedOut: true }), 5000);
        }),
      ]);
      if (report.failureCleanup.timedOut) ownedProcess.kill();
    } finally {
      clearTimeout(timer);
    }
    await fs.writeFile(path.join(evidence, 'acceptance.json'), JSON.stringify(report, null, 2));
  }
}
