import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { uiText as t, useHuandengLocale } from '@/lib/huandeng-locale';
import { assetVersionUrl } from '@/lib/pptd-asset-revision';
import { pptdAssetUrl } from '@/lib/pptd-backend';
import type { AssetLibraryItem } from '../../../pptd/asset-library';
import { RECIPE_NAMES, type RecipeName } from '../../../pptd/recipes';
import { SlideCanvas } from '../slide-canvas';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Textarea } from '../ui/textarea';
import { RecipeAssetPicker, recipeAssetUrl } from './recipe-asset-picker';
import type { RecipePanelProps } from './recipe-panel';
import {
  commitPreparedRecipe,
  prepareRecipePreview,
  recipePreviewIsCurrent,
} from './recipe-preview';
import { PptdPageRenderer } from './renderer';

export const RECIPE_LABELS: Record<RecipeName, string> = {
  'figure-with-caption': '主图、图注与旁注',
  'two-evidence-figures': '两张证据图',
  'figure-with-zoom': '主图与局部放大',
};
const SLOT_LABELS: Record<string, string> = {
  figure: '主图',
  left: '左图',
  right: '右图',
  caption: '图注',
  annotation: '旁注',
  leftCaption: '左图图注',
  rightCaption: '右图图注',
};

function RecipeDiagram({ recipe }: { recipe: RecipeName }) {
  return (
    <span
      aria-hidden
      className="relative block h-12 w-full overflow-hidden rounded border border-border bg-background"
    >
      <span
        className="absolute left-[8%] top-[12%] h-[58%] rounded-sm bg-brand/25"
        style={{ width: recipe === 'two-evidence-figures' ? '38%' : '53%' }}
      />
      <span
        className="absolute right-[8%] top-[12%] rounded-sm bg-brand/15"
        style={{
          width: recipe === 'two-evidence-figures' ? '38%' : '22%',
          height: recipe === 'figure-with-caption' ? '38%' : '58%',
        }}
      />
      <span className="absolute bottom-[16%] left-[8%] h-0.5 w-[53%] bg-muted-foreground/40" />
      {recipe === 'two-evidence-figures' && (
        <span className="absolute bottom-[16%] right-[8%] h-0.5 w-[38%] bg-muted-foreground/40" />
      )}
    </span>
  );
}

