import type { PageSnapshot } from '../../pptd/types';
import type { EditorKeyboardCommand } from './pptd-keyboard';
import { projectSlideSearch, projectSlideTitle } from './pptd-project-source';
import {
  type SlideInsertionBoundary,
  slideInsertionBoundary,
  type ThumbnailSection,
  thumbnailSectionGroups,
} from './pptd-thumbnail-sections';

export type WorkspaceView = 'edit' | 'browse' | 'notes';

interface WorkspaceBrowserGroup {
  key: string;
  sectionId?: string;
  title?: string;
  count: number;
  entries: { page: PageSnapshot; index: number; key: string; title: string }[];
}

export function workspacePageKey(page: PageSnapshot): string {
  return page.occurrenceId ?? page.pageId;
}

export function workspacePageSelected(
  page: PageSnapshot,
  pageId: string | null,
  occurrenceId?: string,
): boolean {
  return occurrenceId
    ? page.occurrenceId === occurrenceId
    : !page.occurrenceId && page.pageId === pageId;
}

export function workspaceBrowserGroups(
  pages: PageSnapshot[],
  sections: ThumbnailSection[],
  query: string,
  presentation = false,
  untitled = 'Untitled slide',
) {
  const sectionsAt = new Map(
    (presentation ? [] : thumbnailSectionGroups(pages, sections)).map((section) => [
      section.firstIndex,
      section,
    ]),
  );
  const groups: WorkspaceBrowserGroup[] = [];
  for (let index = 0; index < pages.length; index++) {
    const section = sectionsAt.get(index);
    if (section || !groups.length || groups.at(-1)?.sectionId) {
      groups.push({
        key: section ? `section:${section.key}` : `unassigned:${index}`,
        sectionId: section?.key,
        title: section?.title,
        count: 0,
        entries: [],
      });
    }
    const group = groups[groups.length - 1];
    const end = section?.lastIndex ?? index;
    for (; index <= end; index++) {
      const page = pages[index];
      group.entries.push({
        page,
        index,
        key: workspacePageKey(page),
        title: projectSlideTitle(page, untitled),
      });
      group.count++;
    }
    index--;
  }
  return filterWorkspaceBrowserGroups(groups, query);
}

export function filterWorkspaceBrowserGroups(groups: WorkspaceBrowserGroup[], query: string) {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return groups;
  return groups.flatMap((group) => {
    const sectionMatch = group.title?.toLocaleLowerCase().includes(needle);
    const entries =
      !needle || sectionMatch
        ? group.entries
        : group.entries.filter(({ page, index }) =>
            `${index + 1} ${projectSlideSearch(page)}`.includes(needle),
          );
    return entries.length ? [{ ...group, entries }] : [];
  });
}

export function workspaceMoveBoundaries(pages: PageSnapshot[]) {
  return new Map(
    pages.map((page, index) => [
      workspacePageKey(page),
      {
        up: index > 0 ? slideInsertionBoundary(pages, index - 1) : null,
        down: index + 1 < pages.length ? slideInsertionBoundary(pages, index + 2) : null,
      },
    ]),
  );
}

export function workspaceMoveBoundary(
  pages: PageSnapshot[],
  key: string,
  direction: -1 | 1,
  query: string,
  collapsed: ReadonlySet<string>,
  presentation: boolean,
): SlideInsertionBoundary | null {
  if (presentation || query.trim() || collapsed.size) return null;
  const index = pages.findIndex((page) => workspacePageKey(page) === key);
  if (index < 0 || index + direction < 0 || index + direction >= pages.length) return null;
  return slideInsertionBoundary(pages, index + (direction < 0 ? -1 : 2));
}

export function workspaceViewSwitchBlocked(auxiliaryDirty: boolean, composing: boolean): boolean {
  return auxiliaryDirty || composing;
}

export function workspaceKeyboardCommandAllowed(
  view: WorkspaceView,
  command: EditorKeyboardCommand,
): boolean {
  return (
    view === 'edit' ||
    [
      'help',
      'focus-region',
      'save',
      'cancel',
      'present',
      'page-step',
      'page-boundary',
      'presentation-blackout',
      'presentation-fullscreen',
      'undo',
      'redo',
    ].includes(command.type)
  );
}
