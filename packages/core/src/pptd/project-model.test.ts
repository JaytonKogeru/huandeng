import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { projectTestDirectory } from './project-directory.test-utils';
import {
  applyProjectOperation,
  assertPresentationReady,
  emptyStory,
  type ProjectModel,
  readProjectModel,
  resolvePresentation,
  resolveProjectSections,
  validateProjectModel,
} from './project-model';
import { openPptdStore, type PptdStore } from './store';
import type { DeckSnapshot, PageSnapshot, PptdOperation, ProjectMetadata } from './types';

function project(): ProjectModel {
  return {
    schemaVersion: 1,
    mainStory: { purpose: 'Research record', audience: 'Lab', takeaway: 'Complete evidence' },
    sections: [
      { id: 'background', title: 'Background', story: emptyStory(), pageIds: ['a', 'b'] },
      { id: 'result', title: 'Results', story: emptyStory(), pageIds: ['c'] },
    ],
    presentations: [
      {
        id: 'talk',
        title: 'Conference',
        story: { purpose: 'Explain result', audience: 'Peers', takeaway: 'The finding' },
        items: [
          { id: 'opening', kind: 'page', pageId: 'a' },
          { id: 'results', kind: 'section', sectionId: 'result' },
          {
            id: 'return',
            kind: 'page',
            pageId: 'a',
            versionId: 'checkpoint:v1',
            notes: 'Return to the question',
          },
        ],
      },
      {
        id: 'lab',
        title: 'Lab meeting',
        story: emptyStory(),
        items: [{ id: 'all-background', kind: 'section', sectionId: 'background' }],
      },
    ],
  };
}

function snapshot(model?: ProjectModel): DeckSnapshot {
  const pages: PageSnapshot[] = ['a', 'b', 'c'].map((pageId, index) => ({
    pageId,
    shortCode: `ABC${index}`,
    path: `pages/${pageId}.page`,
    state: 'active',
    pageRevision: 'sha256:page',
    renderRevision: 'sha256:render',
    data: { elements: [], notes: `Main ${pageId}` },
    metadata: {
      shortCode: `ABC${index}`,
      label: `S${index + 1}`,
      path: `pages/${pageId}.page`,
      state: 'active',
    },
  }));
  const metadata: ProjectMetadata = {
    schemaVersion: 1,
    deckId: 'deck',
    entry: 'deck.pptd',
    slides: Object.fromEntries(pages.map((page) => [page.pageId, page.metadata])),
    ...(model ? { project: model } : {}),
  };
  return {
    kind: 'pptd',
    deckId: 'deck',
    entry: 'deck.pptd',
    title: 'Main library',
    size: [960, 540],
    manifest: { pages: pages.map((page) => page.path) },
    manifestRevision: 'sha256:manifest',
    metadataRevision: 'sha256:metadata',
    pages,
    metadata,
    identityPersisted: true,
    writable: true,
    epoch: 'epoch',
    sequence: 0,
    diagnostics: [],
  };
}

