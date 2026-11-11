import { type DeckSnapshot, PptdError } from './types';

export const captureViews = ['edit', 'browse', 'outline', 'sections', 'notes', 'history'] as const;
export const captureSidebars = ['pages', 'project', 'assets', 'files'] as const;
export const captureInspectors = ['properties', 'layout', 'layers', 'story', 'checks'] as const;
export const captureLocales = ['en', 'zh-CN'] as const;
export const captureDialogs = ['none', 'export'] as const;
export const captureViewports = {
  '1440x900': { width: 1440, height: 900 },
  '1600x1000': { width: 1600, height: 1000 },
  '1920x1080': { width: 1920, height: 1080 },
} as const;

function choice<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  if (value === undefined || value === null) return fallback;
  if (typeof value !== 'string' || !allowed.includes(value as T))
    throw new PptdError('INVALID_REQUEST', 'Unsupported Editor capture state.');
  return value as T;
}

function optionalIdentity(value: unknown, field: string): string | undefined {
  if (value === undefined) return undefined;
  if (
    typeof value !== 'string' ||
    !value.trim() ||
    value.length > 160 ||
    [...value].some((character) => character.charCodeAt(0) < 32)
  )
    throw new PptdError('INVALID_REQUEST', `${field} must be an existing stable identity.`);
  return value;
}

export function editorCaptureOptions(input: Record<string, unknown>, snapshot: DeckSnapshot) {
  const allowed = new Set([
    'deckId',
    'pageId',
    'objectId',
    'view',
    'sidebar',
    'inspector',
    'locale',
    'viewport',
    'name',
    'dialog',
    'historyVersionId',
    'reviewOperationId',
  ]);
  if (Object.keys(input).some((key) => !allowed.has(key)))
    throw new PptdError('INVALID_REQUEST', 'Unsupported Editor capture option.');
  if (input.deckId !== snapshot.deckId)
    throw new PptdError('INVALID_REQUEST', 'Capture must target the bound Project deckId.');
  if (input.pageId !== undefined && typeof input.pageId !== 'string')
    throw new PptdError('INVALID_REQUEST', 'pageId must be a stable page ID or short code.');
  const requested = String(input.pageId ?? '').toLowerCase();
  const page =
    input.pageId === undefined
      ? snapshot.pages[0]
      : snapshot.pages.find(
          (item) => item.pageId === input.pageId || item.shortCode?.toLowerCase() === requested,
        );
  if (!page) throw new PptdError('INVALID_REQUEST', 'Capture requires an existing page.');
  if (
    input.objectId !== undefined &&
    (typeof input.objectId !== 'string' ||
      !page.data.elements.some((item) => item.elementId === input.objectId))
  )
    throw new PptdError(
      'INVALID_REQUEST',
      'objectId must identify an object on the captured page.',
    );
  const name = input.name ?? 'editor-capture.png';
  if (typeof name !== 'string' || !name.trim() || name.length > 180)
    throw new PptdError('INVALID_REQUEST', 'Capture name must be a short non-empty string.');
  const dialog = choice(input.dialog, captureDialogs, 'none');
  const historyVersionId = optionalIdentity(input.historyVersionId, 'historyVersionId');
  const reviewOperationId = optionalIdentity(input.reviewOperationId, 'reviewOperationId');
  if ([dialog !== 'none', !!historyVersionId, !!reviewOperationId].filter(Boolean).length > 1)
    throw new PptdError('INVALID_REQUEST', 'Choose one Export, History or operation-review state.');
  const view = choice(input.view, captureViews, historyVersionId ? 'history' : 'edit');
  if (historyVersionId && view !== 'history')
    throw new PptdError('INVALID_REQUEST', 'historyVersionId requires the History workspace.');
  return {
    deckId: snapshot.deckId,
    pageId: page.pageId,
    pageRevision: page.pageRevision,
    objectId: input.objectId as string | undefined,
    view,
    dialog,
    historyVersionId,
    reviewOperationId,
    sidebar: choice(input.sidebar, captureSidebars, 'pages'),
    inspector: choice(input.inspector, captureInspectors, 'properties'),
    locale: choice(input.locale, captureLocales, 'en'),
    viewport: choice(
      input.viewport,
      Object.keys(captureViewports) as (keyof typeof captureViewports)[],
      '1600x1000',
    ),
    name,
  };
}
