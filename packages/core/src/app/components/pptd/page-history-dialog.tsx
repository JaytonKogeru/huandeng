import { ArrowDown, ArrowUp, BookmarkPlus, Check, History, Loader2, RotateCcw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { desktopHost } from '@/lib/huandeng-desktop';
import type { PptdBackend } from '@/lib/pptd-backend';
import { cn } from '@/lib/utils';
import type { PageSnapshot, PageVersionSnapshot, PageVersionSummary } from '../../../pptd/types';
import { SlideCanvas } from '../slide-canvas';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { PptdPageRenderer, type PptdTheme } from './renderer';

function actorLabel(actor: string): string {
  if (actor.startsWith('huandeng-ui:') || actor.startsWith('huanding-ui:')) return '编辑器';
  if (actor === 'external') return '外部文件修改';
  return actor;
}

function versionLabel(version: PageVersionSummary): string {
  if (version.kind === 'checkpoint') return version.summary;
  if (version.kind === 'initial') return '初始记录';
  if (version.kind === 'external') return '外部文件更新';
  if (version.kind === 'restore') return '恢复历史版本';
  const labels: Record<string, string> = {
    'element.patch': '修改对象内容或样式',
    'element.add': '添加对象',
    'element.remove': '删除对象',
    'element.reorder': '调整图层',
    'page.notes.set': '修改演讲备注',
    'metadata.patch': '更新页面意图或布局关联',
    'history.revert': '撤销操作',
    'recipe.apply': '调整快速布局',
    'recipe.reset': '重置快速布局',
    'page.add': '新增页面',
    'page.duplicate': '复制页面',
    'page.restore': '恢复已移除的页面',
    'page.remove': '移除页面',
    'page.move': '调整页序',
    'page.relink': '更新页面文件位置',
  };
  return [...new Set(version.summary.split(', ').map((item) => labels[item] ?? item))].join(' · ');
}

export function PageHistoryDialog({
  page,
  backend,
  theme,
  disabled,
  open,
  onOpenChange,
  onRestore,
  onRecord,
}: {
  page: PageSnapshot;
  backend: PptdBackend;
  theme: PptdTheme;
  disabled: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRestore: (versionId: string) => Promise<unknown>;
  onRecord: (label: string) => Promise<unknown>;
}) {
  const [versions, setVersions] = useState<PageVersionSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [preview, setPreview] = useState<PageVersionSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [view, setView] = useState<'checkpoints' | 'operations'>('checkpoints');
  const [label, setLabel] = useState('');
  const [recording, setRecording] = useState(false);
  const mutationActive = useRef(false);
  const [refresh, setRefresh] = useState(0);
  const selectedIndex = versions.findIndex((item) => item.versionId === selectedId);
  const selected = versions[selectedIndex];

  useEffect(() => {
    if (!recording && !restoring) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    const unsubscribe = desktopHost()?.onBeforeLeave(async () => {
      throw new Error('页面版本操作仍在进行，请等待保存或恢复完成后再离开。');
    });
    return () => {
      window.removeEventListener('beforeunload', warn);
      unsubscribe?.();
    };
  }, [recording, restoring]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: Page and Frame changes invalidate the version list, including external edits.
  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);
    setError(null);
    void backend
      .pageHistory(page.pageId, view)
      .then((items) => {
        if (!active) return;
        setVersions(items);
        setSelectedId((current) =>
          items.some((item) => item.versionId === current)
            ? current
            : (items[0]?.versionId ?? null),
        );
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : String(cause));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [backend, open, page.pageId, page.pageRevision, page.metadata, view, refresh]);

  useEffect(() => {
    if (!open || !selectedId) return;
    let active = true;
    setPreview(null);
    setPreviewLoading(true);
    setError(null);
    void backend
      .pageVersion(page.pageId, selectedId)
      .then((result) => {
        if (active) setPreview(result);
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : String(cause));
      })
      .finally(() => {
        if (active) setPreviewLoading(false);
      });
    return () => {
      active = false;
    };
  }, [backend, open, page.pageId, selectedId]);

  const restore = async () => {
    if (disabled || mutationActive.current || !selectedId || !preview || selected?.current) return;
    mutationActive.current = true;
    setRestoring(true);
    setError(null);
    setMessage(null);
    try {
      await onRestore(selectedId);
      const items = await backend.pageHistory(page.pageId, view);
      setVersions(items);
      setSelectedId(items[0]?.versionId ?? null);
      setMessage(
        `已恢复 ${page.shortCode ?? page.metadata.label ?? '这页'} 的工作稿。需要保留本轮成果时，再记录一个命名版本。`,
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      mutationActive.current = false;
      setRestoring(false);
    }
  };

  const recordVersion = async () => {
    if (disabled || mutationActive.current || !label.trim()) return;
    mutationActive.current = true;
    setRecording(true);
    setError(null);
    try {
      await onRecord(label.trim());
      setLabel('');
      setView('checkpoints');
      setSelectedId(null);
      setRefresh((value) => value + 1);
      setMessage('已记录页面版本，并归档引用的本地素材。');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      mutationActive.current = false;
      setRecording(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(value) => !mutationActive.current && onOpenChange(value)}>
      <DialogContent
        showCloseButton={!recording && !restoring}
        className="flex h-[min(780px,calc(100dvh-3rem))] flex-col gap-0 p-0 sm:max-w-6xl"
        data-hd-page-history={page.pageId}
      >
        <DialogHeader className="shrink-0 border-b border-border px-6 py-5">
          <DialogTitle
            className="flex items-center gap-2"
            title={`永久 ID：${page.pageId}${page.metadata.label ? `\n旧编号：${page.metadata.label}` : ''}`}
          >
            <History className="size-4" />
            {page.shortCode ?? page.metadata.label ?? '页面'} · 页面版本
          </DialogTitle>
          <DialogDescription>
            自动保存保留工作稿。完成一轮修改后，为这一页记录一个有名字的版本。
          </DialogDescription>
        </DialogHeader>
        <div className="flex shrink-0 items-center gap-2 border-b px-5 py-3">
          <Button
            size="sm"
            variant={view === 'checkpoints' ? 'secondary' : 'ghost'}
            disabled={recording || restoring}
            onClick={() => {
              setView('checkpoints');
              setSelectedId(null);
            }}
          >
            已记录版本
          </Button>
          <Button
            size="sm"
            variant={view === 'operations' ? 'secondary' : 'ghost'}
            disabled={recording || restoring}
            onClick={() => {
              setView('operations');
              setSelectedId(null);
            }}
          >
            操作记录
          </Button>
          <Input
            aria-label="页面版本名称"
            placeholder="版本名称，例如：图表完成 / 组会定稿"
            value={label}
            disabled={disabled || recording || restoring}
            maxLength={200}
            onChange={(event) => setLabel(event.target.value)}
            className="ml-auto h-8 max-w-sm text-xs"
            onKeyDown={(event) => {
              if (event.key === 'Enter') void recordVersion();
            }}
          />
          <Button
            size="sm"
            disabled={disabled || recording || restoring || !label.trim()}
            onClick={() => void recordVersion()}
          >
            <BookmarkPlus />
            {recording ? '记录中…' : '记录页面版本'}
          </Button>
        </div>
        <div className="flex min-h-0 flex-1">
          <div className="flex w-56 shrink-0 flex-col border-r border-border bg-sidebar/50">
            <div className="flex h-10 shrink-0 items-center gap-1 border-b px-3">
              <span className="mr-auto text-[11px] text-muted-foreground">
                {versions.length} {view === 'checkpoints' ? '个版本' : '条操作'} · 新 → 旧
              </span>
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label="查看较新版本"
                disabled={recording || restoring || selectedIndex <= 0}
                onClick={() => setSelectedId(versions[selectedIndex - 1].versionId)}
              >
                <ArrowUp />
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label="查看较早版本"
                disabled={
                  recording ||
                  restoring ||
                  selectedIndex < 0 ||
                  selectedIndex >= versions.length - 1
                }
                onClick={() => setSelectedId(versions[selectedIndex + 1].versionId)}
              >
                <ArrowDown />
              </Button>
            </div>
            <section
              className="min-h-0 flex-1 space-y-1 overflow-auto p-2"
              aria-label="页面版本列表"
            >
              {loading && !versions.length ? (
                <p className="p-3 text-xs text-muted-foreground">正在读取历史…</p>
              ) : !versions.length ? (
                <p className="p-3 text-xs text-muted-foreground">
                  {view === 'checkpoints'
                    ? '尚未记录命名版本。日常修改会自动保存；完成一轮修改后，在上方命名并记录。'
                    : '尚无操作记录。'}
                </p>
              ) : (
                versions.map((version) => (
                  <button
                    type="button"
                    key={version.versionId}
                    disabled={recording || restoring}
                    data-hd-version={version.versionId}
                    data-hd-version-current={version.current}
                    aria-pressed={selectedId === version.versionId}
                    className={cn(
                      'block w-full space-y-2 rounded-md border p-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-brand/50',
                      selectedId === version.versionId
                        ? 'border-brand/40 bg-brand-soft'
                        : 'border-transparent hover:bg-muted',
                    )}
                    onClick={() => {
                      setSelectedId(version.versionId);
                      setMessage(null);
                    }}
                  >
                    <div className="flex items-start gap-1.5">
                      <span className="min-w-0 flex-1 text-xs leading-relaxed">
                        {versionLabel(version)}
                      </span>
                      {version.current && (
                        <span className="flex shrink-0 items-center gap-0.5 text-[10px] text-brand">
                          <Check className="size-3" />
                          当前
                        </span>
                      )}
                    </div>
                    <div className="space-y-1 text-[10px] leading-relaxed text-muted-foreground">
                      <p>{new Date(version.createdAt).toLocaleString()}</p>
                      <p className="truncate" title={version.actor}>
                        {actorLabel(version.actor)}
                        {version.kind === 'initial' && ' · 初始记录'}
                        {version.kind === 'restore' && ' · 版本恢复'}
                      </p>
                      <p className="truncate font-mono" title={version.versionId}>
                        {version.versionId.split(':').at(-1)?.slice(0, 8)}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </section>
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex h-10 shrink-0 items-center border-b px-4 text-[11px] text-muted-foreground">
              <span className="truncate font-mono">{page.path}</span>
              <span className="ml-auto shrink-0 pl-3">只读预览</span>
            </div>
            <div className="relative min-h-0 flex-1 bg-canvas p-5" data-hd-history-preview>
              {previewLoading ? (
                <div className="grid h-full place-items-center text-muted-foreground">
                  <Loader2 className="size-5 animate-spin" />
                </div>
              ) : preview ? (
                <SlideCanvas width={preview.size[0]} height={preview.size[1]} flat freezeMotion>
                  <PptdPageRenderer
                    page={preview.page}
                    size={preview.size}
                    theme={(preview.theme ?? theme) as PptdTheme}
                  />
                </SlideCanvas>
              ) : (
                <p className="grid h-full place-items-center text-sm text-muted-foreground">
                  选择左侧的版本
                </p>
              )}
            </div>
            {preview?.page.data.notes && (
              <details className="shrink-0 border-t px-4 py-3 text-xs">
                <summary className="cursor-pointer text-muted-foreground">该版本的演讲备注</summary>
                <p className="mt-2 max-h-24 overflow-auto whitespace-pre-wrap leading-relaxed">
                  {preview.page.data.notes}
                </p>
              </details>
            )}
            <p className="shrink-0 border-t px-4 py-2 text-[10px] leading-relaxed text-muted-foreground">
              {preview?.assets === 'archived'
                ? '命名版本随项目保存，包含页面、故事与归档素材。恢复只更新这一页。'
                : '操作记录用于撤销和恢复工作稿；旧操作预览使用当前项目素材。'}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3 border-t px-5 py-4">
          <div className="min-w-0 flex-1 text-xs leading-relaxed">
            {error ? (
              <p role="alert" className="text-destructive">
                {error}
              </p>
            ) : message ? (
              <p role="status" className="text-brand">
                {message}
              </p>
            ) : (
              <p className="text-muted-foreground">
                {selected?.current
                  ? '这个版本与当前工作稿一致。'
                  : '可将选中版本恢复到当前工作稿。'}
              </p>
            )}
          </div>
          <Button
            variant="outline"
            disabled={recording || restoring}
            onClick={() => onOpenChange(false)}
          >
            返回编辑
          </Button>
          <Button
            data-hd-restore-version
            disabled={
              disabled || recording || restoring || !preview || !selected || selected.current
            }
            onClick={() => void restore()}
          >
            {restoring ? <Loader2 className="animate-spin" /> : <RotateCcw />}
            {restoring ? '正在恢复…' : '将此版本恢复为当前页'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
