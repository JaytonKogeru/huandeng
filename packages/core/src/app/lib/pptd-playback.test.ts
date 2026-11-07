import { expect, it } from 'vitest';
import type { PageTimeline } from '../../pptd/animation-model';
import { nextTimelineStop, previousTimelineStop } from './pptd-playback';

it('advances through sorted cue times and the final frame without writing document data', () => {
  const timeline: PageTimeline = {
    schemaVersion: 1,
    durationMs: 5000,
    tracks: [],
    cues: [
      { id: 'second', timeMs: 3000, label: 'Result' },
      { id: 'first', timeMs: 1000, label: 'Evidence' },
    ],
  };
  expect(nextTimelineStop(timeline, 0)).toBe(1000);
  expect(nextTimelineStop(timeline, 1000)).toBe(3000);
  expect(nextTimelineStop(timeline, 4000)).toBe(5000);
  expect(previousTimelineStop(timeline, 3500)).toBe(3000);
  expect(previousTimelineStop(timeline, 3000)).toBe(1000);
  expect(previousTimelineStop(timeline, 500)).toBe(0);
  expect(timeline.cues?.[0].id).toBe('second');
});
