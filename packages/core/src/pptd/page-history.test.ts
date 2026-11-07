import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { METADATA_PATH } from './identity';
import { PageVersionArchive, type PageVersionState } from './page-history';
import { hashBytes } from './persistence';
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
  vi.restoreAllMocks();
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
  it('keeps 100 large external versions on disk with bounded hot contents and restores an old version', {
    timeout: 60_000,
  }, async () => {
    const files = await fixture();
    const store = await open(files);
    const first = store.getSnapshot().pages[0];
    let oldVersionId = '';
    let oldSource = '';
    for (let index = 0; index < 100; index++) {
      const source = original.replace('First version', `${index}:${'x'.repeat(128 * 1024)}`);
      await fs.writeFile(path.join(files.root, first.path), source);
      await store.refreshExternalState();
      if (index === 3) {
        oldVersionId = (await store.pageHistory(first.pageId))[0].versionId;
        oldSource = source;
      }
    }
    const archive = (store as unknown as { pageVersions: PageVersionArchive }).pageVersions;
    const usage = archive.cacheUsage();
    expect(usage.observations).toBe(102);
    expect(usage.entries).toBeLessThanOrEqual(usage.maxEntries);
    expect(usage.estimatedBytes).toBeLessThanOrEqual(usage.maxEstimatedBytes);
    expect(await fs.readdir(path.join(files.stateDir, 'page-versions'))).toHaveLength(102);
    const before = await store.pageHistory(first.pageId);
    expect(before).toHaveLength(101);
    await store.close();
    const reopened = await open(files);
    expect(await reopened.pageHistory(first.pageId)).toEqual(before);
    const preview = await reopened.readPageVersion(first.pageId, oldVersionId);
    expect(preview.page.data.notes).toBe(`3:${'x'.repeat(128 * 1024)}`);
    preview.page.data.notes = 'Caller mutation';
    expect((await reopened.readPageVersion(first.pageId, oldVersionId)).page.data.notes).toBe(
      `3:${'x'.repeat(128 * 1024)}`,
    );
    await reopened.restorePageVersion({
      pageId: first.pageId,
      versionId: oldVersionId,
      requestId: randomUUID(),
      expectedPageRevision: reopened.readPage(first.pageId).pageRevision,
      expectedMetadataRevision: reopened.getSnapshot().metadataRevision,
    });
    expect(await fs.readFile(path.join(files.root, first.path), 'utf8')).toBe(oldSource);
    expect((await reopened.pageHistory(first.pageId))[0]).toMatchObject({
      kind: 'restore',
      current: true,
    });
    const reopenedUsage = (
      reopened as unknown as { pageVersions: PageVersionArchive }
    ).pageVersions.cacheUsage();
    expect(reopenedUsage.entries).toBeLessThanOrEqual(reopenedUsage.maxEntries);
    expect(reopenedUsage.estimatedBytes).toBeLessThanOrEqual(reopenedUsage.maxEstimatedBytes);
  });

  it('rejects changed cold observation contents instead of returning a different historical version', async () => {
    const files = await fixture();
    const store = await open(files);
    const first = store.getSnapshot().pages[0];
    const initial = (await store.pageHistory(first.pageId))[0];
    for (let index = 0; index < 10; index++) {
      await fs.writeFile(
        path.join(files.root, first.path),
        original.replace('First version', `External ${index}`),
      );
      await store.refreshExternalState();
    }
    const historyFile = path.join(
      files.stateDir,
      'page-versions',
      `${hashBytes(initial.versionId).slice(7)}.json`,
    );
    const raw = await fs.readFile(historyFile, 'utf8');
    const changed = JSON.parse(raw);
    changed.state.source = original.replace('First version', 'Unexpected altered history');
    await fs.writeFile(historyFile, JSON.stringify(changed));
    await expect(store.readPageVersion(first.pageId, initial.versionId)).rejects.toMatchObject({
      code: 'RECOVERY_REQUIRED',
    });
    expect(store.readPage(first.pageId).data.notes).toBe('External 9');
  });

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

