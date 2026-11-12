import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';
import { gitEnvironment, resolveGitExecutable, supportsSafeGit } from './git-safety';

describe('Git process boundary', () => {
  it.each(['git version 2.35.2', 'git version 2.52.0.windows.1', 'git version 3.0.0'])(
    'allows supported Git %s',
    (version) => expect(supportsSafeGit(version)).toBe(true),
  );

  it.each(['git version 2.35.1', 'git version 1.9.5', 'unexpected'])(
    'rejects versions without safe fsmonitor=false semantics: %s',
    (version) => expect(supportsSafeGit(version)).toBe(false),
  );

  it('does not select a Git command through relative PATH entries', async () => {
    await expect(
      resolveGitExecutable({ PATH: ['.', 'tools', ''].join(path.delimiter) }),
    ).rejects.toThrow('absolute system PATH');
    expect(path.isAbsolute(await resolveGitExecutable())).toBe(true);
  });

  it.skipIf(process.platform !== 'win32')(
    'uses the trusted executable when the Project contains a competing git.exe',
    async () => {
      const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'huandeng-git-command-'));
      const run = promisify(execFile);
      try {
        await fs.copyFile(
          path.join(process.env.SystemRoot ?? 'C:/Windows', 'System32/whoami.exe'),
          path.join(directory, 'git.exe'),
        );
        await expect(
          run('git', ['--version'], { cwd: directory, windowsHide: true }),
        ).rejects.toThrow();
        const result = await run(await resolveGitExecutable(), ['--version'], {
          cwd: directory,
          windowsHide: true,
        });
        expect(supportsSafeGit(result.stdout)).toBe(true);
      } finally {
        await fs.rm(directory, { recursive: true, force: true });
      }
    },
  );

  it('removes repository and executable configuration overrides without changing the caller', () => {
    const original = {
      PATH: 'system-path',
      GIT_DIR: 'foreign',
      GIT_WORK_TREE: 'foreign',
      GIT_INDEX_FILE: 'foreign',
      GIT_CONFIG_COUNT: '1',
      GIT_CONFIG_KEY_0: 'core.fsmonitor',
      GIT_CONFIG_VALUE_0: 'helper',
      GIT_EXTERNAL_DIFF: 'helper',
      GIT_EXEC_PATH: 'foreign-commands',
      GIT_AUTHOR_NAME: 'Configured Author',
    };
    const actual = gitEnvironment(original);
    expect(actual.GIT_DIR).toBeUndefined();
    expect(actual.GIT_CONFIG_KEY_0).toBeUndefined();
    expect(actual.GIT_EXTERNAL_DIFF).toBeUndefined();
    expect(actual.GIT_EXEC_PATH).toBeUndefined();
    expect(actual.PATH).toBe('system-path');
    expect(actual.GIT_AUTHOR_NAME).toBe('Configured Author');
    expect(original.GIT_DIR).toBe('foreign');
  });
});
