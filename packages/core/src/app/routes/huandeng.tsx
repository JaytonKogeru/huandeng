import {
  AlertCircle,
  Bot,
  Check,
  Circle,
  Clapperboard,
  Copy,
  Download,
  FilePlus2,
  FolderOpen,
  Group,
  History,
  Loader2,
  Minus,
  MousePointer2,
  NotebookPen,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightOpen,
  Play,
  Plus,
  Redo2,
  RefreshCw,
  Save,
  Settings2,
  TerminalSquare,
  Type,
  Undo2,
  Ungroup,
  Upload,
} from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { HuandengMark } from '@/components/brand-mark';
import { PptdActivityPanel } from '@/components/pptd/activity-panel';
import { AgentConnectionDialog } from '@/components/pptd/agent-connection-dialog';
import { AssetLibrary } from '@/components/pptd/asset-library';
import { AuthoringWorkspace } from '@/components/pptd/authoring-workspace';
import { CreateSectionDialog } from '@/components/pptd/create-section-dialog';
import { type DesignIntentDraft, DesignIntentPanel } from '@/components/pptd/design-intent-panel';
import { ExportDialog } from '@/components/pptd/export-dialog';
import { ProjectFilePreviewPanel } from '@/components/pptd/file-preview-panel';
import { PptdInspector } from '@/components/pptd/inspector';
import { KeyboardHelpDialog } from '@/components/pptd/keyboard-help-dialog';
import { HuandengLanguageMenu } from '@/components/pptd/language-menu';
import { NotesPanel } from '@/components/pptd/notes-panel';
import { OperationReviewDialog } from '@/components/pptd/operation-review-dialog';
import { currentReviewTarget } from '@/components/pptd/operation-review-model';
import { PageHistoryDialog } from '@/components/pptd/page-history-dialog';
import { PanelResizeHandle } from '@/components/pptd/panel-resize-handle';
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
import { WorkspaceDocumentTabs } from '@/components/pptd/workspace-document-tabs';
import { WorkspaceSettings } from '@/components/pptd/workspace-settings';
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
import { useHuandengLocale } from '@/lib/huandeng-locale';
import type { Alignment } from '@/lib/inspector/geometry';
import { assetVersionUrl } from '@/lib/pptd-asset-revision';
import { pptdAssetUrl } from '@/lib/pptd-backend';
import { draftHasChanges } from '@/lib/pptd-document';
import {
  arrangeElementBounds,
  distributeElementBounds,
  rootSelectedElements,
} from '@/lib/pptd-geometry';
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
import {
  type LayerDirection,
  reorderElementIds,
  textFormatPatches,
  textPropertyPatch,
} from '@/lib/pptd-object-actions';
import { useSnappingPreference, useWorkspaceLayout } from '@/lib/pptd-preferences';
import { sectionAtBoundary } from '@/lib/pptd-section-actions';
import {
  insertionBoundaryIndex,
  type SlideInsertionBoundary,
  slideMoveAfterBoundary,
} from '@/lib/pptd-thumbnail-sections';
import { useDocumentTitle } from '@/lib/use-document-title';
import { usePptdDocument } from '@/lib/use-pptd-document';
import { type PageAnimation, validatePageAnimation } from '../../pptd/animation-model';
import type { AssetLibraryItem, AssetLibraryOptions } from '../../pptd/asset-library';
import {
  buildGroup,
  duplicateElements,
  expandGroupIds,
  groupChildren,
  transformGroup,
  ungroupOperations,
} from '../../pptd/grouping';
import {
  readProjectModel,
  resolvePresentation,
  resolveProjectSections,
} from '../../pptd/project-model';
import {
  copiedTimelineTracks,
  knownTimeline,
  selectedTimelineTargets,
  timelineTargetIds,
} from '../../pptd/timeline-operations';
import type { DeckSnapshot, PageSnapshot, PptdElement, PptdOperation } from '../../pptd/types';

