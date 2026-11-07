// biome-ignore-all lint/suspicious/noUndeclaredEnvVars: Acceptance selects an isolated executable, profile, runtime and optional matching CLI.
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(root, 'packages/core/package.json'));
const { _electron: electron } = require('playwright');
const YAML = require('yaml');
const runFile = promisify(execFile);
const executablePath = process.env.HUANDENG_DESKTOP_EXE;
if (!executablePath)
  throw new Error('Set HUANDENG_DESKTOP_EXE to the isolated candidate executable.');
const cliPath = process.env.HUANDENG_CLI ?? path.join(root, 'packages/core/huandeng.js');
const sandbox = await fs.mkdtemp(path.join(os.tmpdir(), 'huandeng-project-assets-v06-'));
const projectRoot = path.join(sandbox, 'synthetic project');
const entry = path.join(projectRoot, 'deck.pptd');
const evidence = path.join(root, '.verification');
const reportPath = path.join(evidence, 'project-assets-v06.json');
const ids = [randomUUID(), randomUUID(), randomUUID()];
const codes = ['S18A', 'S18B', 'S18C'];
const pagePaths = ['pages/agenda.page', 'pages/evidence.page', 'pages/quality.page'];
const missingFamily = `HUANDENG_MISSING_FONT_${randomUUID().replaceAll('-', '')}`;
const emptyStory = { purpose: '', audience: '', takeaway: '' };
const sharedSource = 'media/figure.svg';
const anchorSource = 'media/anchor.svg';
const missingSource = 'media/missing-figure.svg';
const concurrentSource = 'media/concurrent-missing.svg';
const originalFigure =
  '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="144"><rect width="240" height="144" fill="#527f6e"/><circle cx="80" cy="72" r="32" fill="#ecf0e5"/></svg>';
const updatedFigure =
  '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="180"><rect width="300" height="180" fill="#b86045"/><circle cx="210" cy="90" r="44" fill="#f2d8b3"/></svg>';
const replacementFigure =
  '<svg xmlns="http://www.w3.org/2000/svg" width="360" height="240"><rect width="360" height="240" fill="#354f63"/><path d="M40 190L160 40L320 190Z" fill="#c7dedc"/></svg>';
