import { readPinnedPresentationPage } from './presentation-snapshot';
import {
  type ResolvedPresentation,
  readProjectModel,
  resolvePresentation,
  type StoryOutline,
} from './project-model';
import {
  type DeckSnapshot,
  type Diagnostic,
  type PageSnapshot,
  type PageVersionSnapshot,
  PptdError,
  type Revision,
  type SlideIdentity,
} from './types';

export interface PageOccurrence {
  pageId: string;
  label: string;
  legacyLabel?: string;
  shortCode: string | null;
  path: string;
  presentationId: string | null;
  presentationTitle: string;
  occurrenceId: string;
  position: number;
  available: boolean;
  sectionId?: string;
  versionId?: string;
  notes?: string;
}

export interface PresentationSummary {
  id: string;
  title: string;
  story: StoryOutline;
  pageCount: number;
  uniquePageCount: number;
  pinnedPageCount: number;
  occurrences: PageOccurrence[];
  diagnostics: Diagnostic[];
}

export interface ProjectInsights {
  deckId: string;
  title: string;
  mainPageCount: number;
  sectionCount: number;
  mainStory: StoryOutline;
  presentations: PresentationSummary[];
  usageByPage: Record<string, PageOccurrence[]>;
}

export function pageLabel(page: Pick<PageSnapshot, 'pageId' | 'shortCode' | 'metadata'>): string {
  return page.shortCode ?? page.metadata.label ?? page.pageId;
}

function occurrences(
  snapshot: DeckSnapshot,
  presentationId: string | null,
  resolved: ResolvedPresentation = resolvePresentation(snapshot, presentationId),
): PageOccurrence[] {
  const pages = new Map(snapshot.pages.map((page) => [page.pageId, page]));
  return resolved.pages.map((reference, index) => {
    const page = pages.get(reference.pageId);
    const metadata = page?.metadata ?? snapshot.metadata.slides[reference.pageId];
    return {
      ...reference,
      label: metadata?.shortCode ?? metadata?.label ?? reference.pageId,
      ...(metadata?.label ? { legacyLabel: metadata.label } : {}),
      shortCode: metadata?.shortCode ?? null,
      path: metadata?.path ?? '',
      presentationId,
      presentationTitle: resolved.title,
      position: index + 1,
      available: page?.state === 'active',
    };
  });
}

export function projectInsights(snapshot: DeckSnapshot): ProjectInsights {
  const project = readProjectModel(snapshot.metadata);
  const usageByPage: Record<string, PageOccurrence[]> = Object.create(null);
  for (const occurrence of occurrences(snapshot, null)) {
    usageByPage[occurrence.pageId] = [occurrence];
  }
  const presentations = project.presentations.map((presentation): PresentationSummary => {
    const resolved = resolvePresentation(snapshot, presentation.id);
    const pages = occurrences(snapshot, presentation.id, resolved);
    for (const occurrence of pages) {
      usageByPage[occurrence.pageId] ??= [];
      usageByPage[occurrence.pageId].push(occurrence);
    }
    return {
      id: presentation.id,
      title: presentation.title,
      story: structuredClone(presentation.story),
      pageCount: pages.length,
      uniquePageCount: new Set(pages.map((page) => page.pageId)).size,
      pinnedPageCount: pages.filter((page) => page.versionId).length,
      occurrences: pages,
      diagnostics: resolved.diagnostics,
    };
  });
  return {
    deckId: snapshot.deckId,
    title: snapshot.title,
    mainPageCount: snapshot.pages.filter((page) => page.state === 'active').length,
    sectionCount: project.sections.length,
    mainStory: structuredClone(project.mainStory),
    presentations,
    usageByPage,
  };
}

export interface StoryBriefingOptions {
  pageId?: string;
  presentationId?: string | null;
  occurrenceId?: string;
}

