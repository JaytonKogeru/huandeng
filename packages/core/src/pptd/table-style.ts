import type { PptdElement } from './types';

export const TABLE_CELL_PADDING_X = 9;
export const TABLE_CELL_PADDING_Y = 5;

type Values = Record<string, unknown>;
export type TableBorder = Values | null;
export interface TableCellStyle {
  cell: Values;
  text: Values;
  fill: unknown;
  align: [string, string];
  borders: { top: TableBorder; right: TableBorder; bottom: TableBorder; left: TableBorder };
}

function record(value: unknown): Values {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Values) : {};
}

function merge(...sources: unknown[]): Values {
  return Object.assign(
    {},
    ...sources.map((source) =>
      Object.fromEntries(Object.entries(record(source)).filter(([, value]) => value !== undefined)),
    ),
  );
}

function styleReference(value: unknown, styles: unknown): Values {
  if (typeof value !== 'string') return record(value);
  const name = value.replace(/^\$/, '');
  const style = record(styles)[name];
  if (!style) throw new Error(`Unknown table text or table style: ${name}.`);
  return record(style);
}

export function cellBorderSides(value: unknown): TableCellStyle['borders'] {
  const normalize = (item: unknown): TableBorder =>
    item === null ? null : { width: 1, color: '#000000', style: 'solid', ...record(item) };
  let sides: unknown[];
  if (Array.isArray(value)) {
    if (value.length === 2) sides = [value[0], value[1], value[0], value[1]];
    else if (value.length === 4) sides = value;
    else throw new Error('A table border array requires two or four sides.');
  } else sides = [value, value, value, value];
  return {
    top: normalize(sides[0]),
    right: normalize(sides[1]),
    bottom: normalize(sides[2]),
    left: normalize(sides[3]),
  };
}

export function resolveTableCellStyle(
  theme: Values,
  element: PptdElement,
  cell: unknown,
  position: { row: number; column: number; rowCount: number; columnCount: number },
): TableCellStyle {
  const style = styleReference(element.style, theme.tableStyles);
  const { row, column, rowCount, columnCount } = position;
  const rowStyle =
    row === 0
      ? (style.firstRowStyle ?? style.firstRow)
      : row === rowCount - 1
        ? (style.lastRowStyle ?? style.lastRow)
        : undefined;
  const columnStyle =
    column === 0
      ? (style.firstColumnStyle ?? style.firstColumn)
      : column === columnCount - 1
        ? (style.lastColumnStyle ?? style.lastColumn)
        : undefined;
  const body = Array.isArray(style.bodyStyles)
    ? row > 0 && row < rowCount - 1
      ? style.bodyStyles[(row - 1) % Math.max(1, style.bodyStyles.length)]
      : undefined
    : style.bodyStyles;
  const positional =
    rowStyle && columnStyle
      ? style.rowOverColumn === false
        ? columnStyle
        : rowStyle
      : (rowStyle ?? columnStyle);
  const base = merge(style.cellStyle, body, positional);
  const own = record(cell);
  const final = merge(base, own);
  const baseTextStyle = styleReference(base.textStyle, theme.textStyles);
  const textStyle = styleReference(own.textStyle, theme.textStyles);
  const text = merge(
    { fontSize: 13, color: '#000000', lineHeight: 1 },
    baseTextStyle,
    base,
    textStyle,
    own,
  );
  delete text.textStyle;
  delete text.rowSpan;
  delete text.colSpan;
  const rawAlign = Array.isArray(final.align) ? final.align : ['center', 'middle'];
  const align: [string, string] = [String(rawAlign[0]), String(rawAlign[1])];
  text.align = align;
  text.text = typeof own.text === 'string' ? own.text : String(own.text ?? '');
  return {
    cell: final,
    text,
    align,
    fill: Object.hasOwn(final, 'fill')
      ? final.fill
      : Object.hasOwn(style, 'fill')
        ? style.fill
        : (element.fill ?? null),
    borders: cellBorderSides(final.border),
  };
}
