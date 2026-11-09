import type { PptdElement } from './types';

export function isMainPositionField(element: PptdElement): boolean {
  return element.elementType === 'text' && element.content?.field === 'main-position';
}

export function mainPositionText(position: number | undefined): string {
  return typeof position === 'number' && Number.isSafeInteger(position) && position > 0
    ? String(position)
    : '—';
}

export function mainPositionForPath(paths: string[], pagePath: string): number | undefined {
  const normalize = (value: string) => value.replaceAll('\\', '/').replace(/^(?:\.\/)+/, '');
  const normalized = normalize(pagePath);
  const index = paths.findIndex((candidate) => normalize(candidate) === normalized);
  return index >= 0 ? index + 1 : undefined;
}

export function resolvePositionField(
  element: PptdElement,
  mainPosition: number | undefined,
): PptdElement {
  return isMainPositionField(element)
    ? { ...element, content: { ...element.content, text: mainPositionText(mainPosition) } }
    : element;
}
