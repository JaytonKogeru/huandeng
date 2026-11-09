import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { isRecord, parseManifest } from './codec';
import { parseMetadata } from './identity';
import { atomicWrite, type HistoryRecord, hashBytes, hashPayload, readUtf8 } from './persistence';
import { mainPositionForPath } from './position-field';
import {
  type PageSize,
  type PageVersionSummary,
  PptdError,
  type Revision,
  type SlideIdentity,
} from './types';

export const VERSIONED_PAGE_METADATA = [
  'designIntent',
  'elementRoles',
  'components',
  'themeOverride',
] as const;

export interface PageVersionState {
  source: string;
  metadata: SlideIdentity;
  size: PageSize;
  /** Display context at capture time; deliberately excluded from content equality. */
  mainPosition?: number;
}

export interface StoredPageVersion {
  summary: PageVersionSummary;
  state: PageVersionState;
}

interface PageObservation {
  pageId: string;
  versionId: string;
  createdAt: string;
  actor: string;
  summary: string;
  kind: 'initial' | 'external';
  state: PageVersionState;
}

interface ObservationIndex {
  summary: Omit<PageVersionSummary, 'current'>;
  file: string;
  fileRevision: Revision;
  metadataRevision: string;
  size: PageSize;
  mainPosition?: number;
  pagePath: string;
}

interface VersionStateReference {
  source: { value: string } | { observation: ObservationIndex };
  metadata: { value: SlideIdentity } | { observation: ObservationIndex };
  pageRevision: Revision;
  metadataRevision: string;
  size: PageSize;
  mainPosition?: number;
}

const MAX_HOT_VERSIONS = 8;
const MAX_HOT_BYTES = 4 * 1024 * 1024;

function stateBytes(state: PageVersionState): number {
  // Account conservatively for UTF-16 strings; this is a cache budget, not V8 retainedSize.
  return (state.source.length + JSON.stringify(state.metadata).length) * 2 + 64;
}

function validateObservation(value: unknown): PageObservation {
  if (
    !isRecord(value) ||
    typeof value.pageId !== 'string' ||
    typeof value.versionId !== 'string' ||
    typeof value.createdAt !== 'string' ||
    !Number.isFinite(Date.parse(value.createdAt)) ||
    typeof value.actor !== 'string' ||
    typeof value.summary !== 'string' ||
    !['initial', 'external'].includes(String(value.kind)) ||
    !isRecord(value.state) ||
    typeof value.state.source !== 'string' ||
    !isRecord(value.state.metadata) ||
    typeof value.state.metadata.path !== 'string' ||
    !['active', 'tombstone'].includes(String(value.state.metadata.state)) ||
    !Array.isArray(value.state.size) ||
    value.state.size.length !== 2 ||
    !value.state.size.every((dimension) => typeof dimension === 'number' && dimension > 0) ||
    (value.state.mainPosition !== undefined &&
      !(
        typeof value.state.mainPosition === 'number' &&
        Number.isSafeInteger(value.state.mainPosition) &&
        value.state.mainPosition > 0
      ))
  )
    throw new PptdError('RECOVERY_REQUIRED', 'A recorded page observation is invalid.');
  return value as unknown as PageObservation;
}

function reference(state: PageVersionState): VersionStateReference {
  return {
    source: { value: state.source },
    metadata: { value: state.metadata },
    pageRevision: hashBytes(state.source),
    metadataRevision: metadataRevision(state.metadata),
    size: [...state.size],
    mainPosition: state.mainPosition,
  };
}

function sameState(left: VersionStateReference, right: VersionStateReference): boolean {
  return (
    left.pageRevision === right.pageRevision &&
    left.metadataRevision === right.metadataRevision &&
    left.size[0] === right.size[0] &&
    left.size[1] === right.size[1]
  );
}

function editableMetadata(metadata: SlideIdentity | undefined): Record<string, unknown> {
  return Object.fromEntries(
    VERSIONED_PAGE_METADATA.filter((key) => metadata && Object.hasOwn(metadata, key)).map((key) => [
      key,
      metadata?.[key],
    ]),
  );
}

