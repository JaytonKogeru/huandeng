import { createRecipe, RECIPE_NAMES, type RecipeName, type RecipeOverrideGroup } from './recipes';
import { type DeckSnapshot, PptdError, type PptdOperation, type TransactionRequest } from './types';

function record(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new PptdError('INVALID_REQUEST', `${field} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new PptdError('INVALID_REQUEST', `${field} must be a non-empty string.`);
  }
  return value;
}

function strings(value: unknown, field: string): Record<string, string> {
  if (value === undefined) return {};
  const result: Record<string, string> = {};
  for (const [key, item] of Object.entries(record(value, field))) {
    if (typeof item !== 'string')
      throw new PptdError('INVALID_REQUEST', `${field}.${key} must be a string.`);
    result[key] = item;
  }
  return result;
}

export function prepareRecipeTx(snapshot: DeckSnapshot, input: unknown): TransactionRequest {
  const body = record(input, 'recipe request');
  const action = body.action;
  if (action !== 'create' && action !== 'apply' && action !== 'reset') {
    throw new PptdError('INVALID_REQUEST', 'Recipe action must be create, apply or reset.');
  }
  const deckId = requiredString(body.deckId, 'deckId');
  if (deckId !== snapshot.deckId)
    throw new PptdError('TARGET_NOT_FOUND', 'This recipe request belongs to another deck.');
  const pageRef = requiredString(body.pageId, 'pageId');
  const pages = snapshot.pages.filter(
    (page) =>
      page.state === 'active' &&
      (page.pageId === pageRef || page.shortCode?.toLowerCase() === pageRef.toLowerCase()),
  );
  if (pages.length !== 1)
    throw new PptdError(
      pages.length ? 'AMBIGUOUS_ID' : 'TARGET_NOT_FOUND',
      `Cannot resolve page ${pageRef}.`,
    );
  const page = pages[0];
  const instanceId = requiredString(body.instanceId, 'instanceId');
  if (
    !/^[A-Za-z0-9_-]{1,80}$/.test(instanceId) ||
    ['__proto__', 'prototype', 'constructor'].includes(instanceId)
  ) {
    throw new PptdError(
      'INVALID_REQUEST',
      'Recipe instanceId must contain 1–80 letters, digits, underscores or hyphens.',
    );
  }
  if (!snapshot.writable) throw new PptdError('READ_ONLY', 'This deck is not currently writable.');
  if (!body.expected || typeof body.expected !== 'object')
    throw new PptdError(
      'MISSING_PRECONDITION',
      'Recipe commands require page, manifest and metadata revisions.',
    );
  const expected = record(body.expected, 'expected');
  const expectedPages =
    expected.pages === undefined ? {} : record(expected.pages, 'expected.pages');
  if (
    !Object.hasOwn(expectedPages, page.pageId) ||
    !Object.hasOwn(expected, 'manifest') ||
    !Object.hasOwn(expected, 'metadata')
  ) {
    throw new PptdError(
      'MISSING_PRECONDITION',
      'Recipe commands require the canonical page revision, manifest revision and metadata revision.',
    );
  }
  if (
    expectedPages[page.pageId] !== page.pageRevision ||
    expected.manifest !== snapshot.manifestRevision ||
    expected.metadata !== snapshot.metadataRevision
  ) {
    throw new PptdError(
      'REVISION_CONFLICT',
      'The page, layout dimensions or recipe metadata changed; refresh before retrying.',
      {
        current: {
          pages: { [page.pageId]: page.pageRevision },
          manifest: snapshot.manifestRevision,
          metadata: snapshot.metadataRevision,
        },
      },
    );
  }
  const params = body.params === undefined ? undefined : record(body.params, 'params');
  const operations: PptdOperation[] = [];
  if (action === 'create') {
    if (body.reset !== undefined)
      throw new PptdError('INVALID_REQUEST', 'Create cannot reset another recipe.');
    const recipe = requiredString(body.recipe, 'recipe');
    if (!(RECIPE_NAMES as readonly string[]).includes(recipe))
      throw new PptdError('INVALID_REQUEST', `Unknown recipe ${recipe}.`);
    if (Object.hasOwn(page.metadata.components ?? {}, instanceId))
      throw new PptdError(
        'INVALID_REQUEST',
        'That recipe instance already exists; use apply to update its layout.',
      );
    const created = createRecipe({
      recipe: recipe as RecipeName,
      instanceId,
      pageId: page.pageId,
      size: snapshot.size,
      assets: strings(body.assets, 'assets'),
      texts: strings(body.texts, 'texts'),
      params,
      existingElementIds: page.data.elements.map((element) => element.elementId),
    });
    for (const element of created.elements)
      operations.push({ op: 'element.add', pageId: page.pageId, element });
    operations.push({
      op: 'metadata.patch',
      pageId: page.pageId,
      set: {
        [`components.${instanceId}`]: created.binding,
        ...Object.fromEntries(
          Object.entries(created.elementRoles).map(([elementId, role]) => [
            `elementRoles.${elementId}`,
            role,
          ]),
        ),
      },
    });
  } else {
    if (body.recipe !== undefined || body.assets !== undefined || body.texts !== undefined) {
      throw new PptdError(
        'INVALID_REQUEST',
        'Layout updates cannot replace recipe identity, scientific text or original assets.',
      );
    }
    if (!Object.hasOwn(page.metadata.components ?? {}, instanceId))
      throw new PptdError('TARGET_NOT_FOUND', `Recipe instance ${instanceId} does not exist.`);
    if (action === 'apply') {
      if (body.reset !== undefined)
        throw new PptdError(
          'INVALID_REQUEST',
          'Apply preserves manual overrides; use the explicit reset action to reset them.',
        );
      operations.push({ op: 'recipe.apply', pageId: page.pageId, instanceId, params });
    } else {
      const reset = body.reset === undefined ? {} : record(body.reset, 'reset');
      for (const key of Object.keys(reset))
        if (key !== 'slots' && key !== 'groups')
          throw new PptdError('INVALID_REQUEST', `Unknown reset field ${key}.`);
      const slots = reset.slots;
      const groups = reset.groups;
      if (
        slots !== undefined &&
        (!Array.isArray(slots) || !slots.every((slot) => typeof slot === 'string'))
      )
        throw new PptdError('INVALID_REQUEST', 'Reset slots must be a list of slot names.');
      if (
        groups !== undefined &&
        (!Array.isArray(groups) ||
          !groups.every((group) =>
            ['geometry', 'crop', 'font', 'appearance'].includes(String(group)),
          ))
      )
        throw new PptdError(
          'INVALID_REQUEST',
          'Reset only accepts geometry, crop, font and appearance groups.',
        );
      operations.push({
        op: 'recipe.reset',
        pageId: page.pageId,
        instanceId,
        params,
        reset: {
          slots: slots as string[] | undefined,
          groups: groups as RecipeOverrideGroup[] | undefined,
        },
      });
    }
  }
  return {
    requestId: requiredString(body.requestId, 'requestId'),
    actor: requiredString(body.actor, 'actor'),
    ...(body.originClientId === undefined
      ? {}
      : { originClientId: requiredString(body.originClientId, 'originClientId') }),
    deckId,
    expected: {
      pages: { [page.pageId]: page.pageRevision },
      manifest: snapshot.manifestRevision,
      metadata: snapshot.metadataRevision,
    },
    operations,
  };
}
