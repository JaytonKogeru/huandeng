import { type PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from 'react';
import { type CanvasPoint, createPlacedElement, type InsertionTool } from '@/lib/pptd-insertion';
import { lineSvgPath } from '@/lib/pptd-line-curve';
import { presetShapePath } from '../../../pptd/shape-presets';
import type { PageSize, PptdElement } from '../../../pptd/types';

export function InsertionLayer({
  tool,
  size,
  onPlace,
}: {
  tool: InsertionTool;
  size: PageSize;
  onPlace: (element: PptdElement) => void;
}) {
  const gesture = useRef<{
    start: CanvasPoint;
    clientX: number;
    clientY: number;
    pointerId: number;
  } | null>(null);
  const [preview, setPreview] = useState<PptdElement | null>(null);
  const surface = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const cancel = () => {
      const pointerId = gesture.current?.pointerId;
      gesture.current = null;
      setPreview(null);
      if (pointerId !== undefined && surface.current?.hasPointerCapture(pointerId))
        surface.current.releasePointerCapture(pointerId);
    };
    window.addEventListener('blur', cancel);
    return () => window.removeEventListener('blur', cancel);
  }, []);
  const point = (event: ReactPointerEvent<HTMLDivElement>): CanvasPoint => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * size[0],
      y: ((event.clientY - rect.top) / rect.height) * size[1],
    };
  };
  const element = (event: ReactPointerEvent<HTMLDivElement>, elementId: string) => {
    const start = gesture.current;
    if (!start) return null;
    return createPlacedElement(tool, start.start, point(event), size, {
      dragged: Math.hypot(event.clientX - start.clientX, event.clientY - start.clientY) >= 4,
      constrain: event.shiftKey,
      elementId,
    });
  };
  const bounds = preview?.bounds;
  const shape =
    tool.kind === 'shape' && bounds ? presetShapePath(tool.shapeName, bounds[2], bounds[3]) : null;
  return (
    <div
      ref={surface}
      className="absolute inset-0 z-10 cursor-crosshair touch-none"
      data-hd-insertion-layer={tool.kind}
      onPointerDown={(event) => {
        if (event.button !== 0 || !event.isPrimary || gesture.current) return;
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.setPointerCapture(event.pointerId);
        gesture.current = {
          start: point(event),
          clientX: event.clientX,
          clientY: event.clientY,
          pointerId: event.pointerId,
        };
      }}
      onPointerMove={(event) => {
        if (gesture.current?.pointerId !== event.pointerId) return;
        setPreview(element(event, 'insertion-preview'));
      }}
      onPointerUp={(event) => {
        if (gesture.current?.pointerId !== event.pointerId) return;
        event.preventDefault();
        event.stopPropagation();
        const result = element(event, `node-${crypto.randomUUID()}`);
        gesture.current = null;
        setPreview(null);
        if (result) onPlace(result);
      }}
      onPointerCancel={(event) => {
        if (gesture.current?.pointerId !== event.pointerId) return;
        gesture.current = null;
        setPreview(null);
      }}
      onLostPointerCapture={(event) => {
        if (gesture.current?.pointerId !== event.pointerId) return;
        gesture.current = null;
        setPreview(null);
      }}
    >
      {bounds && (
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute overflow-visible text-brand"
          style={{ left: bounds[0], top: bounds[1], width: bounds[2], height: bounds[3] }}
          viewBox={`0 0 ${bounds[2]} ${bounds[3]}`}
          data-hd-insertion-preview
        >
          {tool.kind === 'line' && preview ? (
            <path d={lineSvgPath(preview)} fill="none" stroke="currentColor" strokeWidth="2" />
          ) : tool.kind === 'shape' && tool.shapeName === 'ellipse' ? (
            <ellipse
              cx={bounds[2] / 2}
              cy={bounds[3] / 2}
              rx={bounds[2] / 2}
              ry={bounds[3] / 2}
              fill="currentColor"
              fillOpacity="0.12"
              stroke="currentColor"
            />
          ) : shape ? (
            <path d={shape} fill="currentColor" fillOpacity="0.12" stroke="currentColor" />
          ) : (
            <rect
              width={bounds[2]}
              height={bounds[3]}
              rx={
                tool.kind === 'shape' && tool.shapeName === 'roundRect'
                  ? Math.min(bounds[2], bounds[3]) * 0.16667
                  : 0
              }
              fill="currentColor"
              fillOpacity="0.08"
              stroke="currentColor"
              strokeDasharray={tool.kind === 'text' ? '5 4' : undefined}
            />
          )}
        </svg>
      )}
    </div>
  );
}
