import path from 'node:path';
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import pptxgen from 'pptxgenjs';
import type { Rgba } from '../app/lib/pptx/css';
import { escapeXml } from '../app/lib/pptx/ooxml';
import { ExportFeatureError, elementBounds, exportNumber, exportRecord } from './export-images';
import { chartNumber, chartValue, type NormalizedChart, normalizeChart } from './science-model';
import type { PageSize, PptdElement } from './types';

const RELATIONSHIP = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/';
const CHART_FAMILIES = new Set(['bar', 'line', 'area', 'pie', 'scatter', 'bubble']);
const DEFAULT_COLORS = ['#2d6b61', '#d38a3e', '#647ab0', '#a8688b', '#83a473', '#8e7964'];
type ColorResolver = (value: unknown, alpha?: number) => Rgba;
type Files = Record<string, Uint8Array>;
type NumericColumn = { column: number; values: number[] };

export interface NativeChart {
  install(files: Files, slideNumber: number, id: number): string;
  fonts: string[];
}

function fallback(message: string, code = 'CHART_FAMILY_FALLBACK'): never {
  throw new ExportFeatureError(code, message);
}

function chartData(model: NormalizedChart): {
  data: pptxgen.OptsChartData[];
  columns: NumericColumn[];
} {
  const first = model.series[0];
  if (!model.data.rows.length)
    throw new ExportFeatureError('INVALID_CHART', 'A chart requires at least one data row.');
  if (!CHART_FAMILIES.has(first.type))
    fallback(`The ${first.type} chart retains its verified ECharts appearance as an object image.`);
  const xy = first.type === 'scatter' || first.type === 'bubble';
  const data: pptxgen.OptsChartData[] = [];
  const columns: NumericColumn[] = [];
  let reference: string[] | number[] | undefined;
  for (const [index, series] of model.series.entries()) {
    const values: number[] = [];
    const xs: number[] = [];
    const labels: string[] = [];
    const sizes: number[] = [];
    for (const row of model.data.rows) {
      const value = chartNumber(chartValue(row, series, first.type === 'pie' ? 'value' : 'y'));
      const x = xy ? chartNumber(chartValue(row, series, 'x')) : null;
      if (xy && (x === null || value === null)) continue;
      if (value === null)
        fallback(
          'Missing categorical values are rendered as gaps; they must not become zeros in a workbook.',
          'CHART_GAPS_FALLBACK',
        );
      if (first.type === 'pie' && value < 0)
        throw new ExportFeatureError('INVALID_CHART', 'Pie values must be non-negative.');
      values.push(value);
      if (xy) xs.push(x as number);
      else
        labels.push(String(chartValue(row, series, first.type === 'pie' ? 'category' : 'x') ?? ''));
      if (first.type === 'bubble') {
        const size = chartNumber(chartValue(row, series, 'size'));
        if (size === null || size < 0)
          throw new ExportFeatureError(
            'INVALID_CHART',
            'Bubble sizes must be non-negative numbers.',
          );
        sizes.push(size);
      }
    }
    if (!values.length)
      fallback('The chart contains no paired numeric points.', 'CHART_GAPS_FALLBACK');
    const categories = xy ? xs : labels;
    if (!xy && first.type !== 'pie' && new Set(labels).size !== labels.length)
      fallback(
        'Repeated categorical coordinates require the original chart renderer.',
        'CHART_CATEGORY_FALLBACK',
      );
    if (reference && JSON.stringify(reference) !== JSON.stringify(categories))
      fallback(
        'Series with different x coordinates require the original chart renderer.',
        'CHART_CATEGORY_FALLBACK',
      );
    reference ??= categories;
    if (xy && index === 0) {
      data.push({ name: model.data.cols[series.encode.x ?? 0], values: xs });
      columns.push({ column: 1, values: xs });
    }
    data.push({
      name: series.name,
      values,
      ...(xy ? {} : { labels }),
      ...(sizes.length ? { sizes } : {}),
    });
    const column = first.type === 'bubble' ? 2 + index * 2 : index + 2;
    columns.push({ column, values });
    if (sizes.length) columns.push({ column: column + 1, values: sizes });
  }
  return { data, columns };
}

