import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { deflateSync } from 'node:zlib';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AssetPreviewManager, type AssetPreviewOptions } from './asset-preview';
import { imageDimensions } from './export-images';
import { hashBytes } from './persistence';

const execute = promisify(execFile);
const encoder = process.env.HUANDENG_FFMPEG ?? 'ffmpeg';
const available = await execute(encoder, ['-version']).then(
  () => true,
  () => false,
);
const cleanups: (() => Promise<unknown>)[] = [];

afterEach(async () => {
  vi.restoreAllMocks();
  for (const cleanup of cleanups.reverse()) await cleanup();
  cleanups.length = 0;
});

function png(width = 1024, height = 512, variant = 0): Buffer {
  const chunk = (type: string, data: Buffer) => {
    const body = Buffer.concat([Buffer.from(type), data]);
    let crc = 0xffffffff;
    for (const byte of body) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
    const head = Buffer.alloc(4);
    head.writeUInt32BE(data.length);
    const tail = Buffer.alloc(4);
    tail.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
    return Buffer.concat([head, body, tail]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  const pixels = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const index = y * (width * 4 + 1) + 1 + x * 4;
      pixels[index] = (x + variant) % 256;
      pixels[index + 1] = y % 256;
      pixels[index + 2] = variant;
      pixels[index + 3] = x < 16 ? 0 : 255;
    }
  return Buffer.concat([
    Buffer.from('89504e470d0a1a0a', 'hex'),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(pixels, { level: 0 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

async function setup(options: AssetPreviewOptions = { encoder: false }) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'huandeng-preview-'));
  await fs.mkdir(path.join(root, 'media'));
  const bytes = png();
  await fs.writeFile(path.join(root, 'media/source.png'), bytes);
  const manager = new AssetPreviewManager(root, {
    directory: path.join(root, 'runtime'),
    ...options,
  });
  const responses: http.ServerResponse[] = [];
  const operations: Promise<void>[] = [];
  cleanups.push(() => fs.rm(root, { recursive: true, force: true }));
  const server = http.createServer((req, res) => {
    responses.push(res);
    const url = new URL(req.url ?? '/', 'http://localhost');
    res.setHeader('cache-control', 'no-store');
    const operation = manager
      .respond(url.searchParams, url.pathname === '/preview', req, res)
      .catch((error) => {
        res.statusCode =
          error.code === 'REVISION_CONFLICT' ? 409 : error.code === 'TARGET_NOT_FOUND' ? 404 : 400;
        res.end(JSON.stringify({ code: error.code, message: error.message }));
      });
    operations.push(operation);
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  cleanups.push(
    () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  );
  cleanups.push(() => manager.dispose());
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('No test server address');
  const base = `http://127.0.0.1:${address.port}`;
  const url = (source = 'media/source.png', revision?: string, size = 320, preview = true) =>
    `${base}/${preview ? 'preview' : 'asset'}?${new URLSearchParams({ path: source, size: String(size), ...(revision ? { revision } : {}) })}`;
  return { root, bytes, manager, url, responses, operations };
}

async function heldReads(root: string, names: string[]) {
  for (const name of names) await fs.writeFile(path.join(root, 'media', name), '<svg/>');
  const open = fs.open.bind(fs);
  const started: string[] = [];
  const releases: (() => void)[] = [];
  let released = false;
  vi.spyOn(fs, 'open').mockImplementation(async (...args) => {
    if (path.dirname(String(args[0])) === path.join(root, 'media')) {
      started.push(path.basename(String(args[0])));
      if (!released) await new Promise<void>((resolve) => releases.push(resolve));
    }
    return open(...args);
  });
  return {
    started,
    next: () => releases.shift()?.(),
    all: () => {
      released = true;
      for (const release of releases.splice(0)) release();
    },
  };
}

describe('versioned and bounded asset previews', () => {
  it('prioritizes originals but dispatches a waiting preview after at most three originals', async () => {
    const { root, manager, url } = await setup();
    const gate = await heldReads(root, [
      'a.svg',
      'b.svg',
      'p.svg',
      ...[1, 2, 3, 4].map((n) => `o${n}.svg`),
    ]);
    const requests: Promise<unknown>[] = [];
    const request = (name: string, preview = true) => {
      requests.push(
        fetch(url(`media/${name}`, undefined, 320, preview)).then((res) => res.arrayBuffer()),
      );
    };
    try {
      request('a.svg');
      request('b.svg');
      await vi.waitFor(() => expect(gate.started).toHaveLength(2));
      request('p.svg');
      await vi.waitFor(() => expect(manager.usage().queued).toBe(1));
      for (let n = 1; n <= 4; n++) {
        request(`o${n}.svg`, false);
        await vi.waitFor(() => expect(manager.usage().queued).toBe(n + 1));
      }
      for (const name of ['o1.svg', 'o2.svg', 'o3.svg', 'p.svg', 'o4.svg']) {
        const count = gate.started.length;
        gate.next();
        await vi.waitFor(() => expect(gate.started).toHaveLength(count + 1));
        expect(gate.started.at(-1)).toBe(name);
      }
    } finally {
      gate.all();
      await Promise.all(requests);
    }
    expect(manager.usage()).toMatchObject({ peakActive: 2, peakQueued: 5 });
  });

  it('admits an original into a full queue by settling the newest queued preview with 503', async () => {
    const { root, manager, url, responses, operations } = await setup({
      encoder: false,
      maxQueued: 1,
    });
    const gate = await heldReads(root, ['a.svg', 'b.svg', 'p.svg', 'o.svg']);
    const active = ['a.svg', 'b.svg'].map((name) =>
      fetch(url(`media/${name}`)).then((res) => res.arrayBuffer()),
    );
    const pending: Promise<unknown>[] = [...active];
    try {
      await vi.waitFor(() => expect(gate.started).toHaveLength(2));
      const preview = fetch(url('media/p.svg'));
      pending.push(preview);
      await vi.waitFor(() => expect(manager.usage().queued).toBe(1));
      const original = fetch(url('media/o.svg', undefined, 320, false));
      pending.push(original.then((res) => res.arrayBuffer()));
      let displacedResponse: Response | undefined;
      void preview.then((res) => {
        displacedResponse = res;
      });
      await vi.waitFor(() => expect(displacedResponse).toBeDefined());
      const displaced = await preview;
      expect(displaced.status).toBe(503);
      expect(displaced.headers.get('retry-after')).toBe('1');
      expect(displaced.headers.get('x-huandeng-queue')).toBe('preempted');
      expect(await displaced.text()).toContain('queue');
      await operations[2];
      expect(responses[2].listenerCount('close')).toBe(0);
      expect(responses[2].listenerCount('error')).toBe(0);
      const excess = await fetch(url('media/source.png', undefined, 320, false));
      expect(excess.status).toBe(503);
      expect(excess.headers.get('x-huandeng-queue')).toBe('full');
      expect(manager.usage()).toMatchObject({
        active: 2,
        queued: 1,
        peakQueued: 1,
        overloaded: 2,
        preempted: 1,
      });
      expect(gate.started).not.toContain('p.svg');
      gate.next();
      await vi.waitFor(() => expect(gate.started).toContain('o.svg'));
    } finally {
      gate.all();
      await Promise.all(pending);
    }
  });

  it('keeps the oldest waiting preview when a full queue admits an original', async () => {
    const { root, manager, url } = await setup({ encoder: false, maxQueued: 2 });
    const gate = await heldReads(root, ['a.svg', 'b.svg', 'old.svg', 'new.svg', 'o.svg']);
    const requests: Promise<unknown>[] = ['a.svg', 'b.svg'].map((name) =>
      fetch(url(`media/${name}`)).then((res) => res.arrayBuffer()),
    );
    try {
      await vi.waitFor(() => expect(gate.started).toHaveLength(2));
      const old = fetch(url('media/old.svg'));
      requests.push(old.then((res) => res.arrayBuffer()));
      await vi.waitFor(() => expect(manager.usage().queued).toBe(1));
      const recent = fetch(url('media/new.svg'));
      requests.push(recent);
      await vi.waitFor(() => expect(manager.usage().queued).toBe(2));
      requests.push(
        fetch(url('media/o.svg', undefined, 320, false)).then((res) => res.arrayBuffer()),
      );
      let status: number | undefined;
      void recent.then((res) => {
        status = res.status;
      });
      await vi.waitFor(() => expect(status).toBe(503));
      gate.next();
      await vi.waitFor(() => expect(gate.started.at(-1)).toBe('o.svg'));
      gate.next();
      await vi.waitFor(() => expect(gate.started.at(-1)).toBe('old.svg'));
      expect(gate.started).not.toContain('new.svg');
      expect(manager.usage().peakQueued).toBe(2);
    } finally {
      gate.all();
      await Promise.all(requests);
    }
  });

  it.each(['close', 'error', 'finish'] as const)(
    'removes queued work on response %s without reading it or retaining listeners',
    async (event) => {
      const { root, manager, url, responses, operations } = await setup();
      const gate = await heldReads(root, ['a.svg', 'b.svg', 'p.svg']);
      const active = ['a.svg', 'b.svg'].map((name) =>
        fetch(url(`media/${name}`)).then((res) => res.arrayBuffer()),
      );
      let disconnected: Promise<unknown> | undefined;
      try {
        await vi.waitFor(() => expect(gate.started).toHaveLength(2));
        disconnected = fetch(url('media/p.svg')).catch(() => undefined);
        await vi.waitFor(() => expect(manager.usage().queued).toBe(1));
        const response = responses[2];
        if (event === 'close') response.destroy();
        else if (event === 'finish') response.end();
        else response.emit('error', new Error('Synthetic disconnected response'));
        await vi.waitFor(() => expect(manager.usage().queued).toBe(0));
        await operations[2];
        expect(response.listenerCount('close')).toBe(0);
        expect(response.listenerCount('error')).toBe(0);
        expect(manager.usage().cancelled).toBe(1);
        response.destroy();
        expect(gate.started).toHaveLength(2);
      } finally {
        gate.all();
        await Promise.all([...active, disconnected]);
      }
    },
  );

  it('settles and detaches queued responses on dispose without reading their sources', async () => {
    const { root, manager, url, responses, operations } = await setup();
    const gate = await heldReads(root, ['a.svg', 'b.svg', 'p.svg']);
    const requests = ['a.svg', 'b.svg', 'p.svg'].map((name) =>
      fetch(url(`media/${name}`))
        .then((res) => res.arrayBuffer())
        .catch(() => undefined),
    );
    await vi.waitFor(() => expect(manager.usage().queued).toBe(1));
    await vi.waitFor(() => expect(gate.started).toHaveLength(2));
    const disposing = manager.dispose();
    try {
      await operations[2];
      expect(responses[2].destroyed).toBe(true);
      expect(responses[2].listenerCount('close')).toBe(0);
      expect(responses[2].listenerCount('error')).toBe(0);
      expect(gate.started).toHaveLength(2);
    } finally {
      gate.all();
      await disposing;
      await Promise.all(requests);
    }
    expect(manager.usage()).toMatchObject({ active: 0, queued: 0 });
  });

  it('drains the queue when a response is already disconnected before its close event arrives', async () => {
    const { root, manager, url, responses } = await setup();
    const gate = await heldReads(root, ['a.svg', 'b.svg', 'gone.svg', 'next.svg']);
    const requests = ['a.svg', 'b.svg'].map((name) =>
      fetch(url(`media/${name}`)).then((res) => res.arrayBuffer()),
    );
    let gone: http.ServerResponse | undefined;
    try {
      await vi.waitFor(() => expect(gate.started).toHaveLength(2));
      requests.push(
        fetch(url('media/gone.svg', undefined, 320, false))
          .then((res) => res.arrayBuffer())
          .catch(() => new ArrayBuffer(0)),
      );
      await vi.waitFor(() => expect(manager.usage().queued).toBe(1));
      requests.push(
        fetch(url('media/next.svg', undefined, 320, false)).then((res) => res.arrayBuffer()),
      );
      await vi.waitFor(() => expect(manager.usage().queued).toBe(2));
      gone = responses[2];
      gone.destroyed = true;
      gate.next();
      await vi.waitFor(() => expect(gate.started).toContain('next.svg'));
      expect(gate.started).not.toContain('gone.svg');
      expect(manager.usage().queued).toBe(0);
    } finally {
      if (gone) {
        gone.destroyed = false;
        gone.destroy();
      }
      gate.all();
      await Promise.all(requests);
    }
  });

  it('exposes numeric queue, read and preview stage timings without source details', async () => {
    const { manager, url } = await setup();
    for (const preview of [true, true, false]) {
      const response = await fetch(url('media/source.png', undefined, 320, preview));
      expect(response.headers.get('server-timing')).toMatch(
        /^queue;dur=\d+\.\d+, read;dur=\d+\.\d+, preview;dur=\d+\.\d+$/,
      );
      await response.arrayBuffer();
    }
    expect(manager.usage()).toMatchObject({ hits: 1 });
    expect(manager.usage().queueMs).toBeGreaterThanOrEqual(0);
    expect(manager.usage().readMs).toBeGreaterThan(0);
    expect(manager.usage().previewMs).toBeGreaterThan(0);
  });

  it('detaches response error, close and timeout handlers after success, revalidation and read failure', async () => {
    const { url, responses, operations } = await setup();
    const original = await fetch(url('media/source.png', undefined, 320, false));
    const etag = original.headers.get('etag') ?? '';
    await original.arrayBuffer();
    const cached = await fetch(url('media/source.png', undefined, 320, false), {
      headers: { 'if-none-match': etag },
    });
    expect(cached.status).toBe(304);
    expect(cached.headers.get('server-timing')).toContain('preview;dur=0.00');
    const failed = await fetch(url('media/missing.png'));
    expect(failed.status).toBe(404);
    expect(failed.headers.get('server-timing')).toContain('read;dur=');
    await failed.arrayBuffer();
    await Promise.all(operations);
    for (const response of responses) {
      expect(response.listenerCount('error')).toBe(0);
      expect(response.listenerCount('close')).toBe(0);
      expect(response.listenerCount('timeout')).toBe(0);
    }
  });
  it('serves the verified original without an encoder, revalidates ETags and rejects stale revisions', async () => {
    const { root, bytes, url } = await setup();
    const revision = hashBytes(bytes);
    const first = await fetch(url('media/source.png', revision));
    expect(first.status).toBe(200);
    expect(first.headers.get('x-huandeng-preview')).toBe('original');
    expect(first.headers.get('x-huandeng-preview-reason')).toBe('encoder-unavailable');
    expect(first.headers.get('cache-control')).toBe('private, no-cache');
    expect(Buffer.from(await first.arrayBuffer()).equals(bytes)).toBe(true);
    const etag = first.headers.get('etag') ?? '';
    expect(
      (await fetch(url('media/source.png', revision), { headers: { 'if-none-match': etag } }))
        .status,
    ).toBe(304);
    const modified = png(1024, 512, 1);
    expect(modified.length).toBe(bytes.length);
    const stat = await fs.stat(path.join(root, 'media/source.png'));
    await fs.writeFile(path.join(root, 'media/source.png'), modified);
    await fs.utimes(path.join(root, 'media/source.png'), stat.atime, stat.mtime);
    expect(
      (await fetch(url('media/source.png', revision), { headers: { 'if-none-match': etag } }))
        .status,
    ).toBe(409);
    const current = await fetch(url('media/source.png', hashBytes(modified), 320, false));
    expect(current.status).toBe(200);
    expect(Buffer.from(await current.arrayBuffer()).equals(modified)).toBe(true);
    expect((await fetch(url('media/absent.png'))).status).toBe(404);
  });

  it.skipIf(!available)(
    'creates a real smaller PNG, combines concurrent identical content, and preserves the original',
    async () => {
      const { root, bytes, url, manager } = await setup({ encoder });
      await fs.writeFile(path.join(root, 'media/copy.png'), bytes);
      const responses = await Promise.all([
        fetch(url('media/source.png', hashBytes(bytes))),
        fetch(url('media/copy.png', hashBytes(bytes))),
      ]);
      for (const response of responses) {
        expect(response.headers.get('x-huandeng-preview')).toBe('derived');
        const preview = Buffer.from(await response.arrayBuffer());
        expect(imageDimensions(preview, 'png')).toEqual({ width: 320, height: 160 });
        expect(preview.length).toBeLessThan(bytes.length);
      }
      expect(manager.usage().derived).toBe(1);
      expect(manager.usage().entries).toBe(1);
      expect((await fs.readFile(path.join(root, 'media/source.png'))).equals(bytes)).toBe(true);
      const original = await fetch(url('media/source.png', hashBytes(bytes), 320, false));
      expect(imageDimensions(Buffer.from(await original.arrayBuffer()), 'png')).toEqual({
        width: 1024,
        height: 512,
      });
    },
  );

  it('limits source reads before allocating original buffers and rejects excess queued requests', async () => {
    const { url, manager } = await setup({ encoder: false, maxQueued: 1 });
    const open = fs.open.bind(fs);
    let unblock = () => {};
    const gate = new Promise<void>((resolve) => {
      unblock = resolve;
    });
    let reading = 0;
    vi.spyOn(fs, 'open').mockImplementation(async (...args) => {
      if (String(args[0]).endsWith('source.png')) {
        reading++;
        await gate;
      }
      return open(...args);
    });
    const pending = Array.from({ length: 3 }, () => fetch(url()).then((res) => res.arrayBuffer()));
    try {
      await vi.waitFor(() => {
        expect(manager.usage()).toMatchObject({ active: 2, queued: 1 });
        expect(reading).toBe(2);
      });
      expect((await fetch(url())).status).toBe(503);
    } finally {
      unblock();
    }
    await Promise.all(pending);
    expect(manager.usage().peakActive).toBe(2);
    expect(manager.usage().peakQueued).toBe(1);
  });

  it('evicts unpinned disk previews within entry and byte limits and cleans its owned directory', async () => {
    const { root, url, manager } = await setup({
      encoder: false,
      maxEntries: 1,
      maxBytes: 3 * 1024 * 1024,
    });
    await (await fetch(url())).arrayBuffer();
    await fs.writeFile(path.join(root, 'media/other.png'), png(1024, 512, 7));
    await (await fetch(url('media/other.png'))).arrayBuffer();
    expect(manager.usage().entries).toBe(1);
    expect(manager.usage().bytes).toBeLessThanOrEqual(manager.usage().maxBytes);
    await manager.dispose();
    expect(await fs.readdir(path.join(root, 'runtime'))).toEqual([]);
    expect(manager.usage()).toMatchObject({ active: 0, queued: 0, entries: 0, children: 0 });
  });

  it('retains failed eviction ownership and budget, bounds leftovers, and retries before allocating again', async () => {
    const { root, url, manager, bytes } = await setup({ encoder: false, maxEntries: 1 });
    await (await fetch(url())).arrayBuffer();
    const runtime = path.join(root, 'runtime');
    const directory = path.join(runtime, (await fs.readdir(runtime))[0]);
    const other = png(1024, 512, 7);
    await fs.writeFile(path.join(root, 'media/other.png'), other);
    const remove = fs.rm.bind(fs);
    let locked = true;
    vi.spyOn(fs, 'rm').mockImplementation(async (file, options) => {
      if (locked && path.basename(String(file)).startsWith('work-')) {
        expect(options).toMatchObject({ maxRetries: 2, retryDelay: 50 });
        throw Object.assign(new Error('Synthetic Windows file lock'), { code: 'EBUSY' });
      }
      return remove(file, options);
    });
    for (let attempt = 0; attempt < 8; attempt++) {
      const response = await fetch(url('media/other.png'));
      expect(response.status).toBe(200);
      expect(response.headers.get('x-huandeng-preview-reason')).toBe('cache-unavailable');
      expect(Buffer.from(await response.arrayBuffer()).equals(other)).toBe(true);
      expect(manager.usage()).toMatchObject({
        entries: 1,
        bytes: bytes.length,
        cleanupPending: 2,
      });
      expect(await fs.readdir(directory)).toHaveLength(2);
    }
    locked = false;
    const recovered = await fetch(url('media/other.png'));
    expect(recovered.headers.get('x-huandeng-preview-reason')).toBe('encoder-unavailable');
    await recovered.arrayBuffer();
    expect(manager.usage()).toMatchObject({ entries: 1, bytes: other.length, cleanupPending: 0 });
    expect(await fs.readdir(directory)).toHaveLength(1);
  });

  it('does not block service close on a locked workspace, preserves ownership, and allows a cleanup retry', async () => {
    const { root, url, manager, bytes } = await setup();
    await (await fetch(url())).arrayBuffer();
    const runtime = path.join(root, 'runtime');
    const directory = path.join(runtime, (await fs.readdir(runtime))[0]);
    const remove = fs.rm.bind(fs);
    let locked = true;
    vi.spyOn(fs, 'rm').mockImplementation(async (file, options) => {
      if (locked && String(file) === directory)
        throw Object.assign(new Error('Synthetic Windows file lock'), { code: 'EBUSY' });
      return remove(file, options);
    });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await expect(manager.dispose()).resolves.toBeUndefined();
    expect(manager.usage()).toMatchObject({
      active: 0,
      children: 0,
      entries: 1,
      bytes: bytes.length,
      closeCleanupPending: true,
    });
    expect(warn).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ directory }));
    locked = false;
    await manager.dispose();
    expect(manager.usage()).toMatchObject({ entries: 0, bytes: 0, closeCleanupPending: false });
    expect(await fs.readdir(runtime)).toEqual([]);
  });

  it('keeps assets accessible and closes normally if the temporary directory is unavailable', async () => {
    const { root, url, manager, bytes } = await setup();
    const mkdir = fs.mkdir.bind(fs);
    vi.spyOn(fs, 'mkdir').mockImplementation(async (...args) => {
      if (String(args[0]) === path.join(root, 'runtime'))
        throw Object.assign(new Error('Synthetic read-only temporary filesystem'), {
          code: 'EACCES',
        });
      return mkdir(...args);
    });
    const response = await fetch(url());
    expect(response.headers.get('x-huandeng-preview-reason')).toBe('cache-unavailable');
    expect(Buffer.from(await response.arrayBuffer()).equals(bytes)).toBe(true);
    await expect(manager.dispose()).resolves.toBeUndefined();
    expect(manager.usage()).toMatchObject({ entries: 0, bytes: 0, closeCleanupPending: false });
  });

  it('does not launch an encoder for unsupported formats or excessive decoded pixel counts', async () => {
    const { root, manager, url } = await setup({ encoder });
    await fs.writeFile(
      path.join(root, 'media/vector.svg'),
      '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400"/>',
    );
    const svg = await fetch(url('media/vector.svg'));
    expect(svg.headers.get('x-huandeng-preview-reason')).toBe('unsupported-format');
    await svg.arrayBuffer();
    const oversized = Buffer.alloc(24);
    oversized.write('89504e470d0a1a0a', 'hex');
    oversized.writeUInt32BE(64000, 16);
    oversized.writeUInt32BE(64000, 20);
    await fs.writeFile(path.join(root, 'media/oversized.png'), oversized);
    const response = await fetch(url('media/oversized.png'));
    expect(response.headers.get('x-huandeng-preview-reason')).toBe('pixel-limit');
    await response.arrayBuffer();
    expect(manager.usage()).toMatchObject({ derived: 0, children: 0 });
  });

  it('kills a timed-out owned process and removes its process reference', async () => {
    const { manager } = await setup({ timeoutMs: 50 });
    const run = (
      manager as unknown as { run(executable: string, args: string[]): Promise<string> }
    ).run.bind(manager);
    await expect(run(process.execPath, ['-e', 'setInterval(() => {}, 1000)'])).rejects.toThrow(
      'PREVIEW_TIMEOUT',
    );
    expect(manager.usage().children).toBe(0);
  });

  it.skipIf(!available)(
    'closes active work and kills its encoder before removing temporary inputs',
    async () => {
      const { manager, url } = await setup({ encoder });
      const request = fetch(url())
        .then((res) => res.arrayBuffer())
        .catch(() => undefined);
      await vi.waitFor(() => expect(manager.usage().children).toBeGreaterThan(0), { interval: 2 });
      await manager.dispose();
      await request;
      expect(manager.usage()).toMatchObject({ children: 0, active: 0, entries: 0, queued: 0 });
    },
  );
});
