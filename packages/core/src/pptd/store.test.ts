import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { METADATA_PATH } from './identity';
import { hashBytes } from './persistence';
import { createRecipe } from './recipes';
import { type OpenPptdOptions, openPptdStore, type PptdStore } from './store';
import type { DocumentEvent, PptdOperation, TransactionRequest } from './types';

const stores: PptdStore[] = [];
const temporary: string[] = [];
const pageSource =
  '# author annotation\nelements:\n  - elementId: title\n    elementType: text\n    bounds: [10, 20, 300, 40]\n    content:\n      text: Original\n      fontSize: 24\n    opaque: { nested: [keep, this] }\n  - elementId: photo\n    elementType: image\n    bounds: [20, 90, 400, 300]\n    src: media/original.svg\nnotes: Original notes\n';

afterEach(async () => {
  await Promise.allSettled(stores.splice(0).map((store) => store.close()));
  await Promise.all(
    temporary.splice(0).map((directory) => fs.rm(directory, { recursive: true, force: true })),
  );
});

async function fixture() {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'huandeng-test-'));
  temporary.push(directory);
  const root = path.join(directory, 'project');
  const stateDir = path.join(directory, 'state');
  await fs.mkdir(path.join(root, 'pages'), { recursive: true });
  await fs.writeFile(
    path.join(root, 'deck.pptd'),
    'version: v2\ntitle: Scientific deck\nsize: [960, 540]\npages:\n  - pages/a.page\n  - pages/b.page\nunknown: { preserve: true }\n',
  );
  await fs.writeFile(path.join(root, 'pages/a.page'), pageSource);
  await fs.writeFile(path.join(root, 'pages/b.page'), pageSource.replace('Original', 'Second'));
  return { root, stateDir, entryPath: path.join(root, 'deck.pptd') };
}

async function open(options: OpenPptdOptions) {
  const store = await openPptdStore(options);
  stores.push(store);
  return store;
}

function request(store: PptdStore, operations: PptdOperation[]): TransactionRequest {
  const snapshot = store.getSnapshot();
  return {
    requestId: randomUUID(),
    actor: 'unit-test',
    deckId: snapshot.deckId,
    expected: {
      pages: Object.fromEntries(snapshot.pages.map((page) => [page.pageId, page.pageRevision])),
      manifest: snapshot.manifestRevision,
      metadata: snapshot.metadataRevision,
    },
    operations,
  };
}

