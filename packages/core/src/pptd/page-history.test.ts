import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { METADATA_PATH } from './identity';
import { projectTestDirectory } from './project-directory.test-utils';
import { openPptdStore, type PptdStore } from './store';
import { recordStory } from './story';
import type { PptdOperation, TransactionRequest } from './types';

const stores: PptdStore[] = [];
const temporary: string[] = [];
const original =
  '\uFEFF# author annotation\nelements:\n  - elementId: title\n    elementType: text\n    bounds: [10, 20, 300, 40]\n    content: { text: Original, fontSize: 24 }\n    opaque: { keep: true }\nnotes: First version\n'.replaceAll(
    '\n',
    '\r\n',
  );

afterEach(async () => {
  await Promise.allSettled(stores.splice(0).map((store) => store.close()));
  await Promise.all(
    temporary.splice(0).map((directory) => fs.rm(directory, { recursive: true, force: true })),
  );
});

async function fixture() {
  const directory = await projectTestDirectory('huandeng-history-');
  temporary.push(directory);
  const root = path.join(directory, 'project');
  const stateDir = path.join(directory, 'state');
  await fs.mkdir(path.join(root, 'pages'), { recursive: true });
  const entryPath = path.join(root, 'deck.pptd');
  await fs.writeFile(entryPath, 'size: [960, 540]\npages: [pages/a.page, pages/b.page]\n');
  await fs.writeFile(path.join(root, 'pages/a.page'), original);
  await fs.writeFile(path.join(root, 'pages/b.page'), original.replace('Original', 'Sibling'));
  return { root, stateDir, entryPath };
}

async function open(files: Awaited<ReturnType<typeof fixture>>) {
  const store = await openPptdStore(files);
  stores.push(store);
  return store;
}

function request(store: PptdStore, operations: PptdOperation[]): TransactionRequest {
  const snapshot = store.getSnapshot();
  return {
    requestId: randomUUID(),
    actor: 'external-agent',
    deckId: snapshot.deckId,
    expected: {
      pages: Object.fromEntries(snapshot.pages.map((page) => [page.pageId, page.pageRevision])),
      manifest: snapshot.manifestRevision,
      metadata: snapshot.metadataRevision,
    },
    operations,
  };
}

