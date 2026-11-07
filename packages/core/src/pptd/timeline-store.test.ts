import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  type BuildTimeline,
  compileTimeline,
  type PageTimeline,
  readTimeline,
  resolvePageAnimation,
  validatePageAnimation,
  validateTimeline,
} from './animation-model';
import { presentationSnapshot } from './presentation-snapshot';
import { projectTestDirectory } from './project-directory.test-utils';
import { emptyStory } from './project-model';
import { openPptdStore, type PptdStore } from './store';
import { copiedTimelineTracks } from './timeline-operations';
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

function builds(): BuildTimeline {
  return {
    schemaVersion: 2,
    effects: [
      {
        id: 'title-in',
        targetId: 'title',
        kind: 'fade-in',
        trigger: 'click',
        durationMs: 400,
        delayMs: 0,
        label: 'Evidence',
      },
      {
        id: 'box-in',
        targetId: 'box',
        kind: 'appear',
        trigger: 'with-previous',
        durationMs: 0,
        delayMs: 0,
      },
      {
        id: 'title-pulse',
        targetId: 'title',
        kind: 'pulse',
        trigger: 'click',
        durationMs: 400,
        delayMs: 0,
      },
      {
        id: 'box-move',
        targetId: 'box',
        kind: 'move',
        trigger: 'with-previous',
        durationMs: 400,
        delayMs: 0,
        dx: 100,
        dy: -20,
      },
    ],
  };
}

