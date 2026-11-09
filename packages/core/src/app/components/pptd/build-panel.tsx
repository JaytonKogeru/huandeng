import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Copy,
  Pause,
  Play,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { uiText as t, useHuandengLocale } from '@/lib/huandeng-locale';
import {
  type BuildEffect,
  type BuildTimeline,
  MAX_BUILD_DELAY_MS,
  type PageAnimation,
  readPageAnimation,
  resolvePageAnimation,
  validatePageAnimation,
} from '../../../pptd/animation-model';
import {
  groupBuildEffects,
  removeBuildEffect,
  reorderBuildStep,
} from '../../../pptd/timeline-operations';
import type { PageSnapshot } from '../../../pptd/types';
import { elementLabel } from '../../lib/pptd-element-label';
import { selectionRootIds } from '../../lib/pptd-keyboard';
import { usePresentationPlayback } from '../../lib/pptd-playback';
import { parseTimelineSeconds, timelineSeconds } from '../../lib/pptd-timeline-time';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { TimelineField } from './timeline-panel';

export interface BuildPanelProps {
  page: PageSnapshot;
  selectedIds?: string[];
  disabled?: boolean;
  previewResetKey?: number;
  onChange: (animation: PageAnimation | null, expectedPageRevision: string) => Promise<unknown>;
  onPreview: (timeMs: number | null, animation: PageAnimation | null) => void;
  onDirtyChange?: (dirty: boolean) => void;
  onSelectTargets?: (elementIds: string[]) => void;
}

const effectLabels: Record<BuildEffect['kind'], string> = {
  appear: '出现',
  'fade-in': '淡入',
  'fade-out': '淡出',
  disappear: '消失',
  pulse: '强调',
  move: '移动',
};
const triggerLabels: Record<BuildEffect['trigger'], string> = {
  click: '单击时',
  'with-previous': '与上一项同时',
  'after-previous': '上一项之后',
};
const fieldClass =
  'min-w-0 rounded border border-border bg-background px-2 py-1 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-50';
const emptySelection: string[] = [];
const selectionValue = '__huandeng_selection__';
const emptyBuild = (): BuildTimeline => ({ schemaVersion: 2, effects: [] });
const instantEffect = (kind: BuildEffect['kind']) => kind === 'appear' || kind === 'disappear';

function sameAnimation(left: unknown, right: unknown) {
  const stable = (value: unknown) =>
    JSON.stringify(value, (_key, part) =>
      part && typeof part === 'object' && !Array.isArray(part)
        ? Object.fromEntries(
            Object.keys(part)
              .sort()
              .map((key) => [key, part[key]]),
          )
        : part,
    );
  return stable(left) === stable(right);
}

export function BuildPanel(props: BuildPanelProps) {
  useHuandengLocale();
  const parsed = useMemo(() => {
    try {
      const animation = readPageAnimation(props.page.data);
      if (animation?.schemaVersion === 1)
        return {
          animation: null,
          error: '页面已改为高级时间线。当前步骤草稿仍保留，可复制或还原后继续。',
        };
      return { animation, error: null };
    } catch (error) {
      return { animation: null, error: error instanceof Error ? error.message : '动画数据无效。' };
    }
  }, [props.page.data]);
  return (
    <BuildEditor
      key={`${props.page.pageId}:${props.page.occurrenceId ?? ''}:${props.page.versionId ?? ''}`}
      {...props}
      persisted={parsed.animation}
      parseError={parsed.error}
    />
  );
}

