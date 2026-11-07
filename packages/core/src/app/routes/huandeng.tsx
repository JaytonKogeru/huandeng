import {
  AlertCircle,
  BookOpen,
  Check,
  Circle,
  Clapperboard,
  Copy,
  Download,
  FilePlus2,
  Files,
  FolderOpen,
  Group,
  History,
  Images,
  Keyboard,
  Loader2,
  Maximize2,
  Minus,
  MousePointer2,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  PanelsTopLeft,
  Play,
  Plus,
  Redo2,
  RefreshCw,
  Save,
  Type,
  Undo2,
  Ungroup,
  Upload,
} from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { HuandengMark } from '@/components/brand-mark';
import { AssetLibrary } from '@/components/pptd/asset-library';
import { AuthoringWorkspace } from '@/components/pptd/authoring-workspace';
import { type DesignIntentDraft, DesignIntentPanel } from '@/components/pptd/design-intent-panel';
import { alignedBounds } from '@/components/pptd/editor-canvas';
import { ExportDialog } from '@/components/pptd/export-dialog';
import { PptdInspector } from '@/components/pptd/inspector';
import { KeyboardHelpDialog } from '@/components/pptd/keyboard-help-dialog';
import { PageHistoryDialog } from '@/components/pptd/page-history-dialog';
import { type PresentationControls, PresentationView } from '@/components/pptd/presentation-view';
import { ProjectOverview } from '@/components/pptd/project-overview';
import { ProjectPanel } from '@/components/pptd/project-panel';
import { PptdProjectTree } from '@/components/pptd/project-tree';
import { RecipePanel } from '@/components/pptd/recipe-panel';
import type { PptdTheme } from '@/components/pptd/renderer';
import { ScienceInsertMenu } from '@/components/pptd/science-insert-menu';
import type { ChartDataDraft } from '@/components/pptd/science-inspector';
import { ShapeInsertMenu } from '@/components/pptd/shape-insert-menu';
import { TechnicalQaPanel } from '@/components/pptd/technical-qa-panel';
import { PptdThumbnailRail } from '@/components/pptd/thumbnail-rail';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { type DesktopEditCommand, desktopHost } from '@/lib/huandeng-desktop';
import type { Alignment } from '@/lib/inspector/geometry';
import { draftHasChanges } from '@/lib/pptd-document';
import { type InsertionTool, insertionLabel } from '@/lib/pptd-insertion';
import {
  type EditorKeyboardCommand,
  editorKeyboardScope,
  focusEditorCanvas,
  focusWorkspaceRegion,
  resolveEditorKeyboardCommand,
  selectionRemovalIds,
  selectionRootIds,
  topLevelElementIds,
} from '@/lib/pptd-keyboard';
import { useDocumentTitle } from '@/lib/use-document-title';
import { usePptdDocument } from '@/lib/use-pptd-document';
import { type PageTimeline, validateTimeline } from '../../pptd/animation-model';
import type { AssetLibraryOptions } from '../../pptd/asset-library';
import {
  buildGroup,
  duplicateElements,
  expandGroupIds,
  groupChildren,
  transformGroup,
  ungroupOperations,
} from '../../pptd/grouping';
import { readProjectModel } from '../../pptd/project-model';
import { copiedTimelineTracks, knownTimeline } from '../../pptd/timeline-operations';
import type { DeckSnapshot, PageSnapshot, PptdElement, PptdOperation } from '../../pptd/types';

