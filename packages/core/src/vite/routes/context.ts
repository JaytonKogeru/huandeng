import fs from 'node:fs/promises';
import path from 'node:path';
import { resolveSlideEntry } from '../../editing/slide-ops.ts';
import { foldersManifestPath } from '../../files/folders.ts';

export { BodyTooLargeError, json, readBody } from '../../pptd/http.ts';

export type ApiContext = {
  userCwd: string;
  slidesDir: string;
  slidesRoot: string;
  globalAssetsRoot: string;
  manifestPath: string;
  coreVersion: string;
  agentEnabled: boolean;
};

export type ApiPluginOptions = {
  userCwd: string;
  slidesDir?: string;
  assetsDir?: string;
  coreVersion: string;
  agentEnabled: boolean;
};

export function makeContext(opts: ApiPluginOptions): ApiContext {
  const userCwd = opts.userCwd;
  const slidesDir = opts.slidesDir ?? 'slides';
  const assetsDir = opts.assetsDir ?? 'assets';
  const slidesRoot = path.resolve(userCwd, slidesDir);
  const globalAssetsRoot = path.resolve(userCwd, assetsDir);
  const manifestPath = foldersManifestPath(slidesRoot);
  return {
    userCwd,
    slidesDir,
    slidesRoot,
    globalAssetsRoot,
    manifestPath,
    coreVersion: opts.coreVersion,
    agentEnabled: opts.agentEnabled,
  };
}

export function resolveSlideEntryPath(ctx: ApiContext, slideId: string): string | null {
  return resolveSlideEntry(ctx.slidesRoot, slideId);
}

export async function readSlideSource(file: string): Promise<string | null> {
  try {
    return await fs.readFile(file, 'utf8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw err;
  }
}
