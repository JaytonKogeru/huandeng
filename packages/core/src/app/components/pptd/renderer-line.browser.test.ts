import { type Browser, chromium } from 'playwright';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { deckFixture } from '../../../pptd/fixtures.test-utils';
import type { PptdElement } from '../../../pptd/types';
import { PptdPageRenderer } from './renderer';

let browser: Browser;

beforeAll(async () => {
  browser = await chromium.launch({ headless: true });
});

afterAll(async () => {
  await browser?.close();
});

const cases: {
  name: string;
  element: Partial<PptdElement>;
  start: [number, number];
  end: [number, number];
}[] = [
  {
    name: 'zero-height horizontal',
    element: { bounds: [100, 100, 120, 0], points: '0,0.5 1,0.5' },
    start: [100, 100],
    end: [220, 100],
  },
  {
    name: 'reversed horizontal',
    element: { bounds: [100, 100, 120, 0], points: '1,1 0,0' },
    start: [220, 100],
    end: [100, 100],
  },
  {
    name: 'zero-width vertical',
    element: { bounds: [100, 100, 0, 120], points: '0.5,0 0.5,1' },
    start: [100, 100],
    end: [100, 220],
  },
  {
    name: 'reversed vertical',
    element: { bounds: [100, 100, 0, 120], points: '1,1 0,0' },
    start: [100, 220],
    end: [100, 100],
  },
  {
    name: 'flipped horizontal',
    element: { bounds: [100, 100, 120, 0], points: '0,0 1,1', flip: [true, false] },
    start: [220, 100],
    end: [100, 100],
  },
  {
    name: 'rotated horizontal',
    element: { bounds: [100, 100, 120, 0], points: '0,0 1,1', rotation: 90 },
    start: [160, 40],
    end: [160, 160],
  },
  {
    name: 'negative-slope diagonal',
    element: { bounds: [100, 100, 120, 60], points: '0,1 1,0' },
    start: [100, 160],
    end: [220, 100],
  },
  {
    name: 'start arrow with a non-unit viewBox',
    element: {
      bounds: [100, 100, 120, 0],
      viewBox: [100, 50],
      points: '0,25 100,25',
      arrow: ['arrow', null],
    },
    start: [100, 100],
    end: [220, 100],
  },
  {
    name: 'collapsed quadratic curve',
    element: { bounds: [100, 100, 120, 0], points: '0,1 0.5,0 1,1', curve: 'smooth' },
    start: [100, 100],
    end: [220, 100],
  },
];

describe('line strokes and markers in Chromium', () => {
  it.each(cases)('renders $name without changing its frame', async ({ element, start, end }) => {
    const deck = deckFixture(
      [
        {
          elementId: 'line',
          elementType: 'line',
          viewBox: [1, 1],
          arrow: [null, 'arrow'],
          border: { width: 3, color: '#000000' },
          ...element,
        },
      ],
      [320, 260],
    );
    const before = structuredClone(deck);
    const page = await browser.newPage({
      viewport: { width: 320, height: 260 },
      deviceScaleFactor: 1,
    });
    try {
      await page.setContent(
        `<style>body{margin:0;background:white}</style>${renderToStaticMarkup(
          createElement(PptdPageRenderer, { page: deck.pages[0], size: deck.size }),
        )}`,
      );
      const path = page.locator('[data-hd-element-id="line"] > svg > path');
      const endpoints = await path.evaluate((node) => {
        const line = node as SVGPathElement;
        const transform = line.getScreenCTM();
        return [line.getPointAtLength(0), line.getPointAtLength(line.getTotalLength())].map(
          (point) => {
            const projected = point.matrixTransform(transform ?? undefined);
            return [projected.x, projected.y];
          },
        );
      });
      for (const [index, point] of [start, end].entries()) {
        expect(endpoints[index][0]).toBeCloseTo(point[0], 4);
        expect(endpoints[index][1]).toBeCloseTo(point[1], 4);
      }
      const screenshot = await page.screenshot();
      const length = Math.hypot(end[0] - start[0], end[1] - start[1]);
      const dx = (end[0] - start[0]) / length;
      const dy = (end[1] - start[1]) / length;
      const samples = [
        [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2],
        [end[0] - 9 * dx - 3 * dy, end[1] - 9 * dy + 3 * dx],
        [start[0] + 9 * dx - 3 * dy, start[1] + 9 * dy + 3 * dx],
      ];
      const pixels = await page.evaluate(
        async ({ image, samples }) => {
          const bitmap = new Image();
          bitmap.src = image;
          await bitmap.decode();
          const canvas = document.createElement('canvas');
          canvas.width = bitmap.width;
          canvas.height = bitmap.height;
          const context = canvas.getContext('2d');
          if (!context) throw new Error('Missing canvas context');
          context.drawImage(bitmap, 0, 0);
          return samples.map(
            ([x, y]) => context.getImageData(Math.floor(x), Math.floor(y), 1, 1).data[0],
          );
        },
        { image: `data:image/png;base64,${screenshot.toString('base64')}`, samples },
      );
      expect(pixels[0], 'visible shaft').toBeLessThan(80);
      const arrow = deck.pages[0].data.elements[0].arrow as (string | null)[];
      if (arrow[1]) expect(pixels[1], 'arrow at the authored end').toBeLessThan(80);
      else expect(pixels[1], 'no arrow at the authored end').toBeGreaterThan(240);
      if (arrow[0]) expect(pixels[2], 'arrow at the authored start').toBeLessThan(80);
      else expect(pixels[2], 'no arrow at the authored start').toBeGreaterThan(240);
      expect(deck).toEqual(before);
    } finally {
      await page.close();
    }
  });
});
