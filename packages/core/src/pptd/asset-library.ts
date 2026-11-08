import fs from 'node:fs/promises';
import path from 'node:path';
import { pageLabel } from './project-insights';
import { type DeckSnapshot, PptdError, type Revision } from './types';

export interface AssetUsage {
  pageId: string;
  pageLabel: string;
  legacyLabel?: string;
  pageRevision: Revision;
  scope: 'element' | 'page' | 'theme' | 'manifest';
  elementId?: string;
  elementType?: string;
  sourceName?: string;
  field: string;
  reference: string;
}

export interface AssetLibraryItem {
  path: string;
  name: string;
  displayName: string;
  kind: 'image' | 'font' | 'document' | 'other';
  status: 'available' | 'missing' | 'unavailable';
  previewable: boolean;
  previewRevision: string | null;
  bytes: number | null;
  usage: AssetUsage[];
}

export interface AssetLibraryOptions {
  query?: string;
  filter?: 'all' | 'used' | 'unused' | 'missing';
  kind?: 'all' | 'image';
  pageId?: string;
  offset?: number;
  limit?: number;
}

export interface AssetLibraryResult {
  items: AssetLibraryItem[];
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
  counts: { all: number; used: number; unused: number; missing: number };
  truncated: boolean;
  scan: { visited: number; entryLimit: number; depthLimit: number; warnings: string[] };
  scope: 'current-main';
  manifestRevision: Revision;
  metadataRevision: Revision | null;
}

function localReference(source: string): boolean {
  return !!source && !/^(?:https?:|data:|blob:|#)/i.test(source);
}

function canonicalPath(source: string): string | null {
  const normalized = source.replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\//, '');
  if (!/^(media|assets)\//.test(normalized) || normalized.includes('\0')) return null;
  const parts = normalized.split('/');
  if (parts.some((part) => !part || part === '.' || part === '..' || part.includes(':')))
    return null;
  return normalized;
}

function kindOf(source: string): AssetLibraryItem['kind'] {
  const extension = path.posix.extname(source).toLowerCase();
  if (['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'].includes(extension)) return 'image';
  if (['.woff', '.woff2', '.ttf', '.otf'].includes(extension)) return 'font';
  if (['.pdf', '.pptx', '.json', '.csv', '.txt'].includes(extension)) return 'document';
  return 'other';
}

function references(value: unknown, callback: (source: string, field: string) => void, field = '') {
  if (Array.isArray(value)) {
    value.forEach((child, index) => {
      references(child, callback, `${field}[${index}]`);
    });
  } else if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      const childField = field ? `${field}.${key}` : key;
      if ((key === 'src' || key === 'url') && typeof child === 'string' && localReference(child))
        callback(child, childField);
      else if (child && typeof child === 'object') references(child, callback, childField);
    }
  }
}

function readOptions(options: AssetLibraryOptions) {
  const { query = '', filter = 'all', kind = 'all', pageId, offset = 0, limit = 100 } = options;
  if (typeof query !== 'string' || query.length > 256)
    throw new PptdError('INVALID_REQUEST', 'Asset search must contain at most 256 characters.');
  if (!['all', 'image'].includes(kind))
    throw new PptdError('INVALID_REQUEST', 'Unknown asset kind.');
  if (!['all', 'used', 'unused', 'missing'].includes(filter))
    throw new PptdError('INVALID_REQUEST', 'Unknown asset filter.');
  if (
    !Number.isSafeInteger(offset) ||
    offset < 0 ||
    !Number.isSafeInteger(limit) ||
    limit < 1 ||
    limit > 200
  )
    throw new PptdError(
      'INVALID_REQUEST',
      'Asset offset must be nonnegative and limit must be between 1 and 200.',
    );
  if (pageId !== undefined && (typeof pageId !== 'string' || !pageId || pageId.length > 128))
    throw new PptdError('INVALID_REQUEST', 'Asset pageId must be a stable page UUID.');
  return { query: query.trim().toLowerCase(), filter, kind, pageId, offset, limit };
}

async function safeStats(root: string, relative: string) {
  let current = root;
  const parts = relative.split('/');
  for (let index = 0; index < parts.length; index++) {
    current = path.join(current, parts[index]);
    const stats = await fs.lstat(current);
    if (stats.isSymbolicLink())
      throw new PptdError('PATH_OUTSIDE_PROJECT', 'Symbolic links are not indexed.');
    if (index < parts.length - 1 && !stats.isDirectory()) return null;
    if (index === parts.length - 1) return stats.isFile() ? stats : null;
  }
  return null;
}

