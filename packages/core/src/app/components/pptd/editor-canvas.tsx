import { Bold, Italic, Subscript, Superscript, Underline } from 'lucide-react';
import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import {
  alignRects,
  type Guide,
  type Rect,
  type ResizeHandle,
  resizeRect,
  snapMove,
  unionRects,
} from '@/lib/inspector/geometry';
import { expandGroupIds, owningGroupId } from '../../../pptd/grouping';
import type { Bounds, PageSize, PageSnapshot, PptdElement } from '../../../pptd/types';
import { SlideCanvas } from '../slide-canvas';
import { Button } from '../ui/button';
import {
  isRichText,
  numberValue,
  PptdPageRenderer,
  type PptdTheme,
  sanitizeRichTextHtml,
  textContent,
  textCss,
  textValue,
} from './renderer';

type Props = {
  page: PageSnapshot;
  size: PageSize;
  theme: PptdTheme;
  selectedIds: string[];
  onSelect: (ids: string[]) => void;
  onPatch: (elementId: string, set: Record<string, unknown>, autosave?: boolean) => void;
  onBegin: () => void;
  onEnd: () => void;
  onCancel: (originals: { elementId: string; fields: Record<string, unknown> }[]) => void;
  onFlush: () => void;
  onComposition: (composing: boolean) => void;
  disabled?: boolean;
  scale?: number;
  onScaleChange?: (scale: number) => void;
};

type Gesture = {
  kind: 'move' | 'resize' | 'rotate';
  startX: number;
  startY: number;
  scale: number;
  elements: {
    id: string;
    rect: Rect;
    rotation: number;
    originalRotation?: number;
    originalBounds?: Bounds;
  }[];
  handle?: ResizeHandle;
  angle?: number;
  center?: { x: number; y: number };
  moved: boolean;
  originals: { elementId: string; fields: Record<string, unknown> }[];
};

export function elementRect(element: PptdElement): Rect {
  const [x, y, width, height] = element.bounds ?? [0, 0, 120, 50];
  return { x, y, width, height };
}

export function rectBounds(rect: Rect): Bounds {
  return [rect.x, rect.y, rect.width, rect.height].map(
    (value) => Math.round(value * 10000) / 10000,
  ) as Bounds;
}

export function alignedBounds(
  elements: PptdElement[],
  alignment: Parameters<typeof alignRects>[1],
  size: PageSize,
) {
  const rects = elements.map(elementRect);
  const target =
    elements.length === 1 ? { x: 0, y: 0, width: size[0], height: size[1] } : undefined;
  return alignRects(rects, alignment, target).map((delta, index) => ({
    elementId: elements[index].elementId,
    bounds: rectBounds({
      ...rects[index],
      x: rects[index].x + delta.x,
      y: rects[index].y + delta.y,
    }),
  }));
}