function columnName(number: number): string {
  let result = '';
  for (let value = number; value > 0; value = Math.floor((value - 1) / 26))
    result = String.fromCharCode(65 + ((value - 1) % 26)) + result;
  return result;
}

function preserveWorkbookValues(files: Files, columns: NumericColumn[]): void {
  const workbooks = Object.keys(files).filter(
    (name) => name.startsWith('ppt/embeddings/') && name.endsWith('.xlsx'),
  );
  if (workbooks.length !== 1)
    throw new Error('The chart writer did not produce one editable workbook.');
  const workbook = unzipSync(files[workbooks[0]]);
  const sheetPath = 'xl/worksheets/sheet1.xml';
  let sheet = strFromU8(workbook[sheetPath]);
  for (const { column, values } of columns) {
    for (const [index, value] of values.entries()) {
      const reference = `${columnName(column)}${index + 2}`;
      const cell = new RegExp(`<c\\b([^>]*\\br="${reference}"[^>]*)>[\\s\\S]*?<\\/c>`);
      if (!cell.test(sheet))
        throw new Error(`The chart workbook is missing numeric cell ${reference}.`);
      // PptxGenJS 4.0.1 writes categorical/bubble zero values as blank cells. Keep data exact when edited in PowerPoint.
      sheet = sheet.replace(
        cell,
        (_match, attributes: string) =>
          `<c${attributes.replace(/\s+t="[^"]*"/, '')}><v>${value}</v></c>`,
      );
    }
  }
  workbook[sheetPath] = strToU8(sheet);
  files[workbooks[0]] = zipSync(workbook);
}

function attributes(xml: string): Record<string, string> {
  return Object.fromEntries(
    [...xml.matchAll(/([A-Za-z_:][\w:.-]*)="([^"]*)"/g)].map((match) => [match[1], match[2]]),
  );
}

function resolvePart(source: string, target: string): string {
  const result = path.posix.normalize(
    target.startsWith('/') ? target.slice(1) : path.posix.join(path.posix.dirname(source), target),
  );
  if (result.startsWith('../') || result.includes('://') || result.includes('\\'))
    throw new Error('The chart writer produced an unsafe package relationship.');
  return result;
}

function relationshipsPath(part: string): string {
  return path.posix.join(path.posix.dirname(part), '_rels', `${path.posix.basename(part)}.rels`);
}

