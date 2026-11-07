import fs from 'node:fs/promises';
import path from 'node:path';
import { createServer } from 'vite';
import { createViteConfig } from '../vite/config.ts';

export async function launchHuandeng(
  entry: string,
  options: {
    port?: number;
    readOnly?: boolean;
    browser?: boolean;
  } = {},
) {
  const entryPath = await fs.realpath(path.resolve(entry));
  process.env.HUANDENG_DECK = entryPath;
  process.env.HUANDENG_READ_ONLY = options.readOnly ? '1' : '0';
  const config = await createViteConfig({
    userCwd: path.dirname(entryPath),
    config: { agent: { enabled: false } },
  });
  config.server = {
    ...config.server,
    host: '127.0.0.1',
    port: options.port ?? 4850,
    strictPort: true,
    open: options.browser === false ? false : '/huandeng',
  };
  const server = await createServer(config);
  await server.listen();
  process.stderr.write(
    'Huandeng Editor · 幻灯编辑器\n' +
      'http://127.0.0.1:' +
      (options.port ?? 4850) +
      '/huandeng\n' +
      entryPath +
      '\n',
  );
  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.once(signal, async () => {
      await server.close();
      process.exit(0);
    });
  }
  return server;
}
