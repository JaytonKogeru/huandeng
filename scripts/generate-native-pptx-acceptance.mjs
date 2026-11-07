import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(root, 'packages/core/package.json'));
const { createServer } = await import(require.resolve('vite'));
const { strFromU8, unzipSync } = require('fflate');
const output = path.resolve(process.argv[2] ?? path.join(root, '.verification/native-v04'));
const server = await createServer({
  root,
  configFile: false,
  optimizeDeps: { noDiscovery: true, entries: [] },
  server: { middlewareMode: true },
  logLevel: 'silent',
});

function title(text) {
  return {
    elementId: 'title',
    elementType: 'text',
    bounds: [36, 24, 880, 50],
    content: { text, fontFamily: 'Arial', fontSize: 25, color: '#173b33' },
  };
}

function chart(id, type, bounds, rows, series) {
  return {
    elementId: id,
    elementType: 'chart',
    bounds,
    title: id,
    legend: true,
    dataLabels: true,
    data: { cols: ['x', 'y', 'z'], rows },
    series: series ?? [
      { type, name: 'Measured', encode: { x: 'x', y: 'y', size: 'z', category: 'x', value: 'z' } },
    ],
  };
}

const pageElements = [
  [
    title('HUANDENG — editable equations and merged results'),
    {
      elementId: 'equations',
      elementType: 'text',
      bounds: [40, 91, 875, 125],
      content: {
        fontFamily: 'Arial',
        fontSize: 21,
        color: '#253830',
        text: '<p>Inline: \\(E=mc^2\\), confidence: \\(p &lt; 0.05\\)</p>\\[\\int_0^1 \\frac{x^2}{\\sqrt{x+1}}\\,dx + \\begin{pmatrix}a&b\\\\c&d\\end{pmatrix}\\]',
      },
    },
    {
      elementId: 'results-table',
      elementType: 'table',
      bounds: [40, 260, 875, 190],
      columnWidths: [0.22, 0.22, 0.56],
      rowHeights: [45 / 190, 55 / 190, 45 / 190, 45 / 190],
      rows: [
        [{ text: 'Cohort', rowSpan: 2, colSpan: 2 }, { text: 'Statistic' }],
        [{ text: '\\(\\frac{x_1}{x_2}\\)', fontSize: 20 }],
        [{ text: 'Control' }, { text: '0' }, { text: '<b>0 is a measurement</b>' }],
        [{ text: 'Treatment' }, { text: '-1' }, { text: '\\(\\bar{x} \\pm 1.96\\sigma\\)' }],
      ],
      style: {
        cellStyle: {
          fontFamily: 'Arial',
          fontSize: 16,
          color: '#253830',
          border: { width: 1, color: '#82988e' },
        },
        firstRowStyle: { fill: '#daeae0', bold: true },
      },
    },
    {
      elementId: 'caption',
      elementType: 'text',
      bounds: [40, 477, 880, 30],
      content: {
        fontSize: 14,
        fontFamily: 'Arial',
        text: 'Synthetic acceptance data. Select the table cells and equations in PowerPoint to edit.',
      },
    },
  ],
  [
    title('Editable categorical charts — zero, negatives and combination'),
    chart(
      'Bar data with zero',
      'bar',
      [30, 90, 440, 380],
      [
        ['A', 0, 1],
        ['B', 4, 3],
        ['C', -1, 2],
      ],
    ),
    chart(
      'Counts and estimate',
      'bar',
      [490, 90, 440, 380],
      [
        ['A', 0, 1],
        ['B', 4, 3],
        ['C', -1, 2],
      ],
      [
        { type: 'bar', name: 'Counts', encode: { x: 'x', y: 'y' } },
        { type: 'line', name: 'Estimate', encode: { x: 'x', y: 'z' } },
      ],
    ),
  ],
  [
    title('Editable scientific XY charts — actual numeric X coordinates'),
    chart(
      'Scatter',
      'scatter',
      [30, 90, 440, 380],
      [
        [0, 0, 0],
        [2, 4, 9],
        [3, -1, 4],
        [8, 5, 16],
      ],
    ),
    chart(
      'Bubble',
      'bubble',
      [490, 90, 440, 380],
      [
        [0, 0, 0],
        [2, 4, 9],
        [3, -1, 4],
        [8, 5, 16],
      ],
    ),
  ],
  [
    title('Editable pie and area charts'),
    chart(
      'Pie',
      'pie',
      [30, 90, 440, 380],
      [
        ['A', 0, 0],
        ['B', 4, 9],
        ['C', -1, 4],
      ],
    ),
    chart(
      'Area',
      'area',
      [490, 90, 440, 380],
      [
        ['A', 0, 1],
        ['B', 4, 3],
        ['C', -1, 2],
      ],
    ),
  ],
  [
    title('Native scientific diagram presets and grouped members'),
    ...['hexagon', 'star5', 'leftRightArrow', 'heart', 'trapezoid', 'upArrow', 'plus'].map(
      (shapeName, i) => ({
        elementId: `shape-${i}`,
        elementType: 'shape',
        shapeName,
        bounds: [40 + (i % 4) * 225, 100 + Math.floor(i / 4) * 200, 150, 125],
        fill: { type: 'solid', color: ['#2d6b61', '#d38a3e', '#647ab0', '#a8688b'][i % 4] },
        border: { width: 1, color: '#183b32', style: 'solid' },
      }),
    ),
    {
      elementId: 'diagram-group',
      elementType: 'group',
      bounds: [40, 100, 600, 125],
      children: ['shape-0', 'shape-1', 'shape-2'],
    },
  ],
];