function chartInstaller(source: Files, elementId: string, prefix: string): NativeChart['install'] {
  const slide = strFromU8(source['ppt/slides/slide1.xml']);
  const frame = slide.match(/<p:graphicFrame>[\s\S]*?<\/p:graphicFrame>/)?.[0];
  const sourceId = frame?.match(/<c:chart\b[^>]*\br:id="([^"]+)"/)?.[1];
  const relationship = [
    ...strFromU8(source['ppt/slides/_rels/slide1.xml.rels']).matchAll(/<Relationship\b[^>]*\/>/g),
  ]
    .map((match) => attributes(match[0]))
    .find((entry) => entry.Id === sourceId && entry.Type === `${RELATIONSHIP}chart`);
  if (!frame || !relationship) throw new Error('The native chart package is incomplete.');
  const chartPart = resolvePart('ppt/slides/slide1.xml', relationship.Target);
  const types: Record<string, string>[] = [
    ...strFromU8(source['[Content_Types].xml']).matchAll(/<(Default|Override)\b[^>]*\/>/g),
  ].map((match) => ({ kind: match[1], ...attributes(match[0]) }));
  return (destination, slideNumber, id) => {
    const copied = new Map<string, string>();
    const contentTypes: string[] = [];
    let destinationTypes = strFromU8(destination['[Content_Types].xml']);
    const importPart = (original: string): string => {
      const known = copied.get(original);
      if (known) return known;
      if (!source[original]) throw new Error(`The chart dependency ${original} is missing.`);
      const target = path.posix.join(
        path.posix.dirname(original),
        `${prefix}-${path.posix.basename(original)}`,
      );
      if (destination[target])
        throw new Error(`The chart part ${target} would replace an existing object.`);
      copied.set(original, target);
      destination[target] = source[original];
      const extension = path.posix.extname(original).slice(1);
      const type =
        types.find((entry) => entry.PartName === `/${original}`) ??
        types.find((entry) => entry.Extension === extension);
      if (!type) throw new Error(`The chart dependency ${original} has no content type.`);
      if (type.kind === 'Override')
        contentTypes.push(`<Override PartName="/${target}" ContentType="${type.ContentType}"/>`);
      else if (!new RegExp(`<Default\\b[^>]*Extension="${extension}"`).test(destinationTypes)) {
        const entry = `<Default Extension="${extension}" ContentType="${type.ContentType}"/>`;
        contentTypes.push(entry);
        destinationTypes += entry;
      }
      const relsPath = relationshipsPath(original);
      if (source[relsPath]) {
        const rels = strFromU8(source[relsPath]).replace(/<Relationship\b[^>]*\/>/g, (xml) => {
          const relation = attributes(xml);
          if (relation.TargetMode === 'External')
            throw new Error('Editable charts must embed their data.');
          const dependency = importPart(resolvePart(original, relation.Target));
          const relative = path.posix.relative(path.posix.dirname(target), dependency);
          return xml.replace(/\bTarget="[^"]*"/, `Target="${escapeXml(relative)}"`);
        });
        destination[relationshipsPath(target)] = strToU8(rels);
      }
      return target;
    };
    const nativePart = importPart(chartPart);
    const relsPath = `ppt/slides/_rels/slide${slideNumber}.xml.rels`;
    let rels = strFromU8(destination[relsPath]);
    const assigned = new Set([...rels.matchAll(/\bId="([^"]*)"/g)].map((match) => match[1]));
    let index = 1;
    while (assigned.has(`rId${index}`)) index++;
    const relationshipId = `rId${index}`;
    const target = path.posix.relative('ppt/slides', nativePart);
    rels = rels.replace(
      '</Relationships>',
      `<Relationship Id="${relationshipId}" Type="${RELATIONSHIP}chart" Target="${escapeXml(target)}"/></Relationships>`,
    );
    destination[relsPath] = strToU8(rels);
    destination['[Content_Types].xml'] = strToU8(
      strFromU8(destination['[Content_Types].xml']).replace(
        '</Types>',
        `${contentTypes.join('')}</Types>`,
      ),
    );
    return frame
      .replace(
        /<p:cNvPr\b[^>]*\/>/,
        `<p:cNvPr id="${id}" name="${escapeXml(elementId.slice(0, 200))}"/>`,
      )
      .replace(/(<c:chart\b[^>]*\br:id=")[^"]*"/, `$1${relationshipId}"`);
  };
}

export async function buildNativeChart(
  element: PptdElement,
  theme: Record<string, unknown>,
  color: ColorResolver,
  size: PageSize,
  prefix: string,
): Promise<NativeChart> {
  const [x, y, width, height] = elementBounds(element);
  if (width <= 0 || height <= 0)
    throw new ExportFeatureError('INVALID_CHART', 'Chart dimensions must be positive.');
  const opacity = exportNumber(element.opacity, 1, 'chart.opacity');
  if (opacity < 0 || opacity > 1)
    throw new ExportFeatureError('INVALID_OPACITY', 'Opacity must be between zero and one.');
  if (
    element.rotation ||
    (Array.isArray(element.flip) && element.flip.some(Boolean)) ||
    element.shadow ||
    opacity !== 1
  )
    fallback(
      'Transformed charts retain their verified object appearance.',
      'CHART_TRANSFORM_FALLBACK',
    );
  let model: NormalizedChart;
  try {
    model = normalizeChart(element);
  } catch (error) {
    throw new ExportFeatureError(
      'INVALID_CHART',
      error instanceof Error ? error.message : String(error),
    );
  }
  const { data, columns } = chartData(model);
  const first = model.series[0];
  const stacks = model.series.map((series) =>
    typeof series.source.stack === 'string' ? series.source.stack : '',
  );
  const stacked = stacks.some(Boolean);
  if (
    stacked &&
    (new Set(stacks).size !== 1 ||
      model.series.some((series) => series.type !== first.type) ||
      first.type !== 'bar')
  )
    fallback(
      'This stack configuration requires the original chart renderer.',
      'CHART_STACK_FALLBACK',
    );
  if (model.horizontal && model.series.some((series) => series.type !== 'bar'))
    fallback(
      'Horizontal line and area charts retain their original orientation.',
      'CHART_DIRECTION_FALLBACK',
    );
  const themeColors = exportRecord(theme.colors);
  const palette =
    Array.isArray(element.colors) && element.colors.length
      ? element.colors
      : Array.isArray(theme.chartColors) && theme.chartColors.length
        ? theme.chartColors
        : DEFAULT_COLORS.map((value, index) => themeColors[`accent${index + 1}`] ?? value);
  const hex = (value: unknown) => {
    const rgba = color(value);
    if (rgba.a !== 1)
      fallback('Transparent chart colors require rendered export.', 'CHART_COLOR_FALLBACK');
    return [rgba.r, rgba.g, rgba.b]
      .map((channel) => Math.round(channel).toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase();
  };
  const fontSize =
    typeof element.fontSize === 'number' ? Math.max(6, Math.min(80, element.fontSize)) : 13;
  const fontFace =
    typeof element.fontFamily === 'string' && element.fontFamily.trim()
      ? element.fontFamily
          .split(',')[0]
          .trim()
          .replace(/^['"]|['"]$/g, '')
      : 'Arial';
  const axisColor = hex(themeColors.text ?? '#46534e');
  const axis = (value: unknown) => exportRecord(Array.isArray(value) ? value[0] : value);
  const xAxis = axis(model.axesSwapped ? element.yAxis : element.xAxis);
  const yAxis = axis(model.axesSwapped ? element.xAxis : element.yAxis);
  const label = (value: unknown) =>
    typeof value === 'string' ? value : String(exportRecord(value).text ?? '');
  const axisTitle = (value: Record<string, unknown>) => label(value.title ?? value.name);
  const finite = (value: unknown) =>
    typeof value === 'number' && Number.isFinite(value) ? value : undefined;
  const options: pptxgen.IChartOpts = {
    x: x / 72,
    y: y / 72,
    w: width / 72,
    h: height / 72,
    showLegend: model.legend,
    legendPos: 'b',
    legendFontFace: fontFace,
    legendFontSize: Math.max(9, fontSize - 1),
    legendColor: hex(themeColors.text ?? '#263531'),
    showTitle: !!model.title,
    title: model.title,
    titleFontFace: fontFace,
    titleFontSize: fontSize + 3,
    titleBold: true,
    titleColor: hex(themeColors.text ?? '#263531'),
    showValue: model.dataLabels,
    showLabel: first.type === 'pie' && model.dataLabels,
    showPercent: false,
    showSerName: false,
    dataLabelFormatCode: 'General',
    dataLabelPosition:
      first.type === 'pie' ? 'bestFit' : first.type === 'bar' ? (stacked ? 'ctr' : 'outEnd') : 't',
    dataLabelColor: hex(themeColors.text ?? '#263531'),
    dataLabelFontFace: fontFace,
    dataLabelFontSize: fontSize,
    chartColors:
      first.type === 'pie'
        ? palette.map(hex)
        : model.series.map((series, index) =>
            hex(series.source.color ?? palette[index % palette.length]),
          ),
    chartArea: { fill: { color: 'FFFFFF', transparency: 100 }, roundedCorners: false },
    plotArea: { fill: { color: 'FFFFFF', transparency: 100 } },
    showCatAxisTitle: !!axisTitle(xAxis),
    catAxisTitle: axisTitle(xAxis),
    catAxisTitleColor: axisColor,
    catAxisTitleFontFace: fontFace,
    catAxisTitleFontSize: fontSize,
    showValAxisTitle: !!axisTitle(yAxis),
    valAxisTitle: axisTitle(yAxis),
    valAxisTitleColor: axisColor,
    valAxisTitleFontFace: fontFace,
    valAxisTitleFontSize: fontSize,
    catAxisLabelColor: axisColor,
    catAxisLabelFontFace: fontFace,
    catAxisLabelFontSize: fontSize,
    valAxisLabelColor: axisColor,
    valAxisLabelFontFace: fontFace,
    valAxisLabelFontSize: fontSize,
    catAxisLineColor: '9BA7A1',
    catAxisLineShow: true,
    catAxisLineSize: 0.75,
    valAxisLineColor: '9BA7A1',
    valAxisLineShow: true,
    valAxisLineSize: 0.75,
    catAxisMajorTickMark: 'none',
    valAxisMajorTickMark: 'none',
    catAxisMinVal: finite(xAxis.min),
    catAxisMaxVal: finite(xAxis.max),
    valAxisMinVal: finite(yAxis.min),
    valAxisMaxVal: finite(yAxis.max),
    catGridLine: {
      style: ['scatter', 'bubble'].includes(first.type) && xAxis.grid !== false ? 'solid' : 'none',
      color: 'E7EBE8',
      size: 0.75,
    },
    valGridLine: { style: yAxis.grid === false ? 'none' : 'solid', color: 'E7EBE8', size: 0.75 },
    valAxisLabelFormatCode: 'General',
    barDir: model.horizontal ? 'bar' : 'col',
    barGrouping: stacked ? 'stacked' : 'clustered',
    barOverlapPct: stacked ? 100 : 0,
    lineDataSymbol: first.source.showSymbol === false ? 'none' : 'circle',
    lineDataSymbolSize: first.type === 'scatter' ? 9 : 6,
    lineSmooth: first.source.smooth === true,
    lineSize: ['scatter', 'bubble'].includes(first.type) ? 0 : 2,
    displayBlanksAs: 'gap',
  };
  const pptx = new pptxgen();
  pptx.defineLayout({ name: 'PPTD', width: size[0] / 72, height: size[1] / 72 });
  pptx.layout = 'PPTD';
  const slide = pptx.addSlide();
  let type = first.type as pptxgen.CHART_NAME;
  if (first.type === 'pie') {
    const inner = Number(first.source.innerRadius ?? 0);
    if (inner > 0) {
      type = 'doughnut';
      const holeSize = (Math.min(65, inner <= 1 ? inner * 100 : inner) / 72) * 100;
      if (holeSize < 10)
        fallback(
          'Very small doughnut holes require the original renderer.',
          'CHART_STYLE_FALLBACK',
        );
      options.holeSize = Math.round(Math.min(90, holeSize));
    }
  }
  const combo =
    new Set(
      model.series.map(
        (series) =>
          `${series.type}:${series.source.smooth === true}:${series.source.showSymbol !== false}`,
      ),
    ).size > 1;
  if (combo && ['bar', 'line', 'area'].includes(first.type)) {
    if (stacked)
      fallback('Stacked mixed-style charts use the original renderer.', 'CHART_STACK_FALLBACK');
    // The documented two-argument mixed-chart overload is missing from PptxGenJS 4.0.1 typings.
    const addMixedChart = slide.addChart.bind(slide) as unknown as (
      charts: pptxgen.IChartMulti[],
      options: pptxgen.IChartOpts,
    ) => void;
    addMixedChart(
      model.series.map((series, index) => ({
        type: series.type as pptxgen.CHART_NAME,
        data: [data[index]],
        options: {
          chartColors: [options.chartColors?.[index] ?? '2D6B61'],
          chartColorsOpacity: series.type === 'area' ? 25 : 100,
          dataLabelPosition:
            series.type === 'bar' ? 'outEnd' : series.type === 'line' ? 't' : undefined,
          lineSmooth: series.source.smooth === true,
          lineDataSymbol: series.source.showSymbol === false ? 'none' : 'circle',
        },
      })),
      options,
    );
  } else {
    if (first.type === 'area') options.chartColorsOpacity = 25;
    slide.addChart(type, data, options);
  }
  const bytes = await pptx.write({ outputType: 'uint8array', compression: true });
  if (!(bytes instanceof Uint8Array))
    throw new Error('The native chart writer returned an unexpected payload.');
  const files = unzipSync(bytes);
  preserveWorkbookValues(files, columns);
  return { install: chartInstaller(files, element.elementId, prefix), fonts: [fontFace] };
}
