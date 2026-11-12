import type { PageSnapshot } from '../../pptd/types';
import { resourceUrl } from './pptd-session';

export function assetVersionUrl(
  url: string,
  revision: string | null | undefined,
  hint = '',
): string {
  if (!url.startsWith('/') || url.startsWith('//')) return url;
  const content =
    revision === null || (revision !== undefined && /^sha256:[a-f\d]{64}$/.test(revision));
  const token = revision === null ? 'missing' : (revision ?? hint);
  const hashIndex = url.indexOf('#');
  const base = hashIndex === -1 ? url : url.slice(0, hashIndex);
  const fragment = hashIndex === -1 ? '' : url.slice(hashIndex);
  return resourceUrl(
    `${base}${base.includes('?') ? '&' : '?'}${content ? 'revision' : 'hint'}=${encodeURIComponent(token)}${fragment}`,
    content ? revision : undefined,
  );
}

export function revisionedAssetUrl(
  source: string,
  url: string,
  page: Pick<PageSnapshot, 'assetRevisions' | 'renderRevision'>,
): string {
  return assetVersionUrl(url, page.assetRevisions?.[source], page.renderRevision);
}
