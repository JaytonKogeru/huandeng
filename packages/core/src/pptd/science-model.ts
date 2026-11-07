import type { PageSize, PptdElement } from './types';

export const CHART_TYPES = [
  'bar',
  'line',
  'area',
  'pie',
  'scatter',
  'bubble',
  'radar',
  'heatmap',
  'candlestick',
  'waterfall',
  'treemap',
  'sunburst',
  'sankey',
] as const;

export type ChartType = (typeof CHART_TYPES)[number];
export type ChartCell = string | number | boolean | null;
export type ChartChannel =
  | 'x'
  | 'y'
  | 'category'
  | 'value'
  | 'size'
  | 'open'
  | 'close'
  | 'high'
  | 'low'
  | 'isTotal'
  | 'parent'
  | 'source'
  | 'target'
  | 'flow';

export const CHART_CHANNELS: Record<ChartType, ChartChannel[]> = {
  bar: ['x', 'y'],
  line: ['x', 'y'],
  area: ['x', 'y'],
  pie: ['category', 'value'],
  scatter: ['x', 'y'],
  bubble: ['x', 'y', 'size'],
  radar: ['category', 'y'],
  heatmap: ['x', 'y', 'value'],
  candlestick: ['x', 'open', 'high', 'low', 'close'],
  waterfall: ['x', 'y', 'isTotal'],
  treemap: ['category', 'value', 'parent'],
  sunburst: ['category', 'value', 'parent'],
  sankey: ['source', 'target', 'flow'],
};

export const CHART_LABELS: Record<ChartType, string> = {
  bar: '柱状图',
  line: '折线图',
  area: '面积图',
  pie: '饼图 / 环形图',
  scatter: '散点图',
  bubble: '气泡图',
  radar: '雷达图',
  heatmap: '热力图',
  candlestick: '蜡烛图',
  waterfall: '瀑布图',
  treemap: '矩形树图',
  sunburst: '旭日图',
  sankey: '桑基图',
};

export interface ChartData {
  cols: string[];
  rows: ChartCell[][];
}

export interface NormalizedChartSeries {
  type: ChartType;
  name: string;
  encode: Partial<Record<ChartChannel, number>>;
  source: Record<string, unknown>;
}

export interface NormalizedChart {
  data: ChartData;
  series: NormalizedChartSeries[];
  title: string;
  legend: boolean;
  dataLabels: boolean;
  horizontal: boolean;
  axesSwapped: boolean;
}

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function chartData(input: unknown): ChartData {
  const data = object(input);
  if (
    !Array.isArray(data.cols) ||
    !data.cols.length ||
    data.cols.length > 100 ||
    data.cols.some((col) => typeof col !== 'string' || !col.trim()) ||
    new Set(data.cols).size !== data.cols.length
  ) {
    throw new Error('Chart columns must be unique non-empty names (at most 100 columns).');
  }
  if (!Array.isArray(data.rows) || data.rows.length > 10000) {
    throw new Error('Chart data requires rows (at most 10,000 rows).');
  }
  const cols = data.cols as string[];
  const rows = data.rows.map((row, index) => {
    if (!Array.isArray(row) || row.length !== cols.length) {
      throw new Error(`Chart row ${index + 1} must contain ${cols.length} cells.`);
    }
    return row.map((cell) => {
      if (
        cell === null ||
        typeof cell === 'string' ||
        typeof cell === 'boolean' ||
        (typeof cell === 'number' && Number.isFinite(cell))
      )
        return cell;
      throw new Error(`Chart row ${index + 1} contains an invalid value.`);
    });
  });
  return { cols: [...cols], rows };
}

export function chartSeriesForType(
  input: unknown,
  type: ChartType,
  cols: string[],
): Record<string, unknown> {
  const source = object(input);
  const previous = object(source.encode);
  const encode: Record<string, unknown> = { ...previous };
  const aliases: Partial<Record<ChartChannel, ChartChannel[]>> = {
    x: ['category'],
    category: ['x'],
    y: ['value'],
    value: ['y'],
  };
  for (const [index, channel] of CHART_CHANNELS[type].entries()) {
    const candidate =
      previous[channel] ??
      aliases[channel]?.map((key) => previous[key]).find((value) => value !== undefined);
    encode[channel] =
      (typeof candidate === 'string' && cols.includes(candidate)) ||
      (typeof candidate === 'number' && Number.isInteger(candidate) && cols[candidate])
        ? candidate
        : (cols[index] ?? '');
  }
  return { ...source, type, encode };
}

