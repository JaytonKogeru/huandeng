import { type TableCell, tableLayout } from './table-grid';
import type { PptdElement } from './types';

type Entry = { row: number; column: number; rowSpan: number; colSpan: number; cell: TableCell };
type TableEdit = { rows: TableCell[][]; columnWidths?: number[]; rowHeights?: number[] };

function entries(element: PptdElement) {
  const layout = tableLayout(element);
  const cells: Entry[] = [];
  for (const row of layout.grid)
    for (const slot of row) {
      if (slot.covered) continue;
      cells.push({
        row: slot.row,
        column: slot.column,
        rowSpan: slot.rowSpan,
        colSpan: slot.colSpan,
        cell: structuredClone(slot.cell ?? { text: '' }),
      });
    }
  return { layout, cells };
}

function pack(cells: Entry[], rowCount: number, columnCount: number): TableCell[][] {
  if (rowCount < 1 || columnCount < 1 || rowCount > 200 || columnCount > 50) {
    throw new Error('Tables must contain 1–200 rows and 1–50 columns.');
  }
  const slots: ({ cell: TableCell } | 'covered' | null)[][] = Array.from({ length: rowCount }, () =>
    Array.from({ length: columnCount }, () => null),
  );
  for (const entry of cells) {
    const cell = { ...entry.cell };
    delete cell.rowSpan;
    delete cell.colSpan;
    if (entry.rowSpan > 1) cell.rowSpan = entry.rowSpan;
    if (entry.colSpan > 1) cell.colSpan = entry.colSpan;
    for (let row = entry.row; row < entry.row + entry.rowSpan; row++)
      for (let col = entry.column; col < entry.column + entry.colSpan; col++) {
        if (row >= rowCount || col >= columnCount || row < 0 || col < 0 || slots[row][col])
          throw new Error('Table edit would overlap or extend a merged cell.');
        slots[row][col] = row === entry.row && col === entry.column ? { cell } : 'covered';
      }
  }
  return slots.map((row) =>
    row.flatMap((slot) => (slot === 'covered' ? [] : [slot?.cell ?? { text: '' }])),
  );
}

function resizeRatios(
  value: unknown,
  index: number,
  action: 'insert' | 'remove',
): number[] | undefined {
  if (!Array.isArray(value) || !value.length) return undefined;
  const result = value.map(Number);
  if (action === 'insert') result.splice(index, 0, result[Math.min(index, result.length - 1)]);
  else result.splice(index, 1);
  const total = result.reduce((sum, number) => sum + number, 0);
  return result.map((number) => number / total);
}

export function changeTableSize(
  element: PptdElement,
  dimension: 'row' | 'column',
  index: number,
  action: 'insert' | 'remove',
): TableEdit {
  const { layout, cells } = entries(element);
  const count = dimension === 'row' ? layout.grid.length : layout.colCount;
  if (
    !Number.isInteger(index) ||
    index < 0 ||
    index > count ||
    (action === 'remove' && index === count)
  )
    throw new Error('Choose an existing table position.');
  if (action === 'remove' && count === 1)
    throw new Error(`The last ${dimension} cannot be removed.`);
  const positionKey = dimension;
  const spanKey = dimension === 'row' ? 'rowSpan' : 'colSpan';
  const changed = cells.flatMap((entry) => {
    const copy = { ...entry };
    const start = copy[positionKey];
    const end = start + copy[spanKey];
    if (action === 'insert') {
      if (start >= index) copy[positionKey]++;
      else if (end > index) copy[spanKey]++;
    } else {
      if (start === index && copy[spanKey] === 1) return [];
      if (start > index) copy[positionKey]--;
      else if (end > index) copy[spanKey]--;
    }
    return [copy];
  });
  const rows = layout.grid.length + (dimension === 'row' ? (action === 'insert' ? 1 : -1) : 0);
  const columns = layout.colCount + (dimension === 'column' ? (action === 'insert' ? 1 : -1) : 0);
  const result: TableEdit = { rows: pack(changed, rows, columns) };
  if (dimension === 'column')
    result.columnWidths = resizeRatios(layout.columnRatios, index, action);
  if (dimension === 'row' && Array.isArray(element.rowHeights))
    result.rowHeights = resizeRatios(element.rowHeights, index, action);
  return result;
}

