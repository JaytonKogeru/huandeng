import type { PptdBackend } from '@/lib/pptd-backend';
import type { AssetLibraryItem } from '../../../pptd/asset-library';
import { createRecipe, type RecipeName } from '../../../pptd/recipes';
import type {
  DeckSnapshot,
  ExpectedRevisions,
  PageSnapshot,
  PptdOperation,
  RecipeBinding,
} from '../../../pptd/types';
import type { PptdTheme } from './renderer';

export interface PreparedRecipePreview {
  base: string;
  instanceId: string;
  page: PageSnapshot;
  size: DeckSnapshot['size'];
  theme: PptdTheme;
  binding: RecipeBinding;
  operations: PptdOperation[];
  expected: ExpectedRevisions;
  sourceAssets: AssetLibraryItem[];
  assetHints: Record<string, string | null>;
}

export function projectImagePath(value: string): string {
  const normalized = value.trim().replace(/\\/g, '/').replace(/^\.\//, '');
  if (
    !/^(?:media|assets)\/.+/.test(normalized) ||
    normalized
      .split('/')
      .some((part) => !part || part === '..' || part === '.' || part.includes(':')) ||
    normalized.includes('\0')
  )
    throw new Error('Choose an image from this Project media/ or assets/ folder.');
  return normalized;
}

function baseIdentity(snapshot: DeckSnapshot, page: PageSnapshot): string {
  return JSON.stringify([
    snapshot.deckId,
    snapshot.entry,
    snapshot.epoch,
    snapshot.manifestRevision,
    snapshot.metadataRevision,
    snapshot.size,
    snapshot.manifest.theme,
    page,
  ]);
}

export function recipePreviewIsCurrent(
  prepared: PreparedRecipePreview,
  snapshot: DeckSnapshot,
  page: PageSnapshot,
): boolean {
  return (
    snapshot.writable &&
    page.state === 'active' &&
    !page.versionId &&
    prepared.base === baseIdentity(snapshot, page)
  );
}

export function prepareRecipePreview({
  snapshot,
  page,
  recipe,
  assets,
  texts,
}: {
  snapshot: DeckSnapshot;
  page: PageSnapshot;
  recipe: RecipeName;
  assets: Record<string, AssetLibraryItem>;
  texts: Record<string, string>;
}): PreparedRecipePreview {
  if (!snapshot.writable || page.versionId || page.state !== 'active')
    throw new Error('Choose an editable live slide.');
  const slots = recipe === 'two-evidence-figures' ? ['left', 'right'] : ['figure'];
  const paths: Record<string, string> = {};
  for (const slot of slots) {
    const asset = assets[slot];
    if (asset?.status !== 'available' || !asset.previewable || asset.kind !== 'image')
      throw new Error('Choose available source images for every slot.');
    paths[slot] = projectImagePath(asset.path);
  }
  let sequence = 1;
  while (Object.hasOwn(page.metadata.components ?? {}, `evidence-${sequence}`)) sequence++;
  const instanceId = `evidence-${sequence}`;
  const scale = Math.min(snapshot.size[0] / 960, snapshot.size[1] / 540);
  const topTitles = page.data.elements.filter(
    (element) =>
      element.elementType === 'text' &&
      page.metadata.elementRoles?.[element.elementId] === 'title' &&
      element.bounds?.every(Number.isFinite) &&
      element.bounds[1] >= 0 &&
      element.bounds[1] <= snapshot.size[1] / 4,
  );
  const margin = Math.max(
    40 * scale,
    ...topTitles.map(
      (element) => (element.bounds?.[1] ?? 0) + (element.bounds?.[3] ?? 0) + 18 * scale,
    ),
  );
  let created: ReturnType<typeof createRecipe>;
  try {
    created = createRecipe({
      recipe,
      pageId: page.pageId,
      instanceId,
      size: snapshot.size,
      assets: paths,
      texts,
      params: { margin },
      existingElementIds: page.data.elements.map((element) => element.elementId),
    });
  } catch (error) {
    if (topTitles.length)
      throw new Error(
        'The marked title leaves too little room for this layout. Adjust the title or use another slide.',
      );
    throw error;
  }
  const operations: PptdOperation[] = created.elements.map((element) => ({
    op: 'element.add',
    pageId: page.pageId,
    element,
  }));
  operations.push({
    op: 'metadata.patch',
    pageId: page.pageId,
    set: {
      [`components.${instanceId}`]: created.binding,
      ...Object.fromEntries(
        Object.entries(created.elementRoles).map(([id, role]) => [`elementRoles.${id}`, role]),
      ),
    },
  });
  const previewPage = structuredClone(page);
  previewPage.data.elements.push(...structuredClone(created.elements));
  previewPage.metadata.components = {
    ...previewPage.metadata.components,
    [instanceId]: structuredClone(created.binding),
  };
  previewPage.metadata.elementRoles = {
    ...previewPage.metadata.elementRoles,
    ...created.elementRoles,
  };
  previewPage.assetRevisions = { ...previewPage.assetRevisions };
  for (const slot of slots) {
    const revision = assets[slot].previewRevision;
    if (revision?.startsWith('sha256:'))
      previewPage.assetRevisions[paths[slot]] = revision as `sha256:${string}`;
  }
  return {
    base: baseIdentity(snapshot, page),
    instanceId,
    page: previewPage,
    size: structuredClone(snapshot.size),
    theme: structuredClone(snapshot.manifest.theme ?? {}) as PptdTheme,
    binding: created.binding,
    operations,
    expected: {
      pages: { [page.pageId]: page.pageRevision },
      manifest: snapshot.manifestRevision,
      metadata: snapshot.metadataRevision,
    },
    sourceAssets: structuredClone(slots.map((slot) => assets[slot])),
    assetHints: Object.fromEntries(
      slots.map((slot) => [paths[slot], assets[slot].previewRevision]),
    ),
  };
}

export async function validateRecipeSources(
  backend: Pick<PptdBackend, 'assets'>,
  prepared: PreparedRecipePreview,
): Promise<void> {
  await Promise.all(
    prepared.sourceAssets.map(async (source) => {
      const unavailable =
        'A source image changed or is unavailable. Choose the source again before adding.';
      const incomplete =
        'Source image verification is incomplete. Refresh Project images and retry.';
      let scanIncomplete = false;
      for (let page = 0; page < 15; page++) {
        const result = await backend.assets({
          query: source.path,
          kind: 'image',
          offset: page * 200,
          limit: 200,
        });
        const current = result.items.find((asset) => asset.path === source.path);
        if (current) {
          if (
            current.status !== 'available' ||
            !current.previewable ||
            current.previewRevision !== source.previewRevision
          )
            throw new Error(unavailable);
          return;
        }
        scanIncomplete ||= result.truncated || !!result.scan?.warnings.length;
        if (!result.hasMore) throw new Error(scanIncomplete ? incomplete : unavailable);
        if (!result.items.length) throw new Error(incomplete);
      }
      throw new Error(incomplete);
    }),
  );
}

export async function commitPreparedRecipe(
  prepared: PreparedRecipePreview,
  backend: Pick<PptdBackend, 'assets'>,
  onApply: (operations: PptdOperation[], expected?: ExpectedRevisions) => Promise<unknown>,
  isCurrent: () => boolean,
): Promise<void> {
  await validateRecipeSources(backend, prepared);
  if (!isCurrent())
    throw new Error('The slide or Project changed. Refresh the preview before adding.');
  await onApply(prepared.operations, prepared.expected);
}
