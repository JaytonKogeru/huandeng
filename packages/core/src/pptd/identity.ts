import { createHash, randomInt, randomUUID } from 'node:crypto';
import path from 'node:path';
import { isRecord } from './codec';
import { type CreatedPage, PptdError, type ProjectMetadata, type SlideIdentity } from './types';

export const METADATA_PATH = '.huandeng/project.json';
const alphabet = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

export function normalizeRelativePath(value: string): string {
  if (!value || value.includes('\0') || /^[A-Za-z][A-Za-z0-9+.-]*:/.test(value)) {
    throw new PptdError('PATH_OUTSIDE_PROJECT', `Invalid project path: ${value}`);
  }
  const normalized = value.replaceAll('\\', '/');
  if (normalized.startsWith('/') || normalized.split('/').includes('..')) {
    throw new PptdError('PATH_OUTSIDE_PROJECT', `Project path escapes its root: ${value}`);
  }
  const result = path.posix.normalize(normalized);
  if (result === '.' || result === '..')
    throw new PptdError('PATH_OUTSIDE_PROJECT', 'Expected a file path.');
  return result;
}

export function newShortCode(metadata: ProjectMetadata): string {
  const used = new Set(
    Object.values(metadata.slides).map((slide) => slide.shortCode?.toUpperCase()),
  );
  for (let attempt = 0; attempt < 10000; attempt++) {
    let code = '';
    for (let i = 0; i < 4; i++) code += alphabet[randomInt(alphabet.length)];
    if (!used.has(code)) return code;
  }
  throw new PptdError('INVALID_DOCUMENT', 'No free four-character page code could be allocated.');
}

export function addIdentity(metadata: ProjectMetadata, pagePath?: string): CreatedPage {
  const pageId = randomUUID();
  const shortCode = newShortCode(metadata);
  const relativePath = pagePath ? normalizeRelativePath(pagePath) : `pages/${shortCode}.page`;
  if (Object.values(metadata.slides).some((slide) => slide.path === relativePath)) {
    throw new PptdError('INVALID_DOCUMENT', `A page identity already uses ${relativePath}.`);
  }
  metadata.slides[pageId] = {
    shortCode,
    path: relativePath,
    state: 'active',
    components: {},
    elementRoles: {},
  };
  return { pageId, shortCode, path: relativePath };
}

export function createMetadata(
  entry: string,
  pages: string[],
  projectKey?: string,
): ProjectMetadata {
  const readOnly = projectKey !== undefined;
  const ephemeral = (key: string) =>
    `unpersisted:${createHash('sha256').update(key).digest('hex').slice(0, 24)}`;
  const metadata: ProjectMetadata = {
    schemaVersion: 1,
    deckId: readOnly ? ephemeral(projectKey) : randomUUID(),
    entry: normalizeRelativePath(entry),
    designPolicy: 'huandeng-human-scientific-v1',
    slides: {},
  };
  for (const pagePath of pages) {
    if (readOnly)
      metadata.slides[ephemeral(`${projectKey}/${pagePath}`)] = {
        shortCode: null,
        path: normalizeRelativePath(pagePath),
        state: 'active',
      };
    else addIdentity(metadata, pagePath);
  }
  return metadata;
}

export function parseMetadata(source: string): ProjectMetadata {
  let value: unknown;
  try {
    value = JSON.parse(source.replace(/^\uFEFF/, ''));
  } catch (error) {
    throw new PptdError('INVALID_DOCUMENT', `Invalid Huandeng metadata: ${String(error)}`);
  }
  if (
    !isRecord(value) ||
    value.schemaVersion !== 1 ||
    typeof value.deckId !== 'string' ||
    !value.deckId ||
    typeof value.entry !== 'string' ||
    !isRecord(value.slides)
  ) {
    throw new PptdError('INVALID_DOCUMENT', 'Invalid Huandeng project metadata.');
  }
  const paths = new Set<string>();
  const codes = new Set<string>();
  for (const [pageId, raw] of Object.entries(value.slides)) {
    if (
      !pageId ||
      !isRecord(raw) ||
      typeof raw.path !== 'string' ||
      (raw.state !== 'active' && raw.state !== 'tombstone') ||
      typeof raw.shortCode !== 'string' ||
      !/^[A-Za-z0-9]{4,6}$/.test(raw.shortCode)
    ) {
      throw new PptdError('INVALID_DOCUMENT', `Invalid page identity ${pageId}.`);
    }
    const pagePath = normalizeRelativePath(raw.path);
    const code = raw.shortCode.toUpperCase();
    if (paths.has(pagePath) || codes.has(code))
      throw new PptdError(
        'AMBIGUOUS_ID',
        'Page paths and codes must be unique, including removed pages.',
      );
    paths.add(pagePath);
    codes.add(code);
    raw.path = pagePath;
  }
  normalizeRelativePath(value.entry);
  return value as unknown as ProjectMetadata;
}

export function serializeMetadata(metadata: ProjectMetadata): string {
  const source = `${JSON.stringify(metadata, null, 2)}\n`;
  parseMetadata(source);
  return source;
}

export function resolvePageIdentity(
  metadata: ProjectMetadata,
  target: string,
): { pageId: string; identity: SlideIdentity } {
  if (Object.hasOwn(metadata.slides, target))
    return { pageId: target, identity: metadata.slides[target] };
  const matches = Object.entries(metadata.slides).filter(
    ([, slide]) => slide.shortCode?.toUpperCase() === target.toUpperCase(),
  );
  if (matches.length > 1) throw new PptdError('AMBIGUOUS_ID', `Ambiguous page code ${target}.`);
  if (!matches.length) throw new PptdError('TARGET_NOT_FOUND', `Page ${target} does not exist.`);
  return { pageId: matches[0][0], identity: matches[0][1] };
}
