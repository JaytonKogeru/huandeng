import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import {
  assertIndependentFields,
  assertJsonValue,
  editSourceSequence,
  isRecord,
  parseFieldPath,
  parseManifest,
  parsePage,
  patchPageElement,
  patchSourceFields,
  serializePage,
  setManifestPages,
  setPageNotes,
  setValueAtPath,
  unsetValueAtPath,
  validatePage,
} from './codec';
import { expandGroupIds, owningGroupId, transformGroup } from './grouping';
import {
  addIdentity,
  createMetadata,
  ensureReadableLabels,
  METADATA_PATH,
  normalizeRelativePath,
  parseMetadata,
  resolvePageIdentity,
  serializeMetadata,
} from './identity';
import { type CheckpointState, PageCheckpointArchive } from './page-checkpoints';
import { PageVersionArchive, type PageVersionState, VERSIONED_PAGE_METADATA } from './page-history';
import {
  acquireWriterLock,
  atomicWrite,
  canonicalProjectRoot,
  defaultStateDirectory,
  type FileChange,
  type HistoryRecord,
  hashBytes,
  hashPayload,
  Persistence,
  readOptional,
  readUtf8,
  resolveProjectPath,
} from './persistence';
import { applyProjectOperation, readProjectModel } from './project-model';
import { applyRecipe, markRecipeElementOverride, removeRecipeSlot } from './recipes';
import {
  type AuthorReviewContext,
  type CreatedPage,
  type CreatePageCheckpointRequest,
  type DeckSnapshot,
  type Diagnostic,
  type DocumentEvent,
  type ElementRef,
  type HistorySummary,
  type NewRevisions,
  type PageSnapshot,
  type PageVersionSnapshot,
  type PageVersionSummary,
  PptdError,
  type PptdManifest,
  type PptdOperation,
  type PptdPage,
  type ProjectMetadata,
  type RestorePageVersionRequest,
  type Revision,
  type TransactionRequest,
  type TransactionResult,
} from './types';

export interface OpenPptdOptions {
  entryPath: string;
  stateDir?: string;
  readOnly?: boolean;
  afterWrite?: (index: number) => Promise<void>;
  onTiming?: (sample: PptdTiming) => void;
}

export interface PptdTiming {
  phase: string;
  durationMs: number;
  pages?: number;
  assetReferences?: number;
  uniqueAssets?: number;
}

interface PageDocument {
  source: string;
  path: string;
  data: PptdPage;
}
type AssetHashCache = Map<string, { signature: string; hash: Revision }>;
interface Documents {
  manifestSource: string;
  metadataSource: string | null;
  metadata: ProjectMetadata;
  pages: Map<string, PageDocument>;
  pageAssets: Map<string, Record<string, Revision | null>>;
  diagnostics: Diagnostic[];
}

const manifestCache = new WeakMap<Documents, { source: string; value: PptdManifest }>();

function documentManifest(documents: Documents): PptdManifest {
  const cached = manifestCache.get(documents);
  if (cached?.source === documents.manifestSource) return cached.value;
  const value = parseManifest(documents.manifestSource).value;
  manifestCache.set(documents, { source: documents.manifestSource, value });
  return value;
}

function reportTiming(
  listener: OpenPptdOptions['onTiming'],
  phase: string,
  started: number,
  details: Omit<PptdTiming, 'phase' | 'durationMs'> = {},
): void {
  try {
    listener?.({ phase, durationMs: performance.now() - started, ...details });
  } catch {}
}

async function mapConcurrent<T, R>(items: T[], task: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(8, items.length) }, async () => {
      while (cursor < items.length) {
        const index = cursor++;
        results[index] = await task(items[index]);
      }
    }),
  );
  return results;
}

