import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const {
  createProjectTabs,
  contentBounds,
  normalizeProjectTabLayout,
  updateProjectTabLayout,
  publicProjectTab,
} = require('./project-tabs.cjs');

const project = (id: string, entryKey: string, contentsId: number) => ({
  id,
  entryKey,
  view: { webContents: { id: contentsId } },
  service: { entryPath: `${entryKey}/deck.pptd`, title: id, readOnly: false },
  state: {},
});

describe('desktop Project tabs', () => {
  it('retains independently owned Projects when switching to another Project or Home', () => {
    const tabs = createProjectTabs();
    const first = project('first', '/first', 11);
    const second = project('second', '/second', 12);
    tabs.add(first);
    tabs.add(second);
    tabs.activate('first');
    first.state = { dirty: true };
    tabs.activate('second');
    expect(tabs.forContents(11)).toBe(first);
    expect(tabs.forContents(12)).toBe(second);
    expect(tabs.forContents(99)).toBe(null);
    tabs.activate(null);
    expect(tabs.active).toBe(null);
    expect(tabs.list()).toEqual([first, second]);
    tabs.activate('first');
    expect(tabs.active.state.dirty).toBe(true);
  });

  it('deduplicates canonical entries and cannot select an unowned Project', () => {
    const tabs = createProjectTabs();
    tabs.add(project('first', '/same', 11));
    expect(() => tabs.add(project('second', '/same', 12))).toThrow('already open');
    expect(() => tabs.activate('unknown')).toThrow('no longer open');
    expect(tabs.find('/same').id).toBe('first');
    expect(tabs.list()).toHaveLength(1);
  });

  it('closing another Project preserves the active Project and closing the active tab selects its neighbour', () => {
    const tabs = createProjectTabs();
    for (const [index, id] of ['a', 'b', 'c'].entries()) tabs.add(project(id, `/${id}`, index));
    tabs.activate('b');
    tabs.remove('a');
    expect(tabs.activeId).toBe('b');
    tabs.remove('b');
    expect(tabs.activeId).toBe('c');
    expect(tabs.forContents(1)).toBe(null);
    tabs.remove('c');
    expect(tabs.activeId).toBe(null);
  });

  it('moves tabs without replacing their views or changing the active Project', () => {
    const tabs = createProjectTabs();
    const items = ['a', 'b', 'c'].map((id, index) => project(id, `/${id}`, index));
    for (const item of items) tabs.add(item);
    items[1].state = { dirty: true };
    tabs.activate('b');
    expect(tabs.move('c', 'a')).toBe(true);
    expect(tabs.list()).toEqual([items[2], items[0], items[1]]);
    expect(tabs.active).toBe(items[1]);
    expect(tabs.forContents(1)).toBe(items[1]);
    expect(tabs.active.state.dirty).toBe(true);
    expect(tabs.move('c', null)).toBe(true);
    expect(tabs.list()).toEqual(items);
    expect(tabs.move('c', null)).toBe(false);
    expect(tabs.move('b', 'b')).toBe(false);
    expect(() => tabs.move('missing', 'a')).toThrow('no longer open');
    expect(() => tabs.move('a', 'missing')).toThrow('no longer open');
    expect(tabs.list()).toEqual(items);
    tabs.move('c', 'b');
    tabs.remove('b');
    expect(tabs.activeId).toBe('c');
  });

  it('normalizes saved layouts and validates partial changes without resetting collapse', () => {
    expect(normalizeProjectTabLayout(null)).toEqual({
      orientation: 'horizontal',
      collapsed: false,
    });
    expect(normalizeProjectTabLayout({ orientation: 'diagonal', collapsed: 'yes' })).toEqual({
      orientation: 'horizontal',
      collapsed: false,
    });
    const current = { orientation: 'vertical', collapsed: true };
    expect(updateProjectTabLayout(current, { orientation: 'horizontal' })).toEqual({
      orientation: 'horizontal',
      collapsed: true,
    });
    expect(updateProjectTabLayout(current, { collapsed: false })).toEqual({
      orientation: 'vertical',
      collapsed: false,
    });
    expect(current).toEqual({ orientation: 'vertical', collapsed: true });
    for (const invalid of [
      null,
      [],
      { orientation: 'diagonal' },
      { collapsed: 'yes' },
      { path: 'x' },
    ])
      expect(() => updateProjectTabLayout(current, invalid)).toThrow('Invalid');
  });

  it('reserves vertical chrome, keeps tiny content positive and restores full presentation bounds', () => {
    const expanded = { orientation: 'vertical', collapsed: false };
    const collapsed = { ...expanded, collapsed: true };
    expect(contentBounds(1440, 900, false, 42, expanded)).toEqual({
      x: 224,
      y: 42,
      width: 1216,
      height: 858,
    });
    expect(contentBounds(1040, 680, false, 42, collapsed)).toEqual({
      x: 52,
      y: 42,
      width: 988,
      height: 638,
    });
    expect(contentBounds(20, 20, false, 42, expanded)).toEqual({
      x: 19,
      y: 19,
      width: 1,
      height: 1,
    });
    expect(contentBounds(0, 0, false, 42, expanded)).toEqual({ x: 0, y: 0, width: 1, height: 1 });
    for (const layout of [expanded, collapsed])
      expect(contentBounds(1440, 900, true, 42, layout)).toEqual({
        x: 0,
        y: 0,
        width: 1440,
        height: 900,
      });
  });

  it('keeps shell content out of a presentation and exposes only tab metadata', () => {
    expect(contentBounds(1440, 900, false)).toEqual({ x: 0, y: 42, width: 1440, height: 858 });
    expect(contentBounds(1440, 900, true)).toEqual({ x: 0, y: 0, width: 1440, height: 900 });
    const item = {
      ...project('a', '/a', 11),
      token: 'must-not-leave-main',
      state: { dirty: true, activity: true },
    };
    expect(publicProjectTab(item)).toEqual({
      id: 'a',
      title: 'a',
      entryPath: '/a/deck.pptd',
      readOnly: false,
      dirty: true,
      saving: false,
      attention: false,
      activity: true,
    });
  });
});
