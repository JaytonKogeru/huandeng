const { execFile } = require('node:child_process');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { promisify } = require('node:util');

const execute = promisify(execFile);
const clients = new Set(['codex', 'claude', 'deepseek', 'deepseek-native', 'chatgpt']);
const manifestSections = ['dependencies', 'devDependencies', 'optionalDependencies'];

// This dialog belongs to the Desktop app. An installation in an unrelated Headless,
// TUI or archived profile must never be mistaken for a Desktop connection.
// Package manifests alone are not proof that a native plugin was installed.
async function dshProfilesWithBundle(environment = process.env, dshHome, profile = 'desktop') {
  if (!/^[\w-]+$/.test(profile)) return [];
  const home = dshHome || environment.DSH_HOME || path.join(os.homedir(), '.dsh');
  const profileRoot = path.join(home, 'profiles', profile);
  const bundleRoot = path.join(profileRoot, 'node_modules', 'huandeng');
  try {
    const manifest = JSON.parse(await fs.readFile(path.join(profileRoot, 'package.json'), 'utf8'));
    if (
      !manifestSections.some(
        (section) => manifest?.[section] && Object.hasOwn(manifest[section], 'huandeng'),
      )
    )
      return [];
    const installed = JSON.parse(await fs.readFile(path.join(bundleRoot, 'package.json'), 'utf8'));
    if (installed.name !== 'huandeng') return [];
    await Promise.all([
      fs.access(path.join(bundleRoot, 'lib', 'index.mjs')),
      fs.access(path.join(bundleRoot, 'vendor', 'skills', 'huandeng-story', 'SKILL.md')),
    ]);
    return [profile];
  } catch {
    // The bundle may be missing, partially installed or not yet registered.
    return [];
  }
}

async function deepSeekRoute({ dshHome, profile = 'desktop' } = {}) {
  const [installedProfile] = await dshProfilesWithBundle(process.env, dshHome, profile);
  return installedProfile
    ? { client: 'deepseek-native', route: 'plugin', profile: installedProfile }
    : { client: 'deepseek', route: 'direct', profile: null };
}

async function agentConfiguration({
  client,
  entryPath,
  applicationDirectory,
  executable,
  dshHome,
  dshProfile = 'desktop',
}) {
  if (!clients.has(client)) throw new Error('Unsupported Agent client.');
  if (!entryPath) throw new Error('Open a PPTD project before connecting an Agent.');
  const resolved =
    client === 'deepseek'
      ? await deepSeekRoute({ dshHome, profile: dshProfile })
      : { client, route: null };
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
      resolved.client,
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
  return {
    client: resolved.client,
    requestedClient: client,
    route: resolved.route,
    profile: resolved.profile ?? null,
    entryPath,
    pluginPath,
    configuration: stdout.trim(),
  };
}

module.exports = { agentConfiguration, dshProfilesWithBundle, deepSeekRoute };
