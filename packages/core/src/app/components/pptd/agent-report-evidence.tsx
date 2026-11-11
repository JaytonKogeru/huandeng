import { useEffect, useState } from 'react';
import { getUiLocale, uiText as t, useHuandengLocale } from '@/lib/huandeng-locale';
import type { PptdBackend } from '@/lib/pptd-backend';
import type { ActivityEvent } from '../../../pptd/activity';
import { Button } from '../ui/button';
import { changeSummary, receiptIds } from './operation-review-model';

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

export function mergeActivityEvents(
  previous: ActivityEvent[],
  incoming: ActivityEvent[],
  deckId: string,
) {
  const events = new Map<string, ActivityEvent>();
  for (const event of [...previous, ...incoming])
    if (event.deckId === deckId) events.set(`${event.epoch}:${event.sequence}`, event);
  return [...events.values()].sort((a, b) => b.sequence - a.sequence).slice(0, 300);
}

export function recentClientReports(events: ActivityEvent[], deckId: string) {
  const sessions = new Map<string, ActivityEvent>();
  for (const event of mergeActivityEvents([], events, deckId)) {
    if (event.source !== 'client') continue;
    const key = JSON.stringify([event.actor, event.sessionId]);
    if (!sessions.has(key)) sessions.set(key, event);
  }
  return [...sessions.values()].slice(0, 6);
}

export function AgentEvidenceRows({
  events,
  deckId,
  pageLabels = {},
  onReview,
  historyUnavailable = false,
}: {
  events: ActivityEvent[];
  deckId: string;
  pageLabels?: Record<string, string>;
  onReview?: (operationId: string) => void;
  historyUnavailable?: boolean;
}) {
  const reports = recentClientReports(events, deckId);
  const changes = mergeActivityEvents([], events, deckId)
    .filter((event) => event.source === 'writer')
    .slice(0, 6);
  const time = (event: ActivityEvent) => (
    <time dateTime={event.timestamp} className="text-muted-foreground">
      {new Date(event.timestamp).toLocaleString(getUiLocale())}
    </time>
  );
  return (
    <>
      {!reports.length && !historyUnavailable && (
        <p className="text-muted-foreground">
          {t('No client report recorded yet. Setup may still be ready.')}
        </p>
      )}
      <div className="divide-y">
        {reports.map((report) => (
          <article
            key={JSON.stringify([report.actor, report.sessionId])}
            className="space-y-1.5 py-2"
            data-hd-client-report
          >
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <strong>{report.actor}</strong>
              <span>{t('Reported: {status}', { status: t(report.status) })}</span>
              {time(report)}
            </div>
            <p className="break-words">{report.summary}</p>
            {!!report.pageIds?.length && (
              <p className="break-words text-muted-foreground" data-hd-report-pages>
                {t('Slides')}:{' '}
                {report.pageIds.map((id) => (
                  <span key={id} title={id} className="mr-2">
                    {pageLabels[id] ?? id}
                  </span>
                ))}
              </p>
            )}
            <details className="text-muted-foreground">
              <summary className="cursor-pointer">{t('Report details')}</summary>
              <p className="break-all">
                {report.sessionId} / {report.taskId}
              </p>
            </details>
            {onReview &&
              receiptIds(report).map((id) => (
                <Button
                  key={id}
                  size="xs"
                  variant="outline"
                  className="mr-2"
                  title={id}
                  data-hd-reported-receipt={id}
                  onClick={() => onReview(id)}
                >
                  {t('Resolve reported receipt')}
                </Button>
              ))}
          </article>
        ))}
      </div>
      <p className="text-muted-foreground">
        {t('These are explicit client reports, not a live connection or execution check.')}
      </p>
      <div className="space-y-2 border-t pt-3" data-hd-saved-evidence>
        <h4 className="font-medium">{t('Saved changes')}</h4>
        {!changes.length && !historyUnavailable && (
          <p className="text-muted-foreground">{t('No saved change recorded yet.')}</p>
        )}
        {changes.map((event) => (
          <article
            key={`${event.epoch}:${event.sequence}`}
            className="space-y-1.5 border-b py-2 last:border-0"
          >
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <strong>{event.actor === 'Shared writer' ? t('Shared writer') : event.actor}</strong>
              <span>
                {event.status === 'completed'
                  ? t('Save completed')
                  : event.status === 'failed'
                    ? t('Save failed')
                    : t(event.status)}
              </span>
              {time(event)}
            </div>
            <p className="break-words">{changeSummary(event.summary, t)}</p>
            {onReview && event.operationId && (
              <Button
                size="xs"
                variant="outline"
                data-hd-saved-receipt={event.operationId}
                title={event.operationId}
                onClick={() => onReview(event.operationId as string)}
              >
                {t('Review changes')}
              </Button>
            )}
          </article>
        ))}
        <p className="text-muted-foreground">
          {t(
            'Saved changes are writer records. Reported receipt IDs are verified only when opened.',
          )}
        </p>
      </div>
    </>
  );
}

export function AgentReportEvidence({
  backend,
  deckId,
  pageLabels,
  onReview,
  onOpenActivity,
}: {
  backend: PptdBackend;
  deckId: string;
  pageLabels?: Record<string, string>;
  onReview?: (operationId: string) => void;
  onOpenActivity?: () => void;
}) {
  useHuandengLocale();
  const [result, setResult] = useState<{
    backend: PptdBackend;
    deckId: string;
    events: ActivityEvent[];
    error?: string;
  } | null>(null);
  useEffect(() => {
    const abort = new AbortController();
    setResult(null);
    const accept = (events: ActivityEvent[], storageError?: string | null) => {
      if (abort.signal.aborted) return;
      setResult((previous) => {
        const current =
          previous?.backend === backend && previous.deckId === deckId ? previous : null;
        const error = storageError === undefined ? current?.error : storageError;
        return {
          backend,
          deckId,
          events: mergeActivityEvents(current?.events ?? [], events, deckId),
          ...(error ? { error } : {}),
        };
      });
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
            accept([], cause instanceof Error ? cause.message : String(cause));
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
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-medium">{t('Reported work in this Project')}</h3>
        {onOpenActivity && (
          <Button size="xs" variant="ghost" onClick={onOpenActivity}>
            {t('Open Activity')}
          </Button>
        )}
      </header>
      {!current ? (
        <p className="text-muted-foreground">{t('Reading recent client reports…')}</p>
      ) : (
        <AgentEvidenceRows
          events={current.events}
          deckId={deckId}
          pageLabels={pageLabels}
          onReview={onReview}
          historyUnavailable={!!current.error}
        />
      )}
      {current?.error && (
        <p role="alert" className="break-words text-destructive">
          {t('Recent reports could not be read.')}: {t(current.error)}
        </p>
      )}
    </section>
  );
}
