import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { hashBytes } from './persistence';
import { projectTestDirectory } from './project-directory.test-utils';
import { proposalHash } from './proposal';
import { openPptdStore, type PptdStore } from './store';
import type { DocumentEvent, PptdOperation, TransactionRequest } from './types';

const stores: PptdStore[] = [];
const temporary: string[] = [];

afterEach(async () => {
  await Promise.allSettled(stores.splice(0).map((store) => store.close()));
  await Promise.all(
    temporary.splice(0).map((directory) => fs.rm(directory, { recursive: true, force: true })),
  );
});

async function fixture() {
  const directory = await projectTestDirectory('huandeng-proposal-');
  temporary.push(directory);
  const root = path.join(directory, 'project');
  await fs.mkdir(path.join(root, 'pages'), { recursive: true });
  const entryPath = path.join(root, 'deck.pptd');
  await fs.writeFile(
    entryPath,
    'title: Proposal fixture\nsize: [960, 540]\npages: [pages/a.page, pages/b.page]\n',
  );
  const page =
    'elements:\n  - elementId: title\n    elementType: text\n    bounds: [30, 40, 400, 50]\n    content: { text: Original }\n    retained: { unknown: true }\nnotes: Original notes\n';
  await fs.writeFile(path.join(root, 'pages/a.page'), page);
  await fs.writeFile(path.join(root, 'pages/b.page'), page);
  const options = { entryPath, stateDir: path.join(directory, 'state') };
  const store = await openPptdStore(options);
  stores.push(store);
  return { store, directory, root, options };
}

function transaction(store: PptdStore, operations: PptdOperation[]): TransactionRequest {
  const snapshot = store.getSnapshot();
  return {
    deckId: snapshot.deckId,
    requestId: randomUUID(),
    actor: 'proposal-test',
    expected: {
      pages: Object.fromEntries(snapshot.pages.map((page) => [page.pageId, page.pageRevision])),
      manifest: snapshot.manifestRevision,
      metadata: snapshot.metadataRevision,
    },
    operations,
  };
}

async function bytes(directory: string, relative = ''): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  for (const entry of await fs.readdir(path.join(directory, relative), { withFileTypes: true })) {
    const next = path.join(relative, entry.name);
    if (entry.isDirectory()) Object.assign(result, await bytes(directory, next));
    else if (entry.isFile())
      result[next] = hashBytes(await fs.readFile(path.join(directory, next)));
  }
  return result;
}

