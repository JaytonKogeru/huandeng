import { describe, expect, it } from 'vitest';
import { editorCaptureOptions } from './editor-capture-options';
import { deckFixture } from './fixtures.test-utils';

describe('bound Editor capture state', () => {
  const snapshot = deckFixture([{ elementId: 'title', elementType: 'text' }]);
  it('resolves only existing page and object identities with enumerated state', () => {
    expect(
      editorCaptureOptions(
        {
          deckId: snapshot.deckId,
          pageId: 'k7m2',
          objectId: 'title',
          view: 'browse',
          sidebar: 'project',
          inspector: 'story',
          locale: 'zh-CN',
        },
        snapshot,
      ),
    ).toMatchObject({
      pageId: 'page-test-1',
      objectId: 'title',
      view: 'browse',
      sidebar: 'project',
      inspector: 'story',
      locale: 'zh-CN',
      viewport: '1600x1000',
    });
  });
  it('keeps saved-state selection read-only and selects History explicitly', () => {
    expect(
      editorCaptureOptions({ deckId: snapshot.deckId, historyVersionId: 'named-1' }, snapshot),
    ).toMatchObject({ view: 'history', historyVersionId: 'named-1', dialog: 'none' });
    expect(
      editorCaptureOptions({ deckId: snapshot.deckId, dialog: 'export' }, snapshot),
    ).toMatchObject({ dialog: 'export' });
  });
  it.each([
    { dialog: 'agent-setup' },
    { dialog: 'export', historyVersionId: 'named-1' },
    { historyVersionId: 'named-1', reviewOperationId: 'saved-1' },
    { historyVersionId: 'named-1', view: 'edit' },
    { reviewOperationId: '' },
    { historyVersionId: 5 },
    { reviewOperationId: 'a'.repeat(161) },
    { deckId: 'another-project' },
    { pageId: 'missing' },
    { objectId: 'missing' },
    { view: 'run-code' },
    { sidebar: 'accounts' },
    { inspector: 'credentials' },
    { locale: 'other' },
    { viewport: '100000x100000' },
    { script: 'anything' },
    { url: 'https://example.org/' },
    { path: '../secret' },
  ])('rejects unsupported input %o', (extra) => {
    expect(() => editorCaptureOptions({ deckId: snapshot.deckId, ...extra }, snapshot)).toThrow();
  });
});
