const fs = require('node:fs/promises');
const path = require('node:path');

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

async function createProject(selectedPath) {
  const title = path.basename(selectedPath).replace(/\.pptd$/i, '');
  if (!title.trim()) throw new Error('请给项目起一个名字。');
  const root = path.join(path.dirname(selectedPath), title);
  try {
    await fs.mkdir(root);
  } catch (error) {
    if (error.code === 'EEXIST') {
      throw new Error(`项目文件夹已经存在，请换一个名称：\n${root}`);
    }
    throw error;
  }
  await fs.mkdir(path.join(root, 'pages'));
  await fs.mkdir(path.join(root, 'media'));
  await fs.writeFile(path.join(root, 'pages', 'initial.page'), 'elements: []\nnotes: ""\n');
  const entryPath = path.join(root, 'deck.pptd');
  await fs.writeFile(
    entryPath,
    `title: ${JSON.stringify(title)}\nsize: [960, 540]\npages:\n  - pages/initial.page\ntheme:\n  fontFamily: Arial\n`,
  );
  await fs.writeFile(path.join(root, '.gitignore'), 'Exports/\n');
  return entryPath;
}

module.exports = { readPreferences, writePreferences, pathKey, createProject };
