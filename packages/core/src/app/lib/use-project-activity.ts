import { useCallback, useEffect, useState } from 'react';
import type { ActivityEvent, ActivitySnapshot } from '../../pptd/activity';
import type { PptdBackend } from './pptd-backend';

export interface ProjectActivityState {
  snapshot: ActivitySnapshot | null;
  connected: boolean;
  error: string | null;
  refresh: () => void;
}

export function useProjectActivity(
  backend: PptdBackend,
  deckId?: string,
  enabled = true,
): ProjectActivityState {
  const [snapshot, setSnapshot] = useState<ActivitySnapshot | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  useEffect(() => {
    void revision;
    setSnapshot(null);
    setConnected(false);
    setError(null);
    if (!deckId || !enabled) return;
    const abort = new AbortController();
    let request = 0;
    let streamRevision = 0;
    const read = () => {
      const currentRequest = ++request;
      const initialStreamRevision = streamRevision;
      void backend
        .activity(abort.signal)
        .then((value) => {
          if (abort.signal.aborted || currentRequest !== request || value.deckId !== deckId) return;
          setSnapshot((previous) => {
            if (
              previous &&
              previous.epoch !== value.epoch &&
              initialStreamRevision !== streamRevision
            )
              return previous;
            if (!previous || previous.epoch !== value.epoch) return value;
            return {
              ...value,
              sequence: Math.max(previous.sequence, value.sequence),
              events: [
                ...new Map(
                  [...value.events, ...previous.events].map((event) => [event.sequence, event]),
                ).values(),
              ]
                .sort((a, b) => b.sequence - a.sequence)
                .slice(0, value.retainedLimit),
            };
          });
          setError(value.storageError ?? null);
        })
        .catch((cause) => {
          if (!abort.signal.aborted)
            setError(cause instanceof Error ? cause.message : String(cause));
        });
    };
    read();
    const stop = backend.subscribeActivity(
      (event: ActivityEvent) => {
        if (abort.signal.aborted || event.deckId !== deckId) return;
        streamRevision += 1;
        setSnapshot((previous) => ({
          ...previous,
          deckId,
          epoch: event.epoch,
          sequence: Math.max(previous?.sequence ?? 0, event.sequence),
          retainedLimit: previous?.retainedLimit ?? 300,
          events: [
            event,
            ...(previous?.events ?? []).filter((item) => item.sequence !== event.sequence),
          ]
            .sort((a, b) => b.sequence - a.sequence)
            .slice(0, previous?.retainedLimit ?? 300),
        }));
      },
      (value) => {
        if (abort.signal.aborted) return;
        setConnected(value);
        if (value) read();
      },
    );
    return () => {
      abort.abort();
      stop();
    };
  }, [backend, deckId, enabled, revision]);
  return { snapshot, connected, error, refresh };
}
