import fs from 'node:fs/promises';
import path from 'node:path';
import { isRecord, parsePage, patchSourceFields } from './codec';
import { type PageVersionState, VERSIONED_PAGE_METADATA } from './page-history';
import {
  atomicWrite,
  hashBytes,
  hashPayload,
  readOptional,
  resolveProjectPath,
} from './persistence';
import { type PageVersionSummary, PptdError, type Revision } from './types';

export interface CheckpointState extends PageVersionState {
  theme: Record<string, unknown>;
  assetRevisions: Record<string, Revision | null>;
}

export interface StoredCheckpoint {
  schemaVersion: 1;
  deckId: string;
  pageId: string;
  requestHash: Revision;
  stateRevision: Revision;
  /** Guards display context without treating a new Main position as new content. */
  contextRevision?: Revision;
  summary: PageVersionSummary;
  state: CheckpointState;
}

function archivedPath(source: string, revision: Revision): string {
  const extension = path.extname(source).toLowerCase();
  return `media/.huandeng-versions/${revision.slice(7)}${/^\.[a-z0-9]{1,8}$/.test(extension) ? extension : '.bin'}`;
}

function remap(value: unknown, references: Map<string, string>): unknown {
  if (typeof value === 'string') return references.get(value) ?? value;
  if (Array.isArray(value)) return value.map((item) => remap(item, references));
  if (isRecord(value))
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, remap(item, references)]),
    );
  return value;
}

function canonicalState(state: CheckpointState): CheckpointState {
  const references = new Map(
    Object.entries(state.assetRevisions)
      .filter((pair): pair is [string, Revision] => pair[1] !== null)
      .map(([source, revision]) => [source, archivedPath(source, revision)]),
  );
  const patches: Record<string, unknown> = {};
  const visit = (value: unknown, parts: string[]) => {
    if (typeof value === 'string') {
      const archived = references.get(value);
      if (archived && archived !== value) patches[parts.join('.')] = archived;
    } else if (Array.isArray(value))
      value.forEach((item, index) => {
        visit(item, [...parts, String(index)]);
      });
    else if (isRecord(value))
      for (const [key, item] of Object.entries(value)) visit(item, [...parts, key]);
  };
  visit(parsePage(state.source).value, []);
  return {
    source: patchSourceFields(state.source, [], patches),
    metadata: remap(state.metadata, references) as CheckpointState['metadata'],
    size: [...state.size],
    mainPosition: state.mainPosition,
    theme: remap(state.theme, references) as Record<string, unknown>,
    assetRevisions: Object.fromEntries(
      Object.entries(state.assetRevisions).map(([source, revision]) => [
        revision ? archivedPath(source, revision) : source,
        revision,
      ]),
    ),
  };
}

function stateRevision(state: CheckpointState): Revision {
  const canonical = canonicalState(state);
  return hashPayload({
    page: hashBytes(canonical.source),
    metadata: Object.fromEntries(
      VERSIONED_PAGE_METADATA.filter(
        (key) => key !== 'themeOverride' && Object.hasOwn(canonical.metadata, key),
      ).map((key) => [key, canonical.metadata[key]]),
    ),
    size: canonical.size,
    theme: canonical.theme,
    assets: canonical.assetRevisions,
  });
}

function fileName(pageId: string, versionId: string): string {
  if (!/^checkpoint:[a-f0-9]{32}$/.test(versionId))
    throw new PptdError('TARGET_NOT_FOUND', 'Invalid page checkpoint ID.');
  return `.huandeng/checkpoints/${hashBytes(pageId).slice(7, 39)}/${versionId.slice(11)}.json`;
}

function validate(value: unknown, deckId: string, pageId: string): StoredCheckpoint {
  if (
    !isRecord(value) ||
    value.schemaVersion !== 1 ||
    value.deckId !== deckId ||
    value.pageId !== pageId ||
    !isRecord(value.summary) ||
    value.summary.kind !== 'checkpoint' ||
    !isRecord(value.state) ||
    typeof value.state.source !== 'string' ||
    !isRecord(value.state.metadata) ||
    !isRecord(value.state.assetRevisions) ||
    !isRecord(value.state.theme) ||
    !Array.isArray(value.state.size) ||
    (value.state.mainPosition !== undefined &&
      !(
        typeof value.state.mainPosition === 'number' &&
        Number.isSafeInteger(value.state.mainPosition) &&
        value.state.mainPosition > 0
      ))
  )
    throw new PptdError('INVALID_DOCUMENT', 'Invalid saved page checkpoint.');
  const checkpoint = value as unknown as StoredCheckpoint;
  parsePage(checkpoint.state.source);
  if (checkpoint.stateRevision !== stateRevision(checkpoint.state))
    throw new PptdError('INVALID_DOCUMENT', 'Saved page checkpoint failed its integrity check.');
  if (
    checkpoint.contextRevision !== undefined &&
    checkpoint.contextRevision !==
      hashPayload({ mainPosition: checkpoint.state.mainPosition ?? null })
  )
    throw new PptdError(
      'INVALID_DOCUMENT',
      'Saved page checkpoint display context failed its integrity check.',
    );
  return checkpoint;
}

export class PageCheckpointArchive {
  constructor(
    private readonly root: string,
    private readonly readOnly: boolean,
  ) {}