function metadataRevision(metadata: SlideIdentity | undefined): string {
  return hashPayload(editableMetadata(metadata));
}

export function pageVersionStateRevision(state: PageVersionState): string {
  return hashPayload({
    page: hashBytes(state.source),
    metadata: editableMetadata(state.metadata),
    size: state.size,
  });
}

function recordStates(record: HistoryRecord, pageId: string) {
  const page = record.files.find((file) => file.role === 'page' && file.pageId === pageId);
  const metadata = record.files.find((file) => file.role === 'metadata');
  const manifest = record.files.find((file) => file.role === 'manifest');
  const before = manifest?.before ? parseManifest(manifest.before).value : undefined;
  const after = manifest?.after ? parseManifest(manifest.after).value : undefined;
  return {
    page,
    metadataBefore: metadata?.before ? parseMetadata(metadata.before).slides[pageId] : undefined,
    metadataAfter: metadata?.after ? parseMetadata(metadata.after).slides[pageId] : undefined,
    metadataChanged: Boolean(metadata),
    sizeBefore: before?.size,
    sizeAfter: after?.size,
    pagesBefore: before?.pages,
    pagesAfter: after?.pages,
    positions: record.pagePositions?.[pageId],
  };
}

function initialState(
  pageId: string,
  current: PageVersionState,
  records: HistoryRecord[],
): PageVersionState | null {
  const state = structuredClone(current);
  if (records.length) state.mainPosition = undefined;
  for (const record of [...records].reverse()) {
    const changes = recordStates(record, pageId);
    if (changes.page) {
      if (changes.page.before === null) return null;
      state.source = changes.page.before;
    }
    if (changes.metadataBefore) state.metadata = structuredClone(changes.metadataBefore);
    if (changes.sizeBefore) state.size = changes.sizeBefore;
    if (changes.positions) state.mainPosition = changes.positions.before ?? undefined;
    else if (changes.pagesBefore)
      state.mainPosition = mainPositionForPath(changes.pagesBefore, state.metadata.path);
    else if (
      changes.page ||
      metadataRevision(changes.metadataBefore) !== metadataRevision(changes.metadataAfter)
    )
      state.mainPosition = undefined;
  }
  return state;
}

export class PageVersionArchive {
  private observations = new Map<string, ObservationIndex[]>();
  private versionIds = new Set<string>();
  private hot = new Map<string, { state: PageVersionState; bytes: number }>();
  private hotBytes = 0;
  private temporaryDirectory: string | undefined;
  private clock = 0;

  constructor(
    private readonly stateDir: string,
    private readonly readOnly: boolean,
  ) {}

  nextTimestamp(): string {
    this.clock = Math.max(Date.now(), this.clock + 1);
    return new Date(this.clock).toISOString();
  }

  cacheUsage() {
    return {
      observations: this.versionIds.size,
      entries: this.hot.size,
      estimatedBytes: this.hotBytes,
      maxEntries: MAX_HOT_VERSIONS,
      maxEstimatedBytes: MAX_HOT_BYTES,
      temporary: this.temporaryDirectory !== undefined,
    };
  }

  async close(): Promise<void> {
    this.hot.clear();
    this.hotBytes = 0;
    if (this.temporaryDirectory) {
      await fs.rm(this.temporaryDirectory, { recursive: true, force: true });
      this.temporaryDirectory = undefined;
    }
  }

  private remember(versionId: string, state: PageVersionState): void {
    const previous = this.hot.get(versionId);
    if (previous) {
      this.hot.delete(versionId);
      this.hotBytes -= previous.bytes;
    }
    const bytes = stateBytes(state);
    if (bytes > MAX_HOT_BYTES) return;
    this.hot.set(versionId, { state, bytes });
    this.hotBytes += bytes;
    while (this.hot.size > MAX_HOT_VERSIONS || this.hotBytes > MAX_HOT_BYTES) {
      const oldest = this.hot.keys().next().value;
      if (oldest === undefined) break;
      this.hotBytes -= this.hot.get(oldest)?.bytes ?? 0;
      this.hot.delete(oldest);
    }
  }

