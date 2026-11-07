import { type ComponentProps, useCallback, useEffect, useMemo, useState } from 'react';
import type { PageTimeline } from '../../../pptd/animation-model';
import { PptdEditorCanvas } from './editor-canvas';
import { TimelinePanel } from './timeline-panel';

interface AuthoringWorkspaceProps {
  canvas: ComponentProps<typeof PptdEditorCanvas>;
  timelineOpen: boolean;
  timelineDisabled: boolean;
  previewResetKey: number;
  onTimelineChange: (
    timeline: PageTimeline | null,
    expectedPageRevision: string,
  ) => Promise<unknown>;
  onTimelineDirty: (dirty: boolean) => void;
  onPreviewModeChange: (active: boolean) => void;
}

export function AuthoringWorkspace({
  canvas,
  timelineOpen,
  timelineDisabled,
  previewResetKey,
  onTimelineChange,
  onTimelineDirty,
  onPreviewModeChange,
}: AuthoringWorkspaceProps) {
  const [preview, setPreview] = useState<{ timeMs: number; timeline: PageTimeline } | null>(null);
  const showPreview = useCallback((timeMs: number | null, timeline: PageTimeline | null) => {
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
      <div className="relative min-h-0 flex-1 overflow-auto p-6 md:p-8">
        {active && (
          <p
            className="pointer-events-none absolute left-4 top-2 z-10 rounded bg-background/90 px-2 py-1 text-[10px] text-muted-foreground"
            role="status"
          >
            动画预览 · 在时间线中返回基础版式可继续排版
          </p>
        )}
        <PptdEditorCanvas
          {...canvas}
          key={identity}
          page={renderedPage}
          previewTimeMs={active ? preview?.timeMs : null}
          disabled={canvas.disabled || active}
          selectedIds={active ? [] : canvas.selectedIds}
          insertionTool={active ? null : canvas.insertionTool}
          autoEditId={active ? null : canvas.autoEditId}
        />
      </div>
      {timelineOpen && (
        <TimelinePanel
          page={canvas.page}
          selectedIds={canvas.selectedIds}
          disabled={timelineDisabled}
          previewResetKey={previewResetKey}
          onChange={onTimelineChange}
          onPreview={showPreview}
          onDirtyChange={onTimelineDirty}
        />
      )}
    </div>
  );
}
