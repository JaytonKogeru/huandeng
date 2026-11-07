import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { type PageTimeline, resolvePageAnimation } from '../../pptd/animation-model';
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
export interface PresentationPlaybackOptions {
  initialPosition?: 'start' | 'end';
  restartKey?: number;
}

export function usePresentationPlayback(
  page: PageSnapshot | null | undefined,
  active: boolean,
  options: PresentationPlaybackOptions = {},
) {
  const pageData = page?.data;
  const resolution = useMemo(() => {
    if (!pageData) return { resolved: null, error: null };
    try {
      return { resolved: resolvePageAnimation(pageData), error: null };
    } catch (error) {
      return { resolved: null, error: error instanceof Error ? error.message : String(error) };
    }
  }, [pageData]);
  const timeline = resolution.resolved?.timeline ?? null;
  const steps = resolution.resolved?.steps ?? [];
  const initial = options.initialPosition === 'end' ? (timeline?.durationMs ?? 0) : 0;
  const identity = `${page?.pageId ?? ''}:${page?.occurrenceId ?? ''}:${page?.versionId ?? ''}`;
  const restartKey = options.restartKey;
  const context = useMemo(
    () => ({ identity, timeline, active, initial, restartKey }),
    [identity, timeline, active, initial, restartKey],
  );
  const latest = useRef(context);
  latest.current = context;
  const [state, setState] = useState({ context, timeMs: initial, playing: false });
  const time = useRef(initial);
  const frame = useRef<number | null>(null);
  const target = useRef(initial);
  const cancelFrame = useCallback(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
  }, []);
  const pause = useCallback(() => {
    cancelFrame();
    setState({ context, timeMs: time.current, playing: false });
  }, [cancelFrame, context]);
  const seek = useCallback(
    (value: number) => {
      cancelFrame();
      time.current = Math.min(timeline?.durationMs ?? 0, Math.max(0, value));
      setState({ context, timeMs: time.current, playing: false });
    },
    [cancelFrame, context, timeline],
  );
  const playTo = useCallback(
    (end: number, instant = false) => {
      cancelFrame();
      if (!active || !timeline || end <= time.current) return;
      target.current = Math.min(timeline.durationMs, end);
      if (instant) {
        seek(target.current);
        return;
      }
      const startTime = time.current;
      const startClock = performance.now();
      setState({ context, timeMs: time.current, playing: true });
      const tick = (clock: number) => {
        if (latest.current !== context) return;
        time.current = Math.min(target.current, startTime + clock - startClock);
        const playing = time.current < target.current;
        setState({ context, timeMs: time.current, playing });
        frame.current = playing ? requestAnimationFrame(tick) : null;
      };
      frame.current = requestAnimationFrame(tick);
    },
    [active, cancelFrame, context, timeline, seek],
  );
  const next = useCallback(() => {
    if (!active || !timeline || !steps.length || time.current >= timeline.durationMs) return false;
    if (frame.current !== null) seek(target.current);
    else {
      const step = steps.find((item) => item.endMs > time.current + 0.5);
      if (!step) return false;
      playTo(step.endMs, step.instant);
    }
    return true;
  }, [active, timeline, steps, seek, playTo]);
  const previous = useCallback(() => {
    if (!active || !timeline || !steps.length) return false;
    if (time.current <= 0) {
      if (frame.current === null) return false;
      seek(0);
      return true;
    }
    seek(
      Math.max(
        0,
        ...steps.filter((item) => item.endMs < time.current - 0.5).map((item) => item.endMs),
      ),
    );
    return true;
  }, [active, timeline, steps, seek]);
  const toggle = useCallback(() => {
    if (!active || !timeline || !steps.length) return;
    if (frame.current !== null) pause();
    else {
      if (time.current >= timeline.durationMs) seek(0);
      next();
    }
  }, [active, timeline, steps.length, pause, seek, next]);
  useLayoutEffect(() => {
    cancelFrame();
    time.current = initial;
    target.current = initial;
    setState({ context, timeMs: initial, playing: false });
    return cancelFrame;
  }, [context, initial, cancelFrame]);
  // A new occurrence is sampled at its own initial state on its first render.
  const currentTime = state.context === context ? state.timeMs : initial;
  const playing = state.context === context && state.playing;
  const stepIndex = steps.filter((item) => item.endMs <= currentTime + 0.5).length;
  return {
    timeline,
    steps,
    stepIndex,
    currentStep: steps[stepIndex - 1] ?? null,
    nextStep: steps[stepIndex] ?? null,
    error: resolution.error,
    timeMs: active && timeline ? currentTime : null,
    playing,
    next,
    previous,
    toggle,
    seek,
    pause,
  };
}
