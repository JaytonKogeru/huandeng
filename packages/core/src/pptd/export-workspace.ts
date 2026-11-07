import { randomUUID } from 'node:crypto';
import { constants, createReadStream } from 'node:fs';
import fs from 'node:fs/promises';
import type { ServerResponse } from 'node:http';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { runtimeRoot } from './client';
import { assetSources, mimeType, readProjectAsset } from './export-environment';
import { hashBytes } from './persistence';
import { type DeckSnapshot, PptdError } from './types';
import { assertVideoAsset } from './video-encoder';
import type { ExportJobStatus, ExportResult } from './video-plan';

export interface ExportWork {
  id: string;
  directory: string;
  snapshot?: DeckSnapshot;
  assets: Map<string, string>;
  status: ExportJobStatus;
  abort: AbortController;
  report?: unknown;
  outputFile?: string;
  fileName?: string;
  publishing?: boolean;
  cleanupPending?: boolean;
  readers: number;
  settled?: Promise<void>;
}

export class ExportWorkspace {
  private jobs = new Map<string, ExportWork>();
  private activeId: string | null = null;
  private closed = false;
  private transfers = new Set<{ stop: () => void; done: Promise<void> }>();
  private timer: ReturnType<typeof setInterval>;

  constructor(
    private root: string,
    private ttlMs = 15 * 60 * 1000,
  ) {
    this.timer = setInterval(
      () => {
        void this.prune().catch(() => {});
      },
      Math.min(ttlMs, 60000),
    );
    this.timer.unref();
  }

  async begin(snapshot: DeckSnapshot, format: string): Promise<ExportWork> {
    if (this.closed) throw new PptdError('INVALID_REQUEST', '项目正在关闭。');
    if (this.activeId)
      throw new PptdError('INVALID_REQUEST', '已有导出任务正在进行，请等待或取消后再试。');
    if ([...this.jobs.values()].filter((job) => job.cleanupPending).length >= 8)
      throw new PptdError(
        'INVALID_REQUEST',
        '之前的导出临时文件仍被其他程序占用。请关闭占用文件的软件，稍后重试；编辑器会自动重试清理。',
      );
    if (!snapshot.pages.length || snapshot.diagnostics.some((item) => item.severity === 'error'))
      throw new PptdError('INVALID_DOCUMENT', '请先解决文档诊断，并确保有可导出的页面。');
    const id = randomUUID();
    this.activeId = id;
    const directory = path.join(runtimeRoot(), 'export-jobs', id);
    const job: ExportWork = {
      id,
      directory,
      snapshot,
      assets: new Map(),
      abort: new AbortController(),
      readers: 0,
      status: {
        id,
        format,
        state: 'preparing',
        completedFrames: 0,
        totalFrames: 0,
        createdAt: Date.now(),
      },
    };
    this.jobs.set(id, job);
    try {
      await fs.mkdir(path.join(directory, 'assets'), { recursive: true });
      await fs.writeFile(path.join(directory, 'snapshot.json'), JSON.stringify(snapshot));
      if (this.closed) throw new Error('项目正在关闭。');
      return job;
    } catch (error) {
      await this.finish(job, error);
      throw error;
    }
  }

  async freezeAssets(job: ExportWork): Promise<void> {
    const snapshot = job.snapshot;
    if (!snapshot) throw new Error('Export working snapshot was released.');
    const sources = assetSources(
      snapshot.pages.map((page) => ({
        data: page.data,
        theme: page.metadata.themeOverride ?? snapshot.manifest.theme,
      })),
    );
    for (const source of sources) {
      job.abort.signal.throwIfAborted();
      const bytes = await readProjectAsset(this.root, source);
      const revision = hashBytes(bytes);
      if (
        snapshot.pages.some(
          (page) =>
            Object.hasOwn(page.assetRevisions ?? {}, source) &&
            page.assetRevisions?.[source] !== revision,
        )
      )
        throw new PptdError(
          'REVISION_CONFLICT',
          `素材已改变，请重新开始导出：${source.slice(0, 180)}`,
        );
      if (job.status.format === 'mp4') assertVideoAsset(source, bytes);
      const file = path.join(job.directory, 'assets', `${job.assets.size}`);
      await fs.writeFile(file, bytes);
      job.assets.set(source, file);
    }
  }

