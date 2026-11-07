import { type ChildProcess, spawn } from 'node:child_process';
import { once } from 'node:events';
import fs from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { acquireWriterLock, canonicalProjectRoot, hashBytes } from './persistence';
import { projectTestDirectory } from './project-directory.test-utils';

const temporary: string[] = [];
const children = new Set<ChildProcess>();
const leases: (() => Promise<void>)[] = [];

afterEach(async () => {
  vi.restoreAllMocks();
  for (const child of children) {
    if (child.exitCode === null && child.signalCode === null) {
      const exited = once(child, 'exit');
      child.kill('SIGKILL');
      await exited;
    }
  }
  children.clear();
  await Promise.all(leases.splice(0).map((release) => release()));
  await Promise.all(
    temporary.splice(0).map((directory) => fs.rm(directory, { recursive: true, force: true })),
  );
});

describe('writer lock compatibility and diagnostics', () => {
  it.each(['EACCES', 'EADDRINUSE'])(
    'fails closed with the OS reason when the legacy lock port reports %s',
    async (causeCode) => {
      const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'huandeng-lock-error-'));
      temporary.push(directory);
      const root = await canonicalProjectRoot(directory);
      const stateDir = path.join(directory, 'state');
      const listen = vi.spyOn(net.Server.prototype, 'listen').mockImplementationOnce(function (
        this: net.Server,
      ) {
        queueMicrotask(() =>
          this.emit('error', Object.assign(new Error(`listen ${causeCode}`), { code: causeCode })),
        );
        return this;
      });
      await expect(acquireWriterLock(root, stateDir)).rejects.toMatchObject({
        code: 'WRITER_LOCKED',
        message: expect.stringContaining(causeCode),
        details: {
          causeCode,
          reason: causeCode === 'EADDRINUSE' ? 'lock-port-in-use' : 'lock-port-unavailable',
        },
      });
      expect(listen).toHaveBeenCalledTimes(1);
      await expect(fs.access(path.join(stateDir, 'writer.json'))).rejects.toMatchObject({
        code: 'ENOENT',
      });
    },
  );

  it('refuses a legacy writer in another process and reopens after that process crashes', async () => {
    const directory = await projectTestDirectory('huandeng-lock-process-', ['']);
    temporary.push(directory);
    const root = await canonicalProjectRoot(directory);
    const port = 20000 + (Number.parseInt(hashBytes(root).slice(7, 15), 16) % 40000);
    const child = spawn(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        `import net from 'node:net';
const server = net.createServer(socket => socket.destroy());
server.listen({ host: '127.0.0.1', port: Number(process.argv[1]), exclusive: true }, () => {
  process.send({ ready: true });
});`,
        String(port),
      ],
      { stdio: ['ignore', 'ignore', 'pipe', 'ipc'], windowsHide: true },
    );
    children.add(child);
    let errorOutput = '';
    child.stderr?.on('data', (chunk) => {
      errorOutput += String(chunk);
    });
    const [message] = await Promise.race([
      once(child, 'message'),
      once(child, 'exit').then(([code]) => {
        throw new Error(`Legacy writer exited before acquiring its lock (${code}): ${errorOutput}`);
      }),
    ]);
    expect(message).toEqual({ ready: true });
    await expect(
      acquireWriterLock(root, path.join(directory, 'other-state')),
    ).rejects.toMatchObject({ code: 'WRITER_LOCKED' });
    await expect(fs.access(path.join(directory, 'other-state/writer.json'))).rejects.toMatchObject({
      code: 'ENOENT',
    });
    const exited = once(child, 'exit');
    child.kill('SIGKILL');
    await exited;
    children.delete(child);
    const release = await acquireWriterLock(root, path.join(directory, 'new-state'));
    leases.push(release);
    expect(
      JSON.parse(await fs.readFile(path.join(directory, 'new-state/writer.json'), 'utf8')),
    ).toMatchObject({
      root,
      lockPort: port,
      pid: process.pid,
    });
  });
});
