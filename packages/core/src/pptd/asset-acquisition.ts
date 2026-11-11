import type { ActivitySnapshot } from './activity';
import type { HuandengClient } from './client';
import { captureEditor } from './editor-capture';
import { editorCaptureOptions } from './editor-capture-options';
import { downloadPublicImage } from './public-image';
import {
  type DeckSnapshot,
  type OperationReview,
  type PageVersionSummary,
  PptdError,
} from './types';

interface ImportedAsset {
  path: string;
  name: string;
  revision: string;
  width: number;
  height: number;
}
const captures = new WeakSet<HuandengClient>();

async function boundSnapshot(client: HuandengClient, deckId: unknown) {
  const snapshot = await client.session();
  if (deckId !== snapshot.deckId)
    throw new PptdError('INVALID_REQUEST', 'Acquisition must target the bound Project deckId.');
  if (!snapshot.writable) throw new PptdError('READ_ONLY', 'This Project is read-only.');
  return snapshot;
}

export async function acquireImage(client: HuandengClient, input: Record<string, unknown>) {
  await boundSnapshot(client, input.deckId);
  if (Object.keys(input).some((key) => !['deckId', 'name', 'base64', 'url'].includes(key)))
    throw new PptdError('INVALID_REQUEST', 'Unsupported asset acquisition option.');
  if (typeof input.name !== 'string' || !input.name.trim() || input.name.length > 180)
    throw new PptdError('INVALID_REQUEST', 'A short non-empty asset name is required.');
  const hasUrl = Object.hasOwn(input, 'url');
  const hasBytes = Object.hasOwn(input, 'base64');
  if (
    hasUrl === hasBytes ||
    (hasUrl && typeof input.url !== 'string') ||
    (hasBytes && typeof input.base64 !== 'string')
  )
    throw new PptdError(
      'INVALID_REQUEST',
      'Provide exactly one original-image URL or base64 image.',
    );
  const downloaded = hasUrl ? await downloadPublicImage(input.url as string) : undefined;
  const asset = await client.request<ImportedAsset>('/assets/import', {
    name: input.name,
    base64: downloaded ? downloaded.bytes.toString('base64') : input.base64,
  });
  return {
    ...asset,
    acquiredAt: new Date().toISOString(),
    source: downloaded
      ? {
          type: 'public-https',
          url: downloaded.sourceUrl,
          finalUrl: downloaded.finalUrl,
          redirects: downloaded.redirects,
          contentType: downloaded.contentType,
        }
      : { type: 'supplied-bytes' },
  };
}

function sameDocument(before: DeckSnapshot, after: DeckSnapshot) {
  return (
    before.deckId === after.deckId &&
    before.manifestRevision === after.manifestRevision &&
    before.metadataRevision === after.metadataRevision &&
    before.pages.length === after.pages.length &&
    before.pages.every((page) =>
      after.pages.some(
        (item) =>
          item.pageId === page.pageId &&
          item.pageRevision === page.pageRevision &&
          item.renderRevision === page.renderRevision,
      ),
    )
  );
}

export async function acquireEditorCapture(client: HuandengClient, input: Record<string, unknown>) {
  const snapshot = await boundSnapshot(client, input.deckId);
  if (captures.has(client))
    throw new PptdError('INVALID_REQUEST', 'An Editor capture is already running.');
  captures.add(client);
  try {
    const options = editorCaptureOptions(input, snapshot);
    if (options.historyVersionId) {
      const versions = await client.request<PageVersionSummary[]>(
        `/pages/${encodeURIComponent(options.pageId)}/versions`,
      );
      if (
        !versions.some(
          (version) =>
            version.versionId === options.historyVersionId && version.kind === 'checkpoint',
        )
      )
        throw new PptdError(
          'INVALID_REQUEST',
          'historyVersionId must be an existing named version of this page.',
        );
    }
    if (options.reviewOperationId) {
      const activity = await client.request<ActivitySnapshot>('/activity');
      if (
        activity.deckId !== snapshot.deckId ||
        !activity.events.some((event) =>
          event.source === 'writer'
            ? event.operationId === options.reviewOperationId
            : event.operationIds?.includes(options.reviewOperationId as string),
        )
      )
        throw new PptdError(
          'INVALID_REQUEST',
          'This receipt is not available in the bound Project Activity.',
        );
      const review = await client.request<OperationReview>(
        `/reviews/${encodeURIComponent(options.reviewOperationId)}?pageId=${encodeURIComponent(options.pageId)}`,
      );
      if (
        review.deckId !== snapshot.deckId ||
        review.operationId !== options.reviewOperationId ||
        review.pageId !== options.pageId
      )
        throw new PptdError(
          'INVALID_REQUEST',
          'The saved receipt does not match this Project and page.',
        );
    }
    const captured = await captureEditor(client.url, input, snapshot);
    if (!sameDocument(snapshot, await client.session()))
      throw new PptdError(
        'REVISION_CONFLICT',
        'The Project changed during capture. Refresh and capture again.',
      );
    const asset = await client.request<ImportedAsset>('/assets/import', {
      name: captured.state.name,
      base64: captured.bytes.toString('base64'),
    });
    return {
      ...asset,
      state: captured.state,
      source: captured.source,
      capturedAt: captured.capturedAt,
      preventedSelectionWrites: captured.preventedSelectionWrites,
    };
  } finally {
    captures.delete(client);
  }
}
