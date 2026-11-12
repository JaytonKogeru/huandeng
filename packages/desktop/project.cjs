const { text: desktopText } = require('./locale.cjs');
const fs = require('node:fs/promises');
const path = require('node:path');
const { existsSync } = require('node:fs');
const sourceInitializer = path.join(__dirname, '../core/src/pptd/project-initialize.cjs');
const { initializeProject } = require(
  existsSync(sourceInitializer)
    ? sourceInitializer
    : path.join(__dirname, 'node_modules/@open-slide/core/src/pptd/project-initialize.cjs'),
);
const { markProjectFolder } = require('./project-folder.cjs');

function projectLocation(parent, name) {
  if (typeof parent !== 'string' || !path.isAbsolute(parent))
    throw new Error('Choose a parent folder.');
  if (
    typeof name !== 'string' ||
    !name.trim() ||
    name.length > 100 ||
    /[<>:"/\\|?*]/.test(name) ||
    Array.from(name).some((character) => character.charCodeAt(0) < 32) ||
    /[. ]$/.test(name) ||
    /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(name)
  )
    throw new Error(desktopText('请使用有效的项目文件夹名称。'));
  const title = name.trim();
  const root = path.join(parent, title);
  return { name: title, root, entry: path.join(root, 'deck.pptd') };
}

async function readPreferences(file) {
  try {
    const value = JSON.parse(await fs.readFile(file, 'utf8'));
    return { ...value, recentProjects: value.recentProjects ?? [] };
  } catch {
    return { recentProjects: [] };
  }
}

async function writePreferences(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.tmp`;
  await fs.writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`);
  await fs.rename(temporary, file);
}

function pathKey(file) {
  const resolved = path.resolve(file);
  return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
}

async function createProject(selectedPath, options = {}) {
  const title = path.basename(selectedPath).replace(/\.pptd$/i, '');
  if (!title.trim()) throw new Error(desktopText('请给项目起一个名字。'));
  const root = path.join(path.dirname(selectedPath), title);
  try {
    await initializeProject(root, { title });
    if (options.template === 'guide')
      await require('./starter-project.cjs').writeStarterProject(root, title, options.locale);
  } catch (error) {
    if (error.code === 'EEXIST') {
      throw new Error(desktopText('项目文件夹已经存在，请换一个名称：\n{path}', { path: root }));
    }
    throw error;
  }
  const entryPath = path.join(root, 'deck.pptd');
  await markProjectFolder(root, options.folderMarker);
  return entryPath;
}

module.exports = { readPreferences, writePreferences, pathKey, createProject, projectLocation };
