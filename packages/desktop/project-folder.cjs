const { execFile } = require('node:child_process');
const { constants } = require('node:fs');
const fs = require('node:fs/promises');
const path = require('node:path');
const { promisify } = require('node:util');

const execFileAsync = promisify(execFile);
const folderIni = Buffer.from(
  '\uFEFF[.ShellClassInfo]\r\nIconFile=.huandeng\\project.ico\r\nIconIndex=0\r\nInfoTip=HUANDENG project - open deck.pptd; keep this folder together.\r\n',
  'utf16le',
);

async function exists(file) {
  try {
    return await fs.lstat(file);
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

async function markProjectFolder(rootPath, options = {}) {
  if ((options.platform ?? process.platform) !== 'win32') return { status: 'unsupported' };
  const root = path.resolve(rootPath);
  try {
    const rootInfo = await fs.lstat(root);
    const manifest = await fs.lstat(path.join(root, 'deck.pptd'));
    if (!rootInfo.isDirectory() || rootInfo.isSymbolicLink() || !manifest.isFile())
      return { status: 'skipped', reason: 'not-project-directory' };
    const iniPath = path.join(root, 'desktop.ini');
    if (await exists(iniPath)) return { status: 'skipped', reason: 'existing-customization' };
    const metadataPath = path.join(root, '.huandeng');
    const metadata = await exists(metadataPath);
    if (metadata && (!metadata.isDirectory() || metadata.isSymbolicLink()))
      return { status: 'skipped', reason: 'linked-or-invalid-metadata' };
    const iconPath = path.join(metadataPath, 'project.ico');
    if (await exists(iconPath)) return { status: 'skipped', reason: 'existing-icon' };
    await fs.mkdir(metadataPath, { recursive: true });
    await fs.copyFile(
      options.iconSource ?? path.join(__dirname, 'icon.ico'),
      iconPath,
      constants.COPYFILE_EXCL,
    );
    await fs.writeFile(iniPath, folderIni, { flag: 'wx' });
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
    return { status: 'unavailable', message: error.message };
  }
}

module.exports = { markProjectFolder };
