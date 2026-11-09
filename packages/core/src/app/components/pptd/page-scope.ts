import { readProjectModel, resolvePresentation } from '../../../pptd/project-model';
import type { DeckSnapshot } from '../../../pptd/types';

export function currentPageScope(snapshot: DeckSnapshot, pageId: string) {
  const main = snapshot.pages.some((page) => page.pageId === pageId && page.state === 'active');
  const usages = readProjectModel(snapshot.metadata).presentations.flatMap((presentation) =>
    resolvePresentation(snapshot, presentation.id)
      .pages.filter((page) => page.pageId === pageId)
      .map((page) => ({ ...page, presentationId: presentation.id, title: presentation.title })),
  );
  return {
    main,
    live: usages.filter((usage) => !usage.versionId).length,
    pinned: usages.filter((usage) => !!usage.versionId).length,
    usages,
  };
}
