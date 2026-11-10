import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { hashBytes } from './persistence';
import { projectTestDirectory } from './project-directory.test-utils';
import { emptyStory } from './project-model';
import { openPptdStore, type PptdStore } from './store';
import type { PptdOperation } from './types';

const stores: PptdStore[] = [];
const directories: string[] = [];
afterEach(async () => {
  await Promise.all(stores.splice(0).map((store) => store.close()));
  await Promise.all(
    directories.splice(0).map((directory) => fs.rm(directory, { recursive: true, force: true })),
  );
});
async function fixture() {
  const root = await projectTestDirectory('huandeng-operation-review-', ['.']);
  directories.push(root);
  const entryPath = path.join(root, 'deck.pptd');
  await fs.writeFile(
    entryPath,
    'size: [960, 540]\ntheme: { background: white }\npages: [a.page, b.page]\n',
  );
  for (const name of ['a', 'b'])
    await fs.writeFile(
      path.join(root, `${name}.page`),
      'elements:\n  - elementId: title\n    elementType: text\n    content: { text: Original }\nnotes: Original notes\n',
    );
  const stateDir = path.join(root, 'state');
  const store = await openPptdStore({ entryPath, stateDir });
  stores.push(store);
  return { store, root, entryPath, stateDir, pageId: store.getSnapshot().pages[0].pageId };
}
function commit(store: PptdStore, operations: PptdOperation[]) {
  const snapshot = store.getSnapshot();
  return store.commit({
    requestId: randomUUID(),
    deckId: snapshot.deckId,
    actor: 'synthetic-review-test',
    expected: {
      pages: Object.fromEntries(snapshot.pages.map((page) => [page.pageId, page.pageRevision])),
      manifest: snapshot.manifestRevision,
      metadata: snapshot.metadataRevision,
    },
    operations,
  });
}