  private index(observation: PageObservation, file: string, source: string): void {
    if (this.versionIds.has(observation.versionId))
      throw new PptdError('RECOVERY_REQUIRED', `Duplicate page version ${observation.versionId}.`);
    const { state } = observation;
    const indexed: ObservationIndex = {
      summary: {
        pageId: observation.pageId,
        versionId: observation.versionId,
        createdAt: observation.createdAt,
        actor: observation.actor,
        summary: observation.summary,
        kind: observation.kind,
        pageRevision: hashBytes(state.source),
      },
      file,
      fileRevision: hashBytes(source),
      metadataRevision: metadataRevision(state.metadata),
      size: [...state.size],
      mainPosition: state.mainPosition,
      pagePath: state.metadata.path,
    };
    const page = this.observations.get(observation.pageId) ?? [];
    page.push(indexed);
    this.observations.set(observation.pageId, page);
    this.versionIds.add(observation.versionId);
    this.clock = Math.max(this.clock, Date.parse(observation.createdAt));
    this.remember(observation.versionId, state);
  }

  private async read(indexed: ObservationIndex): Promise<PageVersionState> {
    const cached = this.hot.get(indexed.summary.versionId);
    if (cached) {
      this.hot.delete(indexed.summary.versionId);
      this.hot.set(indexed.summary.versionId, cached);
      return cached.state;
    }
    try {
      const source = await readUtf8(indexed.file);
      if (hashBytes(source) !== indexed.fileRevision)
        throw new Error('The recorded page version changed on disk.');
      const observation = validateObservation(JSON.parse(source));
      this.remember(indexed.summary.versionId, observation.state);
      return observation.state;
    } catch (error) {
      throw new PptdError(
        'RECOVERY_REQUIRED',
        `Cannot read page version ${indexed.summary.versionId}: ${String(error)}`,
      );
    }
  }

