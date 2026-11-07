import { type AnimationStep, type BuildTimeline, compileBuildTimeline } from './build-model';
import { type PptdElement, PptdError, type PptdPage } from './types';

export {
  type AnimationStep,
  BUILD_EFFECT_KINDS,
  BUILD_TRIGGERS,
  type BuildEffect,
  type BuildEffectKind,
  type BuildTimeline,
  type BuildTrigger,
  MAX_BUILD_DELAY_MS,
  MAX_BUILD_EFFECTS,
} from './build-model';

export const TIMELINE_PROPERTIES = ['x', 'y', 'rotation', 'scaleX', 'scaleY', 'opacity'] as const;
export const TIMELINE_EASINGS = ['linear', 'ease-in-out', 'hold'] as const;
export const MAX_TIMELINE_DURATION_MS = 600_000;
export const MAX_TIMELINE_TRACKS = 4096;
export const MAX_TIMELINE_TRACK_KEYFRAMES = 1024;
export const MAX_TIMELINE_KEYFRAMES = 50_000;
export const MAX_TIMELINE_CUES = 256;

export type TimelineProperty = (typeof TIMELINE_PROPERTIES)[number];
export type TimelineEasing = (typeof TIMELINE_EASINGS)[number];

export interface TimelineKeyframe {
  id: string;
  timeMs: number;
  value: number;
  easing: TimelineEasing;
}

export interface TimelineTrack {
  id: string;
  targetId: string;
  property: TimelineProperty;
  keyframes: TimelineKeyframe[];
}

export interface TimelineCue {
  id: string;
  timeMs: number;
  label: string;
}

export interface PageTimeline {
  schemaVersion: 1;
  durationMs: number;
  tracks: TimelineTrack[];
  cues?: TimelineCue[];
}

export type PageAnimation = PageTimeline | BuildTimeline;

export interface ResolvedPageAnimation {
  animation: PageAnimation;
  timeline: PageTimeline | null;
  steps: AnimationStep[];
}

export type TimelineMatrix = [number, number, number, number, number, number];

export interface TimelineElementState {
  matrix: TimelineMatrix;
  opacity: number;
}

export interface CompiledTimeline {
  timeline: PageTimeline;
  sample: (timeMs: number) => Map<string, TimelineElementState>;
}

