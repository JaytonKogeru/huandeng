import { useCallback, useEffect, useRef, useState } from 'react';
import { desktopHost, type WorkspaceLayout, type WorkspaceLayoutUpdate } from './huandeng-desktop';

const snappingKey = 'huandeng:snapping';
let workspaceLayoutReader: (() => WorkspaceLayoutUpdate | undefined) | undefined;

export function workspaceLayoutForLeave(): WorkspaceLayoutUpdate | undefined {
  return workspaceLayoutReader?.();
}

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

export function useWorkspaceLayout(
  layout: WorkspaceLayout,
  restore: (value: WorkspaceLayout) => void,
) {
  const [clientId] = useState(() => crypto.randomUUID());
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const restoreRef = useRef(restore);
  restoreRef.current = restore;
  const serialized = JSON.stringify(layout);
  const version = useRef({ serialized, revision: 0 });
  if (version.current.serialized !== serialized)
    version.current = { serialized, revision: version.current.revision + 1 };
  const revision = version.current.revision;
  const latest = useRef({ ready, serialized, revision });
  latest.current = { ready, serialized, revision };
  const lastSaved = useRef('');
  const writes = useRef(Promise.resolve());
  useEffect(() => {
    const read = () =>
      latest.current.ready
        ? {
            clientId,
            revision: latest.current.revision,
            layout: JSON.parse(latest.current.serialized) as WorkspaceLayout,
          }
        : undefined;
    workspaceLayoutReader = read;
    const saveBrowserLayout = () => {
      if (desktopHost()?.setWorkspaceLayout || !latest.current.ready) return;
      try {
        localStorage.setItem('huandeng:workspace-layout', latest.current.serialized);
      } catch (failure) {
        setError(failure instanceof Error ? failure.message : String(failure));
      }
    };
    window.addEventListener('pagehide', saveBrowserLayout);
    window.addEventListener('beforeunload', saveBrowserLayout);
    return () => {
      if (workspaceLayoutReader === read) workspaceLayoutReader = undefined;
      window.removeEventListener('pagehide', saveBrowserLayout);
      window.removeEventListener('beforeunload', saveBrowserLayout);
    };
  }, [clientId]);
  useEffect(() => {
    let active = true;
    const host = desktopHost();
    const read = host?.getWorkspaceLayout
      ? host.getWorkspaceLayout(clientId)
      : Promise.resolve().then(() => {
          const stored = localStorage.getItem('huandeng:workspace-layout');
          return stored ? (JSON.parse(stored) as WorkspaceLayout) : null;
        });
    void read.then(
      (value) => {
        if (!active) return;
        if (value && typeof value === 'object') restoreRef.current(value);
        setReady(true);
      },
      (failure) => {
        if (!active) return;
        setError(failure instanceof Error ? failure.message : String(failure));
        setReady(true);
      },
    );
    return () => {
      active = false;
    };
  }, [clientId]);
  useEffect(() => {
    if (!ready || serialized === lastSaved.current) return;
    const timer = setTimeout(() => {
      writes.current = writes.current
        .catch(() => {})
        .then(async () => {
          const value = JSON.parse(serialized) as WorkspaceLayout;
          const host = desktopHost();
          if (host?.setWorkspaceLayout)
            await host.setWorkspaceLayout({ clientId, revision, layout: value });
          else localStorage.setItem('huandeng:workspace-layout', serialized);
          lastSaved.current = serialized;
          setError(null);
        })
        .catch((failure) => setError(failure instanceof Error ? failure.message : String(failure)));
    }, 300);
    return () => clearTimeout(timer);
  }, [clientId, ready, revision, serialized]);
  return error;
}
