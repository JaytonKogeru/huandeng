import type { ActivityEvent } from '../../../pptd/activity';
import type { DeckSnapshot, OperationReview, OperationReviewChange } from '../../../pptd/types';
import type { PptdBackend } from '../../lib/pptd-backend';

type Translate = (message: string, values?: Record<string, string | number>) => string;

const operationLabels: Record<string, string> = {
  'element.patch': 'Edit object',
  'element.add': 'Add object',
  'element.remove': 'Remove object',
  'element.reorder': 'Reorder objects',
  'page.notes.set': 'Edit speaker notes',
  'metadata.patch': 'Edit Story or layout metadata',
  'recipe.apply': 'Apply layout',
  'recipe.reset': 'Reset layout',
  'page.add': 'Add slide',
  'page.duplicate': 'Duplicate slide',
  'page.remove': 'Remove slide',
  'page.move': 'Reorder slides',
  'page.restore': 'Restore slide',
  'page.version.restore': 'Restore page version',
  'project.replace': 'Edit Project Story or structure',
};

export function activityLabel(event: ActivityEvent, t: Translate) {
  if (event.source === 'client') return `${t('Client report')} · ${t(event.status)}`;
  if (event.status === 'failed') return t('Writer save failed');
  return event.operationId ? t('Saved writer receipt') : t('Writer observation');
}

export function changeSummary(summary: string, t: Translate) {
  const writer = /^(Saved|Reloaded) (\d+) Slides?(.*)$/.exec(summary);
  if (writer)
    return [
      t(writer[1] === 'Saved' ? 'Slides saved: {count}' : 'Slides reloaded: {count}', {
        count: writer[2],
      }),
      ...writer[3]
        .split(' · ')
        .filter(Boolean)
        .map((part) => t(part)),
    ].join(' · ');
  if (summary.startsWith('Save was not completed · '))
    return `${t('Save was not completed')} · ${summary.slice('Save was not completed · '.length)}`;
  return [...new Set(summary.split(', ').map((part) => t(operationLabels[part] ?? part)))].join(
    ' · ',
  );
}

export function receiptIds(event: ActivityEvent) {
  return event.source === 'writer'
    ? event.operationId
      ? [event.operationId]
      : []
    : [...new Set(event.operationIds ?? [])].slice(0, 20);
}

export function reviewChangeLabel(change: OperationReviewChange, t: Translate) {
  if (change.elementId) return `${t(change.kind)} · ${t('Object')} ${change.label}`;
  return `${t(change.kind)} · ${t(change.label)}`;
}

export function currentReviewTarget(
  snapshot: DeckSnapshot,
  pageId: string | null,
  elementId?: string,
) {
  const page = snapshot.pages.find((item) => item.pageId === pageId && item.state === 'active');
  if (!page || (elementId && !page.data.elements.some((item) => item.elementId === elementId)))
    return null;
  return { pageId: page.pageId, ...(elementId ? { elementId } : {}) };
}

export function assertReviewIdentity(
  review: OperationReview,
  deckId: string,
  operationId: string,
  pageId?: string,
) {
  if (
    review.deckId !== deckId ||
    review.operationId !== operationId ||
    (pageId !== undefined && review.pageId !== pageId)
  )
    throw new Error('Review response does not match this Project, operation or slide.');
  return review;
}

export async function readOperationReview(
  backend: Pick<PptdBackend, 'operationReview'>,
  deckId: string,
  operationId: string,
  pageId: string | undefined,
  signal: AbortSignal,
) {
  signal.throwIfAborted();
  const review = await backend.operationReview(operationId, pageId, signal);
  signal.throwIfAborted();
  return assertReviewIdentity(review, deckId, operationId, pageId);
}
