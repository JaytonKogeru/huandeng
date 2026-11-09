import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { strFromU8, unzipSync } from 'fflate';
import { afterEach, describe, expect, it } from 'vitest';
import { buildPptdPptx } from './export';
import { hashBytes, hashPayload } from './persistence';
import { mainPositionForPath, resolvePositionField } from './position-field';
import { presentationSnapshot } from './presentation-snapshot';
import { projectTestDirectory } from './project-directory.test-utils';
import { emptyStory } from './project-model';
import { openPptdStore, type PptdStore } from './store';
import type { PptdElement, PptdOperation } from './types';

const stores: PptdStore[] = [];
const directories: string[] = [];
afterEach(async () => {
  await Promise.allSettled(stores.splice(0).map((store) => store.close()));
  await Promise.all(
    directories.splice(0).map((directory) => fs.rm(directory, { recursive: true, force: true })),
  );
});

const source = `# A position field is explicit; ordinary numeric text remains content.
elements:
  - elementId: position
    elementType: text
    bounds: [880, 500, 50, 20]
    content: { text: '999', field: main-position, fontSize: 10, fontFamily: Arial }
  - elementId: measurement
    elementType: text
    bounds: [30, 50, 200, 40]
    content: { text: '126', fontSize: 20, fontFamily: Arial }
notes: Original notes
`;

