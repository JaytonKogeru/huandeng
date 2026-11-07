import { describe, expect, it } from 'vitest';
import { deckFixture } from './fixtures.test-utils';
import { prepareRecipeTx } from './recipe-api';
import { createRecipe } from './recipes';

function request() {
  return {
    action: 'create',
    requestId: 'request-1',
    deckId: 'deck-test-1',
    actor: 'author',
    pageId: 'K7M2',
    instanceId: 'evidence',
    recipe: 'figure-with-caption',
    assets: { figure: 'media/original.png' },
    texts: { caption: 'Author supplied finding' },
    expected: {
      pages: { 'page-test-1': 'sha256:page' },
      manifest: 'sha256:manifest',
      metadata: 'sha256:metadata',
    },
  };
}

describe('recipe transaction adapter', () => {
  it('creates standard page objects and their recipe metadata in one scoped transaction', () => {
    const snapshot = deckFixture();
    const transaction = prepareRecipeTx(snapshot, request());
    expect(transaction.operations.map((operation) => operation.op)).toEqual([
      'element.add',
      'element.add',
      'element.add',
      'metadata.patch',
    ]);
    expect(
      transaction.operations.every(
        (operation) => 'pageId' in operation && operation.pageId === 'page-test-1',
      ),
    ).toBe(true);
    expect(transaction.expected).toEqual(request().expected);
    expect(snapshot.pages[0].data.elements).toEqual([]);
  });

  it('rejects stale page, metadata or size revisions without supplying fresh revisions itself', () => {
    for (const expected of [
      { ...request().expected, pages: { 'page-test-1': 'sha256:stale' } },
      { ...request().expected, metadata: 'sha256:stale' },
      { ...request().expected, manifest: 'sha256:stale' },
    ])
      expect(() => prepareRecipeTx(deckFixture(), { ...request(), expected })).toThrow(
        expect.objectContaining({ code: 'REVISION_CONFLICT' }),
      );
    expect(() => prepareRecipeTx(deckFixture(), { ...request(), expected: {} })).toThrow(
      expect.objectContaining({ code: 'MISSING_PRECONDITION' }),
    );
  });

  it('leaves apply and reset expansion to the writer so generated patches cannot become manual overrides', () => {
    const snapshot = deckFixture();
    snapshot.pages[0].metadata.components = {
      evidence: createRecipe({
        recipe: 'figure-with-caption',
        instanceId: 'evidence',
        pageId: 'page-test-1',
        size: snapshot.size,
        assets: { figure: 'media/original.png' },
      }).binding,
    };
    const { recipe: _recipe, assets: _assets, texts: _texts, ...body } = request();
    expect(
      prepareRecipeTx(snapshot, { ...body, action: 'apply', params: { margin: 60 } }).operations,
    ).toEqual([
      { op: 'recipe.apply', pageId: 'page-test-1', instanceId: 'evidence', params: { margin: 60 } },
    ]);
    expect(
      prepareRecipeTx(snapshot, {
        ...body,
        action: 'reset',
        reset: { slots: ['figure'], groups: ['geometry'] },
      }).operations,
    ).toEqual([
      {
        op: 'recipe.reset',
        pageId: 'page-test-1',
        instanceId: 'evidence',
        params: undefined,
        reset: { slots: ['figure'], groups: ['geometry'] },
      },
    ]);
    expect(() => prepareRecipeTx(snapshot, { ...body, action: 'apply', reset: {} })).toThrow(
      'explicit reset',
    );
    expect(() =>
      prepareRecipeTx(snapshot, { ...body, action: 'reset', reset: { groups: ['asset'] } }),
    ).toThrow('Reset only');
    expect(() =>
      prepareRecipeTx(snapshot, { ...body, action: 'apply', texts: { caption: 'Rewritten data' } }),
    ).toThrow('cannot replace');
    expect(() => prepareRecipeTx(snapshot, request())).toThrow('already exists');
  });
});
