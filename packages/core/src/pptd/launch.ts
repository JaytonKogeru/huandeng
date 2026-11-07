import fs from 'node:fs/promises';
import path from 'node:path';
import { createServer } from 'vite';
import { createViteConfig } from '../vite/config.ts';
import { closePptdServer } from '../vite/routes/pptd.ts';

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
  try {
    await server.listen();
  } catch (error) {
    await closePptdServer(server);
    await server.close();
    throw error;
  }
  process.stderr.write(
    'HUANDENG Editor\n' +
      'http://127.0.0.1:' +
      (options.port ?? 4850) +
      '/huandeng\n' +
      entryPath +
      '\n',
  );
  let stopping = false;
  const shutdown = async () => {
    if (stopping) return;
    stopping = true;
    await closePptdServer(server);
    await server.close();
    process.exit(0);
  };
  for (const signal of ['SIGINT', 'SIGTERM'] as const)
    process.once(signal, () => {
      void shutdown();
    });
  if (process.send) {
    process.send({
      type: 'huandeng:ready',
      url: `http://127.0.0.1:${options.port ?? 4850}`,
      entry: entryPath,
    });
    process.on('message', (message: unknown) => {
      if (
        message &&
        typeof message === 'object' &&
        'type' in message &&
        message.type === 'huandeng:shutdown'
      )
        void shutdown();
    });
    process.once('disconnect', () => {
      void shutdown();
    });
  }
  return server;
}
