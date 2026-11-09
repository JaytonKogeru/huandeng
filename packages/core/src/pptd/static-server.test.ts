import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import { get } from 'node:http';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { hashBytes } from './persistence';
import { projectTestDirectory } from './project-directory.test-utils';
import { createPptdStaticServer } from './static-server';
import { openPptdStore } from './store';
import type { DeckSnapshot, DocumentEvent, TransactionRequest } from './types';

const temporary: string[] = [];
const servers: Awaited<ReturnType<typeof createPptdStaticServer>>[] = [];
const originalPage =
  'elements:\n  - elementId: title\n    elementType: text\n    bounds: [20, 20, 300, 40]\n    content: { text: Original }\n  - elementId: figure\n    elementType: image\n    src: media/figure.svg\nnotes: Original notes\n';

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.allSettled(servers.splice(0).map((server) => server.close()));
  vi.unstubAllEnvs();
  await Promise.all(
    temporary.splice(0).map((directory) => fs.rm(directory, { recursive: true, force: true })),
  );
});

async function fixture() {
  const directory = await projectTestDirectory('huandeng-static-server-');
  temporary.push(directory);
  const project = path.join(directory, 'project');
  const clientRoot = path.join(directory, 'client');
  await fs.mkdir(path.join(project, 'pages'), { recursive: true });
  await fs.mkdir(path.join(project, 'media'));
  await fs.mkdir(path.join(clientRoot, 'assets'), { recursive: true });
  await fs.writeFile(path.join(project, 'pages/a.page'), originalPage);
  await fs.writeFile(path.join(project, 'pages/b.page'), originalPage);
  await fs.writeFile(path.join(project, 'media/figure.svg'), '<svg>before</svg>');
  const entryPath = path.join(project, 'deck.pptd');
  await fs.writeFile(
    entryPath,
    'title: Static editor fixture\nsize: [960, 540]\npages: [pages/a.page, pages/b.page]\n',
  );
  await fs.writeFile(
    path.join(clientRoot, 'huandeng.html'),
    '<!doctype html><html><body>HUANDENG production<script src="/assets/editor.js"></script></body></html>',
  );
  await fs.writeFile(path.join(clientRoot, 'assets/editor.js'), 'window.editor = true;');
  await fs.writeFile(path.join(directory, 'secret.txt'), 'outside client root');
  vi.stubEnv('HUANDENG_DECK', entryPath);
  vi.stubEnv('HUANDENG_READ_ONLY', '0');
  vi.stubEnv('HUANDENG_RUNTIME_DIR', path.join(directory, 'runtime'));
  const server = await createPptdStaticServer({ clientRoot, port: 0 });
  servers.push(server);
  const session = (await (await fetch(`${server.url}/__pptd/session`)).json()) as DeckSnapshot & {
    sessionToken: string;
  };
  return { directory, project, clientRoot, entryPath, server, session };
}

function eventReader(reader: ReadableStreamDefaultReader<Uint8Array>) {
  const decoder = new TextDecoder();
  let buffered = '';
  return async (): Promise<DocumentEvent & { sequence: number }> => {
    while (true) {
      const end = buffered.indexOf('\n\n');
      if (end >= 0) {
        const packet = buffered.slice(0, end);
        buffered = buffered.slice(end + 2);
        const data = packet.split('\n').find((line) => line.startsWith('data: '));
        if (data) return JSON.parse(data.slice(6));
        continue;
      }
      const chunk = await reader.read();
      if (chunk.done) throw new Error('The document event stream ended before the change.');
      buffered += decoder.decode(chunk.value, { stream: true });
    }
  };
}