describe('PPTD document store', () => {
  it('opens read-only without creating identities, locks or caches', async () => {
    const files = await fixture();
    const store = await open({ ...files, readOnly: true });
    const snapshot = store.getSnapshot();
    expect(snapshot.identityPersisted).toBe(false);
    expect(snapshot.writable).toBe(false);
    expect(snapshot.pages.every((page) => page.shortCode === null)).toBe(true);
    expect(await fs.readFile(path.join(files.root, 'pages/a.page'), 'utf8')).toBe(pageSource);
    await expect(fs.access(path.join(files.root, METADATA_PATH))).rejects.toMatchObject({
      code: 'ENOENT',
    });
    await expect(fs.access(files.stateDir)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('writes one scalar in place and checks CAS without rewriting metadata or siblings', async () => {
    const files = await fixture();
    const store = await open(files);
    const first = store.getSnapshot().pages[0];
    const metadataBefore = await fs.readFile(path.join(files.root, METADATA_PATH));
    const manifestBefore = await fs.readFile(files.entryPath);
    const siblingBefore = await fs.readFile(path.join(files.root, 'pages/b.page'));
    const transaction = request(store, [
      {
        op: 'element.patch',
        pageId: first.pageId,
        elementId: 'title',
        set: { 'content.text': 'Updated 🧬' },
      },
    ]);
    const result = await store.commit(transaction);
    expect(result.changedPages).toEqual([first.pageId]);
    const saved = await fs.readFile(path.join(files.root, first.path), 'utf8');
    expect(saved).toBe(pageSource.replace('text: Original', 'text: "Updated 🧬"'));
    expect(result.newRevisions.pages[first.pageId]).toBe(hashBytes(saved));
    expect(await fs.readFile(path.join(files.root, METADATA_PATH))).toEqual(metadataBefore);
    expect(await fs.readFile(files.entryPath)).toEqual(manifestBefore);
    expect(await fs.readFile(path.join(files.root, 'pages/b.page'))).toEqual(siblingBefore);
    await expect(store.commit({ ...transaction, requestId: randomUUID() })).rejects.toMatchObject({
      code: 'REVISION_CONFLICT',
    });
    expect(store.readPage(first.shortCode?.toLowerCase() ?? '').pageId).toBe(first.pageId);
  });

  it('persists idempotency receipts across restart and rejects payload reuse', async () => {
    const files = await fixture();
    const store = await open(files);
    const transaction = request(store, [{ op: 'page.add', page: { elements: [] } }]);
    const result = await store.commit(transaction);
    expect(await store.commit(transaction)).toEqual(result);
    await store.close();
    const reopened = await open(files);
    expect(await reopened.commit(transaction)).toEqual(result);
    expect(reopened.getSnapshot().pages).toHaveLength(3);
    await expect(
      reopened.commit({ ...transaction, actor: 'different-payload' }),
    ).rejects.toMatchObject({ code: 'REQUEST_ID_REUSE' });
  });

  it('validates an entire batch before touching disk', async () => {
    const files = await fixture();
    const store = await open(files);
    const id = store.getSnapshot().pages[0].pageId;
    await expect(
      store.commit(
        request(store, [
          {
            op: 'element.patch',
            pageId: id,
            elementId: 'title',
            set: { 'content.text': 'Would change' },
          },
          { op: 'element.patch', pageId: id, elementId: 'absent', set: { rotation: 4 } },
        ]),
      ),
    ).rejects.toMatchObject({ code: 'TARGET_NOT_FOUND' });
    expect(await fs.readFile(path.join(files.root, 'pages/a.page'), 'utf8')).toBe(pageSource);
    expect(await store.history()).toHaveLength(0);
  });

  it('serializes clients and ignores unrelated stale page preconditions', async () => {
    const files = await fixture();
    const store = await open(files);
    const [first, second] = store.getSnapshot().pages;
    const one = request(store, [{ op: 'page.notes.set', pageId: first.pageId, text: 'one' }]);
    const two = request(store, [{ op: 'page.notes.set', pageId: second.pageId, text: 'two' }]);
    await Promise.all([store.commit(one), store.commit(two)]);
    expect(store.readPage(first.pageId).data.notes).toBe('one');
    expect(store.readPage(second.pageId).data.notes).toBe('two');
    const a = request(store, [{ op: 'page.notes.set', pageId: first.pageId, text: 'three' }]);
    const b = request(store, [{ op: 'page.notes.set', pageId: first.pageId, text: 'four' }]);
    const results = await Promise.allSettled([store.commit(a), store.commit(b)]);
    expect(results[0].status).toBe('fulfilled');
    expect(results[1]).toMatchObject({ status: 'rejected', reason: { code: 'REVISION_CONFLICT' } });
  });

  it('holds one OS writer lease per canonical project and releases it on close', async () => {
    const files = await fixture();
    const first = await open(files);
    await expect(
      openPptdStore({ ...files, stateDir: `${files.stateDir}-other` }),
    ).rejects.toMatchObject({ code: 'WRITER_LOCKED' });
    await first.close();
    expect((await open(files)).getSnapshot().writable).toBe(true);
  });

  it('keeps identity and notes through duplicate, reorder, remove and restore', async () => {
    const files = await fixture();
    const store = await open(files);
    const first = store.getSnapshot().pages[0];
    const duplicate = await store.commit(
      request(store, [{ op: 'page.duplicate', pageId: first.pageId }]),
    );
    const created = duplicate.createdPages[0];
    const copied = store.readPage(created.pageId);
    expect(
      copied.data.elements.every((element) => !['title', 'photo'].includes(element.elementId)),
    ).toBe(true);
    expect(copied.data.elements[1].src).toBe('media/original.svg');
    expect(copied.data.elements[0].opaque).toEqual({ nested: ['keep', 'this'] });
    expect(copied.data.notes).toBe('Original notes');
    expect(await fs.readFile(path.join(files.root, created.path), 'utf8')).toContain(
      '# author annotation',
    );
    await store.commit(request(store, [{ op: 'page.move', pageId: first.pageId }]));
    expect(store.getSnapshot().pages.at(-1)?.pageId).toBe(first.pageId);
    expect(store.readPage(first.pageId).shortCode).toBe(first.shortCode);
    await store.commit(request(store, [{ op: 'page.remove', pageId: first.pageId }]));
    expect(store.getSnapshot().pages).toHaveLength(2);
    expect(store.readPage(first.pageId).state).toBe('tombstone');
    expect(await fs.readFile(path.join(files.root, first.path), 'utf8')).toBe(pageSource);
    const restore = request(store, [
      { op: 'page.restore', pageId: first.pageId, afterPageId: null },
    ]);
    restore.expected.pages = {
      ...restore.expected.pages,
      [first.pageId]: store.readPage(first.pageId).pageRevision,
    };
    await store.commit(restore);
    expect(store.getSnapshot().pages[0].pageId).toBe(first.pageId);
  });

  it('undoes one page after another changes and redoes the inverse without bypassing conflicts', async () => {
    const files = await fixture();
    const store = await open(files);
    const [first, second] = store.getSnapshot().pages;
    const changed = await store.commit(
      request(store, [{ op: 'page.notes.set', pageId: first.pageId, text: 'new notes' }]),
    );
    await store.commit(
      request(store, [{ op: 'page.notes.set', pageId: second.pageId, text: 'another page' }]),
    );
    const undone = await store.undo(changed.operationId);
    expect(store.readPage(first.pageId).data.notes).toBe('Original notes');
    await store.redo(undone.operationId);
    expect(store.readPage(first.pageId).data.notes).toBe('new notes');
    await store.commit(
      request(store, [{ op: 'page.notes.set', pageId: first.pageId, text: 'remote change' }]),
    );
    await expect(store.undo(changed.operationId)).rejects.toMatchObject({ code: 'UNDO_CONFLICT' });
  });

  it('reserves new page identity when undoing creation', async () => {
    const files = await fixture();
    const store = await open(files);
    const added = await store.commit(request(store, [{ op: 'page.add' }]));
    const created = added.createdPages[0];
    const undone = await store.undo(added.operationId);
    expect(store.getSnapshot().pages).toHaveLength(2);
    expect(store.getSnapshot().metadata.slides[created.pageId].state).toBe('tombstone');
    expect(await fs.readFile(path.join(files.root, created.path), 'utf8')).toContain(
      'elements: []',
    );
    await store.redo(undone.operationId);
    expect(store.getSnapshot().pages).toHaveLength(3);
    expect(store.readPage(created.pageId).shortCode).toBe(created.shortCode);
  });

  it('rolls an accepted multi-file journal forward after a simulated process failure', async () => {
    const files = await fixture();
    let crash = true;
    const store = await open({
      ...files,
      afterWrite: async (index) => {
        if (crash && index === 1) {
          crash = false;
          throw new Error('simulated crash');
        }
      },
    });
    const transaction = request(store, [{ op: 'page.add' }]);
    await expect(store.commit(transaction)).rejects.toMatchObject({ code: 'PENDING_RECOVERY' });
    expect(store.getSnapshot().pages).toHaveLength(2);
    const pending = await store.refreshExternal();
    expect(pending.pages).toHaveLength(2);
    expect(Object.keys(pending.metadata.slides)).toHaveLength(2);
    expect(pending.diagnostics[0].code).toBe('PENDING_RECOVERY');
    await expect(store.commit(request(store, [{ op: 'page.add' }]))).rejects.toMatchObject({
      code: 'PENDING_RECOVERY',
    });
    await store.close();
    const recovered = await open(files);
    expect(recovered.getSnapshot().pages).toHaveLength(3);
    const receipt = await recovered.commit(transaction);
    expect(receipt.createdPages).toHaveLength(1);
    expect(
      (await recovered.history()).filter((item) => item.requestId === transaction.requestId),
    ).toHaveLength(1);
    await expect(fs.access(path.join(files.stateDir, 'pending.json'))).rejects.toMatchObject({
      code: 'ENOENT',
    });
  });

  it('preserves an external third state and blocks conflicting journal recovery', async () => {
    const files = await fixture();
    const store = await open({
      ...files,
      afterWrite: async () => {
        throw new Error('simulated crash');
      },
    });
    const transaction = request(store, [{ op: 'page.add' }]);
    await expect(store.commit(transaction)).rejects.toMatchObject({ code: 'PENDING_RECOVERY' });
    const journal = JSON.parse(
      await fs.readFile(path.join(files.stateDir, 'pending.json'), 'utf8'),
    );
    const target = path.join(files.root, journal.record.files[0].path);
    const external = 'elements: []\nnotes: external survivor\n';
    await fs.writeFile(target, external);
    await store.close();
    await expect(openPptdStore(files)).rejects.toMatchObject({ code: 'RECOVERY_REQUIRED' });
    expect(await fs.readFile(target, 'utf8')).toBe(external);
    expect(await fs.readFile(path.join(files.stateDir, 'pending.json'), 'utf8')).toContain(
      transaction.requestId,
    );
  });

  it('keeps the last valid preview while external YAML is incomplete', async () => {
    const files = await fixture();
    const store = await open(files);
    const first = store.getSnapshot().pages[0];
    await fs.writeFile(path.join(files.root, first.path), 'elements: [unfinished');
    const stale = await store.refreshExternal();
    expect(stale.pages[0].pageRevision).toBe(first.pageRevision);
    expect(stale.diagnostics.some((item) => item.severity === 'error')).toBe(true);
    await expect(
      store.commit(
        request(store, [{ op: 'page.notes.set', pageId: first.pageId, text: 'do not overwrite' }]),
      ),
    ).rejects.toMatchObject({ code: 'INVALID_DOCUMENT' });
    expect(await fs.readFile(path.join(files.root, first.path), 'utf8')).toBe(
      'elements: [unfinished',
    );
  });

  it('updates recipe bindings atomically and preserves overrides and deleted slots', async () => {
    const files = await fixture();
    const store = await open(files);
    const pageId = store.getSnapshot().pages[0].pageId;
    const recipe = createRecipe({
      recipe: 'figure-with-caption',
      pageId,
      instanceId: 'figure1',
      size: [960, 540],
      assets: { figure: 'media/original.svg' },
      texts: { caption: 'Scientific caption' },
    });
    const create = request(store, [
      ...recipe.elements.map((element) => ({ op: 'element.add' as const, pageId, element })),
      { op: 'metadata.patch', pageId, set: { 'components.figure1': recipe.binding } },
    ]);
    const missingSizeRevision = structuredClone(create);
    delete missingSizeRevision.expected.manifest;
    await expect(store.commit(missingSizeRevision)).rejects.toMatchObject({
      code: 'MISSING_PRECONDITION',
    });
    await store.commit(create);
    for (const margin of [45, 50]) {
      await store.commit(
        request(store, [{ op: 'recipe.apply', pageId, instanceId: 'figure1', params: { margin } }]),
      );
      expect(
        Object.values(store.readPage(pageId).metadata.components?.figure1.overrides ?? {}).flat(),
      ).toEqual([]);
    }
    const figureId = recipe.binding.slots.figure;
    if (!figureId) throw new Error('missing fixture figure');
    const direct = request(store, [
      { op: 'element.patch', pageId, elementId: figureId, set: { bounds: [123, 23, 333, 222] } },
    ]);
    const withoutMetadata = structuredClone(direct);
    delete withoutMetadata.expected.metadata;
    await expect(store.commit(withoutMetadata)).rejects.toMatchObject({
      code: 'MISSING_PRECONDITION',
    });
    await store.commit(direct);
    expect(store.readPage(pageId).metadata.components?.figure1.overrides.figure).toContain(
      'geometry',
    );
    const apply = await store.commit(
      request(store, [
        { op: 'recipe.apply', pageId, instanceId: 'figure1', params: { margin: 60 } },
      ]),
    );
    expect(apply.skippedOverrides.some((item) => item.elementId === figureId)).toBe(true);
    expect(
      store.readPage(pageId).data.elements.find((element) => element.elementId === figureId)
        ?.bounds,
    ).toEqual([123, 23, 333, 222]);
    expect(
      store.readPage(pageId).data.elements.find((element) => element.elementId === figureId)?.src,
    ).toBe('media/original.svg');
    await store.commit(request(store, [{ op: 'element.remove', pageId, elementId: figureId }]));
    await store.commit(request(store, [{ op: 'recipe.reset', pageId, instanceId: 'figure1' }]));
    expect(store.readPage(pageId).metadata.components?.figure1.slots.figure).toBeNull();
    expect(
      store.readPage(pageId).data.elements.some((element) => element.elementId === figureId),
    ).toBe(false);
  });

  it('invalidates affected render revisions and emits an event for asset-only changes', async () => {
    const files = await fixture();
    await fs.mkdir(path.join(files.root, 'media'));
    const asset = path.join(files.root, 'media/original.svg');
    await fs.writeFile(asset, '<svg>before</svg>');
    const store = await open(files);
    const before = store.getSnapshot();
    const events: DocumentEvent[] = [];
    store.subscribe((event) => events.push(event));
    await fs.writeFile(asset, '<svg>changed source pixels</svg>');
    const after = await store.refreshExternal();
    expect(after.pages[0].pageRevision).toBe(before.pages[0].pageRevision);
    expect(after.pages[0].renderRevision).not.toBe(before.pages[0].renderRevision);
    expect(after.pages[0].assetRevisions?.['media/original.svg']).toBe(
      hashBytes('<svg>changed source pixels</svg>'),
    );
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('external');
    expect(events[0].changedPages[before.pages[0].pageId]).toMatchObject({
      before: before.pages[0].pageRevision,
      after: before.pages[0].pageRevision,
      beforeRenderRevision: before.pages[0].renderRevision,
      afterRenderRevision: after.pages[0].renderRevision,
    });
    await store.refreshExternal();
    expect(events).toHaveLength(1);
    expect(await fs.readFile(path.join(files.root, 'pages/a.page'), 'utf8')).toBe(pageSource);
  });

  it('relinks an externally renamed page without rewriting or duplicating its bytes', async () => {
    const files = await fixture();
    const store = await open(files);
    const page = store.getSnapshot().pages[0];
    const movedPath = 'pages/renamed.page';
    await fs.rename(path.join(files.root, page.path), path.join(files.root, movedPath));
    const transaction = request(store, [
      { op: 'page.relink', pageId: page.pageId, path: movedPath },
    ]);
    transaction.expected.pages = { [page.pageId]: hashBytes(pageSource) };
    await store.commit(transaction);
    expect(store.readPage(page.pageId).path).toBe(movedPath);
    expect(store.readPage(page.pageId).shortCode).toBe(page.shortCode);
    expect(await fs.readFile(path.join(files.root, movedPath), 'utf8')).toBe(pageSource);
    await expect(fs.access(path.join(files.root, page.path))).rejects.toMatchObject({
      code: 'ENOENT',
    });
  });

  it('verifies journal bytes against recorded hashes before recovery writes', async () => {
    const files = await fixture();
    const store = await open({
      ...files,
      afterWrite: async () => {
        throw new Error('simulated crash');
      },
    });
    const metadataBefore = await fs.readFile(path.join(files.root, METADATA_PATH), 'utf8');
    await expect(store.commit(request(store, [{ op: 'page.add' }]))).rejects.toMatchObject({
      code: 'PENDING_RECOVERY',
    });
    const journalPath = path.join(files.stateDir, 'pending.json');
    const journal = JSON.parse(await fs.readFile(journalPath, 'utf8'));
    const metadataChange = journal.record.files.find(
      (file: { role: string }) => file.role === 'metadata',
    );
    metadataChange.after += ' ';
    await fs.writeFile(journalPath, JSON.stringify(journal));
    await store.close();
    await expect(openPptdStore(files)).rejects.toMatchObject({ code: 'RECOVERY_REQUIRED' });
    expect(await fs.readFile(path.join(files.root, METADATA_PATH), 'utf8')).toBe(metadataBefore);
  });

  it('does not rewrite opaque extension fields that happen to contain an old element ID', async () => {
    const files = await fixture();
    await fs.writeFile(
      path.join(files.root, 'pages/a.page'),
      pageSource.replace(
        'opaque: { nested: [keep, this] }',
        'opaque: { target: title, elementId: title }',
      ),
    );
    const store = await open(files);
    const original = store.getSnapshot().pages[0];
    const result = await store.commit(
      request(store, [{ op: 'page.duplicate', pageId: original.pageId }]),
    );
    const copied = store.readPage(result.createdPages[0].pageId);
    expect(copied.data.elements[0].elementId).not.toBe('title');
    expect(copied.data.elements[0].opaque).toEqual({ target: 'title', elementId: 'title' });
  });

  it('derives review revision status without authenticating approval and invalidates text or asset changes', async () => {
    const files = await fixture();
    await fs.mkdir(path.join(files.root, 'media'));
    const asset = path.join(files.root, 'media/original.svg');
    await fs.writeFile(asset, '<svg>original evidence</svg>');
    const store = await open(files);
    const original = store.getSnapshot().pages[0];
    const metadataPath = path.join(files.root, METADATA_PATH);
    const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
    const review = {
      renderRevision: original.renderRevision,
      author: 'Existing author label',
      quote: '保留原构图',
      approved: true,
      legacy: { arbitrary: ['preserved', 7] },
    };
    metadata.slides[original.pageId].lastAuthorReview = review;
    const metadataSource = `${JSON.stringify(metadata, null, 2)}\n`;
    await fs.writeFile(metadataPath, metadataSource);
    await store.refreshExternal();
    expect(store.readPage(original.pageId).authorReview).toEqual({
      status: 'current',
      recordedRenderRevision: original.renderRevision,
      currentRenderRevision: original.renderRevision,
      approvalVerified: false,
    });
    const changed = await store.commit(
      request(store, [
        {
          op: 'element.patch',
          pageId: original.pageId,
          elementId: 'title',
          set: { 'content.text': 'Changed evidence summary' },
        },
      ]),
    );
    expect(store.readPage(original.pageId).authorReview?.status).toBe('stale');
    expect(store.readPage(original.pageId).metadata.lastAuthorReview).toEqual(review);
    expect(await fs.readFile(metadataPath, 'utf8')).toBe(metadataSource);
    await store.undo(changed.operationId);
    expect(store.readPage(original.pageId).authorReview?.status).toBe('current');
    await fs.writeFile(asset, '<svg>changed evidence image</svg>');
    await store.refreshExternal();
    const afterImage = store.readPage(original.pageId);
    expect(afterImage.pageRevision).toBe(original.pageRevision);
    expect(afterImage.authorReview?.status).toBe('stale');
    expect(afterImage.authorReview?.approvalVerified).toBe(false);
    expect(afterImage.metadata.lastAuthorReview).toEqual(review);
    expect(await fs.readFile(metadataPath, 'utf8')).toBe(metadataSource);
  });

  it('preserves arbitrary legacy review payloads and reports missing or invalid revisions as unverified', async () => {
    const files = await fixture();
    const store = await open(files);
    const pageId = store.getSnapshot().pages[0].pageId;
    expect(store.readPage(pageId).authorReview?.status).toBe('unverified');
    const metadataPath = path.join(files.root, METADATA_PATH);
    const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
    for (const legacy of [
      null,
      '原始作者的任意文字',
      ['previous', { note: true }],
      { renderRevision: 'old-version-label', payload: { keep: 1 } },
      { approved: true },
    ]) {
      metadata.slides[pageId].lastAuthorReview = legacy;
      const source = `\uFEFF${JSON.stringify(metadata, null, 4)}\r\n`;
      await fs.writeFile(metadataPath, source);
      await store.refreshExternal();
      const page = store.readPage(pageId);
      expect(page.metadata.lastAuthorReview).toEqual(legacy);
      expect(page.authorReview).toEqual({
        status: 'unverified',
        recordedRenderRevision: null,
        currentRenderRevision: page.renderRevision,
        approvalVerified: false,
      });
      expect(await fs.readFile(metadataPath, 'utf8')).toBe(source);
    }
  });

  it('rejects all shared-API review writes and removals regardless of the caller actor label', async () => {
    const files = await fixture();
    const store = await open(files);
    const page = store.getSnapshot().pages[0];
    const metadataPath = path.join(files.root, METADATA_PATH);
    const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
    const review = { renderRevision: page.renderRevision, authorNote: 'Original private record' };
    metadata.slides[page.pageId].lastAuthorReview = review;
    const source = `${JSON.stringify(metadata, null, 2)}\n`;
    await fs.writeFile(metadataPath, source);
    await store.refreshExternal();
    const edits: PptdOperation[] = [
      {
        op: 'metadata.patch',
        pageId: page.pageId,
        set: { lastAuthorReview: { approved: true, renderRevision: page.renderRevision } },
      },
      {
        op: 'metadata.patch',
        pageId: page.pageId,
        set: { 'lastAuthorReview.renderRevision': page.renderRevision },
      },
      {
        op: 'metadata.patch',
        pageId: page.pageId,
        set: { 'lastAuthorReview.author': 'Agent acting as author' },
      },
      { op: 'metadata.patch', pageId: page.pageId, set: {}, unset: ['lastAuthorReview'] },
      {
        op: 'metadata.patch',
        pageId: page.pageId,
        set: {},
        unset: ['lastAuthorReview.authorNote'],
      },
    ];
    for (const edit of edits) {
      const transaction = request(store, [
        {
          op: 'element.patch',
          pageId: page.pageId,
          elementId: 'title',
          set: { 'content.text': 'Must remain an uncommitted draft' },
        },
        edit,
      ]);
      transaction.actor = 'author';
      await expect(store.commit(transaction)).rejects.toMatchObject({ code: 'INVALID_REQUEST' });
      expect(await fs.readFile(metadataPath, 'utf8')).toBe(source);
      expect(await fs.readFile(path.join(files.root, page.path), 'utf8')).toBe(pageSource);
    }
    await store.commit(
      request(store, [
        {
          op: 'metadata.patch',
          pageId: page.pageId,
          set: { 'designIntent.purpose': 'Updated scientific question' },
        },
      ]),
    );
    expect(store.readPage(page.pageId).metadata.lastAuthorReview).toEqual(review);
    expect(store.readPage(page.pageId).authorReview?.status).toBe('current');
  });
});
