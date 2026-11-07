import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDownToLine,
  ArrowUpToLine,
  Bold,
  Italic,
  Layers2,
  Trash2,
} from 'lucide-react';
import type { ReactNode } from 'react';
import type { Alignment } from '@/lib/inspector/geometry';
import { cn } from '@/lib/utils';
import { groupChildren } from '../../../pptd/grouping';
import { SHAPE_PRESETS } from '../../../pptd/shape-presets';
import type { PageSnapshot, PptdElement } from '../../../pptd/types';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { NumberField, StringField } from './property-fields';
import {
  numberValue,
  type PptdTheme,
  record,
  resolveColor,
  textContent,
  textValue,
} from './renderer';
import {
  type ChartDataDraft,
  ChartProperties,
  IconProperties,
  TableProperties,
} from './science-inspector';

export { NumberField } from './property-fields';

type Props = {
  page: PageSnapshot;
  theme: PptdTheme;
  selectedIds: string[];
  disabled: boolean;
  onSelect: (ids: string[]) => void;
  onPatch: (elementId: string, fields: Record<string, unknown>, autosave?: boolean) => void;
  onBegin: () => void;
  onEnd: () => void;
  onComposition: (composing: boolean) => void;
  onAlign: (alignment: Alignment) => void;
  onLayer: (direction: 'front' | 'back') => void;
  onRemove: () => void;
  onGroup?: () => void;
  onUngroup?: () => void;
  chartDrafts?: Record<string, ChartDataDraft>;
  onChartDraftChange?: (pageId: string, elementId: string, draft: ChartDataDraft | null) => void;
  children?: ReactNode;
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3 border-b border-border px-4 py-4">
      <h3 className="eyebrow">{title}</h3>
      {children}
    </section>
  );
}

