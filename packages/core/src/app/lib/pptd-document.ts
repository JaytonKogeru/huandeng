import {
  knownTimeline,
  removeTimelineTargets,
  timelineTargetIds,
} from '../../pptd/timeline-operations';
import type {
  ExpectedRevisions,
  PageSnapshot,
  PptdOperation,
  TransactionRequest,
  TransactionResult,
} from '../../pptd/types';
import { PptdClientError, type PptdSession, type PptdTransport } from './pptd-backend';

export type PageDraft = {
  base: PageSnapshot;
  metadataRevision: PptdSession['metadataRevision'];
  fields: Record<string, Record<string, unknown>>;
  notes?: string;
  conflict?: string;
};

export type PptdClientState = {
  snapshot: PptdSession | null;
  drafts: Record<string, PageDraft>;
  loading: boolean;
  connected: boolean;
  saving: boolean;
  error: PptdClientError | null;
  undoStack: string[];
  redoStack: string[];
  lastSaved: number | null;
  canRetry: boolean;
  recoveryRequired: boolean;
  recovering: boolean;
};

type RefreshKind = 'committed' | 'authoritative';

type PendingWrite = {
  request: TransactionRequest;
  pageId?: string;
  sent?: PageDraft;
  history?: { kind: 'undo' | 'redo'; operationId: string };
  previews?: Map<string, { base: PageSnapshot; page: PageSnapshot }>;
  result?: TransactionResult;
};

function asClientError(error: unknown): PptdClientError {
  return error instanceof PptdClientError
    ? error
    : new PptdClientError('CLIENT_ERROR', error instanceof Error ? error.message : String(error));
}

function requiresRecovery(error: { code: string }): boolean {
  return ['PENDING_RECOVERY', 'RECOVERY_REQUIRED'].includes(error.code);
}

function recoveryNeeded(): PptdClientError {
  return new PptdClientError(
    'PENDING_RECOVERY',
    '有一次保存尚未完成。请先使用“恢复未完成保存”，本地草稿会保留。',
  );
}

