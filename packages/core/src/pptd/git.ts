import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { METADATA_PATH, normalizeRelativePath } from './identity';
import type { PptdCheckpointSnapshot } from './store';
import type { DeckSnapshot, DocumentEvent, Revision } from './types';

const run = promisify(execFile);

interface RecordedFile {
  path: string;
  revision: Revision;
}

interface Baseline {
  clean: boolean;
  root: string;
  repository?: string;
  head?: string;
  ref?: string | null;
  reason?: string;
  metadataInitiallyPresent: boolean;
  metadataInitializationRecorded: boolean;
  allowed: Map<string, RecordedFile>;
  deckId?: string;
  epoch?: string;
  sequence: number;
  generation: number;
}

export type CheckpointResult =
  | { status: 'deferred'; code: string; reason: string; files?: string[]; staged?: boolean }
  | { status: 'unchanged' }
  | { status: 'committed'; commit: string; files: string[] };

export type CheckpointRecordResult =
  | { status: 'recorded'; files: string[] }
  | { status: 'ignored' }
  | { status: 'deferred'; reason: string };

const baselines = new Map<string, Baseline>();
const checkpoints = new Map<string, Promise<CheckpointResult>>();

function rootKey(root: string): string {
  const absolute = path.resolve(root);
  return process.platform === 'win32' ? absolute.toLowerCase() : absolute;
}

async function git(root: string, args: string[], input?: Uint8Array): Promise<string> {
  // check-ignore already takes file paths and rejects Git's literal pathspec flag.
  const literal = args[0] === 'check-ignore' ? [] : ['--literal-pathspecs'];
  const pending = run('git', [...literal, '-C', root, ...args], { maxBuffer: 8 * 1024 * 1024 });
  if (input) pending.child.stdin?.end(input);
  return (await pending).stdout;
}

async function optionalGit(root: string, args: string[]): Promise<string | null> {
  try {
    return (await git(root, args)).trim();
  } catch (error) {
    if ((error as { code?: unknown }).code === 1) return null;
    throw error;
  }
}

async function exists(file: string): Promise<boolean> {
  try {
    await fs.lstat(file);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw error;
  }
}

function deferred(
  code: string,
  reason: string,
  files?: string[],
  staged = false,
): CheckpointResult {
  return {
    status: 'deferred',
    code,
    reason,
    ...(files ? { files } : {}),
    ...(staged ? { staged: true } : {}),
  };
}

export async function registerCheckpointRoot(root: string): Promise<void> {
  const baseline: Baseline = {
    clean: false,
    root: path.resolve(root),
    metadataInitiallyPresent: true,
    metadataInitializationRecorded: false,
    allowed: new Map(),
    sequence: -1,
    generation: 0,
  };
  baselines.set(rootKey(root), baseline);
  try {
    baseline.root = await fs.realpath(root);
    baseline.repository = await fs.realpath(
      (await git(root, ['rev-parse', '--show-toplevel'])).trim(),
    );
    baseline.head = (await git(root, ['rev-parse', '--verify', 'HEAD'])).trim();
    baseline.ref = await optionalGit(root, ['symbolic-ref', '--quiet', 'HEAD']);
    baseline.metadataInitiallyPresent = await exists(path.join(baseline.root, METADATA_PATH));
    const status = await git(baseline.repository, [
      'status',
      '--porcelain=v1',
      '-z',
      '--untracked-files=all',
    ]);
    const staged = await git(baseline.repository, [
      'diff',
      '--cached',
      '--name-only',
      '-z',
      '--ita-visible-in-index',
    ]);
    baseline.clean = status.length === 0 && staged.length === 0;
    if (!baseline.clean)
      baseline.reason =
        'Repository was dirty when this session opened. Finish that work, then reopen the deck.';
    const verifiedHead = (await git(root, ['rev-parse', '--verify', 'HEAD'])).trim();
    const verifiedRef = await optionalGit(root, ['symbolic-ref', '--quiet', 'HEAD']);
    if (verifiedHead !== baseline.head || verifiedRef !== baseline.ref) {
      baseline.clean = false;
      baseline.reason =
        'HEAD changed while the clean baseline was being recorded. Reopen the deck.';
    }
  } catch {
    baseline.clean = false;
    baseline.reason =
      'A verified Git repository with an existing HEAD is required for checkpoints.';
  }
}

