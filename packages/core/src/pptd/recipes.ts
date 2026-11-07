import {
  type Bounds,
  type ElementPatchOperation,
  type ElementRef,
  type MetadataPatchOperation,
  type PageSize,
  type PageSnapshot,
  type PptdElement,
  PptdError,
  type RecipeBinding,
} from './types';

export const RECIPE_NAMES = [
  'figure-with-caption',
  'two-evidence-figures',
  'figure-with-zoom',
] as const;

export type RecipeName = (typeof RECIPE_NAMES)[number];
export type RecipeOverrideGroup = 'geometry' | 'crop' | 'font' | 'appearance' | 'content' | 'asset';

const MANAGED_GROUPS = ['geometry', 'crop', 'font', 'appearance'] as const;
const SLOT_NAMES: Record<RecipeName, readonly string[]> = {
  'figure-with-caption': ['figure', 'caption', 'annotation'],
  'two-evidence-figures': ['left', 'leftCaption', 'right', 'rightCaption'],
  'figure-with-zoom': ['figure', 'zoom', 'guide', 'caption'],
};
const PARAM_NAMES = new Set([
  'margin',
  'captionGap',
  'captionHeight',
  'gap',
  'captionFontSize',
  'annotationFontSize',
  'figureFraction',
  'zoomCrop',
  'guideColor',
  'guideWidth',
]);

type RecipeParameters = {
  margin: number;
  captionGap: number;
  captionHeight: number;
  gap: number;
  captionFontSize: number;
  annotationFontSize: number;
  figureFraction: number;
  zoomCrop: { top: number; right: number; bottom: number; left: number };
  guideColor: string;
  guideWidth: number;
};

type ManagedFields = Partial<Record<RecipeOverrideGroup, Record<string, unknown>>>;
type SlotDefinition = {
  elementType: 'image' | 'text' | 'line';
  role: 'evidence' | 'caption' | 'annotation';
  fields: ManagedFields;
};

export interface CreateRecipeOptions {
  recipe: RecipeName;
  recipeVersion?: 1;
  pageId: string;
  instanceId: string;
  size: PageSize;
  assets: Record<string, string>;
  texts?: Record<string, string>;
  params?: Record<string, unknown>;
  existingElementIds?: Iterable<string>;
}

export interface CreatedRecipe {
  elements: PptdElement[];
  binding: RecipeBinding;
  elementRoles: Record<string, string>;
}

export interface ApplyRecipeOptions {
  page: PageSnapshot;
  instanceId: string;
  binding: RecipeBinding;
  size: PageSize;
  params?: Record<string, unknown>;
  reset?: { slots?: string[]; groups?: RecipeOverrideGroup[] };
}

export interface SkippedRecipeOverride extends ElementRef {
  slot: string;
  group: RecipeOverrideGroup;
  fields: string[];
}

export interface RecipePlan {
  operations: (ElementPatchOperation | MetadataPatchOperation)[];
  binding: RecipeBinding;
  skippedOverrides: SkippedRecipeOverride[];
}

function invalid(message: string): never {
  throw new PptdError('INVALID_REQUEST', message);
}

function assertInstanceId(instanceId: string): void {
  if (!/^[A-Za-z0-9_-]{1,80}$/.test(instanceId)) {
    invalid('A recipe instance ID must contain 1–80 letters, digits, underscores or hyphens.');
  }
  if (['__proto__', 'prototype', 'constructor'].includes(instanceId)) {
    invalid('This recipe instance ID is reserved.');
  }
}

function recipeName(value: string, version: number): RecipeName {
  if (!RECIPE_NAMES.includes(value as RecipeName) || version !== 1) {
    invalid(`Recipe ${value}@${version} is not supported; existing objects are unchanged.`);
  }
  return value as RecipeName;
}

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function positive(value: unknown, name: string, allowZero = false): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || (!allowZero && !value)) {
    invalid(`${name} must be a finite ${allowZero ? 'non-negative' : 'positive'} number.`);
  }
  return value;
}

