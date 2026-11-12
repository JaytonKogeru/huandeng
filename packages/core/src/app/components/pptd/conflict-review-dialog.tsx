import { Copy, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useHuandengLocale } from '@/lib/huandeng-locale';
import type { DraftConflictDetails } from '@/lib/pptd-document';
import type { DeckSnapshot } from '../../../pptd/types';
import { SlideCanvas } from '../slide-canvas';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { PptdPageRenderer, type PptdTheme } from './renderer';

function fieldValue(value: unknown) {
  if (value === undefined) return '—';
  return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
}

export function ConflictReviewDialog({
  snapshot,
  details,
  blocked,
  onClose,
  onKeep,
  onDiscard,
  onCopy,
}: {
  snapshot: DeckSnapshot;
  details: DraftConflictDetails;
  blocked: boolean;
  onClose: () => void;
  onKeep: (keepConflictingFields: boolean) => Promise<void>;
  onDiscard: () => void;
  onCopy: () => Promise<void>;
}) {
  const { t } = useHuandengLocale();
  const [keepOverlaps, setKeepOverlaps] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canKeep = details.canRebase && (!details.conflicts.length || keepOverlaps);
  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await onKeep(keepOverlaps);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
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
        data-hd-conflict-review
        className="flex h-[min(830px,calc(100dvh-2rem))] w-[calc(100vw-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[1180px]"
        onKeyDown={(event) => event.stopPropagation()}
      >
        <DialogHeader className="shrink-0 border-b px-5 py-4 pr-12">
          <DialogTitle>{t('Review conflicting changes')}</DialogTitle>
          <DialogDescription>
            {t(
              'Saving is paused. Compare your draft with the latest saved slide before choosing what to keep.',
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-auto md:grid-cols-2">
          {(
            [
              { label: 'Your draft', page: details.local },
              { label: 'Latest saved version', page: details.remote },
            ] as const
          ).map(({ label, page }) => (
            <section
              key={label}
              className="flex min-h-64 flex-col border-b md:border-r"
              data-hd-conflict-side={label}
            >
              <h3 className="border-b px-4 py-2 text-sm font-medium">{t(label)}</h3>
              <div className="relative min-h-48 flex-1 bg-canvas p-3">
                {page ? (
                  <SlideCanvas width={snapshot.size[0]} height={snapshot.size[1]} flat freezeMotion>
                    <PptdPageRenderer
                      page={page}
                      size={snapshot.size}
                      theme={(snapshot.manifest.theme ?? {}) as PptdTheme}
                    />
                  </SlideCanvas>
                ) : (
                  <p className="p-4 text-sm">{t('This slide was removed from the project.')}</p>
                )}
              </div>
              {page?.data.notes && (
                <details className="border-t px-4 py-2 text-xs">
                  <summary>{t('Speaker notes')}</summary>
                  <p className="max-h-24 overflow-auto whitespace-pre-wrap pt-2">
                    {page.data.notes}
                  </p>
                </details>
              )}
            </section>
          ))}
        </div>
        <div className="max-h-52 shrink-0 overflow-auto border-b px-5 py-3 text-xs">
          {!details.conflicts.length ? (
            <p>
              {t(
                'Your changes affect independent fields and can be merged with the saved version.',
              )}
            </p>
          ) : (
            <>
              <h3 className="mb-2 font-semibold">{t('Fields requiring a choice')}</h3>
              <table className="w-full table-fixed text-left">
                <thead>
                  <tr>
                    <th className="w-1/4 py-1">{t('Field')}</th>
                    <th className="px-2 py-1">{t('Your draft')}</th>
                    <th className="px-2 py-1">{t('Latest saved version')}</th>
                  </tr>
                </thead>
                <tbody>
                  {details.conflicts.map((item) => (
                    <tr
                      key={`${item.elementId}:${item.field}:${item.reason}`}
                      className="border-t align-top"
                    >
                      <th className="break-words py-2 font-medium">
                        {item.elementId && (
                          <span className="block font-mono text-muted-foreground">
                            {item.elementId}
                          </span>
                        )}
                        {t(item.field)}
                      </th>
                      <td className="px-2 py-2">
                        <pre className="max-h-28 overflow-auto whitespace-pre-wrap break-words font-sans">
                          {fieldValue(item.local)}
                        </pre>
                      </td>
                      <td className="px-2 py-2">
                        <pre className="max-h-28 overflow-auto whitespace-pre-wrap break-words font-sans">
                          {fieldValue(item.remote)}
                        </pre>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
        <div className="shrink-0 space-y-3 px-5 py-4">
          {!details.canRebase && (
            <p className="text-xs text-amber-700 dark:text-amber-300">
              {t(
                'An object was removed or its shared layout changed. Copy your draft before rebuilding these changes on the latest slide.',
              )}
            </p>
          )}
          {details.canRebase && details.conflicts.length > 0 && (
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={keepOverlaps}
                disabled={busy}
                onChange={(event) => setKeepOverlaps(event.target.checked)}
                className="mt-1"
              />
              <span>
                {t(
                  'Keep my values for the overlapping fields shown above. Preserve other saved changes.',
                )}
              </span>
            </label>
          )}
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {t(error)}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            {t('Using the saved version keeps a recoverable copy of this draft for this session.')}
          </p>
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => void onCopy().catch((cause) => setError(String(cause)))}
            >
              <Copy />
              {t('Copy draft')}
            </Button>
            <Button variant="outline" disabled={busy || blocked} onClick={onDiscard}>
              {t('Use saved version')}
            </Button>
            <Button disabled={busy || blocked || !canKeep} onClick={() => void save()}>
              {busy && <Loader2 className="animate-spin" />}
              {t('Keep my changes')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
