import { useEffect, useRef, useState } from 'react';
import {
  type IconStyle,
  type ScientificIcon,
  searchScientificIcons,
} from '../../../pptd/icon-registry';
import {
  CHART_CHANNELS,
  CHART_LABELS,
  CHART_TYPES,
  type ChartType,
  chartDataText,
  chartSeriesForType,
  normalizeChart,
  parseChartDataText,
} from '../../../pptd/science-model';
import {
  changeTableSize,
  editTableCell,
  mergeTableCells,
  splitTableCell,
} from '../../../pptd/table-edit';
import { tableLayout } from '../../../pptd/table-grid';
import type { PptdElement } from '../../../pptd/types';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { NumberField, StringField } from './property-fields';
import { type PptdTheme, record, resolveColor, textValue } from './renderer';
import { IconSvg } from './science-renderer';

type Props = {
  element: PptdElement;
  theme: PptdTheme;
  disabled: boolean;
  onPatch: (fields: Record<string, unknown>, autosave?: boolean) => void;
  onBegin: () => void;
  onEnd: () => void;
};

function checkbox(
  label: string,
  value: boolean,
  disabled: boolean,
  onChange: (value: boolean) => void,
) {
  return (
    <label className="flex items-center gap-2 text-xs">
      <input
        type="checkbox"
        checked={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      {label}
    </label>
  );
}

export interface ChartDataDraft {
  value: string;
  baseRevision: string;
}

export function ChartProperties({
  element,
  theme,
  disabled,
  onPatch,
  onBegin,
  onEnd,
  draft: savedDraft,
  onDraftChange,
}: Props & { draft?: ChartDataDraft; onDraftChange?: (draft: ChartDataDraft | null) => void }) {
  const data = record(element.data);
  const cols = Array.isArray(data.cols) ? data.cols.map(String) : [];
  const series = Array.isArray(element.series) ? element.series.map(record) : [];
  let horizontal = element.direction === 'horizontal';
  try {
    horizontal = normalizeChart(element).horizontal;
  } catch {
    /* Invalid source remains editable. */
  }
  const [draft, setDraft] = useState(savedDraft?.value ?? '');
  const [error, setError] = useState<string | null>(null);
  const focused = useRef(false);
  const dirty = useRef(!!savedDraft);
  const base = useRef(savedDraft?.baseRevision ?? JSON.stringify(element.data));
  useEffect(() => {
    if (savedDraft) {
      dirty.current = true;
      base.current = savedDraft.baseRevision;
      if (!focused.current) setDraft(savedDraft.value);
      return;
    }
    if (focused.current || dirty.current) return;
    base.current = JSON.stringify(element.data);
    try {
      setDraft(chartDataText(element.data));
    } catch {
      setDraft('x\ty\nA\t1\nB\t2');
    }
  }, [element.data, savedDraft]);
  const field = (label: string, value: string, set: (text: string) => Record<string, unknown>) => (
    <StringField
      label={label}
      value={value}
      disabled={disabled}
      onBegin={onBegin}
      onEnd={onEnd}
      onCommit={(text) => onPatch(set(text), false)}
    />
  );
  const updateSeries = (index: number, value: Record<string, unknown>) =>
    onPatch({ series: series.map((item, position) => (position === index ? value : item)) });
  return (
    <div className="space-y-3">
      {field(
        '图表标题',
        typeof element.title === 'string' ? element.title : textValue(record(element.title).text),
        (text) => ({
          title: typeof element.title === 'string' ? text : { ...record(element.title), text },
        }),
      )}
      <div className="grid grid-cols-2 gap-3">
        <NumberField
          label="图表字号"
          min={6}
          max={80}
          value={Number(element.fontSize ?? 13)}
          disabled={disabled}
          onBegin={onBegin}
          onEnd={onEnd}
          onCommit={(fontSize) => onPatch({ fontSize }, false)}
        />
        {field('图表字体', String(element.fontFamily ?? 'Arial'), (fontFamily) => ({ fontFamily }))}
      </div>
      <div className="flex flex-wrap gap-3">
        {checkbox(
          '图例',
          element.legend !== false && record(element.legend).show !== false,
          disabled,
          (show) =>
            onPatch({
              legend:
                typeof element.legend === 'object' ? { ...record(element.legend), show } : show,
            }),
        )}
        {['bar', 'line', 'area'].includes(String(series[0]?.type)) &&
          checkbox('横向坐标', horizontal, disabled, (horizontal) =>
            onPatch({ direction: horizontal ? 'horizontal' : 'vertical' }),
          )}
        {checkbox(
          '数据标签',
          element.dataLabels === true || record(element.dataLabels).show === true,
          disabled,
          (show) =>
            onPatch({
              dataLabels:
                typeof element.dataLabels === 'object'
                  ? { ...record(element.dataLabels), show }
                  : show,
            }),
        )}
      </div>
      {series.map((item, index) => {
        const type = CHART_TYPES.includes(item.type as ChartType)
          ? (item.type as ChartType)
          : 'bar';
        const encode = record(item.encode);
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: PPTD series are an ordered array without persistent IDs; its fields commit on blur before reordering.
          <fieldset key={`series-${index}`} className="space-y-2 rounded border border-border p-2">
            <legend className="px-1 text-[11px] text-muted-foreground">Series {index + 1}</legend>
            <label className="flex items-center justify-between gap-2 text-xs">
              类型
              <select
                aria-label={`Series ${index + 1} type`}
                className="max-w-40 rounded border bg-background px-1 py-1"
                value={type}
                disabled={disabled}
                onChange={(event) =>
                  updateSeries(
                    index,
                    chartSeriesForType(item, event.target.value as ChartType, cols),
                  )
                }
              >
                {CHART_TYPES.map((chart) => (
                  <option
                    key={chart}
                    value={chart}
                    disabled={
                      series.length > 1 &&
                      (['bar', 'line', 'area'].includes(type)
                        ? !['bar', 'line', 'area'].includes(chart)
                        : chart !== type)
                    }
                  >
                    {CHART_LABELS[chart]}
                  </option>
                ))}
              </select>
            </label>
            {field(`Series ${index + 1} name`, textValue(item.name, cols[1] ?? ''), (name) => ({
              series: series.map((entry, position) =>
                position === index ? { ...entry, name } : entry,
              ),
            }))}
            {CHART_CHANNELS[type].map((channel, channelIndex) => (
              <label
                key={channel}
                className="flex items-center justify-between gap-2 text-xs text-muted-foreground"
              >
                {channel}
                <select
                  aria-label={`Series ${index + 1} ${channel}`}
                  className="max-w-36 rounded border bg-background px-1 py-1 text-foreground"
                  value={
                    typeof encode[channel] === 'number'
                      ? cols[encode[channel] as number]
                      : String(encode[channel] ?? cols[channelIndex] ?? '')
                  }
                  disabled={disabled}
                  onChange={(event) =>
                    updateSeries(index, {
                      ...item,
                      encode: { ...encode, [channel]: event.target.value },
                    })
                  }
                >
                  <option value="">选择数据列</option>
                  {cols.map((col) => (
                    <option key={col} value={col}>
                      {col}
                    </option>
                  ))}
                </select>
              </label>
            ))}
            {['bar', 'line', 'area', 'scatter', 'bubble', 'radar'].includes(type) && (
              <label className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                系列颜色
                <input
                  type="color"
                  aria-label={`Series ${index + 1} color`}
                  disabled={disabled}
                  value={hex(
                    resolveColor(
                      item.color,
                      theme,
                      ['#2d6b61', '#d38a3e', '#647ab0', '#a8688b', '#83a473', '#8e7964'][index % 6],
                    ),
                  )}
                  onChange={(event) =>
                    updateSeries(index, {
                      ...item,
                      color: event.target.value,
                      [['line', 'area', 'radar'].includes(type) ? 'lineColor' : 'fill']:
                        event.target.value,
                    })
                  }
                />
              </label>
            )}
            {type === 'pie' && (
              <NumberField
                label="环形内径 %"
                min={0}
                max={65}
                value={
                  Number(item.innerRadius ?? 0) * (Number(item.innerRadius ?? 0) <= 1 ? 100 : 1)
                }
                disabled={disabled}
                onBegin={onBegin}
                onEnd={onEnd}
                onCommit={(value) =>
                  onPatch(
                    {
                      series: series.map((entry, position) =>
                        position === index ? { ...entry, innerRadius: value / 100 } : entry,
                      ),
                    },
                    false,
                  )
                }
              />
            )}
            {series.length > 1 && (
              <Button
                size="xs"
                variant="ghost"
                disabled={disabled}
                onClick={() =>
                  onPatch({ series: series.filter((_, position) => position !== index) })
                }
              >
                移除此系列
              </Button>
            )}
          </fieldset>
        );
      })}
      <Button
        size="xs"
        variant="outline"
        disabled={
          disabled ||
          !cols.length ||
          series.length >= 50 ||
          (series[0] &&
            !['bar', 'line', 'area', 'scatter', 'bubble', 'radar'].includes(String(series[0].type)))
        }
        onClick={() =>
          onPatch({
            series: [
              ...series,
              chartSeriesForType({}, (series[0]?.type ?? 'bar') as ChartType, cols),
            ],
          })
        }
      >
        添加数据系列
      </Button>
      {(['xAxis', 'yAxis'] as const).map((axis) => {
        const input = Array.isArray(element[axis]) ? (element[axis] as unknown[]) : null;
        const first = record(input ? input[0] : element[axis]);
        return (
          <div key={axis} className="space-y-2">
            {field(
              axis === 'xAxis' ? 'X 轴标题 / 单位' : 'Y 轴标题 / 单位',
              textValue(first.title, textValue(record(first.title).text, textValue(first.name))),
              (title) => ({
                [axis]: input ? [{ ...first, title }, ...input.slice(1)] : { ...first, title },
              }),
            )}
            <div className="grid grid-cols-2 gap-3">
              {(['min', 'max'] as const).map((limit) => (
                <StringField
                  key={limit}
                  label={`${axis === 'xAxis' ? 'X' : 'Y'} 轴${limit === 'min' ? '最小值' : '最大值'}`}
                  value={typeof first[limit] === 'number' ? String(first[limit]) : ''}
                  disabled={disabled}
                  onBegin={onBegin}
                  onEnd={onEnd}
                  onCommit={(value) => {
                    const next = { ...first };
                    if (!value.trim()) delete next[limit];
                    else if (Number.isFinite(Number(value))) next[limit] = Number(value);
                    else {
                      setError('坐标轴范围需要数字，留空为自动。');
                      return;
                    }
                    if (
                      typeof next.min === 'number' &&
                      typeof next.max === 'number' &&
                      next.min >= next.max
                    ) {
                      setError('坐标轴最小值必须小于最大值。');
                      return;
                    }
                    onPatch({ [axis]: input ? [next, ...input.slice(1)] : next }, false);
                    setError(null);
                  }}
                />
              ))}
            </div>
            {checkbox(
              `${axis === 'xAxis' ? 'X' : 'Y'} 轴网格线`,
              first.grid !== false,
              disabled,
              (grid) =>
                onPatch({
                  [axis]: input ? [{ ...first, grid }, ...input.slice(1)] : { ...first, grid },
                }),
            )}
          </div>
        );
      })}
      <label
        htmlFor={`hd-chart-data-${element.elementId}`}
        className="block space-y-1 text-xs text-muted-foreground"
      >
        <span>数据表（可粘贴 Excel / TSV / CSV）</span>
        <Textarea
          id={`hd-chart-data-${element.elementId}`}
          aria-label="Chart data"
          className="min-h-40 whitespace-pre font-mono text-[11px]"
          value={draft}
          disabled={disabled}
          onFocus={() => {
            focused.current = true;
          }}
          onBlur={() => {
            focused.current = false;
          }}
          onChange={(event) => {
            dirty.current = true;
            setDraft(event.target.value);
            onDraftChange?.({ value: event.target.value, baseRevision: base.current });
          }}
        />
      </label>
      <p className="text-[11px] text-muted-foreground">
        第一行为列名。修改数据后点击应用；空单元格保持缺失值。
        {dirty.current ? ' 当前数据草稿尚未应用。' : ''}
      </p>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
      <Button
        size="sm"
        disabled={disabled}
        onClick={() => {
          try {
            if (base.current !== JSON.stringify(element.data))
              throw new Error(
                '图表数据已被其他编辑更新。保留当前草稿，或点击“读取当前数据”后再修改。',
              );
            const next = parseChartDataText(draft);
            const nextData = { ...data, ...next };
            const updated = series.map((item) => {
              const type = CHART_TYPES.includes(item.type as ChartType)
                ? (item.type as ChartType)
                : 'bar';
              const old = record(item.encode);
              const encode = Object.fromEntries(
                Object.entries(old).map(([key, value]) => [
                  key,
                  typeof value === 'string' && !next.cols.includes(value)
                    ? (next.cols[cols.indexOf(value)] ?? value)
                    : value,
                ]),
              );
              return chartSeriesForType({ ...item, encode }, type, next.cols);
            });
            onBegin();
            onPatch(
              {
                data: nextData,
                series: updated.length ? updated : [chartSeriesForType({}, 'bar', next.cols)],
              },
              false,
            );
            onEnd();
            dirty.current = false;
            base.current = JSON.stringify(nextData);
            onDraftChange?.(null);
            setError(null);
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : String(cause));
          }
        }}
      >
        应用图表数据
      </Button>
      <Button
        size="xs"
        variant="ghost"
        onClick={() => {
          try {
            setDraft(chartDataText(element.data));
            dirty.current = false;
            base.current = JSON.stringify(element.data);
            onDraftChange?.(null);
            setError(null);
          } catch (cause) {
            setError(String(cause));
          }
        }}
      >
        读取当前数据
      </Button>
    </div>
  );
}

