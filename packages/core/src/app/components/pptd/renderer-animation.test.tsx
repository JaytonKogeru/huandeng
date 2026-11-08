import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { PageTimeline } from '../../../pptd/animation-model';
import type { PageSnapshot } from '../../../pptd/types';
import { PptdPageRenderer } from './renderer';
import { TimelinePanel } from './timeline-panel';

function snapshot(): PageSnapshot {
  const timeline: PageTimeline = {
    schemaVersion: 1,
    durationMs: 1000,
    tracks: [
      {
        id: 'move',
        targetId: 'text',
        property: 'x',
        keyframes: [
          { id: 'a', timeMs: 0, value: 100, easing: 'linear' },
          { id: 'b', timeMs: 1000, value: 300, easing: 'linear' },
        ],
      },
      {
        id: 'fade',
        targetId: 'text',
        property: 'opacity',
        keyframes: [
          { id: 'a', timeMs: 0, value: 0, easing: 'linear' },
          { id: 'b', timeMs: 1000, value: 1, easing: 'linear' },
        ],
      },
    ],
  };
  return {
    pageId: 'page',
    shortCode: 'K2A',
    path: 'a.page',
    state: 'active',
    pageRevision: 'sha256:page',
    renderRevision: 'sha256:render',
    metadata: { shortCode: 'K2A', path: 'a.page', state: 'active' },
    assetRevisions: { 'media/photo.png': `sha256:${'a'.repeat(64)}` },
    data: {
      elements: [
        {
          elementId: 'text',
          elementType: 'text',
          bounds: [100, 80, 200, 40],
          content: { text: 'Scientific content' },
        },
        {
          elementId: 'photo',
          elementType: 'image',
          bounds: [40, 160, 80, 80],
          src: 'media/photo.png',
        },
      ],
      timeline,
    },
  };
}

describe('animation renderer integration', () => {
  it('keeps ordinary canvas and exports at base layout until preview time is explicit', () => {
    const page = snapshot();
    const render = (time?: number | null) =>
      renderToStaticMarkup(
        <PptdPageRenderer
          page={page}
          size={[960, 540]}
          previewTimeMs={time}
          assetUrl={(source) => `/assets/${source}`}
        />,
      );
    const base = render();
    expect(base).toContain('left:100px;top:80px;width:200px;height:40px');
    expect(base).toContain('transform:rotate(0deg) scale(1,1)');
    expect(base).not.toContain('data-hd-animation-time-ms');
    expect(render(null)).toBe(base);
    const middle = render(500);
    expect(middle).toContain('transform:matrix(1,0,0,1,200,80)');
    expect(middle).toContain('opacity:0.5');
    expect(middle).toContain('width:200px;height:40px');
    expect(middle).toContain('Scientific content');
    expect(middle).toContain('data-hd-text-content');
    expect(page.data.elements[0].bounds).toEqual([100, 80, 200, 40]);
  });

  it('uses asset content revision during animation and unrelated text edits', () => {
    const page = snapshot();
    const render = () =>
      renderToStaticMarkup(
        <PptdPageRenderer
          page={page}
          size={[960, 540]}
          previewTimeMs={500}
          assetUrl={(source) => `/archive/${source}?version=checkpoint#crop`}
        />,
      );
    expect(render()).toContain(`version=checkpoint&amp;revision=sha256%3A${'a'.repeat(64)}#crop`);
    page.renderRevision = 'sha256:changed-text';
    expect(render()).toContain(`version=checkpoint&amp;revision=sha256%3A${'a'.repeat(64)}#crop`);
    expect(render()).not.toContain('revision=sha256%3Achanged-text');
  });

  it('renders unsupported timeline versions statically and exposes a readonly diagnosis', () => {
    const page = snapshot();
    page.data.timeline = { schemaVersion: 9, opaque: { retain: true } };
    const before = structuredClone(page);
    const staticHtml = renderToStaticMarkup(
      <PptdPageRenderer page={page} size={[960, 540]} assetUrl={(source) => `/assets/${source}`} />,
    );
    expect(staticHtml).not.toContain('data-hd-animation-error');
    const html = renderToStaticMarkup(
      <PptdPageRenderer
        page={page}
        size={[960, 540]}
        previewTimeMs={500}
        assetUrl={(source) => `/assets/${source}`}
      />,
    );
    expect(html).toContain('data-hd-animation-error');
    expect(html).toContain('left:100px;top:80px');
    const panel = renderToStaticMarkup(
      <TimelinePanel page={page} onChange={async () => undefined} onPreview={() => undefined} />,
    );
    expect(panel).toContain('The original animation is preserved.');
    expect(panel).toContain('This timeline cannot be edited yet.');
    expect(page).toEqual(before);
  });

  it('retains user readable focus names and excludes inactive objects from tab order', () => {
    const page = snapshot();
    const html = renderToStaticMarkup(
      <PptdPageRenderer
        page={page}
        size={[960, 540]}
        assetUrl={(source) => `/assets/${source}`}
        onElementPointerDown={() => undefined}
        elementTabIndex={(element) => (element.elementId === 'text' ? 0 : -1)}
        elementLabel={(element) =>
          element.elementId === 'text' ? 'Scientific heading' : 'Microscopy image'
        }
      />,
    );
    expect(html).toContain('tabindex="0" aria-label="Scientific heading"');
    expect(html).toContain('tabindex="-1" aria-label="Microscopy image"');
  });
});
