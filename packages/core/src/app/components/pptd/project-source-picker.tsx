import { Check, Layers3, Plus, Search } from 'lucide-react';
import { memo, useEffect, useRef, useState } from 'react';
import { uiText as t, useHuandengLocale } from '@/lib/huandeng-locale';
import { pptdAssetPreviewUrl } from '@/lib/pptd-backend';
import { projectSlideSearch, projectSlideTitle } from '@/lib/pptd-project-source';
import type { ResolvedProjectSection } from '../../../pptd/project-model';
import type { DeckSnapshot, PageSnapshot } from '../../../pptd/types';
import { SlideCanvas } from '../slide-canvas';
import { Button } from '../ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { PptdPageRenderer, type PptdTheme } from './renderer';

export const ProjectSlidePreview = memo(function ProjectSlidePreview({
  page,
  snapshot,
  immediate = false,
}: {
  page: PageSnapshot;
  snapshot: Pick<DeckSnapshot, 'size' | 'manifest'>;
  immediate?: boolean;
}) {
  const target = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(immediate);
  useEffect(() => {
    if (immediate || !target.current) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {
      rootMargin: '80px',
    });
    observer.observe(target.current);
    return () => observer.disconnect();
  }, [immediate]);
  return (
    <div
      ref={target}
      aria-hidden
      className="pointer-events-none size-full overflow-hidden bg-muted"
      data-hd-project-preview={page.pageId}
    >
      {(visible || immediate) && (
        <SlideCanvas width={snapshot.size[0]} height={snapshot.size[1]} flat freezeMotion>
          <PptdPageRenderer
            page={page}
            size={snapshot.size}
            theme={snapshot.manifest.theme as PptdTheme | undefined}
            assetUrl={pptdAssetPreviewUrl}
          />
        </SlideCanvas>
      )}
    </div>
  );
});