describe('Main Slides and reusable presentation stories', () => {
  it('opens legacy projects with one canonical Main Slides collection and no implicit writes', () => {
    const deck = snapshot();
    const original = structuredClone(deck);
    expect(readProjectModel(deck.metadata)).toEqual({
      schemaVersion: 1,
      mainStory: emptyStory(),
      sections: [],
      presentations: [],
    });
    expect(resolvePresentation(deck).pages.map((page) => page.pageId)).toEqual(['a', 'b', 'c']);
    expect(deck).toEqual(original);
    expect(deck.metadata.project).toBeUndefined();
  });

  it('resolves ordered live sections, repeated page occurrences, pinned versions and local notes', () => {
    const deck = snapshot(project());
    const resolved = assertPresentationReady(deck, 'talk');
    expect(resolved.title).toBe('Conference');
    expect(resolved.pages.map((page) => page.pageId)).toEqual(['a', 'c', 'a']);
    expect(new Set(resolved.pages.map((page) => page.occurrenceId)).size).toBe(3);
    expect(resolved.pages[1].sectionId).toBe('result');
    expect(resolved.pages[2]).toMatchObject({
      versionId: 'checkpoint:v1',
      notes: 'Return to the question',
    });
    expect(deck.pages).toHaveLength(3);
    expect(deck.pages[0].data.notes).toBe('Main a');
    expect(resolvePresentation(deck, 'lab').pages.map((page) => page.pageId)).toEqual(['a', 'b']);
  });

  it('follows section membership changes while keeping Main Slides order independent', () => {
    const deck = snapshot(project());
    const changed = project();
    changed.sections[0].pageIds = ['b'];
    changed.sections[1].pageIds = ['a', 'c'];
    deck.metadata = applyProjectOperation(
      deck.metadata,
      { op: 'project.replace', project: changed },
      deck,
    );
    expect(resolvePresentation(deck, 'talk').pages.map((page) => page.pageId)).toEqual([
      'a',
      'a',
      'c',
      'a',
    ]);
    expect(resolvePresentation(deck).pages.map((page) => page.pageId)).toEqual(['a', 'b', 'c']);
  });

  it('rejects duplicate IDs, multiple section membership and malformed versions', () => {
    const duplicate = project();
    duplicate.sections[1].pageIds.push('a');
    expect(() => validateProjectModel(duplicate)).toThrow('Section page membership');
    const duplicateItem = project();
    duplicateItem.presentations[0].items[1].id = 'opening';
    expect(() => validateProjectModel(duplicateItem)).toThrow('duplicates ID');
    const bad = project();
    expect(() => validateProjectModel({ ...bad, schemaVersion: 2 })).toThrow('schemaVersion');
    expect(() => validateProjectModel({ ...bad, mainStory: { purpose: 5 } })).toThrow('purpose');
    expect(() =>
      validateProjectModel({
        ...bad,
        presentations: [
          {
            ...bad.presentations[0],
            items: [{ id: 'x', kind: 'page', pageId: 'a', versionId: '../../escape' }],
          },
        ],
      }),
    ).toThrow('ID characters');
  });

  it('preserves missing page occurrences and blocks incomplete presentation export', () => {
    const deck = snapshot(project());
    deck.pages = deck.pages.filter((page) => page.pageId !== 'c');
    deck.metadata.slides.c.state = 'tombstone';
    const resolved = resolvePresentation(deck, 'talk');
    expect(resolved.pages.map((page) => page.pageId)).toEqual(['a', 'c', 'a']);
    expect(resolved.diagnostics).toContainEqual(
      expect.objectContaining({
        code: 'PRESENTATION_PAGE_UNAVAILABLE',
        pageId: 'c',
        severity: 'error',
      }),
    );
    expect(() => assertPresentationReady(deck, 'talk')).toThrow(
      'Restore the slide or remove its reference',
    );
    expect(() => assertPresentationReady(deck, 'lab')).not.toThrow();
    const renamed = project();
    renamed.mainStory.purpose = 'Revised narrative';
    expect(() =>
      applyProjectOperation(deck.metadata, { op: 'project.replace', project: renamed }, deck),
    ).not.toThrow();
  });

  it('keeps deleted section references visible and rejects new unknown targets', () => {
    const deck = snapshot(project());
    const changed = project();
    changed.sections = changed.sections.filter((section) => section.id !== 'result');
    deck.metadata = applyProjectOperation(
      deck.metadata,
      { op: 'project.replace', project: changed },
      deck,
    );
    expect(resolvePresentation(deck, 'talk').diagnostics).toContainEqual(
      expect.objectContaining({ code: 'PRESENTATION_SECTION_UNAVAILABLE' }),
    );
    expect(() => assertPresentationReady(deck, 'talk')).toThrow('missing section');
    changed.presentations[0].items.push({ id: 'bad-page', kind: 'page', pageId: 'missing' });
    expect(() =>
      applyProjectOperation(deck.metadata, { op: 'project.replace', project: changed }, deck),
    ).toThrow('Main Slide missing');
    changed.presentations[0].items.pop();
    changed.presentations[0].items.push({
      id: 'bad-section',
      kind: 'section',
      sectionId: 'missing',
    });
    expect(() =>
      applyProjectOperation(deck.metadata, { op: 'project.replace', project: changed }, deck),
    ).toThrow('Section missing');
  });

  it('blocks empty and nonexistent presentations without silently falling back to Main Slides', () => {
    const model = project();
    model.presentations[0].items = [];
    const deck = snapshot(model);
    expect(() => assertPresentationReady(deck, 'talk')).toThrow('has no slides');
    expect(() => resolvePresentation(deck, 'unknown')).toThrow('does not exist');
  });

  it('normalizes a detached value and keeps unrelated project metadata unchanged', () => {
    const deck = snapshot();
    deck.metadata.customUserField = { preserved: true };
    const model = project();
    const updated = applyProjectOperation(
      deck.metadata,
      { op: 'project.replace', project: model },
      deck,
    );
    model.mainStory.purpose = 'Mutated after commit';
    expect(readProjectModel(updated).mainStory.purpose).toBe('Research record');
    expect(updated.customUserField).toEqual({ preserved: true });
    expect(deck.metadata.project).toBeUndefined();
  });
});