export function PptdEditorCanvas({
  page,
  size,
  theme,
  selectedIds,
  onSelect,
  onPatch,
  onBegin,
  onEnd,
  onCancel,
  onFlush,
  onComposition,
  disabled = false,
  scale,
  onScaleChange,
}: Props) {
  const [actualScale, setActualScale] = useState(1);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const gestureRef = useRef<Gesture | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const latest = useRef({ page, size, onPatch, onEnd, onCancel });
  latest.current = { page, size, onPatch, onEnd, onCancel };

  useEffect(() => {
    if (editingId && !selectedIds.includes(editingId)) setEditingId(null);
  }, [editingId, selectedIds]);

  useEffect(() => {
    const move = (event: PointerEvent) => {
      const gesture = gestureRef.current;
      if (!gesture) return;
      let dx = (event.clientX - gesture.startX) / gesture.scale;
      let dy = (event.clientY - gesture.startY) / gesture.scale;
      if (!gesture.moved && Math.hypot(dx, dy) * gesture.scale < 2) return;
      gesture.moved = true;
      if (gesture.kind === 'move') {
        if (event.shiftKey) {
          if (Math.abs(dx) >= Math.abs(dy)) dy = 0;
          else dx = 0;
        }
        const group = unionRects(gesture.elements.map((item) => item.rect));
        if (!group) return;
        const selected = new Set(gesture.elements.map((item) => item.id));
        const targets = latest.current.page.data.elements
          .filter((item) => !selected.has(item.elementId))
          .map(elementRect);
        targets.push({ x: 0, y: 0, width: latest.current.size[0], height: latest.current.size[1] });
        const snap = event.altKey
          ? { delta: { x: dx, y: dy }, guides: [] }
          : snapMove(group, { x: dx, y: dy }, targets, 5 / gesture.scale);
        setGuides(snap.guides);
        for (const item of gesture.elements)
          latest.current.onPatch(
            item.id,
            {
              bounds: rectBounds({
                ...item.rect,
                x: item.rect.x + snap.delta.x,
                y: item.rect.y + snap.delta.y,
              }),
            },
            false,
          );
      } else if (gesture.kind === 'resize') {
        const item = gesture.elements[0];
        const radians = (item.rotation * Math.PI) / 180;
        const localDelta = {
          x: dx * Math.cos(radians) + dy * Math.sin(radians),
          y: -dx * Math.sin(radians) + dy * Math.cos(radians),
        };
        const isGroup =
          latest.current.page.data.elements.find((element) => element.elementId === item.id)
            ?.elementType === 'group';
        const rect = resizeRect(
          item.rect,
          gesture.handle ?? 'se',
          localDelta,
          event.shiftKey || isGroup,
        );
        const shiftX = rect.x + rect.width / 2 - item.rect.x - item.rect.width / 2;
        const shiftY = rect.y + rect.height / 2 - item.rect.y - item.rect.height / 2;
        rect.x =
          item.rect.x +
          item.rect.width / 2 +
          shiftX * Math.cos(radians) -
          shiftY * Math.sin(radians) -
          rect.width / 2;
        rect.y =
          item.rect.y +
          item.rect.height / 2 +
          shiftX * Math.sin(radians) +
          shiftY * Math.cos(radians) -
          rect.height / 2;
        latest.current.onPatch(item.id, { bounds: rectBounds(rect) }, false);
      } else if (gesture.center) {
        const angle = Math.atan2(
          event.clientY - gesture.center.y,
          event.clientX - gesture.center.x,
        );
        let rotation =
          gesture.elements[0].rotation + ((angle - (gesture.angle ?? 0)) * 180) / Math.PI;
        if (event.shiftKey) rotation = Math.round(rotation / 15) * 15;
        latest.current.onPatch(
          gesture.elements[0].id,
          { rotation: Math.round(rotation * 100) / 100 },
          false,
        );
      }
    };
    const finish = (event: PointerEvent) => {
      const gesture = gestureRef.current;
      if (!gesture) return;
      gestureRef.current = null;
      setGuides([]);
      if (event.type === 'pointercancel') latest.current.onCancel(gesture.originals);
      else latest.current.onEnd();
    };
    const cancelOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || !gestureRef.current) return;
      finish(new PointerEvent('pointercancel'));
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', finish);
    window.addEventListener('pointercancel', finish);
    window.addEventListener('keydown', cancelOnEscape);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', finish);
      window.removeEventListener('pointercancel', finish);
      window.removeEventListener('keydown', cancelOnEscape);
      if (gestureRef.current) latest.current.onEnd();
    };
  }, []);

  const startGesture = (
    event: ReactPointerEvent<HTMLElement>,
    kind: Gesture['kind'],
    ids: string[],
    handle?: ResizeHandle,
  ) => {
    if (disabled || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const elements = page.data.elements
      .filter((item) => ids.includes(item.elementId))
      .map((item) => ({
        id: item.elementId,
        rect: elementRect(item),
        rotation: numberValue(item.rotation, 0),
        originalRotation: item.rotation,
        originalBounds: item.bounds,
      }));
    if (!elements.length) return;
    canvasRef.current
      ?.querySelector<HTMLElement>(`[data-hd-element-id="${CSS.escape(elements[0].id)}"]`)
      ?.focus({ preventScroll: true });
    setEditingId(null);
    const root = canvasRef.current?.querySelector('[data-pptd-page]')?.getBoundingClientRect();
    const first = elements[0].rect;
    const center = root
      ? {
          x: root.left + (first.x + first.width / 2) * actualScale,
          y: root.top + (first.y + first.height / 2) * actualScale,
        }
      : undefined;
    gestureRef.current = {
      kind,
      startX: event.clientX,
      startY: event.clientY,
      scale: actualScale,
      elements,
      handle,
      center,
      angle: center ? Math.atan2(event.clientY - center.y, event.clientX - center.x) : undefined,
      moved: false,
      originals: expandGroupIds(page.data.elements, ids).map((id) => {
        const element = page.data.elements.find((item) => item.elementId === id);
        if (!element) throw new Error(`Group member ${id} is missing.`);
        return { elementId: id, fields: { bounds: element.bounds, rotation: element.rotation } };
      }),
    };
    onBegin();
  };

  const select = (element: PptdElement, event: ReactPointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('[contenteditable="true"]')) return;
    event.stopPropagation();
    event.currentTarget.focus({ preventScroll: true });
    const targetId = owningGroupId(page.data.elements, element.elementId) ?? element.elementId;
    const ids = event.shiftKey
      ? selectedIds.includes(targetId)
        ? selectedIds.filter((id) => id !== targetId)
        : [...selectedIds, targetId]
      : selectedIds.includes(targetId)
        ? selectedIds
        : [targetId];
    onSelect(ids);
    if (ids.includes(targetId)) startGesture(event, 'move', ids);
  };

  const scaleChanged = useCallback(
    (value: number) => {
      setActualScale(value);
      onScaleChange?.(value);
    },
    [onScaleChange],
  );
  const selected = page.data.elements.filter((item) => selectedIds.includes(item.elementId));

  return (
    <div
      ref={canvasRef}
      tabIndex={-1}
      className="relative h-full min-h-64 w-full outline-none"
      data-hd-editor-canvas
    >
      {editingId && (
        <div
          className="absolute left-1/2 top-2 z-40 flex -translate-x-1/2 gap-0.5 rounded-md border bg-popover p-1 shadow-floating"
          onPointerDown={(event) => event.preventDefault()}
        >
          {(
            [
              ['bold', '加粗', Bold],
              ['italic', '斜体', Italic],
              ['underline', '下划线', Underline],
              ['superscript', '上标', Superscript],
              ['subscript', '下标', Subscript],
            ] as const
          ).map(([command, label, Icon]) => (
            <Button
              key={command}
              variant="ghost"
              size="icon-sm"
              aria-label={label}
              title={label}
              onClick={() => document.execCommand(command)}
            >
              <Icon className="size-3.5" />
            </Button>
          ))}
        </div>
      )}
      <SlideCanvas width={size[0]} height={size[1]} scale={scale} onScaleChange={scaleChanged}>
        <div
          className="relative"
          style={{ width: size[0], height: size[1] }}
          onPointerDown={(event) => {
            if (!(event.target as Element).closest('[data-hd-element-id], [data-hd-selection]')) {
              canvasRef.current?.focus({ preventScroll: true });
              onSelect([]);
              setEditingId(null);
            }
          }}
        >
          <PptdPageRenderer
            page={page}
            size={size}
            theme={theme}
            onElementPointerDown={select}
            onElementFocus={(id) => {
              const groupId = owningGroupId(page.data.elements, id) ?? id;
              if (!selectedIds.includes(groupId)) onSelect([groupId]);
            }}
            onElementDoubleClick={(element) => {
              if (!disabled && element.elementType === 'text') {
                onSelect([element.elementId]);
                setEditingId(element.elementId);
              }
            }}
            renderContent={(element) =>
              element.elementId === editingId ? (
                <InlineTextElement
                  key={element.elementId}
                  element={element}
                  theme={theme}
                  onChange={(text) => onPatch(element.elementId, { 'content.text': text })}
                  onComposition={onComposition}
                  onFinish={() => {
                    setEditingId(null);
                    onFlush();
                  }}
                />
              ) : undefined
            }
          />
          {selected.map((element) => {
            const rect = elementRect(element);
            return (
              <div
                key={element.elementId}
                data-hd-selection={element.elementId}
                className="pointer-events-none absolute"
                style={{
                  left: rect.x,
                  top: rect.y,
                  width: rect.width,
                  height: rect.height,
                  transform: `rotate(${element.rotation ?? 0}deg)`,
                  border: `${1 / actualScale}px solid #cf4a35`,
                  zIndex: 2,
                }}
              >
                {!disabled && selected.length === 1 && !editingId && (
                  <>
                    {(['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as const).map((handle) => (
                      <button
                        key={handle}
                        type="button"
                        aria-label={`调整尺寸 ${handle}`}
                        data-hd-resize={handle}
                        className="pointer-events-auto absolute bg-white"
                        style={{
                          left: handle.includes('w') ? 0 : handle.includes('e') ? '100%' : '50%',
                          top: handle.includes('n') ? 0 : handle.includes('s') ? '100%' : '50%',
                          width: 8 / actualScale,
                          height: 8 / actualScale,
                          border: `${1 / actualScale}px solid #cf4a35`,
                          transform: 'translate(-50%,-50%)',
                          cursor: `${handle}-resize`,
                          padding: 0,
                          touchAction: 'none',
                        }}
                        onPointerDown={(event) =>
                          startGesture(event, 'resize', [element.elementId], handle)
                        }
                      />
                    ))}
                    <div
                      style={{
                        position: 'absolute',
                        left: '50%',
                        top: -24 / actualScale,
                        height: 24 / actualScale,
                        borderLeft: `${1 / actualScale}px solid #cf4a35`,
                      }}
                    />
                    <button
                      type="button"
                      aria-label="旋转对象"
                      data-hd-rotate
                      className="pointer-events-auto absolute rounded-full bg-white"
                      style={{
                        left: '50%',
                        top: -26 / actualScale,
                        width: 10 / actualScale,
                        height: 10 / actualScale,
                        border: `${1 / actualScale}px solid #cf4a35`,
                        transform: 'translate(-50%,-50%)',
                        cursor: 'grab',
                        touchAction: 'none',
                      }}
                      onPointerDown={(event) => startGesture(event, 'rotate', [element.elementId])}
                    />
                  </>
                )}
              </div>
            );
          })}
          {guides.map((guide) => (
            <div
              key={`${guide.axis}-${guide.position}`}
              className="pointer-events-none absolute bg-brand"
              style={
                guide.axis === 'x'
                  ? {
                      left: guide.position,
                      top: guide.start,
                      width: 1 / actualScale,
                      height: guide.end - guide.start,
                      zIndex: 3,
                    }
                  : {
                      top: guide.position,
                      left: guide.start,
                      height: 1 / actualScale,
                      width: guide.end - guide.start,
                      zIndex: 3,
                    }
              }
            />
          ))}
        </div>
      </SlideCanvas>
    </div>
  );
}

