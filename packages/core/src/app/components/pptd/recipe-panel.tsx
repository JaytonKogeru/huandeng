import { type FormEvent, useId, useState } from 'react';
import { uiText as t, useHuandengLocale } from '@/lib/huandeng-locale';
import { createRecipe, RECIPE_NAMES, type RecipeName } from '../../../pptd/recipes';
import type {
  DeckSnapshot,
  ExpectedRevisions,
  PageSnapshot,
  PptdOperation,
  RecipeBinding,
} from '../../../pptd/types';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';

export interface RecipePanelProps {
  snapshot: DeckSnapshot;
  page: PageSnapshot;
  onApply: (operations: PptdOperation[], expected?: ExpectedRevisions) => Promise<unknown>;
  disabled?: boolean;
}

const RECIPE_LABELS: Record<RecipeName, string> = {
  'figure-with-caption': '主图、图注与旁注',
  'two-evidence-figures': '两张证据图',
  'figure-with-zoom': '主图与局部放大',
};
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

function projectImagePath(value: string): string {
  const normalized = value.trim().replace(/\\/g, '/').replace(/^\.\//, '');
  if (
    !/^(?:media|assets)\/.+/.test(normalized) ||
    normalized.split('/').includes('..') ||
    normalized.includes('\0')
  ) {
    throw new Error('请填写项目 media/ 或 assets/ 中的图片路径。');
  }
  return normalized;
}

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

function RecipePanelPage({ snapshot, page, onApply, disabled }: RecipePanelProps) {
  useHuandengLocale();
  const [recipe, setRecipe] = useState<RecipeName>('figure-with-caption');
  const [sources, setSources] = useState({ figure: '', left: '', right: '' });
  const [texts, setTexts] = useState({
    caption: '',
    annotation: '',
    leftCaption: '',
    rightCaption: '',
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const dataListId = useId();
  const inactive = disabled || pending || !snapshot.writable;
  const components = Object.entries(page.metadata.components ?? {});
  const paths = [
    ...new Set(
      snapshot.pages.flatMap((item) =>
        item.data.elements
          .filter((element) => element.elementType === 'image' && typeof element.src === 'string')
          .map((element) => element.src as string),
      ),
    ),
  ];
  const create = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setPending(true);
    try {
      const assets: Record<string, string> =
        recipe === 'two-evidence-figures'
          ? { left: projectImagePath(sources.left), right: projectImagePath(sources.right) }
          : { figure: projectImagePath(sources.figure) };
      let sequence = 1;
      while (Object.hasOwn(page.metadata.components ?? {}, `evidence-${sequence}`)) sequence++;
      const instanceId = `evidence-${sequence}`;
      const created = createRecipe({
        recipe,
        pageId: page.pageId,
        instanceId,
        size: snapshot.size,
        assets,
        texts,
        existingElementIds: page.data.elements.map((element) => element.elementId),
      });
      const operations: PptdOperation[] = created.elements.map((element) => ({
        op: 'element.add',
        pageId: page.pageId,
        element,
      }));
      operations.push({
        op: 'metadata.patch',
        pageId: page.pageId,
        set: {
          [`components.${instanceId}`]: created.binding,
          ...Object.fromEntries(
            Object.entries(created.elementRoles).map(([elementId, role]) => [
              `elementRoles.${elementId}`,
              role,
            ]),
          ),
        },
      });
      await onApply(operations, {
        pages: { [page.pageId]: page.pageRevision },
        manifest: snapshot.manifestRevision,
        metadata: snapshot.metadataRevision,
      });
      setMessage(`已加入${RECIPE_LABELS[recipe]}，可在画布直接调整。`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setPending(false);
    }
  };
  const assetKeys =
    recipe === 'two-evidence-figures' ? (['left', 'right'] as const) : (['figure'] as const);
  const captionKeys =
    recipe === 'two-evidence-figures'
      ? (['leftCaption', 'rightCaption'] as const)
      : recipe === 'figure-with-caption'
        ? (['caption', 'annotation'] as const)
        : (['caption'] as const);
  return (
    <details className="space-y-4 border-t border-border p-4" aria-label={t('快速布局')}>
      <summary className="cursor-pointer text-xs font-medium">
        {t('快速布局 ')}
        <span className="ml-2 text-[10px] font-normal text-muted-foreground">{t('可选')}</span>
      </summary>
      <p className="text-xs leading-relaxed text-muted-foreground">
        {t('生成一组普通对象。之后可自由移动、改字、裁切或删除；只有点击“应用参数”才会重新排版。')}
      </p>
      <form className="space-y-3" onSubmit={(event) => void create(event)}>
        <fieldset disabled={inactive} className="space-y-3">
          <label className="block space-y-1.5 text-xs text-muted-foreground">
            <span>{t('初始布局')}</span>
            <select
              aria-label={t('初始布局')}
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground"
              value={recipe}
              onChange={(event) => setRecipe(event.target.value as RecipeName)}
              onKeyDown={(event) => event.stopPropagation()}
            >
              {RECIPE_NAMES.map((name) => (
                <option key={name} value={name}>
                  {t(RECIPE_LABELS[name])}
                </option>
              ))}
            </select>
          </label>
          <datalist id={dataListId}>
            {paths.map((path) => (
              <option key={path} value={path} />
            ))}
          </datalist>
          {assetKeys.map((slot) => (
            <label
              key={slot}
              htmlFor={`${dataListId}-asset-${slot}`}
              className="block space-y-1.5 text-xs text-muted-foreground"
            >
              <span>{t('{value0}路径', { value0: t(SLOT_LABELS[slot]) })}</span>
              <Input
                id={`${dataListId}-asset-${slot}`}
                aria-label={t('{value0}路径', { value0: t(SLOT_LABELS[slot]) })}
                list={dataListId}
                placeholder="media/original-figure.png"
                value={sources[slot]}
                required
                onChange={(event) =>
                  setSources((current) => ({ ...current, [slot]: event.target.value }))
                }
              />
            </label>
          ))}
          {captionKeys.map((slot) => (
            <label
              key={slot}
              htmlFor={`${dataListId}-text-${slot}`}
              className="block space-y-1.5 text-xs text-muted-foreground"
            >
              <span>{t(SLOT_LABELS[slot])}</span>
              <Textarea
                id={`${dataListId}-text-${slot}`}
                aria-label={t(SLOT_LABELS[slot])}
                rows={2}
                value={texts[slot]}
                placeholder={t('填写原文，也可留空后编辑')}
                onChange={(event) =>
                  setTexts((current) => ({ ...current, [slot]: event.target.value }))
                }
              />
            </label>
          ))}
          {recipe === 'figure-with-zoom' && (
            <p className="text-[11px] text-muted-foreground">
              {t('放大图引用同一张原图；创建后可在属性面板调整裁切范围。')}
            </p>
          )}
          <Button type="submit" size="sm" disabled={inactive}>
            {pending ? t('正在保存…') : t('加入当前页')}
          </Button>
        </fieldset>
      </form>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {t(error)}
        </p>
      )}
      {message && (
        <p role="status" className="text-xs text-muted-foreground">
          {t(message)}
        </p>
      )}
      {components.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-medium">{t('已使用的快速布局')}</h4>
          {components.map(([instanceId, binding]) => (
            <RecipeCard
              key={instanceId}
              instanceId={instanceId}
              binding={binding}
              snapshot={snapshot}
              page={page}
              onApply={onApply}
              disabled={inactive}
            />
          ))}
        </div>
      )}
    </details>
  );
}

export function RecipePanel(props: RecipePanelProps) {
  useHuandengLocale();
  return <RecipePanelPage key={props.page.pageId} {...props} />;
}

export const PptdRecipePanel = RecipePanel;
