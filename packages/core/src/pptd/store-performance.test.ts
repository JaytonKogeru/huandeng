import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { METADATA_PATH } from './identity';
import { hashBytes } from './persistence';
import { projectTestDirectory } from './project-directory.test-utils';
import {
  openPptdStore,
  type PptdCheckpointSnapshot,
  type PptdStore,
  type PptdTiming,
} from './store';
import type { TransactionRequest } from './types';

const temporary: string[] = [];
const stores: PptdStore[] = [];

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.allSettled(stores.splice(0).map((store) => store.close()));
  await Promise.all(
    temporary.splice(0).map((directory) => fs.rm(directory, { recursive: true, force: true })),
  );
});

async function fixture(count = 8) {
  const directory = await projectTestDirectory('huandeng-performance-');
  temporary.push(directory);
  const root = path.join(directory, 'project');
  const stateDir = path.join(directory, 'state');
  await fs.mkdir(path.join(root, 'pages'), { recursive: true });
  await fs.mkdir(path.join(root, 'media'));
  await fs.mkdir(path.join(root, '.huandeng'));
  const pages = Array.from({ length: count }, (_, index) => `pages/${index}.page`);
  const source =
    '# preserve this annotation\nelements:\n  - elementId: figure\n    elementType: image\n    bounds: [10, 10, 100, 100]\n    src: media/shared.svg\n  - elementId: title\n    elementType: text\n    bounds: [10, 120, 200, 40]\n    content: { text: Original }\nnotes: Original\n';
  await Promise.all(pages.map((page) => fs.writeFile(path.join(root, page), source)));
  await fs.writeFile(path.join(root, 'media/shared.svg'), '<svg>before</svg>');
  const entryPath = path.join(root, 'deck.pptd');
  await fs.writeFile(
    entryPath,
    JSON.stringify({ pages, theme: { background: { src: 'media/shared.svg' } } }),
  );
  await fs.writeFile(
    path.join(root, METADATA_PATH),
    JSON.stringify({
      schemaVersion: 1,
      deckId: 'performance-fixture',
      entry: 'deck.pptd',
      slides: Object.fromEntries(
        pages.map((page, index) => [
          `page-${index}`,
          {
            path: page,
            shortCode: `P${String(index).padStart(3, '0')}`,
            label: `S${index + 1}`,
            state: 'active',
          },
        ]),
      ),
    }),
  );
  return { root, stateDir, entryPath, source };
}

async function open(
  files: Awaited<ReturnType<typeof fixture>>,
  onTiming?: (sample: PptdTiming) => void,
) {
  const store = await openPptdStore({ ...files, onTiming });
  stores.push(store);
  return store;
}

function edit(store: PptdStore, text = 'Changed'): TransactionRequest {
  const snapshot = store.getSnapshot();
  const page = snapshot.pages[0];
  return {
    requestId: randomUUID(),
    actor: 'performance-test',
    deckId: snapshot.deckId,
    expected: { pages: { [page.pageId]: page.pageRevision } },
    operations: [{ op: 'page.notes.set', pageId: page.pageId, text }],
  };
}

