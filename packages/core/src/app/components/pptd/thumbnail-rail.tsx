import {
  ArrowDown,
  ArrowUp,
  Copy,
  FolderOpen,
  History,
  Plus,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
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
import { layerTitle } from './inspector';
import { PptdPageRenderer, type PptdTheme } from './renderer';

export function PptdThumbnailRail({
  pages,
  size,
  theme,
  currentPageId,
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
  disabled: boolean;
  tombstones: [string, SlideIdentity][];
  onSelect: (pageId: string) => void;
  onAdd: () => void;
  onDuplicate: (pageId: string) => void;
  onRemove: (pageId: string) => void;
  onMove: (pageId: string, afterPageId: string | null) => void;
  onRestore: (pageId: string) => void;
  onHistory: (pageId: string) => void;
  onShowFile: (pageId: string) => void;
}) {
  const [query, setQuery] = useState('');
  const currentIndex = pages.findIndex((page) => page.pageId === currentPageId);
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
          aria-label="搜索页面短码或标题"
          placeholder="查找短码或标题…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="h-7 bg-background text-xs"
        />
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 pb-5">
        {pages.map((page, index) => {
          const title = page.data.elements.find((element) => element.elementType === 'text');
          const name = title ? layerTitle(title) : '空白页';
          if (query && !`${page.shortCode} ${name}`.toLowerCase().includes(query.toLowerCase()))
            return null;
          return (
            <ContextMenu key={page.pageId}>
              <ContextMenuTrigger
                render={
                  <button
                    type="button"
                    data-hd-thumbnail={page.pageId}
                    aria-label={`第 ${index + 1} 页 ${page.shortCode ?? ''} ${name}`}
                    aria-pressed={page.pageId === currentPageId}
                    className={cn(
                      'block w-full rounded-md p-1.5 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand/50',
                      page.pageId === currentPageId
                        ? 'bg-brand-soft ring-1 ring-brand/50'
                        : 'hover:bg-muted',
                    )}
                    onClick={() => onSelect(page.pageId)}
                    onContextMenu={() => onSelect(page.pageId)}
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
                      event.preventDefault();
                      const id = event.dataTransfer.getData('application/huandeng-page');
                      if (id && id !== page.pageId) onMove(id, page.pageId);
                    }}
                  >
                    <div
                      className="pointer-events-none overflow-hidden rounded-sm border border-foreground/10"
                      style={{ width: '100%', aspectRatio: `${size[0]} / ${size[1]}` }}
                    >
                      <SlideCanvas width={size[0]} height={size[1]} flat freezeMotion>
                        <PptdPageRenderer page={page} size={size} theme={theme} />
                      </SlideCanvas>
                    </div>
                    <div className="mt-2 flex min-w-0 items-center gap-1.5 text-[10px]">
                      <span className="font-mono text-muted-foreground">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <span className="font-mono font-semibold tracking-wider">
                        {page.shortCode ?? '未编号'}
                      </span>
                      <span className="truncate text-muted-foreground">{name}</span>
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
