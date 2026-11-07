import { describe, expect, it } from 'vitest';
import {
  applyRecipe,
  createRecipe,
  markRecipeElementOverride,
  RECIPE_NAMES,
  recipeOverrideGroupsForFields,
  removeRecipeSlot,
} from './recipes';
import type { PageSnapshot, PptdElement } from './types';

function page(elements: PptdElement[]): PageSnapshot {
  return {
    pageId: 'page-1',
    shortCode: 'K7M2',
    path: 'pages/original.page',
    state: 'active',
    pageRevision: 'sha256:before',
    renderRevision: 'sha256:render',
    data: { elements },
    metadata: { shortCode: 'K7M2', path: 'pages/original.page', state: 'active' },
  };
}

const options = {
  recipe: 'figure-with-caption' as const,
  pageId: 'page-1',
  instanceId: 'evidence-1',
  size: [960, 540] as [number, number],
  assets: { figure: 'media/original-scientific-figure.png' },
  texts: { caption: 'Original finding, n = 12.', annotation: 'Author annotation' },
};

describe('fixed scientific recipes', () => {
  it.each(RECIPE_NAMES)(
    'creates standard PPTD objects for %s with unique stable slots',
    (recipe) => {
      const created = createRecipe({
        ...options,
        recipe,
        assets: { ...options.assets, left: 'media/left.png', right: 'media/right.png' },
        existingElementIds: ['evidence-1--figure'],
      });
      expect(new Set(Object.values(created.binding.slots)).size).toBe(created.elements.length);
      expect(
        created.elements.every((element) =>
          ['image', 'text', 'line'].includes(element.elementType),
        ),
      ).toBe(true);
      expect(created.elements.every((element) => element.bounds?.length === 4)).toBe(true);
      const plan = applyRecipe({
        page: page(created.elements),
        instanceId: options.instanceId,
        binding: created.binding,
        size: options.size,
      });
      expect(plan.operations.filter((operation) => operation.op === 'element.patch')).toEqual([]);
      expect(plan.binding.slots).toEqual(created.binding.slots);
    },
  );

  it('keeps manually moved geometry while applying parameters to the remaining slots', () => {
    const created = createRecipe(options);
    const figure = created.elements.find((element) => element.elementType === 'image');
    if (!figure) throw new Error('Missing figure');
    figure.bounds = [75, 85, 456, 234];
    const binding = markRecipeElementOverride(created.binding, figure.elementId, ['bounds']);
    const plan = applyRecipe({
      page: page(created.elements),
      instanceId: options.instanceId,
      binding,
      size: options.size,
      params: { margin: 60, captionGap: 30 },
    });
    expect(
      plan.operations.filter(
        (operation) => operation.op === 'element.patch' && operation.elementId === figure.elementId,
      ),
    ).toEqual([]);
    expect(plan.skippedOverrides).toContainEqual(
      expect.objectContaining({ elementId: figure.elementId, group: 'geometry' }),
    );
    expect(
      plan.operations.some(
        (operation) =>
          operation.op === 'element.patch' && operation.elementId === binding.slots.caption,
      ),
    ).toBe(true);
    expect(figure.bounds).toEqual([75, 85, 456, 234]);
    expect(created.binding.overrides).toEqual({});
  });

  it('never resurrects a deleted slot, including explicit reset and externally missing objects', () => {
    const created = createRecipe(options);
    const captionId = created.binding.slots.caption;
    if (!captionId) throw new Error('Missing caption');
    const remaining = created.elements.filter((element) => element.elementId !== captionId);
    for (const binding of [created.binding, removeRecipeSlot(created.binding, captionId)]) {
      const plan = applyRecipe({
        page: page(remaining),
        instanceId: options.instanceId,
        binding,
        size: options.size,
        params: { margin: 60 },
        reset: {},
      });
      expect(plan.binding.slots.caption).toBeNull();
      expect(
        plan.operations.every(
          (operation) => operation.op !== 'element.patch' || operation.elementId !== captionId,
        ),
      ).toBe(true);
      expect(
        plan.operations.every(
          (operation) => operation.op === 'element.patch' || operation.op === 'metadata.patch',
        ),
      ).toBe(true);
    }
  });

  it('reset changes layout fields without replacing scientific text, original assets or unknown data', () => {
    const created = createRecipe(options);
    const figure = created.elements[0];
    const caption = created.elements[1];
    figure.src = 'media/reviewed-original.png';
    figure.provenance = { doi: '10.example/original', panel: 'C' };
    caption.content = { ...caption.content, text: 'Author correction', vendorField: { value: 42 } };
    const binding = markRecipeElementOverride(
      markRecipeElementOverride(created.binding, figure.elementId, ['bounds', 'src']),
      caption.elementId,
      ['content.text', 'content.fontSize'],
    );
    const before = structuredClone(created.elements);
    const plan = applyRecipe({
      page: page(created.elements),
      instanceId: options.instanceId,
      binding,
      size: options.size,
      params: { margin: 50, captionFontSize: 25 },
      reset: {},
    });
    for (const operation of plan.operations) {
      if (operation.op !== 'element.patch') continue;
      expect(operation.set).not.toHaveProperty('src');
      expect(operation.set).not.toHaveProperty('content.text');
      expect(operation.set).not.toHaveProperty('content');
    }
    expect(plan.binding.overrides.figure).toContain('asset');
    expect(plan.binding.overrides.caption).toContain('content');
    expect(created.elements).toEqual(before);
  });

  it('uses the original asset for a zoom without generating or copying a replacement image', () => {
    const created = createRecipe({ ...options, recipe: 'figure-with-zoom' });
    const pictures = created.elements.filter((element) => element.elementType === 'image');
    expect(pictures.map((element) => element.src)).toEqual([
      options.assets.figure,
      options.assets.figure,
    ]);
    expect(pictures[1].crop).toEqual({ top: 0.25, right: 0.25, bottom: 0.25, left: 0.25 });
    expect(pictures[0].crop).toBeUndefined();
  });

  it('requires an explicit compatible recipe version and validates the source rectangle', () => {
    const created = createRecipe(options);
    expect(() =>
      applyRecipe({
        page: page(created.elements),
        instanceId: options.instanceId,
        binding: { ...created.binding, recipeVersion: 2 },
        size: options.size,
      }),
    ).toThrow('not supported');
    expect(() =>
      createRecipe({ ...options, params: { zoomCrop: { left: 0.6, right: 0.6 } } }),
    ).toThrow('non-empty');
    expect(() => createRecipe({ ...options, params: { src: 'new-data.png' } })).toThrow(
      'Unknown layout',
    );
  });

  it('classifies group ownership rather than marking all text as a geometry override', () => {
    expect(recipeOverrideGroupsForFields(['content.text'])).toEqual(['content']);
    expect(recipeOverrideGroupsForFields(['bounds', 'rotation'])).toEqual(['geometry']);
    expect(recipeOverrideGroupsForFields(['crop.left', 'content.fontSize', 'src'])).toEqual([
      'crop',
      'font',
      'asset',
    ]);
  });
});
