import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { isRecord } from './codec';
import { normalizeRelativePath } from './identity';
import {
  type HistorySummary,
  PptdError,
  type Revision,
  type TransactionRequest,
  type TransactionResult,
} from './types';

export interface FileChange {
  path: string;
  before: string | null;
  after: string | null;
  role: 'page' | 'metadata' | 'manifest';
  pageId?: string;
}

export interface HistoryRecord extends HistorySummary {
  files: FileChange[];
  request: TransactionRequest;
  requestHash: Revision;
  result: TransactionResult;
  /** Display context has its own integrity hash and never changes page content revisions. */
  pagePositions?: Record<string, { before: number | null; after: number | null }>;
  pagePositionsRevision?: Revision;
}

interface Receipt {
  requestHash: Revision;
  result: TransactionResult;
}
interface Journal {
  version: 1;
  root: string;
  record: HistoryRecord;
}

interface CachedHistory {
  signature: string;
  bytes: number;
  record: HistoryRecord;
  summary: HistorySummary;
}

function validateRecord(value: unknown): HistoryRecord {
  if (
    !isRecord(value) ||
    !Array.isArray(value.files) ||
    !isRecord(value.before) ||
    !isRecord(value.after) ||
    !isRecord(value.before.pages) ||
    !isRecord(value.after.pages) ||
    !isRecord(value.request) ||
    !isRecord(value.result) ||
    !isRecord(value.result.newRevisions) ||
    typeof value.operationId !== 'string' ||
    typeof value.requestId !== 'string' ||
    typeof value.timestamp !== 'string'
  ) {
    throw new PptdError(
      'RECOVERY_REQUIRED',
      'A history or journal record has an invalid structure.',
    );
  }
  const record = value as unknown as HistoryRecord;
  if (
    record.requestHash !== hashPayload(record.request) ||
    record.request.requestId !== record.requestId ||
    record.result.operationId !== record.operationId ||
    record.result.requestId !== record.requestId ||
    hashPayload(record.after) !== hashPayload(record.result.newRevisions)
  ) {
    throw new PptdError(
      'RECOVERY_REQUIRED',
      'A history or journal record failed its integrity check.',
    );
  }
  if (record.pagePositions !== undefined || record.pagePositionsRevision !== undefined) {
    const validPosition = (position: unknown) =>
      position === null ||
      (typeof position === 'number' && Number.isSafeInteger(position) && position > 0);
    if (
      !isRecord(record.pagePositions) ||
      Object.values(record.pagePositions).some(
        (positions) =>
          !isRecord(positions) ||
          !validPosition(positions.before) ||
          !validPosition(positions.after),
      ) ||
      record.pagePositionsRevision !== hashPayload(record.pagePositions)
    )
      throw new PptdError(
        'RECOVERY_REQUIRED',
        'A history or journal display context failed its integrity check.',
      );
  }
  for (const file of record.files) {
    if (
      !file ||
      typeof file.path !== 'string' ||
      (file.before !== null && typeof file.before !== 'string') ||
      (file.after !== null && typeof file.after !== 'string') ||
      !['page', 'manifest', 'metadata'].includes(file.role)
    ) {
      throw new PptdError('RECOVERY_REQUIRED', 'A history or journal file entry is invalid.');
    }
    const before =
      file.role === 'page'
        ? (record.before.pages[file.pageId ?? ''] ?? null)
        : record.before[file.role];
    const after =
      file.role === 'page'
        ? (record.after.pages[file.pageId ?? ''] ?? null)
        : record.after[file.role];
    if (
      (file.before === null ? null : hashBytes(file.before)) !== before ||
      (file.after === null ? null : hashBytes(file.after)) !== after
    ) {
      throw new PptdError(
        'RECOVERY_REQUIRED',
        `Recovery content does not match its recorded hash: ${file.path}`,
      );
    }
  }
  return record;
}

export function hashBytes(source: string | Uint8Array): Revision {
  return `sha256:${createHash('sha256').update(source).digest('hex')}`;
}

export function hashPayload(value: unknown): Revision {
  const stable = (item: unknown): unknown => {
    if (Array.isArray(item)) return item.map(stable);
    if (item && typeof item === 'object')
      return Object.fromEntries(
        Object.entries(item)
          .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
          .map(([key, child]) => [key, stable(child)]),
      );
    return item;
  };
  return hashBytes(JSON.stringify(stable(value)));
}

