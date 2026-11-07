import { execFile } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { afterEach, describe, expect, it } from 'vitest';
import { deckFixture } from './fixtures.test-utils';
import {
  checkpoint,
  recordCheckpoint,
  recordCheckpointMetadataInitialization,
  registerCheckpointRoot,
} from './git';
import { METADATA_PATH } from './identity';
import type { DeckSnapshot, DocumentEvent, Revision } from './types';

const run = promisify(execFile);
const directories: string[] = [];

function hash(value: string | Uint8Array): Revision {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

async function git(root: string, args: string[]) {
  return (await run('git', ['--literal-pathspecs', '-C', root, ...args])).stdout;
}

async function write(root: string, file: string, source: string) {
  await fs.mkdir(path.dirname(path.join(root, file)), { recursive: true });
  await fs.writeFile(path.join(root, file), source);
}

async function fixture(options: { nested?: boolean; metadata?: boolean } = {}) {
  const repository = await fs.mkdtemp(path.join(os.tmpdir(), 'huandeng-checkpoint-'));
  directories.push(repository);
  const root = options.nested ? path.join(repository, 'Study deck') : repository;
  await fs.mkdir(root, { recursive: true });
  await git(repository, ['init', '--quiet']);
  await git(repository, ['config', 'user.name', 'Huandeng Test']);
  await git(repository, ['config', 'user.email', 'huandeng-test@example.invalid']);
  await git(repository, ['config', 'commit.gpgSign', 'false']);
  await git(repository, ['config', 'core.autocrlf', 'false']);
  await git(repository, ['config', 'core.hooksPath', '.git/checkpoint-hooks']);
  const snapshot = deckFixture();
  const first = snapshot.pages[0];
  first.path = options.nested ? 'pages/figure [draft].page' : first.path;
  first.metadata.path = first.path;
  const second = structuredClone(first);
  second.pageId = 'page-test-2';
  second.shortCode = 'R8P3';
  second.path = 'pages/second.page';
  second.metadata = { ...second.metadata, shortCode: second.shortCode, path: second.path };
  snapshot.pages.push(second);
  snapshot.metadata.slides[second.pageId] = second.metadata;
  snapshot.manifest.pages = snapshot.pages.map((page) => page.path);
  for (const page of snapshot.pages) {
    const source = `${JSON.stringify(page.data, null, 2)}\n`;
    await write(root, page.path, source);
    page.pageRevision = hash(source);
  }
  const manifest = `${JSON.stringify(snapshot.manifest, null, 2)}\n`;
  await write(root, snapshot.entry, manifest);
  snapshot.manifestRevision = hash(manifest);
  const metadata = `${JSON.stringify(snapshot.metadata, null, 2)}\n`;
  snapshot.metadataRevision = options.metadata === false ? null : hash(metadata);
  snapshot.identityPersisted = options.metadata !== false;
  if (options.metadata !== false) await write(root, METADATA_PATH, metadata);
  await write(repository, 'notes.txt', 'Existing unrelated work\n');
  const prefix = path.relative(repository, root).split(path.sep).join('/');
  const relative = (file: string) => [prefix, file].filter(Boolean).join('/');
  const seed = [
    snapshot.entry,
    ...snapshot.pages.map((page) => page.path),
    ...(options.metadata === false ? [] : [METADATA_PATH]),
  ].map(relative);
  await git(repository, ['add', '--', 'notes.txt', ...seed]);
  await git(repository, ['commit', '--quiet', '-m', 'Initial fixture']);
  return { repository, root, snapshot, relative };
}

async function savedPage(
  root: string,
  snapshot: DeckSnapshot,
  text: string,
  index = 0,
  crlf = false,
) {
  const page = snapshot.pages[index];
  const before = page.pageRevision;
  page.data.notes = text;
  const source = `${JSON.stringify(page.data, null, 2)}\n`.replace(/\n/g, crlf ? '\r\n' : '\n');
  await write(root, page.path, source);
  page.pageRevision = hash(source);
  page.renderRevision = page.pageRevision;
  snapshot.sequence++;
  const event: DocumentEvent = {
    type: 'committed',
    epoch: snapshot.epoch,
    sequence: snapshot.sequence,
    operationId: randomUUID(),
    changedPages: { [page.pageId]: { before, after: page.pageRevision } },
    manifestChanged: false,
    metadataChanged: false,
    diagnostics: [],
  };
  const recorded = recordCheckpoint(root, snapshot, event);
  return { source, event, recorded };
}

afterEach(async () => {
  await Promise.all(
    directories.splice(0).map((directory) => fs.rm(directory, { recursive: true, force: true })),
  );
});

// Real Git process startup on Windows exceeds the default five-second test budget.
describe('scoped Git checkpoints', { timeout: 30_000 }, () => {
  it('commits only accumulated successful saves and updates the HEAD baseline after each commit', async () => {
    const { root, snapshot } = await fixture();
    const initial = (await git(root, ['rev-parse', 'HEAD'])).trim();
    await registerCheckpointRoot(root);
    await savedPage(root, snapshot, 'First save');
    const final = await savedPage(root, snapshot, 'Latest successful save');
    expect(final.recorded.status).toBe('recorded');
    const committed = await checkpoint(root, snapshot, 'Reviewed scientific revision');
    expect(committed, JSON.stringify(committed)).toMatchObject({
      status: 'committed',
      files: [snapshot.pages[0].path],
    });
    expect(await git(root, ['show', `HEAD:${snapshot.pages[0].path}`])).toBe(final.source);
    expect((await git(root, ['rev-parse', 'HEAD^'])).trim()).toBe(initial);
    expect(await git(root, ['status', '--porcelain=v1'])).toBe('');
    expect(await checkpoint(root, snapshot, 'Nothing new')).toEqual({ status: 'unchanged' });
    await savedPage(root, snapshot, 'Next batch', 1);
    const second = await checkpoint(root, snapshot, 'Second checkpoint');
    expect(second).toMatchObject({ status: 'committed', files: [snapshot.pages[1].path] });
    if (committed.status !== 'committed') throw new Error('Missing checkpoint commit');
    expect((await git(root, ['rev-parse', 'HEAD^'])).trim()).toBe(committed.commit);
  });

  it('uses literal repository-relative paths for projects in nested directories', async () => {
    const { root, repository, snapshot, relative } = await fixture({ nested: true });
    await registerCheckpointRoot(root);
    const saved = await savedPage(root, snapshot, 'A literal [draft] filename');
    const result = await checkpoint(root, snapshot, 'Nested project checkpoint');
    expect(result).toMatchObject({
      status: 'committed',
      files: [relative(snapshot.pages[0].path)],
    });
    expect(await git(repository, ['show', `HEAD:${relative(snapshot.pages[0].path)}`])).toBe(
      saved.source,
    );
    expect(await git(repository, ['status', '--porcelain=v1'])).toBe('');
  });

  it('defers a dirty baseline without preventing or reverting document saves', async () => {
    const { root, snapshot } = await fixture();
    await write(root, 'notes.txt', 'Work that predates the editor\n');
    await registerCheckpointRoot(root);
    const saved = await savedPage(root, snapshot, 'Document save still succeeds');
    expect(await checkpoint(root, snapshot, 'Cannot claim pre-existing work')).toMatchObject({
      status: 'deferred',
      code: 'UNCLEAN_BASELINE',
    });
    expect(await fs.readFile(path.join(root, snapshot.pages[0].path), 'utf8')).toBe(saved.source);
    expect(await git(root, ['diff', '--cached', '--name-only'])).toBe('');
    expect(await fs.readFile(path.join(root, 'notes.txt'), 'utf8')).toBe(
      'Work that predates the editor\n',
    );
  });

  it('rejects a HEAD move before touching the index', async () => {
    const { root, snapshot } = await fixture();
    await registerCheckpointRoot(root);
    await savedPage(root, snapshot, 'Owned save');
    await git(root, ['commit', '--quiet', '--allow-empty', '-m', 'Another process moved HEAD']);
    const head = await git(root, ['rev-parse', 'HEAD']);
    expect(await checkpoint(root, snapshot, 'Stale baseline')).toMatchObject({
      status: 'deferred',
      code: 'HEAD_CHANGED',
    });
    expect(await git(root, ['rev-parse', 'HEAD'])).toBe(head);
    expect(await git(root, ['diff', '--cached', '--name-only'])).toBe('');
  });

  it('rejects a branch change even if both branches point to the same commit', async () => {
    const { root, snapshot } = await fixture();
    await registerCheckpointRoot(root);
    await savedPage(root, snapshot, 'Owned save');
    await git(root, ['checkout', '--quiet', '-b', 'other-work']);
    expect(await checkpoint(root, snapshot, 'Wrong branch')).toMatchObject({
      status: 'deferred',
      code: 'HEAD_CHANGED',
    });
    expect(await git(root, ['diff', '--cached', '--name-only'])).toBe('');
  });

  it('preserves unrelated staged work exactly and stages no deck files', async () => {
    const { root, snapshot } = await fixture();
    await registerCheckpointRoot(root);
    await savedPage(root, snapshot, 'Owned save');
    await write(root, 'notes.txt', 'Already staged by the author\n');
    await git(root, ['add', '--', 'notes.txt']);
    const before = await git(root, ['ls-files', '--stage']);
    expect(await checkpoint(root, snapshot, 'Must defer')).toMatchObject({
      status: 'deferred',
      code: 'INDEX_NOT_EMPTY',
    });
    expect(await git(root, ['ls-files', '--stage'])).toBe(before);
    expect((await git(root, ['diff', '--cached', '--name-only'])).trim()).toBe('notes.txt');
  });

  it.each(['notes.txt', 'pages/second.page'])(
    'rejects unrecorded changes in %s, including another known slide',
    async (file) => {
      const { root, snapshot } = await fixture();
      await registerCheckpointRoot(root);
      await savedPage(root, snapshot, 'Owned first-page save');
      await write(root, file, 'External edit outside the successful transaction\n');
      expect(await checkpoint(root, snapshot, 'Not a broad page allowlist')).toMatchObject({
        status: 'deferred',
        code: 'UNRECORDED_CHANGES',
        files: [file],
      });
      expect(await git(root, ['diff', '--cached', '--name-only'])).toBe('');
    },
  );

  it('rejects external bytes in a saved page even before the watcher reports them', async () => {
    const { root, snapshot } = await fixture();
    await registerCheckpointRoot(root);
    const saved = await savedPage(root, snapshot, 'Approved page bytes');
    const external = `${saved.source}\n# Outside writer\n`;
    await write(root, snapshot.pages[0].path, external);
    expect(await checkpoint(root, snapshot, 'External bytes must stay outside')).toMatchObject({
      status: 'deferred',
      code: 'EXTERNAL_BYTES_CHANGED',
      files: [snapshot.pages[0].path],
    });
    expect(await fs.readFile(path.join(root, snapshot.pages[0].path), 'utf8')).toBe(external);
    expect(await git(root, ['diff', '--cached', '--name-only'])).toBe('');
  });

  it('keeps the batch invalid after an external page edit followed by a successful writer save', async () => {
    const { root, snapshot } = await fixture();
    await registerCheckpointRoot(root);
    const head = await git(root, ['rev-parse', 'HEAD']);
    const saved = await savedPage(root, snapshot, 'First managed save');
    const page = snapshot.pages[0];
    page.data.externalAnnotation = 'Added outside the writer';
    const external = `${JSON.stringify(page.data, null, 2)}\n`;
    await write(root, page.path, external);
    page.pageRevision = hash(external);
    snapshot.sequence++;
    const externalEvent: DocumentEvent = {
      ...saved.event,
      type: 'external',
      sequence: snapshot.sequence,
      operationId: undefined,
      changedPages: { [page.pageId]: { before: hash(saved.source), after: page.pageRevision } },
    };
    expect(recordCheckpoint(root, snapshot, externalEvent)).toMatchObject({ status: 'deferred' });
    const later = await savedPage(root, snapshot, 'A later GUI or MCP patch');
    expect(later.source).toContain('Added outside the writer');
    expect(later.recorded).toMatchObject({ status: 'deferred' });
    expect(await checkpoint(root, snapshot, 'Must not adopt the external edit')).toMatchObject({
      status: 'deferred',
      code: 'UNCLEAN_BASELINE',
      reason: expect.stringContaining('External source changes'),
    });
    expect(await git(root, ['rev-parse', 'HEAD'])).toBe(head);
    expect(await git(root, ['diff', '--cached', '--name-only'])).toBe('');
    expect(await fs.readFile(path.join(root, page.path), 'utf8')).toBe(later.source);
  });

  it('clears the committed allowlist so later edits to the same path need a new receipt', async () => {
    const { root, snapshot } = await fixture();
    await registerCheckpointRoot(root);
    await savedPage(root, snapshot, 'Owned save');
    expect(await checkpoint(root, snapshot, 'First checkpoint')).toMatchObject({
      status: 'committed',
    });
    await write(root, snapshot.pages[0].path, 'External edit after a successful checkpoint\n');
    expect(await checkpoint(root, snapshot, 'No new receipt')).toMatchObject({
      status: 'deferred',
      code: 'UNRECORDED_CHANGES',
    });
    expect(await git(root, ['diff', '--cached', '--name-only'])).toBe('');
  });

  it('records only a sidecar genuinely initialized after the clean baseline', async () => {
    const { root, snapshot } = await fixture({ metadata: false });
    await registerCheckpointRoot(root);
    const source = `${JSON.stringify(snapshot.metadata, null, 2)}\n`;
    await write(root, METADATA_PATH, source);
    snapshot.identityPersisted = true;
    snapshot.metadataRevision = hash(source);
    expect(recordCheckpointMetadataInitialization(root, snapshot)).toEqual({
      status: 'recorded',
      files: [METADATA_PATH],
    });
    expect(recordCheckpointMetadataInitialization(root, snapshot)).toEqual({ status: 'ignored' });
    expect(await checkpoint(root, snapshot, 'Persist stable identities')).toMatchObject({
      status: 'committed',
      files: [METADATA_PATH],
    });
    expect(await git(root, ['show', `HEAD:${METADATA_PATH}`])).toBe(source);
  });

  it('does not call an existing externally changed sidecar initialization', async () => {
    const { root, snapshot } = await fixture();
    await registerCheckpointRoot(root);
    await write(root, METADATA_PATH, '{"external":true}\n');
    snapshot.metadataRevision = hash('{"external":true}\n');
    expect(recordCheckpointMetadataInitialization(root, snapshot)).toEqual({ status: 'ignored' });
    expect(await checkpoint(root, snapshot, 'Cannot claim external metadata')).toMatchObject({
      status: 'deferred',
      code: 'UNRECORDED_CHANGES',
    });
  });

  it('verifies raw CRLF source hashes while allowing Git line-ending normalization in its blob', async () => {
    const { root, snapshot } = await fixture();
    await git(root, ['config', 'core.autocrlf', 'true']);
    await registerCheckpointRoot(root);
    const saved = await savedPage(root, snapshot, 'Windows source bytes', 0, true);
    expect(await checkpoint(root, snapshot, 'CRLF-aware checkpoint')).toMatchObject({
      status: 'committed',
    });
    expect(await fs.readFile(path.join(root, snapshot.pages[0].path), 'utf8')).toBe(saved.source);
    expect(await git(root, ['show', `HEAD:${snapshot.pages[0].path}`])).toBe(
      saved.source.replace(/\r\n/g, '\n'),
    );
  });

  it('defers to Git signing without staging anything', async () => {
    const { root, snapshot } = await fixture();
    await registerCheckpointRoot(root);
    await savedPage(root, snapshot, 'Signed workflow');
    await git(root, ['config', 'commit.gpgSign', 'true']);
    expect(await checkpoint(root, snapshot, 'Requires author signing')).toMatchObject({
      status: 'deferred',
      code: 'SIGNING_REQUIRED',
    });
    expect(await git(root, ['diff', '--cached', '--name-only'])).toBe('');
  });

  it.each(['pre-commit', 'prepare-commit-msg', 'commit-msg', 'post-commit'])(
    'preserves an enabled %s hook including core.hooksPath',
    async (hook) => {
      const { root, snapshot } = await fixture();
      await registerCheckpointRoot(root);
      await savedPage(root, snapshot, 'Hook-managed workflow');
      const file = path.join('.git', 'custom-hooks', hook);
      await write(root, file, '#!/bin/sh\nexit 99\n');
      await fs.chmod(path.join(root, file), 0o755);
      await git(root, ['config', 'core.hooksPath', '.git/custom-hooks']);
      expect(await checkpoint(root, snapshot, 'Use normal Git')).toMatchObject({
        status: 'deferred',
        code: 'COMMIT_HOOKS_REQUIRED',
      });
      expect(await git(root, ['diff', '--cached', '--name-only'])).toBe('');
    },
  );

  it.skipIf(process.platform === 'win32')(
    'does not treat a non-executable hook file as an enabled hook',
    async () => {
      const { root, snapshot } = await fixture();
      await registerCheckpointRoot(root);
      await savedPage(root, snapshot, 'Inactive hook file');
      const file = path.join('.git', 'checkpoint-hooks', 'pre-commit');
      await write(root, file, '#!/bin/sh\nexit 99\n');
      await fs.chmod(path.join(root, file), 0o644);
      expect(await checkpoint(root, snapshot, 'No enabled hook')).toMatchObject({
        status: 'committed',
      });
    },
  );
});