try {
  const { buildPptdPptx } = await server.ssrLoadModule('/packages/core/src/pptd/export.ts');
  const pages = pageElements.map((elements, index) => {
    const pageId = `native-acceptance-${index + 1}`;
    const shortCode = `QA${String(index + 1).padStart(2, '0')}`;
    const pagePath = `pages/${index + 1}.page`;
    return {
      pageId,
      shortCode,
      path: pagePath,
      state: 'active',
      pageRevision: `sha256:acceptance-page-${index + 1}`,
      renderRevision: `sha256:acceptance-render-${index + 1}`,
      data: {
        elements,
        notes: `Native scientific export acceptance page ${index + 1}. Synthetic data, not research conclusions.`,
      },
      metadata: { shortCode, path: pagePath, state: 'active' },
    };
  });
  const snapshot = {
    kind: 'pptd',
    deckId: 'native-acceptance-project',
    entry: 'deck.pptd',
    title: 'HUANDENG native scientific acceptance',
    size: [960, 540],
    manifest: {
      title: 'HUANDENG native scientific acceptance',
      size: [960, 540],
      pages: pages.map((page) => page.path),
      theme: { colors: { text: '#253830', accent1: '#2d6b61', accent2: '#d38a3e' } },
    },
    manifestRevision: 'sha256:acceptance-manifest',
    metadataRevision: 'sha256:acceptance-metadata',
    pages,
    metadata: {
      schemaVersion: 1,
      deckId: 'native-acceptance-project',
      entry: 'deck.pptd',
      slides: Object.fromEntries(pages.map((page) => [page.pageId, page.metadata])),
    },
    identityPersisted: true,
    writable: true,
    epoch: 'native-acceptance',
    sequence: 0,
    diagnostics: [],
  };
  const result = await buildPptdPptx(snapshot, {
    resolveAsset: async () => {
      throw new Error('The native acceptance fixture requires no external assets.');
    },
    measureTable: async () => ({ rowHeights: [45, 55, 45, 45] }),
  });
  assert.equal(result.report.complete, true);
  assert(result.report.elements.every((element) => element.mode === 'native'));
  const files = unzipSync(result.bytes);
  assert.equal(
    Object.keys(files).filter((part) => part.startsWith('ppt/charts/') && part.endsWith('.xml'))
      .length,
    6,
  );
  assert.equal(Object.keys(files).filter((part) => part.endsWith('.xlsx')).length, 6);
  assert(strFromU8(files['ppt/slides/slide1.xml']).includes('<m:oMath'));
  assert(strFromU8(files['ppt/slides/slide1.xml']).includes('<a:tbl>'));
  assert(strFromU8(files['ppt/slides/slide5.xml']).includes('<p:grpSp>'));
  await fs.mkdir(output, { recursive: true });
  await fs.writeFile(path.join(output, 'native-export-acceptance.pptx'), result.bytes);
  await fs.writeFile(
    path.join(output, 'native-export-acceptance.snapshot.json'),
    `${JSON.stringify(snapshot, null, 2)}\n`,
  );
  await fs.writeFile(
    path.join(output, 'native-export-acceptance.report.json'),
    `${JSON.stringify(result.report, null, 2)}\n`,
  );
  const summary = {
    path: path.join(output, 'native-export-acceptance.pptx'),
    sha256: createHash('sha256').update(result.bytes).digest('hex'),
    bytes: result.bytes.length,
    pages: pages.length,
    nativeCharts: 6,
    nativeTables: 1,
    nativeGroups: 1,
  };
  await fs.writeFile(path.join(output, 'generation.json'), `${JSON.stringify(summary, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(summary)}\n`);
} finally {
  await server.close();
}
