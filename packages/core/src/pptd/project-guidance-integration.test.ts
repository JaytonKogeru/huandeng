import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HuandengClient } from './client';
import { createMcpServer } from './mcp';
import { hashBytes } from './persistence';
import { projectTestDirectory } from './project-directory.test-utils';
import { PROJECT_GUIDANCE_MAX_BYTES } from './project-guidance';
import type { StoryBriefing } from './project-insights';
import { createPptdStaticServer } from './static-server';
import type {
  DeckSnapshot,
  TransactionPreview,
  TransactionRequest,
  TransactionResult,
} from './types';

const directories: string[] = [];
const close: (() => Promise<void>)[] = [];
afterEach(async () => {
  for (const cleanup of close.splice(0).reverse()) await cleanup();
  vi.unstubAllEnvs();
  await Promise.all(
    directories.splice(0).map((directory) => fs.rm(directory, { recursive: true, force: true })),
  );
});

async function fixture() {
  const directory = await projectTestDirectory('huandeng-guidance-service-');
  directories.push(directory);
  const root = path.join(directory, 'project');
  const clientRoot = path.join(directory, 'client');
  await fs.mkdir(path.join(root, 'pages'), { recursive: true });
  await fs.mkdir(clientRoot);
  await fs.writeFile(
    path.join(root, 'deck.pptd'),
    'title: Synthetic guidance\nsize: [960, 540]\npages: [pages/a.page]\n',
  );
  await fs.writeFile(path.join(root, 'pages/a.page'), 'elements: []\nnotes: Original\n');
  await fs.writeFile(path.join(root, 'AGENTS.md'), '# Authoring\nKeep evidence readable.\n');
  await fs.writeFile(
    path.join(clientRoot, 'huandeng.html'),
    '<!doctype html><title>Service fixture</title>',
  );
  vi.stubEnv('HUANDENG_DECK', path.join(root, 'deck.pptd'));
  vi.stubEnv('HUANDENG_READ_ONLY', '0');
  vi.stubEnv('HUANDENG_RUNTIME_DIR', path.join(directory, 'runtime'));
  const http = await createPptdStaticServer({ clientRoot, port: 0 });
  close.push(() => http.close());
  const writer = new HuandengClient(http.url);
  const session = await writer.session();
  const server = createMcpServer(writer);
  const client = new Client({ name: 'guidance-test', version: '1.0.0' });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  close.push(
    () => server.close(),
    () => client.close(),
  );
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  async function tool<T>(name: string, args: Record<string, unknown> = {}): Promise<T> {
    const response = await client.callTool({ name, arguments: args });
    expect(response.isError).not.toBe(true);
    const content = response.content as { type: string; text?: string }[];
    const text = content.find((item) => item.type === 'text')?.text;
    if (!text) throw new Error('Tool response must include JSON text.');
    return JSON.parse(text) as T;
  }
  return { root, writer, session, tool };
}

describe('Project guidance through the real service and MCP', () => {
  it('automatically exposes fresh guidance in context, Story and preview without changing the write contract', async () => {
    const { root, writer, session, tool } = await fixture();
    const expected = session.projectGuidance;
    expect(expected).toMatchObject({
      status: 'available',
      sourcePath: 'AGENTS.md',
      role: 'authoring-context',
      truncated: false,
    });
    const context = await tool<DeckSnapshot>('huandeng_context');
    expect(context.projectGuidance).toEqual(expected);
    const briefing = await tool<StoryBriefing>('huandeng_story_briefing');
    expect(briefing.projectGuidance).toEqual(expected);
    const page = session.pages[0];
    const transaction: TransactionRequest = {
      requestId: randomUUID(),
      deckId: session.deckId,
      actor: 'guidance-integration',
      expected: { pages: { [page.pageId]: page.pageRevision } },
      operations: [{ op: 'page.notes.set', pageId: page.pageId, text: 'Authorized notes' }],
    };
    const preview = await tool<TransactionPreview>('huandeng_preview', { transaction });
    expect(preview.projectGuidance).toEqual(expected);
    const updated = '# Authoring\nGive the main figure enough room.\n';
    await fs.writeFile(path.join(root, 'AGENTS.md'), updated);
    const fresh = await tool<DeckSnapshot>('huandeng_context');
    expect(fresh.projectGuidance).toMatchObject({ text: updated, revision: hashBytes(updated) });
    expect(fresh.manifestRevision).toBe(session.manifestRevision);
    expect(fresh.metadataRevision).toBe(session.metadataRevision);
    expect((await writer.session()).pages[0].pageRevision).toBe(page.pageRevision);
    expect(await writer.request('/history')).toEqual([]);
    const refreshed = await tool<TransactionPreview>('huandeng_preview', { transaction });
    expect(refreshed.projectGuidance).toEqual(fresh.projectGuidance);
    expect(refreshed.previewHash).toBe(preview.previewHash);
    const result = await tool<TransactionResult>('huandeng_apply', {
      transaction,
      previewHash: preview.previewHash,
    });
    expect(result.ok).toBe(true);
    expect(
      await tool<TransactionResult>('huandeng_apply', {
        transaction,
        previewHash: preview.previewHash,
      }),
    ).toEqual(result);
    expect(await fs.readFile(path.join(root, 'AGENTS.md'), 'utf8')).toBe(updated);
    expect(await writer.request('/history')).toHaveLength(1);
    await fs.unlink(path.join(root, 'AGENTS.md'));
    expect((await tool<StoryBriefing>('huandeng_story_briefing')).projectGuidance).toMatchObject({
      status: 'missing',
      revision: null,
      text: '',
    });
    await fs.writeFile(
      path.join(root, 'AGENTS.md'),
      Buffer.alloc(PROJECT_GUIDANCE_MAX_BYTES + 1, 65),
    );
    const unavailable = await writer.session();
    expect(unavailable.writable).toBe(true);
    expect(unavailable.projectGuidance).toMatchObject({
      status: 'unavailable',
      reason: 'file-too-large',
      text: '',
      truncated: true,
    });
    expect(unavailable.diagnostics.some((item) => item.severity === 'error')).toBe(false);
    expect(
      await writer.apply({
        ...transaction,
        requestId: randomUUID(),
        expected: { pages: { [page.pageId]: unavailable.pages[0].pageRevision } },
        operations: [
          { op: 'page.notes.set', pageId: page.pageId, text: 'Legacy client remains compatible' },
        ],
      }),
    ).toMatchObject({ ok: true });
  }, 20_000);
});
