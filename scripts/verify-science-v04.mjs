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
const sandbox = await fs.mkdtemp(path.join(os.tmpdir(), 'huandeng-science-v04-'));
const deckRoot = path.join(sandbox, 'deck');
const evidence = path.join(root, '.verification', 'science-v04');
await fs.mkdir(path.join(deckRoot, 'pages'), { recursive: true });
await fs.mkdir(evidence, { recursive: true });
await fs.writeFile(
  path.join(deckRoot, 'deck.pptd'),
  JSON.stringify({
    title: 'HUANDENG Scientific Objects',
    size: [960, 540],
    pages: ['pages/science.page'],
  }),
);
await fs.writeFile(path.join(deckRoot, 'pages/science.page'), JSON.stringify({ elements: [] }));
const port = Number(process.env.HUANDENG_SCIENCE_PORT ?? 4874);
const url = `http://127.0.0.1:${port}`;
const logs = [];
const processEnv = { ...process.env, HUANDENG_RUNTIME_DIR: path.join(sandbox, 'runtime') };
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
  { cwd: root, env: processEnv, stdio: ['ignore', 'pipe', 'pipe'] },
);
child.stdout.on('data', (data) => logs.push(String(data)));
child.stderr.on('data', (data) => logs.push(String(data)));
let token = '';
let browser;
let page;
const errors = [];
const checks = [];
const pages = {};

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
  throw last ?? new Error('Timed out waiting for a scientific object.');
}

async function transaction(operations) {
  const snapshot = await api('/session');
  return api('/transactions', {
    deckId: snapshot.deckId,
    requestId: randomUUID(),
    actor: 'science-v04-verification',
    expected: {
      manifest: snapshot.manifestRevision,
      metadata: snapshot.metadataRevision,
      pages: Object.fromEntries(snapshot.pages.map((item) => [item.pageId, item.pageRevision])),
    },
    operations,
  });
}

async function newPage(name) {
  const result = await transaction([{ op: 'page.add', page: { elements: [], notes: name } }]);
  const id = result.createdPages[0].pageId;
  pages[name] = id;
  await page.goto(`${url}/huandeng?page=${id}`, { waitUntil: 'networkidle' });
  await page.locator('[data-hd-editor-canvas]').waitFor();
  return id;
}

async function insert(label) {
  await page.getByRole('button', { name: '插入科研对象', exact: true }).click();
  await page.getByRole('menuitem', { name: label, exact: true }).click();
}

async function ready(expectedSelector) {
  const canvas = page.locator('[data-hd-editor-canvas]');
  // Require the canvas and expected content as well as an idle async renderer.
  // A missing DOM during navigation is not a successfully rendered empty page.
  const state = await eventually(async () => {
    if ((await canvas.count()) !== 1) return false;
    return canvas.evaluate((element, selector) => {
      const unsupported = Array.from(element.querySelectorAll('[data-hd-unsupported="true"]')).map(
        (node) => node.textContent,
      );
      const formulaErrors = element.querySelectorAll('[data-hd-formula-error]').length;
      if (unsupported.length || formulaErrors) return { unsupported, formulaErrors };
      if (element.querySelector('[data-hd-loading]')) return false;
      if (selector) {
        const expected = element.querySelector(selector);
        if (!expected) return false;
        const bounds = expected.getBoundingClientRect();
        if (!bounds.width || !bounds.height) return false;
      }
      return { unsupported, formulaErrors };
    }, expectedSelector ?? null);
  });
  assert.equal(state.unsupported.length, 0, state.unsupported.join('\n'));
  assert.equal(state.formulaErrors, 0);
  return canvas;
}

async function editorAcknowledged() {
  await eventually(() => page.getByRole('button', { name: '撤销', exact: true }).isEnabled());
}

async function check(name, callback) {
  const start = Date.now();
  await callback();
  checks.push({ name, passed: true, milliseconds: Date.now() - start });
  process.stdout.write(`PASS ${name}\n`);
}