export function editTableCell(
  element: PptdElement,
  row: number,
  column: number,
  fields: Record<string, unknown>,
): TableEdit {
  const { layout, cells } = entries(element);
  const slot = layout.grid[row]?.[column];
  if (!slot) throw new Error('The table cell no longer exists.');
  const owner = slot.owner ?? { row, column };
  const cell = cells.find((entry) => entry.row === owner.row && entry.column === owner.column);
  if (!cell) throw new Error('The table cell owner is missing.');
  if ('rowSpan' in fields || 'colSpan' in fields)
    throw new Error('Use merge or split to edit table spans.');
  cell.cell = { ...cell.cell, ...fields };
  return { rows: pack(cells, layout.grid.length, layout.colCount) };
}

export function mergeTableCells(
  element: PptdElement,
  start: { row: number; column: number },
  finish: { row: number; column: number },
): TableEdit {
  const { layout, cells } = entries(element);
  const top = Math.min(start.row, finish.row);
  const left = Math.min(start.column, finish.column);
  const bottom = Math.max(start.row, finish.row);
  const right = Math.max(start.column, finish.column);
  if (
    ![top, left, bottom, right].every(Number.isInteger) ||
    top < 0 ||
    left < 0 ||
    bottom >= layout.grid.length ||
    right >= layout.colCount
  )
    throw new Error('Choose a rectangle inside the table.');
  if (top === bottom && left === right) throw new Error('Select at least two cells to merge.');
  const chosen: Entry[] = [];
  const remaining = cells.filter((cell) => {
    const intersects =
      cell.row <= bottom &&
      cell.row + cell.rowSpan > top &&
      cell.column <= right &&
      cell.column + cell.colSpan > left;
    if (!intersects) return true;
    if (
      cell.row < top ||
      cell.column < left ||
      cell.row + cell.rowSpan > bottom + 1 ||
      cell.column + cell.colSpan > right + 1
    )
      throw new Error(
        'The selection crosses an existing merged cell. Include the whole cell or split it first.',
      );
    chosen.push(cell);
    return false;
  });
  const first = chosen.find((cell) => cell.row === top && cell.column === left);
  const text = chosen
    .map((entry) => String(entry.cell.text ?? ''))
    .filter(Boolean)
    .join('\n');
  remaining.push({
    row: top,
    column: left,
    rowSpan: bottom - top + 1,
    colSpan: right - left + 1,
    cell: { ...first?.cell, text },
  });
  return { rows: pack(remaining, layout.grid.length, layout.colCount) };
}

export function splitTableCell(element: PptdElement, row: number, column: number): TableEdit {
  const { layout, cells } = entries(element);
  const slot = layout.grid[row]?.[column];
  if (!slot) throw new Error('The table cell no longer exists.');
  const owner = slot.owner ?? { row, column };
  const cell = cells.find((entry) => entry.row === owner.row && entry.column === owner.column);
  if (!cell || (cell.rowSpan === 1 && cell.colSpan === 1))
    throw new Error('This cell is not merged.');
  const remaining = cells.filter((entry) => entry !== cell);
  for (let r = cell.row; r < cell.row + cell.rowSpan; r++)
    for (let c = cell.column; c < cell.column + cell.colSpan; c++) {
      remaining.push({
        row: r,
        column: c,
        rowSpan: 1,
        colSpan: 1,
        cell: { ...cell.cell, text: r === cell.row && c === cell.column ? cell.cell.text : '' },
      });
    }
  return { rows: pack(remaining, layout.grid.length, layout.colCount) };
}
