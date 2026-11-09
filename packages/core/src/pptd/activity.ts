import fs from 'node:fs/promises';
import { atomicWrite, hashPayload } from './persistence';
import { type DocumentEvent, PptdError } from './types';

export const activityStatuses = [
  'planned',
  'running',
  'waiting',
  'completed',
  'failed',
  'cancelled',
] as const;
export type ActivityStatus = (typeof activityStatuses)[number];
const maxActivityBytes = 2 * 1024 * 1024;

export interface ActivityReport {
  deckId: string;
  requestId: string;
  taskId: string;
  sessionId: string;
  actor: string;
  status: ActivityStatus;
  summary: string;
  pageIds?: string[];
  /** Explicit client claims, resolved against this Project's journal when reviewed. */
  operationIds?: string[];
}

export interface ActivityEvent extends ActivityReport {
  sequence: number;
  timestamp: string;
  epoch: string;
  source: 'client' | 'writer';
  operationId?: string;
}

export interface ActivitySnapshot {
  deckId: string;
  epoch: string;
  sequence: number;
  events: ActivityEvent[];
  retainedLimit: number;
  storageError?: string;
}

interface StoredActivity {
  schemaVersion: 1;
  deckId: string;
  sequence: number;
  events: ActivityEvent[];
  receipts: { requestId: string; hash: string; event: ActivityEvent }[];
}

function validStoredEvent(
  value: unknown,
  deckId: string,
  lastSequence: number,
): value is ActivityEvent {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const event = value as ActivityEvent;
  return (
    event.deckId === deckId &&
    Number.isSafeInteger(event.sequence) &&
    event.sequence > 0 &&
    event.sequence <= lastSequence &&
    ['client', 'writer'].includes(event.source) &&
    activityStatuses.includes(event.status) &&
    ['requestId', 'taskId', 'sessionId', 'actor', 'summary', 'epoch'].every((key) => {
      const text = event[key as keyof ActivityEvent];
      return typeof text === 'string' && text.length > 0 && text.length <= 1000;
    }) &&
    typeof event.timestamp === 'string' &&
    Number.isFinite(Date.parse(event.timestamp)) &&
    (event.operationId === undefined || typeof event.operationId === 'string') &&
    (event.operationIds === undefined ||
      (Array.isArray(event.operationIds) &&
        event.operationIds.length <= 20 &&
        event.operationIds.every(
          (id) =>
            typeof id === 'string' &&
            id.trim().length > 0 &&
            id.length <= 160 &&
            ![...id].some(invalidControl),
        ))) &&
    (event.pageIds === undefined ||
      (Array.isArray(event.pageIds) &&
        event.pageIds.length <= 40 &&
        event.pageIds.every((id) => typeof id === 'string' && id.length > 0 && id.length <= 100)))
  );
}

function invalidControl(character: string): boolean {
  const code = character.charCodeAt(0);
  return code < 32 && ![9, 10, 13].includes(code);
}

function boundedText(value: unknown, name: string, limit: number): string {
  if (
    typeof value !== 'string' ||
    !value.trim() ||
    value.length > limit ||
    [...value].some(invalidControl)
  )
    throw new PptdError(
      'INVALID_REQUEST',
      `${name} must be nonempty text of at most ${limit} characters.`,
    );
  return value.trim();
}

function writerText(value: unknown, fallback: string, limit: number): string {
  const text =
    typeof value === 'string'
      ? [...value]
          .filter((character) => !invalidControl(character))
          .join('')
          .trim()
          .slice(0, limit)
          .trim()
      : '';
  return text || fallback;
}

