import { Loader2, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useHuandengLocale } from '@/lib/huandeng-locale';
import type { PptdBackend } from '@/lib/pptd-backend';
import type { ProposalDetail, ProposalSummary } from '../../../pptd/proposal-inbox';
import { SlideCanvas } from '../slide-canvas';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { PptdPageRenderer, type PptdTheme } from './renderer';

export function ProposalInboxDialog({
  backend,
  sequence,
  blocked,
  onClose,
  onSaved,
}: {
  backend: PptdBackend;
  sequence: number;
  blocked: boolean;
  onClose: () => void;
  onSaved: (operationId: string) => Promise<void>;
}) {
  const { t } = useHuandengLocale();
  const [items, setItems] = useState<ProposalSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ProposalDetail | null>(null);
  const [pageId, setPageId] = useState<string | null>(null);
  const [selectedPages, setSelectedPages] = useState<string[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    const next = await backend.proposals();
    setItems(next);
    setSelectedId((current) =>
      next.some((item) => item.id === current)
        ? current
        : (next.find((item) => item.status === 'pending')?.id ?? next[0]?.id ?? null),
    );
    setRefreshKey((value) => value + 1);
  }, [backend]);
  useEffect(() => {
    let active = true;
    setLoading(true);
    void backend
      .proposals()
      .then((next) => {
        if (!active) return;
        setItems(next);
        setSelectedId(next.find((item) => item.status === 'pending')?.id ?? next[0]?.id ?? null);
      })
      .catch((cause) => {
        if (active) setError(String(cause));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [backend]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: Refresh and document changes invalidate review authority even when the proposal ID is unchanged.
  useEffect(() => {
    setSelectedPages([]);
    if (!selectedId) {
      setDetail(null);
      return;
    }
    let active = true;
    void backend
      .proposal(selectedId)
      .then((next) => {
        if (!active) return;
        setDetail(next);
        setPageId((current) =>
          next.preview.pages.some((page) => page.pageId === current)
            ? current
            : (next.preview.pages[0]?.pageId ?? null),
        );
      })
      .catch((cause) => {
        if (active) setError(String(cause));
      });
    return () => {
      active = false;
    };
  }, [backend, selectedId, refreshKey, sequence]);
  const current = detail?.id === selectedId ? detail : null;
  const decide = async (decision: 'accept' | 'reject') => {
    if (!current?.approvalNonce) return;
    setBusy(true);
    setError(null);
    try {
      const result = await backend.decideProposal(current.id, {
        decision,
        previewHash: current.previewHash,
        epoch: current.epoch,
        approvalNonce: current.approvalNonce,
      });
      setDetail(result);
      if (result.receipt) await onSaved(result.receipt.operationId);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  };
  const selectPages = async () => {
    if (!current) return;
    setBusy(true);
    setError(null);
    try {
      const result = await backend.selectProposalPages(current.id, {
        pageIds: selectedPages,
        previewHash: current.previewHash,
      });
      await refresh();
      setSelectedId(result.id);
    } catch (cause) {
      setError(String(cause));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent
        data-hd-proposal-inbox
        className="flex h-[min(880px,calc(100dvh-2rem))] w-[calc(100vw-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[1220px]"
        onKeyDown={(event) => event.stopPropagation()}
      >
        <DialogHeader className="shrink-0 border-b px-5 py-4 pr-12">
          <DialogTitle>{t('Review proposals')}</DialogTitle>
          <DialogDescription>
            {t(
              'These changes are waiting for your decision. Ordinary authorized edits continue to save directly.',
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="flex min-h-0 flex-1">
          <aside className="w-56 shrink-0 overflow-auto border-r p-3">
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => void refresh().catch((cause) => setError(String(cause)))}
            >
              <RefreshCw />
              {t('Refresh')}
            </Button>
            {loading && (
              <p className="py-4 text-xs" role="status">
                {t('Loading proposals…')}
              </p>
            )}
            {!loading && !items.length && (
              <p className="py-4 text-sm text-muted-foreground">
                {t(
                  'No pending proposals. Ask your assistant to submit a proposal when you want to review before saving.',
                )}
              </p>
            )}
            {items.map((item) => (
              <button
                type="button"
                key={item.id}
                aria-pressed={selectedId === item.id}
                disabled={busy}
                onClick={() => {
                  setSelectedId(item.id);
                  setError(null);
                }}
                className={`mt-2 block w-full rounded border p-3 text-left text-xs ${selectedId === item.id ? 'border-brand bg-brand-soft' : 'border-transparent bg-muted/50'}`}
              >
                <strong className="block break-words">{item.title}</strong>
                <span className="mt-1 block text-muted-foreground">
                  {item.actor} · {t(item.status)}
                </span>
                <span className="mt-1 block">
                  {t('{count} affected slides', { count: item.pageCount })}
                </span>
              </button>
            ))}
          </aside>
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-auto">
            {current ? (
              <>
                <div className="shrink-0 space-y-2 border-b px-4 py-3 text-xs">
                  <div className="flex items-center justify-between gap-3">
                    <strong>{current.title}</strong>
                    <span>{t(current.status)}</span>
                  </div>
                  {current.status === 'needs-rebase' && (
                    <p className="text-amber-700 dark:text-amber-300">
                      {t(
                        'The project changed. Ask your assistant to prepare a new proposal from the latest version.',
                      )}
                    </p>
                  )}
                  <label className="flex items-center gap-2">
                    {t('Affected slide')}
                    <select
                      value={pageId ?? ''}
                      onChange={(event) => setPageId(event.target.value)}
                      className="min-w-0 flex-1 rounded border bg-background p-1"
                    >
                      {!current.preview.pages.length && (
                        <option value="">{t('Project structure / Story')}</option>
                      )}
                      {current.preview.pages.map((page) => (
                        <option key={page.pageId} value={page.pageId}>
                          {page.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  {current.preview.pages
                    .find((page) => page.pageId === pageId)
                    ?.usedBy.map((use) => (
                      <span
                        key={use.occurrenceId}
                        className="mr-2 inline-block rounded bg-muted px-2 py-1"
                      >
                        {use.presentationTitle} · {use.position}
                        {use.versionId ? ` · ${t('Pinned version')}` : ` · ${t('Live reference')}`}
                      </span>
                    ))}
                </div>
                <div className="grid min-h-64 shrink-0 grid-cols-2 border-b">
                  {(['before', 'after'] as const).map((side) => {
                    const frame = current[side];
                    const page = frame.pages.find((item) => item.pageId === pageId);
                    return (
                      <section key={side} className="flex min-w-0 flex-col border-r">
                        <h3 className="border-b px-3 py-2 text-xs font-medium">
                          {t(side === 'before' ? 'Current saved slide' : 'Proposed slide')}
                        </h3>
                        <div className="relative min-h-52 flex-1 bg-canvas p-2">
                          {page ? (
                            <SlideCanvas
                              width={frame.size[0]}
                              height={frame.size[1]}
                              flat
                              freezeMotion
                            >
                              <PptdPageRenderer
                                page={page}
                                size={frame.size}
                                theme={frame.theme as PptdTheme}
                              />
                            </SlideCanvas>
                          ) : (
                            <p className="p-4 text-xs text-muted-foreground">
                              {t(
                                side === 'before'
                                  ? 'No slide in this version.'
                                  : 'This proposal removes the slide.',
                              )}
                            </p>
                          )}
                        </div>
                        {page?.data.notes && (
                          <p className="max-h-20 overflow-auto whitespace-pre-wrap border-t px-3 py-2 text-xs">
                            {page.data.notes}
                          </p>
                        )}
                      </section>
                    );
                  })}
                </div>
                <div className="min-h-0 space-y-3 overflow-auto px-4 py-3 text-xs">
                  <h3 className="font-semibold">{t('Proposed changes')}</h3>
                  {current.preview.changes
                    .filter((change) => !pageId || !change.pageId || change.pageId === pageId)
                    .map((change) => (
                      <details
                        key={`${change.target}:${change.pageId}:${change.elementId}:${change.field}`}
                        className="rounded border p-2"
                      >
                        <summary>
                          {change.elementId ? `${change.elementId} · ` : ''}
                          {t(change.field || change.target)}
                        </summary>
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          <pre className="overflow-auto whitespace-pre-wrap break-words font-sans">
                            {change.before.present
                              ? JSON.stringify(change.before.value, null, 2)
                              : '—'}
                          </pre>
                          <pre className="overflow-auto whitespace-pre-wrap break-words font-sans">
                            {change.after.present
                              ? JSON.stringify(change.after.value, null, 2)
                              : '—'}
                          </pre>
                        </div>
                      </details>
                    ))}
                  {current.preview.changesTruncated && (
                    <p>
                      {t(
                        'The change list is abbreviated. Review the affected slides before accepting.',
                      )}
                    </p>
                  )}
                  {current.status === 'pending' && (current.selectablePageIds?.length ?? 0) > 1 && (
                    <details className="rounded border p-3">
                      <summary>{t('Review only selected slides')}</summary>
                      <p className="my-2 text-muted-foreground">
                        {t(
                          'Each selected slide stays an atomic group. A new preview is created before you can accept it.',
                        )}
                      </p>
                      {current.preview.pages
                        .filter((page) => current.selectablePageIds?.includes(page.pageId))
                        .map((page) => (
                          <label key={page.pageId} className="my-1 flex items-center gap-2">
                            <input
                              type="checkbox"
                              disabled={busy}
                              checked={selectedPages.includes(page.pageId)}
                              onChange={(event) =>
                                setSelectedPages((ids) =>
                                  event.target.checked
                                    ? [...ids, page.pageId]
                                    : ids.filter((id) => id !== page.pageId),
                                )
                              }
                            />
                            {page.label}
                          </label>
                        ))}
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2"
                        disabled={
                          busy ||
                          !selectedPages.length ||
                          selectedPages.length === current.selectablePageIds?.length
                        }
                        onClick={() => void selectPages()}
                      >
                        {t('Create selected preview')}
                      </Button>
                    </details>
                  )}
                  {current.approval && (
                    <p data-hd-proposal-receipt className="text-muted-foreground">
                      {t('Reviewed in the Editor')} ·{' '}
                      {new Date(current.approval.at).toLocaleString()}
                      {current.operationId ? ` · ${current.operationId}` : ''}
                    </p>
                  )}
                  {current.failure && <p className="text-destructive">{t(current.failure)}</p>}
                </div>
              </>
            ) : (
              <p className="p-6 text-sm text-muted-foreground">
                {t('Select a proposal to inspect its actual before and after slides.')}
              </p>
            )}
          </div>
        </div>
        <footer className="shrink-0 space-y-2 border-t px-5 py-3">
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {t(error)}
            </p>
          )}
          {blocked && (
            <p className="text-xs text-muted-foreground">
              {t('Save or resolve your current drafts before accepting a proposal.')}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              disabled={busy || !current?.approvalNonce}
              onClick={() => void decide('reject')}
            >
              {t('Reject proposal')}
            </Button>
            <Button
              disabled={busy || blocked || current?.status !== 'pending' || !current.approvalNonce}
              onClick={() => void decide('accept')}
            >
              {busy && <Loader2 className="animate-spin" />}
              {t('Accept proposal')}
            </Button>
          </div>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
