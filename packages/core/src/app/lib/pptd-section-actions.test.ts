import { describe, expect, it } from 'vitest';
import { emptyStory, type ProjectSection, resolveProjectSections } from '../../pptd/project-model';
import type { PageSnapshot, ProjectMetadata } from '../../pptd/types';
import { sectionAtBoundary, sectionWithInsertedCover } from './pptd-section-actions';
import { slideInsertionBoundary } from './pptd-thumbnail-sections';

function snapshot(sections: ProjectSection[]) {
  const pages: PageSnapshot[] = ['a', 'b', 'c', 'd', 'e'].map((pageId) => ({
    pageId,
    shortCode: pageId.toUpperCase(),
    path: `pages/${pageId}.page`,
    state: 'active',
    pageRevision: 'sha256:page',
    renderRevision: 'sha256:render',
    data: { elements: [] },
    metadata: { shortCode: pageId.toUpperCase(), path: `pages/${pageId}.page`, state: 'active' },
  }));
  const metadata: ProjectMetadata = {
    schemaVersion: 1,
    deckId: 'deck',
    entry: 'deck.pptd',
    slides: {},
    project: { schemaVersion: 1, mainStory: emptyStory(), presentations: [], sections },
  };
  return { pages, metadata };
}
const section = (id: string, startPageId: string): ProjectSection => ({
  id,
  title: id,
  startPageId,
  pageIds: [startPageId],
  story: emptyStory(),
});

describe('create Section from an existing Slide boundary', () => {
  it('inserts a new cover before an existing Section and at the end without consuming its boundary', () => {
    for (const index of [2, 5]) {
      const before = snapshot([section('first', 'a'), section('last', 'c')]);
      const cover = { ...before.pages[0], pageId: 'new-cover' };
      const after = {
        ...before,
        pages: [...before.pages.slice(0, index), cover, ...before.pages.slice(index)],
      };
      const project = sectionWithInsertedCover(before, after, cover.pageId, {
        id: 'new',
        title: 'New',
      });
      const groups = resolveProjectSections(after, project);
      expect(groups.find((item) => item.section.id === 'new')?.pageIds).toEqual(['new-cover']);
      expect(groups.find((item) => item.section.id === 'last')?.pageIds).toEqual(['c', 'd', 'e']);
      expect(groups.flatMap((item) => item.diagnostics)).toEqual([]);
    }
  });
  it('splits legacy members and fixed ranges when a cover is inserted inside them', () => {
    for (const mode of ['members', 'range']) {
      const before = snapshot([
        {
          id: 'first',
          title: 'First',
          pageIds: ['a', 'b', 'c', 'd'],
          story: emptyStory(),
          ...(mode === 'range' ? { range: { startPageId: 'a', endPageId: 'd' } } : {}),
        },
        section('last', 'e'),
      ]);
      const after = {
        ...before,
        pages: [
          ...before.pages.slice(0, 2),
          { ...before.pages[0], pageId: 'new-cover' },
          ...before.pages.slice(2),
        ],
      };
      const project = sectionWithInsertedCover(before, after, 'new-cover', {
        id: 'new',
        title: 'New',
      });
      const groups = resolveProjectSections(after, project);
      expect(groups.find((item) => item.section.id === 'first')?.pageIds).toEqual(['a', 'b']);
      expect(groups.find((item) => item.section.id === 'new')?.pageIds).toEqual([
        'new-cover',
        'c',
        'd',
      ]);
      expect(groups.flatMap((item) => item.diagnostics)).toEqual([]);
    }
  });
  it('splits at the following existing Slide without adding a cover or changing Slide identity', () => {
    const deck = snapshot([section('first', 'a'), section('last', 'e')]);
    const before = structuredClone(deck);
    const project = sectionAtBoundary(deck, slideInsertionBoundary(deck.pages, 2), {
      id: 'middle',
      title: 'Middle',
    });
    expect(resolveProjectSections(deck, project).map((item) => item.pageIds)).toEqual([
      ['a', 'b'],
      ['e'],
      ['c', 'd'],
    ]);
    expect(project.sections[0].id).toBe('first');
    expect(project.sections[2].startPageId).toBe('c');
    expect(deck).toEqual(before);
  });
  it('splits a fixed range and saved continuous members while retaining their membership modes', () => {
    for (const mode of ['range', 'members']) {
      const previous: ProjectSection = {
        id: 'first',
        title: 'First',
        pageIds: ['a', 'b', 'c', 'd'],
        story: emptyStory(),
        ...(mode === 'range' ? { range: { startPageId: 'a', endPageId: 'd' } } : {}),
      };
      const deck = snapshot([previous, section('last', 'e')]);
      const project = sectionAtBoundary(deck, slideInsertionBoundary(deck.pages, 2), {
        id: 'middle',
        title: 'Middle',
      });
      expect(project.sections[0].pageIds).toEqual(['a', 'b']);
      expect(project.sections[0].startPageId).toBeUndefined();
      expect(project.sections[0].range).toEqual(
        mode === 'range' ? { startPageId: 'a', endPageId: 'b' } : undefined,
      );
    }
  });
  it('creates explicit front matter and rejects end gaps, duplicate starts and stale boundaries', () => {
    const deck = snapshot([section('topic', 'c')]);
    const project = sectionAtBoundary(deck, slideInsertionBoundary(deck.pages, 0), {
      id: 'intro',
      title: 'Opening',
      frontMatter: true,
    });
    expect(
      resolveProjectSections(deck, project).find((item) => item.section.id === 'intro'),
    ).toMatchObject({ pageIds: ['a', 'b'], sectionPosition: 0 });
    expect(() =>
      sectionAtBoundary(deck, slideInsertionBoundary(deck.pages, 5), { id: 'end', title: 'End' }),
    ).toThrow('existing first Slide');
    expect(() =>
      sectionAtBoundary(deck, slideInsertionBoundary(deck.pages, 2), { id: 'same', title: 'Same' }),
    ).toThrow('already starts');
    expect(() =>
      sectionAtBoundary(
        deck,
        { afterPageId: 'a', beforePageId: 'd' },
        { id: 'stale', title: 'Stale' },
      ),
    ).toThrow('Slide order changed');
  });
});
