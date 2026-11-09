import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { AssetLibraryItem, AssetLibraryResult } from '../../../pptd/asset-library';
import { createRecipe } from '../../../pptd/recipes';
import type { DeckSnapshot } from '../../../pptd/types';
import {
  commitPreparedRecipe,
  prepareRecipePreview,
  recipePreviewIsCurrent,
} from './recipe-preview';
import { PptdPageRenderer } from './renderer';

function fixture() {
  const metadata = { shortCode: 'S1', path: 'a.page', state: 'active' as const };
  const snapshot: DeckSnapshot = {
    kind: 'pptd',
    deckId: 'project',
    entry: 'deck.pptd',
    title: 'Synthetic',
    size: [960, 540],
    manifest: { pages: ['a.page'], theme: { colors: { ink: '#123456' } } },
    manifestRevision: 'sha256:manifest',
    metadataRevision: 'sha256:metadata',
    pages: [
      {
        pageId: 'a',
        path: 'a.page',
        shortCode: 'S1',
        state: 'active',
        pageRevision: 'sha256:page',
        renderRevision: 'sha256:render',
        metadata,
        assetRevisions: { 'media/old.png': 'sha256:old' },
        data: {
          elements: [
            {
              elementId: 'title',
              elementType: 'text',
              bounds: [40, 20, 880, 60],
              content: { text: 'Existing title' },
            },
            {
              elementId: 'evidence-1--left',
              elementType: 'image',
              bounds: [1, 2, 30, 40],
              src: 'media/old.png',
            },
          ],
          notes: 'Original notes',
        },
      },
    ],
    metadata: { schemaVersion: 1, deckId: 'project', entry: 'deck.pptd', slides: { a: metadata } },
    identityPersisted: true,
    writable: true,
    epoch: 'epoch',
    sequence: 1,
    diagnostics: [],
  };
  const asset = (path: string): AssetLibraryItem => ({
    path,
    name: path,
    displayName: path,
    kind: 'image',
    status: 'available',
    previewable: true,
    previewRevision: 'sha256:source',
    bytes: 100,
    usage: [],
  });
  const assets = { left: asset('media/left.png'), right: asset('media/right.png') };
  const input = {
    snapshot,
    page: snapshot.pages[0],
    recipe: 'two-evidence-figures' as const,
    assets,
    texts: { leftCaption: 'Exact caption' },
  };
  return { snapshot, page: snapshot.pages[0], assets, input };
}

