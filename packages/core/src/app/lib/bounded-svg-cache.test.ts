import { describe, expect, it } from 'vitest';
import { BoundedSvgCache } from './bounded-svg-cache';

describe('rendered chart retention', () => {
  it('evicts old renderings while retaining recently used charts', () => {
    const cache = new BoundedSvgCache(2, 100);
    cache.set('a', '<svg/>');
    cache.set('b', '<svg/>');
    expect(cache.get('a')).toBe('<svg/>');
    cache.set('c', '<svg/>');
    expect(cache.has('a')).toBe(true);
    expect(cache.has('b')).toBe(false);
    expect(cache.usage().entries).toBe(2);
  });

  it('bounds combined keys and SVG strings and does not retain an oversized chart', () => {
    const cache = new BoundedSvgCache(32, 40);
    cache.set('first', '1234567890');
    cache.set('next', '1234567890');
    expect(cache.has('first')).toBe(false);
    expect(cache.usage().estimatedStringBytes).toBe(28);
    cache.set('next', 'x'.repeat(100));
    expect(cache.has('next')).toBe(false);
    expect(cache.usage().estimatedStringBytes).toBe(0);
  });
});
