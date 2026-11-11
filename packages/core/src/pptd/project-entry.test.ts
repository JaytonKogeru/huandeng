import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resolveProjectEntry } from './project-entry.cjs';

let parent: string;
beforeEach(async () => {
  parent = await fs.mkdtemp(path.join(os.tmpdir(), 'huandeng-entry-'));
});
afterEach(async () => {
  await fs.rm(parent, { recursive: true, force: true });
});
async function folder(name = '研究 Project.huandeng') {
  const root = path.join(parent, name);
  await fs.mkdir(root);
  return root;
}

describe('Project file or folder entry', () => {
  it('opens a unique arbitrary manifest without creating or changing project files', async () => {
    const root = await folder();
    const entry = path.join(root, '研究.PPTD');
    const source = '# authored manifest\npages: []\n';
    await fs.writeFile(entry, source);
    await fs.writeFile(path.join(root, 'keep.txt'), 'authored extra');
    const before = (await fs.readdir(root)).sort();
    expect(await resolveProjectEntry(root)).toBe(await fs.realpath(entry));
    expect(await resolveProjectEntry(entry)).toBe(await fs.realpath(entry));
    expect((await fs.readdir(root)).sort()).toEqual(before);
    expect(await fs.readFile(entry, 'utf8')).toBe(source);
  });

  it('does not search child folders, initialize an empty target, or accept another file type', async () => {
    const root = await folder('ordinary');
    const child = path.join(root, 'child');
    await fs.mkdir(child);
    await fs.writeFile(path.join(child, 'deck.pptd'), 'pages: []\n');
    await fs.writeFile(path.join(root, 'notes.txt'), 'keep');
    await expect(resolveProjectEntry(root)).rejects.toMatchObject({
      code: 'PROJECT_ENTRY_MISSING',
    });
    await expect(resolveProjectEntry(path.join(root, 'notes.txt'))).rejects.toMatchObject({
      code: 'INVALID_PROJECT_PATH',
    });
    await expect(resolveProjectEntry(path.join(root, 'missing'))).rejects.toMatchObject({
      code: 'ENOENT',
    });
    expect((await fs.readdir(root)).sort()).toEqual(['child', 'notes.txt']);
  });

  it('requires an explicit file when deck.pptd and another manifest coexist', async () => {
    const root = await folder();
    const entry = path.join(root, 'deck.pptd');
    await fs.writeFile(entry, 'pages: []\n');
    await fs.writeFile(path.join(root, 'alternate.pptd'), 'pages: []\n');
    await expect(resolveProjectEntry(root)).rejects.toMatchObject({
      code: 'PROJECT_ENTRY_AMBIGUOUS',
      candidates: ['alternate.pptd', 'deck.pptd'],
    });
    expect(await resolveProjectEntry(entry)).toBe(await fs.realpath(entry));
  });

  it('canonicalizes a folder alias and rejects an entry link outside its folder', async () => {
    const root = await folder();
    const entry = path.join(root, 'deck.pptd');
    await fs.writeFile(entry, 'pages: []\n');
    const alias = path.join(parent, 'project alias');
    await fs.symlink(root, alias, process.platform === 'win32' ? 'junction' : 'dir');
    expect(await resolveProjectEntry(alias)).toBe(await fs.realpath(entry));
    const other = await folder('another');
    await fs.symlink(
      root,
      path.join(other, 'linked.pptd'),
      process.platform === 'win32' ? 'junction' : 'dir',
    );
    await expect(resolveProjectEntry(other)).rejects.toMatchObject({
      code: 'PROJECT_ENTRY_LINKED',
    });
    expect(await fs.readFile(entry, 'utf8')).toBe('pages: []\n');
  });

  it('rejects malformed inputs before interpreting them as local paths', async () => {
    for (const value of ['', '   ', '--entry', 'bad\0path'])
      await expect(resolveProjectEntry(value)).rejects.toMatchObject({
        code: 'INVALID_PROJECT_PATH',
      });
  });
});
