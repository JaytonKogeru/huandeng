import { createHash } from 'node:crypto';
import { constants } from 'node:fs';
import fs, { type FileHandle } from 'node:fs/promises';
import path from 'node:path';
import { Zip, ZipDeflate, ZipPassThrough } from 'fflate';
import { isRecord } from './codec';
import { PageCheckpointArchive } from './page-checkpoints';
import { hashBytes } from './persistence';
import { assertPresentationReady } from './project-model';
import { type DeckSnapshot, PptdError, type Revision } from './types';

const CHUNK_BYTES = 256 * 1024;
// fflate writes ordinary ZIP, not ZIP64. Leave room for headers and compression overhead.
const MAX_BYTES = 0xf0000000;
const MAX_ENTRIES = 60000;
const OMIT_DIRECTORIES = new Set([
  '.git',
  '.hg',
  '.svn',
  'node_modules',
  '.pnpm-store',
  'exports',
  '.verification',
  'dist',
  'build',
  'coverage',
  '.cache',
  '.vite',
  '.turbo',
  '.next',
  '.nuxt',
  '__pycache__',
  '.pytest_cache',
  '.mypy_cache',
  '.ruff_cache',
  '.tox',
  '.venv',
  'venv',
]);
const OMIT_FILES = new Set([
  '.mcp.json',
  '.codex.mcp.json',
  '.npmrc',
  '.pypirc',
  '.netrc',
  '.ds_store',
  'thumbs.db',
]);
const MACHINE_PATHS =
  /(?:^|\/)(?:\.claude\/(?:settings(?:\.local)?\.json|mcp\.json|credentials\.json|sessions(?:\/|$))|\.codex\/(?:config\.toml|auth\.json|sessions(?:\/|$)|session_index\.jsonl)|\.(?:deepseek|deepseek-harness|dsh|gemini|cursor)\/(?:config\.json|settings\.json|mcp\.json|auth\.json|credentials\.json|sessions(?:\/|$))|\.vscode\/mcp\.json|\.huandeng\/(?:runtime|sessions|connections|activity|operation-history)(?:\/|$))/i;

export const ARCHIVE_EXCLUSION_POLICY = [
  'Repository internals, installed dependencies, Exports, build output and known caches.',
  'Local environment and package credentials, MCP connections and known agent machine settings.',
  'The active runtime and document recovery directories, wherever configured.',
  'Named versions in .huandeng/checkpoints and media/.huandeng-versions are included.',
  'Other authored files, including source archives and project guidance, are included.',
];

export interface ArchiveProgress {
  completedFiles: number;
  totalFiles: number;
  completedBytes: number;
  totalBytes: number;
}
interface FileRecord {
  path: string;
  signature: string;
  size: number;
  mode: number;
  mtimeMs: number;
}
export interface ArchiveFile extends FileRecord {
  revision: Revision;
}
export interface ProjectArchiveCapture {
  directory: string;
  entry: string;
  snapshot: DeckSnapshot;
  files: ArchiveFile[];
  directories: string[];
  totalBytes: number;
  namedVersions: number;
  excluded: { path: string; reason: string }[];
}
interface CaptureOptions {
  excludeRoots?: string[];
  onProgress?: (progress: ArchiveProgress) => void;
}

function invalid(message: string): never {
  throw new PptdError('INVALID_DOCUMENT', message);
}
function changed(relative: string): never {
  throw new PptdError(
    'REVISION_CONFLICT',
    `Project changed during archive capture. Retry export: ${relative}`,
  );
}

