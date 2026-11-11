import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, expect, it } from 'vitest';
import { initializeProject } from './project-initialize.cjs';
import { openPptdStore } from './store';

const roots: string[] = [];
afterEach(async () => {
  for (const root of roots.splice(0)) await fs.rm(root, { recursive: true, force: true });
});

it('initializes a portable parseable Project and refuses to overwrite it', async () => {
  const parent = await fs.mkdtemp(path.join(os.tmpdir(), 'huandeng-init-'));
  roots.push(parent);
  const directory = path.join(parent, 'A new Project');
  const created = await initializeProject(directory, { title: 'A clear "story"' });
  const store = await openPptdStore({ entryPath: created.entry, readOnly: true });
  expect(store.getSnapshot().pages).toHaveLength(1);
  expect(store.getSnapshot().title).toBe('A clear "story"');
  await store.close();
  const guidance = await fs.readFile(path.join(directory, 'AGENTS.md'), 'utf8');
  for (const requirement of [
    'mission',
    'reasoning input',
    'native table',
    'bilingual editions',
    'acknowledgments',
  ])
    expect(guidance).toContain(requirement);
  expect(guidance).not.toContain('Start with white backgrounds');
  expect(guidance).not.toContain('Keep ordinary backgrounds white');
  await fs.appendFile(created.entry, '# Preserve this authored content\n');
  await expect(initializeProject(directory)).rejects.toMatchObject({ code: 'EEXIST' });
  expect(await fs.readFile(created.entry, 'utf8')).toContain('Preserve this authored content');
});
