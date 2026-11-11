import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { pluginRoot, reportError } from './runtime.mjs';

export const commonFiles = [
  'plugin.json',
  'README.md',
  'adapters/deepseek/README.md',
  'LICENSE',
  'assets/icon.png',
  'skills/huandeng-story/SKILL.md',
  'skills/huandeng-story/agents/openai.yaml',
  'skills/huandeng-story/references/client-routing.md',
  'skills/huandeng-story/references/scientific-design.md',
  'skills/huandeng-story/references/connected-review.md',
  'skills/huandeng-story/references/production-design.md',
  'skills/huandeng-story/references/asset-evidence.md',
  'scripts/runtime.mjs',
  'scripts/discovery.mjs',
  'scripts/discover.mjs',
  'scripts/register-runtime.mjs',
  'scripts/configure.mjs',
  'scripts/doctor.mjs',
  'scripts/launch-mcp.mjs',
];
const localFiles = [
  'mcp.json',
  '.mcp.json',
  '.codex.mcp.json',
  '.codex-plugin/plugin.json',
  '.claude-plugin/plugin.json',
];

try {
  const { values } = parseArgs({
    options: {
      target: { type: 'string' },
      output: { type: 'string' },
      'app-id': { type: 'string' },
      help: { type: 'boolean' },
    },
  });
  if (values.help)
    process.stdout.write(
      'Usage: node build-package.mjs --target local|chatgpt --output <new absolute directory> [--app-id <verified existing app ID>]\nBuilds an allowlisted package directory. Archive it outside its root. No account upload, install, or private Project copy.\n',
    );
  else {
    if (!['local', 'chatgpt'].includes(values.target))
      throw new Error('Choose --target local or chatgpt.');
    if (!values.output || !path.isAbsolute(values.output))
      throw new Error('--output must be an absolute directory.');
    const relative = path.relative(pluginRoot, values.output);
    if (!relative.startsWith('..') && !path.isAbsolute(relative))
      throw new Error('Build outside the plugin source directory.');
    if (
      values.target === 'chatgpt' &&
      !/^(asdk_app_|connector_|templated_apps_)[A-Za-z0-9][A-Za-z0-9_-]*$/.test(
        values['app-id'] ?? '',
      )
    )
      throw new Error('A verified existing app ID is required for the private ChatGPT package.');
    if (values.target === 'local' && values['app-id'])
      throw new Error('Portable local packages must not contain a workstation app binding.');
    const destination = path.join(values.output, 'huandeng');
    await fs.mkdir(values.output, { recursive: true });
    await fs.mkdir(destination);
    const files = [...commonFiles, ...(values.target === 'local' ? localFiles : [])];
    for (const relativePath of files) {
      const source = path.join(pluginRoot, relativePath);
      if (!(await fs.lstat(source)).isFile())
        throw new Error(`Only regular source files are packaged: ${relativePath}`);
      const target = path.join(destination, relativePath);
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.copyFile(source, target);
    }
    if (values.target === 'chatgpt') {
      const manifest = JSON.parse(await fs.readFile(path.join(destination, 'plugin.json'), 'utf8'));
      manifest.extensions['com.openai'].apps = './.app.json';
      await fs.writeFile(
        path.join(destination, 'plugin.json'),
        `${JSON.stringify(manifest, null, 2)}\n`,
      );
      await fs.writeFile(
        path.join(destination, '.app.json'),
        `${JSON.stringify({ apps: { 'authorized-workstation': { id: values['app-id'] } } }, null, 2)}\n`,
      );
      const compatibility = {
        name: manifest.name,
        version: manifest.version,
        description: manifest.description,
        author: manifest.author,
        repository: manifest.repository,
        skills: './skills/',
        apps: './.app.json',
        interface: manifest.extensions['com.openai'].interface,
      };
      await fs.mkdir(path.join(destination, '.codex-plugin'));
      await fs.writeFile(
        path.join(destination, '.codex-plugin/plugin.json'),
        `${JSON.stringify(compatibility, null, 2)}\n`,
      );
      const route = path.join(destination, 'skills/huandeng-story/references/client-routing.md');
      await fs.appendFile(
        route,
        `\n## This private account connection\n\nFor ChatGPT workstation operations, use the existing app ID \`${values['app-id']}\` declared in this package. It is the user-authorized THUG connection. Do not create another connection or tunnel. In a local Codex session, use this computer's Editor and the local route above; do not send local Project work to THUG.\n`,
      );
      files.push('.app.json', '.codex-plugin/plugin.json');
    }
    const manifest = JSON.parse(await fs.readFile(path.join(destination, 'plugin.json'), 'utf8'));
    const hashes = {};
    for (const file of [...files].sort())
      hashes[file] = createHash('sha256')
        .update(await fs.readFile(path.join(destination, file)))
        .digest('hex');
    await fs.writeFile(
      path.join(destination, 'content-manifest.json'),
      `${JSON.stringify({ schemaVersion: 1, version: manifest.version, files: hashes }, null, 2)}\n`,
    );
    files.push('content-manifest.json');
    process.stdout.write(
      `${JSON.stringify({ target: values.target, directory: destination, version: manifest.version, files: files.sort(), privateProjectFiles: 0 }, null, 2)}\n`,
    );
  }
} catch (error) {
  reportError(error);
}
