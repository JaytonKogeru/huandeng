import { describe, expect, it } from 'vitest';
import type { PageSnapshot } from '../../pptd/types';
import {
  insertionBoundaryIndex,
  slideInsertionBoundary,
  slideMoveAfterBoundary,
  type ThumbnailSection,
  thumbnailRailEntries,
  thumbnailSectionGroups,
} from './pptd-thumbnail-sections';

function slides(ids = ['intro', 'cover-a', 'detail-a', 'cover-b', 'detail-b']): PageSnapshot[] {
  return ids.map((pageId) => ({
    pageId,
    shortCode: pageId.toUpperCase(),
    path: `pages/${pageId}.page`,
    state: 'active',
    pageRevision: 'sha256:page',
    renderRevision: 'sha256:render',
    data: { title: pageId, elements: [] },
    metadata: { shortCode: pageId.toUpperCase(), path: `pages/${pageId}.page`, state: 'active' },
  }));
}

const sections: ThumbnailSection[] = [
  { id: 'a', title: 'First topic', startPageId: 'cover-a', pageIds: ['cover-a', 'detail-a'] },
  { id: 'b', title: 'Second topic', startPageId: 'cover-b', pageIds: ['cover-b', 'detail-b'] },
];

describe('Section navigation and exact insertion boundaries', () => {
  it('moves to both halves of a target, including the first and final gaps', () => {
    const pages = slides(['a', 'b', 'c', 'd']);
    expect(slideMoveAfterBoundary(pages, 'c', slideInsertionBoundary(pages, 1))).toEqual({
      afterPageId: 'a',
    });
    expect(slideMoveAfterBoundary(pages, 'c', slideInsertionBoundary(pages, 0))).toEqual({
      afterPageId: null,
    });
    expect(slideMoveAfterBoundary(pages, 'a', slideInsertionBoundary(pages, 4))).toEqual({
      afterPageId: 'd',
    });
    expect(slideMoveAfterBoundary(pages, 'b', slideInsertionBoundary(pages, 1))).toBeNull();
    expect(slideMoveAfterBoundary(pages, 'b', slideInsertionBoundary(pages, 2))).toBeNull();
    const boundary = slideInsertionBoundary(pages, 1);
    expect(() =>
      slideMoveAfterBoundary(slides(['a', 'new', 'b', 'c', 'd']), 'c', boundary),
    ).toThrow('Slide order changed');
    expect(() => slideMoveAfterBoundary(pages, 'removed', boundary)).toThrow('Slide order changed');
  });
  it('keeps covers and unsectioned Slides visible when members are collapsed', () => {
    const pages = slides();
    const groups = thumbnailSectionGroups(pages, sections);
    const before = structuredClone(pages);
    expect(
      thumbnailRailEntries(pages, groups, new Set(['a', 'b']), '').map(
        (entry) => entry.page.pageId,
      ),
    ).toEqual(['intro', 'cover-a', 'cover-b']);
    expect(pages).toEqual(before);
    expect(groups[1]).toMatchObject({ key: 'b', firstIndex: 3, lastIndex: 4 });
  });

  it('exposes a matching hidden Slide with its cover without changing the collapsed state', () => {
    const pages = slides();
    const collapsed = new Set(['a', 'b']);
    const groups = thumbnailSectionGroups(pages, sections);
    expect(
      thumbnailRailEntries(pages, groups, collapsed, 'detail-b').map((entry) => entry.page.pageId),
    ).toEqual(['cover-b', 'detail-b']);
    expect(
      thumbnailRailEntries(pages, groups, collapsed, 'First topic').map(
        (entry) => entry.page.pageId,
      ),
    ).toEqual(['cover-a', 'detail-a']);
    expect(thumbnailRailEntries(pages, groups, collapsed, '3').map((entry) => entry.index)).toEqual(
      [1, 2],
    );
    expect([...collapsed]).toEqual(['a', 'b']);
  });

  it('does not hide members of malformed or overlapping groups', () => {
    const pages = slides();
    expect(
      thumbnailSectionGroups(pages, [
        sections[0],
        { id: 'overlap', title: 'Overlap', pageIds: ['detail-a', 'cover-b'] },
        { id: 'gapped', title: 'Gapped', pageIds: ['intro', 'detail-b'] },
      ]),
    ).toEqual([]);
    expect(
      thumbnailSectionGroups(pages, [
        { id: 'missing', title: 'Missing', pageIds: ['missing'] },
        {
          id: 'wrong-cover',
          title: 'Wrong cover',
          startPageId: 'detail-a',
          pageIds: ['cover-a', 'detail-a'],
        },
      ]),
    ).toEqual([]);
  });

  it('inserts after the real last member of a collapsed Section rather than after its visible cover', () => {
    const pages = slides();
    const groups = thumbnailSectionGroups(pages, sections);
    const entries = thumbnailRailEntries(pages, groups, new Set(['a', 'b']), '');
    const nextCover = entries.find((entry) => entry.page.pageId === 'cover-b');
    const boundary = slideInsertionBoundary(pages, nextCover?.index ?? -1);
    expect(boundary).toEqual({ afterPageId: 'detail-a', beforePageId: 'cover-b' });
    expect(insertionBoundaryIndex(pages, boundary)).toBe(3);
    expect(slideInsertionBoundary(pages, pages.length)).toEqual({
      afterPageId: 'detail-b',
      beforePageId: null,
    });
  });

  it('handles the first and empty boundaries and rejects an intervening edit', () => {
    const pages = slides();
    expect(slideInsertionBoundary(pages, 0)).toEqual({ afterPageId: null, beforePageId: 'intro' });
    expect(slideInsertionBoundary([], 0)).toEqual({ afterPageId: null, beforePageId: null });
    const boundary = slideInsertionBoundary(pages, 2);
    const changed = slides(['intro', 'cover-a', 'new', 'detail-a', 'cover-b', 'detail-b']);
    expect(insertionBoundaryIndex(changed, boundary)).toBeNull();
    expect(insertionBoundaryIndex(pages.slice(2), boundary)).toBeNull();
    expect(
      insertionBoundaryIndex(pages, { afterPageId: null, beforePageId: 'detail-a' }),
    ).toBeNull();
    expect(() => slideInsertionBoundary(pages, -1)).toThrow('outside Main Slides');
  });
});
