export type TableCell = Record<string, unknown> & {
  text?: unknown;
  rowSpan?: number;
  colSpan?: number;
};
export type TableSlot = {
  row: number;
  column: number;
  cell: TableCell | null;
  sourceIndex: number | null;
  covered: boolean;
  owner: { row: number; column: number } | null;
  rowSpan: number;
  colSpan: number;
};

function span(value: unknown): number {
  if (value === undefined || value === null) return 1;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    throw new Error('Table spans must be positive integers.');
  }
  return value;
}

function normalizeCell(value: unknown): TableCell {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return { ...(value as TableCell) };
  }
  return { text: value === null || value === undefined ? '' : String(value) };
}

/** PPTD omits positions covered by a merge; sourceIndex is the index to edit in the original row. */
export function tableGrid(
  input: unknown,
  columns?: number,
): { grid: TableSlot[][]; colCount: number } {
  if (!Array.isArray(input)) throw new Error('A table requires a rows array.');
  if (columns !== undefined && (!Number.isInteger(columns) || columns < 1)) {
    throw new Error('Table column count must be a positive integer.');
  }
  const grid: TableSlot[][] = Array.from({ length: input.length }, () => []);
  let colCount = columns ?? 1;
  for (let row = 0; row < input.length; row++) {
    const entries: unknown = input[row];
    if (!Array.isArray(entries)) throw new Error(`Table row ${row + 1} is not an array.`);
    let column = 0;
    for (let sourceIndex = 0; sourceIndex < entries.length; sourceIndex++) {
      while (grid[row][column]) column++;
      const cell = normalizeCell(entries[sourceIndex]);
      const rowSpan = span(cell.rowSpan);
      const colSpan = span(cell.colSpan);
      if (row + rowSpan > input.length || (columns !== undefined && column + colSpan > columns)) {
        throw new Error(
          `Table cell at row ${row + 1}, column ${column + 1} extends outside its grid.`,
        );
      }
      for (let r = row; r < row + rowSpan; r++) {
        for (let c = column; c < column + colSpan; c++) {
          if (grid[r][c])
            throw new Error(`Overlapping table merges at row ${r + 1}, column ${c + 1}.`);
          const covered = r !== row || c !== column;
          grid[r][c] = {
            row: r,
            column: c,
            cell: covered ? null : cell,
            sourceIndex: covered ? null : sourceIndex,
            covered,
            owner: covered ? { row, column } : null,
            rowSpan: covered ? 1 : rowSpan,
            colSpan: covered ? 1 : colSpan,
          };
        }
      }
      column += colSpan;
      colCount = Math.max(colCount, column);
    }
  }
  for (let row = 0; row < grid.length; row++) {
    for (let column = 0; column < colCount; column++) {
      grid[row][column] ??= {
        row,
        column,
        cell: null,
        sourceIndex: null,
        covered: false,
        owner: null,
        rowSpan: 1,
        colSpan: 1,
      };
    }
  }
  return { grid, colCount };
}

function ratios(value: unknown, count: number, field: string): number[] | null {
  if (value === undefined || value === null) return null;
  if (
    !Array.isArray(value) ||
    value.length !== count ||
    value.some(
      (item) => typeof item !== 'number' || !Number.isFinite(item) || item <= 0 || item > 1,
    )
  )
    throw new Error(`${field} must contain ${count} positive ratios.`);
  const list = value as number[];
  if (Math.abs(list.reduce((sum, item) => sum + item, 0) - 1) > 0.001) {
    throw new Error(`${field} must sum to 1.`);
  }
  return [...list];
}

export function tableLayout(element: Record<string, unknown>): {
  grid: TableSlot[][];
  colCount: number;
  columnRatios: number[];
  rowMinimums: number[];
} {
  const explicitColumns =
    Array.isArray(element.columnWidths) && element.columnWidths.length
      ? element.columnWidths.length
      : undefined;
  const { grid, colCount } = tableGrid(element.rows, explicitColumns);
  const columnRatios =
    ratios(element.columnWidths, colCount, 'columnWidths') ??
    Array.from({ length: colCount }, () => 1 / colCount);
  const rowRatios = ratios(element.rowHeights, grid.length, 'rowHeights');
  const bounds = Array.isArray(element.bounds) ? element.bounds : [];
  const height = typeof bounds[3] === 'number' && Number.isFinite(bounds[3]) ? bounds[3] : 400;
  return {
    grid,
    colCount,
    columnRatios,
    rowMinimums: grid.map((_, row) =>
      Math.max(row === 0 ? 30 : 26, rowRatios ? height * rowRatios[row] : 0),
    ),
  };
}
