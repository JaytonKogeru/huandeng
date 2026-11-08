import { Copy, RotateCcw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { uiText as t, useHuandengLocale } from '@/lib/huandeng-locale';
import { type PageAnimation, readTimeline } from '../../../pptd/animation-model';
import {
  type PageTransition,
  readPageTransition,
  validatePageTransition,
} from '../../../pptd/page-transition';
import type { PageSnapshot } from '../../../pptd/types';
import { parseTimelineSeconds, timelineSeconds } from '../../lib/pptd-timeline-time';
import { Button } from '../ui/button';
import { BuildPanel, type BuildPanelProps } from './build-panel';
import { TimelineField, TimelinePanel } from './timeline-panel';

export interface AnimationPanelProps extends BuildPanelProps {
  onTransitionChange?: (
    transition: PageTransition | null,
    expectedPageRevision: string,
  ) => Promise<unknown>;
}

type EditorMode = 'builds' | 'timeline';

function editorMode(page: PageSnapshot): EditorMode | null {
  const animation = page.data.timeline;
  if (animation === undefined || animation === null) return 'builds';
  if (typeof animation !== 'object') return null;
  if ('schemaVersion' in animation && animation.schemaVersion === 1) return 'timeline';
  if ('schemaVersion' in animation && animation.schemaVersion === 2) return 'builds';
  return null;
}

export function AnimationPanel(props: AnimationPanelProps) {
  useHuandengLocale();
  return (
    <AnimationEditor
      key={`${props.page.pageId}:${props.page.occurrenceId ?? ''}:${props.page.versionId ?? ''}`}
      {...props}
    />
  );
}

function AnimationEditor(props: AnimationPanelProps) {
  useHuandengLocale();
  const desiredMode = editorMode(props.page);
  const [mode, setMode] = useState<EditorMode>(desiredMode ?? 'builds');
  const [animationDirty, setAnimationDirty] = useState(false);
  const animationDirtyRef = useRef(false);
  const [transitionDirty, setTransitionDirty] = useState(false);
  const [buildPreview, setBuildPreview] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const onDirtyRef = useRef(props.onDirtyChange);
  const onPreviewRef = useRef(props.onPreview);
  onDirtyRef.current = props.onDirtyChange;
  onPreviewRef.current = props.onPreview;
  const trackAnimationDirty = useCallback((dirty: boolean) => {
    animationDirtyRef.current = dirty;
    setAnimationDirty(dirty);
  }, []);
  const showPreview = useCallback((timeMs: number | null, animation: PageAnimation | null) => {
    setBuildPreview(timeMs !== null && animation?.schemaVersion === 2);
    onPreviewRef.current(timeMs, animation);
  }, []);
  useEffect(() => {
    if (
      desiredMode &&
      !animationDirty &&
      !animationDirtyRef.current &&
      !transitionDirty &&
      !resetting
    )
      setMode(desiredMode);
  }, [desiredMode, animationDirty, transitionDirty, resetting]);
  useEffect(() => {
    onDirtyRef.current?.(animationDirty || transitionDirty || resetting);
  }, [animationDirty, transitionDirty, resetting]);
  useEffect(() => () => onDirtyRef.current?.(false), []);

  const emptyTimeline = useMemo(() => {
    if (mode !== 'timeline') return false;
    try {
      const animation = readTimeline(props.page.data);
      return !!animation && animation.tracks.length === 0 && !animation.cues?.length;
    } catch {
      return false;
    }
  }, [mode, props.page.data]);
  const switchToSteps = async () => {
    if (animationDirty || transitionDirty || props.disabled || resetting) return;
    setResetting(true);
    setMessage(null);
    try {
      await props.onChange(null, props.page.pageRevision);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '未能切换动画编辑方式。');
    } finally {
      setResetting(false);
    }
  };

  return (
    <div data-hd-animation-panel={mode} className="min-h-0 shrink-0">
      {mode === 'builds' ? (
        <BuildPanel
          {...props}
          disabled={props.disabled || transitionDirty || resetting}
          onDirtyChange={trackAnimationDirty}
          onPreview={showPreview}
        />
      ) : (
        <TimelinePanel
          {...props}
          disabled={props.disabled || transitionDirty || resetting}
          onDirtyChange={trackAnimationDirty}
          onPreview={showPreview}
        />
      )}
      {emptyTimeline && (
        <div className="flex items-center gap-2 border-t border-border/50 bg-card px-3 py-1.5 text-xs text-muted-foreground">
          <span className="min-w-0 flex-1">{t('这页尚无关键帧，也可以按点击编排效果。')}</span>
          <Button
            variant="ghost"
            size="xs"
            disabled={animationDirty || transitionDirty || props.disabled || resetting}
            onClick={() => void switchToSteps()}
          >
            {t('改用演讲步骤')}
          </Button>
        </div>
      )}
      {message && (
        <p
          role="alert"
          className="border-t border-border bg-card px-3 py-2 text-xs text-destructive"
        >
          {t(message)}
        </p>
      )}
      {props.onTransitionChange && (
        <div className={buildPreview ? 'hidden' : undefined} data-hd-transition-area>
          <TransitionEditor
            page={props.page}
            disabled={props.disabled || animationDirty || resetting}
            onChange={props.onTransitionChange}
            onDirtyChange={setTransitionDirty}
          />
        </div>
      )}
    </div>
  );
}

