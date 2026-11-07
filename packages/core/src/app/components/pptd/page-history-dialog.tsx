import { ArrowDown, ArrowUp, Check, History, Loader2, RotateCcw } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { PptdBackend } from '@/lib/pptd-backend';
import { cn } from '@/lib/utils';
import type { PageSnapshot, PageVersionSnapshot, PageVersionSummary } from '../../../pptd/types';
import { SlideCanvas } from '../slide-canvas';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { PptdPageRenderer, type PptdTheme } from './renderer';

function actorLabel(actor: string): string {
  if (actor.startsWith('huandeng-ui:') || actor.startsWith('huandeng-ui:')) return '编辑器';
  if (actor === 'external') return '外部文件修改';
  return actor;
}

function versionLabel(version: PageVersionSummary): string {
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
    'recipe.apply': '调整布局起点',
    'recipe.reset': '重置布局起点',
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
}: {
  page: PageSnapshot;
  backend: PptdBackend;
  theme: PptdTheme;
  disabled: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRestore: (versionId: string) => Promise<unknown>;
}) {
  const [versions, setVersions] = useState<PageVersionSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [preview, setPreview] = useState<PageVersionSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const selectedIndex = versions.findIndex((item) => item.versionId === selectedId);
  const selected = versions[selectedIndex];

  // biome-ignore lint/correctness/useExhaustiveDependencies: Page and Frame changes invalidate the version list, including external edits.
  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);
    setError(null);
    void backend
      .pageHistory(page.pageId)
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
  }, [backend, open, page.pageId, page.pageRevision, page.metadata]);

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
    if (!selectedId) return;
    setRestoring(true);
    setError(null);
    setMessage(null);
    try {
      await onRestore(selectedId);
      const items = await backend.pageHistory(page.pageId);
      setVersions(items);
      setSelectedId(items[0]?.versionId ?? null);
      setMessage(`已恢复 ${page.shortCode ?? '这页'}，并保存为新版本。其他页面保持原样。`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setRestoring(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(value) => !restoring && onOpenChange(value)}>
      <DialogContent
        className="flex h-[min(780px,calc(100dvh-3rem))] flex-col gap-0 p-0 sm:max-w-6xl"
        data-hd-page-history={page.pageId}
      >
        <DialogHeader className="shrink-0 border-b border-border px-6 py-5">
          <DialogTitle className="flex items-center gap-2">
            <History className="size-4" />
            {page.shortCode ?? '页面'} · 历史版本
          </DialogTitle>
          <DialogDescription>
            选择版本查看这一页的演变。恢复会生成新版本，页面编号和位置保持不变。
          </DialogDescription>
        </DialogHeader>
        <div className="flex min-h-0 flex-1">
          <div className="flex w-56 shrink-0 flex-col border-r border-border bg-sidebar/50">
            <div className="flex h-10 shrink-0 items-center gap-1 border-b px-3">
              <span className="mr-auto text-[11px] text-muted-foreground">
                {versions.length} 个版本 · 新 → 旧
              </span>
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label="查看较新版本"
                disabled={selectedIndex <= 0}
                onClick={() => setSelectedId(versions[selectedIndex - 1].versionId)}
              >
                <ArrowUp />
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label="查看较早版本"
                disabled={selectedIndex < 0 || selectedIndex >= versions.length - 1}
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
                <p className="p-3 text-xs text-muted-foreground">尚无版本记录。</p>
              ) : (
                versions.map((version) => (
                  <button
                    type="button"
                    key={version.versionId}
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
                  <PptdPageRenderer page={preview.page} size={preview.size} theme={theme} />
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
              历史记录保存页面内容和 Frame 意图；预览使用项目当前的图片素材。
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
                {selected?.current ? '正在查看当前版本。' : '恢复此版本的页面内容与 Frame 意图。'}
              </p>
            )}
          </div>
          <Button variant="outline" disabled={restoring} onClick={() => onOpenChange(false)}>
            返回编辑
          </Button>
          <Button
            data-hd-restore-version
            disabled={disabled || restoring || !preview || !selected || selected.current}
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
