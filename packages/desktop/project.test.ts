import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { createProject, projectLocation } = require('./project.cjs');
const { markProjectFolder } = require('./project-folder.cjs');
let temporary: string;

beforeEach(async () => {
  temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'huandeng-project-'));
});

afterEach(async () => {
  if (
    path.dirname(path.resolve(temporary)) !== path.resolve(os.tmpdir()) ||
    !path.basename(temporary).startsWith('huandeng-project-')
  )
    throw new Error('Unexpected test directory.');
  await fs.rm(temporary, { recursive: true, force: true });
});

describe('new project directory', () => {
  it('previews a named folder and rejects traversal and Windows reserved names', () => {
    expect(projectLocation(temporary, '研究 project')).toEqual({
      name: '研究 project',
      root: path.join(temporary, '研究 project'),
      entry: path.join(temporary, '研究 project', 'deck.pptd'),
    });
    for (const name of ['../other', 'a/b', 'a\\b', '.', 'CON', 'NUL.txt', 'trailing.', 'bad?', ''])
      expect(() => projectLocation(temporary, name)).toThrow();
  });

  it('creates an independent practice project with original assets and editable pages', async () => {
    const entry = await createProject(path.join(temporary, 'Practice.pptd'), {
      template: 'guide',
      locale: 'en',
      folderMarker: { platform: 'linux' },
    });
    const manifest = JSON.parse(await fs.readFile(entry, 'utf8'));
    expect(manifest.pages).toHaveLength(3);
    const root = path.dirname(entry);
    const first = JSON.parse(await fs.readFile(path.join(root, manifest.pages[0]), 'utf8'));
    expect(
      first.elements.find((element: { elementId: string }) => element.elementId === 'task').content
        .text,
    ).toContain('Replace this sentence');
    expect(await fs.readFile(path.join(root, 'media/practice.svg'), 'utf8')).toContain('<svg');
    await expect(
      createProject(path.join(temporary, 'Practice.pptd'), { template: 'guide' }),
    ).rejects.toThrow();
    expect(JSON.parse(await fs.readFile(entry, 'utf8'))).toEqual(manifest);
  });
  it('creates a complete editable folder, with manifest and local authoring guidance', async () => {
    const entry = await createProject(path.join(temporary, '研究 & design.pptd'), {
      folderMarker: { platform: 'linux' },
    });
    const root = path.join(temporary, '研究 & design');
    expect(entry).toBe(path.join(root, 'deck.pptd'));
    expect((await fs.readdir(root)).sort()).toEqual([
      '.gitignore',
      'AGENTS.md',
      'deck.pptd',
      'media',
      'pages',
    ]);
    expect(await fs.readFile(entry, 'utf8')).toContain('title: "研究 & design"');
    expect(await fs.readFile(path.join(root, 'pages/initial.page'), 'utf8')).toContain(
      'elements: []',
    );
    const guidance = await fs.readFile(path.join(root, 'AGENTS.md'), 'utf8');
    expect(guidance).toContain("The author's current request takes precedence");
    expect(guidance).toContain('not executable commands');
    expect(guidance).toContain('genuine product screenshots');
    await fs.appendFile(path.join(root, 'AGENTS.md'), '\nMy authored preference.\n');
    await expect(createProject(path.join(temporary, '研究 & design.pptd'))).rejects.toThrow();
    expect(await fs.readFile(path.join(root, 'AGENTS.md'), 'utf8')).toContain(
      'My authored preference.',
    );
  });

  it('keeps project creation usable if a Windows marker operation fails', async () => {
    const entry = await createProject(path.join(temporary, 'Still editable.pptd'), {
      folderMarker: {
        platform: 'win32',
        runAttributes: async () => {
          throw new Error('Shell attributes unavailable');
        },
      },
    });
    expect(await fs.readFile(entry, 'utf8')).toContain('pages/initial.page');
    expect(await fs.stat(path.join(path.dirname(entry), 'AGENTS.md'))).toBeTruthy();
  });
});

