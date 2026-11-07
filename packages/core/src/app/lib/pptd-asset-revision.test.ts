import { describe, expect, it } from 'vitest';
import { assetVersionUrl, revisionedAssetUrl } from './pptd-asset-revision';

describe('image resource identity', () => {
  it('retains decoded image identity across unrelated page edits', () => {
    const page = {
      renderRevision: 'sha256:before' as const,
      assetRevisions: { 'media/plot.png': `sha256:${'a'.repeat(64)}` as const },
    };
    const initial = revisionedAssetUrl(
      'media/plot.png',
      '/__pptd/asset?path=media%2Fplot.png',
      page,
    );
    expect(
      revisionedAssetUrl('media/plot.png', '/__pptd/asset?path=media%2Fplot.png', {
        ...page,
        renderRevision: 'sha256:edited',
      }),
    ).toBe(initial);
    expect(
      revisionedAssetUrl('media/plot.png', '/__pptd/asset?path=media%2Fplot.png', {
        ...page,
        assetRevisions: { 'media/plot.png': `sha256:${'b'.repeat(64)}` },
      }),
    ).not.toBe(initial);
  });

  it('distinguishes missing and restored assets without losing archived routing', () => {
    const url = '/__pptd/asset?version=checkpoint&path=media%2Fplot.png#view';
    expect(
      revisionedAssetUrl('media/plot.png', url, {
        renderRevision: 'sha256:page',
        assetRevisions: { 'media/plot.png': null },
      }),
    ).toBe('/__pptd/asset?version=checkpoint&path=media%2Fplot.png&revision=missing#view');
    expect(revisionedAssetUrl('media/plot.png', url, { renderRevision: 'sha256:page' })).toContain(
      'hint=sha256%3Apage#view',
    );
  });

  it('separates stat and page hints from content revisions', () => {
    const url = '/__pptd/asset-preview?path=media%2Fplot.png&size=320';
    expect(assetVersionUrl(url, 'stat:1:2:3')).toContain('&hint=stat%3A1%3A2%3A3');
    expect(assetVersionUrl(url, `sha256:${'a'.repeat(64)},sha256:${'b'.repeat(64)}`)).toContain(
      '&hint=',
    );
    expect(assetVersionUrl(url, `sha256:${'c'.repeat(64)}`)).toContain('&revision=sha256%3A');
  });

  it('preserves frozen data and external resource URLs', () => {
    for (const url of [
      'data:image/png;base64,AAAA',
      'https://example.com/image.png',
      '//example.com/image.png',
    ]) {
      expect(revisionedAssetUrl('media/plot.png', url, { renderRevision: 'sha256:page' })).toBe(
        url,
      );
    }
  });
});
