import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  PptdElement,
  PptdOperation,
  Revision,
  TransactionRequest,
  TransactionResult,
} from '../../pptd/types';
import { PptdBackend, PptdClientError, type PptdSession, type PptdTransport } from './pptd-backend';
import { PptdDocumentClient } from './pptd-document';

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

async function setup(initial = session()) {
  let remote = initial;
  const commit = vi.fn<(request: TransactionRequest) => Promise<TransactionResult>>();
  const revert = vi.fn<PptdTransport['revert']>();
  const backend: PptdTransport = {
    getSnapshot: vi.fn(async () => structuredClone(remote)),
    recoverPending: vi.fn(async () => structuredClone(remote)),
    commit,
    revert,
    subscribe: () => () => {},
  };
  const client = new PptdDocumentClient(backend);
  clients.push(client);
  await client.refresh();
  return {
    client,
    backend,
    commit,
    revert,
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

  it('authenticates recovery and refreshes the session token for the receipt request', async () => {
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
    expect(fetcher.mock.calls[2][1].headers['x-huandeng-token']).toBe('recovered-token');
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