export async function readUtf8(file: string): Promise<string> {
  const bytes = await fs.readFile(file);
  try {
    new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
    return bytes.toString('utf8');
  } catch {
    throw new PptdError('INVALID_DOCUMENT', `File is not valid UTF-8: ${file}`);
  }
}

export async function readOptional(file: string): Promise<string | null> {
  try {
    return await readUtf8(file);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}

export async function canonicalProjectRoot(root: string): Promise<string> {
  const canonical = await fs.realpath(root);
  return process.platform === 'win32' ? canonical.toLowerCase() : canonical;
}

export function defaultStateDirectory(root: string): string {
  const base =
    process.platform === 'win32'
      ? process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local')
      : process.platform === 'darwin'
        ? path.join(os.homedir(), 'Library', 'Application Support')
        : process.env.XDG_STATE_HOME || path.join(os.homedir(), '.local', 'state');
  return path.join(base, 'HuandengEditor', hashBytes(root).slice(7, 39));
}

export async function resolveProjectPath(root: string, relative: string): Promise<string> {
  const normalized = normalizeRelativePath(relative);
  const target = path.resolve(root, normalized);
  let existing = target;
  while (true) {
    try {
      const actual = await fs.realpath(existing);
      const outside = path.relative(root, actual);
      if (outside === '..' || outside.startsWith(`..${path.sep}`) || path.isAbsolute(outside)) {
        throw new PptdError(
          'PATH_OUTSIDE_PROJECT',
          `A symlink or junction escapes the project: ${relative}`,
        );
      }
      return target;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      const parent = path.dirname(existing);
      if (parent === existing)
        throw new PptdError('PATH_OUTSIDE_PROJECT', `Cannot resolve project path: ${relative}`);
      existing = parent;
    }
  }
}

async function syncDirectory(directory: string): Promise<void> {
  if (process.platform === 'win32') return;
  const handle = await fs.open(directory, 'r');
  try {
    await handle.sync();
  } finally {
    await handle.close();
  }
}

export async function atomicWrite(
  file: string,
  source: string,
  options: { expected?: string | null } = {},
): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temp = path.join(
    path.dirname(file),
    `.${path.basename(file)}.huandeng-${randomUUID()}.tmp`,
  );
  let mode = 0o600;
  try {
    mode = (await fs.stat(file)).mode & 0o777;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  try {
    const handle = await fs.open(temp, 'wx', mode);
    try {
      await handle.writeFile(source, 'utf8');
      await handle.sync();
    } finally {
      await handle.close();
    }
    const renameStarted = performance.now();
    for (let attempt = 0; ; attempt++) {
      try {
        if (options.expected !== undefined) {
          const current = await readOptional(file);
          if (current === source) break;
          if (current !== options.expected)
            throw new PptdError(
              'RECOVERY_REQUIRED',
              `File changed while waiting to complete the save: ${file}`,
              { path: file },
            );
        }
        await fs.rename(temp, file);
        break;
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        const remaining = 2000 - (performance.now() - renameStarted);
        if (
          process.platform !== 'win32' ||
          !['EACCES', 'EPERM', 'EBUSY'].includes(code ?? '') ||
          remaining <= 0
        ) {
          if (error instanceof Error)
            Object.assign(error, {
              renameAttempts: attempt + 1,
              renameWaitMs: performance.now() - renameStarted,
            });
          throw error;
        }
        await new Promise((resolve) =>
          setTimeout(resolve, Math.min(25 * 2 ** attempt, 250, remaining)),
        );
      }
    }
    await syncDirectory(path.dirname(file));
  } finally {
    await fs.rm(temp, { force: true }).catch(() => undefined);
  }
}

function failureDetails(error: unknown): Record<string, unknown> {
  const issue = (error && typeof error === 'object' ? error : {}) as NodeJS.ErrnoException & {
    renameAttempts?: number;
    renameWaitMs?: number;
  };
  return {
    cause: String(error),
    ...(issue.code ? { causeCode: issue.code } : {}),
    ...(issue.syscall ? { syscall: issue.syscall } : {}),
    ...(issue.path ? { path: issue.path } : {}),
    ...(issue.renameAttempts ? { renameAttempts: issue.renameAttempts } : {}),
    ...(issue.renameWaitMs !== undefined ? { renameWaitMs: issue.renameWaitMs } : {}),
  };
}

export async function acquireWriterLock(
  root: string,
  stateDir: string,
): Promise<() => Promise<void>> {
  await fs.mkdir(stateDir, { recursive: true });
  const port = 20000 + (Number.parseInt(hashBytes(root).slice(7, 15), 16) % 40000);
  const server = net.createServer((socket) => socket.destroy());
  // The kernel owns this lease; process exit releases it even after an unclean shutdown.
  await new Promise<void>((resolve, reject) => {
    server.once('error', (error: NodeJS.ErrnoException) => {
      const causeCode = error.code ?? 'UNKNOWN';
      const occupied = causeCode === 'EADDRINUSE';
      reject(
        new PptdError(
          'WRITER_LOCKED',
          occupied
            ? `Another writer or local application is using this project's lock port ${port} (${causeCode}). Close the other writer or open read-only.`
            : `The operating system could not reserve this project's lock port ${port} (${causeCode}). Open read-only or use a copy in a different folder.`,
          {
            port,
            causeCode,
            reason: occupied ? 'lock-port-in-use' : 'lock-port-unavailable',
            cause: error.message,
          },
        ),
      );
    });
    server.listen({ host: '127.0.0.1', port, exclusive: true }, () => resolve());
  });
  server.unref();
  const nonce = randomUUID();
  const ownerPath = path.join(stateDir, 'writer.json');
  try {
    await atomicWrite(
      ownerPath,
      `${JSON.stringify({ pid: process.pid, nonce, lockPort: port, root })}\n`,
    );
  } catch (error) {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    throw error;
  }
  let closed = false;
  return async () => {
    if (closed) return;
    closed = true;
    try {
      const source = await readOptional(ownerPath);
      if (source !== null) {
        const owner = JSON.parse(source) as { nonce?: string };
        if (owner.nonce === nonce) await fs.rm(ownerPath, { force: true });
      }
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  };
}

export class Persistence {
  private readonly historyCache = new Map<string, CachedHistory>();
  private historyCacheBytes = 0;
  constructor(
    readonly root: string,
    readonly stateDir: string,
    private readonly afterWrite?: (index: number) => Promise<void>,
  ) {}

  private get journalPath(): string {
    return path.join(this.stateDir, 'pending.json');
  }
  private receiptPath(requestId: string): string {
    return path.join(this.stateDir, 'receipts', `${hashBytes(requestId).slice(7)}.json`);
  }
  private historyPath(operationId: string): string {
    return path.join(this.stateDir, 'history', `${hashBytes(operationId).slice(7)}.json`);
  }

  async receipt(requestId: string, requestHash: Revision): Promise<TransactionResult | null> {
    const source = await readOptional(this.receiptPath(requestId));
    if (source === null) return null;
    let receipt: Receipt;
    try {
      receipt = JSON.parse(source) as Receipt;
    } catch {
      throw new PptdError('RECOVERY_REQUIRED', 'The persisted request receipt is corrupt.');
    }
    if (
      !isRecord(receipt) ||
      !isRecord(receipt.result) ||
      receipt.result.ok !== true ||
      receipt.result.requestId !== requestId ||
      typeof receipt.result.operationId !== 'string'
    ) {
      throw new PptdError('RECOVERY_REQUIRED', 'The persisted request receipt is invalid.');
    }
    if (receipt.requestHash !== requestHash)
      throw new PptdError(
        'REQUEST_ID_REUSE',
        'This requestId was already used with another payload.',
      );
    return receipt.result;
  }

  async completedRequest(requestId: string): Promise<HistoryRecord | null> {
    const source = await readOptional(this.receiptPath(requestId));
    if (source === null) return null;
    let receipt: Receipt;
    try {
      receipt = JSON.parse(source) as Receipt;
    } catch {
      throw new PptdError('RECOVERY_REQUIRED', 'The persisted request receipt is corrupt.');
    }
    if (!isRecord(receipt) || typeof receipt.requestHash !== 'string')
      throw new PptdError('RECOVERY_REQUIRED', 'The persisted request receipt is invalid.');
    const result = await this.receipt(requestId, receipt.requestHash);
    if (!result) throw new PptdError('RECOVERY_REQUIRED', 'The completed receipt disappeared.');
    const record = await this.historyRecord(result.operationId);
    if (
      record.requestId !== requestId ||
      record.requestHash !== receipt.requestHash ||
      hashPayload(record.result) !== hashPayload(result)
    )
      throw new PptdError('RECOVERY_REQUIRED', 'The receipt does not match its saved operation.');
    return record;
  }

  async historyRecord(operationId: string): Promise<HistoryRecord> {
    try {
      return structuredClone((await this.cachedHistory(this.historyPath(operationId))).record);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT')
        throw new PptdError('TARGET_NOT_FOUND', `Unknown operation ${operationId}.`);
      throw new PptdError('RECOVERY_REQUIRED', `Corrupt history record ${operationId}.`);
    }
  }

  private async cachedHistory(file: string): Promise<CachedHistory> {
    const signature = async () => {
      const stats = await fs.stat(file, { bigint: true });
      if (!stats.isFile()) throw new Error('History is not a regular file.');
      return [stats.dev, stats.ino, stats.size, stats.mtimeNs, stats.ctimeNs].join('/');
    };
    const before = await signature();
    const cached = this.historyCache.get(file);
    if (cached?.signature === before) {
      this.historyCache.delete(file);
      this.historyCache.set(file, cached);
      return cached;
    }
    const source = await readUtf8(file);
    const record = validateRecord(JSON.parse(source));
    if ((await signature()) !== before) throw new Error('History changed while being read.');
    const {
      files: _files,
      request: _request,
      requestHash: _hash,
      result: _result,
      ...summary
    } = record;
    const entry = { signature: before, bytes: Buffer.byteLength(source), record, summary };
    const replaced = this.historyCache.get(file);
    if (replaced) this.historyCacheBytes -= replaced.bytes;
    this.historyCache.delete(file);
    this.historyCache.set(file, entry);
    this.historyCacheBytes += entry.bytes;
    while (this.historyCache.size > 1024 || this.historyCacheBytes > 32 * 1024 * 1024) {
      const first = this.historyCache.entries().next().value;
      if (!first) break;
      this.historyCache.delete(first[0]);
      this.historyCacheBytes -= first[1].bytes;
    }
    return entry;
  }

  private async historyEntries(): Promise<CachedHistory[]> {
    let files: string[];
    try {
      files = await fs.readdir(path.join(this.stateDir, 'history'));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw error;
    }
    const candidates = files.filter((file) => file.endsWith('.json'));
    const validPaths = new Set(candidates.map((file) => path.join(this.stateDir, 'history', file)));
    for (const [file, entry] of this.historyCache)
      if (!validPaths.has(file)) {
        this.historyCache.delete(file);
        this.historyCacheBytes -= entry.bytes;
      }
    const records = new Array<CachedHistory>(candidates.length);
    let cursor = 0;
    await Promise.all(
      Array.from({ length: Math.min(8, candidates.length) }, async () => {
        while (cursor < candidates.length) {
          const index = cursor++;
          const file = candidates[index];
          try {
            records[index] = await this.cachedHistory(path.join(this.stateDir, 'history', file));
          } catch {
            throw new PptdError(
              'RECOVERY_REQUIRED',
              `Corrupt history file ${file}; subsequent history has been preserved.`,
            );
          }
        }
      }),
    );
    return records.sort(
      (a, b) =>
        a.summary.timestamp.localeCompare(b.summary.timestamp) ||
        a.summary.operationId.localeCompare(b.summary.operationId),
    );
  }

  async history(): Promise<HistoryRecord[]> {
    return structuredClone((await this.historyEntries()).map((entry) => entry.record));
  }

  async historySummaries(
    options: { offset?: number; limit?: number } = {},
  ): Promise<HistorySummary[]> {
    const { offset = 0, limit } = options;
    if (
      !Number.isSafeInteger(offset) ||
      offset < 0 ||
      (limit !== undefined && (!Number.isSafeInteger(limit) || limit < 1 || limit > 1000))
    )
      throw new PptdError('INVALID_REQUEST', 'History offset and limit must be bounded integers.');
    const entries = (await this.historyEntries()).filter((entry) => !entry.record.result.noOp);
    return structuredClone(
      entries
        .slice(offset, limit === undefined ? undefined : offset + limit)
        .map((entry) => entry.summary),
    );
  }

  private async finish(journal: Journal): Promise<void> {
    const record = journal.record;
    const historyPath = this.historyPath(record.operationId);
    const existing = await readOptional(historyPath);
    if (existing === null) await atomicWrite(historyPath, `${JSON.stringify(record)}\n`);
    else if (hashPayload(JSON.parse(existing)) !== hashPayload(record))
      throw new PptdError('RECOVERY_REQUIRED', 'History conflicts with the pending journal.');
    const receipt: Receipt = { requestHash: record.requestHash, result: record.result };
    await atomicWrite(this.receiptPath(record.requestId), `${JSON.stringify(receipt)}\n`);
    await fs.rm(this.journalPath, { force: true });
    await syncDirectory(this.stateDir);
  }

  private async install(journal: Journal, recovering: boolean): Promise<void> {
    for (let i = 0; i < journal.record.files.length; i++) {
      const change = journal.record.files[i];
      const file = await resolveProjectPath(this.root, change.path);
      const current = await readOptional(file);
      if (current === change.after) continue;
      if (current !== change.before)
        throw new PptdError(
          'RECOVERY_REQUIRED',
          `File changed outside the pending transaction: ${change.path}`,
          { path: change.path },
        );
      if (change.after === null) {
        await fs.rm(file, { force: true });
        await syncDirectory(path.dirname(file));
      } else await atomicWrite(file, change.after, { expected: change.before });
      if (!recovering) await this.afterWrite?.(i);
      if ((await readOptional(file)) !== change.after)
        throw new PptdError('PENDING_RECOVERY', `Could not verify saved file ${change.path}.`);
    }
    for (const change of journal.record.files) {
      if ((await readOptional(await resolveProjectPath(this.root, change.path))) !== change.after)
        throw new PptdError(
          'RECOVERY_REQUIRED',
          `File changed before the transaction could be acknowledged: ${change.path}`,
          { path: change.path },
        );
    }
    await this.finish(journal);
  }

  async recover(): Promise<HistoryRecord | null> {
    const source = await readOptional(this.journalPath);
    if (source === null) return null;
    let journal: Journal;
    try {
      journal = JSON.parse(source) as Journal;
    } catch {
      throw new PptdError('RECOVERY_REQUIRED', 'The recovery journal is not valid JSON.');
    }
    if (
      journal.version !== 1 ||
      journal.root !== this.root ||
      !Array.isArray(journal.record?.files)
    )
      throw new PptdError('RECOVERY_REQUIRED', 'The recovery journal does not match this project.');
    journal.record = validateRecord(journal.record);
    try {
      const existingReceipt = await this.receipt(
        journal.record.requestId,
        journal.record.requestHash,
      );
      if (existingReceipt) {
        if (hashPayload(existingReceipt) !== hashPayload(journal.record.result))
          throw new PptdError('RECOVERY_REQUIRED', 'The receipt conflicts with the pending save.');
        await fs.rm(this.journalPath, { force: true });
        return journal.record;
      }
      for (const change of journal.record.files) {
        const current = await readOptional(await resolveProjectPath(this.root, change.path));
        if (current !== change.before && current !== change.after)
          throw new PptdError(
            'RECOVERY_REQUIRED',
            `Recovery would overwrite another writer's change: ${change.path}`,
            { path: change.path },
          );
      }
      await this.install(journal, true);
      return journal.record;
    } catch (error) {
      if (error instanceof PptdError) throw error;
      throw new PptdError(
        'PENDING_RECOVERY',
        'The pending save could not finish. Release any file lock, then recover the pending save.',
        { operationId: journal.record.operationId, ...failureDetails(error) },
      );
    }
  }

  async commit(record: HistoryRecord, beforeJournal?: () => Promise<void>): Promise<void> {
    validateRecord(record);
    if ((await readOptional(this.journalPath)) !== null)
      throw new PptdError(
        'PENDING_RECOVERY',
        'A previous transaction needs recovery before editing can continue.',
      );
    for (const change of record.files) {
      const current = await readOptional(await resolveProjectPath(this.root, change.path));
      if (current !== change.before)
        throw new PptdError('REVISION_CONFLICT', `File changed before save: ${change.path}`, {
          path: change.path,
          currentRevision: current === null ? null : hashBytes(current),
        });
    }
    if (beforeJournal) await beforeJournal();
    const journal: Journal = { version: 1, root: this.root, record };
    try {
      await atomicWrite(this.journalPath, `${JSON.stringify(journal)}\n`);
    } catch (error) {
      const accepted = await readOptional(this.journalPath).catch(() => null);
      throw new PptdError(
        accepted === null ? 'SAVE_FAILED' : 'PENDING_RECOVERY',
        accepted === null
          ? 'The transaction could not be journaled; document files were not written.'
          : 'The journal exists but its durability could not be confirmed. Recover the pending save.',
        failureDetails(error),
      );
    }
    try {
      await this.install(journal, false);
    } catch (error) {
      if (error instanceof PptdError && error.code === 'RECOVERY_REQUIRED') throw error;
      throw new PptdError(
        'PENDING_RECOVERY',
        'The transaction was journaled but could not finish. Recover the pending save to continue.',
        { operationId: record.operationId, ...failureDetails(error) },
      );
    }
  }
}
