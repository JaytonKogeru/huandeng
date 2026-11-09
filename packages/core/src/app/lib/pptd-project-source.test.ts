import { describe, expect, it } from 'vitest';
import type { PageSnapshot } from '../../pptd/types';
import { projectSlideSearch, projectSlideTitle } from './pptd-project-source';

function page(): PageSnapshot {
  return {
    pageId: 'synthetic',
    shortCode: 'SYNTHETIC',
    path: 'synthetic.page',
    state: 'active',
    pageRevision: 'sha256:p',
    renderRevision: 'sha256:r',
    metadata: { path: 'synthetic.page', state: 'active', shortCode: 'SYNTHETIC' },
    data: {
      elements: [
        {
          elementId: 'generic-1',
          elementType: 'text',
          bounds: [30, 100, 800, 40],
          content: { text: 'Secondary subtitle', fontSize: 16 },
        },
        {
          elementId: 'generic-2',
          elementType: 'text',
          bounds: [30, 25, 800, 60],
          content: { text: 'Actual heading 中文', fontSize: 32 },
        },
      ],
    },
  };
}

describe('semantic slide titles and search', () => {
  it.each(['title', 'heading'])('ignores a preceding metadata subtitle for a %s role', (role) => {
    const slide = page();
    slide.metadata.elementRoles = { 'generic-1': 'subtitle', 'generic-2': role };

    expect.soft(projectSlideTitle(slide)).toBe('Actual heading 中文');
    expect(projectSlideSearch(slide)).toContain('actual heading 中文');
  });

  it.each(['title', 'heading'])('ignores a preceding element subtitle for a %s role', (role) => {
    const slide = page();
    slide.data.elements[0].role = 'subtitle';
    slide.data.elements[1].role = role;

    expect.soft(projectSlideTitle(slide)).toBe('Actual heading 中文');
    expect(projectSlideSearch(slide)).toContain('actual heading 中文');
  });

  it.each(['elementId', 'name'] as const)(
    'prefers an explicit title role over a preceding legacy %s match',
    (key) => {
      const slide = page();
      slide.data.elements[0][key] = 'legacy-heading';
      slide.data.elements[1].role = 'title';

      expect.soft(projectSlideTitle(slide)).toBe('Actual heading 中文');
      expect(projectSlideSearch(slide)).toContain('actual heading 中文');
    },
  );

  it.each(['elementId', 'name'] as const)(
    'does not mistake a subtitle %s for a title without semantic roles',
    (key) => {
      const slide = page();
      slide.data.elements[0][key] = 'subtitle';

      expect.soft(projectSlideTitle(slide)).toBe('Actual heading 中文');
      expect(projectSlideSearch(slide)).toContain('actual heading 中文');
    },
  );
});
