import { useHuandengLocale } from '@/lib/huandeng-locale';
import { projectSlideTitle } from '@/lib/pptd-project-source';
import type { DeckSnapshot, PageSnapshot } from '../../../pptd/types';
import { Button } from '../ui/button';
import { currentPageScope } from './page-scope';

export function PageScopeBar({
  snapshot,
  page,
  presentationId,
  onMain,
  onOccurrence,
  onOrganize,
}: {
  snapshot: DeckSnapshot;
  page: PageSnapshot;
  presentationId: string | null;
  onMain: (pageId: string) => void;
  onOccurrence: (presentationId: string | null, pageId: string, occurrenceId: string) => void;
  onOrganize: () => void;
}) {
  const { t } = useHuandengLocale();
  const scope = currentPageScope(snapshot, page.pageId);
  return (
    <section
      data-hd-page-scope
      data-hd-shared-slide-notice={presentationId ? '' : undefined}
      className="shrink-0 border-b border-border bg-background px-4 py-2 text-xs"
    >
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
        <span className="shrink-0 font-medium text-brand">
          {page.shortCode ?? page.metadata.label}
        </span>
        <span className="min-w-0 flex-1 truncate font-medium" title={projectSlideTitle(page)}>
          {projectSlideTitle(page)}
        </span>
        <span className="shrink-0 text-muted-foreground">
          {page.versionId
            ? t('Pinned version · read-only')
            : presentationId
              ? t('Live reference')
              : t('Main Slides')}
        </span>
      </div>
      <details className="mt-1 text-muted-foreground">
        <summary className="w-fit cursor-pointer rounded focus-visible:outline-2 focus-visible:outline-ring">
          {t('Live references')}: {scope.live} · {t('Pinned references')}: {scope.pinned} ·{' '}
          {t('View edit scope')}
        </summary>
        <div className="mt-2 space-y-2 border-t pt-2">
          <p>
            {page.versionId
              ? t('此引用固定为已记录版本，内容只读。')
              : t(
                  'Live edits update Main and live references. Pinned versions keep their recorded artwork.',
                )}
          </p>
          <ul className="max-h-32 space-y-1 overflow-y-auto">
            {scope.usages.map((usage) => (
              <li key={usage.occurrenceId}>
                <button
                  type="button"
                  className="max-w-full rounded px-1 py-0.5 text-left hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
                  data-hd-scope-occurrence={usage.occurrenceId}
                  onClick={() =>
                    onOccurrence(usage.presentationId, page.pageId, usage.occurrenceId)
                  }
                >
                  <span className="break-words">{usage.title}</span> ·{' '}
                  {usage.versionId ? t('Pinned') : t('Live reference')}
                </button>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            {presentationId && scope.main && (
              <Button size="xs" variant="outline" onClick={() => onMain(page.pageId)}>
                {t('前往 Main Slide')}
              </Button>
            )}
            <Button size="xs" variant="ghost" onClick={onOrganize}>
              {t('编排与备注')}
            </Button>
          </div>
        </div>
      </details>
    </section>
  );
}