export function TableProperties({ element, theme, disabled, onPatch, onBegin, onEnd }: Props) {
  const [cell, setCell] = useState({ row: 0, column: 0 });
  const [end, setEnd] = useState({ row: 0, column: 1 });
  const [error, setError] = useState<string | null>(null);
  let layout: ReturnType<typeof tableLayout>;
  try {
    layout = tableLayout(element);
  } catch (cause) {
    return (
      <p role="alert" className="text-xs text-destructive">
        {String(cause)}
      </p>
    );
  }
  const selected = {
    row: Math.min(cell.row, layout.grid.length - 1),
    column: Math.min(cell.column, layout.colCount - 1),
  };
  const slot = layout.grid[selected.row]?.[selected.column];
  const owner = slot?.owner ?? selected;
  const value = layout.grid[owner.row]?.[owner.column]?.cell ?? {};
  const commit = (operation: () => object) => {
    try {
      const result = operation();
      onBegin();
      onPatch({ ...result }, false);
      onEnd();
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  };
  const chooser = (
    label: string,
    count: number,
    current: number,
    onChange: (position: number) => void,
  ) => (
    <label className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
      {label}
      <select
        aria-label={label}
        disabled={disabled}
        value={Math.min(Math.max(current, 0), count - 1)}
        onChange={(event) => onChange(Number(event.target.value))}
        className="min-w-0 flex-1 rounded border bg-background py-1 text-foreground"
      >
        {Array.from({ length: count }, (_, index) => (
          <option key={String(index)} value={index}>
            {index + 1}
          </option>
        ))}
      </select>
    </label>
  );
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {chooser('选择行', layout.grid.length, selected.row, (row) =>
          setCell({ ...selected, row }),
        )}
        {chooser('选择列', layout.colCount, selected.column, (column) =>
          setCell({ ...selected, column }),
        )}
      </div>
      <div className="grid grid-cols-2 gap-1">
        <Button
          size="xs"
          variant="outline"
          disabled={disabled}
          onClick={() => commit(() => changeTableSize(element, 'row', selected.row + 1, 'insert'))}
        >
          在下方插入行
        </Button>
        <Button
          size="xs"
          variant="outline"
          disabled={disabled}
          onClick={() =>
            commit(() => changeTableSize(element, 'column', selected.column + 1, 'insert'))
          }
        >
          在右侧插入列
        </Button>
        <Button
          size="xs"
          variant="ghost"
          disabled={disabled || layout.grid.length <= 1}
          onClick={() => commit(() => changeTableSize(element, 'row', selected.row, 'remove'))}
        >
          删除此行
        </Button>
        <Button
          size="xs"
          variant="ghost"
          disabled={disabled || layout.colCount <= 1}
          onClick={() =>
            commit(() => changeTableSize(element, 'column', selected.column, 'remove'))
          }
        >
          删除此列
        </Button>
      </div>
      <div className="rounded border border-border p-2 space-y-2">
        <p className="text-xs">
          单元格 R{owner.row + 1} C{owner.column + 1}
        </p>
        <div className="flex items-center justify-between gap-2 text-xs">
          <Button
            size="xs"
            variant={value.bold ? 'secondary' : 'outline'}
            disabled={disabled}
            onClick={() =>
              commit(() =>
                editTableCell(element, selected.row, selected.column, { bold: !value.bold }),
              )
            }
          >
            粗体
          </Button>
          <label className="flex items-center gap-2">
            填色
            <input
              type="color"
              aria-label="单元格填色"
              disabled={disabled}
              value={hex(
                resolveColor(
                  typeof value.fill === 'string' ? value.fill : record(value.fill).color,
                  theme,
                  '#ffffff',
                ),
              )}
              onChange={(event) =>
                commit(() =>
                  editTableCell(element, selected.row, selected.column, {
                    fill: event.target.value,
                  }),
                )
              }
            />
          </label>
        </div>
        <NumberField
          label="单元格字号"
          value={Number(value.fontSize ?? 14)}
          min={6}
          max={120}
          disabled={disabled}
          onBegin={onBegin}
          onEnd={onEnd}
          onCommit={(fontSize) =>
            onPatch(
              { ...editTableCell(element, selected.row, selected.column, { fontSize }) },
              false,
            )
          }
        />
        <NumberField
          label="列宽 %"
          value={layout.columnRatios[selected.column] * 100}
          min={1}
          max={layout.colCount === 1 ? 100 : 99}
          disabled={disabled || layout.colCount === 1}
          onBegin={onBegin}
          onEnd={onEnd}
          onCommit={(value) => {
            const ratio = value / 100;
            const old = layout.columnRatios[selected.column];
            onPatch(
              {
                columnWidths: layout.columnRatios.map((width, index) =>
                  index === selected.column ? ratio : (width * (1 - ratio)) / (1 - old),
                ),
              },
              false,
            );
          }}
        />
        <p className="text-[11px] text-muted-foreground">合并范围：从当前单元格到</p>
        <div className="grid grid-cols-2 gap-2">
          {chooser('终止行', layout.grid.length, end.row, (row) => setEnd({ ...end, row }))}
          {chooser('终止列', layout.colCount, end.column, (column) => setEnd({ ...end, column }))}
        </div>
        <div className="flex gap-2">
          <Button
            size="xs"
            variant="outline"
            disabled={disabled}
            onClick={() =>
              commit(() =>
                mergeTableCells(element, selected, {
                  row: Math.min(end.row, layout.grid.length - 1),
                  column: Math.min(end.column, layout.colCount - 1),
                }),
              )
            }
          >
            合并单元格
          </Button>
          <Button
            size="xs"
            variant="outline"
            disabled={
              disabled || !(Number(value.rowSpan ?? 1) > 1 || Number(value.colSpan ?? 1) > 1)
            }
            onClick={() => commit(() => splitTableCell(element, selected.row, selected.column))}
          >
            拆分单元格
          </Button>
        </div>
      </div>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
      <div className="max-h-72 space-y-2 overflow-y-auto">
        {layout.grid.flatMap((slots) =>
          slots.map((entry) => {
            if (
              entry.covered ||
              (layout.grid.length * layout.colCount > 64 && entry.row !== selected.row)
            )
              return null;
            return (
              <StringField
                key={`${entry.row}:${entry.column}`}
                label={`R${entry.row + 1} C${entry.column + 1}`}
                value={textValue(entry.cell?.text)}
                disabled={disabled}
                onBegin={onBegin}
                onEnd={onEnd}
                onCommit={(text) =>
                  onPatch({ ...editTableCell(element, entry.row, entry.column, { text }) }, false)
                }
              />
            );
          }),
        )}
      </div>
      {layout.grid.length * layout.colCount > 64 && (
        <p className="text-[11px] text-muted-foreground">显示选中行的内容。通过上方选择行切换。</p>
      )}
    </div>
  );
}

