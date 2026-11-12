import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';

export async function copyDesktopNotices(core, destination) {
  const visited = new Set();
  const included = new Map();
  const noticeName = /^(?:licen[sc]es?|copying|notices?|copyright|authors)(?:$|[._-])/i;
  const root = await fs.realpath(path.resolve(core, '../..'));
  async function resolvePackage(name, from, optional) {
    const require = createRequire(path.join(from, 'package.json'));
    for (const folder of require.resolve.paths(`${name}/package.json`) ?? []) {
      const file = path.join(folder, name, 'package.json');
      if (
        !(await fs.access(file).then(
          () => true,
          () => false,
        ))
      )
        continue;
      const resolved = await fs.realpath(path.dirname(file));
      const relative = path.relative(root, resolved);
      if (relative.startsWith('..') || path.isAbsolute(relative))
        throw new Error('Dependency licenses must resolve inside the build checkout.');
      return resolved;
    }
    if (!optional) throw new Error(`Installed production dependency is missing: ${name}`);
  }
  async function visit(directory) {
    const canonical = await fs.realpath(directory);
    if (visited.has(canonical)) return;
    visited.add(canonical);
    const manifest = JSON.parse(await fs.readFile(path.join(canonical, 'package.json'), 'utf8'));
    const id = `${manifest.name}@${manifest.version}`;
    if (!included.has(id)) {
      const folder = `${manifest.name.replaceAll('/', '__')}@${manifest.version}`;
      const target = path.join(destination, folder);
      await fs.mkdir(target, { recursive: true });
      const notices = [];
      for (const entry of await fs.readdir(canonical, { withFileTypes: true })) {
        if (!noticeName.test(entry.name)) continue;
        if (entry.isSymbolicLink())
          throw new Error('A dependency notice is linked outside its package.');
        await fs.cp(path.join(canonical, entry.name), path.join(target, entry.name), {
          recursive: true,
          dereference: false,
        });
        notices.push(entry.name);
      }
      const identity = Object.fromEntries(
        ['name', 'version', 'license', 'author', 'contributors', 'repository', 'homepage']
          .filter((key) => manifest[key] !== undefined)
          .map((key) => [key, manifest[key]]),
      );
      await fs.writeFile(
        path.join(target, 'package.json'),
        `${JSON.stringify(identity, null, 2)}\n`,
      );
      included.set(id, { ...identity, directory: folder, notices: notices.sort() });
    }
    const dependencies = { ...manifest.dependencies, ...manifest.optionalDependencies };
    for (const name of Object.keys(dependencies).sort()) {
      const resolved = await resolvePackage(
        name,
        canonical,
        Object.hasOwn(manifest.optionalDependencies ?? {}, name),
      );
      if (resolved) await visit(resolved);
    }
  }
  const manifest = JSON.parse(await fs.readFile(path.join(core, 'package.json'), 'utf8'));
  for (const name of Object.keys(manifest.dependencies).sort())
    await visit(await resolvePackage(name, core, false));
  const packages = [...included.values()].sort((a, b) =>
    (a.name + a.version).localeCompare(b.name + b.version),
  );
  for (const name of [
    'echarts',
    'react',
    '@fortawesome/free-solid-svg-icons',
    '@fortawesome/free-regular-svg-icons',
    '@fortawesome/free-brands-svg-icons',
  ]) {
    if (!packages.some((item) => item.name === name && item.notices.length))
      throw new Error(`Missing bundled-editor license notice: ${name}`);
  }
  await fs.writeFile(
    path.join(destination, 'index.json'),
    `${JSON.stringify({ schemaVersion: 1, scope: 'Installed core production dependency closure, including browser bundles', packages }, null, 2)}\n`,
  );
  return { packages: packages.length };
}