export function RecipeCreation({ snapshot, page, backend, onApply, disabled }: RecipePanelProps) {
  useHuandengLocale();
  const prefix = useId();
  const [recipe, setRecipe] = useState<RecipeName>('figure-with-caption');
  const [assets, setAssets] = useState<Record<string, AssetLibraryItem>>({});
  const [loaded, setLoaded] = useState<Record<string, 'ready' | 'failed'>>({});
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [base, setBase] = useState({ snapshot, page });
  const [picker, setPicker] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState(false);
  const [sourceInvalid, setSourceInvalid] = useState(false);
  const [sourceAttempt, setSourceAttempt] = useState(0);
  const [saveFailed, setSaveFailed] = useState(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const current = useRef({ snapshot, page, disabled });
  current.current = { snapshot, page, disabled };
  const slots = recipe === 'two-evidence-figures' ? ['left', 'right'] : ['figure'];
  const captions =
    recipe === 'two-evidence-figures'
      ? ['leftCaption', 'rightCaption']
      : recipe === 'figure-with-caption'
        ? ['caption', 'annotation']
        : ['caption'];
  const result = useMemo(() => {
    try {
      return { prepared: prepareRecipePreview({ ...base, recipe, assets, texts }), error: null };
    } catch (cause) {
      return { prepared: null, error: cause instanceof Error ? cause.message : String(cause) };
    }
  }, [base, recipe, assets, texts]);
  const prepared = result.prepared;
  const latestPrepared = useRef(prepared);
  latestPrepared.current = prepared;
  const stale = !!prepared && !recipePreviewIsCurrent(prepared, snapshot, page);
  const inactive =
    disabled || pending || !snapshot.writable || !!page.versionId || page.state !== 'active';
  const imagesReady = slots.every(
    (slot) => assets[slot] && loaded[recipeAssetUrl(assets[slot])] === 'ready',
  );
  const canAdd =
    !!backend &&
    !!prepared &&
    !inactive &&
    !stale &&
    imagesReady &&
    !sourceInvalid &&
    !saveFailed &&
    !message;
  const refresh = () => {
    setBase({ snapshot, page });
    setError(null);
    setMessage(false);
    setSaveFailed(false);
  };
  const add = async () => {
    if (!canAdd || !prepared) return;
    setPending(true);
    setError(null);
    setMessage(false);
    try {
      if (!backend) return;
      await commitPreparedRecipe(
        prepared,
        backend,
        onApply,
        () =>
          mounted.current &&
          !current.current.disabled &&
          latestPrepared.current === prepared &&
          recipePreviewIsCurrent(prepared, current.current.snapshot, current.current.page),
      );
      if (!mounted.current) return;
      setMessage(true);
      setPreviewOpen(false);
    } catch (cause) {
      if (!mounted.current) return;
      setSaveFailed(true);
      if (cause instanceof Error && cause.message.startsWith('A source image'))
        setSourceInvalid(true);
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setPending(false);
    }
  };
  const addButton = (
    <Button
      type="button"
      size="sm"
      data-hd-layout-add
      disabled={!canAdd}
      onClick={() => void add()}
    >
      {pending ? t('正在保存…') : t('加入当前页')}
    </Button>
  );
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium">{t('Figure layouts')}</h3>
      <p className="text-xs leading-relaxed text-muted-foreground">
        {t('Choose a layout and original figures, inspect the complete slide, then add it.')}
      </p>
      <div className="grid grid-cols-3 gap-1.5">
        {RECIPE_NAMES.map((name) => (
          <button
            type="button"
            key={name}
            data-hd-layout-recipe={name}
            disabled={inactive}
            aria-pressed={recipe === name}
            className={`min-w-0 space-y-1 rounded-md border p-1.5 text-left text-[10px] leading-snug focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 ${recipe === name ? 'border-brand bg-brand-soft' : 'border-border hover:bg-muted'}`}
            onClick={() => {
              setRecipe(name);
              refresh();
            }}
          >
            <RecipeDiagram recipe={name} />
            <span className="block">{t(RECIPE_LABELS[name])}</span>
          </button>
        ))}
      </div>
      {slots.map((slot) => {
        const asset = assets[slot];
        const url = asset ? recipeAssetUrl(asset) : null;
        return (
          <div key={slot} className="space-y-1">
            <button
              type="button"
              data-hd-layout-source={slot}
              disabled={inactive || !backend}
              className="flex w-full items-center gap-2 rounded border border-border p-2 text-left text-xs hover:bg-muted disabled:opacity-50"
              onClick={() => setPicker(slot)}
            >
              <span className="flex h-14 w-20 shrink-0 items-center justify-center overflow-hidden rounded bg-muted text-muted-foreground">
                {asset && url ? (
                  <img
                    key={`${url}:${sourceAttempt}`}
                    src={url}
                    alt={asset.displayName}
                    className="size-full object-contain"
                    onLoad={() => setLoaded((current) => ({ ...current, [url]: 'ready' }))}
                    onError={() => setLoaded((current) => ({ ...current, [url]: 'failed' }))}
                  />
                ) : (
                  '+'
                )}
              </span>
              <span className="min-w-0">
                <span className="block font-medium">{t(SLOT_LABELS[slot])}</span>
                <span className="mt-1 block truncate text-muted-foreground">
                  {asset?.displayName ?? t('Choose a Project image')}
                </span>
              </span>
            </button>
            {url && loaded[url] === 'failed' && (
              <p role="alert" className="text-xs text-destructive">
                {t('Image unavailable. Choose another image or retry.')}
              </p>
            )}
          </div>
        );
      })}
      {captions.map((slot) => (
        <label
          key={slot}
          htmlFor={`${prefix}-${slot}`}
          className="block space-y-1 text-xs text-muted-foreground"
        >
          <span>{t(SLOT_LABELS[slot])}</span>
          <Textarea
            id={`${prefix}-${slot}`}
            aria-label={t(SLOT_LABELS[slot])}
            data-hd-layout-caption={slot}
            rows={2}
            disabled={inactive}
            value={texts[slot] ?? ''}
            placeholder={t('填写原文，也可留空后编辑')}
            onChange={(event) => {
              setTexts((current) => ({ ...current, [slot]: event.target.value }));
              refresh();
            }}
          />
        </label>
      ))}
      {recipe === 'figure-with-zoom' && (
        <p className="text-[11px] text-muted-foreground">
          {t('放大图引用同一张原图；创建后可在属性面板调整裁切范围。')}
        </p>
      )}
      {!backend && (
        <p role="alert" className="text-xs text-destructive">
          {t('Project image library unavailable.')}
        </p>
      )}
      {slots.every((slot) => assets[slot]) && result.error && (
        <p role="alert" className="text-xs text-destructive">
          {t(result.error)}
        </p>
      )}
      {(stale || saveFailed) && (
        <div className="space-y-2 rounded bg-amber-500/10 p-2 text-xs">
          <p>
            {t(
              stale
                ? 'The slide or Project changed. Refresh the preview before adding.'
                : 'Refresh the layout preview before retrying.',
            )}
          </p>
          <Button type="button" size="sm" variant="outline" disabled={inactive} onClick={refresh}>
            {t('Refresh layout preview')}
          </Button>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          data-hd-layout-preview-open
          disabled={!prepared || !imagesReady}
          onClick={() => setPreviewOpen(true)}
        >
          {t('Preview full slide')}
        </Button>
        {!previewOpen && addButton}
      </div>
      {sourceInvalid && (
        <p role="alert" className="text-xs text-destructive">
          {t('A source image changed or is unavailable. Choose the source again before adding.')}
        </p>
      )}
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        {t('Preview is local. Existing objects stay in place; inspect overlaps before adding.')}
      </p>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {t(error)}
        </p>
      )}
      {message && (
        <p role="status" className="text-xs text-muted-foreground">
          {t('Layout added. Open its saved receipt in Activity to review changes.')}
        </p>
      )}
      {picker && backend && (
        <RecipeAssetPicker
          key={picker}
          backend={backend}
          onClose={() => setPicker(null)}
          onChoose={(asset) => {
            setAssets((current) => ({ ...current, [picker]: asset }));
            setSourceInvalid(false);
            setSourceAttempt((value) => value + 1);
            setLoaded((current) => {
              const next = { ...current };
              delete next[recipeAssetUrl(asset)];
              return next;
            });
            setPicker(null);
            refresh();
          }}
        />
      )}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent
          className="flex h-[min(86vh,760px)] w-[94vw] max-w-[1200px] flex-col overflow-hidden sm:max-w-[1200px]"
          onKeyDown={(event) => event.stopPropagation()}
        >
          <DialogHeader>
            <DialogTitle>{t('Full slide layout preview')}</DialogTitle>
            <DialogDescription>
              {t(
                'Existing objects and proposed additions, in their final order. Add saves this prepared layout.',
              )}
            </DialogDescription>
          </DialogHeader>
          {(stale || saveFailed) && (
            <p role="alert" className="text-xs text-amber-700 dark:text-amber-300">
              {t(
                stale
                  ? 'The slide or Project changed. Refresh the preview before adding.'
                  : 'Refresh the layout preview before retrying.',
              )}
            </p>
          )}
          {error && (
            <p role="alert" className="text-xs text-destructive">
              {t(error)}
            </p>
          )}
          <div data-hd-layout-preview className="relative min-h-0 flex-1 bg-canvas p-3">
            {prepared && (
              <SlideCanvas width={prepared.size[0]} height={prepared.size[1]} flat freezeMotion>
                <PptdPageRenderer
                  page={prepared.page}
                  size={prepared.size}
                  theme={prepared.theme}
                  assetUrl={(path) =>
                    Object.hasOwn(prepared.assetHints, path)
                      ? assetVersionUrl(pptdAssetUrl(path), prepared.assetHints[path])
                      : pptdAssetUrl(path)
                  }
                />
              </SlideCanvas>
            )}
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" size="sm" variant="outline" disabled={inactive} onClick={refresh}>
              {t('Refresh layout preview')}
            </Button>
            {addButton}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
