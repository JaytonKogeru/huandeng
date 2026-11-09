import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useHuandengLocale } from '@/lib/huandeng-locale';
import { projectSlideTitle } from '@/lib/pptd-project-source';
import type { PageSize, PageSnapshot } from '../../../pptd/types';
import { Button } from '../ui/button';
import { NotesEditor, type NotesEditorProps } from './notes-panel';
import type { PptdTheme } from './renderer';
import { WorkspaceSlidePreview } from './workspace-views';

export function NotesPageView({
  page,
  size,
  theme,
  position,
  count,
  navigatingDisabled,
  onPrevious,
  onNext,
  ...notes
}: {
  page?: PageSnapshot;
  size: PageSize;
  theme: PptdTheme;
  position: number;
  count: number;
  navigatingDisabled: boolean;
  onPrevious: () => void;
  onNext: () => void;
} & NotesEditorProps) {
  const { t } = useHuandengLocale();
  return (
    <section
      className="hd-notes-page"
      data-hd-notes-page
      data-hd-focus-region="notes"
      tabIndex={-1}
      aria-label={t('Notes page')}
    >
      <div className="hd-notes-page-navigation">
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={navigatingDisabled || position <= 1}
          onClick={onPrevious}
          aria-label={t('Previous Slide')}
          data-hd-notes-previous
        >
          <ChevronLeft />
        </Button>
        <span className="min-w-0 flex-1 truncate text-center text-xs">
          {page ? t('Position {position} of {count}', { position, count }) : t('No slide selected')}
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={navigatingDisabled || position < 1 || position >= count}
          onClick={onNext}
          aria-label={t('Next Slide')}
          data-hd-notes-next
        >
          <ChevronRight />
        </Button>
      </div>
      {page ? (
        <div className="hd-notes-page-body">
          <div className="hd-notes-page-slide">
            <WorkspaceSlidePreview
              key={`${page.pageId}:${page.occurrenceId ?? ''}:${page.versionId ?? ''}`}
              page={page}
              size={size}
              theme={theme}
              eager
            />
            <h2 className="break-words text-sm font-medium">
              {projectSlideTitle(page, t('Untitled slide'))}
            </h2>
            <p className="break-all text-xs text-muted-foreground" title={page.pageId}>
              {t('Slide ID')} {page.shortCode ?? page.pageId}
            </p>
            {page.versionId && (
              <p className="text-xs text-muted-foreground" title={page.versionId}>
                {t('Pinned version · read-only')}
              </p>
            )}
          </div>
          <div className="hd-notes-page-editor">
            <h2 className="border-b px-3 py-2 text-sm font-medium">{t('Speaker notes')}</h2>
            <NotesEditor {...notes} />
          </div>
        </div>
      ) : (
        <p className="p-8 text-sm text-muted-foreground">{t('No Slides in this collection.')}</p>
      )}
    </section>
  );
}
