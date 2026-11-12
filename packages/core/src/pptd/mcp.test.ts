import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import huandengPluginManifest from '../../../../plugins/huandeng/plugin.json';
import { HuandengClient } from './client';
import { createMcpServer } from './mcp';

const close: (() => Promise<void>)[] = [];
afterEach(async () => {
  await Promise.allSettled(close.splice(0).map((cleanup) => cleanup()));
  vi.restoreAllMocks();
});

async function connection() {
  const writer = new HuandengClient('http://127.0.0.1:4850');
  const request = vi.spyOn(writer, 'request').mockResolvedValue({ ok: true });
  const server = createMcpServer(writer);
  const client = new Client({ name: 'huandeng-test', version: '1.0.0' });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  close.push(
    () => client.close(),
    () => server.close(),
  );
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  return { client, request };
}

describe('HUANDENG MCP project and Story context', () => {
  it('identifies the canonical plugin release during initialization', async () => {
    const { client, request } = await connection();
    expect(client.getServerVersion()).toEqual({
      name: 'HUANDENG Plugin',
      version: huandengPluginManifest.version,
    });
    expect(request).not.toHaveBeenCalled();
  });

  it('exposes exact operation review as a read-only Project-scoped tool', async () => {
    const { client, request } = await connection();
    const { tools } = await client.listTools();
    expect(tools.find((tool) => tool.name === 'huandeng_review')).toMatchObject({
      annotations: { readOnlyHint: true },
    });
    await client.callTool({
      name: 'huandeng_review',
      arguments: { operationId: 'saved-op', pageId: 'stable-page' },
    });
    expect(request).toHaveBeenLastCalledWith('/reviews/saved-op?pageId=stable-page');
  });
  it('routes design audit as a read-only call with explicit optional rules', async () => {
    const { client, request } = await connection();
    await client.callTool({
      name: 'huandeng_design_audit',
      arguments: {
        language: 'zh-CN',
        requireSectionDividers: true,
        expectedBackground: '#FFFFFF',
      },
    });
    expect(request).toHaveBeenLastCalledWith(
      '/design-audit?language=zh-CN&requireSectionDividers=true&expectedBackground=%23FFFFFF',
    );
  });
  it('exposes explicit task activity without turning it into a slide mutation', async () => {
    const { client, request } = await connection();
    await client.callTool({ name: 'huandeng_activity_read', arguments: {} });
    expect(request).toHaveBeenLastCalledWith('/activity');
    const args = {
      deckId: 'selected-project',
      requestId: 'stage-one',
      taskId: 'review',
      sessionId: 'chat-a',
      actor: 'Assistant',
      status: 'running',
      summary: 'Checking figures.',
    };
    await client.callTool({ name: 'huandeng_activity_report', arguments: args });
    expect(request).toHaveBeenLastCalledWith('/activity', args);
  });

  it('advertises bounded agent identity and phases on the existing activity tool', async () => {
    const { client, request } = await connection();
    const { tools } = await client.listTools();
    const properties = tools.find((tool) => tool.name === 'huandeng_activity_report')?.inputSchema
      .properties;
    expect(properties?.phase).toMatchObject({
      enum: ['audit', 'spec', 'implement', 'validate', 'release'],
    });
    expect(properties?.agentFamily).toMatchObject({
      enum: expect.arrayContaining(['chatgpt', 'claude', 'deepseek', 'hermes', 'other']),
    });
    expect(tools).toHaveLength(24);
    const args = {
      deckId: 'selected-project',
      requestId: 'phase',
      taskId: 'review',
      sessionId: 'chat-a',
      actor: 'ChatGPT',
      status: 'running',
      summary: 'Reviewing the selected page.',
      agentFamily: 'chatgpt',
      phase: 'validate',
    };
    request.mockResolvedValueOnce({ deckId: 'selected-project' });
    request.mockResolvedValueOnce({
      ...args,
      agentFamily: undefined,
      phase: undefined,
      source: 'client',
    });
    const result = await client.callTool({ name: 'huandeng_activity_report', arguments: args });
    expect(request).toHaveBeenLastCalledWith('/activity', {
      deckId: args.deckId,
      requestId: args.requestId,
      taskId: args.taskId,
      sessionId: args.sessionId,
      actor: args.actor,
      status: args.status,
      summary: args.summary,
    });
    expect(result).toMatchObject({
      content: [{ type: 'text', text: expect.stringContaining('omittedFields') }],
    });
  });

  it('passes declared phases to a capable writer and rejects malformed phases before transport', async () => {
    const { client, request } = await connection();
    const args = {
      deckId: 'selected-project',
      requestId: 'phase',
      taskId: 'review',
      sessionId: 'chat-a',
      actor: 'Claude',
      status: 'running',
      summary: 'Reviewing the selected page.',
      agentFamily: 'claude',
      phase: 'spec',
    };
    request.mockResolvedValueOnce({
      deckId: 'selected-project',
      reportCapabilities: { agentFamily: true, phase: true },
    });
    request.mockResolvedValueOnce(args);
    await client.callTool({ name: 'huandeng_activity_report', arguments: args });
    expect(request).toHaveBeenLastCalledWith('/activity', args);
    request.mockClear();
    const invalid = await client.callTool({
      name: 'huandeng_activity_report',
      arguments: { ...args, phase: 'thinking' },
    });
    expect(invalid).toMatchObject({ isError: true });
    expect(request).not.toHaveBeenCalled();
  });

  it('advertises the three context tools as read-only alongside the compatible writer tools', async () => {
    const { client } = await connection();
    const { tools } = await client.listTools();
    expect(tools).toHaveLength(24);
    for (const name of [
      'huandeng_story_briefing',
      'huandeng_presentation_read',
      'huandeng_assets_list',
      'huandeng_design_audit',
      'huandeng_export_status',
      'huandeng_preview',
    ]) {
      expect(tools.find((tool) => tool.name === name)).toMatchObject({
        annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
      });
    }
    expect(tools.some((tool) => tool.name.startsWith('huanding_'))).toBe(false);
    expect(tools.find((tool) => tool.name === 'huandeng_apply')).toMatchObject({
      annotations: { readOnlyHint: false, idempotentHint: true },
    });
  });

  it('exposes portable Story resources and preserves direct and hash-bound apply routes', async () => {
    const { client, request } = await connection();
    const { resources } = await client.listResources();
    expect(resources.map((resource) => resource.uri)).toEqual([
      'huandeng://guide/story',
      'huandeng://guide/operations',
    ]);
    const guide = await client.readResource({ uri: 'huandeng://guide/story' });
    expect(guide.contents[0]).toMatchObject({
      mimeType: 'text/markdown',
      text: expect.stringContaining('previewHash'),
    });
    expect(guide.contents[0]).toMatchObject({ text: expect.stringContaining('huandeng_review') });
    const operations = await client.readResource({ uri: 'huandeng://guide/operations' });
    expect(operations.contents[0]).toMatchObject({
      text: expect.stringContaining('"crop.left":0.25'),
    });
    expect(operations.contents[0]).toMatchObject({
      text: expect.stringContaining('"fit.mode":"contain"'),
    });
    expect(request).not.toHaveBeenCalled();
    const transaction = {
      requestId: 'proposal',
      deckId: 'deck',
      actor: 'client',
      expected: {},
      operations: [],
    };
    await client.callTool({ name: 'huandeng_preview', arguments: { transaction } });
    expect(request).toHaveBeenLastCalledWith('/proposals/preview', { transaction });
    await client.callTool({
      name: 'huandeng_apply',
      arguments: { transaction, previewHash: 'sha256:example' },
    });
    expect(request).toHaveBeenLastCalledWith('/proposals/apply', {
      transaction,
      previewHash: 'sha256:example',
    });
    await client.callTool({ name: 'huandeng_apply', arguments: { transaction } });
    expect(request).toHaveBeenLastCalledWith('/transactions', transaction);
  });

  it('routes video start, status and cancellation through the shared service', async () => {
    const { client, request } = await connection();
    const args = {
      format: 'mp4',
      presentationId: 'talk',
      occurrenceId: 'talk:return:agenda',
      fps: 24,
      endHoldMs: 1000,
      cueHoldMs: 500,
    };
    await client.callTool({ name: 'huandeng_export', arguments: args });
    expect(request).toHaveBeenLastCalledWith('/video', args);
    await client.callTool({ name: 'huandeng_export_status', arguments: { jobId: 'job/id' } });
    expect(request).toHaveBeenLastCalledWith('/exports/job%2Fid/status');
    await client.callTool({ name: 'huandeng_export_cancel', arguments: { jobId: 'job/id' } });
    expect(request).toHaveBeenLastCalledWith('/video/cancel', { jobId: 'job/id' });
    await client.callTool({ name: 'huandeng_export', arguments: { format: 'pptx' } });
    expect(request).toHaveBeenLastCalledWith('/export', { format: 'pptx' });
  });

  it('advertises bound asset acquisition without arbitrary browser or filesystem input', async () => {
    const { client } = await connection();
    const { tools } = await client.listTools();
    const capture = tools.find((tool) => tool.name === 'huandeng_editor_capture');
    expect(capture).toMatchObject({
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
      inputSchema: { required: ['deckId'], additionalProperties: false },
    });
    expect(capture?.inputSchema.properties).not.toHaveProperty('url');
    expect(capture?.inputSchema.properties).not.toHaveProperty('script');
    expect(capture?.inputSchema.properties).not.toHaveProperty('path');
    expect(capture?.inputSchema.properties).toHaveProperty(
      'dialog',
      expect.objectContaining({ enum: ['none', 'export'] }),
    );
    expect(capture?.inputSchema.properties).toHaveProperty('historyVersionId');
    expect(capture?.inputSchema.properties).toHaveProperty('reviewOperationId');
    expect(tools.find((tool) => tool.name === 'huandeng_asset_import')).toMatchObject({
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
      inputSchema: { required: ['deckId', 'name'], additionalProperties: false },
    });
  });

  it('routes scoped Story, resolved presentations and paginated assets to the active writer', async () => {
    const { client, request } = await connection();
    await client.callTool({
      name: 'huandeng_story_briefing',
      arguments: { pageId: 'S18A', presentationId: 'talk', occurrenceId: 'talk:return:agenda' },
    });
    expect(request).toHaveBeenLastCalledWith(
      '/story-briefing?pageId=S18A&presentationId=talk&occurrenceId=talk%3Areturn%3Aagenda',
    );
    await client.callTool({
      name: 'huandeng_presentation_read',
      arguments: { presentationId: 'talk' },
    });
    expect(request).toHaveBeenLastCalledWith('/presentations/talk');
    await client.callTool({
      name: 'huandeng_assets_list',
      arguments: { query: 'original gel', filter: 'missing', offset: 100, limit: 50 },
    });
    expect(request).toHaveBeenLastCalledWith(
      '/assets?query=original+gel&filter=missing&offset=100&limit=50',
    );
    await client.callTool({ name: 'huanding_story_briefing', arguments: {} });
    expect(request).toHaveBeenLastCalledWith('/story-briefing');
  });

  it('returns ambiguity candidates without performing a write or silently selecting a position', async () => {
    const { client, request } = await connection();
    const details = {
      occurrences: [
        { occurrenceId: 'talk:opening:agenda' },
        { occurrenceId: 'talk:return:agenda' },
      ],
    };
    request.mockRejectedValueOnce(
      Object.assign(new Error('Choose an occurrence.'), { code: 'AMBIGUOUS_ID', details }),
    );
    const result = await client.callTool({
      name: 'huandeng_story_briefing',
      arguments: { pageId: 'S18A', presentationId: 'talk' },
    });
    expect(result).toMatchObject({
      isError: true,
      content: [
        {
          type: 'text',
          text: JSON.stringify({ code: 'AMBIGUOUS_ID', message: 'Choose an occurrence.', details }),
        },
      ],
    });
    expect(request).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledWith('/story-briefing?pageId=S18A&presentationId=talk');
  });
});
