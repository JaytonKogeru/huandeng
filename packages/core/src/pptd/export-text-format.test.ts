import { strFromU8, unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { buildPptdPptx } from './export';
import { mapPptdText } from './export-text';
import { deckFixture } from './fixtures.test-utils';
import type { PptdElement } from './types';

const color = () => ({ r: 17, g: 24, b: 39, a: 1 });
const source: PptdElement = {
  elementId: 'message',
  elementType: 'text',
  bounds: [20, 30, 600, 160],
  content: {
    text: 'Affinity is one measurement\nUtility requires more evidence',
    fontFamily: 'Arial',
    fontSize: 24,
    underline: true,
  },
};

describe('text object formatting export', () => {
  it('keeps underline on all multiline native PPTX runs without raster fallback or source mutation', async () => {
    const deck = deckFixture([structuredClone(source)]);
    const before = structuredClone(deck);
    const result = await buildPptdPptx(deck, {
      resolveAsset: async () => {
        throw new Error('This text-only deck has no assets.');
      },
    });
    const xml = strFromU8(unzipSync(result.bytes)['ppt/slides/slide1.xml']);
    const runs = [...xml.matchAll(/<a:r>([\s\S]*?)<\/a:r>/g)].map((match) => match[1]);
    expect(runs.length).toBeGreaterThanOrEqual(2);
    expect(runs.every((run) => /\bu="sng"/.test(run))).toBe(true);
    expect(xml).toContain('Affinity is one measurement');
    expect(xml).toContain('Utility requires more evidence');
    expect(xml).not.toContain('<p:pic>');
    expect(deck).toEqual(before);
  });

  it('preserves inline emphasis and underline when the object underline is toggled off', () => {
    const rich: PptdElement = {
      ...source,
      content: {
        ...source.content,
        style: '$body',
        underline: false,
        text: '<p>One <strong>strong</strong> claim</p><p>Another <u>underlined</u> run</p>',
      },
    };
    const result = mapPptdText(
      rich,
      { textStyles: { body: { underline: true, italic: true } } },
      color,
      'rich',
    );
    const runs = result.node.paragraphs.flatMap((paragraph) =>
      paragraph.lines.flatMap((line) => line.runs),
    );
    expect(runs.find((run) => run.text === 'strong')?.style).toMatchObject({
      bold: true,
      italic: true,
      underline: false,
    });
    expect(runs.find((run) => run.text === 'underlined')?.style).toMatchObject({
      italic: true,
      underline: true,
    });
    expect(runs.find((run) => run.text === 'One ')?.style.underline).toBe(false);
    expect(result.node.paragraphs).toHaveLength(2);
  });
});
