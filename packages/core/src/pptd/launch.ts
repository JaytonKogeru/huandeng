import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { closePptdServer } from '../vite/routes/pptd.ts';
import { readSessionDiscovery } from './client.ts';
import { resolveProjectEntry } from './project-entry.cjs';
import { createPptdStaticServer } from './static-server.ts';

interface LaunchOptions {
  port?: number;
  readOnly?: boolean;
  browser?: boolean;
}

function productionEditorRoot(): { root: string | null; packaged: boolean } | null {
  let directory = path.dirname(fileURLToPath(import.meta.url));
  while (directory !== path.dirname(directory)) {
    if (existsSync(path.join(directory, 'package.json'))) {
      const clientRoot = path.join(directory, 'dist/editor');
      const manifest = JSON.parse(readFileSync(path.join(directory, 'package.json'), 'utf8'));
      return {
        root: existsSync(path.join(clientRoot, 'huandeng.html')) ? clientRoot : null,
        packaged: manifest.huandengDesktopRuntime === true,
      };
    }
    directory = path.dirname(directory);
  }
  return null;
}

function openBrowser(url: string): void {
  const command =
    process.platform === 'win32'
      ? 'rundll32.exe'
      : process.platform === 'darwin'
        ? 'open'
        : 'xdg-open';
  const args = process.platform === 'win32' ? ['url.dll,FileProtocolHandler', url] : [url];
  const child = spawn(command, args, { detached: true, stdio: 'ignore', windowsHide: true });
  child.on('error', (error) =>
    process.stderr.write(`The browser could not open HUANDENG: ${error.message}\n`),
  );
  child.unref();
}

async function createDevelopmentServer(entryPath: string, options: LaunchOptions) {
  const [{ createServer }, { createViteConfig }] = await Promise.all([
    import('vite'),
    import('../vite/config.ts'),
  ]);
  const config = await createViteConfig({
    userCwd: path.dirname(entryPath),
    config: { agent: { enabled: false } },
  });
  config.server = {
    ...config.server,
    host: '127.0.0.1',
    port: options.port ?? 4850,
    strictPort: true,
    open: false,
  };
  const server = await createServer(config);
  try {
    await server.listen();
    return server;
  } catch (error) {
    await closePptdServer(server);
    await server.close();
    throw error;
  }
}

export async function launchHuandeng(entry: string, options: LaunchOptions = {}) {
  const entryPath = await resolveProjectEntry(entry);
  process.env.HUANDENG_DECK = entryPath;
  process.env.HUANDENG_READ_ONLY = options.readOnly ? '1' : '0';
  const build = productionEditorRoot();
  const development = process.env.HUANDENG_DEV_SERVER === '1';
  if (development && build?.packaged)
    throw new Error(
      'Development mode requires a HUANDENG source checkout, not the installed runtime.',
    );
  if (!development && !build?.root)
    throw new Error(
      'The built HUANDENG editor is missing. Rebuild the source checkout or reinstall the Editor.',
    );
  const clientRoot = development ? null : build?.root;
  const server = clientRoot
    ? await createPptdStaticServer({ clientRoot, port: options.port })
    : await createDevelopmentServer(entryPath, options);
  const address = server.httpServer?.address();
  const url = `http://127.0.0.1:${address && typeof address !== 'string' ? address.port : (options.port ?? 4850)}`;
  if (options.browser !== false) {
    const discovery = await readSessionDiscovery({ entry: entryPath, url });
    const response = await fetch(`${url}/__pptd/auth/launch`, {
      method: 'POST',
      headers: { 'x-huandeng-launcher': discovery.launcherToken },
      redirect: 'error',
    });
    if (!response.ok) throw new Error('The local editor could not create a browser launch ticket.');
    const { ticket } = (await response.json()) as { ticket: string };
    openBrowser(`${url}/huandeng#huandeng-launch=${encodeURIComponent(ticket)}`);
  }
  process.stderr.write(
    `HUANDENG Editor (${clientRoot ? 'production' : 'development'})\n` +
      url +
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
      url,
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
