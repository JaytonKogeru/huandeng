import type { BuildEffect, BuildTimeline, PageAnimation } from './animation-model';
import { resolveBuildTiming, type ScheduledBuildEffect } from './build-model';
import { PptdError, type PptdPage } from './types';

export function knownTimeline(page: PptdPage): PageAnimation | null {
  const timeline = page.timeline;
  return timeline !== null &&
    typeof timeline === 'object' &&
    'schemaVersion' in timeline &&
    ((timeline.schemaVersion === 1 && 'tracks' in timeline && Array.isArray(timeline.tracks)) ||
      (timeline.schemaVersion === 2 && 'effects' in timeline && Array.isArray(timeline.effects)))
    ? (timeline as PageAnimation)
    : null;
}

export function groupBuildEffects(effects: readonly BuildEffect[]): BuildEffect[][] {
  const groups: BuildEffect[][] = [];
  for (const effect of effects) {
    if (effect.trigger === 'click' || !groups.length) groups.push([]);
    groups[groups.length - 1].push(effect);
  }
  return groups;
}

function keepBuildEffects(
  timeline: BuildTimeline,
  keep: (effect: BuildEffect) => boolean,
): BuildTimeline {
  const timing = resolveBuildTiming(timeline);
  const byId = new Map(timing.effects.map((effect) => [effect.effect.id, effect]));
  const effects = groupBuildEffects(timeline.effects).flatMap((group, groupIndex) => {
    const retained = group
      .map((effect, index) => ({ effect, index }))
      .filter(({ effect }) => keep(effect));
    return retained.map(({ effect, index }, retainedIndex) => {
      const current = byId.get(effect.id) as ScheduledBuildEffect;
      if (retainedIndex === 0) {
        if (index === 0) return effect;
        return {
          ...effect,
          trigger: 'click' as const,
          delayMs: current.startMs - timing.steps[groupIndex].startMs,
          ...(group[0].label === undefined ? {} : { label: group[0].label }),
        };
      }
      const preceding = retained[retainedIndex - 1];
      if (index === preceding.index + 1) return effect;
      const previous = byId.get(preceding.effect.id) as ScheduledBuildEffect;
      // Re-anchor a removed predecessor without changing the retained action's local time.
      const after = effect.trigger === 'after-previous' && current.startMs >= previous.endMs;
      return {
        ...effect,
        trigger: after ? ('after-previous' as const) : ('with-previous' as const),
        delayMs: current.startMs - (after ? previous.endMs : previous.startMs),
      };
    });
  });
  return effects.length === timeline.effects.length ? timeline : { ...timeline, effects };
}

export function removeBuildEffect(timeline: BuildTimeline, effectId: string): BuildTimeline {
  return keepBuildEffects(timeline, (effect) => effect.id !== effectId);
}

export function reorderBuildStep(
  timeline: BuildTimeline,
  stepId: string,
  direction: -1 | 1,
): BuildTimeline {
  const groups = groupBuildEffects(timeline.effects);
  const index = groups.findIndex((group) => group[0].id === stepId);
  const next = index + direction;
  if (index < 0 || next < 0 || next >= groups.length) return timeline;
  [groups[index], groups[next]] = [groups[next], groups[index]];
  return { ...timeline, effects: groups.flat() };
}

export function timelineTargetIds(timeline: PageAnimation): string[] {
  const items = timeline.schemaVersion === 1 ? timeline.tracks : timeline.effects;
  return [...new Set(items.map((item) => item.targetId))];
}

export function removeTimelineTargets(timeline: PageAnimation, ids: Set<string>): PageAnimation {
  if (timeline.schemaVersion === 2)
    return keepBuildEffects(timeline, (effect) => !ids.has(effect.targetId));
  const tracks = timeline.tracks.filter((track) => !ids.has(track.targetId));
  return tracks.length === timeline.tracks.length ? timeline : { ...timeline, tracks };
}

export function selectedTimelineTargets(
  timeline: PageAnimation,
  ids: Set<string>,
): PageAnimation | null {
  if (timeline.schemaVersion === 2) {
    const selected = keepBuildEffects(timeline, (effect) => ids.has(effect.targetId));
    return selected.effects.length ? selected : null;
  }
  const tracks = timeline.tracks.filter((track) => ids.has(track.targetId));
  return tracks.length ? { ...timeline, tracks, cues: [] } : null;
}

function hasContent(timeline: PageAnimation) {
  return timeline.schemaVersion === 2
    ? timeline.effects.length > 0
    : timeline.tracks.length > 0 || !!timeline.cues?.length;
}

export function copiedTimelineTracks(
  source: PageAnimation | null,
  destination: PageAnimation | null,
  idMap: Record<string, string>,
  idFactory: () => string,
  offset = 0,
): PageAnimation | null {
  if (!source) return destination;
  const selected = selectedTimelineTargets(source, new Set(Object.keys(idMap)));
  if (!selected) return destination;
  if (destination && destination.schemaVersion !== source.schemaVersion && hasContent(destination))
    throw new PptdError(
      'INVALID_REQUEST',
      '源对象与目标页面使用不同的动画模式。请先明确转换为自由时间线，再粘贴带动画的对象。',
    );
  if (selected.schemaVersion === 2) {
    const copy = (effect: BuildEffect): BuildEffect => ({
      ...structuredClone(effect),
      id: idFactory(),
      targetId: idMap[effect.targetId],
    });
    if (source === destination && source.schemaVersion === 2)
      return {
        ...source,
        effects: source.effects.flatMap((effect) => [
          effect,
          ...(Object.hasOwn(idMap, effect.targetId)
            ? [{ ...copy(effect), trigger: 'with-previous' as const, delayMs: 0 }]
            : []),
        ]),
      };
    return {
      ...(destination?.schemaVersion === 2 ? destination : selected),
      effects: [
        ...(destination?.schemaVersion === 2 ? destination.effects : []),
        ...selected.effects.map(copy),
      ],
    };
  }
  const target = destination?.schemaVersion === 1 ? destination : null;
  return {
    ...(target ?? { schemaVersion: 1 as const, durationMs: selected.durationMs, tracks: [] }),
    durationMs: Math.max(selected.durationMs, target?.durationMs ?? 0),
    tracks: [
      ...(target?.tracks ?? []),
      ...selected.tracks.map((track) => ({
        ...structuredClone(track),
        id: idFactory(),
        targetId: idMap[track.targetId],
        keyframes: track.keyframes.map((keyframe) => ({
          ...keyframe,
          id: idFactory(),
          value: keyframe.value + (track.property === 'x' || track.property === 'y' ? offset : 0),
        })),
      })),
    ],
  };
}
