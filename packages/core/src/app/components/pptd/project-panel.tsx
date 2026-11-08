import { ArrowDown, ArrowUp, BookOpen, Minus, Plus, Save, Trash2 } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { getUiLocale, uiText as t, useHuandengLocale } from '@/lib/huandeng-locale';
import { projectSlideSearch, projectSlideTitle } from '@/lib/pptd-project-source';
import {
  emptyStory,
  type PresentationItem,
  type ProjectModel,
  type ProjectPresentation,
  type ProjectReplaceOperation,
  readProjectModel,
  resolvePresentation,
  resolveProjectSections,
  type StoryOutline,
  validateProjectModel,
} from '../../../pptd/project-model';
import type { DeckSnapshot, ExpectedRevisions, PageVersionSummary } from '../../../pptd/types';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { ProjectSectionEditor } from './project-section-editor';
import { ProjectSlidePreview, ProjectSourcePicker } from './project-source-picker';

export interface ProjectPanelProps {
  snapshot: DeckSnapshot;
  currentPageId?: string | null;
  selectedPresentationId: string | null;
  onSelectPresentation: (id: string | null) => void;
  onSelectPage: (pageId: string) => void;
  onSelectOccurrence?: (presentationId: string, pageId: string, occurrenceId: string) => void;
  onApply: (operations: ProjectReplaceOperation[], expected: ExpectedRevisions) => Promise<unknown>;
  onDirtyChange?: (dirty: boolean) => void;
  loadVersions?: (pageId: string) => Promise<PageVersionSummary[]>;
  disabled?: boolean;
}

const fieldClass =
  'w-full rounded border border-border bg-background px-2 py-1.5 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-50';

