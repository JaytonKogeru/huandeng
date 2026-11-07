import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { DeckSnapshot, TransactionRequest, TransactionResult } from './types.ts';

export function runtimeRoot(): string {
  return (
    process.env.HUANDENG_RUNTIME_DIR ??
    path.join(process.env.LOCALAPPDATA ?? path.join(os.homedir(), '.local', 'state'), 'Huandeng')
  );
}

export async function discoveryPath(entryPath: string): Promise<string> {
  const canonical = await fs.realpath(path.resolve(entryPath));
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
}

export class HuandengClient {
  private token = '';

  constructor(readonly url: string) {
    const parsed = new URL(url);
    if (
      parsed.protocol !== 'http:' ||
      !['127.0.0.1', 'localhost', '[::1]'].includes(parsed.hostname)
    ) {
      throw new Error('Huandeng connects only to a local loopback editor.');
    }
  }

  async request<T>(endpoint: string, body?: unknown): Promise<T> {
    const response = await fetch(`${this.url.replace(/\/$/, '')}/__pptd${endpoint}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        'content-type': 'application/json',
        ...(body === undefined ? {} : { 'x-huandeng-token': this.token }),
      },
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
    return snapshot;
  }

  apply(request: TransactionRequest): Promise<TransactionResult> {
    return this.request('/transactions', request);
  }
}

export async function connectClient(options: {
  url?: string;
  entry?: string;
}): Promise<HuandengClient> {
  let url = options.url;
  if (!url) {
    if (!options.entry)
      throw new Error('Pass --entry path/to/deck.pptd or --url http://127.0.0.1:4850.');
    try {
      const record: SessionDiscovery = JSON.parse(
        await fs.readFile(await discoveryPath(options.entry), 'utf8'),
      );
      url = record.url;
    } catch {
      throw new Error(
        'No active Huandeng session for this deck. Run huandeng open <deck.pptd> first.',
      );
    }
  }
  const client = new HuandengClient(url);
  const snapshot = await client.session();
  if (options.entry) {
    const [requested, actual] = await Promise.all([
      fs.realpath(path.resolve(options.entry)),
      fs.realpath(snapshot.entry),
    ]);
    if (requested !== actual)
      throw new Error('The active session belongs to a different document.');
  }
  return client;
}
