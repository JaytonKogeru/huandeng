import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

const application = await fs.realpath(path.resolve(process.argv[2]));
let directories = 0;
let relativeExecutableLinks = 0;

async function inspect(directory) {
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) {
      const target = await fs.readlink(file);
      const resolved = await fs.realpath(file);
      const relative = path.relative(application, resolved);
      const targetInfo = await fs.stat(file);
      if (
        path.isAbsolute(target) ||
        path.isAbsolute(relative) ||
        relative === '..' ||
        relative.startsWith(`..${path.sep}`) ||
        targetInfo.isDirectory()
      ) {
        throw new Error(`Desktop package contains a nonportable link: ${file} -> ${target}`);
      }
      relativeExecutableLinks++;
    } else if (entry.isDirectory()) {
      directories++;
      await inspect(file);
    }
  }
}

await inspect(application);
const core = path.join(application, 'node_modules', '@open-slide', 'core');
const corePackage = JSON.parse(await fs.readFile(path.join(core, 'package.json'), 'utf8'));
await fs.access(path.join(core, 'dist', 'editor', 'huandeng.html'));
const output = execFileSync(process.execPath, [path.join(core, 'huandeng.js'), '--help'], {
  cwd: application,
  encoding: 'utf8',
  windowsHide: true,
});
if (!output.includes('HUANDENG Editor'))
  throw new Error('The packaged document service did not start.');
process.stdout.write(
  `${JSON.stringify({ portable: true, nodeLinker: 'hoisted', coreVersion: corePackage.version, directories, relativeExecutableLinks })}\n`,
);
