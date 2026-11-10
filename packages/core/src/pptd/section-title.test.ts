import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { projectTestDirectory } from './project-directory.test-utils';
import { emptyStory, readProjectModel, resolveProjectSections } from './project-model';
import { createSectionTitlePage } from './section-title';
import { openPptdStore, type PptdStore } from './store';
import type { PptdOperation, TransactionRequest } from './types';

const stores: PptdStore[] = [];
const directories: string[] = [];
afterEach(async () => {
  await Promise.allSettled(stores.splice(0).map((store) => store.close()));
  await Promise.all(
    directories.splice(0).map((directory) => fs.rm(directory, { recursive: true, force: true })),
  );
});
async function fixture() {
  const root = await projectTestDirectory('section-title-');
  directories.push(root);
  await fs.mkdir(path.join(root, 'pages'));
  await fs.writeFile(
    path.join(root, 'deck.pptd'),
    'title: Public example\nsize: [960, 540]\npages: [pages/a.page, pages/b.page]\n',
  );
  for (const name of ['a', 'b'])
    await fs.writeFile(path.join(root, `pages/${name}.page`), `elements: []\nnotes: ${name}\n`);
  const store = await openPptdStore({
    entryPath: path.join(root, 'deck.pptd'),
    stateDir: path.join(root, 'state'),
  });
  stores.push(store);
  const snapshot = store.getSnapshot();
  await store.commit(
    request(store, [
      {
        op: 'project.replace',
        project: {
          ...readProjectModel(snapshot.metadata),
          sections: snapshot.pages.map((page, index) => ({
            id: `section-${index}`,
            title: `Topic ${index}`,
            startPageId: page.pageId,
            pageIds: [page.pageId],
            story: { ...emptyStory(), purpose: 'Preserve this purpose' },
          })),
        },
      },
    ]),
  );
  return store;
}
function request(store: PptdStore, operations: PptdOperation[]): TransactionRequest {
  const snapshot = store.getSnapshot();
  return {
    requestId: randomUUID(),
    actor: 'section-title-test',
    deckId: snapshot.deckId,
    expected: { manifest: snapshot.manifestRevision, metadata: snapshot.metadataRevision },
    operations,
  };
}
describe('Section title insertion', () => {
  it('keeps section identity, Story and other pages, and restores the previous order with one Undo', async () => {
    const store = await fixture();
    const before = store.getSnapshot();
    const original = before.pages.map((page) => ({ pageId: page.pageId, data: page.data }));
    const result = await store.commit(
      request(store, [
        {
          op: 'page.add',
          sectionId: 'section-1',
          afterPageId: before.pages[0].pageId,
          page: createSectionTitlePage(before.size, 'Topic 1', 'title'),
        },
      ]),
    );
    const after = store.getSnapshot();
    const added = result.createdPages[0].pageId;
    const groups = resolveProjectSections(after);
    expect(groups.map((group) => group.section.id)).toEqual(['section-0', 'section-1']);
    expect(groups[1].pageIds).toEqual([added, before.pages[1].pageId]);
    expect(groups[1].section.story.purpose).toBe('Preserve this purpose');
    expect(after.pages.find((page) => page.pageId === added)?.metadata.elementRoles).toEqual({
      title: 'title',
    });
    expect(
      after.pages
        .filter((page) => page.pageId !== added)
        .map((page) => ({ pageId: page.pageId, data: page.data })),
    ).toEqual(original);
    await store.undo(result.operationId);
    const undone = store.getSnapshot();
    expect(undone.pages.map((page) => ({ pageId: page.pageId, data: page.data }))).toEqual(
      original,
    );
    expect(undone.metadata.project).toEqual(before.metadata.project);
  });
  it('rejects a stale placement without adding a page or changing the Section', async () => {
    const store = await fixture();
    const before = store.getSnapshot();
    await expect(
      store.commit(
        request(store, [
          {
            op: 'page.add',
            sectionId: 'section-1',
            afterPageId: null,
            page: createSectionTitlePage(before.size, 'Topic 1', 'title'),
          },
        ]),
      ),
    ).rejects.toMatchObject({ code: 'INVALID_REQUEST' });
    expect(store.getSnapshot().pages).toEqual(before.pages);
    expect(store.getSnapshot().metadata.project).toEqual(before.metadata.project);
  });
});
