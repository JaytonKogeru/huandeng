import type { Bounds, PptdElement, PptdOperation } from './types';

export interface ElementFields {
  elementId: string;
  fields: Record<string, unknown>;
}

export function groupChildren(element: PptdElement): string[] {
  if (element.elementType !== 'group') return [];
  if (!Array.isArray(element.children) || !element.children.every((id) => typeof id === 'string')) {
    throw new Error(`Group ${element.elementId} must reference child element IDs.`);
  }
  return element.children as string[];
}

export function expandGroupIds(elements: PptdElement[], ids: string[]): string[] {
  const byId = new Map(elements.map((element) => [element.elementId, element]));
  const selected = new Set<string>();
  const visit = (id: string, ancestry: Set<string>) => {
    if (ancestry.has(id)) throw new Error(`Group cycle at ${id}.`);
    if (selected.has(id)) return;
    const element = byId.get(id);
    if (!element) throw new Error(`Group references missing element ${id}.`);
    selected.add(id);
    if (ancestry.size > 40) throw new Error('Group nesting is limited to 40 levels.');
    for (const child of groupChildren(element)) visit(child, new Set([...ancestry, id]));
  };
  for (const id of ids) visit(id, new Set());
  return elements
    .filter((element) => selected.has(element.elementId))
    .map((element) => element.elementId);
}

export function owningGroupId(elements: PptdElement[], id: string): string | null {
  let parent: string | null = null;
  let target = id;
  const seen = new Set([id]);
  for (;;) {
    const groups = elements.filter((element) => groupChildren(element).includes(target));
    if (groups.length > 1) throw new Error(`Element ${target} belongs to more than one group.`);
    if (!groups.length) return parent;
    parent = groups[0].elementId;
    if (seen.has(parent)) throw new Error('Group references contain a cycle.');
    seen.add(parent);
    target = parent;
  }
}

function elementExtent(element: PptdElement): Bounds {
  const [x, y, width, height] = element.bounds ?? [0, 0, 0, 0];
  const angle = ((element.rotation ?? 0) * Math.PI) / 180;
  const w = Math.abs(width * Math.cos(angle)) + Math.abs(height * Math.sin(angle));
  const h = Math.abs(width * Math.sin(angle)) + Math.abs(height * Math.cos(angle));
  return [x + (width - w) / 2, y + (height - h) / 2, w, h];
}

function unionBounds(elements: PptdElement[]): Bounds {
  if (!elements.length) throw new Error('A group needs members.');
  const bounds = elements.map(elementExtent);
  const x = Math.min(...bounds.map((rect) => rect[0]));
  const y = Math.min(...bounds.map((rect) => rect[1]));
  return [
    x,
    y,
    Math.max(1, Math.max(...bounds.map((rect) => rect[0] + rect[2])) - x),
    Math.max(1, Math.max(...bounds.map((rect) => rect[1] + rect[3])) - y),
  ];
}

export function buildGroup(elements: PptdElement[], ids: string[], groupId: string): PptdElement {
  if (elements.some((element) => element.elementId === groupId))
    throw new Error('The new group ID already exists.');
  const requested = new Set(ids);
  const expanded = new Set(expandGroupIds(elements, ids));
  const members = elements.filter(
    (element) =>
      requested.has(element.elementId) &&
      !elements.some(
        (possibleParent) =>
          requested.has(possibleParent.elementId) &&
          groupChildren(possibleParent).includes(element.elementId),
      ),
  );
  if (members.length < 2) throw new Error('Select at least two objects to group.');
  for (const element of elements) {
    if (expanded.has(element.elementId)) continue;
    if (groupChildren(element).some((id) => expanded.has(id)))
      throw new Error('Ungroup the existing parent before regrouping individual members.');
  }
  return {
    elementId: groupId,
    elementType: 'group',
    bounds: unionBounds(members),
    children: members.map((element) => element.elementId),
  };
}