describe('exact saved-operation review', () => {
  it('keeps consecutive edits exact after later edits and external observations', async () => {
    const { store, pageId, root } = await fixture();
    const first = await commit(store, [
      { op: 'element.patch', pageId, elementId: 'title', set: { 'content.text': 'First' } },
    ]);
    await commit(store, [
      { op: 'element.patch', pageId, elementId: 'title', set: { 'content.text': 'Second' } },
    ]);
    await fs.writeFile(path.join(root, 'a.page'), 'elements: []\nnotes: External\n');
    await store.refreshExternal();
    const review = await store.operationReview(first.operationId, pageId);
    expect(review.before?.page.data.elements[0].content?.text).toBe('Original');
    expect(review.after?.page.data.elements[0].content?.text).toBe('First');
    expect(review.changes).toContainEqual(
      expect.objectContaining({ kind: 'changed', elementId: 'title', fields: ['content.text'] }),
    );
    expect(review.warnings.join(' ')).toMatch(/current.*assets|current.*image/i);
    expect(review.themeSource).toEqual({ before: 'recorded', after: 'recorded' });
    expect(review.before?.theme).toEqual({ background: 'white' });
  });

  it('reviews notes and Story metadata with unchanged artwork using recorded evidence', async () => {
    const { store, pageId } = await fixture();
    const notes = await commit(store, [{ op: 'page.notes.set', pageId, text: 'Reviewed notes' }]);
    const story = await commit(store, [
      { op: 'metadata.patch', pageId, set: { designIntent: { purpose: 'Recorded purpose' } } },
    ]);
    await commit(store, [
      { op: 'metadata.patch', pageId, set: { designIntent: { purpose: 'Later purpose' } } },
    ]);
    expect((await store.operationReview(notes.operationId)).changes).toContainEqual(
      expect.objectContaining({ label: 'Page', fields: ['notes'] }),
    );
    const review = await store.operationReview(story.operationId);
    expect(review.after?.page.metadata.designIntent?.purpose).toBe('Recorded purpose');
    expect(
      review.changes.some(
        (change) => !change.elementId && change.fields.includes('metadata.designIntent'),
      ),
    ).toBe(true);
  });

  it('uses null only for added and removed page sides', async () => {
    const { store } = await fixture();
    const added = await commit(store, [{ op: 'page.add', page: { elements: [], notes: 'New' } }]);
    const pageId = added.createdPages[0].pageId;
    const removal = await commit(store, [{ op: 'page.remove', pageId }]);
    const addReview = await store.operationReview(added.operationId, pageId);
    expect(addReview.before).toBeNull();
    expect(addReview.after?.page.data.notes).toBe('New');
    expect(addReview.themeSource.before).toBe('absent');
    const removeReview = await store.operationReview(removal.operationId, pageId);
    expect(removeReview.before?.page.data.notes).toBe('New');
    expect(removeReview.after).toBeNull();
  });

  it('fails for missing source evidence instead of substituting current artwork', async () => {
    const { store, pageId, stateDir, root } = await fixture();
    const story = await commit(store, [
      { op: 'metadata.patch', pageId, set: { designIntent: { purpose: 'Recorded purpose' } } },
    ]);
    await store.close();
    stores.splice(stores.indexOf(store), 1);
    await fs.rm(path.join(stateDir, 'page-versions'), { recursive: true });
    await fs.writeFile(
      path.join(root, 'a.page'),
      'elements: []\nnotes: Unrelated current source\n',
    );
    const reopened = await openPptdStore({ entryPath: path.join(root, 'deck.pptd'), stateDir });
    stores.push(reopened);
    await expect(reopened.operationReview(story.operationId)).rejects.toMatchObject({
      code: 'HISTORY_UNAVAILABLE',
    });
  });

  it('rejects unknown, cross-project, malformed operations and unrelated page IDs', async () => {
    const { store, pageId } = await fixture();
    const other = await fixture();
    const receipt = await commit(store, [{ op: 'page.notes.set', pageId, text: 'Change' }]);
    await expect(other.store.operationReview(receipt.operationId)).rejects.toMatchObject({
      code: 'TARGET_NOT_FOUND',
    });
    await expect(store.operationReview('../history')).rejects.toMatchObject({
      code: 'INVALID_REQUEST',
    });
    await expect(
      store.operationReview(receipt.operationId, store.getSnapshot().pages[1].pageId),
    ).rejects.toMatchObject({ code: 'TARGET_NOT_FOUND' });
  });

  it('does not call an existing page absent when its recorded revision is missing', async () => {
    const { store, pageId, stateDir } = await fixture();
    const receipt = await commit(store, [
      { op: 'metadata.patch', pageId, set: { designIntent: { purpose: 'Recorded' } } },
    ]);
    const history = path.join(
      stateDir,
      'history',
      `${hashBytes(receipt.operationId).slice(7)}.json`,
    );
    const record = JSON.parse(await fs.readFile(history, 'utf8'));
    delete record.before.pages[pageId];
    await fs.writeFile(history, JSON.stringify(record));
    await expect(store.operationReview(receipt.operationId)).rejects.toMatchObject({
      code: 'HISTORY_UNAVAILABLE',
    });
  });

  it('reports recorded theme overrides and explicit manifest fallback after external changes', async () => {
    const { store, pageId, entryPath } = await fixture();
    const receipt = await commit(store, [
      { op: 'metadata.patch', pageId, set: { themeOverride: { background: 'navy' } } },
    ]);
    await fs.writeFile(
      entryPath,
      'size: [960, 540]\ntheme: { background: pink }\npages: [a.page, b.page]\n',
    );
    await store.refreshExternal();
    const review = await store.operationReview(receipt.operationId);
    expect(review.themeSource).toEqual({ before: 'current-fallback', after: 'recorded' });
    expect(review.before?.theme).toEqual({ background: 'pink' });
    expect(review.after?.theme).toEqual({ background: 'navy' });
    expect(review.warnings.join(' ')).toMatch(/theme.*fallback|fallback.*theme/i);
  });

  it('explains pure project operations without invented page artwork', async () => {
    const { store } = await fixture();
    const receipt = await commit(store, [
      {
        op: 'project.replace',
        project: {
          schemaVersion: 1,
          mainStory: { ...emptyStory(), purpose: 'Project purpose' },
          sections: [],
          presentations: [],
        },
      },
    ]);
    const review = await store.operationReview(receipt.operationId);
    expect(review.pageId).toBeNull();
    expect(review.before).toBeNull();
    expect(review.after).toBeNull();
    expect(review.warnings.join(' ')).toMatch(/no page artwork/i);
    expect(review.changes.some((change) => change.fields.includes('project'))).toBe(true);
  });

  it('caps changed objects at 100 and identifies ordering independently', async () => {
    const { store, pageId } = await fixture();
    const receipt = await commit(
      store,
      Array.from({ length: 101 }, (_, index) => ({
        op: 'element.add' as const,
        pageId,
        element: { elementId: `item-${index}`, elementType: 'text' },
      })),
    );
    const review = await store.operationReview(receipt.operationId);
    expect(review.changes).toHaveLength(100);
    expect(review.truncated).toBe(true);
    const moved = await commit(store, [
      { op: 'page.move', pageId, afterPageId: store.getSnapshot().pages[1].pageId },
    ]);
    expect(
      (await store.operationReview(moved.operationId)).changes.some(
        (change) => !change.elementId && change.fields.includes('mainPosition'),
      ),
    ).toBe(true);
  });
});
