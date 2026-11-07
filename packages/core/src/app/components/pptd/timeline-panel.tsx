import {
  Copy,
  DiamondPlus,
  Flag,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Square,
  Trash2,
} from 'lucide-react';
import {
  type KeyboardEvent,
  type PointerEvent,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  MAX_TIMELINE_DURATION_MS,
  type PageTimeline,
  readTimeline,
  sampleTrack,
  TIMELINE_PROPERTIES,
  type TimelineEasing,
  type TimelineProperty,
  type TimelineTrack,
  timelineBaseValue,
  validateTimeline,
} from '../../../pptd/animation-model';
import type { PageSnapshot } from '../../../pptd/types';
import { elementLabel } from '../../lib/pptd-element-label';
import { Button } from '../ui/button';

export interface TimelinePanelProps {
  page: PageSnapshot;
  selectedIds?: string[];
  disabled?: boolean;
  previewResetKey?: number;
  onChange: (timeline: PageTimeline | null, expectedPageRevision: string) => Promise<unknown>;
  onPreview: (timeMs: number | null, timeline: PageTimeline | null) => void;
  onDirtyChange?: (dirty: boolean) => void;
}

const propertyLabels: Record<TimelineProperty, string> = {
  x: '水平位置',
  y: '垂直位置',
  rotation: '旋转',
  scaleX: '水平缩放',
  scaleY: '垂直缩放',
  opacity: '不透明度',
};
const easingLabels: Record<TimelineEasing, string> = {
  linear: '线性',
  'ease-in-out': '平滑',
  hold: '保持',
};
const fieldClass =
  'min-w-0 rounded border border-border bg-background px-2 py-1 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-50';
const focusClass = 'outline-none focus-visible:ring-2 focus-visible:ring-ring/60';
const emptySelection: string[] = [];
function identifier() {
  return crypto.randomUUID();
}
function seconds(value: number) {
  return `${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 2)}s`;
}
function displayValue(property: TimelineProperty, value: number) {
  const number =
    property === 'opacity' || property === 'scaleX' || property === 'scaleY' ? value * 100 : value;
  const unit = property === 'rotation' ? '°' : property === 'x' || property === 'y' ? '' : '%';
  return `${Number(number.toFixed(4))}${unit}`;
}
function changedKeyTime(timeline: PageTimeline, trackId: string, keyId: string, timeMs: number) {
  return {
    ...timeline,
    tracks: timeline.tracks.map((track) =>
      track.id !== trackId
        ? track
        : {
            ...track,
            keyframes: track.keyframes
              .map((key) => (key.id === keyId ? { ...key, timeMs } : key))
              .sort((a, b) => a.timeMs - b.timeMs),
          },
    ),
  };
}

function sameTimeline(left: PageTimeline | null, right: PageTimeline | null) {
  const stable = (value: PageTimeline | null) =>
    JSON.stringify(value, (_key, part) =>
      part && typeof part === 'object' && !Array.isArray(part)
        ? Object.fromEntries(
            Object.keys(part)
              .sort()
              .map((key) => [key, part[key]]),
          )
        : part,
    );
  try {
    return stable(left) === stable(right);
  } catch {
    return false;
  }
}

