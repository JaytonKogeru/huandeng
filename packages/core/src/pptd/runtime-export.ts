import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import type { ServerResponse } from 'node:http';
import path from 'node:path';
import { type Browser, chromium, type Page } from 'playwright';
import { runtimeRoot } from './client.ts';
import { buildPptdPdf, buildPptdPptx } from './export.ts';
import { imageDimensions } from './export-images.ts';
import { hashBytes } from './persistence.ts';
import { type DeckSnapshot, PptdError } from './types.ts';

export function mimeType(file: string) {
  return (
    (
      {
        '.svg': 'image/svg+xml',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.woff2': 'font/woff2',
        '.woff': 'font/woff',
        '.ttf': 'font/ttf',
        '.pdf': 'application/pdf',
        '.json': 'application/json',
        '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      } as Record<string, string>
    )[path.extname(file).toLowerCase()] ?? 'application/octet-stream'
  );
}

export async function readProjectAsset(root: string, source: string): Promise<Buffer> {
  if (source.startsWith('data:')) {
    const match = source.match(
      /^data:image\/(?:png|jpeg|gif|webp|svg\+xml);base64,([A-Za-z0-9+/=\r\n]+)$/,
    );
    if (!match || match[1].length > 48 * 1024 * 1024)
      throw new PptdError('INVALID_REQUEST', 'Unsupported embedded asset.');
    return Buffer.from(match[1], 'base64');
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(source) || source.startsWith('//') || source.includes('\0')) {
    throw new PptdError('PATH_OUTSIDE_PROJECT', 'Assets must be local project files.');
  }
  const normalized = source.replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\//, '');
  if (!/^(?:media|assets)\//.test(normalized)) {
    throw new PptdError('PATH_OUTSIDE_PROJECT', 'Only files in media/ or assets/ are served.');
  }
  const file = await fs.realpath(path.resolve(root, normalized));
  const relative = path.relative(await fs.realpath(root), file);
  if (relative.startsWith('..') || path.isAbsolute(relative))
    throw new PptdError('PATH_OUTSIDE_PROJECT', 'Asset resolves outside the project.');
  const stats = await fs.stat(file);
  if (!stats.isFile() || stats.size > 64 * 1024 * 1024)
    throw new PptdError('INVALID_REQUEST', 'Asset is not a file or exceeds 64 MiB.');
  return fs.readFile(file);
}

interface FrozenExport {
  snapshot: DeckSnapshot;
  assets: Map<string, Buffer>;
  createdAt: number;
  bytes?: Uint8Array;
  format?: string;
  fileName?: string;
  report?: unknown;
}

function assetSources(value: unknown, found = new Set<string>()): Set<string> {
  if (
    typeof value === 'string' &&
    (/^(?:\.?\/)?(?:media|assets)\//.test(value.replace(/\\/g, '/')) ||
      value.startsWith('data:image/'))
  ) {
    found.add(value);
  } else if (Array.isArray(value)) {
    for (const item of value) assetSources(item, found);
  } else if (value && typeof value === 'object') {
    for (const item of Object.values(value)) assetSources(item, found);
  }
  return found;
}

async function openBrowser(): Promise<Browser> {
  const candidates = [
    process.env.HUANDENG_BROWSER,
    process.platform === 'win32'
      ? path.join(
          process.env['PROGRAMFILES(X86)'] ?? 'C:/Program Files (x86)',
          'Microsoft/Edge/Application/msedge.exe',
        )
      : undefined,
    process.platform === 'win32'
      ? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
      : '/usr/bin/chromium',
  ].filter((candidate): candidate is string => !!candidate);
  const executablePath = candidates.find((candidate) => existsSync(candidate));
  return chromium.launch({
    ...(executablePath ? { executablePath } : {}),
    headless: true,
    args: process.platform === 'linux' ? ['--no-sandbox', '--disable-dev-shm-usage'] : [],
  });
}

export class ExportManager {
  private jobs = new Map<string, FrozenExport>();

  constructor(private root: string) {}

  async respond(id: string, kind: string, params: URLSearchParams, res: ServerResponse) {
    const job = this.jobs.get(id);
    if (!job || Date.now() - job.createdAt > 15 * 60 * 1000) {
      res.statusCode = 404;
      return res.end('Export snapshot expired.');
    }
    if (kind === 'snapshot') {
      res.setHeader('content-type', 'application/json');
      return res.end(JSON.stringify(job.snapshot));
    }
    if (kind === 'asset') {
      const source = params.get('path') ?? '';
      const bytes = job.assets.get(source);
      if (!bytes) {
        res.statusCode = 404;
        return res.end('Asset was not part of the frozen snapshot.');
      }
      res.setHeader('content-type', mimeType(source));
      return res.end(bytes);
    }
    if (kind === 'report') {
      res.setHeader('content-type', 'application/json');
      return res.end(JSON.stringify(job.report, null, 2));
    }
    if (kind === 'download' && job.bytes) {
      res.setHeader('content-type', mimeType(job.fileName ?? ''));
      res.setHeader(
        'content-disposition',
        `attachment; filename*=UTF-8''${encodeURIComponent(job.fileName ?? 'export')}`,
      );
      return res.end(job.bytes);
    }
    res.statusCode = 404;
    res.end('Export not ready.');
  }

  async create(
    snapshot: DeckSnapshot,
    options: {
      format: 'pptx' | 'pdf' | 'png';
      pageId?: string;
      occurrenceId?: string;
      writeToProject?: boolean;
      serverUrl: string;
    },
  ) {
    const id = randomUUID();
    const frozen = structuredClone(snapshot);
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
      throw new PptdError('INVALID_DOCUMENT', 'There are no active pages to export.');
    if (frozen.diagnostics.some((diagnostic) => diagnostic.severity === 'error')) {
      throw new PptdError('INVALID_DOCUMENT', 'Resolve document diagnostics before exporting.', {
        diagnostics: frozen.diagnostics,
      });
    }
    const assets = new Map<string, Buffer>();
    const sources = assetSources(
      frozen.pages.map((page) => ({
        data: page.data,
        theme: page.metadata.themeOverride ?? frozen.manifest.theme,
      })),
    );
    for (const source of sources) {
      const bytes = await readProjectAsset(this.root, source);
      const revisions = frozen.pages.flatMap((page) =>
        Object.hasOwn(page.assetRevisions ?? {}, source) ? [page.assetRevisions?.[source]] : [],
      );
      if (revisions.some((revision) => revision !== hashBytes(bytes)))
        throw new PptdError(
          'REVISION_CONFLICT',
          `Asset changed before export could freeze it: ${source}. Retry using the latest project state.`,
        );
      assets.set(source, bytes);
    }
    const job: FrozenExport = {
      snapshot: frozen,
      assets,
      createdAt: Date.now(),
      format: options.format,
    };
    this.jobs.set(id, job);
    for (const [key, value] of this.jobs) {
      if (Date.now() - value.createdAt > 15 * 60 * 1000) this.jobs.delete(key);
    }
    let browser: Browser | undefined;
    let browserPage: Page | undefined;
    const ensurePage = async () => {
      if (browserPage) return browserPage;
      browser = await openBrowser();
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
    try {
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
            const bytes = assets.get(source);
            if (!bytes) throw new Error(`Asset was not part of this export snapshot: ${source}`);
            return { bytes, mimeType: mimeType(source) };
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
              const bytes = await node.screenshot({ type: 'png', omitBackground: true });
              const dimensions = imageDimensions(bytes, 'png');
              if (!dimensions) throw new Error('The browser returned an invalid PNG.');
              return {
                bytes,
                ...dimensions,
                bounds: [box.x - frameBox.x, box.y - frameBox.y, box.width, box.height] as [
                  number,
                  number,
                  number,
                  number,
                ],
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
        job.bytes = exported.bytes;
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
          job.bytes = exported.bytes;
          job.report = exported.report;
        } else {
          job.bytes = await page
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
            complete: unsupported.length === 0,
            unsupported,
            format: options.format,
            source: 'frozen-pptd',
            deckId: frozen.deckId,
            pages: frozen.pages.map((item) => ({
              pageId: item.pageId,
              shortCode: item.shortCode,
              revision: item.renderRevision,
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
      const directory =
        (options.writeToProject ?? frozen.writable) && options.format !== 'png'
          ? path.join(this.root, 'Exports')
          : path.join(runtimeRoot(), 'exports', frozen.deckId);
      await fs.mkdir(directory, { recursive: true });
      const destination = path.join(directory, job.fileName);
      const temporary = `${destination}.tmp-${id}`;
      if (!job.bytes) throw new Error('Export did not produce a file.');
      await fs.writeFile(temporary, job.bytes);
      await fs.rename(temporary, destination);
      await fs.writeFile(`${destination}.report.json`, `${JSON.stringify(job.report, null, 2)}\n`);
      return {
        url: `/__pptd/exports/${id}/download`,
        reportUrl: `/__pptd/exports/${id}/report`,
        fileName: job.fileName,
        file: destination,
        report: job.report,
      };
    } finally {
      await browser?.close();
    }
  }
}