export function normalizeChart(element: PptdElement): NormalizedChart {
  const data = chartData(element.data);
  for (const key of ['xAxis', 'yAxis'] as const) {
    const value = element[key];
    if (Array.isArray(value) && value.length > 1)
      throw new Error(
        'Secondary chart axes are not supported yet. Use a separate chart for each scale.',
      );
    const axis = object(Array.isArray(value) ? value[0] : value);
    if (axis.type && !['value', 'category'].includes(String(axis.type)))
      throw new Error(
        `The ${String(axis.type)} axis scale is not supported yet; it must not be replaced by a linear scale.`,
      );
    if (
      (axis.min !== undefined && (typeof axis.min !== 'number' || !Number.isFinite(axis.min))) ||
      (axis.max !== undefined && (typeof axis.max !== 'number' || !Number.isFinite(axis.max))) ||
      (typeof axis.min === 'number' && typeof axis.max === 'number' && axis.min >= axis.max)
    )
      throw new Error(
        'Chart axis limits must be finite numbers with minimum smaller than maximum.',
      );
  }
  const input =
    Array.isArray(element.series) && element.series.length ? element.series : [{ type: 'bar' }];
  if (input.length > 50) throw new Error('A chart supports at most 50 series.');
  let axesSwapped = false;
  const series = input.map((item, index): NormalizedChartSeries => {
    const own = object(item);
    const type = String(own.type ?? 'bar');
    if (!CHART_TYPES.includes(type as ChartType))
      throw new Error(`Unsupported chart type: ${type}.`);
    const defaults = object(element.seriesDefaults);
    const common = Object.fromEntries(
      Object.entries(defaults).filter(([key]) => !['type', 'encode', ...CHART_TYPES].includes(key)),
    );
    const typed = object(defaults[type]);
    const base = { ...common, ...typed };
    delete base.type;
    delete base.encode;
    const source = { ...base, ...own };
    for (const key of Object.keys(base))
      if (Object.keys(object(base[key])).length && Object.keys(object(own[key])).length)
        source[key] = { ...object(base[key]), ...object(own[key]) };
    if (source.dataFilter != null)
      throw new Error(
        'Filtered scatter/bubble data is not supported yet. Filter the source table explicitly before drawing this chart.',
      );
    if (Number(source.xAxisIndex ?? 0) !== 0 || Number(source.yAxisIndex ?? 0) !== 0)
      throw new Error(
        'Secondary chart axes are not supported yet. Use a separate chart for each scale.',
      );
    const explicitColor = ['line', 'area', 'radar'].includes(type)
      ? source.lineColor
      : typeof source.fill === 'string'
        ? source.fill
        : object(source.fill).color;
    if (typeof explicitColor === 'string') source.color = explicitColor;
    const channels = CHART_CHANNELS[type as ChartType];
    const raw = object(source.encode);
    const encode: Partial<Record<ChartChannel, number>> = {};
    for (const [channelIndex, channel] of channels.entries()) {
      if (
        Object.keys(raw).length &&
        raw[channel] == null &&
        (channel === 'isTotal' ||
          channel === 'parent' ||
          (type === 'candlestick' && channel === 'open'))
      )
        continue;
      const alias = (
        { x: 'category', category: 'x', y: 'value', value: 'y' } as Partial<
          Record<ChartChannel, ChartChannel>
        >
      )[channel];
      const field = raw[channel] ?? (alias ? raw[alias] : undefined) ?? data.cols[channelIndex];
      const column = typeof field === 'number' ? field : data.cols.indexOf(String(field));
      if (!Number.isInteger(column) || column < 0 || column >= data.cols.length) {
        if (
          channel === 'isTotal' ||
          channel === 'parent' ||
          (type === 'candlestick' && channel === 'open')
        )
          continue;
        throw new Error(`Series ${index + 1}: channel ${channel} references a missing column.`);
      }
      encode[channel] = column;
    }
    if (type === 'bar' || type === 'waterfall') {
      const axisType = (key: 'xAxis' | 'yAxis', channel: 'x' | 'y') => {
        const value = element[key];
        const configured = object(Array.isArray(value) ? value[0] : value).type;
        if (configured) return configured;
        return data.rows.some((row) => {
          const cell = row[encode[channel] ?? -1];
          return cell != null && cell !== '' && chartNumber(cell) === null;
        })
          ? 'category'
          : 'value';
      };
      if (axisType('xAxis', 'x') !== 'category' && axisType('yAxis', 'y') === 'category') {
        [encode.x, encode.y] = [encode.y, encode.x];
        axesSwapped = true;
      }
    }
    return {
      type: type as ChartType,
      name:
        typeof source.name === 'string'
          ? source.name
          : (data.cols[encode.y ?? encode.value ?? 1] ?? `Series ${index + 1}`),
      encode,
      source,
    };
  });
  for (const [seriesIndex, item] of series.entries()) {
    const numericChannels: ChartChannel[] =
      item.type === 'scatter' || item.type === 'bubble'
        ? ['x', 'y', ...(item.type === 'bubble' ? (['size'] as const) : [])]
        : item.type === 'candlestick'
          ? ['open', 'high', 'low', 'close']
          : item.type === 'sankey'
            ? ['flow']
            : ['pie', 'heatmap', 'treemap', 'sunburst'].includes(item.type)
              ? ['value']
              : ['y'];
    for (const [rowIndex, row] of data.rows.entries()) {
      for (const channel of numericChannels) {
        const value = chartValue(row, item, channel);
        if (value === null || (typeof value === 'string' && !value.trim())) continue;
        if (chartNumber(value) === null)
          throw new Error(
            `Series ${seriesIndex + 1}, row ${rowIndex + 1}, ${channel} must contain a number. Use an empty cell for a missing measurement.`,
          );
      }
    }
  }
  const cartesian = new Set<ChartType>(['bar', 'line', 'area']);
  if (series.length > 1 && !series.every((item) => cartesian.has(item.type))) {
    const first = series[0].type;
    if (
      !['scatter', 'bubble', 'radar'].includes(first) ||
      series.some((item) => item.type !== first)
    ) {
      throw new Error(
        'This chart family requires a single series. Bar, line and area series may be combined.',
      );
    }
  }
  if (
    series[0].type === 'radar' &&
    series.some((item) => item.encode.category !== series[0].encode.category)
  )
    throw new Error('All radar series must reference the same category column.');
  return {
    data,
    series,
    title:
      typeof element.title === 'string' ? element.title : String(object(element.title).text ?? ''),
    legend: element.legend !== false && object(element.legend).show !== false,
    dataLabels:
      element.dataLabels === true ||
      (Object.keys(object(element.dataLabels)).length > 0 &&
        object(element.dataLabels).show !== false),
    horizontal:
      element.direction === 'horizontal' || (element.direction !== 'vertical' && axesSwapped),
    axesSwapped,
  };
}