export function HuandengEditor() {
  const [projectDirty, setProjectDirty] = useState(false);
  const [timelineDirty, setTimelineDirty] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [previewActive, setPreviewActive] = useState(false);
  const [previewResetKey, setPreviewResetKey] = useState(0);
  const timelinePageRef = useRef<PageSnapshot | null>(null);
  const presentationControls = useRef<PresentationControls | null>(null);
  const [storyDrafts, setStoryDrafts] = useState<Record<string, DesignIntentDraft>>({});
  const [chartDrafts, setChartDrafts] = useState<Record<string, Record<string, ChartDataDraft>>>(
    {},
  );
  const [pendingDraftsOpen, setPendingDraftsOpen] = useState(false);
  const [draftResetKey, setDraftResetKey] = useState(0);
  const [importingImages, setImportingImages] = useState(false);
  const storyDirty = Object.values(storyDrafts).some((draft) => draft.dirty);
  const chartDirty = Object.values(chartDrafts).some((drafts) => Object.keys(drafts).length > 0);
  const auxiliaryDirty = projectDirty || storyDirty || chartDirty || timelineDirty;
  const { client, backend, state } = usePptdDocument(auxiliaryDirty, importingImages);
  const retainChartDraft = useCallback(
    (pageId: string, elementId: string, draft: ChartDataDraft | null) => {
      setChartDrafts((current) => {
        if (JSON.stringify(current[pageId]?.[elementId] ?? null) === JSON.stringify(draft))
          return current;
        const pageDrafts = { ...current[pageId] };
        if (draft) pageDrafts[elementId] = draft;
        else delete pageDrafts[elementId];
        const next = { ...current, [pageId]: pageDrafts };
        if (!Object.keys(pageDrafts).length) delete next[pageId];
        return next;
      });
    },
    [],
  );
  const retainStoryDraft = useCallback((pageId: string, draft: DesignIntentDraft | null) => {
    setStoryDrafts((current) => {
      if (JSON.stringify(current[pageId] ?? null) === JSON.stringify(draft)) return current;
      const next = { ...current };
      if (draft) next[pageId] = draft;
      else delete next[pageId];
      return next;
    });
  }, []);
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [insertionTool, setInsertionTool] = useState<InsertionTool | null>(null);
  const [autoEditId, setAutoEditId] = useState<string | null>(null);
  const [scale, setScale] = useState<number | undefined>();
  const [actualScale, setActualScale] = useState(1);
  const [notesOpen, setNotesOpen] = useState(true);
  const [navigationCollapsed, setNavigationCollapsed] = useState(false);
  const [inspectorCollapsed, setInspectorCollapsed] = useState(false);
  const [keyboardHelpOpen, setKeyboardHelpOpen] = useState(false);
  const pageFocusRef = useRef<{
    pageId: string;
    occurrenceId?: string;
    scope: 'canvas' | 'thumbnails';
  } | null>(null);
  const presenterReturnFocus = useRef<HTMLElement | null>(null);
  const [presenting, setPresenting] = useState(false);
  const [presenterNotesOpen, setPresenterNotesOpen] = useState(false);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const [historyPageId, setHistoryPageId] = useState<string | null>(null);
  const [leftTab, setLeftTabState] = useState<'pages' | 'files' | 'project' | 'assets'>('pages');
  const setLeftTab = useCallback((tab: 'pages' | 'files' | 'project' | 'assets') => {
    setLeftTabState(tab);
    setNavigationCollapsed(false);
  }, []);
  const showProjectEditor = useCallback(() => {
    setLeftTab('project');
    requestAnimationFrame(() => {
      const editor = document.querySelector<HTMLElement>('[data-hd-project-editor]');
      editor?.scrollIntoView({ block: 'start', behavior: 'instant' });
      editor
        ?.querySelector<HTMLElement>('select, button:not(:disabled)')
        ?.focus({ preventScroll: true });
    });
  }, [setLeftTab]);
  const [presentationView, setPresentationView] = useState<DeckSnapshot | null>(null);
  const [presentationLoading, setPresentationLoading] = useState(false);
  const [presentationError, setPresentationError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportReport, setExportReport] = useState<string | null>(null);
  const [uiError, setUiError] = useState<string | null>(null);
  const snapshot = state.snapshot;
  const selectedPresentationId = searchParams.get('presentation');
  const requestedOccurrence = searchParams.get('occurrence');
  const project = useMemo(
    () => (snapshot ? readProjectModel(snapshot.metadata) : null),
    [snapshot],
  );
  const viewPages = selectedPresentationId
    ? presentationView?.presentationId === selectedPresentationId
      ? presentationView.pages
      : []
    : (snapshot?.pages ?? []);
  const requestedId = searchParams.get('page');
  const selectedView =
    viewPages.find((item) => item.occurrenceId === requestedOccurrence) ??
    viewPages.find(
      (item) =>
        item.pageId === requestedId ||
        item.shortCode?.toLowerCase() === requestedId?.toLowerCase() ||
        item.metadata.label?.toLowerCase() === requestedId?.toLowerCase(),
    ) ??
    viewPages[0];
  const selectedPageId =
    selectedView?.pageId ??
    (!selectedPresentationId && requestedId && state.drafts[requestedId] ? requestedId : null);
  const livePage = selectedPageId ? client.page(selectedPageId) : undefined;
  const page: PageSnapshot | undefined = useMemo(
    () =>
      selectedView?.versionId
        ? selectedView
        : livePage
          ? {
              ...livePage,
              occurrenceId: selectedView?.occurrenceId,
              ...(selectedView?.presentationNotes !== undefined
                ? { data: { ...livePage.data, notes: selectedView.presentationNotes } }
                : {}),
            }
          : undefined,
    [livePage, selectedView],
  );
  const theme = useMemo(
    () => (snapshot?.manifest.theme ?? {}) as PptdTheme,
    [snapshot?.manifest.theme],
  );
  const pageIndex = selectedView ? viewPages.indexOf(selectedView) : -1;
  const selectedElements =
    page?.data.elements.filter((element) => selectedIds.includes(element.elementId)) ?? [];
  const drafts = Object.values(state.drafts).filter(draftHasChanges);
  const conflict = selectedPageId ? state.drafts[selectedPageId]?.conflict : undefined;
  const pageReadonly = !snapshot?.writable || !!selectedView?.versionId;
  const readonly = pageReadonly || previewActive || timelineDirty;
  if (
    page &&
    (!timelineDirty ||
      (timelinePageRef.current?.pageId === page.pageId &&
        timelinePageRef.current?.occurrenceId === page.occurrenceId &&
        timelinePageRef.current?.versionId === page.versionId))
  )
    timelinePageRef.current = page;
  const authoringPage = timelineDirty ? (timelinePageRef.current ?? page) : page;
  const busy = state.saving || exporting || importingImages;
  const presentationBlocked = auxiliaryDirty || presentationLoading || !!presentationError;
  const nextPage = pageIndex >= 0 ? viewPages[pageIndex + 1] : undefined;
  const historyPage = snapshot?.pages.find((item) => item.pageId === historyPageId);
  const currentPageIdRef = useRef(selectedPageId);
  currentPageIdRef.current = selectedPageId;

  useDocumentTitle(snapshot ? `${snapshot.title} · HUANDENG Editor` : 'HUANDENG Editor');

  const run = useCallback(async (task: () => Promise<unknown>) => {
    setUiError(null);
    try {
      await task();
    } catch (error) {
      setUiError(error instanceof Error ? error.message : String(error));
    }
  }, []);

  const selectPage = useCallback(
    (id: string, occurrenceId?: string, focusTarget?: 'canvas' | 'thumbnails') => {
      if (timelineDirty) {
        setUiError('动画还有未保存的修改，请在时间线中重试保存或还原后再切换页面。');
        return;
      }
      const scope = focusTarget ?? editorKeyboardScope(document.activeElement);
      pageFocusRef.current =
        scope === 'canvas' || scope === 'thumbnails' ? { pageId: id, occurrenceId, scope } : null;
      setSelectedIds([]);
      setInsertionTool(null);
      setAutoEditId(null);
      setSearchParams(
        () => {
          const next = new URLSearchParams(window.location.search);
          next.set('page', id);
          if (occurrenceId) next.set('occurrence', occurrenceId);
          else next.delete('occurrence');
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams, timelineDirty],
  );

  useLayoutEffect(() => {
    const intent = pageFocusRef.current;
    // An older router transition must not consume a newer keyboard navigation's focus intent.
    if (
      !intent ||
      intent.pageId !== selectedPageId ||
      intent.occurrenceId !== selectedView?.occurrenceId
    )
      return;
    pageFocusRef.current = null;
    if (intent.scope === 'canvas') focusEditorCanvas();
    else
      document
        .querySelector<HTMLElement>(
          `[data-hd-thumbnail-key="${CSS.escape(selectedView?.occurrenceId ?? selectedPageId ?? '')}"]`,
        )
        ?.focus({ preventScroll: true });
  }, [selectedPageId, selectedView?.occurrenceId]);

  useEffect(() => {
    if (presenting) {
      presenterReturnFocus.current = document.activeElement as HTMLElement;
      document.querySelector<HTMLElement>('[data-hd-presenter]')?.focus({ preventScroll: true });
    } else if (presenterReturnFocus.current) {
      const target = presenterReturnFocus.current;
      presenterReturnFocus.current = null;
      if (target.isConnected) target.focus({ preventScroll: true });
      else focusEditorCanvas();
    }
  }, [presenting]);

  const selectPresentation = useCallback(
    (id: string | null) => {
      if (timelineDirty) {
        setUiError('请先保存或还原时间线中的修改，再切换演讲。');
        return;
      }
      setSelectedIds([]);
      setInsertionTool(null);
      setAutoEditId(null);
      setPresenting(false);
      setPresentationError(null);
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          if (id) next.set('presentation', id);
          else next.delete('presentation');
          next.delete('page');
          next.delete('occurrence');
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams, timelineDirty],
  );

  const selectMainPage = useCallback(
    (id: string) => {
      if (timelineDirty) {
        setUiError('请先保存或还原时间线中的修改，再切换页面。');
        return;
      }
      setSelectedIds([]);
      setInsertionTool(null);
      setAutoEditId(null);
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          next.delete('presentation');
          next.delete('occurrence');
          next.set('page', id);
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams, timelineDirty],
  );

  const selectOccurrence = useCallback(
    (presentationId: string | null, pageId: string, occurrenceId: string) => {
      if (timelineDirty) {
        setUiError('请先保存或还原时间线中的修改，再切换引用。');
        return;
      }
      setSelectedIds([]);
      setInsertionTool(null);
      setAutoEditId(null);
      setPresentationError(null);
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          if (presentationId) next.set('presentation', presentationId);
          else next.delete('presentation');
          next.set('page', pageId);
          next.set('occurrence', occurrenceId);
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams, timelineDirty],
  );

  const loadAssets = useCallback(
    (options: AssetLibraryOptions) => backend.assets(options),
    [backend],
  );

  useEffect(() => {
    if (!selectedPresentationId || !snapshot) {
      setPresentationView(null);
      setPresentationLoading(false);
      setPresentationError(null);
      return;
    }
    let active = true;
    setPresentationLoading(true);
    void backend
      .presentation(selectedPresentationId)
      .then((result) => {
        if (active) {
          setPresentationView(result);
          setPresentationError(null);
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setPresentationView(null);
          setPresentationError(error instanceof Error ? error.message : String(error));
        }
      })
      .finally(() => {
        if (active) setPresentationLoading(false);
      });
    return () => {
      active = false;
    };
  }, [backend, selectedPresentationId, snapshot]);

  useEffect(() => {
    if (!page) return;
    setSelectedIds((ids) => {
      const next = ids.filter((id) =>
        page.data.elements.some((element) => element.elementId === id),
      );
      return next.length === ids.length ? ids : next;
    });
  }, [page]);

  useEffect(() => {
    if (!snapshot) return;
    void backend
      .selection(
        selectedPageId,
        selectedIds,
        client.clientId,
        selectedPresentationId && selectedView
          ? {
              presentationId: selectedPresentationId,
              occurrenceId: selectedView.occurrenceId,
              versionId: selectedView.versionId,
            }
          : undefined,
      )
      .catch(() => {});
  }, [
    backend,
    client.clientId,
    selectedPageId,
    selectedIds,
    snapshot,
    selectedPresentationId,
    selectedView,
  ]);

  const apply = useCallback(
    (operations: PptdOperation[]) =>
      run(async () => {
        const result = await client.apply(operations);
        if (result.createdPages[0]) selectMainPage(result.createdPages[0].pageId);
      }),
    [client, run, selectMainPage],
  );

  const removeElements = useCallback(() => {
    if (!page || !selectedIds.length) return;
    void run(async () => {
      const ordered = selectionRemovalIds(page.data.elements, selectedIds);
      await client.apply(
        ordered.map((elementId) => ({ op: 'element.remove', pageId: page.pageId, elementId })),
      );
      if (currentPageIdRef.current === page.pageId) {
        setSelectedIds([]);
        requestAnimationFrame(() => focusEditorCanvas());
      }
    });
  }, [client, page, run, selectedIds]);

  const copyElements = useCallback(
    (cut = false) => {
      if (!page || !snapshot || !selectedIds.length) return;
      void run(async () => {
        if (cut) await client.flushAll();
        const source = page.versionId ? page : client.page(page.pageId);
        if (!source) return;
        const ids = new Set(expandGroupIds(source.data.elements, selectedIds));
        const animation = knownTimeline(source.data);
        await navigator.clipboard.writeText(
          JSON.stringify({
            kind: 'huandeng-elements',
            deckId: snapshot.deckId,
            elements: source.data.elements.filter((element) => ids.has(element.elementId)),
            selectedIds,
            ...(animation
              ? {
                  timeline: {
                    ...animation,
                    tracks: animation.tracks.filter((track) => ids.has(track.targetId)),
                    cues: [],
                  },
                }
              : {}),
          }),
        );
        if (!cut) return;
        await client.apply(
          selectionRemovalIds(source.data.elements, selectedIds).map((elementId) => ({
            op: 'element.remove',
            pageId: source.pageId,
            elementId,
          })),
          { pages: { [source.pageId]: source.pageRevision } },
        );
        if (currentPageIdRef.current === source.pageId) {
          setSelectedIds([]);
          requestAnimationFrame(() => focusEditorCanvas());
        }
      });
    },
    [client, page, run, selectedIds, snapshot],
  );

  const patchElement = useCallback(
    (elementId: string, fields: Record<string, unknown>, autosave = true) => {
      if (!selectedPageId) return;
      const current = client.page(selectedPageId);
      const element = current?.data.elements.find((item) => item.elementId === elementId);
      if (!current || !element) return;
      try {
        if (element.elementType === 'group' && (fields.bounds || fields.rotation !== undefined)) {
          for (const patch of transformGroup(current.data.elements, elementId, fields))
            client.patchElement(selectedPageId, patch.elementId, patch.fields, autosave);
          const other = Object.fromEntries(
            Object.entries(fields).filter(([key]) => !['bounds', 'rotation'].includes(key)),
          );
          if (Object.keys(other).length)
            client.patchElement(selectedPageId, elementId, other, autosave);
        } else client.patchElement(selectedPageId, elementId, fields, autosave);
      } catch (error) {
        setUiError(error instanceof Error ? error.message : String(error));
      }
    },
    [client, selectedPageId],
  );

  const groupSelection = useCallback(
    (ungroup = false) => {
      if (!page) return;
      void run(async () => {
        if (ungroup) {
          const groups = selectedElements.filter((item) => item.elementType === 'group');
          const groupIds = new Set(groups.map((item) => item.elementId));
          if (knownTimeline(page.data)?.tracks.some((track) => groupIds.has(track.targetId)))
            throw new Error(
              '此组合带有动画轨道。请先在时间线中移除组合轨道，再取消组合；成员自身的轨道会保留。',
            );
          await client.apply(
            ungroupOperations(
              page.pageId,
              page.data.elements,
              groups.map((item) => item.elementId),
            ),
          );
          setSelectedIds(groups.flatMap(groupChildren));
        } else {
          const group = buildGroup(page.data.elements, selectedIds, `group-${crypto.randomUUID()}`);
          await client.apply([{ op: 'element.add', pageId: page.pageId, element: group }]);
          setSelectedIds([group.elementId]);
        }
      });
    },
    [client, page, run, selectedElements, selectedIds],
  );

  const importImages = useCallback(
    async (files: File[]) => {
      if (!page || !snapshot || readonly || busy || !files.length) return;
      await run(async () => {
        setImportingImages(true);
        try {
          const elements: PptdElement[] = [];
          for (const [index, file] of files.slice(0, 20).entries()) {
            const asset = await backend.importImage(file);
            const ratio = Math.min(
              (snapshot.size[0] * 0.7) / asset.width,
              (snapshot.size[1] * 0.7) / asset.height,
              1,
            );
            const width = asset.width * ratio;
            const height = asset.height * ratio;
            elements.push({
              elementId: `image-${crypto.randomUUID()}`,
              elementType: 'image',
              src: asset.path,
              bounds: [
                (snapshot.size[0] - width) / 2 + index * 12,
                (snapshot.size[1] - height) / 2 + index * 12,
                width,
                height,
              ],
              fit: { mode: 'contain' },
              sourceName: asset.name,
            });
          }
          await client.apply(
            elements.map((element) => ({ op: 'element.add', pageId: page.pageId, element })),
          );
          if (currentPageIdRef.current === page.pageId)
            setSelectedIds(elements.map((element) => element.elementId));
        } finally {
          setImportingImages(false);
        }
      });
    },
    [backend, busy, client, page, readonly, run, snapshot],
  );

  useEffect(() => {
    const paste = (event: ClipboardEvent) => {
      if (
        !page ||
        !snapshot ||
        readonly ||
        busy ||
        presenting ||
        event.defaultPrevented ||
        !['canvas', 'layers', 'workspace'].includes(editorKeyboardScope(event.target))
      )
        return;
      const files = Array.from(event.clipboardData?.files ?? []).filter((file) =>
        file.type.startsWith('image/'),
      );
      if (files.length) {
        event.preventDefault();
        importImages(files);
        return;
      }
      let copied: {
        kind?: string;
        deckId?: string;
        elements?: PptdElement[];
        selectedIds?: string[];
        timeline?: PageTimeline;
      };
      try {
        copied = JSON.parse(event.clipboardData?.getData('text/plain') ?? '');
      } catch {
        return;
      }
      if (
        copied.kind !== 'huandeng-elements' ||
        !Array.isArray(copied.elements) ||
        !Array.isArray(copied.selectedIds)
      )
        return;
      event.preventDefault();
      const copiedElements = copied.elements;
      const copiedSelection = copied.selectedIds;
      void run(async () => {
        if (copied.deckId !== snapshot.deckId)
          throw new Error('请在同一项目中复制对象。跨项目图片可用“从设备导入”复制素材。');
        if (copied.timeline) validateTimeline(copied.timeline, { elements: copiedElements });
        await client.flushAll();
        const destination = client.page(page.pageId);
        if (!destination) throw new Error('目标页面已不可用。');
        const duplicated = duplicateElements(
          copiedElements,
          copiedSelection,
          () => `node-${crypto.randomUUID()}`,
        );
        const animation = copiedTimelineTracks(
          copied.timeline ?? null,
          knownTimeline(destination.data),
          duplicated.idMap,
          () => crypto.randomUUID(),
          20,
        );
        const operations: PptdOperation[] = duplicated.copies.map((element) => ({
          op: 'element.add',
          pageId: page.pageId,
          element,
        }));
        if (animation !== knownTimeline(destination.data))
          operations.push({ op: 'page.timeline.set', pageId: page.pageId, timeline: animation });
        await client.apply(operations, { pages: { [page.pageId]: destination.pageRevision } });
        setSelectedIds(duplicated.selectedIds);
        requestAnimationFrame(() => focusEditorCanvas(duplicated.selectedIds[0]));
      });
    };
    window.addEventListener('paste', paste);
    return () => window.removeEventListener('paste', paste);
  }, [busy, client, importImages, page, presenting, readonly, run, snapshot]);

  const chooseTool = (tool: InsertionTool | null) => {
    setInsertionTool(tool);
    setSelectedIds([]);
    setAutoEditId(null);
  };

  const placeElement = (element: PptdElement) => {
    if (!page || readonly || busy) return;
    setInsertionTool(null);
    const targetId = page.pageId;
    void run(async () => {
      await client.apply([{ op: 'element.add', pageId: targetId, element }]);
      setSelectedIds([element.elementId]);
      if (element.elementType === 'text') setAutoEditId(element.elementId);
      else
        requestAnimationFrame(() =>
          document.querySelector<HTMLElement>('[data-hd-editor-canvas]')?.focus(),
        );
    });
  };

  const align = (alignment: Alignment) => {
    if (!page || !snapshot || !selectedElements.length) return;
    client.beginInteraction(page.pageId);
    for (const item of alignedBounds(selectedElements, alignment, snapshot.size))
      patchElement(item.elementId, { bounds: item.bounds }, false);
    void run(() => client.endInteraction(page.pageId));
  };

  const layer = (direction: 'front' | 'back') => {
    if (!page) return;
    const ids = page.data.elements.map((element) => element.elementId);
    const selection = new Set(expandGroupIds(page.data.elements, selectedIds));
    const selected = ids.filter((id) => selection.has(id));
    const rest = ids.filter((id) => !selection.has(id));
    void apply([
      {
        op: 'element.reorder',
        pageId: page.pageId,
        elementIds: direction === 'front' ? [...rest, ...selected] : [...selected, ...rest],
      },
    ]);
  };

  const stepPage = useCallback(
    (delta: number) => {
      if (!viewPages.length) return;
      // Router transitions may not have committed a preceding Home/End or repeat yet.
      // Its URL is synchronous; use that latest requested identity for the next step.
      const requested = new URLSearchParams(window.location.search);
      if (requested.get('presentation') !== selectedPresentationId) return;
      const occurrence = requested.get('occurrence');
      const id = requested.get('page');
      const requestedIndex = occurrence
        ? viewPages.findIndex((item) => item.occurrenceId === occurrence)
        : viewPages.findIndex((item) => item.pageId === id);
      const current = requestedIndex < 0 ? pageIndex : requestedIndex;
      const next = Math.max(0, Math.min(viewPages.length - 1, current + delta));
      selectPage(viewPages[next].pageId, viewPages[next].occurrenceId);
    },
    [viewPages, pageIndex, selectPage, selectedPresentationId],
  );

  const executeKeyboardCommand = useCallback(
    (command: EditorKeyboardCommand, target: EventTarget | null) => {
      if (command.type === 'help') {
        setKeyboardHelpOpen(true);
        return;
      }
      if (command.type === 'focus-region') {
        focusWorkspaceRegion(command.direction);
        return;
      }
      if (command.type === 'save') {
        if (editorKeyboardScope(target) === 'input' && target instanceof HTMLElement) target.blur();
        void run(async () => {
          await Promise.resolve();
          const current = client.getState();
          if (current.saving) {
            for (const id of Object.keys(current.drafts)) await client.flushPage(id);
          } else await client.flushAll();
        });
        return;
      }
      if (command.type === 'cancel') {
        setInsertionTool(null);
        setAutoEditId(null);
        setPresenting(false);
        setSelectedIds([]);
        if (!presenting) requestAnimationFrame(() => focusEditorCanvas());
        return;
      }
      if (command.type === 'present') {
        if (!page) return;
        if (presentationBlocked) {
          setUiError('请先保存项目草稿并解决演讲引用问题。');
          return;
        }
        void run(async () => {
          await client.flushAll();
          if (!command.fromCurrent && viewPages[0])
            selectPage(viewPages[0].pageId, viewPages[0].occurrenceId);
          setPresenterNotesOpen(false);
          setPresenting(true);
        });
        return;
      }
      if (command.type === 'page-step') {
        if (
          presenting &&
          (command.direction > 0
            ? presentationControls.current?.next()
            : presentationControls.current?.previous())
        )
          return;
        stepPage(command.direction);
        return;
      }
      if (command.type === 'page-boundary') {
        const next = command.end ? viewPages[viewPages.length - 1] : viewPages[0];
        if (next) selectPage(next.pageId, next.occurrenceId);
        return;
      }
      if (command.type === 'copy') {
        copyElements();
        return;
      }
      if (command.type === 'select-all') {
        if (page) setSelectedIds(topLevelElementIds(page.data.elements));
        return;
      }
      if (command.type === 'undo' || command.type === 'redo') {
        if (pageReadonly || timelineDirty || busy) return;
        const direction = command.type;
        setPreviewResetKey((key) => key + 1);
        void run(() => client.history(direction));
        return;
      }
      if (readonly || exporting || importingImages) return;
      if (command.type === 'nudge') {
        if (!selectedPageId) return;
        const current = client.page(selectedPageId);
        if (!current) return;
        const roots = new Set(selectionRootIds(current.data.elements, selectedIds));
        for (const element of current.data.elements) {
          if (!roots.has(element.elementId) || !element.bounds) continue;
          const [x, y, width, height] = element.bounds;
          patchElement(element.elementId, {
            bounds: [x + command.dx, y + command.dy, width, height],
          });
        }
        return;
      }
      if (busy) return;
      const railPageId =
        target instanceof Element
          ? target.closest<HTMLElement>('[data-hd-thumbnail]')?.dataset.hdThumbnail
          : undefined;
      if (command.type === 'cut') {
        copyElements(true);
      } else if (command.type === 'add-page') {
        if (selectedPresentationId) setLeftTab('project');
        else void apply([{ op: 'page.add', afterPageId: selectedPageId }]);
      } else if (command.type === 'duplicate') {
        if (railPageId || !selectedElements.length) {
          if (selectedPresentationId) setLeftTab('project');
          else {
            const pageId = railPageId ?? selectedPageId;
            if (pageId) void apply([{ op: 'page.duplicate', pageId }]);
          }
        } else if (page) {
          void run(async () => {
            await client.flushAll();
            const source = client.page(page.pageId);
            if (!source) throw new Error('目标页面已不可用。');
            const {
              copies,
              selectedIds: selection,
              idMap,
            } = duplicateElements(
              source.data.elements,
              selectedIds,
              () => `node-${crypto.randomUUID()}`,
              16,
            );
            const baseTimeline = knownTimeline(source.data);
            const animation = copiedTimelineTracks(
              baseTimeline,
              baseTimeline,
              idMap,
              () => crypto.randomUUID(),
              16,
            );
            const operations: PptdOperation[] = copies.map((element) => ({
              op: 'element.add',
              pageId: page.pageId,
              element,
            }));
            if (animation !== baseTimeline)
              operations.push({
                op: 'page.timeline.set',
                pageId: page.pageId,
                timeline: animation,
              });
            await client.apply(operations, { pages: { [page.pageId]: source.pageRevision } });
            if (currentPageIdRef.current === page.pageId) {
              setSelectedIds(selection);
              requestAnimationFrame(() => focusEditorCanvas(selection[0]));
            }
          });
        }
      } else if (command.type === 'group') {
        if (selectedIds.length) groupSelection(command.ungroup);
      } else if (command.type === 'remove-page') {
        if (selectedPresentationId) setLeftTab('project');
        else if (railPageId) void apply([{ op: 'page.remove', pageId: railPageId }]);
      } else if (command.type === 'remove-elements') {
        removeElements();
      } else if (command.type === 'tool' && page) {
        setSelectedIds([]);
        setAutoEditId(null);
        setInsertionTool(
          command.key === 'v'
            ? null
            : command.key === 't'
              ? { kind: 'text' }
              : command.key === 'l'
                ? { kind: 'line' }
                : { kind: 'shape', shapeName: 'rect' },
        );
        focusEditorCanvas();
      }
    },
    [
      apply,
      busy,
      client,
      copyElements,
      exporting,
      groupSelection,
      importingImages,
      page,
      pageReadonly,
      patchElement,
      presentationBlocked,
      presenting,
      readonly,
      removeElements,
      run,
      selectedElements.length,
      selectedIds,
      selectedPageId,
      selectedPresentationId,
      selectPage,
      setLeftTab,
      stepPage,
      timelineDirty,
      viewPages,
    ],
  );

  useEffect(() => {
    const capture = (event: KeyboardEvent) => {
      if (
        presenting &&
        event.key === 'Tab' &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey &&
        !event.isComposing &&
        !document.querySelector('[role="dialog"], [role="alertdialog"]')
      ) {
        event.preventDefault();
        event.stopPropagation();
        focusWorkspaceRegion(event.shiftKey ? -1 : 1);
        return;
      }
      const command = resolveEditorKeyboardCommand(
        event,
        editorKeyboardScope(event.target),
        presenting,
      );
      if (!command || !['save', 'focus-region', 'help'].includes(command.type)) return;
      if (
        command.type === 'save' &&
        event.target instanceof Element &&
        event.target.closest('[data-hd-inline-editor]')
      )
        return;
      event.preventDefault();
      event.stopPropagation();
      executeKeyboardCommand(command, event.target);
    };
    const keydown = (event: KeyboardEvent) => {
      const command = resolveEditorKeyboardCommand(
        event,
        editorKeyboardScope(event.target),
        presenting,
      );
      if (!command) return;
      event.preventDefault();
      executeKeyboardCommand(command, event.target);
    };
    window.addEventListener('keydown', capture, true);
    window.addEventListener('keydown', keydown);
    return () => {
      window.removeEventListener('keydown', capture, true);
      window.removeEventListener('keydown', keydown);
    };
  }, [executeKeyboardCommand, presenting]);

  useEffect(() => {
    const host = desktopHost();
    return host?.onEditCommand?.((nativeCommand: DesktopEditCommand) => {
      const target = document.activeElement;
      const keys = { cut: 'x', copy: 'c', paste: 'v', selectAll: 'a', undo: 'z', redo: 'y' };
      const command =
        nativeCommand === 'paste'
          ? null
          : resolveEditorKeyboardCommand(
              {
                key: keys[nativeCommand],
                ctrlKey: true,
                metaKey: false,
                shiftKey: false,
                altKey: false,
              },
              editorKeyboardScope(target),
              presenting,
            );
      if (command) executeKeyboardCommand(command, target);
      else void host.editNative?.(nativeCommand);
    });
  }, [executeKeyboardCommand, presenting]);

  const beforeExport = async () => {
    if (presentationBlocked) throw new Error('请先保存草稿并解决演讲引用问题。');
    await client.flushAll();
  };

  const copyDraft = () =>
    void run(async () => {
      if (!selectedPageId) return;
      const draft = state.drafts[selectedPageId];
      if (!draft) return;
      await navigator.clipboard.writeText(
        JSON.stringify(
          {
            pageId: selectedPageId,
            baseRevision: draft.base.pageRevision,
            fields: draft.fields,
            notes: draft.notes,
          },
          null,
          2,
        ),
      );
    });

  const recoveryState = state.recovering
    ? 'recovering'
    : state.recoveryRequired
      ? 'required'
      : undefined;
  const recoverPending = () => {
    setUiError(null);
    void client.recoverPending().catch(() => {});
  };
  const copyPendingWork = () =>
    void run(() => navigator.clipboard.writeText(JSON.stringify(client.pendingWork(), null, 2)));

  if (!snapshot)
    return (
      <div className="grid min-h-dvh place-items-center bg-canvas p-8">
        <div className="w-full max-w-xl rounded-lg border bg-background p-9 shadow-floating">
          <div className="mb-7 flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-md bg-brand font-serif text-2xl text-white">
              H
            </span>
            <div>
              <h1 className="text-lg font-semibold">HUANDENG Editor</h1>
              <p className="text-xs text-muted-foreground">独立页面 · 自由编辑 · 持续演进</p>
            </div>
          </div>
          {state.loading ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              正在连接本地项目…
            </p>
          ) : (
            <>
              <h2 className="mb-3 text-xl font-medium">打开一个 PPTD 项目</h2>
              <p className="mb-5 text-sm leading-relaxed text-muted-foreground">
                {desktopHost()
                  ? '选择项目中的 .pptd 文件，或者新建一个空白项目。'
                  : '这是浏览器开发预览。日常使用请启动桌面版 HUANDENG Editor，或从终端连接已有项目。'}
              </p>
              {!desktopHost() && (
                <pre className="overflow-x-auto rounded-md border bg-muted/50 p-4 text-xs">
                  huandeng open /完整路径/deck.pptd
                </pre>
              )}
              {state.error && (
                <p className="mt-4 text-xs text-muted-foreground">{state.error.message}</p>
              )}
              <div className="mt-6 flex gap-2">
                {recoveryState && (
                  <Button
                    aria-label="恢复未完成保存"
                    data-hd-recovery={recoveryState}
                    disabled={state.saving}
                    onClick={recoverPending}
                  >
                    <RefreshCw className={state.recovering ? 'animate-spin' : undefined} />
                    {state.recovering ? '正在恢复保存…' : '恢复未完成保存'}
                  </Button>
                )}
                <Button onClick={() => void client.refresh()}>
                  <RefreshCw />
                  重新连接
                </Button>
                {desktopHost() && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => void run(async () => desktopHost()?.openProject())}
                    >
                      <FolderOpen />
                      打开项目
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => void run(async () => desktopHost()?.newProject())}
                    >
                      <FilePlus2 />
                      新建项目
                    </Button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    );

  const status = state.recovering
    ? '正在恢复保存…'
    : state.recoveryRequired
      ? '保存待恢复'
      : drafts.some((draft) => draft.conflict)
        ? '草稿冲突 · 已保留'
        : state.error
          ? '保存需检查'
          : state.saving
            ? '正在保存…'
            : drafts.length
              ? `待保存 · ${drafts.length} 页`
              : pageReadonly
                ? '只读模式'
                : '页面已保存';
  const saveNeedsAttention =
    !!recoveryState || !!state.error || drafts.some((draft) => draft.conflict);
  const draftKinds = [
    projectDirty && '项目编排',
    storyDirty && 'Story',
    chartDirty && '图表数据',
    timelineDirty && '动画',
  ].filter(Boolean);
  const collectionTitle = selectedPresentationId
    ? (project?.presentations.find((item) => item.id === selectedPresentationId)?.title ??
      '当前演讲')
    : `主幻灯片 · ${snapshot.pages.length} 页`;
  return (
    <div
      className="hd-editor flex h-dvh min-w-[760px] flex-col overflow-hidden bg-canvas text-foreground"
      data-hd-editor
      data-hd-preview-active={previewActive || undefined}
    >
      <header
        className="hd-titlebar flex shrink-0 items-center border-b border-border bg-background"
        data-hd-focus-region="header"
        tabIndex={-1}
      >
        <div className="flex shrink-0 items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={desktopHost() ? '打开项目' : '显示项目文件'}
            title={desktopHost() ? '打开项目 Ctrl+O' : '显示项目文件'}
            onClick={() =>
              void run(async () => {
                await client.flushAll();
                if (desktopHost()) await desktopHost()?.openProject();
                else setLeftTab('files');
              })
            }
          >
            <FolderOpen />
          </Button>
          {desktopHost() && (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="新建项目"
              title="新建项目 Ctrl+N"
              onClick={() =>
                void run(async () => {
                  await client.flushAll();
                  await desktopHost()?.newProject();
                })
              }
            >
              <FilePlus2 />
            </Button>
          )}
        </div>
        <div className="hd-product-mark flex shrink-0 items-center gap-2" title="HUANDENG Editor">
          <HuandengMark className="size-6 shrink-0" />
          <span className="hd-product-name text-xs font-semibold tracking-wide">HUANDENG</span>
        </div>
        <span className="h-5 w-px shrink-0 bg-border" />
        <div className="hd-document-context">
          <h1
            className="min-w-0 truncate font-medium"
            title={snapshot.title || '未命名演示'}
            data-hd-document-title
          >
            {snapshot.title || '未命名演示'}
          </h1>
          <select
            aria-label="当前演讲集合"
            className="hd-collection-select"
            title={collectionTitle}
            value={selectedPresentationId ?? ''}
            onChange={(event) => selectPresentation(event.target.value || null)}
          >
            <option value="">主幻灯片 · {snapshot.pages.length} 页</option>
            {project?.presentations.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
        </div>
        <div className="hd-titlebar-actions">
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="撤销"
              title="撤销 Ctrl+Z"
              disabled={pageReadonly || timelineDirty || busy || !state.undoStack.length}
              onClick={() => {
                setPreviewResetKey((key) => key + 1);
                void run(() => client.history('undo'));
              }}
            >
              <Undo2 />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="重做"
              title="重做 Ctrl+Shift+Z"
              disabled={pageReadonly || timelineDirty || busy || !state.redoStack.length}
              onClick={() => {
                setPreviewResetKey((key) => key + 1);
                void run(() => client.history('redo'));
              }}
            >
              <Redo2 />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="当前页历史版本"
              title="当前页历史版本"
              disabled={!page}
              onClick={() => setHistoryPageId(selectedPageId)}
            >
              <History />
            </Button>
          </div>
          <div className="hd-page-save">
            <div
              className={`hd-save-status ${saveNeedsAttention ? 'text-amber-800 dark:text-amber-300' : 'text-muted-foreground'}`}
              aria-live="polite"
              data-hd-save-status
              data-hd-recovery-state={recoveryState}
              title={`${status}${auxiliaryDirty ? `；${draftKinds.join('、')}草稿请在对应面板保存` : ''}`}
            >
              {state.saving || state.recovering ? (
                <Loader2 className="size-3 shrink-0 animate-spin" />
              ) : saveNeedsAttention ? (
                <AlertCircle className="size-3 shrink-0" />
              ) : drafts.length ? (
                <Circle className="size-3 shrink-0" />
              ) : (
                <Check className="size-3 shrink-0" />
              )}
              <span className="truncate">{status}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              aria-label="保存页面"
              title="Ctrl+S 保存所有页面修改；其他草稿请在对应面板保存"
              disabled={readonly || busy}
              onClick={() => void run(() => client.flushAll())}
            >
              <Save />
              保存页面
            </Button>
          </div>
          {!state.connected && (
            <span
              className="hd-connection-status text-amber-800 dark:text-amber-300"
              role="status"
              data-hd-connection-state="reconnecting"
              title="正在重新连接文档服务，本地草稿会保留"
            >
              <RefreshCw className="size-3 shrink-0" />
              正在重连
            </span>
          )}
          <span className="h-5 w-px shrink-0 bg-border" />
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              aria-label="导出"
              data-hd-export
              disabled={busy || presentationBlocked}
              onClick={() => setExportOpen(true)}
            >
              {exporting ? <Loader2 className="animate-spin" /> : <Download />}
              导出
            </Button>
            <Button
              variant="default"
              size="sm"
              disabled={!page || busy || presentationBlocked}
              onClick={() =>
                void run(async () => {
                  await client.flushAll();
                  setPresenterNotesOpen(false);
                  setPresenting(true);
                })
              }
            >
              <Play />
              演示
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>
      {auxiliaryDirty && (
        <div
          className="hd-draft-notice flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-b border-amber-300/40 bg-amber-50 px-4 py-1.5 text-xs text-amber-900 dark:bg-amber-950/25 dark:text-amber-100"
          data-hd-pending-drafts
        >
          <span className="min-w-48 flex-1">
            {draftKinds.join('、')}草稿待处理，请在对应面板保存。
          </span>
          {projectDirty && (
            <Button size="xs" variant="ghost" onClick={showProjectEditor}>
              查看项目草稿
            </Button>
          )}
          {storyDirty && (
            <Button
              size="xs"
              variant="ghost"
              onClick={() => {
                if (timelineDirty) {
                  setUiError('请先保存或还原时间线中的修改，再切换到 Story 草稿。');
                  return;
                }
                const id = Object.keys(storyDrafts).find((key) => storyDrafts[key].dirty);
                if (id) {
                  selectMainPage(id);
                  setInspectorCollapsed(false);
                  setPreviewResetKey((key) => key + 1);
                }
              }}
            >
              查看 Story 草稿
            </Button>
          )}
          {(chartDirty || storyDirty) && (
            <Button size="xs" variant="ghost" onClick={() => setPendingDraftsOpen(true)}>
              管理未保存草稿
            </Button>
          )}
          {timelineDirty && (
            <Button
              size="xs"
              variant="ghost"
              onClick={() => {
                setTimelineOpen(true);
                requestAnimationFrame(() => {
                  const region = document.querySelector('[data-hd-keyboard-region="timeline"]');
                  const target =
                    region?.querySelector<HTMLElement>('[role="alert"] button:not(:disabled)') ??
                    region?.querySelector<HTMLElement>('button:not(:disabled)');
                  target?.focus({ preventScroll: true });
                });
              }}
            >
              查看动画草稿
            </Button>
          )}
        </div>
      )}
      {(recoveryState || uiError || state.error || presentationError) && (
        <div
          className="flex shrink-0 flex-wrap items-start gap-2 border-b border-amber-300/50 bg-amber-50 px-4 py-2 text-xs text-amber-900 dark:bg-amber-950/35 dark:text-amber-100"
          role="alert"
          data-hd-recovery={recoveryState}
        >
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
          <div className="min-w-48 flex-1">
            {recoveryState ? (
              <>
                <p>
                  {state.recovering
                    ? '正在核对并恢复这次保存，本地草稿会保留。'
                    : state.error?.code === 'RECOVERY_REQUIRED'
                      ? '文件或保存记录与预期不一致，恢复已停止。请先复制待保存页面，再检查文件冲突与恢复详情。'
                      : '有一次保存尚未完成，本地草稿已保留。若文件仍被其他程序占用，请先关闭占用，再恢复保存。完成后即可关闭或切换项目。'}
                </p>
                {(uiError || state.error) && (
                  <details className="mt-1 break-words">
                    <summary className="cursor-pointer">查看恢复详情</summary>
                    <p className="mt-1 whitespace-pre-wrap">{uiError || state.error?.message}</p>
                  </details>
                )}
              </>
            ) : (
              uiError || state.error?.message || presentationError
            )}
          </div>
          {recoveryState && (
            <>
              <Button
                size="xs"
                variant="outline"
                aria-label="恢复未完成保存"
                disabled={state.saving}
                onClick={recoverPending}
              >
                <RefreshCw className={state.recovering ? 'animate-spin' : undefined} />
                {state.recovering ? '正在恢复保存…' : '恢复未完成保存'}
              </Button>
              <Button
                size="xs"
                variant="ghost"
                disabled={!drafts.length && !state.canRetry}
                title="复制本地页面草稿与原始保存请求，保留未确认的内容"
                onClick={copyPendingWork}
              >
                <Copy />
                复制待保存页面
              </Button>
            </>
          )}
          {state.canRetry && !recoveryState && (
            <Button
              size="xs"
              variant="outline"
              disabled={state.saving}
              onClick={() => void run(() => client.retryPending())}
            >
              重试同一次保存
            </Button>
          )}
          <Button
            size="xs"
            variant="ghost"
            onClick={() => {
              setUiError(null);
              void client.refresh();
            }}
          >
            检查最新状态
          </Button>
        </div>
      )}
      <div className="flex min-h-0 flex-1">
        <aside
          className={`hd-navigation ${navigationCollapsed ? 'hidden' : 'flex'} shrink-0 flex-col border-r border-border bg-sidebar`}
          aria-label="项目导航"
          data-hd-focus-region="navigation"
          tabIndex={-1}
        >
          <div className="hd-navigation-tabs flex h-10 shrink-0 items-center gap-1 border-b border-border px-2">
            <Button
              variant={leftTab === 'project' ? 'secondary' : 'ghost'}
              size="xs"
              className="flex-1"
              aria-label="项目与故事"
              aria-pressed={leftTab === 'project'}
              onClick={() => setLeftTab('project')}
            >
              <BookOpen /> 项目
            </Button>
            <Button
              variant={leftTab === 'pages' ? 'secondary' : 'ghost'}
              size="xs"
              className="flex-1"
              aria-label="页面缩略图"
              aria-pressed={leftTab === 'pages'}
              onClick={() => setLeftTab('pages')}
            >
              <PanelsTopLeft />
              页面
            </Button>
            <Button
              variant={leftTab === 'assets' ? 'secondary' : 'ghost'}
              size="xs"
              className="flex-1"
              aria-label="项目素材库"
              aria-pressed={leftTab === 'assets'}
              onClick={() => setLeftTab('assets')}
            >
              <Images /> 素材
            </Button>
            <Button
              variant={leftTab === 'files' ? 'secondary' : 'ghost'}
              size="xs"
              className="flex-1"
              aria-label="项目文件树"
              aria-pressed={leftTab === 'files'}
              onClick={() => setLeftTab('files')}
            >
              <Files />
              文件
            </Button>
          </div>
          <div className={leftTab === 'project' ? 'min-h-0 flex-1 overflow-y-auto' : 'hidden'}>
            <ProjectOverview
              snapshot={snapshot}
              selectedPageId={selectedPageId}
              selectedPresentationId={selectedPresentationId}
              selectedOccurrenceId={selectedView?.occurrenceId}
              onSelectPresentation={selectPresentation}
              onSelectOccurrence={selectOccurrence}
              onEditProject={showProjectEditor}
            />
            <ProjectPanel
              snapshot={snapshot}
              selectedPresentationId={selectedPresentationId}
              onSelectPresentation={selectPresentation}
              onSelectPage={(id) => {
                selectMainPage(id);
                setLeftTab('pages');
              }}
              onSelectOccurrence={selectOccurrence}
              onApply={(operations, expected) => client.apply(operations, expected)}
              onDirtyChange={setProjectDirty}
              loadVersions={(id) => backend.pageHistory(id)}
              disabled={!snapshot.writable || busy}
            />
          </div>
          {leftTab === 'assets' && (
            <AssetLibrary
              loadAssets={loadAssets}
              refreshKey={`${snapshot.epoch}:${snapshot.sequence}`}
              selectedPageId={selectedPageId}
              disabled={readonly || busy || !page}
              onSelectUsage={(usage) => {
                if (timelineDirty) {
                  setUiError('请先保存或还原时间线中的修改。');
                  return;
                }
                selectMainPage(usage.pageId);
                if (usage.elementId) setSelectedIds([usage.elementId]);
              }}
              onImport={importImages}
              onInsert={async (asset, dimensions) => {
                if (!page || readonly || busy) throw new Error('请先选择可编辑的主页面。');
                const ratio = Math.min(
                  (snapshot.size[0] * 0.7) / dimensions.width,
                  (snapshot.size[1] * 0.7) / dimensions.height,
                  1,
                );
                const width = dimensions.width * ratio;
                const height = dimensions.height * ratio;
                const element: PptdElement = {
                  elementId: `image-${crypto.randomUUID()}`,
                  elementType: 'image',
                  src: asset.path,
                  sourceName: asset.displayName,
                  bounds: [
                    (snapshot.size[0] - width) / 2,
                    (snapshot.size[1] - height) / 2,
                    width,
                    height,
                  ],
                  fit: { mode: 'contain' },
                };
                await client.apply([{ op: 'element.add', pageId: page.pageId, element }]);
                if (currentPageIdRef.current === page.pageId) setSelectedIds([element.elementId]);
              }}
              onReplace={async (usage, file) => {
                if (readonly || busy || !usage.elementId) throw new Error('当前引用暂不可修改。');
                setImportingImages(true);
                try {
                  const asset = await backend.importImage(file);
                  await client.apply(
                    [
                      {
                        op: 'element.patch',
                        pageId: usage.pageId,
                        elementId: usage.elementId,
                        set: { src: asset.path, sourceName: asset.name },
                      },
                    ],
                    { pages: { [usage.pageId]: usage.pageRevision } },
                  );
                } finally {
                  setImportingImages(false);
                }
              }}
            />
          )}
          {leftTab === 'files' ? (
            <PptdProjectTree
              backend={backend}
              snapshot={snapshot}
              currentPageId={selectedPageId}
              onSelectPage={selectMainPage}
            />
          ) : leftTab === 'pages' ? (
            <PptdThumbnailRail
              pages={viewPages}
              size={snapshot.size}
              theme={theme}
              currentPageId={selectedPageId}
              currentOccurrenceId={selectedView?.occurrenceId}
              disabled={readonly || busy || !!selectedPresentationId}
              tombstones={
                selectedPresentationId
                  ? []
                  : Object.entries(snapshot.metadata.slides).filter(
                      ([, item]) => item.state === 'tombstone',
                    )
              }
              onSelect={selectPage}
              onAdd={() =>
                void apply([
                  {
                    op: 'page.add',
                    afterPageId: selectedPageId,
                    page: { pageType: 'content', elements: [], notes: '' },
                  },
                ])
              }
              onDuplicate={(pageId) => void apply([{ op: 'page.duplicate', pageId }])}
              onRemove={(pageId) => void apply([{ op: 'page.remove', pageId }])}
              onHistory={setHistoryPageId}
              onShowFile={(pageId) => {
                selectPage(pageId);
                setLeftTab('files');
              }}
              onMove={(pageId, afterPageId) =>
                void apply([{ op: 'page.move', pageId, afterPageId }])
              }
              onRestore={(pageId) =>
                void run(async () => {
                  await client.apply([{ op: 'page.restore', pageId, afterPageId: selectedPageId }]);
                  selectPage(pageId);
                })
              }
            />
          ) : null}
        </aside>
        <main
          className="flex min-w-0 flex-1 flex-col"
          onDragOver={(event) => {
            if (event.dataTransfer.types.includes('Files')) event.preventDefault();
          }}
          onDrop={(event) => {
            const files = Array.from(event.dataTransfer.files);
            if (files.length) {
              event.preventDefault();
              importImages(files);
            }
          }}
        >
          <div
            className="hd-editor-toolbar flex h-11 shrink-0 items-center gap-1 border-b border-border bg-background px-3"
            data-hd-focus-region="tools"
            tabIndex={-1}
          >
            <Button
              variant={insertionTool ? 'ghost' : 'secondary'}
              size="icon-sm"
              aria-label="选择工具"
              aria-pressed={!insertionTool}
              title="选择 V · Esc 取消插入"
              onClick={() => chooseTool(null)}
            >
              <MousePointer2 />
            </Button>
            <span className="mx-1 h-4 w-px bg-border" />
            <Button
              variant="ghost"
              size="sm"
              aria-label="添加文本"
              title="文字 T · 在画布点击或拖拽放置"
              aria-pressed={insertionTool?.kind === 'text'}
              disabled={readonly || busy || !page}
              onClick={() => chooseTool(insertionTool?.kind === 'text' ? null : { kind: 'text' })}
            >
              <Type />
              文字
            </Button>
            <Button
              variant={leftTab === 'assets' && !navigationCollapsed ? 'secondary' : 'ghost'}
              size="sm"
              aria-label="打开素材库"
              aria-pressed={leftTab === 'assets' && !navigationCollapsed}
              title="浏览项目素材，复用到当前页"
              data-hd-open-assets
              onClick={() => {
                setInsertionTool(null);
                setAutoEditId(null);
                setLeftTab('assets');
                requestAnimationFrame(() =>
                  document
                    .querySelector<HTMLInputElement>('[data-hd-asset-library] input[type="search"]')
                    ?.focus({ preventScroll: true }),
                );
              }}
            >
              <Images />
              素材
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="从设备导入并放置图片"
              title="从设备导入图片并放置到当前页"
              data-hd-import-images
              disabled={readonly || busy || !page}
              onClick={() => imageInputRef.current?.click()}
            >
              {importingImages ? <Loader2 className="animate-spin" /> : <Upload />}
            </Button>
            <ShapeInsertMenu
              disabled={readonly || busy || !page}
              active={insertionTool?.kind === 'shape'}
              onChoose={chooseTool}
            />
            <Button
              variant="ghost"
              size="sm"
              aria-label="添加线条"
              title="线条 L · 拖拽绘制，Shift 约束方向"
              aria-pressed={insertionTool?.kind === 'line'}
              disabled={readonly || busy || !page}
              onClick={() => chooseTool(insertionTool?.kind === 'line' ? null : { kind: 'line' })}
            >
              <Minus />
              线条
            </Button>
            <ScienceInsertMenu
              size={snapshot.size}
              disabled={readonly || busy || !page}
              onInsert={(element) => {
                if (!page) return;
                void run(async () => {
                  await client.apply([{ op: 'element.add', pageId: page.pageId, element }]);
                  setSelectedIds([element.elementId]);
                });
              }}
            />
            <span className="mx-1 h-4 w-px bg-border" />
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="组合对象"
              title="组合 Ctrl+G"
              disabled={readonly || busy || selectedElements.length < 2}
              onClick={() => groupSelection()}
            >
              <Group />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="取消组合"
              title="取消组合 Ctrl+Shift+G"
              disabled={
                readonly || busy || !selectedElements.some((item) => item.elementType === 'group')
              }
              onClick={() => groupSelection(true)}
            >
              <Ungroup />
            </Button>
            <span
              className="ml-auto truncate font-mono text-[11px] text-muted-foreground"
              title={page ? `${page.path} · ${page.pageId}` : undefined}
            >
              {page?.shortCode ?? page?.metadata.label ?? ''}{' '}
              {page && `· ${pageIndex + 1} / ${viewPages.length}`}
              {page && <span className="ml-3 hidden xl:inline">{page.path}</span>}
            </span>
          </div>
          {selectedPresentationId && (
            <div className="flex shrink-0 items-center gap-2 border-b bg-brand-soft px-4 py-2 text-xs">
              <span className="flex-1">
                {selectedView?.versionId
                  ? '此引用固定为已记录版本，内容只读。'
                  : '此演讲引用 主幻灯片；内容编辑会同步到主页面及其他实时引用。'}
              </span>
              {selectedPageId && (
                <Button size="xs" variant="outline" onClick={() => selectMainPage(selectedPageId)}>
                  前往 Main Slide
                </Button>
              )}
              <Button size="xs" variant="ghost" onClick={showProjectEditor}>
                编排与备注
              </Button>
            </div>
          )}
          {conflict && (
            <div
              className="shrink-0 border-b border-amber-300/50 bg-amber-50 px-4 py-3 text-amber-900"
              data-hd-conflict
            >
              <p className="mb-2 text-xs">{conflict} 自动保存已暂停。</p>
              <div className="flex gap-2">
                <Button size="xs" variant="outline" onClick={copyDraft}>
                  <Copy />
                  复制本地草稿
                </Button>
                <Button
                  size="xs"
                  variant="outline"
                  disabled={state.saving || state.canRetry || state.recoveryRequired}
                  onClick={() => {
                    if (selectedPageId) client.discardDraft(selectedPageId);
                    setUiError(null);
                  }}
                >
                  放弃草稿，采用磁盘版本
                </Button>
              </div>
            </div>
          )}
          {insertionTool && (
            <div
              className="flex h-8 shrink-0 items-center gap-2 border-b border-brand/15 bg-brand-soft px-4 text-xs text-brand"
              role="status"
              data-hd-insertion-hint
            >
              <MousePointer2 className="size-3.5" />
              <span>{insertionLabel(insertionTool)}：点击放置，拖拽设置大小</span>
              <span className="ml-auto text-[11px]">Shift 约束 · Esc 取消</span>
            </div>
          )}
          {previewActive && (
            <div
              className="hd-preview-context flex shrink-0 items-center gap-3 border-b border-brand/15 bg-brand-soft px-4 py-1.5 text-xs"
              data-hd-preview-context
            >
              <span className="flex shrink-0 items-center gap-1.5 font-medium text-brand">
                <Clapperboard className="size-3.5" />
                动画预览
              </span>
              <span
                className="min-w-0 flex-1 truncate text-muted-foreground"
                title={selectedIds.length ? selectedIds.join('、') : '当前页面'}
              >
                {selectedIds.length === 1
                  ? `对象 · ${selectedIds[0]}`
                  : selectedIds.length
                    ? `已选 ${selectedIds.length} 个对象`
                    : '当前页面'}
              </span>
              <Button
                variant="outline"
                size="xs"
                onClick={() => {
                  setPreviewResetKey((key) => key + 1);
                  requestAnimationFrame(() => focusEditorCanvas(selectedIds[0]));
                }}
              >
                返回基础编辑
              </Button>
            </div>
          )}
          <div className="relative flex min-h-0 flex-1 flex-col">
            {authoringPage ? (
              <AuthoringWorkspace
                canvas={{
                  page: authoringPage,
                  size: snapshot.size,
                  theme,
                  selectedIds,
                  onSelect: setSelectedIds,
                  disabled: readonly,
                  insertionTool,
                  onPlace: placeElement,
                  autoEditId,
                  scale,
                  onScaleChange: setActualScale,
                  onPatch: patchElement,
                  onBegin: () => client.beginInteraction(authoringPage.pageId),
                  onEnd: () => void run(() => client.endInteraction(authoringPage.pageId)),
                  onCancel: (originals) =>
                    client.cancelInteraction(authoringPage.pageId, originals),
                  onFlush: () => void run(() => client.flushPage(authoringPage.pageId)),
                  onComposition: (composing) =>
                    client.setComposing(authoringPage.pageId, composing),
                }}
                timelineOpen={timelineOpen}
                previewResetKey={previewResetKey}
                timelineDisabled={
                  !snapshot.writable ||
                  !!authoringPage.versionId ||
                  busy ||
                  !snapshot.pages.some((item) => item.pageId === authoringPage.pageId)
                }
                onTimelineDirty={setTimelineDirty}
                onPreviewModeChange={setPreviewActive}
                onTimelineChange={async (timeline, expectedPageRevision) => {
                  const current = client
                    .getState()
                    .snapshot?.pages.find((item) => item.pageId === authoringPage.pageId);
                  if (!current)
                    throw new Error('来源主页面已被移除；动画草稿仍保留在此处，可复制或还原。');
                  if (current.pageRevision !== expectedPageRevision)
                    throw new Error(
                      '页面已在别处改变，当前动画草稿已保留。请先复制草稿，再还原到最新页面继续编辑。',
                    );
                  return client.apply(
                    [{ op: 'page.timeline.set', pageId: authoringPage.pageId, timeline }],
                    { pages: { [authoringPage.pageId]: current.pageRevision } },
                  );
                }}
              />
            ) : (
              <div className="grid h-full place-items-center">
                <div className="text-center">
                  <p className="mb-4 text-sm text-muted-foreground">
                    {selectedPresentationId
                      ? presentationLoading
                        ? '正在读取演讲引用与固定版本…'
                        : '在项目面板中为这份演讲添加章节或页面。'
                      : '从一张空白页开始。'}
                  </p>
                  <Button
                    disabled={readonly || busy}
                    onClick={() =>
                      selectedPresentationId
                        ? setLeftTab('project')
                        : void apply([{ op: 'page.add' }])
                    }
                  >
                    <Plus />
                    {selectedPresentationId ? '编排演讲' : '新增页面'}
                  </Button>
                </div>
              </div>
            )}
          </div>
          <div className="hd-statusbar flex h-9 shrink-0 items-center gap-2 border-y border-border bg-background px-4 text-xs text-muted-foreground">
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={navigationCollapsed ? '展开项目导航' : '收起项目导航'}
              aria-expanded={!navigationCollapsed}
              title={navigationCollapsed ? '展开项目导航' : '收起项目导航'}
              onClick={() => setNavigationCollapsed((value) => !value)}
            >
              {navigationCollapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
            </Button>
            <Button
              variant="ghost"
              size="xs"
              aria-expanded={notesOpen}
              onClick={() => setNotesOpen((value) => !value)}
            >
              演讲备注
            </Button>
            <Button
              variant={timelineOpen ? 'secondary' : 'ghost'}
              size="xs"
              aria-expanded={timelineOpen}
              disabled={!authoringPage}
              onClick={() => {
                if (timelineDirty) {
                  setUiError('时间线还有未保存修改，请重试保存或还原后再收起。');
                  return;
                }
                if (!timelineOpen)
                  void run(async () => {
                    await client.flushAll();
                    setInsertionTool(null);
                    setAutoEditId(null);
                    setNotesOpen(false);
                    setTimelineOpen(true);
                  });
                else setTimelineOpen(false);
              }}
            >
              <Clapperboard className="size-3.5" />
              动画
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label="键盘操作帮助"
              title="键盘操作 F1"
              onClick={() => setKeyboardHelpOpen(true)}
            >
              <Keyboard />
            </Button>
            {exportReport && (
              <a href={exportReport} download className="text-xs underline underline-offset-2">
                导出说明
              </a>
            )}
            <span className="ml-auto hidden text-[11px] xl:block">
              Shift 多选 / 等比例缩放 · Alt 暂停吸附
            </span>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label="缩小画布"
              className="ml-auto xl:ml-0"
              onClick={() => setScale(Math.max(0.15, (scale ?? actualScale) - 0.1))}
            >
              <Minus />
            </Button>
            <button
              type="button"
              className="min-w-12 font-mono text-[11px]"
              title="点击适合窗口"
              onClick={() => setScale(undefined)}
            >
              {Math.round(actualScale * 100)}%
            </button>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label="放大画布"
              onClick={() => setScale(Math.min(3, (scale ?? actualScale) + 0.1))}
            >
              <Plus />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label="适合窗口"
              onClick={() => setScale(undefined)}
            >
              <Maximize2 />
            </Button>
            {!previewActive && (
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label={inspectorCollapsed ? '展开对象属性' : '收起对象属性'}
                aria-expanded={!inspectorCollapsed}
                title={inspectorCollapsed ? '展开对象属性' : '收起对象属性'}
                onClick={() => setInspectorCollapsed((value) => !value)}
              >
                {inspectorCollapsed ? <PanelRightOpen /> : <PanelRightClose />}
              </Button>
            )}
          </div>
          {notesOpen && page && (
            <div
              className="h-28 shrink-0 overflow-auto bg-background px-4 py-3"
              data-hd-focus-region="notes"
              tabIndex={-1}
            >
              <Textarea
                aria-label="演讲备注"
                placeholder="这页要讲什么？"
                className="min-h-20 resize-none border-none bg-transparent p-0 text-xs shadow-none focus-visible:ring-0"
                value={page.data.notes ?? ''}
                disabled={readonly || !!selectedPresentationId}
                onChange={(event) => client.setNotes(page.pageId, event.target.value)}
                onCompositionStart={() => client.setComposing(page.pageId, true)}
                onCompositionEnd={() => client.setComposing(page.pageId, false)}
              />
            </div>
          )}
        </main>
        {page && (
          <div className={inspectorCollapsed || previewActive ? 'hidden' : 'contents'}>
            <PptdInspector
              key={`${page.pageId}:${draftResetKey}`}
              page={page}
              chartDrafts={chartDrafts[page.pageId]}
              onChartDraftChange={retainChartDraft}
              theme={theme}
              selectedIds={selectedIds}
              disabled={readonly}
              onSelect={setSelectedIds}
              onActivate={(id) => requestAnimationFrame(() => focusEditorCanvas(id))}
              onPatch={patchElement}
              onGroup={() => groupSelection()}
              onUngroup={() => groupSelection(true)}
              onBegin={() => client.beginInteraction(page.pageId)}
              onEnd={() => void run(() => client.endInteraction(page.pageId))}
              onComposition={(composing) => client.setComposing(page.pageId, composing)}
              onAlign={align}
              onLayer={layer}
              onRemove={removeElements}
            >
              {!selectedIds.length && (
                <DesignIntentPanel
                  page={page}
                  draft={storyDrafts[page.pageId]}
                  onDraftChange={retainStoryDraft}
                  metadataRevision={snapshot.metadataRevision}
                  onApply={(operations, expected) => client.apply(operations, expected)}
                  disabled={readonly || busy}
                />
              )}
              <RecipePanel
                snapshot={snapshot}
                page={page}
                onApply={(operations, expected) => client.apply(operations, expected)}
                disabled={readonly || busy}
              />
              <TechnicalQaPanel
                page={page}
                size={snapshot.size}
                diagnostics={snapshot.diagnostics}
                onSelect={(id) => setSelectedIds([id])}
              />
            </PptdInspector>
          </div>
        )}
      </div>
      <KeyboardHelpDialog open={keyboardHelpOpen} onOpenChange={setKeyboardHelpOpen} />
      <Dialog open={pendingDraftsOpen} onOpenChange={setPendingDraftsOpen}>
        <DialogContent className="max-h-[85dvh] overflow-auto">
          <DialogHeader>
            <DialogTitle>未保存的编辑草稿</DialogTitle>
            <DialogDescription>
              草稿在切页时保留。返回原对象完成编辑，或先复制文字；放弃只删除这份待保存草稿。
            </DialogDescription>
          </DialogHeader>
          {Object.entries(storyDrafts)
            .filter(([, draft]) => draft.dirty)
            .map(([id, draft]) => (
              <section key={`story:${id}`} className="space-y-2 border-t pt-3">
                <h3 className="text-sm">{snapshot.metadata.slides[id]?.label ?? id} · Story</h3>
                <Textarea
                  readOnly
                  aria-label="保留的 故事草稿"
                  value={`${draft.purpose}\n\n${draft.keep}`}
                />
                <Button
                  size="xs"
                  onClick={() => {
                    selectMainPage(id);
                    setPendingDraftsOpen(false);
                  }}
                >
                  返回页面
                </Button>
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => {
                    retainStoryDraft(id, null);
                    setDraftResetKey((key) => key + 1);
                  }}
                >
                  放弃这份 故事草稿
                </Button>
              </section>
            ))}
          {Object.entries(chartDrafts).flatMap(([id, entries]) =>
            Object.entries(entries).map(([elementId, draft]) => (
              <section key={`${id}:${elementId}`} className="space-y-2 border-t pt-3">
                <h3 className="text-sm">
                  {snapshot.metadata.slides[id]?.label ?? id} · {elementId}
                </h3>
                <Textarea readOnly aria-label="保留的图表数据草稿" value={draft.value} />
                <Button
                  size="xs"
                  onClick={() => {
                    selectMainPage(id);
                    setSelectedIds([elementId]);
                    setPendingDraftsOpen(false);
                  }}
                >
                  返回图表
                </Button>
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => {
                    retainChartDraft(id, elementId, null);
                    setDraftResetKey((key) => key + 1);
                  }}
                >
                  放弃这份图表草稿
                </Button>
              </section>
            )),
          )}
        </DialogContent>
      </Dialog>
      <input
        ref={imageInputRef}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/svg+xml,image/webp"
        multiple
        hidden
        aria-label="从设备导入图片"
        disabled={readonly || busy || !page}
        onChange={(event) => {
          const files = Array.from(event.currentTarget.files ?? []);
          event.currentTarget.value = '';
          void importImages(files);
        }}
      />
      {historyPage && (
        <PageHistoryDialog
          key={historyPage.pageId}
          page={historyPage}
          backend={backend}
          theme={theme}
          disabled={readonly || busy || auxiliaryDirty}
          open={Boolean(historyPageId)}
          onOpenChange={(open) => {
            if (!open) setHistoryPageId(null);
          }}
          onRecord={async (label) => {
            await client.flushAll();
            const current = client.getState().snapshot;
            const currentPage = current?.pages.find((item) => item.pageId === historyPage.pageId);
            if (!current || !currentPage) throw new Error('页面已改变，请重新打开版本窗口。');
            await backend.recordPageVersion({
              pageId: currentPage.pageId,
              requestId: crypto.randomUUID(),
              label,
              expectedPageRevision: currentPage.pageRevision,
              expectedMetadataRevision: current.metadataRevision,
              actor: `huandeng-ui:${client.clientId}`,
            });
          }}
          onRestore={async (versionId) => {
            await client.flushAll();
            const current = client.getState().snapshot;
            const currentPage = current?.pages.find((item) => item.pageId === historyPage.pageId);
            if (!current || !currentPage) throw new Error('页面状态已改变，请重新打开历史版本。');
            await client.apply(
              [{ op: 'page.version.restore', pageId: currentPage.pageId, versionId }],
              {
                pages: { [currentPage.pageId]: currentPage.pageRevision },
                metadata: current.metadataRevision,
              },
            );
            selectPage(currentPage.pageId);
          }}
        />
      )}
      <ExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        backend={backend}
        snapshot={selectedPresentationId ? (presentationView ?? snapshot) : snapshot}
        page={page}
        blocked={presentationBlocked}
        beforeExport={beforeExport}
        onReport={setExportReport}
        onBusyChange={setExporting}
      />
      {presenting && page && (
        <PresentationView
          page={page}
          nextPage={nextPage}
          size={snapshot.size}
          theme={theme}
          pageIndex={pageIndex}
          pageCount={viewPages.length}
          notesOpen={presenterNotesOpen}
          onNotesToggle={() => setPresenterNotesOpen((open) => !open)}
          onStep={stepPage}
          onClose={() => setPresenting(false)}
          controlsRef={presentationControls}
        />
      )}
      {snapshot.diagnostics.some((item) => item.severity === 'error') && (
        <div
          className="shrink-0 border-t bg-background px-4 py-1.5 text-[11px] text-muted-foreground"
          role="status"
        >
          {snapshot.diagnostics
            .filter((item) => item.severity === 'error')
            .map((item) => item.message)
            .join(' · ')}
        </div>
      )}
    </div>
  );
}
