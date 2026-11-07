import { describe, expect, it } from 'vitest';
import type { PptdElement } from '../../pptd/types';
import { elementLabel } from './pptd-element-label';
import {
  cycleItemId,
  type EditorKeyboardScope,
  resolveEditorKeyboardCommand,
  selectionRemovalIds,
  selectionRootIds,
  topLevelElementIds,
} from './pptd-keyboard';

type Key = Parameters<typeof resolveEditorKeyboardCommand>[0];
const key = (value: string, modifiers: Partial<Key> = {}): Key => ({
  key: value,
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  shiftKey: false,
  ...modifiers,
});

describe('editor keyboard ownership', () => {
  it.each(['input', 'dialog', 'timeline'] as EditorKeyboardScope[])(
    'leaves text, selection and destructive keys with the %s region',
    (scope) => {
      for (const value of [
        'ArrowLeft',
        'ArrowDown',
        'Tab',
        'Enter',
        'Delete',
        'Backspace',
        't',
        ' ',
      ])
        expect(resolveEditorKeyboardCommand(key(value), scope)).toBeNull();
      for (const value of ['a', 'c', 'x', 'g', 'd'])
        expect(resolveEditorKeyboardCommand(key(value, { ctrlKey: true }), scope)).toBeNull();
      if (scope !== 'timeline')
        for (const value of ['z', 'y'])
          expect(resolveEditorKeyboardCommand(key(value, { ctrlKey: true }), scope)).toBeNull();
    },
  );

  it('lets inputs save or move to another panel without changing their arrow keys', () => {
    expect(resolveEditorKeyboardCommand(key('s', { ctrlKey: true }), 'input')).toEqual({
      type: 'save',
    });
    expect(resolveEditorKeyboardCommand(key('F6', { shiftKey: true }), 'input')).toEqual({
      type: 'focus-region',
      direction: -1,
    });
    expect(resolveEditorKeyboardCommand(key('F1'), 'timeline')).toEqual({ type: 'help' });
    expect(resolveEditorKeyboardCommand(key('F6'), 'dialog')).toBeNull();
  });

  it('allows only document undo/redo from timeline controls while input history stays native', () => {
    expect(resolveEditorKeyboardCommand(key('z', { ctrlKey: true }), 'timeline')).toEqual({
      type: 'undo',
    });
    expect(
      resolveEditorKeyboardCommand(key('z', { metaKey: true, shiftKey: true }), 'timeline'),
    ).toEqual({ type: 'redo' });
    expect(resolveEditorKeyboardCommand(key('y', { ctrlKey: true }), 'timeline')).toEqual({
      type: 'redo',
    });
    expect(resolveEditorKeyboardCommand(key('z', { ctrlKey: true }), 'timeline', true)).toBeNull();
    expect(resolveEditorKeyboardCommand(key('z', { ctrlKey: true }), 'input')).toBeNull();
    expect(resolveEditorKeyboardCommand(key('Delete'), 'timeline')).toBeNull();
    expect(
      resolveEditorKeyboardCommand(key('ArrowRight', { ctrlKey: true }), 'timeline'),
    ).toBeNull();
  });

  it.each([{ isComposing: true }, { keyCode: 229 }, { defaultPrevented: true }])(
    'does not run a second command while composition or an earlier handler owns the event: %j',
    (guard) => {
      for (const value of ['ArrowRight', 'Enter', 'Delete', 'F5', 'F6', 'F1'])
        expect(resolveEditorKeyboardCommand(key(value, guard), 'canvas')).toBeNull();
      expect(
        resolveEditorKeyboardCommand(key('s', { ctrlKey: true, ...guard }), 'canvas'),
      ).toBeNull();
    },
  );

  it('moves only canvas/workspace selections by 1 or 10 document units', () => {
    expect(resolveEditorKeyboardCommand(key('ArrowLeft'), 'canvas')).toEqual({
      type: 'nudge',
      dx: -1,
      dy: 0,
    });
    expect(resolveEditorKeyboardCommand(key('ArrowDown', { shiftKey: true }), 'canvas')).toEqual({
      type: 'nudge',
      dx: 0,
      dy: 10,
    });
    for (const scope of ['layers', 'thumbnails', 'control'] as const)
      expect(resolveEditorKeyboardCommand(key('ArrowDown'), scope)).toBeNull();
    expect(resolveEditorKeyboardCommand(key('ArrowLeft', { altKey: true }), 'canvas')).toBeNull();
    expect(resolveEditorKeyboardCommand(key('ArrowLeft', { ctrlKey: true }), 'canvas')).toBeNull();
  });

  it('routes layer delete/copy to objects and thumbnail delete to pages', () => {
    expect(resolveEditorKeyboardCommand(key('Delete'), 'layers')).toEqual({
      type: 'remove-elements',
    });
    expect(resolveEditorKeyboardCommand(key('c', { ctrlKey: true }), 'layers')).toEqual({
      type: 'copy',
    });
    expect(resolveEditorKeyboardCommand(key('Delete'), 'thumbnails')).toEqual({
      type: 'remove-page',
    });
    expect(resolveEditorKeyboardCommand(key('Delete', { ctrlKey: true }), 'thumbnails')).toBeNull();
    expect(resolveEditorKeyboardCommand(key('a', { ctrlKey: true }), 'thumbnails')).toBeNull();
    expect(resolveEditorKeyboardCommand(key('x', { ctrlKey: true }), 'thumbnails')).toBeNull();
  });

  it('keeps paging available independently of editing commands', () => {
    for (const scope of ['canvas', 'thumbnails', 'layers', 'control', 'workspace'] as const) {
      expect(resolveEditorKeyboardCommand(key('PageUp'), scope)).toEqual({
        type: 'page-step',
        direction: -1,
      });
      expect(resolveEditorKeyboardCommand(key('PageDown'), scope)).toEqual({
        type: 'page-step',
        direction: 1,
      });
    }
    expect(resolveEditorKeyboardCommand(key('PageDown'), 'input')).toBeNull();
  });

  it('supports Ctrl and Command with explicit redo and ungroup modifiers', () => {
    for (const modifier of [{ ctrlKey: true }, { metaKey: true }]) {
      expect(resolveEditorKeyboardCommand(key('x', modifier), 'canvas')).toEqual({ type: 'cut' });
      expect(resolveEditorKeyboardCommand(key('a', modifier), 'canvas')).toEqual({
        type: 'select-all',
      });
      expect(resolveEditorKeyboardCommand(key('z', modifier), 'canvas')).toEqual({ type: 'undo' });
      expect(
        resolveEditorKeyboardCommand(key('z', { ...modifier, shiftKey: true }), 'canvas'),
      ).toEqual({ type: 'redo' });
      expect(resolveEditorKeyboardCommand(key('y', modifier), 'canvas')).toEqual({ type: 'redo' });
      expect(
        resolveEditorKeyboardCommand(key('g', { ...modifier, shiftKey: true }), 'canvas'),
      ).toEqual({ type: 'group', ungroup: true });
    }
  });

  it('preserves button activation and excludes hidden canvas commands in presentation', () => {
    expect(resolveEditorKeyboardCommand(key(' '), 'control', true)).toBeNull();
    expect(resolveEditorKeyboardCommand(key(' '), 'workspace', true)).toEqual({
      type: 'page-step',
      direction: 1,
    });
    expect(resolveEditorKeyboardCommand(key('Home'), 'workspace', true)).toEqual({
      type: 'page-boundary',
      end: false,
    });
    expect(resolveEditorKeyboardCommand(key('End'), 'workspace', true)).toEqual({
      type: 'page-boundary',
      end: true,
    });
    expect(resolveEditorKeyboardCommand(key('Escape'), 'workspace', true)).toEqual({
      type: 'cancel',
    });
    expect(resolveEditorKeyboardCommand(key('a', { ctrlKey: true }), 'workspace', true)).toBeNull();
    expect(resolveEditorKeyboardCommand(key('Delete'), 'workspace', true)).toBeNull();
  });

  it('lets the presentation scrubber retain arrows and Home/End while Escape exits presentation', () => {
    for (const value of ['ArrowRight', 'ArrowLeft', 'Home', 'End', 'PageDown'])
      expect(resolveEditorKeyboardCommand(key(value), 'input', true)).toBeNull();
    expect(resolveEditorKeyboardCommand(key('Escape'), 'input', true)).toEqual({ type: 'cancel' });
    expect(resolveEditorKeyboardCommand(key('Escape'), 'input')).toBeNull();
    expect(
      resolveEditorKeyboardCommand(key('Escape', { isComposing: true }), 'input', true),
    ).toBeNull();
  });
});

