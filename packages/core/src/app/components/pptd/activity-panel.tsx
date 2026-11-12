import { Activity, CircleCheck, CircleX, Clock3, RefreshCw, X } from 'lucide-react';
import { useState } from 'react';
import { uiText as t, useHuandengLocale } from '@/lib/huandeng-locale';
import type { PptdBackend } from '@/lib/pptd-backend';
import { type ProjectActivityState, useProjectActivity } from '@/lib/use-project-activity';
import { Button } from '../ui/button';
import { activityLabel, changeSummary, receiptIds } from './operation-review-model';

export function PptdActivityPanel({
  backend,
  deckId,
  onClose,
  pageLabels,
  onSelectPage,
  onReview,
  activity,
  pageId,
  onClearPage,
  onProposals,
}: {
  backend: PptdBackend;
  deckId: string;
  onClose: () => void;
  pageLabels: Record<string, string>;
  onSelectPage: (pageId: string) => void;
  onReview: (operationId: string) => void;
  activity?: ProjectActivityState;
  pageId?: string | null;
  onClearPage?: () => void;
  onProposals?: () => void;
}) {
  useHuandengLocale();
  const localActivity = useProjectActivity(backend, deckId, !activity);
  const { snapshot, connected, error, refresh } = activity ?? localActivity;
  const [filter, setFilter] = useState<'all' | 'client' | 'writer'>('all');
  const pageTasks = new Set(
    snapshot?.events
      .filter((event) => pageId && event.pageIds?.includes(pageId))
      .map((event) => JSON.stringify([event.sessionId, event.taskId])),
  );
  const events =
    snapshot?.events.filter(
      (event) =>
        (filter === 'all' || event.source === filter) &&
        (!pageId ||
          event.pageIds?.includes(pageId) ||
          (event.source === 'client' &&
            pageTasks.has(JSON.stringify([event.sessionId, event.taskId])))),
    ) ?? [];
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
        {onProposals && (
          <Button size="xs" variant="outline" onClick={onProposals} data-hd-review-proposals>
            {t('Review proposals')}
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto size-6"
          title={t('Refresh')}
          onClick={refresh}
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
      {pageId && (
        <div
          className="flex items-center gap-2 border-b px-3 py-1 text-xs"
          data-hd-activity-page-filter
        >
          <span>{t('Activity for {page}', { page: pageLabels[pageId] ?? pageId })}</span>
          <button type="button" className="underline underline-offset-2" onClick={onClearPage}>
            {t('Show all pages')}
          </button>
        </div>
      )}
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
