import type { PageTimeline } from './animation-model';
import type { PptdPage } from './types';

export function knownTimeline(page: PptdPage): PageTimeline | null {
  const timeline = page.timeline;
  return timeline !== null &&
    typeof timeline === 'object' &&
    'schemaVersion' in timeline &&
    timeline.schemaVersion === 1 &&
    'tracks' in timeline &&
    Array.isArray(timeline.tracks)
    ? (timeline as PageTimeline)
    : null;
}

export function removeTimelineTargets(timeline: PageTimeline, ids: Set<string>): PageTimeline {
  const tracks = timeline.tracks.filter((track) => !ids.has(track.targetId));
  return tracks.length === timeline.tracks.length ? timeline : { ...timeline, tracks };
}

export function copiedTimelineTracks(
  source: PageTimeline | null,
  destination: PageTimeline | null,
  idMap: Record<string, string>,
  idFactory: () => string,
  offset = 0,
): PageTimeline | null {
  const sourceTracks = source?.tracks.filter((track) => Object.hasOwn(idMap, track.targetId));
  if (!source || !sourceTracks?.length) return destination;
  return {
    ...(destination ?? { schemaVersion: 1 as const, durationMs: source.durationMs, tracks: [] }),
    durationMs: Math.max(source.durationMs, destination?.durationMs ?? 0),
    tracks: [
      ...(destination?.tracks ?? []),
      ...sourceTracks.map((track) => ({
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
