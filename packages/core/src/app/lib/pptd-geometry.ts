import { expandGroupIds, groupChildren } from '../../pptd/grouping';
import type { Bounds, PageSize, PptdElement } from '../../pptd/types';
import {
  type Alignment,
  alignRects,
  createSnapTargets,
  distributeRects,
  type Point,
  type Rect,
  rectsIntersect,
  rotatedRect,
} from './inspector/geometry';
import { selectionRootIds } from './pptd-keyboard';

export type AlignmentReference = 'selection' | 'slide';

export function elementRect(element: PptdElement): Rect {
  const [x, y, width, height] = element.bounds ?? [0, 0, 120, 50];
  return { x, y, width, height };
}

export function elementVisualRect(element: PptdElement): Rect {
  return rotatedRect(elementRect(element), element.rotation ?? 0);
}

export function rectBounds(rect: Rect): Bounds {
  return [rect.x, rect.y, rect.width, rect.height].map(
    (value) => Math.round(value * 10000) / 10000,
  ) as Bounds;
}

export function rootSelectedElements(
  elements: PptdElement[],
  selectedIds: string[],
): PptdElement[] {
  const ids = new Set(selectionRootIds(elements, selectedIds));
  return elements.filter((element) => ids.has(element.elementId));
}

export function snapTargetsForSelection(
  elements: PptdElement[],
  selectedIds: string[],
  size: PageSize,
) {
  const excluded = new Set(expandGroupIds(elements, selectionRootIds(elements, selectedIds)));
  const parents = new Map<string, string>();
  for (const element of elements)
    for (const child of groupChildren(element)) parents.set(child, element.elementId);
  for (const id of selectedIds) {
    let parent = parents.get(id);
    while (parent && !excluded.has(parent)) {
      excluded.add(parent);
      parent = parents.get(parent);
    }
  }
  const candidates = rootSelectedElements(
    elements,
    elements
      .filter((element) => !excluded.has(element.elementId))
      .map((element) => element.elementId),
  );
  const page = { x: 0, y: 0, width: size[0], height: size[1] };
  return createSnapTargets(
    candidates.map(elementVisualRect).filter((rect) => rectsIntersect(page, rect)),
    [page],
  );
}

function translatedBounds(elements: PptdElement[], deltas: Point[]) {
  return elements.map((element, index) => {
    const rect = elementRect(element);
    return {
      elementId: element.elementId,
      bounds: rectBounds({ ...rect, x: rect.x + deltas[index].x, y: rect.y + deltas[index].y }),
    };
  });
}

export function arrangeElementBounds(
  elements: PptdElement[],
  alignment: Alignment,
  size: PageSize,
  reference: AlignmentReference = 'selection',
) {
  const target =
    reference === 'slide' || elements.length === 1
      ? { x: 0, y: 0, width: size[0], height: size[1] }
      : undefined;
  return translatedBounds(elements, alignRects(elements.map(elementVisualRect), alignment, target));
}

export function distributeElementBounds(elements: PptdElement[], axis: 'x' | 'y') {
  return translatedBounds(elements, distributeRects(elements.map(elementVisualRect), axis));
}
