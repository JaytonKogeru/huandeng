import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { BuildTimeline, PageTimeline } from '../../../pptd/animation-model';
import type { PageSnapshot } from '../../../pptd/types';
import { AnimationPanel } from './animation-panel';

const builds: BuildTimeline = {
  schemaVersion: 2,
  effects: [
    {
      id: 'a',
      targetId: 'figure-a',
      kind: 'fade-in',
      trigger: 'click',
      durationMs: 400,
      delayMs: 0,
    },
    {
      id: 'b',
      targetId: 'figure-b',
      kind: 'appear',
      trigger: 'with-previous',
      durationMs: 0,
      delayMs: 0,
    },
    { id: 'c', targetId: 'figure-a', kind: 'pulse', trigger: 'click', durationMs: 800, delayMs: 0 },
  ],
};
const timeline: PageTimeline = {
  schemaVersion: 1,
  durationMs: 1000,
  tracks: [
    {
      id: 'x',
      targetId: 'figure-a',
      property: 'x',
      keyframes: [
        { id: 'start', timeMs: 0, value: 40, easing: 'linear' },
        { id: 'end', timeMs: 1000, value: 120, easing: 'linear' },
      ],
    },
  ],
};
function snapshot(animation?: unknown): PageSnapshot {
  return {
    pageId: 'page',
    shortCode: 'A8AA',
    path: 'page.page',
    state: 'active',
    pageRevision: 'sha256:page',
    renderRevision: 'sha256:render',
    metadata: { shortCode: 'A8AA', path: 'page.page', state: 'active' },
    data: {
      elements: [
        { elementId: 'figure-a', elementType: 'shape', bounds: [40, 40, 80, 80], name: 'Figure A' },
        {
          elementId: 'figure-b',
          elementType: 'shape',
          bounds: [180, 40, 80, 80],
          name: 'Figure B',
        },
      ],
      ...(animation === undefined ? {} : { timeline: animation }),
    },
  };
}
function render(page: PageSnapshot, disabled = false) {
  return renderToStaticMarkup(
    <AnimationPanel
      page={page}
      disabled={disabled}
      onChange={async () => {
        throw new Error('Rendering must not write animation data.');
      }}
      onPreview={() => {}}
      onTransitionChange={async () => {
        throw new Error('Rendering must not write transition data.');
      }}
    />,
  );
}

describe('animation authoring entry', () => {
  it('opens new pages in the step editor while preserving the original page bytes', () => {
    const page = snapshot();
    const before = JSON.stringify(page);
    const html = render(page);
    expect(html).toContain('data-hd-animation-panel="builds"');
    expect(html).toContain('Slide animation steps');
    expect(html).toContain('Add effect');
    expect(html).toContain('Object effects → click steps → preview.');
    expect(html).toContain('Static exports do not include interactive animation.');
    expect(html).toContain('No object selected.');
    expect(html).not.toContain('data-hd-timeline="');
    expect(JSON.stringify(page)).toBe(before);
  });

  it('groups simultaneous effects under one click and keeps advanced controls out of the default editor', () => {
    const page = snapshot(builds);
    const before = JSON.stringify(page);
    const html = render(page);
    expect((html.match(/data-hd-build-step=/g) ?? []).length).toBe(2);
    expect((html.match(/data-hd-build-effect=/g) ?? []).length).toBe(3);
    expect(html).toContain('Preview steps');
    expect(html).not.toContain('data-hd-keyframe=');
    expect(JSON.stringify(page)).toBe(before);
  });

  it('keeps existing keyframe documents in the legacy editor without reverse conversion', () => {
    const page = snapshot(timeline);
    const before = JSON.stringify(page);
    const html = render(page);
    expect(html).toContain('data-hd-animation-panel="timeline"');
    expect(html).toContain('data-hd-keyframe="end"');
    expect(html).not.toContain('data-hd-builds=');
    expect(JSON.stringify(page)).toBe(before);
  });

  it('protects unknown schemas and malformed timelines instead of offering to clear them as empty', () => {
    for (const animation of [
      { schemaVersion: 99, opaque: { preserve: true } },
      { schemaVersion: 1, durationMs: -1, tracks: [] },
    ]) {
      const page = snapshot(animation);
      const before = JSON.stringify(page);
      const html = render(page);
      expect(html).toContain('Copy animation draft');
      expect(html).not.toContain('Use build steps');
      expect(JSON.stringify(page)).toBe(before);
    }
  });

  it('shows read-only pinned builds and their separate page transition without discarding data', () => {
    const page = snapshot(builds);
    page.versionId = 'checkpoint:pinned';
    page.data.transition = { schemaVersion: 1, kind: 'fade', durationMs: 1250 };
    const html = render(page, true);
    expect(html).toContain('This slide is read-only. You can preview its steps.');
    expect(html).toContain('Transition duration (s)');
    expect(html).toContain('value="1.25"');
    expect(html).toMatch(/aria-label="Object to animate"[^>]*disabled=""/);
    expect(html).toMatch(/aria-label="Slide transition"[^>]*disabled=""/);
  });
});
