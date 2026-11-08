import { type DeckSnapshot, type Diagnostic, PptdError, type ProjectMetadata } from './types';

export interface StoryOutline {
  purpose: string;
  audience: string;
  takeaway: string;
}

export interface ProjectSection {
  id: string;
  title: string;
  pageIds: string[];
  range?: { startPageId: string; endPageId: string };
  story: StoryOutline;
}

export interface ResolvedProjectSection {
  section: ProjectSection;
  pageIds: string[];
  startPosition: number | null;
  endPosition: number | null;
  contiguous: boolean;
  diagnostics: Diagnostic[];
}

export type PresentationItem =
  | { id: string; kind: 'section'; sectionId: string }
  | { id: string; kind: 'page'; pageId: string; versionId?: string; notes?: string };

export interface ProjectPresentation {
  id: string;
  title: string;
  story: StoryOutline;
  items: PresentationItem[];
  notes?: string;
}

export interface ProjectModel {
  schemaVersion: 1;
  mainStory: StoryOutline;
  sections: ProjectSection[];
  presentations: ProjectPresentation[];
}

export interface ProjectReplaceOperation {
  op: 'project.replace';
  project: ProjectModel;
}

export interface ResolvedPresentationPage {
  occurrenceId: string;
  pageId: string;
  sectionId?: string;
  versionId?: string;
  notes?: string;
}

export interface ResolvedPresentation {
  presentationId: string | null;
  title: string;
  pages: ResolvedPresentationPage[];
  diagnostics: Diagnostic[];
}

export function emptyStory(): StoryOutline {
  return { purpose: '', audience: '', takeaway: '' };
}

