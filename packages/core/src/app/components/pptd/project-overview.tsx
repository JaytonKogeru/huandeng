import { ArrowUpRight, BookOpen, Layers3, Link2, LockKeyhole, Presentation } from 'lucide-react';
import { useMemo } from 'react';
import { uiText as t, useHuandengLocale } from '@/lib/huandeng-locale';
import { projectInsights } from '../../../pptd/project-insights';
import type { DeckSnapshot } from '../../../pptd/types';
import { Button } from '../ui/button';

export interface ProjectOverviewProps {
  snapshot: DeckSnapshot;
  selectedPageId: string | null;
  selectedPresentationId: string | null;
  selectedOccurrenceId?: string | null;
  onSelectPresentation: (presentationId: string | null) => void;
  onSelectOccurrence: (presentationId: string | null, pageId: string, occurrenceId: string) => void;
  onEditProject?: () => void;
}

const cardClass =
  'w-full rounded-lg border p-3 text-left outline-none motion-safe:transition-colors motion-safe:duration-150 hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring/40';

export function ProjectOverview({
  snapshot,
  selectedPageId,
  selectedPresentationId,
  selectedOccurrenceId,
  onSelectPresentation,
  onSelectOccurrence,
  onEditProject,
}: ProjectOverviewProps) {
  useHuandengLocale();
  const parsed = useMemo(() => {
    try {
      return { value: projectInsights(snapshot), error: null };
    } catch (error) {
      return { value: null, error: error instanceof Error ? error.message : '项目编排暂不可读。' };
    }
  }, [snapshot]);
  if (!parsed.value)
    return (
      <p role="alert" className="p-3 text-xs text-destructive">
        {t(parsed.error)}
      </p>
    );
  const insights = parsed.value;
  const usages = selectedPageId ? (insights.usageByPage[selectedPageId] ?? []) : [];
  const presentations = new Set(
    usages.flatMap((usage) => (usage.presentationId ? [usage.presentationId] : [])),
  );
  return (
    <section aria-label={t('项目概览')} className="space-y-4 p-3 text-xs" data-hd-project-overview>
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold tracking-wide">{t('项目概览')}</h2>
        {onEditProject && (
          <Button variant="ghost" size="xs" onClick={onEditProject}>
            <BookOpen />
            {t('Arrange Presentation')}
          </Button>
        )}
      </div>
      <button
        type="button"
        data-hd-presentation-card="main"
        className={`${cardClass} ${selectedPresentationId === null ? 'border-foreground/25 bg-muted/50' : 'border-border'}`}
        aria-current={selectedPresentationId === null ? 'page' : undefined}
        onClick={() => onSelectPresentation(null)}
      >
        <span className="flex items-center gap-2 font-medium">
          <Layers3 className="size-3.5" />
          {t('Main Slides')}
          <span className="ml-auto text-[10px] text-muted-foreground">{t('主库')}</span>
        </span>
        <span className="mt-1.5 block truncate text-muted-foreground">{insights.title}</span>
        <span className="mt-2 flex gap-3 tabular-nums text-[11px] text-muted-foreground">
          <span>{t('{value0} 页', { value0: insights.mainPageCount })}</span>
          <span>{t('{value0} 个章节', { value0: insights.sectionCount })}</span>
          <span>{t('{value0} 场演讲', { value0: insights.presentations.length })}</span>
        </span>
        {insights.mainStory.purpose && (
          <span className="mt-2 block line-clamp-2 leading-relaxed">
            {insights.mainStory.purpose}
          </span>
        )}
      </button>
      <div className="space-y-2">
        <h3 className="flex items-center gap-1.5 font-medium">
          <Presentation className="size-3.5" />
          {t('Presentations')}
        </h3>
        {insights.presentations.length === 0 ? (
          <div className="space-y-3 rounded-lg border border-dashed border-border p-3 leading-relaxed text-muted-foreground">
            <p>{t('Build a Presentation by choosing slides or Sections from Main Slides.')}</p>
            {onEditProject && (
              <Button size="xs" variant="outline" className="w-full" onClick={onEditProject}>
                {t('Create a Presentation')}
              </Button>
            )}
          </div>
        ) : (
          insights.presentations.map((presentation) => (
            <button
              type="button"
              key={presentation.id}
              data-hd-presentation-card={presentation.id}
              className={`${cardClass} ${selectedPresentationId === presentation.id ? 'border-foreground/25 bg-muted/50' : 'border-border'}`}
              aria-current={selectedPresentationId === presentation.id ? 'page' : undefined}
              onClick={() => onSelectPresentation(presentation.id)}
            >
              <span className="flex items-start justify-between gap-2 font-medium">
                <span className="min-w-0 break-words">{presentation.title}</span>
                <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground" />
              </span>
              <span className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] tabular-nums text-muted-foreground">
                <span>{t('{value0} 个播放位置', { value0: presentation.pageCount })}</span>
                <span>{t('{value0} 张主页面', { value0: presentation.uniquePageCount })}</span>
                {presentation.pinnedPageCount > 0 && (
                  <span>{t('{value0} 处固定版本', { value0: presentation.pinnedPageCount })}</span>
                )}
              </span>
              {presentation.story.audience && (
                <span className="mt-2 block line-clamp-2 text-muted-foreground">
                  {t('听众 · {value0}', { value0: presentation.story.audience })}
                </span>
              )}
              {presentation.pageCount === 0 && (
                <span className="mt-2 block text-[11px] text-muted-foreground">
                  {t('Choose Arrange Presentation to add slides.')}
                </span>
              )}
              {presentation.diagnostics.some(
                (diagnostic) => diagnostic.code !== 'PRESENTATION_EMPTY',
              ) && (
                <span className="mt-2 block text-[11px] text-destructive">
                  {t(
                    presentation.diagnostics.find(
                      (diagnostic) => diagnostic.code !== 'PRESENTATION_EMPTY',
                    )?.message ?? '',
                  )}
                </span>
              )}
            </button>
          ))
        )}
      </div>
      {selectedPageId && (
        <div className="space-y-2 border-t border-border pt-3">
          <h3 className="flex items-center gap-1.5 font-medium">
            <Link2 className="size-3.5" />
            {usages[0]?.label ?? t('当前页')}
            {t(' 的使用位置')}
          </h3>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            {presentations.size
              ? t('用于 {value0} 场演讲；修改当前主页面会同步到所有实时引用。', {
                  value0: presentations.size,
                })
              : t('这张页面目前只在主库中。可在演讲编排中添加引用。')}
          </p>
          <ul className="space-y-1">
            {usages.map((usage) => {
              const current =
                usage.presentationId === selectedPresentationId &&
                (selectedOccurrenceId
                  ? usage.occurrenceId === selectedOccurrenceId
                  : usage.presentationId === null);
              return (
                <li key={usage.occurrenceId}>
                  <button
                    type="button"
                    className={`flex w-full items-center gap-2 rounded-md px-2 py-2 text-left outline-none motion-safe:transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-50 ${current ? 'bg-muted' : ''}`}
                    disabled={!usage.available}
                    data-hd-project-usage={usage.occurrenceId}
                    aria-current={current ? 'location' : undefined}
                    onClick={() =>
                      onSelectOccurrence(usage.presentationId, usage.pageId, usage.occurrenceId)
                    }
                  >
                    <span className="w-7 shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">
                      {usage.position.toString().padStart(2, '0')}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">
                        {usage.presentationId ? usage.presentationTitle : 'Main Slides'}
                      </span>
                      {usage.notes && (
                        <span className="mt-0.5 block truncate text-[10px] text-muted-foreground">
                          {usage.notes}
                        </span>
                      )}
                    </span>
                    {usage.versionId ? (
                      <LockKeyhole
                        className="size-3 shrink-0 text-muted-foreground"
                        aria-label={t('固定版本')}
                      />
                    ) : (
                      <ArrowUpRight className="size-3 shrink-0 text-muted-foreground" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="text-[10px] leading-relaxed text-muted-foreground">
            {t(
              'Slide ID stays with the slide. Position changes when the order changes. Pinned versions retain their recorded content and assets.',
            )}
          </p>
        </div>
      )}
    </section>
  );
}
