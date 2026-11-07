import { describe, expect, it } from 'vitest';
import { renderChartSvg } from './chart-engine';
import { buildChartOption } from './chart-options';
import {
  buildGroup,
  duplicateElements,
  expandGroupIds,
  owningGroupId,
  transformGroup,
  ungroupOperations,
} from './grouping';
import { loadScientificIcon } from './icon-registry';
import {
  CHART_TYPES,
  chartDataText,
  chartNumber,
  chartSeriesForType,
  createScienceElement,
  normalizeChart,
  parseChartDataText,
} from './science-model';
import { changeTableSize, editTableCell, mergeTableCells, splitTableCell } from './table-edit';
import { tableLayout } from './table-grid';
import type { PptdElement } from './types';

describe('scientific chart source and rendering', () => {
  it.each(CHART_TYPES)('renders the %s chart through the bundled SVG engine', (type) => {
    const chart = createScienceElement('chart', `chart-${type}`, [960, 540], type);
    const before = JSON.stringify(chart);
    expect(normalizeChart(chart).series[0].type).toBe(type);
    const svg = renderChartSvg(chart, {});
    expect(svg).toContain('<svg');
    expect(svg).toMatch(/<(?:path|rect|circle)/);
    expect(svg).not.toContain('NaN');
    expect(JSON.stringify(chart)).toBe(before);
  });

  it('preserves quoted data, missing values and significant identifier zeroes', () => {
    const input = 'Sample\tSignal\tLabel\n001\t-1.25e2\t"a\tb"\n002\t\t"line 1\nline 2"';
    const data = parseChartDataText(input);
    expect(data.rows).toEqual([
      ['001', -125, 'a\tb'],
      ['002', null, 'line 1\nline 2'],
    ]);
    expect(parseChartDataText(chartDataText(data))).toEqual(data);
    expect(parseChartDataText('Sample,Value\n"A, B",1')).toEqual({
      cols: ['Sample', 'Value'],
      rows: [['A, B', 1]],
    });
    expect(() => parseChartDataText('x,x\n1,2')).toThrow('unique');
    expect(() => parseChartDataText('x,y\n1')).toThrow('2 cells');
    expect(() => parseChartDataText('x,y\n"unfinished,2')).toThrow('not closed');
  });

  it('keeps missing numeric values as gaps instead of inventing zeroes', () => {
    const chart = createScienceElement('chart', 'gap', [960, 540], 'line');
    chart.data = {
      cols: ['x', 'y'],
      rows: [
        ['A', 1],
        ['B', null],
        ['C', 3],
      ],
    };
    chart.series = [{ type: 'line', encode: { x: 'x', y: 'y' } }];
    const option = buildChartOption(chart);
    expect((option.series as { data: unknown[] }[])[0].data).toEqual([
      ['A', 1],
      ['B', null],
      ['C', 3],
    ]);
    expect(chartNumber('not a measurement')).toBeNull();
    expect(chartNumber('')).toBeNull();
  });

  it('rejects impossible hierarchy, flow and pie data', () => {
    const tree = createScienceElement('chart', 'tree', [960, 540], 'treemap');
    tree.data = {
      cols: ['Category', 'Value', 'Parent'],
      rows: [
        ['A', 1, 'B'],
        ['B', 1, 'A'],
      ],
    };
    expect(() => buildChartOption(tree)).toThrow('cycle');
    const flow = createScienceElement('chart', 'flow', [960, 540], 'sankey');
    flow.data = {
      cols: ['Source', 'Target', 'Flow'],
      rows: [
        ['A', 'B', 1],
        ['B', 'A', 1],
      ],
    };
    expect(() => buildChartOption(flow)).toThrow('cycles');
    const pie = createScienceElement('chart', 'pie', [960, 540], 'pie');
    pie.data = { cols: ['Condition', 'Value'], rows: [['A', -2]] };
    expect(() => buildChartOption(pie)).toThrow('non-negative');
  });

  it('keeps the original data channels when converting legacy pie encodings', () => {
    const chart: PptdElement = {
      elementId: 'pie',
      elementType: 'chart',
      data: { cols: ['value', 'name'], rows: [[3, 'A']] },
      series: [{ type: 'pie', encode: { x: 'name', y: 'value' } }],
    };
    expect(normalizeChart(chart).series[0].encode).toEqual({ category: 1, value: 0 });
    expect(
      chartSeriesForType({ encode: { x: 1, y: 0, provenance: 'retain' } }, 'pie', ['value', 'name'])
        .encode,
    ).toEqual({ x: 1, y: 0, category: 1, value: 0, provenance: 'retain' });
  });

  it('reports nonnumeric measurements instead of silently drawing them as missing data', () => {
    const chart = createScienceElement('chart', 'invalid', [960, 540], 'line');
    chart.data = { cols: ['x', 'y'], rows: [['A', 'mistyped']] };
    chart.series = [{ type: 'line', encode: { x: 'x', y: 'y' } }];
    expect(() => normalizeChart(chart)).toThrow('row 1, y must contain a number');
  });

  it('falls back from an empty palette and respects an explicit chart font', () => {
    const chart = createScienceElement('chart', 'palette', [960, 540]);
    chart.colors = [];
    chart.fontFamily = 'Georgia';
    const option = buildChartOption(chart, { chartColors: [] });
    expect(option.color).toHaveLength(6);
    expect(option.textStyle).toMatchObject({ fontFamily: 'Georgia' });
    expect(renderChartSvg(chart, {})).not.toContain('undefined');
  });

  it('adapts typed legacy defaults and keeps official horizontal categories and values intact', () => {
    const chart: PptdElement = {
      elementId: 'horizontal',
      elementType: 'chart',
      bounds: [0, 0, 600, 320],
      data: {
        cols: ['Value', 'Condition'],
        rows: [
          [2, 'A'],
          [5, 'B'],
        ],
      },
      seriesDefaults: { bar: { fill: '#1c5678', marker: { size: 7, style: 'circle' } } },
      series: [{ type: 'bar', encode: { x: 'Value', y: 'Condition' }, marker: { size: 9 } }],
      xAxis: { type: 'value', title: 'Signal' },
      yAxis: { type: 'category', title: 'Condition' },
    };
    const before = JSON.stringify(chart);
    const model = normalizeChart(chart);
    expect(model).toMatchObject({ horizontal: true, axesSwapped: true });
    expect(model.series[0]).toMatchObject({
      encode: { x: 1, y: 0 },
      source: { color: '#1c5678', marker: { size: 9, style: 'circle' } },
    });
    const option = buildChartOption(chart);
    expect(option.xAxis).toMatchObject({ type: 'value', name: 'Signal' });
    expect(option.yAxis).toMatchObject({ type: 'category', name: 'Condition', data: ['A', 'B'] });
    expect((option.series as { data: unknown[] }[])[0].data).toEqual([
      [2, 'A'],
      [5, 'B'],
    ]);
    expect(renderChartSvg(chart, {})).toContain('<svg');
    expect(JSON.stringify(chart)).toBe(before);
  });

  it('supports optional legacy candlestick open and horizontal waterfalls without inventing zeroes', () => {
    const candle: PptdElement = {
      elementId: 'hlc',
      elementType: 'chart',
      bounds: [0, 0, 600, 320],
      data: { cols: ['Date', 'High', 'Low', 'Close'], rows: [['D1', 5, 1, 3]] },
      series: [
        { type: 'candlestick', encode: { x: 'Date', high: 'High', low: 'Low', close: 'Close' } },
      ],
    };
    expect((buildChartOption(candle).series as { data: unknown[] }[])[0].data).toEqual([
      [3, 3, 1, 5],
    ]);
    const waterfall = createScienceElement('chart', 'horizontal-falls', [960, 540], 'waterfall');
    waterfall.direction = 'horizontal';
    expect(buildChartOption(waterfall).yAxis).toMatchObject({ type: 'category' });
    expect(renderChartSvg(waterfall, {})).not.toContain('NaN');
  });

  it('diagnoses scientific semantics that are not implemented instead of silently changing the plot', () => {
    const chart = createScienceElement('chart', 'unsupported');
    expect(() => normalizeChart({ ...chart, yAxis: [{}, {}] })).toThrow('Secondary');
    expect(() => normalizeChart({ ...chart, yAxis: { type: 'log' } })).toThrow('linear scale');
    expect(() =>
      normalizeChart({
        ...chart,
        series: [{ type: 'bar', dataFilter: { col: 'Condition', value: 'A' } }],
      }),
    ).toThrow('Filtered');
  });
});

