import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { imageDimensions, imageFormat } from './export-images';
import { jpegOrientation } from './image-orientation';
import { hashBytes, resolveProjectPath } from './persistence';
import { PptdError } from './types';

type Dimensions = { width: number; height: number };

function invalid(message = 'This file is not a complete supported image.'): never {
  throw new PptdError('INVALID_REQUEST', message);
}

function positiveSize(width: number, height: number): Dimensions {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0)
    invalid('The image needs positive finite dimensions.');
  return { width, height };
}

function webpDimensions(bytes: Buffer): Dimensions {
  if (bytes.length < 20 || bytes.readUInt32LE(4) + 8 !== bytes.length) invalid();
  let dimensions: Dimensions | undefined;
  let extended = false;
  let hasImage = false;
  let offset = 12;
  while (offset + 8 <= bytes.length) {
    const type = bytes.toString('ascii', offset, offset + 4);
    const length = bytes.readUInt32LE(offset + 4);
    const start = offset + 8;
    const end = start + length;
    if (end + (length % 2) > bytes.length) invalid();
    if (type === 'VP8X') {
      if (length !== 10 || extended) invalid();
      dimensions = positiveSize(
        bytes.readUIntLE(start + 4, 3) + 1,
        bytes.readUIntLE(start + 7, 3) + 1,
      );
      extended = true;
    } else if (type === 'VP8 ') {
      if (
        length < 10 ||
        bytes[start] & 1 ||
        bytes.toString('hex', start + 3, start + 6) !== '9d012a'
      )
        invalid();
      const size = positiveSize(
        bytes.readUInt16LE(start + 6) & 0x3fff,
        bytes.readUInt16LE(start + 8) & 0x3fff,
      );
      if (!extended) dimensions = size;
      hasImage = true;
    } else if (type === 'VP8L') {
      if (length < 5 || bytes[start] !== 0x2f) invalid();
      const bits = bytes.readUInt32LE(start + 1);
      if (bits >>> 29) invalid();
      if (!extended) dimensions = positiveSize((bits & 0x3fff) + 1, ((bits >>> 14) & 0x3fff) + 1);
      hasImage = true;
    } else if (type === 'ANMF') {
      if (!extended || length < 24) invalid();
      hasImage = true;
    }
    offset = end + (length % 2);
  }
  if (offset !== bytes.length || !dimensions || !hasImage) invalid();
  return dimensions;
}

function validatePng(bytes: Buffer): void {
  if (bytes.length < 45 || bytes.toString('hex', 0, 8) !== '89504e470d0a1a0a') invalid();
  let offset = 8;
  let image = false;
  while (offset + 12 <= bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.toString('ascii', offset + 4, offset + 8);
    if (offset + length + 12 > bytes.length) invalid();
    if (offset === 8 && (type !== 'IHDR' || length !== 13)) invalid();
    if (type === 'IDAT') image = true;
    offset += length + 12;
    if (type === 'IEND') {
      if (length || !image || offset !== bytes.length) invalid();
      return;
    }
  }
  invalid();
}

function xmlText(value: string): string {
  if (/&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-f]+);)/i.test(value))
    invalid('The SVG contains an invalid entity.');
  return value.replace(/&([^;\s]+);/g, (_, entity: string) => {
    const names: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
    if (Object.hasOwn(names, entity)) return names[entity];
    const numeric = /^#(?:x([0-9a-f]+)|(\d+))$/i.exec(entity);
    const code = numeric ? Number.parseInt(numeric[1] ?? numeric[2], numeric[1] ? 16 : 10) : NaN;
    if (
      !Number.isFinite(code) ||
      code <= 0 ||
      code > 0x10ffff ||
      (code >= 0xd800 && code <= 0xdfff)
    )
      invalid('The SVG contains an invalid entity.');
    return String.fromCodePoint(code);
  });
}

