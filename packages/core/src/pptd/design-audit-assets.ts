import fs from 'node:fs/promises';
import path from 'node:path';
import {
  auditSlideDesign,
  type DesignAuditOptions,
  type DesignAuditReport,
  type ImageMeasurement,
  validateDesignAuditOptions,
} from './design-audit';
import { imageDimensions, imageFormat } from './export-images';
import type { DeckSnapshot } from './types';

const MAX_ASSETS = 128;
const MAX_HEADER_BYTES = 512 * 1024;
const MAX_FILE_BYTES = 64 * 1024 * 1024;

function webpDimensions(bytes: Uint8Array): ImageMeasurement | null {
  if (
    bytes.length < 30 ||
    new TextDecoder().decode(bytes.subarray(0, 4)) !== 'RIFF' ||
    new TextDecoder().decode(bytes.subarray(8, 12)) !== 'WEBP'
  )
    return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const kind = new TextDecoder().decode(bytes.subarray(12, 16));
  if (kind === 'VP8X')
    return {
      width: 1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16),
      height: 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16),
    };
  if (kind === 'VP8L' && bytes[20] === 0x2f) {
    const bits = view.getUint32(21, true);
    return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
  }
  if (kind === 'VP8 ' && bytes[23] === 0x9d && bytes[24] === 0x01 && bytes[25] === 0x2a)
    return { width: view.getUint16(26, true) & 0x3fff, height: view.getUint16(28, true) & 0x3fff };
  return null;
}

async function measure(root: string, source: string): Promise<ImageMeasurement> {
  const relative = source.replace(/\\/g, '/').replace(/^\.\//, '');
  if (!relative || path.isAbsolute(relative) || relative.includes(':') || relative.includes('\0'))
    throw new Error('non-project-source');
  const parts = relative.split('/');
  if (parts.some((part) => !part || part === '.' || part === '..'))
    throw new Error('non-project-source');
  let current = root;
  for (const [index, part] of parts.entries()) {
    current = path.join(current, part);
    const stats = await fs.lstat(current);
    if (stats.isSymbolicLink()) throw new Error('linked-source');
    if (index < parts.length - 1 && !stats.isDirectory()) throw new Error('not-regular-file');
  }
  const actual = await fs.realpath(current);
  const within = path.relative(root, actual);
  if (within.startsWith('..') || path.isAbsolute(within)) throw new Error('non-project-source');
  const before = await fs.lstat(actual);
  if (!before.isFile() || before.isSymbolicLink()) throw new Error('not-regular-file');
  if (before.size > MAX_FILE_BYTES) throw new Error('file-size-limit');
  const handle = await fs.open(actual, 'r');
  try {
    const opened = await handle.stat();
    if (opened.ino !== before.ino || opened.dev !== before.dev || opened.size !== before.size)
      throw new Error('changed-during-read');
    const buffer = Buffer.alloc(Math.min(opened.size, MAX_HEADER_BYTES));
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    const bytes = buffer.subarray(0, bytesRead);
    const after = await fs.lstat(current);
    const ended = await handle.stat();
    if (
      after.isSymbolicLink() ||
      after.ino !== opened.ino ||
      after.dev !== opened.dev ||
      after.size !== opened.size ||
      after.mtimeMs !== opened.mtimeMs ||
      ended.size !== opened.size ||
      ended.mtimeMs !== opened.mtimeMs ||
      (await fs.realpath(current)) !== actual
    )
      throw new Error('changed-during-read');
    const format = imageFormat(bytes);
    if (format === 'svg') return { width: 0, height: 0, vector: true };
    const result = format ? imageDimensions(bytes, format) : webpDimensions(bytes);
    if (!result || result.width <= 0 || result.height <= 0)
      throw new Error('unreadable-image-header');
    return result;
  } finally {
    await handle.close();
  }
}

export async function readSlideDesignAudit(
  root: string,
  snapshot: DeckSnapshot,
  options: DesignAuditOptions = {},
): Promise<DesignAuditReport> {
  validateDesignAuditOptions(options);
  const directory = await fs.realpath(root);
  const sources = new Set<string>();
  for (const page of snapshot.pages
    .filter((page) => page.state === 'active' && !page.metadata.hidden)
    .slice(0, 500)) {
    for (const element of page.data.elements)
      if (element.elementType === 'image' && typeof element.src === 'string')
        sources.add(element.src);
    const background = page.data.background;
    if (
      background &&
      typeof background === 'object' &&
      !Array.isArray(background) &&
      'type' in background &&
      background.type === 'image' &&
      'src' in background &&
      typeof background.src === 'string'
    )
      sources.add(background.src);
  }
  const measured: Record<string, ImageMeasurement> = {};
  const omitted: { source: string; reason: string }[] = [];
  for (const source of [...sources].slice(0, MAX_ASSETS)) {
    try {
      measured[source] = await measure(directory, source);
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      const known = [
        'non-project-source',
        'linked-source',
        'not-regular-file',
        'file-size-limit',
        'changed-during-read',
        'unreadable-image-header',
      ];
      omitted.push({ source, reason: known.includes(message) ? message : 'source-unavailable' });
    }
  }
  const report = auditSlideDesign(snapshot, options, measured);
  report.assetInspection = {
    measured: Object.keys(measured).length,
    omitted,
    truncated: sources.size > MAX_ASSETS,
    maxAssets: MAX_ASSETS,
    maxHeaderBytes: MAX_HEADER_BYTES,
  };
  report.truncated ||= sources.size > MAX_ASSETS;
  return report;
}
