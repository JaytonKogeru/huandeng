import { ArrowLeft, FileText, FolderOpen, Image, Loader2, RefreshCw, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { desktopHost } from '@/lib/huandeng-desktop';
import { uiText as t, useHuandengLocale } from '@/lib/huandeng-locale';
import { type PptdBackend, pptdProjectFileImageUrl } from '@/lib/pptd-backend';
import type { ProjectFilePreview } from '../../../pptd/project-file-preview';
import { Button } from '../ui/button';

export interface ProjectFilePreviewPanelProps {
  backend: PptdBackend;
  path: string;
  onClose: () => void;
  onShowProperties?: () => void;
  refreshKey?: number;
}

function fileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
}

export function ProjectFilePreviewPanel({
  backend,
  path,
  onClose,
  onShowProperties,
  refreshKey,
}: ProjectFilePreviewPanelProps) {
  useHuandengLocale();
  const panel = useRef<HTMLElement>(null);
  const [loadedPreview, setPreview] = useState<ProjectFilePreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [imageError, setImageError] = useState(false);
  const [imageScale, setImageScale] = useState<'fit' | 'actual'>('fit');
  const preview = loadedPreview?.path === path.replaceAll('\\', '/') ? loadedPreview : null;

  useEffect(() => {
    if (path) panel.current?.focus({ preventScroll: true });
  }, [path]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: Explicit refreshes reload the selected file.
  useEffect(() => {
    const abort = new AbortController();
    setLoading(true);
    setPreview(null);
    setError(null);
    setImageError(false);
    setImageScale('fit');
    void backend
      .filePreview(path, abort.signal)
      .then((result) => {
        if (!abort.signal.aborted) setPreview(result);
      })
      .catch((cause) => {
        if (!abort.signal.aborted) setError(cause instanceof Error ? cause.message : String(cause));
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, [backend, path, refresh, refreshKey]);

  const reveal = async () => {
    try {
      await desktopHost()?.revealPath(path);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  };

  return (
    <section
      ref={panel}
      className="flex min-h-0 min-w-0 flex-1 flex-col bg-sidebar"
      aria-label={t('File preview')}
      data-hd-file-preview={path}
      data-hd-keyboard-region="file-preview"
      data-hd-focus-region="file-preview"
      tabIndex={-1}
      onPointerDown={(event) => {
        if (!(event.target as Element).closest('button, input, textarea, select, a'))
          event.currentTarget.focus({ preventScroll: true });
      }}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (
          ((event.ctrlKey || event.metaKey) &&
            ['z', 'y', 'x', 'v'].includes(event.key.toLowerCase())) ||
          ['Delete', 'Backspace'].includes(event.key)
        )
          event.preventDefault();
        if (event.key === 'Escape') {
          event.preventDefault();
          onClose();
        }
      }}
    >
      <div className="flex h-11 shrink-0 items-center gap-2 border-b border-border px-3">
        {preview?.kind === 'image' ? (
          <Image className="size-3.5" />
        ) : (
          <FileText className="size-3.5" />
        )}
        <h2 className="min-w-0 flex-1 truncate text-xs font-medium">{t('File preview')}</h2>
        <Button
          size="icon-xs"
          variant="ghost"
          aria-label={t('Refresh file preview')}
          title={t('Refresh file preview')}
          disabled={loading}
          onClick={() => setRefresh((value) => value + 1)}
        >
          <RefreshCw className={loading ? 'animate-spin' : ''} />
        </Button>
        <Button
          size="icon-xs"
          variant="ghost"
          aria-label={t('Close file preview')}
          title={t('Close file preview')}
          onClick={onClose}
        >
          <X />
        </Button>
      </div>
      <div className="space-y-1 border-b border-border px-3 py-2">
        <p className="break-all text-xs font-medium" title={path}>
          {path}
        </p>
        <p className="text-[10px] text-muted-foreground">
          {t('Read-only')}
          {preview ? ` · ${fileSize(preview.bytes)}` : ''}
          {preview?.kind === 'text' ? ` · ${t(preview.language)} · ${preview.encoding}` : ''}
          {preview?.kind === 'image' ? ` · ${preview.width} × ${preview.height}` : ''}
        </p>
      </div>
      <div className="min-h-0 min-w-0 flex-1 overflow-auto">
        {loading && (
          <p role="status" className="flex items-center gap-2 p-4 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" />
            {t('Loading preview…')}
          </p>
        )}
        {error && (
          <p role="alert" className="break-words p-4 text-xs text-destructive">
            {t(error)}
          </p>
        )}
        {preview?.kind === 'unsupported' && (
          <p role="status" className="p-4 text-xs leading-relaxed text-muted-foreground">
            {t(preview.reason)}
          </p>
        )}
        {preview?.kind === 'text' && (
          <>
            {preview.truncated && (
              <p
                role="status"
                className="border-b px-3 py-2 text-xs text-muted-foreground"
                data-hd-file-truncated
              >
                {t('Showing the first {size}. The file is unchanged.', {
                  size: fileSize(preview.previewBytes),
                })}
              </p>
            )}
            <textarea
              readOnly
              wrap="off"
              aria-label={t('{type} preview', { type: t(preview.language) })}
              className="min-h-full w-full resize-none border-0 bg-transparent p-3 font-mono text-[11px] leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/40"
              data-hd-file-text
              value={preview.text}
            />
          </>
        )}
        {preview?.kind === 'image' && (
          <div className="p-3">
            <div className="mb-3 flex items-center gap-1">
              <Button
                variant={imageScale === 'fit' ? 'secondary' : 'ghost'}
                size="xs"
                onClick={() => setImageScale('fit')}
              >
                {t('Fit image')}
              </Button>
              <Button
                variant={imageScale === 'actual' ? 'secondary' : 'ghost'}
                size="xs"
                onClick={() => setImageScale('actual')}
              >
                {t('Actual size')}
              </Button>
            </div>
            {imageError ? (
              <p role="alert" className="text-xs text-destructive">
                {t('The image could not be displayed. Refresh the preview or reveal the file.')}
              </p>
            ) : (
              <img
                key={`${preview.path}:${preview.revision}`}
                src={pptdProjectFileImageUrl(preview.path, preview.revision)}
                alt={preview.name}
                width={preview.width}
                height={preview.height}
                className={
                  imageScale === 'fit'
                    ? 'block h-auto max-h-[65dvh] w-full object-contain'
                    : 'block max-w-none'
                }
                onError={() => setImageError(true)}
                data-hd-file-image
              />
            )}
          </div>
        )}
      </div>
      <div className="flex shrink-0 flex-wrap gap-2 border-t border-border p-3">
        {onShowProperties && (
          <Button size="xs" variant="outline" onClick={onShowProperties}>
            <ArrowLeft />
            {t('Show Properties')}
          </Button>
        )}
        {desktopHost() && (
          <Button size="xs" variant="ghost" onClick={() => void reveal()}>
            <FolderOpen />
            {t('Reveal file')}
          </Button>
        )}
      </div>
    </section>
  );
}
