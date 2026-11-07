import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from '@modelcontextprotocol/sdk/types.js';
import type { HuandengClient } from './client.ts';
import { canonicalToolName } from './tool-names.ts';
import type { TransactionRequest } from './types.ts';

const pageProperty = {
  pageId: { type: 'string', description: 'Stable page UUID or visible short code.' },
};
const objectSchema = (properties: Record<string, object>, required: string[] = []) => ({
  type: 'object' as const,
  properties,
  required,
  additionalProperties: false,
});
const read = { readOnlyHint: true, destructiveHint: false, openWorldHint: false };
const tools: Tool[] = [
  {
    name: 'huandeng_context',
    description:
      'Read deck identity, ordered page identities, revisions, sources and author design intent. Use stable IDs rather than positions or titles.',
    inputSchema: objectSchema({}),
    annotations: read,
  },
  {
    name: 'huandeng_page_read',
    description: 'Read one committed PPTD page, object IDs, editable fields and current revision.',
    inputSchema: objectSchema(pageProperty, ['pageId']),
    annotations: read,
  },
  {
    name: 'huandeng_selection_read',
    description: 'Read the current human selection without modifying the document.',
    inputSchema: objectSchema({}),
    annotations: read,
  },
  {
    name: 'huandeng_apply',
    description:
      'Apply a focused transaction through the same writer as the editor. Include requestId, deckId, actor, expected revisions and operations. Reuse requestId only for an identical retry. Preserve source figures, author intent and untouched layout.',
    inputSchema: objectSchema(
      {
        transaction: {
          type: 'object',
          properties: {
            requestId: { type: 'string' },
            deckId: { type: 'string' },
            actor: { type: 'string' },
            expected: { type: 'object' },
            operations: { type: 'array', items: { type: 'object' } },
          },
          required: ['requestId', 'deckId', 'actor', 'expected', 'operations'],
        },
      },
      ['transaction'],
    ),
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: 'huandeng_render',
    description:
      'Render the committed page for visual inspection and return a PNG. Uses original aspect ratio, not a document rewrite.',
    inputSchema: objectSchema(pageProperty, ['pageId']),
    annotations: read,
  },
  {
    name: 'huandeng_history',
    description:
      'Read document operations, or a page version timeline with pageId. Add versionId for a read-only historical preview. Historical assets use current project files.',
    inputSchema: objectSchema({ ...pageProperty, versionId: { type: 'string' } }),
    annotations: read,
  },
  {
    name: 'huandeng_revert',
    description:
      'Undo one operation only when its post-revisions still match. An intervening edit produces a conflict.',
    inputSchema: objectSchema(
      {
        operationId: { type: 'string' },
        requestId: { type: 'string' },
        actor: { type: 'string' },
      },
      ['operationId', 'requestId'],
    ),
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: 'huandeng_export',
    description:
      'Export a frozen committed deck as PDF or editable PPTX with a per-object fallback report. Updates the current export, leaving the source document unchanged.',
    inputSchema: objectSchema({ format: { type: 'string', enum: ['pdf', 'pptx'] } }, ['format']),
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  },
  {
    name: 'huandeng_project',
    description: 'Read the actual PPTD project file tree with stable page IDs and source paths.',
    inputSchema: objectSchema({}),
    annotations: read,
  },
  {
    name: 'huandeng_story_record',
    description:
      'Before editing, record your understanding of the user request in HUANDENG Story. Preserve existing constraints unless the user changed them. This is an agent summary, not human approval. Use the current metadata revision and reuse all fields identically on retries.',
    inputSchema: objectSchema(
      {
        ...pageProperty,
        requestId: { type: 'string' },
        expectedMetadataRevision: { type: ['string', 'null'] },
        actor: { type: 'string', description: 'Agent identity, e.g. codex or claude-code.' },
        source: {
          type: 'string',
          description: 'Conversation or task reference, without private credentials.',
        },
        recordedAt: {
          type: 'string',
          description: 'ISO 8601 timestamp, held unchanged on retries.',
        },
        requestedChange: { type: 'string' },
        purpose: { type: 'string' },
        keep: { type: 'array', items: { type: 'string' } },
      },
      [
        'pageId',
        'requestId',
        'expectedMetadataRevision',
        'actor',
        'source',
        'recordedAt',
        'requestedChange',
      ],
    ),
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: 'huandeng_version_restore',
    description:
      'Restore any saved version of one page as a new transaction. Preserve page identity, order and all other pages. Read current revisions first; include metadata revision if historical intent differs.',
    inputSchema: objectSchema(
      {
        ...pageProperty,
        versionId: { type: 'string' },
        requestId: { type: 'string' },
        expectedPageRevision: { type: 'string' },
        expectedMetadataRevision: { type: ['string', 'null'] },
        actor: { type: 'string' },
      },
      ['pageId', 'versionId', 'requestId', 'expectedPageRevision'],
    ),
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
];

export async function startMcp(client: HuandengClient) {
  const server = new Server(
    { name: 'HUANDENG Plugin', version: '0.2.0' },
    {
      capabilities: { tools: {} },
      instructions:
        'Work from the external user conversation; there is no editor chat. Read context and the target page, record your interpretation and preservation constraints with huandeng_story_record, then use the returned metadata revision for edits. Keep stable IDs, render results and report actual changes. Story is your summary, never fabricated human approval. Never invent scientific data.',
    },
  );
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools,
  }));
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
      const args = request.params.arguments ?? {};
      let result: unknown;
      switch (canonicalToolName(request.params.name)) {
        case 'huandeng_context': {
          const snapshot = await client.session();
          result = {
            deckId: snapshot.deckId,
            title: snapshot.title,
            size: snapshot.size,
            manifestRevision: snapshot.manifestRevision,
            metadataRevision: snapshot.metadataRevision,
            writable: snapshot.writable,
            pages: snapshot.pages.map((page, index) => ({
              position: index + 1,
              pageId: page.pageId,
              shortCode: page.shortCode,
              path: page.path,
              pageRevision: page.pageRevision,
              renderRevision: page.renderRevision,
              designIntent: page.metadata.designIntent,
              elementRoles: page.metadata.elementRoles,
              elementCount: page.data.elements.length,
            })),
            diagnostics: snapshot.diagnostics,
          };
          break;
        }
        case 'huandeng_page_read':
          result = await client.request(`/pages/${encodeURIComponent(String(args.pageId))}`);
          break;
        case 'huandeng_selection_read':
          result = await client.request('/selection');
          break;
        case 'huandeng_apply':
          result = await client.apply(args.transaction as TransactionRequest);
          break;
        case 'huandeng_history':
          if (args.versionId && !args.pageId) throw new Error('pageId is required with versionId.');
          result = await client.request(
            args.pageId
              ? `/pages/${encodeURIComponent(String(args.pageId))}/versions${args.versionId ? `/${encodeURIComponent(String(args.versionId))}` : ''}`
              : '/history',
          );
          break;
        case 'huandeng_project':
          result = await client.request('/project');
          break;
        case 'huandeng_story_record':
          result = await client.request('/story', args);
          break;
        case 'huandeng_version_restore':
          result = await client.request(
            `/pages/${encodeURIComponent(String(args.pageId))}/restore`,
            args,
          );
          break;
        case 'huandeng_revert':
          result = await client.request('/undo', { ...args, actor: args.actor ?? 'agent' });
          break;
        case 'huandeng_export':
          result = await client.request('/export', args);
          break;
        case 'huandeng_render': {
          const rendered = await client.request<{ url: string; report: unknown }>('/render', args);
          const response = await fetch(new URL(rendered.url, client.url));
          if (!response.ok) throw new Error('Could not read rendered image.');
          return {
            content: [
              {
                type: 'image' as const,
                mimeType: 'image/png',
                data: Buffer.from(await response.arrayBuffer()).toString('base64'),
              },
              { type: 'text' as const, text: JSON.stringify(rendered.report) },
            ],
          };
        }
        default:
          throw new Error('Unknown Huandeng tool.');
      }
      return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
    } catch (error) {
      const issue = error as Error & { code?: string; details?: unknown };
      return {
        isError: true,
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              code: issue.code ?? 'HUANDENG_ERROR',
              message: issue.message,
              details: issue.details,
            }),
          },
        ],
      };
    }
  });
  await server.connect(new StdioServerTransport());
  return server;
}
