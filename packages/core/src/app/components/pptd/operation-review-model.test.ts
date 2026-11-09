import { describe, expect, it } from 'vitest';
import { translateUi } from '../../../locale/huandeng';
import type { ActivityEvent } from '../../../pptd/activity';
import { emptyStory } from '../../../pptd/project-model';
import type { DeckSnapshot, OperationReview } from '../../../pptd/types';
import {
  activityLabel,
  assertReviewIdentity,
  changeSummary,
  currentReviewTarget,
  readOperationReview,
  receiptIds,
  reviewChangeLabel,
} from './operation-review-model';
import { currentPageScope } from './page-scope';

const translate = (value: string, values?: Record<string, string | number>) =>
  translateUi('en', value, values);
function snapshot(): DeckSnapshot {
  const metadata = { shortCode: 'S1', path: 'a.page', state: 'active' as const };
  return {
    kind: 'pptd',
    deckId: 'project-a',
    entry: 'deck.pptd',
    title: 'Synthetic',
    size: [100, 50],
    manifest: { pages: ['a.page'] },
    manifestRevision: 'sha256:manifest',
    metadataRevision: 'sha256:metadata',
    pages: [
      {
        pageId: 'a',
        path: 'a.page',
        shortCode: 'S1',
        state: 'active',
        pageRevision: 'sha256:page',
        renderRevision: 'sha256:render',
        metadata,
        data: { elements: [{ elementId: 'kept', elementType: 'text', bounds: [0, 0, 10, 10] }] },
      },
    ],
    metadata: {
      schemaVersion: 1,
      deckId: 'project-a',
      entry: 'deck.pptd',
      slides: { a: metadata },
      project: {
        schemaVersion: 1,
        mainStory: emptyStory(),
        sections: [{ id: 'section', title: 'Section', pageIds: ['a'], story: emptyStory() }],
        presentations: [
          {
            id: 'talk',
            title: 'Talk',
            story: emptyStory(),
            items: [
              { kind: 'section', id: 'one', sectionId: 'section' },
              { kind: 'section', id: 'two', sectionId: 'section' },
              { kind: 'page', id: 'pinned', pageId: 'a', versionId: 'checkpoint:1' },
            ],
          },
        ],
      },
    },
    identityPersisted: true,
    writable: true,
    epoch: 'epoch',
    sequence: 1,
    diagnostics: [],
  };
}
const event = {
  source: 'client',
  status: 'completed',
  summary: 'Done',
  timestamp: '2026-01-01T00:00:00Z',
  operationIds: ['claim', 'claim'],
} as ActivityEvent;

describe('operation review presentation and navigation', () => {
  it('distinguishes completed client claims from actual writer receipts', () => {
    expect(activityLabel(event, translate)).toBe('Client report · completed');
    expect(activityLabel({ ...event, source: 'writer', operationId: 'receipt' }, translate)).toBe(
      'Saved writer receipt',
    );
    expect(activityLabel({ ...event, source: 'writer', status: 'failed' }, translate)).toBe(
      'Writer save failed',
    );
    expect(activityLabel({ ...event, source: 'writer' }, translate)).toBe('Writer observation');
    expect(receiptIds(event)).toEqual(['claim']);
    expect(receiptIds({ ...event, source: 'writer', operationId: 'receipt' })).toEqual(['receipt']);
    expect(receiptIds({ ...event, source: 'writer' })).toEqual([]);
  });
  it('shows known writer changes in plain language while retaining unknown summaries', () => {
    expect(
      changeSummary('element.add, element.add, page.notes.set, custom summary', translate),
    ).toBe('Add object · Edit speaker notes · custom summary');
    expect(changeSummary('Saved 2 Slides · Main order · Project / Story', translate)).toBe(
      'Slides saved: 2 · Main order · Project / Story',
    );
    expect(
      reviewChangeLabel({ kind: 'changed', label: 'Page', fields: ['notes'] }, translate),
    ).toBe('changed · Page');
    expect(
      reviewChangeLabel({ kind: 'removed', elementId: 'old', label: 'old', fields: [] }, translate),
    ).toBe('removed · Object old');
  });
  it('does not fall back to an unrelated current object or deleted page', () => {
    const current = snapshot();
    expect(currentReviewTarget(current, 'a', 'kept')).toEqual({ pageId: 'a', elementId: 'kept' });
    expect(currentReviewTarget(current, 'a', 'removed')).toBeNull();
    expect(currentReviewTarget(current, 'deleted')).toBeNull();
    expect(currentReviewTarget(current, null)).toBeNull();
    current.pages[0].state = 'tombstone';
    expect(currentReviewTarget(current, 'a')).toBeNull();
  });
  it('counts repeated section references and pins from current project occurrences', () => {
    const current = snapshot();
    expect(currentPageScope(current, 'a')).toMatchObject({ main: true, live: 2, pinned: 1 });
    current.metadata.project?.presentations[0].items.shift();
    expect(currentPageScope(current, 'a')).toMatchObject({ live: 1, pinned: 1 });
    expect(currentPageScope(current, 'missing')).toMatchObject({ main: false, live: 0, pinned: 0 });
  });
  it('rejects a response from another Project, operation or requested page', () => {
    const review = { deckId: 'project-a', operationId: 'op', pageId: null } as OperationReview;
    expect(assertReviewIdentity(review, 'project-a', 'op')).toBe(review);
    expect(() => assertReviewIdentity(review, 'project-b', 'op')).toThrow(/does not match/);
    expect(() => assertReviewIdentity(review, 'project-a', 'other')).toThrow(/does not match/);
    expect(() => assertReviewIdentity(review, 'project-a', 'op', 'a')).toThrow(/does not match/);
  });
  it('translates new review and stream labels into Chinese', () => {
    expect(translateUi('zh-CN', 'Review saved changes')).toBe('查看已保存的修改');
    expect(translateUi('zh-CN', 'Activity stream connected')).toBe('动态流已连接');
  });
  it('ignores late results after cancellation even when a transport ignores abort', async () => {
    let finish: (review: OperationReview) => void = () => {};
    const pending = new Promise<OperationReview>((resolve) => {
      finish = resolve;
    });
    const abort = new AbortController();
    const response = readOperationReview(
      { operationReview: () => pending },
      'project-a',
      'old',
      undefined,
      abort.signal,
    );
    abort.abort();
    finish({ deckId: 'project-a', operationId: 'old', pageId: 'a' } as OperationReview);
    await expect(response).rejects.toMatchObject({ name: 'AbortError' });
    const fresh = { deckId: 'project-a', operationId: 'new', pageId: 'b' } as OperationReview;
    await expect(
      readOperationReview(
        { operationReview: async () => fresh },
        'project-a',
        'new',
        'b',
        new AbortController().signal,
      ),
    ).resolves.toBe(fresh);
  });
});
