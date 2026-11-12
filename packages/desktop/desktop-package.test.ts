import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  desktopSourceMapBytes,
  pruneDesktopSourceMaps,
} from '../../scripts/prune-desktop-sourcemaps.mjs';

const repository = fileURLToPath(new URL('../../', import.meta.url));
const sourceMap = JSON.stringify({ version: 3, sources: ['original.ts'], mappings: 'AAAA' });
let stage: string;
let application: string;
let modules: string;

beforeEach(async () => {
  await fs.mkdir(path.join(repository, '.verification'), { recursive: true });
  stage = await fs.mkdtemp(path.join(repository, '.verification', 'desktop-package-map-test-'));
  application = path.join(stage, 'resources', 'app');
  modules = path.join(application, 'node_modules');
  await fs.mkdir(modules, { recursive: true });
  await fs.writeFile(
    path.join(application, 'package.json'),
    JSON.stringify({ name: '@huandeng/desktop' }),
  );
});

afterEach(async () => {
  await fs.rm(stage, { recursive: true, force: true });
});

describe('Desktop build source maps', () => {
  it('removes external maps while preserving executable bytes, types, notices, assets and other map data', async () => {
    const runtime = 'export const answer = 42;\n//# sourceMappingURL=runtime.mjs.map\n';
    const preserved = new Map([
      ['runtime.mjs', runtime],
      ['runtime.d.ts', 'export declare const answer: number;\n'],
      ['LICENSE', 'Original license and copyright\n'],
      ['NOTICE.map', sourceMap],
      ['geography.map', JSON.stringify({ version: 3, tiles: [1, 2, 3] })],
      ['unrecognized.map', 'Original non-JSON asset'],
      ['font.woff2', 'Unchanged font bytes'],
    ]);
    for (const [name, content] of preserved) await fs.writeFile(path.join(modules, name), content);
    const removable = ['runtime.mjs.map', 'style.css.map', 'runtime.d.ts.map'];
    for (const name of removable) await fs.writeFile(path.join(modules, name), sourceMap);
    const pluginMap = path.join(application, 'plugin-source.js.map');
    await fs.writeFile(pluginMap, sourceMap);

    expect(await pruneDesktopSourceMaps(application)).toEqual({
      files: 3,
      bytes: Buffer.byteLength(sourceMap) * 3,
    });
    for (const name of removable)
      await expect(fs.access(path.join(modules, name))).rejects.toThrow();
    for (const [name, content] of preserved)
      expect(await fs.readFile(path.join(modules, name), 'utf8')).toBe(content);
    expect(await fs.readFile(pluginMap, 'utf8')).toBe(sourceMap);
    expect((await import(pathToFileURL(path.join(modules, 'runtime.mjs')).href)).answer).toBe(42);
    expect(await pruneDesktopSourceMaps(application)).toEqual({ files: 0, bytes: 0 });
  });

  it('rejects installed or unrelated directories before touching their maps', async () => {
    const other = path.join(stage, 'installed', 'resources', 'app');
    await fs.mkdir(path.join(other, 'node_modules'), { recursive: true });
    await fs.writeFile(
      path.join(other, 'package.json'),
      JSON.stringify({ name: '@huandeng/desktop' }),
    );
    const file = path.join(other, 'node_modules', 'runtime.js.map');
    await fs.writeFile(file, sourceMap);
    await expect(pruneDesktopSourceMaps(other)).rejects.toThrow('isolated desktop package stage');
    expect(await fs.readFile(file, 'utf8')).toBe(sourceMap);
  });

  it('does not follow dependency links outside the staged application', async () => {
    const outside = path.join(stage, 'external-dependency');
    await fs.mkdir(outside);
    const file = path.join(outside, 'runtime.js.map');
    await fs.writeFile(file, sourceMap);
    await fs.symlink(
      outside,
      path.join(modules, 'linked'),
      process.platform === 'win32' ? 'junction' : 'dir',
    );
    expect(await desktopSourceMapBytes(file)).toBe(Buffer.byteLength(sourceMap));
    expect(await pruneDesktopSourceMaps(application)).toEqual({ files: 0, bytes: 0 });
    expect(await fs.readFile(file, 'utf8')).toBe(sourceMap);
  });
});
