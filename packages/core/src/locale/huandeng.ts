import { format } from './format';
import { arrangementChinese, arrangementEnglish } from './huandeng-arrangement-messages';
import { editorChinese, editorEnglish } from './huandeng-messages';
import { routeChinese, routeEnglish } from './huandeng-route-messages';
import { systemChinese } from './huandeng-system-messages';

export type UiLocale = 'en' | 'zh-CN';
export type UiValues = Record<string, string | number>;

export const englishMessages = { ...editorEnglish, ...routeEnglish, ...arrangementEnglish };
export const chineseMessages = {
  ...systemChinese,
  ...editorChinese,
  ...routeChinese,
  ...arrangementChinese,
};
export type UiMessage = keyof typeof englishMessages | keyof typeof chineseMessages;
export type UiTranslator = (message: string, values?: UiValues) => string;

// Count labels mostly use “Slides: 2”, avoiding inflected nouns. The few full
// sentences use explicit singular forms; document values never become messages.
const singularEnglish: Record<string, { count: string; one: string }> = {
  '{value0} 页使用': { count: 'value0', one: 'Used on {value0} slide' },
  '{value0}{value1} 处匹配；定位不会改变编排顺序。': {
    count: 'value1',
    one: '{value0}{value1} match; locating an item keeps the presentation order.',
  },
  '已选 {count} 个对象': { count: 'count', one: '{count} object selected' },
};

function reverse(messages: Readonly<Record<string, string>>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(messages).map(([source, translation]) => [translation, source]),
  );
}

const dictionaries: Record<UiLocale, Readonly<Record<string, string>>> = {
  en: { ...reverse(chineseMessages), ...englishMessages },
  'zh-CN': {
    ...reverse(englishMessages),
    ...Object.fromEntries(
      Object.entries(singularEnglish).map(([source, form]) => [form.one, source]),
    ),
    ...chineseMessages,
  },
};

// These parameters are generated control labels or nested system diagnostics.
// All other parameters, including names, file paths and authored text, stay verbatim.
const systemParameters: Record<string, string[]> = {
  '动画时间线：{value0}': ['value0'],
  '演讲步骤：{value0}': ['value0'],
  '{value0}不能超过 {value1} 秒。': ['value0'],
  '{value0}需要填写不小于 {value1} 的数值。': ['value0'],
  '请检查「{value0}」的数值{value1}；按 Esc 可还原输入。': ['value0', 'value1'],
  '已加入{value0}，可在画布直接调整。': ['value0'],
  'The last {value0} cannot be removed.': ['value0'],
  '{value0} must be {value1} string of at most {value2} characters.': ['value1'],
};

type TemplateRule = { source: string; parts: string[]; names: string[] };
function templateRule(template: string, source: string): TemplateRule | null {
  const tokens = [...template.matchAll(/\{(\w+)\}/g)];
  if (!tokens.length) return null;
  const parts: string[] = [];
  let at = 0;
  for (const token of tokens) {
    parts.push(template.slice(at, token.index));
    at = token.index + token[0].length;
  }
  parts.push(template.slice(at));
  return { source, parts, names: tokens.map((token) => token[1]) };
}

// Consume the fixed text left to right. No wildcard regular expressions or
// backtracking are run against errors originating in files or external tools.
function matchTemplate(rule: TemplateRule, message: string): UiValues | null {
  if (!message.startsWith(rule.parts[0]) || !message.endsWith(rule.parts[rule.names.length]))
    return null;
  let at = rule.parts[0].length;
  const values: UiValues = {};
  for (const [index, name] of rule.names.entries()) {
    const separator = rule.parts[index + 1];
    const end =
      index === rule.names.length - 1
        ? message.length - separator.length
        : separator
          ? message.indexOf(separator, at)
          : at;
    if (end < at) return null;
    const value = message.slice(at, end);
    if (values[name] !== undefined && values[name] !== value) return null;
    values[name] = value;
    at = end + separator.length;
  }
  return at === message.length ? values : null;
}
const templates: TemplateRule[] = [
  ...Object.entries(englishMessages).flatMap(([source, translated]) => [
    templateRule(source, source),
    templateRule(translated, source),
  ]),
  ...Object.entries(chineseMessages).flatMap(([source, translated]) => [
    templateRule(source, source),
    templateRule(translated, source),
  ]),
  ...Object.entries(singularEnglish).map(([source, form]) => templateRule(form.one, source)),
].filter((value): value is TemplateRule => value !== null);

export function normalizeUiLocale(value: unknown): UiLocale | null {
  if (typeof value !== 'string') return null;
  if (/^zh(?:[-_]|$)/i.test(value)) return 'zh-CN';
  if (/^en(?:[-_]|$)/i.test(value)) return 'en';
  return null;
}

function renderMessage(locale: UiLocale, message: string, values?: UiValues, depth = 0): string {
  const dictionary = dictionaries[locale];
  const translated = Object.hasOwn(dictionary, message) ? dictionary[message] : message;
  if (values) {
    const names = systemParameters[message];
    const localized = names ? { ...values } : values;
    if (names && depth < 3) {
      for (const name of names)
        if (typeof localized[name] === 'string')
          localized[name] = renderMessage(locale, String(localized[name]), undefined, depth + 1);
    }
    const singular = locale === 'en' ? singularEnglish[message] : undefined;
    return format(
      singular && Number(values[singular.count]) === 1 ? singular.one : translated,
      localized,
    );
  }
  if (translated !== message || Object.hasOwn(dictionary, message)) return translated;
  // Older services return interpolated diagnostics rather than structured UI
  // messages. Match only an entire known template, never arbitrary substrings.
  if (message.length <= 16_384 && depth < 3) {
    for (const rule of templates) {
      const captured = matchTemplate(rule, message);
      if (!captured) continue;
      return renderMessage(locale, rule.source, captured, depth + 1);
    }
  }
  if (depth < 3 && message.length <= 16_384 && message.includes('\n'))
    return message
      .split('\n')
      .map((line) => renderMessage(locale, line, undefined, depth + 1))
      .join('\n');
  return message;
}

/** UI-owned labels and diagnostics only. Never pass document content here. */
export function translateUi(locale: UiLocale, message: string, values?: UiValues): string {
  return renderMessage(locale, message, values);
}

export function formatUiDate(locale: UiLocale, value: string | number | Date): string {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
    : '';
}

export function formatUiNumber(locale: UiLocale, value: number): string {
  return new Intl.NumberFormat(locale).format(value);
}
