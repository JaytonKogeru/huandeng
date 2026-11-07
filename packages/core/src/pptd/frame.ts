import type { PptdStore } from './store.ts';
import { PptdError } from './types.ts';

export interface FrameRecordRequest {
  pageId: string;
  requestId: string;
  expectedMetadataRevision: string | null;
  actor: string;
  source: string;
  recordedAt: string;
  requestedChange: string;
  purpose?: string;
  keep?: string[];
}

export async function recordFrame(store: PptdStore, input: FrameRecordRequest) {
  for (const field of [
    'pageId',
    'requestId',
    'actor',
    'source',
    'recordedAt',
    'requestedChange',
  ] as const) {
    if (typeof input[field] !== 'string' || !input[field].trim())
      throw new PptdError('INVALID_REQUEST', `${field} is required.`);
  }
  if (!Object.hasOwn(input, 'expectedMetadataRevision'))
    throw new PptdError('MISSING_PRECONDITION', 'expectedMetadataRevision is required.');
  if (!Number.isFinite(Date.parse(input.recordedAt)))
    throw new PptdError('INVALID_REQUEST', 'recordedAt must be an ISO timestamp.');
  if (input.purpose !== undefined && typeof input.purpose !== 'string')
    throw new PptdError('INVALID_REQUEST', 'purpose must be text.');
  if (
    input.keep !== undefined &&
    (!Array.isArray(input.keep) || input.keep.some((item) => typeof item !== 'string'))
  )
    throw new PptdError('INVALID_REQUEST', 'keep must be an array of text.');
  const page = store.readPage(input.pageId);
  const set: Record<string, unknown> = {};
  for (const field of [
    'purpose',
    'keep',
    'requestedChange',
    'actor',
    'recordedAt',
    'source',
  ] as const) {
    if (input[field] !== undefined) set[`designIntent.${field}`] = input[field];
  }
  return store.commit({
    requestId: input.requestId,
    deckId: store.getSnapshot().deckId,
    actor: input.actor,
    expected: { metadata: input.expectedMetadataRevision },
    operations: [{ op: 'metadata.patch', pageId: page.pageId, set }],
  });
}
