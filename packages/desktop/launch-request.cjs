const path = require('node:path');

const schemaVersion = 1;
const invalidEntry = 'invalid-entry';

function isPptdPath(value) {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= 32768 &&
    !value.includes('\0') &&
    !value.trimStart().startsWith('-') &&
    /\.pptd$/i.test(value)
  );
}

function parseLaunchRequest(argv, { packaged = true, cwd = process.cwd(), pathApi = path } = {}) {
  const args = Array.isArray(argv)
    ? argv.slice(packaged ? 1 : 2).filter((arg) => typeof arg === 'string')
    : [];
  const entryIndex = args.indexOf('--entry');
  const entryEquals = args.find((arg) => arg.startsWith('--entry='));
  const explicit =
    entryEquals === undefined ? args[entryIndex + 1] : entryEquals.slice('--entry='.length);
  const hasEntryOption = entryIndex !== -1 || entryEquals !== undefined;
  // Chromium can move switches before positional arguments in second-instance argv.
  // A switch is never an entry. A real bare .pptd remains a safe legacy fallback.
  const entry =
    (hasEntryOption && isPptdPath(explicit) ? explicit : undefined) ?? args.find(isPptdPath);
  return {
    ...(entry ? { entry: pathApi.resolve(cwd, entry) } : {}),
    readOnly: args.includes('--read-only'),
    welcome: args.includes('--welcome'),
    ...(hasEntryOption && !entry ? { error: invalidEntry } : {}),
  };
}

function createLaunchData(request) {
  return {
    huandengLaunch: {
      schemaVersion,
      request: {
        ...(request.entry ? { entry: request.entry } : {}),
        readOnly: request.readOnly === true,
        welcome: request.welcome === true,
        ...(request.error === invalidEntry ? { error: invalidEntry } : {}),
      },
    },
  };
}

function readLaunchData(data, { pathApi = path } = {}) {
  const packet = data?.huandengLaunch;
  if (
    !packet ||
    typeof packet !== 'object' ||
    Array.isArray(packet) ||
    packet.schemaVersion !== schemaVersion ||
    Object.keys(packet).some((key) => !['schemaVersion', 'request'].includes(key))
  )
    return null;
  const request = packet.request;
  if (
    !request ||
    typeof request !== 'object' ||
    Array.isArray(request) ||
    Object.keys(request).some((key) => !['entry', 'readOnly', 'welcome', 'error'].includes(key)) ||
    typeof request.readOnly !== 'boolean' ||
    typeof request.welcome !== 'boolean' ||
    (request.entry !== undefined &&
      (!isPptdPath(request.entry) || !pathApi.isAbsolute(request.entry))) ||
    (request.error !== undefined && request.error !== invalidEntry) ||
    (request.error !== undefined && request.entry !== undefined)
  )
    return null;
  return {
    ...(request.entry !== undefined ? { entry: pathApi.normalize(request.entry) } : {}),
    readOnly: request.readOnly,
    welcome: request.welcome,
    ...(request.error ? { error: request.error } : {}),
  };
}

function secondInstanceRequest(argv, workingDirectory, data, options = {}) {
  return (
    readLaunchData(data, options) ??
    parseLaunchRequest(argv, {
      ...options,
      cwd:
        typeof workingDirectory === 'string' && workingDirectory ? workingDirectory : process.cwd(),
    })
  );
}

module.exports = {
  isPptdPath,
  parseLaunchRequest,
  createLaunchData,
  readLaunchData,
  secondInstanceRequest,
};
