import { type ComponentProps, useCallback, useEffect, useMemo, useState } from 'react';
import type { PageAnimation } from '../../../pptd/animation-model';
import type { PageTransition } from '../../../pptd/page-transition';
import { AnimationPanel } from './animation-panel';
import { PptdEditorCanvas } from './editor-canvas';

interface AuthoringWorkspaceProps {
  canvas: ComponentProps<typeof PptdEditorCanvas>;
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
  timelineOpen,
  timelineDisabled,
  previewResetKey,
  onTimelineChange,
  onTimelineDirty,
  onPreviewModeChange,
  onTransitionChange,
  onSelectTargets,
}: AuthoringWorkspaceProps) {
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
      <div className="relative min-h-0 flex-1 overflow-auto p-6 md:p-8" data-hd-canvas-viewport>
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
