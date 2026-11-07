import path from 'node:path';
import { strFromU8, unzipSync } from 'fflate';
import { describe, expect, it, vi } from 'vitest';
import { buildPptdPptx, PptdExportError } from './export';
import { deckFixture, PNG_FIXTURE } from './fixtures.test-utils';
import type { PptdElement } from './types';

const assets = { resolveAsset: async () => ({ bytes: PNG_FIXTURE, mimeType: 'image/png' }) };
const rasterizeElement = () => vi.fn(async () => ({ bytes: PNG_FIXTURE, width: 1, height: 1 }));

function chart(type: string, elementId = type): PptdElement {
  return {
    elementId,
    elementType: 'chart',
    bounds: [40, 60, 500, 300],
    title: 'Scientific measurements',
    dataLabels: true,
    data: {
      cols: ['sample', 'value', 'size'],
      rows: ['scatter', 'bubble'].includes(type)
        ? [
            [0, 0, 0],
            [2, 4, 9],
            [3, -1, 4],
          ]
        : [
            ['A', 0, 0],
            ['B', 4, 9],
            ['C', -1, 4],
          ],
    },
    series: [
      {
        type,
        name: 'Assay',
        encode: { x: 'sample', y: 'value', size: 'size', category: 'sample', value: 'size' },
      },
    ],
  };
}

function validateRelationships(files: Record<string, Uint8Array>): void {
  for (const [name, bytes] of Object.entries(files)) {
    if (!name.endsWith('.rels')) continue;
    const sourceDirectory = path.posix.dirname(path.posix.dirname(name));
    for (const relationship of strFromU8(bytes).matchAll(/<Relationship\b[^>]*\/>/g)) {
      if (/TargetMode="External"/.test(relationship[0])) continue;
      const target = relationship[0].match(/\bTarget="([^"]+)"/)?.[1];
      expect(target, name).toBeTruthy();
      const part = target?.startsWith('/')
        ? target.slice(1)
        : path.posix.normalize(path.posix.join(sourceDirectory, target ?? ''));
      expect(files[part], `${name} → ${part}`).toBeDefined();
    }
  }
}

