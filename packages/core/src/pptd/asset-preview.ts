import { type ChildProcess, spawn } from 'node:child_process';
import { createReadStream } from 'node:fs';
import fs from 'node:fs/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';
import path from 'node:path';
import { runtimeRoot } from './client';
import { mimeType, readProjectAsset } from './export-environment';
import { imageDimensions, imageFormat } from './export-images';
import { hashBytes } from './persistence';
import { PptdError, type Revision } from './types';

interface PreviewFile {
  key: string;
  directory: string;
  file: string;
  bytes: number;
  etag: string;
  contentType: string;
  sourceRevision: Revision;
  mode: 'derived' | 'original';
  reason: string;
  pins: number;
  discarded?: boolean;
}

interface PendingPreview {
  users: number;
  entry?: PreviewFile;
  promise: Promise<PreviewFile | undefined>;
}

interface WaitingWork {
  preview: boolean;
  start: () => void;
  reject: (error: Error) => void;
  overload: () => void;
}

export interface AssetPreviewOptions {
  /** false deliberately exercises the original-image fallback without probing the host. */
  encoder?: string | false;
  directory?: string;
  maxEntries?: number;
  maxBytes?: number;
  maxQueued?: number;
  timeoutMs?: number;
}

const CONTENT_REVISION = /^sha256:[a-f\d]{64}$/;
const MAX_PIXELS = 32 * 1024 * 1024;

function requestRevision(params: URLSearchParams): Revision | undefined {
  const value = params.get('revision');
  if (value === null) return;
  if (value === 'missing') throw new PptdError('TARGET_NOT_FOUND', 'This asset is unavailable.');
  if (!CONTENT_REVISION.test(value))
    throw new PptdError('INVALID_REQUEST', 'Asset revision must be its complete content SHA-256.');
  return value as Revision;
}

function sameEtag(value: string | undefined, etag: string): boolean {
  return !!value?.split(',').some((item) => ['*', etag, `W/${etag}`].includes(item.trim()));
}

/** Session-owned disk previews. Full original buffers are read only inside two occupied slots. */
export class AssetPreviewManager {
  private readonly abort = new AbortController();
  private readonly cache = new Map<string, PreviewFile>();
  private readonly pending = new Map<string, PendingPreview>();
  private readonly children = new Set<ChildProcess>();
  private readonly responses = new Set<ServerResponse>();
  private readonly operations = new Set<Promise<unknown>>();
  private readonly queue: WaitingWork[] = [];
  private readonly capacity = new Set<() => void>();
  private readonly cleanupPending = new Map<string, PreviewFile | undefined>();
  private directory?: Promise<string>;
  private encoder?: Promise<string | null>;
  private admission = Promise.resolve();
  private cleanup?: Promise<void>;
  private disposing?: Promise<void>;
  private closeCleanupPending = false;
  private active = 0;
  private originalBurst = 0;
  private cacheBytes = 0;
  private closed = false;
  private metrics = {
    sourceReads: 0,
    derived: 0,
    hits: 0,
    peakActive: 0,
    peakQueued: 0,
    cancelled: 0,
    overloaded: 0,
    preempted: 0,
    queueMs: 0,
    readMs: 0,
    previewMs: 0,
  };
  private readonly maxEntries: number;
  private readonly maxBytes: number;
  private readonly maxQueued: number;
  private readonly timeoutMs: number;

  constructor(
    private readonly root: string,
    private readonly options: AssetPreviewOptions = {},
  ) {
    this.maxEntries = options.maxEntries ?? 256;
    this.maxBytes = options.maxBytes ?? 128 * 1024 * 1024;
    this.maxQueued = options.maxQueued ?? 32;
    this.timeoutMs = options.timeoutMs ?? 15000;
  }

  usage() {
    return {
      ...this.metrics,
      active: this.active,
      queued: this.queue.length,
      pending: this.pending.size,
      entries: this.cache.size,
      bytes: this.cacheBytes,
      maxEntries: this.maxEntries,
      maxBytes: this.maxBytes,
      maxQueued: this.maxQueued,
      children: this.children.size,
      cleanupPending: this.cleanupPending.size,
      closeCleanupPending: this.closeCleanupPending,
    };
  }

