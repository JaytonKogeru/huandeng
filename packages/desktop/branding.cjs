const fs = require('node:fs/promises');
const { constants } = require('node:fs');
const path = require('node:path');

// Copy only app preferences; per-page history already uses the unchanged Huandeng runtime root.
async function migratePreferences(previousDirectory, currentDirectory) {
  if (path.resolve(previousDirectory) === path.resolve(currentDirectory)) return false;
  await fs.mkdir(currentDirectory, { recursive: true });
  try {
    await fs.copyFile(
      path.join(previousDirectory, 'preferences.json'),
      path.join(currentDirectory, 'preferences.json'),
      constants.COPYFILE_EXCL,
    );
    return true;
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'EEXIST') return false;
    throw error;
  }
}
module.exports = { migratePreferences };
