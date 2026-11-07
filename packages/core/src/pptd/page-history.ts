import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { parseManifest } from './codec';
import { parseMetadata } from './identity';
import { atomicWrite, type HistoryRecord, hashBytes, hashPayload, readUtf8 } from './persistence';
import { type PageSize, type PageVersionSummary, PptdError, type SlideIdentity } from './types';

export const VERSIONED_PAGE_METADATA = ['designIntent', 'elementRoles', 'components'] as const;

export interface PageVersionState {
  source: string;
  metadata: SlideIdentity;
  size: PageSize;
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
  return {
    page,
    metadataBefore: metadata?.before ? parseMetadata(metadata.before).slides[pageId] : undefined,
    metadataAfter: metadata?.after ? parseMetadata(metadata.after).slides[pageId] : undefined,
    metadataChanged: Boolean(metadata),
    sizeBefore: manifest?.before ? parseManifest(manifest.before).value.size : undefined,
    sizeAfter: manifest?.after ? parseManifest(manifest.after).value.size : undefined,
  };
}

function initialState(
  pageId: string,
  current: PageVersionState,
  records: HistoryRecord[],
): PageVersionState | null {
  const state = structuredClone(current);
  for (const record of [...records].reverse()) {
    const changes = recordStates(record, pageId);
    if (changes.page) {
      if (changes.page.before === null) return null;
      state.source = changes.page.before;
    }
    if (changes.metadataBefore) state.metadata = structuredClone(changes.metadataBefore);
    if (changes.sizeBefore) state.size = changes.sizeBefore;
  }
  return state;
}

export class PageVersionArchive {
  private observations: PageObservation[] = [];
  private clock = 0;

  constructor(
    private readonly stateDir: string,
    private readonly readOnly: boolean,
  ) {}

  nextTimestamp(): string {
    this.clock = Math.max(Date.now(), this.clock + 1);
    return new Date(this.clock).toISOString();
  }

  async initialize(states: Map<string, PageVersionState>, records: HistoryRecord[]): Promise<void> {
    const directory = path.join(this.stateDir, 'page-versions');
    let files: string[] = [];
    try {
      files = await fs.readdir(directory);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
    this.observations = await Promise.all(
      files
        .filter((file) => file.endsWith('.json'))
        .map(
          async (file) => JSON.parse(await readUtf8(path.join(directory, file))) as PageObservation,
        ),
    );
    this.clock = Math.max(
      0,
      ...records.map((record) => Date.parse(record.timestamp)),
      ...this.observations.map((record) => Date.parse(record.createdAt)),
    );
    for (const [pageId, state] of states) await this.observe(pageId, state, records);
  }

  private async save(observation: PageObservation): Promise<void> {
    if (!this.readOnly)
      await atomicWrite(
        path.join(
          this.stateDir,
          'page-versions',
          `${hashBytes(observation.versionId).slice(7)}.json`,
        ),
        `${JSON.stringify(observation)}\n`,
      );
    this.observations.push(observation);
  }

  async observe(pageId: string, state: PageVersionState, records: HistoryRecord[]): Promise<void> {
    if (!this.observations.some((observation) => observation.pageId === pageId)) {
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
          createdAt: beforeFirstEdit?.timestamp ?? this.nextTimestamp(),
          actor: 'project',
          summary: beforeFirstEdit ? 'Before first recorded edit' : 'Initial recorded page',
          kind: 'initial',
          state: initial,
        });
      }
    }
    const latest = this.versions(pageId, state, records)[0];
    if (latest && pageVersionStateRevision(latest.state) === pageVersionStateRevision(state))
      return;
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

  versions(
    pageId: string,
    current: PageVersionState,
    records: HistoryRecord[],
  ): StoredPageVersion[] {
    const events = [
      ...records.map((record) => ({ timestamp: record.timestamp, record })),
      ...this.observations
        .filter((observation) => observation.pageId === pageId)
        .map((observation) => ({ timestamp: observation.createdAt, observation })),
    ].sort(
      (a, b) =>
        a.timestamp.localeCompare(b.timestamp) || Number('record' in a) - Number('record' in b),
    );
    const versions: StoredPageVersion[] = [];
    let state: PageVersionState | undefined;
    const append = (
      summary: Omit<PageVersionSummary, 'current' | 'pageRevision' | 'pageId'>,
      next: PageVersionState,
    ) => {
      state = structuredClone(next);
      versions.push({
        summary: { ...summary, pageId, pageRevision: hashBytes(next.source), current: false },
        state: structuredClone(next),
      });
    };
    for (const event of events) {
      if ('observation' in event) {
        const { state: next, ...observation } = event.observation;
        append(observation, next);
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
        continue;
      }
      const previous: PageVersionState = {
        source: changes.page?.before ?? state?.source ?? current.source,
        metadata: changes.metadataBefore ?? state?.metadata ?? current.metadata,
        size: changes.sizeBefore ?? state?.size ?? current.size,
      };
      if (
        state &&
        changes.page?.before !== null &&
        pageVersionStateRevision(state) !== pageVersionStateRevision(previous)
      )
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
      const next: PageVersionState = {
        source: changes.page?.after ?? previous.source,
        metadata: changes.metadataAfter ?? previous.metadata,
        size: changes.sizeAfter ?? previous.size,
      };
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
    const latest = versions.at(-1);
    if (latest)
      latest.summary.current =
        pageVersionStateRevision(latest.state) === pageVersionStateRevision(current);
    return versions.reverse();
  }

  find(
    pageId: string,
    versionId: string,
    current: PageVersionState,
    records: HistoryRecord[],
  ): StoredPageVersion {
    const found = this.versions(pageId, current, records).find(
      (version) => version.summary.versionId === versionId,
    );
    if (!found)
      throw new PptdError('TARGET_NOT_FOUND', `Unknown page version ${versionId}.`, { pageId });
    return found;
  }
}
