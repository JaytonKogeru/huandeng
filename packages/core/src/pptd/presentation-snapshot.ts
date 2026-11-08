import { assertPresentationReady } from './project-model';
import { type DeckSnapshot, type PageSnapshot, type PageVersionSnapshot, PptdError } from './types';

export async function readPinnedPresentationPage(
  snapshot: DeckSnapshot,
  reference: { pageId: string; versionId: string },
  readVersion: (pageId: string, versionId: string) => Promise<PageVersionSnapshot>,
): Promise<PageSnapshot> {
  if (!/^checkpoint:[a-f0-9]{32}$/.test(reference.versionId))
    throw new PptdError('INVALID_REQUEST', 'Presentations can pin named page versions only.');
  const version = await readVersion(reference.pageId, reference.versionId);
  if (
    version.version.kind !== 'checkpoint' ||
    version.version.versionId !== reference.versionId ||
    version.version.pageId !== reference.pageId ||
    version.page.pageId !== reference.pageId ||
    version.assets !== 'archived'
  ) {
    throw new PptdError(
      'INVALID_DOCUMENT',
      'The pinned page version does not match this reference or has no archived assets.',
      { pageId: reference.pageId, versionId: reference.versionId },
    );
  }
  if (
    version.size.length !== 2 ||
    version.size.some((value, index) => value !== snapshot.size[index])
  )
    throw new PptdError(
      'INVALID_DOCUMENT',
      'A pinned page has a different canvas size. Choose a compatible version.',
      { pageId: reference.pageId, versionId: reference.versionId },
    );
  return structuredClone(version.page);
}

export async function presentationSnapshot(
  snapshot: DeckSnapshot,
  presentationId: string | null,
  readVersion: (pageId: string, versionId: string) => Promise<PageVersionSnapshot>,
): Promise<DeckSnapshot> {
  const resolved = assertPresentationReady(snapshot, presentationId);
  if (presentationId === null) return structuredClone(snapshot);
  const versions = new Map<string, PageSnapshot>();
  const pages = [];
  for (const reference of resolved.pages) {
    let page = snapshot.pages.find((candidate) => candidate.pageId === reference.pageId);
    if (!page)
      throw new PptdError('TARGET_NOT_FOUND', `Main Slide ${reference.pageId} is missing.`);
    if (reference.versionId) {
      const key = `${reference.pageId}/${reference.versionId}`;
      let version = versions.get(key);
      if (!version) {
        version = await readPinnedPresentationPage(
          snapshot,
          { pageId: reference.pageId, versionId: reference.versionId },
          readVersion,
        );
        versions.set(key, version);
      }
      page = version;
    }
    pages.push({
      ...structuredClone(page),
      metadata: {
        ...structuredClone(page.metadata),
        hidden: snapshot.metadata.slides[reference.pageId]?.hidden === true,
      },
      occurrenceId: reference.occurrenceId,
      ...(reference.versionId ? { versionId: reference.versionId } : {}),
      ...(reference.notes !== undefined
        ? {
            presentationNotes: reference.notes,
            data: { ...structuredClone(page.data), notes: reference.notes },
          }
        : {}),
    });
  }
  return {
    ...structuredClone(snapshot),
    presentationId,
    title: resolved.title,
    pages,
    writable: false,
    manifest: {
      ...structuredClone(snapshot.manifest),
      title: resolved.title,
      pages: pages.map((page) => page.path),
    },
  };
}
