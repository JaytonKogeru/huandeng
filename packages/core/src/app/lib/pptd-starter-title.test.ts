import { describe, expect, it } from 'vitest';
import type { PageSize } from '../../pptd/types';
import { createStarterTitle } from './pptd-starter-title';

describe('empty slide title placement', () => {
  it.each<PageSize>([
    [960, 540],
    [720, 720],
    [540, 960],
    [1920, 1080],
  ])('keeps an editable title within a %s by %s slide', (width, height) => {
    const title = createStarterTitle([width, height], 'first-title', 'Georgia');
    if (!title.bounds) throw new Error('Starter title has no bounds.');
    const [x, y, w, h] = title.bounds;
    expect(x).toBeGreaterThan(0);
    expect(y).toBeGreaterThan(0);
    expect(x + w).toBeLessThan(width);
    expect(y + h).toBeLessThan(height);
    expect(title.elementType).toBe('text');
    expect(title.content?.fontFamily).toBe('Georgia');
    expect(title.content?.text).toBe('Type a title');
    expect(title.elementId).toBe('first-title');
  });
});
