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
import { type ReactNode, useEffect, useId, useRef, useState } from 'react';
import type { Alignment } from '@/lib/inspector/geometry';
import { cn } from '@/lib/utils';
import type { PageSnapshot, PptdElement } from '../../../pptd/types';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import {
  numberValue,
  type PptdTheme,
  record,
  resolveColor,
  textContent,
  textValue,
} from './renderer';

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

export function NumberField({
  label,
  value,
  onCommit,
  disabled,
  min,
  max,
  step = 1,
  onBegin,
  onEnd,
}: {
  label: string;
  value: number;
  onCommit: (value: number) => void;
  disabled?: boolean;
  min?: number;
  max?: number;
  step?: number;
  onBegin?: () => void;
  onEnd?: () => void;
}) {
  const id = useId();
  const [draft, setDraft] = useState(String(Math.round(value * 100) / 100));
  const focused = useRef(false);
  const skip = useRef(false);
  useEffect(() => {
    if (!focused.current) setDraft(String(Math.round(value * 100) / 100));
  }, [value]);
  return (
    <label htmlFor={id} className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
      <span className="min-w-7 shrink-0">{label}</span>
      <Input
        id={id}
        type="number"
        aria-label={label}
        value={draft}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        className="h-7 text-right font-mono text-xs"
        onFocus={() => {
          focused.current = true;
          onBegin?.();
        }}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          focused.current = false;
          const next = Number(draft);
          if (!skip.current && draft.trim() && Number.isFinite(next))
            onCommit(Math.min(max ?? Infinity, Math.max(min ?? -Infinity, next)));
          else setDraft(String(value));
          skip.current = false;
          onEnd?.();
        }}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === 'Enter') event.currentTarget.blur();
          if (event.key === 'Escape') {
            skip.current = true;
            setDraft(String(value));
            event.currentTarget.blur();
          }
        }}
      />
    </label>
  );
}

function StringField({
  label,
  value,
  onCommit,
  disabled,
  onBegin,
  onEnd,
}: {
  label: string;
  value: string;
  onCommit: (value: string) => void;
  disabled?: boolean;
  onBegin: () => void;
  onEnd: () => void;
}) {
  const id = useId();
  const [draft, setDraft] = useState(value);
  const focused = useRef(false);
  const skip = useRef(false);
  useEffect(() => {
    if (!focused.current) setDraft(value);
  }, [value]);
  return (
    <label htmlFor={id} className="block space-y-1.5 text-xs text-muted-foreground">
      <span>{label}</span>
      <Input
        id={id}
        aria-label={label}
        value={draft}
        disabled={disabled}
        onFocus={() => {
          focused.current = true;
          onBegin();
        }}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          focused.current = false;
          if (!skip.current) onCommit(draft);
          else setDraft(value);
          skip.current = false;
          onEnd();
        }}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.nativeEvent.isComposing) return;
          if (event.key === 'Enter') event.currentTarget.blur();
          if (event.key === 'Escape') {
            skip.current = true;
            event.currentTarget.blur();
          }
        }}
      />
    </label>
  );
}

export function PptdInspector({
  page,
  theme,
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
  children,
}: Props) {
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
          {selected.length ? `${selected.length} selected` : (page.shortCode ?? '只读')}
        </span>
      </div>
      {element && (
        <>
          <Section title={element.elementType}>
            <p
              className="break-all font-mono text-[11px] text-muted-foreground"
              title={element.elementId}
            >
              {element.elementId}
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
              {number(
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
                双击画布文字直接编辑。选中文字后可设置加粗、上下标。
              </p>
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
                    ['rect', '矩形'],
                    ['roundRect', '圆角矩形'],
                    ['ellipse', '椭圆'],
                    ['triangle', '三角形'],
                    ['diamond', '菱形'],
                    ['rightArrow', '右箭头'],
                    ['leftArrow', '左箭头'],
                    ['chevron', '折线箭头'],
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
            </Section>
          )}
        </>
      )}
      {selected.length > 0 && (
        <Section title="排列">
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
      {!selected.length && (
        <Section title="Huandeng Frame">
          <p className="text-xs leading-relaxed">
            {page.metadata.designIntent?.purpose || '为这一页保留清楚的科学问题、原图和构图理由。'}
          </p>
          {(page.metadata.designIntent?.keep ?? []).map((item) => (
            <p
              key={item}
              className="border-l-2 border-brand/50 pl-2 text-xs leading-relaxed text-muted-foreground"
            >
              {item}
            </p>
          ))}
          <p className="break-all font-mono text-[10px] text-muted-foreground">{page.path}</p>
        </Section>
      )}
      {children}
      <Section title="图层 · 上方先显示">
        <div className="space-y-0.5">
          {[...page.data.elements].reverse().map((item) => (
            <button
              type="button"
              key={item.elementId}
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
  return (
    textValue(element.content?.text)
      .replace(/<[^>]*>/g, '')
      .trim()
      .slice(0, 36) || element.elementId
  );
}

function hexColor(color: string) {
  return /^#[a-f0-9]{6}/i.test(color) ? color.slice(0, 7) : '#000000';
}
