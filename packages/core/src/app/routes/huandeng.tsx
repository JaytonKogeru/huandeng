import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  Circle,
  Copy,
  Download,
  FilePlus2,
  Files,
  FileText,
  FolderOpen,
  Group,
  History,
  ImagePlus,
  Loader2,
  Maximize2,
  Minus,
  MousePointer2,
  PanelsTopLeft,
  Play,
  Plus,
  Redo2,
  RefreshCw,
  Save,
  Type,
  Undo2,
  Ungroup,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { HuandengMark } from '@/components/brand-mark';
import { type DesignIntentDraft, DesignIntentPanel } from '@/components/pptd/design-intent-panel';
import { alignedBounds, PptdEditorCanvas } from '@/components/pptd/editor-canvas';
import { PptdInspector } from '@/components/pptd/inspector';
import { PageHistoryDialog } from '@/components/pptd/page-history-dialog';
import { ProjectPanel } from '@/components/pptd/project-panel';
import { PptdProjectTree } from '@/components/pptd/project-tree';
import { RecipePanel } from '@/components/pptd/recipe-panel';
import { PptdPageRenderer, type PptdTheme } from '@/components/pptd/renderer';
import { ScienceInsertMenu } from '@/components/pptd/science-insert-menu';
import type { ChartDataDraft } from '@/components/pptd/science-inspector';
import { ShapeInsertMenu } from '@/components/pptd/shape-insert-menu';
import { TechnicalQaPanel } from '@/components/pptd/technical-qa-panel';
import { PptdThumbnailRail } from '@/components/pptd/thumbnail-rail';
import { SlideCanvas } from '@/components/slide-canvas';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { desktopHost } from '@/lib/huandeng-desktop';
import type { Alignment } from '@/lib/inspector/geometry';
import { isTypingTarget } from '@/lib/keys';
import { draftHasChanges } from '@/lib/pptd-document';
import { type InsertionTool, insertionLabel } from '@/lib/pptd-insertion';
import { useDocumentTitle } from '@/lib/use-document-title';
import { usePptdDocument } from '@/lib/use-pptd-document';
import {
  buildGroup,
  duplicateElements,
  expandGroupIds,
  groupChildren,
  owningGroupId,
  transformGroup,
  ungroupOperations,
} from '../../pptd/grouping';
import { readProjectModel } from '../../pptd/project-model';
import type { DeckSnapshot, PageSnapshot, PptdElement, PptdOperation } from '../../pptd/types';

