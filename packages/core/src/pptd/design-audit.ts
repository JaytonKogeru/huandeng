import { auditEditorialPatterns } from './editorial-audit';
import editorialGuide from './editorial-guide.generated.json';
import { type DeckSnapshot, type PageSnapshot, type PptdElement, PptdError } from './types';

export interface DesignAuditOptions {
  language?: 'en' | 'zh-CN';
  requireSectionDividers?: boolean;
  expectedBackground?: string;
  maxTitleSize?: number;
  maxBodySize?: number;
}

export interface ImageMeasurement {
  width: number;
  height: number;
  vector?: boolean;
}

export interface DesignAuditFinding {
  code: string;
  ruleId?: string;
  severity: 'info' | 'warning';
  message: string;
  pageId: string;
  occurrenceId?: string;
  elementId?: string;
  measured?: number | string;
  recommended?: number | string;
}

export interface DesignAuditPage {
  pageId: string;
  occurrenceId?: string;
  versionId?: string;
  position: number;
  pageRevision: string;
  renderRevision: string;
  elementsTruncated: boolean;
  title: string;
  pageRole: string;
  titleOnly: boolean;
  background: string;
  textCharacters: number;
  text: {
    elementId: string;
    role: string;
    fontSize: number;
    normalizedSize: number;
    bold: boolean;
  }[];
  images: {
    elementId: string;
    source: string;
    status: 'measured' | 'vector' | 'unmeasured';
    sampling?: number;
  }[];
}

export interface DesignAuditReport {
  schemaVersion: 1;
  editorialStandard: { version: string; sourceSha256: string; automatedSignals: number };
  deckId: string;
  presentationId: string | null;
  revisions: { manifest: string; metadata: string | null; guidance: string | null };
  language: 'en' | 'zh-CN';
  pageCount: number;
  backgrounds: { color: string; count: number }[];
  pages: DesignAuditPage[];
  sectionStarts: { id: string; title: string; pageId: string; titleOnly: boolean }[];
  findings: DesignAuditFinding[];
  findingCount: number;
  truncated: boolean;
  limits: {
    maxPages: number;
    maxElementsPerPage: number;
    maxFindings: number;
    targetWidth: number;
  };
  visualInspectionRequired: true;
  assetInspection?: {
    measured: number;
    omitted: { source: string; reason: string }[];
    truncated: boolean;
    maxAssets: number;
    maxHeaderBytes: number;
  };
}

const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
const finite = (value: unknown, fallback: number) =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;
const visible = (element: PptdElement) =>
  element.visible !== false && element.hidden !== true && element.opacity !== 0;
const textOf = (element: PptdElement) =>
  typeof element.content?.text === 'string' ? element.content.text.trim() : '';
const round = (value: number) => Math.round(value * 100) / 100;

