import type { PageSize, PptdPage } from './types';

export function createSectionTitlePage(
  size: PageSize,
  title: string,
  elementId: string,
  fontFamily = 'Arial',
): PptdPage {
  const scale = Math.min(size[0] / 960, size[1] / 540);
  return {
    pageType: 'section',
    background: { type: 'solid', color: '#FFFFFF' },
    elements: [
      {
        elementId,
        elementType: 'text',
        role: 'title',
        bounds: [64 * scale, size[1] * 0.4, size[0] - 128 * scale, size[1] * 0.2],
        content: {
          text: title,
          fontSize: 34 * scale,
          fontFamily,
          color: '#202423',
          bold: false,
          align: ['left', 'middle'],
        },
      },
    ],
    notes: '',
  };
}
