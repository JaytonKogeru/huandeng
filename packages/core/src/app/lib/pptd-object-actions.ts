import { expandGroupIds, groupChildren } from '../../pptd/grouping';
import type { PptdElement } from '../../pptd/types';
import {
  clearRichTextBaseline,
  type RichTextBaselineField,
  richTextBaseline,
} from './pptd-rich-text-baseline';

export type LayerDirection = 'forward' | 'backward' | 'front' | 'back';

export type TextFormatCommand =
  | { type: 'format-text'; format: 'bold' | 'italic' | 'underline' }
  | { type: 'font-size'; delta: 1 | -1 }
  | { type: 'text-color'; color: string };

export type ObjectEditCommand =
  | TextFormatCommand
  | { type: 'layer'; direction: LayerDirection }
  | { type: 'paste' | 'show-properties' };

type TextTheme = { textStyles?: Record<string, Record<string, unknown>> };

export function effectiveTextContent(element: PptdElement, theme: TextTheme = {}) {
  const content = element.content ?? {};
  const style = typeof content.style === 'string' ? content.style.replace(/^\$/, '') : '';
  return { ...theme.textStyles?.[style], ...content };
}

export function textPropertyPatch(
  element: PptdElement,
  fields: Record<string, unknown>,
): Record<string, unknown> {
  const source = element.content?.text;
  if (element.elementType !== 'text' || typeof source !== 'string' || 'content.text' in fields)
    return fields;
  const names: RichTextBaselineField[] = [
    'fontFamily',
    'fontSize',
    'color',
    'align',
    'lineHeight',
    'lineHeightPx',
    'letterSpacing',
  ];
  const changed = names.filter((name) => `content.${name}` in fields);
  if (!changed.length) return fields;
  const text = clearRichTextBaseline(source, changed);
  return text === source ? fields : { ...fields, 'content.text': text };
}

export function textFormatPatches(
  elements: PptdElement[],
  selectedIds: string[],
  command: TextFormatCommand,
  theme: TextTheme = {},
): { elementId: string; fields: Record<string, unknown> }[] {
  const ids = new Set(selectedIds);
  const text = elements.filter((item) => ids.has(item.elementId) && item.elementType === 'text');
  if (!text.length) return [];
  if (command.type === 'text-color' && !/^#[\da-f]{6}$/i.test(command.color))
    throw new Error('Choose a six-digit text color.');
  const enabled =
    command.type === 'format-text' &&
    !text.every((item) => effectiveTextContent(item, theme)[command.format] === true);
  return text.map((item) => {
    const content = effectiveTextContent(item, theme);
    if (command.type === 'format-text')
      return { elementId: item.elementId, fields: { [`content.${command.format}`]: enabled } };
    if (command.type === 'text-color')
      return {
        elementId: item.elementId,
        fields: textPropertyPatch(item, { 'content.color': command.color }),
      };
    const visible = richTextBaseline(content, {}, ['fontSize']);
    const size =
      typeof visible.fontSize === 'number' && Number.isFinite(visible.fontSize)
        ? visible.fontSize
        : 18;
    return {
      elementId: item.elementId,
      fields: textPropertyPatch(item, {
        'content.fontSize': Math.max(1, Math.min(400, size + command.delta * 2)),
      }),
    };
  });
}

export function reorderElementIds(
  elements: PptdElement[],
  selectedIds: string[],
  direction: LayerDirection,
): string[] {
  let order = elements.map((element) => element.elementId);
  const byId = new Map(elements.map((element) => [element.elementId, element]));
  const parent = new Map<string, string>();
  for (const element of elements)
    for (const id of groupChildren(element)) parent.set(id, element.elementId);
  const selected = new Set(selectedIds.filter((id) => byId.has(id)));
  for (const id of [...selected]) {
    const ancestors = new Set<string>();
    for (let owner = parent.get(id); owner; owner = parent.get(owner)) {
      if (ancestors.has(owner)) throw new Error('Group references contain a cycle.');
      ancestors.add(owner);
      if (selected.has(owner)) {
        selected.delete(id);
        break;
      }
    }
  }
  const scopes = new Set([...selected].map((id) => parent.get(id)));
  for (const scope of scopes) {
    const units = elements
      .filter((element) => parent.get(element.elementId) === scope)
      .map((element) => ({
        id: element.elementId,
        members: new Set(expandGroupIds(elements, [element.elementId])),
      }))
      .sort(
        (a, b) =>
          order.findIndex((id) => a.members.has(id)) - order.findIndex((id) => b.members.has(id)),
      );
    const next = [...units];
    if (direction === 'front' || direction === 'back') {
      const chosen = next.filter((unit) => selected.has(unit.id));
      const rest = next.filter((unit) => !selected.has(unit.id));
      next.splice(
        0,
        next.length,
        ...(direction === 'front' ? [...rest, ...chosen] : [...chosen, ...rest]),
      );
    } else if (direction === 'forward') {
      for (let index = next.length - 2; index >= 0; index--)
        if (selected.has(next[index].id) && !selected.has(next[index + 1].id))
          [next[index], next[index + 1]] = [next[index + 1], next[index]];
    } else {
      for (let index = 1; index < next.length; index++)
        if (selected.has(next[index].id) && !selected.has(next[index - 1].id))
          [next[index - 1], next[index]] = [next[index], next[index - 1]];
    }
    if (next.every((unit, index) => unit === units[index])) continue;
    const moving = new Set(
      next.filter((unit) => selected.has(unit.id)).flatMap((unit) => [...unit.members]),
    );
    const original = order;
    order = order.filter((id) => !moving.has(id));
    let pending: string[] = [];
    // Only selected subtrees move; unrelated and legacy interleaved layers retain their relative order.
    for (const unit of next) {
      if (selected.has(unit.id)) pending.push(...original.filter((id) => unit.members.has(id)));
      else if (pending.length) {
        order.splice(
          order.findIndex((id) => unit.members.has(id)),
          0,
          ...pending,
        );
        pending = [];
      }
    }
    if (pending.length) {
      const siblings = new Set(units.flatMap((unit) => [...unit.members]));
      const after = order.reduce((last, id, index) => (siblings.has(id) ? index : last), -1);
      order.splice(after + 1, 0, ...pending);
    }
  }
  return order;
}
