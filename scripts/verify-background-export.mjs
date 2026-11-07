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
const sandbox = await fs.mkdtemp(path.join(os.tmpdir(), 'huandeng-background-'));
const deck = path.join(sandbox, 'deck');
const evidence = path.join(root, '.verification/background-export');
await fs.mkdir(path.join(deck, 'pages'), { recursive: true });
await fs.mkdir(path.join(deck, 'media'), { recursive: true });
await fs.mkdir(evidence, { recursive: true });
const manifest = {
  title: 'Background fallback acceptance',
  size: [960, 540],
  pages: ['pages/background.page'],
  theme: { colors: { accent1: '#bb0000' } },
};
const source = {
  background: { type: 'image', src: 'media/background.svg' },
  elements: [
    {
      elementId: 'native-caption',
      elementType: 'text',
      bounds: [40, 40, 800, 60],
      content: { text: 'Caption stays editable above the SVG background', fontSize: 28 },
    },
    {
      elementId: 'async-icon',
      elementType: 'icon',
      bounds: [300, 140, 180, 160],
      iconName: 'fas:flask',
      fill: '$accent1',
    },
    {
      elementId: 'overlapping-native-shape',
      elementType: 'shape',
      shapeName: 'rect',
      bounds: [340, 180, 30, 30],
      fill: { type: 'solid', color: '#000000' },
    },
    {
      elementId: 'overflow-short-text',
      elementType: 'text',
      bounds: [560, 140, 240, 5],
      content: {
        text: '<span style="font-weight:600">Readable gyjp labels</span>',
        fontSize: 24,
        color: '#aa0088',
      },
    },
    {
      elementId: 'overflow-paragraphs',
      elementType: 'text',
      bounds: [560, 230, 240, 35],
      content: {
        text: '<p style="margin-top:0">First visible row</p><p style="margin-top:28px">Final row with gyjp</p>',
        fontSize: 18,
        color: '#663399',
      },
    },
    {
      elementId: 'overflow-stroke',
      elementType: 'line',
      bounds: [560, 410, 240, 1],
      viewBox: [1, 1],
      points: '0,0 0.5,0.5 1,0',
      curve: 'sharp',
      border: { width: 8, color: '#0088aa', style: 'solid' },
    },
  ],
};
const svg = (color) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540"><rect width="960" height="540" fill="${color}"/></svg>`;
await fs.writeFile(path.join(deck, 'deck.pptd'), JSON.stringify(manifest));
await fs.writeFile(path.join(deck, 'pages/background.page'), JSON.stringify(source));
await fs.writeFile(path.join(deck, 'media/background.svg'), svg('#d8e5ef'));