function checkSvgCss(value: string): void {
  const css = value
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\\([0-9a-f]{1,6})\s?|\\([^\r\n])/gi, (_, digits: string, character: string) => {
      const code = digits ? Number.parseInt(digits, 16) : 0;
      return digits ? String.fromCodePoint(Math.min(code, 0x10ffff)) : character;
    });
  if (/@\s*(?:import|font-face)\b|expression\s*\(|(?:-moz-binding|behavior)\s*:/i.test(css))
    invalid('Import a self-contained SVG without scripts or external resources.');
  const urls = [...css.matchAll(/url\s*\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))\s*\)/gi)];
  if ((css.match(/url\s*\(/gi)?.length ?? 0) !== urls.length)
    invalid('The SVG contains an invalid resource reference.');
  for (const match of urls)
    if (!/^#[\w:.-]+$/.test((match[1] ?? match[2] ?? match[3]).trim()))
      invalid('SVG resources must use local fragment references.');
}

function svgDimensions(bytes: Buffer): Dimensions {
  let source: string;
  try {
    source = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return invalid('An imported SVG must be valid UTF-8.');
  }
  const stack: string[] = [];
  let root: Record<string, string> | undefined;
  let offset = 0;
  let tags = 0;
  let style = '';
  while (offset < source.length) {
    const start = source.indexOf('<', offset);
    const text = source.slice(offset, start < 0 ? source.length : start);
    if (!stack.length && text.trim()) invalid('The SVG must have one svg root element.');
    const insideStyle = stack.at(-1)?.split(':').at(-1)?.toLowerCase() === 'style';
    if (insideStyle) style += xmlText(text);
    else xmlText(text);
    if (start < 0) break;
    if (source.startsWith('<!--', start)) {
      const end = source.indexOf('-->', start + 4);
      if (end < 0) invalid('The SVG contains an unfinished comment.');
      offset = end + 3;
      continue;
    }
    if (source.startsWith('<![CDATA[', start)) {
      const end = source.indexOf(']]>', start + 9);
      if (!stack.length || end < 0) invalid('The SVG contains invalid CDATA.');
      if (insideStyle) style += source.slice(start + 9, end);
      offset = end + 3;
      continue;
    }
    if (source.startsWith('<?', start)) {
      const end = source.indexOf('?>', start + 2);
      const declaration = source.slice(start, end + 2);
      if (
        root ||
        end < 0 ||
        source.slice(0, start).trim() ||
        !/^<\?xml\s/i.test(declaration) ||
        /encoding\s*=\s*['"](?!utf-8['"]|us-ascii['"])[^'"]+/i.test(declaration)
      )
        invalid('SVG processing instructions and external stylesheets are not supported.');
      offset = end + 2;
      continue;
    }
    if (source.startsWith('<!', start))
      invalid('SVG declarations and entity definitions are not supported.');
    let end = start + 1;
    let quote = '';
    for (; end < source.length; end++) {
      const char = source[end];
      if (quote) {
        if (char === quote) quote = '';
      } else if (char === '"' || char === "'") quote = char;
      else if (char === '>') break;
    }
    if (end >= source.length) invalid('The SVG contains an unfinished element.');
    const body = source.slice(start + 1, end);
    if (body.startsWith('/')) {
      const closing = /^\/([\w:.-]+)\s*$/.exec(body);
      if (!closing || stack.pop() !== closing[1]) invalid('The SVG elements are not balanced.');
      if (insideStyle) {
        checkSvgCss(style);
        style = '';
      }
    } else {
      if (insideStyle) invalid('An SVG style element must contain CSS text.');
      const name = /^([A-Za-z_][\w:.-]*)/.exec(body)?.[1];
      if (!name || ++tags > 100000) invalid('The SVG has invalid or too many elements.');
      const localName = name.split(':').at(-1)?.toLowerCase() ?? '';
      if (
        [
          'script',
          'foreignobject',
          'iframe',
          'object',
          'embed',
          'audio',
          'video',
          'canvas',
          'animate',
          'animatetransform',
          'animatemotion',
          'set',
          'discard',
        ].includes(localName)
      )
        invalid('Import a static self-contained SVG without scripts or embedded documents.');
      const attributes: Record<string, string> = {};
      const closed = /\/\s*$/.test(body);
      const suffix = body.slice(name.length, closed ? body.lastIndexOf('/') : undefined);
      const attr = /\s+([A-Za-z_][\w:.-]*)\s*=\s*("[^"]*"|'[^']*')/gy;
      let consumed = 0;
      for (;;) {
        attr.lastIndex = consumed;
        const match = attr.exec(suffix);
        if (!match) break;
        const key = match[1];
        const value = xmlText(match[2].slice(1, -1));
        if (Object.hasOwn(attributes, key) || match[2].slice(1, -1).includes('<'))
          invalid('The SVG contains invalid attributes.');
        attributes[key] = value;
        const local = key.split(':').at(-1)?.toLowerCase() ?? '';
        if (/^on/i.test(local) || key.toLowerCase() === 'xml:base')
          invalid('SVG event handlers and external base paths are not supported.');
        checkSvgCss(value);
        if (['href', 'src', 'poster', 'action'].includes(local) && value) {
          const resource = value.trim();
          if (!/^#[\w:.-]+$/.test(resource)) {
            const raster = /^data:image\/(png|jpeg|gif|webp);base64,([A-Za-z0-9+/]+={0,2})$/i.exec(
              resource,
            );
            if (!['image', 'feimage'].includes(localName) || !raster)
              invalid(
                'SVG images must be embedded; references to external files are not supported.',
              );
            const nested = Buffer.from(raster[2], 'base64');
            const actual = imageFormat(nested);
            if (
              actual !== raster[1].toLowerCase() &&
              !(
                raster[1].toLowerCase() === 'webp' &&
                nested.toString('ascii', 0, 4) === 'RIFF' &&
                nested.toString('ascii', 8, 12) === 'WEBP'
              )
            )
              invalid('The embedded SVG image does not match its declared format.');
          }
        }
        consumed = attr.lastIndex;
      }
      if (suffix.slice(consumed).trim())
        invalid('The SVG attributes must be quoted and well formed.');
      if (!stack.length) {
        if (
          root ||
          name !== 'svg' ||
          (attributes.xmlns && attributes.xmlns !== 'http://www.w3.org/2000/svg')
        )
          invalid('The SVG must have one svg root element.');
        root = attributes;
      }
      if (!closed) stack.push(name);
    }
    offset = end + 1;
  }
  if (!root || stack.length) invalid('The SVG elements are not balanced.');
  const length = (value: string | undefined): number | null => {
    if (!value) return null;
    const parsed = /^\s*([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)\s*(px|pt|pc|mm|cm|in)?\s*$/i.exec(
      value,
    );
    if (!parsed) return null;
    const units: Record<string, number> = {
      px: 1,
      pt: 96 / 72,
      pc: 16,
      mm: 96 / 25.4,
      cm: 96 / 2.54,
      in: 96,
    };
    return Number(parsed[1]) * (units[(parsed[2] ?? 'px').toLowerCase()] ?? 1);
  };
  const width = length(root.width);
  const height = length(root.height);
  const box = root.viewBox
    ?.trim()
    .split(/[\s,]+/)
    .map(Number);
  if (box && (box.length !== 4 || !box.every(Number.isFinite) || box[2] <= 0 || box[3] <= 0))
    invalid('The SVG viewBox must have four finite numbers and positive dimensions.');
  if (width !== null && height !== null) return positiveSize(width, height);
  if (box) {
    if (width !== null) return positiveSize(width, (width * box[3]) / box[2]);
    if (height !== null) return positiveSize((height * box[2]) / box[3], height);
    return positiveSize(box[2], box[3]);
  }
  return positiveSize(width ?? 300, height ?? 150);
}

export async function importImage(root: string, input: { name: unknown; base64: unknown }) {
  if (
    typeof input.name !== 'string' ||
    typeof input.base64 !== 'string' ||
    !/^[A-Za-z0-9+/]*={0,2}$/.test(input.base64) ||
    input.base64.length > 45 * 1024 * 1024
  )
    throw new PptdError(
      'INVALID_REQUEST',
      'Choose a PNG, JPEG, SVG, GIF or WebP image smaller than 32 MiB.',
    );
  const bytes = Buffer.from(input.base64, 'base64');
  if (bytes.toString('base64').replace(/=+$/, '') !== input.base64.replace(/=+$/, ''))
    invalid('The image bytes are not valid base64.');
  if (!bytes.length || bytes.length > 32 * 1024 * 1024)
    throw new PptdError('INVALID_REQUEST', 'An imported image must be smaller than 32 MiB.');
  const detected = imageFormat(bytes);
  const format =
    detected ?? (bytes.toString('utf8', 0, 128).trimStart().startsWith('<') ? 'svg' : null);
  const webp =
    bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP';
  if (!format && !webp)
    throw new PptdError('INVALID_REQUEST', 'This file is not a supported image.');
  const extension = format === 'jpeg' ? 'jpg' : (format ?? 'webp');
  if (format === 'png') validatePng(bytes);
  if (format === 'gif' && (bytes.length < 14 || bytes.at(-1) !== 0x3b)) invalid();
  if (format === 'jpeg' && (bytes.length < 4 || bytes.at(-2) !== 0xff || bytes.at(-1) !== 0xd9))
    invalid();
  let dimensions =
    format === 'svg'
      ? svgDimensions(bytes)
      : format
        ? imageDimensions(bytes, format)
        : webpDimensions(bytes);
  if (!dimensions) invalid('The image dimensions could not be read.');
  if (format === 'jpeg' && [5, 6, 7, 8].includes(jpegOrientation(bytes)))
    dimensions = { width: dimensions.height, height: dimensions.width };
  const revision = hashBytes(bytes);
  const relativePath = `media/imported/${revision.slice(7)}.${extension}`;
  const destination = await resolveProjectPath(root, relativePath);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  try {
    const existing = await fs.readFile(destination);
    if (hashBytes(existing) !== revision)
      throw new PptdError(
        'INVALID_DOCUMENT',
        'An imported image with this hash has changed on disk.',
      );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    const temporary = `${destination}.${randomUUID()}.tmp`;
    try {
      const file = await fs.open(temporary, 'wx');
      try {
        await file.writeFile(bytes);
        await file.sync();
      } finally {
        await file.close();
      }
      try {
        await fs.link(temporary, destination);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
        if (hashBytes(await fs.readFile(destination)) !== revision)
          throw new PptdError(
            'INVALID_DOCUMENT',
            'An imported image with this hash has changed on disk.',
          );
      }
    } finally {
      await fs.rm(temporary, { force: true });
    }
  }
  return {
    path: relativePath,
    name: path.basename(input.name.replace(/\\/g, '/')),
    revision,
    width: dimensions.width,
    height: dimensions.height,
  };
}
