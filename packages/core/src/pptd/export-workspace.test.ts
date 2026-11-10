import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ExportWorkspace } from './export-workspace';
import { deckFixture } from './fixtures.test-utils';

const cleanups: (() => Promise<unknown>)[] = [];
afterEach(async () => {
  vi.restoreAllMocks();
  for (const cleanup of cleanups.reverse()) await cleanup();
  cleanups.length = 0;
  vi.unstubAllEnvs();
});

async function setup(ttlMs?: number) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'huandeng-export-life-'));
  vi.stubEnv('HUANDENG_RUNTIME_DIR', path.join(root, 'runtime'));
  const workspace = new ExportWorkspace(root, ttlMs);
  cleanups.push(() => fs.rm(root, { recursive: true, force: true }));
  cleanups.push(() => workspace.dispose());
  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const [, id, kind] = url.pathname.split('/');
    void workspace.respond(id, kind, url.searchParams, res);
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  cleanups.push(
    () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  );
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('No server address');
  return { root, workspace, url: `http://127.0.0.1:${address.port}` };
}

describe('export job ownership and retention', () => {
  it('exports authored folder names without treating table text as an asset', async () => {
    const { root, workspace } = await setup();
    await fs.mkdir(path.join(root, 'media'));
    const bytes = Buffer.from('actual-image-bytes');
    await fs.writeFile(path.join(root, 'media/actual.png'), bytes);
    const source = deckFixture([
      {
        elementId: 'folder-table',
        elementType: 'table',
        bounds: [56, 108, 848, 318],
        rows: ['pages/', 'media/', '.huandeng/', 'Exports/'].map((text) => [
          { text },
          { text: 'Project folder' },
        ]),
      },
      {
        elementId: 'actual-image',
        elementType: 'image',
        bounds: [0, 0, 20, 20],
        src: 'media/actual.png',
      },
    ]);
    const before = JSON.stringify(source);
    const job = await workspace.begin(source, 'png');
    await workspace.freezeAssets(job);
    expect([...job.assets.keys()]).toEqual(['media/actual.png']);
    expect(await fs.readFile(job.assets.get('media/actual.png') as string)).toEqual(bytes);
    expect(JSON.stringify(source)).toBe(before);
    await workspace.finish(job);
    const invalid = await workspace.begin(
      deckFixture([
        {
          elementId: 'directory-image',
          elementType: 'image',
          bounds: [0, 0, 20, 20],
          src: 'media/',
        },
      ]),
      'png',
    );
    await expect(workspace.freezeAssets(invalid)).rejects.toThrow();
    await workspace.finish(invalid, new Error('Invalid image source'));
  });
  it('keeps a published result successful during locked-file cleanup and retries after unlocking', async () => {
    const { workspace } = await setup();
    const job = await workspace.begin(deckFixture(), 'mp4');
    job.outputFile = path.join(job.directory, 'artifact.mp4');
    await fs.writeFile(job.outputFile, 'completed-video');
    const result = await workspace.publish(job, 'deck.mp4', true, {});
    const remove = fs.rm.bind(fs);
    let locked = true;
    vi.spyOn(fs, 'rm').mockImplementation(async (target, options) => {
      if (locked && String(target) === path.join(job.directory, 'snapshot.json'))
        throw Object.assign(new Error('Snapshot is locked.'), { code: 'EBUSY' });
      return remove(target, options);
    });
    await workspace.finish(job);
    expect(workspace.status(job.id).state).toBe('completed');
    expect(job.snapshot).toBeUndefined();
    expect(job.assets.size).toBe(0);
    expect(result.warnings).toHaveLength(1);
    expect(job.cleanupPending).toBe(true);
    expect(await fs.readFile(result.file, 'utf8')).toBe('completed-video');
    locked = false;
    await workspace.prune();
    expect(job.cleanupPending).toBe(false);
    await expect(fs.access(path.join(job.directory, 'snapshot.json'))).rejects.toThrow();
  });
  it('retains ownership of expired locked directories until pruning succeeds', async () => {
    const { workspace } = await setup();
    const job = await workspace.begin(deckFixture(), 'pdf');
    job.outputFile = path.join(job.directory, 'artifact.pdf');
    await fs.writeFile(job.outputFile, 'output');
    const result = await workspace.publish(job, 'deck.pdf', true, {});
    await workspace.finish(job);
    job.status.finishedAt = Date.now() - 16 * 60 * 1000;
    const remove = fs.rm.bind(fs);
    let locked = true;
    vi.spyOn(fs, 'rm').mockImplementation(async (target, options) => {
      if (locked && String(target) === job.directory)
        throw Object.assign(new Error('Download file is locked.'), { code: 'EBUSY' });
      return remove(target, options);
    });
    await workspace.prune();
    expect(job.cleanupPending).toBe(true);
    expect(await fs.stat(job.directory)).toBeTruthy();
    locked = false;
    await workspace.prune();
    await expect(fs.access(job.directory)).rejects.toThrow();
    expect(await fs.readFile(result.file, 'utf8')).toBe('output');
  });
  it('honours cancellation during publication staging without replacing the previous artifact', async () => {
    const { root, workspace } = await setup();
    await fs.mkdir(path.join(root, 'Exports'));
    await fs.writeFile(path.join(root, 'Exports/deck.mp4'), 'previous');
    const job = await workspace.begin(deckFixture(), 'mp4');
    job.outputFile = path.join(job.directory, 'artifact.mp4');
    await fs.writeFile(job.outputFile, 'replacement');
    const copy = fs.copyFile.bind(fs);
    vi.spyOn(fs, 'copyFile').mockImplementation(async (source, destination, flags) => {
      await copy(source, destination, flags);
      workspace.cancel(job.id);
    });
    await expect(workspace.publish(job, 'deck.mp4', true, {})).rejects.toThrow();
    await workspace.finish(job, new Error('cancelled while staging'));
    expect(workspace.status(job.id).state).toBe('cancelled');
    expect(await fs.readFile(path.join(root, 'Exports/deck.mp4'), 'utf8')).toBe('previous');
    expect(await fs.readdir(path.join(root, 'Exports'))).toEqual(['deck.mp4']);
  });
  it('reports a sidecar failure without mislabelling an already published artifact as failed', async () => {
    const { root, workspace, url } = await setup();
    await fs.mkdir(path.join(root, 'Exports/deck.pdf.report.json'), { recursive: true });
    await fs.writeFile(path.join(root, 'Exports/deck.pdf'), 'previous-output');
    const job = await workspace.begin(deckFixture(), 'pdf');
    job.outputFile = path.join(job.directory, 'artifact.pdf');
    await fs.writeFile(job.outputFile, 'new-valid-output');
    const result = await workspace.publish(job, 'deck.pdf', true, { current: true });
    await workspace.finish(job);
    expect(workspace.status(job.id).state).toBe('completed');
    expect(result.warnings).toHaveLength(1);
    expect(await fs.readFile(result.file, 'utf8')).toBe('new-valid-output');
    expect(await (await fetch(`${url}/${job.id}/report`)).json()).toEqual({ current: true });
  });
  it('keeps untrusted deck identities inside the runtime root and retains file extensions', async () => {
    const { root, workspace } = await setup();
    const source = deckFixture();
    source.deckId = '../../outside';
    const job = await workspace.begin(source, 'mp4');
    job.outputFile = path.join(job.directory, 'artifact.mp4');
    await fs.writeFile(job.outputFile, 'video');
    const result = await workspace.publish(job, `${'中文标题'.repeat(50)}.mp4`, false, {});
    await workspace.finish(job);
    expect(path.relative(path.join(root, 'runtime'), result.file).startsWith('..')).toBe(false);
    expect(result.fileName.endsWith('.mp4')).toBe(true);
    expect(Buffer.byteLength(result.fileName)).toBeLessThanOrEqual(200);
  });
  it('releases working resources and keeps each download immutable across later same-name exports', async () => {
    const { root, workspace, url } = await setup();
    const first = await workspace.begin(deckFixture(), 'pdf');
    await workspace.freezeAssets(first);
    first.outputFile = path.join(first.directory, 'artifact.pdf');
    await fs.writeFile(first.outputFile, 'first-output');
    await workspace.publish(first, 'deck.pdf', true, { version: 1 });
    await workspace.finish(first);
    expect(first.snapshot).toBeUndefined();
    expect(first.assets.size).toBe(0);
    expect((await fetch(`${url}/${first.id}/snapshot`)).status).toBe(404);
    const second = await workspace.begin(deckFixture(), 'pdf');
    second.outputFile = path.join(second.directory, 'artifact.pdf');
    await fs.writeFile(second.outputFile, 'second-output');
    await workspace.publish(second, 'deck.pdf', true, { version: 2 });
    await workspace.finish(second);
    expect(await fs.readFile(path.join(root, 'Exports/deck.pdf'), 'utf8')).toBe('second-output');
    expect(await (await fetch(`${url}/${first.id}/download`)).text()).toBe('first-output');
    expect(await (await fetch(`${url}/${first.id}/download`)).text()).toBe('first-output');
    expect(await (await fetch(`${url}/${second.id}/download`)).text()).toBe('second-output');
  });
  it('cancels active work, rejects concurrency, and never exposes partial output', async () => {
    const { workspace, url } = await setup();
    const job = await workspace.begin(deckFixture(), 'mp4');
    await expect(workspace.begin(deckFixture(), 'pdf')).rejects.toThrow(/已有导出任务/);
    job.outputFile = path.join(job.directory, 'partial.mp4');
    await fs.writeFile(job.outputFile, 'partial');
    workspace.cancel(job.id);
    expect(job.abort.signal.aborted).toBe(true);
    await workspace.finish(job, new Error('cancel'));
    expect(workspace.status(job.id).state).toBe('cancelled');
    expect((await fetch(`${url}/${job.id}/download`)).status).toBe(404);
    await expect(fs.access(job.directory)).rejects.toThrow();
  });
  it('expires without another export and keeps user-published files', async () => {
    const { root, workspace, url } = await setup(35);
    const job = await workspace.begin(deckFixture(), 'pdf');
    job.outputFile = path.join(job.directory, 'artifact.pdf');
    await fs.writeFile(job.outputFile, 'published');
    await workspace.publish(job, 'deck.pdf', true, {});
    await workspace.finish(job);
    await vi.waitFor(async () => {
      await expect(fs.access(job.directory)).rejects.toThrow();
    });
    expect((await fetch(`${url}/${job.id}/download`)).status).toBe(404);
    expect(await fs.readFile(path.join(root, 'Exports/deck.pdf'), 'utf8')).toBe('published');
  });
  it('drops failed tasks and prevents publishing through an Exports symlink', async () => {
    const { root, workspace } = await setup();
    const outside = await fs.mkdtemp(path.join(os.tmpdir(), 'huandeng-outside-'));
    cleanups.push(() => fs.rm(outside, { recursive: true, force: true }));
    await fs.symlink(
      outside,
      path.join(root, 'Exports'),
      process.platform === 'win32' ? 'junction' : 'dir',
    );
    const job = await workspace.begin(deckFixture(), 'pdf');
    job.outputFile = path.join(job.directory, 'artifact.pdf');
    await fs.writeFile(job.outputFile, 'output');
    await expect(workspace.publish(job, 'deck.pdf', true, {})).rejects.toMatchObject({
      code: 'PATH_OUTSIDE_PROJECT',
    });
    await workspace.finish(job, new Error('outside'));
    expect(job.snapshot).toBeUndefined();
    expect(await fs.readdir(outside)).toEqual([]);
  });
});