function color(value: unknown, theme: Record<string, unknown>): string {
  const raw = typeof value === 'string' ? value : '#ffffff';
  const resolved = raw.startsWith('$') ? record(theme.colors)[raw.slice(1)] : raw;
  if (typeof resolved !== 'string') return 'unresolved';
  let result = resolved.trim().toLowerCase();
  if (/^#[0-9a-f]{3}$/.test(result)) result = `#${[...result.slice(1)].map((c) => c + c).join('')}`;
  if (result === 'white' || result === 'rgb(255, 255, 255)') return '#ffffff';
  return result;
}

export function validateDesignAuditOptions(options: DesignAuditOptions): void {
  if (options.language !== undefined && !['en', 'zh-CN'].includes(options.language))
    throw new PptdError('INVALID_REQUEST', 'Design audit language must be en or zh-CN.');
  if (
    options.requireSectionDividers !== undefined &&
    typeof options.requireSectionDividers !== 'boolean'
  )
    throw new PptdError('INVALID_REQUEST', 'requireSectionDividers must be a boolean.');
  if (
    options.expectedBackground !== undefined &&
    (typeof options.expectedBackground !== 'string' ||
      !options.expectedBackground.trim() ||
      options.expectedBackground.length > 100)
  )
    throw new PptdError(
      'INVALID_REQUEST',
      'expectedBackground must be a nonempty color string of at most 100 characters.',
    );
  for (const key of ['maxTitleSize', 'maxBodySize'] as const)
    if (
      options[key] !== undefined &&
      (typeof options[key] !== 'number' ||
        !Number.isFinite(options[key]) ||
        options[key] <= 0 ||
        options[key] > 200)
    )
      throw new PptdError(
        'INVALID_REQUEST',
        `${key} must be a positive finite normalized size up to 200.`,
      );
}

export function auditSlideDesign(
  snapshot: DeckSnapshot,
  options: DesignAuditOptions = {},
  images: Record<string, ImageMeasurement> = {},
): DesignAuditReport {
  validateDesignAuditOptions(options);
  const allPages = snapshot.pages.filter(
    (page) => page.state === 'active' && page.metadata.hidden !== true,
  );
  const language =
    options.language ??
    (allPages.some((page) =>
      page.data.elements.some((element) => /[\u3400-\u9fff]/.test(textOf(element))),
    )
      ? 'zh-CN'
      : 'en');
  const width = snapshot.size[0];
  if (!Number.isFinite(width) || width <= 0)
    throw new PptdError('INVALID_DOCUMENT', 'Design audit requires a positive canvas width.');
  const scale = 960 / width;
  const findings: DesignAuditFinding[] = [];
  let findingCount = 0;
  const append = (
    page: PageSnapshot,
    finding: Omit<DesignAuditFinding, 'pageId' | 'occurrenceId'>,
  ) => {
    findingCount++;
    if (findings.length < 500)
      findings.push({
        ...finding,
        pageId: page.pageId,
        ...(page.occurrenceId ? { occurrenceId: page.occurrenceId } : {}),
      });
  };
  const pages = allPages.slice(0, 500).map((page, index): DesignAuditPage => {
    const theme = record(page.metadata.themeOverride ?? snapshot.manifest.theme);
    const visibleElements = page.data.elements.filter(visible);
    const elements = visibleElements.slice(0, 500);
    const texts = elements.filter((element) => element.elementType === 'text' && textOf(element));
    const titleOnly = visibleElements.length === 1 && texts.length === 1;
    const pageRole =
      typeof page.metadata.designIntent?.pageRole === 'string'
        ? page.metadata.designIntent.pageRole
        : titleOnly
          ? 'section'
          : 'content';
    const background = record(page.data.background);
    const backgroundColor =
      background.type === 'image'
        ? 'image'
        : background.type === 'gradient'
          ? 'gradient'
          : color(background.color, theme);
    const text = texts.map((element, textIndex) => {
      const direct = record(element.content);
      const key = typeof direct.style === 'string' ? direct.style.replace(/^\$/, '') : '';
      const content = { ...record(record(theme.textStyles)[key]), ...direct };
      const declared =
        page.metadata.elementRoles?.[element.elementId] ??
        (typeof element.role === 'string' ? element.role : undefined);
      const role =
        declared ??
        (titleOnly || (textIndex === 0 && (element.bounds?.[1] ?? 0) * scale < 110)
          ? 'title'
          : 'body');
      const fontSize = finite(content.fontSize, 18);
      const normalizedSize = round(fontSize * scale);
      const isTitle = /title|heading/.test(role);
      const exempt = /caption|label|footer|footnote|figure|annotation/.test(role);
      const limit = isTitle
        ? pageRole === 'cover'
          ? 72
          : pageRole === 'section' || pageRole === 'divider'
            ? 42
            : (options.maxTitleSize ?? (language === 'zh-CN' ? 30 : 34))
        : (options.maxBodySize ?? (language === 'zh-CN' ? 20 : 22));
      if (!exempt && normalizedSize > limit)
        append(page, {
          code: 'DESIGN_LARGE_TYPE',
          severity: 'warning',
          message: `${isTitle ? 'Title' : 'Body'} type is ${normalizedSize} at 960-wide scale. Inspect visual weight and line breaks.`,
          elementId: element.elementId,
          measured: normalizedSize,
          recommended: limit,
        });
      if (!isTitle && !exempt && content.bold === true && textOf(element).length > 35)
        append(page, {
          code: 'DESIGN_HEAVY_PARAGRAPH',
          severity: 'info',
          message:
            'A long text block is entirely bold. Consider regular body text with selective emphasis.',
          elementId: element.elementId,
        });
      return {
        elementId: element.elementId,
        role,
        fontSize,
        normalizedSize,
        bold: content.bold === true,
      };
    });
    const imageElements = elements.filter((element) => element.elementType === 'image');
    if (background.type === 'image')
      imageElements.push({
        ...background,
        elementId: '$background',
        elementType: 'image',
        bounds: [0, 0, snapshot.size[0], snapshot.size[1]],
      });
    const measuredImages = imageElements.map((element): DesignAuditPage['images'][number] => {
      const source = typeof element.src === 'string' ? element.src : '';
      const measurement = images[source];
      const base = { elementId: element.elementId, source };
      if (measurement?.vector) return { ...base, status: 'vector' };
      const bounds = element.bounds;
      if (!measurement || !bounds?.every(Number.isFinite) || bounds[2] <= 0 || bounds[3] <= 0)
        return { ...base, status: 'unmeasured' };
      const crop = record(element.crop);
      const visibleWidth = measurement.width * (1 - finite(crop.left, 0) - finite(crop.right, 0));
      const visibleHeight = measurement.height * (1 - finite(crop.top, 0) - finite(crop.bottom, 0));
      if (visibleWidth <= 0 || visibleHeight <= 0) return { ...base, status: 'unmeasured' };
      const targetScale = 1920 / width;
      const ratios = [
        visibleWidth / (bounds[2] * targetScale),
        visibleHeight / (bounds[3] * targetScale),
      ];
      const sampling = round(
        record(element.fit).mode === 'contain' ? Math.max(...ratios) : Math.min(...ratios),
      );
      if (sampling < 1)
        append(page, {
          code: 'DESIGN_LOW_RESOLUTION',
          severity: 'warning',
          message: `Raster source supplies ${sampling} source pixels per output pixel at 1920-wide delivery. Recapture or reduce its displayed size.`,
          elementId: element.elementId,
          measured: sampling,
          recommended: 1,
        });
      return { ...base, status: 'measured', sampling };
    });
    if (
      options.expectedBackground !== undefined &&
      backgroundColor !== color(options.expectedBackground, {}) &&
      !page.metadata.designIntent?.backgroundException
    )
      append(page, {
        code: 'DESIGN_BACKGROUND_MISMATCH',
        severity: 'warning',
        message:
          'Page background differs from the requested deck color; record an intentional exception or align it.',
        measured: backgroundColor,
        recommended: color(options.expectedBackground, {}),
      });
    return {
      pageId: page.pageId,
      ...(page.occurrenceId ? { occurrenceId: page.occurrenceId } : {}),
      ...(page.versionId ? { versionId: page.versionId } : {}),
      pageRevision: page.pageRevision,
      renderRevision: page.renderRevision,
      elementsTruncated: visibleElements.length > elements.length,
      position: index + 1,
      title: textOf(
        texts.find((element) =>
          /title|heading/.test(page.metadata.elementRoles?.[element.elementId] ?? ''),
        ) ??
          texts[0] ?? { elementId: '', elementType: 'text' },
      ).slice(0, 160),
      pageRole,
      titleOnly,
      background: backgroundColor,
      textCharacters: texts.reduce((sum, element) => sum + textOf(element).length, 0),
      text,
      images: measuredImages,
    };
  });
  const sectionStarts = (snapshot.metadata.project?.sections ?? []).flatMap((section) => {
    const pageId = section.startPageId ?? section.range?.startPageId ?? section.pageIds[0];
    const page = pages.find((item) => item.pageId === pageId);
    if (!page || section.frontMatter) return [];
    if (options.requireSectionDividers && !page.titleOnly) {
      const source = allPages.find((item) => item.pageId === pageId);
      if (source)
        append(source, {
          code: 'DESIGN_SECTION_DIVIDER_MISSING',
          severity: 'warning',
          message: `Section "${section.title}" does not begin with the requested title-only slide.`,
        });
    }
    return [{ id: section.id, title: section.title, pageId, titleOnly: page.titleOnly }];
  });
  const byId = new Map(allPages.map((page) => [page.pageId, page]));
  const editorialIssues = auditEditorialPatterns(allPages.slice(0, 500), snapshot.size);
  for (const finding of editorialIssues) {
    const page = byId.get(finding.pageId);
    if (!page) continue;
    append(page, {
      ruleId: finding.ruleId,
      code: finding.code,
      severity: finding.severity,
      message: finding.message,
      ...(finding.elementId ? { elementId: finding.elementId } : {}),
    });
  }
  const backgrounds = new Map<string, number>();
  for (const page of pages)
    backgrounds.set(page.background, (backgrounds.get(page.background) ?? 0) + 1);
  return {
    schemaVersion: 1,
    editorialStandard: {
      version: editorialGuide.version,
      sourceSha256: editorialGuide.sourceSha256,
      automatedSignals: editorialIssues.length,
    },
    deckId: snapshot.deckId,
    presentationId: snapshot.presentationId ?? null,
    revisions: {
      manifest: snapshot.manifestRevision,
      metadata: snapshot.metadataRevision,
      guidance: snapshot.projectGuidance?.revision ?? null,
    },
    language,
    pageCount: allPages.length,
    backgrounds: [...backgrounds].map(([color, count]) => ({ color, count })),
    pages,
    sectionStarts,
    findings,
    findingCount,
    truncated:
      allPages.length > pages.length ||
      findingCount > findings.length ||
      pages.some((page) => page.elementsTruncated),
    limits: { maxPages: 500, maxElementsPerPage: 500, maxFindings: 500, targetWidth: 1920 },
    visualInspectionRequired: true,
  };
}
