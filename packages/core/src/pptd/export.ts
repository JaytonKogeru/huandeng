import { createHash } from 'node:crypto';
import { strFromU8, strToU8, zipSync } from 'fflate';
import type { Rgba } from '../app/lib/pptx/css';
import { ImageStore } from '../app/lib/pptx/images';
import { buildPptxFiles, colorXml, escapeXml, PPTX_MIME } from '../app/lib/pptx/ooxml';
import type {
  Fill,
  Geometry,
  Outline,
  SceneNode,
  ShadowEffect,
  ShapeNode,
  SlideScene,
} from '../app/lib/pptx/scene';
import { buildNativeChart, type NativeChart } from './export-chart';
import { type NativeGroupPlan, planNativeGroups, wrapNativeGroups } from './export-groups';
import {
  ExportFeatureError,
  elementBounds,
  exportNumber,
  exportRecord,
  fitImage,
  imageDimensions,
  imageFormat,
  sceneRect,
} from './export-images';
import { buildNativeTable, type NativeTable, type TableMeasurements } from './export-table';
import { decorateNativeTextXml, mapPptdText, type NativeText } from './export-text';
import { jpegOrientation } from './image-orientation';
import { hasPageTransition } from './page-transition';
import { mainPositionForPath, resolvePositionField } from './position-field';
import { SHAPE_PRESETS } from './shape-presets';
import type {
  Bounds,
  DeckSnapshot,
  Diagnostic,
  PageSize,
  PageSnapshot,
  PptdElement,
  Revision,
} from './types';

export interface ExportAsset {
  bytes: Uint8Array;
  mimeType?: string;
  width?: number;
  height?: number;
}

export interface ExportRaster {
  bytes: Uint8Array;
  width: number;
  height: number;
  bounds?: Bounds;
}

export interface ExportContext {
  snapshot: DeckSnapshot;
  reason: string;
}

export interface PptdExportAdapters {
  resolveAsset(
    source: string,
    context: { pageId: string; elementId?: string },
  ): Promise<ExportAsset>;
  rasterizeElement?(
    page: PageSnapshot,
    element: PptdElement,
    context: ExportContext,
  ): Promise<ExportRaster>;
  rasterizeBackground?(page: PageSnapshot, context: ExportContext): Promise<ExportRaster>;
  measureTable?(page: PageSnapshot, element: PptdElement): Promise<TableMeasurements>;
}

export interface ExportElementReport {
  pageId: string;
  occurrenceId?: string;
  versionId?: string;
  shortCode: string | null;
  elementId: string;
  mode: 'native' | 'image' | 'rendered' | 'blocked';
  reason: string;
  source?: string;
  assetRevision?: Revision;
}

export interface ExportDiagnostic extends Diagnostic {
  occurrenceId?: string;
  versionId?: string;
}

export interface ExportReport {
  schemaVersion: 1;
  renderer: 'huandeng-pptd-v1';
  format: 'pptx' | 'pdf' | 'png';
  renderState: 'base';
  deckId: string;
  presentationId?: string;
  title: string;
  size: { width: number; height: number; unit: 'pt' };
  manifestRevision: Revision;
  metadataRevision: Revision | null;
  pages: {
    pageId: string;
    occurrenceId?: string;
    versionId?: string;
    shortCode: string | null;
    pageRevision: Revision;
    renderRevision: Revision;
  }[];
  elements: ExportElementReport[];
  assets: { source: string; revision: Revision; byteLength: number; mimeType: string }[];
  fonts: string[];
  diagnostics: ExportDiagnostic[];
  complete: boolean;
}

export interface PptdExportResult {
  bytes: Uint8Array;
  mimeType: string;
  report: ExportReport;
}

export class PptdExportError extends Error {
  readonly code = 'EXPORT_INCOMPLETE';

  constructor(
    readonly report: ExportReport,
    message = 'Export is blocked because one or more objects have no reliable representation.',
  ) {
    super(message);
    this.name = 'PptdExportError';
  }
}

type NativeAsset = { id: number; width: number; height: number; revision: Revision };
type Decoration = {
  element: PptdElement;
  text?: NativeText;
  line?: string;
  table?: NativeTable;
  chart?: NativeChart;
  raster?: boolean;
};

const EMU_PER_POINT = 12700;
const NATIVE_SHAPE_PRESETS = new Set(SHAPE_PRESETS.map(([name]) => name));
const MIME_BY_FORMAT = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  svg: 'image/svg+xml',
};

