import { Loader2, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useHuandengLocale } from '@/lib/huandeng-locale';
import type { PptdBackend } from '@/lib/pptd-backend';
import type { DesignAuditOptions, DesignAuditReport } from '../../../pptd/design-audit';
import type { DeckSnapshot } from '../../../pptd/types';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';

const findingMessages: Record<string, string> = {
  DESIGN_LARGE_TYPE:
    'Type is larger than the selected language reference. Check visual weight and line breaks.',
  DESIGN_HEAVY_PARAGRAPH:
    'A long text block is entirely bold. Consider regular body text with selective emphasis.',
  DESIGN_LOW_RESOLUTION:
    'The image has too few source pixels at 1920-wide output. Recapture it or reduce its displayed size.',
  DESIGN_BACKGROUND_MISMATCH: 'The background differs from the requested deck color.',
  DESIGN_SECTION_DIVIDER_MISSING: 'This Section does not start with a title-only slide.',
  EDITORIAL_DISCLAIMER_FURNITURE:
    'A defensive disclaimer is in page furniture. Keep it only when needed for interpretation.',
  EDITORIAL_MIDDOT_CHAIN: 'Repeated middle-dot separators. Prefer a real semantic hierarchy.',
  EDITORIAL_TEXT_ARROW_CHAIN: 'A text arrow chain may need a meaningful diagram.',
  EDITORIAL_GENERIC_SLOGAN:
    'Generic technology slogan. Replace with a specific question, result or action.',
  EDITORIAL_FRAGMENTED_PROSE:
    'Too many short text objects. Review whether this is prose or real figure labels.',
  EDITORIAL_TEXT_WITHOUT_EVIDENCE:
    'Text-heavy explanation without a figure, plot, table or screenshot.',
  EDITORIAL_REPEATED_EQUAL_CARDS:
    'Three or more consecutive pages repeat an equivalent three-card layout.',
};

