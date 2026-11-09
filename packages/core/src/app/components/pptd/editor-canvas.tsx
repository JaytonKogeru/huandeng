import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { useHuandengLocale } from '@/lib/huandeng-locale';
import {
  type GapGuide,
  type Guide,
  type Rect,
  type ResizeHandle,
  resizeRect,
  type SnapTargets,
  snapMoveWithSpacing,
  snapResize,
  unionRects,
} from '@/lib/inspector/geometry';
import { capturePointerGesture } from '@/lib/pointer-gesture';
import { elementLabel } from '@/lib/pptd-element-label';
import {
  elementRect,
  elementVisualRect,
  rectBounds,
  rootSelectedElements,
  snapTargetsForSelection,
} from '@/lib/pptd-geometry';
import type { InsertionTool } from '@/lib/pptd-insertion';
import {
  cycleItemId,
  type EditorKeyboardCommand,
  editorKeyboardScope,
  topLevelElementIds,
} from '@/lib/pptd-keyboard';
import { expandGroupIds, owningGroupId } from '../../../pptd/grouping';
import { isMainPositionField } from '../../../pptd/position-field';
import type { Bounds, PageSize, PageSnapshot, PptdElement } from '../../../pptd/types';
import { SlideCanvas } from '../slide-canvas';
import { ContextMenu, ContextMenuTrigger } from '../ui/context-menu';
import { InlineTextElement } from './inline-text-element';
import { InsertionLayer } from './insertion-layer';
import { ObjectContextMenuContent } from './object-context-menu';
import { numberValue, PptdPageRenderer, type PptdTheme } from './renderer';

export {
  arrangeElementBounds as alignedBounds,
  elementRect,
  rectBounds,
} from '@/lib/pptd-geometry';

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
  onCommand?: (command: EditorKeyboardCommand) => void;
  disabled?: boolean;
  snapEnabled?: boolean;
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
  selectionRect: Rect;
  targets: SnapTargets;
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

