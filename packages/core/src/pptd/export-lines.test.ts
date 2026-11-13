import { strFromU8, unzipSync } from 'fflate';
import { describe, expect, it, vi } from 'vitest';
import { buildPptdPptx } from './export';
import { deckFixture } from './fixtures.test-utils';
import type { Bounds, PptdElement } from './types';

const cases: {
  name: string;
  element: Partial<PptdElement> & { bounds: Bounds };
  geometry: string;
}[] = [
  {
    name: 'horizontal',
    element: { bounds: [100, 100, 120, 0], points: '0,0.5 1,0.5' },
    geometry: '<a:moveTo><a:pt x="0" y="1"/></a:moveTo><a:lnTo><a:pt x="1524000" y="1"/></a:lnTo>',
  },
  {
    name: 'reversed horizontal',
    element: { bounds: [100, 100, 120, 0], points: '1,0.5 0,0.5' },
    geometry: '<a:moveTo><a:pt x="1524000" y="1"/></a:moveTo><a:lnTo><a:pt x="0" y="1"/></a:lnTo>',
  },
  {
    name: 'vertical',
    element: { bounds: [100, 100, 0, 120], points: '0.5,0 0.5,1' },
    geometry: '<a:moveTo><a:pt x="1" y="0"/></a:moveTo><a:lnTo><a:pt x="1" y="1524000"/></a:lnTo>',
  },
  {
    name: 'reversed vertical',
    element: { bounds: [100, 100, 0, 120], points: '0.5,1 0.5,0' },
    geometry: '<a:moveTo><a:pt x="1" y="1524000"/></a:moveTo><a:lnTo><a:pt x="1" y="0"/></a:lnTo>',
  },
  {
    name: 'editable quadratic Bézier',
    element: {
      bounds: [100, 100, 200, 100],
      viewBox: [200, 100],
      points: '0,100 100,0 200,100',
      curve: 'smooth',
    },
    geometry:
      '<a:moveTo><a:pt x="0" y="1270000"/></a:moveTo><a:quadBezTo><a:pt x="1270000" y="0"/><a:pt x="2540000" y="1270000"/></a:quadBezTo>',
  },
  {
    name: 'editable cubic Bézier',
    element: {
      bounds: [100, 100, 200, 100],
      viewBox: [200, 100],
      points: '0,100 50,0 150,0 200,100',
      curve: 'smooth',
    },
    geometry:
      '<a:moveTo><a:pt x="0" y="1270000"/></a:moveTo><a:cubicBezTo><a:pt x="635000" y="0"/><a:pt x="1905000" y="0"/><a:pt x="2540000" y="1270000"/></a:cubicBezTo>',
  },
];

describe('native PPTX zero-dimension lines', () => {
  it.each(cases)('preserves $name geometry and arrow endpoints', async ({ element, geometry }) => {
    const deck = deckFixture([
      {
        elementId: 'line',
        elementType: 'line',
        viewBox: [1, 1],
        border: { width: 3, color: '#000000' },
        arrow: ['diamond', 'arrow'],
        ...element,
      },
    ]);
    const before = structuredClone(deck);
    const resolveAsset = vi.fn();
    const rasterizeElement = vi.fn();
    const result = await buildPptdPptx(deck, { resolveAsset, rasterizeElement });
    const xml = strFromU8(unzipSync(result.bytes)['ppt/slides/slide1.xml']);
    const [, , width, height] = element.bounds;
    expect(xml).toContain(`<a:ext cx="${width * 12700}" cy="${height * 12700}"/>`);
    expect(xml).toContain(geometry);
    expect(xml).toContain('<a:headEnd type="diamond"/>');
    expect(xml).toContain('<a:tailEnd type="triangle"/>');
    expect(xml).not.toContain('<p:pic>');
    expect(result.report.elements).toContainEqual(
      expect.objectContaining({ elementId: 'line', mode: 'native' }),
    );
    expect(result.report.complete).toBe(true);
    expect(rasterizeElement).not.toHaveBeenCalled();
    expect(resolveAsset).not.toHaveBeenCalled();
    expect(deck).toEqual(before);
  });
});
