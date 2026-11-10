import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
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
await fs.access(path.join(core, 'src', 'pptd', 'project-initialize.cjs'));
const plugin = path.join(application, 'plugins', 'huandeng');
for (const file of [
  'skills/huandeng-story/SKILL.md',
  'skills/huandeng-story/references/production-design.md',
  'skills/huandeng-story/references/asset-evidence.md',
  'content-manifest.json',
  'scripts/configure.mjs',
  'scripts/doctor.mjs',
  'scripts/launch-mcp.mjs',
  'scripts/runtime.mjs',
])
  await fs.access(path.join(plugin, file));
const pluginManifest = JSON.parse(await fs.readFile(path.join(plugin, 'plugin.json'), 'utf8'));
const contentManifest = JSON.parse(
  await fs.readFile(path.join(plugin, 'content-manifest.json'), 'utf8'),
);
if (contentManifest.schemaVersion !== 1 || contentManifest.version !== pluginManifest.version)
  throw new Error('The packaged plugin content manifest has a different version.');
for (const [relative, expectedHash] of Object.entries(contentManifest.files)) {
  if (relative.split(/[\\/]/).includes('..') || path.isAbsolute(relative))
    throw new Error('The packaged plugin manifest contains an invalid path.');
  const hash = createHash('sha256')
    .update(await fs.readFile(path.join(plugin, relative)))
    .digest('hex');
  if (hash !== expectedHash) throw new Error(`The packaged plugin file differs: ${relative}`);
}
const storySkillSha256 = contentManifest.files['skills/huandeng-story/SKILL.md'];
if (!/^[a-f0-9]{64}$/.test(storySkillSha256 ?? ''))
  throw new Error('The packaged plugin manifest omits its Story skill hash.');
const output = execFileSync(process.execPath, [path.join(core, 'huandeng.js'), '--help'], {
  cwd: application,
  encoding: 'utf8',
  windowsHide: true,
});
if (!output.includes('HUANDENG Editor'))
  throw new Error('The packaged document service did not start.');
process.stdout.write(
  `${JSON.stringify({ portable: true, nodeLinker: 'hoisted', coreVersion: corePackage.version, pluginVersion: pluginManifest.version, storySkillSha256, directories, relativeExecutableLinks })}\n`,
);