export function PptdEditorCanvas({
  page,
  size,
  theme: inheritedTheme,
  selectedIds,
  onSelect,
  onPatch,
  onBegin,
  onEnd,
  onCancel,
  onFlush,
  onComposition,
  onCommand,
  disabled = false,
  snapEnabled = true,
  scale,
  onScaleChange,
  insertionTool,
  onPlace,
  autoEditId,
  previewTimeMs,
}: Props) {
  const { t, number: formatNumber } = useHuandengLocale();
  const theme =
    page.metadata.themeOverride &&
    typeof page.metadata.themeOverride === 'object' &&
    !Array.isArray(page.metadata.themeOverride)
      ? (page.metadata.themeOverride as PptdTheme)
      : inheritedTheme;
  const [actualScale, setActualScale] = useState(1);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [gapGuides, setGapGuides] = useState<GapGuide[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const autoEditConsumed = useRef<string | null>(null);
  const gestureRef = useRef<Gesture | null>(null);
  const cancelGestureRef = useRef<(() => void) | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const leaveCanvasOnTab = useRef(false);
  const focusedElementId = useRef<string | null>(null);
  const latest = useRef({ page, snapEnabled, onPatch, onEnd, onCancel, onSelect });
  latest.current = { page, snapEnabled, onPatch, onEnd, onCancel, onSelect };

  useEffect(() => {
    if (
      autoEditId &&
      autoEditConsumed.current !== autoEditId &&
      page.data.elements.some(
        (element) => element.elementId === autoEditId && !isMainPositionField(element),
      )
    ) {
      autoEditConsumed.current = autoEditId;
      setEditingId(autoEditId);
    }
  }, [autoEditId, page.data.elements]);

  useEffect(() => {
    if (
      editingId &&
      (!selectedIds.includes(editingId) ||
        page.data.elements.some(
          (element) => element.elementId === editingId && isMainPositionField(element),
        ))
    )
      setEditingId(null);
  }, [editingId, selectedIds, page.data.elements]);

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
      const horizontal = event.shiftKey && Math.abs(dx) >= Math.abs(dy);
      const vertical = event.shiftKey && !horizontal;
      if (event.shiftKey) {
        if (horizontal) dy = 0;
        else dx = 0;
      }
      const snap =
        event.altKey || !latest.current.snapEnabled
          ? { delta: { x: dx, y: dy }, guides: [], gapGuides: [] }
          : snapMoveWithSpacing(
              gesture.selectionRect,
              { x: dx, y: dy },
              gesture.targets,
              5 / gesture.scale,
              { x: !vertical, y: !horizontal },
            );
      setGuides(snap.guides);
      setGapGuides(snap.gapGuides);
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
      const handle = gesture.handle ?? 'se';
      const lockAspect = event.shiftKey || isGroup;
      const resize =
        latest.current.snapEnabled && !event.altKey && Math.abs(item.rotation % 360) < 1e-8
          ? snapResize(
              item.rect,
              handle,
              localDelta,
              gesture.targets.rects,
              5 / gesture.scale,
              lockAspect,
            )
          : { rect: resizeRect(item.rect, handle, localDelta, lockAspect), guides: [] };
      const rect = resize.rect;
      setGuides(resize.guides);
      setGapGuides([]);
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
    clickSelection?: string[],
  ) => {
    if (disabled || event.button !== 0 || !event.isPrimary || gestureRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    const roots = rootSelectedElements(page.data.elements, ids);
    const selectionRect = unionRects(roots.map(elementVisualRect));
    if (!selectionRect) return;
    const elements = roots.map((item) => ({
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
      selectionRect,
      targets: snapTargetsForSelection(
        page.data.elements,
        roots.map((item) => item.elementId),
        size,
      ),
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
        setGapGuides([]);
        if (cancelled) latest.current.onCancel(gesture.originals);
        else {
          latest.current.onEnd();
          if (!gesture.moved && clickSelection) latest.current.onSelect(clickSelection);
        }
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
    const toggleOff = event.shiftKey && selectedIds.includes(targetId);
    const deferToggle = toggleOff && !disabled && event.button === 0;
    const ids = event.shiftKey
      ? selectedIds.includes(targetId)
        ? deferToggle
          ? selectedIds
          : selectedIds.filter((id) => id !== targetId)
        : [...selectedIds, targetId]
      : selectedIds.includes(targetId)
        ? selectedIds
        : [targetId];
    onSelect(ids);
    if (ids.includes(targetId))
      startGesture(
        event,
        'move',
        ids,
        undefined,
        deferToggle ? selectedIds.filter((id) => id !== targetId) : undefined,
      );
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
    <ContextMenu>
      <ContextMenuTrigger className="contents">
        <div
          ref={canvasRef}
          role="application"
          // biome-ignore lint/a11y/noNoninteractiveTabindex: The authoring canvas is a composite keyboard widget with one stable native focus entry.
          tabIndex={0}
          aria-label={t('幻灯片画布')}
          aria-describedby="hd-canvas-keyboard-hint"
          className="relative h-full min-h-0 w-full outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/60 [&_[data-hd-element-id]:focus-visible]:ring-2 [&_[data-hd-element-id]:focus-visible]:ring-brand/50"
          data-hd-editor-canvas
          data-hd-snapping={snapEnabled}
          data-hd-focus-region="canvas"
          onContextMenu={(event) => {
            if (editingId || !onCommand || editorKeyboardScope(event.target) === 'input') {
              event.stopPropagation();
              return;
            }
            const hit = (event.target as HTMLElement).closest<HTMLElement>(
              '[data-hd-element-id], [data-hd-selection]',
            );
            const id = hit?.dataset.hdElementId ?? hit?.dataset.hdSelection;
            const targetId = id ? (owningGroupId(page.data.elements, id) ?? id) : null;
            if (!targetId) onSelect([]);
            else if (!selectedIds.includes(targetId)) onSelect([targetId]);
          }}
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
            if (
              onCommand &&
              (event.key === 'ContextMenu' || (event.key === 'F10' && event.shiftKey))
            ) {
              event.preventDefault();
              event.stopPropagation();
              const target = selectedIds[0]
                ? canvasRef.current?.querySelector<HTMLElement>(
                    `[data-hd-element-id="${CSS.escape(selectedIds[0])}"]`,
                  )
                : canvasRef.current;
              const rect = target?.getBoundingClientRect();
              target?.dispatchEvent(
                new MouseEvent('contextmenu', {
                  bubbles: true,
                  cancelable: true,
                  clientX: rect ? rect.left + Math.min(rect.width / 2, 40) : 0,
                  clientY: rect ? rect.top + Math.min(rect.height / 2, 40) : 0,
                  button: 2,
                }),
              );
              return;
            }
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
                (element) =>
                  element.elementId === selectedIds[0] &&
                  element.elementType === 'text' &&
                  !isMainPositionField(element),
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
            {t(
              'Tab 切换对象，方向键移动，Enter 编辑文字。Esc 清除选区后 Tab 离开画布，F6 切换面板。',
            )}
          </p>
          <SlideCanvas width={size[0]} height={size[1]} scale={scale} onScaleChange={scaleChanged}>
            <div
              className="relative"
              style={{ width: size[0], height: size[1] }}
              onPointerDown={(event) => {
                if (!event.isPrimary || gestureRef.current) return;
                if (
                  !(event.target as Element).closest('[data-hd-element-id], [data-hd-selection]')
                ) {
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
                  `${elementLabel(element)} · ${isMainPositionField(element) ? t('Slide Position field') : t(element.elementType === 'text' ? 'Enter 编辑文字' : '幻灯片对象')}`
                }
                onElementPointerDown={select}
                onElementFocus={(id) => {
                  if (gestureRef.current) return;
                  if (selectedIds.includes(id)) return;
                  const groupId = owningGroupId(page.data.elements, id) ?? id;
                  if (!selectedIds.includes(groupId)) onSelect([groupId]);
                }}
                onElementDoubleClick={(element) => {
                  if (
                    !disabled &&
                    element.elementType === 'text' &&
                    !isMainPositionField(element)
                  ) {
                    onSelect([element.elementId]);
                    setEditingId(element.elementId);
                  }
                }}
                renderContent={(element) =>
                  element.elementId === editingId && !isMainPositionField(element) ? (
                    <InlineTextElement
                      key={element.elementId}
                      element={element}
                      theme={theme}
                      toolbarTarget={canvasRef.current}
                      selectAll={element.elementId === autoEditId}
                      onChange={(text) => onPatch(element.elementId, { 'content.text': text })}
                      onComposition={onComposition}
                      onFinish={(restoreFocus) => {
                        setEditingId(null);
                        onFlush();
                        if (restoreFocus)
                          requestAnimationFrame(() => focusObject(element.elementId));
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
                            aria-label={t('调整尺寸 {handle}', { handle })}
                            data-hd-resize={handle}
                            className="pointer-events-auto absolute bg-white"
                            style={{
                              left: handle.includes('w')
                                ? 0
                                : handle.includes('e')
                                  ? '100%'
                                  : '50%',
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
                          aria-label={t('旋转对象')}
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
                          onPointerDown={(event) =>
                            startGesture(event, 'rotate', [element.elementId])
                          }
                        />
                      </>
                    )}
                  </div>
                );
              })}
              {guides.map((guide) => (
                <div
                  key={`${guide.axis}-${guide.position}`}
                  data-hd-snap-guide={guide.axis}
                  data-hd-guide-position={guide.position}
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
              {gapGuides.length > 0 && (
                <svg
                  className="pointer-events-none absolute inset-0 overflow-visible"
                  width={size[0]}
                  height={size[1]}
                  aria-hidden="true"
                  style={{ zIndex: 3 }}
                >
                  {gapGuides.map((guide) => {
                    const horizontal = guide.axis === 'x';
                    const x1 = horizontal ? guide.start : guide.position;
                    const x2 = horizontal ? guide.end : guide.position;
                    const y1 = horizontal ? guide.position : guide.start;
                    const y2 = horizontal ? guide.position : guide.end;
                    const cap = 3 / actualScale;
                    return (
                      <g
                        key={`${guide.axis}-${guide.position}-${guide.start}-${guide.end}`}
                        data-hd-gap-guide={guide.axis}
                        data-hd-gap-distance={guide.distance}
                        stroke="var(--brand)"
                        strokeWidth={1 / actualScale}
                      >
                        <line
                          x1={x1}
                          y1={y1}
                          x2={x2}
                          y2={y2}
                          strokeDasharray={`${3 / actualScale} ${2 / actualScale}`}
                        />
                        <line
                          x1={x1 - (horizontal ? 0 : cap)}
                          x2={x1 + (horizontal ? 0 : cap)}
                          y1={y1 - (horizontal ? cap : 0)}
                          y2={y1 + (horizontal ? cap : 0)}
                        />
                        <line
                          x1={x2 - (horizontal ? 0 : cap)}
                          x2={x2 + (horizontal ? 0 : cap)}
                          y1={y2 - (horizontal ? cap : 0)}
                          y2={y2 + (horizontal ? cap : 0)}
                        />
                        <text
                          x={(x1 + x2) / 2 + (horizontal ? 0 : 6 / actualScale)}
                          y={(y1 + y2) / 2 - (horizontal ? 5 / actualScale : 0)}
                          textAnchor={horizontal ? 'middle' : 'start'}
                          dominantBaseline={horizontal ? 'auto' : 'central'}
                          fontSize={10 / actualScale}
                          fill="var(--brand)"
                          stroke="var(--background)"
                          strokeWidth={3 / actualScale}
                          paintOrder="stroke"
                        >
                          {formatNumber(Math.round(guide.distance * 100) / 100)}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              )}
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
      </ContextMenuTrigger>
      <ObjectContextMenuContent
        selected={selected}
        theme={theme}
        disabled={disabled}
        onCommand={onCommand}
        focusTarget={() =>
          (selectedIds[0]
            ? canvasRef.current?.querySelector<HTMLElement>(
                `[data-hd-element-id="${CSS.escape(selectedIds[0])}"]`,
              )
            : null) ?? canvasRef.current
        }
      />
    </ContextMenu>
  );
}
