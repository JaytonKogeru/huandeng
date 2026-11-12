import type {
  ResourceRequest,
  ResourceTicket,
  SessionCapability,
} from '../../pptd/session-authority';

declare global {
  interface Window {
    __HUANDENG_EXPORT_AUTH__?: SessionCapability;
  }
}

let current: Promise<SessionCapability> | undefined;
const resources = new Map<string, ResourceTicket>();
const resourceDefaults = new Map<string, ResourceTicket>();
const resourcePurpose = (value: ResourceRequest) =>
  JSON.stringify([value.route, value.path, value.size]);
let renewing: ReturnType<typeof setTimeout> | undefined;
const resourceKey = (value: ResourceRequest) =>
  JSON.stringify([value.route, value.path, value.size, value.revision]);

export function sessionCapability(api: string): Promise<SessionCapability> {
  current ??= (async () => {
    if (typeof window === 'undefined') throw new Error('Open the Project through HUANDENG.');
    if (window.__HUANDENG_EXPORT_AUTH__) return window.__HUANDENG_EXPORT_AUTH__;
    if (window.huandengDesktop?.session)
      return { ...(await window.huandengDesktop.session()), role: 'ui' as const };
    const storageKey = `huandeng:session:${window.location.origin}`;
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const ticket = fragment.get('huandeng-launch');
    if (ticket) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      const response = await fetch(`${api}/auth/exchange`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ticket }),
        cache: 'no-store',
        redirect: 'error',
      });
      if (!response.ok)
        throw new Error('This launch link expired. Open the Project from HUANDENG again.');
      const capability = (await response.json()) as SessionCapability;
      window.sessionStorage.setItem(storageKey, JSON.stringify(capability));
      return capability;
    }
    try {
      const saved = JSON.parse(
        window.sessionStorage.getItem(storageKey) ?? 'null',
      ) as SessionCapability | null;
      if (saved?.token && saved.expiresAt > Date.now()) return saved;
      window.sessionStorage.removeItem(storageKey);
    } catch {}
    throw new Error(
      'Open this Project from HUANDENG or run huandeng open to establish a local session.',
    );
  })().catch((error: unknown) => {
    current = undefined;
    throw error;
  });
  return current;
}

export async function sessionHeaders(api: string): Promise<Record<string, string>> {
  return { 'x-huandeng-token': (await sessionCapability(api)).token };
}

export function resourceUrl(url: string, revision?: string | null): string {
  if (!url.startsWith('/') || url.startsWith('//')) return url;
  const parsed = new URL(url, 'http://127.0.0.1');
  const marker = parsed.pathname.indexOf('/__pptd');
  if (marker < 0) return url;
  const route = parsed.pathname.slice(marker + '/__pptd'.length);
  const request = {
    route,
    path: parsed.searchParams.get('path') ?? undefined,
    size: parsed.searchParams.get('size') ?? undefined,
    revision: revision ?? parsed.searchParams.get('revision') ?? undefined,
  };
  const exact = resources.get(resourceKey(request));
  const candidate =
    exact ?? (request.revision ? undefined : resourceDefaults.get(resourcePurpose(request)));
  if (candidate && candidate.expiresAt > Date.now())
    parsed.searchParams.set('ticket', candidate.ticket);
  return parsed.pathname + parsed.search + parsed.hash;
}

function collect(value: unknown, found: Map<string, string | undefined>): void {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    for (const child of value) collect(child, found);
    return;
  }
  const record = value as Record<string, unknown>;
  if (record.assetRevisions && typeof record.assetRevisions === 'object') {
    for (const [source, revision] of Object.entries(record.assetRevisions)) {
      if (typeof revision === 'string' && !/^https?:|^data:|^blob:/i.test(source))
        found.set(source, revision);
    }
  }
  if (
    typeof record.path === 'string' &&
    /^(?:media|assets)\//.test(record.path) &&
    (record.previewable || record.kind === 'image')
  ) {
    const revision = record.previewRevision ?? record.revision;
    found.set(
      record.path,
      typeof revision === 'string' && /^sha256:/.test(revision) ? revision : undefined,
    );
  }
  for (const [name, child] of Object.entries(record)) {
    if (
      (name === 'src' || name === 'url') &&
      typeof child === 'string' &&
      /^(?:\.?\/)?(?:media|assets)\//.test(child.replaceAll('\\', '/'))
    )
      if (!found.has(child)) found.set(child, undefined);
    if (name !== 'assetRevisions') collect(child, found);
  }
}

