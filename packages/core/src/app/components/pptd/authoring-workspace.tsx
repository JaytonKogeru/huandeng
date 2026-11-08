import {
  type ComponentProps,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { wheelZoomScale } from '@/lib/pptd-viewport-zoom';
import type { PageAnimation } from '../../../pptd/animation-model';
import type { PageTransition } from '../../../pptd/page-transition';
import { AnimationPanel } from './animation-panel';
import { PptdEditorCanvas } from './editor-canvas';

interface AuthoringWorkspaceProps {
  canvas: ComponentProps<typeof PptdEditorCanvas>;
  onZoom?: (scale: number) => void;
  timelineOpen: boolean;
  timelineDisabled: boolean;
  previewResetKey: number;
  onTimelineChange: (
    timeline: PageAnimation | null,
    expectedPageRevision: string,
  ) => Promise<unknown>;
  onTimelineDirty: (dirty: boolean) => void;
  onPreviewModeChange: (active: boolean) => void;
  onTransitionChange?: (
    transition: PageTransition | null,
    expectedPageRevision: string,
  ) => Promise<unknown>;
  onSelectTargets?: (elementIds: string[]) => void;
}

export function AuthoringWorkspace({
  canvas,
  onZoom,
  timelineOpen,
  timelineDisabled,
  previewResetKey,
  onTimelineChange,
  onTimelineDirty,
  onPreviewModeChange,
  onTransitionChange,
  onSelectTargets,
}: AuthoringWorkspaceProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const measuredScale = useRef(canvas.scale ?? 1);
  const zoomAnchor = useRef<{ x: number; y: number; clientX: number; clientY: number } | null>(
    null,
  );
  const onZoomRef = useRef(onZoom);
  onZoomRef.current = onZoom;
  const reportScale = useCallback(
    (value: number) => {
      measuredScale.current = value;
      canvas.onScaleChange?.(value);
    },
    [canvas.onScaleChange],
  );
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const wheel = (event: WheelEvent) => {
      if (!(event.ctrlKey || event.metaKey) || !onZoomRef.current || event.altKey) return;
      const slide = viewport.querySelector<HTMLElement>('[data-osd-canvas]');
      if (!slide) return;
      event.preventDefault();
      event.stopPropagation();
      const rect = slide.getBoundingClientRect();
      const current = measuredScale.current;
      const next = wheelZoomScale(current, event.deltaY, event.deltaMode, viewport.clientHeight);
      if (next === current) return;
      const renderedScale = rect.width / slide.offsetWidth;
      zoomAnchor.current = {
        x: (event.clientX - rect.left) / renderedScale,
        y: (event.clientY - rect.top) / renderedScale,
        clientX: event.clientX,
        clientY: event.clientY,
      };
      measuredScale.current = next;
      onZoomRef.current(next);
    };
    viewport.addEventListener('wheel', wheel, { passive: false });
    return () => viewport.removeEventListener('wheel', wheel);
  }, []);
  useLayoutEffect(() => {
    const anchor = zoomAnchor.current;
    const viewport = viewportRef.current;
    zoomAnchor.current = null;
    if (!anchor || !viewport || canvas.scale === undefined) return;
    const slide = viewport.querySelector<HTMLElement>('[data-osd-canvas]');
    if (!slide) return;
    const rect = slide.getBoundingClientRect();
    viewport.scrollLeft += rect.left + anchor.x * canvas.scale - anchor.clientX;
    viewport.scrollTop += rect.top + anchor.y * canvas.scale - anchor.clientY;
  }, [canvas.scale]);
  const [preview, setPreview] = useState<{ timeMs: number; timeline: PageAnimation } | null>(null);
  const showPreview = useCallback((timeMs: number | null, timeline: PageAnimation | null) => {
    setPreview(timeMs === null || !timeline ? null : { timeMs, timeline });
  }, []);
  const active = timelineOpen && preview !== null;
  useEffect(() => {
    onPreviewModeChange(active);
  }, [active, onPreviewModeChange]);
  useEffect(() => () => onPreviewModeChange(false), [onPreviewModeChange]);
  const identity = `${canvas.page.pageId}:${canvas.page.occurrenceId ?? ''}:${canvas.page.versionId ?? ''}`;
  useEffect(() => {
    void identity;
    setPreview(null);
  }, [identity]);
  const previewTimeline = active ? preview?.timeline : null;
  const renderedPage = useMemo(
    () =>
      previewTimeline
        ? { ...canvas.page, data: { ...canvas.page.data, timeline: previewTimeline } }
        : canvas.page,
    [canvas.page, previewTimeline],
  );
  return (
    <div className="flex min-h-0 flex-1 flex-col" data-hd-authoring-workspace>
      <div
        ref={viewportRef}
        className="relative min-h-0 flex-1 overflow-auto p-6 md:p-8"
        data-hd-canvas-viewport
      >
        <div
          className="relative h-full w-full"
          style={
            canvas.scale === undefined
              ? undefined
              : {
                  minWidth: `max(100%, ${canvas.size[0] * canvas.scale}px)`,
                  minHeight: `max(100%, ${canvas.size[1] * canvas.scale}px)`,
                }
          }
        >
          <PptdEditorCanvas
            {...canvas}
            onScaleChange={reportScale}
            key={identity}
            page={renderedPage}
            previewTimeMs={active ? preview?.timeMs : null}
            disabled={canvas.disabled || active}
            selectedIds={active ? [] : canvas.selectedIds}
            insertionTool={active ? null : canvas.insertionTool}
            autoEditId={active ? null : canvas.autoEditId}
          />
        </div>
      </div>
      {timelineOpen && (
        <AnimationPanel
          page={canvas.page}
          selectedIds={canvas.selectedIds}
          disabled={timelineDisabled}
          previewResetKey={previewResetKey}
          onChange={onTimelineChange}
          onPreview={showPreview}
          onDirtyChange={onTimelineDirty}
          onTransitionChange={onTransitionChange}
          onSelectTargets={onSelectTargets}
        />
      )}
    </div>
  );
}
