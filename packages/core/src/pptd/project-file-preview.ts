import { constants } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { imageDimensions, imageFormat } from './export-images';
import { normalizeRelativePath } from './identity';
import { jpegOrientation } from './image-orientation';
import { hashBytes } from './persistence';
import { PptdError, type Revision } from './types';

export const FILE_TEXT_PREVIEW_LIMIT = 256 * 1024;
export const FILE_IMAGE_PREVIEW_LIMIT = 32 * 1024 * 1024;
const IMAGE_PIXEL_LIMIT = 32 * 1024 * 1024;

interface PreviewFile {
  path: string;
  name: string;
  bytes: number;
  modifiedAt: string;
}

export type ProjectFilePreview = PreviewFile &
  (
    | {
        kind: 'text';
        text: string;
        language: string;
        encoding: string;
        truncated: boolean;
        previewBytes: number;
      }
    | {
        kind: 'image';
        contentType: string;
        width: number;
        height: number;
        revision: Revision;
      }
    | { kind: 'unsupported'; reason: string }
  );

const TEXT_EXTENSIONS = new Map(
  Object.entries({
    '.md': 'Markdown source',
    '.markdown': 'Markdown source',
    '.mdx': 'Markdown source',
    '.json': 'JSON source',
    '.jsonl': 'JSON source',
    '.yaml': 'YAML source',
    '.yml': 'YAML source',
    '.toml': 'TOML source',
    '.txt': 'Plain text',
    '.log': 'Plain text',
    '.csv': 'CSV source',
    '.tsv': 'TSV source',
    '.cmd': 'Command script source',
    '.bat': 'Command script source',
    '.ps1': 'PowerShell source',
    '.py': 'Python source',
    '.sh': 'Shell script source',
    '.js': 'JavaScript source',
    '.mjs': 'JavaScript source',
    '.cjs': 'JavaScript source',
    '.ts': 'TypeScript source',
    '.tsx': 'TypeScript source',
    '.css': 'CSS source',
    '.html': 'HTML source',
    '.htm': 'HTML source',
    '.xml': 'XML source',
    '.svg': 'SVG source',
    '.page': 'Slide source',
    '.pptd': 'Project source',
  }),
);
const IMAGE_EXTENSIONS = new Map(
  Object.entries({
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
  }),
);

