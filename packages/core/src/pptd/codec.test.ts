import { describe, expect, it } from 'vitest';
import {
  editSourceSequence,
  parsePage,
  patchPageElement,
  setManifestPages,
  setPageNotes,
} from './codec';

const page =
  '\uFEFF# scientist note\r\npageType: custom\r\nunknown: { keep: true } # untouched\r\nelements:\r\n  - elementId: title\r\n    elementType: text\r\n    bounds: [10, 20, 300, 40] # geometry\r\n    content:\r\n      text: "原文 🧬" # author\r\n      fontSize: 22\r\n    futureField: { opaque: [a, b] }\r\n  - elementId: image\r\n    elementType: image\r\n    bounds: [20, 80, 400, 260]\r\n    src: media/original.png\r\n';

describe('PPTD source codec', () => {
  it('patches only the scalar source span and preserves BOM, CRLF, comments and opaque fields', () => {
    const updated = patchPageElement(page, 'title', { 'content.text': '更新后的 🧪 图注' });
    expect(updated).toBe(page.replace('"原文 🧬"', '"更新后的 🧪 图注"'));
    expect(parsePage(updated).value.elements[0].content?.text).toBe('更新后的 🧪 图注');
  });

  it('keeps source byte-identical for a semantic no-op', () => {
    expect(patchPageElement(page, 'title', { bounds: [10, 20, 300, 40] })).toBe(page);
  });

  it.each(['\n', '\r\n'])(
    'patches indentless block arrays without changing adjacent source (%j)',
    (newline) => {
      const bounds = ['  bounds: # geometry', '  - 10', '  - 20', '  - 300', '  - 40'].join(
        newline,
      );
      const align = ['    align:', '    - left', '    - top'].join(newline);
      const source = [
        '\uFEFF# keep the author comment',
        'pageType: content',
        'elements:',
        '- elementId: title',
        '  elementType: text',
        bounds,
        '  content: # keep this mapping',
        '    text: "Original wording"',
        align,
        '    future: [keep, this, array] # unchanged',
        '  unknown: { nested: [a, b] }',
        'notes: "Keep the next top-level field"',
        '',
      ].join(newline);
      const updated = patchPageElement(source, 'title', {
        bounds: [24, 32, 360, 64],
        'content.align': ['center', 'middle'],
      });
      expect(updated).toBe(
        source
          .replace(bounds, `  bounds: # geometry${newline}    [24,32,360,64]`)
          .replace(align, `    align:${newline}      ["center","middle"]`),
      );
      const expected = structuredClone(parsePage(source).value);
      expected.elements[0].bounds = [24, 32, 360, 64];
      expected.elements[0].content = {
        ...expected.elements[0].content,
        align: ['center', 'middle'],
      };
      expect(parsePage(updated).value).toEqual(expected);
      expect(patchPageElement(updated, 'title', { 'content.fontSize': 32 })).toContain(
        `    "fontSize": 32${newline}`,
      );
    },
  );

  it.each(['\n', '\r\n'])(
    'empties an indentless manifest sequence and preserves its next field (%j)',
    (newline) => {
      const source = [
        '# deck',
        'version: v2',
        'pages:',
        '- pages/a.page',
        'future: { keep: [a, b] }',
        '',
      ].join(newline);
      expect(setManifestPages(source, [])).toBe(
        ['# deck', 'version: v2', 'pages:', '  []', 'future: { keep: [a, b] }', ''].join(newline),
      );
    },
  );

  it.each(['\n', '\r\n'])(
    'replaces a block array with a flow map without changing its next array (%j)',
    (newline) => {
      const source = [
        'elements:',
        '- elementId: title',
        '  elementType: text',
        '  future:',
        '  - original',
        '  next: [keep, this]',
        'notes: untouched',
        '',
      ].join(newline);
      const updated = patchPageElement(source, 'title', { future: { nested: ['new'] } });
      expect(updated).toBe(source.replace('  - original', '    {"nested":["new"]}'));
      expect(parsePage(updated).value.elements[0].future).toEqual({ nested: ['new'] });
    },
  );

  it('adds nested style and page notes without normalizing the source', () => {
    const updated = patchPageElement(page, 'title', { 'content.color': '#aabbcc', rotation: 8 });
    const withNotes = setPageNotes(updated, '第一行\n第二行');
    const data = parsePage(withNotes).value;
    expect(data.elements[0].content?.color).toBe('#aabbcc');
    expect(data.elements[0].rotation).toBe(8);
    expect(data.notes).toBe('第一行\n第二行');
    expect(withNotes).toContain('unknown: { keep: true } # untouched\r\n');
    expect(withNotes).toContain('futureField: { opaque: [a, b] }\r\n');
    expect(withNotes).toMatch(/^\uFEFF/);
    expect(withNotes.replaceAll('\r\n', '')).not.toContain('\n');
  });

  it('reorders block items by moving original source fragments', () => {
    const reordered = editSourceSequence(page, ['elements'], [{ index: 1 }, { index: 0 }]);
    expect(parsePage(reordered).value.elements.map((item) => item.elementId)).toEqual([
      'image',
      'title',
    ]);
    expect(reordered).toContain('text: "原文 🧬" # author\r\n');
    expect(reordered).toContain('futureField: { opaque: [a, b] }\r\n');
  });

  it('adds and removes elements without dropping neighboring unknown data', () => {
    const element = { elementId: 'new', elementType: 'shape', bounds: [1, 2, 3, 4] };
    const changed = editSourceSequence(page, ['elements'], [{ index: 0 }, { value: element }]);
    expect(parsePage(changed).value.elements.map((item) => item.elementId)).toEqual([
      'title',
      'new',
    ]);
    expect(changed).toContain('futureField: { opaque: [a, b] }\r\n');
    expect(changed).not.toContain('media/original.png');
  });

  it('reorders only manifest pages and retains global fields', () => {
    const manifest =
      '# deck\nversion: v2\nsize: [960, 540]\npages:\n  - pages/a.page # A\n  - pages/b.page # B\nfuture: [anything]\n';
    const updated = setManifestPages(manifest, ['pages/b.page', 'pages/a.page', 'pages/c.page']);
    expect(updated).toContain('size: [960, 540]\n');
    expect(updated).toContain('pages/a.page # A');
    expect(updated).toContain('pages/b.page # B');
    expect(updated).toContain('future: [anything]\n');
  });

  it('rejects identity changes, invalid geometry and ambiguous YAML', () => {
    expect(() => patchPageElement(page, 'title', { elementId: 'other' })).toThrow(/identity/);
    expect(() => patchPageElement(page, 'title', { bounds: [0, 0, -1, 3] })).toThrow(/bounds/);
    expect(() => parsePage('elements: []\nelements: []\n')).toThrow();
    expect(() =>
      patchPageElement(`${page}alias: &thing [1,2]\ncopy: *thing\n`, 'title', { rotation: 10 }),
    ).toThrow(/Aliases/);
  });

  it('handles multiline text source and preserves the following field', () => {
    const source =
      'elements:\n  - elementId: t\n    elementType: text\n    content:\n      text: |\n        原始\n        两行\n      fontSize: 20\nnotes: existing\n';
    const updated = patchPageElement(source, 't', { 'content.text': '新行\n🧬' });
    expect(parsePage(updated).value.elements[0].content?.text).toBe('新行\n🧬');
    expect(updated).toContain('      fontSize: 20\nnotes: existing\n');
  });
});
