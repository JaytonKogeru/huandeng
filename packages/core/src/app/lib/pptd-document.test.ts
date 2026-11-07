import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Revision, TransactionRequest, TransactionResult } from '../../pptd/types';
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

const clients: PptdDocumentClient[] = [];

async function setup() {
  let remote = session();
  const commit = vi.fn<(request: TransactionRequest) => Promise<TransactionResult>>();
  const revert = vi.fn<PptdTransport['revert']>();
  const backend: PptdTransport = {
    getSnapshot: vi.fn(async () => structuredClone(remote)),
    commit,
    revert,
    subscribe: () => () => {},
  };
  const client = new PptdDocumentClient(backend);
  clients.push(client);
  await client.refresh();
  return {
    client,
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
    expect(client.getState().drafts['page-1'].conflict).toBeUndefined();
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
