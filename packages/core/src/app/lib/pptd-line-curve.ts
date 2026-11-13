import type { Bounds, PptdElement } from '../../pptd/types';

type Point = { x: number; y: number };
export type LineCurvePatch = Pick<PptdElement, 'bounds' | 'viewBox' | 'points' | 'curve'>;

function finite(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}
function coords(element: PptdElement): Point[] {
  const [, , width, height] = element.bounds ?? [0, 0, 120, 1];
  const viewBox = Array.isArray(element.viewBox) ? element.viewBox : [width || 1, height || 1];
  const vx = finite(Number(viewBox[0]), 1) || 1;
  const vy = finite(Number(viewBox[1]), 1) || 1;
  const tokens = (typeof element.points === 'string' ? element.points : '0,0.5 1,0.5')
    .trim()
    .split(/\s+/);
  return tokens.map((token) => {
    const [x, y] = token.split(',').map(Number);
    return { x: (finite(x, 0) / vx) * width, y: (finite(y, 0) / vy) * height };
  });
}
function endpoints(element: PptdElement): [Point, Point] {
  const [x, y] = element.bounds ?? [0, 0, 120, 1];
  const points = coords(element);
  const first = points[0] ?? { x: 0, y: 0 };
  const last = points.at(-1) ?? { x: 120, y: 1 };
  return [
    { x: x + first.x, y: y + first.y },
    { x: x + last.x, y: y + last.y },
  ];
}

export function lineBendPercent(element: PptdElement): number {
  if (element.curve !== 'smooth') return 30;
  const points = coords(element);
  if (points.length !== 3) return 30; // Preserve an imported cubic unless edited.
  const [start, control, end] = points;
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared < 0.01) return 30;
  return Math.round(
    (((control.x - (start.x + end.x) / 2) * dy - (control.y - (start.y + end.y) / 2) * dx) /
      lengthSquared) *
      100,
  );
}

/** Convert an existing line or update its quadratic bow without moving its endpoints. */
export function lineCurvePatch(
  element: PptdElement,
  curve: 'sharp' | 'smooth',
  bendPercent = 30,
  pageSize?: readonly [number, number],
): LineCurvePatch {
  const [start, end] = endpoints(element);
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const ratio = Math.max(-1, Math.min(1, finite(bendPercent, 30) / 100));
  let control = {
    x: (start.x + end.x) / 2 + dy * ratio,
    y: (start.y + end.y) / 2 - dx * ratio,
  };
  if (pageSize) {
    control = {
      x: Math.max(0, Math.min(pageSize[0], control.x)),
      y: Math.max(0, Math.min(pageSize[1], control.y)),
    };
  }
  const points = curve === 'smooth' ? [start, control, end] : [start, end];
  const left = Math.min(...points.map((point) => point.x));
  const top = Math.min(...points.map((point) => point.y));
  const width = Math.max(1, Math.max(...points.map((point) => point.x)) - left);
  const height = Math.max(1, Math.max(...points.map((point) => point.y)) - top);
  const round = (value: number) => Math.round(value * 10000) / 10000;
  const bounds = [left, top, width, height].map(round) as Bounds;
  return {
    bounds,
    viewBox: [bounds[2], bounds[3]],
    points: points.map((point) => `${round(point.x - left)},${round(point.y - top)}`).join(' '),
    curve,
  };
}

export function lineSvgPath(element: PptdElement): string {
  const points = coords(element);
  if (!points.length) return '';
  const format = (p: Point) => `${p.x},${p.y}`;
  const [head, ...tail] = points;
  if (element.curve === 'smooth' && tail.length === 2)
    return `M${format(head)} Q${tail.map(format).join(' ')}`;
  if (element.curve === 'smooth' && tail.length === 3)
    return `M${format(head)} C${tail.map(format).join(' ')}`;
  return `M${format(head)}${tail.map((point) => ` L${format(point)}`).join('')}`;
}
