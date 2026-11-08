import {
  emptyStory,
  type ProjectModel,
  readProjectModel,
  resolveProjectSections,
  validateProjectModel,
} from './project-model';
import { type DeckSnapshot, PptdError } from './types';

interface SlideInsertionBoundary {
  afterPageId: string | null;
  beforePageId: string | null;
}

function insertionBoundaryIndex(pages: DeckSnapshot['pages'], boundary: SlideInsertionBoundary) {
  const index =
    boundary.afterPageId === null
      ? 0
      : pages.findIndex((page) => page.pageId === boundary.afterPageId) + 1;
  if (boundary.afterPageId !== null && index === 0) return null;
  return (pages[index]?.pageId ?? null) === boundary.beforePageId ? index : null;
}

export function sectionAtBoundary(
  snapshot: Pick<DeckSnapshot, 'pages' | 'metadata'>,
  boundary: SlideInsertionBoundary,
  definition: { id: string; title: string; frontMatter?: boolean },
): ProjectModel {
  if (
    !definition ||
    typeof definition.id !== 'string' ||
    !definition.id ||
    typeof definition.title !== 'string' ||
    !definition.title.trim() ||
    (definition.frontMatter !== undefined && typeof definition.frontMatter !== 'boolean')
  )
    throw new PptdError(
      'INVALID_REQUEST',
      'A Section ID, name and optional front matter boolean are required.',
    );
  const index = insertionBoundaryIndex(snapshot.pages, boundary);
  if (index === null)
    throw new PptdError(
      'INVALID_REQUEST',
      'Slide order changed. Choose the insertion point again.',
    );
  const first = snapshot.pages[index];
  if (!first) throw new PptdError('INVALID_REQUEST', 'A Section needs an existing first Slide.');
  const project = readProjectModel(snapshot.metadata);
  const resolved = resolveProjectSections(snapshot, project);
  const issue = resolved.flatMap((item) => item.diagnostics)[0];
  if (issue) throw new PptdError('INVALID_REQUEST', issue.message);
  if (resolved.some((item) => item.pageIds[0] === first.pageId))
    throw new PptdError('INVALID_REQUEST', 'A Section already starts at this Slide.');
  if (definition.frontMatter && index !== 0)
    throw new PptdError(
      'INVALID_REQUEST',
      'Front matter (Section 00) must begin at the first Main Slide.',
    );
  const containing = resolved.find((item) => item.pageIds.includes(first.pageId));
  if (containing && !containing.contiguous)
    throw new PptdError(
      'INVALID_REQUEST',
      'This Slide has custom Section membership. Set a continuous range before splitting it.',
    );
  const next = {
    ...project,
    sections: [
      ...project.sections.map((section) => {
        if (section.id !== containing?.section.id || section.startPageId) return section;
        const offset = containing.pageIds.indexOf(first.pageId);
        const pageIds = containing.pageIds.slice(0, offset);
        return {
          ...section,
          pageIds,
          ...(section.range
            ? { range: { ...section.range, endPageId: pageIds[pageIds.length - 1] } }
            : {}),
        };
      }),
      {
        id: definition.id,
        title: definition.title.trim(),
        pageIds: [first.pageId],
        startPageId: first.pageId,
        ...(definition.frontMatter ? { frontMatter: true as const } : {}),
        story: emptyStory(),
      },
    ],
  };
  const validated = validateProjectModel(next);
  const invalid = resolveProjectSections(snapshot, validated).flatMap(
    (item) => item.diagnostics,
  )[0];
  if (invalid) throw new PptdError('INVALID_REQUEST', invalid.message);
  return validated;
}

export function sectionWithInsertedCover(
  before: Pick<DeckSnapshot, 'pages' | 'metadata'>,
  after: Pick<DeckSnapshot, 'pages' | 'metadata'>,
  pageId: string,
  definition: { id: string; title: string; frontMatter?: boolean },
): ProjectModel {
  const index = after.pages.findIndex((page) => page.pageId === pageId);
  if (index < 0) throw new PptdError('INVALID_REQUEST', 'The new Section cover is missing.');
  const following = after.pages[index + 1]?.pageId;
  const project = readProjectModel(after.metadata);
  const containing = resolveProjectSections(before).find(
    (item) => following && item.pageIds.includes(following),
  );
  const offset = containing && following ? containing.pageIds.indexOf(following) : 0;
  if (containing && offset > 0 && !containing.contiguous)
    throw new PptdError(
      'INVALID_REQUEST',
      'This Slide has custom Section membership. Set a continuous range before splitting it.',
    );
  const prepared =
    containing && offset > 0 && !containing.section.startPageId && !containing.section.range
      ? {
          ...project,
          sections: project.sections.map((section) =>
            section.id === containing.section.id
              ? { ...section, pageIds: containing.pageIds.slice(0, offset) }
              : section,
          ),
        }
      : project;
  return sectionAtBoundary(
    { pages: after.pages, metadata: { ...after.metadata, project: prepared } },
    { afterPageId: after.pages[index - 1]?.pageId ?? null, beforePageId: pageId },
    definition,
  );
}
