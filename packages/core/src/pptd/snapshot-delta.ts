import type { DeckSnapshot, PageSnapshot } from './types';

export type SnapshotCursor = Pick<
  DeckSnapshot,
  'epoch' | 'sequence' | 'manifestRevision' | 'metadataRevision'
>;

export type SnapshotUpdate =
  | { mode: 'full'; snapshot: DeckSnapshot }
  | {
      mode: 'delta';
      baseSequence: number;
      baseManifestRevision: DeckSnapshot['manifestRevision'];
      baseMetadataRevision: DeckSnapshot['metadataRevision'];
      snapshot: Omit<DeckSnapshot, 'pages'>;
      changedPages: PageSnapshot[];
      removedPageIds: string[];
      pageOrder: string[];
    };

export function applySnapshotUpdate(base: DeckSnapshot, update: SnapshotUpdate): DeckSnapshot {
  if (update.mode === 'full') return update.snapshot;
  const next = update.snapshot;
  if (
    update.mode !== 'delta' ||
    base.deckId !== next.deckId ||
    base.epoch !== next.epoch ||
    base.sequence !== update.baseSequence ||
    base.manifestRevision !== update.baseManifestRevision ||
    base.metadataRevision !== update.baseMetadataRevision ||
    !Number.isSafeInteger(next.sequence) ||
    next.sequence < base.sequence
  )
    throw new Error('Snapshot delta does not match its base version.');
  const pages = new Map(base.pages.map((page) => [page.pageId, page]));
  const removed = new Set(update.removedPageIds);
  const changed = new Set(update.changedPages.map((page) => page.pageId));
  if (
    removed.size !== update.removedPageIds.length ||
    changed.size !== update.changedPages.length ||
    new Set(update.pageOrder).size !== update.pageOrder.length ||
    [...removed].some((id) => changed.has(id) || !pages.has(id))
  )
    throw new Error('Snapshot delta has ambiguous page identities.');
  for (const id of removed) pages.delete(id);
  for (const page of update.changedPages) pages.set(page.pageId, page);
  if (pages.size !== update.pageOrder.length || update.pageOrder.some((id) => !pages.has(id)))
    throw new Error('Snapshot delta has an incomplete page order.');
  return { ...next, pages: update.pageOrder.map((id) => pages.get(id) as PageSnapshot) };
}