describe('Section ranges anchored to stable Main Slide IDs', () => {
  function rangeProject() {
    const model = project();
    model.sections[0].range = { startPageId: 'a', endPageId: 'b' };
    return model;
  }

  it('includes insertions inside the boundaries and derives Positions without rewriting metadata', () => {
    const model = rangeProject();
    const deck = snapshot(model);
    const inserted = structuredClone(deck.pages[1]);
    inserted.pageId = 'new';
    inserted.path = 'pages/new.page';
    inserted.metadata.path = inserted.path;
    const outside = structuredClone(inserted);
    outside.pageId = 'outside';
    outside.path = 'pages/outside.page';
    outside.metadata.path = outside.path;
    deck.pages.splice(1, 0, inserted);
    deck.pages.unshift(outside);
    const before = structuredClone(deck.metadata);
    expect(resolveProjectSections(deck)[0]).toMatchObject({
      pageIds: ['a', 'new', 'b'],
      startPosition: 2,
      endPosition: 4,
      contiguous: true,
      diagnostics: [],
    });
    expect(assertPresentationReady(deck, 'lab').pages.map((page) => page.pageId)).toEqual([
      'a',
      'new',
      'b',
    ]);
    expect(deck.metadata).toEqual(before);
    expect(model.sections[0].pageIds).toEqual(['a', 'b']);
  });

  it('preserves custom legacy membership and order until an explicit range is saved', () => {
    const model = project();
    model.sections[0].pageIds = ['b', 'a'];
    const deck = snapshot(model);
    expect(resolveProjectSections(deck)[0]).toMatchObject({
      pageIds: ['b', 'a'],
      contiguous: false,
      diagnostics: [],
    });
    expect(assertPresentationReady(deck, 'lab').pages.map((page) => page.pageId)).toEqual([
      'b',
      'a',
    ]);
    const updated = structuredClone(model);
    updated.sections[0].range = { startPageId: 'a', endPageId: 'b' };
    deck.metadata = applyProjectOperation(
      deck.metadata,
      { op: 'project.replace', project: updated },
      deck,
    );
    expect(readProjectModel(deck.metadata).sections[0].pageIds).toEqual(['a', 'b']);
    expect(readProjectModel(deck.metadata).sections[0].range).toEqual({
      startPageId: 'a',
      endPageId: 'b',
    });
  });

  it('blocks only affected Presentations when a range boundary is missing or reversed', () => {
    const deck = snapshot(rangeProject());
    deck.pages = deck.pages.filter((page) => page.pageId !== 'b');
    expect(resolvePresentation(deck, 'lab').diagnostics).toContainEqual(
      expect.objectContaining({ code: 'SECTION_RANGE_BOUNDARY_UNAVAILABLE', pageId: 'b' }),
    );
    expect(() => assertPresentationReady(deck, 'lab')).toThrow('unavailable range boundary');
    expect(() => assertPresentationReady(deck, 'talk')).not.toThrow();
    expect(() => assertPresentationReady(deck)).not.toThrow();
    const reversed = snapshot(rangeProject());
    reversed.pages = [reversed.pages[1], reversed.pages[0], reversed.pages[2]];
    expect(() => assertPresentationReady(reversed, 'lab')).toThrow('start after its end');
    expect(() => assertPresentationReady(reversed, 'talk')).not.toThrow();
  });

  it('detects newly overlapping ranges after Main Slides are reordered', () => {
    const model = rangeProject();
    model.sections[1].range = { startPageId: 'c', endPageId: 'c' };
    const deck = snapshot(model);
    deck.pages = [deck.pages[0], deck.pages[2], deck.pages[1]];
    expect(
      resolveProjectSections(deck).every((item) =>
        item.diagnostics.some((diagnostic) => diagnostic.code === 'SECTION_RANGE_OVERLAP'),
      ),
    ).toBe(true);
    expect(() => assertPresentationReady(deck, 'lab')).toThrow('overlap');
    expect(() => assertPresentationReady(deck, 'talk')).toThrow('overlap');
    expect(() => assertPresentationReady(deck)).not.toThrow();
  });

  it('rejects a newly invalid range while allowing unrelated edits on an already broken range', () => {
    const deck = snapshot(project());
    const overlap = rangeProject();
    overlap.sections[0].range = { startPageId: 'a', endPageId: 'c' };
    expect(() =>
      applyProjectOperation(deck.metadata, { op: 'project.replace', project: overlap }, deck),
    ).toThrow('overlap');
    const broken = snapshot(rangeProject());
    broken.pages = broken.pages.filter((page) => page.pageId !== 'b');
    const edit = rangeProject();
    edit.mainStory.purpose = 'Revised Story';
    const saved = applyProjectOperation(
      broken.metadata,
      { op: 'project.replace', project: edit },
      broken,
    );
    expect(readProjectModel(saved).mainStory.purpose).toBe('Revised Story');
    expect(readProjectModel(saved).sections[0].range).toEqual({ startPageId: 'a', endPageId: 'b' });
  });

  it('validates stable boundary IDs instead of accepting positional or path values', () => {
    const model = rangeProject();
    expect(() =>
      validateProjectModel({
        ...model,
        sections: [{ ...model.sections[0], range: { startPageId: 1, endPageId: 2 } }],
      }),
    ).toThrow('startPageId');
    expect(() =>
      validateProjectModel({
        ...model,
        sections: [{ ...model.sections[0], range: { startPageId: '../page', endPageId: 'b' } }],
      }),
    ).toThrow('ID characters');
  });
});