function sameTransition(left: PageTransition | null, right: PageTransition | null) {
  return (
    left?.schemaVersion === right?.schemaVersion &&
    left?.kind === right?.kind &&
    left?.durationMs === right?.durationMs
  );
}

function TransitionEditor({
  page,
  disabled,
  onChange,
  onDirtyChange,
}: {
  page: PageSnapshot;
  disabled?: boolean;
  onChange: NonNullable<AnimationPanelProps['onTransitionChange']>;
  onDirtyChange: (dirty: boolean) => void;
}) {
  useHuandengLocale();
  const parsed = useMemo(() => {
    try {
      return { transition: readPageTransition(page.data), error: null };
    } catch (error) {
      return {
        transition: null,
        error: error instanceof Error ? error.message : '换页效果数据无效。',
      };
    }
  }, [page.data]);
  const [draft, setDraft] = useState<PageTransition | null>(parsed.transition);
  const draftRef = useRef(draft);
  const [baseRevision, setBaseRevision] = useState(page.pageRevision);
  const [dirty, setDirty] = useState(false);
  const [fieldDirty, setFieldDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const submitted = useRef<{ revision: string; transition: PageTransition | null } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [resetCount, setResetCount] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const onDirtyRef = useRef(onDirtyChange);
  onDirtyRef.current = onDirtyChange;
  const hasUnsaved = dirty || fieldDirty || saving;
  const remoteChanged = (dirty || fieldDirty) && baseRevision !== page.pageRevision && !saving;
  const readonly = disabled || saving || remoteChanged || !!parsed.error;

  useEffect(() => {
    if (saving || fieldDirty || parsed.error) return;
    if (dirty) {
      if (
        baseRevision !== page.pageRevision &&
        sameTransition(parsed.transition, draftRef.current)
      ) {
        submitted.current = null;
        setBaseRevision(page.pageRevision);
        setDirty(false);
        setMessage(null);
      }
      return;
    }
    if (
      submitted.current &&
      submitted.current.revision === page.pageRevision &&
      !sameTransition(submitted.current.transition, parsed.transition)
    )
      return;
    submitted.current = null;
    draftRef.current = parsed.transition;
    setDraft(parsed.transition);
    setBaseRevision(page.pageRevision);
  }, [parsed.transition, parsed.error, page.pageRevision, baseRevision, dirty, saving, fieldDirty]);
  useEffect(() => {
    onDirtyRef.current(hasUnsaved);
  }, [hasUnsaved]);
  useEffect(() => () => onDirtyRef.current(false), []);
  useEffect(() => {
    if (!hasUnsaved) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [hasUnsaved]);

  const commit = (next: PageTransition) => {
    if (disabled || savingRef.current || parsed.error) return false;
    try {
      validatePageTransition(next);
      if (baseRevision !== page.pageRevision)
        throw new Error('页面已在其他位置修改。换页草稿已保留，请复制或还原后继续。');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '请检查换页参数。');
      return false;
    }
    draftRef.current = next;
    setDraft(next);
    setDirty(true);
    setMessage(null);
    savingRef.current = true;
    setSaving(true);
    void onChange(next, baseRevision)
      .then(() => {
        submitted.current = { revision: baseRevision, transition: next };
        setDirty(false);
      })
      .catch((error) =>
        setMessage(error instanceof Error ? error.message : '换页效果保存失败，草稿已保留。'),
      )
      .finally(() => {
        savingRef.current = false;
        setSaving(false);
      });
    return true;
  };

  const reset = () => {
    if (saving) return;
    draftRef.current = parsed.transition;
    setDraft(parsed.transition);
    setBaseRevision(page.pageRevision);
    submitted.current = null;
    setDirty(false);
    setFieldDirty(false);
    setMessage(null);
    setCopyStatus(null);
    setResetCount((count) => count + 1);
  };

  const copy = async () => {
    const input = panelRef.current?.querySelector<HTMLInputElement>(
      'input[data-hd-input-dirty="true"]',
    );
    try {
      await navigator.clipboard.writeText(
        JSON.stringify(
          {
            format: 'huandeng-transition-draft',
            schemaVersion: 1,
            source: {
              pageId: page.pageId,
              occurrenceId: page.occurrenceId,
              versionId: page.versionId,
              expectedPageRevision: baseRevision,
            },
            transition:
              dirty || fieldDirty || !parsed.error
                ? draftRef.current
                : (page.data.transition ?? null),
            pendingInputs: input
              ? { [input.dataset.hdTimelineInput ?? 'duration']: input.value }
              : {},
          },
          null,
          2,
        ),
      );
      setCopyStatus('换页草稿已复制。');
    } catch {
      setCopyStatus('浏览器未允许访问剪贴板，草稿仍保留在此处。');
    }
  };

  const error =
    parsed.error ?? (remoteChanged ? '页面已在其他位置更新，换页草稿仍保留。' : message);

  return (
    <div
      ref={panelRef}
      data-hd-transition-editor
      className="border-t border-border/60 bg-card text-xs"
    >
      <div className="flex min-h-9 flex-wrap items-center gap-2 px-3 py-1">
        <label className="flex items-center gap-2 text-muted-foreground">
          {t('换页')}
          <select
            aria-label={t('换页效果')}
            className="h-7 rounded border border-border bg-background px-2 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-50"
            value={draft?.kind ?? 'none'}
            disabled={readonly || fieldDirty}
            onChange={(event) =>
              commit(
                event.target.value === 'fade'
                  ? {
                      schemaVersion: 1,
                      kind: 'fade',
                      durationMs: draft?.kind === 'fade' ? draft.durationMs : 250,
                    }
                  : { schemaVersion: 1, kind: 'none', durationMs: 0 },
              )
            }
          >
            <option value="none">{t('无')}</option>
            <option value="fade">{t('淡化')}</option>
          </select>
        </label>
        {draft?.kind === 'fade' && (
          <TimelineField
            key={`transition-duration-${resetCount}`}
            label={t('换页时长（秒）')}
            inline
            className="w-44"
            value={timelineSeconds(draft.durationMs)}
            min={0.001}
            max={5}
            step={0.001}
            disabled={readonly}
            onDirty={(value) => {
              setFieldDirty(value);
              if (!value && !dirty) setMessage(null);
            }}
            onError={setMessage}
            onCommit={(value) => {
              try {
                return commit({ ...draft, durationMs: parseTimelineSeconds(value) });
              } catch (cause) {
                setMessage(cause instanceof Error ? cause.message : '请检查换页时长。');
                return false;
              }
            }}
          />
        )}
        {hasUnsaved && (
          <span className="ml-auto text-muted-foreground" aria-live="polite">
            {saving ? t('换页效果保存中…') : t('换页效果未保存')}
          </span>
        )}
      </div>
      {(error || (dirty && !saving)) && (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-2 border-t border-amber-500/20 bg-amber-500/5 px-3 py-2"
        >
          <span className="min-w-32 flex-1">
            {error ? t(error) : t('请确认换页时长，按 Enter 应用或按 Esc 还原。')}
          </span>
          <Button variant="ghost" size="xs" onClick={() => void copy()}>
            <Copy />
            {t('复制换页草稿')}
          </Button>
          {dirty && !remoteChanged && !parsed.error && (
            <Button
              variant="outline"
              size="xs"
              disabled={saving || fieldDirty || !draft}
              onClick={() => draft && commit(draft)}
            >
              {t('重试保存换页')}
            </Button>
          )}
          <Button variant="ghost" size="xs" disabled={saving || !hasUnsaved} onClick={reset}>
            <RotateCcw />
            {t('还原换页')}
          </Button>
          {copyStatus && <span role="status">{t(copyStatus)}</span>}
        </div>
      )}
    </div>
  );
}
