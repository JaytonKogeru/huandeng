import { describe, expect, it, vi } from 'vitest';
import { capturePointerGesture } from './pointer-gesture';

function setup() {
  const events = new EventTarget();
  let captured: number | null = null;
  const dispatch = (type: string, values: Record<string, unknown> = {}) => {
    events.dispatchEvent(Object.assign(new Event(type), values));
  };
  const target = {
    setPointerCapture: vi.fn((pointerId: number) => {
      captured = pointerId;
    }),
    hasPointerCapture: (pointerId: number) => captured === pointerId,
    releasePointerCapture: vi.fn((pointerId: number) => {
      captured = null;
      dispatch('lostpointercapture', { pointerId });
    }),
  };
  const onMove = vi.fn();
  const onFinish = vi.fn();
  const cancel = capturePointerGesture({ target, pointerId: 7, events, onMove, onFinish });
  return { target, onMove, onFinish, cancel, dispatch };
}

describe('canvas pointer gesture ownership', () => {
  it('ignores another pointer while the owner continues and commits once', () => {
    const { target, onMove, onFinish, cancel, dispatch } = setup();
    for (const type of ['pointermove', 'pointerup', 'pointercancel', 'lostpointercapture'])
      dispatch(type, { pointerId: 8 });
    expect(onMove).not.toHaveBeenCalled();
    expect(onFinish).not.toHaveBeenCalled();
    expect(target.hasPointerCapture(7)).toBe(true);
    dispatch('pointermove', { pointerId: 7, clientX: 120, clientY: 80 });
    expect(onMove).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ pointerId: 7, clientX: 120, clientY: 80 }),
    );
    dispatch('pointerup', { pointerId: 7 });
    dispatch('pointerup', { pointerId: 7 });
    cancel();
    expect(onFinish).toHaveBeenCalledExactlyOnceWith(false);
    expect(target.releasePointerCapture).toHaveBeenCalledExactlyOnceWith(7);
  });

  it.each(['pointercancel', 'lostpointercapture', 'blur', 'Escape', 'unmount'])(
    'restores rather than commits on %s and ignores the later pointerup',
    (reason) => {
      const { target, onMove, onFinish, cancel, dispatch } = setup();
      dispatch('pointermove', { pointerId: 7 });
      if (reason === 'unmount') cancel();
      else if (reason === 'Escape') dispatch('keydown', { key: 'Escape' });
      else dispatch(reason, { pointerId: 7 });
      dispatch('pointermove', { pointerId: 7 });
      dispatch('pointerup', { pointerId: 7 });
      expect(onMove).toHaveBeenCalledTimes(1);
      expect(onFinish).toHaveBeenCalledExactlyOnceWith(true);
      expect(target.hasPointerCapture(7)).toBe(false);
      expect(target.releasePointerCapture).toHaveBeenCalledExactlyOnceWith(7);
    },
  );
});
