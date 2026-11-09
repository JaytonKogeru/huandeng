import { Activity, CircleCheck, CircleX, Clock3, RefreshCw, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { uiText as t, useHuandengLocale } from '@/lib/huandeng-locale';
import type { PptdBackend } from '@/lib/pptd-backend';
import type { ActivityEvent, ActivitySnapshot } from '../../../pptd/activity';
import { Button } from '../ui/button';
import { activityLabel, changeSummary, receiptIds } from './operation-review-model';

export function PptdActivityPanel({
  backend,
  deckId,
  onClose,
  pageLabels,
  onSelectPage,
  onReview,
}: {
  backend: PptdBackend;
  deckId: string;
  onClose: () => void;
  pageLabels: Record<string, string>;
  onSelectPage: (pageId: string) => void;
  onReview: (operationId: string) => void;
}) {
  useHuandengLocale();
  const [snapshot, setSnapshot] = useState<ActivitySnapshot | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [filter, setFilter] = useState<'all' | 'client' | 'writer'>('all');
  // biome-ignore lint/correctness/useExhaustiveDependencies: Refresh explicitly reconnects the bounded Activity stream.
  useEffect(() => {
    const abort = new AbortController();
    setSnapshot(null);
    setConnected(false);
    setError(null);
    const read = () => {
      void backend
        .activity(abort.signal)
        .then((value) => {
          if (abort.signal.aborted || value.deckId !== deckId) return;
          setSnapshot((previous) =>
            !previous
              ? value
              : {
                  ...value,
                  sequence: Math.max(previous.sequence, value.sequence),
                  events: [
                    ...new Map(
                      [...value.events, ...previous.events].map((event) => [event.sequence, event]),
                    ).values(),
                  ]
                    .sort((a, b) => b.sequence - a.sequence)
                    .slice(0, value.retainedLimit),
                },
          );
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
        setSnapshot((previous) =>
          previous
            ? {
                ...previous,
                epoch: event.epoch,
                sequence: Math.max(previous.sequence, event.sequence),
                events: [
                  event,
                  ...previous.events.filter((item) => item.sequence !== event.sequence),
                ]
                  .sort((a, b) => b.sequence - a.sequence)
                  .slice(0, previous.retainedLimit),
              }
            : {
                deckId,
                epoch: event.epoch,
                sequence: event.sequence,
                events: [event],
                retainedLimit: 300,
              },
        );
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
  }, [backend, deckId, refresh]);
  const events =
    snapshot?.events.filter((event) => filter === 'all' || event.source === filter) ?? [];
  return (
    <section
      data-testid="project-activity"
      aria-label={t('Project Activity')}
      className="bg-background flex h-[220px] min-h-[130px] max-h-[50vh] shrink-0 resize-y flex-col overflow-hidden border-t"
      onKeyDown={(event) => event.stopPropagation()}
    >
      <header className="flex shrink-0 flex-wrap items-center gap-2 border-b px-3 py-1.5 text-xs">
        <Activity size={14} />
        <strong>{t('Activity')}</strong>
        <span className="text-muted-foreground">
          {connected ? t('Activity stream connected') : t('Activity stream reconnecting…')}
        </span>
        <fieldset className="ml-3 flex gap-1 border-0 p-0" aria-label={t('Activity filter')}>
          {(['all', 'client', 'writer'] as const).map((kind) => (
            <button
              key={kind}
              type="button"
              aria-pressed={filter === kind}
              className={`rounded px-2 py-1 ${filter === kind ? 'bg-accent' : 'hover:bg-accent/60'}`}
              onClick={() => setFilter(kind)}
            >
              {kind === 'all'
                ? t('All')
                : kind === 'client'
                  ? t('Client reports')
                  : t('Saved changes')}
            </button>
          ))}
        </fieldset>
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto size-6"
          title={t('Refresh')}
          onClick={() => setRefresh((value) => value + 1)}
        >
          <RefreshCw size={13} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-6"
          title={t('Close Activity')}
          onClick={onClose}
        >
          <X size={14} />
        </Button>
      </header>
      {error && (
        <p role="alert" className="px-3 py-2 text-xs text-red-600">
          {error}
        </p>
      )}
      <div
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        className="min-h-0 flex-1 overflow-auto px-3 py-1"
      >
        {!events.length && (
          <p className="text-muted-foreground py-4 text-sm">
            {t(
              'No activity for this Project yet. Connected clients can report task stages; saved changes appear automatically.',
            )}
          </p>
        )}
        {events.map((event) => (
          <article
            key={`${event.epoch}:${event.sequence}`}
            className="grid grid-cols-[auto_1fr] gap-x-2 border-b py-2 last:border-0"
          >
            {event.status === 'failed' ? (
              <CircleX size={14} className="mt-0.5 text-red-600" />
            ) : event.status === 'completed' ? (
              <CircleCheck size={14} className="mt-0.5 text-muted-foreground" />
            ) : (
              <Clock3 size={14} className="mt-0.5 text-muted-foreground" />
            )}
            <div className="min-w-0">
              <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
                <time dateTime={event.timestamp} title={new Date(event.timestamp).toLocaleString()}>
                  {new Date(event.timestamp).toLocaleTimeString()}
                </time>
                <span className="text-foreground font-medium">
                  {event.source === 'writer' && event.actor === 'Shared writer'
                    ? t('Shared writer')
                    : event.actor}
                </span>
                <span>{activityLabel(event, t)}</span>
                {event.epoch !== snapshot?.epoch && <span>{t('Previous session')}</span>}
              </div>
              <p className="mt-0.5 break-words whitespace-pre-wrap text-xs leading-relaxed">
                {event.source === 'writer' ? changeSummary(event.summary, t) : event.summary}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-1">
                {event.pageIds?.map((pageId) => (
                  <button
                    type="button"
                    key={pageId}
                    data-hd-activity-page={pageId}
                    disabled={!pageLabels[pageId]}
                    title={pageId}
                    className="rounded border px-1.5 py-0.5 text-[11px] hover:bg-accent disabled:opacity-50"
                    onClick={() => onSelectPage(pageId)}
                  >
                    {pageLabels[pageId] ?? t('Unavailable slide')}
                  </button>
                ))}
                {receiptIds(event).map((id) => (
                  <button
                    type="button"
                    key={id}
                    data-hd-review-operation={id}
                    title={id}
                    className="rounded border border-brand/30 px-2 py-0.5 text-[11px] text-brand hover:bg-brand-soft"
                    onClick={() => onReview(id)}
                  >
                    {event.source === 'writer'
                      ? t('Review changes')
                      : t('Resolve reported receipt')}
                  </button>
                ))}
              </div>
              {event.source === 'client' && (
                <details className="text-muted-foreground mt-1 text-[11px]">
                  <summary className="cursor-pointer">{t('Report details')}</summary>
                  <p className="break-all font-mono">
                    {event.sessionId} / {event.taskId}
                  </p>
                  {receiptIds(event).length > 0 && (
                    <p>{t('Receipt IDs are client claims until resolved in this Project.')}</p>
                  )}
                </details>
              )}
            </div>
          </article>
        ))}
      </div>
      <footer className="text-muted-foreground shrink-0 border-t px-3 py-1 text-[10px]">
        {t('This Project only · Explicit client progress and actual saved changes')}
      </footer>
    </section>
  );
}