function invalid(message: string): never {
  throw new PptdError('INVALID_DOCUMENT', `动画时间线：${message}`);
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function validId(value: unknown): value is string {
  return (
    typeof value === 'string' && !!value.trim() && value.length <= 256 && !value.includes('\0')
  );
}

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function validValue(property: TimelineProperty, value: unknown): value is number {
  if (!finite(value)) return false;
  if (property === 'opacity') return value >= 0 && value <= 1;
  if (property === 'scaleX' || property === 'scaleY') return value >= 0 && value <= 100;
  if (property === 'rotation') return Math.abs(value) <= 360_000;
  return Math.abs(value) <= 1_000_000;
}

function groupHierarchy(elements: PptdElement[]) {
  const byId = new Map(elements.map((element) => [element.elementId, element]));
  const parents = new Map<string, string>();
  for (const element of elements) {
    if (element.elementType !== 'group') continue;
    if (!Array.isArray(element.children)) invalid('组合缺少成员列表。');
    const own = new Set<string>();
    for (const child of element.children) {
      if (typeof child !== 'string' || !byId.has(child)) invalid('组合引用了不存在的对象。');
      if (parents.has(child) || own.has(child)) invalid('同一对象不能属于多个组合。');
      own.add(child);
      parents.set(child, element.elementId);
    }
  }
  const order: string[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const visit = (id: string) => {
    if (visited.has(id)) return;
    if (visiting.has(id)) invalid('组合引用包含循环。');
    if (visiting.size > 40) invalid('组合层数超过 40 层。');
    visiting.add(id);
    const parent = parents.get(id);
    if (parent) visit(parent);
    visiting.delete(id);
    visited.add(id);
    order.push(id);
  };
  for (const element of elements) visit(element.elementId);
  return { byId, parents, order };
}

export function validateTimeline(
  value: unknown,
  page: Pick<PptdPage, 'elements'>,
): asserts value is PageTimeline {
  if (!record(value) || value.schemaVersion !== 1) invalid('此时间线版本暂不支持编辑。');
  const duration = value.durationMs;
  if (
    !Number.isInteger(duration) ||
    !finite(duration) ||
    duration < 1 ||
    duration > MAX_TIMELINE_DURATION_MS
  )
    invalid('时长须为 1 毫秒至 10 分钟之间的整数。');
  if (!Array.isArray(value.tracks) || value.tracks.length > MAX_TIMELINE_TRACKS)
    invalid(`轨道须为数组，最多 ${MAX_TIMELINE_TRACKS} 条。`);
  const targets = new Set(page.elements.map((element) => element.elementId));
  const ids = new Set<string>();
  const properties = new Set<string>();
  let count = 0;
  for (const track of value.tracks) {
    if (!record(track) || !validId(track.id) || ids.has(track.id)) invalid('轨道 ID 缺失或重复。');
    ids.add(track.id);
    if (!validId(track.targetId) || !targets.has(track.targetId))
      invalid('轨道引用了不存在的对象。');
    if (!TIMELINE_PROPERTIES.includes(track.property as TimelineProperty))
      invalid('轨道属性暂不支持。');
    const property = track.property as TimelineProperty;
    const targetProperty = `${track.targetId}\0${property}`;
    if (properties.has(targetProperty)) invalid('同一对象的同一属性只能有一条轨道。');
    properties.add(targetProperty);
    if (
      !Array.isArray(track.keyframes) ||
      !track.keyframes.length ||
      track.keyframes.length > MAX_TIMELINE_TRACK_KEYFRAMES
    )
      invalid(`每条轨道需要 1–${MAX_TIMELINE_TRACK_KEYFRAMES} 个关键帧。`);
    count += track.keyframes.length;
    if (count > MAX_TIMELINE_KEYFRAMES) invalid('页面关键帧总数过多。');
    const keys = new Set<string>();
    let previous = -1;
    for (const keyframe of track.keyframes) {
      if (!record(keyframe) || !validId(keyframe.id) || keys.has(keyframe.id))
        invalid('关键帧 ID 缺失或重复。');
      keys.add(keyframe.id);
      const time = keyframe.timeMs;
      if (
        !finite(time) ||
        !Number.isInteger(time) ||
        time < 0 ||
        time > duration ||
        time <= previous
      )
        invalid('关键帧时间须在时长内严格递增，不能重叠。');
      previous = time;
      if (!validValue(property, keyframe.value)) invalid('关键帧数值超出该属性的有效范围。');
      if (!TIMELINE_EASINGS.includes(keyframe.easing as TimelineEasing))
        invalid('关键帧缓动暂不支持。');
    }
  }
  if (value.cues !== undefined) {
    if (!Array.isArray(value.cues) || value.cues.length > MAX_TIMELINE_CUES)
      invalid(`演讲步骤须为数组，最多 ${MAX_TIMELINE_CUES} 个。`);
    const cueIds = new Set<string>();
    let previous = -1;
    for (const cue of value.cues) {
      if (!record(cue) || !validId(cue.id) || cueIds.has(cue.id))
        invalid('演讲步骤 ID 缺失或重复。');
      cueIds.add(cue.id);
      if (
        !finite(cue.timeMs) ||
        !Number.isInteger(cue.timeMs) ||
        cue.timeMs < 0 ||
        cue.timeMs > duration ||
        cue.timeMs <= previous
      )
        invalid('演讲步骤时间须在时长内严格递增，不能重叠。');
      previous = cue.timeMs;
      if (typeof cue.label !== 'string' || cue.label.length > 200)
        invalid('演讲步骤名称须为不超过 200 字的文字。');
    }
  }
  groupHierarchy(page.elements);
}

export function readTimeline(page: PptdPage): PageTimeline | null {
  if (page.timeline === undefined || page.timeline === null) return null;
  validateTimeline(page.timeline, page);
  return page.timeline;
}

function resolveAnimation(value: unknown, page: Pick<PptdPage, 'elements'>): ResolvedPageAnimation {
  if (record(value) && value.schemaVersion === 2) {
    const resolved = compileBuildTimeline(value, page);
    validateTimeline(resolved.timeline ?? { schemaVersion: 1, durationMs: 1, tracks: [] }, page);
    return resolved;
  }
  validateTimeline(value, page);
  const cues = value.cues?.filter((cue) => cue.timeMs > 0) ?? [];
  const steps: AnimationStep[] = [];
  if (value.tracks.length || value.cues?.length) {
    for (const cue of cues)
      steps.push({
        id: `cue:${cue.id}`,
        label: cue.label || `步骤 ${steps.length + 1}`,
        index: steps.length,
        startMs: steps[steps.length - 1]?.endMs ?? 0,
        endMs: cue.timeMs,
        effectIds: [],
        instant: false,
      });
    if (steps[steps.length - 1]?.endMs !== value.durationMs)
      steps.push({
        id: 'timeline:end',
        label: '动画结束',
        index: steps.length,
        startMs: steps[steps.length - 1]?.endMs ?? 0,
        endMs: value.durationMs,
        effectIds: [],
        instant: false,
      });
  }
  return { animation: value, timeline: value, steps };
}

export function validatePageAnimation(
  value: unknown,
  page: Pick<PptdPage, 'elements'>,
): asserts value is PageAnimation {
  resolveAnimation(value, page);
}

export function readPageAnimation(page: PptdPage): PageAnimation | null {
  if (page.timeline === undefined || page.timeline === null) return null;
  validatePageAnimation(page.timeline, page);
  return page.timeline;
}

export function resolvePageAnimation(page: PptdPage): ResolvedPageAnimation | null {
  if (page.timeline === undefined || page.timeline === null) return null;
  return resolveAnimation(page.timeline, page);
}

export function timelineBaseValue(element: PptdElement, property: TimelineProperty): number {
  if (property === 'x') return element.bounds?.[0] ?? 0;
  if (property === 'y') return element.bounds?.[1] ?? 0;
  if (property === 'rotation') return element.rotation ?? 0;
  if (property === 'opacity') return finite(element.opacity) ? element.opacity : 1;
  return 1;
}

export function sampleTrack(track: TimelineTrack, timeMs: number): number {
  const keys = track.keyframes;
  if (timeMs <= keys[0].timeMs) return keys[0].value;
  if (timeMs >= keys[keys.length - 1].timeMs) return keys[keys.length - 1].value;
  let low = 0;
  let high = keys.length - 1;
  while (low + 1 < high) {
    const middle = Math.floor((low + high) / 2);
    if (keys[middle].timeMs <= timeMs) low = middle;
    else high = middle;
  }
  const from = keys[low];
  const to = keys[high];
  if (from.easing === 'hold') return from.value;
  const progress = (timeMs - from.timeMs) / (to.timeMs - from.timeMs);
  const eased = from.easing === 'ease-in-out' ? progress * progress * (3 - 2 * progress) : progress;
  return from.value + (to.value - from.value) * eased;
}

function multiply(left: TimelineMatrix, right: TimelineMatrix): TimelineMatrix {
  const [a, b, c, d, e, f] = left;
  const [g, h, i, j, k, l] = right;
  return [
    a * g + c * h,
    b * g + d * h,
    a * i + c * j,
    b * i + d * j,
    a * k + c * l + e,
    b * k + d * l + f,
  ];
}

function inverse(matrix: TimelineMatrix): TimelineMatrix {
  const [a, b, c, d, e, f] = matrix;
  const determinant = a * d - b * c;
  return [
    d / determinant,
    -b / determinant,
    -c / determinant,
    a / determinant,
    (c * f - d * e) / determinant,
    (b * e - a * f) / determinant,
  ];
}

function elementMatrix(
  element: PptdElement,
  values: Partial<Record<TimelineProperty, number>>,
): TimelineMatrix {
  const [baseX, baseY, width, height] = element.bounds ?? [0, 0, 120, 50];
  const x = values.x ?? baseX;
  const y = values.y ?? baseY;
  const angle = ((values.rotation ?? element.rotation ?? 0) * Math.PI) / 180;
  const flip = Array.isArray(element.flip) ? element.flip : [];
  const scaleX = (values.scaleX ?? 1) * (flip[0] ? -1 : 1);
  const scaleY = (values.scaleY ?? 1) * (flip[1] ? -1 : 1);
  const a = Math.cos(angle) * scaleX;
  const b = Math.sin(angle) * scaleX;
  const c = -Math.sin(angle) * scaleY;
  const d = Math.cos(angle) * scaleY;
  return [
    a,
    b,
    c,
    d,
    x + width / 2 - (a * width + c * height) / 2,
    y + height / 2 - (b * width + d * height) / 2,
  ];
}

export function compileTimeline(page: PptdPage): CompiledTimeline | null {
  const timeline = resolvePageAnimation(page)?.timeline;
  if (!timeline) return null;
  const { byId, parents, order } = groupHierarchy(page.elements);
  const tracks = new Map<string, TimelineTrack[]>();
  const baseInverse = new Map<string, TimelineMatrix>();
  for (const track of timeline.tracks) {
    const own = tracks.get(track.targetId) ?? [];
    own.push(track);
    tracks.set(track.targetId, own);
  }
  for (const element of page.elements)
    baseInverse.set(element.elementId, inverse(elementMatrix(element, {})));
  const identity: TimelineMatrix = [1, 0, 0, 1, 0, 0];
  return {
    timeline,
    sample(timeMs) {
      if (!finite(timeMs)) invalid('预览时间须为有限数值。');
      const time = Math.max(0, Math.min(timeline.durationMs, timeMs));
      const result = new Map<string, TimelineElementState>();
      const deltas = new Map<string, TimelineMatrix>();
      const groupOpacity = new Map<string, number>();
      for (const id of order) {
        const element = byId.get(id) as PptdElement;
        const values: Partial<Record<TimelineProperty, number>> = {};
        for (const track of tracks.get(id) ?? []) values[track.property] = sampleTrack(track, time);
        const parent = parents.get(id);
        const inherited = parent ? (deltas.get(parent) as TimelineMatrix) : identity;
        const ancestorOpacity = parent ? (groupOpacity.get(parent) ?? 1) : 1;
        const matrix = multiply(inherited, elementMatrix(element, values));
        const opacity = (values.opacity ?? timelineBaseValue(element, 'opacity')) * ancestorOpacity;
        result.set(id, { matrix, opacity });
        if (element.elementType === 'group') {
          deltas.set(id, multiply(matrix, baseInverse.get(id) as TimelineMatrix));
          groupOpacity.set(id, ancestorOpacity * (values.opacity ?? 1));
        }
      }
      return result;
    },
  };
}
