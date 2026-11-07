import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { stringify } from 'yaml';
import {
  buildGroup,
  duplicateElements,
  expandGroupIds,
  groupChildren,
  transformGroup,
  ungroupOperations,
} from './grouping';
import { openPptdStore, type PptdStore } from './store';
import type { PptdElement, PptdOperation } from './types';

const stores: PptdStore[] = [];
const temporary: string[] = [];

afterEach(async () => {
  await Promise.allSettled(stores.splice(0).map((store) => store.close()));
  await Promise.all(
    temporary.splice(0).map((directory) => fs.rm(directory, { recursive: true, force: true })),
  );
});

async function fixture() {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'huandeng-groups-'));
  temporary.push(directory);
  const root = path.join(directory, 'project');
  await fs.mkdir(path.join(root, 'pages'), { recursive: true });
  const entryPath = path.join(root, 'deck.pptd');
  await fs.writeFile(entryPath, 'size: [960, 540]\npages: [pages/a.page, pages/b.page]\n');
  const elements: PptdElement[] = [
    { elementId: 'a', elementType: 'shape', bounds: [10, 20, 30, 40] },
    {
      elementId: 'b',
      elementType: 'text',
      bounds: [70, 20, 30, 40],
      content: { text: 'a' },
      opaque: { preserve: ['a', 'inner', 'outer'] },
    },
  ];
  elements.push(buildGroup(elements, ['a', 'b'], 'inner'));
  elements.push({ elementId: 'c', elementType: 'shape', bounds: [150, 100, 30, 30] });
  elements.push(buildGroup(elements, ['inner', 'c'], 'outer'));
  const source = `# Keep the original author annotation\n${stringify({ elements, notes: 'Original' })}`;
  await fs.writeFile(path.join(root, 'pages/a.page'), source);
  const sibling = 'elements: []\nnotes: Sibling source must stay byte-identical\n';
  await fs.writeFile(path.join(root, 'pages/b.page'), sibling);
  const store = await openPptdStore({ entryPath, stateDir: path.join(directory, 'runtime') });
  stores.push(store);
  return { root, source, sibling, store, pageId: store.getSnapshot().pages[0].pageId };
}

function commit(store: PptdStore, operations: PptdOperation[]) {
  const snapshot = store.getSnapshot();
  return store.commit({
    requestId: randomUUID(),
    deckId: snapshot.deckId,
    actor: 'scientific-group-integration',
    expected: {
      pages: Object.fromEntries(snapshot.pages.map((page) => [page.pageId, page.pageRevision])),
      manifest: snapshot.manifestRevision,
      metadata: snapshot.metadataRevision,
    },
    operations,
  });
}

