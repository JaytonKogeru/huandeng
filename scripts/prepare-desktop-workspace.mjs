import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { desktopRuntimeDependencies } from './desktop-runtime-dependencies.mjs';
import { copyDesktopNotices } from './desktop-third-party-notices.mjs';

const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const destination = path.resolve(process.argv[2]);
const require = createRequire(path.join(repository, 'packages', 'core', 'package.json'));
const { parse, stringify } = require('yaml');
const lockfile = parse(await fs.readFile(path.join(repository, 'pnpm-lock.yaml'), 'utf8'));
const workspace = JSON.parse(await fs.readFile(path.join(repository, 'package.json'), 'utf8'));

await fs.mkdir(destination, { recursive: true });
for (const name of ['core', 'desktop']) {
  const source = path.join(repository, 'packages', name);
  await fs.cp(source, path.join(destination, 'packages', name), {
    recursive: true,
    filter: (file) =>
      !path
        .relative(source, file)
        .split(path.sep)
        .some((part) =>
          ['node_modules', '.verification', '.turbo', 'test-results', 'playwright-report'].includes(
            part,
          ),
        ),
  });
}
await copyDesktopNotices(
  path.join(repository, 'packages', 'core'),
  path.join(destination, 'packages', 'desktop', 'third-party'),
);
const desktopPackagePath = path.join(destination, 'packages', 'desktop', 'package.json');
const desktopPackage = JSON.parse(await fs.readFile(desktopPackagePath, 'utf8'));
const desktopRelease = JSON.parse(
  await fs.readFile(path.join(repository, 'packages', 'desktop', 'release.json'), 'utf8'),
);
if (typeof desktopRelease.version !== 'string' || !desktopRelease.version.trim())
  throw new Error('The desktop release version is missing.');
desktopPackage.version = desktopRelease.version;
await fs.writeFile(desktopPackagePath, `${JSON.stringify(desktopPackage, null, 2)}\n`);
execFileSync(
  process.execPath,
  [
    path.join(repository, 'plugins', 'huandeng', 'scripts', 'build-package.mjs'),
    '--target',
    'local',
    '--output',
    path.join(destination, 'packages', 'desktop', 'plugins'),
  ],
  { cwd: repository, windowsHide: true },
);
const runtime = await desktopRuntimeDependencies(path.join(repository, 'packages', 'core'));
const corePackagePath = path.join(destination, 'packages', 'core', 'package.json');
const corePackage = JSON.parse(await fs.readFile(corePackagePath, 'utf8'));
corePackage.dependencies = runtime.dependencies;
corePackage.huandengDesktopRuntime = true;
corePackage.files = corePackage.files.filter(
  (file) =>
    ![
      'src/app',
      'src/locale',
      'src/agent/prompt.ts',
      'src/agent/provider.ts',
      'src/agent/types.ts',
      'src/editing/placeholder-id.ts',
    ].includes(file),
);
await fs.writeFile(corePackagePath, `${JSON.stringify(corePackage, null, 2)}\n`);
const coreImporter = lockfile.importers['packages/core'];
coreImporter.dependencies = Object.fromEntries(
  Object.keys(runtime.dependencies).map((name) => {
    if (!coreImporter.dependencies?.[name])
      throw new Error(`Missing locked runtime dependency: ${name}`);
    return [name, coreImporter.dependencies[name]];
  }),
);
await fs.writeFile(
  path.join(destination, 'desktop-runtime.json'),
  `${JSON.stringify(runtime, null, 2)}\n`,
);
lockfile.settings = { ...lockfile.settings, injectWorkspacePackages: true };
await fs.writeFile(path.join(destination, 'pnpm-lock.yaml'), stringify(lockfile));
await fs.writeFile(
  path.join(destination, 'pnpm-workspace.yaml'),
  'packages:\n  - packages/*\ninjectWorkspacePackages: true\n',
);
await fs.writeFile(
  path.join(destination, 'package.json'),
  `${JSON.stringify({ name: 'huandeng-desktop-build', private: true, packageManager: workspace.packageManager }, null, 2)}\n`,
);
process.stdout.write(`${destination}\n`);
