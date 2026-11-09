import fs from 'node:fs';
import path from 'node:path';
import { parse } from '@babel/parser';
import { describe, expect, it } from 'vitest';
import {
  chineseMessages,
  englishMessages,
  formatUiDate,
  formatUiNumber,
  normalizeUiLocale,
  translateUi,
} from './huandeng';

const variables = (value: string) =>
  [...value.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();

describe('HUANDENG interface messages', () => {
  it('keeps interpolation fields intact across every translation', () => {
    for (const [source, translation] of Object.entries({ ...englishMessages, ...chineseMessages }))
      expect(variables(translation), source).toEqual(variables(source));
  });

  it('covers literal UI message calls without translating authored document values', () => {
    const root = path.resolve(import.meta.dirname, '../app');
    const missing = new Set<string>();
    const englishUiMessages = new Set<string>(Object.values(englishMessages));
    function walk(value: unknown) {
      if (!value || typeof value !== 'object') return;
      const node = value as Record<string, unknown>;
      const callee = node.callee as { type?: string; name?: string } | undefined;
      if (
        node.type === 'CallExpression' &&
        callee?.type === 'Identifier' &&
        ['t', 'uiText'].includes(callee.name ?? '')
      ) {
        const first = (node.arguments as { type: string; value?: string }[])[0];
        if (
          first?.type === 'StringLiteral' &&
          first.value &&
          ((/[\u4e00-\u9fff]/.test(first.value) && !Object.hasOwn(englishMessages, first.value)) ||
            (!/[\u4e00-\u9fff]/.test(first.value) &&
              /[A-Za-z]/.test(first.value) &&
              !Object.hasOwn(chineseMessages, first.value) &&
              !englishUiMessages.has(first.value)))
        )
          missing.add(first.value);
      }
      for (const [key, child] of Object.entries(node)) {
        if (['loc', 'extra', 'comments'].includes(key)) continue;
        if (Array.isArray(child)) child.forEach(walk);
        else if (child && typeof child === 'object') walk(child);
      }
    }
    for (const folder of ['components/pptd', 'lib', 'routes'])
      for (const file of fs.readdirSync(path.join(root, folder))) {
        if (!/\.(tsx|ts)$/.test(file) || file.includes('.test.')) continue;
        walk(
          parse(fs.readFileSync(path.join(root, folder, file), 'utf8'), {
            sourceType: 'module',
            plugins: ['typescript', 'jsx'],
          }),
        );
      }
    expect([...missing]).toEqual([]);
    expect(translateUi('en', '对象 ID：{value0}', { value0: '主幻灯片 {value1}' })).toBe(
      'Object ID: 主幻灯片 {value1}',
    );
    expect(translateUi('en', '我们的主幻灯片，包含出现和淡入。')).toBe(
      '我们的主幻灯片，包含出现和淡入。',
    );
    expect(translateUi('zh-CN', 'Unknown error from an external library.')).toBe(
      'Unknown error from an external library.',
    );
  });

  it('localizes legacy interpolated errors and nested diagnostics at the display boundary', () => {
    expect(translateUi('en', '演讲步骤：效果时长须为 1–60000 毫秒的整数。')).toBe(
      'Build steps: Effect duration must be an integer from 1 to 60000 milliseconds.',
    );
    expect(translateUi('en', '请检查「位置」的数值，需要整数；按 Esc 可还原输入。')).not.toMatch(
      /[\u4e00-\u9fff]/,
    );
    expect(translateUi('zh-CN', 'Chart row 3 must contain 2 cells.')).toBe(
      '图表第 3 行必须包含 2 个单元格。',
    );
    expect(translateUi('zh-CN', 'The last column cannot be removed.')).toBe('不能移除最后一列。');
    expect(translateUi('en', '无法读取素材 主幻灯片：permission denied')).toBe(
      'Cannot read asset 主幻灯片: permission denied',
    );
    expect(translateUi('zh-CN', 'The project is closing.')).toBe('项目正在关闭。');
    expect(translateUi('zh-CN', 'Slide ID copied: 主幻灯片')).toBe('已复制页面短码 主幻灯片');
    expect(translateUi('en', '图表列名不能为空或重复，最多支持 100 列。')).toBe(
      'Chart columns must be unique non-empty names (at most 100 columns).',
    );
  });

  it('localizes editor navigation in both directions while retaining authored values', () => {
    for (const [english, chinese] of [
      ['Properties', '属性'],
      ['Layout', '布局'],
      ['Layers', '图层'],
      ['Story', '故事'],
      ['Checks', '检查'],
      ['Notes', '备注'],
      ['Project', '项目'],
      ['Section', '章节'],
      ['From beginning', '从头放映'],
      ['From current slide', '从当前页放映'],
    ]) {
      expect(translateUi('zh-CN', english)).toBe(chinese);
      expect(translateUi('en', chinese)).toBe(english);
      expect(translateUi('en', english)).toBe(english);
    }
    expect(translateUi('zh-CN', 'Slides')).toBe('幻灯片');
    expect(translateUi('en', 'Slides')).toBe('Slides');
    expect(translateUi('zh-CN', 'Slide ID copied: {value0}', { value0: '我的主幻灯片' })).toContain(
      '我的主幻灯片',
    );
    expect(translateUi('zh-CN', '未知项目中的原始用户文字')).toBe('未知项目中的原始用户文字');
    expect(translateUi('zh-CN', 'Close {name}', { name: 'Project Story Notes.md' })).toBe(
      '关闭 Project Story Notes.md',
    );
    expect(translateUi('zh-CN', 'Unknown Project Story Notes prose')).toBe(
      'Unknown Project Story Notes prose',
    );
  });

  it('handles singular count messages and local date/number formats', () => {
    expect(translateUi('en', '{value0} 页使用', { value0: 1 })).toBe('Used on 1 slide');
    expect(translateUi('en', '{value0} 页使用', { value0: 2 })).toBe('Used on 2 slides');
    expect(translateUi('en', '已选 {count} 个对象', { count: 1 })).toBe('1 object selected');
    expect(translateUi('zh-CN', '1 object selected')).toBe('已选 1 个对象');
    expect(normalizeUiLocale('zh-TW')).toBe('zh-CN');
    expect(normalizeUiLocale('en-GB')).toBe('en');
    expect(normalizeUiLocale('fr')).toBeNull();
    expect(formatUiDate('en', '2026-11-08T12:30:00Z')).not.toBe(
      formatUiDate('zh-CN', '2026-11-08T12:30:00Z'),
    );
    expect(formatUiDate('en', 'not a date')).toBe('');
    expect(formatUiNumber('en', 12345)).toBe('12,345');
  });
});
