import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { options, reportError, resolveRuntime } from './runtime.mjs';

let client;
try {
  const values = options();
  if (values.help) {
    process.stdout.write(
      'Usage: node doctor.mjs [--entry <absolute.pptd>] [--cli <huandeng.js>] [--install-dir <Editor directory>] [--url <loopback-origin>] [--runtime-dir <absolute>]\nReads the actual stdio MCP service, guides and deck identity. Does not edit the project or install a client.\n',
    );
  } else {
    const runtime = await resolveRuntime(values);
    const require = createRequire(runtime.cli);
    const { Client } = await import(
      pathToFileURL(require.resolve('@modelcontextprotocol/sdk/client/index.js')).href
    );
    const { StdioClientTransport } = await import(
      pathToFileURL(require.resolve('@modelcontextprotocol/sdk/client/stdio.js')).href
    );
    client = new Client({ name: 'HUANDENG Plugin doctor', version: '0.16.0' });
    const transport = new StdioClientTransport({
      command: runtime.node,
      args: [runtime.launcher],
      env: runtime.env,
      stderr: 'pipe',
    });
    transport.stderr?.resume();
    await client.connect(transport, { timeout: 20000 });
    const tools = await client.listTools({}, { timeout: 10000 });
    const resources = await client.listResources({}, { timeout: 10000 });
    const guide = await client.readResource({ uri: 'huandeng://guide/story' }, { timeout: 10000 });
    const result = await client.callTool({ name: 'huandeng_context', arguments: {} }, undefined, {
      timeout: 10000,
    });
    if (result.isError)
      throw new Error(
        result.content.find((item) => item.type === 'text')?.text ?? 'Document connection failed.',
      );
    const context = JSON.parse(result.content.find((item) => item.type === 'text')?.text ?? '{}');
    const required = [
      'huandeng_context',
      'huandeng_story_briefing',
      'huandeng_preview',
      'huandeng_apply',
      'huandeng_render',
    ];
    const missing = required.filter((name) => !tools.tools.some((tool) => tool.name === name));
    if (
      missing.length ||
      !guide.contents.some(
        (item) => typeof item.text === 'string' && item.text.includes('previewHash'),
      )
    )
      throw new Error(
        `The runtime does not provide the v0.9 Story workflow. Missing: ${missing.join(', ') || 'Story guide'}. Update/reopen HUANDENG.`,
      );
    process.stdout.write(
      `${JSON.stringify(
        {
          ok: true,
          connection: 'local-stdio-mcp',
          protocolVerified: true,
          modelTaskVerified: false,
          server: client.getServerVersion(),
          toolCount: tools.tools.length,
          operationReviewSupported: tools.tools.some((tool) => tool.name === 'huandeng_review'),
          guides: resources.resources.map((resource) => resource.uri),
          deck: {
            deckId: context.deckId,
            title: context.title,
            pageCount: context.pages.length,
            writable: context.writable,
          },
          next: 'The bridge is ready. Load the same plugin/fragment in the intended agent client and perform a scoped task to verify that client.',
        },
        null,
        2,
      )}\n`,
    );
  }
} catch (error) {
  reportError(error);
} finally {
  await client?.close();
}
