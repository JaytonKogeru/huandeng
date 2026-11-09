import type { PageSnapshot } from '../../pptd/types';
import { projectSlideSearch, projectSlideTitle } from './pptd-project-source';

function plainText(value: unknown): string {
  return typeof value === 'string'
    ? value
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/\s+/g, ' ')
        .trim()
    : '';
}

export function outlineSlideSummary(page: PageSnapshot): string {
  const purpose = plainText(page.metadata.designIntent?.purpose);
  if (purpose) return purpose.slice(0, 320);
  const title = projectSlideTitle(page);
  return page.data.elements
    .filter(
      (element) =>
        element.elementType === 'text' &&
        !element.content?.field &&
        !/footer|page.?number|position|title|heading/i.test(
          String(element.role ?? element.name ?? element.elementId),
        ),
    )
    .map((element) => plainText(element.content?.text))
    .filter((text) => text && text !== title && !/^\d+$/.test(text))
    .slice(0, 3)
    .join(' · ')
    .slice(0, 320);
}

export function outlineSlideSearch(page: PageSnapshot): string {
  return `${projectSlideSearch(page)} ${outlineSlideSummary(page)}`.toLocaleLowerCase();
}
