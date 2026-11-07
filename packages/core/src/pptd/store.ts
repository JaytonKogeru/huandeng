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
import {
  addIdentity,
  createMetadata,
  METADATA_PATH,
  normalizeRelativePath,
  parseMetadata,
  resolvePageIdentity,
  serializeMetadata,
} from './identity';
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
import { applyRecipe, markRecipeElementOverride, removeRecipeSlot } from './recipes';
import {
  type AuthorReviewContext,
  type CreatedPage,
  type DeckSnapshot,
  type Diagnostic,
  type DocumentEvent,
  type ElementRef,
  type HistorySummary,
  type NewRevisions,
  type PageSnapshot,
  PptdError,
  type PptdOperation,
  type PptdPage,
  type ProjectMetadata,
  type Revision,
  type TransactionRequest,
  type TransactionResult,
} from './types';

export interface OpenPptdOptions {
  entryPath: string;
  stateDir?: string;
  readOnly?: boolean;
  afterWrite?: (index: number) => Promise<void>;
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
    renderer: 'huandeng-pptd-0.1',
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
): Promise<void> {
  const globalAssets = assetReferences(parseManifest(documents.manifestSource).value);
  documents.pageAssets = new Map();
  documents.diagnostics = documents.diagnostics.filter((item) => item.code !== 'ASSET_UNAVAILABLE');
  for (const [pageId, page] of documents.pages) {
    const fingerprints: Record<string, Revision | null> = {};
    for (const reference of new Set([...globalAssets, ...assetReferences(page.data)])) {
      try {
        fingerprints[reference] = await fingerprintAsset(root, reference, cache);
      } catch (error) {
        fingerprints[reference] = null;
        documents.diagnostics.push({
          code: 'ASSET_UNAVAILABLE',
          message: `Cannot read asset ${reference}: ${String(error)}`,
          severity: 'warning',
          pageId,
          path: reference,
        });
      }
    }
    documents.pageAssets.set(pageId, fingerprints);
  }
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
        /^(elementId|elementIds|targetId|targetIds|sourceId|sourceIds|parentId|fromId|toId|target|targets)$/.test(
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
          /^(elementId|elementIds|targetId|targetIds|sourceId|sourceIds|parentId|fromId|toId)$/.test(
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

  private constructor(
    readonly root: string,
    readonly entry: string,
    readonly stateDir: string,
    readonly readOnly: boolean,
    private readonly persistence: Persistence,
    private readonly release: () => Promise<void>,
    private readonly assetCache: AssetHashCache,
    documents: Documents,
  ) {
    this.documents = documents;
    this.snapshot = this.makeSnapshot(documents);
  }

  static async open(options: OpenPptdOptions): Promise<PptdStore> {
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
        for (const pagePath of manifest.pages)
          parsePage(await readUtf8(await resolveProjectPath(root, pagePath)));
        await atomicWrite(metadataPath, serializeMetadata(metadata));
      }
      const assetCache: AssetHashCache = new Map();
      const documents = await PptdStore.loadDocuments(root, entry, assetCache);
      return new PptdStore(
        root,
        entry,
        stateDir,
        readOnly,
        persistence,
        release,
        assetCache,
        documents,
      );
    } catch (error) {
      await release();
      throw error;
    }
  }

  private static async loadDocuments(
    root: string,
    entry: string,
    assetCache: AssetHashCache,
  ): Promise<Documents> {
    const manifestSource = await readUtf8(await resolveProjectPath(root, entry));
    const manifest = parseManifest(manifestSource).value;
    const metadataSource = await readOptional(await resolveProjectPath(root, METADATA_PATH));
    const metadata =
      metadataSource === null
        ? createMetadata(entry, manifest.pages, root)
        : parseMetadata(metadataSource);
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
    const pages = new Map<string, PageDocument>();
    const pageAssets = new Map<string, Record<string, Revision | null>>();
    const diagnostics: Diagnostic[] = [];
    const realPaths = new Set<string>();
    for (const [pageId, identity] of Object.entries(metadata.slides)) {
      const file = await resolveProjectPath(root, identity.path);
      const source = await readOptional(file);
      if (source === null) {
        diagnostics.push({
          code: 'PAGE_MISSING',
          message: `Missing page ${identity.path}; use an explicit relink after an external rename.`,
          severity: identity.state === 'active' ? 'error' : 'warning',
          pageId,
          path: identity.path,
        });
        continue;
      }
      const realPath = await fs.realpath(file);
      if (realPaths.has(realPath))
        throw new PptdError(
          'INVALID_DOCUMENT',
          'Multiple identities resolve to the same physical page file.',
        );
      realPaths.add(realPath);
      pages.set(pageId, { source, path: identity.path, data: parsePage(source).value });
    }
    const documents = { manifestSource, metadataSource, metadata, pages, pageAssets, diagnostics };
    await refreshAssetFingerprints(root, documents, assetCache);
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
    const manifest = parseManifest(documents.manifestSource).value;
    const byPath = new Map(
      Object.entries(documents.metadata.slides).map(([id, identity]) => [identity.path, id]),
    );
    const pages = manifest.pages
      .map(normalizeRelativePath)
      .map((pagePath) => byPath.get(pagePath))
      .filter((id): id is string => id !== undefined && documents.pages.has(id))
      .map((id) => this.pageSnapshot(documents, id));
    return {
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
  }

  getSnapshot(): DeckSnapshot {
    return structuredClone(this.snapshot);
  }

  readPage(target: string): PageSnapshot {
    const { pageId } = resolvePageIdentity(this.documents.metadata, target);
    return this.pageSnapshot(this.documents, pageId);
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
    this.documents = documents;
    if (Object.keys(changedPages).length || manifestChanged || metadataChanged) this.sequence++;
    this.snapshot = this.makeSnapshot(documents);
    if (Object.keys(changedPages).length || manifestChanged || metadataChanged)
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
        const next = await PptdStore.loadDocuments(this.root, this.entry, this.assetCache);
        if (next.diagnostics.some((item) => item.severity === 'error'))
          throw new PptdError(
            'INVALID_DOCUMENT',
            next.diagnostics.map((item) => item.message).join('; '),
          );
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
    return this.enqueue(() => this.commitNow(request));
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
    const base = await PptdStore.loadDocuments(this.root, this.entry, this.assetCache);
    if (request.deckId !== base.metadata.deckId)
      throw new PptdError('TARGET_NOT_FOUND', 'The request belongs to another deck.');
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
      return parseManifest(docs.manifestSource).value.pages.map((pagePath) => {
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
          const paths = parseManifest(docs.manifestSource).value.pages.map((value) =>
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
            if (!['designIntent', 'elementRoles', 'components'].includes(String(head)))
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
            size: parseManifest(docs.manifestSource).value.size ?? [960, 540],
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
    for (const pagePath of parseManifest(docs.manifestSource).value.pages.map(
      normalizeRelativePath,
    )) {
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
    await refreshAssetFingerprints(this.root, docs, this.assetCache);
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
      timestamp: new Date().toISOString(),
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
    await this.persistence.commit(record);
    this.replaceDocuments(docs, 'committed', operationId, request.originClientId);
    return structuredClone(result);
  }
}

export function openPptdStore(options: OpenPptdOptions): Promise<PptdStore> {
  return PptdStore.open(options);
}