describe('HUANDENG proposal preview', () => {
  it('reports a no-op without creating a receipt or history entry', async () => {
    const { store, directory } = await fixture();
    const pageId = store.getSnapshot().pages[0].pageId;
    const request = transaction(store, [{ op: 'page.notes.set', pageId, text: 'Original notes' }]);
    const before = await bytes(directory);
    const preview = await store.preview(request);
    expect(preview).toMatchObject({
      noOp: true,
      totalFileCount: 0,
      totalChangeCount: 0,
      createdPageCount: 0,
    });
    expect(await bytes(directory)).toEqual(before);
    expect(await store.history()).toEqual([]);
    expect((await store.commit(request, preview.previewHash)).noOp).toBe(true);
  });
  it('previews Story, content and click animation through the writer planner without any file/history/event changes', async () => {
    const { store, directory } = await fixture();
    const page = store.getSnapshot().pages[0];
    const before = await bytes(directory);
    const snapshot = store.getSnapshot();
    const events: DocumentEvent[] = [];
    store.subscribe((event) => events.push(event));
    const request = transaction(store, [
      {
        op: 'element.patch',
        pageId: page.pageId,
        elementId: 'title',
        set: { 'content.text': 'A clear question' },
      },
      { op: 'page.notes.set', pageId: page.pageId, text: 'Introduce the question.' },
      {
        op: 'metadata.patch',
        pageId: page.pageId,
        set: { 'designIntent.requestedChange': 'Introduce the question before the evidence.' },
      },
      {
        op: 'page.timeline.set',
        pageId: page.pageId,
        timeline: {
          schemaVersion: 2,
          effects: [
            {
              id: 'reveal',
              targetId: 'title',
              kind: 'fade-in',
              trigger: 'click',
              durationMs: 300,
              delayMs: 0,
            },
          ],
        },
      },
    ]);
    const preview = await store.preview(request);
    expect(preview).toMatchObject({
      kind: 'proposal-preview',
      previewHash: proposalHash(request),
      totalFileCount: 2,
      totalPageCount: 1,
      createdPageCount: 0,
      noOp: false,
    });
    expect(preview).not.toHaveProperty('operationId');
    expect(preview.changes).toContainEqual(
      expect.objectContaining({
        target: 'element',
        pageId: page.pageId,
        elementId: 'title',
        field: 'content.text',
        before: { present: true, value: 'Original' },
        after: { present: true, value: 'A clear question' },
      }),
    );
    expect(await bytes(directory)).toEqual(before);
    expect(store.getSnapshot()).toEqual(snapshot);
    expect(await store.history()).toEqual([]);
    expect(events).toEqual([]);
  });

  it('binds the entire payload, rechecks CAS, retries idempotently and preserves Undo/reopen', async () => {
    const { store, options } = await fixture();
    const page = store.getSnapshot().pages[0];
    const request = transaction(store, [
      { op: 'page.notes.set', pageId: page.pageId, text: 'Proposed notes' },
    ]);
    const preview = await store.preview(request);
    await expect(
      store.commit({ ...request, actor: 'changed' }, preview.previewHash),
    ).rejects.toMatchObject({ code: 'INVALID_REQUEST' });
    await store.commit(
      transaction(store, [{ op: 'page.notes.set', pageId: page.pageId, text: 'Human intervened' }]),
    );
    await expect(store.commit(request, preview.previewHash)).rejects.toMatchObject({
      code: 'REVISION_CONFLICT',
    });
    const fresh = transaction(store, [
      { op: 'page.notes.set', pageId: page.pageId, text: 'Merged notes' },
    ]);
    const freshPreview = await store.preview(fresh);
    const result = await store.commit(fresh, freshPreview.previewHash);
    expect(await store.commit(fresh, freshPreview.previewHash)).toEqual(result);
    expect(store.readPage(page.pageId).data.notes).toBe('Merged notes');
    await store.close();
    const reopened = await openPptdStore(options);
    stores.push(reopened);
    expect(await reopened.commit(fresh, freshPreview.previewHash)).toEqual(result);
    await reopened.undo(result.operationId);
    expect(reopened.readPage(page.pageId).data.notes).toBe('Human intervened');
  });

  it('uses commit validation for the entire proposal and rejects missing preconditions without writes', async () => {
    const { store, directory } = await fixture();
    const pageId = store.getSnapshot().pages[0].pageId;
    const request = transaction(store, [
      { op: 'page.notes.set', pageId, text: 'Would change' },
      { op: 'element.patch', pageId, elementId: 'missing', set: { rotation: 2 } },
    ]);
    const before = await bytes(directory);
    await expect(store.preview(request)).rejects.toMatchObject({ code: 'TARGET_NOT_FOUND' });
    await expect(store.commit(request)).rejects.toMatchObject({ code: 'TARGET_NOT_FOUND' });
    await expect(store.preview({ ...request, expected: {} })).rejects.toMatchObject({
      code: 'MISSING_PRECONDITION',
    });
    expect(await bytes(directory)).toEqual(before);
  });

  it('marks creation identities as provisional and only creates the page on apply', async () => {
    const { store, directory } = await fixture();
    const before = await bytes(directory);
    const request = transaction(store, [
      { op: 'page.add', page: { elements: [], notes: 'New page' } },
    ]);
    const preview = await store.preview(request);
    expect(preview.createdPageCount).toBe(1);
    expect(preview.pages).toHaveLength(1);
    expect(preview.pages[0].provisional).toBe(true);
    expect(preview.files.find((file) => file.role === 'page')?.provisional).toBe(true);
    expect(await bytes(directory)).toEqual(before);
    expect(store.getSnapshot().pages).toHaveLength(2);
    const result = await store.commit(request, preview.previewHash);
    expect(result.createdPages).toHaveLength(1);
    expect(store.readPage(result.createdPages[0].pageId).data.notes).toBe('New page');
  });

  it('reports the distinct repeated uses of a changed Main page', async () => {
    const { store } = await fixture();
    const pageId = store.getSnapshot().pages[0].pageId;
    await store.commit(
      transaction(store, [
        {
          op: 'project.replace',
          project: {
            schemaVersion: 1,
            mainStory: { purpose: '', audience: '', takeaway: '' },
            sections: [],
            presentations: [
              {
                id: 'talk',
                title: 'A talk',
                story: { purpose: '', audience: '', takeaway: '' },
                items: [
                  { id: 'opening', kind: 'page', pageId },
                  { id: 'return', kind: 'page', pageId, notes: 'Return to the question.' },
                ],
              },
            ],
          },
        },
      ]),
    );
    const preview = await store.preview(
      transaction(store, [
        {
          op: 'element.patch',
          pageId,
          elementId: 'title',
          set: { 'content.text': 'Shared change' },
        },
      ]),
    );
    const uses = preview.pages[0].usedBy.filter((use) => use.presentationId === 'talk');
    expect(uses.map((use) => use.position)).toEqual([1, 2]);
    expect(new Set(uses.map((use) => use.occurrenceId)).size).toBe(2);
  });

  // This case includes durable writes; Windows full-suite I/O contention exceeds the default deadline.
  it('bounds displayed changes and values while preserving the complete proposal payload', async () => {
    const { store } = await fixture();
    const pageId = store.getSnapshot().pages[0].pageId;
    const notes = 'Long scientific notes '.repeat(1000);
    const request = transaction(store, [
      { op: 'page.notes.set', pageId, text: notes },
      {
        op: 'element.patch',
        pageId,
        elementId: 'title',
        set: Object.fromEntries(
          Array.from({ length: 210 }, (_, index) => [`retained.field${index}`, `Item ${index}`]),
        ),
      },
    ]);
    const preview = await store.preview(request);
    expect(preview.changes).toHaveLength(200);
    expect(preview.changesTruncated).toBe(true);
    expect(preview.totalChangeCount).toBeGreaterThan(200);
    expect(preview.changes.find((change) => change.field === 'notes')?.after).toMatchObject({
      truncated: true,
      characters: JSON.stringify(notes).length,
    });
    await store.commit(request, preview.previewHash);
    expect(store.readPage(pageId).data.notes).toBe(notes);
    expect(store.readPage(pageId).data.elements[0].retained).toMatchObject({
      unknown: true,
      field209: 'Item 209',
    });
  }, 15_000);

  it('does not capture an external observation while rejecting a stale preview', async () => {
    const { store, directory, root } = await fixture();
    const pageId = store.getSnapshot().pages[0].pageId;
    const request = transaction(store, [{ op: 'page.notes.set', pageId, text: 'Proposal' }]);
    const file = path.join(root, 'pages/a.page');
    await fs.writeFile(
      file,
      (await fs.readFile(file, 'utf8')).replace('Original notes', 'External notes'),
    );
    const afterExternal = await bytes(directory);
    await expect(store.preview(request)).rejects.toMatchObject({ code: 'REVISION_CONFLICT' });
    expect(await bytes(directory)).toEqual(afterExternal);
    expect(store.readPage(pageId).data.notes).toBe('Original notes');
  });
});
