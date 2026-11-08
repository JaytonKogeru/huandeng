import { describe, expect, it } from 'vitest';
import { parsePage, patchPageElement, serializePage } from '../../pptd/codec';
import { mapPptdText } from '../../pptd/export-text';
import type { DeckSnapshot, PageSnapshot, PptdElement } from '../../pptd/types';
import { captureTitleStyle, createTitleStyleChange, titleLayoutObjects } from './pptd-title-layout';

function page(pageId: string, elements: PptdElement[]): PageSnapshot {
  return {
    pageId,
    shortCode: pageId,
    path: `pages/${pageId}.page`,
    state: 'active',
    pageRevision: `sha256:${pageId}`,
    renderRevision: `sha256:render-${pageId}`,
    data: { elements, background: { color: '#ffffff' }, notes: 'Keep these notes.' },
    metadata: { shortCode: pageId, path: `pages/${pageId}.page`, state: 'active' },
  };
}

function fixture() {
  const source = page('source', [
    {
      elementId: 'reference-title',
      elementType: 'text',
      bounds: [40, 20, 880, 60],
      content: { text: 'Reference words must not be copied', style: '$heading' },
    },
  ]);
  source.metadata.themeOverride = {
    colors: { ink: '#123456' },
    textStyles: {
      heading: {
        fontFamily: 'Arial',
        fontSize: 34,
        bold: true,
        color: '$ink',
        align: ['left', 'center'],
      },
    },
  };
  const target = page('target', [
    {
      elementId: 'chosen-title',
      elementType: 'text',
      bounds: [100, 200, 400, 80],
      content: { text: '<p>Keep <em>this</em> exact title.</p>', fontSize: 20, lineHeightPx: 45 },
    },
    {
      elementId: 'other-title',
      elementType: 'text',
      bounds: [25, 250, 700, 50],
      content: { text: 'Another text object', fontSize: 50 },
    },
    {
      elementId: 'figure',
      elementType: 'image',
      bounds: [40, 100, 400, 300],
      src: 'media/original.png',
    },
  ]);
  const snapshot: DeckSnapshot = {
    kind: 'pptd',
    deckId: 'deck',
    entry: 'deck.pptd',
    title: 'Synthetic layout test',
    size: [960, 540],
    manifest: {
      pages: [source.path, target.path],
      theme: {
        colors: { ink: '#ff0000' },
        textStyles: { heading: { fontFamily: 'Times New Roman', fontSize: 50 } },
      },
    },
    manifestRevision: 'sha256:manifest',
    metadataRevision: 'sha256:metadata',
    pages: [source, target],
    metadata: {
      schemaVersion: 1,
      deckId: 'deck',
      entry: 'deck.pptd',
      slides: { source: source.metadata, target: target.metadata },
    },
    identityPersisted: true,
    writable: true,
    epoch: 'epoch',
    sequence: 1,
    diagnostics: [],
  };
  return { source, target, snapshot };
}