describe('Font Awesome compatibility', () => {
  it('loads solid, regular and brand paths locally and resolves old aliases', async () => {
    const icons = await Promise.all(
      ['fas:star', 'far:circle-check', 'fab:github', 'fas:check-circle'].map(loadScientificIcon),
    );
    expect(icons.every((icon) => icon.width > 0 && icon.paths[0].length > 10)).toBe(true);
    expect(icons[3].name).toBe('circle-check');
    await expect(loadScientificIcon('fas:this-icon-does-not-exist')).rejects.toThrow('not in');
  });
});

describe('reference-based object groups', () => {
  const members: PptdElement[] = [
    { elementId: 'a', elementType: 'shape', bounds: [10, 20, 30, 40] },
    { elementId: 'b', elementType: 'text', bounds: [60, 20, 30, 40], content: { text: 'a' } },
  ];

  it('groups and ungroups without renaming or duplicating members', () => {
    const group = buildGroup(members, ['a', 'b'], 'g');
    expect(group.bounds).toEqual([10, 20, 80, 40]);
    expect(group.children).toEqual(['a', 'b']);
    const elements = [...members, group];
    expect(owningGroupId(elements, 'a')).toBe('g');
    expect(ungroupOperations('page', elements, ['g'])).toEqual([
      { op: 'element.remove', pageId: 'page', elementId: 'g' },
    ]);
    expect(members[0].bounds).toEqual([10, 20, 30, 40]);
  });

  it('moves and scales all members in one patch set', () => {
    const group = buildGroup(members, ['a', 'b'], 'g');
    const patches = transformGroup([...members, group], 'g', { bounds: [30, 40, 160, 80] });
    expect(patches.find((entry) => entry.elementId === 'a')?.fields.bounds).toEqual([
      30, 40, 60, 80,
    ]);
    expect(patches.find((entry) => entry.elementId === 'b')?.fields.bounds).toEqual([
      130, 40, 60, 80,
    ]);
  });

  it('rotates member centres and refuses lossy non-uniform resizing', () => {
    const group = buildGroup(members, ['a', 'b'], 'g');
    const patches = transformGroup([...members, group], 'g', { rotation: 90 });
    const first = patches.find((entry) => entry.elementId === 'a');
    if (!first) throw new Error('The member transform is missing.');
    expect(first.fields.rotation).toBe(90);
    expect((first.fields.bounds as number[])[0]).toBeCloseTo(35);
    expect((first.fields.bounds as number[])[1]).toBeCloseTo(-5);
    expect(() =>
      transformGroup([{ ...members[0], rotation: 30 }, members[1], group], 'g', {
        bounds: [10, 20, 160, 40],
      }),
    ).toThrow('aspect ratio');
  });

  it('copies nested group references while leaving coincident text untouched', () => {
    const inner = buildGroup(members, ['a', 'b'], 'g');
    const extra: PptdElement = { elementId: 'c', elementType: 'shape', bounds: [150, 100, 30, 30] };
    const outer = buildGroup([...members, inner, extra], ['g', 'c'], 'outer');
    const elements = [...members, inner, extra, outer];
    const duplicate = duplicateElements(elements, ['outer'], (id) => `copy-${id}`);
    expect(duplicate.copies).toHaveLength(5);
    expect(duplicate.copies.find((entry) => entry.elementId === 'copy-g')?.children).toEqual([
      'copy-a',
      'copy-b',
    ]);
    expect(duplicate.copies.find((entry) => entry.elementId === 'copy-b')?.content?.text).toBe('a');
    expect(duplicate.selectedIds).toEqual(['copy-outer']);
    expect(owningGroupId(elements, 'a')).toBe('outer');
    expect(() =>
      expandGroupIds(
        [{ elementId: 'cycle', elementType: 'group', children: ['cycle'] }],
        ['cycle'],
      ),
    ).toThrow('cycle');
  });
});

