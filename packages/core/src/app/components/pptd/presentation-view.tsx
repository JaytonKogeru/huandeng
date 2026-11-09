import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  FileText,
  Maximize,
  Minimize,
  MonitorOff,
  Pause,
  Play,
  RotateCcw,
  X,
} from 'lucide-react';
import {
  memo,
  type Ref,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { desktopHost } from '@/lib/huandeng-desktop';
import { uiText as t, useHuandengLocale } from '@/lib/huandeng-locale';
import { readPageTransition } from '../../../pptd/page-transition';
import type { PageSize, PageSnapshot } from '../../../pptd/types';
import { animationStepLabel } from '../../lib/pptd-animation-label';
import { usePresentationPlayback } from '../../lib/pptd-playback';
import { SlideCanvas } from '../slide-canvas';
import { PptdPageRenderer, type PptdTheme } from './renderer';

export interface PresentationControls {
  pause: () => void;
  next: () => boolean;
  previous: () => boolean;
  toggleBlackout: () => void;
  toggleFullscreen: () => void;
  seekBoundary: (end: boolean) => void;
}
interface PresentationViewProps {
  page: PageSnapshot;
  nextPage?: PageSnapshot;
  size: PageSize;
  theme: PptdTheme;
  pageIndex: number;
  pageCount: number;
  notesOpen: boolean;
  initialPosition?: 'start' | 'end';
  sessionId?: number;
  canStep?: () => boolean;
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
        <PptdPageRenderer page={page} size={size} theme={theme} previewTimeMs={0} />
      </SlideCanvas>
    </div>
  );
});
const buttonClass =
  'rounded-md p-2 text-zinc-200 outline-none transition-colors hover:bg-white/15 hover:text-white focus-visible:ring-2 focus-visible:ring-white/70 disabled:opacity-30';

