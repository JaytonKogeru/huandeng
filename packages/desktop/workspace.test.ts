import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { WorkspaceLayout } from '../core/src/app/lib/huandeng-desktop';

const require = createRequire(import.meta.url);
const { normalizeWorkspaceLayout, createWorkspaceLayoutWriter } = require('./workspace.cjs');
const { readPreferences, writePreferences } = require('./project.cjs');

describe('desktop workspace preferences', () => {
  it('retains a valid right dock and dimensions independently of documents', () => {
    expect(
      normalizeWorkspaceLayout({
        notesDock: 'right',
        notesHeight: 240,
        notesWidth: 360,
        navigationWidth: 320,
        inspectorWidth: 340,
        notesOpen: true,
      }),
    ).toEqual({
      notesDock: 'right',
      notesHeight: 240,
      notesWidth: 360,
      navigationWidth: 320,
      inspectorWidth: 340,
      notesOpen: true,
      navigationCollapsed: false,
      inspectorCollapsed: false,
    });
  });
  it('clamps stale dimensions, rejects invalid numbers and excludes unknown fields', () => {
    const value = normalizeWorkspaceLayout({
      notesDock: 'left',
      notesHeight: 9000,
      notesWidth: -1,
      navigationWidth: NaN,
      inspectorWidth: 'huge',
      notesOpen: 'true',
      documentPath: 'author-data',
    });
    expect(value).toEqual({
      notesDock: 'bottom',
      notesHeight: 400,
      notesWidth: 240,
      navigationWidth: 288,
      inspectorWidth: 300,
      notesOpen: false,
      navigationCollapsed: false,
      inspectorCollapsed: false,
    });
  });

  it('persists the latest leave snapshot before a delayed older autosave can replace it', async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'huandeng-workspace-leave-'));
    const file = path.join(directory, 'preferences.json');
    let layout: WorkspaceLayout = normalizeWorkspaceLayout({});
    const writer = createWorkspaceLayoutWriter({
      read: () => layout,
      write: async (next: WorkspaceLayout) => {
        await writePreferences(file, { workspaceLayout: next });
        layout = next;
        return next;
      },
    });
    try {
      writer.open('editor-a');
      const latest = { ...layout, notesDock: 'right', notesWidth: 392, notesOpen: true };
      await writer.save({ clientId: 'editor-a', revision: 2, layout: latest });
      await writer.save({
        clientId: 'editor-a',
        revision: 1,
        layout: { ...layout, notesDock: 'bottom', notesWidth: 320 },
      });
      expect((await readPreferences(file)).workspaceLayout).toEqual(latest);
      expect(layout).toEqual(latest);
    } finally {
      await fs.rm(directory, { recursive: true, force: true });
    }
  });

  it('does not apply delayed updates from a renderer that has already been replaced', async () => {
    let layout: WorkspaceLayout = normalizeWorkspaceLayout({});
    const writer = createWorkspaceLayoutWriter({
      read: () => layout,
      write: async (next: WorkspaceLayout) => {
        layout = next;
        return next;
      },
    });
    writer.open('editor-a');
    await writer.save({
      clientId: 'editor-a',
      revision: 8,
      layout: { ...layout, notesHeight: 240 },
    });
    expect(writer.open()).toEqual(layout);
    writer.open('editor-b');
    await writer.save({
      clientId: 'editor-b',
      revision: 0,
      layout: { ...layout, notesHeight: 280 },
    });
    await writer.save({
      clientId: 'editor-a',
      revision: 9,
      layout: { ...layout, notesHeight: 400 },
    });
    expect(layout.notesHeight).toBe(280);
  });

  it('allows retry of the same latest snapshot after persistence fails', async () => {
    let layout: WorkspaceLayout = normalizeWorkspaceLayout({});
    let attempts = 0;
    const writer = createWorkspaceLayoutWriter({
      read: () => layout,
      write: async (next: WorkspaceLayout) => {
        if (attempts++ === 0) throw new Error('write unavailable');
        layout = next;
        return next;
      },
    });
    writer.open('editor-a');
    const update = {
      clientId: 'editor-a',
      revision: 3,
      layout: { ...layout, navigationWidth: 360 },
    };
    await expect(writer.save(update)).rejects.toThrow('write unavailable');
    expect(layout.navigationWidth).toBe(288);
    await writer.save(update);
    expect(layout.navigationWidth).toBe(360);
    expect(attempts).toBe(2);
  });
});
