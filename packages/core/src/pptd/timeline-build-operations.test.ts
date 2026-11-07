import { describe, expect, it } from 'vitest';
import {
  type BuildEffect,
  type BuildTimeline,
  compileTimeline,
  type PageTimeline,
  resolvePageAnimation,
  validatePageAnimation,
} from './animation-model';
import { resolveBuildTiming } from './build-model';
import {
  copiedTimelineTracks,
  groupBuildEffects,
  knownTimeline,
  removeBuildEffect,
  removeTimelineTargets,
  reorderBuildStep,
  selectedTimelineTargets,
  timelineTargetIds,
} from './timeline-operations';
import type { PptdElement } from './types';

const elements: PptdElement[] = ['a', 'b', 'c', 'copy'].map((elementId, index) => ({
  elementId,
  elementType: 'shape',
  bounds: [index * 20, index * 20, 40, 30],
}));
function effect(
  id: string,
  targetId: string,
  trigger: BuildEffect['trigger'] = 'click',
): BuildEffect {
  return { id, targetId, trigger, kind: 'pulse', durationMs: 400, delayMs: 0 };
}
function animation(): BuildTimeline {
  return {
    schemaVersion: 2,
    effects: [
      { ...effect('first', 'a'), label: 'First group' },
      effect('with', 'b', 'with-previous'),
      effect('second', 'c'),
      effect('after', 'a', 'after-previous'),
      effect('third', 'b'),
    ],
  };
}