function exportLinks(
  value: unknown,
  visit: (record: Record<string, unknown>, key: string, route: string) => void,
): void {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    for (const child of value) exportLinks(child, visit);
    return;
  }
  const record = value as Record<string, unknown>;
  for (const [key, child] of Object.entries(record)) {
    if (
      ['url', 'reportUrl', 'downloadUrl'].includes(key) &&
      typeof child === 'string' &&
      /^\/__pptd\/exports\/[^/]+\/(download|report)/.test(child)
    )
      visit(record, key, new URL(child, 'http://127.0.0.1').pathname.slice('/__pptd'.length));
    else exportLinks(child, visit);
  }
}

async function requestResources(api: string, requests: ResourceRequest[]): Promise<void> {
  for (let index = 0; index < requests.length; index += 900) {
    const response = await fetch(`${api}/auth/resources`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(await sessionHeaders(api)) },
      body: JSON.stringify({ resources: requests.slice(index, index + 900) }),
      cache: 'no-store',
      redirect: 'error',
    });
    if (!response.ok)
      throw new Error('The editor could not authorize project resources. Reopen the Project.');
    const tickets = (await response.json()) as ResourceTicket[];
    for (const item of tickets) {
      resources.set(resourceKey(item), item);
      resourceDefaults.set(resourcePurpose(item), item);
    }
  }
  if (resources.size > 8192) {
    for (const [key, item] of resources) if (item.expiresAt <= Date.now()) resources.delete(key);
    for (const [key, item] of resourceDefaults)
      if (item.expiresAt <= Date.now()) resourceDefaults.delete(key);
  }
}

export async function prepareResources(
  api: string,
  value: unknown,
  exportId?: string,
): Promise<void> {
  const found = new Map<string, string | undefined>();
  collect(value, found);
  const requests: ResourceRequest[] = [];
  for (const [path, revision] of found) {
    for (const request of exportId
      ? [{ route: `/exports/${exportId}/asset`, path, revision }]
      : [
          { route: '/asset', path, revision },
          { route: '/asset-preview', path, revision, size: '320' },
          { route: '/asset-preview', path, revision, size: '640' },
        ]) {
      const cached = resources.get(resourceKey(request));
      if (!cached || cached.expiresAt < Date.now() + 60_000) requests.push(request);
    }
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    if (
      record.kind === 'image' &&
      typeof record.path === 'string' &&
      typeof record.revision === 'string'
    )
      requests.push({
        route: '/project-file-preview/image',
        path: record.path,
        revision: record.revision,
      });
  }
  exportLinks(value, (_record, _key, route) => requests.push({ route }));
  if (requests.length) await requestResources(api, requests);
  exportLinks(value, (record, key) => {
    record[key] = resourceUrl(record[key] as string);
  });
  if (!renewing && !exportId && resources.size) {
    const renew = () => {
      renewing = setTimeout(
        () => {
          const pending = [...resources.values()].map(({ route, path, revision, size }) => ({
            route,
            path,
            revision,
            size,
          }));
          void requestResources(api, pending)
            .catch(() => {})
            .finally(renew);
        },
        10 * 60 * 1000,
      );
    };
    renew();
  }
}

export function subscribeAuthenticated(
  api: string,
  route: string,
  receive: (event: string, data: string) => void,
  onConnection: (connected: boolean) => void,
): () => void {
  const abort = new AbortController();
  let retry: ReturnType<typeof setTimeout> | undefined;
  const connect = async () => {
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    try {
      const response = await fetch(`${api}${route}`, {
        headers: await sessionHeaders(api),
        signal: abort.signal,
        cache: 'no-store',
        redirect: 'error',
      });
      if (!response.ok || !response.body) throw new Error('Event connection failed.');
      reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffered = '';
      onConnection(true);
      while (!abort.signal.aborted) {
        const chunk = await reader.read();
        if (chunk.done) break;
        buffered += decoder.decode(chunk.value, { stream: true }).replaceAll('\r\n', '\n');
        let end = buffered.indexOf('\n\n');
        while (end >= 0) {
          const packet = buffered.slice(0, end).split('\n');
          buffered = buffered.slice(end + 2);
          const event =
            packet
              .find((line) => line.startsWith('event:'))
              ?.slice(6)
              .trim() ?? 'message';
          const data = packet
            .filter((line) => line.startsWith('data:'))
            .map((line) => line.slice(5).trimStart())
            .join('\n');
          if (data) receive(event, data);
          end = buffered.indexOf('\n\n');
        }
        if (buffered.length > 2 * 1024 * 1024) throw new Error('Event packet exceeded its limit.');
      }
    } catch {
      if (!abort.signal.aborted) onConnection(false);
    } finally {
      await reader?.cancel().catch(() => {});
      if (!abort.signal.aborted) {
        onConnection(false);
        retry = setTimeout(() => void connect(), 1000);
      }
    }
  };
  void connect();
  return () => {
    abort.abort();
    if (retry) clearTimeout(retry);
  };
}
