import type { PageSnapshot } from '../../pptd/types';
import { projectSlideSearch, projectSlideTitle } from './pptd-project-source';

export interface ThumbnailSection {
  id?: string;
  title: string;
  pageIds: string[];
  startPageId?: string;
  sectionPosition?: number | null;
}

export interface ThumbnailSectionGroup extends ThumbnailSection {
  key: string;
  firstIndex: number;
  lastIndex: number;
}

export interface SlideInsertionBoundary {
  afterPageId: string | null;
  beforePageId: string | null;
}

export function thumbnailSectionGroups(
  pages: PageSnapshot[],
  sections: ThumbnailSection[],
): ThumbnailSectionGroup[] {
  const positions = new Map(pages.map((page, index) => [page.pageId, index]));
  const candidates = sections.flatMap((section) => {
    const first = section.pageIds[0];
    const firstIndex = positions.get(first);
    if (
      firstIndex === undefined ||
      (section.startPageId && section.startPageId !== first) ||
      !section.pageIds.every((pageId, offset) => pages[firstIndex + offset]?.pageId === pageId)
    )
      return [];
    return [
      {
        ...section,
        key: section.id ?? first,
        firstIndex,
        lastIndex: firstIndex + section.pageIds.length - 1,
      },
    ];
  });
  const owners = new Map<string, number>();
  for (const section of candidates)
    for (const pageId of section.pageIds) owners.set(pageId, (owners.get(pageId) ?? 0) + 1);
  return candidates
    .filter((section) => section.pageIds.every((pageId) => owners.get(pageId) === 1))
    .sort((left, right) => left.firstIndex - right.firstIndex);
}

export function thumbnailRailEntries(
  pages: PageSnapshot[],
  groups: ThumbnailSectionGroup[],
  collapsed: ReadonlySet<string>,
  query: string,
) {
  const needle = query.trim().toLocaleLowerCase();
  const matched = new Set(
    pages
      .filter((page, index) => `${index + 1} ${projectSlideSearch(page)}`.includes(needle))
      .map((page) => page.pageId),
  );
  if (needle) {
    for (const section of groups)
      if (
        `${section.title} ${section.id ?? ''} ${section.sectionPosition === null || section.sectionPosition === undefined ? '' : `Section ${String(section.sectionPosition).padStart(2, '0')}`}`
          .toLocaleLowerCase()
          .includes(needle)
      )
        for (const pageId of section.pageIds) matched.add(pageId);
    for (const section of groups)
      if (section.pageIds.some((pageId) => matched.has(pageId))) matched.add(section.pageIds[0]);
  }
  const hidden = new Set(
    needle
      ? []
      : groups
          .filter((section) => collapsed.has(section.key))
          .flatMap((section) => section.pageIds.slice(1)),
  );
  return pages.flatMap((page, index) =>
    hidden.has(page.pageId) || !matched.has(page.pageId)
      ? []
      : [{ page, index, name: projectSlideTitle(page), key: page.occurrenceId ?? page.pageId }],
  );
}

export function slideInsertionBoundary(
  pages: Pick<PageSnapshot, 'pageId'>[],
  index: number,
): SlideInsertionBoundary {
  if (!Number.isInteger(index) || index < 0 || index > pages.length)
    throw new Error('Slide insertion boundary is outside Main Slides.');
  return {
    afterPageId: pages[index - 1]?.pageId ?? null,
    beforePageId: pages[index]?.pageId ?? null,
  };
}

export function insertionBoundaryIndex(
  pages: Pick<PageSnapshot, 'pageId'>[],
  boundary: SlideInsertionBoundary,
): number | null {
  const index =
    boundary.afterPageId === null
      ? 0
      : pages.findIndex((page) => page.pageId === boundary.afterPageId) + 1;
  if (boundary.afterPageId !== null && index === 0) return null;
  return (pages[index]?.pageId ?? null) === boundary.beforePageId ? index : null;
}

export function slideMoveAfterBoundary(
  pages: Pick<PageSnapshot, 'pageId'>[],
  pageId: string,
  boundary: SlideInsertionBoundary,
): { afterPageId: string | null } | null {
  const index = insertionBoundaryIndex(pages, boundary);
  const current = pages.findIndex((page) => page.pageId === pageId);
  if (index === null || current < 0)
    throw new Error('Slide order changed. Choose the insertion point again.');
  if (index === current || index === current + 1) return null;
  return { afterPageId: boundary.afterPageId };
}