function equal(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function sameFields<T extends object>(left: T, right: T): boolean {
  const keys = new Set([...Object.keys(left), ...Object.keys(right)] as (keyof T)[]);
  return [...keys].every((key) => left[key] === right[key]);
}

function setField(target: Record<string, unknown>, path: string, value: unknown) {
  const parts = path.split('.');
  if (parts.some((part) => ['__proto__', 'constructor', 'prototype'].includes(part))) return;
  let cursor = target;
  for (const part of parts.slice(0, -1)) {
    if (!cursor[part] || typeof cursor[part] !== 'object') cursor[part] = {};
    cursor = cursor[part] as Record<string, unknown>;
  }
  cursor[parts[parts.length - 1]] = structuredClone(value);
}

function fieldValue(target: unknown, path: string): unknown {
  return path
    .split('.')
    .reduce<unknown>(
      (value, key) =>
        value && typeof value === 'object' ? (value as Record<string, unknown>)[key] : undefined,
      target,
    );
}

export function draftHasChanges(draft: PageDraft): boolean {
  return Object.keys(draft.fields).length > 0 || draft.notes !== undefined;
}

export function projectDraft(draft: PageDraft): PageSnapshot {
  if (!draftHasChanges(draft)) return draft.base;
  const elements = draft.base.data.elements.map((element) => {
    const fields = draft.fields[element.elementId];
    if (!fields || !Object.keys(fields).length) return element;
    const changed = structuredClone(element);
    for (const [path, value] of Object.entries(fields)) setField(changed, path, value);
    return changed;
  });
  return {
    ...draft.base,
    data: {
      ...draft.base.data,
      elements: elements.every((element, index) => element === draft.base.data.elements[index])
        ? draft.base.data.elements
        : elements,
      ...(draft.notes !== undefined ? { notes: draft.notes } : {}),
    },
  };
}

function shareSnapshot(previous: PptdSession | null, next: PptdSession): PptdSession {
  if (!previous || previous.deckId !== next.deckId || previous.entry !== next.entry) return next;
  const previousPages = new Map(
    previous.pages.map((page) => [page.occurrenceId ?? page.pageId, page]),
  );
  const pages = next.pages.map((page) => {
    const before = previousPages.get(page.occurrenceId ?? page.pageId);
    if (!before) return page;
    const metadata = equal(before.metadata, page.metadata) ? before.metadata : page.metadata;
    const shared = {
      ...page,
      data: before.pageRevision === page.pageRevision ? before.data : page.data,
      metadata,
      assetRevisions:
        before.renderRevision === page.renderRevision ? before.assetRevisions : page.assetRevisions,
      authorReview: equal(before.authorReview, page.authorReview)
        ? before.authorReview
        : page.authorReview,
    };
    return sameFields(shared, before) ? before : shared;
  });
  const shared = {
    ...next,
    pages:
      pages.length === previous.pages.length &&
      pages.every((page, index) => page === previous.pages[index])
        ? previous.pages
        : pages,
    manifest:
      previous.manifestRevision === next.manifestRevision ? previous.manifest : next.manifest,
    metadata:
      (next.metadataRevision !== null && previous.metadataRevision === next.metadataRevision) ||
      equal(previous.metadata, next.metadata)
        ? previous.metadata
        : next.metadata,
    size: equal(previous.size, next.size) ? previous.size : next.size,
    diagnostics: equal(previous.diagnostics, next.diagnostics)
      ? previous.diagnostics
      : next.diagnostics,
  };
  return sameFields(shared, previous) ? previous : shared;
}

function previewElements(
  snapshot: PptdSession,
  operations: PptdOperation[],
): PendingWrite['previews'] {
  if (!operations.length) return;
  const previews: NonNullable<PendingWrite['previews']> = new Map();
  for (const operation of operations) {
    if (operation.op !== 'element.add' && operation.op !== 'element.remove') return;
    const base = snapshot.pages.find((page) => page.pageId === operation.pageId);
    if (!base) return;
    const page = previews.get(base.pageId)?.page ?? base;
    const elements = [...page.data.elements];
    if (operation.op === 'element.add') {
      if (elements.some((element) => element.elementId === operation.element.elementId)) return;
      const after = operation.afterElementId;
      const index =
        after === null ? -1 : elements.findIndex((element) => element.elementId === after);
      if (after !== undefined && after !== null && index < 0) return;
      elements.splice(after === undefined ? elements.length : index + 1, 0, operation.element);
    } else {
      const index = elements.findIndex((element) => element.elementId === operation.elementId);
      if (index < 0) return;
      elements.splice(index, 1);
    }
    previews.set(base.pageId, { base, page: { ...page, data: { ...page.data, elements } } });
  }
  for (const { page } of previews.values()) {
    const ids = new Set(page.data.elements.map((element) => element.elementId));
    const timeline = knownTimeline(page.data);
    if (timeline)
      page.data.timeline = removeTimelineTargets(
        timeline,
        new Set(timelineTargetIds(timeline).filter((id) => !ids.has(id))),
      );
    if (
      page.data.elements.some(
        (element) =>
          element.elementType === 'group' &&
          Array.isArray(element.children) &&
          element.children.some((id) => !ids.has(id)),
      )
    )
      return;
  }
  return previews;
}

function touchesComponent(draft: PageDraft): boolean {
  const changed = new Set(Object.keys(draft.fields));
  return Object.values(draft.base.metadata.components ?? {}).some((component) =>
    Object.values(component.slots).some((id) => id !== null && changed.has(id)),
  );
}

function allExpected(snapshot: PptdSession): ExpectedRevisions {
  return {
    pages: Object.fromEntries(snapshot.pages.map((page) => [page.pageId, page.pageRevision])),
    manifest: snapshot.manifestRevision,
    metadata: snapshot.metadataRevision,
  };
}

export class PptdDocumentClient {
  readonly clientId = crypto.randomUUID();
  private listeners = new Set<() => void>();
  private timers = new Map<string, ReturnType<typeof setTimeout>>();
  private composing = new Set<string>();
  private interactions = new Set<string>();
  private pending: PendingWrite | null = null;
  private stopEvents: (() => void) | null = null;
  private active = false;
  private refreshTicket = 0;
  private refreshQueued: RefreshKind | null = null;
  private refreshInFlight: RefreshKind | null = null;
  private eventCursor: { epoch: string; sequence: number } | null = null;
  private retiredEpochs = new Set<string>();
  private refreshing: Promise<void> | null = null;
  private projections = new WeakMap<PageDraft, PageSnapshot>();
  private state: PptdClientState = {
    snapshot: null,
    drafts: {},
    loading: true,
    connected: false,
    saving: false,
    error: null,
    undoStack: [],
    redoStack: [],
    lastSaved: null,
    canRetry: false,
    recoveryRequired: false,
    recovering: false,
  };

  constructor(readonly backend: PptdTransport) {}

  getState = () => this.state;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private publish(patch: Partial<PptdClientState>) {
    if (
      (Object.keys(patch) as (keyof PptdClientState)[]).every(
        (key) => patch[key] === this.state[key],
      )
    )
      return;
    this.state = { ...this.state, ...patch };
    for (const listener of this.listeners) listener();
  }

  async connect() {
    this.active = true;
    await this.refresh();
    this.ensureEvents();
  }

  private ensureEvents() {
    if (!this.active || this.stopEvents || !this.state.snapshot) return;
    this.stopEvents = this.backend.subscribe(
      (event) => {
        const snapshot = this.state.snapshot;
        const cursor = this.eventCursor ?? snapshot;
        if (
          this.retiredEpochs.has(event.epoch) ||
          (event.epoch === snapshot?.epoch && event.sequence <= snapshot.sequence) ||
          (event.epoch === cursor?.epoch && event.sequence <= cursor.sequence)
        )
          return;
        const contiguous = event.epoch === cursor?.epoch && event.sequence === cursor.sequence + 1;
        this.eventCursor = { epoch: event.epoch, sequence: event.sequence };
        if (contiguous && event.originClientId === this.clientId && this.state.saving) return;
        void this.requestRefresh(contiguous ? 'committed' : 'authoritative');
      },
      (connected) => {
        const wasConnected = this.state.connected;
        this.publish({ connected });
        if (connected && !wasConnected) void this.refresh();
      },
    );
  }

  disconnect() {
    this.active = false;
    this.refreshTicket++;
    this.refreshQueued = null;
    this.stopEvents?.();
    this.stopEvents = null;
    for (const timer of this.timers.values()) clearTimeout(timer);
    this.timers.clear();
  }

  refresh(): Promise<void> {
    return this.requestRefresh('authoritative');
  }

  private queueRefresh(kind: RefreshKind) {
    if (this.refreshQueued !== 'authoritative') this.refreshQueued = kind;
  }

  private requestRefresh(kind: RefreshKind): Promise<void> {
    this.queueRefresh(kind);
    return this.resumeRefresh();
  }

  private resumeRefresh(): Promise<void> {
    if (this.state.saving || !this.refreshQueued) return Promise.resolve();
    if (!this.refreshing) {
      this.refreshing = this.refreshSnapshots().finally(() => {
        this.refreshing = null;
        if (this.refreshQueued && !this.state.saving) void this.resumeRefresh();
      });
    }
    return this.refreshing;
  }

  private interruptRefresh() {
    this.refreshTicket++;
    if (this.refreshInFlight) this.queueRefresh(this.refreshInFlight);
  }

  private async refreshSnapshots() {
    while (this.refreshQueued && !this.state.saving) {
      const kind =
        this.refreshQueued === 'committed' && !this.backend.getCommittedSnapshot
          ? 'authoritative'
          : this.refreshQueued;
      this.refreshQueued = null;
      this.refreshInFlight = kind;
      const ticket = ++this.refreshTicket;
      try {
        const snapshot = await (kind === 'committed' && this.backend.getCommittedSnapshot
          ? this.backend.getCommittedSnapshot()
          : this.backend.getSnapshot());
        if (ticket !== this.refreshTicket || this.state.saving) continue;
        if (kind === 'committed' && snapshot.epoch !== this.state.snapshot?.epoch) {
          this.queueRefresh('authoritative');
          continue;
        }
        this.acceptSnapshot(snapshot, { loading: false });
        this.ensureEvents();
      } catch (error) {
        if (ticket === this.refreshTicket) {
          const failure = asClientError(error);
          this.publish({
            error: failure,
            loading: false,
            connected: false,
            ...(requiresRecovery(failure) ? { recoveryRequired: true } : {}),
          });
        }
      } finally {
        this.refreshInFlight = null;
      }
    }
  }

  private newestSnapshot(incoming: PptdSession): PptdSession {
    const current = this.state.snapshot;
    return current &&
      (this.retiredEpochs.has(incoming.epoch) ||
        (current.epoch === incoming.epoch && current.sequence > incoming.sequence))
      ? current
      : incoming;
  }

  private acceptSnapshot(incoming: PptdSession, patch: Partial<PptdClientState> = {}) {
    const snapshot = shareSnapshot(this.state.snapshot, this.newestSnapshot(incoming));
    if (this.state.snapshot && this.state.snapshot.epoch !== snapshot.epoch)
      this.retiredEpochs.add(this.state.snapshot.epoch);
    if (
      !this.eventCursor ||
      (this.eventCursor.epoch === snapshot.epoch &&
        this.eventCursor.sequence < snapshot.sequence) ||
      this.retiredEpochs.has(this.eventCursor.epoch)
    )
      this.eventCursor = { epoch: snapshot.epoch, sequence: snapshot.sequence };
    const previousDrafts = patch.drafts ?? this.state.drafts;
    let drafts = previousDrafts;
    const updateDraft = (pageId: string, draft: PageDraft) => {
      if (drafts === previousDrafts) drafts = { ...drafts };
      drafts[pageId] = draft;
    };
    for (const [pageId, draft] of Object.entries(previousDrafts)) {
      const remote = snapshot.pages.find((page) => page.pageId === pageId);
      if (!remote || remote.pageRevision !== draft.base.pageRevision) {
        const conflict = remote
          ? '这一页已有新版本，本地草稿已保留。'
          : '这一页已被移出当前演示，本地草稿已保留。';
        if (draft.conflict !== conflict) updateDraft(pageId, { ...draft, conflict });
      } else if (touchesComponent(draft) && snapshot.metadataRevision !== draft.metadataRevision) {
        const conflict = '组件绑定或作者注记已更新，请先检查最新版本。';
        if (draft.conflict !== conflict) updateDraft(pageId, { ...draft, conflict });
      } else if (remote.renderRevision !== draft.base.renderRevision) {
        updateDraft(pageId, {
          ...draft,
          base: {
            ...draft.base,
            renderRevision: remote.renderRevision,
            assetRevisions: remote.assetRevisions,
            metadata: remote.metadata,
            authorReview: remote.authorReview,
          },
        });
      }
    }
    const staleError =
      !this.pending &&
      ['INVALID_DOCUMENT', 'SERVICE_UNAVAILABLE', 'INVALID_SESSION', 'NETWORK_ERROR'].includes(
        this.state.error?.code ?? '',
      );
    const recovery = snapshot.diagnostics.find(requiresRecovery);
    const externallyRecovered =
      !this.pending && this.state.recoveryRequired && snapshot.writable && !recovery;
    this.publish({
      ...patch,
      snapshot,
      drafts,
      ...(staleError ? { error: null } : {}),
      ...(externallyRecovered ? { recoveryRequired: false, error: null } : {}),
      ...(recovery
        ? {
            recoveryRequired: true,
            error:
              this.state.recoveryRequired &&
              this.state.error?.code === 'RECOVERY_REQUIRED' &&
              recovery.code === 'PENDING_RECOVERY'
                ? this.state.error
                : new PptdClientError(recovery.code, recovery.message),
          }
        : {}),
    });
    if (externallyRecovered)
      for (const pageId of Object.keys(this.state.drafts)) this.schedule(pageId);
  }

  page(pageId: string): PageSnapshot | undefined {
    const draft = this.state.drafts[pageId];
    if (draft) {
      let projected = this.projections.get(draft);
      if (!projected) {
        projected = projectDraft(draft);
        this.projections.set(draft, projected);
      }
      return projected;
    }
    return (
      this.pending?.previews?.get(pageId)?.page ??
      this.state.snapshot?.pages.find((page) => page.pageId === pageId)
    );
  }

  pageIsProjected(pageId: string): boolean {
    const displayed = this.page(pageId);
    const committed = this.state.snapshot?.pages.find((page) => page.pageId === pageId);
    // Drafts and optimistic previews own data copies before a new render revision exists.
    return !!displayed && displayed.data !== committed?.data;
  }

  private ensureDraft(pageId: string): PageDraft | null {
    const existing = this.state.drafts[pageId];
    if (existing) return existing;
    const snapshot = this.state.snapshot;
    const preview = this.pending?.previews?.get(pageId)?.page;
    if (!snapshot || (!snapshot.writable && !preview)) return null;
    const base = preview ?? snapshot.pages.find((page) => page.pageId === pageId);
    if (!base) return null;
    return { base, metadataRevision: snapshot.metadataRevision, fields: {} };
  }

  beginInteraction(pageId: string) {
    const draft = this.ensureDraft(pageId);
    if (!draft) return;
    this.interactions.add(pageId);
    this.clearTimer(pageId);
    this.publish({ drafts: { ...this.state.drafts, [pageId]: draft } });
  }

  async endInteraction(pageId: string) {
    this.interactions.delete(pageId);
    const draft = this.state.drafts[pageId];
    if (!draft) return;
    if (draftHasChanges(draft)) await this.flushPage(pageId);
    else {
      const drafts = { ...this.state.drafts };
      delete drafts[pageId];
      this.publish({ drafts });
    }
  }

  cancelInteraction(
    pageId: string,
    originals: { elementId: string; fields: Record<string, unknown> }[],
  ) {
    this.interactions.delete(pageId);
    const draft = this.state.drafts[pageId];
    if (!draft) return;
    const fields = structuredClone(draft.fields);
    for (const original of originals) {
      const base = draft.base.data.elements.find(
        (element) => element.elementId === original.elementId,
      );
      const values = { ...fields[original.elementId] };
      for (const [key, value] of Object.entries(original.fields)) {
        if (value === undefined || equal(value, fieldValue(base, key))) delete values[key];
        else values[key] = value;
      }
      if (Object.keys(values).length) fields[original.elementId] = values;
      else delete fields[original.elementId];
    }
    const drafts = { ...this.state.drafts };
    const restored = { ...draft, fields };
    if (draftHasChanges(restored)) drafts[pageId] = restored;
    else delete drafts[pageId];
    this.publish({ drafts });
    if (drafts[pageId]) this.schedule(pageId);
  }

  patchElement(pageId: string, elementId: string, set: Record<string, unknown>, autosave = true) {
    const draft = this.ensureDraft(pageId);
    if (!draft) return;
    const next = {
      ...draft,
      fields: {
        ...draft.fields,
        [elementId]: { ...draft.fields[elementId], ...structuredClone(set) },
      },
    };
    this.publish({ drafts: { ...this.state.drafts, [pageId]: next } });
    if (autosave) this.schedule(pageId);
  }

  setNotes(pageId: string, notes: string) {
    const draft = this.ensureDraft(pageId);
    if (!draft) return;
    this.publish({ drafts: { ...this.state.drafts, [pageId]: { ...draft, notes } } });
    this.schedule(pageId);
  }

  setComposing(pageId: string, composing: boolean) {
    if (composing) {
      this.composing.add(pageId);
      this.clearTimer(pageId);
    } else {
      this.composing.delete(pageId);
      this.schedule(pageId);
    }
  }

  private clearTimer(pageId: string) {
    const timer = this.timers.get(pageId);
    if (timer) clearTimeout(timer);
    this.timers.delete(pageId);
  }

  private schedule(pageId: string) {
    this.clearTimer(pageId);
    if (this.state.recoveryRequired || this.composing.has(pageId) || this.interactions.has(pageId))
      return;
    this.timers.set(
      pageId,
      setTimeout(() => void this.flushPage(pageId).catch(() => {}), 700),
    );
  }

  discardDraft(pageId: string) {
    if (
      this.state.saving ||
      this.state.recoveryRequired ||
      this.pending?.pageId === pageId ||
      this.pending?.previews?.has(pageId)
    )
      return;
    this.clearTimer(pageId);
    const drafts = { ...this.state.drafts };
    delete drafts[pageId];
    this.publish({ drafts, error: null });
  }

  async flushPage(pageId: string): Promise<TransactionResult | null> {
    this.clearTimer(pageId);
    if (this.state.recoveryRequired) throw recoveryNeeded();
    if (this.composing.has(pageId) || this.interactions.has(pageId)) return null;
    if (this.state.saving) {
      this.schedule(pageId);
      return null;
    }
    const draft = this.state.drafts[pageId];
    if (!draft || !draftHasChanges(draft)) return null;
    if (draft.conflict) throw new PptdClientError('REVISION_CONFLICT', draft.conflict);
    if (this.pending && this.pending.pageId !== pageId) {
      throw new PptdClientError('PENDING_REQUEST', '请先重试尚未确认的保存。');
    }
    if (!this.pending) {
      const operations: PptdOperation[] = Object.entries(draft.fields).map(([elementId, set]) => ({
        op: 'element.patch',
        pageId,
        elementId,
        set,
      }));
      if (draft.notes !== undefined)
        operations.push({ op: 'page.notes.set', pageId, text: draft.notes });
      const snapshot = this.state.snapshot;
      if (!snapshot) return null;
      const remote = snapshot.pages.find((page) => page.pageId === pageId);
      const componentBound =
        touchesComponent(draft) || (!!remote && touchesComponent({ ...draft, base: remote }));
      this.pending = {
        request: {
          requestId: crypto.randomUUID(),
          deckId: snapshot.deckId,
          actor: `huandeng-ui:${this.clientId}`,
          originClientId: this.clientId,
          expected: {
            pages: { [pageId]: draft.base.pageRevision },
            metadata: componentBound ? draft.metadataRevision : snapshot.metadataRevision,
            manifest: snapshot.manifestRevision,
          },
          operations,
        },
        pageId,
        sent: structuredClone(draft),
      };
    }
    return this.submitPending();
  }

  async flushAll() {
    if (this.state.recoveryRequired) throw recoveryNeeded();
    if (this.state.saving) throw new PptdClientError('SAVE_IN_PROGRESS', '正在保存，请稍候。');
    if (this.pending && !this.pending.pageId)
      throw new PptdClientError('PENDING_REQUEST', '请先重试尚未确认的保存。');
    if (this.composing.size || this.interactions.size) {
      throw new PptdClientError('EDIT_IN_PROGRESS', '请先完成当前输入或拖动。');
    }
    for (const pageId of Object.keys(this.state.drafts)) await this.flushPage(pageId);
  }

  async apply(operations: PptdOperation[], expected?: ExpectedRevisions) {
    await this.flushAll();
    if (this.pending) throw new PptdClientError('PENDING_REQUEST', '请先重试尚未确认的保存。');
    const snapshot = this.state.snapshot;
    if (!snapshot?.writable) throw new PptdClientError('READ_ONLY', '当前项目以只读模式打开。');
    const request: TransactionRequest = {
      requestId: crypto.randomUUID(),
      deckId: snapshot.deckId,
      actor: `huandeng-ui:${this.clientId}`,
      originClientId: this.clientId,
      expected: structuredClone({ ...allExpected(snapshot), ...expected }),
      operations: structuredClone(operations),
    };
    this.pending = {
      request,
      previews: previewElements(snapshot, request.operations),
    };
    return this.submitPending();
  }

  retryPending() {
    if (this.state.recoveryRequired) return Promise.reject(recoveryNeeded());
    if (!this.pending || this.state.saving) return Promise.resolve(null);
    return this.submitPending();
  }

  pendingWork() {
    return structuredClone({
      schemaVersion: 1,
      kind: 'huandeng-pending-work',
      deckId: this.state.snapshot?.deckId,
      entry: this.state.snapshot?.entry,
      pendingRequest: this.pending?.request,
      pendingHistory: this.pending?.history,
      knownReceipt: this.pending?.result,
      drafts: this.state.drafts,
    });
  }

  async recoverPending(): Promise<TransactionResult | null> {
    if (this.state.saving) return null;
    if (this.pending) return this.submitPending(true);
    this.interruptRefresh();
    this.publish({ saving: true, recovering: true, error: null });
    try {
      const snapshot = await this.backend.recoverPending();
      this.acceptSnapshot(snapshot, {
        saving: false,
        recovering: false,
        recoveryRequired: false,
        error: null,
        loading: false,
      });
      for (const pageId of Object.keys(this.state.drafts)) this.schedule(pageId);
      return null;
    } catch (error) {
      const failure = asClientError(error);
      this.publish({
        saving: false,
        recovering: false,
        recoveryRequired: true,
        error: failure,
      });
      throw failure;
    } finally {
      void this.resumeRefresh();
    }
  }

  private async submitPending(recover = false): Promise<TransactionResult> {
    const pending = this.pending;
    if (!pending) throw new PptdClientError('NO_REQUEST', '没有待保存的修改。');
    this.interruptRefresh();
    this.publish({ saving: true, recovering: recover, error: null, canRetry: false });
    let recoveryCompleted = !recover;
    try {
      if (recover) {
        await this.backend.recoverPending();
        recoveryCompleted = true;
      }
      const result =
        pending.result ??
        (pending.history
          ? await this.backend.revert(
              pending.history.kind,
              pending.history.operationId,
              pending.request.requestId,
              this.clientId,
            )
          : await this.backend.commit(pending.request));
      pending.result = result;
      const snapshot = this.newestSnapshot(
        await (this.backend.getCommittedSnapshot?.() ?? this.backend.getSnapshot()),
      );
      const drafts = { ...this.state.drafts };
      if (pending.pageId && pending.sent) {
        const { pageId, sent } = pending;
        const live = drafts[pageId];
        if (live) {
          const fields: PageDraft['fields'] = {};
          for (const [elementId, values] of Object.entries(live.fields)) {
            const remaining = Object.fromEntries(
              Object.entries(values).filter(
                ([key, value]) => !equal(value, sent.fields[elementId]?.[key]),
              ),
            );
            if (Object.keys(remaining).length) fields[elementId] = remaining;
          }
          const remote = snapshot.pages.find((page) => page.pageId === pageId);
          const savedRevision = result.newRevisions.pages[pageId] ?? sent.base.pageRevision;
          const savedBase = { ...projectDraft(sent), pageRevision: savedRevision };
          const remaining: PageDraft = {
            base: remote?.pageRevision === savedRevision ? remote : savedBase,
            metadataRevision: result.newRevisions.metadata,
            fields,
            ...(live.notes !== sent.notes ? { notes: live.notes } : {}),
          };
          if (draftHasChanges(remaining)) drafts[pageId] = remaining;
          else delete drafts[pageId];
        }
      }
      for (const [pageId, preview] of pending.previews ?? []) {
        const live = drafts[pageId];
        if (!live || live.base.pageRevision !== preview.base.pageRevision) continue;
        const remote = snapshot.pages.find((page) => page.pageId === pageId);
        const savedRevision = result.newRevisions.pages[pageId] ?? preview.base.pageRevision;
        const base =
          remote?.pageRevision === savedRevision
            ? remote
            : { ...preview.page, pageRevision: savedRevision };
        const removedTarget = Object.keys(live.fields).some(
          (elementId) => !base.data.elements.some((element) => element.elementId === elementId),
        );
        drafts[pageId] = {
          ...live,
          base,
          metadataRevision: result.newRevisions.metadata,
          conflict: removedTarget ? '修改中的对象已被移除，草稿已保留。' : undefined,
        };
      }
      this.pending = null;
      this.acceptSnapshot(snapshot, {
        drafts,
        saving: false,
        recovering: false,
        recoveryRequired: false,
        canRetry: false,
        error: null,
        undoStack: result.noOp
          ? this.state.undoStack
          : pending.history?.kind === 'undo'
            ? this.state.undoStack.slice(0, -1)
            : [...this.state.undoStack, result.operationId],
        redoStack: result.noOp
          ? this.state.redoStack
          : pending.history?.kind === 'undo'
            ? [...this.state.redoStack, result.operationId]
            : pending.history?.kind === 'redo'
              ? this.state.redoStack.slice(0, -1)
              : [],
        lastSaved: Date.now(),
      });
      for (const pageId of Object.keys(this.state.drafts)) this.schedule(pageId);
      return result;
    } catch (error) {
      const failure = asClientError(error);
      const definitive =
        recoveryCompleted &&
        !pending.result &&
        failure.status >= 400 &&
        failure.status < 500 &&
        !['SAVE_FAILED', 'PENDING_RECOVERY', 'RECOVERY_REQUIRED'].includes(failure.code);
      const drafts = { ...this.state.drafts };
      if (definitive) {
        this.pending = null;
        for (const [pageId, preview] of pending.previews ?? []) {
          const live = drafts[pageId];
          if (!live || live.base.pageRevision !== preview.base.pageRevision) continue;
          const missingTarget = Object.keys(live.fields).some(
            (elementId) =>
              !preview.base.data.elements.some((element) => element.elementId === elementId),
          );
          drafts[pageId] = {
            ...live,
            base: preview.base,
            conflict: missingTarget ? '新增对象未保存，相关草稿已保留。' : undefined,
          };
        }
        if (pending.pageId && drafts[pending.pageId]) {
          drafts[pending.pageId] = { ...drafts[pending.pageId], conflict: failure.message };
        }
      }
      this.publish({
        saving: false,
        recovering: false,
        recoveryRequired: !recoveryCompleted || requiresRecovery(failure),
        drafts,
        error: failure,
        canRetry: !definitive,
      });
      if (definitive) await this.refresh();
      throw failure;
    } finally {
      void this.resumeRefresh();
    }
  }

  async history(kind: 'undo' | 'redo') {
    await this.flushAll();
    if (this.pending) throw new PptdClientError('PENDING_REQUEST', '请先确认尚未完成的保存。');
    const stack = kind === 'undo' ? this.state.undoStack : this.state.redoStack;
    const operationId = stack[stack.length - 1];
    if (!operationId) return;
    const snapshot = this.state.snapshot;
    if (!snapshot) return;
    this.pending = {
      request: {
        requestId: crypto.randomUUID(),
        deckId: snapshot.deckId,
        actor: `huandeng-ui:${this.clientId}`,
        originClientId: this.clientId,
        expected: allExpected(snapshot),
        operations: [],
      },
      history: { kind, operationId },
    };
    return this.submitPending();
  }
}
