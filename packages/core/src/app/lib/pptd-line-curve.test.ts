import { describe, expect, it } from 'vitest';
import type { PptdElement } from '../../pptd/types';
import { lineBendPercent, lineCurvePatch, lineSvgPath } from './pptd-line-curve';

function line(bounds: [number, number, number, number], points: string): PptdElement {
  return {
    elementId: 'L',
    elementType: 'line',
    bounds,
    points,
    viewBox: [bounds[2], bounds[3]],
    arrow: [null, 'arrow'],
  };
}
describe('editable Bezier line geometry', () => {
  it('converts a horizontal line to a bounded curve without moving endpoints', () => {
    const source = line([100, 200, 200, 1], '0,0.5 200,0.5');
    const next = lineCurvePatch(source, 'smooth', 30);
    expect(next.curve).toBe('smooth');
    expect(next.bounds).toEqual([100, 140.5, 200, 60]);
    expect(next.points).toBe('0,60 100,0 200,60');
    expect(lineSvgPath({ ...source, ...next })).toContain(' Q');
    expect(lineBendPercent({ ...source, ...next })).toBe(30);
    expect(source.points).toBe('0,0.5 200,0.5');
  });
  it('supports signed bends, vertical lines and straight conversion', () => {
    const original = line([20, 30, 1, 100], '0.5,0 0.5,100');
    const bent = lineCurvePatch(original, 'smooth', -50);
    expect(bent.bounds?.[2]).toBeGreaterThan(1);
    expect(lineBendPercent({ ...original, ...bent })).toBe(-50);
    const straight = lineCurvePatch({ ...original, ...bent }, 'sharp');
    expect((straight.points as string).split(' ')).toHaveLength(2);
  });
  it('keeps curve controls on the page when inserted near an edge', () => {
    const source = line([0, 0, 80, 1], '0,0.5 80,0.5');
    const patch = lineCurvePatch(source, 'smooth', 50, [80, 60]);
    expect(patch.bounds?.[1]).toBeGreaterThanOrEqual(0);
    expect((patch.points as string).split(' ')).toHaveLength(3);
  });
});