function inside(root: string, file: string) {
  const relative = path.relative(root, file);
  return relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

async function openFile(root: string, source: string) {
  if (typeof source !== 'string' || source.length > 2048 || source.includes(':'))
    throw new PptdError('PATH_OUTSIDE_PROJECT', 'Choose a file inside this Project.');
  const relative = normalizeRelativePath(source);
  const directory = await fs.realpath(root);
  let current = directory;
  for (const part of relative.split('/')) {
    current = path.join(current, part);
    const entry = await fs.lstat(current);
    if (entry.isSymbolicLink())
      throw new PptdError('PATH_OUTSIDE_PROJECT', 'Linked files and folders are not previewed.');
  }
  const actual = await fs.realpath(current);
  if (!inside(directory, actual))
    throw new PptdError('PATH_OUTSIDE_PROJECT', 'The file resolves outside this Project.');
  const before = await fs.lstat(actual);
  if (!before.isFile()) throw new PptdError('INVALID_REQUEST', 'Choose a regular file to preview.');
  const handle = await fs.open(actual, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  try {
    const stats = await handle.stat();
    const resolved = await fs.realpath(current);
    if (
      !inside(directory, resolved) ||
      resolved !== actual ||
      !stats.isFile() ||
      stats.dev !== before.dev ||
      stats.ino !== before.ino
    )
      throw new PptdError('PATH_OUTSIDE_PROJECT', 'The selected file changed while opening.');
    return { handle, stats, relative };
  } catch (error) {
    await handle.close();
    throw error;
  }
}

function webpSize(bytes: Buffer) {
  if (
    bytes.length < 30 ||
    bytes.toString('ascii', 0, 4) !== 'RIFF' ||
    bytes.toString('ascii', 8, 12) !== 'WEBP' ||
    bytes.readUInt32LE(4) + 8 !== bytes.length
  )
    return null;
  const type = bytes.toString('ascii', 12, 16);
  if (type === 'VP8X')
    return { width: bytes.readUIntLE(24, 3) + 1, height: bytes.readUIntLE(27, 3) + 1 };
  if (type === 'VP8 ' && bytes.toString('hex', 23, 26) === '9d012a')
    return { width: bytes.readUInt16LE(26) & 0x3fff, height: bytes.readUInt16LE(28) & 0x3fff };
  if (type === 'VP8L' && bytes[20] === 0x2f) {
    const bits = bytes.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
  }
  return null;
}

async function readFile(root: string, source: string) {
  const { handle, stats, relative } = await openFile(root, source).catch((error: unknown) => {
    if (['ENOENT', 'ENOTDIR'].includes((error as NodeJS.ErrnoException).code ?? ''))
      throw new PptdError('TARGET_NOT_FOUND', 'This file is no longer available.');
    throw error;
  });
  try {
    const file: PreviewFile = {
      path: relative,
      name: path.posix.basename(relative),
      bytes: stats.size,
      modifiedAt: stats.mtime.toISOString(),
    };
    const unsupported = (reason: string) => ({
      preview: { ...file, kind: 'unsupported' as const, reason },
      bytes: undefined,
    });
    const extension = path.posix.extname(relative).toLowerCase();
    const contentType = IMAGE_EXTENSIONS.get(extension);
    const language =
      TEXT_EXTENSIONS.get(extension) ??
      (/^(?:readme|license|changelog)$/i.test(file.name) ? 'Plain text' : undefined);
    if (!contentType && !language)
      return unsupported('Preview is not available for this file type.');
    if (contentType && stats.size > FILE_IMAGE_PREVIEW_LIMIT)
      return unsupported('This image exceeds the 32 MiB preview limit.');
    const length = Math.min(
      stats.size,
      contentType ? FILE_IMAGE_PREVIEW_LIMIT : FILE_TEXT_PREVIEW_LIMIT,
    );
    const bytes = Buffer.alloc(length);
    let offset = 0;
    while (offset < length) {
      const result = await handle.read(bytes, offset, length - offset, offset);
      if (!result.bytesRead)
        throw new PptdError(
          'REVISION_CONFLICT',
          'The file changed while reading. Refresh the preview.',
        );
      offset += result.bytesRead;
    }
    const after = await handle.stat();
    if (after.size !== stats.size || after.mtimeMs !== stats.mtimeMs)
      throw new PptdError(
        'REVISION_CONFLICT',
        'The file changed while reading. Refresh the preview.',
      );
    if (contentType) {
      const format = imageFormat(bytes);
      let dimensions =
        contentType === 'image/webp'
          ? webpSize(bytes)
          : format && contentType === `image/${format}`
            ? imageDimensions(bytes, format)
            : null;
      if (
        !dimensions ||
        dimensions.width <= 0 ||
        dimensions.height <= 0 ||
        dimensions.width * dimensions.height > IMAGE_PIXEL_LIMIT
      )
        return unsupported('This image is invalid or exceeds the 32 megapixel preview limit.');
      if (format === 'jpeg' && [5, 6, 7, 8].includes(jpegOrientation(bytes)))
        dimensions = { width: dimensions.height, height: dimensions.width };
      return {
        preview: {
          ...file,
          kind: 'image' as const,
          contentType,
          ...dimensions,
          revision: hashBytes(bytes),
        },
        bytes,
      };
    }
    const truncated = stats.size > bytes.length;
    const encoding =
      bytes[0] === 0xff && bytes[1] === 0xfe
        ? 'utf-16le'
        : bytes[0] === 0xfe && bytes[1] === 0xff
          ? 'utf-16be'
          : 'utf-8';
    let text: string;
    try {
      text = new TextDecoder(encoding, { fatal: true }).decode(bytes, { stream: truncated });
    } catch {
      return unsupported('Text preview requires UTF-8 or UTF-16 with a byte-order mark.');
    }
    // biome-ignore lint/suspicious/noControlCharactersInRegex: Binary control bytes distinguish unsupported files from text previews.
    if (/[\u0000-\u0008\u000e-\u001f]/.test(text))
      return unsupported('This file contains binary data and cannot be shown as text.');
    return {
      preview: {
        ...file,
        kind: 'text' as const,
        text,
        language: language as string,
        encoding,
        truncated,
        previewBytes: bytes.length,
      },
      bytes: undefined,
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT')
      throw new PptdError('TARGET_NOT_FOUND', 'This file is no longer available.');
    throw error;
  } finally {
    await handle.close();
  }
}

export async function readProjectFilePreview(
  root: string,
  source: string,
): Promise<ProjectFilePreview> {
  return (await readFile(root, source)).preview;
}

export async function readProjectFileImage(root: string, source: string, revision: string | null) {
  const result = await readFile(root, source);
  if (result.preview.kind !== 'image' || !result.bytes)
    throw new PptdError('INVALID_REQUEST', 'Choose a supported image file to preview.');
  if (revision !== result.preview.revision)
    throw new PptdError('REVISION_CONFLICT', 'This image changed. Refresh the preview.');
  return { ...result.preview, data: result.bytes };
}
