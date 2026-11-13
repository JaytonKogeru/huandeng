/**
 * Preserve the author's reading position when the selected Main Slide is removed.
 * An unrelated removal must never move the current selection.
 */
export function selectionAfterPageRemoval(
  pages: readonly { pageId: string }[],
  removedPageId: string,
  selectedPageId: string | null,
): string | null | undefined {
  if (removedPageId !== selectedPageId) return undefined;
  const index = pages.findIndex((page) => page.pageId === removedPageId);
  if (index < 0) return undefined;
  return pages[index - 1]?.pageId ?? pages[index + 1]?.pageId ?? null;
}
