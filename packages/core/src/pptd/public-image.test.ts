import { lookup } from 'node:dns/promises';
import { EventEmitter } from 'node:events';
import { request } from 'node:https';
import { Readable } from 'node:stream';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { downloadPublicImage, isPublicImageAddress, publicImageUrl } from './public-image';

vi.mock('node:dns/promises', () => ({ lookup: vi.fn() }));
vi.mock('node:https', () => ({ request: vi.fn() }));

const lookupAll = vi.mocked(
  lookup as (
    hostname: string,
    options: { all: true; verbatim: true },
  ) => Promise<{ address: string; family: number }[]>,
);
type Reply = { status?: number; headers?: Record<string, string | undefined>; bytes?: Buffer };
let replies: Reply[];
beforeEach(() => {
  replies = [{ bytes: Buffer.from('image bytes') }];
  lookupAll.mockResolvedValue([{ address: '93.184.216.34', family: 4 }]);
  vi.mocked(request).mockImplementation((...args: unknown[]) => {
    const response = replies.shift();
    if (!response) throw new Error('Unexpected network request');
    const req = new EventEmitter() as ReturnType<typeof request>;
    req.end = (() => {
      queueMicrotask(() => {
        const stream = Object.assign(Readable.from([response.bytes ?? Buffer.alloc(0)]), {
          statusCode: response.status ?? 200,
          headers: { 'content-type': 'image/png', ...response.headers },
          complete: true,
        });
        (args[1] as (value: unknown) => void)(stream);
      });
      return req;
    }) as typeof req.end;
    return req;
  });
});
afterEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe('public original image acquisition', () => {
  it.each([
    '127.0.0.1',
    '10.1.2.3',
    '172.16.3.1',
    '192.168.3.2',
    '169.254.169.254',
    '100.64.0.1',
    '0.0.0.0',
    '198.18.1.1',
    '192.0.2.2',
    '224.1.1.1',
    '255.255.255.255',
    '::1',
    'fc00::1',
    'fe80::1',
    '::ffff:8.8.8.8',
    '2001:db8::1',
    '2002:0808:0808::1',
  ])('rejects private or reserved address %s', (address) => {
    expect(isPublicImageAddress(address)).toBe(false);
  });
  it('accepts globally routable addresses', () => {
    expect(isPublicImageAddress('8.8.8.8')).toBe(true);
    expect(isPublicImageAddress('2606:4700:4700::1111')).toBe(true);
  });
  it.each([
    'http://images.example.org/a.png',
    'https://user:pass@images.example.org/a.png',
    'https://images.example.org:8443/a.png',
    'https://127.1/a.png',
    'https://localhost/a.png',
    'https://a.local/a.png',
    'https://images.example.org/a.png?access_token=secret',
  ])('rejects unsupported or credential-bearing URL %s', (url) => {
    expect(() => publicImageUrl(url)).toThrow();
  });
  it('pins validated DNS while preserving TLS host verification', async () => {
    const result = await downloadPublicImage('https://images.example.org/source.png');
    expect(result.finalUrl).toBe('https://images.example.org/source.png');
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        hostname: '93.184.216.34',
        servername: 'images.example.org',
        rejectUnauthorized: true,
        agent: false,
      }),
      expect.any(Function),
    );
  });
  it('rejects a mixed public/private DNS answer before connecting', async () => {
    lookupAll.mockResolvedValue([
      { address: '93.184.216.34', family: 4 },
      { address: '127.0.0.1', family: 4 },
    ]);
    await expect(downloadPublicImage('https://images.example.org/a.png')).rejects.toThrow(
      'non-public',
    );
    expect(request).not.toHaveBeenCalled();
  });
  it('validates a redirect destination and its DNS again', async () => {
    replies = [{ status: 302, headers: { location: 'https://other.example.org/b.png' } }];
    lookupAll
      .mockResolvedValueOnce([{ address: '93.184.216.34', family: 4 }])
      .mockResolvedValueOnce([{ address: '169.254.169.254', family: 4 }]);
    await expect(downloadPublicImage('https://images.example.org/a.png')).rejects.toThrow(
      'non-public',
    );
    expect(request).toHaveBeenCalledTimes(1);
  });
  it('rejects credentials introduced by a redirect', async () => {
    replies = [{ status: 302, headers: { location: 'https://user:pass@other.example.org/b.png' } }];
    await expect(downloadPublicImage('https://images.example.org/a.png')).rejects.toThrow(
      'credential-free',
    );
    expect(request).toHaveBeenCalledTimes(1);
  });
  it.each([
    { 'content-type': 'text/html' },
    { 'content-encoding': 'gzip' },
    { 'content-length': String(17 * 1024 * 1024) },
  ])('rejects unsupported response %o', async (headers) => {
    replies = [{ headers }];
    await expect(downloadPublicImage('https://images.example.org/a.png')).rejects.toThrow();
  });
  it('enforces the byte limit even without Content-Length', async () => {
    replies = [{ bytes: Buffer.alloc(17 * 1024 * 1024) }];
    await expect(downloadPublicImage('https://images.example.org/a.png')).rejects.toThrow('16 MiB');
  });
  it('bounds a stalled DNS lookup with the total deadline', async () => {
    vi.useFakeTimers();
    lookupAll.mockReturnValue(new Promise(() => {}));
    const result = expect(downloadPublicImage('https://images.example.org/a.png')).rejects.toThrow(
      'timed out',
    );
    await vi.advanceTimersByTimeAsync(20000);
    await result;
    expect(request).not.toHaveBeenCalled();
  });
});