export function chartValue(
  row: ChartCell[],
  series: NormalizedChartSeries,
  channel: ChartChannel,
): ChartCell {
  const column = series.encode[channel];
  return column === undefined ? null : (row[column] ?? null);
}

export function chartNumber(value: ChartCell): number | null {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value)))
    return Number(value);
  return null;
}

export function chartDataText(input: unknown): string {
  const data = chartData(input);
  const cellText = (cell: ChartCell) => {
    const text = cell === null ? '' : String(cell);
    return /[\t\r\n"]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return [data.cols, ...data.rows].map((row) => row.map(cellText).join('\t')).join('\n');
}

export function parseChartDataText(source: string): ChartData {
  const delimiter = source.split(/\r?\n/, 1)[0]?.includes('\t') ? '\t' : ',';
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  let afterQuote = false;
  const finishCell = () => {
    row.push(cell);
    cell = '';
    afterQuote = false;
  };
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (quoted) {
      if (ch === '"' && source[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
        afterQuote = true;
      } else cell += ch;
    } else if (ch === '"' && !cell && !afterQuote) quoted = true;
    else if (ch === delimiter) finishCell();
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && source[i + 1] === '\n') i++;
      finishCell();
      rows.push(row);
      row = [];
    } else if (afterQuote) {
      if (ch !== ' ') throw new Error('Unexpected text after a quoted cell.');
    } else cell += ch;
  }
  if (quoted) throw new Error('The last quoted cell is not closed.');
  if (cell || row.length || afterQuote) {
    finishCell();
    rows.push(row);
  }
  const cols = rows.shift()?.map((value) => value.trim()) ?? [];
  return chartData({
    cols,
    rows: rows.map((entry) =>
      entry.map((value): ChartCell => {
        if (!value.trim()) return null;
        if (/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(value.trim())) {
          const number = Number(value);
          if (Number.isFinite(number)) return number;
        }
        return value;
      }),
    ),
  });
}

