import type { PageSnapshot } from '../../pptd/types';

export function presentationStartPage(
  pages: readonly PageSnapshot[],
  target?: Pick<PageSnapshot, 'pageId' | 'occurrenceId' | 'versionId'>,
): PageSnapshot | undefined {
  if (!target) return pages.find((page) => page.metadata.hidden !== true);
  const index = pages.findIndex(
    (page) =>
      page.pageId === target.pageId &&
      page.occurrenceId === target.occurrenceId &&
      page.versionId === target.versionId,
  );
  if (index < 0) return undefined;
  return (
    pages.slice(index).find((page) => page.metadata.hidden !== true) ??
    pages.find((page) => page.metadata.hidden !== true)
  );
}
