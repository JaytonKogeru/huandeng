import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  DocumentEvent,
  PptdElement,
  PptdOperation,
  Revision,
  TransactionRequest,
  TransactionResult,
} from '../../pptd/types';
import { PptdBackend, PptdClientError, type PptdSession, type PptdTransport } from './pptd-backend';
import { PptdDocumentClient } from './pptd-document';

vi.mock('./pptd-session', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./pptd-session')>()),
  sessionHeaders: async () => ({ 'x-huandeng-token': 'token' }),
  prepareResources: async () => {},
}));

const revision = (value: number): Revision => `sha256:${String(value).padStart(64, '0')}`;

function session(text = '原稿', version = 1): PptdSession {
  const metadata = {
    shortCode: 'K7M2',
    path: 'pages/opening.page',
    state: 'active' as const,
    designIntent: { purpose: '比较原始证据', keep: ['保留原图比例'] },
  };
  return {
    kind: 'pptd',
    deckId: 'deck-1',
    title: 'Test',
    entry: 'deck.pptd',
    size: [960, 540],
    manifest: { pages: [metadata.path], size: [960, 540] },
    manifestRevision: revision(100),
    metadataRevision: revision(200),
    metadata: {
      schemaVersion: 1,
      deckId: 'deck-1',
      entry: 'deck.pptd',
      slides: { 'page-1': metadata },
    },
    pages: [
      {
        pageId: 'page-1',
        shortCode: 'K7M2',
        path: metadata.path,
        state: 'active',
        pageRevision: revision(version),
        renderRevision: revision(version),
        metadata,
        data: {
          notes: '',
          elements: [
            {
              elementId: 'title',
              elementType: 'text',
              bounds: [50, 40, 600, 70],
              content: { text, fontSize: 32 },
            },
          ],
        },
      },
    ],
    writable: true,
    identityPersisted: true,
    epoch: 'epoch-1',
    sequence: version,
    diagnostics: [],
    sessionToken: 'token',
  };
}

function receipt(requestId: string, version = 2, operationId = 'operation-1'): TransactionResult {
  return {
    ok: true,
    requestId,
    operationId,
    newRevisions: {
      pages: { 'page-1': revision(version) },
      manifest: revision(100),
      metadata: revision(200),
    },
    changedPages: ['page-1'],
    changedElements: [{ pageId: 'page-1', elementId: 'title' }],
    createdPages: [],
    skippedOverrides: [],
    diagnostics: [],
    noOp: false,
  };
}

