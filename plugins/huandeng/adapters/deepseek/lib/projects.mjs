import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

export const serverNamePattern = /^[A-Za-z0-9_-]{1,32}$/;
function optionalString(value, label) {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string') throw new TypeError('huandeng: ' + label + ' must be a string.');
  return value;
}
function integer(value, fallback, minimum, maximum, label) {
  const result = value ?? fallback;
  if (!Number.isInteger(result) || result < minimum || result > maximum)
    throw new TypeError('huandeng: ' + label + ' is outside the supported range.');
  return result;
}
export function normalizeConfig(input = {}) {
  const config = { ...input };
  const entry = optionalString(config.entry, 'entry');
  if (config.entries != null && !Array.isArray(config.entries))
    throw new TypeError('huandeng: entries must be an array of Project entries.');
  // DSH's schema normalizer supplies [] for an omitted array. Treat it as auto-discovery.
  const explicitEntries = config.entries ?? [];
  if (entry && explicitEntries.length)
    throw new TypeError('huandeng: choose entry or entries, not both.');
  const entries = explicitEntries.length ? explicitEntries : entry ? [entry] : [];
  if (entries.length > 64)
    throw new TypeError('huandeng: entries supports at most 64 Project entries.');
  config.entries = entries.map((value, index) => {
    const entry = optionalString(value, 'entries[' + index + ']');
    if (!entry || !path.isAbsolute(entry) || !entry.toLowerCase().endsWith('.pptd'))
      throw new TypeError('huandeng: each entry must be an absolute .pptd path.');
    return entry;
  });
  config.serverName = optionalString(config.serverName, 'serverName') ?? 'huandeng';
  if (!serverNamePattern.test(config.serverName))
    throw new TypeError('huandeng: serverName must match ' + serverNamePattern.source + '.');
  config.skillProviderName =
    optionalString(config.skillProviderName, 'skillProviderName') ?? 'huandeng';
  for (const key of ['cli', 'installDir', 'runtimeDir', 'url'])
    config[key] = optionalString(config[key], key);
  if (config.runtimeDir && !path.isAbsolute(config.runtimeDir))
    throw new TypeError('huandeng: runtimeDir must be absolute.');
  if (config.url && config.entries.length !== 1)
    throw new TypeError('huandeng: url requires exactly one explicit entry.');
  for (const key of [
    'bindAllOpen',
    'includeDefaultSkillRoots',
    'failOnStartupError',
    'strictDiscovery',
  ]) {
    if (config[key] !== undefined && typeof config[key] !== 'boolean')
      throw new TypeError('huandeng: ' + key + ' must be a boolean.');
  }
  config.refreshIntervalMs = integer(
    config.refreshIntervalMs,
    5000,
    1000,
    60000,
    'refreshIntervalMs',
  );
  config.missingPolls = integer(config.missingPolls, 3, 1, 12, 'missingPolls');
  config.toolCallTimeoutMs = integer(
    config.toolCallTimeoutMs,
    240000,
    1000,
    2147483647,
    'toolCallTimeoutMs',
  );
  config.reconnectMaxAttempts = integer(
    config.reconnectMaxAttempts,
    240,
    1,
    10000,
    'reconnectMaxAttempts',
  );
  return config;
}
export function entryKey(entry, platform = process.platform) {
  return platform === 'win32' ? entry.toLowerCase() : entry;
}
export function projectServerName(base, entry, platform = process.platform) {
  const identity = entryKey(entry, platform);
  const hash = createHash('sha256').update(identity).digest('hex').slice(0, 10);
  const paths = platform === 'win32' ? path.win32 : path;
  const folder = paths.basename(paths.dirname(entry));
  const slug = folder
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 8);
  return base.slice(0, 11) + '-' + (slug || 'project') + '-' + hash;
}
export function discoveryEnvironment(config, environment = process.env) {
  return {
    ...environment,
    ...(config.runtimeDir ? { HUANDENG_RUNTIME_DIR: config.runtimeDir } : {}),
  };
}
export async function projectTargets(config, discover, settings = {}) {
  if (!config.entries.length && config.bindAllOpen === false)
    return [{ key: 'single-project', serverName: config.serverName }];
  const platform = settings.platform ?? process.platform;
  const realpath = settings.realpath ?? fs.realpath;
  let sessions;
  try {
    sessions = await discover(discoveryEnvironment(config, settings.environment));
  } catch (error) {
    if (!config.entries.length || config.strictDiscovery) throw error;
    sessions = [];
  }
  const byEntry = new Map();
  for (const session of sessions) byEntry.set(entryKey(session.entry, platform), session);
  const entries = config.entries.length
    ? await Promise.all(config.entries.map((entry) => realpath(entry)))
    : sessions.map((session) => session.entry);
  const targets = new Map();
  const names = new Map();
  for (const entry of entries) {
    const key = entryKey(entry, platform);
    if (targets.has(key)) continue;
    const session = byEntry.get(key);
    const serverName = projectServerName(config.serverName, entry, platform);
    if (names.has(serverName) && names.get(serverName) !== key)
      throw new Error('huandeng: Project route identity collision; choose a different serverName.');
    names.set(serverName, key);
    const url = config.url ?? session?.url;
    const epoch = session?.epoch;
    targets.set(key, {
      key,
      entry,
      serverName,
      ...(url ? { url } : {}),
      ...(epoch ? { epoch } : {}),
      pinned: config.entries.length > 0,
    });
  }
  return [...targets.values()].sort((left, right) => left.key.localeCompare(right.key));
}
export function launcherEnvironment(config, target, electron = Boolean(process.versions.electron)) {
  const env = {};
  for (const [key, value] of Object.entries({
    HUANDENG_ENTRY: target.entry,
    HUANDENG_CLI: config.cli,
    HUANDENG_INSTALL_DIR: config.installDir,
    HUANDENG_RUNTIME_DIR: config.runtimeDir,
    HUANDENG_URL: target.url ?? config.url,
  })) {
    if (value !== undefined) env[key] = value;
  }
  if (electron) env.ELECTRON_RUN_AS_NODE = '1';
  return env;
}
