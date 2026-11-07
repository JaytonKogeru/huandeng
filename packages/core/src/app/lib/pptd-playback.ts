import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type PageTimeline, readTimeline } from '../../pptd/animation-model';
import type { PageSnapshot } from '../../pptd/types';

export function nextTimelineStop(timeline: PageTimeline, timeMs: number): number {
  return Math.min(
    timeline.durationMs,
    ...(timeline.cues ?? []).filter((cue) => cue.timeMs > timeMs + 0.5).map((cue) => cue.timeMs),
  );
}

export function previousTimelineStop(timeline: PageTimeline, timeMs: number): number {
  return Math.max(
    0,
    ...(timeline.cues ?? []).filter((cue) => cue.timeMs < timeMs - 0.5).map((cue) => cue.timeMs),
  );
}

export function usePresentationPlayback(page: PageSnapshot | null | undefined, active: boolean) {
  const timeline = useMemo(() => {
    if (!page) return null;
    try {
      return readTimeline(page.data);
    } catch {
      return null;
    }
  }, [page]);
  const [timeMs, setTimeMs] = useState(0);
  const [playing, setPlaying] = useState(false);
  const time = useRef(0);
  const frame = useRef<number | null>(null);
  const target = useRef(0);
  const pause = useCallback(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    setPlaying(false);
  }, []);
  const seek = useCallback(
    (value: number) => {
      pause();
      time.current = Math.min(timeline?.durationMs ?? 0, Math.max(0, value));
      setTimeMs(time.current);
    },
    [pause, timeline],
  );
  const playTo = useCallback(
    (end: number) => {
      pause();
      if (!active || !timeline || end <= time.current) return;
      const startTime = time.current;
      const startClock = performance.now();
      target.current = Math.min(timeline.durationMs, end);
      setPlaying(true);
      const tick = (clock: number) => {
        time.current = Math.min(target.current, startTime + clock - startClock);
        setTimeMs(time.current);
        if (time.current < target.current) frame.current = requestAnimationFrame(tick);
        else {
          frame.current = null;
          setPlaying(false);
        }
      };
      frame.current = requestAnimationFrame(tick);
    },
    [active, pause, timeline],
  );
  const next = useCallback(() => {
    if (!active || !timeline || time.current >= timeline.durationMs) return false;
    if (frame.current !== null) seek(target.current);
    else playTo(nextTimelineStop(timeline, time.current));
    return true;
  }, [active, timeline, seek, playTo]);
  const previous = useCallback(() => {
    if (!active || !timeline || time.current <= 0) return false;
    seek(previousTimelineStop(timeline, time.current));
    return true;
  }, [active, timeline, seek]);
  const toggle = useCallback(() => {
    if (!active || !timeline) return;
    if (frame.current !== null) pause();
    else {
      if (time.current >= timeline.durationMs) {
        time.current = 0;
        setTimeMs(0);
      }
      playTo(nextTimelineStop(timeline, time.current));
    }
  }, [active, timeline, pause, playTo]);
  // Each occurrence has its own playback even when two consecutive references share a page.
  const identity = `${page?.pageId ?? ''}:${page?.occurrenceId ?? ''}:${page?.versionId ?? ''}`;
  useEffect(() => {
    void identity;
    void timeline;
    void active;
    pause();
    time.current = 0;
    setTimeMs(0);
    return pause;
  }, [identity, timeline, active, pause]);
  return {
    timeline,
    timeMs: active && timeline ? timeMs : null,
    playing,
    next,
    previous,
    toggle,
    seek,
    pause,
  };
}
