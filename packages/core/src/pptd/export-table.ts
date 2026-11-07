import { strFromU8 } from 'fflate';
import type { Rgba } from '../app/lib/pptx/css';
import { buildPptxFiles, colorXml, escapeXml } from '../app/lib/pptx/ooxml';
import { ExportFeatureError, elementBounds, exportNumber, exportRecord } from './export-images';
import { mathCompatibilityXml } from './export-math';
import { decorateNativeTextXml, mapPptdText, type NativeText } from './export-text';
import { type TableSlot, tableLayout } from './table-grid';
import {
  resolveTableCellStyle,
  TABLE_CELL_PADDING_X,
  TABLE_CELL_PADDING_Y,
  type TableBorder,
} from './table-style';
import type { PptdElement } from './types';

type ColorResolver = (value: unknown, alpha?: number) => Rgba;
const EMU = 12700;

export interface TableMeasurements {
  rowHeights: number[];
}

export interface NativeTable {
  xml(id: number): string;
  fonts: string[];
  hasMath: boolean;
}

function textBody(text: NativeText, fallback = false): string {
  const files = buildPptxFiles({
    slides: [{ background: null, notes: null, nodes: [text.node] }],
    images: [],
  });
  const shape = strFromU8(files['ppt/slides/slide1.xml']);
  const body = shape.match(/<p:txBody>([\s\S]*?)<\/p:txBody>/)?.[1];
  if (!body) throw new Error('The native text writer did not produce a table cell body.');
  const decorated = decorateNativeTextXml(
    `<a:txBody>${body}</a:txBody>`,
    fallback ? { ...text, mathRuns: [] } : text,
  );
  return decorated;
}

function borderXml(side: string, border: TableBorder, color: ColorResolver, alpha: number): string {
  if (border === null) return `<a:${side}><a:noFill/></a:${side}>`;
  const width = exportNumber(border.width, 1, 'table.border.width');
  const dash = border.style ?? 'solid';
  if (width < 0 || !['solid', 'dash', 'dot'].includes(String(dash)))
    throw new ExportFeatureError(
      'UNSUPPORTED_TABLE_BORDER',
      'This table border requires rendered export.',
    );
  return `<a:${side} w="${Math.round(width * EMU)}" cap="flat" cmpd="sng" algn="ctr"><a:solidFill>${colorXml(color(border.color ?? '#000000', alpha))}</a:solidFill>${dash === 'solid' ? '' : `<a:prstDash val="${dash}"/>`}</a:${side}>`;
}

function mergeAttributes(slot: TableSlot, grid: TableSlot[][]): string {
  if (!slot.covered)
    return `${slot.rowSpan > 1 ? ` rowSpan="${slot.rowSpan}"` : ''}${slot.colSpan > 1 ? ` gridSpan="${slot.colSpan}"` : ''}`;
  if (!slot.owner) throw new ExportFeatureError('INVALID_TABLE', 'A merged cell has no owner.');
  const owner = grid[slot.owner.row][slot.owner.column];
  if (slot.row === owner.row)
    return `${owner.rowSpan > 1 ? ` rowSpan="${owner.rowSpan}"` : ''} hMerge="1"`;
  if (slot.column === owner.column)
    return `${owner.colSpan > 1 ? ` gridSpan="${owner.colSpan}"` : ''} vMerge="1"`;
  return ' hMerge="1" vMerge="1"';
}

