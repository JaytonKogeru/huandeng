import {
  type ChartCell,
  chartNumber,
  chartValue,
  type NormalizedChart,
  type NormalizedChartSeries,
  normalizeChart,
} from './science-model';
import type { PptdElement } from './types';

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function label(value: unknown): string {
  if (typeof value === 'string') return value;
  return String(record(value).text ?? '');
}

function numeric(value: ChartCell, context: string): number {
  const number = chartNumber(value);
  if (number === null) throw new Error(`${context} must contain a number.`);
  return number;
}

function hierarchy(model: NormalizedChart, series: NormalizedChartSeries) {
  type Node = { name: string; value: number; children?: Node[] };
  const nodes = new Map<string, Node>();
  const parents = new Map<string, string>();
  for (const row of model.data.rows) {
    const name = String(chartValue(row, series, 'category') ?? '');
    const parent = String(chartValue(row, series, 'parent') ?? '');
    const value = numeric(chartValue(row, series, 'value'), name);
    if (!name || nodes.has(name) || value < 0)
      throw new Error('Hierarchy names must be unique and values non-negative.');
    nodes.set(name, { name, value });
    if (parent) parents.set(name, parent);
  }
  for (const name of nodes.keys()) {
    const seen = new Set([name]);
    let ancestor = parents.get(name);
    while (ancestor) {
      if (!nodes.has(ancestor)) throw new Error(`Hierarchy parent ${ancestor} is missing.`);
      if (seen.has(ancestor)) throw new Error('Hierarchy data contains a cycle.');
      seen.add(ancestor);
      if (seen.size > 40) throw new Error('Hierarchy nesting is limited to 40 levels.');
      ancestor = parents.get(ancestor);
    }
  }
  const roots: Node[] = [];
  for (const [name, node] of nodes) {
    const parentName = parents.get(name);
    const parent = parentName ? nodes.get(parentName) : undefined;
    if (parent) {
      parent.children ??= [];
      parent.children.push(node);
    } else roots.push(node);
  }
  return roots;
}

function sankeyData(model: NormalizedChart, series: NormalizedChartSeries) {
  const nodes = new Set<string>();
  const links = model.data.rows.map((row) => {
    const source = String(chartValue(row, series, 'source') ?? '');
    const target = String(chartValue(row, series, 'target') ?? '');
    const value = numeric(chartValue(row, series, 'flow'), `${source} → ${target}`);
    if (!source || !target || source === target || value < 0)
      throw new Error('Sankey links need distinct named nodes and non-negative values.');
    nodes.add(source);
    nodes.add(target);
    return { source, target, value };
  });
  const degree = new Map([...nodes].map((name) => [name, 0]));
  const next = new Map([...nodes].map((name) => [name, [] as string[]]));
  for (const link of links) {
    degree.set(link.target, (degree.get(link.target) ?? 0) + 1);
    next.get(link.source)?.push(link.target);
  }
  const ready = [...nodes].filter((name) => !degree.get(name));
  let visited = 0;
  for (let index = 0; index < ready.length; index++) {
    visited++;
    for (const target of next.get(ready[index]) ?? []) {
      const remaining = (degree.get(target) ?? 0) - 1;
      degree.set(target, remaining);
      if (!remaining) ready.push(target);
    }
  }
  if (visited !== nodes.size) throw new Error('Sankey flow must not contain cycles.');
  return { data: [...nodes].map((name) => ({ name })), links };
}