try {
  const session = await eventually(async () => {
    const value = await api('/session');
    token = value.sessionToken;
    return value;
  });
  assert.equal(session.pages.length, 1);
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
  const chartLabels = {
    bar: '柱状图',
    line: '折线图',
    area: '面积图',
    pie: '饼图 / 环形图',
    scatter: '散点图',
    bubble: '气泡图',
    radar: '雷达图',
    heatmap: '热力图',
    candlestick: '蜡烛图',
    waterfall: '瀑布图',
    treemap: '矩形树图',
    sunburst: '旭日图',
    sankey: '桑基图',
  };
  for (const [type, label] of Object.entries(chartLabels)) {
    await check(`insert and render ${type}`, async () => {
      await newPage(type);
      const documentEpoch = await page.evaluate(() => performance.timeOrigin);
      await insert(label);
      const canvas = page.locator('[data-hd-editor-canvas]');
      await ready('[data-hd-chart] svg');
      assert.equal(
        await page.evaluate(() => performance.timeOrigin),
        documentEpoch,
        `Inserting ${type} must not reload the editor while loading its chart engine.`,
      );
      await canvas
        .locator('[data-pptd-page]')
        .screenshot({ path: path.join(evidence, `${type}.png`) });
    });
  }

  await check('edit chart data and preserve source through reload', async () => {
    await page.goto(`${url}/huandeng?page=${pages.bar}`, { waitUntil: 'networkidle' });
    await page.locator('[data-hd-editor-canvas] [data-hd-chart]').click();
    await page.getByLabel('Chart data', { exact: true }).fill('Condition\tValue\nA\t3\nB\t7\nC\t5');
    await page.getByRole('button', { name: '应用图表数据', exact: true }).click();
    await eventually(
      async () => (await api(`/pages/${pages.bar}`)).data.elements[0].data.rows[1][1] === 7,
    );
    await page.reload({ waitUntil: 'networkidle' });
    await ready('[data-hd-chart] svg');
  });

  await check(
    'pending chart drafts survive selection and detect concurrent data changes',
    async () => {
      await page.locator('[data-hd-editor-canvas] [data-hd-chart]').click();
      const original = (await api(`/pages/${pages.bar}`)).data.elements[0];
      const draft = 'Condition\tValue\nA\t"unfinished';
      await page.getByLabel('Chart data', { exact: true }).fill(draft);
      await page.getByRole('button', { name: '应用图表数据', exact: true }).click();
      await page.getByRole('alert').filter({ hasText: 'not closed' }).waitFor();
      await page.locator('[data-hd-editor-canvas]').click({ position: { x: 8, y: 8 } });
      await page.locator('[data-hd-editor-canvas] [data-hd-chart]').click();
      assert.equal(await page.getByLabel('Chart data', { exact: true }).inputValue(), draft);
      await page.locator(`[data-hd-thumbnail="${pages.line}"]`).click();
      await page.locator(`[data-hd-editor-canvas] [data-pptd-page="${pages.line}"]`).waitFor();
      await page.locator(`[data-hd-thumbnail="${pages.bar}"]`).click();
      await page
        .locator(
          `[data-hd-editor-canvas] [data-pptd-page="${pages.bar}"] [data-hd-element-id="${original.elementId}"] [data-hd-chart]`,
        )
        .click();
      assert.equal(await page.getByLabel('Chart data', { exact: true }).inputValue(), draft);
      assert.deepEqual((await api(`/pages/${pages.bar}`)).data.elements[0].data, original.data);
      const pending = 'Condition\tValue\nA\t31\nB\t7\nC\t5';
      await page.getByLabel('Chart data', { exact: true }).fill(pending);
      await transaction([
        {
          op: 'element.patch',
          pageId: pages.bar,
          elementId: original.elementId,
          set: {
            title: 'External chart update',
            data: {
              cols: ['Condition', 'Value'],
              rows: [
                ['A', 61],
                ['B', 7],
                ['C', 5],
              ],
            },
          },
        },
      ]);
      await page
        .locator('[data-hd-editor-canvas] [data-hd-chart]')
        .getByText('External chart update', { exact: true })
        .waitFor();
      await page.getByRole('button', { name: '应用图表数据', exact: true }).click();
      await page.getByRole('alert').filter({ hasText: '图表数据已被其他编辑更新' }).waitFor();
      assert.equal(await page.getByLabel('Chart data', { exact: true }).inputValue(), pending);
      assert.equal((await api(`/pages/${pages.bar}`)).data.elements[0].data.rows[0][1], 61);
      await page.getByRole('button', { name: '读取当前数据', exact: true }).click();
      await eventually(async () =>
        (await page.getByLabel('Chart data', { exact: true }).inputValue()).includes('61'),
      );
      await page.getByLabel('Chart data', { exact: true }).fill(pending);
      await page.getByRole('button', { name: '应用图表数据', exact: true }).click();
      await eventually(
        async () => (await api(`/pages/${pages.bar}`)).data.elements[0].data.rows[0][1] === 31,
      );
      await editorAcknowledged();
      await ready();
    },
  );

  await check('table cells, merged rectangle, row insertion and split', async () => {
    const id = await newPage('table');
    await insert('表格');
    await page.getByLabel('R2 C2', { exact: true }).fill('42.5');
    await page.getByLabel('R2 C2', { exact: true }).press('Tab');
    await eventually(
      async () => (await api(`/pages/${id}`)).data.elements[0].rows[1][1].text === '42.5',
    );
    await page.getByLabel('终止行', { exact: true }).selectOption({ value: '1' });
    await page.getByLabel('终止列', { exact: true }).selectOption({ value: '1' });
    await page.getByRole('button', { name: '合并单元格', exact: true }).click();
    await eventually(
      async () => (await api(`/pages/${id}`)).data.elements[0].rows[0][0].rowSpan === 2,
    );
    await page.getByRole('button', { name: '在下方插入行', exact: true }).click();
    await eventually(
      async () => (await api(`/pages/${id}`)).data.elements[0].rows[0][0].rowSpan === 3,
    );
    await page.getByRole('button', { name: '拆分单元格', exact: true }).click();
    await eventually(async () => !(await api(`/pages/${id}`)).data.elements[0].rows[0][0].rowSpan);
    assert.ok((await api(`/pages/${id}`)).data.elements[0].rows[0][0].text.includes('42.5'));
    await ready();
    await page
      .locator('[data-hd-editor-canvas] [data-pptd-page]')
      .screenshot({ path: path.join(evidence, 'table.png') });
  });

  await check('LaTeX fractions, summation and editable source', async () => {
    const id = await newPage('formula');
    await insert('LaTeX 公式');
    const input = page.getByLabel('文本内容', { exact: true });
    await input.fill('\\[\\frac{a}{b}=\\sum_{i=1}^{n} x_i\\]');
    await input.press('Tab');
    await eventually(async () =>
      (await api(`/pages/${id}`)).data.elements[0].content.text.includes('sum'),
    );
    await page.locator('[data-hd-editor-canvas] math mfrac').waitFor();
    await ready();
    await page
      .locator('[data-hd-editor-canvas] [data-pptd-page]')
      .screenshot({ path: path.join(evidence, 'formula.png') });
  });

  await check('MathML source renders as mathematics', async () => {
    const id = await newPage('mathml');
    await insert('LaTeX 公式');
    await page
      .getByLabel('文本内容', { exact: true })
      .fill(
        '<math xmlns="http://www.w3.org/1998/Math/MathML" display="block"><mfrac><mi>a</mi><mi>b</mi></mfrac><mo>=</mo><mn>2</mn></math>',
      );
    await page.getByLabel('文本内容', { exact: true }).press('Tab');
    await eventually(async () =>
      (await api(`/pages/${id}`)).data.elements[0].content.text.includes('<math'),
    );
    await page.locator('[data-hd-editor-canvas] math mfrac').waitFor();
    await ready();
  });

  await check('search and replace a bundled scientific icon', async () => {
    const id = await newPage('icon');
    const documentEpoch = await page.evaluate(() => performance.timeOrigin);
    await insert('图标');
    await ready('[data-hd-icon] svg');
    for (const [prefix, name] of [
      ['far', 'circle-check'],
      ['fab', 'github'],
      ['fas', 'flask'],
    ]) {
      await page.getByLabel('图标集', { exact: true }).selectOption({ value: prefix });
      await page.getByLabel('搜索图标', { exact: true }).fill(name);
      await page.getByRole('button', { name: `选择图标 ${prefix}:${name}`, exact: true }).click();
      await eventually(
        async () => (await api(`/pages/${id}`)).data.elements[0].iconName === `${prefix}:${name}`,
      );
      await editorAcknowledged();
      await ready(`[data-hd-icon="${prefix}:${name}"] svg`);
      assert.equal(
        await page.evaluate(() => performance.timeOrigin),
        documentEpoch,
        `Loading the ${prefix} icon library must not reload the editor.`,
      );
    }
  });

  await check('group move, duplicate references, ungroup and undo', async () => {
    const id = await newPage('groups');
    await transaction([
      {
        op: 'element.add',
        pageId: id,
        element: {
          elementId: 'shape-one',
          elementType: 'shape',
          bounds: [100, 150, 180, 100],
          shapeName: 'hexagon',
          fill: { type: 'solid', color: '#b8d5c9' },
        },
      },
      {
        op: 'element.add',
        pageId: id,
        element: {
          elementId: 'text-two',
          elementType: 'text',
          bounds: [350, 150, 280, 80],
          content: { text: 'Two linked objects', fontSize: 26, color: '#263531' },
        },
      },
    ]);
    await page.locator('[data-hd-editor-canvas] [data-hd-element-id="shape-one"]').click();
    await page
      .locator('[data-hd-editor-canvas] [data-hd-element-id="text-two"]')
      .click({ modifiers: ['Shift'] });
    await page.keyboard.press('Control+g');
    const grouped = await eventually(async () =>
      (await api(`/pages/${id}`)).data.elements.find((item) => item.elementType === 'group'),
    );
    await editorAcknowledged();
    await page.getByLabel('X', { exact: true }).fill(String(grouped.bounds[0] + 20));
    await page.getByLabel('X', { exact: true }).press('Tab');
    await eventually(
      async () =>
        (await api(`/pages/${id}`)).data.elements.find((item) => item.elementId === 'shape-one')
          .bounds[0] === 120,
    );
    await editorAcknowledged();
    await page.locator('[data-hd-editor-canvas]').click({ position: { x: 8, y: 8 } });
    await page
      .locator(`[data-hd-editor-canvas] [data-hd-element-id="${grouped.elementId}"]`)
      .click();
    await page.keyboard.press('Control+d');
    const duplicated = await eventually(async () => {
      const current = await api(`/pages/${id}`);
      return (
        current.data.elements.filter((item) => item.elementType === 'group').length === 2 && current
      );
    });
    const copy = duplicated.data.elements.find(
      (item) => item.elementType === 'group' && item.elementId !== grouped.elementId,
    );
    assert.ok(copy.children.every((childId) => !grouped.children.includes(childId)));
    await editorAcknowledged();
    await page.keyboard.press('Control+Shift+g');
    await eventually(
      async () =>
        (await api(`/pages/${id}`)).data.elements.filter((item) => item.elementType === 'group')
          .length === 1,
    );
    await editorAcknowledged();
    await page.keyboard.press('Control+z');
    await eventually(
      async () =>
        (await api(`/pages/${id}`)).data.elements.filter((item) => item.elementType === 'group')
          .length === 2,
    );
    await editorAcknowledged();
    await ready();
  });

  await check(
    'image picker, drop and clipboard preserve assets, aspect ratio and undo',
    async () => {
      const id = await newPage('images');
      const canvas = page.locator('[data-hd-editor-canvas]');
      const base64 = await page.evaluate(() => {
        const fixture = document.createElement('canvas');
        fixture.width = 1200;
        fixture.height = 600;
        const context = fixture.getContext('2d');
        if (!context) throw new Error('Cannot create the PNG import fixture.');
        context.fillStyle = '#f5f2e9';
        context.fillRect(0, 0, fixture.width, fixture.height);
        context.fillStyle = '#28584b';
        context.fillRect(80, 100, 220, 400);
        context.fillStyle = '#87b0a0';
        context.fillRect(380, 260, 220, 240);
        context.fillStyle = '#d6a851';
        context.fillRect(680, 180, 220, 320);
        context.strokeStyle = '#1d302a';
        context.lineWidth = 12;
        context.strokeRect(6, 6, fixture.width - 12, fixture.height - 12);
        return fixture.toDataURL('image/png').split(',')[1];
      });
      const bytes = Buffer.from(base64, 'base64');
      const digest = createHash('sha256').update(bytes).digest('hex');
      const assetPath = `media/imported/${digest}.png`;
      const sourceNames = ['picker-figure.png', 'dropped-figure.png', 'clipboard-figure.png'];

      async function imported(count, afterReload = false) {
        const elements = await eventually(async () => {
          const current = (await api(`/pages/${id}`)).data.elements;
          return current.length === count && current;
        });
        if (afterReload)
          await eventually(async () =>
            (await page.locator('[data-hd-save-status]').textContent())?.includes('已保存'),
          );
        else await editorAcknowledged();
        for (const [index, element] of elements.entries()) {
          assert.equal(element.elementType, 'image');
          assert.equal(element.src, assetPath);
          assert.equal(element.sourceName, sourceNames[index]);
          assert.deepEqual(element.fit, { mode: 'contain' });
          assert.ok(Math.abs(element.bounds[2] - 672) < 1e-6);
          assert.ok(Math.abs(element.bounds[3] - 336) < 1e-6);
          const image = canvas.locator(`[data-hd-element-id="${element.elementId}"] img`);
          await eventually(() =>
            image.evaluate((node) => {
              const frame = node.getBoundingClientRect();
              return (
                node.complete &&
                node.naturalWidth === 1200 &&
                node.naturalHeight === 600 &&
                frame.width > 0 &&
                frame.height > 0 &&
                Math.abs(frame.width / frame.height - 2) < 1e-6
              );
            }),
          );
        }
        assert.equal(new Set(elements.map((element) => element.elementId)).size, count);
        assert.deepEqual(await fs.readFile(path.join(deckRoot, assetPath)), bytes);
        assert.deepEqual(await fs.readdir(path.join(deckRoot, 'media/imported')), [
          `${digest}.png`,
        ]);
        await ready();
        return elements;
      }

      await page.getByRole('button', { name: '添加图片', exact: true }).click();
      await page.getByLabel('从设备导入图片', { exact: true }).setInputFiles({
        name: sourceNames[0],
        mimeType: 'image/png',
        buffer: bytes,
      });
      await imported(1);
      await page.getByRole('dialog').waitFor({ state: 'hidden' });

      for (const [index, kind] of ['drop', 'paste'].entries()) {
        await canvas.click({ position: { x: 8, y: 8 } });
        // Exercise DOM FileList handlers without requiring an OS clipboard in headless Chromium.
        const accepted = await canvas.evaluate(
          (target, { kind, name, base64 }) => {
            const transfer = new DataTransfer();
            const content = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
            transfer.items.add(new File([content], name, { type: 'image/png' }));
            if (kind === 'drop') {
              target.dispatchEvent(
                new DragEvent('dragover', {
                  bubbles: true,
                  cancelable: true,
                  dataTransfer: transfer,
                }),
              );
              return !target.dispatchEvent(
                new DragEvent('drop', {
                  bubbles: true,
                  cancelable: true,
                  dataTransfer: transfer,
                }),
              );
            }
            return !target.dispatchEvent(
              new ClipboardEvent('paste', {
                bubbles: true,
                cancelable: true,
                clipboardData: transfer,
              }),
            );
          },
          { kind, name: sourceNames[index + 1], base64 },
        );
        assert.equal(accepted, true, `The editor must accept the image ${kind} event.`);
        await imported(index + 2);
      }

      const original = (await api(`/pages/${id}`)).data.elements;
      await canvas.click({ position: { x: 8, y: 8 } });
      await page.keyboard.press('Control+z');
      assert.deepEqual(await imported(2), original.slice(0, 2));
      await page.getByRole('button', { name: '重做', exact: true }).click();
      assert.deepEqual(await imported(3), original);
      await page.reload({ waitUntil: 'networkidle' });
      await imported(3, true);
      await canvas
        .locator('[data-pptd-page]')
        .screenshot({ path: path.join(evidence, 'imported-image.png') });
      await fs.writeFile(
        path.join(evidence, 'image-import.json'),
        JSON.stringify(
          {
            source: { width: 1200, height: 600, sha256: digest, bytes: bytes.length },
            assetPath,
            elements: original,
            verified: ['picker', 'drop', 'clipboard', 'deduplication', 'undo', 'redo', 'reload'],
          },
          null,
          2,
        ),
      );
    },
  );

  if (process.env.HUANDENG_SCIENCE_NO_EXPORT !== '1')
    await check('PNG PDF PPTX exports preserve source and editable objects', async () => {
      const snapshot = await api('/session');
      const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
      const before = await Promise.all(
        snapshot.pages.map(async (item) => [
          item.path,
          hash(await fs.readFile(path.join(deckRoot, item.path))),
        ]),
      );
      const png = await api('/render', { pageId: pages.heatmap });
      assert.equal((await fs.readFile(png.file)).subarray(0, 4).toString('hex'), '89504e47');
      const pdf = await api('/export', { format: 'pdf' });
      assert.equal((await fs.readFile(pdf.file)).subarray(0, 4).toString(), '%PDF');
      const pptx = await api('/export', { format: 'pptx' });
      assert.equal(pptx.report.complete, true);
      const zip = unzipSync(await fs.readFile(pptx.file));
      const xml = Object.entries(zip)
        .filter(([name]) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
        .map(([, bytes]) => strFromU8(bytes))
        .join('\n');
      assert.match(xml, /<a:tbl>/);
      assert.match(xml, /<c:chart /);
      assert.match(xml, /m:oMath/);
      for (const [file, digest] of before)
        assert.equal(hash(await fs.readFile(path.join(deckRoot, file))), digest);
      await fs.copyFile(pptx.file, path.join(evidence, 'scientific-objects.pptx'));
      await fs.copyFile(pdf.file, path.join(evidence, 'scientific-objects.pdf'));
      await fs.writeFile(
        path.join(evidence, 'export-report.json'),
        JSON.stringify(pptx.report, null, 2),
      );
    });
  assert.deepEqual(errors, []);
  await fs.writeFile(
    path.join(evidence, 'result.json'),
    JSON.stringify({ passed: true, checks, rendererErrors: errors, sandbox, pages }, null, 2),
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
      {
        error: String(error),
        checks,
        rendererErrors: errors,
        serverLog: logs.slice(-20),
        sandbox,
        url: page?.url(),
        alerts: await page
          ?.getByRole('alert')
          .allTextContents()
          .catch(() => []),
      },
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