export type ScienceObject = 'table' | 'equation' | 'chart' | 'icon';

export function createScienceElement(
  kind: ScienceObject,
  id: string,
  size: PageSize = [960, 540],
  variant: ChartType | string = 'bar',
): PptdElement {
  const width = Math.max(80, Math.min(620, size[0] - 100));
  const height = Math.max(60, Math.min(340, size[1] - 130));
  const bounds: [number, number, number, number] = [
    (size[0] - width) / 2,
    (size[1] - height) / 2,
    width,
    height,
  ];
  if (kind === 'table')
    return {
      elementId: id,
      elementType: 'table',
      bounds: [bounds[0], bounds[1], width, Math.min(220, height)],
      columnWidths: [1 / 3, 1 / 3, 1 / 3],
      rows: [
        [
          { text: 'Condition', bold: true, fill: '#e7eeeb' },
          { text: 'Value', bold: true, fill: '#e7eeeb' },
          { text: 'Unit', bold: true, fill: '#e7eeeb' },
        ],
        [{ text: 'A' }, { text: '1.0' }, { text: '' }],
        [{ text: 'B' }, { text: '2.0' }, { text: '' }],
      ],
    };
  if (kind === 'equation')
    return {
      elementId: id,
      elementType: 'text',
      bounds: [bounds[0], size[1] / 2 - 45, width, 90],
      content: {
        text: '\\[\\Delta G = -k_{\\mathrm{B}}T \\ln K\\]',
        fontSize: 30,
        color: '#172d29',
        align: ['center', 'middle'],
      },
    };
  if (kind === 'icon')
    return {
      elementId: id,
      elementType: 'icon',
      bounds: [size[0] / 2 - 36, size[1] / 2 - 36, 72, 72],
      iconName: variant.includes(':') ? variant : 'fas:circle-check',
      fill: { type: 'solid', color: '#315e50' },
    };
  const type = CHART_TYPES.includes(variant as ChartType) ? (variant as ChartType) : 'bar';
  let data: ChartData = {
    cols: ['Condition', 'Value'],
    rows: [
      ['A', 20],
      ['B', 35],
      ['C', 28],
      ['D', 42],
    ],
  };
  if (type === 'scatter' || type === 'bubble')
    data = {
      cols: type === 'bubble' ? ['x', 'y', 'size'] : ['x', 'y'],
      rows: [
        [1, 2, 10],
        [2, 3.5, 18],
        [3, 2.8, 14],
        [4, 4.2, 24],
      ].map((row) => (type === 'bubble' ? row : row.slice(0, 2))),
    };
  if (type === 'heatmap')
    data = {
      cols: ['x', 'y', 'value'],
      rows: [
        ['A', 'X', 1],
        ['A', 'Y', 4],
        ['B', 'X', 3],
        ['B', 'Y', 2],
      ],
    };
  if (type === 'candlestick')
    data = {
      cols: ['Date', 'Open', 'High', 'Low', 'Close'],
      rows: [
        ['Day 1', 10, 14, 9, 12],
        ['Day 2', 12, 15, 10, 11],
        ['Day 3', 11, 16, 11, 15],
      ],
    };
  if (type === 'waterfall')
    data = {
      cols: ['Step', 'Change', 'Total'],
      rows: [
        ['Start', 100, true],
        ['Increase', 30, false],
        ['Decrease', -20, false],
        ['End', 110, true],
      ],
    };
  if (type === 'treemap' || type === 'sunburst')
    data = {
      cols: ['Category', 'Value', 'Parent'],
      rows: [
        ['All', 100, null],
        ['A', 60, 'All'],
        ['B', 40, 'All'],
        ['A1', 35, 'A'],
        ['A2', 25, 'A'],
      ],
    };
  if (type === 'sankey')
    data = {
      cols: ['Source', 'Target', 'Flow'],
      rows: [
        ['A', 'C', 20],
        ['B', 'C', 10],
        ['C', 'D', 18],
        ['C', 'E', 12],
      ],
    };
  return {
    elementId: id,
    elementType: 'chart',
    bounds,
    data,
    series: [chartSeriesForType({}, type, data.cols)],
    legend: type === 'pie',
    dataLabels: false,
  };
}
