import {
  ArrowDown,
  ArrowUp,
  Copy,
  Fingerprint,
  FolderOpen,
  History,
  Plus,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { memo, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { pptdAssetPreviewUrl } from '@/lib/pptd-backend';
import { elementLabel } from '@/lib/pptd-element-label';
import { cycleItemId, focusEditorCanvas } from '@/lib/pptd-keyboard';
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

export function PptdThumbnailRail({
  pages,
  size,
  theme,
  currentPageId,
  currentOccurrenceId,
  disabled,
  tombstones,
  onSelect,
  onAdd,
  onDuplicate,
  onRemove,
  onMove,
  onRestore,
  onHistory,
  onShowFile,
}: {
  pages: PageSnapshot[];
  size: PageSize;
  theme: PptdTheme;
  currentPageId: string | null;
  currentOccurrenceId?: string;
  disabled: boolean;
  tombstones: [string, SlideIdentity][];
  onSelect: (pageId: string, occurrenceId?: string, focusTarget?: 'canvas' | 'thumbnails') => void;
  onAdd: () => void;
  onDuplicate: (pageId: string) => void;
  onRemove: (pageId: string) => void;
  onMove: (pageId: string, afterPageId: string | null) => void;
  onRestore: (pageId: string) => void;
  onHistory: (pageId: string) => void;
  onShowFile: (pageId: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [copyStatus, setCopyStatus] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const focusedOccurrence = useRef<string | null>(null);
  const [visible, setVisible] = useState<Set<string>>(() => new Set());
  const keys = pages.map((page) => page.occurrenceId ?? page.pageId).join(',');
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
  }, [keys, query]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: Reordering and clearing search can move the selected node without changing its identity.
  useLayoutEffect(() => {
    const root = scrollRef.current;
    if (!root) return;
    const current = root.querySelector<HTMLElement>(
      `[data-hd-thumbnail-preview="${CSS.escape(currentOccurrenceId ?? currentPageId ?? '')}"]`,
    );
    current?.scrollIntoView({ block: 'nearest', behavior: 'instant' });
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
  }, [currentPageId, currentOccurrenceId, keys, query]);
  const isCurrent = (page: PageSnapshot) =>
    currentOccurrenceId ? page.occurrenceId === currentOccurrenceId : page.pageId === currentPageId;
  const currentIndex = pages.findIndex(isCurrent);
  const entries = pages.flatMap((page, index) => {
    const title = page.data.elements.find((element) => element.elementType === 'text');
    const name = title ? elementLabel(title) : '空白页';
    if (
      query &&
      !`${page.metadata.label ?? ''} ${page.shortCode ?? ''} ${name}`
        .toLowerCase()
        .includes(query.toLowerCase())
    )
      return [];
    return [{ page, index, name, key: page.occurrenceId ?? page.pageId }];
  });
  const tabStop = entries.find(({ page }) => isCurrent(page))?.key ?? entries[0]?.key;
  return (
    <nav className="flex min-h-0 flex-1 flex-col bg-sidebar" aria-label="页面列表">
      <div className="flex h-11 shrink-0 items-center gap-1 border-b border-border px-3">
        <span className="mr-auto text-xs font-medium">
          页面 <span className="ml-1 text-muted-foreground">{pages.length}</span>
        </span>
        <Button
          size="icon-xs"
          variant="ghost"
          aria-label="新增页面"
          title="新增页面"
          disabled={disabled}
          onClick={onAdd}
        >
          <Plus />
        </Button>
        <Button
          size="icon-xs"
          variant="ghost"
          aria-label="复制页面"
          title="复制页面"
          disabled={disabled || !currentPageId}
          onClick={() => currentPageId && onDuplicate(currentPageId)}
        >
          <Copy />
        </Button>
      </div>
      <div className="px-3 py-2">
        <Input
          aria-label="搜索页面编号或标题"
          placeholder="短码、标题或旧编号…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="h-7 bg-background text-xs"
        />
      </div>
      <p className="sr-only" role="status">
        {copyStatus}
      </p>
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 pb-5"
        data-hd-thumbnail-scroll
      >
        {entries.map(({ page, index, name, key }) => {
          return (
            <ContextMenu key={page.occurrenceId ?? page.pageId}>
              <ContextMenuTrigger
                render={
                  <button
                    type="button"
                    data-hd-thumbnail={page.pageId}
                    data-hd-thumbnail-key={key}
                    tabIndex={tabStop === key ? 0 : -1}
                    onFocus={() => {
                      focusedOccurrence.current = key;
                    }}
                    onBlur={(event) => {
                      if (event.relatedTarget && !scrollRef.current?.contains(event.relatedTarget))
                        focusedOccurrence.current = null;
                    }}
                    aria-label={`第 ${index + 1} 页 · ${page.shortCode ?? page.metadata.label ?? ''} · ${name}`}
                    aria-pressed={isCurrent(page)}
                    className={cn(
                      'block w-full rounded-md p-1.5 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand/50',
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
                    onDragStart={(event) =>
                      event.dataTransfer.setData('application/huandeng-page', page.pageId)
                    }
                    onDragOver={(event) => {
                      if (
                        !disabled &&
                        event.dataTransfer.types.includes('application/huandeng-page')
                      )
                        event.preventDefault();
                    }}
                    onDrop={(event) => {
                      if (disabled) return;
                      event.preventDefault();
                      const id = event.dataTransfer.getData('application/huandeng-page');
                      if (id && id !== page.pageId) onMove(id, page.pageId);
                    }}
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
                    <div className="mt-2 flex min-w-0 items-center gap-1.5 text-[10px]">
                      <span
                        className="font-mono text-muted-foreground"
                        title="当前页序；重新排序后会改变"
                      >
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <span
                        className="font-mono font-semibold tracking-wider"
                        title={`页面短码：${page.shortCode ?? ''}\n永久 ID：${page.pageId}\n旧编号：${page.metadata.label ?? '无'}`}
                      >
                        {page.shortCode ?? page.metadata.label ?? '未编号'}
                      </span>
                      <span className="truncate text-muted-foreground">{name}</span>
                      {page.versionId && (
                        <span title="固定的页面版本" className="text-brand">
                          固定
                        </span>
                      )}
                    </div>
                  </button>
                }
              />
              <ContextMenuContent className="min-w-48">
                <ContextMenuItem onClick={() => onHistory(page.pageId)}>
                  <History />
                  查看历史版本
                </ContextMenuItem>
                <ContextMenuItem onClick={() => onShowFile(page.pageId)}>
                  <FolderOpen />
                  在项目文件中显示
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
                  复制页面短码
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem disabled={disabled} onClick={() => onDuplicate(page.pageId)}>
                  <Copy />
                  复制页面
                </ContextMenuItem>
                <ContextMenuItem
                  disabled={disabled}
                  variant="destructive"
                  onClick={() => onRemove(page.pageId)}
                >
                  <Trash2 />
                  移除页面
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          );
        })}
        {tombstones.length > 0 && (
          <details className="border-t pt-3 text-xs text-muted-foreground">
            <summary className="cursor-pointer">已移除的页面 · {tombstones.length}</summary>
            <div className="mt-2 space-y-1">
              {tombstones.map(([id, item]) => (
                <div key={id} className="flex items-center justify-between gap-1 rounded px-1 py-1">
                  <span className="truncate font-mono">{item.shortCode ?? item.path}</span>
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    aria-label={`恢复 ${item.shortCode ?? id}`}
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
          aria-label="页面上移"
          disabled={disabled || currentIndex < 1}
          onClick={() => {
            if (currentPageId)
              onMove(currentPageId, currentIndex > 1 ? pages[currentIndex - 2].pageId : null);
          }}
        >
          <ArrowUp />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="页面下移"
          disabled={disabled || currentIndex < 0 || currentIndex >= pages.length - 1}
          onClick={() => {
            if (currentPageId) onMove(currentPageId, pages[currentIndex + 1].pageId);
          }}
        >
          <ArrowDown />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="移除当前页面"
          title="移除当前页面（可恢复）"
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
