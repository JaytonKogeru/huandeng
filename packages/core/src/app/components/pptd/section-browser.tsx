import { ArrowDown, ArrowUp, ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { useHuandengLocale } from '@/lib/huandeng-locale';
import type { SlideInsertionBoundary, ThumbnailSection } from '@/lib/pptd-thumbnail-sections';
import {
  workspaceBrowserGroups,
  workspaceMoveBoundary,
  workspacePageSelected,
} from '@/lib/pptd-workspace-views';
import type { PageSize, PageSnapshot } from '../../../pptd/types';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import type { PptdTheme } from './renderer';
import { WorkspaceSlidePreview } from './workspace-views';

export function SectionBrowser({
  pages,
  sections,
  size,
  theme,
  currentPageId,
  currentOccurrenceId,
  presentation,
  disabled,
  onSelect,
  onEdit,
  onMove,
  onManageSections,
}: {
  pages: PageSnapshot[];
  sections: ThumbnailSection[];
  size: PageSize;
  theme: PptdTheme;
  currentPageId: string | null;
  currentOccurrenceId?: string;
  presentation: boolean;
  disabled: boolean;
  onSelect: (pageId: string, occurrenceId?: string) => void;
  onEdit: (pageId: string, occurrenceId?: string) => void;
  onMove: (pageId: string, boundary: SlideInsertionBoundary) => void;
  onManageSections: () => void;
}) {
  const { t } = useHuandengLocale();
  const [query, setQuery] = useState('');
  const [thumbnailSize, setThumbnailSize] = useState('medium');
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const groups = workspaceBrowserGroups(pages, sections, query, presentation, t('Untitled slide'));
  const activeCollapsed = new Set(
    groups.filter((group) => collapsed.has(group.key)).map((group) => group.key),
  );
  const move = (page: PageSnapshot, key: string, direction: -1 | 1) => {
    const boundary = workspaceMoveBoundary(
      pages,
      key,
      direction,
      query,
      activeCollapsed,
      presentation,
    );
    if (!disabled && boundary) onMove(page.pageId, boundary);
  };
  return (
    <section
      className="hd-section-browser"
      data-hd-section-browser
      aria-label={t('Section browser')}
    >
      <div className="hd-browser-controls">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('Search title, Story, Slide ID or Section…')}
          aria-label={t('Search Section browser')}
          data-hd-browser-search
          className="h-8 min-w-32 flex-1"
        />
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          {t('Thumbnail size')}
          <select
            value={thumbnailSize}
            onChange={(event) => setThumbnailSize(event.target.value)}
            className="h-8 rounded border bg-background px-2 text-foreground"
            data-hd-browser-size
          >
            <option value="small">{t('Small')}</option>
            <option value="medium">{t('Medium')}</option>
            <option value="large">{t('Large')}</option>
          </select>
        </label>
        {!presentation && (
          <Button size="xs" variant="outline" onClick={onManageSections}>
            {t('Manage Sections')}
          </Button>
        )}
      </div>
      <p className="px-4 pb-2 text-xs text-muted-foreground" role="status">
        {presentation
          ? t(
              'Presentation order · Pinned versions are read-only. Organize occurrences in Project.',
            )
          : disabled
            ? t('Read-only Slides')
            : query.trim() || activeCollapsed.size
              ? t('Clear search and expand all groups to move Slides.')
              : t('Double-click or press Enter to edit. Move with Alt+Up / Alt+Down.')}
      </p>
      <div className="hd-browser-scroll" data-hd-browser-scroll>
        {!groups.length && (
          <p className="p-8 text-center text-sm text-muted-foreground" data-hd-browser-empty>
            {t(pages.length ? 'No matching Slides.' : 'No Slides in this collection.')}
          </p>
        )}
        {groups.map((group) => {
          const closed = !query.trim() && collapsed.has(group.key);
          return (
            <section key={group.key} className="hd-browser-group" data-hd-browser-group={group.key}>
              <h2>
                <button
                  type="button"
                  className="hd-browser-heading"
                  data-hd-browser-collapse={group.key}
                  aria-expanded={!closed}
                  disabled={!!query.trim()}
                  onClick={() =>
                    setCollapsed((previous) => {
                      const next = new Set(previous);
                      if (next.has(group.key)) next.delete(group.key);
                      else next.add(group.key);
                      return next;
                    })
                  }
                >
                  {closed ? (
                    <ChevronRight className="size-4 shrink-0" />
                  ) : (
                    <ChevronDown className="size-4 shrink-0" />
                  )}
                  <span className="min-w-0 flex-1 break-words">
                    {group.title ?? t(presentation ? 'Presentation Slides' : 'Ungrouped Slides')}
                  </span>
                  <span className="shrink-0 text-xs font-normal text-muted-foreground">
                    {t('{count} slides', {
                      count: query.trim() ? group.entries.length : group.count,
                    })}
                  </span>
                </button>
              </h2>
              {!closed && (
                <div className="hd-browser-grid" data-hd-thumbnail-size={thumbnailSize}>
                  {group.entries.map(({ page, index, key, title }) => {
                    const selected = workspacePageSelected(
                      page,
                      currentPageId,
                      currentOccurrenceId,
                    );
                    return (
                      <article
                        key={key}
                        className="hd-browser-card"
                        data-hd-browser-card={key}
                        data-selected={selected || undefined}
                      >
                        <button
                          type="button"
                          className="hd-browser-slide"
                          data-hd-browser-select={key}
                          aria-pressed={selected}
                          title={title}
                          onClick={() => onSelect(page.pageId, page.occurrenceId)}
                          onDoubleClick={() => onEdit(page.pageId, page.occurrenceId)}
                          onKeyDown={(event) => {
                            if (event.nativeEvent.isComposing) return;
                            if (event.key === 'Enter') {
                              event.preventDefault();
                              event.stopPropagation();
                              onEdit(page.pageId, page.occurrenceId);
                            } else if (
                              event.altKey &&
                              (event.key === 'ArrowUp' || event.key === 'ArrowDown')
                            ) {
                              event.preventDefault();
                              event.stopPropagation();
                              move(page, key, event.key === 'ArrowUp' ? -1 : 1);
                            }
                          }}
                        >
                          <WorkspaceSlidePreview page={page} size={size} theme={theme} />
                          <span className="hd-browser-position">
                            {t('Position {position}', { position: index + 1 })}
                          </span>
                          <span className="hd-browser-title">{title}</span>
                          <span className="hd-browser-id" title={page.pageId}>
                            {t('Slide ID')} {page.shortCode ?? page.pageId}
                          </span>
                          {presentation && (
                            <span className="hd-browser-id">
                              {t('Main Position {position}', {
                                position: page.mainPosition ?? '—',
                              })}
                            </span>
                          )}
                          {page.versionId && (
                            <span className="hd-browser-id" title={page.versionId}>
                              {t('Pinned version · read-only')}
                            </span>
                          )}
                        </button>
                        {!presentation && (
                          <div className="hd-browser-moves">
                            {([-1, 1] as const).map((direction) => (
                              <Button
                                key={direction}
                                variant="ghost"
                                size="icon-xs"
                                aria-label={t(direction < 0 ? 'Move Slide up' : 'Move Slide down')}
                                title={t(direction < 0 ? 'Move Slide up' : 'Move Slide down')}
                                data-hd-browser-move={direction < 0 ? 'up' : 'down'}
                                disabled={
                                  disabled ||
                                  !workspaceMoveBoundary(
                                    pages,
                                    key,
                                    direction,
                                    query,
                                    activeCollapsed,
                                    presentation,
                                  )
                                }
                                onClick={() => move(page, key, direction)}
                              >
                                {direction < 0 ? <ArrowUp /> : <ArrowDown />}
                              </Button>
                            ))}
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </section>
  );
}
