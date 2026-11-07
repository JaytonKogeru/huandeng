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
import { capturePointerGesture } from '@/lib/pointer-gesture';
import { elementLabel } from '@/lib/pptd-element-label';
import type { InsertionTool } from '@/lib/pptd-insertion';
import { cycleItemId, editorKeyboardScope, topLevelElementIds } from '@/lib/pptd-keyboard';
import { expandGroupIds, owningGroupId } from '../../../pptd/grouping';
import type { Bounds, PageSize, PageSnapshot, PptdElement } from '../../../pptd/types';
import { SlideCanvas } from '../slide-canvas';
import { Button } from '../ui/button';
import { InsertionLayer } from './insertion-layer';
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
  insertionTool?: InsertionTool | null;
  onPlace?: (element: PptdElement) => void;
  autoEditId?: string | null;
  previewTimeMs?: number | null;
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
  insertionTool,
  onPlace,
  autoEditId,
  previewTimeMs,
}: Props) {
  const [actualScale, setActualScale] = useState(1);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const autoEditConsumed = useRef<string | null>(null);
  const gestureRef = useRef<Gesture | null>(null);
  const cancelGestureRef = useRef<(() => void) | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const leaveCanvasOnTab = useRef(false);
  const focusedElementId = useRef<string | null>(null);
  const latest = useRef({ page, size, onPatch, onEnd, onCancel });
  latest.current = { page, size, onPatch, onEnd, onCancel };

  useEffect(() => {
    if (
      autoEditId &&
      autoEditConsumed.current !== autoEditId &&
      page.data.elements.some((element) => element.elementId === autoEditId)
    ) {
      autoEditConsumed.current = autoEditId;
      setEditingId(autoEditId);
    }
  }, [autoEditId, page.data.elements]);

  useEffect(() => {
    if (editingId && !selectedIds.includes(editingId)) setEditingId(null);
  }, [editingId, selectedIds]);

  useLayoutEffect(() => {
    if (
      !focusedElementId.current ||
      page.data.elements.some((element) => element.elementId === focusedElementId.current)
    )
      return;
    focusedElementId.current = null;
    if (document.activeElement === document.body && document.hasFocus())
      canvasRef.current?.focus({ preventScroll: true });
  }, [page.data.elements]);

  const moveGesture = (event: PointerEvent) => {
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
      const angle = Math.atan2(event.clientY - gesture.center.y, event.clientX - gesture.center.x);
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

  useEffect(() => () => cancelGestureRef.current?.(), []);

  const startGesture = (
    event: ReactPointerEvent<HTMLElement>,
    kind: Gesture['kind'],
    ids: string[],
    handle?: ResizeHandle,
  ) => {
    if (disabled || event.button !== 0 || !event.isPrimary || gestureRef.current) return;
    event.preventDefault();
    event.stopPropagation();
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
    const gesture: Gesture = {
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
    const cancel = capturePointerGesture({
      target: event.currentTarget,
      pointerId: event.pointerId,
      onMove: moveGesture,
      onFinish: (cancelled) => {
        gestureRef.current = null;
        cancelGestureRef.current = null;
        setGuides([]);
        if (cancelled) latest.current.onCancel(gesture.originals);
        else latest.current.onEnd();
      },
    });
    gestureRef.current = gesture;
    cancelGestureRef.current = cancel;
    onBegin();
  };

  const select = (element: PptdElement, event: ReactPointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary || gestureRef.current) return;
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
  const topLevelIds = topLevelElementIds(page.data.elements);
  const tabStopId =
    topLevelIds.find((id) => selectedIds.includes(id)) ??
    (selectedIds[0] ? owningGroupId(page.data.elements, selectedIds[0]) : undefined) ??
    undefined;

  const focusObject = (id: string) => {
    canvasRef.current
      ?.querySelector<HTMLElement>(`[data-hd-element-id="${CSS.escape(id)}"]`)
      ?.focus({ preventScroll: true });
  };

  return (
    <div
      ref={canvasRef}
      role="application"
      // biome-ignore lint/a11y/noNoninteractiveTabindex: The authoring canvas is a composite keyboard widget with one stable native focus entry.
      tabIndex={0}
      aria-label="幻灯片画布"
      aria-describedby="hd-canvas-keyboard-hint"
      className="relative h-full min-h-0 w-full outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/60 [&_[data-hd-element-id]:focus-visible]:ring-2 [&_[data-hd-element-id]:focus-visible]:ring-brand/50"
      data-hd-editor-canvas
      data-hd-focus-region="canvas"
      onFocusCapture={(event) => {
        focusedElementId.current =
          (event.target as HTMLElement).closest<HTMLElement>('[data-hd-element-id]')?.dataset
            .hdElementId ?? null;
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          leaveCanvasOnTab.current = false;
          if (event.relatedTarget) focusedElementId.current = null;
        }
      }}
      onKeyDown={(event) => {
        if (
          event.defaultPrevented ||
          event.nativeEvent.isComposing ||
          event.keyCode === 229 ||
          event.ctrlKey ||
          event.metaKey ||
          event.altKey ||
          editorKeyboardScope(event.target) !== 'canvas'
        )
          return;
        if (event.key === 'Escape' && gestureRef.current) {
          event.preventDefault();
          event.stopPropagation();
          cancelGestureRef.current?.();
          return;
        }
        if (
          event.key === 'Enter' &&
          event.target === event.currentTarget &&
          !disabled &&
          selectedIds.length === 1 &&
          page.data.elements.some(
            (element) => element.elementId === selectedIds[0] && element.elementType === 'text',
          )
        ) {
          event.preventDefault();
          event.stopPropagation();
          setEditingId(selectedIds[0]);
          return;
        }
        if (event.key === 'Escape' && !insertionTool) {
          event.preventDefault();
          event.stopPropagation();
          leaveCanvasOnTab.current = true;
          onSelect([]);
          canvasRef.current?.focus({ preventScroll: true });
          return;
        }
        if (event.key !== 'Tab') return;
        if (leaveCanvasOnTab.current) {
          leaveCanvasOnTab.current = false;
          return;
        }
        const focusedId = (event.target as Element).closest<HTMLElement>('[data-hd-element-id]')
          ?.dataset.hdElementId;
        const currentId = focusedId
          ? (owningGroupId(page.data.elements, focusedId) ?? focusedId)
          : tabStopId;
        const next = cycleItemId(topLevelIds, currentId, event.shiftKey ? -1 : 1);
        if (!next) return;
        event.preventDefault();
        event.stopPropagation();
        onSelect([next]);
        focusObject(next);
      }}
    >
      <p id="hd-canvas-keyboard-hint" className="sr-only">
        Tab 切换对象，方向键移动，Enter 编辑文字。Esc 清除选区后 Tab 离开画布，F6 切换面板。
      </p>
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
            if (!event.isPrimary || gestureRef.current) return;
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
            previewTimeMs={previewTimeMs}
            elementTabIndex={() => -1}
            elementLabel={(element) =>
              `${elementLabel(element)} · ${element.elementType === 'text' ? 'Enter 编辑文字' : '幻灯片对象'}`
            }
            onElementPointerDown={select}
            onElementFocus={(id) => {
              if (gestureRef.current) return;
              if (selectedIds.includes(id)) return;
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
                  selectAll={element.elementId === autoEditId}
                  onChange={(text) => onPatch(element.elementId, { 'content.text': text })}
                  onComposition={onComposition}
                  onFinish={(restoreFocus) => {
                    setEditingId(null);
                    onFlush();
                    if (restoreFocus) requestAnimationFrame(() => focusObject(element.elementId));
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
                  border: `${1 / actualScale}px solid var(--brand)`,
                  zIndex: 2,
                }}
              >
                {!disabled && selected.length === 1 && !editingId && (
                  <>
                    {(['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as const).map((handle) => (
                      <button
                        key={handle}
                        type="button"
                        tabIndex={-1}
                        aria-label={`调整尺寸 ${handle}`}
                        data-hd-resize={handle}
                        className="pointer-events-auto absolute bg-white"
                        style={{
                          left: handle.includes('w') ? 0 : handle.includes('e') ? '100%' : '50%',
                          top: handle.includes('n') ? 0 : handle.includes('s') ? '100%' : '50%',
                          width: 8 / actualScale,
                          height: 8 / actualScale,
                          border: `${1 / actualScale}px solid var(--brand)`,
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
                        borderLeft: `${1 / actualScale}px solid var(--brand)`,
                      }}
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      aria-label="旋转对象"
                      data-hd-rotate
                      className="pointer-events-auto absolute rounded-full bg-white"
                      style={{
                        left: '50%',
                        top: -26 / actualScale,
                        width: 10 / actualScale,
                        height: 10 / actualScale,
                        border: `${1 / actualScale}px solid var(--brand)`,
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
          {insertionTool && !disabled && onPlace && (
            <InsertionLayer
              key={JSON.stringify(insertionTool)}
              tool={insertionTool}
              size={size}
              onPlace={onPlace}
            />
          )}
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
  selectAll = false,
}: {
  element: PptdElement;
  theme: PptdTheme;
  onChange: (text: string) => void;
  onComposition: (composing: boolean) => void;
  onFinish: (restoreFocus: boolean) => void;
  selectAll?: boolean;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const content = textContent(element, theme);
  const initial = useRef(textValue(content.text));
  const selectInitial = useRef(selectAll);
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
    if (!selectInitial.current) range.collapse(false);
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
            onFinish(false);
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
            onFinish(true);
          }
        }}
      />
    </div>
  );
}
