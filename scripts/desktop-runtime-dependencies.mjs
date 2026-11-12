import fs from 'node:fs/promises';
import { builtinModules, createRequire } from 'node:module';
import path from 'node:path';

export async function desktopRuntimeDependencies(core) {
  const require = createRequire(path.join(core, 'package.json'));
  const { parse } = require('@babel/parser');
  const manifest = JSON.parse(await fs.readFile(path.join(core, 'package.json'), 'utf8'));
  const builtins = new Set(builtinModules);
  const pendingFiles = [path.join(core, 'dist/huandeng/bin.js')];
  const visited = new Set();
  const required = new Set();
  while (pendingFiles.length) {
    const file = pendingFiles.pop();
    if (visited.has(file)) continue;
    visited.add(file);
    const relative = path.relative(core, file);
    if (relative.startsWith('..') || path.isAbsolute(relative))
      throw new Error(`Desktop runtime import escapes the core package: ${file}`);
    const ast = parse(await fs.readFile(file, 'utf8'), {
      sourceType: 'unambiguous',
      createImportExpressions: true,
    });
    const nodes = [ast];
    while (nodes.length) {
      const node = nodes.pop();
      if (!node || typeof node !== 'object') continue;
      let specifier;
      if (
        [
          'ImportDeclaration',
          'ExportNamedDeclaration',
          'ExportAllDeclaration',
          'ImportExpression',
        ].includes(node.type)
      )
        specifier = node.source?.value;
      if (
        node.type === 'CallExpression' &&
        (node.callee?.type === 'Import' || ['require', '__require'].includes(node.callee?.name))
      )
        specifier = node.arguments?.[0]?.value;
      if (typeof specifier === 'string') {
        if (specifier.startsWith('.')) {
          const next = path.resolve(path.dirname(file), specifier);
          if (/\.(?:c|m)?js$/.test(next)) pendingFiles.push(next);
        } else if (!specifier.startsWith('node:') && !builtins.has(specifier)) {
          const parts = specifier.split('/');
          required.add(parts[0].startsWith('@') ? parts.slice(0, 2).join('/') : parts[0]);
        }
      }
      for (const value of Object.values(node)) {
        if (Array.isArray(value)) nodes.push(...value);
        else if (value && typeof value === 'object') nodes.push(value);
      }
    }
  }
  const dependencies = {};
  for (const name of [...required].sort()) {
    if (!manifest.dependencies?.[name])
      throw new Error(`Undeclared desktop runtime dependency: ${name}`);
    dependencies[name] = manifest.dependencies[name];
  }
  return {
    dependencies,
    files: [...visited].map((name) => path.relative(core, name).replaceAll('\\', '/')),
  };
}
