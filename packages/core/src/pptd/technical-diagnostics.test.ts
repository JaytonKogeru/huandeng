import { describe, expect, it } from 'vitest';
import { deckFixture } from './fixtures.test-utils';
import {
  requestedPageFonts,
  rotatedElementBounds,
  technicalDiagnostics,
} from './technical-diagnostics';
import type { PageSnapshot, PptdElement } from './types';

function page(elements: PptdElement[]): PageSnapshot {
  return deckFixture(elements).pages[0];
}

describe('technical page diagnostics', () => {
  it('leaves source objects and geometry unchanged when checking a healthy page', () => {
    const source = page([
      {
        elementId: 'text',
        elementType: 'text',
        bounds: [30, 30, 100, 40],
        content: { text: 'Evidence', fontFamily: 'Arial' },
      },
    ]);
    const before = structuredClone(source);
    expect(technicalDiagnostics(source, [960, 540])).toEqual([]);
    expect(source).toEqual(before);
  });

  it('uses the rotated frame for out-of-canvas warnings without rejecting intentional bleed', () => {
    const source = page([
      { elementId: 'rotated', elementType: 'shape', bounds: [0, 0, 100, 20], rotation: 90 },
      {
        elementId: 'bleed',
        elementType: 'image',
        bounds: [-10, 20, 200, 100],
        src: 'media/figure.png',
      },
      { elementId: 'inside', elementType: 'text', bounds: [200, 200, 100, 20], rotation: 45 },
    ]);
    const issues = technicalDiagnostics(source, [960, 540]);
    expect(issues.map((issue) => [issue.code, issue.elementId, issue.severity])).toEqual([
      ['QA_OUTSIDE_CANVAS', 'rotated', 'warning'],
      ['QA_OUTSIDE_CANVAS', 'bleed', 'warning'],
    ]);
    expect(rotatedElementBounds([0, 0, 100, 20], 90)[1]).toBeCloseTo(-40);
  });

  it('ignores floating-point rotation noise at the canvas edge', () => {
    expect(
      technicalDiagnostics(
        page([
          { elementId: 'edge', elementType: 'shape', bounds: [0, 0, 100, 100], rotation: 180 },
        ]),
        [100, 100],
      ),
    ).toEqual([]);
  });

  it('distinguishes valid horizontal and vertical lines from empty frames', () => {
    const source = page([
      { elementId: 'horizontal', elementType: 'line', bounds: [10, 10, 100, 0] },
      { elementId: 'vertical', elementType: 'line', bounds: [10, 10, 0, 100] },
      { elementId: 'point', elementType: 'line', bounds: [10, 10, 0, 0] },
      { elementId: 'empty', elementType: 'text', bounds: [10, 10, 0, 100] },
    ]);
    expect(technicalDiagnostics(source, [960, 540]).map((issue) => issue.elementId)).toEqual([
      'point',
      'empty',
    ]);
  });

  it('reports invalid dimensions and rotations without throwing in the inspector', () => {
    const source = page([
      { elementId: 'negative', elementType: 'shape', bounds: [0, 0, -5, 20] },
      { elementId: 'nan', elementType: 'shape', bounds: [0, 0, 20, 20], rotation: Number.NaN },
      { elementId: 'missing', elementType: 'text' },
    ]);
    expect(technicalDiagnostics(source, [0, 540]).map((issue) => issue.code)).toEqual([
      'QA_INVALID_PAGE_SIZE',
      'QA_INVALID_BOUNDS',
      'QA_INVALID_ROTATION',
      'QA_BOUNDS_MISSING',
    ]);
  });

  it('reports invalid image crops and missing sources while retaining valid transparent padding', () => {
    const source = page([
      {
        elementId: 'invalid-crop',
        elementType: 'image',
        bounds: [10, 10, 20, 20],
        src: 'figure.png',
        crop: { left: 0.6, right: 0.4 },
      },
      {
        elementId: 'bad-number',
        elementType: 'image',
        bounds: [10, 10, 20, 20],
        src: 'figure.png',
        crop: { top: 'half' },
      },
      {
        elementId: 'padding',
        elementType: 'image',
        bounds: [10, 10, 20, 20],
        src: 'figure.png',
        crop: { top: -0.1 },
      },
      { elementId: 'no-source', elementType: 'image', bounds: [10, 10, 20, 20] },
    ]);
    const issues = technicalDiagnostics(source, [960, 540]);
    expect(issues.filter((issue) => issue.code === 'QA_INVALID_IMAGE_CROP')).toHaveLength(2);
    expect(issues.find((issue) => issue.elementId === 'padding')?.severity).toBe('warning');
    expect(issues.find((issue) => issue.elementId === 'no-source')?.code).toBe(
      'QA_IMAGE_SOURCE_MISSING',
    );
  });

  it('locates missing local assets on every affected object and identifies theme assets separately', () => {
    const source = page([
      {
        elementId: 'figure',
        elementType: 'image',
        bounds: [10, 10, 100, 100],
        src: 'media/missing.png',
      },
      {
        elementId: 'nested',
        elementType: 'shape',
        bounds: [20, 20, 100, 100],
        fill: { image: { url: 'media/missing.png' } },
      },
      {
        elementId: 'available',
        elementType: 'image',
        bounds: [30, 30, 100, 100],
        src: 'media/present.png',
      },
    ]);
    source.assetRevisions = {
      'media/missing.png': null,
      'media/background.png': null,
      'media/present.png': 'sha256:present',
    };
    const issues = technicalDiagnostics(source, [960, 540]);
    expect(issues.map((issue) => issue.elementId)).toEqual(['figure', 'nested', undefined]);
    expect(
      issues.every(
        (issue) => issue.code === 'QA_ASSET_UNAVAILABLE' && issue.pageId === source.pageId,
      ),
    ).toBe(true);
  });

  it('does not label unknown or remote assets as missing without evidence', () => {
    const source = page([
      {
        elementId: 'remote',
        elementType: 'image',
        bounds: [0, 0, 100, 100],
        src: 'https://example.invalid/image.png',
      },
      {
        elementId: 'unknown',
        elementType: 'image',
        bounds: [0, 0, 100, 100],
        src: 'media/not-fingerprinted.png',
      },
    ]);
    expect(technicalDiagnostics(source, [960, 540])).toEqual([]);
  });

  it('checks page background crops without creating a fake selectable element', () => {
    const source = page([]);
    source.data.background = {
      type: 'image',
      src: 'background.png',
      crop: { top: 0.8, bottom: 0.3 },
    };
    const issues = technicalDiagnostics(source, [960, 540]);
    expect(issues).toEqual([expect.objectContaining({ code: 'QA_INVALID_IMAGE_CROP' })]);
    expect(issues[0]).not.toHaveProperty('elementId');
  });

  it('lists requested fonts from content and theme overrides without claiming installation status', () => {
    const source = page([
      {
        elementId: 'text',
        elementType: 'text',
        bounds: [0, 0, 100, 100],
        content: { fontFamily: { latin: 'Arial', ea: 'MiSans' } },
      },
      {
        elementId: 'table',
        elementType: 'table',
        bounds: [0, 0, 100, 100],
        rows: [[{ fontFamily: '"Times New Roman", Arial' }]],
      },
    ]);
    source.metadata.themeOverride = {
      body: { fontFamily: 'STIX Two Math' },
      title: { fontFamily: '$heading' },
    };
    expect(requestedPageFonts(source)).toEqual([
      'Arial',
      'MiSans',
      'STIX Two Math',
      'Times New Roman',
    ]);
  });
});