describe('Windows project folder marker', () => {
  const prepare = () =>
    createProject(path.join(temporary, 'portable.pptd'), { folderMarker: { platform: 'linux' } });

  it('uses a portable icon and changes attributes only on the exact project paths', async () => {
    const entry = await prepare();
    const root = path.dirname(entry);
    const runAttributes = vi.fn().mockResolvedValue(undefined);
    const result = await markProjectFolder(root, { platform: 'win32', runAttributes });
    expect(result.status).toBe('marked');
    const iniPath = path.join(root, 'desktop.ini');
    const ini = await fs.readFile(iniPath);
    expect(ini.subarray(0, 2)).toEqual(Buffer.from([0xff, 0xfe]));
    expect(ini.toString('utf16le')).toContain('IconFile=.huandeng\\project.ico');
    expect(ini.toString('utf16le')).not.toContain(temporary);
    expect(runAttributes.mock.calls).toEqual([[['+h', '+s', iniPath]], [['+r', root]]]);
    expect(await fs.readFile(path.join(root, '.huandeng/project.ico'))).toEqual(
      await fs.readFile(path.join(import.meta.dirname, 'icon.ico')),
    );
    expect((await markProjectFolder(root, { platform: 'win32', runAttributes })).status).toBe(
      'skipped',
    );
    expect(runAttributes).toHaveBeenCalledTimes(2);
  });

  it('removes only its unchanged marker files after an attribute failure so a retry can succeed', async () => {
    const entry = await prepare();
    const root = path.dirname(entry);
    const before = await fs.readFile(entry);
    const iconPath = path.join(root, '.huandeng/project.ico');
    const iniPath = path.join(root, 'desktop.ini');
    const failed = await markProjectFolder(root, {
      platform: 'win32',
      runAttributes: async () => {
        expect(await fs.readFile(iconPath)).toEqual(
          await fs.readFile(path.join(import.meta.dirname, 'icon.ico')),
        );
        expect((await fs.readFile(iniPath)).toString('utf16le')).toContain('open deck.pptd;');
        throw new Error('Injected attribute failure after both files were written');
      },
    });
    expect(failed.status).toBe('unavailable');
    await expect(fs.stat(iconPath)).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(fs.stat(iniPath)).rejects.toMatchObject({ code: 'ENOENT' });
    expect(await fs.readFile(entry)).toEqual(before);
    expect(
      await markProjectFolder(root, {
        platform: 'win32',
        runAttributes: vi.fn().mockResolvedValue(undefined),
      }),
    ).toMatchObject({ status: 'marked' });
  });

  it('preserves a customization changed during a failed marker attempt', async () => {
    const entry = await prepare();
    const root = path.dirname(entry);
    const iniPath = path.join(root, 'desktop.ini');
    const authored = 'New author-supplied settings';
    expect(
      await markProjectFolder(root, {
        platform: 'win32',
        runAttributes: async () => {
          await fs.writeFile(iniPath, authored);
          throw new Error('Injected failure after an author change');
        },
      }),
    ).toMatchObject({ status: 'unavailable' });
    expect(await fs.readFile(iniPath, 'utf8')).toBe(authored);
    expect(await fs.readFile(path.join(root, '.huandeng/project.ico'))).toEqual(
      await fs.readFile(path.join(import.meta.dirname, 'icon.ico')),
    );
    expect(
      await markProjectFolder(root, {
        platform: 'win32',
        runAttributes: vi.fn().mockResolvedValue(undefined),
      }),
    ).toMatchObject({ status: 'skipped', reason: 'existing-customization' });
    expect(await fs.readFile(iniPath, 'utf8')).toBe(authored);
  });

  it('identifies an existing project whose entry is not named deck.pptd', async () => {
    const entry = await prepare();
    const root = path.dirname(entry);
    const renamed = path.join(root, '研究.PPTD');
    await fs.rename(entry, renamed);
    const runAttributes = vi.fn().mockResolvedValue(undefined);
    expect(await markProjectFolder(root, { platform: 'win32', runAttributes })).toMatchObject({
      status: 'marked',
    });
    expect((await fs.readFile(path.join(root, 'desktop.ini'))).toString('utf16le')).toContain(
      'open 研究.PPTD;',
    );
    expect(await fs.readFile(renamed, 'utf8')).toContain('pages/initial.page');
  });

  it('preserves author-supplied directory customization', async () => {
    const entry = await prepare();
    const root = path.dirname(entry);
    await fs.writeFile(path.join(root, 'desktop.ini'), 'authored settings');
    const runAttributes = vi.fn();
    expect(await markProjectFolder(root, { platform: 'win32', runAttributes })).toMatchObject({
      status: 'skipped',
      reason: 'existing-customization',
    });
    expect(await fs.readFile(path.join(root, 'desktop.ini'), 'utf8')).toBe('authored settings');
    expect(runAttributes).not.toHaveBeenCalled();
    await expect(fs.stat(path.join(root, '.huandeng'))).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('does not write through linked metadata folders', async () => {
    const entry = await prepare();
    const root = path.dirname(entry);
    const unrelated = path.join(temporary, 'unrelated');
    await fs.mkdir(unrelated);
    await fs.symlink(unrelated, path.join(root, '.huandeng'), 'junction');
    const runAttributes = vi.fn();
    expect(await markProjectFolder(root, { platform: 'win32', runAttributes })).toMatchObject({
      status: 'skipped',
      reason: 'linked-or-invalid-metadata',
    });
    expect(await fs.readdir(unrelated)).toEqual([]);
    expect(runAttributes).not.toHaveBeenCalled();
  });

  it('leaves other platforms as ordinary folders and tolerates a missing icon', async () => {
    const entry = await prepare();
    const root = path.dirname(entry);
    expect(await markProjectFolder(root, { platform: 'darwin' })).toEqual({
      status: 'unsupported',
    });
    await expect(fs.stat(path.join(root, 'desktop.ini'))).rejects.toMatchObject({ code: 'ENOENT' });
    expect(
      await markProjectFolder(root, {
        platform: 'win32',
        iconSource: path.join(temporary, 'missing.ico'),
      }),
    ).toMatchObject({ status: 'unavailable' });
    expect(await fs.readFile(entry, 'utf8')).toContain('pages/initial.page');
  });
});
