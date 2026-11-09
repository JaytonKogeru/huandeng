import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getUiLocale, uiText as t, useHuandengLocale } from '@/lib/huandeng-locale';
import type { PptdBackend } from '@/lib/pptd-backend';
import { readProjectModel } from '../../../pptd/project-model';
import type { DeckSnapshot, OperationReview } from '../../../pptd/types';
import { SlideCanvas } from '../slide-canvas';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import {
  changeSummary,
  currentReviewTarget,
  readOperationReview,
  reviewChangeLabel,
} from './operation-review-model';
import { currentPageScope } from './page-scope';
import { PptdPageRenderer, type PptdTheme } from './renderer';

export function OperationReviewDialog({
  backend,
  snapshot,
  operationId,
  open,
  onOpenChange,
  onNavigate,
}: {
  backend: PptdBackend;
  snapshot: DeckSnapshot;
  operationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate: (pageId: string, elementId?: string) => void;
}) {
  useHuandengLocale();
  const [pageId, setPageId] = useState<string | undefined>();
  const [side, setSide] = useState<'before' | 'after'>('after');
  const [elementId, setElementId] = useState<string | undefined>();
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{
    backend: PptdBackend;
    operationId: string;
    pageId?: string;
    deckId: string;
    review?: OperationReview;
    error?: string;
  } | null>(null);
  // biome-ignore lint/correctness/useExhaustiveDependencies: Retry explicitly reloads the same read-only request.
  useEffect(() => {
    if (!open) return;
    const abort = new AbortController();
    setResult(null);
    setElementId(undefined);
    void readOperationReview(backend, snapshot.deckId, operationId, pageId, abort.signal)
      .then((review) => {
        if (abort.signal.aborted) return;
        setResult({ backend, operationId, pageId, deckId: snapshot.deckId, review });
      })
      .catch((cause) => {
        if (!abort.signal.aborted)
          setResult({
            backend,
            operationId,
            pageId,
            deckId: snapshot.deckId,
            error: cause instanceof Error ? cause.message : String(cause),
          });
      });
    return () => abort.abort();
  }, [backend, open, operationId, pageId, snapshot.deckId, attempt]);
  const current =
    open &&
    result?.backend === backend &&
    result.operationId === operationId &&
    result.pageId === pageId &&
    result.deckId === snapshot.deckId
      ? result
      : null;
  const review = current?.review;
  const preview = review?.[side];
  const selected = preview?.page.data.elements.find((element) => element.elementId === elementId);
  const bounds = selected?.bounds;
  const validBounds = bounds?.every(Number.isFinite) && bounds[2] > 0 && bounds[3] > 0;
  const target = review ? currentReviewTarget(snapshot, review.pageId, elementId) : null;
  const pageTarget = review ? currentReviewTarget(snapshot, review.pageId) : null;
  const scope = review?.pageId ? currentPageScope(snapshot, review.pageId) : null;
  const sizeChanged =
    review?.before &&
    review.after &&
    review.before.size.some((value, index) => value !== review.after?.size[index]);
  const sizeFallback = review?.warnings.some((warning) =>
    warning.includes('page size uses the current'),
  );
  const projectStory = readProjectModel(snapshot.metadata).mainStory;
  const navigate = (object = false) => {
    const destination = object ? target : pageTarget;
    if (!destination) return;
    onNavigate(destination.pageId, destination.elementId);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-hd-operation-review={operationId}
        className="flex h-[min(820px,calc(100dvh-2rem))] w-[calc(100vw-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[1100px]"
        onKeyDown={(event) => event.stopPropagation()}
      >
        <DialogHeader className="shrink-0 border-b px-5 py-4 pr-12">
          <DialogTitle>{t('Review saved changes')}</DialogTitle>
          <DialogDescription>
            {t('Read-only operation preview. Use Page History to restore a version.')}
          </DialogDescription>
          {review && (
            <p className="max-h-16 overflow-auto break-words text-xs leading-relaxed">
              {changeSummary(review.summary, t)} · {review.actor} ·{' '}
              {new Date(review.timestamp).toLocaleString(getUiLocale())}
            </p>
          )}
          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer">{t('Receipt details')}</summary>
            <p className="mt-1 break-all font-mono">{operationId}</p>
          </details>
        </DialogHeader>
        <p
          data-hd-review-assets="current-project"
          className="shrink-0 border-b bg-amber-500/10 px-5 py-2 text-xs leading-relaxed"
        >
          {t(
            'Previews use current Project image bytes. Assets may have changed or be missing; original pixels are not archived here.',
          )}
        </p>
        {!current ? (
          <div
            role="status"
            className="grid min-h-0 flex-1 place-items-center text-sm text-muted-foreground"
          >
            <span className="flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" />
              {t('Loading saved operation…')}
            </span>
          </div>
        ) : current.error ? (
          <div className="min-h-0 flex-1 overflow-auto p-5">
            <p role="alert" className="text-sm text-destructive">
              {t(current.error)}
            </p>
            <Button
              data-hd-review-retry
              className="mt-4"
              variant="outline"
              onClick={() => setAttempt((value) => value + 1)}
            >
              {t('Retry')}
            </Button>
          </div>
        ) : (
          review && (
            <>
              <div className="flex shrink-0 flex-wrap items-center gap-2 border-b px-5 py-2 text-xs">
                <label className="flex min-w-0 items-center gap-2">
                  {t('Affected slide')}
                  <select
                    data-hd-review-page
                    value={review.pageId ?? ''}
                    disabled={!review.pageIds.length}
                    className="h-8 max-w-60 rounded border bg-background px-2"
                    onChange={(event) => {
                      setPageId(event.target.value || undefined);
                      setElementId(undefined);
                    }}
                  >
                    {!review.pageId && <option value="">{t('Project structure / Story')}</option>}
                    {review.pageIds.map((id) => (
                      <option key={id} value={id}>
                        {snapshot.metadata.slides[id]?.shortCode ??
                          snapshot.metadata.slides[id]?.label ??
                          id}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="ml-auto flex gap-1">
                  {(['before', 'after'] as const).map((value) => (
                    <Button
                      key={value}
                      data-hd-review-side={value}
                      size="sm"
                      variant={side === value ? 'secondary' : 'ghost'}
                      aria-pressed={side === value}
                      onClick={() => setSide(value)}
                    >
                      {value === 'before' ? t('Before') : t('After')}
                    </Button>
                  ))}
                </div>
                <span className="text-muted-foreground">
                  {t('Theme')}: {t(review.themeSource[side])}
                </span>
              </div>
              {(review.themeSource.before === 'current-fallback' ||
                review.themeSource.after === 'current-fallback') && (
                <p
                  data-hd-review-theme-fallback
                  className="shrink-0 border-b bg-amber-500/10 px-5 py-2 text-xs"
                >
                  {t(
                    'Historical theme unavailable on a preview side; current theme fallback is shown.',
                  )}
                </p>
              )}
              {sizeChanged && (
                <p data-hd-review-size-change className="shrink-0 border-b px-5 py-2 text-xs">
                  {t('Slide size changed. Each side is fitted independently.')}{' '}
                  {review.before?.size.join(' × ')} → {review.after?.size.join(' × ')}
                </p>
              )}
              {sizeFallback && (
                <p
                  data-hd-review-size-fallback
                  className="shrink-0 border-b bg-amber-500/10 px-5 py-2 text-xs"
                >
                  {t(
                    'Historical slide size unavailable on a preview side; current Project dimensions are used.',
                  )}
                </p>
              )}
              <div className="flex min-h-0 flex-1 flex-col overflow-auto md:flex-row md:overflow-hidden">
                <div className="flex min-h-[260px] min-w-0 flex-1 flex-col">
                  <div
                    data-hd-review-canvas={side}
                    className="relative min-h-[220px] flex-1 bg-canvas p-4"
                  >
                    {preview ? (
                      <SlideCanvas
                        width={preview.size[0]}
                        height={preview.size[1]}
                        flat
                        freezeMotion
                      >
                        <PptdPageRenderer
                          page={preview.page}
                          size={preview.size}
                          theme={(preview.theme ?? snapshot.manifest.theme ?? {}) as PptdTheme}
                        />
                        {validBounds && bounds && (
                          <div
                            data-hd-review-highlight={elementId}
                            aria-hidden
                            style={{
                              position: 'absolute',
                              pointerEvents: 'none',
                              left: bounds[0],
                              top: bounds[1],
                              width: bounds[2],
                              height: bounds[3],
                              transform: `rotate(${selected?.rotation ?? 0}deg)`,
                              outline: '3px solid #16a34a',
                              outlineOffset: 3,
                            }}
                          />
                        )}
                      </SlideCanvas>
                    ) : (
                      <p className="grid h-full min-h-48 place-items-center px-6 text-center text-sm text-muted-foreground">
                        {review.pageId === null
                          ? t(
                              'This operation changes Project structure or Story; there is no page artwork.',
                            )
                          : side === 'before'
                            ? t('This slide did not exist before the operation.')
                            : t('This slide was removed by the operation.')}
                      </p>
                    )}
                  </div>
                  {elementId && !validBounds && (
                    <p className="shrink-0 border-t px-4 py-2 text-xs text-muted-foreground">
                      {t('Selected object has no visible geometry on this side.')}
                    </p>
                  )}
                  {preview?.page.data.notes && (
                    <details className="shrink-0 border-t px-4 py-2 text-xs">
                      <summary className="cursor-pointer">{t('Speaker notes')}</summary>
                      <p className="mt-2 max-h-24 overflow-auto whitespace-pre-wrap">
                        {preview.page.data.notes}
                      </p>
                    </details>
                  )}
                </div>
                <aside className="w-full shrink-0 space-y-3 border-t p-4 text-xs md:w-72 md:overflow-auto md:border-t-0 md:border-l">
                  <h3 className="font-medium">{t('Saved changes')}</h3>
                  {review.truncated && (
                    <p data-hd-review-truncated className="text-amber-700 dark:text-amber-300">
                      {t('Change list limited to 100 entries.')}
                    </p>
                  )}
                  <div className="space-y-1">
                    {review.changes.slice(0, 100).map((change) => (
                      <button
                        key={`${change.elementId ?? 'page'}:${change.label}:${change.fields.join(',')}`}
                        type="button"
                        data-hd-review-change={change.elementId ?? 'page'}
                        aria-pressed={!!change.elementId && elementId === change.elementId}
                        className={`block w-full rounded border p-2 text-left ${change.elementId && elementId === change.elementId ? 'border-brand bg-brand-soft' : 'border-transparent bg-muted/50'}`}
                        onClick={() => setElementId(change.elementId)}
                      >
                        <span className="block break-words font-medium">
                          {reviewChangeLabel(change, t)}
                        </span>
                        <span className="mt-1 block break-words text-muted-foreground">
                          {change.fields.map((field) => t(field)).join(' · ')}
                        </span>
                      </button>
                    ))}
                  </div>
                  <section className="space-y-2 border-t pt-3">
                    <h3 className="font-medium">{t('HUANDENG Story')}</h3>
                    <p className="max-h-28 overflow-auto whitespace-pre-wrap break-words text-muted-foreground">
                      {preview?.page.metadata.designIntent?.purpose ||
                        t('No page Story on this side.')}
                    </p>
                    {preview?.page.metadata.designIntent?.keep?.length ? (
                      <ul className="list-inside list-disc">
                        {[...new Set(preview.page.metadata.designIntent.keep)].map((value) => (
                          <li key={value}>{value}</li>
                        ))}
                      </ul>
                    ) : null}
                  </section>
                  <section className="space-y-2 border-t pt-3">
                    <h3 className="font-medium">{t('Current Project Story')}</h3>
                    <p className="whitespace-pre-wrap break-words text-muted-foreground">
                      {[projectStory.purpose, projectStory.audience, projectStory.takeaway]
                        .filter(Boolean)
                        .join('\n') || t('No Project Story recorded.')}
                    </p>
                  </section>
                  {scope && (
                    <section data-hd-review-scope className="space-y-2 border-t pt-3">
                      <h3 className="font-medium">{t('Current usage scope')}</h3>
                      <p>
                        {t('Main Slides')}: {scope.main ? t('Available') : t('Unavailable')}
                      </p>
                      <p>
                        {t('Live references')}: {scope.live} · {t('Pinned references')}:{' '}
                        {scope.pinned}
                      </p>
                      <ul className="space-y-1 text-muted-foreground">
                        {scope.usages.map((usage) => (
                          <li key={usage.occurrenceId}>
                            {usage.title} · {usage.versionId ? t('Pinned') : t('Live reference')}
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}
                  {!!review.warnings.length && (
                    <details className="border-t pt-3">
                      <summary className="cursor-pointer">
                        {t('Preview warnings')} ({review.warnings.length})
                      </summary>
                      <ul className="mt-2 space-y-2 break-words text-muted-foreground">
                        {review.warnings.map((warning) => (
                          <li key={warning}>{t(warning)}</li>
                        ))}
                      </ul>
                    </details>
                  )}
                </aside>
              </div>
              <footer className="flex shrink-0 flex-wrap items-center gap-2 border-t px-5 py-3">
                <p className="mr-auto text-xs text-muted-foreground">
                  {elementId && !target
                    ? t('This object is no longer on the current slide.')
                    : !pageTarget
                      ? t('This slide is not available in Main Slides.')
                      : t('Navigation opens the current Main Slide.')}
                </p>
                {elementId && (
                  <Button
                    data-hd-review-navigate-object
                    size="sm"
                    variant="outline"
                    disabled={!target}
                    onClick={() => navigate(true)}
                  >
                    {t('Open current object')}
                  </Button>
                )}
                <Button
                  data-hd-review-navigate-page
                  size="sm"
                  disabled={!pageTarget}
                  onClick={() => navigate()}
                >
                  {t('Open current slide')}
                </Button>
              </footer>
            </>
          )
        )}
      </DialogContent>
    </Dialog>
  );
}
