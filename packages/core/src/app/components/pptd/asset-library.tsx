import { ArrowUpRight, FileImage, ImageOff, Plus, RefreshCw, Search, Upload } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { uiText as t, useHuandengLocale } from '@/lib/huandeng-locale';
import type {
  AssetLibraryItem,
  AssetLibraryOptions,
  AssetLibraryResult,
  AssetUsage,
} from '../../../pptd/asset-library';
import { assetVersionUrl } from '../../lib/pptd-asset-revision';
import { pptdAssetPreviewUrl, pptdAssetUrl } from '../../lib/pptd-backend';
import { Button } from '../ui/button';

export interface AssetLibraryProps {
  loadAssets: (options: AssetLibraryOptions) => Promise<AssetLibraryResult>;
  refreshKey?: string | number;
  selectedPageId?: string | null;
  disabled?: boolean;
  onSelectUsage: (usage: AssetUsage) => void;
  onInsert: (
    asset: AssetLibraryItem,
    dimensions: { width: number; height: number },
  ) => Promise<void>;
  onImport?: (files: File[]) => Promise<void>;
  onReplace?: (usage: AssetUsage, file: File) => Promise<void>;
}

function sizeLabel(bytes: number | null) {
  if (bytes === null) return t('文件不可读');
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function assetPreviewUrl(asset: AssetLibraryItem, thumbnail = false): string {
  const url = thumbnail ? pptdAssetPreviewUrl(asset.path) : pptdAssetUrl(asset.path);
  return assetVersionUrl(url, asset.previewRevision);
}

export function AssetLibrary({
  loadAssets,
  refreshKey,
  selectedPageId,
  disabled = false,
  onSelectUsage,
  onInsert,
  onImport,
  onReplace,
}: AssetLibraryProps) {
  useHuandengLocale();
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<'image' | 'all'>('image');
  const [filter, setFilter] = useState<NonNullable<AssetLibraryOptions['filter']>>('all');
  const [pageOnly, setPageOnly] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [result, setResult] = useState<AssetLibraryResult | null>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState<{
    path: string;
    revision: string | null;
    width: number;
    height: number;
  } | null>(null);
  const [failedPreview, setFailedPreview] = useState<string | null>(null);
  const loadRef = useRef(loadAssets);
  loadRef.current = loadAssets;
  const generation = useRef<{ refresh: number; refreshKey?: string | number } | null>(null);
  const importInput = useRef<HTMLInputElement>(null);
  const replacementInput = useRef<HTMLInputElement>(null);
  const replacementUsage = useRef<AssetUsage | null>(null);
  const queryId = useId();
  const selected = result?.items.find((asset) => asset.path === selectedPath) ?? null;
  const selectedUrl = selected ? assetPreviewUrl(selected) : null;
  const readyToInsert =
    selected &&
    dimensions?.path === selected.path &&
    dimensions.revision === selected.previewRevision &&
    failedPreview !== selectedUrl;
  const activePageId = pageOnly ? (selectedPageId ?? undefined) : undefined;

  useEffect(() => {
    const request = { refresh, refreshKey };
    generation.current = request;
    setLoading(true);
    const timer = setTimeout(
      () => {
        void loadRef
          .current({ query, filter, kind, pageId: activePageId, limit: 100 })
          .then((next) => {
            if (request !== generation.current) return;
            setResult(next);
            setLoadError(null);
          })
          .catch((failure: unknown) => {
            if (request !== generation.current) return;
            setLoadError(failure instanceof Error ? failure.message : '无法读取素材库。');
            setResult(null);
          })
          .finally(() => {
            if (request === generation.current) setLoading(false);
          });
      },
      query ? 200 : 0,
    );
    return () => {
      clearTimeout(timer);
      generation.current = null;
    };
  }, [query, filter, kind, activePageId, refresh, refreshKey]);

  const perform = async (work: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await work();
      setRefresh((value) => value + 1);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : '素材操作未完成。');
    } finally {
      setBusy(false);
    }
  };
  const loadMore = async () => {
    if (!result || loading) return;
    const request = generation.current;
    setLoading(true);
    try {
      const next = await loadRef.current({
        query,
        filter,
        kind,
        pageId: activePageId,
        offset: result.items.length,
        limit: 100,
      });
      if (request !== generation.current) return;
      setResult({
        ...next,
        items: [
          ...result.items,
          ...next.items.filter(
            (item) => !result.items.some((existing) => existing.path === item.path),
          ),
        ],
      });
      setLoadError(null);
    } catch (failure) {
      if (request === generation.current)
        setLoadError(failure instanceof Error ? failure.message : '无法加载更多素材。');
    } finally {
      if (request === generation.current) setLoading(false);
    }
  };
  return (
    <section
      aria-label={t('项目素材库')}
      data-hd-asset-library
      className="flex h-full min-h-0 flex-col text-xs"
      aria-busy={loading || busy}
    >
      <div className="shrink-0 space-y-2 border-b border-border p-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold">{t('素材库')}</h2>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={t('刷新素材库')}
              title={t('刷新素材库')}
              disabled={loading || busy}
              onClick={() => {
                setFailedPreview(null);
                setRefresh((value) => value + 1);
              }}
            >
              <RefreshCw />
            </Button>
            {onImport && (
              <Button
                variant="outline"
                size="xs"
                title={t('从设备导入图片并放置到当前页')}
                disabled={disabled || busy}
                onClick={() => importInput.current?.click()}
              >
                <Upload />
                {t('导入并放置')}
              </Button>
            )}
          </div>
        </div>
        <fieldset className="flex rounded-md border p-0.5" aria-label={t('Asset types')}>
          <Button
            variant={kind === 'image' ? 'secondary' : 'ghost'}
            size="xs"
            className="flex-1"
            aria-pressed={kind === 'image'}
            onClick={() => {
              setKind('image');
              setSelectedPath(null);
            }}
          >
            {t('Images')}
          </Button>
          <Button
            variant={kind === 'all' ? 'secondary' : 'ghost'}
            size="xs"
            className="flex-1"
            aria-pressed={kind === 'all'}
            onClick={() => {
              setKind('all');
              setSelectedPath(null);
            }}
          >
            {t('All files')}
          </Button>
        </fieldset>
        <label className="relative block" htmlFor={queryId}>
          <Search className="pointer-events-none absolute left-2 top-2 size-3.5 text-muted-foreground" />
          <span className="sr-only">{t('搜索素材名称、路径或页面编号')}</span>
          <input
            id={queryId}
            type="search"
            maxLength={256}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('名称、路径或页面编号')}
            className="w-full rounded-md border border-border bg-background py-1.5 pl-7 pr-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          />
        </label>
        <div className="flex items-center gap-2">
          <select
            aria-label={t('素材筛选')}
            value={filter}
            onChange={(event) => setFilter(event.target.value as typeof filter)}
            className="min-w-0 flex-1 rounded border border-border bg-background px-2 py-1.5 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            <option value="all">
              {t('全部素材{value0}', { value0: result ? ` · ${result.counts.all}` : '' })}
            </option>
            <option value="used">
              {t('主库引用{value0}', { value0: result ? ` · ${result.counts.used}` : '' })}
            </option>
            <option value="unused">
              {t('当前主库未引用{value0}', { value0: result ? ` · ${result.counts.unused}` : '' })}
            </option>
            <option value="missing">
              {t('缺失或不可读{value0}', { value0: result ? ` · ${result.counts.missing}` : '' })}
            </option>
          </select>
          <label className="flex shrink-0 items-center gap-1.5 text-xs">
            <input
              type="checkbox"
              checked={pageOnly}
              disabled={!selectedPageId}
              onChange={(event) => setPageOnly(event.target.checked)}
            />
            {t('当前页')}
          </label>
        </div>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          {kind === 'image'
            ? t('Drag an image onto the slide, or import and place a new image.')
            : t(
                'Documents and scripts are supporting files. Only images can be placed on a slide.',
              )}
        </p>
        {(error || loadError) && (
          <p role="alert" className="break-words text-[11px] text-destructive">
            {t(error ?? loadError ?? '')}
          </p>
        )}
        {result?.truncated && (
          <p role="status" className="rounded bg-muted p-2 text-[11px] leading-relaxed">
            {t(
              '目录较大，已扫描 {value0} 项、最多 {value1}{value2}层。列表可能不完整；当前页面已引用的素材仍会单独检查。',
              { value0: result.scan.visited, value1: result.scan.depthLimit, value2: ' ' },
            )}
          </p>
        )}
        {!!result?.scan.warnings.length && (
          <p className="text-[10px] text-muted-foreground">
            {t('部分目录不可读取或为符号链接，未纳入扫描。')}
          </p>
        )}
      </div>
      <div className="min-h-20 flex-1 overflow-auto p-3">
        {loading && !result && (
          <p role="status" className="py-4 text-center text-muted-foreground">
            {t('正在读取素材…')}
          </p>
        )}
        {result && result.items.length === 0 && (
          <div className="py-6 text-center leading-relaxed text-muted-foreground">
            <FileImage className="mx-auto mb-2 size-6 opacity-60" />
            <p>
              {query || filter !== 'all' || pageOnly
                ? t('没有符合条件的素材。')
                : t('把图片导入项目，即可在这里预览和复用。')}
            </p>
          </div>
        )}
        <ul className="grid grid-cols-2 gap-2">
          {result?.items.map((asset) => (
            <li key={asset.path}>
              <button
                type="button"
                aria-pressed={selectedPath === asset.path}
                title={asset.path}
                data-hd-asset-path={asset.path}
                draggable={
                  !disabled && !busy && asset.kind === 'image' && asset.status === 'available'
                }
                onDragStart={(event) => {
                  if (disabled || busy || asset.kind !== 'image' || asset.status !== 'available') {
                    event.preventDefault();
                    return;
                  }
                  event.dataTransfer.effectAllowed = 'copy';
                  event.dataTransfer.setData(
                    'application/x-huandeng-asset',
                    JSON.stringify({ path: asset.path }),
                  );
                }}
                onClick={() => {
                  setSelectedPath(asset.path);
                  if (selectedPath !== asset.path) {
                    setDimensions(null);
                    setFailedPreview(null);
                  }
                }}
                className={`w-full overflow-hidden rounded-lg border text-left outline-none motion-safe:transition-colors hover:border-foreground/30 focus-visible:ring-2 focus-visible:ring-ring/40 ${selectedPath === asset.path ? 'border-foreground/40 bg-muted/50' : 'border-border'}`}
              >
                <span className="flex aspect-[4/3] items-center justify-center overflow-hidden bg-muted/35 p-2">
                  {asset.previewable ? (
                    <img
                      src={assetPreviewUrl(asset, true)}
                      alt=""
                      loading="lazy"
                      draggable={false}
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : asset.status === 'available' ? (
                    <FileImage className="size-7 text-muted-foreground/60" />
                  ) : (
                    <ImageOff className="size-7 text-destructive/60" />
                  )}
                </span>
                <span className="block p-2">
                  <span className="block truncate text-xs font-medium">{asset.displayName}</span>
                  <span className="mt-1 block truncate text-[11px] text-muted-foreground">
                    {asset.status !== 'available'
                      ? t('缺失 / 不可读')
                      : asset.usage.length
                        ? t('{value0} 页使用', {
                            value0: new Set(asset.usage.map((usage) => usage.pageId)).size,
                          })
                        : t('主库未引用')}{' '}
                    · {sizeLabel(asset.bytes)}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
        {result?.hasMore && (
          <Button
            variant="outline"
            size="xs"
            className="mt-3 w-full"
            disabled={loading}
            onClick={() => void loadMore()}
          >
            {loading
              ? t('正在加载…')
              : t('加载更多 · 已显示 {value0} / {value1}', {
                  value0: result.items.length,
                  value1: result.total,
                })}
          </Button>
        )}
      </div>
      {selected && (
        <div
          className="max-h-[48%] shrink-0 overflow-auto border-t border-border bg-background p-3"
          data-hd-asset-detail={selected.path}
        >
          <div className="mb-2 flex items-start justify-between gap-2">
            <h3 className="min-w-0 break-words text-xs font-medium">{selected.displayName}</h3>
            <Button variant="ghost" size="xs" onClick={() => setSelectedPath(null)}>
              {t('收起')}
            </Button>
          </div>
          {selected.previewable && failedPreview !== selectedUrl ? (
            <img
              key={selectedUrl}
              src={selectedUrl ?? undefined}
              data-hd-asset-preview={selected.path}
              alt={selected.displayName}
              className="mb-2 max-h-28 w-full rounded bg-muted/30 object-contain"
              onLoad={(event) =>
                setDimensions({
                  path: selected.path,
                  revision: selected.previewRevision,
                  width: event.currentTarget.naturalWidth,
                  height: event.currentTarget.naturalHeight,
                })
              }
              onError={() => setFailedPreview(selectedUrl)}
            />
          ) : (
            <p className="mb-2 text-[11px] text-muted-foreground">
              {selected.status !== 'available'
                ? t('原路径不可用。可定位受影响的页面，并为单个图片对象重新选择文件。')
                : t('此文件暂不支持图片预览。')}
            </p>
          )}
          {readyToInsert && dimensions && (
            <p
              className="mb-2 text-[11px] tabular-nums text-muted-foreground"
              data-hd-asset-dimensions
            >
              {dimensions.width} × {dimensions.height}
              {/\.svg$/i.test(selected.path) ? ' · SVG' : ' px'}
            </p>
          )}
          <details className="text-[11px] text-muted-foreground">
            <summary className="cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring/40">
              {t('文件位置')}
            </summary>
            <p className="mt-1 break-all font-mono">{selected.path}</p>
          </details>
          {selected.previewable && (
            <Button
              size="xs"
              className="mt-2 w-full"
              disabled={disabled || busy || loading || !readyToInsert}
              onClick={() => {
                if (readyToInsert && dimensions) void perform(() => onInsert(selected, dimensions));
              }}
            >
              <Plus />
              {t('复用到当前页')}
            </Button>
          )}
          <h4 className="mb-1 mt-3 text-[11px] font-medium">
            {t('使用位置 · {value0} 处', { value0: selected.usage.length })}
          </h4>
          {!selected.usage.length && (
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              {t('当前主库没有引用。历史版本或项目外的文件仍可能使用它。')}
            </p>
          )}
          <ul className="space-y-1">
            {selected.usage.map((usage) => (
              <li
                key={`${usage.pageId}:${usage.elementId ?? usage.scope}:${usage.field}:${usage.reference}`}
                className="rounded-md border border-border px-2 py-1.5"
              >
                <button
                  type="button"
                  data-hd-asset-usage={`${usage.pageId}:${usage.elementId ?? usage.scope}:${usage.field}`}
                  className="flex w-full items-center gap-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                  onClick={() => onSelectUsage(usage)}
                >
                  <span className="font-medium">{usage.pageLabel}</span>
                  <span className="min-w-0 flex-1 truncate text-[10px] text-muted-foreground">
                    {usage.elementId ?? (usage.scope === 'theme' ? t('主题') : t('页面'))}
                  </span>
                  <ArrowUpRight className="size-3 shrink-0 text-muted-foreground" />
                </button>
                {onReplace &&
                  selected.status !== 'available' &&
                  usage.elementType === 'image' &&
                  usage.field === 'src' && (
                    <Button
                      variant="outline"
                      size="xs"
                      className="mt-1.5 w-full"
                      disabled={disabled || busy || loading}
                      onClick={() => {
                        replacementUsage.current = usage;
                        replacementInput.current?.click();
                      }}
                    >
                      {t('重新选择这处图片')}
                    </Button>
                  )}
              </li>
            ))}
          </ul>
        </div>
      )}
      <input
        ref={importInput}
        type="file"
        multiple
        accept="image/png,image/jpeg,image/svg+xml,image/gif,image/webp"
        className="hidden"
        aria-label={t('导入素材图片')}
        onChange={(event) => {
          const files = Array.from(event.currentTarget.files ?? []);
          event.currentTarget.value = '';
          if (files.length && onImport) void perform(() => onImport(files));
        }}
      />
      <input
        ref={replacementInput}
        type="file"
        accept="image/png,image/jpeg,image/svg+xml,image/gif,image/webp"
        className="hidden"
        aria-label={t('选择缺失图片的替换文件')}
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          const usage = replacementUsage.current;
          event.currentTarget.value = '';
          replacementUsage.current = null;
          if (file && usage && onReplace) void perform(() => onReplace(usage, file));
        }}
      />
    </section>
  );
}
