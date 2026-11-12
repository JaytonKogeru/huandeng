import path from 'node:path';
import { strFromU8, unzipSync } from 'fflate';
import { describe, expect, it, vi } from 'vitest';
import { buildPptdPptx } from './export';
import { deckFixture, PNG_FIXTURE } from './fixtures.test-utils';
import type { PptdElement } from './types';

const assets = { resolveAsset: async () => ({ bytes: PNG_FIXTURE, mimeType: 'image/png' }) };

function text(elementId: string, source: string): PptdElement {
  return {
    elementId,
    elementType: 'text',
    bounds: [20, 20, 400, 80],
    content: { text: source, fontFamily: 'Arial', fontSize: 18 },
  };
}

function relationships(files: Record<string, Uint8Array>, slide = 1) {
  return [
    ...strFromU8(files[`ppt/slides/_rels/slide${slide}.xml.rels`]).matchAll(
      /<Relationship\b[^>]*\/>/g,
    ),
  ].map(([xml]) => ({
    id: xml.match(/\bId="([^"]+)"/)?.[1],
    target: xml.match(/\bTarget="([^"]+)"/)?.[1],
    type: xml.match(/\bType="([^"]+)"/)?.[1],
    external: xml.includes('TargetMode="External"'),
  }));
}

describe('native PPTX hyperlinks', () => {
  it('keeps linked rich-text runs editable, with escaped destinations and inherited emphasis', async () => {
    const source = deckFixture([
      text(
        'references',
        '<p>Read <a href="https://example.org/source?a=1&amp;b=2#readme" style="color:#234567">' +
          '<strong>Original</strong> <span style="font-family:MiSans">原文</span></a> here.</p>',
      ),
    ]);
    const before = structuredClone(source);
    const rasterizeElement = vi.fn(async () => ({ bytes: PNG_FIXTURE, width: 1, height: 1 }));
    const result = await buildPptdPptx(source, { ...assets, rasterizeElement });
    const files = unzipSync(result.bytes);
    const xml = strFromU8(files['ppt/slides/slide1.xml']);
    const rels = relationships(files);
    const links = rels.filter((rel) => rel.type?.endsWith('/hyperlink'));
    expect(links).toEqual([
      expect.objectContaining({
        target: 'https://example.org/source?a=1&amp;b=2#readme',
        external: true,
      }),
    ]);
    const runs = [...xml.matchAll(/<a:r>([\s\S]*?)<\/a:r>/g)].map((match) => match[1]);
    const linked = runs.filter((run) => run.includes('<a:hlinkClick'));
    expect(linked).toHaveLength(3);
    for (const run of linked) {
      expect(run).toContain(`r:id="${links[0].id}"`);
      expect(run).toContain('val="234567"');
      expect(run).toContain('u="sng"');
      expect(run).toContain(
        '<ahyp:hlinkClr xmlns:ahyp="http://schemas.microsoft.com/office/drawing/2018/hyperlinkcolor" val="tx"/>',
      );
    }
    expect(linked.find((run) => run.includes('Original'))).toContain('b="1"');
    expect(linked.find((run) => run.includes('原文'))).toContain('<a:ea typeface="MiSans"/>');
    expect(runs.find((run) => run.includes(' here.'))).not.toContain('<a:hlinkClick');
    expect(xml).not.toContain('<p:pic>');
    expect(rasterizeElement).not.toHaveBeenCalled();
    expect(source).toEqual(before);
  });

  it('resolves native table links against the final slide alongside charts, images and notes', async () => {
    const destination = 'https://example.org/project';
    const table: PptdElement = {
      elementId: 'credits',
      elementType: 'table',
      bounds: [20, 320, 700, 140],
      columnWidths: [0.5, 0.5],
      rows: [
        [{ text: `<a href="${destination}">Project</a>` }, { text: 'Contribution' }],
        [
          { text: '<a href="https://example.org/docs?q=&quot;source&quot;&amp;n=2">Docs</a>' },
          { text: `<a href="${destination}">Repeated reference</a>` },
        ],
      ],
    };
    const chart: PptdElement = {
      elementId: 'chart',
      elementType: 'chart',
      bounds: [450, 20, 300, 200],
      data: {
        cols: ['sample', 'value'],
        rows: [
          ['A', 0],
          ['B', 4],
        ],
      },
      series: [{ type: 'bar', encode: { x: 'sample', y: 'value' } }],
    };
    const image: PptdElement = {
      elementId: 'photo',
      elementType: 'image',
      bounds: [800, 20, 80, 80],
      src: 'media/original.png',
      fit: { mode: 'contain' },
    };
    const source = deckFixture([
      text('before-chart', `<a href="${destination}">Project</a>`),
      chart,
      image,
      table,
      text('after-chart', '<a href="mailto:team@example.org">Contact</a>'),
    ]);
    const before = structuredClone(source);
    const result = await buildPptdPptx(source, assets);
    const files = unzipSync(result.bytes);
    const xml = strFromU8(files['ppt/slides/slide1.xml']);
    const rels = relationships(files);
    expect(new Set(rels.map((rel) => rel.id)).size).toBe(rels.length);
    expect(rels.filter((rel) => rel.type?.endsWith('/hyperlink'))).toHaveLength(3);
    expect(rels.some((rel) => rel.type?.endsWith('/chart'))).toBe(true);
    expect(rels.some((rel) => rel.type?.endsWith('/image'))).toBe(true);
    expect(rels.some((rel) => rel.type?.endsWith('/notesSlide'))).toBe(true);
    const shared = rels.find((rel) => rel.target === destination);
    expect(shared?.external).toBe(true);
    const references = [...xml.matchAll(/<a:hlinkClick r:id="([^"]+)">/g)];
    expect(references).toHaveLength(5);
    expect(references.filter((match) => match[1] === shared?.id)).toHaveLength(3);
    for (const [, id] of references)
      expect(rels.find((rel) => rel.id === id)).toMatchObject({ external: true });
    expect(rels.find((rel) => rel.target?.includes('/docs'))?.target).toBe(
      'https://example.org/docs?q=%22source%22&amp;n=2',
    );
    for (const rel of rels.filter((rel) => !rel.external)) {
      const target = path.posix.normalize(path.posix.join('ppt/slides', rel.target ?? ''));
      expect(files[target], target).toBeDefined();
    }
    expect(xml).toContain('<a:tbl>');
    expect(xml.match(/<a:tc>/g)).toHaveLength(4);
    expect(xml.match(/<p:pic>/g)).toHaveLength(1);
    expect(result.report.elements.find((item) => item.elementId === 'credits')?.mode).toBe(
      'native',
    );
    expect(source).toEqual(before);
  });

  it('keeps a two-paragraph credit cell native when a small URL resets inherited bold', async () => {
    const source = deckFixture([
      {
        elementId: 'foundations',
        elementType: 'table',
        bounds: [38, 111, 884, 221],
        columnWidths: [0.075, 0.345, 0.58],
        rows: [
          [{ text: '' }, { text: 'Foundation / repository' }, { text: 'Concrete contribution' }],
          [
            { text: '' },
            {
              text:
                '<p><a href="https://github.com/open-slide/open-slide" style="color:#25282C">' +
                '<u>OpenSlide</u></a></p><p>' +
                '<span style="font-size:10px;font-weight:normal;color:#59636B">' +
                'github.com/open-slide/open-slide</span></p>',
              bold: true,
              fontSize: 16,
              fontFamily: 'Segoe UI',
            },
            { text: 'React editor codebase' },
          ],
        ],
      },
    ]);
    const before = structuredClone(source);
    const rasterizeElement = vi.fn(async () => ({ bytes: PNG_FIXTURE, width: 1, height: 1 }));
    const result = await buildPptdPptx(source, { ...assets, rasterizeElement });
    const files = unzipSync(result.bytes);
    const xml = strFromU8(files['ppt/slides/slide1.xml']);
    const runs = [...xml.matchAll(/<a:r>([\s\S]*?)<\/a:r>/g)].map((match) => match[1]);
    const name = runs.find((run) => run.includes('<a:t>OpenSlide</a:t>'));
    const address = runs.find((run) => run.includes('<a:t>github.com/open-slide/open-slide</a:t>'));
    expect(result.report.elements.find((item) => item.elementId === 'foundations')).toMatchObject({
      mode: 'native',
      reason: 'EDITABLE_TABLE',
    });
    expect(xml).toContain('<a:tbl>');
    expect(name).toContain('b="1"');
    expect(name).toContain('<a:hlinkClick');
    expect(address).toBeDefined();
    expect(address).not.toContain('b="1"');
    expect(address).not.toContain('<a:hlinkClick');
    expect(address).toContain('sz="1000"');
    expect(address).toContain('val="59636B"');
    expect(relationships(files).filter((rel) => rel.external)).toEqual([
      expect.objectContaining({ target: 'https://github.com/open-slide/open-slide' }),
    ]);
    expect(rasterizeElement).not.toHaveBeenCalled();
    expect(source).toEqual(before);
  });

  it('keeps unsafe link labels as ordinary editable text without an external action', async () => {
    const source = deckFixture([
      text(
        'untrusted',
        '<a href="javascript:alert(1)">Script</a> <a href="file:///private">File</a> ' +
          '<a href="https://name:secret@example.org">Credentials</a> ' +
          '<a href="https://example.org/%0aheader">Control</a>',
      ),
    ]);
    const result = await buildPptdPptx(source, assets);
    const files = unzipSync(result.bytes);
    const xml = strFromU8(files['ppt/slides/slide1.xml']);
    expect(relationships(files).filter((rel) => rel.external)).toHaveLength(0);
    expect(xml).not.toContain('<a:hlinkClick');
    expect(xml).not.toContain('<p:pic>');
    for (const label of ['Script', 'File', 'Credentials', 'Control']) expect(xml).toContain(label);
  });
});