export function HuandengEditor() {
  const [projectDirty, setProjectDirty] = useState(false);
  const [storyDrafts, setStoryDrafts] = useState<Record<string, DesignIntentDraft>>({});
  const [chartDrafts, setChartDrafts] = useState<Record<string, Record<string, ChartDataDraft>>>(
    {},
  );
  const [pendingDraftsOpen, setPendingDraftsOpen] = useState(false);
  const [draftResetKey, setDraftResetKey] = useState(0);
  const [importingImages, setImportingImages] = useState(false);
  const storyDirty = Object.values(storyDrafts).some((draft) => draft.dirty);
  const chartDirty = Object.values(chartDrafts).some((drafts) => Object.keys(drafts).length > 0);
  const auxiliaryDirty = projectDirty || storyDirty || chartDirty;
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
  const [presenting, setPresenting] = useState(false);
  const [presenterNotesOpen, setPresenterNotesOpen] = useState(false);
  const [imageDialog, setImageDialog] = useState(false);
  const [imagePath, setImagePath] = useState('');
  const [historyPageId, setHistoryPageId] = useState<string | null>(null);
  const [leftTab, setLeftTab] = useState<'pages' | 'files' | 'project'>('pages');
  const [presentationView, setPresentationView] = useState<DeckSnapshot | null>(null);
  const [presentationLoading, setPresentationLoading] = useState(false);
  const [presentationError, setPresentationError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
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
  const readonly = !snapshot?.writable || !!selectedView?.versionId;
  const busy = state.saving || exporting || importingImages;
  const presentationBlocked = auxiliaryDirty || presentationLoading || !!presentationError;
  const nextPage = pageIndex >= 0 ? viewPages[pageIndex + 1] : undefined;
  const historyPage = snapshot?.pages.find((item) => item.pageId === historyPageId);

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
    (id: string, occurrenceId?: string) => {
      setSelectedIds([]);
      setInsertionTool(null);
      setAutoEditId(null);
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          next.set('page', id);
          if (occurrenceId) next.set('occurrence', occurrenceId);
          else next.delete('occurrence');
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const selectPresentation = useCallback(
    (id: string | null) => {
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
    [setSearchParams],
  );

  const selectMainPage = useCallback(
    (id: string) => {
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
    [setSearchParams],
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
      const ordered: string[] = [];
      const visit = (id: string) => {
        if (ordered.includes(id)) return;
        const element = page.data.elements.find((item) => item.elementId === id);
        if (!element) return;
        ordered.push(id);
        for (const child of groupChildren(element)) visit(child);
      };
      for (const id of selectedIds) visit(id);
      await client.apply(
        ordered.map((elementId) => ({ op: 'element.remove', pageId: page.pageId, elementId })),
      );
    });
  }, [client, page, run, selectedIds]);

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
    (files: File[]) => {
      if (!page || !snapshot || readonly || busy || !files.length) return;
      void run(async () => {
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
          setSelectedIds(elements.map((element) => element.elementId));
          setImageDialog(false);
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
        isTypingTarget(event.target) ||
        (event.target as Element)?.closest('[role="dialog"]')
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
          throw new Error('请在同一项目中复制对象。跨项目图片可用“导入图片”复制素材。');
        const duplicated = duplicateElements(
          copiedElements,
          copiedSelection,
          () => `node-${crypto.randomUUID()}`,
        );
        await client.apply(
          duplicated.copies.map((element) => ({ op: 'element.add', pageId: page.pageId, element })),
        );
        setSelectedIds(duplicated.selectedIds);
      });
    };
    window.addEventListener('paste', paste);
    return () => window.removeEventListener('paste', paste);
  }, [busy, client, importImages, page, readonly, run, snapshot]);

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

  const addElement = (
    type: 'text' | 'shape' | 'line' | 'image',
    extra: Partial<PptdElement> = {},
  ) => {
    if (!page || !snapshot) return;
    const elementId = `node-${crypto.randomUUID()}`;
    const element: PptdElement = {
      elementId,
      elementType: type,
      bounds:
        type === 'text'
          ? [64, 64, Math.min(480, snapshot.size[0] - 128), 56]
          : type === 'line'
            ? [100, 200, 280, 1]
            : [100, 120, 280, 180],
      ...(type === 'text'
        ? { content: { text: '双击编辑文字', fontSize: 28, fontFamily: 'Arial', color: '#263531' } }
        : {}),
      ...(type === 'shape'
        ? {
            shapeName: 'rect',
            fill: { type: 'solid', color: '#dbe5df' },
            border: { width: 1, color: '#668374' },
          }
        : {}),
      ...(type === 'line'
        ? { viewBox: [280, 1], points: '0,0.5 280,0.5', border: { width: 2, color: '#394d43' } }
        : {}),
      ...(type === 'image' ? { fit: { mode: 'contain' } } : {}),
      ...extra,
    };
    void run(async () => {
      await client.apply([{ op: 'element.add', pageId: page.pageId, element }]);
      setSelectedIds([elementId]);
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
      const next = Math.max(0, Math.min(viewPages.length - 1, pageIndex + delta));
      selectPage(viewPages[next].pageId, viewPages[next].occurrenceId);
    },
    [viewPages, pageIndex, selectPage],
  );

  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (event.isComposing || event.keyCode === 229) return;
      const control = event.ctrlKey || event.metaKey;
      if (control && event.key.toLowerCase() === 's') {
        event.preventDefault();
        void run(() => client.flushAll());
        return;
      }
      if ((event.target as Element)?.closest('[role="dialog"], [role="menu"]')) return;
      if (event.key === 'F5' && page) {
        event.preventDefault();
        if (presentationBlocked) {
          setUiError('请先保存项目草稿并解决演讲引用问题。');
          return;
        }
        void run(async () => {
          await client.flushAll();
          if (!event.shiftKey && viewPages[0])
            selectPage(viewPages[0].pageId, viewPages[0].occurrenceId);
          setPresenterNotesOpen(false);
          setPresenting(true);
        });
        return;
      }
      if (isTypingTarget(event.target)) return;
      if (event.key === 'Escape') {
        setInsertionTool(null);
        setAutoEditId(null);
        setPresenting(false);
        setSelectedIds([]);
        return;
      }
      if (presenting) {
        if (event.key === ' ' && (event.target as Element)?.closest('button')) return;
        if (['ArrowRight', 'ArrowDown', ' ', 'PageDown'].includes(event.key)) {
          event.preventDefault();
          stepPage(1);
        }
        if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(event.key)) {
          event.preventDefault();
          stepPage(-1);
        }
        return;
      }
      if (readonly || busy) return;
      const railPageId = (event.target as Element)
        ?.closest('[data-hd-thumbnail]')
        ?.getAttribute('data-hd-thumbnail');
      if (control && event.key.toLowerCase() === 'm') {
        event.preventDefault();
        if (selectedPresentationId) {
          setLeftTab('project');
          return;
        }
        void apply([{ op: 'page.add', afterPageId: selectedPageId }]);
        return;
      }
      if (control && event.key.toLowerCase() === 'd') {
        event.preventDefault();
        if (railPageId || !selectedElements.length) {
          if (selectedPresentationId) {
            setLeftTab('project');
            return;
          }
          const pageId = railPageId ?? selectedPageId;
          if (pageId) void apply([{ op: 'page.duplicate', pageId }]);
        } else if (page) {
          void run(async () => {
            const { copies, selectedIds: selection } = duplicateElements(
              page.data.elements,
              selectedIds,
              () => `node-${crypto.randomUUID()}`,
              16,
            );
            await client.apply(
              copies.map((element) => ({ op: 'element.add', pageId: page.pageId, element })),
            );
            setSelectedIds(selection);
          });
        }
        return;
      }
      if (control && event.key.toLowerCase() === 'g' && selectedIds.length) {
        event.preventDefault();
        groupSelection(event.shiftKey);
        return;
      }
      if (control && event.key.toLowerCase() === 'c' && page && selectedIds.length) {
        event.preventDefault();
        void run(async () => {
          const ids = new Set(expandGroupIds(page.data.elements, selectedIds));
          await navigator.clipboard.writeText(
            JSON.stringify({
              kind: 'huandeng-elements',
              deckId: snapshot?.deckId,
              elements: page.data.elements.filter((item) => ids.has(item.elementId)),
              selectedIds,
            }),
          );
        });
        return;
      }
      if (railPageId && (event.key === 'Delete' || event.key === 'Backspace')) {
        event.preventDefault();
        if (selectedPresentationId) {
          setLeftTab('project');
          return;
        }
        void apply([{ op: 'page.remove', pageId: railPageId }]);
        return;
      }
      if (control && (event.key.toLowerCase() === 'z' || event.key.toLowerCase() === 'y')) {
        event.preventDefault();
        void run(() =>
          client.history(event.shiftKey || event.key.toLowerCase() === 'y' ? 'redo' : 'undo'),
        );
        return;
      }
      if ((event.target as Element)?.closest('button, select, [role="dialog"]')) return;
      if (
        !control &&
        !event.altKey &&
        ['v', 't', 'r', 'l'].includes(event.key.toLowerCase()) &&
        page
      ) {
        event.preventDefault();
        setSelectedIds([]);
        setAutoEditId(null);
        const key = event.key.toLowerCase();
        setInsertionTool(
          key === 'v'
            ? null
            : key === 't'
              ? { kind: 'text' }
              : key === 'l'
                ? { kind: 'line' }
                : { kind: 'shape', shapeName: 'rect' },
        );
        return;
      }
      if (control && event.key.toLowerCase() === 'a' && page) {
        event.preventDefault();
        setSelectedIds(
          page.data.elements
            .filter((element) => !owningGroupId(page.data.elements, element.elementId))
            .map((element) => element.elementId),
        );
        return;
      }
      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        removeElements();
        return;
      }
      if (
        page &&
        selectedElements.length &&
        ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)
      ) {
        event.preventDefault();
        const step = event.shiftKey ? 10 : 1;
        for (const element of selectedElements) {
          if (!element.bounds) continue;
          const [x, y, width, height] = element.bounds;
          patchElement(element.elementId, {
            bounds: [
              x + (event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0),
              y + (event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0),
              width,
              height,
            ],
          });
        }
      } else if (event.key === 'PageDown') {
        event.preventDefault();
        stepPage(1);
      } else if (event.key === 'PageUp') {
        event.preventDefault();
        stepPage(-1);
      }
    };
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, [
    apply,
    busy,
    client,
    page,
    presenting,
    readonly,
    removeElements,
    run,
    selectedElements,
    selectedPageId,
    selectPage,
    snapshot,
    stepPage,
    selectedIds,
    groupSelection,
    patchElement,
    presentationBlocked,
    selectedPresentationId,
    viewPages,
  ]);

  const exportDeck = (format: 'pptx' | 'pdf') =>
    void run(async () => {
      if (presentationBlocked) throw new Error('请先保存项目草稿并解决演讲引用问题。');
      await client.flushAll();
      setExporting(true);
      try {
        const result = await backend.export(format, selectedPresentationId);
        const link = document.createElement('a');
        link.href = result.url;
        link.download = result.fileName;
        link.click();
        setExportReport(result.reportUrl);
      } finally {
        setExporting(false);
      }
    });

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

  const status = auxiliaryDirty
    ? '项目 / Story / 图表有未保存的草稿'
    : readonly
      ? '只读模式'
      : state.saving
        ? '正在保存…'
        : drafts.some((draft) => draft.conflict)
          ? '草稿冲突 · 已保留'
          : state.error
            ? '保存需检查'
            : drafts.length
              ? `待保存 · ${drafts.length} 页`
              : '已保存';
  return (
    <div
      className="hd-editor flex h-dvh min-w-[760px] flex-col overflow-hidden bg-canvas text-foreground"
      data-hd-editor
    >
      <header className="hd-titlebar flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background px-4">
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
        <div className="flex shrink-0 items-center gap-2">
          <HuandengMark className="size-7 shrink-0" />
          <span className="text-xs font-semibold tracking-wide">
            HUANDENG{' '}
            <span className="hidden font-normal text-muted-foreground xl:inline">Editor</span>
          </span>
        </div>
        <span className="h-5 w-px bg-border" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-medium" title={snapshot.entry}>
            {snapshot.title || '未命名演示'}
          </h1>
          <select
            aria-label="当前演讲集合"
            className="max-w-full rounded bg-transparent text-xs text-muted-foreground"
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
          <div
            className="flex items-center gap-1.5 text-[10px] text-muted-foreground"
            aria-live="polite"
            data-hd-save-status
          >
            {state.saving ? (
              <Loader2 className="size-2.5 animate-spin" />
            ) : drafts.length || state.error || auxiliaryDirty ? (
              <Circle className="size-2.5" />
            ) : (
              <Check className="size-2.5" />
            )}
            {status}
            <span className="mx-1">·</span>
            <span>{state.connected ? 'Agent 接口已连接' : '正在重连'}</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="撤销"
            title="撤销 Ctrl+Z"
            disabled={readonly || busy || !state.undoStack.length}
            onClick={() => void run(() => client.history('undo'))}
          >
            <Undo2 />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="重做"
            title="重做 Ctrl+Shift+Z"
            disabled={readonly || busy || !state.redoStack.length}
            onClick={() => void run(() => client.history('redo'))}
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
          <Button
            variant="outline"
            size="sm"
            aria-label="保存"
            disabled={readonly || busy}
            onClick={() => void run(() => client.flushAll())}
          >
            <Save />
            保存
          </Button>
          <span className="mx-1 h-5 w-px bg-border" />
          <Button
            variant="ghost"
            size="sm"
            disabled={busy || presentationBlocked}
            onClick={() => exportDeck('pdf')}
          >
            PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            aria-label="导出 PPTX"
            disabled={busy || presentationBlocked}
            onClick={() => exportDeck('pptx')}
          >
            {exporting ? <Loader2 className="animate-spin" /> : <Download />}PPTX
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
      </header>
      {auxiliaryDirty && (
        <div className="flex shrink-0 items-center gap-2 border-b bg-amber-50 px-4 py-1.5 text-xs text-amber-900">
          <span className="flex-1">
            页面内容仍会自动保存；项目编排、Story 和图表数据草稿需要单独保存或放弃。
          </span>
          {projectDirty && (
            <Button size="xs" variant="ghost" onClick={() => setLeftTab('project')}>
              查看项目草稿
            </Button>
          )}
          {storyDirty && (
            <Button
              size="xs"
              variant="ghost"
              onClick={() => {
                const id = Object.keys(storyDrafts).find((key) => storyDrafts[key].dirty);
                if (id) selectMainPage(id);
              }}
            >
              查看页面 故事草稿
            </Button>
          )}
          {(chartDirty || storyDirty) && (
            <Button size="xs" variant="ghost" onClick={() => setPendingDraftsOpen(true)}>
              管理未保存草稿
            </Button>
          )}
        </div>
      )}
      {(uiError || state.error || presentationError) && (
        <div
          className="flex shrink-0 items-start gap-2 border-b border-amber-300/50 bg-amber-50 px-4 py-2 text-xs text-amber-900"
          role="alert"
        >
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
          <span className="flex-1">{uiError || state.error?.message || presentationError}</span>
          {state.canRetry && (
            <Button
              size="xs"
              variant="outline"
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
          className={`flex ${leftTab === 'project' ? 'w-80' : 'w-56'} shrink-0 flex-col border-r border-border bg-sidebar`}
          aria-label="项目导航"
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
            <ProjectPanel
              snapshot={snapshot}
              selectedPresentationId={selectedPresentationId}
              onSelectPresentation={selectPresentation}
              onSelectPage={(id) => {
                selectMainPage(id);
                setLeftTab('pages');
              }}
              onApply={(operations, expected) => client.apply(operations, expected)}
              onDirtyChange={setProjectDirty}
              loadVersions={(id) => backend.pageHistory(id)}
              disabled={!snapshot.writable || busy}
            />
          </div>
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
          <div className="hd-editor-toolbar flex h-11 shrink-0 items-center gap-1 border-b border-border bg-background px-3">
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
              variant="ghost"
              size="sm"
              aria-label="添加图片"
              disabled={readonly || busy || !page}
              onClick={() => setImageDialog(true)}
            >
              <ImagePlus />
              图片
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
              className="ml-auto truncate font-mono text-[10px] text-muted-foreground"
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
              <Button size="xs" variant="ghost" onClick={() => setLeftTab('project')}>
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
                  disabled={state.saving || state.canRetry}
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
              <span className="ml-auto text-[10px]">Shift 约束 · Esc 取消</span>
            </div>
          )}
          <div className="relative min-h-0 flex-1 overflow-auto p-6 md:p-8">
            {page ? (
              <PptdEditorCanvas
                key={page.occurrenceId ?? page.pageId}
                page={page}
                size={snapshot.size}
                theme={theme}
                selectedIds={selectedIds}
                onSelect={setSelectedIds}
                disabled={readonly}
                insertionTool={insertionTool}
                onPlace={placeElement}
                autoEditId={autoEditId}
                scale={scale}
                onScaleChange={setActualScale}
                onPatch={patchElement}
                onBegin={() => client.beginInteraction(page.pageId)}
                onEnd={() => void run(() => client.endInteraction(page.pageId))}
                onCancel={(originals) => client.cancelInteraction(page.pageId, originals)}
                onFlush={() => void run(() => client.flushPage(page.pageId))}
                onComposition={(composing) => client.setComposing(page.pageId, composing)}
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
            <Button variant="ghost" size="xs" onClick={() => setNotesOpen((value) => !value)}>
              演讲备注
            </Button>
            {exportReport && (
              <a href={exportReport} download className="text-xs underline underline-offset-2">
                导出说明
              </a>
            )}
            <span className="ml-auto hidden text-[10px] xl:block">
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
          </div>
          {notesOpen && page && (
            <div className="h-28 shrink-0 overflow-auto bg-background px-4 py-3">
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
          <PptdInspector
            key={`${page.pageId}:${draftResetKey}`}
            page={page}
            chartDrafts={chartDrafts[page.pageId]}
            onChartDraftChange={retainChartDraft}
            theme={theme}
            selectedIds={selectedIds}
            disabled={readonly}
            onSelect={setSelectedIds}
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
        )}
      </div>
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
      <Dialog open={imageDialog} onOpenChange={setImageDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加原始图片</DialogTitle>
            <DialogDescription>
              从设备选择图片、拖到画布，或粘贴截图。素材会保存在本项目中，保持原始比例。
            </DialogDescription>
          </DialogHeader>
          <Input
            type="file"
            accept="image/png,image/jpeg,image/gif,image/svg+xml,image/webp"
            multiple
            aria-label="从设备导入图片"
            disabled={busy}
            onChange={(event) => {
              importImages(Array.from(event.target.files ?? []));
              event.target.value = '';
            }}
          />
          {importingImages && <p className="text-xs text-muted-foreground">正在导入图片…</p>}
          <p className="text-xs text-muted-foreground">也可以引用项目中已有的素材路径：</p>
          <Input
            aria-label="新图片路径"
            placeholder="media/figure.png"
            value={imagePath}
            onChange={(event) => setImagePath(event.target.value)}
          />
          <DialogFooter>
            <Button
              disabled={!imagePath.trim() || busy}
              onClick={() => {
                addElement('image', { src: imagePath.trim() });
                setImageDialog(false);
                setImagePath('');
              }}
            >
              添加图片
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
      {presenting && page && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black" data-hd-presenter>
          <div className="flex min-h-0 flex-1">
            <div className="min-w-0 flex-1 p-4" data-hd-presenter-slide={page.pageId}>
              <SlideCanvas width={snapshot.size[0]} height={snapshot.size[1]} flat>
                <PptdPageRenderer page={page} size={snapshot.size} theme={theme} />
              </SlideCanvas>
            </div>
            {presenterNotesOpen && (
              <aside
                id="hd-presenter-notes"
                aria-label="演讲者备注"
                data-hd-presenter-notes={page.pageId}
                className="flex w-80 max-w-[40vw] shrink-0 flex-col border-l border-white/15 bg-zinc-950 px-5 py-5 text-zinc-100"
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="text-sm font-medium">演讲者备注</h2>
                  <span className="font-mono text-xs text-zinc-400" data-hd-presenter-code>
                    {page.shortCode ?? page.metadata.label ?? '未编号'} · {pageIndex + 1}
                  </span>
                </div>
                <div
                  className="min-h-0 flex-1 overflow-y-auto whitespace-pre-wrap break-words text-sm leading-relaxed text-zinc-200"
                  data-hd-presenter-note-text
                  aria-live="polite"
                >
                  {page.data.notes?.trim() ? page.data.notes : '这一页暂无演讲备注。'}
                </div>
                <div className="mt-5 shrink-0 border-t border-white/15 pt-4">
                  {nextPage ? (
                    <>
                      <div className="mb-2 flex items-center justify-between text-xs text-zinc-400">
                        <span>下一页</span>
                        <span className="font-mono">
                          {nextPage.metadata.label ?? nextPage.shortCode ?? '未编号'}
                        </span>
                      </div>
                      <div
                        data-hd-presenter-next={nextPage.pageId}
                        className="overflow-hidden rounded border border-white/15"
                        style={{ aspectRatio: `${snapshot.size[0]} / ${snapshot.size[1]}` }}
                      >
                        <SlideCanvas
                          width={snapshot.size[0]}
                          height={snapshot.size[1]}
                          flat
                          freezeMotion
                        >
                          <PptdPageRenderer page={nextPage} size={snapshot.size} theme={theme} />
                        </SlideCanvas>
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-zinc-400" data-hd-presenter-end>
                      已到最后一页
                    </p>
                  )}
                </div>
              </aside>
            )}
          </div>
          <div className="flex h-12 shrink-0 items-center justify-center gap-5 text-white">
            <button
              type="button"
              aria-label="演讲者备注"
              aria-pressed={presenterNotesOpen}
              aria-controls={presenterNotesOpen ? 'hd-presenter-notes' : undefined}
              data-hd-presenter-notes-toggle
              className="absolute left-6 flex items-center gap-2 rounded px-2 py-1 text-xs text-zinc-300 hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-white"
              onClick={() => setPresenterNotesOpen((open) => !open)}
            >
              <FileText className="size-4" />
              备注
            </button>
            <button
              type="button"
              aria-label="上一页"
              disabled={pageIndex <= 0}
              onClick={() => stepPage(-1)}
              className="disabled:opacity-30"
            >
              <ArrowLeft className="size-4" />
            </button>
            <span className="font-mono text-xs">
              {pageIndex + 1} / {viewPages.length} · {page.shortCode ?? page.metadata.label}
            </span>
            <button
              type="button"
              aria-label="下一页"
              disabled={pageIndex >= viewPages.length - 1}
              onClick={() => stepPage(1)}
              className="disabled:opacity-30"
            >
              <ArrowRight className="size-4" />
            </button>
            <button
              type="button"
              aria-label="退出演示"
              className="absolute right-6"
              onClick={() => setPresenting(false)}
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      )}
      {snapshot.diagnostics.some((item) => item.severity === 'error') && (
        <div
          className="shrink-0 border-t bg-background px-4 py-1.5 text-[10px] text-muted-foreground"
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