function parameters(
  size: PageSize,
  current: Record<string, unknown> = {},
  changes: Record<string, unknown> = {},
): RecipeParameters {
  const width = positive(size[0], 'Page width');
  const height = positive(size[1], 'Page height');
  for (const key of Object.keys(changes)) {
    if (!PARAM_NAMES.has(key)) invalid(`Unknown layout parameter: ${key}.`);
  }
  const scale = Math.min(width / 960, height / 540);
  const values = {
    margin: 40 * scale,
    captionGap: 18 * scale,
    captionHeight: 64 * scale,
    gap: 28 * scale,
    captionFontSize: 18 * scale,
    annotationFontSize: 20 * scale,
    figureFraction: 0.72,
    guideColor: '#424242',
    guideWidth: 1.5 * scale,
    ...current,
    ...changes,
  };
  const crop = {
    top: 0.25,
    right: 0.25,
    bottom: 0.25,
    left: 0.25,
    ...record(current.zoomCrop),
    ...record(changes.zoomCrop),
  };
  for (const side of ['top', 'right', 'bottom', 'left'] as const) {
    positive(crop[side], `zoomCrop.${side}`, true);
    if (crop[side] >= 1) invalid(`zoomCrop.${side} must be less than one.`);
  }
  if (crop.left + crop.right >= 1 || crop.top + crop.bottom >= 1) {
    invalid('The zoom crop must leave a non-empty source rectangle.');
  }
  const result: RecipeParameters = {
    margin: positive(values.margin, 'margin', true),
    captionGap: positive(values.captionGap, 'captionGap', true),
    captionHeight: positive(values.captionHeight, 'captionHeight'),
    gap: positive(values.gap, 'gap', true),
    captionFontSize: positive(values.captionFontSize, 'captionFontSize'),
    annotationFontSize: positive(values.annotationFontSize, 'annotationFontSize'),
    figureFraction: positive(values.figureFraction, 'figureFraction'),
    zoomCrop: crop,
    guideColor: String(values.guideColor),
    guideWidth: positive(values.guideWidth, 'guideWidth'),
  };
  if (result.figureFraction >= 1) invalid('figureFraction must be between zero and one.');
  if (!/^(#[0-9a-f]{6}(?:[0-9a-f]{2})?|\$[A-Za-z0-9_-]+)$/i.test(result.guideColor)) {
    invalid('guideColor must be a PPTD hex color or theme color reference.');
  }
  if (
    width - 2 * result.margin - result.gap <= 0 ||
    height - 2 * result.margin - result.captionGap - result.captionHeight <= 0
  ) {
    invalid('The recipe margins, gaps and caption leave no space for the evidence.');
  }
  return result;
}

function geometry(bounds: Bounds): Record<string, unknown> {
  return { bounds, rotation: 0 };
}

function imageSlot(bounds: Bounds, crop?: RecipeParameters['zoomCrop']): SlotDefinition {
  return {
    elementType: 'image',
    role: 'evidence',
    fields: {
      geometry: geometry(bounds),
      crop: { fit: { mode: 'contain' }, ...(crop ? { crop } : {}) },
    },
  };
}

function textSlot(
  bounds: Bounds,
  fontSize: number,
  role: 'caption' | 'annotation',
): SlotDefinition {
  return {
    elementType: 'text',
    role,
    fields: {
      geometry: geometry(bounds),
      font: { 'content.fontSize': fontSize, 'content.lineHeight': 1.25 },
      appearance: { 'content.color': '#333333', 'content.align': ['left', 'top'] },
    },
  };
}

function layout(
  name: RecipeName,
  size: PageSize,
  params: RecipeParameters,
): Record<string, SlotDefinition> {
  const [width, height] = size;
  const { margin, captionGap, captionHeight, gap, captionFontSize, annotationFontSize } = params;
  const availableWidth = width - margin * 2;
  const imageHeight = height - margin * 2 - captionGap - captionHeight;
  const captionY = margin + imageHeight + captionGap;
  if (name === 'two-evidence-figures') {
    const figureWidth = (availableWidth - gap) / 2;
    const rightX = margin + figureWidth + gap;
    return {
      left: imageSlot([margin, margin, figureWidth, imageHeight]),
      leftCaption: textSlot(
        [margin, captionY, figureWidth, captionHeight],
        captionFontSize,
        'caption',
      ),
      right: imageSlot([rightX, margin, figureWidth, imageHeight]),
      rightCaption: textSlot(
        [rightX, captionY, figureWidth, captionHeight],
        captionFontSize,
        'caption',
      ),
    };
  }
  const figureWidth = (availableWidth - gap) * params.figureFraction;
  const rightX = margin + figureWidth + gap;
  const rightWidth = availableWidth - gap - figureWidth;
  if (name === 'figure-with-caption') {
    return {
      figure: imageSlot([margin, margin, figureWidth, imageHeight]),
      caption: textSlot([margin, captionY, figureWidth, captionHeight], captionFontSize, 'caption'),
      annotation: textSlot(
        [rightX, margin + imageHeight * 0.15, rightWidth, imageHeight * 0.7],
        annotationFontSize,
        'annotation',
      ),
    };
  }
  return {
    figure: imageSlot([margin, margin, figureWidth, imageHeight]),
    zoom: imageSlot([rightX, margin, rightWidth, imageHeight], params.zoomCrop),
    guide: {
      elementType: 'line',
      role: 'annotation',
      fields: {
        geometry: {
          ...geometry([margin + figureWidth, margin + imageHeight / 2, Math.max(gap, 0.1), 1]),
          viewBox: [1, 1],
          points: '0,0.5 1,0.5',
        },
        appearance: {
          curve: 'sharp',
          border: { style: 'solid', width: params.guideWidth, color: params.guideColor },
          arrow: [null, 'arrow'],
        },
      },
    },
    caption: textSlot(
      [margin, captionY, availableWidth, captionHeight],
      captionFontSize,
      'caption',
    ),
  };
}

function setPath(target: Record<string, unknown>, path: string, value: unknown): void {
  const keys = path.split('.');
  let node = target;
  for (const key of keys.slice(0, -1)) {
    if (!node[key] || typeof node[key] !== 'object') node[key] = {};
    node = node[key] as Record<string, unknown>;
  }
  node[keys[keys.length - 1]] = structuredClone(value);
}

function getPath(target: Record<string, unknown>, path: string): unknown {
  let node: unknown = target;
  for (const key of path.split('.')) node = record(node)[key];
  return node;
}

function sourceFor(name: RecipeName, slot: string, assets: Record<string, string>): string {
  const source = assets[name === 'two-evidence-figures' ? slot : 'figure'];
  if (typeof source !== 'string' || source.trim() === '')
    invalid(`Missing original image for ${slot}.`);
  return source;
}

export function createRecipe(options: CreateRecipeOptions): CreatedRecipe {
  const name = recipeName(options.recipe, options.recipeVersion ?? 1);
  assertInstanceId(options.instanceId);
  const params = parameters(options.size, {}, options.params);
  const definitions = layout(name, options.size, params);
  const taken = new Set(options.existingElementIds ?? []);
  const binding: RecipeBinding = {
    recipe: name,
    recipeVersion: 1,
    params,
    slots: {},
    overrides: {},
  };
  const elements: PptdElement[] = [];
  const elementRoles: Record<string, string> = {};
  for (const slot of SLOT_NAMES[name]) {
    const definition = definitions[slot];
    const baseId = `${options.instanceId}--${slot}`;
    let elementId = baseId;
    for (let suffix = 2; taken.has(elementId); suffix++) elementId = `${baseId}-${suffix}`;
    taken.add(elementId);
    const element: PptdElement = { elementId, elementType: definition.elementType };
    for (const fields of Object.values(definition.fields)) {
      for (const [path, value] of Object.entries(fields)) setPath(element, path, value);
    }
    if (definition.elementType === 'image') element.src = sourceFor(name, slot, options.assets);
    if (definition.elementType === 'text') {
      setPath(element, 'content.text', options.texts?.[slot] ?? '');
      setPath(element, 'content.wrap', true);
    }
    binding.slots[slot] = elementId;
    elementRoles[elementId] = definition.role;
    elements.push(element);
  }
  return { elements, binding, elementRoles };
}

export function recipeOverrideGroupsForFields(paths: string[]): RecipeOverrideGroup[] {
  const groups = new Set<RecipeOverrideGroup>();
  for (const path of paths) {
    const head = path.split('.')[0];
    if (
      [
        'bounds',
        'rotation',
        'flip',
        'points',
        'viewBox',
        'shapeName',
        'adjustments',
        'path',
      ].includes(head)
    ) {
      groups.add('geometry');
    } else if (['crop', 'fit', 'cropShape'].includes(head)) {
      groups.add('crop');
    } else if (head === 'src') {
      groups.add('asset');
    } else if (head === 'content') {
      if (path === 'content') {
        groups.add('font');
        groups.add('appearance');
        groups.add('content');
      } else if (
        /^content\.(fontSize|fontFamily|bold|italic|lineHeight|lineHeightPx|letterSpacing|style)(\.|$)/.test(
          path,
        )
      ) {
        groups.add('font');
      } else if (/^content\.(color|align|shadow|gradient|backgroundColor)(\.|$)/.test(path)) {
        groups.add('appearance');
      } else if (/^content\.(text|wrap|textDirection)(\.|$)/.test(path)) {
        groups.add('content');
      }
    } else if (['border', 'fill', 'shadow', 'opacity', 'arrow', 'curve'].includes(head)) {
      groups.add('appearance');
    }
  }
  return [...groups];
}

export function markRecipeElementOverride(
  binding: RecipeBinding,
  elementId: string,
  paths: string[],
): RecipeBinding {
  const updated = structuredClone(binding);
  const groups = recipeOverrideGroupsForFields(paths);
  for (const [slot, id] of Object.entries(updated.slots)) {
    if (id === elementId && groups.length) {
      updated.overrides[slot] = [...new Set([...(updated.overrides[slot] ?? []), ...groups])];
    }
  }
  return updated;
}

export function removeRecipeSlot(binding: RecipeBinding, elementId: string): RecipeBinding {
  const updated = structuredClone(binding);
  for (const [slot, id] of Object.entries(updated.slots)) {
    if (id === elementId) updated.slots[slot] = null;
  }
  return updated;
}

export function applyRecipe(options: ApplyRecipeOptions): RecipePlan {
  assertInstanceId(options.instanceId);
  const name = recipeName(options.binding.recipe, options.binding.recipeVersion);
  const binding = structuredClone(options.binding);
  const params = parameters(options.size, binding.params, options.params);
  binding.params = { ...binding.params, ...params };
  if (options.reset) {
    const slots = options.reset.slots ?? Object.keys(binding.slots);
    const groups = options.reset.groups ?? [...MANAGED_GROUPS];
    if (groups.some((group) => group === 'asset' || group === 'content')) {
      invalid('Layout reset cannot replace original images or scientific text.');
    }
    for (const slot of slots) {
      if (!SLOT_NAMES[name].includes(slot)) invalid(`Unknown recipe slot: ${slot}.`);
      if (binding.slots[slot]) {
        binding.overrides[slot] = (binding.overrides[slot] ?? []).filter(
          (group) => !groups.includes(group as RecipeOverrideGroup),
        );
      }
    }
  }
  const definitions = layout(name, options.size, params);
  const elements = new Map(
    options.page.data.elements.map((element) => [element.elementId, element]),
  );
  const operations: RecipePlan['operations'] = [];
  const skippedOverrides: SkippedRecipeOverride[] = [];
  for (const slot of SLOT_NAMES[name]) {
    const elementId = binding.slots[slot];
    if (!elementId) continue;
    const element = elements.get(elementId);
    if (!element) {
      binding.slots[slot] = null;
      continue;
    }
    const definition = definitions[slot];
    if (element.elementType !== definition.elementType) {
      invalid(
        `Slot ${slot} expects ${definition.elementType}, but ${elementId} is ${element.elementType}.`,
      );
    }
    const set: Record<string, unknown> = {};
    for (const [group, fields] of Object.entries(definition.fields)) {
      const changed = Object.entries(fields).filter(
        ([path, value]) => JSON.stringify(getPath(element, path)) !== JSON.stringify(value),
      );
      if (changed.length === 0) continue;
      if (binding.overrides[slot]?.includes(group)) {
        skippedOverrides.push({
          pageId: options.page.pageId,
          elementId,
          slot,
          group: group as RecipeOverrideGroup,
          fields: changed.map(([path]) => path),
        });
        continue;
      }
      for (const [path, value] of changed) set[path] = value;
    }
    if (Object.keys(set).length) {
      operations.push({ op: 'element.patch', pageId: options.page.pageId, elementId, set });
    }
  }
  operations.push({
    op: 'metadata.patch',
    pageId: options.page.pageId,
    set: { [`components.${options.instanceId}`]: binding },
  });
  return { operations, binding, skippedOverrides };
}
