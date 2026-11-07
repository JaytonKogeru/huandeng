import { ArrowLeft, ArrowRight, FileText, Pause, Play, RotateCcw, X } from 'lucide-react';
import { memo, type Ref, useImperativeHandle } from 'react';
import type { PageSize, PageSnapshot } from '../../../pptd/types';
import { usePresentationPlayback } from '../../lib/pptd-playback';
import { SlideCanvas } from '../slide-canvas';
import { PptdPageRenderer, type PptdTheme } from './renderer';

export interface PresentationControls {
  next: () => boolean;
  previous: () => boolean;
}

interface PresentationViewProps {
  page: PageSnapshot;
  nextPage?: PageSnapshot;
  size: PageSize;
  theme: PptdTheme;
  pageIndex: number;
  pageCount: number;
  notesOpen: boolean;
  onNotesToggle: () => void;
  onStep: (direction: number) => void;
  onClose: () => void;
  controlsRef: Ref<PresentationControls>;
}

const NextPagePreview = memo(function NextPagePreview({
  page,
  size,
  theme,
}: {
  page: PageSnapshot;
  size: PageSize;
  theme: PptdTheme;
}) {
  return (
    <div
      data-hd-presenter-next={page.pageId}
      className="overflow-hidden rounded border border-white/15"
      style={{ aspectRatio: `${size[0]} / ${size[1]}` }}
    >
      <SlideCanvas width={size[0]} height={size[1]} flat freezeMotion>
        <PptdPageRenderer page={page} size={size} theme={theme} />
      </SlideCanvas>
    </div>
  );
});

export function PresentationView({
  page,
  nextPage,
  size,
  theme,
  pageIndex,
  pageCount,
  notesOpen,
  onNotesToggle,
  onStep,
  onClose,
  controlsRef,
}: PresentationViewProps) {
  const playback = usePresentationPlayback(page, true);
  useImperativeHandle(controlsRef, () => ({ next: playback.next, previous: playback.previous }), [
    playback.next,
    playback.previous,
  ]);
  const step = (direction: number) => {
    if (!(direction > 0 ? playback.next() : playback.previous())) onStep(direction);
  };
  const time = playback.timeMs ?? 0;
  const currentCue = [...(playback.timeline?.cues ?? [])]
    .filter((cue) => cue.timeMs <= time)
    .sort((a, b) => b.timeMs - a.timeMs)[0];
  return (
    <section
      className="fixed inset-0 z-50 flex flex-col bg-black outline-none"
      data-hd-presenter
      aria-label="演示模式"
      tabIndex={-1}
    >
      <div className="flex min-h-0 flex-1">
        <div
          className="min-w-0 flex-1 p-4"
          data-hd-presenter-slide={page.pageId}
          data-hd-presenter-occurrence={page.occurrenceId}
        >
          <SlideCanvas width={size[0]} height={size[1]} flat>
            <PptdPageRenderer
              page={page}
              size={size}
              theme={theme}
              previewTimeMs={playback.timeMs}
            />
          </SlideCanvas>
        </div>
        {notesOpen && (
          <aside
            id="hd-presenter-notes"
            aria-label="演讲者备注"
            data-hd-presenter-notes={page.pageId}
            className="flex w-80 max-w-[40vw] shrink-0 flex-col border-l border-white/15 bg-zinc-950 px-5 py-5 text-zinc-100"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-sm font-medium">演讲者备注</h2>
              <span className="font-mono text-xs text-zinc-400" data-hd-presenter-code>
                {page.shortCode ?? page.metadata.label ?? '未编号'} · {pageIndex + 1}
              </span>
            </div>
            <div
              className="min-h-0 flex-1 overflow-y-auto whitespace-pre-wrap break-words text-sm leading-relaxed text-zinc-200"
              data-hd-presenter-note-text
              aria-live="polite"
            >
              {page.data.notes?.trim() ? page.data.notes : '这一页暂无演讲备注。'}
            </div>
            <div className="mt-5 shrink-0 border-t border-white/15 pt-4">
              {nextPage ? (
                <>
                  <div className="mb-2 flex items-center justify-between text-xs text-zinc-400">
                    <span>下一页</span>
                    <span className="font-mono">
                      {nextPage.shortCode ?? nextPage.metadata.label ?? '未编号'}
                    </span>
                  </div>
                  <NextPagePreview page={nextPage} size={size} theme={theme} />
                </>
              ) : (
                <p className="text-xs text-zinc-400" data-hd-presenter-end>
                  已到最后一页
                </p>
              )}
            </div>
          </aside>
        )}
      </div>
      {playback.timeline && (
        <div
          className="mx-auto flex w-full max-w-3xl shrink-0 items-center gap-3 px-6 pt-2 text-xs text-zinc-300"
          data-hd-presenter-timeline
        >
          <button
            type="button"
            aria-label={playback.playing ? '暂停动画' : '播放至下一提示点'}
            onClick={playback.toggle}
            className="rounded p-1.5 hover:bg-white/10"
          >
            {playback.playing ? <Pause className="size-4" /> : <Play className="size-4" />}
          </button>
          <button
            type="button"
            aria-label="动画回到起点"
            onClick={() => playback.seek(0)}
            className="rounded p-1.5 hover:bg-white/10"
          >
            <RotateCcw className="size-3.5" />
          </button>
          <input
            type="range"
            aria-label="放映动画时间"
            min={0}
            max={playback.timeline.durationMs}
            step={1}
            value={Math.round(time)}
            onChange={(event) => playback.seek(Number(event.target.value))}
            className="min-w-12 flex-1 accent-white"
          />
          <span className="w-24 text-right font-mono tabular-nums">
            {(time / 1000).toFixed(1)} / {(playback.timeline.durationMs / 1000).toFixed(1)}s
          </span>
          {currentCue && (
            <span className="max-w-40 truncate" title={currentCue.label}>
              {currentCue.label}
            </span>
          )}
        </div>
      )}
      <div className="flex h-12 shrink-0 items-center justify-center gap-5 text-white">
        <button
          type="button"
          aria-label="演讲者备注"
          aria-pressed={notesOpen}
          aria-controls={notesOpen ? 'hd-presenter-notes' : undefined}
          data-hd-presenter-notes-toggle
          className="absolute left-6 flex items-center gap-2 rounded px-2 py-1 text-xs text-zinc-300 hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-white"
          onClick={onNotesToggle}
        >
          <FileText className="size-4" />
          备注
        </button>
        <button
          type="button"
          aria-label={playback.timeline ? '上一步' : '上一页'}
          disabled={pageIndex <= 0 && time <= 0}
          onClick={() => step(-1)}
          className="rounded p-2 hover:bg-white/10 disabled:opacity-30"
        >
          <ArrowLeft className="size-4" />
        </button>
        <span className="font-mono text-xs">
          {pageIndex + 1} / {pageCount} · {page.shortCode ?? page.metadata.label}
        </span>
        <button
          type="button"
          aria-label={playback.timeline ? '下一步' : '下一页'}
          disabled={
            pageIndex >= pageCount - 1 &&
            (!playback.timeline || time >= playback.timeline.durationMs)
          }
          onClick={() => step(1)}
          className="rounded p-2 hover:bg-white/10 disabled:opacity-30"
        >
          <ArrowRight className="size-4" />
        </button>
        <button
          type="button"
          aria-label="退出演示"
          className="absolute right-6 rounded p-2 hover:bg-white/10"
          onClick={onClose}
        >
          <X className="size-4" />
        </button>
      </div>
    </section>
  );
}