  async list(
    deckId: string,
    pageId: string,
    current: CheckpointState,
  ): Promise<StoredCheckpoint[]> {
    const directory = await resolveProjectPath(
      this.root,
      `.huandeng/checkpoints/${hashBytes(pageId).slice(7, 39)}`,
    );
    let files: string[];
    try {
      files = await fs.readdir(directory);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw error;
    }
    const revision = stateRevision(current);
    const checkpoints = await Promise.all(
      files
        .filter((file) => /^[a-f0-9]{32}\.json$/.test(file))
        .map(async (file) => {
          const raw = await readOptional(
            await resolveProjectPath(
              this.root,
              path.relative(this.root, path.join(directory, file)),
            ),
          );
          if (raw === null) return null;
          const checkpoint = validate(JSON.parse(raw), deckId, pageId);
          checkpoint.summary.current = checkpoint.stateRevision === revision;
          return checkpoint;
        }),
    );
    return checkpoints
      .filter((item): item is StoredCheckpoint => item !== null)
      .sort((a, b) => b.summary.createdAt.localeCompare(a.summary.createdAt));
  }

  async find(deckId: string, pageId: string, versionId: string): Promise<StoredCheckpoint> {
    const raw = await readOptional(
      await resolveProjectPath(this.root, fileName(pageId, versionId)),
    );
    if (raw === null) throw new PptdError('TARGET_NOT_FOUND', 'Page checkpoint not found.');
    const checkpoint = validate(JSON.parse(raw), deckId, pageId);
    if (checkpoint.summary.versionId !== versionId)
      throw new PptdError(
        'INVALID_DOCUMENT',
        'Page checkpoint identity does not match its filename.',
      );
    for (const [source, revision] of Object.entries(checkpoint.state.assetRevisions)) {
      if (!revision || !/^media\/\.huandeng-versions\/[a-f0-9]{64}\.[a-z0-9]{1,8}$/.test(source))
        throw new PptdError(
          'INVALID_DOCUMENT',
          'Saved checkpoint contains an invalid asset reference.',
        );
      const bytes = await fs.readFile(await resolveProjectPath(this.root, source));
      if (hashBytes(bytes) !== revision)
        throw new PptdError(
          'INVALID_DOCUMENT',
          `Saved checkpoint asset is missing or changed: ${source}`,
        );
    }
    return checkpoint;
  }

  async create(input: {
    deckId: string;
    pageId: string;
    requestId: string;
    requestHash: Revision;
    label: string;
    actor: string;
    state: CheckpointState;
  }): Promise<StoredCheckpoint> {
    if (this.readOnly) throw new PptdError('READ_ONLY', 'This project is read-only.');
    const versionId = `checkpoint:${hashPayload([input.deckId, input.pageId, input.requestId]).slice(7, 39)}`;
    const file = await resolveProjectPath(this.root, fileName(input.pageId, versionId));
    const previous = await readOptional(file);
    if (previous !== null) {
      const saved = validate(JSON.parse(previous), input.deckId, input.pageId);
      if (saved.requestHash !== input.requestHash)
        throw new PptdError('REQUEST_ID_REUSE', 'Use a new request ID for a different checkpoint.');
      return saved;
    }
    const checkExternalMedia = (value: unknown) => {
      if (Array.isArray(value)) {
        for (const item of value) checkExternalMedia(item);
        return;
      }
      if (!isRecord(value)) return;
      for (const [key, item] of Object.entries(value)) {
        if (
          (key === 'src' ||
            (key === 'url' && (value.type === 'image' || value.elementType === 'image'))) &&
          typeof item === 'string' &&
          /^(?:https?:|blob:|\/\/)/i.test(item)
        )
          throw new PptdError(
            'INVALID_DOCUMENT',
            'Import externally linked media into the project before recording a portable page version.',
            { source: item },
          );
        if (item && typeof item === 'object') checkExternalMedia(item);
      }
    };
    checkExternalMedia(parsePage(input.state.source).value);
    checkExternalMedia(input.state.theme);
    for (const [source, revision] of Object.entries(input.state.assetRevisions)) {
      if (revision === null)
        throw new PptdError(
          'INVALID_DOCUMENT',
          `Cannot record a version with a missing asset: ${source}`,
        );
      const original = await resolveProjectPath(this.root, source);
      const stats = await fs.stat(original);
      if (!stats.isFile() || stats.size > 64 * 1024 * 1024)
        throw new PptdError(
          'INVALID_REQUEST',
          'A checkpoint asset must be a file smaller than 64 MiB.',
        );
      const bytes = await fs.readFile(original);
      if (hashBytes(bytes) !== revision)
        throw new PptdError(
          'REVISION_CONFLICT',
          `Asset changed while recording this page version: ${source}`,
        );
      const destination = await resolveProjectPath(this.root, archivedPath(source, revision));
      await fs.mkdir(path.dirname(destination), { recursive: true });
      try {
        await fs.writeFile(destination, bytes, { flag: 'wx' });
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
        if (hashBytes(await fs.readFile(destination)) !== revision)
          throw new PptdError('INVALID_DOCUMENT', 'An archived asset failed its integrity check.');
      }
    }
    const state = canonicalState(input.state);
    const saved: StoredCheckpoint = {
      schemaVersion: 1,
      deckId: input.deckId,
      pageId: input.pageId,
      requestHash: input.requestHash,
      stateRevision: stateRevision(state),
      contextRevision: hashPayload({ mainPosition: state.mainPosition ?? null }),
      summary: {
        versionId,
        pageId: input.pageId,
        createdAt: new Date().toISOString(),
        actor: input.actor,
        summary: input.label.trim(),
        pageRevision: hashBytes(state.source),
        current: true,
        kind: 'checkpoint',
      },
      state,
    };
    await atomicWrite(file, `${JSON.stringify(saved)}\n`);
    return saved;
  }
}
