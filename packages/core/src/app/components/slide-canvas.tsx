import {
  type CSSProperties,
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { cn } from '@/lib/utils';
import { type DesignSystem, designToCssVars } from '../lib/design';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../lib/sdk';

type Props = {
  children: ReactNode;
  /** If set, use this scale directly. Otherwise fit to container. */
  scale?: number;
  center?: boolean;
  flat?: boolean;
  freezeMotion?: boolean;
  design?: DesignSystem;
  width?: number;
  height?: number;
  onScaleChange?: (scale: number) => void;
};

export function SlideCanvas({
  children,
  scale,
  center = true,
  flat = false,
  freezeMotion = false,
  design,
  width = CANVAS_WIDTH,
  height = CANVAS_HEIGHT,
  onScaleChange,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [fitScale, setFitScale] = useState<number | null>(null);

  useLayoutEffect(() => {
    if (scale !== undefined) return;
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const { width, height } = el.getBoundingClientRect();
      if (width === 0 || height === 0) return;
      setFitScale(Math.min(width / canvasWidth, height / canvasHeight));
    };
    // Measure synchronously before paint so the fitted scale is applied on the
    // first visible frame — otherwise the canvas flashes at full size.
    const canvasWidth = width;
    const canvasHeight = height;
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [scale, width, height]);

  const measured = scale ?? fitScale;
  const s = measured ?? 1;
  const scaledW = width * s;
  const scaledH = height * s;
  const designVars = design ? designToCssVars(design) : undefined;

  useEffect(() => {
    if (measured !== null) onScaleChange?.(measured);
  }, [measured, onScaleChange]);

  return (
    <div ref={containerRef} className={cn('relative h-full w-full', flat && 'overflow-hidden')}>
      <div
        className={cn(
          'overflow-hidden bg-white text-black',
          !flat && 'rounded-[6px] shadow-floating',
        )}
        style={
          {
            width: scaledW,
            height: scaledH,
            visibility: measured === null ? 'hidden' : undefined,
            ...(designVars
              ? {
                  ...designVars,
                  background: 'var(--osd-bg)',
                }
              : {}),
            ...(center
              ? {
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  transform: `translate(-50%, -50%)`,
                }
              : {}),
          } as CSSProperties
        }
      >
        <div
          data-osd-canvas
          data-osd-freeze-motion={freezeMotion ? '' : undefined}
          style={
            {
              width,
              height,
              transform: `scale(${s})`,
              transformOrigin: 'top left',
              ...(designVars ?? {}),
            } as CSSProperties
          }
        >
          {children}
        </div>
      </div>
      {freezeMotion && <div aria-hidden className="absolute inset-0 z-10" />}
    </div>
  );
}
