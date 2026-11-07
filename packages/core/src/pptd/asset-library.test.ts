import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { readAssetLibrary } from './asset-library';
import { insightFixture } from './project-insights.test-utils';

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })));
});

async function directory() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'huandeng-asset-library-'));
  roots.push(root);
  return root;
}

async function fixture() {
  const root = await directory();
  await fs.mkdir(path.join(root, 'media/imported'), { recursive: true });
  await fs.mkdir(path.join(root, 'assets'), { recursive: true });
  await fs.mkdir(path.join(root, 'media/.huandeng-versions'), { recursive: true });
  await fs.writeFile(path.join(root, 'media/imported/hash.png'), 'Exact original bytes');
  await fs.writeFile(path.join(root, 'media/unused.svg'), '<svg/>');
  await fs.writeFile(path.join(root, 'assets/font.woff2'), 'font bytes');
  await fs.writeFile(path.join(root, 'media/.huandeng-versions/old.png'), 'historical bytes');
  const snapshot = insightFixture();
  snapshot.pages[0].data.elements = [
    {
      elementId: 'figure-a',
      elementType: 'image',
      src: './media/imported/hash.png',
      sourceName: 'Original gel.png',
    },
    { elementId: 'figure-missing', elementType: 'image', src: 'media/missing.png' },
    {
      elementId: 'external',
      elementType: 'image',
      src: 'https://example.test/image.png',
    },
    { elementId: 'embedded', elementType: 'image', src: 'data:image/png;base64,AAAA' },
  ];
  snapshot.pages[1].data.elements = [
    { elementId: 'figure-b', elementType: 'image', src: 'media/imported/hash.png' },
  ];
  snapshot.pages[0].assetRevisions = {
    './media/imported/hash.png': 'sha256:original-image',
    'media/missing.png': null,
  };
  snapshot.manifest.theme = { font: { url: 'assets/font.woff2' } };
  return { root, snapshot };
}

