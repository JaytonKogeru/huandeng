import { describe, expect, it } from 'vitest';
import type { Bounds, PptdElement } from '../../pptd/types';
import { snapMoveWithSpacing } from './inspector/geometry';
import {
  arrangeElementBounds,
  distributeElementBounds,
  elementVisualRect,
  rootSelectedElements,
  snapTargetsForSelection,
} from './pptd-geometry';

const shape = (elementId: string, bounds: Bounds, rotation = 0): PptdElement => ({
  elementId,
  elementType: 'shape',
  bounds,
  rotation,
});
const group = (elementId: string, bounds: Bounds, children: string[]): PptdElement => ({
  elementId,
  elementType: 'group',
  bounds,
  children,
});

describe('PPTD selection geometry', () => {
  const elements = [
    shape('a', [100, 100, 40, 20]),
    shape('b', [180, 100, 40, 20]),
    group('inner', [100, 100, 120, 20], ['a', 'b']),
    shape('c', [300, 100, 40, 20]),
    group('outer', [100, 100, 240, 20], ['inner', 'c']),
    shape('other', [600, 100, 100, 80]),
  ];

  it('moves a parent only once even when its nested members are selected', () => {
    expect(
      rootSelectedElements(elements, ['a', 'inner', 'outer', 'other']).map(
        (element) => element.elementId,
      ),
    ).toEqual(['outer', 'other']);
    expect(rootSelectedElements(elements, ['a']).map((element) => element.elementId)).toEqual([
      'a',
    ]);
  });

  it('excludes every descendant from the selected group’s frozen references', () => {
    const targets = snapTargetsForSelection(elements, ['outer'], [1280, 720]);
    expect(targets.rects).toEqual([
      { x: 600, y: 100, width: 100, height: 80 },
      { x: 0, y: 0, width: 1280, height: 720 },
    ]);
    const result = snapMoveWithSpacing(elementVisualRect(elements[4]), { x: 3, y: 30 }, targets, 5);
    expect(result.delta.x).toBe(3);
  });

  it('excludes ancestors while preserving unrelated siblings for individual member editing', () => {
    const targets = snapTargetsForSelection(elements, ['a'], [1280, 720]);
    expect(targets.rects).toEqual([
      { x: 180, y: 100, width: 40, height: 20 },
      { x: 300, y: 100, width: 40, height: 20 },
      { x: 600, y: 100, width: 100, height: 80 },
      { x: 0, y: 0, width: 1280, height: 720 },
    ]);
    const inner = snapTargetsForSelection(elements, ['inner', 'a'], [1280, 720]);
    expect(inner.rects).toHaveLength(3);
    expect(inner.rects[0].x).toBe(300);
  });

  it('uses an unrelated group as one reference and does not retain mutable element bounds', () => {
    const source = structuredClone(elements);
    const targets = snapTargetsForSelection(source, ['other'], [1280, 720]);
    expect(targets.rects).toEqual([
      { x: 100, y: 100, width: 240, height: 20 },
      { x: 0, y: 0, width: 1280, height: 720 },
    ]);
    source[4].bounds = [800, 500, 240, 20];
    expect(targets.rects[0]).toEqual({ x: 100, y: 100, width: 240, height: 20 });
  });

  it('does not snap to objects wholly outside the page', () => {
    const targets = snapTargetsForSelection(
      [shape('current', [100, 100, 100, 100]), shape('outside', [1400, 100, 100, 100])],
      ['current'],
      [1280, 720],
    );
    expect(targets.rects).toEqual([{ x: 0, y: 0, width: 1280, height: 720 }]);
  });
});

describe('PPTD alignment and spacing', () => {
  it('aligns visible rotated edges while preserving local dimensions', () => {
    const elements = [
      shape('rotated', [100, 100, 100, 40], 90),
      shape('plain', [400, 100, 40, 20]),
    ];
    expect(arrangeElementBounds(elements, 'left', [1280, 720], 'selection')).toEqual([
      { elementId: 'rotated', bounds: [100, 100, 100, 40] },
      { elementId: 'plain', bounds: [130, 100, 40, 20] },
    ]);
    expect(arrangeElementBounds(elements, 'left', [1280, 720], 'slide')).toEqual([
      { elementId: 'rotated', bounds: [-30, 100, 100, 40] },
      { elementId: 'plain', bounds: [0, 100, 40, 20] },
    ]);
    expect(elements[0].bounds).toEqual([100, 100, 100, 40]);
    expect(elements[0].rotation).toBe(90);
  });

  it('allows several objects to align to the slide and defaults a single object to it', () => {
    const elements = [shape('a', [100, 100, 100, 40], 90), shape('b', [400, 100, 40, 20])];
    expect(
      arrangeElementBounds(elements, 'center', [1280, 720], 'slide').map((item) => item.bounds),
    ).toEqual([
      [590, 100, 100, 40],
      [620, 100, 40, 20],
    ]);
    expect(
      arrangeElementBounds([elements[0]], 'center', [1280, 720], 'selection')[0].bounds,
    ).toEqual([590, 100, 100, 40]);
  });

  it('distributes unequal widths by empty gaps with the two outer objects fixed', () => {
    const elements = [
      shape('a', [0, 100, 40, 20]),
      shape('b', [80, 100, 60, 20]),
      shape('c', [300, 100, 80, 20]),
    ];
    expect(distributeElementBounds(elements, 'x').map((item) => item.bounds)).toEqual([
      [0, 100, 40, 20],
      [140, 100, 60, 20],
      [300, 100, 80, 20],
    ]);
    expect(distributeElementBounds(elements.slice(0, 2), 'x').map((item) => item.bounds)).toEqual(
      elements.slice(0, 2).map((element) => element.bounds),
    );
  });

  it('distributes rotated visible heights without rewriting their rotations or sizes', () => {
    const elements = [
      shape('a', [0, 0, 100, 40], 90),
      shape('b', [50, 140, 60, 20]),
      shape('c', [100, 300, 40, 30]),
    ];
    const before = elements.map(elementVisualRect);
    const changes = distributeElementBounds(elements, 'y');
    const after = elements.map((element, index) =>
      elementVisualRect({ ...element, bounds: changes[index].bounds }),
    );
    expect(after[0]).toEqual(before[0]);
    expect(after[2]).toEqual(before[2]);
    expect(after[1].y - (after[0].y + after[0].height)).toBeCloseTo(
      after[2].y - (after[1].y + after[1].height),
    );
    expect(
      changes.every(
        (change, index) =>
          change.bounds[2] === elements[index].bounds?.[2] &&
          change.bounds[3] === elements[index].bounds?.[3],
      ),
    ).toBe(true);
  });
});