const temporary: string[] = [];
const stores: PptdStore[] = [];
afterEach(async () => {
  await Promise.allSettled(stores.splice(0).map((store) => store.close()));
  await Promise.all(
    temporary.splice(0).map((directory) => fs.rm(directory, { recursive: true, force: true })),
  );
});

async function fixture() {
  const root = await projectTestDirectory('huandeng-project-model-', ['']);
  temporary.push(root);
  await fs.mkdir(path.join(root, 'pages'));
  const entryPath = path.join(root, 'deck.pptd');
  await fs.writeFile(
    entryPath,
    '# Main library\nsize: [960, 540]\npages: [pages/a.page, pages/b.page]\n',
  );
  const source = '# Keep author comments\nelements: []\nnotes: Original notes\n';
  await fs.writeFile(path.join(root, 'pages/a.page'), source);
  await fs.writeFile(path.join(root, 'pages/b.page'), source);
  const store = await openPptdStore({ entryPath, stateDir: path.join(root, 'runtime') });
  stores.push(store);
  const [first, second] = store.getSnapshot().pages;
  const model: ProjectModel = {
    schemaVersion: 1,
    mainStory: emptyStory(),
    sections: [
      {
        id: 'research',
        title: 'Research',
        pageIds: [second.pageId, first.pageId],
        story: emptyStory(),
      },
    ],
    presentations: [
      {
        id: 'talk',
        title: 'Research seminar',
        story: emptyStory(),
        items: [{ id: 'chapter', kind: 'section', sectionId: 'research' }],
      },
    ],
  };
  const commit = (operations: PptdOperation[]) => {
    const snapshot = store.getSnapshot();
    return store.commit({
      requestId: randomUUID(),
      deckId: snapshot.deckId,
      actor: 'test',
      expected: {
        metadata: snapshot.metadataRevision,
        manifest: snapshot.manifestRevision,
        pages: Object.fromEntries(
          Object.keys(snapshot.metadata.slides).map((pageId) => [
            pageId,
            store.readPage(pageId).pageRevision,
          ]),
        ),
      },
      operations,
    });
  };
  return { root, entryPath, source, store, model, first, second, commit };
}