function hash(bytes: Uint8Array): Revision {
  return `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
}

export function freezePptdExportSnapshot(snapshot: DeckSnapshot): DeckSnapshot {
  const frozen = structuredClone(snapshot);
  const visited = new WeakSet<object>();
  const freeze = (value: unknown): void => {
    if (!value || typeof value !== 'object' || visited.has(value)) return;
    visited.add(value);
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  };
  freeze(frozen);
  return frozen;
}

export function createExportReport(
  snapshot: DeckSnapshot,
  format: 'pptx' | 'pdf' | 'png',
): ExportReport {
  return {
    schemaVersion: 1,
    renderer: 'huandeng-pptd-v1',
    format,
    renderState: 'base',
    deckId: snapshot.deckId,
    ...(snapshot.presentationId ? { presentationId: snapshot.presentationId } : {}),
    title: snapshot.title,
    size: { width: snapshot.size[0], height: snapshot.size[1], unit: 'pt' },
    manifestRevision: snapshot.manifestRevision,
    metadataRevision: snapshot.metadataRevision,
    pages: snapshot.pages
      .filter((page) => page.state === 'active')
      .map(({ pageId, occurrenceId, versionId, shortCode, pageRevision, renderRevision }) => ({
        pageId,
        ...(occurrenceId ? { occurrenceId } : {}),
        ...(versionId ? { versionId } : {}),
        shortCode,
        pageRevision,
        renderRevision,
      })),
    elements: [],
    assets: [],
    fonts: [],
    diagnostics: [
      ...snapshot.diagnostics.map((diagnostic) => ({ ...diagnostic })),
      ...snapshot.pages
        .filter((page) => page.state === 'active' && page.data.timeline != null)
        .map((page) => ({
          code: 'TIMELINE_STATIC_EXPORT',
          severity: 'warning' as const,
          pageId: page.pageId,
          ...(page.occurrenceId ? { occurrenceId: page.occurrenceId } : {}),
          ...(page.versionId ? { versionId: page.versionId } : {}),
          message: '导出使用基础版式，动画时间线保留在 PPTD 中。',
        })),
      ...snapshot.pages
        .filter((page) => page.state === 'active' && hasPageTransition(page.data))
        .map((page) => ({
          code: 'TRANSITION_NOT_EXPORTED',
          severity: 'warning' as const,
          pageId: page.pageId,
          ...(page.occurrenceId ? { occurrenceId: page.occurrenceId } : {}),
          ...(page.versionId ? { versionId: page.versionId } : {}),
          message: '页面转场用于 HUANDENG 现场放映，本次导出不包含转场。',
        })),
    ],
    complete: false,
  };
}

function assertSnapshot(snapshot: DeckSnapshot, report: ExportReport): void {
  if (
    snapshot.size.length !== 2 ||
    !snapshot.size.every((value) => Number.isFinite(value) && value > 0)
  ) {
    report.diagnostics.push({
      code: 'INVALID_PAGE_SIZE',
      severity: 'error',
      message: 'Page dimensions must be finite positive point values.',
    });
  }
  if (report.pages.length === 0) {
    report.diagnostics.push({
      code: 'EMPTY_DECK',
      severity: 'error',
      message: 'There are no active pages to export.',
    });
  }
  const pageIds = new Set<string>();
  for (const page of snapshot.pages.filter((item) => item.state === 'active')) {
    const identity = snapshot.presentationId ? (page.occurrenceId ?? page.pageId) : page.pageId;
    if (pageIds.has(identity))
      report.diagnostics.push({
        code: 'DUPLICATE_PAGE_ID',
        severity: 'error',
        pageId: page.pageId,
        ...(page.occurrenceId ? { occurrenceId: page.occurrenceId } : {}),
        message: snapshot.presentationId
          ? 'A presentation occurrence identity occurs twice.'
          : 'A page identity occurs twice.',
      });
    pageIds.add(identity);
    const elementIds = new Set<string>();
    for (const element of page.data.elements) {
      if (!element.elementId || elementIds.has(element.elementId))
        report.diagnostics.push({
          code: 'DUPLICATE_ELEMENT_ID',
          severity: 'error',
          pageId: page.pageId,
          elementId: element.elementId,
          message: 'Object identities must be present and unique within the page.',
        });
      elementIds.add(element.elementId);
    }
  }
  if (report.diagnostics.some((diagnostic) => diagnostic.severity === 'error'))
    throw new PptdExportError(report);
}

function colorResolver(theme: Record<string, unknown>): (value: unknown, alpha?: number) => Rgba {
  const colors = exportRecord(theme.colors);
  return (value, alpha = 1) => {
    let color = value;
    const seen = new Set<string>();
    while (typeof color === 'string' && color.startsWith('$')) {
      if (seen.has(color))
        throw new ExportFeatureError('UNRESOLVED_COLOR', `Cyclic theme color ${color}.`);
      seen.add(color);
      color = colors[color.slice(1)];
    }
    if (color === 'black') color = '#000000';
    if (color === 'white') color = '#ffffff';
    if (color === 'transparent') color = '#00000000';
    if (
      typeof color !== 'string' ||
      !/^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i.test(color)
    ) {
      throw new ExportFeatureError('UNRESOLVED_COLOR', `Cannot resolve color ${String(value)}.`);
    }
    let hex = color.slice(1);
    if (hex.length < 5) hex = [...hex].map((digit) => digit + digit).join('');
    return {
      r: Number.parseInt(hex.slice(0, 2), 16),
      g: Number.parseInt(hex.slice(2, 4), 16),
      b: Number.parseInt(hex.slice(4, 6), 16),
      a: (hex.length === 8 ? Number.parseInt(hex.slice(6, 8), 16) / 255 : 1) * alpha,
    };
  };
}

type ColorResolver = ReturnType<typeof colorResolver>;

function opacity(element: PptdElement): number {
  const value = exportNumber(element.opacity, 1, 'opacity');
  if (value < 0 || value > 1)
    throw new ExportFeatureError('INVALID_OPACITY', 'Opacity must be between zero and one.');
  return value;
}

function fill(value: unknown, color: ColorResolver, alpha = 1): Fill | null {
  if (value === undefined || value === null) return null;
  const source = typeof value === 'string' ? { type: 'solid', color: value } : exportRecord(value);
  if (source.type === 'solid') return { kind: 'solid', color: color(source.color, alpha) };
  if (
    source.type === 'gradient' &&
    source.gradientType === 'linear' &&
    Array.isArray(source.stops) &&
    source.stops.length >= 2
  ) {
    return {
      kind: 'gradient',
      angleDeg: exportNumber(source.angle, 0, 'gradient.angle') + 90,
      stops: source.stops.map((item) => {
        const stop = exportRecord(item);
        const position = exportNumber(stop.position, 0, 'gradient.position');
        if (position < 0 || position > 1)
          throw new ExportFeatureError(
            'INVALID_GRADIENT',
            'Gradient positions must lie between zero and one.',
          );
        return { pos: position, color: color(stop.color, alpha) };
      }),
    };
  }
  throw new ExportFeatureError(
    'UNSUPPORTED_FILL',
    'This fill needs an object-level rendered fallback.',
  );
}

function outline(value: unknown, color: ColorResolver, alpha = 1): Outline | null {
  if (value === undefined || value === null) return null;
  const source = exportRecord(value);
  const width = exportNumber(source.width, 1, 'border.width');
  const dash = source.style ?? 'solid';
  if (width < 0 || !['solid', 'dash', 'dot'].includes(String(dash)))
    throw new ExportFeatureError(
      'UNSUPPORTED_BORDER',
      'This border is outside the native export subset.',
    );
  return {
    width: width * 2,
    dash: dash as Outline['dash'],
    color: color(source.color ?? '#000000', alpha),
  };
}

function shadow(value: unknown, color: ColorResolver, alpha = 1): ShadowEffect | null {
  if (value === undefined || value === null) return null;
  const source = exportRecord(value);
  const offset = Array.isArray(source.offset) ? source.offset : [0, 0];
  const dx = exportNumber(offset[0], 0, 'shadow.offset.x');
  const dy = exportNumber(offset[1], 0, 'shadow.offset.y');
  const blur = exportNumber(source.blur, 0, 'shadow.blur');
  if (blur < 0) throw new ExportFeatureError('INVALID_SHADOW', 'Shadow blur must be non-negative.');
  return {
    blur: blur * 2,
    dist: Math.hypot(dx, dy) * 2,
    dirDeg: (Math.atan2(dy, dx) * 180) / Math.PI,
    color: color(source.color, alpha),
    spread: 0,
    inner: false,
  };
}

function geometry(value: unknown, bounds: Bounds): Geometry {
  const source = exportRecord(value);
  const shapeName = source.shapeName ?? 'rect';
  if (shapeName === 'rect' || shapeName === 'ellipse') return { kind: shapeName };
  if (shapeName === 'roundRect') {
    const adjustments = Array.isArray(source.adjustments) ? source.adjustments : [];
    const adjustment = exportNumber(adjustments[0], 16667, 'roundRect.adjustment');
    if (adjustment < 0 || adjustment > 50000)
      throw new ExportFeatureError(
        'UNSUPPORTED_GEOMETRY',
        'Rounded rectangle adjustment is outside the native range.',
      );
    return {
      kind: 'roundRect',
      radius: (2 * Math.min(bounds[2], bounds[3]) * adjustment) / 100000,
    };
  }
  if (typeof shapeName === 'string' && NATIVE_SHAPE_PRESETS.has(shapeName)) return { kind: 'rect' };
  throw new ExportFeatureError(
    'UNSUPPORTED_GEOMETRY',
    `Shape ${String(shapeName)} needs a rendered fallback.`,
  );
}

function baseNode(element: PptdElement, name: string) {
  return {
    name,
    box: sceneRect(elementBounds(element)),
    rotationDeg: exportNumber(element.rotation, 0, 'rotation'),
    flipV: Array.isArray(element.flip) && element.flip[1] === true,
  };
}

function lineXml(element: PptdElement, color: ColorResolver): string {
  const bounds = elementBounds(element);
  const viewBox = Array.isArray(element.viewBox) ? element.viewBox : [];
  const width = exportNumber(viewBox[0], 1, 'line.viewBox.width');
  const height = exportNumber(viewBox[1], 1, 'line.viewBox.height');
  const points =
    typeof element.points === 'string'
      ? element.points
          .trim()
          .split(/\s+/)
          .map((point) => point.split(',').map(Number))
      : [];
  if (
    width <= 0 ||
    height <= 0 ||
    points.length !== 2 ||
    points.some(
      (point) =>
        point.length !== 2 ||
        !point.every(Number.isFinite) ||
        point[0] < 0 ||
        point[0] > width ||
        point[1] < 0 ||
        point[1] > height,
    )
  ) {
    throw new ExportFeatureError(
      'UNSUPPORTED_LINE_PATH',
      'Only valid two-endpoint lines are native in v0.1.',
    );
  }
  if (element.shadow)
    throw new ExportFeatureError(
      'UNSUPPORTED_LINE_SHADOW',
      'A line shadow needs browser rendering.',
    );
  const border = outline(element.border ?? {}, color, opacity(element));
  const arrow = Array.isArray(element.arrow) ? element.arrow : [null, null];
  const arrowType = (value: unknown): string => {
    if (value === undefined || value === null) return 'none';
    if (value === 'arrow') return 'triangle';
    if (['stealth', 'diamond', 'oval'].includes(String(value))) return String(value);
    throw new ExportFeatureError('UNSUPPORTED_ARROW', `Unsupported arrowhead ${String(value)}.`);
  };
  const w = Math.max(1, Math.round(bounds[2] * EMU_PER_POINT));
  const h = Math.max(1, Math.round(bounds[3] * EMU_PER_POINT));
  const point = ([x, y]: number[]) =>
    `<a:pt x="${Math.round((x / width) * w)}" y="${Math.round((y / height) * h)}"/>`;
  const path = `<a:custGeom><a:avLst/><a:gdLst/><a:ahLst/><a:cxnLst/><a:rect l="0" t="0" r="r" b="b"/><a:pathLst><a:path w="${w}" h="${h}" fill="none"><a:moveTo>${point(points[0])}</a:moveTo><a:lnTo>${point(points[1])}</a:lnTo></a:path></a:pathLst></a:custGeom>`;
  const stroke = border
    ? `<a:ln w="${Math.round(border.width * 6350)}" cap="${element.curve === 'sharp' ? 'flat' : 'rnd'}"><a:solidFill>${colorXml(border.color)}</a:solidFill>${border.dash === 'solid' ? '' : `<a:prstDash val="${border.dash}"/>`}<a:headEnd type="${arrowType(arrow[0])}"/><a:tailEnd type="${arrowType(arrow[1])}"/></a:ln>`
    : '<a:ln><a:noFill/></a:ln>';
  return `${path}<a:noFill/>${stroke}`;
}

function issue(
  report: ExportReport,
  page: PageSnapshot,
  elementId: string,
  code: string,
  message: string,
  severity: Diagnostic['severity'],
): void {
  report.diagnostics.push({
    pageId: page.pageId,
    ...(page.occurrenceId ? { occurrenceId: page.occurrenceId } : {}),
    ...(page.versionId ? { versionId: page.versionId } : {}),
    elementId,
    code,
    message,
    severity,
  });
}

function addElementReport(
  report: ExportReport,
  page: PageSnapshot,
  element: PptdElement,
  mode: ExportElementReport['mode'],
  reason: string,
  asset?: NativeAsset,
): void {
  report.elements.push({
    pageId: page.pageId,
    ...(page.occurrenceId ? { occurrenceId: page.occurrenceId } : {}),
    ...(page.versionId ? { versionId: page.versionId } : {}),
    shortCode: page.shortCode,
    elementId: element.elementId,
    mode,
    reason,
    ...(typeof element.src === 'string' ? { source: element.src } : {}),
    ...(asset ? { assetRevision: asset.revision } : {}),
  });
}

function finishPptxXml(
  files: Record<string, Uint8Array>,
  size: PageSize,
  decorations: Map<string, Decoration>[],
  groupPlans: NativeGroupPlan[],
): void {
  const presentation = strFromU8(files['ppt/presentation.xml']);
  const dimensions = /<p:sldSz\s+cx="\d+"\s+cy="\d+"\s*\/>/;
  if (!dimensions.test(presentation))
    throw new Error('The upstream PPTX dimension contract changed.');
  files['ppt/presentation.xml'] = strToU8(
    presentation.replace(
      dimensions,
      `<p:sldSz cx="${Math.round(size[0] * EMU_PER_POINT)}" cy="${Math.round(size[1] * EMU_PER_POINT)}"/>`,
    ),
  );
  decorations.forEach((entries, index) => {
    const path = `ppt/slides/slide${index + 1}.xml`;
    const xml = strFromU8(files[path]).replace(
      /<p:(sp|pic)>([\s\S]*?)<\/p:\1>/g,
      (block: string) => {
        const marker = block.match(/<p:cNvPr id="\d+" name="([^"]*)"\/>/)?.[1];
        const decoration = marker ? entries.get(marker) : undefined;
        if (!decoration) return block;
        if (decoration.table) {
          const id = Number(block.match(/<p:cNvPr id="(\d+)"/)?.[1]);
          if (!id) throw new Error('The native object ID was not assigned.');
          return decoration.table.xml(id);
        }
        if (decoration.chart) {
          const id = Number(block.match(/<p:cNvPr id="(\d+)"/)?.[1]);
          if (!id) throw new Error('The native object ID was not assigned.');
          return decoration.chart.install(files, index + 1, id);
        }
        let result = block.replace(
          /(<p:cNvPr id="\d+" name=")[^"]*("\/>)/,
          (_all, before: string, after: string) =>
            before + escapeXml(decoration.element.elementId.slice(0, 200)) + after,
        );
        if (decoration.raster) return result;
        if (Array.isArray(decoration.element.flip) && decoration.element.flip[0])
          result = result.replace('<a:xfrm', '<a:xfrm flipH="1"');
        const preset = String(
          decoration.element.elementType === 'image'
            ? (exportRecord(decoration.element.cropShape).shapeName ?? 'rect')
            : (decoration.element.shapeName ?? 'rect'),
        );
        if (NATIVE_SHAPE_PRESETS.has(preset) && !['rect', 'ellipse', 'roundRect'].includes(preset))
          result = result.replace(
            /<a:prstGeom prst="rect">[\s\S]*?<\/a:prstGeom>/,
            `<a:prstGeom prst="${preset}"><a:avLst/></a:prstGeom>`,
          );
        if (decoration.line) {
          result = result.replace(
            /(<p:spPr><a:xfrm[\s\S]*?<\/a:xfrm>)[\s\S]*?(<\/p:spPr>)/,
            (_all, before: string, after: string) => before + decoration.line + after,
          );
        }
        if (decoration.text) {
          result = decorateNativeTextXml(result, decoration.text, true);
        }
        return result;
      },
    );
    files[path] = strToU8(wrapNativeGroups(xml, groupPlans[index], size));
  });
}

export async function buildPptdPptx(
  source: DeckSnapshot,
  adapters: PptdExportAdapters,
): Promise<PptdExportResult> {
  const snapshot = freezePptdExportSnapshot(source);
  const report = createExportReport(snapshot, 'pptx');
  assertSnapshot(snapshot, report);
  const images = new ImageStore();
  const assets = new Map<string, Promise<NativeAsset>>();
  const imageIds = new Map<string, number>();
  const fonts = new Set<string>();
  const decorations: Map<string, Decoration>[] = [];
  const groupPlans: NativeGroupPlan[] = [];
  const slides: SlideScene[] = [];

  const asset = (
    sourcePath: string,
    page: PageSnapshot,
    elementId?: string,
  ): Promise<NativeAsset> => {
    let result = assets.get(sourcePath);
    if (result) return result;
    result = (async () => {
      let resolved: ExportAsset;
      try {
        resolved = await adapters.resolveAsset(sourcePath, { pageId: page.pageId, elementId });
      } catch (error) {
        throw new ExportFeatureError(
          'ASSET_UNAVAILABLE',
          `Cannot read ${sourcePath}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
      const bytes = new Uint8Array(resolved.bytes);
      const revision = hash(bytes);
      const format = imageFormat(bytes);
      report.assets.push({
        source: sourcePath,
        revision,
        byteLength: bytes.byteLength,
        mimeType:
          resolved.mimeType ?? (format ? MIME_BY_FORMAT[format] : 'application/octet-stream'),
      });
      if (!format || format === 'svg')
        throw new ExportFeatureError(
          'IMAGE_FORMAT_FALLBACK',
          'This image format needs browser rendering; the original asset remains unchanged.',
        );
      if (format === 'jpeg' && jpegOrientation(bytes) !== 1)
        throw new ExportFeatureError(
          'IMAGE_ORIENTATION_FALLBACK',
          'This JPEG uses EXIF orientation. Browser rendering preserves its orientation and crop without altering the original asset.',
        );
      const dimensions =
        imageDimensions(bytes, format) ??
        (resolved.width && resolved.height
          ? { width: resolved.width, height: resolved.height }
          : null);
      if (
        !dimensions ||
        !Number.isFinite(dimensions.width) ||
        !Number.isFinite(dimensions.height) ||
        dimensions.width <= 0 ||
        dimensions.height <= 0
      ) {
        throw new ExportFeatureError(
          'INVALID_IMAGE',
          `Cannot determine reliable image dimensions for ${sourcePath}.`,
        );
      }
      let id = imageIds.get(revision);
      if (!id) {
        id = images.add(bytes, format);
        imageIds.set(revision, id);
      }
      return { id, ...dimensions, revision };
    })();
    assets.set(sourcePath, result);
    return result;
  };

  const raster = (image: ExportRaster, bounds: Bounds, name: string): SceneNode => {
    const dimensions = imageDimensions(image.bytes, 'png');
    if (
      imageFormat(image.bytes) !== 'png' ||
      !dimensions ||
      dimensions.width !== image.width ||
      dimensions.height !== image.height
    )
      throw new ExportFeatureError(
        'INVALID_FALLBACK',
        'A rendered fallback must be a non-empty PNG with matching pixel dimensions.',
      );
    const frame = image.bounds ?? bounds;
    if (frame.length !== 4 || !frame.every(Number.isFinite) || frame[2] <= 0 || frame[3] <= 0)
      throw new ExportFeatureError(
        'INVALID_FALLBACK',
        'A rendered fallback must report valid logical bounds.',
      );
    return {
      kind: 'picture',
      name,
      box: sceneRect(frame),
      rotationDeg: 0,
      flipV: false,
      imageId: images.add(new Uint8Array(image.bytes), 'png'),
      crop: null,
      alpha: 1,
      geometry: { kind: 'rect' },
      outline: null,
      shadow: null,
    };
  };

  const fallback = async (
    page: PageSnapshot,
    element: PptdElement,
    reason: ExportFeatureError,
    name: string,
  ): Promise<SceneNode | null> => {
    if (
      reason.code === 'ASSET_UNAVAILABLE' ||
      reason.code.startsWith('INVALID_') ||
      reason.code.startsWith('UNRESOLVED_')
    ) {
      addElementReport(report, page, element, 'blocked', reason.code);
      issue(report, page, element.elementId, reason.code, reason.message, 'error');
      return null;
    }
    try {
      if (!adapters.rasterizeElement) throw new Error('No verified object renderer was supplied.');
      const image = await adapters.rasterizeElement(page, element, {
        snapshot,
        reason: reason.code,
      });
      if (element.rotation && !image.bounds)
        throw new Error('A rotated fallback must include its measured logical bounds.');
      const node = raster(image, elementBounds(element), name);
      addElementReport(report, page, element, 'image', reason.code);
      issue(report, page, element.elementId, reason.code, reason.message, 'warning');
      return node;
    } catch (error) {
      addElementReport(report, page, element, 'blocked', reason.code);
      issue(
        report,
        page,
        element.elementId,
        'FALLBACK_UNAVAILABLE',
        `${reason.message} ${error instanceof Error ? error.message : String(error)}`,
        'error',
      );
      return null;
    }
  };

  const picture = async (
    page: PageSnapshot,
    element: PptdElement,
    name: string,
    color: ColorResolver,
  ): Promise<{ nodes: SceneNode[]; asset: NativeAsset }> => {
    if (typeof element.src !== 'string' || !element.src)
      throw new ExportFeatureError('INVALID_IMAGE', 'An image must reference its original asset.');
    const original = await asset(element.src, page, element.elementId);
    if (element.shadow)
      throw new ExportFeatureError(
        'IMAGE_SHADOW_FALLBACK',
        'An image shadow needs a measured object fallback.',
      );
    const fitted = fitImage(element, original.width, original.height);
    const shape = geometry(element.cropShape, elementBounds(element));
    if (
      shape.kind !== 'rect' &&
      exportRecord(element.fit).mode === 'contain' &&
      fitted.bounds.some((value, index) => Math.abs(value - elementBounds(element)[index]) > 0.001)
    ) {
      throw new ExportFeatureError(
        'CONTAIN_MASK_FALLBACK',
        'Contain fitting with a non-rectangular outer mask needs browser rendering.',
      );
    }
    const nodes: SceneNode[] = [
      {
        ...baseNode(element, name),
        kind: 'picture',
        box: sceneRect(fitted.bounds),
        imageId: original.id,
        crop: fitted.crop,
        alpha: opacity(element),
        geometry: shape,
        outline: null,
        shadow: null,
      },
    ];
    const border = outline(element.border, color, opacity(element));
    if (border)
      nodes.push({
        ...baseNode(element, `${name}-border`),
        kind: 'shape',
        geometry: geometry(element.cropShape, elementBounds(element)),
        fill: null,
        outline: border,
        shadow: null,
      });
    return { nodes, asset: original };
  };

  for (const page of snapshot.pages.filter((item) => item.state === 'active')) {
    const theme = exportRecord(page.metadata.themeOverride ?? snapshot.manifest.theme);
    const color = colorResolver(theme);
    const slide: SlideScene = { background: null, notes: page.data.notes ?? null, nodes: [] };
    const entries = new Map<string, Decoration>();
    let groupPlan: NativeGroupPlan | undefined;
    decorations.push(entries);
    const background = page.data.background ?? { type: 'solid', color: '#FFFFFF' };
    const backgroundElement: PptdElement = {
      ...exportRecord(background),
      elementId: '$background',
      elementType: 'image',
      bounds: [0, 0, ...snapshot.size],
    };
    try {
      if (exportRecord(background).type === 'image') {
        const result = await picture(page, backgroundElement, 'hd-background', color);
        slide.nodes.push(...result.nodes);
        addElementReport(report, page, backgroundElement, 'image', 'ORIGINAL_ASSET', result.asset);
      } else {
        slide.background = fill(background, color);
        addElementReport(report, page, backgroundElement, 'native', 'NATIVE_BACKGROUND');
      }
    } catch (error) {
      const reason =
        error instanceof ExportFeatureError
          ? error
          : new ExportFeatureError('BACKGROUND_FALLBACK', String(error));
      try {
        if (
          !adapters.rasterizeBackground ||
          reason.code === 'ASSET_UNAVAILABLE' ||
          reason.code.startsWith('INVALID_') ||
          reason.code.startsWith('UNRESOLVED_')
        )
          throw reason;
        const image = await adapters.rasterizeBackground(page, { snapshot, reason: reason.code });
        slide.nodes.push(raster(image, [0, 0, ...snapshot.size], 'hd-background'));
        addElementReport(report, page, backgroundElement, 'image', reason.code);
        issue(report, page, '$background', reason.code, reason.message, 'warning');
      } catch (failure) {
        addElementReport(report, page, backgroundElement, 'blocked', reason.code);
        issue(
          report,
          page,
          '$background',
          reason.code,
          failure instanceof Error ? failure.message : String(failure),
          'error',
        );
      }
    }
    for (const [index, element] of page.data.elements.entries()) {
      const name = `hd-element-${index}`;
      try {
        if (element.elementType === 'group') {
          try {
            groupPlan ??= planNativeGroups(page.data.elements);
          } catch (error) {
            throw new ExportFeatureError(
              'INVALID_GROUP',
              error instanceof Error ? error.message : String(error),
            );
          }
          const native = groupPlan.nativeIds.has(element.elementId);
          addElementReport(
            report,
            page,
            element,
            'native',
            native ? 'EDITABLE_GROUP' : 'EDITABLE_GROUP_MEMBERS',
          );
          if (!native)
            issue(
              report,
              page,
              element.elementId,
              'GROUP_EXPORTED_AS_MEMBERS',
              'Interleaved or empty group members retain their original z-order as separate editable objects.',
              'info',
            );
          continue;
        }
        const bounds = elementBounds(element);
        if (
          bounds[0] < 0 ||
          bounds[1] < 0 ||
          bounds[0] + bounds[2] > snapshot.size[0] ||
          bounds[1] + bounds[3] > snapshot.size[1]
        ) {
          issue(
            report,
            page,
            element.elementId,
            'ELEMENT_OUTSIDE_PAGE',
            'The source object extends beyond the page; its geometry was not changed.',
            'warning',
          );
        }
        if (element.elementType === 'text') {
          const position =
            page.mainPosition ??
            (page.versionId ? undefined : mainPositionForPath(snapshot.manifest.pages, page.path));
          const displayed = resolvePositionField(element, position);
          const text = mapPptdText(displayed, theme, color, name);
          for (const font of text.fonts) fonts.add(font);
          slide.nodes.push(text.node);
          entries.set(name, { element: displayed, text });
          addElementReport(
            report,
            page,
            element,
            'native',
            text.mathRuns.some(Boolean) ? 'EDITABLE_TEXT_AND_EQUATIONS' : 'EDITABLE_TEXT',
          );
        } else if (element.elementType === 'table') {
          const measurements = await adapters.measureTable?.(page, element);
          const table = buildNativeTable(element, theme, color, measurements);
          for (const font of table.fonts) fonts.add(font);
          slide.nodes.push({
            ...baseNode(element, name),
            kind: 'shape',
            geometry: { kind: 'rect' },
            fill: null,
            outline: null,
            shadow: null,
          });
          entries.set(name, { element, table });
          addElementReport(
            report,
            page,
            element,
            'native',
            table.hasMath ? 'EDITABLE_TABLE_AND_EQUATIONS' : 'EDITABLE_TABLE',
          );
        } else if (element.elementType === 'chart') {
          const chart = await buildNativeChart(
            element,
            theme,
            color,
            snapshot.size,
            `huandeng-${slides.length + 1}-${index + 1}`,
          );
          for (const font of chart.fonts) fonts.add(font);
          slide.nodes.push({
            ...baseNode(element, name),
            kind: 'shape',
            geometry: { kind: 'rect' },
            fill: null,
            outline: null,
            shadow: null,
          });
          entries.set(name, { element, chart });
          addElementReport(report, page, element, 'native', 'EDITABLE_CHART_AND_WORKBOOK');
          issue(
            report,
            page,
            element.elementId,
            'NATIVE_CHART_LAYOUT',
            'Chart data remains editable; PowerPoint lays out its own axis labels, legend and plot area.',
            'info',
          );
        } else if (element.elementType === 'shape') {
          const alpha = opacity(element);
          slide.nodes.push({
            ...baseNode(element, name),
            kind: 'shape',
            geometry: geometry(element, bounds),
            fill: fill(element.fill, color, alpha),
            outline: outline(element.border, color, alpha),
            shadow: shadow(element.shadow, color, alpha),
          });
          entries.set(name, { element });
          addElementReport(report, page, element, 'native', 'EDITABLE_SHAPE');
        } else if (element.elementType === 'line') {
          const line = lineXml(element, color);
          const placeholder: ShapeNode = {
            ...baseNode(element, name),
            kind: 'shape',
            geometry: { kind: 'rect' },
            fill: null,
            outline: null,
            shadow: null,
          };
          slide.nodes.push(placeholder);
          entries.set(name, { element, line });
          addElementReport(report, page, element, 'native', 'EDITABLE_LINE');
        } else if (element.elementType === 'image') {
          const result = await picture(page, element, name, color);
          slide.nodes.push(...result.nodes);
          entries.set(name, { element });
          entries.set(`${name}-border`, { element });
          addElementReport(report, page, element, 'image', 'ORIGINAL_ASSET', result.asset);
        } else {
          throw new ExportFeatureError(
            'UNSUPPORTED_OBJECT',
            `Object type ${element.elementType} requires a verified object renderer.`,
          );
        }
      } catch (error) {
        const reason =
          error instanceof ExportFeatureError
            ? error
            : new ExportFeatureError(
                'OBJECT_MAPPING_FAILED',
                error instanceof Error ? error.message : String(error),
              );
        const node = await fallback(page, element, reason, name);
        if (node) {
          slide.nodes.push(node);
          entries.set(name, { element, raster: true });
        }
      }
    }
    if (Array.isArray(page.data.animations) && page.data.animations.length)
      issue(
        report,
        page,
        '$page',
        'ANIMATIONS_NOT_EXPORTED',
        'The exported deck is static; source animations remain in PPTD.',
        'warning',
      );
    slides.push(slide);
    groupPlans.push(groupPlan ?? { groups: [], nativeIds: new Set() });
  }
  report.fonts = [...fonts].sort();
  if (report.fonts.length) {
    report.diagnostics.push({
      code: 'FONT_FILES_NOT_EMBEDDED',
      severity: 'warning',
      message:
        'PowerPoint references the original font names; font availability and native text reflow can differ from the browser.',
    });
  }
  report.complete =
    !report.elements.some((element) => element.mode === 'blocked') &&
    !report.diagnostics.some((diagnostic) => diagnostic.severity === 'error');
  if (!report.complete) throw new PptdExportError(report);
  const files = buildPptxFiles({ slides, images: images.images });
  // Upstream scene units are half-points; all mapped dimensions are doubled, while the package size is set in actual PPTD points.
  finishPptxXml(files, snapshot.size, decorations, groupPlans);
  files['huandeng/export-report.json'] = strToU8(JSON.stringify(report, null, 2));
  const contentTypes = strFromU8(files['[Content_Types].xml']);
  files['[Content_Types].xml'] = strToU8(
    contentTypes.replace(
      '</Types>',
      '<Default Extension="json" ContentType="application/json"/></Types>',
    ),
  );
  return { bytes: zipSync(files), mimeType: PPTX_MIME, report };
}