describe('per-page history', () => {
  it('previews durable versions and reads legacy journal history without changing the document', async () => {
    const files = await fixture();
    const store = await open(files);
    const first = store.getSnapshot().pages[0];
    const initial = (await store.pageHistory(first.shortCode ?? first.pageId))[0];
    expect(initial).toMatchObject({
      kind: 'initial',
      current: true,
      pageRevision: first.pageRevision,
    });
    const one = await store.commit(
      request(store, [{ op: 'page.notes.set', pageId: first.pageId, text: 'Second version' }]),
    );
    await store.commit(
      request(store, [{ op: 'page.notes.set', pageId: first.pageId, text: 'Third version' }]),
    );
    const timeline = await store.pageHistory(first.pageId);
    expect(timeline.map((item) => item.kind)).toEqual(['edit', 'edit', 'initial']);
    expect(timeline.map((item) => item.current)).toEqual([true, false, false]);
    const preview = await store.readPageVersion(first.pageId, `commit:${one.operationId}`);
    expect(preview.page.data.notes).toBe('Second version');
    expect(preview.assets).toBe('current-project');
    expect(store.readPage(first.pageId).data.notes).toBe('Third version');
    await store.close();
    const reopened = await open(files);
    expect(await reopened.pageHistory(first.pageId)).toEqual(timeline);
    await reopened.close();
    await fs.rm(path.join(files.stateDir, 'page-versions'), { recursive: true });
    const migrated = await open(files);
    const prior = await migrated.readPageVersion(first.pageId, initial.versionId);
    expect(prior.page.data.notes).toBe('First version');
    expect((await migrated.pageHistory(first.pageId)).map((item) => item.versionId)).toEqual(
      timeline.map((item) => item.versionId),
    );
  });

  it('restores any chosen page version as a new edit without reverting another page or order', async () => {
    const files = await fixture();
    const store = await open(files);
    const [first, sibling] = store.getSnapshot().pages;
    const initial = (await store.pageHistory(first.pageId))[0];
    await store.commit(
      request(store, [
        { op: 'page.notes.set', pageId: first.pageId, text: 'New notes' },
        {
          op: 'element.add',
          pageId: first.pageId,
          element: { elementId: 'added', elementType: 'shape', bounds: [4, 5, 6, 7] },
        },
        {
          op: 'metadata.patch',
          pageId: first.pageId,
          set: { designIntent: { purpose: 'New intent' } },
        },
      ]),
    );
    await store.commit(
      request(store, [
        { op: 'page.notes.set', pageId: sibling.pageId, text: 'Keep this newer sibling' },
        {
          op: 'metadata.patch',
          pageId: sibling.pageId,
          set: { designIntent: { purpose: 'Keep me' } },
        },
        { op: 'page.move', pageId: first.pageId },
      ]),
    );
    const manifest = await fs.readFile(files.entryPath);
    const siblingBytes = await fs.readFile(path.join(files.root, sibling.path));
    const siblingIdentity = store.readPage(sibling.pageId).metadata;
    const restore = {
      pageId: first.pageId,
      versionId: initial.versionId,
      requestId: randomUUID(),
      expectedPageRevision: store.readPage(first.pageId).pageRevision,
      expectedMetadataRevision: store.getSnapshot().metadataRevision,
      actor: 'huandeng-editor',
    };
    const result = await store.restorePageVersion(restore);
    expect(result.changedPages).toEqual([first.pageId]);
    expect(await fs.readFile(path.join(files.root, first.path), 'utf8')).toBe(original);
    expect(await fs.readFile(path.join(files.root, sibling.path))).toEqual(siblingBytes);
    expect(await fs.readFile(files.entryPath)).toEqual(manifest);
    expect(store.readPage(sibling.pageId).metadata).toEqual(siblingIdentity);
    expect(store.readPage(first.pageId).metadata).toEqual(first.metadata);
    expect(store.getSnapshot().pages.at(-1)?.pageId).toBe(first.pageId);
    const timeline = await store.pageHistory(first.pageId);
    expect(timeline[0]).toMatchObject({
      kind: 'restore',
      current: true,
      operationId: result.operationId,
      pageRevision: first.pageRevision,
    });
    expect(timeline.at(-1)?.current).toBe(false);
    expect(await store.restorePageVersion(restore)).toEqual(result);
    const alreadyCurrent = await store.restorePageVersion({
      ...restore,
      requestId: randomUUID(),
      expectedPageRevision: store.readPage(first.pageId).pageRevision,
      expectedMetadataRevision: store.getSnapshot().metadataRevision,
    });
    expect(alreadyCurrent.noOp).toBe(true);
    expect(await store.pageHistory(first.pageId)).toEqual(timeline);
    await store.close();
    expect(await (await open(files)).restorePageVersion(restore)).toEqual(result);
  });

  it('keeps a newer page or intent when a restore request has stale revisions', async () => {
    const files = await fixture();
    const store = await open(files);
    const first = store.getSnapshot().pages[0];
    const initial = (await store.pageHistory(first.pageId))[0];
    const staleMetadata = store.getSnapshot().metadataRevision;
    await store.commit(
      request(store, [
        { op: 'page.notes.set', pageId: first.pageId, text: 'Keep new page content' },
        {
          op: 'metadata.patch',
          pageId: first.pageId,
          set: { designIntent: { purpose: 'Keep intent' } },
        },
      ]),
    );
    const current = store.readPage(first.pageId);
    const pageBefore = await fs.readFile(path.join(files.root, first.path));
    const metadataBefore = await fs.readFile(path.join(files.root, METADATA_PATH));
    await expect(
      store.restorePageVersion({
        pageId: first.pageId,
        versionId: initial.versionId,
        requestId: randomUUID(),
        expectedPageRevision: first.pageRevision,
        expectedMetadataRevision: store.getSnapshot().metadataRevision,
      }),
    ).rejects.toMatchObject({ code: 'REVISION_CONFLICT' });
    await expect(
      store.restorePageVersion({
        pageId: first.pageId,
        versionId: initial.versionId,
        requestId: randomUUID(),
        expectedPageRevision: current.pageRevision,
        expectedMetadataRevision: staleMetadata,
      }),
    ).rejects.toMatchObject({ code: 'REVISION_CONFLICT' });
    expect(await fs.readFile(path.join(files.root, first.path))).toEqual(pageBefore);
    expect(await fs.readFile(path.join(files.root, METADATA_PATH))).toEqual(metadataBefore);
  });

  it('records external changes while open and closed and keeps metadata-only intent versions', async () => {
    const files = await fixture();
    const store = await open(files);
    const first = store.getSnapshot().pages[0];
    const intent = await recordStory(store, {
      pageId: first.pageId,
      requestId: randomUUID(),
      expectedMetadataRevision: store.getSnapshot().metadataRevision,
      actor: 'external-agent',
      source: 'user-request',
      recordedAt: new Date().toISOString(),
      requestedChange: 'Keep the evidence understandable',
      purpose: 'Explain evidence',
    });
    expect((await store.pageHistory(first.pageId))[0].operationId).toBe(intent.operationId);
    await fs.writeFile(
      path.join(files.root, first.path),
      original.replace('First version', 'External edit'),
    );
    await store.refreshExternal();
    const external = (await store.pageHistory(first.pageId))[0];
    expect(external).toMatchObject({ kind: 'external', actor: 'external', current: true });
    await store.close();
    await fs.writeFile(
      path.join(files.root, first.path),
      original.replace('First version', 'Edited while closed'),
    );
    const reopened = await open(files);
    const timeline = await reopened.pageHistory(first.pageId);
    expect(timeline.map((item) => item.kind)).toEqual(['external', 'external', 'edit', 'initial']);
    expect(timeline[0].versionId).not.toBe(external.versionId);
    const preview = await reopened.readPageVersion(first.pageId, external.versionId);
    expect(preview.page.data.notes).toBe('External edit');
    expect(preview.page.metadata.designIntent?.purpose).toBe('Explain evidence');
    expect(reopened.readPage(first.pageId).data.notes).toBe('Edited while closed');
    await reopened.refreshExternal();
    expect(await reopened.pageHistory(first.pageId)).toEqual(timeline);
  });
});
