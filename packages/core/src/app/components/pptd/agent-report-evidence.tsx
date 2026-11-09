import { useEffect, useState } from 'react';
import { getUiLocale, uiText as t, useHuandengLocale } from '@/lib/huandeng-locale';
import type { PptdBackend } from '@/lib/pptd-backend';
import type { ActivityEvent } from '../../../pptd/activity';

export function latestClientReport(events: ActivityEvent[], deckId: string) {
  return (
    events
      .filter((event) => event.deckId === deckId && event.source === 'client')
      .sort((a, b) => b.sequence - a.sequence)[0] ?? null
  );
}

interface ReportEvidence {
  report: ActivityEvent | null;
  error?: string;
}

export function mergeReportEvidence(
  previous: ReportEvidence | null,
  events: ActivityEvent[],
  deckId: string,
  storageError?: string | null,
): ReportEvidence {
  const error = storageError === undefined ? previous?.error : storageError;
  return {
    report: latestClientReport([...events, ...(previous?.report ? [previous.report] : [])], deckId),
    ...(error ? { error } : {}),
  };
}

export function AgentReportEvidence({ backend, deckId }: { backend: PptdBackend; deckId: string }) {
  useHuandengLocale();
  const [result, setResult] = useState<{
    backend: PptdBackend;
    deckId: string;
    report: ActivityEvent | null;
    error?: string;
  } | null>(null);
  useEffect(() => {
    const abort = new AbortController();
    setResult(null);
    const accept = (events: ActivityEvent[], storageError?: string | null) => {
      if (abort.signal.aborted) return;
      setResult((previous) => ({
        backend,
        deckId,
        ...mergeReportEvidence(
          previous?.backend === backend && previous.deckId === deckId ? previous : null,
          events,
          deckId,
          storageError,
        ),
      }));
    };
    const read = () => {
      void backend
        .activity(abort.signal)
        .then((value) => {
          if (value.deckId !== deckId) throw new Error('Activity Project identity mismatch.');
          accept(value.events, value.storageError ?? null);
        })
        .catch((cause) => {
          if (!abort.signal.aborted)
            setResult((previous) => ({
              backend,
              deckId,
              report:
                previous?.backend === backend && previous.deckId === deckId
                  ? previous.report
                  : null,
              error: cause instanceof Error ? cause.message : String(cause),
            }));
        });
    };
    read();
    const stop = backend.subscribeActivity(
      (event) => accept([event]),
      (connected) => {
        if (connected && !abort.signal.aborted) read();
      },
    );
    return () => {
      abort.abort();
      stop();
    };
  }, [backend, deckId]);
  const current = result?.backend === backend && result.deckId === deckId ? result : null;
  return (
    <section data-hd-agent-report className="space-y-2 rounded-md border p-3 text-xs">
      <h3 className="font-medium">{t('Observed in this Project')}</h3>
      {!current ? (
        <p className="text-muted-foreground">{t('Reading recent client reports…')}</p>
      ) : current.report ? (
        <>
          <p>
            <strong>{current.report.actor}</strong> · {t(current.report.status)}
          </p>
          <p className="text-muted-foreground">
            <time dateTime={current.report.timestamp}>
              {new Date(current.report.timestamp).toLocaleString(getUiLocale())}
            </time>
          </p>
          <p className="break-words">{current.report.summary}</p>
        </>
      ) : !current.error ? (
        <p className="text-muted-foreground">
          {t('No client report recorded yet. Setup may still be ready.')}
        </p>
      ) : null}
      {current?.error && (
        <p role="alert" className="break-words text-destructive">
          {t('Recent reports could not be read.')}: {t(current.error)}
        </p>
      )}
      <p className="text-muted-foreground">
        {t('This is the latest explicit client report, not a live connection or execution check.')}
      </p>
    </section>
  );
}