export function validateActivityReport(value: unknown, deckId: string): ActivityReport {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new PptdError('INVALID_REQUEST', 'An activity report object is required.');
  const input = value as Record<string, unknown>;
  if (input.deckId !== deckId)
    throw new PptdError('INVALID_REQUEST', 'Activity belongs to a different Project.');
  const allowed = new Set([
    'deckId',
    'requestId',
    'taskId',
    'sessionId',
    'actor',
    'status',
    'summary',
    'pageIds',
    'operationIds',
  ]);
  if (Object.keys(input).some((key) => !allowed.has(key)))
    throw new PptdError('INVALID_REQUEST', 'Unknown activity report field.');
  if (!activityStatuses.includes(input.status as ActivityStatus))
    throw new PptdError('INVALID_REQUEST', 'Invalid activity status.');
  if (input.pageIds !== undefined && (!Array.isArray(input.pageIds) || input.pageIds.length > 40))
    throw new PptdError('INVALID_REQUEST', 'pageIds must contain at most 40 stable Slide IDs.');
  if (
    input.operationIds !== undefined &&
    (!Array.isArray(input.operationIds) || input.operationIds.length > 20)
  )
    throw new PptdError('INVALID_REQUEST', 'operationIds must contain at most 20 operation IDs.');
  return {
    deckId,
    requestId: boundedText(input.requestId, 'requestId', 160),
    taskId: boundedText(input.taskId, 'taskId', 160),
    sessionId: boundedText(input.sessionId, 'sessionId', 160),
    actor: boundedText(input.actor, 'actor', 100),
    status: input.status as ActivityStatus,
    summary: boundedText(input.summary, 'summary', 600),
    ...(input.operationIds === undefined
      ? {}
      : {
          operationIds: [
            ...new Set(
              (input.operationIds as unknown[]).map((id) => boundedText(id, 'operationId', 160)),
            ),
          ],
        }),
    ...(input.pageIds === undefined
      ? {}
      : {
          pageIds: [
            ...new Set((input.pageIds as unknown[]).map((id) => boundedText(id, 'pageId', 100))),
          ],
        }),
  };
}

export class ProjectActivity {
  private state: StoredActivity;
  private tail: Promise<unknown> = Promise.resolve();
  private listeners = new Set<(event: ActivityEvent) => void>();
  private readonly limit = 300;
  private storageError?: string;

  private constructor(
    readonly file: string,
    readonly deckId: string,
    readonly epoch: string,
    state?: StoredActivity,
  ) {
    this.state = state ?? { schemaVersion: 1, deckId, sequence: 0, events: [], receipts: [] };
  }

