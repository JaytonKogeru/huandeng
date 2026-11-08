import type { PageSnapshot } from '../../pptd/types';

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

export function projectSlideTitle(page: PageSnapshot): string {
  const explicit = plainText(page.data.title);
  if (explicit) return explicit.slice(0, 160);
  const texts = page.data.elements.filter((element) => element.elementType === 'text');
  const title = texts.find((element) =>
    /title|heading/i.test(String(element.role ?? element.name ?? element.elementId)),
  );
  const first = title ?? texts.find((element) => plainText(element.content?.text));
  return plainText(first?.content?.text).slice(0, 160) || page.metadata.label || 'Untitled slide';
}

export function projectSlideSearch(page: PageSnapshot): string {
  return [projectSlideTitle(page), page.pageId, page.shortCode, page.metadata.label, page.path]
    .filter(Boolean)
    .join(' ')
    .toLocaleLowerCase();
}
