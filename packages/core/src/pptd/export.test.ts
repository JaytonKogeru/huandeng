import { createHash } from 'node:crypto';
import { strFromU8, unzipSync } from 'fflate';
import { describe, expect, it, vi } from 'vitest';
import {
  buildPptdPdf,
  buildPptdPptx,
  createExportReport,
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
  it('exports the base appearance of click builds and identifies omitted page transitions', async () => {
    const source = deckFixture([structuredClone(text)]);
    source.pages[0].data.timeline = {
      schemaVersion: 2,
      effects: [
        {
          id: 'enter',
          targetId: 'finding',
          kind: 'fade-in',
          trigger: 'click',
          durationMs: 300,
          delayMs: 0,
        },
        {
          id: 'move',
          targetId: 'finding',
          kind: 'move',
          trigger: 'click',
          durationMs: 300,
          delayMs: 0,
          dx: 400,
          dy: 0,
        },
      ],
    };
    source.pages[0].data.transition = { schemaVersion: 1, kind: 'fade', durationMs: 200 };
    const before = structuredClone(source);
    const result = await buildPptdPptx(source, assets);
    const xml = strFromU8(unzipSync(result.bytes)['ppt/slides/slide1.xml']);
    expect(xml).toContain('<a:off x="127000" y="254000"/>');
    expect(xml).not.toContain('<p:timing');
    expect(xml).not.toContain('<p:transition');
    for (const format of ['png', 'pdf', 'pptx'] as const) {
      const report = createExportReport(source, format);
      expect(report.renderState).toBe('base');
      expect(report.diagnostics).toContainEqual(
        expect.objectContaining({ code: 'TIMELINE_STATIC_EXPORT' }),
      );
      expect(report.diagnostics).toContainEqual(
        expect.objectContaining({ code: 'TRANSITION_NOT_EXPORTED' }),
      );
    }
    expect(source).toEqual(before);
  });
  it('exports the base geometry and explicitly reports that editable timelines remain in PPTD', async () => {
    const source = deckFixture([structuredClone(text)]);
    source.pages[0].data.timeline = {
      schemaVersion: 1,
      durationMs: 2000,
      tracks: [
        {
          id: 'motion',
          targetId: 'finding',
          property: 'x',
          keyframes: [{ id: 'start', timeMs: 0, value: 500, easing: 'linear' }],
        },
      ],
    };
    const result = await buildPptdPptx(source, assets);
    const files = unzipSync(result.bytes);
    expect(result.report.diagnostics).toContainEqual(
      expect.objectContaining({
        code: 'TIMELINE_STATIC_EXPORT',
        severity: 'warning',
        pageId: source.pages[0].pageId,
      }),
    );
    expect(strFromU8(files['ppt/slides/slide1.xml'])).toContain('<a:off x="127000" y="254000"/>');
    expect(source.pages[0].data.elements[0].bounds).toEqual([10, 20, 200, 60]);
    expect(source.pages[0].data.timeline).toMatchObject({
      tracks: [{ keyframes: [{ value: 500 }] }],
    });
    for (const format of ['png', 'pdf', 'pptx'] as const) {
      const report = createExportReport(source, format);
      expect(report.renderState).toBe('base');
      expect(report.diagnostics).toContainEqual(
        expect.objectContaining({ code: 'TIMELINE_STATIC_EXPORT' }),
      );
    }
  });
  it('exports repeated presentation occurrences and pinned versions without changing stable page IDs', async () => {
    const source = deckFixture([structuredClone(text)]);
    source.presentationId = 'seminar';
    source.writable = false;
    source.pages[0].occurrenceId = 'first-appearance';
    const pinned = structuredClone(source.pages[0]);
    pinned.occurrenceId = 'repeat-as-result';
    pinned.versionId = 'checkpoint:0123456789abcdef0123456789abcdef';
    pinned.pageRevision = 'sha256:pinned-version';
    pinned.data.elements[0].content = { text: 'Earlier saved conclusion', fontSize: 18 };
    source.pages.push(pinned);
    const result = await buildPptdPptx(source, assets);
    const files = unzipSync(result.bytes);
    expect(result.report.presentationId).toBe('seminar');
    expect(result.report.pages.map((page) => page.pageId)).toEqual(['page-test-1', 'page-test-1']);
    expect(result.report.pages.map((page) => page.occurrenceId)).toEqual([
      'first-appearance',
      'repeat-as-result',
    ]);
    expect(result.report.pages[1].versionId).toBe(pinned.versionId);
    expect(result.report.elements).toContainEqual(
      expect.objectContaining({
        pageId: 'page-test-1',
        occurrenceId: 'repeat-as-result',
        versionId: pinned.versionId,
        elementId: 'finding',
      }),
    );
    expect(strFromU8(files['ppt/slides/slide1.xml'])).toContain('Original finding');
    expect(strFromU8(files['ppt/slides/slide2.xml'])).toContain('Earlier saved conclusion');
    source.pages[1].occurrenceId = 'first-appearance';
    await expect(buildPptdPptx(source, assets)).rejects.toBeInstanceOf(PptdExportError);
    delete source.presentationId;
    source.pages[1].occurrenceId = 'distinct-but-main-duplicate';
    await expect(buildPptdPptx(source, assets)).rejects.toBeInstanceOf(PptdExportError);
  });

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

  it.each([1, 2, 3, 6, 8])(
    'preserves JPEG EXIF orientation %s through verified object rendering when needed',
    async (orientation) => {
      const bytes = Buffer.from(
        '/9j/4AAQSkZJRgABAQAAAQABAAD/4QAiRXhpZgAATU0AKgAAAAgAAQESAAMAAAABAAYAAAAAAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAACAAMDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDrqKKK9I8I/9k=',
        'base64',
      );
      const entry = bytes.indexOf(Buffer.from([0x01, 0x12, 0, 3, 0, 0, 0, 1]));
      expect(entry).toBeGreaterThan(0);
      bytes[entry + 9] = orientation;
      const before = Buffer.from(bytes);
      const rasterizeElement = vi.fn(async () => ({
        bytes: PNG_FIXTURE,
        width: 1,
        height: 1,
      }));
      const result = await buildPptdPptx(deckFixture([{ ...image, src: 'media/oriented.jpg' }]), {
        resolveAsset: async () => ({ bytes, mimeType: 'image/jpeg' }),
        rasterizeElement,
      });
      expect(result.report.complete).toBe(true);
      const imageReport = result.report.elements.find((element) => element.elementId === 'figure');
      expect(imageReport?.mode).toBe('image');
      if (orientation !== 1) {
        expect(imageReport?.reason).toBe('IMAGE_ORIENTATION_FALLBACK');
        expect(rasterizeElement).toHaveBeenCalledTimes(1);
      } else {
        expect(imageReport?.reason).toBe('ORIGINAL_ASSET');
        expect(rasterizeElement).not.toHaveBeenCalled();
      }
      expect(bytes).toEqual(before);
      expect(result.report.assets[0].revision).toBe(
        `sha256:${createHash('sha256').update(bytes).digest('hex')}`,
      );
    },
  );

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

  it('preserves rich scientific text and exports editable formula source', async () => {
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
    const rasterizeElement = vi.fn(async () => ({ bytes: PNG_FIXTURE, width: 1, height: 1 }));
    const formulaResult = await buildPptdPptx(deckFixture([formula]), {
      ...assets,
      rasterizeElement,
    });
    expect(formulaResult.report.elements).toContainEqual(
      expect.objectContaining({
        elementId: 'finding',
        reason: 'EDITABLE_TEXT_AND_EQUATIONS',
        mode: 'native',
      }),
    );
    const formulaXml = strFromU8(unzipSync(formulaResult.bytes)['ppt/slides/slide1.xml']);
    expect(formulaXml).toContain('<m:sSup>');
    expect(formulaXml).toContain('<a14:m');
    expect(formulaXml).toContain('<mc:Fallback>');
    expect(rasterizeElement).not.toHaveBeenCalled();
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
