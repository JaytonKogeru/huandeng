import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { presentationSnapshot } from './presentation-snapshot';
import { emptyStory, type ProjectModel } from './project-model';
import { openPptdStore, type PptdStore } from './store';
import type { DeckSnapshot, PageVersionSnapshot, PptdOperation } from './types';

const directories: string[] = [];
const stores: PptdStore[] = [];
afterEach(async () => {
  await Promise.allSettled(stores.splice(0).map((store) => store.close()));
  await Promise.all(
    directories.splice(0).map((directory) => fs.rm(directory, { recursive: true, force: true })),
  );
});

async function fixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'huandeng-presentation-'));
  directories.push(root);
  await fs.mkdir(path.join(root, 'pages'));
  await fs.mkdir(path.join(root, 'media'));
  await fs.writeFile(
    path.join(root, 'deck.pptd'),
    'size: [960, 540]\ntheme: {background: "#ffffff"}\npages: [pages/a.page, pages/b.page]\n',
  );
  await fs.writeFile(
    path.join(root, 'pages/a.page'),
    '# Preserve this source\nelements:\n  - elementId: image\n    elementType: image\n    bounds: [10, 10, 300, 200]\n    src: media/figure.png\nnotes: Original notes\n',
  );
  await fs.writeFile(path.join(root, 'pages/b.page'), 'elements: []\nnotes: Sibling notes\n');
  await fs.writeFile(path.join(root, 'media/figure.png'), 'Original figure');
  const store = await openPptdStore({
    entryPath: path.join(root, 'deck.pptd'),
    stateDir: path.join(root, 'runtime'),
  });
  stores.push(store);
  const first = store.getSnapshot().pages[0];
  const commit = (operations: PptdOperation[]) => {
    const snapshot = store.getSnapshot();
    return store.commit({
      requestId: randomUUID(),
      deckId: snapshot.deckId,
      actor: 'test',
      expected: {
        metadata: snapshot.metadataRevision,
        manifest: snapshot.manifestRevision,
        pages: Object.fromEntries(snapshot.pages.map((page) => [page.pageId, page.pageRevision])),
      },
      operations,
    });
  };
  const save = (label: string) => {
    const snapshot = store.getSnapshot();
    return store.createPageCheckpoint({
      pageId: first.pageId,
      requestId: randomUUID(),
      label,
      expectedPageRevision: snapshot.pages[0].pageRevision,
      expectedMetadataRevision: snapshot.metadataRevision,
    });
  };
  const initial = await save('Original result');
  await commit([{ op: 'page.notes.set', pageId: first.pageId, text: 'Revised notes' }]);
  await fs.writeFile(path.join(root, 'media/figure.png'), 'Revised figure');
  await store.refreshExternal();
  const revised = await save('Revised result');
  await commit([{ op: 'page.notes.set', pageId: first.pageId, text: 'Current Main notes' }]);
  const project: ProjectModel = {
    schemaVersion: 1,
    mainStory: emptyStory(),
    sections: [],
    presentations: [
      {
        id: 'seminar',
        title: 'Seminar',
        story: emptyStory(),
        items: [
          { id: 'live', kind: 'page', pageId: first.pageId },
          { id: 'original', kind: 'page', pageId: first.pageId, versionId: initial.versionId },
          {
            id: 'revised',
            kind: 'page',
            pageId: first.pageId,
            versionId: revised.versionId,
            notes: 'This occurrence explains the revised result',
          },
          { id: 'empty-notes', kind: 'page', pageId: first.pageId, notes: '' },
          {
            id: 'original-again',
            kind: 'page',
            pageId: first.pageId,
            versionId: initial.versionId,
            notes: 'Revisit the original',
          },
        ],
      },
    ],
  };
  await commit([{ op: 'project.replace', project }]);
  const readVersion = vi.fn((pageId: string, versionId: string) =>
    store.readPageVersion(pageId, versionId),
  );
  return { root, store, first, initial, revised, project, readVersion };
}

function withSinglePin(snapshot: DeckSnapshot, versionId: string): DeckSnapshot {
  const result = structuredClone(snapshot);
  const pageId = result.pages[0].pageId;
  result.metadata.project = {
    schemaVersion: 1,
    mainStory: emptyStory(),
    sections: [],
    presentations: [
      {
        id: 'seminar',
        title: 'Seminar',
        story: emptyStory(),
        items: [{ id: 'pin', kind: 'page', pageId, versionId }],
      },
    ],
  };
  return result;
}

