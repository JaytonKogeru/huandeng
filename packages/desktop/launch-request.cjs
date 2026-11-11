const path = require('node:path');
const { statSync } = require('node:fs');
const { validProjectPath } = require('./project-entry.cjs');

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

function existingDirectory(candidate) {
  try {
    return statSync(candidate).isDirectory();
  } catch {
    return false;
  }
}

function parseLaunchRequest(
  argv,
  { packaged = true, cwd = process.cwd(), pathApi = path, isDirectory = existingDirectory } = {},
) {
  const args = Array.isArray(argv)
    ? argv.slice(packaged ? 1 : 2).filter((arg) => typeof arg === 'string')
    : [];
  const entryIndex = args.indexOf('--entry');
  const entryEquals = args.find((arg) => arg.startsWith('--entry='));
  const hasEntryOption = entryIndex !== -1 || entryEquals !== undefined;
  let valueIndex = entryIndex + 1;
  // Chromium inserts these known switches into second-instance argv. Do not skip
  // arbitrary switches: an invalid explicit option must not open another Project.
  if (entryEquals === undefined && entryIndex !== -1)
    while (
      args[valueIndex] === '--allow-file-access-from-files' ||
      /^--original-process-start-time=\d+$/.test(args[valueIndex] ?? '')
    )
      valueIndex += 1;
  const explicit =
    entryEquals === undefined ? args[valueIndex] : entryEquals.slice('--entry='.length);
  const entry = hasEntryOption
    ? validProjectPath(explicit)
      ? explicit
      : undefined
    : args.find(
        (value) =>
          isPptdPath(value) ||
          (validProjectPath(value) && isDirectory(pathApi.resolve(cwd, value))),
      );
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
      (!validProjectPath(request.entry) || !pathApi.isAbsolute(request.entry))) ||
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
