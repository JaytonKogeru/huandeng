import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { METADATA_PATH } from './identity';
import { projectTestDirectory } from './project-directory.test-utils';
import { openPptdStore, type PptdStore } from './store';
import type { DocumentEvent, PptdOperation, TransactionRequest } from './types';

const temporary: string[] = [];
const stores: PptdStore[] = [];

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(stores.splice(0).map((store) => store.close()));
  await Promise.all(
    temporary.splice(0).map((directory) => fs.rm(directory, { recursive: true, force: true })),
  );
});

async function fixture() {
  const directory = await projectTestDirectory('huandeng-recovery-');
  temporary.push(directory);
  const root = path.join(directory, 'project');
  const stateDir = path.join(directory, 'state');
  const entryPath = path.join(root, 'deck.pptd');
  await fs.mkdir(root);
  await fs.writeFile(entryPath, 'pages: [one.page, two.page]\n');
  await fs.writeFile(path.join(root, 'one.page'), 'elements: []\nnotes: Original\n');
  await fs.writeFile(path.join(root, 'two.page'), 'elements: []\nnotes: Sibling\n');
  let fail = false;
  const store = await openPptdStore({
    entryPath,
    stateDir,
    afterWrite: async () => {
      if (fail) {
        fail = false;
        throw new Error('Interrupted write');
      }
    },
  });
  stores.push(store);
  return {
    root,
    stateDir,
    entryPath,
    store,
    interrupt: () => {
      fail = true;
    },
  };
}

function request(store: PptdStore, operations: PptdOperation[]): TransactionRequest {
  const snapshot = store.getSnapshot();
  return {
    requestId: randomUUID(),
    actor: 'recovery-test',
    deckId: snapshot.deckId,
    expected: {
      pages: Object.fromEntries(snapshot.pages.map((page) => [page.pageId, page.pageRevision])),
      manifest: snapshot.manifestRevision,
      metadata: snapshot.metadataRevision,
    },
    operations,
  };
}

