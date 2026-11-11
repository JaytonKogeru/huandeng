const { execFile } = require('node:child_process');
const fs = require('node:fs/promises');
const path = require('node:path');
const { promisify } = require('node:util');
const { resolveProjectEntry } = require('./project-entry.cjs');

const execFileAsync = promisify(execFile);
function folderIni(entryName) {
  return Buffer.from(
    '\uFEFF[.ShellClassInfo]\r\nIconFile=.huandeng\\project.ico\r\nIconIndex=0\r\nInfoTip=HUANDENG project - open ' +
      entryName.replace(/[\r\n]/g, ' ') +
      '; keep this folder together.\r\n',
    'utf16le',
  );
}

async function exists(file) {
  try {
    return await fs.lstat(file);
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

async function writeOwnedMarker(file, bytes, created) {
  const handle = await fs.open(file, 'wx');
  const record = { file, bytes, complete: false };
  created.push(record);
  try {
    record.parent = await fs.realpath(path.dirname(file));
    record.identity = await handle.stat();
    await handle.writeFile(bytes);
    record.complete = true;
  } finally {
    // The handle identifies our exclusive creation even if a write was only partial.
    record.written = await handle.stat().catch(() => null);
    await handle.close();
  }
}

async function removeUnchangedMarkers(created, iniPath) {
  try {
    // A customization that appeared during the attempt may now refer to our icon.
    if (iniPath && !created.some((record) => record.file === iniPath) && (await exists(iniPath)))
      return;
    for (const record of created) {
      const current = await fs.lstat(record.file);
      if (
        !record.identity ||
        !record.written ||
        !current.isFile() ||
        current.isSymbolicLink() ||
        current.dev !== record.identity.dev ||
        current.ino !== record.identity.ino ||
        current.birthtimeMs !== record.identity.birthtimeMs ||
        current.mtimeMs !== record.written.mtimeMs ||
        (await fs.realpath(path.dirname(record.file))) !== record.parent
      )
        return;
      const bytes = await fs.readFile(record.file);
      if (
        (record.complete && bytes.length !== record.bytes.length) ||
        bytes.length > record.bytes.length ||
        !bytes.equals(record.bytes.subarray(0, bytes.length))
      )
        return;
    }
    // Remove the INI before its icon. Stop if a file cannot be removed.
    for (const record of [...created].reverse()) await fs.unlink(record.file);
  } catch {
    // If ownership or unchanged bytes cannot be proved, retain the customization.
  }
}

async function markProjectFolder(rootPath, options = {}) {
  if ((options.platform ?? process.platform) !== 'win32') return { status: 'unsupported' };
  const root = path.resolve(rootPath);
  const created = [];
  let iniPath;
  try {
    const rootInfo = await fs.lstat(root);
    if (!rootInfo.isDirectory() || rootInfo.isSymbolicLink())
      return { status: 'skipped', reason: 'not-project-directory' };
    const entry = await resolveProjectEntry(options.entryPath ?? root);
    const directory = await fs.realpath(root);
    const sameRoot =
      process.platform === 'win32'
        ? path.dirname(entry).toLowerCase() === directory.toLowerCase()
        : path.dirname(entry) === directory;
    if (!sameRoot) return { status: 'skipped', reason: 'not-project-directory' };
    iniPath = path.join(root, 'desktop.ini');
    if (await exists(iniPath)) return { status: 'skipped', reason: 'existing-customization' };
    const metadataPath = path.join(root, '.huandeng');
    const metadata = await exists(metadataPath);
    if (metadata && (!metadata.isDirectory() || metadata.isSymbolicLink()))
      return { status: 'skipped', reason: 'linked-or-invalid-metadata' };
    const iconPath = path.join(metadataPath, 'project.ico');
    if (await exists(iconPath)) return { status: 'skipped', reason: 'existing-icon' };
    const iconBytes = await fs.readFile(options.iconSource ?? path.join(__dirname, 'icon.ico'));
    await fs.mkdir(metadataPath, { recursive: true });
    await writeOwnedMarker(iconPath, iconBytes, created);
    await writeOwnedMarker(iniPath, folderIni(path.basename(entry)), created);
    const runAttributes =
      options.runAttributes ??
      ((args) =>
        execFileAsync(
          path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'attrib.exe'),
          args,
          { windowsHide: true, timeout: 5000 },
        ));
    await runAttributes(['+h', '+s', iniPath]);
    await runAttributes(['+r', root]);
    return { status: 'marked', root, iconPath, iniPath };
  } catch (error) {
    await removeUnchangedMarkers(created, iniPath);
    return { status: 'unavailable', message: error.message };
  }
}

module.exports = { markProjectFolder };
