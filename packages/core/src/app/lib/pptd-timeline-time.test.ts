import { describe, expect, it } from 'vitest';
import { MAX_TIMELINE_DURATION_MS } from '../../pptd/animation-model';
import { parseTimelineSeconds, timelineSeconds } from './pptd-timeline-time';

describe('timeline time fields', () => {
  it('persists seconds as exact milliseconds, including binary floating-point boundaries', () => {
    expect(parseTimelineSeconds('1.25')).toBe(1250);
    expect(parseTimelineSeconds('1.001')).toBe(1001);
    expect(parseTimelineSeconds('32.767')).toBe(32767);
    expect(parseTimelineSeconds('0.001')).toBe(1);
    expect(parseTimelineSeconds('1.2500')).toBe(1250);
    expect(parseTimelineSeconds('1e-3')).toBe(1);
  });

  it('round-trips every supported stored millisecond without moving a keyframe', () => {
    for (let timeMs = 0; timeMs <= MAX_TIMELINE_DURATION_MS; timeMs++) {
      const restored = parseTimelineSeconds(timelineSeconds(timeMs));
      if (restored !== timeMs) throw new Error(`${timeMs}ms became ${restored}ms`);
    }
  });

  it.each(['', ' ', 'NaN', 'Infinity', '-1', '0.0005', '1.2501', '600.0001', '1e20'])(
    'rejects invalid or sub-millisecond input instead of silently rounding: %s',
    (value) => expect(() => parseTimelineSeconds(value)).toThrow(),
  );
});
