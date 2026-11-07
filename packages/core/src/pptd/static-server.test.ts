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
