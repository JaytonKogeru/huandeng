import { useCallback, useEffect, useRef, useState } from 'react';
import { desktopHost, type ProjectTabLayout } from '@/lib/huandeng-desktop';

export function useWorkspaceTabLayout(open: boolean) {
  const host = desktopHost();
  const supported = Boolean(host?.getTabLayout && host.setTabLayout);
  const [layout, setLayout] = useState<ProjectTabLayout | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const generation = useRef(0);
  const observed = useRef(0);
  const pending = useRef(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: Retry starts a new desktop preference read.
  useEffect(() => {
    if (!open || !host?.getTabLayout) return;
    const current = ++generation.current;
    const start = observed.current;
    setError(null);
    const stop = host.onTabLayoutChanged?.((value) => {
      if (generation.current !== current) return;
      observed.current++;
      setLayout(value);
      setError(null);
    });
    void host.getTabLayout().then(
      (value) => {
        if (generation.current === current && observed.current === start) setLayout(value);
      },
      () => {
        if (generation.current === current && observed.current === start)
          setError('Project tab preferences could not be read.');
      },
    );
    return () => {
      generation.current++;
      pending.current++;
      stop?.();
    };
  }, [open, host, attempt]);

  const change = useCallback(
    async (update: Partial<ProjectTabLayout>) => {
      if (!host?.setTabLayout) return;
      const request = ++pending.current;
      const start = observed.current;
      setSaving(true);
      setError(null);
      try {
        const next = await host.setTabLayout(update);
        if (pending.current === request && observed.current === start) setLayout(next);
      } catch {
        if (pending.current === request) setError('Project tab preferences could not be saved.');
      } finally {
        if (pending.current === request) setSaving(false);
      }
    },
    [host],
  );

  useEffect(() => {
    if (!open) setSaving(false);
  }, [open]);

  return {
    supported,
    layout,
    error,
    saving,
    change,
    retry: () => setAttempt((value) => value + 1),
  };
}
