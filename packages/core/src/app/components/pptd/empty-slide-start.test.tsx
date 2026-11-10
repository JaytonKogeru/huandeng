import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { deckFixture } from '../../../pptd/fixtures.test-utils';
import { EmptySlideStart } from './empty-slide-start';
import { PptdPageRenderer } from './renderer';

const actions = { onAddTitle: vi.fn(), onStory: vi.fn(), onConnect: vi.fn() };

describe('empty slide starting actions', () => {
  it('offers an editing next step without putting the guidance in the document or renderer', () => {
    const deck = deckFixture();
    const before = structuredClone(deck);
    const html = renderToStaticMarkup(<EmptySlideStart page={deck.pages[0]} actions={actions} />);
    expect(html).toContain('Add a title');
    expect(html).toContain('Set page intent');
    expect(html).toContain('Connect an Agent');
    const renderedPage = renderToStaticMarkup(
      <PptdPageRenderer page={deck.pages[0]} size={deck.size} />,
    );
    expect(renderedPage).not.toContain('Start this slide');
    expect(renderedPage).not.toContain('data-hd-empty-slide-start');
    expect(deck).toEqual(before);
    expect(actions.onAddTitle).not.toHaveBeenCalled();
  });

  it('does not offer writes for populated, pinned, presentation or read-only pages', () => {
    const page = deckFixture().pages[0];
    for (const props of [
      { page, disabled: true, actions },
      { page },
      { page: { ...page, versionId: 'milestone' }, actions },
      { page: { ...page, occurrenceId: 'talk-opening' }, actions },
      {
        page: {
          ...page,
          data: {
            elements: [
              { elementId: 'existing', elementType: 'text', content: { text: 'Content' } },
            ],
          },
        },
        actions,
      },
    ])
      expect(renderToStaticMarkup(<EmptySlideStart {...props} />)).toBe('');
  });
});
