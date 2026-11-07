import type { Crop, ImageFormat, Rect } from '../app/lib/pptx/scene';
import type { Bounds, PptdElement } from './types';

export class ExportFeatureError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ExportFeatureError';
  }
}

export function exportRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function exportNumber(value: unknown, fallback: number, name: string): number {
  if (value === undefined || value === null) return fallback;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new ExportFeatureError('INVALID_NUMERIC_VALUE', `${name} must be a finite number.`);
  }
  return value;
}

export function imageFormat(bytes: Uint8Array): ImageFormat | null {
  if (
    bytes.length >= 24 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  )
    return 'png';
  if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
    return 'jpeg';
  if (bytes.length >= 10 && new TextDecoder().decode(bytes.subarray(0, 6)).match(/^GIF8[79]a$/))
    return 'gif';
  const head = new TextDecoder().decode(bytes.subarray(0, 1024)).trimStart();
  if (/<svg[\s>]/i.test(head)) return 'svg';
  return null;
}

export function imageDimensions(
  bytes: Uint8Array,
  format: ImageFormat,
): { width: number; height: number } | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (format === 'png' && bytes.length >= 24) {
    return validSize(view.getUint32(16), view.getUint32(20));
  }
  if (format === 'gif' && bytes.length >= 10) {
    return validSize(view.getUint16(6, true), view.getUint16(8, true));
  }
  if (format === 'jpeg') {
    let offset = 2;
    while (offset + 4 <= bytes.length) {
      if (bytes[offset] !== 0xff) break;
      while (offset < bytes.length && bytes[offset] === 0xff) offset++;
      const marker = bytes[offset++];
      if (marker === 0xd9 || marker === 0xda) break;
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) continue;
      if (offset + 2 > bytes.length) break;
      const length = view.getUint16(offset);
      if (length < 2 || offset + length > bytes.length) break;
      if (
        [0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(
          marker,
        ) &&
        length >= 7
      ) {
        return validSize(view.getUint16(offset + 5), view.getUint16(offset + 3));
      }
      offset += length;
    }
  }
  return null;
}

function validSize(width: number, height: number): { width: number; height: number } | null {
  return Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0
    ? { width, height }
    : null;
}

export function elementBounds(element: PptdElement): Bounds {
  const bounds = element.bounds;
  if (
    !Array.isArray(bounds) ||
    bounds.length !== 4 ||
    !bounds.every(Number.isFinite) ||
    bounds[2] < 0 ||
    bounds[3] < 0
  ) {
    throw new ExportFeatureError(
      'INVALID_BOUNDS',
      `Object ${element.elementId} has invalid bounds.`,
    );
  }
  if (element.elementType !== 'line' && (!bounds[2] || !bounds[3])) {
    throw new ExportFeatureError(
      'INVALID_BOUNDS',
      `Object ${element.elementId} has an empty frame.`,
    );
  }
  return [...bounds];
}

export function sceneRect(bounds: Bounds): Rect {
  return { x: bounds[0] * 2, y: bounds[1] * 2, w: bounds[2] * 2, h: bounds[3] * 2 };
}

export function fitImage(
  element: PptdElement,
  width: number,
  height: number,
): { bounds: Bounds; crop: Crop } {
  const bounds = elementBounds(element);
  const sourceCrop = exportRecord(element.crop);
  const crop = {
    l: exportNumber(sourceCrop.left, 0, 'crop.left'),
    t: exportNumber(sourceCrop.top, 0, 'crop.top'),
    r: exportNumber(sourceCrop.right, 0, 'crop.right'),
    b: exportNumber(sourceCrop.bottom, 0, 'crop.bottom'),
  };
  if (Object.values(crop).some((value) => value < 0)) {
    throw new ExportFeatureError(
      'OUTSET_IMAGE_CROP',
      'Image crop with transparent padding needs a rendered fallback.',
    );
  }
  if (crop.l + crop.r >= 1 || crop.t + crop.b >= 1) {
    throw new ExportFeatureError('INVALID_IMAGE_CROP', 'Image crop leaves no source rectangle.');
  }
  const sourceWidth = width * (1 - crop.l - crop.r);
  const sourceHeight = height * (1 - crop.t - crop.b);
  const mode = exportRecord(element.fit).mode ?? 'cover';
  if (mode === 'fill') return { bounds, crop };
  if (mode === 'contain') {
    const scale = Math.min(bounds[2] / sourceWidth, bounds[3] / sourceHeight);
    const fittedWidth = sourceWidth * scale;
    const fittedHeight = sourceHeight * scale;
    return {
      bounds: [
        bounds[0] + (bounds[2] - fittedWidth) / 2,
        bounds[1] + (bounds[3] - fittedHeight) / 2,
        fittedWidth,
        fittedHeight,
      ],
      crop,
    };
  }
  if (mode !== 'cover')
    throw new ExportFeatureError('UNSUPPORTED_IMAGE_FIT', `Unknown image fit ${String(mode)}.`);
  const scale = Math.max(bounds[2] / sourceWidth, bounds[3] / sourceHeight);
  const extraX = Math.max(0, sourceWidth - bounds[2] / scale) / (2 * width);
  const extraY = Math.max(0, sourceHeight - bounds[3] / scale) / (2 * height);
  return {
    bounds,
    crop: { l: crop.l + extraX, r: crop.r + extraX, t: crop.t + extraY, b: crop.b + extraY },
  };
}