function record(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new PptdError('INVALID_REQUEST', `${path} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function text(value: unknown, path: string, max: number, required = false): string {
  if (
    typeof value !== 'string' ||
    value.length > max ||
    value.includes('\0') ||
    (required && !value.trim())
  ) {
    throw new PptdError(
      'INVALID_REQUEST',
      `${path} must be ${required ? 'a nonempty' : 'a'} string of at most ${max} characters.`,
    );
  }
  return value;
}

function id(value: unknown, path: string): string {
  const result = text(value, path, 128, true);
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(result)) {
    throw new PptdError('INVALID_REQUEST', `${path} contains unsupported ID characters.`);
  }
  return result;
}

function list(value: unknown, path: string, max: number): unknown[] {
  if (!Array.isArray(value) || value.length > max) {
    throw new PptdError('INVALID_REQUEST', `${path} must be an array of at most ${max} items.`);
  }
  return value;
}

function story(value: unknown, path: string): StoryOutline {
  if (value === undefined) return emptyStory();
  const source = record(value, path);
  return {
    purpose: text(source.purpose ?? '', `${path}.purpose`, 20000),
    audience: text(source.audience ?? '', `${path}.audience`, 20000),
    takeaway: text(source.takeaway ?? '', `${path}.takeaway`, 20000),
  };
}

function unique(value: string, seen: Set<string>, path: string): string {
  if (seen.has(value)) throw new PptdError('INVALID_REQUEST', `${path} duplicates ID ${value}.`);
  seen.add(value);
  return value;
}

export function validateProjectModel(value: unknown): ProjectModel {
  const source = record(value, 'project');
  if (source.schemaVersion !== 1)
    throw new PptdError('INVALID_REQUEST', 'Unsupported project schemaVersion. Expected 1.');
  const sectionIds = new Set<string>();
  const assignedPages = new Set<string>();
  const sections = list(source.sections, 'project.sections', 2000).map(
    (value, index): ProjectSection => {
      const path = `project.sections[${index}]`;
      const section = record(value, path);
      const range =
        section.range === undefined ? undefined : record(section.range, `${path}.range`);
      const members = range ? new Set<string>() : assignedPages;
      return {
        id: unique(id(section.id, `${path}.id`), sectionIds, path),
        title: text(section.title, `${path}.title`, 240, true),
        story: story(section.story, `${path}.story`),
        pageIds: list(section.pageIds, `${path}.pageIds`, 20000).map((value, pageIndex) =>
          unique(id(value, `${path}.pageIds[${pageIndex}]`), members, 'Section page membership'),
        ),
        ...(range
          ? {
              range: {
                startPageId: id(range.startPageId, `${path}.range.startPageId`),
                endPageId: id(range.endPageId, `${path}.range.endPageId`),
              },
            }
          : {}),
      };
    },
  );
  const presentationIds = new Set<string>();
  const presentations = list(source.presentations, 'project.presentations', 2000).map(
    (value, index): ProjectPresentation => {
      const path = `project.presentations[${index}]`;
      const presentation = record(value, path);
      const itemIds = new Set<string>();
      return {
        id: unique(id(presentation.id, `${path}.id`), presentationIds, path),
        title: text(presentation.title, `${path}.title`, 240, true),
        story: story(presentation.story, `${path}.story`),
        ...(presentation.notes !== undefined
          ? { notes: text(presentation.notes, `${path}.notes`, 100000) }
          : {}),
        items: list(presentation.items, `${path}.items`, 20000).map(
          (value, itemIndex): PresentationItem => {
            const itemPath = `${path}.items[${itemIndex}]`;
            const item = record(value, itemPath);
            const itemId = unique(id(item.id, `${itemPath}.id`), itemIds, itemPath);
            if (item.kind === 'section')
              return {
                id: itemId,
                kind: 'section',
                sectionId: id(item.sectionId, `${itemPath}.sectionId`),
              };
            if (item.kind === 'page') {
              return {
                id: itemId,
                kind: 'page',
                pageId: id(item.pageId, `${itemPath}.pageId`),
                ...(item.versionId !== undefined
                  ? { versionId: id(item.versionId, `${itemPath}.versionId`) }
                  : {}),
                ...(item.notes !== undefined
                  ? { notes: text(item.notes, `${itemPath}.notes`, 100000) }
                  : {}),
              };
            }
            throw new PptdError('INVALID_REQUEST', `${itemPath}.kind must be section or page.`);
          },
        ),
      };
    },
  );
  return {
    schemaVersion: 1,
    mainStory: story(source.mainStory, 'project.mainStory'),
    sections,
    presentations,
  };
}

export function readProjectModel(metadata: ProjectMetadata): ProjectModel {
  if (metadata.project === undefined)
    return { schemaVersion: 1, mainStory: emptyStory(), sections: [], presentations: [] };
  try {
    return validateProjectModel(metadata.project);
  } catch (error) {
    throw new PptdError(
      'INVALID_DOCUMENT',
      error instanceof Error ? error.message : 'Invalid project organization.',
    );
  }
}

function referencedPages(project: ProjectModel): Set<string> {
  return new Set([
    ...project.sections.flatMap((section) =>
      section.range ? [section.range.startPageId, section.range.endPageId] : section.pageIds,
    ),
    ...project.presentations.flatMap((presentation) =>
      presentation.items.flatMap((item) => (item.kind === 'page' ? [item.pageId] : [])),
    ),
  ]);
}

export function applyProjectOperation(
  metadata: ProjectMetadata,
  operation: ProjectReplaceOperation,
  snapshot?: DeckSnapshot,
): ProjectMetadata {
  const project = validateProjectModel(operation.project);
  const previous = readProjectModel(metadata);
  const previousPages = referencedPages(previous);
  const previousSections = new Set([
    ...previous.sections.map((section) => section.id),
    ...previous.presentations.flatMap((presentation) =>
      presentation.items.flatMap((item) => (item.kind === 'section' ? [item.sectionId] : [])),
    ),
  ]);
  const sectionIds = new Set(project.sections.map((section) => section.id));
  const activePages = snapshot
    ? new Set(snapshot.pages.filter((page) => page.state === 'active').map((page) => page.pageId))
    : undefined;
  for (const pageId of referencedPages(project)) {
    if (
      !(activePages ? activePages.has(pageId) : metadata.slides[pageId]?.state === 'active') &&
      !previousPages.has(pageId)
    ) {
      throw new PptdError(
        'TARGET_NOT_FOUND',
        `Main Slide ${pageId} is unavailable. Restore it before adding it to a section or presentation.`,
        { pageId },
      );
    }
  }
  for (const presentation of project.presentations) {
    for (const item of presentation.items) {
      if (
        item.kind === 'section' &&
        !sectionIds.has(item.sectionId) &&
        !previousSections.has(item.sectionId)
      ) {
        throw new PptdError(
          'TARGET_NOT_FOUND',
          `Section ${item.sectionId} does not exist. Choose a section from Main Slides.`,
          { sectionId: item.sectionId },
        );
      }
    }
  }
  if (snapshot) {
    const previousErrors = new Set(
      resolveProjectSections(snapshot, previous).flatMap((resolved) =>
        resolved.diagnostics.map(
          (diagnostic) => `${resolved.section.id}:${diagnostic.code}:${diagnostic.pageId ?? ''}`,
        ),
      ),
    );
    const resolved = resolveProjectSections(snapshot, project);
    for (const item of resolved) {
      const previousSection = previous.sections.find((section) => section.id === item.section.id);
      const sameDefinition =
        previousSection &&
        JSON.stringify(previousSection.range ?? previousSection.pageIds) ===
          JSON.stringify(item.section.range ?? item.section.pageIds);
      const error = item.diagnostics.find(
        (diagnostic) =>
          !sameDefinition ||
          !previousErrors.has(`${item.section.id}:${diagnostic.code}:${diagnostic.pageId ?? ''}`),
      );
      if (error) throw new PptdError('INVALID_REQUEST', error.message, { diagnostics: [error] });
      if (item.section.range && !item.diagnostics.length) item.section.pageIds = item.pageIds;
    }
  }
  return { ...metadata, project };
}

export function resolveProjectSections(
  snapshot: Pick<DeckSnapshot, 'pages' | 'metadata'>,
  project = readProjectModel(snapshot.metadata),
): ResolvedProjectSection[] {
  const mainIds = snapshot.pages
    .filter((page) => page.state === 'active')
    .map((page) => page.pageId);
  const positions = new Map(mainIds.map((pageId, index) => [pageId, index]));
  const resolved = project.sections.map((section): ResolvedProjectSection => {
    let pageIds = [...section.pageIds];
    const diagnostics: Diagnostic[] = [];
    if (section.range) {
      const start = positions.get(section.range.startPageId);
      const end = positions.get(section.range.endPageId);
      if (start === undefined || end === undefined) {
        diagnostics.push({
          code: 'SECTION_RANGE_BOUNDARY_UNAVAILABLE',
          severity: 'error',
          pageId: start === undefined ? section.range.startPageId : section.range.endPageId,
          message: `Section ${section.title} has an unavailable range boundary. Restore that Main Slide or choose a new range.`,
        });
      } else if (start > end) {
        diagnostics.push({
          code: 'SECTION_RANGE_REVERSED',
          severity: 'error',
          message: `Section ${section.title} has its start after its end in Main Slides. Choose a new range.`,
        });
      } else pageIds = mainIds.slice(start, end + 1);
    }
    const indices = pageIds.map((pageId) => positions.get(pageId));
    const first = indices[0];
    const contiguous =
      !diagnostics.length &&
      (indices.length === 0 ||
        (first !== undefined && indices.every((position, index) => position === first + index)));
    return {
      section,
      pageIds,
      startPosition: first === undefined ? null : first + 1,
      endPosition: indices.at(-1) === undefined ? null : (indices.at(-1) as number) + 1,
      contiguous,
      diagnostics,
    };
  });
  const owners = new Map<string, ResolvedProjectSection[]>();
  const overlaps = new Set<string>();
  for (const item of resolved) {
    if (item.diagnostics.length) continue;
    for (const pageId of item.pageIds) {
      const existing = owners.get(pageId) ?? [];
      for (const other of existing) {
        const pair = JSON.stringify([item.section.id, other.section.id].sort());
        if (overlaps.has(pair)) continue;
        overlaps.add(pair);
        const diagnostic: Diagnostic = {
          code: 'SECTION_RANGE_OVERLAP',
          severity: 'error',
          pageId,
          message: `Sections ${other.section.title} and ${item.section.title} overlap in Main Slides. Adjust their ranges so each slide belongs to one Section.`,
        };
        item.diagnostics.push(diagnostic);
        other.diagnostics.push(diagnostic);
      }
      owners.set(pageId, [...existing, item]);
    }
  }
  return resolved;
}

export function resolvePresentation(
  snapshot: DeckSnapshot,
  presentationId: string | null = null,
): ResolvedPresentation {
  const project = readProjectModel(snapshot.metadata);
  if (presentationId === null) {
    return {
      presentationId: null,
      title: snapshot.title,
      pages: snapshot.pages
        .filter((page) => page.state === 'active')
        .map((page) => ({ occurrenceId: `main:${page.pageId}`, pageId: page.pageId })),
      diagnostics: [],
    };
  }
  const presentation = project.presentations.find((candidate) => candidate.id === presentationId);
  if (!presentation)
    throw new PptdError(
      'TARGET_NOT_FOUND',
      `Presentation ${presentationId} does not exist. Select Main Slides or another presentation.`,
    );
  const pages: ResolvedPresentationPage[] = [];
  const diagnostics: Diagnostic[] = [];
  const sections = new Map(
    resolveProjectSections(snapshot, project).map((resolved) => [resolved.section.id, resolved]),
  );
  const missingSections = new Set<string>();
  const activePages = new Set(
    snapshot.pages.filter((page) => page.state === 'active').map((page) => page.pageId),
  );
  const append = (
    pageId: string,
    itemId: string,
    sectionId?: string,
    versionId?: string,
    notes?: string,
  ) => {
    const occurrenceId = `${presentationId}:${itemId}:${pageId}`;
    pages.push({
      occurrenceId,
      pageId,
      ...(sectionId ? { sectionId } : {}),
      ...(versionId ? { versionId } : {}),
      ...(notes !== undefined ? { notes } : {}),
    });
    if (
      !activePages.has(pageId) &&
      !diagnostics.some(
        (diagnostic) =>
          diagnostic.code === 'PRESENTATION_PAGE_UNAVAILABLE' && diagnostic.pageId === pageId,
      )
    ) {
      diagnostics.push({
        code: 'PRESENTATION_PAGE_UNAVAILABLE',
        severity: 'error',
        pageId,
        message: `${presentation.title} refers to unavailable Main Slide ${snapshot.metadata.slides[pageId]?.label ?? snapshot.metadata.slides[pageId]?.shortCode ?? pageId}. Restore the slide or remove its reference.`,
      });
    }
  };
  for (const item of presentation.items) {
    if (item.kind === 'page') {
      append(item.pageId, item.id, undefined, item.versionId, item.notes);
    } else {
      const section = sections.get(item.sectionId);
      if (!section && !missingSections.has(item.sectionId)) {
        missingSections.add(item.sectionId);
        diagnostics.push({
          code: 'PRESENTATION_SECTION_UNAVAILABLE',
          severity: 'error',
          message: `${presentation.title} refers to missing section ${item.sectionId}. Restore the section or remove its reference.`,
        });
      } else if (section) {
        for (const diagnostic of section.diagnostics)
          if (!diagnostics.includes(diagnostic)) diagnostics.push(diagnostic);
        for (const pageId of section.pageIds) append(pageId, item.id, section.section.id);
      }
    }
  }
  if (pages.length === 0)
    diagnostics.push({
      code: 'PRESENTATION_EMPTY',
      severity: 'error',
      message: `${presentation.title} has no slides. Add a section or Main Slide before presenting or exporting.`,
    });
  return { presentationId, title: presentation.title, pages, diagnostics };
}

export function assertPresentationReady(
  snapshot: DeckSnapshot,
  presentationId: string | null = null,
): ResolvedPresentation {
  const resolved = resolvePresentation(snapshot, presentationId);
  const errors = resolved.diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
  if (errors.length)
    throw new PptdError('INVALID_DOCUMENT', errors.map((error) => error.message).join('\n'), {
      diagnostics: errors,
    });
  return resolved;
}
