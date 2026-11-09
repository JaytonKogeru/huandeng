import { useId, useState } from 'react';
import { uiText as t, useHuandengLocale } from '@/lib/huandeng-locale';
import type { PptdBackend } from '@/lib/pptd-backend';
import { RECIPE_NAMES, type RecipeName } from '../../../pptd/recipes';
import type {
  DeckSnapshot,
  ExpectedRevisions,
  PageSnapshot,
  PptdOperation,
  RecipeBinding,
} from '../../../pptd/types';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { RECIPE_LABELS, RecipeCreation } from './recipe-creation';
import { TitleLayoutPanel } from './title-layout-panel';

export interface RecipePanelProps {
  backend?: Pick<PptdBackend, 'assets'>;
  snapshot: DeckSnapshot;
  page: PageSnapshot;
  onApply: (operations: PptdOperation[], expected?: ExpectedRevisions) => Promise<unknown>;
  disabled?: boolean;
  selectedIds?: string[];
  onSelectTitle?: (elementId: string) => void;
}

const SLOT_LABELS: Record<string, string> = {
  figure: '主图',
  caption: '图注',
  annotation: '旁注',
  left: '左图',
  leftCaption: '左图图注',
  right: '右图',
  rightCaption: '右图图注',
  zoom: '放大图',
  guide: '指引线',
};
const GROUP_LABELS: Record<string, string> = {
  geometry: '位置与尺寸',
  crop: '裁切',
  font: '字体',
  appearance: '外观',
  content: '文字',
  asset: '原图',
};
const LAYOUT_FIELDS = [
  { name: 'margin', label: '页边距', min: 0 },
  { name: 'gap', label: '图间距', min: 0 },
  { name: 'captionFontSize', label: '图注字号', min: 1 },
] as const;

function layoutChanges(draft: Record<string, string>): Record<string, unknown> {
  const params: Record<string, unknown> = {};
  for (const field of LAYOUT_FIELDS) {
    if (draft[field.name] === undefined) continue;
    const value = Number(draft[field.name]);
    if (!draft[field.name].trim() || !Number.isFinite(value) || value < field.min) {
      throw new Error(`${t(field.label)}需要填写不小于 ${field.min} 的数值。`);
    }
    params[field.name] = value;
  }
  return params;
}

