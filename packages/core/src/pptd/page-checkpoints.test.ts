import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { projectTestDirectory } from './project-directory.test-utils';
import { openPptdStore, type PptdStore } from './store';
import type { CreatePageCheckpointRequest, PptdOperation } from './types';

const temporary: string[] = [];
const stores: PptdStore[] = [];
afterEach(async () => {
  await Promise.allSettled(stores.splice(0).map((store) => store.close()));
  await Promise.all(
    temporary.splice(0).map((directory) => fs.rm(directory, { recursive: true, force: true })),
  );
});

async function fixture() {
  const directory = await projectTestDirectory('huandeng-checkpoints-', [
    'project',
    'moved-project',
  ]);
  temporary.push(directory);
  const root = path.join(directory, 'project');
  await fs.mkdir(path.join(root, 'pages'), { recursive: true });
  await fs.mkdir(path.join(root, 'media'));
  const entryPath = path.join(root, 'deck.pptd');
  await fs.writeFile(entryPath, 'size: [960, 540]\npages: [pages/a.page, pages/b.page]\n');
  const source =
    '# Preserve author comments\nelements:\n  - elementId: figure\n    elementType: image\n    bounds: [10, 20, 300, 200]\n    src: media/figure.png\n    opaque: { preserve: true }\nnotes: Original\n';
  await fs.writeFile(path.join(root, 'pages/a.page'), source);
  await fs.writeFile(path.join(root, 'pages/b.page'), source.replace('Original', 'Sibling'));
  await fs.writeFile(path.join(root, 'media/figure.png'), 'original image bytes');
  const store = await openPptdStore({ entryPath, stateDir: path.join(directory, 'runtime') });
  stores.push(store);
  return { store, directory, root, source, entryPath };
}

function edit(store: PptdStore, operations: PptdOperation[]) {
  const snapshot = store.getSnapshot();
  return store.commit({
    requestId: randomUUID(),
    deckId: snapshot.deckId,
    actor: 'test',
    expected: {
      pages: Object.fromEntries(snapshot.pages.map((page) => [page.pageId, page.pageRevision])),
      manifest: snapshot.manifestRevision,
      metadata: snapshot.metadataRevision,
    },
    operations,
  });
}

function checkpoint(store: PptdStore, label = 'Evidence complete'): CreatePageCheckpointRequest {
  const snapshot = store.getSnapshot();
  return {
    pageId: snapshot.pages[0].pageId,
    requestId: randomUUID(),
    label,
    expectedPageRevision: snapshot.pages[0].pageRevision,
    expectedMetadataRevision: snapshot.metadataRevision,
    actor: 'human',
  };
}

