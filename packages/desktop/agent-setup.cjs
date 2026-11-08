const { execFile } = require('node:child_process');
const fs = require('node:fs/promises');
const path = require('node:path');
const { promisify } = require('node:util');

const execute = promisify(execFile);
const clients = new Set(['codex', 'claude', 'deepseek', 'chatgpt']);

async function agentConfiguration({ client, entryPath, applicationDirectory, executable }) {
  if (!clients.has(client)) throw new Error('Unsupported Agent client.');
  if (!entryPath) throw new Error('Open a PPTD project before connecting an Agent.');
  const candidates = [
    path.join(applicationDirectory, 'plugins', 'huandeng'),
    path.resolve(applicationDirectory, '..', '..', 'plugins', 'huandeng'),
  ];
  let pluginPath;
  for (const candidate of candidates) {
    if (
      await fs.access(path.join(candidate, 'scripts', 'configure.mjs')).then(
        () => true,
        () => false,
      )
    ) {
      pluginPath = candidate;
      break;
    }
  }
  if (!pluginPath) throw new Error('The HUANDENG Plugin is missing from this installation.');
  const cli = path.join(applicationDirectory, 'node_modules', '@open-slide', 'core', 'huandeng.js');
  await fs.access(cli);
  const environment = { ...process.env, ELECTRON_RUN_AS_NODE: '1' };
  delete environment.HUANDENG_URL;
  const { stdout } = await execute(
    executable,
    [
      path.join(pluginPath, 'scripts', 'configure.mjs'),
      '--client',
      client,
      '--entry',
      entryPath,
      '--cli',
      cli,
    ],
    {
      cwd: path.dirname(entryPath),
      env: environment,
      windowsHide: true,
      timeout: 10000,
      maxBuffer: 1024 * 1024,
      encoding: 'utf8',
    },
  );
  return { client, entryPath, pluginPath, configuration: stdout.trim() };
}

module.exports = { agentConfiguration };
