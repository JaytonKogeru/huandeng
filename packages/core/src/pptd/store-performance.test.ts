import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { hashBytes, Persistence } from './persistence';
import { projectTestDirectory } from './project-directory.test-utils';
import { applySnapshotUpdate } from './snapshot-delta';
import { openPptdStore, type PptdStore } from './store';
import type { PptdOperation, TransactionRequest } from './types';

const cleanups: (() => Promise<unknown>)[] = [];

afterEach(async () => {
  vi.restoreAllMocks();
  for (const cleanup of cleanups.reverse()) await cleanup();
  cleanups.length = 0;
});

async function fixture() {
  const directory = await projectTestDirectory('huandeng-performance-');
  cleanups.push(() => fs.rm(directory, { recursive: true, force: true }));
  const root = path.join(directory, 'project');
  const stateDir = path.join(directory, 'state');
  await fs.mkdir(path.join(root, 'pages'), { recursive: true });
  await fs.mkdir(path.join(root, 'media'));
  await fs.writeFile(
    path.join(root, 'media/chart.svg'),
    '<svg xmlns="http://www.w3.org/2000/svg"/>',
  );
  await fs.writeFile(
    path.join(root, 'deck.pptd'),
    'version: v2\npages: [pages/a.page, pages/b.page]\n',
  );
  for (const name of ['a', 'b'])
    await fs.writeFile(
      path.join(root, 'pages', `${name}.page`),
      'elements:\n  - elementId: title\n    elementType: text\n    bounds: [10, 20, 300, 40]\n    content: {text: Original, fontSize: 24}\n    opaque: {nested: [keep, this]}\n  - elementId: image\n    elementType: image\n    bounds: [20, 80, 100, 100]\n    src: media/chart.svg\nnotes: Original\n',
    );
  const phases: string[] = [];
  const store = await openPptdStore({
    entryPath: path.join(root, 'deck.pptd'),
    stateDir,
    onTiming: ({ phase }) => phases.push(phase),
  });
  cleanups.push(() => store.close());
  return { root, stateDir, store, phases };
}

function request(store: PptdStore, operations: PptdOperation[]): TransactionRequest {
  const snapshot = store.getSnapshot();
  return {
    requestId: randomUUID(),
    actor: 'performance-test',
    deckId: snapshot.deckId,
    expected: {
      pages: Object.fromEntries(snapshot.pages.map((page) => [page.pageId, page.pageRevision])),
      manifest: snapshot.manifestRevision,
      metadata: snapshot.metadataRevision,
    },
    operations,
  };
}

