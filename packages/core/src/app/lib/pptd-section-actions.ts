import {
  emptyStory,
  type ProjectModel,
  readProjectModel,
  resolveProjectSections,
  validateProjectModel,
} from '../../pptd/project-model';
import type { DeckSnapshot } from '../../pptd/types';
import { insertionBoundaryIndex, type SlideInsertionBoundary } from './pptd-thumbnail-sections';

export function sectionAtBoundary(
  snapshot: Pick<DeckSnapshot, 'pages' | 'metadata'>,
  boundary: SlideInsertionBoundary,
  definition: { id: string; title: string; frontMatter?: boolean },
): ProjectModel {
  const index = insertionBoundaryIndex(snapshot.pages, boundary);
  if (index === null) throw new Error('Slide order changed. Choose the insertion point again.');
  const first = snapshot.pages[index];
  if (!first) throw new Error('A Section needs an existing first Slide.');
  const project = readProjectModel(snapshot.metadata);
  const resolved = resolveProjectSections(snapshot, project);
  const issue = resolved.flatMap((item) => item.diagnostics)[0];
  if (issue) throw new Error(issue.message);
  if (resolved.some((item) => item.pageIds[0] === first.pageId))
    throw new Error('A Section already starts at this Slide.');
  if (definition.frontMatter && index !== 0)
    throw new Error('Front matter (Section 00) must begin at the first Main Slide.');
  const containing = resolved.find((item) => item.pageIds.includes(first.pageId));
  if (containing && !containing.contiguous)
    throw new Error(
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
  if (invalid) throw new Error(invalid.message);
  return validated;
}
