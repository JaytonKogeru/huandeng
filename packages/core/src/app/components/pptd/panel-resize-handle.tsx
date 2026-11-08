import { useRef } from 'react';
import { useHuandengLocale } from '@/lib/huandeng-locale';

export function PanelResizeHandle({
  label,
  value,
  min,
  max,
  axis,
  direction = 1,
  onChange,
  onCommit,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  axis: 'x' | 'y';
  direction?: 1 | -1;
  onChange: (value: number) => void;
  onCommit?: (value: number) => void;
}) {
  const { t } = useHuandengLocale();
  const drag = useRef<{ pointer: number; origin: number; value: number; current: number } | null>(
    null,
  );
  const bounded = (next: number) => Math.round(Math.max(min, Math.min(max, next)));
  return (
    <hr
      tabIndex={0}
      aria-label={t(label)}
      aria-orientation={axis === 'x' ? 'vertical' : 'horizontal'}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      className={`hd-panel-resizer ${axis === 'x' ? 'hd-panel-resizer-x' : 'hd-panel-resizer-y'}`}
      data-hd-panel-resizer={axis}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        event.preventDefault();
        drag.current = {
          pointer: event.pointerId,
          origin: axis === 'x' ? event.clientX : event.clientY,
          value,
          current: value,
        };
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        const current = drag.current;
        if (!current || current.pointer !== event.pointerId) return;
        current.current = bounded(
          current.value +
            direction * ((axis === 'x' ? event.clientX : event.clientY) - current.origin),
        );
        onChange(current.current);
      }}
      onPointerUp={(event) => {
        const current = drag.current;
        if (!current || current.pointer !== event.pointerId) return;
        drag.current = null;
        event.currentTarget.releasePointerCapture(event.pointerId);
        onCommit?.(current.current);
      }}
      onPointerCancel={() => {
        if (drag.current) onChange(drag.current.value);
        drag.current = null;
      }}
      onKeyDown={(event) => {
        const previous = axis === 'x' ? 'ArrowLeft' : 'ArrowUp';
        const next = axis === 'x' ? 'ArrowRight' : 'ArrowDown';
        if (![previous, next, 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        event.stopPropagation();
        const result =
          event.key === 'Home'
            ? min
            : event.key === 'End'
              ? max
              : bounded(
                  value + (event.key === next ? 1 : -1) * direction * (event.shiftKey ? 40 : 16),
                );
        onChange(result);
        onCommit?.(result);
      }}
    />
  );
}
