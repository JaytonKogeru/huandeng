import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { setUiLocale } from '@/lib/huandeng-locale';
import type { PageSnapshot } from '../../../pptd/types';
import { NotesPageView } from './notes-page-view';
import { NotesPanel } from './notes-panel';
import { SectionBrowser } from './section-browser';
import { PptdThumbnailRail } from './thumbnail-rail';
import { WorkspaceViewSwitcher } from './workspace-views';

const page: PageSnapshot = {
  pageId: 'p1',
  shortCode: 'ABCD',
  mainPosition: 9,
  path: 'p1.page',
  state: 'active',
  pageRevision: 'sha256:p',
  renderRevision: 'sha256:r',
  metadata: { shortCode: 'ABCD', path: 'p1.page', state: 'active' },
  data: { title: 'Authored heading 中文', elements: [], notes: 'Keep notes 原文\n'.repeat(100) },
};
const notes = {
  value: page.data.notes ?? '',
  disabled: false,
  presentation: false,
  onChange: vi.fn(),
  onComposition: vi.fn(),
  onEditOccurrence: vi.fn(),
};

afterEach(async () => {
  vi.stubGlobal('localStorage', { setItem: () => {} });
  await setUiLocale('en');
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('workspace view surfaces', () => {
  it('localizes view controls and identifies the active view and draft guard', async () => {
    vi.stubGlobal('localStorage', { setItem: () => {} });
    await setUiLocale('zh-CN');
    const html = renderToStaticMarkup(
      <WorkspaceViewSwitcher value="notes" blocked onChange={vi.fn()} />,
    );
    expect(html).toContain('章节浏览');
    expect(html).toContain('普通');
    expect(html).toContain('大纲');
    expect(html).toContain('备注页');
    expect(html).toContain('data-hd-workspace-view="notes"');
    expect(html.match(/ disabled=""/g)).toHaveLength(3);
    expect(html.match(/data-hd-workspace-view=/g)).toHaveLength(4);
  });

  it('uses controlled outline navigation without a second view switcher', () => {
    const props = {
      pages: [{ ...page, occurrenceId: 'pinned', versionId: 'v1' }],
      size: [960, 540] as [number, number],
      theme: {},
      currentPageId: page.pageId,
      currentOccurrenceId: 'pinned',
      disabled: true,
      tombstones: [],
      onSelect: vi.fn(),
      onAdd: vi.fn(),
      onDuplicate: vi.fn(),
      onRemove: vi.fn(),
      onMove: vi.fn(),
      onRestore: vi.fn(),
      onHistory: vi.fn(),
      onShowFile: vi.fn(),
    };
    const outline = renderToStaticMarkup(<PptdThumbnailRail {...props} view="outline" />);
    const normal = renderToStaticMarkup(<PptdThumbnailRail {...props} view="thumbnails" />);
    expect(outline).toContain('data-hd-outline-row="pinned"');
    expect(outline).toContain('data-hd-thumbnail-key="pinned"');
    expect(outline).toContain('Authored heading 中文');
    expect(normal).not.toContain('data-hd-outline-row');
    for (const html of [outline, normal]) {
      expect(html).not.toContain('data-hd-pages-outline');
      expect(html).not.toContain('data-hd-pages-thumbnails');
      expect(html).toContain('aria-pressed="true"');
    }
  });

  it('renders one shared editable notes control per view without changing notes or writing', () => {
    const before = JSON.stringify(page);
    const panel = renderToStaticMarkup(
      <NotesPanel
        {...notes}
        dock="bottom"
        height={180}
        width={300}
        onDock={vi.fn()}
        onHeight={vi.fn()}
        onWidth={vi.fn()}
        onResizeEnd={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    const full = renderToStaticMarkup(
      <NotesPageView
        {...notes}
        page={page}
        size={[960, 540]}
        theme={{}}
        position={1}
        count={2}
        navigatingDisabled={false}
        onPrevious={vi.fn()}
        onNext={vi.fn()}
      />,
    );
    for (const html of [panel, full]) {
      expect(html.match(/<textarea/g)).toHaveLength(1);
      expect(html).toContain('data-hd-notes-editor');
      expect(html).toContain('Keep notes 原文');
      expect(html).not.toContain('readOnly=""');
    }
    expect(full).toContain('Authored heading 中文');
    expect(full).toContain('data-pptd-page');
    expect(JSON.stringify(page)).toBe(before);
    expect(notes.onChange).not.toHaveBeenCalled();
    expect(notes.onComposition).not.toHaveBeenCalled();
  });

  it('keeps pinned occurrence notes read-only and its edit action disabled', () => {
    const html = renderToStaticMarkup(
      <NotesPageView
        {...notes}
        disabled
        presentation
        page={{ ...page, occurrenceId: 'pinned-occurrence', versionId: 'version-7' }}
        size={[960, 540]}
        theme={{}}
        position={2}
        count={2}
        navigatingDisabled={false}
        onPrevious={vi.fn()}
        onNext={vi.fn()}
      />,
    );
    expect(html).toContain('readOnly=""');
    expect(html).toContain('Pinned version · read-only');
    expect(html).toContain('data-hd-workspace-preview="pinned-occurrence"');
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Edit notes<\/button>/);
  });

  it('keeps repeated occurrences distinct and exposes no Main move actions in Presentation', () => {
    const html = renderToStaticMarkup(
      <SectionBrowser
        pages={[
          { ...page, occurrenceId: 'one' },
          { ...page, occurrenceId: 'two', versionId: 'version-7' },
        ]}
        sections={[]}
        size={[960, 540]}
        theme={{}}
        currentPageId="p1"
        currentOccurrenceId="two"
        presentation
        disabled={false}
        onSelect={vi.fn()}
        onEdit={vi.fn()}
        onMove={vi.fn()}
        onManageSections={vi.fn()}
      />,
    );
    expect(html).toContain('data-hd-browser-card="one"');
    expect(html).toContain('data-hd-browser-card="two" data-selected="true"');
    expect(html).toContain('Main Position 9');
    expect(html).not.toContain('data-hd-browser-move');
    expect(html).not.toContain('draggable');
  });
});
