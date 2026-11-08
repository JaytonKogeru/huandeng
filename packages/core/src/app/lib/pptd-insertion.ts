import type { Bounds, PageSize, PptdElement } from '../../pptd/types';
import { uiText as t } from './huandeng-locale';

export type InsertionTool =
  | { kind: 'text' }
  | { kind: 'shape'; shapeName: string }
  | { kind: 'line'; arrow?: boolean };

export type CanvasPoint = { x: number; y: number };

export function insertionLabel(tool: InsertionTool): string {
  return t(tool.kind === 'text' ? '文字' : tool.kind === 'line' ? '线条' : '形状');
}

export function createPlacedElement(
  tool: InsertionTool,
  start: CanvasPoint,
  end: CanvasPoint,
  size: PageSize,
  options: { dragged: boolean; constrain?: boolean; elementId: string },
): PptdElement {
  const clamp = (point: CanvasPoint): CanvasPoint => ({
    x: Math.max(0, Math.min(size[0], point.x)),
    y: Math.max(0, Math.min(size[1], point.y)),
  });
  const a = clamp(start);
  let b = clamp(end);
  if (options.dragged && options.constrain) {
    if (tool.kind === 'line') {
      const length = Math.hypot(b.x - a.x, b.y - a.y);
      const angle = Math.round(Math.atan2(b.y - a.y, b.x - a.x) / (Math.PI / 4)) * (Math.PI / 4);
      const dx = length * Math.cos(angle);
      const dy = length * Math.sin(angle);
      const ratio = Math.min(
        1,
        Math.abs(dx) < 0.00001 ? 1 : (dx < 0 ? a.x : size[0] - a.x) / Math.abs(dx),
        Math.abs(dy) < 0.00001 ? 1 : (dy < 0 ? a.y : size[1] - a.y) / Math.abs(dy),
      );
      b = { x: a.x + dx * ratio, y: a.y + dy * ratio };
    } else if (tool.kind === 'shape') {
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const side = Math.min(
        Math.max(Math.abs(dx), Math.abs(dy)),
        dx < 0 ? a.x : size[0] - a.x,
        dy < 0 ? a.y : size[1] - a.y,
      );
      b = { x: a.x + (dx < 0 ? -side : side), y: a.y + (dy < 0 ? -side : side) };
    }
  }
  const defaultSize =
    tool.kind === 'text' ? [360, 56] : tool.kind === 'line' ? [200, 1] : [240, 160];
  const width = Math.min(
    size[0],
    options.dragged ? Math.max(1, Math.abs(b.x - a.x)) : defaultSize[0],
  );
  const height = Math.min(
    size[1],
    options.dragged ? Math.max(1, Math.abs(b.y - a.y)) : defaultSize[1],
  );
  const x = Math.min(size[0] - width, options.dragged ? Math.min(a.x, b.x) : a.x);
  const y = Math.min(size[1] - height, options.dragged ? Math.min(a.y, b.y) : a.y);
  const round = (value: number) => Math.round(value * 10000) / 10000;
  const bounds = [x, y, width, height].map(round) as Bounds;
  const element: PptdElement = {
    elementId: options.elementId,
    elementType: tool.kind,
    bounds,
  };
  if (tool.kind === 'text')
    element.content = { text: t('输入文字'), fontSize: 28, fontFamily: 'Arial', color: '#263531' };
  else if (tool.kind === 'shape') {
    element.shapeName = tool.shapeName;
    element.fill = { type: 'solid', color: '#dbe5df' };
    element.border = { width: 1, color: '#668374' };
  } else {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const left = Math.abs(dx) < 1 ? 0.5 : dx < 0 ? width : 0;
    const top = Math.abs(dy) < 1 ? 0.5 : dy < 0 ? height : 0;
    element.viewBox = [width, height];
    element.points = options.dragged
      ? `${round(left)},${round(top)} ${round(width - left)},${round(height - top)}`
      : `0,0.5 ${round(width)},0.5`;
    element.border = { width: 2, color: '#394d43' };
    if (tool.arrow) element.arrow = [null, 'arrow'];
  }
  return element;
}