describe('Editable scientific PPTX objects', () => {
  it.each(['bar', 'line', 'area', 'pie', 'scatter', 'bubble'])(
    'embeds a native %s chart with a complete editable workbook and exact zero/negative data',
    async (type) => {
      const source = deckFixture([chart(type)]);
      const before = structuredClone(source);
      const raster = rasterizeElement();
      const result = await buildPptdPptx(source, { ...assets, rasterizeElement: raster });
      expect(result.report.elements).toContainEqual(
        expect.objectContaining({
          elementId: type,
          reason: 'EDITABLE_CHART_AND_WORKBOOK',
          mode: 'native',
        }),
      );
      expect(raster).not.toHaveBeenCalled();
      const files = unzipSync(result.bytes);
      validateRelationships(files);
      const chartPath = Object.keys(files).find(
        (name) => name.startsWith('ppt/charts/') && name.endsWith('.xml'),
      );
      expect(chartPath).toBeTruthy();
      const native = strFromU8(files[chartPath as string]);
      expect(native).toContain(`<c:${type === 'pie' ? 'pie' : type}Chart>`);
      expect(native).toContain('<c:externalData');
      for (const cache of native.matchAll(/<c:numCache>([\s\S]*?)<\/c:numCache>/g)) {
        for (const value of cache[1].matchAll(/<c:v>([\s\S]*?)<\/c:v>/g))
          expect(
            Number.isFinite(Number(value[1])),
            'Native numeric caches must not contain category labels',
          ).toBe(true);
      }
      if (!['scatter', 'bubble'].includes(type)) {
        expect(native).toContain('<c:strCache>');
        expect(native).not.toContain('<c:dateAx>');
      }
      const workbookPath = Object.keys(files).find((name) => name.endsWith('.xlsx')) as string;
      const workbook = unzipSync(files[workbookPath]);
      const sheet = strFromU8(workbook['xl/worksheets/sheet1.xml']);
      expect(sheet).toMatch(/<c\b[^>]*r="B2"[^>]*><v>0<\/v><\/c>/);
      if (type !== 'pie') expect(sheet).toMatch(/<c\b[^>]*r="B4"[^>]*><v>-1<\/v><\/c>/);
      if (type === 'bubble') expect(sheet).toMatch(/<c\b[^>]*r="C2"[^>]*><v>0<\/v><\/c>/);
      expect(strFromU8(files['[Content_Types].xml'])).toContain(`PartName="/${chartPath}"`);
      expect(strFromU8(files['ppt/slides/slide1.xml'])).toContain('<c:chart');
      expect(source).toEqual(before);
    },
  );

  it('keeps multiple chart parts and workbook relationships distinct, including mixed chart series', async () => {
    const combined = chart('bar', 'combined');
    combined.series = [
      { type: 'bar', name: 'Counts', encode: { x: 'sample', y: 'value' } },
      { type: 'line', name: 'Estimate', encode: { x: 'sample', y: 'size' } },
    ];
    const result = await buildPptdPptx(deckFixture([combined, chart('scatter')]), assets);
    const files = unzipSync(result.bytes);
    validateRelationships(files);
    const charts = Object.keys(files).filter(
      (name) => name.startsWith('ppt/charts/') && name.endsWith('.xml'),
    );
    expect(charts).toHaveLength(2);
    expect(Object.keys(files).filter((name) => name.endsWith('.xlsx'))).toHaveLength(2);
    const mixed = charts
      .map((name) => strFromU8(files[name]))
      .find((xml) => xml.includes('<c:barChart>'));
    expect(mixed).toContain('<c:lineChart>');
    expect(mixed).toContain('Counts');
    expect(mixed).toContain('Estimate');
    const nativeLine = mixed?.match(/<c:lineChart>([\s\S]*?)<\/c:lineChart>/)?.[1];
    expect(nativeLine).not.toContain('<c:dLblPos val="outEnd"/>');
    expect(nativeLine).toContain('<c:dLblPos val="t"/>');
    const slide = strFromU8(files['ppt/slides/slide1.xml']);
    expect(slide.match(/<p:graphicFrame>/g)).toHaveLength(2);
    expect(slide).toContain('name="combined"');
    expect(slide).toContain('name="scatter"');
  });

  it('preserves missing values and advanced chart appearance through explicit object fallback', async () => {
    const gaps = chart('line', 'missing-data');
    gaps.data = {
      cols: ['sample', 'value'],
      rows: [
        ['A', 0],
        ['B', null],
        ['C', 3],
      ],
    };
    gaps.series = [{ type: 'line', encode: { x: 'sample', y: 'value' } }];
    const advanced = chart('heatmap');
    advanced.series = [{ type: 'heatmap', encode: { x: 'sample', y: 'size', value: 'value' } }];
    const raster = rasterizeElement();
    const result = await buildPptdPptx(deckFixture([gaps, advanced]), {
      ...assets,
      rasterizeElement: raster,
    });
    expect(result.report.elements).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          elementId: 'missing-data',
          mode: 'image',
          reason: 'CHART_GAPS_FALLBACK',
        }),
        expect.objectContaining({
          elementId: 'heatmap',
          mode: 'image',
          reason: 'CHART_FAMILY_FALLBACK',
        }),
      ]),
    );
    expect(raster).toHaveBeenCalledTimes(2);
    expect((gaps.data as { rows: unknown[][] }).rows[1][1]).toBeNull();
  });

  it('preserves legacy horizontal value/category axes and their titles without exchanging measurements', async () => {
    const horizontal = chart('bar');
    horizontal.xAxis = { type: 'value', title: 'Measured amount', min: -2, max: 6 };
    horizontal.yAxis = { type: 'category', title: 'Cohort' };
    horizontal.series = [{ type: 'bar', encode: { x: 'value', y: 'sample' } }];
    const result = await buildPptdPptx(deckFixture([horizontal]), assets);
    const files = unzipSync(result.bytes);
    const chartPath = Object.keys(files).find(
      (name) => name.startsWith('ppt/charts/') && name.endsWith('.xml'),
    ) as string;
    const native = strFromU8(files[chartPath]);
    expect(native).toContain('<c:barDir val="bar"/>');
    const category = native.match(/<c:catAx>([\s\S]*?)<\/c:catAx>/)?.[1];
    const value = native.match(/<c:valAx>([\s\S]*?)<\/c:valAx>/)?.[1];
    expect(category).toContain('Cohort');
    expect(value).toContain('Measured amount');
    expect(value).toContain('<c:min val="-2"/>');
    expect(value).toContain('<c:max val="6"/>');
    const workbookPath = Object.keys(files).find((name) => name.endsWith('.xlsx')) as string;
    const sheet = strFromU8(unzipSync(files[workbookPath])['xl/worksheets/sheet1.xml']);
    expect(sheet).toMatch(/<c\b[^>]*r="B4"[^>]*><v>-1<\/v><\/c>/);
  });

  it('exports real merged table cells, effective styles, formulas and measured row heights', async () => {
    const table: PptdElement = {
      elementId: 'results-table',
      elementType: 'table',
      bounds: [30, 50, 600, 120],
      columnWidths: [0.25, 0.25, 0.5],
      style: {
        cellStyle: { fontSize: 16, color: '#223344', border: { color: '#445566', width: 1 } },
        firstRowStyle: { fill: '#ddeeff', bold: true },
      },
      rows: [
        [{ text: 'Merged cohort', rowSpan: 2, colSpan: 2 }, { text: 'Estimate' }],
        [{ text: '\\(\\frac{x_1}{x_2}\\)', align: ['right', 'bottom'] }],
        [{ text: 'Control' }, { text: '0' }, { text: 'Observed', fill: null }],
      ],
    };
    const source = deckFixture([table]);
    const before = structuredClone(source);
    const result = await buildPptdPptx(source, {
      ...assets,
      measureTable: async () => ({ rowHeights: [44, 56, 37] }),
    });
    const xml = strFromU8(unzipSync(result.bytes)['ppt/slides/slide1.xml']);
    const choice = xml.match(/<mc:Choice[^>]*>([\s\S]*?)<\/mc:Choice>/)?.[1] as string;
    expect(choice).toContain(
      'graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/table"',
    );
    expect(choice).toContain('<a:tc rowSpan="2" gridSpan="2">');
    expect(choice).toContain('<a:tc rowSpan="2" hMerge="1">');
    expect(choice).toContain('<a:tc gridSpan="2" vMerge="1">');
    expect(choice).toContain('<a:tc hMerge="1" vMerge="1">');
    expect(choice.match(/<a:tc(?:\s|>)/g)).toHaveLength(9);
    expect(choice.match(/Merged cohort/g)).toHaveLength(1);
    expect(choice).toContain('<a:tr h="558800">');
    expect(choice).toContain('<a:tr h="711200">');
    expect(choice).toContain('<a:tr h="469900">');
    expect(choice).toContain('<a:ext cx="7620000" cy="1739900"/>');
    expect(choice).toContain('val="DDEEFF"');
    expect(choice).toContain('sz="1600"');
    expect(choice).toContain('<m:f>');
    expect(choice).not.toContain('<p:pic>');
    expect(result.report.elements).toContainEqual(
      expect.objectContaining({
        elementId: 'results-table',
        mode: 'native',
        reason: 'EDITABLE_TABLE_AND_EQUATIONS',
      }),
    );
    expect(source).toEqual(before);
  });

  it('retains fractions, matrices, limits, comparisons and inline formula color as editable Office math', async () => {
    const formula: PptdElement = {
      elementId: 'equations',
      elementType: 'text',
      bounds: [40, 50, 800, 300],
      content: {
        fontSize: 20,
        text: '<p>条件 <span style="color:#aa2200">\\(x &lt; y\\)</span>, \\(\\bar{x}\\)</p>\\[\\int_0^1 \\frac{x^2}{\\sqrt{x+1}}\\,dx + \\begin{pmatrix}a&b\\\\c&d\\end{pmatrix}\\]',
      },
    };
    const result = await buildPptdPptx(deckFixture([formula]), assets);
    const xml = strFromU8(unzipSync(result.bytes)['ppt/slides/slide1.xml']);
    expect(xml).toContain('<m:nary>');
    expect(xml).toContain('<m:f>');
    expect(xml).toContain('<m:rad>');
    expect(xml).toContain('<m:m>');
    expect(xml).toContain('Cambria Math');
    expect(xml).toContain('<m:oMathPara');
    expect(xml).toContain('<m:chr m:val="\u0305"/>');
    expect(xml).not.toContain('<m:chr m:val="\u02c9"/>');
    expect(xml).toContain('val="AA2200"');
    expect(xml).not.toContain('<p:pic>');
    const choice = xml.match(/<mc:Choice[^>]*>([\s\S]*?)<\/mc:Choice>/)?.[1] as string;
    const paragraphs = [...choice.matchAll(/<a:p>[\s\S]*?<\/a:p>/g)];
    expect(paragraphs).toHaveLength(2);
    for (const [paragraph] of paragraphs) {
      expect(paragraph).toContain('<a:lnSpc><a:spcPct val="100000"/></a:lnSpc>');
      expect(paragraph).not.toContain('<a:lnSpc><a:spcPts');
    }
  });

  it('blocks malformed equations and invalid chart data instead of disguising them as successful images', async () => {
    const invalid: PptdElement = {
      elementId: 'invalid-equation',
      elementType: 'text',
      bounds: [0, 0, 100, 100],
      content: { text: '\\(\\frac{\\)' },
    };
    const raster = rasterizeElement();
    await expect(
      buildPptdPptx(deckFixture([invalid]), { ...assets, rasterizeElement: raster }),
    ).rejects.toMatchObject({
      report: {
        elements: expect.arrayContaining([
          expect.objectContaining({ reason: 'INVALID_FORMULA', mode: 'blocked' }),
        ]),
      },
    });
    const invalidChart = chart('pie');
    invalidChart.series = [{ type: 'pie', encode: { category: 'sample', value: 'value' } }];
    await expect(
      buildPptdPptx(deckFixture([invalidChart]), { ...assets, rasterizeElement: raster }),
    ).rejects.toBeInstanceOf(PptdExportError);
    expect(raster).not.toHaveBeenCalled();
  });

  it('exports group members once and uses frozen page theme overrides without mutating the project theme', async () => {
    const shape: PptdElement = {
      elementId: 'hexagon',
      elementType: 'shape',
      shapeName: 'hexagon',
      bounds: [20, 20, 100, 100],
      fill: { type: 'solid', color: '$accent1' },
    };
    const group: PptdElement = { elementId: 'group', elementType: 'group', children: ['hexagon'] };
    const source = deckFixture([shape, group]);
    source.manifest.theme = { colors: { accent1: '#ff0000' } };
    source.pages[0].metadata.themeOverride = { colors: { accent1: '#00ff00' } };
    const result = await buildPptdPptx(source, assets);
    const xml = strFromU8(unzipSync(result.bytes)['ppt/slides/slide1.xml']);
    expect(xml.match(/<p:sp>/g)).toHaveLength(1);
    expect(xml).toContain('<a:prstGeom prst="hexagon">');
    expect(xml).toContain('val="00FF00"');
    expect(xml).not.toContain('val="FF0000"');
    expect(xml).toContain('<p:grpSp>');
    expect(result.report.elements).toContainEqual(
      expect.objectContaining({ elementId: 'group', reason: 'EDITABLE_GROUP' }),
    );
    expect(source.manifest.theme).toEqual({ colors: { accent1: '#ff0000' } });
  });

  it('preserves nested native groups, math and object fallback without applying transforms twice', async () => {
    const text: PptdElement = {
      elementId: 'math',
      elementType: 'text',
      bounds: [30, 50, 200, 60],
      rotation: 20,
      content: { text: '\\(x^2\\)', fontSize: 20 },
    };
    const image: PptdElement = {
      elementId: 'complex',
      elementType: 'custom',
      bounds: [250, 50, 100, 60],
      flip: [true, false],
    };
    const shape: PptdElement = {
      elementId: 'shape',
      elementType: 'shape',
      bounds: [400, 50, 100, 60],
      fill: '#223344',
    };
    const inner: PptdElement = {
      elementId: 'inner',
      elementType: 'group',
      bounds: [30, 50, 320, 60],
      children: ['math', 'complex'],
      rotation: 20,
    };
    const outer: PptdElement = {
      elementId: 'outer',
      elementType: 'group',
      bounds: [30, 50, 470, 60],
      children: ['inner', 'shape'],
    };
    const result = await buildPptdPptx(deckFixture([text, image, shape, inner, outer]), {
      ...assets,
      rasterizeElement: rasterizeElement(),
    });
    const files = unzipSync(result.bytes);
    validateRelationships(files);
    const xml = strFromU8(files['ppt/slides/slide1.xml']);
    expect(xml.match(/<p:grpSp>/g)).toHaveLength(2);
    expect(xml.indexOf('name="outer"')).toBeLessThan(xml.indexOf('name="inner"'));
    expect(xml).toContain('name="complex"');
    expect(xml).toContain('<mc:AlternateContent');
    expect(xml).toContain('<m:sSup>');
    expect(xml.match(/<p:pic>/g)).toHaveLength(1);
    expect(xml).not.toContain('flipH="1"');
    expect(xml).toContain('<a:off x="381000" y="635000"/>');
    expect(xml).toContain('<a:chOff x="381000" y="635000"/>');
    expect(xml).not.toMatch(/<p:grpSpPr><a:xfrm[^>]+rot=/);
  });

  it('keeps interleaved members separate so native grouping cannot change the drawing order', async () => {
    const member = (elementId: string): PptdElement => ({
      elementId,
      elementType: 'shape',
      bounds: [30, 40, 100, 100],
      fill: '#456789',
    });
    const group: PptdElement = {
      elementId: 'group',
      elementType: 'group',
      bounds: [30, 40, 100, 100],
      children: ['a', 'b'],
    };
    const result = await buildPptdPptx(
      deckFixture([member('a'), member('outside'), member('b'), group]),
      assets,
    );
    const xml = strFromU8(unzipSync(result.bytes)['ppt/slides/slide1.xml']);
    expect(xml).not.toContain('<p:grpSp>');
    expect(xml.indexOf('name="a"')).toBeLessThan(xml.indexOf('name="outside"'));
    expect(xml.indexOf('name="outside"')).toBeLessThan(xml.indexOf('name="b"'));
    expect(result.report.diagnostics).toContainEqual(
      expect.objectContaining({ code: 'GROUP_EXPORTED_AS_MEMBERS' }),
    );
  });
});
