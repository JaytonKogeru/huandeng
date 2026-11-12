import fs from 'node:fs/promises';
import type { ServerResponse } from 'node:http';
import path from 'node:path';
import type { Browser, Page } from 'playwright';
import { runtimeRoot } from './client.ts';
import { buildPptdPdf, buildPptdPptx, createExportReport } from './export.ts';
import { mimeType, openBrowser } from './export-environment.ts';
import { imageDimensions } from './export-images.ts';
import { ExportWorkspace } from './export-workspace.ts';
import { hasPageTransition } from './page-transition.ts';
import { visibleSnapshot } from './page-visibility.ts';
import {
  type ArchiveProgress,
  type ProjectArchiveCapture,
  projectArchiveReport,
  writeProjectZip,
} from './project-archive.ts';
import { type DeckSnapshot, PptdError } from './types.ts';
import { createVideoEncoder, findVideoEncoder, type VideoCapabilities } from './video-encoder.ts';
import { createVideoPlan, type VideoExportOptions, videoFrameTime } from './video-plan.ts';

export { mimeType, readProjectAsset } from './export-environment.ts';

export class ExportManager {
  private workspace: ExportWorkspace;
  private capability?: Promise<VideoCapabilities>;

  constructor(root: string) {
    this.workspace = new ExportWorkspace(root);
  }

  respond(id: string, kind: string, params: URLSearchParams, res: ServerResponse) {
    return this.workspace.respond(id, kind, params, res);
  }

  dispose() {
    return this.workspace.dispose();
  }

  cancel(id: string) {
    return this.workspace.cancel(id);
  }

  videoCapabilities() {
    this.capability ??= findVideoEncoder()
      .then(() => ({ available: true, formats: ['mp4'], message: 'H.264 视频编码器可用' }))
      .catch((error: Error) => ({ available: false, formats: [], message: error.message }));
    return this.capability;
  }

  async startProjectArchive(
    snapshot: DeckSnapshot,
    capture: (
      directory: string,
      signal: AbortSignal,
      onProgress: (progress: ArchiveProgress) => void,
      excludeRoots: string[],
    ) => Promise<ProjectArchiveCapture>,
  ) {
    const job = await this.workspace.begin(structuredClone(snapshot), 'zip');
    const progress = (value: ArchiveProgress) => {
      job.status.files = value;
    };
    job.settled = (async () => {
      let failure: unknown;
      try {
        const frozen = await capture(
          path.join(job.directory, 'assets', 'project'),
          job.abort.signal,
          progress,
          [runtimeRoot()],
        );
        job.snapshot = frozen.snapshot;
        job.status.state = 'encoding';
        job.status.files = {
          completedFiles: 0,
          totalFiles: frozen.files.length,
          completedBytes: 0,
          totalBytes: frozen.totalBytes,
        };
        job.outputFile = path.join(job.directory, 'artifact.zip');
        await writeProjectZip(frozen, job.outputFile, job.abort.signal, progress);
        await this.workspace.publish(
          job,
          `${path.basename(frozen.entry, path.extname(frozen.entry))}-project.zip`,
          frozen.snapshot.writable,
          projectArchiveReport(frozen),
        );
      } catch (error) {
        failure = error;
      } finally {
        await this.workspace.finish(job, failure);
      }
    })();
    return this.workspace.status(job.id);
  }