export interface StoryBriefing {
  deckId: string;
  title: string;
  designPolicy: string | null;
  scope: 'project' | 'presentation' | 'page';
  main: { title: string; story: StoryOutline };
  organization: {
    sections: { id: string; title: string; story: StoryOutline; pageIds: string[] }[];
    presentations: Omit<PresentationSummary, 'occurrences' | 'diagnostics'>[];
  };
  section: { id: string; title: string; story: StoryOutline } | null;
  presentation: { id: string; title: string; story: StoryOutline; notes: string } | null;
  page: {
    pageId: string;
    label: string;
    shortCode: string | null;
    path: string;
    source: 'current-main' | 'pinned-version';
    versionId?: string;
    writable: boolean;
    pageRevision: Revision;
    renderRevision: Revision;
    story: NonNullable<SlideIdentity['designIntent']>;
    elementRoles: Record<string, string>;
    notes: string;
    assets: Record<string, Revision | null>;
  } | null;
  occurrence: PageOccurrence | null;
  neighbors: { previous: PageOccurrence | null; next: PageOccurrence | null };
  usedBy: PageOccurrence[];
  sequence: { total: number; entries: PageOccurrence[]; truncated: boolean };
  revisions: {
    manifest: Revision;
    metadata: Revision | null;
    currentMainPage: Revision | null;
  };
  diagnostics: Diagnostic[];
}

function resolvePage(snapshot: DeckSnapshot, target: string): PageSnapshot {
  const exact = snapshot.pages.find((page) => page.pageId === target && page.state === 'active');
  if (exact) return exact;
  const key = target.toUpperCase();
  const matches = snapshot.pages.filter(
    (page) =>
      page.state === 'active' &&
      (page.shortCode?.toUpperCase() === key || page.metadata.label?.toUpperCase() === key),
  );
  if (matches.length > 1)
    throw new PptdError(
      'AMBIGUOUS_ID',
      'This page label identifies more than one page. Use its UUID.',
    );
  if (!matches[0]) throw new PptdError('TARGET_NOT_FOUND', `Main Slide ${target} is unavailable.`);
  return matches[0];
}

function briefingTarget(snapshot: DeckSnapshot, options: StoryBriefingOptions) {
  for (const [key, value] of Object.entries(options)) {
    if (
      value !== null &&
      value !== undefined &&
      (typeof value !== 'string' || !value || value.length > 512)
    )
      throw new PptdError(
        'INVALID_REQUEST',
        `${key} must be a nonempty string of at most 512 characters.`,
      );
  }
  const project = readProjectModel(snapshot.metadata);
  const presentationId = options.presentationId ?? null;
  const resolved = resolvePresentation(snapshot, presentationId);
  const sequence = occurrences(snapshot, presentationId, resolved);
  let currentPage = options.pageId ? resolvePage(snapshot, options.pageId) : undefined;
  let occurrence: PageOccurrence | undefined;
  if (options.occurrenceId) {
    occurrence = sequence.find((entry) => entry.occurrenceId === options.occurrenceId);
    if (!occurrence || (currentPage && occurrence.pageId !== currentPage.pageId))
      throw new PptdError(
        'TARGET_NOT_FOUND',
        'The occurrence does not belong to the requested page and presentation.',
      );
    currentPage = resolvePage(snapshot, occurrence.pageId);
  } else if (currentPage) {
    const selectedPageId = currentPage.pageId;
    const candidates = sequence.filter((entry) => entry.pageId === selectedPageId);
    if (candidates.length > 1)
      throw new PptdError(
        'AMBIGUOUS_ID',
        'This page appears more than once. Supply occurrenceId to read its position, notes and pinned version.',
        { occurrences: candidates },
      );
    if (!candidates[0])
      throw new PptdError(
        'TARGET_NOT_FOUND',
        'This page is not part of the requested presentation.',
      );
    occurrence = candidates[0];
  }
  return { project, presentationId, resolved, sequence, currentPage, occurrence };
}

export async function readStoryBriefing(
  snapshot: DeckSnapshot,
  options: StoryBriefingOptions,
  readVersion: (pageId: string, versionId: string) => Promise<PageVersionSnapshot>,
): Promise<StoryBriefing> {
  const { presentationId, occurrence } = briefingTarget(snapshot, options);
  if (!occurrence?.versionId) return storyBriefing(snapshot, options);
  const archived = await readPinnedPresentationPage(
    snapshot,
    {
      pageId: occurrence.pageId,
      versionId: occurrence.versionId,
    },
    readVersion,
  );
  const view: DeckSnapshot = {
    ...snapshot,
    ...(presentationId ? { presentationId } : {}),
    pages: [
      { ...archived, occurrenceId: occurrence.occurrenceId, versionId: occurrence.versionId },
    ],
  };
  return storyBriefing(snapshot, options, view);
}

