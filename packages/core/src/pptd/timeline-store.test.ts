import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { type PageTimeline, validateTimeline } from './animation-model';
import { projectTestDirectory } from './project-directory.test-utils';
import { openPptdStore, type PptdStore } from './store';
import { copiedTimelineTracks, knownTimeline } from './timeline-operations';
import type { PptdOperation } from './types';

const stores: PptdStore[] = [];
const temporary: string[] = [];
const source =
  '# Author annotation\nelements:\n  - elementId: title\n    elementType: text\n    bounds: [20, 30, 400, 50]\n    content: { text: Evidence, fontSize: 30 }\n  - elementId: box\n    elementType: shape\n    bounds: [80, 100, 100, 80]\n    shapeName: rect\nanimations: { legacy: keep }\nopaque: { author: keep }\n';

afterEach(async () => {
  await Promise.allSettled(stores.splice(0).map((store) => store.close()));
  await Promise.all(
    temporary.splice(0).map((directory) => fs.rm(directory, { recursive: true, force: true })),
  );
});

async function fixture() {
  const directory = await projectTestDirectory('huandeng-timeline-');
  temporary.push(directory);
  const root = path.join(directory, 'project');
  await fs.mkdir(path.join(root, 'pages'), { recursive: true });
  await fs.writeFile(
    path.join(root, 'deck.pptd'),
    'size: [960, 540]\npages: [pages/a.page, pages/b.page]\n',
  );
  await fs.writeFile(path.join(root, 'pages/a.page'), source);
  await fs.writeFile(path.join(root, 'pages/b.page'), source);
  const options = {
    entryPath: path.join(root, 'deck.pptd'),
    stateDir: path.join(directory, 'runtime'),
  };
  const store = await openPptdStore(options);
  stores.push(store);
  return { store, root, options };
}

function request(store: PptdStore, operations: PptdOperation[]) {
  const snapshot = store.getSnapshot();
  return {
    requestId: randomUUID(),
    deckId: snapshot.deckId,
    actor: 'test',
    expected: {
      pages: Object.fromEntries(snapshot.pages.map((page) => [page.pageId, page.pageRevision])),
      manifest: snapshot.manifestRevision,
      metadata: snapshot.metadataRevision,
    },
    operations,
  };
}

function timeline(): PageTimeline {
  return {
    schemaVersion: 1,
    durationMs: 2000,
    tracks: [
      {
        id: 'move',
        targetId: 'title',
        property: 'x',
        keyframes: [
          { id: 'start', timeMs: 0, value: 20, easing: 'ease-in-out' },
          { id: 'end', timeMs: 2000, value: 300, easing: 'linear' },
        ],
      },
      {
        id: 'fade',
        targetId: 'box',
        property: 'opacity',
        keyframes: [
          { id: 'fade-start', timeMs: 0, value: 0, easing: 'linear' },
          { id: 'fade-end', timeMs: 1000, value: 1, easing: 'hold' },
        ],
      },
    ],
    cues: [{ id: 'reveal', timeMs: 1000, label: 'Explain evidence' }],
  };
}

