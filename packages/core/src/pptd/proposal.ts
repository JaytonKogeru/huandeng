import { isDeepStrictEqual } from 'node:util';
import { assertJsonValue, isRecord } from './codec';
import { type FileChange, hashBytes, hashPayload } from './persistence';
import { pageLabel, projectInsights } from './project-insights';
import {
  type DeckSnapshot,
  type ElementRef,
  type NewRevisions,
  type PageSnapshot,
  PptdError,
  type ProposalChange,
  type ProposalValue,
  type Revision,
  type TransactionPreview,
  type TransactionRequest,
} from './types';

const MAX_CHANGES = 200;
const MAX_VALUE_CHARACTERS = 2000;
const MAX_PAGES = 100;
const MAX_USES = 50;

export function validateTransactionRequest(
  request: unknown,
): asserts request is TransactionRequest {
  if (
    !isRecord(request) ||
    typeof request.requestId !== 'string' ||
    typeof request.actor !== 'string' ||
    typeof request.deckId !== 'string' ||
    !isRecord(request.expected) ||
    !Array.isArray(request.operations) ||
    request.operations.some((operation) => !isRecord(operation) || typeof operation.op !== 'string')
  )
    throw new PptdError('INVALID_REQUEST', 'Invalid transaction envelope.');
  assertJsonValue(request);
  if (!request.requestId || !request.actor || !request.operations.length)
    throw new PptdError(
      'INVALID_REQUEST',
      'A requestId, actor, expected revisions and operations are required.',
    );
}

export function proposalHash(request: TransactionRequest): Revision {
  validateTransactionRequest(request);
  return hashPayload({ schemaVersion: 1, transaction: request });
}

export function assertProposalHash(request: TransactionRequest, expected: unknown): void {
  if (typeof expected !== 'string' || expected !== proposalHash(request))
    throw new PptdError(
      'INVALID_REQUEST',
      'This transaction differs from the preview. Preview the exact transaction again.',
    );
}

function previewValue(value: unknown): ProposalValue {
  if (value === undefined) return { present: false };
  const serialized = JSON.stringify(value);
  if (serialized.length <= MAX_VALUE_CHARACTERS)
    return { present: true, value: structuredClone(value) };
  return {
    present: true,
    value: `${serialized.slice(0, MAX_VALUE_CHARACTERS)}…`,
    truncated: true,
    characters: serialized.length,
  };
}

