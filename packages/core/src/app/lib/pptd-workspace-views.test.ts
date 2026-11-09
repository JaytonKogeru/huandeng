import { describe, expect, it } from 'vitest';
import type { PageSnapshot } from '../../pptd/types';
import { resolveEditorKeyboardCommand } from './pptd-keyboard';
import { projectSlideSearch, projectSlideTitle } from './pptd-project-source';
import { slideMoveAfterBoundary } from './pptd-thumbnail-sections';
import {
  workspaceBrowserGroups,
  workspaceKeyboardCommandAllowed,
  workspaceMoveBoundary,
  workspacePageKey,
  workspacePageSelected,
  workspaceViewSwitchBlocked,
} from './pptd-workspace-views';

function slides(ids = ['intro', 'a', 'b', 'tail']): PageSnapshot[] {
  return ids.map((pageId, index) => ({
    pageId,
    shortCode: pageId.toUpperCase(),
    path: `${pageId}.page`,
    state: 'active',
    mainPosition: index + 1,
    pageRevision: 'sha256:p',
    renderRevision: 'sha256:r',
    data: { title: pageId, elements: [] },
    metadata: { path: `${pageId}.page`, state: 'active', shortCode: pageId.toUpperCase() },
  }));
}

const sections = [{ id: 'topic', title: 'Authored section 章节', pageIds: ['a', 'b'] }];

describe('Slides workspace grouping and identity', () => {
  it('keeps Main order and explicit unassigned runs without assuming a divider', () => {
    const pages = slides();
    const before = structuredClone(pages);
    const groups = workspaceBrowserGroups(pages, sections, '');
    expect(groups.map((group) => [group.title, group.count])).toEqual([
      [undefined, 1],
      ['Authored section 章节', 2],
      [undefined, 1],
    ]);
    expect(groups.flatMap((group) => group.entries.map((entry) => entry.index))).toEqual([
      0, 1, 2, 3,
    ]);
    expect(
      workspaceBrowserGroups(pages, [{ ...sections[0], pageIds: ['a', 'tail'] }], ''),
    ).toHaveLength(1);
    expect(pages).toEqual(before);
  });

  it('handles empty, no-result, full long title, Story, ID and section queries', () => {
    const pages = slides();
    pages[1].data.title = `${'Long authored title '.repeat(20)}end-marker`;
    pages[2].metadata.designIntent = { purpose: 'Story-only rationale', keep: ['Original figure'] };
    expect(workspaceBrowserGroups([], sections, '')).toEqual([]);
    expect(workspaceBrowserGroups(pages, sections, 'absent')).toEqual([]);
    expect(workspaceBrowserGroups(pages, sections, 'END-MARKER')[0].entries[0].page.pageId).toBe(
      'a',
    );
    expect(workspaceBrowserGroups(pages, sections, 'story-only')[0].entries[0].page.pageId).toBe(
      'b',
    );
    expect(workspaceBrowserGroups(pages, sections, 'TAIL')[0].entries[0].page.pageId).toBe('tail');
    expect(workspaceBrowserGroups(pages, sections, '章节')[0].entries).toHaveLength(2);
    expect(projectSlideTitle(pages[1])).toBe(pages[1].data.title);
  });

  it('preserves repeated and pinned presentation occurrence order, identity and source Position', () => {
    const original = slides(['a'])[0];
    const pages = [
      { ...original, occurrenceId: 'live-1', mainPosition: 7 },
      { ...original, occurrenceId: 'pinned', versionId: 'version-4', mainPosition: 3 },
      { ...original, occurrenceId: 'live-2', mainPosition: 7 },
    ];
    const entries = workspaceBrowserGroups(pages, sections, '', true)[0].entries;
    expect(entries.map((entry) => entry.key)).toEqual(['live-1', 'pinned', 'live-2']);
    expect(entries[1].page).toBe(pages[1]);
    expect(entries.map((entry) => entry.page.mainPosition)).toEqual([7, 3, 7]);
    expect(workspacePageSelected(pages[0], 'a', 'live-2')).toBe(false);
    expect(workspacePageSelected(pages[2], 'a', 'live-2')).toBe(true);
    expect(workspacePageSelected(original, 'a')).toBe(true);
    expect(workspacePageSelected(pages[0], 'a')).toBe(false);
    expect(workspacePageKey(pages[1])).toBe('pinned');
  });

  it('uses exact full-order moves and blocks filtering, collapse, presentation and end boundaries', () => {
    const pages = slides();
    const boundary = workspaceMoveBoundary(pages, 'b', -1, '', new Set(), false);
    expect(boundary).toEqual({ afterPageId: 'intro', beforePageId: 'a' });
    if (!boundary) throw new Error('Expected an exact movement boundary.');
    expect(slideMoveAfterBoundary(pages, 'b', boundary)).toEqual({ afterPageId: 'intro' });
    expect(workspaceMoveBoundary(pages, 'a', 1, '', new Set(), false)).toEqual({
      afterPageId: 'b',
      beforePageId: 'tail',
    });
    expect(workspaceMoveBoundary(pages, 'a', 1, 'topic', new Set(), false)).toBeNull();
    expect(workspaceMoveBoundary(pages, 'a', 1, '', new Set(['topic']), false)).toBeNull();
    expect(workspaceMoveBoundary(pages, 'a', 1, '', new Set(), true)).toBeNull();
    expect(workspaceMoveBoundary(pages, 'intro', -1, '', new Set(), false)).toBeNull();
    expect(workspaceMoveBoundary(pages, 'tail', 1, '', new Set(), false)).toBeNull();
    expect(workspaceMoveBoundary(pages, 'missing', 1, '', new Set(), false)).toBeNull();
  });

  it('keeps composing input and auxiliary drafts mounted until safe to switch', () => {
    expect(workspaceViewSwitchBlocked(true, false)).toBe(true);
    expect(workspaceViewSwitchBlocked(false, true)).toBe(true);
    expect(workspaceViewSwitchBlocked(false, false)).toBe(false);
  });

  it('blocks invisible-canvas selection, deletion and insertion commands in Browse and Notes', () => {
    for (const [key, ctrlKey] of [
      ['Delete', false],
      ['Backspace', false],
      ['a', true],
      ['m', true],
      ['t', false],
    ] as const) {
      const command = resolveEditorKeyboardCommand(
        { key, ctrlKey, metaKey: false, altKey: false, shiftKey: false },
        'canvas',
      );
      if (!command) throw new Error(`Expected an object command for ${key}.`);
      expect(workspaceKeyboardCommandAllowed('edit', command)).toBe(true);
      expect(workspaceKeyboardCommandAllowed('browse', command)).toBe(false);
      expect(workspaceKeyboardCommandAllowed('notes', command)).toBe(false);
    }
    expect(workspaceKeyboardCommandAllowed('notes', { type: 'save' })).toBe(true);
    expect(workspaceKeyboardCommandAllowed('browse', { type: 'page-step', direction: 1 })).toBe(
      true,
    );
  });

  it('leaves native textarea selection, deletion and typing shortcuts in the input', () => {
    for (const [key, ctrlKey] of [
      ['Delete', false],
      ['Backspace', false],
      ['a', true],
      ['t', false],
    ] as const) {
      expect(
        resolveEditorKeyboardCommand(
          { key, ctrlKey, metaKey: false, altKey: false, shiftKey: false },
          'input',
        ),
      ).toBeNull();
    }
  });
});

