import { describe, expect, it } from 'vitest';
import {
  compileTimeline,
  type PageTimeline,
  readTimeline,
  sampleTrack,
  type TimelineEasing,
  type TimelineMatrix,
  type TimelineProperty,
  type TimelineTrack,
  validateTimeline,
} from './animation-model';
import { type PptdElement, PptdError, type PptdPage } from './types';

const shape: PptdElement = {
  elementId: 'shape',
  elementType: 'shape',
  bounds: [100, 80, 40, 20],
};

function track(
  targetId: string,
  property: TimelineProperty,
  values: [number, number][],
  easing: TimelineEasing = 'linear',
): TimelineTrack {
  return {
    id: `${targetId}-${property}`,
    targetId,
    property,
    keyframes: values.map(([timeMs, value], index) => ({
      id: `key-${index}`,
      timeMs,
      value,
      easing,
    })),
  };
}

function page(tracks: TimelineTrack[] = [], elements: PptdElement[] = [shape]): PptdPage {
  return {
    elements: structuredClone(elements),
    timeline: { schemaVersion: 1, durationMs: 2000, tracks } satisfies PageTimeline,
  };
}

function point(matrix: TimelineMatrix, x: number, y: number) {
  return [matrix[0] * x + matrix[2] * y + matrix[4], matrix[1] * x + matrix[3] * y + matrix[5]];
}

function closePoint(actual: number[], expected: number[]) {
  expect(actual[0]).toBeCloseTo(expected[0], 8);
  expect(actual[1]).toBeCloseTo(expected[1], 8);
}

describe('timeline interpolation', () => {
  it('holds endpoints and seeks deterministically without mutating source', () => {
    const source = page([
      track('shape', 'x', [
        [200, 100],
        [1200, 300],
      ]),
    ]);
    const before = structuredClone(source);
    const compiled = compileTimeline(source);
    expect(compiled).not.toBeNull();
    for (const [time, x] of [
      [0, 100],
      [700, 200],
      [2000, 300],
      [700, 200],
      [-5, 100],
      [9999, 300],
    ]) {
      const state = compiled?.sample(time).get('shape');
      expect(state?.matrix[4]).toBe(x);
    }
    expect(source).toEqual(before);
    expect(() => compiled?.sample(Number.NaN)).toThrow(PptdError);
    expect(() => compiled?.sample(Number.POSITIVE_INFINITY)).toThrow(PptdError);
    expect(readTimeline({ elements: [shape] })).toBeNull();
    expect(compileTimeline({ elements: [shape], timeline: null })).toBeNull();
  });

  it('uses outgoing easing and changes a hold exactly at the next key', () => {
    const steps = track(
      'shape',
      'opacity',
      [
        [100, 0],
        [1000, 0.7],
        [2000, 1],
      ],
      'hold',
    );
    expect(sampleTrack(steps, 999.999)).toBe(0);
    expect(sampleTrack(steps, 1000)).toBe(0.7);
    expect(sampleTrack(steps, 1999)).toBe(0.7);
    expect(sampleTrack(steps, 2000)).toBe(1);
    const smooth = track(
      'shape',
      'x',
      [
        [0, 0],
        [1000, 100],
      ],
      'ease-in-out',
    );
    expect(sampleTrack(smooth, 250)).toBe(15.625);
    expect(sampleTrack(smooth, 500)).toBe(50);
    expect(sampleTrack(smooth, 750)).toBe(84.375);
  });

  it('preserves intentional multiple turns instead of shortest-path rotation', () => {
    const rotations = track('shape', 'rotation', [
      [0, 0],
      [2000, 720],
    ]);
    expect(sampleTrack(rotations, 500)).toBe(180);
    expect(sampleTrack(rotations, 1000)).toBe(360);
    const one = track('shape', 'opacity', [[1000, 0.2]]);
    expect(sampleTrack(one, 0)).toBe(0.2);
    expect(sampleTrack(one, 2000)).toBe(0.2);
  });
});

