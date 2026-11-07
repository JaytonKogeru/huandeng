import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from '@modelcontextprotocol/sdk/types.js';
import type { HuandengClient } from './client.ts';
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
    description: 'Read revision-aware local operation history.',
    inputSchema: objectSchema({}),
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
];

export async function startMcp(client: HuandengClient) {
  const server = new Server(
    { name: 'Huandeng Plugin', version: '0.1.0' },
    {
      capabilities: { tools: {} },
      instructions:
        'Use Huandeng Frame purpose/keep fields as author constraints. Inspect a page before editing, use its stable ID and expected revision, render the result, and report actual changes. Never invent scientific data or record author approval without human feedback.',
    },
  );
  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
      const args = request.params.arguments ?? {};
      let result: unknown;
      switch (request.params.name) {
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
          result = await client.request('/history');
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
