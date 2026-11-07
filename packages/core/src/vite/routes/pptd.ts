import { createHash, randomBytes, randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import { importImage } from '../../pptd/asset-import.ts';
import { discoveryPath, runtimeRoot, type SessionDiscovery } from '../../pptd/client.ts';
import {
  checkpoint,
  recordCheckpoint,
  recordCheckpointMetadataInitialization,
  registerCheckpointRoot,
} from '../../pptd/git.ts';
import { json, readBody } from '../../pptd/http.ts';
import { presentationSnapshot } from '../../pptd/presentation-snapshot.ts';
import { readProjectModel, resolvePresentation } from '../../pptd/project-model.ts';
import { readProjectTree } from '../../pptd/project-tree.ts';
import { ExportManager, mimeType, readProjectAsset } from '../../pptd/runtime-export.ts';
import { openPptdStore } from '../../pptd/store.ts';
import { recordStory, type StoryRecordRequest } from '../../pptd/story.ts';
import {
  type CreatePageCheckpointRequest,
  PptdError,
  type TransactionRequest,
} from '../../pptd/types.ts';
import type { ApiContext } from './context.ts';

export interface PptdRouteHost {
  middlewares: {
    use(handler: (req: IncomingMessage, res: ServerResponse, next: () => void) => unknown): unknown;
  };
  watcher: {
    add(root: string): unknown;
    on(event: 'all', listener: (event: string, file: string) => void): unknown;
    off(event: 'all', listener: (event: string, file: string) => void): unknown;
  };
  httpServer?: {
    address(): AddressInfo | string | null;
    once(event: string, listener: (...args: unknown[]) => void): unknown;
  } | null;
  config: { logger: { error(message: string): void } };
}

const shutdowns = new WeakMap<PptdRouteHost['middlewares'], () => Promise<void>>();

export async function closePptdServer(server: PptdRouteHost) {
  await shutdowns.get(server.middlewares)?.();
}

export async function registerPptdRoutes(server: PptdRouteHost, _ctx?: ApiContext) {
  const entry = process.env.HUANDENG_DECK;
  if (!entry) return;
  const root = path.dirname(await fs.realpath(entry));
  await registerCheckpointRoot(root);
  const store = await openPptdStore({
    entryPath: entry,
    stateDir: path.join(
      runtimeRoot(),
      'documents',
      createHash('sha256')
        .update(process.platform === 'win32' ? root.toLowerCase() : root)
        .digest('hex'),
    ),
    readOnly: process.env.HUANDENG_READ_ONLY === '1',
  });
  const initial = store.getSnapshot();
  if (initial.writable && initial.identityPersisted)
    recordCheckpointMetadataInitialization(root, initial);
  const token = randomBytes(32).toString('hex');
  const clients = new Set<ServerResponse>();
  const exports = new ExportManager(root);
  let selection: {
    pageId: string | null;
    elementIds: string[];
    clientId?: string;
    presentationId?: string;
    occurrenceId?: string;
    versionId?: string;
    readOnly?: boolean;
  } = {
    pageId: null,
    elementIds: [],
  };
  let refreshTimer: ReturnType<typeof setTimeout> | undefined;
  let closed = false;

  const unsubscribe = store.subscribe((event) => {
    recordCheckpoint(root, store.getSnapshot(), event);
    const data = `id: ${event.epoch}:${event.sequence}\ndata: ${JSON.stringify(event)}\n\n`;
    for (const client of clients) client.write(data);
  });
  const heartbeat = setInterval(() => {
    for (const client of clients) client.write(': heartbeat\n\n');
  }, 20000);
  heartbeat.unref();
  try {
    server.watcher.add(root);
  } catch (error) {
    unsubscribe();
    clearInterval(heartbeat);
    await store.close();
    throw error;
  }
  const watch = (_event: string, file: string) => {
    const rel = path.relative(root, file);
    if (
      rel.startsWith('..') ||
      path.isAbsolute(rel) ||
      rel.startsWith(`Exports${path.sep}`) ||
      /^\..+\.huandeng-[0-9a-f-]+\.tmp$/i.test(path.basename(file))
    )
      return;
    if (refreshTimer) clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => {
      if (!closed)
        void store.refreshExternal().catch((error: unknown) => {
          server.config.logger.error(`Huandeng refresh: ${String(error)}`);
        });
    }, 180);
  };
  server.watcher.on('all', watch);

  const addressUrl = () => {
    const address = server.httpServer?.address();
    if (!address || typeof address === 'string') throw new Error('Server is not listening.');
    return `http://127.0.0.1:${address.port}`;
  };
  server.httpServer?.once('listening', async () => {
    const snapshot = await store.getSnapshot();
    const file = await discoveryPath(entry);
    await fs.mkdir(path.dirname(file), { recursive: true });
    const record: SessionDiscovery = {
      entry,
      url: addressUrl(),
      pid: process.pid,
      epoch: snapshot.epoch,
    };
    await fs.writeFile(file, JSON.stringify(record), { mode: 0o600 });
  });
  let closing: Promise<void> | undefined;
  const close = () =>
    (closing ??= (async () => {
      closed = true;
      if (refreshTimer) clearTimeout(refreshTimer);
      clearInterval(heartbeat);
      server.watcher.off('all', watch);
      unsubscribe();
      for (const client of clients) client.end();
      await store.close();
      await (async () => {
        const file = await discoveryPath(entry);
        const record: SessionDiscovery = JSON.parse(await fs.readFile(file, 'utf8'));
        if (record.pid === process.pid) await fs.rm(file);
      })().catch(() => {});
    })());
  shutdowns.set(server.middlewares, close);
  server.httpServer?.once('close', () => {
    void close();
  });

  server.middlewares.use(async (req, res, next) => {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1');
    if (!url.pathname.startsWith('/__pptd/')) return next();
    res.setHeader('cache-control', 'no-store');
    res.setHeader('x-content-type-options', 'nosniff');
    try {
      const host = new URL(`http://${req.headers.host}`);
      const remote = req.socket.remoteAddress ?? '';
      if (
        !['127.0.0.1', 'localhost', '[::1]'].includes(host.hostname) ||
        !['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(remote)
      ) {
        return json(res, 403, { code: 'LOCAL_ONLY', message: 'Use a loopback Huandeng session.' });
      }
      if (req.headers.origin && new URL(req.headers.origin).host !== host.host) {
        return json(res, 403, {
          code: 'ORIGIN_MISMATCH',
          message: 'Cross-origin access is denied.',
        });
      }
      const method = req.method ?? 'GET';
      if (method !== 'GET' && (method !== 'POST' || req.headers['x-huandeng-token'] !== token)) {
        return json(res, 403, {
          code: 'SESSION_TOKEN_REQUIRED',
          message: 'Refresh the active session.',
        });
      }
      const route = url.pathname.slice('/__pptd'.length);
      if (method === 'GET' && route === '/session') {
        const snapshot = await store.refreshExternal();
        return json(res, 200, {
          ...snapshot,
          entry: path.join(root, snapshot.entry),
          sessionToken: token,
          desktopProtocol: 1,
        });
      }
      if (method === 'GET' && route === '/project') {
        return json(res, 200, await readProjectTree(root, store.getSnapshot()));
      }
      if (method === 'GET' && route === '/project-model') {
        await store.refreshExternal();
        return json(res, 200, readProjectModel(store.getSnapshot().metadata));
      }
      if (method === 'GET' && /^\/presentations\/[^/]+$/.test(route)) {
        await store.refreshExternal();
        return json(
          res,
          200,
          await presentationSnapshot(
            store.getSnapshot(),
            decodeURIComponent(route.slice('/presentations/'.length)),
            (pageId, versionId) => store.readPageVersion(pageId, versionId),
          ),
        );
      }
      const versionRoute = /^\/pages\/([^/]+)\/versions(?:\/([^/]+))?$/.exec(route);
      if (method === 'GET' && versionRoute) {
        await store.refreshExternal();
        const pageId = decodeURIComponent(versionRoute[1]);
        return json(
          res,
          200,
          versionRoute[2]
            ? await store.readPageVersion(pageId, decodeURIComponent(versionRoute[2]))
            : url.searchParams.get('view') === 'operations'
              ? await store.pageHistory(pageId)
              : await store.pageCheckpoints(pageId),
        );
      }
      if (method === 'GET' && /^\/pages\/[^/]+$/.test(route)) {
        return json(
          res,
          200,
          await store.readPage(decodeURIComponent(route.slice('/pages/'.length))),
        );
      }
      if (method === 'GET' && route === '/history') return json(res, 200, await store.history());
      if (method === 'GET' && route === '/selection') return json(res, 200, selection);
      if (method === 'GET' && route === '/events') {
        res.writeHead(200, { 'content-type': 'text/event-stream', connection: 'keep-alive' });
        const snapshot = await store.getSnapshot();
        res.write(
          'event: connected\ndata: ' +
            JSON.stringify({ epoch: snapshot.epoch, sequence: snapshot.sequence }) +
            '\n\n',
        );
        clients.add(res);
        req.on('close', () => clients.delete(res));
        return;
      }
      if (method === 'GET' && route === '/asset') {
        const source = url.searchParams.get('path');
        if (!source) throw new PptdError('INVALID_REQUEST', 'Asset path is required.');
        const data = await readProjectAsset(root, source);
        res.setHeader('content-type', mimeType(source));
        return res.end(data);
      }
      if (method === 'GET' && route.startsWith('/exports/')) {
        const [, , id, kind] = route.split('/');
        return exports.respond(id, kind, url.searchParams, res);
      }
      if (method !== 'POST') return json(res, 404, { message: 'Unknown Huandeng endpoint.' });
      const body = (await readBody(
        req,
        route === '/assets/import' ? 48 * 1024 * 1024 : 8 * 1024 * 1024,
      )) as Record<string, unknown>;
      if (!body || typeof body !== 'object' || Array.isArray(body)) {
        throw new PptdError('INVALID_REQUEST', 'A JSON object is required.');
      }
      if (route === '/transactions')
        return json(res, 200, await store.commit(body as unknown as TransactionRequest));
      if (route === '/assets/import') {
        if (!store.getSnapshot().writable)
          throw new PptdError('READ_ONLY', 'This project is read-only.');
        return json(res, 200, await importImage(root, { name: body.name, base64: body.base64 }));
      }
      if (route === '/story' || route === '/frame')
        return json(res, 200, await recordStory(store, body as unknown as StoryRecordRequest));
      const checkpointRoute = /^\/pages\/([^/]+)\/checkpoints$/.exec(route);
      if (checkpointRoute)
        return json(
          res,
          200,
          await store.createPageCheckpoint({
            ...body,
            pageId: decodeURIComponent(checkpointRoute[1]),
          } as unknown as CreatePageCheckpointRequest),
        );
      const restoreRoute = /^\/pages\/([^/]+)\/restore$/.exec(route);
      if (restoreRoute) {
        if (
          typeof body.versionId !== 'string' ||
          typeof body.requestId !== 'string' ||
          typeof body.expectedPageRevision !== 'string'
        )
          throw new PptdError(
            'INVALID_REQUEST',
            'versionId, requestId and expectedPageRevision are required.',
          );
        return json(
          res,
          200,
          await store.restorePageVersion({
            pageId: decodeURIComponent(restoreRoute[1]),
            versionId: body.versionId,
            requestId: body.requestId,
            expectedPageRevision: body.expectedPageRevision,
            ...(Object.hasOwn(body, 'expectedMetadataRevision')
              ? { expectedMetadataRevision: body.expectedMetadataRevision as string | null }
              : {}),
            actor: typeof body.actor === 'string' ? body.actor : 'agent',
          }),
        );
      }
      if (route === '/undo' || route === '/redo') {
        if (typeof body.operationId !== 'string')
          throw new PptdError('INVALID_REQUEST', 'operationId is required.');
        const method = route === '/undo' ? store.undo.bind(store) : store.redo.bind(store);
        return json(
          res,
          200,
          await method(
            body.operationId,
            typeof body.requestId === 'string' ? body.requestId : randomUUID(),
            typeof body.actor === 'string' ? body.actor : 'human',
          ),
        );
      }
      if (route === '/selection') {
        if (body.pageId !== null && typeof body.pageId !== 'string')
          throw new PptdError('INVALID_REQUEST', 'Invalid pageId.');
        const ids = body.elementIds;
        if (!Array.isArray(ids) || !ids.every((id) => typeof id === 'string'))
          throw new PptdError('INVALID_REQUEST', 'Invalid elementIds.');
        if (typeof body.pageId === 'string') {
          if (typeof body.presentationId === 'string') {
            const reference = resolvePresentation(
              store.getSnapshot(),
              body.presentationId,
            ).pages.find((item) => item.occurrenceId === body.occurrenceId);
            if (
              !reference ||
              reference.pageId !== body.pageId ||
              (reference.versionId ?? null) !== (body.versionId ?? null)
            )
              throw new PptdError(
                'TARGET_NOT_FOUND',
                'The selected presentation occurrence has changed.',
              );
          } else if (body.versionId !== undefined)
            throw new PptdError(
              'INVALID_REQUEST',
              'A pinned selection requires its presentation and occurrence.',
            );
          const page =
            typeof body.versionId === 'string'
              ? (await store.readPageVersion(body.pageId, body.versionId)).page
              : store.readPage(body.pageId);
          if (ids.some((id) => !page.data.elements.some((element) => element.elementId === id))) {
            throw new PptdError('TARGET_NOT_FOUND', 'Selected element no longer exists.');
          }
        }
        selection = {
          pageId: body.pageId,
          elementIds: ids,
          ...(typeof body.clientId === 'string' ? { clientId: body.clientId } : {}),
          ...(typeof body.presentationId === 'string'
            ? {
                presentationId: body.presentationId,
                occurrenceId: String(body.occurrenceId),
                ...(typeof body.versionId === 'string' ? { versionId: body.versionId } : {}),
                readOnly: typeof body.versionId === 'string' || !store.getSnapshot().writable,
              }
            : {}),
        };
        return json(res, 200, selection);
      }
      if (route === '/render' || route === '/export') {
        await store.refreshExternal();
        if (
          body.presentationId !== undefined &&
          body.presentationId !== null &&
          typeof body.presentationId !== 'string'
        )
          throw new PptdError('INVALID_REQUEST', 'presentationId must be a string or null.');
        const snapshot = await presentationSnapshot(
          store.getSnapshot(),
          typeof body.presentationId === 'string' ? body.presentationId : null,
          (pageId, versionId) => store.readPageVersion(pageId, versionId),
        );
        const format = route === '/render' ? 'png' : body.format;
        if (!['pptx', 'pdf', 'png'].includes(String(format)))
          throw new PptdError('INVALID_REQUEST', 'format must be pptx or pdf.');
        return json(
          res,
          200,
          await exports.create(snapshot, {
            format: format as 'pptx' | 'pdf' | 'png',
            pageId: typeof body.pageId === 'string' ? body.pageId : undefined,
            occurrenceId: typeof body.occurrenceId === 'string' ? body.occurrenceId : undefined,
            writeToProject: store.getSnapshot().writable,
            serverUrl: addressUrl(),
          }),
        );
      }
      if (route === '/checkpoint') {
        if (typeof body.message !== 'string' || !body.message.trim())
          throw new PptdError('INVALID_REQUEST', 'Commit message is required.');
        return json(res, 200, await checkpoint(root, await store.getSnapshot(), body.message));
      }
      return json(res, 404, { message: 'Unknown Huandeng endpoint.' });
    } catch (error) {
      const issue = error as Error & { code?: string; details?: unknown; report?: unknown };
      const status =
        issue.code === 'TARGET_NOT_FOUND'
          ? 404
          : ['REVISION_CONFLICT', 'UNDO_CONFLICT', 'REQUEST_ID_REUSE', 'WRITER_LOCKED'].includes(
                issue.code ?? '',
              )
            ? 409
            : issue.code === 'READ_ONLY'
              ? 403
              : issue.code
                ? 400
                : 500;
      json(res, status, {
        code: issue.code ?? 'INTERNAL_ERROR',
        message: issue.message,
        details: issue.details,
        report: issue.report,
      });
    }
  });
}