function TimelineField({
  label,
  value,
  onCommit,
  onDirty,
  onError,
  disabled,
  type = 'number',
  min,
  max,
  step = 'any',
  integer = false,
  className = 'w-full',
}: {
  label: string;
  value: string;
  onCommit: (value: string) => boolean | undefined;
  onDirty: (dirty: boolean) => void;
  onError: (message: string) => void;
  disabled: boolean;
  type?: 'number' | 'text';
  min?: number;
  max?: number;
  step?: number | 'any';
  integer?: boolean;
  className?: string;
}) {
  const id = useId();
  const [text, setText] = useState(value);
  const [invalid, setInvalid] = useState(false);
  const editing = useRef(false);
  const dirtyCallback = useRef(onDirty);
  dirtyCallback.current = onDirty;
  useEffect(() => {
    if (!editing.current) setText(value);
  }, [value]);
  useEffect(() => () => dirtyCallback.current(false), []);
  const finish = () => {
    if (!editing.current) return;
    const number = Number(text);
    if (
      (type === 'number' &&
        (!text.trim() ||
          !Number.isFinite(number) ||
          (integer && !Number.isInteger(number)) ||
          (min !== undefined && number < min) ||
          (max !== undefined && number > max))) ||
      (type === 'text' && text.length > 200)
    ) {
      setInvalid(true);
      onError(`请检查「${label}」的数值${integer ? '，需要整数' : ''}；按 Esc 可还原输入。`);
      return;
    }
    if (text !== value && onCommit(text) === false) {
      setInvalid(true);
      return;
    }
    editing.current = false;
    setInvalid(false);
    onDirty(false);
  };
  return (
    <label
      className={`flex min-w-0 flex-col gap-1 text-[10px] text-muted-foreground ${className}`}
      htmlFor={id}
    >
      {label}
      <input
        id={id}
        aria-label={label}
        data-hd-timeline-input={label}
        data-hd-input-dirty={editing.current ? 'true' : undefined}
        aria-invalid={invalid || undefined}
        className={`${fieldClass} ${invalid ? 'border-destructive' : ''}`}
        type={type}
        value={text}
        min={min}
        max={max}
        step={step}
        maxLength={type === 'text' ? 200 : undefined}
        disabled={disabled}
        onChange={(event) => {
          editing.current = true;
          setText(event.target.value);
          setInvalid(false);
          onDirty(true);
        }}
        onBlur={finish}
        onKeyDown={(event) => {
          if (event.nativeEvent.isComposing || event.keyCode === 229) return;
          if (event.key === 'Enter') {
            event.preventDefault();
            event.currentTarget.blur();
          } else if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            editing.current = false;
            setText(value);
            setInvalid(false);
            onDirty(false);
          }
        }}
      />
    </label>
  );
}

export function TimelinePanel(props: TimelinePanelProps) {
  const parsed = useMemo(() => {
    try {
      return { timeline: readTimeline(props.page.data), error: null };
    } catch (error) {
      return { timeline: null, error: error instanceof Error ? error.message : '动画时间线无效。' };
    }
  }, [props.page.data]);
  return (
    <TimelineEditor
      key={`${props.page.pageId}:${props.page.occurrenceId ?? ''}:${props.page.versionId ?? ''}`}
      {...props}
      persisted={parsed.timeline}
      parseError={parsed.error}
    />
  );
}