describe('durable project organization transactions', () => {
  it('retains boundary semantics through insertion, save and reopen', async () => {
    const { root, entryPath, store, model, first, second, commit } = await fixture();
    model.sections[0].pageIds = [first.pageId, second.pageId];
    model.sections[0].range = { startPageId: first.pageId, endPageId: second.pageId };
    await commit([{ op: 'project.replace', project: model }]);
    await commit([
      {
        op: 'page.add',
        afterPageId: first.pageId,
        page: { elements: [], notes: 'Inserted inside Section' },
      },
    ]);
    const expected = store.getSnapshot().pages.map((page) => page.pageId);
    expect(expected).toHaveLength(3);
    expect(
      assertPresentationReady(store.getSnapshot(), 'talk').pages.map((page) => page.pageId),
    ).toEqual(expected);
    await store.close();
    const reopened = await openPptdStore({
      entryPath,
      stateDir: path.join(root, 'runtime-range-reopen'),
    });
    stores.push(reopened);
    expect(
      assertPresentationReady(reopened.getSnapshot(), 'talk').pages.map((page) => page.pageId),
    ).toEqual(expected);
    expect(readProjectModel(reopened.getSnapshot().metadata).sections[0].range).toEqual({
      startPageId: first.pageId,
      endPageId: second.pageId,
    });
  });
  it('persists and reopens stories and references without rewriting canonical page sources', async () => {
    const { root, entryPath, source, store, model, second, first, commit } = await fixture();
    await commit([{ op: 'project.replace', project: model }]);
    expect(await fs.readFile(path.join(root, 'pages/a.page'), 'utf8')).toBe(source);
    expect(await fs.readFile(path.join(root, 'pages/b.page'), 'utf8')).toBe(source);
    expect(
      assertPresentationReady(store.getSnapshot(), 'talk').pages.map((page) => page.pageId),
    ).toEqual([second.pageId, first.pageId]);
    const saved = JSON.parse(await fs.readFile(path.join(root, '.huandeng/project.json'), 'utf8'));
    expect(saved.project).toEqual(model);
    await store.close();
    const reopened = await openPptdStore({ entryPath, stateDir: path.join(root, 'runtime-new') });
    stores.push(reopened);
    expect(readProjectModel(reopened.getSnapshot().metadata)).toEqual(model);
    expect(reopened.getSnapshot().pages.map((page) => page.pageId)).toEqual([
      first.pageId,
      second.pageId,
    ]);
  });

  it('requires metadata CAS and rejects stale edits without partial mutation', async () => {
    const { store, model, commit } = await fixture();
    const original = store.getSnapshot();
    await expect(
      store.commit({
        requestId: randomUUID(),
        deckId: original.deckId,
        actor: 'test',
        expected: {},
        operations: [{ op: 'project.replace', project: model }],
      }),
    ).rejects.toMatchObject({ code: 'MISSING_PRECONDITION' });
    await commit([{ op: 'project.replace', project: model }]);
    const changed = structuredClone(model);
    changed.mainStory.purpose = 'Stale edit';
    await expect(
      store.commit({
        requestId: randomUUID(),
        deckId: original.deckId,
        actor: 'test',
        expected: { metadata: original.metadataRevision },
        operations: [{ op: 'project.replace', project: changed }],
      }),
    ).rejects.toMatchObject({ code: 'REVISION_CONFLICT' });
    expect(readProjectModel(store.getSnapshot().metadata)).toEqual(model);
  });

  it('retains references after page removal and repairs them when the canonical page is restored', async () => {
    const { store, model, second, commit } = await fixture();
    await commit([{ op: 'project.replace', project: model }]);
    await commit([{ op: 'page.remove', pageId: second.pageId }]);
    expect(readProjectModel(store.getSnapshot().metadata).sections[0].pageIds).toContain(
      second.pageId,
    );
    expect(() => assertPresentationReady(store.getSnapshot(), 'talk')).toThrow(
      'unavailable Main Slide',
    );
    await commit([{ op: 'page.restore', pageId: second.pageId }]);
    expect(
      assertPresentationReady(store.getSnapshot(), 'talk').pages.map((page) => page.pageId),
    ).toEqual(model.sections[0].pageIds);
  });
});