export function DesignQualityDialog({
  open,
  onOpenChange,
  backend,
  snapshot,
  onSelectPage,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  backend: PptdBackend;
  snapshot: DeckSnapshot;
  onSelectPage: (pageId: string) => void;
}) {
  const { t } = useHuandengLocale();
  const [language, setLanguage] = useState<'' | 'en' | 'zh-CN'>('');
  const [dividers, setDividers] = useState(false);
  const [white, setWhite] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [report, setReport] = useState<DesignAuditReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // biome-ignore lint/correctness/useExhaustiveDependencies: Refresh deliberately requests a new saved-document inspection.
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    const options: DesignAuditOptions = {
      ...(language ? { language } : {}),
      requireSectionDividers: dividers,
      ...(white ? { expectedBackground: '#FFFFFF' } : {}),
    };
    void backend
      .designAudit(options, controller.signal)
      .then(
        (result) => {
          if (!controller.signal.aborted) setReport(result);
        },
        (failure) => {
          if (!controller.signal.aborted)
            setError(failure instanceof Error ? failure.message : String(failure));
        },
      )
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [open, backend, language, dividers, white, refresh]);
  const stale =
    !!report &&
    (report.deckId !== snapshot.deckId ||
      report.revisions.manifest !== snapshot.manifestRevision ||
      report.revisions.metadata !== snapshot.metadataRevision ||
      report.revisions.guidance !== (snapshot.projectGuidance?.revision ?? null) ||
      report.pages.some(
        (page) =>
          snapshot.pages.find((item) => item.pageId === page.pageId)?.renderRevision !==
          page.renderRevision,
      ));
  const findings = report?.findings ?? [];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[85vh] w-[min(960px,94vw)] max-w-none sm:max-w-none flex-col"
        data-hd-design-quality-dialog
      >
        <DialogHeader>
          <DialogTitle>{t('Design check')}</DialogTitle>
          <DialogDescription>
            {t('Review typography, backgrounds and image resolution across Main Slides.')}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3 border-y border-border py-3 text-xs">
          <label className="flex items-center gap-2">
            {t('Slide language')}
            <select
              value={language}
              className="rounded border border-border bg-background px-2 py-1"
              onChange={(event) => setLanguage(event.target.value as typeof language)}
            >
              <option value="">{t('Detect from content')}</option>
              <option value="zh-CN">中文</option>
              <option value="en">English</option>
            </select>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={white}
              onChange={(event) => setWhite(event.target.checked)}
            />
            {t('Expect white backgrounds')}
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={dividers}
              onChange={(event) => setDividers(event.target.checked)}
            />
            {t('Expect Section title slides')}
          </label>
          <Button
            size="xs"
            variant="outline"
            className="ml-auto"
            disabled={loading}
            onClick={() => setRefresh((value) => value + 1)}
          >
            {loading ? <Loader2 className="animate-spin" /> : <RefreshCw />}
            {t('Refresh')}
          </Button>
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {t(error)}
          </p>
        )}
        {loading && (
          <p role="status" className="text-xs text-muted-foreground">
            {t('Checking saved slides…')}
          </p>
        )}
        {stale && (
          <p role="status" className="text-xs text-amber-700 dark:text-amber-300">
            {t('Slides changed. Refresh to inspect the current version.')}
          </p>
        )}
        {report && !error && (
          <div className="min-h-0 overflow-y-auto space-y-5" aria-busy={loading}>
            <p className="text-sm" data-hd-design-summary>
              {t('{count} slides · {findings} observations · {backgrounds} backgrounds', {
                count: report.pageCount,
                findings: report.findingCount,
                backgrounds: report.backgrounds.length,
              })}
            </p>
            <p className="text-xs leading-relaxed text-muted-foreground" data-hd-editorial-standard>
              {t('Editorial rules')} {report.editorialStandard.version} ·{' '}
              {report.editorialStandard.automatedSignals} {t('pattern observations')}.{' '}
              {t('Visual review is always required.')}
            </p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {t('Use these observations to choose what to refine, then review the actual slides.')}
            </p>
            {report.truncated && (
              <p className="text-xs text-amber-700">
                {t('This Project exceeds the inspection limit. The results below are partial.')}
              </p>
            )}
            {findings.length ? (
              <ol className="divide-y divide-border">
                {findings.slice(0, 100).map((finding) => {
                  const page = report.pages.find((item) => item.pageId === finding.pageId);
                  return (
                    <li
                      key={`${finding.pageId}-${finding.elementId ?? ''}-${finding.code}-${finding.message}`}
                      className="py-3"
                    >
                      <button
                        type="button"
                        className="text-left text-xs font-medium text-brand hover:underline"
                        disabled={loading || stale}
                        onClick={() => {
                          onOpenChange(false);
                          onSelectPage(finding.pageId);
                        }}
                      >
                        {t('Position {position}', { position: page?.position ?? '—' })} ·{' '}
                        {page?.title || t('Untitled slide')}
                      </button>
                      <p className="mt-1 text-sm leading-relaxed">
                        {t(findingMessages[finding.code] ?? finding.message)}
                      </p>
                      {finding.measured !== undefined && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {t('Measured')}: {finding.measured}
                          {finding.recommended !== undefined
                            ? ` · ${t('Reference')}: ${finding.recommended}`
                            : ''}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p className="py-3 text-sm">{t('No observations under these settings.')}</p>
            )}
            {findings.length > 100 && (
              <p className="text-xs text-muted-foreground">
                {t('Showing the first 100 observations.')}
              </p>
            )}
            <details>
              <summary className="cursor-pointer text-xs font-medium">
                {t('Slide inventory')}
              </summary>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="py-2 pr-3">{t('Slide')}</th>
                      <th className="pr-3">{t('Background')}</th>
                      <th className="pr-3">{t('Text sizes')}</th>
                      <th>{t('Image sampling')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.pages.map((page) => (
                      <tr key={page.pageId} className="border-b border-border/60">
                        <td className="max-w-72 truncate py-2 pr-3">
                          {page.position}. {page.title}
                        </td>
                        <td className="pr-3 font-mono">{page.background}</td>
                        <td className="pr-3">
                          {[...new Set(page.text.map((item) => item.normalizedSize))]
                            .sort((a, b) => b - a)
                            .join(' / ')}
                        </td>
                        <td>
                          {page.images
                            .map((item) =>
                              item.sampling !== undefined ? `${item.sampling}×` : item.status,
                            )
                            .join(', ') || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