function TimelineEditor({
  page,
  selectedIds = emptySelection,
  disabled = false,
  previewResetKey = 0,
  persisted,
  parseError,
  onChange,
  onPreview,
  onDirtyChange,
}: TimelinePanelProps & { persisted: PageTimeline | null; parseError: string | null }) {
  const [draft, setDraft] = useState(persisted);
  const draftRef = useRef(draft);
  const [baseRevision, setBaseRevision] = useState(page.pageRevision);
  const [dirty, setDirty] = useState(false);
  const [fields, setFields] = useState<Set<string>>(new Set());
  const [resetCount, setResetCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const submitted = useRef<{ revision: string; timeline: PageTimeline | null } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const panelRef = useRef<HTMLElement>(null);
  const [trackId, setTrackId] = useState<string | null>(null);
  const [keyId, setKeyId] = useState<string | null>(null);
  const [cueId, setCueId] = useState<string | null>(null);
  const [targetId, setTargetId] = useState(
    selectedIds[0] ?? page.data.elements[0]?.elementId ?? '',
  );
  const [property, setProperty] = useState<TimelineProperty>('x');
  const [playhead, setPlayhead] = useState(0);
  const playheadRef = useRef(0);
  const [preview, setPreview] = useState(false);
  const [playing, setPlaying] = useState(false);
  const onPreviewRef = useRef(onPreview);
  const onDirtyRef = useRef(onDirtyChange);
  onPreviewRef.current = onPreview;
  onDirtyRef.current = onDirtyChange;
  const duration = draft?.durationMs ?? 4000;
  const hasUnsaved = dirty || fields.size > 0 || saving;
  const remoteChanged = (dirty || fields.size > 0) && baseRevision !== page.pageRevision && !saving;
  const readonly = disabled || saving || remoteChanged || !!parseError;
  const actionBlocked = readonly || fields.size > 0;
  const selectedTrack = draft?.tracks.find((track) => track.id === trackId);
  const selectedKey = selectedTrack?.keyframes.find((key) => key.id === keyId);
  const selectedCue = draft?.cues?.find((cue) => cue.id === cueId);
  const elements = useMemo(
    () => new Map(page.data.elements.map((element) => [element.elementId, element])),
    [page.data.elements],
  );
  const followedSelection = useRef<string | undefined>(undefined);
  const drag = useRef<{
    pointerId: number;
    trackId: string;
    keyId: string;
    startX: number;
    startTime: number;
    width: number;
    minimum: number;
    maximum: number;
    original: PageTimeline;
    originalDirty: boolean;
  } | null>(null);
  const updateDraft = (timeline: PageTimeline | null) => {
    draftRef.current = timeline;
    setDraft(timeline);
  };
  const position = (time: number) => {
    const next = Math.max(0, Math.min(duration, Math.round(time)));
    playheadRef.current = next;
    setPlayhead(next);
  };
  const seek = (time: number) => {
    setPlaying(false);
    setPreview(true);
    position(time);
  };

  useEffect(() => {
    if (saving || fields.size || parseError) return;
    if (dirty) {
      if (
        !drag.current &&
        baseRevision !== page.pageRevision &&
        sameTimeline(persisted, draftRef.current)
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
      !sameTimeline(submitted.current.timeline, persisted)
    )
      return;
    submitted.current = null;
    draftRef.current = persisted;
    setDraft(persisted);
    setBaseRevision(page.pageRevision);
  }, [persisted, page.pageRevision, baseRevision, dirty, saving, fields.size, parseError]);
  useEffect(() => {
    if (followedSelection.current !== selectedIds[0]) {
      followedSelection.current = selectedIds[0];
      if (selectedIds[0] && elements.has(selectedIds[0])) setTargetId(selectedIds[0]);
    }
    setTargetId((current) =>
      elements.has(current) ? current : (page.data.elements[0]?.elementId ?? ''),
    );
  }, [selectedIds, elements, page.data.elements]);
  useEffect(() => {
    onPreviewRef.current(preview ? Math.min(playhead, duration) : null, draft);
  }, [preview, playhead, draft, duration]);
  useEffect(() => {
    onDirtyRef.current?.(hasUnsaved);
  }, [hasUnsaved]);
  useEffect(() => {
    void previewResetKey;
    setPlaying(false);
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
  useEffect(() => {
    if (!playing) return;
    const start = performance.now() - playheadRef.current;
    let frame = 0;
    const advance = (now: number) => {
      const next = Math.min(duration, Math.max(0, Math.round(now - start)));
      playheadRef.current = next;
      setPlayhead(next);
      if (next >= duration) setPlaying(false);
      else frame = requestAnimationFrame(advance);
    };
    frame = requestAnimationFrame(advance);
    return () => cancelAnimationFrame(frame);
  }, [playing, duration]);

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
  const canApply = (timeline: PageTimeline | null) => {
    if (savingRef.current || disabled || parseError) return false;
    try {
      if (timeline) validateTimeline(timeline, page.data);
      if (baseRevision !== page.pageRevision)
        throw new Error('页面已在其他位置修改。动画草稿已保留，请还原到已保存版本后重新编辑。');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '请检查动画数值。');
      return false;
    }
    return true;
  };
  const commit = async (timeline: PageTimeline | null) => {
    if (!canApply(timeline)) return;
    updateDraft(timeline);
    setDirty(true);
    setMessage(null);
    savingRef.current = true;
    setSaving(true);
    try {
      await onChange(timeline, baseRevision);
      submitted.current = { revision: baseRevision, timeline };
      setDirty(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '动画保存失败，草稿已保留。');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };
  const choose = (
    nextTrackId: string | null,
    nextKeyId: string | null,
    nextCueId: string | null = null,
  ) => {
    if (fields.size) {
      setMessage('请先确认当前输入，按 Enter 应用或按 Esc 还原。');
      return false;
    }
    setTrackId(nextTrackId);
    setKeyId(nextKeyId);
    setCueId(nextCueId);
    return true;
  };
  const togglePlayback = () => {
    setPreview(true);
    if (playing) setPlaying(false);
    else {
      if (playheadRef.current >= duration) position(0);
      setPlaying(true);
    }
  };
  const addTrack = () => {
    if (actionBlocked) return;
    const element = elements.get(targetId);
    if (!element) return;
    const timeline = draftRef.current ?? { schemaVersion: 1, durationMs: 4000, tracks: [] };
    const existing = timeline.tracks.find(
      (track) => track.targetId === targetId && track.property === property,
    );
    if (existing) {
      choose(existing.id, existing.keyframes[0].id);
      return;
    }
    const value = timelineBaseValue(element, property);
    const next: TimelineTrack = {
      id: identifier(),
      targetId,
      property,
      keyframes: [
        { id: identifier(), timeMs: 0, value, easing: 'ease-in-out' },
        { id: identifier(), timeMs: timeline.durationMs, value, easing: 'ease-in-out' },
      ],
    };
    choose(next.id, next.keyframes[0].id);
    seek(0);
    void commit({ ...timeline, tracks: [...timeline.tracks, next] });
  };
  const addKey = () => {
    const timeline = draftRef.current;
    if (actionBlocked || !timeline || !selectedTrack) return;
    const existing = selectedTrack.keyframes.find((key) => key.timeMs === playhead);
    if (existing) {
      choose(selectedTrack.id, existing.id);
      return;
    }
    const key = {
      id: identifier(),
      timeMs: playhead,
      value: sampleTrack(selectedTrack, playhead),
      easing: 'ease-in-out' as const,
    };
    choose(selectedTrack.id, key.id);
    void commit({
      ...timeline,
      tracks: timeline.tracks.map((track) =>
        track.id === selectedTrack.id
          ? { ...track, keyframes: [...track.keyframes, key].sort((a, b) => a.timeMs - b.timeMs) }
          : track,
      ),
    });
  };
  const removeTrack = (id: string) => {
    const timeline = draftRef.current;
    if (actionBlocked || !timeline) return;
    if (trackId === id) choose(null, null);
    void commit({ ...timeline, tracks: timeline.tracks.filter((track) => track.id !== id) });
  };
  const removeKey = () => {
    const timeline = draftRef.current;
    if (actionBlocked || !timeline || !selectedTrack || !selectedKey) return;
    if (selectedTrack.keyframes.length === 1) return removeTrack(selectedTrack.id);
    const remaining = selectedTrack.keyframes.filter((key) => key.id !== selectedKey.id);
    choose(selectedTrack.id, remaining[0].id);
    void commit({
      ...timeline,
      tracks: timeline.tracks.map((track) =>
        track.id === selectedTrack.id ? { ...track, keyframes: remaining } : track,
      ),
    });
  };
  const patchKey = (changes: { timeMs?: number; value?: number; easing?: TimelineEasing }) => {
    const timeline = draftRef.current;
    if (!timeline || !selectedTrack || !selectedKey || readonly) return false;
    const next = {
      ...timeline,
      tracks: timeline.tracks.map((track) =>
        track.id !== selectedTrack.id
          ? track
          : {
              ...track,
              keyframes: track.keyframes
                .map((key) => (key.id === selectedKey.id ? { ...key, ...changes } : key))
                .sort((a, b) => a.timeMs - b.timeMs),
            },
      ),
    };
    if (!canApply(next)) return false;
    if (changes.timeMs !== undefined) seek(changes.timeMs);
    void commit(next);
    return true;
  };
  const addCue = () => {
    if (actionBlocked) return;
    const timeline = draftRef.current ?? { schemaVersion: 1, durationMs: 4000, tracks: [] };
    const existing = timeline.cues?.find((cue) => cue.timeMs === playhead);
    if (existing) return void choose(null, null, existing.id);
    const cue = {
      id: identifier(),
      timeMs: playhead,
      label: `步骤 ${(timeline.cues?.length ?? 0) + 1}`,
    };
    choose(null, null, cue.id);
    void commit({
      ...timeline,
      cues: [...(timeline.cues ?? []), cue].sort((a, b) => a.timeMs - b.timeMs),
    });
  };
  const patchCue = (changes: { timeMs?: number; label?: string }) => {
    const timeline = draftRef.current;
    if (!timeline || !selectedCue || readonly) return false;
    const next = {
      ...timeline,
      cues: timeline.cues
        ?.map((cue) => (cue.id === selectedCue.id ? { ...cue, ...changes } : cue))
        .sort((a, b) => a.timeMs - b.timeMs),
    };
    if (!canApply(next)) return false;
    void commit(next);
    if (changes.timeMs !== undefined) seek(changes.timeMs);
    return true;
  };
  const beginDrag = (event: PointerEvent<HTMLButtonElement>, track: TimelineTrack, id: string) => {
    event.stopPropagation();
    if (event.button !== 0 || actionBlocked || !draftRef.current) return;
    event.preventDefault();
    event.currentTarget.focus();
    const index = track.keyframes.findIndex((key) => key.id === id);
    const key = track.keyframes[index];
    choose(track.id, id);
    seek(key.timeMs);
    drag.current = {
      pointerId: event.pointerId,
      trackId: track.id,
      keyId: id,
      startX: event.clientX,
      startTime: key.timeMs,
      width: event.currentTarget.parentElement?.getBoundingClientRect().width ?? 1,
      minimum: index ? track.keyframes[index - 1].timeMs + 1 : 0,
      maximum:
        index < track.keyframes.length - 1 ? track.keyframes[index + 1].timeMs - 1 : duration,
      original: draftRef.current,
      originalDirty: dirty,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const moveDrag = (event: PointerEvent<HTMLButtonElement>) => {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    const time = Math.max(
      current.minimum,
      Math.min(
        current.maximum,
        Math.round(
          current.startTime +
            ((event.clientX - current.startX) / Math.max(1, current.width)) * duration,
        ),
      ),
    );
    updateDraft(changedKeyTime(current.original, current.trackId, current.keyId, time));
    setDirty(current.originalDirty || time !== current.startTime);
    position(time);
  };
  const finishDrag = (event: PointerEvent<HTMLButtonElement>, cancel = false) => {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    if (cancel) {
      updateDraft(current.original);
      setDirty(current.originalDirty);
      position(current.startTime);
      return;
    }
    const key = draftRef.current?.tracks
      .find((track) => track.id === current.trackId)
      ?.keyframes.find((key) => key.id === current.keyId);
    if (key?.timeMs !== current.startTime) void commit(draftRef.current);
  };
  const keyKeyboard = (
    event: KeyboardEvent<HTMLButtonElement>,
    track: TimelineTrack,
    id: string,
  ) => {
    if (
      event.nativeEvent.isComposing ||
      event.keyCode === 229 ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      actionBlocked
    )
      return;
    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      event.stopPropagation();
      if (trackId === track.id && keyId === id) removeKey();
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      event.stopPropagation();
      const key = track.keyframes.find((key) => key.id === id);
      if (key && trackId === track.id && keyId === id)
        patchKey({
          timeMs: Math.max(
            0,
            Math.min(
              duration,
              key.timeMs + (event.key === 'ArrowLeft' ? -1 : 1) * (event.shiftKey ? 100 : 10),
            ),
          ),
        });
    }
  };
  const reset = () => {
    if (saving) return;
    updateDraft(persisted);
    setBaseRevision(page.pageRevision);
    submitted.current = null;
    setDirty(false);
    setFields(new Set());
    setResetCount((count) => count + 1);
    setMessage(null);
    setCopyStatus(null);
    setPlaying(false);
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
      timeline: draftRef.current ?? page.data.timeline ?? null,
      selection: { trackId, keyframeId: keyId, cueId },
      pendingInputs,
    };
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      setCopyStatus('动画草稿已复制。');
    } catch {
      setCopyStatus('浏览器未允许访问剪贴板，动画草稿仍保留在此处。');
    }
  };
  const trackLabel = (track: TimelineTrack) => {
    const element = elements.get(track.targetId);
    return `${element ? elementLabel(element) : '缺失对象'} · ${propertyLabels[track.property]}`;
  };
  const numericFactor =
    selectedTrack && ['opacity', 'scaleX', 'scaleY'].includes(selectedTrack.property) ? 100 : 1;
  const numericLabel =
    selectedTrack?.property === 'opacity'
      ? '不透明度（%）'
      : selectedTrack?.property === 'scaleX' || selectedTrack?.property === 'scaleY'
        ? '缩放（%）'
        : selectedTrack?.property === 'rotation'
          ? '角度（°）'
          : '位置';
  return (
    <section
      ref={panelRef}
      data-hd-keyboard-region="timeline"
      data-hd-timeline
      aria-label="页面动画时间线"
      className="shrink-0 border-t border-border bg-card text-xs"
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
        if (event.key === 'Escape' && drag.current) {
          event.preventDefault();
          event.stopPropagation();
          const current = drag.current;
          drag.current = null;
          updateDraft(current.original);
          setDirty(current.originalDirty);
          position(current.startTime);
        } else if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          setPlaying(false);
          setPreview(false);
        } else if (event.code === 'Space') {
          if (target.closest('button') && !target.closest('[data-hd-keyframe]')) return;
          event.preventDefault();
          togglePlayback();
        } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          event.preventDefault();
          seek(playhead + (event.key === 'ArrowLeft' ? -1 : 1) * (event.shiftKey ? 100 : 10));
        } else if (event.key === 'Home' || event.key === 'End') {
          event.preventDefault();
          seek(event.key === 'Home' ? 0 : duration);
        }
      }}
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-border/60 px-3 py-2">
        <span className="mr-1 font-medium">动画</span>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label={playing ? '暂停动画' : '播放动画'}
          title={playing ? '暂停（空格）' : '播放（空格）'}
          onClick={togglePlayback}
        >
          {playing ? <Pause /> : <Play />}
        </Button>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label="停止并回到起点"
          title="停止并回到起点"
          onClick={() => seek(0)}
        >
          <Square />
        </Button>
        <output className="min-w-28 font-mono text-[11px] tabular-nums" aria-label="动画时间">
          {seconds(Math.min(playhead, duration))} / {seconds(duration)}
        </output>
        <input
          className="h-5 min-w-24 flex-1 accent-primary"
          type="range"
          aria-label="动画播放头（毫秒）"
          min={0}
          max={duration}
          step={1}
          value={Math.min(playhead, duration)}
          onChange={(event) => seek(Number(event.target.value))}
        />
        <Button
          variant={preview ? 'secondary' : 'ghost'}
          size="xs"
          onClick={() => {
            setPlaying(false);
            setPreview(!preview);
          }}
        >
          {preview ? '返回编辑' : '预览动画'}
        </Button>
        <TimelineField
          key={`duration-${resetCount}`}
          label="时长（秒）"
          className="w-20"
          value={String(duration / 1000)}
          min={0.001}
          max={MAX_TIMELINE_DURATION_MS / 1000}
          disabled={readonly}
          onDirty={(value) => fieldDirty('duration', value)}
          onError={setMessage}
          onCommit={(value) => {
            const next = {
              ...(draftRef.current ?? { schemaVersion: 1 as const, tracks: [] }),
              durationMs: Math.round(Number(value) * 1000),
            };
            if (!canApply(next)) return false;
            void commit(next);
            return true;
          }}
        />
        <span className="min-w-14 text-[10px] text-muted-foreground" aria-live="polite">
          {saving ? '保存中…' : hasUnsaved ? '未保存' : '已保存'}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2 px-3 py-2">
        <select
          aria-label="动画目标对象"
          className={`${fieldClass} max-w-52 flex-1`}
          value={targetId}
          disabled={actionBlocked}
          onChange={(event) => setTargetId(event.target.value)}
        >
          {!page.data.elements.length && <option value="">页面暂无对象</option>}
          {page.data.elements.map((element, index) => (
            <option key={element.elementId} value={element.elementId}>
              {index + 1}. {elementLabel(element)}
              {element.elementType === 'group' ? '（组合）' : ''}
            </option>
          ))}
        </select>
        <select
          aria-label="动画属性"
          className={fieldClass}
          value={property}
          disabled={actionBlocked}
          onChange={(event) => setProperty(event.target.value as TimelineProperty)}
        >
          {TIMELINE_PROPERTIES.map((value) => (
            <option key={value} value={value}>
              {propertyLabels[value]}
            </option>
          ))}
        </select>
        <Button
          variant="outline"
          size="xs"
          disabled={actionBlocked || !targetId}
          onClick={addTrack}
        >
          <Plus />
          添加轨道
        </Button>
        <Button
          variant="ghost"
          size="xs"
          disabled={actionBlocked || !selectedTrack}
          onClick={addKey}
        >
          <DiamondPlus />
          添加关键帧
        </Button>
        <Button variant="ghost" size="xs" disabled={actionBlocked} onClick={addCue}>
          <Flag />
          演讲步骤
        </Button>
        <span className="ml-auto text-[10px] text-muted-foreground">
          拖动菱形调整时间 · 选中后编辑数值
        </span>
      </div>
      {(message || remoteChanged || parseError || (hasUnsaved && !saving)) && (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-2 border-y border-amber-500/20 bg-amber-500/5 px-3 py-2 text-[11px]"
        >
          <span className="flex-1">
            {parseError
              ? `${parseError} 原始动画数据已保留，此时间线暂不能编辑。`
              : remoteChanged
                ? '页面已在其他位置更新。当前动画草稿已保留，请先还原到已保存版本。'
                : (message ?? '动画草稿尚未保存。请确认输入或完成当前拖动。')}
          </span>
          <Button variant="ghost" size="xs" onClick={() => void copyDraft()}>
            <Copy />
            复制动画草稿
          </Button>
          {copyStatus && <span role="status">{copyStatus}</span>}
          {dirty && !remoteChanged && !parseError && (
            <Button
              variant="outline"
              size="xs"
              disabled={saving || fields.size > 0}
              onClick={() => void commit(draftRef.current)}
            >
              重试保存
            </Button>
          )}
          <Button variant="ghost" size="xs" disabled={saving || !hasUnsaved} onClick={reset}>
            <RotateCcw />
            还原已保存
          </Button>
        </div>
      )}
      <div className="flex min-h-36 border-t border-border/60">
        <div className="min-w-0 flex-1 overflow-x-auto px-3 pb-2">
          <div className="min-w-80">
            <div className="flex h-6 items-end pb-1 text-[10px] text-muted-foreground">
              <span className="w-40 shrink-0">对象 / 属性</span>
              <div className="relative mr-3 h-4 flex-1">
                {[0, 0.25, 0.5, 0.75, 1].map((fraction) => (
                  <span
                    key={fraction}
                    className="absolute -translate-x-1/2"
                    style={{ left: `${fraction * 100}%` }}
                  >
                    {seconds(duration * fraction)}
                  </span>
                ))}
              </div>
            </div>
            <div className="max-h-44 overflow-y-auto pr-3">
              {!draft?.tracks.length && (
                <div className="flex min-h-24 items-center justify-center px-6 text-center text-[11px] leading-relaxed text-muted-foreground">
                  选择一个对象和属性，添加轨道后设置开始与结束值。
                  <br />
                  位置、旋转、缩放和透明度可以组合使用。
                </div>
              )}
              {draft?.tracks.map((track) => (
                <div
                  key={track.id}
                  className={`flex h-8 items-center rounded ${track.id === trackId ? 'bg-primary/5' : ''}`}
                  data-hd-timeline-track={track.id}
                >
                  <div className="flex w-40 shrink-0 items-center gap-1 pr-2">
                    <button
                      type="button"
                      className={`min-w-0 flex-1 truncate rounded px-1 py-1 text-left text-[10px] ${focusClass}`}
                      title={trackLabel(track)}
                      onClick={() => choose(track.id, track.keyframes[0].id)}
                    >
                      {trackLabel(track)}
                    </button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className="size-5 shrink-0 text-muted-foreground"
                      aria-label={`删除轨道：${trackLabel(track)}`}
                      disabled={actionBlocked}
                      onClick={() => removeTrack(track.id)}
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                  <div className="relative h-8 min-w-0 flex-1" data-hd-timeline-lane>
                    <button
                      type="button"
                      className={`absolute inset-0 my-1 rounded bg-muted/55 ${focusClass}`}
                      aria-label={`在${trackLabel(track)}轨道定位时间`}
                      onPointerDown={(event) => {
                        if (event.button !== 0) return;
                        const rect = event.currentTarget.getBoundingClientRect();
                        choose(track.id, null);
                        seek(((event.clientX - rect.left) / rect.width) * duration);
                      }}
                    />
                    <span
                      className="pointer-events-none absolute inset-y-0 z-10 w-px bg-primary/65"
                      style={{ left: `${Math.min(playhead / duration, 1) * 100}%` }}
                    />
                    {track.keyframes.map((key) => (
                      <button
                        key={key.id}
                        type="button"
                        aria-label={`${trackLabel(track)}，${seconds(key.timeMs)}，${displayValue(track.property, key.value)}`}
                        aria-pressed={track.id === trackId && key.id === keyId}
                        title={`${seconds(key.timeMs)} · ${displayValue(track.property, key.value)} · ${easingLabels[key.easing]}`}
                        data-hd-keyframe={key.id}
                        className={`absolute top-1/2 z-20 flex h-7 w-5 -translate-x-1/2 -translate-y-1/2 touch-none items-center justify-center rounded ${focusClass}`}
                        style={{ left: `${(key.timeMs / duration) * 100}%` }}
                        onClick={() => {
                          if (choose(track.id, key.id)) seek(key.timeMs);
                        }}
                        onPointerDown={(event) => beginDrag(event, track, key.id)}
                        onPointerMove={moveDrag}
                        onPointerUp={(event) => finishDrag(event)}
                        onPointerCancel={(event) => finishDrag(event, true)}
                        onFocus={() => choose(track.id, key.id)}
                        onKeyDown={(event) => keyKeyboard(event, track, key.id)}
                      >
                        <span
                          className={`size-2.5 rotate-45 border transition-colors motion-reduce:transition-none ${track.id === trackId && key.id === keyId ? 'border-primary bg-primary' : 'border-muted-foreground/55 bg-background'}`}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {!!draft?.cues?.length && (
                <div className="flex h-8 items-center">
                  <span className="w-40 shrink-0 px-1 text-[10px] text-muted-foreground">
                    演讲步骤
                  </span>
                  <div className="relative h-8 flex-1">
                    {draft.cues.map((cue, index) => (
                      <button
                        key={cue.id}
                        type="button"
                        aria-label={`演讲步骤 ${index + 1}：${cue.label}，${seconds(cue.timeMs)}`}
                        aria-pressed={cue.id === cueId}
                        className={`absolute top-1/2 flex size-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded ${focusClass} ${cue.id === cueId ? 'bg-amber-500/15 text-amber-600' : 'text-muted-foreground'}`}
                        style={{ left: `${(cue.timeMs / duration) * 100}%` }}
                        title={`${cue.label} · ${seconds(cue.timeMs)}`}
                        onClick={() => {
                          if (choose(null, null, cue.id)) seek(cue.timeMs);
                        }}
                      >
                        <Flag className="size-3" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <aside
          className="w-48 shrink-0 space-y-2 border-l border-border/60 p-3"
          aria-label="关键帧属性"
        >
          {selectedKey && selectedTrack ? (
            <div key={`${selectedKey.id}-${resetCount}`} className="space-y-2">
              <p className="truncate text-[11px] font-medium" title={trackLabel(selectedTrack)}>
                {trackLabel(selectedTrack)}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <TimelineField
                  label="时间（毫秒）"
                  value={String(selectedKey.timeMs)}
                  min={0}
                  max={duration}
                  integer
                  disabled={readonly}
                  onDirty={(value) => fieldDirty('key-time', value)}
                  onError={setMessage}
                  onCommit={(value) => patchKey({ timeMs: Number(value) })}
                />
                <TimelineField
                  label={numericLabel}
                  value={String(Number((selectedKey.value * numericFactor).toFixed(5)))}
                  min={
                    numericFactor === 100
                      ? 0
                      : selectedTrack.property === 'rotation'
                        ? -360_000
                        : -1_000_000
                  }
                  max={
                    selectedTrack.property === 'opacity'
                      ? 100
                      : numericFactor === 100
                        ? 10_000
                        : selectedTrack.property === 'rotation'
                          ? 360_000
                          : 1_000_000
                  }
                  disabled={readonly}
                  onDirty={(value) => fieldDirty('key-value', value)}
                  onError={setMessage}
                  onCommit={(value) => patchKey({ value: Number(value) / numericFactor })}
                />
              </div>
              <label className="flex flex-col gap-1 text-[10px] text-muted-foreground">
                到下一帧的变化
                <select
                  className={fieldClass}
                  aria-label="关键帧缓动"
                  value={selectedKey.easing}
                  disabled={actionBlocked}
                  onChange={(event) => patchKey({ easing: event.target.value as TimelineEasing })}
                >
                  {Object.entries(easingLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <Button variant="ghost" size="xs" disabled={actionBlocked} onClick={removeKey}>
                <Trash2 />
                删除关键帧
              </Button>
            </div>
          ) : selectedCue ? (
            <div key={`${selectedCue.id}-${resetCount}`} className="space-y-2">
              <p className="text-[11px] font-medium">演讲步骤</p>
              <TimelineField
                label="步骤名称"
                type="text"
                value={selectedCue.label}
                disabled={readonly}
                onDirty={(value) => fieldDirty('cue-label', value)}
                onError={setMessage}
                onCommit={(label) => patchCue({ label })}
              />
              <TimelineField
                label="步骤时间（毫秒）"
                value={String(selectedCue.timeMs)}
                min={0}
                max={duration}
                integer
                disabled={readonly}
                onDirty={(value) => fieldDirty('cue-time', value)}
                onError={setMessage}
                onCommit={(value) => patchCue({ timeMs: Number(value) })}
              />
              <Button
                variant="ghost"
                size="xs"
                disabled={actionBlocked}
                onClick={() => {
                  if (!draft) return;
                  void commit({
                    ...draft,
                    cues: draft.cues?.filter((cue) => cue.id !== selectedCue.id),
                  });
                  choose(null, null);
                }}
              >
                <Trash2 />
                删除步骤
              </Button>
            </div>
          ) : (
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              选择菱形编辑关键帧。
              <br />
              线性保持匀速，平滑让起止更柔和，保持会在下一帧直接切换。
            </p>
          )}
        </aside>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-1 border-t border-border/50 px-3 py-1.5 text-[10px] text-muted-foreground">
        <span>
          {disabled
            ? '当前页面只读，可播放预览。'
            : '每次修改自动保存，可用撤销恢复。组合轨道会带动所有成员。'}
        </span>
        <span>PDF / 图片 / PPTX 导出使用基准页面。</span>
      </div>
    </section>
  );
}
