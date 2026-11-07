import {
  BarChart,
  CandlestickChart,
  CustomChart,
  HeatmapChart,
  LineChart,
  PieChart,
  RadarChart,
  SankeyChart,
  ScatterChart,
  SunburstChart,
  TreemapChart,
} from 'echarts/charts';
import {
  GridComponent,
  LegendComponent,
  RadarComponent,
  TitleComponent,
  VisualMapComponent,
} from 'echarts/components';
import { init, use } from 'echarts/core';
import { SVGRenderer } from 'echarts/renderers';
import { buildChartOption } from './chart-options';
import type { PptdElement } from './types';

use([
  BarChart,
  CandlestickChart,
  CustomChart,
  HeatmapChart,
  LineChart,
  PieChart,
  RadarChart,
  SankeyChart,
  ScatterChart,
  SunburstChart,
  TreemapChart,
  GridComponent,
  LegendComponent,
  RadarComponent,
  TitleComponent,
  VisualMapComponent,
  SVGRenderer,
]);

export function renderChartSvg(
  element: PptdElement,
  theme: { colors?: Record<string, string>; chartColors?: string[] },
): string {
  const width = Math.max(1, element.bounds?.[2] ?? 600);
  const height = Math.max(1, element.bounds?.[3] ?? 320);
  const chart = init(null, undefined, { renderer: 'svg', ssr: true, width, height });
  try {
    chart.setOption(buildChartOption(element, theme));
    return chart.renderToSVGString();
  } finally {
    chart.dispose();
  }
}