const port = Number(process.env.HUANDENG_BACKGROUND_PORT ?? 4877);
const url = `http://127.0.0.1:${port}`;
const logs = [];
const child = spawn(
  process.execPath,
  [
    path.join(root, 'packages/core/huandeng.js'),
    'open',
    path.join(deck, 'deck.pptd'),
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
async function waitForSession() {
  const deadline = Date.now() + 45000;
  let failure;
  while (Date.now() < deadline) {
    try {
      return await api('/session');
    } catch (error) {
      failure = error;
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  }
  throw failure ?? new Error('The document service did not start.');
}
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
try {
  let snapshot = await waitForSession();
  token = snapshot.sessionToken;
  const pageId = snapshot.pages[0].pageId;
  const saved = await api(`/pages/${pageId}/checkpoints`, {
    requestId: randomUUID(),
    label: 'Blue background and red icon',
    expectedPageRevision: snapshot.pages[0].pageRevision,
    expectedMetadataRevision: snapshot.metadataRevision,
  });
  manifest.theme.colors.accent1 = '#008800';
  await fs.writeFile(path.join(deck, 'deck.pptd'), JSON.stringify(manifest));
  await fs.writeFile(path.join(deck, 'media/background.svg'), svg('#f6ddbd'));
  snapshot = await api('/session');
  const story = { purpose: '', audience: '', takeaway: '' };
  await api('/transactions', {
    deckId: snapshot.deckId,
    requestId: randomUUID(),
    actor: 'background-export-verification',
    expected: {
      metadata: snapshot.metadataRevision,
      manifest: snapshot.manifestRevision,
      pages: { [pageId]: snapshot.pages[0].pageRevision },
    },
    operations: [
      {
        op: 'project.replace',
        project: {
          schemaVersion: 1,
          mainStory: story,
          sections: [],
          presentations: [
            {
              id: 'background-check',
              title: 'Current and archived backgrounds',
              story,
              items: [
                { id: 'live', kind: 'page', pageId },
                { id: 'archived', kind: 'page', pageId, versionId: saved.versionId },
              ],
            },
          ],
        },
      },
    ],
  });
  const originalFiles = [
    'deck.pptd',
    'pages/background.page',
    'media/background.svg',
    '.huandeng/project.json',
  ];
  const before = await Promise.all(
    originalFiles.map(async (file) => [file, hash(await fs.readFile(path.join(deck, file)))]),
  );
  const exported = await api('/export', { format: 'pptx', presentationId: 'background-check' });
  assert.equal(exported.report.complete, true);
  assert.equal(exported.report.pages.length, 2);
  assert.equal(new Set(exported.report.pages.map((item) => item.pageId)).size, 1);
  assert.equal(new Set(exported.report.pages.map((item) => item.occurrenceId)).size, 2);
  assert.equal(exported.report.pages[1].versionId, saved.versionId);
  const files = unzipSync(await fs.readFile(exported.file));
  const pdf = await api('/export', { format: 'pdf', presentationId: 'background-check' });
  assert.equal(pdf.report.complete, true);
  const pdfBytes = await fs.readFile(pdf.file);
  assert.equal(pdfBytes.subarray(0, 4).toString(), '%PDF');
  const physicalPdfPages = [...pdfBytes.toString('latin1').matchAll(/\/Type\s*\/Page\b/g)].length;
  assert.equal(physicalPdfPages, 2, 'Two occurrences must produce exactly two physical PDF pages.');
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
  const page = await browser.newPage();
  const measurements = [];
  for (const [index, expected] of [
    [0, { background: [246, 221, 189], icon: [0, 136, 0] }],
    [1, { background: [216, 229, 239], icon: [187, 0, 0] }],
  ]) {
    const xml = strFromU8(files[`ppt/slides/slide${index + 1}.xml`]);
    const rels = strFromU8(files[`ppt/slides/_rels/slide${index + 1}.xml.rels`]);
    assert.match(xml, /<a:t>Caption stays editable above the SVG background<\/a:t>/);
    assert.match(xml, /name="overlapping-native-shape"/);
    const backgroundReport = exported.report.elements.find(
      (item) =>
        item.elementId === '$background' &&
        item.occurrenceId === exported.report.pages[index].occurrenceId,
    );
    assert.equal(backgroundReport.reason, 'IMAGE_FORMAT_FALLBACK');
    assert.equal(backgroundReport.mode, 'image');
    const pictures = [...xml.matchAll(/<p:pic>[\s\S]*?<\/p:pic>/g)];
    assert.equal(pictures.length, 5);
    for (const [pictureIndex, picture] of pictures.entries()) {
      const object = pictureIndex === 0 ? 'background' : picture[0].match(/\bname="([^"]+)"/)[1];
      const expectedColor = {
        background: expected.background,
        'async-icon': expected.icon,
        'overflow-short-text': [170, 0, 136],
        'overflow-paragraphs': [102, 51, 153],
        'overflow-stroke': [0, 136, 170],
      }[object];
      assert.ok(expectedColor, `Unexpected raster object: ${object}`);
      const extent = picture[0].match(/<a:ext cx="(\d+)" cy="(\d+)"/);
      const offset = picture[0].match(/<a:off x="(-?\d+)" y="(-?\d+)"/);
      const bounds = [...offset.slice(1), ...extent.slice(1)].map((value) => Number(value) / 12700);
      const id = picture[0].match(/<a:blip\b[^>]*r:embed="([^"]+)"/)[1];
      const relationship = [...rels.matchAll(/<Relationship\b[^>]*\/>/g)].find(([entry]) =>
        entry.includes(`Id="${id}"`),
      )[0];
      const target = relationship.match(/Target="([^"]+)"/)[1];
      const bytes = files[path.posix.normalize(path.posix.join('ppt/slides', target))];
      const pixels = await page.evaluate(async (base64) => {
        const image = new Image();
        image.src = `data:image/png;base64,${base64}`;
        await image.decode();
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext('2d');
        context.drawImage(image, 0, 0);
        const rgba = context.getImageData(0, 0, canvas.width, canvas.height).data;
        const colors = new Map();
        let transparentPixels = 0;
        for (let offset = 0; offset < rgba.length; offset += 4) {
          if (rgba[offset + 3] === 0) transparentPixels++;
          if (rgba[offset + 3] < 250) continue;
          const color = `${rgba[offset]},${rgba[offset + 1]},${rgba[offset + 2]}`;
          colors.set(color, (colors.get(color) ?? 0) + 1);
        }
        return {
          width: canvas.width,
          height: canvas.height,
          transparentPixels,
          colors: [...colors].sort((a, b) => b[1] - a[1]).slice(0, 5),
        };
      }, Buffer.from(bytes).toString('base64'));
      const dominant = pixels.colors[0];
      assert.ok(dominant, 'Foreground must be visible after the background screenshot finishes.');
      assert.equal(dominant[0], expectedColor.join(','));
      if (pictureIndex === 0) {
        assert.equal(pixels.width, 1920);
        assert.equal(pixels.height, 1080);
        assert.equal(
          pixels.colors.length,
          1,
          'Background capture must contain no foreground objects.',
        );
        assert.equal(pixels.transparentPixels, 0);
      } else {
        assert.ok(
          pixels.transparentPixels > 100,
          'Object fallback must retain transparent pixels.',
        );
        assert.ok(
          pixels.colors.every(([color]) => color !== expected.background.join(',')),
          'Object fallback must not contain the page background.',
        );
        assert.ok(
          pixels.colors.every(([color]) => color !== '0,0,0'),
          'Object fallback must not repeat an overlapping native shape.',
        );
        const overflow = {
          'overflow-short-text': { minimumHeight: 16, minimumBottom: 155 },
          'overflow-paragraphs': { minimumHeight: 50, minimumBottom: 280 },
          'overflow-stroke': { minimumHeight: 7, minimumBottom: 414 },
        }[object];
        if (overflow) {
          assert.ok(bounds[3] > overflow.minimumHeight, `${object} must retain visible overflow.`);
          assert.ok(
            bounds[1] + bounds[3] > overflow.minimumBottom,
            `${object} must retain descenders, later paragraphs and the lower stroke.`,
          );
          assert.equal(
            pixels.height / bounds[3],
            2,
            'Object pixels must map to the original page scale.',
          );
        }
      }
      measurements.push({
        occurrence: index + 1,
        object,
        bounds,
        ...pixels,
      });
      await fs.writeFile(path.join(evidence, `occurrence-${index + 1}-${object}.png`), bytes);
    }
  }
  for (const [file, digest] of before)
    assert.equal(hash(await fs.readFile(path.join(deck, file))), digest);
  await fs.copyFile(exported.file, path.join(evidence, 'background-export.pptx'));
  await fs.writeFile(path.join(evidence, 'background-export.pdf'), pdfBytes);
  await fs.writeFile(
    path.join(evidence, 'result.json'),
    `${JSON.stringify({ passed: true, sourceUnchanged: true, distinctOccurrences: true, archivedAssetsAndTheme: true, foregroundRestored: true, visibleOverflowPreserved: true, physicalPdfPages, measurements, report: exported.report }, null, 2)}\n`,
  );
  process.stdout.write(
    `${JSON.stringify({ passed: true, evidence, occurrences: 2, backgroundRasters: 2, restoredForegroundRasters: 8, visibleOverflowPreserved: true, physicalPdfPages })}\n`,
  );
} catch (error) {
  await fs.writeFile(
    path.join(evidence, 'failure.json'),
    JSON.stringify({ error: String(error), logs: logs.slice(-30), sandbox }, null, 2),
  );
  console.error(error);
  process.exitCode = 1;
} finally {
  await browser?.close().catch(() => {});
  child.kill('SIGTERM');
}