  status(id: string): ExportJobStatus {
    const job = this.jobs.get(id);
    if (!job || (job.status.finishedAt && Date.now() - job.status.finishedAt >= this.ttlMs))
      throw new PptdError(
        'TARGET_NOT_FOUND',
        '导出任务已过期；已保存的成品仍保留在 Exports 目录。',
      );
    return structuredClone(job.status);
  }

  cancel(id: string): ExportJobStatus {
    const status = this.status(id);
    const job = this.jobs.get(id);
    if (job && !job.status.finishedAt && !job.publishing) job.abort.abort();
    return status;
  }

  async publish(
    job: ExportWork,
    fileName: string,
    writeToProject: boolean,
    report: unknown,
  ): Promise<ExportResult> {
    job.abort.signal.throwIfAborted();
    if (!job.outputFile) throw new Error('Export produced no artifact.');
    const safeName =
      fileName
        .replace(/[<>:"/\\|?*\p{Cc}]/gu, '_')
        .replace(/[. ]+$/g, '')
        .slice(0, 160) || `export.${job.status.format}`;
    const extension = `.${job.status.format}`;
    let stem = safeName.endsWith(extension) ? safeName.slice(0, -extension.length) : safeName;
    if (/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/i.test(stem)) stem = `export-${stem}`;
    while (Buffer.byteLength(stem + extension) > 200) stem = Array.from(stem).slice(0, -1).join('');
    job.fileName = `${stem}${extension}`;
    job.report = report;
    const expectedRoot = await fs.realpath(writeToProject ? this.root : runtimeRoot());
    const deckId = job.snapshot?.deckId ?? 'preview';
    const safeId = /^[a-z0-9_-]{1,128}$/i.test(deckId) ? deckId : hashBytes(deckId).slice(7);
    let resolved = expectedRoot;
    for (const part of writeToProject ? ['Exports'] : ['exports', safeId]) {
      const next = path.join(resolved, part);
      await fs.mkdir(next).catch((error: NodeJS.ErrnoException) => {
        if (error.code !== 'EEXIST') throw error;
      });
      resolved = await fs.realpath(next);
      const relative = path.relative(expectedRoot, resolved);
      if (relative.startsWith('..') || path.isAbsolute(relative))
        throw new PptdError('PATH_OUTSIDE_PROJECT', '导出目录指向项目之外，无法写入。');
    }
    const destination = path.join(resolved, job.fileName);
    const temporary = `${destination}.tmp-${job.id}`;
    const reportTemporary = `${destination}.report.json.tmp-${job.id}`;
    const warnings: string[] = [];
    try {
      await fs.copyFile(job.outputFile, temporary, constants.COPYFILE_EXCL);
      await fs.writeFile(reportTemporary, `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx' });
      job.abort.signal.throwIfAborted();
      // Only the final rename commits publication. A cancellation during staging keeps the old file.
      job.publishing = true;
      await fs.rename(temporary, destination);
      await fs.rename(reportTemporary, `${destination}.report.json`).catch(() => {
        warnings.push(
          '成品已保存，但导出报告文件无法更新。请下载本次报告；目录中的旧报告可能对应前一次导出。',
        );
      });
    } finally {
      await fs.rm(temporary, { force: true }).catch(() => {});
      await fs.rm(reportTemporary, { force: true }).catch(() => {});
    }
    const result = {
      url: `/__pptd/exports/${job.id}/download`,
      reportUrl: `/__pptd/exports/${job.id}/report`,
      fileName: job.fileName,
      file: destination,
      report,
      ...(warnings.length ? { warnings } : {}),
    };
    job.status.result = result;
    job.status.state = 'completed';
    return result;
  }

  async finish(job: ExportWork, error?: unknown): Promise<void> {
    job.snapshot = undefined;
    job.assets.clear();
    if (error !== undefined && job.status.state !== 'completed') {
      job.status.state = job.abort.signal.aborted ? 'cancelled' : 'failed';
      job.status.error = job.abort.signal.aborted
        ? '已取消导出。'
        : error instanceof Error
          ? error.message
          : String(error);
    }
    job.status.finishedAt ??= Date.now();
    if (this.activeId === job.id) this.activeId = null;
    if (job.status.state !== 'completed') {
      job.outputFile = undefined;
      job.report = undefined;
    }
    await this.cleanup(job);
    await this.prune();
  }

  private async cleanup(job: ExportWork, all = false): Promise<boolean> {
    const targets =
      all || job.status.state !== 'completed'
        ? [job.directory]
        : [path.join(job.directory, 'assets'), path.join(job.directory, 'snapshot.json')];
    const outcomes = await Promise.allSettled(
      targets.map((file) =>
        fs.rm(file, { recursive: true, force: true, maxRetries: 2, retryDelay: 50 }),
      ),
    );
    job.cleanupPending = outcomes.some((outcome) => outcome.status === 'rejected');
    if (job.cleanupPending && job.status.result) {
      const warning = '成品已保存，部分临时文件仍被占用；编辑器会自动重试清理。';
      job.status.result.warnings ??= [];
      const warnings = job.status.result.warnings;
      if (!warnings.includes(warning)) warnings.push(warning);
    }
    return !job.cleanupPending;
  }

  async respond(id: string, kind: string, params: URLSearchParams, res: ServerResponse) {
    let job: ExportWork | undefined;
    try {
      this.status(id);
      job = this.jobs.get(id);
    } catch {}
    if (!job) {
      res.statusCode = 404;
      res.setHeader('content-type', 'application/json');
      return res.end(
        JSON.stringify({
          error: {
            code: 'TARGET_NOT_FOUND',
            message: '导出任务已过期；已保存的成品仍保留在 Exports 目录。',
          },
        }),
      );
    }
    if (kind === 'status') {
      res.setHeader('content-type', 'application/json');
      return res.end(JSON.stringify(job.status));
    }
    if (kind === 'report' && job.report) {
      res.setHeader('content-type', 'application/json');
      return res.end(JSON.stringify(job.report, null, 2));
    }
    let file: string | undefined;
    if (kind === 'snapshot' && job.snapshot) {
      file = path.join(job.directory, 'snapshot.json');
      res.setHeader('content-type', 'application/json');
    }
    if (kind === 'asset') {
      const source = params.get('path') ?? '';
      file = job.assets.get(source);
      res.setHeader('content-type', mimeType(source));
    }
    if (kind === 'download' && job.status.state === 'completed') {
      file = job.outputFile;
      res.setHeader('content-type', mimeType(job.fileName ?? ''));
      res.setHeader(
        'content-disposition',
        `attachment; filename*=UTF-8''${encodeURIComponent(job.fileName ?? 'export')}`,
      );
    }
    if (!file) {
      res.statusCode = 404;
      return res.end('Export not ready.');
    }
    job.readers++;
    const stream = createReadStream(file);
    const done = pipeline(stream, res).catch((error: unknown) => {
      if (!res.destroyed) res.destroy(error as Error);
    });
    const transfer = { stop: () => stream.destroy(), done };
    this.transfers.add(transfer);
    try {
      await done;
    } finally {
      this.transfers.delete(transfer);
      job.readers--;
    }
  }

  async prune() {
    const completed = [...this.jobs.values()]
      .filter((job) => job.status.finishedAt)
      .sort((a, b) => (b.status.finishedAt ?? 0) - (a.status.finishedAt ?? 0));
    for (const [index, job] of completed.entries()) {
      if (job.readers) continue;
      if (index < 8 && Date.now() - (job.status.finishedAt ?? 0) < this.ttlMs) {
        if (job.cleanupPending) await this.cleanup(job);
      } else if (await this.cleanup(job, true)) this.jobs.delete(job.id);
    }
  }

  async dispose() {
    this.closed = true;
    clearInterval(this.timer);
    for (const job of this.jobs.values()) if (!job.publishing) job.abort.abort();
    await Promise.allSettled(
      [...this.jobs.values()].flatMap((job) => (job.settled ? [job.settled] : [])),
    );
    for (const transfer of this.transfers) transfer.stop();
    await Promise.all([...this.transfers].map((transfer) => transfer.done));
    const cleanupResults = await Promise.all(
      [...this.jobs.values()].map((job) => this.cleanup(job, true)),
    );
    if (cleanupResults.includes(false))
      console.warn('[HUANDENG] Some export temporary files remain locked after closing.');
    this.jobs.clear();
  }
}
