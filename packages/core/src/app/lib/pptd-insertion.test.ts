import { describe, expect, it } from 'vitest';
import { createPlacedElement } from './pptd-insertion';

describe('canvas tool placement', () => {
  it('places a clicked text box inside the page near its lower right edge', () => {
    const element = createPlacedElement(
      { kind: 'text' },
      { x: 950, y: 530 },
      { x: 951, y: 531 },
      [960, 540],
      { dragged: false, elementId: 'text' },
    );
    expect(element.bounds).toEqual([600, 484, 360, 56]);
    expect(element.content?.text).toBe('Type here');
  });
  it('keeps the dragged shape type and normalizes an upward-left gesture', () => {
    const element = createPlacedElement(
      { kind: 'shape', shapeName: 'ellipse' },
      { x: 400, y: 300 },
      { x: 150, y: 180 },
      [960, 540],
      { dragged: true, elementId: 'ellipse' },
    );
    expect(element.bounds).toEqual([150, 180, 250, 120]);
    expect(element.shapeName).toBe('ellipse');
  });
  it('constrains Shift shapes to a square without moving outside the canvas', () => {
    const element = createPlacedElement(
      { kind: 'shape', shapeName: 'rect' },
      { x: 920, y: 480 },
      { x: 960, y: 540 },
      [960, 540],
      { dragged: true, constrain: true, elementId: 'square' },
    );
    expect(element.bounds).toEqual([920, 480, 40, 40]);
  });
  it('preserves a reversed diagonal line and its arrow direction', () => {
    const element = createPlacedElement(
      { kind: 'line', arrow: true },
      { x: 300, y: 100 },
      { x: 100, y: 300 },
      [960, 540],
      { dragged: true, elementId: 'line' },
    );
    expect(element.bounds).toEqual([100, 100, 200, 200]);
    expect(element.points).toBe('200,0 0,200');
    expect(element.arrow).toEqual([null, 'arrow']);
  });
  it.each([
    [{ x: 900, y: 450 }, { x: 960, y: 540 }, [900, 450, 60, 60], '0,0 60,60'],
    [{ x: 60, y: 90 }, { x: 0, y: 0 }, [0, 30, 60, 60], '60,60 0,0'],
    [{ x: 900, y: 90 }, { x: 960, y: 0 }, [900, 30, 60, 60], '0,60 60,0'],
    [{ x: 60, y: 450 }, { x: 0, y: 540 }, [0, 450, 60, 60], '60,0 0,60'],
  ] as const)(
    'keeps a Shift line at 45 degrees when stopped by the page edge',
    (start, end, bounds, points) => {
      const element = createPlacedElement({ kind: 'line' }, start, end, [960, 540], {
        dragged: true,
        constrain: true,
        elementId: 'constrained-line',
      });
      expect(element.bounds).toEqual(bounds);
      expect(element.points).toBe(points);
    },
  );
  it('keeps vertical and horizontal lines drawable with nonzero bounds', () => {
    const vertical = createPlacedElement(
      { kind: 'line' },
      { x: 200, y: 100 },
      { x: 200, y: 300 },
      [960, 540],
      { dragged: true, elementId: 'vertical' },
    );
    const horizontal = createPlacedElement(
      { kind: 'line' },
      { x: 100, y: 200 },
      { x: 300, y: 200 },
      [960, 540],
      { dragged: true, elementId: 'horizontal' },
    );
    expect(vertical.bounds).toEqual([200, 100, 1, 200]);
    expect(vertical.points).toBe('0.5,0 0.5,200');
    expect(horizontal.bounds).toEqual([100, 200, 200, 1]);
    expect(horizontal.points).toBe('0,0.5 200,0.5');
  });
  it('fits default objects in a smaller page and clamps an outside gesture', () => {
    const clicked = createPlacedElement(
      { kind: 'shape', shapeName: 'rect' },
      { x: 80, y: 70 },
      { x: 80, y: 70 },
      [100, 80],
      { dragged: false, elementId: 'clicked' },
    );
    const dragged = createPlacedElement(
      { kind: 'shape', shapeName: 'rect' },
      { x: -30, y: -20 },
      { x: 150, y: 100 },
      [100, 80],
      { dragged: true, elementId: 'dragged' },
    );
    expect(clicked.bounds).toEqual([0, 0, 100, 80]);
    expect(dragged.bounds).toEqual([0, 0, 100, 80]);
  });
});
