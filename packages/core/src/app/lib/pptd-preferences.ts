import { useCallback, useEffect, useRef, useState } from 'react';
import { desktopHost } from './huandeng-desktop';

const snappingKey = 'huandeng:snapping';

function browserSnapping(): boolean {
  try {
    return localStorage.getItem(snappingKey) !== 'false';
  } catch {
    return true;
  }
}

export function useSnappingPreference() {
  const [enabled, setEnabled] = useState(browserSnapping);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pending = useRef(false);

  useEffect(() => {
    let active = true;
    let observed = false;
    const host = desktopHost();
    const unsubscribe = host?.onSnappingChanged?.((next) => {
      observed = true;
      if (active) setEnabled(next);
    });
    if (host?.getSnapping) {
      void host.getSnapping().then(
        (next) => {
          if (!active) return;
          if (!observed) setEnabled(next);
          setReady(true);
        },
        (failure) => {
          if (!active) return;
          setError(failure instanceof Error ? failure.message : String(failure));
          setReady(true);
        },
      );
    } else setReady(true);
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  const change = useCallback(async (next: boolean) => {
    if (pending.current) return;
    pending.current = true;
    setSaving(true);
    setError(null);
    try {
      const host = desktopHost();
      if (host?.setSnapping) setEnabled(await host.setSnapping(next));
      else {
        localStorage.setItem(snappingKey, String(next));
        setEnabled(next);
      }
    } catch (failure) {
      const message = failure instanceof Error ? failure.message : String(failure);
      setError(message);
      throw failure;
    } finally {
      pending.current = false;
      setSaving(false);
    }
  }, []);

  return { enabled, ready, saving, error, change };
}