/** Paths become ZIP entry names, never extraction commands or absolute machine paths. */
export function archivePath(value: string): string {
  const normalized = value.replace(/\\/g, '/').replace(/^\.\//, '');
  if (
    !normalized ||
    normalized.startsWith('/') ||
    /^[a-z]:/i.test(normalized) ||
    normalized
      .split('/')
      .some(
        (part) =>
          !part ||
          part === '.' ||
          part === '..' ||
          /[<>:"|?*\p{Cc}]/u.test(part) ||
          /[. ]$/.test(part) ||
          /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part),
      ) ||
    Buffer.byteLength(normalized) > 65535
  )
    invalid(`Unsafe or non-portable project path: ${value.slice(0, 200)}`);
  return normalized;
}

export function archiveExclusion(
  relative: string,
  directory: boolean,
  linked = false,
): string | null {
  const lower = relative.toLowerCase();
  const name = path.posix.basename(lower);
  if (
    ['.git', '.hg', '.svn'].includes(name) ||
    ((directory || linked) && OMIT_DIRECTORIES.has(name))
  )
    return 'Generated output, dependency, cache or repository data';
  if (OMIT_FILES.has(name) || MACHINE_PATHS.test(lower))
    return 'Machine connection or local configuration';
  if (/^\.env(?:\.|$)/i.test(name) && !/^\.env\.(?:example|sample|template)$/i.test(name))
    return 'Local environment settings';
  if (/\.py[co]$/i.test(name) || /^\.huandeng-[\da-f-]+\.tmp(?:-|$)/i.test(name))
    return 'Generated temporary file';
  return null;
}

function signature(stat: Awaited<ReturnType<FileHandle['stat']>>): string {
  return [stat.dev, stat.ino, stat.size, stat.mtimeMs, stat.ctimeMs].join('/');
}

async function collect(root: string, excludedRoots: string[], signal: AbortSignal) {
  const files: FileRecord[] = [];
  const directories: string[] = [];
  const excluded: ProjectArchiveCapture['excluded'] = [];
  const names = new Set<string>();
  let totalBytes = 0;
  const visit = async (relative: string) => {
    signal.throwIfAborted();
    const absolute = path.join(root, relative);
    const stat = await fs.lstat(absolute);
    const reason = excludedRoots.some(
      (item) => relative === item || relative.startsWith(`${item}/`),
    )
      ? 'Active runtime or recovery directory'
      : archiveExclusion(relative, stat.isDirectory(), stat.isSymbolicLink());
    if (reason) {
      excluded.push({ path: relative, reason });
      return;
    }
    const safe = archivePath(relative);
    if (stat.isSymbolicLink() || (!stat.isDirectory() && !stat.isFile()))
      invalid(`Project archive cannot include a symbolic link or special file: ${safe}`);
    const real = await fs.realpath(absolute);
    if (path.relative(root, real).replace(/\\/g, '/') !== safe)
      invalid(`Project archive path resolves elsewhere: ${safe}`);
    const key = safe.normalize('NFC').toLowerCase();
    if (names.has(key)) invalid(`Project paths collide on another computer: ${safe}`);
    names.add(key);
    if (names.size > MAX_ENTRIES)
      invalid('Project ZIP exceeds 60,000 entries. Ordinary ZIP cannot safely store this project.');
    if (stat.isDirectory()) {
      directories.push(safe);
      for (const name of (await fs.readdir(absolute)).sort()) await visit(`${safe}/${name}`);
    } else {
      totalBytes += stat.size;
      if (totalBytes > MAX_BYTES)
        invalid(
          'Project ZIP exceeds the 3.75 GiB source limit for ordinary ZIP. Reduce generated files and retry.',
        );
      files.push({
        path: safe,
        signature: signature(stat),
        size: stat.size,
        mode: stat.mode,
        mtimeMs: stat.mtimeMs,
      });
    }
  };
  for (const name of (await fs.readdir(root)).sort()) await visit(name);
  return { files, directories, excluded, totalBytes };
}

async function copyFrozenFile(
  root: string,
  directory: string,
  file: FileRecord,
  signal: AbortSignal,
  onBytes: (bytes: number) => void,
): Promise<ArchiveFile> {
  const source = path.join(root, file.path);
  const destination = path.join(directory, file.path);
  const stat = await fs.lstat(source);
  if (!stat.isFile() || stat.isSymbolicLink() || signature(stat) !== file.signature)
    changed(file.path);
  if (path.relative(root, await fs.realpath(source)).replace(/\\/g, '/') !== file.path)
    changed(file.path);
  const input = await fs.open(
    source,
    constants.O_RDONLY | (process.platform === 'win32' ? 0 : constants.O_NOFOLLOW),
  );
  let output: FileHandle | undefined;
  const hash = createHash('sha256');
  try {
    if (signature(await input.stat()) !== file.signature) changed(file.path);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    output = await fs.open(destination, 'wx');
    const buffer = Buffer.allocUnsafe(CHUNK_BYTES);
    let total = 0;
    for (;;) {
      signal.throwIfAborted();
      const { bytesRead } = await input.read(buffer, 0, buffer.length, null);
      if (!bytesRead) break;
      total += bytesRead;
      if (total > file.size) changed(file.path);
      const chunk = buffer.subarray(0, bytesRead);
      hash.update(chunk);
      await output.writeFile(chunk);
      onBytes(bytesRead);
    }
    if (total !== file.size || signature(await input.stat()) !== file.signature) changed(file.path);
    const final = await fs.lstat(source);
    if (!final.isFile() || final.isSymbolicLink() || signature(final) !== file.signature)
      changed(file.path);
    if (path.relative(root, await fs.realpath(source)).replace(/\\/g, '/') !== file.path)
      changed(file.path);
    return { ...file, revision: `sha256:${hash.digest('hex')}` };
  } finally {
    await output?.close();
    await input.close();
  }
}

function requiredSources(value: unknown, found = new Set<string>()): Set<string> {
  if (Array.isArray(value)) for (const child of value) requiredSources(child, found);
  else if (isRecord(value))
    for (const [key, child] of Object.entries(value)) {
      if (
        typeof child === 'string' &&
        child &&
        (key === 'src' || (key === 'url' && !/^(?:https?:|data:|blob:|#)/i.test(child)))
      ) {
        if (!/^data:image\//i.test(child)) found.add(child);
      } else if (typeof child === 'object') requiredSources(child, found);
    }
  return found;
}

async function validateCapture(capture: ProjectArchiveCapture, signal: AbortSignal) {
  const { snapshot, files, directory } = capture;
  const byPath = new Map(files.map((file) => [file.path, file]));
  const requireFile = (source: string, revision?: Revision | null) => {
    const normalized = archivePath(source);
    const found = byPath.get(normalized);
    if (!found) invalid(`Required project file is missing or excluded from ZIP: ${normalized}`);
    if (revision === null) invalid(`Required asset is unavailable: ${normalized}`);
    if (revision && found.revision !== revision) changed(normalized);
  };
  requireFile(capture.entry, snapshot.manifestRevision);
  if (snapshot.metadataRevision !== null)
    requireFile('.huandeng/project.json', snapshot.metadataRevision);
  for (const page of snapshot.pages) {
    requireFile(page.path, page.pageRevision);
    for (const [source, revision] of Object.entries(page.assetRevisions ?? {}))
      requireFile(source, revision);
    for (const source of requiredSources({ data: page.data, theme: page.metadata.themeOverride }))
      requireFile(source);
  }
  for (const source of requiredSources(snapshot.manifest)) requireFile(source);
  const checkpoints = new PageCheckpointArchive(directory, true);
  const knownVersions = new Set<string>();
  for (const file of files) {
    signal.throwIfAborted();
    if (!/^\.huandeng\/checkpoints\//.test(file.path) || !file.path.endsWith('.json')) continue;
    const value = JSON.parse(await fs.readFile(path.join(directory, file.path), 'utf8'));
    if (
      !isRecord(value) ||
      typeof value.pageId !== 'string' ||
      !isRecord(value.summary) ||
      typeof value.summary.versionId !== 'string' ||
      !/^checkpoint:[a-f0-9]{32}$/.test(value.summary.versionId)
    )
      invalid(`Invalid named version in Project: ${file.path}`);
    const expected = `.huandeng/checkpoints/${hashBytes(value.pageId).slice(7, 39)}/${value.summary.versionId.slice(11)}.json`;
    if (file.path !== expected)
      invalid(`Named version path does not match its identity: ${file.path}`);
    const version = await checkpoints.find(snapshot.deckId, value.pageId, value.summary.versionId);
    for (const [source, revision] of Object.entries(version.state.assetRevisions))
      requireFile(source, revision);
    knownVersions.add(`${value.pageId}/${value.summary.versionId}`);
  }
  for (const presentation of snapshot.metadata.project?.presentations ?? []) {
    const resolved = assertPresentationReady(snapshot, presentation.id);
    for (const item of resolved.pages)
      if (item.versionId && !knownVersions.has(`${item.pageId}/${item.versionId}`))
        invalid(`Presentation requires a missing portable named version: ${item.versionId}`);
  }
  capture.namedVersions = knownVersions.size;
}

/** Call within the Store transaction queue; compression happens after this returns. */
export async function captureProjectArchive(
  root: string,
  entry: string,
  snapshot: DeckSnapshot,
  directory: string,
  signal: AbortSignal,
  options: CaptureOptions = {},
): Promise<ProjectArchiveCapture> {
  signal.throwIfAborted();
  if (snapshot.presentationId || snapshot.diagnostics.some((item) => item.severity === 'error'))
    invalid('Resolve Project diagnostics before exporting the entire editable Project.');
  const canonicalRoot = await fs.realpath(root);
  const relativeEntry = archivePath(path.relative(canonicalRoot, path.resolve(root, entry)));
  const relativeDestination = path.relative(canonicalRoot, path.resolve(directory));
  if (
    !relativeDestination.startsWith(`..${path.sep}`) &&
    relativeDestination !== '..' &&
    !path.isAbsolute(relativeDestination)
  )
    invalid('Project archive staging must be outside the Project.');
  const excludedRoots = (options.excludeRoots ?? []).flatMap((item) => {
    const relative = path.relative(canonicalRoot, path.resolve(item)).replace(/\\/g, '/');
    if (!relative) invalid('Project root cannot also be a machine runtime or recovery directory.');
    return relative !== '..' && !relative.startsWith('../') && !path.isAbsolute(relative)
      ? [relative]
      : [];
  });
  const listing = await collect(canonicalRoot, excludedRoots, signal);
  const progress: ArchiveProgress = {
    completedFiles: 0,
    totalFiles: listing.files.length,
    completedBytes: 0,
    totalBytes: listing.totalBytes,
  };
  options.onProgress?.({ ...progress });
  await fs.mkdir(directory, { recursive: true });
  const files: ArchiveFile[] = [];
  for (const file of listing.files) {
    files.push(
      await copyFrozenFile(canonicalRoot, directory, file, signal, (bytes) => {
        progress.completedBytes += bytes;
        options.onProgress?.({ ...progress });
      }),
    );
    progress.completedFiles++;
    options.onProgress?.({ ...progress });
  }
  for (const name of listing.directories)
    await fs.mkdir(path.join(directory, name), { recursive: true });
  const capture: ProjectArchiveCapture = {
    ...listing,
    files,
    directory,
    entry: relativeEntry,
    snapshot,
    namedVersions: 0,
  };
  await validateCapture(capture, signal);
  const final = await collect(canonicalRoot, excludedRoots, signal);
  if (
    JSON.stringify(final.files) !== JSON.stringify(listing.files) ||
    JSON.stringify(final.directories) !== JSON.stringify(listing.directories)
  )
    changed(relativeEntry);
  signal.throwIfAborted();
  return capture;
}

export async function writeProjectZip(
  capture: ProjectArchiveCapture,
  outputFile: string,
  signal: AbortSignal,
  onProgress?: (progress: ArchiveProgress) => void,
): Promise<void> {
  signal.throwIfAborted();
  const output = await fs.open(outputFile, 'wx');
  let pending = Promise.resolve();
  let zipError: Error | null = null;
  let outputBytes = 0;
  let complete = false;
  const zip = new Zip((error, chunk, final) => {
    if (error) {
      zipError = error;
      return;
    }
    outputBytes += chunk.byteLength;
    if (outputBytes >= 0xffffffff) {
      zipError = new Error('Project ZIP exceeds the 4 GiB ordinary ZIP limit.');
      return;
    }
    pending = pending.then(async () => {
      signal.throwIfAborted();
      await output.writeFile(chunk);
    });
    if (final) complete = true;
  });
  const progress: ArchiveProgress = {
    completedFiles: 0,
    totalFiles: capture.files.length,
    completedBytes: 0,
    totalBytes: capture.totalBytes,
  };
  const drain = async () => {
    await pending;
    signal.throwIfAborted();
    if (zipError) throw zipError;
  };
  try {
    for (const name of capture.directories) {
      const entry = new ZipPassThrough(`${name}/`);
      zip.add(entry);
      entry.push(new Uint8Array(), true);
      await drain();
    }
    for (const file of capture.files) {
      signal.throwIfAborted();
      const stored = /\.(?:png|jpe?g|gif|webp|mp[34]|webm|pdf|zip|7z|gz|pptx|woff2)$/i.test(
        file.path,
      );
      const entry = stored
        ? new ZipPassThrough(file.path)
        : new ZipDeflate(file.path, { level: 3 });
      entry.mtime = new Date(
        Math.max(
          new Date(1980, 0, 1).getTime(),
          Math.min(new Date(2107, 11, 31).getTime(), file.mtimeMs),
        ),
      );
      entry.os = 3;
      entry.attrs = (file.mode & 0xffff) << 16;
      zip.add(entry);
      const input = await fs.open(path.join(capture.directory, file.path), 'r');
      try {
        const buffer = Buffer.allocUnsafe(CHUNK_BYTES);
        for (;;) {
          signal.throwIfAborted();
          const { bytesRead } = await input.read(buffer, 0, buffer.length, null);
          if (!bytesRead) break;
          entry.push(buffer.subarray(0, bytesRead), false);
          await drain();
          progress.completedBytes += bytesRead;
          onProgress?.({ ...progress });
        }
        entry.push(new Uint8Array(), true);
        await drain();
      } finally {
        await input.close();
      }
      progress.completedFiles++;
      onProgress?.({ ...progress });
    }
    zip.end();
    await drain();
    if (!complete) throw new Error('Project ZIP did not finish.');
  } finally {
    zip.terminate();
    await pending.catch(() => {});
    await output.close();
  }
}

export function projectArchiveReport(capture: ProjectArchiveCapture) {
  return {
    format: 'zip',
    scope: 'project',
    entry: capture.entry,
    files: capture.files.map(({ path, size }) => ({ path, bytes: size })),
    totalBytes: capture.totalBytes,
    namedVersions: capture.namedVersions,
    excluded: capture.excluded,
    exclusionPolicy: ARCHIVE_EXCLUSION_POLICY,
    history:
      'Portable named versions are included. Machine Undo, operation logs and connection sessions are not Project files.',
    manifestRevision: capture.snapshot.manifestRevision,
    metadataRevision: capture.snapshot.metadataRevision,
  };
}