describe('merged table edits', () => {
  const table: PptdElement = {
    elementId: 'table',
    elementType: 'table',
    bounds: [0, 0, 300, 180],
    columnWidths: [0.4, 0.6],
    rowHeights: [0.5, 0.5],
    rows: [
      [{ text: 'Shared', rowSpan: 2, source: { citation: 'keep' } }, { text: 'B' }],
      [{ text: 'C' }],
    ],
  };

  it('inserts across a vertical span, then removes its anchor without losing text', () => {
    const inserted = { ...table, ...changeTableSize(table, 'row', 1, 'insert') };
    expect(tableLayout(inserted).grid[0][0].rowSpan).toBe(3);
    expect(tableLayout(inserted).grid[1][0].covered).toBe(true);
    const removed = { ...inserted, ...changeTableSize(inserted, 'row', 0, 'remove') };
    const layout = tableLayout(removed);
    expect(layout.grid[0][0].cell).toMatchObject({
      text: 'Shared',
      source: { citation: 'keep' },
      rowSpan: 2,
    });
    expect((removed.rowHeights as number[]).reduce((a, b) => a + b, 0)).toBeCloseTo(1);
    expect(tableLayout(table).grid[0][0].rowSpan).toBe(2);
  });

  it('edits a merged covered position through its owner and preserves unknown fields', () => {
    const result = { ...table, ...editTableCell(table, 1, 0, { text: 'Updated' }) };
    expect(tableLayout(result).grid[0][0].cell).toMatchObject({
      text: 'Updated',
      rowSpan: 2,
      source: { citation: 'keep' },
    });
  });

  it('merges full rectangles without dropping cell text and splits with explicit blank members', () => {
    const merged = {
      ...table,
      ...mergeTableCells(table, { row: 0, column: 0 }, { row: 1, column: 1 }),
    };
    expect(tableLayout(merged).grid[0][0].cell?.text).toBe('Shared\nB\nC');
    const split = { ...merged, ...splitTableCell(merged, 1, 1) };
    expect(
      tableLayout(split)
        .grid.flat()
        .filter((slot) => !slot.covered),
    ).toHaveLength(4);
    expect(tableLayout(split).grid[0][1].cell?.text).toBe('');
    expect(() => mergeTableCells(table, { row: 1, column: 0 }, { row: 1, column: 1 })).toThrow(
      'existing merged cell',
    );
  });

  it('keeps column widths normalized through insert/remove', () => {
    const inserted = { ...table, ...changeTableSize(table, 'column', 1, 'insert') };
    expect(tableLayout(inserted).colCount).toBe(3);
    expect((inserted.columnWidths as number[]).reduce((a, b) => a + b, 0)).toBeCloseTo(1);
    const removed = { ...inserted, ...changeTableSize(inserted, 'column', 1, 'remove') };
    expect(tableLayout(removed).columnRatios[0]).toBeCloseTo(0.4);
    expect(tableLayout(removed).columnRatios[1]).toBeCloseTo(0.6);
  });
});