  private async workspace(): Promise<string> {
    this.directory ??= (async () => {
      const parent = this.options.directory ?? path.join(runtimeRoot(), 'asset-previews');
      await fs.mkdir(parent, { recursive: true });
      return fs.mkdtemp(path.join(parent, `${hashBytes(this.root).slice(7, 23)}-`));
    })();
    return this.directory;
  }

  private next(): void {
    if (this.closed) return;
    const preview = this.queue.findIndex((work) => work.preview);
    const original = this.queue.findIndex((work) => !work.preview);
    const index = original >= 0 && (preview < 0 || this.originalBurst < 3) ? original : preview;
    if (index < 0) {
      this.originalBurst = 0;
      return;
    }
    this.originalBurst = index === preview ? 0 : this.originalBurst + 1;
    this.queue.splice(index, 1)[0].start();
  }

  private timing(res: ServerResponse, queue: number, read = 0, preview = 0): void {
    if (!res.headersSent && !res.destroyed)
      res.setHeader(
        'server-timing',
        `queue;dur=${queue.toFixed(2)}, read;dur=${read.toFixed(2)}, preview;dur=${preview.toFixed(2)}`,
      );
  }

  private schedule(
    task: (queueMs: number) => Promise<void>,
    preview: boolean,
    res: ServerResponse,
  ): Promise<void> {
    if (this.closed) return Promise.reject(new Error('Asset preview service is closed.'));
    if (res.destroyed || res.writableEnded) return Promise.resolve();
    const enqueued = performance.now();
    this.responses.add(res);
    const operation = new Promise<void>((resolve, reject) => {
      const detach = () => {
        res.off('close', cancel);
        res.off('error', cancel);
      };
      const waited = () => {
        const duration = performance.now() - enqueued;
        this.metrics.queueMs += duration;
        return duration;
      };
      const cancel = () => {
        const index = this.queue.indexOf(work);
        if (index < 0) return;
        this.queue.splice(index, 1);
        detach();
        waited();
        this.metrics.cancelled++;
        res.destroy();
        resolve();
      };
      const overload = (reason: 'full' | 'preempted') => {
        detach();
        this.metrics.overloaded++;
        if (reason === 'preempted') this.metrics.preempted++;
        this.timing(res, waited());
        res.statusCode = 503;
        res.setHeader('retry-after', '1');
        res.setHeader('x-huandeng-queue', reason);
        res.end('Asset request queue is full; retry later.');
        resolve();
      };
      const start = () => {
        detach();
        const queueMs = waited();
        if (res.destroyed || res.writableEnded) {
          this.metrics.cancelled++;
          resolve();
          this.next();
          return;
        }
        this.active++;
        this.metrics.peakActive = Math.max(this.metrics.peakActive, this.active);
        void task(queueMs)
          .then(resolve, reject)
          .finally(() => {
            this.active--;
            this.next();
          });
      };
      const work: WaitingWork = {
        preview,
        start,
        reject: (error) => {
          detach();
          waited();
          reject(error);
        },
        overload: () => overload('preempted'),
      };
      if (this.active < 2) start();
      else {
        if (this.queue.length >= this.maxQueued) {
          let victim = -1;
          if (!preview)
            for (let index = this.queue.length - 1; index >= 0; index--)
              if (this.queue[index].preview) {
                victim = index;
                break;
              }
          if (victim < 0) {
            overload('full');
            return;
          }
          this.queue.splice(victim, 1)[0].overload();
        }
        this.queue.push(work);
        res.once('close', cancel);
        res.once('error', cancel);
        this.metrics.peakQueued = Math.max(this.metrics.peakQueued, this.queue.length);
      }
    });
    this.operations.add(operation);
    void operation
      .finally(() => {
        this.operations.delete(operation);
        this.responses.delete(res);
      })
      .catch(() => {});
    return operation;
  }

