import { randomUUID } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { unzipSync } from 'fflate';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { presentationSnapshot } from './presentation-snapshot';
import { archivePath, writeProjectZip } from './project-archive';
import { projectTestDirectory } from './project-directory.test-utils';
import { ExportManager } from './runtime-export';
import { openPptdStore, type PptdStore } from './store';
import type { PptdOperation } from './types';
import type { ExportJobStatus } from './video-plan';

const directories: string[] = [];
const stores: PptdStore[] = [];
const managers: ExportManager[] = [];
const servers: http.Server[] = [];
afterEach(async () => {
  for (const manager of managers.splice(0)) await manager.dispose();
  for (const server of servers.splice(0)) {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
  await Promise.allSettled(stores.splice(0).map((store) => store.close()));
  await Promise.all(
    directories.splice(0).map((directory) => fs.rm(directory, { recursive: true, force: true })),
  );
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

async function put(root: string, name: string, bytes: string | Buffer) {
  const file = path.join(root, name);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, bytes);
}

async function fixture(empty = false, localRuntime = false) {
  const directory = await projectTestDirectory('huandeng-project-zip-', ['project', 'extracted']);
  directories.push(directory);
  const root = path.join(directory, 'project');
  const entry = '研究介绍.pptd';
  await put(
    root,
    entry,
    `title: Project handoff\nsize: [960, 540]\npages: ${empty ? '[]' : '[pages/甲.page, pages/乙.page]'}\n`,
  );
  const source =
    '# Keep author comments\nelements:\n  - elementId: figure\n    elementType: image\n    bounds: [10, 20, 300, 200]\n    src: media/原图.svg\n    citation: { url: https://example.org/paper }\nnotes: Original notes\n';
  if (!empty) {
    await put(root, 'pages/甲.page', source);
    await put(root, 'pages/乙.page', source.replace('Original notes', 'Second notes'));
    await put(
      root,
      'media/原图.svg',
      '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>',
    );
  }
  const stateDir = path.join(localRuntime ? root : directory, 'local-runtime');
  const store = await openPptdStore({ entryPath: path.join(root, entry), stateDir });
  stores.push(store);
  return { directory, root, entry, store };
}

function edit(store: PptdStore, operations: PptdOperation[]) {
  const snapshot = store.getSnapshot();
  return store.commit({
    requestId: randomUUID(),
    deckId: snapshot.deckId,
    actor: 'archive-test',
    expected: {
      pages: Object.fromEntries(snapshot.pages.map((page) => [page.pageId, page.pageRevision])),
      manifest: snapshot.manifestRevision,
      metadata: snapshot.metadataRevision,
    },
    operations,
  });
}

async function capture(f: Awaited<ReturnType<typeof fixture>>, suffix = 'frozen') {
  return f.store.captureProjectArchive(
    path.join(f.directory, suffix),
    new AbortController().signal,
  );
}

async function unzip(file: string, root: string) {
  const entries = unzipSync(await fs.readFile(file));
  for (const [name, bytes] of Object.entries(entries)) {
    if (name.endsWith('/')) await fs.mkdir(path.join(root, name), { recursive: true });
    else await put(root, archivePath(name), Buffer.from(bytes));
  }
  return entries;
}

async function service(f: Awaited<ReturnType<typeof fixture>>) {
  vi.stubEnv('HUANDENG_RUNTIME_DIR', path.join(f.directory, 'export-runtime'));
  const manager = new ExportManager(f.root);
  managers.push(manager);
  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const [, , , id, kind] = url.pathname.split('/');
    void manager.respond(id, kind, url.searchParams, res);
  });
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('No test server address.');
  const base = `http://127.0.0.1:${address.port}`;
  const status = async (id: string) =>
    (await fetch(`${base}/__pptd/exports/${id}/status`)).json() as Promise<ExportJobStatus>;
  return { manager, base, status };
}

