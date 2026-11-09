import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  Copy,
  Eye,
  EyeOff,
  Fingerprint,
  FolderOpen,
  FolderPlus,
  History,
  ListTree,
  MoreHorizontal,
  Plus,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { type DragEvent, memo, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { uiText as t, useHuandengLocale } from '@/lib/huandeng-locale';
import { pptdAssetPreviewUrl } from '@/lib/pptd-backend';
import { cycleItemId, focusEditorCanvas } from '@/lib/pptd-keyboard';
import { outlineSlideSearch, outlineSlideSummary } from '@/lib/pptd-outline';
import {
  type SlideInsertionBoundary,
  slideInsertionBoundary,
  type ThumbnailSection,
  thumbnailRailEntries,
  thumbnailSectionGroups,
} from '@/lib/pptd-thumbnail-sections';
import { cn } from '@/lib/utils';
import type { PageSize, PageSnapshot, SlideIdentity } from '../../../pptd/types';
import { SlideCanvas } from '../slide-canvas';
import { Button } from '../ui/button';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '../ui/context-menu';
import { Input } from '../ui/input';
import { PptdPageRenderer, type PptdTheme } from './renderer';

const ThumbnailPreview = memo(function ThumbnailPreview({
  page,
  size,
  theme,
}: {
  page: PageSnapshot;
  size: PageSize;
  theme: PptdTheme;
}) {
  return (
    <div data-hd-preview-mounted={page.occurrenceId ?? page.pageId} className="size-full">
      <SlideCanvas width={size[0]} height={size[1]} flat freezeMotion>
        <PptdPageRenderer page={page} size={size} theme={theme} assetUrl={pptdAssetPreviewUrl} />
      </SlideCanvas>
    </div>
  );
});

function SlideInsertionGap({
  boundary,
  position,
  disabled,
  onInsert,
  onCreateSection,
  onDragOver,
  onDrop,
  active,
}: {
  boundary: SlideInsertionBoundary;
  position: number;
  disabled: boolean;
  onInsert: (boundary: SlideInsertionBoundary) => void;
  onCreateSection?: (boundary: SlideInsertionBoundary) => void;
  onDragOver: (event: DragEvent<HTMLElement>, boundary: SlideInsertionBoundary) => void;
  onDrop: (event: DragEvent<HTMLElement>, boundary: SlideInsertionBoundary) => void;
  active: boolean;
}) {
  useHuandengLocale();
  return (
    <ContextMenu>
      <ContextMenuTrigger
        render={
          <button
            type="button"
            className="group relative flex h-1.5 w-full items-center gap-2 rounded px-1 text-muted-foreground outline-none hover:text-brand focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-brand/50 disabled:pointer-events-none disabled:opacity-30"
            disabled={disabled}
            aria-label={t('Insert blank slide at Position {position}', { position })}
            title={t('Insert blank slide here')}
            data-hd-insert-before={boundary.beforePageId ?? ''}
            data-hd-insert-after={boundary.afterPageId ?? ''}
            data-hd-drop-active={active || undefined}
            style={
              active ? { color: 'var(--brand)', backgroundColor: 'var(--brand-soft)' } : undefined
            }
            onClick={() => onInsert(boundary)}
            onDragOver={(event) => onDragOver(event, boundary)}
            onDrop={(event) => onDrop(event, boundary)}
          />
        }
      >
        <span
          className={cn(
            'h-px flex-1 bg-current group-hover:opacity-70 group-focus-visible:opacity-70',
            active ? 'opacity-100' : 'opacity-0',
          )}
        />
        <Plus className="size-3.5 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100" />
        <span
          className={cn(
            'h-px flex-1 bg-current group-hover:opacity-70 group-focus-visible:opacity-70',
            active ? 'opacity-100' : 'opacity-0',
          )}
        />
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem disabled={disabled} onClick={() => onInsert(boundary)}>
          <Plus />
          {t('Insert blank slide here')}
        </ContextMenuItem>
        {onCreateSection && (
          <ContextMenuItem disabled={disabled} onClick={() => onCreateSection(boundary)}>
            <FolderPlus />
            {t('Create Section here')}
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}

export function PptdThumbnailRail({
  pages,
  sections = [],
  size,
  theme,
  currentPageId,
  currentOccurrenceId,
  disabled,
  tombstones,
  onSelect,
  onAdd,
  onInsert,
  onCreateSection,
  onDuplicate,
  onRemove,
  onMove,
  onRestore,
  onHistory,
  onShowFile,
  onVisibility,
  onEditSection,
  onManageSections,
}: {
  pages: PageSnapshot[];
  sections?: ThumbnailSection[];
  size: PageSize;
  theme: PptdTheme;
  currentPageId: string | null;
  currentOccurrenceId?: string;
  disabled: boolean;
  tombstones: [string, SlideIdentity][];
  onSelect: (pageId: string, occurrenceId?: string, focusTarget?: 'canvas' | 'thumbnails') => void;
  onAdd: () => void;
  onInsert?: (boundary: SlideInsertionBoundary) => void;
  onCreateSection?: (boundary: SlideInsertionBoundary) => void;
  onDuplicate: (pageId: string) => void;
  onRemove: (pageId: string) => void;
  onMove: (pageId: string, boundary: SlideInsertionBoundary) => void;
  onRestore: (pageId: string) => void;
  onHistory: (pageId: string) => void;
  onShowFile: (pageId: string) => void;
  onVisibility?: (pageId: string, hidden: boolean) => void;
  onEditSection?: (sectionId: string) => void;
  onManageSections?: () => void;
}) {
  useHuandengLocale();
  const [query, setQuery] = useState('');
  const [view, setView] = useState<'thumbnails' | 'outline'>('thumbnails');
  const [copyStatus, setCopyStatus] = useState('');
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  const collapseAnchor = useRef<{ key: string; top: number; scrollTop: number } | null>(null);
  const drag = useRef<{ pageId: string; y: number; frame: number | null } | null>(null);
  const [dropBoundary, setDropBoundary] = useState<SlideInsertionBoundary | null>(null);
  const focusedOccurrence = useRef<string | null>(null);
  const [visible, setVisible] = useState<Set<string>>(() => new Set());
  const groups = thumbnailSectionGroups(pages, sections);
  const entries = thumbnailRailEntries(
    pages,
    groups,
    collapsed,
    query,
    view === 'outline' ? outlineSlideSearch : undefined,
  );
  const searching = !!query.trim();
  const keys = entries.map((entry) => entry.key).join(',');
  const order = pages.map((page) => page.occurrenceId ?? page.pageId).join(',');
  const setSectionCollapsed = (key: string, closed: boolean) => {
    if (collapsed.has(key) === closed) return;
    const root = scrollRef.current;
    const heading = root?.querySelector<HTMLElement>(
      `[data-hd-section-toggle="${CSS.escape(key)}"]`,
    );
    if (root && heading)
      collapseAnchor.current = {
        key,
        top: heading.getBoundingClientRect().top,
        scrollTop: root.scrollTop,
      };
    setCollapsed((previous) => {
      const next = new Set(previous);
      if (closed) next.add(key);
      else next.delete(key);
      return next;
    });
  };
  useLayoutEffect(() => {
    void collapsed;
    const anchor = collapseAnchor.current;
    const root = scrollRef.current;
    collapseAnchor.current = null;
    if (!anchor || !root) return;
    const heading = root.querySelector<HTMLElement>(
      `[data-hd-section-toggle="${CSS.escape(anchor.key)}"]`,
    );
    root.scrollTop = heading
      ? root.scrollTop + heading.getBoundingClientRect().top - anchor.top
      : anchor.scrollTop;
  }, [collapsed]);
  const stopDragging = () => {
    if (drag.current?.frame !== null && drag.current?.frame !== undefined)
      cancelAnimationFrame(drag.current.frame);
    drag.current = null;
    setDropBoundary(null);
  };
  useEffect(
    () => () => {
      if (drag.current?.frame !== null && drag.current?.frame !== undefined)
        cancelAnimationFrame(drag.current.frame);
    },
    [],
  );
  const scrollDuringDrag = () => {
    const current = drag.current;
    const root = scrollRef.current;
    if (!current || !root) return;
    const rect = root.getBoundingClientRect();
    const edge = 48;
    const speed =
      current.y < rect.top + edge
        ? -Math.min(16, (rect.top + edge - current.y) / 3)
        : current.y > rect.bottom - edge
          ? Math.min(16, (current.y - rect.bottom + edge) / 3)
          : 0;
    if (speed) root.scrollTop += speed;
    current.frame = requestAnimationFrame(scrollDuringDrag);
  };
  const sameBoundary = (boundary: SlideInsertionBoundary) =>
    dropBoundary?.afterPageId === boundary.afterPageId &&
    dropBoundary.beforePageId === boundary.beforePageId;
  const dragOver = (event: DragEvent<HTMLElement>, boundary: SlideInsertionBoundary) => {
    if (disabled || !event.dataTransfer.types.includes('application/huandeng-page')) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    if (drag.current) drag.current.y = event.clientY;
    if (!sameBoundary(boundary)) setDropBoundary(boundary);
  };
  const drop = (event: DragEvent<HTMLElement>, boundary: SlideInsertionBoundary) => {
    if (disabled || !event.dataTransfer.types.includes('application/huandeng-page')) return;
    event.preventDefault();
    event.stopPropagation();
    const id = event.dataTransfer.getData('application/huandeng-page');
    stopDragging();
    if (id) onMove(id, boundary);
  };
  // biome-ignore lint/correctness/useExhaustiveDependencies: Search and page order replace the observed DOM nodes without changing the scroll root.
  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      (entries) => {
        setVisible((previous) => {
          const next = new Set(previous);
          let changed = false;
          for (const entry of entries) {
            const id = (entry.target as HTMLElement).dataset.hdThumbnailPreview;
            if (!id || next.has(id) === entry.isIntersecting) continue;
            changed = true;
            if (entry.isIntersecting) next.add(id);
            else next.delete(id);
          }
          return changed ? next : previous;
        });
      },
      { root, rootMargin: '240px 0px' },
    );
    for (const element of root.querySelectorAll('[data-hd-thumbnail-preview]'))
      observer.observe(element);
    return () => observer.disconnect();
  }, [keys, query, view]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: Follow new selections, page order and search, but never a Section fold.
  useLayoutEffect(() => {
    const root = scrollRef.current;
    if (!root) return;
    const current = root.querySelector<HTMLElement>(
      `[data-hd-thumbnail-preview="${CSS.escape(currentOccurrenceId ?? currentPageId ?? '')}"]`,
    );
    current?.scrollIntoView({ block: 'nearest', behavior: 'instant' });
  }, [currentPageId, currentOccurrenceId, order, query, view]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: Folding can remove a focused thumbnail without changing the selection.
  useLayoutEffect(() => {
    const root = scrollRef.current;
    if (!root) return;
    if (
      focusedOccurrence.current &&
      !root.querySelector(`[data-hd-thumbnail-key="${CSS.escape(focusedOccurrence.current)}"]`)
    ) {
      focusedOccurrence.current = null;
      if (document.activeElement === document.body && document.hasFocus())
        root
          .querySelector<HTMLElement>('[data-hd-thumbnail][tabindex="0"]')
          ?.focus({ preventScroll: true });
    }
  }, [keys]);
  const isCurrent = (page: PageSnapshot) =>
    currentOccurrenceId ? page.occurrenceId === currentOccurrenceId : page.pageId === currentPageId;
  const currentIndex = pages.findIndex(isCurrent);
  const currentSection = groups.find((section) => section.pageIds.includes(currentPageId ?? ''));
  const tabStop =
    entries.find(({ page }) => isCurrent(page))?.key ??
    entries.find(({ page }) => page.pageId === currentSection?.pageIds[0])?.key ??
    entries[0]?.key;
  return (
    <nav
      className="flex min-h-0 flex-1 flex-col bg-sidebar"
      aria-label={t('页面列表')}
      data-hd-pages-view={view}
    >
      <div className="flex h-11 shrink-0 items-center gap-1 border-b border-border px-3">
        <span className="mr-auto text-xs font-medium">
          {t('页面 ')}
          <span className="ml-1 text-muted-foreground">{pages.length}</span>
        </span>
        {onManageSections && (
          <Button
            size="icon-xs"
            variant="ghost"
            aria-label={t('Manage Sections')}
            title={t('Manage Sections')}
            onClick={onManageSections}
            data-hd-pages-manage-sections
          >
            <ListTree />
          </Button>
        )}
        <Button
          size="icon-xs"
          variant="ghost"
          aria-label={t('新增页面')}
          title={t('新增页面')}
          disabled={disabled}
          onClick={onAdd}
        >
          <Plus />
        </Button>
        <Button
          size="icon-xs"
          variant="ghost"
          aria-label={t('复制页面')}
          title={t('复制页面')}
          disabled={disabled || !currentPageId}
          onClick={() => currentPageId && onDuplicate(currentPageId)}
        >
          <Copy />
        </Button>
      </div>
      <fieldset
        className="flex shrink-0 gap-1 border-0 border-b px-3 py-1"
        aria-label={t('Pages view')}
      >
        <Button
          size="xs"
          variant={view === 'thumbnails' ? 'secondary' : 'ghost'}
          aria-pressed={view === 'thumbnails'}
          onClick={() => setView('thumbnails')}
          data-hd-pages-thumbnails
        >
          {t('Thumbnails')}
        </Button>
        <Button
          size="xs"
          variant={view === 'outline' ? 'secondary' : 'ghost'}
          aria-pressed={view === 'outline'}
          onClick={() => setView('outline')}
          data-hd-pages-outline
        >
          {t('Outline')}
        </Button>
      </fieldset>
      <div className="px-3 py-2">
        <Input
          aria-label={view === 'outline' ? t('Search the outline') : t('搜索页面编号或标题')}
          placeholder={
            view === 'outline' ? t('Title, Story or Slide ID…') : t('短码、标题或旧编号…')
          }
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="h-7 bg-background text-xs"
        />
      </div>
      <p className="sr-only" role="status">
        {t(copyStatus)}
      </p>
      {/* biome-ignore lint/a11y/useSemanticElements: This scrolling navigation group coordinates native drag events and thumbnail focus. */}
      <div
        ref={scrollRef}
        role="group"
        aria-label={t('Slide thumbnails')}
        className="min-h-0 flex-1 overflow-y-auto px-3 pb-5"
        data-hd-thumbnail-scroll
        style={{ overflowAnchor: 'none' }}
        onDragOver={(event) => {
          if (drag.current) drag.current.y = event.clientY;
        }}
        onDragEnd={stopDragging}
        onDragLeave={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < rect.left ||
            event.clientX > rect.right ||
            event.clientY < rect.top ||
            event.clientY > rect.bottom
          ) {
            if (drag.current) drag.current.y = (rect.top + rect.bottom) / 2;
            setDropBoundary(null);
          }
        }}
      >
        {entries.map(({ page, index, name, key }) => {
          const section = groups.find((group) => group.firstIndex === index);
          const expanded = !section || searching || !collapsed.has(section.key);
          const before = slideInsertionBoundary(pages, index);
          const after = slideInsertionBoundary(
            pages,
            section && !expanded ? section.lastIndex + 1 : index + 1,
          );
          const boundaryAtPointer = (event: DragEvent<HTMLElement>) => {
            const rect = event.currentTarget.getBoundingClientRect();
            return event.clientY < rect.top + rect.height / 2 ? before : after;
          };
          const containsCurrent =
            !!section &&
            !expanded &&
            currentPageId !== page.pageId &&
            section.pageIds.includes(currentPageId ?? '');
          return (
            <div key={key}>
              {onInsert && !searching && (
                <SlideInsertionGap
                  boundary={before}
                  position={index + 1}
                  disabled={disabled}
                  onInsert={onInsert}
                  onCreateSection={onCreateSection}
                  onDragOver={dragOver}
                  onDrop={drop}
                  active={sameBoundary(before)}
                />
              )}
              {section && (
                <div className="flex items-center gap-1 pt-1 text-xs" data-hd-section-heading>
                  <button
                    type="button"
                    className={cn(
                      'flex min-w-0 flex-1 items-center gap-1 rounded px-1 py-1 text-left outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-brand/50',
                      containsCurrent && 'text-brand',
                    )}
                    disabled={searching}
                    aria-expanded={expanded}
                    aria-label={t(
                      expanded ? 'Collapse Section {title}' : 'Expand Section {title}',
                      { title: section.title },
                    )}
                    title={
                      searching
                        ? t('Sections expand while searching.')
                        : `${section.title}\n${t('Section ID')}: ${section.id ?? section.key}`
                    }
                    data-hd-section-position={section.sectionPosition ?? undefined}
                    data-hd-section-toggle={section.key}
                    onClick={() => setSectionCollapsed(section.key, expanded)}
                  >
                    {expanded ? (
                      <ChevronDown className="size-3.5 shrink-0" />
                    ) : (
                      <ChevronRight className="size-3.5 shrink-0" />
                    )}
                    {section.sectionPosition !== null && section.sectionPosition !== undefined && (
                      <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                        {t('Section {position}', {
                          position: String(section.sectionPosition).padStart(2, '0'),
                        })}
                      </span>
                    )}
                    <span className="min-w-0 flex-1 truncate font-semibold">{section.title}</span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {section.pageIds.length}
                    </span>
                  </button>
                  {onEditSection && section.id && (
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label={t('Manage Section {title}', { title: section.title })}
                      title={t('Manage Section')}
                      onClick={() => section.id && onEditSection(section.id)}
                      data-hd-section-manage={section.id}
                    >
                      <MoreHorizontal />
                    </Button>
                  )}
                  {containsCurrent && (
                    <span
                      className="text-[9px] text-brand"
                      title={t('The current Slide is in this collapsed Section.')}
                    >
                      {t('Current Slide')}
                    </span>
                  )}
                </div>
              )}
              <ContextMenu>
                <ContextMenuTrigger
                  render={
                    <button
                      type="button"
                      data-hd-thumbnail={page.pageId}
                      data-hd-thumbnail-key={key}
                      data-hd-outline-row={view === 'outline' ? key : undefined}
                      tabIndex={tabStop === key ? 0 : -1}
                      onFocus={() => {
                        focusedOccurrence.current = key;
                      }}
                      onBlur={(event) => {
                        if (
                          event.relatedTarget &&
                          !scrollRef.current?.contains(event.relatedTarget)
                        )
                          focusedOccurrence.current = null;
                      }}
                      aria-label={t('第 {value0} 页 · {value1} · {value2}', {
                        value0: index + 1,
                        value1: page.shortCode ?? page.metadata.label ?? '',
                        value2: name,
                      })}
                      aria-pressed={isCurrent(page)}
                      className={cn(
                        'relative block w-full rounded-md p-1.5 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand/50',
                        isCurrent(page) ? 'bg-brand-soft ring-1 ring-brand/50' : 'hover:bg-muted',
                      )}
                      onClick={() => onSelect(page.pageId, page.occurrenceId)}
                      onKeyDown={(event) => {
                        if (
                          event.nativeEvent.isComposing ||
                          event.keyCode === 229 ||
                          event.ctrlKey ||
                          event.metaKey ||
                          event.altKey
                        )
                          return;
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          onSelect(page.pageId, page.occurrenceId, 'canvas');
                          focusEditorCanvas();
                          return;
                        }
                        if (
                          section &&
                          !searching &&
                          (event.key === 'ArrowLeft' || event.key === 'ArrowRight')
                        ) {
                          event.preventDefault();
                          event.stopPropagation();
                          setSectionCollapsed(section.key, event.key === 'ArrowLeft');
                          return;
                        }
                        const ids = entries.map((entry) => entry.key);
                        const nextId =
                          event.key === 'Home'
                            ? ids[0]
                            : event.key === 'End'
                              ? ids[ids.length - 1]
                              : event.key === 'ArrowUp' || event.key === 'ArrowDown'
                                ? cycleItemId(ids, key, event.key === 'ArrowUp' ? -1 : 1, false)
                                : null;
                        const next = entries.find((entry) => entry.key === nextId);
                        if (!next) return;
                        event.preventDefault();
                        onSelect(next.page.pageId, next.page.occurrenceId);
                        const target = scrollRef.current?.querySelector<HTMLElement>(
                          `[data-hd-thumbnail-key="${CSS.escape(next.key)}"]`,
                        );
                        target?.focus({ preventScroll: true });
                        target?.scrollIntoView({ block: 'nearest' });
                      }}
                      onContextMenu={() => onSelect(page.pageId, page.occurrenceId)}
                      draggable={!disabled}
                      onDragStart={(event) => {
                        event.dataTransfer.setData('application/huandeng-page', page.pageId);
                        event.dataTransfer.effectAllowed = 'move';
                        drag.current = { pageId: page.pageId, y: event.clientY, frame: null };
                        drag.current.frame = requestAnimationFrame(scrollDuringDrag);
                      }}
                      onDragOver={(event) => dragOver(event, boundaryAtPointer(event))}
                      onDrop={(event) => drop(event, boundaryAtPointer(event))}
                    >
                      {sameBoundary(before) && (
                        <span
                          aria-hidden
                          data-hd-drop-before={page.pageId}
                          className="pointer-events-none absolute -top-0.5 left-0 right-0 h-0.5 bg-brand"
                        />
                      )}
                      {sameBoundary(after) && (
                        <span
                          aria-hidden
                          data-hd-drop-after={page.pageId}
                          className="pointer-events-none absolute -bottom-0.5 left-0 right-0 h-0.5 bg-brand"
                        />
                      )}
                      {view === 'outline' ? (
                        <div
                          data-hd-thumbnail-preview={page.occurrenceId ?? page.pageId}
                          className="space-y-1 px-1 py-1"
                        >
                          <span className="block line-clamp-2 text-xs font-medium leading-snug">
                            {name}
                          </span>
                          {outlineSlideSummary(page) && (
                            <span
                              className="block line-clamp-2 text-[11px] leading-snug text-muted-foreground"
                              title={outlineSlideSummary(page)}
                            >
                              {outlineSlideSummary(page)}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div
                          className={
                            section && !expanded && section.pageIds.length > 1
                              ? 'hd-section-stack'
                              : undefined
                          }
                          data-hd-section-stack={section && !expanded ? section.key : undefined}
                        >
                          <div
                            data-hd-thumbnail-preview={page.occurrenceId ?? page.pageId}
                            className="pointer-events-none overflow-hidden rounded-sm border border-foreground/10"
                            style={{ width: '100%', aspectRatio: `${size[0]} / ${size[1]}` }}
                          >
                            {visible.has(page.occurrenceId ?? page.pageId) ? (
                              <ThumbnailPreview page={page} size={size} theme={theme} />
                            ) : (
                              <div
                                className="flex size-full items-center justify-center bg-background text-[10px] text-muted-foreground/60"
                                aria-hidden="true"
                              >
                                {page.shortCode ?? page.metadata.label}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      <div className="mt-2 flex min-w-0 items-center gap-1.5 text-[10px]">
                        <span
                          className="font-mono text-muted-foreground"
                          title={t('当前页序；重新排序后会改变')}
                        >
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <span
                          className="font-mono font-semibold tracking-wider"
                          title={t('页面短码：{value0}\n永久 ID：{value1}\n旧编号：{value2}', {
                            value0: page.shortCode ?? '',
                            value1: page.pageId,
                            value2: page.metadata.label ?? t('无'),
                          })}
                        >
                          {page.shortCode ?? page.metadata.label ?? t('未编号')}
                        </span>
                        {view === 'thumbnails' && (
                          <span className="truncate text-muted-foreground">{name}</span>
                        )}
                        {page.metadata.hidden && (
                          <EyeOff
                            className="ml-auto size-3 shrink-0 text-muted-foreground"
                            aria-label={t('Hidden from presentation')}
                          />
                        )}
                        {page.versionId && (
                          <span title={t('固定的页面版本')} className="text-brand">
                            {t('固定')}
                          </span>
                        )}
                      </div>
                    </button>
                  }
                />
                <ContextMenuContent className="min-w-48">
                  <ContextMenuItem onClick={() => onHistory(page.pageId)}>
                    <History />
                    {t('查看历史版本')}
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => onShowFile(page.pageId)}>
                    <FolderOpen />
                    {t('在项目文件中显示')}
                  </ContextMenuItem>
                  <ContextMenuItem
                    onClick={() => {
                      const code = page.shortCode ?? page.pageId;
                      void navigator.clipboard.writeText(code).then(
                        () => setCopyStatus(`已复制页面短码 ${code}`),
                        () => setCopyStatus('未能写入剪贴板，请重试。'),
                      );
                    }}
                  >
                    <Fingerprint />
                    {t('复制页面短码')}
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  {onVisibility && (
                    <ContextMenuItem
                      disabled={disabled}
                      onClick={() => onVisibility(page.pageId, !page.metadata.hidden)}
                    >
                      {page.metadata.hidden ? <Eye /> : <EyeOff />}
                      {t(page.metadata.hidden ? 'Show slide' : 'Hide slide')}
                    </ContextMenuItem>
                  )}
                  {onInsert && (
                    <>
                      <ContextMenuItem
                        disabled={disabled}
                        onClick={() => onInsert(slideInsertionBoundary(pages, index))}
                      >
                        <Plus />
                        {t('Insert blank slide before')}
                      </ContextMenuItem>
                      <ContextMenuItem
                        disabled={disabled}
                        onClick={() => onInsert(slideInsertionBoundary(pages, index + 1))}
                      >
                        <Plus />
                        {t('Insert blank slide after')}
                      </ContextMenuItem>
                      <ContextMenuSeparator />
                    </>
                  )}
                  <ContextMenuItem disabled={disabled} onClick={() => onDuplicate(page.pageId)}>
                    <Copy />
                    {t('复制页面')}
                  </ContextMenuItem>
                  <ContextMenuItem
                    disabled={disabled}
                    variant="destructive"
                    onClick={() => onRemove(page.pageId)}
                  >
                    <Trash2 />
                    {t('移除页面')}
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            </div>
          );
        })}
        {onInsert && !searching && (
          <SlideInsertionGap
            boundary={slideInsertionBoundary(pages, pages.length)}
            position={pages.length + 1}
            disabled={disabled}
            onInsert={onInsert}
            onCreateSection={onCreateSection}
            onDragOver={dragOver}
            onDrop={drop}
            active={sameBoundary(slideInsertionBoundary(pages, pages.length))}
          />
        )}
        {tombstones.length > 0 && (
          <details className="border-t pt-3 text-xs text-muted-foreground">
            <summary className="cursor-pointer">
              {t('已移除的页面 · {value0}', { value0: tombstones.length })}
            </summary>
            <div className="mt-2 space-y-1">
              {tombstones.map(([id, item]) => (
                <div key={id} className="flex items-center justify-between gap-1 rounded px-1 py-1">
                  <span className="truncate font-mono">{item.shortCode ?? item.path}</span>
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    aria-label={t('恢复 {value0}', { value0: item.shortCode ?? id })}
                    disabled={disabled}
                    onClick={() => onRestore(id)}
                  >
                    <RotateCcw />
                  </Button>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1 border-t px-3 py-2">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t('页面上移')}
          disabled={disabled || currentIndex < 1}
          onClick={() => {
            if (currentPageId)
              onMove(currentPageId, slideInsertionBoundary(pages, currentIndex - 1));
          }}
        >
          <ArrowUp />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t('页面下移')}
          disabled={disabled || currentIndex < 0 || currentIndex >= pages.length - 1}
          onClick={() => {
            if (currentPageId)
              onMove(currentPageId, slideInsertionBoundary(pages, currentIndex + 2));
          }}
        >
          <ArrowDown />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t('移除当前页面')}
          title={t('移除当前页面（可恢复）')}
          className="ml-auto"
          disabled={disabled || !currentPageId}
          onClick={() => currentPageId && onRemove(currentPageId)}
        >
          <Trash2 />
        </Button>
      </div>
    </nav>
  );
}
