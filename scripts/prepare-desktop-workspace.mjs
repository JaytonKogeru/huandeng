import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