describe('HUANDENG production document server', () => {
  it('serves exact read-only operation review and rejects IDs from another Project', async () => {
    const { server, session } = await fixture();
    const pageId = session.pages[0].pageId;
    const response = await fetch(`${server.url}/__pptd/transactions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-huandeng-token': session.sessionToken },
      body: JSON.stringify({
        requestId: randomUUID(),
        deckId: session.deckId,
        actor: 'synthetic-review-test',
        expected: { pages: { [pageId]: session.pages[0].pageRevision } },
        operations: [{ op: 'page.notes.set', pageId, text: 'Reviewed' }],
      }),
    });
    const receipt = await response.json();
    expect(response.status).toBe(200);
    const review = await fetch(
      `${server.url}/__pptd/reviews/${receipt.operationId}?pageId=${pageId}`,
    );
    expect(review.status).toBe(200);
    expect(await review.json()).toMatchObject({
      operationId: receipt.operationId,
      before: { page: { data: { notes: 'Original notes' } } },
      after: { page: { data: { notes: 'Reviewed' } } },
    });
    const other = await fixture();
    expect((await fetch(`${other.server.url}/__pptd/reviews/${receipt.operationId}`)).status).toBe(
      404,
    );
    expect(
      (
        await fetch(
          `${server.url}/__pptd/reviews/${receipt.operationId}?pageId=${session.pages[1].pageId}`,
        )
      ).status,
    ).toBe(404);
  });
  it('scopes task reports to the selected Project and leaves page history and sources unchanged', async () => {
    const first = await fixture();
    const second = await fixture();
    const report = {
      deckId: first.session.deckId,
      requestId: 'activity-one',
      taskId: 'review',
      sessionId: 'chat-one',
      actor: 'Assistant',
      status: 'running',
      summary: 'Reviewing the figure.',
    };
    const post = (url: string, token: string, body: unknown) =>
      fetch(`${url}/__pptd/activity`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-huandeng-token': token },
        body: JSON.stringify(body),
      });
    expect((await post(first.server.url, second.session.sessionToken, report)).status).toBe(403);
    expect((await post(second.server.url, second.session.sessionToken, report)).status).toBe(400);
    const saved = await (await post(first.server.url, first.session.sessionToken, report)).json();
    expect(saved).toMatchObject({
      source: 'client',
      deckId: first.session.deckId,
      summary: report.summary,
    });
    expect(await (await post(first.server.url, first.session.sessionToken, report)).json()).toEqual(
      saved,
    );
    const other = await (await fetch(`${second.server.url}/__pptd/activity`)).json();
    expect(other.events).toEqual([]);
    expect(await (await fetch(`${first.server.url}/__pptd/history`)).json()).toEqual([]);
    expect(await fs.readFile(path.join(first.project, 'pages/a.page'), 'utf8')).toBe(originalPage);
  });

  it('serves the current Story and read-only asset index through the real HTTP boundary', async () => {
    const { server, session, project } = await fixture();
    const first = session.pages[0].pageId;
    const metadata = structuredClone(session.metadata);
    metadata.project = {
      schemaVersion: 1,
      mainStory: { purpose: 'A complete account', audience: 'Lab', takeaway: 'Evidence first' },
      sections: [],
      presentations: [
        {
          id: 'talk',
          title: 'Short talk',
          story: { purpose: 'Explain the result', audience: 'Peers', takeaway: 'A useful finding' },
          items: [
            { id: 'opening', kind: 'page', pageId: first },
            { id: 'return', kind: 'page', pageId: first, notes: 'Return to the question' },
          ],
        },
      ],
    };
    await fs.writeFile(path.join(project, '.huandeng/project.json'), JSON.stringify(metadata));
    await fs.writeFile(path.join(project, 'media/unused.png'), 'unused bytes');
    const read = async (route: string) => (await fetch(`${server.url}/__pptd${route}`)).json();
    const brief = await read(
      `/story-briefing?presentationId=talk&pageId=${first}&occurrenceId=talk:return:${first}`,
    );
    expect(brief).toMatchObject({
      main: { story: { purpose: 'A complete account' } },
      presentation: { title: 'Short talk' },
      occurrence: { position: 2, notes: 'Return to the question' },
      page: { pageId: first },
      neighbors: { previous: { position: 1 }, next: null },
    });
    expect(await read(`/story-briefing?presentationId=talk&pageId=${first}`)).toMatchObject({
      code: 'AMBIGUOUS_ID',
      details: { occurrences: expect.any(Array) },
    });
    const before = await fs.readFile(path.join(project, '.huandeng/project.json'), 'utf8');
    const assets = await read('/assets?filter=used&limit=1');
    expect(assets).toMatchObject({
      scope: 'current-main',
      total: 1,
      hasMore: false,
      counts: { all: 2, used: 1, unused: 1, missing: 0 },
      items: [{ path: 'media/figure.svg', status: 'available', usage: expect.any(Array) }],
    });
    expect((await read('/assets?query=unused')).items).toMatchObject([
      { path: 'media/unused.png' },
    ]);
    expect((await fetch(`${server.url}/__pptd/assets?limit=201`)).status).toBe(400);
    expect((await fetch(`${server.url}/__pptd/assets?filter=unknown`)).status).toBe(400);
    expect((await fetch(`${server.url}/__pptd/story-briefing?pageId=`)).status).toBe(400);
    expect(await fs.readFile(path.join(project, '.huandeng/project.json'), 'utf8')).toBe(before);
  });
  it('serves the editor and export view with compiled assets and rejects invalid hosts and paths', async () => {
    const { server } = await fixture();
    const editor = await fetch(`${server.url}/huandeng`);
    expect(editor.headers.get('x-huandeng-runtime')).toBe('static');
    expect(editor.headers.get('cache-control')).toBe('no-store');
    expect(await editor.text()).toContain('HUANDENG production');
    expect((await fetch(`${server.url}/huandeng.html`)).headers.get('cache-control')).toBe(
      'no-store',
    );
    expect(await (await fetch(`${server.url}/huandeng/export/frozen-id`)).text()).toContain(
      'HUANDENG production',
    );
    const script = await fetch(`${server.url}/assets/editor.js`);
    expect(script.headers.get('content-type')).toContain('text/javascript');
    expect(script.headers.get('cache-control')).toContain('immutable');
    expect(await script.text()).toBe('window.editor = true;');
    expect((await fetch(`${server.url}/@vite/client`)).status).toBe(404);
    expect((await fetch(`${server.url}/%2e%2e%2fsecret.txt`)).status).toBe(403);
    expect((await fetch(`${server.url}/%2e%2e%5csecret.txt`)).status).toBe(403);
    const invalidHostStatus = await new Promise<number>((resolve, reject) => {
      get(`${server.url}/huandeng`, { headers: { host: 'not-local.invalid' } }, (response) => {
        response.resume();
        resolve(response.statusCode ?? 0);
      }).on('error', reject);
    });
    expect(invalidHostStatus).toBe(403);
    expect(
      (
        await fetch(`${server.url}/__pptd/session`, {
          headers: { origin: 'https://not-local.invalid' },
        })
      ).status,
    ).toBe(403);
  });

  it('uses the existing authenticated transaction writer, receipts and conflict checks', async () => {
    const { project, server, session } = await fixture();
    const page = session.pages[0];
    const transaction: TransactionRequest = {
      requestId: randomUUID(),
      actor: 'static-server-test',
      deckId: session.deckId,
      expected: { pages: { [page.pageId]: page.pageRevision } },
      operations: [
        { op: 'page.notes.set', pageId: page.pageId, text: 'Saved from the production server' },
      ],
    };
    const post = (request: TransactionRequest, token = session.sessionToken) =>
      fetch(`${server.url}/__pptd/transactions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-huandeng-token': token },
        body: JSON.stringify(request),
      });
    expect((await post(transaction, 'invalid')).status).toBe(403);
    const result = await (await post(transaction)).json();
    expect(result.ok).toBe(true);
    expect(await (await post(transaction)).json()).toEqual(result);
    expect(await fs.readFile(path.join(project, 'pages/a.page'), 'utf8')).toContain(
      'Saved from the production server',
    );
    expect(await fs.readFile(path.join(project, 'pages/b.page'), 'utf8')).toBe(originalPage);
    const stale = await post({ ...transaction, requestId: randomUUID() });
    expect(stale.status).toBe(409);
    expect(await stale.json()).toMatchObject({ code: 'REVISION_CONFLICT' });
  });

  it('previews without saving and binds authenticated proposal application to the exact payload', async () => {
    const { project, server, session } = await fixture();
    const page = session.pages[0];
    const transaction: TransactionRequest = {
      requestId: randomUUID(),
      actor: 'proposal-http-test',
      deckId: session.deckId,
      expected: { pages: { [page.pageId]: page.pageRevision } },
      operations: [{ op: 'page.notes.set', pageId: page.pageId, text: 'Applied after preview' }],
    };
    const post = (route: string, body: unknown, token = session.sessionToken) =>
      fetch(`${server.url}/__pptd${route}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-huandeng-token': token },
        body: JSON.stringify(body),
      });
    expect((await post('/proposals/preview', { transaction }, 'invalid')).status).toBe(403);
    const preview = await (await post('/proposals/preview', { transaction })).json();
    expect(preview).toMatchObject({ ok: true, kind: 'proposal-preview', createdPageCount: 0 });
    expect(await fs.readFile(path.join(project, 'pages/a.page'), 'utf8')).toBe(originalPage);
    expect(await (await fetch(`${server.url}/__pptd/history`)).json()).toEqual([]);
    expect((await post('/proposals/apply', { transaction })).status).toBe(400);
    expect(
      (
        await post('/proposals/apply', {
          transaction: { ...transaction, actor: 'tampered' },
          previewHash: preview.previewHash,
        })
      ).status,
    ).toBe(400);
    const applied = await (
      await post('/proposals/apply', { transaction, previewHash: preview.previewHash })
    ).json();
    expect(applied).toMatchObject({ ok: true, requestId: transaction.requestId });
    expect(
      await (
        await post('/proposals/apply', { transaction, previewHash: preview.previewHash })
      ).json(),
    ).toEqual(applied);
    expect(await fs.readFile(path.join(project, 'pages/a.page'), 'utf8')).toContain(
      'Applied after preview',
    );
    expect(await (await fetch(`${server.url}/__pptd/history`)).json()).toHaveLength(1);
  });

  it('authenticates explicit recovery and preserves the failed transaction receipt', async () => {
    const { project, server, session } = await fixture();
    const page = session.pages[0];
    const transaction: TransactionRequest = {
      requestId: randomUUID(),
      actor: 'recovery-api-test',
      deckId: session.deckId,
      expected: { pages: { [page.pageId]: page.pageRevision } },
      operations: [{ op: 'page.notes.set', pageId: page.pageId, text: 'Recovered API save' }],
    };
    const post = (route: string, body: object, token = session.sessionToken) =>
      fetch(`${server.url}/__pptd${route}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-huandeng-token': token },
        body: JSON.stringify(body),
      });
    const original = fs.rename.bind(fs);
    const target = path.join(project, 'pages/a.page').toLowerCase();
    const rename = vi.spyOn(fs, 'rename').mockImplementation(async (from, to) => {
      if (String(to).toLowerCase() === target)
        throw Object.assign(new Error('Injected sharing violation'), { code: 'EPERM' });
      return original(from, to);
    });
    const failed = await post('/transactions', transaction);
    expect(failed.status).toBe(400);
    expect(await failed.json()).toMatchObject({
      code: 'PENDING_RECOVERY',
      details: { causeCode: 'EPERM', renameAttempts: expect.any(Number) },
    });
    expect(await fs.readFile(path.join(project, 'pages/a.page'), 'utf8')).toBe(originalPage);
    expect((await post('/recover', {}, 'invalid')).status).toBe(403);
    rename.mockRestore();
    const recovered = await (await post('/recover', {})).json();
    expect(recovered.writable).toBe(true);
    expect(recovered.sessionToken).toBe(session.sessionToken);
    expect(path.isAbsolute(recovered.entry)).toBe(true);
    expect(recovered.pages[0].data.notes).toBe('Recovered API save');
    const receipt = await (await post('/transactions', transaction)).json();
    expect(receipt).toMatchObject({ ok: true, requestId: transaction.requestId });
    expect(await (await post('/transactions', transaction)).json()).toEqual(receipt);
    expect(await (await fetch(`${server.url}/__pptd/history`)).json()).toHaveLength(1);
  }, 15000);

  it('does not serve files through a symlink or junction outside the compiled editor', async () => {
    const { directory, clientRoot, server } = await fixture();
    const outside = path.join(directory, 'outside');
    await fs.mkdir(outside);
    await fs.writeFile(path.join(outside, 'secret.txt'), 'private source');
    await fs.symlink(outside, path.join(clientRoot, 'assets/escape'), 'junction');
    const response = await fetch(`${server.url}/assets/escape/secret.txt`);
    expect(response.status).toBe(403);
    expect(await response.text()).not.toContain('private source');
  });

  it('publishes externally written pages and replaced assets without a session refresh request', async () => {
    const { project, server, session } = await fixture();
    const response = await fetch(`${server.url}/__pptd/events`, {
      signal: AbortSignal.timeout(8000),
    });
    const reader = response.body?.getReader();
    if (!reader) throw new Error('Expected the event stream.');
    const next = eventReader(reader);
    try {
      await next();
      const source = originalPage.replace('Original notes', 'External notes');
      await fs.writeFile(path.join(project, 'pages/a.page'), source);
      const changed = await next();
      expect(changed.type).toBe('external');
      expect(changed.changedPages[session.pages[0].pageId].after).toBe(hashBytes(source));
      await fs.writeFile(path.join(project, 'media/figure.svg'), '<svg>after!</svg>');
      const asset = await next();
      expect(asset.type).toBe('external');
      expect(Object.keys(asset.changedPages)).toHaveLength(2);
      for (const revision of Object.values(asset.changedPages)) {
        expect(revision.before).toBe(revision.after);
        expect(revision.beforeRenderRevision).not.toBe(revision.afterRenderRevision);
      }
    } finally {
      await reader.cancel();
    }
  });

  it('closes its watcher, HTTP connections and document writer lease', async () => {
    const { directory, entryPath, server } = await fixture();
    await server.close();
    await server.close();
    expect(server.httpServer.listening).toBe(false);
    const store = await openPptdStore({
      entryPath,
      stateDir: path.join(directory, 'reopened-state'),
    });
    try {
      expect(store.getSnapshot().writable).toBe(true);
    } finally {
      await store.close();
    }
  });
});
