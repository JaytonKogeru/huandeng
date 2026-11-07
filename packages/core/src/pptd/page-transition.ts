import { PptdError, type PptdPage } from './types';

export interface PageTransition {
  schemaVersion: 1;
  kind: 'none' | 'fade';
  durationMs: number;
}

export function validatePageTransition(value: unknown): asserts value is PageTransition {
  const transition = value as Partial<PageTransition> | null;
  if (
    !transition ||
    typeof transition !== 'object' ||
    Array.isArray(transition) ||
    transition.schemaVersion !== 1 ||
    !['none', 'fade'].includes(transition.kind as string) ||
    !Number.isInteger(transition.durationMs) ||
    (transition.kind === 'none'
      ? transition.durationMs !== 0
      : (transition.durationMs as number) < 1 || (transition.durationMs as number) > 5000)
  )
    throw new PptdError(
      'INVALID_DOCUMENT',
      '页面转场：仅支持无转场（0 毫秒）或淡化（1–5000 毫秒）。',
    );
}

export function readPageTransition(page: PptdPage): PageTransition | null {
  if (page.transition === undefined || page.transition === null) return null;
  validatePageTransition(page.transition);
  return page.transition;
}

export function hasPageTransition(page: PptdPage): boolean {
  const value = page.transition as Partial<PageTransition> | null | undefined;
  return value != null && !(value.schemaVersion === 1 && value.kind === 'none');
}
