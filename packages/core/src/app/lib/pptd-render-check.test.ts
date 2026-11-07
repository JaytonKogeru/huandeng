import { describe, expect, it } from 'vitest';
import { fontFamilies, outsideFrame, resolveFontStack } from './pptd-render-check';

describe('render check evidence', () => {
  it('parses quoted comma names and resolves primary, fallback, generic and unknown states', () => {
    expect(fontFamilies('"Font, With Comma", \'Times New Roman\', serif')).toEqual([
      'Font, With Comma',
      'Times New Roman',
      'serif',
    ]);
    const available = new Set(['Arial', 'Times New Roman']);
    expect(resolveFontStack('arial, sans-serif', available, true)).toMatchObject({
      status: 'available',
      resolved: 'arial',
    });
    expect(resolveFontStack('Missing, "Times New Roman", serif', available, true)).toMatchObject({
      status: 'fallback',
      resolved: 'Times New Roman',
    });
    expect(resolveFontStack('Missing, Arial', available, false)).toMatchObject({
      status: 'unverified',
      resolved: null,
    });
    expect(resolveFontStack('system-ui', available, false).status).toBe('generic');
  });

  it('detects local layout overflow on every side without relying on zoomed or rotated viewport rectangles', () => {
    expect(outsideFrame({ left: 0, top: 0, right: 200, bottom: 50 }, 200, 50)).toBe(false);
    expect(outsideFrame({ left: 0, top: -8, right: 200, bottom: 58 }, 200, 50)).toBe(true);
    expect(outsideFrame({ left: -20, top: 0, right: 220, bottom: 50 }, 200, 50)).toBe(true);
    expect(outsideFrame({ left: 0, top: 0, right: 200.5, bottom: 50.5 }, 200, 50)).toBe(false);
  });
});