describe('explicit recovery within the active document writer', () => {
  it('completes a partial multi-file save and acknowledges the original request exactly once', async () => {
    const { root, stateDir, store, interrupt } = await fixture();
    const pending = request(store, [{ op: 'page.add' }]);
    const metadataBefore = await fs.readFile(path.join(root, METADATA_PATH), 'utf8');
    interrupt();
    await expect(store.commit(pending)).rejects.toMatchObject({ code: 'PENDING_RECOVERY' });
    expect(await fs.readFile(path.join(root, METADATA_PATH), 'utf8')).toBe(metadataBefore);
    expect((await store.refreshExternal()).writable).toBe(false);
    const events: DocumentEvent[] = [];
    store.subscribe((event) => events.push(event));
    const recovered = await store.recoverPending();
    expect(recovered.writable).toBe(true);
    expect(recovered.pages).toHaveLength(3);
    expect(recovered.diagnostics).toEqual([]);
    expect(events).toEqual([expect.objectContaining({ type: 'committed' })]);
    const receipt = await store.commit(pending);
    expect(receipt.requestId).toBe(pending.requestId);
    expect(receipt.createdPages).toHaveLength(1);
    expect(await store.commit(pending)).toEqual(receipt);
    expect(await store.history()).toHaveLength(1);
    await expect(fs.access(path.join(stateDir, 'pending.json'))).rejects.toMatchObject({
      code: 'ENOENT',
    });
    expect((await store.recoverPending()).pages).toHaveLength(3);
    await store.commit(
      request(store, [
        { op: 'page.notes.set', pageId: recovered.pages[0].pageId, text: 'After recovery' },
      ]),
    );
    expect(await fs.readFile(path.join(root, 'two.page'), 'utf8')).toBe(
      'elements: []\nnotes: Sibling\n',
    );
  });

  it.each(['page', 'metadata', 'manifest'] as const)(
    'keeps an unrelated external %s change out of the recovered committed event',
    async (kind) => {
      const { root, store, interrupt } = await fixture();
      const [first, second] = store.getSnapshot().pages;
      const pending = request(store, [
        { op: 'page.notes.set', pageId: first.pageId, text: 'Recovered edit' },
      ]);
      interrupt();
      await expect(store.commit(pending)).rejects.toMatchObject({ code: 'PENDING_RECOVERY' });
      let externalPath: string;
      let externalSource: string;
      if (kind === 'page') {
        externalPath = path.join(root, 'two.page');
        externalSource = 'elements: []\nnotes: External sibling work\n';
      } else if (kind === 'metadata') {
        externalPath = path.join(root, METADATA_PATH);
        const metadata = JSON.parse(await fs.readFile(externalPath, 'utf8'));
        metadata.slides[second.pageId].label = 'S99';
        externalSource = `${JSON.stringify(metadata, null, 2)}\n`;
      } else {
        externalPath = path.join(root, 'deck.pptd');
        externalSource = 'title: External deck title\npages: [one.page, two.page]\n';
      }
      await fs.writeFile(externalPath, externalSource);
      const events: DocumentEvent[] = [];
      store.subscribe((event) => events.push(event));
      const recovered = await store.recoverPending();
      expect(recovered.writable).toBe(true);
      expect(store.readPage(first.pageId).data.notes).toBe('Recovered edit');
      expect(await fs.readFile(externalPath, 'utf8')).toBe(externalSource);
      expect(events).toEqual([expect.objectContaining({ type: 'external' })]);
      const receipt = await store.commit(pending);
      expect(receipt.requestId).toBe(pending.requestId);
      expect(await store.commit(pending)).toEqual(receipt);
      expect(events).toHaveLength(1);
    },
  );

  it('preserves an external third state and its pending journal when recovery is refused', async () => {
    const { root, stateDir, store, interrupt } = await fixture();
    const pageId = store.getSnapshot().pages[0].pageId;
    interrupt();
    await expect(
      store.commit(request(store, [{ op: 'page.notes.set', pageId, text: 'Pending' }])),
    ).rejects.toMatchObject({ code: 'PENDING_RECOVERY' });
    const journal = await fs.readFile(path.join(stateDir, 'pending.json'), 'utf8');
    const external = 'elements: []\nnotes: External third state\n';
    await fs.writeFile(path.join(root, 'one.page'), external);
    await expect(store.recoverPending()).rejects.toMatchObject({ code: 'RECOVERY_REQUIRED' });
    expect(store.getSnapshot().writable).toBe(false);
    expect(await fs.readFile(path.join(root, 'one.page'), 'utf8')).toBe(external);
    expect(await fs.readFile(path.join(stateDir, 'pending.json'), 'utf8')).toBe(journal);
    const refused = store.getSnapshot();
    const refreshed = await store.refreshExternal();
    expect(refreshed.sequence).toBe(refused.sequence);
    expect(refreshed.diagnostics).toEqual(refused.diagnostics);
    expect(refreshed.diagnostics[0].code).toBe('RECOVERY_REQUIRED');
    expect(refreshed.writable).toBe(false);
  });

  it('validates every recorded hash before recovering any remaining file', async () => {
    const { root, stateDir, store, interrupt } = await fixture();
    const metadataBefore = await fs.readFile(path.join(root, METADATA_PATH), 'utf8');
    interrupt();
    await expect(store.commit(request(store, [{ op: 'page.add' }]))).rejects.toMatchObject({
      code: 'PENDING_RECOVERY',
    });
    const pending = path.join(stateDir, 'pending.json');
    const journal = JSON.parse(await fs.readFile(pending, 'utf8'));
    journal.record.files.find((file: { role: string }) => file.role === 'metadata').after += ' ';
    await fs.writeFile(pending, JSON.stringify(journal));
    await expect(store.recoverPending()).rejects.toMatchObject({ code: 'RECOVERY_REQUIRED' });
    expect(await fs.readFile(path.join(root, METADATA_PATH), 'utf8')).toBe(metadataBefore);
    expect(store.getSnapshot().writable).toBe(false);
  });

  it('returns the original undo and redo receipts after recovery changes the current revisions', async () => {
    const { store, interrupt } = await fixture();
    const pageId = store.getSnapshot().pages[0].pageId;
    const edit = await store.commit(
      request(store, [{ op: 'page.notes.set', pageId, text: 'Edited' }]),
    );
    let target = edit.operationId;
    for (const kind of ['undo', 'redo'] as const) {
      const requestId = randomUUID();
      interrupt();
      await expect(store[kind](target, requestId, 'recovery-test')).rejects.toMatchObject({
        code: 'PENDING_RECOVERY',
      });
      await store.recoverPending();
      const result = await store[kind](target, requestId, 'recovery-test');
      expect(await store[kind](target, requestId, 'recovery-test')).toEqual(result);
      await expect(store[kind](target, requestId, 'different-actor')).rejects.toMatchObject({
        code: 'REQUEST_ID_REUSE',
      });
      await expect(store[kind](randomUUID(), requestId, 'recovery-test')).rejects.toMatchObject({
        code: 'REQUEST_ID_REUSE',
      });
      target = result.operationId;
    }
    expect(store.readPage(pageId).data.notes).toBe('Edited');
    expect(await store.history()).toHaveLength(3);
  });

  it('publishes recovered status even when the journal changes no document bytes', async () => {
    const { stateDir, store } = await fixture();
    const page = store.getSnapshot().pages[0];
    const pending = request(store, [
      { op: 'page.notes.set', pageId: page.pageId, text: 'Original' },
    ]);
    const original = fs.rename.bind(fs);
    const receiptDirectory = path.join(stateDir, 'receipts').toLowerCase();
    const rename = vi.spyOn(fs, 'rename').mockImplementation(async (from, to) => {
      if (String(to).toLowerCase().startsWith(receiptDirectory))
        throw Object.assign(new Error('Receipt temporarily unavailable'), { code: 'EIO' });
      return original(from, to);
    });
    await expect(store.commit(pending)).rejects.toMatchObject({ code: 'PENDING_RECOVERY' });
    rename.mockRestore();
    const protectedState = await store.refreshExternal();
    expect(protectedState.writable).toBe(false);
    const events: DocumentEvent[] = [];
    store.subscribe((event) => events.push(event));
    expect((await store.refreshExternal()).sequence).toBe(protectedState.sequence);
    expect(events).toHaveLength(0);
    const recovered = await store.recoverPending();
    expect(recovered.writable).toBe(true);
    expect(recovered.pages[0].pageRevision).toBe(page.pageRevision);
    expect(recovered.sequence).toBe(protectedState.sequence + 1);
    expect(events).toEqual([
      expect.objectContaining({ type: 'diagnostic', diagnostics: [], changedPages: {} }),
    ]);
    expect((await store.recoverPending()).sequence).toBe(recovered.sequence);
    expect(events).toHaveLength(1);
    expect(await store.commit(pending)).toMatchObject({ requestId: pending.requestId, noOp: true });
  });

  it('refuses recovery in a read-only session', async () => {
    const { entryPath, stateDir, store } = await fixture();
    await store.close();
    const readOnly = await openPptdStore({ entryPath, stateDir, readOnly: true });
    stores.push(readOnly);
    await expect(readOnly.recoverPending()).rejects.toMatchObject({ code: 'READ_ONLY' });
  });
});
