import { createHash } from 'node:crypto';
import { strFromU8, unzipSync } from 'fflate';
import { describe, expect, it, vi } from 'vitest';
import {
  buildPptdPdf,
  buildPptdPptx,
  freezePptdExportSnapshot,
  PptdExportError,
  pptdPrintStyle,
} from './export';
import { fitImage } from './export-images';
import { deckFixture, PNG_FIXTURE } from './fixtures.test-utils';
import type { PageSnapshot, PptdElement } from './types';

const text: PptdElement = {
  elementId: 'finding',
  elementType: 'text',
  bounds: [10, 20, 200, 60],
  content: {
    text: 'Original finding: α < 0.05',
    fontSize: 18,
    fontFamily: { latin: 'Arial', ea: 'MiSans' },
  },
};
const image: PptdElement = {
  elementId: 'figure',
  elementType: 'image',
  bounds: [40, 90, 400, 200],
  src: 'media/original.png',
  fit: { mode: 'contain' },
};
const assets = { resolveAsset: async () => ({ bytes: PNG_FIXTURE, mimeType: 'image/png' }) };

describe('PPTD native PPTX export', () => {
  it.each([
    [960, 540],
    [600, 900],
  ])(
    'maps %s × %s logical points to exact EMU and preserves editable basics',
    async (width, height) => {
      const result = await buildPptdPptx(
        deckFixture(
          [
            text,
            {
              elementId: 'shape',
              elementType: 'shape',
              shapeName: 'ellipse',
              bounds: [100, 100, 80, 40],
              fill: { type: 'solid', color: '#ff6633' },
              border: { width: 2, color: '#000', style: 'solid' },
            },
            {
              elementId: 'arrow',
              elementType: 'line',
              bounds: [100, 150, 200, 0],
              viewBox: [1, 1],
              points: '0,0.5 1,0.5',
              curve: 'sharp',
              arrow: [null, 'arrow'],
              border: { width: 1, color: '#444444', style: 'dash' },
            },
          ],
          [width, height],
        ),
        assets,
      );
      const files = unzipSync(result.bytes);
      const slide = strFromU8(files['ppt/slides/slide1.xml']);
      expect(strFromU8(files['ppt/presentation.xml'])).toContain(
        `<p:sldSz cx="${width * 12700}" cy="${height * 12700}"/>`,
      );
      expect(slide).toContain('<a:off x="127000" y="254000"/>');
      expect(slide).toContain('sz="1800"');
      expect(slide).toContain('<a:bodyPr wrap="square"');
      expect(slide).toContain('<a:t>Original finding: α &lt; 0.05</a:t>');
      expect(slide).toContain('<a:ea typeface="MiSans"/>');
      expect(slide).toContain('<a:prstGeom prst="ellipse">');
      expect(slide).toContain('<a:custGeom>');
      expect(slide).toContain('<a:tailEnd type="triangle"/>');
      expect(slide).toContain('<a:ln w="12700"');
      expect(slide).not.toContain('<p:pic>');
      expect(strFromU8(files['ppt/notesSlides/notesSlide1.xml'])).toContain(
        'Original speaker notes',
      );
      expect(JSON.parse(strFromU8(files['huandeng/export-report.json']))).toEqual(result.report);
      expect(result.report.complete).toBe(true);
      expect(
        result.report.elements
          .filter((element) => element.elementId !== '$background')
          .every((element) => element.mode === 'native'),
      ).toBe(true);
    },
  );

  it('keeps original image bytes, deduplicates repeated assets and records their hash', async () => {
    const resolveAsset = vi.fn(assets.resolveAsset);
    const source = deckFixture([
      image,
      { ...image, elementId: 'zoom', crop: { left: 0.25, right: 0.25, top: 0.25, bottom: 0.25 } },
    ]);
    const before = structuredClone(source);
    const result = await buildPptdPptx(source, { resolveAsset });
    const files = unzipSync(result.bytes);
    const media = Object.keys(files).filter((path) => path.startsWith('ppt/media/'));
    expect(media).toHaveLength(1);
    expect(files[media[0]]).toEqual(PNG_FIXTURE);
    expect(resolveAsset).toHaveBeenCalledTimes(1);
    expect(result.report.assets[0]).toMatchObject({
      source: 'media/original.png',
      revision: `sha256:${createHash('sha256').update(PNG_FIXTURE).digest('hex')}`,
      byteLength: PNG_FIXTURE.byteLength,
    });
    const slide = strFromU8(files['ppt/slides/slide1.xml']);
    expect(slide).toContain('<a:srcRect l="25000" t="25000" r="25000" b="25000"/>');
    expect(slide).toContain('<a:off x="1778000" y="1143000"/>');
    expect(source).toEqual(before);
  });

  it('applies source crop before contain, cover or fill without modifying the source object', () => {
    const element: PptdElement = {
      ...image,
      bounds: [10, 20, 200, 200],
      crop: { left: 0.1, right: 0.1, top: 0, bottom: 0 },
    };
    const contained = fitImage(element, 1000, 500);
    expect(contained.bounds).toEqual([10, 57.5, 200, 125]);
    expect(contained.crop).toEqual({ l: 0.1, r: 0.1, t: 0, b: 0 });
    const covered = fitImage({ ...element, fit: { mode: 'cover' } }, 1000, 500);
    expect(covered.bounds).toEqual(element.bounds);
    expect(covered.crop).toEqual({ l: 0.25, r: 0.25, t: 0, b: 0 });
    expect(fitImage({ ...element, fit: { mode: 'fill' } }, 1000, 500).bounds).toEqual(
      element.bounds,
    );
    expect(() => fitImage({ ...element, crop: { left: 0.8, right: 0.2 } }, 1000, 500)).toThrow(
      'no source rectangle',
    );
  });

  it('rasterizes only an unsupported object while retaining an editable caption and original z-order', async () => {
    const complex: PptdElement = {
      elementId: 'compound',
      elementType: 'custom',
      bounds: [20, 40, 240, 100],
      sourceData: { doNotRewrite: [1, 3, 7] },
    };
    const rasterizeElement = vi.fn(async (_page: PageSnapshot) => ({
      bytes: PNG_FIXTURE,
      width: 1,
      height: 1,
    }));
    const source = deckFixture([complex, text]);
    const before = structuredClone(source);
    const result = await buildPptdPptx(source, { ...assets, rasterizeElement });
    const slide = strFromU8(unzipSync(result.bytes)['ppt/slides/slide1.xml']);
    expect(slide.indexOf('<p:pic>')).toBeLessThan(slide.indexOf('<p:sp>'));
    expect(slide).toContain('<a:t>Original finding:');
    expect(result.report.elements).toContainEqual(
      expect.objectContaining({
        elementId: 'compound',
        mode: 'image',
        reason: 'UNSUPPORTED_OBJECT',
      }),
    );
    expect(result.report.elements).toContainEqual(
      expect.objectContaining({ elementId: 'finding', mode: 'native' }),
    );
    expect(rasterizeElement).toHaveBeenCalledTimes(1);
    expect(Object.isFrozen(rasterizeElement.mock.calls[0][0])).toBe(true);
    expect(source).toEqual(before);
  });

  it('blocks unsupported objects with explicit page and object identities when no verified renderer exists', async () => {
    let failure: unknown;
    try {
      await buildPptdPptx(
        deckFixture([
          {
            elementId: 'formula-1',
            elementType: 'formula',
            bounds: [0, 0, 100, 30],
            latex: 'E=mc^2',
          },
        ]),
        assets,
      );
    } catch (error) {
      failure = error;
    }
    expect(failure).toBeInstanceOf(PptdExportError);
    const report = (failure as PptdExportError).report;
    expect(report.complete).toBe(false);
    expect(report.elements).toContainEqual(
      expect.objectContaining({
        pageId: 'page-test-1',
        shortCode: 'K7M2',
        elementId: 'formula-1',
        mode: 'blocked',
      }),
    );
    expect(report.diagnostics).toContainEqual(
      expect.objectContaining({ code: 'FALLBACK_UNAVAILABLE', severity: 'error' }),
    );
  });

  it('does not export a broken-image placeholder when an original asset is missing', async () => {
    const rasterizeElement = vi.fn(async () => ({ bytes: PNG_FIXTURE, width: 1, height: 1 }));
    await expect(
      buildPptdPptx(deckFixture([image]), {
        resolveAsset: async () => {
          throw new Error('Missing original');
        },
        rasterizeElement,
      }),
    ).rejects.toMatchObject({
      report: {
        complete: false,
        elements: expect.arrayContaining([
          expect.objectContaining({
            elementId: 'figure',
            mode: 'blocked',
            reason: 'ASSET_UNAVAILABLE',
          }),
        ]),
      },
    });
    expect(rasterizeElement).not.toHaveBeenCalled();
  });

  it('refuses fallback images with false pixel dimensions and rotated images without measured bounds', async () => {
    const source = deckFixture([
      { elementId: 'unsupported', elementType: 'custom', bounds: [30, 40, 120, 60] },
    ]);
    await expect(
      buildPptdPptx(source, {
        ...assets,
        rasterizeElement: async () => ({ bytes: PNG_FIXTURE, width: 2, height: 1 }),
      }),
    ).rejects.toBeInstanceOf(PptdExportError);
    source.pages[0].data.elements[0].rotation = 45;
    await expect(
      buildPptdPptx(source, {
        ...assets,
        rasterizeElement: async () => ({ bytes: PNG_FIXTURE, width: 1, height: 1 }),
      }),
    ).rejects.toBeInstanceOf(PptdExportError);
    const result = await buildPptdPptx(source, {
      ...assets,
      rasterizeElement: async () => ({
        bytes: PNG_FIXTURE,
        width: 1,
        height: 1,
        bounds: [25, 15, 127, 127],
      }),
    });
    expect(strFromU8(unzipSync(result.bytes)['ppt/slides/slide1.xml'])).toContain(
      '<a:off x="317500" y="190500"/>',
    );
  });

  it('preserves rich scientific text and explicitly falls back for formula source', async () => {
    const rich: PptdElement = {
      ...text,
      elementId: 'a"b&c',
      content: {
        ...text.content,
        text: '<p>CO<sub>2</sub> &amp; R<sup>2</sup> <span style="color:#990000">原始数据</span></p>',
      },
    };
    const result = await buildPptdPptx(deckFixture([rich]), assets);
    const slide = strFromU8(unzipSync(result.bytes)['ppt/slides/slide1.xml']);
    expect(slide).toContain('name="a&quot;b&amp;c"');
    expect(slide).toContain('baseline="-25000"');
    expect(slide).toContain('baseline="30000"');
    expect(slide).toContain('<a:t>原始数据</a:t>');
    expect(slide).toContain('val="990000"');
    const formula: PptdElement = { ...text, content: { text: '\\(E=mc^2\\)' } };
    const formulaResult = await buildPptdPptx(deckFixture([formula]), {
      ...assets,
      rasterizeElement: async () => ({ bytes: PNG_FIXTURE, width: 1, height: 1 }),
    });
    expect(formulaResult.report.elements).toContainEqual(
      expect.objectContaining({
        elementId: 'finding',
        reason: 'FORMULA_REQUIRES_RENDERER',
        mode: 'image',
      }),
    );
    expect(formula.content?.text).toBe('\\(E=mc^2\\)');
  });

  it('freezes the committed snapshot before asynchronous asset resolution', async () => {
    const source = deckFixture([image, structuredClone(text)]);
    let resolve: ((value: { bytes: Uint8Array }) => void) | undefined;
    const output = buildPptdPptx(source, {
      resolveAsset: () =>
        new Promise((done) => {
          resolve = done;
        }),
    });
    source.pages[0].data.elements[1].content = { text: 'Concurrent edit must not leak' };
    source.pages[0].pageRevision = 'sha256:later';
    resolve?.({ bytes: PNG_FIXTURE });
    const result = await output;
    expect(result.report.pages[0].pageRevision).toBe('sha256:page');
    const slide = strFromU8(unzipSync(result.bytes)['ppt/slides/slide1.xml']);
    expect(slide).toContain('Original finding');
    expect(slide).not.toContain('Concurrent edit');
    const frozen = freezePptdExportSnapshot(source);
    expect(Object.isFrozen(frozen.pages[0].data.elements)).toBe(true);
    expect(Object.isFrozen(source)).toBe(false);
  });
});