export function pptdPrintStyle(size: PageSize, rootId = 'huandeng-export'): string {
  if (
    !/^[A-Za-z][A-Za-z0-9_-]*$/.test(rootId) ||
    !size.every((value) => Number.isFinite(value) && value > 0)
  )
    throw new Error('Invalid print surface.');
  const [width, height] = size;
  return `@page{size:${width}pt ${height}pt;margin:0}@media print{html,body{margin:0!important;padding:0!important}body>*:not(#${rootId}){display:none!important}#${rootId}{display:block!important}#${rootId} [data-hd-print-page]{position:relative;width:${(width * 4) / 3}px;height:${(height * 4) / 3}px;overflow:hidden;break-after:page;page-break-after:always}#${rootId} [data-hd-print-page]:last-child{break-after:auto;page-break-after:auto}#${rootId} [data-pptd-page]{width:${width}px!important;height:${height}px!important;transform:scale(${4 / 3})!important;transform-origin:top left!important}#${rootId},#${rootId} *{-webkit-print-color-adjust:exact;print-color-adjust:exact}}`;
}

export interface PdfRenderResult {
  bytes: Uint8Array;
  diagnostics?: Diagnostic[];
}

export interface PptdPdfAdapter {
  renderPdf(
    snapshot: DeckSnapshot,
    options: { widthPt: number; heightPt: number; printCss: string },
  ): Promise<PdfRenderResult>;
}

