import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  FILE_IMAGE_PREVIEW_LIMIT,
  FILE_TEXT_PREVIEW_LIMIT,
  readProjectFileImage,
  readProjectFilePreview,
} from './project-file-preview';

const roots: string[] = [];
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==',
  'base64',
);
const webp = {
  VP8: 'UklGRjYAAABXRUJQVlA4ICoAAACQAQCdASoDAAIAAUAmJaACdLoAA5gA/vCQo+1KIKS1L/4tDrQ60M6QAAA=',
  VP8L: 'UklGRh4AAABXRUJQVlA4TBEAAAAvAkAAAAdQ3wJWuv+BiOh/AAA=',
  VP8X: 'UklGRlgAAABXRUJQVlA4WAoAAAAQAAAAAgAAAQAAQUxQSAcAAAAAZGRkZGRkAFZQOCAqAAAAkAEAnQEqAwACAAFAJiWgAnS6AAOYAP7wkKPtSiCktS/+LQ60OtDOkAAA',
};

async function root() {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'huandeng-file-preview-'));
  roots.push(directory);
  return directory;
}

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((directory) => fs.rm(directory, { recursive: true, force: true })),
  );
});

describe('read-only Project file previews', () => {
  it.each([
    ['notes.md', 'Markdown source'],
    ['data.json', 'JSON source'],
    ['commands.cmd', 'Command script source'],
    ['figure.py', 'Python source'],
    ['page.html', 'HTML source'],
  ])('returns %s as literal text without modifying the file', async (name, language) => {
    const directory = await root();
    const source = '<script>throw new Error("Do not execute")</script>\n# Title\n{"value": 3}\n';
    await fs.writeFile(path.join(directory, name), source);
    expect(await readProjectFilePreview(directory, name)).toMatchObject({
      kind: 'text',
      path: name,
      language,
      text: source,
      encoding: 'utf-8',
      truncated: false,
    });
    expect(await fs.readFile(path.join(directory, name), 'utf8')).toBe(source);
  });

  it('bounds text reads and avoids a broken UTF-8 character at the cutoff', async () => {
    const directory = await root();
    const source = `${'a'.repeat(FILE_TEXT_PREVIEW_LIMIT - 1)}幻灯`;
    await fs.writeFile(path.join(directory, 'long.txt'), source);
    const preview = await readProjectFilePreview(directory, 'long.txt');
    expect(preview).toMatchObject({
      kind: 'text',
      truncated: true,
      previewBytes: FILE_TEXT_PREVIEW_LIMIT,
    });
    if (preview.kind !== 'text') throw new Error('Expected text');
    expect(preview.text).toBe('a'.repeat(FILE_TEXT_PREVIEW_LIMIT - 1));
    expect(await fs.readFile(path.join(directory, 'long.txt'), 'utf8')).toBe(source);
  });

  it('reads BOM-marked UTF-16 and refuses binary bytes disguised as text', async () => {
    const directory = await root();
    await fs.writeFile(
      path.join(directory, 'unicode.txt'),
      Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from('A title · 标题', 'utf16le')]),
    );
    expect(await readProjectFilePreview(directory, 'unicode.txt')).toMatchObject({
      kind: 'text',
      text: 'A title · 标题',
      encoding: 'utf-16le',
    });
    await fs.writeFile(path.join(directory, 'binary.json'), Buffer.from([0x7b, 0, 0, 0x7d]));
    expect(await readProjectFilePreview(directory, 'binary.json')).toMatchObject({
      kind: 'unsupported',
    });
    await fs.writeFile(path.join(directory, 'invalid.txt'), Buffer.from([0xff, 0xff, 0xff]));
    expect(await readProjectFilePreview(directory, 'invalid.txt')).toMatchObject({
      kind: 'unsupported',
    });
  });

  it('previews an original image outside media without replacing its bytes', async () => {
    const directory = await root();
    await fs.mkdir(path.join(directory, 'figures'));
    await fs.writeFile(path.join(directory, 'figures/example.png'), png);
    const preview = await readProjectFilePreview(directory, 'figures\\example.png');
    expect(preview).toMatchObject({
      kind: 'image',
      path: 'figures/example.png',
      width: 1,
      height: 1,
      contentType: 'image/png',
    });
    if (preview.kind !== 'image') throw new Error('Expected image');
    const image = await readProjectFileImage(directory, preview.path, preview.revision);
    expect(image.data).toEqual(png);
    expect(await fs.readFile(path.join(directory, preview.path))).toEqual(png);
    await fs.writeFile(path.join(directory, preview.path), Buffer.concat([png, Buffer.from([0])]));
    await expect(
      readProjectFileImage(directory, preview.path, preview.revision),
    ).rejects.toMatchObject({ code: 'REVISION_CONFLICT' });
  });

  it.each(Object.entries(webp))(
    'reads %s WebP dimensions from source bytes',
    async (_kind, base64) => {
      const directory = await root();
      await fs.writeFile(path.join(directory, 'figure.webp'), Buffer.from(base64, 'base64'));
      expect(await readProjectFilePreview(directory, 'figure.webp')).toMatchObject({
        kind: 'image',
        width: 3,
        height: 2,
        contentType: 'image/webp',
      });
    },
  );

  it('rejects oversized image files, excessive pixel counts, and extension spoofing', async () => {
    const directory = await root();
    const handle = await fs.open(path.join(directory, 'large.png'), 'w');
    await handle.truncate(FILE_IMAGE_PREVIEW_LIMIT + 1);
    await handle.close();
    expect(await readProjectFilePreview(directory, 'large.png')).toMatchObject({
      kind: 'unsupported',
      bytes: FILE_IMAGE_PREVIEW_LIMIT + 1,
    });
    const largePixels = Buffer.from(png);
    largePixels.writeUInt32BE(50000, 16);
    largePixels.writeUInt32BE(50000, 20);
    await fs.writeFile(path.join(directory, 'large-pixels.png'), largePixels);
    expect(await readProjectFilePreview(directory, 'large-pixels.png')).toMatchObject({
      kind: 'unsupported',
    });
    await fs.writeFile(path.join(directory, 'fake.png'), '<svg><script>alert(1)</script></svg>');
    expect(await readProjectFilePreview(directory, 'fake.png')).toMatchObject({
      kind: 'unsupported',
    });
    await fs.writeFile(path.join(directory, 'binary.exe'), Buffer.from([1, 2, 3]));
    expect(await readProjectFilePreview(directory, 'binary.exe')).toMatchObject({
      kind: 'unsupported',
    });
  });

  it('rejects traversal, absolute paths, alternate streams, and missing files', async () => {
    const directory = await root();
    for (const source of [
      '../outside.txt',
      '/outside.txt',
      'C:\\outside.txt',
      '//server/file.txt',
      'file:///outside.txt',
      'notes.txt:stream',
      '',
    ])
      await expect(readProjectFilePreview(directory, source)).rejects.toMatchObject({
        code: 'PATH_OUTSIDE_PROJECT',
      });
    await expect(readProjectFilePreview(directory, 'missing.txt')).rejects.toMatchObject({
      code: 'TARGET_NOT_FOUND',
    });
    await fs.mkdir(path.join(directory, 'folder.json'));
    await expect(readProjectFilePreview(directory, 'folder.json')).rejects.toMatchObject({
      code: 'INVALID_REQUEST',
    });
  });

  it('does not follow an internal alias or an external directory link', async () => {
    const directory = await root();
    const outside = await root();
    await fs.mkdir(path.join(directory, 'inside'));
    await fs.writeFile(path.join(directory, 'inside/readme.md'), 'Inside');
    await fs.writeFile(path.join(outside, 'readme.md'), 'Outside must not be returned');
    const linkType = process.platform === 'win32' ? 'junction' : 'dir';
    await fs.symlink(path.join(directory, 'inside'), path.join(directory, 'alias'), linkType);
    await fs.symlink(outside, path.join(directory, 'external'), linkType);
    for (const source of ['alias/readme.md', 'external/readme.md'])
      await expect(readProjectFilePreview(directory, source)).rejects.toMatchObject({
        code: 'PATH_OUTSIDE_PROJECT',
      });
  });
});
