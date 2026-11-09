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
  'Source image verification is incomplete. Refresh Project images and retry.':
    '原图核验尚未完成。请刷新项目图片后重试。',
  'Observed in this Project': '此项目中的实际报告',
  'Setup instructions prepared': '连接配置已生成',
  'This is the latest explicit client report, not a live connection or execution check.':
    '这里显示客户端最近一次主动报告，不代表当前连接或执行状态。',
  'Live edits update Main and live references. Pinned versions keep their recorded artwork.':
    '编辑实时页面会更新主幻灯片及其实时引用；固定版本保留已记录的画面。',
  'View edit scope': '查看修改范围',
  'Recent reports could not be read.': '无法读取最近的报告。',
  'Reading recent client reports…': '正在读取最近的客户端报告…',
  'No client report recorded yet. Setup may still be ready.':
    '尚未记录客户端报告；连接配置可能已经就绪。',
  'Pinned version · read-only': '固定版本 · 只读',
  'Activity Project identity mismatch.': '报告返回的项目身份与当前项目不一致。',

  Layout: '布局',
  Previous: '上一批',
  Next: '下一批',
  'Figure layouts': '图像布局',
  'Client report': '客户端报告',
  Activity: '动态',
  'Project Activity': '项目动态',
  'Activity filter': '动态筛选',
  'Close Activity': '关闭动态',
  'Previous session': '上一次会话',
  Refresh: '刷新',
  'No activity for this Project yet. Connected clients can report task stages; saved changes appear automatically.':
    '此项目暂无动态。已连接的客户端可报告任务阶段；已保存的修改会自动显示。',
  'A source image changed or is unavailable. Choose the source again before adding.':
    '原图已改变或不可用。请重新选择原图后再添加。',
  'Choose a Project image': '选择项目图片',
  'Original figures stay intact. Search or browse 12 images at a time.':
    '保留原图。可搜索或每次浏览 12 张图片。',
  'Search Project images': '搜索项目图片',
  'Loading images…': '正在读取图片…',
  'Image unavailable': '图片不可用',
  'Missing image': '图片缺失',
  'No matching Project images.': '没有匹配的项目图片。',
  'Asset scan is limited. Narrow the search or enter a Project path.':
    '素材扫描范围有限。请缩小搜索范围或输入项目路径。',
  'Images {start}–{end} of {total}': '图片 {start}–{end}，共 {total} 张',
  'Advanced: Project image path': '高级：项目图片路径',
  'Project image path': '项目图片路径',
  'Find image': '查找图片',
  'Choose an image from this Project media/ or assets/ folder.':
    '请选择此项目 media/ 或 assets/ 文件夹中的图片。',
  'Choose an editable live slide.': '请选择可编辑的实时页面。',
  'Choose available source images for every slot.': '请为每个位置选择可用的原图。',
  'The marked title leaves too little room for this layout. Adjust the title or use another slide.':
    '标记的标题为此布局留下的空间不足。请调整标题或使用其他页面。',
  'Choose a layout and original figures, inspect the complete slide, then add it.':
    '选择布局和原图，检查完整页面后再添加。',
  'Image unavailable. Choose another image or retry.': '图片不可用。请选择其他图片或重试。',
  'Project image library unavailable.': '项目图片库不可用。',
  'The slide or Project changed. Refresh the preview before adding.':
    '页面或项目已改变。请刷新预览后再添加。',
  'Refresh layout preview': '刷新布局预览',
  'Refresh the layout preview before retrying.': '请刷新布局预览后再重试。',
  'Preview full slide': '预览完整页面',
  'Preview is local. Existing objects stay in place; inspect overlaps before adding.':
    '预览在本地生成。现有对象保持原位；添加前请检查重叠。',
  'Layout added. Open its saved receipt in Activity to review changes.':
    '布局已添加。可在动态中打开保存回执查看修改。',
  'Full slide layout preview': '完整页面布局预览',
  'Existing objects and proposed additions, in their final order. Add saves this prepared layout.':
    '按最终顺序显示现有对象和拟添加的对象。添加将保存此预览中的布局。',

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

const dictionaries: Record<UiLocale, Readonly<Record<string, string>>> = {
  en: { ...reverse(chineseMessages), ...englishMessages },
  'zh-CN': {
    ...Object.fromEntries(Object.keys(englishMessages).map((source) => [source, source])),
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