describe('bounded project synchronization', () => {
  it('skips identical own bytes and unrelated files but observes same-size external writes and atomic replacement', async () => {
    const { root, store, phases } = await fixture();
    const page = store.getSnapshot().pages[0];
    const file = path.join(root, page.path);
    await store.commit(
      request(store, [{ op: 'page.notes.set', pageId: page.pageId, text: 'Local' }]),
    );
    await fs.writeFile(
      path.join(root, 'unreferenced.txt'),
      'Nothing in the document depends on this.',
    );
    phases.length = 0;
    await store.refreshWatchedPaths([file, file, path.join(root, 'unreferenced.txt')]);
    expect(phases).not.toContain('loadDocuments');
    const before = await fs.stat(file);
    const current = await fs.readFile(file, 'utf8');
    await fs.writeFile(file, current.replace('Local', 'Other'));
    await fs.utimes(file, before.atime, before.mtime);
    await store.refreshWatchedPaths([file]);
    expect(store.readPage(page.pageId).data.notes).toBe('Other');
    const temporary = path.join(root, 'pages', 'replacement.tmp');
    await fs.writeFile(temporary, current.replace('Local', 'Third'));
    await fs.rename(temporary, file);
    await store.refreshWatchedPaths([file]);
    expect(store.readPage(page.pageId).data.notes).toBe('Third');
    expect(phases.filter((phase) => phase === 'loadDocuments')).toHaveLength(2);
  });

  it('coalesces proven Windows directory echoes while preserving concurrent sibling writes and lone parents', async () => {
    const { root, store, phases } = await fixture();
    const [a, b] = store.getSnapshot().pages;
    const fileA = path.join(root, a.path),
      fileB = path.join(root, b.path),
      parent = path.dirname(fileA);
    await store.commit(request(store, [{ op: 'page.notes.set', pageId: a.pageId, text: 'Own' }]));
    phases.length = 0;
    await store.refreshWatchedPaths([parent, fileA]);
    expect(phases).not.toContain('loadDocuments');
    const stat = await fs.stat(fileB);
    const source = await fs.readFile(fileB, 'utf8');
    await fs.writeFile(fileB, source.replaceAll('Original', 'External'));
    await fs.utimes(fileB, stat.atime, stat.mtime);
    await store.refreshWatchedPaths([parent, fileA, fileB]);
    expect(store.readPage(b.pageId).data.notes).toBe('External');
    expect(phases.filter((phase) => phase === 'loadDocuments')).toHaveLength(1);
    await store.commit(
      request(store, [{ op: 'page.notes.set', pageId: a.pageId, text: 'Own again' }]),
    );
    phases.length = 0;
    await store.refreshWatchedPaths([parent]);
    expect(phases).toContain('loadDocuments');
    await store.commit(
      request(store, [{ op: 'page.notes.set', pageId: a.pageId, text: 'Own third' }]),
    );
    phases.length = 0;
    const temporary = path.join(parent, 'sibling-replacement.tmp');
    await fs.writeFile(temporary, source.replaceAll('Original', 'Replaced'));
    await fs.rename(temporary, fileB);
    await store.refreshWatchedPaths([fileA, parent, fileB]);
    expect(store.readPage(b.pageId).data.notes).toBe('Replaced');
    expect(phases).toContain('loadDocuments');
    await store.commit(
      request(store, [{ op: 'page.notes.set', pageId: a.pageId, text: 'Own fourth' }]),
    );
    phases.length = 0;
    await fs.writeFile(path.join(root, 'pages/c.page'), source);
    const manifest = path.join(root, 'deck.pptd');
    await fs.writeFile(
      manifest,
      'version: v2\npages: [pages/a.page, pages/b.page, pages/c.page]\n',
    );
    await store.refreshWatchedPaths([fileA, parent, manifest, path.join(root, 'pages/c.page')]);
    expect(store.getSnapshot().diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'INVALID_DOCUMENT',
          message: expect.stringContaining('pages/c.page'),
        }),
      ]),
    );
    expect(store.getSnapshot().pages).toHaveLength(2);
  });

  it('keeps parent-directory, referenced-asset and guidance notifications authoritative', async () => {
    const { root, store } = await fixture();
    const before = store.getSnapshot();
    await fs.writeFile(
      path.join(root, 'media/chart.svg'),
      '<svg xmlns="http://www.w3.org/2000/svg"><title>New</title></svg>',
    );
    await store.refreshWatchedPaths([path.join(root, 'media')]);
    expect(store.getSnapshot().pages[0].renderRevision).not.toBe(before.pages[0].renderRevision);
    const base = store.getSnapshot();
    await fs.writeFile(path.join(root, 'AGENTS.md'), 'Preserve scientific values.');
    await store.refreshWatchedPaths([path.join(root, 'AGENTS.md')]);
    const update = await store.getSnapshotUpdate(base);
    expect(applySnapshotUpdate(base, update)).toEqual(store.getSnapshot());
    expect(store.getSnapshot().sequence).toBeGreaterThan(base.sequence);
    expect(store.getSnapshot().projectGuidance?.text).toBe('Preserve scientific values.');
  });

  it('checks each asset once per transaction and isolates preview, failures and past snapshots', async () => {
    const { root, store, stateDir } = await fixture();
    const before = store.getSnapshot();
    const beforeBytes = JSON.stringify(before);
    const page = before.pages[0];
    const change = request(store, [
      {
        op: 'element.patch',
        pageId: page.pageId,
        elementId: 'title',
        set: { 'content.fontSize': 36 },
      },
    ]);
    const stat = vi.spyOn(fs, 'stat');
    const review = await store.previewForReview(change);
    expect(stat.mock.calls.filter(([file]) => String(file).endsWith('chart.svg'))).toHaveLength(1);
    expect(store.getSnapshot()).toEqual(before);
    (review.after.pages[0].data.elements[0].bounds as number[])[0] = 999;
    expect(store.readPage(page.pageId).data.elements[0].bounds?.[0]).toBe(10);
    const result = await store.commit(change, review.preview.previewHash);
    expect(JSON.stringify(before)).toBe(beforeBytes);
    const historyFile = path.join(
      stateDir,
      'history',
      `${hashBytes(result.operationId).slice(7)}.json`,
    );
    const historyBytes = await fs.readFile(historyFile, 'utf8');
    const later = store.getSnapshot();
    const laterBytes = JSON.stringify(later);
    await store.commit(
      request(store, [{ op: 'page.notes.set', pageId: page.pageId, text: 'Later' }]),
    );
    expect(JSON.stringify(later)).toBe(laterBytes);
    expect(await fs.readFile(historyFile, 'utf8')).toBe(historyBytes);
    await expect(store.commit({ ...change, requestId: randomUUID() })).rejects.toMatchObject({
      code: 'REVISION_CONFLICT',
    });
    expect(store.readPage(page.pageId).data.notes).toBe('Later');
    expect(await fs.readFile(path.join(root, before.pages[1].path), 'utf8')).toContain(
      'opaque: {nested: [keep, this]}',
    );
  });

  it('keeps nested groups and shared-style inputs immutable across previews and rejected preparation', async () => {
    const { store } = await fixture();
    const pageId = store.getSnapshot().pages[0].pageId;
    const style = { shadow: { color: '#123456', offsets: [1, 2] } };
    await store.commit(
      request(store, [
        {
          op: 'element.add',
          pageId,
          element: {
            elementId: 'caption',
            elementType: 'text',
            bounds: [30, 200, 100, 30],
            content: { text: 'Caption' },
            opaque: style,
          },
        },
        {
          op: 'element.add',
          pageId,
          element: {
            elementId: 'inner',
            elementType: 'group',
            bounds: [10, 20, 300, 210],
            children: ['title', 'caption'],
            opaque: style,
          },
        },
        {
          op: 'element.add',
          pageId,
          element: {
            elementId: 'outer',
            elementType: 'group',
            bounds: [10, 20, 300, 210],
            children: ['inner', 'image'],
          },
        },
      ]),
    );
    const before = store.getSnapshot();
    const bytes = JSON.stringify(before);
    const change = request(store, [
      {
        op: 'element.patch',
        pageId,
        elementId: 'caption',
        set: { 'opaque.shadow.offsets': [8, 9] },
      },
    ]);
    const review = await store.previewForReview(change);
    const previewGroup = review.after.pages[0].data.elements.find(
      (item) => item.elementId === 'inner',
    );
    if (!previewGroup) throw new Error('The nested group is missing from the review.');
    (previewGroup.children as string[]).push('missing');
    style.shadow.offsets[0] = 999;
    expect(JSON.stringify(store.getSnapshot())).toBe(bytes);
    await store.commit(change, review.preview.previewHash);
    expect(JSON.stringify(before)).toBe(bytes);
    const current = store.getSnapshot();
    const currentBytes = JSON.stringify(current);
    const rejected = request(store, [
      {
        op: 'element.patch',
        pageId,
        elementId: 'caption',
        set: { 'content.text': 'Must not leak' },
      },
      { op: 'element.patch', pageId, elementId: 'inner', set: { children: ['missing'] } },
    ]);
    await expect(store.preview(rejected)).rejects.toThrow();
    await expect(store.commit(rejected)).rejects.toThrow();
    expect(JSON.stringify(store.getSnapshot())).toBe(currentBytes);
    expect(
      store.readPage(pageId).data.elements.find((item) => item.elementId === 'caption')?.content
        ?.text,
    ).toBe('Caption');
    expect(
      store.readPage(pageId).data.elements.find((item) => item.elementId === 'inner')?.opaque,
    ).toEqual({ shadow: { color: '#123456', offsets: [1, 2] } });
  });

  it('includes every visually affected page in a reviewed manifest change', async () => {
    const { store } = await fixture();
    const before = store.getSnapshot();
    const [first, second] = before.pages;
    const change = request(store, [
      { op: 'page.move', pageId: first.pageId, afterPageId: second.pageId },
    ]);
    const reviewed = await store.previewForReview(change);
    expect(reviewed.preview.pages.map((page) => page.pageId).sort()).toEqual(
      before.pages.map((page) => page.pageId).sort(),
    );
    expect(Object.keys(reviewed.guard.pages).sort()).toEqual(
      before.pages.map((page) => page.pageId).sort(),
    );
    expect(reviewed.after.pages.map((page) => page.pageId)).toEqual([second.pageId, first.pageId]);
    expect(store.getSnapshot()).toEqual(before);
  });

  it('rejects reviewed assets changed without watcher delivery or between preparation and journaling', async () => {
    const { root, store, stateDir } = await fixture();
    const before = store.getSnapshot();
    const pageId = before.pages[0].pageId;
    const file = path.join(root, before.pages[0].path);
    const bytes = await fs.readFile(file);
    const change = request(store, [{ op: 'page.notes.set', pageId, text: 'Reviewed' }]);
    const reviewed = await store.previewForReview(change);
    const asset = path.join(root, 'media/chart.svg');
    const source = await fs.readFile(asset);
    await fs.writeFile(
      asset,
      '<svg xmlns="http://www.w3.org/2000/svg"><title>External</title></svg>',
    );
    expect(store.getSnapshot()).toEqual(before);
    await expect(
      store.commitReviewed(change, reviewed.preview.previewHash, reviewed.guard),
    ).rejects.toMatchObject({ code: 'REVISION_CONFLICT' });
    expect(await fs.readFile(file)).toEqual(bytes);
    await fs.writeFile(asset, source);
    const addedAsset = path.join(root, 'media/new.svg');
    await fs.writeFile(addedAsset, source);
    const addition = request(store, [
      {
        op: 'element.add',
        pageId,
        element: {
          elementId: 'new-image',
          elementType: 'image',
          bounds: [200, 80, 100, 100],
          src: 'media/new.svg',
        },
      },
    ]);
    const newReview = await store.previewForReview(addition);
    expect(newReview.guard.assets['media/new.svg']).toBe(hashBytes(source));
    const original = Persistence.prototype.commit;
    const intercepted = vi
      .spyOn(Persistence.prototype, 'commit')
      .mockImplementationOnce(async function (this: Persistence, record, beforeJournal) {
        await fs.writeFile(
          addedAsset,
          '<svg xmlns="http://www.w3.org/2000/svg"><title>Late replacement</title></svg>',
        );
        return original.call(this, record, beforeJournal);
      });
    await expect(
      store.commitReviewed(addition, newReview.preview.previewHash, newReview.guard),
    ).rejects.toMatchObject({ code: 'REVISION_CONFLICT' });
    intercepted.mockRestore();
    expect(await fs.readFile(file)).toEqual(bytes);
    await expect(fs.access(path.join(stateDir, 'pending.json'))).rejects.toMatchObject({
      code: 'ENOENT',
    });
    await fs.writeFile(addedAsset, source);
    const accepted = await store.commitReviewed(
      addition,
      newReview.preview.previewHash,
      newReview.guard,
    );
    expect(
      await store.commitReviewed(addition, newReview.preview.previewHash, newReview.guard),
    ).toEqual(accepted);
    expect(
      store.readPage(pageId).data.elements.some((element) => element.elementId === 'new-image'),
    ).toBe(true);
  });

  it('reconstructs one atomic latest snapshot across interleaved edits, deletion and cursor fallback', async () => {
    const { store } = await fixture();
    const base = store.getSnapshot();
    const [first, second] = base.pages;
    await store.commit(
      request(store, [{ op: 'page.notes.set', pageId: first.pageId, text: 'One' }]),
    );
    const one = store.getSnapshot();
    const firstUpdate = await store.getSnapshotUpdate(base);
    expect(firstUpdate.mode).toBe('delta');
    if (firstUpdate.mode === 'delta') expect(firstUpdate.changedPages).toHaveLength(1);
    await store.commit(
      request(store, [{ op: 'page.notes.set', pageId: second.pageId, text: 'Two' }]),
    );
    const latest = await store.getSnapshotUpdate(base);
    expect(applySnapshotUpdate(base, latest)).toEqual(store.getSnapshot());
    expect(() => applySnapshotUpdate(one, firstUpdate)).toThrow('base version');
    await store.commit(request(store, [{ op: 'page.remove', pageId: second.pageId }]));
    const removed = await store.getSnapshotUpdate(base);
    expect(applySnapshotUpdate(base, removed)).toEqual(store.getSnapshot());
    if (removed.mode === 'delta') expect(removed.removedPageIds).toEqual([second.pageId]);
    expect((await store.getSnapshotUpdate({ ...base, epoch: 'retired' })).mode).toBe('full');
    for (let i = 0; i < 8; i++)
      await store.commit(
        request(store, [{ op: 'page.notes.set', pageId: first.pageId, text: `Change ${i}` }]),
      );
    expect((await store.getSnapshotUpdate(base)).mode).toBe('full');
  });

  it('reuses validated history summaries, preserves pagination and detects changed corrupt records', async () => {
    const { store, stateDir } = await fixture();
    const pageId = store.getSnapshot().pages[0].pageId;
    for (let i = 0; i < 3; i++)
      await store.commit(request(store, [{ op: 'page.notes.set', pageId, text: `History ${i}` }]));
    const all = await store.history();
    const read = vi.spyOn(fs, 'readFile');
    expect(await store.history({ offset: 1, limit: 1 })).toEqual(all.slice(1, 2));
    expect(
      read.mock.calls.filter(([file]) => String(file).includes(`${path.sep}history${path.sep}`)),
    ).toHaveLength(0);
    all[0].before.pages[pageId] = 'sha256:corrupted-in-memory';
    expect((await store.history())[0].before.pages[pageId]).not.toBe('sha256:corrupted-in-memory');
    const file = path.join(stateDir, 'history', `${hashBytes(all[0].operationId).slice(7)}.json`);
    const previous = await fs.stat(file);
    const record = JSON.parse(await fs.readFile(file, 'utf8'));
    record.requestHash = `sha256:${'0'.repeat(64)}`;
    await fs.writeFile(file, `${JSON.stringify(record)}\n`);
    await fs.utimes(file, previous.atime, previous.mtime);
    await expect(store.history()).rejects.toMatchObject({ code: 'RECOVERY_REQUIRED' });
  });
});
