import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import {
  discoverInstallation,
  discoverSessions,
  installationAt,
  loopbackOrigin,
  stateRoot,
} from './discovery.mjs';

export const pluginRoot = fileURLToPath(new URL('../', import.meta.url));
export const runtimeOptions = {
  entry: { type: 'string' },
  cli: { type: 'string' },
  'install-dir': { type: 'string' },
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

export async function resolveCore(
  values = {},
  root = pluginRoot,
  environment = process.env,
  settings = {},
) {
  const explicitCli = values.cli ?? environment.HUANDENG_CLI;
  if (explicitCli)
    return {
      cli: await existingFile(explicitCli, 'HUANDENG_CLI / --cli'),
      discoveredBy: 'explicit-cli',
    };
  const install = values['install-dir'] ?? environment.HUANDENG_INSTALL_DIR;
  if (install) return { ...(await installationAt(install)), discoveredBy: 'explicit-installation' };
  for (const candidate of [
    path.resolve(root, '../../packages/core/huandeng.js'),
    path.resolve(root, '../../node_modules/@open-slide/core/huandeng.js'),
  ]) {
    try {
      return {
        cli: await existingFile(candidate, 'Adjacent runtime'),
        discoveredBy: 'adjacent-runtime',
      };
    } catch (error) {
      if (!['ENOENT', 'ENOTDIR'].includes(error.code)) throw error;
    }
  }
  return discoverInstallation(environment, settings);
}

export async function resolveRuntime(
  values = {},
  root = pluginRoot,
  environment = process.env,
  settings = {},
) {
  const runtimeDir = values['runtime-dir'] ?? environment.HUANDENG_RUNTIME_DIR;
  if (runtimeDir && !path.isAbsolute(runtimeDir))
    throw new Error('HUANDENG_RUNTIME_DIR / --runtime-dir must be absolute.');
  const discoveryEnvironment = {
    ...environment,
    ...(runtimeDir ? { HUANDENG_RUNTIME_DIR: runtimeDir } : {}),
  };
  let requestedEntry = values.entry ?? environment.HUANDENG_ENTRY;
  let projectSource = 'explicit-project';
  if (!requestedEntry) {
    const sessions = await discoverSessions(discoveryEnvironment, settings);
    if (!sessions.length)
      throw new Error(
        'No active HUANDENG Project was found. Open the intended .pptd in the Editor or pass --entry.',
      );
    if (sessions.length !== 1)
      throw new Error(
        'Several HUANDENG Projects are open. Run discover.mjs and choose --entry / HUANDENG_ENTRY.',
      );
    requestedEntry = sessions[0].entry;
    projectSource = 'unique-active-project';
  }
  const entry = await existingFile(requestedEntry, 'HUANDENG_ENTRY / --entry');
  if (!entry.toLowerCase().endsWith('.pptd'))
    throw new Error('Choose the .pptd project already open in HUANDENG.');
  const core = await resolveCore(values, root, discoveryEnvironment, settings);
  const env = {
    HUANDENG_ENTRY: entry,
    HUANDENG_CLI: core.cli,
    HUANDENG_RUNTIME_DIR: stateRoot(discoveryEnvironment, settings.home, settings.platform),
  };
  if (process.versions.electron || environment.ELECTRON_RUN_AS_NODE === '1')
    env.ELECTRON_RUN_AS_NODE = '1';
  const url = values.url ?? environment.HUANDENG_URL;
  if (url) env.HUANDENG_URL = loopbackOrigin(url);
  if (runtimeDir) env.HUANDENG_RUNTIME_DIR = runtimeDir;
  return {
    ...core,
    entry,
    projectSource,
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