function bindSnapshot(
  baseline: Baseline,
  snapshot: Pick<DeckSnapshot, 'deckId' | 'epoch'>,
): boolean {
  if (baseline.deckId && (baseline.deckId !== snapshot.deckId || baseline.epoch !== snapshot.epoch))
    return false;
  baseline.deckId = snapshot.deckId;
  baseline.epoch = snapshot.epoch;
  return true;
}

function recordFile(baseline: Baseline, relative: string, revision: Revision): string {
  if (!baseline.repository) throw new Error('No repository baseline.');
  if (!/^sha256:[a-f\d]{64}$/.test(revision))
    throw new Error('A committed raw SHA256 revision is required.');
  const projectPath = normalizeRelativePath(relative);
  const absolute = path.resolve(baseline.root, projectPath);
  const repositoryPath = path.relative(baseline.repository, absolute).split(path.sep).join('/');
  if (
    !repositoryPath ||
    repositoryPath.startsWith('../') ||
    path.isAbsolute(repositoryPath) ||
    repositoryPath.split('/').includes('.git')
  )
    throw new Error('Recorded checkpoint path is outside the work tree.');
  baseline.allowed.set(repositoryPath, { path: projectPath, revision });
  baseline.generation++;
  return repositoryPath;
}

export function recordCheckpoint(
  root: string,
  snapshot: PptdCheckpointSnapshot,
  event: DocumentEvent,
): CheckpointRecordResult {
  const baseline = baselines.get(rootKey(root));
  if (
    event.type === 'external' &&
    baseline?.clean &&
    (event.manifestChanged ||
      event.metadataChanged ||
      Object.values(event.changedPages).some((revision) => revision.before !== revision.after))
  ) {
    baseline.clean = false;
    baseline.generation++;
    baseline.reason =
      'External source changes were observed during this editing session. Review that work with Git, then reopen the deck from a clean baseline.';
    return { status: 'deferred', reason: baseline.reason };
  }
  if (event.type !== 'committed') return { status: 'ignored' };
  if (!baseline?.clean)
    return { status: 'deferred', reason: baseline?.reason ?? 'No verified clean baseline.' };
  try {
    if (
      !event.operationId ||
      event.epoch !== snapshot.epoch ||
      event.sequence !== snapshot.sequence ||
      !bindSnapshot(baseline, snapshot)
    )
      throw new Error(
        'The committed event and snapshot do not identify the same document version.',
      );
    if (event.sequence <= baseline.sequence) return { status: 'ignored' };
    const files: string[] = [];
    for (const [pageId, revisions] of Object.entries(event.changedPages)) {
      if (revisions.before === revisions.after) continue;
      if (!revisions.after) throw new Error('File deletion requires an explicit Git review.');
      const identity = snapshot.metadata.slides[pageId];
      if (!identity) throw new Error(`No committed path is available for page ${pageId}.`);
      const page = snapshot.pages.find((item) => item.pageId === pageId);
      if (page && page.pageRevision !== revisions.after)
        throw new Error(`Page ${pageId} does not match the committed revision.`);
      files.push(recordFile(baseline, identity.path, revisions.after));
    }
    if (event.manifestChanged)
      files.push(recordFile(baseline, snapshot.entry, snapshot.manifestRevision));
    if (event.metadataChanged) {
      if (!snapshot.metadataRevision)
        throw new Error('Metadata deletion requires an explicit Git review.');
      files.push(recordFile(baseline, METADATA_PATH, snapshot.metadataRevision));
    }
    baseline.sequence = event.sequence;
    return { status: 'recorded', files };
  } catch (error) {
    baseline.clean = false;
    baseline.reason = error instanceof Error ? error.message : String(error);
    return { status: 'deferred', reason: baseline.reason };
  }
}

