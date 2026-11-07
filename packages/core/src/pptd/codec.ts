import { isDeepStrictEqual } from 'node:util';
import type { Document, Node, YAMLMap, YAMLSeq } from 'yaml';
import { isAlias, isMap, isScalar, isSeq, parseDocument, stringify, visit } from 'yaml';
import { type PptdElement, PptdError, type PptdManifest, type PptdPage } from './types';

export interface SourceDocument<T> {
  source: string;
  document: Document;
  value: T;
  newline: '\n' | '\r\n';
}
type SourcePath = (string | number)[];
type SequenceEntry = { index: number } | { value: unknown };
const forbiddenKeys = new Set(['__proto__', 'prototype', 'constructor']);

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function parseSource<T = Record<string, unknown>>(source: string): SourceDocument<T> {
  const document = parseDocument(source, { keepSourceTokens: true, uniqueKeys: true });
  if (document.errors.length) {
    throw new PptdError(
      'INVALID_DOCUMENT',
      document.errors.map((error) => error.message).join('; '),
    );
  }
  let value: T;
  try {
    value = document.toJS({ maxAliasCount: 100 }) as T;
  } catch (error) {
    throw new PptdError('INVALID_DOCUMENT', String(error));
  }
  return { source, document, value, newline: source.includes('\r\n') ? '\r\n' : '\n' };
}

export function parseManifest(source: string): SourceDocument<PptdManifest> {
  const parsed = parseSource<PptdManifest>(source);
  if (
    !isRecord(parsed.value) ||
    !Array.isArray(parsed.value.pages) ||
    !parsed.value.pages.every((page) => typeof page === 'string' && page.length > 0)
  ) {
    throw new PptdError('INVALID_DOCUMENT', 'The PPTD manifest must contain relative page paths.');
  }
  if (new Set(parsed.value.pages).size !== parsed.value.pages.length) {
    throw new PptdError('INVALID_DOCUMENT', 'The manifest references a page more than once.');
  }
  if (
    parsed.value.size !== undefined &&
    (!Array.isArray(parsed.value.size) ||
      parsed.value.size.length !== 2 ||
      !parsed.value.size.every((n) => typeof n === 'number' && Number.isFinite(n) && n > 0))
  ) {
    throw new PptdError('INVALID_DOCUMENT', 'Manifest size needs two positive finite numbers.');
  }
  return parsed;
}

export function validateElement(element: unknown): asserts element is PptdElement {
  if (
    !isRecord(element) ||
    typeof element.elementId !== 'string' ||
    !element.elementId ||
    typeof element.elementType !== 'string' ||
    !element.elementType
  ) {
    throw new PptdError('INVALID_DOCUMENT', 'Each element needs an elementId and elementType.');
  }
  if (
    element.bounds !== undefined &&
    (!Array.isArray(element.bounds) ||
      element.bounds.length !== 4 ||
      !element.bounds.every((n) => typeof n === 'number' && Number.isFinite(n)) ||
      element.bounds[2] < 0 ||
      element.bounds[3] < 0)
  ) {
    throw new PptdError('INVALID_DOCUMENT', `Invalid bounds on ${element.elementId}.`);
  }
  if (
    element.rotation !== undefined &&
    (typeof element.rotation !== 'number' || !Number.isFinite(element.rotation))
  ) {
    throw new PptdError('INVALID_DOCUMENT', `Invalid rotation on ${element.elementId}.`);
  }
}

export function validatePage(page: unknown): asserts page is PptdPage {
  if (!isRecord(page) || !Array.isArray(page.elements)) {
    throw new PptdError('INVALID_DOCUMENT', 'A PPTD page needs an elements array.');
  }
  const ids = new Set<string>();
  for (const element of page.elements) {
    validateElement(element);
    if (ids.has(element.elementId))
      throw new PptdError('AMBIGUOUS_ID', `Duplicate elementId ${element.elementId}.`);
    ids.add(element.elementId);
  }
  if (page.notes !== undefined && typeof page.notes !== 'string') {
    throw new PptdError('INVALID_DOCUMENT', 'Page notes must be text.');
  }
}

export function parsePage(source: string): SourceDocument<PptdPage> {
  const parsed = parseSource<PptdPage>(source);
  validatePage(parsed.value);
  return parsed;
}

export function parseFieldPath(path: string): SourcePath {
  const parts = path.split('.');
  if (!parts.length || parts.some((part) => !part || forbiddenKeys.has(part))) {
    throw new PptdError('INVALID_REQUEST', `Unsafe or empty field path: ${path}`);
  }
  return parts.map((part) => (/^(0|[1-9][0-9]*)$/.test(part) ? Number(part) : part));
}

