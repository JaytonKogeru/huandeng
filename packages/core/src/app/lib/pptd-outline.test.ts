import { describe, expect, it } from 'vitest';
import type { PageSnapshot } from '../../pptd/types';
import { outlineSlideSearch, outlineSlideSummary } from './pptd-outline';
import { thumbnailRailEntries, thumbnailSectionGroups } from './pptd-thumbnail-sections';

const page = (pageId: string): PageSnapshot => ({
  pageId,
  shortCode: pageId,
  path: `pages/${pageId}.page`,
  state: 'active',
  pageRevision: 'sha256:page',
  renderRevision: 'sha256:render',
  data: { title: pageId, elements: [] },
  metadata: { shortCode: pageId, path: `pages/${pageId}.page`, state: 'active' },
});

describe('Pages outline', () => {
  it('foregrounds the authored purpose and never mutates the page or its history fields', () => {
    const slide = page('slide');
    slide.metadata.designIntent = {
      purpose: 'Compare <strong>two</strong> mechanisms.',
      keep: ['Original figure'],
    };
    slide.data.notes = 'Private speaking cue';
    const original = structuredClone(slide);
    expect(outlineSlideSummary(slide)).toBe('Compare two mechanisms.');
    expect(outlineSlideSearch(slide)).not.toContain('private speaking cue');
    expect(slide).toEqual(original);
  });

  it('falls back to body text while omitting titles and numeric or dynamic footers', () => {
    const slide = page('Introduction');
    slide.data.elements = [
      { elementId: 'title', elementType: 'text', content: { text: 'Introduction' } },
      { elementId: 'body', elementType: 'text', content: { text: 'First observation' } },
      { elementId: 'number', elementType: 'text', content: { text: '12' } },
      {
        elementId: 'position',
        elementType: 'text',
        content: { text: '12', field: 'main-position' },
      },
      { elementId: 'footer', elementType: 'text', content: { text: 'Citation' } },
    ];
    expect(outlineSlideSummary(slide)).toBe('First observation');
  });

  it('finds a purpose inside a folded Section and retains its cover without changing folding', () => {
    const slides = [page('cover'), page('detail'), page('other')];
    slides[1].metadata.designIntent = { purpose: 'Explain the unusual transition.' };
    const groups = thumbnailSectionGroups(slides, [
      { id: 's1', title: 'Evidence', startPageId: 'cover', pageIds: ['cover', 'detail'] },
    ]);
    const collapsed = new Set(['s1']);
    expect(
      thumbnailRailEntries(slides, groups, collapsed, 'unusual', outlineSlideSearch).map(
        (entry) => entry.page.pageId,
      ),
    ).toEqual(['cover', 'detail']);
    expect(
      thumbnailRailEntries(slides, groups, collapsed, '', outlineSlideSearch).map(
        (entry) => entry.page.pageId,
      ),
    ).toEqual(['cover', 'other']);
    expect(collapsed.has('s1')).toBe(true);
  });
});
