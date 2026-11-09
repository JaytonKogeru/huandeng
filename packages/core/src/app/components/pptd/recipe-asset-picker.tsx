import { useEffect, useId, useState } from 'react';
import { uiText as t, useHuandengLocale } from '@/lib/huandeng-locale';
import { assetVersionUrl } from '@/lib/pptd-asset-revision';
import { type PptdBackend, pptdAssetPreviewUrl } from '@/lib/pptd-backend';
import type { AssetLibraryItem, AssetLibraryResult } from '../../../pptd/asset-library';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { projectImagePath } from './recipe-preview';

export function recipeAssetUrl(asset: AssetLibraryItem) {
  return assetVersionUrl(pptdAssetPreviewUrl(asset.path), asset.previewRevision);
}

export function RecipeAssetPicker({
  backend,
  onChoose,
  onClose,
}: {
  backend: Pick<PptdBackend, 'assets'>;
  onChoose: (asset: AssetLibraryItem) => void;
  onClose: () => void;
}) {
  useHuandengLocale();
  const id = useId();
  const [query, setQuery] = useState('');
  const [path, setPath] = useState('');
  const [offset, setOffset] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<AssetLibraryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState<Set<string>>(new Set());
  // biome-ignore lint/correctness/useExhaustiveDependencies: Retry explicitly repeats the bounded search after a network or image error.
  useEffect(() => {
    let active = true;
    setLoading(true);
    setResult(null);
    setError(null);
    const timer = setTimeout(() => {
      void backend
        .assets({ query, kind: 'image', offset, limit: 12 })
        .then((value) => {
          if (active) setResult(value);
        })
        .catch((cause: unknown) => {
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
  }, [backend, query, offset, attempt]);
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        className="max-h-[90vh] overflow-auto sm:max-w-2xl"
        onKeyDown={(event) => event.stopPropagation()}
      >
        <DialogHeader>
          <DialogTitle>{t('Choose a Project image')}</DialogTitle>
          <DialogDescription>
            {t('Original figures stay intact. Search or browse 12 images at a time.')}
          </DialogDescription>
        </DialogHeader>
        <Input
          type="search"
          aria-label={t('Search Project images')}
          placeholder={t('Search Project images')}
          value={query}
          maxLength={256}
          onChange={(event) => {
            setQuery(event.target.value);
            setOffset(0);
          }}
        />
        {loading && (
          <p role="status" className="text-xs text-muted-foreground">
            {t('Loading images…')}
          </p>
        )}
        {error && (
          <p role="alert" className="text-xs text-destructive">
            {t(error)}
          </p>
        )}
        <div className="grid grid-cols-3 gap-2">
          {result?.items.map((asset) => {
            const url = recipeAssetUrl(asset);
            const available = asset.status === 'available' && asset.previewable && !failed.has(url);
            return (
              <button
                type="button"
                key={asset.path}
                data-hd-layout-asset={asset.path}
                disabled={!available || loading}
                className="min-w-0 space-y-1 rounded border border-border p-2 text-left text-xs hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                onClick={() => onChoose(asset)}
              >
                <span className="flex h-24 items-center justify-center overflow-hidden rounded bg-muted">
                  {available ? (
                    <img
                      src={url}
                      alt={asset.displayName}
                      className="size-full object-contain"
                      onError={() => setFailed((current) => new Set(current).add(url))}
                    />
                  ) : (
                    <span>{t('Image unavailable')}</span>
                  )}
                </span>
                <span className="block truncate" title={asset.path}>
                  {asset.displayName}
                </span>
                {!available && (
                  <span className="block text-muted-foreground">
                    {t(asset.status === 'missing' ? 'Missing image' : 'Image unavailable')}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {result && !result.items.length && (
          <p className="text-xs text-muted-foreground">{t('No matching Project images.')}</p>
        )}
        {result?.truncated && (
          <p className="text-xs text-amber-700 dark:text-amber-300">
            {t('Asset scan is limited. Narrow the search or enter a Project path.')}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={loading || offset === 0}
            onClick={() => setOffset((value) => Math.max(0, value - 12))}
          >
            {t('Previous')}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={loading || !result?.hasMore}
            onClick={() => setOffset((value) => value + 12)}
          >
            {t('Next')}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={loading}
            onClick={() => {
              setFailed(new Set());
              setAttempt((value) => value + 1);
            }}
          >
            {t('Retry')}
          </Button>
          {result && (
            <span className="text-xs text-muted-foreground">
              {t('Images {start}–{end} of {total}', {
                start: result.items.length ? offset + 1 : 0,
                end: offset + result.items.length,
                total: result.total,
              })}
            </span>
          )}
        </div>
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer">{t('Advanced: Project image path')}</summary>
          <div className="mt-2 flex gap-2">
            <label className="sr-only" htmlFor={id}>
              {t('Project image path')}
            </label>
            <Input
              id={id}
              value={path}
              maxLength={256}
              placeholder="media/original.png"
              onChange={(event) => setPath(event.target.value)}
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                try {
                  setQuery(projectImagePath(path));
                  setOffset(0);
                  setAttempt((value) => value + 1);
                } catch (cause) {
                  setError(cause instanceof Error ? cause.message : String(cause));
                }
              }}
            >
              {t('Find image')}
            </Button>
          </div>
        </details>
      </DialogContent>
    </Dialog>
  );
}