export async function readAssetLibrary(
  root: string,
  snapshot: DeckSnapshot,
  options: AssetLibraryOptions = {},
  limits: { maxEntries?: number; maxDepth?: number } = {},
): Promise<AssetLibraryResult> {
  const { query, filter, kind, pageId, offset, limit } = readOptions(options);
  const entryLimit = Math.max(1, Math.min(limits.maxEntries ?? 3000, 3000));
  const depthLimit = Math.max(1, Math.min(limits.maxDepth ?? 6, 6));
  const directory = await fs.realpath(root);
  const assets = new Map<string, AssetLibraryItem>();
  const revisions = new Map<string, Set<Revision>>();
  const warnings = new Set<string>();
  let visited = 0;
  let truncated = false;
  const ensure = (source: string): AssetLibraryItem => {
    const canonical = canonicalPath(source);
    const key = canonical ?? source;
    let asset = assets.get(key);
    if (!asset) {
      const name = source.replace(/\\/g, '/').split('/').at(-1) || source;
      asset = {
        path: key,
        name,
        displayName: name,
        kind: kindOf(key),
        status: canonical ? 'missing' : 'unavailable',
        previewable: false,
        previewRevision: null,
        bytes: null,
        usage: [],
      };
      assets.set(key, asset);
    }
    return asset;
  };
  for (const page of snapshot.pages.filter((page) => page.state === 'active')) {
    const base = {
      pageId: page.pageId,
      pageLabel: pageLabel(page),
      ...(page.metadata.label ? { legacyLabel: page.metadata.label } : {}),
      pageRevision: page.pageRevision,
    };
    const add = (
      source: string,
      field: string,
      usage: Omit<AssetUsage, keyof typeof base | 'field' | 'reference'>,
    ) => {
      const asset = ensure(source);
      asset.usage.push({ ...base, ...usage, field, reference: source });
      if (usage.sourceName && asset.displayName === asset.name)
        asset.displayName = usage.sourceName;
    };
    for (const element of page.data.elements) {
      const sourceName =
        typeof element.sourceName === 'string' ? element.sourceName : element.content?.sourceName;
      references(element, (source, field) =>
        add(source, field, {
          scope: 'element',
          elementId: element.elementId,
          elementType: element.elementType,
          ...(typeof sourceName === 'string' ? { sourceName } : {}),
        }),
      );
    }
    const { elements: _elements, ...pageFields } = page.data;
    references(pageFields, (source, field) => add(source, field, { scope: 'page' }));
    const { theme, ...manifestFields } = snapshot.manifest;
    references(page.metadata.themeOverride ?? theme, (source, field) =>
      add(source, field, { scope: 'theme' }),
    );
    references(manifestFields, (source, field) => add(source, field, { scope: 'manifest' }));
    for (const [source, revision] of Object.entries(page.assetRevisions ?? {})) {
      if (!localReference(source)) continue;
      const asset = ensure(source);
      if (revision) {
        const known = revisions.get(asset.path) ?? new Set<Revision>();
        known.add(revision);
        revisions.set(asset.path, known);
      }
      if (!asset.usage.some((usage) => usage.pageId === page.pageId))
        add(source, '', { scope: 'page' });
    }
  }
  const walk = async (relative: string, depth: number): Promise<void> => {
    let handle: Awaited<ReturnType<typeof fs.opendir>>;
    try {
      const stats = await fs.lstat(path.join(directory, relative));
      if (stats.isSymbolicLink() || !stats.isDirectory()) {
        warnings.add(`${relative}: symbolic links and non-directories are not scanned.`);
        return;
      }
      const real = await fs.realpath(path.join(directory, relative));
      const within = path.relative(directory, real);
      if (within.startsWith('..') || path.isAbsolute(within)) return;
      handle = await fs.opendir(real);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT')
        warnings.add(`${relative}: directory could not be read.`);
      return;
    }
    for await (const entry of handle) {
      if (entry.name.startsWith('.') || entry.isSymbolicLink()) continue;
      if (visited >= entryLimit) {
        truncated = true;
        return;
      }
      visited++;
      const file = `${relative}/${entry.name}`;
      if (entry.isDirectory()) {
        if (depth >= depthLimit) truncated = true;
        else await walk(file, depth + 1);
      } else if (entry.isFile()) ensure(file);
    }
  };
  await walk('media', 1);
  await walk('assets', 1);
  const inspect = async (asset: AssetLibraryItem) => {
    const relative = canonicalPath(asset.path);
    if (!relative) return;
    try {
      const stats = await safeStats(directory, relative);
      if (stats) {
        asset.status = 'available';
        asset.bytes = stats.size;
        asset.previewable = asset.kind === 'image' && stats.size <= 64 * 1024 * 1024;
        asset.previewRevision = revisions.has(asset.path)
          ? [...(revisions.get(asset.path) as Set<Revision>)].sort().join(',')
          : `stat:${stats.dev}:${stats.ino}:${stats.size}:${stats.mtimeMs}:${stats.ctimeMs}`;
      } else asset.status = 'unavailable';
    } catch (error) {
      asset.status = (error as NodeJS.ErrnoException).code === 'ENOENT' ? 'missing' : 'unavailable';
    }
  };
  const entries = [...assets.values()].sort((a, b) => a.path.localeCompare(b.path));
  for (let start = 0; start < entries.length; start += 32) {
    await Promise.all(entries.slice(start, start + 32).map(inspect));
  }
  const scoped = kind === 'image' ? entries.filter((asset) => asset.kind === 'image') : entries;
  const counts = {
    all: scoped.length,
    used: scoped.filter((asset) => asset.usage.length > 0).length,
    unused: scoped.filter((asset) => asset.usage.length === 0).length,
    missing: scoped.filter((asset) => asset.status !== 'available').length,
  };
  const filtered = scoped.filter((asset) => {
    if (filter === 'used' && !asset.usage.length) return false;
    if (filter === 'unused' && asset.usage.length) return false;
    if (filter === 'missing' && asset.status === 'available') return false;
    if (pageId && !asset.usage.some((usage) => usage.pageId === pageId)) return false;
    return (
      !query ||
      [
        asset.path,
        asset.name,
        ...asset.usage.flatMap((usage) => [
          usage.pageId,
          usage.pageLabel,
          usage.legacyLabel ?? '',
          usage.sourceName ?? '',
        ]),
      ].some((value) => value.toLowerCase().includes(query))
    );
  });
  return {
    items: filtered.slice(offset, offset + limit),
    total: filtered.length,
    offset,
    limit,
    hasMore: offset + limit < filtered.length,
    counts,
    truncated,
    scan: { visited, entryLimit, depthLimit, warnings: [...warnings] },
    scope: 'current-main',
    manifestRevision: snapshot.manifestRevision,
    metadataRevision: snapshot.metadataRevision,
  };
}
