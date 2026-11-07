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

export async function atomicWrite(file: string, source: string): Promise<void> {
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
    for (let attempt = 0; ; attempt++) {
      try {
        await fs.rename(temp, file);
        break;
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        if (
          process.platform !== 'win32' ||
          !['EACCES', 'EPERM', 'EBUSY'].includes(code ?? '') ||
          attempt >= 3
        )
          throw error;
        await new Promise((resolve) => setTimeout(resolve, 25 * (attempt + 1)));
      }
    }
    await syncDirectory(path.dirname(file));
  } finally {
    await fs.rm(temp, { force: true }).catch(() => undefined);
  }
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

  async historyRecord(operationId: string): Promise<HistoryRecord> {
    const source = await readOptional(this.historyPath(operationId));
    if (source === null)
      throw new PptdError('TARGET_NOT_FOUND', `Unknown operation ${operationId}.`);
    try {
      return validateRecord(JSON.parse(source));
    } catch {
      throw new PptdError('RECOVERY_REQUIRED', `Corrupt history record ${operationId}.`);
    }
  }

  async history(): Promise<HistoryRecord[]> {
    let files: string[];
    try {
      files = await fs.readdir(path.join(this.stateDir, 'history'));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw error;
    }
    const records = await Promise.all(
      files
        .filter((file) => file.endsWith('.json'))
        .map(async (file) => {
          try {
            return validateRecord(
              JSON.parse(await readUtf8(path.join(this.stateDir, 'history', file))),
            );
          } catch {
            throw new PptdError(
              'RECOVERY_REQUIRED',
              `Corrupt history file ${file}; subsequent history has been preserved.`,
            );
          }
        }),
    );
    return records.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
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
      } else await atomicWrite(file, change.after);
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

  async recover(): Promise<void> {
    const source = await readOptional(this.journalPath);
    if (source === null) return;
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
    const existingReceipt = await this.receipt(
      journal.record.requestId,
      journal.record.requestHash,
    );
    if (existingReceipt) {
      await fs.rm(this.journalPath, { force: true });
      return;
    }
    journal.record = validateRecord(journal.record);
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
  }

  async commit(record: HistoryRecord): Promise<void> {
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
    const journal: Journal = { version: 1, root: this.root, record };
    try {
      await atomicWrite(this.journalPath, `${JSON.stringify(journal)}\n`);
    } catch (error) {
      const accepted = await readOptional(this.journalPath).catch(() => null);
      throw new PptdError(
        accepted === null ? 'SAVE_FAILED' : 'PENDING_RECOVERY',
        accepted === null
          ? 'The transaction could not be journaled; document files were not written.'
          : 'The journal exists but its durability could not be confirmed. Reopen to recover.',
        { cause: String(error) },
      );
    }
    try {
      await this.install(journal, false);
    } catch (error) {
      if (error instanceof PptdError && error.code === 'RECOVERY_REQUIRED') throw error;
      throw new PptdError(
        'PENDING_RECOVERY',
        'The transaction was journaled but could not finish. Reopen the project to recover.',
        { operationId: record.operationId, cause: String(error) },
      );
    }
  }
}
