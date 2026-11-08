import { describe, expect, it } from 'vitest';
import type { PptdElement } from '../../pptd/types';
import { reorderElementIds, textFormatPatches, textPropertyPatch } from './pptd-object-actions';

describe('imported text property changes', () => {
  it('increments the visible inline size and rejects mixed sizes instead of shrinking from a default', () => {
    const element: PptdElement = {
      elementId: 'title',
      elementType: 'text',
      content: { text: '<span style="font-size:34px;line-height:normal">Visible title</span>' },
    };
    expect(
      textFormatPatches([element], ['title'], { type: 'font-size', delta: 1 })[0].fields[
        'content.fontSize'
      ],
    ).toBe(36);
    element.content = {
      text: '<span style="font-size:34px">Large</span><span style="font-size:18px">Small</span>',
    };
    expect(() => textFormatPatches([element], ['title'], { type: 'font-size', delta: 1 })).toThrow(
      'mixed inline fontSize',
    );
  });

  it('replaces only the selected font property while preserving words and other rich formatting', () => {
    const source =
      '<p style="text-align:center"><span style="font-family:Arial;font-size:20px;color:#123456">Keep <em>this</em> wording</span></p>';
    const element: PptdElement = {
      elementId: 'title',
      elementType: 'text',
      content: { text: source, fontFamily: 'Arial', fontSize: 20 },
    };
    const patch = textPropertyPatch(element, { 'content.fontFamily': 'Georgia, serif' });
    expect(patch).toEqual({
      'content.fontFamily': 'Georgia, serif',
      'content.text':
        '<p style="text-align:center"><span style="font-size:20px;color:#123456">Keep <em>this</em> wording</span></p>',
    });
    expect(element.content?.text).toBe(source);
    expect(textPropertyPatch(element, { bounds: [0, 0, 400, 60] })).toEqual({
      bounds: [0, 0, 400, 60],
    });
    expect(textPropertyPatch(element, { 'content.text': '<p>New <em>wording</em></p>' })).toEqual({
      'content.text': '<p>New <em>wording</em></p>',
    });
  });

  it('makes whole-object size and color commands visible in an imported title without losing emphasis', () => {
    const element: PptdElement = {
      elementId: 'title',
      elementType: 'text',
      content: {
        text: '<span style="font-size:20px;color:#123456">A <strong>title</strong></span>',
        fontSize: 20,
      },
    };
    const size = textFormatPatches([element], ['title'], { type: 'font-size', delta: 1 })[0].fields;
    expect(size).toEqual({
      'content.fontSize': 22,
      'content.text': '<span style="color:#123456">A <strong>title</strong></span>',
    });
    const color = textFormatPatches([element], ['title'], {
      type: 'text-color',
      color: '#654321',
    })[0].fields;
    expect(color).toEqual({
      'content.color': '#654321',
      'content.text': '<span style="font-size:20px">A <strong>title</strong></span>',
    });
  });
});

const shape = (elementId: string): PptdElement => ({ elementId, elementType: 'shape' });
const group = (elementId: string, children: string[]): PptdElement => ({
  elementId,
  elementType: 'group',
  children,
});

