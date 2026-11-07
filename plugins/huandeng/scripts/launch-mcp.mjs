import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

try {
  const entry = process.env.HUANDENG_ENTRY;
  if (!entry || !path.isAbsolute(entry)) {
    throw new Error(
      'Set HUANDENG_ENTRY to the absolute path of the PPTD project already open in HUANDENG.',
    );
  }
  const cli =
    process.env.HUANDENG_CLI ||
    fileURLToPath(new URL('../../../packages/core/huandeng.js', import.meta.url));
  if (!path.isAbsolute(cli))
    throw new Error('HUANDENG_CLI must be an absolute path to huandeng.js.');
  await fs.access(cli);
  const args = [cli, '--entry', entry];
  if (process.env.HUANDENG_URL) args.push('--url', process.env.HUANDENG_URL);
  args.push('mcp');
  const child = spawn(process.execPath, args, { stdio: 'inherit', windowsHide: true });
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
  child.once('error', (error) => {
    process.stderr.write(`HUANDENG MCP: ${error.message}\n`);
    process.exitCode = 1;
  });
  child.once('exit', (code) => {
    process.exitCode = code ?? 1;
  });
} catch (error) {
  process.stderr.write(`HUANDENG MCP: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