  static async open(file: string, deckId: string, epoch: string): Promise<ProjectActivity> {
    let state: StoredActivity | undefined;
    try {
      const stat = await fs.stat(file);
      if (stat.size > maxActivityBytes) throw new Error('Activity log exceeds its size limit.');
      const parsed = JSON.parse(await fs.readFile(file, 'utf8')) as StoredActivity;
      if (
        parsed.schemaVersion !== 1 ||
        parsed.deckId !== deckId ||
        !Number.isSafeInteger(parsed.sequence) ||
        parsed.sequence < 0 ||
        !Array.isArray(parsed.events) ||
        !Array.isArray(parsed.receipts)
      )
        throw new Error('Activity log has an invalid structure.');
      if (parsed.events.length > 300 || parsed.receipts.length > 300)
        throw new Error('Activity log exceeds its retention limit.');
      if (
        parsed.events.some(
          (event, index) =>
            !validStoredEvent(event, deckId, parsed.sequence) ||
            (index > 0 && event.sequence <= parsed.events[index - 1].sequence),
        ) ||
        parsed.receipts.some(
          (receipt) =>
            !receipt ||
            typeof receipt.requestId !== 'string' ||
            typeof receipt.hash !== 'string' ||
            !validStoredEvent(receipt.event, deckId, parsed.sequence) ||
            receipt.requestId !== receipt.event.requestId,
        )
      )
        throw new Error('Activity log contains an invalid event.');
      state = parsed;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        const activity = new ProjectActivity(file, deckId, epoch);
        activity.storageError =
          'The previous activity log could not be read. It has been preserved; slide editing remains available.';
        return activity;
      }
    }
    return new ProjectActivity(file, deckId, epoch, state);
  }

  snapshot(): ActivitySnapshot {
    return structuredClone({
      deckId: this.deckId,
      epoch: this.epoch,
      sequence: this.state.sequence,
      events: [...this.state.events].reverse(),
      retainedLimit: this.limit,
      ...(this.storageError ? { storageError: this.storageError } : {}),
    });
  }

  subscribe(listener: (event: ActivityEvent) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  report(value: unknown): Promise<ActivityEvent> {
    return this.append(validateActivityReport(value, this.deckId), 'client');
  }

  document(event: DocumentEvent): Promise<ActivityEvent> | undefined {
    if (event.type === 'diagnostic') return;
    const pageIds = Object.keys(event.changedPages);
    return this.append(
      {
        deckId: this.deckId,
        requestId: `writer:${event.epoch}:${event.sequence}`,
        taskId: writerText(event.operationId, `external:${event.sequence}`, 160),
        sessionId: writerText(event.originClientId, 'shared-writer', 160),
        actor: event.type === 'external' ? 'External file change' : 'Shared writer',
        status: 'completed',
        summary: `${event.type === 'external' ? 'Reloaded' : 'Saved'} ${pageIds.length} Slide${pageIds.length === 1 ? '' : 's'}${event.manifestChanged ? ' · Main order' : ''}${event.metadataChanged ? ' · Project / Story' : ''}`,
        pageIds: pageIds.slice(0, 40),
      },
      'writer',
      event.operationId,
    );
  }

  failure(request: Record<string, unknown>, code: string): Promise<ActivityEvent> {
    const report = {
      deckId: this.deckId,
      taskId: writerText(request.requestId, 'unidentified-request', 160),
      sessionId: writerText(request.originClientId, 'shared-writer', 160),
      actor: writerText(request.actor, 'Shared writer', 100),
      status: 'failed' as const,
      summary: `Save was not completed · ${writerText(code, 'SAVE_ERROR', 100)}`,
    };
    return this.append({ ...report, requestId: `failed:${hashPayload(report)}` }, 'writer');
  }

  private append(
    report: ActivityReport,
    source: ActivityEvent['source'],
    operationId?: string,
  ): Promise<ActivityEvent> {
    const pending = this.tail.then(async () => {
      if (this.storageError) throw new PptdError('INVALID_REQUEST', this.storageError);
      const normalized = validateActivityReport(report, this.deckId);
      const hash = hashPayload({ report: normalized, source, operationId });
      const previous = this.state.receipts.find(
        (receipt) => receipt.requestId === normalized.requestId && receipt.event.source === source,
      );
      if (previous) {
        if (previous.hash !== hash)
          throw new PptdError(
            'REQUEST_ID_REUSE',
            'This activity request ID has different content.',
          );
        return structuredClone(previous.event);
      }
      const event: ActivityEvent = {
        ...normalized,
        sequence: this.state.sequence + 1,
        timestamp: new Date().toISOString(),
        epoch: this.epoch,
        source,
        ...(operationId ? { operationId } : {}),
      };
      const next: StoredActivity = {
        schemaVersion: 1,
        deckId: this.deckId,
        sequence: event.sequence,
        events: [...this.state.events, event].slice(-this.limit),
        receipts: [...this.state.receipts, { requestId: normalized.requestId, hash, event }].slice(
          -this.limit,
        ),
      };
      let serialized = JSON.stringify(next);
      while (Buffer.byteLength(serialized, 'utf8') > maxActivityBytes && next.events.length > 1) {
        const removed = next.events.shift();
        if (removed)
          next.receipts = next.receipts.filter(
            (receipt) => receipt.event.sequence > removed.sequence,
          );
        serialized = JSON.stringify(next);
      }
      if (Buffer.byteLength(serialized, 'utf8') > maxActivityBytes)
        throw new PptdError(
          'INVALID_REQUEST',
          'Activity event exceeds the retained log size limit.',
        );
      await atomicWrite(this.file, serialized);
      this.state = next;
      for (const listener of this.listeners) {
        try {
          listener(structuredClone(event));
        } catch {}
      }
      return structuredClone(event);
    });
    this.tail = pending.catch(() => {});
    return pending;
  }

  async close(): Promise<void> {
    await this.tail;
    this.listeners.clear();
  }
}
