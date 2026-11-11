import { createRequire } from 'node:module';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const {
  isPptdPath,
  parseLaunchRequest,
  createLaunchData,
  readLaunchData,
  secondInstanceRequest,
} = require('./launch-request.cjs');
const cwd = 'C:\\authoring workspace';
const entry = 'C:\\Projects\\第二份 Project\\deck.pptd';
const options = { packaged: true, cwd, pathApi: path.win32 };
const plain = { entry, readOnly: false, welcome: false };

describe('native desktop launch requests', () => {
  it('accepts a folder through explicit, positional and structured launch paths', () => {
    const folder = 'C:\\Projects\\研究 Talk.huandeng';
    const directoryOptions = { ...options, isDirectory: (value: string) => value === folder };
    const request = { ...plain, entry: folder };
    for (const args of [['--entry', folder], [`--entry=${folder}`], [folder]])
      expect(parseLaunchRequest(['editor.exe', ...args], directoryOptions)).toEqual(request);
    expect(readLaunchData(createLaunchData(request), options)).toEqual(request);
    expect(
      secondInstanceRequest(
        ['editor.exe', '--entry', '--allow-file-access-from-files', folder],
        cwd,
        null,
        directoryOptions,
      ),
    ).toEqual(request);
  });

  it('preserves an explicit invalid path for a real resolver error instead of opening another project', () => {
    expect(
      parseLaunchRequest(['editor.exe', '--entry', 'missing-folder', entry], options).entry,
    ).toBe(path.win32.resolve(cwd, 'missing-folder'));
  });

  it.each([
    ['--entry=', entry],
    ['--entry=--unsafe.pptd', entry],
    ['--entry', '--welcome', entry],
    ['--entry', '--unknown-chromium-flag', entry],
    ['--entry', '', entry],
    ['--entry', '\0', entry],
    ['--entry', '--unsafe.pptd', entry],
  ])(
    'rejects the invalid explicit entry instead of choosing another candidate: %j',
    (...args: string[]) => {
      const result = parseLaunchRequest(['editor.exe', ...args], options);
      expect(result.error).toBe('invalid-entry');
      expect(result.entry).toBeUndefined();
      expect(secondInstanceRequest(['editor.exe', ...args], cwd, undefined, options)).toEqual(
        result,
      );
    },
  );

  it.each([['--entry', entry], [`--entry=${entry}`], [entry]])(
    'accepts the original CLI form %j with Unicode and spaces',
    (...args: string[]) => {
      expect(parseLaunchRequest(['editor.exe', ...args], options)).toEqual(plain);
    },
  );

  it('does not mistake inserted Chromium switches for the entry', () => {
    const argv = [
      'editor.exe',
      '--entry',
      '--allow-file-access-from-files',
      '--original-process-start-time=123',
      entry,
    ];
    expect(parseLaunchRequest(argv, options)).toEqual(plain);
    expect(secondInstanceRequest(argv, cwd, undefined, options)).toEqual(plain);
  });

  it('never accepts a switch-shaped value, including one ending in .pptd', () => {
    expect(isPptdPath('--unsafe.pptd')).toBe(false);
    expect(isPptdPath('  --unsafe.pptd')).toBe(false);
    expect(parseLaunchRequest(['editor.exe', '--entry', '--unsafe.pptd'], options)).toEqual({
      readOnly: false,
      welcome: false,
      error: 'invalid-entry',
    });
    expect(
      parseLaunchRequest(['editor.exe', '--entry=--unsafe.pptd'], options).entry,
    ).toBeUndefined();
    expect(parseLaunchRequest(['editor.exe', '--entry'], options).error).toBe('invalid-entry');
  });

  it('resolves relative entries against the requesting process cwd', () => {
    expect(
      parseLaunchRequest(['editor.exe', '--entry=项目\\deck.PPTD', '--read-only'], options),
    ).toEqual({
      entry: path.win32.join(cwd, '项目', 'deck.PPTD'),
      readOnly: true,
      welcome: false,
    });
    expect(
      secondInstanceRequest(['editor.exe', 'deck.pptd'], 'D:\\sender', null, options).entry,
    ).toBe('D:\\sender\\deck.pptd');
    expect(
      parseLaunchRequest(['electron.exe', 'app', 'deck.pptd'], { ...options, packaged: false })
        .entry,
    ).toBe(path.win32.join(cwd, 'deck.pptd'));
  });

  it('prefers the bounded structured request over mutated argv', () => {
    const data = createLaunchData({ ...plain, readOnly: true });
    expect(JSON.stringify(data)).not.toContain('argv');
    expect(Object.keys(data.huandengLaunch.request).sort()).toEqual([
      'entry',
      'readOnly',
      'welcome',
    ]);
    expect(
      secondInstanceRequest(
        ['editor.exe', '--entry', '--allow-file-access-from-files', 'C:\\other.pptd'],
        cwd,
        data,
        options,
      ),
    ).toEqual({ ...plain, readOnly: true });
  });

  it.each([
    undefined,
    null,
    {},
    { huandengLaunch: { schemaVersion: 99, request: plain } },
    { huandengLaunch: { schemaVersion: 1, request: { ...plain, entry: '--unsafe.pptd' } } },
    { huandengLaunch: { schemaVersion: 1, request: { ...plain, entry: 'relative.pptd' } } },
    { huandengLaunch: { schemaVersion: 1, request: { ...plain, readOnly: 'false' } } },
    { huandengLaunch: { schemaVersion: 1, request: { ...plain, argv: ['extra'] } } },
  ])('falls back safely when additionalData is invalid: %j', (data) => {
    expect(readLaunchData(data, options)).toBe(null);
    expect(
      secondInstanceRequest(
        ['editor.exe', '--entry', '--allow-file-access-from-files', entry],
        cwd,
        data,
        options,
      ),
    ).toEqual(plain);
  });

  it('preserves explicit Home and invalid-entry intent without inventing a path', () => {
    const home = { readOnly: false, welcome: true };
    expect(
      secondInstanceRequest(['editor.exe', entry], cwd, createLaunchData(home), options),
    ).toEqual(home);
    const invalid = { readOnly: false, welcome: false, error: 'invalid-entry' };
    expect(readLaunchData(createLaunchData(invalid), options)).toEqual(invalid);
  });
});