export function PresentationView({
  page,
  nextPage,
  size,
  theme,
  pageIndex,
  pageCount,
  notesOpen,
  initialPosition = 'start',
  sessionId = 0,
  canStep,
  onNotesToggle,
  onStep,
  onClose,
  controlsRef,
}: PresentationViewProps) {
  useHuandengLocale();
  const playback = usePresentationPlayback(page, true, { initialPosition, restartKey: sessionId });
  const root = useRef<HTMLElement>(null);
  const slide = useRef<HTMLDivElement>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(false);
  const [blackout, setBlackout] = useState(false);
  const blackoutRef = useRef(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const keyboardControls = useRef(false);
  const time = playback.timeMs ?? 0;
  const nextStepLabel = playback.nextStep
    ? animationStepLabel(playback.nextStep, page.data.timeline)
    : undefined;
  const hideControlsAfter = useCallback((delay = 600) => {
    if (hideTimer.current) return;
    hideTimer.current = setTimeout(() => {
      hideTimer.current = null;
      const focused = document.activeElement;
      if (focused instanceof HTMLElement && focused.closest('[data-hd-presenter-controls]')) {
        if (keyboardControls.current) return;
        root.current?.focus({ preventScroll: true });
      }
      setControlsVisible(false);
    }, delay);
  }, []);
  const revealControls = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = null;
    setControlsVisible(true);
  }, []);
  useLayoutEffect(() => {
    void sessionId;
    blackoutRef.current = false;
    setBlackout(false);
    setDetailsOpen(false);
    setControlsVisible(false);
  }, [sessionId]);
  useEffect(
    () => () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    },
    [],
  );
  const restoreBlackout = useCallback(() => {
    if (!blackoutRef.current) return false;
    blackoutRef.current = false;
    setBlackout(false);
    return true;
  }, []);
  const next = useCallback(
    () => (canStep && !canStep()) || restoreBlackout() || playback.next(),
    [canStep, restoreBlackout, playback.next],
  );
  const previous = useCallback(
    () => (canStep && !canStep()) || restoreBlackout() || playback.previous(),
    [canStep, restoreBlackout, playback.previous],
  );
  const toggleBlackout = useCallback(() => {
    playback.pause();
    blackoutRef.current = !blackoutRef.current;
    setBlackout(blackoutRef.current);
  }, [playback.pause]);
  const toggleFullscreen = useCallback(() => {
    const host = desktopHost();
    if (host?.setFullscreen) {
      void host
        .setFullscreen(!fullscreen)
        .then(setFullscreen)
        .catch(() =>
          setMessage('Could not change fullscreen. You can continue presenting in this window.'),
        );
      return;
    }
    const element = root.current;
    if (!element) return;
    const operation = document.fullscreenElement
      ? document.exitFullscreen()
      : element.requestFullscreen?.();
    void operation?.catch(() =>
      setMessage('Could not enter fullscreen. You can continue presenting in this window.'),
    );
  }, [fullscreen]);
  useEffect(() => {
    let active = true;
    const host = desktopHost();
    if (host?.setPresentationMode) {
      const unsubscribe = host.onFullscreenChanged?.((value) => active && setFullscreen(value));
      void host
        .setPresentationMode(true)
        .then((value) => {
          if (active) setFullscreen(value.fullscreen);
        })
        .catch(() => {
          if (active)
            setMessage('Could not enter fullscreen. You can continue presenting in this window.');
        });
      return () => {
        active = false;
        unsubscribe?.();
        void host.setPresentationMode?.(false).catch(() => {});
      };
    }
    const element = root.current;
    const update = () => setFullscreen(document.fullscreenElement === element);
    document.addEventListener('fullscreenchange', update);
    void element?.requestFullscreen?.().catch(() => {
      if (active)
        setMessage('Could not enter fullscreen. You can continue presenting in this window.');
    });
    return () => {
      active = false;
      document.removeEventListener('fullscreenchange', update);
      if (document.fullscreenElement === element) void document.exitFullscreen().catch(() => {});
    };
  }, []);
  const seekBoundary = useCallback(
    (end: boolean) => {
      restoreBlackout();
      playback.seek(end ? (playback.timeline?.durationMs ?? 0) : 0);
    },
    [restoreBlackout, playback.seek, playback.timeline],
  );
  useImperativeHandle(
    controlsRef,
    () => ({
      pause: playback.pause,
      next,
      previous,
      toggleBlackout,
      toggleFullscreen,
      seekBoundary,
    }),
    [playback.pause, next, previous, toggleBlackout, toggleFullscreen, seekBoundary],
  );
  const step = (direction: number) => {
    if (!(direction > 0 ? next() : previous())) onStep(direction);
  };
  useLayoutEffect(() => {
    void page.pageId;
    void sessionId;
    void page.occurrenceId;
    void page.versionId;
    const target = slide.current;
    setMessage(null);
    let transition: ReturnType<typeof readPageTransition>;
    try {
      transition = readPageTransition(page.data);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
      return;
    }
    if (
      !target ||
      transition?.kind !== 'fade' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
      return;
    const motion = target.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: transition.durationMs,
      easing: 'ease-out',
    });
    return () => motion.cancel();
  }, [page.pageId, page.occurrenceId, page.versionId, page.data, sessionId]);
  const close = () => {
    if (document.fullscreenElement === root.current) void document.exitFullscreen().catch(() => {});
    onClose();
  };
  const showControls = controlsVisible || detailsOpen || !!playback.error || !!message;
  return (
    <section
      ref={root}
      className="fixed inset-0 z-50 flex bg-black outline-none"
      data-hd-presenter
      data-hd-presenter-step={playback.stepIndex}
      data-hd-presenter-playing={playback.playing}
      data-hd-presenter-time={time}
      aria-label={t('演示模式')}
      tabIndex={-1}
      data-hd-presenter-controls-visible={showControls}
      onPointerMove={(event) => {
        const bounds = event.currentTarget.getBoundingClientRect();
        if (
          event.clientY >= bounds.bottom - 28 ||
          (event.target instanceof Element && event.target.closest('[data-hd-presenter-controls]'))
        )
          revealControls();
        else hideControlsAfter();
      }}
      onPointerDownCapture={() => {
        keyboardControls.current = false;
      }}
      onPointerLeave={() => hideControlsAfter()}
      onFocusCapture={(event) => {
        if (event.target instanceof Element && event.target.closest('[data-hd-presenter-controls]'))
          revealControls();
      }}
      onBlurCapture={(event) => {
        if (
          !(event.relatedTarget instanceof Element) ||
          !event.relatedTarget.closest('[data-hd-presenter-controls]')
        ) {
          keyboardControls.current = false;
          hideControlsAfter();
        }
      }}
      onKeyDownCapture={(event) => {
        if (event.key === 'Tab') keyboardControls.current = true;
        if (
          event.repeat &&
          [
            'Enter',
            ' ',
            'ArrowRight',
            'ArrowLeft',
            'ArrowUp',
            'ArrowDown',
            'PageUp',
            'PageDown',
          ].includes(event.key) &&
          !(event.target instanceof Element && event.target.closest('input,textarea,select'))
        ) {
          event.preventDefault();
          event.stopPropagation();
        }
      }}
    >
      <div className="relative min-h-0 min-w-0 flex-1">
        {/* biome-ignore lint/a11y/useSemanticElements: A slide contains block-level scientific content that cannot be nested in a native button. */}
        <div
          ref={slide}
          role="button"
          tabIndex={0}
          aria-label={t('单击播放下一步')}
          data-hd-presenter-slide={page.pageId}
          data-hd-presenter-occurrence={page.occurrenceId}
          className={`h-full w-full select-none outline-none ${!showControls ? 'cursor-none' : ''}`}
          onClick={(event) => {
            if (event.button === 0) step(1);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              event.stopPropagation();
              if (!event.repeat) step(1);
            }
          }}
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
        {blackout && (
          <button
            type="button"
            data-hd-presenter-blackout
            className="absolute inset-0 bg-black"
            onClick={() => restoreBlackout()}
            aria-label={t('恢复放映画面')}
            onKeyDown={(event) => {
              if (event.key === ' ' || event.key === 'Enter') {
                event.preventDefault();
                event.stopPropagation();
                restoreBlackout();
              }
            }}
          />
        )}
        <div
          data-hd-presenter-controls
          onPointerEnter={revealControls}
          onPointerLeave={() => hideControlsAfter()}
          className={`absolute inset-x-0 bottom-0 z-10 px-5 pb-4 pt-10 text-white transition-opacity duration-150 motion-reduce:transition-none ${showControls ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
          style={{ background: 'linear-gradient(transparent, rgb(0 0 0 / 85%))' }}
        >
          {(playback.error || message) && (
            <p role="alert" className="mb-3 text-center text-sm text-amber-200">
              {playback.error
                ? t('此页动画无法播放：{value0}', { value0: t(playback.error) })
                : message
                  ? t(message)
                  : null}
            </p>
          )}
          {detailsOpen && playback.timeline && (
            <div
              className="mx-auto mb-3 flex max-w-3xl items-center gap-3 text-xs text-zinc-300"
              data-hd-presenter-timeline
            >
              <button
                type="button"
                aria-label={playback.playing ? t('暂停动画') : t('播放至下一提示点')}
                disabled={blackout}
                onClick={playback.toggle}
                className={buttonClass}
              >
                {playback.playing ? <Pause className="size-4" /> : <Play className="size-4" />}
              </button>
              <button
                type="button"
                aria-label={t('动画回到起点')}
                disabled={blackout}
                onClick={() => playback.seek(0)}
                className={buttonClass}
              >
                <RotateCcw className="size-4" />
              </button>
              <input
                type="range"
                disabled={blackout}
                aria-label={t('放映动画时间')}
                min={0}
                max={playback.timeline.durationMs}
                step={1}
                value={Math.round(time)}
                onChange={(event) => playback.seek(Number(event.target.value))}
                className="min-w-12 flex-1 accent-white"
              />
              <span className="font-mono tabular-nums">
                {(time / 1000).toFixed(1)} / {(playback.timeline.durationMs / 1000).toFixed(1)}s
              </span>
            </div>
          )}
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <button
                type="button"
                aria-label={t('演讲者备注')}
                aria-pressed={notesOpen}
                aria-controls={notesOpen ? 'hd-presenter-notes' : undefined}
                data-hd-presenter-notes-toggle
                onClick={onNotesToggle}
                className={buttonClass}
                title={t('备注与下一页（同窗口）')}
              >
                <FileText className="size-4" />
              </button>
              <span className="truncate text-xs text-zinc-300">
                {page.shortCode ?? page.metadata.label}{' '}
                <span className="mx-2 text-zinc-600">/</span> {pageIndex + 1} / {pageCount}
              </span>
            </div>
            <div className="flex min-w-0 flex-[2] items-center justify-center gap-3">
              <button
                type="button"
                aria-label={playback.steps.length ? t('上一步') : t('上一页')}
                disabled={pageIndex <= 0 && time <= 0 && !playback.playing && !blackout}
                onClick={() => step(-1)}
                className={buttonClass}
              >
                <ArrowLeft className="size-4" />
              </button>
              <span
                data-hd-presenter-step-label
                className="min-w-24 max-w-80 truncate text-center text-xs"
                title={nextStepLabel}
              >
                {blackout
                  ? t('画面已暂停')
                  : playback.steps.length
                    ? t('{value0} / {value1} 步{value2}', {
                        value0: playback.stepIndex,
                        value1: playback.steps.length,
                        value2: playback.nextStep
                          ? ` · ${playback.playing ? t('正在播放') : t('下一步')} ${nextStepLabel}`
                          : t(' · 本页完成'),
                      })
                    : pageIndex === pageCount - 1
                      ? t('最后一页')
                      : t('单击进入下一页')}
              </span>
              <button
                type="button"
                aria-label={playback.steps.length ? t('下一步') : t('下一页')}
                disabled={
                  !blackout &&
                  pageIndex >= pageCount - 1 &&
                  (!playback.timeline ||
                    time >= playback.timeline.durationMs ||
                    !playback.steps.length)
                }
                onClick={() => step(1)}
                className={buttonClass}
              >
                <ArrowRight className="size-4" />
              </button>
            </div>
            <div className="flex flex-1 items-center justify-end gap-1">
              {playback.timeline && (
                <button
                  type="button"
                  aria-label={t('动画播放控制')}
                  aria-expanded={detailsOpen}
                  onClick={() => setDetailsOpen((open) => !open)}
                  className={buttonClass}
                >
                  {detailsOpen ? (
                    <ChevronDown className="size-4" />
                  ) : (
                    <ChevronUp className="size-4" />
                  )}
                </button>
              )}
              <button
                type="button"
                aria-label={blackout ? t('恢复放映画面') : t('黑屏暂停')}
                aria-pressed={blackout}
                onClick={toggleBlackout}
                title={t('黑屏暂停 B')}
                className={buttonClass}
              >
                <MonitorOff className="size-4" />
              </button>
              <button
                type="button"
                aria-label={fullscreen ? t('退出全屏') : t('进入全屏')}
                onClick={toggleFullscreen}
                title={t('全屏 F')}
                className={buttonClass}
              >
                {fullscreen ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
              </button>
              <button
                type="button"
                aria-label={t('退出演示')}
                onClick={close}
                title={t('退出 Esc')}
                className={buttonClass}
              >
                <X className="size-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
      {notesOpen && (
        <aside
          id="hd-presenter-notes"
          aria-label={t('演讲者备注')}
          data-hd-presenter-notes={page.pageId}
          className="flex w-80 max-w-[36vw] shrink-0 flex-col border-l border-white/15 bg-zinc-950 px-5 py-5 text-zinc-100"
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-sm font-medium">{t('演讲者备注')}</h2>
            <span className="font-mono text-xs text-zinc-400" data-hd-presenter-code>
              {page.shortCode ?? page.metadata.label ?? t('未编号')} · {pageIndex + 1}
            </span>
          </div>
          <p className="mb-3 text-[11px] text-zinc-500">{t('此栏与幻灯片显示在同一窗口。')}</p>
          <div
            className="min-h-0 flex-1 overflow-y-auto whitespace-pre-wrap break-words text-sm leading-relaxed text-zinc-200"
            data-hd-presenter-note-text
          >
            {page.data.notes?.trim() || t('这一页暂无演讲备注。')}
          </div>
          <div className="mt-5 shrink-0 border-t border-white/15 pt-4">
            {nextPage ? (
              <>
                <div className="mb-2 flex items-center justify-between text-xs text-zinc-400">
                  <span>{t('下一页')}</span>
                  <span className="font-mono">
                    {nextPage.shortCode ?? nextPage.metadata.label ?? t('未编号')}
                  </span>
                </div>
                <NextPagePreview page={nextPage} size={size} theme={theme} />
              </>
            ) : (
              <p className="text-xs text-zinc-400" data-hd-presenter-end>
                {t('已到最后一页')}
              </p>
            )}
          </div>
        </aside>
      )}
    </section>
  );
}