  private run(executable: string, args: string[], capture = false): Promise<string> {
    this.abort.signal.throwIfAborted();
    return new Promise((resolve, reject) => {
      const child = spawn(executable, args, {
        windowsHide: true,
        stdio: ['ignore', capture ? 'pipe' : 'ignore', 'pipe'],
      });
      this.children.add(child);
      let stdout = '';
      let diagnostic = '';
      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        child.kill('SIGKILL');
      }, this.timeoutMs);
      const abort = () => {
        child.kill('SIGKILL');
      };
      this.abort.signal.addEventListener('abort', abort, { once: true });
      child.stdout?.on('data', (chunk: Buffer) => {
        stdout = `${stdout}${chunk.toString()}`.slice(-1024 * 1024);
      });
      child.stderr?.on('data', (chunk: Buffer) => {
        diagnostic = `${diagnostic}${chunk.toString()}`.slice(-8192);
      });
      child.once('error', reject);
      child.once('close', (code) => {
        clearTimeout(timer);
        this.children.delete(child);
        this.abort.signal.removeEventListener('abort', abort);
        if (this.closed) reject(new Error('Asset preview service is closed.'));
        else if (timedOut) reject(new Error('PREVIEW_TIMEOUT'));
        else if (code === 0) resolve(stdout);
        else reject(new Error(`Preview encoder failed (${code}): ${diagnostic}`));
      });
    });
  }

  private findEncoder(): Promise<string | null> {
    this.encoder ??= (async () => {
      if (this.options.encoder === false) return null;
      const binary = process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
      const configured = this.options.encoder || process.env.HUANDENG_FFMPEG;
      const candidates = configured
        ? [configured]
        : [path.join(path.dirname(process.execPath), 'tools', binary), binary];
      for (const candidate of candidates) {
        try {
          if (/\bpng\b/.test(await this.run(candidate, ['-hide_banner', '-encoders'], true)))
            return candidate;
        } catch {
          this.abort.signal.throwIfAborted();
        }
      }
      return null;
    })();
    return this.encoder;
  }

  private async removeDirectory(directory: string, entry?: PreviewFile): Promise<boolean> {
    try {
      await fs.rm(directory, { recursive: true, force: true, maxRetries: 2, retryDelay: 50 });
      // A failed or partially completed deletion still owns its budget until a retry succeeds.
      if (entry && this.cache.get(entry.key) === entry) {
        this.cache.delete(entry.key);
        this.cacheBytes -= entry.bytes;
      }
      this.cleanupPending.delete(directory);
      return true;
    } catch {
      this.cleanupPending.set(directory, entry);
      return false;
    }
  }

  private retryCleanup(): Promise<void> {
    if (!this.cleanupPending.size) return Promise.resolve();
    this.cleanup ??= (async () => {
      for (const [directory, entry] of [...this.cleanupPending])
        await this.removeDirectory(directory, entry);
    })().finally(() => {
      this.cleanup = undefined;
    });
    return this.cleanup;
  }

  private async makePreview(
    key: string,
    source: string,
    bytes: Buffer,
    sourceRevision: Revision,
    size: number,
  ): Promise<PreviewFile> {
    const directory = await fs.mkdtemp(path.join(await this.workspace(), 'work-'));
    let complete = false;
    try {
      const format = imageFormat(bytes);
      const dimensions = format ? imageDimensions(bytes, format) : null;
      const input = path.join(directory, `original.${format ?? 'bin'}`);
      await fs.writeFile(input, bytes);
      let file = input;
      let contentType = source.startsWith('data:')
        ? source.slice(5, source.indexOf(';'))
        : mimeType(source);
      let mode: PreviewFile['mode'] = 'original';
      let reason = 'unsupported-format';
      if ((format === 'png' || format === 'jpeg') && dimensions) {
        if (dimensions.width * dimensions.height > MAX_PIXELS) reason = 'pixel-limit';
        else if (Math.max(dimensions.width, dimensions.height) <= size) reason = 'already-small';
        else {
          const executable = await this.findEncoder();
          reason = 'encoder-unavailable';
          if (executable) {
            const output = path.join(directory, 'preview.png');
            try {
              await this.run(executable, [
                '-hide_banner',
                '-loglevel',
                'error',
                '-nostdin',
                '-i',
                input,
                '-vf',
                `scale=${size}:${size}:force_original_aspect_ratio=decrease`,
                '-frames:v',
                '1',
                '-threads',
                '1',
                '-update',
                '1',
                '-y',
                output,
              ]);
              const stat = await fs.stat(output);
              if (stat.size > 4 * 1024 * 1024) throw new Error('Preview exceeds output budget.');
              const rendered = await fs.readFile(output);
              const outputSize = imageDimensions(rendered, 'png');
              if (!outputSize || outputSize.width > size || outputSize.height > size)
                throw new Error('Preview dimensions are invalid.');
              await fs.rm(input, { force: true, maxRetries: 2, retryDelay: 50 });
              file = output;
              contentType = 'image/png';
              mode = 'derived';
              reason = 'scaled';
              this.metrics.derived++;
            } catch (error) {
              this.abort.signal.throwIfAborted();
              reason = String(error).includes('PREVIEW_TIMEOUT')
                ? 'encoder-timeout'
                : 'encoder-failed';
              await fs.rm(output, { force: true, maxRetries: 2, retryDelay: 50 });
            }
          }
        }
      }
      this.abort.signal.throwIfAborted();
      const stat = await fs.stat(file);
      const etag =
        mode === 'original' ? `"${sourceRevision}"` : `"${hashBytes(await fs.readFile(file))}"`;
      complete = true;
      return {
        key,
        directory,
        file,
        bytes: stat.size,
        etag,
        contentType,
        sourceRevision,
        mode,
        reason,
        pins: 0,
      };
    } finally {
      if (!complete) await this.removeDirectory(directory);
    }
  }

  private admit(entry: PreviewFile): Promise<void> {
    const operation = this.admission.then(() => this.admitExclusive(entry));
    this.admission = operation.then(
      () => undefined,
      () => undefined,
    );
    return operation;
  }

  private async admitExclusive(entry: PreviewFile): Promise<void> {
    if (entry.bytes > this.maxBytes) throw new Error('Preview exceeds the disk cache budget.');
    if (this.cleanupPending.size) throw new Error('Temporary preview files are still busy.');
    while (this.cache.size >= this.maxEntries || this.cacheBytes + entry.bytes > this.maxBytes) {
      this.abort.signal.throwIfAborted();
      const oldest = [...this.cache.values()].find((item) => item.pins === 0);
      if (oldest) {
        // Exclude it from new readers while deletion awaits the filesystem.
        oldest.discarded = true;
        if (!(await this.removeDirectory(oldest.directory, oldest)))
          throw new Error('Temporary preview files are still busy.');
      } else {
        await new Promise<void>((resolve) => this.capacity.add(resolve));
      }
    }
    this.abort.signal.throwIfAborted();
    this.cache.set(entry.key, entry);
    this.cacheBytes += entry.bytes;
  }

  private async preview(source: string, bytes: Buffer, revision: Revision, size: number) {
    const key = `${revision}:${size}:png-v1`;
    const cached = this.cache.get(key);
    if (cached && !cached.discarded) {
      cached.pins++;
      this.cache.delete(key);
      this.cache.set(key, cached);
      this.metrics.hits++;
      return cached;
    }
    const pending = this.pending.get(key);
    if (pending) {
      pending.users++;
      if (pending.entry) pending.entry.pins++;
      return pending.promise;
    }
    const work: PendingPreview = {
      users: 1,
      promise: this.retryCleanup()
        .then(async () => {
          // Stop allocating temporary directories if cleanup cannot make progress. Existing valid
          // hits and original requests still work; at most the two active slots can leave work dirs.
          if (this.cleanupPending.size || this.cache.get(key)?.discarded) return;
          this.abort.signal.throwIfAborted();
          const entry = await this.makePreview(key, source, bytes, revision, size);
          entry.pins = work.users;
          work.entry = entry;
          try {
            await this.admit(entry);
            return entry;
          } catch (error) {
            await this.removeDirectory(entry.directory, entry);
            throw error;
          }
        })
        .catch(() => {
          this.abort.signal.throwIfAborted();
          // Previews are an optimization; a full or unavailable temporary disk must not hide assets.
          return undefined;
        }),
    };
    this.pending.set(key, work);
    void work.promise.finally(() => this.pending.delete(key)).catch(() => {});
    return work.promise;
  }

  private release(entry: PreviewFile): void {
    entry.pins--;
    for (const resolve of this.capacity) resolve();
    this.capacity.clear();
  }

  async respond(
    params: URLSearchParams,
    preview: boolean,
    req: Pick<IncomingMessage, 'headers'>,
    res: ServerResponse,
  ): Promise<void> {
    const source = params.get('path');
    if (!source) throw new PptdError('INVALID_REQUEST', 'Asset path is required.');
    const expected = requestRevision(params);
    const size = Number(params.get('size') ?? 320);
    if (preview && ![320, 640].includes(size))
      throw new PptdError('INVALID_REQUEST', 'Preview size must be 320 or 640.');
    return this.schedule(
      async (queueMs) => {
        if (res.destroyed) return;
        let entry: PreviewFile | undefined;
        let readMs = 0;
        let previewMs = 0;
        try {
          this.abort.signal.throwIfAborted();
          this.metrics.sourceReads++;
          const readStarted = performance.now();
          const bytes = await readProjectAsset(this.root, source)
            .catch((error: unknown) => {
              if ((error as NodeJS.ErrnoException).code === 'ENOENT')
                throw new PptdError('TARGET_NOT_FOUND', 'This asset file is missing.');
              throw error;
            })
            .finally(() => {
              readMs = performance.now() - readStarted;
              this.metrics.readMs += readMs;
            });
          const revision = hashBytes(bytes);
          if (expected && expected !== revision)
            throw new PptdError(
              'REVISION_CONFLICT',
              'The asset changed; refresh its content version.',
            );
          if (preview && !res.destroyed) {
            const previewStarted = performance.now();
            try {
              entry = await this.preview(source, bytes, revision, size);
            } finally {
              previewMs = performance.now() - previewStarted;
              this.metrics.previewMs += previewMs;
            }
          }
          this.abort.signal.throwIfAborted();
          if (res.destroyed) return;
          this.timing(res, queueMs, readMs, previewMs);
          const etag = entry?.etag ?? `"${revision}"`;
          res.setHeader('cache-control', 'private, no-cache');
          res.setHeader('etag', etag);
          res.setHeader(
            'content-type',
            entry?.contentType ??
              (source.startsWith('data:')
                ? source.slice(5, source.indexOf(';'))
                : mimeType(source)),
          );
          res.setHeader('x-huandeng-source-revision', revision);
          res.setHeader('x-huandeng-preview', entry?.mode ?? 'original');
          res.setHeader(
            'x-huandeng-preview-reason',
            entry?.reason ?? (preview ? 'cache-unavailable' : 'original-request'),
          );
          if (sameEtag(req.headers['if-none-match'], etag)) {
            res.statusCode = 304;
            res.end();
            return;
          }
          res.setHeader('content-length', entry?.bytes ?? bytes.length);
          await new Promise<void>((resolve, reject) => {
            const stream = entry ? createReadStream(entry.file) : undefined;
            const finish = () => {
              res.off('finish', finish);
              res.off('close', finish);
              res.off('error', fail);
              res.off('timeout', timeout);
              res.setTimeout(0);
              stream?.destroy();
              resolve();
            };
            const fail = (error: Error) => {
              finish();
              reject(error);
            };
            const timeout = () => res.destroy(new Error('Asset response timed out.'));
            res.once('finish', finish);
            res.once('close', finish);
            res.once('error', fail);
            res.once('timeout', timeout);
            res.setTimeout(this.timeoutMs);
            if (stream) {
              stream.once('error', (error) => res.destroy(error));
              stream.pipe(res);
            } else res.end(bytes);
          });
        } finally {
          this.timing(res, queueMs, readMs, previewMs);
          if (entry) this.release(entry);
        }
      },
      preview,
      res,
    );
  }

  async dispose(): Promise<void> {
    if (this.disposing) return this.disposing;
    this.closed = true;
    this.abort.abort();
    for (const waiting of this.queue.splice(0))
      waiting.reject(new Error('Asset preview service is closed.'));
    for (const child of this.children) child.kill('SIGKILL');
    for (const response of this.responses) response.destroy();
    for (const resolve of this.capacity) resolve();
    this.capacity.clear();
    const operation = (async () => {
      await Promise.allSettled([...this.operations]);
      const directory = await this.directory?.catch(() => undefined);
      if (directory) {
        try {
          await fs.rm(directory, {
            recursive: true,
            force: true,
            maxRetries: 2,
            retryDelay: 50,
          });
        } catch (error) {
          this.closeCleanupPending = true;
          console.warn('Asset preview temporary files remain busy; cleanup can be retried.', {
            directory,
            error: error instanceof Error ? error.message : String(error),
          });
          return;
        }
      }
      this.cache.clear();
      this.cacheBytes = 0;
      this.cleanupPending.clear();
      this.directory = undefined;
      this.closeCleanupPending = false;
    })();
    this.disposing = operation;
    try {
      await operation;
    } finally {
      this.disposing = undefined;
    }
  }
}
