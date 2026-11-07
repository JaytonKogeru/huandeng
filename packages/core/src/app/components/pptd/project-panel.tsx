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
          ['purpose', 'Question / purpose', 'What question does this story answer?'],
          ['audience', 'Audience', 'Who is this story for?'],
          ['takeaway', 'Takeaway', 'What should the audience remember?'],
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
        title={`Move ${label} up`}
        aria-label={`Move ${label} up`}
        disabled={disabled || index === 0}
        onClick={() => onMove(-1)}
      >
        <ArrowUp />
      </Button>
      <Button
        variant="ghost"
        size="icon-xs"
        title={`Move ${label} down`}
        aria-label={`Move ${label} down`}
        disabled={disabled || index === length - 1}
        onClick={() => onMove(1)}
      >
        <ArrowDown />
      </Button>
      <Button
        variant="ghost"
        size="icon-xs"
        title={`Remove ${label}`}
        aria-label={`Remove ${label}`}
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
        error: error instanceof Error ? error.message : 'Project metadata is invalid.',
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
    snapshot.metadata.slides[pageId]?.label ??
    snapshot.metadata.slides[pageId]?.shortCode ??
    pageId;
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
      setMessage('Project saved.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save the project.');
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
      setMessage(error instanceof Error ? error.message : 'Could not load named versions.');
    } finally {
      setLoadingVersions((previous) => previous.filter((id) => id !== pageId));
    }
  };

  return (
    <section className="space-y-4 p-3 text-xs" aria-label="Project and Story" data-hd-project>
      <div className="space-y-2">
        <div className="flex items-center gap-2 font-semibold">
          <BookOpen className="size-3.5" /> Project &amp; Story
        </div>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          One Main Slides library. Multiple presentations share its pages and assemble their own
          story.
        </p>
        <label htmlFor={`${prefix}-collection`} className="sr-only">
          Slide collection
        </label>
        <select
          id={`${prefix}-collection`}
          className={fieldClass}
          value={editingId ?? ''}
          disabled={saving}
          onChange={(event) => selectCollection(event.target.value || null)}
        >
          <option value="">Main Slides · {snapshot.pages.length} pages</option>
          {draft.presentations.map((item) => (
            <option key={item.id} value={item.id}>
              {item.title || 'Untitled presentation'}
              {persisted.presentations.some((saved) => saved.id === item.id) ? '' : ' · unsaved'}
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
                    title: `Presentation ${previous.presentations.length + 1}`,
                    story: emptyStory(),
                    items: [],
                  },
                ],
              }));
              setEditingId(id);
            }}
          >
            <Plus /> Presentation
          </Button>
          <Button size="xs" disabled={readonly || !dirty} onClick={() => void save()}>
            <Save />
            {saving ? 'Saving…' : 'Save project'}
          </Button>
          {dirty && (
            <Button size="xs" variant="ghost" disabled={saving} onClick={reload}>
              Discard draft
            </Button>
          )}
        </div>
        {dirty && (
          <p className="text-[11px] text-amber-700 dark:text-amber-400">
            Unsaved project changes. Save before presenting or exporting.
          </p>
        )}
        {remoteChanged && (
          <div className="space-y-2">
            <p className="text-[11px] text-destructive" role="alert">
              The project changed elsewhere. Your draft is preserved. Discard it to load the current
              project before editing again.
            </p>
            <details>
              <summary className="cursor-pointer text-[11px]">
                View unsaved draft for merging
              </summary>
              <Textarea
                className="mt-2 min-h-32 font-mono text-[10px]"
                aria-label="Unsaved project draft"
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
              Presentation title
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
            <summary className="mb-2 cursor-pointer font-medium">Presentation Story</summary>
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
              Build the presentation
            </label>
            <p className="text-[11px] text-muted-foreground">
              Section references follow their current page order. A page can appear more than once.
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
              <option value="">Add a section or Main Slide…</option>
              <optgroup label="Sections">
                {draft.sections.map((section) => (
                  <option key={section.id} value={`section:${section.id}`}>
                    {section.title} · {section.pageIds.length} pages
                  </option>
                ))}
              </optgroup>
              <optgroup label="Main Slides">
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
                  ? (section?.title ?? `Missing section: ${item.sectionId}`)
                  : pageLabel(item.pageId);
              return (
                <div
                  key={item.id}
                  className="space-y-2 rounded border border-border p-2"
                  data-hd-presentation-item
                >
                  <div className="flex items-center gap-1">
                    <span className="min-w-0 flex-1 truncate" title={label}>
                      {index + 1}. {label}
                      {item.kind === 'section' && section ? ` (${section.pageIds.length})` : ''}
                    </span>
                    <OrderButtons
                      index={index}
                      length={presentation.items.length}
                      label={`item ${index + 1}`}
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
                      Use individual pages
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
                          Open Main Slide
                        </Button>
                        <span className="text-[10px] text-muted-foreground">
                          {item.versionId ? 'Named version' : 'Live reference'}
                        </span>
                      </div>
                      {loadVersions && (
                        <div className="space-y-1">
                          <label
                            htmlFor={`${prefix}-version-${item.id}`}
                            className="text-[11px] text-muted-foreground"
                          >
                            Page version
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
                            <option value="">Live · follow Main Slide changes</option>
                            {loadingVersions.includes(item.pageId) && (
                              <option disabled>Loading named versions…</option>
                            )}
                            {item.versionId &&
                              !versions[item.pageId]?.some(
                                (version) => version.versionId === item.versionId,
                              ) && <option value={item.versionId}>Pinned: {item.versionId}</option>}
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
                              ? 'Loading versions…'
                              : 'Refresh named versions'}
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
                        Presentation-specific speaker notes
                      </label>
                      {item.notes !== undefined && (
                        <Textarea
                          aria-label={`Speaker notes for item ${index + 1}`}
                          className="min-h-16 text-xs"
                          value={item.notes}
                          disabled={readonly}
                          placeholder="These notes only apply to this occurrence."
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
                Add chapters or individual slides to start this presentation.
              </p>
            )}
          </div>
          {resolution && (
            <div className="space-y-2">
              <h3 className="font-medium">Resolved order · {resolution.pages.length} slides</h3>
              <div className="flex flex-wrap gap-1">
                {resolution.pages.map((page, index) => (
                  <Button
                    key={page.occurrenceId}
                    size="xs"
                    variant="outline"
                    disabled={!snapshot.pages.some((candidate) => candidate.pageId === page.pageId)}
                    onClick={() => onSelectPage(page.pageId)}
                  >
                    {index + 1}. {pageLabel(page.pageId)}
                    {page.versionId ? ' · pinned' : ''}
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
            <summary className="mb-2 cursor-pointer font-medium">
              Presentation planning notes
            </summary>
            <Textarea
              aria-label="Presentation planning notes"
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
            Remove presentation
          </Button>
          <p className="text-[11px] text-muted-foreground">
            Removing a presentation keeps all Main Slides and named page versions.
          </p>
        </div>
      ) : (
        <div className="space-y-4" data-hd-main-slides-editor>
          <details open>
            <summary className="mb-2 cursor-pointer font-medium">
              Main Story · the whole project
            </summary>
            <StoryFields
              value={draft.mainStory}
              disabled={readonly}
              onChange={(value) => edit((previous) => ({ ...previous, mainStory: value }))}
            />
          </details>
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-medium">Sections / chapters</h3>
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
                      title: `Section ${previous.sections.length + 1}`,
                      story: emptyStory(),
                      pageIds: [],
                    },
                  ],
                }))
              }
            >
              <Plus />
              Section
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
                  aria-label={`Section ${index + 1} title`}
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
                  label={`section ${index + 1}`}
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
                  Section Story
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
                    disabled={!snapshot.pages.some((page) => page.pageId === pageId)}
                    onClick={() => onSelectPage(pageId)}
                  >
                    {pageIndex + 1}. {pageLabel(pageId)}
                    {!snapshot.pages.some((page) => page.pageId === pageId) ? ' · unavailable' : ''}
                  </Button>
                  <OrderButtons
                    index={pageIndex}
                    length={section.pageIds.length}
                    label={`${pageLabel(pageId)} in ${section.title}`}
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
                  Assign Main Slides below to fill this section.
                </p>
              )}
            </div>
          ))}
          <details open>
            <summary className="mb-2 cursor-pointer font-medium">
              Assign Main Slides to sections
            </summary>
            <div className="space-y-2">
              {snapshot.pages
                .filter((page) => page.state === 'active')
                .map((page) => (
                  <div key={page.pageId} className="flex items-center gap-2">
                    <Button
                      size="xs"
                      variant="ghost"
                      className="w-14 shrink-0 justify-start"
                      onClick={() => onSelectPage(page.pageId)}
                    >
                      {pageLabel(page.pageId)}
                    </Button>
                    <select
                      aria-label={`Section for ${pageLabel(page.pageId)}`}
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
                      <option value="">Unassigned</option>
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
            A Main Slide belongs to at most one section. Removing a section leaves its pages in Main
            Slides; affected presentations show a repair message.
          </p>
        </div>
      )}
    </section>
  );
}
