import type { PageSnapshot, PptdElement } from '../../pptd/types';

function plainText(value: unknown): string {
  return typeof value === 'string'
    ? value
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/\s+/g, ' ')
        .trim()
    : '';
}

export function projectSlideTitle(page: PageSnapshot, untitled = 'Untitled slide'): string {
  const explicit = plainText(page.data.title);
  if (explicit) return explicit;
  const texts = page.data.elements.filter(
    (element) =>
      element.elementType === 'text' &&
      !element.content?.field &&
      element.hidden !== true &&
      element.visible !== false &&
      plainText(element.content?.text),
  );
  const metadataTitle = texts.find((element) =>
    /^(title|heading)$/i.test(page.metadata.elementRoles?.[element.elementId]?.trim() ?? ''),
  );
  const title =
    metadataTitle ??
    texts.find(
      (element) =>
        typeof element.role === 'string' && /^(title|heading)$/i.test(element.role.trim()),
    ) ??
    texts.find((element) =>
      /(?:^|[^a-z])(title|heading)(?:$|[^a-z])/i.test(
        [element.role, element.name, element.elementId].join(' '),
      ),
    );
  const candidates = texts.filter(
    (element) =>
      !/footer|citation|reference|page.?number|position/i.test(
        [element.role, element.name, element.elementId].join(' '),
      ),
  );
  const top = (element: PptdElement) => element.bounds?.[1] ?? 0;
  const firstY = Math.min(...candidates.map(top));
  const lastY = Math.max(...candidates.map(top));
  const upper = candidates.filter(
    (element) => top(element) <= firstY + Math.max(80, (lastY - firstY) * 0.3),
  );
  const prominent = upper.sort(
    (left, right) =>
      (Number(right.content?.fontSize) || 0) - (Number(left.content?.fontSize) || 0) ||
      top(left) - top(right),
  )[0];
  return (
    plainText((title ?? prominent ?? candidates[0])?.content?.text) ||
    page.metadata.label ||
    untitled
  );
}

function storyText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(storyText).join(' ');
  if (value && typeof value === 'object') return Object.values(value).map(storyText).join(' ');
  return '';
}

export function projectSlideSearch(page: PageSnapshot): string {
  return [
    projectSlideTitle(page),
    storyText(page.metadata.designIntent),
    page.pageId,
    page.shortCode,
    page.metadata.label,
    page.path,
  ]
    .filter(Boolean)
    .join(' ')
    .toLocaleLowerCase();
}
