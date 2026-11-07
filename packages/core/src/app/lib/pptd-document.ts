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
};

type PendingWrite = {
  request: TransactionRequest;
  pageId?: string;
  sent?: PageDraft;
  history?: { kind: 'undo' | 'redo'; operationId: string };
};

function asClientError(error: unknown): PptdClientError {
  return error instanceof PptdClientError
    ? error
    : new PptdClientError('CLIENT_ERROR', error instanceof Error ? error.message : String(error));
}

function equal(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
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
  const page = structuredClone(draft.base);
  for (const element of page.data.elements) {
    for (const [path, value] of Object.entries(draft.fields[element.elementId] ?? {})) {
      setField(element, path, value);
    }
  }
  if (draft.notes !== undefined) page.data.notes = draft.notes;
  return page;
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
  private refreshNeeded = false;
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
  };

  constructor(readonly backend: PptdTransport) {}

  getState = () => this.state;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private publish(patch: Partial<PptdClientState>) {
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
        if (event.originClientId === this.clientId && this.state.saving) return;
        void this.refresh();
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
    this.stopEvents?.();
    this.stopEvents = null;
    for (const timer of this.timers.values()) clearTimeout(timer);
    this.timers.clear();
  }

  async refresh() {
    if (this.state.saving) {
      this.refreshNeeded = true;
      return;
    }
    const ticket = ++this.refreshTicket;
    try {
      const snapshot = await this.backend.getSnapshot();
      if (ticket !== this.refreshTicket || this.state.saving) return;
      this.acceptSnapshot(snapshot);
      this.publish({ loading: false });
      this.ensureEvents();
    } catch (error) {
      if (ticket === this.refreshTicket) {
        this.publish({ error: asClientError(error), loading: false, connected: false });
      }
    }
  }

  private acceptSnapshot(snapshot: PptdSession) {
    const drafts = { ...this.state.drafts };
    for (const [pageId, draft] of Object.entries(drafts)) {
      const remote = snapshot.pages.find((page) => page.pageId === pageId);
      if (!remote || remote.pageRevision !== draft.base.pageRevision) {
        drafts[pageId] = {
          ...draft,
          conflict: remote
            ? '这一页已有新版本，本地草稿已保留。'
            : '这一页已被移出当前演示，本地草稿已保留。',
        };
      } else if (touchesComponent(draft) && snapshot.metadataRevision !== draft.metadataRevision) {
        drafts[pageId] = { ...draft, conflict: '组件绑定或作者注记已更新，请先检查最新版本。' };
      } else if (remote.renderRevision !== draft.base.renderRevision) {
        drafts[pageId] = {
          ...draft,
          base: { ...draft.base, renderRevision: remote.renderRevision },
        };
      }
    }
    const staleError =
      !this.pending &&
      ['INVALID_DOCUMENT', 'SERVICE_UNAVAILABLE', 'INVALID_SESSION', 'NETWORK_ERROR'].includes(
        this.state.error?.code ?? '',
      );
    this.publish({ snapshot, drafts, ...(staleError ? { error: null } : {}) });
  }

  page(pageId: string): PageSnapshot | undefined {
    const draft = this.state.drafts[pageId];
    return draft
      ? projectDraft(draft)
      : this.state.snapshot?.pages.find((p) => p.pageId === pageId);
  }

  private ensureDraft(pageId: string): PageDraft | null {
    if (!this.state.snapshot?.writable) return null;
    const existing = this.state.drafts[pageId];
    if (existing) return existing;
    const base = this.state.snapshot.pages.find((page) => page.pageId === pageId);
    if (!base) return null;
    return { base, metadataRevision: this.state.snapshot.metadataRevision, fields: {} };
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
        [elementId]: { ...draft.fields[elementId], ...set },
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
    if (this.composing.has(pageId) || this.interactions.has(pageId)) return;
    this.timers.set(
      pageId,
      setTimeout(() => void this.flushPage(pageId).catch(() => {}), 700),
    );
  }

  discardDraft(pageId: string) {
    if (this.state.saving || this.pending?.pageId === pageId) return;
    this.clearTimer(pageId);
    const drafts = { ...this.state.drafts };
    delete drafts[pageId];
    this.publish({ drafts, error: null });
  }

  async flushPage(pageId: string): Promise<TransactionResult | null> {
    this.clearTimer(pageId);
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
      this.pending = {
        request: {
          requestId: crypto.randomUUID(),
          deckId: snapshot.deckId,
          actor: `huandeng-ui:${this.clientId}`,
          originClientId: this.clientId,
          expected: {
            pages: { [pageId]: draft.base.pageRevision },
            metadata: draft.metadataRevision,
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
    if (this.state.saving) throw new PptdClientError('SAVE_IN_PROGRESS', '正在保存，请稍候。');
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
    this.pending = {
      request: {
        requestId: crypto.randomUUID(),
        deckId: snapshot.deckId,
        actor: `huandeng-ui:${this.clientId}`,
        originClientId: this.clientId,
        expected: { ...allExpected(snapshot), ...expected },
        operations,
      },
    };
    return this.submitPending();
  }

  retryPending() {
    if (!this.pending || this.state.saving) return Promise.resolve(null);
    return this.submitPending();
  }

  private async submitPending(): Promise<TransactionResult> {
    const pending = this.pending;
    if (!pending) throw new PptdClientError('NO_REQUEST', '没有待保存的修改。');
    this.refreshTicket++;
    this.publish({ saving: true, error: null, canRetry: false });
    try {
      let result: TransactionResult;
      if (pending.history) {
        result = await this.backend.revert(
          pending.history.kind,
          pending.history.operationId,
          pending.request.requestId,
          this.clientId,
        );
      } else result = await this.backend.commit(pending.request);
      const snapshot = await this.backend.getSnapshot();
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
          const savedBase = projectDraft(sent);
          savedBase.pageRevision = savedRevision;
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
      this.pending = null;
      this.publish({
        drafts,
        saving: false,
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
      this.acceptSnapshot(snapshot);
      for (const pageId of Object.keys(this.state.drafts)) this.schedule(pageId);
      return result;
    } catch (error) {
      const failure = asClientError(error);
      const definitive =
        failure.status >= 400 &&
        failure.status < 500 &&
        !['SAVE_FAILED', 'PENDING_RECOVERY', 'RECOVERY_REQUIRED'].includes(failure.code);
      const drafts = { ...this.state.drafts };
      if (definitive) {
        this.pending = null;
        if (pending.pageId && drafts[pending.pageId]) {
          drafts[pending.pageId] = { ...drafts[pending.pageId], conflict: failure.message };
        }
      }
      this.publish({ saving: false, drafts, error: failure, canRetry: !definitive });
      if (definitive) await this.refresh();
      throw failure;
    } finally {
      if (this.refreshNeeded) {
        this.refreshNeeded = false;
        void this.refresh();
      }
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