  async startVideo(
    snapshot: DeckSnapshot,
    options: VideoExportOptions & { serverUrl: string; writeToProject?: boolean },
  ) {
    const frozen = structuredClone(snapshot);
    const plan = createVideoPlan(frozen, options);
    frozen.pages = plan.segments.map((segment) => frozen.pages[segment.pageIndex]);
    for (const [index, segment] of plan.segments.entries()) segment.pageIndex = index;
    const job = await this.workspace.begin(frozen, 'mp4');
    job.status.plan = plan;
    job.status.totalFrames = plan.totalFrames;
    job.settled = (async () => {
      let browser: Browser | undefined;
      let encoder: ReturnType<typeof createVideoEncoder> | undefined;
      let failure: unknown;
      const abort = () => {
        void browser?.close().catch(() => {});
      };
      job.abort.signal.addEventListener('abort', abort, { once: true });
      try {
        const executable = await findVideoEncoder();
        job.abort.signal.throwIfAborted();
        await this.workspace.freezeAssets(job);
        browser = await openBrowser();
        job.abort.signal.throwIfAborted();
        const page = await browser.newPage({
          viewport: { width: plan.width, height: plan.height },
          deviceScaleFactor: 1,
        });
        await page.goto(
          `${options.serverUrl}/huandeng/export/${job.id}?mode=frames&width=${plan.width}&height=${plan.height}`,
          { waitUntil: 'domcontentloaded' },
        );
        await page.waitForFunction(
          () =>
            typeof window.__HUANDENG_EXPORT_SEEK__ === 'function' ||
            !!document.querySelector('[data-hd-export-error]'),
          undefined,
          { timeout: 45000 },
        );
        const initialErrors = await page.locator('[data-hd-export-error]').allTextContents();
        if (initialErrors.length) throw new Error(initialErrors.join('\n'));
        job.outputFile = path.join(job.directory, 'artifact.mp4');
        encoder = createVideoEncoder(executable, job.outputFile, plan.fps, job.abort.signal);
        job.status.state = 'rendering';
        for (const segment of plan.segments) {
          let previousTime = -1;
          let previousFrame: Buffer | undefined;
          for (let frame = 0; frame < segment.frameCount; frame++) {
            job.abort.signal.throwIfAborted();
            const timeMs = videoFrameTime(plan, segment, frame);
            if (!previousFrame || previousTime !== timeMs) {
              await page.evaluate(
                async ({ index, time }) => {
                  if (!window.__HUANDENG_EXPORT_SEEK__) throw new Error('视频渲染器尚未准备好。');
                  await window.__HUANDENG_EXPORT_SEEK__(index, time);
                },
                { index: segment.pageIndex, time: timeMs },
              );
              previousFrame = await page.screenshot({ type: 'png', animations: 'disabled' });
              previousTime = timeMs;
            }
            await encoder.write(previousFrame);
            job.status.completedFrames++;
          }
        }
        job.status.state = 'encoding';
        await encoder.finish();
        const base = path.basename(frozen.entry, path.extname(frozen.entry));
        const suffix =
          options.pageId || options.occurrenceId
            ? `-${frozen.pages[0].shortCode ?? 'page'}`
            : frozen.presentationId
              ? `-${frozen.presentationId.slice(0, 8)}`
              : '';
        const report = {
          format: 'mp4',
          codec: 'h264',
          audio: false,
          renderState: 'timeline',
          source: 'frozen-pptd',
          deckId: frozen.deckId,
          presentationId: frozen.presentationId,
          plan,
          diagnostics: [
            {
              severity: 'info',
              code: 'VIDEO_CUE_TIMING',
              message: `每个演示步骤额外停留 ${plan.cueHoldMs} 毫秒；静态页 ${plan.staticDurationMs} 毫秒；动画末帧 ${plan.endHoldMs} 毫秒。`,
            },
            ...frozen.pages
              .filter((item) => hasPageTransition(item.data))
              .map((item) => ({
                severity: 'warning',
                code: 'TRANSITION_NOT_EXPORTED',
                pageId: item.pageId,
                occurrenceId: item.occurrenceId,
                message: '页面转场用于 HUANDENG 现场放映，本次视频导出不包含转场。',
              })),
          ],
          pages: frozen.pages.map((item) => ({
            pageId: item.pageId,
            occurrenceId: item.occurrenceId,
            versionId: item.versionId,
            pageRevision: item.pageRevision,
            renderRevision: item.renderRevision,
          })),
        };
        await this.workspace.publish(
          job,
          `${base}${suffix}.mp4`,
          options.writeToProject ?? snapshot.writable,
          report,
        );
      } catch (error) {
        failure = error;
      } finally {
        job.abort.signal.removeEventListener('abort', abort);
        await encoder?.close();
        await browser?.close().catch(() => {});
        await this.workspace.finish(job, failure);
      }
    })().catch((error: unknown) => this.workspace.finish(job, error));
    return this.workspace.status(job.id);
  }