const replacementPath = path.join(sandbox, 'replacement figure.svg');
const project = {
  schemaVersion: 1,
  mainStory: {
    purpose: 'Keep one source library and derive talks from it.',
    audience: 'Acceptance runner',
    takeaway: 'Stable content and precise occurrences',
  },
  sections: [{ id: 'evidence', title: '素材与排版', pageIds: [ids[1], ids[2]], story: emptyStory }],
  presentations: [
    {
      id: 'repeat-talk',
      title: '重复引用演讲',
      story: {
        purpose: 'Return to the agenda',
        audience: 'Seminar',
        takeaway: 'One page, two uses',
      },
      items: [
        { id: 'opening', kind: 'page', pageId: ids[0] },
        { id: 'middle', kind: 'page', pageId: ids[1] },
        {
          id: 'return',
          kind: 'page',
          pageId: ids[0],
          notes: '第二次使用目录页：这里是本次引用的独立讲稿。',
        },
      ],
    },
    {
      id: 'section-talk',
      title: '按章节引用演讲',
      story: emptyStory,
      items: [{ id: 'chapter', kind: 'section', sectionId: 'evidence' }],
    },
  ],
};
const image = (elementId, src, bounds, sourceName) => ({
  elementId,
  elementType: 'image',
  src,
  bounds,
  sourceName,
  fit: { mode: 'contain' },
});
const title = (elementId, text) => ({
  elementId,
  elementType: 'text',
  bounds: [50, 40, 850, 60],
  content: { text, fontSize: 28, fontFamily: 'sans-serif' },
});
const pages = [
  {
    elements: [
      title('agenda-title', '项目与素材验收 · 合成目录页'),
      image('figure-a', sharedSource, [50, 140, 240, 144], 'Origin Figure.svg'),
      {
        ...image('missing-image', missingSource, [370, 130, 240, 160], 'Missing figure.svg'),
        rotation: 7,
        opacity: 0.84,
        crop: { left: 0.1, top: 0.05, right: 0.15, bottom: 0.08 },
        fit: { mode: 'cover' },
        fixturePreserve: { placement: 'author' },
      },
      image('missing-cas', concurrentSource, [660, 150, 210, 140], 'Concurrent missing.svg'),
    ],
    notes: 'Main 原始讲稿。',
    fixturePreserve: true,
  },
  {
    elements: [
      title('caption', '素材复用与资源身份验收'),
      image('figure-b', sharedSource, [70, 150, 240, 144], 'Origin Figure.svg'),
      image('anchor', anchorSource, [650, 160, 140, 140], 'Unchanged anchor.svg'),
    ],
    notes: 'Asset identity fixture.',
    fixturePreserve: true,
  },
  {
    elements: [
      {
        elementId: 'theme-inherited',
        elementType: 'text',
        bounds: [50, 55, 850, 65],
        content: { style: '$qaInherited', text: 'Inherited font evidence from the project theme' },
      },
      {
        elementId: 'overflow',
        elementType: 'text',
        bounds: [50, 190, 180, 28],
        content: {
          text: 'Intentional overflow makes the measured text much wider than its frame.',
          fontFamily: 'sans-serif',
          fontSize: 24,
          wrap: false,
        },
      },
      {
        elementId: 'quality-caption',
        elementType: 'text',
        bounds: [50, 290, 800, 60],
        content: {
          text: 'Only synthetic text is used in these checks.',
          fontFamily: 'sans-serif',
          fontSize: 22,
        },
      },
    ],
    notes: 'Font and overflow acceptance.',
    fixturePreserve: true,
  },
];
await fs.mkdir(path.join(projectRoot, 'pages'), { recursive: true });
await fs.mkdir(path.join(projectRoot, 'media'), { recursive: true });
await fs.mkdir(path.join(projectRoot, '.huandeng'), { recursive: true });
await fs.mkdir(evidence, { recursive: true });
await fs.writeFile(
  entry,
  YAML.stringify({
    title: 'HUANDENG 项目素材验收',
    size: [960, 540],
    pages: pagePaths,
    theme: {
      textStyles: {
        qaInherited: { fontFamily: `${missingFamily}, sans-serif`, fontSize: 28, color: '#27342d' },
      },
    },
  }),
);
for (const [index, file] of pagePaths.entries())
  await fs.writeFile(path.join(projectRoot, file), YAML.stringify(pages[index]));
await fs.writeFile(path.join(projectRoot, sharedSource), originalFigure);
await fs.writeFile(
  path.join(projectRoot, anchorSource),
  '<svg xmlns="http://www.w3.org/2000/svg" width="140" height="140"><rect width="140" height="140" fill="#c8dcce"/></svg>',
);
await fs.writeFile(
  path.join(projectRoot, 'media/unused.svg'),
  '<svg xmlns="http://www.w3.org/2000/svg" width="60" height="40"><rect width="60" height="40" fill="#d8c5a5"/></svg>',
);
await fs.writeFile(replacementPath, replacementFigure);
await fs.writeFile(
  path.join(projectRoot, '.huandeng/project.json'),
  JSON.stringify(
    {
      schemaVersion: 1,
      deckId: randomUUID(),
      entry: 'deck.pptd',
      project,
      slides: Object.fromEntries(
        ids.map((id, index) => [
          id,
          {
            shortCode: codes[index],
            label: `S${index + 1}`,
            path: pagePaths[index],
            state: 'active',
            designIntent: {
              purpose: `Synthetic acceptance page ${index + 1}`,
              keep: ['Preserve source figures and existing geometry'],
            },
          },
        ]),
      ),
    },
    null,
    2,
  ),
);

const launchEnv = {
  ...process.env,
  HUANDENG_DESKTOP_DATA_DIR: path.join(sandbox, 'profile'),
  HUANDENG_RUNTIME_DIR: path.join(sandbox, 'runtime'),
};
delete launchEnv.ELECTRON_RUN_AS_NODE;
const checks = [];
const rendererErrors = [];
const processLog = [];
const resourceEvidence = {};
const fontEvidence = {};
let application;
let page;
let serviceUrl;
let sessionToken;
let electronVersion;
let normalExit;
let reusedId;

