import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowDownToLine,
  ArrowUp,
  ArrowUpToLine,
  Bold,
  Italic,
  Layers2,
  PanelRightClose,
  Trash2,
  Underline,
} from 'lucide-react';
import { type ReactNode, useId, useState } from 'react';
import { uiText as t, useHuandengLocale } from '@/lib/huandeng-locale';
import type { Alignment } from '@/lib/inspector/geometry';
import { elementLabel as layerTitle } from '@/lib/pptd-element-label';
import { rootSelectedElements } from '@/lib/pptd-geometry';
import { cycleItemId, type EditorKeyboardCommand } from '@/lib/pptd-keyboard';
import { lineBendPercent, lineCurvePatch } from '@/lib/pptd-line-curve';
import type { LayerDirection } from '@/lib/pptd-object-actions';
import { cn } from '@/lib/utils';
import { groupChildren } from '../../../pptd/grouping';
import { isMainPositionField, mainPositionText } from '../../../pptd/position-field';
import { SHAPE_PRESETS } from '../../../pptd/shape-presets';
import type { PageSnapshot } from '../../../pptd/types';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { ArrangementControls } from './arrangement-controls';
import { FontPresetSelect } from './font-library';
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

export { elementLabel as layerTitle } from '@/lib/pptd-element-label';
export { NumberField } from './property-fields';

export type InspectorTab = 'properties' | 'layout' | 'layers' | 'story' | 'checks';