describe('project asset discovery and precise usages', () => {
  it('finds files, deduplicates references and retains the element and source name for repair', async () => {
    const { root, snapshot } = await fixture();
    const before = structuredClone(snapshot);
    const result = await readAssetLibrary(root, snapshot);
    expect(result.counts).toEqual({ all: 4, used: 3, unused: 1, missing: 1 });
    const figure = result.items.find((asset) => asset.path === 'media/imported/hash.png');
    expect(figure).toMatchObject({
      displayName: 'Original gel.png',
      kind: 'image',
      status: 'available',
      previewable: true,
      previewRevision: 'sha256:original-image',
      bytes: 20,
    });
    expect(figure?.usage).toEqual([
      expect.objectContaining({
        pageId: 'agenda',
        elementId: 'figure-a',
        field: 'src',
        reference: './media/imported/hash.png',
        pageRevision: 'sha256:agenda',
      }),
      expect.objectContaining({
        pageId: 'evidence',
        elementId: 'figure-b',
        reference: 'media/imported/hash.png',
      }),
    ]);
    const font = result.items.find((asset) => asset.path === 'assets/font.woff2');
    expect(font?.usage).toHaveLength(3);
    expect(font?.usage[0]).toMatchObject({ scope: 'theme', field: 'font.url' });
    expect(result.items.some((asset) => asset.path.includes('.huandeng-versions'))).toBe(false);
    expect(snapshot).toEqual(before);
    expect(await fs.readFile(path.join(root, 'media/imported/hash.png'), 'utf8')).toBe(
      'Exact original bytes',
    );
    expect(await fs.readdir(root)).toEqual(['assets', 'media']);
  });

  it('searches original filenames and page labels, filters usages and paginates stable paths', async () => {
    const { root, snapshot } = await fixture();
    expect(
      (await readAssetLibrary(root, snapshot, { query: 'GEL' })).items.map((asset) => asset.path),
    ).toEqual(['media/imported/hash.png']);
    expect((await readAssetLibrary(root, snapshot, { query: 'S2' })).total).toBe(2);
    expect((await readAssetLibrary(root, snapshot, { filter: 'missing' })).items[0]).toMatchObject({
      path: 'media/missing.png',
      status: 'missing',
    });
    expect(
      (await readAssetLibrary(root, snapshot, { filter: 'unused' })).items.map(
        (asset) => asset.path,
      ),
    ).toEqual(['media/unused.svg']);
    expect((await readAssetLibrary(root, snapshot, { pageId: 'evidence' })).total).toBe(2);
    const first = await readAssetLibrary(root, snapshot, { limit: 2 });
    const second = await readAssetLibrary(root, snapshot, { limit: 2, offset: 2 });
    expect(first.hasMore).toBe(true);
    expect(second.hasMore).toBe(false);
    expect(new Set([...first.items, ...second.items].map((asset) => asset.path)).size).toBe(4);
  });

  it('includes referenced archived assets while leaving unreferenced archives out of the gallery', async () => {
    const { root, snapshot } = await fixture();
    snapshot.pages[0].data.elements.push({
      elementId: 'restored',
      elementType: 'image',
      src: 'media/.huandeng-versions/old.png',
    });
    const result = await readAssetLibrary(root, snapshot);
    expect(result.items.find((asset) => asset.path.includes('.huandeng-versions'))).toMatchObject({
      status: 'available',
      previewable: true,
    });
    expect(result.scope).toBe('current-main');
  });

  it('keeps each preview identity stable for text edits and updates only changed asset revisions or file stats', async () => {
    const { root, snapshot } = await fixture();
    const first = await readAssetLibrary(root, snapshot);
    const revision = (result: typeof first, source: string) =>
      result.items.find((asset) => asset.path === source)?.previewRevision;
    expect(revision(first, 'media/imported/hash.png')).toBe('sha256:original-image');
    expect(revision(first, 'media/unused.svg')).toMatch(/^stat:/);
    expect(revision(first, 'media/missing.png')).toBeNull();
    snapshot.pages[0].data.notes = 'A normal text edit';
    snapshot.pages[0].pageRevision = 'sha256:edited-page';
    snapshot.pages[0].renderRevision = 'sha256:edited-render';
    snapshot.sequence++;
    const textEdited = await readAssetLibrary(root, snapshot);
    expect(textEdited.items.map((asset) => [asset.path, asset.previewRevision])).toEqual(
      first.items.map((asset) => [asset.path, asset.previewRevision]),
    );
    snapshot.pages[0].assetRevisions = {
      ...snapshot.pages[0].assetRevisions,
      './media/imported/hash.png': 'sha256:changed-image',
    };
    const changed = await readAssetLibrary(root, snapshot);
    expect(revision(changed, 'media/imported/hash.png')).toBe('sha256:changed-image');
    expect(revision(changed, 'media/unused.svg')).toBe(revision(first, 'media/unused.svg'));
    const unusedPath = path.join(root, 'media/unused.svg');
    await fs.writeFile(unusedPath, '<svg viewBox="0 0 120 80"/>');
    await fs.utimes(unusedPath, new Date(), new Date(Date.now() + 2000));
    const fileChanged = await readAssetLibrary(root, snapshot);
    expect(revision(fileChanged, 'media/unused.svg')).toMatch(/^stat:/);
    expect(revision(fileChanged, 'media/unused.svg')).not.toBe(revision(first, 'media/unused.svg'));
    expect(revision(fileChanged, 'media/imported/hash.png')).toBe(
      revision(changed, 'media/imported/hash.png'),
    );
  });

  it('does not read external paths or follow symlinks, and retains unsafe references as unavailable', async () => {
    const { root, snapshot } = await fixture();
    const outside = await directory();
    await fs.writeFile(path.join(outside, 'private.png'), 'private');
    await fs.symlink(outside, path.join(root, 'media/linked'), 'junction');
    snapshot.pages[0].data.elements.push(
      { elementId: 'escape', elementType: 'image', content: { src: 'media/../../private.png' } },
      { elementId: 'link', elementType: 'image', content: { src: 'media/linked/private.png' } },
      { elementId: 'outside', elementType: 'image', content: { src: '../private.png' } },
      { elementId: 'absolute', elementType: 'image', src: 'C:\\private\\figure.png' },
      { elementId: 'network', elementType: 'image', src: '//remote/figure.png' },
    );
    const result = await readAssetLibrary(root, snapshot, { filter: 'missing' });
    for (const elementId of ['escape', 'link', 'outside', 'absolute', 'network']) {
      expect(
        result.items.find((asset) => asset.usage.some((usage) => usage.elementId === elementId)),
      ).toMatchObject({ status: 'unavailable', bytes: null, previewable: false });
    }
    expect(await fs.readFile(path.join(outside, 'private.png'), 'utf8')).toBe('private');
  });

  it('discloses scan limits without misclassifying referenced files omitted by that scan', async () => {
    const { root, snapshot } = await fixture();
    const result = await readAssetLibrary(root, snapshot, {}, { maxEntries: 1, maxDepth: 1 });
    expect(result.truncated).toBe(true);
    expect(result.scan).toMatchObject({ visited: 1, entryLimit: 1, depthLimit: 1 });
    expect(result.items.find((asset) => asset.path === 'media/imported/hash.png')).toMatchObject({
      status: 'available',
    });
    expect(result.items.find((asset) => asset.path === 'assets/font.woff2')).toMatchObject({
      status: 'available',
    });
  });

  it('rejects invalid paging and filtering before scanning files', async () => {
    const { root, snapshot } = await fixture();
    await expect(readAssetLibrary(root, snapshot, { limit: 201 })).rejects.toMatchObject({
      code: 'INVALID_REQUEST',
    });
    await expect(readAssetLibrary(root, snapshot, { offset: -1 })).rejects.toMatchObject({
      code: 'INVALID_REQUEST',
    });
    await expect(
      readAssetLibrary(root, snapshot, { query: 'x'.repeat(257) }),
    ).rejects.toMatchObject({ code: 'INVALID_REQUEST' });
  });
});