export async function buildPptdPdf(
  source: DeckSnapshot,
  adapter: PptdPdfAdapter,
): Promise<PptdExportResult> {
  const snapshot = freezePptdExportSnapshot(source);
  const report = createExportReport(snapshot, 'pdf');
  assertSnapshot(snapshot, report);
  const result = await adapter.renderPdf(snapshot, {
    widthPt: snapshot.size[0],
    heightPt: snapshot.size[1],
    printCss: pptdPrintStyle(snapshot.size),
  });
  report.diagnostics.push(...(result.diagnostics ?? []));
  if (new TextDecoder().decode(result.bytes.subarray(0, 5)) !== '%PDF-')
    report.diagnostics.push({
      code: 'INVALID_PDF_OUTPUT',
      severity: 'error',
      message: 'The renderer did not return a PDF document.',
    });
  for (const page of snapshot.pages.filter((item) => item.state === 'active')) {
    for (const element of page.data.elements)
      addElementReport(report, page, element, 'rendered', 'BROWSER_PRINT');
  }
  report.complete = !report.diagnostics.some((diagnostic) => diagnostic.severity === 'error');
  if (!report.complete) throw new PptdExportError(report);
  return { bytes: new Uint8Array(result.bytes), mimeType: 'application/pdf', report };
}