function assetReferences(value: unknown, found = new Set<string>()): Set<string> {
  if (Array.isArray(value)) for (const child of value) assetReferences(child, found);
  else if (isRecord(value))
    for (const [key, child] of Object.entries(value)) {
      if (
        (key === 'src' || key === 'url') &&
        typeof child === 'string' &&
        child &&
        !/^(https?:|data:|blob:|#)/i.test(child)
      )
        found.add(child);
      else if (typeof child === 'object') assetReferences(child, found);
    }
  return found;
}

async function fingerprintAsset(
  root: string,
  reference: string,
  cache: AssetHashCache,
): Promise<Revision> {
  const file = await resolveProjectPath(root, reference);
  const stat = await fs.stat(file, { bigint: true });
  if (!stat.isFile()) throw new Error('The asset is not a regular file.');
  const signature = [stat.dev, stat.ino, stat.size, stat.mtimeNs, stat.ctimeNs].join('/');
  const cached = cache.get(file);
  if (cached?.signature === signature) return cached.hash;
  const hash = hashBytes(await fs.readFile(file));
  cache.set(file, { signature, hash });
  return hash;
}

function renderRevision(documents: Documents, pageId: string): Revision | null {
  const page = documents.pages.get(pageId);
  if (!page) return null;
  return hashPayload({
    pageRevision: hashBytes(page.source),
    manifestRevision: hashBytes(documents.manifestSource),
    assets: documents.pageAssets.get(pageId) ?? {},
    themeOverride: documents.metadata.slides[pageId]?.themeOverride ?? null,
    renderer: 'huandeng-pptd-0.4',
  });
}

function authorReviewContext(
  review: unknown,
  currentRenderRevision: Revision,
): AuthorReviewContext {
  const recordedRenderRevision =
    isRecord(review) &&
    typeof review.renderRevision === 'string' &&
    /^sha256:[0-9a-f]{64}$/.test(review.renderRevision)
      ? (review.renderRevision as Revision)
      : null;
  return {
    status:
      recordedRenderRevision === null
        ? 'unverified'
        : recordedRenderRevision === currentRenderRevision
          ? 'current'
          : 'stale',
    recordedRenderRevision,
    currentRenderRevision,
    approvalVerified: false,
  };
}

async function refreshAssetFingerprints(
  root: string,
  documents: Documents,
  cache: AssetHashCache,
  onTiming?: OpenPptdOptions['onTiming'],
): Promise<void> {
  const started = performance.now();
  const manifest = documentManifest(documents);
  const globalAssets = assetReferences(manifest);
  const pageReferences = new Map<string, Set<string>>();
  const references = new Set<string>();
  let assetReferenceCount = 0;
  for (const [pageId, page] of documents.pages) {
    const override = documents.metadata.slides[pageId]?.themeOverride;
    const assets = override ? assetReferences({ ...manifest, theme: override }) : globalAssets;
    const pageAssets = new Set([...assets, ...assetReferences(page.data)]);
    pageReferences.set(pageId, pageAssets);
    assetReferenceCount += pageAssets.size;
    for (const reference of pageAssets) references.add(reference);
  }
  const resolved = new Map<string, { revision: Revision | null; error?: string }>(
    await mapConcurrent([...references], async (reference) => {
      try {
        return [reference, { revision: await fingerprintAsset(root, reference, cache) }] as const;
      } catch (error) {
        return [reference, { revision: null, error: String(error) }] as const;
      }
    }),
  );
  documents.pageAssets = new Map();
  documents.diagnostics = documents.diagnostics.filter((item) => item.code !== 'ASSET_UNAVAILABLE');
  for (const [pageId, assets] of pageReferences) {
    const fingerprints: Record<string, Revision | null> = {};
    for (const reference of assets) {
      const result = resolved.get(reference);
      fingerprints[reference] = result?.revision ?? null;
      if (result && 'error' in result)
        documents.diagnostics.push({
          code: 'ASSET_UNAVAILABLE',
          message: `Cannot read asset ${reference}: ${result.error}`,
          severity: 'warning',
          pageId,
          path: reference,
        });
    }
    documents.pageAssets.set(pageId, fingerprints);
  }
  reportTiming(onTiming, 'assets', started, {
    pages: pageReferences.size,
    assetReferences: assetReferenceCount,
    uniqueAssets: references.size,
  });
}

function revisions(documents: Documents): NewRevisions {
  return {
    pages: Object.fromEntries(
      [...documents.pages].map(([pageId, page]) => [pageId, hashBytes(page.source)]),
    ),
    manifest: hashBytes(documents.manifestSource),
    metadata: documents.metadataSource === null ? null : hashBytes(documents.metadataSource),
  };
}

function placeAfter(order: string[], target: string, after: string | null | undefined): string[] {
  if (after === target) return order;
  const next = order.filter((id) => id !== target);
  if (after === null) next.unshift(target);
  else if (after === undefined) next.push(target);
  else {
    const index = next.indexOf(after);
    if (index < 0)
      throw new PptdError('TARGET_NOT_FOUND', `Insertion anchor ${after} does not exist.`);
    next.splice(index + 1, 0, target);
  }
  return next;
}

function referencePaths(value: unknown, ids: Set<string>): { path: string; value: string }[] {
  const found: { path: string; value: string }[] = [];
  const visit = (item: unknown, parts: (string | number)[], reference: boolean) => {
    if (typeof item === 'string') {
      if (reference && ids.has(item)) found.push({ path: parts.join('.'), value: item });
      return;
    }
    if (Array.isArray(item)) {
      item.forEach((child, index) => {
        visit(child, [...parts, index], reference);
      });
      return;
    }
    if (!isRecord(item)) return;
    for (const [key, child] of Object.entries(item))
      visit(
        child,
        [...parts, key],
        /^(children|elementId|elementIds|targetId|targetIds|sourceId|sourceIds|parentId|fromId|toId|target|targets)$/.test(
          key,
        ),
      );
  };
  if (!isRecord(value)) return found;
  if (Array.isArray(value.elements))
    value.elements.forEach((element, index) => {
      if (!isRecord(element)) return;
      for (const [key, child] of Object.entries(element)) {
        if (
          /^(children|elementId|elementIds|targetId|targetIds|sourceId|sourceIds|parentId|fromId|toId)$/.test(
            key,
          )
        )
          visit(child, ['elements', index, key], true);
      }
      if (element.animations) visit(element.animations, ['elements', index, 'animations'], false);
    });
  if (value.animations) visit(value.animations, ['animations'], false);
  return found;
}

export class PptdStore {
  readonly kind = 'pptd' as const;
  readonly epoch = randomUUID();
  private sequence = 0;
  private tail: Promise<unknown> = Promise.resolve();
  private closed = false;
  private listeners = new Set<(event: DocumentEvent) => void>();
  private documents: Documents;
  private snapshot: DeckSnapshot;
  private readonly pageVersions: PageVersionArchive;
  private readonly checkpoints: PageCheckpointArchive;

  private constructor(
    readonly root: string,
    readonly entry: string,
    readonly stateDir: string,
    readonly readOnly: boolean,
    private readonly persistence: Persistence,
    private readonly release: () => Promise<void>,
    private readonly assetCache: AssetHashCache,
    documents: Documents,
    private readonly onTiming?: OpenPptdOptions['onTiming'],
  ) {
    this.documents = documents;
    this.snapshot = this.makeSnapshot(documents);
    this.pageVersions = new PageVersionArchive(stateDir, readOnly);
    this.checkpoints = new PageCheckpointArchive(root, readOnly);
  }

  static async open(options: OpenPptdOptions): Promise<PptdStore> {
    const started = performance.now();
    const entryPath = await fs.realpath(path.resolve(options.entryPath));
    const root = await canonicalProjectRoot(path.dirname(entryPath));
    const entry = path.basename(entryPath);
    const stateDir = options.stateDir
      ? path.resolve(options.stateDir)
      : defaultStateDirectory(root);
    const readOnly = options.readOnly ?? false;
    const release = readOnly ? async () => {} : await acquireWriterLock(root, stateDir);
    const persistence = new Persistence(root, stateDir, options.afterWrite);
    try {
      if (!readOnly) await persistence.recover();
      else if ((await readOptional(path.join(stateDir, 'pending.json'))) !== null)
        throw new PptdError('PENDING_RECOVERY', 'This project needs a writable recovery session.');
      const manifestSource = await readUtf8(entryPath);
      const manifest = parseManifest(manifestSource).value;
      const metadataPath = await resolveProjectPath(root, METADATA_PATH);
      if (!readOnly && (await readOptional(metadataPath)) === null) {
        const metadata = createMetadata(entry, manifest.pages);
        await mapConcurrent(manifest.pages, async (pagePath) =>
          parsePage(await readUtf8(await resolveProjectPath(root, pagePath))),
        );
        await atomicWrite(metadataPath, serializeMetadata(metadata));
      }
      if (!readOnly) {
        const metadata = parseMetadata(await readUtf8(metadataPath));
        if (ensureReadableLabels(metadata))
          await atomicWrite(metadataPath, serializeMetadata(metadata));
      }
      const assetCache: AssetHashCache = new Map();
      const documents = await PptdStore.loadDocuments(
        root,
        entry,
        assetCache,
        undefined,
        options.onTiming,
      );
      const store = new PptdStore(
        root,
        entry,
        stateDir,
        readOnly,
        persistence,
        release,
        assetCache,
        documents,
        options.onTiming,
      );
      await store.pageVersions.initialize(
        new Map(
          [...documents.pages.keys()].map((pageId) => [
            pageId,
            store.pageVersionState(documents, pageId),
          ]),
        ),
        await persistence.history(),
      );
      reportTiming(options.onTiming, 'open', started, { pages: documents.pages.size });
      return store;
    } catch (error) {
      await release();
      throw error;
    }
  }

  private static async loadDocuments(
    root: string,
    entry: string,
    assetCache: AssetHashCache,
    previous?: Documents,
    onTiming?: OpenPptdOptions['onTiming'],
  ): Promise<Documents> {
    const started = performance.now();
    const manifestSource = await readUtf8(await resolveProjectPath(root, entry));
    const manifest =
      previous?.manifestSource === manifestSource
        ? documentManifest(previous)
        : parseManifest(manifestSource).value;
    const metadataSource = await readOptional(await resolveProjectPath(root, METADATA_PATH));
    const metadata =
      metadataSource === null
        ? createMetadata(entry, manifest.pages, root)
        : previous?.metadataSource === metadataSource
          ? previous.metadata
          : parseMetadata(metadataSource);
    readProjectModel(metadata);
    if (normalizeRelativePath(metadata.entry) !== normalizeRelativePath(entry))
      throw new PptdError('INVALID_DOCUMENT', 'The sidecar belongs to another PPTD entry.');
    const byPath = new Map(
      Object.entries(metadata.slides).map(([id, identity]) => [
        normalizeRelativePath(identity.path),
        id,
      ]),
    );
    const normalizedPages = manifest.pages.map(normalizeRelativePath);
    if (new Set(normalizedPages).size !== normalizedPages.length)
      throw new PptdError('INVALID_DOCUMENT', 'The manifest repeats a normalized page path.');
    for (const pagePath of normalizedPages) {
      const pageId = byPath.get(pagePath);
      if (!pageId)
        throw new PptdError(
          'INVALID_DOCUMENT',
          `Page ${pagePath} has no stable identity; use page.add or relink.`,
        );
      if (metadata.slides[pageId].state !== 'active')
        throw new PptdError(
          'INVALID_DOCUMENT',
          `Removed page ${pagePath} is still referenced by the manifest.`,
        );
    }
    reportTiming(onTiming, 'loadDocuments.metadata', started);
    const pagesStarted = performance.now();
    const loaded = await mapConcurrent(
      Object.entries(metadata.slides),
      async ([pageId, identity]) => {
        const file = await resolveProjectPath(root, identity.path);
        const source = await readOptional(file);
        if (source === null) return { pageId, identity, page: null, realPath: null };
        const realPath = await fs.realpath(file);
        const cached = previous?.pages.get(pageId);
        const page =
          cached?.source === source && cached.path === identity.path
            ? cached
            : { source, path: identity.path, data: parsePage(source).value };
        return { pageId, identity, page, realPath };
      },
    );
    const pages = new Map<string, PageDocument>();
    const pageAssets = new Map<string, Record<string, Revision | null>>();
    const diagnostics: Diagnostic[] = [];
    const realPaths = new Set<string>();
    for (const { pageId, identity, page, realPath } of loaded) {
      if (page === null || realPath === null) {
        diagnostics.push({
          code: 'PAGE_MISSING',
          message: `Missing page ${identity.path}; use an explicit relink after an external rename.`,
          severity: identity.state === 'active' ? 'error' : 'warning',
          pageId,
          path: identity.path,
        });
        continue;
      }
      if (realPaths.has(realPath))
        throw new PptdError(
          'INVALID_DOCUMENT',
          'Multiple identities resolve to the same physical page file.',
        );
      realPaths.add(realPath);
      pages.set(pageId, page);
    }
    reportTiming(onTiming, 'loadDocuments.pages', pagesStarted, { pages: pages.size });
    const documents = { manifestSource, metadataSource, metadata, pages, pageAssets, diagnostics };
    manifestCache.set(documents, { source: manifestSource, value: manifest });
    await refreshAssetFingerprints(root, documents, assetCache, onTiming);
    reportTiming(onTiming, 'loadDocuments', started, { pages: pages.size });
    return documents;
  }

  private pageSnapshot(documents: Documents, pageId: string): PageSnapshot {
    const page = documents.pages.get(pageId);
    if (!page) throw new PptdError('TARGET_NOT_FOUND', `Page ${pageId} is missing.`);
    const identity = documents.metadata.slides[pageId];
    const pageRevision = hashBytes(page.source);
    const currentRenderRevision = renderRevision(documents, pageId) ?? pageRevision;
    return {
      pageId,
      shortCode: identity.shortCode,
      path: identity.path,
      state: identity.state,
      pageRevision,
      renderRevision: currentRenderRevision,
      assetRevisions: { ...documents.pageAssets.get(pageId) },
      authorReview: authorReviewContext(identity.lastAuthorReview, currentRenderRevision),
      data: structuredClone(page.data),
      metadata: structuredClone(identity),
    };
  }

  private makeSnapshot(documents: Documents): DeckSnapshot {
    const started = performance.now();
    const manifest = documentManifest(documents);
    const byPath = new Map(
      Object.entries(documents.metadata.slides).map(([id, identity]) => [identity.path, id]),
    );
    const pages = manifest.pages
      .map(normalizeRelativePath)
      .map((pagePath) => byPath.get(pagePath))
      .filter((id): id is string => id !== undefined && documents.pages.has(id))
      .map((id) => this.pageSnapshot(documents, id));
    const snapshot: DeckSnapshot = {
      kind: 'pptd',
      deckId: documents.metadata.deckId,
      entry: this.entry,
      title: manifest.title ?? path.basename(this.entry, path.extname(this.entry)),
      size: manifest.size ?? [960, 540],
      manifest,
      manifestRevision: hashBytes(documents.manifestSource),
      metadataRevision:
        documents.metadataSource === null ? null : hashBytes(documents.metadataSource),
      pages,
      metadata: structuredClone(documents.metadata),
      identityPersisted: documents.metadataSource !== null,
      writable: !this.readOnly && !this.closed,
      epoch: this.epoch,
      sequence: this.sequence,
      diagnostics: documents.diagnostics,
    };
    reportTiming(this.onTiming, 'snapshot', started, { pages: pages.length });
    return snapshot;
  }

  getSnapshot(): DeckSnapshot {
    const started = performance.now();
    const snapshot = structuredClone(this.snapshot);
    reportTiming(this.onTiming, 'snapshot.clone', started, { pages: snapshot.pages.length });
    return snapshot;
  }

  readPage(target: string): PageSnapshot {
    const { pageId } = resolvePageIdentity(this.documents.metadata, target);
    return this.pageSnapshot(this.documents, pageId);
  }

  private pageVersionState(documents: Documents, pageId: string): PageVersionState {
    const page = documents.pages.get(pageId);
    if (!page) throw new PptdError('TARGET_NOT_FOUND', `Page ${pageId} is missing.`);
    return {
      source: page.source,
      metadata: structuredClone(documents.metadata.slides[pageId]),
      size: documentManifest(documents).size ?? [960, 540],
    };
  }

  private checkpointState(documents: Documents, pageId: string): CheckpointState {
    const manifest = documentManifest(documents);
    const theme = documents.metadata.slides[pageId].themeOverride ?? manifest.theme;
    return {
      ...this.pageVersionState(documents, pageId),
      theme: isRecord(theme) ? structuredClone(theme) : {},
      assetRevisions: structuredClone(documents.pageAssets.get(pageId) ?? {}),
    };
  }

  pageCheckpoints(target: string): Promise<PageVersionSummary[]> {
    return this.enqueue(async () => {
      const { pageId } = resolvePageIdentity(this.documents.metadata, target);
      return (
        await this.checkpoints.list(
          this.documents.metadata.deckId,
          pageId,
          this.checkpointState(this.documents, pageId),
        )
      ).map((version) => version.summary);
    });
  }

  createPageCheckpoint(request: CreatePageCheckpointRequest): Promise<PageVersionSummary> {
    return this.enqueue(async () => {
      if (this.readOnly || this.closed)
        throw new PptdError('READ_ONLY', 'This project is read-only.');
      if (
        typeof request.requestId !== 'string' ||
        !request.requestId ||
        typeof request.label !== 'string' ||
        !request.label.trim() ||
        request.label.length > 200
      )
        throw new PptdError(
          'INVALID_REQUEST',
          'A request ID and a short version name are required.',
        );
      if ((await readOptional(path.join(this.stateDir, 'pending.json'))) !== null)
        throw new PptdError(
          'PENDING_RECOVERY',
          'Recover the pending save before recording a page version.',
        );
      const documents = await PptdStore.loadDocuments(
        this.root,
        this.entry,
        this.assetCache,
        this.documents,
        this.onTiming,
      );
      const { pageId } = resolvePageIdentity(documents.metadata, request.pageId);
      const requestHash = hashPayload(request);
      const versionId = `checkpoint:${hashPayload([documents.metadata.deckId, pageId, request.requestId]).slice(7, 39)}`;
      try {
        const previous = await this.checkpoints.find(documents.metadata.deckId, pageId, versionId);
        if (previous.requestHash !== requestHash)
          throw new PptdError(
            'REQUEST_ID_REUSE',
            'This request ID belongs to a different checkpoint.',
          );
        return previous.summary;
      } catch (error) {
        if (!(error instanceof PptdError) || error.code !== 'TARGET_NOT_FOUND') throw error;
      }
      const current = revisions(documents);
      if (
        current.pages[pageId] !== request.expectedPageRevision ||
        current.metadata !== request.expectedMetadataRevision
      )
        throw new PptdError(
          'REVISION_CONFLICT',
          'The page or Story changed. Refresh before recording a version.',
        );
      const checkpoint = await this.checkpoints.create({
        deckId: documents.metadata.deckId,
        pageId,
        requestId: request.requestId,
        requestHash,
        label: request.label,
        actor: request.actor ?? 'human',
        state: this.checkpointState(documents, pageId),
      });
      this.replaceDocuments(documents, 'external');
      return checkpoint.summary;
    });
  }

  private async captureExternalVersions(documents: Documents): Promise<void> {
    const sizeChanged = !isDeepStrictEqual(
      documentManifest(this.documents).size ?? [960, 540],
      documentManifest(documents).size ?? [960, 540],
    );
    const changed = [...documents.pages.keys()].filter((pageId) => {
      const previous = this.documents.pages.get(pageId);
      if (!previous) return true;
      return (
        sizeChanged ||
        previous.source !== documents.pages.get(pageId)?.source ||
        VERSIONED_PAGE_METADATA.some(
          (key) =>
            !isDeepStrictEqual(
              this.documents.metadata.slides[pageId]?.[key],
              documents.metadata.slides[pageId]?.[key],
            ),
        )
      );
    });
    if (!changed.length) return;
    const records = await this.persistence.history();
    for (const pageId of changed)
      await this.pageVersions.observe(pageId, this.pageVersionState(documents, pageId), records);
  }

  subscribe(listener: (event: DocumentEvent) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(event: DocumentEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(structuredClone(event));
      } catch {}
    }
  }

  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    const pending = this.tail.then(task);
    this.tail = pending.catch(() => undefined);
    return pending;
  }

  private replaceDocuments(
    documents: Documents,
    type: 'committed' | 'external',
    operationId?: string,
    originClientId?: string,
  ): void {
    const before = revisions(this.documents);
    const after = revisions(documents);
    const changedPages: DocumentEvent['changedPages'] = {};
    for (const pageId of new Set([...Object.keys(before.pages), ...Object.keys(after.pages)])) {
      const beforeRenderRevision = renderRevision(this.documents, pageId);
      const afterRenderRevision = renderRevision(documents, pageId);
      if (
        before.pages[pageId] !== after.pages[pageId] ||
        beforeRenderRevision !== afterRenderRevision
      )
        changedPages[pageId] = {
          before: before.pages[pageId] ?? null,
          after: after.pages[pageId] ?? null,
          beforeRenderRevision,
          afterRenderRevision,
        };
    }
    const manifestChanged = before.manifest !== after.manifest;
    const metadataChanged = before.metadata !== after.metadata;
    const changed = Object.keys(changedPages).length > 0 || manifestChanged || metadataChanged;
    this.documents = documents;
    if (changed) this.sequence++;
    if (
      changed ||
      !isDeepStrictEqual(this.snapshot.diagnostics, documents.diagnostics) ||
      this.snapshot.writable !== (!this.readOnly && !this.closed)
    )
      this.snapshot = this.makeSnapshot(documents);
    if (changed)
      this.emit({
        type,
        epoch: this.epoch,
        sequence: this.sequence,
        operationId,
        originClientId,
        changedPages,
        manifestChanged,
        metadataChanged,
        diagnostics: documents.diagnostics,
      });
  }

  refreshExternal(): Promise<DeckSnapshot> {
    return this.enqueue(async () => {
      try {
        if ((await readOptional(path.join(this.stateDir, 'pending.json'))) !== null)
          throw new PptdError(
            'PENDING_RECOVERY',
            'A pending transaction must recover before external changes are published.',
          );
        const next = await PptdStore.loadDocuments(
          this.root,
          this.entry,
          this.assetCache,
          this.documents,
          this.onTiming,
        );
        if (next.diagnostics.some((item) => item.severity === 'error'))
          throw new PptdError(
            'INVALID_DOCUMENT',
            next.diagnostics.map((item) => item.message).join('; '),
          );
        await this.captureExternalVersions(next);
        this.replaceDocuments(next, 'external');
      } catch (error) {
        this.sequence++;
        const diagnostic: Diagnostic = {
          code: error instanceof PptdError ? error.code : 'EXTERNAL_READ_FAILED',
          message: String(error),
          severity: 'error',
        };
        this.snapshot = {
          ...this.snapshot,
          sequence: this.sequence,
          diagnostics: [diagnostic],
          writable: ['PENDING_RECOVERY', 'RECOVERY_REQUIRED'].includes(diagnostic.code)
            ? false
            : this.snapshot.writable,
        };
        this.emit({
          type: 'diagnostic',
          epoch: this.epoch,
          sequence: this.sequence,
          changedPages: {},
          manifestChanged: false,
          metadataChanged: false,
          diagnostics: [diagnostic],
        });
      }
      return this.getSnapshot();
    });
  }

  async history(): Promise<HistorySummary[]> {
    return (await this.persistence.history())
      .filter((record) => !record.result.noOp)
      .map(
        ({ files: _files, request: _request, requestHash: _hash, result: _result, ...summary }) =>
          summary,
      );
  }

  pageHistory(target: string): Promise<PageVersionSummary[]> {
    return this.enqueue(async () => {
      const { pageId } = resolvePageIdentity(this.documents.metadata, target);
      return this.pageVersions
        .versions(
          pageId,
          this.pageVersionState(this.documents, pageId),
          await this.persistence.history(),
        )
        .map((version) => version.summary);
    });
  }

  readPageVersion(target: string, versionId: string): Promise<PageVersionSnapshot> {
    return this.enqueue(async () => {
      const { pageId, identity } = resolvePageIdentity(this.documents.metadata, target);
      const checkpoint = versionId.startsWith('checkpoint:')
        ? await this.checkpoints.find(this.documents.metadata.deckId, pageId, versionId)
        : null;
      const version =
        checkpoint ??
        this.pageVersions.find(
          pageId,
          versionId,
          this.pageVersionState(this.documents, pageId),
          await this.persistence.history(),
        );
      const documents = structuredClone(this.documents);
      documents.pages = new Map([
        [
          pageId,
          {
            path: identity.path,
            source: version.state.source,
            data: parsePage(version.state.source).value,
          },
        ],
      ]);
      documents.metadata.slides[pageId] = {
        ...structuredClone(version.state.metadata),
        path: identity.path,
        shortCode: identity.shortCode,
        state: identity.state,
        ...(checkpoint ? { themeOverride: checkpoint.state.theme } : {}),
      };
      await refreshAssetFingerprints(this.root, documents, this.assetCache, this.onTiming);
      return {
        version: version.summary,
        page: this.pageSnapshot(documents, pageId),
        size: version.state.size,
        assets: checkpoint ? 'archived' : 'current-project',
        ...(checkpoint ? { theme: checkpoint.state.theme } : {}),
      };
    });
  }

  restorePageVersion(request: RestorePageVersionRequest): Promise<TransactionResult> {
    const { pageId } = resolvePageIdentity(this.documents.metadata, request.pageId);
    return this.commit({
      requestId: request.requestId,
      deckId: this.documents.metadata.deckId,
      actor: request.actor ?? 'huandeng-editor',
      ...(request.originClientId ? { originClientId: request.originClientId } : {}),
      expected: {
        pages: { [pageId]: request.expectedPageRevision },
        ...(request.expectedMetadataRevision !== undefined
          ? { metadata: request.expectedMetadataRevision }
          : {}),
      },
      operations: [{ op: 'page.version.restore', pageId, versionId: request.versionId }],
    });
  }

  undo(
    operationId: string,
    requestId: string = randomUUID(),
    actor = 'huandeng-editor',
  ): Promise<TransactionResult> {
    const snapshot = this.getSnapshot();
    return this.commit({
      requestId,
      actor,
      deckId: snapshot.deckId,
      expected: {
        pages: revisions(this.documents).pages,
        manifest: snapshot.manifestRevision,
        metadata: snapshot.metadataRevision,
      },
      operations: [{ op: 'history.revert', operationId }],
    });
  }

  redo(
    operationId: string,
    requestId: string = randomUUID(),
    actor = 'huandeng-editor',
  ): Promise<TransactionResult> {
    return this.undo(operationId, requestId, actor);
  }

  commit(request: TransactionRequest): Promise<TransactionResult> {
    return this.enqueue(async () => {
      const started = performance.now();
      try {
        return await this.commitNow(request);
      } finally {
        reportTiming(this.onTiming, 'commit', started);
      }
    });
  }

  async close(): Promise<void> {
    await this.enqueue(async () => {
      if (this.closed) return;
      this.closed = true;
      this.snapshot.writable = false;
      this.listeners.clear();
      await this.release();
    });
  }

  private async commitNow(request: TransactionRequest): Promise<TransactionResult> {
    if (this.readOnly || this.closed)
      throw new PptdError('READ_ONLY', 'This project is not open for writing.');
    if (
      !isRecord(request) ||
      typeof request.requestId !== 'string' ||
      typeof request.actor !== 'string' ||
      typeof request.deckId !== 'string' ||
      !isRecord(request.expected) ||
      !Array.isArray(request.operations) ||
      request.operations.some(
        (operation) => !isRecord(operation) || typeof operation.op !== 'string',
      )
    )
      throw new PptdError('INVALID_REQUEST', 'Invalid transaction envelope.');
    assertJsonValue(request);
    if (
      !request.requestId ||
      !request.actor ||
      !request.expected ||
      !Array.isArray(request.operations) ||
      !request.operations.length
    )
      throw new PptdError(
        'INVALID_REQUEST',
        'A requestId, actor, expected revisions and operations are required.',
      );
    const requestHash = hashPayload(request);
    const receipt = await this.persistence.receipt(request.requestId, requestHash);
    if (receipt) return structuredClone(receipt);
    if ((await readOptional(path.join(this.stateDir, 'pending.json'))) !== null)
      throw new PptdError(
        'PENDING_RECOVERY',
        'A previous transaction needs recovery before new writes.',
      );
    const base = await PptdStore.loadDocuments(
      this.root,
      this.entry,
      this.assetCache,
      this.documents,
      this.onTiming,
    );
    if (request.deckId !== base.metadata.deckId)
      throw new PptdError('TARGET_NOT_FOUND', 'The request belongs to another deck.');
    await this.captureExternalVersions(base);
    return this.applyTransaction(base, request, requestHash);
  }

  private async applyTransaction(
    base: Documents,
    request: TransactionRequest,
    requestHash: Revision,
  ): Promise<TransactionResult> {
    return this.applyOperations(base, request, requestHash);
  }

  private async applyOperations(
    base: Documents,
    request: TransactionRequest,
    requestHash: Revision,
  ): Promise<TransactionResult> {
    const started = performance.now();
    const before = revisions(base);
    const docs = structuredClone(base);
    const changedElements = new Map<string, ElementRef>();
    const touchedPages = new Set<string>();
    const relinkedPages = new Set<string>();
    const createdPages: CreatedPage[] = [];
    const skippedOverrides: ElementRef[] = [];
    let revertedOperationId: string | undefined;
    const check = (kind: 'manifest' | 'metadata' | 'pages', pageId?: string) => {
      const actual = kind === 'pages' ? before.pages[pageId ?? ''] : before[kind];
      const expected =
        kind === 'pages' ? request.expected.pages?.[pageId ?? ''] : request.expected[kind];
      if (expected === undefined)
        throw new PptdError(
          'MISSING_PRECONDITION',
          `Missing ${kind} revision${pageId ? ` for ${pageId}` : ''}.`,
          { kind, pageId, currentRevision: actual },
        );
      if (expected !== actual)
        throw new PptdError(
          'REVISION_CONFLICT',
          `Stale ${kind} revision${pageId ? ` for ${pageId}` : ''}.`,
          { kind, pageId, expected, currentRevision: actual },
        );
    };
    const pageIdentity = (target: string) => resolvePageIdentity(docs.metadata, target);
    const pageDocument = (target: string, active = true) => {
      const { pageId, identity } = pageIdentity(target);
      const page = docs.pages.get(pageId);
      if (!page) throw new PptdError('TARGET_NOT_FOUND', `Missing page ${target}.`);
      if (active && identity.state !== 'active')
        throw new PptdError('INVALID_REQUEST', 'Restore this page before editing it.');
      return { pageId, identity, page };
    };
    const writePage = (pageId: string, source: string) => {
      const previous = docs.pages.get(pageId);
      if (!previous) throw new PptdError('TARGET_NOT_FOUND', `Missing page ${pageId}.`);
      docs.pages.set(pageId, { ...previous, source, data: parsePage(source).value });
      if (source !== previous.source) touchedPages.add(pageId);
    };
    const orderedIds = () => {
      const byPath = new Map(
        Object.entries(docs.metadata.slides).map(([id, identity]) => [identity.path, id]),
      );
      return documentManifest(docs).pages.map((pagePath) => {
        const id = byPath.get(normalizeRelativePath(pagePath));
        if (!id) throw new PptdError('INVALID_DOCUMENT', `Unindexed page ${pagePath}.`);
        return id;
      });
    };
    const writeOrder = (ids: string[]) => {
      docs.manifestSource = setManifestPages(
        docs.manifestSource,
        ids.map((id) => docs.metadata.slides[id].path),
      );
    };
    const anchorId = (target: string | null | undefined) =>
      target == null ? target : pageIdentity(target).pageId;
    const allocatePage = async () => {
      for (let i = 0; i < 100; i++) {
        const created = addIdentity(docs.metadata);
        if ((await readOptional(await resolveProjectPath(this.root, created.path))) === null) {
          createdPages.push(created);
          return created;
        }
        delete docs.metadata.slides[created.pageId];
      }
      throw new PptdError('INVALID_DOCUMENT', 'Could not allocate an unused page filename.');
    };
    const operations = request.operations.map((operation) => ({ operation, recipe: false }));
    if (operations.length > 1000)
      throw new PptdError('INVALID_REQUEST', 'A transaction may contain at most 1000 operations.');
    if (
      operations.some(({ operation }) => operation.op === 'history.revert') &&
      operations.length !== 1
    )
      throw new PptdError('INVALID_REQUEST', 'A history revert must be submitted on its own.');
    for (let index = 0; index < operations.length; index++) {
      const { operation, recipe } = operations[index];
      switch (operation.op) {
        case 'project.replace': {
          check('metadata');
          docs.metadata = applyProjectOperation(docs.metadata, operation, this.makeSnapshot(docs));
          break;
        }
        case 'element.patch':
        case 'element.remove':
        case 'element.add':
        case 'element.reorder':
        case 'page.notes.set': {
          const { pageId, identity, page } = pageDocument(operation.pageId);
          check('pages', pageId);
          let source = page.source;
          if (operation.op === 'element.patch' || operation.op === 'element.remove') {
            const found = page.data.elements.findIndex(
              (element) => element.elementId === operation.elementId,
            );
            if (found < 0)
              throw new PptdError('TARGET_NOT_FOUND', `Unknown element ${operation.elementId}.`);
            if (
              operation.op === 'element.patch' &&
              page.data.elements[found].elementType === 'group' &&
              (Object.hasOwn(operation.set, 'bounds') || Object.hasOwn(operation.set, 'rotation'))
            ) {
              const transformed = transformGroup(
                page.data.elements,
                operation.elementId,
                operation.set,
              );
              const explicit = new Set(
                operations
                  .map((entry) => entry.operation)
                  .filter(
                    (item) =>
                      item.op === 'element.patch' &&
                      item.pageId === operation.pageId &&
                      (Object.hasOwn(item.set, 'bounds') || Object.hasOwn(item.set, 'rotation')),
                  )
                  .map((item) => (item as { elementId: string }).elementId),
              );
              operations.splice(
                index + 1,
                0,
                ...transformed
                  .filter((item) => !explicit.has(item.elementId))
                  .map((item) => ({
                    operation: {
                      op: 'element.patch',
                      pageId,
                      elementId: item.elementId,
                      set: item.fields,
                    } as PptdOperation,
                    recipe: false,
                  })),
              );
            }
            for (const [instanceId, binding] of Object.entries(identity.components ?? {})) {
              if (!Object.values(binding.slots).includes(operation.elementId)) continue;
              check('metadata');
              if (operation.op === 'element.remove') {
                if (identity.components)
                  identity.components[instanceId] = removeRecipeSlot(binding, operation.elementId);
              } else if (!recipe) {
                const changed = patchPageElement(
                  source,
                  operation.elementId,
                  operation.set,
                  operation.unset,
                );
                if (changed !== source && identity.components)
                  identity.components[instanceId] = markRecipeElementOverride(
                    binding,
                    operation.elementId,
                    [...Object.keys(operation.set), ...(operation.unset ?? [])],
                  );
              }
            }
            if (operation.op === 'element.patch')
              source = patchPageElement(
                source,
                operation.elementId,
                operation.set,
                operation.unset,
              );
            else {
              const references = referencePaths(page.data, new Set([operation.elementId])).filter(
                (reference) => !reference.path.startsWith(`elements.${found}.`),
              );
              if (references.length)
                throw new PptdError(
                  'INVALID_REQUEST',
                  'This element is referenced elsewhere in the page.',
                  { references },
                );
              if (
                identity.elementRoles &&
                Object.hasOwn(identity.elementRoles, operation.elementId)
              ) {
                check('metadata');
                delete identity.elementRoles[operation.elementId];
              }
              source = editSourceSequence(
                source,
                ['elements'],
                page.data.elements
                  .map((_, i) => ({ index: i }))
                  .filter((entry) => entry.index !== found),
              );
            }
            if (source !== page.source)
              changedElements.set(`${pageId}/${operation.elementId}`, {
                pageId,
                elementId: operation.elementId,
              });
          } else if (operation.op === 'element.add') {
            const previousIds = page.data.elements.map((element) => element.elementId);
            if (previousIds.includes(operation.element.elementId))
              throw new PptdError(
                'AMBIGUOUS_ID',
                `Element ${operation.element.elementId} already exists.`,
              );
            const order = placeAfter(
              previousIds,
              operation.element.elementId,
              operation.afterElementId,
            );
            source = editSourceSequence(
              source,
              ['elements'],
              order.map((id) =>
                id === operation.element.elementId
                  ? { value: operation.element }
                  : { index: previousIds.indexOf(id) },
              ),
            );
            changedElements.set(`${pageId}/${operation.element.elementId}`, {
              pageId,
              elementId: operation.element.elementId,
            });
          } else if (operation.op === 'element.reorder') {
            const ids = page.data.elements.map((element) => element.elementId);
            if (
              operation.elementIds.length !== ids.length ||
              new Set(operation.elementIds).size !== ids.length ||
              operation.elementIds.some((id) => !ids.includes(id))
            )
              throw new PptdError(
                'INVALID_REQUEST',
                'Layer order must contain every element exactly once.',
              );
            source = editSourceSequence(
              source,
              ['elements'],
              operation.elementIds.map((id) => ({ index: ids.indexOf(id) })),
            );
            if (source !== page.source)
              for (const elementId of ids)
                changedElements.set(`${pageId}/${elementId}`, { pageId, elementId });
          } else source = setPageNotes(source, operation.text);
          writePage(pageId, source);
          break;
        }
        case 'page.add':
        case 'page.duplicate': {
          check('manifest');
          check('metadata');
          let source: string;
          let originalId: string | undefined;
          let duplicatedIdentity: ProjectMetadata['slides'][string] | undefined;
          if (operation.op === 'page.duplicate') {
            const original = pageDocument(operation.pageId);
            originalId = original.pageId;
            check('pages', originalId);
            const remap = new Map(
              original.page.data.elements.map((element) => [
                element.elementId,
                `e-${randomUUID()}`,
              ]),
            );
            const set = Object.fromEntries(
              referencePaths(original.page.data, new Set(remap.keys())).map((reference) => [
                reference.path,
                remap.get(reference.value),
              ]),
            );
            source = patchSourceFields(original.page.source, [], set);
            duplicatedIdentity = structuredClone(original.identity);
            duplicatedIdentity.elementRoles = Object.fromEntries(
              Object.entries(duplicatedIdentity.elementRoles ?? {}).map(([id, role]) => [
                remap.get(id) ?? id,
                role,
              ]),
            );
            for (const binding of Object.values(duplicatedIdentity.components ?? {}))
              for (const [slot, id] of Object.entries(binding.slots))
                if (id) binding.slots[slot] = remap.get(id) ?? id;
            duplicatedIdentity.lastAuthorReview = null;
          } else
            source = serializePage(
              operation.page ?? { elements: [] },
              base.manifestSource.includes('\r\n') ? '\r\n' : '\n',
            );
          const created = await allocatePage();
          if (duplicatedIdentity)
            docs.metadata.slides[created.pageId] = {
              ...duplicatedIdentity,
              ...docs.metadata.slides[created.pageId],
              components: duplicatedIdentity.components,
              elementRoles: duplicatedIdentity.elementRoles,
            };
          docs.pages.set(created.pageId, {
            source,
            path: created.path,
            data: parsePage(source).value,
          });
          touchedPages.add(created.pageId);
          const after =
            operation.op === 'page.duplicate' && operation.afterPageId === undefined
              ? originalId
              : anchorId(operation.afterPageId);
          writeOrder(placeAfter(orderedIds(), created.pageId, after));
          break;
        }
        case 'page.move': {
          check('manifest');
          const { pageId } = pageDocument(operation.pageId);
          writeOrder(placeAfter(orderedIds(), pageId, anchorId(operation.afterPageId)));
          touchedPages.add(pageId);
          break;
        }
        case 'page.remove':
        case 'page.restore': {
          check('manifest');
          check('metadata');
          const { pageId, identity } = pageDocument(operation.pageId, false);
          check('pages', pageId);
          if (operation.op === 'page.remove') {
            writeOrder(orderedIds().filter((id) => id !== pageId));
            identity.state = 'tombstone';
          } else {
            identity.state = 'active';
            writeOrder(placeAfter(orderedIds(), pageId, anchorId(operation.afterPageId)));
          }
          touchedPages.add(pageId);
          break;
        }
        case 'page.relink': {
          check('manifest');
          check('metadata');
          const { pageId, identity } = pageIdentity(operation.pageId);
          const newPath = normalizeRelativePath(operation.path);
          if (
            Object.entries(docs.metadata.slides).some(
              ([id, slide]) => id !== pageId && slide.path === newPath,
            )
          )
            throw new PptdError('AMBIGUOUS_ID', `Another page uses ${newPath}.`);
          const source = await readUtf8(await resolveProjectPath(this.root, newPath));
          const expected = request.expected.pages?.[pageId];
          if (expected !== hashBytes(source))
            throw new PptdError(
              expected === undefined ? 'MISSING_PRECONDITION' : 'REVISION_CONFLICT',
              'Relink requires the new page file hash.',
              { pageId, currentRevision: hashBytes(source) },
            );
          const paths = documentManifest(docs).pages.map((value) =>
            normalizeRelativePath(value) === identity.path ? newPath : value,
          );
          identity.path = newPath;
          docs.pages.set(pageId, { source, path: newPath, data: parsePage(source).value });
          relinkedPages.add(pageId);
          docs.manifestSource = setManifestPages(docs.manifestSource, paths);
          touchedPages.add(pageId);
          break;
        }
        case 'metadata.patch': {
          check('metadata');
          assertIndependentFields(operation.set, operation.unset);
          const { pageId, identity } = pageIdentity(operation.pageId);
          for (const field of [...Object.keys(operation.set), ...(operation.unset ?? [])]) {
            const head = parseFieldPath(field)[0];
            if (head === 'lastAuthorReview')
              throw new PptdError(
                'INVALID_REQUEST',
                'Author review records are read-only through the shared transaction API.',
              );
            if (
              !['designIntent', 'elementRoles', 'components', 'themeOverride'].includes(
                String(head),
              )
            )
              throw new PptdError(
                'INVALID_REQUEST',
                `Metadata field ${String(head)} is not editable.`,
              );
            if (head === 'components' || head === 'elementRoles') check('pages', pageId);
            if (head === 'components') check('manifest');
          }
          for (const [field, value] of Object.entries(operation.set))
            setValueAtPath(identity, parseFieldPath(field), value);
          for (const field of operation.unset ?? [])
            unsetValueAtPath(identity, parseFieldPath(field));
          break;
        }
        case 'recipe.apply':
        case 'recipe.reset': {
          const { pageId, identity } = pageDocument(operation.pageId);
          check('pages', pageId);
          check('metadata');
          check('manifest');
          const binding = identity.components?.[operation.instanceId];
          if (!binding)
            throw new PptdError(
              'TARGET_NOT_FOUND',
              `Unknown recipe instance ${operation.instanceId}.`,
            );
          const plan = applyRecipe({
            page: this.pageSnapshot(docs, pageId),
            instanceId: operation.instanceId,
            binding,
            size: documentManifest(docs).size ?? [960, 540],
            params: operation.params,
            reset: operation.op === 'recipe.reset' ? (operation.reset ?? {}) : undefined,
          });
          operations.splice(
            index + 1,
            0,
            ...plan.operations.map((item) => ({ operation: item as PptdOperation, recipe: true })),
          );
          skippedOverrides.push(...plan.skippedOverrides);
          break;
        }
        case 'page.version.restore': {
          const { pageId, identity, page } = pageDocument(operation.pageId);
          check('pages', pageId);
          const checkpoint = operation.versionId.startsWith('checkpoint:')
            ? await this.checkpoints.find(docs.metadata.deckId, pageId, operation.versionId)
            : null;
          const version =
            checkpoint ??
            this.pageVersions.find(
              pageId,
              operation.versionId,
              this.pageVersionState(base, pageId),
              await this.persistence.history(),
            );
          if (checkpoint) {
            if (
              !isDeepStrictEqual(checkpoint.state.size, documentManifest(docs).size ?? [960, 540])
            )
              throw new PptdError(
                'INVALID_REQUEST',
                'This version uses a different slide size. Restore the matching project dimensions before applying it.',
              );
            version.state.metadata.themeOverride = checkpoint.state.theme;
          }
          const metadataChanged = VERSIONED_PAGE_METADATA.some(
            (key) => !isDeepStrictEqual(identity[key], version.state.metadata[key]),
          );
          if (metadataChanged) {
            check('metadata');
            for (const key of VERSIONED_PAGE_METADATA) {
              if (Object.hasOwn(version.state.metadata, key))
                (identity as Record<string, unknown>)[key] = structuredClone(
                  version.state.metadata[key],
                );
              else delete identity[key];
            }
            touchedPages.add(pageId);
          }
          if (page.source !== version.state.source) {
            for (const element of [
              ...page.data.elements,
              ...parsePage(version.state.source).value.elements,
            ])
              changedElements.set(`${pageId}/${element.elementId}`, {
                pageId,
                elementId: element.elementId,
              });
            writePage(pageId, version.state.source);
          }
          break;
        }
        case 'history.revert': {
          const target = await this.persistence.historyRecord(operation.operationId);
          if (target.request.deckId !== request.deckId)
            throw new PptdError(
              'TARGET_NOT_FOUND',
              'The history operation belongs to another deck.',
            );
          if (target.result.noOp)
            throw new PptdError('INVALID_REQUEST', 'A no-op transaction has no inverse.');
          revertedOperationId = operation.operationId;
          for (const file of target.files) {
            const actual = await readOptional(await resolveProjectPath(this.root, file.path));
            if (actual !== file.after)
              throw new PptdError(
                'UNDO_CONFLICT',
                `The target was changed after this operation: ${file.path}`,
                { path: file.path, currentRevision: actual === null ? null : hashBytes(actual) },
              );
            if (file.role === 'page' && file.pageId) check('pages', file.pageId);
            else if (file.role === 'manifest') check('manifest');
            else if (file.role === 'metadata') check('metadata');
          }
          for (const file of target.files) {
            if (file.role === 'page' && file.pageId && file.before !== null)
              writePage(file.pageId, file.before);
            if (file.role === 'manifest' && file.before !== null) docs.manifestSource = file.before;
            if (file.role === 'metadata' && file.before !== null) {
              const restored = parseMetadata(file.before);
              for (const [id, identity] of Object.entries(docs.metadata.slides))
                if (!Object.hasOwn(restored.slides, id))
                  restored.slides[id] = { ...identity, state: 'tombstone' };
              docs.metadata = restored;
            }
          }
          for (const ref of target.changedElements)
            changedElements.set(`${ref.pageId}/${ref.elementId}`, ref);
          for (const pageId of target.changedPages) touchedPages.add(pageId);
          break;
        }
        default:
          throw new PptdError(
            'INVALID_REQUEST',
            `Unsupported operation ${(operation as { op: unknown }).op}.`,
          );
      }
    }
    for (const [pageId, page] of docs.pages) {
      validatePage(page.data);
      try {
        expandGroupIds(
          page.data.elements,
          page.data.elements
            .filter((item) => item.elementType === 'group')
            .map((item) => item.elementId),
        );
        for (const element of page.data.elements)
          owningGroupId(page.data.elements, element.elementId);
      } catch (error) {
        throw new PptdError(
          'INVALID_DOCUMENT',
          error instanceof Error ? error.message : String(error),
        );
      }
      for (const binding of Object.values(docs.metadata.slides[pageId]?.components ?? {})) {
        if (!isRecord(binding.slots) || !isRecord(binding.overrides))
          throw new PptdError('INVALID_DOCUMENT', 'A recipe binding requires slots and overrides.');
        for (const id of Object.values(binding.slots))
          if (id !== null && !page.data.elements.some((element) => element.elementId === id))
            throw new PptdError(
              'INVALID_DOCUMENT',
              `A recipe slot references missing element ${id}.`,
            );
      }
    }
    docs.metadataSource = isDeepStrictEqual(base.metadata, docs.metadata)
      ? base.metadataSource
      : serializeMetadata(docs.metadata);
    for (const pagePath of documentManifest(docs).pages.map(normalizeRelativePath)) {
      const identity = Object.entries(docs.metadata.slides).find(
        ([, slide]) => slide.path === pagePath,
      );
      if (identity?.[1].state !== 'active')
        throw new PptdError(
          'INVALID_DOCUMENT',
          `The page order references an inactive or unindexed file: ${pagePath}`,
        );
      const [pageId] = identity;
      const current = docs.pages.get(pageId);
      if (!current || current.path !== pagePath) {
        const source = await readOptional(await resolveProjectPath(this.root, pagePath));
        if (source === null)
          throw new PptdError(
            revertedOperationId ? 'UNDO_CONFLICT' : 'INVALID_DOCUMENT',
            `The transaction would reference a missing page: ${pagePath}`,
          );
        docs.pages.set(pageId, { source, path: pagePath, data: parsePage(source).value });
      }
    }
    docs.diagnostics = docs.diagnostics.filter(
      (item) => item.code !== 'PAGE_MISSING' || !item.pageId || !docs.pages.has(item.pageId),
    );
    await refreshAssetFingerprints(this.root, docs, this.assetCache, this.onTiming);
    const files: FileChange[] = [];
    for (const [pageId, page] of docs.pages) {
      const original = base.pages.get(pageId);
      if (relinkedPages.has(pageId)) continue;
      if (original?.path !== page.path && original !== undefined) continue;
      const previous = original?.source ?? null;
      if (previous !== page.source)
        files.push({ path: page.path, before: previous, after: page.source, role: 'page', pageId });
    }
    if (docs.metadataSource !== base.metadataSource)
      files.push({
        path: METADATA_PATH,
        before: base.metadataSource,
        after: docs.metadataSource,
        role: 'metadata',
      });
    if (docs.manifestSource !== base.manifestSource)
      files.push({
        path: this.entry,
        before: base.manifestSource,
        after: docs.manifestSource,
        role: 'manifest',
      });
    const noOp = files.length === 0;
    const operationId = randomUUID();
    const result: TransactionResult = {
      ok: true,
      requestId: request.requestId,
      operationId,
      newRevisions: revisions(docs),
      changedPages: noOp ? [] : [...touchedPages],
      changedElements: noOp ? [] : [...changedElements.values()],
      createdPages,
      skippedOverrides,
      diagnostics: docs.diagnostics,
      noOp,
    };
    const record: HistoryRecord = {
      operationId,
      requestId: request.requestId,
      actor: request.actor,
      timestamp: this.pageVersions.nextTimestamp(),
      summary: request.operations.map((operation) => operation.op).join(', '),
      changedPages: result.changedPages,
      changedElements: result.changedElements,
      before,
      after: result.newRevisions,
      revertedOperationId,
      files,
      request,
      requestHash,
      result,
    };
    reportTiming(this.onTiming, 'commit.prepare', started, { pages: touchedPages.size });
    const persistenceStarted = performance.now();
    await this.persistence.commit(record);
    reportTiming(this.onTiming, 'commit.persist', persistenceStarted, { pages: touchedPages.size });
    this.replaceDocuments(docs, 'committed', operationId, request.originClientId);
    return structuredClone(result);
  }
}

export function openPptdStore(options: OpenPptdOptions): Promise<PptdStore> {
  return PptdStore.open(options);
}