function SourceSlide({
  page,
  position,
  snapshot,
  added,
  disabled,
  onAdd,
}: {
  page: PageSnapshot;
  position: number;
  snapshot: DeckSnapshot;
  added: boolean;
  disabled: boolean;
  onAdd: () => void;
}) {
  useHuandengLocale();
  const [previewOpen, setPreviewOpen] = useState(false);
  const title = projectSlideTitle(page);
  return (
    <Tooltip open={previewOpen} onOpenChange={setPreviewOpen}>
      <TooltipTrigger
        render={
          <button
            type="button"
            data-hd-add-main-slide={page.pageId}
            disabled={disabled}
            aria-label={t('Add slide {position}: {title}', { position, title })}
            onClick={onAdd}
            className="flex w-full items-center gap-2 rounded-md border border-border bg-background p-2 text-left outline-none hover:border-brand/50 hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-50"
          />
        }
      >
        <span className="block h-12 w-[5.25rem] shrink-0 overflow-hidden rounded border border-border">
          <ProjectSlidePreview page={page} snapshot={snapshot} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block line-clamp-2 text-[11px] font-medium leading-snug">{title}</span>
          <span className="mt-1 block text-[10px] tabular-nums text-muted-foreground">
            {t('Position {position}', { position })} · {t('Slide ID')}{' '}
            {page.shortCode ?? page.pageId}
          </span>
        </span>
        {added ? (
          <Check className="size-3.5 shrink-0 text-brand" />
        ) : (
          <Plus className="size-3.5 shrink-0" />
        )}
      </TooltipTrigger>
      <TooltipContent
        side="right"
        align="start"
        sideOffset={10}
        className="max-w-[calc(100vw-2rem)] border border-border bg-background p-2 text-foreground shadow-lg"
      >
        {previewOpen && (
          <>
            <div
              className="w-80 max-w-[65vw]"
              style={{ aspectRatio: `${snapshot.size[0]} / ${snapshot.size[1]}` }}
            >
              <ProjectSlidePreview page={page} snapshot={snapshot} immediate />
            </div>
            <p className="mt-2 max-w-80 text-xs font-medium">{title}</p>
            <p className="mt-1 text-[10px] text-muted-foreground">
              {t('Position {position}', { position })} · {t('Slide ID')}{' '}
              {page.shortCode ?? page.pageId}
            </p>
          </>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

export function ProjectSourcePicker({
  snapshot,
  sections,
  disabled,
  onAddPage,
  onAddSection,
}: {
  snapshot: DeckSnapshot;
  sections: ResolvedProjectSection[];
  disabled: boolean;
  onAddPage: (pageId: string) => void;
  onAddSection: (sectionId: string) => void;
}) {
  useHuandengLocale();
  const [query, setQuery] = useState('');
  const [lastAdded, setLastAdded] = useState<string | null>(null);
  const needle = query.trim().toLocaleLowerCase();
  const sources = snapshot.pages.filter((page) => page.state === 'active');
  const pages = sources
    .map((page, index) => ({ page, position: index + 1 }))
    .filter(({ page, position }) => `${position} ${projectSlideSearch(page)}`.includes(needle));
  const matchingSections = sections.filter((item) =>
    [
      item.section.title,
      ...item.pageIds.map((id) => {
        const page = sources.find((candidate) => candidate.pageId === id);
        return page ? projectSlideSearch(page) : id;
      }),
    ]
      .join(' ')
      .toLocaleLowerCase()
      .includes(needle),
  );
  return (
    <div
      className="space-y-2 rounded-md border border-border bg-muted/20 p-2"
      data-hd-source-picker
    >
      <label className="flex items-center gap-2 rounded border border-border bg-background px-2">
        <Search className="size-3.5 shrink-0 text-muted-foreground" />
        <input
          type="search"
          className="h-8 min-w-0 flex-1 bg-transparent text-xs outline-none"
          aria-label={t('Search Main Slides and Sections')}
          placeholder={t('Search title, Slide ID or Position')}
          value={query}
          maxLength={200}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <p className="text-[10px] leading-relaxed text-muted-foreground">
        {t('Hover or focus to preview. Click to append; the same slide can appear more than once.')}
      </p>
      <div className="max-h-80 space-y-3 overflow-y-auto overscroll-contain pr-1">
        {!!matchingSections.length && (
          <div className="space-y-1.5">
            <h4 className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {t('Sections')}
            </h4>
            {matchingSections.map((item) => (
              <Button
                key={item.section.id}
                variant="outline"
                size="sm"
                className="h-auto w-full justify-start gap-2 py-2 text-left"
                disabled={disabled || !item.pageIds.length || !!item.diagnostics.length}
                title={item.diagnostics[0]?.message ?? item.section.title}
                data-hd-add-section={item.section.id}
                onClick={() => {
                  onAddSection(item.section.id);
                  setLastAdded(item.section.id);
                }}
              >
                <Layers3 className="size-3.5 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs">{item.section.title}</span>
                  <span className="block text-[10px] font-normal text-muted-foreground">
                    {item.contiguous && item.startPosition !== null
                      ? t('Positions {start}–{end} · {count} slides', {
                          start: item.startPosition,
                          end: item.endPosition ?? item.startPosition,
                          count: item.pageIds.length,
                        })
                      : t('{count} slides', { count: item.pageIds.length })}
                  </span>
                </span>
                {lastAdded === item.section.id ? <Check /> : <Plus />}
              </Button>
            ))}
          </div>
        )}
        <div className="space-y-1.5">
          <h4 className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {t('Main Slides')}
          </h4>
          <TooltipProvider delay={250}>
            {pages.map(({ page, position }) => (
              <SourceSlide
                key={page.pageId}
                page={page}
                position={position}
                snapshot={snapshot}
                added={lastAdded === page.pageId}
                disabled={disabled}
                onAdd={() => {
                  onAddPage(page.pageId);
                  setLastAdded(page.pageId);
                }}
              />
            ))}
          </TooltipProvider>
          {!pages.length && (
            <p className="py-3 text-xs text-muted-foreground">{t('No matching slides.')}</p>
          )}
        </div>
      </div>
    </div>
  );
}