describe('bounded observation storage', () => {
  function state(notes: string): PageVersionState {
    return {
      source: JSON.stringify({ elements: [], notes }),
      metadata: { path: 'pages/a.page', shortCode: 'TEST', state: 'active' },
      size: [960, 540],
    };
  }

  it('does not retain a single oversized version in the hot cache and preserves metadata isolation', async () => {
    const files = await fixture();
    const archive = new PageVersionArchive(files.stateDir, false);
    const originalState = state('x'.repeat(3 * 1024 * 1024));
    await archive.initialize(new Map([['a', originalState]]), []);
    expect(archive.cacheUsage()).toMatchObject({ entries: 0, estimatedBytes: 0 });
    const version = archive.summaries('a', originalState, [])[0];
    const loaded = await archive.find('a', version.versionId, originalState, []);
    expect(loaded.state.source).toBe(originalState.source);
    loaded.state.metadata.path = 'pages/wrong.page';
    expect(
      (await archive.find('a', version.versionId, originalState, [])).state.metadata.path,
    ).toBe('pages/a.page');
    expect(archive.cacheUsage()).toMatchObject({ entries: 0, estimatedBytes: 0 });
    await archive.close();
  });

  it('archives read-only session observations in an owned temporary directory and removes it on close', async () => {
    const files = await fixture();
    const archive = new PageVersionArchive(files.stateDir, true);
    const temporaryFolder = vi.spyOn(fs, 'mkdtemp');
    const initial = state('Original');
    await archive.initialize(new Map([['a', initial]]), []);
    const directory = await temporaryFolder.mock.results[0].value;
    const version = archive.summaries('a', initial, [])[0];
    let current = initial;
    for (let index = 0; index < 12; index++) {
      current = state(`External ${index}`);
      await archive.observe('a', current, []);
    }
    expect(await fs.readdir(directory)).toHaveLength(13);
    expect(archive.summaries('a', current, [])).toHaveLength(13);
    expect((await archive.find('a', version.versionId, current, [])).state.source).toBe(
      initial.source,
    );
    expect(archive.cacheUsage()).toMatchObject({ temporary: true, maxEntries: 8 });
    expect(archive.cacheUsage().entries).toBeLessThanOrEqual(8);
    await expect(fs.stat(path.join(files.stateDir, 'page-versions'))).rejects.toMatchObject({
      code: 'ENOENT',
    });
    await archive.close();
    await expect(fs.stat(directory)).rejects.toMatchObject({ code: 'ENOENT' });
    expect(archive.cacheUsage().estimatedBytes).toBe(0);
  });

  it('reports unavailable read-only temporary storage without silently retaining history in memory', async () => {
    const files = await fixture();
    const archive = new PageVersionArchive(files.stateDir, true);
    vi.spyOn(fs, 'mkdtemp').mockRejectedValueOnce(
      Object.assign(new Error('No writable temporary storage'), { code: 'EACCES' }),
    );
    await expect(archive.initialize(new Map([['a', state('Original')]]), [])).rejects.toMatchObject(
      { code: 'HISTORY_UNAVAILABLE' },
    );
    expect(archive.cacheUsage()).toMatchObject({ entries: 0, observations: 0, temporary: false });
    await archive.close();
  });

  it('rejects malformed observations during initialization', async () => {
    const files = await fixture();
    await fs.mkdir(path.join(files.stateDir, 'page-versions'), { recursive: true });
    await fs.writeFile(path.join(files.stateDir, 'page-versions/broken.json'), '{"pageId":"a"}');
    const archive = new PageVersionArchive(files.stateDir, false);
    await expect(archive.initialize(new Map([['a', state('Original')]]), [])).rejects.toMatchObject(
      { code: 'RECOVERY_REQUIRED' },
    );
    await archive.close();
  });
});