describe('timeline document transactions', () => {
  it('persists and reopens a timeline without changing comments, unknown fields or sibling bytes', async () => {
    const { store, root, options } = await fixture();
    const pageId = store.getSnapshot().pages[0].pageId;
    const change = request(store, [{ op: 'page.timeline.set', pageId, timeline: timeline() }]);
    const receipt = await store.commit(change);
    expect(await store.commit(change)).toEqual(receipt);
    expect(await fs.readFile(path.join(root, 'pages/b.page'), 'utf8')).toBe(source);
    expect(await fs.readFile(path.join(root, 'pages/a.page'), 'utf8')).toContain(
      '# Author annotation',
    );
    expect(store.readPage(pageId).data).toMatchObject({
      timeline: timeline(),
      opaque: { author: 'keep' },
      animations: { legacy: 'keep' },
    });
    await expect(store.commit({ ...change, requestId: randomUUID() })).rejects.toMatchObject({
      code: 'REVISION_CONFLICT',
    });
    await store.close();
    const reopened = await openPptdStore(options);
    stores.push(reopened);
    expect(reopened.readPage(pageId).data.timeline).toEqual(timeline());
    expect(await reopened.commit(change)).toEqual(receipt);
    await reopened.undo(receipt.operationId);
    expect(reopened.readPage(pageId).data.timeline).toBeUndefined();
    expect(await fs.readFile(path.join(root, 'pages/a.page'), 'utf8')).toBe(source);
  });

  it('rejects orphan targets and invalid samples before any bytes change', async () => {
    const { store, root } = await fixture();
    const pageId = store.getSnapshot().pages[0].pageId;
    const invalid = timeline();
    invalid.tracks[0].targetId = 'missing';
    await expect(
      store.commit(request(store, [{ op: 'page.timeline.set', pageId, timeline: invalid }])),
    ).rejects.toMatchObject({ code: 'INVALID_DOCUMENT' });
    invalid.tracks[0].targetId = 'title';
    invalid.tracks[0].keyframes[1].timeMs = 0;
    await expect(
      store.commit(request(store, [{ op: 'page.timeline.set', pageId, timeline: invalid }])),
    ).rejects.toMatchObject({ code: 'INVALID_DOCUMENT' });
    expect(await fs.readFile(path.join(root, 'pages/a.page'), 'utf8')).toBe(source);
  });

  it('removes only deleted object tracks atomically and restores them with undo', async () => {
    const { store } = await fixture();
    const pageId = store.getSnapshot().pages[0].pageId;
    await store.commit(request(store, [{ op: 'page.timeline.set', pageId, timeline: timeline() }]));
    const removed = await store.commit(
      request(store, [{ op: 'element.remove', pageId, elementId: 'title' }]),
    );
    expect(
      knownTimeline(store.readPage(pageId).data)?.tracks.map((track) => track.targetId),
    ).toEqual(['box']);
    await store.undo(removed.operationId);
    expect(store.readPage(pageId).data.timeline).toEqual(timeline());
    const cleared = await store.commit(
      request(store, [{ op: 'page.timeline.set', pageId, timeline: null }]),
    );
    expect(store.readPage(pageId).data.timeline).toBeUndefined();
    await store.undo(cleared.operationId);
    expect(store.readPage(pageId).data.timeline).toEqual(timeline());
  });

  it('remaps animated targets when duplicating a page and restores timeline checkpoints', async () => {
    const { store } = await fixture();
    const pageId = store.getSnapshot().pages[0].pageId;
    await store.commit(request(store, [{ op: 'page.timeline.set', pageId, timeline: timeline() }]));
    const checkpoint = await store.createPageCheckpoint({
      pageId,
      requestId: randomUUID(),
      label: 'Motion approved',
      expectedPageRevision: store.readPage(pageId).pageRevision,
      expectedMetadataRevision: store.getSnapshot().metadataRevision,
    });
    const duplicate = await store.commit(request(store, [{ op: 'page.duplicate', pageId }]));
    const copied = store.readPage(duplicate.createdPages[0].pageId).data;
    expect(() => validateTimeline(copied.timeline, copied)).not.toThrow();
    expect(knownTimeline(copied)?.tracks.map((track) => track.targetId)).toEqual(
      copied.elements.map((element) => element.elementId),
    );
    expect(copied.elements[0].elementId).not.toBe('title');
    await store.commit(request(store, [{ op: 'page.timeline.set', pageId, timeline: null }]));
    await store.restorePageVersion({
      pageId,
      versionId: checkpoint.versionId,
      requestId: randomUUID(),
      expectedPageRevision: store.readPage(pageId).pageRevision,
      expectedMetadataRevision: store.getSnapshot().metadataRevision,
    });
    expect(store.readPage(pageId).data.timeline).toEqual(timeline());
  });

  it('preserves a future timeline while editing unrelated content', async () => {
    const { store, root } = await fixture();
    const pageId = store.getSnapshot().pages[0].pageId;
    await fs.writeFile(
      path.join(root, 'pages/a.page'),
      `${source}timeline: { schemaVersion: 99, future: untouched }\n`,
    );
    await store.refreshExternal();
    await store.commit(request(store, [{ op: 'page.notes.set', pageId, text: 'New note' }]));
    expect(store.readPage(pageId).data.timeline).toEqual({
      schemaVersion: 99,
      future: 'untouched',
    });
  });
});

describe('object timeline copying', () => {
  it('copies only selected targets, offsets coordinates, retains destination cues and generates fresh identities', () => {
    const destination: PageTimeline = {
      schemaVersion: 1,
      durationMs: 500,
      tracks: [],
      cues: [{ id: 'local', timeMs: 100, label: 'Local cue' }],
    };
    let sequence = 0;
    const copied = copiedTimelineTracks(
      timeline(),
      destination,
      { title: 'new-title' },
      () => `new-${++sequence}`,
      24,
    );
    expect(copied?.durationMs).toBe(2000);
    expect(copied?.cues).toEqual(destination.cues);
    expect(copied?.tracks).toHaveLength(1);
    expect(copied?.tracks[0]).toMatchObject({
      targetId: 'new-title',
      property: 'x',
      keyframes: [{ value: 44 }, { value: 324 }],
    });
    expect(copied?.tracks[0].id).not.toBe('move');
    expect(copied?.tracks[0].keyframes[0].id).not.toBe('start');
    expect(copiedTimelineTracks(timeline(), destination, { absent: 'new' }, () => 'unused')).toBe(
      destination,
    );
    expect(timeline().tracks[0].keyframes[0].value).toBe(20);
  });
});
