import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  Circle,
  Copy,
  Download,
  FilePlus2,
  Files,
  FileText,
  FolderOpen,
  History,
  ImagePlus,
  Loader2,
  Maximize2,
  Minus,
  PanelsTopLeft,
  Play,
  Plus,
  Redo2,
  RefreshCw,
  Save,
  Square,
  Type,
  Undo2,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DesignIntentPanel } from '@/components/pptd/design-intent-panel';
import { alignedBounds, PptdEditorCanvas } from '@/components/pptd/editor-canvas';
import { PptdInspector } from '@/components/pptd/inspector';
import { PageHistoryDialog } from '@/components/pptd/page-history-dialog';
import { PptdProjectTree } from '@/components/pptd/project-tree';
import { RecipePanel } from '@/components/pptd/recipe-panel';
import { PptdPageRenderer, type PptdTheme } from '@/components/pptd/renderer';
import { PptdThumbnailRail } from '@/components/pptd/thumbnail-rail';
import { SlideCanvas } from '@/components/slide-canvas';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { desktopHost } from '@/lib/huandeng-desktop';
import type { Alignment } from '@/lib/inspector/geometry';
import { isTypingTarget } from '@/lib/keys';
import { draftHasChanges } from '@/lib/pptd-document';
import { useDocumentTitle } from '@/lib/use-document-title';
import { usePptdDocument } from '@/lib/use-pptd-document';
import type { PptdElement, PptdOperation } from '../../pptd/types';