export function HuandengEditor() {
  const { locale, t } = useHuandengLocale();
  const snapping = useSnappingPreference();
  const [agentConnectionOpen, setAgentConnectionOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [sectionEditorRequest, setSectionEditorRequest] = useState<{
    key: number;
    sectionId?: string;
  } | null>(null);
  const [sectionBoundary, setSectionBoundary] = useState<SlideInsertionBoundary | null>(null);
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
  const [operationReview, setOperationReview] = useState<{
    operationId: string;
    backend: typeof backend;
  } | null>(null);
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
  const [notesOpen, setNotesOpen] = useState(false);
  const [notesDock, setNotesDock] = useState<'bottom' | 'right'>('bottom');
  const [notesHeight, setNotesHeight] = useState(160);
  const [notesWidth, setNotesWidth] = useState(320);
  const [navigationWidth, setNavigationWidth] = useState(288);
  const [inspectorWidth, setInspectorWidth] = useState(300);
  const [filePreviewPath, setFilePreviewPath] = useState<string | null>(null);
  const [openFilePreviews, setOpenFilePreviews] = useState<string[]>([]);
  const openFilePreview = useCallback((path: string) => {
    const normalized = path.replaceAll('\\', '/');
    setOpenFilePreviews((current) =>
      current.includes(normalized) ? current : [...current, normalized],
    );
    setFilePreviewPath(normalized);
  }, []);
  const closeFilePreview = useCallback((path: string) => {
    setOpenFilePreviews((current) => current.filter((item) => item !== path));
    setFilePreviewPath((current) => (current === path ? null : current));
  }, []);
  const [inspectorTab, setInspectorTab] = useState<'properties' | 'layers' | 'story' | 'checks'>(
    'properties',
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [navigationCollapsed, setNavigationCollapsed] = useState(false);
  const [inspectorCollapsed, setInspectorCollapsed] = useState(false);
  const [keyboardHelpOpen, setKeyboardHelpOpen] = useState(false);
  const workspaceError = useWorkspaceLayout(
    {
      notesDock,
      notesHeight,
      notesWidth,
      navigationWidth,
      inspectorWidth,
      notesOpen,
      navigationCollapsed,
      inspectorCollapsed,
    },
    (value) => {
      setNotesDock(value.notesDock === 'right' ? 'right' : 'bottom');
      const bounded = (number: number, fallback: number, min: number, max: number) =>
        typeof number === 'number' && Number.isFinite(number)
          ? Math.max(min, Math.min(max, number))
          : fallback;
      setNotesHeight(bounded(value.notesHeight, 160, 96, 400));
      setNotesWidth(bounded(value.notesWidth, 320, 240, 520));
      setNavigationWidth(bounded(value.navigationWidth, 288, 240, 440));
      setInspectorWidth(bounded(value.inspectorWidth, 300, 260, 460));
      setNotesOpen(value.notesOpen === true);
      setNavigationCollapsed(value.navigationCollapsed === true);
      setInspectorCollapsed(value.inspectorCollapsed === true);
    },
  );
  const pageFocusRef = useRef<{
    pageId: string;
    occurrenceId?: string;
    scope: 'canvas' | 'thumbnails';
  } | null>(null);
  const presenterReturnFocus = useRef<HTMLElement | null>(null);
  const [presenting, setPresenting] = useState(false);
  const [presentationSession, setPresentationSession] = useState(0);
  const [presenterNotesOpen, setPresenterNotesOpen] = useState(false);
  const presentationEntries = useRef(new Map<string, 'start' | 'end'>());
  const pendingPresentationPage = useRef<string | null>(null);
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
  useEffect(() => desktopHost()?.onAgentConnection?.(() => setAgentConnectionOpen(true)), []);
  const [presentationView, setPresentationView] = useState<DeckSnapshot | null>(null);
  const [presentationLoading, setPresentationLoading] = useState(false);
  const [presentationError, setPresentationError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportReport, setExportReport] = useState<string | null>(null);
  const [uiError, setUiError] = useState<string | null>(null);
  const snapshot = state.snapshot;
  // biome-ignore lint/correctness/useExhaustiveDependencies: A different Project must not retain a file path from the previous Project.
  useEffect(() => {
    setFilePreviewPath(null);
    setOpenFilePreviews([]);
  }, [snapshot?.entry]);
  useEffect(() => {
    if (snapping.error || workspaceError) setUiError(snapping.error || workspaceError);
  }, [snapping.error, workspaceError]);
  const selectedPresentationId = searchParams.get('presentation');
  const requestedOccurrence = searchParams.get('occurrence');
  const project = useMemo(
    () => (snapshot ? readProjectModel(snapshot.metadata) : null),
    [snapshot],
  );
  const projectSections = useMemo(
    () => (snapshot ? resolveProjectSections(snapshot) : []),
    [snapshot],
  );
  const sectionsNeedRepair = projectSections.some((item) => item.diagnostics.length > 0);
  const emptyPresentation = useMemo(() => {
    if (
      !snapshot ||
      !selectedPresentationId ||
      !project?.presentations.some((item) => item.id === selectedPresentationId)
    )
      return false;
    const resolved = resolvePresentation(snapshot, selectedPresentationId);
    return (
      resolved.pages.length === 0 &&
      resolved.diagnostics.every((item) => item.code === 'PRESENTATION_EMPTY')
    );
  }, [project, selectedPresentationId, snapshot]);
  const presentationIssue = emptyPresentation ? null : presentationError;
  const allViewPages = selectedPresentationId
    ? presentationView?.presentationId === selectedPresentationId
      ? presentationView.pages
      : []
    : (snapshot?.pages ?? []);
  const playbackPages = useMemo(
    () => allViewPages.filter((item) => item.metadata.hidden !== true),
    [allViewPages],
  );
  const viewPages = presenting ? playbackPages : allViewPages;
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
  const documentRevision = useMemo(
    () =>
      snapshot
        ? [
            snapshot.manifestRevision,
            snapshot.metadataRevision,
            ...snapshot.pages.map(
              (item) => `${item.pageId}:${item.pageRevision}:${item.renderRevision}`,
            ),
          ].join('|')
        : '',
    [snapshot],
  );
  const projectHasDrafts = auxiliaryDirty || importingImages || drafts.length > 0;
  const projectHasConflicts = drafts.some((draft) => !!draft.conflict);
  useEffect(() => {
    if (!snapshot) return;
    void desktopHost()
      ?.reportProjectState?.({
        title: snapshot.title,
        dirty: projectHasDrafts,
        saving: state.saving || state.recovering,
        attention: state.canRetry || state.recoveryRequired || !!state.error || projectHasConflicts,
        revision: documentRevision,
      })
      .catch(() => {});
  }, [
    snapshot,
    projectHasDrafts,
    state.saving,
    state.recovering,
    state.canRetry,
    state.recoveryRequired,
    state.error,
    documentRevision,
    projectHasConflicts,
  ]);
  useEffect(
    () =>
      desktopHost()?.onCloseDocument?.(() => {
        if (filePreviewPath) closeFilePreview(filePreviewPath);
        else
          void desktopHost()
            ?.closeProject?.()
            .catch((error: unknown) =>
              setUiError(error instanceof Error ? error.message : String(error)),
            );
      }),
    [filePreviewPath, closeFilePreview],
  );
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
  const presentationBlocked =
    auxiliaryDirty || presentationLoading || !!presentationError || emptyPresentation;
  const nextPage = pageIndex >= 0 ? viewPages[pageIndex + 1] : undefined;
  const presentationPageKey = `${page?.pageId ?? ''}:${page?.occurrenceId ?? ''}:${page?.versionId ?? ''}`;
  useLayoutEffect(() => {
    if (pendingPresentationPage.current === presentationPageKey)
      pendingPresentationPage.current = null;
  }, [presentationPageKey]);
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
      setFilePreviewPath(null);
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
    if (presenting) {
      // F5 changes the selected Slide through the router. Its delayed canvas focus must
      // not take focus back from the presenter after the presentation has mounted.
      pageFocusRef.current = null;
      return;
    }
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
  }, [selectedPageId, selectedView?.occurrenceId, presenting]);

  useLayoutEffect(() => {
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
      if (new URLSearchParams(window.location.search).get('presentation') === id) return;
      if (timelineDirty) {
        setUiError('请先保存或还原时间线中的修改，再切换演讲。');
        return;
      }
      setFilePreviewPath(null);
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
      setFilePreviewPath(null);
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
      setFilePreviewPath(null);
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

  const insertLibraryAsset = useCallback(
    async (
      asset: AssetLibraryItem,
      dimensions: { width: number; height: number },
      point?: { x: number; y: number },
    ) => {
      if (!page || !snapshot || readonly || busy) throw new Error('请先选择可编辑的主页面。');
      if (
        asset.kind !== 'image' ||
        asset.status !== 'available' ||
        dimensions.width <= 0 ||
        dimensions.height <= 0
      )
        throw new Error('Choose an available image to place.');
      const targetId = page.pageId;
      const ratio = Math.min(
        (snapshot.size[0] * 0.7) / dimensions.width,
        (snapshot.size[1] * 0.7) / dimensions.height,
        1,
      );
      const width = dimensions.width * ratio,
        height = dimensions.height * ratio;
      const element: PptdElement = {
        elementId: `image-${crypto.randomUUID()}`,
        elementType: 'image',
        src: asset.path,
        sourceName: asset.displayName,
        bounds: [
          Math.max(
            0,
            Math.min(snapshot.size[0] - width, (point?.x ?? snapshot.size[0] / 2) - width / 2),
          ),
          Math.max(
            0,
            Math.min(snapshot.size[1] - height, (point?.y ?? snapshot.size[1] / 2) - height / 2),
          ),
          width,
          height,
        ],
        fit: { mode: 'contain' },
      };
      await client.apply([{ op: 'element.add', pageId: targetId, element }]);
      if (currentPageIdRef.current === targetId) setSelectedIds([element.elementId]);
    },
    [busy, client, page, readonly, snapshot],
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

  const insertAtBoundary = useCallback(
    (boundary: SlideInsertionBoundary) => {
      if (readonly || busy || selectedPresentationId) return;
      void run(async () => {
        await client.flushAll();
        const current = client.getState().snapshot;
        if (!current || insertionBoundaryIndex(current.pages, boundary) === null)
          throw new Error('Slide order changed. Choose the insertion point again.');
        const result = await client.apply(
          [
            {
              op: 'page.add',
              afterPageId: boundary.afterPageId,
              page: { pageType: 'content', elements: [], notes: '' },
            },
          ],
          { manifest: current.manifestRevision, metadata: current.metadataRevision },
        );
        if (result.createdPages[0]) selectMainPage(result.createdPages[0].pageId);
      });
    },
    [busy, client, readonly, run, selectedPresentationId, selectMainPage],
  );

  const moveAtBoundary = useCallback(
    (pageId: string, boundary: SlideInsertionBoundary) => {
      if (readonly || busy || selectedPresentationId) return;
      void run(async () => {
        await client.flushAll();
        const current = client.getState().snapshot;
        if (!current) return;
        const placement = slideMoveAfterBoundary(current.pages, pageId, boundary);
        if (!placement) return;
        await client.apply([{ op: 'page.move', pageId, afterPageId: placement.afterPageId }], {
          manifest: current.manifestRevision,
          metadata: current.metadataRevision,
        });
        selectMainPage(pageId);
      });
    },
    [busy, client, readonly, run, selectedPresentationId, selectMainPage],
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
                  timeline: selectedTimelineTargets(animation, ids),
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
        } else
          client.patchElement(
            selectedPageId,
            elementId,
            textPropertyPatch(element, fields),
            autosave,
          );
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
          const groupAnimation = knownTimeline(page.data);
          if (groupAnimation && timelineTargetIds(groupAnimation).some((id) => groupIds.has(id)))
            throw new Error(
              '此组合带有动画。请先移除组合本身的动画，再取消组合；成员自身的动画会保留。',
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
        filePreviewPath !== null ||
        event.defaultPrevented ||
        (event.target instanceof Element && event.target.closest('[data-hd-file-preview]')) ||
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
        timeline?: PageAnimation;
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
        if (copied.timeline) validatePageAnimation(copied.timeline, { elements: copiedElements });
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
  }, [filePreviewPath, busy, client, importImages, page, presenting, readonly, run, snapshot]);

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

  const arrange = (items: { elementId: string; bounds: [number, number, number, number] }[]) => {
    if (!page || readonly || busy || !items.length) return;
    const movedIds = new Set(
      expandGroupIds(
        page.data.elements,
        items.map((item) => item.elementId),
      ),
    );
    const originals = page.data.elements
      .filter((element) => movedIds.has(element.elementId))
      .map((element) => ({
        elementId: element.elementId,
        fields: { bounds: element.bounds, rotation: element.rotation },
      }));
    try {
      const source = client.page(page.pageId);
      if (!source) return;
      const patches = items.flatMap((item) => {
        const element = source.data.elements.find((entry) => entry.elementId === item.elementId);
        return element?.elementType === 'group'
          ? transformGroup(source.data.elements, item.elementId, { bounds: item.bounds })
          : [{ elementId: item.elementId, fields: { bounds: item.bounds } }];
      });
      client.beginInteraction(page.pageId);
      for (const patch of patches)
        client.patchElement(page.pageId, patch.elementId, patch.fields, false);
      void run(() => client.endInteraction(page.pageId));
    } catch (error) {
      client.cancelInteraction(page.pageId, originals);
      setUiError(error instanceof Error ? error.message : String(error));
    }
  };

  const align = (alignment: Alignment, reference: 'selection' | 'slide') => {
    if (!page || !snapshot) return;
    arrange(
      arrangeElementBounds(
        rootSelectedElements(page.data.elements, selectedIds),
        alignment,
        snapshot.size,
        reference,
      ),
    );
  };

  const distribute = (axis: 'x' | 'y') => {
    if (!page) return;
    arrange(distributeElementBounds(rootSelectedElements(page.data.elements, selectedIds), axis));
  };

  const layer = useCallback(
    (direction: LayerDirection) => {
      if (!page || readonly || busy) return;
      const elementIds = reorderElementIds(page.data.elements, selectedIds, direction);
      if (elementIds.every((id, index) => id === page.data.elements[index].elementId)) return;
      void apply([{ op: 'element.reorder', pageId: page.pageId, elementIds }]);
    },
    [apply, busy, page, readonly, selectedIds],
  );

  const stepPage = useCallback(
    (delta: number) => {
      if (!viewPages.length || (presenting && pendingPresentationPage.current)) return;
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
      if (next === current) return;
      if (presenting) {
        const destination = viewPages[next];
        const key = `${destination.pageId}:${destination.occurrenceId ?? ''}:${destination.versionId ?? ''}`;
        presentationEntries.current.set(key, delta < 0 ? 'end' : 'start');
        pendingPresentationPage.current = key;
      }
      selectPage(viewPages[next].pageId, viewPages[next].occurrenceId);
    },
    [viewPages, pageIndex, selectPage, selectedPresentationId, presenting],
  );

  const executeKeyboardCommand = useCallback(
    (command: EditorKeyboardCommand, target: EventTarget | null) => {
      if (command.type === 'help') {
        if (presenting) presentationControls.current?.pause();
        if (document.fullscreenElement) {
          void document
            .exitFullscreen()
            .then(() => setKeyboardHelpOpen(true))
            .catch(() => {
              setPresenting(false);
              setKeyboardHelpOpen(true);
            });
        } else setKeyboardHelpOpen(true);
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
      if (command.type === 'presentation-blackout') {
        presentationControls.current?.toggleBlackout();
        return;
      }
      if (command.type === 'presentation-fullscreen') {
        presentationControls.current?.toggleFullscreen();
        return;
      }
      if (command.type === 'cancel') {
        if (presenting && document.fullscreenElement)
          void document.exitFullscreen().catch(() => {});
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
          const destination = command.fromCurrent
            ? (playbackPages.find(
                (item) => allViewPages.indexOf(item) >= allViewPages.indexOf(selectedView ?? page),
              ) ?? playbackPages[0])
            : playbackPages[0];
          if (!destination)
            throw new Error('There are no visible slides to present. Show a slide first.');
          const key = `${destination.pageId}:${destination.occurrenceId ?? ''}:${destination.versionId ?? ''}`;
          if (presenting && key === presentationPageKey)
            presentationControls.current?.seekBoundary(false);
          presentationEntries.current.clear();
          pendingPresentationPage.current = key === presentationPageKey ? null : key;
          setPresentationSession((session) => session + 1);
          selectPage(destination.pageId, destination.occurrenceId);
          setPresenterNotesOpen(false);
          setPresenting(true);
        });
        return;
      }
      if (command.type === 'page-step') {
        if (presenting && pendingPresentationPage.current) return;
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
        if (next) {
          if (presenting) {
            const key = `${next.pageId}:${next.occurrenceId ?? ''}:${next.versionId ?? ''}`;
            const pending = pendingPresentationPage.current;
            if (key === presentationPageKey) {
              // An absolute Home/End command supersedes an in-flight page request.
              pendingPresentationPage.current = null;
              presentationControls.current?.seekBoundary(command.end);
              if (!pending) return;
            } else {
              presentationEntries.current.set(key, command.end ? 'end' : 'start');
              pendingPresentationPage.current = key;
            }
          }
          selectPage(next.pageId, next.occurrenceId);
        }
        return;
      }
      if (command.type === 'show-properties') {
        setFilePreviewPath(null);
        setInspectorCollapsed(false);
        setInspectorTab('properties');
        if (notesDock === 'right') setNotesOpen(false);
        requestAnimationFrame(() =>
          document.querySelector<HTMLElement>('[data-hd-inspector-tab="properties"]')?.focus(),
        );
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
      if (command.type === 'layer') {
        layer(command.direction);
        return;
      }
      if (
        command.type === 'format-text' ||
        command.type === 'font-size' ||
        command.type === 'text-color'
      ) {
        if (!page) return;
        try {
          const patches = textFormatPatches(
            page.data.elements,
            selectedIds,
            command,
            page.metadata.themeOverride &&
              typeof page.metadata.themeOverride === 'object' &&
              !Array.isArray(page.metadata.themeOverride)
              ? (page.metadata.themeOverride as PptdTheme)
              : theme,
          );
          if (patches.length)
            void apply(
              patches.map((patch) => ({
                op: 'element.patch',
                pageId: page.pageId,
                elementId: patch.elementId,
                set: patch.fields,
              })),
            );
        } catch (error) {
          setUiError(error instanceof Error ? error.message : String(error));
        }
        return;
      }
      if (command.type === 'paste') {
        requestAnimationFrame(() => {
          focusEditorCanvas();
          const host = desktopHost();
          if (host?.editNative) void run(() => host.editNative?.('paste') ?? Promise.resolve());
          else
            void run(async () => {
              const clipboardData = new DataTransfer();
              clipboardData.setData('text/plain', await navigator.clipboard.readText());
              document
                .querySelector('[data-hd-editor-canvas]')
                ?.dispatchEvent(
                  new ClipboardEvent('paste', { clipboardData, bubbles: true, cancelable: true }),
                );
            });
        });
        return;
      }
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
      layer,
      notesDock,
      theme,
      importingImages,
      page,
      pageReadonly,
      patchElement,
      presentationBlocked,
      presentationPageKey,
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
      allViewPages,
      playbackPages,
      selectedView,
    ],
  );

  useEffect(() => {
    const capture = (event: KeyboardEvent) => {
      if (filePreviewPath) {
        if (
          (event.ctrlKey || event.metaKey) &&
          !event.shiftKey &&
          !event.altKey &&
          event.key.toLowerCase() === 'w'
        ) {
          event.preventDefault();
          event.stopPropagation();
          closeFilePreview(filePreviewPath);
          return;
        }
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's')
          event.preventDefault();
        return;
      }
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
      if (
        !command ||
        (!['save', 'focus-region', 'help'].includes(command.type) &&
          !(presenting && command.type === 'cancel'))
      )
        return;
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
      if (filePreviewPath) return;
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
  }, [executeKeyboardCommand, presenting, filePreviewPath, closeFilePreview]);

  useEffect(() => {
    const host = desktopHost();
    return host?.onEditCommand?.((nativeCommand: DesktopEditCommand) => {
      const target = document.activeElement;
      if (filePreviewPath || target?.closest('[data-hd-file-preview]')) {
        if (
          nativeCommand === 'copy' ||
          (nativeCommand === 'selectAll' && target instanceof HTMLTextAreaElement)
        )
          void host.editNative?.(nativeCommand);
        return;
      }
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
  }, [executeKeyboardCommand, presenting, filePreviewPath]);

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
            <HuandengMark className="size-10 shrink-0" />
            <div>
              <h1 className="text-lg font-semibold">HUANDENG Editor</h1>
              <p className="text-xs text-muted-foreground">{t('独立页面 · 自由编辑 · 持续演进')}</p>
            </div>
          </div>
          <div className="mb-4 flex justify-end">
            <HuandengLanguageMenu />
          </div>
          {state.loading ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              {t('正在连接本地项目…')}
            </p>
          ) : (
            <>
              <h2 className="mb-3 text-xl font-medium">{t('打开一个 PPTD 项目')}</h2>
              <p className="mb-5 text-sm leading-relaxed text-muted-foreground">
                {desktopHost()
                  ? t('选择项目中的 .pptd 文件，或者新建一个空白项目。')
                  : t(
                      '这是浏览器开发预览。日常使用请启动桌面版 HUANDENG Editor，或从终端连接已有项目。',
                    )}
              </p>
              {!desktopHost() && (
                <pre className="overflow-x-auto rounded-md border bg-muted/50 p-4 text-xs">
                  huandeng open /path/to/deck.pptd
                </pre>
              )}
              {state.error && (
                <p className="mt-4 text-xs text-muted-foreground">{t(state.error.message)}</p>
              )}
              <div className="mt-6 flex gap-2">
                {recoveryState && (
                  <Button
                    aria-label={t('恢复未完成保存')}
                    data-hd-recovery={recoveryState}
                    disabled={state.saving}
                    onClick={recoverPending}
                  >
                    <RefreshCw className={state.recovering ? 'animate-spin' : undefined} />
                    {state.recovering ? t('正在恢复保存…') : t('恢复未完成保存')}
                  </Button>
                )}
                <Button onClick={() => void client.refresh()}>
                  <RefreshCw />
                  {t('重新连接')}
                </Button>
                {desktopHost() && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => void run(async () => desktopHost()?.openProject())}
                    >
                      <FolderOpen />
                      {t('打开项目')}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => void run(async () => desktopHost()?.newProject())}
                    >
                      <FilePlus2 />
                      {t('新建项目')}
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
    ? t('正在恢复保存…')
    : state.recoveryRequired
      ? t('保存待恢复')
      : drafts.some((draft) => draft.conflict)
        ? t('草稿冲突 · 已保留')
        : state.error
          ? t('保存需检查')
          : state.saving
            ? t('正在保存…')
            : drafts.length
              ? t(drafts.length === 1 ? '待保存 · 1 页' : '待保存 · {count} 页', {
                  count: drafts.length,
                })
              : pageReadonly
                ? t('只读模式')
                : t('页面已保存');
  const saveNeedsAttention =
    !!recoveryState || !!state.error || drafts.some((draft) => draft.conflict);
  const draftKinds = [
    projectDirty && t('项目编排'),
    storyDirty && 'Story',
    chartDirty && t('图表数据'),
    timelineDirty && t('动画'),
  ].filter(Boolean);
  const collectionTitle = selectedPresentationId
    ? (project?.presentations.find((item) => item.id === selectedPresentationId)?.title ??
      t('当前演讲'))
    : t(snapshot.pages.length === 1 ? '主幻灯片 · 1 页' : '主幻灯片 · {count} 页', {
        count: snapshot.pages.length,
      });
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
            aria-label={desktopHost() ? t('打开项目') : t('显示项目文件')}
            title={desktopHost() ? t('打开项目 Ctrl+O') : t('显示项目文件')}
            onClick={() =>
              void run(async () => {
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
              aria-label={t('新建项目')}
              title={t('新建项目 Ctrl+N')}
              onClick={() =>
                void run(async () => {
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
            title={snapshot.title || t('未命名演示')}
            data-hd-document-title
          >
            {snapshot.title || t('未命名演示')}
          </h1>
          <select
            aria-label={t('当前演讲集合')}
            className="hd-collection-select"
            title={collectionTitle}
            value={selectedPresentationId ?? ''}
            onChange={(event) => selectPresentation(event.target.value || null)}
          >
            <option value="">
              {t(snapshot.pages.length === 1 ? '主幻灯片 · 1 页' : '主幻灯片 · {count} 页', {
                count: snapshot.pages.length,
              })}
            </option>
            {project?.presentations.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
        </div>
        <div className="hd-titlebar-actions">
          <Button
            variant={activityOpen ? 'secondary' : 'ghost'}
            size="sm"
            aria-label={t('Agent Activity')}
            aria-pressed={activityOpen}
            onClick={() => setActivityOpen((value) => !value)}
            data-hd-open-activity
          >
            <TerminalSquare />
            {t('Activity')}
          </Button>
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t('撤销')}
              title={t('撤销 Ctrl+Z')}
              disabled={
                !!filePreviewPath ||
                pageReadonly ||
                timelineDirty ||
                busy ||
                !state.undoStack.length
              }
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
              aria-label={t('重做')}
              title={t('重做 Ctrl+Shift+Z')}
              disabled={
                !!filePreviewPath ||
                pageReadonly ||
                timelineDirty ||
                busy ||
                !state.redoStack.length
              }
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
              aria-label={t('当前页历史版本')}
              title={t('当前页历史版本')}
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
              title={`${status}${auxiliaryDirty ? t('；{drafts}草稿请在对应面板保存', { drafts: draftKinds.join(locale === 'en' ? ', ' : '、') }) : ''}`}
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
            {auxiliaryDirty && (
              <Button
                variant="ghost"
                size="xs"
                className="shrink-0 text-amber-800 dark:text-amber-300"
                aria-label={t('Review unsaved drafts')}
                title={draftKinds.join(locale === 'en' ? ', ' : '、')}
                data-hd-pending-drafts
                onClick={() => setPendingDraftsOpen(true)}
              >
                {t('Drafts ({count})', { count: draftKinds.length })}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              aria-label={t('保存页面')}
              title={t('Ctrl+S 保存所有页面修改；其他草稿请在对应面板保存')}
              disabled={readonly || busy}
              onClick={() => void run(() => client.flushAll())}
            >
              <Save />
              {t('保存页面')}
            </Button>
          </div>
          {!state.connected && (
            <span
              className="hd-connection-status text-amber-800 dark:text-amber-300"
              role="status"
              data-hd-connection-state="reconnecting"
              title={t('正在重新连接文档服务，本地草稿会保留')}
            >
              <RefreshCw className="size-3 shrink-0" />
              {t('正在重连')}
            </span>
          )}
          <span className="h-5 w-px shrink-0 bg-border" />
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              aria-label={t('导出')}
              data-hd-export
              title={
                emptyPresentation
                  ? t('Add slides before exporting this Presentation.')
                  : auxiliaryDirty
                    ? t('Save or discard the pending drafts before exporting.')
                    : undefined
              }
              disabled={busy || presentationBlocked}
              onClick={() => setExportOpen(true)}
            >
              {exporting ? <Loader2 className="animate-spin" /> : <Download />}
              {t('导出')}
            </Button>
            <Button
              variant="default"
              size="sm"
              disabled={!page || !playbackPages.length || busy || presentationBlocked}
              title={
                emptyPresentation
                  ? t('Add slides before presenting.')
                  : auxiliaryDirty
                    ? t('Save or discard the pending drafts before presenting.')
                    : undefined
              }
              onClick={() =>
                void run(async () => {
                  await client.flushAll();
                  const destination =
                    playbackPages.find(
                      (item) =>
                        allViewPages.indexOf(item) >= allViewPages.indexOf(selectedView ?? page),
                    ) ?? playbackPages[0];
                  if (!destination)
                    throw new Error('There are no visible slides to present. Show a slide first.');
                  presentationEntries.current.clear();
                  pendingPresentationPage.current = null;
                  setPresentationSession((session) => session + 1);
                  selectPage(destination.pageId, destination.occurrenceId);
                  setPresenterNotesOpen(false);
                  setPresenting(true);
                })
              }
            >
              <Play />
              {t('演示')}
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t('Workspace settings')}
              title={t('Workspace settings')}
              onClick={() => setSettingsOpen(true)}
            >
              <Settings2 />
            </Button>
          </div>
        </div>
      </header>
      {(recoveryState || uiError || state.error || presentationIssue) && (
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
                    ? t('正在核对并恢复这次保存，本地草稿会保留。')
                    : state.error?.code === 'RECOVERY_REQUIRED'
                      ? t(
                          '文件或保存记录与预期不一致，恢复已停止。请先复制待保存页面，再检查文件冲突与恢复详情。',
                        )
                      : t(
                          '有一次保存尚未完成，本地草稿已保留。若文件仍被其他程序占用，请先关闭占用，再恢复保存。完成后即可关闭或切换项目。',
                        )}
                </p>
                {(uiError || state.error) && (
                  <details className="mt-1 break-words">
                    <summary className="cursor-pointer">{t('查看恢复详情')}</summary>
                    <p className="mt-1 whitespace-pre-wrap">
                      {t(uiError || state.error?.message || '')}
                    </p>
                  </details>
                )}
              </>
            ) : (
              t(uiError || state.error?.message || presentationIssue || '')
            )}
          </div>
          {recoveryState && (
            <>
              <Button
                size="xs"
                variant="outline"
                aria-label={t('恢复未完成保存')}
                disabled={state.saving}
                onClick={recoverPending}
              >
                <RefreshCw className={state.recovering ? 'animate-spin' : undefined} />
                {state.recovering ? t('正在恢复保存…') : t('恢复未完成保存')}
              </Button>
              <Button
                size="xs"
                variant="ghost"
                disabled={!drafts.length && !state.canRetry}
                title={t('复制本地页面草稿与原始保存请求，保留未确认的内容')}
                onClick={copyPendingWork}
              >
                <Copy />
                {t('复制待保存页面')}
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
              {t('重试同一次保存')}
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
            {t('检查最新状态')}
          </Button>
        </div>
      )}
      <div className="flex min-h-0 flex-1">
        <aside
          className={`hd-navigation relative ${navigationCollapsed ? 'hidden' : 'flex'} shrink-0 flex-col border-r border-border bg-sidebar`}
          style={{ width: navigationWidth }}
          aria-label={t('项目导航')}
          data-hd-focus-region="navigation"
          tabIndex={-1}
        >
          <div className="hd-navigation-tabs grid h-10 shrink-0 grid-cols-[repeat(4,minmax(0,1fr))_24px] items-center gap-1 border-b border-border px-2">
            <Button
              variant={leftTab === 'project' ? 'secondary' : 'ghost'}
              size="xs"
              className="min-w-0 px-1"
              aria-label={t('项目与故事')}
              aria-pressed={leftTab === 'project'}
              onClick={() => setLeftTab('project')}
            >
              {t('项目')}
            </Button>
            <Button
              variant={leftTab === 'pages' ? 'secondary' : 'ghost'}
              size="xs"
              className="min-w-0 px-1"
              aria-label={t('页面缩略图')}
              aria-pressed={leftTab === 'pages'}
              onClick={() => {
                setFilePreviewPath(null);
                setLeftTab('pages');
              }}
            >
              {t('页面')}
            </Button>
            <Button
              variant={leftTab === 'assets' ? 'secondary' : 'ghost'}
              size="xs"
              className="min-w-0 px-1"
              aria-label={t('项目素材库')}
              aria-pressed={leftTab === 'assets'}
              onClick={() => {
                setFilePreviewPath(null);
                setLeftTab('assets');
              }}
            >
              {t('素材')}
            </Button>
            <Button
              variant={leftTab === 'files' ? 'secondary' : 'ghost'}
              size="xs"
              className="min-w-0 px-1"
              aria-label={t('项目文件树')}
              aria-pressed={leftTab === 'files'}
              onClick={() => setLeftTab('files')}
            >
              {t('文件')}
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={t('收起项目导航')}
              title={t('收起项目导航')}
              onClick={() => setNavigationCollapsed(true)}
            >
              <PanelLeftClose />
            </Button>
          </div>
          <div className={leftTab === 'project' ? 'min-h-0 flex-1 overflow-y-auto' : 'hidden'}>
            <div className="border-b border-border px-3 py-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={() => setAgentConnectionOpen(true)}
                data-hd-agent-connect
              >
                <Bot />
                {t('连接 Agent')}
              </Button>
            </div>
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
              currentPageId={selectedPageId}
              selectedPresentationId={selectedPresentationId}
              onSelectPresentation={selectPresentation}
              onSelectPage={(id) => {
                selectMainPage(id);
                setLeftTab('pages');
              }}
              onSelectOccurrence={selectOccurrence}
              onApply={(operations, expected) => client.apply(operations, expected)}
              sectionEditorRequest={sectionEditorRequest}
              onShowPages={() => setLeftTab('pages')}
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
              onInsert={insertLibraryAsset}
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
          {leftTab === 'pages' && !selectedPresentationId && sectionsNeedRepair && (
            <div
              className="space-y-1 border-b border-amber-300/40 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/25 dark:text-amber-100"
              role="status"
              data-hd-section-issue
            >
              <p>{t('Section boundaries need attention. Slides are still available below.')}</p>
              <Button
                size="xs"
                variant="outline"
                onClick={() => {
                  setLeftTab('pages');
                  setSectionEditorRequest({ key: Date.now() });
                }}
              >
                {t('Review Sections')}
              </Button>
            </div>
          )}
          {leftTab === 'files' ? (
            <PptdProjectTree
              backend={backend}
              snapshot={snapshot}
              currentPageId={selectedPageId}
              onSelectPage={selectMainPage}
              onPreviewFile={(node) => openFilePreview(node.path)}
            />
          ) : leftTab === 'pages' ? (
            <PptdThumbnailRail
              onEditSection={
                selectedPresentationId
                  ? undefined
                  : (id) => setSectionEditorRequest({ key: Date.now(), sectionId: id })
              }
              onManageSections={
                selectedPresentationId
                  ? undefined
                  : () => setSectionEditorRequest({ key: Date.now() })
              }
              pages={viewPages}
              sections={
                selectedPresentationId
                  ? []
                  : projectSections
                      .filter(
                        (item) =>
                          !item.diagnostics.length && item.contiguous && item.pageIds.length,
                      )
                      .map((item) => ({
                        id: item.section.id,
                        title: item.section.title,
                        pageIds: item.pageIds,
                        startPageId: item.section.startPageId,
                        sectionPosition: item.sectionPosition,
                      }))
              }
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
              onInsert={selectedPresentationId ? undefined : insertAtBoundary}
              onCreateSection={
                selectedPresentationId
                  ? undefined
                  : (boundary) => {
                      if (projectDirty) {
                        setUiError(
                          'Save or discard the Project organization draft before creating a Section here.',
                        );
                        showProjectEditor();
                      } else setSectionBoundary(boundary);
                    }
              }
              onDuplicate={(pageId) => void apply([{ op: 'page.duplicate', pageId }])}
              onRemove={(pageId) => void apply([{ op: 'page.remove', pageId }])}
              onVisibility={
                selectedPresentationId
                  ? undefined
                  : (pageId, hidden) =>
                      void apply([{ op: 'metadata.patch', pageId, set: { hidden } }])
              }
              onHistory={setHistoryPageId}
              onShowFile={(pageId) => {
                selectPage(pageId);
                setLeftTab('files');
              }}
              onMove={moveAtBoundary}
              onRestore={(pageId) =>
                void run(async () => {
                  await client.apply([{ op: 'page.restore', pageId, afterPageId: selectedPageId }]);
                  selectPage(pageId);
                })
              }
            />
          ) : null}
          <PanelResizeHandle
            label="Resize Project navigation"
            value={navigationWidth}
            min={240}
            max={440}
            axis="x"
            onChange={setNavigationWidth}
          />
        </aside>
        {navigationCollapsed && (
          <div className="hd-collapsed-panel border-r">
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={t('展开项目导航')}
              title={t('展开项目导航')}
              onClick={() => setNavigationCollapsed(false)}
            >
              <PanelLeftOpen />
            </Button>
          </div>
        )}
        <main
          className="flex min-w-0 flex-1 flex-col"
          onDragOver={(event) => {
            if (filePreviewPath) {
              event.preventDefault();
              return;
            }
            if (
              event.dataTransfer.types.includes('Files') ||
              event.dataTransfer.types.includes('application/x-huandeng-asset')
            ) {
              event.preventDefault();
              event.dataTransfer.dropEffect = 'copy';
            }
          }}
          onDrop={(event) => {
            if (filePreviewPath) {
              event.preventDefault();
              return;
            }
            const internal = event.dataTransfer.getData('application/x-huandeng-asset');
            if (internal) {
              event.preventDefault();
              if (!page || readonly || busy || importingImages) return;
              setImportingImages(true);
              const rect = document
                .querySelector('[data-hd-editor-canvas] [data-pptd-page]')
                ?.getBoundingClientRect();
              const point =
                rect && rect.width > 0 && rect.height > 0
                  ? {
                      x: ((event.clientX - rect.left) * snapshot.size[0]) / rect.width,
                      y: ((event.clientY - rect.top) * snapshot.size[1]) / rect.height,
                    }
                  : undefined;
              void run(async () => {
                try {
                  const payload = JSON.parse(internal) as { path?: unknown };
                  if (typeof payload.path !== 'string' || payload.path.length > 512)
                    throw new Error('Choose an available image to place.');
                  const result = await backend.assets({
                    query: payload.path,
                    kind: 'image',
                    limit: 200,
                  });
                  const asset = result.items.find(
                    (item) => item.path === payload.path && item.status === 'available',
                  );
                  if (!asset) throw new Error('Choose an available image to place.');
                  const dimensions = await new Promise<{ width: number; height: number }>(
                    (resolve, reject) => {
                      const image = new Image();
                      const timer = setTimeout(
                        () => reject(new Error('Unable to load this image.')),
                        30000,
                      );
                      image.onload = () => {
                        clearTimeout(timer);
                        resolve({ width: image.naturalWidth, height: image.naturalHeight });
                      };
                      image.onerror = () => {
                        clearTimeout(timer);
                        reject(new Error('Unable to load this image.'));
                      };
                      image.src = assetVersionUrl(pptdAssetUrl(asset.path), asset.previewRevision);
                    },
                  );
                  await insertLibraryAsset(asset, dimensions, point);
                } finally {
                  setImportingImages(false);
                }
              });
              return;
            }
            const files = Array.from(event.dataTransfer.files);
            if (files.length) {
              event.preventDefault();
              importImages(files);
            }
          }}
        >
          <WorkspaceDocumentTabs
            files={openFilePreviews}
            activePath={filePreviewPath}
            onSelect={setFilePreviewPath}
            onClose={closeFilePreview}
          />
          <div
            className={filePreviewPath ? 'hidden' : 'flex min-h-0 flex-1 flex-col'}
            data-hd-slide-document
          >
            <div
              className="hd-editor-toolbar flex h-11 shrink-0 items-center gap-1 border-b border-border bg-background px-3"
              data-hd-focus-region="tools"
              tabIndex={-1}
            >
              <Button
                variant={insertionTool ? 'ghost' : 'secondary'}
                size="icon-sm"
                aria-label={t('选择工具')}
                aria-pressed={!insertionTool}
                title={t('选择 V · Esc 取消插入')}
                onClick={() => chooseTool(null)}
              >
                <MousePointer2 />
              </Button>
              <span className="mx-1 h-4 w-px bg-border" />
              <Button
                variant="ghost"
                size="sm"
                aria-label={t('添加文本')}
                title={t('文字 T · 在画布点击或拖拽放置')}
                aria-pressed={insertionTool?.kind === 'text'}
                disabled={readonly || busy || !page}
                onClick={() => chooseTool(insertionTool?.kind === 'text' ? null : { kind: 'text' })}
              >
                <Type />
                {t('文字')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                aria-label={t('从设备导入并放置图片')}
                title={t('从设备导入图片并放置到当前页')}
                data-hd-import-images
                disabled={readonly || busy || !page}
                onClick={() => imageInputRef.current?.click()}
              >
                {importingImages ? <Loader2 className="animate-spin" /> : <Upload />}
                {t('Image')}
              </Button>
              <ShapeInsertMenu
                disabled={readonly || busy || !page}
                active={insertionTool?.kind === 'shape'}
                onChoose={chooseTool}
              />
              <Button
                variant="ghost"
                size="sm"
                aria-label={t('添加线条')}
                title={t('线条 L · 拖拽绘制，Shift 约束方向')}
                aria-pressed={insertionTool?.kind === 'line'}
                disabled={readonly || busy || !page}
                onClick={() => chooseTool(insertionTool?.kind === 'line' ? null : { kind: 'line' })}
              >
                <Minus />
                {t('线条')}
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
                aria-label={t('组合对象')}
                title={t('组合 Ctrl+G')}
                disabled={readonly || busy || selectedElements.length < 2}
                onClick={() => groupSelection()}
              >
                <Group />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t('取消组合')}
                title={t('取消组合 Ctrl+Shift+G')}
                disabled={
                  readonly || busy || !selectedElements.some((item) => item.elementType === 'group')
                }
                onClick={() => groupSelection(true)}
              >
                <Ungroup />
              </Button>
              <span className="min-w-1 flex-1" />
              <Button
                variant={timelineOpen ? 'secondary' : 'ghost'}
                size="sm"
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
                <Clapperboard />
                {t('动画')}
              </Button>
              <Button
                variant={notesOpen ? 'secondary' : 'ghost'}
                size="sm"
                aria-expanded={notesOpen}
                onClick={() => setNotesOpen((value) => !value)}
              >
                <NotebookPen />
                {t('Notes')}
              </Button>
            </div>
            {selectedPresentationId && selectedView && (
              <div
                className="flex shrink-0 items-center gap-2 border-b bg-brand-soft px-4 py-2 text-xs"
                data-hd-shared-slide-notice
              >
                <span className="flex-1">
                  {selectedView?.versionId
                    ? t('此引用固定为已记录版本，内容只读。')
                    : t('此演讲引用 主幻灯片；内容编辑会同步到主页面及其他实时引用。')}
                </span>
                {selectedPageId && (
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => selectMainPage(selectedPageId)}
                  >
                    {t('前往 Main Slide')}
                  </Button>
                )}
                <Button size="xs" variant="ghost" onClick={showProjectEditor}>
                  {t('编排与备注')}
                </Button>
              </div>
            )}
            {conflict && (
              <div
                className="shrink-0 border-b border-amber-300/50 bg-amber-50 px-4 py-3 text-amber-900"
                data-hd-conflict
              >
                <p className="mb-2 text-xs">
                  {t('{message} 自动保存已暂停。', { message: t(conflict) })}
                </p>
                <div className="flex gap-2">
                  <Button size="xs" variant="outline" onClick={copyDraft}>
                    <Copy />
                    {t('复制本地草稿')}
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
                    {t('放弃草稿，采用磁盘版本')}
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
                <span>
                  {t('{tool}：点击放置，拖拽设置大小', { tool: insertionLabel(insertionTool) })}
                </span>
                <span className="ml-auto text-[11px]">{t('Shift 约束 · Esc 取消')}</span>
              </div>
            )}
            {previewActive && (
              <div
                className="hd-preview-context flex shrink-0 items-center gap-3 border-b border-brand/15 bg-brand-soft px-4 py-1.5 text-xs"
                data-hd-preview-context
              >
                <span className="flex shrink-0 items-center gap-1.5 font-medium text-brand">
                  <Clapperboard className="size-3.5" />
                  {t('动画预览')}
                </span>
                <span
                  className="min-w-0 flex-1 truncate text-muted-foreground"
                  title={
                    selectedIds.length
                      ? selectedIds.join(locale === 'en' ? ', ' : '、')
                      : t('当前页面')
                  }
                >
                  {selectedIds.length === 1
                    ? t('对象 · {id}', { id: selectedIds[0] })
                    : selectedIds.length
                      ? t('已选 {count} 个对象', { count: selectedIds.length })
                      : t('当前页面')}
                </span>
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => {
                    setPreviewResetKey((key) => key + 1);
                    requestAnimationFrame(() => focusEditorCanvas(selectedIds[0]));
                  }}
                >
                  {t('返回基础编辑')}
                </Button>
              </div>
            )}
            <div className="relative flex min-h-0 flex-1 flex-col">
              {authoringPage ? (
                <AuthoringWorkspace
                  onZoom={setScale}
                  canvas={{
                    page: authoringPage,
                    size: snapshot.size,
                    theme,
                    selectedIds,
                    onSelect: setSelectedIds,
                    onCommand: (command) =>
                      executeKeyboardCommand(
                        command,
                        document.querySelector('[data-hd-editor-canvas]'),
                      ),
                    disabled: readonly,
                    insertionTool,
                    onPlace: placeElement,
                    autoEditId,
                    scale,
                    snapEnabled: snapping.enabled,
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
                  onSelectTargets={setSelectedIds}
                  onTransitionChange={async (transition, expectedPageRevision) => {
                    const current = client
                      .getState()
                      .snapshot?.pages.find((item) => item.pageId === authoringPage.pageId);
                    if (!current || current.pageRevision !== expectedPageRevision)
                      throw new Error('页面已在别处改变，转场修改已保留，请还原后重试。');
                    return client.apply(
                      [{ op: 'page.transition.set', pageId: authoringPage.pageId, transition }],
                      { pages: { [authoringPage.pageId]: current.pageRevision } },
                    );
                  }}
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
                  <div className="max-w-sm px-6 text-center" data-hd-empty-collection>
                    {emptyPresentation && (
                      <h2 className="mb-2 text-base font-medium">
                        {
                          project?.presentations.find((item) => item.id === selectedPresentationId)
                            ?.title
                        }
                      </h2>
                    )}
                    <p className="mb-4 text-sm text-muted-foreground">
                      {selectedPresentationId
                        ? presentationLoading
                          ? t('正在读取演讲引用与固定版本…')
                          : t('在项目面板中为这份演讲添加章节或页面。')
                        : t('从一张空白页开始。')}
                    </p>
                    <Button
                      disabled={readonly || busy}
                      onClick={() =>
                        selectedPresentationId
                          ? showProjectEditor()
                          : void apply([{ op: 'page.add' }])
                      }
                    >
                      <Plus />
                      {selectedPresentationId ? t('编排演讲') : t('新增页面')}
                    </Button>
                  </div>
                </div>
              )}
            </div>
            {notesOpen && notesDock === 'bottom' && page && (
              <NotesPanel
                value={page.data.notes ?? ''}
                dock={notesDock}
                height={notesHeight}
                width={notesWidth}
                disabled={readonly}
                presentation={!!selectedPresentationId}
                onChange={(value) => client.setNotes(page.pageId, value)}
                onComposition={(value) => client.setComposing(page.pageId, value)}
                onDock={setNotesDock}
                onHeight={setNotesHeight}
                onWidth={setNotesWidth}
                onResizeEnd={() => {}}
                onClose={() => setNotesOpen(false)}
                onEditOccurrence={showProjectEditor}
              />
            )}
            <div className="hd-statusbar flex shrink-0 items-center gap-2 border-t border-border bg-background px-3 text-xs text-muted-foreground">
              <span className="min-w-0 truncate" title={page?.pageId} data-hd-slide-identity>
                {page
                  ? `Position ${pageIndex + 1} / ${viewPages.length} · Slide ID ${page.shortCode ?? page.pageId}`
                  : t('No slide selected')}
              </span>
              {exportReport && (
                <a href={exportReport} download className="shrink-0 underline underline-offset-2">
                  {t('导出说明')}
                </a>
              )}
              <span className="flex-1" />
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label={t('缩小画布')}
                onClick={() => setScale(Math.max(0.15, (scale ?? actualScale) - 0.1))}
              >
                <Minus />
              </Button>
              <button
                type="button"
                className="min-w-12 font-mono text-[11px]"
                title={t('点击适合窗口')}
                onClick={() => setScale(undefined)}
              >
                {Math.round(actualScale * 100)}%
              </button>
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label={t('放大画布')}
                onClick={() => setScale(Math.min(3, (scale ?? actualScale) + 0.1))}
              >
                <Plus />
              </Button>
              <Button
                variant="ghost"
                size="xs"
                aria-label={t('适合窗口')}
                title={t('Fit slide to available canvas space')}
                onClick={() => setScale(undefined)}
              >
                {t('Fit')}
              </Button>
            </div>
          </div>
          {openFilePreviews.map((path) => (
            <div
              key={path}
              className={filePreviewPath === path ? 'flex min-h-0 flex-1' : 'hidden'}
              data-hd-file-document={path}
            >
              <ProjectFilePreviewPanel
                backend={backend}
                path={path}
                active={filePreviewPath === path}
                onClose={() => closeFilePreview(path)}
                onShowProperties={() => setFilePreviewPath(null)}
              />
            </div>
          ))}
          {activityOpen && !presenting && (
            <PptdActivityPanel
              backend={backend}
              deckId={snapshot.metadata.deckId}
              pageLabels={Object.fromEntries(
                snapshot.pages
                  .filter((item) => item.state === 'active')
                  .map((item) => [
                    item.pageId,
                    item.shortCode ?? item.metadata.label ?? item.pageId,
                  ]),
              )}
              onSelectPage={(id) => {
                if (currentReviewTarget(snapshot, id)) selectMainPage(id);
              }}
              onReview={(operationId) => setOperationReview({ operationId, backend })}
              onClose={() => setActivityOpen(false)}
            />
          )}
        </main>
        {page && (
          <div
            className={`hd-inspector-container relative shrink-0 ${inspectorCollapsed || previewActive || filePreviewPath || (notesOpen && notesDock === 'right') ? 'hidden' : 'flex'}`}
            style={{ width: inspectorWidth }}
          >
            <PanelResizeHandle
              label="Resize Inspector"
              value={inspectorWidth}
              min={260}
              max={460}
              axis="x"
              direction={-1}
              onChange={setInspectorWidth}
            />
            <PptdInspector
              key={`${page.pageId}:${draftResetKey}`}
              tab={inspectorTab}
              onTabChange={setInspectorTab}
              onCommand={(command) =>
                executeKeyboardCommand(command, document.querySelector('[data-hd-editor-canvas]'))
              }
              onCollapse={() => setInspectorCollapsed(true)}
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
              onDistribute={distribute}
              onLayer={layer}
              onRemove={removeElements}
              storyContent={
                <DesignIntentPanel
                  page={page}
                  draft={storyDrafts[page.pageId]}
                  onDraftChange={retainStoryDraft}
                  metadataRevision={snapshot.metadataRevision}
                  onApply={(operations, expected) => client.apply(operations, expected)}
                  disabled={readonly || busy}
                />
              }
              checksContent={
                <TechnicalQaPanel
                  page={page}
                  size={snapshot.size}
                  diagnostics={snapshot.diagnostics}
                  onSelect={(id) => {
                    setSelectedIds([id]);
                    setInspectorTab('properties');
                  }}
                />
              }
            >
              <RecipePanel
                snapshot={snapshot}
                page={page}
                selectedIds={selectedIds}
                onSelectTitle={(id) => setSelectedIds([id])}
                onApply={(operations, expected) => client.apply(operations, expected)}
                disabled={readonly || busy}
              />
            </PptdInspector>
          </div>
        )}
        {page && notesOpen && notesDock === 'right' && !previewActive && (
          <div className={filePreviewPath ? 'hidden' : 'contents'}>
            <NotesPanel
              value={page.data.notes ?? ''}
              dock={notesDock}
              height={notesHeight}
              width={notesWidth}
              disabled={readonly}
              presentation={!!selectedPresentationId}
              onChange={(value) => client.setNotes(page.pageId, value)}
              onComposition={(value) => client.setComposing(page.pageId, value)}
              onDock={setNotesDock}
              onHeight={setNotesHeight}
              onWidth={setNotesWidth}
              onResizeEnd={() => {}}
              onClose={() => {
                setNotesOpen(false);
                setInspectorCollapsed(false);
              }}
              onEditOccurrence={showProjectEditor}
            />
          </div>
        )}
        {page &&
          inspectorCollapsed &&
          !previewActive &&
          !filePreviewPath &&
          !(notesOpen && notesDock === 'right') && (
            <div className="hd-collapsed-panel border-l">
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label={t('展开对象属性')}
                title={t('展开对象属性')}
                onClick={() => setInspectorCollapsed(false)}
              >
                <PanelRightOpen />
              </Button>
            </div>
          )}
      </div>
      {sectionBoundary && (
        <CreateSectionDialog
          snapshot={snapshot}
          boundary={sectionBoundary}
          disabled={readonly || busy || projectDirty}
          onClose={() => setSectionBoundary(null)}
          onCreate={async (definition) => {
            if (readonly || busy || projectDirty)
              throw new Error(
                'Save or discard the Project organization draft before creating a Section here.',
              );
            await client.flushAll();
            const current = client.getState().snapshot;
            if (!current) throw new Error('The Project is no longer available.');
            if (insertionBoundaryIndex(current.pages, sectionBoundary) === null)
              throw new Error('Slide order changed. Choose the insertion point again.');
            const section = {
              id: definition.id,
              title: definition.title,
              frontMatter: definition.frontMatter,
            };
            const operations: PptdOperation[] = definition.insertCover
              ? [
                  {
                    op: 'page.add',
                    afterPageId: sectionBoundary.afterPageId,
                    section,
                    page: {
                      pageType: 'section',
                      elements: [
                        {
                          elementId: `e-${crypto.randomUUID()}`,
                          elementType: 'text',
                          bounds: [
                            current.size[0] * 0.07,
                            current.size[1] * 0.38,
                            current.size[0] * 0.86,
                            current.size[1] * 0.24,
                          ],
                          content: {
                            text: definition.title,
                            fontSize: 32,
                            color: '#000000',
                            fontFamily: 'Arial',
                            align: ['left', 'middle'],
                          },
                        },
                      ],
                      notes: '',
                    },
                  },
                ]
              : [
                  {
                    op: 'project.replace',
                    project: sectionAtBoundary(current, sectionBoundary, section),
                  },
                ];
            const result = await client.apply(operations, {
              manifest: current.manifestRevision,
              metadata: current.metadataRevision,
            });
            if (result.createdPages[0]) selectPage(result.createdPages[0].pageId);
          }}
        />
      )}
      <WorkspaceSettings
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        navigation={!navigationCollapsed}
        inspector={!filePreviewPath && !inspectorCollapsed && !(notesOpen && notesDock === 'right')}
        notes={notesOpen}
        onNavigation={(value) => setNavigationCollapsed(!value)}
        onInspector={(value) => {
          setInspectorCollapsed(!value);
          if (value) {
            setFilePreviewPath(null);
            if (notesDock === 'right') setNotesOpen(false);
          }
        }}
        onNotes={setNotesOpen}
        onKeyboard={() => {
          setSettingsOpen(false);
          setKeyboardHelpOpen(true);
        }}
        onReset={() => {
          setNavigationWidth(288);
          setInspectorWidth(300);
          setFilePreviewPath(null);
          setOpenFilePreviews([]);
          setNotesHeight(160);
          setNotesWidth(320);
          setNavigationCollapsed(false);
          setInspectorCollapsed(false);
          setNotesDock('bottom');
          setNotesOpen(false);
          setScale(undefined);
        }}
        snapping={{
          enabled: snapping.enabled,
          disabled: !snapping.ready || snapping.saving || previewActive,
          onChange: (next) => void run(() => snapping.change(next)),
        }}
      />
      <AgentConnectionDialog open={agentConnectionOpen} onOpenChange={setAgentConnectionOpen} />
      <KeyboardHelpDialog open={keyboardHelpOpen} onOpenChange={setKeyboardHelpOpen} />
      <Dialog open={pendingDraftsOpen} onOpenChange={setPendingDraftsOpen}>
        <DialogContent className="max-h-[85dvh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{t('未保存的编辑草稿')}</DialogTitle>
            <DialogDescription>
              {t('草稿在切页时保留。返回原对象完成编辑，或先复制文字；放弃只删除这份待保存草稿。')}
            </DialogDescription>
          </DialogHeader>
          {projectDirty && (
            <section className="space-y-2 border-t pt-3">
              <h3 className="text-sm">{t('Project organization')}</h3>
              <p className="text-xs text-muted-foreground">
                {t('Review Sections and Presentations, then save or discard the Project draft.')}
              </p>
              <Button
                size="xs"
                onClick={() => {
                  setPendingDraftsOpen(false);
                  showProjectEditor();
                }}
              >
                {t('查看项目草稿')}
              </Button>
            </section>
          )}
          {timelineDirty && (
            <section className="space-y-2 border-t pt-3">
              <h3 className="text-sm">{t('Animation')}</h3>
              <Button
                size="xs"
                onClick={() => {
                  setPendingDraftsOpen(false);
                  setTimelineOpen(true);
                  requestAnimationFrame(() => {
                    const region = document.querySelector('[data-hd-keyboard-region="timeline"]');
                    region
                      ?.querySelector<HTMLElement>('button:not(:disabled)')
                      ?.focus({ preventScroll: true });
                  });
                }}
              >
                {t('查看动画草稿')}
              </Button>
            </section>
          )}
          {Object.entries(storyDrafts)
            .filter(([, draft]) => draft.dirty)
            .map(([id, draft]) => (
              <section key={`story:${id}`} className="space-y-2 border-t pt-3">
                <h3 className="text-sm">{snapshot.metadata.slides[id]?.label ?? id} · Story</h3>
                <Textarea
                  readOnly
                  aria-label={t('保留的 故事草稿')}
                  value={`${draft.purpose}\n\n${draft.keep}`}
                />
                <Button
                  size="xs"
                  disabled={timelineDirty}
                  onClick={() => {
                    selectMainPage(id);
                    setFilePreviewPath(null);
                    setInspectorCollapsed(false);
                    setInspectorTab('story');
                    if (notesDock === 'right') setNotesOpen(false);
                    setPendingDraftsOpen(false);
                  }}
                >
                  {t('返回页面')}
                </Button>
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => {
                    retainStoryDraft(id, null);
                    setDraftResetKey((key) => key + 1);
                  }}
                >
                  {t('放弃这份 故事草稿')}
                </Button>
              </section>
            ))}
          {Object.entries(chartDrafts).flatMap(([id, entries]) =>
            Object.entries(entries).map(([elementId, draft]) => (
              <section key={`${id}:${elementId}`} className="space-y-2 border-t pt-3">
                <h3 className="text-sm">
                  {snapshot.metadata.slides[id]?.label ?? id} · {elementId}
                </h3>
                <Textarea readOnly aria-label={t('保留的图表数据草稿')} value={draft.value} />
                <Button
                  size="xs"
                  disabled={timelineDirty}
                  onClick={() => {
                    selectMainPage(id);
                    setSelectedIds([elementId]);
                    setFilePreviewPath(null);
                    setInspectorCollapsed(false);
                    setInspectorTab('properties');
                    if (notesDock === 'right') setNotesOpen(false);
                    setPendingDraftsOpen(false);
                  }}
                >
                  {t('返回图表')}
                </Button>
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => {
                    retainChartDraft(id, elementId, null);
                    setDraftResetKey((key) => key + 1);
                  }}
                >
                  {t('放弃这份图表草稿')}
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
        aria-label={t('从设备导入图片')}
        disabled={readonly || busy || !page}
        onChange={(event) => {
          const files = Array.from(event.currentTarget.files ?? []);
          event.currentTarget.value = '';
          void importImages(files);
        }}
      />
      {operationReview?.backend === backend && (
        <OperationReviewDialog
          key={`${snapshot.deckId}:${operationReview.operationId}`}
          backend={backend}
          snapshot={snapshot}
          operationId={operationReview.operationId}
          open
          onOpenChange={(open) => {
            if (!open) setOperationReview(null);
          }}
          onNavigate={(id, elementId) => {
            if (timelineDirty) {
              setUiError('请先保存或还原时间线中的修改，再切换页面。');
              return;
            }
            const current = client.getState().snapshot;
            const target = current && currentReviewTarget(current, id, elementId);
            if (!target) return;
            selectMainPage(target.pageId);
            if (target.elementId) setSelectedIds([target.elementId]);
            setOperationReview(null);
          }}
        />
      )}
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
          initialPosition={presentationEntries.current.get(presentationPageKey) ?? 'start'}
          sessionId={presentationSession}
          canStep={() => !pendingPresentationPage.current}
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
            .map((item) => t(item.message))
            .join(' · ')}
        </div>
      )}
    </div>
  );
}
