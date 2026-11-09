import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { PageSnapshot } from '../../../pptd/types';
import { pptdAssetPreviewUrl, pptdAssetUrl } from '../../lib/pptd-backend';
import { PptdPageRenderer } from './renderer';

const page: PageSnapshot = {
  pageId: 'page',
  shortCode: 'A1B',
  path: 'slide.page',
  state: 'active',
  pageRevision: 'sha256:page',
  renderRevision: 'sha256:render',
  metadata: { shortCode: 'A1B', path: 'slide.page', state: 'active' },
  assetRevisions: { 'media/image.png': `sha256:${'a'.repeat(64)}` },
  data: {
    background: { type: 'image', src: 'media/image.png' },
    elements: [
      {
        elementId: 'image',
        elementType: 'image',
        src: 'media/image.png',
        bounds: [0, 0, 100, 100],
      },
    ],
  },
};

describe('renderer image priority', () => {
  it.each([
    [undefined, 'high'],
    [pptdAssetUrl, 'high'],
    [pptdAssetPreviewUrl, 'low'],
  ] as const)(
    'hints built-in image and background fetch priority without changing revisions',
    (assetUrl, priority) => {
      const markup = renderToStaticMarkup(
        <PptdPageRenderer page={page} size={[960, 540]} assetUrl={assetUrl} />,
      );
      const images = markup.match(/<img\b[^>]*>/g) ?? [];
      expect(images).toHaveLength(2);
      for (const image of images) {
        expect(image).toContain(`fetchPriority="${priority}"`);
        expect(image).toContain(`revision=sha256%3A${'a'.repeat(64)}`);
      }
    },
  );

  it('preserves custom and export resolver behavior even when their URLs resemble previews', () => {
    const markup = renderToStaticMarkup(
      <PptdPageRenderer
        page={page}
        size={[960, 540]}
        assetUrl={(source) => `/asset-preview?path=${encodeURIComponent(source)}`}
      />,
    );
    expect(markup).not.toContain('fetchPriority');
    expect(markup).not.toContain('decoding=');
    expect(markup).not.toContain('loading=');
  });
});
