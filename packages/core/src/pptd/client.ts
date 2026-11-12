import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { resolveProjectEntry } from './project-entry.cjs';
import type {
  DeckSnapshot,
  TransactionPreview,
  TransactionRequest,
  TransactionResult,
} from './types.ts';

export function runtimeRoot(): string {
  return (
    process.env.HUANDENG_RUNTIME_DIR ??
    path.join(process.env.LOCALAPPDATA ?? path.join(os.homedir(), '.local', 'state'), 'Huandeng')
  );
}

export async function discoveryPath(entryPath: string): Promise<string> {
  const canonical = await resolveProjectEntry(entryPath);
  const normalized = process.platform === 'win32' ? canonical.toLowerCase() : canonical;
  return path.join(
    runtimeRoot(),
    'sessions',
    `${createHash('sha256').update(normalized).digest('hex')}.json`,
  );
}

export interface SessionDiscovery {
  entry: string;
  url: string;
  pid: number;
  epoch: string;
  protocol: 2;
  agentToken: string;
  launcherToken: string;
}

export async function readSessionDiscovery(options: {
  entry?: string;
  url?: string;
}): Promise<SessionDiscovery> {
  const entry = options.entry ? await resolveProjectEntry(options.entry) : undefined;
  for (let attempt = 0; attempt < 40; attempt++) {
    const files = entry
      ? [await discoveryPath(entry)]
      : (await fs.readdir(path.join(runtimeRoot(), 'sessions')).catch(() => []))
          .filter((file) => file.endsWith('.json'))
          .slice(0, 64)
          .map((file) => path.join(runtimeRoot(), 'sessions', file));
    for (const file of files) {
      try {
        const stats = await fs.stat(file);
        if (
          !stats.isFile() ||
          stats.size > 262144 ||
          (process.platform !== 'win32' && stats.mode & 0o077)
        )
          continue;
        const record = JSON.parse(await fs.readFile(file, 'utf8')) as SessionDiscovery;
        if (
          record.protocol !== 2 ||
          !record.epoch ||
          !Number.isSafeInteger(record.pid) ||
          record.pid <= 0 ||
          typeof record.agentToken !== 'string' ||
          typeof record.launcherToken !== 'string' ||
          !/^[A-Za-z0-9_-]{43}$/.test(record.agentToken) ||
          !/^[A-Za-z0-9_-]{43}$/.test(record.launcherToken)
        )
          continue;
        const local = new URL(record.url);
        if (
          local.protocol !== 'http:' ||
          !['127.0.0.1', 'localhost', '[::1]'].includes(local.hostname) ||
          local.username ||
          local.password ||
          local.search ||
          local.hash ||
          !['', '/'].includes(local.pathname)
        )
          continue;
        if (options.url && local.origin !== new URL(options.url).origin) continue;
        if (entry) {
          const actual = await fs.realpath(record.entry);
          if (
            (process.platform === 'win32' ? actual.toLowerCase() : actual) !==
            (process.platform === 'win32' ? entry.toLowerCase() : entry)
          )
            continue;
        }
        return record;
      } catch {}
    }
    await delay(25);
  }
  throw new Error(
    'No authenticated local session for this Project. Open it in the current HUANDENG Editor.',
  );
}

export class HuandengClient {
  constructor(
    readonly url: string,
    private token = '',
    private epoch?: string,
  ) {
    const parsed = new URL(url);
    if (
      parsed.protocol !== 'http:' ||
      !['127.0.0.1', 'localhost', '[::1]'].includes(parsed.hostname) ||
      parsed.username ||
      parsed.password ||
      parsed.search ||
      parsed.hash ||
      !['', '/'].includes(parsed.pathname)
    ) {
      throw new Error('Huandeng connects only to a local loopback editor.');
    }
  }

  async authorizationHeaders(): Promise<Record<string, string>> {
    if (!this.token) {
      const record = await readSessionDiscovery({ url: this.url });
      this.token = record.agentToken;
      this.epoch = record.epoch;
    }
    return { 'x-huandeng-token': this.token };
  }

  async request<T>(endpoint: string, body?: unknown): Promise<T> {
    const response = await fetch(`${this.url.replace(/\/$/, '')}/__pptd${endpoint}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        'content-type': 'application/json',
        ...(await this.authorizationHeaders()),
      },
      redirect: 'error',
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const data = await response.json();
    if (!response.ok) {
      const error = Object.assign(
        new Error(data.message ?? data.error ?? response.statusText),
        data,
      );
      throw error;
    }
    return data as T;
  }

  async session(): Promise<DeckSnapshot> {
    const { sessionToken, ...snapshot } = await this.request<
      DeckSnapshot & { sessionToken: string }
    >('/session');
    this.token = sessionToken;
    if (this.epoch && this.epoch !== snapshot.epoch)
      throw new Error('The local writer restarted. Reconnect to the selected Project.');
    return snapshot;
  }

  apply(request: TransactionRequest, previewHash?: string): Promise<TransactionResult> {
    return previewHash === undefined
      ? this.request('/transactions', request)
      : this.request('/proposals/apply', { transaction: request, previewHash });
  }

  preview(request: TransactionRequest): Promise<TransactionPreview> {
    return this.request('/proposals/preview', { transaction: request });
  }
}

export async function connectClient(options: {
  url?: string;
  entry?: string;
}): Promise<HuandengClient> {
  const entry = options.entry ? await resolveProjectEntry(options.entry) : undefined;
  if (!entry && !options.url)
    throw new Error('Pass --entry path/to/deck.pptd or --url for the intended local Project.');
  const record = await readSessionDiscovery({ entry, url: options.url });
  const client = new HuandengClient(record.url, record.agentToken, record.epoch);
  const snapshot = await client.session();
  if (entry) {
    const [requested, actual] = await Promise.all([
      fs.realpath(entry),
      fs.realpath(snapshot.entry),
    ]);
    if (requested !== actual)
      throw new Error('The active session belongs to a different document.');
  }
  return client;
}