function RecipeCard({
  instanceId,
  binding,
  snapshot,
  page,
  onApply,
  disabled,
}: RecipePanelProps & { instanceId: string; binding: RecipeBinding }) {
  useHuandengLocale();
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [draftBase, setDraftBase] = useState<string | null | undefined>(undefined);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fieldPrefix = useId();
  const supported =
    RECIPE_NAMES.includes(binding.recipe as RecipeName) && binding.recipeVersion === 1;
  const stale = draftBase !== undefined && draftBase !== snapshot.metadataRevision;
  const inactive = disabled || pending || !supported || !snapshot.writable;
  const overrides = Object.entries(binding.overrides ?? {}).filter(([, groups]) => groups.length);
  const deleted = Object.entries(binding.slots ?? {}).filter(([, elementId]) => elementId === null);
  const run = async (reset: boolean) => {
    setError(null);
    setPending(true);
    try {
      const params = layoutChanges(draft);
      await onApply(
        [
          reset
            ? {
                op: 'recipe.reset',
                pageId: page.pageId,
                instanceId,
                params,
                reset: { groups: ['geometry', 'crop', 'font', 'appearance'] },
              }
            : { op: 'recipe.apply', pageId: page.pageId, instanceId, params },
        ],
        {
          pages: { [page.pageId]: page.pageRevision },
          manifest: snapshot.manifestRevision,
          metadata: snapshot.metadataRevision,
        },
      );
      setDraft({});
      setDraftBase(undefined);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setPending(false);
    }
  };
  const detach = async () => {
    setError(null);
    setPending(true);
    try {
      await onApply(
        [
          {
            op: 'metadata.patch',
            pageId: page.pageId,
            set: {},
            unset: [`components.${instanceId}`],
          },
        ],
        { metadata: snapshot.metadataRevision },
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setPending(false);
    }
  };
  return (
    <article className="space-y-3 rounded-md border border-border p-3">
      <div className="space-y-1">
        <h4 className="text-sm font-medium">
          {t(RECIPE_LABELS[binding.recipe as RecipeName] ?? binding.recipe)}
        </h4>
        <p className="font-mono text-[11px] text-muted-foreground">{instanceId}</p>
      </div>
      {!supported && (
        <p className="text-xs text-amber-700 dark:text-amber-300">
          {t('此布局版本暂不支持更新，现有对象可继续编辑。')}
        </p>
      )}
      {supported && (
        <div className="grid grid-cols-3 gap-2">
          {LAYOUT_FIELDS.map((field) => (
            <label
              key={field.name}
              htmlFor={`${fieldPrefix}-${field.name}`}
              className="space-y-1 text-xs text-muted-foreground"
            >
              <span>{t(field.label)}</span>
              <Input
                id={`${fieldPrefix}-${field.name}`}
                aria-label={`${instanceId} ${t(field.label)}`}
                type="number"
                min={field.min}
                step="0.5"
                disabled={inactive}
                value={draft[field.name] ?? String(binding.params[field.name] ?? '')}
                className="h-8 px-2 text-xs"
                onChange={(event) => {
                  if (draftBase === undefined) setDraftBase(snapshot.metadataRevision);
                  setDraft((current) => ({ ...current, [field.name]: event.target.value }));
                }}
              />
            </label>
          ))}
        </div>
      )}
      <div className="space-y-1 text-xs text-muted-foreground">
        {overrides.length ? (
          <>
            <p className="font-medium text-foreground">{t('应用时保留的作者调整')}</p>
            <ul className="space-y-1 pl-3">
              {overrides.map(([slot, groups]) => (
                <li key={slot}>
                  {t(SLOT_LABELS[slot] ?? slot)}：
                  {groups.map((group) => t(GROUP_LABELS[group] ?? group)).join('、')}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p>{t('尚无手动调整，可更新布局参数。')}</p>
        )}
        {deleted.length > 0 && (
          <p>
            {t('已删除：{value0}；更新后保持删除。', {
              value0: deleted.map(([slot]) => t(SLOT_LABELS[slot] ?? slot)).join('、'),
            })}
          </p>
        )}
      </div>
      {stale && (
        <div className="space-y-2 rounded bg-amber-50 p-2 text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-100">
          <p>{t('布局参数已从另一处更新。请载入最新参数后再调整。')}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setDraft({});
              setDraftBase(undefined);
            }}
          >
            {t('载入最新参数')}
          </Button>
        </div>
      )}
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {t(error)}
        </p>
      )}
      {supported && (
        <>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              disabled={inactive || stale}
              onClick={() => void run(false)}
            >
              {pending ? t('正在保存…') : t('应用参数')}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={inactive || stale}
              onClick={() => void run(true)}
            >
              {t('恢复布局设置')}
            </Button>
          </div>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            {t('恢复布局设置会重新设置位置、裁切、字体和外观。原图与作者文字保留。')}
          </p>
        </>
      )}
      <Button
        type="button"
        variant="ghost"
        size="xs"
        className="px-0 text-muted-foreground"
        disabled={disabled || pending || !snapshot.writable}
        onClick={() => void detach()}
      >
        {t('解除布局关联，保留全部对象')}
      </Button>
    </article>
  );
}

function RecipePanelPage(props: RecipePanelProps) {
  useHuandengLocale();
  const { snapshot, page, disabled } = props;
  const inactive = disabled || !snapshot.writable || !!page.versionId;
  const components = Object.entries(page.metadata.components ?? {});
  return (
    <section className="space-y-5 p-3" aria-label={t('Layout')}>
      <RecipeCreation {...props} />
      <details className="border-t border-border pt-3">
        <summary className="cursor-pointer text-xs font-medium">{t('Match title style')}</summary>
        <div className="pt-3">
          <TitleLayoutPanel {...props} disabled={inactive} />
        </div>
      </details>
      {components.length > 0 && (
        <div className="space-y-3 border-t border-border pt-3">
          <h4 className="text-xs font-medium">{t('已使用的快速布局')}</h4>
          {components.map(([instanceId, binding]) => (
            <RecipeCard
              key={instanceId}
              {...props}
              instanceId={instanceId}
              binding={binding}
              disabled={inactive}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export function RecipePanel(props: RecipePanelProps) {
  useHuandengLocale();
  return (
    <RecipePanelPage
      key={`${props.snapshot.deckId}:${props.snapshot.entry}:${props.page.pageId}:${props.page.versionId ?? 'live'}`}
      {...props}
    />
  );
}

export const PptdRecipePanel = RecipePanel;
