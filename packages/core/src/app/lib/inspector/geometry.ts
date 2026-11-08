export type Point = { x: number; y: number };

export type Rect = Point & { width: number; height: number };

export type Alignment = 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom';

export type Guide = {
  axis: 'x' | 'y';
  position: number;
  start: number;
  end: number;
};

export type GapGuide = {
  axis: 'x' | 'y';
  position: number;
  start: number;
  end: number;
  distance: number;
};

type GapTarget = {
  axis: 'x' | 'y';
  before: Rect;
  after: Rect;
  start: number;
  end: number;
  crossStart: number;
  crossEnd: number;
};

export type SnapTargets = {
  rects: Rect[];
  objects: Rect[];
  gaps: GapTarget[];
};

export type MoveSnapResult = {
  delta: Point;
  guides: Guide[];
  gapGuides: GapGuide[];
};

export type ResizeHandle = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw';

export function unionRects(rects: Rect[]): Rect | null {
  if (!rects.length) return null;
  const x = Math.min(...rects.map((rect) => rect.x));
  const y = Math.min(...rects.map((rect) => rect.y));
  return {
    x,
    y,
    width: Math.max(...rects.map((rect) => rect.x + rect.width)) - x,
    height: Math.max(...rects.map((rect) => rect.y + rect.height)) - y,
  };
}

function anchors(rect: Rect, axis: 'x' | 'y'): number[] {
  const size = axis === 'x' ? rect.width : rect.height;
  return [rect[axis], rect[axis] + size / 2, rect[axis] + size];
}

function nearestSnap(rect: Rect, targets: Rect[], axis: 'x' | 'y', threshold: number) {
  let best: { correction: number; position: number } | null = null;
  for (const target of targets) {
    for (const position of anchors(target, axis)) {
      for (const anchor of anchors(rect, axis)) {
        const correction = position - anchor;
        const distance = Math.abs(correction);
        if (distance > threshold) continue;
        if (
          !best ||
          distance < Math.abs(best.correction) ||
          (distance === Math.abs(best.correction) && correction < best.correction) ||
          (correction === best.correction && position < best.position)
        ) {
          best = { correction, position };
        }
      }
    }
  }
  return best;
}

function guideAt(rect: Rect, targets: Rect[], axis: 'x' | 'y', position: number): Guide {
  const aligned = targets.filter((target) =>
    anchors(target, axis).some((anchor) => Math.abs(anchor - position) < 0.000001),
  );
  const bounds = unionRects([rect, ...aligned]) ?? rect;
  return {
    axis,
    position,
    start: axis === 'x' ? bounds.y : bounds.x,
    end: axis === 'x' ? bounds.y + bounds.height : bounds.x + bounds.width,
  };
}

export function snapMove(
  rect: Rect,
  delta: Point,
  targets: Rect[],
  threshold: number,
): { delta: Point; guides: Guide[] } {
  const moved = { ...rect, x: rect.x + delta.x, y: rect.y + delta.y };
  const xSnap = nearestSnap(moved, targets, 'x', threshold);
  const ySnap = nearestSnap(moved, targets, 'y', threshold);
  const snappedDelta = {
    x: delta.x + (xSnap?.correction ?? 0),
    y: delta.y + (ySnap?.correction ?? 0),
  };
  const snapped = { ...rect, x: rect.x + snappedDelta.x, y: rect.y + snappedDelta.y };
  const guides: Guide[] = [];
  for (const axis of ['x', 'y'] as const) {
    const snap = axis === 'x' ? xSnap : ySnap;
    if (!snap) continue;
    guides.push(guideAt(snapped, targets, axis, snap.position));
  }
  return { delta: snappedDelta, guides };
}

export function rotatedRect(rect: Rect, degrees: number): Rect {
  const radians = (degrees * Math.PI) / 180;
  const width =
    Math.abs(rect.width * Math.cos(radians)) + Math.abs(rect.height * Math.sin(radians));
  const height =
    Math.abs(rect.width * Math.sin(radians)) + Math.abs(rect.height * Math.cos(radians));
  return {
    x: rect.x + (rect.width - width) / 2,
    y: rect.y + (rect.height - height) / 2,
    width,
    height,
  };
}

