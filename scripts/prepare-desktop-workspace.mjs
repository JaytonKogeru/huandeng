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
await fs.cp(
  path.join(repository, 'plugins', 'huandeng'),
  path.join(destination, 'packages', 'desktop', 'plugins', 'huandeng'),
  { recursive: true },
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