export function buildChartOption(
  element: PptdElement,
  theme: { colors?: Record<string, string>; chartColors?: string[] } = {},
): Record<string, unknown> {
  const model = normalizeChart(element);
  const first = model.series[0];
  const color = (value: unknown, fallback: string) => {
    if (typeof value !== 'string') return fallback;
    return value.startsWith('$') ? (theme.colors?.[value.slice(1)] ?? fallback) : value;
  };
  const defaults = [
    theme.colors?.accent1 ?? '#2d6b61',
    theme.colors?.accent2 ?? '#d38a3e',
    theme.colors?.accent3 ?? '#647ab0',
    theme.colors?.accent4 ?? '#a8688b',
    theme.colors?.accent5 ?? '#83a473',
    theme.colors?.accent6 ?? '#8e7964',
  ];
  const custom = (
    Array.isArray(element.colors) ? element.colors : (theme.chartColors ?? [])
  ).filter((entry): entry is string => typeof entry === 'string' && !!entry.trim());
  const palette = (custom.length ? custom : defaults).map((entry) => color(entry, '#2d6b61'));
  const fontSize =
    typeof element.fontSize === 'number' ? Math.max(6, Math.min(80, element.fontSize)) : 13;
  const option: Record<string, unknown> = {
    animation: false,
    backgroundColor: 'transparent',
    color: palette,
    textStyle: {
      fontFamily:
        typeof element.fontFamily === 'string' && element.fontFamily.trim()
          ? element.fontFamily
          : 'Arial, sans-serif',
      fontSize,
      color: color('$text', '#263531'),
    },
    title: {
      show: !!model.title,
      text: model.title,
      left: 'center',
      top: 6,
      textStyle: { fontSize: fontSize + 3, fontWeight: 600 },
    },
    legend: {
      show: model.legend,
      bottom: 0,
      type: 'plain',
      textStyle: { fontSize: Math.max(9, fontSize - 1) },
    },
    tooltip: { show: false },
  };
  const sourceX = record(Array.isArray(element.xAxis) ? element.xAxis[0] : element.xAxis);
  const sourceY = record(Array.isArray(element.yAxis) ? element.yAxis[0] : element.yAxis);
  const [xInput, yInput] = model.axesSwapped ? [sourceY, sourceX] : [sourceX, sourceY];
  const axis = (input: Record<string, unknown>, numericAxis: boolean) => ({
    type: numericAxis ? 'value' : 'category',
    name: label(input.title ?? input.name),
    nameLocation: 'middle',
    nameGap: 32,
    min: typeof input.min === 'number' ? input.min : undefined,
    max: typeof input.max === 'number' ? input.max : undefined,
    axisLabel: { fontSize, hideOverlap: true, color: color('$text', '#46534e') },
    axisLine: { show: true, lineStyle: { color: '#9ba7a1' } },
    splitLine: { show: numericAxis && input.grid !== false, lineStyle: { color: '#e7ebe8' } },
  });
  const cartesian = () => {
    option.grid = {
      left: 58,
      right: 24,
      top: model.title ? 46 : 24,
      bottom: model.legend ? 74 : 56,
      containLabel: true,
    };
  };
  if (['bar', 'line', 'area'].includes(first.type)) {
    cartesian();
    const horizontal = model.horizontal;
    const categories = [
      ...new Set(
        model.series.flatMap((series) =>
          model.data.rows.map((row) => String(chartValue(row, series, 'x') ?? '')),
        ),
      ),
    ];
    option.xAxis = horizontal ? axis(yInput, true) : { ...axis(xInput, false), data: categories };
    option.yAxis = horizontal ? { ...axis(xInput, false), data: categories } : axis(yInput, true);
    option.series = model.series.map((series, index) => ({
      name: series.name,
      type: series.type === 'area' ? 'line' : series.type,
      areaStyle: series.type === 'area' ? { opacity: 0.25 } : undefined,
      smooth: series.source.smooth === true,
      showSymbol: series.source.showSymbol !== false,
      symbolSize: 6,
      stack: typeof series.source.stack === 'string' ? series.source.stack : undefined,
      connectNulls: false,
      itemStyle: { color: color(series.source.color, String(palette[index % palette.length])) },
      label: { show: model.dataLabels, position: horizontal ? 'right' : 'top', fontSize },
      data: model.data.rows.map((row) => {
        const x = String(chartValue(row, series, 'x') ?? '');
        const y = chartNumber(chartValue(row, series, 'y'));
        return horizontal ? [y, x] : [x, y];
      }),
    }));
  } else if (first.type === 'scatter' || first.type === 'bubble') {
    cartesian();
    option.xAxis = axis(xInput, true);
    option.yAxis = axis(yInput, true);
    option.series = model.series.map((series, index) => ({
      type: 'scatter',
      name: series.name,
      itemStyle: { color: color(series.source.color, palette[index % palette.length]) },
      symbolSize:
        first.type === 'bubble'
          ? (values: number[]) => Math.max(3, Math.min(70, Math.sqrt(Math.max(0, values[2])) * 5))
          : 9,
      label: { show: model.dataLabels, position: 'top', fontSize },
      data: model.data.rows.flatMap((row) => {
        const x = chartNumber(chartValue(row, series, 'x'));
        const y = chartNumber(chartValue(row, series, 'y'));
        if (x === null || y === null) return [];
        const size = first.type === 'bubble' ? chartNumber(chartValue(row, series, 'size')) : 1;
        if (size === null || size < 0)
          throw new Error('Bubble sizes must be non-negative numbers.');
        return [[x, y, size]];
      }),
    }));
  } else if (first.type === 'pie') {
    const input = Number(first.source.innerRadius ?? 0);
    const inner = Number.isFinite(input) ? Math.max(0, input) : 0;
    option.series = [
      {
        type: 'pie',
        name: first.name,
        center: ['50%', model.legend ? '46%' : '53%'],
        radius: [`${Math.min(65, inner <= 1 ? inner * 100 : inner)}%`, '72%'],
        label: { show: model.dataLabels, fontSize, formatter: '{b}: {c}' },
        data: model.data.rows.map((row) => {
          const value = numeric(chartValue(row, first, 'value'), 'Pie value');
          if (value < 0) throw new Error('Pie values must be non-negative.');
          return { name: String(chartValue(row, first, 'category') ?? ''), value };
        }),
      },
    ];
  } else if (first.type === 'radar') {
    const categories = model.data.rows.map((row) =>
      String(chartValue(row, first, 'category') ?? ''),
    );
    const data = model.series.map((series, index) => ({
      name: series.name,
      itemStyle: { color: color(series.source.color, palette[index % palette.length]) },
      lineStyle: { color: color(series.source.color, palette[index % palette.length]) },
      value: model.data.rows.map((row) => numeric(chartValue(row, series, 'y'), series.name)),
    }));
    option.radar = {
      center: ['50%', '50%'],
      radius: '62%',
      indicator: categories.map((name, index) => {
        const values = data.map((series) => series.value[index]);
        return { name, min: Math.min(0, ...values), max: Math.max(1, ...values) * 1.15 };
      }),
      axisName: { fontSize },
    };
    option.series = [{ type: 'radar', data, areaStyle: { opacity: 0.12 }, symbolSize: 5 }];
  } else if (first.type === 'heatmap') {
    cartesian();
    option.grid = {
      left: 52,
      right: 65,
      top: model.title ? 44 : 20,
      bottom: 45,
      containLabel: true,
    };
    const xs = [
      ...new Set(model.data.rows.map((row) => String(chartValue(row, first, 'x') ?? ''))),
    ];
    const ys = [
      ...new Set(model.data.rows.map((row) => String(chartValue(row, first, 'y') ?? ''))),
    ];
    const data = model.data.rows.flatMap((row) => {
      const value = chartNumber(chartValue(row, first, 'value'));
      return value === null
        ? []
        : [
            [
              xs.indexOf(String(chartValue(row, first, 'x') ?? '')),
              ys.indexOf(String(chartValue(row, first, 'y') ?? '')),
              value,
            ],
          ];
    });
    option.xAxis = { ...axis(xInput, false), data: xs, splitArea: { show: true } };
    option.yAxis = { ...axis(yInput, false), data: ys, splitArea: { show: true } };
    const values = data.map((item) => item[2]);
    option.visualMap = {
      min: Math.min(0, ...values),
      max: Math.max(1, ...values),
      calculable: false,
      orient: 'vertical',
      right: 0,
      top: 'center',
      inRange: { color: ['#edf3f0', '#2d6b61'] },
    };
    option.legend = { show: false };
    option.series = [{ type: 'heatmap', data, label: { show: model.dataLabels, fontSize } }];
  } else if (first.type === 'candlestick') {
    cartesian();
    option.xAxis = {
      ...axis(xInput, false),
      data: model.data.rows.map((row) => String(chartValue(row, first, 'x') ?? '')),
    };
    option.yAxis = axis(yInput, true);
    option.series = [
      {
        type: 'candlestick',
        name: first.name,
        data: model.data.rows.map((row) => {
          const values = (['open', 'close', 'low', 'high'] as const).map((channel) =>
            numeric(
              chartValue(row, first, channel) ??
                (channel === 'open' ? chartValue(row, first, 'close') : null),
              channel,
            ),
          );
          if (
            values[2] > Math.min(values[0], values[1]) ||
            values[3] < Math.max(values[0], values[1])
          )
            throw new Error('Candlestick high/low must enclose open and close.');
          return values;
        }),
        itemStyle: {
          color: '#2d6b61',
          color0: '#c96c61',
          borderColor: '#2d6b61',
          borderColor0: '#c96c61',
        },
      },
    ];
  } else if (first.type === 'waterfall') {
    cartesian();
    const horizontal = model.horizontal;
    option.legend = { show: false };
    const category = {
      ...axis(xInput, false),
      data: model.data.rows.map((row) => String(chartValue(row, first, 'x') ?? '')),
    };
    option.xAxis = horizontal ? axis(yInput, true) : category;
    option.yAxis = horizontal ? category : axis(yInput, true);
    let running = 0;
    const data = model.data.rows.map((row, index) => {
      const value = numeric(chartValue(row, first, 'y'), 'Waterfall change');
      const total = chartValue(row, first, 'isTotal');
      const isTotal = total === true || total === 1 || total === 'true';
      const start = isTotal ? 0 : running;
      const end = isTotal ? value : running + value;
      running = end;
      return [index, start, end, value];
    });
    option.series = [
      {
        type: 'custom',
        name: first.name,
        data,
        encode: horizontal ? { x: [1, 2], y: 0 } : { x: 0, y: [1, 2] },
        renderItem: (
          _params: unknown,
          api: {
            value(index: number): number;
            coord(values: number[]): number[];
            size(values: number[]): number[];
          },
        ) => {
          const start = api.coord(
            horizontal ? [api.value(1), api.value(0)] : [api.value(0), api.value(1)],
          );
          const end = api.coord(
            horizontal ? [api.value(2), api.value(0)] : [api.value(0), api.value(2)],
          );
          const width = Math.abs(api.size(horizontal ? [0, 1] : [1, 0])[horizontal ? 1 : 0]) * 0.62;
          return {
            type: 'group',
            children: [
              {
                type: 'rect',
                shape: horizontal
                  ? {
                      x: Math.min(start[0], end[0]),
                      y: start[1] - width / 2,
                      width: Math.max(1, Math.abs(start[0] - end[0])),
                      height: width,
                    }
                  : {
                      x: start[0] - width / 2,
                      y: Math.min(start[1], end[1]),
                      width,
                      height: Math.max(1, Math.abs(start[1] - end[1])),
                    },
                style: { fill: api.value(2) >= api.value(1) ? '#2d6b61' : '#c96c61' },
              },
              ...(model.dataLabels
                ? [
                    {
                      type: 'text',
                      style: {
                        x: horizontal ? Math.max(start[0], end[0]) + 7 : start[0],
                        y: horizontal ? start[1] : Math.min(start[1], end[1]) - 7,
                        text: String(api.value(3)),
                        fontSize,
                        align: horizontal ? 'left' : 'center',
                        verticalAlign: horizontal ? 'middle' : 'bottom',
                        fill: '#263531',
                      },
                    },
                  ]
                : []),
            ],
          };
        },
      },
    ];
  } else if (first.type === 'treemap' || first.type === 'sunburst') {
    option.legend = { show: false };
    option.series = [
      {
        type: first.type,
        data: hierarchy(model, first),
        top: model.title ? 44 : 12,
        bottom: 10,
        left: 10,
        right: 10,
        roam: false,
        nodeClick: false,
        breadcrumb: { show: false },
        radius: ['0%', '78%'],
        label: { show: true, fontSize },
      },
    ];
  } else if (first.type === 'sankey') {
    option.legend = { show: false };
    option.series = [
      {
        type: 'sankey',
        ...sankeyData(model, first),
        top: model.title ? 48 : 22,
        bottom: 22,
        left: 28,
        right: 80,
        draggable: false,
        emphasis: { disabled: true },
        lineStyle: { color: 'source', opacity: 0.3 },
        label: { fontSize },
      },
    ];
  }
  return option;
}