describe('PPTD PDF export adapter', () => {
  it('passes frozen content and physical dimensions to the same browser renderer', async () => {
    const source = deckFixture([text], [600, 900]);
    const result = await buildPptdPdf(source, {
      renderPdf: async (snapshot, options) => {
        expect(Object.isFrozen(snapshot.pages[0].data)).toBe(true);
        expect(options).toMatchObject({ widthPt: 600, heightPt: 900 });
        expect(options.printCss).toContain('@page{size:600pt 900pt;margin:0}');
        expect(options.printCss).toContain('width:800px;height:1200px');
        return { bytes: new TextEncoder().encode('%PDF-1.7\nfixture') };
      },
    });
    expect(result.mimeType).toBe('application/pdf');
    expect(result.report.elements[0].mode).toBe('rendered');
    expect(result.report.size).toEqual({ width: 600, height: 900, unit: 'pt' });
    expect(() => pptdPrintStyle([600, 900], 'bad}css')).toThrow();
  });

  it('blocks invalid PDF output and browser preflight errors', async () => {
    await expect(
      buildPptdPdf(deckFixture([text]), { renderPdf: async () => ({ bytes: PNG_FIXTURE }) }),
    ).rejects.toMatchObject({
      report: {
        complete: false,
        diagnostics: expect.arrayContaining([
          expect.objectContaining({ code: 'INVALID_PDF_OUTPUT' }),
        ]),
      },
    });
    await expect(
      buildPptdPdf(deckFixture([text]), {
        renderPdf: async () => ({
          bytes: new TextEncoder().encode('%PDF-1.7'),
          diagnostics: [
            {
              code: 'UNSUPPORTED_OBJECT',
              message: 'Cannot print a placeholder.',
              severity: 'error',
            },
          ],
        }),
      }),
    ).rejects.toBeInstanceOf(PptdExportError);
  });
});
