import { ArrowDown, ArrowUp, BookOpen, Plus, Save, Trash2 } from 'lucide-react';
import { useEffect, useId, useMemo, useState } from 'react';
import {
  emptyStory,
  type PresentationItem,
  type ProjectModel,
  type ProjectPresentation,
  type ProjectReplaceOperation,
  readProjectModel,
  resolvePresentation,
  type StoryOutline,
  validateProjectModel,
} from '../../../pptd/project-model';
import type { DeckSnapshot, ExpectedRevisions, PageVersionSummary } from '../../../pptd/types';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';

export interface ProjectPanelProps {
  snapshot: DeckSnapshot;
  selectedPresentationId: string | null;
  onSelectPresentation: (id: string | null) => void;
  onSelectPage: (pageId: string) => void;
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
            {title}
          </label>
          <Textarea
            id={`${prefix}-${key}`}
            className="min-h-14 text-xs"
            value={value[key]}
            placeholder={placeholder}
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
  return (
    <div className="flex shrink-0 gap-0.5">
      <Button
        variant="ghost"
        size="icon-xs"
        title={`上移${label}`}
        aria-label={`上移${label}`}
        disabled={disabled || index === 0}
        onClick={() => onMove(-1)}
      >
        <ArrowUp />
      </Button>
      <Button
        variant="ghost"
        size="icon-xs"
        title={`下移${label}`}
        aria-label={`下移${label}`}
        disabled={disabled || index === length - 1}
        onClick={() => onMove(1)}
      >
        <ArrowDown />
      </Button>
      <Button
        variant="ghost"
        size="icon-xs"
        title={`移除${label}`}
        aria-label={`移除${label}`}
        disabled={disabled}
        onClick={onRemove}
      >
        <Trash2 />
      </Button>
    </div>
  );
}

export function ProjectPanel(props: ProjectPanelProps) {
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
        {parsed.error}
      </section>
    );
  return <ProjectPanelEditor {...props} persisted={parsed.project} />;
}

