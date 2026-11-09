import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { deckFixture } from '../../../pptd/fixtures.test-utils';
import { PptdPageRenderer } from './renderer';

describe('Slide Position rendering', () => {
  it('resolves the same explicit field for canvas, thumbnails and presentation without changing source', () => {
    const deck = deckFixture([
      {
        elementId: 'position',
        elementType: 'text',
        bounds: [800, 500, 100, 30],
        content: { text: '999', field: 'main-position', color: '#555555', fontSize: 10 },
      },
      {
        elementId: 'result',
        elementType: 'text',
        bounds: [20, 20, 400, 80],
        content: { text: '126', fontSize: 28 },
      },
    ]);
    deck.pages[0].mainPosition = 7;
    const before = structuredClone(deck);
    const render = () =>
      renderToStaticMarkup(<PptdPageRenderer page={deck.pages[0]} size={deck.size} />);
    const html = render();
    expect(html).toContain('>7<');
    expect(html).toContain('>126<');
    expect(html).not.toContain('>999<');
    expect(deck).toEqual(before);
    deck.pages[0].mainPosition = 11;
    expect(render()).toContain('>11<');
    delete deck.pages[0].mainPosition;
    deck.pages[0].versionId = 'legacy-version';
    expect(render()).toContain('>—<');
  });
});
