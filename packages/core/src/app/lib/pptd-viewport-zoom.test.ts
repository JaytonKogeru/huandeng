import { describe, expect, it } from 'vitest';
import { wheelZoomScale } from './pptd-viewport-zoom';

describe('canvas wheel zoom', () => {
  it('normalizes line and page wheels while keeping pixel-wheel zoom reversible', () => {
    expect(wheelZoomScale(1, 3, 1, 600)).toBe(wheelZoomScale(1, 48, 0, 600));
    expect(wheelZoomScale(1, 0.2, 2, 600)).toBe(wheelZoomScale(1, 120, 0, 600));
    expect(wheelZoomScale(wheelZoomScale(0.8, -90, 0, 600), 90, 0, 600)).toBeCloseTo(0.8);
  });
  it('shares the 15–300 percent bounds and clamps extreme wheel bursts', () => {
    expect(wheelZoomScale(2.9, -1000, 0, 600)).toBe(3);
    expect(wheelZoomScale(0.16, 1000, 0, 600)).toBe(0.15);
    expect(wheelZoomScale(1, -10000, 0, 600)).toBe(wheelZoomScale(1, -250, 0, 600));
  });
});