function move<T>(items: T[], index: number, delta: number): T[] {
  const next = [...items];
  const target = index + delta;
  if (index < 0 || target < 0 || target >= items.length) return next;
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

function StoryFields({
  value,
  onChange,
  disabled,
}: {
  value: StoryOutline;
  onChange: (value: StoryOutline) => void;
  disabled: boolean;
}) {
  useHuandengLocale();
  const prefix = useId();
  return (
    <div className="space-y-2">
      {(
        [
          ['purpose', '问题与目的', '这个故事要回答什么问题？'],
          ['audience', '听众', '这次面向哪些听众？'],
          ['takeaway', '核心结论', '希望听众记住什么？'],
        ] as const
      ).map(([key, title, placeholder]) => (
        <div key={key} className="space-y-1">
          <label className="text-[11px] text-muted-foreground" htmlFor={`${prefix}-${key}`}>
            {t(title)}
          </label>
          <Textarea
            id={`${prefix}-${key}`}
            className="min-h-14 text-xs"
            value={value[key]}
            placeholder={t(placeholder)}
            disabled={disabled}
            onChange={(event) => onChange({ ...value, [key]: event.target.value })}
          />
        </div>
      ))}
    </div>
  );
}

function OrderButtons({
  index,
  length,
  label,
  disabled,
  onMove,
  onRemove,
}: {
  index: number;
  length: number;
  label: string;
  disabled: boolean;
  onMove: (delta: number) => void;
  onRemove: () => void;
}) {
  useHuandengLocale();
  return (
    <div className="flex shrink-0 gap-0.5">
      <Button
        variant="ghost"
        size="icon-xs"
        title={t('上移{value0}', { value0: label })}
        aria-label={t('上移{value0}', { value0: label })}
        disabled={disabled || index === 0}
        onClick={() => onMove(-1)}
      >
        <ArrowUp />
      </Button>
      <Button
        variant="ghost"
        size="icon-xs"
        title={t('下移{value0}', { value0: label })}
        aria-label={t('下移{value0}', { value0: label })}
        disabled={disabled || index === length - 1}
        onClick={() => onMove(1)}
      >
        <ArrowDown />
      </Button>
      <Button
        variant="ghost"
        size="icon-xs"
        title={t('移除{value0}', { value0: label })}
        aria-label={t('移除{value0}', { value0: label })}
        disabled={disabled}
        onClick={onRemove}
      >
        <Trash2 />
      </Button>
    </div>
  );
}

export function ProjectPanel(props: ProjectPanelProps) {
  useHuandengLocale();
  const parsed = useMemo(() => {
    try {
      return { project: readProjectModel(props.snapshot.metadata), error: null };
    } catch (error) {
      return {
        project: null,
        error: error instanceof Error ? error.message : '项目编排数据无效。',
      };
    }
  }, [props.snapshot.metadata]);
  if (!parsed.project)
    return (
      <section className="p-4 text-xs text-destructive" role="alert">
        {t(parsed.error)}
      </section>
    );
  return <ProjectPanelEditor {...props} persisted={parsed.project} />;
}

function ProjectPanelEditor({
  snapshot,
  currentPageId,
  selectedPresentationId,
  onSelectPresentation,
  onSelectPage,
  onSelectOccurrence,
  onApply,
  loadVersions,
  onDirtyChange,
  disabled = false,
  persisted,
}: ProjectPanelProps & { persisted: ProjectModel }) {
  useHuandengLocale();
  const prefix = useId();
  const [draft, setDraft] = useState(persisted);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [base, setBase] = useState<ExpectedRevisions>({
    metadata: snapshot.metadataRevision,
    manifest: snapshot.manifestRevision,
  });
  const [editingId, setEditingId] = useState<string | null>(selectedPresentationId);
  const [sourcePickerOpen, setSourcePickerOpen] = useState(selectedPresentationId !== null);
  const [addedMessage, setAddedMessage] = useState<string | null>(null);
  const [itemQuery, setItemQuery] = useState('');
  const [locatedItemId, setLocatedItemId] = useState<string | null>(null);
  const itemRefs = useRef(new Map<string, HTMLFieldSetElement>());
  const [message, setMessage] = useState<string | null>(null);
  const [versions, setVersions] = useState<Record<string, PageVersionSummary[]>>({});
  const [loadingVersions, setLoadingVersions] = useState<string[]>([]);
  const remoteChanged =
    dirty &&
    (base.metadata !== snapshot.metadataRevision || base.manifest !== snapshot.manifestRevision);
  const readonly = disabled || saving || !snapshot.writable || remoteChanged;
  const presentation = draft.presentations.find((item) => item.id === editingId);
  const sections = useMemo(() => resolveProjectSections(snapshot, draft), [snapshot, draft]);
  const resolution = useMemo(() => {
    if (!presentation) return null;
    try {
      return resolvePresentation(
        { ...snapshot, metadata: { ...snapshot.metadata, project: draft } },
        presentation.id,
      );
    } catch {
      return null;
    }
  }, [draft, presentation, snapshot]);

  useEffect(() => {
    if (dirty) return;
    setDraft(persisted);
    setBase({ metadata: snapshot.metadataRevision, manifest: snapshot.manifestRevision });
  }, [dirty, persisted, snapshot.metadataRevision, snapshot.manifestRevision]);

  useEffect(() => {
    setEditingId(selectedPresentationId);
    setSourcePickerOpen(selectedPresentationId !== null);
    setAddedMessage(null);
  }, [selectedPresentationId]);

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const edit = (update: (previous: ProjectModel) => ProjectModel) => {
    setDraft(update);
    setDirty(true);
    setMessage(null);
  };
  const updatePresentation = (update: (previous: ProjectPresentation) => ProjectPresentation) => {
    edit((previous) => ({
      ...previous,
      presentations: previous.presentations.map((item) =>
        item.id === editingId ? update(item) : item,
      ),
    }));
  };
  const updateItem = (itemId: string, update: (previous: PresentationItem) => PresentationItem) => {
    updatePresentation((previous) => ({
      ...previous,
      items: previous.items.map((item) => (item.id === itemId ? update(item) : item)),
    }));
  };
  const pageCode = (pageId: string) =>
    snapshot.metadata.slides[pageId]?.shortCode ??
    snapshot.metadata.slides[pageId]?.label ??
    pageId;
  const pageLabel = (pageId: string) => {
    const page = snapshot.pages.find((item) => item.pageId === pageId);
    return page ? projectSlideTitle(page) : pageCode(pageId);
  };
  const pageHint = (pageId: string) => {
    return `${pageLabel(pageId)}\n${t('Slide ID')}: ${pageCode(pageId)}\n${t('Permanent ID')}: ${pageId}`;
  };
  const searchablePage = (pageId: string) => {
    const page = snapshot.pages.find((item) => item.pageId === pageId);
    if (page) return projectSlideSearch(page);
    const metadata = snapshot.metadata.slides[pageId];
    return [pageId, metadata?.shortCode, metadata?.label, metadata?.path]
      .filter(Boolean)
      .join(' ')
      .toLocaleLowerCase();
  };
  const searchableSection = (sectionId: string) => {
    const section = sections.find((candidate) => candidate.section.id === sectionId);
    return [section?.section.title, ...(section?.pageIds.map(searchablePage) ?? [])]
      .join(' ')
      .toLocaleLowerCase();
  };
  const itemNeedle = itemQuery.trim().toLocaleLowerCase();
  const matchingItems = itemNeedle
    ? (presentation?.items.filter((item) =>
        (item.kind === 'page'
          ? searchablePage(item.pageId)
          : searchableSection(item.sectionId)
        ).includes(itemNeedle),
      ) ?? [])
    : [];
  const locatedIndex = matchingItems.findIndex((item) => item.id === locatedItemId);
  const locateItem = (direction: -1 | 1) => {
    if (!matchingItems.length) return;
    const index =
      locatedIndex < 0
        ? direction === 1
          ? 0
          : matchingItems.length - 1
        : (locatedIndex + direction + matchingItems.length) % matchingItems.length;
    const id = matchingItems[index].id;
    setLocatedItemId(id);
    const target = itemRefs.current.get(id);
    target?.scrollIntoView({ block: 'center' });
    target
      ?.querySelector<HTMLElement>(
        'button:not(:disabled), select:not(:disabled), input:not(:disabled)',
      )
      ?.focus({ preventScroll: true });
  };
  const selectCollection = (id: string | null) => {
    setEditingId(id);
    setSourcePickerOpen(id !== null);
    setAddedMessage(null);
    if (id === null || persisted.presentations.some((item) => item.id === id))
      onSelectPresentation(id);
  };
  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const project = validateProjectModel(draft);
      await onApply([{ op: 'project.replace', project }], base);
      setDirty(false);
      const nextId =
        editingId && project.presentations.some((item) => item.id === editingId) ? editingId : null;
      if (nextId !== selectedPresentationId) onSelectPresentation(nextId);
      setMessage('项目已保存。');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '项目保存未完成，请重试。');
    } finally {
      setSaving(false);
    }
  };
  const reload = () => {
    setDraft(persisted);
    setDirty(false);
    setBase({ metadata: snapshot.metadataRevision, manifest: snapshot.manifestRevision });
    const id =
      editingId && persisted.presentations.some((item) => item.id === editingId) ? editingId : null;
    setEditingId(id);
    onSelectPresentation(id);
    setMessage(null);
  };
  const fetchVersions = async (pageId: string) => {
    if (!loadVersions || loadingVersions.includes(pageId)) return;
    setLoadingVersions((previous) => [...previous, pageId]);
    try {
      const result = await loadVersions(pageId);
      setVersions((previous) => ({
        ...previous,
        [pageId]: result.filter((version) => version.kind === 'checkpoint'),
      }));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '无法读取已记录的页面版本。');
    } finally {
      setLoadingVersions((previous) => previous.filter((id) => id !== pageId));
    }
  };

  const addSource = (kind: 'page' | 'section', sourceId: string) => {
    setSourcePickerOpen(true);
    const id = crypto.randomUUID();
    const item: PresentationItem =
      kind === 'page' ? { id, kind, pageId: sourceId } : { id, kind, sectionId: sourceId };
    updatePresentation((previous) => ({ ...previous, items: [...previous.items, item] }));
    const title =
      kind === 'page'
        ? pageLabel(sourceId)
        : (draft.sections.find((section) => section.id === sourceId)?.title ?? sourceId);
    setAddedMessage(t('Added: {title}. Save Project when your arrangement is ready.', { title }));
  };

  const setSectionRange = (
    sectionId: string,
    startPageId: string,
    endPageId: string,
  ): string | null => {
    const ids = snapshot.pages.filter((page) => page.state === 'active').map((page) => page.pageId);
    const start = ids.indexOf(startPageId);
    const end = ids.indexOf(endPageId);
    if (start < 0 || end < 0) return 'Choose available Main Slides for both boundaries.';
    if (start > end) return 'Start Position must be before or equal to End Position.';
    const next: ProjectModel = {
      ...draft,
      sections: draft.sections.map((section) => {
        if (section.id !== sectionId) return section;
        const { startPageId: _start, ...previous } = section;
        return {
          ...previous,
          pageIds: ids.slice(start, end + 1),
          range: { startPageId, endPageId },
        };
      }),
    };
    return setSectionDefinition(sectionId, next);
  };
  const setSectionStart = (sectionId: string, startPageId: string): string | null => {
    if (!snapshot.pages.some((page) => page.state === 'active' && page.pageId === startPageId))
      return 'Choose an available Main Slide as the first Slide.';
    const next: ProjectModel = {
      ...draft,
      sections: draft.sections.map((section) => {
        if (section.id !== sectionId) return section;
        const { range: _range, ...previous } = section;
        return { ...previous, startPageId, pageIds: [startPageId] };
      }),
    };
    return setSectionDefinition(sectionId, next);
  };
  const setSectionDefinition = (sectionId: string, next: ProjectModel): string | null => {
    const existing = new Set(
      sections.flatMap((item) =>
        item.diagnostics.map(
          (diagnostic) => `${item.section.id}:${diagnostic.code}:${diagnostic.pageId ?? ''}`,
        ),
      ),
    );
    for (const item of resolveProjectSections(snapshot, next)) {
      const error = item.diagnostics.find(
        (diagnostic) =>
          // Missing covers can be repaired one by one in this draft; saving still validates all Sections.
          diagnostic.code !== 'SECTION_END_UNRESOLVED' &&
          (item.section.id === sectionId ||
            !existing.has(`${item.section.id}:${diagnostic.code}:${diagnostic.pageId ?? ''}`)),
      );
      if (error) return error.message;
    }
    edit(() => next);
    return null;
  };

  return (
    <section
      className="space-y-4 p-3 text-xs outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/40"
      aria-label={t('项目与故事')}
      data-hd-project
      data-hd-project-editor
      tabIndex={-1}
    >
      <div className="space-y-2">
        <div className="flex items-center gap-2 font-semibold">
          <BookOpen className="size-3.5" />
          {t(' 项目与故事')}
        </div>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          {t('项目保留一份主幻灯片。按需要引用其中的页面，编排不同的演讲。')}
        </p>
        <label htmlFor={`${prefix}-collection`} className="sr-only">
          {t('幻灯片集合')}
        </label>
        <select
          id={`${prefix}-collection`}
          className={fieldClass}
          value={editingId ?? ''}
          disabled={saving}
          onChange={(event) => selectCollection(event.target.value || null)}
        >
          <option value="">
            {t('主幻灯片（Main Slides） · {value0} 页', { value0: snapshot.pages.length })}
          </option>
          {draft.presentations.map((item) => (
            <option key={item.id} value={item.id}>
              {item.title || t('未命名演讲')}
              {persisted.presentations.some((saved) => saved.id === item.id) ? '' : t(' · 未保存')}
            </option>
          ))}
        </select>
        <div className="flex flex-wrap gap-1.5">
          <Button
            size="xs"
            variant="outline"
            disabled={readonly}
            onClick={() => {
              const id = crypto.randomUUID();
              edit((previous) => ({
                ...previous,
                presentations: [
                  ...previous.presentations,
                  {
                    id,
                    title: t('演讲 {value0}', { value0: previous.presentations.length + 1 }),
                    story: emptyStory(),
                    items: [],
                  },
                ],
              }));
              setEditingId(id);
              setSourcePickerOpen(true);
              setAddedMessage(null);
            }}
          >
            <Plus />
            {t(' 新建演讲')}
          </Button>
          <Button size="xs" disabled={readonly || !dirty} onClick={() => void save()}>
            <Save />
            {saving ? t('正在保存…') : t('保存项目')}
          </Button>
          {dirty && (
            <Button size="xs" variant="ghost" disabled={saving} onClick={reload}>
              {t('放弃草稿')}
            </Button>
          )}
        </div>
        {dirty && (
          <p className="text-[11px] text-amber-700 dark:text-amber-400">
            {t('项目编排有未保存的修改，保存后可放映或导出。')}
          </p>
        )}
        {remoteChanged && (
          <div className="space-y-2">
            <p className="text-[11px] text-destructive" role="alert">
              {t(
                '项目已从另一处更新，你的草稿仍保留在这里。可复制草稿后放弃本地修改，读取最新项目。',
              )}
            </p>
            <details>
              <summary className="cursor-pointer text-[11px]">
                {t('查看并复制未保存的草稿')}
              </summary>
              <Textarea
                className="mt-2 min-h-32 font-mono text-[10px]"
                aria-label={t('未保存的项目草稿')}
                readOnly
                value={JSON.stringify(draft, null, 2)}
                onFocus={(event) => event.target.select()}
              />
            </details>
          </div>
        )}
        {message && (
          <p className="break-words text-[11px]" role="status">
            {t(message)}
          </p>
        )}
      </div>

      {presentation ? (
        <div className="space-y-4" data-hd-presentation-editor>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center justify-between gap-1">
              <label htmlFor={`${prefix}-presentation-title`} className="font-medium">
                {t('演讲名称')}
              </label>
              <Button
                size="xs"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                disabled={readonly}
                data-hd-delete-presentation
                title={t('Delete this Presentation from the draft. Main Slides are kept.')}
                onClick={() => {
                  edit((previous) => ({
                    ...previous,
                    presentations: previous.presentations.filter(
                      (item) => item.id !== presentation.id,
                    ),
                  }));
                  setEditingId(null);
                  setMessage(
                    'Presentation removed from the draft. Save Project to confirm, or discard the draft to restore it. Main Slides are kept.',
                  );
                }}
              >
                <Trash2 />
                {t('Delete Presentation')}
              </Button>
            </div>
            <input
              id={`${prefix}-presentation-title`}
              className={fieldClass}
              value={presentation.title}
              maxLength={240}
              disabled={readonly}
              onChange={(event) =>
                updatePresentation((previous) => ({ ...previous, title: event.target.value }))
              }
            />
            <p className="text-[10px] text-muted-foreground">
              {t('Deleting a Presentation keeps its Main Slides and saved Slide versions.')}
            </p>
          </div>
          <details>
            <summary className="mb-2 cursor-pointer font-medium">{t('Presentation Story')}</summary>
            <StoryFields
              value={presentation.story}
              disabled={readonly}
              onChange={(value) =>
                updatePresentation((previous) => ({ ...previous, story: value }))
              }
            />
          </details>
          <div className="space-y-2">
            <h3 className="font-medium">{t('编排演讲幻灯片')}</h3>
            <p className="text-[11px] text-muted-foreground">
              {t('引用章节时跟随章节页序，同一页面也可以在演讲中多次出现。')}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-center"
              aria-expanded={sourcePickerOpen}
              data-hd-open-source-picker
              onClick={() => setSourcePickerOpen((open) => !open)}
            >
              {sourcePickerOpen ? <Minus /> : <Plus />}
              {sourcePickerOpen ? t('Close slide selection') : t('Add slides or Sections')}
            </Button>
            {sourcePickerOpen && (
              <ProjectSourcePicker
                key={presentation.id}
                snapshot={snapshot}
                sections={sections}
                disabled={readonly}
                onAddPage={(pageId) => addSource('page', pageId)}
                onAddSection={(sectionId) => addSource('section', sectionId)}
              />
            )}
            {addedMessage && (
              <p role="status" className="text-[11px] leading-relaxed text-brand">
                {addedMessage}
              </p>
            )}
            {presentation.items.length > 6 && (
              <div className="space-y-1.5 rounded border border-border bg-muted/20 p-2">
                <label className="text-xs" htmlFor={`${prefix}-find-item`}>
                  {t('定位编排条目')}
                </label>
                <div className="flex items-center gap-1">
                  <input
                    id={`${prefix}-find-item`}
                    type="search"
                    placeholder={t('页面短码、路径或章节')}
                    className={`${fieldClass} min-w-0`}
                    value={itemQuery}
                    maxLength={200}
                    onChange={(event) => {
                      setItemQuery(event.target.value);
                      setLocatedItemId(null);
                    }}
                    onKeyDown={(event) => {
                      if (event.key !== 'Enter' || event.nativeEvent.isComposing) return;
                      event.preventDefault();
                      locateItem(event.shiftKey ? -1 : 1);
                    }}
                  />
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label={t('上一个匹配条目')}
                    title={t('上一个匹配条目')}
                    disabled={!matchingItems.length}
                    onClick={() => locateItem(-1)}
                  >
                    <ArrowUp />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label={t('下一个匹配条目')}
                    title={t('下一个匹配条目')}
                    disabled={!matchingItems.length}
                    onClick={() => locateItem(1)}
                  >
                    <ArrowDown />
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground" role="status">
                  {itemNeedle
                    ? matchingItems.length
                      ? t('{value0}{value1} 处匹配；定位不会改变编排顺序。', {
                          value0: locatedIndex >= 0 ? `${locatedIndex + 1} / ` : '',
                          value1: matchingItems.length,
                        })
                      : t('没有匹配的条目。')
                    : t('输入后按 Enter 定位，重复引用会分别列入匹配。')}
                </p>
              </div>
            )}
            {presentation.items.map((item, index) => {
              const section =
                item.kind === 'section'
                  ? sections.find((candidate) => candidate.section.id === item.sectionId)
                  : undefined;
              const label =
                item.kind === 'section'
                  ? (section?.section.title ?? t('章节缺失：{value0}', { value0: item.sectionId }))
                  : pageLabel(item.pageId);
              const sourcePage = snapshot.pages.find(
                (page) =>
                  page.pageId === (item.kind === 'page' ? item.pageId : section?.pageIds[0]),
              );
              return (
                <fieldset
                  key={item.id}
                  ref={(element) => {
                    if (element) itemRefs.current.set(item.id, element);
                    else itemRefs.current.delete(item.id);
                  }}
                  className={`min-w-0 space-y-2 rounded border p-2 ${locatedItemId === item.id ? 'border-primary/40 bg-primary/5' : 'border-border'}`}
                  data-hd-presentation-item={item.id}
                  aria-label={t('编排第 {value0} 项：{value1}', {
                    value0: index + 1,
                    value1: label,
                  })}
                >
                  <div className="flex items-center gap-1">
                    {sourcePage && (
                      <span className="block h-7 w-12 shrink-0 overflow-hidden rounded">
                        <ProjectSlidePreview page={sourcePage} snapshot={snapshot} />
                      </span>
                    )}
                    <span
                      className="min-w-0 flex-1"
                      title={item.kind === 'page' ? pageHint(item.pageId) : label}
                    >
                      <span className="block line-clamp-2 text-[11px] font-medium">
                        {index + 1}. {label}
                      </span>
                      <span className="block truncate text-[10px] text-muted-foreground">
                        {item.kind === 'section' && section
                          ? `${t('Section')} · ${t('{count} slides', { count: section.pageIds.length })}`
                          : item.kind === 'page'
                            ? `${t('Slide ID')} ${pageCode(item.pageId)}`
                            : ''}
                      </span>
                    </span>
                    <OrderButtons
                      index={index}
                      length={presentation.items.length}
                      label={t('第 {value0} 项', { value0: index + 1 })}
                      disabled={readonly}
                      onMove={(delta) =>
                        updatePresentation((previous) => ({
                          ...previous,
                          items: move(previous.items, index, delta),
                        }))
                      }
                      onRemove={() =>
                        updatePresentation((previous) => ({
                          ...previous,
                          items: previous.items.filter((candidate) => candidate.id !== item.id),
                        }))
                      }
                    />
                  </div>
                  {item.kind === 'section' && section && section.pageIds.length > 0 && (
                    <Button
                      size="xs"
                      variant="ghost"
                      disabled={readonly}
                      onClick={() =>
                        updatePresentation((previous) => ({
                          ...previous,
                          items: previous.items.flatMap((candidate): PresentationItem[] =>
                            candidate.id === item.id
                              ? section.pageIds.map((pageId) => ({
                                  id: crypto.randomUUID(),
                                  kind: 'page',
                                  pageId,
                                }))
                              : [candidate],
                          ),
                        }))
                      }
                    >
                      {t('拆为独立页面引用')}
                    </Button>
                  )}
                  {item.kind === 'page' && (
                    <details className="space-y-2">
                      <summary className="cursor-pointer text-[10px] text-muted-foreground">
                        {t('Notes and version')}
                      </summary>
                      <div className="flex items-center gap-1">
                        <Button
                          size="xs"
                          variant="ghost"
                          disabled={!snapshot.pages.some((page) => page.pageId === item.pageId)}
                          onClick={() => onSelectPage(item.pageId)}
                        >
                          {t('打开主页面')}
                        </Button>
                        <span className="text-[10px] text-muted-foreground">
                          {item.versionId ? t('固定版本') : t('跟随主页面')}
                        </span>
                      </div>
                      {loadVersions && (
                        <div className="space-y-1">
                          <label
                            htmlFor={`${prefix}-version-${item.id}`}
                            className="text-[11px] text-muted-foreground"
                          >
                            {t('页面版本')}
                          </label>
                          <select
                            id={`${prefix}-version-${item.id}`}
                            className={fieldClass}
                            value={item.versionId ?? ''}
                            disabled={readonly}
                            onFocus={() => {
                              if (!versions[item.pageId]) void fetchVersions(item.pageId);
                            }}
                            onChange={(event) =>
                              updateItem(item.id, (previous) =>
                                previous.kind === 'page'
                                  ? { ...previous, versionId: event.target.value || undefined }
                                  : previous,
                              )
                            }
                          >
                            <option value="">{t('实时引用 · 跟随主页面更新')}</option>
                            {loadingVersions.includes(item.pageId) && (
                              <option disabled>{t('正在读取页面版本…')}</option>
                            )}
                            {item.versionId &&
                              !versions[item.pageId]?.some(
                                (version) => version.versionId === item.versionId,
                              ) && (
                                <option value={item.versionId}>
                                  {t('固定版本：{value0}', { value0: item.versionId })}
                                </option>
                              )}
                            {(versions[item.pageId] ?? []).map((version) => (
                              <option key={version.versionId} value={version.versionId}>
                                {version.summary} ·{' '}
                                {new Date(version.createdAt).toLocaleString(getUiLocale())}
                              </option>
                            ))}
                          </select>
                          <Button
                            size="xs"
                            variant="ghost"
                            disabled={readonly || loadingVersions.includes(item.pageId)}
                            onClick={() => void fetchVersions(item.pageId)}
                          >
                            {loadingVersions.includes(item.pageId)
                              ? t('正在读取版本…')
                              : t('刷新页面版本')}
                          </Button>
                        </div>
                      )}
                      <label className="flex items-center gap-2 text-[11px]">
                        <input
                          type="checkbox"
                          checked={item.notes !== undefined}
                          disabled={readonly}
                          onChange={(event) =>
                            updateItem(item.id, (previous) =>
                              previous.kind === 'page'
                                ? { ...previous, notes: event.target.checked ? '' : undefined }
                                : previous,
                            )
                          }
                        />
                        {t('本次引用使用独立演讲备注')}
                      </label>
                      {item.notes !== undefined && (
                        <Textarea
                          aria-label={t('第 {value0} 项的演讲备注', { value0: index + 1 })}
                          className="min-h-16 text-xs"
                          value={item.notes}
                          disabled={readonly}
                          placeholder={t('这份备注只用于本次引用。')}
                          onChange={(event) =>
                            updateItem(item.id, (previous) =>
                              previous.kind === 'page'
                                ? { ...previous, notes: event.target.value }
                                : previous,
                            )
                          }
                        />
                      )}
                    </details>
                  )}
                </fieldset>
              );
            })}
            {!presentation.items.length && (
              <p className="rounded border border-dashed border-border p-3 text-muted-foreground">
                {t('添加章节或单个页面，开始编排这场演讲。')}
              </p>
            )}
          </div>
          {resolution && (
            <div className="space-y-2">
              <h3 className="font-medium">
                {t('实际播放顺序 · {value0} 页', { value0: resolution.pages.length })}
              </h3>
              <div className="flex flex-wrap gap-1">
                {resolution.pages.map((page, index) => (
                  <Button
                    key={page.occurrenceId}
                    data-hd-project-occurrence={page.occurrenceId}
                    size="xs"
                    variant="outline"
                    title={dirty ? t('保存编排后查看这处引用') : pageHint(page.pageId)}
                    disabled={
                      dirty ||
                      !onSelectOccurrence ||
                      !snapshot.pages.some((candidate) => candidate.pageId === page.pageId)
                    }
                    onClick={() =>
                      onSelectOccurrence?.(presentation.id, page.pageId, page.occurrenceId)
                    }
                  >
                    {index + 1}. {pageLabel(page.pageId)}
                    {page.versionId ? t(' · 固定') : ''}
                  </Button>
                ))}
              </div>
              {dirty && (
                <p className="text-[11px] text-muted-foreground">
                  {t('保存编排后，可直接打开每个播放位置。')}
                </p>
              )}
              {resolution.diagnostics
                .filter((diagnostic) => diagnostic.code !== 'PRESENTATION_EMPTY')
                .map((diagnostic) => (
                  <p
                    key={`${diagnostic.code}-${diagnostic.pageId ?? diagnostic.message}`}
                    className="text-[11px] text-destructive"
                    role="alert"
                  >
                    {t(diagnostic.message)}
                  </p>
                ))}
            </div>
          )}
          <details>
            <summary className="mb-2 cursor-pointer font-medium">{t('演讲编排笔记')}</summary>
            <Textarea
              aria-label={t('演讲编排笔记')}
              className="min-h-20 text-xs"
              value={presentation.notes ?? ''}
              disabled={readonly}
              onChange={(event) =>
                updatePresentation((previous) => ({ ...previous, notes: event.target.value }))
              }
            />
          </details>
        </div>
      ) : (
        <div className="space-y-4" data-hd-main-slides-editor>
          <details>
            <summary className="mb-2 cursor-pointer font-medium">{t('Main Story')}</summary>
            <StoryFields
              value={draft.mainStory}
              disabled={readonly}
              onChange={(value) => edit((previous) => ({ ...previous, mainStory: value }))}
            />
          </details>
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-medium">{t('Sections')}</h3>
            <Button
              size="xs"
              variant="outline"
              disabled={readonly}
              onClick={() => {
                const id = crypto.randomUUID();
                edit((previous) => ({
                  ...previous,
                  sections: [
                    ...previous.sections,
                    {
                      id,
                      title: t('Section {count}', { count: previous.sections.length + 1 }),
                      story: emptyStory(),
                      pageIds: [],
                    },
                  ],
                }));
                requestAnimationFrame(() => {
                  document
                    .querySelector<HTMLInputElement>(`[data-hd-project-section="${id}"] input`)
                    ?.focus();
                });
              }}
            >
              <Plus />
              {t('New Section')}
            </Button>
          </div>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            {t(
              'Choose a first Slide for each Section. It follows Main order until the next Section; the last Section continues to the end. Fixed ranges and saved members are also supported.',
            )}
          </p>
          {[...sections]
            .sort(
              (left, right) => (left.startPosition ?? Infinity) - (right.startPosition ?? Infinity),
            )
            .map((resolved) => (
              <ProjectSectionEditor
                key={resolved.section.id}
                resolved={resolved}
                snapshot={snapshot}
                defaultStartPageId={currentPageId}
                disabled={readonly}
                onRename={(title) =>
                  edit((previous) => ({
                    ...previous,
                    sections: previous.sections.map((section) =>
                      section.id === resolved.section.id ? { ...section, title } : section,
                    ),
                  }))
                }
                onRemove={() =>
                  edit((previous) => ({
                    ...previous,
                    sections: previous.sections.filter(
                      (section) => section.id !== resolved.section.id,
                    ),
                  }))
                }
                onSetRange={(start, end) => setSectionRange(resolved.section.id, start, end)}
                onSetStart={(start) => setSectionStart(resolved.section.id, start)}
                onSetFrontMatter={(frontMatter) => {
                  if (
                    frontMatter &&
                    draft.sections.some(
                      (section) => section.id !== resolved.section.id && section.frontMatter,
                    )
                  )
                    return 'Only one Section can be front matter (Section 00).';
                  return setSectionDefinition(resolved.section.id, {
                    ...draft,
                    sections: draft.sections.map((section) => {
                      if (section.id !== resolved.section.id) return section;
                      const { frontMatter: _frontMatter, ...rest } = section;
                      return { ...rest, ...(frontMatter ? { frontMatter: true as const } : {}) };
                    }),
                  });
                }}
                onSelectPage={onSelectPage}
              >
                <details>
                  <summary className="cursor-pointer text-[11px] text-muted-foreground">
                    {t('Section Story')}
                  </summary>
                  <div className="mt-2">
                    <StoryFields
                      value={resolved.section.story}
                      disabled={readonly}
                      onChange={(story) =>
                        edit((previous) => ({
                          ...previous,
                          sections: previous.sections.map((section) =>
                            section.id === resolved.section.id ? { ...section, story } : section,
                          ),
                        }))
                      }
                    />
                  </div>
                </details>
              </ProjectSectionEditor>
            ))}
          {!sections.length && (
            <p className="rounded border border-dashed border-border p-3 text-[11px] text-muted-foreground">
              {t(
                'Create a Section to group a continuous part of Main Slides, then reuse it in any Presentation.',
              )}
            </p>
          )}
          <p className="text-[10px] leading-relaxed text-muted-foreground">
            {t(
              'Sections keep stable Slide IDs as anchors. Removing a Section keeps every Main Slide and marks affected Presentation references for repair.',
            )}
          </p>
        </div>
      )}
    </section>
  );
}