describe('group geometry and persistence integration', () => {
  it('expands one agent group bounds patch exactly once, preserving source and undo/redo', async () => {
    const { root, source, sibling, store, pageId } = await fixture();
    const before = store.readPage(pageId).data.elements;
    const expected = transformGroup(before, 'outer', { bounds: [35, 45, 340, 220] });
    const saved = await commit(store, [
      { op: 'element.patch', pageId, elementId: 'outer', set: { bounds: [35, 45, 340, 220] } },
    ]);
    const after = store.readPage(pageId).data.elements;
    for (const change of expected) {
      const element = after.find((item) => item.elementId === change.elementId);
      expect({ ...element, rotation: element?.rotation ?? 0 }).toMatchObject(change.fields);
    }
    expect(after.find((element) => element.elementId === 'a')?.bounds).toEqual([35, 45, 60, 80]);
    expect(after.find((element) => element.elementId === 'b')?.opaque).toEqual({
      preserve: ['a', 'inner', 'outer'],
    });
    expect(saved.changedElements).toHaveLength(5);
    expect(await fs.readFile(path.join(root, 'pages/a.page'), 'utf8')).toContain(
      '# Keep the original author annotation',
    );
    expect(await fs.readFile(path.join(root, 'pages/b.page'), 'utf8')).toBe(sibling);
    const undone = await store.undo(saved.operationId);
    expect(await fs.readFile(path.join(root, 'pages/a.page'), 'utf8')).toBe(source);
    await store.redo(undone.operationId);
    expect(store.readPage(pageId).data.elements).toEqual(after);
  });

  it('accepts a complete GUI transform without scaling nested descendants twice', async () => {
    const { store, pageId } = await fixture();
    const before = store.readPage(pageId).data.elements;
    const expected = transformGroup(before, 'outer', {
      bounds: [35, 45, 340, 220],
      rotation: 30,
    });
    await commit(
      store,
      expected.map(({ elementId, fields }) => ({
        op: 'element.patch',
        pageId,
        elementId,
        set: fields,
      })),
    );
    const after = store.readPage(pageId).data.elements;
    for (const change of expected)
      expect(after.find((element) => element.elementId === change.elementId)).toMatchObject(
        change.fields,
      );
    expect(after.filter((element) => element.rotation === 30)).toHaveLength(5);
  });

  it('duplicates a page with new stable element IDs and remaps only typed group references', async () => {
    const { root, source, store, pageId } = await fixture();
    const original = store.readPage(pageId).data.elements;
    const saved = await commit(store, [{ op: 'page.duplicate', pageId }]);
    const copied = store.readPage(saved.createdPages[0].pageId).data.elements;
    expect(copied).toHaveLength(original.length);
    const ids = new Set(copied.map((element) => element.elementId));
    expect(original.every((element) => !ids.has(element.elementId))).toBe(true);
    const groups = copied.filter((element) => element.elementType === 'group');
    expect(groups).toHaveLength(2);
    expect(groups.every((group) => groupChildren(group).every((id) => ids.has(id)))).toBe(true);
    expect(expandGroupIds(copied, [copied[4].elementId])).toHaveLength(5);
    expect(copied.find((element) => element.elementType === 'text')).toMatchObject({
      content: { text: 'a' },
      opaque: { preserve: ['a', 'inner', 'outer'] },
    });
    expect(await fs.readFile(path.join(root, 'pages/a.page'), 'utf8')).toBe(source);
  });

  it('copies a nested selection, deletes its shells before children, and restores all with undo', async () => {
    const { store, pageId } = await fixture();
    const original = store.readPage(pageId).data.elements;
    const duplicate = duplicateElements(original, ['outer'], (id) => `copy-${id}`);
    await commit(
      store,
      duplicate.copies.map((element) => ({ op: 'element.add', pageId, element })),
    );
    const beforeDelete = store.readPage(pageId).data.elements;
    expect(beforeDelete).toHaveLength(10);
    const removal = ['copy-outer', 'copy-inner', 'copy-a', 'copy-b', 'copy-c'];
    const deleted = await commit(
      store,
      removal.map((elementId) => ({ op: 'element.remove', pageId, elementId })),
    );
    expect(store.readPage(pageId).data.elements).toEqual(original);
    await store.undo(deleted.operationId);
    expect(store.readPage(pageId).data.elements).toEqual(beforeDelete);
  });

  it('ungroups nested shells together while retaining every member ID and absolute geometry', async () => {
    const { store, pageId } = await fixture();
    const before = store.readPage(pageId).data.elements;
    await commit(store, ungroupOperations(pageId, before, ['inner', 'outer']));
    const after = store.readPage(pageId).data.elements;
    expect(after).toEqual(before.filter((element) => element.elementType !== 'group'));
  });

  it('reparents members on inner ungroup and refuses invalid references before writing files', async () => {
    const { root, store, pageId } = await fixture();
    await commit(store, ungroupOperations(pageId, store.readPage(pageId).data.elements, ['inner']));
    expect(
      store.readPage(pageId).data.elements.find((element) => element.elementId === 'outer'),
    ).toMatchObject({ children: ['a', 'b', 'c'] });
    const before = await fs.readFile(path.join(root, 'pages/a.page'), 'utf8');
    for (const children of [['outer'], ['missing']]) {
      await expect(
        commit(store, [{ op: 'element.patch', pageId, elementId: 'outer', set: { children } }]),
      ).rejects.toMatchObject({ code: 'INVALID_DOCUMENT' });
      expect(await fs.readFile(path.join(root, 'pages/a.page'), 'utf8')).toBe(before);
    }
    await expect(
      commit(store, [
        {
          op: 'element.add',
          pageId,
          element: {
            elementId: 'second-parent',
            elementType: 'group',
            bounds: [10, 20, 30, 40],
            children: ['a'],
          },
        },
      ]),
    ).rejects.toMatchObject({ code: 'INVALID_DOCUMENT' });
    expect(await fs.readFile(path.join(root, 'pages/a.page'), 'utf8')).toBe(before);
  });
});
