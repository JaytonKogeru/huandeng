import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { projectSlideTitle } from '../app/lib/pptd-project-source';
import { agentGuide } from './agent-guide';
import { projectTestDirectory } from './project-directory.test-utils';
import { openPptdStore, type PptdStore } from './store';
import type { MetadataPatchOperation, PptdOperation, TransactionRequest } from './types';

const stores: PptdStore[] = [];
const directories: string[] = [];

afterEach(async () => {
  await Promise.all(stores.splice(0).map((store) => store.close()));
  await Promise.all(
    directories.splice(0).map((directory) => fs.rm(directory, { recursive: true, force: true })),
  );
});

async function fixture() {
  const directory = await projectTestDirectory('huandeng-guide-');
  directories.push(directory);
  const root = path.join(directory, 'project');
  await fs.mkdir(path.join(root, 'pages'), { recursive: true });
  const entryPath = path.join(root, 'deck.pptd');
  await fs.writeFile(
    entryPath,
    'title: Guide fixture\nsize: [960, 540]\npages: [pages/start.page]\n',
  );
  await fs.writeFile(path.join(root, 'pages/start.page'), 'elements: []\n');
  const store = await openPptdStore({ entryPath, stateDir: path.join(directory, 'state') });
  stores.push(store);
  return store;
}

function transaction(store: PptdStore, operations: PptdOperation[]): TransactionRequest {
  const snapshot = store.getSnapshot();
  return {
    requestId: randomUUID(),
    actor: 'guide-test',
    deckId: snapshot.deckId,
    expected: {
      metadata: snapshot.metadataRevision,
      manifest: snapshot.manifestRevision,
      pages: Object.fromEntries(snapshot.pages.map((page) => [page.pageId, page.pageRevision])),
    },
    operations,
  };
}

describe('Agent authoring guide contract', () => {
  it('documents only metadata roots accepted by the writer, with their additional preconditions', async () => {
    const store = await fixture();
    const pageId = store.getSnapshot().pages[0].pageId;
    const examples: Record<string, unknown> = {
      designIntent: { purpose: 'A real point' },
      elementRoles: {},
      components: {},
      themeOverride: { background: '#ffffff' },
      hidden: true,
    };
    const guide = agentGuide('operations').text;
    const documented = [...guide.matchAll(/^\| (\w+) \| .+ \| (metadata[^|]*) \|$/gm)];
    expect(documented.map((row) => row[1])).toEqual(Object.keys(examples));
    for (const row of documented) {
      const request = transaction(store, [
        { op: 'metadata.patch', pageId, set: { [row[1]]: examples[row[1]] } },
      ]);
      if (row[2].includes('target page')) {
        await expect(
          store.preview({ ...request, expected: { ...request.expected, pages: {} } }),
        ).rejects.toMatchObject({ code: 'MISSING_PRECONDITION' });
      }
      if (row[2].includes('manifest')) {
        const { manifest: _manifest, ...expected } = request.expected;
        await expect(store.preview({ ...request, expected })).rejects.toMatchObject({
          code: 'MISSING_PRECONDITION',
        });
      }
      const preview = await store.preview(request);
      await store.commit(request, preview.previewHash);
      expect(store.readPage(pageId).metadata[row[1]]).toEqual(examples[row[1]]);
    }
    for (const field of ['label', 'shortCode', 'path', 'state', 'lastAuthorReview']) {
      await expect(
        store.preview(
          transaction(store, [{ op: 'metadata.patch', pageId, set: { [field]: 'not writable' } }]),
        ),
      ).rejects.toMatchObject({ code: 'INVALID_REQUEST' });
    }
  });

  it('executes the documented title-role patch only after applying creation and refreshing revisions', async () => {
    const store = await fixture();
    const create = transaction(store, [
      {
        op: 'page.add',
        page: {
          elements: [
            {
              elementId: 'title-text',
              elementType: 'text',
              role: 'title',
              bounds: [30, 30, 800, 50],
              content: { text: 'A visible title', fontSize: 28 },
            },
          ],
        },
      },
    ]);
    const preview = await store.preview(create);
    expect(preview.pages[0].provisional).toBe(true);
    const result = await store.commit(create, preview.previewHash);
    const pageId = result.createdPages[0].pageId;
    expect(projectSlideTitle(store.readPage(pageId))).toBe('A visible title');
    const example = agentGuide('operations')
      .text.split('\n')
      .find((line) => line.trim().startsWith('{"op":"metadata.patch"'));
    expect(example).toBeDefined();
    if (!example) throw new Error('The guide must include a title-role metadata example.');
    const operation = { ...(JSON.parse(example.trim()) as MetadataPatchOperation), pageId };
    const second = transaction(store, [operation]);
    await expect(
      store.preview({
        ...second,
        expected: { ...second.expected, metadata: create.expected.metadata },
      }),
    ).rejects.toMatchObject({ code: 'REVISION_CONFLICT' });
    const proposal = await store.preview(second);
    await store.commit(second, proposal.previewHash);
    const page = store.readPage(pageId);
    expect(page.metadata.elementRoles?.['title-text']).toBe('title');
    expect(page.metadata.designIntent?.purpose).toBe('The point of this page');
    expect(projectSlideTitle(page)).toBe('A visible title');
    expect(
      projectSlideTitle({ ...page, data: { ...page.data, title: 'Explicit legacy title' } }),
    ).toBe('Explicit legacy title');
  });
});
