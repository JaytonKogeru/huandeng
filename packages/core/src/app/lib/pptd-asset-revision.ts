import type { PageSnapshot } from '../../pptd/types';

export function revisionedAssetUrl(
  source: string,
  url: string,
  page: Pick<PageSnapshot, 'assetRevisions' | 'renderRevision'>,
): string {
  if (!url.startsWith('/') || url.startsWith('//')) return url;
  const revision = page.assetRevisions?.[source];
  const token = revision === undefined ? page.renderRevision : (revision ?? 'missing');
  const hashIndex = url.indexOf('#');
  const base = hashIndex === -1 ? url : url.slice(0, hashIndex);
  const fragment = hashIndex === -1 ? '' : url.slice(hashIndex);
  return `${base}${base.includes('?') ? '&' : '?'}revision=${encodeURIComponent(token)}${fragment}`;
}
