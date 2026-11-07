import { EventEmitter } from 'node:events';
import { type FSWatcher, watch } from 'node:fs';
import fs from 'node:fs/promises';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import path from 'node:path';
import { closePptdServer, type PptdRouteHost, registerPptdRoutes } from '../vite/routes/pptd.ts';

type Handler = (req: IncomingMessage, res: ServerResponse, next: () => void) => unknown;

class ProjectWatcher extends EventEmitter {
  private handles = new Map<string, FSWatcher>();

  add(root: string): this {
    if (this.handles.has(root)) return this;
    const handle = watch(root, { recursive: true }, (event, file) => {
      this.emit('all', event, file ? path.join(root, String(file)) : root);
    });
    handle.on('error', (error) => this.emit('error', error));
    this.handles.set(root, handle);
    return this;
  }

  close(): void {
    for (const handle of this.handles.values()) handle.close();
    this.handles.clear();
    this.removeAllListeners();
  }
}

function localRequest(req: IncomingMessage): boolean {
  try {
    const host = new URL(`http://${req.headers.host}`);
    if (!['127.0.0.1', 'localhost', '[::1]'].includes(host.hostname)) return false;
    if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress ?? ''))
      return false;
    return !req.headers.origin || new URL(req.headers.origin).host === host.host;
  } catch {
    return false;
  }
}

const contentTypes: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.json': 'application/json',
};

async function serveEditor(clientRoot: string, req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.statusCode = 405;
    res.setHeader('allow', 'GET, HEAD');
    res.end('Method not allowed.');
    return;
  }
  let pathname: string;
  try {
    pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://127.0.0.1').pathname).replaceAll(
      '\\',
      '/',
    );
  } catch {
    res.statusCode = 400;
    res.end('Invalid URL.');
    return;
  }
  if (pathname.includes('\0') || pathname.split('/').includes('..')) {
    res.statusCode = 403;
    res.end('Path outside the editor.');
    return;
  }
  const html =
    pathname === '/' ||
    pathname === '/huandeng' ||
    pathname === '/huandeng/' ||
    /^\/huandeng\/export\/[^/]+\/?$/.test(pathname);
  const candidate = path.resolve(clientRoot, html ? 'huandeng.html' : `.${pathname}`);
  const relative = path.relative(clientRoot, candidate);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    res.statusCode = 403;
    res.end('Path outside the editor.');
    return;
  }
  try {
    const file = await fs.realpath(candidate);
    const realRelative = path.relative(clientRoot, file);
    if (realRelative.startsWith('..') || path.isAbsolute(realRelative)) {
      res.statusCode = 403;
      res.end('Path outside the editor.');
      return;
    }
    const stat = await fs.stat(file);
    if (!stat.isFile()) {
      res.statusCode = 404;
      res.end('Not found.');
      return;
    }
    res.setHeader(
      'content-type',
      contentTypes[path.extname(file).toLowerCase()] ?? 'application/octet-stream',
    );
    res.setHeader('content-length', stat.size);
    res.setHeader(
      'cache-control',
      path.extname(file).toLowerCase() === '.html'
        ? 'no-store'
        : 'public, max-age=31536000, immutable',
    );
    res.end(req.method === 'HEAD' ? undefined : await fs.readFile(file));
  } catch (error) {
    if (!['ENOENT', 'ENOTDIR'].includes((error as NodeJS.ErrnoException).code ?? '')) throw error;
    res.statusCode = 404;
    res.end('Not found.');
  }
}

export async function createPptdStaticServer(options: { clientRoot: string; port?: number }) {
  const clientRoot = await fs.realpath(options.clientRoot);
  await fs.access(path.join(clientRoot, 'huandeng.html'));
  const handlers: Handler[] = [];
  const watcher = new ProjectWatcher();
  const logger = { error: (message: string) => process.stderr.write(`${message}\n`) };
  watcher.on('error', (error) => logger.error(`HUANDENG file watcher: ${String(error)}`));
  const httpServer = createServer((req, res) => {
    res.setHeader('x-content-type-options', 'nosniff');
    res.setHeader('x-huandeng-runtime', 'static');
    if (!localRequest(req)) {
      res.statusCode = 403;
      res.end('Use the local HUANDENG session.');
      return;
    }
    const fail = (error: unknown) => {
      logger.error(`HUANDENG request: ${String(error)}`);
      if (!res.headersSent) {
        res.statusCode = 500;
        res.end('The local editor could not complete this request.');
      } else res.destroy();
    };
    const dispatch = (index: number): void => {
      const handler = handlers[index];
      try {
        const result = handler
          ? handler(req, res, () => dispatch(index + 1))
          : serveEditor(clientRoot, req, res);
        Promise.resolve(result).catch(fail);
      } catch (error) {
        fail(error);
      }
    };
    dispatch(0);
  });
  const host: PptdRouteHost = {
    middlewares: { use: (handler) => handlers.push(handler) },
    watcher,
    httpServer,
    config: { logger },
  };
  let closing: Promise<void> | undefined;
  const close = () =>
    (closing ??= (async () => {
      await closePptdServer(host);
      watcher.close();
      await new Promise<void>((resolve, reject) => {
        httpServer.close((error) => {
          if (error && (error as NodeJS.ErrnoException).code !== 'ERR_SERVER_NOT_RUNNING')
            reject(error);
          else resolve();
        });
        httpServer.closeAllConnections();
      });
    })());
  try {
    await registerPptdRoutes(host);
    await new Promise<void>((resolve, reject) => {
      const failed = (error: Error) => reject(error);
      httpServer.once('error', failed);
      httpServer.listen(options.port ?? 4850, '127.0.0.1', () => {
        httpServer.off('error', failed);
        resolve();
      });
    });
  } catch (error) {
    await close();
    throw error;
  }
  const address = httpServer.address();
  if (!address || typeof address === 'string')
    throw new Error('The editor server has no TCP address.');
  return {
    ...host,
    httpServer,
    close,
    url: `http://127.0.0.1:${address.port}`,
    mode: 'static' as const,
  };
}