describe('named portable page versions', () => {
  it('requires local image bytes while preserving external scientific citations', async () => {
    const { store } = await fixture();
    const pageId = store.getSnapshot().pages[0].pageId;
    await edit(store, [
      {
        op: 'element.patch',
        pageId,
        elementId: 'figure',
        set: { citation: { url: 'https://example.org/paper' } },
      },
    ]);
    await expect(store.createPageCheckpoint(checkpoint(store))).resolves.toMatchObject({
      kind: 'checkpoint',
    });
    await edit(store, [
      {
        op: 'element.patch',
        pageId,
        elementId: 'figure',
        set: { src: 'https://example.org/figure.png' },
      },
    ]);
    await expect(store.createPageCheckpoint(checkpoint(store))).rejects.toMatchObject({
      code: 'INVALID_DOCUMENT',
    });
  });

  it('keeps autosave operations separate from explicit milestones and retries idempotently', async () => {
    const { store, root, source } = await fixture();
    const page = store.getSnapshot().pages[0];
    expect(await store.pageCheckpoints(page.pageId)).toEqual([]);
    for (let index = 0; index < 5; index++)
      await edit(store, [{ op: 'page.notes.set', pageId: page.pageId, text: `Draft ${index}` }]);
    expect((await store.pageHistory(page.pageId)).length).toBeGreaterThan(5);
    expect(await store.pageCheckpoints(page.pageId)).toEqual([]);
    const before = await fs.readFile(path.join(root, page.path), 'utf8');
    const request = checkpoint(store);
    const saved = await store.createPageCheckpoint(request);
    expect(saved).toMatchObject({
      kind: 'checkpoint',
      summary: 'Evidence complete',
      current: true,
    });
    expect(await fs.readFile(path.join(root, page.path), 'utf8')).toBe(before);
    expect(await fs.readFile(path.join(root, 'pages/b.page'), 'utf8')).toBe(
      source.replace('Original', 'Sibling'),
    );
    await edit(store, [{ op: 'page.notes.set', pageId: page.pageId, text: 'New draft' }]);
    expect(await store.createPageCheckpoint(request)).toEqual(saved);
    await expect(
      store.createPageCheckpoint({ ...request, label: 'Different' }),
    ).rejects.toMatchObject({ code: 'REQUEST_ID_REUSE' });
    expect(await store.pageCheckpoints(page.pageId)).toMatchObject([
      { versionId: saved.versionId, current: false },
    ]);
    await expect(
      store.createPageCheckpoint({ ...request, requestId: randomUUID() }),
    ).rejects.toMatchObject({ code: 'REVISION_CONFLICT' });
  });

  it('restores archived assets without overwriting shared media and survives a project move', async () => {
    const { store, root, directory, source } = await fixture();
    const [first, sibling] = store.getSnapshot().pages;
    const saved = await store.createPageCheckpoint(checkpoint(store));
    await fs.writeFile(path.join(root, 'media/figure.png'), 'new image bytes');
    await store.refreshExternal();
    await edit(store, [{ op: 'page.notes.set', pageId: first.pageId, text: 'New draft' }]);
    const preview = await store.readPageVersion(first.pageId, saved.versionId);
    expect(preview.assets).toBe('archived');
    const archive = String(preview.page.data.elements[0].src);
    expect(archive).toMatch(/^media\/\.huandeng-versions\/[a-f0-9]{64}\.png$/);
    expect(await fs.readFile(path.join(root, archive), 'utf8')).toBe('original image bytes');
    await store.restorePageVersion({
      pageId: first.pageId,
      versionId: saved.versionId,
      requestId: randomUUID(),
      expectedPageRevision: store.readPage(first.pageId).pageRevision,
      expectedMetadataRevision: store.getSnapshot().metadataRevision,
    });
    expect(store.readPage(first.pageId).data.notes).toBe('Original');
    expect(store.readPage(first.pageId).data.elements[0].src).toBe(archive);
    expect(store.readPage(first.pageId).metadata.label).toBe(first.metadata.label);
    expect(await fs.readFile(path.join(root, 'media/figure.png'), 'utf8')).toBe('new image bytes');
    expect(await fs.readFile(path.join(root, sibling.path), 'utf8')).toBe(
      source.replace('Original', 'Sibling'),
    );
    expect(await fs.readFile(path.join(root, first.path), 'utf8')).toContain(
      '# Preserve author comments',
    );
    expect((await store.pageCheckpoints(first.pageId))[0].current).toBe(true);
    await store.close();
    const moved = path.join(directory, 'moved-project');
    await fs.cp(root, moved, { recursive: true });
    const reopened = await openPptdStore({
      entryPath: path.join(moved, 'deck.pptd'),
      stateDir: path.join(directory, 'new-runtime'),
    });
    stores.push(reopened);
    expect((await reopened.pageCheckpoints(first.pageId))[0].versionId).toBe(saved.versionId);
    expect(
      (await reopened.readPageVersion(first.pageId, saved.versionId)).page.data.elements[0].src,
    ).toBe(archive);
  });

  it('rejects corrupted archives and read-only version creation', async () => {
    const { store, root, directory, entryPath } = await fixture();
    const request = checkpoint(store);
    const saved = await store.createPageCheckpoint(request);
    const preview = await store.readPageVersion(request.pageId, saved.versionId);
    await fs.writeFile(path.join(root, String(preview.page.data.elements[0].src)), 'corrupted');
    await expect(store.readPageVersion(request.pageId, saved.versionId)).rejects.toMatchObject({
      code: 'INVALID_DOCUMENT',
    });
    await store.close();
    const readOnly = await openPptdStore({
      entryPath,
      stateDir: path.join(directory, 'readonly'),
      readOnly: true,
    });
    stores.push(readOnly);
    await expect(readOnly.createPageCheckpoint(request)).rejects.toMatchObject({
      code: 'READ_ONLY',
    });
  });

  it('keeps readable labels stable after reorder and never reuses a removed label', async () => {
    const { store } = await fixture();
    const [first, second] = store.getSnapshot().pages;
    expect(first.metadata.label).toBe('S1');
    expect(second.metadata.label).toBe('S2');
    expect(store.readPage('s1').pageId).toBe(first.pageId);
    await edit(store, [
      { op: 'page.move', pageId: first.pageId },
      { op: 'page.remove', pageId: second.pageId },
    ]);
    const added = await edit(store, [{ op: 'page.add' }]);
    expect(store.readPage(added.createdPages[0].pageId).metadata.label).toBe('S3');
    expect(store.readPage('S1').pageId).toBe(first.pageId);
    expect(store.readPage(first.shortCode ?? '').pageId).toBe(first.pageId);
  });
});
