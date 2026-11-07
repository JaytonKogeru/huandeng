import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { importImage } from './asset-import';
import { hashBytes } from './persistence';

const roots: string[] = [];
const png =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==';
const gif = 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
const webp = {
  VP8: 'UklGRjYAAABXRUJQVlA4ICoAAACQAQCdASoDAAIAAUAmJaACdLoAA5gA/vCQo+1KIKS1L/4tDrQ60M6QAAA=',
  VP8L: 'UklGRh4AAABXRUJQVlA4TBEAAAAvAkAAAAdQ3wJWuv+BiOh/AAA=',
  VP8X: 'UklGRlgAAABXRUJQVlA4WAoAAAAQAAAAAgAAAQAAQUxQSAcAAAAAZGRkZGRkAFZQOCAqAAAAkAEAnQEqAwACAAFAJiWgAnS6AAOYAP7wkKPtSiCktS/+LQ60OtDOkAAA',
};
const jpeg =
  '/9j/4AAQSkZJRgABAQAAAQABAAD/4QAiRXhpZgAATU0AKgAAAAgAAQESAAMAAAABAAYAAAAAAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAACAAMDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDrqKKK9I8I/9k=';

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })));
});

async function root() {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'huandeng-assets-'));
  roots.push(directory);
  return directory;
}

async function svg(source: string) {
  return importImage(await root(), {
    name: 'figure.svg',
    base64: Buffer.from(source).toString('base64'),
  });
}

describe('image import identity, dimensions and immutability', () => {
  it.each([
    ['png', png, 1, 1],
    ['gif', gif, 1, 1],
    ['jpg', jpeg, 2, 3],
    ...Object.values(webp).map((base64) => ['webp', base64, 3, 2]),
  ])(
    'reads %s from its real bytes and preserves the decoded aspect ratio',
    async (extension, base64, width, height) => {
      const directory = await root();
      const input = { name: 'C:\\untrusted\\wrong-extension.txt', base64 };
      const result = await importImage(directory, input);
      expect(result).toMatchObject({ width, height, name: 'wrong-extension.txt' });
      expect(result.path).toBe(
        `media/imported/${hashBytes(Buffer.from(String(base64), 'base64')).slice(7)}.${extension}`,
      );
      expect(await fs.readFile(path.join(directory, result.path))).toEqual(
        Buffer.from(String(base64), 'base64'),
      );
    },
  );

  it('deduplicates concurrent imports and refuses to replace altered existing content', async () => {
    const directory = await root();
    const imported = await Promise.all(
      Array.from({ length: 6 }, (_, index) =>
        importImage(directory, { name: `copy-${index}.png`, base64: png }),
      ),
    );
    expect(new Set(imported.map((image) => image.path)).size).toBe(1);
    expect(await fs.readdir(path.join(directory, 'media/imported'))).toHaveLength(1);
    const destination = path.join(directory, imported[0].path);
    const changed = Buffer.from('User changed this file.');
    await fs.writeFile(destination, changed);
    await expect(importImage(directory, { name: 'again.png', base64: png })).rejects.toMatchObject({
      code: 'INVALID_DOCUMENT',
    });
    expect(await fs.readFile(destination)).toEqual(changed);
  });

  it('refuses unsupported, malformed base64 and truncated image data without writing files', async () => {
    const directory = await root();
    const truncatedWebp = Buffer.from(webp.VP8X, 'base64').subarray(0, 30).toString('base64');
    const cases = [
      '',
      'A',
      '!!!!',
      Buffer.from('not an image').toString('base64'),
      Buffer.from(png, 'base64').subarray(0, 24).toString('base64'),
      truncatedWebp,
    ];
    for (const base64 of cases)
      await expect(importImage(directory, { name: 'pretend.png', base64 })).rejects.toMatchObject({
        code: 'INVALID_REQUEST',
      });
    expect(await fs.readdir(directory)).toEqual([]);
  });

  it('rejects a symlink escaping the project', async () => {
    const directory = await root();
    const outside = await root();
    await fs.symlink(outside, path.join(directory, 'media'), 'junction');
    await expect(importImage(directory, { name: 'figure.png', base64: png })).rejects.toMatchObject(
      { code: 'PATH_OUTSIDE_PROJECT' },
    );
    expect(await fs.readdir(outside)).toEqual([]);
  });
});

describe('static self-contained SVG imports', () => {
  it('keeps internal gradients, clip paths, text and embedded raster pixels unchanged', async () => {
    const source = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 120"><defs><linearGradient id="g"><stop offset="0" stop-color="red"/></linearGradient></defs><style>.cell {fill:url(#g)}</style><rect class="cell" width="240" height="120"/><text>A &amp; B</text><image href="data:image/png;base64,${png}" width="1" height="1"/></svg>`;
    const directory = await root();
    const result = await importImage(directory, {
      name: 'science.svg',
      base64: Buffer.from(source).toString('base64'),
    });
    expect(result).toMatchObject({ width: 240, height: 120 });
    expect(await fs.readFile(path.join(directory, result.path), 'utf8')).toBe(source);
  });

  it('respects explicit physical dimensions before viewBox and derives a missing dimension', async () => {
    expect(await svg('<svg width="2in" height="1in" viewBox="0 0 10 10"/>')).toMatchObject({
      width: 192,
      height: 96,
    });
    expect(await svg('<svg width="240" viewBox="0 0 4 3"/>')).toMatchObject({
      width: 240,
      height: 180,
    });
    expect(await svg('<svg height="90pt" viewBox="0 0 4 3"/>')).toMatchObject({
      width: 160,
      height: 120,
    });
    expect(await svg('<svg width="100%" height="100%" viewBox="0 0 40 30"/>')).toMatchObject({
      width: 40,
      height: 30,
    });
  });

  it.each([
    '<svg><script>alert(1)</script></svg>',
    '<svg><foreignObject><div>HTML</div></foreignObject></svg>',
    '<svg onload="alert(1)"/>',
    '<svg><image href="https://example.com/figure.png"/></svg>',
    '<svg><image href="../figure.png"/></svg>',
    '<svg><image href="&#x68;ttps://example.com/figure.png"/></svg>',
    '<svg><style>@import "https://example.com/style.css";</style></svg>',
    '<svg><style><![CDATA[@im]]><![CDATA[port "https://example.com/style.css";]]></style></svg>',
    '<svg><rect style="fill: u\\72 l(https://example.com/image.svg)"/></svg>',
    '<svg><rect fill="url(https://example.com/image.svg#shape)"/></svg>',
    '<svg xml:base="https://example.com/"><use href="#shape"/></svg>',
    '<svg><set attributeName="href" to="https://example.com/image.png"/></svg>',
    '<!DOCTYPE svg [<!ENTITY figure SYSTEM "file:///private">]><svg>&figure;</svg>',
    '<?xml-stylesheet href="https://example.com/style.css"?><svg/>',
    '<html><svg/></html>',
    '<svg/><svg/>',
    '<svg><g></svg>',
    '<svg width="-4" height="2"/>',
    '<svg viewBox="0 0 4 0"/>',
  ])('rejects SVG with active, external or malformed content (%#)', async (source) => {
    await expect(svg(source)).rejects.toMatchObject({ code: 'INVALID_REQUEST' });
  });
});
