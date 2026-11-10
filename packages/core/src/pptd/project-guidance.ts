import { constants, type Stats } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { hashBytes } from './persistence';
import type { ProjectAuthoringGuidance } from './types';

export const PROJECT_GUIDANCE_FILE = 'AGENTS.md';
export const PROJECT_GUIDANCE_MAX_BYTES = 64 * 1024;
export const PROJECT_GUIDANCE_MAX_CHARACTERS = 12_000;

function result(
  status: ProjectAuthoringGuidance['status'],
  fields: Partial<ProjectAuthoringGuidance> = {},
): ProjectAuthoringGuidance {
  return {
    sourcePath: PROJECT_GUIDANCE_FILE,
    role: 'authoring-context',
    status,
    revision: null,
    text: '',
    truncated: false,
    byteLength: null,
    limits: {
      maxBytes: PROJECT_GUIDANCE_MAX_BYTES,
      maxCharacters: PROJECT_GUIDANCE_MAX_CHARACTERS,
    },
    ...fields,
  };
}

function sameFile(left: Stats, right: Stats): boolean {
  return (
    right.isFile() &&
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.size === right.size &&
    left.mtimeMs === right.mtimeMs &&
    left.ctimeMs === right.ctimeMs
  );
}

function exactRootFile(root: string, actual: string): boolean {
  return path.relative(root, actual) === PROJECT_GUIDANCE_FILE;
}

export async function readProjectGuidance(root: string): Promise<ProjectAuthoringGuidance> {
  let found = false;
  let rootResolved = false;
  try {
    const directory = await fs.realpath(root);
    rootResolved = true;
    const candidate = path.join(directory, PROJECT_GUIDANCE_FILE);
    const before = await fs.lstat(candidate);
    found = true;
    if (before.isSymbolicLink()) return result('unavailable', { reason: 'linked-file' });
    if (!before.isFile()) return result('unavailable', { reason: 'not-regular-file' });
    const actual = await fs.realpath(candidate);
    if (!exactRootFile(directory, actual))
      return result('unavailable', { reason: 'path-mismatch' });
    if (before.size > PROJECT_GUIDANCE_MAX_BYTES)
      return result('unavailable', {
        reason: 'file-too-large',
        byteLength: before.size,
        truncated: true,
      });
    const handle = await fs.open(candidate, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
    try {
      const opened = await handle.stat();
      if (!sameFile(before, opened) || !exactRootFile(directory, await fs.realpath(candidate)))
        return result('unavailable', { reason: 'changed-during-read' });
      const buffer = Buffer.alloc(PROJECT_GUIDANCE_MAX_BYTES + 1);
      let length = 0;
      while (length < buffer.length) {
        const chunk = await handle.read(buffer, length, buffer.length - length, length);
        if (!chunk.bytesRead) break;
        length += chunk.bytesRead;
      }
      const after = await handle.stat();
      const current = await fs.lstat(candidate);
      if (
        current.isSymbolicLink() ||
        !sameFile(opened, after) ||
        !sameFile(after, current) ||
        !exactRootFile(directory, await fs.realpath(candidate)) ||
        length !== after.size
      )
        return result('unavailable', { reason: 'changed-during-read' });
      if (length > PROJECT_GUIDANCE_MAX_BYTES)
        return result('unavailable', {
          reason: 'file-too-large',
          byteLength: length,
          truncated: true,
        });
      const bytes = buffer.subarray(0, length);
      let text: string;
      try {
        text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      } catch {
        return result('unavailable', { reason: 'invalid-utf8', byteLength: length });
      }
      let end = Math.min(text.length, PROJECT_GUIDANCE_MAX_CHARACTERS);
      if (end < text.length && /[\uD800-\uDBFF]/.test(text[end - 1])) end--;
      return result('available', {
        revision: hashBytes(bytes),
        text: text.slice(0, end),
        truncated: end < text.length,
        byteLength: length,
      });
    } finally {
      await handle.close();
    }
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (rootResolved && !found && code === 'ENOENT') return result('missing');
    return result('unavailable', {
      reason: found && code === 'ENOENT' ? 'changed-during-read' : 'read-error',
    });
  }
}
