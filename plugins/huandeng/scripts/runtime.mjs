import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

export const pluginRoot = fileURLToPath(new URL('../', import.meta.url));
export const runtimeOptions = {
  entry: { type: 'string' },
  cli: { type: 'string' },
  url: { type: 'string' },
  'runtime-dir': { type: 'string' },
  help: { type: 'boolean', short: 'h' },
};

export function options(extra = {}) {
  return parseArgs({ options: { ...runtimeOptions, ...extra }, allowPositionals: false }).values;
}

async function existingFile(value, label) {
  if (!value || !path.isAbsolute(value)) throw new Error(`${label} must be an absolute file path.`);
  if (!(await fs.stat(value)).isFile()) throw new Error(`${label} must identify a file.`);
  return fs.realpath(value);
}

export async function resolveRuntime(values = {}, root = pluginRoot, environment = process.env) {
  const entry = await existingFile(
    values.entry ?? environment.HUANDENG_ENTRY,
    'HUANDENG_ENTRY / --entry',
  );
  if (!entry.toLowerCase().endsWith('.pptd'))
    throw new Error('Choose the .pptd project already open in HUANDENG.');
  let cli = values.cli ?? environment.HUANDENG_CLI;
  if (!cli) {
    for (const candidate of [
      path.resolve(root, '../../packages/core/huandeng.js'),
      path.resolve(root, '../../node_modules/@open-slide/core/huandeng.js'),
    ]) {
      try {
        if ((await fs.stat(candidate)).isFile()) {
          cli = candidate;
          break;
        }
      } catch (error) {
        if (error.code !== 'ENOENT' && error.code !== 'ENOTDIR') throw error;
      }
    }
  }
  if (!cli)
    throw new Error(
      'HUANDENG runtime was not found beside this plugin. Set HUANDENG_CLI / --cli to the installed core huandeng.js.',
    );
  cli = await existingFile(cli, 'HUANDENG_CLI / --cli');
  const env = { HUANDENG_ENTRY: entry, HUANDENG_CLI: cli };
  if (process.versions.electron || environment.ELECTRON_RUN_AS_NODE === '1')
    env.ELECTRON_RUN_AS_NODE = '1';
  const url = values.url ?? environment.HUANDENG_URL;
  if (url) {
    const parsed = new URL(url);
    if (
      parsed.protocol !== 'http:' ||
      !['127.0.0.1', 'localhost', '[::1]'].includes(parsed.hostname) ||
      parsed.username ||
      parsed.password ||
      parsed.search ||
      parsed.hash ||
      !['', '/'].includes(parsed.pathname)
    )
      throw new Error('HUANDENG_URL / --url must be a loopback HTTP origin without credentials.');
    env.HUANDENG_URL = parsed.origin;
  }
  const runtimeDir = values['runtime-dir'] ?? environment.HUANDENG_RUNTIME_DIR;
  if (runtimeDir) {
    if (!path.isAbsolute(runtimeDir))
      throw new Error('HUANDENG_RUNTIME_DIR / --runtime-dir must be absolute.');
    env.HUANDENG_RUNTIME_DIR = runtimeDir;
  }
  return {
    entry,
    cli,
    pluginRoot: root,
    launcher: path.join(root, 'scripts/launch-mcp.mjs'),
    node: process.execPath,
    env,
  };
}

export function reportError(error) {
  process.stderr.write(
    `HUANDENG Plugin: ${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exitCode = 1;
}
