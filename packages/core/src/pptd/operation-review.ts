import { isDeepStrictEqual } from 'node:util';
import { isRecord, parseManifest } from './codec';
import { parseMetadata } from './identity';
import { type HistoryRecord, hashBytes } from './persistence';
import type {
  OperationReviewChange,
  PageVersionSnapshot,
  ProjectMetadata,
  Revision,
} from './types';
import { PptdError } from './types';

/** Only exact hash matches count as evidence, including when the matching bytes are current. */
export function recordedSource(
  records: HistoryRecord[],
  revision: Revision | null,
  role: 'page' | 'metadata' | 'manifest',
  current: string | null | undefined,
  pageId?: string,
): string | undefined {
  if (revision === null) return undefined;
  if (current !== undefined && current !== null && hashBytes(current) === revision) return current;
  for (const record of records) {
    for (const file of record.files) {
      if (file.role !== role || (role === 'page' && file.pageId !== pageId)) continue;
      for (const source of [file.before, file.after]) {
        if (source !== null && hashBytes(source) === revision) return source;
      }
    }
  }
  return undefined;
}

export function reviewMetadata(
  records: HistoryRecord[],
  revision: Revision | null,
  current: string | null,
): ProjectMetadata {
  const source = recordedSource(records, revision, 'metadata', current);
  if (source === undefined)
    throw new PptdError(
      'HISTORY_UNAVAILABLE',
      'The recorded operation metadata cannot be reconstructed.',
    );
  return parseMetadata(source);
}

export function affectedReviewPages(
  record: HistoryRecord,
  before: ProjectMetadata,
  after: ProjectMetadata,
): string[] {
  const ids = new Set([
    ...record.changedPages,
    ...record.changedElements.map((element) => element.pageId),
    ...record.files.flatMap((file) => (file.pageId ? [file.pageId] : [])),
    ...Object.keys(record.pagePositions ?? {}),
  ]);
  for (const id of new Set([...Object.keys(before.slides), ...Object.keys(after.slides)])) {
    if (!isDeepStrictEqual(before.slides[id], after.slides[id])) ids.add(id);
  }
  return [...ids];
}

function changedFields(before: unknown, after: unknown, prefix = ''): string[] {
  if (isDeepStrictEqual(before, after)) return [];
  if (isRecord(before) && isRecord(after)) {
    return [...new Set([...Object.keys(before), ...Object.keys(after)])].flatMap((key) =>
      changedFields(before[key], after[key], prefix ? `${prefix}.${key}` : key),
    );
  }
  return [prefix];
}

export function operationChanges(
  record: HistoryRecord,
  before: PageVersionSnapshot | null,
  after: PageVersionSnapshot | null,
  metadataBefore: ProjectMetadata,
  metadataAfter: ProjectMetadata,
): { changes: OperationReviewChange[]; truncated: boolean } {
  const changes: OperationReviewChange[] = [];
  if (!isDeepStrictEqual(metadataBefore.project, metadataAfter.project))
    changes.push({ kind: 'changed', label: 'Project Story / structure', fields: ['project'] });
  if (before || after) {
    const fields: string[] = [];
    if (!before || !after) fields.push('page');
    else {
      const { elements: _beforeElements, ...beforePage } = before.page.data;
      const { elements: _afterElements, ...afterPage } = after.page.data;
      fields.push(...changedFields(beforePage, afterPage));
      for (const key of new Set([
        ...Object.keys(before.page.metadata),
        ...Object.keys(after.page.metadata),
      ])) {
        if (!isDeepStrictEqual(before.page.metadata[key], after.page.metadata[key]))
          fields.push(`metadata.${key}`);
      }
      if (!isDeepStrictEqual(before.theme, after.theme)) fields.push('theme');
      if (!isDeepStrictEqual(before.size, after.size)) fields.push('size');
      if (before.page.mainPosition !== after.page.mainPosition) fields.push('mainPosition');
      const beforeOrder = before.page.data.elements.map((element) => element.elementId);
      const afterOrder = after.page.data.elements.map((element) => element.elementId);
      if (!isDeepStrictEqual(beforeOrder, afterOrder)) fields.push('elementOrder');
    }
    if (fields.length)
      changes.push({
        kind: !before ? 'added' : !after ? 'removed' : 'changed',
        label: 'Page',
        fields,
      });
    const old = new Map(
      before?.page.data.elements.map((element) => [element.elementId, element]) ?? [],
    );
    const next = new Map(
      after?.page.data.elements.map((element) => [element.elementId, element]) ?? [],
    );
    for (const elementId of new Set([...old.keys(), ...next.keys()])) {
      const left = old.get(elementId);
      const right = next.get(elementId);
      if (isDeepStrictEqual(left, right)) continue;
      changes.push({
        kind: !left ? 'added' : !right ? 'removed' : 'changed',
        elementId,
        label: elementId,
        fields:
          left && right
            ? changedFields(left, right)
            : Object.keys(right ?? left ?? {}).filter((key) => key !== 'elementId'),
      });
    }
  }
  // Manifest-only operations may have no page source changes to display.
  if (!before && !after) {
    const manifest = record.files.find((file) => file.role === 'manifest');
    if (manifest?.before && manifest.after) {
      const fields = changedFields(
        parseManifest(manifest.before).value,
        parseManifest(manifest.after).value,
      );
      if (fields.length) changes.push({ kind: 'changed', label: 'Project / Main order', fields });
    }
  }
  return { changes: changes.slice(0, 100), truncated: changes.length > 100 };
}
