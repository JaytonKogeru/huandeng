import fs, { type FileHandle } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { assetSources, readProjectAsset } from './export-environment';

const directories: string[] = [];
const opened: FileHandle[] = [];

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.allSettled(opened.splice(0).map((handle) => handle.close()));
  await Promise.all(
    directories.splice(0).map((directory) => fs.rm(directory, { recursive: true, force: true })),
  );
});

async function fixture(bytes = Buffer.from('0123456789')) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'huandeng-asset-read-'));
  directories.push(root);
  await fs.mkdir(path.join(root, 'media'));
  const file = path.join(root, 'media/source.png');
  await fs.writeFile(file, bytes);
  return { root, file, bytes };
}

function observeOpen(prepare?: (handle: FileHandle) => void) {
  const open = fs.open.bind(fs);
  vi.spyOn(fs, 'open').mockImplementation(async (...args) => {
    const handle = await open(...args);
    opened.push(handle);
    prepare?.(handle);
    return handle;
  });
}

describe('semantic export asset references', () => {
  it('collects source fields while leaving authored folder names and examples as text', () => {
    const embedded = 'data:image/png;base64,AQ==';
    const value = {
      title: 'media/title.png',
      notes: 'assets/notes.svg',
      elements: [
        {
          type: 'table',
          rows: [
            ['pages/', 'media/', '.huandeng/', 'Exports/', 'media/example.png'].map((text) => ({
              text,
            })),
          ],
        },
        { type: 'image', src: 'media/actual.png', sourceName: 'media/original-name.png' },
        { type: 'image', content: { src: embedded } },
      ],
      background: { src: './media/background.png' },
      theme: { fonts: [{ url: 'assets/face.woff2' }] },
    };
    expect([...assetSources(value)]).toEqual([
      'media/actual.png',
      embedded,
      './media/background.png',
      'assets/face.woff2',
    ]);
  });
});

describe('bounded project asset reads', () => {
  it.each([Buffer.from([0, 255, 41, 0, 62]), Buffer.alloc(0)])(
    'returns exact bytes and closes the opened handle',
    async (bytes) => {
      const { root } = await fixture(bytes);
      observeOpen();
      expect((await readProjectAsset(root, 'media/source.png')).equals(bytes)).toBe(true);
      expect(opened).toHaveLength(1);
      expect(opened[0].fd).toBe(-1);
    },
  );

  it('fills the bounded buffer across partial reads before checking one extra byte', async () => {
    const { root, bytes } = await fixture();
    observeOpen((handle) => {
      const read = handle.read.bind(handle);
      vi.spyOn(handle, 'read').mockImplementation(((
        buffer: Buffer,
        offset: number,
        length: number,
        position: number,
      ) => read(buffer, offset, Math.min(3, length), position)) as FileHandle['read']);
    });
    expect((await readProjectAsset(root, 'media/source.png')).equals(bytes)).toBe(true);
    expect(opened[0].read).toHaveBeenCalledTimes(5);
    expect(opened[0].fd).toBe(-1);
  });

  it.each(['grow', 'shrink'] as const)(
    'rejects a file that changes size after handle.stat (%s) and closes the handle',
    async (change) => {
      const { root, file } = await fixture();
      observeOpen((handle) => {
        const stat = handle.stat.bind(handle);
        vi.spyOn(handle, 'stat').mockImplementation(async () => {
          const original = await stat();
          if (change === 'grow') await fs.appendFile(file, Buffer.from('extra'));
          else await fs.truncate(file, 3);
          return original;
        });
      });
      await expect(readProjectAsset(root, 'media/source.png')).rejects.toMatchObject({
        code: 'REVISION_CONFLICT',
      });
      expect(opened[0].fd).toBe(-1);
    },
  );

  it('rejects oversized files before reading or allocating their contents and closes the handle', async () => {
    const { root, file } = await fixture();
    await fs.truncate(file, 64 * 1024 * 1024 + 1);
    observeOpen((handle) => {
      vi.spyOn(handle, 'read');
    });
    await expect(readProjectAsset(root, 'media/source.png')).rejects.toMatchObject({
      code: 'INVALID_REQUEST',
    });
    expect(opened[0].read).not.toHaveBeenCalled();
    expect(opened[0].fd).toBe(-1);
  });

  it('closes its handle when a filesystem read itself fails', async () => {
    const { root } = await fixture();
    observeOpen((handle) => {
      vi.spyOn(handle, 'read').mockRejectedValue(
        Object.assign(new Error('Synthetic read failure'), { code: 'EIO' }),
      );
    });
    await expect(readProjectAsset(root, 'media/source.png')).rejects.toMatchObject({ code: 'EIO' });
    expect(opened[0].fd).toBe(-1);
  });
});