export function transformGroup(
  elements: PptdElement[],
  groupId: string,
  change: { bounds?: Bounds; rotation?: number },
): ElementFields[] {
  const group = elements.find((element) => element.elementId === groupId);
  if (group?.elementType !== 'group' || !group.bounds) throw new Error('Group bounds are missing.');
  const before = group.bounds;
  const after = change.bounds ?? before;
  if (after.length !== 4 || !after.every(Number.isFinite) || after[2] <= 0 || after[3] <= 0)
    throw new Error('Group dimensions must be positive.');
  const rotation = change.rotation ?? group.rotation ?? 0;
  if (!Number.isFinite(rotation)) throw new Error('Group rotation must be finite.');
  const oldAngle = ((group.rotation ?? 0) * Math.PI) / 180;
  const newAngle = (rotation * Math.PI) / 180;
  const sx = after[2] / Math.max(1e-9, before[2]);
  const sy = after[3] / Math.max(1e-9, before[3]);
  const centerBefore = [before[0] + before[2] / 2, before[1] + before[3] / 2];
  const centerAfter = [after[0] + after[2] / 2, after[1] + after[3] / 2];
  const descendants = new Set(expandGroupIds(elements, [groupId]));
  const result: ElementFields[] = [
    { elementId: groupId, fields: { bounds: [...after], rotation } },
  ];
  for (const element of elements) {
    if (element.elementId === groupId || !descendants.has(element.elementId)) continue;
    const [x, y, width, height] = element.bounds ?? [0, 0, 0, 0];
    const dx = x + width / 2 - centerBefore[0];
    const dy = y + height / 2 - centerBefore[1];
    const localX = (dx * Math.cos(oldAngle) + dy * Math.sin(oldAngle)) * sx;
    const localY = (-dx * Math.sin(oldAngle) + dy * Math.cos(oldAngle)) * sy;
    const relative = (((element.rotation ?? 0) - (group.rotation ?? 0)) * Math.PI) / 180;
    const aligned = Math.abs(Math.sin(relative)) < 1e-8;
    const perpendicular = Math.abs(Math.cos(relative)) < 1e-8;
    if (!aligned && !perpendicular && Math.abs(sx - sy) > 1e-8) {
      throw new Error('Keep the aspect ratio when resizing a group containing rotated members.');
    }
    const nextWidth = width * (perpendicular ? sy : sx);
    const nextHeight = height * (perpendicular ? sx : sy);
    const bounds: Bounds = [
      centerAfter[0] + localX * Math.cos(newAngle) - localY * Math.sin(newAngle) - nextWidth / 2,
      centerAfter[1] + localX * Math.sin(newAngle) + localY * Math.cos(newAngle) - nextHeight / 2,
      nextWidth,
      nextHeight,
    ];
    result.push({
      elementId: element.elementId,
      fields: { bounds, rotation: (element.rotation ?? 0) + rotation - (group.rotation ?? 0) },
    });
  }
  return result;
}

export function ungroupOperations(
  pageId: string,
  elements: PptdElement[],
  groupIds: string[],
): PptdOperation[] {
  const groups = elements.filter(
    (element) => groupIds.includes(element.elementId) && element.elementType === 'group',
  );
  const removed = new Map(groups.map((group) => [group.elementId, groupChildren(group)]));
  const flatten = (ids: string[], seen = new Set<string>()): string[] =>
    ids.flatMap((id) => {
      if (seen.has(id)) throw new Error('Group references contain a cycle.');
      const children = removed.get(id);
      return children ? flatten(children, new Set([...seen, id])) : [id];
    });
  const operations: PptdOperation[] = [];
  for (const element of elements) {
    if (element.elementType !== 'group' || removed.has(element.elementId)) continue;
    const children = groupChildren(element);
    if (children.some((id) => removed.has(id)))
      operations.push({
        op: 'element.patch',
        pageId,
        elementId: element.elementId,
        set: { children: flatten(children) },
      });
  }
  const ordered: string[] = [];
  const schedule = (id: string, ancestry = new Set<string>()) => {
    if (ancestry.has(id)) throw new Error('Group references contain a cycle.');
    if (ordered.includes(id)) return;
    for (const parent of groups)
      if (groupChildren(parent).includes(id))
        schedule(parent.elementId, new Set([...ancestry, id]));
    ordered.push(id);
  };
  for (const group of groups) schedule(group.elementId);
  for (const elementId of ordered) operations.push({ op: 'element.remove', pageId, elementId });
  return operations;
}

export function duplicateElements(
  elements: PptdElement[],
  ids: string[],
  idFactory: (oldId: string) => string,
  offset = 20,
): { copies: PptdElement[]; selectedIds: string[]; idMap: Record<string, string> } {
  const allIds = new Set(expandGroupIds(elements, ids));
  const copies = elements
    .filter((element) => allIds.has(element.elementId))
    .map((element) => structuredClone(element));
  const idMap = new Map(copies.map((element) => [element.elementId, idFactory(element.elementId)]));
  const existing = new Set(elements.map((element) => element.elementId));
  if (
    new Set(idMap.values()).size !== idMap.size ||
    [...idMap.values()].some((id) => !id || existing.has(id))
  )
    throw new Error('Duplicate objects need distinct new IDs.');
  const referenceKeys = new Set([
    'children',
    'elementId',
    'elementIds',
    'sourceId',
    'targetId',
    'sourceIds',
    'targetIds',
    'parentId',
    'fromId',
    'toId',
  ]);
  const remap = (value: unknown, key = ''): unknown => {
    if (typeof value === 'string' && referenceKeys.has(key)) return idMap.get(value) ?? value;
    if (Array.isArray(value)) return value.map((entry) => remap(entry, key));
    if (value && typeof value === 'object')
      return Object.fromEntries(
        Object.entries(value).map(([child, entry]) => [child, remap(entry, child)]),
      );
    return value;
  };
  return {
    idMap: Object.fromEntries(idMap),
    copies: copies.map((element) => {
      const copy = remap(element) as PptdElement;
      if (copy.bounds)
        copy.bounds = [
          copy.bounds[0] + offset,
          copy.bounds[1] + offset,
          copy.bounds[2],
          copy.bounds[3],
        ];
      return copy;
    }),
    selectedIds: ids.map((id) => idMap.get(id)).filter((id): id is string => !!id),
  };
}