describe('build timeline editing operations', () => {
  it.each(['target deletion', 'effect deletion', 'clipboard selection'] as const)(
    'preserves a middle action timing bridge during %s',
    (operation) => {
      const source: BuildTimeline = {
        schemaVersion: 2,
        effects: [
          { ...effect('enter', 'a'), kind: 'fade-in', durationMs: 1000 },
          { ...effect('bridge', 'b', 'after-previous'), kind: 'appear', durationMs: 0 },
          { ...effect('exit', 'a', 'with-previous'), kind: 'fade-out', durationMs: 1000 },
        ],
      };
      const before = structuredClone(source);
      const result =
        operation === 'target deletion'
          ? removeTimelineTargets(source, new Set(['b']))
          : operation === 'effect deletion'
            ? removeBuildEffect(source, 'bridge')
            : selectedTimelineTargets(source, new Set(['a']));
      expect(result).toMatchObject({
        schemaVersion: 2,
        effects: [
          { id: 'enter', trigger: 'click', delayMs: 0 },
          { id: 'exit', trigger: 'with-previous', delayMs: 1000 },
        ],
      });
      const retainedPage = {
        elements: elements.filter((item) => item.elementId !== 'b'),
        timeline: result,
      };
      expect(resolvePageAnimation(retainedPage)?.steps.map((step) => step.endMs)).toEqual([2000]);
      const original = compileTimeline({ elements, timeline: source });
      const retained = compileTimeline(retainedPage);
      for (const time of [0, 500, 1000, 1500, 2000])
        expect(retained?.sample(time).get('a')).toEqual(original?.sample(time).get('a'));
      expect(source).toEqual(before);

      if (operation === 'clipboard selection') {
        let id = 0;
        const pasted = copiedTimelineTracks(result, null, { a: 'copy' }, () => `paste-${id++}`);
        expect(() => validatePageAnimation(pasted, { elements })).not.toThrow();
        expect(resolvePageAnimation({ elements, timeline: pasted })?.steps[0].endMs).toBe(2000);
      }
    },
  );

  it('reanchors automatic actions to retained predecessors without changing concurrent timing', () => {
    const source: BuildTimeline = {
      schemaVersion: 2,
      effects: [
        { ...effect('long', 'a'), durationMs: 1000 },
        { ...effect('short', 'b', 'with-previous'), durationMs: 100, delayMs: 100 },
        { ...effect('concurrent', 'c', 'after-previous'), delayMs: 50 },
        { ...effect('head', 'a'), durationMs: 400 },
        { ...effect('bridge', 'b', 'after-previous'), delayMs: 100 },
        { ...effect('after', 'a', 'after-previous'), delayMs: 50 },
      ],
    };
    const result = removeTimelineTargets(source, new Set(['b']));
    expect(result).toMatchObject({
      effects: [
        { id: 'long', trigger: 'click', delayMs: 0 },
        { id: 'concurrent', trigger: 'with-previous', delayMs: 250 },
        { id: 'head', trigger: 'click', delayMs: 0 },
        { id: 'after', trigger: 'after-previous', delayMs: 550 },
      ],
    });
    expect(() => validatePageAnimation(result, { elements })).not.toThrow();
    const original = compileTimeline({ elements, timeline: source });
    const retained = compileTimeline({ elements, timeline: result });
    for (const time of [0, 250, 450, 650, 1000, 1400, 1950, 2150, 2350])
      for (const target of ['a', 'c'])
        expect(retained?.sample(time).get(target)).toEqual(original?.sample(time).get(target));
  });

  it('preserves original waits when removing click heads across consecutive delayed groups', () => {
    const source: BuildTimeline = {
      schemaVersion: 2,
      effects: [
        { ...effect('head-1', 'a'), delayMs: 100, label: 'First wait' },
        { ...effect('keep-1', 'b', 'after-previous'), delayMs: 200 },
        { ...effect('with-1', 'c', 'with-previous'), delayMs: 50 },
        { ...effect('head-2', 'a'), delayMs: 1000, label: 'Second wait' },
        { ...effect('keep-2', 'b', 'after-previous'), delayMs: 200 },
        { ...effect('empty-group', 'a'), delayMs: 30 },
        { ...effect('last-group', 'c'), delayMs: 40 },
      ],
    };
    const pruned = removeTimelineTargets(source, new Set(['a']));
    if (pruned.schemaVersion !== 2) throw new Error('Expected authored builds');
    expect(pruned.effects).toMatchObject([
      { id: 'keep-1', trigger: 'click', delayMs: 700, label: 'First wait' },
      { id: 'with-1', trigger: 'with-previous', delayMs: 50 },
      { id: 'keep-2', trigger: 'click', delayMs: 1600, label: 'Second wait' },
      { id: 'last-group', trigger: 'click', delayMs: 40 },
    ]);
    expect(
      resolveBuildTiming(pruned).effects.map(({ effect, startMs, endMs }) => [
        effect.id,
        startMs,
        endMs,
      ]),
    ).toEqual([
      ['keep-1', 700, 1100],
      ['with-1', 750, 1150],
      ['keep-2', 2750, 3150],
      ['last-group', 3190, 3590],
    ]);
    expect(resolvePageAnimation({ elements, timeline: pruned })?.steps).toHaveLength(3);
  });

  it('shortens a step after deleting its tail while keeping the next click delay independent', () => {
    const source: BuildTimeline = {
      schemaVersion: 2,
      effects: [
        { ...effect('head', 'a'), delayMs: 100 },
        { ...effect('tail', 'b', 'after-previous'), delayMs: 200 },
        { ...effect('next', 'c'), delayMs: 300 },
      ],
    };
    const pruned = removeBuildEffect(source, 'tail');
    expect(resolveBuildTiming(pruned).steps.map(({ startMs, endMs }) => [startMs, endMs])).toEqual([
      [0, 500],
      [500, 1200],
    ]);
    expect(pruned.effects[1]).toEqual(source.effects[2]);
    expect(removeTimelineTargets(source, new Set(['a', 'b', 'c']))).toEqual({
      schemaVersion: 2,
      effects: [],
    });
  });

  it('retains multi-minute timing bridges within the unchanged ten-minute total budget', () => {
    const source: BuildTimeline = {
      schemaVersion: 2,
      effects: [
        { ...effect('enter', 'a'), kind: 'fade-in', durationMs: 1000, delayMs: 10 },
        { ...effect('bridge-1', 'b', 'after-previous'), durationMs: 60_000, delayMs: 60_000 },
        { ...effect('bridge-2', 'b', 'after-previous'), durationMs: 60_000, delayMs: 60_000 },
        {
          ...effect('exit', 'a', 'after-previous'),
          kind: 'fade-out',
          durationMs: 1000,
          delayMs: 100,
        },
        { ...effect('head-2', 'a'), durationMs: 60_000, delayMs: 60_000 },
        { ...effect('bridge-3', 'b', 'after-previous'), durationMs: 60_000, delayMs: 60_000 },
        { ...effect('last', 'a', 'after-previous'), delayMs: 100 },
      ],
    };
    const pruned = removeTimelineTargets(source, new Set(['b']));
    expect(pruned).toMatchObject({
      effects: [
        { id: 'enter', delayMs: 10 },
        { id: 'exit', trigger: 'after-previous', delayMs: 240_100 },
        { id: 'head-2', delayMs: 60_000 },
        { id: 'last', trigger: 'after-previous', delayMs: 120_100 },
      ],
    });
    expect(resolvePageAnimation({ elements, timeline: pruned })?.timeline?.durationMs).toBe(
      482_610,
    );
    const original = compileTimeline({ elements, timeline: source });
    const retained = compileTimeline({ elements, timeline: pruned });
    for (const time of [
      0, 10, 510, 1010, 100_000, 241_610, 242_110, 302_110, 332_110, 362_110, 482_410, 482_610,
    ])
      expect(retained?.sample(time).get('a')).toEqual(original?.sample(time).get('a'));
    const selected = selectedTimelineTargets(source, new Set(['b']));
    expect(selected).toMatchObject({
      effects: [
        { id: 'bridge-1', trigger: 'click', delayMs: 61_010 },
        { id: 'bridge-2', trigger: 'after-previous', delayMs: 60_000 },
        { id: 'bridge-3', trigger: 'click', delayMs: 180_000 },
      ],
    });
    expect(() => validatePageAnimation(selected, { elements })).not.toThrow();
  });

  it('keeps every click group independent when its leading target is deleted', () => {
    const source = animation();
    const before = structuredClone(source);
    const pruned = removeTimelineTargets(source, new Set(['a']));
    expect(pruned).toMatchObject({
      effects: [
        { id: 'with', trigger: 'click', label: 'First group' },
        { id: 'second', trigger: 'click' },
        { id: 'third', trigger: 'click' },
      ],
    });
    expect(() =>
      validatePageAnimation(pruned, {
        elements: elements.filter((element) => element.elementId !== 'a'),
      }),
    ).not.toThrow();
    expect(source).toEqual(before);
    expect(removeBuildEffect(source, 'missing')).toBe(source);
    expect(removeBuildEffect(source, 'second').effects[2]).toMatchObject({
      id: 'after',
      trigger: 'click',
    });
  });

  it('reorders whole steps with their simultaneous and automatic actions intact', () => {
    const source = animation();
    const changed = reorderBuildStep(source, 'second', -1);
    expect(groupBuildEffects(changed.effects).map((group) => group.map((item) => item.id))).toEqual(
      [['second', 'after'], ['first', 'with'], ['third']],
    );
    expect(reorderBuildStep(source, 'first', -1)).toBe(source);
    expect(reorderBuildStep(source, 'third', 1)).toBe(source);
    expect(source.effects[0].id).toBe('first');
  });

  it('duplicates effects at the same presentation time while leaving relative motion unchanged', () => {
    const source: BuildTimeline = {
      schemaVersion: 2,
      effects: [
        { ...effect('appear-a', 'a'), kind: 'fade-in', delayMs: 200 },
        {
          ...effect('appear-b', 'b', 'with-previous'),
          kind: 'appear',
          durationMs: 0,
          delayMs: 100,
        },
        { ...effect('move-a', 'a'), kind: 'move', dx: 30, dy: 10 },
      ],
    };
    let id = 0;
    const duplicated = copiedTimelineTracks(source, source, { a: 'copy' }, () => `new-${id++}`, 60);
    if (duplicated?.schemaVersion !== 2) throw new Error('Expected authored builds');
    expect(duplicated.effects.filter((item) => item.targetId === 'copy')).toMatchObject([
      { trigger: 'with-previous', delayMs: 0 },
      { trigger: 'with-previous', delayMs: 0, dx: 30, dy: 10 },
    ]);
    expect(() => validatePageAnimation(duplicated, { elements })).not.toThrow();
    const compiled = compileTimeline({ elements, timeline: duplicated });
    for (const time of [0, 100, 200, 400, 600, 800, 1000]) {
      const frame = compiled?.sample(time);
      expect(frame?.get('copy')?.opacity).toBe(frame?.get('a')?.opacity);
      expect((frame?.get('copy')?.matrix[4] ?? 0) - (frame?.get('a')?.matrix[4] ?? 0)).toBe(60);
    }
  });

  it('copies a subset as independent click groups and remaps stable targets', () => {
    const source = animation();
    const selected = selectedTimelineTargets(source, new Set(['b']));
    expect(selected).toMatchObject({
      effects: [
        { id: 'with', trigger: 'click' },
        { id: 'third', trigger: 'click' },
      ],
    });
    expect(selectedTimelineTargets(source, new Set(['missing']))).toBeNull();
    const destination: BuildTimeline = { schemaVersion: 2, effects: [effect('existing', 'c')] };
    let id = 0;
    const pasted = copiedTimelineTracks(
      selected,
      destination,
      { b: 'copy' },
      () => `paste-${id++}`,
      20,
    );
    expect(timelineTargetIds(pasted as BuildTimeline)).toEqual(['c', 'copy']);
    if (pasted?.schemaVersion !== 2) throw new Error('Expected authored builds');
    expect(pasted.effects.map((item) => [item.id, item.trigger])).toEqual([
      ['existing', 'click'],
      ['paste-0', 'click'],
      ['paste-1', 'click'],
    ]);
    expect(() => validatePageAnimation(pasted, { elements })).not.toThrow();
  });

  it('refuses to flatten mixed nonempty modes and preserves unknown schemas', () => {
    const source = animation();
    const free: PageTimeline = {
      schemaVersion: 1,
      durationMs: 1000,
      tracks: [
        {
          id: 'x',
          targetId: 'a',
          property: 'x',
          keyframes: [{ id: 'k', timeMs: 0, value: 0, easing: 'hold' }],
        },
      ],
    };
    expect(() => copiedTimelineTracks(source, free, { a: 'copy' }, () => 'copy')).toThrow(/转换/);
    expect(() => copiedTimelineTracks(free, source, { a: 'copy' }, () => 'copy')).toThrow(/转换/);
    expect(
      copiedTimelineTracks(
        source,
        { schemaVersion: 1, durationMs: 1000, tracks: [] },
        { b: 'copy' },
        (() => {
          let i = 0;
          return () => `id-${i++}`;
        })(),
      )?.schemaVersion,
    ).toBe(2);
    expect(knownTimeline({ elements, timeline: { schemaVersion: 99, opaque: 'keep' } })).toBeNull();
  });
});
