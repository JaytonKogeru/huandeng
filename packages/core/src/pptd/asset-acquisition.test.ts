import { beforeEach, describe, expect, it, vi } from 'vitest';
import { acquireEditorCapture, acquireImage } from './asset-acquisition';
import { HuandengClient } from './client';
import { captureEditor } from './editor-capture';
import { deckFixture } from './fixtures.test-utils';
import { downloadPublicImage } from './public-image';

vi.mock('./editor-capture', () => ({ captureEditor: vi.fn() }));
vi.mock('./public-image', () => ({ downloadPublicImage: vi.fn() }));
beforeEach(() => vi.resetAllMocks());

function client() {
  const connection = new HuandengClient('http://127.0.0.1:4850');
  const snapshot = deckFixture();
  const session = vi.spyOn(connection, 'session').mockResolvedValue(snapshot);
  const request = vi.spyOn(connection, 'request').mockResolvedValue({
    path: 'media/imported/original.png',
    name: 'original.png',
    width: 1,
    height: 1,
    revision: 'sha256:bytes',
  });
  return { connection, snapshot, session, request };
}

describe('acquisition through an existing writer', () => {
  it('checks project identity and read-only state before downloading', async () => {
    const { connection, snapshot } = client();
    await expect(
      acquireImage(connection, { deckId: 'other', name: 'x', url: 'https://example.org/a.png' }),
    ).rejects.toThrow('bound');
    snapshot.writable = false;
    await expect(
      acquireImage(connection, {
        deckId: snapshot.deckId,
        name: 'x',
        url: 'https://example.org/a.png',
      }),
    ).rejects.toThrow('read-only');
    expect(downloadPublicImage).not.toHaveBeenCalled();
  });
  it('uses the existing safe import endpoint without a slide transaction', async () => {
    const { connection, snapshot, request } = client();
    const asset = await acquireImage(connection, {
      deckId: snapshot.deckId,
      name: 'source.png',
      base64: 'AQ==',
    });
    expect(request).toHaveBeenCalledExactlyOnceWith('/assets/import', {
      name: 'source.png',
      base64: 'AQ==',
    });
    expect(asset.source).toEqual({ type: 'supplied-bytes' });
  });
  it.each([
    { url: 2, base64: 'AQ==' },
    { url: 'https://example.org/a.png', base64: 'AQ==' },
    {},
    { base64: 'AQ==', headers: { authorization: 'secret' } },
  ])('rejects ambiguous or unsupported source input', async (source) => {
    const { connection, snapshot, request } = client();
    await expect(
      acquireImage(connection, { deckId: snapshot.deckId, name: 'x', ...source }),
    ).rejects.toThrow();
    expect(request).not.toHaveBeenCalled();
  });
  it('imports an actual capture only after checking the document is unchanged', async () => {
    const { connection, snapshot, request } = client();
    vi.mocked(captureEditor).mockResolvedValue({
      bytes: Buffer.from('png'),
      state: { name: 'editor.png' } as never,
      source: 'real-web-editor',
      capturedAt: 'now',
      preventedSelectionWrites: 2,
    });
    const result = await acquireEditorCapture(connection, { deckId: snapshot.deckId });
    expect(captureEditor).toHaveBeenCalledWith(
      connection.url,
      { deckId: snapshot.deckId },
      snapshot,
    );
    expect(request).toHaveBeenCalledExactlyOnceWith('/assets/import', {
      name: 'editor.png',
      base64: Buffer.from('png').toString('base64'),
    });
    expect(result.preventedSelectionWrites).toBe(2);
  });
  it.each([{ versions: [] }, { versions: [{ versionId: 'old-edit', kind: 'edit' }] }])(
    'rejects missing or unnamed History records before opening the browser',
    async ({ versions }) => {
      const { connection, snapshot, request } = client();
      request.mockResolvedValueOnce(versions);
      await expect(
        acquireEditorCapture(connection, { deckId: snapshot.deckId, historyVersionId: 'old-edit' }),
      ).rejects.toThrow('named version');
      expect(captureEditor).not.toHaveBeenCalled();
    },
  );
  it('rejects receipts outside the visible Project Activity', async () => {
    const { connection, snapshot, request } = client();
    request.mockResolvedValueOnce({ deckId: snapshot.deckId, events: [] });
    await expect(
      acquireEditorCapture(connection, { deckId: snapshot.deckId, reviewOperationId: 'claimed' }),
    ).rejects.toThrow('Project Activity');
    expect(request).toHaveBeenCalledExactlyOnceWith('/activity');
    expect(captureEditor).not.toHaveBeenCalled();
  });
  it('resolves a client-reported receipt against the actual Project and page', async () => {
    const { connection, snapshot, request } = client();
    request.mockResolvedValueOnce({
      deckId: snapshot.deckId,
      events: [{ source: 'client', operationIds: ['claimed'] }],
    });
    request.mockResolvedValueOnce({
      deckId: 'another-project',
      operationId: 'claimed',
      pageId: snapshot.pages[0].pageId,
    });
    await expect(
      acquireEditorCapture(connection, { deckId: snapshot.deckId, reviewOperationId: 'claimed' }),
    ).rejects.toThrow('does not match');
    expect(captureEditor).not.toHaveBeenCalled();
  });
  it('refuses a capture if the source changed before import', async () => {
    const { connection, snapshot, session, request } = client();
    session.mockResolvedValueOnce(snapshot).mockResolvedValueOnce({
      ...snapshot,
      manifestRevision: 'sha256:changed',
    });
    vi.mocked(captureEditor).mockResolvedValue({
      bytes: Buffer.from('png'),
      state: { name: 'editor.png' } as never,
      source: 'real-web-editor',
      capturedAt: 'now',
      preventedSelectionWrites: 1,
    });
    await expect(acquireEditorCapture(connection, { deckId: snapshot.deckId })).rejects.toThrow(
      'changed',
    );
    expect(request).not.toHaveBeenCalled();
  });
});