export function createSnapTargets(rects: Rect[], alignmentOnly: Rect[] = []): SnapTargets {
  const ordered = rects
    .map((rect) => ({ ...rect }))
    .sort((a, b) => a.x - b.x || a.y - b.y || a.width - b.width || a.height - b.height);
  const unique = ordered.filter(
    (rect, index) =>
      !index ||
      rect.x !== ordered[index - 1].x ||
      rect.y !== ordered[index - 1].y ||
      rect.width !== ordered[index - 1].width ||
      rect.height !== ordered[index - 1].height,
  );
  const gaps: GapTarget[] = [];
  for (const axis of ['x', 'y'] as const) {
    const cross = axis === 'x' ? 'y' : 'x';
    const extent = axis === 'x' ? 'width' : 'height';
    const crossExtent = axis === 'x' ? 'height' : 'width';
    const sorted = [...unique].sort((a, b) => a[axis] - b[axis] || a[cross] - b[cross]);
    // Bound spacing work per gesture; edge and centre references still include every object.
    let remaining = 100_000;
    for (let index = 0; index < sorted.length && remaining > 0; index++) {
      const before = sorted[index];
      let nearest = Number.POSITIVE_INFINITY;
      for (let next = index + 1; next < sorted.length && remaining-- > 0; next++) {
        const after = sorted[next];
        if (after[axis] > nearest) break;
        const start = before[axis] + before[extent];
        const end = after[axis];
        if (end <= start) continue;
        const crossStart = Math.max(before[cross], after[cross]);
        const crossEnd = Math.min(
          before[cross] + before[crossExtent],
          after[cross] + after[crossExtent],
        );
        if (crossEnd <= crossStart) continue;
        nearest = end;
        let blocked = false;
        for (const rect of unique) {
          if (--remaining < 0) {
            blocked = true;
            break;
          }
          if (
            rect !== before &&
            rect !== after &&
            rect[axis] < end &&
            rect[axis] + rect[extent] > start &&
            rect[cross] < crossEnd &&
            rect[cross] + rect[crossExtent] > crossStart
          ) {
            blocked = true;
            break;
          }
        }
        if (!blocked) gaps.push({ axis, before, after, start, end, crossStart, crossEnd });
      }
    }
  }
  return {
    rects: [...unique, ...alignmentOnly.map((rect) => ({ ...rect }))],
    objects: unique,
    gaps,
  };
}

type GapSnap = {
  target: GapTarget;
  mode: 'before' | 'between' | 'after';
  correction: number;
};

function gapIntersects(rect: Rect, target: GapTarget): boolean {
  const cross = target.axis === 'x' ? 'y' : 'x';
  const size = target.axis === 'x' ? rect.height : rect.width;
  return rect[cross] < target.crossEnd && rect[cross] + size > target.crossStart;
}

function gapPlacementIsClear(rect: Rect, objects: Rect[]): boolean {
  return !objects.some(
    (target) =>
      rect.x < target.x + target.width - 1e-6 &&
      rect.x + rect.width > target.x + 1e-6 &&
      rect.y < target.y + target.height - 1e-6 &&
      rect.y + rect.height > target.y + 1e-6,
  );
}

function nearestGap(
  rect: Rect,
  targets: SnapTargets,
  axis: 'x' | 'y',
  threshold: number,
): GapSnap | null {
  let best: GapSnap | null = null;
  const size = axis === 'x' ? rect.width : rect.height;
  const extent = axis === 'x' ? 'width' : 'height';
  for (const target of targets.gaps) {
    if (target.axis !== axis || !gapIntersects(rect, target)) continue;
    const gap = target.end - target.start;
    const candidates: [GapSnap['mode'], number][] = [
      ['before', target.before[axis] - gap - size],
      ['after', target.after[axis] + target.after[extent] + gap],
    ];
    if (gap > size) candidates.push(['between', target.start + (gap - size) / 2]);
    for (const [mode, position] of candidates) {
      const correction = position - rect[axis];
      if (Math.abs(correction) > threshold) continue;
      if (!gapPlacementIsClear({ ...rect, [axis]: position }, targets.objects)) continue;
      if (
        !best ||
        Math.abs(correction) < Math.abs(best.correction) ||
        (Math.abs(correction) === Math.abs(best.correction) && correction < best.correction)
      )
        best = { target, mode, correction };
    }
  }
  return best;
}

function gapGuidesAt(rect: Rect, snap: GapSnap): GapGuide[] {
  const { target, mode } = snap;
  const { axis } = target;
  const cross = axis === 'x' ? 'y' : 'x';
  const size = axis === 'x' ? rect.width : rect.height;
  const extent = axis === 'x' ? 'width' : 'height';
  const crossExtent = axis === 'x' ? rect.height : rect.width;
  const position =
    (Math.max(rect[cross], target.crossStart) +
      Math.min(rect[cross] + crossExtent, target.crossEnd)) /
    2;
  const spans =
    mode === 'between'
      ? [
          [target.start, rect[axis]],
          [rect[axis] + size, target.end],
        ]
      : [
          [target.start, target.end],
          mode === 'before'
            ? [rect[axis] + size, target.before[axis]]
            : [target.after[axis] + target.after[extent], rect[axis]],
        ];
  return spans.map(([start, end]) => ({ axis, position, start, end, distance: end - start }));
}