export function recordCheckpointMetadataInitialization(
  root: string,
  snapshot: DeckSnapshot,
): CheckpointRecordResult {
  const baseline = baselines.get(rootKey(root));
  if (!baseline?.clean)
    return { status: 'deferred', reason: baseline?.reason ?? 'No verified clean baseline.' };
  if (baseline.metadataInitiallyPresent || baseline.metadataInitializationRecorded)
    return { status: 'ignored' };
  try {
    if (
      !snapshot.identityPersisted ||
      !snapshot.writable ||
      !snapshot.metadataRevision ||
      snapshot.sequence !== 0 ||
      !bindSnapshot(baseline, snapshot)
    )
      throw new Error(
        'Only this session’s newly persisted identity sidecar can be recorded as initialization.',
      );
    const file = recordFile(baseline, METADATA_PATH, snapshot.metadataRevision);
    baseline.metadataInitializationRecorded = true;
    return { status: 'recorded', files: [file] };
  } catch (error) {
    baseline.clean = false;
    baseline.reason = error instanceof Error ? error.message : String(error);
    return { status: 'deferred', reason: baseline.reason };
  }
}

async function headMatches(baseline: Baseline): Promise<boolean> {
  return (
    (await git(baseline.root, ['rev-parse', '--verify', 'HEAD'])).trim() === baseline.head &&
    (await optionalGit(baseline.root, ['symbolic-ref', '--quiet', 'HEAD'])) === baseline.ref
  );
}

async function rawBytes(baseline: Baseline, recorded: RecordedFile): Promise<Buffer> {
  const file = path.resolve(baseline.root, recorded.path);
  const stat = await fs.lstat(file);
  const actual = await fs.realpath(file);
  const relative = path.relative(baseline.root, actual);
  if (
    !stat.isFile() ||
    relative === '..' ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  )
    throw new Error('Checkpoint targets must be regular files inside the project.');
  return fs.readFile(file);
}

