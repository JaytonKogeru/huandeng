import { spawn } from 'node:child_process';
import { reportError, resolveRuntime } from './runtime.mjs';

try {
  const runtime = await resolveRuntime();
  const args = [runtime.cli, '--entry', runtime.entry];
  if (runtime.env.HUANDENG_URL) args.push('--url', runtime.env.HUANDENG_URL);
  args.push('mcp');
  const child = spawn(runtime.node, args, {
    stdio: 'inherit',
    windowsHide: true,
    env: { ...process.env, ...runtime.env },
  });
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
  child.once('error', (error) => {
    process.stderr.write(`HUANDENG MCP: ${error.message}\n`);
    process.exitCode = 1;
  });
  child.once('exit', (code) => {
    process.exitCode = code ?? 1;
  });
} catch (error) {
  reportError(error);
}
