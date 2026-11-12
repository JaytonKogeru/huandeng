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

  it('omits explicitly marked watermarks while preserving ordinary body text', () => {
    const slide = page('Attribution');
    slide.data.elements = [
      {
        elementId: 'identity',
        elementType: 'text',
        role: 'watermark',
        content: { text: 'english chatgpt 6 astra' },
      },
      {
        elementId: 'credit',
        elementType: 'text',
        name: 'Watermark',
        content: { text: 'chinese chatgpt 6 astra + subagent' },
      },
      {
        elementId: 'edition-watermark',
        elementType: 'text',
        content: { text: 'Edition label' },
      },
      {
        elementId: 'body',
        elementType: 'text',
        content: { text: 'Explain watermark placement.' },
      },
      {
        elementId: 'detail',
        elementType: 'text',
        content: { text: 'Keep the original evidence.' },
      },
    ];
    expect(outlineSlideSummary(slide)).toBe(
      'Explain watermark placement. Keep the original evidence.',
    );
  });

  it('does not repeat a title as its summary and preserves the authored Story', () => {
    const slide = page('An authored title');
    slide.metadata.designIntent = { purpose: 'An <strong>authored</strong> title' };
    const original = structuredClone(slide);
    expect(outlineSlideSummary(slide)).toBe('');
    expect(slide).toEqual(original);
    slide.data.elements = [
      { elementId: 'body', elementType: 'text', content: { text: 'Supporting evidence' } },
    ];
    expect(outlineSlideSummary(slide)).toBe('Supporting evidence');
    expect(slide.metadata.designIntent.purpose).toBe('An <strong>authored</strong> title');
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