export function assertJsonValue(value: unknown): void {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
  if (typeof value === 'number' && Number.isFinite(value)) return;
  if (Array.isArray(value)) {
    for (const item of value) assertJsonValue(item);
    return;
  }
  if (isRecord(value) && Object.getPrototypeOf(value) === Object.prototype) {
    for (const [key, item] of Object.entries(value)) {
      if (forbiddenKeys.has(key)) throw new PptdError('INVALID_REQUEST', `Unsafe field: ${key}`);
      assertJsonValue(item);
    }
    return;
  }
  throw new PptdError('INVALID_REQUEST', 'Commands must contain finite JSON values.');
}

function assertEditable(document: Document): void {
  visit(document, {
    Node(_key, node) {
      if (isAlias(node) || ('anchor' in node && node.anchor) || ('tag' in node && node.tag)) {
        throw new PptdError(
          'UNSUPPORTED_SOURCE_EDIT',
          'Aliases, anchors, merge keys and explicit tags require manual source editing.',
        );
      }
    },
    Pair(_key, pair) {
      if (isScalar(pair.key) && pair.key.value === '<<')
        throw new PptdError(
          'UNSUPPORTED_SOURCE_EDIT',
          'YAML merge keys require manual source editing.',
        );
    },
  });
}

function nodeAt(document: Document, path: SourcePath): Node | undefined {
  let node: unknown = document.contents;
  for (const key of path) {
    if (isMap(node) || isSeq(node)) node = node.get(key, true);
    else return undefined;
  }
  return node && typeof node === 'object' ? (node as Node) : undefined;
}

function valueAt(value: unknown, path: SourcePath): unknown {
  let current = value;
  for (const key of path) {
    if (!isRecord(current) && !Array.isArray(current)) return undefined;
    current = (current as Record<string | number, unknown>)[key];
  }
  return current;
}

export function setValueAtPath(
  target: Record<string, unknown>,
  path: SourcePath,
  value: unknown,
): void {
  if (!path.length) throw new PptdError('INVALID_REQUEST', 'Cannot replace the root document.');
  let current: Record<string | number, unknown> = target;
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i];
    let child = current[key];
    if (child === undefined || child === null) child = current[key] = {};
    if (!isRecord(child) && !Array.isArray(child))
      throw new PptdError(
        'INVALID_REQUEST',
        `Cannot descend into ${path.slice(0, i + 1).join('.')}.`,
      );
    current = child as Record<string | number, unknown>;
  }
  const key = path[path.length - 1];
  if (Array.isArray(current) && (typeof key !== 'number' || key >= current.length))
    throw new PptdError('INVALID_REQUEST', 'Array patches must target an existing item.');
  current[key] = structuredClone(value);
}

export function unsetValueAtPath(target: Record<string, unknown>, path: SourcePath): void {
  const parent = valueAt(target, path.slice(0, -1));
  if (parent === undefined || parent === null) return;
  if (!isRecord(parent))
    throw new PptdError('INVALID_REQUEST', 'Only mapping fields can be removed.');
  delete parent[path[path.length - 1]];
}

function splice(source: string, start: number, end: number, replacement: string): string {
  return source.slice(0, start) + replacement + source.slice(end);
}

function replaceNode(parsed: SourceDocument<unknown>, node: Node, value: unknown): string {
  if (!node.range) throw new PptdError('UNSUPPORTED_SOURCE_EDIT', 'Missing YAML source range.');
  const [start, end] = node.range;
  const suffix = /\r?\n$/.test(parsed.source.slice(start, end)) ? parsed.newline : '';
  return splice(parsed.source, start, end, JSON.stringify(value) + suffix);
}

function insertMapField(
  parsed: SourceDocument<unknown>,
  map: YAMLMap,
  key: string,
  value: unknown,
): string {
  if (!map.range)
    throw new PptdError('UNSUPPORTED_SOURCE_EDIT', 'Missing YAML mapping source range.');
  const encoded = `${JSON.stringify(key)}: ${JSON.stringify(value)}`;
  if (map.flow) {
    const end = map.range[1] - 1;
    if (parsed.source[end] !== '}')
      throw new PptdError('UNSUPPORTED_SOURCE_EDIT', 'Unexpected flow mapping boundary.');
    return splice(parsed.source, end, end, `${map.items.length ? ', ' : ''}${encoded}`);
  }
  const firstKey = map.items[0]?.key;
  if (!isScalar(firstKey) || !firstKey.range)
    throw new PptdError('UNSUPPORTED_SOURCE_EDIT', 'Missing mapping indentation.');
  const lineStart = parsed.source.lastIndexOf('\n', firstKey.range[0] - 1) + 1;
  const indent = parsed.source.slice(lineStart, firstKey.range[0]).replace(/^\uFEFF/, '').length;
  const end = map.range[1];
  const prefix = parsed.source[end - 1] === '\n' ? '' : parsed.newline;
  return splice(
    parsed.source,
    end,
    end,
    `${prefix}${' '.repeat(indent)}${encoded}${parsed.newline}`,
  );
}

