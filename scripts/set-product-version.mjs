import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const productManifests = [
  'packages/desktop/release.json',
  'plugins/huandeng/plugin.json',
  'plugins/huandeng/.claude-plugin/plugin.json',
  'plugins/huandeng/.codex-plugin/plugin.json',
];

export async function setProductVersion(version, root = repository) {
  if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version ?? ''))
    throw new Error('Supply a stable product version, for example 0.23.0.');
  const entries = await Promise.all(
    productManifests.map(async (relative) => {
      const file = path.join(root, relative);
      const before = await fs.readFile(file, 'utf8');
      const value = JSON.parse(before);
      return { file, before, value };
    }),
  );
  if (new Set(entries.map(({ value }) => value.version)).size !== 1)
    throw new Error('Product manifests disagree; resolve their versions before updating.');
  const previous = entries[0].value.version;
  const written = [];
  try {
    for (const entry of entries) {
      const temporary = `${entry.file}.version-tmp`;
      await fs.writeFile(temporary, `${JSON.stringify({ ...entry.value, version }, null, 2)}\n`);
      await fs.rename(temporary, entry.file);
      written.push(entry);
    }
  } catch (error) {
    for (const entry of written) await fs.writeFile(entry.file, entry.before);
    throw error;
  } finally {
    for (const entry of entries) await fs.rm(`${entry.file}.version-tmp`, { force: true });
  }
  return { previous, version, files: productManifests };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  process.stdout.write(`${JSON.stringify(await setProductVersion(process.argv[2]), null, 2)}\n`);
