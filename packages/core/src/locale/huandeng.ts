import { format } from './format';
import { arrangementChinese, arrangementEnglish } from './huandeng-arrangement-messages';
import { authoringChinese, authoringEnglish } from './huandeng-authoring-messages';
import { editorChinese, editorEnglish } from './huandeng-messages';
import { routeChinese, routeEnglish } from './huandeng-route-messages';
import { systemChinese } from './huandeng-system-messages';
import { workflowChinese, workflowEnglish } from './huandeng-workflow-messages';

export type UiLocale = 'en' | 'zh-CN';
export type UiValues = Record<string, string | number>;

const reviewChinese = {
  'Writer save failed': '写入保存失败',
  'Writer observation': '写入观察记录',
  'Slides saved: {count}': '已保存页面：{count}',
  'Slides reloaded: {count}': '已重新载入页面：{count}',
  'Main order': '主幻灯片顺序',
  'Project / Story': '项目 / 故事',
  'Save was not completed': '保存未完成',
  'Historical slide size unavailable on a preview side; current Project dimensions are used.':
    '部分预览缺少历史尺寸，已使用当前项目尺寸。',
  'No Project Story recorded.': '尚未记录项目故事。',
  'Review saved changes': '查看已保存的修改',
  'Read-only operation preview. Use Page History to restore a version.':
    '只读操作预览。恢复版本请使用页面历史。',
  'Receipt details': '回执详情',
  'Previews use current Project image bytes. Assets may have changed or be missing; original pixels are not archived here.':
    '预览使用项目当前的图片文件。素材可能已更改或缺失；此处未归档原始像素。',
  'Loading saved operation…': '正在读取已保存的操作…',
  'Affected slide': '受影响的页面',
  'Project structure / Story': '项目结构 / 故事',
  Before: '修改前',
  After: '修改后',
  Theme: '主题',
  recorded: '历史记录',
  'current-fallback': '当前主题回退',
  absent: '无页面',
  'Historical theme unavailable on a preview side; current theme fallback is shown.':
    '部分预览缺少历史主题，已回退到当前主题。',
  'Slide size changed. Each side is fitted independently.':
    '页面尺寸已更改。两侧分别缩放以适应预览。',
  'This operation changes Project structure or Story; there is no page artwork.':
    '此操作修改项目结构或故事，没有页面画面可供比较。',
  'This slide did not exist before the operation.': '此操作之前尚无该页面。',
  'This slide was removed by the operation.': '此操作已移除该页面。',
  'Selected object has no visible geometry on this side.':
    '所选对象在这一侧没有可显示的位置或尺寸。',
  'Saved changes': '已保存的修改',
  'Change list limited to 100 entries.': '修改列表最多显示 100 项。',
  'No page Story on this side.': '这一侧没有页面故事。',
  'Current usage scope': '当前使用范围',
  Available: '可用',
  Unavailable: '不可用',
  'Live references': '实时引用',
  'Pinned references': '固定版本引用',
  Pinned: '固定版本',
  'Live reference': '实时引用',
  'Preview warnings': '预览提醒',
  'This object is no longer on the current slide.': '当前页面已无此对象。',
  'This slide is not available in Main Slides.': '主幻灯片中已无此页面。',
  'Navigation opens the current Main Slide.': '跳转将打开当前主幻灯片。',
  'Open current object': '打开当前对象',
  'Open current slide': '打开当前页面',
  'Saved writer receipt': '已保存的写入回执',
  'Activity stream connected': '动态流已连接',
  'Activity stream reconnecting…': '正在重连动态流…',
  'Client reports': '客户端报告',
  'Unavailable slide': '页面不可用',
  'Review changes': '查看修改',
  'Resolve reported receipt': '核对报告回执',
  'Report details': '报告详情',
  'Receipt IDs are client claims until resolved in this Project.':
    '报告中的回执编号由客户端提供，需在此项目中核对。',
  'Edit object': '修改对象',
  'Add object': '添加对象',
  'Remove object': '移除对象',
  'Reorder objects': '调整对象顺序',
  'Edit speaker notes': '修改演讲备注',
  'Edit Story or layout metadata': '修改故事或布局元数据',
  'Apply layout': '应用布局',
  'Reset layout': '重置布局',
  'Add slide': '新增页面',
  'Duplicate slide': '复制页面',
  'Remove slide': '移除页面',
  'Reorder slides': '调整页序',
  'Restore slide': '恢复页面',
  'Restore page version': '恢复页面版本',
  'Edit Project Story or structure': '修改项目故事或结构',
  Object: '对象',
  added: '新增',
  removed: '移除',
  changed: '修改',
  Page: '页面',
  'Project Story / structure': '项目故事 / 结构',
  'Project / Main order': '项目 / 主幻灯片顺序',
  planned: '计划中',
  running: '进行中',
  waiting: '等待中',
  completed: '已报告完成',
  failed: '失败',
  cancelled: '已取消',
  page: '页面',
  notes: '演讲备注',
  size: '尺寸',
  theme: '主题',
  mainPosition: '主幻灯片位置',
  elementOrder: '对象顺序',
  'metadata.designIntent': '页面故事',
  'metadata.components': '布局关联',
  project: '项目结构 / 故事',
  bounds: '位置与尺寸',
  rotation: '旋转',
  content: '内容',
  elementType: '对象类型',
  'metadata.themeOverride': '页面主题',
  'Review response does not match this Project, operation or slide.':
    '返回的预览与当前项目、操作或页面不匹配。',
  'Current Project Story': '当前项目故事',
};

export const englishMessages = {
  ...editorEnglish,
  ...routeEnglish,
  ...arrangementEnglish,
  ...workflowEnglish,
  ...authoringEnglish,
};
export const chineseMessages = {
  ...reviewChinese,
  ...systemChinese,
  ...editorChinese,
  ...routeChinese,
  ...arrangementChinese,
  ...workflowChinese,
  ...authoringChinese,
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

function productVocabulary(template: string): string {
  const terms: Record<string, string> = {
    主幻灯片: 'Main Slides',
    主故事: 'Main Story',
    页面短码: 'Slide ID',
    短码: 'Slide ID',
    演讲备注: 'Speaker notes',
    章节: 'Section',
    演讲: 'Presentation',
    项目: 'Project',
    页面: 'Slide',
    故事: 'Story',
    素材: 'Assets',
    图层: 'Layers',
  };
  return template.replace(
    /主幻灯片|主故事|页面短码|短码|演讲备注|章节|演讲|项目|页面|故事|素材|图层/g,
    (word) => terms[word],
  );
}

const dictionaries: Record<UiLocale, Readonly<Record<string, string>>> = {
  en: { ...reverse(chineseMessages), ...englishMessages },
  'zh-CN': Object.fromEntries(
    Object.entries({
      ...Object.fromEntries(Object.keys(englishMessages).map((source) => [source, source])),
      ...reverse(englishMessages),
      ...Object.fromEntries(
        Object.entries(singularEnglish).map(([source, form]) => [form.one, source]),
      ),
      ...chineseMessages,
    }).map(([source, translation]) => [source, productVocabulary(translation)]),
  ),
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