function InlineTextElement({
  element,
  theme,
  onChange,
  onComposition,
  onFinish,
}: {
  element: PptdElement;
  theme: PptdTheme;
  onChange: (text: string) => void;
  onComposition: (composing: boolean) => void;
  onFinish: () => void;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const content = textContent(element, theme);
  const initial = useRef(textValue(content.text));
  const rich = useRef(isRichText(initial.current));
  const composing = useRef(false);
  const latest = useRef({ onChange, onComposition, onFinish });
  latest.current = { onChange, onComposition, onFinish };
  const read = () => {
    const editor = editorRef.current;
    if (!editor || composing.current) return;
    if (editor.querySelector('strong,b,em,i,u,s,sup,sub,span,a,ul,ol')) rich.current = true;
    latest.current.onChange(
      rich.current ? sanitizeRichTextHtml(editor.innerHTML) : editor.innerText,
    );
  };

  useLayoutEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    if (rich.current) editor.innerHTML = sanitizeRichTextHtml(initial.current);
    else editor.textContent = initial.current;
    editor.focus({ preventScroll: true });
    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    return () => latest.current.onComposition(false);
  }, []);

  const align = Array.isArray(content.align) ? content.align : ['left', 'top'];
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems:
          align[1] === 'middle' ? 'center' : align[1] === 'bottom' ? 'flex-end' : 'flex-start',
        cursor: 'text',
      }}
    >
      {/* biome-ignore lint/a11y/useSemanticElements: A textarea cannot preserve editable rich text spans. */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-label="编辑文本"
        aria-multiline
        tabIndex={0}
        spellCheck={false}
        data-hd-inline-editor
        className="[&_p]:m-0 [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-6 [&_ol]:pl-6"
        style={{
          ...textCss(content, theme),
          outline: 'none',
          minHeight: '1em',
          userSelect: 'text',
          cursor: 'text',
        }}
        onInput={read}
        onPointerDown={(event) => event.stopPropagation()}
        onCompositionStart={() => {
          composing.current = true;
          onComposition(true);
        }}
        onCompositionEnd={() => {
          composing.current = false;
          read();
          onComposition(false);
        }}
        onBlur={() => {
          if (!composing.current) {
            read();
            onFinish();
          }
        }}
        onPaste={(event) => {
          event.preventDefault();
          document.execCommand('insertText', false, event.clipboardData.getData('text/plain'));
        }}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.nativeEvent.isComposing || event.keyCode === 229) return;
          if (
            event.key === 'Escape' ||
            ((event.ctrlKey || event.metaKey) &&
              (event.key === 'Enter' || event.key.toLowerCase() === 's'))
          ) {
            event.preventDefault();
            read();
            onFinish();
          }
        }}
      />
    </div>
  );
}