function deferred<T>() {
  let resolve: (value: T) => void = () => {};
  let reject: (error: unknown) => void = () => {};
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

function shape(): PptdElement {
  return {
    elementId: 'shape',
    elementType: 'shape',
    shapeName: 'rect',
    bounds: [100, 120, 200, 140],
  };
}

const clients: PptdDocumentClient[] = [];

async function setup(initial = session(), committedReads = false) {
  let remote = initial;
  const commit = vi.fn<(request: TransactionRequest) => Promise<TransactionResult>>();
  const revert = vi.fn<PptdTransport['revert']>();
  let eventListener: (event: DocumentEvent) => void = () => {};
  let connectionListener: (connected: boolean) => void = () => {};
  const stopEvents = vi.fn();
  const getCommitted = vi.fn(async () => structuredClone(remote));
  const backend: PptdTransport = {
    getSnapshot: vi.fn(async () => structuredClone(remote)),
    ...(committedReads ? { getCommittedSnapshot: getCommitted } : {}),
    recoverPending: vi.fn(async () => structuredClone(remote)),
    commit,
    revert,
    subscribe: vi.fn((listener, onConnection) => {
      eventListener = listener;
      connectionListener = onConnection;
      return stopEvents;
    }),
  };
  const client = new PptdDocumentClient(backend);
  clients.push(client);
  await client.refresh();
  return {
    client,
    backend,
    commit,
    revert,
    stopEvents,
    getCommitted,
    emit: (sequence: number, epoch = 'epoch-1', originClientId?: string) =>
      eventListener({
        type: 'external',
        epoch,
        sequence,
        originClientId,
        changedPages: {},
        manifestChanged: false,
        metadataChanged: false,
        diagnostics: [],
      }),
    connection: (connected: boolean) => connectionListener(connected),
    setRemote: (next: PptdSession) => {
      remote = next;
    },
  };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  for (const client of clients.splice(0)) client.disconnect();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('PPTD browser editing contract', () => {
  it('rebases independent draft fields onto the explicitly reviewed latest page and saves through CAS', async () => {
    const { client, setRemote, commit } = await setup();
    client.patchElement('page-1', 'title', { 'content.text': 'Local draft' }, false);
    const latest = session('原稿', 2);
    latest.pages[0].data.elements[0].content = { text: '原稿', fontSize: 44 };
    setRemote(latest);
    await client.refresh();
    expect(client.conflictDetails('page-1')).toMatchObject({ canRebase: true, conflicts: [] });
    commit.mockImplementation(async (request) => {
      expect(request.expected.pages).toEqual({ 'page-1': revision(2) });
      expect(request.operations).toEqual([
        {
          op: 'element.patch',
          pageId: 'page-1',
          elementId: 'title',
          set: { 'content.text': 'Local draft' },
        },
      ]);
      const saved = session('Local draft', 3);
      saved.pages[0].data.elements[0].content = { text: 'Local draft', fontSize: 44 };
      setRemote(saved);
      return receipt(request.requestId, 3);
    });
    await client.rebaseDraftLatest('page-1', {
      expectedPageRevision: revision(2),
      expectedMetadataRevision: revision(200),
    });
    expect(client.getState().drafts['page-1']).toBeUndefined();
    expect(client.page('page-1')?.data.elements[0].content).toEqual({
      text: 'Local draft',
      fontSize: 44,
    });
  });

  it('requires explicit local choice for overlapping fields and rejects a newer unreviewed version', async () => {
    const { client, setRemote, commit } = await setup();
    client.patchElement('page-1', 'title', { 'content.text': 'Local draft' }, false);
    setRemote(session('Other author', 2));
    await client.refresh();
    expect(client.conflictDetails('page-1')).toMatchObject({
      canRebase: true,
      conflicts: [{ field: 'content.text', reason: 'changed' }],
    });
    const reviewed = { expectedPageRevision: revision(2), expectedMetadataRevision: revision(200) };
    await expect(client.rebaseDraftLatest('page-1', reviewed)).rejects.toMatchObject({
      code: 'REVISION_CONFLICT',
    });
    expect(commit).not.toHaveBeenCalled();
    setRemote(session('Third author', 3));
    await expect(
      client.rebaseDraftLatest('page-1', { ...reviewed, keepConflictingFields: true }),
    ).rejects.toMatchObject({ code: 'REVISION_CONFLICT' });
    expect(commit).not.toHaveBeenCalled();
    commit.mockImplementation(async (request) => {
      expect(request.expected.pages).toEqual({ 'page-1': revision(3) });
      setRemote(session('Local draft', 4));
      return receipt(request.requestId, 4);
    });
    await client.rebaseDraftLatest('page-1', {
      ...reviewed,
      expectedPageRevision: revision(3),
      keepConflictingFields: true,
    });
    expect(client.page('page-1')?.data.elements[0].content?.text).toBe('Local draft');
  });

  it('keeps drafts on deleted objects and changed component bindings even after an explicit local choice', async () => {
    const { client, setRemote, commit } = await setup();
    client.patchElement('page-1', 'title', { 'content.text': 'Local draft' }, false);
    const missing = session('Other author', 2);
    missing.pages[0].data.elements = [];
    setRemote(missing);
    await client.refresh();
    expect(client.conflictDetails('page-1')).toMatchObject({
      canRebase: false,
      conflicts: [{ reason: 'missing' }],
    });
    await expect(
      client.rebaseDraftLatest('page-1', {
        expectedPageRevision: revision(2),
        expectedMetadataRevision: revision(200),
        keepConflictingFields: true,
      }),
    ).rejects.toMatchObject({ code: 'REVISION_CONFLICT' });
    const bound = session('Other author', 3);
    bound.metadataRevision = revision(201);
    bound.pages[0].metadata.components = {
      layout: {
        recipe: 'synthetic',
        recipeVersion: 1,
        params: {},
        slots: { title: 'title' },
        overrides: {},
      },
    };
    setRemote(bound);
    await client.refresh();
    expect(
      client
        .conflictDetails('page-1')
        ?.conflicts.some((conflict) => conflict.reason === 'components'),
    ).toBe(true);
    await expect(
      client.rebaseDraftLatest('page-1', {
        expectedPageRevision: revision(3),
        expectedMetadataRevision: revision(201),
        keepConflictingFields: true,
      }),
    ).rejects.toMatchObject({ code: 'REVISION_CONFLICT' });
    expect(commit).not.toHaveBeenCalled();
    expect(client.page('page-1')?.data.elements[0].content?.text).toBe('Local draft');
  });

  it('keeps a deep recovery copy when adopting the disk version and restores it without overwriting new drafts', async () => {
    const { client, setRemote, commit } = await setup();
    client.patchElement('page-1', 'title', { 'content.text': 'Local draft' }, false);
    const oldDraft = client.getState().drafts['page-1'];
    setRemote(session('Other author', 2));
    await client.refresh();
    client.discardDraft('page-1');
    oldDraft.fields.title['content.text'] = 'Mutated discarded reference';
    expect(client.hasDiscardedDraft('page-1')).toBe(true);
    expect(client.page('page-1')?.data.elements[0].content?.text).toBe('Other author');
    client.restoreDiscardedDraft('page-1');
    expect(client.page('page-1')?.data.elements[0].content?.text).toBe('Local draft');
    expect(client.getState().drafts['page-1'].conflict).toBeTruthy();
    await expect(client.flushPage('page-1')).rejects.toMatchObject({ code: 'REVISION_CONFLICT' });
    expect(commit).not.toHaveBeenCalled();
  });

  it('retains a rebased draft when a second CAS conflict happens during save', async () => {
    const { client, setRemote, commit } = await setup();
    client.patchElement('page-1', 'title', { 'content.text': 'Local draft' }, false);
    const latest = session('原稿', 2);
    setRemote(latest);
    await client.refresh();
    commit.mockImplementation(async () => {
      setRemote(session('Concurrent', 3));
      throw new PptdClientError('REVISION_CONFLICT', 'Changed during save', 409);
    });
    await expect(
      client.rebaseDraftLatest('page-1', {
        expectedPageRevision: revision(2),
        expectedMetadataRevision: revision(200),
      }),
    ).rejects.toMatchObject({ code: 'REVISION_CONFLICT' });
    expect(client.page('page-1')?.data.elements[0].content?.text).toBe('Local draft');
    expect(client.getState().drafts['page-1'].conflict).toBeTruthy();
  });

  it('marks local review artwork projected through a failed save until deliberate discard', async () => {
    const initial = session();
    initial.pages[0].authorReview = {
      status: 'current',
      recordedRenderRevision: revision(1),
      currentRenderRevision: revision(1),
      approvalVerified: false,
    };
    const { client, commit } = await setup(initial);
    expect(client.pageIsProjected('page-1')).toBe(false);
    client.beginInteraction('page-1');
    expect(client.pageIsProjected('page-1')).toBe(false);
    client.cancelInteraction('page-1', []);
    client.patchElement('page-1', 'title', { 'content.text': 'Unsaved artwork' }, false);
    expect(client.pageIsProjected('page-1')).toBe(true);
    commit.mockRejectedValueOnce(new PptdClientError('REVISION_CONFLICT', 'Failed save', 409));
    await expect(client.flushPage('page-1')).rejects.toThrow('Failed save');
    expect(client.getState().drafts['page-1'].conflict).toBeTruthy();
    expect(client.pageIsProjected('page-1')).toBe(true);
    expect(client.page('page-1')?.authorReview).toEqual(initial.pages[0].authorReview);
    client.discardDraft('page-1');
    expect(client.pageIsProjected('page-1')).toBe(false);
    expect(client.page('page-1')?.authorReview?.status).toBe('current');
  });

  it('restores saved stale review evidence only after a local draft is acknowledged', async () => {
    const initial = session();
    initial.pages[0].authorReview = {
      status: 'current',
      recordedRenderRevision: revision(1),
      currentRenderRevision: revision(1),
      approvalVerified: false,
    };
    const { client, commit, setRemote } = await setup(initial);
    client.patchElement('page-1', 'title', { 'content.text': 'Saved artwork' }, false);
    const ack = deferred<TransactionResult>();
    commit.mockReturnValueOnce(ack.promise);
    const saving = client.flushPage('page-1');
    expect(client.pageIsProjected('page-1')).toBe(true);
    const saved = session('Saved artwork', 2);
    saved.pages[0].authorReview = {
      ...initial.pages[0].authorReview,
      status: 'stale',
      currentRenderRevision: revision(2),
    };
    setRemote(saved);
    ack.resolve(receipt(commit.mock.calls[0][0].requestId));
    await saving;
    expect(client.pageIsProjected('page-1')).toBe(false);
    expect(client.page('page-1')?.authorReview?.status).toBe('stale');
  });

  it.each(['element.add', 'element.remove'] as const)(
    'keeps %s review artwork projected during uncertain saving and restores saved evidence after acknowledgement',
    async (op) => {
      const initial = session();
      initial.pages[0].data.elements.push(shape());
      initial.pages[0].authorReview = {
        status: 'current',
        recordedRenderRevision: revision(1),
        currentRenderRevision: revision(1),
        approvalVerified: false,
      };
      const { client, commit, setRemote } = await setup(initial);
      const added = { ...shape(), elementId: 'new-shape' };
      const operations: PptdOperation[] = [
        op === 'element.add'
          ? { op, pageId: 'page-1', element: added }
          : { op, pageId: 'page-1', elementId: 'shape' },
      ];
      const ack = deferred<TransactionResult>();
      commit.mockReturnValueOnce(ack.promise);
      const saving = client.apply(operations);
      await Promise.resolve();
      expect(client.pageIsProjected('page-1')).toBe(true);
      client.beginInteraction('page-1');
      expect(client.pageIsProjected('page-1')).toBe(true);
      client.cancelInteraction('page-1', []);
      ack.reject(new PptdClientError('NETWORK_ERROR', 'Uncertain save'));
      await expect(saving).rejects.toThrow('Uncertain save');
      expect(client.pageIsProjected('page-1')).toBe(true);
      expect(client.page('page-1')?.authorReview).toEqual(initial.pages[0].authorReview);
      const saved = session('原稿', 2);
      saved.pages[0].data.elements = structuredClone(client.page('page-1')?.data.elements ?? []);
      saved.pages[0].authorReview = {
        ...initial.pages[0].authorReview,
        status: 'stale',
        currentRenderRevision: revision(2),
      };
      setRemote(saved);
      commit.mockImplementationOnce(async (request) => receipt(request.requestId));
      await client.retryPending();
      expect(client.pageIsProjected('page-1')).toBe(false);
      expect(client.page('page-1')?.authorReview?.status).toBe('stale');
    },
  );

  it('saves an ordinary draft against accepted unrelated Story metadata while retaining its page revision', async () => {
    const { client, setRemote, commit } = await setup();
    client.patchElement('page-1', 'title', { 'content.text': 'Local draft' }, false);
    const next = session();
    next.sequence = 2;
    next.metadataRevision = revision(201);
    next.metadata.designPolicy = 'Updated Story';
    setRemote(next);
    await client.refresh();
    expect(client.getState().drafts['page-1'].conflict).toBeUndefined();
    commit.mockImplementation(async (request) => {
      expect(request.expected.metadata).toBe(revision(201));
      expect(request.expected.pages).toEqual({ 'page-1': revision(1) });
      return receipt(request.requestId);
    });
    await client.flushPage('page-1');
    expect(client.getState().drafts['page-1']).toBeUndefined();
  });

  it('retains the frozen metadata revision when a plain draft target becomes component-bound remotely', async () => {
    const { client, setRemote, commit } = await setup();
    client.patchElement('page-1', 'title', { bounds: [50, 40, 500, 70] }, false);
    const next = session();
    next.sequence = 2;
    next.metadataRevision = revision(201);
    next.pages[0].metadata.components = {
      layout: {
        recipe: 'synthetic',
        recipeVersion: 1,
        params: {},
        slots: { title: 'title' },
        overrides: {},
      },
    };
    setRemote(next);
    await client.refresh();
    commit.mockImplementation(async (request) => {
      expect(request.expected.metadata).toBe(revision(200));
      throw new PptdClientError('REVISION_CONFLICT', 'New binding');
    });
    await expect(client.flushPage('page-1')).rejects.toThrow('New binding');
    expect(client.page('page-1')?.data.elements[0].bounds).toEqual([50, 40, 500, 70]);
  });

  it('retains unchanged page and project references while accepting page and metadata changes', async () => {
    const initial = session();
    const second = structuredClone(initial.pages[0]);
    second.pageId = 'page-2';
    second.shortCode = second.metadata.shortCode = 'Q9R4';
    second.path = second.metadata.path = 'pages/second.page';
    initial.pages.push(second);
    initial.metadata.slides[second.pageId] = second.metadata;
    initial.manifest.pages.push(second.path);
    const { client, setRemote } = await setup(initial);
    const before = client.getState().snapshot;
    await client.refresh();
    expect(client.getState().snapshot).toBe(before);

    const changed = structuredClone(initial);
    changed.pages[1].data.elements[0].content = { text: '另一页的新内容' };
    changed.pages[1].pageRevision = changed.pages[1].renderRevision = revision(2);
    changed.sequence++;
    setRemote(changed);
    await client.refresh();
    const after = client.getState().snapshot;
    expect(after?.pages[0]).toBe(before?.pages[0]);
    expect(after?.pages[1]).not.toBe(before?.pages[1]);
    expect(after?.manifest).toBe(before?.manifest);
    expect(after?.metadata).toBe(before?.metadata);
    expect(after?.size).toBe(before?.size);

    changed.metadataRevision = revision(201);
    changed.pages[1].metadata.designIntent = { purpose: '新的页面意图' };
    changed.metadata.slides[second.pageId] = changed.pages[1].metadata;
    changed.sequence++;
    await client.refresh();
    const withMetadata = client.getState().snapshot;
    expect(withMetadata?.pages[0]).toBe(before?.pages[0]);
    expect(withMetadata?.pages[1].data).toBe(after?.pages[1].data);
    expect(withMetadata?.pages[1].metadata.designIntent?.purpose).toBe('新的页面意图');
    expect(withMetadata?.metadata).not.toBe(before?.metadata);
  });

  it('reuses a draft projection until its content changes without cloning untouched elements', async () => {
    const initial = session();
    initial.pages[0].data.elements.push(shape());
    const { client } = await setup(initial);
    const committed = client.page('page-1');
    client.patchElement('page-1', 'title', { 'content.text': '工作稿' }, false);
    const projected = client.page('page-1');
    expect(client.page('page-1')).toBe(projected);
    expect(projected?.data.elements[1]).toBe(committed?.data.elements[1]);
    expect(committed?.data.elements[0].content?.text).toBe('原稿');
    client.setNotes('page-1', '讲稿');
    expect(client.page('page-1')).not.toBe(projected);
    expect(client.page('page-1')?.data.elements[0].content?.text).toBe('工作稿');
    expect(client.page('page-1')?.data.notes).toBe('讲稿');
  });

  it('coalesces overlapping refreshes and rereads changes arriving during the first read', async () => {
    const { client, backend, setRemote } = await setup();
    const firstRead = deferred<PptdSession>();
    const getSnapshot = vi.mocked(backend.getSnapshot).mockClear();
    getSnapshot.mockReturnValueOnce(firstRead.promise);
    const first = client.refresh();
    const refreshes = Array.from({ length: 12 }, () => client.refresh());
    expect(refreshes.every((refresh) => refresh === first)).toBe(true);
    expect(getSnapshot).toHaveBeenCalledTimes(1);
    setRemote(session('读取期间发生的修改', 2));
    firstRead.resolve(session());
    await Promise.all(refreshes);
    expect(getSnapshot).toHaveBeenCalledTimes(2);
    expect(client.page('page-1')?.data.elements[0].content?.text).toBe('读取期间发生的修改');
  });

  it('reads contiguous events from committed state and coalesces a burst without disk rescans', async () => {
    const { client, backend, getCommitted, emit, setRemote } = await setup(session(), true);
    await client.connect();
    const getSnapshot = vi.mocked(backend.getSnapshot).mockClear();
    const firstRead = deferred<PptdSession>();
    getCommitted.mockReturnValueOnce(firstRead.promise);
    emit(2);
    emit(3);
    emit(4);
    setRemote(session('连续事件的最终内容', 4));
    firstRead.resolve(session('第一个事件', 2));
    await vi.advanceTimersByTimeAsync(0);
    expect(getSnapshot).not.toHaveBeenCalled();
    expect(getCommitted).toHaveBeenCalledTimes(2);
    expect(client.getState().snapshot?.sequence).toBe(4);
    expect(client.page('page-1')?.data.elements[0].content?.text).toBe('连续事件的最终内容');
    emit(4);
    emit(2);
    await vi.advanceTimersByTimeAsync(5000);
    expect(getCommitted).toHaveBeenCalledTimes(2);
    expect(getSnapshot).not.toHaveBeenCalled();
  });

  it('uses authoritative reads for connection, manual refresh, gaps, and epoch changes', async () => {
    const { client, backend, emit, connection, setRemote } = await setup(session(), true);
    await client.connect();
    expect(backend.getSnapshot).toHaveBeenCalledTimes(2);
    connection(true);
    await vi.advanceTimersByTimeAsync(0);
    connection(false);
    connection(true);
    await vi.advanceTimersByTimeAsync(0);
    await client.refresh();
    setRemote(session('跳过事件后的内容', 4));
    emit(4);
    await vi.advanceTimersByTimeAsync(0);
    setRemote({ ...session('服务重启后的内容'), epoch: 'epoch-2' });
    emit(1, 'epoch-2');
    await vi.advanceTimersByTimeAsync(0);
    expect(backend.getSnapshot).toHaveBeenCalledTimes(7);
    expect(backend.getCommittedSnapshot).not.toHaveBeenCalled();
    expect(client.getState().snapshot).toMatchObject({ epoch: 'epoch-2', sequence: 1 });
    emit(5, 'epoch-1');
    emit(1, 'epoch-2');
    await vi.advanceTimersByTimeAsync(0);
    expect(backend.getSnapshot).toHaveBeenCalledTimes(7);
  });

  it('ignores outdated events from the accepted epoch while a new epoch is being read', async () => {
    const { client, backend, emit } = await setup(session(), true);
    await client.connect();
    const nextEpoch = deferred<PptdSession>();
    const getSnapshot = vi.mocked(backend.getSnapshot).mockClear();
    getSnapshot.mockReturnValueOnce(nextEpoch.promise);
    emit(1, 'epoch-2');
    emit(1, 'epoch-1');
    nextEpoch.resolve({ ...session(), epoch: 'epoch-2' });
    await vi.advanceTimersByTimeAsync(0);
    expect(getSnapshot).toHaveBeenCalledTimes(1);
    expect(client.getState().snapshot?.epoch).toBe('epoch-2');
  });

  it('falls back to authoritative reads for events on older transports', async () => {
    const { client, backend, emit, setRemote } = await setup();
    await client.connect();
    vi.mocked(backend.getSnapshot).mockClear();
    setRemote(session('兼容旧传输', 2));
    emit(2);
    await vi.advanceTimersByTimeAsync(0);
    expect(backend.getSnapshot).toHaveBeenCalledTimes(1);
    expect(client.getState().snapshot?.sequence).toBe(2);
  });

  it.each(['manual', 'gap', 'epoch', 'reconnect'] as const)(
    'retains %s escalation while a committed read is in flight',
    async (reason) => {
      const { client, backend, getCommitted, emit, connection, setRemote } = await setup(
        session(),
        true,
      );
      await client.connect();
      connection(true);
      await vi.advanceTimersByTimeAsync(0);
      const getSnapshot = vi.mocked(backend.getSnapshot).mockClear();
      const firstRead = deferred<PptdSession>();
      getCommitted.mockReturnValueOnce(firstRead.promise);
      emit(2);
      if (reason === 'manual') void client.refresh();
      if (reason === 'gap') emit(4);
      if (reason === 'epoch') emit(1, 'epoch-2');
      if (reason === 'reconnect') {
        connection(false);
        connection(true);
      }
      const epoch = reason === 'epoch' ? 'epoch-2' : 'epoch-1';
      const sequence = reason === 'epoch' ? 2 : reason === 'gap' ? 5 : 3;
      emit(sequence, epoch);
      setRemote({ ...session('完整读取捕获的修改', sequence + 1), epoch, sequence });
      firstRead.resolve(session('较早的缓存', 2));
      await vi.advanceTimersByTimeAsync(0);
      expect(getSnapshot).toHaveBeenCalledTimes(1);
      expect(getCommitted).toHaveBeenCalledTimes(1);
      expect(client.getState().snapshot).toMatchObject({ epoch, sequence });
      expect(client.page('page-1')?.data.elements[0].content?.text).toBe('完整读取捕获的修改');
    },
  );

  it.each([false, true])(
    'preserves queued refresh strength during a save (authoritative: %s)',
    async (authoritative) => {
      const { client, backend, getCommitted, commit, emit, setRemote } = await setup(
        session(),
        true,
      );
      await client.connect();
      const getSnapshot = vi.mocked(backend.getSnapshot).mockClear();
      const ack = deferred<TransactionResult>();
      commit.mockReturnValueOnce(ack.promise);
      client.patchElement('page-1', 'title', { 'content.text': '已提交的输入' }, false);
      const saving = client.flushPage('page-1');
      emit(2);
      if (authoritative) void client.refresh();
      emit(3);
      setRemote(session('最终远端内容', 3));
      ack.resolve(receipt(commit.mock.calls[0][0].requestId));
      await saving;
      await vi.advanceTimersByTimeAsync(0);
      expect(getSnapshot).toHaveBeenCalledTimes(authoritative ? 1 : 0);
      expect(getCommitted).toHaveBeenCalledTimes(authoritative ? 1 : 2);
      expect(client.getState().snapshot?.sequence).toBe(3);
      expect(client.getState()).toMatchObject({ saving: false, drafts: {}, canRetry: false });
      expect(client.getState().undoStack).toEqual(['operation-1']);
    },
  );

  it('escalates an own-origin gap during a save instead of dropping it with the save event', async () => {
    const { client, backend, commit, emit, setRemote } = await setup(session(), true);
    await client.connect();
    const getSnapshot = vi.mocked(backend.getSnapshot).mockClear();
    const ack = deferred<TransactionResult>();
    commit.mockReturnValueOnce(ack.promise);
    client.patchElement('page-1', 'title', { 'content.text': '已提交的输入' }, false);
    const saving = client.flushPage('page-1');
    emit(4, 'epoch-1', client.clientId);
    setRemote(session('断档后重读的内容', 4));
    ack.resolve(receipt(commit.mock.calls[0][0].requestId));
    await saving;
    await vi.advanceTimersByTimeAsync(0);
    expect(getSnapshot).toHaveBeenCalledTimes(1);
    expect(client.getState().snapshot?.sequence).toBe(4);
  });

  it('retains escalation across a committed read interrupted by a save', async () => {
    const { client, backend, getCommitted, commit, emit, setRemote } = await setup(session(), true);
    await client.connect();
    const getSnapshot = vi.mocked(backend.getSnapshot).mockClear();
    const firstRead = deferred<PptdSession>();
    getCommitted.mockReturnValueOnce(firstRead.promise);
    emit(2);
    const refreshing = client.refresh();
    const ack = deferred<TransactionResult>();
    commit.mockReturnValueOnce(ack.promise);
    client.patchElement('page-1', 'title', { 'content.text': '已提交的输入' }, false);
    const saving = client.flushPage('page-1');
    emit(3);
    setRemote(session('已保存的新稿', 3));
    ack.resolve(receipt(commit.mock.calls[0][0].requestId));
    await saving;
    firstRead.resolve(session('早先的缓存', 2));
    await refreshing;
    expect(getSnapshot).toHaveBeenCalledTimes(1);
    expect(client.getState().snapshot?.sequence).toBe(3);
    expect(client.getState().drafts).toEqual({});
  });

  it('preserves authoritative refreshes queued during explicit recovery', async () => {
    const { client, backend, emit, setRemote } = await setup(session(), true);
    await client.connect();
    const getSnapshot = vi.mocked(backend.getSnapshot).mockClear();
    const recovery = deferred<PptdSession>();
    vi.mocked(backend.recoverPending).mockReturnValueOnce(recovery.promise);
    client.patchElement('page-1', 'title', { 'content.text': '恢复时的本地输入' }, false);
    const recovering = client.recoverPending();
    void client.refresh();
    emit(2);
    setRemote({ ...session(), sequence: 3 });
    recovery.resolve({ ...session(), sequence: 2 });
    await recovering;
    await vi.advanceTimersByTimeAsync(0);
    expect(getSnapshot).toHaveBeenCalledTimes(1);
    expect(backend.getCommittedSnapshot).not.toHaveBeenCalled();
    expect(client.getState().snapshot?.sequence).toBe(3);
    expect(client.getState()).toMatchObject({ saving: false, recovering: false });
    expect(client.page('page-1')?.data.elements[0].content?.text).toBe('恢复时的本地输入');
    expect(client.getState().drafts['page-1'].conflict).toBeUndefined();
  });

  it('preserves dirty drafts and marks real revision conflicts after a contiguous event', async () => {
    const { client, backend, emit, setRemote } = await setup(session(), true);
    await client.connect();
    vi.mocked(backend.getSnapshot).mockClear();
    client.patchElement('page-1', 'title', { 'content.text': '本地工作稿' }, false);
    setRemote(session('其他作者的修改', 2));
    emit(2);
    await vi.advanceTimersByTimeAsync(0);
    expect(backend.getSnapshot).not.toHaveBeenCalled();
    expect(client.getState().snapshot?.pages[0].data.elements[0].content?.text).toBe(
      '其他作者的修改',
    );
    expect(client.page('page-1')?.data.elements[0].content?.text).toBe('本地工作稿');
    expect(client.getState().drafts['page-1'].conflict).toBeTruthy();
    await expect(client.flushAll()).rejects.toMatchObject({ code: 'REVISION_CONFLICT' });
  });

  it('ignores a stale authoritative same-epoch reply without conflicting a draft', async () => {
    const { client, backend } = await setup(session('最新基稿', 5));
    client.patchElement('page-1', 'title', { 'content.text': '保留本地输入' }, false);
    const before = client.getState().snapshot;
    vi.mocked(backend.getSnapshot).mockResolvedValueOnce(session('旧稿', 2));
    await client.refresh();
    expect(client.getState().snapshot).toBe(before);
    expect(client.getState().drafts['page-1'].conflict).toBeUndefined();
    expect(client.page('page-1')?.data.elements[0].content?.text).toBe('保留本地输入');
  });

  it('retains an authoritative read interrupted by a save and ignores its stale result', async () => {
    const { client, backend, commit, emit, setRemote } = await setup(session(), true);
    await client.connect();
    const firstRead = deferred<PptdSession>();
    const getSnapshot = vi.mocked(backend.getSnapshot).mockClear();
    getSnapshot.mockReturnValueOnce(firstRead.promise);
    const refreshing = client.refresh();
    client.patchElement('page-1', 'title', { 'content.text': '已保存的新稿' }, false);
    commit.mockImplementationOnce(async (request) => {
      setRemote(session('已保存的新稿', 2));
      return receipt(request.requestId);
    });
    await client.flushPage('page-1');
    emit(3);
    setRemote(session('完整重读发现的新稿', 3));
    firstRead.resolve(session());
    await refreshing;
    expect(getSnapshot).toHaveBeenCalledTimes(2);
    expect(client.getState().snapshot?.sequence).toBe(3);
    expect(client.getState().drafts).toEqual({});
    expect(client.getState().undoStack).toEqual(['operation-1']);
  });

  it('does not regress accepted snapshots or dirty drafts on stale same-epoch or retired-epoch replies', async () => {
    const { client, backend, getCommitted, emit, setRemote } = await setup(session(), true);
    await client.connect();
    setRemote(session('最新基稿', 5));
    await client.refresh();
    client.patchElement('page-1', 'title', { 'content.text': '保留本地输入' }, false);
    const before = client.getState().snapshot;
    getCommitted.mockResolvedValueOnce(session('过期内容', 3));
    emit(6);
    await vi.advanceTimersByTimeAsync(0);
    expect(client.getState().snapshot).toBe(before);
    expect(client.getState().drafts['page-1'].conflict).toBeUndefined();
    expect(client.page('page-1')?.data.elements[0].content?.text).toBe('保留本地输入');
    setRemote({ ...session('最新基稿', 5), epoch: 'epoch-2', sequence: 1 });
    emit(1, 'epoch-2');
    await vi.advanceTimersByTimeAsync(0);
    vi.mocked(backend.getSnapshot).mockResolvedValueOnce(session('旧服务的迟到响应', 20));
    await client.refresh();
    expect(client.getState().snapshot).toMatchObject({ epoch: 'epoch-2', sequence: 1 });
    expect(client.getState().drafts['page-1'].conflict).toBeUndefined();
  });

  it('validates an unexpected epoch in a committed reply with an authoritative read', async () => {
    const { client, backend, getCommitted, emit, setRemote } = await setup(session(), true);
    await client.connect();
    vi.mocked(backend.getSnapshot).mockClear();
    getCommitted.mockResolvedValueOnce({
      ...session('未经完整读取的内容', 2),
      epoch: 'epoch-2',
      sequence: 1,
    });
    setRemote({ ...session('完整读取的新服务', 2), epoch: 'epoch-2', sequence: 1 });
    emit(2);
    await vi.advanceTimersByTimeAsync(0);
    expect(backend.getSnapshot).toHaveBeenCalledTimes(1);
    expect(client.page('page-1')?.data.elements[0].content?.text).toBe('完整读取的新服务');
    expect(client.getState().snapshot?.epoch).toBe('epoch-2');
  });

  it('drops in-flight and queued refreshes on disconnect without polling or resubscribing', async () => {
    const { client, backend, getCommitted, emit, stopEvents } = await setup(session(), true);
    await client.connect();
    const getSnapshot = vi.mocked(backend.getSnapshot).mockClear();
    const firstRead = deferred<PptdSession>();
    getCommitted.mockReturnValueOnce(firstRead.promise);
    const listener = vi.fn();
    client.subscribe(listener);
    const before = client.getState().snapshot;
    emit(2);
    const refreshing = client.refresh();
    client.disconnect();
    firstRead.resolve(session('断开后返回的内容', 2));
    await refreshing;
    await vi.advanceTimersByTimeAsync(5000);
    expect(client.getState().snapshot).toBe(before);
    expect(listener).not.toHaveBeenCalled();
    expect(stopEvents).toHaveBeenCalledTimes(1);
    expect(backend.subscribe).toHaveBeenCalledTimes(1);
    expect(getSnapshot).not.toHaveBeenCalled();
  });

  it('does not replace an acknowledged save with an older in-flight refresh', async () => {
    const { client, backend, commit, setRemote } = await setup();
    const oldRead = deferred<PptdSession>();
    vi.mocked(backend.getSnapshot).mockReturnValueOnce(oldRead.promise);
    const refreshing = client.refresh();
    client.patchElement('page-1', 'title', { 'content.text': '已保存的新稿' }, false);
    commit.mockImplementationOnce(async (request) => {
      setRemote(session('已保存的新稿', 2));
      return receipt(request.requestId);
    });
    await client.flushPage('page-1');
    oldRead.resolve(session());
    await refreshing;
    expect(client.page('page-1')?.data.elements[0].content?.text).toBe('已保存的新稿');
    expect(client.getState().drafts).toEqual({});
  });

  it('shows a deletion before acknowledgment while keeping the committed snapshot and history intact', async () => {
    const { client, commit, setRemote } = await setup();
    const ack = deferred<TransactionResult>();
    commit.mockReturnValueOnce(ack.promise);
    const saving = client.apply([{ op: 'element.remove', pageId: 'page-1', elementId: 'title' }]);
    await Promise.resolve();
    expect(client.page('page-1')?.data.elements).toHaveLength(0);
    expect(client.getState().snapshot?.pages[0].data.elements).toHaveLength(1);
    expect(client.getState().saving).toBe(true);
    expect(client.getState().lastSaved).toBeNull();
    expect(client.getState().undoStack).toEqual([]);
    const saved = session('', 2);
    saved.pages[0].data.elements = [];
    setRemote(saved);
    ack.resolve(receipt(commit.mock.calls[0][0].requestId));
    await saving;
    expect(client.getState().snapshot?.pages[0].data.elements).toHaveLength(0);
    expect(client.getState().undoStack).toEqual(['operation-1']);
    expect(client.getState().saving).toBe(false);
  });

  it('previews animated object deletion without orphan tracks and restores both after rejection', async () => {
    const initial = session();
    initial.pages[0].data.timeline = {
      schemaVersion: 1,
      durationMs: 1000,
      tracks: [
        {
          id: 'move',
          targetId: 'title',
          property: 'x',
          keyframes: [{ id: 'start', timeMs: 0, value: 50, easing: 'linear' }],
        },
      ],
    };
    const { client, commit } = await setup(initial);
    const ack = deferred<TransactionResult>();
    commit.mockReturnValueOnce(ack.promise);
    const saving = client.apply([{ op: 'element.remove', pageId: 'page-1', elementId: 'title' }]);
    await Promise.resolve();
    expect(client.page('page-1')?.data.timeline).toMatchObject({ tracks: [] });
    expect(client.getState().snapshot?.pages[0].data.timeline).toEqual(
      initial.pages[0].data.timeline,
    );
    ack.reject(new PptdClientError('REVISION_CONFLICT', 'Page changed.', 409));
    await expect(saving).rejects.toMatchObject({ code: 'REVISION_CONFLICT' });
    expect(client.page('page-1')?.data.elements).toHaveLength(1);
    expect(client.page('page-1')?.data.timeline).toEqual(initial.pages[0].data.timeline);
  });

  it('rolls back a rejected addition and accepts the actual remote page', async () => {
    const { client, commit, setRemote } = await setup();
    const ack = deferred<TransactionResult>();
    commit.mockReturnValueOnce(ack.promise);
    const saving = client.apply([
      { op: 'element.add', pageId: 'page-1', element: shape(), afterElementId: null },
    ]);
    await Promise.resolve();
    expect(client.page('page-1')?.data.elements.map((element) => element.elementId)).toEqual([
      'shape',
      'title',
    ]);
    setRemote(session('外部的新稿', 2));
    ack.reject(new PptdClientError('REVISION_CONFLICT', 'Page changed.', 409));
    await expect(saving).rejects.toMatchObject({ code: 'REVISION_CONFLICT' });
    expect(client.page('page-1')?.data.elements).toHaveLength(1);
    expect(client.page('page-1')?.data.elements[0].content?.text).toBe('外部的新稿');
    expect(client.getState().canRetry).toBe(false);
    expect(client.getState().undoStack).toEqual([]);
  });

  it('retains an uncertain addition and retries its original request without duplicating the object', async () => {
    const { client, commit, setRemote } = await setup();
    const element = shape();
    const operations: PptdOperation[] = [{ op: 'element.add', pageId: 'page-1', element }];
    commit.mockImplementationOnce(async () => {
      const saved = session('原稿', 2);
      saved.pages[0].data.elements.push(shape());
      setRemote(saved);
      throw new PptdClientError('NETWORK_ERROR', 'Lost response after commit.');
    });
    await expect(client.apply(operations)).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
    const original = structuredClone(commit.mock.calls[0][0]);
    element.bounds = [0, 0, 1, 1];
    expect(client.getState().canRetry).toBe(true);
    expect(client.getState().lastSaved).toBeNull();
    expect(client.page('page-1')?.data.elements).toHaveLength(2);
    await expect(client.flushAll()).rejects.toMatchObject({ code: 'PENDING_REQUEST' });
    await client.refresh();
    expect(client.page('page-1')?.data.elements).toHaveLength(2);
    commit.mockResolvedValueOnce(receipt(original.requestId));
    await client.retryPending();
    expect(commit.mock.calls[1][0]).toEqual(original);
    expect(client.getState().snapshot?.pages[0].data.elements).toHaveLength(2);
    expect(client.getState().undoStack).toEqual(['operation-1']);
    expect(client.getState().canRetry).toBe(false);
  });

  it('retains an acknowledged commit when the following snapshot read fails and retries only that read', async () => {
    const { client, backend, commit, setRemote } = await setup();
    commit.mockImplementationOnce(async (request) => {
      const saved = session('原稿', 2);
      saved.pages[0].data.elements.push(shape());
      setRemote(saved);
      return receipt(request.requestId);
    });
    vi.mocked(backend.getSnapshot).mockRejectedValueOnce(
      new PptdClientError('SERVICE_UNAVAILABLE', 'Snapshot endpoint unavailable.', 404),
    );
    await expect(
      client.apply([{ op: 'element.add', pageId: 'page-1', element: shape() }]),
    ).rejects.toMatchObject({ code: 'SERVICE_UNAVAILABLE' });
    expect(client.getState().canRetry).toBe(true);
    expect(client.getState().undoStack).toEqual([]);
    expect(client.page('page-1')?.data.elements).toHaveLength(2);
    await client.retryPending();
    expect(commit).toHaveBeenCalledTimes(1);
    expect(client.getState().undoStack).toEqual(['operation-1']);
    expect(client.getState().canRetry).toBe(false);
  });

  it('keeps typing started during an insertion on the acknowledged revision', async () => {
    const { client, commit, setRemote } = await setup();
    const ack = deferred<TransactionResult>();
    commit.mockReturnValueOnce(ack.promise);
    const saving = client.apply([{ op: 'element.add', pageId: 'page-1', element: shape() }]);
    await Promise.resolve();
    client.patchElement('page-1', 'title', { 'content.text': '继续输入' }, false);
    const saved = session('原稿', 2);
    saved.pages[0].data.elements.push(shape());
    setRemote(saved);
    ack.resolve(receipt(commit.mock.calls[0][0].requestId));
    await saving;
    expect(client.page('page-1')?.data.elements).toHaveLength(2);
    expect(client.page('page-1')?.data.elements[0].content?.text).toBe('继续输入');
    expect(client.getState().drafts['page-1'].base.pageRevision).toBe(revision(2));
    expect(client.getState().drafts['page-1'].conflict).toBeUndefined();
    commit.mockImplementationOnce(async (request) => {
      const next = structuredClone(saved);
      next.pages[0].data.elements[0].content = { text: '继续输入' };
      next.pages[0].pageRevision = next.pages[0].renderRevision = revision(3);
      setRemote(next);
      return receipt(request.requestId, 3, 'operation-2');
    });
    await client.flushPage('page-1');
    expect(commit.mock.calls[1][0].expected.pages?.['page-1']).toBe(revision(2));
    expect(client.getState().drafts).toEqual({});
  });

  it('restores a rejected deletion while keeping typing entered during the request', async () => {
    const initial = session();
    initial.pages[0].data.elements.push(shape());
    const { client, commit } = await setup(initial);
    const ack = deferred<TransactionResult>();
    commit.mockReturnValueOnce(ack.promise);
    const saving = client.apply([{ op: 'element.remove', pageId: 'page-1', elementId: 'shape' }]);
    await Promise.resolve();
    client.patchElement('page-1', 'title', { 'content.text': '继续输入' }, false);
    ack.reject(
      new PptdClientError('INVALID_REQUEST', 'Cannot remove this referenced object.', 400),
    );
    await expect(saving).rejects.toMatchObject({ code: 'INVALID_REQUEST' });
    expect(client.page('page-1')?.data.elements).toHaveLength(2);
    expect(client.page('page-1')?.data.elements[0].content?.text).toBe('继续输入');
    expect(client.getState().drafts['page-1'].base.pageRevision).toBe(revision(1));
    expect(client.getState().drafts['page-1'].conflict).toBeUndefined();
  });

  it('keeps a post-insertion draft conflicted when another writer changes the acknowledged page', async () => {
    const { client, commit, setRemote } = await setup();
    const ack = deferred<TransactionResult>();
    commit.mockReturnValueOnce(ack.promise);
    const saving = client.apply([{ op: 'element.add', pageId: 'page-1', element: shape() }]);
    await Promise.resolve();
    client.patchElement('page-1', 'title', { 'content.text': '尚未发送的新文字' }, false);
    const remote = session('另一位作者的新文字', 3);
    remote.pages[0].data.elements.push(shape());
    setRemote(remote);
    ack.resolve(receipt(commit.mock.calls[0][0].requestId, 2));
    await saving;
    expect(client.page('page-1')?.data.elements[0].content?.text).toBe('尚未发送的新文字');
    expect(client.getState().snapshot?.pages[0].data.elements[0].content?.text).toBe(
      '另一位作者的新文字',
    );
    expect(client.getState().drafts['page-1'].base.pageRevision).toBe(revision(2));
    expect(client.getState().drafts['page-1'].conflict).toBeTruthy();
    await expect(client.flushPage('page-1')).rejects.toMatchObject({ code: 'REVISION_CONFLICT' });
    expect(commit).toHaveBeenCalledTimes(1);
  });

  it('reports the CLI entry point when Vite returns HTML without a PPTD session', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('<html>OpenSlide</html>', { status: 200 })),
    );
    await expect(new PptdBackend().getSnapshot()).rejects.toMatchObject({
      code: 'SERVICE_UNAVAILABLE',
    });
  });

  it('refreshes media previews without conflicting or replacing a dirty text draft', async () => {
    const { client, setRemote } = await setup();
    client.patchElement('page-1', 'title', { 'content.text': '尚未保存的图注' }, false);
    const next = session();
    next.pages[0].renderRevision = revision(999);
    next.sequence = 2;
    setRemote(next);
    await client.refresh();
    expect(client.page('page-1')?.renderRevision).toBe(revision(999));
    expect(client.page('page-1')?.data.elements[0].content?.text).toBe('尚未保存的图注');
    expect(client.getState().drafts['page-1'].conflict).toBeUndefined();
    expect(client.getState().drafts['page-1'].base.pageRevision).toBe(revision(1));
  });

  it('cancels a pointer gesture without saving geometry or creating an implicit rotation', async () => {
    const { client, commit } = await setup();
    client.beginInteraction('page-1');
    client.patchElement('page-1', 'title', { bounds: [80, 60, 600, 70] }, false);
    client.cancelInteraction('page-1', [
      { elementId: 'title', fields: { bounds: [50, 40, 600, 70] } },
    ]);
    expect(client.getState().drafts).toEqual({});
    expect(client.page('page-1')?.data.elements[0].bounds).toEqual([50, 40, 600, 70]);
    expect(client.page('page-1')?.data.elements[0]).not.toHaveProperty('rotation');
    await vi.advanceTimersByTimeAsync(1400);
    expect(commit).not.toHaveBeenCalled();
  });
  it('retains text typed after a request was sent, including a return to the original text', async () => {
    const { client, commit, setRemote } = await setup();
    const ack = deferred<TransactionResult>();
    commit.mockReturnValueOnce(ack.promise);
    client.patchElement('page-1', 'title', { 'content.text': '第一批修改' }, false);
    const save = client.flushPage('page-1');
    client.patchElement('page-1', 'title', { 'content.text': '原稿' }, false);
    setRemote(session('第一批修改', 2));
    ack.resolve(receipt(commit.mock.calls[0][0].requestId));
    await save;
    expect(client.page('page-1')?.data.elements[0].content?.text).toBe('原稿');
    expect(client.getState().drafts['page-1'].base.pageRevision).toBe(revision(2));
    commit.mockImplementationOnce(async (request) => {
      setRemote(session('原稿', 3));
      return receipt(request.requestId, 3, 'operation-2');
    });
    await client.flushPage('page-1');
    expect(commit.mock.calls[1][0].expected.pages?.['page-1']).toBe(revision(2));
    expect(client.getState().drafts).toEqual({});
  });

  it('does not rebase unsent typing onto another writer that commits between acknowledgment and reread', async () => {
    const { client, commit, setRemote } = await setup();
    const ack = deferred<TransactionResult>();
    commit.mockReturnValueOnce(ack.promise);
    client.patchElement('page-1', 'title', { 'content.text': '已发出' }, false);
    const save = client.flushPage('page-1');
    client.patchElement('page-1', 'title', { 'content.text': '仍在输入' }, false);
    setRemote(session('另一位作者的修改', 3));
    ack.resolve(receipt(commit.mock.calls[0][0].requestId, 2));
    await save;
    expect(client.page('page-1')?.data.elements[0].content?.text).toBe('仍在输入');
    expect(client.getState().snapshot?.pages[0].data.elements[0].content?.text).toBe(
      '另一位作者的修改',
    );
    expect(client.getState().drafts['page-1'].conflict).toBeTruthy();
    await expect(client.flushPage('page-1')).rejects.toMatchObject({ code: 'REVISION_CONFLICT' });
    expect(commit).toHaveBeenCalledTimes(1);
  });

  it('keeps dirty-page content after a remote update and requires deliberate draft discard', async () => {
    const { client, commit, setRemote } = await setup();
    client.patchElement('page-1', 'title', { 'content.text': '本地未提交' }, false);
    setRemote(session('Agent 修改', 2));
    await client.refresh();
    expect(client.page('page-1')?.data.elements[0].content?.text).toBe('本地未提交');
    expect(client.getState().drafts['page-1'].base.pageRevision).toBe(revision(1));
    await expect(client.flushPage('page-1')).rejects.toMatchObject({ code: 'REVISION_CONFLICT' });
    expect(commit).not.toHaveBeenCalled();
    client.discardDraft('page-1');
    expect(client.page('page-1')?.data.elements[0].content?.text).toBe('Agent 修改');
  });

  it('does not conflict a draft when only a different page changed', async () => {
    const { client, setRemote } = await setup();
    client.patchElement('page-1', 'title', { 'content.text': '本地未提交' }, false);
    const next = session();
    next.sequence = 2;
    next.pages.push({
      ...structuredClone(next.pages[0]),
      pageId: 'page-2',
      shortCode: 'Q9R4',
      path: 'pages/second.page',
      pageRevision: revision(9),
    });
    setRemote(next);
    await client.refresh();
    expect(client.getState().drafts['page-1'].conflict).toBeUndefined();
    expect(client.getState().snapshot?.pages).toHaveLength(2);
  });

  it('holds an IME composition through timer expiry and explicit flush', async () => {
    const { client, commit, setRemote } = await setup();
    commit.mockImplementation(async (request) => {
      setRemote(session('中文输入完成', 2));
      return receipt(request.requestId);
    });
    client.setComposing('page-1', true);
    client.patchElement('page-1', 'title', { 'content.text': 'zhongw' });
    await vi.advanceTimersByTimeAsync(1400);
    expect(commit).not.toHaveBeenCalled();
    await expect(client.flushAll()).rejects.toMatchObject({ code: 'EDIT_IN_PROGRESS' });
    client.patchElement('page-1', 'title', { 'content.text': '中文输入完成' });
    client.setComposing('page-1', false);
    await vi.advanceTimersByTimeAsync(699);
    expect(commit).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(commit).toHaveBeenCalledTimes(1);
    expect(commit.mock.calls[0][0].operations).toEqual([
      {
        op: 'element.patch',
        pageId: 'page-1',
        elementId: 'title',
        set: { 'content.text': '中文输入完成' },
      },
    ]);
  });

  it('keeps the shared notes draft through composing and projection reads before one save', async () => {
    const { client, commit, setRemote } = await setup();
    const notes = '完成的演讲备注\n'.repeat(200);
    commit.mockImplementation(async (request) => {
      const saved = session('原稿', 2);
      saved.pages[0].data.notes = notes;
      setRemote(saved);
      return receipt(request.requestId);
    });
    client.setComposing('page-1', true);
    client.setNotes('page-1', 'zhongwen');
    await vi.advanceTimersByTimeAsync(1400);
    expect(commit).not.toHaveBeenCalled();
    await expect(client.flushAll()).rejects.toMatchObject({ code: 'EDIT_IN_PROGRESS' });
    client.setNotes('page-1', notes);
    expect(client.page('page-1')?.data.notes).toBe(notes);
    expect(client.page('page-1')?.data.notes).toBe(notes);
    client.setComposing('page-1', false);
    await vi.advanceTimersByTimeAsync(700);
    expect(commit).toHaveBeenCalledTimes(1);
    expect(commit.mock.calls[0][0].operations).toEqual([
      { op: 'page.notes.set', pageId: 'page-1', text: notes },
    ]);
    expect(client.page('page-1')?.data.notes).toBe(notes);
  });

  it('anchors a pointer gesture before movement so a remote update cannot silently change its base', async () => {
    const { client, commit, setRemote } = await setup();
    client.beginInteraction('page-1');
    setRemote(session('远端新版本', 2));
    await client.refresh();
    client.patchElement('page-1', 'title', { bounds: [65, 40, 600, 70] }, false);
    await expect(client.endInteraction('page-1')).rejects.toMatchObject({
      code: 'REVISION_CONFLICT',
    });
    expect(commit).not.toHaveBeenCalled();
  });

  it('retries an uncertain save with exactly the original request id and payload', async () => {
    const { client, commit, setRemote } = await setup();
    commit.mockImplementationOnce(async () => {
      setRemote(session('服务器已保存', 2));
      throw new PptdClientError('NETWORK_ERROR', 'Response connection lost.');
    });
    client.patchElement('page-1', 'title', { 'content.text': '服务器已保存' }, false);
    await expect(client.flushPage('page-1')).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
    expect(client.getState().canRetry).toBe(true);
    const original = structuredClone(commit.mock.calls[0][0]);
    await client.refresh();
    commit.mockResolvedValueOnce(receipt(original.requestId));
    await client.retryPending();
    expect(commit.mock.calls[1][0]).toEqual(original);
    expect(client.getState().drafts).toEqual({});
    expect(client.getState().undoStack).toEqual(['operation-1']);
  });

  it('keeps a durable recovery request retryable even when the service returns a 400 status', async () => {
    const { client, commit } = await setup();
    commit.mockRejectedValueOnce(
      new PptdClientError('PENDING_RECOVERY', 'Journal recovery required.', 400),
    );
    client.patchElement('page-1', 'title', { 'content.text': '待恢复' }, false);
    await expect(client.flushPage('page-1')).rejects.toMatchObject({ code: 'PENDING_RECOVERY' });
    expect(client.getState().canRetry).toBe(true);
    expect(client.getState().recoveryRequired).toBe(true);
    expect(client.getState().drafts['page-1'].conflict).toBeUndefined();
  });

  it('recovers the original save receipt before rebasing typing entered while saving was blocked', async () => {
    const { client, backend, commit, setRemote } = await setup();
    commit.mockRejectedValueOnce(new PptdClientError('PENDING_RECOVERY', 'Pending journal.', 400));
    client.patchElement('page-1', 'title', { 'content.text': '已发送' }, false);
    await expect(client.flushPage('page-1')).rejects.toMatchObject({ code: 'PENDING_RECOVERY' });
    const original = structuredClone(commit.mock.calls[0][0]);
    const blocked = session();
    blocked.writable = false;
    blocked.diagnostics = [
      { code: 'PENDING_RECOVERY', message: 'Pending journal.', severity: 'error' },
    ];
    setRemote(blocked);
    await client.refresh();
    client.patchElement('page-1', 'title', { 'content.text': '恢复前继续输入' });
    await vi.advanceTimersByTimeAsync(1400);
    await expect(client.flushAll()).rejects.toMatchObject({ code: 'PENDING_RECOVERY' });
    await expect(client.retryPending()).rejects.toMatchObject({ code: 'PENDING_RECOVERY' });
    expect(commit).toHaveBeenCalledTimes(1);
    expect(client.page('page-1')?.data.elements[0].content?.text).toBe('恢复前继续输入');

    setRemote(session('已发送', 2));
    await client.refresh();
    expect(client.getState().recoveryRequired).toBe(true);
    expect(client.getState().lastSaved).toBeNull();
    const recovery = deferred<PptdSession>();
    vi.mocked(backend.recoverPending).mockReturnValueOnce(recovery.promise);
    commit.mockResolvedValueOnce(receipt(original.requestId));
    const recovering = client.recoverPending();
    expect(client.getState()).toMatchObject({
      saving: true,
      recovering: true,
      recoveryRequired: true,
    });
    client.patchElement('page-1', 'title', { 'content.text': '恢复时继续输入' });
    expect(commit).toHaveBeenCalledTimes(1);
    recovery.resolve(session('已发送', 2));
    await recovering;
    expect(commit.mock.calls[1][0]).toEqual(original);
    expect(client.getState()).toMatchObject({
      saving: false,
      recovering: false,
      recoveryRequired: false,
      canRetry: false,
    });
    expect(client.getState().drafts['page-1'].base.pageRevision).toBe(revision(2));
    expect(client.getState().drafts['page-1'].conflict).toBeUndefined();
    expect(client.page('page-1')?.data.elements[0].content?.text).toBe('恢复时继续输入');
    expect(client.getState().undoStack).toEqual(['operation-1']);

    commit.mockImplementationOnce(async (request) => {
      setRemote(session('恢复时继续输入', 3));
      return receipt(request.requestId, 3, 'operation-2');
    });
    await vi.advanceTimersByTimeAsync(700);
    expect(commit.mock.calls[2][0].requestId).not.toBe(original.requestId);
    expect(commit.mock.calls[2][0].expected.pages?.['page-1']).toBe(revision(2));
    expect(client.getState().drafts).toEqual({});
    expect(client.getState().undoStack).toEqual(['operation-1', 'operation-2']);
  });

  it('preserves an insertion preview and newly entered fields through recovery without a false conflict', async () => {
    const { client, backend, commit, setRemote } = await setup();
    commit.mockRejectedValueOnce(new PptdClientError('PENDING_RECOVERY', 'Pending journal.', 400));
    await expect(
      client.apply([{ op: 'element.add', pageId: 'page-1', element: shape() }]),
    ).rejects.toMatchObject({ code: 'PENDING_RECOVERY' });
    const original = structuredClone(commit.mock.calls[0][0]);
    const blocked = session();
    blocked.writable = false;
    blocked.diagnostics = [
      { code: 'PENDING_RECOVERY', message: 'Pending journal.', severity: 'error' },
    ];
    setRemote(blocked);
    await client.refresh();
    client.patchElement('page-1', 'shape', { bounds: [120, 140, 220, 160] });
    const saved = session('原稿', 2);
    saved.pages[0].data.elements.push(shape());
    setRemote(saved);
    const ack = deferred<TransactionResult>();
    commit.mockReturnValueOnce(ack.promise);
    const recovering = client.recoverPending();
    await Promise.resolve();
    expect(backend.recoverPending).toHaveBeenCalledTimes(1);
    expect(client.getState().snapshot?.pages[0].pageRevision).toBe(revision(1));
    expect(client.getState().drafts['page-1'].conflict).toBeUndefined();
    ack.resolve(receipt(original.requestId));
    await recovering;
    expect(commit.mock.calls[1][0]).toEqual(original);
    expect(client.page('page-1')?.data.elements[1].bounds).toEqual([120, 140, 220, 160]);
    expect(client.getState().snapshot?.pages[0].data.elements[1].bounds).toEqual(shape().bounds);
    expect(client.getState().drafts['page-1'].base.pageRevision).toBe(revision(2));
    expect(client.getState().drafts['page-1'].conflict).toBeUndefined();
  });

  it.each([
    ['RECOVERY_REQUIRED', 409],
    ['INVALID_DOCUMENT', 400],
    ['NETWORK_ERROR', 0],
  ])('retains pending work when explicit recovery fails with %s', async (code, status) => {
    const { client, backend, commit, setRemote } = await setup();
    commit.mockRejectedValueOnce(new PptdClientError('PENDING_RECOVERY', 'Pending journal.', 400));
    await expect(
      client.apply([{ op: 'element.add', pageId: 'page-1', element: shape() }]),
    ).rejects.toMatchObject({ code: 'PENDING_RECOVERY' });
    client.patchElement('page-1', 'title', { 'content.text': '必须保留的工作稿' }, false);
    const before = client.pendingWork();
    vi.mocked(backend.recoverPending).mockRejectedValueOnce(
      new PptdClientError(code, 'Recovery cannot proceed.', status),
    );
    await expect(client.recoverPending()).rejects.toMatchObject({ code });
    expect(client.getState()).toMatchObject({
      saving: false,
      recovering: false,
      recoveryRequired: true,
      canRetry: true,
      lastSaved: null,
    });
    expect(client.pendingWork()).toEqual(before);
    expect(JSON.stringify(before)).not.toContain('sessionToken');
    before.drafts['page-1'].fields.title['content.text'] = '修改导出副本';
    expect(client.page('page-1')?.data.elements[0].content?.text).toBe('必须保留的工作稿');
    client.discardDraft('page-1');
    expect(client.getState().drafts['page-1']).toBeDefined();
    expect(commit).toHaveBeenCalledTimes(1);
    expect(client.getState().undoStack).toEqual([]);

    const saved = session('原稿', 2);
    saved.pages[0].data.elements.push(shape());
    setRemote(saved);
    commit.mockResolvedValueOnce(receipt(commit.mock.calls[0][0].requestId));
    await client.recoverPending();
    expect(client.getState().recoveryRequired).toBe(false);
    expect(client.getState().undoStack).toEqual(['operation-1']);
    expect(client.page('page-1')?.data.elements[0].content?.text).toBe('必须保留的工作稿');
  });

  it('preserves an explicit recovery mismatch and its details through generic pending refreshes', async () => {
    const { client, backend, commit, setRemote } = await setup();
    commit.mockRejectedValueOnce(new PptdClientError('PENDING_RECOVERY', 'Pending journal.', 400));
    client.patchElement('page-1', 'title', { 'content.text': '未确认工作稿' }, false);
    await expect(client.flushPage('page-1')).rejects.toMatchObject({ code: 'PENDING_RECOVERY' });
    const mismatch = new PptdClientError(
      'RECOVERY_REQUIRED',
      'The target is in a third state.',
      409,
      {
        reason: 'target-hash-mismatch',
      },
    );
    vi.mocked(backend.recoverPending).mockRejectedValueOnce(mismatch);
    await expect(client.recoverPending()).rejects.toBe(mismatch);
    const before = client.pendingWork();
    const blocked = session();
    blocked.writable = false;
    blocked.diagnostics = [
      {
        code: 'PENDING_RECOVERY',
        message: 'A transaction still needs recovery.',
        severity: 'error',
      },
    ];
    setRemote(blocked);
    await client.refresh();
    await client.refresh();
    expect(client.getState().error).toBe(mismatch);
    expect(client.getState().error?.details).toEqual({ reason: 'target-hash-mismatch' });
    expect(client.getState().recoveryRequired).toBe(true);
    expect(client.pendingWork()).toEqual(before);

    const recovery = deferred<PptdSession>();
    vi.mocked(backend.recoverPending).mockReturnValueOnce(recovery.promise);
    const recovering = client.recoverPending();
    expect(client.getState()).toMatchObject({
      error: null,
      recovering: true,
      recoveryRequired: true,
    });
    setRemote(session('未确认工作稿', 2));
    commit.mockResolvedValueOnce(receipt(commit.mock.calls[0][0].requestId));
    recovery.resolve(session('未确认工作稿', 2));
    await recovering;
    expect(client.getState()).toMatchObject({
      error: null,
      recovering: false,
      recoveryRequired: false,
    });
    expect(client.getState().drafts).toEqual({});
  });

  it('recovers an acknowledged transaction without submitting it twice', async () => {
    const { client, backend, commit, setRemote } = await setup();
    client.patchElement('page-1', 'title', { 'content.text': '已落盘' }, false);
    commit.mockImplementationOnce(async (request) => {
      setRemote(session('已落盘', 2));
      return receipt(request.requestId);
    });
    vi.mocked(backend.getSnapshot).mockRejectedValueOnce(
      new PptdClientError('PENDING_RECOVERY', 'Another journal needs recovery.', 400),
    );
    await expect(client.flushPage('page-1')).rejects.toMatchObject({ code: 'PENDING_RECOVERY' });
    client.patchElement('page-1', 'title', { 'content.text': '回执之后的输入' }, false);
    await client.recoverPending();
    expect(commit).toHaveBeenCalledTimes(1);
    expect(backend.recoverPending).toHaveBeenCalledTimes(1);
    expect(client.getState().undoStack).toEqual(['operation-1']);
    expect(client.getState().drafts['page-1'].base.pageRevision).toBe(revision(2));
    expect(client.page('page-1')?.data.elements[0].content?.text).toBe('回执之后的输入');
  });

  it('recognizes external recovery only without an owned pending request and resumes retained drafts', async () => {
    const { client, backend, commit, setRemote } = await setup();
    client.patchElement('page-1', 'title', { 'content.text': '未发送草稿' });
    const blocked = session();
    blocked.writable = false;
    blocked.diagnostics = [
      { code: 'RECOVERY_REQUIRED', message: 'External journal.', severity: 'error' },
    ];
    setRemote(blocked);
    await client.refresh();
    client.patchElement('page-1', 'title', { 'content.text': '只读期间仍保留输入' });
    await vi.advanceTimersByTimeAsync(1400);
    expect(commit).not.toHaveBeenCalled();
    setRemote({ ...session(), writable: false });
    await client.refresh();
    expect(client.getState().recoveryRequired).toBe(true);
    setRemote(session());
    await client.refresh();
    expect(client.getState()).toMatchObject({ recoveryRequired: false, error: null });
    expect(backend.recoverPending).not.toHaveBeenCalled();
    expect(client.page('page-1')?.data.elements[0].content?.text).toBe('只读期间仍保留输入');
    commit.mockImplementationOnce(async (request) => {
      setRemote(session('只读期间仍保留输入', 2));
      return receipt(request.requestId);
    });
    await vi.advanceTimersByTimeAsync(700);
    expect(commit).toHaveBeenCalledTimes(1);
    expect(client.getState().drafts).toEqual({});
  });

  it('keeps unsent drafts conflicted when an unowned recovery changes their page', async () => {
    const { client, commit, setRemote } = await setup();
    client.patchElement('page-1', 'title', { 'content.text': '本地工作稿' }, false);
    const blocked = session();
    blocked.writable = false;
    blocked.diagnostics = [
      { code: 'PENDING_RECOVERY', message: 'External journal.', severity: 'error' },
    ];
    setRemote(blocked);
    await client.refresh();
    setRemote(session('恢复的外部修改', 2));
    await client.recoverPending();
    expect(client.getState().recoveryRequired).toBe(false);
    expect(client.getState().drafts['page-1'].conflict).toBeTruthy();
    expect(client.page('page-1')?.data.elements[0].content?.text).toBe('本地工作稿');
    expect(client.getState().snapshot?.pages[0].data.elements[0].content?.text).toBe(
      '恢复的外部修改',
    );
    expect(client.getState().undoStack).toEqual([]);
    expect(client.getState().lastSaved).toBeNull();
    await expect(client.flushAll()).rejects.toMatchObject({ code: 'REVISION_CONFLICT' });
    expect(commit).not.toHaveBeenCalled();
  });

  it('recovers undo with the original request and records the history transition once', async () => {
    const { client, commit, revert, setRemote } = await setup();
    commit.mockImplementationOnce(async (request) => {
      setRemote(session('修改后', 2));
      return receipt(request.requestId);
    });
    client.patchElement('page-1', 'title', { 'content.text': '修改后' }, false);
    await client.flushPage('page-1');
    revert.mockRejectedValueOnce(new PptdClientError('PENDING_RECOVERY', 'Undo journal.', 400));
    await expect(client.history('undo')).rejects.toMatchObject({ code: 'PENDING_RECOVERY' });
    const original = [...revert.mock.calls[0]];
    setRemote(session('原稿', 3));
    revert.mockResolvedValueOnce(receipt(original[2], 3, 'undo-operation'));
    await client.recoverPending();
    expect(revert.mock.calls[1]).toEqual(original);
    expect(client.getState().undoStack).toEqual([]);
    expect(client.getState().redoStack).toEqual(['undo-operation']);
    revert.mockImplementationOnce(async (_kind, _operationId, requestId) => {
      setRemote(session('修改后', 4));
      return receipt(requestId, 4, 'redo-operation');
    });
    await client.history('redo');
    expect(revert.mock.calls[2].slice(0, 2)).toEqual(['redo', 'undo-operation']);
    expect(client.getState().undoStack).toEqual(['redo-operation']);
  });

  it('authenticates recovery and its receipt through the trusted session capability', async () => {
    const recovered = { ...session('已恢复', 2), sessionToken: 'recovered-token' };
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(Response.json(session()))
      .mockResolvedValueOnce(Response.json(recovered))
      .mockResolvedValueOnce(Response.json(receipt('request-1')));
    vi.stubGlobal('fetch', fetcher);
    const backend = new PptdBackend();
    await backend.getSnapshot();
    expect(await backend.recoverPending()).toEqual(recovered);
    await backend.revert('undo', 'operation-1', 'request-1', 'client-1');
    expect(fetcher.mock.calls[1]).toEqual([
      '/__pptd/recover',
      expect.objectContaining({
        method: 'POST',
        body: '{}',
        headers: { 'content-type': 'application/json', 'x-huandeng-token': 'token' },
      }),
    ]);
    expect(fetcher.mock.calls[2][1].headers['x-huandeng-token']).toBe('token');
  });

  it('retries an uncertain undo once and uses its new operation id for redo', async () => {
    const { client, commit, revert, setRemote } = await setup();
    commit.mockImplementationOnce(async (request) => {
      setRemote(session('修改后', 2));
      return receipt(request.requestId);
    });
    client.patchElement('page-1', 'title', { 'content.text': '修改后' }, false);
    await client.flushPage('page-1');
    revert.mockImplementationOnce(async () => {
      setRemote(session('原稿', 3));
      throw new PptdClientError('NETWORK_ERROR', 'Lost undo response.');
    });
    await expect(client.history('undo')).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
    const originalId = revert.mock.calls[0][2];
    revert.mockResolvedValueOnce(receipt(originalId, 3, 'undo-operation'));
    await client.retryPending();
    expect(revert.mock.calls[1][2]).toBe(originalId);
    expect(client.getState().undoStack).toEqual([]);
    expect(client.getState().redoStack).toEqual(['undo-operation']);
    revert.mockImplementationOnce(async (_kind, _operationId, requestId) => {
      setRemote(session('修改后', 4));
      return receipt(requestId, 4, 'redo-operation');
    });
    await client.history('redo');
    expect(revert.mock.calls[2].slice(0, 2)).toEqual(['redo', 'undo-operation']);
    expect(client.getState().undoStack).toEqual(['redo-operation']);
  });
});
