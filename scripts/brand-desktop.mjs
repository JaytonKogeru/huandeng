import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Data, NtExecutable, NtExecutableResource, Resource } from 'resedit';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const stage = await fs.realpath(path.resolve(process.argv[2]));
const relative = path.relative(path.join(root, '.verification'), stage);
if (!/^desktop-package-[\w-]+$/.test(relative))
  throw new Error('Branding is restricted to an isolated desktop package stage.');
const version = JSON.parse(
  await fs.readFile(path.join(root, 'packages/desktop/release.json'), 'utf8'),
).version;
assert.match(version, /^\d+\.\d+\.\d+$/);
const file = path.join(stage, 'HUANDENG Editor.exe');
const exe = NtExecutable.from(await fs.readFile(file), { ignoreCert: true });
const resources = NtExecutableResource.from(exe);
const icons = Data.IconFile.from(await fs.readFile(path.join(stage, 'resources/app/icon.ico')));
for (const group of Resource.IconGroupEntry.fromEntries(resources.entries)) {
  Resource.IconGroupEntry.replaceIconsForResource(
    resources.entries,
    group.id,
    group.lang,
    icons.icons.map(({ data }) => data),
  );
}
const versions = Resource.VersionInfo.fromEntries(resources.entries);
assert.ok(versions.length, 'Electron executable has no version resource.');
for (const info of versions) {
  for (const language of info.getAllLanguagesForStringValues()) {
    info.setFileVersion(`${version}.0`, language.lang);
    info.setProductVersion(`${version}.0`, language.lang);
    info.setStringValues(language, {
      CompanyName: 'HUANDENG contributors',
      FileDescription: 'HUANDENG Editor',
      ProductName: 'HUANDENG Editor',
      InternalName: 'HUANDENG Editor',
      OriginalFilename: 'HUANDENG Editor.exe',
      LegalCopyright: 'HUANDENG and Electron contributors. See LICENSE and NOTICE files.',
    });
  }
  info.outputToResourceEntries(resources.entries);
}
resources.outputResource(exe);
await fs.writeFile(file, Buffer.from(exe.generate()));
const verified = NtExecutableResource.from(NtExecutable.from(await fs.readFile(file)));
for (const info of Resource.VersionInfo.fromEntries(verified.entries)) {
  for (const language of info.getAllLanguagesForStringValues()) {
    const strings = info.getStringValues(language);
    assert.equal(strings.ProductName, 'HUANDENG Editor');
    assert.equal(strings.FileVersion, `${version}.0`);
  }
}
process.stdout.write(`${JSON.stringify({ branded: true, productVersion: version })}\n`);