  async initialize(states: Map<string, PageVersionState>, records: HistoryRecord[]): Promise<void> {
    const directory = path.join(this.stateDir, 'page-versions');
    let files: string[] = [];
    try {
      files = await fs.readdir(directory);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
    // Index one complete record at a time. Full source text is only retained in the bounded LRU.
    for (const file of files.filter((file) => file.endsWith('.json'))) {
      try {
        const absolute = path.join(directory, file);
        const source = await readUtf8(absolute);
        this.index(validateObservation(JSON.parse(source)), absolute, source);
      } catch (error) {
        throw new PptdError(
          'RECOVERY_REQUIRED',
          `Cannot index recorded page version ${file}: ${String(error)}`,
        );
      }
    }
    for (const record of records) this.clock = Math.max(this.clock, Date.parse(record.timestamp));
    for (const [pageId, state] of states) await this.observe(pageId, state, records);
  }

  private async save(observation: PageObservation): Promise<void> {
    let directory = path.join(this.stateDir, 'page-versions');
    if (this.readOnly) {
      try {
        this.temporaryDirectory ??= await fs.mkdtemp(
          path.join(os.tmpdir(), 'huandeng-page-versions-'),
        );
        directory = this.temporaryDirectory;
      } catch (error) {
        throw new PptdError(
          'HISTORY_UNAVAILABLE',
          `Cannot preserve this read-only session's page history: ${String(error)}`,
        );
      }
    }
    const file = path.join(directory, `${hashBytes(observation.versionId).slice(7)}.json`);
    const source = `${JSON.stringify(observation)}\n`;
    try {
      await atomicWrite(file, source);
    } catch (error) {
      if (!this.readOnly) throw error;
      throw new PptdError(
        'HISTORY_UNAVAILABLE',
        `Cannot preserve this read-only session's page history: ${String(error)}`,
      );
    }
    this.index(observation, file, source);
  }

  async observe(pageId: string, state: PageVersionState, records: HistoryRecord[]): Promise<void> {
    if (!this.observations.has(pageId)) {
      const initial = initialState(pageId, state, records);
      if (initial) {
        const beforeFirstEdit = records.find((record) => {
          const changes = recordStates(record, pageId);
          return (
            changes.page ||
            metadataRevision(changes.metadataBefore) !== metadataRevision(changes.metadataAfter)
          );
        });
        await this.save({
          pageId,
          versionId: `initial:${pageId}`,
          createdAt: records[0]?.timestamp ?? this.nextTimestamp(),
          actor: 'project',
          summary: beforeFirstEdit ? 'Before first recorded edit' : 'Initial recorded page',
          kind: 'initial',
          state: initial,
        });
      }
    }
    const latest = this.collect(pageId, state, records).latest;
    if (latest && sameState(latest.state, reference(state))) return;
    await this.save({
      pageId,
      versionId: `external:${randomUUID()}`,
      createdAt: this.nextTimestamp(),
      actor: 'external',
      summary: 'Page change observed on disk',
      kind: 'external',
      state: structuredClone(state),
    });
  }

  private collect(
    pageId: string,
    current: PageVersionState,
    records: HistoryRecord[],
    targetVersionId?: string,
  ) {
    const events = [
      ...records.map((record) => ({ timestamp: record.timestamp, record })),
      ...(this.observations.get(pageId) ?? []).map((observation) => ({
        timestamp: observation.summary.createdAt,
        observation,
      })),
    ].sort(
      (a, b) =>
        a.timestamp.localeCompare(b.timestamp) || Number('record' in a) - Number('record' in b),
    );
    const versions: PageVersionSummary[] = [];
    let state: VersionStateReference | undefined;
    let latest: { summary: PageVersionSummary; state: VersionStateReference } | undefined;
    let selected: typeof latest;
    const currentReference = reference(current);
    const append = (
      summary: Omit<PageVersionSummary, 'current' | 'pageRevision' | 'pageId'>,
      next: VersionStateReference,
    ) => {
      state = { ...next, size: [...next.size] };
      latest = {
        summary: { ...summary, pageId, pageRevision: next.pageRevision, current: false },
        state: { ...next, size: [...next.size] },
      };
      versions.push(latest.summary);
      if (summary.versionId === targetVersionId) selected = latest;
    };
    for (const event of events) {
      if ('observation' in event) {
        const observation = event.observation;
        append(observation.summary, {
          source: { observation },
          metadata: { observation },
          pageRevision: observation.summary.pageRevision,
          metadataRevision: observation.metadataRevision,
          size: observation.size,
          mainPosition: observation.mainPosition,
        });
        continue;
      }
      const record = event.record;
      if (record.result.noOp) continue;
      const changes = recordStates(record, pageId);
      const metadataChanged =
        changes.metadataChanged &&
        metadataRevision(changes.metadataBefore) !== metadataRevision(changes.metadataAfter);
      if (!changes.page && !metadataChanged) {
        if (state && changes.sizeAfter) state.size = changes.sizeAfter;
        if (state && changes.metadataAfter) state.metadata = { value: changes.metadataAfter };
        if (state && changes.positions) state.mainPosition = changes.positions.after ?? undefined;
        else if (state && changes.pagesAfter) {
          const pagePath =
            'value' in state.metadata
              ? state.metadata.value.path
              : state.metadata.observation.pagePath;
          state.mainPosition = mainPositionForPath(changes.pagesAfter, pagePath);
        }
        continue;
      }
      const previous: VersionStateReference = {
        source:
          changes.page?.before !== null && changes.page?.before !== undefined
            ? { value: changes.page.before }
            : (state?.source ?? currentReference.source),
        metadata: changes.metadataBefore
          ? { value: changes.metadataBefore }
          : (state?.metadata ?? currentReference.metadata),
        pageRevision:
          changes.page?.before !== null && changes.page?.before !== undefined
            ? hashBytes(changes.page.before)
            : (state?.pageRevision ?? currentReference.pageRevision),
        metadataRevision: changes.metadataBefore
          ? metadataRevision(changes.metadataBefore)
          : (state?.metadataRevision ?? currentReference.metadataRevision),
        size: changes.sizeBefore ?? state?.size ?? current.size,
        mainPosition: state?.mainPosition,
      };
      if (changes.positions) previous.mainPosition = changes.positions.before ?? undefined;
      else if (changes.pagesBefore) {
        const pagePath =
          'value' in previous.metadata
            ? previous.metadata.value.path
            : previous.metadata.observation.pagePath;
        previous.mainPosition = mainPositionForPath(changes.pagesBefore, pagePath);
      }
      if (state && changes.page?.before !== null && !sameState(state, previous))
        append(
          {
            versionId: `external-before:${record.operationId}`,
            createdAt: record.timestamp,
            actor: 'external',
            summary: 'Page state observed before this edit',
            kind: 'external',
          },
          previous,
        );
      const next: VersionStateReference = {
        source:
          changes.page?.after !== null && changes.page?.after !== undefined
            ? { value: changes.page.after }
            : previous.source,
        metadata: changes.metadataAfter ? { value: changes.metadataAfter } : previous.metadata,
        pageRevision:
          changes.page?.after !== null && changes.page?.after !== undefined
            ? hashBytes(changes.page.after)
            : previous.pageRevision,
        metadataRevision: changes.metadataAfter
          ? metadataRevision(changes.metadataAfter)
          : previous.metadataRevision,
        size: changes.sizeAfter ?? previous.size,
        mainPosition: previous.mainPosition,
      };
      if (changes.positions) next.mainPosition = changes.positions.after ?? undefined;
      else if (changes.pagesAfter) {
        const pagePath =
          'value' in next.metadata ? next.metadata.value.path : next.metadata.observation.pagePath;
        next.mainPosition = mainPositionForPath(changes.pagesAfter, pagePath);
      }
      append(
        {
          versionId: `commit:${record.operationId}`,
          operationId: record.operationId,
          createdAt: record.timestamp,
          actor: record.actor,
          summary: record.summary,
          kind: record.request.operations.some(
            (operation) => operation.op === 'page.version.restore',
          )
            ? 'restore'
            : 'edit',
        },
        next,
      );
    }
    if (latest) latest.summary.current = sameState(latest.state, currentReference);
    return { summaries: versions.reverse(), latest, selected };
  }

  summaries(
    pageId: string,
    current: PageVersionState,
    records: HistoryRecord[],
  ): PageVersionSummary[] {
    return this.collect(pageId, current, records).summaries;
  }

  async find(
    pageId: string,
    versionId: string,
    current: PageVersionState,
    records: HistoryRecord[],
  ): Promise<StoredPageVersion> {
    const found = this.collect(pageId, current, records, versionId).selected;
    if (!found)
      throw new PptdError('TARGET_NOT_FOUND', `Unknown page version ${versionId}.`, { pageId });
    const { state } = found;
    return {
      summary: found.summary,
      state: {
        source:
          'value' in state.source
            ? state.source.value
            : (await this.read(state.source.observation)).source,
        metadata: structuredClone(
          'value' in state.metadata
            ? state.metadata.value
            : (await this.read(state.metadata.observation)).metadata,
        ),
        size: [...state.size],
        mainPosition: state.mainPosition,
      },
    };
  }

  /** Resolve bytes by recorded revision, never by the nearest observation's timestamp. */
  async sourceForRevision(pageId: string, revision: Revision): Promise<string | undefined> {
    const candidates = (this.observations.get(pageId) ?? []).filter(
      (observation) => observation.summary.pageRevision === revision,
    );
    for (const candidate of candidates) {
      try {
        const state = await this.read(candidate);
        if (hashBytes(state.source) === revision) return state.source;
      } catch {
        // Other exact journal/observation evidence may still be available.
      }
    }
    return undefined;
  }
}