function changeSourceField(
  source: string,
  path: SourcePath,
  value: unknown,
  remove: boolean,
): string {
  const parsed = parseSource<Record<string, unknown>>(source);
  assertEditable(parsed.document);
  if (!isRecord(parsed.value)) throw new PptdError('INVALID_DOCUMENT', 'Expected a YAML mapping.');
  const oldValue = valueAt(parsed.value, path);
  if (remove ? oldValue === undefined : isDeepStrictEqual(oldValue, value)) return source;
  const expected = structuredClone(parsed.value);
  if (remove) unsetValueAtPath(expected, path);
  else {
    assertJsonValue(value);
    setValueAtPath(expected, path, value);
  }
  let candidate: string;
  const node = nodeAt(parsed.document, path);
  if (remove) {
    const parent = nodeAt(parsed.document, path.slice(0, -1));
    if (!isMap(parent))
      throw new PptdError('INVALID_REQUEST', 'Only mapping fields can be removed.');
    const pair = parent.items.find(
      (item) => isScalar(item.key) && item.key.value === path[path.length - 1],
    );
    if (!pair || !isScalar(pair.key) || !pair.key.range || !node?.range)
      throw new PptdError('UNSUPPORTED_SOURCE_EDIT', 'Cannot isolate this YAML field.');
    if (parent.items.length === 1) candidate = replaceNode(parsed, parent, {});
    else {
      const start = source.lastIndexOf('\n', pair.key.range[0] - 1) + 1;
      if (parent.flow || !/^ *$/.test(source.slice(start, pair.key.range[0])))
        throw new PptdError(
          'UNSUPPORTED_SOURCE_EDIT',
          'Cannot remove this inline YAML field safely.',
        );
      candidate = splice(source, start, node.range[2], '');
    }
  } else if (node) candidate = replaceNode(parsed, node, value);
  else {
    let parentPath = path.slice(0, -1);
    let parent = nodeAt(parsed.document, parentPath);
    while (!parent && parentPath.length) {
      parentPath = parentPath.slice(0, -1);
      parent = nodeAt(parsed.document, parentPath);
    }
    if (isMap(parent)) {
      const key = path[parentPath.length];
      if (typeof key !== 'string')
        throw new PptdError('INVALID_REQUEST', 'Cannot create array items with a field patch.');
      candidate = insertMapField(parsed, parent, key, valueAt(expected, [...parentPath, key]));
    } else if (parent && valueAt(parsed.value, parentPath) === null)
      candidate = replaceNode(parsed, parent, valueAt(expected, parentPath));
    else throw new PptdError('UNSUPPORTED_SOURCE_EDIT', 'Cannot isolate the parent YAML mapping.');
  }
  if (!isDeepStrictEqual(parseSource(candidate).value, expected))
    throw new PptdError(
      'UNSUPPORTED_SOURCE_EDIT',
      'The source edit would change unrelated values.',
    );
  return candidate;
}

export function assertIndependentFields(set: Record<string, unknown>, unset: string[] = []): void {
  const paths = [...Object.keys(set), ...unset];
  for (let i = 0; i < paths.length; i++)
    for (let j = i + 1; j < paths.length; j++) {
      if (
        paths[i] === paths[j] ||
        paths[i].startsWith(`${paths[j]}.`) ||
        paths[j].startsWith(`${paths[i]}.`)
      )
        throw new PptdError(
          'INVALID_REQUEST',
          'A field patch cannot contain overlapping set/unset paths.',
        );
    }
}

export function patchSourceFields(
  source: string,
  prefix: SourcePath,
  set: Record<string, unknown>,
  unset: string[] = [],
): string {
  assertIndependentFields(set, unset);
  let next = source;
  for (const [path, value] of Object.entries(set))
    next = changeSourceField(next, [...prefix, ...parseFieldPath(path)], value, false);
  for (const path of unset)
    next = changeSourceField(next, [...prefix, ...parseFieldPath(path)], undefined, true);
  return next;
}

