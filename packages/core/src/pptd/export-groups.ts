import { escapeXml } from '../app/lib/pptx/ooxml';
import { expandGroupIds, groupChildren } from './grouping';
import type { PageSize, PptdElement } from './types';

interface NativeGroup {
  element: PptdElement;
  members: Set<string>;
}

export interface NativeGroupPlan {
  groups: NativeGroup[];
  nativeIds: Set<string>;
}

export function planNativeGroups(elements: PptdElement[]): NativeGroupPlan {
  const byId = new Map(elements.map((element) => [element.elementId, element]));
  const visible = elements.filter((element) => element.elementType !== 'group');
  const visited = new Set<string>();
  const groups: NativeGroup[] = [];
  const owners = new Set<string>();
  for (const element of elements) {
    for (const child of groupChildren(element)) {
      if (owners.has(child)) throw new Error(`Element ${child} belongs to more than one group.`);
      owners.add(child);
    }
  }
  const visit = (element: PptdElement) => {
    if (visited.has(element.elementId)) return;
    const members = new Set(expandGroupIds(elements, [element.elementId]));
    visited.add(element.elementId);
    for (const child of groupChildren(element)) {
      const member = byId.get(child);
      if (member?.elementType === 'group') visit(member);
    }
    const positions = visible.flatMap((member, index) =>
      members.has(member.elementId) ? [index] : [],
    );
    if (positions.length && positions[positions.length - 1] - positions[0] + 1 === positions.length)
      groups.push({ element, members });
  };
  for (const element of elements) if (element.elementType === 'group') visit(element);
  return { groups, nativeIds: new Set(groups.map((group) => group.element.elementId)) };
}

function topLevelNodes(xml: string): string[] {
  const nodes: string[] = [];
  let depth = 0;
  let start = 0;
  for (const token of xml.matchAll(/<[^>]*>/g)) {
    const text = token[0];
    if (text.startsWith('</')) depth--;
    else if (!text.endsWith('/>') && !text.startsWith('<?') && !text.startsWith('<!')) depth++;
    if (depth < 0) throw new Error('Invalid native slide tree.');
    if (depth === 0) {
      const end = token.index + text.length;
      nodes.push(xml.slice(start, end));
      start = end;
    }
  }
  if (depth !== 0 || xml.slice(start).trim()) throw new Error('Unbalanced native slide tree.');
  return nodes;
}

export function wrapNativeGroups(xml: string, plan: NativeGroupPlan, size: PageSize): string {
  if (!plan.groups.length) return xml;
  let nextId =
    Math.max(
      ...[...xml.matchAll(/<p:cNvPr\b[^>]*\bid="(\d+)"/g)].map((match) => Number(match[1])),
    ) + 1;
  return xml.replace(
    /(<p:spTree>)([\s\S]*?)(<\/p:spTree>)/,
    (_match, start: string, content: string, end: string) => {
      const nodes = topLevelNodes(content);
      for (const group of plan.groups) {
        const names = new Set([...group.members].map((id) => escapeXml(id.slice(0, 200))));
        const positions = nodes.flatMap((node, index) =>
          names.has(node.match(/<p:cNvPr\b[^>]*\bname="([^"]*)"/)?.[1] ?? '') ? [index] : [],
        );
        if (
          !positions.length ||
          positions[positions.length - 1] - positions[0] + 1 !== positions.length
        )
          throw new Error(
            `Native grouping would change the stacking order of ${group.element.elementId}.`,
          );
        const bounds = group.element.bounds ?? [0, 0, size[0], size[1]];
        const [x, y, width, height] = bounds.map((value) => Math.round(value * 12700));
        if (![x, y, width, height].every(Number.isFinite) || width <= 0 || height <= 0)
          throw new Error(`Native group ${group.element.elementId} has invalid bounds.`);
        const children = nodes.splice(positions[0], positions.length).join('');
        // Children already carry PPTD group transforms. Equal frame/child coordinates preserve them exactly.
        const transform = `<a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${width}" cy="${height}"/><a:chOff x="${x}" y="${y}"/><a:chExt cx="${width}" cy="${height}"/></a:xfrm>`;
        nodes.splice(
          positions[0],
          0,
          `<p:grpSp><p:nvGrpSpPr><p:cNvPr id="${nextId++}" name="${escapeXml(group.element.elementId.slice(0, 200))}"/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr>${transform}</p:grpSpPr>${children}</p:grpSp>`,
        );
      }
      return start + nodes.join('') + end;
    },
  );
}
