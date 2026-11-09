import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { createProjectTabs, contentBounds, publicProjectTab } = require('./project-tabs.cjs');

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
