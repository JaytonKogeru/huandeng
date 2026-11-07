import { describe, expect, it } from 'vitest';
import {
  type BuildEffect,
  type BuildTimeline,
  compileTimeline,
  readPageAnimation,
  readTimeline,
  resolvePageAnimation,
  validatePageAnimation,
} from './animation-model';
import { readPageTransition, validatePageTransition } from './page-transition';
import type { PptdElement, PptdPage } from './types';

const figure: PptdElement = {
  elementId: 'figure',
  elementType: 'shape',
  bounds: [100, 80, 40, 20],
  opacity: 0.8,
};
const arrow: PptdElement = { elementId: 'arrow', elementType: 'shape', bounds: [250, 90, 50, 20] };

function effect(id: string, patch: Partial<BuildEffect> = {}): BuildEffect {
  return {
    id,
    targetId: 'figure',
    kind: 'fade-in',
    trigger: 'click',
    durationMs: 400,
    delayMs: 0,
    ...patch,
  };
}

function page(effects: BuildEffect[], elements: PptdElement[] = [figure, arrow]): PptdPage {
  return {
    elements: structuredClone(elements),
    timeline: { schemaVersion: 2, effects } satisfies BuildTimeline,
  };
}

describe('click build compilation', () => {
  it('derives click groups and with/after timing without letting future effects drift early', () => {
    const source = page([
      effect('figure-in', { durationMs: 300, label: '证据' }),
      effect('arrow-in', {
        targetId: 'arrow',
        trigger: 'with-previous',
        durationMs: 200,
        delayMs: 50,
      }),
      effect('move', {
        kind: 'move',
        trigger: 'after-previous',
        durationMs: 400,
        delayMs: 20,
        dx: 80,
        dy: 0,
      }),
      effect('figure-out', { kind: 'fade-out', durationMs: 200, delayMs: 100 }),
    ]);
    const before = structuredClone(source);
    const resolved = resolvePageAnimation(source);
    expect(resolved?.steps).toEqual([
      {
        id: 'figure-in',
        label: '证据',
        index: 0,
        startMs: 0,
        endMs: 670,
        effectIds: ['figure-in', 'arrow-in', 'move'],
        instant: false,
      },
      {
        id: 'figure-out',
        label: '步骤 2',
        index: 1,
        startMs: 670,
        endMs: 970,
        effectIds: ['figure-out'],
        instant: false,
      },
    ]);
    expect(resolved?.timeline?.cues?.map((cue) => cue.timeMs)).toEqual([670, 970]);
    expect(resolved?.timeline?.durationMs).toBe(970);
    const compiled = compileTimeline(source);
    expect(compiled?.sample(0).get('figure')?.opacity).toBe(0);
    expect(compiled?.sample(150).get('figure')?.opacity).toBeCloseTo(0.4);
    expect(compiled?.sample(700).get('figure')?.opacity).toBe(0.8);
    expect(compiled?.sample(870).get('figure')?.opacity).toBeCloseTo(0.4);
    expect(compiled?.sample(970).get('figure')?.opacity).toBe(0);
    expect(compiled?.sample(50).get('arrow')?.opacity).toBe(0);
    expect(compiled?.sample(150).get('arrow')?.opacity).toBeCloseTo(0.5);
    for (const [time, x] of [
      [0, 100],
      [200, 100],
      [270, 100],
      [470, 140],
      [670, 180],
      [970, 180],
    ])
      expect(compiled?.sample(time).get('figure')?.matrix[4]).toBeCloseTo(x);
    expect(source).toEqual(before);
    expect(readPageAnimation(source)).toBe(source.timeline);
    expect(() => readTimeline(source)).toThrow(/暂不支持/);
  });

  it('shows exits initially, hides future entrances, and restores deterministic previous poses', () => {
    const source = page([
      effect('exit', { targetId: 'arrow', kind: 'fade-out' }),
      effect('enter'),
      effect('exit-figure', { kind: 'fade-out' }),
      effect('reenter'),
    ]);
    const compiled = compileTimeline(source);
    expect(compiled?.sample(0).get('arrow')?.opacity).toBe(1);
    for (const [time, opacity] of [
      [0, 0],
      [400, 0],
      [800, 0.8],
      [1200, 0],
      [1600, 0.8],
      [400, 0],
      [800, 0.8],
    ])
      expect(compiled?.sample(time).get('figure')?.opacity).toBeCloseTo(opacity);
  });

  it('keeps instant reveals on distinct click stops and makes delayed instant groups wait', () => {
    const source = page([
      effect('show', { kind: 'appear', durationMs: 0 }),
      effect('show-arrow', {
        targetId: 'arrow',
        kind: 'appear',
        trigger: 'with-previous',
        durationMs: 0,
      }),
      effect('hide', { kind: 'disappear', durationMs: 0 }),
      effect('late-arrow', { targetId: 'arrow', kind: 'disappear', durationMs: 0, delayMs: 100 }),
    ]);
    expect(
      resolvePageAnimation(source)?.steps.map(({ endMs, instant }) => [endMs, instant]),
    ).toEqual([
      [1, true],
      [2, true],
      [103, false],
    ]);
    const compiled = compileTimeline(source);
    expect(compiled?.sample(0).get('figure')?.opacity).toBe(0);
    expect(compiled?.sample(1).get('figure')?.opacity).toBe(0.8);
    expect(compiled?.sample(1).get('arrow')?.opacity).toBe(1);
    expect(compiled?.sample(2).get('figure')?.opacity).toBe(0);
    expect(compiled?.sample(102).get('arrow')?.opacity).toBe(1);
    expect(compiled?.sample(103).get('arrow')?.opacity).toBe(0);
  });

  it('compiles pulse back to its preceding scale and relative moves against current geometry', () => {
    const source = page([
      effect('pulse', { kind: 'pulse' }),
      effect('move', { kind: 'move', dx: 80, dy: 20 }),
      effect('move-again', { kind: 'move', dx: -30, dy: 10 }),
      effect('fade', { targetId: 'arrow' }),
    ]);
    const compiled = compileTimeline(source);
    expect(compiled?.sample(0).get('figure')?.matrix[0]).toBe(1);
    expect(compiled?.sample(200).get('figure')?.matrix[0]).toBeCloseTo(1.08);
    expect(compiled?.sample(400).get('figure')?.matrix[0]).toBe(1);
    expect(compiled?.sample(1200).get('figure')?.matrix.slice(4)).toEqual([150, 110]);
    source.elements[0].bounds = [120, 100, 40, 20];
    source.elements[1].opacity = 0.3;
    const changed = compileTimeline(source);
    expect(changed?.sample(1200).get('figure')?.matrix.slice(4)).toEqual([170, 130]);
    expect(changed?.sample(1600).get('arrow')?.opacity).toBe(0.3);
    expect((source.timeline as BuildTimeline).effects[1]).toMatchObject({ dx: 80, dy: 20 });
    expect(source.timeline).not.toHaveProperty('tracks');
  });

  it('uses the visible baked group appearance for entrance, movement and emphasis', () => {
    const group: PptdElement = {
      elementId: 'group',
      elementType: 'group',
      bounds: [100, 80, 200, 60],
      children: ['figure', 'arrow'],
      opacity: 0.2,
    };
    const source = page(
      [
        effect('group-in', { targetId: 'group' }),
        effect('group-move', {
          targetId: 'group',
          kind: 'move',
          trigger: 'with-previous',
          dx: 100,
          dy: 0,
        }),
        effect('child-out', { kind: 'fade-out', trigger: 'with-previous' }),
      ],
      [group, figure, arrow],
    );
    const compiled = compileTimeline(source);
    expect(compiled?.sample(0).get('arrow')?.opacity).toBe(0);
    expect(compiled?.sample(200).get('figure')?.opacity).toBeCloseTo(0.2);
    expect(compiled?.sample(400).get('figure')?.opacity).toBe(0);
    expect(compiled?.sample(400).get('arrow')?.opacity).toBe(1);
    expect(compiled?.sample(400).get('arrow')?.matrix[4]).toBe(350);
    for (const action of [
      effect('pulse', { targetId: 'group', kind: 'pulse' }),
      effect('move', { targetId: 'group', kind: 'move', dx: 20, dy: 0 }),
    ]) {
      const state = compileTimeline(page([action], [group, figure, arrow]))?.sample(200);
      expect(state?.get('figure')?.opacity).toBe(0.8);
      expect(state?.get('arrow')?.opacity).toBe(1);
    }
  });

  it('rejects overlapping writes and permits adjacent or independent property actions', () => {
    const overlapping = page([
      effect('in'),
      effect('out', { kind: 'fade-out', trigger: 'with-previous' }),
    ]);
    expect(() => validatePageAnimation(overlapping.timeline, overlapping)).toThrow(/重叠/);
    const sequential = page([
      effect('in'),
      effect('out', { kind: 'fade-out', trigger: 'after-previous' }),
    ]);
    expect(resolvePageAnimation(sequential)?.steps).toHaveLength(1);
    expect(compileTimeline(sequential)?.sample(800).get('figure')?.opacity).toBe(0);
    const independent = page([
      effect('in'),
      effect('move', { kind: 'move', trigger: 'with-previous', dx: 40, dy: 0 }),
    ]);
    expect(() => compileTimeline(independent)).not.toThrow();
  });

  it('rejects malformed effects, excessive durations and future versions without mutation', () => {
    const invalidChanges: Partial<BuildEffect>[] = [
      { targetId: 'missing' },
      { trigger: 'with-previous' },
      { durationMs: 0 },
      { kind: 'appear', durationMs: 1 },
      { kind: 'pulse', durationMs: 1 },
      { kind: 'move' },
      { kind: 'move', dx: Number.NaN, dy: 0 },
      { delayMs: -1 },
      { delayMs: 600_001 },
      { durationMs: 60_001 },
      { durationMs: 0.5 },
      { label: 'x'.repeat(201) },
      { dx: 2 },
      { id: 'bad\0id' },
    ];
    for (const patch of invalidChanges) {
      const source = page([effect('invalid', patch)]);
      const before = structuredClone(source);
      expect(() => resolvePageAnimation(source)).toThrow();
      expect(source).toEqual(before);
    }
    expect(() => resolvePageAnimation(page([effect('same'), effect('same')]))).toThrow(/重复/);
    expect(() =>
      resolvePageAnimation(
        page(Array.from({ length: 11 }, (_, i) => effect(String(i), { durationMs: 60_000 }))),
      ),
    ).toThrow(/10 分钟/);
    expect(() =>
      resolvePageAnimation(page(Array.from({ length: 257 }, (_, i) => effect(String(i))))),
    ).toThrow(/256/);
    const future = {
      elements: [figure],
      timeline: { schemaVersion: 99, effects: [{ opaque: 'preserve' }] },
    };
    const before = structuredClone(future);
    expect(() => readPageAnimation(future)).toThrow(/版本/);
    expect(future).toEqual(before);
  });

  it('keeps empty builds static and legacy cue semantics without inventing empty clicks', () => {
    expect(resolvePageAnimation(page([]))).toMatchObject({ timeline: null, steps: [] });
    expect(compileTimeline(page([]))).toBeNull();
    const legacy: PptdPage = {
      elements: [figure],
      timeline: { schemaVersion: 1, durationMs: 3000, tracks: [] },
    };
    expect(resolvePageAnimation(legacy)).toMatchObject({ steps: [] });
    (legacy.timeline as { cues?: unknown }).cues = [{ id: 'explain', timeMs: 1000, label: '解释' }];
    expect(resolvePageAnimation(legacy)?.steps.map((step) => step.endMs)).toEqual([1000, 3000]);
    expect(readTimeline(legacy)).toBe(legacy.timeline);
  });

  it('accepts retained long waits without extending the total animation budget', () => {
    const source = page([effect('wait', { delayMs: 599_600 })]);
    expect(resolvePageAnimation(source)?.timeline?.durationMs).toBe(600_000);
    expect(compileTimeline(source)?.sample(599_600).get('figure')?.opacity).toBe(0);
    expect(compileTimeline(source)?.sample(600_000).get('figure')?.opacity).toBe(0.8);
    expect(() => resolvePageAnimation(page([effect('overflow', { delayMs: 600_000 })]))).toThrow(
      /10 分钟/,
    );
  });

  it('supports 256 pulses and long target identities within per-track and global budgets', () => {
    const target = { ...figure, elementId: 'x'.repeat(256) };
    const source = page(
      Array.from({ length: 256 }, (_, index) =>
        effect(String(index), { targetId: target.elementId, kind: 'pulse', delayMs: 1 }),
      ),
      [target],
    );
    const resolved = resolvePageAnimation(source);
    expect(resolved?.steps).toHaveLength(256);
    expect(resolved?.timeline?.tracks[0].keyframes).toHaveLength(769);
    expect(() => validatePageAnimation(resolved?.timeline, source)).not.toThrow();
    expect(
      compileTimeline(source)
        ?.sample(256 * 401)
        .get(target.elementId)?.matrix[0],
    ).toBe(1);
  });
});

describe('page transition data', () => {
  it('validates none/fade independently of either animation mode', () => {
    expect(readPageTransition(page([]))).toBeNull();
    const transition = { schemaVersion: 1 as const, kind: 'fade' as const, durationMs: 200 };
    expect(readPageTransition({ ...page([]), transition })).toBe(transition);
    expect(() =>
      validatePageTransition({ schemaVersion: 1, kind: 'none', durationMs: 0 }),
    ).not.toThrow();
    for (const value of [
      null,
      [],
      { schemaVersion: 2, kind: 'fade', durationMs: 200 },
      { schemaVersion: 1, kind: 'none', durationMs: 1 },
      { schemaVersion: 1, kind: 'fade', durationMs: 0 },
      { schemaVersion: 1, kind: 'fade', durationMs: 5001 },
      { schemaVersion: 1, kind: 'fade', durationMs: 0.5 },
    ])
      expect(() => validatePageTransition(value)).toThrow(/页面转场/);
  });
});
