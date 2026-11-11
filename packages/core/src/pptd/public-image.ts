import { lookup } from 'node:dns/promises';
import { request } from 'node:https';
import { BlockList, isIP } from 'node:net';
import { PptdError } from './types';

const limit = 16 * 1024 * 1024;
const forbidden = new BlockList();
for (const [address, prefix] of [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.88.99.0', 24],
  ['192.31.196.0', 24],
  ['192.52.193.0', 24],
  ['192.175.48.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
] as const)
  forbidden.addSubnet(address, prefix, 'ipv4');
for (const [address, prefix] of [
  ['2001::', 23],
  ['2001:db8::', 32],
  ['2002::', 16],
  ['3fff::', 20],
  ['2620:4f:8000::', 48],
] as const)
  forbidden.addSubnet(address, prefix, 'ipv6');
const globalV6 = new BlockList();
globalV6.addSubnet('2000::', 3, 'ipv6');

export function isPublicImageAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) return !forbidden.check(address, 'ipv4');
  return family === 6 && globalV6.check(address, 'ipv6') && !forbidden.check(address, 'ipv6');
}

export function publicImageUrl(input: string): URL {
  if (input.length > 4096) throw new PptdError('INVALID_REQUEST', 'The image URL is too long.');
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new PptdError('INVALID_REQUEST', 'A public HTTPS image URL is required.');
  }
  if (
    url.protocol !== 'https:' ||
    url.port ||
    url.username ||
    url.password ||
    isIP(url.hostname) ||
    !url.hostname.includes('.') ||
    /(?:^|\.)(?:localhost|local|internal|test|invalid|example|onion)$/.test(url.hostname) ||
    [...url.searchParams.keys()].some((key) =>
      /token|api.?key|signature|credential|authorization|password|secret|x-amz-|x-goog-/i.test(key),
    )
  )
    throw new PptdError(
      'INVALID_REQUEST',
      'Use a credential-free public HTTPS image URL on port 443.',
    );
  url.hash = '';
  return url;
}

export async function publicImageAddress(url: URL) {
  const addresses = await lookup(url.hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some((item) => !isPublicImageAddress(item.address)))
    throw new PptdError(
      'INVALID_REQUEST',
      'The image host resolves to a non-public or reserved address.',
    );
  return addresses[0];
}

type ImageResponse = { redirect: string } | { bytes: Buffer; contentType: string };

async function readImageResponse(url: URL, signal: AbortSignal): Promise<ImageResponse> {
  const address = await publicImageAddress(url);
  signal.throwIfAborted();
  return new Promise((resolve, reject) => {
    const req = request(
      {
        protocol: 'https:',
        hostname: address.address,
        family: address.family,
        port: 443,
        servername: url.hostname,
        path: url.pathname + url.search,
        method: 'GET',
        agent: false,
        rejectUnauthorized: true,
        signal,
        headers: {
          host: url.host,
          accept: 'image/png,image/jpeg,image/webp,image/gif,image/svg+xml',
          'accept-encoding': 'identity',
        },
      },
      (response) => {
        const fail = (message: string) => {
          response.destroy();
          reject(new PptdError('INVALID_REQUEST', message));
        };
        if ([301, 302, 303, 307, 308].includes(response.statusCode ?? 0)) {
          const location = response.headers.location;
          response.destroy();
          if (!location)
            return reject(new PptdError('INVALID_REQUEST', 'Image redirect has no destination.'));
          resolve({ redirect: location });
          return;
        }
        if (response.statusCode !== 200)
          return fail('The public image server did not return HTTP 200.');
        const contentType = (response.headers['content-type'] ?? '')
          .split(';')[0]
          .trim()
          .toLowerCase();
        if (!/^image\/(?:png|jpeg|webp|gif|svg\+xml)$/.test(contentType))
          return fail('The URL must return a supported original image, not an HTML page.');
        if (
          response.headers['content-encoding'] &&
          response.headers['content-encoding'] !== 'identity'
        )
          return fail('Compressed HTTP image responses are not supported.');
        const declared = Number(response.headers['content-length']);
        if (Number.isFinite(declared) && declared > limit)
          return fail('A downloaded image must be smaller than 16 MiB.');
        let size = 0;
        const chunks: Buffer[] = [];
        response.on('data', (chunk: Buffer) => {
          size += chunk.length;
          if (size > limit) return fail('A downloaded image must be smaller than 16 MiB.');
          chunks.push(chunk);
        });
        response.once('error', reject);
        response.once('end', () => {
          if (response.complete && size) resolve({ bytes: Buffer.concat(chunks), contentType });
          else reject(new PptdError('INVALID_REQUEST', 'The image response was incomplete.'));
        });
      },
    );
    req.once('error', reject);
    req.end();
  });
}

export async function downloadPublicImage(input: string) {
  const initial = publicImageUrl(input);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(new Error('Image download timed out.')), 20000);
  timeout.unref();
  let url = initial;
  const aborted = new Promise<never>((_resolve, reject) => {
    controller.signal.addEventListener('abort', () => reject(controller.signal.reason), {
      once: true,
    });
  });
  try {
    return await Promise.race([
      (async () => {
        for (let redirects = 0; redirects <= 3; redirects++) {
          const result = await readImageResponse(url, controller.signal);
          if ('bytes' in result)
            return { ...result, sourceUrl: initial.href, finalUrl: url.href, redirects };
          url = publicImageUrl(new URL(result.redirect, url).href);
        }
        throw new PptdError('INVALID_REQUEST', 'The image URL exceeds three redirects.');
      })(),
      aborted,
    ]);
  } finally {
    clearTimeout(timeout);
    controller.abort();
  }
}