async function eventually(fn, timeout = 20000) {
  const deadline = Date.now() + timeout;
  let last;
  while (Date.now() < deadline) {
    try {
      const value = await fn();
      if (value) return value;
    } catch (error) {
      last = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 75));
  }
  throw last ?? new Error('Timed out waiting for project/assets acceptance state.');
}
async function check(name, fn) {
  const start = Date.now();
  try {
    await fn();
    checks.push({ name, passed: true, milliseconds: Date.now() - start });
    process.stdout.write(`PASS ${name}\n`);
  } catch (error) {
    checks.push({ name, passed: false, milliseconds: Date.now() - start, error: String(error) });
    throw error;
  }
}
async function response(route, body) {
  const result = await fetch(`${serviceUrl}/__pptd${route}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'content-type': 'application/json', 'x-huandeng-token': sessionToken ?? '' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { status: result.status, ok: result.ok, body: await result.json() };
}
async function api(route, body) {
  const result = await response(route, body);
  assert.ok(result.ok && result.body.ok !== false, `${route}: ${JSON.stringify(result.body)}`);
  if (typeof result.body.sessionToken === 'string') sessionToken = result.body.sessionToken;
  return result.body;
}
async function postOperations(operations) {
  const snapshot = await api('/session');
  return api('/transactions', {
    requestId: randomUUID(),
    deckId: snapshot.deckId,
    actor: 'project-assets-v06-fixture',
    originClientId: 'project-assets-v06-fixture',
    expected: {
      manifest: snapshot.manifestRevision,
      metadata: snapshot.metadataRevision,
      pages: Object.fromEntries(snapshot.pages.map((item) => [item.pageId, item.pageRevision])),
    },
    operations,
  });
}
const canvas = () => page.locator('[data-hd-editor-canvas]');
const object = (id) => canvas().locator(`[data-hd-element-id="${id}"]`);
const library = () => page.locator('[data-hd-asset-library]');
const assetCard = (source) => library().locator(`[data-hd-asset-path="${source}"]`);
const assetDetail = (source) => library().locator(`[data-hd-asset-detail="${source}"]`);
const preview = (source) => library().locator(`[data-hd-asset-preview="${source}"]`);
const overview = () => page.locator('[data-hd-project-overview]');
const qa = () => page.locator('[data-hd-technical-qa]');
const disk = async (index) =>
  YAML.parse(await fs.readFile(path.join(projectRoot, pagePaths[index]), 'utf8'));
const element = async (index, id) =>
  (await disk(index)).elements.find((item) => item.elementId === id);
const selectedIds = () =>
  canvas()
    .locator('[data-hd-selection]')
    .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-hd-selection')));
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
async function mediaInventory() {
  const files = await fs.readdir(path.join(projectRoot, 'media'), {
    recursive: true,
    withFileTypes: true,
  });
  const result = [];
  for (const file of files)
    if (file.isFile()) {
      const absolute = path.join(file.parentPath ?? file.path, file.name);
      result.push([
        path.relative(projectRoot, absolute).replaceAll('\\', '/'),
        hash(await fs.readFile(absolute)),
      ]);
    }
  return result.sort(([a], [b]) => a.localeCompare(b));
}
async function saved() {
  await eventually(async () =>
    (await page.locator('[data-hd-save-status]').innerText()).includes('已保存'),
  );
}
async function mainPage(index) {
  await page.getByLabel('当前演讲集合', { exact: true }).selectOption('');
  await page.getByRole('button', { name: '页面缩略图', exact: true }).click();
  await page.locator(`[data-hd-thumbnail="${ids[index]}"]`).click();
  await eventually(
    async () =>
      (await canvas().locator('[data-pptd-page]').getAttribute('data-pptd-page')) === ids[index],
  );
}
async function openAssets(query, filter = 'all') {
  await page.getByRole('button', { name: '项目素材库', exact: true }).click();
  await library().getByLabel('素材筛选', { exact: true }).selectOption(filter);
  await library().getByRole('searchbox').fill(query);
  await eventually(async () => (await library().getAttribute('aria-busy')) === 'false');
}
async function waitImage(locator) {
  await eventually(
    async () => await locator.evaluate((node) => node.complete && node.naturalWidth > 0),
  );
}
async function canvasImages() {
  const images = await canvas()
    .locator('img')
    .evaluateAll((nodes) =>
      nodes.map((node) => ({
        id: node.closest('[data-hd-element-id]')?.getAttribute('data-hd-element-id'),
        src: node.src,
        width: node.naturalWidth,
        height: node.naturalHeight,
        complete: node.complete,
      })),
    );
  assert.ok(
    images.length > 0,
    'The positive image-identity check must include actual canvas images.',
  );
  assert.ok(
    images.every((image) => image.complete && image.width > 0),
    'Canvas images must be decoded before comparing resource identity.',
  );
  return images.sort((a, b) => String(a.id).localeCompare(String(b.id)));
}
async function editText(id, value, index) {
  await object(id).focus();
  await page.keyboard.press('Enter');
  const inline = page.locator('[data-hd-inline-editor]');
  await inline.waitFor();
  await inline.fill(value);
  await inline.press('Escape');
  await inline.waitFor({ state: 'detached' });
  await eventually(async () => (await element(index, id))?.content.text === value);
  await saved();
}
async function chooseReplacement(source) {
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    assetDetail(source).getByRole('button', { name: '重新选择这处图片', exact: true }).click(),
  ]);
  return chooser;
}
async function runCli(args) {
  const result = await runFile(
    process.execPath,
    [cliPath, '--entry', entry, '--url', serviceUrl, ...args],
    { cwd: root, env: launchEnv, maxBuffer: 8 * 1024 * 1024 },
  );
  assert.equal(result.stderr, '');
  return JSON.parse(result.stdout);
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
  application.process().stderr?.on('data', (data) => processLog.push(String(data)));
  page = await application.firstWindow();
  page.setDefaultTimeout(15000);
  page.on('pageerror', (error) => rendererErrors.push(error.message));
  await canvas().waitFor({ timeout: 120000 });
  const context = await page.evaluate(() => window.huandengDesktop.getContext());
  assert.equal(path.resolve(context.entryPath).toLowerCase(), path.resolve(entry).toLowerCase());
  serviceUrl = context.serviceUrl;
  const initial = await api('/session');
  assert.equal(initial.pages.length, 3);
  assert.equal(initial.writable, true);
  const initialMetadata = await fs.readFile(
    path.join(projectRoot, '.huandeng/project.json'),
    'utf8',
  );
  electronVersion = await application.evaluate(() => process.versions.electron);
  await application.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()[0].setContentSize(1600, 1000),
  );
  await mainPage(0);

  await check(
    'project cards switch Main and two derived presentations inside one project',
    async () => {
      await page.getByRole('button', { name: '项目与故事', exact: true }).click();
      assert.equal(await overview().locator('[data-hd-presentation-card]').count(), 3);
      await overview().scrollIntoViewIfNeeded();
      await page.screenshot({
        path: path.join(evidence, 'project-assets-v06-overview.png'),
        animations: 'disabled',
      });
      await overview().locator('[data-hd-presentation-card="repeat-talk"]').click();
      await eventually(
        async () =>
          (await page.getByLabel('当前演讲集合', { exact: true }).inputValue()) === 'repeat-talk',
      );
      const repeated = await api('/presentations/repeat-talk');
      assert.deepEqual(
        repeated.pages.map((item) => item.pageId),
        [ids[0], ids[1], ids[0]],
      );
      assert.equal(repeated.deckId, initial.deckId);
      await overview().locator('[data-hd-presentation-card="section-talk"]').click();
      await eventually(
        async () => new URL(page.url()).searchParams.get('presentation') === 'section-talk',
      );
      assert.deepEqual(
        (await api('/presentations/section-talk')).pages.map((item) => item.pageId),
        [ids[1], ids[2]],
      );
      await overview().locator('[data-hd-presentation-card="main"]').click();
      await eventually(async () => !new URL(page.url()).searchParams.has('presentation'));
      assert.equal((await api('/session')).deckId, initial.deckId);
    },
  );

  await check(
    'used-by and resolved-order buttons open the exact repeated occurrence and its notes',
    async () => {
      const opening = `repeat-talk:opening:${ids[0]}`;
      const returning = `repeat-talk:return:${ids[0]}`;
      await overview().locator(`[data-hd-project-usage="${returning}"]`).click();
      await eventually(
        async () => new URL(page.url()).searchParams.get('occurrence') === returning,
      );
      await page.locator(`[data-hd-project-occurrence="${opening}"]`).click();
      await eventually(async () => new URL(page.url()).searchParams.get('occurrence') === opening);
      await page.locator(`[data-hd-project-occurrence="${returning}"]`).click();
      await eventually(
        async () => new URL(page.url()).searchParams.get('occurrence') === returning,
      );
      await canvas().focus();
      await page.keyboard.press('Shift+F5');
      await page.locator('[data-hd-presenter]').waitFor();
      await eventually(
        async () =>
          (await page
            .locator('[data-hd-presenter-occurrence]')
            .getAttribute('data-hd-presenter-occurrence')) === returning,
      );
      if (!(await page.locator('[data-hd-presenter-note-text]').count()))
        await page
          .locator('[data-hd-presenter]')
          .getByRole('button', { name: '演讲者备注', exact: true })
          .click();
      assert.equal(
        await page.locator('[data-hd-presenter-note-text]').innerText(),
        project.presentations[0].items[2].notes,
      );
      await page.keyboard.press('Escape');
      await page.locator('[data-hd-presenter]').waitFor({ state: 'detached' });
      assert.equal(
        await fs.readFile(path.join(projectRoot, '.huandeng/project.json'), 'utf8'),
        initialMetadata,
      );
      assert.equal((await disk(0)).notes, pages[0].notes);
      await page.screenshot({
        path: path.join(evidence, 'project-assets-v06-project.png'),
        animations: 'disabled',
      });
    },
  );

  await check(
    'asset search finds original source names and used-by navigates to a Main image',
    async () => {
      await mainPage(0);
      await openAssets('Origin Figure', 'used');
      await assetCard(sharedSource).waitFor();
      assert.equal(await library().locator('[data-hd-asset-path]').count(), 1);
      await assetCard(sharedSource).click();
      await waitImage(preview(sharedSource));
      const assets = await api('/assets?query=Origin+Figure&filter=used');
      assert.equal(assets.total, 1);
      assert.match(assets.items[0].previewRevision, /^sha256:/);
      assert.equal(assets.items[0].usage.length, 2);
      await assetDetail(sharedSource)
        .locator(`[data-hd-asset-usage="${ids[1]}:figure-b:src"]`)
        .click();
      await eventually(
        async () =>
          new URL(page.url()).searchParams.get('page') === ids[1] &&
          !new URL(page.url()).searchParams.has('presentation'),
      );
      await eventually(async () => (await selectedIds()).includes('figure-b'));
      await waitImage(object('figure-b').locator('img'));
    },
  );

  await check('reusing an indexed asset adds one reference and copies no asset bytes', async () => {
    const beforeFiles = await mediaInventory();
    const before = await disk(1);
    await assetDetail(sharedSource)
      .getByRole('button', { name: '复用到当前页', exact: true })
      .click();
    await eventually(async () => (await disk(1)).elements.length === before.elements.length + 1);
    await saved();
    const reused = (await disk(1)).elements.find(
      (item) => !before.elements.some((old) => old.elementId === item.elementId),
    );
    assert.equal(reused.elementType, 'image');
    assert.equal(reused.src, sharedSource);
    assert.deepEqual(reused.bounds.slice(2), [240, 144]);
    reusedId = reused.elementId;
    assert.deepEqual(await mediaInventory(), beforeFiles);
    for (const old of before.elements) assert.deepEqual(await element(1, old.elementId), old);
    await waitImage(object(reusedId).locator('img'));
    assert.equal((await api('/assets?query=Origin+Figure&filter=used')).items[0].usage.length, 3);
  });

  await check(
    'text editing on a page with decoded images preserves canvas and library image URLs',
    async () => {
      await eventually(async () => (await library().getAttribute('aria-busy')) === 'false');
      await waitImage(preview(sharedSource));
      const before = await canvasImages();
      assert.ok(before.length >= 3);
      const previewBefore = await preview(sharedSource).getAttribute('src');
      const revisionBefore = (await api(`/pages/${ids[1]}`)).pageRevision;
      await editText('caption', 'Same-page text edit keeps asset resources stable.', 1);
      await eventually(async () => (await library().getAttribute('aria-busy')) === 'false');
      const after = await canvasImages();
      assert.deepEqual(after, before);
      assert.equal(await preview(sharedSource).getAttribute('src'), previewBefore);
      assert.notEqual((await api(`/pages/${ids[1]}`)).pageRevision, revisionBefore);
      resourceEvidence.imageCount = before.length;
      resourceEvidence.beforeText = before;
      resourceEvidence.afterText = after;
      resourceEvidence.previewBeforeText = previewBefore;
      resourceEvidence.previewAfterText = await preview(sharedSource).getAttribute('src');
    },
  );

  await check(
    'same-path asset replacement updates only that resource and refreshes visible previews',
    async () => {
      const before = await canvasImages();
      const previewBefore = await preview(sharedSource).getAttribute('src');
      const beforePage = await fs.readFile(path.join(projectRoot, pagePaths[1]), 'utf8');
      const beforeAsset = (await api('/assets?query=Origin+Figure')).items[0];
      await fs.writeFile(path.join(projectRoot, sharedSource), updatedFigure);
      await eventually(
        async () =>
          (await api('/assets?query=Origin+Figure')).items[0].previewRevision !==
          beforeAsset.previewRevision,
      );
      const previousSource = before.find((image) => image.id === 'figure-b').src;
      await eventually(
        async () =>
          (await object('figure-b')
            .locator('img')
            .evaluate((node) => node.src)) !== previousSource,
      );
      await eventually(
        async () =>
          await object('figure-b')
            .locator('img')
            .evaluate((node) => node.complete && node.naturalWidth === 300),
      );
      await eventually(
        async () => (await preview(sharedSource).getAttribute('src')) !== previewBefore,
      );
      await eventually(
        async () =>
          await preview(sharedSource).evaluate(
            (node) => node.complete && node.naturalWidth === 300,
          ),
      );
      const after = await canvasImages();
      for (const id of ['figure-b', reusedId])
        assert.notEqual(
          after.find((item) => item.id === id).src,
          before.find((item) => item.id === id).src,
        );
      assert.equal(
        after.find((item) => item.id === 'anchor').src,
        before.find((item) => item.id === 'anchor').src,
      );
      assert.equal(await fs.readFile(path.join(projectRoot, pagePaths[1]), 'utf8'), beforePage);
      assert.equal(
        hash(await fs.readFile(path.join(projectRoot, sharedSource))),
        hash(updatedFigure),
      );
      resourceEvidence.afterAssetChange = after;
      resourceEvidence.previewAfterAssetChange = await preview(sharedSource).getAttribute('src');
      resourceEvidence.assetRevisionAfterChange = (
        await api('/assets?query=Origin+Figure')
      ).items[0].previewRevision;
    },
  );

  await check(
    'missing image repair imports exact bytes and preserves bounds, crop and other objects',
    async () => {
      await mainPage(0);
      await openAssets('missing-figure.svg', 'missing');
      await assetCard(missingSource).click();
      const before = await disk(0);
      const previous = before.elements.find((item) => item.elementId === 'missing-image');
      const chooser = await chooseReplacement(missingSource);
      await chooser.setFiles(replacementPath);
      await eventually(async () =>
        (await element(0, 'missing-image')).src.startsWith('media/imported/'),
      );
      await saved();
      const repaired = await element(0, 'missing-image');
      assert.deepEqual(
        { ...repaired, src: previous.src, sourceName: previous.sourceName },
        previous,
      );
      assert.equal(repaired.sourceName, path.basename(replacementPath));
      assert.equal(
        await fs.readFile(path.join(projectRoot, repaired.src), 'utf8'),
        replacementFigure,
      );
      for (const old of before.elements.filter((item) => item.elementId !== 'missing-image'))
        assert.deepEqual(await element(0, old.elementId), old);
      assert.equal((await api('/assets?filter=missing')).counts.missing, 1);
      await waitImage(object('missing-image').locator('img'));
      const view = await api('/presentations/repeat-talk');
      assert.equal(
        view.pages[0].data.elements.find((item) => item.elementId === 'missing-image').src,
        repaired.src,
      );
      assert.equal(
        view.pages[2].data.elements.find((item) => item.elementId === 'missing-image').src,
        repaired.src,
      );
    },
  );

  await check(
    'a stale missing-image replacement conflicts; retry keeps the intervening edit',
    async () => {
      await openAssets('concurrent-missing.svg', 'missing');
      await assetCard(concurrentSource).click();
      const before = await element(0, 'missing-cas');
      const chooser = await chooseReplacement(concurrentSource);
      await postOperations([
        {
          op: 'element.patch',
          pageId: ids[0],
          elementId: 'agenda-title',
          set: { 'content.text': 'Intervening human edit must survive the repair.' },
        },
      ]);
      await eventually(async () =>
        (await object('agenda-title').innerText()).includes('Intervening human edit'),
      );
      const conflictResponse = page
        .waitForResponse(
          (result) =>
            new URL(result.url()).pathname === '/__pptd/transactions' &&
            result.request().method() === 'POST' &&
            result.status() === 409,
        )
        .catch((error) => error);
      await chooser.setFiles(replacementPath);
      const rejected = await conflictResponse;
      if (rejected instanceof Error) throw rejected;
      assert.equal((await rejected.json()).code, 'REVISION_CONFLICT');
      assert.deepEqual(await element(0, 'missing-cas'), before);
      await library().getByRole('alert').waitFor();
      assert.ok((await library().getByRole('alert').innerText()).trim());
      await eventually(async () => (await library().getAttribute('aria-busy')) === 'false');
      assert.ok(
        (await library().getByRole('alert').innerText()).trim(),
        'Background refresh must retain the action conflict.',
      );
      await (await chooseReplacement(concurrentSource)).setFiles(replacementPath);
      await eventually(async () =>
        (await element(0, 'missing-cas')).src.startsWith('media/imported/'),
      );
      await saved();
      const repaired = await element(0, 'missing-cas');
      assert.deepEqual({ ...repaired, src: before.src, sourceName: before.sourceName }, before);
      assert.equal(
        (await element(0, 'agenda-title')).content.text,
        'Intervening human edit must survive the repair.',
      );
      assert.equal(repaired.src, (await element(0, 'missing-image')).src);
      assert.equal((await fs.readdir(path.join(projectRoot, 'media/imported'))).length, 1);
      assert.equal((await api('/assets?filter=missing')).counts.missing, 0);
    },
  );

  await check(
    'CLI briefing and asset reads match exact occurrences without rewriting the project',
    async () => {
      const before = await Promise.all([
        fs.readFile(path.join(projectRoot, '.huandeng/project.json'), 'utf8'),
        ...pagePaths.map((file) => fs.readFile(path.join(projectRoot, file), 'utf8')),
      ]);
      const returning = `repeat-talk:return:${ids[0]}`;
      const brief = await runCli([
        'brief',
        codes[0],
        '--presentation',
        'repeat-talk',
        '--occurrence',
        returning,
      ]);
      assert.equal(brief.occurrence.occurrenceId, returning);
      assert.equal(brief.occurrence.position, 3);
      assert.equal(brief.page.notes, project.presentations[0].items[2].notes);
      assert.equal(brief.usedBy.length, 3);
      const ambiguous = await response(
        `/story-briefing?pageId=${ids[0]}&presentationId=repeat-talk`,
      );
      assert.equal(ambiguous.ok, false);
      assert.equal(ambiguous.body.code, 'AMBIGUOUS_ID');
      assert.equal(ambiguous.body.details.occurrences.length, 2);
      const assets = await runCli(['assets', '--query', 'Origin Figure', '--filter', 'used']);
      assert.equal(assets.total, 1);
      assert.equal(assets.items[0].usage.length, 3);
      assert.deepEqual(
        await Promise.all([
          fs.readFile(path.join(projectRoot, '.huandeng/project.json'), 'utf8'),
          ...pagePaths.map((file) => fs.readFile(path.join(projectRoot, file), 'utf8')),
        ]),
        before,
      );
    },
  );

  await check(
    'the real font button detects the deliberately missing inherited theme font',
    async () => {
      await mainPage(2);
      const before = await fs.readFile(path.join(projectRoot, pagePaths[2]), 'utf8');
      assert.equal((await element(2, 'theme-inherited')).content.fontFamily, undefined);
      fontEvidence.computedInheritedFont = await object('theme-inherited')
        .locator('[data-hd-text-content]')
        .evaluate((node) => getComputedStyle(node).fontFamily);
      assert.ok(fontEvidence.computedInheritedFont.includes(missingFamily));
      await qa().getByRole('button', { name: '检查本页字体与排版', exact: true }).click();
      await eventually(async () => (await qa().innerText()).includes('已测量'));
      assert.ok((await qa().innerText()).includes('已核对本机字体与已加载的网页字体。'));
      const issue = qa().locator('[data-hd-qa-code="QA_FONT_FALLBACK"]');
      assert.ok(await issue.count());
      const issueText = await issue.allTextContents();
      assert.ok(
        issueText.some((text) => text.includes(missingFamily) && text.includes('sans-serif')),
      );
      fontEvidence.missingFamily = missingFamily;
      fontEvidence.fallbackMessages = issueText;
      fontEvidence.inventoryVerified = true;
      assert.equal(await fs.readFile(path.join(projectRoot, pagePaths[2]), 'utf8'), before);
    },
  );

  await check(
    'overflow results locate the object and expire after content or page changes',
    async () => {
      const resultDetails = qa().locator('details').first();
      if ((await resultDetails.getAttribute('open')) === null)
        await resultDetails.locator('summary').click();
      const warning = qa()
        .locator('[data-hd-qa-code="QA_TEXT_OVERFLOW"]')
        .filter({ has: page.getByRole('button', { name: '定位对象 overflow', exact: true }) });
      await warning.getByRole('button', { name: '定位对象 overflow', exact: true }).click();
      await eventually(async () => (await selectedIds()).includes('overflow'));
      assert.ok((await qa().innerText()).includes('已测量'));
      await page.screenshot({
        path: path.join(evidence, 'project-assets-v06-quality.png'),
        animations: 'disabled',
      });
      await editText('overflow', 'Short', 2);
      await eventually(async () =>
        (await qa().innerText()).includes('页面内容已改变，请重新检查。'),
      );
      assert.equal(await qa().locator('[data-hd-qa-code="QA_TEXT_OVERFLOW"]').count(), 0);
      await qa().getByRole('button', { name: '检查本页字体与排版', exact: true }).click();
      await eventually(async () => (await qa().innerText()).includes('已测量'));
      assert.equal(await qa().locator('[data-hd-qa-code="QA_TEXT_OVERFLOW"]').count(), 0);
      await mainPage(0);
      assert.ok((await qa().innerText()).includes('本机字体与文字实际排版尚未检查。'));
      assert.equal(await qa().locator('[data-hd-qa-code="QA_FONT_FALLBACK"]').count(), 0);
      await mainPage(2);
      assert.ok((await qa().innerText()).includes('本机字体与文字实际排版尚未检查。'));
    },
  );

  assert.deepEqual(rendererErrors, []);
  await saved();
  await mainPage(1);
  await openAssets('Origin Figure', 'used');
  await assetCard(sharedSource).click();
  await waitImage(preview(sharedSource));
  await page.screenshot({
    path: path.join(evidence, 'project-assets-v06.png'),
    animations: 'disabled',
  });
  const exited = new Promise((resolve) =>
    application.process().once('exit', (code, signal) => resolve({ code, signal })),
  );
  await application.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].close());
  normalExit = await Promise.race([
    exited,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Candidate did not close normally.')), 20000),
    ),
  ]);
  assert.deepEqual(normalExit, { code: 0, signal: null });
  application = undefined;
  const report = {
    passed: true,
    timestamp: new Date().toISOString(),
    executablePath,
    cliPath,
    electronVersion,
    sandbox,
    entry,
    syntheticOnly: true,
    checks,
    resourceEvidence,
    fontEvidence,
    rendererErrors,
    normalExit,
  };
  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} catch (error) {
  await page
    ?.screenshot({ path: path.join(evidence, 'project-assets-v06-failure.png'), timeout: 10000 })
    .catch(() => {});
  const report = {
    passed: false,
    timestamp: new Date().toISOString(),
    executablePath,
    cliPath,
    electronVersion,
    sandbox,
    entry,
    syntheticOnly: true,
    checks,
    resourceEvidence,
    fontEvidence,
    rendererErrors,
    normalExit,
    error: error.stack ?? String(error),
    processLog: processLog.join('').slice(-12000),
  };
  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  process.stderr.write(`${JSON.stringify(report, null, 2)}\n`);
  process.exitCode = 1;
} finally {
  await application?.close().catch(() => {});
  await fs.writeFile(path.join(evidence, 'project-assets-v06-process.log'), processLog.join(''));
}
