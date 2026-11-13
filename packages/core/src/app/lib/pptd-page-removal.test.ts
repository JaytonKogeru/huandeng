import { describe, expect, it } from 'vitest';
import { selectionAfterPageRemoval } from './pptd-page-removal';

const pages = ['alpha', 'bravo', 'charlie', 'delta'].map((pageId) => ({ pageId }));
describe('selection after Main Slide deletion', () => {
  it('selects the previous page after deleting a middle or last page', () => {
    expect(selectionAfterPageRemoval(pages, 'charlie', 'charlie')).toBe('bravo');
    expect(selectionAfterPageRemoval(pages, 'delta', 'delta')).toBe('charlie');
  });
  it('selects the new first page when the old first page was removed', () => {
    expect(selectionAfterPageRemoval(pages, 'alpha', 'alpha')).toBe('bravo');
  });
  it('keeps selection unchanged when removing another page', () => {
    expect(selectionAfterPageRemoval(pages, 'charlie', 'bravo')).toBeUndefined();
  });
  it('handles empty aftermath and missing page identities', () => {
    expect(selectionAfterPageRemoval([{ pageId: 'only' }], 'only', 'only')).toBeNull();
    expect(selectionAfterPageRemoval(pages, 'missing', 'missing')).toBeUndefined();
  });
});