describe('timeline validation', () => {
  it('rejects unsupported, malformed, duplicate and orphan data without repairing it', () => {
    const valid = page([
      track('shape', 'x', [
        [0, 100],
        [2000, 200],
      ]),
    ]);
    const failures: ((timeline: PageTimeline) => void)[] = [
      (timeline) => {
        (timeline as { schemaVersion: number }).schemaVersion = 2;
      },
      (timeline) => {
        timeline.durationMs = Number.NaN;
      },
      (timeline) => {
        timeline.durationMs = 600_001;
      },
      (timeline) => {
        timeline.durationMs = 0;
      },
      (timeline) => {
        timeline.tracks[0].targetId = 'deleted';
      },
      (timeline) => {
        timeline.tracks.push(structuredClone(timeline.tracks[0]));
      },
      (timeline) => {
        timeline.tracks.push({ ...structuredClone(timeline.tracks[0]), id: 'another' });
      },
      (timeline) => {
        timeline.tracks[0].keyframes[1].timeMs = 0;
      },
      (timeline) => {
        timeline.tracks[0].keyframes[1].timeMs = 2001;
      },
      (timeline) => {
        timeline.tracks[0].keyframes[1].timeMs = 1.5;
      },
      (timeline) => {
        timeline.tracks[0].keyframes[1].id = 'key-0';
      },
      (timeline) => {
        timeline.tracks[0].keyframes[0].value = Number.NaN;
      },
      (timeline) => {
        timeline.tracks[0].keyframes[0].value = Number.POSITIVE_INFINITY;
      },
      (timeline) => {
        timeline.tracks[0].keyframes = [];
      },
      (timeline) => {
        timeline.tracks[0].property = 'width' as TimelineProperty;
      },
      (timeline) => {
        timeline.tracks[0].keyframes[0].easing = 'spring' as TimelineEasing;
      },
    ];
    for (const mutate of failures) {
      const timeline = structuredClone(valid.timeline) as PageTimeline;
      mutate(timeline);
      const before = structuredClone(timeline);
      expect(() => validateTimeline(timeline, valid)).toThrow(PptdError);
      expect(timeline).toEqual(before);
    }
  });

  it('enforces property limits and ordered cues', () => {
    for (const [property, invalidValue] of [
      ['opacity', -0.1],
      ['opacity', 1.1],
      ['scaleX', -1],
      ['scaleY', 101],
      ['rotation', 360_001],
      ['x', 1_000_001],
    ] as const) {
      const source = page([track('shape', property, [[0, invalidValue]])]);
      expect(() => readTimeline(source)).toThrow(PptdError);
    }
    const source = page([track('shape', 'scaleX', [[0, 0]])]);
    const timeline = source.timeline as PageTimeline;
    timeline.cues = [
      { id: 'a', timeMs: 0, label: '开始' },
      { id: 'b', timeMs: 1000, label: '结果' },
    ];
    expect(() => validateTimeline(timeline, source)).not.toThrow();
    timeline.cues[1].timeMs = 0;
    expect(() => validateTimeline(timeline, source)).toThrow(PptdError);
    timeline.cues[1].timeMs = 1000;
    timeline.cues[1].id = 'a';
    expect(() => validateTimeline(timeline, source)).toThrow(PptdError);
  });

  it('rejects dangling, multi-parent and cyclic group hierarchies', () => {
    const group: PptdElement = { elementId: 'g', elementType: 'group', children: ['shape'] };
    const invalidGroups = [
      [shape, { ...group, children: ['missing'] }],
      [shape, group, { ...group, elementId: 'other' }],
      [shape, { ...group, children: ['g'] }],
      [shape, { ...group, children: ['other'] }, { ...group, elementId: 'other', children: ['g'] }],
    ];
    for (const elements of invalidGroups)
      expect(() => compileTimeline(page([], elements))).toThrow(PptdError);
  });
});

