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
function queryPath(endpoint: string, options: Record<string, unknown>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(options)) {
    if (value !== undefined && value !== null) params.set(key, String(value));
  }
  return `${endpoint}${params.size ? `?${params}` : ''}`;
}

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
  .description('Read named page versions, document operations, or a historical page snapshot')
  .option('--operations', 'show granular page operations instead of named versions')
  .action(async (pageId, versionId, options) =>
    print(
      await (await client()).request(
        pageId
          ? `/pages/${encodeURIComponent(pageId)}/versions${versionId ? `/${encodeURIComponent(versionId)}` : options.operations ? '?view=operations' : ''}`
          : '/history',
      ),
    ),
  );
program
  .command('project')
  .description('Read the project file tree')
  .action(async () => print(await (await client()).request('/project')));
program
  .command('story-project')
  .description('Read Main Story, sections, and all Presentation Slides in this project')
  .action(async () => print(await (await client()).request('/project-model')));
program
  .command('presentation <id>')
  .description('Resolve one Presentation Slides, including named page versions and local notes')
  .action(async (id) =>
    print(await (await client()).request(`/presentations/${encodeURIComponent(id)}`)),
  );
program
  .command('brief [pageId]')
  .description('Read scoped Story, exact occurrence context, page usages and current revisions')
  .option('--presentation <id>', 'scope the briefing to this presentation')
  .option('--occurrence <id>', 'identify the exact repeated or pinned occurrence')
  .action(async (pageId, options) =>
    print(
      await (await client()).request(
        queryPath('/story-briefing', {
          pageId,
          presentationId: options.presentation,
          occurrenceId: options.occurrence,
        }),
      ),
    ),
  );
program
  .command('assets')
  .description('List project assets and current Main-page usages; honor hasMore and truncated')
  .option('--query <text>', 'search file paths, original image names and page labels')
  .option('--filter <kind>', 'all, used, unused or missing', 'all')
  .option('--page <id>', 'filter by stable Main page UUID')
  .option('--offset <number>', 'number of matching assets to skip', '0')
  .option('--limit <number>', 'page size from 1 to 200', '100')
  .action(async (options) =>
    print(
      await (await client()).request(
        queryPath('/assets', {
          query: options.query,
          filter: options.filter,
          pageId: options.page,
          offset: options.offset,
          limit: options.limit,
        }),
      ),
    ),
  );
program
  .command('record-version <pageId> <requestFile>')
  .description(
    'Record a named page milestone; JSON supplies label, requestId and current revisions',
  )
  .action(async (pageId, requestFile) => {
    const request = JSON.parse(await fs.readFile(requestFile, 'utf8'));
    print(
      await (await client()).request(`/pages/${encodeURIComponent(pageId)}/checkpoints`, request),
    );
  });
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
  .option('--presentation <id>', 'render from this presentation')
  .option('--occurrence <id>', 'render the exact repeated or pinned occurrence')
  .action(async (pageId, options) =>
    print(
      await (await client()).request('/render', {
        pageId,
        presentationId: options.presentation,
        occurrenceId: options.occurrence,
      }),
    ),
  );
program
  .command('export <format>')
  .description('Export the committed deck as PDF or editable PPTX')
  .option('--presentation <id>', 'export one Presentation Slides instead of Main Slides')
  .action(async (format, options) =>
    print(
      await (await client()).request('/export', { format, presentationId: options.presentation }),
    ),
  );
program
  .command('video')
  .description('Start a deterministic silent H.264 MP4 export')
  .option('--presentation <id>', 'export the saved presentation order')
  .option('--page <id>', 'export only this source page')
  .option('--occurrence <id>', 'export the exact repeated or pinned appearance')
  .option('--resolution <height>', '720 or 1080', '720')
  .option('--fps <fps>', '24 or 30', '30')
  .option('--static-ms <ms>', 'duration of each page without a timeline', '3000')
  .option('--end-hold-ms <ms>', 'hold at each animation endpoint', '1000')
  .option('--cue-hold-ms <ms>', 'extra hold at each presentation cue', '0')
  .action(async (options) =>
    print(
      await (await client()).request('/video', {
        presentationId: options.presentation,
        pageId: options.page,
        occurrenceId: options.occurrence,
        resolution: Number(options.resolution),
        fps: Number(options.fps),
        staticDurationMs: Number(options.staticMs),
        endHoldMs: Number(options.endHoldMs),
        cueHoldMs: Number(options.cueHoldMs),
      }),
    ),
  );
program
  .command('export-status <jobId>')
  .description('Read video progress and the completed artifact URL')
  .action(async (id) =>
    print(await (await client()).request(`/exports/${encodeURIComponent(id)}/status`)),
  );
program
  .command('export-cancel <jobId>')
  .description('Cancel an active video export')
  .action(async (jobId) => print(await (await client()).request('/video/cancel', { jobId })));
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
