import { groupChildren } from '../../pptd/grouping';
import type {
  DeckSnapshot,
  ElementPatchOperation,
  ExpectedRevisions,
  PageSnapshot,
  PptdElement,
  Revision,
} from '../../pptd/types';
import { effectiveTextContent } from './pptd-object-actions';
import {
  clearRichTextBaseline,
  clearUniformRichTextEmphasis,
  richTextBaseline,
} from './pptd-rich-text-baseline';

interface TitleTheme {
  colors?: Record<string, string>;
  textStyles?: Record<string, Record<string, unknown>>;
}

function themeFor(snapshot: DeckSnapshot, page: PageSnapshot): TitleTheme {
  const override = page.metadata.themeOverride;
  const value =
    override && typeof override === 'object' && !Array.isArray(override)
      ? override
      : snapshot.manifest.theme;
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as TitleTheme) : {};
}

export function titleLayoutObjects(page: PageSnapshot, independent = false): PptdElement[] {
  const grouped = independent ? new Set(page.data.elements.flatMap(groupChildren)) : new Set();
  return page.data.elements.filter(
    (element) => element.elementType === 'text' && !grouped.has(element.elementId),
  );
}

function finite(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export interface CapturedTitleStyle {
  referencePageId: string;
  referenceElementId: string;
  referencePageRevision: Revision;
  fields: Record<string, unknown>;
}

export function captureTitleStyle(
  snapshot: DeckSnapshot,
  referencePageId: string,
  referenceElementId: string,
): CapturedTitleStyle {
  const reference = snapshot.pages.find(
    (page) => page.pageId === referencePageId && page.state === 'active',
  );
  const source =
    reference &&
    titleLayoutObjects(reference).find((element) => element.elementId === referenceElementId);
  if (!reference || !source) throw new Error('Choose a reference Slide and its title text object.');
  if (
    !Array.isArray(source.bounds) ||
    source.bounds.length !== 4 ||
    !source.bounds.every(Number.isFinite) ||
    source.bounds[2] <= 0 ||
    source.bounds[3] <= 0
  )
    throw new Error('The reference title needs a valid position and size.');
  const theme = themeFor(snapshot, reference);
  const effective = effectiveTextContent(source, theme);
  const effectiveColor = typeof effective.color === 'string' ? effective.color : '#000000';
  const content = richTextBaseline(
    {
      fontFamily: 'MiSans, Arial, sans-serif',
      fontSize: 18,
      align: ['left', 'top'],
      lineHeight: 1,
      letterSpacing: 0,
      ...effective,
      color: effectiveColor.startsWith('$')
        ? (theme.colors?.[effectiveColor.slice(1)] ?? '#000000')
        : effectiveColor,
    },
    theme.colors,
  );
  const family = content.fontFamily;
  const color = typeof content.color === 'string' ? content.color : '#000000';
  const fields: Record<string, unknown> = {
    bounds: [...source.bounds],
    rotation: finite(source.rotation, 0),
    'content.fontFamily': structuredClone(
      typeof family === 'string' || (family && typeof family === 'object' && !Array.isArray(family))
        ? family
        : 'MiSans, Arial, sans-serif',
    ),
    'content.fontSize': finite(content.fontSize, 18),
    'content.bold': content.bold === true,
    'content.italic': content.italic === true,
    'content.underline': content.underline === true,
    'content.color': color.startsWith('$') ? (theme.colors?.[color.slice(1)] ?? '#000000') : color,
    'content.align': structuredClone(
      Array.isArray(content.align) ? content.align : ['left', 'top'],
    ),
    'content.lineHeight': finite(content.lineHeight, 1),
    'content.letterSpacing': finite(content.letterSpacing, 0),
    'content.wrap': content.wrap !== false,
    'content.textDirection': content.textDirection === 'vertical' ? 'vertical' : 'horizontal',
  };
  if (typeof content.lineHeightPx === 'number' && Number.isFinite(content.lineHeightPx))
    fields['content.lineHeightPx'] = content.lineHeightPx;
  return {
    referencePageId: reference.pageId,
    referenceElementId: source.elementId,
    referencePageRevision: reference.pageRevision,
    fields,
  };
}

type TitleStyleChangeOptions = {
  snapshot: DeckSnapshot;
  targetPage: PageSnapshot;
  targetElementId: string;
} & (
  | { capturedStyle: CapturedTitleStyle; referencePageId?: never; referenceElementId?: never }
  | { capturedStyle?: never; referencePageId: string; referenceElementId: string }
);

export function createTitleStyleChange(options: TitleStyleChangeOptions): {
  operations: ElementPatchOperation[];
  expected: ExpectedRevisions;
} {
  const { snapshot, targetPage, targetElementId } = options;
  let captured = options.capturedStyle;
  if (!captured) {
    if (
      typeof options.referencePageId !== 'string' ||
      typeof options.referenceElementId !== 'string'
    )
      throw new Error('Choose a reference Slide and its title text object.');
    captured = captureTitleStyle(snapshot, options.referencePageId, options.referenceElementId);
  }
  const target = titleLayoutObjects(targetPage, true).find(
    (element) => element.elementId === targetElementId,
  );
  if (!target) throw new Error('Choose an independent title text object on the current Slide.');
  if (
    targetPage.state !== 'active' ||
    targetPage.versionId ||
    !snapshot.pages.some((page) => page.pageId === targetPage.pageId && page.state === 'active')
  )
    throw new Error('Apply a title style to an editable Main Slide.');
  if (
    captured.referencePageId === targetPage.pageId &&
    captured.referenceElementId === target.elementId
  )
    throw new Error('Choose a different reference title.');
  const set = structuredClone(captured.fields);
  const unset: string[] = [];
  if (!Object.hasOwn(set, 'content.lineHeightPx')) {
    if (typeof target.content?.style === 'string' && target.content.style) {
      // A styled target may inherit pixel spacing now or after a theme edit.
      set['content.lineHeightPx'] =
        finite(set['content.fontSize'], 18) * finite(set['content.lineHeight'], 1);
    } else unset.push('content.lineHeightPx');
  }
  if (typeof target.content?.text === 'string') {
    const text = clearRichTextBaseline(clearUniformRichTextEmphasis(target.content.text), [
      'fontFamily',
      'fontSize',
      'color',
      'align',
      'lineHeight',
      'lineHeightPx',
      'letterSpacing',
    ]);
    if (text !== target.content.text) set['content.text'] = text;
  }
  return {
    operations: [
      {
        op: 'element.patch',
        pageId: targetPage.pageId,
        elementId: target.elementId,
        set,
        ...(unset.length ? { unset } : {}),
      },
    ],
    expected: {
      pages: {
        [targetPage.pageId]: targetPage.pageRevision,
      },
      // The writer checks this only when the target belongs to a recipe binding.
      metadata: snapshot.metadataRevision,
    },
  };
}