  async create(
    snapshot: DeckSnapshot,
    options: {
      format: 'pptx' | 'pdf' | 'png';
      pageId?: string;
      occurrenceId?: string;
      includeHidden?: boolean;
      writeToProject?: boolean;
      serverUrl: string;
    },
  ) {
    const frozen = structuredClone(
      options.format === 'png' ? snapshot : visibleSnapshot(snapshot, options.includeHidden),
    );
    if (options.format === 'png') {
      const requested =
        frozen.pages.find(
          (page) =>
            (options.occurrenceId
              ? page.occurrenceId === options.occurrenceId
              : page.pageId === options.pageId) ||
            (!options.occurrenceId &&
              page.metadata.label?.toLowerCase() === options.pageId?.toLowerCase()) ||
            (!options.occurrenceId &&
              page.shortCode?.toLowerCase() === options.pageId?.toLowerCase()),
        ) ?? (!options.pageId && !options.occurrenceId ? frozen.pages[0] : undefined);
      if (!requested) throw new PptdError('TARGET_NOT_FOUND', 'Page to render was not found.');
      frozen.pages = [requested];
    }
    if (!frozen.pages.length)
      throw new PptdError(
        'INVALID_DOCUMENT',
        'There are no visible slides to export. Include hidden slides or show a slide first.',
      );
    if (frozen.diagnostics.some((diagnostic) => diagnostic.severity === 'error')) {
      throw new PptdError('INVALID_DOCUMENT', 'Resolve document diagnostics before exporting.', {
        diagnostics: frozen.diagnostics,
      });
    }
    const job = await this.workspace.begin(frozen, options.format);
    const id = job.id;
    let release: () => void = () => {};
    job.settled = new Promise<void>((resolve) => {
      release = resolve;
    });
    let outputBytes: Uint8Array | undefined;
    let failure: unknown;
    let browser: Browser | undefined;
    let browserPage: Page | undefined;
    const ensurePage = async () => {
      if (browserPage) return browserPage;
      browser = await openBrowser();
      job.abort.signal.throwIfAborted();
      browserPage = await browser.newPage({
        viewport: { width: Math.ceil(frozen.size[0] + 40), height: Math.ceil(frozen.size[1] + 40) },
        deviceScaleFactor: 2,
      });
      await browserPage.goto(`${options.serverUrl}/huandeng/export/${id}`, {
        waitUntil: 'networkidle',
      });
      await browserPage.waitForFunction(
        () =>
          (window as unknown as Record<string, unknown>).__HUANDENG_EXPORT_READY__ === true &&
          !document.querySelector('[data-hd-loading]'),
        undefined,
        { timeout: 45000 },
      );
      await browserPage.evaluate(async () => {
        await document.fonts.ready;
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        );
      });
      const issues = await browserPage
        .locator('[data-hd-export-error], [data-hd-formula-error]')
        .allTextContents();
      if (issues.length)
        throw new PptdError('INVALID_DOCUMENT', 'The renderer reported export problems.', {
          issues,
        });
      return browserPage;
    };
    const abort = () => {
      void browser?.close().catch(() => {});
    };
    job.abort.signal.addEventListener('abort', abort, { once: true });
    try {
      await this.workspace.freezeAssets(job);
      job.status.state = 'rendering';
      if (options.format === 'pptx') {
        const exported = await buildPptdPptx(frozen, {
          measureTable: async (pageSnapshot, element) => {
            const page = await ensurePage();
            const frame = page.locator(
              `[data-hd-export-page=${JSON.stringify(pageSnapshot.occurrenceId ?? pageSnapshot.pageId)}]`,
            );
            const table = frame
              .locator(`[data-hd-element-id=${JSON.stringify(element.elementId)}] table`)
              .first();
            return {
              rowHeights: await table
                .locator('tr')
                .evaluateAll((rows) => rows.map((row) => row.getBoundingClientRect().height)),
            };
          },
          resolveAsset: async (source) => {
            const file = job.assets.get(source);
            if (!file) throw new Error(`Asset was not part of this export snapshot: ${source}`);
            return { bytes: await fs.readFile(file), mimeType: mimeType(source) };
          },
          rasterizeBackground: async (pageSnapshot) => {
            const page = await ensurePage();
            const frame = page.locator(
              `[data-hd-export-page=${JSON.stringify(pageSnapshot.occurrenceId ?? pageSnapshot.pageId)}]`,
            );
            const unsupported = await frame
              .locator('[data-hd-unsupported="true"]')
              .evaluateAll((nodes) => nodes.some((node) => !node.closest('[data-hd-element-id]')));
            if (unsupported) throw new Error('No reliable renderer for this page background.');
            const foreground = frame.locator('[data-hd-element-id]');
            const visibility = await foreground.evaluateAll((nodes) =>
              nodes.map((node) => {
                const style = (node as HTMLElement).style;
                const value = style.getPropertyValue('visibility');
                const priority = style.getPropertyPriority('visibility');
                style.setProperty('visibility', 'hidden', 'important');
                return { value, priority };
              }),
            );
            try {
              const bytes = await frame.screenshot({ type: 'png' });
              const dimensions = imageDimensions(bytes, 'png');
              if (!dimensions) throw new Error('The browser returned an invalid background PNG.');
              return {
                bytes,
                ...dimensions,
                bounds: [0, 0, ...frozen.size] as [number, number, number, number],
              };
            } finally {
              await foreground.evaluateAll((nodes, values) => {
                nodes.forEach((node, index) => {
                  const previous = values[index];
                  if (!previous) return;
                  const style = (node as HTMLElement).style;
                  if (previous.value)
                    style.setProperty('visibility', previous.value, previous.priority);
                  else style.removeProperty('visibility');
                });
              }, visibility);
            }
          },
          rasterizeElement: async (pageSnapshot, element) => {
            const page = await ensurePage();
            const frame = page.locator(
              `[data-hd-export-page=${JSON.stringify(pageSnapshot.occurrenceId ?? pageSnapshot.pageId)}]`,
            );
            const node = frame
              .locator(`[data-hd-element-id=${JSON.stringify(element.elementId)}]`)
              .first();
            if (
              (await node.getAttribute('data-hd-unsupported')) === 'true' ||
              (await node.locator('[data-hd-unsupported]').count())
            ) {
              throw new Error('No reliable renderer for this object.');
            }
            await frame.scrollIntoViewIfNeeded();
            const [box, frameBox] = await Promise.all([node.boundingBox(), frame.boundingBox()]);
            if (!box || !frameBox) throw new Error('The rendered object has no measurable bounds.');
            const originalStyles = await node.evaluate((target) => {
              const frame = target.closest<HTMLElement>('[data-hd-export-page]');
              if (!frame) throw new Error('The object has no export page.');
              const foreground = Array.from(
                frame.querySelectorAll<HTMLElement>('[data-hd-element-id]'),
              );
              const changed = [document.documentElement, document.body, frame, ...foreground];
              const originals = changed.map((element) => element.getAttribute('style'));
              document.documentElement.style.setProperty('background', 'transparent', 'important');
              document.body.style.setProperty('background', 'transparent', 'important');
              frame.style.setProperty('visibility', 'hidden', 'important');
              for (const element of foreground) {
                if (element === target)
                  element.style.setProperty('visibility', 'visible', 'important');
                else element.style.setProperty('display', 'none', 'important');
              }
              return originals;
            });
            try {
              // Text, formulas and stroked paths may paint outside their CSS border box.
              // Capture the isolated page and crop to actual alpha pixels, so the image
              // preserves visible overflow without including the page or other objects.
              const pageBytes = await page.screenshot({
                type: 'png',
                omitBackground: true,
                clip: frameBox,
              });
              const raster = await page.evaluate(
                async (dataUrl) => {
                  const source = new Image();
                  source.src = dataUrl;
                  await source.decode();
                  const width = source.naturalWidth;
                  const height = source.naturalHeight;
                  const canvas = document.createElement('canvas');
                  canvas.width = width;
                  canvas.height = height;
                  const context = canvas.getContext('2d');
                  if (!context) throw new Error('Cannot measure rendered pixels.');
                  context.drawImage(source, 0, 0);
                  const pixels = context.getImageData(0, 0, width, height).data;
                  let left = width;
                  let top = height;
                  let right = -1;
                  let bottom = -1;
                  for (let y = 0; y < height; y++) {
                    for (let x = 0; x < width; x++) {
                      if (pixels[(y * width + x) * 4 + 3] === 0) continue;
                      left = Math.min(left, x);
                      top = Math.min(top, y);
                      right = Math.max(right, x);
                      bottom = Math.max(bottom, y);
                    }
                  }
                  if (right < left || bottom < top) {
                    // A fully transparent object still has a valid, empty representation.
                    left = 0;
                    top = 0;
                    right = 0;
                    bottom = 0;
                  } else {
                    left = Math.max(0, left - 1);
                    top = Math.max(0, top - 1);
                    right = Math.min(width - 1, right + 1);
                    bottom = Math.min(height - 1, bottom + 1);
                  }
                  const crop = document.createElement('canvas');
                  crop.width = right - left + 1;
                  crop.height = bottom - top + 1;
                  const cropContext = crop.getContext('2d');
                  if (!cropContext) throw new Error('Cannot crop rendered pixels.');
                  cropContext.drawImage(canvas, -left, -top);
                  return {
                    dataUrl: crop.toDataURL('image/png'),
                    pageWidth: width,
                    pageHeight: height,
                    left,
                    top,
                    width: crop.width,
                    height: crop.height,
                  };
                },
                `data:image/png;base64,${pageBytes.toString('base64')}`,
              );
              const bytes = Buffer.from(raster.dataUrl.split(',')[1], 'base64');
              const dimensions = imageDimensions(bytes, 'png');
              if (!dimensions) throw new Error('The browser returned an invalid PNG.');
              return {
                bytes,
                ...dimensions,
                bounds: [
                  (raster.left / raster.pageWidth) * frameBox.width,
                  (raster.top / raster.pageHeight) * frameBox.height,
                  (raster.width / raster.pageWidth) * frameBox.width,
                  (raster.height / raster.pageHeight) * frameBox.height,
                ] as [number, number, number, number],
              };
            } finally {
              await node.evaluate((target, originals) => {
                const frame = target.closest<HTMLElement>('[data-hd-export-page]');
                if (!frame) throw new Error('The object lost its export page.');
                const changed = [
                  document.documentElement,
                  document.body,
                  frame,
                  ...frame.querySelectorAll<HTMLElement>('[data-hd-element-id]'),
                ];
                changed.forEach((element, index) => {
                  const original = originals[index];
                  if (original === null || original === undefined) element.removeAttribute('style');
                  else element.setAttribute('style', original);
                });
              }, originalStyles);
            }
          },
        });
        outputBytes = exported.bytes;
        job.report = exported.report;
      } else {
        const page = await ensurePage();
        if (options.format === 'pdf') {
          const unsupported = await page.locator('[data-hd-unsupported="true"]').allTextContents();
          if (unsupported.length)
            throw new PptdError(
              'INVALID_DOCUMENT',
              'Some objects have no reliable PDF representation.',
              { unsupported },
            );
          const exported = await buildPptdPdf(frozen, {
            renderPdf: async () => ({
              bytes: await page.pdf({ printBackground: true, preferCSSPageSize: true }),
            }),
          });
          outputBytes = exported.bytes;
          job.report = exported.report;
        } else {
          outputBytes = await page
            .locator('[data-hd-export-page]')
            .first()
            .screenshot({ type: 'png' });
        }
        if (options.format === 'png') {
          const unsupported = await page
            .locator('[data-hd-unsupported="true"]')
            .evaluateAll((nodes) =>
              nodes.map((node) => ({
                pageId: node.closest('[data-hd-export-page]')?.getAttribute('data-hd-export-page'),
                elementId: node.closest('[data-hd-element-id]')?.getAttribute('data-hd-element-id'),
                message: node.textContent ?? 'Unsupported object',
              })),
            );
          job.report = {
            ...createExportReport(frozen, 'png'),
            complete: unsupported.length === 0,
            unsupported,
            format: options.format,
            source: 'frozen-pptd',
            deckId: frozen.deckId,
            pages: frozen.pages.map((item) => ({
              pageId: item.pageId,
              ...(item.occurrenceId ? { occurrenceId: item.occurrenceId } : {}),
              ...(item.versionId ? { versionId: item.versionId } : {}),
              shortCode: item.shortCode,
              revision: item.renderRevision,
              pageRevision: item.pageRevision,
              renderRevision: item.renderRevision,
            })),
          };
        }
      }
      const base = frozen.presentationId
        ? `${
            frozen.title
              .replace(/[<>:"/\\|?*]/g, '_')
              .replace(/\p{Cc}/gu, '_')
              .replace(/[. ]+$/g, '')
              .slice(0, 100) || 'Presentation'
          }-${frozen.presentationId.slice(0, 8)}`
        : path.basename(frozen.entry, path.extname(frozen.entry));
      job.fileName =
        options.format === 'png'
          ? `${frozen.pages[0].shortCode ?? frozen.pages[0].pageId}.png`
          : `${base}.${options.format}`;
      if (!outputBytes) throw new Error('Export did not produce a file.');
      job.outputFile = path.join(job.directory, `artifact.${options.format}`);
      await fs.writeFile(job.outputFile, outputBytes);
      outputBytes = undefined;
      return await this.workspace.publish(
        job,
        job.fileName,
        (options.writeToProject ?? frozen.writable) && options.format !== 'png',
        job.report,
      );
    } catch (error) {
      failure = error;
      throw error;
    } finally {
      job.abort.signal.removeEventListener('abort', abort);
      await browser?.close().catch(() => {});
      try {
        await this.workspace.finish(job, failure);
      } finally {
        release();
      }
    }
  }
}
