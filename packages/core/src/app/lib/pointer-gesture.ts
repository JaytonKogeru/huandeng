type CaptureTarget = Pick<
  Element,
  'setPointerCapture' | 'hasPointerCapture' | 'releasePointerCapture'
>;

export function capturePointerGesture({
  target,
  pointerId,
  onMove,
  onFinish,
  events = window,
}: {
  target: CaptureTarget;
  pointerId: number;
  onMove: (event: PointerEvent) => void;
  onFinish: (cancelled: boolean) => void;
  events?: EventTarget;
}): () => void {
  target.setPointerCapture(pointerId);
  let active = true;
  const finish = (cancelled: boolean) => {
    if (!active) return;
    active = false;
    events.removeEventListener('pointermove', move);
    events.removeEventListener('pointerup', commit);
    events.removeEventListener('pointercancel', cancelPointer);
    events.removeEventListener('lostpointercapture', cancelPointer);
    events.removeEventListener('blur', cancel);
    events.removeEventListener('keydown', keydown);
    try {
      if (target.hasPointerCapture(pointerId)) target.releasePointerCapture(pointerId);
    } finally {
      onFinish(cancelled);
    }
  };
  const move = (event: Event) => {
    if ((event as PointerEvent).pointerId === pointerId) onMove(event as PointerEvent);
  };
  const commit = (event: Event) => {
    if ((event as PointerEvent).pointerId === pointerId) finish(false);
  };
  const cancelPointer = (event: Event) => {
    if ((event as PointerEvent).pointerId === pointerId) finish(true);
  };
  const cancel = () => finish(true);
  const keydown = (event: Event) => {
    if ((event as KeyboardEvent).key === 'Escape') cancel();
  };
  events.addEventListener('pointermove', move);
  events.addEventListener('pointerup', commit);
  events.addEventListener('pointercancel', cancelPointer);
  events.addEventListener('lostpointercapture', cancelPointer);
  events.addEventListener('blur', cancel);
  events.addEventListener('keydown', keydown);
  return cancel;
}
