import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { createProject } = require('./project.cjs');
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
