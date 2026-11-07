import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { atomicWrite } from './persistence';

const temporary: string[] = [];
const platform = Object.getOwnPropertyDescriptor(process, 'platform');

afterEach(async () => {
  vi.restoreAllMocks();
  if (platform) Object.defineProperty(process, 'platform', platform);
  await Promise.all(
    temporary.splice(0).map((directory) => fs.rm(directory, { recursive: true, force: true })),
  );
});

async function fixture() {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'huandeng-atomic-write-'));
  temporary.push(directory);
  const file = path.join(directory, 'one.page');
  await fs.writeFile(file, 'before');
  Object.defineProperty(process, 'platform', { ...platform, value: 'win32' });
  return { directory, file };
}

function sharingError(code = 'EPERM') {
  return Object.assign(new Error(`Simulated Windows rename ${code}`), { code, syscall: 'rename' });
}

describe('atomic replacement under Windows sharing errors', () => {
  it('finishes after a temporary lock outlasts the previous 150 ms retry window', async () => {
    const { directory, file } = await fixture();
    const original = fs.rename.bind(fs);
    let remaining = 4;
    const rename = vi.spyOn(fs, 'rename').mockImplementation(async (from, to) => {
      if (remaining-- > 0) throw sharingError();
      return original(from, to);
    });
    await atomicWrite(file, 'after', { expected: 'before' });
    expect(rename).toHaveBeenCalledTimes(5);
    expect(await fs.readFile(file, 'utf8')).toBe('after');
    expect(await fs.readdir(directory)).toEqual(['one.page']);
  });

  it('refuses a third-party edit made during the retry window', async () => {
    const { directory, file } = await fixture();
    const rename = vi.spyOn(fs, 'rename').mockImplementation(async () => {
      await fs.writeFile(file, 'external third state');
      throw sharingError();
    });
    await expect(atomicWrite(file, 'after', { expected: 'before' })).rejects.toMatchObject({
      code: 'RECOVERY_REQUIRED',
    });
    expect(rename).toHaveBeenCalledTimes(1);
    expect(await fs.readFile(file, 'utf8')).toBe('external third state');
    expect(await fs.readdir(directory)).toEqual(['one.page']);
  });

  it('stops a persistent sharing failure while preserving the original file', async () => {
    const { directory, file } = await fixture();
    vi.spyOn(fs, 'rename').mockImplementation(async () => {
      throw sharingError();
    });
    await expect(atomicWrite(file, 'after', { expected: 'before' })).rejects.toMatchObject({
      code: 'EPERM',
      renameAttempts: expect.any(Number),
      renameWaitMs: expect.any(Number),
    });
    expect(await fs.readFile(file, 'utf8')).toBe('before');
    expect(await fs.readdir(directory)).toEqual(['one.page']);
  });

  it('accepts an already installed after-state without replacing it again', async () => {
    const { file } = await fixture();
    await fs.writeFile(file, 'after');
    const rename = vi.spyOn(fs, 'rename');
    await atomicWrite(file, 'after', { expected: 'before' });
    expect(rename).not.toHaveBeenCalled();
    expect(await fs.readFile(file, 'utf8')).toBe('after');
  });

  it('does not retry unrelated I/O failures', async () => {
    const { file } = await fixture();
    const rename = vi.spyOn(fs, 'rename').mockRejectedValue(sharingError('EIO'));
    await expect(atomicWrite(file, 'after', { expected: 'before' })).rejects.toMatchObject({
      code: 'EIO',
      renameAttempts: 1,
    });
    expect(rename).toHaveBeenCalledTimes(1);
    expect(await fs.readFile(file, 'utf8')).toBe('before');
  });
});