function ProjectPanelEditor({
  snapshot,
  selectedPresentationId,
  onSelectPresentation,
  onSelectPage,
  onApply,
  loadVersions,
  onDirtyChange,
  disabled = false,
  persisted,
}: ProjectPanelProps & { persisted: ProjectModel }) {
  const prefix = useId();
  const [draft, setDraft] = useState(persisted);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [base, setBase] = useState<ExpectedRevisions>({
    metadata: snapshot.metadataRevision,
    manifest: snapshot.manifestRevision,
  });
  const [editingId, setEditingId] = useState<string | null>(selectedPresentationId);
  const [message, setMessage] = useState<string | null>(null);
  const [versions, setVersions] = useState<Record<string, PageVersionSummary[]>>({});
  const [loadingVersions, setLoadingVersions] = useState<string[]>([]);
  const remoteChanged =
    dirty &&
    (base.metadata !== snapshot.metadataRevision || base.manifest !== snapshot.manifestRevision);
  const readonly = disabled || saving || !snapshot.writable || remoteChanged;
  const presentation = draft.presentations.find((item) => item.id === editingId);
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
  const pageLabel = (pageId: string) =>
    snapshot.metadata.slides[pageId]?.shortCode ??
    snapshot.metadata.slides[pageId]?.label ??
    pageId;
  const pageHint = (pageId: string) => {
    const legacyLabel = snapshot.metadata.slides[pageId]?.label;
    return `永久 ID：${pageId}${legacyLabel ? `\n旧编号：${legacyLabel}` : ''}`;
  };
  const selectCollection = (id: string | null) => {
    setEditingId(id);
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
      if (editingId && project.presentations.some((item) => item.id === editingId))
        onSelectPresentation(editingId);
      else onSelectPresentation(null);
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

  return (
    <section className="space-y-4 p-3 text-xs" aria-label="项目与故事" data-hd-project>
      <div className="space-y-2">
        <div className="flex items-center gap-2 font-semibold">
          <BookOpen className="size-3.5" /> 项目与故事
        </div>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          项目保留一份主幻灯片。按需要引用其中的页面，编排不同的演讲。
        </p>
        <label htmlFor={`${prefix}-collection`} className="sr-only">
          幻灯片集合
        </label>
        <select
          id={`${prefix}-collection`}
          className={fieldClass}
          value={editingId ?? ''}
          disabled={saving}
          onChange={(event) => selectCollection(event.target.value || null)}
        >
          <option value="">主幻灯片（Main Slides） · {snapshot.pages.length} 页</option>
          {draft.presentations.map((item) => (
            <option key={item.id} value={item.id}>
              {item.title || '未命名演讲'}
              {persisted.presentations.some((saved) => saved.id === item.id) ? '' : ' · 未保存'}
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
                    title: `演讲 ${previous.presentations.length + 1}`,
                    story: emptyStory(),
                    items: [],
                  },
                ],
              }));
              setEditingId(id);
            }}
          >
            <Plus /> 新建演讲
          </Button>
          <Button size="xs" disabled={readonly || !dirty} onClick={() => void save()}>
            <Save />
            {saving ? '正在保存…' : '保存项目'}
          </Button>
          {dirty && (
            <Button size="xs" variant="ghost" disabled={saving} onClick={reload}>
              放弃草稿
            </Button>
          )}
        </div>
        {dirty && (
          <p className="text-[11px] text-amber-700 dark:text-amber-400">
            项目编排有未保存的修改，保存后可放映或导出。
          </p>
        )}
        {remoteChanged && (
          <div className="space-y-2">
            <p className="text-[11px] text-destructive" role="alert">
              项目已从另一处更新，你的草稿仍保留在这里。可复制草稿后放弃本地修改，读取最新项目。
            </p>
            <details>
              <summary className="cursor-pointer text-[11px]">查看并复制未保存的草稿</summary>
              <Textarea
                className="mt-2 min-h-32 font-mono text-[10px]"
                aria-label="未保存的项目草稿"
                readOnly
                value={JSON.stringify(draft, null, 2)}
                onFocus={(event) => event.target.select()}
              />
            </details>
          </div>
        )}
        {message && (
          <p className="break-words text-[11px]" role="status">
            {message}
          </p>
        )}
      </div>

      {presentation ? (
        <div className="space-y-4" data-hd-presentation-editor>
          <div className="space-y-1">
            <label htmlFor={`${prefix}-presentation-title`} className="font-medium">
              演讲名称
            </label>
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
          </div>
          <details open>
            <summary className="mb-2 cursor-pointer font-medium">演讲故事</summary>
            <StoryFields
              value={presentation.story}
              disabled={readonly}
              onChange={(value) =>
                updatePresentation((previous) => ({ ...previous, story: value }))
              }
            />
          </details>
          <div className="space-y-2">
            <label htmlFor={`${prefix}-add-item`} className="font-medium">
              编排演讲幻灯片
            </label>
            <p className="text-[11px] text-muted-foreground">
              引用章节时跟随章节页序，同一页面也可以在演讲中多次出现。
            </p>
            <select
              id={`${prefix}-add-item`}
              className={fieldClass}
              value=""
              disabled={readonly}
              onChange={(event) => {
                const value = event.target.value;
                if (!value) return;
                const id = crypto.randomUUID();
                const item: PresentationItem = value.startsWith('section:')
                  ? { id, kind: 'section', sectionId: value.slice(8) }
                  : { id, kind: 'page', pageId: value.slice(5) };
                updatePresentation((previous) => ({
                  ...previous,
                  items: [...previous.items, item],
                }));
              }}
            >
              <option value="">添加章节或主幻灯片…</option>
              <optgroup label="章节">
                {draft.sections.map((section) => (
                  <option key={section.id} value={`section:${section.id}`}>
                    {section.title} · {section.pageIds.length} 页
                  </option>
                ))}
              </optgroup>
              <optgroup label="主幻灯片">
                {snapshot.pages
                  .filter((page) => page.state === 'active')
                  .map((page) => (
                    <option key={page.pageId} value={`page:${page.pageId}`}>
                      {pageLabel(page.pageId)}
                    </option>
                  ))}
              </optgroup>
            </select>
            {presentation.items.map((item, index) => {
              const section =
                item.kind === 'section'
                  ? draft.sections.find((candidate) => candidate.id === item.sectionId)
                  : undefined;
              const label =
                item.kind === 'section'
                  ? (section?.title ?? `章节缺失：${item.sectionId}`)
                  : pageLabel(item.pageId);
              return (
                <div
                  key={item.id}
                  className="space-y-2 rounded border border-border p-2"
                  data-hd-presentation-item
                >
                  <div className="flex items-center gap-1">
                    <span
                      className="min-w-0 flex-1 truncate"
                      title={item.kind === 'page' ? pageHint(item.pageId) : label}
                    >
                      {index + 1}. {label}
                      {item.kind === 'section' && section ? ` (${section.pageIds.length})` : ''}
                    </span>
                    <OrderButtons
                      index={index}
                      length={presentation.items.length}
                      label={`第 ${index + 1} 项`}
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
                      拆为独立页面引用
                    </Button>
                  )}
                  {item.kind === 'page' && (
                    <>
                      <div className="flex items-center gap-1">
                        <Button
                          size="xs"
                          variant="ghost"
                          disabled={!snapshot.pages.some((page) => page.pageId === item.pageId)}
                          onClick={() => onSelectPage(item.pageId)}
                        >
                          打开主页面
                        </Button>
                        <span className="text-[10px] text-muted-foreground">
                          {item.versionId ? '固定版本' : '跟随主页面'}
                        </span>
                      </div>
                      {loadVersions && (
                        <div className="space-y-1">
                          <label
                            htmlFor={`${prefix}-version-${item.id}`}
                            className="text-[11px] text-muted-foreground"
                          >
                            页面版本
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
                            <option value="">实时引用 · 跟随主页面更新</option>
                            {loadingVersions.includes(item.pageId) && (
                              <option disabled>正在读取页面版本…</option>
                            )}
                            {item.versionId &&
                              !versions[item.pageId]?.some(
                                (version) => version.versionId === item.versionId,
                              ) && (
                                <option value={item.versionId}>固定版本：{item.versionId}</option>
                              )}
                            {(versions[item.pageId] ?? []).map((version) => (
                              <option key={version.versionId} value={version.versionId}>
                                {version.summary} · {new Date(version.createdAt).toLocaleString()}
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
                              ? '正在读取版本…'
                              : '刷新页面版本'}
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
                        本次引用使用独立演讲备注
                      </label>
                      {item.notes !== undefined && (
                        <Textarea
                          aria-label={`第 ${index + 1} 项的演讲备注`}
                          className="min-h-16 text-xs"
                          value={item.notes}
                          disabled={readonly}
                          placeholder="这份备注只用于本次引用。"
                          onChange={(event) =>
                            updateItem(item.id, (previous) =>
                              previous.kind === 'page'
                                ? { ...previous, notes: event.target.value }
                                : previous,
                            )
                          }
                        />
                      )}
                    </>
                  )}
                </div>
              );
            })}
            {!presentation.items.length && (
              <p className="rounded border border-dashed border-border p-3 text-muted-foreground">
                添加章节或单个页面，开始编排这场演讲。
              </p>
            )}
          </div>
          {resolution && (
            <div className="space-y-2">
              <h3 className="font-medium">实际播放顺序 · {resolution.pages.length} 页</h3>
              <div className="flex flex-wrap gap-1">
                {resolution.pages.map((page, index) => (
                  <Button
                    key={page.occurrenceId}
                    size="xs"
                    variant="outline"
                    title={pageHint(page.pageId)}
                    disabled={!snapshot.pages.some((candidate) => candidate.pageId === page.pageId)}
                    onClick={() => onSelectPage(page.pageId)}
                  >
                    {index + 1}. {pageLabel(page.pageId)}
                    {page.versionId ? ' · 固定' : ''}
                  </Button>
                ))}
              </div>
              {resolution.diagnostics.map((diagnostic) => (
                <p
                  key={`${diagnostic.code}-${diagnostic.pageId ?? diagnostic.message}`}
                  className="text-[11px] text-destructive"
                  role="alert"
                >
                  {diagnostic.message}
                </p>
              ))}
            </div>
          )}
          <details>
            <summary className="mb-2 cursor-pointer font-medium">演讲编排笔记</summary>
            <Textarea
              aria-label="演讲编排笔记"
              className="min-h-20 text-xs"
              value={presentation.notes ?? ''}
              disabled={readonly}
              onChange={(event) =>
                updatePresentation((previous) => ({ ...previous, notes: event.target.value }))
              }
            />
          </details>
          <Button
            size="xs"
            variant="ghost"
            disabled={readonly}
            onClick={() => {
              edit((previous) => ({
                ...previous,
                presentations: previous.presentations.filter((item) => item.id !== presentation.id),
              }));
              setEditingId(null);
            }}
          >
            <Trash2 />
            移除演讲
          </Button>
          <p className="text-[11px] text-muted-foreground">
            移除演讲后，主幻灯片与已记录的页面版本继续保留。
          </p>
        </div>
      ) : (
        <div className="space-y-4" data-hd-main-slides-editor>
          <details open>
            <summary className="mb-2 cursor-pointer font-medium">主故事 · 整个项目</summary>
            <StoryFields
              value={draft.mainStory}
              disabled={readonly}
              onChange={(value) => edit((previous) => ({ ...previous, mainStory: value }))}
            />
          </details>
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-medium">章节</h3>
            <Button
              size="xs"
              variant="outline"
              disabled={readonly}
              onClick={() =>
                edit((previous) => ({
                  ...previous,
                  sections: [
                    ...previous.sections,
                    {
                      id: crypto.randomUUID(),
                      title: `章节 ${previous.sections.length + 1}`,
                      story: emptyStory(),
                      pageIds: [],
                    },
                  ],
                }))
              }
            >
              <Plus />
              新建章节
            </Button>
          </div>
          {draft.sections.map((section, index) => (
            <div
              key={section.id}
              className="space-y-2 rounded border border-border p-2"
              data-hd-project-section
            >
              <div className="flex items-center gap-1">
                <input
                  aria-label={`第 ${index + 1} 章名称`}
                  className={fieldClass}
                  maxLength={240}
                  value={section.title}
                  disabled={readonly}
                  onChange={(event) =>
                    edit((previous) => ({
                      ...previous,
                      sections: previous.sections.map((item) =>
                        item.id === section.id ? { ...item, title: event.target.value } : item,
                      ),
                    }))
                  }
                />
                <OrderButtons
                  index={index}
                  length={draft.sections.length}
                  label={`第 ${index + 1} 章`}
                  disabled={readonly}
                  onMove={(delta) =>
                    edit((previous) => ({
                      ...previous,
                      sections: move(previous.sections, index, delta),
                    }))
                  }
                  onRemove={() =>
                    edit((previous) => ({
                      ...previous,
                      sections: previous.sections.filter((item) => item.id !== section.id),
                    }))
                  }
                />
              </div>
              <details>
                <summary className="mb-2 cursor-pointer text-[11px] text-muted-foreground">
                  章节故事
                </summary>
                <StoryFields
                  value={section.story}
                  disabled={readonly}
                  onChange={(value) =>
                    edit((previous) => ({
                      ...previous,
                      sections: previous.sections.map((item) =>
                        item.id === section.id ? { ...item, story: value } : item,
                      ),
                    }))
                  }
                />
              </details>
              {section.pageIds.map((pageId, pageIndex) => (
                <div key={pageId} className="flex items-center gap-1">
                  <Button
                    size="xs"
                    variant="ghost"
                    className="min-w-0 flex-1 justify-start truncate"
                    title={pageHint(pageId)}
                    disabled={!snapshot.pages.some((page) => page.pageId === pageId)}
                    onClick={() => onSelectPage(pageId)}
                  >
                    {pageIndex + 1}. {pageLabel(pageId)}
                    {!snapshot.pages.some((page) => page.pageId === pageId) ? ' · 无法读取' : ''}
                  </Button>
                  <OrderButtons
                    index={pageIndex}
                    length={section.pageIds.length}
                    label={`${section.title}中的 ${pageLabel(pageId)}`}
                    disabled={readonly}
                    onMove={(delta) =>
                      edit((previous) => ({
                        ...previous,
                        sections: previous.sections.map((item) =>
                          item.id === section.id
                            ? { ...item, pageIds: move(item.pageIds, pageIndex, delta) }
                            : item,
                        ),
                      }))
                    }
                    onRemove={() =>
                      edit((previous) => ({
                        ...previous,
                        sections: previous.sections.map((item) =>
                          item.id === section.id
                            ? { ...item, pageIds: item.pageIds.filter((id) => id !== pageId) }
                            : item,
                        ),
                      }))
                    }
                  />
                </div>
              ))}
              {!section.pageIds.length && (
                <p className="text-[11px] text-muted-foreground">
                  在下方为主幻灯片分配章节，页面就会出现在这里。
                </p>
              )}
            </div>
          ))}
          <details open>
            <summary className="mb-2 cursor-pointer font-medium">为主幻灯片分配章节</summary>
            <div className="space-y-2">
              {snapshot.pages
                .filter((page) => page.state === 'active')
                .map((page) => (
                  <div key={page.pageId} className="flex items-center gap-2">
                    <Button
                      size="xs"
                      variant="ghost"
                      className="w-14 shrink-0 justify-start"
                      title={pageHint(page.pageId)}
                      onClick={() => onSelectPage(page.pageId)}
                    >
                      {pageLabel(page.pageId)}
                    </Button>
                    <select
                      aria-label={`${pageLabel(page.pageId)} 所属章节`}
                      className={fieldClass}
                      value={
                        draft.sections.find((section) => section.pageIds.includes(page.pageId))
                          ?.id ?? ''
                      }
                      disabled={readonly}
                      onChange={(event) => {
                        const targetId = event.target.value;
                        edit((previous) => ({
                          ...previous,
                          sections: previous.sections.map((section) => ({
                            ...section,
                            pageIds:
                              section.id === targetId
                                ? [
                                    ...section.pageIds.filter((id) => id !== page.pageId),
                                    page.pageId,
                                  ]
                                : section.pageIds.filter((id) => id !== page.pageId),
                          })),
                        }));
                      }}
                    >
                      <option value="">未分配章节</option>
                      {draft.sections.map((section) => (
                        <option key={section.id} value={section.id}>
                          {section.title}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
            </div>
          </details>
          <p className="text-[11px] text-muted-foreground">
            每页可属于一个章节。移除章节后，页面仍保留在主幻灯片中，受影响的演讲会提示修复引用。
          </p>
        </div>
      )}
    </section>
  );
}
