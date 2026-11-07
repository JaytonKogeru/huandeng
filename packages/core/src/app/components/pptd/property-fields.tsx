import { useEffect, useId, useRef, useState } from 'react';
import { Input } from '../ui/input';

export function NumberField({
  label,
  value,
  onCommit,
  disabled,
  min,
  max,
  step = 1,
  onBegin,
  onEnd,
}: {
  label: string;
  value: number;
  onCommit: (value: number) => void;
  disabled?: boolean;
  min?: number;
  max?: number;
  step?: number;
  onBegin?: () => void;
  onEnd?: () => void;
}) {
  const id = useId();
  const [draft, setDraft] = useState(String(Math.round(value * 100) / 100));
  const focused = useRef(false);
  const skip = useRef(false);
  useEffect(() => {
    if (!focused.current) setDraft(String(Math.round(value * 100) / 100));
  }, [value]);
  return (
    <label htmlFor={id} className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
      <span className="min-w-7 shrink-0">{label}</span>
      <Input
        id={id}
        type="number"
        aria-label={label}
        value={draft}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        className="h-7 text-right font-mono text-xs"
        onFocus={() => {
          focused.current = true;
          onBegin?.();
        }}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          focused.current = false;
          const next = Number(draft);
          if (!skip.current && draft.trim() && Number.isFinite(next))
            onCommit(Math.min(max ?? Infinity, Math.max(min ?? -Infinity, next)));
          else setDraft(String(value));
          skip.current = false;
          onEnd?.();
        }}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.nativeEvent.isComposing || event.keyCode === 229) return;
          if (event.key === 'Enter') event.currentTarget.blur();
          if (event.key === 'Escape') {
            skip.current = true;
            setDraft(String(value));
            event.currentTarget.blur();
          }
        }}
      />
    </label>
  );
}

export function StringField({
  label,
  value,
  onCommit,
  disabled,
  onBegin,
  onEnd,
}: {
  label: string;
  value: string;
  onCommit: (value: string) => void;
  disabled?: boolean;
  onBegin: () => void;
  onEnd: () => void;
}) {
  const id = useId();
  const [draft, setDraft] = useState(value);
  const focused = useRef(false);
  const skip = useRef(false);
  useEffect(() => {
    if (!focused.current) setDraft(value);
  }, [value]);
  return (
    <label htmlFor={id} className="block space-y-1.5 text-xs text-muted-foreground">
      <span>{label}</span>
      <Input
        id={id}
        aria-label={label}
        value={draft}
        disabled={disabled}
        onFocus={() => {
          focused.current = true;
          onBegin();
        }}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          focused.current = false;
          if (!skip.current) onCommit(draft);
          else setDraft(value);
          skip.current = false;
          onEnd();
        }}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.nativeEvent.isComposing || event.keyCode === 229) return;
          if (event.key === 'Enter') event.currentTarget.blur();
          if (event.key === 'Escape') {
            skip.current = true;
            event.currentTarget.blur();
          }
        }}
      />
    </label>
  );
}
