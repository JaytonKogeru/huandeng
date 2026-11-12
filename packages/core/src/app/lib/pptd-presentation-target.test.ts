import { describe, expect, it } from 'vitest';
import type { PageSnapshot } from '../../pptd/types';
import { presentationStartPage } from './pptd-presentation-target';

function page(pageId: string, occurrenceId?: string, versionId?: string, hidden = false) {
  return { pageId, occurrenceId, versionId, metadata: { hidden } } as PageSnapshot;
}

describe('presentationStartPage', () => {
  it('starts at the context target rather than a previously selected slide', () => {
    const pages = [page('alpha'), page('beta'), page('gamma')];
    expect(presentationStartPage(pages, pages[1])).toBe(pages[1]);
  });
  it('keeps repeated and pinned occurrences distinct', () => {
    const pages = [page('alpha', 'one'), page('alpha', 'two', 'v1'), page('alpha', 'three')];
    expect(presentationStartPage(pages, pages[1])).toBe(pages[1]);
    expect(presentationStartPage(pages, page('alpha', 'two', 'v2'))).toBeUndefined();
    expect(presentationStartPage(pages, page('alpha'))).toBeUndefined();
  });
  it('uses the next visible slide for a hidden current slide and wraps only at the end', () => {
    const pages = [page('alpha'), page('beta', undefined, undefined, true), page('gamma')];
    expect(presentationStartPage(pages, pages[1])).toBe(pages[2]);
    expect(
      presentationStartPage([...pages, page('last', undefined, undefined, true)], page('last')),
    ).toBe(pages[0]);
    expect(presentationStartPage([page('hidden', undefined, undefined, true)])).toBeUndefined();
  });
  it('does not silently substitute a different page after the target was removed', () => {
    expect(presentationStartPage([page('alpha')], page('removed'))).toBeUndefined();
  });
});