export function storyBriefing(
  snapshot: DeckSnapshot,
  options: StoryBriefingOptions = {},
  resolvedView?: DeckSnapshot,
): StoryBriefing {
  const { project, presentationId, resolved, sequence, currentPage, occurrence } = briefingTarget(
    snapshot,
    options,
  );
  let page = currentPage;
  if (occurrence?.versionId) {
    page = resolvedView?.pages.find(
      (candidate) => candidate.occurrenceId === occurrence.occurrenceId,
    );
    if (
      !page ||
      resolvedView?.deckId !== snapshot.deckId ||
      resolvedView.presentationId !== presentationId ||
      resolvedView.metadataRevision !== snapshot.metadataRevision ||
      resolvedView.manifestRevision !== snapshot.manifestRevision ||
      page.pageId !== occurrence.pageId ||
      page.versionId !== occurrence.versionId
    )
      throw new PptdError(
        'INVALID_REQUEST',
        'Read this pinned occurrence through presentationSnapshot before building its Story briefing.',
      );
  }
  const section = page
    ? project.sections.find((entry) => entry.pageIds.includes(page.pageId))
    : undefined;
  const presentation = project.presentations.find((entry) => entry.id === presentationId);
  const position = occurrence
    ? sequence.findIndex((entry) => entry.occurrenceId === occurrence.occurrenceId)
    : -1;
  const insights = projectInsights(snapshot);
  return structuredClone({
    deckId: snapshot.deckId,
    title: snapshot.title,
    designPolicy: snapshot.metadata.designPolicy ?? null,
    scope: page ? 'page' : presentation ? 'presentation' : 'project',
    main: { title: snapshot.title, story: project.mainStory },
    organization: {
      sections: project.sections,
      presentations: insights.presentations.map(
        ({ occurrences: _occurrences, diagnostics: _diagnostics, ...summary }) => summary,
      ),
    },
    section: section ? { id: section.id, title: section.title, story: section.story } : null,
    presentation: presentation
      ? {
          id: presentation.id,
          title: presentation.title,
          story: presentation.story,
          notes: presentation.notes ?? '',
        }
      : null,
    page: page
      ? {
          pageId: page.pageId,
          label: pageLabel(page),
          shortCode: page.shortCode,
          path: page.path,
          source: occurrence?.versionId ? 'pinned-version' : 'current-main',
          ...(occurrence?.versionId ? { versionId: occurrence.versionId } : {}),
          writable: snapshot.writable && !occurrence?.versionId,
          pageRevision: page.pageRevision,
          renderRevision: page.renderRevision,
          story: page.metadata.designIntent ?? {},
          elementRoles: page.metadata.elementRoles ?? {},
          notes: occurrence?.notes ?? page.data.notes ?? '',
          assets: page.assetRevisions ?? {},
        }
      : null,
    occurrence: occurrence ?? null,
    neighbors: {
      previous: position > 0 ? sequence[position - 1] : null,
      next: position >= 0 ? (sequence[position + 1] ?? null) : null,
    },
    usedBy: page ? (insights.usageByPage[page.pageId] ?? []) : [],
    sequence: {
      total: sequence.length,
      entries: sequence.slice(0, 500),
      truncated: sequence.length > 500,
    },
    revisions: {
      manifest: snapshot.manifestRevision,
      metadata: snapshot.metadataRevision,
      currentMainPage: currentPage?.pageRevision ?? null,
    },
    diagnostics: [
      ...snapshot.diagnostics.filter(
        (diagnostic) => !page || !diagnostic.pageId || diagnostic.pageId === page.pageId,
      ),
      ...resolved.diagnostics,
    ],
  } satisfies StoryBriefing);
}