describe('object and occurrence navigation', () => {
  const elements: PptdElement[] = [
    { elementId: 'a', elementType: 'text' },
    { elementId: 'b', elementType: 'shape' },
    { elementId: 'nested', elementType: 'group', children: ['a', 'b'] },
    { elementId: 'c', elementType: 'shape' },
    { elementId: 'outer', elementType: 'group', children: ['nested', 'c'] },
    { elementId: 'title', elementType: 'text' },
  ];

  it('uses top-level groups once instead of entering every child', () => {
    expect(topLevelElementIds(elements)).toEqual(['outer', 'title']);
    expect(selectionRootIds(elements, ['a', 'nested', 'outer', 'c', 'title'])).toEqual([
      'outer',
      'title',
    ]);
    expect(selectionRootIds(elements, ['a', 'c'])).toEqual(['a', 'c']);
  });

  it('removes groups before their children and never removes a member twice', () => {
    expect(selectionRemovalIds(elements, ['a', 'outer', 'nested'])).toEqual([
      'outer',
      'nested',
      'a',
      'b',
      'c',
    ]);
    expect(selectionRemovalIds(elements, ['unknown', 'a'])).toEqual(['a']);
  });

  it('wraps canvas Tab but clamps list arrows and retains distinct repeated occurrences', () => {
    const occurrences = ['slide-a:first', 'slide-b:middle', 'slide-a:second'];
    expect(cycleItemId(occurrences, 'slide-a:first', -1)).toBe('slide-a:second');
    expect(cycleItemId(occurrences, 'slide-a:second', 1)).toBe('slide-a:first');
    expect(cycleItemId(occurrences, 'slide-a:second', 1, false)).toBe('slide-a:second');
    expect(cycleItemId(occurrences, 'slide-a:first', -1, false)).toBe('slide-a:first');
    expect(cycleItemId(occurrences, undefined, -1)).toBe('slide-a:second');
    expect(cycleItemId([], undefined, 1)).toBeNull();
  });

  it('announces human-readable text and object type instead of opaque IDs', () => {
    expect(
      elementLabel({
        elementId: 'opaque',
        elementType: 'text',
        content: { text: '<b>研究目标</b>' },
      }),
    ).toBe('研究目标');
    expect(elementLabel({ elementId: 'opaque', elementType: 'table' })).toBe('表格');
    expect(elementLabel({ elementId: 'opaque', elementType: 'group', children: [] })).toBe('组合');
    expect(
      elementLabel({ elementId: 'opaque', elementType: 'chart', title: { text: '测量结果' } }),
    ).toBe('测量结果');
  });
});

it('keeps live presentation clicks separate from native controls and key repeat', () => {
  expect(resolveEditorKeyboardCommand(key('Enter'), 'workspace', true)).toEqual({
    type: 'page-step',
    direction: 1,
  });
  expect(resolveEditorKeyboardCommand(key('Enter'), 'control', true)).toBeNull();
  expect(resolveEditorKeyboardCommand(key(' '), 'control', true)).toBeNull();
  expect(
    resolveEditorKeyboardCommand(key('ArrowRight', { repeat: true }), 'workspace', true),
  ).toBeNull();
  expect(resolveEditorKeyboardCommand(key('b'), 'workspace', true)).toEqual({
    type: 'presentation-blackout',
  });
  expect(resolveEditorKeyboardCommand(key('f'), 'workspace', true)).toEqual({
    type: 'presentation-fullscreen',
  });
  expect(resolveEditorKeyboardCommand(key('b'), 'input', true)).toBeNull();
  expect(resolveEditorKeyboardCommand(key('f'), 'dialog', true)).toBeNull();
});
