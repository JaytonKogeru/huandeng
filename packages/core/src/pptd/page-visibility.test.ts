import { describe, expect, it } from 'vitest';
import { deckFixture } from './fixtures.test-utils';
import { visiblePages, visibleSnapshot } from './page-visibility';

describe('slide visibility', () => {
  it('derives delivery order without removing editable pages or changing source identities', () => {
    const source = deckFixture([]);
    source.pages.push({
      ...structuredClone(source.pages[0]),
      pageId: 'second',
      path: 'pages/second.page',
    });
    source.pages[0].metadata.hidden = true;
    const before = structuredClone(source);
    const result = visibleSnapshot(source);
    expect(result.pages.map((item) => item.pageId)).toEqual(['second']);
    expect(result.manifest.pages).toEqual(['pages/second.page']);
    expect(visibleSnapshot(source, true).pages).toHaveLength(2);
    expect(visiblePages(source.pages)).toEqual(result.pages);
    expect(source).toEqual(before);
  });
});