describe('object layer commands', () => {
  it('moves a multiselection one sibling step and keeps selection order at the edges', () => {
    const elements = ['a', 'b', 'c', 'd', 'e'].map(shape);
    expect(reorderElementIds(elements, ['a', 'b', 'd'], 'forward')).toEqual([
      'c',
      'a',
      'b',
      'e',
      'd',
    ]);
    expect(reorderElementIds(elements, ['b', 'd', 'e'], 'backward')).toEqual([
      'b',
      'a',
      'd',
      'e',
      'c',
    ]);
    expect(reorderElementIds(elements, ['b', 'd'], 'front')).toEqual(['a', 'c', 'e', 'b', 'd']);
    expect(reorderElementIds(elements, ['b', 'd'], 'back')).toEqual(['b', 'd', 'a', 'c', 'e']);
    expect(reorderElementIds(elements, ['e'], 'forward')).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(reorderElementIds(elements, ['a'], 'backward')).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('crosses an adjacent nested group as one layer without splitting its descendants', () => {
    const elements = [
      shape('a'),
      shape('b'),
      group('inner', ['a', 'b']),
      shape('c'),
      group('outer', ['inner', 'c']),
      shape('d'),
    ];
    const before = structuredClone(elements);
    expect(reorderElementIds(elements, ['d'], 'backward')).toEqual([
      'd',
      'a',
      'b',
      'inner',
      'c',
      'outer',
    ]);
    expect(reorderElementIds(elements, ['outer', 'inner', 'a'], 'forward')).toEqual([
      'd',
      'a',
      'b',
      'inner',
      'c',
      'outer',
    ]);
    expect(elements).toEqual(before);
  });

  it('keeps a selected group member within its direct parent', () => {
    const elements = [
      shape('under'),
      shape('a'),
      shape('b'),
      group('g', ['a', 'b']),
      shape('above'),
    ];
    expect(reorderElementIds(elements, ['a'], 'front')).toEqual(['under', 'b', 'a', 'g', 'above']);
    expect(reorderElementIds(elements, ['b'], 'back')).toEqual(['under', 'b', 'a', 'g', 'above']);
  });

  it('retains every ID and unrelated relative order in legacy interleaved groups', () => {
    const elements = [shape('a'), shape('x'), shape('b'), group('g', ['a', 'b']), shape('z')];
    const result = reorderElementIds(elements, ['g'], 'front');
    expect(result).toEqual(['x', 'z', 'a', 'b', 'g']);
    expect(new Set(result)).toEqual(new Set(elements.map((item) => item.elementId)));
    expect(reorderElementIds(elements, ['missing'], 'back')).toEqual(
      elements.map((item) => item.elementId),
    );
  });
});

describe('text object formatting', () => {
  const text: PptdElement[] = [
    { elementId: 'a', elementType: 'text', content: { text: 'First\nSecond', style: '$body' } },
    {
      elementId: 'b',
      elementType: 'text',
      content: { text: '<p>A <em>run</em></p>', bold: false, fontSize: 399 },
    },
    shape('figure'),
  ];
  const theme = { textStyles: { body: { fontSize: 30, bold: true, underline: true } } };

  it('resolves inherited text defaults and toggles mixed flags as one batch without rewriting runs', () => {
    const before = structuredClone(text);
    expect(
      textFormatPatches(text, ['a', 'b', 'figure'], { type: 'format-text', format: 'bold' }, theme),
    ).toEqual([
      { elementId: 'a', fields: { 'content.bold': true } },
      { elementId: 'b', fields: { 'content.bold': true } },
    ]);
    expect(
      textFormatPatches(text, ['a'], { type: 'format-text', format: 'underline' }, theme),
    ).toEqual([{ elementId: 'a', fields: { 'content.underline': false } }]);
    expect(text).toEqual(before);
  });

  it('changes font size relative to effective style and clamps supported bounds', () => {
    expect(textFormatPatches(text, ['a', 'b'], { type: 'font-size', delta: 1 }, theme)).toEqual([
      { elementId: 'a', fields: { 'content.fontSize': 32 } },
      { elementId: 'b', fields: { 'content.fontSize': 400 } },
    ]);
    expect(
      textFormatPatches(
        [{ elementId: 'tiny', elementType: 'text', content: { fontSize: 1 } }],
        ['tiny'],
        { type: 'font-size', delta: -1 },
      ),
    ).toEqual([{ elementId: 'tiny', fields: { 'content.fontSize': 1 } }]);
  });

  it('sets color only on selected text and rejects malformed color before a transaction', () => {
    expect(
      textFormatPatches(text, ['a', 'figure'], { type: 'text-color', color: '#25a1ff' }),
    ).toEqual([{ elementId: 'a', fields: { 'content.color': '#25a1ff' } }]);
    expect(textFormatPatches(text, ['figure'], { type: 'format-text', format: 'italic' })).toEqual(
      [],
    );
    expect(() => textFormatPatches(text, ['a'], { type: 'text-color', color: 'bad' })).toThrow(
      'text color',
    );
  });
});
