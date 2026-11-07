import type {
  PageTimeline,
  TimelineKeyframe,
  TimelineProperty,
  TimelineTrack,
} from './animation-model';
import { type PptdElement, PptdError, type PptdPage } from './types';

export const BUILD_EFFECT_KINDS = [
  'appear',
  'fade-in',
  'fade-out',
  'disappear',
  'pulse',
  'move',
] as const;
export const BUILD_TRIGGERS = ['click', 'with-previous', 'after-previous'] as const;
export const MAX_BUILD_EFFECTS = 256;
export const MAX_BUILD_DELAY_MS = 600_000;

export type BuildEffectKind = (typeof BUILD_EFFECT_KINDS)[number];
export type BuildTrigger = (typeof BUILD_TRIGGERS)[number];

export interface BuildEffect {
  id: string;
  targetId: string;
  kind: BuildEffectKind;
  trigger: BuildTrigger;
  durationMs: number;
  delayMs: number;
  label?: string;
  dx?: number;
  dy?: number;
}

export interface BuildTimeline {
  schemaVersion: 2;
  effects: BuildEffect[];
}

export interface AnimationStep {
  id: string;
  label: string;
  index: number;
  startMs: number;
  endMs: number;
  effectIds: string[];
  instant: boolean;
}

export interface ScheduledBuildEffect {
  effect: BuildEffect;
  index: number;
  startMs: number;
  endMs: number;
}