describe('timeline transform composition', () => {
  it('scales and rotates around object center without reflowing content', () => {
    const source = page([
      track('shape', 'rotation', [[0, 90]]),
      track('shape', 'scaleX', [[0, 2]]),
      track('shape', 'scaleY', [[0, 3]]),
    ]);
    const matrix = compileTimeline(source)?.sample(0).get('shape')?.matrix as TimelineMatrix;
    closePoint(point(matrix, 20, 10), [120, 90]);
    closePoint(point(matrix, 40, 10), [120, 130]);
    closePoint(point(matrix, 20, 20), [90, 90]);
    const collapsed = page(
      [track('shape', 'scaleX', [[0, 0]])],
      [{ ...shape, flip: [true, false] }],
    );
    const collapsedMatrix = compileTimeline(collapsed)?.sample(0).get('shape')
      ?.matrix as TimelineMatrix;
    closePoint(point(collapsedMatrix, 0, 10), [120, 90]);
    closePoint(point(collapsedMatrix, 40, 10), [120, 90]);
  });

  it('moves leaf content with group tracks and composes child tracks in base page coordinates', () => {
    const child: PptdElement = {
      elementId: 'child',
      elementType: 'text',
      bounds: [120, 120, 20, 20],
      opacity: 0.8,
    };
    const group: PptdElement = {
      elementId: 'group',
      elementType: 'group',
      bounds: [100, 100, 100, 100],
      children: ['child'],
    };
    const tracks = [
      track('group', 'rotation', [[0, 90]]),
      track('child', 'x', [[0, 140]]),
      track('group', 'opacity', [[0, 0.5]]),
      track('child', 'opacity', [[0, 0.6]]),
    ];
    const sampled = compileTimeline(page(tracks, [child, group]))?.sample(0);
    const state = sampled?.get('child');
    closePoint(point(state?.matrix as TimelineMatrix, 10, 10), [170, 150]);
    expect(state?.opacity).toBeCloseTo(0.3);
    const reordered = compileTimeline(page([...tracks].reverse(), [group, child]))?.sample(0);
    expect(reordered?.get('child')).toEqual(state);
  });

  it('composes nested groups and supports shear from anisotropic scaling of rotated leaves', () => {
    const leaf: PptdElement = {
      elementId: 'leaf',
      elementType: 'shape',
      bounds: [20, 20, 20, 20],
      rotation: 45,
    };
    const inner: PptdElement = {
      elementId: 'inner',
      elementType: 'group',
      bounds: [0, 0, 100, 100],
      children: ['leaf'],
    };
    const outer: PptdElement = {
      elementId: 'outer',
      elementType: 'group',
      bounds: [0, 0, 100, 100],
      children: ['inner'],
    };
    const source = page(
      [
        track('outer', 'x', [[0, 100]]),
        track('inner', 'scaleX', [[0, 2]]),
        track('outer', 'opacity', [[0, 0.5]]),
        track('inner', 'opacity', [[0, 0.4]]),
      ],
      [leaf, outer, inner],
    );
    const state = compileTimeline(source)?.sample(0).get('leaf');
    const matrix = state?.matrix as TimelineMatrix;
    closePoint(point(matrix, 10, 10), [110, 30]);
    expect(matrix[0] * matrix[2] + matrix[1] * matrix[3]).not.toBeCloseTo(0);
    expect(state?.opacity).toBeCloseTo(0.2);
    expect(leaf.bounds).toEqual([20, 20, 20, 20]);
  });

  it('leaves legacy baked group transforms and group opacity unchanged without tracks', () => {
    const group: PptdElement = {
      elementId: 'group',
      elementType: 'group',
      bounds: [0, 0, 100, 100],
      rotation: 30,
      flip: [true, true],
      opacity: 0.2,
      children: ['shape'],
    };
    const state = compileTimeline(page([], [shape, group]))
      ?.sample(0)
      .get('shape');
    closePoint(point(state?.matrix as TimelineMatrix, 0, 0), [100, 80]);
    expect(state?.opacity).toBe(1);
  });
});