async function fixture() {
  const directory = await projectTestDirectory('huandeng-position-field-');
  directories.push(directory);
  const root = path.join(directory, 'project');
  const stateDir = path.join(directory, 'state');
  await fs.mkdir(path.join(root, 'pages'), { recursive: true });
  const entryPath = path.join(root, 'deck.pptd');
  await fs.writeFile(
    entryPath,
    'size: [960, 540]\npages: [pages/a.page, pages/b.page, pages/c.page]\n',
  );
  for (const name of ['a', 'b', 'c'])
    await fs.writeFile(path.join(root, `pages/${name}.page`), source);
  const store = await openPptdStore({ entryPath, stateDir });
  stores.push(store);
  return { store, root, entryPath, stateDir };
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

async function save(store: PptdStore, pageId: string) {
  return store.createPageCheckpoint({
    pageId,
    requestId: randomUUID(),
    label: 'Before reordering',
    actor: 'test',
    expectedPageRevision: store.readPage(pageId).pageRevision,
    expectedMetadataRevision: store.getSnapshot().metadataRevision,
  });
}

const textOnly = {
  resolveAsset: async (): Promise<never> => {
    throw new Error('The fixture contains no assets.');
  },
};

describe('derived Main Slide Position', () => {
  it('requires an explicit field and never replaces ordinary digits or mutates source', () => {
    const ordinary: PptdElement = {
      elementId: 'value',
      elementType: 'text',
      content: { text: '126' },
    };
    expect(resolvePositionField(ordinary, 3)).toBe(ordinary);
    const field = {
      ...ordinary,
      content: { text: '999', field: 'main-position', color: '#555555' },
    };
    expect(resolvePositionField(field, 3).content).toEqual({
      text: '3',
      field: 'main-position',
      color: '#555555',
    });
    expect(resolvePositionField(field, undefined).content?.text).toBe('—');
    expect(field.content.text).toBe('999');
    expect(mainPositionForPath(['./pages/a.page', 'pages/b.page'], 'pages\\a.page')).toBe(1);
    expect(mainPositionForPath(['pages/a.page'], 'pages/missing.page')).toBeUndefined();
  });

  it('keeps page bytes, revisions and histories unchanged when Main order or another page changes', async () => {
    const { store, root, entryPath, stateDir } = await fixture();
    const [first, second] = store.getSnapshot().pages;
    const checkpoint = await save(store, first.pageId);
    const initialHistory = await store.pageHistory(first.pageId);
    const initialOther = await store.pageHistory(second.pageId);
    expect(first.mainPosition).toBe(1);
    await edit(store, [{ op: 'page.move', pageId: first.pageId }]);
    expect(store.readPage(first.pageId).mainPosition).toBe(3);
    expect(store.readPage(first.pageId).pageRevision).toBe(first.pageRevision);
    expect(store.readPage(first.pageId).renderRevision).not.toBe(first.renderRevision);
    expect(await fs.readFile(path.join(root, first.path), 'utf8')).toBe(source);
    expect(await store.pageHistory(first.pageId)).toEqual(initialHistory);
    expect(await store.pageHistory(second.pageId)).toEqual(initialOther);
    expect(await store.pageCheckpoints(first.pageId)).toMatchObject([
      { versionId: checkpoint.versionId, current: true },
    ]);
    const archived = await store.readPageVersion(first.pageId, checkpoint.versionId);
    expect(archived.page.mainPosition).toBe(1);
    expect(archived.page.versionId).toBe(checkpoint.versionId);
    expect(
      (await store.readPageVersion(first.pageId, initialHistory[0].versionId)).page.mainPosition,
    ).toBe(1);

    const added = await edit(store, [
      { op: 'page.add', afterPageId: null, page: { elements: [] } },
    ]);
    expect(store.readPage(first.pageId).mainPosition).toBe(4);
    await edit(store, [{ op: 'page.remove', pageId: added.createdPages[0].pageId }]);
    expect(store.readPage(first.pageId).mainPosition).toBe(3);
    expect(await store.pageHistory(first.pageId)).toEqual(initialHistory);
    await edit(store, [{ op: 'page.notes.set', pageId: first.pageId, text: 'Revised narration' }]);
    const notesVersion = (await store.pageHistory(first.pageId))[0];
    expect(
      (await store.readPageVersion(first.pageId, notesVersion.versionId)).page.mainPosition,
    ).toBe(3);
    await edit(store, [
      {
        op: 'metadata.patch',
        pageId: first.pageId,
        set: { 'designIntent.purpose': 'Explain the observation' },
      },
    ]);
    await edit(store, [
      {
        op: 'element.patch',
        pageId: first.pageId,
        elementId: 'measurement',
        set: { 'content.text': '127' },
      },
    ]);
    expect(await store.pageHistory(first.pageId)).toHaveLength(initialHistory.length + 3);
    expect(store.readPage(first.pageId).pageRevision).not.toBe(first.pageRevision);
    await store.restorePageVersion({
      pageId: first.pageId,
      versionId: checkpoint.versionId,
      requestId: randomUUID(),
      expectedPageRevision: store.readPage(first.pageId).pageRevision,
      expectedMetadataRevision: store.getSnapshot().metadataRevision,
    });
    expect(store.readPage(first.pageId).mainPosition).toBe(3);
    expect(store.readPage(first.pageId).data.elements[0].content?.field).toBe('main-position');
    expect(store.readPage(first.pageId).data.elements[1].content?.text).toBe('126');
    const beforeReopen = await store.pageHistory(first.pageId);
    await store.close();
    const reopened = await openPptdStore({ entryPath, stateDir });
    stores.push(reopened);
    expect(await reopened.pageHistory(first.pageId)).toEqual(beforeReopen);
    expect(reopened.readPage(first.pageId).mainPosition).toBe(3);
    expect(
      (await reopened.readPageVersion(first.pageId, checkpoint.versionId)).page.mainPosition,
    ).toBe(1);
    expect(
      (await reopened.readPageVersion(first.pageId, notesVersion.versionId)).page.mainPosition,
    ).toBe(3);
  });

  it('captures new Notes and Story positions after upgrading observations with unknown historical positions', async () => {
    const { store, entryPath, stateDir } = await fixture();
    const page = store.getSnapshot().pages[1];
    const initial = (await store.pageHistory(page.pageId))[0];
    await store.close();
    const observationPath = path.join(
      stateDir,
      'page-versions',
      `${hashBytes(initial.versionId).slice(7)}.json`,
    );
    const observation = JSON.parse(await fs.readFile(observationPath, 'utf8'));
    delete observation.state.mainPosition;
    await fs.writeFile(observationPath, JSON.stringify(observation));

    const upgraded = await openPptdStore({ entryPath, stateDir });
    stores.push(upgraded);
    expect(
      (await upgraded.readPageVersion(page.pageId, initial.versionId)).page.mainPosition,
    ).toBeUndefined();
    const notes = await edit(upgraded, [
      { op: 'page.notes.set', pageId: page.pageId, text: 'First narration after upgrade' },
    ]);
    const notesRevision = upgraded.readPage(page.pageId).pageRevision;
    const story = await edit(upgraded, [
      {
        op: 'metadata.patch',
        pageId: page.pageId,
        set: { 'designIntent.purpose': 'Explain the result after upgrade' },
      },
    ]);
    expect(upgraded.readPage(page.pageId).pageRevision).toBe(notesRevision);
    const history = await upgraded.pageHistory(page.pageId);
    expect(history).toHaveLength(3);
    for (const result of [notes, story])
      expect(
        (await upgraded.readPageVersion(page.pageId, `commit:${result.operationId}`)).page
          .mainPosition,
      ).toBe(2);

    await edit(upgraded, [{ op: 'page.move', pageId: page.pageId }]);
    expect(upgraded.readPage(page.pageId).mainPosition).toBe(3);
    expect(await upgraded.pageHistory(page.pageId)).toEqual(history);
    await upgraded.close();
    const reopened = await openPptdStore({ entryPath, stateDir });
    stores.push(reopened);
    expect(
      (await reopened.readPageVersion(page.pageId, initial.versionId)).page.mainPosition,
    ).toBeUndefined();
    for (const result of [notes, story])
      expect(
        (await reopened.readPageVersion(page.pageId, `commit:${result.operationId}`)).page
          .mainPosition,
      ).toBe(2);
  });

  it('journals the actual position after external reordering without adding position-only versions', async () => {
    const { store, entryPath, stateDir } = await fixture();
    const page = store.getSnapshot().pages[0];
    const initialHistory = await store.pageHistory(page.pageId);
    await fs.writeFile(
      entryPath,
      'size: [960, 540]\npages: [pages/b.page, pages/a.page, pages/c.page]\n',
    );
    await store.refreshExternalState();
    expect(store.readPage(page.pageId).mainPosition).toBe(2);
    expect(store.readPage(page.pageId).pageRevision).toBe(page.pageRevision);
    expect(await store.pageHistory(page.pageId)).toEqual(initialHistory);
    const notes = await edit(store, [
      { op: 'page.notes.set', pageId: page.pageId, text: 'Narration at Position 2' },
    ]);
    const notesHistory = await store.pageHistory(page.pageId);
    expect(notesHistory).toHaveLength(initialHistory.length + 1);

    await fs.writeFile(
      entryPath,
      'size: [960, 540]\npages: [pages/c.page, pages/b.page, pages/a.page]\n',
    );
    await store.refreshExternalState();
    expect(store.readPage(page.pageId).mainPosition).toBe(3);
    expect(await store.pageHistory(page.pageId)).toEqual(notesHistory);
    const story = await edit(store, [
      {
        op: 'metadata.patch',
        pageId: page.pageId,
        set: { 'designIntent.purpose': 'Explain the result at Position 3' },
      },
    ]);
    expect(await store.pageHistory(page.pageId)).toHaveLength(initialHistory.length + 2);
    await store.close();

    const reopened = await openPptdStore({ entryPath, stateDir });
    stores.push(reopened);
    expect(
      (await reopened.readPageVersion(page.pageId, initialHistory[0].versionId)).page.mainPosition,
    ).toBe(1);
    expect(
      (await reopened.readPageVersion(page.pageId, `commit:${notes.operationId}`)).page
        .mainPosition,
    ).toBe(2);
    expect(
      (await reopened.readPageVersion(page.pageId, `commit:${story.operationId}`)).page
        .mainPosition,
    ).toBe(3);
    const historyPath = path.join(
      stateDir,
      'history',
      `${hashBytes(notes.operationId).slice(7)}.json`,
    );
    const record = JSON.parse(await fs.readFile(historyPath, 'utf8'));
    expect(record.files.map((file: { role: string }) => file.role)).toEqual(['page']);
    expect(record.pagePositions[page.pageId]).toEqual({ before: 2, after: 2 });
    expect(record.pagePositionsRevision).toBe(hashPayload(record.pagePositions));
    await reopened.close();
    record.pagePositions[page.pageId].after = 7;
    await fs.writeFile(historyPath, JSON.stringify(record));
    await expect(openPptdStore({ entryPath, stateDir })).rejects.toMatchObject({
      code: 'RECOVERY_REQUIRED',
    });
  });

  it('exports native text with Main positions across hidden pages, Presentation order and pinned versions', async () => {
    const { store } = await fixture();
    const [first, second] = store.getSnapshot().pages;
    const checkpoint = await save(store, first.pageId);
    await edit(store, [
      { op: 'page.move', pageId: first.pageId },
      { op: 'metadata.patch', pageId: second.pageId, set: { hidden: true } },
    ]);
    const canonical = store.getSnapshot();
    const visible = structuredClone(canonical);
    visible.pages = visible.pages.filter((page) => !page.metadata.hidden);
    const visibleOutput = await buildPptdPptx(visible, textOnly);
    const visibleFiles = unzipSync(visibleOutput.bytes);
    expect(strFromU8(visibleFiles['ppt/slides/slide1.xml'])).toContain('<a:t>2</a:t>');
    expect(strFromU8(visibleFiles['ppt/slides/slide2.xml'])).toContain('<a:t>3</a:t>');

    const presentation = structuredClone(canonical);
    presentation.metadata.project = {
      schemaVersion: 1,
      mainStory: emptyStory(),
      sections: [],
      presentations: [
        {
          id: 'talk',
          title: 'Different order',
          story: emptyStory(),
          items: [
            { id: 'live', kind: 'page', pageId: first.pageId },
            { id: 'pin', kind: 'page', pageId: first.pageId, versionId: checkpoint.versionId },
          ],
        },
      ],
    };
    const resolved = await presentationSnapshot(presentation, 'talk', (id, version) =>
      store.readPageVersion(id, version),
    );
    expect(resolved.pages.map((page) => page.mainPosition)).toEqual([3, 1]);
    const output = await buildPptdPptx(resolved, textOnly);
    const files = unzipSync(output.bytes);
    const live = strFromU8(files['ppt/slides/slide1.xml']);
    const pinned = strFromU8(files['ppt/slides/slide2.xml']);
    expect(live).toContain('<a:t>3</a:t>');
    expect(pinned).toContain('<a:t>1</a:t>');
    expect(live).toContain('<a:t>126</a:t>');
    expect(live).not.toContain('<a:t>999</a:t>');
    expect(live).not.toContain('<p:pic>');
    expect(store.getSnapshot()).toEqual(canonical);
    delete resolved.pages[1].mainPosition;
    const unknown = await buildPptdPptx(resolved, textOnly);
    expect(strFromU8(unzipSync(unknown.bytes)['ppt/slides/slide2.xml'])).toContain('<a:t>—</a:t>');
  });
});
