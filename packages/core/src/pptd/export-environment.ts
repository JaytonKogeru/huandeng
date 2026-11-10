import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { type Browser, chromium } from 'playwright';
import { PptdError } from './types';

export function mimeType(file: string) {
  return (
    (
      {
        '.svg': 'image/svg+xml',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.woff2': 'font/woff2',
        '.woff': 'font/woff',
        '.ttf': 'font/ttf',
        '.pdf': 'application/pdf',
        '.json': 'application/json',
        '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        '.mp4': 'video/mp4',
        '.webm': 'video/webm',
      } as Record<string, string>
    )[path.extname(file).toLowerCase()] ?? 'application/octet-stream'
  );
}

export async function readProjectAsset(root: string, source: string): Promise<Buffer> {
  if (source.startsWith('data:')) {
    const match = source.match(
      /^data:image\/(?:png|jpeg|gif|webp|svg\+xml);base64,([A-Za-z0-9+/=\r\n]+)$/,
    );
    if (!match || match[1].length > 48 * 1024 * 1024)
      throw new PptdError('INVALID_REQUEST', 'Unsupported embedded asset.');
    return Buffer.from(match[1], 'base64');
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(source) || source.startsWith('//') || source.includes('\0')) {
    throw new PptdError('PATH_OUTSIDE_PROJECT', 'Assets must be local project files.');
  }
  const normalized = source.replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\//, '');
  if (!/^(?:media|assets)\//.test(normalized)) {
    throw new PptdError('PATH_OUTSIDE_PROJECT', 'Only files in media/ or assets/ are served.');
  }
  const file = await fs.realpath(path.resolve(root, normalized));
  const relative = path.relative(await fs.realpath(root), file);
  if (relative.startsWith('..') || path.isAbsolute(relative))
    throw new PptdError('PATH_OUTSIDE_PROJECT', 'Asset resolves outside the project.');
  const handle = await fs.open(file, 'r');
  try {
    const stats = await handle.stat();
    if (!stats.isFile() || stats.size > 64 * 1024 * 1024)
      throw new PptdError('INVALID_REQUEST', 'Asset is not a file or exceeds 64 MiB.');
    const bytes = Buffer.allocUnsafe(stats.size);
    let offset = 0;
    while (offset < bytes.length) {
      const { bytesRead } = await handle.read(bytes, offset, bytes.length - offset, offset);
      if (!bytesRead)
        throw new PptdError('REVISION_CONFLICT', 'Asset size changed while it was being read.');
      offset += bytesRead;
    }
    const tail = await handle.read(Buffer.allocUnsafe(1), 0, 1, bytes.length);
    if (tail.bytesRead)
      throw new PptdError('REVISION_CONFLICT', 'Asset size changed while it was being read.');
    return bytes;
  } finally {
    await handle.close();
  }
}

export function assetSources(value: unknown, found = new Set<string>()): Set<string> {
  if (Array.isArray(value)) {
    for (const item of value) assetSources(item, found);
  } else if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      // Authored text can name project folders. Only source fields load asset bytes.
      if (
        (key === 'src' || key === 'url') &&
        typeof item === 'string' &&
        (/^(?:\.?\/)?(?:media|assets)\//.test(item.replace(/\\/g, '/')) ||
          item.startsWith('data:image/'))
      ) {
        found.add(item);
      } else {
        assetSources(item, found);
      }
    }
  }
  return found;
}

export async function openBrowser(): Promise<Browser> {
  const candidates = [
    process.env.HUANDENG_BROWSER,
    process.platform === 'win32'
      ? path.join(
          process.env['PROGRAMFILES(X86)'] ?? 'C:/Program Files (x86)',
          'Microsoft/Edge/Application/msedge.exe',
        )
      : undefined,
    process.platform === 'win32'
      ? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
      : '/usr/bin/chromium',
  ].filter((candidate): candidate is string => !!candidate);
  const executablePath = candidates.find((candidate) => existsSync(candidate));
  return chromium.launch({
    ...(executablePath ? { executablePath } : {}),
    headless: true,
    args: process.platform === 'linux' ? ['--no-sandbox', '--disable-dev-shm-usage'] : [],
  });
}
