import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
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
const { unzipSync, strFromU8 } = require('fflate');
const sandbox = await fs.mkdtemp(path.join(os.tmpdir(), 'huandeng-project-v04-'));
const deckRoot = path.join(sandbox, 'deck');
const evidence = path.join(root, '.verification', 'project-v04');
await fs.mkdir(path.join(deckRoot, 'pages'), { recursive: true });
await fs.mkdir(evidence, { recursive: true });
const sourceNames = ['alpha', 'beta', 'gamma', 'delta'];
await fs.writeFile(
  path.join(deckRoot, 'deck.pptd'),
  JSON.stringify({
    title: 'HUANDENG Project Stories',
    size: [960, 540],
    pages: sourceNames.map((name) => `pages/${name}.page`),
  }),
);
for (const name of sourceNames) {
  await fs.writeFile(
    path.join(deckRoot, 'pages', `${name}.page`),
    JSON.stringify({
      elements: [
        {
          elementId: 'title',
          elementType: 'text',
          bounds: [80, 150, 760, 120],
          content: { text: `Main ${name} original`, fontSize: 36, color: '#243b53' },
        },
      ],
      notes: `${name} original notes`,
    }),
  );
}
const port = Number(process.env.HUANDENG_PROJECT_PORT ?? 4875);
const url = `http://127.0.0.1:${port}`;
const logs = [];
const child = spawn(
  process.execPath,
  [
    path.join(root, 'packages/core/huandeng.js'),
    'open',
    path.join(deckRoot, 'deck.pptd'),
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
child.stdout.on('data', (data) => logs.push(String(data)));
child.stderr.on('data', (data) => logs.push(String(data)));
let token = '';
let browser;
let page;
let ids;
let conference;
let lab;
let firstVersion;
let secondVersion;
const errors = [];
const checks = [];

async function api(route, body) {
  const response = await fetch(`${url}/__pptd${route}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'content-type': 'application/json', 'x-huandeng-token': token },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`${route}: ${JSON.stringify(data)}`);
  return data;
}

async function eventually(callback, timeout = 45000) {
  const deadline = Date.now() + timeout;
  let last;
  while (Date.now() < deadline) {
    try {
      const result = await callback();
      if (result) return result;
    } catch (error) {
      last = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw last ?? new Error('Timed out waiting for the project UI.');
}

async function transaction(operations) {
  const snapshot = await api('/session');
  const pages = Object.fromEntries(snapshot.pages.map((item) => [item.pageId, item.pageRevision]));
  for (const operation of operations) {
    if (operation.pageId && !pages[operation.pageId])
      pages[operation.pageId] = (await api(`/pages/${operation.pageId}`)).pageRevision;
  }
  return api('/transactions', {
    deckId: snapshot.deckId,
    requestId: randomUUID(),
    actor: 'project-v04-verification',
    expected: { metadata: snapshot.metadataRevision, manifest: snapshot.manifestRevision, pages },
    operations,
  });
}

async function check(name, callback) {
  const start = Date.now();
  await callback();
  checks.push({ name, passed: true, milliseconds: Date.now() - start });
  process.stdout.write(`PASS ${name}\n`);
}

async function panel() {
  await page.getByRole('button', { name: '项目与 Story', exact: true }).click();
  const result = page.locator('[data-hd-project]');
  await result.waitFor({ state: 'visible' });
  return result;
}

async function saveProject() {
  const projectPanel = page.locator('[data-hd-project]');
  await projectPanel.getByRole('button', { name: 'Save project', exact: true }).click();
  await eventually(
    async () =>
      await projectPanel.getByRole('button', { name: 'Save project', exact: true }).isDisabled(),
  );
  await eventually(
    async () =>
      !(await projectPanel.getByText('Unsaved project changes.', { exact: false }).count()),
  );
  return (await api('/session')).metadata.project;
}

async function collection(id) {
  await page.getByLabel('当前演讲集合', { exact: true }).selectOption(id ?? '');
  await eventually(
    async () => !(await page.getByRole('button', { name: '演示', exact: true }).isDisabled()),
  );
}

async function recordVersion(label) {
  await page.getByRole('button', { name: '当前页历史版本', exact: true }).click();
  const dialog = page.locator('[data-hd-page-history]');
  await dialog.waitFor();
  await dialog.getByLabel('页面版本名称', { exact: true }).fill(label);
  await dialog.getByRole('button', { name: '记录页面版本', exact: true }).click();
  const saved = await eventually(async () =>
    (await api(`/pages/${ids[0]}/versions`)).find((version) => version.summary === label),
  );
  await eventually(
    async () => await dialog.locator(`[data-hd-version="${saved.versionId}"]`).count(),
  );
  await dialog.screenshot({
    path: path.join(
      evidence,
      `${label.startsWith('First') ? 'first' : 'second'}-named-version.png`,
    ),
  });
  await page.keyboard.press('Escape');
  await dialog.waitFor({ state: 'hidden' });
  return saved.versionId;
}

async function expectCanvasText(text) {
  await eventually(async () =>
    (await page.locator('[data-hd-editor-canvas]').textContent()).includes(text),
  );
}

try {
  const session = await eventually(async () => {
    const result = await api('/session');
    token = result.sessionToken;
    return result;
  });
  ids = session.pages.map((item) => item.pageId);
  assert.equal(ids.length, 4);
  const executablePath = [
    process.env.HUANDENG_BROWSER,
    '/usr/bin/chromium',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
  ].find((candidate) => candidate && existsSync(candidate));
  browser = await chromium.launch({
    ...(executablePath ? { executablePath } : {}),
    headless: true,
    args: process.platform === 'linux' ? ['--no-sandbox', '--disable-dev-shm-usage'] : [],
  });
  page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  page.setDefaultTimeout(15000);
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${url}/huandeng?page=${ids[0]}`, { waitUntil: 'networkidle' });
  await page.locator('[data-hd-editor-canvas]').waitFor();

  await check('create Main Story and two sections through the editor', async () => {
    const projectPanel = await panel();
    await projectPanel
      .getByLabel('Question / purpose', { exact: true })
      .fill('Full evidence library');
    await projectPanel.getByLabel('Audience', { exact: true }).fill('Research team');
    await projectPanel.getByLabel('Takeaway', { exact: true }).fill('A reproducible account');
    await projectPanel.getByRole('button', { name: 'Section', exact: true }).click();
    await projectPanel.getByLabel('Section 1 title', { exact: true }).fill('Background');
    await projectPanel.getByRole('button', { name: 'Section', exact: true }).click();
    await projectPanel.getByLabel('Section 2 title', { exact: true }).fill('Results');
    for (let index = 0; index < ids.length; index++)
      await projectPanel
        .getByLabel(`Section for S${index + 1}`, { exact: true })
        .selectOption({ label: index < 2 ? 'Background' : 'Results' });
    const saved = await saveProject();
    assert.equal(saved.mainStory.purpose, 'Full evidence library');
    assert.deepEqual(
      saved.sections.map((section) => section.pageIds),
      [ids.slice(0, 2), ids.slice(2)],
    );
    assert.equal((await api('/session')).pages.length, 4);
  });

  await check('create two presentations sharing chapter and repeated page references', async () => {
    const projectPanel = await panel();
    const model = (await api('/session')).metadata.project;
    await projectPanel.getByRole('button', { name: 'Presentation', exact: true }).click();
    await projectPanel.getByLabel('Presentation title', { exact: true }).fill('Conference A');
    await projectPanel
      .getByLabel('Question / purpose', { exact: true })
      .fill('Explain the principal finding');
    await projectPanel
      .getByLabel('Build the presentation', { exact: true })
      .selectOption(`section:${model.sections[1].id}`);
    for (let index = 0; index < 3; index++)
      await projectPanel
        .getByLabel('Build the presentation', { exact: true })
        .selectOption(`page:${ids[0]}`);
    conference = (await saveProject()).presentations.find(
      (item) => item.title === 'Conference A',
    ).id;
    await projectPanel.getByRole('button', { name: 'Presentation', exact: true }).click();
    await projectPanel.getByLabel('Presentation title', { exact: true }).fill('Lab B');
    await projectPanel
      .getByLabel('Build the presentation', { exact: true })
      .selectOption(`section:${model.sections[0].id}`);
    lab = (await saveProject()).presentations.find((item) => item.title === 'Lab B').id;
    assert.deepEqual(
      (await api(`/presentations/${conference}`)).pages.map((item) => item.pageId),
      [ids[2], ids[3], ids[0], ids[0], ids[0]],
    );
    assert.deepEqual(
      (await api(`/presentations/${lab}`)).pages.map((item) => item.pageId),
      ids.slice(0, 2),
    );
    assert.equal((await api('/session')).pages.length, 4);
  });

  await check(
    'ordinary edits create no named versions and the history UI explicitly records milestones',
    async () => {
      await collection(null);
      await page.getByRole('button', { name: '页面缩略图', exact: true }).click();
      await page.locator('[data-hd-thumbnail]').first().click();
      for (let index = 0; index < 4; index++)
        await transaction([
          { op: 'page.notes.set', pageId: ids[0], text: `Working notes ${index}` },
        ]);
      assert.equal((await api(`/pages/${ids[0]}/versions`)).length, 0);
      firstVersion = await recordVersion('First complete result');
      await transaction([
        {
          op: 'element.patch',
          pageId: ids[0],
          elementId: 'title',
          set: { 'content.text': 'Main alpha revision two' },
        },
        { op: 'page.notes.set', pageId: ids[0], text: 'Revised Main notes' },
      ]);
      await expectCanvasText('Main alpha revision two');
      secondVersion = await recordVersion('Second complete result');
      await transaction([
        {
          op: 'element.patch',
          pageId: ids[0],
          elementId: 'title',
          set: { 'content.text': 'Main alpha working draft' },
        },
        { op: 'page.notes.set', pageId: ids[0], text: 'Current Main notes' },
      ]);
      await expectCanvasText('Main alpha working draft');
      assert.equal((await api(`/pages/${ids[0]}/versions`)).length, 2);
    },
  );

  await check('project draft survives tab changes and blocks presentation and export', async () => {
    await collection(conference);
    let projectPanel = await panel();
    await projectPanel
      .getByLabel('Takeaway', { exact: true })
      .fill('Unsaved narrative to preserve');
    assert.equal(
      await page.getByRole('button', { name: '导出 PPTX', exact: true }).isDisabled(),
      true,
    );
    assert.equal(await page.getByRole('button', { name: 'PDF', exact: true }).isDisabled(), true);
    assert.equal(await page.getByRole('button', { name: '演示', exact: true }).isDisabled(), true);
    await page.getByRole('button', { name: '页面缩略图', exact: true }).click();
    await page.getByRole('button', { name: '项目文件树', exact: true }).click();
    projectPanel = await panel();
    assert.equal(
      await projectPanel.getByLabel('Takeaway', { exact: true }).inputValue(),
      'Unsaved narrative to preserve',
    );
    const saved = await saveProject();
    assert.equal(
      saved.presentations.find((item) => item.id === conference).story.takeaway,
      'Unsaved narrative to preserve',
    );
  });

  await check(
    'pin two named versions and save occurrence-specific speaker notes through UI',
    async () => {
      const projectPanel = await panel();
      const items = projectPanel.locator('[data-hd-presentation-item]');
      await items
        .nth(2)
        .getByRole('button', { name: 'Refresh named versions', exact: true })
        .click();
      await eventually(
        async () =>
          await items
            .nth(2)
            .getByLabel('Page version', { exact: true })
            .locator(`option[value="${firstVersion}"]`)
            .count(),
      );
      await items.nth(2).getByLabel('Page version', { exact: true }).selectOption(firstVersion);
      await items.nth(3).getByLabel('Page version', { exact: true }).selectOption(secondVersion);
      await items
        .nth(3)
        .getByRole('checkbox', { name: 'Presentation-specific speaker notes', exact: true })
        .check();
      await items
        .nth(3)
        .getByLabel('Speaker notes for item 4', { exact: true })
        .fill('Presented conclusion for this occurrence');
      await saveProject();
      const snapshot = await api(`/presentations/${conference}`);
      assert.equal(snapshot.pages[3].versionId, firstVersion);
      assert.equal(snapshot.pages[4].versionId, secondVersion);
      assert.equal(snapshot.pages[4].data.notes, 'Presented conclusion for this occurrence');
      assert.equal((await api(`/pages/${ids[0]}`)).data.notes, 'Current Main notes');
      await projectPanel.screenshot({ path: path.join(evidence, 'presentation-organization.png') });
    },
  );

  await check(
    'reopen and navigate distinct live and pinned occurrences in the thumbnail rail',
    async () => {
      await page.reload({ waitUntil: 'networkidle' });
      await page.locator('[data-hd-editor-canvas]').waitFor();
      assert.equal(await page.getByLabel('当前演讲集合', { exact: true }).inputValue(), conference);
      await page.getByRole('button', { name: '页面缩略图', exact: true }).click();
      const thumbs = page.locator('[data-hd-thumbnail]');
      await eventually(async () => (await thumbs.count()) === 5);
      assert.deepEqual(
        await thumbs.evaluateAll((nodes) =>
          nodes.map((node) => node.getAttribute('data-hd-thumbnail')),
        ),
        [ids[2], ids[3], ids[0], ids[0], ids[0]],
      );
      const titles = [
        'Main gamma original',
        'Main delta original',
        'Main alpha working draft',
        'Main alpha original',
        'Main alpha revision two',
      ];
      for (let index = 0; index < titles.length; index++) {
        await thumbs.nth(index).click();
        await expectCanvasText(titles[index]);
        await eventually(
          async () => (await thumbs.nth(index).getAttribute('aria-pressed')) === 'true',
        );
        assert.equal(
          await page.getByRole('button', { name: '保存', exact: true }).isDisabled(),
          index >= 3,
        );
      }
      await page.screenshot({ path: path.join(evidence, 'pinned-page-in-editor.png') });
    },
  );

  await check('play resolved order with repeated pages and occurrence-specific notes', async () => {
    await page.locator('[data-hd-thumbnail]').first().click();
    await page.getByRole('button', { name: '演示', exact: true }).click();
    const presenter = page.locator('[data-hd-presenter]');
    await presenter.waitFor();
    const expected = [
      'Main gamma original',
      'Main delta original',
      'Main alpha working draft',
      'Main alpha original',
      'Main alpha revision two',
    ];
    for (let index = 0; index < expected.length; index++) {
      await eventually(async () =>
        (await presenter.locator('[data-hd-presenter-slide]').textContent()).includes(
          expected[index],
        ),
      );
      if (index < expected.length - 1)
        await presenter.getByRole('button', { name: '下一页', exact: true }).click();
    }
    assert.equal(
      await presenter.getByRole('button', { name: '下一页', exact: true }).isDisabled(),
      true,
    );
    await presenter.locator('[data-hd-presenter-notes-toggle]').click();
    assert.equal(
      (await presenter.locator('[data-hd-presenter-note-text]').textContent()).trim(),
      'Presented conclusion for this occurrence',
    );
    await page.screenshot({ path: path.join(evidence, 'presentation-speaker-notes.png') });
    await page.keyboard.press('Escape');
    await presenter.waitFor({ state: 'hidden' });
    await collection(lab);
    await eventually(async () => (await page.locator('[data-hd-thumbnail]').count()) === 2);
    await page.locator('[data-hd-thumbnail]').first().click();
    await expectCanvasText('Main alpha working draft');
  });

  if (process.env.HUANDENG_PROJECT_NO_EXPORT !== '1')
    await check(
      'UI exports each selected presentation with correct count and leaves canonical pages intact',
      async () => {
        const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
        const before = await Promise.all(
          sourceNames.map(async (name) => [
            name,
            digest(await fs.readFile(path.join(deckRoot, 'pages', `${name}.page`))),
          ]),
        );
        for (const [id, count, name] of [
          [lab, 2, 'lab'],
          [conference, 5, 'conference'],
        ]) {
          await collection(id);
          const response = page.waitForResponse(
            (response) =>
              response.url().endsWith('/__pptd/export') && response.request().method() === 'POST',
            { timeout: 120000 },
          );
          await page.getByRole('button', { name: '导出 PPTX', exact: true }).click();
          const completed = await response;
          const requestBody = completed.request().postDataJSON();
          assert.equal(requestBody.presentationId, id);
          const exported = await completed.json();
          assert.equal(completed.ok(), true, JSON.stringify(exported));
          const bytes = await fs.readFile(exported.file);
          const zip = unzipSync(bytes);
          const slides = Object.entries(zip).filter(([file]) =>
            /^ppt\/slides\/slide\d+\.xml$/.test(file),
          );
          assert.equal(slides.length, count);
          if (id === conference) {
            const text = slides.map(([, bytes]) => strFromU8(bytes)).join('\n');
            assert.match(text, /Main alpha working draft/);
            assert.match(text, /Main alpha original/);
            assert.match(text, /Main alpha revision two/);
          }
          await fs.writeFile(path.join(evidence, `${name}.pptx`), bytes);
          await eventually(
            async () =>
              !(await page.getByRole('button', { name: '导出 PPTX', exact: true }).isDisabled()),
          );
        }
        for (const [name, hash] of before)
          assert.equal(
            digest(await fs.readFile(path.join(deckRoot, 'pages', `${name}.page`))),
            hash,
          );
      },
    );

  await check(
    'removed canonical page retains references and blocks affected presentation until restored',
    async () => {
      await collection(conference);
      await transaction([{ op: 'page.remove', pageId: ids[0] }]);
      await eventually(
        async () => await page.getByRole('button', { name: '导出 PPTX', exact: true }).isDisabled(),
      );
      assert.equal(
        (await api('/session')).metadata.project.presentations
          .find((item) => item.id === conference)
          .items.filter((item) => item.kind === 'page' && item.pageId === ids[0]).length,
        3,
      );
      await transaction([{ op: 'page.restore', pageId: ids[0], afterPageId: null }]);
      await eventually(
        async () =>
          !(await page.getByRole('button', { name: '导出 PPTX', exact: true }).isDisabled()),
      );
      assert.equal((await api(`/presentations/${conference}`)).pages.length, 5);
    },
  );

  await check(
    'external project update preserves a conflicting draft and disables overwriting controls',
    async () => {
      const projectPanel = await panel();
      await projectPanel
        .getByLabel('Takeaway', { exact: true })
        .fill('Local narrative waiting for merge');
      const model = structuredClone((await api('/session')).metadata.project);
      model.mainStory.audience = 'Updated by external editor';
      await transaction([{ op: 'project.replace', project: model }]);
      await eventually(async () =>
        (await projectPanel.textContent()).includes('The project changed elsewhere.'),
      );
      assert.equal(
        await projectPanel.getByLabel('Takeaway', { exact: true }).inputValue(),
        'Local narrative waiting for merge',
      );
      assert.equal(
        await projectPanel.getByRole('button', { name: 'Save project', exact: true }).isDisabled(),
        true,
      );
      assert.equal(
        await projectPanel
          .getByRole('button', { name: 'Remove presentation', exact: true })
          .isDisabled(),
        true,
      );
      await projectPanel.getByText('View unsaved draft for merging', { exact: true }).click();
      assert.match(
        await projectPanel.getByLabel('Unsaved project draft', { exact: true }).inputValue(),
        /Local narrative waiting for merge/,
      );
      await projectPanel.screenshot({
        path: path.join(evidence, 'project-conflict-preserved.png'),
      });
      await projectPanel.getByRole('button', { name: 'Discard draft', exact: true }).click();
      await eventually(
        async () => !(await projectPanel.textContent()).includes('The project changed elsewhere.'),
      );
      assert.equal(
        (await api('/session')).metadata.project.mainStory.audience,
        'Updated by external editor',
      );
      assert.equal(
        await projectPanel.getByLabel('Takeaway', { exact: true }).inputValue(),
        'Unsaved narrative to preserve',
      );
    },
  );

  await check(
    'Page Story draft survives object selection and page changes until explicitly saved',
    async () => {
      await collection(null);
      await page.getByRole('button', { name: '页面缩略图', exact: true }).click();
      await page.locator(`[data-hd-thumbnail="${ids[0]}"]`).click();
      let story = page.locator('[data-hd-story]');
      await story.getByRole('button', { name: '更正意图', exact: true }).click();
      await story
        .getByLabel('页面创作意图', { exact: true })
        .fill('Preserve this author correction across navigation');
      await story
        .getByLabel('需要保留的设计意图', { exact: true })
        .fill('Keep the original evidence\nKeep the independent caption');
      assert.equal(
        await page.getByRole('button', { name: '导出 PPTX', exact: true }).isDisabled(),
        true,
      );
      await page.locator('[data-hd-editor-canvas] [data-hd-element-id="title"]').click();
      await eventually(async () => (await page.locator('[data-hd-story]').count()) === 0);
      await page.locator(`[data-hd-thumbnail="${ids[1]}"]`).click();
      await page.locator(`[data-hd-thumbnail="${ids[0]}"]`).click();
      story = page.locator('[data-hd-story]');
      assert.equal(
        await story.getByLabel('页面创作意图', { exact: true }).inputValue(),
        'Preserve this author correction across navigation',
      );
      assert.equal(
        await story.getByLabel('需要保留的设计意图', { exact: true }).inputValue(),
        'Keep the original evidence\nKeep the independent caption',
      );
      await story.getByRole('button', { name: '保存更正', exact: true }).click();
      await eventually(
        async () =>
          (await api(`/pages/${ids[0]}`)).metadata.designIntent?.purpose ===
          'Preserve this author correction across navigation',
      );
      await eventually(
        async () =>
          !(await page.getByRole('button', { name: '导出 PPTX', exact: true }).isDisabled()),
      );
      await story.screenshot({ path: path.join(evidence, 'page-story-saved.png') });
    },
  );

  assert.deepEqual(errors, []);
  const saved = await api('/session');
  await fs.writeFile(
    path.join(evidence, 'project.json'),
    JSON.stringify(saved.metadata.project, null, 2),
  );
  await fs.writeFile(
    path.join(evidence, 'result.json'),
    JSON.stringify(
      {
        passed: true,
        checks,
        rendererErrors: errors,
        sandbox,
        pageIds: ids,
        conference,
        lab,
        firstVersion,
        secondVersion,
      },
      null,
      2,
    ),
  );
  process.stdout.write(`${JSON.stringify({ passed: true, checks: checks.length, evidence })}\n`);
} catch (error) {
  if (page)
    await page
      .screenshot({ path: path.join(evidence, 'failure.png'), fullPage: true })
      .catch(() => {});
  await fs.writeFile(
    path.join(evidence, 'failure.json'),
    JSON.stringify(
      { error: String(error), checks, rendererErrors: errors, serverLog: logs.slice(-20), sandbox },
      null,
      2,
    ),
  );
  console.error(error);
  process.exitCode = 1;
} finally {
  await browser?.close().catch(() => {});
  child.kill('SIGTERM');
}