export function HuandengEditor() {
  const { client, backend, state } = usePptdDocument();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [scale, setScale] = useState<number | undefined>();
  const [actualScale, setActualScale] = useState(1);
  const [notesOpen, setNotesOpen] = useState(true);
  const [presenting, setPresenting] = useState(false);
  const [presenterNotesOpen, setPresenterNotesOpen] = useState(false);
  const [imageDialog, setImageDialog] = useState(false);
  const [imagePath, setImagePath] = useState('');
  const [historyPageId, setHistoryPageId] = useState<string | null>(null);
  const [leftTab, setLeftTab] = useState<'pages' | 'files'>('pages');
  const [exporting, setExporting] = useState(false);
  const [exportReport, setExportReport] = useState<string | null>(null);
  const [uiError, setUiError] = useState<string | null>(null);
  const snapshot = state.snapshot;
  const requestedId = searchParams.get('page');
  const selectedPageId =
    snapshot?.pages.find(
      (item) =>
        item.pageId === requestedId || item.shortCode?.toLowerCase() === requestedId?.toLowerCase(),
    )?.pageId ??
    (requestedId && state.drafts[requestedId] ? requestedId : (snapshot?.pages[0]?.pageId ?? null));
  const page = selectedPageId ? client.page(selectedPageId) : undefined;
  const theme = useMemo(
    () => (snapshot?.manifest.theme ?? {}) as PptdTheme,
    [snapshot?.manifest.theme],
  );
  const pageIndex = snapshot?.pages.findIndex((item) => item.pageId === selectedPageId) ?? -1;
  const selectedElements =
    page?.data.elements.filter((element) => selectedIds.includes(element.elementId)) ?? [];
  const drafts = Object.values(state.drafts).filter(draftHasChanges);
  const conflict = selectedPageId ? state.drafts[selectedPageId]?.conflict : undefined;
  const readonly = !snapshot?.writable;
  const busy = state.saving || exporting;
  const nextPage = pageIndex >= 0 ? snapshot?.pages[pageIndex + 1] : undefined;
  const historyPage = snapshot?.pages.find((item) => item.pageId === historyPageId);

  useDocumentTitle(snapshot ? `${snapshot.title} · HUANDENG Editor` : 'HUANDENG Editor');

  const run = useCallback(async (task: () => Promise<unknown>) => {
    setUiError(null);
    try {
      await task();
    } catch (error) {
      setUiError(error instanceof Error ? error.message : String(error));
    }
  }, []);

  const selectPage = useCallback(
    (id: string) => {
      setSelectedIds([]);
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          next.set('page', id);
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  useEffect(() => {
    if (!page) return;
    setSelectedIds((ids) => {
      const next = ids.filter((id) =>
        page.data.elements.some((element) => element.elementId === id),
      );
      return next.length === ids.length ? ids : next;
    });
  }, [page]);

  useEffect(() => {
    if (!snapshot) return;
    void backend.selection(selectedPageId, selectedIds, client.clientId).catch(() => {});
  }, [backend, client.clientId, selectedPageId, selectedIds, snapshot]);

  const apply = useCallback(
    (operations: PptdOperation[]) =>
      run(async () => {
        const result = await client.apply(operations);
        if (result.createdPages[0]) selectPage(result.createdPages[0].pageId);
      }),
    [client, run, selectPage],
  );

  const removeElements = useCallback(() => {
    if (!selectedPageId || !selectedIds.length) return;
    void apply(
      selectedIds.map((elementId) => ({ op: 'element.remove', pageId: selectedPageId, elementId })),
    );
  }, [apply, selectedPageId, selectedIds]);

  const addElement = (
    type: 'text' | 'shape' | 'line' | 'image',
    extra: Partial<PptdElement> = {},
  ) => {
    if (!page || !snapshot) return;
    const elementId = `node-${crypto.randomUUID()}`;
    const element: PptdElement = {
      elementId,
      elementType: type,
      bounds:
        type === 'text'
          ? [64, 64, Math.min(480, snapshot.size[0] - 128), 56]
          : type === 'line'
            ? [100, 200, 280, 1]
            : [100, 120, 280, 180],
      ...(type === 'text'
        ? { content: { text: '双击编辑文字', fontSize: 28, fontFamily: 'Arial', color: '#263531' } }
        : {}),
      ...(type === 'shape'
        ? {
            shapeName: 'rect',
            fill: { type: 'solid', color: '#dbe5df' },
            border: { width: 1, color: '#668374' },
          }
        : {}),
      ...(type === 'line'
        ? { viewBox: [280, 1], points: '0,0.5 280,0.5', border: { width: 2, color: '#394d43' } }
        : {}),
      ...(type === 'image' ? { fit: { mode: 'contain' } } : {}),
      ...extra,
    };
    void run(async () => {
      await client.apply([{ op: 'element.add', pageId: page.pageId, element }]);
      setSelectedIds([elementId]);
    });
  };

  const align = (alignment: Alignment) => {
    if (!page || !snapshot || !selectedElements.length) return;
    client.beginInteraction(page.pageId);
    for (const item of alignedBounds(selectedElements, alignment, snapshot.size))
      client.patchElement(page.pageId, item.elementId, { bounds: item.bounds }, false);
    void run(() => client.endInteraction(page.pageId));
  };

  const layer = (direction: 'front' | 'back') => {
    if (!page) return;
    const ids = page.data.elements.map((element) => element.elementId);
    const selected = ids.filter((id) => selectedIds.includes(id));
    const rest = ids.filter((id) => !selectedIds.includes(id));
    void apply([
      {
        op: 'element.reorder',
        pageId: page.pageId,
        elementIds: direction === 'front' ? [...rest, ...selected] : [...selected, ...rest],
      },
    ]);
  };

  const stepPage = useCallback(
    (delta: number) => {
      if (!snapshot?.pages.length) return;
      const next = Math.max(0, Math.min(snapshot.pages.length - 1, pageIndex + delta));
      selectPage(snapshot.pages[next].pageId);
    },
    [snapshot, pageIndex, selectPage],
  );

  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (event.isComposing || event.keyCode === 229) return;
      const control = event.ctrlKey || event.metaKey;
      if (control && event.key.toLowerCase() === 's') {
        event.preventDefault();
        void run(() => client.flushAll());
        return;
      }
      if ((event.target as Element)?.closest('[role="dialog"], [role="menu"]')) return;
      if (event.key === 'F5' && page) {
        event.preventDefault();
        void run(async () => {
          await client.flushAll();
          if (!event.shiftKey && snapshot?.pages[0]) selectPage(snapshot.pages[0].pageId);
          setPresenterNotesOpen(false);
          setPresenting(true);
        });
        return;
      }
      if (isTypingTarget(event.target)) return;
      if (event.key === 'Escape') {
        setPresenting(false);
        setSelectedIds([]);
        return;
      }
      if (presenting) {
        if (event.key === ' ' && (event.target as Element)?.closest('button')) return;
        if (['ArrowRight', 'ArrowDown', ' ', 'PageDown'].includes(event.key)) {
          event.preventDefault();
          stepPage(1);
        }
        if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(event.key)) {
          event.preventDefault();
          stepPage(-1);
        }
        return;
      }
      if (readonly || busy) return;
      const railPageId = (event.target as Element)
        ?.closest('[data-hd-thumbnail]')
        ?.getAttribute('data-hd-thumbnail');
      if (control && event.key.toLowerCase() === 'm') {
        event.preventDefault();
        void apply([{ op: 'page.add', afterPageId: selectedPageId }]);
        return;
      }
      if (control && event.key.toLowerCase() === 'd') {
        event.preventDefault();
        if (railPageId || !selectedElements.length) {
          const pageId = railPageId ?? selectedPageId;
          if (pageId) void apply([{ op: 'page.duplicate', pageId }]);
        } else if (page) {
          const copies = selectedElements.map((element) => {
            const copy = structuredClone(element);
            copy.elementId = `node-${crypto.randomUUID()}`;
            if (copy.bounds)
              copy.bounds = [
                copy.bounds[0] + 16,
                copy.bounds[1] + 16,
                copy.bounds[2],
                copy.bounds[3],
              ];
            return copy;
          });
          void run(async () => {
            await client.apply(
              copies.map((element) => ({ op: 'element.add', pageId: page.pageId, element })),
            );
            setSelectedIds(copies.map((element) => element.elementId));
          });
        }
        return;
      }
      if (railPageId && (event.key === 'Delete' || event.key === 'Backspace')) {
        event.preventDefault();
        void apply([{ op: 'page.remove', pageId: railPageId }]);
        return;
      }
      if (control && (event.key.toLowerCase() === 'z' || event.key.toLowerCase() === 'y')) {
        event.preventDefault();
        void run(() =>
          client.history(event.shiftKey || event.key.toLowerCase() === 'y' ? 'redo' : 'undo'),
        );
        return;
      }
      if ((event.target as Element)?.closest('button, select, [role="dialog"]')) return;
      if (control && event.key.toLowerCase() === 'a' && page) {
        event.preventDefault();
        setSelectedIds(page.data.elements.map((element) => element.elementId));
        return;
      }
      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        removeElements();
        return;
      }
      if (
        page &&
        selectedElements.length &&
        ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)
      ) {
        event.preventDefault();
        const step = event.shiftKey ? 10 : 1;
        for (const element of selectedElements) {
          if (!element.bounds) continue;
          const [x, y, width, height] = element.bounds;
          client.patchElement(page.pageId, element.elementId, {
            bounds: [
              x + (event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0),
              y + (event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0),
              width,
              height,
            ],
          });
        }
      } else if (event.key === 'PageDown') {
        event.preventDefault();
        stepPage(1);
      } else if (event.key === 'PageUp') {
        event.preventDefault();
        stepPage(-1);
      }
    };
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, [
    apply,
    busy,
    client,
    page,
    presenting,
    readonly,
    removeElements,
    run,
    selectedElements,
    selectedPageId,
    selectPage,
    snapshot,
    stepPage,
  ]);

  const exportDeck = (format: 'pptx' | 'pdf') =>
    void run(async () => {
      await client.flushAll();
      setExporting(true);
      try {
        const result = await backend.export(format);
        const link = document.createElement('a');
        link.href = result.url;
        link.download = result.fileName;
        link.click();
        setExportReport(result.reportUrl);
      } finally {
        setExporting(false);
      }
    });

  const copyDraft = () =>
    void run(async () => {
      if (!selectedPageId) return;
      const draft = state.drafts[selectedPageId];
      if (!draft) return;
      await navigator.clipboard.writeText(
        JSON.stringify(
          {
            pageId: selectedPageId,
            baseRevision: draft.base.pageRevision,
            fields: draft.fields,
            notes: draft.notes,
          },
          null,
          2,
        ),
      );
    });

  if (!snapshot)
    return (
      <div className="grid min-h-dvh place-items-center bg-canvas p-8">
        <div className="w-full max-w-xl rounded-lg border bg-background p-9 shadow-floating">
          <div className="mb-7 flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-md bg-brand font-serif text-2xl text-white">
              H
            </span>
            <div>
              <h1 className="text-lg font-semibold">HUANDENG Editor</h1>
              <p className="text-xs text-muted-foreground">独立页面 · 自由编辑 · 持续演进</p>
            </div>
          </div>
          {state.loading ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              正在连接本地项目…
            </p>
          ) : (
            <>
              <h2 className="mb-3 text-xl font-medium">打开一个 PPTD 项目</h2>
              <p className="mb-5 text-sm leading-relaxed text-muted-foreground">
                {desktopHost()
                  ? '选择项目中的 .pptd 文件，或者新建一个空白项目。'
                  : '这是浏览器开发预览。日常使用请启动桌面版 HUANDENG Editor，或从终端连接已有项目。'}
              </p>
              {!desktopHost() && (
                <pre className="overflow-x-auto rounded-md border bg-muted/50 p-4 text-xs">
                  huandeng open /完整路径/deck.pptd
                </pre>
              )}
              {state.error && (
                <p className="mt-4 text-xs text-muted-foreground">{state.error.message}</p>
              )}
              <div className="mt-6 flex gap-2">
                <Button onClick={() => void client.refresh()}>
                  <RefreshCw />
                  重新连接
                </Button>
                {desktopHost() && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => void run(async () => desktopHost()?.openProject())}
                    >
                      <FolderOpen />
                      打开项目
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => void run(async () => desktopHost()?.newProject())}
                    >
                      <FilePlus2 />
                      新建项目
                    </Button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    );

  const status = readonly
    ? '只读模式'
    : state.saving
      ? '正在保存…'
      : drafts.some((draft) => draft.conflict)
        ? '草稿冲突 · 已保留'
        : state.error
          ? '保存需检查'
          : drafts.length
            ? `待保存 · ${drafts.length} 页`
            : '已保存';
  return (
    <div
      className="flex h-dvh min-w-[760px] flex-col overflow-hidden bg-canvas text-foreground"
      data-hd-editor
    >
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background px-4">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={desktopHost() ? '打开项目' : '显示项目文件'}
          title={desktopHost() ? '打开项目 Ctrl+O' : '显示项目文件'}
          onClick={() =>
            void run(async () => {
              await client.flushAll();
              if (desktopHost()) await desktopHost()?.openProject();
              else setLeftTab('files');
            })
          }
        >
          <FolderOpen />
        </Button>
        {desktopHost() && (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="新建项目"
            title="新建项目 Ctrl+N"
            onClick={() =>
              void run(async () => {
                await client.flushAll();
                await desktopHost()?.newProject();
              })
            }
          >
            <FilePlus2 />
          </Button>
        )}
        <div className="flex shrink-0 items-center gap-2">
          <span className="grid size-7 place-items-center rounded bg-brand font-serif text-lg text-white">
            H
          </span>
          <span className="text-xs font-semibold tracking-wide">
            HUANDENG{' '}
            <span className="hidden font-normal text-muted-foreground xl:inline">Editor</span>
          </span>
        </div>
        <span className="h-5 w-px bg-border" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-medium" title={snapshot.entry}>
            {snapshot.title || '未命名演示'}
          </h1>
          <div
            className="flex items-center gap-1.5 text-[10px] text-muted-foreground"
            aria-live="polite"
            data-hd-save-status
          >
            {state.saving ? (
              <Loader2 className="size-2.5 animate-spin" />
            ) : drafts.length || state.error ? (
              <Circle className="size-2.5" />
            ) : (
              <Check className="size-2.5" />
            )}
            {status}
            <span className="mx-1">·</span>
            <span>{state.connected ? 'Agent 接口已连接' : '正在重连'}</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="撤销"
            title="撤销 Ctrl+Z"
            disabled={readonly || busy || !state.undoStack.length}
            onClick={() => void run(() => client.history('undo'))}
          >
            <Undo2 />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="重做"
            title="重做 Ctrl+Shift+Z"
            disabled={readonly || busy || !state.redoStack.length}
            onClick={() => void run(() => client.history('redo'))}
          >
            <Redo2 />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="当前页历史版本"
            title="当前页历史版本"
            disabled={!page}
            onClick={() => setHistoryPageId(selectedPageId)}
          >
            <History />
          </Button>
          <Button
            variant="outline"
            size="sm"
            aria-label="保存"
            disabled={readonly || busy}
            onClick={() => void run(() => client.flushAll())}
          >
            <Save />
            保存
          </Button>
          <span className="mx-1 h-5 w-px bg-border" />
          <Button variant="ghost" size="sm" disabled={busy} onClick={() => exportDeck('pdf')}>
            PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            aria-label="导出 PPTX"
            disabled={busy}
            onClick={() => exportDeck('pptx')}
          >
            {exporting ? <Loader2 className="animate-spin" /> : <Download />}PPTX
          </Button>
          <Button
            variant="default"
            size="sm"
            disabled={!page || busy}
            onClick={() =>
              void run(async () => {
                await client.flushAll();
                setPresenterNotesOpen(false);
                setPresenting(true);
              })
            }
          >
            <Play />
            演示
          </Button>
          <ThemeToggle />
        </div>
      </header>
      {(uiError || state.error) && (
        <div
          className="flex shrink-0 items-start gap-2 border-b border-amber-300/50 bg-amber-50 px-4 py-2 text-xs text-amber-900"
          role="alert"
        >
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
          <span className="flex-1">{uiError || state.error?.message}</span>
          {state.canRetry && (
            <Button
              size="xs"
              variant="outline"
              onClick={() => void run(() => client.retryPending())}
            >
              重试同一次保存
            </Button>
          )}
          <Button
            size="xs"
            variant="ghost"
            onClick={() => {
              setUiError(null);
              void client.refresh();
            }}
          >
            检查最新状态
          </Button>
        </div>
      )}
      <div className="flex min-h-0 flex-1">
        <aside
          className="flex w-56 shrink-0 flex-col border-r border-border bg-sidebar"
          aria-label="项目导航"
        >
          <div className="flex h-10 shrink-0 items-center gap-1 border-b border-border px-2">
            <Button
              variant={leftTab === 'pages' ? 'secondary' : 'ghost'}
              size="xs"
              className="flex-1"
              aria-label="页面缩略图"
              aria-pressed={leftTab === 'pages'}
              onClick={() => setLeftTab('pages')}
            >
              <PanelsTopLeft />
              页面
            </Button>
            <Button
              variant={leftTab === 'files' ? 'secondary' : 'ghost'}
              size="xs"
              className="flex-1"
              aria-label="项目文件树"
              aria-pressed={leftTab === 'files'}
              onClick={() => setLeftTab('files')}
            >
              <Files />
              文件
            </Button>
          </div>
          {leftTab === 'files' ? (
            <PptdProjectTree
              backend={backend}
              snapshot={snapshot}
              currentPageId={selectedPageId}
              onSelectPage={selectPage}
            />
          ) : (
            <PptdThumbnailRail
              pages={snapshot.pages}
              size={snapshot.size}
              theme={theme}
              currentPageId={selectedPageId}
              disabled={readonly || busy}
              tombstones={Object.entries(snapshot.metadata.slides).filter(
                ([, item]) => item.state === 'tombstone',
              )}
              onSelect={selectPage}
              onAdd={() =>
                void apply([
                  {
                    op: 'page.add',
                    afterPageId: selectedPageId,
                    page: { pageType: 'content', elements: [], notes: '' },
                  },
                ])
              }
              onDuplicate={(pageId) => void apply([{ op: 'page.duplicate', pageId }])}
              onRemove={(pageId) => void apply([{ op: 'page.remove', pageId }])}
              onHistory={setHistoryPageId}
              onShowFile={(pageId) => {
                selectPage(pageId);
                setLeftTab('files');
              }}
              onMove={(pageId, afterPageId) =>
                void apply([{ op: 'page.move', pageId, afterPageId }])
              }
              onRestore={(pageId) =>
                void run(async () => {
                  await client.apply([{ op: 'page.restore', pageId, afterPageId: selectedPageId }]);
                  selectPage(pageId);
                })
              }
            />
          )}
        </aside>
        <main className="flex min-w-0 flex-1 flex-col">
          <div className="flex h-11 shrink-0 items-center gap-1 border-b border-border bg-background px-3">
            <Button
              variant="ghost"
              size="sm"
              aria-label="添加文本"
              disabled={readonly || busy || !page}
              onClick={() => addElement('text')}
            >
              <Type />
              文字
            </Button>
            <Button
              variant="ghost"
              size="sm"
              aria-label="添加图片"
              disabled={readonly || busy || !page}
              onClick={() => setImageDialog(true)}
            >
              <ImagePlus />
              图片
            </Button>
            <Button
              variant="ghost"
              size="sm"
              aria-label="添加矩形"
              disabled={readonly || busy || !page}
              onClick={() => addElement('shape')}
            >
              <Square />
              形状
            </Button>
            <Button
              variant="ghost"
              size="sm"
              aria-label="添加线条"
              disabled={readonly || busy || !page}
              onClick={() => addElement('line')}
            >
              <Minus />
              线条
            </Button>
            <span
              className="ml-auto truncate font-mono text-[10px] text-muted-foreground"
              title={page ? `${page.path} · ${page.pageId}` : undefined}
            >
              {page?.shortCode ?? ''} {page && `· ${pageIndex + 1} / ${snapshot.pages.length}`}
              {page && <span className="ml-3 hidden xl:inline">{page.path}</span>}
            </span>
          </div>
          {conflict && (
            <div
              className="shrink-0 border-b border-amber-300/50 bg-amber-50 px-4 py-3 text-amber-900"
              data-hd-conflict
            >
              <p className="mb-2 text-xs">{conflict} 自动保存已暂停。</p>
              <div className="flex gap-2">
                <Button size="xs" variant="outline" onClick={copyDraft}>
                  <Copy />
                  复制本地草稿
                </Button>
                <Button
                  size="xs"
                  variant="outline"
                  disabled={state.saving || state.canRetry}
                  onClick={() => {
                    if (selectedPageId) client.discardDraft(selectedPageId);
                    setUiError(null);
                  }}
                >
                  放弃草稿，采用磁盘版本
                </Button>
              </div>
            </div>
          )}
          <div className="relative min-h-0 flex-1 overflow-auto p-6 md:p-8">
            {page ? (
              <PptdEditorCanvas
                key={page.pageId}
                page={page}
                size={snapshot.size}
                theme={theme}
                selectedIds={selectedIds}
                onSelect={setSelectedIds}
                disabled={readonly}
                scale={scale}
                onScaleChange={setActualScale}
                onPatch={(elementId, set, autosave) =>
                  client.patchElement(page.pageId, elementId, set, autosave)
                }
                onBegin={() => client.beginInteraction(page.pageId)}
                onEnd={() => void run(() => client.endInteraction(page.pageId))}
                onCancel={(originals) => client.cancelInteraction(page.pageId, originals)}
                onFlush={() => void run(() => client.flushPage(page.pageId))}
                onComposition={(composing) => client.setComposing(page.pageId, composing)}
              />
            ) : (
              <div className="grid h-full place-items-center">
                <div className="text-center">
                  <p className="mb-4 text-sm text-muted-foreground">从一张空白页开始。</p>
                  <Button
                    disabled={readonly || busy}
                    onClick={() => void apply([{ op: 'page.add' }])}
                  >
                    <Plus />
                    新增页面
                  </Button>
                </div>
              </div>
            )}
          </div>
          <div className="flex h-9 shrink-0 items-center gap-2 border-y border-border bg-background px-4 text-xs text-muted-foreground">
            <Button variant="ghost" size="xs" onClick={() => setNotesOpen((value) => !value)}>
              演讲备注
            </Button>
            {exportReport && (
              <a href={exportReport} download className="text-xs underline underline-offset-2">
                导出说明
              </a>
            )}
            <span className="ml-auto hidden text-[10px] xl:block">
              Shift 多选 / 等比例缩放 · Alt 暂停吸附
            </span>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label="缩小画布"
              onClick={() => setScale(Math.max(0.15, (scale ?? actualScale) - 0.1))}
            >
              <Minus />
            </Button>
            <button
              type="button"
              className="min-w-12 font-mono text-[11px]"
              title="点击适合窗口"
              onClick={() => setScale(undefined)}
            >
              {Math.round(actualScale * 100)}%
            </button>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label="放大画布"
              onClick={() => setScale(Math.min(3, (scale ?? actualScale) + 0.1))}
            >
              <Plus />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label="适合窗口"
              onClick={() => setScale(undefined)}
            >
              <Maximize2 />
            </Button>
          </div>
          {notesOpen && page && (
            <div className="h-28 shrink-0 overflow-auto bg-background px-4 py-3">
              <Textarea
                aria-label="演讲备注"
                placeholder="这页要讲什么？"
                className="min-h-20 resize-none border-none bg-transparent p-0 text-xs shadow-none focus-visible:ring-0"
                value={page.data.notes ?? ''}
                disabled={readonly}
                onChange={(event) => client.setNotes(page.pageId, event.target.value)}
                onCompositionStart={() => client.setComposing(page.pageId, true)}
                onCompositionEnd={() => client.setComposing(page.pageId, false)}
              />
            </div>
          )}
        </main>
        {page && (
          <PptdInspector
            key={page.pageId}
            page={page}
            theme={theme}
            selectedIds={selectedIds}
            disabled={readonly}
            onSelect={setSelectedIds}
            onPatch={(elementId, fields, autosave) =>
              client.patchElement(page.pageId, elementId, fields, autosave)
            }
            onBegin={() => client.beginInteraction(page.pageId)}
            onEnd={() => void run(() => client.endInteraction(page.pageId))}
            onComposition={(composing) => client.setComposing(page.pageId, composing)}
            onAlign={align}
            onLayer={layer}
            onRemove={removeElements}
          >
            {!selectedIds.length && (
              <DesignIntentPanel
                page={page}
                metadataRevision={snapshot.metadataRevision}
                onApply={(operations, expected) => client.apply(operations, expected)}
                disabled={readonly || busy}
              />
            )}
            <RecipePanel
              snapshot={snapshot}
              page={page}
              onApply={(operations, expected) => client.apply(operations, expected)}
              disabled={readonly || busy}
            />
          </PptdInspector>
        )}
      </div>
      <Dialog open={imageDialog} onOpenChange={setImageDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加原始图片</DialogTitle>
            <DialogDescription>
              填写项目内已有图片的相对路径，或图片 URL。图片保持独立素材，可以继续裁切和移动。
            </DialogDescription>
          </DialogHeader>
          <Input
            aria-label="新图片路径"
            placeholder="media/figure.png"
            value={imagePath}
            onChange={(event) => setImagePath(event.target.value)}
          />
          <DialogFooter>
            <Button
              disabled={!imagePath.trim() || busy}
              onClick={() => {
                addElement('image', { src: imagePath.trim() });
                setImageDialog(false);
                setImagePath('');
              }}
            >
              添加图片
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {historyPage && (
        <PageHistoryDialog
          key={historyPage.pageId}
          page={historyPage}
          backend={backend}
          theme={theme}
          disabled={readonly || busy}
          open={Boolean(historyPageId)}
          onOpenChange={(open) => {
            if (!open) setHistoryPageId(null);
          }}
          onRestore={async (versionId) => {
            await client.flushAll();
            const current = client.getState().snapshot;
            const currentPage = current?.pages.find((item) => item.pageId === historyPage.pageId);
            if (!current || !currentPage) throw new Error('页面状态已改变，请重新打开历史版本。');
            await client.apply(
              [{ op: 'page.version.restore', pageId: currentPage.pageId, versionId }],
              {
                pages: { [currentPage.pageId]: currentPage.pageRevision },
                metadata: current.metadataRevision,
              },
            );
            selectPage(currentPage.pageId);
          }}
        />
      )}
      {presenting && page && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black" data-hd-presenter>
          <div className="flex min-h-0 flex-1">
            <div className="min-w-0 flex-1 p-4" data-hd-presenter-slide={page.pageId}>
              <SlideCanvas width={snapshot.size[0]} height={snapshot.size[1]} flat>
                <PptdPageRenderer page={page} size={snapshot.size} theme={theme} />
              </SlideCanvas>
            </div>
            {presenterNotesOpen && (
              <aside
                id="hd-presenter-notes"
                aria-label="演讲者备注"
                data-hd-presenter-notes={page.pageId}
                className="flex w-80 max-w-[40vw] shrink-0 flex-col border-l border-white/15 bg-zinc-950 px-5 py-5 text-zinc-100"
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="text-sm font-medium">演讲者备注</h2>
                  <span className="font-mono text-xs text-zinc-400" data-hd-presenter-code>
                    {page.shortCode ?? '未编号'} · {pageIndex + 1}
                  </span>
                </div>
                <div
                  className="min-h-0 flex-1 overflow-y-auto whitespace-pre-wrap break-words text-sm leading-relaxed text-zinc-200"
                  data-hd-presenter-note-text
                  aria-live="polite"
                >
                  {page.data.notes?.trim() ? page.data.notes : '这一页暂无演讲备注。'}
                </div>
                <div className="mt-5 shrink-0 border-t border-white/15 pt-4">
                  {nextPage ? (
                    <>
                      <div className="mb-2 flex items-center justify-between text-xs text-zinc-400">
                        <span>下一页</span>
                        <span className="font-mono">{nextPage.shortCode ?? '未编号'}</span>
                      </div>
                      <div
                        data-hd-presenter-next={nextPage.pageId}
                        className="overflow-hidden rounded border border-white/15"
                        style={{ aspectRatio: `${snapshot.size[0]} / ${snapshot.size[1]}` }}
                      >
                        <SlideCanvas
                          width={snapshot.size[0]}
                          height={snapshot.size[1]}
                          flat
                          freezeMotion
                        >
                          <PptdPageRenderer page={nextPage} size={snapshot.size} theme={theme} />
                        </SlideCanvas>
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-zinc-400" data-hd-presenter-end>
                      已到最后一页
                    </p>
                  )}
                </div>
              </aside>
            )}
          </div>
          <div className="flex h-12 shrink-0 items-center justify-center gap-5 text-white">
            <button
              type="button"
              aria-label="演讲者备注"
              aria-pressed={presenterNotesOpen}
              aria-controls={presenterNotesOpen ? 'hd-presenter-notes' : undefined}
              data-hd-presenter-notes-toggle
              className="absolute left-6 flex items-center gap-2 rounded px-2 py-1 text-xs text-zinc-300 hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-white"
              onClick={() => setPresenterNotesOpen((open) => !open)}
            >
              <FileText className="size-4" />
              备注
            </button>
            <button
              type="button"
              aria-label="上一页"
              disabled={pageIndex <= 0}
              onClick={() => stepPage(-1)}
              className="disabled:opacity-30"
            >
              <ArrowLeft className="size-4" />
            </button>
            <span className="font-mono text-xs">
              {pageIndex + 1} / {snapshot.pages.length} · {page.shortCode}
            </span>
            <button
              type="button"
              aria-label="下一页"
              disabled={pageIndex >= snapshot.pages.length - 1}
              onClick={() => stepPage(1)}
              className="disabled:opacity-30"
            >
              <ArrowRight className="size-4" />
            </button>
            <button
              type="button"
              aria-label="退出演示"
              className="absolute right-6"
              onClick={() => setPresenting(false)}
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      )}
      {snapshot.diagnostics.some((item) => item.severity === 'error') && (
        <div
          className="shrink-0 border-t bg-background px-4 py-1.5 text-[10px] text-muted-foreground"
          role="status"
        >
          {snapshot.diagnostics
            .filter((item) => item.severity === 'error')
            .map((item) => item.message)
            .join(' · ')}
        </div>
      )}
    </div>
  );
}