describe('PPTD load and refresh performance contracts', () => {
  it('reads committed state in queue order without another disk scan and still explicitly refreshes external edits', async () => {
    const files = await fixture();
    const store = await open(files);
    const request = edit(store);
    const saving = store.commit(request);
    const current = store.getCurrentSnapshot();
    await saving;
    expect((await current).pages[0].data.notes).toBe('Changed');
    const readFile = vi.spyOn(fs, 'readFile');
    const copy = await store.getCurrentSnapshot();
    expect(readFile).not.toHaveBeenCalled();
    copy.pages[0].data.notes = 'Caller mutation';
    expect((await store.getCurrentSnapshot()).pages[0].data.notes).toBe('Changed');
    const file = path.join(files.root, 'pages/0.page');
    const stat = await fs.stat(file);
    await fs.writeFile(file, (await fs.readFile(file, 'utf8')).replace('Changed', 'Altered'));
    await fs.utimes(file, stat.atime, stat.mtime);
    expect((await store.getCurrentSnapshot()).pages[0].data.notes).toBe('Changed');
    await store.refreshExternalState();
    expect((await store.getCurrentSnapshot()).pages[0].data.notes).toBe('Altered');
    await expect(store.commit(request)).resolves.toMatchObject({ ok: true });
    expect((await store.getCurrentSnapshot()).pages[0].data.notes).toBe('Altered');
  });

  it('projects checkpoint file identities without page contents and isolates the projection from the document', async () => {
    const files = await fixture();
    const store = await open(files);
    let checkpoint: PptdCheckpointSnapshot | undefined;
    const unsubscribe = store.subscribe((event) => {
      checkpoint = store.getCheckpointSnapshot(event);
    });
    await store.commit(edit(store));
    unsubscribe();
    expect(checkpoint?.pages).toEqual([
      { pageId: 'page-0', pageRevision: store.readPage('page-0').pageRevision },
    ]);
    expect(Object.keys(checkpoint?.metadata.slides ?? {})).toEqual(['page-0']);
    if (!checkpoint) throw new Error('Expected a committed checkpoint projection');
    checkpoint.metadata.slides['page-0'].path = 'wrong.page';
    checkpoint.pages[0].pageRevision = 'sha256:tamper';
    expect(store.readPage('page-0').path).toBe('pages/0.page');
    expect(store.readPage('page-0').pageRevision).not.toBe('sha256:tamper');
  });

  it('fingerprints a shared asset once per scan while retaining every page dependency', async () => {
    const files = await fixture(24);
    const stat = vi.spyOn(fs, 'stat');
    const samples: PptdTiming[] = [];
    const store = await open(files, (sample) => samples.push(sample));
    const assetStats = () =>
      stat.mock.calls.filter(([file]) => String(file).endsWith('shared.svg'));
    expect(assetStats()).toHaveLength(1);
    expect(samples.find((sample) => sample.phase === 'assets')).toMatchObject({
      pages: 24,
      assetReferences: 24,
      uniqueAssets: 1,
    });
    expect(
      store
        .getSnapshot()
        .pages.every(
          (page) => page.assetRevisions?.['media/shared.svg'] === hashBytes('<svg>before</svg>'),
        ),
    ).toBe(true);
    await store.refreshExternal();
    expect(assetStats()).toHaveLength(2);
  });

  it('detects same-length external page edits even when the modified time is restored', async () => {
    const files = await fixture();
    const store = await open(files);
    const request = edit(store);
    const file = path.join(files.root, 'pages/0.page');
    const before = await fs.stat(file);
    const changed = files.source.replace('notes: Original', 'notes: External');
    expect(changed.length).toBe(files.source.length);
    await fs.writeFile(file, changed);
    await fs.utimes(file, before.atime, before.mtime);
    await expect(store.commit(request)).rejects.toMatchObject({ code: 'REVISION_CONFLICT' });
    expect(await fs.readFile(file, 'utf8')).toBe(changed);
    const refreshed = await store.refreshExternal();
    expect(refreshed.pages[0].data.notes).toBe('External');
  });

  it('refreshes every dependent page for a same-length asset replacement', async () => {
    const files = await fixture();
    const store = await open(files);
    const before = store.getSnapshot();
    await fs.writeFile(path.join(files.root, 'media/shared.svg'), '<svg>after!</svg>');
    const after = await store.refreshExternal();
    expect(after.pages.map((page) => page.pageRevision)).toEqual(
      before.pages.map((page) => page.pageRevision),
    );
    expect(
      after.pages.every(
        (page, index) => page.renderRevision !== before.pages[index].renderRevision,
      ),
    ).toBe(true);
    expect(
      after.pages.every(
        (page) => page.assetRevisions?.['media/shared.svg'] === hashBytes('<svg>after!</svg>'),
      ),
    ).toBe(true);
  });

  it('preserves per-page missing asset diagnostics and clears them after recovery', async () => {
    const files = await fixture();
    const store = await open(files);
    const asset = path.join(files.root, 'media/shared.svg');
    await fs.rm(asset);
    const missing = await store.refreshExternal();
    expect(missing.diagnostics.filter((item) => item.code === 'ASSET_UNAVAILABLE')).toHaveLength(8);
    expect(new Set(missing.diagnostics.map((item) => item.pageId)).size).toBe(8);
    expect(missing.pages.every((page) => page.assetRevisions?.['media/shared.svg'] === null)).toBe(
      true,
    );
    await fs.writeFile(asset, '<svg>restored</svg>');
    expect((await store.refreshExternal()).diagnostics).toEqual([]);
  });

  it('keeps cached documents independent of caller snapshot and page mutations', async () => {
    const files = await fixture();
    const store = await open(files);
    const snapshot = store.getSnapshot();
    snapshot.manifest.pages.reverse();
    snapshot.pages[0].data.notes = 'Snapshot tamper';
    snapshot.pages[0].metadata.themeOverride = { background: 'red' };
    store.readPage('page-0').data.notes = 'Page tamper';
    const refreshed = await store.refreshExternal();
    expect(refreshed.pages.map((page) => page.pageId)).toEqual(
      Array.from({ length: 8 }, (_, index) => `page-${index}`),
    );
    expect(refreshed.pages[0].data.notes).toBe('Original');
    expect(refreshed.pages[0].metadata.themeOverride).toBeUndefined();
    await store.commit(edit(store));
    expect(store.getSnapshot().pages[0].data.notes).toBe('Changed');
    expect(await fs.readFile(path.join(files.root, 'pages/1.page'), 'utf8')).toBe(files.source);
  });

  it('blocks writes after a cached page goes missing and recovers its preview when restored', async () => {
    const files = await fixture();
    const store = await open(files);
    const file = path.join(files.root, 'pages/1.page');
    await fs.rm(file);
    const missing = await store.refreshExternal();
    expect(missing.pages).toHaveLength(8);
    expect(missing.diagnostics.some((item) => item.severity === 'error')).toBe(true);
    await expect(store.commit(edit(store))).rejects.toMatchObject({ code: 'INVALID_DOCUMENT' });
    await fs.writeFile(file, files.source);
    const restored = await store.refreshExternal();
    expect(restored.diagnostics).toEqual([]);
    expect(restored.pages[1].data.notes).toBe('Original');
  });

  it('does not let timing observers interrupt a durable save', async () => {
    const files = await fixture();
    const store = await open(files, () => {
      throw new Error('telemetry unavailable');
    });
    const result = await store.commit(edit(store));
    expect(result.ok).toBe(true);
    expect(await fs.readFile(path.join(files.root, 'pages/0.page'), 'utf8')).toContain('Changed');
    expect(await store.commit(edit(store, 'Next'))).toMatchObject({ ok: true });
  });
});
