import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { deckFixture } from '../../../pptd/fixtures.test-utils';
import { PptdPageRenderer, textContent, textCss } from './renderer';

describe('text object style rendering', () => {
  it('renders multiline object underline with inherited bold and preserves the source text', () => {
    const source = 'Binding is a start\nExposure and function decide utility';
    const deck = deckFixture([
      {
        elementId: 'title',
        elementType: 'text',
        bounds: [20, 30, 500, 120],
        content: { text: source, style: '$body', underline: true },
      },
    ]);
    const theme = { textStyles: { body: { fontSize: 28, bold: true, italic: true } } };
    const before = structuredClone(deck);
    const html = renderToStaticMarkup(
      <PptdPageRenderer page={deck.pages[0]} size={deck.size} theme={theme} />,
    );
    expect(html).toContain('text-decoration:underline');
    expect(html).toContain('font-weight:700');
    expect(html).toContain('font-style:italic');
    expect(html).toContain(source);
    expect(deck).toEqual(before);
  });

  it('lets an explicit object flag turn off an inherited underline without stripping rich runs', () => {
    const element = {
      elementId: 'rich',
      elementType: 'text',
      content: { text: '<p>Plain <u>emphasis</u></p>', style: '$body', underline: false },
    };
    const effective = textContent(element, { textStyles: { body: { underline: true } } });
    expect(textCss(effective).textDecoration).toBeUndefined();
    expect(element.content.text).toBe('<p>Plain <u>emphasis</u></p>');
  });
});
