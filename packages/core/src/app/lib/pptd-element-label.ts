import { SHAPE_PRESETS } from '../../pptd/shape-presets';
import type { PptdElement } from '../../pptd/types';
import { uiText as t } from './huandeng-locale';

const value = (input: unknown) => (typeof input === 'string' ? input : '');

export function elementLabel(element: PptdElement): string {
  const title =
    typeof element.title === 'object' && element.title && 'text' in element.title
      ? value(element.title.text)
      : value(element.title);
  const label =
    value(element.content?.text)
      .replace(/<[^>]*>/g, '')
      .trim() ||
    value(element.name).trim() ||
    title.trim();
  if (label) return label.slice(0, 36);
  if (element.elementType === 'shape')
    return t(
      SHAPE_PRESETS.find(([name]) => name === (value(element.shapeName) || 'rect'))?.[1] ??
        '自定义形状',
    );
  const labels: Record<string, string> = {
    text: '文字',
    image: '图片',
    line: '线条',
    chart: '图表',
    table: '表格',
    icon: '图标',
    group: '组合',
    missing: '缺失对象',
  };
  return t(labels[element.elementType] ?? '对象');
}
