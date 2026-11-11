const { existsSync } = require('node:fs');
const path = require('node:path');
const { text } = require('./locale.cjs');

const source = path.join(__dirname, '../core/src/pptd/project-entry.cjs');
const core = require(
  existsSync(source)
    ? source
    : path.join(__dirname, 'node_modules/@open-slide/core/src/pptd/project-entry.cjs'),
);
const messages = {
  INVALID_PROJECT_PATH: '请选择 .pptd 文件或项目文件夹。',
  PROJECT_ENTRY_MISSING: '这个文件夹中没有 .pptd 入口文件。请选择项目文件夹，或新建项目。',
  PROJECT_ENTRY_AMBIGUOUS: '这个文件夹中有多个 .pptd 文件。请明确打开其中一个：',
  PROJECT_ENTRY_LINKED: '文件夹中的入口链接到了其他位置。请明确打开实际项目。',
};

async function resolveProjectEntry(input) {
  try {
    return await core.resolveProjectEntry(input);
  } catch (error) {
    if (messages[error.code])
      error.message =
        text(messages[error.code]) +
        (Array.isArray(error.candidates) ? `\n${error.candidates.join('\n')}` : '');
    throw error;
  }
}

module.exports = { resolveProjectEntry, validProjectPath: core.validProjectPath };
