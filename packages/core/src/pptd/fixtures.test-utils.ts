import type { DeckSnapshot, PageSize, PptdElement } from './types';

export const PNG_FIXTURE = new Uint8Array(
  Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j9n8AAAAASUVORK5CYII=',
    'base64',
  ),
);

export function deckFixture(
  elements: PptdElement[] = [],
  size: PageSize = [960, 540],
): DeckSnapshot {
  const identity = { shortCode: 'K7M2', path: 'pages/original.page', state: 'active' as const };
  return {
    kind: 'pptd',
    deckId: 'deck-test-1',
    entry: 'deck.pptd',
    title: 'Scientific source fixture',
    size,
    manifest: { title: 'Scientific source fixture', pages: ['pages/original.page'], size },
    manifestRevision: 'sha256:manifest',
    metadataRevision: 'sha256:metadata',
    pages: [
      {
        pageId: 'page-test-1',
        shortCode: 'K7M2',
        path: identity.path,
        state: 'active',
        pageRevision: 'sha256:page',
        renderRevision: 'sha256:render',
        data: { elements, notes: 'Original speaker notes' },
        metadata: identity,
      },
    ],
    metadata: {
      schemaVersion: 1,
      deckId: 'deck-test-1',
      entry: 'deck.pptd',
      slides: { 'page-test-1': identity },
    },
    identityPersisted: true,
    writable: true,
    epoch: 'epoch-test',
    sequence: 0,
    diagnostics: [],
  };
}