describe('build and transition transactions', () => {
  it('copies stable targets and carries exact authored builds and transitions through pinned versions', async () => {
    const { store } = await fixture();
    const pageId = store.getSnapshot().pages[0].pageId;
    const transition = { schemaVersion: 1 as const, kind: 'fade' as const, durationMs: 240 };
    await store.commit(
      request(store, [
        { op: 'page.timeline.set', pageId, timeline: builds() },
        { op: 'page.transition.set', pageId, transition },
      ]),
    );
    const checkpoint = await store.createPageCheckpoint({
      pageId,
      requestId: randomUUID(),
      label: 'Approved click sequence',
      expectedPageRevision: store.readPage(pageId).pageRevision,
      expectedMetadataRevision: store.getSnapshot().metadataRevision,
    });
    const duplicate = await store.commit(request(store, [{ op: 'page.duplicate', pageId }]));
    const copied = store.readPage(duplicate.createdPages[0].pageId).data;
    expect(() => validatePageAnimation(copied.timeline, copied)).not.toThrow();
    expect((copied.timeline as BuildTimeline).effects.map((effect) => effect.targetId)).toEqual([
      copied.elements[0].elementId,
      copied.elements[1].elementId,
      copied.elements[0].elementId,
      copied.elements[1].elementId,
    ]);
    expect(copied.elements[0].elementId).not.toBe('title');
    expect(copied.transition).toEqual(transition);
    await store.commit(
      request(store, [
        { op: 'page.timeline.set', pageId, timeline: null },
        { op: 'page.transition.set', pageId, transition: null },
      ]),
    );
    const snapshot = store.getSnapshot();
    snapshot.metadata.project = {
      schemaVersion: 1,
      mainStory: emptyStory(),
      sections: [],
      presentations: [
        {
          id: 'talk',
          title: 'Talk',
          story: emptyStory(),
          items: [
            { id: 'pin-first', kind: 'page', pageId, versionId: checkpoint.versionId },
            { id: 'live', kind: 'page', pageId },
            { id: 'pin-again', kind: 'page', pageId, versionId: checkpoint.versionId },
          ],
        },
      ],
    };
    const view = await presentationSnapshot(snapshot, 'talk', (id, version) =>
      store.readPageVersion(id, version),
    );
    expect(view.pages[0].data).toMatchObject({ timeline: builds(), transition });
    expect(view.pages[1].data.timeline).toBeUndefined();
    expect(view.pages[2].data).toMatchObject({ timeline: builds(), transition });
    expect(view.pages[0].occurrenceId).not.toBe(view.pages[2].occurrenceId);
    expect(resolvePageAnimation(view.pages[0].data)?.steps).toHaveLength(2);
    await store.commit(
      request(store, [{ op: 'page.version.restore', pageId, versionId: checkpoint.versionId }]),
    );
    expect(store.readPage(pageId).data).toMatchObject({ timeline: builds(), transition });
  });

  it('rejects invalid or future overwrites before changing bytes, while unrelated edits remain safe', async () => {
    const { store, root } = await fixture();
    const pageId = store.getSnapshot().pages[0].pageId;
    await expect(
      store.commit(
        request(store, [
          { op: 'page.timeline.set', pageId, timeline: builds() },
          {
            op: 'page.transition.set',
            pageId,
            transition: { schemaVersion: 1, kind: 'fade', durationMs: 0 },
          },
        ]),
      ),
    ).rejects.toMatchObject({ code: 'INVALID_DOCUMENT' });
    expect(await fs.readFile(path.join(root, 'pages/a.page'), 'utf8')).toBe(source);
    await fs.writeFile(
      path.join(root, 'pages/a.page'),
      `${source}timeline: { schemaVersion: 99, future: untouched }\ntransition: { schemaVersion: 99, future: untouched }\n`,
    );
    await store.refreshExternal();
    await store.commit(
      request(store, [{ op: 'page.notes.set', pageId, text: 'Retain future data' }]),
    );
    const before = await fs.readFile(path.join(root, 'pages/a.page'), 'utf8');
    for (const operation of [
      { op: 'page.timeline.set', pageId, timeline: builds() },
      { op: 'page.timeline.set', pageId, timeline: null },
      {
        op: 'page.transition.set',
        pageId,
        transition: { schemaVersion: 1, kind: 'none', durationMs: 0 },
      },
      { op: 'page.transition.set', pageId, transition: null },
    ] satisfies PptdOperation[])
      await expect(store.commit(request(store, [operation]))).rejects.toMatchObject({
        code: 'INVALID_DOCUMENT',
      });
    expect(await fs.readFile(path.join(root, 'pages/a.page'), 'utf8')).toBe(before);
    expect(store.readPage(pageId).data).toMatchObject({
      timeline: { schemaVersion: 99, future: 'untouched' },
      transition: { schemaVersion: 99, future: 'untouched' },
    });
  });

  it('saves authored builds and a transition with the original receipts, CAS, reopen and undo semantics', async () => {
    const { store, root, options } = await fixture();
    const pageId = store.getSnapshot().pages[0].pageId;
    const transition = { schemaVersion: 1 as const, kind: 'fade' as const, durationMs: 200 };
    const change = request(store, [
      { op: 'page.timeline.set', pageId, timeline: builds() },
      { op: 'page.transition.set', pageId, transition },
    ]);
    const receipt = await store.commit(change);
    expect(await store.commit(change)).toEqual(receipt);
    expect(await fs.readFile(path.join(root, 'pages/b.page'), 'utf8')).toBe(source);
    const saved = await fs.readFile(path.join(root, 'pages/a.page'), 'utf8');
    expect(saved).toContain('# Author annotation');
    expect(saved).not.toContain('keyframes:');
    expect(store.readPage(pageId).data).toMatchObject({
      timeline: builds(),
      transition,
      animations: { legacy: 'keep' },
      opaque: { author: 'keep' },
    });
    await expect(store.commit({ ...change, requestId: randomUUID() })).rejects.toMatchObject({
      code: 'REVISION_CONFLICT',
    });
    await store.close();
    const reopened = await openPptdStore(options);
    stores.push(reopened);
    expect(reopened.readPage(pageId).data).toMatchObject({ timeline: builds(), transition });
    expect(await reopened.commit(change)).toEqual(receipt);
    await reopened.undo(receipt.operationId);
    expect(await fs.readFile(path.join(root, 'pages/a.page'), 'utf8')).toBe(source);
  });

  it('prunes deleted targets while preserving separate clicks, then restores the entire animation on undo', async () => {
    const { store } = await fixture();
    const pageId = store.getSnapshot().pages[0].pageId;
    await store.commit(request(store, [{ op: 'page.timeline.set', pageId, timeline: builds() }]));
    const removed = await store.commit(
      request(store, [{ op: 'element.remove', pageId, elementId: 'title' }]),
    );
    const current = store.readPage(pageId).data;
    expect(current.timeline).toMatchObject({
      schemaVersion: 2,
      effects: [
        { id: 'box-in', trigger: 'click' },
        { id: 'box-move', trigger: 'click' },
      ],
    });
    expect(resolvePageAnimation(current)?.steps).toHaveLength(2);
    expect(() => validatePageAnimation(current.timeline, current)).not.toThrow();
    await store.undo(removed.operationId);
    expect(store.readPage(pageId).data.timeline).toEqual(builds());
  });

  it('deletes a timing bridge target atomically, reopens the preserved sequence and undoes exact source', async () => {
    const { store, root, options } = await fixture();
    const pageId = store.getSnapshot().pages[0].pageId;
    const animation: BuildTimeline = {
      schemaVersion: 2,
      effects: [
        {
          id: 'enter',
          targetId: 'title',
          kind: 'fade-in',
          trigger: 'click',
          durationMs: 1000,
          delayMs: 0,
        },
        {
          id: 'bridge',
          targetId: 'box',
          kind: 'appear',
          trigger: 'after-previous',
          durationMs: 0,
          delayMs: 0,
        },
        {
          id: 'exit',
          targetId: 'title',
          kind: 'fade-out',
          trigger: 'with-previous',
          durationMs: 1000,
          delayMs: 0,
        },
      ],
    };
    await store.commit(request(store, [{ op: 'page.timeline.set', pageId, timeline: animation }]));
    const saved = await fs.readFile(path.join(root, 'pages/a.page'), 'utf8');
    const original = compileTimeline(store.readPage(pageId).data);
    const receipt = await store.commit(
      request(store, [{ op: 'element.remove', pageId, elementId: 'box' }]),
    );
    const current = store.readPage(pageId).data;
    expect(current.elements.map((element) => element.elementId)).toEqual(['title']);
    expect(current.timeline).toMatchObject({
      schemaVersion: 2,
      effects: [
        { id: 'enter', trigger: 'click', delayMs: 0 },
        { id: 'exit', trigger: 'with-previous', delayMs: 1000 },
      ],
    });
    const retained = compileTimeline(current);
    for (const time of [0, 500, 1000, 1500, 2000])
      expect(retained?.sample(time).get('title')).toEqual(original?.sample(time).get('title'));
    expect(resolvePageAnimation(current)?.timeline?.durationMs).toBe(2000);
    expect(await fs.readFile(path.join(root, 'pages/b.page'), 'utf8')).toBe(source);
    await store.close();
    const reopened = await openPptdStore(options);
    stores.push(reopened);
    expect(reopened.readPage(pageId).data.timeline).toEqual(current.timeline);
    expect(resolvePageAnimation(reopened.readPage(pageId).data)?.steps[0].endMs).toBe(2000);
    await reopened.undo(receipt.operationId);
    expect(await fs.readFile(path.join(root, 'pages/a.page'), 'utf8')).toBe(saved);
    expect(reopened.readPage(pageId).data.timeline).toEqual(animation);
  });

  it('converts explicitly to free keyframes in one transaction and restores authored effects with undo', async () => {
    const { store } = await fixture();
    const pageId = store.getSnapshot().pages[0].pageId;
    await store.commit(request(store, [{ op: 'page.timeline.set', pageId, timeline: builds() }]));
    const current = store.readPage(pageId).data;
    const free = resolvePageAnimation(current)?.timeline ?? null;
    const receipt = await store.commit(
      request(store, [{ op: 'page.timeline.set', pageId, timeline: free }]),
    );
    const converted = store.readPage(pageId).data;
    expect(converted.timeline).toEqual(free);
    for (const time of [0, 200, 400, 600, 800])
      expect(compileTimeline(converted)?.sample(time)).toEqual(
        compileTimeline(current)?.sample(time),
      );
    await store.undo(receipt.operationId);
    expect(store.readPage(pageId).data.timeline).toEqual(builds());
  });
});

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
      readTimeline(store.readPage(pageId).data)?.tracks.map((track) => track.targetId),
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
    expect(readTimeline(copied)?.tracks.map((track) => track.targetId)).toEqual(
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
    if (copied?.schemaVersion !== 1) throw new Error('Expected free keyframes');
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