function hex(color: string) {
  return /^#[0-9a-f]{6}$/i.test(color) ? color : '#315e50';
}

export function IconProperties({ element, theme, disabled, onPatch, onBegin, onEnd }: Props) {
  const [query, setQuery] = useState('');
  const [prefix, setPrefix] = useState<IconStyle>('fas');
  const [icons, setIcons] = useState<ScientificIcon[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    void searchScientificIcons(query, prefix)
      .then((found) => {
        if (active) {
          setIcons(found);
          setError(null);
        }
      })
      .catch((cause: unknown) => {
        if (active) setError(String(cause));
      });
    return () => {
      active = false;
    };
  }, [query, prefix]);
  return (
    <div className="space-y-3">
      <StringField
        label="图标名称"
        value={textValue(element.iconName)}
        disabled={disabled}
        onBegin={onBegin}
        onEnd={onEnd}
        onCommit={(iconName) => onPatch({ iconName }, false)}
      />
      <label className="flex items-center justify-between text-xs">
        颜色
        <input
          aria-label="图标颜色"
          type="color"
          value={hex(resolveColor(record(element.fill).color, theme, '#315e50'))}
          disabled={disabled}
          onChange={(event) => onPatch({ fill: { type: 'solid', color: event.target.value } })}
        />
      </label>
      <label className="flex items-center justify-between text-xs">
        图标集
        <select
          aria-label="图标集"
          value={prefix}
          onChange={(event) => setPrefix(event.target.value as IconStyle)}
          className="rounded border bg-background px-2 py-1"
        >
          <option value="fas">Solid</option>
          <option value="far">Regular</option>
          <option value="fab">Brands</option>
        </select>
      </label>
      <Input
        aria-label="搜索图标"
        placeholder="Search: arrow, book, flask…"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
      <div className="grid max-h-60 grid-cols-6 gap-1 overflow-y-auto">
        {icons.map((icon) => (
          <button
            key={`${icon.prefix}:${icon.name}`}
            type="button"
            title={icon.name}
            aria-label={`选择图标 ${icon.prefix}:${icon.name}`}
            disabled={disabled}
            className="size-8 rounded border border-border p-1.5 text-foreground hover:bg-muted disabled:opacity-50"
            onClick={() => onPatch({ iconName: `${icon.prefix}:${icon.name}` })}
          >
            <IconSvg icon={icon} />
          </button>
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground">
        Font Awesome Free · 搜索英文名称，可离线使用。
      </p>
    </div>
  );
}