describe('editable Project ZIP', () => {
  it('extracts and reopens original sources, Unicode assets, hidden pages, Story and a named-version Presentation', async () => {
    const f = await fixture(false, true);
    const first = f.store.getSnapshot().pages[0];
    const originalAsset = await fs.readFile(path.join(f.root, 'media/原图.svg'));
    const version = await f.store.createPageCheckpoint({
      requestId: randomUUID(),
      pageId: first.pageId,
      label: '原图与讲稿',
      actor: 'author',
      expectedPageRevision: first.pageRevision,
      expectedMetadataRevision: f.store.getSnapshot().metadataRevision,
    });
    await edit(f.store, [{ op: 'page.notes.set', pageId: first.pageId, text: 'Latest notes' }]);
    const metadataFile = path.join(f.root, '.huandeng/project.json');
    const metadata = JSON.parse(await fs.readFile(metadataFile, 'utf8'));
    metadata.slides[first.pageId].hidden = true;
    const story = {
      purpose: 'Why the project exists',
      audience: 'Colleagues',
      takeaway: 'Continue editing',
    };
    metadata.project = {
      schemaVersion: 1,
      mainStory: story,
      sections: [
        {
          id: 'intro',
          title: 'Opening',
          pageIds: f.store.getSnapshot().pages.map((page) => page.pageId),
          story,
        },
      ],
      presentations: [
        {
          id: 'short',
          title: 'Short talk',
          story,
          items: [
            {
              id: 'first',
              kind: 'page',
              pageId: first.pageId,
              versionId: version.versionId,
              notes: 'Occurrence notes',
            },
            { id: 'repeat', kind: 'page', pageId: first.pageId },
          ],
        },
      ],
    };
    await fs.writeFile(metadataFile, JSON.stringify(metadata));
    await put(f.root, 'AGENTS.md', 'Retain the author’s story.\n');
    await put(f.root, 'sources/分析.py', 'print("keep scientific source")\n');
    await put(f.root, 'sources/original.zip', Buffer.from('author-owned source archive'));
    await put(f.root, '.claude/skills/author/SKILL.md', 'Author guidance');
    await put(f.root, '.env.example', 'EXAMPLE=replace-me');
    await put(f.root, 'project.ico', Buffer.from('portable icon'));
    await put(f.root, 'Desktop.ini', '[.ShellClassInfo]\nIconResource=project.ico,0');
    await put(f.root, 'media/unused-original.dat', Buffer.from('keep unused original'));
    const omitted = [
      'Exports/old.zip',
      '.git/config',
      'node_modules/pkg/code.js',
      '.verification/session.json',
      '.env',
      '.mcp.json',
      '.claude/settings.local.json',
      'sources/__pycache__/analysis.pyc',
    ];
    for (const name of omitted) await put(f.root, name, 'machine-only');
    await fs.mkdir(path.join(f.root, 'empty-author-folder'));
    const frozen = await capture(f);
    expect(frozen.entry).toBe(f.entry);
    expect(frozen.namedVersions).toBe(1);
    const file = path.join(f.directory, 'handoff.zip');
    await writeProjectZip(frozen, file, new AbortController().signal);
    const extracted = path.join(f.directory, 'extracted');
    const entries = await unzip(file, extracted);
    for (const name of omitted) expect(entries[name]).toBeUndefined();
    expect(Object.keys(entries).some((name) => name.startsWith('local-runtime/'))).toBe(false);
    for (const name of [
      'sources/original.zip',
      '.claude/skills/author/SKILL.md',
      'project.ico',
      'Desktop.ini',
      'media/unused-original.dat',
      '.env.example',
    ])
      expect(Buffer.from(entries[name])).toEqual(await fs.readFile(path.join(f.root, name)));
    expect(entries['empty-author-folder/']).toBeDefined();
    expect(frozen.excluded.some((item) => item.path === 'local-runtime')).toBe(true);
    const reopened = await openPptdStore({
      entryPath: path.join(extracted, f.entry),
      stateDir: path.join(f.directory, 'reopened-state'),
    });
    stores.push(reopened);
    expect(reopened.getSnapshot().deckId).toBe(frozen.snapshot.deckId);
    expect(reopened.getSnapshot().metadata.project).toEqual(metadata.project);
    expect(reopened.getSnapshot().pages).toHaveLength(2);
    expect(reopened.getSnapshot().pages[0].metadata.hidden).toBe(true);
    expect(await fs.readFile(path.join(extracted, first.path))).toEqual(
      await fs.readFile(path.join(f.root, first.path)),
    );
    const restoredVersion = await reopened.readPageVersion(first.pageId, version.versionId);
    expect(restoredVersion.page.data.notes).toBe('Original notes');
    const source = restoredVersion.page.data.elements[0].src as string;
    expect(source).toMatch(/^media\/\.huandeng-versions\//);
    expect(await fs.readFile(path.join(extracted, source))).toEqual(originalAsset);
    const talk = await presentationSnapshot(reopened.getSnapshot(), 'short', (id, versionId) =>
      reopened.readPageVersion(id, versionId),
    );
    expect(talk.pages).toHaveLength(2);
    expect(talk.pages[0].data.notes).toBe('Occurrence notes');
    expect(talk.pages[1].data.notes).toBe('Latest notes');
  });

  it('captures before the next queued edit and releases the writer before ZIP compression', async () => {
    const f = await fixture();
    const page = f.store.getSnapshot().pages[0];
    const freezing = capture(f);
    const editing = edit(f.store, [
      { op: 'page.notes.set', pageId: page.pageId, text: 'Written after capture' },
    ]);
    const frozen = await freezing;
    await editing;
    expect(frozen.snapshot.pages[0].data.notes).toBe('Original notes');
    expect(f.store.getSnapshot().pages[0].data.notes).toBe('Written after capture');
    const file = path.join(f.directory, 'queued.zip');
    await writeProjectZip(frozen, file, new AbortController().signal);
    expect(Buffer.from(unzipSync(await fs.readFile(file))[page.path]).toString()).toContain(
      'Original notes',
    );
  });

  it.each([
    'media/missing.svg',
    '../outside.svg',
    'Exports/required.svg',
    'https://example.org/required.svg',
  ])('rejects incomplete or external required image %s without changing source', async (source) => {
    const f = await fixture();
    await put(f.root, 'Exports/required.svg', 'excluded image');
    const page = f.store.getSnapshot().pages[0];
    await edit(f.store, [
      { op: 'element.patch', pageId: page.pageId, elementId: 'figure', set: { src: source } },
    ]);
    const before = await fs.readFile(path.join(f.root, page.path));
    await expect(capture(f)).rejects.toThrow();
    expect(await fs.readFile(path.join(f.root, page.path))).toEqual(before);
  });

  it('refuses a junction or symbolic-link dependency instead of following it outside the Project', async () => {
    const f = await fixture();
    const external = path.join(f.directory, 'outside');
    await put(external, 'external.svg', 'outside bytes');
    await fs.symlink(
      external,
      path.join(f.root, 'media/linked'),
      process.platform === 'win32' ? 'junction' : 'dir',
    );
    const page = f.store.getSnapshot().pages[0];
    await edit(f.store, [
      {
        op: 'element.patch',
        pageId: page.pageId,
        elementId: 'figure',
        set: { src: 'media/linked/external.svg' },
      },
    ]);
    await expect(capture(f)).rejects.toThrow(/symbolic link|resolves elsewhere/);
  });

  it('excludes worktree .git files and generated dependency junctions before reading them', async () => {
    const f = await fixture();
    const external = path.join(f.directory, 'external-dependencies');
    await put(external, 'private.txt', 'must not be read');
    await put(f.root, '.git', 'gitdir: C:/private/worktree');
    await fs.symlink(
      external,
      path.join(f.root, 'node_modules'),
      process.platform === 'win32' ? 'junction' : 'dir',
    );
    const frozen = await capture(f);
    expect(
      frozen.files.some((file) => file.path === '.git' || file.path.startsWith('node_modules/')),
    ).toBe(false);
    expect(frozen.excluded.map((item) => item.path)).toEqual(
      expect.arrayContaining(['.git', 'node_modules']),
    );
  });

  it('detects an external author-file change during copying', async () => {
    const f = await fixture();
    await put(f.root, 'sources/data.txt', 'original data');
    let changed = false;
    await expect(
      f.store.captureProjectArchive(
        path.join(f.directory, 'frozen'),
        new AbortController().signal,
        (progress) => {
          if (!changed && progress.completedFiles > 0) {
            changed = true;
            writeFileSync(path.join(f.root, 'sources/data.txt'), 'externally changed data');
          }
        },
      ),
    ).rejects.toMatchObject({ code: 'REVISION_CONFLICT' });
    expect(changed).toBe(true);
  });

  it('refuses a missing version asset even when Main no longer uses that image', async () => {
    const f = await fixture();
    const page = f.store.getSnapshot().pages[0];
    const version = await f.store.createPageCheckpoint({
      requestId: randomUUID(),
      pageId: page.pageId,
      label: 'Named',
      actor: 'author',
      expectedPageRevision: page.pageRevision,
      expectedMetadataRevision: f.store.getSnapshot().metadataRevision,
    });
    const saved = await f.store.readPageVersion(page.pageId, version.versionId);
    await fs.unlink(path.join(f.root, saved.page.data.elements[0].src as string));
    await expect(capture(f)).rejects.toThrow();
  });

  it('supports an empty saved Project and publishes a ZIP download with the real entry name', async () => {
    const f = await fixture(true);
    const { manager, status, base } = await service(f);
    const job = await manager.startProjectArchive(f.store.getSnapshot(), (...args) =>
      f.store.captureProjectArchive(...args),
    );
    await vi.waitFor(async () => expect((await status(job.id)).state).toBe('completed'), {
      timeout: 10000,
    });
    const completed = await status(job.id);
    expect(completed.result?.fileName).toBe('研究介绍-project.zip');
    const response = await fetch(new URL(completed.result?.url ?? '', base));
    expect(response.headers.get('content-type')).toBe('application/zip');
    expect(response.headers.get('content-disposition')).toContain(
      encodeURIComponent('研究介绍-project.zip'),
    );
    expect(unzipSync(new Uint8Array(await response.arrayBuffer()))[f.entry]).toBeDefined();
    expect(completed.result?.report).toMatchObject({
      format: 'zip',
      scope: 'project',
      entry: f.entry,
    });
  });

  it('cancels a live archive, cleans staging and preserves the previously published ZIP', async () => {
    const f = await fixture();
    const { manager, status } = await service(f);
    const old = path.join(f.root, 'Exports', '研究介绍-project.zip');
    await put(f.root, 'Exports/研究介绍-project.zip', 'previous archive');
    const job = await manager.startProjectArchive(
      f.store.getSnapshot(),
      async (directory, signal) => {
        await put(directory, 'partial.bin', 'partial capture');
        await new Promise<void>((_resolve, reject) => {
          const abort = () => reject(signal.reason);
          if (signal.aborted) abort();
          else signal.addEventListener('abort', abort, { once: true });
        });
        throw new Error('Unreachable');
      },
    );
    await expect(
      manager.startProjectArchive(f.store.getSnapshot(), (...args) =>
        f.store.captureProjectArchive(...args),
      ),
    ).rejects.toThrow();
    manager.cancel(job.id);
    await vi.waitFor(async () => expect((await status(job.id)).state).toBe('cancelled'));
    await vi.waitFor(async () =>
      expect(
        await fs.access(path.join(f.directory, 'export-runtime/export-jobs', job.id)).then(
          () => true,
          () => false,
        ),
      ).toBe(false),
    );
    expect(await fs.readFile(old, 'utf8')).toBe('previous archive');
  });

  it('honors cancellation between compression chunks', async () => {
    const f = await fixture();
    await put(f.root, 'sources/large.bin', Buffer.alloc(1024 * 1024, 42));
    const frozen = await capture(f);
    const controller = new AbortController();
    await expect(
      writeProjectZip(
        frozen,
        path.join(f.directory, 'cancelled.zip'),
        controller.signal,
        (progress) => {
          if (progress.completedBytes > 0) controller.abort();
        },
      ),
    ).rejects.toThrow();
  });

  it.each([
    '../secret',
    '/absolute',
    'C:\\secret',
    'folder/../secret',
    'folder/CON.txt',
    'folder/trailing.',
    'folder/x\0y',
  ])('rejects unsafe or non-portable archive path %s', (value) => {
    expect(() => archivePath(value)).toThrow();
  });
});
