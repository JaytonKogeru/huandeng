import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs, promisify } from 'node:util';
import { pluginRoot, reportError } from './runtime.mjs';

const run = promisify(execFile);
const adapterFiles = [
  'README.md',
  'cordis.patch.yml',
  'lib/index.mjs',
  'lib/projects.mjs',
  'lib/controller.mjs',
  'locale/en.json',
  'locale/zh.json',
];

async function copy(source, target) {
  if (!(await fs.lstat(source)).isFile())
    throw new Error('Only regular source files may be packaged.');
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.copyFile(source, target);
}

async function inventory(directory, prefix = '') {
  const files = [];
  for (const item of await fs.readdir(directory, { withFileTypes: true })) {
    const relative = prefix + item.name;
    if (item.isDirectory())
      files.push(...(await inventory(path.join(directory, item.name), relative + '/')));
    else if (item.isFile()) files.push(relative);
    else throw new Error('The bundle must not contain linked or special files: ' + relative);
  }
  return files.sort();
}

export async function buildDeepseekBundle(output, root = pluginRoot) {
  if (!path.isAbsolute(output)) throw new Error('--output must be an absolute directory.');
  const relative = path.relative(root, output);
  if (!relative.startsWith('..') && !path.isAbsolute(relative))
    throw new Error('Build outside the plugin source directory.');
  const adapter = path.join(root, 'adapters', 'deepseek');
  const destination = path.join(output, 'huandeng');
  const manifest = JSON.parse(await fs.readFile(path.join(root, 'plugin.json'), 'utf8'));
  await fs.mkdir(output, { recursive: true });
  await fs.mkdir(destination);
  for (const file of adapterFiles)
    await copy(path.join(adapter, file), path.join(destination, file));
  for (const file of ['LICENSE', 'assets/icon.png'])
    await copy(path.join(root, file), path.join(destination, file));
  const packageManifest = JSON.parse(
    await fs.readFile(path.join(adapter, 'package.template.json'), 'utf8'),
  );
  packageManifest.version = manifest.version;
  await fs.writeFile(
    path.join(destination, 'package.json'),
    JSON.stringify(packageManifest, null, 2) + '\n',
  );
  const temporary = path.join(destination, '.vendor-build');
  await run(process.execPath, [
    path.join(root, 'scripts', 'build-package.mjs'),
    '--target',
    'local',
    '--output',
    temporary,
  ]);
  await fs.rename(path.join(temporary, 'huandeng'), path.join(destination, 'vendor'));
  await fs.rmdir(temporary);
  await fs.writeFile(
    path.join(destination, 'SOURCE.json'),
    JSON.stringify(
      {
        schemaVersion: 1,
        version: manifest.version,
        adapterSource: 'plugins/huandeng/adapters/deepseek',
        sharedSource: 'plugins/huandeng',
        sharedContentManifest: 'vendor/content-manifest.json',
        prototype:
          'User-created HUANDENG DSH native bundle, incorporated with project-routing fixes.',
      },
      null,
      2,
    ) + '\n',
  );
  const hashes = {};
  for (const file of await inventory(destination))
    hashes[file] = createHash('sha256')
      .update(await fs.readFile(path.join(destination, file)))
      .digest('hex');
  await fs.writeFile(
    path.join(destination, 'content-manifest.json'),
    JSON.stringify(
      {
        schemaVersion: 1,
        target: 'deepseek-native',
        version: manifest.version,
        files: hashes,
      },
      null,
      2,
    ) + '\n',
  );
  return {
    target: 'deepseek-native',
    directory: destination,
    version: manifest.version,
    files: [...Object.keys(hashes), 'content-manifest.json'].sort(),
    privateProjectFiles: 0,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const { values } = parseArgs({
      options: { output: { type: 'string' }, help: { type: 'boolean' } },
    });
    if (values.help)
      process.stdout.write(
        'Usage: node build-deepseek.mjs --output <new absolute directory>\nBuilds a native DSH bundle with shared HUANDENG plugin content. Does not install or edit any profile.\n',
      );
    else {
      if (!values.output) throw new Error('--output is required.');
      process.stdout.write(
        JSON.stringify(await buildDeepseekBundle(values.output), null, 2) + '\n',
      );
    }
  } catch (error) {
    reportError(error);
  }
}
