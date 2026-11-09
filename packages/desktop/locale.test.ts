import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const locale = require('./locale.cjs');
const { readPreferences, writePreferences } = require('./project.cjs');

afterEach(() => locale.setCurrentLocale('zh-CN'));

describe('desktop language and preference persistence', () => {
  it('localizes native navigation and preserves authored path values', () => {
    locale.setCurrentLocale('zh-CN');
    expect(locale.text('关闭文件预览')).toBe('关闭文件预览');
    expect(locale.text('下一个项目')).toBe('下一个项目');
    expect(locale.text('助手连接…')).toBe('助手连接…');
    expect(
      locale.text('项目文件夹已经存在，请换一个名称：\n{path}', { path: 'Project/主幻灯片.pptd' }),
    ).toBe('项目文件夹已经存在，请换一个名称：\nProject/主幻灯片.pptd');
    locale.setCurrentLocale('en');
    expect(locale.text('关闭文件预览')).toBe('Close file preview');
    expect(locale.text('关闭项目')).toBe('Close project');
    expect(locale.text('下一个项目')).toBe('Next project');
    expect(locale.text('上一个项目')).toBe('Previous project');
  });
  it('honors explicit choices over OS language and rejects unsupported values', () => {
    expect(locale.resolveLocale('en', 'zh-CN')).toBe('en');
    expect(locale.resolveLocale('zh-CN', 'en-US')).toBe('zh-CN');
    expect(locale.resolveLocale(undefined, 'zh-TW')).toBe('en');
    expect(locale.resolveLocale(undefined, 'fr-FR')).toBe('en');
    expect(() => locale.setCurrentLocale('fr')).toThrow('Unsupported');
    locale.setCurrentLocale('en');
    expect(locale.text('助手连接…')).toBe('Agent setup…');
    const file = '/projects/主幻灯片/{path}/deck.pptd';
    expect(locale.text('项目文件夹已经存在，请换一个名称：\n{path}', { path: file })).toContain(
      file,
    );
  });

  it('round-trips language and snapping with unrelated window/recent settings intact', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'huandeng-locale-'));
    try {
      const file = path.join(directory, 'profile', 'preferences.json');
      expect(await readPreferences(file)).toEqual({ recentProjects: [] });
      const value = {
        uiLocale: 'en',
        snapping: false,
        recentProjects: [{ entryPath: '/projects/中文/deck.pptd' }],
        windowBounds: { x: 20, width: 1280 },
        lastProject: '/projects/中文/deck.pptd',
      };
      await writePreferences(file, value);
      expect(await readPreferences(file)).toEqual(value);
      await writePreferences(file, { ...value, uiLocale: 'zh-CN', snapping: true });
      expect(JSON.parse(await readFile(file, 'utf8'))).toEqual({
        ...value,
        uiLocale: 'zh-CN',
        snapping: true,
      });
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