describe('prepared visual recipe', () => {
  it('revalidates sources in bounded reads then submits the identical prepared payload once', async () => {
    const { input, assets } = fixture();
    assets.left.previewRevision = 'stat:100:200';
    const prepared = prepareRecipePreview(input);
    expect(prepared.page.assetRevisions?.['media/left.png']).toBeUndefined();
    expect(prepared.assetHints['media/left.png']).toBe('stat:100:200');
    const calls: unknown[] = [];
    let applied = 0;
    await commitPreparedRecipe(
      prepared,
      {
        assets: async (options) => {
          calls.push(options);
          return { items: Object.values(assets) } as AssetLibraryResult;
        },
      },
      async (operations, expected) => {
        applied++;
        expect(operations).toBe(prepared.operations);
        expect(expected).toBe(prepared.expected);
      },
      () => true,
    );
    expect(applied).toBe(1);
    expect(calls).toEqual([
      { query: 'media/left.png', kind: 'image', limit: 12 },
      { query: 'media/right.png', kind: 'image', limit: 12 },
    ]);
  });
  it('never writes after source changes or late preflight invalidation/cancellation', async () => {
    const { input, assets } = fixture();
    const prepared = prepareRecipePreview(input);
    let applied = 0;
    const apply = async () => {
      applied++;
    };
    assets.left.previewRevision = 'sha256:changed';
    await expect(
      commitPreparedRecipe(
        prepared,
        { assets: async () => ({ items: Object.values(assets) }) as AssetLibraryResult },
        apply,
        () => true,
      ),
    ).rejects.toThrow(/source image changed/i);
    const fresh = prepareRecipePreview(input);
    let active = true;
    await expect(
      commitPreparedRecipe(
        fresh,
        {
          assets: async () => {
            active = false;
            return { items: Object.values(assets) } as AssetLibraryResult;
          },
        },
        apply,
        () => active,
      ),
    ).rejects.toThrow(/changed/);
    expect(applied).toBe(0);
  });
  it('composes the whole cloned page with the exact additions and metadata committed on Add', () => {
    const { snapshot, page, input } = fixture();
    const before = structuredClone(snapshot);
    const prepared = prepareRecipePreview(input);
    const additions = prepared.operations.flatMap((operation) =>
      operation.op === 'element.add' ? [operation.element] : [],
    );
    expect(prepared.page.data.elements).toEqual([...page.data.elements, ...additions]);
    expect(prepared.page.data.elements[2].elementId).toBe('evidence-1--left-2');
    expect(prepared.page.metadata.components?.[prepared.instanceId]).toEqual(prepared.binding);
    expect(prepared.operations.at(-1)).toMatchObject({
      op: 'metadata.patch',
      set: { [`components.${prepared.instanceId}`]: prepared.binding },
    });
    expect(prepared.expected).toEqual({
      pages: { a: 'sha256:page' },
      manifest: 'sha256:manifest',
      metadata: 'sha256:metadata',
    });
    expect(prepared.page.assetRevisions).toEqual({
      'media/old.png': 'sha256:old',
      'media/left.png': 'sha256:source',
      'media/right.png': 'sha256:source',
    });
    const html = renderToStaticMarkup(
      <PptdPageRenderer page={prepared.page} size={prepared.size} theme={prepared.theme} />,
    );
    expect(html).toContain('Existing title');
    expect(html).toContain('Exact caption');
    expect(html).toContain('media%2Fold.png');
    expect(html).toContain('media%2Fright.png');
    expect(snapshot).toEqual(before);
  });
  it('reserves only an explicitly marked top title, persists margin, and keeps legacy defaults', () => {
    const { page, input } = fixture();
    expect(prepareRecipePreview(input).binding.params.margin).toBe(40);
    page.metadata.elementRoles = { title: 'title' };
    const prepared = prepareRecipePreview(input);
    expect(prepared.binding.params.margin).toBe(98);
    expect(prepared.page.data.elements[2].bounds?.[1]).toBe(98);
    expect(prepared.page.data.elements[0]).toEqual(page.data.elements[0]);
    expect(
      createRecipe({
        recipe: input.recipe,
        pageId: 'a',
        instanceId: 'legacy',
        size: input.snapshot.size,
        assets: { left: 'media/left.png', right: 'media/right.png' },
      }).binding.params.margin,
    ).toBe(40);
    page.data.elements[0].bounds = [40, 20, 880, 300];
    expect(() => prepareRecipePreview(input)).toThrow(/title/i);
  });
  it('rejects missing, unavailable, unpreviewable and nonproject sources', () => {
    for (const change of [
      { status: 'missing' },
      { status: 'unavailable' },
      { previewable: false },
      { path: 'https://example.org/a.png' },
      { path: 'media/../a.png' },
    ]) {
      const { assets, input } = fixture();
      Object.assign(assets.left, change);
      expect(() => prepareRecipePreview(input)).toThrow();
    }
    const { input } = fixture();
    expect(() => prepareRecipePreview({ ...input, assets: {} })).toThrow();
  });
  it('invalidates revisions, project identity, render assets and read-only or pinned sources', () => {
    const { snapshot, page, input } = fixture();
    const prepared = prepareRecipePreview(input);
    expect(recipePreviewIsCurrent(prepared, snapshot, page)).toBe(true);
    for (const change of [
      { manifestRevision: 'sha256:new' as const },
      { metadataRevision: 'sha256:new' as const },
      { deckId: 'other' },
      { writable: false },
    ])
      expect(recipePreviewIsCurrent(prepared, { ...snapshot, ...change }, page)).toBe(false);
    for (const change of [
      { pageRevision: 'sha256:new' as const },
      { renderRevision: 'sha256:new' as const },
      { versionId: 'pinned' },
      { assetRevisions: { 'media/old.png': 'sha256:changed' as const } },
    ])
      expect(recipePreviewIsCurrent(prepared, snapshot, { ...page, ...change })).toBe(false);
    expect(() => prepareRecipePreview({ ...input, page: { ...page, versionId: 'pin' } })).toThrow();
  });
});