export function createTransactionPreview(input: {
  request: TransactionRequest;
  before: DeckSnapshot;
  after: DeckSnapshot;
  baseline: NewRevisions;
  files: FileChange[];
  pageStates: { pageId: string; before?: PageSnapshot; after?: PageSnapshot }[];
  createdPageIds: string[];
  skippedOverrides: ElementRef[];
}): TransactionPreview {
  const changes: ProposalChange[] = [];
  let totalChangeCount = 0;
  const compare = (
    target: ProposalChange['target'],
    before: unknown,
    after: unknown,
    field = '',
    identity: Pick<ProposalChange, 'pageId' | 'elementId'> = {},
    depth = 0,
  ): void => {
    if (isDeepStrictEqual(before, after)) return;
    if (isRecord(before) && isRecord(after) && depth < 5) {
      for (const key of [...new Set([...Object.keys(before), ...Object.keys(after)])].sort())
        compare(
          target,
          before[key],
          after[key],
          field ? `${field}.${key}` : key,
          identity,
          depth + 1,
        );
      return;
    }
    totalChangeCount++;
    if (changes.length < MAX_CHANGES)
      changes.push({
        target,
        ...identity,
        field,
        before: previewValue(before),
        after: previewValue(after),
      });
  };
  compare('manifest', input.before.manifest, input.after.manifest);
  compare('project', input.before.metadata.project, input.after.metadata.project);
  const {
    slides: _beforeSlides,
    project: _beforeProject,
    ...beforeMetadata
  } = input.before.metadata;
  const { slides: _afterSlides, project: _afterProject, ...afterMetadata } = input.after.metadata;
  compare('metadata', beforeMetadata, afterMetadata);
  for (const { pageId, before, after } of input.pageStates) {
    compare('metadata', before?.metadata, after?.metadata, '', { pageId });
    const { elements: beforeElements = [], ...beforeFields } = before?.data ?? {};
    const { elements: afterElements = [], ...afterFields } = after?.data ?? {};
    compare('page', beforeFields, afterFields, '', { pageId });
    compare(
      'page',
      beforeElements.map((element) => element.elementId),
      afterElements.map((element) => element.elementId),
      'elements.order',
      { pageId },
    );
    const previous = new Map(beforeElements.map((element) => [element.elementId, element]));
    const next = new Map(afterElements.map((element) => [element.elementId, element]));
    for (const elementId of new Set([...previous.keys(), ...next.keys()]))
      compare('element', previous.get(elementId), next.get(elementId), '', { pageId, elementId });
  }
  const created = new Set(input.createdPageIds);
  const previousUses = projectInsights(input.before).usageByPage;
  const nextUses = projectInsights(input.after).usageByPage;
  const pages = input.pageStates.slice(0, MAX_PAGES).map(({ pageId, before, after }) => {
    const page = after ?? before;
    const uses = new Map(
      [...(previousUses[pageId] ?? []), ...(nextUses[pageId] ?? [])].map((use) => [
        use.occurrenceId,
        use,
      ]),
    );
    return {
      pageId,
      label: page ? pageLabel(page) : pageId,
      provisional: created.has(pageId),
      beforeRevision: before?.pageRevision ?? null,
      afterRevision: after?.pageRevision ?? null,
      usedBy: [...uses.values()].slice(0, MAX_USES).map((use) => ({
        presentationId: use.presentationId,
        presentationTitle: use.presentationTitle,
        occurrenceId: use.occurrenceId,
        position: use.position,
        ...(use.versionId ? { versionId: use.versionId } : {}),
      })),
      totalUses: uses.size,
      usesTruncated: uses.size > MAX_USES,
    };
  });
  const operationCounts = new Map<string, number>();
  for (const { op } of input.request.operations)
    operationCounts.set(op, (operationCounts.get(op) ?? 0) + 1);
  const diagnostics = input.after.diagnostics;
  return {
    ok: true,
    kind: 'proposal-preview',
    schemaVersion: 1,
    deckId: input.before.deckId,
    ...(input.before.projectGuidance
      ? { projectGuidance: structuredClone(input.before.projectGuidance) }
      : {}),
    requestId: input.request.requestId,
    previewHash: proposalHash(input.request),
    writable: input.before.writable,
    baseline: input.baseline,
    operations: [...operationCounts].map(([op, count]) => ({ op, count })),
    files: input.files.slice(0, MAX_CHANGES).map((file) => ({
      role: file.role,
      path: file.path,
      ...(file.pageId ? { pageId: file.pageId } : {}),
      provisional: !!file.pageId && created.has(file.pageId),
      beforeRevision: file.before === null ? null : hashBytes(file.before),
      afterRevision: file.after === null ? null : hashBytes(file.after),
    })),
    totalFileCount: input.files.length,
    filesTruncated: input.files.length > MAX_CHANGES,
    pages,
    totalPageCount: input.pageStates.length,
    pagesTruncated: input.pageStates.length > MAX_PAGES,
    changes,
    totalChangeCount,
    changesTruncated: totalChangeCount > MAX_CHANGES,
    createdPageCount: created.size,
    skippedOverrides: input.skippedOverrides.slice(0, MAX_CHANGES),
    totalSkippedOverrides: input.skippedOverrides.length,
    noOp: input.files.length === 0,
    diagnostics: diagnostics.slice(0, MAX_CHANGES),
    diagnosticsTruncated: diagnostics.length > MAX_CHANGES,
  };
}
