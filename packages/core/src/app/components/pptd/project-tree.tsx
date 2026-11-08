import { Copy, File, FileCode2, Folder, FolderOpen, Image, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { desktopHost } from '@/lib/huandeng-desktop';
import { uiText as t, useHuandengLocale } from '@/lib/huandeng-locale';
import type { PptdBackend, ProjectTree, ProjectTreeNode } from '@/lib/pptd-backend';
import { cn } from '@/lib/utils';
import type { DeckSnapshot } from '../../../pptd/types';
import { Button } from '../ui/button';

function TreeNode({
  node,
  selectedPath,
  snapshot,
  onSelect,
}: {
  node: ProjectTreeNode;
  selectedPath: string | null;
  snapshot: DeckSnapshot;
  onSelect: (node: ProjectTreeNode) => void;
}) {
  useHuandengLocale();
  if (node.kind === 'directory')
    return (
      <li>
        <details open>
          <summary className="flex cursor-pointer list-none items-center gap-2 rounded px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted">
            <Folder className="size-3.5 shrink-0" />
            <span className="truncate">{node.name}</span>
            <span className="ml-auto text-[10px]">{node.children?.length ?? 0}</span>
          </summary>
          <ul className="ml-3 border-l border-border pl-1">
            {node.children?.map((child) => (
              <TreeNode
                key={child.path}
                node={child}
                selectedPath={selectedPath}
                snapshot={snapshot}
                onSelect={onSelect}
              />
            ))}
          </ul>
        </details>
      </li>
    );
  const page = snapshot.pages.find(
    (item) => item.pageId === node.pageId || item.path === node.path,
  );
  const Icon = node.role === 'media' ? Image : node.role === 'page' ? FileCode2 : File;
  return (
    <li>
      <button
        type="button"
        title={node.path}
        data-hd-project-file={node.path}
        aria-pressed={selectedPath === node.path}
        className={cn(
          'flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs outline-none focus-visible:ring-2 focus-visible:ring-brand/50',
          selectedPath === node.path ? 'bg-brand-soft text-foreground' : 'hover:bg-muted',
        )}
        onClick={() => onSelect({ ...node, pageId: page?.pageId ?? node.pageId })}
      >
        <Icon className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="truncate">{node.name}</span>
        {page?.shortCode && (
          <span className="ml-auto shrink-0 font-mono text-[9px] text-muted-foreground">
            {page.shortCode}
          </span>
        )}
      </button>
    </li>
  );
}

export function PptdProjectTree({
  backend,
  snapshot,
  currentPageId,
  onSelectPage,
  onPreviewFile,
}: {
  backend: PptdBackend;
  snapshot: DeckSnapshot;
  currentPageId: string | null;
  onSelectPage: (pageId: string) => void;
  onPreviewFile?: (node: ProjectTreeNode) => void;
}) {
  useHuandengLocale();
  const [project, setProject] = useState<ProjectTree | null>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(false);
  const currentPath = snapshot.pages.find((page) => page.pageId === currentPageId)?.path;

  useEffect(() => {
    if (currentPath) setSelectedPath(currentPath);
  }, [currentPath]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: File changes and an explicit refresh invalidate the project tree.
  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      setLoading(true);
      void backend
        .project()
        .then((result) => {
          if (active) {
            setProject(result);
            setError(null);
          }
        })
        .catch((cause) => {
          if (active) setError(cause instanceof Error ? cause.message : String(cause));
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 150);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [backend, snapshot.sequence, refresh]);

  const reveal = async () => {
    setError(null);
    setMessage(null);
    try {
      if (desktopHost()) await desktopHost()?.revealPath(selectedPath ?? undefined);
      else {
        const separator = project?.root.includes('\\') ? '\\' : '/';
        const target = selectedPath
          ? `${project?.root.replace(/[\\/]$/, '')}${separator}${selectedPath.replaceAll('/', separator)}`
          : project?.root;
        if (target) await navigator.clipboard.writeText(target);
        setMessage('路径已复制。');
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  };

  return (
    <section
      className="flex min-h-0 flex-1 flex-col"
      aria-label={t('项目文件')}
      data-hd-project-tree
    >
      <div className="flex h-11 shrink-0 items-center gap-2 border-b border-border px-3">
        <FolderOpen className="size-3.5 text-muted-foreground" />
        <span className="mr-auto text-xs font-medium">{t('项目文件')}</span>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label={t('刷新项目文件')}
          disabled={loading}
          onClick={() => setRefresh((value) => value + 1)}
        >
          <RefreshCw className={loading ? 'animate-spin' : ''} />
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto px-2 py-2">
        {project && (
          <>
            <p
              className="mb-3 break-all px-2 font-mono text-[10px] leading-relaxed text-muted-foreground"
              title={project.root}
              data-hd-project-root
            >
              {project.root}
            </p>
            <ul className="space-y-0.5">
              {project.nodes.map((node) => (
                <TreeNode
                  key={node.path}
                  node={node}
                  selectedPath={selectedPath}
                  snapshot={snapshot}
                  onSelect={(item) => {
                    setSelectedPath(item.path);
                    setMessage(null);
                    if (item.pageId) onSelectPage(item.pageId);
                    else onPreviewFile?.(item);
                  }}
                />
              ))}
            </ul>
          </>
        )}
        {!project && !error && (
          <p className="p-2 text-xs text-muted-foreground">{t('正在读取项目文件…')}</p>
        )}
        {error && (
          <p role="alert" className="p-2 text-xs text-destructive">
            {t(error)}
          </p>
        )}
      </div>
      <div className="space-y-2 border-t border-border px-3 py-3">
        {selectedPath && <p className="break-all font-mono text-[10px]">{selectedPath}</p>}
        <Button
          variant="outline"
          size="xs"
          className="w-full"
          disabled={!project}
          onClick={() => void reveal()}
        >
          {desktopHost() ? <FolderOpen /> : <Copy />}
          {desktopHost() ? t('在文件管理器中显示') : t('复制文件路径')}
        </Button>
        {message && (
          <p role="status" className="text-[10px] text-muted-foreground">
            {t(message)}
          </p>
        )}
        <p className="text-[10px] leading-relaxed text-muted-foreground">
          {t('Select a file to preview it. Page files open their Slide.')}
        </p>
      </div>
    </section>
  );
}