describe('presentation snapshot integration', () => {
  it('resolves current and two pinned versions of one page without changing Main Slides or archived notes', async () => {
    const { root, store, first, initial, readVersion } = await fixture();
    const canonical = store.getSnapshot();
    const sourceBefore = await fs.readFile(path.join(root, first.path), 'utf8');
    const metadataBefore = await fs.readFile(path.join(root, '.huandeng/project.json'), 'utf8');
    const result = await presentationSnapshot(canonical, 'seminar', readVersion);
    expect(result).toMatchObject({ title: 'Seminar', presentationId: 'seminar', writable: false });
    expect(result.pages).toHaveLength(5);
    expect(new Set(result.pages.map((page) => page.pageId))).toEqual(new Set([first.pageId]));
    expect(new Set(result.pages.map((page) => page.occurrenceId)).size).toBe(5);
    expect(result.pages.map((page) => page.data.notes)).toEqual([
      'Current Main notes',
      'Original notes',
      'This occurrence explains the revised result',
      '',
      'Revisit the original',
    ]);
    expect(result.pages[2].presentationNotes).toBe('This occurrence explains the revised result');
    expect(result.pages[3].presentationNotes).toBe('');
    expect(readVersion).toHaveBeenCalledTimes(2);
    expect(result.pages[0].data.elements[0].src).toBe('media/figure.png');
    const originalAsset = String(result.pages[1].data.elements[0].src);
    const revisedAsset = String(result.pages[2].data.elements[0].src);
    expect(originalAsset).not.toBe(revisedAsset);
    expect(await fs.readFile(path.join(root, originalAsset), 'utf8')).toBe('Original figure');
    expect(await fs.readFile(path.join(root, revisedAsset), 'utf8')).toBe('Revised figure');
    expect(result.pages[1].metadata.themeOverride).toEqual({ background: '#ffffff' });
    expect(result.manifest.pages).toHaveLength(5);
    expect(canonical.pages).toHaveLength(2);
    expect(store.getSnapshot()).toEqual(canonical);
    expect(await fs.readFile(path.join(root, first.path), 'utf8')).toBe(sourceBefore);
    expect(await fs.readFile(path.join(root, '.huandeng/project.json'), 'utf8')).toBe(
      metadataBefore,
    );
    expect((await store.readPageVersion(first.pageId, initial.versionId)).page.data.notes).toBe(
      'Original notes',
    );
    result.pages[1].data.notes = 'Changed only in resolved output';
    result.pages[1].metadata.label = 'Changed label';
    expect(store.getSnapshot()).toEqual(canonical);
    expect(result.pages[4].metadata.label).toBe(first.metadata.label);
  });

  it('clones Main Slides without loading versions or adding presentation metadata', async () => {
    const { store, readVersion } = await fixture();
    const canonical = store.getSnapshot();
    const result = await presentationSnapshot(canonical, null, readVersion);
    expect(result).toEqual(canonical);
    expect(result).not.toBe(canonical);
    expect(readVersion).not.toHaveBeenCalled();
    result.pages[0].data.notes = 'Detached copy';
    expect(canonical.pages[0].data.notes).toBe('Current Main notes');
  });

  it('rejects operation journal IDs and malformed checkpoint IDs before reading a version', async () => {
    const { store, readVersion } = await fixture();
    for (const versionId of ['journal:transient-operation', 'checkpoint:invalid']) {
      await expect(
        presentationSnapshot(withSinglePin(store.getSnapshot(), versionId), 'seminar', readVersion),
      ).rejects.toMatchObject({ code: 'INVALID_REQUEST' });
    }
    expect(readVersion).not.toHaveBeenCalled();
  });

  it('rejects a pinned canvas of a different size and never falls back to a live page', async () => {
    const { store, first, initial } = await fixture();
    const pinned = await store.readPageVersion(first.pageId, initial.versionId);
    pinned.size = [1920, 1080];
    const original = store.getSnapshot();
    await expect(
      presentationSnapshot(
        withSinglePin(original, initial.versionId),
        'seminar',
        async () => pinned,
      ),
    ).rejects.toMatchObject({ code: 'INVALID_DOCUMENT' });
    expect(store.getSnapshot()).toEqual(original);
  });

  it('rejects a wrong page, wrong version, journal summary or nonarchived result', async () => {
    const { store, first, initial } = await fixture();
    const pinned = await store.readPageVersion(first.pageId, initial.versionId);
    const corruptions: Array<(value: PageVersionSnapshot) => void> = [
      (value) => {
        value.page.pageId = 'other-page';
      },
      (value) => {
        value.version.pageId = 'other-page';
      },
      (value) => {
        value.version.versionId = 'checkpoint:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
      },
      (value) => {
        value.version.kind = 'edit';
      },
      (value) => {
        value.assets = 'current-project';
      },
    ];
    for (const corrupt of corruptions) {
      const value = structuredClone(pinned);
      corrupt(value);
      await expect(
        presentationSnapshot(
          withSinglePin(store.getSnapshot(), initial.versionId),
          'seminar',
          async () => value,
        ),
      ).rejects.toMatchObject({ code: 'INVALID_DOCUMENT' });
    }
  });

  it('rejects corrupted checkpoint assets through the real archive reader', async () => {
    const { root, store, first, initial, readVersion } = await fixture();
    const pinned = await store.readPageVersion(first.pageId, initial.versionId);
    await fs.writeFile(
      path.join(root, String(pinned.page.data.elements[0].src)),
      'Tampered figure',
    );
    await expect(
      presentationSnapshot(
        withSinglePin(store.getSnapshot(), initial.versionId),
        'seminar',
        readVersion,
      ),
    ).rejects.toMatchObject({ code: 'INVALID_DOCUMENT' });
    expect(store.readPage(first.pageId).data.notes).toBe('Current Main notes');
  });
});