export function snapMoveWithSpacing(
  rect: Rect,
  delta: Point,
  targets: SnapTargets,
  threshold: number,
  axes: { x: boolean; y: boolean } = { x: true, y: true },
): MoveSnapResult {
  const moved = { ...rect, x: rect.x + delta.x, y: rect.y + delta.y };
  const points = {
    x: axes.x ? nearestSnap(moved, targets.rects, 'x', threshold) : null,
    y: axes.y ? nearestSnap(moved, targets.rects, 'y', threshold) : null,
  };
  const gaps = {
    x: axes.x ? nearestGap(moved, targets, 'x', threshold) : null,
    y: axes.y ? nearestGap(moved, targets, 'y', threshold) : null,
  };
  for (const axis of ['x', 'y'] as const) {
    const point = points[axis];
    const gap = gaps[axis];
    if (point && gap && Math.abs(point.correction) <= Math.abs(gap.correction)) gaps[axis] = null;
  }
  const snappedRect = () => ({
    ...moved,
    x: moved.x + (gaps.x?.correction ?? points.x?.correction ?? 0),
    y: moved.y + (gaps.y?.correction ?? points.y?.correction ?? 0),
  });
  for (let pass = 0; pass < 2; pass++) {
    const snapped = snappedRect();
    for (const axis of ['x', 'y'] as const) {
      const gap = gaps[axis];
      if (
        gap &&
        (!gapIntersects(snapped, gap.target) || !gapPlacementIsClear(snapped, targets.objects))
      )
        gaps[axis] = null;
    }
  }
  const snapped = snappedRect();
  const guides: Guide[] = [];
  const gapGuides: GapGuide[] = [];
  for (const axis of ['x', 'y'] as const) {
    const gap = gaps[axis];
    const point = points[axis];
    if (gap) gapGuides.push(...gapGuidesAt(snapped, gap));
    else if (point) guides.push(guideAt(snapped, targets.rects, axis, point.position));
  }
  return { delta: { x: snapped.x - rect.x, y: snapped.y - rect.y }, guides, gapGuides };
}

export function snapResize(
  rect: Rect,
  handle: ResizeHandle,
  delta: Point,
  targets: Rect[],
  threshold: number,
  lockAspect = false,
): { rect: Rect; guides: Guide[] } {
  const raw = resizeRect(rect, handle, delta, lockAspect);
  const west = handle.includes('w');
  const east = handle.includes('e');
  const north = handle.includes('n');
  const south = handle.includes('s');
  const point = {
    x: west ? raw.x : raw.x + raw.width,
    y: north ? raw.y : raw.y + raw.height,
    width: 0,
    height: 0,
  };
  const xSnap = west || east ? nearestSnap(point, targets, 'x', threshold) : null;
  const ySnap = north || south ? nearestSnap(point, targets, 'y', threshold) : null;
  let snapped = { ...raw };
  if (lockAspect && rect.width > 0 && rect.height > 0) {
    const candidates = [
      xSnap && {
        scale: (west ? rect.x + rect.width - xSnap.position : xSnap.position - rect.x) / rect.width,
      },
      ySnap && {
        scale:
          (north ? rect.y + rect.height - ySnap.position : ySnap.position - rect.y) / rect.height,
      },
    ].filter(
      (candidate) => candidate && candidate.scale >= Math.max(8 / rect.width, 8 / rect.height),
    );
    let distance = Number.POSITIVE_INFINITY;
    for (const candidate of candidates) {
      if (!candidate) continue;
      const size = resizeRect(
        rect,
        handle,
        {
          x: (west ? -1 : east ? 1 : 0) * rect.width * (candidate.scale - 1),
          y: (north ? -1 : south ? 1 : 0) * rect.height * (candidate.scale - 1),
        },
        true,
      );
      const dx = west || east ? (west ? size.x : size.x + size.width) - point.x : 0;
      const dy = north || south ? (north ? size.y : size.y + size.height) - point.y : 0;
      if (Math.abs(dx) > threshold + 1e-6 || Math.abs(dy) > threshold + 1e-6) continue;
      const nextDistance = Math.hypot(dx, dy);
      if (nextDistance < distance) {
        distance = nextDistance;
        snapped = size;
      }
    }
  } else {
    if (xSnap) {
      const width = raw.width + (west ? -xSnap.correction : xSnap.correction);
      if (width >= 8) snapped = { ...snapped, x: west ? xSnap.position : raw.x, width };
    }
    if (ySnap) {
      const height = raw.height + (north ? -ySnap.correction : ySnap.correction);
      if (height >= 8) snapped = { ...snapped, y: north ? ySnap.position : raw.y, height };
    }
  }
  const finalPoint = {
    x: west ? snapped.x : snapped.x + snapped.width,
    y: north ? snapped.y : snapped.y + snapped.height,
    width: 0,
    height: 0,
  };
  const guides: Guide[] = [];
  if (west || east) {
    const match = nearestSnap(finalPoint, targets, 'x', 0.000001);
    if (match) guides.push(guideAt(snapped, targets, 'x', match.position));
  }
  if (north || south) {
    const match = nearestSnap(finalPoint, targets, 'y', 0.000001);
    if (match) guides.push(guideAt(snapped, targets, 'y', match.position));
  }
  return { rect: snapped, guides };
}