function blockSequenceStarts(source: string, seq: YAMLSeq): number[] {
  const token = seq.srcToken;
  if (token?.type !== 'block-seq')
    throw new PptdError('UNSUPPORTED_SOURCE_EDIT', 'Missing YAML sequence tokens.');
  return token.items.map((item) => {
    const dash = item.start.find((part) => part.type === 'seq-item-ind');
    if (!dash) throw new PptdError('UNSUPPORTED_SOURCE_EDIT', 'Cannot isolate a sequence item.');
    const start = source.lastIndexOf('\n', dash.offset - 1) + 1;
    if (!/^ *$/.test(source.slice(start, dash.offset)))
      throw new PptdError(
        'UNSUPPORTED_SOURCE_EDIT',
        'Nested inline sequence edits are not supported.',
      );
    return start;
  });
}

export function editSourceSequence(
  source: string,
  path: SourcePath,
  entries: SequenceEntry[],
): string {
  const parsed = parseSource<Record<string, unknown>>(source);
  assertEditable(parsed.document);
  const seq = nodeAt(parsed.document, path);
  const previous = valueAt(parsed.value, path);
  if (!isSeq(seq) || !seq.range || !Array.isArray(previous))
    throw new PptdError('INVALID_DOCUMENT', `Expected a sequence at ${path.join('.')}.`);
  const nextValues = entries.map((entry) => {
    if ('value' in entry) {
      assertJsonValue(entry.value);
      return entry.value;
    }
    if (!Number.isInteger(entry.index) || entry.index < 0 || entry.index >= previous.length)
      throw new PptdError('INVALID_REQUEST', 'Invalid sequence index.');
    return previous[entry.index];
  });
  if (isDeepStrictEqual(previous, nextValues)) return source;
  if (seq.flow) {
    visit(seq, {
      Node(_key, node) {
        if (node.comment || node.commentBefore)
          throw new PptdError(
            'UNSUPPORTED_SOURCE_EDIT',
            'A structural edit of this commented flow sequence cannot preserve all comments.',
          );
      },
    });
  }
  if (seq.flow || seq.items.length === 0 || nextValues.length === 0)
    return changeSourceField(source, path, nextValues, false);
  const starts = blockSequenceStarts(source, seq);
  const indent = seq.srcToken?.type === 'block-seq' ? seq.srcToken.indent : 0;
  const end = seq.range[1];
  const slices = starts.map((start, i) => source.slice(start, starts[i + 1] ?? end));
  const parts = entries.map((entry) => {
    if ('index' in entry) {
      const part = slices[entry.index];
      return part.endsWith('\n') ? part : part + parsed.newline;
    }
    return (
      stringify([entry.value], { lineWidth: 0 })
        .trimEnd()
        .split('\n')
        .map((line) => ' '.repeat(indent) + line)
        .join(parsed.newline) + parsed.newline
    );
  });
  const candidate = splice(source, starts[0], end, parts.join(''));
  const expected = structuredClone(parsed.value);
  setValueAtPath(expected, path, nextValues);
  if (!isDeepStrictEqual(parseSource(candidate).value, expected))
    throw new PptdError(
      'UNSUPPORTED_SOURCE_EDIT',
      'The sequence edit would change unrelated values.',
    );
  return candidate;
}

export function patchPageElement(
  source: string,
  elementId: string,
  set: Record<string, unknown>,
  unset: string[] = [],
): string {
  for (const path of [...Object.keys(set), ...unset])
    if (['elementId', 'elementType'].includes(String(parseFieldPath(path)[0])))
      throw new PptdError('INVALID_REQUEST', 'Element identity and type cannot be patched.');
  const page = parsePage(source).value;
  const index = page.elements.findIndex((element) => element.elementId === elementId);
  if (index < 0) throw new PptdError('TARGET_NOT_FOUND', `Element ${elementId} does not exist.`);
  const candidate = patchSourceFields(source, ['elements', index], set, unset);
  parsePage(candidate);
  return candidate;
}

export function setPageNotes(source: string, text: string): string {
  return patchSourceFields(source, [], { notes: text });
}

export function setManifestPages(source: string, pages: string[]): string {
  const previous = parseManifest(source).value.pages;
  const candidate = editSourceSequence(
    source,
    ['pages'],
    pages.map((page) => {
      const index = previous.indexOf(page);
      return index < 0 ? { value: page } : { index };
    }),
  );
  parseManifest(candidate);
  return candidate;
}

export function serializePage(page: PptdPage, newline = '\n'): string {
  validatePage(page);
  assertJsonValue(page);
  return stringify(page, { lineWidth: 0 }).replace(/\n/g, newline);
}