export function PptdInspector({
  page,
  theme: inheritedTheme,
  selectedIds,
  disabled,
  onSelect,
  onPatch,
  onBegin,
  onEnd,
  onComposition,
  onAlign,
  onLayer,
  onRemove,
  onGroup,
  onUngroup,
  chartDrafts,
  onChartDraftChange,
  children,
}: Props) {
  const theme =
    page.metadata.themeOverride &&
    typeof page.metadata.themeOverride === 'object' &&
    !Array.isArray(page.metadata.themeOverride)
      ? (page.metadata.themeOverride as PptdTheme)
      : inheritedTheme;
  const selected = page.data.elements.filter((element) => selectedIds.includes(element.elementId));
  const element = selected.length === 1 ? selected[0] : undefined;
  const content = element ? textContent(element, theme) : {};
  const bounds = element?.bounds ?? [0, 0, 120, 50];
  const patch = (fields: Record<string, unknown>, autosave = true) => {
    if (element) onPatch(element.elementId, fields, autosave);
  };
  const number = (
    label: string,
    value: number,
    fields: (value: number) => Record<string, unknown>,
    options: { min?: number; max?: number; step?: number } = {},
  ) => (
    <NumberField
      label={label}
      value={value}
      disabled={disabled}
      onBegin={onBegin}
      onEnd={onEnd}
      onCommit={(next) => patch(fields(next), false)}
      {...options}
    />
  );
  const string = (label: string, value: string, field: string) => (
    <StringField
      label={label}
      value={value}
      disabled={disabled}
      onBegin={onBegin}
      onEnd={onEnd}
      onCommit={(next) => patch({ [field]: next }, false)}
    />
  );
  const overrides = element
    ? Object.values(page.metadata.components ?? {}).flatMap((binding) =>
        Object.entries(binding.slots)
          .filter(([, id]) => id === element.elementId)
          .flatMap(([slot]) => binding.overrides[slot] ?? []),
      )
    : [];
  return (
    <aside
      className="flex h-full w-72 shrink-0 flex-col overflow-y-auto border-l border-border bg-background"
      aria-label="对象属性"
      data-hd-inspector
    >
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-border px-4">
        <h2 className="text-sm font-medium">{selected.length ? '对象属性' : '页面与图层'}</h2>
        <span className="folio">
          {selected.length ? `已选 ${selected.length} 项` : (page.shortCode ?? '只读')}
        </span>
      </div>
      {element && (
        <>
          <Section title="位置与尺寸">
            <p className="break-words text-xs font-medium" title={`对象 ID：${element.elementId}`}>
              {layerTitle(element)}
            </p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-2">
              {(['X', 'Y', '宽度', '高度'] as const).map((label, index) => (
                <div key={label}>
                  {number(
                    label,
                    bounds[index],
                    (value) => ({
                      bounds: bounds.map((current, i) => (i === index ? value : current)),
                    }),
                    index > 1 ? { min: 1 } : {},
                  )}
                </div>
              ))}
              {number('旋转', numberValue(element.rotation, 0), (rotation) => ({ rotation }))}
              {element.elementType !== 'group' &&
                number(
                  '透明度',
                  numberValue(element.opacity, 1) * 100,
                  (opacity) => ({ opacity: opacity / 100 }),
                  { min: 0, max: 100 },
                )}
            </div>
            {overrides.length > 0 && (
              <p className="rounded bg-brand-soft px-2 py-1.5 text-[11px] text-foreground">
                保留手动调整 · {[...new Set(overrides)].join(' · ')}
              </p>
            )}
          </Section>
          {element.elementType === 'text' && (
            <Section title="文字">
              {string('字体', textValue(content.fontFamily, 'MiSans'), 'content.fontFamily')}
              <div className="grid grid-cols-2 gap-3">
                {number(
                  '字号',
                  numberValue(content.fontSize, 18),
                  (fontSize) => ({ 'content.fontSize': fontSize }),
                  { min: 1, max: 400 },
                )}
                {number(
                  '行距',
                  numberValue(content.lineHeight, 1),
                  (lineHeight) => ({ 'content.lineHeight': lineHeight }),
                  { min: 0.1, max: 10, step: 0.1 },
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant={content.bold ? 'secondary' : 'ghost'}
                  size="icon-sm"
                  aria-label="整段加粗"
                  disabled={disabled}
                  onClick={() => patch({ 'content.bold': !content.bold })}
                >
                  <Bold />
                </Button>
                <Button
                  variant={content.italic ? 'secondary' : 'ghost'}
                  size="icon-sm"
                  aria-label="整段斜体"
                  disabled={disabled}
                  onClick={() => patch({ 'content.italic': !content.italic })}
                >
                  <Italic />
                </Button>
                <span className="mx-1 h-4 w-px bg-border" />
                {(
                  [
                    ['left', '文字左对齐', AlignLeft],
                    ['center', '文字居中', AlignCenter],
                    ['right', '文字右对齐', AlignRight],
                  ] as const
                ).map(([align, label, Icon]) => (
                  <Button
                    key={align}
                    variant="ghost"
                    size="icon-sm"
                    aria-label={label}
                    disabled={disabled}
                    onClick={() =>
                      patch({
                        'content.align': [
                          align,
                          Array.isArray(content.align) ? content.align[1] : 'top',
                        ],
                      })
                    }
                  >
                    <Icon />
                  </Button>
                ))}
                <input
                  type="color"
                  aria-label="文字颜色"
                  title="文字颜色"
                  className="ml-auto h-6 w-6 cursor-pointer rounded border border-border"
                  disabled={disabled}
                  value={hexColor(resolveColor(content.color, theme))}
                  onChange={(event) => patch({ 'content.color': event.target.value })}
                />
              </div>
              <label
                htmlFor={`hd-text-${element.elementId}`}
                className="block space-y-1.5 text-xs text-muted-foreground"
              >
                <span>文本内容</span>
                <Textarea
                  id={`hd-text-${element.elementId}`}
                  aria-label="文本内容"
                  value={textValue(element.content?.text)}
                  disabled={disabled}
                  className="min-h-28 text-xs"
                  onChange={(event) => patch({ 'content.text': event.target.value })}
                  onCompositionStart={() => onComposition(true)}
                  onCompositionEnd={() => onComposition(false)}
                  onBlur={() => onComposition(false)}
                />
              </label>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                双击画布文字直接编辑。选中文字后可设置加粗、上下标。公式支持 LaTeX：\(…\)
                为行内、\[…\] 为独立公式，保留源表达式。
              </p>
            </Section>
          )}
          {element.elementType === 'table' && (
            <Section title="表格">
              <TableProperties
                key={element.elementId}
                element={element}
                theme={theme}
                disabled={disabled}
                onPatch={patch}
                onBegin={onBegin}
                onEnd={onEnd}
              />
            </Section>
          )}
          {element.elementType === 'chart' && (
            <Section title="图表与数据">
              <ChartProperties
                key={element.elementId}
                element={element}
                theme={theme}
                disabled={disabled}
                onPatch={patch}
                onBegin={onBegin}
                onEnd={onEnd}
                draft={chartDrafts?.[element.elementId]}
                onDraftChange={(draft) =>
                  onChartDraftChange?.(page.pageId, element.elementId, draft)
                }
              />
            </Section>
          )}
          {element.elementType === 'icon' && (
            <Section title="图标">
              <IconProperties
                key={element.elementId}
                element={element}
                theme={theme}
                disabled={disabled}
                onPatch={patch}
                onBegin={onBegin}
                onEnd={onEnd}
              />
            </Section>
          )}
          {element.elementType === 'group' && (
            <Section title="组合成员">
              <p className="text-[11px] text-muted-foreground">
                移动、缩放与旋转会同时更新成员。选择下方对象可单独编辑。
              </p>
              {groupChildren(element).map((id) => (
                <Button
                  key={id}
                  size="xs"
                  variant="ghost"
                  className="w-full justify-start overflow-hidden"
                  title={`对象 ID：${id}`}
                  onClick={() => onSelect([id])}
                >
                  <span className="truncate">
                    {layerTitle(
                      page.data.elements.find((item) => item.elementId === id) ?? {
                        elementId: id,
                        elementType: 'missing',
                      },
                    )}
                  </span>
                </Button>
              ))}
            </Section>
          )}
          {element.elementType === 'image' && (
            <Section title="图片与裁切">
              {string('图片路径或 URL', textValue(element.src), 'src')}
              <label className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                适配
                <select
                  aria-label="图片适配"
                  disabled={disabled}
                  value={textValue(record(element.fit).mode, 'cover')}
                  className="h-7 rounded border bg-background px-2 text-foreground"
                  onChange={(event) => patch({ 'fit.mode': event.target.value })}
                >
                  <option value="contain">完整显示</option>
                  <option value="cover">填满并裁切</option>
                  <option value="fill">拉伸填满</option>
                </select>
              </label>
              <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                {(['left', 'right', 'top', 'bottom'] as const).map((edge) => (
                  <div key={edge}>
                    {number(
                      { left: '左裁切', right: '右裁切', top: '上裁切', bottom: '下裁切' }[edge],
                      numberValue(record(element.crop)[edge], 0) * 100,
                      (value) => ({ [`crop.${edge}`]: value / 100 }),
                      { min: 0, max: 99 },
                    )}
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground">
                裁切单位为原图的百分比。原始图片保持不变。
              </p>
            </Section>
          )}
          {element.elementType === 'shape' && (
            <Section title="形状">
              <label className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                形状
                <select
                  aria-label="形状类型"
                  className="h-7 max-w-40 rounded border bg-background px-2 text-foreground"
                  disabled={disabled}
                  value={textValue(element.shapeName, 'rect')}
                  onChange={(event) => patch({ shapeName: event.target.value })}
                >
                  {[
                    ...SHAPE_PRESETS,
                    ...(element.shapeName === 'custom' ? [['custom', '自定义路径']] : []),
                  ].map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center justify-between text-xs text-muted-foreground">
                填色
                <input
                  type="color"
                  aria-label="形状填色"
                  className="h-7 w-12 rounded border"
                  disabled={disabled}
                  value={hexColor(resolveColor(record(element.fill).color, theme, '#dfe5e6'))}
                  onChange={(event) =>
                    patch({ fill: { type: 'solid', color: event.target.value } })
                  }
                />
              </label>
            </Section>
          )}
          {(element.elementType === 'shape' || element.elementType === 'line') && (
            <Section title="边线">
              <div className="grid grid-cols-2 gap-3">
                {number(
                  '线宽',
                  numberValue(record(element.border).width, 1),
                  (width) => ({ 'border.width': width }),
                  { min: 0, max: 100 },
                )}
                <label className="flex items-center justify-end">
                  <input
                    type="color"
                    aria-label="边线颜色"
                    className="h-7 w-12 rounded border"
                    value={hexColor(resolveColor(record(element.border).color, theme))}
                    disabled={disabled}
                    onChange={(event) => patch({ 'border.color': event.target.value })}
                  />
                </label>
              </div>
              <label className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                线型
                <select
                  aria-label="边线线型"
                  className="h-7 rounded border bg-background px-2 text-foreground"
                  disabled={disabled}
                  value={textValue(record(element.border).style, 'solid')}
                  onChange={(event) => patch({ 'border.style': event.target.value })}
                >
                  <option value="solid">实线</option>
                  <option value="dash">虚线</option>
                  <option value="dot">点线</option>
                </select>
              </label>
              {element.elementType === 'line' &&
                (['起点箭头', '终点箭头'] as const).map((label, index) => (
                  <label
                    key={label}
                    className="flex items-center justify-between gap-2 text-xs text-muted-foreground"
                  >
                    {label}
                    <select
                      aria-label={label}
                      className="h-7 rounded border bg-background px-2 text-foreground"
                      disabled={disabled}
                      value={String(
                        (Array.isArray(element.arrow) ? element.arrow[index] : null) ?? '',
                      )}
                      onChange={(event) => {
                        const arrow = Array.isArray(element.arrow)
                          ? [...element.arrow]
                          : [null, null];
                        arrow[index] = event.target.value || null;
                        patch({ arrow });
                      }}
                    >
                      <option value="">无</option>
                      <option value="arrow">箭头</option>
                      <option value="stealth">凹尾箭头</option>
                      <option value="diamond">菱形</option>
                      <option value="oval">圆形</option>
                    </select>
                  </label>
                ))}
            </Section>
          )}
        </>
      )}
      {selected.length > 0 && (
        <Section title="排列">
          <div className="flex gap-2">
            {onGroup && (
              <Button
                size="xs"
                variant="outline"
                disabled={disabled || selected.length < 2}
                onClick={onGroup}
              >
                组合
              </Button>
            )}
            {onUngroup && (
              <Button
                size="xs"
                variant="outline"
                disabled={disabled || !selected.some((item) => item.elementType === 'group')}
                onClick={onUngroup}
              >
                取消组合
              </Button>
            )}
          </div>
          <div className="grid grid-cols-3 gap-1">
            {(
              [
                ['left', '左对齐'],
                ['center', '水平居中'],
                ['right', '右对齐'],
                ['top', '顶部对齐'],
                ['middle', '垂直居中'],
                ['bottom', '底部对齐'],
              ] as const
            ).map(([alignment, label]) => (
              <Button
                key={alignment}
                variant="outline"
                size="xs"
                disabled={disabled}
                onClick={() => onAlign(alignment)}
              >
                {label}
              </Button>
            ))}
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" disabled={disabled} onClick={() => onLayer('front')}>
              <ArrowUpToLine />
              置顶
            </Button>
            <Button variant="ghost" size="sm" disabled={disabled} onClick={() => onLayer('back')}>
              <ArrowDownToLine />
              置底
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="删除所选对象"
              className="ml-auto text-destructive"
              disabled={disabled}
              onClick={onRemove}
            >
              <Trash2 />
            </Button>
          </div>
        </Section>
      )}
      {children}
      <Section title="图层 · 上方先显示">
        <div className="space-y-0.5">
          {[...page.data.elements].reverse().map((item) => (
            <button
              type="button"
              key={item.elementId}
              title={`对象 ID：${item.elementId}`}
              aria-pressed={selectedIds.includes(item.elementId)}
              className={cn(
                'flex w-full items-center gap-2 rounded px-2 py-2 text-left text-xs transition-colors hover:bg-muted',
                selectedIds.includes(item.elementId) && 'bg-brand-soft text-brand',
              )}
              onClick={(event) =>
                onSelect(
                  event.shiftKey
                    ? selectedIds.includes(item.elementId)
                      ? selectedIds.filter((id) => id !== item.elementId)
                      : [...selectedIds, item.elementId]
                    : [item.elementId],
                )
              }
            >
              <Layers2 className="size-3.5 shrink-0" />
              <span className="truncate">{layerTitle(item)}</span>
            </button>
          ))}
        </div>
      </Section>
    </aside>
  );
}

export function layerTitle(element: PptdElement): string {
  const label =
    textValue(element.content?.text)
      .replace(/<[^>]*>/g, '')
      .trim() ||
    textValue(element.name).trim() ||
    textValue(element.title, textValue(record(element.title).text)).trim();
  if (label) return label.slice(0, 36);
  if (element.elementType === 'shape')
    return (
      SHAPE_PRESETS.find(([name]) => name === textValue(element.shapeName, 'rect'))?.[1] ??
      '自定义形状'
    );
  const typeLabels: Record<string, string> = {
    text: '文字',
    image: '图片',
    line: '线条',
    chart: '图表',
    table: '表格',
    icon: '图标',
    group: '组合',
    missing: '缺失对象',
  };
  return typeLabels[element.elementType] ?? '对象';
}

function hexColor(color: string) {
  return /^#[a-f0-9]{6}/i.test(color) ? color.slice(0, 7) : '#000000';
}
