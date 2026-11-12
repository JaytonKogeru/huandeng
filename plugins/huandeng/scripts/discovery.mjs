import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

const execute = promisify(execFile);
const maximumRecordBytes = 262144;
const maximumSessions = 64;

export function stateRoot(
  environment = process.env,
  home = os.homedir(),
  platform = process.platform,
) {
  const root =
    environment.HUANDENG_RUNTIME_DIR ??
    path.join(
      environment.LOCALAPPDATA ??
        (platform === 'win32'
          ? path.join(home, 'AppData', 'Local')
          : path.join(home, '.local', 'state')),
      'Huandeng',
    );
  if (!path.isAbsolute(root)) throw new Error('HUANDENG_RUNTIME_DIR must be absolute.');
  return root;
}

export function loopbackOrigin(value) {
  const parsed = new URL(value);
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
  return parsed.origin;
}

async function smallJson(file) {
  const stat = await fs.stat(file);
  if (!stat.isFile() || stat.size > maximumRecordBytes)
    throw new Error('Invalid discovery record.');
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

export async function installationAt(value) {
  if (!value || !path.isAbsolute(value))
    throw new Error('The Editor installation path must be absolute.');
  const stat = await fs.stat(value);
  const directory = stat.isFile() ? path.dirname(value) : value;
  for (const app of [
    path.join(directory, 'resources', 'app'),
    path.join(directory, 'Contents', 'Resources', 'app'),
    directory,
  ]) {
    try {
      const release = await smallJson(path.join(app, 'release.json'));
      if (
        typeof release.version !== 'string' ||
        !/^\d+\.\d+\.\d+(?:[-+].*)?$/.test(release.version)
      )
        continue;
      const cli = path.join(app, 'node_modules', '@open-slide', 'core', 'huandeng.js');
      for (const file of [cli, path.join(path.dirname(cli), 'dist', 'huandeng', 'bin.js')]) {
        if (!(await fs.stat(file)).isFile()) throw new Error('Incomplete HUANDENG installation.');
      }
      return {
        cli: await fs.realpath(cli),
        application: await fs.realpath(app),
        version: release.version,
      };
    } catch {}
  }
  throw new Error('No complete HUANDENG Editor installation at the selected path.');
}

async function runningEditors(platform) {
  if (platform !== 'win32') return [];
  try {
    const { stdout } = await execute(
      'powershell.exe',
      [
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        "[Console]::OutputEncoding=[System.Text.UTF8Encoding]::new(); @(Get-Process -Name 'HUANDENG Editor' -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Path -Unique) | ConvertTo-Json -Compress",
      ],
      { windowsHide: true, timeout: 4000, maxBuffer: 262144, encoding: 'utf8' },
    );
    const value = JSON.parse(stdout.trim() || '[]');
    return (Array.isArray(value) ? value : [value]).filter((item) => typeof item === 'string');
  } catch {
    return [];
  }
}

function standardLocations(environment, platform, home) {
  if (platform === 'win32')
    return [
      environment.LOCALAPPDATA &&
        path.join(environment.LOCALAPPDATA, 'Programs', 'HUANDENG Editor'),
      environment.ProgramFiles && path.join(environment.ProgramFiles, 'HUANDENG Editor'),
    ].filter(Boolean);
  if (platform === 'darwin')
    return [
      '/Applications/HUANDENG Editor.app',
      path.join(home, 'Applications', 'HUANDENG Editor.app'),
    ];
  return [path.join(home, '.local', 'share', 'huandeng'), '/opt/huandeng', '/opt/HUANDENG Editor'];
}

async function validInstallations(candidates) {
  const found = new Map();
  for (const candidate of candidates) {
    try {
      const installation = await installationAt(candidate);
      found.set(installation.cli, installation);
    } catch {}
  }
  return [...found.values()];
}

export async function discoverInstallation(environment = process.env, settings = {}) {
  const platform = settings.platform ?? process.platform;
  const home = settings.home ?? os.homedir();
  const running = await validInstallations(settings.running ?? (await runningEditors(platform)));
  if (running.length > 1)
    throw new Error(
      'Several HUANDENG Editor installations are running. Choose --install-dir or HUANDENG_CLI.',
    );
  if (running.length === 1) return { ...running[0], discoveredBy: 'running-editor' };
  try {
    const record = await smallJson(path.join(stateRoot(environment, home), 'agent-runtime.json'));
    if (record.schemaVersion === 1)
      return { ...(await installationAt(record.application)), discoveredBy: 'registered-editor' };
  } catch {}
  const installed = await validInstallations(
    settings.locations ?? standardLocations(environment, platform, home),
  );
  if (installed.length > 1)
    throw new Error(
      'Several HUANDENG Editor installations were found. Choose --install-dir or HUANDENG_CLI.',
    );
  if (installed.length === 1) return { ...installed[0], discoveredBy: 'standard-installation' };
  throw new Error(
    'No local HUANDENG Editor runtime was found. Open the Editor or pass --install-dir / HUANDENG_INSTALL_DIR / --cli.',
  );
}

function samePath(a, b, platform) {
  return platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b;
}

export async function discoverSessions(environment = process.env, settings = {}) {
  const directory = path.join(stateRoot(environment, settings.home), 'sessions');
  let files;
  try {
    files = (await fs.readdir(directory)).filter((name) => name.endsWith('.json')).sort();
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
  if (files.length > maximumSessions)
    throw new Error(
      'Session discovery is bounded to 64 records. Pass --entry for the intended Project.',
    );
  const found = new Map();
  const inspect = async (name) => {
    try {
      const record = await smallJson(path.join(directory, name));
      if (
        typeof record.entry !== 'string' ||
        !path.isAbsolute(record.entry) ||
        !record.entry.toLowerCase().endsWith('.pptd')
      )
        return;
      const entry = await fs.realpath(record.entry);
      const url = loopbackOrigin(record.url);
      if (record.protocol !== 2 || typeof record.agentToken !== 'string' || !record.agentToken)
        return;
      const response = await (settings.fetch ?? fetch)(`${url}/__pptd/session`, {
        headers: { 'x-huandeng-token': record.agentToken },
        signal: AbortSignal.timeout(1200),
        redirect: 'error',
      });
      if (!response.ok) return;
      const snapshot = await response.json();
      if (snapshot.desktopProtocol !== 2 || typeof snapshot.entry !== 'string') return;
      const actual = await fs.realpath(snapshot.entry);
      if (!samePath(entry, actual, settings.platform ?? process.platform)) return;
      if (record.epoch && snapshot.epoch && record.epoch !== snapshot.epoch) return;
      found.set((settings.platform ?? process.platform) === 'win32' ? entry.toLowerCase() : entry, {
        entry,
        url,
        ...(typeof snapshot.epoch === 'string' ? { epoch: snapshot.epoch } : {}),
        title: typeof snapshot.title === 'string' ? snapshot.title : path.basename(entry),
        writable: snapshot.writable === true,
      });
    } catch {
      // Stale/offline/invalid records do not establish an active Project.
    }
  };
  for (let offset = 0; offset < files.length; offset += 8)
    await Promise.all(files.slice(offset, offset + 8).map(inspect));
  return [...found.values()].sort((a, b) => a.entry.localeCompare(b.entry));
}