describe('reference title layout', () => {
  it('replaces a uniform inline normal baseline with captured bold while retaining semantic emphasis', () => {
    const { source, target, snapshot } = fixture();
    target.data.elements[0].content = {
      text: '<p><span style="font-weight:normal;font-style:normal;text-decoration:none">Keep <em>this</em> <strong>exact</strong> <u>title</u></span></p>',
      fontSize: 20,
    };
    const operation = createTitleStyleChange({
      snapshot,
      referencePageId: source.pageId,
      referenceElementId: 'reference-title',
      targetPage: target,
      targetElementId: 'chosen-title',
    }).operations[0];
    const result = parsePage(
      patchPageElement(
        serializePage(target.data),
        operation.elementId,
        operation.set,
        operation.unset,
      ),
    ).value.elements[0];
    expect(result.content?.bold).toBe(true);
    expect(result.content?.text).toBe(
      '<p><span>Keep <em>this</em> <strong>exact</strong> <u>title</u></span></p>',
    );
    const native = mapPptdText(result, {}, () => ({ r: 18, g: 52, b: 86, a: 1 }), 'title');
    const runs = native.node.paragraphs.flatMap((paragraph) =>
      paragraph.lines.flatMap((line) => line.runs),
    );
    expect(runs.every((run) => run.style.bold)).toBe(true);
    expect(runs.find((run) => run.text === 'this')?.style.italic).toBe(true);
    expect(runs.find((run) => run.text === 'title')?.style.underline).toBe(true);
    expect(runs.find((run) => run.text === 'Keep ')?.style.underline).toBe(false);
  });

  it('patches only the chosen title, retaining words, assets, notes, and the background', () => {
    const { source, target, snapshot } = fixture();
    const before = structuredClone({ source, target, snapshot });
    const change = createTitleStyleChange({
      snapshot,
      referencePageId: source.pageId,
      referenceElementId: 'reference-title',
      targetPage: target,
      targetElementId: 'chosen-title',
    });
    expect(change.operations).toHaveLength(1);
    const operation = change.operations[0];
    const result = parsePage(
      patchPageElement(
        serializePage(target.data),
        operation.elementId,
        operation.set,
        operation.unset,
      ),
    ).value;
    expect(result.elements[0].bounds).toEqual([40, 20, 880, 60]);
    expect(result.elements[0].content).toMatchObject({
      text: target.data.elements[0].content?.text,
      fontFamily: 'Arial',
      fontSize: 34,
      bold: true,
      color: '#123456',
    });
    expect(result.elements[0].content).not.toHaveProperty('lineHeightPx');
    expect(operation.unset).toContain('content.lineHeightPx');
    expect(result.elements.slice(1)).toEqual(target.data.elements.slice(1));
    expect(result.notes).toBe(target.data.notes);
    expect(result.background).toEqual(target.data.background);
    expect({ source, target, snapshot }).toEqual(before);
  });

  it('guards the target revision without pretending the writer checks unrelated source revisions', () => {
    const { source, target, snapshot } = fixture();
    expect(
      createTitleStyleChange({
        snapshot,
        referencePageId: source.pageId,
        referenceElementId: 'reference-title',
        targetPage: target,
        targetElementId: 'chosen-title',
      }).expected,
    ).toEqual({
      pages: { target: target.pageRevision },
      metadata: snapshot.metadataRevision,
    });
  });

  it('uses effective source defaults and overrides incompatible target line-height inheritance', () => {
    const { source, target, snapshot } = fixture();
    source.data.elements[0].content = { text: 'Plain title' };
    target.data.elements[0].content = { text: 'Target', style: '$large', bold: true };
    target.metadata.themeOverride = { textStyles: { large: { lineHeightPx: 100, bold: true } } };
    const { set } = createTitleStyleChange({
      snapshot,
      referencePageId: source.pageId,
      referenceElementId: 'reference-title',
      targetPage: target,
      targetElementId: 'chosen-title',
    }).operations[0];
    expect(set).toMatchObject({
      'content.fontSize': 18,
      'content.bold': false,
      'content.color': '#000000',
      'content.lineHeight': 1,
      'content.lineHeightPx': 18,
      rotation: 0,
    });
    expect(set).not.toHaveProperty('content.text');
    expect(set).not.toHaveProperty('content.style');
  });

  it('requires explicit valid source and target choices without guessing from large text', () => {
    const { source, target, snapshot } = fixture();
    const options = {
      snapshot,
      referencePageId: source.pageId,
      referenceElementId: 'reference-title',
      targetPage: target,
      targetElementId: 'chosen-title',
    };
    expect(() => createTitleStyleChange({ ...options, referenceElementId: '' })).toThrow(
      'reference',
    );
    expect(() => createTitleStyleChange({ ...options, targetElementId: '' })).toThrow(
      'independent',
    );
    expect(() => createTitleStyleChange({ ...options, targetElementId: 'figure' })).toThrow(
      'independent',
    );
    expect(() =>
      createTitleStyleChange({
        ...options,
        targetPage: source,
        targetElementId: 'reference-title',
      }),
    ).toThrow('different reference');
  });

  it('rejects a pinned target and malformed source geometry', () => {
    const { source, target, snapshot } = fixture();
    const options = {
      snapshot,
      referencePageId: source.pageId,
      referenceElementId: 'reference-title',
      targetPage: target,
      targetElementId: 'chosen-title',
    };
    expect(() =>
      createTitleStyleChange({ ...options, targetPage: { ...target, versionId: 'fixed' } }),
    ).toThrow('editable');
    source.data.elements[0].bounds = [0, 0, 0, 40];
    expect(() => createTitleStyleChange(options)).toThrow('valid position');
  });

  it('does not independently move a grouped target or change its containing group', () => {
    const { source, target, snapshot } = fixture();
    target.data.elements.push({
      elementId: 'group',
      elementType: 'group',
      bounds: [20, 20, 900, 400],
      children: ['chosen-title', 'figure'],
    });
    expect(titleLayoutObjects(target).map((element) => element.elementId)).toEqual([
      'chosen-title',
      'other-title',
    ]);
    expect(titleLayoutObjects(target, true).map((element) => element.elementId)).toEqual([
      'other-title',
    ]);
    expect(() =>
      createTitleStyleChange({
        snapshot,
        referencePageId: source.pageId,
        referenceElementId: 'reference-title',
        targetPage: target,
        targetElementId: 'chosen-title',
      }),
    ).toThrow('independent');
  });

  it('applies the detached captured style after source and theme changes, with the current target CAS', () => {
    const { source, target, snapshot } = fixture();
    const capturedStyle = captureTitleStyle(snapshot, source.pageId, 'reference-title');
    const original = structuredClone(capturedStyle);
    source.data.elements[0].bounds = [10, 10, 100, 20];
    source.data.elements[0].content = {
      text: 'Changed source',
      fontFamily: 'Courier New',
      fontSize: 12,
      color: '#ff0000',
    };
    source.pageRevision = 'sha256:changed-source';
    source.metadata.themeOverride = {};
    snapshot.manifest.theme = {};
    snapshot.metadataRevision = 'sha256:changed-metadata';
    target.pageRevision = 'sha256:current-target';
    const change = createTitleStyleChange({
      snapshot,
      capturedStyle,
      targetPage: target,
      targetElementId: 'chosen-title',
    });
    expect(change.operations).toHaveLength(1);
    expect(change.operations[0].set).toMatchObject({
      bounds: [40, 20, 880, 60],
      'content.fontFamily': 'Arial',
      'content.fontSize': 34,
      'content.color': '#123456',
    });
    expect(change.expected.pages).toEqual({ target: 'sha256:current-target' });
    expect(change.expected).not.toHaveProperty('manifest');
    (change.operations[0].set.bounds as number[])[0] = 999;
    expect(capturedStyle).toEqual(original);
    expect(
      captureTitleStyle(snapshot, source.pageId, 'reference-title').fields['content.fontSize'],
    ).toBe(12);
  });

  it('copies visible imported inline title styling and removes target baseline overrides without losing semantics', () => {
    const { source, target, snapshot } = fixture();
    source.data.elements[0].content = {
      text: '<p style="text-align:center;line-height:1.2"><span style="font-size:34px;font-family:Arial;color:#202933;font-weight:bold">Reference title</span></p>',
    };
    target.data.elements[0].content = {
      text: '<p style="text-align:right;line-height:90px"><span style="font-size:12px;font-family:Courier New;color:#ff0000">Keep <em>this</em><br>and <strong>that</strong><sup>2</sup></span></p>',
      fontSize: 20,
      lineHeightPx: 45,
    };
    const before = structuredClone(source);
    const operation = createTitleStyleChange({
      snapshot,
      referencePageId: source.pageId,
      referenceElementId: 'reference-title',
      targetPage: target,
      targetElementId: 'chosen-title',
    }).operations[0];
    const result = parsePage(
      patchPageElement(
        serializePage(target.data),
        operation.elementId,
        operation.set,
        operation.unset,
      ),
    ).value.elements[0];
    expect(result.content).toMatchObject({
      fontSize: 34,
      fontFamily: 'Arial',
      bold: true,
      color: '#202933',
      align: ['center', 'top'],
      lineHeight: 1.2,
    });
    expect(result.content?.text).toBe(
      '<p><span>Keep <em>this</em><br>and <strong>that</strong><sup>2</sup></span></p>',
    );
    expect(result.content).not.toHaveProperty('lineHeightPx');
    const native = mapPptdText(result, {}, () => ({ r: 32, g: 41, b: 51, a: 1 }), 'chosen title');
    const runs = native.node.paragraphs.flatMap((paragraph) =>
      paragraph.lines.flatMap((line) => line.runs),
    );
    expect(runs.every((run) => run.style.font === 'Arial' && run.style.sizePx === 68)).toBe(true);
    expect(runs.find((run) => run.text === 'this')?.style.italic).toBe(true);
    expect(runs.find((run) => run.text === '2')?.style.baselineShift).toBe('super');
    expect(native.node.paragraphs[0]).toMatchObject({ align: 'ctr', lineSpacingPx: 81.6 });
    expect(source).toEqual(before);
  });
});
