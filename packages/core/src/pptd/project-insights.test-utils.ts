import { emptyStory } from './project-model';
import type { DeckSnapshot, PageSnapshot } from './types';

export function insightFixture(): DeckSnapshot {
  const pages: PageSnapshot[] = ['agenda', 'evidence', 'conclusion'].map((pageId, index) => ({
    pageId,
    shortCode: index === 0 ? 'S18A' : `ABC${index}`,
    path: `pages/${pageId}.page`,
    state: 'active',
    pageRevision: `sha256:${pageId}`,
    renderRevision: `sha256:render-${pageId}`,
    assetRevisions: {},
    data: { elements: [], notes: `Main notes: ${pageId}` },
    metadata: {
      shortCode: index === 0 ? 'S18A' : `ABC${index}`,
      label: `S${index + 1}`,
      path: `pages/${pageId}.page`,
      state: 'active',
      designIntent: { purpose: `Explain ${pageId}`, keep: ['Preserve original figures'] },
    },
  }));
  return {
    kind: 'pptd',
    deckId: 'deck',
    entry: 'deck.pptd',
    title: 'Research library',
    size: [960, 540],
    manifest: { pages: pages.map((page) => page.path) },
    manifestRevision: 'sha256:manifest',
    metadataRevision: 'sha256:metadata',
    pages,
    metadata: {
      schemaVersion: 1,
      deckId: 'deck',
      entry: 'deck.pptd',
      designPolicy: 'Use original figures',
      slides: Object.fromEntries(pages.map((page) => [page.pageId, page.metadata])),
      project: {
        schemaVersion: 1,
        mainStory: { purpose: 'Complete account', audience: 'Lab', takeaway: 'The evidence' },
        sections: [
          {
            id: 'results',
            title: 'Results',
            pageIds: ['evidence', 'conclusion'],
            story: { purpose: 'Explain results', audience: 'Lab', takeaway: 'Main finding' },
          },
        ],
        presentations: [
          {
            id: 'talk',
            title: 'Conference talk',
            story: { purpose: 'Short account', audience: 'Peers', takeaway: 'What changed' },
            items: [
              { id: 'opening', kind: 'page', pageId: 'agenda' },
              { id: 'results', kind: 'section', sectionId: 'results' },
              {
                id: 'return',
                kind: 'page',
                pageId: 'agenda',
                notes: 'Return to our starting question',
              },
            ],
          },
          {
            id: 'seminar',
            title: 'Seminar',
            story: emptyStory(),
            items: [{ id: 'results', kind: 'section', sectionId: 'results' }],
          },
        ],
      },
    },
    identityPersisted: true,
    writable: true,
    epoch: 'epoch',
    sequence: 0,
    diagnostics: [],
  };
}
