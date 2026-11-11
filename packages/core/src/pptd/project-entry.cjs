const fs = require('node:fs/promises');
const path = require('node:path');

function validProjectPath(value) {
  return (
    typeof value === 'string' &&
    value.trim().length > 0 &&
    value.length <= 32768 &&
    !value.includes('\0') &&
    !value.trimStart().startsWith('-')
  );
}

function entryError(code, message, details = {}) {
  return Object.assign(new Error(message), { code, ...details });
}

async function resolveProjectEntry(input) {
  if (!validProjectPath(input))
    throw entryError('INVALID_PROJECT_PATH', 'Choose a .pptd file or a project folder.');
  const canonical = await fs.realpath(path.resolve(input));
  const info = await fs.stat(canonical);
  if (info.isFile()) {
    if (!/\.pptd$/i.test(canonical))
      throw entryError('INVALID_PROJECT_PATH', 'Choose a .pptd file or a project folder.');
    return canonical;
  }
  if (!info.isDirectory())
    throw entryError('INVALID_PROJECT_PATH', 'The project path must be a file or folder.');
  const candidates = (await fs.readdir(canonical, { withFileTypes: true }))
    .filter((item) => /\.pptd$/i.test(item.name) && (item.isFile() || item.isSymbolicLink()))
    .map((item) => item.name)
    .sort();
  if (!candidates.length)
    throw entryError(
      'PROJECT_ENTRY_MISSING',
      'This folder has no .pptd entry file. Choose a project folder or create a new project.',
      { folder: canonical },
    );
  if (candidates.length > 1) {
    const names = candidates.slice(0, 12);
    throw entryError(
      'PROJECT_ENTRY_AMBIGUOUS',
      'This folder contains several .pptd files. Open the intended file explicitly:\n' +
        names.join('\n') +
        (candidates.length > names.length ? '\n…' : ''),
      { folder: canonical, candidates: names, candidateCount: candidates.length },
    );
  }
  const entry = await fs.realpath(path.join(canonical, candidates[0]));
  const sameDirectory =
    process.platform === 'win32'
      ? path.dirname(entry).toLowerCase() === canonical.toLowerCase()
      : path.dirname(entry) === canonical;
  if (!sameDirectory || !(await fs.stat(entry)).isFile() || !/\.pptd$/i.test(entry))
    throw entryError(
      'PROJECT_ENTRY_LINKED',
      'The folder entry is not a regular .pptd file inside this project. Open its actual project explicitly.',
    );
  return entry;
}

module.exports = { resolveProjectEntry, validProjectPath };