export function alignRects(rects: Rect[], alignment: Alignment, bounds?: Rect): Point[] {
  const target = bounds ?? unionRects(rects);
  if (!target) return [];
  return rects.map((rect) => {
    switch (alignment) {
      case 'left':
        return { x: target.x - rect.x, y: 0 };
      case 'center':
        return { x: target.x + target.width / 2 - rect.x - rect.width / 2, y: 0 };
      case 'right':
        return { x: target.x + target.width - rect.x - rect.width, y: 0 };
      case 'top':
        return { x: 0, y: target.y - rect.y };
      case 'middle':
        return { x: 0, y: target.y + target.height / 2 - rect.y - rect.height / 2 };
      default:
        return { x: 0, y: target.y + target.height - rect.y - rect.height };
    }
  });
}

export function distributeRects(rects: Rect[], axis: 'x' | 'y'): Point[] {
  const deltas = rects.map(() => ({ x: 0, y: 0 }));
  if (rects.length < 3) return deltas;
  const size = axis === 'x' ? 'width' : 'height';
  const sorted = rects
    .map((rect, index) => ({ rect, index }))
    .sort((a, b) => a.rect[axis] - b.rect[axis] || a.index - b.index);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const totalSize = rects.reduce((sum, rect) => sum + rect[size], 0);
  const gap =
    (last.rect[axis] + last.rect[size] - first.rect[axis] - totalSize) / (rects.length - 1);
  let position = first.rect[axis];
  for (const { rect, index } of sorted) {
    deltas[index][axis] = position - rect[axis];
    position += rect[size] + gap;
  }
  return deltas;
}

export function solveResizeDimensions(
  size: Pick<Rect, 'width' | 'height'>,
  basis: { a: number; b: number; c: number; d: number },
  delta: Point,
): Pick<Rect, 'width' | 'height'> {
  const { a, b, c, d } = basis;
  const determinant = a * d - b * c;
  const magnitude = Math.hypot(a, b) * Math.hypot(c, d);
  // Nearly parallel dimension vectors amplify small pointer deltas into large distortions.
  if (Math.abs(determinant) > magnitude * 0.1) {
    const width = size.width + (d * delta.x - c * delta.y) / determinant;
    const height = size.height + (a * delta.y - b * delta.x) / determinant;
    if (Number.isFinite(width) && Number.isFinite(height) && width >= 8 && height >= 8)
      return { width, height };
  }
  const direction = {
    x: a * size.width + c * size.height,
    y: b * size.width + d * size.height,
  };
  const lengthSquared = direction.x ** 2 + direction.y ** 2;
  const requestedScale =
    lengthSquared > 0 ? 1 + (direction.x * delta.x + direction.y * delta.y) / lengthSquared : 1;
  const scale = Math.max(8 / size.width, 8 / size.height, requestedScale);
  return { width: size.width * scale, height: size.height * scale };
}

export function resizeRect(
  rect: Rect,
  handle: ResizeHandle,
  delta: Point,
  lockAspect = false,
): Rect {
  const west = handle.includes('w');
  const east = handle.includes('e');
  const north = handle.includes('n');
  const south = handle.includes('s');
  const horizontal = west || east;
  const vertical = north || south;
  const requestedWidth = rect.width + (west ? -delta.x : east ? delta.x : 0);
  const requestedHeight = rect.height + (north ? -delta.y : south ? delta.y : 0);
  let width = Math.max(8, requestedWidth);
  let height = Math.max(8, requestedHeight);
  if (lockAspect && rect.width > 0 && rect.height > 0) {
    const widthScale = requestedWidth / rect.width;
    const heightScale = requestedHeight / rect.height;
    const scale = Math.max(
      8 / rect.width,
      8 / rect.height,
      horizontal && (!vertical || Math.abs(widthScale - 1) >= Math.abs(heightScale - 1))
        ? widthScale
        : heightScale,
    );
    width = rect.width * scale;
    height = rect.height * scale;
  }
  return {
    x: west ? rect.x + rect.width - width : horizontal ? rect.x : rect.x + (rect.width - width) / 2,
    y: north
      ? rect.y + rect.height - height
      : vertical
        ? rect.y
        : rect.y + (rect.height - height) / 2,
    width,
    height,
  };
}

export function rectsIntersect(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

export function rectContains(outer: Rect, inner: Rect): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.width <= outer.x + outer.width &&
    inner.y + inner.height <= outer.y + outer.height
  );
}