function invalid(message: string): never {
  throw new PptdError('INVALID_DOCUMENT', `演讲步骤：${message}`);
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function validId(value: unknown): value is string {
  return (
    typeof value === 'string' && !!value.trim() && value.length <= 256 && !value.includes('\0')
  );
}

function integer(value: unknown, minimum: number, maximum: number): value is number {
  return (
    typeof value === 'number' && Number.isInteger(value) && value >= minimum && value <= maximum
  );
}

function instant(effect: BuildEffect) {
  return effect.kind === 'appear' || effect.kind === 'disappear';
}

function validateBuilds(
  value: unknown,
  page: Pick<PptdPage, 'elements'>,
): asserts value is BuildTimeline {
  if (!record(value) || value.schemaVersion !== 2) invalid('此动画版本暂不支持编辑。');
  if (!Array.isArray(value.effects) || value.effects.length > MAX_BUILD_EFFECTS)
    invalid(`效果须为数组，最多 ${MAX_BUILD_EFFECTS} 个。`);
  const targets = new Set(page.elements.map((element) => element.elementId));
  const ids = new Set<string>();
  for (const [index, effect] of value.effects.entries()) {
    if (!record(effect) || !validId(effect.id) || ids.has(effect.id))
      invalid('效果 ID 缺失或重复。');
    ids.add(effect.id);
    if (!validId(effect.targetId) || !targets.has(effect.targetId))
      invalid('效果引用了不存在的对象。');
    if (!BUILD_EFFECT_KINDS.includes(effect.kind as BuildEffectKind)) invalid('此效果暂不支持。');
    if (!BUILD_TRIGGERS.includes(effect.trigger as BuildTrigger)) invalid('此触发方式暂不支持。');
    if (index === 0 && effect.trigger !== 'click') invalid('第一个效果必须由点击开始。');
    const immediate = effect.kind === 'appear' || effect.kind === 'disappear';
    const minimum = immediate ? 0 : effect.kind === 'pulse' ? 2 : 1;
    const maximum = immediate ? 0 : 60_000;
    if (!integer(effect.durationMs, minimum, maximum))
      invalid(
        immediate ? '出现和消失的时长须为 0。' : `效果时长须为 ${minimum}–60000 毫秒的整数。`,
      );
    if (!integer(effect.delayMs, 0, MAX_BUILD_DELAY_MS))
      invalid('延迟须为 0–600000 毫秒的整数，动画总长不能超过 10 分钟。');
    if (
      effect.label !== undefined &&
      (typeof effect.label !== 'string' || effect.label.length > 200)
    )
      invalid('步骤名称须为不超过 200 字的文字。');
    if (effect.kind === 'move') {
      if (
        ![effect.dx, effect.dy].every(
          (amount) =>
            typeof amount === 'number' && Number.isFinite(amount) && Math.abs(amount) <= 1_000_000,
        )
      )
        invalid('移动距离须为绝对值不超过 1000000 的有限数值。');
    } else if (effect.dx !== undefined || effect.dy !== undefined) {
      invalid('只有移动效果可以设置水平或垂直距离。');
    }
  }
}

export function resolveBuildTiming(animation: BuildTimeline) {
  const effects: ScheduledBuildEffect[] = [];
  const steps: AnimationStep[] = [];
  let previous: ScheduledBuildEffect | undefined;
  for (const [index, effect] of animation.effects.entries()) {
    let step = steps[steps.length - 1];
    if (effect.trigger === 'click') {
      const startMs = step?.endMs ?? 0;
      step = {
        id: effect.id,
        label: effect.label?.trim() || `步骤 ${steps.length + 1}`,
        index: steps.length,
        startMs,
        endMs: startMs,
        effectIds: [],
        instant: true,
      };
      steps.push(step);
    }
    const startMs =
      (effect.trigger === 'click'
        ? step.startMs
        : effect.trigger === 'with-previous'
          ? (previous as ScheduledBuildEffect).startMs
          : (previous as ScheduledBuildEffect).endMs) + effect.delayMs;
    const endMs = startMs + Math.max(1, effect.durationMs);
    if (endMs > 600_000) invalid('动画总长不能超过 10 分钟。');
    const scheduled = { effect, index, startMs, endMs };
    effects.push(scheduled);
    step.endMs = Math.max(step.endMs, endMs);
    step.effectIds.push(effect.id);
    step.instant &&= instant(effect) && effect.delayMs === 0;
    previous = scheduled;
  }
  return { effects, steps };
}

function baseValue(element: PptdElement, property: TimelineProperty) {
  if (property === 'x') return element.bounds?.[0] ?? 0;
  if (property === 'y') return element.bounds?.[1] ?? 0;
  // Legacy groups have baked child appearance; a group's visible animation multiplier is one.
  if (property === 'opacity' && element.elementType === 'group') return 1;
  if (property === 'opacity')
    return typeof element.opacity === 'number' && Number.isFinite(element.opacity)
      ? element.opacity
      : 1;
  return 1;
}

interface Channel {
  track: TimelineTrack;
  endMs: number;
  value: number;
}

export function compileBuildTimeline(
  value: unknown,
  page: Pick<PptdPage, 'elements'>,
): { animation: BuildTimeline; timeline: PageTimeline | null; steps: AnimationStep[] } {
  validateBuilds(value, page);
  if (!value.effects.length) return { animation: value, timeline: null, steps: [] };
  const { effects, steps } = resolveBuildTiming(value);
  const elements = new Map(page.elements.map((element) => [element.elementId, element]));
  const hidden = new Set<string>();
  const visibility = new Set<string>();
  for (const effect of value.effects) {
    if (
      !['appear', 'fade-in', 'fade-out', 'disappear'].includes(effect.kind) ||
      visibility.has(effect.targetId)
    )
      continue;
    visibility.add(effect.targetId);
    if (effect.kind === 'appear' || effect.kind === 'fade-in') hidden.add(effect.targetId);
  }
  const channels = new Map<string, Channel>();
  const channelFor = (targetId: string, property: TimelineProperty) => {
    const id = `${targetId}\0${property}`;
    let channel = channels.get(id);
    if (!channel) {
      const initial =
        property === 'opacity' && hidden.has(targetId)
          ? 0
          : baseValue(elements.get(targetId) as PptdElement, property);
      channel = {
        track: {
          id: `build-track-${channels.size}`,
          targetId,
          property,
          keyframes: [{ id: 'base', timeMs: 0, value: initial, easing: 'hold' }],
        },
        endMs: 0,
        value: initial,
      };
      channels.set(id, channel);
    }
    return channel;
  };
  const addKey = (channel: Channel, key: TimelineKeyframe) => {
    const keys = channel.track.keyframes;
    if (keys[keys.length - 1].timeMs === key.timeMs) keys[keys.length - 1] = key;
    else keys.push(key);
  };
  const addEffect = (
    scheduled: ScheduledBuildEffect,
    property: TimelineProperty,
    endValue: (current: number) => number,
    peak = false,
  ) => {
    const { effect, index, startMs, endMs } = scheduled;
    const channel = channelFor(effect.targetId, property);
    if (startMs < channel.endMs)
      invalid(`对象「${effect.targetId}」的 ${property} 效果时间重叠，请调整触发或延迟。`);
    const from = channel.value;
    const to = endValue(from);
    addKey(channel, {
      id: `effect-${index}-start`,
      timeMs: startMs,
      value: from,
      easing: instant(effect) ? 'hold' : 'ease-in-out',
    });
    if (peak)
      addKey(channel, {
        id: `effect-${index}-peak`,
        timeMs: startMs + Math.floor(effect.durationMs / 2),
        value: from * 1.08,
        easing: 'ease-in-out',
      });
    addKey(channel, { id: `effect-${index}-end`, timeMs: endMs, value: to, easing: 'hold' });
    channel.endMs = endMs;
    channel.value = to;
  };
  for (const scheduled of effects) {
    const { effect } = scheduled;
    if (effect.kind === 'move') {
      addEffect(scheduled, 'x', (current) => current + (effect.dx as number));
      addEffect(scheduled, 'y', (current) => current + (effect.dy as number));
    } else if (effect.kind === 'pulse') {
      addEffect(scheduled, 'scaleX', (current) => current, true);
      addEffect(scheduled, 'scaleY', (current) => current, true);
    } else {
      const visible = effect.kind === 'appear' || effect.kind === 'fade-in';
      addEffect(scheduled, 'opacity', () =>
        visible ? baseValue(elements.get(effect.targetId) as PptdElement, 'opacity') : 0,
      );
    }
  }
  return {
    animation: value,
    timeline: {
      schemaVersion: 1,
      durationMs: steps[steps.length - 1].endMs,
      tracks: [...channels.values()].map((channel) => channel.track),
      cues: steps.map((step) => ({ id: step.id, label: step.label, timeMs: step.endMs })),
    },
    steps,
  };
}