describe('authored title and Story discovery', () => {
  it('retains a prominent authored numeric heading above body text in titles and search', () => {
    const page = slides(['numeric'])[0];
    delete page.data.title;
    page.data.elements = [
      {
        elementId: 'generic-1',
        elementType: 'text',
        bounds: [30, 24, 800, 60],
        content: { text: '2026', fontSize: 36 },
      },
      {
        elementId: 'generic-2',
        elementType: 'text',
        bounds: [30, 123, 800, 320],
        content: { text: 'Annual review', fontSize: 18 },
      },
    ];
    expect(projectSlideTitle(page)).toBe('2026');
    expect(projectSlideSearch(page)).toContain('2026');
  });

  it('retains a numeric-only authored heading instead of the untitled fallback', () => {
    const page = slides(['numeric-only'])[0];
    delete page.data.title;
    page.data.elements = [
      {
        elementId: 'generic-1',
        elementType: 'text',
        bounds: [30, 24, 800, 60],
        content: { text: '2026', fontSize: 36 },
      },
    ];
    expect(projectSlideTitle(page)).toBe('2026');
    expect(projectSlideSearch(page)).toContain('2026');
  });

  it('chooses the prominent upper imported heading after a numeric footer and citation', () => {
    const page = slides(['imported'])[0];
    delete page.data.title;
    page.data.elements = [
      {
        elementId: 'generic-1',
        elementType: 'text',
        bounds: [900, 513, 30, 12],
        content: { text: '3', field: 'main-position', fontSize: 10 },
      },
      {
        elementId: 'generic-2',
        elementType: 'text',
        bounds: [10, 513, 500, 12],
        content: { text: 'Synthetic citation', fontSize: 9 },
      },
      {
        elementId: 'generic-3',
        elementType: 'text',
        bounds: [30, 24, 800, 60],
        content: { text: 'Visible authored heading 中文', fontSize: 26 },
      },
      {
        elementId: 'generic-4',
        elementType: 'text',
        bounds: [30, 123, 800, 320],
        content: { text: 'Synthetic body', fontSize: 18 },
      },
    ];
    const before = structuredClone(page);
    expect(projectSlideTitle(page)).toBe('Visible authored heading 中文');
    expect(page).toEqual(before);
    page.metadata.elementRoles = { 'generic-4': 'heading' };
    expect(projectSlideTitle(page)).toBe('Synthetic body');
    page.data.title = 'Explicit authored title';
    expect(projectSlideTitle(page)).toBe('Explicit authored title');
  });

  it('skips empty title objects and derived fields and searches complete Story values', () => {
    const page = slides(['page'])[0];
    page.data.title = '';
    page.data.elements = [
      { elementId: 'title-empty', elementType: 'text', content: { text: '' } },
      { elementId: 'heading-live', elementType: 'text', content: { text: 'Real heading' } },
    ];
    expect(projectSlideTitle(page)).toBe('Real heading');
    page.data.elements = [
      {
        elementId: 'title-field',
        elementType: 'text',
        content: { text: '99', field: 'main-position' },
      },
    ];
    expect(projectSlideTitle(page)).toBe('Untitled slide');
    page.metadata.designIntent = { purpose: 'Only in Story', keep: ['Evidence 证据'] };
    expect(projectSlideSearch(page)).toContain('only in story evidence 证据');
  });
});
