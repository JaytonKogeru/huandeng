#!/usr/bin/env node
import fs from 'node:fs/promises';
import { Command } from 'commander';
import { connectClient } from './client.ts';
import { launchHuandeng } from './launch.ts';
import { startMcp } from './mcp.ts';
import { openPptdStore } from './store.ts';
import type { TransactionRequest } from './types.ts';

const program = new Command('huandeng')
  .description('HUANDENG Editor — one document for people and external agents')
  .option('--url <url>', 'connect to an active local editor')
  .option('--entry <path>', 'find the active editor for this PPTD file');
const print = (value: unknown): void => {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
};
const client = () => connectClient(program.opts());

program
  .command('open <entry>')
  .description('Open a PPTD document in a local visual editor')
  .option('--port <port>', 'loopback port', '4850')
  .option('--read-only', 'inspect without initializing identities or writing source files')
  .option('--no-browser', 'keep the server running without opening a browser')
  .action(async (entry, options) => {
    const port = Number(options.port);
    if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid port.');
    await launchHuandeng(entry, { ...options, port });
  });
program
  .command('check <entry>')
  .description('Parse a PPTD without changing files')
  .action(async (entry) => {
    const store = await openPptdStore({ entryPath: entry, readOnly: true });
    try {
      const snapshot = store.getSnapshot();
      const elementTypes: Record<string, number> = {};
      for (const page of snapshot.pages)
        for (const element of page.data.elements)
          elementTypes[element.elementType] = (elementTypes[element.elementType] ?? 0) + 1;
      print({
        pageCount: snapshot.pages.length,
        size: snapshot.size,
        identityPersisted: snapshot.identityPersisted,
        writable: snapshot.writable,
        elementTypes,
        diagnostics: snapshot.diagnostics,
      });
    } finally {
      await store.close();
    }
  });
program
  .command('inspect [pageId]')
  .description('Read stable IDs, content, revisions and design intent')
  .action(async (pageId) => {
    const connection = await client();
    print(
      pageId
        ? await connection.request(`/pages/${encodeURIComponent(pageId)}`)
        : await connection.session(),
    );
  });
program
  .command('apply <transaction>')
  .description('Apply a JSON transaction file with expected revisions')
  .action(async (file) => {
    const request: TransactionRequest = JSON.parse(await fs.readFile(file, 'utf8'));
    print(await (await client()).apply(request));
  });
program
  .command('history [pageId] [versionId]')
  .description('Read document operations, page versions, or a historical page snapshot')
  .action(async (pageId, versionId) =>
    print(
      await (await client()).request(
        pageId
          ? `/pages/${encodeURIComponent(pageId)}/versions${versionId ? `/${encodeURIComponent(versionId)}` : ''}`
          : '/history',
      ),
    ),
  );
program
  .command('project')
  .description('Read the project file tree')
  .action(async () => print(await (await client()).request('/project')));
program
  .command('story <pageId> <intentFile>')
  .alias('frame')
  .description('Record agent intent from JSON, with requestId and expectedMetadataRevision')
  .action(async (pageId, intentFile) => {
    const intent = JSON.parse(await fs.readFile(intentFile, 'utf8'));
    print(await (await client()).request('/story', { ...intent, pageId }));
  });
program
  .command('restore <pageId> <versionId> <requestFile>')
  .description('Restore a page version; JSON supplies requestId and current expected revisions')
  .action(async (pageId, versionId, requestFile) => {
    const request = JSON.parse(await fs.readFile(requestFile, 'utf8'));
    print(
      await (await client()).request(`/pages/${encodeURIComponent(pageId)}/restore`, {
        ...request,
        versionId,
      }),
    );
  });
program
  .command('revert <operationId>')
  .description('Undo an operation if its post-revisions still match')
  .action(async (operationId) =>
    print(await (await client()).request('/undo', { operationId, actor: 'cli' })),
  );
program
  .command('selection')
  .description('Read the current visual selection')
  .action(async () => print(await (await client()).request('/selection')));
program
  .command('render [pageId]')
  .description('Render a frozen committed page to PNG')
  .action(async (pageId) => print(await (await client()).request('/render', { pageId })));
program
  .command('export <format>')
  .description('Export the committed deck as PDF or editable PPTX')
  .action(async (format) => print(await (await client()).request('/export', { format })));
program
  .command('checkpoint <message>')
  .description('Commit only known deck files from a clean Git baseline')
  .action(async (message) => print(await (await client()).request('/checkpoint', { message })));
program
  .command('mcp')
  .description('Serve HUANDENG Plugin tools over stdio, attached to the active writer')
  .action(async () => {
    await startMcp(await client());
  });

program.parseAsync(process.argv).catch((error: unknown) => {
  const issue = error as Error & { code?: string; details?: unknown };
  process.stderr.write(
    `${JSON.stringify({
      code: issue.code ?? 'HUANDENG_ERROR',
      message: issue.message,
      details: issue.details,
    })}\n`,
  );
  process.exitCode = 1;
});
