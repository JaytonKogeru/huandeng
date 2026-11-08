import type { DeckSnapshot, PageSnapshot } from './types';

export function visiblePages<T extends Pick<PageSnapshot, 'metadata'>>(pages: readonly T[]): T[] {
  return pages.filter((page) => page.metadata.hidden !== true);
}

export function visibleSnapshot(snapshot: DeckSnapshot, includeHidden = false): DeckSnapshot {
  const pages = includeHidden ? snapshot.pages : visiblePages(snapshot.pages);
  return {
    ...snapshot,
    pages,
    manifest: { ...snapshot.manifest, pages: pages.map((page) => page.path) },
  };
}