export function buildNativeTable(
  element: PptdElement,
  theme: Record<string, unknown>,
  color: ColorResolver,
  measurements?: TableMeasurements,
): NativeTable {
  const [x, y, width, height] = elementBounds(element);
  if (
    element.rotation ||
    (Array.isArray(element.flip) && element.flip.some(Boolean)) ||
    element.shadow
  )
    throw new ExportFeatureError(
      'TABLE_TRANSFORM_FALLBACK',
      'Rotated, flipped or shadowed tables use a measured object image.',
    );
  let layout: ReturnType<typeof tableLayout>;
  try {
    layout = tableLayout(element);
  } catch (error) {
    throw new ExportFeatureError(
      'INVALID_TABLE',
      error instanceof Error ? error.message : String(error),
    );
  }
  if (!layout.grid.length || width <= 0)
    throw new ExportFeatureError('INVALID_TABLE', 'A table needs rows and a positive width.');
  const alpha = exportNumber(element.opacity, 1, 'table.opacity');
  if (alpha < 0 || alpha > 1)
    throw new ExportFeatureError('INVALID_OPACITY', 'Opacity must be between zero and one.');
  const minimumTotal = layout.rowMinimums.reduce((sum, value) => sum + value, 0);
  const rowHeights =
    measurements?.rowHeights ??
    layout.rowMinimums.map((value) => value * Math.max(1, height / minimumTotal));
  if (
    rowHeights.length !== layout.grid.length ||
    rowHeights.some((value) => !Number.isFinite(value) || value <= 0)
  )
    throw new ExportFeatureError(
      'INVALID_TABLE_MEASUREMENTS',
      'Table row measurements do not match its grid.',
    );
  const fonts = new Set<string>();
  let hasMath = false;
  const nativeRows: string[] = [];
  const fallbackRows: string[] = [];
  for (const [row, slots] of layout.grid.entries()) {
    const cells: string[] = [];
    const fallbacks: string[] = [];
    for (const [column, slot] of slots.entries()) {
      const owner = slot.owner ? layout.grid[slot.owner.row][slot.owner.column] : slot;
      let style: ReturnType<typeof resolveTableCellStyle>;
      try {
        style = resolveTableCellStyle(theme, element, owner.cell, {
          row: owner.row,
          column: owner.column,
          rowCount: layout.grid.length,
          columnCount: layout.colCount,
        });
      } catch (error) {
        throw new ExportFeatureError(
          'UNRESOLVED_TABLE_STYLE',
          error instanceof Error ? error.message : String(error),
        );
      }
      const anchor = style.align[1] === 'bottom' ? 'b' : style.align[1] === 'middle' ? 'ctr' : 't';
      let fill = '<a:noFill/>';
      if (style.fill !== null && style.fill !== undefined) {
        const source =
          typeof style.fill === 'string'
            ? { color: style.fill, type: 'solid' }
            : exportRecord(style.fill);
        if (source.type !== undefined && source.type !== 'solid')
          throw new ExportFeatureError(
            'UNSUPPORTED_TABLE_FILL',
            'This table fill requires rendered export.',
          );
        fill = `<a:solidFill>${colorXml(color(source.color ?? 'transparent', alpha))}</a:solidFill>`;
      }
      const borders = (['left', 'right', 'top', 'bottom'] as const)
        .map((side, index) =>
          borderXml(['lnL', 'lnR', 'lnT', 'lnB'][index], style.borders[side], color, alpha),
        )
        .join('');
      const properties = `<a:tcPr marL="${TABLE_CELL_PADDING_X * EMU}" marR="${TABLE_CELL_PADDING_X * EMU}" marT="${TABLE_CELL_PADDING_Y * EMU}" marB="${TABLE_CELL_PADDING_Y * EMU}" anchor="${anchor}">${borders}${fill}</a:tcPr>`;
      let body = '<a:txBody><a:bodyPr/><a:lstStyle/><a:p><a:endParaRPr/></a:p></a:txBody>';
      let fallbackBody = body;
      if (!slot.covered) {
        const text = mapPptdText(
          {
            elementId: `${element.elementId}:${row}:${column}`,
            elementType: 'text',
            bounds: [
              0,
              0,
              width *
                layout.columnRatios
                  .slice(column, column + slot.colSpan)
                  .reduce((sum, value) => sum + value, 0),
              rowHeights.slice(row, row + slot.rowSpan).reduce((sum, value) => sum + value, 0),
            ],
            opacity: alpha,
            content: style.text,
          },
          theme,
          color,
          'table-cell',
        );
        for (const font of text.fonts) fonts.add(font);
        hasMath ||= text.mathRuns.some(Boolean);
        body = textBody(text);
        fallbackBody = textBody(text, true);
      }
      const attributes = mergeAttributes(slot, layout.grid);
      cells.push(`<a:tc${attributes}>${body}${properties}</a:tc>`);
      fallbacks.push(`<a:tc${attributes}>${fallbackBody}${properties}</a:tc>`);
    }
    const rowAttributes = `h="${Math.round(rowHeights[row] * EMU)}"`;
    nativeRows.push(`<a:tr ${rowAttributes}>${cells.join('')}</a:tr>`);
    fallbackRows.push(`<a:tr ${rowAttributes}>${fallbacks.join('')}</a:tr>`);
  }
  const columns = layout.columnRatios
    .map((ratio) => `<a:gridCol w="${Math.round(ratio * width * EMU)}"/>`)
    .join('');
  const graphic = (id: number, rows: string[]) =>
    `<p:graphicFrame><p:nvGraphicFramePr><p:cNvPr id="${id}" name="${escapeXml(element.elementId.slice(0, 200))}"/><p:cNvGraphicFramePr/><p:nvPr/></p:nvGraphicFramePr><p:xfrm><a:off x="${Math.round(x * EMU)}" y="${Math.round(y * EMU)}"/><a:ext cx="${Math.round(width * EMU)}" cy="${Math.round(rowHeights.reduce((sum, value) => sum + value, 0) * EMU)}"/></p:xfrm><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/table"><a:tbl><a:tblPr firstRow="0" bandRow="0"/><a:tblGrid>${columns}</a:tblGrid>${rows.join('')}</a:tbl></a:graphicData></a:graphic></p:graphicFrame>`;
  return {
    xml: (id) =>
      hasMath
        ? mathCompatibilityXml(graphic(id, nativeRows), graphic(id, fallbackRows))
        : graphic(id, nativeRows),
    fonts: [...fonts],
    hasMath,
  };
}