type Props = {
  page: PageSnapshot;
  theme: PptdTheme;
  selectedIds: string[];
  disabled: boolean;
  onSelect: (ids: string[]) => void;
  onActivate?: (elementId?: string) => void;
  onPatch: (elementId: string, fields: Record<string, unknown>, autosave?: boolean) => void;
  onBegin: () => void;
  onEnd: () => void;
  onComposition: (composing: boolean) => void;
  onAlign: (alignment: Alignment, reference: 'selection' | 'slide') => void;
  onDistribute: (axis: 'x' | 'y') => void;
  onLayer: (direction: LayerDirection) => void;
  onRemove: () => void;
  onCommand?: (command: EditorKeyboardCommand) => void;
  tab?: InspectorTab;
  onTabChange?: (tab: InspectorTab) => void;
  onCollapse?: () => void;
  storyContent?: ReactNode;
  checksContent?: ReactNode;
  onGroup?: () => void;
  onUngroup?: () => void;
  chartDrafts?: Record<string, ChartDataDraft>;
  onChartDraftChange?: (pageId: string, elementId: string, draft: ChartDataDraft | null) => void;
  children?: ReactNode;
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  useHuandengLocale();
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
  onActivate,
  onPatch,
  onBegin,
  onEnd,
  onComposition,
  onAlign,
  onDistribute,
  onLayer,
  onRemove,
  onCommand,
  tab,
  onTabChange,
  onCollapse,
  storyContent,
  checksContent,
  onGroup,
  onUngroup,
  chartDrafts,
  onChartDraftChange,
  children,
}: Props) {
  useHuandengLocale();
  const [localTab, setLocalTab] = useState<InspectorTab>('properties');
  const activeTab = tab ?? localTab;
  const prefix = useId();
  const tabs: { id: InspectorTab; label: string }[] = [
    { id: 'properties', label: 'Properties' },
    { id: 'layout', label: 'Layout' },
    { id: 'layers', label: 'Layers' },
    { id: 'story', label: 'Story' },
    { id: 'checks', label: 'Checks' },
  ];
  const selectTab = (next: InspectorTab) => {
    setLocalTab(next);
    onTabChange?.(next);
  };
  const theme =
    page.metadata.themeOverride &&
    typeof page.metadata.themeOverride === 'object' &&
    !Array.isArray(page.metadata.themeOverride)
      ? (page.metadata.themeOverride as PptdTheme)
      : inheritedTheme;
  const selected = page.data.elements.filter((element) => selectedIds.includes(element.elementId));
  const layers = [...page.data.elements].reverse();
  const layerTabStop = layers.find((item) => selectedIds.includes(item.elementId)) ?? layers[0];
  const element = selected.length === 1 ? selected[0] : undefined;
  const content = element ? textContent(element, theme) : {};
  const positionField = element ? isMainPositionField(element) : false;
  const bounds = element?.bounds ?? [0, 0, 120, 50];
  const patch = (fields: Record<string, unknown>, autosave = true) => {
    if (element) onPatch(element.elementId, fields, autosave);
  };
  const format = (value: 'bold' | 'italic' | 'underline') => {
    if (onCommand) onCommand({ type: 'format-text', format: value });
    else patch({ [`content.${value}`]: !content[value] });
  };
  const number = (
    label: string,
    value: number,
    fields: (value: number) => Record<string, unknown>,
    options: { min?: number; max?: number; step?: number } = {},
  ) => (
    <NumberField
      label={t(label)}
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
      label={t(label)}
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
      className="flex h-full w-72 shrink-0 flex-col overflow-hidden border-l border-border bg-background"
      aria-label={t('对象属性')}
      data-hd-inspector
      data-hd-focus-region="inspector"
      tabIndex={-1}
    >
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-border px-4">
        <h2 className="text-sm font-medium">{t('Inspector')}</h2>
        <span className="folio">
          {selected.length
            ? t('已选 {value0} 项', { value0: selected.length })
            : `${t('Slide ID')} ${page.shortCode ?? page.pageId}`}
        </span>
        {onCollapse && (
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={t('Collapse properties panel')}
            title={t('Collapse properties panel')}
            onClick={onCollapse}
          >
            <PanelRightClose />
          </Button>
        )}
      </div>
      <div
        role="tablist"
        aria-label={t('Inspector views')}
        className="grid shrink-0 grid-cols-5 gap-0.5 border-b border-border p-1.5"
      >
        {tabs.map((item, index) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`${prefix}-${item.id}-tab`}
            aria-controls={`${prefix}-${item.id}-panel`}
            aria-selected={activeTab === item.id}
            tabIndex={activeTab === item.id ? 0 : -1}
            data-hd-inspector-tab={item.id}
            className={cn(
              'rounded px-1 py-2 text-[11px] outline-none focus-visible:ring-2 focus-visible:ring-ring',
              activeTab === item.id
                ? 'bg-muted font-medium text-foreground'
                : 'text-muted-foreground hover:bg-muted/60',
            )}
            onClick={() => selectTab(item.id)}
            onKeyDown={(event) => {
              const next =
                event.key === 'Home'
                  ? 0
                  : event.key === 'End'
                    ? tabs.length - 1
                    : event.key === 'ArrowRight'
                      ? (index + 1) % tabs.length
                      : event.key === 'ArrowLeft'
                        ? (index + tabs.length - 1) % tabs.length
                        : null;
              if (next === null) return;
              event.preventDefault();
              selectTab(tabs[next].id);
              document.getElementById(`${prefix}-${tabs[next].id}-tab`)?.focus();
            }}
          >
            {t(item.label)}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id={`${prefix}-properties-panel`}
        aria-labelledby={`${prefix}-properties-tab`}
        hidden={activeTab !== 'properties'}
        className={activeTab === 'properties' ? 'min-h-0 flex-1 overflow-y-auto' : 'hidden'}
      >
        {!selected.length && (
          <p className="px-4 py-4 text-xs leading-relaxed text-muted-foreground">
            {t('Select an object on the slide to edit its properties.')}
          </p>
        )}
        {element && (
          <>
            <Section title={t('位置与尺寸')}>
              <p
                className="break-words text-xs font-medium"
                title={t('对象 ID：{value0}', { value0: element.elementId })}
              >
                {layerTitle(element)}
              </p>
              <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                {(['X', 'Y', '宽度', '高度'] as const).map((label, index) => (
                  <div key={label}>
                    {number(
                      t(label),
                      bounds[index],
                      (value) => ({
                        bounds: bounds.map((current, i) => (i === index ? value : current)),
                      }),
                      index > 1 ? { min: 1 } : {},
                    )}
                  </div>
                ))}
                {number(t('旋转'), numberValue(element.rotation, 0), (rotation) => ({ rotation }))}
                {element.elementType !== 'group' &&
                  number(
                    t('透明度'),
                    numberValue(element.opacity, 1) * 100,
                    (opacity) => ({ opacity: opacity / 100 }),
                    { min: 0, max: 100 },
                  )}
              </div>
              {overrides.length > 0 && (
                <p className="rounded bg-brand-soft px-2 py-1.5 text-[11px] text-foreground">
                  {t('保留手动调整 · {value0}', { value0: [...new Set(overrides)].join(' · ') })}
                </p>
              )}
            </Section>
            {element.elementType === 'text' && (
              <Section title={t('文字')}>
                <FontPresetSelect
                  label="Font preset"
                  value={textValue(content.fontFamily, 'MiSans')}
                  disabled={disabled}
                  onChange={(fontFamily) => patch({ 'content.fontFamily': fontFamily })}
                />
                {string(t('字体'), textValue(content.fontFamily, 'MiSans'), 'content.fontFamily')}
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  {t('Check installed fonts in Workspace settings → Fonts.')}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {number(
                    t('字号'),
                    numberValue(content.fontSize, 18),
                    (fontSize) => ({ 'content.fontSize': fontSize }),
                    { min: 1, max: 400 },
                  )}
                  {number(
                    t('行距'),
                    numberValue(content.lineHeight, 1),
                    (lineHeight) => ({ 'content.lineHeight': lineHeight }),
                    { min: 0.1, max: 10, step: 0.1 },
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant={content.bold ? 'secondary' : 'ghost'}
                    size="icon-sm"
                    aria-label={t('整段加粗')}
                    aria-pressed={content.bold === true}
                    disabled={disabled}
                    onClick={() => format('bold')}
                  >
                    <Bold />
                  </Button>
                  <Button
                    variant={content.italic ? 'secondary' : 'ghost'}
                    size="icon-sm"
                    aria-label={t('整段斜体')}
                    aria-pressed={content.italic === true}
                    disabled={disabled}
                    onClick={() => format('italic')}
                  >
                    <Italic />
                  </Button>
                  <Button
                    variant={content.underline ? 'secondary' : 'ghost'}
                    size="icon-sm"
                    aria-label={t('Underline text box')}
                    aria-pressed={content.underline === true}
                    disabled={disabled}
                    onClick={() => format('underline')}
                  >
                    <Underline />
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
                      aria-label={t(label)}
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
                    aria-label={t('文字颜色')}
                    title={t('文字颜色')}
                    className="ml-auto h-6 w-6 cursor-pointer rounded border border-border"
                    disabled={disabled}
                    value={hexColor(resolveColor(content.color, theme))}
                    onChange={(event) =>
                      onCommand
                        ? onCommand({ type: 'text-color', color: event.target.value })
                        : patch({ 'content.color': event.target.value })
                    }
                  />
                </div>
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    data-hd-position-field-toggle
                    checked={positionField}
                    disabled={disabled}
                    onChange={(event) =>
                      patch(
                        event.target.checked
                          ? { 'content.field': 'main-position' }
                          : {
                              'content.field': null,
                              'content.text': mainPositionText(page.mainPosition),
                            },
                      )
                    }
                  />
                  {t('Use Slide Position')}
                </label>
                {positionField && (
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    {t(
                      'Updates from Main Slides order. Reordering pages changes this number without creating a Slide version.',
                    )}
                  </p>
                )}
                <label
                  htmlFor={`hd-text-${element.elementId}`}
                  className="block space-y-1.5 text-xs text-muted-foreground"
                >
                  <span>{t('文本内容')}</span>
                  <Textarea
                    id={`hd-text-${element.elementId}`}
                    aria-label={t('文本内容')}
                    value={
                      positionField
                        ? mainPositionText(page.mainPosition)
                        : textValue(element.content?.text)
                    }
                    disabled={disabled || positionField}
                    className="min-h-28 text-xs"
                    onChange={(event) => patch({ 'content.text': event.target.value })}
                    onCompositionStart={() => onComposition(true)}
                    onCompositionEnd={() => onComposition(false)}
                    onBlur={() => onComposition(false)}
                  />
                </label>
                {!positionField && (
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    {t(
                      '双击画布文字直接编辑。选中文字后可设置加粗、上下标。公式支持 LaTeX：\\(…\\) 为行内、\\[…\\] 为独立公式，保留源表达式。',
                    )}
                  </p>
                )}
              </Section>
            )}
            {element.elementType === 'table' && (
              <Section title={t('表格')}>
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
              <Section title={t('图表与数据')}>
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
              <Section title={t('图标')}>
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
              <Section title={t('组合成员')}>
                <p className="text-[11px] text-muted-foreground">
                  {t('移动、缩放与旋转会同时更新成员。选择下方对象可单独编辑。')}
                </p>
                {groupChildren(element).map((id) => (
                  <Button
                    key={id}
                    size="xs"
                    variant="ghost"
                    className="w-full justify-start overflow-hidden"
                    title={t('对象 ID：{value0}', { value0: id })}
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
              <Section title={t('图片与裁切')}>
                {string(t('图片路径或 URL'), textValue(element.src), 'src')}
                <label className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  {t('适配')}
                  <select
                    aria-label={t('图片适配')}
                    disabled={disabled}
                    value={textValue(record(element.fit).mode, 'cover')}
                    className="h-7 rounded border bg-background px-2 text-foreground"
                    onChange={(event) => patch({ 'fit.mode': event.target.value })}
                  >
                    <option value="contain">{t('完整显示')}</option>
                    <option value="cover">{t('填满并裁切')}</option>
                    <option value="fill">{t('拉伸填满')}</option>
                  </select>
                </label>
                <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                  {(['left', 'right', 'top', 'bottom'] as const).map((edge) => (
                    <div key={edge}>
                      {number(
                        {
                          left: t('左裁切'),
                          right: t('右裁切'),
                          top: t('上裁切'),
                          bottom: t('下裁切'),
                        }[edge],
                        numberValue(record(element.crop)[edge], 0) * 100,
                        (value) => ({ [`crop.${edge}`]: value / 100 }),
                        { min: 0, max: 99 },
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {t('裁切单位为原图的百分比。原始图片保持不变。')}
                </p>
              </Section>
            )}
            {element.elementType === 'shape' && (
              <Section title={t('形状')}>
                <label className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  {t('形状')}
                  <select
                    aria-label={t('形状类型')}
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
                        {t(label)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center justify-between text-xs text-muted-foreground">
                  {t('填色')}
                  <input
                    type="color"
                    aria-label={t('形状填色')}
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
              <Section title={t('边线')}>
                <div className="grid grid-cols-2 gap-3">
                  {number(
                    t('线宽'),
                    numberValue(record(element.border).width, 1),
                    (width) => ({ 'border.width': width }),
                    { min: 0, max: 100 },
                  )}
                  <label className="flex items-center justify-end">
                    <input
                      type="color"
                      aria-label={t('边线颜色')}
                      className="h-7 w-12 rounded border"
                      value={hexColor(resolveColor(record(element.border).color, theme))}
                      disabled={disabled}
                      onChange={(event) => patch({ 'border.color': event.target.value })}
                    />
                  </label>
                </div>
                <label className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  {t('线型')}
                  <select
                    aria-label={t('边线线型')}
                    className="h-7 rounded border bg-background px-2 text-foreground"
                    disabled={disabled}
                    value={textValue(record(element.border).style, 'solid')}
                    onChange={(event) => patch({ 'border.style': event.target.value })}
                  >
                    <option value="solid">{t('实线')}</option>
                    <option value="dash">{t('虚线')}</option>
                    <option value="dot">{t('点线')}</option>
                  </select>
                </label>
                {element.elementType === 'line' && (
                  <>
                    <label className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      {t('线条形态')}
                      <select
                        aria-label={t('线条形态')}
                        className="h-7 rounded border bg-background px-2 text-foreground"
                        disabled={disabled}
                        value={element.curve === 'smooth' ? 'smooth' : 'sharp'}
                        onChange={(event) =>
                          patch(
                            lineCurvePatch(
                              element,
                              event.target.value as 'sharp' | 'smooth',
                              lineBendPercent(element),
                            ),
                          )
                        }
                      >
                        <option value="sharp">{t('直线')}</option>
                        <option value="smooth">{t('曲线')}</option>
                      </select>
                    </label>
                    {element.curve === 'smooth' && (
                      <div>
                        {number(
                          t('弯曲程度 (%)'),
                          lineBendPercent(element),
                          (value) => lineCurvePatch(element, 'smooth', value),
                          { min: -100, max: 100 },
                        )}
                      </div>
                    )}
                  </>
                )}
                {element.elementType === 'line' &&
                  (['起点箭头', '终点箭头'] as const).map((label, index) => (
                    <label
                      key={label}
                      className="flex items-center justify-between gap-2 text-xs text-muted-foreground"
                    >
                      {t(label)}
                      <select
                        aria-label={t(label)}
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
                        <option value="">{t('无')}</option>
                        <option value="arrow">{t('箭头')}</option>
                        <option value="stealth">{t('凹尾箭头')}</option>
                        <option value="diamond">{t('菱形')}</option>
                        <option value="oval">{t('圆形')}</option>
                      </select>
                    </label>
                  ))}
              </Section>
            )}
          </>
        )}
        {selected.length > 0 && (
          <Section title={t('排列')}>
            <div className="flex gap-2">
              {onGroup && (
                <Button
                  size="xs"
                  variant="outline"
                  disabled={disabled || selected.length < 2}
                  onClick={onGroup}
                >
                  {t('组合')}
                </Button>
              )}
              {onUngroup && (
                <Button
                  size="xs"
                  variant="outline"
                  disabled={disabled || !selected.some((item) => item.elementType === 'group')}
                  onClick={onUngroup}
                >
                  {t('取消组合')}
                </Button>
              )}
            </div>
            <ArrangementControls
              selectedCount={rootSelectedElements(page.data.elements, selectedIds).length}
              disabled={disabled}
              onAlign={onAlign}
              onDistribute={onDistribute}
            />
            <LayerOrderControls disabled={disabled} onLayer={onLayer} />
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t('删除所选对象')}
                className="ml-auto text-destructive"
                disabled={disabled}
                onClick={onRemove}
              >
                <Trash2 />
              </Button>
            </div>
          </Section>
        )}
      </div>
      <div
        role="tabpanel"
        id={`${prefix}-layout-panel`}
        aria-labelledby={`${prefix}-layout-tab`}
        hidden={activeTab !== 'layout'}
        className={activeTab === 'layout' ? 'min-h-0 flex-1 overflow-y-auto' : 'hidden'}
      >
        {children}
      </div>
      <div
        role="tabpanel"
        id={`${prefix}-story-panel`}
        aria-labelledby={`${prefix}-story-tab`}
        hidden={activeTab !== 'story'}
        className={activeTab === 'story' ? 'min-h-0 flex-1 overflow-y-auto' : 'hidden'}
      >
        {storyContent ?? (
          <p className="px-4 py-4 text-xs text-muted-foreground">
            {t('Story describes the purpose and evidence for this slide.')}
          </p>
        )}
      </div>
      <div
        role="tabpanel"
        id={`${prefix}-checks-panel`}
        aria-labelledby={`${prefix}-checks-tab`}
        hidden={activeTab !== 'checks'}
        className={activeTab === 'checks' ? 'min-h-0 flex-1 overflow-y-auto' : 'hidden'}
      >
        <p className="px-4 pt-4 text-xs leading-relaxed text-muted-foreground">
          {t(
            'File, font and layout diagnostics for this slide. Select an issue to locate the affected object.',
          )}
        </p>
        {checksContent}
      </div>
      <div
        role="tabpanel"
        id={`${prefix}-layers-panel`}
        aria-labelledby={`${prefix}-layers-tab`}
        hidden={activeTab !== 'layers'}
        className={activeTab === 'layers' ? 'min-h-0 flex-1 overflow-y-auto' : 'hidden'}
      >
        <div className="border-b border-border px-3 py-3">
          <LayerOrderControls disabled={disabled || !selected.length} onLayer={onLayer} />
        </div>
        <Section title={t('图层 · 上方先显示')}>
          <div className="space-y-0.5">
            {layers.map((item) => (
              <button
                type="button"
                key={item.elementId}
                data-hd-layer={item.elementId}
                tabIndex={item.elementId === layerTabStop?.elementId ? 0 : -1}
                title={t('对象 ID：{value0}', { value0: item.elementId })}
                aria-pressed={selectedIds.includes(item.elementId)}
                className={cn(
                  'flex w-full items-center gap-2 rounded px-2 py-2 text-left text-xs outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-brand/60',
                  selectedIds.includes(item.elementId) && 'bg-brand-soft text-brand',
                )}
                onClick={(event) => {
                  const ids = event.shiftKey
                    ? selectedIds.includes(item.elementId)
                      ? selectedIds.filter((id) => id !== item.elementId)
                      : [...selectedIds, item.elementId]
                    : [item.elementId];
                  onSelect(ids);
                  onActivate?.(ids[0]);
                }}
                onKeyDown={(event) => {
                  if (
                    event.nativeEvent.isComposing ||
                    event.keyCode === 229 ||
                    event.ctrlKey ||
                    event.metaKey ||
                    event.altKey
                  )
                    return;
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    onSelect([item.elementId]);
                    onActivate?.(item.elementId);
                    return;
                  }
                  const ids = layers.map((layer) => layer.elementId);
                  const next =
                    event.key === 'Home'
                      ? ids[0]
                      : event.key === 'End'
                        ? ids[ids.length - 1]
                        : event.key === 'ArrowUp' || event.key === 'ArrowDown'
                          ? cycleItemId(
                              ids,
                              item.elementId,
                              event.key === 'ArrowUp' ? -1 : 1,
                              false,
                            )
                          : null;
                  if (!next) return;
                  event.preventDefault();
                  onSelect([next]);
                  const target = event.currentTarget.parentElement?.querySelector<HTMLElement>(
                    `[data-hd-layer="${CSS.escape(next)}"]`,
                  );
                  target?.focus({ preventScroll: true });
                  target?.scrollIntoView({ block: 'nearest' });
                }}
              >
                <Layers2 className="size-3.5 shrink-0" />
                <span className="truncate">{layerTitle(item)}</span>
              </button>
            ))}
          </div>
        </Section>
      </div>
    </aside>
  );
}

function LayerOrderControls({
  disabled,
  onLayer,
}: {
  disabled: boolean;
  onLayer: (direction: LayerDirection) => void;
}) {
  useHuandengLocale();
  return (
    <fieldset className="grid grid-cols-2 gap-1" aria-label={t('Layer order')}>
      {(
        [
          ['forward', 'Forward', 'Bring forward', ArrowUp],
          ['backward', 'Backward', 'Send backward', ArrowDown],
          ['front', 'To front', 'Bring to front', ArrowUpToLine],
          ['back', 'To back', 'Send to back', ArrowDownToLine],
        ] as const
      ).map(([direction, label, title, Icon]) => (
        <Button
          key={direction}
          variant="ghost"
          size="xs"
          className="justify-start"
          disabled={disabled}
          aria-label={t(title)}
          title={t(title)}
          onClick={() => onLayer(direction)}
        >
          <Icon />
          {t(label)}
        </Button>
      ))}
    </fieldset>
  );
}

function hexColor(color: string) {
  return /^#[a-f0-9]{6}/i.test(color) ? color.slice(0, 7) : '#000000';
}