function BuildEditor({
  page,
  selectedIds = emptySelection,
  disabled = false,
  previewResetKey = 0,
  onChange,
  onPreview,
  onDirtyChange,
  onSelectTargets,
  persisted,
  parseError,
}: BuildPanelProps & { persisted: BuildTimeline | null; parseError: string | null }) {
  useHuandengLocale();
  const [draft, setDraft] = useState<BuildTimeline>(persisted ?? emptyBuild());
  const draftRef = useRef(draft);
  const [baseRevision, setBaseRevision] = useState(page.pageRevision);
  const [dirty, setDirty] = useState(false);
  const [fields, setFields] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const submitted = useRef<{ revision: string; animation: PageAnimation | null } | null>(null);
  const [resetCount, setResetCount] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [convertOpen, setConvertOpen] = useState(false);
  const [preview, setPreview] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [selectedEffectId, setSelectedEffectId] = useState<string | null>(
    persisted?.effects[0]?.id ?? null,
  );
  const [targetId, setTargetId] = useState(
    selectedIds[0] ?? page.data.elements[0]?.elementId ?? '',
  );
  const [kind, setKind] = useState<BuildEffect['kind']>('fade-in');
  const panelRef = useRef<HTMLElement>(null);
  const previewNavigationRef = useRef<HTMLDivElement>(null);
  const moveInputRef = useRef<HTMLInputElement>(null);
  const moveFocus = useRef<string | null>(null);
  const onPreviewRef = useRef(onPreview);
  const onDirtyRef = useRef(onDirtyChange);
  onPreviewRef.current = onPreview;
  onDirtyRef.current = onDirtyChange;
  const hasUnsaved = dirty || fields.size > 0 || saving;
  const remoteChanged = (dirty || fields.size > 0) && baseRevision !== page.pageRevision && !saving;
  const readonly = disabled || saving || remoteChanged || !!parseError;
  const actionBlocked = readonly || fields.size > 0;
  const elements = useMemo(
    () => new Map(page.data.elements.map((element) => [element.elementId, element])),
    [page.data.elements],
  );
  const selectedRoots = useMemo(
    () => selectionRootIds(page.data.elements, selectedIds).filter((id) => elements.has(id)),
    [page.data.elements, selectedIds, elements],
  );
  const selectionKey = selectedRoots.join('\0');
  const followedSelection = useRef<string | null>(null);
  const groups = useMemo(() => groupBuildEffects(draft.effects), [draft.effects]);
  const selectedEffect = draft.effects.find((effect) => effect.id === selectedEffectId);
  const previewPage = useMemo(
    () => ({ ...page, data: { ...page.data, timeline: draft } }),
    [page, draft],
  );
  const resolved = useMemo(() => {
    try {
      return { value: resolvePageAnimation(previewPage.data), error: null };
    } catch (error) {
      return { value: null, error: error instanceof Error ? error.message : '无法预演当前动画。' };
    }
  }, [previewPage.data]);
  const playback = usePresentationPlayback(previewPage, preview && !parseError && !resolved.error);
  const time = playback.timeMs ?? 0;
  const steps = resolved.value?.steps ?? [];
  const completed = steps.filter((step) => step.endMs <= time).length;
  const moving = playback.playing;
  const activeStepIndex = steps.findIndex((step) => time > step.startMs && time < step.endMs);
  const displayedStepIndex = activeStepIndex >= 0 ? activeStepIndex : completed - 1;
  const upcomingStepIndex = activeStepIndex >= 0 ? activeStepIndex + 1 : completed;
  const stepLabel = (index: number) => {
    const group = groups[index];
    if (!group?.length) return '';
    const head = group[0];
    const element = elements.get(head.targetId);
    return (
      head.label?.trim() ||
      `${element ? elementLabel(element) : t('缺失对象')} · ${t(effectLabels[head.kind])}${group.length > 1 ? ` +${group.length - 1}` : ''}`
    );
  };

  const updateDraft = (next: BuildTimeline) => {
    draftRef.current = next;
    setDraft(next);
  };

  useEffect(() => {
    if (saving || fields.size || parseError) return;
    if (dirty) {
      if (baseRevision !== page.pageRevision && sameAnimation(persisted, draftRef.current)) {
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
      !sameAnimation(submitted.current.animation, persisted)
    )
      return;
    submitted.current = null;
    const next = persisted ?? emptyBuild();
    draftRef.current = next;
    setDraft(next);
    setBaseRevision(page.pageRevision);
  }, [persisted, page.pageRevision, baseRevision, dirty, saving, fields.size, parseError]);

  useEffect(() => {
    if (followedSelection.current !== selectionKey) {
      followedSelection.current = selectionKey;
      if (selectedRoots.length > 1) setTargetId(selectionValue);
      else if (selectedRoots[0]) setTargetId(selectedRoots[0]);
    }
    setTargetId((current) =>
      (current === selectionValue && selectedRoots.length > 1) || elements.has(current)
        ? current
        : (selectedRoots[0] ?? page.data.elements[0]?.elementId ?? ''),
    );
  }, [selectionKey, selectedRoots, elements, page.data.elements]);

  useEffect(() => {
    if (fields.size) return;
    if (!draft.effects.some((effect) => effect.id === selectedEffectId))
      setSelectedEffectId(draft.effects[0]?.id ?? null);
  }, [draft.effects, selectedEffectId, fields.size]);

  useEffect(() => {
    if (readonly || moveFocus.current !== selectedEffectId || !selectedEffectId) return;
    moveInputRef.current?.focus();
    moveInputRef.current?.select();
    moveFocus.current = null;
  }, [readonly, selectedEffectId]);

  useEffect(() => {
    onPreviewRef.current(preview && !parseError && !resolved.error ? time : null, draft);
  }, [preview, time, draft, parseError, resolved.error]);

  useEffect(() => {
    onDirtyRef.current?.(hasUnsaved);
  }, [hasUnsaved]);

  useEffect(() => {
    if (!preview) return;
    previewNavigationRef.current
      ?.querySelectorAll<HTMLButtonElement>('button')
      [displayedStepIndex + 1]?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [preview, displayedStepIndex]);

  useEffect(() => {
    void previewResetKey;
    setPreview(false);
  }, [previewResetKey]);

  useEffect(() => {
    if (!hasUnsaved) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [hasUnsaved]);

  useEffect(
    () => () => {
      onPreviewRef.current(null, null);
      onDirtyRef.current?.(false);
    },
    [],
  );

  const fieldDirty = (id: string, value: boolean) => {
    if (!value && !dirty) setMessage(null);
    setFields((previous) => {
      if (previous.has(id) === value) return previous;
      const next = new Set(previous);
      if (value) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const canApply = (animation: PageAnimation | null) => {
    if (savingRef.current || disabled || parseError) return false;
    try {
      if (animation) validatePageAnimation(animation, page.data);
      if (baseRevision !== page.pageRevision)
        throw new Error('页面已在其他位置修改。步骤草稿已保留，请复制或还原后继续。');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '请检查动画参数。');
      return false;
    }
    return true;
  };

  const commit = async (next: BuildTimeline) => {
    if (!canApply(next)) return;
    playback.pause();
    updateDraft(next);
    setDirty(true);
    setMessage(null);
    savingRef.current = true;
    setSaving(true);
    try {
      await onChange(next, baseRevision);
      submitted.current = { revision: baseRevision, animation: next };
      setDirty(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '动画保存失败，步骤草稿已保留。');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const applyDraft = (next: BuildTimeline) => {
    if (!canApply(next)) return false;
    void commit(next);
    return true;
  };

  const choose = (effect: BuildEffect) => {
    if (fields.size) {
      setMessage('请先确认当前输入，按 Enter 应用或按 Esc 还原。');
      return;
    }
    setSelectedEffectId(effect.id);
    onSelectTargets?.([effect.targetId]);
  };

  const addEffect = () => {
    if (actionBlocked) return;
    const targets =
      targetId === selectionValue ? selectedRoots : elements.has(targetId) ? [targetId] : [];
    if (!targets.length) return;
    const additions: BuildEffect[] = targets.map((target, index) => ({
      id: crypto.randomUUID(),
      targetId: target,
      kind,
      trigger: index === 0 ? 'click' : 'with-previous',
      durationMs: instantEffect(kind) ? 0 : 400,
      delayMs: 0,
      ...(kind === 'move' ? { dx: 0, dy: 0 } : {}),
    }));
    if (!applyDraft({ ...draftRef.current, effects: [...draftRef.current.effects, ...additions] }))
      return;
    setSelectedEffectId(additions[0].id);
    if (kind === 'move') moveFocus.current = additions[0].id;
  };

  const patchEffect = (patch: Partial<BuildEffect>) => {
    if (!selectedEffect || readonly) return false;
    return applyDraft({
      ...draftRef.current,
      effects: draftRef.current.effects.map((effect) =>
        effect.id === selectedEffect.id ? { ...effect, ...patch } : effect,
      ),
    });
  };

  const changeKind = (nextKind: BuildEffect['kind']) => {
    if (!selectedEffect || actionBlocked) return;
    const { dx, dy, ...effect } = selectedEffect;
    const next: BuildEffect = {
      ...effect,
      kind: nextKind,
      durationMs: instantEffect(nextKind)
        ? 0
        : Math.max(nextKind === 'pulse' ? 2 : 1, selectedEffect.durationMs || 400),
      ...(nextKind === 'move' ? { dx: dx ?? 0, dy: dy ?? 0 } : {}),
    };
    if (
      applyDraft({
        ...draftRef.current,
        effects: draftRef.current.effects.map((item) => (item.id === next.id ? next : item)),
      }) &&
      nextKind === 'move'
    )
      moveFocus.current = next.id;
  };

  const commitTime = (value: string, property: 'durationMs' | 'delayMs') => {
    try {
      const milliseconds = parseTimelineSeconds(value);
      const maximum = property === 'delayMs' ? MAX_BUILD_DELAY_MS : 60_000;
      if (milliseconds > maximum)
        throw new Error(
          `${property === 'delayMs' ? '延迟' : '效果时长'}不能超过 ${maximum / 1000} 秒。`,
        );
      return patchEffect({ [property]: milliseconds });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '请检查输入的秒数。');
      return false;
    }
  };

  const reset = () => {
    if (saving) return;
    playback.pause();
    setPreview(false);
    updateDraft(persisted ?? emptyBuild());
    setBaseRevision(page.pageRevision);
    submitted.current = null;
    setDirty(false);
    setFields(new Set());
    setResetCount((count) => count + 1);
    setMessage(null);
    setCopyStatus(null);
    moveFocus.current = null;
  };

  const copyDraft = async () => {
    const pendingInputs = Object.fromEntries(
      Array.from(
        panelRef.current?.querySelectorAll<HTMLInputElement>(
          'input[data-hd-timeline-input][data-hd-input-dirty="true"]',
        ) ?? [],
      ).map((input) => [input.dataset.hdTimelineInput, input.value]),
    );
    const payload = {
      format: 'huandeng-animation-draft',
      schemaVersion: 1,
      source: {
        pageId: page.pageId,
        occurrenceId: page.occurrenceId,
        versionId: page.versionId,
        expectedPageRevision: baseRevision,
      },
      timeline:
        dirty || fields.size || !parseError ? draftRef.current : (page.data.timeline ?? null),
      selection: { effectId: selectedEffectId, targetId },
      pendingInputs,
    };
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      setCopyStatus('动画草稿已复制。');
    } catch {
      setCopyStatus('浏览器未允许访问剪贴板，草稿仍保留在此处。');
    }
  };

  const convert = async () => {
    if (actionBlocked || dirty) return;
    const next = resolved.value?.timeline ?? {
      schemaVersion: 1 as const,
      durationMs: 4000,
      tracks: [],
    };
    if (!canApply(next)) return;
    playback.pause();
    setPreview(false);
    setMessage(null);
    savingRef.current = true;
    setSaving(true);
    try {
      await onChange(next, baseRevision);
      submitted.current = { revision: baseRevision, animation: next };
      setConvertOpen(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '转换失败，步骤仍保留。');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const togglePreview = () => {
    playback.pause();
    if (!preview) playback.seek(0);
    setPreview(!preview);
    if (!preview) panelRef.current?.focus({ preventScroll: true });
  };

  const displayedError =
    parseError ??
    (remoteChanged
      ? '页面已在其他位置更新。当前步骤与输入已保留，请先复制或还原。'
      : (message ?? resolved.error));

  return (
    <section
      ref={panelRef}
      data-hd-builds
      data-hd-builds-preview={preview || undefined}
      data-hd-keyboard-region="timeline"
      aria-label={t('页面动画步骤')}
      tabIndex={-1}
      className="shrink-0 border-t border-border bg-card text-xs outline-none"
      onKeyDown={(event) => {
        if (
          event.defaultPrevented ||
          event.nativeEvent.isComposing ||
          event.keyCode === 229 ||
          event.ctrlKey ||
          event.metaKey ||
          event.altKey
        )
          return;
        const target = event.target as HTMLElement;
        if (target.closest('input,textarea,select,[contenteditable="true"]')) return;
        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          playback.pause();
          setPreview(false);
        } else if (preview && !target.closest('button')) {
          if (['ArrowRight', 'ArrowDown', 'PageDown', 'Enter', ' '].includes(event.key)) {
            event.preventDefault();
            playback.next();
          } else if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(event.key)) {
            event.preventDefault();
            playback.previous();
          }
        }
      }}
    >
      <div className="flex min-h-10 flex-wrap items-center gap-2 border-b border-border/60 px-3 py-1.5">
        <span className="font-medium">{t('演讲步骤')}</span>
        <span className="text-muted-foreground" data-hd-build-count>
          {t('{value0} 次点击', { value0: groups.length })}
        </span>
        <Button
          variant={preview ? 'secondary' : 'outline'}
          size="xs"
          disabled={
            !draft.effects.length ||
            !!parseError ||
            !!resolved.error ||
            (!preview && fields.size > 0)
          }
          title={!preview && fields.size ? t('先确认当前输入，再逐步预演') : undefined}
          onClick={togglePreview}
        >
          <Play />
          {preview ? t('返回编辑') : t('逐步预演')}
        </Button>
        {preview && (
          <div className="flex items-center gap-1" data-hd-build-preview>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={t('预演回到开场')}
              onClick={() => playback.seek(0)}
            >
              <RotateCcw />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={t('预演上一步')}
              disabled={time <= 0}
              onClick={playback.previous}
            >
              <ArrowLeft />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={moving ? t('预演完成当前步骤') : t('预演下一步')}
              disabled={completed >= steps.length}
              onClick={playback.next}
            >
              <ArrowRight />
            </Button>
            {moving && (
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label={t('暂停步骤预演')}
                onClick={playback.pause}
              >
                <Pause />
              </Button>
            )}
            <output
              className="min-w-16 text-muted-foreground"
              aria-label={t('预演步骤')}
              aria-live="polite"
            >
              {moving
                ? t('播放第 {value0} 步', { value0: completed + 1 })
                : completed
                  ? `${completed} / ${steps.length}`
                  : t('开场画面')}
            </output>
          </div>
        )}
        {!preview && (
          <>
            <span className="ml-auto text-muted-foreground" aria-live="polite">
              {saving ? t('保存中…') : hasUnsaved ? t('未保存') : t('已保存')}
            </span>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={t('改用高级时间线')}
              title={t('改用高级时间线')}
              disabled={actionBlocked || dirty}
              onClick={() => (draft.effects.length ? setConvertOpen(true) : void convert())}
            >
              <SlidersHorizontal />
            </Button>
          </>
        )}
      </div>
      {preview && (
        <div data-hd-build-preview-navigation className="px-3 pb-1.5">
          <div
            ref={previewNavigationRef}
            className="flex min-w-0 items-center gap-1.5 overflow-x-auto py-1.5"
          >
            <button
              type="button"
              aria-label={t('预演定位：开场画面')}
              aria-current={displayedStepIndex < 0 ? 'step' : undefined}
              onClick={() => playback.seek(0)}
              className={`shrink-0 rounded border px-2.5 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-ring/60 ${displayedStepIndex < 0 ? 'border-primary/40 bg-primary/10 text-primary' : 'border-border/70 text-muted-foreground hover:bg-muted'}`}
            >
              {t('开场')}
            </button>
            {steps.map((step, index) => (
              <button
                key={step.id}
                type="button"
                data-hd-build-preview-stop={step.id}
                aria-label={t('预演定位：第 {value0} 步，{value1}', {
                  value0: index + 1,
                  value1: stepLabel(index),
                })}
                aria-current={displayedStepIndex === index ? 'step' : undefined}
                title={t('查看第 {value0} 步完成后的画面：{value1}', {
                  value0: index + 1,
                  value1: stepLabel(index),
                })}
                onClick={() => playback.seek(step.endMs)}
                className={`flex max-w-40 shrink-0 items-center gap-1.5 rounded border px-2.5 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-ring/60 ${displayedStepIndex === index ? 'border-primary/40 bg-primary/10 text-primary' : 'border-border/70 text-muted-foreground hover:bg-muted'}`}
              >
                <span className="font-mono tabular-nums">{index + 1}</span>
                <span className="truncate">{stepLabel(index)}</span>
              </button>
            ))}
          </div>
          <div
            className="flex min-w-0 items-center gap-4 text-[11px] text-muted-foreground"
            aria-live="polite"
          >
            <span
              className="min-w-0 flex-1 truncate"
              data-hd-build-preview-current
              title={displayedStepIndex < 0 ? t('开场画面') : stepLabel(displayedStepIndex)}
            >
              {moving ? t('播放') : activeStepIndex >= 0 ? t('暂停') : t('当前')}：
              {displayedStepIndex < 0 ? t('开场画面') : stepLabel(displayedStepIndex)}
            </span>
            <span
              className="min-w-0 flex-1 truncate"
              data-hd-build-preview-next
              title={
                upcomingStepIndex < steps.length ? stepLabel(upcomingStepIndex) : t('本页已完成')
              }
            >
              {upcomingStepIndex < steps.length
                ? t('下一步：{value0}', { value0: stepLabel(upcomingStepIndex) })
                : t('本页已完成')}
            </span>
          </div>
        </div>
      )}
      <div
        className={preview ? 'hidden' : 'flex flex-wrap items-center gap-2 px-3 py-2'}
        data-hd-build-add-controls
      >
        <select
          aria-label={t('添加动画的对象')}
          className={`${fieldClass} min-w-32 flex-1`}
          value={targetId}
          disabled={actionBlocked}
          onChange={(event) => setTargetId(event.target.value)}
        >
          {selectedRoots.length > 1 && (
            <option value={selectionValue}>
              {t('选中的 {value0} 个对象（同时）', { value0: selectedRoots.length })}
            </option>
          )}
          {!page.data.elements.length && <option value="">{t('先在画布添加对象')}</option>}
          {page.data.elements.map((element, index) => (
            <option key={element.elementId} value={element.elementId}>
              {index + 1}. {elementLabel(element)}
              {element.elementType === 'group' ? t('（组合）') : ''}
            </option>
          ))}
        </select>
        <select
          aria-label={t('添加的动画效果')}
          className={`${fieldClass} w-24`}
          value={kind}
          disabled={actionBlocked}
          onChange={(event) => setKind(event.target.value as BuildEffect['kind'])}
        >
          {Object.entries(effectLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {t(label)}
            </option>
          ))}
        </select>
        <Button
          variant="outline"
          size="xs"
          disabled={actionBlocked || !targetId}
          onClick={addEffect}
        >
          <Plus />
          {t('添加效果')}
        </Button>
      </div>
      {!preview && selectedRoots.length === 0 && (
        <div
          data-hd-animation-choose-object
          className="flex flex-wrap items-center gap-2 px-3 pb-1 text-muted-foreground"
        >
          <span>{t('未选中对象。')}</span>
          {targetId && onSelectTargets && (
            <Button
              variant="ghost"
              size="xs"
              disabled={actionBlocked}
              title={t('在画布或对象列表中选择目标，然后添加效果。')}
              onClick={() => onSelectTargets([targetId])}
            >
              {t('在画布选中此对象')}
            </Button>
          )}
        </div>
      )}
      {(displayedError || (dirty && !saving)) && (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-2 border-y border-amber-500/20 bg-amber-500/5 px-3 py-2"
        >
          <span className="min-w-40 flex-1">
            {displayedError ?? t('请确认当前输入，按 Enter 应用或按 Esc 还原。')}
          </span>
          <Button variant="ghost" size="xs" onClick={() => void copyDraft()}>
            <Copy />
            {t('复制动画草稿')}
          </Button>
          {dirty && !remoteChanged && !parseError && (
            <Button
              variant="outline"
              size="xs"
              disabled={saving || fields.size > 0}
              onClick={() => void commit(draftRef.current)}
            >
              {t('重试保存')}
            </Button>
          )}
          <Button variant="ghost" size="xs" disabled={saving || !hasUnsaved} onClick={reset}>
            <RotateCcw />
            {t('还原已保存')}
          </Button>
          {copyStatus && <span role="status">{t(copyStatus)}</span>}
        </div>
      )}
      <div
        className={
          preview
            ? 'hidden'
            : `flex min-h-0 border-t border-border/60 ${draft.effects.length ? (expanded ? 'h-56 max-h-[32vh]' : 'h-36 max-h-[25vh]') : 'h-20'}`
        }
        data-hd-build-authoring-controls
      >
        <fieldset
          className="min-w-0 flex-1 overflow-y-auto px-2 py-1"
          aria-label={t('动画步骤列表')}
        >
          {!draft.effects.length && (
            <div className="flex h-full items-center justify-center px-4 text-center leading-relaxed text-muted-foreground">
              {t('选中对象，添加淡入；放映时每次点击执行一个步骤。')}
            </div>
          )}
          {groups.map((group, index) => (
            <div key={group[0].id} data-hd-build-step={group[0].id} className="mb-1 last:mb-0">
              <div className="flex h-7 items-center gap-2 px-1">
                <span className="flex size-5 items-center justify-center rounded bg-primary/10 font-mono font-medium tabular-nums text-primary">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-muted-foreground">
                  {t('单击 {value0}', { value0: index + 1 })}
                </span>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="size-6"
                  aria-label={t('步骤 {value0} 上移', { value0: index + 1 })}
                  disabled={actionBlocked || index === 0}
                  onClick={() => applyDraft(reorderBuildStep(draftRef.current, group[0].id, -1))}
                >
                  <ArrowUp />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="size-6"
                  aria-label={t('步骤 {value0} 下移', { value0: index + 1 })}
                  disabled={actionBlocked || index === groups.length - 1}
                  onClick={() => applyDraft(reorderBuildStep(draftRef.current, group[0].id, 1))}
                >
                  <ArrowDown />
                </Button>
              </div>
              {group.map((effect) => {
                const element = elements.get(effect.targetId);
                const label = element ? elementLabel(element) : t('缺失对象');
                return (
                  <div
                    key={effect.id}
                    className={`ml-3 flex items-center rounded border-l-2 ${effect.id === selectedEffectId ? 'border-primary bg-primary/7' : 'border-border/60'}`}
                  >
                    <button
                      type="button"
                      data-hd-build-effect={effect.id}
                      aria-pressed={effect.id === selectedEffectId}
                      className="flex min-w-0 flex-1 items-center gap-2 rounded px-2 py-1.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                      onClick={() => choose(effect)}
                      title={`${label} · ${t(effectLabels[effect.kind])} · ${t(triggerLabels[effect.trigger])}`}
                    >
                      <span className="min-w-0 flex-1 truncate">{label}</span>
                      <span className="shrink-0">{t(effectLabels[effect.kind])}</span>
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {effect.trigger === 'click'
                          ? `${timelineSeconds(effect.durationMs)}s`
                          : effect.trigger === 'with-previous'
                            ? t('同时')
                            : t('接续')}
                      </span>
                    </button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className="mr-1 size-6 shrink-0"
                      aria-label={t('删除效果：{value0} · {value1}', {
                        value0: label,
                        value1: t(effectLabels[effect.kind]),
                      })}
                      disabled={actionBlocked}
                      onClick={() => applyDraft(removeBuildEffect(draftRef.current, effect.id))}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                );
              })}
            </div>
          ))}
        </fieldset>
        {!!draft.effects.length && (
          <aside
            aria-label={t('动画效果属性')}
            className="w-60 max-w-[48%] shrink-0 overflow-y-auto border-l border-border/60 p-2.5"
          >
            {selectedEffect && (
              <div key={`${selectedEffect.id}-${resetCount}`} className="grid grid-cols-2 gap-2">
                <label className="flex min-w-0 flex-col gap-1 text-muted-foreground">
                  {t('效果')}
                  <select
                    aria-label={t('当前效果')}
                    className={fieldClass}
                    value={selectedEffect.kind}
                    disabled={actionBlocked}
                    onChange={(event) => changeKind(event.target.value as BuildEffect['kind'])}
                  >
                    {Object.entries(effectLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {t(label)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex min-w-0 flex-col gap-1 text-muted-foreground">
                  {t('触发')}
                  <select
                    aria-label={t('效果触发方式')}
                    className={fieldClass}
                    value={selectedEffect.trigger}
                    disabled={actionBlocked}
                    onChange={(event) =>
                      patchEffect({ trigger: event.target.value as BuildEffect['trigger'] })
                    }
                  >
                    {Object.entries(triggerLabels).map(([value, label]) => (
                      <option
                        key={value}
                        value={value}
                        disabled={value !== 'click' && draft.effects[0]?.id === selectedEffect.id}
                      >
                        {t(label)}
                      </option>
                    ))}
                  </select>
                </label>
                {!instantEffect(selectedEffect.kind) && (
                  <TimelineField
                    label={t('效果时长（秒）')}
                    value={timelineSeconds(selectedEffect.durationMs)}
                    min={selectedEffect.kind === 'pulse' ? 0.002 : 0.001}
                    max={60}
                    step={0.001}
                    disabled={readonly}
                    onDirty={(value) => fieldDirty('duration', value)}
                    onError={setMessage}
                    onCommit={(value) => commitTime(value, 'durationMs')}
                  />
                )}
                <TimelineField
                  label={t('延迟（秒）')}
                  value={timelineSeconds(selectedEffect.delayMs)}
                  min={0}
                  max={MAX_BUILD_DELAY_MS / 1000}
                  step={0.001}
                  disabled={readonly}
                  onDirty={(value) => fieldDirty('delay', value)}
                  onError={setMessage}
                  onCommit={(value) => commitTime(value, 'delayMs')}
                />
                {selectedEffect.kind === 'move' && (
                  <>
                    <TimelineField
                      inputRef={moveInputRef}
                      label={t('水平移动')}
                      value={String(selectedEffect.dx ?? 0)}
                      min={-1_000_000}
                      max={1_000_000}
                      disabled={readonly}
                      onDirty={(value) => fieldDirty('dx', value)}
                      onError={setMessage}
                      onCommit={(value) => patchEffect({ dx: Number(value) })}
                    />
                    <TimelineField
                      label={t('垂直移动')}
                      value={String(selectedEffect.dy ?? 0)}
                      min={-1_000_000}
                      max={1_000_000}
                      disabled={readonly}
                      onDirty={(value) => fieldDirty('dy', value)}
                      onError={setMessage}
                      onCommit={(value) => patchEffect({ dy: Number(value) })}
                    />
                  </>
                )}
                <TimelineField
                  label={t('效果名称')}
                  type="text"
                  className="col-span-2"
                  value={selectedEffect.label ?? ''}
                  disabled={readonly}
                  onDirty={(value) => fieldDirty('label', value)}
                  onError={setMessage}
                  onCommit={(label) => patchEffect({ label })}
                />
              </div>
            )}
          </aside>
        )}
      </div>
      {!!draft.effects.length && !preview && (
        <div className="flex min-h-7 items-center gap-2 border-t border-border/50 px-3 text-[11px] text-muted-foreground">
          <span className="min-w-0 flex-1 truncate">
            {disabled ? t('当前页面只读，可逐步预演。') : t('步骤自动保存；播放不改变基础版式。')}
          </span>
          <button
            type="button"
            className="rounded px-1 py-1 outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            aria-label={expanded ? t('收拢步骤面板') : t('展开步骤面板')}
            aria-expanded={expanded}
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? t('收拢') : t('展开')}
          </button>
        </div>
      )}
      <Dialog open={convertOpen} onOpenChange={(open) => !saving && setConvertOpen(open)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('转换为高级时间线')}</DialogTitle>
            <DialogDescription>
              {t(
                '这些步骤将转换为关键帧，此后在时间线上编辑。当前播放效果保留；撤销可恢复步骤编排。',
              )}
            </DialogDescription>
          </DialogHeader>
          {message && (
            <p role="alert" className="text-sm text-destructive">
              {t(message)}
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" disabled={saving} onClick={() => setConvertOpen(false)}>
              {t('取消')}
            </Button>
            <Button disabled={actionBlocked || dirty} onClick={() => void convert()}>
              {saving ? t('转换中…') : t('转换为关键帧')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