function digest(bytes: Uint8Array): Revision {
  return `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
}

async function rawRevision(baseline: Baseline, recorded: RecordedFile): Promise<Revision> {
  return digest(await rawBytes(baseline, recorded));
}

async function gitWorkflowRequirement(repository: string): Promise<CheckpointResult | null> {
  if ((await optionalGit(repository, ['config', '--bool', '--get', 'commit.gpgSign'])) === 'true') {
    return deferred(
      'SIGNING_REQUIRED',
      'Commit signing is enabled. Use the normal Git commit workflow to preserve its signing requirements.',
    );
  }
  const configured = await optionalGit(repository, ['config', '--path', '--get', 'core.hooksPath']);
  const hooks =
    configured === null
      ? (await git(repository, ['rev-parse', '--git-path', 'hooks'])).trim()
      : configured;
  const directory = path.resolve(repository, hooks);
  for (const hook of ['pre-commit', 'prepare-commit-msg', 'commit-msg', 'post-commit']) {
    try {
      const stat = await fs.stat(path.join(directory, hook));
      if (stat.isFile() && (process.platform === 'win32' || (stat.mode & 0o111) !== 0))
        return deferred(
          'COMMIT_HOOKS_REQUIRED',
          `An enabled ${hook} hook requires the normal Git commit workflow. Huandeng did not bypass it.`,
        );
    } catch (error) {
      if (
        (error as NodeJS.ErrnoException).code !== 'ENOENT' &&
        (error as NodeJS.ErrnoException).code !== 'ENOTDIR'
      )
        throw error;
    }
  }
  return null;
}

function statusFiles(status: string): { files: string[]; unsupported: boolean } {
  const records = status.split('\0');
  const files: string[] = [];
  let unsupported = false;
  for (let index = 0; index < records.length; index++) {
    const record = records[index];
    if (!record) continue;
    const state = record.slice(0, 2);
    files.push(record.slice(3));
    if (state !== ' M' && state !== '??') unsupported = true;
    if (/[RC]/.test(state)) index++;
  }
  return { files, unsupported };
}

function treeEntries(source: string): Map<string, { mode: string; hash: string }> {
  const result = new Map<string, { mode: string; hash: string }>();
  for (const item of source.split('\0').filter(Boolean)) {
    const match = item.match(/^(\d+) blob ([a-f\d]+)\t([\s\S]+)$/);
    if (!match || !['100644', '100755'].includes(match[1]))
      throw new Error('Checkpoint targets must remain ordinary Git blobs.');
    result.set(match[3], { mode: match[1], hash: match[2] });
  }
  return result;
}

async function performCheckpoint(
  root: string,
  snapshot: DeckSnapshot,
  message: string,
): Promise<CheckpointResult> {
  const baseline = baselines.get(rootKey(root));
  if (!baseline?.clean || !baseline.repository || !baseline.head)
    return deferred('UNCLEAN_BASELINE', baseline?.reason ?? 'No verified clean baseline.');
  if (baseline.deckId && (baseline.deckId !== snapshot.deckId || baseline.epoch !== snapshot.epoch))
    return deferred(
      'DOCUMENT_CHANGED',
      'The document session differs from the recorded checkpoint batch.',
    );
  if (!message.trim() || message.length > 10000)
    return deferred('INVALID_MESSAGE', 'A checkpoint message of 1–10000 characters is required.');
  const repository = baseline.repository;
  const head = baseline.head;
  const approved = new Map(baseline.allowed);
  const generation = baseline.generation;
  let staged = false;
  try {
    if (!(await headMatches(baseline)))
      return deferred(
        'HEAD_CHANGED',
        'HEAD or the checked-out branch changed since the clean baseline. Reopen the deck after reviewing that work.',
      );
    const workflow = await gitWorkflowRequirement(repository);
    if (workflow) return workflow;
    if (
      (await git(repository, ['diff', '--cached', '--name-only', '-z', '--ita-visible-in-index']))
        .length
    )
      return deferred(
        'INDEX_NOT_EMPTY',
        'The Git index already contains staged work; nothing was staged by Huandeng.',
      );
    const status = statusFiles(
      await git(repository, ['status', '--porcelain=v1', '-z', '--untracked-files=all']),
    );
    if (status.unsupported)
      return deferred(
        'REVIEW_REQUIRED',
        'Git contains deletions, renames, type changes or conflicts requiring explicit review.',
        status.files,
      );
    const unknown = status.files.filter((file) => !approved.has(file));
    if (unknown.length)
      return deferred(
        'UNRECORDED_CHANGES',
        'Working-tree changes exist outside successful Huandeng saves; nothing was staged.',
        unknown,
      );
    for (const [file, recorded] of approved) {
      if ((await rawRevision(baseline, recorded)) !== recorded.revision)
        return deferred(
          'EXTERNAL_BYTES_CHANGED',
          'A recorded target has different bytes from its last successful save; nothing was staged.',
          [file],
        );
      if ((await optionalGit(repository, ['check-ignore', '--quiet', '--', file])) !== null)
        return deferred(
          'IGNORED_TARGET',
          'A saved authoritative file is ignored by Git; review the ignore rules before checkpointing.',
          [file],
        );
    }
    if (!status.files.length) return { status: 'unchanged' };
    const expectedBlobs = new Map<string, string>();
    for (const file of status.files) {
      const recorded = approved.get(file);
      if (!recorded)
        return deferred('UNRECORDED_CHANGES', 'A target has no successful save receipt.', [file]);
      const bytes = await rawBytes(baseline, recorded);
      if (digest(bytes) !== recorded.revision)
        return deferred(
          'EXTERNAL_BYTES_CHANGED',
          'A target changed while its bytes were being frozen.',
          [file],
        );
      expectedBlobs.set(
        file,
        (await git(repository, ['hash-object', '--stdin', `--path=${file}`], bytes)).trim(),
      );
    }
    if (!(await headMatches(baseline)))
      return deferred('HEAD_CHANGED', 'HEAD changed while checkpoint files were being verified.');
    if (baseline.generation !== generation)
      return deferred(
        'SAVES_IN_PROGRESS',
        'Another document save completed during checkpoint verification; retry with the latest version.',
      );
    for (const file of status.files) {
      const recorded = approved.get(file);
      if (!recorded || (await rawRevision(baseline, recorded)) !== recorded.revision)
        return deferred(
          'EXTERNAL_BYTES_CHANGED',
          'A recorded target changed during checkpoint verification; nothing was staged.',
          [file],
        );
    }
    if (
      (await git(repository, ['diff', '--cached', '--name-only', '-z', '--ita-visible-in-index']))
        .length
    )
      return deferred(
        'INDEX_NOT_EMPTY',
        'The Git index changed before staging; nothing was staged by Huandeng.',
      );
    await git(repository, ['add', '--', ...status.files]);
    staged = true;
    const tree = (await git(repository, ['write-tree'])).trim();
    const treeFiles = (
      await git(repository, [
        'diff-tree',
        '--no-commit-id',
        '--name-only',
        '-r',
        '-z',
        '--no-renames',
        head,
        tree,
      ])
    )
      .split('\0')
      .filter(Boolean);
    if (
      treeFiles.length !== status.files.length ||
      treeFiles.some((file) => !expectedBlobs.has(file))
    )
      return deferred(
        'INDEX_CHANGED',
        'The index changed concurrently. Huandeng did not commit; review the staged files.',
        treeFiles,
        true,
      );
    const entries = treeEntries(await git(repository, ['ls-tree', '-z', tree, '--', ...treeFiles]));
    const previous = treeEntries(
      await git(repository, ['ls-tree', '-z', head, '--', ...treeFiles]),
    );
    for (const file of treeFiles) {
      const entry = entries.get(file);
      const before = previous.get(file);
      if (
        !entry ||
        entry.hash !== expectedBlobs.get(file) ||
        (before && before.mode !== entry.mode) ||
        (!before && entry.mode !== '100644')
      )
        return deferred(
          'INDEX_CONTENT_CHANGED',
          'Staged content or file mode differs from the approved save. Huandeng did not commit; review the index.',
          [file],
          true,
        );
      const recorded = approved.get(file);
      if (!recorded || (await rawRevision(baseline, recorded)) !== recorded.revision)
        return deferred(
          'EXTERNAL_BYTES_CHANGED',
          'A saved target changed after staging. Huandeng did not commit; review the staged files.',
          [file],
          true,
        );
    }
    const currentStatus = statusFiles(
      await git(repository, ['status', '--porcelain=v1', '-z', '--untracked-files=all']),
    );
    if (currentStatus.files.some((file) => !expectedBlobs.has(file)))
      return deferred(
        'UNRECORDED_CHANGES',
        'Unrelated work appeared during staging. Huandeng did not commit; review the index.',
        currentStatus.files,
        true,
      );
    if ((await git(repository, ['write-tree'])).trim() !== tree)
      return deferred(
        'INDEX_CHANGED',
        'The index changed after its content was frozen. Huandeng did not commit; review the index.',
        undefined,
        true,
      );
    const changedWorkflow = await gitWorkflowRequirement(repository);
    if (changedWorkflow?.status === 'deferred') return { ...changedWorkflow, staged: true };
    if (!(await headMatches(baseline)))
      return deferred(
        'HEAD_CHANGED',
        'HEAD changed after staging. Huandeng did not commit; review the index.',
        undefined,
        true,
      );
    if (baseline.generation !== generation)
      return deferred(
        'SAVES_IN_PROGRESS',
        'Another document save completed after staging. Huandeng did not commit; review the index.',
        undefined,
        true,
      );
    // commit-tree commits only the verified tree, while update-ref prevents a moved HEAD from becoming its parent.
    // Signing and commit hooks above defer to normal Git rather than silently bypassing the user's workflow.
    const commit = (await git(repository, ['commit-tree', tree, '-p', head, '-m', message])).trim();
    await git(repository, [
      'update-ref',
      '-m',
      'Huandeng checkpoint',
      baseline.ref ?? 'HEAD',
      commit,
      head,
    ]);
    baseline.head = commit;
    for (const [file, recorded] of approved)
      if (baseline.allowed.get(file) === recorded) baseline.allowed.delete(file);
    return { status: 'committed', commit, files: treeFiles };
  } catch (error) {
    return deferred(
      'GIT_FAILED',
      `Git checkpoint did not complete: ${error instanceof Error ? error.message : String(error)}${staged ? ' Previously staged files were left untouched for review.' : ''}`,
      undefined,
      staged,
    );
  }
}

export function checkpoint(
  root: string,
  snapshot: DeckSnapshot,
  message: string,
): Promise<CheckpointResult> {
  const baseline = baselines.get(rootKey(root));
  const key = baseline?.repository ?? rootKey(root);
  const previous =
    checkpoints.get(key) ?? Promise.resolve<CheckpointResult>({ status: 'unchanged' });
  const pending = previous
    .catch(() => ({ status: 'unchanged' as const }))
    .then(() => performCheckpoint(root, snapshot, message));
  checkpoints.set(key, pending);
  void pending.finally(() => {
    if (checkpoints.get(key) === pending) checkpoints.delete(key);
  });
  return pending;
}
