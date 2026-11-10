import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { hashBytes } from './persistence';
import {
  PROJECT_GUIDANCE_MAX_BYTES,
  PROJECT_GUIDANCE_MAX_CHARACTERS,
  readProjectGuidance,
} from './project-guidance';

const directories: string[] = [];
afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(
    directories.splice(0).map((directory) => fs.rm(directory, { recursive: true, force: true })),
  );
});

async function fixture() {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'huandeng-guidance-'));
  directories.push(directory);
  const root = path.join(directory, 'project');
  await fs.mkdir(root);
  return { directory, root, file: path.join(root, 'AGENTS.md') };
}

describe('bounded Project authoring guidance', () => {
  it('reads only the exact root AGENTS.md without discovering parent, nested or JSONL policies', async () => {
    const { directory, root, file } = await fixture();
    await fs.mkdir(path.join(root, 'nested'));
    await Promise.all([
      fs.writeFile(path.join(directory, 'AGENTS.md'), 'Parent policy'),
      fs.writeFile(path.join(root, 'nested/AGENTS.md'), 'Nested policy'),
      fs.writeFile(path.join(root, 'agent.md'), 'Singular alias'),
      fs.writeFile(path.join(root, 'agent.jsonl'), '{"feedback":"History only"}'),
    ]);
    expect(await readProjectGuidance(root)).toMatchObject({
      sourcePath: 'AGENTS.md',
      role: 'authoring-context',
      status: 'missing',
      revision: null,
      text: '',
      truncated: false,
    });
    const source = '# Authoring\nMake the central evidence readable.\n';
    await fs.writeFile(file, source);
    expect(await readProjectGuidance(root)).toMatchObject({
      status: 'available',
      text: source,
      revision: hashBytes(source),
      byteLength: Buffer.byteLength(source),
      truncated: false,
    });
    await fs.writeFile(file, '');
    expect(await readProjectGuidance(root)).toMatchObject({
      status: 'available',
      text: '',
      revision: hashBytes(''),
      byteLength: 0,
    });
  });

  it('does not accept a differently cased filename on case-insensitive filesystems', async () => {
    const { root } = await fixture();
    await fs.writeFile(path.join(root, 'agents.md'), 'Not the canonical filename');
    const guidance = await readProjectGuidance(root);
    expect(guidance.status).not.toBe('available');
    expect(guidance.text).toBe('');
  });

  it('hashes the complete accepted bytes while returning a bounded valid Unicode prefix', async () => {
    const { root, file } = await fixture();
    const source = `${'x'.repeat(PROJECT_GUIDANCE_MAX_CHARACTERS - 1)}😀 trailing rules`;
    await fs.writeFile(file, source);
    const guidance = await readProjectGuidance(root);
    expect(guidance).toMatchObject({
      status: 'available',
      revision: hashBytes(source),
      truncated: true,
      byteLength: Buffer.byteLength(source),
      limits: {
        maxBytes: PROJECT_GUIDANCE_MAX_BYTES,
        maxCharacters: PROJECT_GUIDANCE_MAX_CHARACTERS,
      },
    });
    expect(guidance.text).toBe('x'.repeat(PROJECT_GUIDANCE_MAX_CHARACTERS - 1));
    expect(guidance.revision).not.toBe(hashBytes(guidance.text));
  });

  it('rejects oversized input before opening it and invalid UTF-8 without returning partial rules', async () => {
    const { root, file } = await fixture();
    await fs.writeFile(file, Buffer.alloc(PROJECT_GUIDANCE_MAX_BYTES + 1, 65));
    const open = vi.spyOn(fs, 'open');
    expect(await readProjectGuidance(root)).toMatchObject({
      status: 'unavailable',
      reason: 'file-too-large',
      revision: null,
      text: '',
      truncated: true,
    });
    expect(open).not.toHaveBeenCalled();
    await fs.writeFile(file, Buffer.from([0xff, 0xfe]));
    expect(await readProjectGuidance(root)).toMatchObject({
      status: 'unavailable',
      reason: 'invalid-utf8',
      revision: null,
      text: '',
    });
  });

  it('rejects root links and directories without disclosing their contents or destinations', async () => {
    const { directory, root, file } = await fixture();
    const outside = path.join(directory, 'outside');
    await fs.mkdir(outside);
    await fs.writeFile(path.join(outside, 'private.txt'), 'Should not be read');
    await fs.symlink(outside, file, process.platform === 'win32' ? 'junction' : 'dir');
    const linked = await readProjectGuidance(root);
    expect(linked).toMatchObject({
      status: 'unavailable',
      reason: 'linked-file',
      text: '',
      revision: null,
    });
    expect(JSON.stringify(linked)).not.toContain(outside);
    await fs.unlink(file);
    await fs.mkdir(file);
    expect(await readProjectGuidance(root)).toMatchObject({
      status: 'unavailable',
      reason: 'not-regular-file',
      text: '',
    });
  });

  it('does not expose partial rules when the file changes during opening', async () => {
    const { root, file } = await fixture();
    await fs.writeFile(file, 'Before');
    const originalOpen = fs.open.bind(fs);
    vi.spyOn(fs, 'open').mockImplementationOnce(async (...args) => {
      const handle = await originalOpen(...args);
      await fs.writeFile(file, 'Changed source with different length');
      return handle;
    });
    expect(await readProjectGuidance(root)).toMatchObject({
      status: 'unavailable',
      reason: 'changed-during-read',
      revision: null,
      text: '',
    });
  });

  it('reports read failures with a bounded code and no private path or raw exception', async () => {
    const { root, file } = await fixture();
    await fs.writeFile(file, 'Readable only with permission');
    vi.spyOn(fs, 'open').mockRejectedValueOnce(
      Object.assign(new Error(`Access denied at ${file}`), { code: 'EACCES' }),
    );
    const guidance = await readProjectGuidance(root);
    expect(guidance).toMatchObject({
      status: 'unavailable',
      reason: 'read-error',
      text: '',
      revision: null,
    });
    expect(JSON.stringify(guidance)).not.toContain(root);
    expect(JSON.stringify(guidance)).not.toContain('Access denied');
  });
});
