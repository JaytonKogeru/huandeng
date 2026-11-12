import { execFile } from 'node:child_process';
import { constants } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);
let supported: Promise<string> | undefined;

export class GitSafetyError extends Error {}

export function supportsSafeGit(version: string): boolean {
  const match = /^git version (\d+)\.(\d+)\.(\d+)/.exec(version.trim());
  if (!match) return false;
  const [, major, minor, patch] = match.map(Number);
  return major > 2 || (major === 2 && (minor > 35 || (minor === 35 && patch >= 2)));
}

export function gitEnvironment(source: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  const environment = { ...source };
  for (const key of Object.keys(environment)) {
    if (
      /^GIT_CONFIG(?:_|$)/i.test(key) ||
      /^GIT_(?:DIR|WORK_TREE|COMMON_DIR|INDEX_FILE|OBJECT_DIRECTORY|ALTERNATE_OBJECT_DIRECTORIES|EXTERNAL_DIFF|EXEC_PATH)$/i.test(
        key,
      )
    )
      delete environment[key];
  }
  environment.GIT_OPTIONAL_LOCKS = '0';
  environment.GIT_TERMINAL_PROMPT = '0';
  return environment;
}

export async function resolveGitExecutable(
  environment: NodeJS.ProcessEnv = process.env,
): Promise<string> {
  const search =
    Object.entries(environment).find(([name]) => name.toUpperCase() === 'PATH')?.[1] ?? '';
  for (const item of search.split(path.delimiter)) {
    const directory = item.replace(/^"(.*)"$/, '$1');
    if (!path.isAbsolute(directory)) continue;
    const executable = path.join(directory, process.platform === 'win32' ? 'git.exe' : 'git');
    try {
      if (!(await fs.stat(executable)).isFile()) continue;
      await fs.access(executable, constants.X_OK);
      return executable;
    } catch {}
  }
  throw new GitSafetyError(
    'Git was not found on an absolute system PATH. Document saves remain available.',
  );
}

async function ensureSupported(): Promise<string> {
  supported ??= (async () => {
    const executable = await resolveGitExecutable();
    const result = await run(executable, ['--version'], {
      env: gitEnvironment(),
      windowsHide: true,
    });
    if (!supportsSafeGit(result.stdout))
      throw new GitSafetyError(
        'Git checkpoints require Git 2.35.2 or newer. Document saves remain available.',
      );
    return executable;
  })().catch((error: unknown) => {
    supported = undefined;
    throw error;
  });
  return supported;
}

export async function safeGit(root: string, args: string[], input?: Uint8Array): Promise<string> {
  const executable = await ensureSupported();
  const environment = gitEnvironment();
  const prefix = ['--no-pager', '-c', 'core.fsmonitor=false', '-C', root];
  if (['status', 'add', 'hash-object'].includes(args[0])) {
    let keys: string[] = [];
    try {
      const callbacks = await run(
        executable,
        [
          ...prefix,
          'config',
          '--name-only',
          '--get-regexp',
          '^filter\\..*\\.(clean|smudge|process)$',
        ],
        { env: environment, windowsHide: true },
      );
      keys = callbacks.stdout.trim().split(/\r?\n/).filter(Boolean);
    } catch (error) {
      if ((error as { code?: unknown }).code !== 1) throw error;
    }
    if (keys.length && args[0] !== 'status') {
      const files =
        args[0] === 'hash-object'
          ? args.filter((arg) => arg.startsWith('--path=')).map((arg) => arg.slice(7))
          : args.slice(args.indexOf('--') + 1);
      const attributes = await run(
        executable,
        [...prefix, 'check-attr', '-z', 'filter', '--', ...files],
        {
          env: environment,
          windowsHide: true,
        },
      );
      const fields = attributes.stdout.split('\0');
      if (
        fields.some((value, index) => index % 3 === 2 && !['unspecified', 'unset'].includes(value))
      )
        throw new GitSafetyError(
          'Saved files use Git filters. Use the normal Git workflow; Huandeng did not execute them.',
        );
    }
    for (const key of keys) {
      prefix.push('-c', `${key}=`);
      prefix.push('-c', `${key.replace(/\.(?:clean|smudge|process)$/, '.required')}=false`);
    }
  }
  const literal = args[0] === 'check-ignore' ? [] : ['--literal-pathspecs'];
  const diff = ['diff', 'diff-tree'].includes(args[0]) ? ['--no-ext-diff', '--no-textconv'] : [];
  const pending = run(executable, [...literal, ...prefix, args[0], ...diff, ...args.slice(1)], {
    env: environment,
    windowsHide: true,
    maxBuffer: 8 * 1024 * 1024,
  });
  if (input) pending.child.stdin?.end(input);
  return (await pending).stdout;
}
