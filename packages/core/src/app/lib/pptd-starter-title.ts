import type { PageSize, PptdElement } from '../../pptd/types';
import { uiText as t } from './huandeng-locale';
import { createPlacedElement } from './pptd-insertion';

export function createStarterTitle(
  size: PageSize,
  elementId: string,
  fontFamily = 'Arial',
): PptdElement {
  const scale = Math.min(size[0] / 960, size[1] / 540);
  const start = { x: 48 * scale, y: 36 * scale };
  const element = createPlacedElement(
    { kind: 'text' },
    start,
    { x: size[0] - start.x, y: start.y + 70 * scale },
    size,
    { dragged: true, elementId },
  );
  return {
    ...element,
    content: {
      ...element.content,
      text: t('Type a title'),
      fontFamily,
      fontSize: 28 * scale,
      color: '#222222',
      bold: true,
      align: ['left', 'middle'],
    },
  };
}
